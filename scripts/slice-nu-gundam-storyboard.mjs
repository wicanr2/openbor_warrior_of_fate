#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sliceStoryboard } from './slice-guanyu-storyboard.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');

const CELLS = Object.freeze([
  { role: 'portrait',           x: 20,  y: 35,   width: 285, height: 260, pivot: { x: 140, y: 110 } },
  { role: 'spawn-landing',      x: 340, y: 45,   width: 270, height: 250, pivot: { x: 140, y: 235 } },
  { role: 'rifle-idle',         x: 675, y: 35,   width: 220, height: 260, pivot: { x: 110, y: 240 } },
  { role: 'walk-contact',       x: 975, y: 35,   width: 245, height: 260, pivot: { x: 120, y: 240 } },
  { role: 'walk-passing',       x: 45,  y: 330,  width: 245, height: 265, pivot: { x: 125, y: 245 } },
  { role: 'shield-guard',       x: 345, y: 330,  width: 235, height: 265, pivot: { x: 118, y: 240 } },
  { role: 'rifle-aim',          x: 660, y: 330,  width: 250, height: 265, pivot: { x: 125, y: 240 } },
  { role: 'rifle-fire-recoil',  x: 955, y: 330,  width: 275, height: 265, pivot: { x: 138, y: 240 } },
  { role: 'saber-windup',       x: 30,  y: 615,  width: 240, height: 285, pivot: { x: 120, y: 265 } },
  { role: 'saber-slash',        x: 315, y: 615,  width: 305, height: 285, pivot: { x: 145, y: 265 } },
  { role: 'boost-jump',         x: 660, y: 610,  width: 235, height: 290, pivot: { x: 115, y: 145 } },
  { role: 'aerial-saber',       x: 925, y: 615,  width: 305, height: 285, pivot: { x: 150, y: 150 } },
  { role: 'fin-funnel-command', x: 25,  y: 910,  width: 280, height: 310, pivot: { x: 135, y: 275 } },
  { role: 'pain-recoil',        x: 325, y: 910,  width: 260, height: 310, pivot: { x: 130, y: 270 } },
  { role: 'airborne-fall',      x: 620, y: 930,  width: 285, height: 270, pivot: { x: 145, y: 135 } },
  { role: 'prone-knockdown',    x: 915, y: 1005, width: 300, height: 225, pivot: { x: 155, y: 110 } },
]);

function parseArgs(argv) {
  const options = {
    source: join(REPO_ROOT, 'private_assets/robot_wof/nu_gundam/nu-gundam-sixth-character-storyboard-v5.png'),
    outputDir: join(REPO_ROOT, 'private_assets/robot_wof/nu_gundam/keyposes-v5'),
    contactSheet: join(REPO_ROOT, 'research/nu-gundam/nu-gundam-sixth-character-storyboard-v5-overview.png'),
    manifest: join(REPO_ROOT, 'research/manifests/nu-gundam-sixth-character-v5-keyposes.json'),
  };
  const keys = new Map([
    ['--source', 'source'], ['--output-dir', 'outputDir'],
    ['--contact-sheet', 'contactSheet'], ['--manifest', 'manifest'],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') {
      console.log('Usage: node scripts/slice-nu-gundam-storyboard.mjs [--source PATH --output-dir PATH --contact-sheet PATH --manifest PATH]');
      process.exit(0);
    }
    const key = keys.get(argument);
    const value = argv[index + 1];
    if (!key) throw new Error(`Unknown option: ${argument}`);
    if (!value) throw new Error(`${argument} requires a path`);
    options[key] = resolve(value);
    index += 1;
  }
  return options;
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (!existsSync(options.source)) throw new Error(`Missing source: ${options.source}`);
  sliceStoryboard(options, {
    cells: CELLS,
    status: 'canonical-nu-gundam-v5-keyposes-not-runtime-overlay',
    warning: 'Use only these independent crops. Frames 11-14 and 16 cross or approach nominal grid boundaries; flying Funnels and long beams remain separate runtime entities.',
  });
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
