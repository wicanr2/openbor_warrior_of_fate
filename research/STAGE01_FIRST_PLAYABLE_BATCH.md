# Stage01 first playable batch

這份文件把第一關的「可玩 gate」收斂成可交接、可驗證、可追蹤的工程批次。
它的目標不是把 Stage01 全部做完，而是先讓 team 能用固定順序把最小可玩 slice 走通。

## 範圍定義

- 第一個 gate = 背景三層 + 藍盔雜兵 + 機械補給箱。
- Lidian boss、UI/story、platform smoke 不是同一個 gate，但都已在後續 queue 內。
- 這批只做 engineering handoff：canvas、大小寫、palette index 0、依賴閉包與 smoke gate。

## Primary gate

| Batch | Files / models | 目的 | 驗證重點 |
| --- | --- | --- | --- |
| BG-S01-A | data/bgs/01/S2.gif · data/bgs/01/panel.gif · data/bgs/01/f.GIF | 森林開場長圖與前景遮擋，先把視窗、地平線、wall / hole 與透明色契約鎖住。 | V00–V05 / S2-Tail 與 W1–W4 的幾何和遮擋一致。 |
| EN-BING-A | data/chars/army/1/bing.txt · data/chars/army/1/bingxs.txt | 第一個原創量產雜兵；先完成 base palette、idle / walk / attack / fall / debris 閉包。 | 31 個直接動畫、42 個 physical GIF，且 palette index 0 固定為 #FC00FF。 |
| PROP-S01-A | data/chars/misc/box/1/baoxiang.txt | 機械補給箱與破壞幀；保留掉落物契約，不把 item 畫死在箱內。 | baoxiang.gif、1.GIF、2.GIF 都要載入；破壞幀與掉落不互相遮蔽。 |

## Next after the playable gate

| Batch | Status | Files / models | 目的 | 驗證重點 |
| --- | --- | --- | --- | --- |
| BOSS-LIDIAN-A | follow-up | data/chars/boss/lidian/lidian.txt · data/chars/boss/lidian/li.txt | Stage01 Boss production redraw；工程 closure 已有，還缺可視 gameplay review。 | 69 GIF + 6 TXT 之外，還要做 spawn / hurt / death / fragment 的 production art。 |
| UI-S01-A | follow-up | data/bgs/01/map1.txt · data/bgs/02/map2.txt · data/chars/misc/black.txt · data/chars/misc/story/story.txt | 戰術地圖、故事框、NPC 與頭像的機器人風格統一。 | map / story / portrait / NPC 的公開索引要能直接定位檔案。 |

## 背景幾何與檢查點

| ID | rect / source | 用途 |
| --- | --- | --- |
| V00 | 0, 0, 480, 276 | playable viewport checkpoint |
| V01 | 400, 0, 480, 276 | playable viewport checkpoint |
| V02 | 800, 0, 480, 276 | playable viewport checkpoint |
| V03 | 1200, 0, 480, 276 | playable viewport checkpoint |
| V04 | 1600, 0, 480, 276 | playable viewport checkpoint |
| V05 | 1949, 0, 480, 276 | playable viewport checkpoint |
| S2-Tail | 2120, 0, 480, 276 | playable viewport checkpoint |
| W1 | source 1090, 165, -40, 0, 1050, 950, 60, 5000 | wall polygon checkpoint |
| W2 | source 1210, 276, 40, 0, 144, 104, 25, 5000 | wall polygon checkpoint |
| W3 | source 1766, 276, -35, 0, 60, 81, 25, 5000 | wall polygon checkpoint |
| W4 | source 1315, 276, 40, 0, 420, 450, 27, 5000 | wall polygon checkpoint |

## 交付順序

1. 先完成 `BG-S01-A`，把 480×276 可視範圍、wall / hole、index 0 透明色與前景遮擋鎖定。
2. 再完成 `EN-BING-A`，確認雜兵腳底、BBox、攻擊與倒地幀不會閃回原素材。
3. 接著完成 `PROP-S01-A`，把破壞幀與掉落物分離，確保補給箱能在實戰中被打破。
4. 之後把 `BOSS-LIDIAN-A` 接上，完成第一關 Boss 的 production redraw 與可視 gameplay review。
5. 最後把 `UI-S01-A` 與 cross-platform smoke 補齊，讓第一關可以交給其他藝術家接力。

## 驗證命令

```bash
node scripts/validate-openbor-assets.mjs --data <staging-tree>/data/levels/NewWof/1/01.txt --strict
node scripts/validate-overlay-parity.mjs --base workplace/extracted/data --overlay workplace/robot_wof_vertical_slice/overlay/data
node scripts/validate-vertical-slice-coverage.mjs --base workplace/extracted/data --overlay workplace/robot_wof_vertical_slice/overlay/data
scripts/run-openbor-smoke-docker.sh --binary /path/to/OpenBOR --stage <staging-tree> --seconds 20
```

## 來源文件

- [research/STAGE01_BACKGROUND_VIEWPORTS.json](STAGE01_BACKGROUND_VIEWPORTS.json)
- [research/STAGE01_REPLACEMENT_MANIFEST.md](STAGE01_REPLACEMENT_MANIFEST.md)
- [research/manifests/stage01-next-queue.json](manifests/stage01-next-queue.json)
- [research/manifests/stage01-delivery-checklist.json](manifests/stage01-delivery-checklist.json)
- [research/manifests/boss-next-queue.json](manifests/boss-next-queue.json)
- [docs/STAGE01_ENVIRONMENT_VERTICAL_SLICE.md](../docs/STAGE01_ENVIRONMENT_VERTICAL_SLICE.md)
- [docs/BLUE_HELMET_GRUNT_VERTICAL_SLICE.md](../docs/BLUE_HELMET_GRUNT_VERTICAL_SLICE.md)
- [docs/LIDIAN_BOSS_VERTICAL_SLICE.md](../docs/LIDIAN_BOSS_VERTICAL_SLICE.md)