# Stage01 李典紅槍指揮機 vertical slice

這是第一個 Boss 級工程替換：把 Stage01 `lidian` slot 改成原創紅色長槍指揮機。公開 repository 只保存 16 格總覽、crop manifest、builder 與驗證方法；69 張可直接載入的 GIF、6 份私有 model TXT、來源 PNG 及 extracted data 都留在 `.gitignore` 排除的本機目錄。

![李典紅槍指揮機 16 格分鏡總覽](../research/boss/lidian-red-spear-commander-storyboard-v1-keyed.png)

![Stage01 已完成素材 engineering composite](../research/previews/stage01-engineering-composite.png)

第二張圖是由 private overlay 實際輸出建立、依 repo policy 保留的 overview-only 靜態合成，不是 OpenBOR runtime capture；它用來同時檢查李典、無敵鐵金剛、藍盔兵、補給箱、HUD 與場景的相對尺度，也不代表已通過法律或公開散布權利審核。

這批是 `productionReady: false` 的 engineering coverage。它證明閉包、畫布、Offset、透明鍵色、模型路徑與 Docker 載入可行，但 69 張 GIF 仍由 16 個 key pose 重用，必須由藝術家補足 in-between、攻擊預備／收招、受擊差異與逐零件碎片。

## 完整 Stage01 閉包

| 類別 | 數量 | 內容 |
| --- | ---: | --- |
| 主體與 Boss show | 52 GIF | `icon`、spawn、idle、walk、五段槍擊、jump／rise、`c1..c8`、`z` special、pain、fall、death |
| 私有碎片／道具 | 17 GIF | `lidianxo`、`lidianxs`、`lidianxs1` 與 `jiubei` 使用的裝甲、頭部、核心罐與碎片 |
| 模型檔 | 6 TXT | `li.txt`、`lidian.txt`、三個私有碎片 model、`jiubei.txt` |
| 合計 | 69 GIF＋6 TXT | 只包含 Stage01 active Lidian closure，不把殘缺且未啟用的 `lihorse` 變體混入 |

## 16 格角色對照

| 格 | 角色 | 主要輸出 |
| ---: | --- | --- |
| 01 | Boss show 肖像 | `icon.GIF` |
| 02 | 能量落地／spawn | `spawn1..3.GIF` |
| 03 | 長槍待機 | `idle00.gif` |
| 04 | 行走／低姿戒備 | `walk2..5` |
| 05 | 長距刺擊 | `a1..a3` |
| 06 | 橫掃 | `a4..a5` |
| 07 | 跳躍／落地 | `jump1..4`、`rise1` |
| 08 | 空中蓄能 | `c1..c5` |
| 09 | 垂直落槍 | `c6..c8` |
| 10 | 地面旋轉 special | `z01`、`z02`、`z1..z5` |
| 11 | 輕受擊 | `pain1`、`painx1` |
| 12 | 重受擊 | `pain2`、`painx2` |
| 13 | 空中擊退 | `fallx`、`fall1`、`fallr` |
| 14 | 倒地 | `fall2`、`fall3`、`fallf1`、`fallx2`、`fallx3` |
| 15 | 機體破壞終態 | `painx01`、`death1..2`、`fallx01..03` |
| 16 | 裝甲／核心碎片 inventory | 17 張私有 submodel GIF |

第 09 格的落槍電光、第 10 格的左側斬弧、第 14 格的槍尖與第 15 格的殘骸都跨過名義 4×4 格線。`slice-lidian-storyboard.mjs` 使用 16 個獨立 crop，不能改回平均等切，否則會再次切掉槍尖、腳或混入鄰格。

## 洋紅透明鍵色

生成來源的洋紅背景有 JPEG／繪圖色差，不是單一 RGB。切圖器先依下列規則辨識背景，再正規化為 OpenBOR 需要的精確顏色：

```text
r >= 180 && b >= 180 && g <= 160 && abs(r - b) <= 40
→ #FC00FF
```

最終 GIF 必須是 indexed palette，palette index 0 必須等於 `#FC00FF`，而且不能依賴 GIF transparency extension。這個專案的鍵色不是 `#FF00FF`。

## 建立方式

先切 16 個本機 key pose 並重建公開總覽：

```bash
node scripts/slice-lidian-storyboard.mjs \
  --source private_assets/robot_wof/boss/lidian/lidian-red-spear-commander-storyboard-v1.png \
  --output-dir private_assets/robot_wof/boss/lidian/keyposes \
  --contact-sheet research/boss/lidian-red-spear-commander-storyboard-v1-keyed.png \
  --manifest research/manifests/lidian-red-spear-commander-keyposes.json
```

再建立 exact-canvas 私有 overlay：

```bash
node scripts/build-lidian-p0-prototype.mjs \
  --source-dir private_assets/robot_wof/boss/lidian/keyposes \
  --extracted-dir workplace/extracted/data/chars/boss/lidian \
  --output-dir workplace/robot_wof_vertical_slice/overlay
```

Builder 逐張讀取原 physical GIF 的 canvas，套用 model 的權威 Offset 與分鏡語意 pivot，輸出同名 exact-case GIF。它拒絕寫入 `workplace/extracted`。

## 機器人死亡回饋

原 `li.txt` 會召喚 shared blood 與人體器官。Builder 只修改 Lidian 私有 overlay：

- 17 個 `blood*` spawn 改成 `Flashb`／`Dust`。
- 移除 `hand`、`meat`、`fei`、`gan`、`chang`、`pi`、`rou` 七個人體零件 tosser。
- 保留 `lidianxo`、`lidianxs`、`lidianxs1` 四次本機機械碎片 toss。
- 五個 `rou.wav` 改成既有 `land.wav`，待正式金屬破壞音效完成後再做 Lidian-local 音效包。
- 不改 shared blood／die model，避免影響尚未替換的其他角色。

## 驗證結果

2026-07-15 的工程驗證：

| Gate | 結果 |
| --- | --- |
| Lidian closure | 69/69 GIF、6/6 TXT |
| 全 overlay parity | 182 files：163 GIF＋19 TXT；exact-case counterpart、canvas、indexed palette、index 0 全部通過 |
| 六份 model strict | 48＋4＋1＋4＋4＋8 個唯一圖像路徑均解析；0 missing、0 case mismatch |
| gore postcondition | 0 個 human blood／organ／`rou.wav` 殘留；Lidian-local mechanical tossers 保留 |
| 原 M1 coverage | 89/89 仍通過；Lidian 是 M1 contract 之外新增的 Stage01 Boss closure |
| Docker | OpenBOR v7533 到 `Loading models... Done!`；20 秒 bounded timeout exit 124 |

Docker 在 TERM 後仍會顯示 v7533 已知的 teardown `double free or corruption`。只有 Log 在停止前完成 model load 且沒有 Boss-specific load error 時，才能把這個 bounded smoke 判為通過。

Linux headless smoke evidence for the current P0 tree is recorded in [`../research/LIDIAN_LINUX_SMOKE.md`](../research/LIDIAN_LINUX_SMOKE.md).

## 藝術家接手清單

1. 以 manifest 中每個 physical GIF 為一個交付項，不要只畫 16 張總覽。
2. 保持 exact canvas、檔名大小寫與 palette index 0；若要改 canvas，另交 geometry migration。
3. 地面 pose 的腳底對 Offset.y 目標誤差不超過 2px；空中、旋轉、倒地 pose 使用 manifest pivot。
4. 重畫 `frame-16` 時要把不同裝甲／核心零件拆成真正的個別 sprite，不要讓 17 張 submodel 都重用同一張碎片拼盤。
5. 做 spawn、idle、walk、兩種槍擊、special、pain、fall、三條 death path 的可視 gameplay capture；靜態 model load 不能代替畫面驗收。
6. 新音效只能放私有／授權清楚的 Lidian-local 路徑，不要覆寫全域共用聲音。
