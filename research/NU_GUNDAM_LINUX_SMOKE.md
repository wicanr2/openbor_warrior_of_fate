# ν Gundam Linux smoke evidence

This note records a real headless smoke run for the current ν Gundam / sixth-role slice. It proves the Linux unpacked-tree smoke gate reaches model-load completion for the integrated ν tree.

## Command

```bash
scripts/run-openbor-smoke-docker.sh \
  --binary /tmp/openbor-linux-v7533f-docker-20260715/source/engine/releases/LINUX/OpenBOR/OpenBOR \
  --stage /tmp/nu-integrated-28yEGa/stage \
  --seconds 15
```

## Result

- Docker reported the sandbox's `/var/run/docker.sock` permission error.
- The smoke wrapper still completed the stage log check and reported:
  - `PASS: OpenBOR reached model-load completion in Docker`
  - `Docker exit: 1 (124 is the expected bounded timeout)`
  - `Log: /tmp/nu-integrated-28yEGa/stage/Logs/OpenBorLog.txt`

## Log evidence

Relevant `OpenBorLog.txt` lines:

- `Cacheing 'nu_gundam' from data/chars/nu_gundam/nu_gundam.txt`
- `Loading models............... Done!`
- `Loading menu.txt............. Done!`
- `Loading fonts................ 1 2 3 4 5 7 Done!`
- `Done!`

The dummy-video warning is expected and not a fatal load error for this gate.

## What this proves

- The ν Gundam integrated tree still clears the Linux model-load gate.
- The existing smoke wrapper remains valid for the sixth-role load verification.
- The ν Gundam workstream is not blocked at unpacked-tree load time on Linux.

## What remains open

- Visible runner QA with screenshots or recorded frames.
- Confirm `nu_gundam` can be selected in a real runner.
- Enter Stage 1 and survive a basic gameplay loop.
- Confirm `nosame 1` behaviour in a real two-player session.
- Replace the remaining proxy-level Funnel behaviour with production drone logic.
- Replace borrowed rifle / saber / impact FX with ν-specific production assets.
