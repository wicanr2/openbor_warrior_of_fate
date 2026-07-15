# Open items summary

This report aggregates the currently open queues and delivery checklists. It is a working summary for handoff and prioritization, not a completion claim.

Total open items (approximate, from queued pending rows): 28

| Workstream | Status | Open items | Source |
| --- | --- | ---: | --- |
| boss-production | mixed-engineering-and-production-remaining | 6 | [manifests/boss-next-queue.json](manifests/boss-next-queue.json) |
| stage01-delivery | production-remaining | 6 | [manifests/stage01-delivery-checklist.json](manifests/stage01-delivery-checklist.json) |
| stage01-environment-and-grunt | engineering-coverage-complete-but-production-remaining | 6 | [manifests/stage01-next-queue.json](manifests/stage01-next-queue.json) |
| guanyu-getter-v2 | p0-engineering-runtime-complete-but-production-remaining | 5 | [manifests/guanyu-next-queue.json](manifests/guanyu-next-queue.json) |
| nu-gundam-sixth-character | p0-engineering-runtime-complete-but-production-remaining | 5 | [manifests/nu-gundam-next-queue.json](manifests/nu-gundam-next-queue.json) |
| portrait-work-queue.json | mixed-engineering-and-pending-portrait-work | 0 | [manifests/portrait-work-queue.json](manifests/portrait-work-queue.json) |

## What is still blocking end-state completion

- Stage01 still needs production redraw, grunt cleanup, boss art review, UI/story unification, and platform smoke.
- Boss work still needs production art closure for Lidian, Zeon Boss, Xuchu, Xiahorse, and the adult-coded trio.
- Player-side production cleanup still remains for Guanyu / Nu Gundam / portrait work, with deferred closure on the existing P0 engineering slices.

## Most actionable next work

1. Close Stage01 production redraw and cleanup first, because it unlocks the first visible in-gameplay slice and still has the broadest public-facing surface.
2. Finish Boss production closures next, especially Lidian and the Zeon Boss queue, because those reuse the same stage presentation and art-review path.
3. Keep player-side portrait work aligned with the current routing rules so new art lands in the correct slot without reassigning playable models.

## Confirmed portrait routing

- liubei: story-only
- caocao: story-only
- lubu: story-only

## Recently verified gates

These are no longer open items; they are documented separately so future work can distinguish model-load evidence from playable QA:

- [Stage01 Linux smoke evidence](STAGE01_LINUX_SMOKE.md)
- [Lidian Linux smoke evidence](LIDIAN_LINUX_SMOKE.md)
- [Huangzhong Linux smoke evidence](HUANGZHONG_LINUX_SMOKE.md)
- [Guanyu Linux smoke evidence](GUANYU_LINUX_SMOKE.md)
- [ν Gundam Linux smoke evidence](NU_GUNDAM_LINUX_SMOKE.md)
- [ν Gundam runner QA checklist](NU_GUNDAM_RUNNER_QA.md)

## Generated from

- manifests/stage01-next-queue.json
- manifests/stage01-delivery-checklist.json
- manifests/boss-next-queue.json
- manifests/portrait-work-queue.json
- manifests/guanyu-next-queue.json
- manifests/nu-gundam-next-queue.json