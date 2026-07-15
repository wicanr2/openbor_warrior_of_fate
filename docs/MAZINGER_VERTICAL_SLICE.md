# Mazinger vertical slice

這個目錄是「張飛 slot → 無敵鐵金剛」第一個可交接實作區。它採 overlay 流程，不直接改寫 `workplace/extracted`，也不重新封裝 PAK。

## 現況

- 已把 4×3 總表切成 12 張 RGB PNG key pose；一般格為 313×418，橫向倒地的 `frame-12.png` 為 379×418。
- 原圖角色會跨越等分邊界，因此 `frame-07/08/11/12` 使用 manifest 記錄的安全 crop，不可用平均網格重新覆蓋。
- 背景固定為 `#FC00FF`；這是本模組現有角色素材的 palette index 0 實值。
- 12 張只負責姿勢方向，還不是 OpenBOR production GIF。
- 張飛 P0 有 42 個 case-sensitive GIF 引用，落到 41 個實體 GIF。`--scope full-p0` engineering prototype 已覆蓋全部引用並通過 Docker 載入；但它只重用 12 個概念姿勢，不是 41 張完成美術。

![無敵鐵金剛 12 格 key pose 總覽](../research/mazinger/mazinger-keyposes-contact-sheet.png)

## 目錄

| 路徑 | 用途 |
| --- | --- |
| 本機 `private_assets/robot_wof/mazinger/keyposes/` | 從總表切出的 12 張人工精修底稿；不提交 GitHub |
| `research/manifests/mazinger-keyposes.json` | 分鏡格、姿勢名稱與透明色的 machine-readable 記錄 |
| `research/MAZINGER_P0_FRAME_MAP.md` | 42 張 P0 原始 GIF 與 12 張 key pose 的映射／缺幀表 |
| `research/STAGE01_REPLACEMENT_MANIFEST.md` | 第一關背景、前景、物件與 FX 替換清單 |
| 本機 `workplace/robot_wof_vertical_slice/overlay/data/` | 通過驗收後才放入的同路徑替換檔；不提交 GitHub |

## 接手流程

1. 依 `research/MAZINGER_P0_FRAME_MAP.md` 選一個原始 GIF。
2. 在原 GIF 畫布上重畫；腳底對準該 frame 的 `Offset`。
3. 保留原檔名、字母大小寫、畫布、`BBox`、`attack` 與 `Delay`。
4. 輸出 indexed GIF（最多 256 色），並把 `#FC00FF` 放在 palette index 0。
5. 把通過檢查的檔案放到 `overlay/data/chars/zhangfei/` 對應路徑。
6. 將原始 data tree 複製成可丟棄的測試樹，再把 overlay 疊上去；不可對 `workplace/extracted` 原地覆寫。
7. 對合併後的角色定義執行 `node scripts/validate-openbor-assets.mjs --data <測試樹>/data/chars/zhangfei/zhangfei.txt --strict`。
8. 在 OpenBOR 遊戲內檢查腳底、滑步、碰撞與 2P palette。

需要先驗證整個 P0 模型契約時，可執行：

```bash
node scripts/build-mazinger-p0-prototype.mjs \
  --scope full-p0 \
  --output-dir workplace/robot_wof_vertical_slice/overlay
```

這會建立 41 張 private engineering GIF，並在 manifest 保留所有 pose reuse／clamp 警告。不得把它標成 production art。

## 不可省略的驗收

- 不把 RGB PNG 直接更名成 GIF。
- 不把 `#FF00FF` 當成本專案的既有 index 0；正確值是 `#FC00FF`。
- 不依賴 GIF transparency flag；此模組以 palette index 0 作為透明鍵色。
- 41/41 工程檔齊全只代表 coverage；不用 12 張 key pose 宣稱已完成 42 張 P0 美術。
- 未完成人工像素修整、比例一致與授權確認前，不把生成圖當成發行素材。
