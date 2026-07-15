# Docker 隔離編譯與 smoke test

這是本專案的 Linux 預設流程：OpenBOR 編譯依賴只安裝在 Docker image，原始碼以唯讀方式掛載，編譯產物與測試資料都寫到 `/tmp`。流程不會安裝 host 套件，也不會重封裝 PAK。

## 為什麼預設鎖定 v7533

這份研究模組仍含大量 indexed GIF。OpenBOR master 在 2026-06-01 後將 still-image loader 簡化為只接受 PNG；實測 master Build 7832 會在舊背景 GIF／`data/bgs/loading` 中止。`v7533` 仍保留 GIF loader，因此 Docker script 預設 `--ref v7533`。

這是 migration pin，不代表永遠不能升級。若要改用 master，必須先在私有素材樹把相關 GIF 轉成 non-interlaced indexed PNG、更新所有引用，再跑完整回歸測試。

## 1. Linux x86-64 engine

主機只需要 Git、Docker Engine 與 Bash：

```sh
BUILD_PARENT="$(mktemp -d /tmp/openbor-linux-docker-XXXXXX)"
BUILD_OUT="$BUILD_PARENT/build"

scripts/build-openbor-linux-docker.sh \
  --source ../openbor \
  --ref v7533 \
  --output "$BUILD_OUT"

cat "$BUILD_OUT/BUILD-INFO.txt"
```

輸出位置依上游版本而異；script 完成時會顯示正確的 `Binary:`。v7533 的位置是：

```text
$BUILD_OUT/source/engine/releases/LINUX/OpenBOR/OpenBOR
```

`--output` 必須是尚不存在的路徑。失敗後請換一個新路徑，避免誤刪或覆蓋其他檔案。

## 2. 建立私有 merged stage

Public repo 不含原作單張素材。先在本機準備以下 ignored 目錄：

```text
workplace/extracted/data/
workplace/robot_wof_vertical_slice/overlay/data/
```

接著建立一次性 raw-data 測試樹：

```sh
SMOKE_PARENT="$(mktemp -d /tmp/robot-wof-smoke-XXXXXX)"
STAGE="$SMOKE_PARENT/stage"

node scripts/prepare-openbor-smoke.mjs --output "$STAGE"
node scripts/validate-openbor-assets.mjs \
  --data "$STAGE/data/chars/zhangfei/zhangfei.txt" --strict
```

## 3. 容器內 headless smoke

```sh
OPENBOR="$BUILD_OUT/source/engine/releases/LINUX/OpenBOR/OpenBOR"

scripts/run-openbor-smoke-docker.sh \
  --binary "$OPENBOR" \
  --stage "$STAGE" \
  --seconds 15
```

PASS 的最低條件是 `OpenBorLog.txt` 到達 `Loading models... Done!`，且沒有 fatal model/background/file load error。dummy video driver 的 OpenGL fallback 與片頭動畫 GIF warning 需與真正的 fatal load error 分開判讀。

2026-07-15 的驗證基準：OpenBOR v4.0 Build 7533、Linux x86-64、完整模型載入成功；binary SHA-256 為 `5ac687c5b590b077cd47721b15edd3064470cddf3ac4e3087082d1f83e4aa5af`。timeout 強制關閉 v7533 時可能印出舊引擎的 double-free 訊息，因此 headless PASS 只代表載入閘門通過。

## 4. 仍需桌面人工驗收

Docker headless test 看不到畫面。合併前仍須在 Linux 桌面或目標 OS 實際確認：

- 選角畫面可顯示張飛 slot／Mazinger。
- idle、walk、attack 沒有腳底抖動、裁切或洋紅邊。
- Offset、BBox、attack box、1P／2P palette 正常。
- 第一關背景、敵人、Boss、props 與 FX 的層級及碰撞正確。

Windows 與 macOS 必須在各自 runner 原生建置與驗證。Linux Docker 無法產出可正式驗收的 macOS `.app`；可用 GitHub Actions 的 `windows-*`／`macos-*` runner 保持開發機乾淨。
