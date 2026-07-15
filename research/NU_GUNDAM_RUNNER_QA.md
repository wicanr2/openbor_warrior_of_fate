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

## Practical build expectations

The runner QA should use a build directory that already contains:

- `data/models.txt`
- `data/levels/select.txt`
- `data/chars/nu_gundam/nu_gundam.txt`
- `data/chars/nu_gundam/funnel/nu_funnel_shot.txt`
- `data/profiles/nu_gundam.gif`
- `data/profiles/nu_gundam_m.gif`

The overlay builder at [`scripts/build-nu-gundam-engineering-preview.mjs`](../scripts/build-nu-gundam-engineering-preview.mjs) expects a generated overlay directory and a six-player select sheet. If the overlay directory is missing, generate the ν P0 build first, then rebuild the preview.

## Cross-links

- [ν Gundam 第六可選角色工程計畫](../docs/NU_GUNDAM_SIXTH_CHARACTER_PLAN.md)
- [ν Gundam 第六角色 P0 vertical slice](../docs/NU_GUNDAM_VERTICAL_SLICE.md)
- [ν Gundam 剩餘工作隊列](manifests/nu-gundam-next-queue.json)

