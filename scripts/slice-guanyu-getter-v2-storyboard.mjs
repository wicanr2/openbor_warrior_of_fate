#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sliceStoryboard } from './slice-guanyu-storyboard.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');

const CELLS = Object.freeze([
  { role: 'portrait',          x: 28,  y: 45,  width: 281, height: 256, pivot: { x: 140, y: 95 } },
  { role: 'spawn-landing',     x: 329, y: 78,  width: 292, height: 223, pivot: { x: 158, y: 210 } },
  { role: 'idle-ready',        x: 645, y: 41,  width: 243, height: 260, pivot: { x: 152, y: 247 } },
  { role: 'walk-contact',      x: 958, y: 49,  width: 223, height: 254, pivot: { x: 129, y: 241 } },
  { role: 'walk-passing',      x: 56,  y: 332, width: 223, height: 260, pivot: { x: 111, y: 247 } },
  { role: 'guard-block',       x: 325, y: 374, width: 245, height: 218, pivot: { x: 122, y: 205 } },
  { role: 'polearm-windup',    x: 657, y: 312, width: 201, height: 280, pivot: { x: 100, y: 267 } },
  { role: 'horizontal-sweep',  x: 919, y: 373, width: 325, height: 219, pivot: { x: 159, y: 206 } },
  { role: 'combo-finisher',    x: 16,  y: 674, width: 281, height: 201, pivot: { x: 140, y: 188 } },
  { role: 'jump-takeoff',      x: 375, y: 617, width: 178, height: 257, pivot: { x: 43, y: 220 } },
  { role: 'aerial-attack',     x: 622, y: 640, width: 318, height: 250, pivot: { x: 146, y: 118 } },
  { role: 'spin-special',      x: 950, y: 629, width: 279, height: 257, pivot: { x: 139, y: 126 } },
  { role: 'pain-recoil',       x: 21,  y: 900, width: 258, height: 278, pivot: { x: 137, y: 265 } },
  { role: 'airborne-fall',     x: 293, y: 918, width: 264, height: 250, pivot: { x: 132, y: 125 } },
  { role: 'death-wreckage',    x: 589, y: 977, width: 243, height: 231, pivot: { x: 121, y: 82 } },
  { role: 'mechanical-debris', x: 858, y: 909, width: 390, height: 291, pivot: { x: 195, y: 145 } },
]);

function usage() {
  return `Slice the canonical Guanyu Getter-style v2 storyboard.

Usage:
  node scripts/slice-guanyu-getter-v2-storyboard.mjs [options]

Options:
  --source PATH         private 1254x1254 v5 RGB PNG source
  --output-dir PATH     private normalized 16-key-pose directory
  --contact-sheet PATH  public overview with normalized #FC00FF background
  --manifest PATH       crop/foreground/pivot manifest
  --help                show this help`;
}

function parseArgs(argv) {
  const options = {
    source: join(REPO_ROOT, 'private_assets/robot_wof/guanyu/guanyu-getter-v2-storyboard-v5.png'),
    outputDir: join(REPO_ROOT, 'private_assets/robot_wof/guanyu/getter-v2-keyposes'),
    contactSheet: join(REPO_ROOT, 'research/guanyu/guanyu-getter-v2-storyboard-v5-overview.png'),
    manifest: join(REPO_ROOT, 'research/manifests/guanyu-getter-v2-storyboard-v5-keyposes.json'),
  };
  const keys = new Map([
    ['--source', 'source'], ['--output-dir', 'outputDir'],
    ['--contact-sheet', 'contactSheet'], ['--manifest', 'manifest'],
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
  const options = parseArgs(process.argv.slice(2));
  if (!existsSync(options.source)) throw new Error(`Missing source: ${options.source}`);
  sliceStoryboard(options, {
    cells: CELLS,
    status: 'canonical-getter-v2-keyposes-not-runtime-overlay',
    warning: 'Canonical v5 cells 08, 13, 14, 15 and 16 cross nominal 4x4 grid lines; use only the independent safe crops in this manifest.',
  });
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
