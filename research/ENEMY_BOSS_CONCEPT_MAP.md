# 敵軍與 Boss 概念對位表

本文件把本機 `robot_wof_enemy/`、`robot_boss/` 中的參考圖，轉譯成可交付給美術與 OpenBOR 整合者的工作規格。參考 JPEG 只留在團隊私有空間；公開 repository 不收錄雜誌頁、遊戲截圖或可直接重用的第三方圖像。

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
| `robot_boss/727904…jpeg` | 從人型機到約 200m 超大型機的比例分級；Gunbuster 類巨型主角機方向 | 讓實戰 sprite 按設定比例塞滿畫面、直接描圖 |
| `robot_boss/730001…jpeg` | 美女型 Boss／駕駛員肖像、華麗服裝與角色差異化 | 直接裁切人物、複製特定角色服裝與五官 |

檔名縮寫只用來讓持有私有素材的團隊成員定位來源；不代表檔案會上傳 GitHub。

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
| Stage01 `lidian` | 第一關長武器指揮官；`lidian.txt` include `li.txt`，另有 spawn／分離子模型與 480×272 Boss icon | 島田兵陣營的指揮官機：藍黑裝甲、橙色軍階、長柄高周波兵器 | 約玩家 1.10–1.25 倍；保持第一關可讀性，不用最終 Boss 造型 | P0/P1 第一個 Boss 包 |
| Stage02 `xiahorse` | 400 HP 騎乘 Boss；低於 300 HP 會拆成 `xiahoudun`＋`horse`，不是單一 sprite | 四足突擊載具＋女性或男性王牌駕駛；載具受損後分離成人型決戰 | 必須同時畫合體、載具、駕駛員與轉換幀；不能只換 8 張主模型圖 | P1，完整兩階段包 |
| Stage03A `xuchu` | 470 HP 重裝近戰 Boss；wrapper `xuchu.txt` include `chu.txt`，有大幅度重擊 | 大型主角機反派化／鏡像決戰；可採 Gunbuster 類「黑橙重裝、背部大型推進器」的原創再設計 | 世界觀可設定為超大型機；實戰 sprite 建議玩家 1.25–1.45 倍。真正 200m 感以背景、震動、局部特寫與 arena phase 呈現 | P1/P2，大型 Boss 首選槽位 |
| Stage03B `meimei`／`meiya`／`meiling` | 三名 300 HP Boss 同時出場；三者目前共用近似骨架、飛刀與高速格鬥語彙 | 三位美女型王牌／人型機甲：暗紫術式型、白金聖騎型、黑紅指揮型；五官與服裝全部原創 | 可共用 technical rig，但 silhouette、主色、武器、HUD 頭像需一眼可分；三人同場不可都用高亮大 FX | P1/P2，適合三藝術家平行分工 |

## 參考角色辨識與候選 roster

下表是依概念圖與既有 OpenBOR 招式做的高／中信心候選，不是 production art 授權。無法從圖中可靠辨識的機體一律保留 `RB-UNKNOWN-*`，不靠印象補名字。

| 概念圖可辨識項目 | 信心 | 最相容 OpenBOR slot | 原因／處理 |
| --- | --- | --- | --- |
| Dark Brain／闇黑腦 | 高 | `xiahoujie` 暫定或新增最終 phase | 圖上標題與中央腦甲輪廓明確；但 extracted tree 缺 `xiahoujie/`，恢復來源前不落圖 |
| Fighter Roar／戰士羅亞 | 高 | `xiahoudun` 人形態 | 人形近戰與抓技相容；可在 `xhorse`／weapon 狀態轉為 Compatible Kaiser 類機體 |
| Gunbuster | 高 | `xuchu` | 黑橙、交叉雙臂與背部大型結構明確；重裝、槌擊節奏可轉 Buster Punch／雙臂重擊 |
| Daitarn 3 | 高 | `lidian` | 現有長槍與水平刺擊可轉成 Javelin 類武器，第一關仍維持中型實戰縮尺 |
| Ideon | 中高 | reserve | 方塊型巨大輪廓適合後期背景 Boss；現有主線槽位沒有低風險的純換圖對位 |
| Lamia Loveless | 高 | `meiya` | 生身高速近戰最自然；production 版仍需重做原創臉、服裝與裝甲語彙 |
| Alfimi | 高 | `meimei` | 可把 `knifea` 重畫成念動／能量彈，保留現有投射時序 |
| Despinis | 高 | `meiling` | 可把 `knifea` 重畫成術式彈，並用黑紅核心銜接闇腦力量 |
| Shine Hausen | 高 | reserve portrait／NPC | 生身踢擊與現有骨架不相容；若採 Fairlion 類高速機體才重新評估 Boss slot |

辨識核對可參考 [《超級機器人大戰 OG Moon Dwellers》G Compatible Kaiser 官方機體頁](https://srwog-md.suparobo.jp/sp/mechanic/mechanic04.php)。角色名稱只用於團隊搜尋與討論；正式公開圖像仍需原創化與權利審查。

### 建議的美女 Boss 三人組

| Slot | 戰鬥定位 | 原創設計 brief | 主要辨識 |
| --- | --- | --- | --- |
| `meimei` | 高速投刃／追擊 | 以 Alfimi 類念動戰為靈感的紫白輕甲術式機；角色外觀原創化 | 短披肩、環形感測器、紫色能量刃 |
| `meiya` | 中近距離壓制 | 以 Lamia 類生身近戰為靈感的白金裝甲王牌；角色外觀原創化 | 長髮型頭盔輪廓、金色近戰刃 |
| `meiling` | 近戰指揮／最後存活者 | 以 Despinis 類術式戰為靈感的黑紅指揮官；可作闇腦力量宿主 | 高領、紅色核心、較寬肩甲 |

三個原模型的招式結構高度相似，第一版不應假裝它們已有完全不同玩法。先靠造型、palette、武器 FX、聲音與頭像區隔；若要改成坦克／補師／術師三種 AI，另立 OpenBOR model change 並重新驗證平衡。

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
