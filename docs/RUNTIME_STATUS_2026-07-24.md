# Runtime status — 2026-07-24

This checkpoint records the first fresh visible run after the Stage 01 robot
roster adapter. It is evidence for the remake work, not a release claim.

## Fresh disposable run

The stage was rebuilt from the current public checkout and private overlay:

```bash
node scripts/assemble-super-robot-overlay.mjs \
  --private-repo ../openbor_security_materal \
  --output /tmp/robot-wof-super-robot-overlay-v2
node scripts/prepare-openbor-smoke.mjs \
  --base ../workplace/extracted/data \
  --overlay /tmp/robot-wof-super-robot-overlay-v2/data \
  --output /tmp/robot-wof-super-robot-stage-v2 \
  --case-model chars/guanyu/guanyu.txt \
  --case-model chars/zhangfei/zhangfei.txt \
  --case-model chars/zhaoyun/zhaoyun.txt \
  --case-model chars/huangzhong/huangzhong.txt \
  --case-model chars/weiyan/weiyan.txt \
  --case-model chars/nu_gundam/nu_gundam.txt
node scripts/alias-model-case-in-stage.mjs \
  --source-root ../workplace/extracted/data \
  --stage-root /tmp/robot-wof-super-robot-stage-v2 \
  --model data/levels/NewWof/1/01.txt \
  --model data/chars/army/1/bing.txt
node scripts/alias-stage-robot-roster.mjs \
  --stage /tmp/robot-wof-super-robot-stage-v2
node scripts/validate-stage-robot-roster.mjs \
  --stage /tmp/robot-wof-super-robot-stage-v2
node scripts/validate-super-robot-integration.mjs \
  --stage /tmp/robot-wof-super-robot-stage-v2
node scripts/prepare-openbor-visible-qa.mjs \
  --stage /tmp/robot-wof-super-robot-stage-v2
```

The target gate passed 9/9, and the roster validator routed 39 legacy human
enemy spawns to `bing`. The isolated X11 runner then executed:

```bash
bash scripts/run-openbor-visible-docker.sh \
  --binary /tmp/openbor-linux-docker/source/engine/releases/LINUX/OpenBOR/OpenBOR \
  --stage /tmp/robot-wof-super-robot-stage-v2 \
  --seconds 50 \
  --macro guanyu_attack_stage1
```

Observed evidence (kept only in `/tmp`):

- window id `4194313` was found;
- MP4 duration is `50.016633` seconds, 1024×768, 1499 frames;
- the capture reaches the robot Stage 01 view after selection;
- `Logs/OpenBorLog.txt` reaches `Loading models... Done!` and `Object engine init... Done!`;
- the process remains bounded and records the attack macro instead of hanging
  before the capture ends.

## Boundary

The runner exits with bounded status 124 and prints the known glibc heap
teardown message (`corrupted size...`) after the capture. The harness currently
does not inspect an OpenBOR animation id or hitbox, so this run does not prove
that every `A` input reached Getter's intended attack animation. A graceful
desktop exit, frame/animation assertion, distinct enemy families, later levels,
and production-quality redraws remain open before calling the remake playable
or release-ready.
