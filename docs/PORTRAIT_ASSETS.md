# 選角、HUD 與敵方頭像素材

此文件對應 [portrait asset collection](../research/portraits/)；它收錄目前 PAK 中所有 `icon*.gif` 與 `data/profiles/*.gif`。這些都是遊戲 UI 用的頭像，不是角色的全身動作分鏡。

第一版五人選角合成圖與張飛／無敵鐵金剛 HUD 三張 engineering overlay 已完成；roster 欄位、opaque palette index 0 方法、builder 與 89/89 驗證見[五人選角與無敵鐵金剛 HUD vertical slice](SELECTION_AND_HUD_VERTICAL_SLICE.md)。

## 五名開場可選角色

| 模型名 | 選角／模型 icon 路徑 | 尺寸 | HUD profile 路徑 |
| --- | --- | ---: | --- |
| 關羽 `guanyu` | `data/chars/guanyu/icon.gif` | 35×54 | `data/profiles/guanyu.GIF`、`guanyu_m.GIF` |
| 趙雲 `zhaoyun` | `data/chars/zhaoyun/icon.gif` | 35×54 | `data/profiles/zhaoyun.GIF`、`zhaoyun_m.GIF` |
| 張飛 `zhangfei` | `data/chars/zhangfei/icon.gif` | 35×54 | `data/profiles/zhangfei.GIF`、`zhangfei_m.GIF` |
| 魏延 `weiyan` | `data/chars/weiyan/icon.gif` | 35×54 | `data/profiles/weiyan.GIF`、`weiyan_m.GIF` |
| 黃忠 `huangzhong` | `data/chars/huangzhong/icon.gif` | 35×54 | `data/profiles/huangzhong.GIF`、`huangzhong_m.GIF` |

主角色定義檔的 `icon` 行直接指定模型 icon；例如關羽在
`data/chars/guanyu/guanyu.txt` 宣告 `icon data/chars/guanyu/icon.gif`。
`data/models.txt` 依 `Load <模型名> <定義檔>` 註冊五個角色。

HUD 的 `lifeBar.c` 會以模型名載入 `data/profiles/<模型名>.gif`，並以
`<模型名>_m.gif` 作後備。這組 profile 不是大型選角肖像；目前同樣是 35×54。

## 其他現有頭像

- Boss：李典、許褚、夏侯惇、美雅、美美、美玲在各自
  `data/chars/boss/<name>/icon*.gif` 下。
- 軍隊／一般敵人：`data/chars/army/<編號>/icon*.gif`。
- 特殊 profile：`tiefeifp`、`xiahoudunp` 位於 `data/profiles/`，其名稱對應
  `data/models.txt` 的模型名。

這些檔案都已匯出於 `research/portraits/data/`；總覽圖可在 repository README 直接查看。

## 劉備、曹操、呂布等「沒有 icon 檔」的情況

此 PAK 的資料中找不到劉備、曹操、呂布對應的 `data/chars/**/icon*.gif`。
曹操與呂布只出現在 `data/story/diag/*.txt` 劇情文字；部分內容透過 `_picture`
引用 `data/scenes/storybg/...` 場景圖，而非獨立人物頭像。不能只替換一張既有
`icon.gif` 來改變這些人物。

要讓一名新人物出現在選角或 HUD，必須：

1. 建立其完整模型定義，例如 `data/chars/liubei/liubei.txt`；模型名必須是唯一的 `liubei`。
2. 在定義中加入 `icon data/chars/liubei/icon.gif`，並製作 35×54、palette index 0 為 `#FC00FF` 的 indexed GIF。
3. 在 `data/models.txt` 加入 `Load liubei data/chars/liubei/liubei.txt`；是否可選還取決於模型的 player 設定與選角流程。
4. 如需 HUD，新增 `data/profiles/liubei.gif` 與必要時的 `liubei_m.gif`。
5. 如需劇情對話頭像，現有對話系統不會自動讀取 `icon.gif`；需擴充對話 UI script，或在對話檔使用 `_picture` 指向新製作的 scene image。

## 替換規格

- 保持原檔名、大小寫與 35×54 畫布尺寸（替換既有 UI icon／profile 時）。
- 背景使用 palette index 0 鍵色；現有素材實值為 `#FC00FF`，詳見[角色素材規格](SPRITE_ART_SPEC.md)。
- 純替圖不應改 `data/models.txt` 的模型名，否則 HUD profile 與 script 的路徑查找會失效。
- 替換後至少檢查：選角畫面、遊戲內血條、敵方／Boss 出場及雙人模式。
- `data/bgs/select.gif` 是 480×276 的五人合成圖，不等於五名角色各自的 35×54 icon／profile 已完成；M2 仍要補關羽、趙雲、魏延、黃忠各三張 UI 小圖。
