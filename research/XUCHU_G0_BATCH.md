# Xuchu G0 batch

這份文件把 `xuchu` 的現成模型 closure 收斂成 G0 的可交接批次。
它保留原 canvas／玩法契約，但把依賴、幾何與 production redraw 的入口明確化。

## 範圍定義

- G0 目標：維持原劇情 slot，先把大型主角機 Boss 的可視可玩版本做出來。
- 先不改成真正超巨大戰；仍沿用原 canvas、Offset、BBox 與 attack box 的思路。
- 必要交付：主體、identity、locomotion、combat、airborne、damage、FX、子模型。

## 來源文件

- `/tmp/robot-wof-smoke-parent/guanyu-getter-v5/data/chars/boss/xuchu/xuchu.txt`
- `/tmp/robot-wof-smoke-parent/guanyu-getter-v5/data/chars/boss/xuchu/chu.txt`
- `/tmp/robot-wof-smoke-parent/guanyu-getter-v5/data/chars/boss/xuchu/1/xuchuxs.txt`

## 依賴閉包

- unique refs: 50
- other: 4
- models: 1
- damage: 19
- fx: 1
- identity: 1
- locomotion: 7
- combat: 11
- airborne: 6

### 全部唯一引用

| Category | Ref |
| --- | --- |
| other | data/chars/boss/xuchu/1/a0.gif |
| other | data/chars/boss/xuchu/1/a1.gif |
| other | data/chars/boss/xuchu/1/a2.gif |
| other | data/chars/boss/xuchu/1/a3.gif |
| models | data/chars/boss/xuchu/chu.txt |
| damage | data/chars/boss/xuchu/death1.GIF |
| damage | data/chars/boss/xuchu/death2.GIF |
| damage | data/chars/boss/xuchu/fall1.gif |
| damage | data/chars/boss/xuchu/fall2.gif |
| damage | data/chars/boss/xuchu/fall3.gif |
| damage | data/chars/boss/xuchu/fallf1.gif |
| damage | data/chars/boss/xuchu/fallr.gif |
| damage | data/chars/boss/xuchu/fallx.gif |
| damage | data/chars/boss/xuchu/fallx02.gif |
| damage | data/chars/boss/xuchu/fallx03.gif |
| damage | data/chars/boss/xuchu/fallx1.gif |
| damage | data/chars/boss/xuchu/fallx2.gif |
| damage | data/chars/boss/xuchu/fallx3.gif |
| fx | data/chars/boss/xuchu/haha00.gif |
| identity | data/chars/boss/xuchu/icon.gif |
| locomotion | data/chars/boss/xuchu/idle00.gif |
| combat | data/chars/boss/xuchu/jk002.gif |
| airborne | data/chars/boss/xuchu/jump00.gif |
| airborne | data/chars/boss/xuchu/jump001.gif |
| airborne | data/chars/boss/xuchu/jump002.gif |
| airborne | data/chars/boss/xuchu/jump003.gif |
| airborne | data/chars/boss/xuchu/jump004.gif |
| airborne | data/chars/boss/xuchu/jump005.gif |
| damage | data/chars/boss/xuchu/pain1.gif |
| damage | data/chars/boss/xuchu/pain1.GIF |
| damage | data/chars/boss/xuchu/pain2.gif |
| damage | data/chars/boss/xuchu/painx.gif |
| damage | data/chars/boss/xuchu/painx1.gif |
| damage | data/chars/boss/xuchu/painx2.gif |
| combat | data/chars/boss/xuchu/punch001.gif |
| combat | data/chars/boss/xuchu/punch002.gif |
| combat | data/chars/boss/xuchu/punch003.gif |
| combat | data/chars/boss/xuchu/punch004.gif |
| combat | data/chars/boss/xuchu/punch005.gif |
| combat | data/chars/boss/xuchu/punch006.gif |
| combat | data/chars/boss/xuchu/punch007.gif |
| combat | data/chars/boss/xuchu/throw001.gif |
| combat | data/chars/boss/xuchu/throw002.gif |
| combat | data/chars/boss/xuchu/throw003.gif |
| locomotion | data/chars/boss/xuchu/walk001.gif |
| locomotion | data/chars/boss/xuchu/walk002.gif |
| locomotion | data/chars/boss/xuchu/walk003.gif |
| locomotion | data/chars/boss/xuchu/walk004.gif |
| locomotion | data/chars/boss/xuchu/walk005.gif |
| locomotion | data/chars/boss/xuchu/walk006.gif |

## G0 驗證重點

- 保留 `xuchu` 的原依賴閉包，不把馬匹或人類血肉語彙帶進 G0。
- `geometry-migration.json` 只在 canvas / offset 真正要動時加入，不能默默改圖。
- 先完成一套可視 gameplay review，再談更高階的超巨大戰。

## 驗證命令

```bash
node scripts/validate-openbor-assets.mjs --data <staging-tree>/data/chars/boss/xuchu/xuchu.txt --strict
scripts/run-openbor-smoke-docker.sh --binary /path/to/OpenBOR --stage <staging-tree> --seconds 20
```