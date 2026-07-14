# Warriors of Fate → Super Robot Wars remake research

本 repository 記錄以 OpenBOR 版《吞食天地 II：赤壁之戰》為技術研究樣本，逐步整理可重製為機器人大戰風格橫向動作遊戲的方法。研究以不覆寫原始素材、可重現分析與跨平台發行為原則。

## 文件索引

| 文件 | 用途 |
| --- | --- |
| [角色替換分鏡總表](research/CHARACTER_SPRITE_INVENTORY.md) | 關羽、趙雲、張飛、魏延、黃忠的動作群組、GIF 分鏡、優先級與分離模型說明。美術替換工作從此開始。 |
| [分鏡圖片](research/sprites/) | 五名主角色定義直接引用的 GIF 分鏡，依角色分目錄供 GitHub 預覽。 |
| [跨平台建置與發行](docs/BUILD.md) | OpenBOR 引擎在 Linux、Windows、macOS 的原生編譯依賴、CMake 指令、產物位置與 PAK 放置位置。 |
| [分鏡表產生器](scripts/generate-character-sprite-inventory.mjs) | 從解出的角色定義 `.txt` 重新統計分鏡表，避免人工維護 GIF 清單。 |

## 專案範圍

- 研究 OpenBOR 模組的角色、關卡、腳本和資產結構。
- 以既有可玩角色為模板，替換為 RX-78-2、無敵鐵金剛、蓋特機器人、超電磁 V 等原創或已取得授權的素材。
- 維持原動作定義的碰撞箱、攻擊時序與地面對齊，先完成視覺替換，再調整玩法。
- 發行時以一個共用遊戲 PAK 搭配各作業系統的原生 OpenBOR 引擎。

## 建議工作順序

1. 先依分鏡總表完成一名角色的 P0（基本可玩）GIF。
2. 在本機測試動畫、透明色、Offset、BBox 與 attack 時序。
3. 擴充 P1／P2 動作及騎乘、投射物等分離模型。
4. 依建置文件製作 Linux、Windows、macOS 引擎發行版。

## 分鏡總覽

每張圖為該角色主定義直接引用的 GIF 第一幀；格子下方是原始檔名。完整動作對照請看[角色替換分鏡總表](research/CHARACTER_SPRITE_INVENTORY.md)。

### 關羽

![關羽分鏡總覽](research/contact-sheets/guanyu.png)

### 趙雲

![趙雲分鏡總覽](research/contact-sheets/zhaoyun.png)

### 張飛

![張飛分鏡總覽](research/contact-sheets/zhangfei.png)

### 魏延

![魏延分鏡總覽](research/contact-sheets/weiyan.png)

### 黃忠

![黃忠分鏡總覽](research/contact-sheets/huangzhong.png)

## 注意事項

原始 `wof.pak` 是研究輸入，不要覆寫。它含有舊版封包細節；正式發行前應另行建立並驗證與目前 OpenBOR 引擎相容的模組封包。
