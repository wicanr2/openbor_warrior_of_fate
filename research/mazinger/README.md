# Mazinger concept key poses

這個目錄保存張飛 slot → 無敵鐵金剛 vertical slice 的概念底稿與可重現輸出：

- `mazinger_p0_storyboard_v1.png`：image generation 原始輸出，保留 provenance。
- `mazinger_p0_storyboard_v1-keyed.png`：背景修正為精確 `#FC00FF` 的來源總表。
- `keyposes/frame-01.png`～`frame-12.png`：依角色實際範圍切出的重畫底稿。
- `mazinger-keyposes-contact-sheet.png`：README 直接顯示的 12 格總覽。

`frame-07/08/11/12` 的角色跨越平均格線，因此使用 [`mazinger-keyposes.json`](../manifests/mazinger-keyposes.json) 記錄的安全 crop。可執行下列指令重建：

```sh
node scripts/slice-mazinger-keyposes.mjs
```

這些 PNG 是概念／研究素材，不是可直接放入 OpenBOR 的 production GIF。正式幀仍要人工像素修整、套用每個原 GIF 的 canvas 與 Offset、轉成 indexed GIF，並把 `#FC00FF` 放在 palette index 0。

無敵鐵金剛及其他參考角色涉及第三方權利。本 repository 的 MIT license 不會自動授權第三方角色、商標或來源 concept；公開或商業發行前必須另行確認權利。
