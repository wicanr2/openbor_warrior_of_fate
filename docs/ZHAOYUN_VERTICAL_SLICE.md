# 趙雲紫色神經長槍機 P0 vertical slice

本批次把趙雲 `zhaoyun` slot 做成紫／綠生體機甲與長槍的 **private engineering prototype**。目標是驗證原畫布、Offset、Linux exact-case、indexed GIF、局部機械受擊 remap 與 OpenBOR v7533 model-load；它不是完整玩家角色，也不是逐格 production 動畫。

![趙雲 P0 engineering preview：HUD、idle、長槍突刺、旋槍與倒地](../research/previews/zhaoyun-p0-engineering-preview.png)

這張成果圖直接由 private overlay 的實際工程 GIF deterministic 合成，不是 runtime capture；它用來檢查 HUD、站高、槍長、special 特效與倒地輪廓。

![趙雲紫色神經長槍機 16 格 overview-only review image](../research/zhaoyun/zhaoyun-violet-synapse-lancer-storyboard-v1-keyed.png)

這張 16 格總覽依 repo policy 保留為 **overview-only review image**，只供輪廓、姿勢、槍尖與 coverage 審查。它不是可拆用的 production sprite sheet，也不能宣稱已完成權利清查、`legal-safe` 或 `public-safe`。

## 實測範圍

| Batch 類別 | Files | 說明 |
| --- | ---: | --- |
| 趙雲主模型 GIF | 82 | 80 張 key-pose 對位主動畫，加上 `icon.GIF` 與 identity-palette prototype `red.gif` |
| HUD profiles | 2 | `data/profiles/zhaoyun.GIF`、`zhaoyun_m.GIF` |
| Shared FX palette normalization | 57 | `blacky`、flash、dust、dust2 等共用 FX；正規化 palette index 0 |
| TXT／scripts | 6 | `zhaoyun.txt`、`blacky.txt`、`models.txt`、`WOFplayer.c`、`common/player.c`、`didhit/guanyu.c` |
| 本批次 | **147** | 82＋2＋57＋6 |
| 合併後 overlay `data/` | **398** | 372 GIF＋26 other files |

147 是本次 batch 的輸出集合；398 是與既有 overlay 合併後的 unique path 數。Shared FX 會覆蓋／重用既有路徑，不能把各 batch file count 直接相加推算 merged total。

82 張主模型 GIF 仍由 16 個 key pose 大量重用。相同姿勢套入不同原畫布，只能叫 engineering coverage，不代表 walk、攻擊、跳躍、受擊或死亡動畫已完成逐格補間。

## 分鏡與安全裁切

16 格語意依序為 portrait、spawn、idle、兩格 walk、guard、長槍蓄力、水平突刺、月牙終結、空中蓄力、下刺、旋轉 special、pain、fall、prone death、mechanical debris。

原始 1254×1254 草圖不是可直接四等分的 sprite sheet。08–16 有跨名義格線的前景；private pipeline 必須使用 manifest 的 independent safe crops 與 semantic pivots。frame15 的兩腿與兩腳均完整，跨左格線的是伸出的手，不是多腳或鄰格腳。

公開 overview 保留完整構圖，只把生成式漸層洋紅正規化為精確 `#FC00FF`；它不取代 private key-pose crops，也不能直接作 OpenBOR animation frames。

## 透明色與 UI 契約

- 所有透明角色／FX GIF 必須是 indexed GIF。
- palette **index 0** 必須精確為 `#FC00FF`，即 RGB `(252, 0, 255)`。
- 不可用近似洋紅、`#FF00FF`、alpha 或 GIF transparency flag 代替。
- `zhaoyun.GIF`／`zhaoyun_m.GIF` 是 opaque 35×54 HUD 圖；palette slot 0 仍為 `#FC00FF`，但 pixel data 不使用 index 0。

## 建立 private overlay

```bash
node scripts/slice-zhaoyun-storyboard.mjs \
  --source private_assets/robot_wof/zhaoyun/zhaoyun-violet-synapse-lancer-storyboard-v1.png \
  --output-dir private_assets/robot_wof/zhaoyun/keyposes \
  --contact-sheet research/zhaoyun/zhaoyun-violet-synapse-lancer-storyboard-v1-keyed.png \
  --manifest research/manifests/zhaoyun-violet-synapse-lancer-keyposes.json

node scripts/build-zhaoyun-p0-prototype.mjs \
  --source-dir private_assets/robot_wof/zhaoyun/keyposes \
  --selection-source private_assets/robot_wof/ui/five-robot-selection-screen-v1.png \
  --data-dir workplace/extracted/data \
  --output-dir workplace/robot_wof_vertical_slice/overlay

node scripts/build-zhaoyun-engineering-preview.mjs \
  --workspace /path/to/warriors_of_fate \
  --output research/previews/zhaoyun-p0-engineering-preview.png
```

不要把輸出寫回 `workplace/extracted/`。公開 GitHub 只保存文件、manifest、驗證方法與 repo policy 允許的 overview；production GIF 與私有輸入留在 private workspace。

## 局部相容性修正

本批次只修正趙雲閉包所需的引用，不做全域玩法重寫：

- `zhaoyun.txt` 的 5 個 `hitflash blood1` 局部改成 `hitflash flashb`，避免這五處受擊閃回人類血液語彙。
- 1 個錯指向 `data/chars/weiyan/fall2.gif` 的引用，改回趙雲自己的 `data/chars/zhaoyun/fall2.GIF`。
- 5 個 Linux script include case 修正：`WOFplayer.c` 3 個、`common/player.c` 1 個、`didhit/guanyu.c` 1 個。
- `models.txt` 與 `blacky.txt` 只做本輪載入所需的 exact-case 路徑正規化。

5 個局部 remap 不等於全專案 gore closure；其他角色、`y1`–`y16` 與共用模型仍需各自稽核。

## 實測驗證結果

| Gate | Result |
| --- | --- |
| Zhao Yun batch | 147 files：82 main GIF＋2 profiles＋57 shared FX＋6 TXT/scripts |
| Merged overlay data | 398 files：372 GIF＋26 other |
| Main model strict | `zhaoyun.txt` 464 occurrences／82 unique paths，全 PASS |
| Auxiliary strict | `blacky`／`flashb`／`flasha`／`dust`／`dust2`／`bflash`／`flashp` 共 7 份 TXT；加上主檔共 8 份，全 PASS |
| Deterministic rebuild | fresh output 比對 147／147 files byte-identical |
| Docker OpenBOR v7533 | 到 `Loading models... Done!` |
| Bounded smoke exit | `124`；到達載入閘門後 timeout，屬預期結果 |

timeout 送出 TERM 後，舊版引擎可能在 teardown 印出 double-free。必須先確認 TERM 前已有 `Loading models... Done!`，再把 TERM 後的訊息記為既知 teardown；這不等於 gameplay 完整 PASS，也不應把已通過的 model-load 誤判為載入失敗。

## 明確 deferred

以下不在趙雲 P0 完成範圍：

- `y1`–`y16`：騎乘、拾取武器、水中／特殊狀態、子模型、投射物與綁定 FX。
- cross-character audio QA：`zhaoyun/sp.wav`、`zhangfei/s2.wav`、`guanyu/yayaya.wav`、`guanyu/playerdie.wav` 等跨角色引用仍需逐一確認或機械化替換。
- 逐格補間：以 production frame 取代 16 pose reuse，完成 anticipation、contact、recovery、loop 與 silhouette cleanup。
- 實戰對位：BBox、attack box、長槍尖端、腳底滑步、抓投、fall/death、選角、HUD 與可見 gameplay。
- 2P：alternate palette、鏡像方向、雙人 HUD 與同屏可讀性。

因此正確狀態是「趙雲 P0 engineering overlay 已通過靜態、determinism 與 model-load gate」。在 deferred 全部關閉前，不得稱為「完整趙雲玩家角色」、「production-ready」或「已完成實戰驗收」。

## 藝術家下一步

1. 先鎖定 idle／walk 的站高、腳底、額角、肩甲、綠色節點與長槍長度。
2. 把 82 張原 canvas 的 pose reuse 改成真正逐格動畫，優先完成 walk 與 attack contact frames。
3. 每張攻擊幀同時核對槍尖、Offset、BBox 與 attack box；跳躍／倒地用 pelvis root 保持穩定。
4. 主模型通過 pixel-review 後，再做 `y1`–`y16`、跨角色音效與剩餘 gore closure。
5. 最後以可見 runner 驗證選角、完整攻擊鏈、受擊／死亡與 2P。
