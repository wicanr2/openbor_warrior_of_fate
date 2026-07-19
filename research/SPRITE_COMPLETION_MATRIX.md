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
| 關羽／Getter／流龍馬 | `assets/players/guanyu` | 67 GIF | 65 主圖、2 HUD；strict、palette、canvas gate | 16 key pose 展開成獨立 in-between；`g1`–`g16` 騎乘／武器 sprite；受擊、死亡、BBox／attack box 逐格 review | engineering prototype |
| 張飛／無敵鐵金剛／兜甲兒 | `assets/players/zhangfei` | 44 GIF | P0 41 physical GIF coverage | 41 張獨立 production redraw；特殊技、抓投、倒地碎片與 2P palette | engineering prototype |
| 趙雲／EVA／碇真嗣 | `assets/players/zhaoyun` | 84 GIF | P0 runtime overlay | P1／P2 特效與抓投、獨立 in-between、武器／受擊逐格 review | engineering prototype |
| 黃忠／RX-78／阿姆羅 | `assets/players/huangzhong` | 97 GIF | 73 主圖、projectile union 與 HUD | 8 projectile model 的獨立 flight／impact／muzzle sprite；全部 special、抓投與 in-between | engineering prototype |
| 魏延／機械哥吉拉／迷你哥吉拉 | `assets/players/weiyan` | 91 GIF＋3 TXT | P0 runtime、tail-ray proxy | 尾砲 charge／beam／impact、爪／dash FX、in-between、武器／攻擊 box | engineering prototype |
| ν Gundam／第六角色／阿姆羅系 | `assets/players/nu-gundam` | 78 GIF＋2 TXT | 71 action、Funnel proxy | 六發 Funnel 的獨立 orbit／beam／return／cleanup sprite；P1 special、in-between、攻擊 box | engineering prototype |
| Lidian 紅槍指揮機 | `assets/bosses/lidian-red-spear-commander` | 69 GIF | Boss P0 closure | 16 key pose 展開、槍擊 charge／impact、裝甲碎片逐件拆分、Boss hit/death review | engineering prototype |
| 島田兵／藍盔一般敵 | `assets/enemies/blue-helmet-grunt` | 42 GIF | `bing` overlay、死亡碎片 gate | `shooter` 投射物／muzzle；`bingxs` 全部碎片；量產敵 family 與攻擊姿勢 | engineering prototype |
| Stage01 機械前哨 | `assets/environments/stage01-forest-outpost` | 4 GIF | 三層背景＋scan FX | 其餘關卡背景、前景、tile／wall 對位與每個 sprite props | engineering prototype |
| 機械補給箱 | `assets/props/mechanical-supply-box` | 3 GIF | idle＋2 rupture | 其他道具與破壞零件的獨立 sprite inventory | engineering prototype |
| 六人選角 | `assets/ui/six-player-selection` | 1 GIF | 480×276 六欄圖 | 游標、READY、confirm、portrait／HUD 分離 sprite 的 production review | engineering prototype |

## 尚沒有 production sprite package 的工作線

| 工作線 | 概念來源 | 必須先交付的 sprite 閉包 |
|---|---|---|
| 夏亞／有腳吉翁克 Boss | `zeon_boss/` | Boss idle、walk、遠距攻擊、抓投、受擊、死亡、腳部碎片、icon、HUD、cut-in |
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

目前這份矩陣的正確總結是：**工程素材已經有一批，全部 production sprite
尚未完成。**
