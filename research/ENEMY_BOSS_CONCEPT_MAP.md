# 敵軍與 Boss 概念對位表

本文件把本機 `robot_wof_enemy/`、`robot_boss/` 中的參考圖，轉譯成可交付給美術與 OpenBOR 整合者的工作規格。參考 JPEG 只留在團隊私有空間；公開 repository 不收錄雜誌頁、遊戲截圖或可直接重用的第三方圖像。

逐 Boss 的必要分鏡、依賴閉包、巨大機 geometry migration、美女三人同屏與 Docker 驗收 Gate 見 [`BOSS_PRODUCTION_PLAN.md`](../docs/BOSS_PRODUCTION_PLAN.md)。

## 使用原則

- 參考圖只回答「輪廓、階級、配色、氣氛與角色類型」，不得直接裁切成 production sprite。
- 島田兵頁面的藍色頭盔士兵可作一般巡邏兵通訊頭像的方向；正式頭像要重畫成原創角色。
- 機戰截圖只用來建立量產機、指揮官機、重裝機與遠程機的視覺層級，不逐像素複製既有機體。
- `robot_boss` 的 200m 比例圖只作「巨大感」參考。OpenBOR 實戰 sprite 仍須服從原 canvas、Offset、BBox、attack box 與 480×276 視窗。
- 「Gunbuster」等名稱只記錄使用者指定的靈感來源。公開成品應採原創再設計；不能把 MIT license 誤解為第三方角色授權。

## 私有參考圖盤點

| 私有來源 | 可提取的設計訊號 | 禁止作法 |
| --- | --- | --- |
| `robot_wof_enemy/729437…jpeg` | 藍盔巡邏兵頭像、匿名量產兵的軍階感、不同武裝／配色的雜兵階級 | 直接裁頭像、直接擷取遊戲畫面成 sprite |
| `robot_boss/721248…jpeg` | 黑紫能量、巨大黑幕、闇腦／最終 Boss 的壓迫輪廓 | 複製標題、商標、既有角色造型 |
| `robot_boss/727904…jpeg` | 從人型機到約 200m 超大型機的比例分級；圖中沒有逐機標籤 | 讓實戰 sprite 按設定比例塞滿畫面、直接描圖、把推測機體名寫成事實 |
| `robot_boss/730001…jpeg` | 女性角色設計回顧；只可確認頁面文字提到設計師河野さち子，五名角色姓名／年齡未標示 | 把角色回顧誤當原作 Boss roster、猜人物姓名、直接裁切、複製服裝五官、使用幼態比例 |

檔名縮寫只用來讓持有私有素材的團隊成員定位來源；不代表檔案會上傳 GitHub。

`robot_wof_enemy/` 目前只有這一張 1096×1435 拼貼海報，內含第三方人物、機體、遊戲 UI 與戰鬥截圖，因此不是 clean sprite source，整張與任何 crop 都不進公開 repo。遊戲中的 `bing` 只需要 24×36 model icon；若未來讓一般兵進入劇情對話，另做原創 64×94 P-mode 通訊頭像並修改 dialogue mapping，不能把海報大頭像縮放套用。

## 一般敵軍 family

先建立一個共同陣營語彙，再從同一骨架做武器與裝甲變體。一般巡邏兵的 HUD／通訊頭像採「藍色頭盔、遮面面罩、冷色鏡片」的原創 Shimada-grunt archetype。

| OpenBOR model | 戰鬥功能 | 原創替換方向 | 頭像／識別 | 交付注意 |
| --- | --- | --- | --- | --- |
| `bing` | 基礎近戰兵 | 藍灰量產巡邏機，電棍或短槍 | 藍盔一般兵；24×36 `icon.GIF` | P0；主動畫、受傷、倒地、死亡與 6 組 Map 一起盤點 |
| `cap2` | 隊長型近戰兵 | 同骨架加厚肩甲、額前指揮天線 | 藍盔＋橙色軍階條 | 不只 hue shift；保留較大的攻擊動勢 |
| `cap` | 進階隊長兵 | 盾型重裝巡邏機 | 紅色鏡片＋雙軍階條 | 盾面與 attack box 需同步核對 |
| `shooter` | 遠程兵 | 輕裝步槍／弩炮型機兵 | 單眼瞄準器或側掛鏡片 | 本體、投射物、命中 FX 必須同批 |
| `ybing` | 長柄武器兵 | 電矛／熱能長槍型 | 長型感測器 | 武器尖端要落在原 attack box |
| `feifei` | 高速特殊兵 | 低重心偵察機或獸型無人機 | 窄型高速目鏡 | 跳躍、衝刺與倒地不可漏畫 |
| `bigman` | 重型雜兵 | 工程／攻城機，液壓拳與寬肩 | 厚重面罩、黃黑警示色 | 以慢速重擊輪廓區隔 Boss |

### EN-BING-P0 最小交付

1. 先重畫 `data/chars/army/1/bing.txt` 直接及間接引用的完整 physical GIF set，不只換 idle／walk。
2. 保持各自原 canvas 與腳底 Offset，輸出 indexed GIF，palette index 0 固定 `#FC00FF`。
3. 製作 24×36 `data/chars/army/1/icon.GIF`：藍盔、深色面罩、冷色鏡片；不能從參考 JPEG 裁切。
4. 第一版只需一套 base palette；其餘 `map1`–`map6` 在 base 動畫 engine-review 後補。
5. 將人類血液／斷肢型 FX 改為火花、電弧、裝甲碎片與冷卻液，避免機械兵死亡時閃回人類 gore。

第一版原創藍盔巡邏機已建立 12 格總覽與 42-file private engineering overlay；安全切格、實際 `#F703F8`→`#FC00FF` 背景正規化、`bingxs`、gore model overlay、驗證結果與 production 缺口見[藍盔巡邏機 Stage01 vertical slice](../docs/BLUE_HELMET_GRUNT_VERTICAL_SLICE.md)。

## 主線 Boss 對位

目前 `levels.txt` 的 active 主線是 Stage01、Stage02、Stage03A、Stage03B。Boss 應先按既有玩法槽位重畫，再另開 gameplay change 做真正的超巨大戰。

| Gate／model | 現有機制 | 建議新設計 | 規模與美術限制 | 優先級 |
| --- | --- | --- | --- | --- |
| Stage01 `lidian` | 第一關長武器指揮官；`lidian.txt` include `li.txt`，另有 spawn／分離子模型與 480×272 Boss icon | `Crimson Marshal／緋紅督戰官`：紅色重裝、青色核心、藍黑能量長槍 | 約玩家 1.10–1.25 倍；69 GIF＋6 TXT engineering closure 已完成，仍需 production redraw | P0/P1 第一個 Boss 包 |
| Stage02 `xiahorse` | 400 HP 騎乘 Boss；低於 300 HP 會拆成 `xiahoudun`＋`horse`，不是單一 sprite | 四足突擊載具＋女性或男性王牌駕駛；載具受損後分離成人型決戰 | 必須同時畫合體、載具、駕駛員與轉換幀；不能只換 8 張主模型圖 | P1，完整兩階段包 |
| Stage03A `xuchu` | 470 HP 重裝近戰 Boss；wrapper `xuchu.txt` include `chu.txt`，有大幅度重擊 | `Iron Bastion／玄鐵鎮壓機`：大型原創主角機鏡像；黑橙重裝、寬肩、低重心與大型推進器 | 世界觀可設定為超大型機；實戰 sprite 建議玩家 1.25–1.45 倍。真正 200m 感以背景、震動、局部特寫與 arena phase 呈現 | P1/P2，大型 Boss 首選槽位 |
| Stage03B `meimei`／`meiya`／`meiling` | 三名 300 HP Boss 同時出場；三者目前共用近似骨架、飛刀與高速格鬥語彙 | `Cinder Ace`、`Ivory Regent`、`Jade Strategist` 三位明確成年女性王牌；臉、服裝與機甲全部原創 | 可共用 technical rig，但 silhouette、主色、武器、HUD 頭像需一眼可分；三人同場不可都用高亮大 FX | P1/P2，適合三藝術家平行分工 |

## 私有標籤與原創 roster

`robot_boss/` 的海報文字可辨識「羅亞與闇腦」、約 `200m` 比例標尺與設計師河野さち子；無標籤的機體與五名女性角色不能靠印象補名字。Gunbuster 是使用者提出的 private 尺度例子，不代表比例圖中的某一台已被可靠辨識，也不是 production art 授權。

公開工作一律改用原創暫名：`Crimson Marshal`、`Storm Lancer`、`Iron Bastion`、`Cinder Ace`、`Jade Strategist`、`Ivory Regent`、`Zenith-0`、`Violet Synapse`。第三方名稱、造型、頭冠、胸徽、武器、制服、臉型與故事設定不能搬入成品。

### 建議的美女 Boss 三人組

| Slot | 戰鬥定位 | 原創設計 brief | 主要辨識 |
| --- | --- | --- | --- |
| `meimei` | 高速近戰／追擊 | `Cinder Ace／紅蓮王牌`；明確成年，暖紅＋深灰近戰輕甲 | 短披肩、寬腿剪影、熱能短刃 |
| `meiya` | 旗艦／變形壓制 | `Ivory Regent／月白旗艦主`；明確成年，月白＋深紫披肩式裝甲 | 展開長刃、折疊翼／盾、較高輪廓 |
| `meiling` | 戰術／區域控制 | `Jade Strategist／青磁戰術官`；明確成年，冷綠＋黑窄輪廓 | 高領、環形感測器、浮游控制裝置 |

三個原模型的招式結構高度相似，第一版不應假裝它們已有完全不同玩法。三名 production Boss 都採 adult-coded 原創設計；先靠造型、palette、武器 FX、聲音與頭像區隔。若要改成坦克／補師／術師三種 AI，另立 OpenBOR model change 並重新驗證平衡。

## 巨大 Boss 的兩種實作方式

### A. 純換圖模式（先做）

- 保留原 model TXT、canvas、BBox、attack、Delay 與鏡頭。
- 世界觀可以說它是巨大機體，但實戰縮尺到 1.25–1.45 倍玩家高度。
- 用低角度登場、螢幕震動、背後巨大陰影、局部特寫和沉重腳步強化尺度。
- 適用 `xuchu`，風險最低，也可先完成三平台 raw-data smoke。

### B. 真正超巨大戰（後做）

- Boss 主體成為背景／固定 entity，只讓拳、頭、核心或武器進入可攻擊區。
- 需要修改 camera、arena、spawn、BBox、attack box、生命階段與可能的腳本。
- 不能算「sprite 替換」；需獨立 gameplay branch、專用關卡與完整回歸測試。
- 適合最終暗紫 Boss 或約 200m 級原創大型主角機，不適合 Stage01 首次 vertical slice。

## Boss 圖像交付包

每一個 Boss 都要以「包」交付，不接受只有站姿或大頭照：

- 主模型所有 direct／include Frame、case-sensitive 路徑與原 canvas。
- spawn、idle、walk、attack、pain、fall、rise、death、special。
- 分離模型、武器、投射物、載具、爆炸／命中／機械損傷 FX。
- 小 HUD icon、480×272 Boss show/icon（若該槽使用）、故事通訊頭像。
- indexed GIF ≤256 色；palette index 0 必須是 `#FC00FF`。
- 同角色 master palette、alternate Map／red 狀態與 engine-review 記錄。

`xiahorse` 是特別容易漏件的例子：它在血量門檻後會生成 `xiahoudun` 與 `horse`，所以只完成騎乘圖會在戰鬥中途閃回原素材。

Stage01 `lidian` 的 16 格安全 crop、69 GIF＋6 TXT closure、Lidian-only 機械死亡 remap 與 Docker 證據見[李典紅槍指揮機 vertical slice](../docs/LIDIAN_BOSS_VERTICAL_SLICE.md)。

## 待辨識與待決策

- 參考圖中的其他機體名稱不靠印象猜測；先用 `RB-UNKNOWN-01...` 編號，等提供者或美術 lead 確認。
- `models.txt` 宣告 `xiahoujie` 系列，但目前解包樹找不到對應資料夾；在取得完整來源前不可承諾替換完成。
- `caocao`、`lvbu` 等後期／dome model 需要另做完整依賴盤點，不能只依頭像清單推定 Boss 工作量。
- 最終 Boss 是「美女宿主→闇腦巨體」兩階段，還是「大型主角機鏡像決戰」，應在 Stage03A／3B production 前鎖定。
- 左向通常由 OpenBOR 水平鏡像產生，不必另畫一套；有文字、單側盾牌或不對稱武器時仍須逐幀做鏡像審查。

## 驗收順序

1. 先跑 exact-case、缺檔、canvas、indexed palette 與 index 0 靜態檢查。
2. 再看 idle／walk 腳底、武器尖端與 attack box、pain／fall／rise 的地面對位。
3. 在 Stage01 驗證 `bing`＋`lidian`，Stage02 必測 `xiahorse` 的 300 HP 分離門檻。
4. Stage03B 以兩名玩家實測三 Boss 同場的輪廓、FX 遮擋與效能。
5. 所有本機整合與 Linux smoke 只在 Docker 內執行；Windows／macOS 由各平台 runner 驗證，不在 host 安裝工具鏈。
