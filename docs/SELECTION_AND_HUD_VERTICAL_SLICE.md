# 五人選角與無敵鐵金剛 HUD vertical slice

> **Roster 圖 v2 狀態：** 第一欄牛角武者／鋼彈式關羽已淘汰，並由 Getter v2 肖像、全身像、`icon.GIF` 與兩張 profile 同步替換。第六角 ν Gundam 的加入另列新里程碑，不能直接塞入這張五欄 raster 後宣稱完成。

第一批資產完成 M1 coverage 最後四個缺口：一張480×276五人選角合成圖，以及張飛 slot／無敵鐵金剛的35×54 model icon、HUD profile、mirror profile。關羽與趙雲 P0 隨後也從同一私有選角 master 各產生 model icon、profile 與 mirror profile；趙雲合併後 private overlay `data/` 為398 files。

![Getter v2 五人機器人 runtime 選角總覽](../research/ui/five-robot-selection-screen-v2-getter-overview.png)

## 選角 roster 與欄位順序

| Column | OpenBOR slot | 本專案方向 | 選角圖內容 |
| ---: | --- | --- | --- |
| 1 | `guanyu` | Getter v2 紅色合體機 | v2 已換：水平紅色側翼、雙綠胸窗、紅翼肩、銀白四肢與雙刃戰斧 |
| 2 | `zhangfei` | 無敵鐵金剛 | 上方頭肩肖像、下方黑紅胸甲／藍色前臂全身站姿 |
| 3 | `zhaoyun` | 紫綠生體機甲／EVA 型角色語彙 | 上方肖像、下方高瘦全身站姿 |
| 4 | `huangzhong` | 白藍紅軍用人形機／RX-78 型角色語彙 | 上方肖像、下方盾牌全身站姿 |
| 5 | `weiyan` | 銀色機械恐龍 | 上方頭部肖像、下方全身與尾部站姿 |

這些名稱是私有 fan-project 的角色方向與團隊搜尋詞；公開圖是新生成的完整選角審稿總覽，不是從原作 sprite 裁切。公開 repo 不提供可直接抽出的單人頭像或 35×54 production GIF。

## OpenBOR 檔案契約

| Output | Canvas | Source mapping | 用途 |
| --- | ---: | --- | --- |
| `data/bgs/select.gif` | 480×276 | 1536×1024 原創 roster 的中央 1536×883 crop，nearest-neighbor resize | 五人頭像與全身站姿的合成選角底圖 |
| `data/chars/zhangfei/icon.GIF` | 35×54 | 第二欄上方無敵鐵金剛肖像 crop | 張飛模型 icon |
| `data/profiles/zhangfei.GIF` | 35×54 | 同一 master portrait | `lifeBar.c` HUD profile |
| `data/profiles/zhangfei_m.GIF` | 35×54 | master portrait 水平鏡像 | HUD 後備／另一方向 profile |
| `data/chars/guanyu/icon.GIF` | 35×54 | 第一欄 Getter v2 肖像 crop | 關羽模型 icon；由 Guanyu v2 P0 builder 建立 |
| `data/profiles/guanyu.GIF` | 35×54 | 同一 Guanyu master portrait | 關羽 HUD profile |
| `data/profiles/guanyu_m.GIF` | 35×54 | Guanyu master portrait 水平鏡像 | 關羽 HUD 後備／另一方向 profile |
| `data/chars/zhaoyun/icon.GIF` | 35×54 | 第三欄紫綠長槍機肖像 crop | 趙雲模型 icon；由 Zhao Yun P0 builder 建立 |
| `data/profiles/zhaoyun.GIF` | 35×54 | 同一 Zhao Yun master portrait | 趙雲 HUD profile |
| `data/profiles/zhaoyun_m.GIF` | 35×54 | Zhao Yun master portrait 水平鏡像 | 趙雲 HUD 後備／另一方向 profile |

Builder 另產生 `data/chars/zhangfei/zhangfei.txt` overlay，把模型 icon 引用正規化為實體 physical case `icon.GIF`。其他 37 組張飛大小寫債務目前只在 disposable staging 建 alias；production model cleanup 尚未完成。

## Opaque UI 與 palette index 0

選角圖是黑底的完整 UI raster，不需要使用 index 0 像素來挖透明洞，但本專案仍要求所有 GIF palette slot 0 精確為 `#FC00FF`。

Builder 先限制為最多 255 個實際顏色，再找一個未使用 palette index 注入 `#FC00FF`，最後交換到 slot 0。結果：

- GIF 是 indexed palette。
- palette index 0 精確為 `#FC00FF`。
- opaque pixel data 不使用 index 0，所以黑色背景與彩色肖像不會出現洋紅洞。
- 不加入 GIF transparency extension。

## 建立 overlay

```bash
node scripts/build-five-robot-selection-p0-prototype.mjs \
  --source private_assets/robot_wof/ui/five-robot-selection-screen-v1.png \
  --data-dir workplace/extracted/data \
  --output-dir workplace/robot_wof_vertical_slice/overlay \
  --overview research/ui/five-robot-selection-screen-v1-overview.png
```

來源圖、輸出 mapping 與 SHA-256 見 [`five-robot-selection-p0.json`](../research/manifests/five-robot-selection-p0.json)。

Getter v2 第一欄使用 [`compose-guanyu-selection-v2.mjs`](../scripts/compose-guanyu-selection-v2.mjs) 在 1536×1024 master 上限制兩個可變矩形，再由 [`build-guanyu-selection-runtime-v2.mjs`](../scripts/build-guanyu-selection-runtime-v2.mjs) 沿用現有 256 色 runtime palette，只更新 `x=0..102`。不可再用整張重新 palettize 的方式改版，否則會讓其他四欄產生不必要的 index 漂移。

## 驗證結果

| Gate | Result |
| --- | --- |
| Vertical-slice coverage | 89/89；所有 M1 預定 replacement 類別完成 engineering coverage |
| Overlay parity | 合併趙雲 P0 後 `data/` 為398 files：372 GIF＋26 other；趙雲 batch為147 files，exact-case、canvas、indexed GIF、index0 `#FC00FF` 全 PASS |
| Zhao Yun model strict | `zhaoyun.txt` 464 occurrences／82 unique paths PASS；主檔加 7 份輔助 TXT，共 8 份全 PASS |
| Zhao Yun determinism | fresh output 147／147 files byte-identical |
| Zhangfei model strict | 447 次引用、86 個唯一圖像路徑全部解析（disposable staging case aliases） |
| Stage01 level strict | 4 個唯一背景／FX 路徑 PASS |
| `baoxiang` strict | 3 個唯一圖像路徑 PASS |
| Docker OpenBOR | v7533 到 `Loading models... Done!`；bounded timeout exit 124 |
| Combined TXT strict | 本輪指定的六份 TXT 全 PASS |
| Getter v2 protected region | `x>=103` 共 104,052 indices mismatch=0；palette byte mismatch=0 |
| Getter v2 first column | 28,428 pixels 中 23,040 indices changed；index0 pixel count=0 |

89/89 表示「M1 預定檔案都已替換且不是 base copy」，不代表完成全遊戲，也不代表美術 production-ready。Docker model-load 也沒有自動操作選角 cursor 或進入 Stage01。exit 124 是到達載入閘門後由 bounded timeout 結束的預期結果；TERM 後可能出現的 double-free 是既知 v7533 teardown，不能誤寫成完整 gameplay PASS。

## 可視 gameplay 尚待驗收

- 選角 cursor 在五欄之間移動時，頭像與實際 model slot 不錯位。
- 1P／2P join、倒數、確認／取消與 palette variant 不蓋住頭像。
- 五個全身站姿腳底一致，斧、盾、長角與尾巴沒有被 480×276 邊界裁掉。
- 35×54 icon 在 HUD 實際縮放後仍看得出無敵鐵金剛，不糊成紅黑色塊。
- `zhangfei.GIF`／`zhangfei_m.GIF` 的方向、HUD 位置及雙人模式後備路徑正確。
- 沒有在選角後或血條刷新時閃回張飛原頭像。

## Production 缺口

- 五欄圖仍是生成式 engineering redraw；Getter 第一欄已換成 v2，但仍須由 UI／pixel artist 清理斧、手指、腳底與欄寬。
- 張飛、關羽、趙雲目前各有 model icon＋兩張 profile；黃忠、魏延仍屬後續工作，不能把選角合成圖當成其餘 UI 小圖已完成。
- 現有選角圖沒有文字；角色名稱與提示若由其他 UI 圖或字型顯示，需另做跨語系與 2P layout review。
- 公開總覽依 repo policy 只作 **overview-only review image**；不是可拆用 production 圖，也不能宣稱 `legal-safe`／`public-safe`。發行時仍要重新確認所有角色造型與名稱的權利範圍。
- 關羽 35×54 UI 已進 engineering overlay，不等於關羽角色完成：`g1`–`g16`、gore remap、`playerdie.wav` 與逐格補間都 deferred；詳見 [`GUANYU_VERTICAL_SLICE.md`](GUANYU_VERTICAL_SLICE.md)。
- 趙雲35×54 UI已進 engineering overlay，也不等於角色完成：`y1`–`y16`、cross-character audio QA、逐格補間、實戰BBox／attack box與2P都 deferred；詳見 [`ZHAOYUN_VERTICAL_SLICE.md`](ZHAOYUN_VERTICAL_SLICE.md)。
