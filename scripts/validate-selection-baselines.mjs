#!/usr/bin/env node

import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const ROOT = process.cwd();
const CHECKS = [
  {
    name: 'Getter v2 selection baseline',
    manifest: 'research/manifests/getter-selection-v2-baseline.json',
    image: 'research/ui/select-getter-v2.gif',
  },
  {
    name: 'Six-player selection overview',
    manifest: 'research/manifests/six-player-selection-overview.json',
    image: 'research/ui/six-player-selection-overview.gif',
  },
];

function sha256(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

const errors = [];

for (const check of CHECKS) {
  const manifestPath = path.join(ROOT, check.manifest);
  const imagePath = path.join(ROOT, check.image);
  if (!fs.existsSync(manifestPath)) {
    errors.push(`missing manifest: ${check.manifest}`);
    continue;
  }
  if (!fs.existsSync(imagePath)) {
    errors.push(`missing image: ${check.image}`);
    continue;
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if ((manifest.canvas ?? []).join('x') !== '480x276') {
    errors.push(`${check.name}: canvas mismatch`);
  }
  if (manifest.productionReady !== false) {
    errors.push(`${check.name}: productionReady must remain false`);
  }
  const expectedSha = manifest.output?.sha256;
  const actualSha = sha256(imagePath);
  if (!expectedSha) {
    errors.push(`${check.name}: manifest missing output sha256`);
  } else if (expectedSha !== actualSha) {
    errors.push(`${check.name}: sha256 mismatch`);
  }
  if ((manifest.palette?.index0 ?? '') !== '#FC00FF') {
    errors.push(`${check.name}: palette index0 must be #FC00FF`);
  }
}

if (errors.length) {
  for (const error of errors) console.error(error);
  console.error(`\n${errors.length} selection baseline problem(s) found.`);
  process.exitCode = 1;
} else {
  console.log('Selection baselines validation PASS.');
}

