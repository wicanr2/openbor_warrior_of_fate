#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'research/STAGE01_FIRST_PLAYABLE_BATCH.md');

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function rel(from, to) {
  return path.relative(path.join(ROOT, from), path.join(ROOT, to)).replace(/\\/g, '/');
}

const stage01Viewport = readJson('research/STAGE01_BACKGROUND_VIEWPORTS.json');
const stage01Queue = readJson('research/manifests/stage01-next-queue.json');
const stage01Checklist = readJson('research/manifests/stage01-delivery-checklist.json');
const bossQueue = readJson('research/manifests/boss-next-queue.json');

const primaryGate = [
  {
    id: 'BG-S01-A',
    files: 'data/bgs/01/S2.gif · data/bgs/01/panel.gif · data/bgs/01/f.GIF',
    purpose: '森林開場長圖與前景遮擋，先把視窗、地平線、wall / hole 與透明色契約鎖住。',
    verify: 'V00–V05 / S2-Tail 與 W1–W4 的幾何和遮擋一致。',
  },
  {
    id: 'EN-BING-A',
    files: 'data/chars/army/1/bing.txt · data/chars/army/1/bingxs.txt',
    purpose: '第一個原創量產雜兵；先完成 base palette、idle / walk / attack / fall / debris 閉包。',
    verify: '31 個直接動畫、42 個 physical GIF，且 palette index 0 固定為 #FC00FF。',
  },
  {
    id: 'PROP-S01-A',
    files: 'data/chars/misc/box/1/baoxiang.txt',
    purpose: '機械補給箱與破壞幀；保留掉落物契約，不把 item 畫死在箱內。',
    verify: 'baoxiang.gif、1.GIF、2.GIF 都要載入；破壞幀與掉落不互相遮蔽。',
  },
];

const nextBatch = [
  {
    id: 'BOSS-LIDIAN-A',
    status: 'follow-up',
    files: 'data/chars/boss/lidian/lidian.txt · data/chars/boss/lidian/li.txt',
    purpose: 'Stage01 Boss production redraw；工程 closure 已有，還缺可視 gameplay review。',
    verify: '69 GIF + 6 TXT 之外，還要做 spawn / hurt / death / fragment 的 production art。',
  },
  {
    id: 'UI-S01-A',
    status: 'follow-up',
    files: 'data/bgs/01/map1.txt · data/bgs/02/map2.txt · data/chars/misc/black.txt · data/chars/misc/story/story.txt',
    purpose: '戰術地圖、故事框、NPC 與頭像的機器人風格統一。',
    verify: 'map / story / portrait / NPC 的公開索引要能直接定位檔案。',
  },
];

const lines = [];
lines.push('# Stage01 first playable batch');
lines.push('');
lines.push('這份文件把第一關的「可玩 gate」收斂成可交接、可驗證、可追蹤的工程批次。');
lines.push('它的目標不是把 Stage01 全部做完，而是先讓 team 能用固定順序把最小可玩 slice 走通。');
lines.push('');
lines.push('## 範圍定義');
lines.push('');
lines.push('- 第一個 gate = 背景三層 + 藍盔雜兵 + 機械補給箱。');
lines.push('- Lidian boss、UI/story、platform smoke 不是同一個 gate，但都已在後續 queue 內。');
lines.push('- 這批只做 engineering handoff：canvas、大小寫、palette index 0、依賴閉包與 smoke gate。');
lines.push('');
lines.push('## Primary gate');
lines.push('');
lines.push('| Batch | Files / models | 目的 | 驗證重點 |');
lines.push('| --- | --- | --- | --- |');
for (const row of primaryGate) {
  lines.push(`| ${row.id} | ${row.files} | ${row.purpose} | ${row.verify} |`);
}
lines.push('');
lines.push('## Next after the playable gate');
lines.push('');
lines.push('| Batch | Status | Files / models | 目的 | 驗證重點 |');
lines.push('| --- | --- | --- | --- | --- |');
for (const row of nextBatch) {
  lines.push(`| ${row.id} | ${row.status} | ${row.files} | ${row.purpose} | ${row.verify} |`);
}
lines.push('');
lines.push('## 背景幾何與檢查點');
lines.push('');
lines.push('| ID | rect / source | 用途 |');
lines.push('| --- | --- | --- |');
for (const item of stage01Viewport.viewports) {
  lines.push(`| ${item.id} | ${item.rect.join(', ')} | playable viewport checkpoint |`);
}
for (const item of stage01Viewport.walls) {
  lines.push(`| ${item.id} | source ${item.source.join(', ')} | wall polygon checkpoint |`);
}
lines.push('');
lines.push('## 交付順序');
lines.push('');
lines.push('1. 先完成 `BG-S01-A`，把 480×276 可視範圍、wall / hole、index 0 透明色與前景遮擋鎖定。');
lines.push('2. 再完成 `EN-BING-A`，確認雜兵腳底、BBox、攻擊與倒地幀不會閃回原素材。');
lines.push('3. 接著完成 `PROP-S01-A`，把破壞幀與掉落物分離，確保補給箱能在實戰中被打破。');
lines.push('4. 之後把 `BOSS-LIDIAN-A` 接上，完成第一關 Boss 的 production redraw 與可視 gameplay review。');
lines.push('5. 最後把 `UI-S01-A` 與 cross-platform smoke 補齊，讓第一關可以交給其他藝術家接力。');
lines.push('');
lines.push('## 驗證命令');
lines.push('');
lines.push('```bash');
lines.push('node scripts/validate-openbor-assets.mjs --data <staging-tree>/data/levels/NewWof/1/01.txt --strict');
lines.push('node scripts/validate-overlay-parity.mjs --base workplace/extracted/data --overlay workplace/robot_wof_vertical_slice/overlay/data');
lines.push('node scripts/validate-vertical-slice-coverage.mjs --base workplace/extracted/data --overlay workplace/robot_wof_vertical_slice/overlay/data');
lines.push('scripts/run-openbor-smoke-docker.sh --binary /path/to/OpenBOR --stage <staging-tree> --seconds 20');
lines.push('```');
lines.push('');
lines.push('## 來源文件');
lines.push('');
for (const source of [
  'research/STAGE01_BACKGROUND_VIEWPORTS.json',
  'research/STAGE01_REPLACEMENT_MANIFEST.md',
  'research/manifests/stage01-next-queue.json',
  'research/manifests/stage01-delivery-checklist.json',
  'research/manifests/boss-next-queue.json',
  'docs/STAGE01_ENVIRONMENT_VERTICAL_SLICE.md',
  'docs/BLUE_HELMET_GRUNT_VERTICAL_SLICE.md',
  'docs/LIDIAN_BOSS_VERTICAL_SLICE.md',
]) {
  lines.push(`- [${source}](${rel('research', source)})`);
}

fs.writeFileSync(OUT, lines.join('\n'));
console.log(`Wrote ${path.relative(ROOT, OUT)}`);
