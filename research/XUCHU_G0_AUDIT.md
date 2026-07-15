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
- exact-case debt 已經可以在 disposable stage 內被正規化並重新通過 strict validator。
- 對應的修補工具是 [`../scripts/alias-model-case-in-stage.mjs`](../scripts/alias-model-case-in-stage.mjs)。

## disposable stage repair

我用現成的 smoke stage 複製出一份 disposable tree，然後只對 `xuchu` 相關模型補 exact-case alias。

命令：

```bash
BASE=/tmp/robot-wof-smoke-parent/guanyu-getter-v5/data
OVERLAY=/tmp/xuchu-overlay-empty
STAGE=/tmp/xuchu-smoke-stage-1784140932-765144
node scripts/prepare-openbor-smoke.mjs \
  --base "$BASE" \
  --overlay "$OVERLAY" \
  --output "$STAGE" \
  --case-model chars/boss/xuchu/xuchu.txt \
  --case-model chars/boss/xuchu/chu.txt \
  --case-model chars/boss/xuchu/1/xuchuxs.txt
```

結果：

- `case-alias-report.tsv` 產生 14 筆 alias / missing 記錄
- `xuchu.txt` strict PASS
- `chu.txt` strict PASS
- `xuchuxs.txt` strict PASS
- headless smoke PASS 到 `Loading models............... Done!`

這表示 `xuchu` 的現成 closure 可以在 disposable overlay 內被修到可驗證狀態，接著才輪到把同樣處理帶進真正的 overlay / production flow。

`prepare-openbor-smoke.mjs` 現在已經支援重複的 `--case-model` 參數，所以 `xuchu` 的 exact-case 正規化不必再靠單獨腳本；下一次可以直接把它加進一般 smoke 準備流程，與既有的張飛預設 alias 共存。
