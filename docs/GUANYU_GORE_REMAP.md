# Getter／關羽機械 hitflash closure

這份工作包只關閉 Getter 關羽武器變體中的「人類血腥 hitflash fallback」工程缺口；不宣稱完成逐格美術、完整 `g1`–`g16`、死亡音效或可視 gameplay QA。

## 範圍

受影響的 base variant model 是 `g1`、`g5`–`g11`。它們各有一個 `hitflash blood1` 或 `hitflash blood2`；`g1` 另有既存大小寫債務。這個 overlay：

- 只覆寫上述 8 個 TXT。
- 將那 8 個血腥 hitflash 改為既有、已在 `models.txt` 註冊的 `Electric`。
- 不改 `models.txt`、主 `guanyu.txt`、GIF、音效或其他角色。
- 同步把這 8 個 TXT 內 GIF path 正規化為 base data 的實體大小寫；特別是 `g1` 的 horse pain frames。

`Electric` 是既有的非人類電弧 FX；這是最小的 engineering remap，不是新繪的 Getter 專屬受擊特效。

## 建立 private overlay

```bash
node scripts/build-guanyu-gore-remap.mjs \
  --base-data /path/to/extracted/data \
  --output-dir /path/to/private/assets/integration/guanyu-gore-remap
```

輸出根目錄包含 `BUILD-MANIFEST.json`，可直接將 `overlay/data/` 疊到 disposable staging tree。

## 2026-07-16 驗證

- 8 個受影響 TXT：`validate-openbor-assets --strict` 全數 PASS。
- 合併後搜尋：沒有 `hitflash blood*` 或 `hitflash organ*`。
- Docker OpenBOR v7533：到 `Loading models... Done!`。

bounded smoke timeout 後的 double-free teardown 是引擎既知現象；此 gate 的成功條件仍是 timeout 前已到模型載入完成。

## 尚未關閉

- `g1`–`g16` 的騎乘、拾取武器、水中與特殊狀態完整美術／行為 closure。
- 專屬機械受擊 GIF／音效與 production FX 審稿。
- `playerdie.wav`、逐格補間、可視 Stage 1／2P gameplay QA。
