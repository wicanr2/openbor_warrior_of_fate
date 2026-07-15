# Stage 01 機器人大戰替換 Manifest

本文件整理第一關組合 `data/levels/NewWof/1/01.txt`、`02.txt` 與 `2.txt` 實際會載入的圖層、場景物件、敵人、Boss、道具與 FX，作為「古代戰場 × 機器人」vertical slice 的製作清單。

> 路徑基準：下表的 `data/...` 都相對於 `workplace/extracted/`。尺寸直接讀取現有 GIF header；不含縮放推算。

## 實作邊界與優先級

| 優先級 | 意義 | 本輪交付界線 |
| --- | --- | --- |
| P0 | M1 可玩切片必須完成 | `01.txt` 森林開場長圖、`bing` 一種機械雜兵、`baoxiang` 一種機械補給箱與其破壞幀 |
| P1 | 完整第一關必須完成 | `02.txt`／`2.txt` 河谷基地長圖、其餘主力敵兵、Lidian 與 Xiahorse Boss、戰術地圖過場 |
| P2 | 世界觀統一與 polish | NPC、掉落道具全套、對話框／頭像、陽光與提示 FX、palette variant |

M1 的「可玩切片」不等於整個 Stage 01 完成。若只驗證畫風與流程，建議先讓 `01.txt` 的第一段可玩；但長圖仍要保留完整畫布尺寸，未重畫區可暫時沿用原圖，不能裁短。

## Level 結構

| Level TXT | 場景功能 | 主要範圍 | 替換策略 |
| --- | --- | --- | --- |
| `data/levels/NewWof/1/01.txt` | 森林／村落開場、平民、伏擊與 Lidian Boss | 主圖寬 2429–2600px | M1 主切片；保留森林與古道輪廓，加入殘骸、電纜、機械補給與敵軍感測器 |
| `data/levels/NewWof/1/02.txt` | 河谷／橋面延伸、對話、補給、Xiahorse Boss | 主圖寬 3000–3135px | P1 改為古代山谷中的裝甲基地入口；保留河道、橋與高低差 |
| `data/levels/NewWof/1/2.txt` | 與 `02.txt` 共用美術的短 Boss／替代配置 | 同 `02.txt` | 不另畫一套；共用 02 圖層。此檔把一處 `wall` 改為 `hole`，必須讓同一張圖在兩種配置下都看得懂 |

## 背景層與前景層

### `01.txt`：森林開場

| TXT 宣告 | TXT 引用 | 實際檔案大小寫 | 尺寸 | 用途 | 優先級 | 古代戰場 × 機器人方案 |
| --- | --- | --- | ---: | --- | --- | --- |
| `background` | `data/bgs/01/S2.gif` | `data/bgs/01/S2.gif` | 2600×276 | 最後方天空、遠景與不隨角色遮擋的底色 | P0 | 保留山林剪影與暖色天光；遠處加入半埋式格納庫、墜落艦體與烽火台天線，細節壓低對比，避免搶角色 |
| `panel` | `data/bgs/01/panel.gif` | `data/bgs/01/panel.gif` | 2429×276 | 主要可走地面、道路與中景建物 | P0 | 古道／泥地混入裝甲板、履帶痕、埋地電纜與維修標線；牆、橋面及角色腳底高度不變 |
| `fglayer` ×2 | `data/bgs/01/f.gif` | `data/bgs/01/f.GIF` | 2429×272 | 近景遮擋層；兩層 x=0 重疊，`-220`／`-20` 是 draw-order Z，不是 x offset | P0 | 竹林、樹幹與草叢保留，混入斷裂機械臂、管線、補給布幔；透明區與遮擋輪廓必須逐段驗證 |
| `fglayer` | `data/bgs/01/sunshine1.gif` | `data/bgs/01/sunshine1.gif` | 480×272 | 半透明陽光／氣氛疊層，帶 parallax 參數 | P2 | 改成薄霧中的掃描光、能量干擾或夕陽穿林；先沿用也不阻擋玩法驗證 |

注意：`01.txt` 以小寫 `f.gif` 引用實際大寫副檔名 `f.GIF`。Windows/macOS 的常見檔案系統可能容忍，Linux unpacked tree 不應依賴此行為；正式 overlay 應統一路徑大小寫並由 validator 檢查。

第一版 private engineering overlay 已完成上述三層、`sunshine1.gif` 原創掃描光、9 個 level TXT exact-case overlay 與機械補給箱 3/3；公開總覽、viewport／wall manifest、重建指令與 Docker 證據見[Stage01 場景與機械補給箱 vertical slice](../docs/STAGE01_ENVIRONMENT_VERTICAL_SLICE.md)。

### `02.txt` 與 `2.txt`：河谷基地／Boss 段

| TXT 宣告 | TXT 引用 | 實際檔案大小寫 | 尺寸 | 用途 | 優先級 | 古代戰場 × 機器人方案 |
| --- | --- | --- | ---: | --- | --- | --- |
| `background` | `data/bgs/02/bp.gif` | `data/bgs/02/bp.GIF` | 3123×276 | 最後方山谷、水面與基地遠景 | P1 | 山崖內嵌裝甲洞口、雷達塔、輸能管與吊橋機構；保留水線及崖壁缺口 |
| `panel` | `data/bgs/02/p.gif` | `data/bgs/02/p.gif` | 3000×276 | 主要行走面與中景 | P1 | 石橋／棧道上加鋼梁、鉚釘板、維修軌與破損線纜；不移動地面透視線 |
| `frontpanel` | `data/bgs/02/f2.gif` | `data/bgs/02/f2.GIF` | 3100×276 | 最前方固定遮擋長圖 | P1 | 改成橋欄、近景管線、破損機甲與基地護欄；不能遮住戰鬥區太久 |
| `fglayer` | `data/bgs/02/f1.gif` | `data/bgs/02/f1.GIF` | 3135×276 | 近景／特效疊層 | P1 | 竹枝、岩塊混搭電纜、蒸汽排放口與警示燈；維持原透明區和視差參數 |

這四張圖同時服務 `02.txt` 和 `2.txt`，不可針對其中一檔畫死洞口或牆面。建議把 `wall`／`hole` 共用位置畫成「斷橋＋下方深水／維修溝」，有碰撞時像護欄區、啟用洞時也能合理落下。

## 過場、遮罩與對話 UI

| 觸發模型 | 模型定義 | 圖像檔 | 尺寸 | 用途 | 優先級 | 替換方案 |
| --- | --- | --- | ---: | --- | --- | --- |
| `map1` | `data/bgs/01/map1.txt` | `data/bgs/01/map.gif`、`map0.GIF`、`map1.GIF` | 各 384×224 | `01.txt` 開場戰術地圖／卷軸過場 | P1 | 改成古地圖上疊加全息路線、紅色敵軍感測點與機體出擊箭頭；維持三幀明滅節奏 |
| `map2` | `data/bgs/02/map2.txt` | `data/bgs/02/map0.GIF`、`map1.GIF` | 各 384×224 | `02.txt` 的戰術地圖過場 | P1 | 延續同一套古卷軸 × 戰術 HUD 視覺 |
| `black` | `data/chars/misc/black.txt` | `data/chars/misc/black1.GIF` | 490×276 | 配合 map 過場的全畫面遮罩 | P2 | 純功能遮罩可沿用；若重畫，不能露出非黑像素或改變畫布 |
| `story` alias `zhaoxiong` | `data/chars/misc/story/story.txt` | `story_bk.gif`、`story_bk1.GIF`、`skip.gif` | 474×70、474×70、64×14 | `02.txt` x≈580 的對話框、頭像載入器與跳過提示 | P2 | 框體改機體通訊 HUD；對話仍由 `data/story/diag/zhaoxiong.txt` 驅動，人物頭像由 `data/story/pro/<name>.gif` 動態載入，現有頭像為 64×94 |
| `playermove1` | `data/chars/misc/playermove1.txt` | 無 Frame 圖檔 | — | `01.txt` 開場控制／位移用功能 entity | 不替圖 | 保留腳本功能，不製作 sprite |
| `bossshow` | `data/chars/misc/bossshow.txt` | `data/chars/misc/empty.GIF` | 1×1 | Boss 登場／HUD 控制用隱形 entity | 不替圖 | 必須保持不可見，不要誤畫成世界物件 |

## 場景幾何：不可只看圖換圖

| Level | 幾何宣告 | 美術必須對齊的視覺語意 |
| --- | --- | --- |
| `01.txt` | `wall` 起點約 x=1090、1210、1315、1766 | 懸崖、橋欄、台階或大型殘骸必須落在原碰撞位置；不能讓角色看似可走卻撞牆 |
| `02.txt` | `wall` x=-180、385、-70、487、1235 | 河岸、護欄、基地牆與高台需吻合；其中 x=-70 區是實牆 |
| `2.txt` | 同一組圖，但 x=-70 改為 `hole`，其餘牆相近 | 共用美術必須同時能解讀為危險斷橋／深溝；不要在洞上畫完整實心道路 |

本輪只換圖，不改 `wall`、`hole`、`Coords`、`Blockade`、`Offset` 或 BBox。若美術需求迫使地形移動，另開 gameplay change，不併入純替圖 commit。

## 可破壞物與補給容器

| Level 使用 | 模型定義 | 實際 Frame 圖檔與尺寸 | 用途 | 優先級 | 替換方案 |
| --- | --- | --- | --- | --- | --- |
| `baoxiang`：01×3 | `data/chars/misc/box/1/baoxiang.txt` | `baoxiang.gif` 66×45；`1.GIF`、`2.GIF` 各 141×114 | 寶箱，含 idle 與兩張破壞幀 | P0 | M1 主補給箱：木製軍箱＋機械鎖／能源燈；破壞幀改成飛散鋼板、纜線與火花，保留原 Offset/BBox |
| `baoxiang2`：01×1 | `data/chars/misc/box/0/baoxiang2.txt` | `1.gif`、`2.GIF` 各 50×41 | Boss 前的小型補給箱 | P1 | 輕型彈藥匣或維修零件箱 |
| `box`：02×2 | `data/chars/misc/box/2/box.txt` | `0.gif` 88×79；`1.gif`–`4.gif` 各 127×114 | 大木箱與四張破壞幀 | P1 | 裝甲運輸箱；四幀做完整爆裂／冒煙節奏，可承擔 M1「爆炸 FX」的第一版驗證 |
| `mutong`：02×7 | `data/chars/misc/box/3/mutong.txt` | `1.gif` 62×69；`2.gif` 137×127 | 木桶與破壞幀 | P1 | 燃料桶／冷卻液桶；破壞後用藍白冷卻液或橘色火花，避免全都做成同一種紅油桶 |
| `jiutan`：01×2、02×1 | `data/chars/misc/box/4/jiutan.txt` | `jiutan.gif` 53×51；`1.GIF` 72×64；`2.GIF` 105×81 | 酒罈與兩張破壞幀 | P1 | 小型能量罐／備用反應爐罐；保留低矮輪廓，避免碰撞看起來過大 |

替換時每個 idle 與 fall/death frame 都要一起做；只換 idle 會在打破瞬間閃回三國原圖。

## 敵人與 Boss

下表的「Frame 數」是模型 TXT 中去重並把 `\` 正規化為 `/` 後的動畫圖檔數；尺寸範圍不含 icon／alternate palette。這是工作量指標，實作時仍以模型 TXT 的逐行 Frame 路徑、大小寫、Offset、BBox 與 attack box 為準。

| Entity | 01 / 02 / 2 出現次數 | 模型定義 | 動畫 Frame 數與畫布範圍 | 用途 | 優先級 | 機械化方向 |
| --- | ---: | --- | --- | --- | --- | --- |
| `bing` | 30 / 27 / 0 | `data/chars/army/1/bing.txt`＋`1/bingxs.txt` | 31 個直接動畫；完整包 42 個實體 GIF（含 icon、6 Map、4 debris）；81×91～154×106，另有 24×36／150×120／1×1 | 基礎近戰兵 | P0 | M1 唯一完整雜兵：藍灰量產巡邏機／無人甲兵，長槍或電棍；第一版 42-file engineering coverage 見藍盔巡邏機文件，production 仍須逐格重畫 |
| `cap2` | 14 / 13 / 0 | `data/chars/army/2/cap2.txt` | 35；48×44～154×150 | 隊長型近戰兵 | P1 | 加厚肩甲與指揮天線，沿用近戰骨架但提高輪廓辨識 |
| `cap` | 7 / 7 / 0 | `data/chars/army/3/cap.txt` | 37；57×48～165×157 | 進階隊長兵 | P1 | 盾型重裝機；不同 Map 改為軍團識別色，不只 hue shift |
| `feifei` | 4 / 4 / 0 | `data/chars/army/4/feifei.txt` | 51；62×43～174×119 | 快速／特殊近戰兵 | P1 | 輕型飛躍機或獸型無人機，保留高速、低重心剪影 |
| `shooter` | 5 / 12 / 0 | `data/chars/army/6/shooter.txt` | 30；65×32～159×131 | 遠程兵 | P1 | 弓手改光束步槍／弩炮型機兵；投射物視覺需一起換，不能只換本體 |
| `ybing` | 2 / 5 / 0 | `data/chars/army/7/ybing.txt` | 36；65×32～178×131 | 長槍／武器兵 | P1 | 長柄電矛機兵；保持長武器 attack box 對位 |
| `bigman` | 0 / 5 / 0 | `data/chars/army/10/bigman.txt` | 43；50×38～152×150 | 重型雜兵 | P1 | 工程／攻城機，寬肩、液壓臂與慢速重擊 |
| `lidian` | 1 / 0 / 0 | `data/chars/boss/lidian/lidian.txt`＋`li.txt`＋私有碎片 model | 69；33×29～480×272 | `01.txt` Boss | P0 engineering done／P1 art pending | 原創 `Crimson Marshal` 紅色重裝、青色核心與藍黑能量長槍；69 GIF＋6 TXT closure 已載入，仍需逐格 production redraw 與 gameplay review |
| `xiahorse` | 0 / 1 / 1 | `data/chars/boss/xiahoudun/xiahorse.txt` | 8；127×122～384×224 | `02.txt`／`2.txt` 騎乘 Boss | P1 | 馬匹改四足突擊載具／懸浮戰車，Boss 本體仍保持原座高與衝刺節奏；另有 480×272 Boss icon |

`feifei.txt` 與 `bigman.txt` 部分 Frame 使用 Windows 反斜線，而多個模型與實體 GIF 也有 `.gif`／`.GIF` 大小寫不一致。這不是「缺圖」，但它是 Linux unpacked build 的高風險點，overlay 產出時必須正規化並做 case-sensitive 驗證。

敵軍 family、原創藍盔頭像、美女 Boss 三人組、`xiahorse` 分離依賴與巨大 Boss 的兩種作法，另見[敵軍與 Boss 概念對位表](ENEMY_BOSS_CONCEPT_MAP.md)。

### 平民／非戰鬥 NPC

| Entity | 模型定義 | Frame 畫布 | 用途 | 優先級 | 建議 |
| --- | --- | ---: | --- | --- | --- |
| `man1`～`man4` | `data/chars/npc/men/man1.txt`～`man4.txt` | 共同素材，各 120×88；每模型 6 個動畫 Frame | `01.txt` 開場平民 | P2 | Hybrid 方案可保留古代服裝，加入通訊器、機械義肢或避難標誌，不必全部改機器人 |
| `woman1`～`woman3` | `data/chars/npc/women/woman1.txt`～`woman3.txt` | 共同素材，各 120×88；每模型 3 個動畫 Frame | `01.txt` 開場平民 | P2 | 與男性 NPC 共用同一避難民風格與色盤 |

## Stage 直接 FX 與氣氛物件

| Entity／圖層 | 原始檔 | 尺寸 | 用途 | 優先級 | 替換方案 |
| --- | --- | ---: | --- | --- | --- |
| `firew` | `data/chars/misc/bomb/firew.txt` → `b1.GIF`、`b2.GIF`、`b3.GIF` | 各 48×73 | 關卡直接 spawn 的三幀功能道具／火焰視覺；01×2、02×1、2×1 | P1 | 改成能量信標、火焰噴口或戰術補給光柱；先確認 `didhitscript data/scripts/get/fire.c` 的 gameplay 效果再命名 |
| 箱桶破壞幀 | 上節各容器 `fall` Frame | 50×41～141×127 | 場景中的主要破壞／碎片 FX | P0/P1 | M1 爆炸先綁在補給箱 fall 動畫驗證；保留原幀數、delay、offset，避免新粒子遮住 hit feedback |
| `sunshine1.gif` | `data/bgs/01/sunshine1.gif` | 480×272 | 全畫面氣氛 fglayer | P2 | 掃描光／塵霧，不要做高亮頻閃；透明背景沿用 palette index 0 |

## 掉落道具與武器

這些圖不直接寫在 level TXT 的 `Frame` 行，而是由容器或敵人的 `Item` 欄位載入。若畫面要完全機械化，不能漏掉它們。

| Item | 模型定義 | 世界圖尺寸 | 目前語意 | 替換建議 | 優先級 |
| --- | --- | ---: | --- | --- | --- |
| `book` | `data/chars/misc/item/book.txt` | `book.gif`、`book1.gif`：38×37 | 分數道具 | 戰術資料片／加密卷軸 | P2 |
| `book1` | `data/chars/misc/item/book1.txt` | `book01.gif`、`book02.gif`：51×28 | 分數道具 | 機密模組／作戰晶片 | P2 |
| `gold` | `data/chars/misc/item/gold.txt` | `gold.gif`、`gold1.gif`：51×33 | 高分金飾 | 稀有合金 | P2 |
| `gold1` | `data/chars/misc/item/gold1.txt` | `jinbi.gif`、`jinbi1.gif`：51×36 | 金幣 | 能源幣／零件 | P2 |
| `gold2` | `data/chars/misc/item/gold2.txt` | `jinqi.gif`、`jinqi1.gif`：52×38 | 高分金器 | 高密度能源核心 | P2 |
| `baozi` | `data/chars/misc/item/baozi.txt` | `baozi2.gif`、`baozi02.GIF`：57×30 | 回復食物 | 維修膠囊；若保留包子可作 hybrid 彩蛋 | P2 |
| `jitui` | `data/chars/misc/item/jitui.txt` | `jitui.gif`、`jitui1.gif`：57×32 | 回復食物 | 小型裝甲修復包 | P2 |
| `jituibig` | `data/chars/misc/item/jituibig.txt` | `jituibig.gif`、`jituibig1.gif`：51×28 | 大回復食物 | 大型維修電池 | P2 |
| `fish` | `data/chars/misc/item/fish.txt` | `fish.gif`、`fish1.gif`：53×27 | 回復食物 | 冷卻液匣或保留河谷魚作世界觀反差 | P2 |
| `jianw` | `data/chars/misc/w3/jianw.txt` | `jian.gif`：94×16 | 劍武器 | 光束軍刀／高周波劍 | P2 |
| `chuiw` | `data/chars/misc/w4/chuiw.txt` | `chui.GIF`：68×22 | 錘武器 | 工程衝擊鎚 | P2 |
| `daggerw` | `data/chars/misc/knife/daggerw.txt` | `knife1.GIF`：36×10 | 飛刀／短刃 | 小型導引刃／機械苦無 | P2 |
| `leiw` | `data/chars/misc/grenade/leiw.txt` | `11.GIF`：38×32 | 雷／投擲物 | EMP 手雷 | P2 |
| `fdingchuiw` | `data/chars/misc/w13/fdingchuiw.txt` | `0.GIF`：51×22 | 特殊錘 | 電磁脈衝鎚 | P2 |
| `axew` | `data/chars/misc/w7/axew.txt` | `axe.GIF`：68×24 | 斧武器 | 機械戰斧 | P2 |

道具的小 HUD icon 仍由 `data/chars/misc/item/icon1.GIF`（16×16）或 `icon2.GIF`（16×11）提供；改世界圖後也要檢查 HUD icon 是否仍合理。

## 建議製作順序

1. 複製 `01.txt` 所需長圖到 overlay，保持尺寸與大小寫，先做低細節 color block；不要直接覆寫 `workplace/extracted`。
2. 先完成 `panel.gif` 的地面／牆視覺，再畫 `S2.gif` 遠景，最後做 `f.GIF` 遮擋層；每張都在 480×276 視窗逐段巡覽。
3. 用 `bing` 完成一種機械雜兵，只替一個 Map／palette，驗證角色相對場景比例。
4. 完成 `baoxiang` idle＋2 張 fall，將破壞幀當 M1 爆裂 FX 驗證。
5. 在 x=1090、1210、1315、1766 一帶核對牆與美術；再跑完整 `01.txt` wave／Blockade 流程。
6. 畫 `02` 四張長圖，先處理 `02.txt`／`2.txt` 共用的 wall/hole 視覺，再處理 Xiahorse Boss。
7. 最後統一 map 過場、NPC、故事頭像、掉落物與所有 alternate palette。

## 驗收清單

- [ ] 所有輸出維持原 GIF 畫布尺寸，indexed palette ≤256 色。
- [ ] 透明區使用 palette index 0；本專案角色素材的既有 index 0 實值為 `#FC00FF`，不應只靠 GIF transparency flag。
- [ ] Level TXT 引用與實際檔名在 Linux 上逐字大小寫一致，且反斜線已正規化。
- [ ] 長圖寬度、地平線、道路邊緣、wall/hole 與前景遮擋位置不變。
- [ ] `f.GIF`、`f1.GIF`、`f2.GIF` 透明區沒有整片洋紅殘邊或不透明矩形。
- [ ] `02.txt` 和 `2.txt` 共用圖在 wall 與 hole 兩種配置下都不造成視覺誤導。
- [ ] 容器 idle 與全部 fall/death 幀一起換完，不閃回原三國素材。
- [ ] `bing` 的腳底、BBox、attack box、受傷與倒地幀對齊；至少驗證一種 Map palette。
- [ ] 480×276 視窗從頭走到尾，確認近景不長時間遮住玩家或敵人。
- [ ] Linux、Windows、macOS unpacked tree 均完成 Stage 01 smoke test；之後才打包 PAK。
