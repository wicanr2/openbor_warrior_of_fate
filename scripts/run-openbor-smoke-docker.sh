#!/usr/bin/env bash

set -euo pipefail

binary=
stage=
image=openbor-linux-build:local
seconds=15

usage() {
  cat <<'EOF'
Usage:
  scripts/run-openbor-smoke-docker.sh --binary PATH --stage PATH [options]

Options:
  --image NAME      Runtime image (default: openbor-linux-build:local)
  --seconds NUMBER  Maximum headless runtime (default: 15)
  --help            Show this help

The stage is mounted read-write for Logs/Saves; the engine binary is mounted
read-only. SDL uses dummy video/audio drivers, so this verifies module/model
loading but does not replace visual inspection on a desktop target.
EOF
}

while (($#)); do
  case "$1" in
    --binary) binary=${2:-}; shift 2 ;;
    --stage) stage=${2:-}; shift 2 ;;
    --image) image=${2:-}; shift 2 ;;
    --seconds) seconds=${2:-}; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[[ -n "$binary" && -n "$stage" ]] || { usage >&2; exit 2; }
binary=$(readlink -f "$binary")
stage=$(readlink -f "$stage")
[[ -f "$binary" && -x "$binary" ]] || { echo "OpenBOR binary is not executable: $binary" >&2; exit 1; }
[[ -d "$stage/data" ]] || { echo "Smoke stage has no data directory: $stage" >&2; exit 1; }
[[ -f "$stage/robot-wof.dev.pak" ]] || { echo "Missing staging sentinel: $stage/robot-wof.dev.pak" >&2; exit 1; }
[[ "$seconds" =~ ^[1-9][0-9]*$ ]] || { echo '--seconds must be a positive integer' >&2; exit 2; }

set +e
docker run --rm \
  --platform linux/amd64 \
  --user "$(id -u):$(id -g)" \
  --env HOME=/tmp \
  --env SDL_VIDEODRIVER=dummy \
  --env SDL_AUDIODRIVER=dummy \
  --env SMOKE_SECONDS="$seconds" \
  --volume "$binary:/openbor:ro" \
  --volume "$stage:/stage" \
  "$image" \
  bash -lc 'cd /stage; timeout --signal=TERM "${SMOKE_SECONDS}s" /openbor ./robot-wof.dev.pak'
docker_status=$?
set -e

log="$stage/Logs/OpenBorLog.txt"
[[ -f "$log" ]] || { echo "OpenBOR did not create its log (Docker exit $docker_status)" >&2; exit 1; }

if grep -Eq 'An Error Occurred|Error loading (background|model|file)|Error loading model list' "$log"; then
  echo "Fatal OpenBOR load error; inspect $log" >&2
  exit 1
fi

if ! grep -Eq 'Loading models.*Done!' "$log"; then
  echo "OpenBOR did not reach model-load completion; inspect $log" >&2
  exit 1
fi

echo "PASS: OpenBOR reached model-load completion in Docker"
echo "Docker exit: $docker_status (124 is the expected bounded timeout)"
echo "Log: $log"
