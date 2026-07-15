# Production handoff matrix

This matrix is the shortest useful handoff view for the remaining Robot WOF work. It groups the queues by who should act next, not by how much has already been verified.

## Already verified loader gates

- Stage01 Linux smoke evidence
- Lidian Linux smoke evidence
- Huangzhong Linux smoke evidence
- Guanyu Linux smoke evidence
- ν Gundam Linux smoke evidence

## Remaining work by area

| Area | Owner | Status | Pending work | Next action | Source |
| --- | --- | --- | --- | --- | --- |
| Stage01 | environment / grunt / boss / UI | engineering-coverage-complete-but-production-remaining | panel-s2-fglayer-production: Redraw Stage01 long background layers; bing-production-cleanup: Finish blue helmet grunt production cleanup; baoxiang-production-cleanup: Turn the supply box into a production asset; stage01-boss-art: Close Lidian boss art review; stage01-ui-and-story: Finish map, story, NPC, and icon replacement; stage01-platform-smoke: Run unpacked tree smoke on all three platforms | Start with research/STAGE01_FIRST_PLAYABLE_BATCH.md, then finish long background redraw, grunt cleanup, Lidian review, and UI/story replacement. | [manifests/stage01-next-queue.json](manifests/stage01-next-queue.json) |
| Stage01 delivery | delivery checklist | production-remaining | bg-layers: First-stage long background layers ready for visible gameplay; blue-helmet-grunt: Mechanized grunt production cleanup; supply-box: Production-ready mechanical supply box; lidian-boss: Visible gameplay boss review and production redraw; stage01-ui-story: Unify tactical map, dialogue portraits, NPCs and item icons into the robot theme; stage01-platform-smoke: Unpacked-tree smoke on all three platforms | Stage01 Linux smoke is verified; Windows and macOS smoke remain. | [manifests/stage01-delivery-checklist.json](manifests/stage01-delivery-checklist.json) |
| Boss | boss / story / cut-in | mixed-engineering-and-production-remaining | lidian-production-redraw: Finish Lidian production redraw; zeon-boss-runtime-closure: Close Zeon boss runtime packages; xuchu-g0-implementation: Implement Xuchu G0 giant-boss direction; xiahorse-split-closure: Separate Xiahorse rider and vehicle dependencies; mei-trio-production: Produce the three adult-coded boss variants; boss-platform-smoke: Run boss fixture smoke on all three platforms | Start with research/BOSS_FIRST_PLAYABLE_BATCH.md, then close Lidian redraw, Zeon boss runtime, Xuchu G0, Xiahorse split, and the adult-coded trio. | [manifests/boss-next-queue.json](manifests/boss-next-queue.json) |
| Portraits | selection / HUD / cut-in | mixed-engineering-and-pending-portrait-work | liubei → story-only; caocao → story-only; lubu → story-only | Keep liubei / caocao / lubu story-only unless explicitly promoted; resolve nu_gundam pilot and zeon_boss cut-in separately. | [manifests/portrait-work-queue.json](manifests/portrait-work-queue.json) |
| Getter / Guanyu | player production cleanup | p0-engineering-runtime-complete-but-production-remaining | g1-g16-closure: Close rider / pickup / water / special submodels; gore-remap: Replace human gore vocabulary; playerdie-wav: Replace death audio; frame-interpolation: Finish per-frame interpolation; gameplay-qa: Run visible gameplay QA | g1–g16, gore, death audio, and visible gameplay QA remain. | [manifests/guanyu-next-queue.json](manifests/guanyu-next-queue.json) |
| ν Gundam | player production cleanup | p0-engineering-runtime-complete-but-production-remaining | visible-runner: Implement visible runner QA for six-player select; funnel-p1-closure: Close the Fin Funnel P1 behavior; weapon-fx-audio: Replace reused rifle and saber proxies; production-inbetweens: Draw production in-between frames; playable-qa: Finish gameplay-visible QA | Finish visible runner QA / Stage 1 entry / Funnel P1 while preserving six-candidate select rules. | [manifests/nu-gundam-next-queue.json](manifests/nu-gundam-next-queue.json) |

## Interpretation

- Stage01 is still the first visible-in-gameplay slice, but Linux smoke is no longer a blocker.
- Boss work still needs production art closure, even though Lidian Linux loader evidence is already recorded.
- Portrait work is mostly about routing and assignment now; `nu_gundam` and `zeon_boss` remain separate from generic story-only names.
- Guanyu and ν Gundam are engineering/runtime complete but still need production and visible QA closure.

## Generated from

- manifests/stage01-next-queue.json
- manifests/stage01-delivery-checklist.json
- manifests/boss-next-queue.json
- manifests/portrait-work-queue.json
- manifests/guanyu-next-queue.json
- manifests/nu-gundam-next-queue.json