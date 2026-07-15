# 無敵鐵金剛 P0 動作／檔名對照

本文件只處理張飛主模型的 P0（第一個可玩替換版本）動作。分析來源是本機解包後的 `data/chars/zhangfei/zhangfei.txt`；概念來源與單張 key pose 留在 `private_assets/robot_wof/mazinger/`，GitHub 只保留分鏡總覽圖。

## 先看結論

- P0 由 4 群、34 個動畫定義組成：基本移動 5、基本攻擊 8、跳躍／著地 5、受傷／倒地／死亡 16。
- 依模型內 `Frame` 的 basename **區分大小寫** 去重後共有 42 個 GIF 引用；多個動畫會重用同一 GIF，所以各群數量不能相加。
- 磁碟上實際只有 41 個對應實體 GIF：`fallx.gif` 與 `fallx.GIF` 兩個引用都落到同一個 `fallx.GIF`。
- 42 個引用中有 11 個與磁碟檔名大小寫不一致。這在 Linux 裸檔案系統上有風險，正式 overlay 前應統一模型引用與實體檔名，不能只靠 Windows／macOS 預設的大小寫不敏感行為。
- 現有 4×3 分鏡是 12 個概念 key pose，**不是 12/42 張已完成 GIF**。它們尚未符合原 canvas、Offset、palette index 0 與 indexed GIF 規格。

`Offset (x,y)` 是模型在該動畫當下使用的原點；同一張 GIF 若出現在不同動畫，可以有不同 Offset。換圖時應以腳底／接地點對準既有 Offset，不要因新圖尺寸不同就直接改 BBox、attack 或 Delay。

## P0 動畫群組

| 群組 | 動畫定義 | 群內唯一 GIF 引用 |
|---|---|---:|
| 基本移動 | `idle`, `run`, `turn`, `waiting`, `walk` | 17 |
| 基本攻擊 | `attack1`, `attack2`, `attack3`, `attackbackward`, `attackboth`, `chargeattack`, `runattack`, `slide` | 14 |
| 跳躍／著地 | `jump`, `jumpattack`, `jumpdelay`, `jumpforward`, `land` | 6 |
| 受傷／倒地／死亡 | `bdie`, `bpain`, `burn`, `death`, `fall`, `fall4`, `fall7`, `pain`, `pain10`, `pain2`, `pain3`, `respawn`, `rise`, `sdie`, `shock`, `spain` | 16 |

## 42 個 case-sensitive GIF 引用

「模型引用」保持 `zhangfei.txt` 內的大小寫；「磁碟實體」是目前抽出素材真正的檔名。標有 ⚠ 的列不能視為 Linux 上的 exact-case match。

### A. 基本移動首次出現的 17 張

| # | 模型引用 | 磁碟實體 | Canvas | 動畫 → Offset |
|---:|---|---|---:|---|
| 1 | `idle00.gif` | `idle00.gif` | 128×112 | `attackboth` (59,97); `idle` (59,97); `runattack` (59,97); `slide` (59,97); `turn` (59,97) |
| 2 | `walk01.gif` | `walk01.gif` | 136×136 | `run` (74,128); `walk` (74,128) |
| 3 | `walk02.gif` | `walk02.gif` | 136×136 | `run` (74,128); `walk` (74,128) |
| 4 | `walk03.gif` | `walk03.gif` | 136×136 | `run` (74,128); `walk` (74,128) |
| 5 | `walk04.gif` | `walk04.gif` | 136×136 | `run` (74,128); `walk` (74,128) |
| 6 | `walk05.gif` | `walk05.gif` | 136×136 | `run` (74,128); `walk` (74,128) |
| 7 | `walk06.gif` | `walk06.gif` | 136×136 | `run` (74,128); `walk` (74,128) |
| 8 | `walk07.gif` | `walk07.gif` | 136×136 | `run` (74,128); `walk` (74,128) |
| 9 | `walk08.gif` | `walk08.gif` | 136×136 | `run` (74,128); `walk` (74,128) |
| 10 | `idle001.gif` | `idle001.gif` | 99×95 | `waiting` (141,80) |
| 11 | `punch001.gif` | `punch001.gif` | 115×108 | `attack1` (32,93); `waiting` (125,93) |
| 12 | `punch002.gif` | `punch002.gif` | 122×112 | `attack1` (27,97); `waiting` (120,97) |
| 13 | `punch003.gif` | `punch003.gif` | 120×113 | `attack2` (42,97); `attack3` (42,97); `slide` (42,97); `waiting` (135,97) |
| 14 | `punch004.gif` | `punch004.gif` | 129×117 | `attack2` (29,101); `waiting` (122,101) |
| 15 | `punch005.gif` | `punch005.gif` | 117×116 | `attack2` (45,101); `waiting` (138,101) |
| 16 | `punch006.gif` | `punch006.gif` | 130×115 | `attack3` (52,106); `chargeattack` (52,106); `waiting` (145,106) |
| 17 | `punch007.gif` | `punch007.gif` | 139×123 | `attack3` (42,115); `waiting` (135,115) |

`waiting` 是選角等待展示動畫，會重播 `idle001` 與七張拳擊圖；它的 X Offset 比遊戲內戰鬥動畫大約多 93，屬於展示位置，不是要把角色畫到畫布右邊。

### B. 基本攻擊新增的 6 張

| # | 模型引用 | 磁碟實體 | Canvas | 動畫 → Offset |
|---:|---|---|---:|---|
| 18 | `block2.gif` | ⚠ `block2.GIF` | 128×112 | `attackbackward` (59,97) |
| 19 | `block1.gif` | ⚠ `block1.GIF` | 128×112 | `attackbackward` (59,97) |
| 20 | `block0.gif` | ⚠ `block0.GIF` | 128×112 | `attackbackward` (59,97) |
| 21 | `spec001.gif` | `spec001.gif` | 100×101 | `slide` (37,88) |
| 22 | `spec002.gif` | `spec002.gif` | 89×99 | `slide` (22,89) |
| 23 | `spec003.gif` | `spec003.gif` | 100×105 | `slide` (7,96) |

基本攻擊其餘 8 張（`idle00.gif`、`punch001.gif`～`punch007.gif`）已列在 A，沒有重複計數。

### C. 跳躍／著地新增的 6 張

| # | 模型引用 | 磁碟實體 | Canvas | 動畫 → Offset |
|---:|---|---|---:|---|
| 24 | `jump2.gif` | ⚠ `jump2.GIF` | 128×112 | `jump` (59,97); `respawn` (59,97) |
| 25 | `jump3.gif` | ⚠ `jump3.GIF` | 128×112 | `jump` (59,97); `jumpattack` (59,97); `respawn` (59,97) |
| 26 | `jk001.gif` | `jk001.gif` | 95×101 | `jumpattack` (27,111) |
| 27 | `jump1.gif` | ⚠ `jump1.GIF` | 128×112 | `jumpdelay` (59,97); `jumpforward` (59,97); `land` (59,97); `respawn` (59,97); `rise` (59,97) |
| 28 | `jump02.gif` | `jump02.gif` | 81×105 | `jumpforward` (29,117) |
| 29 | `jk002.gif` | `jk002.gif` | 139×123 | `jumpforward` (36,135) |

### D. 受傷／倒地／死亡新增的 13 個引用

| # | 模型引用 | 磁碟實體 | Canvas | 動畫 → Offset |
|---:|---|---|---:|---|
| 30 | `fallf1.gif` | ⚠ `fallf1.GIF` | 122×70 | `bdie` (48,36) |
| 31 | `fallx2.gif` | ⚠ `fallx2.GIF` | 117×71 | `bdie` (42,57); `sdie` (42,57) |
| 32 | `fall2.gif` | `fall2.gif` | 117×71 | `bdie` (42,57); `death` (58,69); `fall` (55,82); `fall4` (58,60); `fall7` (43,57); `sdie` (42,57) |
| 33 | `fallx3.gif` | ⚠ `fallx3.GIF` | 114×64 | `bdie` (61,46); `sdie` (61,46) |
| 34 | `fall3.gif` | `fall3.gif` | 114×64 | `bdie` (61,46); `death` (61,46); `fall` (61,46); `fall4` (61,46); `fall7` (61,46); `rise` (61,48); `sdie` (61,46) |
| 35 | `pain2.gif` | `pain2.gif` | 77×90 | `bpain` (42,80); `burn` (42,80); `fall7` (58,43); `pain10` (42,80); `pain2` (42,80)/(38,80); `pain3` (42,80); `shock` (42,80); `spain` (42,80) |
| 36 | `fall1.gif` | `fall1.gif` | 122×70 | `death` (61,94); `fall` (61,94); `fall4` (61,40); `fall7` (46,36) |
| 37 | `fallx.gif` | ⚠ `fallx.GIF` | 76×99 | `fall4` (44,54) |
| 38 | `pain1.gif` | `pain1.gif` | 74×90 | `fall7` (42,80); `pain` (42,80)/(38,80); `pain10` (42,80); `pain3` (42,80) |
| 39 | `fallr.GIF` | `fallr.GIF` | 85×71 | `fall7` (43,27) |
| 40 | `fallx.GIF` | `fallx.GIF` | 76×99 | `fall7` (40,54) |
| 41 | `fall004.gif` | `fall004.gif` | 114×68 | `rise` (58,56) |
| 42 | `fallx1.gif` | ⚠ `fallx1.GIF` | 122×70 | `sdie` (48,36) |

受傷群另重用 C 的 `jump1.gif`、`jump2.gif`、`jump3.gif`，所以本節只新增 13 個引用。注意 #37 與 #40 在 case-sensitive 清單是兩個引用，但目前都解析到同一個 76×99 的 `fallx.GIF`。

## 12 格概念分鏡的優先對應

格號採「由左到右、由上到下」：S01～S04 是第一列，S05～S08 是第二列，S09～S12 是第三列。這是交給 pixel artist 的第一輪意圖對照，不代表可以把同一姿勢複製成多張正式 GIF。

| 格號 | 畫面意圖 | 第一個可落地的 P0 對應 | 還需要補的關鍵內容 |
|---|---|---|---|
| S01 | 正面待機 | `idle00.gif` | 依 128×112、Offset (59,97) 重畫並校正腳底 |
| S02 | 拳架／等待姿 | `idle001.gif`（`waiting` key pose） | 選角展示 Offset 與戰鬥 Offset 不同；勿直接套用 (141,80) 到戰鬥 |
| S03 | 步行 A | `walk01.gif` | 需要以 8-frame cycle 實測接地，不可只做位置平移 |
| S04 | 步行 B | `walk02.gif` | 同上 |
| S05 | 步行 C | `walk03.gif` | 同上 |
| S06 | 步行 D | `walk04.gif` | 尚缺 `walk05.gif`～`walk08.gif` 四個交替腿姿 |
| S07 | 直拳命中 | `punch002.gif`（`attack1` hit） | 尚缺 `punch001.gif` 的預備／收招 |
| S08 | 重拳伸展 | `punch007.gif`（`attack3` hit） | `attack2`／`attack3` 仍缺五張不同 timing pose |
| S09 | 雙臂防禦 | `block2.gif` | `block1.gif`、`block0.gif` 必須畫成解除／回待機過渡，不可三張完全相同 |
| S10 | Rocket Punch 發射 | `spec003.gif`（暫作 `slide` 攻擊相） | `spec001.gif`、`spec002.gif` 要補蓄力與前衝；若拳頭脫離機體，還要另建 projectile entity，單換 P0 GIF 不會自動產生飛拳 |
| S11 | 中彈後仰 | `pain1.gif` | `pain2.gif` 要有可區分的另一受擊方向／強度 |
| S12 | 仰倒在地 | `fall3.gif` | 還缺騰空、橫倒、落地、翻身與起身的完整序列 |

### 缺幀盤點

若每格只算一個直接對應，12 格最多只提供 12 個 key pose，P0 仍缺至少 30 個概念姿勢：

- 步行：`walk05.gif`～`walk08.gif`（4）。
- 拳擊：`punch001.gif`, `punch003.gif`～`punch006.gif`（5）。
- 防禦：`block0.gif`, `block1.gif`（2）。
- 前衝／Rocket Punch 前置：`spec001.gif`, `spec002.gif`（2）。
- 跳躍／著地：`jump2.gif`, `jump3.gif`, `jk001.gif`, `jump1.gif`, `jump02.gif`, `jk002.gif`（6，現有分鏡完全沒有跳躍姿勢）。
- 受傷／倒地／死亡其餘：`fallf1.gif`, `fallx2.gif`, `fall2.gif`, `fallx3.gif`, `pain2.gif`, `fall1.gif`, `fallx.gif`, `fallr.GIF`, `fallx.GIF`, `fall004.gif`, `fallx1.gif`（11）。

而且現有 12 格本身仍是大尺寸 RGB PNG 概念圖，所以 production-ready 數量仍是 **0/42**。每張都還要切格、清線、縮放／重畫到上表 canvas、對齊 Offset、轉成 indexed GIF，並驗證 palette index 0 是專案透明色 `#FC00FF`。

## 建議實作順序

1. 先完成 `idle00.gif`、`walk01.gif`～`walk08.gif`，在引擎內確認比例、腳底與移動時不抖動。
2. 再完成 `punch001.gif`～`punch007.gif`，以既有 `attack` 框實測拳頭與命中框是否重疊。
3. 補 `block0/1/2` 與 `spec001/2/3`；Rocket Punch 若要真的飛出，另開 entity／script 工作，不混在純換圖驗收。
4. 畫完整 jump 與 fall/rise 序列；倒地圖不可只旋轉站姿，Offset 和橫向 canvas 都不同。
5. 最後處理 `waiting` 展示位置，避免為了選角畫面去破壞遊戲內戰鬥對齊。

完成每批後，至少驗證：exact-case 路徑、canvas 尺寸、indexed GIF、palette index 0、Offset 接地、BBox/attack 對位，以及 Linux／Windows／macOS 三平台資源載入。
