# Getter 關羽 runner QA checklist

這份檔案把 Getter v2 的可見 runner 驗證獨立出來。Getter 的靜態／headless 證據已經存在，現在缺的是能在有顯示環境的 runner 上完成選角、進場與基本玩法確認。

## 已驗證

- Getter v2 P0 engineering runtime 已完成。
- Linux headless smoke 已確認到 `Loading models... Done!`。
- 現在要補的是 visible runner 的選角與 Stage 1 進場。

## 需要的 runner 證據

1. 打開 five-player select screen。
2. 確認 Getter 可以被選取。
3. 確認選角畫面不會覆蓋 HUD。
4. 進入 Stage 1。
5. 確認角色可進行基本移動與攻擊。

如果 runner 還能做第二次測試，請再確認 2P 時的選角與 HUD 沒有把 Getter 的第一欄擠壞。

## 可重用 harness

在有顯示環境的 host 或 self-hosted runner 上，使用同一個 visible QA script；Getter 新增了對應的 macro：

```bash
scripts/run-openbor-visible-qa.sh \
  --binary /path/to/OpenBOR \
  --stage /path/to/getter-visible-stage \
  --display :0 \
  --seconds 30 \
  --macro guanyu_select_stage1 \
  --capture /path/to/guanyu-visible-run.mp4 \
  --title-pattern OpenBOR
```

`guanyu_select` 只負責確認 Getter，`guanyu_select_stage1` 會繼續送出進場確認。

## 目前仍開

- 真實畫面的選角／進場截圖。
- 基本 gameplay loop。
- 2P runner 驗證。
- 後續 production in-between、gore remap 與死亡音效替換。

## Current sandbox blocker

在這個工作環境裡，`Xvfb` 無法建立可用 listener，`xdpyinfo` 也無法連上任何可用 display，因此 visible runner 無法在本機 sandbox 完成。這不是 Getter 本身的 regression；是 runner 基礎設施的限制。

`scripts/run-openbor-visible-qa.sh` 已經加上 display preflight，避免把這種問題誤判成 OpenBOR window 或 macro 問題。

## 相關文件

- [Getter v2 P0 vertical slice](../docs/GUANYU_VERTICAL_SLICE.md)
- [Getter Linux smoke evidence](GUANYU_LINUX_SMOKE.md)
- [Getter 剩餘工作隊列](manifests/guanyu-next-queue.json)
