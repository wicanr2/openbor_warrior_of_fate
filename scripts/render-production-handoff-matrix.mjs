#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'research/PRODUCTION_HANDOFF_MATRIX.md');

const sources = {
  stage01Queue: 'research/manifests/stage01-next-queue.json',
  stage01Checklist: 'research/manifests/stage01-delivery-checklist.json',
  bossQueue: 'research/manifests/boss-next-queue.json',
  portraitQueue: 'research/manifests/portrait-work-queue.json',
  guanyuQueue: 'research/manifests/guanyu-next-queue.json',
  nuQueue: 'research/manifests/nu-gundam-next-queue.json',
};

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function rel(from, to) {
  return path.relative(path.join(ROOT, from), path.join(ROOT, to)).replace(/\\/g, '/');
}

function listPending(data, key = 'remainingWork') {
  if (Array.isArray(data[key])) {
    return data[key].filter(item => item.status === 'pending');
  }
  if (Array.isArray(data.deliverables)) {
    return data.deliverables.filter(item => item.status !== 'production-ready' && item.status !== 'proven');
  }
  return [];
}

const stage01Queue = readJson(sources.stage01Queue);
const stage01Checklist = readJson(sources.stage01Checklist);
const bossQueue = readJson(sources.bossQueue);
const portraitQueue = readJson(sources.portraitQueue);
const guanyuQueue = readJson(sources.guanyuQueue);
const nuQueue = readJson(sources.nuQueue);

const rows = [
  {
    area: 'Stage01',
    owner: 'environment / grunt / boss / UI',
    status: stage01Queue.status,
    source: rel('research', sources.stage01Queue),
    pending: listPending(stage01Queue).map(item => `${item.id}: ${item.title}`).join('; '),
    next: 'Start with research/STAGE01_FIRST_PLAYABLE_BATCH.md, then finish long background redraw, grunt cleanup, Lidian review, and UI/story replacement.',
  },
  {
    area: 'Stage01 delivery',
    owner: 'delivery checklist',
    status: stage01Checklist.status,
    source: rel('research', sources.stage01Checklist),
    pending: listPending(stage01Checklist).map(item => `${item.id}: ${item.target}`).join('; '),
    next: 'Stage01 Linux smoke is verified; Windows and macOS smoke remain.',
  },
  {
    area: 'Boss',
    owner: 'boss / story / cut-in',
    status: bossQueue.status,
    source: rel('research', sources.bossQueue),
    pending: listPending(bossQueue).map(item => `${item.id}: ${item.title}`).join('; '),
    next: 'Start with research/BOSS_FIRST_PLAYABLE_BATCH.md, then close Lidian redraw, Zeon boss runtime, Xuchu G0, Xiahorse split, and the adult-coded trio.',
  },
  {
    area: 'Portraits',
    owner: 'selection / HUD / cut-in',
    status: portraitQueue.status,
    source: rel('research', sources.portraitQueue),
    pending: portraitQueue.decisionQueue
      .filter(item => item.status === 'unassigned')
      .map(item => `${item.name} → ${item.recommendedRole}`)
      .join('; '),
    next: 'Keep liubei / caocao / lubu story-only unless explicitly promoted; resolve nu_gundam pilot and zeon_boss cut-in separately.',
  },
  {
    area: 'Getter / Guanyu',
    owner: 'player production cleanup',
    status: guanyuQueue.status,
    source: rel('research', sources.guanyuQueue),
    pending: listPending(guanyuQueue).map(item => `${item.id}: ${item.title}`).join('; '),
    next: 'g1–g16, gore, death audio, and visible gameplay QA remain.',
  },
  {
    area: 'ν Gundam',
    owner: 'player production cleanup',
    status: nuQueue.status,
    source: rel('research', sources.nuQueue),
    pending: listPending(nuQueue).map(item => `${item.id}: ${item.title}`).join('; '),
    next: 'Finish visible runner QA / Stage 1 entry / Funnel P1 while preserving six-candidate select rules.',
  },
];

const verified = [
  'Stage01 Linux smoke evidence',
  'Lidian Linux smoke evidence',
  'Huangzhong Linux smoke evidence',
  'Guanyu Linux smoke evidence',
  'ν Gundam Linux smoke evidence',
];

const lines = [];
lines.push('# Production handoff matrix');
lines.push('');
lines.push('This matrix is the shortest useful handoff view for the remaining Robot WOF work. It groups the queues by who should act next, not by how much has already been verified.');
lines.push('');
lines.push('## Already verified loader gates');
lines.push('');
for (const gate of verified) {
  lines.push(`- ${gate}`);
}
lines.push('');
lines.push('## Remaining work by area');
lines.push('');
lines.push('| Area | Owner | Status | Pending work | Next action | Source |');
lines.push('| --- | --- | --- | --- | --- | --- |');
for (const row of rows) {
  lines.push(`| ${row.area} | ${row.owner} | ${row.status} | ${row.pending || '—'} | ${row.next} | [${row.source}](${row.source}) |`);
}
lines.push('');
lines.push('## Interpretation');
lines.push('');
lines.push('- Stage01 is still the first visible-in-gameplay slice, but Linux smoke is no longer a blocker.');
lines.push('- Boss work still needs production art closure, even though Lidian Linux loader evidence is already recorded.');
lines.push('- Portrait work is mostly about routing and assignment now; `nu_gundam` and `zeon_boss` remain separate from generic story-only names.');
lines.push('- Guanyu and ν Gundam are engineering/runtime complete but still need production and visible QA closure.');
lines.push('');
lines.push('## Generated from');
lines.push('');
for (const relPath of Object.values(sources)) {
  lines.push(`- ${rel('research', relPath)}`);
}

fs.writeFileSync(OUT, lines.join('\n'));
console.log(`Wrote ${path.relative(ROOT, OUT)}`);
