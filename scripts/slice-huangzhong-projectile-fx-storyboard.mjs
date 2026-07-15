#!/usr/bin/env node

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sliceStoryboard } from './slice-guanyu-storyboard.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');

const CELLS = Object.freeze([
  { role: 'small-beam-orb', x: 111, y: 165, width: 90, height: 52, pivot: { x: 45, y: 26 } },
  { role: 'charged-beam-orb', x: 369, y: 156, width: 162, height: 80, pivot: { x: 83, y: 40 } },
  { role: 'horizontal-beam-streak', x: 658, y: 175, width: 258, height: 58, pivot: { x: 223, y: 29 } },
  { role: 'descending-comet', x: 1016, y: 93, width: 133, height: 181, pivot: { x: 101, y: 139 } },
  { role: 'missile', x: 85, y: 437, width: 124, height: 80, pivot: { x: 63, y: 40 } },
  { role: 'missile-with-exhaust', x: 347, y: 442, width: 209, height: 75, pivot: { x: 146, y: 37 } },
  { role: 'energy-burst', x: 699, y: 387, width: 158, height: 170, pivot: { x: 78, y: 87 } },
  { role: 'smoke-debris-burst', x: 998, y: 391, width: 163, height: 161, pivot: { x: 86, y: 83 } },
  { role: 'small-ground-impact', x: 63, y: 741, width: 167, height: 105, pivot: { x: 83, y: 84 } },
  { role: 'medium-ground-impact', x: 340, y: 674, width: 214, height: 184, pivot: { x: 113, y: 159 } },
  { role: 'large-ground-impact', x: 630, y: 620, width: 286, height: 240, pivot: { x: 143, y: 215 } },
  { role: 'shield-debris-arc', x: 973, y: 696, width: 206, height: 160, pivot: { x: 107, y: 136 } },
  { role: 'shield-beam-impact', x: 57, y: 947, width: 201, height: 208, pivot: { x: 107, y: 113 } },
  { role: 'rifle-muzzle-blast', x: 339, y: 972, width: 232, height: 186, pivot: { x: 50, y: 101 } },
  { role: 'burning-mechanical-parts-inventory', x: 646, y: 956, width: 234, height: 202, pivot: { x: 117, y: 101 } },
  { role: 'projectile-impact-inventory', x: 943, y: 981, width: 242, height: 177, pivot: { x: 121, y: 88 } },
]);

function usage() {
  return `Slice and normalize the Huang Zhong photon projectile/FX storyboard.

Usage:
  node scripts/slice-huangzhong-projectile-fx-storyboard.mjs [options]

Options:
  --source PATH         private 1254x1254 RGB PNG source
  --output-dir PATH     private normalized FX key-pose directory
  --contact-sheet PATH  overview-only image with normalized #FC00FF background
  --manifest PATH       public crop/foreground/pivot manifest
  --help                show this help`;
}

function parseArgs(argv) {
  const options = {
    source: join(REPO_ROOT, 'private_assets/robot_wof/huangzhong/huangzhong-photon-projectile-fx-storyboard-v1.png'),
    outputDir: join(REPO_ROOT, 'private_assets/robot_wof/huangzhong/projectile-keyposes'),
    contactSheet: join(REPO_ROOT, 'research/huangzhong/huangzhong-photon-projectile-fx-storyboard-v1-keyed.png'),
    manifest: join(REPO_ROOT, 'research/manifests/huangzhong-photon-projectile-fx-keyposes.json'),
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
    warning: 'All 16 audited cells are independent and clear of nominal grid lines. Cells 15 and 16 are overview inventories; split their individual parts and define per-object pivots before production use.',
  });
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
