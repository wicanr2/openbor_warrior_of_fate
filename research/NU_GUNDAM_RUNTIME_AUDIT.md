# ν Gundam runtime audit

這份 audit 把 ν Gundam 第六角色目前的狀態切成三層：P0 engineering runtime、visible runner 未關閉、以及 production remaining。目的是讓接手的人不會把 headless smoke 誤判成完整可玩。

## 已驗證

- `nu_gundam` 已註冊為第六候選角色。
- 六欄選角與六人 patch 已通過。
- Linux headless smoke 已確認到 `Loading models... Done!`
- P0 runtime audit 已記錄 81 個非 manifest 檔案、71 張 action GIF、73 個主模型 refs、2 張 HUD profile 與 6 發 Funnel proxy。

## 目前仍開

`research/manifests/nu-gundam-next-queue.json` 仍列出：

1. visible runner QA
2. Fin Funnel P1 行為
3. 武器 FX 與音效替換
4. production in-between frames
5. gameplay-visible QA

## 可見 runner

這一步已被獨立成 [`NU_GUNDAM_RUNNER_QA.md`](NU_GUNDAM_RUNNER_QA.md)。
如果要用可重用 harness，請走：

```bash
scripts/run-openbor-visible-qa.sh \
  --binary /path/to/OpenBOR \
  --stage /path/to/nu-visible-stage \
  --display :0 \
  --seconds 30 \
  --macro nu_select_stage1 \
  --capture /path/to/nu-visible-run.mp4 \
  --title-pattern OpenBOR
```

## 結論

ν Gundam 的現況是「P0 engineering runtime complete but production remaining」；能載入、能列入第六候選、能跑 headless smoke，但 visible runner 與後續 production 閉包仍未完成。

## 相關文件

- [ν Gundam 第六角色 P0 vertical slice](../docs/NU_GUNDAM_VERTICAL_SLICE.md)
- [ν Gundam runner QA checklist](NU_GUNDAM_RUNNER_QA.md)
- [ν Gundam Linux smoke evidence](NU_GUNDAM_LINUX_SMOKE.md)
- [ν Gundam 剩餘工作隊列](manifests/nu-gundam-next-queue.json)
