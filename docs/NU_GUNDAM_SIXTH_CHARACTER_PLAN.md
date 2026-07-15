# ν Gundam 第六可選角色工程計畫

ν Gundam 可新增為第六個**可選模型**，不取代現有五人；這不代表六人可以同時遊玩。本模組目前各組關卡仍是 `maxplayers 2`，OpenBOR v7533 的 `MAX_PLAYERS` 編譯期上限為 4。不得把 `maxplayers` 改成 6，否則舊引擎讀值後可能造成玩家陣列越界。

本角色的精確機體造型屬 private fan-project、`rights-unverified`；公開 repo 只保存工程需求、manifest、驗證方法與依素材政策允許的完整總覽，不放可拆用的 production GIF。

![ν Gundam 第六可選角色 16 格 overview-only review image](../research/nu-gundam/nu-gundam-sixth-character-storyboard-v5-overview.png)

v5 已通過逐格 anatomy gate：frame 16 在原尺寸與 202×120 縮圖都能辨識兩腿兩腳，且和 frame 15 的 safe crop 不互相污染。F11–F14 及 F16 仍需使用逐格 custom crop；背景已由 edge-connected matte 正規化成精確 `#FC00FF`。這只核准 canonical key-pose overview，不代表主模型、Fin Funnel entity 或六人選角 runtime 已完成。

## 正確的 roster 作法

可選模型數與同時玩家數是兩件事。選角會從已載入的 `type player` 模型中列舉候選；目前 `tiefeifp`、`xiahoudunp` 也沿用 player include，所以單純再 `Load nu_gundam` 可能得到超過六名候選。六人 milestone 必須在 `data/levels/select.txt` 加入白名單：

```text
allowselect guanyu zhangfei zhaoyun huangzhong weiyan nu_gundam
```

`data/levels.txt` 的 `maxplayers 2` 保持不變。

## 最小檔案閉包

| 類別 | 必要輸出 |
| --- | --- |
| 註冊 | `data/models.txt` 新增 `Load nu_gundam data/chars/nu_gundam/nu_gundam.txt` |
| 選角限制 | `data/levels/select.txt` 新增明確六人 `allowselect` |
| 主模型 | `data/chars/nu_gundam/nu_gundam.txt` 與其 exact-case GIF 引用 |
| 模型 icon | `data/chars/nu_gundam/icon.GIF`，35×54 |
| HUD | `data/profiles/nu_gundam.gif`、`nu_gundam_m.gif`，35×54 |
| 選角底圖 | 真正的六人 `data/bgs/select.gif`，維持 480×276 |
| 遠距子模型 | beam rifle projectile、muzzle flash、beam hit 與 Fin Funnel projectile／return FX，全部使用獨立名稱 |

HUD 腳本會依 model name 動態找 `data/profiles/nu_gundam.gif` 與 `_m.gif`，不需要新增硬編角色判斷。五人 builder 的來源尺寸、crop、roster 順序與張飛 UI crop 都是硬編碼；應新增六人 builder 或先將其資料驅動化，不可只在五欄 raster 旁邊硬塞一張圖。

## Canonical 16 格

| 格 | 動作 | 分離規則 |
| ---: | --- | --- |
| 01 | HUD／選角半身像 | 頭、胸與少量 Funnel rack；可重裁 35×54 |
| 02 | 低姿態落地 | 短推進光；雙腳完整 |
| 03 | rifle lowered idle | 盾固定同一前臂，Funnels 收折 |
| 04–05 | walk contact／passing | 兩個明顯不同重心 |
| 06 | shield guard | 盾不遮住整個機體識別 |
| 07–08 | rifle aim／fire recoil | 長光束與 hit FX 另做 entity |
| 09–10 | saber windup／horizontal slash | 大型 slash arc 另做 FX |
| 11–12 | boost jump／aerial saber | 兩腿兩腳完整，不跨格 |
| 13 | Fin Funnel command | 只開背架；飛出的 Funnel 是獨立 projectile |
| 14–16 | pain／knockback／prone | 盾與 Funnel 不可讀成多肢，倒地須全身完整 |

飛行中的六枚 Fin Funnel 不應畫死在主角色 GIF。以一個 Funnel projectile model 生成多實例，再為釋放、浮游、轉向、充能、射擊、命中與返回建立獨立動畫；這樣才能維持碰撞盒、深度排序與雙人同屏效能。

## 驗證閘門

1. 所有 GIF 保持原 canvas、indexed palette，palette index 0 精確為 `#FC00FF`。
2. 主模型、projectile、FX 與 script 引用 exact-case strict 全數解析。
3. Docker OpenBOR v7533 到 `Loading models... Done!`。
4. 選角左右循環剛好六名，不出現 `tiefeifp`／`xiahoudunp`。
5. 1P／2P 能選 ν Gundam、確認後生成角色並進入 Stage 1；`nosame 1` 行為正確。
6. 六欄底圖、游標、`Ready!`、雙玩家預覽及 HUD 不互相遮蓋。
7. Rifle、saber 與 Funnel 的 spawn、命中、回收、死亡清場及雙人壓力測試通過。

16 格只是 engineering key poses。idle、八格 walk、攻擊 anticipation/contact/recovery、Funnel 指令、受擊、起身與死亡都仍需要逐格補間後才能標記 production-ready。
