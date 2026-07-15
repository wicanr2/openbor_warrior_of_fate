# Mazinger concept key poses

公開目錄只保存張飛 slot → 無敵鐵金剛 vertical slice 的總覽 PNG：

- `mazinger-keyposes-contact-sheet.png`：README 直接顯示的 12 格總覽。

來源總表與 12 張獨立 key pose 位於本機 `private_assets/robot_wof/mazinger/`，受 `.gitignore` 排除，不提交 GitHub。

`frame-07/08/11/12` 的角色跨越平均格線，因此使用 [`mazinger-keyposes.json`](../manifests/mazinger-keyposes.json) 記錄的安全 crop。可執行下列指令重建：

```sh
node scripts/slice-mazinger-keyposes.mjs
```

這些 PNG 是概念／研究素材，不是可直接放入 OpenBOR 的 production GIF。正式幀仍要人工像素修整、套用每個原 GIF 的 canvas 與 Offset、轉成 indexed GIF，並把 `#FC00FF` 放在 palette index 0。

無敵鐵金剛及其他參考角色涉及第三方權利。本 repository 的 MIT license 不會自動授權第三方角色、商標或來源 concept；公開或商業發行前必須另行確認權利。
