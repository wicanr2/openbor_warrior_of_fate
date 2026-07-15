#!/usr/bin/env node

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sliceStoryboard } from './slice-guanyu-storyboard.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');

const BODY_CELLS = Object.freeze([
  { role: 'portrait', x: 35, y: 35, width: 250, height: 245, pivot: { x: 125, y: 220 } },
  { role: 'spawn-crouch', x: 330, y: 70, width: 275, height: 220, pivot: { x: 120, y: 197 } },
  { role: 'idle-ready', x: 615, y: 45, width: 280, height: 245, pivot: { x: 140, y: 220 } },
  { role: 'walk-contact', x: 915, y: 45, width: 330, height: 250, pivot: { x: 165, y: 225 } },
  { role: 'walk-passing', x: 35, y: 325, width: 270, height: 270, pivot: { x: 135, y: 245 } },
  { role: 'claw-windup', x: 315, y: 320, width: 270, height: 280, pivot: { x: 135, y: 255 } },
  { role: 'tail-claw-sweep', x: 585, y: 320, width: 325, height: 280, pivot: { x: 168, y: 255 } },
  { role: 'tail-cannon', x: 900, y: 325, width: 354, height: 270, pivot: { x: 177, y: 245 } },
  { role: 'double-claw-spin', x: 15, y: 610, width: 295, height: 290, pivot: { x: 148, y: 260 } },
  { role: 'jump', x: 305, y: 595, width: 290, height: 310, pivot: { x: 145, y: 172 } },
  { role: 'dive', x: 595, y: 600, width: 310, height: 305, pivot: { x: 155, y: 175 } },
  { role: 'prone', x: 895, y: 625, width: 350, height: 280, pivot: { x: 180, y: 238 } },
  { role: 'pain', x: 25, y: 920, width: 285, height: 285, pivot: { x: 143, y: 258 } },
  { role: 'airborne-fall', x: 300, y: 930, width: 240, height: 240, pivot: { x: 150, y: 148 } },
  { role: 'destroyed-wreckage', x: 545, y: 905, width: 375, height: 285, pivot: { x: 188, y: 248 } },
  { role: 'parts-projectile-inventory', x: 900, y: 905, width: 345, height: 300, pivot: { x: 173, y: 170 } },
]);

const FX_CELLS = Object.freeze([
  { role: 'arm-cannon-muzzle', x: 35, y: 325, width: 285, height: 220, pivot: { x: 232, y: 110 } },
  { role: 'claw-crescent', x: 335, y: 290, width: 220, height: 285, pivot: { x: 125, y: 133 } },
  { role: 'ground-energy-sweep', x: 560, y: 325, width: 410, height: 235, pivot: { x: 202, y: 168 } },
  { role: 'ground-impact', x: 970, y: 300, width: 250, height: 280, pivot: { x: 125, y: 235 } },
  { role: 'energy-cell-charge-inventory', x: 35, y: 720, width: 365, height: 275, pivot: { x: 158, y: 103 } },
  { role: 'energy-shield', x: 405, y: 700, width: 240, height: 310, pivot: { x: 105, y: 125 } },
  { role: 'mechanical-hitflash', x: 650, y: 750, width: 225, height: 245, pivot: { x: 130, y: 73 } },
  { role: 'mechanical-explosion', x: 910, y: 690, width: 305, height: 320, pivot: { x: 155, y: 125 } },
]);

function usage() {
  return `Slice and normalize the Wei Yan Riftbeast body and local-FX storyboards.

Usage:
  node scripts/slice-weiyan-riftbeast-storyboards.mjs [options]

Options:
  --body-source PATH       private 1254x1254 v2 body storyboard
  --fx-source PATH         private 1254x1254 local-FX storyboard
  --body-output-dir PATH   private body key-pose directory
  --fx-output-dir PATH     private local-FX key-pose directory
  --body-overview PATH     public overview-only body image
  --fx-overview PATH       public overview-only local-FX image
  --body-manifest PATH     public body crop/pivot manifest
  --fx-manifest PATH       public local-FX crop/pivot manifest
  --help                   show this help`;
}

function parseArgs(argv) {
  const options = {
    bodySource: join(REPO_ROOT, 'private_assets/robot_wof/weiyan/weiyan-riftbeast-storyboard-v2.png'),
    fxSource: join(REPO_ROOT, 'private_assets/robot_wof/weiyan/weiyan-riftbeast-local-fx-storyboard-v1.png'),
    bodyOutputDir: join(REPO_ROOT, 'private_assets/robot_wof/weiyan/keyposes-v2'),
    fxOutputDir: join(REPO_ROOT, 'private_assets/robot_wof/weiyan/fx-keyposes-v1'),
    bodyOverview: join(REPO_ROOT, 'research/weiyan/weiyan-riftbeast-storyboard-v2-overview.png'),
    fxOverview: join(REPO_ROOT, 'research/weiyan/weiyan-riftbeast-local-fx-storyboard-v1-overview.png'),
    bodyManifest: join(REPO_ROOT, 'research/manifests/weiyan-riftbeast-v2-keyposes.json'),
    fxManifest: join(REPO_ROOT, 'research/manifests/weiyan-riftbeast-local-fx-v1-keyposes.json'),
  };
  const keys = new Map([
    ['--body-source', 'bodySource'], ['--fx-source', 'fxSource'],
    ['--body-output-dir', 'bodyOutputDir'], ['--fx-output-dir', 'fxOutputDir'],
    ['--body-overview', 'bodyOverview'], ['--fx-overview', 'fxOverview'],
    ['--body-manifest', 'bodyManifest'], ['--fx-manifest', 'fxManifest'],
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

function main() {
  const options = parseArgs(process.argv.slice(2));
  sliceStoryboard({
    source: options.bodySource,
    outputDir: options.bodyOutputDir,
    contactSheet: options.bodyOverview,
    manifest: options.bodyManifest,
  }, {
    expected: { width: 1254, height: 1254 },
    cells: BODY_CELLS,
    status: 'riftbeast-v2-concept-keyposes-not-production-ready',
    warning: 'Use the audited independent crops. F07-F09 contain wide tail/claw arcs, F08 includes detached tail-cannon shots, F12/F15 cross nominal grid lines, and F16 is an inventory rather than a single animation pose.',
  });
  sliceStoryboard({
    source: options.fxSource,
    outputDir: options.fxOutputDir,
    contactSheet: options.fxOverview,
    manifest: options.fxManifest,
  }, {
    expected: { width: 1254, height: 1254 },
    cells: FX_CELLS,
    status: 'riftbeast-local-fx-v1-concept-keyposes-not-production-ready',
    warning: 'F05 is a three-state inventory. Split it into independent charge entities before production; the eight review crops are not a finished FX animation set.',
  });
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
