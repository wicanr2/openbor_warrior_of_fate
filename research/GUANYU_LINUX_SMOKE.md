# Guanyu Linux smoke evidence

This note records a real headless smoke run for the current Getter v2 / Guanyu slice. It proves the Linux unpacked-tree smoke gate reaches model-load completion for the current Getter engineering runtime.

## Command

```bash
scripts/run-openbor-smoke-docker.sh \
  --binary /tmp/openbor-linux-v7533f-docker-20260715/source/engine/releases/LINUX/OpenBOR/OpenBOR \
  --stage /tmp/robot-wof-guanyu-p0-v1 \
  --seconds 15
```

## 2026-07-16 reverify

The Linux build and smoke were rerun against the current local OpenBOR checkout and the same Guanyu stage:

```bash
scripts/build-openbor-linux-docker.sh \
  --source /home/anr2/openbor-study/openbor \
  --ref v7533 \
  --output /tmp/openbor-linux-docker-robot-wof

scripts/run-openbor-smoke-docker.sh \
  --binary /tmp/openbor-linux-docker-robot-wof/source/engine/releases/LINUX/OpenBOR/OpenBOR \
  --stage /tmp/robot-wof-guanyu-p0-v1 \
  --seconds 20
```

Build info:

- `source_commit=5c8261444de6b61f8e2ce6e79e3d86a2949e55bd`
- `binary_sha256=5ac687c5b590b077cd47721b15edd3064470cddf3ac4e3087082d1f83e4aa5af`
- `binary=/tmp/openbor-linux-docker-robot-wof/source/engine/releases/LINUX/OpenBOR/OpenBOR`

## Result

- The rerun reached:

  - `Cacheing 'guanyu' from data/chars/guanyu/guanyu.txt`
  - `Loading models............... Done!`
  - `Loading menu.txt............. Done!`
  - `Loading fonts................ 1 2 3 4 5 7 Done!`
  - `Done!`

The smoke wrapper reported:

- `PASS: OpenBOR reached model-load completion in Docker`
- `Docker exit: 124 (124 is the expected bounded timeout)`
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
