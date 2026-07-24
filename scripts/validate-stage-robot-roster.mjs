#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const i = argv.indexOf('--stage');
if (i < 0 || !argv[i + 1] || argv.length !== 2) {
  console.error('Usage: node scripts/validate-stage-robot-roster.mjs --stage PATH');
  process.exit(2);
}
const stage = path.resolve(argv[i + 1]);
const level = path.join(stage, 'data/levels/NewWof/1/01.txt');
const manifest = path.join(stage, 'VisibleQA/ROBOT-ROSTER-MANIFEST.json');
if (!fs.existsSync(level) || !fs.existsSync(manifest)) throw new Error('robot roster adapter evidence is missing');
const data = fs.readFileSync(level, 'utf8');
const forbidden = /^\s*spawn\s+(man1|man2|man3|man4|woman1|woman2|woman3|shooter|cap|cap2|feifei|ybing)\b/gm;
const matches = data.match(forbidden) || [];
if (matches.length) throw new Error(`legacy human enemy spawns remain: ${matches.length}`);
const record = JSON.parse(fs.readFileSync(manifest, 'utf8'));
if (record.targetModel !== 'bing' || record.replacements < 1 || !record.stageOnly) {
  throw new Error('invalid robot roster manifest');
}
console.log(`PASS: Stage 01 robot roster has no legacy human spawns (${record.replacements} routed to bing)`);
