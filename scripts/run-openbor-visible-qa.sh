#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/run-openbor-visible-qa.sh \
    --binary /path/to/OpenBOR \
    --stage /tmp/robot-wof-openbor-visible-qa-XXXXXX \
    --display :0 [options]

Options:
  --binary PATH        Existing Linux OpenBOR executable
  --stage PATH         Disposable stage prepared for OpenBOR
  --display DISPLAY    X11 display to use for the visible runner
  --seconds N          Bounded runtime for the OpenBOR process (default: 30)
  --capture PATH       Optional ffmpeg capture path (.mp4/.mkv recommended)
  --title-pattern RE   Optional xdotool window match pattern (default: OpenBOR)
  --macro NAME        Optional key macro to run after the window appears
  --width N            Capture width for ffmpeg x11grab (default: 1024)
  --height N           Capture height for ffmpeg x11grab (default: 768)
  --help               Show this help

This helper expects a working visible display server supplied by the host or
CI runner. It does not try to create Xvfb inside this sandbox; that path is
documented as blocked. The script only verifies the visible runner flow and
optionally records the display with ffmpeg.
EOF
}

binary=
stage=
display=
seconds=30
capture=
title_pattern=OpenBOR
macro=
width=1024
height=768

while (($#)); do
  case "$1" in
    --binary) binary=${2:-}; shift 2 ;;
    --stage) stage=${2:-}; shift 2 ;;
    --display) display=${2:-}; shift 2 ;;
    --seconds) seconds=${2:-}; shift 2 ;;
    --capture) capture=${2:-}; shift 2 ;;
    --title-pattern) title_pattern=${2:-}; shift 2 ;;
    --macro) macro=${2:-}; shift 2 ;;
    --width) width=${2:-}; shift 2 ;;
    --height) height=${2:-}; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[[ -n "$binary" && -n "$stage" && -n "$display" ]] || { usage >&2; exit 2; }
binary=$(readlink -f "$binary")
stage=$(readlink -f "$stage")
[[ -f "$binary" && -x "$binary" ]] || { echo "OpenBOR binary is not executable: $binary" >&2; exit 1; }
[[ -d "$stage/data" ]] || { echo "Visible QA stage has no data directory: $stage" >&2; exit 1; }
[[ -f "$stage/robot-wof.dev.pak" ]] || { echo "Missing staging sentinel: $stage/robot-wof.dev.pak" >&2; exit 1; }
[[ "$seconds" =~ ^[1-9][0-9]*$ ]] || { echo '--seconds must be a positive integer' >&2; exit 2; }
[[ "$width" =~ ^[1-9][0-9]*$ ]] || { echo '--width must be a positive integer' >&2; exit 2; }
[[ "$height" =~ ^[1-9][0-9]*$ ]] || { echo '--height must be a positive integer' >&2; exit 2; }

export DISPLAY="$display"

if [[ -n "$capture" ]]; then
  command -v ffmpeg >/dev/null || { echo 'ffmpeg is required for --capture' >&2; exit 1; }
fi
command -v xdotool >/dev/null || { echo 'xdotool is required for visible runner automation' >&2; exit 1; }
command -v timeout >/dev/null || { echo 'GNU timeout is required for the bounded visible runner' >&2; exit 1; }

log_dir="$stage/VisibleQA"
mkdir -p "$log_dir"
runner_log="$log_dir/openbor-visible-runner.log"
window_id_log="$log_dir/window-id.txt"

echo "Binary: $binary"
echo "Stage: $stage"
echo "Display: $DISPLAY"
echo "Title pattern: $title_pattern"
echo "Seconds: $seconds"
if [[ -n "$capture" ]]; then
  echo "Capture: $capture"
fi
if [[ -n "$macro" ]]; then
  echo "Macro: $macro"
fi

set +e
(
  cd "$stage"
  timeout --signal=INT --kill-after=3 "${seconds}s" \
    "$binary" ./robot-wof.dev.pak
) >"$runner_log" 2>&1 &
openbor_pid=$!
set -e

window_id=''
for _ in $(seq 1 20); do
  window_id=$(xdotool search --onlyvisible --name "$title_pattern" 2>/dev/null | head -n 1 || true)
  if [[ -n "$window_id" ]]; then
    printf '%s\n' "$window_id" > "$window_id_log"
    xdotool windowactivate --sync "$window_id" >/dev/null 2>&1 || true
    break
  fi
  sleep 1
done

capture_pid=''
if [[ -n "$capture" ]]; then
  ffmpeg -y \
    -f x11grab \
    -video_size "${width}x${height}" \
    -draw_mouse 0 \
    -i "$DISPLAY" \
    -t "$seconds" \
    "$capture" \
    >/dev/null 2>&1 &
  capture_pid=$!
fi

wait "$openbor_pid"
openbor_status=$?

if [[ -n "$capture_pid" ]]; then
  wait "$capture_pid" || true
fi

run_macro() {
  case "$macro" in
    '')
      return 0
      ;;
    nu_select)
      for _ in 1 2 3 4 5; do
        xdotool key --window "$window_id" Right
        sleep 0.15
      done
      xdotool key --window "$window_id" Return
      sleep 0.6
      xdotool key --window "$window_id" Return
      ;;
    nu_select_stage1)
      for _ in 1 2 3 4 5; do
        xdotool key --window "$window_id" Right
        sleep 0.15
      done
      xdotool key --window "$window_id" Return
      sleep 0.6
      xdotool key --window "$window_id" Return
      sleep 1.5
      xdotool key --window "$window_id" Return
      ;;
    *)
      echo "Unknown macro: $macro" >&2
      return 1
      ;;
  esac
}

if [[ -n "$macro" ]]; then
  if [[ -z "$window_id" ]]; then
    echo "Warning: macro '$macro' requested but no visible OpenBOR window was found" >&2
  else
    run_macro
  fi
fi

if [[ -s "$runner_log" ]]; then
  echo "OpenBOR visible-runner log: $runner_log"
fi
if [[ -n "$window_id" ]]; then
  echo "Window id: $(cat "$window_id_log")"
else
  echo "Warning: no visible OpenBOR window matched '$title_pattern'" >&2
fi

case "$openbor_status" in
  0|124|130|137)
    echo "Visible QA run finished with status $openbor_status"
    ;;
  *)
    echo "Visible QA run exited with status $openbor_status" >&2
    exit "$openbor_status"
    ;;
esac
