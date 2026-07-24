# Super Robot integrated build

This is the reproducible local engineering route for turning separately
versioned private packages into a testable OpenBOR staging tree. It does not
publish art, alter either source checkout, or claim that gameplay is complete.

## Inputs and precedence

The public engineering checkout supplies scripts and validators. A local
`openbor_security_materal` checkout supplies approved private overlays.
`assemble-super-robot-overlay.mjs` copies these in a fixed order: six player
packages; six-player select UI; Stage 01, enemy, and prop packages; then
six-player roster registration, Wei Yan tail-ray registration, and Getter
gore-remap. The final registrations intentionally overwrite shared files.

The assembler refuses an existing output directory and records SHA-256 hashes
in `ASSEMBLY-MANIFEST.json`, making each disposable build reviewable.

## Build a disposable stage

From this public repository checkout:

```bash
node scripts/assemble-super-robot-overlay.mjs \
  --private-repo ../openbor_security_materal \
  --output /tmp/robot-wof-super-robot-overlay

node scripts/prepare-openbor-smoke.mjs \
  --base ../workplace/extracted/data \
  --overlay /tmp/robot-wof-super-robot-overlay/data \
  --output /tmp/robot-wof-super-robot-stage \
  --case-model chars/guanyu/guanyu.txt \
  --case-model chars/zhangfei/zhangfei.txt \
  --case-model chars/zhaoyun/zhaoyun.txt \
  --case-model chars/huangzhong/huangzhong.txt \
  --case-model chars/weiyan/weiyan.txt \
  --case-model chars/nu_gundam/nu_gundam.txt

# Add exact-case aliases only in the disposable tree for the Stage 01 level
# and blue-helmet enemy. The original module has broader legacy case debt.
node scripts/alias-model-case-in-stage.mjs \
  --source-root ../workplace/extracted/data \
  --stage-root /tmp/robot-wof-super-robot-stage \
  --model data/levels/NewWof/1/01.txt \
  --model data/chars/army/1/bing.txt

# Route remaining Stage 01 human enemy spawn names to the approved robot grunt
# in the disposable tree. Keep the original level in VisibleQA/ as evidence.
node scripts/alias-stage-robot-roster.mjs \
  --stage /tmp/robot-wof-super-robot-stage
node scripts/validate-stage-robot-roster.mjs \
  --stage /tmp/robot-wof-super-robot-stage
```

All output is disposable and excluded from Git. Do not copy private source
images into the public engineering repository.

## Required gates

```bash
node scripts/validate-super-robot-integration.mjs \
  --stage /tmp/robot-wof-super-robot-stage

scripts/run-openbor-smoke-docker.sh \
  --binary /path/to/OpenBOR \
  --stage /tmp/robot-wof-super-robot-stage
```

Do not run the strict validator over the entire legacy `data/` directory: its
unmodified baseline contains known missing and case-mismatched references.
The target list above is the integration gate for this package set.

For a visual infrastructure check, create the staging-only route with
`prepare-openbor-visible-qa.mjs` and use the isolated Docker X11 helper in
[DOCKER_VISIBLE_QA.md](DOCKER_VISIBLE_QA.md). A boot or MP4 only proves loading
and automation; attack, collision, AI, and level gameplay remain separate
gates.

## Current boundary

This is an integration pipeline, not a release claim. The reported Getter
attack hang blocks a `playable` label even if assembly and load validation pass.

## 2026-07-24 verification checkpoint

The disposable assembly was rerun from the current public checkout and private
overlay. `assemble-super-robot-overlay.mjs` produced 13 packages (527 overlay
files), `prepare-openbor-smoke.mjs` produced `/tmp/robot-wof-super-robot-stage`,
and `validate-super-robot-integration.mjs` passed all 9 targets: six playable
models, the six-player select list, Stage 01, and the blue-helmet enemy. The
stage-only robot roster adapter then routed 39 legacy human enemy spawns
(`man*`, `woman*`, `shooter`, `cap*`, `feifei`, `ybing`) to `bing`; its validator
confirmed no such spawn names remain. This is intentionally a temporary shared
grunt behavior, not a claim that distinct ranged/heavy enemy art is complete.

The Linux x86-64 OpenBOR v7533 binary was rebuilt in Docker from the pinned
OpenBOR source (`/tmp/openbor-linux-docker/.../OpenBOR`). Running that binary
with SDL dummy drivers reached `Loading models............... Done!` and
`Object engine init........... Done!`; the log contained no fatal model/file
load errors. The bounded process ended with the expected timeout status 124.
The legacy module also prints animated-GIF warnings for `logob/51.gif`–`53.gif`
and emits a known shutdown double-free after the load gate; these are runtime
teardown/legacy-logo issues, not a failed target-model load. They remain open
before calling the build playable or release-ready.
