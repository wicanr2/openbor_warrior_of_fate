# 本機私人 Mazinger P0 對位產線

這支產線只製作個人測試用的 `idle00.gif` 與 `walk01.gif`～`walk08.gif`。它不修改 `workplace/extracted`，預設產物位於不應上傳的：

```text
private_assets/robot_wof/mazinger-p0-prototype/data/chars/zhangfei/
```

執行：

```bash
node scripts/build-mazinger-p0-prototype.mjs
```

腳本會自動完成：

1. 從 `zhangfei.txt` 的 `anim idle`／`anim walk` 讀取 Offset。
2. 從原張飛 GIF 讀取每張 canvas，不改 BBox、attack、Delay 或原檔。
3. 偵測 PNG 的 `#FC00FF` 背景與腳底接觸區。
4. 用最近鄰縮放，讓腳底中心落在原 Offset；預設可見高度為 96 px。
5. 產生單幀 indexed GIF，重新映射色盤，強制 palette index 0 為 `#FC00FF`。
6. 驗證 canvas、GIF 全域色盤、palette index 0，且不寫 GIF transparency extension。

若 `ffmpeg` 量化後沒有保留精確的 `#FC00FF`，腳本會直接失敗，不會假裝成功。可用 `--sprite-height N` 調整比例；對位後超出原 canvas 時也會失敗並提示降低高度。

## 目前原型限制

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
