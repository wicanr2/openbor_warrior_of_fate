# Six-player selection storyboard

This storyboard turns the current six-candidate selection baseline into a concrete visible-runner QA reference. It is still not a live OpenBOR screenshot, but it fixes the expected cursor, Ready, and confirm states in one visual asset.

## Evidence

- Storyboard image: [`ui/six-player-selection-storyboard.gif`](ui/six-player-selection-storyboard.gif)
- Manifest: [`manifests/six-player-selection-storyboard.json`](manifests/six-player-selection-storyboard.json)
- Build script: [`../scripts/build-six-player-selection-storyboard.mjs`](../scripts/build-six-player-selection-storyboard.mjs)

## What it proves

- The six-candidate selection flow has a concrete visual reference for cursor movement.
- `nu_gundam` is explicitly part of the expected six-step cursor path.
- The READY and CONFIRM phases are called out as separate visible states.

## What remains open

- A live OpenBOR runner screenshot that shows the real cursor and ready flow.
- `nosame 1` behavior.
- Stage 1 entry from the live runner.
