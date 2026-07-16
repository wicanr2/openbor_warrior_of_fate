#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function usage() {
  console.log(`Usage:
  node scripts/prepare-openbor-visible-qa.mjs --stage PATH

Replaces only the disposable stage's data/levels.txt with a QA route:
six-player select -> NewWof Stage 1. The original levels.txt is copied to
VisibleQA/levels.original.txt for evidence; base data and overlays are untouched.`);
}

function parseArguments(argv) {
  if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) {
    usage();
    process.exit(0);
  }
  if (argv.length !== 2 || argv[0] !== '--stage') throw new Error('--stage PATH is required');
  return path.resolve(argv[1]);
}

try {
  const stage = parseArguments(process.argv.slice(2));
  const levels = path.join(stage, 'data', 'levels.txt');
  const sentinel = path.join(stage, 'robot-wof.dev.pak');
  if (!fs.existsSync(levels) || !fs.existsSync(sentinel)) {
    throw new Error('stage must be prepared by prepare-openbor-smoke.mjs');
  }
  const source = fs.readFileSync(levels, 'utf8');
  const marker = /^\s*skipselect\s*$/mi;
  const match = marker.exec(source);
  if (!match) throw new Error(`cannot find first skipselect in ${levels}`);
  const settings = source.slice(0, match.index).replace(/\s+$/, '');
  const visibleQaLevels = `${settings}\n\n# Keep the initial engine skip; the following entry is the styled module select.\nskipselect\n# Disposable visible-QA route: select -> Stage 1\nselect data/levels/select.txt\nz 130 272 272\nfile data/levels/NewWof/1/01.txt\nend\n`;
  const evidenceDirectory = path.join(stage, 'VisibleQA');
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  fs.writeFileSync(path.join(evidenceDirectory, 'levels.original.txt'), source);
  fs.writeFileSync(levels, visibleQaLevels);
  fs.writeFileSync(path.join(evidenceDirectory, 'QA-LEVELS-MANIFEST.json'), `${JSON.stringify({
    schemaVersion: 1,
    route: ['skipselect', 'data/levels/select.txt', 'data/levels/NewWof/1/01.txt'],
    baseOrOverlayModified: false,
    stageOnly: true,
  }, null, 2)}\n`);
  console.log(`PASS: prepared visible QA route in ${stage}`);
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
