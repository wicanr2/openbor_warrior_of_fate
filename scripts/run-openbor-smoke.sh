#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/run-openbor-smoke.sh \
    --binary /path/to/OpenBOR --stage /tmp/robot-wof-openbor-smoke-XXXXXX [options]

Options:
  --binary PATH   Existing Linux OpenBOR executable
  --stage PATH    Tree made by prepare-openbor-smoke.mjs
  --seconds N     Maximum launch time (default: 12)
  --launch        Actually open OpenBOR; without this flag the script only
                  performs read-only preflight checks
  --help          Show this help

The process runs with --stage as its working directory, so Logs, Saves,
ScreenShots, and any configuration stay inside the disposable tree.
EOF
}

binary=
stage=
seconds=12
launch=0

while (($#)); do
  case "$1" in
    --binary)
      [[ $# -ge 2 ]] || { echo '--binary requires a path' >&2; exit 2; }
      binary=$2
      shift 2
      ;;
    --stage)
      [[ $# -ge 2 ]] || { echo '--stage requires a path' >&2; exit 2; }
      stage=$2
      shift 2
      ;;
    --seconds)
      [[ $# -ge 2 ]] || { echo '--seconds requires a positive integer' >&2; exit 2; }
      seconds=$2
      shift 2
      ;;
    --launch)
      launch=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

[[ -n "$binary" ]] || { echo '--binary is required' >&2; exit 2; }
[[ -n "$stage" ]] || { echo '--stage is required' >&2; exit 2; }
[[ "$seconds" =~ ^[1-9][0-9]*$ ]] || { echo '--seconds must be a positive integer' >&2; exit 2; }

binary=$(readlink -f "$binary")
stage=$(readlink -f "$stage")

[[ -x "$binary" ]] || { echo "OpenBOR binary is not executable: $binary" >&2; exit 1; }
[[ -d "$stage/data" ]] || { echo "Staging data/ is missing: $stage/data" >&2; exit 1; }
[[ -f "$stage/data/models.txt" ]] || { echo "Staging models.txt is missing: $stage/data/models.txt" >&2; exit 1; }
[[ -f "$stage/robot-wof.dev.pak" ]] || { echo "Development sentinel is missing: $stage/robot-wof.dev.pak" >&2; exit 1; }
command -v timeout >/dev/null || { echo 'GNU timeout is required for the bounded smoke launch' >&2; exit 1; }

echo "Binary: $binary"
file "$binary"
echo "Stage: $stage"
echo "Data files: $(find "$stage/data" -type f | wc -l)"
echo "Case report: $stage/zhangfei-case-report.tsv"

if [[ "$launch" -ne 1 ]]; then
  echo 'Preflight passed; GUI was not launched.'
  echo "Add --launch to run a bounded ${seconds}-second smoke test."
  exit 0
fi

echo "Launching OpenBOR for at most ${seconds} seconds..."
set +e
(
  cd "$stage"
  timeout --foreground --signal=INT --kill-after=3 "${seconds}s" "$binary" ./robot-wof.dev.pak
)
status=$?
set -e

case "$status" in
  0)
    echo 'OpenBOR exited normally.'
    ;;
  124|130|137)
    echo 'OpenBOR reached the bounded smoke-test limit and was stopped.'
    ;;
  *)
    echo "OpenBOR exited with status $status; inspect $stage/Logs/." >&2
    exit "$status"
    ;;
esac

if [[ -f "$stage/Logs/OpenBorLog.txt" ]]; then
  echo "Engine log: $stage/Logs/OpenBorLog.txt"
fi
if [[ -f "$stage/Logs/ScriptLog.txt" ]]; then
  echo "Script log: $stage/Logs/ScriptLog.txt"
fi
