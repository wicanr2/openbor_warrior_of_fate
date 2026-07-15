# ν Gundam runner QA checklist

This note narrows the remaining ν Gundam work to the visible runner gate. It is the handoff document for the step that follows the already-verified P0 static/runtime closure.

## Already verified

- `nu_gundam` is registered as the sixth selectable model.
- `allowselect guanyu zhangfei zhaoyun huangzhong weiyan nu_gundam` is canonical.
- The select overlay patch is idempotent.
- The select overlay test currently passes:

```bash
node scripts/test-six-player-select-overlay.mjs
```

The test proved:

- the roster stays at six candidates;
- excluded player-style models remain loaded but unselectable;
- `models.txt` and `select.txt` are byte-stable across re-runs;
- the `nu_funnel_shot` support model stays registered exactly once.

## Current runtime validator result

I also ran the ν runtime validator against the available integrated build artifacts:

```bash
node scripts/validate-nu-gundam-runtime.mjs \
  --base-data /tmp/nu-integrated-28yEGa/stage/data \
  --template-data /tmp/nu-integrated-28yEGa/overlay/data \
  --build-dir /tmp/nu-integrated-28yEGa/overlay
```

That run now passes. The validator checks the actual output GIFs against the build manifest's canonical anchors and still enforces:

- `actionGif = 71`
- `nuPhysicalGif = 73`
- `missingRefs = 0`
- `clampedPlacements = 0`
- `addedCanvasEdges = 0`
- `maximumAnchorDrift = 1`

Headless Linux smoke evidence is recorded separately in [`NU_GUNDAM_LINUX_SMOKE.md`](NU_GUNDAM_LINUX_SMOKE.md). It confirms only the model-load gate; it does not close visible runner QA.

I also ran the headless OpenBOR smoke against the ν integrated stage:

```bash
scripts/run-openbor-smoke-docker.sh \
  --binary /tmp/openbor-linux-v7533f-docker-20260715/source/engine/releases/LINUX/OpenBOR/OpenBOR \
  --stage /tmp/nu-integrated-28yEGa/stage \
  --seconds 15
```

That run reached `Loading models... Done!` in `OpenBorLog.txt`, which confirms the full ν integrated tree still clears the Linux model-load gate.

## Still open

- Visible runner QA with screenshots or recorded frames.
- Confirm `nu_gundam` can be selected in a real runner.
- Enter Stage 1 and survive a basic gameplay loop.
- Confirm `nosame 1` behaviour in a real two-player session.
- Replace the remaining proxy-level Funnel behaviour with production drone logic.
- Replace borrowed rifle / saber / impact FX with ν-specific production assets.

## Expected runner evidence

When the visible runner is available, capture these checks in order:

1. Open the six-player select screen.
2. Confirm the cursor can reach `nu_gundam`.
3. Confirm the `Ready!` state and selection preview do not overlap the roster.
4. Start Stage 1 with `nu_gundam`.
5. Confirm the stage loads and the character remains controllable for a basic loop.
6. Repeat with a second player to verify `nosame 1` and roster stability.

## Visible runner harness

Once a host or CI runner has a working display server, use the dedicated harness:

```bash
scripts/run-openbor-visible-qa.sh \
  --binary /path/to/OpenBOR \
  --stage /path/to/nu-visible-stage \
  --display :0 \
  --seconds 30 \
  --macro nu_select_stage1 \
  --capture /path/to/nu-visible-run.mp4 \
  --title-pattern OpenBOR
```

The helper is intentionally separate from the headless smoke path. It expects a
real display server, can focus the visible OpenBOR window with `xdotool`, and
can record the run with `ffmpeg` when capture is requested.
The `nu_select` macro cycles the cursor to the sixth slot and confirms once;
`nu_select_stage1` repeats the confirm to enter Stage 1 when the visible runner
is ready for a gameplay check.

For GitHub Actions on a self-hosted Linux runner, the corresponding manual
workflow is [`../.github/workflows/visible-runner-qa.yml`](../.github/workflows/visible-runner-qa.yml).

## Practical build expectations

The runner QA should use a build directory that already contains:

- `data/models.txt`
- `data/levels/select.txt`
- `data/chars/nu_gundam/nu_gundam.txt`
- `data/chars/nu_gundam/funnel/nu_funnel_shot.txt`
- `data/profiles/nu_gundam.gif`
- `data/profiles/nu_gundam_m.gif`

The overlay builder at [`scripts/build-nu-gundam-engineering-preview.mjs`](../scripts/build-nu-gundam-engineering-preview.mjs) expects a generated overlay directory and a six-player select sheet. If the overlay directory is missing, generate the ν P0 build first, then rebuild the preview.

## Local visible-runner attempt in this sandbox

I also tried to move past headless smoke and capture a real visible frame inside a virtual X server. The attempt used `Xvfb`/`xvfb-run`, `xdotool`, and `ffmpeg` against the integrated stage, but this sandbox could not establish a usable X socket:

```bash
Xvfb :99 -screen 0 1024x768x24 >/tmp/xvfb-test.log 2>&1 &
DISPLAY=:99 xdpyinfo
```

The server log reported:

- `_XSERVTransSocketCreateListener: failed to bind listener`
- `Owner of /tmp/.X11-unix should be set to root`
- `Cannot establish any listening sockets`

So the current environment is enough for headless loader evidence, but not enough for a stable visible runner screenshot path. A host or CI runner with a working display server is still required for the cursor / Ready / Stage 1 image capture in this checklist.

## Cross-links

- [ν Gundam 第六可選角色工程計畫](../docs/NU_GUNDAM_SIXTH_CHARACTER_PLAN.md)
- [ν Gundam 第六角色 P0 vertical slice](../docs/NU_GUNDAM_VERTICAL_SLICE.md)
- [ν Gundam 剩餘工作隊列](manifests/nu-gundam-next-queue.json)
