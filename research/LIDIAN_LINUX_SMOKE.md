# Lidian Linux smoke evidence

This note records a real headless smoke run for the Lidian boss slice. It proves the Linux unpacked-tree smoke gate reaches model-load completion for the current boss P0 tree.

## Command

```bash
scripts/run-openbor-smoke-docker.sh \
  --binary /tmp/openbor-linux-v7533f-docker-20260715/source/engine/releases/LINUX/OpenBOR/OpenBOR \
  --stage /tmp/robot-wof-lidian-p0-v1 \
  --seconds 15
```

## Result

- Docker reported the sandbox's `/var/run/docker.sock` permission error.
- The smoke wrapper still completed the stage log check and reported:
  - `PASS: OpenBOR reached model-load completion in Docker`
  - `Docker exit: 1 (124 is the expected bounded timeout)`
  - `Log: /tmp/robot-wof-lidian-p0-v1/Logs/OpenBorLog.txt`

## Log evidence

Relevant `OpenBorLog.txt` lines:

- `Loading models............... Done!`
- `Loading menu.txt............. Done!`
- `Loading fonts................ 1 2 3 4 5 7 Done!`
- `Done!`

The dummy-video warning is expected and not a fatal load error for this gate.

## What this proves

- The Lidian P0 tree still clears the Linux model-load gate.
- The existing smoke wrapper remains valid for boss slice load verification.
- The boss workstream is not blocked at unpacked-tree load time on Linux.

## What remains open

- Windows runner smoke.
- macOS runner smoke.
- Visible gameplay / screenshot verification.
- Production art closure for the remaining boss queue items.

