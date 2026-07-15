# Lidian runtime audit

這份 audit 把 Stage01 `lidian` 的公開證據與 runtime 事實分層。

## 已驗證

- 公開 keyposes manifest 存在，且可用機器方式檢查。
- 公開 overview 圖存在：`research/boss/lidian-red-spear-commander-storyboard-v1-keyed.png`
- Linux headless smoke 已證明 current Stage01 boss tree 可到 `Loading models... Done!`

## 公開 keyposes

命令：

```bash
node scripts/validate-lidian-keyposes.mjs
```

結果：

- PASS

這表示 `lidian-red-spear-commander-keyposes.json` 的 16 格總覽、`#FC00FF` 鍵色、4×4 來源與公開 overview 的 machine-readable 入口都一致。

## 目前仍開

- 逐幀 production redraw
- visible gameplay review
- spawn / hurt / death / fragment 的 production art
- Windows / macOS boss fixture smoke

## 相關文件

- [Lidian Boss vertical slice](../docs/LIDIAN_BOSS_VERTICAL_SLICE.md)
- [Lidian Linux smoke evidence](LIDIAN_LINUX_SMOKE.md)
- [Boss first playable batch](BOSS_FIRST_PLAYABLE_BATCH.md)
