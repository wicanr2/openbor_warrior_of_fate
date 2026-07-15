# Vertical slice coverage validator

`validate-vertical-slice-coverage.mjs` 是只讀的「完成範圍」檢查。它補上現有格式驗證器無法回答的問題：預定要換的圖是否真的都已放入 overlay，而且不是未修改的 base 原圖。

目前 private M1 overlay 的結果為 89/89：所有預定 replacement 檔均存在且與 base 位元組不同。這只證明 engineering coverage；來源 manifest 仍是 `productionReady: false`，可視 gameplay 與逐格美術審核仍是必要 Gate。

## 使用方式

目前 M1 私人素材 overlay：

```sh
node scripts/validate-vertical-slice-coverage.mjs \
  --base workplace/extracted/data \
  --overlay local-only/robot_wof_vertical_slice/overlay/data
```

機器可讀報告：

```sh
node scripts/validate-vertical-slice-coverage.mjs --json > /tmp/vertical-slice-coverage.json
```

exit code `0` 表示所有必要項目都有「與 base 位元組不同」的 exact-case overlay 檔；`1` 表示未完成；CLI 或輸入錯誤為 `2`。

## M1 coverage contract

| 分類 | 判定來源 | 完成條件 |
| --- | --- | --- |
| 張飛 P0 | 從 `zhangfei.txt` 的 34 個 P0 `anim` 動態收集 Frame | 42 個 case-sensitive logical reference 對應的 41 個實體 GIF 全部替換；報告同時列出完整／部分／缺少的動畫 |
| 選角大頭照 | `data/bgs/select.gif` | 480×276 選角合成圖已替換；五人的大頭照與站姿都烘焙在這張圖內，並不是角色 `icon.GIF` |
| 玩家 UI | `zhangfei.txt` 的 icon，加上 `profiles/zhangfei.GIF` 與 `zhangfei_m.GIF` | 三張都替換，避免 HUD 閃回張飛素材 |
| Stage 01 開場 | `S2.gif`、`panel.gif`、`f.GIF` | 遠景、行走面及遮擋前景三張都替換 |
| `bing` 機械雜兵 | 從 `bing.txt` 收集全部 Frame、enemy icon，並展開 `load bingxs` 的四張分離模型 | 31 張主動畫、icon 與四張機械碎片都替換，不能只換 idle／walk |
| `bing` 機械死亡定義 | `data/chars/army/1/bing.txt` 與 `1/bingxs.txt` overlay | 移除 `blood*` spawn、把共用人體碎塊 `quans` 改為專屬機械碎片，並正規化 Linux exact-case GIF 引用 |
| `baoxiang` 補給箱 | 從 `baoxiang.txt` 收集全部 Frame | idle 與兩張破壞幀都替換 |
| `bing` alternate palette | `bing.txt` 的六張 `alternatepal` | M1 後續資訊項目，不阻擋第一個單一 palette slice |

模型裡同一張實體圖可能同時出現在不同動畫，甚至以不同大小寫引用。報告會保留 logical reference 統計，但實體檔只要求替換一次。

## 三層驗證要一起跑

Coverage 不取代既有工具；建議順序如下：

```sh
node scripts/validate-vertical-slice-coverage.mjs \
  --overlay local-only/robot_wof_vertical_slice/overlay/data

node scripts/validate-overlay-parity.mjs \
  --base workplace/extracted/data \
  --overlay local-only/robot_wof_vertical_slice/overlay/data

STAGE="$(mktemp -d /tmp/robot-wof-stage-XXXXXX)"
node scripts/prepare-openbor-smoke.mjs \
  --overlay local-only/robot_wof_vertical_slice/overlay/data \
  --output "$STAGE"
```

- Coverage：檢查預定範圍是否齊全，並拒絕把 byte-identical base copy 算成 replacement。
- Overlay parity：只檢查已存在的 overlay 檔；負責 exact-case base counterpart、相同 canvas、indexed GIF 與 index 0 `#FC00FF`。
- Smoke：合併到 `/tmp` 後由引擎驗證載入、Offset、BBox、動畫、遮擋與操作。

## 現有流程的涵蓋缺口

1. `validate-overlay-parity.mjs` 對「沒放進 overlay 的預期檔」沒有資訊，因此 9 張 idle／walk 也能 PASS；它也不判斷 overlay 是否只是原檔複製。
2. `validate-openbor-assets.mjs` 驗證的是 TXT 最終可解析引用。對合併後 data 執行時，缺少的 replacement 會由 base 補上，所以不能當完成率證明。若只傳 `zhangfei.txt`，也完全看不到選角合成圖、Stage 01、`bing` 和補給箱。
3. `prepare-openbor-smoke.mjs` 預設使用 workspace overlay，而私人 overlay 必須明確傳入 `--overlay`。它建立的 exact-case alias 會讓 staging 可啟動，但也可能遮蔽原始大小寫債務；case/parity 應在 alias 產生前先驗。
4. `run-openbor-smoke.sh` 的非 GUI preflight 只確認 binary、`data/models.txt`、sentinel 與目錄，不會自動跑 coverage/parity。12 秒有界啟動也不保證已走到選角或 Stage 01，更沒有畫面像素 assertion；仍需人工巡覽或另做固定輸入／截圖測試。
5. Docker headless smoke 可證明 Linux engine 完成 module/model load，但沒有可視 gameplay assertion，也不代表 Windows／macOS build 已驗證。成功編譯與載入仍不能單獨證明素材替換完成。

## 限制

位元組不同只代表檔案被改過，不能證明「正確位置真的畫成無敵鐵金剛／機械兵」。`select.gif` 是合成圖，也無法由檔案雜湊判斷改到哪一個角色區塊。以下仍需人工或影像差分規格：

- 張飛 slot 的肖像與站姿是否真的替換。
- 腳底、Offset、BBox、attack box 與動作流暢度。
- 長背景的 wall／hole 對位及 `f.GIF` 遮擋。
- 敵人受傷、倒地、死亡是否沒有閃回原圖。
- 私人 manifest 的 `productionReady: false` 與 pose reuse 警告是否已解除。
