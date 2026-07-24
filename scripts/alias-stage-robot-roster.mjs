#!/usr/bin/env node

// Stage-only adapter: route legacy human enemy spawn names to the approved
// robot grunt model already present in the private overlay. This never edits
// the base checkout or publishes private art; it writes a backup and manifest
// beside the disposable stage.
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const stageIndex = argv.indexOf('--stage');
if (stageIndex < 0 || !argv[stageIndex + 1] || argv.length !== 2) {
  console.error('Usage: node scripts/alias-stage-robot-roster.mjs --stage PATH');
  process.exit(2);
}
const stage = path.resolve(argv[stageIndex + 1]);
const level = path.join(stage, 'data/levels/NewWof/1/01.txt');
const sentinel = path.join(stage, 'robot-wof.dev.pak');
if (!fs.existsSync(level) || !fs.existsSync(sentinel)) {
  throw new Error('stage must be prepared by prepare-openbor-smoke.mjs');
}

const legacyNames = [
  'man1', 'man2', 'man3', 'man4',
  'woman1', 'woman2', 'woman3',
  'shooter', 'cap', 'cap2', 'feifei', 'ybing',
];
const source = fs.readFileSync(level, 'utf8');
const spawnPattern = /^(\s*spawn\s+)([^\s#]+)(.*)$/gm;
let replacements = 0;
const rewritten = source.replace(spawnPattern, (line, prefix, name, suffix) => {
  if (!legacyNames.includes(name)) return line;
  replacements += 1;
  return `${prefix}bing${suffix}`;
});
if (!replacements) throw new Error('no legacy human enemy spawns found');

const evidence = path.join(stage, 'VisibleQA');
fs.mkdirSync(evidence, { recursive: true });
const backup = path.join(evidence, 'levels.NewWof.1.original.txt');
if (!fs.existsSync(backup)) fs.writeFileSync(backup, source);
fs.writeFileSync(level, rewritten);
fs.writeFileSync(path.join(evidence, 'ROBOT-ROSTER-MANIFEST.json'), `${JSON.stringify({
  schemaVersion: 1,
  stageOnly: true,
  level: 'data/levels/NewWof/1/01.txt',
  targetModel: 'bing',
  targetModelRole: 'Shimada/blue-helmet robot grunt',
  replacedNames: legacyNames,
  replacements,
  originalBackup: 'VisibleQA/levels.NewWof.1.original.txt',
  limitation: 'All mapped names temporarily share bing behavior; ranged/melee semantics and distinct enemy art remain a later package.',
}, null, 2)}\n`);
console.log(`PASS: routed ${replacements} legacy human enemy spawns to bing in ${level}`);
