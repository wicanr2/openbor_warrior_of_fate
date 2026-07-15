#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, 'research/SMOKE_EVIDENCE_INDEX.md');
const EXPECTED = [
  ['ν Gundam', 'NU_GUNDAM_RUNNER_QA.md'],
  ['Stage01', 'STAGE01_LINUX_SMOKE.md'],
  ['Lidian', 'LIDIAN_LINUX_SMOKE.md'],
  ['Huangzhong', 'HUANGZHONG_LINUX_SMOKE.md'],
];

const errors = [];

if (!fs.existsSync(INDEX_PATH)) {
  errors.push('missing research/SMOKE_EVIDENCE_INDEX.md');
} else {
  const text = fs.readFileSync(INDEX_PATH, 'utf8');
  for (const [label, file] of EXPECTED) {
    const needle = `| ${label} | [${file}](${file}) |`;
    if (!text.includes(needle)) errors.push(`missing evidence row: ${label}`);
    if (!fs.existsSync(path.join(ROOT, 'research', file))) errors.push(`missing evidence note: research/${file}`);
  }
  if (!text.includes('This index tracks the smoke gates that have been proven')) {
    errors.push('index intro missing');
  }
  if (!text.includes('Windows and macOS runner smoke remain pending across the project.')) {
    errors.push('index interpretation missing platform caveat');
  }
}

if (errors.length) {
  for (const error of errors) console.error(error);
  console.error(`\n${errors.length} smoke evidence index problem(s) found.`);
  process.exitCode = 1;
} else {
  console.log('Smoke evidence index validation PASS.');
}

