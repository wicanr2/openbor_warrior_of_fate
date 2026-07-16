# Runtime status — 2026-07-16

This checkpoint deliberately distinguishes asset/load evidence from a claim
that the whole game is playable. The project is **not release-ready** and must
not yet be described as a complete Super Robot Wars version of Warriors of
Fate.

## Verified today

1. Public engineering commit `672d564` adds a reproducible private-package
   assembler and target-scoped integration gate. The assembler copied 13
   declared packages (six players, six-player selection, Stage 01, blue-helmet
   grunt, prop, roster and remap registrations) to a disposable overlay with a
   SHA-256 manifest.
2. `validate-super-robot-integration.mjs` passed all nine target checks in
   `/tmp/robot-wof-super-robot-stage-v1`: six player model definitions,
   selection UI, Stage 01 and the blue-helmet `bing` model. This includes
   exact-case aliases created only in the disposable staging directory.
3. Isolated Docker/Xvfb visible QA produced a 50.016-second MP4 from the
   integrated stage. The macro passed the selection flow, waited through the
   scripted Stage 01 intro, moved right, then sent three `A` attack inputs.
   The capture continued after those inputs to the bounded end. A frame at 32
   seconds shows the Getter player on Stage 01, so the test did not remain at
   the menu.

The MP4 and extracted screenshots live only in the disposable `/tmp` stage;
they are evidence, not repository assets.

## Important interpretation

The bounded visible runner has sometimes printed glibc heap-corruption text
when `timeout` interrupts OpenBOR during teardown. That observation is not
enough to call it an in-game attack crash: the 50-second capture above survived
the post-intro movement and attack input. Conversely, it does not prove every
attack animation, collision path, or the user's host AppImage session is safe.

## Still incomplete / blocking a playable claim

- The reported host-side attack hang has not been reproduced with a clean,
  graceful (non-`timeout`) exit. It remains an open runtime defect until a
  desktop/AppImage run is checked after repeated attacks.
- Stage 01 still contains original non-robot characters (the visible test
  frame includes a human NPC/enemy). The blue-helmet overlay does not replace
  every original `man*`, `shooter`, `cap*`, `woman*`, and boss definition.
- Only the assembled P0 packages are covered. Later stages, their backgrounds,
  enemies, NPCs, bosses, cut-scenes, HUD/profile remnants, sounds, and all
  production redraw / animation-cleanup work are still incomplete.
- The visible harness proves a scripted path only; it has no assertion that
  the `A` inputs reached a specific animation frame or hitbox. This must be
  upgraded before treating it as a gameplay regression test.
- Windows and macOS builds/runs have not been verified. The AppImage must be
  rebuilt from the integrated stage only after the Linux desktop gameplay gate
  is clean.

## Resume next week

1. Make the visible runner exit OpenBOR gracefully after the attack sequence,
   retain before/after attack screenshots, and add an explicit window-alive /
   frame-change assertion.
2. Re-run the resulting AppImage on a real desktop and compare it with the
   user's attack-hang screenshot. If it hangs, retain the matching log and
   isolate the exact animation/model rather than changing unrelated assets.
3. Audit Stage 01's spawn list (`man*`, `woman*`, `shooter`, `cap*`, `bing`,
   props and boss) and turn every remaining human-facing definition into a
   robot replacement work package.
4. Continue the same audit across all remaining levels before calling the
   project a completed playable conversion.

## Commands to resume

From `openbor_warrior_of_fate` after preparing the disposable stage described
in [SUPER_ROBOT_INTEGRATION_BUILD.md](SUPER_ROBOT_INTEGRATION_BUILD.md):

```bash
node scripts/validate-super-robot-integration.mjs \
  --stage /tmp/robot-wof-super-robot-stage-v1

scripts/run-openbor-visible-docker.sh \
  --binary /path/to/OpenBOR \
  --stage /tmp/robot-wof-super-robot-stage-v1 \
  --seconds 50 \
  --macro guanyu_attack_stage1
```
