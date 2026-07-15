#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'research/BOSS_FIRST_PLAYABLE_BATCH.md');

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function rel(from, to) {
  return path.relative(path.join(ROOT, from), path.join(ROOT, to)).replace(/\\/g, '/');
}

const primary = [
  {
    id: 'BOSS-LIDIAN-A',
    slot: 'lidian',
    files: 'data/chars/boss/lidian/lidian.txt · data/chars/boss/lidian/li.txt',
    purpose: '把 Stage01 Boss 的 production redraw 與 visible gameplay review 收斂成第一個可交接包。',
    verify: '69 GIF + 6 TXT engineering closure 已有；新 batch 要補 spawn / hurt / death / fragment 的 production art。',
  },
  {
    id: 'BOSS-ZEON-A',
    slot: 'zeon_boss',
    files: 'data/chars/boss/zeon_boss/boss_hud.gif · data/story/diag/zeon_boss.txt · data/story/pro/char_pilot.gif',
    purpose: '把有腳吉翁克與夏亞 cut-in 的 runtime closure 攤平成第一個 boss runtime batch。',
    verify: '67-file closure、67 張 GIF、pilot cut-in 與 boss HUD 必須同時可載入。',
  },
];

const nextBatch = [
  {
    id: 'BOSS-XUCHU-G0',
    slot: 'xuchu',
    files: 'research/XUCHU_G0_BATCH.md · research/manifests/xuchu-g0-closure.json',
    purpose: '先做縮尺版大型主角機 Boss，保留原 canvas 但把 silhouette / hurt / death 做成能打的 G0。',
    verify: '依現成 closure 抽出 50 unique refs；之後再補 geometry-migration.json 與可視 gameplay review。',
  },
  {
    id: 'BOSS-XIAHORSE-SPLIT',
    slot: 'xiahorse',
    files: 'data/chars/boss/xiahoudun/… · data/chars/boss/xiahorse/…',
    purpose: '把騎乘載具與駕駛員分離，避免戰鬥中途閃回原素材。',
    verify: '低血量分離、horse / lei3 替代依賴與 phase 1/2 都要閉包。',
  },
];

const lines = [];
lines.push('# Boss first playable batch');
lines.push('');
lines.push('這份文件把 boss 線收斂成可以直接交接的第一批。');
lines.push('它優先處理已經有 engineering closure 的 boss，讓 production redraw 與 runtime closure 都有明確入口。');
lines.push('');
lines.push('## 範圍定義');
lines.push('');
lines.push('- 第一個 boss playable batch = `lidian` production redraw + `zeon_boss` runtime closure。');
lines.push('- 這不是把所有 boss 一次做完；`xuchu`、`xiahorse` 與三人組仍在下一批。');
lines.push('- 這批只做可交接包：依賴閉包、canvas、exact-case、palette index 0 與 smoke gate。');
lines.push('');
lines.push('## Primary batch');
lines.push('');
lines.push('| Batch | Slot | Files / models | 目的 | 驗證重點 |');
lines.push('| --- | --- | --- | --- | --- |');
for (const row of primary) {
  lines.push(`| ${row.id} | ${row.slot} | ${row.files} | ${row.purpose} | ${row.verify} |`);
}
lines.push('');
lines.push('## Next after the first batch');
lines.push('');
lines.push('| Batch | Slot | Files / models | 目的 | 驗證重點 |');
lines.push('| --- | --- | --- | --- | --- |');
for (const row of nextBatch) {
  lines.push(`| ${row.id} | ${row.slot} | ${row.files} | ${row.purpose} | ${row.verify} |`);
}
lines.push('');
lines.push('## 驗證命令');
lines.push('');
lines.push('```bash');
lines.push('node scripts/validate-openbor-assets.mjs --data <staging-tree>/data/models.txt --strict');
lines.push('node scripts/validate-openbor-assets.mjs --data <staging-tree>/data/chars/boss/lidian/lidian.txt --strict');
lines.push('node scripts/validate-openbor-assets.mjs --data <staging-tree>/data/chars/boss/zeon_boss/zeon_boss.txt --strict');
lines.push('scripts/run-openbor-smoke-docker.sh --binary /path/to/OpenBOR --stage <staging-tree> --seconds 20');
lines.push('```');
lines.push('');
lines.push('## 來源文件');
lines.push('');
for (const source of [
  'research/manifests/boss-next-queue.json',
  'docs/BOSS_PRODUCTION_PLAN.md',
  'docs/ZEON_BOSS_WITH_LEGS_PLAN.md',
  'research/ENEMY_BOSS_CONCEPT_MAP.md',
]) {
  lines.push(`- [${source}](${rel('research', source)})`);
}

fs.writeFileSync(OUT, lines.join('\n'));
console.log(`Wrote ${path.relative(ROOT, OUT)}`);
