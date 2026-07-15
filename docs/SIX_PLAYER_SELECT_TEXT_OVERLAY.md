# 六人候選選角 TXT overlay

這份文件說明 ν Gundam 成為第六名**候選角色**所需的兩個文字入口：`data/models.txt` 與 `data/levels/select.txt`。P0 runtime、六欄底圖與 HUD 現已建立並通過 v7533 model-load；這仍不會把同時玩家數改成六人，也不代表可見選角／進關或 2P gameplay 已通過。

## 原始碼稽核結論

稽核基準是 OpenBOR `v7533-299-gda5daa39`（commit `da5daa39b1b348ac02bc005149bb49ced1529d60`）：

1. `load_playable_list()` 只接受同一行的參數，從 `GET_ARG(1)` 一直讀到該行結束。因此正確語法是一行六個名稱：

   ```text
   allowselect guanyu zhangfei zhaoyun huangzhong weiyan nu_gundam
   ```

2. 每次解析 `allowselect` 都會先呼叫 `reset_playable_list(0)`。多行 `allowselect` **不會累加**；後一行會清掉前一行，實際上只有最後一行有效。
3. `allowselect` 只設定 model cache 的 `selectable` flag，不會重新排列 cache。左右循環由 `nextplayermodel()` 按 cache index 行走，所以六人順序仍取決於 `data/models.txt` 的 `Load` 順序。
4. `models.txt` 的 `Load` 會以 `loadflag=1` 登錄並在模型表讀完後載入；`know` 只登錄 path、`loadflag=0`。`load_playable_list()` 需要 `findmodel()` 已能找到實際模型，因此 `nu_gundam` 必須使用 `Load`，不能只用 `know`。
5. 原模組把 `tiefeifp` 與 `xiahoudunp` 也用 `Load` 載入，而且兩者都 include `data/chars/player/player.txt`，所以是 `type player`。它們可以繼續載入供遊戲邏輯使用，但必須從 `allowselect` 白名單排除。

P0 對應的註冊行為是先載入 Funnel 支援模型，再載入玩家：

```text
Load	nu_funnel_shot	data/chars/nu_gundam/funnel/nu_funnel_shot.txt
Load	nu_gundam	data/chars/nu_gundam/nu_gundam.txt
```

兩行都位於現有 `Load weiyan ...` 後；支援模型先於 ν 玩家。白名單參數順序是工程契約，但真正讓左右循環保持「原五人後接 ν Gundam」的是六個 player model 的 cache `Load` 順序；非 player 的 Funnel 不加入 `allowselect`。

## 可重入 patcher

使用獨立腳本建立文字 overlay：

```bash
node scripts/patch-six-player-select-overlay.mjs \
  --data-dir /path/to/extracted/data \
  --output-dir /path/to/robot_wof_overlay
```

輸出：

- `OUTPUT/data/models.txt`
- `OUTPUT/data/levels/select.txt`
- `OUTPUT/SIX-PLAYER-SELECT-TXT-MANIFEST.json`

如果輸出 TXT 已存在，腳本會以它為輸入，保留其他 overlay 修正；否則從 `--data-dir` 讀取基底。它會：

- 將所有 active `Load/know nu_funnel_shot ...` 與 `nu_gundam ...` 各合併成一筆 exact-case `Load`，並保持 Funnel 在 ν 前；
- 將所有 active `allowselect` 合併成一筆 canonical 六人白名單；
- 驗證六名候選都恰有一筆 `Load`；
- 驗證候選 cache 順序為 `guanyu → zhangfei → zhaoyun → huangzhong → weiyan → nu_gundam`；
- 驗證 `tiefeifp`／`xiahoudunp` 不在候選名單；
- 以 Latin-1 byte round-trip 編輯舊 `models.txt`，避免把非 UTF-8 註解改寫成 replacement character；
- 使用 atomic write，而且第二次執行不會改變兩份 TXT 的 bytes；manifest 的 `changed` 欄位則記錄當次是否實際重寫該 TXT。

若 ν Gundam 或 Funnel 模型尚不存在，可以先產生文字 patch；manifest 會標記 `six-player-select-text-overlay-waits-for-model-closure`，不會假裝 runtime 已可用。P0 batch 合併後必須使用 strict gate：

```bash
node scripts/patch-six-player-select-overlay.mjs \
  --data-dir /path/to/extracted/data \
  --output-dir /path/to/robot_wof_overlay \
  --require-closure
```

只驗證已產生的 overlay、不寫檔：

```bash
node scripts/patch-six-player-select-overlay.mjs \
  --data-dir /path/to/extracted/data \
  --output-dir /path/to/robot_wof_overlay \
  --check --require-closure
```

自動測試：

```bash
node scripts/test-six-player-select-overlay.mjs
```

測試共 13 項，覆蓋 CRLF／legacy byte 保存、首次 patch、第二次 byte-identical、重複／衝突行修復、Funnel 支援模型排序、排除兩個 player-style 敵人，以及缺少模型 TXT 時 strict gate 必須失敗。

## 已關閉與仍待實測的範圍

目前已建立並 strict 解析：

- `data/chars/nu_gundam/nu_gundam.txt`、73 個 exact-case GIF refs 與 2 張 HUD profile；
- `data/chars/nu_gundam/funnel/nu_funnel_shot.txt` 與 3 張 projectile GIF；
- 480×276 六欄 `data/bgs/select.gif`；
- Docker OpenBOR v7533 cache 兩個新模型並到 `Loading models... Done!`。

文字 patch 與 headless model-load 通過仍不等於六人選角 gameplay 完成。以下必須由可見 runner 實測：左右循環恰好六名、不出現兩個 player-style 敵人、1P／2P 選 ν、`nosame 1`、確認後進入 Stage 1，以及游標／Ready／雙玩家 preview 不遮蓋。

`data/levels.txt` 的 `maxplayers 2` 必須維持原值；候選角色六名與同時玩家上限是兩件事。
