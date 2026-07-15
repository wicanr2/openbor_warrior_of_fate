# 藍盔巡邏機 Stage01 vertical slice

這是 `robot_wof_enemy` 參考頁轉譯出的第一套**原創**機械雜兵工作包。參考頁只提供「匿名量產兵、藍色頭盔、遮面面罩、冷色鏡片、軍階條」的視覺語彙；遊戲圖不是從雜誌或截圖裁切。

![藍盔巡邏機 12 格分鏡總覽](../research/enemy/blue-helmet-grunt-storyboard-v1-keyed.png)

## 目前狀態

| 項目 | 結果 |
| --- | --- |
| 原創分鏡 | 12 格；portrait、idle、walk、近戰、遠程、受傷、擊飛、倒地、起身、機械破壞 |
| `bing` 專屬實體圖 | 42/42 engineering coverage：31 主動畫＋1 icon＋6 Map＋4 `bingxs` |
| 主模型 strict | 212 次引用、38 個唯一圖檔全部解析 |
| `bingxs` strict | 20 次引用、10 個唯一圖檔全部解析；其中 6 個是共用 Map、4 個是分離幀 |
| overlay parity | 83 GIF＋2 TXT 全部有 exact-case base counterpart；canvas、indexed GIF、index 0 通過 |
| Docker smoke | OpenBOR v7533 cache `bing`／`bingxs` 並到 `Loading models... Done!` |
| 美術狀態 | `productionReady: false`；12 姿勢重用到 42 張，25 張 placement 有 clamp |

這些結果證明引擎契約與載入流程成立，不代表 42 張美術已完成。所有 prototype／manifest 都必須保留非 production 標記。

## 12 格用途

| 格 | Role | 目前 OpenBOR 用途 |
| ---: | --- | --- |
| 01 | communication portrait | 24×36 `icon.GIF` 的重畫底稿 |
| 02 | idle | `idle00`、walk settle、identity Map |
| 03 | walk contact | `walk001`／`walk003` |
| 04 | walk passing | `walk002`／`walk004` |
| 05 | melee wind-up | `a1`／`a4` |
| 06 | electro-spear thrust | `a2`／`a3`／`a5`、粗略 aerial strike |
| 07 | rifle aim | 保留給 `shooter`；`bing` 沒有 projectile，不能假裝開槍 |
| 08 | hit recoil | pain／electric pain variants |
| 09 | airborne knockback | fall／special-death 中段 |
| 10 | prone down | 可起身的地面倒地幀 |
| 11 | rise recovery | jump preparation／spawn／rise 的工程替身 |
| 12 | destroyed collapse | 專屬破壞終態與 `bingxs` 機械碎片底稿 |

`frame-07` 沒接到 `bing` gameplay 是刻意決策：原 `attack1/2` 都是近戰 hitbox。若用持槍畫面卻保留近戰判定，玩家會看到「開槍但近身才受傷」的錯誤回饋；它應在 `shooter` 工作包連投射物與 muzzle FX 一起實作。

## 為何不能直接切圖

生成原圖是 1448×1086 RGB PNG，但不是均勻 4×3 網格：

- 垂直白線／暈邊約在 x=359–363、721–726、1082–1087。
- 水平白線／暈邊約在 y=359–363、712–716。
- 最常見背景約 `#F703F8`；精確 `#FC00FF` 只有 7 個像素。

因此不能用 362×362 等分，也不能把「看起來像洋紅」當作已符合 OpenBOR。安全 crop、foreground bbox 與來源 SHA-256 都在 [`blue-helmet-grunt-keyposes.json`](../research/manifests/blue-helmet-grunt-keyposes.json)。

切格並正規化：

```bash
node scripts/slice-blue-helmet-grunt-storyboard.mjs
```

腳本會：

1. 使用已稽核的 12 個非等分 crop，完全排除白線與暈邊。
2. 將 `R>=180 && B>=180 && G<=160 && abs(R-B)<=40` 的生成背景改為精確 RGB `#FC00FF`。
3. 保留第 08／09／12 格的離散裝甲碎片，不用最大 connected component 誤刪。
4. 輸出私有單格 PNG、公開安全的無格線總覽及 machine-readable manifest。

## 建立 `bing` engineering overlay

```bash
node scripts/build-blue-helmet-grunt-p0-prototype.mjs \
  --source-dir private_assets/robot_wof/enemy/blue-helmet-grunt/keyposes \
  --extracted-dir workplace/extracted/data/chars/army/1 \
  --output-dir local-only/robot_wof_vertical_slice/overlay
```

Builder 保留每張原 canvas 與實體檔名大小寫，依 animation Offset 放置，再輸出 indexed GIF 並強制 palette index 0=`#FC00FF`。輸出範圍：

| Package | 數量 | 說明 |
| --- | ---: | --- |
| 直接動畫 GIF | 31 | idle、walk、attack、jump、pain、fall、death、spawn |
| HUD icon | 1 | `data/chars/army/1/icon.GIF`，24×36；production 需人工像素重畫 |
| alternate palette | 6 | `map1.gif`–`map6.gif` 暫為與 `idle00` byte-identical 的 identity palette，避免沿用舊人物色盤 |
| `bingxs` | 4 | `1/a1.GIF`–`a3.GIF` 機械破壞底稿，`a4.GIF` 保持 1×1 空白 |

六張 Map 不可各自獨立量化：OpenBOR 的 alternate palette 依 palette index 對應；prototype 先使用同一 indexed raster，正式版再只調 palette table，index 0 永遠不動。

## 機械死亡與 Linux exact-case

只換 42 張圖仍不夠。原 `bing.txt` 的 `death5`／`follow9` 會 spawn `blood*` 並 toss 共用人體碎塊 `quans`。Builder 另外產生私有 model overlay：

- 移除 12 行 `blood*` spawn。
- 把 `quans` 改為 `bingxs`；不覆寫其他敵人共用的全域人體素材。
- 正規化主模型 10 組、子模型 4 組 `.gif`／`.GIF` 引用，讓 Linux strict validation 不靠 staging alias。

目前仍沿用部分人類音效；機械腳步、受擊、破壞聲是後續 audio pass，不應拿影像 smoke 當作音效完成證明。

## 驗證順序

1. 對 overlay 跑 exact-case／canvas／indexed GIF／index0 parity。
2. 建立 disposable merged stage，不修改 `workplace/extracted`。
3. 對 `bing.txt`、`1/bingxs.txt` 分別執行 strict asset validator。
4. 使用 [`run-openbor-smoke-docker.sh`](../scripts/run-openbor-smoke-docker.sh) 在 Docker 內載入；不要在 host 安裝引擎相依套件。
5. 最後仍要在可顯示畫面的 runner 人工測 walk 滑步、矛尖與 attack box、擊飛／起身、Map 配色與特殊死亡。

OpenBOR v7533 在 bounded timeout 收到 TERM 後可能輸出既知的 teardown `double free or corruption`；只有在 Log 已先到 `Loading models... Done!` 且沒有模型載入錯誤時，才可把這次 headless load gate 判為通過。

## Production 缺口

- 補三個獨立 walk transition，不能長期重用 contact／passing／idle。
- 補四個真正 jump／airborne 姿勢與 aerial attack。
- 為 attack1／2 畫完整前搖、命中、收招；武器尖端逐格對 attack box。
- 將第 12 格拆成三張真正的機械碎片／落地／靜止 `bingxs`。
- 24×36 icon 人工像素整理，避免縮圖糊成一團。
- 為 fire／electric pain 製作專用 palette，而不是重用同一受擊姿勢。
- 25 個 clamp placement 全部逐格人工校正後，才能把 manifest 改成 `productionReady: true`。
