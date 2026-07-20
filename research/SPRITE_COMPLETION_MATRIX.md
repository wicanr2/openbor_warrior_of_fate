# Sprite completion matrix

這是「先完成全部 sprite」策略的權威交付矩陣。這裡的完成不是只有
`TXT` 能載入，而是每一個要替換的 runtime GIF 都有概念來源、獨立可審查的
姿勢、正確 canvas／Offset／腳底、精確洋紅鍵色，並完成逐格人工 review。

目前私有素材包的多數狀態仍是 `engineering-prototype`：它們能讓工程驗證
路徑與畫布，但仍重用 key pose，不能算成 production sprite。公開 repo 只
保存這張矩陣與總覽，不保存可直接重用的私有 GIF。

## 已有 private package，但尚未完成 production sprite

| 工作線 | private package | 目前 overlay | 目前證據 | 尚缺的 sprite 工作 | 狀態 |
|---|---|---:|---|---|---|
| 關羽／Getter／流龍馬 | `assets/players/guanyu` | 67 GIF | `getter-p1-interpolated-v1` 65 張獨立插值 raster；private `getter-v1` production-redraw seed 16/16 keyposes＋2 in-between seeds；strict、palette、canvas gate | 其餘手繪清線／in-between；`g1`–`g16` 騎乘／武器；受擊、死亡、BBox／attack-box review | interpolated candidate＋complete keypose seed＋in-between seeds |
| 張飛／無敵鐵金剛／兜甲兒 | `assets/players/zhangfei` | 44 GIF | P0 41 physical GIF coverage；`mazinger-production-p1-interpolated-v1` 已產出 41 張獨立插值 raster 並通過 parity；private `mazinger-v1` production redraw seed 16/16 keyposes＋1 in-between seed | 其餘手繪清線／in-between、特殊技、抓投、倒地碎片、BBox review 與 2P palette | interpolated candidate＋complete keypose seed＋in-between seed |
| 趙雲／EVA／碇真嗣 | `assets/players/zhaoyun` | 84 GIF | `eva-p1-interpolated-v1` 82 張獨立插值 raster；derived source；private `eva-v1` production redraw seed 16/16 keyposes＋2 in-between seeds | P1／P2 特效與抓投、其餘手繪清線／in-between、武器／受擊逐格 review | derived interpolated candidate＋complete keypose seed＋in-between seeds |
| 黃忠／RX-78／阿姆羅 | `assets/players/huangzhong` | 97 GIF | `rx78-p1-interpolated-v1` 73 張獨立插值 raster；derived source；private `rx78-v1` production redraw seed 16/16 keyposes | projectile flight／impact／muzzle、手繪清線、special／抓投／in-between | derived interpolated candidate＋complete keypose seed |
| 魏延／機械哥吉拉／迷你哥吉拉 | `assets/players/weiyan` | 91 GIF＋3 TXT | `riftbeast-p1-interpolated-v1` 84 張獨立插值 raster；tail-ray proxy 保留 | 尾砲 charge／beam／impact、爪／dash FX、手繪清線、BBox review | interpolated candidate |
| ν Gundam／第六角色／阿姆羅系 | `assets/players/nu-gundam` | 78 GIF＋2 TXT | `nu-p1-interpolated-v1` 73 張獨立插值 raster；private `funnel-v1` exact-canvas proxy candidates＋3 independent effect redraw seeds＋three 3-frame timing candidates；private `nu-v1` production redraw seed 16/16 keyposes | Funnel orbit／beam／return 的獨立逐格 redraw、timing／cleanup、手繪清線、P1 special、BBox review | interpolated candidate＋complete keypose seed＋effect proxy/redraw seed |
| Lidian 紅槍指揮機 | `assets/bosses/lidian-red-spear-commander/candidates/lidian-p1-interpolated-v1` | 79 GIF | 79 張獨立插值 raster；strict parity、canvas、palette index 0 PASS | Lidian 獨立造型逐格 production redraw、槍擊 charge／impact、裝甲碎片逐件拆分、BBox／attack-box、Boss hit/death review | interpolated candidate |
| 夏亞／有腳吉翁克 Boss | `assets/bosses/zeon-boss-with-legs/candidates/zeon-p1-interpolated-v1` | 64 GIF | 64 張獨立插值 raster；strict parity、canvas、palette index 0、fresh-build hash PASS | 16 pose 逐格 production redraw、邊緣清線、BBox／attack-box、HUD、projectile／debris、pilot cut-in、spawn 與 gameplay QA | interpolated candidate |
| Boss family（Lidian／Meiling／Meimei／Meiya／夏侯惇／Xuchu） | `assets/bosses/boss-family-p1-interpolated-v1` | 405 GIF | 六個 model 共 405 張獨立插值 raster；405/405 strict parity、canvas、palette index 0 PASS | 每個 Boss 獨立造型逐格 production redraw、HUD／icon、projectile／debris、pilot cut-in、BBox／gameplay review | interpolated candidate |
| 島田兵／藍盔一般敵 | `assets/enemies/blue-helmet-grunt/candidates/blue-helmet-p1-interpolated-v1` | 42 GIF | 42 張獨立插值 raster；42/42 strict parity、canvas、palette index 0 PASS | `shooter` 投射物／muzzle；`bingxs` 全部碎片；變體與攻擊姿勢逐格 production redraw | interpolated candidate |
| 量產敵 family／army 1–10 | `assets/enemies/army-family-p1-interpolated-v1` | 522 GIF | 十個 model 共 522 張獨立插值 raster；522/522 strict parity、canvas、palette index 0 PASS | 每個 model 的獨立造型逐格 production redraw、shooter／muzzle、死亡碎片、BBox／attack-box review | interpolated candidate |
| 原始 NPC／men＋women | `assets/enemies/npc-family-p1-interpolated-v1` | 37 GIF | 37 張獨立插值 raster；37/37 strict parity、canvas、palette index 0 PASS | 民用／劇情 NPC 獨立造型、portrait variants、逐格 production redraw、BBox review | interpolated candidate |
| 共用 misc FX／碎片 | `assets/effects/misc-mechanical-fx-p1-interpolated-v1` | 848 GIF | 848 張獨立插值 raster；848/848 strict parity、canvas、palette index 0 PASS | blood／organ silhouette 逐件機械化重畫、beam／爆炸／煙塵 family、timing 與 gameplay review | interpolated candidate |
| 背景 GIF／bgs | `assets/environments/bgs-mechanical-p1-interpolated-v1` | 77 GIF | 77 張獨立插值 raster；77/77 strict parity、canvas、palette index 0 PASS | stage-specific 背景與 tileset 重畫、wall／foreground 對位、lighting 與 runtime review | interpolated candidate |
| Scene／logo／story GIF | `assets/ui/scenes-mechanical-p1-interpolated-v1` | 617 GIF | 617 張獨立插值 raster；617/617 strict parity、canvas、palette index 0 PASS | title/logo、story artwork、portrait、cut-in、typography 與 scene layout production redraw | interpolated candidate |
| 玩家 mount／weapon submodel | `assets/players/mount-submodels-p1-interpolated-v1` | 675 GIF | 675 張獨立插值 raster；675/675 strict parity、canvas、palette index 0 PASS | 各機體 mount／武器獨立造型、rider alignment、逐格 timing、BBox review | interpolated candidate |
| 其餘 legacy GIF catch-all | `assets/legacy/remaining-sprite-p1-interpolated-v1` | 447 GIF | 447 張獨立插值 raster；447/447 strict parity、canvas、palette index 0 PASS | 各語意類別的正式重畫、字型／portrait／story review、特殊技逐格 QA | interpolated candidate |
| Stage01 機械前哨 | `assets/environments/stage01-forest-outpost/candidates/stage01-p1-v1` | 4 GIF | 三層背景＋scan FX overlay parity PASS | 其餘關卡背景、前景、tile／wall 對位與每個 sprite props | overlay-verified candidate |
| 機械補給箱 | `assets/props/mechanical-supply-box/candidates/box-p1-v1` | 3 GIF | idle＋2 rupture overlay parity PASS | 其他道具與破壞零件的獨立 sprite inventory | overlay-verified candidate |
| 六人選角 | `assets/ui/six-player-selection/candidates/six-selection-p1-v1` | 1 GIF | 480×276 六欄圖 overlay parity PASS | 游標、READY、confirm、portrait／HUD 分離 sprite 的 production review | overlay-verified candidate |

## 尚沒有 production sprite package 的工作線

| 工作線 | 概念來源 | 必須先交付的 sprite 閉包 |
|---|---|---|
| 其他 Boss | `robot_boss/` | 每個 Boss 至少 16 格 key pose、完整 action GIF、icon／HUD、攻擊 FX、死亡碎片 |
| 量產敵人 family | `robot_wof_enemy/` | 島田兵變體、射擊兵、近戰兵、重裝兵、空中兵；每個 model 的 idle／walk／attack／pain／fall／death／icon |
| 原始 NPC／軍隊替換 | `workplace/extracted/data/chars/army/` | 目前 level spawn 到的 `man*`、`woman*`、`shooter`、`cap*`、`ybing` 等逐 model 機械化 sprite |
| 共用特效／碎片 | `robot_boss/`、各角色 concept | hit、beam、爆炸、煙塵、金屬碎片、機械死亡；清除剩餘 human blood／organ 語彙 |
| 其餘關卡 | `workplace/extracted/data/bgs/` | 每關 background、panel、foreground、tile／wall、環境 FX 的完整 sprite closure |

## Sprite 完成定義

每個矩陣列必須同時通過以下 gates，才可由 `engineering-prototype` 改成
`production-sprite-complete`：

1. model TXT 的所有 GIF／PNG 引用都有對應的獨立 production raster；不能由
   base data 補檔，也不能以同一 key pose 靜默重用來填整批動作。
2. 每張 GIF 保留權威 canvas、Offset、腳底 anchor、BBox 與 attack 時序；
   frame manifest 要記錄來源 concept、pose id、畫師／reviewer 與版本。
3. 每張透明 GIF 是 indexed palette，palette index 0 精確為 `#FC00FF`；
   不依賴 alpha 或 GIF transparency extension。
4. 動作群組逐格檢查：idle／walk、attack、jump／land、pain／fall／death、
   special、grab，以及該 model 的 projectile／碎片／HUD／icon。
5. 同一工作線 fresh build 兩次 byte-identical（時間戳 manifest 除外），
   並完成公開總覽圖與私有逐檔 review 記錄。

## 下週工作順序

1. 先完成六名 playable player 的 P0／P1 主模型獨立 frame，解除目前
   「key pose reuse」標記；不碰關卡 gameplay。
2. 同步完成所有玩家的 icon／HUD／selection／projectile／death-fragment
   sprite，讓每個 player package 成為完整 art closure。
3. 完成 `bing`／量產敵人與 Stage01 spawn 清單中所有 human-facing model 的
   sprite package，再做 Lidian 與 Zeon Boss。
4. 最後掃描所有 level／models TXT，將仍由 base data 補上的 sprite 逐項加入
   本矩陣；矩陣未清空前不進入下一階段 gameplay 整合。

目前這份矩陣的正確總結是：**3,966/3,966 extracted runtime GIF 已有 private
P1 engineering candidate，union uncovered=0；全部 production sprite 仍尚未完成。**
