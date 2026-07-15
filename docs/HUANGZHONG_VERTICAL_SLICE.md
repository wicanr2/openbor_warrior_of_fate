# 黃忠蒼藍光子射手機 P0 vertical slice

本批次把黃忠 `huangzhong` slot 做成白／藍／紅的遠距射手機器人 **private engineering prototype**，並首次把角色本體、HUD、弓箭替代投射物、爆炸／命中特效放進同一個可重建閉包。它用來驗證 OpenBOR 原畫布、Offset、Linux exact-case、indexed GIF 與 v7533 model-load，不是逐格完成的 production 動畫。

![黃忠 P0 engineering preview：HUD、idle、光子步槍、飛彈 special、倒地與投射物](../research/previews/huangzhong-p0-engineering-preview.png)

這張成果圖直接由 private overlay 的實際 GIF deterministic 合成，不是 runtime capture。它證明目前工程輸出已能產生 HUD、站姿、步槍射擊、special、倒地與 projectile／impact 圖，而不是只停留在概念圖。

![黃忠蒼藍光子射手機 16 格 overview-only review image](../research/huangzhong/huangzhong-azure-photon-ranger-storyboard-v1-keyed.png)

![黃忠光子投射物與 FX 16 格 overview-only review image](../research/huangzhong/huangzhong-photon-projectile-fx-storyboard-v1-keyed.png)

兩張 16 格圖依 repo policy 只作完整總覽與美術審查，不是可拆用的 production sprite sheet，也不代表已完成權利清查或可公開散布審核。

## 實測範圍

| Batch 類別 | Files | 說明 |
| --- | ---: | --- |
| 黃忠主模型 GIF | 73 | 71 張 active-player GIF，加上 `icon.GIF` 與 identity-palette `red.gif` |
| HUD profiles | 2 | `data/profiles/huangzhong.GIF`、`huangzhong_m.GIF` |
| 有效投射物 GIF | 22 | `gongjz`、`gongjx`、`gongjx1`–`3`、`gongjfz`、`gongjfx`、`gongjfp` 八個 model 的 union |
| Shared FX palette normalization | 57 | `blackh`、flash、dust、dust2、bflash 等共用 FX |
| TXT／scripts | 11 | 主模型、black、3 個需修 case 的 projectile model、Jflash、fire、models 與 3 個 scripts |
| 本批次 | **165** | 73＋2＋22＋57＋11；build manifest 另計 |
| 合併後 overlay `data/` | **503** | 470 GIF＋33 other files |

165 是本次可重建輸出集合，不包含 `HUANGZHONG-P0-BUILD-MANIFEST.json`；503 是與先前角色、敵人、Boss、背景、UI 合併後的 unique path 數。共用 FX 路徑會覆蓋／重用，不能直接把各批次數量相加。

## 主模型與投射物閉包

主模型的 73 張實體圖涵蓋 idle／select、walk、正常步槍攻擊、special、jump、grab、pain、fall／rise 與 block。主 TXT 有 438 次圖像引用，解析成 73 個 exact physical paths；畫布維持原規格：

- `172×116`：57 張一般動作。
- `136×136`：8 張 walk。
- `220×116`：7 張 special。
- `35×54`：`icon.GIF`。

八個 projectile model 的有效圖像 union 是 22 張，不把共用 `empty.GIF` 重複算入：

```text
a01.GIF a02.GIF a1.GIF b1.GIF fall.GIF goj.gif
sa1.gif sa2.gif sa3.gif sa4.gif
spa01.gif spa05.GIF spa06.GIF spa07.GIF
spa1.gif spa2.gif spa3.gif spa4.gif
sx1.gif sx2.gif sx3.gif sx4.gif
```

16 格 projectile storyboard 的第 15 格含 5 組燃燒機械零件，第 16 格含至少 6 組 projectile／impact 元素。P0 可把這兩格當工程 inventory 來源；production 必須把每一個物件重新獨立裁切並定義 flight center、impact origin 或旋轉 pivot，不能沿用 group pivot。

## 安全裁切與透明色

主角色草圖不能用固定四等分：01–04、08、12–16 的前景跨過名義格線。第 08 格的 beam pellet、第 12 格的兩枚飛彈都必須納入各自 union crop；第 15 格確認只有兩腿兩腳，沒有缺腳、多腳或鄰格污染。

投射物草圖的 16 格沒有跨名義格線，但仍使用逐格 12 px safe crop；第 15／16 格只供 inventory review。

- 所有透明角色／FX GIF 都是 indexed GIF。
- palette **index 0** 必須精確為 `#FC00FF`，RGB `(252, 0, 255)`。
- `#FF00FF`、近似漸層洋紅、alpha 或 GIF transparency flag 都不能替代此契約。
- 兩張 35×54 HUD profile 是 opaque；palette slot 0 仍保留 `#FC00FF`，但 pixel data 不使用 index 0。

## 建立 private overlay

```bash
node scripts/slice-huangzhong-storyboard.mjs \
  --source private_assets/robot_wof/huangzhong/huangzhong-azure-photon-ranger-storyboard-v1.png \
  --output-dir private_assets/robot_wof/huangzhong/keyposes \
  --contact-sheet research/huangzhong/huangzhong-azure-photon-ranger-storyboard-v1-keyed.png \
  --manifest research/manifests/huangzhong-azure-photon-ranger-keyposes.json

node scripts/slice-huangzhong-projectile-fx-storyboard.mjs \
  --source private_assets/robot_wof/huangzhong/huangzhong-photon-projectile-fx-storyboard-v1.png \
  --output-dir private_assets/robot_wof/huangzhong/projectile-keyposes \
  --contact-sheet research/huangzhong/huangzhong-photon-projectile-fx-storyboard-v1-keyed.png \
  --manifest research/manifests/huangzhong-photon-projectile-fx-keyposes.json

node scripts/build-huangzhong-p0-prototype.mjs \
  --source-dir private_assets/robot_wof/huangzhong/keyposes \
  --projectile-dir private_assets/robot_wof/huangzhong/projectile-keyposes \
  --selection-source private_assets/robot_wof/ui/five-robot-selection-screen-v1.png \
  --data-dir workplace/extracted/data \
  --output-dir workplace/robot_wof_vertical_slice/overlay

node scripts/build-huangzhong-engineering-preview.mjs \
  --workspace /path/to/private-project-workspace \
  --output research/previews/huangzhong-p0-engineering-preview.png
```

不要把任何輸出寫回 `workplace/extracted/`。高解析生成來源、獨立 key poses、可直接遊玩的 GIF、PAK、音效與第三方 reference 都留在 private workspace；GitHub 只保存文件、腳本、manifest 與 policy 允許的完整總覽／成果展示圖。

## 相容性修正

- `huangzhong.txt` 修正 27 組大小寫債務，共 142 次 Frame／icon 引用。
- `blackh`、三個 projectile model、`jflash03`、`fire`、`models.txt` 與 scripts 再修 45 次 exact-case 引用；本批次合計 187 次 Linux/macOS path-case reference fixes。
- 主模型的 5 個 `hitflash blood2` 局部改成機械火花 `flashb`，避免黃忠 P0 受擊鏈閃回人體血液語彙。
- `gongjz` 的 `goj.GIF` 與實檔 `goj.gif`、`gongjfx`／`gongjfp` 的 `spa05`–`07`、`jflash03` 的 `goj1`、`fire` 的大寫副檔名均按 physical filename 修正。
- 既有 5 個 Linux script include case fixes 與兩個 `models.txt` case fixes 由本 builder 重現，因此單獨重建黃忠批次也能通過 Docker。

## 實測驗證結果

| Gate | Result |
| --- | --- |
| Huang Zhong batch | 165 files：73 main＋2 profiles＋22 projectile＋57 shared FX＋11 TXT/scripts |
| Merged overlay parity | 503 files：470 GIF＋33 other；canvas、indexed GIF、index 0 全 PASS |
| Main model strict | 438 occurrences／73 resolved paths，全 PASS |
| Auxiliary strict | 8 projectile models＋blackh＋9 shared/runtime models；連同主檔共 **19 TXT** 全 PASS |
| Deterministic rebuild | fresh output 比對 165／165 non-manifest files byte-identical；manifest 除 `generatedAt` 外一致 |
| Docker OpenBOR | `v7533`／commit `5c82614` 到 `Loading models... Done!` |
| Bounded smoke exit | `124`；到達載入閘門後 timeout，屬預期結果 |

另一份較新的 CMake OpenBOR binary 會拒絕此舊模組的 GIF background，不能拿來判定素材失敗。本工程的相容基線是文件鎖定的 v7533。v7533 收到 TERM 後可能印出 double-free；只有在 TERM 前已到 `Loading models... Done!` 時，才能把它記成既知 teardown，而不是 gameplay PASS。

2026-07-16 的 Linux headless smoke evidence 已另外記錄於 [`../research/HUANGZHONG_LINUX_SMOKE.md`](../research/HUANGZHONG_LINUX_SMOKE.md)。

## 明確 deferred

- `h1`–`h16`：騎乘、武器變體、水中弓箭手、子模型、綁定特效與相關投射物。
- 逐格動畫：目前 16 pose 仍大量重用；要補 anticipation、contact、recovery、walk cadence、recoil 與 death cleanup。
- 第 15／16 格 projectile inventory 的逐件拆圖與獨立 pivot。
- BBox、attack box、槍口位置、beam／missile flight origin、grab、fall、landframe 與 2P 實戰驗收。
- `gongjian.wav`、`huangzhong/sp.wav` 及跨角色聲音的原創機械化音訊 QA。
- 可見 runner 的選角、HUD、完整攻擊鏈、二人同屏與 runtime screenshot。

因此正確狀態是「黃忠 active-player＋projectile P0 engineering overlay 已通過 parity、strict、determinism 與 v7533 model-load gate」。在上述 deferred 關閉前，不得稱為完整黃忠、production-ready 或已完成遊戲。

## 藝術家下一步

1. 先鎖定 idle、walk、盾牌與步槍比例，避免每幀額角、槍托與腳底漂移。
2. 優先把正常射擊做成 aim／muzzle／recoil／recover 真正四段，再處理 dual-missile special。
3. 每張投射物建立 flight center；每張地面爆炸建立 impact origin；火焰零件建立旋轉中心。
4. 逐幀核對 muzzle、Offset、BBox、attack box 與 projectile spawn command，不只看圖像中心。
5. active player 完成 pixel review 後，再展開 `h1`–`h16` 與聲音替換。
