# 美術協作與交付手冊

本專案會由多名藝術家共同完成玩家、敵人／Boss、背景、前景、場景物件、UI 與 FX。GitHub 是規格、工作拆分、總覽與驗收中心；可直接重用的單張原作素材及 production art 只透過團隊私有空間交換。

## 開始接一個角色前

1. 從 README 的角色分鏡總覽確認整體動作與原檔名。
2. 在 [`CHARACTER_SPRITE_INVENTORY.md`](../research/CHARACTER_SPRITE_INVENTORY.md) 找到角色的 P0／P1／P2 範圍。
3. 無敵鐵金剛先讀 [`MAZINGER_P0_FRAME_MAP.md`](../research/MAZINGER_P0_FRAME_MAP.md)：內含 42 個 case-sensitive 引用、canvas、Offset 與缺幀。
4. 關羽先讀 [`GUANYU_VERTICAL_SLICE.md`](GUANYU_VERTICAL_SLICE.md)：65 主 GIF 只是 16 key pose 的 engineering coverage；逐格補間、`g1`–`g16`、gore 與死亡音效仍未完成。
5. 向整合負責人取得私有的原 canvas 模板與目前 production overlay；不要從公開 GitHub 尋找單張原作 GIF。
6. 在工作看板登記負責人與狀態，避免兩人同時重畫同一批檔案。

## 每張圖的交付欄位

| 欄位 | 必填內容 |
| --- | --- |
| Source slot | 例如 `zhangfei` |
| Target design | 例如無敵鐵金剛，以及採用的 turnaround／palette 版本 |
| Exact path | 例如 `data/chars/zhangfei/walk01.gif`，含大小寫 |
| Animation | `idle`、`walk`、`attack1`、`fall` 等 |
| Canvas | 必須等於 manifest／原 GIF 尺寸 |
| Anchor | 腳底或接觸點對準原 `Offset` |
| Palette | indexed GIF；palette index 0 為 `#FC00FF` |
| Review state | `todo`、`draft`、`pixel-review`、`engine-review`、`accepted` |
| Reviewer | 至少一名非繪製者檢查 |

## 建議分工批次

不要以「整個角色」作為唯一工作單位；以下批次容易獨立審查：

- locomotion：idle、walk、run、turn。
- basic combat：attack1–3、block、slide。
- aerial：jump、jumpattack、land。
- damage：pain、fall、rise、death。
- specials：freespecial／follow／projectile 與 FX。
- UI：select icon、HUD profile、alternate palette。
- variants：騎乘、拾取武器、水中狀態；排在主模型驗收後。

### Enemy／Boss artist

- 依模型分成基本近戰兵、隊長、遠程兵、重型兵與 Boss，不要按關卡逐張重複畫。
- 先讀 [`ENEMY_BOSS_CONCEPT_MAP.md`](../research/ENEMY_BOSS_CONCEPT_MAP.md)：島田兵式藍盔只作原創巡邏兵頭像語彙，雜誌頁／截圖不得直接裁切使用。
- 每個敵人先完成一套 base palette，再補 Map／alternate palette。
- 必須把武器、投射物、受傷、倒地與 icon 一起列入；只換 idle／walk 會在戰鬥時閃回原圖。
- 第一個敵人批次是 `bing`：31 個動畫圖檔，詳細路徑、尺寸範圍與出場數見 [`STAGE01_REPLACEMENT_MANIFEST.md`](../research/STAGE01_REPLACEMENT_MANIFEST.md)。
- 藍盔巡邏機的 12 格 source、42-file engineering coverage、機械死亡與逐格 production 缺口見 [`BLUE_HELMET_GRUNT_VERTICAL_SLICE.md`](BLUE_HELMET_GRUNT_VERTICAL_SLICE.md)。
- Boss 以完整依賴包交付；`xiahorse` 低血量會分離成駕駛員與載具，三位美女 Boss 則可共用 rig、不可共用 silhouette／portrait。
- Boss 的每類必要分鏡、巨型機畫布遷移、投射物 closure 與三人同屏驗收，依 [`BOSS_PRODUCTION_PLAN.md`](BOSS_PRODUCTION_PLAN.md) 執行。
- 女性角色參考只取氣質、職能與色彩；三名戰鬥 Boss 必須 adult-coded、臉型／輪廓／服裝全新。Latune／Shine 只列 reserve NPC 或雙機駕駛方向。

### Environment／prop artist

- 背景不是 tile atlas，而是 `background`、`panel`、`frontpanel`、`fglayer` 長條 indexed GIF。
- 保留原畫布寬度、地平線、道路透視、wall／hole 與前景遮擋位置。
- 場景物件要連 idle、破壞／fall 幀與掉落物一起製作。
- Stage01 的精確圖層、尺寸、幾何與敵人清單以 [`STAGE01_REPLACEMENT_MANIFEST.md`](../research/STAGE01_REPLACEMENT_MANIFEST.md) 為準。

## 檔案交換方式

- 公開 GitHub：Markdown、JSON／CSV manifest、驗證器、允許公開的分鏡總覽 PNG。
- 私有共享空間：原作單張 GIF、角色參考圖、Aseprite／PSD、生成底稿、production GIF、測試 PAK。
- 本機 overlay：`workplace/robot_wof_vertical_slice/overlay/data/`。
- 不要把 production 圖檔直接混入 `workplace/extracted`；它是唯讀分析基準。

若團隊需要用 Git 管理 production art，請另建 private repository 或 private Git LFS storage；不要解除本公開 repo 的 `.gitignore`。

公開 repo 中的 Stage01 engineering composite 與角色 storyboard，統一定義為依 repo policy 保留的 **overview-only review image**。它們只供 coverage、構圖與交接審查，不是 runtime capture 或可拆用的 production sprite sheet；不得因檔案可公開瀏覽，就宣稱它已通過法律／散布權利審核或稱為 `legal-safe`／`public-safe`。

## Review 順序

1. 靜態：exact-case 路徑、canvas、indexed palette、index 0。
2. 輪廓：同角色高度、頭身、裝甲結構與光源一致。
3. 動畫：腳底不漂、walk 不滑步、loop 無跳格。
4. 戰鬥：拳腳／武器與既有 attack box 重疊。
5. 引擎：在 disposable merged data tree 進行 OpenBOR smoke test。
6. 只有通過 `engine-review` 的檔案才能標為 `accepted`。

## 第一個協作批次

張飛 → 無敵鐵金剛先拆成：

| Batch | 檔案 | 目的 |
| --- | --- | --- |
| MZ-P0-A | `idle00.gif`, `walk01.gif`–`walk08.gif` | 鎖定比例、腳底、palette 與 walk cycle |
| MZ-P0-B | `punch001.gif`–`punch007.gif` | 驗證 attack box 與命中姿勢 |
| MZ-P0-C | `block0/1/2`, `spec001/2/3` | 防禦與 Rocket Punch 視覺語彙 |
| MZ-P0-D | jump 系列 6 張 | 騰空、滯空與著地 |
| MZ-P0-E | pain／fall／rise／death 系列 | 完整受傷與倒地循環 |

MZ-P0-A 通過引擎驗收後，才讓其他藝術家依同一高度、輪廓線與 master palette 大量展開。

### 關羽 P0 清稿批次

目前 Guanyu private overlay 實測為 65 主 GIF＋2 profiles＋33 shared FX＋2 TXT，合併整包 284 files；strict 六份 TXT 全 PASS，Docker 到 `Loading models... Done!`。這只證明 engineering closure 可載入。藝術家應按下列批次取代 pose reuse：

| Batch | 範圍 | 交付重點 |
| --- | --- | --- |
| GY-P0-A | idle、walk1–8 | 固定站高、腳底、胸核、角形與八格 walk 補間 |
| GY-P0-B | `a1.GIF`–`a9.GIF`、block | 長柄月牙武器長度、刀尖、anticipation／contact／recovery 與 attack box |
| GY-P0-C | jump、jumpattack、rise | 空中 root、著地與 Offset，不得沿用單張 pose 當完成動畫 |
| GY-P0-D | pain、fall、death | 機械受擊／倒地語彙；同步規劃 gore remap 與 `playerdie.wav` |
| GY-P0-E | spec／super／grab | 補齊逐格特效與接觸姿勢；保留既有 timing 契約 |
| GY-VARIANTS | `g1`–`g16` | 騎乘、拾取武器、水中、子模型與投射物 closure；主模型清稿後才開始 |

`GY-P0-A`–`E`、gore／audio QA 與 `GY-VARIANTS` 未全部驗收前，不得把關羽標成完整玩家角色。

### Enemy／stage 同步批次

| Batch | 路徑／模型 | 交付內容 |
| --- | --- | --- |
| EN-BING-A | `data/chars/army/1/bing.txt` | 量產機械近戰兵完整主動畫、base palette、受傷與倒地 |
| BG-S01-A | `data/bgs/01/S2.gif` | 2600×276 遠景：山林＋殘骸／基地輪廓 |
| BG-S01-B | `data/bgs/01/panel.gif` | 2429×276 可走地面：古道＋裝甲板／電纜，對齊原 geometry |
| BG-S01-C | `data/bgs/01/f.GIF` | 2429×272 前景遮擋：竹林＋機械殘骸，保留透明區 |
| PROP-S01-A | `baoxiang.gif`, `1.GIF`, `2.GIF` | 機械補給箱 idle＋兩張破壞幀 |
| FX-S01-A | 箱體破壞與火花 | 保留原 frame count、Delay、Offset 的第一套爆裂語彙 |
| EN-BING-ICON | `data/chars/army/1/icon.GIF` | 24×36 原創藍盔巡邏兵通訊頭像；palette index 0 為 `#FC00FF` |
| BOSS-LIDIAN-A | `lidian.txt`＋`li.txt`＋分離模型 | 第一關 `Crimson Marshal` 紅槍指揮機；69 GIF＋6 TXT engineering closure 已完成，藝術家依 `LIDIAN_BOSS_VERTICAL_SLICE.md` 重畫 spawn／受傷／倒地／死亡、碎片與 Boss icon 全包 |

第一個 playable gate 是 MZ-P0-A＋EN-BING-A＋BG-S01-A/B/C＋PROP-S01-A；任何一條缺少都只能算角色或場景單項預覽，不能標示為 vertical slice 完成。
