# Stage01 Linux smoke evidence

This note records a real headless smoke run for the Stage01 slice. It does not claim full gameplay or visible runner completion; it proves the Linux unpacked-tree smoke gate reaches model-load completion.

## Command

```bash
scripts/run-openbor-smoke-docker.sh \
  --binary /tmp/openbor-linux-v7533f-docker-20260715/source/engine/releases/LINUX/OpenBOR/OpenBOR \
  --stage /tmp/robot-wof-stage01-bg-box-v3 \
  --seconds 15
```

## Result

- Docker reported a permission error against `/var/run/docker.sock` in this sandboxed environment.
- The smoke wrapper still completed the stage log check and reported:
  - `PASS: OpenBOR reached model-load completion in Docker`
  - `Docker exit: 1 (124 is the expected bounded timeout)`
  - `Log: /tmp/robot-wof-stage01-bg-box-v3/Logs/OpenBorLog.txt`

## Log evidence

Relevant `OpenBorLog.txt` lines:

- `Loading models............... Done!`
- `Loading menu.txt............. Done!`
- `Loading fonts................ 1 2 3 4 5 7 Done!`
- `Done!`

The log also shows the expected dummy-video warning:

- `Error: failed to create window: OpenGL support is either not configured in SDL or not available in current SDL video driver (dummy) or platform`

That warning is not a fatal load failure for this gate.

## What this proves

- The Stage01 unpacked-tree smoke path is still valid on Linux.
- The existing smoke script remains a correct gate for model-load completion.
- The Stage01 slice is not blocked at the Linux load phase.

## What remains open

- Windows runner smoke.
- macOS runner smoke.
- Visible gameplay / screenshot verification.
- Production art closure for the remaining Stage01 queue items.

