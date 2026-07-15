# 本機私人 Mazinger P0 對位產線

這支產線可建立兩種個人測試用 engineering prototype：`basic` 只含 `idle00.gif` 與 `walk01.gif`～`walk08.gif`；`full-p0` 產出張飛 P0 的 41 個實體 GIF，覆蓋模型中的 42 個 case-sensitive 引用。它不修改 `workplace/extracted`，預設產物位於不應上傳的：

```text
private_assets/robot_wof/mazinger-p0-prototype/data/chars/zhangfei/
```

執行：

```bash
node scripts/build-mazinger-p0-prototype.mjs
```

完整 P0 engineering coverage：

```bash
node scripts/build-mazinger-p0-prototype.mjs --scope full-p0
```

腳本會自動完成：

1. 從 `zhangfei.txt` 的目標 animation 讀取每張 Frame 的 Offset；Windows 反斜線會先正規化。
2. 從原張飛 GIF 讀取每張 canvas，不改 BBox、attack、Delay 或原檔。
3. 偵測 PNG 的 `#FC00FF` 背景與腳底接觸區。
4. 用最近鄰縮放，讓腳底中心落在原 Offset；倒地姿勢改採底部中央 anchor。`full-p0` 會依 canvas 自動縮小與記錄 clamp。
5. 產生單幀 indexed GIF，重新映射色盤，強制 palette index 0 為 `#FC00FF`。
6. 驗證 canvas、GIF 全域色盤、palette index 0，且不寫 GIF transparency extension。

若 `ffmpeg` 量化後沒有保留精確的 `#FC00FF`，腳本會直接失敗，不會假裝成功。可用 `--sprite-height N` 調整比例；對位後超出原 canvas 時也會失敗並提示降低高度。

## `basic` 對應與限制

概念分鏡只有四張步行 key pose，因此原型暫時採用以下對應：

| 輸出 | 分鏡 |
|---|---|
| `idle00.gif` | `frame-01.png` |
| `walk01.gif`, `walk05.gif` | `frame-03.png` |
| `walk02.gif`, `walk06.gif` | `frame-04.png` |
| `walk03.gif`, `walk07.gif` | `frame-05.png` |
| `walk04.gif`, `walk08.gif` | `frame-06.png` |

這樣可以先進 OpenBOR 檢查比例、腳底與畫面抖動，但不是正式八幀 gait。完成版仍須補畫 `walk05`～`walk08` 的獨立腿姿並做逐幀人工 pixel cleanup。

每次建置還會在私人輸出根目錄寫入 `BUILD-MANIFEST.json`，記錄來源 crop、腳底偵測、縮放、放置座標、Offset 與色盤驗證結果，方便針對抖動逐格校正。

## `full-p0` 驗證狀態

2026-07-15 的私人 overlay 工程驗證結果：

- 41/41 physical GIF、42/42 logical refs、34/34 P0 animations 覆蓋。
- 全部 exact-case 對應原檔、canvas 相同、indexed GIF、palette index 0 `#FC00FF`。
- merged staging 的 447 次引用／86 個唯一素材路徑通過 strict validator。
- Docker 中的 OpenBOR v7533 載入到 `Loading models... Done!`，張飛沒有專屬 missing/error。

這只證明「引擎契約完整且能載入」，不是美術完成。41 張由 12 個概念姿勢重用，其中 20 張因目標 canvas 被 clamp；manifest 會保留 `productionReady: false`、pose reuse、requested／actual placement。藝術家必須逐格重畫並在遊戲內檢查腳底、裁切、BBox 與 attack box，才能解除 prototype 標記。
