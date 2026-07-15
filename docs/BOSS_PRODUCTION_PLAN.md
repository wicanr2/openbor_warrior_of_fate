# Boss 圖像製作與 OpenBOR 整合計畫

這份文件把本機 `robot_boss/` 的三張概念頁轉成可由多位藝術家並行製作的工程規格。概念頁只用來辨識角色類型、尺度、氣氛與配色；第三方圖像、雜誌排版、遊戲截圖及既有角色造型不會進入公開 repository，也不能直接裁切成 sprite。

公開總覽請先看 [`enemy-boss-roster.svg`](../research/diagrams/enemy-boss-roster.svg)，原始槽位研究見 [`ENEMY_BOSS_CONCEPT_MAP.md`](../research/ENEMY_BOSS_CONCEPT_MAP.md)。

本輪已完整盤點目前 active 主線 Stage 1–3：`data/chars/boss` 有 43 個 model TXT，`models.txt` 的 boss-path 註冊中有 34 個可解析、14 個缺檔（`xiahoujie` 系列 5 個、`ECaller1`–`ECaller9` 9 個）。因此可以承諾現有四個主線 gate 的製作 scope，不能宣稱後期全遊戲 Boss 已盤齊。

## 目前最優先的 Boss 工作隊列

| 優先級 | 工作包 | 現況 | 先做的交付 |
| --- | --- | --- | --- |
| P1 | `zeon_boss`／夏亞有腳吉翁克 | overview 已有，67 張 runtime 閉包仍未完成 | 先補 `zeon_boss` 主體 48 張、`boss_hud.gif`、`char_pilot.gif`／`zeon_boss.txt`，再處理 projectile／debris 子模型 |
| P1 | `xuchu`／玄鐵鎮壓機 | 只有設計 brief，未進 runtime  | 先定 `G0` 縮尺版 body、受傷／倒地、巨型主角機剪影與 `geometry-migration.json` 模板 |
| P1 | `xiahorse`／蒼雷騎將 | 依賴拆分複雜，尚未進 production | 先分離載具／駕駛員與 300 HP 門檻，補足 phase 1／phase 2 與 `horse`／`lei3` 替代依賴 |
| P1/P2 | `meimei`／`meiya`／`meiling` | 三名 adult-coded Boss 的名稱與輪廓已鎖定，production art 未起 | 三套 body、三套 portrait、共同 rig 與同屏合成總覽，避免只做三張換色圖 |
| P0/P1 | `lidian` 紅槍指揮機 | 69 GIF＋6 TXT engineering closure 已完成 | 逐幀 production redraw、碎片與 Boss show 的可視 gameplay review |

這份隊列刻意把 `overview`、`runtime closure`、`production art` 三個狀態分開。只有能獨立載入、可驗證且可交給別人接手的工作包，才應排進近期製作。

如果要直接抓下一批可以執行的 Boss 工作，請看 [`../research/manifests/boss-next-queue.json`](../research/manifests/boss-next-queue.json)；那份檔案把目前仍待收斂的 Boss 任務拆成 pending queue。

## 概念頁提供的方向

| 私有概念頁 | 可辨識的設計方向 | 可用搜尋名稱 | 本專案處理方式 |
| --- | --- | --- | --- |
| `robot_boss/721248…jpeg` | 黑紫能量、巨大幕後操控者、核心／魔王輪廓、英雄與黑幕對決 | 海報主題文字可辨識為「羅亞與闇腦」；逐一角色不做公開對應 | 只取「英雄機對抗宇宙核心巨體」的敘事結構；外露腦、胸像輪廓、標誌與文字都不能重製 |
| `robot_boss/727904…jpeg` | 約 50 台機器人的高度比較；後排有約 200m 級巨型機 | 圖中沒有逐機標籤；Gunbuster 是使用者提出的 private 尺度例子，其他名稱不猜測 | 先在既有 Boss slot 做縮尺版；真正巨型戰另開 gameplay branch，公開 roster 全部改用原創名稱 |
| `robot_boss/730001…jpeg` | 女性角色設計回顧，並非原作 Boss roster；華麗服裝、髮型與氣質差異 | 只可確認頁面文字提到設計師河野さち子；五名角色姓名／年齡不能由未標註 collage 可靠判斷 | 三名戰鬥 Boss 必須明確成年且全新設計；不可沿用幼態比例、相似臉、髮型、制服或配色 |

這些名稱是團隊溝通與搜尋用的靈感標籤，不是素材授權。正式公開版本建議使用原創代號與原創造型；若團隊決定保留任何既有 IP 名稱或外觀，發行前需另做權利確認。

private notes 可保留團隊提出的第三方例子來討論尺寸與節奏，但 public production name、剪影、頭冠、胸徽、配色、武器及故事設定都必須原創。概念圖中的人物／機體若沒有清楚標籤，一律記為 `unconfirmed private reference`，不能把推測寫成公開事實。

## 主線 Boss 槽位

| 順序 | OpenBOR slot | 已盤點的私有 scope | 現有玩法契約 | 原創替換 brief／完整交付 |
| --- | --- | ---: | --- | --- |
| B1 | Stage01 `lidian` | 69 GIF | 長柄武器指揮官；wrapper＋include；52 主體／Boss show，另有四組私有子模型 | `Crimson Marshal／緋紅督戰官`：紅色重裝、青色核心、藍黑能量長槍；69 GIF＋6 TXT engineering closure 已完成，仍需逐幀 production redraw 與可視 gameplay review |
| B2 | Stage02 `xiahorse` | 91 GIF＋外部依賴 | 400 HP 騎乘 Boss；低於 300 HP 分離；phase 1 為 35 張、phase 2 為 49 張，另有 7 張碎片與 1 張空白終態 | `RB-SPLIT-02`：四足突擊載具搭載原創王牌；91 張私有包、`horse` 13 張、`lei3` 10 張、FX、分離過場與兩階段死亡一起交付 |
| B3 | Stage03A `xuchu` | 53 GIF＋外部依賴 | 470 HP 重裝近戰；44 張主體／Boss show＋9 張私有分離模型；重擊、衝撞、砸地與抓投 | `Iron Bastion／玄鐵鎮壓機`：原創黑橙重裝大型英雄機鏡像；全主模型、私有分離模型、重拳／重擊 FX、完整受傷／死亡及 icon；放大時附 geometry migration manifest |
| B4 | Stage03B `meimei`／`meiya`／`meiling` | 126 GIF＋共用 `knifea` 2 GIF | 每人 41 張 110×82 body＋一張 480×272 portrait；三名 Boss 同場，技能契約相近 | `Cinder Ace／Jade Strategist／Ivory Regent`：暖紅近戰、冷綠區控、月白旗艦三位成年王牌；三套 body／肖像、共用投射物與 FX、所有特殊受傷／倒地幀，不能只改 palette |
| B5 | `xiahoujie`／後期新增 phase | 原始來源缺件 | `models.txt` 有登記，但 extracted tree 缺 `data/chars/boss/xiahoujie/`，目前不能驗證 | 槽位保留給 `RB-CORE-FINAL` 或另一台超大型主角機；先補回合法來源，再承諾張數、玩法與完成日 |

上述數字是去重後的 physical GIF 工作量，不是 model TXT 的 Frame 行數。`lidian` 的人體血液／器官依賴已只在私有 overlay 內改成 `Flashb`、`Dust` 與 Lidian-local 機械碎片；`xiahorse`、`xuchu` 仍待同樣處理。不能覆寫仍被其他人物使用的 shared gore。

`lidian` 必須區分兩個數字：現有 runtime semantic closure 是 **175 unique physical GIF**，而藝術家需要直接重畫的 boss-specific 包可藉由 local 機械死亡 remap 收斂為 **69 GIF**（52 body／Boss show＋9 分離碎片＋8 投擲物／能量膠囊）。69 不是把 175 的 runtime 驗證責任刪掉；strict 與 Docker 仍要載入完整 child／shared closure，才能確定沒有缺圖或閃回舊素材。

## 原創 Boss roster 與巨大戰 reserve

| Engine slot／branch | 原創暫名 | 類型 | 必須保留的 gameplay silhouette |
| --- | --- | --- | --- |
| `lidian` | Crimson Marshal／緋紅督戰官 | 中型紅槍指揮機 | 長柄武器、橫向大揮擊、Boss show；Stage01 engineering closure 已完成 |
| `xiahorse` | Storm Lancer／蒼雷騎將 | 成年女性騎兵隊長＋四足突擊機 | 騎乘高度、長距離衝刺、寬底盤與 phase 分離 |
| `xuchu` | Iron Bastion／玄鐵鎮壓機 | 無人或成年駕駛的重裝超級機器人 | 巨拳、寬肩、低重心、重擊；G0 約玩家 1.25–1.45 倍並保持在 viewport 內 |
| `meimei` | Cinder Ace／紅蓮王牌 | 明確成年女性近戰 ace | 暖紅、短距連擊、清楚手腳剪影，避免幼態比例 |
| `meiling` | Jade Strategist／青磁戰術官 | 明確成年女性戰術官 | 冷綠、匕首／浮游裝置、區域控制；臉與制服不可和其他兩人共用 |
| `meiya` | Ivory Regent／月白旗艦主 | 明確成年女性隊長／變形機駕駛 | 月白＋深紫、披肩式裝甲；先確認 mounted-like action manifest |
| G1 reserve | Zenith-0／天極零號 | 原創 120–200m 級失控原型主角機 | 背景軀幹＋可攻擊頭／手／核心＋分段攻擊，不能只放大 `xuchu` sprite |
| Final reserve | Violet Synapse／紫曜星核 | 原創宇宙要塞／最終 AI | 幾何神經晶格、環狀光輪、可破壞核心與多 phase；避開概念海報的外露腦胸像 |

`robot_boss/` 內的三張圖只留在 private mood-reference。禁止描圖、裁切、換色或重製其中的角色、機體、標誌與文字；public repository 只保存上述原創 brief、輪廓總覽、manifest、替換對照與自行製作的成品。

## 美女 Boss 三人組分工

三人可以共用 technical rig、命名慣例與 palette 編排，但不可交付三套換色人物。三人同屏時必須只靠輪廓就能辨識。

| ID／slot | 戰鬥角色 | 輪廓與主色 | 武器／FX | 肖像要求 |
| --- | --- | --- | --- | --- |
| `Cinder Ace`／`meimei` | 高速近戰壓制 | 短披肩、寬腿近戰輪廓；暖紅＋深灰 | 熱能短刃、短距突進光 | 自信成年王牌；64×94 通訊圖與小 icon 均需原創重畫 |
| `Ivory Regent`／`meiya` | 旗艦／變形壓制 | 披肩式裝甲、較高輪廓；月白＋深紫 | 展開式長刃、折疊翼／盾 | 成年原創隊長；不可沿用 A 的臉型、瀏海、制服或肩線 |
| `Jade Strategist`／`meiling` | 戰術／區域控制 | 高領、環形感測器、窄輪廓；冷綠＋黑 | 浮游裝置、低亮度區域標記；`knifea` 重畫為控制彈 | 成年原創戰術官；不能用大面積 FX 長時間遮住另外兩人 |

每名角色至少要單獨審核 portrait、idle、walk、attack、projectile pose、pain、airborne、fall、rise、special、death。三人全套完成後，再做「三 Boss 同屏」合成總覽，公開 repo 只收這張原創審稿總覽，不收可直接抽出的逐幀 production GIF。

## 巨型主角機 Boss 的兩條路

### G0：縮尺換圖版，先完成

- 保留原 model TXT、動畫 Delay、canvas、Offset、BBox、attack、鏡頭與關卡幾何。
- 實戰高度控制在玩家約 1.25–1.45 倍；Gunbuster／Daitarn／Ideon 只作尺度與招式節奏的搜尋詞。
- 用低角度登場、畫面震動、背後陰影、局部特寫、重腳步與 arena 美術製造巨大感。
- 優先放在 `xuchu`；這條路可沿用 overlay parity validator，風險最低。

### G1：真正超巨大戰，後續獨立分支

- Boss 主體成為背景或固定 entity；拳、頭、核心、炮口等部位才進入可攻擊區。
- 需要專用 camera、arena、spawn、phase、BBox／attack、死亡與 blockade 邏輯。
- 不能宣稱只是 sprite replacement，也不能為了通過檢查而關掉 canvas parity。
- 適合 `RB-CORE-FINAL` 或約 200m 級原創主角機，不適合 Stage01 vertical slice。

若 G0 也需要放大畫布，必須提交 `geometry-migration.json`，逐幀記錄：

```json
{
  "model": "xuchu",
  "mode": "intentional-canvas-migration",
  "frames": [
    {
      "path": "data/chars/boss/xuchu/example.GIF",
      "oldCanvas": [160, 120],
      "newCanvas": [220, 160],
      "padding": [30, 20],
      "offsetReviewed": true,
      "bboxReviewed": true,
      "attackReviewed": true
    }
  ]
}
```

上例數字只示範 schema，不是 `xuchu` 真實 frame 尺寸。

## 每個 Boss 的必要分鏡

實際張數以 model TXT 的 case-sensitive physical file closure 為準；下面是審稿總覽必須出現的動作類別。

| 分鏡群 | 必要畫面 | 工程審核 |
| --- | --- | --- |
| 身份 | 全身正面／三分之二身、HUD icon、通訊／Boss show 肖像 | 名稱、slot、畫布、角色高度與 palette master |
| 移動 | spawn、idle、walk contact／passing、turn、jump／land | 腳底相對 Offset 誤差；前後 z lane 排序 |
| 主要攻擊 | wind-up、active、recovery；每種武器各一組 | 拳腳／武器尖端與 attack box 相交 |
| 遠程／特殊 | aim、muzzle、projectile、impact、special recovery | 子模型 closure、生成位置、命中後回收 |
| 受擊 | pain、特殊 pain、airborne／knockback、fall、prone、rise | BBox 包含核心軀幹，不被頭髮／背包錯誤放大 |
| 終結 | death wind-up、機械破壞、碎片／爆炸、終態 | 不得閃回人體血液／斷肢或舊三國圖 |
| 多階段 | mounted／host form、分離、phase 2、phase death | 血量門檻、子模型、blockade／關卡解鎖 |

## 依賴閉包，不只算主模型 GIF

每個 Boss 工作包先從 `models.txt` 與實際 level spawn 出發，遞迴列出：

- wrapper／include model TXT、`load`、`subentity`、`custentity`、`spawnframe`。
- projectile、weapon、knife、carrier、pilot、debris、hit／muzzle／death FX。
- icon、alternate palette、Boss show、故事通訊 portrait。
- script／`@cmd` 內可靜態辨識的 entity；動態組字列入人工 trace 清單。

只有主體站立／走路完成不能標成 Boss 完成。特別是 `xiahorse` 少了駕駛員或載具、美女 Boss 少了 `knifea`，都會在實戰中閃回原素材。

## 驗收 Gate

### P0：合併素材前

- 所有純換圖 GIF 有 exact-case base counterpart、相同 canvas、indexed palette，palette index 0 精確為 `#FC00FF`。
- 依賴閉包 0 missing、0 case mismatch；icon、alternate palette、projectile、FX、subentity 全部列入。
- 每個 frame 的 Offset、BBox、attack 數值有效；前景內容與核心軀幹／武器命中位置人工對照。
- 地面動作可見腳底相對 Offset.y 誤差目標 ≤2px；長武器貼邊例外必須列在 manifest。
- 若更動 canvas，geometry migration manifest 完整，不能跳過 parity。

### P1：標成可玩前

- 在 `/tmp` 建 disposable Boss fixture，不修改 `workplace/extracted`。
- 大型機體 fixture 測 arena 左右邊界、三條 z lane、正反向攻擊與死亡後 blockade。
- 美女三 Boss fixture 測三者同屏、全部投射物、FX 遮擋、前景層級與每名 Boss 的死亡解鎖。
- 固定 dummy target 驗證近／中／遠命中；非攻擊幀、背後與只有頭髮／披風的區域不得誤命中。
- 480×272 實機截圖必須涵蓋 spawn、idle、walk、attack、hurt、fall／death 與 projectile；不得有洋紅方框、內部透明洞或舊素材閃回。

### P2：發行候選前

- Docker OpenBOR v7533 cold-load 到 `Loading models... Done!`，Log 無 Boss-specific missing／script error。
- 同一 Boss 至少跑 10 次 spawn→attack→projectile→death→reload；entity 數回到基準，記憶體不可持續線性增長。
- 美女三 Boss＋全部投射物、大型 Boss＋8 雜兵／FX 各做 10 分鐘 soak。
- Linux 完成後，Windows／macOS runner 分別做 unpacked tree smoke；不要在 host 安裝臨時依賴。
- v7533 收到 timeout／TERM 後的既知 teardown double-free 必須與停止前的執行期錯誤分開判讀。

## 建議製作順序

1. `lidian` 原創中型指揮官機：69 GIF＋6 TXT engineering closure 已完成；下一步逐幀 production redraw、三條死亡路徑 fixture 與可視 gameplay review。
2. `xiahorse` 兩階段包：先證明載具→駕駛員分離全程沒有舊素材。
3. `xuchu` 的 G0 黑橙重裝巨型機：先保持原 canvas／玩法；確認可讀性後才評估 G1。
4. `meimei`、`meiya`、`meiling` 三名藝術家平行製作，同一位 integration owner 管 palette、命名與 technical rig。
5. 四個 gate 全部可玩後，再決定最終戰採美女宿主→黑紫腦核，或大型英雄機鏡像決戰。

目前 `lidian` 已達 69 GIF＋6 TXT engineering coverage 並通過靜態 validator 與 Docker model-load；它和其餘 Boss 都尚未 production-ready。任何狀態更新都要附依賴閉包、靜態 validator、Docker Log 與可視 gameplay review 證據。
