#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  CHROMA,
  encodeGif,
  forceChromaAtIndexZero,
  probeImage,
  verifyGif,
} from './build-mazinger-p0-prototype.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const SOURCE_CANVAS = Object.freeze([1536, 1024]);
const TARGETS = Object.freeze([
  {
    id: 'selection-composite',
    output: 'data/bgs/select.gif',
    base: 'data/bgs/select.gif',
    canvas: [480, 276],
    filter: 'crop=1536:883:0:70,scale=480:276:flags=neighbor',
  },
  {
    id: 'zhangfei-model-icon',
    output: 'data/chars/zhangfei/icon.GIF',
    base: 'data/chars/zhangfei/icon.GIF',
    canvas: [35, 54],
    filter: 'crop=215:332:370:55,scale=35:54:flags=neighbor',
  },
  {
    id: 'zhangfei-hud-profile',
    output: 'data/profiles/zhangfei.GIF',
    base: 'data/profiles/zhangfei.GIF',
    canvas: [35, 54],
    filter: 'crop=215:332:370:55,scale=35:54:flags=neighbor',
  },
  {
    id: 'zhangfei-hud-profile-mirror',
    output: 'data/profiles/zhangfei_m.GIF',
    base: 'data/profiles/zhangfei_m.GIF',
    canvas: [35, 54],
    filter: 'crop=215:332:370:55,scale=35:54:flags=neighbor,hflip',
  },
]);

function usage() {
  return `Build the five-robot selection composite and Mazinger HUD P0 assets.

Usage:
  node scripts/build-five-robot-selection-p0-prototype.mjs [options]

Options:
  --source PATH       private original 1536x1024 selection artwork
  --data-dir PATH     extracted data root
  --output-dir PATH   overlay root; data/... is appended
  --overview PATH     optional overview-only complete roster review image
  --help              show this help`;
}

function parseArgs(argv) {
  const options = {
    source: join(REPO_ROOT, 'private_assets/robot_wof/ui/five-robot-selection-screen-v1.png'),
    dataDir: join(REPO_ROOT, 'workplace/extracted/data'),
    outputDir: join(REPO_ROOT, 'workplace/robot_wof_vertical_slice/overlay'),
    overview: null,
  };
  const keys = new Map([
    ['--source', 'source'],
    ['--data-dir', 'dataDir'],
    ['--output-dir', 'outputDir'],
    ['--overview', 'overview'],
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

function requireCommand(binary) {
  const result = spawnSync(binary, ['-version'], { encoding: 'utf8' });
  if (result.error && result.status === null) throw result.error;
  if (result.status !== 0) throw new Error(`${binary} is required`);
}

function run(binary, args, { binaryOutput = false } = {}) {
  const result = spawnSync(binary, args, {
    encoding: binaryOutput ? null : 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error && result.status === null) throw result.error;
  if (result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr)
      ? result.stderr.toString('utf8')
      : result.stderr;
    throw new Error(`${binary} failed (${result.status}): ${stderr.trim()}`);
  }
  return result.stdout;
}

function displayPath(path) {
  const result = relative(REPO_ROOT, path);
  return result && !result.startsWith('..')
    ? result.replaceAll('\\', '/')
    : `local-only/${basename(path)}`;
}

function assertInputs(options) {
  if (!existsSync(options.source)) throw new Error(`Missing source: ${options.source}`);
  const source = probeImage(options.source);
  if (source.width !== SOURCE_CANVAS[0] || source.height !== SOURCE_CANVAS[1]) {
    throw new Error(`Expected ${SOURCE_CANVAS.join('x')} source, got ${source.width}x${source.height}`);
  }
  for (const target of TARGETS) {
    const basePath = join(options.dataDir, target.base.replace(/^data\//, ''));
    if (!existsSync(basePath)) throw new Error(`Missing base target: ${basePath}`);
    const base = probeImage(basePath);
    if (base.width !== target.canvas[0] || base.height !== target.canvas[1]) {
      throw new Error(`${target.base} must be ${target.canvas.join('x')}`);
    }
  }
}

export function renderPng(sourcePath, outputPath, target) {
  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', sourcePath,
    '-vf', `${target.filter},format=rgb24`,
    '-frames:v', '1',
    outputPath,
  ]);
}

export function palettizeOpaque(path, width, height, tempDir) {
  const palettePath = join(tempDir, 'palette.rgba');
  const palette = run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', path,
    '-vf', 'palettegen=reserve_transparent=0:max_colors=255',
    '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1',
  ], { binaryOutput: true });
  if (palette.length !== 1024) throw new Error(`Unexpected palette bytes: ${palette.length}`);
  writeFileSync(palettePath, palette);
  const pal8 = run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', path,
    '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', '16x16',
    '-framerate', '1', '-i', palettePath,
    '-filter_complex', '[0:v][1:v]paletteuse=dither=none',
    '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'pal8', 'pipe:1',
  ], { binaryOutput: true });
  const expected = width * height + 1024;
  if (pal8.length !== expected) throw new Error(`Expected ${expected} pal8 bytes, got ${pal8.length}`);
  const pixels = Buffer.from(pal8.subarray(0, width * height));
  const bgraPalette = Buffer.from(pal8.subarray(width * height));
  const used = new Uint8Array(256);
  for (const index of pixels) used[index] = 1;
  const unused = used.findIndex((value) => value === 0);
  if (unused < 0) throw new Error('255-colour opaque conversion unexpectedly used all 256 indexes');
  const paletteOffset = unused * 4;
  bgraPalette[paletteOffset] = CHROMA.b;
  bgraPalette[paletteOffset + 1] = CHROMA.g;
  bgraPalette[paletteOffset + 2] = CHROMA.r;
  bgraPalette[paletteOffset + 3] = 255;
  const injectedChromaIndex = forceChromaAtIndexZero(pixels, bgraPalette);
  if (pixels.includes(0)) throw new Error('Opaque asset unexpectedly uses palette index 0 after remap');
  return { pixels, bgraPalette, injectedChromaIndex };
}

function buildTarget(options, target, tempDir) {
  const pngPath = join(tempDir, `${target.id}.png`);
  renderPng(options.source, pngPath, target);
  const paletteDir = join(tempDir, `${target.id}-palette`);
  mkdirSync(paletteDir, { recursive: true });
  const { pixels, bgraPalette, injectedChromaIndex } = palettizeOpaque(
    pngPath, target.canvas[0], target.canvas[1], paletteDir,
  );
  const outputPath = join(options.outputDir, target.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, encodeGif(target.canvas[0], target.canvas[1], pixels, bgraPalette));
  const verification = verifyGif(outputPath, target.canvas[0], target.canvas[1]);
  console.log(`built ${target.output} ${target.canvas.join('x')}`);
  return {
    id: target.id,
    path: displayPath(outputPath),
    canvas: target.canvas,
    sourceFilter: target.filter,
    palette: { injectedChromaIndex, index0UsedByPixels: false, ...verification },
  };
}

function writeZhangfeiModelOverlay(options) {
  const sourcePath = join(options.dataDir, 'chars/zhangfei/zhangfei.txt');
  let text = readFileSync(sourcePath, 'utf8');
  let normalizedReferences = 0;
  text = text.replace(/(icon\s+data\/chars\/zhangfei\/)icon\.gif/i, (match, prefix) => {
    normalizedReferences += 1;
    return `${prefix}icon.GIF`;
  });
  if (normalizedReferences !== 1) {
    throw new Error(`Expected one Zhangfei icon case fix, got ${normalizedReferences}`);
  }
  const outputPath = join(options.outputDir, 'data/chars/zhangfei/zhangfei.txt');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, text);
  return { path: displayPath(outputPath), normalizedReferences };
}

function writeOverview(sourcePath, outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', sourcePath,
    '-vf', 'scale=1200:800:flags=neighbor', '-frames:v', '1', outputPath,
  ]);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  requireCommand('ffmpeg');
  requireCommand('ffprobe');
  assertInputs(options);
  const tempDir = mkdtempSync(join(tmpdir(), 'robot-wof-selection-'));
  try {
    const assets = TARGETS.map((target) => buildTarget(options, target, tempDir));
    const modelOverlay = writeZhangfeiModelOverlay(options);
    if (options.overview) writeOverview(options.source, options.overview);
    const manifestPath = join(options.outputDir, 'FIVE-ROBOT-SELECTION-P0-MANIFEST.json');
    writeFileSync(manifestPath, `${JSON.stringify({
      schemaVersion: 1,
      status: 'engineering-prototype-not-production-ready',
      source: {
        path: `local-only/${basename(options.source)}`,
        sha256: createHash('sha256').update(readFileSync(options.source)).digest('hex'),
        canvas: SOURCE_CANVAS,
      },
      rosterOrder: [
        'guanyu-red-combining-robot',
        'zhangfei-classic-iron-robot',
        'zhaoyun-purple-biomechanical-humanoid',
        'huangzhong-white-blue-red-military-mecha',
        'weiyan-silver-mechanical-dinosaur',
      ],
      chroma: {
        paletteIndex: 0,
        rgb: '#FC00FF',
        index0IntentionallyUnusedByOpaquePixelData: true,
      },
      modelOverlay,
      assets,
      productionGaps: [
        'selection composite is a generated engineering redraw and requires pixel-artist cleanup',
        'only Zhangfei HUD/profile assets are included in M1; the other four HUD/profile sets remain M2',
        'visible selection cursor, 2P join flow and life-bar review are still required',
      ],
    }, null, 2)}\n`);
    console.log(`manifest ${displayPath(manifestPath)}`);
    if (options.overview) console.log(`overview ${displayPath(options.overview)}`);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

const IS_MAIN = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (IS_MAIN) {
  try {
    main();
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}
