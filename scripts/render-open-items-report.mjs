#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const queuePaths = [
  'research/manifests/stage01-next-queue.json',
  'research/manifests/stage01-delivery-checklist.json',
  'research/manifests/boss-next-queue.json',
  'research/manifests/portrait-work-queue.json',
  'research/manifests/guanyu-next-queue.json',
  'research/manifests/nu-gundam-next-queue.json',
];

const portraitQueuePath = 'research/manifests/portrait-work-queue.json';

const rows = [];
let totalPending = 0;
for (const qpath of queuePaths) {
  const abs = path.join(ROOT, qpath);
  if (!fs.existsSync(abs)) continue;
  const data = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const pending = Array.isArray(data.remainingWork)
    ? data.remainingWork.filter(item => item.status === 'pending').length
    : (Array.isArray(data.deliverables)
        ? data.deliverables.filter(item => item.status !== 'production-ready' && item.status !== 'proven').length
        : 0);
  totalPending += pending;
  rows.push({
    id: data.subject || data.project || path.basename(qpath),
    status: data.status || data.auditStatus || 'unknown',
    pending,
    path: path.relative(path.join(ROOT, 'research'), path.join(ROOT, qpath)).replace(/\\/g, '/'),
  });
}

rows.sort((a, b) => b.pending - a.pending || a.id.localeCompare(b.id));

const lines = [];
lines.push('# Open items summary');
lines.push('');
lines.push('This report aggregates the currently open queues and delivery checklists. It is a working summary for handoff and prioritization, not a completion claim.');
lines.push('');
lines.push(`Total open items (approximate, from queued pending rows): ${totalPending}`);
lines.push('');
lines.push('| Workstream | Status | Open items | Source |');
lines.push('| --- | --- | ---: | --- |');
for (const row of rows) {
  lines.push(`| ${row.id} | ${row.status} | ${row.pending} | [${row.path}](${row.path}) |`);
}
lines.push('');
lines.push('## What is still blocking end-state completion');
lines.push('');
lines.push('- Stage01 still needs production redraw, grunt cleanup, boss art review, UI/story unification, and platform smoke.');
lines.push('- Boss work still needs production art closure for Lidian, Zeon Boss, Xuchu, Xiahorse, and the adult-coded trio.');
lines.push('- Player-side production cleanup still remains for Guanyu / Nu Gundam / portrait work, with deferred closure on the existing P0 engineering slices.');
lines.push('');
lines.push('## Most actionable next work');
lines.push('');
lines.push('1. Close Stage01 production redraw and cleanup first, because it unlocks the first visible in-gameplay slice and still has the broadest public-facing surface.');
lines.push('2. Finish Boss production closures next, especially Lidian and the Zeon Boss queue, because those reuse the same stage presentation and art-review path.');
lines.push('3. Keep player-side portrait work aligned with the current routing rules so new art lands in the correct slot without reassigning playable models.');
lines.push('');
if (fs.existsSync(path.join(ROOT, portraitQueuePath))) {
  const portraitData = JSON.parse(fs.readFileSync(path.join(ROOT, portraitQueuePath), 'utf8'));
  const decisions = Array.isArray(portraitData.decisionQueue) ? portraitData.decisionQueue : [];
  if (decisions.length) {
    lines.push('## Confirmed portrait routing');
    lines.push('');
    for (const row of decisions) {
      lines.push(`- ${row.name}: ${row.recommendedRole || row.status}`);
    }
    lines.push('');
  }
}
lines.push('## Recently verified gates');
lines.push('');
lines.push('These are no longer open items; they are documented separately so future work can distinguish model-load evidence from playable QA:');
lines.push('');
lines.push('- [Guanyu Linux smoke evidence](GUANYU_LINUX_SMOKE.md)');
lines.push('- [ν Gundam Linux smoke evidence](NU_GUNDAM_LINUX_SMOKE.md)');
lines.push('- [ν Gundam runner QA checklist](NU_GUNDAM_RUNNER_QA.md)');
lines.push('');
lines.push('## Generated from');
lines.push('');
for (const qpath of queuePaths) {
  lines.push(`- ${path.relative(path.join(ROOT, 'research'), path.join(ROOT, qpath)).replace(/\\/g, '/')}`);
}

const out = path.join(ROOT, 'research/OPEN_ITEMS_REPORT.md');
fs.writeFileSync(out, lines.join('\n'));
console.log(`Wrote ${path.relative(ROOT, out)}`);
