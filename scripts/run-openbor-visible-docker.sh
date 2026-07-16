#!/usr/bin/env bash

set -euo pipefail

binary=
stage=
image=openbor-visible-qa:local
seconds=30
macro=
width=1024
height=768
title_pattern='OpenBOR|robot-wof.dev'

usage() {
  cat <<'EOF'
Usage:
  scripts/run-openbor-visible-docker.sh --binary PATH --stage PATH [options]

Options:
  --image NAME      Docker image (default: openbor-visible-qa:local)
  --seconds N       Bounded runner time (default: 30)
  --macro NAME      Existing visible-QA macro, for example guanyu_attack_stage1
  --title-pattern RE  xdotool window match pattern (default: OpenBOR|robot-wof.dev)
  --width N         Virtual display and capture width (default: 1024)
  --height N        Virtual display and capture height (default: 768)
  --help            Show this help

Starts a private Xvfb :99 inside Docker. The host X11 socket is never mounted.
The video is saved as <stage>/VisibleQA/openbor-visible-run.mp4.
EOF
}

while (($#)); do
  case "$1" in
    --binary) binary=${2:-}; shift 2 ;;
    --stage) stage=${2:-}; shift 2 ;;
    --image) image=${2:-}; shift 2 ;;
    --seconds) seconds=${2:-}; shift 2 ;;
    --macro) macro=${2:-}; shift 2 ;;
    --title-pattern) title_pattern=${2:-}; shift 2 ;;
    --width) width=${2:-}; shift 2 ;;
    --height) height=${2:-}; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[[ -n "$binary" && -n "$stage" ]] || { usage >&2; exit 2; }
binary=$(readlink -f "$binary")
stage=$(readlink -f "$stage")
repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
[[ -f "$binary" && -x "$binary" ]] || { echo "OpenBOR binary is not executable: $binary" >&2; exit 1; }
[[ -d "$stage/data" && -f "$stage/robot-wof.dev.pak" ]] || { echo "Stage is not a prepared OpenBOR staging tree: $stage" >&2; exit 1; }
[[ "$seconds" =~ ^[1-9][0-9]*$ && "$width" =~ ^[1-9][0-9]*$ && "$height" =~ ^[1-9][0-9]*$ ]] || {
  echo 'seconds, width, and height must be positive integers' >&2; exit 2;
}

mkdir -p "$stage/VisibleQA"

docker run --rm \
  --platform linux/amd64 \
  --user "$(id -u):$(id -g)" \
  --tmpfs /tmp:rw,mode=1777 \
  --env HOME=/tmp \
  --env SDL_VIDEODRIVER=x11 \
  --env SDL_AUDIODRIVER=dummy \
  --env QA_SECONDS="$seconds" \
  --env QA_MACRO="$macro" \
  --env QA_WIDTH="$width" \
  --env QA_HEIGHT="$height" \
  --env QA_TITLE_PATTERN="$title_pattern" \
  --volume "$repo:/repo:ro" \
  --volume "$binary:/openbor:ro" \
  --volume "$stage:/stage" \
  "$image" \
  bash -lc '
    set -euo pipefail
    Xvfb :99 -screen 0 "${QA_WIDTH}x${QA_HEIGHT}x24" -nolisten tcp >/tmp/xvfb.log 2>&1 &
    xvfb_pid=$!
    trap "kill ${xvfb_pid} >/dev/null 2>&1 || true" EXIT
    for _ in $(seq 1 20); do
      DISPLAY=:99 xdpyinfo >/dev/null 2>&1 && break
      sleep 0.2
    done
    DISPLAY=:99 xdpyinfo >/dev/null 2>&1 || { cat /tmp/xvfb.log >&2; exit 1; }
    args=(--binary /openbor --stage /stage --display :99 --seconds "${QA_SECONDS}" --title-pattern "${QA_TITLE_PATTERN}" --capture /stage/VisibleQA/openbor-visible-run.mp4 --width "${QA_WIDTH}" --height "${QA_HEIGHT}")
    if [[ -n "${QA_MACRO}" ]]; then args+=(--macro "${QA_MACRO}"); fi
    /repo/scripts/run-openbor-visible-qa.sh "${args[@]}"
  '

echo "PASS: isolated X11 visible QA complete"
echo "Capture: $stage/VisibleQA/openbor-visible-run.mp4"
