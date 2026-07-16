# Docker 隔離 X11 visible QA

這條路徑在 Docker container 內啟動 `Xvfb :99`、OpenBOR、`xdotool` 與 `ffmpeg`。它不掛載 host X11 socket，也不需要在 host 安裝圖形／錄影套件；只有 disposable stage 的 `VisibleQA/` 會接收 log、window id 與 MP4。

## 建立 image

```bash
docker build -f docker/openbor-visible/Dockerfile -t openbor-visible-qa:local .
```

## 建立可視 QA stage

完整機器人素材包請先依
[SUPER_ROBOT_INTEGRATION_BUILD.md](SUPER_ROBOT_INTEGRATION_BUILD.md) 組裝 private
overlay，再以 `prepare-openbor-smoke.mjs` 建立新的 staging tree。接著只改
staging tree 的 QA route：

```bash
node scripts/prepare-openbor-visible-qa.mjs --stage /tmp/robot-wof-visible
```

這會保留第一個 `skipselect`，再導向 styled `data/levels/select.txt` 與 `data/levels/NewWof/1/01.txt`。它會備份原本 `levels.txt` 到 `VisibleQA/levels.original.txt`，絕不改 base data、overlay 或 PAK。

## 執行

```bash
scripts/run-openbor-visible-docker.sh \
  --binary /path/to/OpenBOR \
  --stage /tmp/robot-wof-visible \
  --seconds 30 \
  --macro guanyu_select_stage1
```

結果位於：

- `VisibleQA/openbor-visible-run.mp4`
- `VisibleQA/openbor-visible-runner.log`
- `VisibleQA/window-id.txt`

目前 module 的視窗 title 是 `robot-wof.dev`，所以 helper 預設匹配 `OpenBOR|robot-wof.dev`。

## 已證明與尚待證明

2026-07-16 已實測 container 的 `Xvfb :99` 可連線、OpenBOR 視窗可被 `xdotool` 找到、window id 可寫入、ffmpeg MP4 可產生。這關閉的是「sandbox 沒有可見 X11」的基礎設施阻礙。

不應把它直接視為角色 gameplay QA 已完成。選角／Stage 1 macro 必須逐次以 MP4 screenshots 審閱；現有 title/menu timing 與 input mapping 仍要對 Getter、ν Gundam 各自驗證。
