# 角色分鏡素材規格

本文件給後續接手繪製、外包或匯入角色圖的工作者使用。請在修改任何 GIF 前先閱讀。

## 透明底色：洋紅色（Magenta key）

目前 Warriors of Fate 的角色 GIF 使用 **palette index 0 鍵色**，不是 GIF 的 alpha 透明通道。現有角色素材的 index 0 實值是洋紅 `#FC00FF`；透明判定的關鍵是它位於 index 0，不只是 RGB 看起來像洋紅。

| 項目 | 規格 |
| --- | --- |
| 鍵色 | palette index 0，現有 RGB `#FC00FF`（252, 0, 255） |
| 用途 | 角色輪廓以外的背景；OpenBOR 以 index 0 作鍵色 |
| 檔案格式 | 保持 indexed GIF（8-bit palette，最多 256 色） |
| 不可使用 | 漸層洋紅、接近但不完全相同的粉紅色、預先合成的背景 |

> GitHub 的圖片預覽會把 `#FC00FF` 顯示成洋紅底；遊戲引擎中 palette index 0 是透明區域。README 的部分預覽可能把 index 0 暫時轉成透明，但這**不代表**原始 GIF 應改用 alpha，也不要求設定 GIF transparency flag。

## 製作與匯出規則

1. 從對應角色資料夾取出目標 GIF，**保留原始畫布寬高**。
2. 將角色以外的每個背景像素填為 `#FC00FF`，並在輸出 palette 中鎖定為 index 0。
3. 保留角色 `.txt` 裡的 GIF 檔名與大小寫；不要任意改成 PNG 或重新命名。
4. GIF 請輸出為索引色圖。避免在邊緣留下半透明像素或抗鋸齒後混入粉紅色邊線。
5. 不要在純美術替換時修改動畫定義的 `Offset`、`BBox`、`attack`、`Delay`；這些定義控制站立位置、碰撞與攻擊判定。

## 交付前檢查

- 在圖片編輯器確認背景是 `#FC00FF`，並用 palette 檢視器確認它位於 index 0；只用吸管確認 RGB 不夠。
- 不把 GIF transparency flag 當必要條件；本模組原角色 GIF 可以沒有該 flag。
- 與原 GIF 比較畫布尺寸是否完全一致。
- 確認 GIF 可開啟、檔名與分鏡總表一致。
- 遊戲內測試 idle、walk、attack、jump、pain、fall；確認無洋紅方塊、角色沒有漂浮、攻擊判定未偏移。

可先執行：

```sh
node scripts/validate-openbor-assets.mjs --data /path/to/test/data --strict
```

## 分鏡總覽與原始 GIF

- [角色替換分鏡總表](../research/CHARACTER_SPRITE_INVENTORY.md)
- [原始 GIF 圖片目錄](../research/sprites/)
- [README 分鏡總覽](../README.md#分鏡總覽)

總覽 PNG 是溝通與挑選用的縮圖；實際替換請以 `research/sprites/` 的 GIF 為範本。
