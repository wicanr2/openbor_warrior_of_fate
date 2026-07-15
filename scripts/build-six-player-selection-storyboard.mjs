#!/usr/bin/env node

import { existsSync, mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const BASE_IMAGE = join(REPO_ROOT, 'research/ui/six-player-selection-overview.gif');
const DEFAULT_CURSOR = '/tmp/nu-active-smoke-parent-aUVWJx/stage/data/bgs/cursor/selectg.gif';

const PANELS = [
  { id: 'cursor-guanyu', label: 'cursor → guanyu', x: 32, y: 12 },
  { id: 'cursor-zhangfei', label: 'cursor → zhangfei', x: 112, y: 12 },
  { id: 'cursor-zhaoyun', label: 'cursor → zhaoyun', x: 192, y: 12 },
  { id: 'cursor-huangzhong', label: 'cursor → huangzhong', x: 272, y: 12 },
  { id: 'cursor-weiyan', label: 'cursor → weiyan', x: 352, y: 12 },
  { id: 'cursor-nu', label: 'cursor → nu_gundam', x: 432, y: 12 },
  { id: 'ready', label: 'READY! / confirm preview', x: 432, y: 12 },
  { id: 'stage1', label: 'CONFIRM → Stage 1 entry', x: 432, y: 12 },
];

function parseArgs(argv) {
  const options = {
    base: BASE_IMAGE,
    cursor: DEFAULT_CURSOR,
    output: join(REPO_ROOT, 'research/ui/six-player-selection-storyboard.gif'),
    manifest: join(REPO_ROOT, 'research/manifests/six-player-selection-storyboard.json'),
  };
  const keys = new Map([
    ['--base', 'base'],
    ['--cursor', 'cursor'],
    ['--output', 'output'],
    ['--manifest', 'manifest'],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') {
      console.log(`Usage: node scripts/build-six-player-selection-storyboard.mjs --base PATH --cursor PATH --output PATH --manifest PATH`);
      process.exit(0);
    }
    const key = keys.get(arg);
    if (!key) throw new Error(`Unknown option: ${arg}`);
    const value = argv[index + 1];
    if (!value) throw new Error(`${arg} requires a path`);
    options[key] = resolve(value);
    index += 1;
  }
  return options;
}

function run(binary, args) {
  const result = spawnSync(binary, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error && result.status === null) throw result.error;
  if (result.status !== 0) throw new Error(`${binary} failed (${result.status}): ${result.stderr.trim()}`);
  return result.stdout;
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function displayPath(path) {
  const local = relative(REPO_ROOT, path);
  return local && !local.startsWith('..') ? local.replaceAll('\\', '/') : `local-only/${basename(path)}`;
}

function drawText(label, x, y) {
  return `drawtext=fontfile=${FONT}:text='${label.replace(/'/g, "\\'")}':x=${x}:y=${y}:fontsize=18:fontcolor=white:box=1:boxcolor=0x00000088:boxborderw=6`;
}

function buildPanel({ base, cursor, output, label, x, y }) {
  const filter = [
    '[0:v]format=rgba[base]',
    '[1:v]format=rgba[cursor]',
    `[base][cursor]overlay=${x}:${y}:shortest=1[placed]`,
    `[placed]${drawText(label, 18, 18)}[out]`,
  ].join(';');
  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', base,
    '-i', cursor,
    '-filter_complex', filter,
    '-map', '[out]',
    '-frames:v', '1',
    output,
  ]);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!existsSync(options.base)) throw new Error(`Missing base image: ${options.base}`);
  if (!existsSync(options.cursor)) throw new Error(`Missing cursor image: ${options.cursor}`);
  if (!existsSync(FONT)) throw new Error(`Missing font: ${FONT}`);

  const tempDir = mkdtempSync(join(tmpdir(), 'select-storyboard-'));
  try {
    const framePaths = [];
    for (const [index, panel] of PANELS.entries()) {
      const framePath = join(tempDir, `${String(index + 1).padStart(2, '0')}.png`);
      buildPanel({
        base: options.base,
        cursor: options.cursor,
        output: framePath,
        label: panel.label,
        x: panel.x,
        y: panel.y,
      });
      framePaths.push(framePath);
    }

    mkdirSync(dirname(options.output), { recursive: true });
    run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-framerate', '1',
      '-i', join(tempDir, '%02d.png'),
      '-filter_complex', '[0:v]split[a][b];[a]palettegen[p];[b][p]paletteuse=dither=none',
      '-loop', '0',
      options.output,
    ]);

    const manifest = {
      schemaVersion: 1,
      status: 'six-player-selection-storyboard',
      productionReady: false,
      canvas: [480, 276],
      output: { path: displayPath(options.output), sha256: sha256(options.output) },
      base: { path: displayPath(options.base), sha256: sha256(options.base) },
      cursor: { path: displayPath(options.cursor), sha256: sha256(options.cursor) },
      panels: PANELS.map((panel, index) => ({ index: index + 1, ...panel })),
      deferred: [
        'visible OpenBOR cursor and six-step left/right cycle QA',
        '1P/2P Ready flow and nosame behavior QA',
        'live Stage 1 entry screenshot capture',
      ],
    };
    mkdirSync(dirname(options.manifest), { recursive: true });
    writeFileSync(options.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(JSON.stringify(manifest, null, 2));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
