# ν Gundam 第六角色 P0 vertical slice

這批把 ν Gundam 加成第六個**可選角色**，不取代既有五人，也不把同時玩家數改成六人。它是 private engineering runtime：71 張動作 GIF、模型 icon、2 張 HUD profile、六欄選角底圖，以及一次發射六個不同 Z-depth projectile 的 Fin Funnel P0 代理模型。它已通過 deterministic build、靜態閉包與 Docker OpenBOR v7533 model-load；尚未通過可見畫面的選角操作、進關、1P／2P 或 production 動畫驗收。

![ν Gundam P0 engineering preview：六人選角、Funnel 指令、步槍、idle、boost 與倒地](../research/previews/nu-gundam-sixth-character-p0-engineering-preview.png)

上圖由 private runtime GIF 可重現合成，是 engineering composite，不是 runtime capture。

![六人機器人選角 overview](../research/ui/six-robot-selection-screen-v1-overview.png)

![ν Gundam 16 格 overview-only review image](../research/nu-gundam/nu-gundam-sixth-character-storyboard-v5-overview.png)

公開 repo 只保留完整總覽、文件、manifest 與重建／驗證腳本；可拆用的單張 GIF、key pose、模型 TXT 與高解析來源存放於 private 素材 repo。

## 已完成的工程閉包

| 類別 | 實測結果 |
| --- | --- |
| 主角色 | 71 action GIF＋`icon.GIF`＋identity palette `red.gif`＝73 個主模型 GIF refs |
| HUD | `nu_gundam.gif`、`nu_gundam_m.gif`，35×54 opaque indexed GIF |
| 選角 | 480×276 六欄 indexed GIF；原五欄依 nearest-neighbour 從 96px 重排為 80px，第六欄由 ν key poses 合成 |
| 候選名單 | `guanyu → zhangfei → zhaoyun → huangzhong → weiyan → nu_gundam`；`tiefeifp`／`xiahoudunp` 明確排除 |
| Fin Funnel P0 | `nu_funnel_shot` 獨立模型、3 張 indexed GIF；一次 command 生成 6 發，Z-depth 為 `-25/-15/-5/5/15/25` |
| Runtime batch | 81 個非 manifest 檔案；兩次 fresh Docker build 逐檔 byte-identical |
| 合併 overlay | `data/` 585 files：548 GIF＋37 other |

P0 Funnel 是可載入、可傷敵、不傷 player／npc 的六發 projectile proxy，用來驗證 entity 註冊、路徑閉包與 command wiring。它不是會釋放、浮游、轉向、充能、射擊、返回的六枚自主 drone；那是 P1。

## 幾何與透明色契約

- 71 張動作沿用黃忠 slot 的 canvas 與前景中心／腳底幾何契約，但不沿用人類武器切換。
- `weapons h1..h16`、`hmap`、3 個 `weaponframe` 已移除；spawn script 只保留 `setLevel()`，不再 load 人類 weapon models。
- 所有透明 GIF 都是 indexed GIF，palette **index 0** 精確為 `#FC00FF`（RGB 252,0,255）。
- 71 張 placement 實測 `clamp=0`、新增 canvas edge=0、最大中心／腳底漂移 1px；最小 safe scale ratio 約 0.9841。
- HUD 圖仍保留 index 0 `#FC00FF`，但 opaque pixel data 不使用 index 0，避免洋紅洞。

frame 10 的長 beam 與 frame 13 的背部 Funnel rack 已畫在 canonical key pose；切圖時不可誤當成已分離 entity。runtime builder 目前分別把它們當 saber／command pose 使用，P1 才會把飛行、命中與返回完整分離。

## Docker 隔離重建

先建立固定 Node 22＋FFmpeg 的素材 image；不要在 host 安裝 FFmpeg 或 Node 套件：

```bash
docker build -f docker/asset-tools.Dockerfile \
  -t openbor-asset-tools:local .
```

以下把 public repo 掛在 `/repo`、private workspace 掛在 `/workspace`、一次性輸出掛在 `/out`。先建立六欄選角圖，再建立 ν runtime：

```bash
docker run --rm --user "$(id -u):$(id -g)" \
  -v "$PUBLIC_REPO:/repo:ro" \
  -v "$PRIVATE_WORKSPACE:/workspace:ro" \
  -v "$OUT:/out" \
  openbor-asset-tools:local \
  /repo/scripts/build-six-robot-selection-runtime.mjs \
  --base-gif /workspace/private_assets/robot_wof/ui/runtime/select-getter-v2.gif \
  --portrait /workspace/private_assets/robot_wof/nu_gundam/keyposes-v5/frame-01.png \
  --body /workspace/private_assets/robot_wof/nu_gundam/keyposes-v5/frame-03.png \
  --output /out/select-six.gif \
  --manifest /out/select-six-manifest.json

docker run --rm --user "$(id -u):$(id -g)" \
  -v "$PUBLIC_REPO:/repo:ro" \
  -v "$PRIVATE_WORKSPACE:/workspace:ro" \
  -v "$OUT:/out" \
  openbor-asset-tools:local \
  /repo/scripts/build-nu-gundam-p0-prototype.mjs \
  --source-dir /workspace/private_assets/robot_wof/nu_gundam/keyposes-v5 \
  --keypose-manifest /repo/research/manifests/nu-gundam-sixth-character-v5-keyposes.json \
  --base-data /workspace/workplace/extracted/data \
  --template-data /workspace/workplace/robot_wof_vertical_slice/overlay/data \
  --selection-gif /out/select-six.gif \
  --output-dir /out/nu-runtime
```

把 ν batch 合併到一次性 overlay 後，補上 roster TXT：

```bash
node scripts/patch-six-player-select-overlay.mjs \
  --data-dir "$PRIVATE_WORKSPACE/workplace/extracted/data" \
  --output-dir "$MERGED_OVERLAY" \
  --require-closure

node scripts/patch-six-player-select-overlay.mjs \
  --data-dir "$PRIVATE_WORKSPACE/workplace/extracted/data" \
  --output-dir "$MERGED_OVERLAY" \
  --check --require-closure
```

正式 active overlay 只接受已通過驗證的一次性目錄；不要直接把 builder 指向 `workplace/extracted/`。

## 實際驗證結果

| Gate | Result |
| --- | --- |
| Determinism | 兩次 fresh build；81/81 non-manifest files byte-identical，manifest 只差 `generatedAt` |
| ν validator | 71 action GIF、73 model GIF refs、98 exact-case data refs、missing=0 |
| Placement | clamp=0、added edge=0、最大 anchor drift=1px |
| 六人 patch unit test | 13 assertions PASS；重複執行不改 TXT bytes |
| Roster closure | 6 candidates；Funnel 必須先 `Load`，再 `Load nu_gundam`；排除兩個 player-style 敵人 |
| Strict model refs | ν 主模型 73 resolved GIF；Funnel 3 resolved GIF；selection 1 resolved GIF |
| Docker OpenBOR | v7533 cache `nu_funnel_shot`、`nu_gundam`，到 `Loading models... Done!` |
| Bounded smoke | exit 124 是 timeout 預期值；載入完成後的舊引擎 teardown double-free 不當作 gameplay PASS |

機器可讀證據見 [`nu-gundam-sixth-character-p0-runtime-audit.json`](../research/manifests/nu-gundam-sixth-character-p0-runtime-audit.json)。

## 明確 deferred

- 可見 runner 的左右循環、游標、Ready、1P／2P 選 ν、`nosame 1`、進入 Stage 1 與 runtime screenshot。
- 六枚自主 Fin Funnel drone 的 release／orbit／turn／charge／beam／hit／return／owner-death cleanup 與雙人壓力測試。
- rifle muzzle、saber arc、獨立 impact／return FX、原創音效，以及目前暫留的 Huang projectile／sound dependencies。
- 16 個 key pose 的 production in-between、walk cadence、attack anticipation/contact/recovery、受擊、起身與死亡。
- BBox、attack box、spawn origin、實戰腳底／深度排序與 2P 視覺 QA。

因此目前正確狀態是「ν Gundam 第六角色 P0 engineering runtime 已通過 deterministic、strict 與 v7533 model-load」。不能稱為 production-ready，也不能宣稱已完成整款機器人大戰版。

下一輪若要繼續收斂成可驗證提交，請直接看 [`../research/manifests/nu-gundam-next-queue.json`](../research/manifests/nu-gundam-next-queue.json)；那份檔案把六人選角、Funnel P1、音效與 gameplay QA 列成 pending queue。
