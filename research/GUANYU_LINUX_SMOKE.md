# Guanyu Linux smoke evidence

This note records a real headless smoke run for the current Getter v2 / Guanyu slice. It proves the Linux unpacked-tree smoke gate reaches model-load completion for the current Getter engineering runtime.

## Command

```bash
scripts/run-openbor-smoke-docker.sh \
  --binary /tmp/openbor-linux-v7533f-docker-20260715/source/engine/releases/LINUX/OpenBOR/OpenBOR \
  --stage /tmp/robot-wof-guanyu-p0-v1 \
  --seconds 15
```

## Result

- Docker reported the sandbox's `/var/run/docker.sock` permission error.
- The smoke wrapper still completed the stage log check and reported:
  - `PASS: OpenBOR reached model-load completion in Docker`
  - `Docker exit: 1 (124 is the expected bounded timeout)`
  - `Log: /tmp/robot-wof-guanyu-p0-v1/Logs/OpenBorLog.txt`

## Log evidence

Relevant `OpenBorLog.txt` lines:

- `Cacheing 'guanyu' from data/chars/guanyu/guanyu.txt`
- `Loading models............... Done!`
- `Loading menu.txt............. Done!`
- `Loading fonts................ 1 2 3 4 5 7 Done!`
- `Done!`

The dummy-video warning is expected and not a fatal load error for this gate.

## What this proves

- The Getter v2 / Guanyu P0 tree still clears the Linux model-load gate.
- The existing smoke wrapper remains valid for player-slice load verification.
- The Getter workstream is not blocked at unpacked-tree load time on Linux.

## What remains open

- Visible gameplay / screenshot verification.
- Stage 1 gameplay loop.
- Windows runner smoke.
- macOS runner smoke.
- Production art closure for the remaining Getter queue items.
