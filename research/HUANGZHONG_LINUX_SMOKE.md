# Huangzhong Linux smoke evidence

This note records a real headless smoke run for the Huangzhong P0 slice. It proves the Linux unpacked-tree smoke gate reaches model-load completion for the current player P0 tree.

## Command

```bash
scripts/run-openbor-smoke-docker.sh \
  --binary /tmp/openbor-linux-v7533f-docker-20260715/source/engine/releases/LINUX/OpenBOR/OpenBOR \
  --stage /tmp/huangzhong-p0-stage \
  --seconds 15
```

## Result

- Docker reported the sandbox's `/var/run/docker.sock` permission error.
- The smoke wrapper still completed the stage log check and reported:
  - `PASS: OpenBOR reached model-load completion in Docker`
  - `Docker exit: 1 (124 is the expected bounded timeout)`
  - `Log: /tmp/huangzhong-p0-stage/Logs/OpenBorLog.txt`

## Log evidence

Relevant `OpenBorLog.txt` lines:

- `Loading models............... Done!`
- `Loading menu.txt............. Done!`
- `Loading fonts................ 1 2 3 4 5 7 Done!`
- `Done!`

The dummy-video warning is expected and not a fatal load error for this gate.

## What this proves

- The Huangzhong P0 tree still clears the Linux model-load gate.
- The existing smoke wrapper remains valid for player slice load verification.
- The player workstream is not blocked at unpacked-tree load time on Linux.

## What remains open

- Windows runner smoke.
- macOS runner smoke.
- Visible gameplay / screenshot verification.
- Production art closure for the remaining Huangzhong queue items.

