#!/usr/bin/env node

import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  analyzePose,
  encodeGif,
  forceChromaAtIndexZero,
  makeComposedPng,
  palettizeWithFfmpeg,
  probeImage,
  verifyGif,
} from './build-mazinger-p0-prototype.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const DEFAULT_SOURCE = join(ROOT, '../openbor_security_materal/assets/bosses/zeon-boss-with-legs/references/generated-storyboards/zeon-keyposes');
const DEFAULT_BASE = join(ROOT, 'workplace/extracted/data/chars/boss/xuchu');
const DEFAULT_OUT = join(ROOT, '../openbor_security_materal/assets/bosses/zeon-boss-with-legs/candidates/zeon-p0-v1');

function usage() {
  return `Build a Zeon boss P0 sprite candidate from 16 keyed poses.\n\nUsage:\n  node scripts/build-zeon-boss-p0-prototype.mjs [options]\n\nOptions:\n  --source-dir PATH   16 keyed PNGs\n  --base-dir PATH     extracted boss/xuchu directory\n  --output-dir PATH   candidate package root\n  --sprite-height N   max visible height (default 150)\n`;
}

function args(argv) {
  const out = { sourceDir: DEFAULT_SOURCE, baseDir: DEFAULT_BASE, outputDir: DEFAULT_OUT, spriteHeight: 150 };
  const names = new Map([['--source-dir', 'sourceDir'], ['--base-dir', 'baseDir'], ['--output-dir', 'outputDir']]);
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--help') { console.log(usage()); process.exit(0); }
    if (argv[i] === '--sprite-height') { out.spriteHeight = Number(argv[++i]); continue; }
    const key = names.get(argv[i]);
    if (!key || !argv[i + 1]) throw new Error(`Unknown or incomplete option: ${argv[i]}`);
    out[key] = resolve(argv[++i]);
  }
  return out;
}

function files(root) {
  const result = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) result.push(...files(path));
    else if (/\.gif$/i.test(entry.name)) result.push(path);
  }
  return result.sort();
}

const options = args(process.argv.slice(2));
const sourceFiles = Array.from({ length: 16 }, (_, i) => join(options.sourceDir, `frame-${String(i + 1).padStart(2, '0')}.png`));
if (!sourceFiles.every(existsSync)) throw new Error('Expected frame-01.png through frame-16.png');
if (!existsSync(join(options.baseDir, 'chu.txt'))) throw new Error(`Missing ${join(options.baseDir, 'chu.txt')}`);

const temp = mkdtempSync(join(tmpdir(), 'zeon-p0-'));
const outputData = join(options.outputDir, 'data/chars/boss/xuchu');
mkdirSync(outputData, { recursive: true });
const manifest = [];
try {
  const poses = sourceFiles.map((path) => ({ path, pose: analyzePose(path) }));
  const targets = files(options.baseDir);
  for (let index = 0; index < targets.length; index += 1) {
    const original = targets[index];
    const rel = relative(options.baseDir, original);
    const targetProbe = probeImage(original);
    const target = { canvas: { width: targetProbe.width, height: targetProbe.height }, offset: { x: Math.round(targetProbe.width / 2), y: targetProbe.height - 1 } };
    const selected = poses[index % poses.length];
    const composed = join(temp, `${index}.png`);
    const mapping = { anchor: 'center-bottom' };
    const placement = makeComposedPng(selected.path, composed, selected.pose, target, options.spriteHeight, mapping, true);
    const palette = palettizeWithFfmpeg(composed, targetProbe.width, targetProbe.height, temp);
    forceChromaAtIndexZero(palette.pixels, palette.bgraPalette);
    const output = join(outputData, rel);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, encodeGif(targetProbe.width, targetProbe.height, palette.pixels, palette.bgraPalette));
    verifyGif(output, targetProbe.width, targetProbe.height);
    manifest.push({ path: `data/chars/boss/xuchu/${rel}`, source: `frame-${String((index % 16) + 1).padStart(2, '0')}.png`, canvas: [targetProbe.width, targetProbe.height], placement });
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}

mkdirSync(options.outputDir, { recursive: true });
writeFileSync(join(options.outputDir, 'BUILD-MANIFEST.json'), JSON.stringify({
  schemaVersion: 1,
  modelId: 'zeon_boss',
  status: 'engineering-prototype-not-production-ready',
  productionReady: false,
  prototypePoseReuse: true,
  source: 'zeon-with-legs-v1.png',
  sourcePoseCount: 16,
  targetModel: 'data/chars/boss/xuchu/chu.txt',
  gifCount: manifest.length,
  deferred: ['frame-by-frame redraw and in-between review', 'boss HUD', 'projectile/debris entities', 'pilot cut-in', 'spawn and gameplay QA'],
  files: manifest,
}, null, 2) + '\n');
console.log(`Built ${manifest.length} Zeon boss GIFs at ${options.outputDir}`);
