#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'research/manifests/completion-audit.json'), 'utf8'));
const roadmap = JSON.parse(fs.readFileSync(path.join(ROOT, 'research/manifests/project-roadmap.json'), 'utf8'));

const statusColors = {
  proven: '#2e7d32',
  'proven-as-documentation': '#1565c0',
  incomplete: '#ef6c00',
  false: '#c62828',
};

const reqs = audit.requirements;
const total = reqs.length;
const counts = reqs.reduce((acc, req) => {
  acc[req.status] = (acc[req.status] || 0) + 1;
  return acc;
}, {});
const pendingQueues = roadmap.workstreams.filter(w => String(w.nextQueue || '').endsWith('.json')).map(w => {
  let pending = 'n/a';
  try {
    const q = JSON.parse(fs.readFileSync(path.join(ROOT, w.nextQueue), 'utf8'));
    if (Array.isArray(q.remainingWork)) pending = q.remainingWork.filter(x => x.status === 'pending').length;
  } catch {}
  return { id: w.id, status: w.status, queue: w.nextQueue, pending };
});

const width = 1400;
const rowH = 42;
const topH = 210;
const bottomH = 120;
const height = topH + reqs.length * rowH + bottomH;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const rows = reqs.map((req, i) => {
  const y = topH + i * rowH;
  const color = statusColors[req.status] || '#546e7a';
  const evid = req.evidence.length;
  return `
    <rect x="28" y="${y}" width="1344" height="34" rx="8" fill="#111827" opacity="0.88"/>
    <rect x="32" y="${y + 4}" width="12" height="26" rx="4" fill="${color}"/>
    <text x="58" y="${y + 16}" class="req">${esc(req.id)}</text>
    <text x="280" y="${y + 16}" class="txt">${esc(req.requirement)}</text>
    <text x="1110" y="${y + 16}" class="mono">${esc(req.status)}</text>
    <text x="1260" y="${y + 16}" class="mono">evidence ${evid}</text>`;
}).join('\n');

const workstreamLines = pendingQueues.map((w, i) => {
  const y = 36 + i * 20;
  return `<text x="32" y="${y}" class="mono">${esc(w.id)} → ${esc(w.status)} → pending ${esc(w.pending)} (${esc(w.queue)})</text>`;
}).join('\n');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .bg { fill: #0b1020; }
      .panel { fill: #111827; stroke: #334155; stroke-width: 1; }
      .title { fill: #e5e7eb; font: 700 30px sans-serif; }
      .sub { fill: #cbd5e1; font: 400 16px sans-serif; }
      .req { fill: #f8fafc; font: 700 15px sans-serif; }
      .txt { fill: #dbeafe; font: 400 14px sans-serif; }
      .mono { fill: #cbd5e1; font: 500 13px monospace; }
      .small { fill: #94a3b8; font: 400 12px sans-serif; }
    </style>
  </defs>
  <rect class="bg" x="0" y="0" width="${width}" height="${height}"/>
  <rect class="panel" x="24" y="24" width="1352" height="${topH - 40}" rx="14"/>
  <text x="36" y="58" class="title">Warriors of Fate → Robot WOF completion dashboard</text>
  <text x="36" y="84" class="sub">Objective: ${esc(audit.objective)}</text>
  <text x="36" y="110" class="sub">auditStatus: ${esc(audit.auditStatus)} · requirements: ${total} · proven: ${counts.proven || 0} · documentation: ${counts['proven-as-documentation'] || 0} · incomplete: ${counts.incomplete || 0} · false: ${counts.false || 0}</text>
  <text x="36" y="136" class="sub">Generated from completion-audit.json and project-roadmap.json; this is an evidence summary, not a claim of game completion.</text>
  <rect x="28" y="150" width="1344" height="46" rx="10" fill="#0f172a" stroke="#334155"/>
  <text x="38" y="176" class="mono">workstream snapshot</text>
  ${workstreamLines}
  <rect class="panel" x="24" y="${topH - 6}" width="1352" height="${reqs.length * rowH + bottomH}" rx="14"/>
  ${rows}
  <rect class="panel" x="24" y="${height - bottomH + 8}" width="1352" height="${bottomH - 16}" rx="14"/>
  <text x="36" y="${height - bottomH + 38}" class="sub">Legend: green = proven, blue = documentation only, orange = incomplete, red = false.</text>
  <text x="36" y="${height - bottomH + 64}" class="small">Pending queues: stage01 / boss / portrait / guanyu / nu-gundam remain non-empty; that is why the overall objective remains incomplete.</text>
</svg>`;

const out = path.join(ROOT, 'research/previews/completion-audit-dashboard.svg');
fs.writeFileSync(out, svg);
console.log(`Wrote ${path.relative(ROOT, out)}`);
