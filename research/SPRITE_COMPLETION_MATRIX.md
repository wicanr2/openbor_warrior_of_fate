# Sprite completion matrix

這是「先完成全部 sprite」策略的權威交付矩陣。這裡的完成不是只有
`TXT` 能載入，而是每一個要替換的 runtime GIF 都有概念來源、獨立可審查的
姿勢、正確 canvas／Offset／腳底、精確洋紅鍵色，並完成逐格人工 review。

目前私有素材包的多數狀態仍是 `engineering-prototype`：它們能讓工程驗證
路徑與畫布，但仍重用 key pose，不能算成 production sprite。公開 repo 只
保存這張矩陣與總覽，不保存可直接重用的私有 GIF。

2026-07-20 已對 private `references/production-redraw` 中由 manifest 可識別的
runtime／FX／碎片 GIF 完成 strict scan：**351/351** 通過 manifest canvas、
indexed palette、palette index 0 `#FC00FF` 與無 GIF transparency extension。
這是格式／交接基線，不代表動作逐格或 gameplay review 已完成。

## 已有 private package，但尚未完成 production sprite

| 工作線 | private package | 目前 overlay | 目前證據 | 尚缺的 sprite 工作 | 狀態 |
|---|---|---:|---|---|---|
| 關羽／Getter／流龍馬 | `assets/players/guanyu` | 71 GIF | `getter-p1-interpolated-v1` 65 張獨立插值 raster＋65/65 BBox entries；private `getter-v1` 16/16 keypose＋15 adjacent interpolation seed＋31 張 94×94 runtime GIF／BBox，及 4-frame Tomahawk FX seed；2026-07-20 從 committed keyed PNG 重建，31/31 strict canvas／palette-index-0／no-transparency gate PASS | 其餘手繪清線／in-between；`g1`–`g16` 騎乘／武器；受擊、死亡、attack-box gameplay review | interpolated candidate＋runtime keypose/in-between/FX seed＋BBox handoff |
| 張飛／無敵鐵金剛／兜甲兒 | `assets/players/zhangfei` | 48 GIF | P0 41 physical GIF coverage；`mazinger-production-p1-interpolated-v1` 41 張獨立插值 raster＋41/41 BBox entries（修正 3 個透明色 marker）；private `mazinger-v1` 16/16 keypose＋15 adjacent interpolation seed＋31 張 128×112 runtime GIF／BBox，另有 4-frame Rocket Punch 與 4-frame Breast Fire FX seeds；2026-07-20 從 committed keyed PNG 重建，31/31 strict canvas／palette-index-0／no-transparency gate PASS | 其餘手繪清線／in-between、arm/fist separation、抓投、倒地碎片、attack-box review 與 2P palette | interpolated candidate＋runtime keypose/in-between/FX seed＋BBox handoff |
| 趙雲／EVA／碇真嗣 | `assets/players/zhaoyun` | 88 GIF | `eva-p1-interpolated-v1` 82 張獨立插值 raster＋82/82 BBox entries；derived source；private `eva-v1` 16/16 keypose＋15 adjacent interpolation seed＋31 張 201×138 runtime GIF／BBox；另有 4-frame Progressive Knife 與 4-frame AT Field FX seeds；2026-07-20 從 committed keyed PNG 重建，31/31 strict canvas／palette-index-0／no-transparency gate PASS | P1／P2 特效與抓投、AT Field body separation、其餘手繪清線／in-between、武器／受擊逐格 review | derived interpolated candidate＋runtime keypose/in-between seed＋FX/BBox handoff |
| 黃忠／RX-78／阿姆羅 | `assets/players/huangzhong` | 101 GIF | `rx78-p1-interpolated-v1` 73 張獨立插值 raster＋73/73 BBox entries；derived source；private `rx78-v1` 16/16 keypose＋15 adjacent interpolation seed＋31 張 220×116 runtime GIF／BBox，另有 4-frame projectile 與 4-frame Beam Saber FX seeds；2026-07-20 從 committed keyed PNG 重建，31/31 strict canvas／palette-index-0／no-transparency gate PASS | projectile separation／flight／impact／muzzle、手繪清線、special／抓投、attack-box gameplay review | derived interpolated candidate＋runtime keypose/in-between/FX seed＋BBox handoff |
| 魏延／機械哥吉拉／迷你哥吉拉 | `assets/players/weiyan` | 95 GIF＋3 TXT | `riftbeast-p1-interpolated-v1` 84 張獨立插值 raster＋84/84 BBox entries；tail-ray proxy 保留；private `riftbeast-v1` production redraw seed 16/16 keypose＋11 full-chain in-between＋2 normalized FX seeds，另有 4-frame tail-cannon FX v2；另有 202×120 runtime export 16＋11＋2 FX GIF 與 27-frame BBox manifest；2026-07-20 27 張 character GIF 由 committed keyed PNG 重建，strict canvas／palette-index-0／no-transparency gate PASS，既有 gameplay pivot 保留待實機 review | 尾砲／爪 FX runtime timing、pivot/BBox gameplay review | interpolated candidate＋production seed＋runtime export＋FX/BBox handoff |
| ν Gundam／第六角色／阿姆羅系 | `assets/players/nu-gundam` | 82 GIF＋2 TXT | `nu-p1-interpolated-v1` 73 張獨立插值 raster＋73/73 BBox entries；private `funnel-v1` exact-canvas proxy candidates＋3 independent effect redraw seeds＋9 timing frames＋新增 4-frame 64×16 Funnel FX＋BBox manifest；private `nu-v1` 16/16 cleaned keyposes＋15 adjacent interpolation seeds＋31 張 202×120 runtime GIF＋兩份 BBox manifest；2026-07-20 從 committed keyed PNG 重建，31/31 strict canvas／palette-index-0／no-transparency gate PASS，gameplay pivot 保留待 review | Funnel orbit／beam／return 的獨立逐格 redraw、timing／cleanup、手繪清線、P1 special、gameplay BBox review | interpolated candidate＋runtime keypose/in-between seeds＋effect proxy/redraw seed＋BBox handoff |
| Lidian 紅槍指揮機 | `assets/bosses/lidian-red-spear-commander/candidates/lidian-p1-interpolated-v1` | 79 GIF | 79 張獨立插值 raster＋79/79 BBox entries；strict parity、canvas、palette index 0 PASS；private `lidian-v1` 16/16 keypose＋15 adjacent interpolation seed＋31 張 269×139 runtime GIF／BBox；另有 4-frame spear FX 與 4-frame death-fragment seed；2026-07-20 從 committed keyed PNG 重建，31/31 strict canvas／palette-index-0／no-transparency gate PASS | attack-box、Boss hit/death timing、逐件人工清線與 gameplay review | interpolated candidate＋runtime production seed＋FX/BBox handoff |
| 夏亞／有腳吉翁克 Boss | `assets/bosses/zeon-boss-with-legs/candidates/zeon-p1-interpolated-v1` | 64 GIF | 64 張獨立插值 raster；strict parity、canvas、palette index 0、fresh-build hash PASS；64/64 BBox manifest entries verified；另有 private `zeon-v1` 8 張 180×144 runtime keypose／air／death seed；2026-07-20 保留原姿勢／落影／殘骸像素合成到鍵色後重索引，8/8 strict canvas／palette-index-0／no-transparency gate PASS | 16 pose 逐格 production redraw、邊緣清線、attack-box、HUD、projectile／debris、pilot cut-in、spawn 與 gameplay QA | interpolated candidate＋BBox handoff＋runtime seed |
| 原創化黑白大型 Boss | `assets/bosses/super-robot-boss-v1` | 9 GIF | private fan-use／rights-unverified `super-robot-v1` 四張 220×160 runtime seed；idle、heavy punch、chest cannon、wreckage；另有 4-frame chest-cannon charge／beam／impact／fade FX 與一張 35×54 derived HUD/icon candidate；BBox manifest，public repo 不保存個別圖檔 | 12 姿勢、獨立 HUD／icon portrait、projectile／debris、pilot cut-in、手繪、attack-box／gameplay QA | private runtime／FX/UI seed＋BBox handoff |
| Boss family（Lidian／Meiling／Meimei／Meiya／夏侯惇／Xuchu） | `assets/bosses/boss-family-p1-interpolated-v1` | 405 GIF | 六個 model 共 405 張獨立插值 raster；405/405 strict parity、canvas、palette index 0 PASS；405/405 BBox manifest entries verified | 每個 Boss 獨立造型逐格 production redraw、HUD／icon、projectile／debris、pilot cut-in、model-specific attack-box／gameplay review | interpolated candidate＋BBox handoff |
| Cinder Ace 原創女 Boss | `assets/bosses/cinder-ace/candidates/cinder-ace-medium-v1` | 16 GIF | 原創 4×4 storyboard 切出 16 張 `180×144` medium Boss GIF；16/16 通過 indexed palette、index-0 `#FC00FF`、無 GIF transparency extension；source storyboard 與 `MEDIUM-MANIFEST.json` 僅在 private repo | 依 Stage03B Boss slot 對應 model TXT、HUD portrait、attack-box／pivot、FX 與 gameplay review | original medium candidate |
| Ivory Regent 原創女 Boss | `assets/bosses/ivory-regent/candidates/ivory-regent-medium-v1` | 16 GIF | 原創象牙白／鈷藍 4×4 storyboard 切出 16 張 `180×144` medium Boss GIF；16/16 通過 indexed palette、index-0 `#FC00FF`、無 GIF transparency extension；source storyboard 與 `MEDIUM-MANIFEST.json` 僅在 private repo | 依 Stage03B Boss slot 對應 model TXT、HUD portrait、attack-box／pivot、FX 與 gameplay review | original medium candidate |
| 島田兵／藍盔一般敵 | `assets/enemies/blue-helmet-grunt/candidates/blue-helmet-p1-interpolated-v1`、`blue-helmet-medium-v1` | 58 GIF | 原有 42 張獨立插值 raster 之外，新增原創 4×4 storyboard 切出的 16 張 150×120 medium GIF；16/16 通過 indexed palette、index-0 `#FC00FF`、無 GIF transparency extension，並保留 source storyboard 與 `MEDIUM-MANIFEST.json` 在 private repo | 將 medium seed 對應到實際 `bing` model 的 frame 名稱、offset/BBox、attack-box 與 gameplay review | original medium candidate＋既有 runtime keypose/effect/in-between seeds |
| 量產敵 family／army 1–10 | `assets/enemies/army-family-p1-interpolated-v1`、`army-family-medium-v1` | 522 GIF | 十個 model 共 522 張工程 GIF；medium validator 已逐檔通過 522/522，所有 canvas ≤220×160、indexed palette、index-0 `#FC00FF`、無 transparency extension；唯一 800×607 的 `1/icon1.GIF` 另輸出 150×114 medium replacement，原檔保留；十型各四格 runtime seed 與 BBox manifest 仍可追溯 | 每個 model 的獨立造型逐格 production redraw、shooter／muzzle、死亡碎片、model-specific attack-box／gameplay review | medium engineering coverage＋replacement manifest＋runtime seed |
| 原始 NPC／men＋women | `assets/enemies/npc-family-p1-interpolated-v1`、`NPC-MEDIUM-MANIFEST.json` | 37 GIF | private NPC p0 的 37 張 GIF 已逐檔通過 medium validator；canvas 全部 ≤220×160（最大 120×88）、indexed palette、index-0 `#FC00FF`、無 transparency extension | 民用／劇情 NPC 獨立造型、portrait variants、逐格 production redraw、model-specific BBox／scene review | medium engineering coverage＋manifest |
| 共用 misc FX／碎片 | `assets/effects/misc-mechanical-fx-p1-interpolated-v1`、`MISC-FX-MEDIUM-MANIFEST.json` | 848 GIF | private FX p0 的 848 張 GIF 已逐檔通過 FX medium validator；canvas 上限 960×512（含全螢幕黑幕／煙塵／爆炸）、indexed palette、index-0 `#FC00FF`、無 transparency extension | blood／organ silhouette 逐件機械化重畫、beam／爆炸／煙塵 family、timing 與 gameplay review | medium FX engineering coverage＋manifest |
| 背景 GIF／bgs | `assets/environments/bgs-mechanical-p1-interpolated-v1`、`BACKGROUNDS-MEDIUM-MANIFEST.json` | 77 GIF | private bgs p0 的 77 張 GIF 已逐檔通過 background medium validator；長圖 canvas 上限 4096×320（最大 3972×276）、indexed palette、index-0 `#FC00FF`、無 transparency extension | stage-specific 原創背景與 tileset 重畫、wall／foreground 對位、lighting 與 runtime review | medium background engineering coverage＋manifest |
| Scene／logo／story GIF | `assets/ui/scenes-mechanical-p1-interpolated-v1`、`SCENES-MEDIUM-MANIFEST.json` | 617 GIF | private scenes/UI p0 的 617 張 GIF 已逐檔通過 medium validator；canvas 全部 ≤640×360（最大 480×272）、indexed palette、index-0 `#FC00FF`、無 transparency extension | title/logo、story artwork、portrait、cut-in、typography 與 scene layout production redraw | medium scene engineering coverage＋manifest |
| 玩家 mount／weapon submodel | `assets/players/mount-submodels-p1-interpolated-v1`、`MOUNT-MEDIUM-MANIFEST.json` | 675 GIF | private mount/weapon p0 的 675 張 GIF 已逐檔通過 medium validator；canvas 上限 640×320、indexed palette、index-0 `#FC00FF`、無 transparency extension；唯一兩張超大魏延舊武器圖另輸出 medium replacements | 各機體 mount／武器獨立造型、rider alignment、逐格 timing、model-specific BBox／gameplay review | medium engineering coverage＋replacement manifest |
| 其餘 legacy GIF catch-all | `assets/legacy/remaining-sprite-p1-interpolated-v1`、`LEGACY-MEDIUM-MANIFEST.json` | 447 GIF | private legacy p0 的 447 張 GIF 已逐檔通過 medium validator；canvas 全部 ≤320×300（最大 268×256）、indexed palette、index-0 `#FC00FF`、無 transparency extension；union audit 仍為 uncovered=0 | 各語意類別的正式重畫、字型／portrait／story review、特殊技逐格 QA | medium legacy engineering coverage＋manifest |
| Stage01 機械前哨 | private `assets/environments/stage01-forest-outpost/overlay` | 4 GIF | 原創機械森林前哨已切成可見 S2／panel／左右機械根系 foreground 三層，並同步到 runtime overlay 的同名 physical paths；`sunshine1.gif` 保留既有 deterministic scan-light。中央角色跑道保留清楚，4/4 嚴格通過原 canvas、indexed palette、index-0 `#FC00FF`、無 GIF transparency extension。private preview 僅作交接檢視；public repo 不保存圖像。 | runtime parallax／viewport seam、lighting 與 gameplay review | original visible runtime overlay＋strict manifest handoff |
| 機械補給箱 | private `assets/props/mechanical-supply-box/overlay` | 3 GIF | 原創機械膠囊 idle、開裂與殘骸三格已輸出，並已同步到實際 runtime overlay 的 `data/chars/misc/box/1` physical paths；candidate 與 overlay hash 相同。3/3 嚴格通過原 canvas、indexed palette、index-0 `#FC00FF` 與無 GIF transparency extension。private `CONTACT-PREVIEW.png` 用於交接檢視，public repo 不保存圖像；舊 P1 candidate 保留做 engineering reference。 | OpenBOR placement／掉落物可見性、金屬破壞音效與其他容器／道具 sprite | original visible runtime overlay＋strict manifest handoff |
| 小型補給箱／`baoxiang2` | private `assets/props/mechanical-small-supply-box/overlay` | 2 GIF | 原創完整／破損輕型補給箱已同步到 `data/chars/misc/box/0/1.gif`、`2.GIF` runtime paths；candidate／overlay hash 相同。2/2 嚴格通過 indexed palette、index-0 `#FC00FF` 與無 GIF transparency extension。 | Boss 前 placement、掉落物可見性與 sound review | original visible runtime overlay＋strict manifest handoff |
| 戰術能量信標／`firew` | private `assets/props/tactical-energy-beacon/overlay` | 3 GIF | 原創 dormant／active column／overload 三格已同步到 `data/chars/misc/bomb/b1.GIF`–`b3.GIF` runtime paths；candidate／overlay hash 相同。3/3 嚴格通過 indexed palette、index-0 `#FC00FF` 與無 GIF transparency extension。private preview 只用於交接，public repo 不保存圖片。 | 對應 script 效果、關卡 placement 與音效 review | original visible runtime overlay＋strict manifest handoff |
| Stage02 機械河谷基地 | private `assets/environments/stage02-valley-base/overlay` | 4 GIF | 原創藍時山谷／裝甲基地 panorama 與側邊 foreground 已依 `02.txt`／`2.txt` 實際 canvas 輸出 `bp.GIF` 3123×276、`p.gif` 3000×276、`f2.GIF` 3100×276、`f1.GIF` 3135×276；4/4 通過 indexed palette、index-0 `#FC00FF`、無 GIF transparency extension。來源 PNG 與 candidate manifest 僅在 private repo。 | runtime parallax／wall-hole seam、lighting、tileset 與 gameplay review | original visible runtime overlay＋strict manifest handoff |
| 六人選角 | `assets/ui/six-player-selection/candidates/six-selection-p1-v1` | 1 GIF | 480×276 六欄圖 overlay parity PASS；`SELECTION-SLOT-MANIFEST.json` 定義六個 80×276 slot | 游標、READY、confirm、portrait／HUD 分離 sprite 的 production review | overlay-verified candidate＋slot handoff |

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
