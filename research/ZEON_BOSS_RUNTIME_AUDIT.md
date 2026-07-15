# Zeon boss runtime audit

這份 audit 記錄 `zeon_boss` 目前的候選分鏡與 runtime 閉包狀態。它的用途是讓接手的人可以直接從 manifest 與 overview 圖開始檢查，而不是只看文字敘述。

## 現況

- 模型：`zeon_boss`
- pilot：`char_pilot`
- 狀態：`art-candidate-custom-crop-only-not-runtime-overlay`
- 公開總覽：`research/zeon-boss/zeon-boss-with-legs-storyboard-v2-overview.png`
- 最小私有閉包：67 張 GIF
- 目前仍未完成：主體 runtime GIF、boss HUD、投射物、碎片、pilot cut-in、故事對話與三組 stage spawn 改寫

## 已驗證

命令：

```bash
node scripts/validate-zeon-boss-manifest.mjs
```

結果：

- PASS

這表示 manifest 結構、公開總覽圖、16 個 custom crops、67 張最小 private closure 與 handoff queue 目前都一致。

## 工作邊界

- 公開 repo 只保留工程文件、manifest 與 overview 圖。
- 私有 production GIF、pilot cut-in 與可直接重用的原作素材不放進公開 tree。
- `zeon_boss` 仍然不是 production-ready，不能把 art-candidate 說成 runtime closure 完成。

## 下一步

1. 先把 `boss_hud.gif` 與 `char_pilot.gif` 變成可驗證的私有成品。
2. 再處理主體 48 張 body GIF 與 projectile／debris 子模型。
3. 最後才把三個 `NewWof/*/02.txt` 的 spawn 改寫與 Docker model-load smoke 收斂成提交門檻。
