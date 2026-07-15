#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const reportPath = path.join(ROOT, 'research/OPEN_ITEMS_REPORT.md');
const queuePaths = [
  'research/manifests/stage01-next-queue.json',
  'research/manifests/stage01-delivery-checklist.json',
  'research/manifests/boss-next-queue.json',
  'research/manifests/portrait-work-queue.json',
  'research/manifests/guanyu-next-queue.json',
  'research/manifests/nu-gundam-next-queue.json',
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function countOpenItems(data) {
  if (Array.isArray(data.remainingWork)) {
    return data.remainingWork.filter(item => item.status === 'pending').length;
  }
  if (Array.isArray(data.deliverables)) {
    return data.deliverables.filter(item => item.status !== 'production-ready' && item.status !== 'proven').length;
  }
  return 0;
}

function reportLinkTarget(relPath) {
  return path.relative(path.join(ROOT, 'research'), path.join(ROOT, relPath)).replace(/\\/g, '/');
}

const errors = [];

if (!fs.existsSync(reportPath)) {
  errors.push('missing research/OPEN_ITEMS_REPORT.md');
} else {
  const text = fs.readFileSync(reportPath, 'utf8');
  const expectedRows = [];
  let total = 0;
  for (const qpath of queuePaths) {
    const abs = path.join(ROOT, qpath);
    if (!fs.existsSync(abs)) continue;
    const data = readJson(abs);
    const open = countOpenItems(data);
    total += open;
    expectedRows.push({
      id: data.subject || data.project || path.basename(qpath),
      status: data.status || data.auditStatus || 'unknown',
      open,
      link: reportLinkTarget(qpath),
    });
  }

  const totalMatch = text.match(/Total open items \(approximate, from queued pending rows\):\s*(\d+)/);
  if (!totalMatch) {
    errors.push('report missing total open items line');
  } else if (Number(totalMatch[1]) !== total) {
    errors.push(`report total mismatch: expected ${total}, found ${totalMatch[1]}`);
  }

  for (const row of expectedRows) {
    if (!text.includes(`| ${row.id} | ${row.status} | ${row.open} | [${row.link}](${row.link}) |`)) {
      errors.push(`report missing or mismatched row for ${row.id}`);
    }
  }

  const generatedFromTargets = queuePaths.map(qpath => reportLinkTarget(qpath));
  for (const target of generatedFromTargets) {
    if (!text.includes(`- ${target}`)) {
      errors.push(`report missing generated-from entry for ${target}`);
    }
  }

  if (!text.includes('This report aggregates the currently open queues')) {
    errors.push('report missing summary intro');
  }
  if (!text.includes('What is still blocking end-state completion')) {
    errors.push('report missing blocking section');
  }
}

if (errors.length) {
  for (const error of errors) {
    console.error(error);
  }
  console.error(`\n${errors.length} open items report problem(s) found.`);
  process.exitCode = 1;
} else {
  console.log('Open items report validation PASS.');
}
