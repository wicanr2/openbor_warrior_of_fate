#!/usr/bin/env node

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sliceStoryboard } from './slice-guanyu-storyboard.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');

const CELLS = Object.freeze([
  { role: 'portrait', x: 36, y: 18, width: 249, height: 284, pivot: { x: 122, y: 127 } },
  { role: 'spawn-landing', x: 378, y: 19, width: 185, height: 287, pivot: { x: 78, y: 269 } },
  { role: 'idle-ready', x: 640, y: 42, width: 248, height: 258, pivot: { x: 123, y: 245 } },
  { role: 'walk-contact', x: 965, y: 43, width: 220, height: 258, pivot: { x: 85, y: 245 } },
  { role: 'walk-passing', x: 37, y: 328, width: 265, height: 254, pivot: { x: 108, y: 241 } },
  { role: 'guard-block', x: 372, y: 307, width: 178, height: 277, pivot: { x: 90, y: 264 } },
  { role: 'lancer-windup', x: 623, y: 350, width: 267, height: 237, pivot: { x: 110, y: 224 } },
  { role: 'horizontal-thrust', x: 890, y: 387, width: 357, height: 204, pivot: { x: 200, y: 191 } },
  { role: 'crescent-finisher', x: 21, y: 611, width: 275, height: 265, pivot: { x: 118, y: 252 } },
  { role: 'jump-aerial-windup', x: 380, y: 594, width: 223, height: 268, pivot: { x: 90, y: 141 } },
  { role: 'plunge-attack', x: 657, y: 613, width: 185, height: 268, pivot: { x: 84, y: 137 } },
  { role: 'spin-special', x: 904, y: 649, width: 328, height: 234, pivot: { x: 151, y: 221 } },
  { role: 'pain-recoil', x: 15, y: 901, width: 216, height: 273, pivot: { x: 123, y: 260 } },
  { role: 'airborne-fall', x: 260, y: 914, width: 282, height: 249, pivot: { x: 137, y: 157 } },
  { role: 'prone-death', x: 578, y: 1024, width: 323, height: 133, pivot: { x: 212, y: 73 } },
  { role: 'mechanical-debris', x: 929, y: 925, width: 315, height: 238, pivot: { x: 156, y: 120 } },
]);

function usage() {
  return `Slice and normalize the Zhao Yun Violet Synapse Lancer storyboard.

Usage:
  node scripts/slice-zhaoyun-storyboard.mjs [options]

Options:
  --source PATH         private 1254x1254 RGB PNG source
  --output-dir PATH     private normalized key-pose directory
  --contact-sheet PATH  overview-only image with normalized #FC00FF background
  --manifest PATH       public crop/foreground/pivot manifest
  --help                show this help`;
}

function parseArgs(argv) {
  const options = {
    source: join(REPO_ROOT, 'private_assets/robot_wof/zhaoyun/zhaoyun-violet-synapse-lancer-storyboard-v1.png'),
    outputDir: join(REPO_ROOT, 'private_assets/robot_wof/zhaoyun/keyposes'),
    contactSheet: join(REPO_ROOT, 'research/zhaoyun/zhaoyun-violet-synapse-lancer-storyboard-v1-keyed.png'),
    manifest: join(REPO_ROOT, 'research/manifests/zhaoyun-violet-synapse-lancer-keyposes.json'),
  };
  const keys = new Map([
    ['--source', 'source'],
    ['--output-dir', 'outputDir'],
    ['--contact-sheet', 'contactSheet'],
    ['--manifest', 'manifest'],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') {
      console.log(usage());
      process.exit(0);
    }
    const key = keys.get(argument);
    if (!key) throw new Error(`Unknown option: ${argument}`);
    const value = argv[index + 1];
    if (!value) throw new Error(`${argument} requires a path`);
    options[key] = resolve(value);
    index += 1;
  }
  return options;
}

try {
  sliceStoryboard(parseArgs(process.argv.slice(2)), {
    expected: { width: 1254, height: 1254 },
    cells: CELLS,
    status: 'concept-keyposes-not-production-ready',
    warning: 'Cells 08 through 16 contain cross-grid foreground spill; use only the independent crops and semantic pivots recorded in this manifest.',
  });
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
