#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const EXPECTED = Object.freeze({ width: 1448, height: 1086 });
const CHROMA = Object.freeze({ r: 252, g: 0, b: 255, hex: '#FC00FF' });
const CELL_WIDTH = 362;
const CELL_HEIGHT = 370;

// Hand-audited around the generated white separators. No crop includes a grid
// line, and the uneven sizes preserve every source pixel inside each cell.
const CELLS = Object.freeze([
  { role: 'communication-portrait', x: 0, y: 0, width: 359, height: 359 },
  { role: 'idle', x: 364, y: 0, width: 357, height: 359 },
  { role: 'walk-contact', x: 727, y: 0, width: 355, height: 359 },
  { role: 'walk-passing', x: 1088, y: 0, width: 360, height: 359 },
  { role: 'melee-wind-up', x: 0, y: 364, width: 359, height: 348 },
  { role: 'electro-spear-thrust', x: 364, y: 364, width: 357, height: 348 },
  { role: 'rifle-aim', x: 727, y: 364, width: 355, height: 348 },
  { role: 'hit-recoil', x: 1088, y: 364, width: 360, height: 348 },
  { role: 'airborne-knockback', x: 0, y: 717, width: 359, height: 369 },
  { role: 'prone-down', x: 364, y: 717, width: 357, height: 369 },
  { role: 'rise-recovery', x: 727, y: 717, width: 355, height: 369 },
  { role: 'destroyed-collapse', x: 1088, y: 717, width: 360, height: 369 },
]);

function usage() {
  return `Slice and normalize the original blue-helmet grunt storyboard.

Usage:
  node scripts/slice-blue-helmet-grunt-storyboard.mjs [options]

Options:
  --source PATH         private 1448x1086 RGB PNG source
  --output-dir PATH     private key-pose output directory
  --contact-sheet PATH  public-safe normalized 4x3 overview PNG
  --manifest PATH       JSON crop/foreground manifest
  --help                show this help

The source is never modified. Near-magenta background pixels are normalized to
exact #FC00FF; source grid lines are excluded from every crop.`;
}

function parseArgs(argv) {
  const options = {
    source: join(REPO_ROOT, 'private_assets/robot_wof/enemy/blue-helmet-grunt/blue-helmet-grunt-storyboard-v1.png'),
    outputDir: join(REPO_ROOT, 'private_assets/robot_wof/enemy/blue-helmet-grunt/keyposes'),
    contactSheet: join(REPO_ROOT, 'research/enemy/blue-helmet-grunt-storyboard-v1-keyed.png'),
    manifest: join(REPO_ROOT, 'research/manifests/blue-helmet-grunt-keyposes.json'),
  };
  const keys = {
    '--source': 'source',
    '--output-dir': 'outputDir',
    '--contact-sheet': 'contactSheet',
    '--manifest': 'manifest',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') {
      console.log(usage());
      process.exit(0);
    }
    if (!keys[argument]) throw new Error(`Unknown option: ${argument}`);
    const value = argv[index + 1];
    if (!value) throw new Error(`${argument} requires a path`);
    options[keys[argument]] = resolve(value);
    index += 1;
  }
  return options;
}

function run(binary, args, input = undefined, { binaryOutput = false } = {}) {
  const result = spawnSync(binary, args, {
    input,
    encoding: input || binaryOutput ? null : 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr)
      ? result.stderr.toString('utf8')
      : result.stderr;
    throw new Error(`${binary} failed (${result.status}): ${stderr?.trim()}`);
  }
  return result.stdout;
}

function probe(path) {
  const output = run('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,pix_fmt',
    '-of', 'json',
    path,
  ]);
  return JSON.parse(output).streams?.[0];
}

function decodeRgb(path) {
  return run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-i', path,
    '-frames:v', '1',
    '-f', 'rawvideo',
    '-pix_fmt', 'rgb24',
    'pipe:1',
  ], undefined, { binaryOutput: true });
}

function encodePng(path, width, height, pixels) {
  mkdirSync(dirname(path), { recursive: true });
  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo',
    '-pixel_format', 'rgb24',
    '-video_size', `${width}x${height}`,
    '-i', 'pipe:0',
    '-frames:v', '1',
    path,
  ], pixels);
}

function isGeneratedMagenta(r, g, b) {
  return r >= 180 && b >= 180 && g <= 160 && Math.abs(r - b) <= 40;
}

function cropAndNormalize(source, sourceWidth, cell) {
  const output = Buffer.alloc(cell.width * cell.height * 3);
  let chromaPixels = 0;
  let minX = cell.width;
  let minY = cell.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < cell.height; y += 1) {
    for (let x = 0; x < cell.width; x += 1) {
      const sourceIndex = ((cell.y + y) * sourceWidth + cell.x + x) * 3;
      const outputIndex = (y * cell.width + x) * 3;
      const r = source[sourceIndex];
      const g = source[sourceIndex + 1];
      const b = source[sourceIndex + 2];
      const background = isGeneratedMagenta(r, g, b);
      output[outputIndex] = background ? CHROMA.r : r;
      output[outputIndex + 1] = background ? CHROMA.g : g;
      output[outputIndex + 2] = background ? CHROMA.b : b;
      if (background) {
        chromaPixels += 1;
      } else {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < 0) throw new Error(`Cell ${cell.role} contains no foreground`);
  return {
    pixels: output,
    chromaPixels,
    foreground: {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
  };
}

function fillChroma(buffer) {
  for (let index = 0; index < buffer.length; index += 3) {
    buffer[index] = CHROMA.r;
    buffer[index + 1] = CHROMA.g;
    buffer[index + 2] = CHROMA.b;
  }
}

function paste(target, targetWidth, source, sourceWidth, sourceHeight, x, y) {
  for (let row = 0; row < sourceHeight; row += 1) {
    const sourceStart = row * sourceWidth * 3;
    const targetStart = ((y + row) * targetWidth + x) * 3;
    source.copy(target, targetStart, sourceStart, sourceStart + sourceWidth * 3);
  }
}

function displayPath(path) {
  const result = relative(REPO_ROOT, path);
  return result && !result.startsWith('..')
    ? result.replaceAll('\\', '/')
    : `local-only/${basename(path)}`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!existsSync(options.source)) throw new Error(`Missing source: ${options.source}`);
  const stream = probe(options.source);
  if (stream?.width !== EXPECTED.width || stream?.height !== EXPECTED.height) {
    throw new Error(`Expected ${EXPECTED.width}x${EXPECTED.height}, got ${stream?.width}x${stream?.height}`);
  }
  const source = decodeRgb(options.source);
  if (source.length !== EXPECTED.width * EXPECTED.height * 3) {
    throw new Error(`Unexpected decoded RGB length: ${source.length}`);
  }

  mkdirSync(options.outputDir, { recursive: true });
  const sheetWidth = CELL_WIDTH * 4;
  const sheetHeight = CELL_HEIGHT * 3;
  const sheet = Buffer.alloc(sheetWidth * sheetHeight * 3);
  fillChroma(sheet);
  const frames = [];

  for (let index = 0; index < CELLS.length; index += 1) {
    const cell = CELLS[index];
    const frame = cropAndNormalize(source, EXPECTED.width, cell);
    const name = `frame-${String(index + 1).padStart(2, '0')}.png`;
    const output = join(options.outputDir, name);
    encodePng(output, cell.width, cell.height, frame.pixels);
    const column = index % 4;
    const row = Math.floor(index / 4);
    const pasteX = column * CELL_WIDTH + Math.floor((CELL_WIDTH - cell.width) / 2);
    const pasteY = row * CELL_HEIGHT + Math.floor((CELL_HEIGHT - cell.height) / 2);
    paste(sheet, sheetWidth, frame.pixels, cell.width, cell.height, pasteX, pasteY);
    frames.push({
      index: index + 1,
      role: cell.role,
      sourceCrop: { x: cell.x, y: cell.y, width: cell.width, height: cell.height },
      output: displayPath(output),
      foreground: frame.foreground,
      chromaPixels: frame.chromaPixels,
      totalPixels: cell.width * cell.height,
    });
    console.log(`${name} ${cell.role} foreground ${frame.foreground.width}x${frame.foreground.height}`);
  }

  encodePng(options.contactSheet, sheetWidth, sheetHeight, sheet);
  mkdirSync(dirname(options.manifest), { recursive: true });
  writeFileSync(options.manifest, `${JSON.stringify({
    schemaVersion: 1,
    status: 'concept-keyposes-not-production-ready',
    source: displayPath(options.source),
    sourceSha256: createHash('sha256').update(readFileSync(options.source)).digest('hex'),
    sourceCanvas: EXPECTED,
    outputSheetCanvas: { width: sheetWidth, height: sheetHeight },
    chromaKey: { ...CHROMA, requiredPaletteIndex: 0 },
    normalization: {
      rule: 'r>=180 && b>=180 && g<=160 && abs(r-b)<=40',
      sourceGridLinesExcluded: true,
    },
    frames,
  }, null, 2)}\n`);
  console.log(`contact sheet ${displayPath(options.contactSheet)}`);
  console.log(`manifest ${displayPath(options.manifest)}`);
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
