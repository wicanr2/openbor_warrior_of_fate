# Boss 圖像製作與 OpenBOR 整合計畫

這份文件把本機 `robot_boss/` 的三張概念頁轉成可由多位藝術家並行製作的工程規格。概念頁只用來辨識角色類型、尺度、氣氛與配色；第三方圖像、雜誌排版、遊戲截圖及既有角色造型不會進入公開 repository，也不能直接裁切成 sprite。

公開總覽請先看 [`enemy-boss-roster.svg`](../research/diagrams/enemy-boss-roster.svg)，原始槽位研究見 [`ENEMY_BOSS_CONCEPT_MAP.md`](../research/ENEMY_BOSS_CONCEPT_MAP.md)。

本輪已完整盤點目前 active 主線 Stage 1–3：`data/chars/boss` 有 43 個 model TXT，`models.txt` 的 boss-path 註冊中有 34 個可解析、14 個缺檔（`xiahoujie` 系列 5 個、`ECaller1`–`ECaller9` 9 個）。因此可以承諾現有四個主線 gate 的製作 scope，不能宣稱後期全遊戲 Boss 已盤齊。

## 概念頁提供的方向

| 私有概念頁 | 可辨識的設計方向 | 可用搜尋名稱 | 本專案處理方式 |
| --- | --- | --- | --- |
| `robot_boss/721248…jpeg` | 黑紫能量、巨大幕後操控者、腦核／魔王輪廓、英雄與黑幕對決 | Dark Brain、Fighter Roar；Compatible Kaiser 僅為中信心關聯搜尋詞 | 只取「英雄機對抗腦核巨體」的敘事結構；外觀與標誌全部原創化 |
| `robot_boss/727904…jpeg` | 超級機器人的高度對照；中型人形機到約 200m 級巨型機 | Gunbuster、Daitarn 3、Ideon，其他未確認機體暫用 `RB-UNKNOWN-*` | 先在既有 Boss slot 做縮尺版；真正巨型戰另開 gameplay branch |
| `robot_boss/730001…jpeg` | 女性角色設計回顧，並非原作 Boss roster；華麗服裝、髮型與氣質差異 | 上左 Alfimi、上右 Ouka Nagisa、中央 Lamia Loveless、下左 Latune／Latooni Subbota、下右 Shine Hausen | 三名戰鬥 Boss 必須 adult-coded 且全新設計；Latune／Shine 只留作 NPC、雙機駕駛或高速妖精機的抽象提示 |

這些名稱是團隊溝通與搜尋用的靈感標籤，不是素材授權。正式公開版本建議使用原創代號與原創造型；若團隊決定保留任何既有 IP 名稱或外觀，發行前需另做權利確認。

名稱關聯可交叉核對[《無敵鋼人ダイターン3》官方角色頁](https://www.daitarn3.net/character/)與[《超級機器人大戰 OG Moon Dwellers》G Compatible Kaiser 官方機體頁](https://srwog-md.suparobo.jp/sp/mechanic/mechanic04.php)；官方頁只用來避免名稱誤植，不授權本專案重用原作圖像。

## 主線 Boss 槽位

| 順序 | OpenBOR slot | 已盤點的私有 scope | 現有玩法契約 | 原創替換 brief／完整交付 |
| --- | --- | ---: | --- | --- |
| B1 | Stage01 `lidian` | 69 GIF | 長柄武器指揮官；wrapper＋include；52 主體／Boss show，另有四組私有子模型 | `RB-COMMANDER-01`：藍黑指揮官機、橙色軍階、長柄高周波兵器；主模型、include、69 張私有包、機械碎片及 480×272 Boss show 一起交付 |
| B2 | Stage02 `xiahorse` | 91 GIF＋外部依賴 | 400 HP 騎乘 Boss；低於 300 HP 分離；phase 1 為 35 張、phase 2 為 49 張，另有 7 張碎片與 1 張空白終態 | `RB-SPLIT-02`：四足突擊載具搭載原創王牌；91 張私有包、`horse` 13 張、`lei3` 10 張、FX、分離過場與兩階段死亡一起交付 |
| B3 | Stage03A `xuchu` | 53 GIF＋外部依賴 | 470 HP 重裝近戰；44 張主體／Boss show＋9 張私有分離模型；重擊、衝撞、砸地與抓投 | `RB-GIANT-03`：黑橙重裝大型主角機鏡像；全主模型、私有分離模型、重拳／重擊 FX、完整受傷／死亡及 icon；放大時附 geometry migration manifest |
| B4 | Stage03B `meimei`／`meiya`／`meiling` | 126 GIF＋共用 `knifea` 2 GIF | 每人 41 張 110×82 body＋一張 480×272 portrait；三名 Boss 同場，技能契約相近 | `RB-ACE-A/B/C`：紫白術式型、白金近戰型、黑紅指揮型三位成年王牌；三套 body／肖像、共用投射物與 FX、所有特殊受傷／倒地幀，不能只改 palette |
| B5 | `xiahoujie`／後期新增 phase | 原始來源缺件 | `models.txt` 有登記，但 extracted tree 缺 `data/chars/boss/xiahoujie/`，目前不能驗證 | 槽位保留給 `RB-CORE-FINAL` 或另一台超大型主角機；先補回合法來源，再承諾張數、玩法與完成日 |

上述數字是去重後的 physical GIF 工作量，不是 model TXT 的 Frame 行數。`lidian`、`xiahorse`、`xuchu` 目前也會依賴人體血液／器官碎片；機器人版要改成各 Boss 私有的火花、裝甲、線纜與核心碎片，不能覆寫仍被其他人物使用的共用 gore。

## 美女 Boss 三人組分工

三人可以共用 technical rig、命名慣例與 palette 編排，但不可交付三套換色人物。三人同屏時必須只靠輪廓就能辨識。

| ID／slot | 戰鬥角色 | 輪廓與主色 | 武器／FX | 肖像要求 |
| --- | --- | --- | --- | --- |
| `RB-ACE-A`／`meimei` | 中距離術式／追擊 | Alfimi 的能量／配色只作抽象提示；短披肩、環形感測器；紫白 | 環形能量刃、紫色軌跡；`knifea` 重畫為術式彈 | 成年化原創術式王牌；64×94 通訊圖與小 icon 均需原創重畫 |
| `RB-ACE-B`／`meiya` | 高速近戰壓制 | Lamia 類成年王牌氣質；長髮型頭盔、窄腰裝甲；白金＋青色 | 金色近戰刃、短距突進光 | 自信成年王牌；不可沿用 A 的臉型、瀏海或肩線 |
| `RB-ACE-C`／`meiling` | 指揮／最後存活者 | Ouka 類嚴肅指揮官氣質；高領、寬肩、胸前核心；黑綠／黑紅 | 紅黑指揮標記、核心脈衝、較低亮度投射物 | 成年原創領隊；不能用大面積 FX 長時間遮住另外兩人 |

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

1. `lidian` 原創中型指揮官機：建立第一套 Boss closure、分鏡總覽、icon 與 Docker fixture。
2. `xiahorse` 兩階段包：先證明載具→駕駛員分離全程沒有舊素材。
3. `xuchu` 的 G0 黑橙重裝巨型機：先保持原 canvas／玩法；確認可讀性後才評估 G1。
4. `meimei`、`meiya`、`meiling` 三名藝術家平行製作，同一位 integration owner 管 palette、命名與 technical rig。
5. 四個 gate 全部可玩後，再決定最終戰採美女宿主→黑紫腦核，或大型英雄機鏡像決戰。

目前本文件是 production contract；Boss sprite 尚未達 engineering coverage 或 production-ready。任何狀態更新都要附依賴閉包、靜態 validator、Docker Log 與可視 gameplay review 證據。
