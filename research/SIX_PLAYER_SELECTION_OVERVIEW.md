# Six-player selection overview

This file records the current six-candidate selection baseline for ν Gundam. It is a deterministic engineering image, not a live OpenBOR runner capture.

## Evidence

- Output image: [`ui/six-player-selection-overview.gif`](ui/six-player-selection-overview.gif)
- Manifest: [`manifests/six-player-selection-overview.json`](manifests/six-player-selection-overview.json)
- Build script: [`../scripts/build-six-robot-selection-runtime.mjs`](../scripts/build-six-robot-selection-runtime.mjs)

## What it proves

- The roster is laid out as six candidates.
- `nu_gundam` occupies the sixth column.
- The palette stays opaque with index 0 reserved as `#FC00FF` and unused by pixels.
- The image can be reconstructed deterministically from the archived five-column base plus ν portrait/body inputs.

## What remains open

- Visible OpenBOR cursor movement.
- Ready / confirm flow.
- `nosame 1` behavior.
- Stage 1 entry from the live runner.

