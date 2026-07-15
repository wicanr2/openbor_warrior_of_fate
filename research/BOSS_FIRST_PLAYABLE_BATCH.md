# Boss first playable batch

這份文件把 boss 線收斂成可以直接交接的第一批。
它優先處理已經有 engineering closure 的 boss，讓 production redraw 與 runtime closure 都有明確入口。

## 範圍定義

- 第一個 boss playable batch = `lidian` production redraw + `zeon_boss` runtime closure。
- 這不是把所有 boss 一次做完；`xuchu`、`xiahorse` 與三人組仍在下一批。
- 這批只做可交接包：依賴閉包、canvas、exact-case、palette index 0 與 smoke gate。

## Primary batch

| Batch | Slot | Files / models | 目的 | 驗證重點 |
| --- | --- | --- | --- | --- |
| BOSS-LIDIAN-A | lidian | data/chars/boss/lidian/lidian.txt · data/chars/boss/lidian/li.txt | 把 Stage01 Boss 的 production redraw 與 visible gameplay review 收斂成第一個可交接包。 | 69 GIF + 6 TXT engineering closure 已有；新 batch 要補 spawn / hurt / death / fragment 的 production art。 |
| BOSS-ZEON-A | zeon_boss | data/chars/boss/zeon_boss/boss_hud.gif · data/story/diag/zeon_boss.txt · data/story/pro/char_pilot.gif | 把有腳吉翁克與夏亞 cut-in 的 runtime closure 攤平成第一個 boss runtime batch。 | 67-file closure、67 張 GIF、pilot cut-in 與 boss HUD 必須同時可載入。 |

## Next after the first batch

| Batch | Slot | Files / models | 目的 | 驗證重點 |
| --- | --- | --- | --- | --- |
| BOSS-XUCHU-G0 | xuchu | data/chars/boss/xuchu/… | 先做縮尺版大型主角機 Boss，保留原 canvas 但把 silhouette / hurt / death 做成能打的 G0。 | 需要 geometry-migration.json 與至少一套可視 gameplay review。 |
| BOSS-XIAHORSE-SPLIT | xiahorse | data/chars/boss/xiahoudun/… · data/chars/boss/xiahorse/… | 把騎乘載具與駕駛員分離，避免戰鬥中途閃回原素材。 | 低血量分離、horse / lei3 替代依賴與 phase 1/2 都要閉包。 |

## 驗證命令

```bash
node scripts/validate-openbor-assets.mjs --data <staging-tree>/data/models.txt --strict
node scripts/validate-openbor-assets.mjs --data <staging-tree>/data/chars/boss/lidian/lidian.txt --strict
node scripts/validate-openbor-assets.mjs --data <staging-tree>/data/chars/boss/zeon_boss/zeon_boss.txt --strict
scripts/run-openbor-smoke-docker.sh --binary /path/to/OpenBOR --stage <staging-tree> --seconds 20
```

## 來源文件

- [research/manifests/boss-next-queue.json](manifests/boss-next-queue.json)
- [docs/BOSS_PRODUCTION_PLAN.md](../docs/BOSS_PRODUCTION_PLAN.md)
- [docs/ZEON_BOSS_WITH_LEGS_PLAN.md](../docs/ZEON_BOSS_WITH_LEGS_PLAN.md)
- [research/ENEMY_BOSS_CONCEPT_MAP.md](ENEMY_BOSS_CONCEPT_MAP.md)