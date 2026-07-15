# Robot Warriors of Fate — Sprite & Tileset Replacement Plan

## 目標

以目前 OpenBOR《吞食天地 II》模組為玩法骨架，將五名玩家、敵人、場景物件、UI 與主要關卡逐步轉成 concept 所示的「古中國場景＋超級機器人」混合世界。

第一版保留原關卡幾何、敵人波次、招式時序與雙人玩法，先完成可玩的視覺替換；需要改碰撞、招式或玩家數的工作另立階段。

## Concept 鎖定的角色映射

| 原 slot | 機體 | 動作轉譯 |
| --- | --- | --- |
| 關羽 `guanyu` | 蓋特機器人 | 關刀改長柄戰斧 |
| 張飛 `zhangfei` | 無敵鐵金剛 | 重拳、摔技、Rocket Punch、Breast Fire |
| 趙雲 `zhaoyun` | EVA 初號機 | 長槍、高速突進、Progressive Knife |
| 黃忠 `huangzhong` | RX-78-2 | 弓箭模型改 Beam Rifle、飛彈與命中特效 |
| 魏延 `weiyan` | 機械哥吉拉 | 刀術轉爪、尾、突進與飛彈 |

這個映射由 concept lineup 與 `models.txt` 載入順序共同支持。它和專案最早提到的「超電磁 V」陣容不一致；正式量產前需將上表視為 roster freeze。

## Concept 的定位

`robot_wof_concept` 的五張 JPEG 只作 moodboard／design reference：它們沒有透明層、逐幀動畫、固定比例或一致像素規格，且部分帶直播浮水印與商標。不能直接裁圖作 production sprite。

已產生的 `research/mazinger/mazinger_p0_storyboard_v1.png` 也是動作方向試作，需人工像素重畫與 OpenBOR 對位後才能使用。

## 技術硬規格

### Sprite

- 保留原 GIF 畫布與檔名大小寫。
- 角色腳底對準原 `Offset`；純替圖不改 `BBox`、`attack`、`Delay`。
- 若增加左／上 padding，`Offset`、`BBox` 與所有攻擊框同步平移。
- 輸出 indexed GIF，不依賴 alpha／GIF transparency flag。
- 透明區必須是 palette index 0；現有角色素材 index 0 實值為 `#FC00FF`。
- 每角色建立 master palette，重做 alternate palette／map／red／block 素材。
- OpenBOR 通常水平鏡射左向；盾、槍、單側武器會換手，若不接受需改模型邏輯。

### Stage art

本模組不是傳統 tile atlas，而是 `background`、`panel`、`frontpanel`、`fglayer` 長條 GIF 疊層。第一版必須維持：

- 畫布尺寸、長圖寬度、地平線和可走區。
- 牆、橋、洞、水域的視覺位置，以對齊 level TXT 的 `wall`／`hole`。
- 前景遮擋位置與水火動畫的 frame 數、offset、錨點。
- 480×272 native viewing size、indexed GIF、palette index 0。

改道路高度、洞／牆位置、長圖寬度或大型遮擋物位置時，必須同步改 level geometry 與 spawn 座標，不能當純換皮。

## 實際工作量

### 玩家角色

| 階段 | 新增 GIF | 內容 |
| --- | ---: | --- |
| P0 | 229 | 移動、普攻、跳躍、受傷、倒地、死亡 |
| P1 | 136 | 抓投與必殺技 |
| P2 | 33 | follow 連段、登場、選角 |
| 主模型合計 | 398 | 五名角色 |

每人的 16 個 `weapons` 變體並非全是馬匹：slot 1 是騎乘，2–14 是拾取武器狀態，15／16 是水中狀態。完整相容會再增加 586 張分鏡，主模型加變體約 984 張。

### 場景

目前 active 主視覺可濃縮成四個重用工作包：

| 工作包 | 主要長圖 | 建議主題 |
| --- | --- | --- |
| Stage 01 | 2429–2600×276 | 森林伏擊＋殘骸、電纜、補給箱 |
| Stage 02 | 3000–3135×276 | 河谷秘密基地／裝甲洞口 |
| Stage 03A | 3378×276 | 燃燒中的古城機械要塞 |
| Stage 03B | 1026×276 | 敵方格納庫／反應爐 Boss arena |

另有 PK 現存段、77 張 `bgs` GIF、617 張 `scenes` GIF。Logo 動畫單獨有 442 格，劇情圖 154 張，必須放到玩法 vertical slice 之後。

## 執行階段

### M0 — 規格與自動檢查

- 凍結角色映射、用途／授權、2P／4P、騎乘與場景方向。
- 建立 asset manifest：path、case、尺寸、palette index 0、用途、狀態。
- 修正既有文件透明色錯誤，以及 weapons 變體分類錯誤。
- 建立三平台 case-sensitive 引用與缺檔檢查。

### M1 — 無敵鐵金剛 vertical slice

- 張飛 slot 的 42 張 P0 sprite。
- 35×54 select icon 與 HUD profile。
- 一套 Rocket Punch／Breast Fire 視覺語彙。
- Stage 01 一個可玩的森林段落。
- 一種機械近戰雜兵、一個補給箱、一個爆炸 FX。
- Linux／Windows／macOS smoke test。

進度：Mazinger P0、五人選角合成圖、張飛 HUD／profile、藍盔 `bing`／`bingxs`、Stage01 三張長圖、掃描光、機械補給箱，以及 `lidian` 紅槍 Boss 69 GIF＋6 TXT 已達 private engineering coverage，並通過 Linux Docker model-load gate；M1 coverage 維持 89/89。

關羽 P0 另完成 65 張主模型 GIF、2 張 profiles、33 張 shared FX palette normalization 與 `guanyu.txt`／`models.txt`，合併後 private overlay 實測為 284 files；六份指定 TXT strict 全 PASS，Docker v7533 到 `Loading models... Done!`。bounded smoke exit 124 是 timeout 預期值，TERM 後 double-free 是既知 teardown。這批仍由 16 個 key pose 重用，且 `g1`–`g16`、gore remap、`playerdie.wav` 與逐格補間 deferred，因此只能標為 P0 engineering coverage，不能標記完整玩家角色或 production-ready。詳見 [`GUANYU_VERTICAL_SLICE.md`](GUANYU_VERTICAL_SLICE.md)。

趙雲 P0 batch 為 147 files（82 主 GIF＋2 profiles＋57 shared FX＋6 TXT/scripts）；合併後 overlay `data/` 實測 398 files（372 GIF＋26 other）。`zhaoyun.txt` 464 occurrences／82 paths strict PASS，主檔加 7 份輔助 TXT、共 8 份全 PASS，fresh rebuild 147／147 byte-identical，Docker 同樣到 `Loading models... Done!`。本輪含 5 個 `blood1`→`flashb` 局部 hitflash remap、1 個魏延 fall 誤引用改回趙雲 `fall2`、5 個 script include case 修正。`y1`–`y16`、cross-character audio QA、逐格補間、實戰 BBox／attack box 與 2P 仍 deferred，不能標記完整玩家角色。詳見 [`ZHAOYUN_VERTICAL_SLICE.md`](ZHAOYUN_VERTICAL_SLICE.md)。

驗收通過後鎖定角色高度、輪廓線、金屬色階、光源、palette 與 AI／人工修圖比例。

### M2 — 五角色 P0

- 關羽已完成可載入的 P0 engineering overlay；仍須逐格補間、gore／audio QA 與 `g1`–`g16` closure，不能從「剩餘角色」中完全劃除。
- 趙雲已完成可載入且 deterministic 的 P0 engineering overlay；仍須逐格補間、cross-character audio QA、實戰對位與 `y1`–`y16` closure，不能從 production 待辦完全劃除。
- 完成黃忠、魏延兩名角色的 P0，並把關羽、張飛、趙雲 engineering skeleton 清成 production animation；五人 P0 目標量仍為229張。
- RX-78 同步處理黃忠的 8 個投射物模型／22 張有效 projectile FX。
- 補齊五組 icon/profile 與 2P alternate palette。

### M3 — Stage 01–03B

- Stage 01 森林完整換皮與戰術地圖。
- Stage 02 水路／基地，逐一驗證 `wall`／`hole`。
- Stage 03A 火、水、警報與全螢幕 FX。
- Stage 03B Boss arena 全景動畫。
- 木桶、酒罈、寶箱、雞腿統一換成油桶、零件箱、電池與裝甲補給。

### M4 — 玩家完整動作與敵軍

- P1 136 張、P2 33 張。
- Army 的近戰、長槍、弓手、隊長機械 faction。
- 一般巡邏兵使用原創藍盔通訊頭像；不得直接裁切島田兵參考頁。
- Boss、NPC、敵方 icon/profile；Boss 槽位與巨大戰分級見 [`ENEMY_BOSS_CONCEPT_MAP.md`](../research/ENEMY_BOSS_CONCEPT_MAP.md)。
- Stage03B 的 `meimei`／`meiya`／`meiling` 可採美女型王牌三人組；Stage03A `xuchu` 優先承接 Gunbuster 類巨大主角機的原創鏡像 Boss。

### M5 — 狀態變體與支線

- 決定騎乘改支援機／懸浮載具、保留馬匹或取消系統。
- 依決策處理拾取武器與水中 586 張變體。
- 完成 PK 現存段與難度重用關卡。

### M6 — 全域 UI／劇情／發行

- Select、title、loading、gameover、lifebar、complete、hiscore。
- 劇情、opening、ending 與 Logo 動畫重製／縮短方案。
- 三平台發行 PAK、license/source manifest、完整 regression test。

## Agent／人力分工

| 角色 | 適合工具／model | 責任 |
| --- | --- | --- |
| Lead technical agent | Codex/code model | manifest、轉檔、OpenBOR 定義、驗證器、三平台 QA |
| Concept agent | image generation model | moodboard、turnaround 草案、key pose、stage overpaint；不直接輸出最終 GIF |
| Character technical artist | 2D rig 或 low-poly 3D + 人工 pixel cleanup | 固定比例、骨架動畫、批量 render、腳底 anchor |
| Pixel artists（建議 3 人） | Aseprite／GraphicsGale 等 | silhouette、逐幀修圖、palette、hit pose、FX |
| Environment artist | 2D paint／3D blockout + pixel cleanup | 長條 layer、地面透視、接縫與 props |
| QA agent | script + OpenBOR debug build | path/case、palette、尺寸、BBox、三平台遊戲內驗收 |

目前三個分析 subagent 分別負責 sprite、tileset、concept audit；執行環境未提供逐 agent 指定不同 LLM 的介面，因此它們使用同一 agent 能力，視覺生成另由 image generation model 執行。

## 驗收閘門

- 靜態：所有 path/case 存在、尺寸吻合、indexed ≤256 色、index 0 正確。
- 動畫：腳底不漂、walk 不滑步、loop／fall／death 完整。
- 戰鬥：拳、斧、槍、尾、光束與 attack box 對齊。
- 場景：角色不站進牆／水／洞，前景不長時間遮住玩家。
- 模式：2P palette、三難度重用、Boss arena、拾武器／騎乘／水中按 scope 測試。
- 平台：Linux、Windows、macOS unpacked tree 與 PAK 都 smoke test。

## 公開總覽政策

Stage01 engineering composite、角色 storyboard 與其他總覽圖，只能定義為依 repo policy 保留的 **overview-only review image**。它們用來討論構圖、coverage 與交接，不是 runtime capture 或可拆用的 production sprite sheet；保留在 repo 也不能宣稱已完成權利清查、`legal-safe` 或 `public-safe`。

## 重大決策（開始量產前必答）

1. 成品是私人 fan prototype、公開非商業，還是商業發行？現有 concept 與角色涉及多家權利人的 IP，MIT 不涵蓋這些圖像。
2. 是否正式採用 concept 的 EVA＋機械哥吉拉陣容，取代早期的超電磁 V 設想？
3. 場景採推薦的「三國＋機械」hybrid，還是全部改成純科幻？後者需要重做 geometry／story art，工期大增。
4. 騎乘、拾武器、水中是否要求完整等價？
5. 維持目前 2P，還是做 concept 的 4P HUD？4P 不是純換圖。
6. 是否接受水平鏡射導致 RX-78 盾槍換手？

## 已知資料缺口

解包內容含 dead references：`pk/3/2.txt`～`8.txt`、`bgs/4a`～`9a`、`bgs/xd/pk.gif` 等不存在。第一階段只承諾四個現存主視覺段＋PK 現存段；量產前要確認原 PAK 是否完整或是否有另一版本。

## 粗估工期

純手工像素：主角色約 115–265 人日；完整狀態變體再增加約 110–290 人日。若以 rig／3D render 產生基礎幀再人工 pixel cleanup，可能降到約 40–60%，但必須先用 M1 驗證品質。

建議配置 3 名角色 pixel artist、1 名 technical artist／integrator、1 名環境 artist；main-only 約 2–4 個月，完整 parity 約 4–9 個月。
