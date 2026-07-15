#!/usr/bin/env node

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sliceStoryboard } from './slice-guanyu-storyboard.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');

const CELLS = Object.freeze([
  { role: 'portrait', x: 44, y: 87, width: 242, height: 243, pivot: { x: 120, y: 88 } },
  { role: 'spawn-kneel', x: 351, y: 48, width: 221, height: 283, pivot: { x: 103, y: 269 } },
  { role: 'idle-ready', x: 669, y: 65, width: 204, height: 266, pivot: { x: 101, y: 253 } },
  { role: 'walk-contact', x: 974, y: 63, width: 216, height: 266, pivot: { x: 108, y: 253 } },
  { role: 'walk-passing', x: 42, y: 367, width: 229, height: 263, pivot: { x: 112, y: 250 } },
  { role: 'shield-guard', x: 331, y: 375, width: 215, height: 254, pivot: { x: 107, y: 241 } },
  { role: 'rifle-aim', x: 617, y: 375, width: 249, height: 257, pivot: { x: 105, y: 244 } },
  { role: 'rifle-fire', x: 912, y: 375, width: 340, height: 257, pivot: { x: 106, y: 244 } },
  { role: 'shield-beam-brace', x: 35, y: 693, width: 254, height: 215, pivot: { x: 102, y: 202 } },
  { role: 'jump', x: 326, y: 640, width: 224, height: 253, pivot: { x: 119, y: 110 } },
  { role: 'aerial-down-shot', x: 638, y: 651, width: 183, height: 247, pivot: { x: 102, y: 104 } },
  { role: 'dual-missile-special', x: 906, y: 667, width: 286, height: 248, pivot: { x: 111, y: 235 } },
  { role: 'pain-recoil', x: 35, y: 917, width: 244, height: 282, pivot: { x: 86, y: 269 } },
  { role: 'airborne-fall', x: 286, y: 929, width: 262, height: 254, pivot: { x: 131, y: 145 } },
  { role: 'prone-wreckage', x: 574, y: 1037, width: 315, height: 152, pivot: { x: 186, y: 63 } },
  { role: 'weapon-projectile-inventory', x: 908, y: 943, width: 304, height: 254, pivot: { x: 152, y: 112 } },
]);

function usage() {
  return `Slice and normalize the Huang Zhong Azure Photon Ranger storyboard.

Usage:
  node scripts/slice-huangzhong-storyboard.mjs [options]

Options:
  --source PATH         private 1254x1254 RGB PNG source
  --output-dir PATH     private normalized key-pose directory
  --contact-sheet PATH  overview-only image with normalized #FC00FF background
  --manifest PATH       public crop/foreground/pivot manifest
  --help                show this help`;
}

function parseArgs(argv) {
  const options = {
    source: join(REPO_ROOT, 'private_assets/robot_wof/huangzhong/huangzhong-azure-photon-ranger-storyboard-v1.png'),
    outputDir: join(REPO_ROOT, 'private_assets/robot_wof/huangzhong/keyposes'),
    contactSheet: join(REPO_ROOT, 'research/huangzhong/huangzhong-azure-photon-ranger-storyboard-v1-keyed.png'),
    manifest: join(REPO_ROOT, 'research/manifests/huangzhong-azure-photon-ranger-keyposes.json'),
  };
  const keys = new Map([
    ['--source', 'source'],
    ['--output-dir', 'outputDir'],
    ['--contact-sheet', 'contactSheet'],
    ['--manifest', 'manifest'],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') { console.log(usage()); process.exit(0); }
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
    warning: 'Foreground crosses nominal grid lines in cells 01-04, 08 and 12-16. Cell 08 includes the detached beam; cell 12 includes both missiles. Use only these independently audited crops and pivots.',
  });
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
