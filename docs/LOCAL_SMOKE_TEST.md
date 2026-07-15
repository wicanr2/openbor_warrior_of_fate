# OpenBOR 本機 raw-data smoke test

這套流程用來測試 `workplace/extracted/data` 加上機器人大戰 overlay，重點是**不修改 extracted，也不需要先封裝 PAK**。測試樹、Log、Save、截圖與暫存設定都留在 `/tmp` 的一次性目錄。

## 稽核結論

目前的 OpenBOR 原始碼支援 loose-file／raw-data 開發模式：

- `engine/source/gamelib/packfile.c` 的 `isRawData()` 會在工作目錄尋找 `data`；找到後 `pak_init()` 關閉 PAK cache 並直接讀取鬆散檔案。
- `openPackfile()` 會先嘗試磁碟上的 loose file，找不到才讀 PAK。Linux 還有 case-insensitive fallback，但正式素材仍應修正大小寫，不能把 fallback 當成跨平台規格。
- `engine/sdl/sdlport.c` 接受第一個命令列參數作為模組檔；因此 staging 內建立一個空的 `robot-wof.dev.pak`，只用來跳過模組選單。raw-data 模式不會讀取這個空檔的 PAK table。
- CMake 的 Linux post-build 會建立 `engine/releases/LINUX/{Logs,Paks,Saves,ScreenShots}`，並輸出 `engine/releases/LINUX/OpenBOR`。

`robot-wof.dev.pak` 只是本機開發 sentinel，不是可發布或可遊玩的 PAK。

## 1. 建立 disposable merged tree

```sh
SMOKE_PARENT="$(mktemp -d /tmp/robot-wof-smoke-parent-XXXXXX)"
STAGE="$SMOKE_PARENT/stage"

node scripts/prepare-openbor-smoke.mjs --output "$STAGE"
```

腳本依序執行：

1. 複製 `workplace/extracted/data` 到全新的 `$STAGE/data`。
2. 將 `workplace/robot_wof_vertical_slice/overlay/data` 疊到副本。
3. 掃描張飛目錄內所有 TXT 的 GIF／PNG 引用。
4. 大小寫不一致時，會依預設張飛模型與額外指定的 `--case-model` 在 staging 建立 exact-case 實體副本，並輸出 `$STAGE/zhangfei-case-report.tsv`。
5. 建立 staging 專用的 `Logs`、`Saves`、`ScreenShots`、`Paks` 與空的 `robot-wof.dev.pak`。

不想自動建立大小寫相容副本時，加上 `--no-case-aliases`，腳本只會輸出報告。`--output` 已存在時腳本會拒絕覆寫，避免誤刪其他資料。

如果要把 `xuchu` 也帶進 disposable smoke，可以像這樣額外指定模型：

```sh
node scripts/prepare-openbor-smoke.mjs \
  --output "$STAGE" \
  --case-model chars/boss/xuchu/xuchu.txt \
  --case-model chars/boss/xuchu/chu.txt \
  --case-model chars/boss/xuchu/1/xuchuxs.txt
```

目前基準資料掃描到張飛完整模型（主模型、騎乘與各武器／水中狀態）共有 **37 個大小寫不一致的影像路徑**。其中主 P0 已知項目包含 `icon.gif`、`block0/1/2.gif`、`jump1/2/3.gif`、`fallf1.gif`、`fallx*.gif`；詳細來源行號以產生的 TSV 為準。

## 2. 在 staging 驗證素材

先驗證張飛主模型；此命令會檢查 exact-case、indexed GIF 與 palette index 0 `#FC00FF`：

```sh
node scripts/validate-openbor-assets.mjs \
  --data "$STAGE/data/chars/zhangfei/zhangfei.txt" --strict
```

2026-07-15 的基準結果為 447 次 image reference、86 個唯一解析路徑，建立 staging aliases 後 **PASS**。這只代表檔案格式與路徑通過，不能代替引擎內的腳底、Offset、BBox、attack box 與動畫流暢度驗收。

## 3. 準備 Linux OpenBOR binary

預設使用 Docker，不在 host 安裝 SDL2、Vorbis/Ogg、VPX 或 compiler 套件：

```sh
BUILD_PARENT="$(mktemp -d /tmp/openbor-linux-docker-XXXXXX)"
BUILD_OUT="$BUILD_PARENT/build"

scripts/build-openbor-linux-docker.sh \
  --source ../openbor --ref v7533 --output "$BUILD_OUT"

OPENBOR="$BUILD_OUT/source/engine/releases/LINUX/OpenBOR/OpenBOR"
```

完整版本相容性與驗證基準見 [Docker 隔離編譯文件](DOCKER_LINUX_BUILD.md)。

## 4. 有界限的啟動測試

先在同一 Docker image 做 headless、有時間上限的模型載入測試：

```sh
scripts/run-openbor-smoke-docker.sh \
  --binary "$OPENBOR" --stage "$STAGE"
```

成功條件是 Log 到達 `Loading models... Done!`，且沒有 fatal load error。這不取代桌面視覺驗收；要看選角與動畫時，請使用同一 commit 在有顯示環境的目標 OS runner 啟動，不在本機另外安裝 runtime 套件。

腳本會從 `$STAGE` 啟動：

```text
OpenBOR ./robot-wof.dev.pak
```

因此引擎讀取的是 `$STAGE/data`，所有輸出也在 `$STAGE`。檢查：

- `Logs/OpenBorLog.txt`：模型、圖檔、腳本載入錯誤。
- `Logs/ScriptLog.txt`：模組腳本錯誤。
- 選角畫面的張飛 slot 是否顯示 overlay 頭像／角色。
- `idle`、`walk`、`attack` 是否沒有腳底抖動、穿地、裁切或透明色邊框。
- 1P／2P palette 與攻擊碰撞框是否仍可用。

完成後直接刪除 `$SMOKE_PARENT` 即可；`workplace/extracted` 和 overlay 都沒有被修改。

## PAK 與 data 的正確放置

| 模式 | Linux 位置／啟動方式 | 用途 |
| --- | --- | --- |
| Raw data 開發 | 工作目錄內放 `data/`，從該目錄啟動 OpenBOR | 最快測 overlay，不需重封裝 |
| Linux 發行 PAK | `engine/releases/LINUX/Paks/robot-wof.pak` | 一般模組選單與發行測試 |
| 指定 PAK | 從 release 目錄執行 `./OpenBOR ./Paks/robot-wof.pak` | 跳過模組選單直接載入 |

Windows 對應 `engine/releases/WINDOWS/Paks/`；macOS 對應 `OpenBOR.app/Contents/Resources/Paks/`。同一份標準 PAK 可以搭配各平台的 native engine；raw-data staging 則是本機開發工具，不應直接當發行包。
