# Xuchu G0 audit

這份 audit 記錄 `xuchu` 現成 closure 的實際驗證狀態。它不是完成宣告，而是把「能載入」與「還有 case debt」分開。

## 已驗證項

- `xuchu.txt` 的主體 closure 可被 strict validator 讀到。
- 現成 stage root 可在 Docker headless smoke 到達 `Loading models... Done!`
- G0 batch 與 closure manifest 已存在並可重建。

## 直接驗證結果

### `xuchu.txt`

命令：

```bash
node scripts/validate-openbor-assets.mjs --data /tmp/robot-wof-smoke-parent/guanyu-getter-v5/data/chars/boss/xuchu/xuchu.txt --strict
```

結果：

- PASS
- Image references: 19 occurrences, 9 resolved paths
- Readable assets: 9 GIF, 0 PNG

### `chu.txt`

命令：

```bash
node scripts/validate-openbor-assets.mjs --data /tmp/robot-wof-smoke-parent/guanyu-getter-v5/data/chars/boss/xuchu/chu.txt --strict
```

結果：

- FAIL
- 10 path case mismatch errors

已觀測到的 case debt：

- `pain1.GIF` ↔ `pain1.gif`
- `painx.gif` ↔ `painx.GIF`
- `fallx2.gif` ↔ `fallx2.GIF`
- `fallx3.gif` ↔ `fallx3.GIF`
- `fallx.gif` ↔ `fallx.GIF`
- `fallr.gif` ↔ `fallr.GIF`
- `painx2.gif` ↔ `painx2.GIF`
- `painx1.gif` ↔ `painx1.GIF`
- `fallx02.gif` ↔ `fallx02.GIF`
- `fallx03.gif` ↔ `fallx03.GIF`

### `xuchuxs.txt`

命令：

```bash
node scripts/validate-openbor-assets.mjs --data /tmp/robot-wof-smoke-parent/guanyu-getter-v5/data/chars/boss/xuchu/1/xuchuxs.txt --strict
```

結果：

- FAIL
- 4 path case mismatch errors

已觀測到的 case debt：

- `a0.gif` ↔ `a0.GIF`
- `a1.gif` ↔ `a1.GIF`
- `a2.gif` ↔ `a2.GIF`
- `a3.gif` ↔ `a3.GIF`

### Headless smoke

命令：

```bash
scripts/run-openbor-smoke-docker.sh \
  --binary /tmp/openbor-linux-docker-robot-wof/source/engine/releases/LINUX/OpenBOR/OpenBOR \
  --stage /tmp/robot-wof-openbor-smoke-audit \
  --seconds 15
```

結果：

- `PASS: OpenBOR reached model-load completion in Docker`
- Docker exit `124`
- log: `/tmp/robot-wof-openbor-smoke-audit/Logs/OpenBorLog.txt`

## 結論

- `xuchu` 不是缺圖。
- `xuchu` 已經能過 headless model-load gate。
- 下一個真正要做的是把 exact-case debt 正規化到 disposable overlay，然後重跑 strict validator。
