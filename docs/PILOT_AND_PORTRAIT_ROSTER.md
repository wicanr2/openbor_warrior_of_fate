# 機體、駕駛員與大頭照 roster

機體 GIF、駕駛員大頭照與 OpenBOR 內部 slot 必須分層管理。現階段保留原模組的 internal model name，避免角色腳本、關卡 spawn、武器子模型與存檔一次斷裂；選角顯示名、35×54 HUD profile、對話 cut-in 與 Boss 登場圖才使用駕駛員／人物身份。

## 已確認對應

| Internal slot | 機體方向 | 駕駛員／人物大頭照 | 狀態 |
| --- | --- | --- | --- |
| `guanyu` | 蓋特系紅色合體機 | 流龍馬 | 已確認；舊牛角鋼彈式 v1 美術淘汰 |
| `zhangfei` | 無敵鐵金剛 | 兜甲兒 | 已確認 |
| `zhaoyun` | EVA 初號機 | 碇真嗣 | 已確認 |
| `huangzhong` | RX-78 | 阿姆羅 | 已確認 |
| `weiyan` | 機械哥吉拉 | 迷你哥吉拉 | 已確認；以駕駛／吉祥物式 profile 呈現 |
| `nu_gundam` | ν Gundam，第六可選角色 | **TBD** | 阿姆羅已指定 RX-78，不自行重複指派 |
| `zeon_boss` | 有腳的完成型吉翁克 Boss | 夏亞 | 已確認；Boss 人物圖與機體 sprite 分離 |

這些精確人物與機體名稱屬 private fan-project 搜尋與製作方向，`rights-unverified`。朋友提供 RX-78 concept 的私用許可不會自動延伸到其他機體、人物、音樂、台詞或語音；private repo 的來源與授權紀錄須逐項分開。

## 每名駕駛員的圖像閉包

| 類別 | 建議輸出 | 說明 |
| --- | --- | --- |
| Model icon | `data/chars/<model>/icon.GIF`，35×54 | 選角／模型 icon；以人物臉或人物＋機體頭部建立團隊規範 |
| HUD normal | `data/profiles/<model>.GIF`，35×54 | `lifeBar.c` 依 internal model name 動態載入 |
| HUD mirror | `data/profiles/<model>_m.GIF`，35×54 | 另一方向／後備 profile |
| Selection portrait | 烘焙進六人 `data/bgs/select.gif` | 480×276 UI 內的人物頭像與機體站姿必須欄位一致 |
| Dialogue cut-in | 依 stage script 的實際引用另建 | 不要把大頭照直接畫進機體動畫 GIF |
| Boss portrait | `zeon_boss` 的夏亞登場／對話圖 | 與吉翁克本體、手臂 projectile 分開驗收 |

## 命名與替換原則

1. P0 保留 `guanyu`、`zhangfei`、`zhaoyun`、`huangzhong`、`weiyan` 作 runtime key；顯示名稱可另行本地化。
2. `nu_gundam` 與 `zeon_boss` 使用新 internal model name，不覆寫現有角色或 Boss。
3. 同一人物 profile 的 normal／mirror、選角頭像與對話 cut-in 要共用角色設計稿，但各自按實際畫布重新構圖，不可只做粗暴縮放。
4. 所有 GIF 必須是 indexed palette，palette index 0 精確為 `#FC00FF`；opaque profile 的像素資料不可使用 index 0。
5. public repo 只保留文件、manifest、授權允許的完整總覽與驗證結果；可拆用的個別人物／機體 GIF 放 private materials repo 分類索引。

## 尚待確認

- ν Gundam 的駕駛員／人物大頭照。
- 夏亞 Boss 是否需要獨立戰前、受傷、敗北三組 cut-in，或只做單一登場 profile。
- 各人物顯示名稱使用中文、日文或雙語，以及 480×276 選角圖是否烘焙文字。
- 人物語音、動畫截圖、音樂與台詞不可因圖像方向確認而視為已授權，必須另建來源紀錄。

## 劉備、曹操、呂布等人物的落點

這幾個名字通常不是「把現有機體圖改個標籤」就結束，因為它們在專案裡可能有三種不同角色：

| 角色類型 | 需要的圖 | 是否會動到 `models.txt` |
| --- | --- | --- |
| 只出現在劇情 | 對話 cut-in、必要時 `_picture` 場景圖 | 通常不需要 |
| 可選角色 | `icon.GIF`、`profiles/*.GIF`、`select.gif` 對應欄位 | 需要 |
| Boss / 關卡事件 | Boss portrait、登場圖、敗北圖、必要的戰鬥頭像 | 通常需要 |

實作順序建議如下：

1. 先決定人物是劇情、可選角色，還是 Boss。
2. 再決定是否只需要頭像，或需要完整機體／人物套件。
3. 若要進選角或 HUD，至少補 `icon.GIF` 與兩張 `profiles`。
4. 若要進 `select.gif`，要把人物頭像、站姿與欄位排版一起畫好，不是單貼一張小圖。
5. 若要成為 Boss，還要連同戰前、受傷、敗北、第二階段等圖像一併規劃。

對這個專案來說，`select.gif`、`icon.GIF`、`profiles/*.GIF` 和對話／Boss cut-in 應該分開管理。這樣其他藝術家比較容易接手，也比較不會把「角色可玩」和「只出現在劇情」混成同一個工作包。
