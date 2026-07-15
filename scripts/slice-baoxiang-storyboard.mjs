#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const EXPECTED = Object.freeze({ width: 2036, height: 772 });
const CHROMA = Object.freeze({ r: 252, g: 0, b: 255, hex: '#FC00FF' });
const CELLS = Object.freeze([
  { role: 'sealed-capsule', x: 0, y: 0, width: 678, height: 772 },
  { role: 'rupture-a', x: 678, y: 0, width: 679, height: 772 },
  { role: 'rupture-b', x: 1357, y: 0, width: 679, height: 772 },
]);

function usage() {
  return `Slice and normalize the original mechanical supply capsule storyboard.

Usage:
  node scripts/slice-baoxiang-storyboard.mjs [options]

Options:
  --source PATH         private 2036x772 RGB PNG source
  --output-dir PATH     private normalized key-pose directory
  --contact-sheet PATH  public-safe normalized three-pose overview
  --manifest PATH       public crop/foreground manifest
  --help                show this help`;
}

function parseArgs(argv) {
  const options = {
    source: join(
      REPO_ROOT,
      'private_assets/robot_wof/stage01/supply/baoxiang-mechanical-capsule-storyboard-v1.png',
    ),
    outputDir: join(REPO_ROOT, 'private_assets/robot_wof/stage01/supply/keyposes'),
    contactSheet: join(REPO_ROOT, 'research/props/baoxiang-mechanical-capsule-storyboard-v1-keyed.png'),
    manifest: join(REPO_ROOT, 'research/manifests/baoxiang-mechanical-capsule-keyposes.json'),
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

function run(binary, args, input = undefined, binaryOutput = false) {
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
  return JSON.parse(run('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,pix_fmt', '-of', 'json', path,
  ])).streams?.[0];
}

function decodeRgb(path) {
  return run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', path,
    '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1',
  ], undefined, true);
}

function encodePng(path, width, height, pixels) {
  mkdirSync(dirname(path), { recursive: true });
  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pixel_format', 'rgb24', '-video_size', `${width}x${height}`,
    '-i', 'pipe:0', '-frames:v', '1', path,
  ], pixels);
}

function isGeneratedMagenta(r, g, b) {
  return r >= 180 && b >= 180 && g <= 160 && Math.abs(r - b) <= 40;
}

function cropAndNormalize(source, sourceWidth, cell) {
  const pixels = Buffer.alloc(cell.width * cell.height * 3);
  let minX = cell.width;
  let minY = cell.height;
  let maxX = -1;
  let maxY = -1;
  let chromaPixels = 0;
  for (let y = 0; y < cell.height; y += 1) {
    for (let x = 0; x < cell.width; x += 1) {
      const sourceOffset = ((cell.y + y) * sourceWidth + cell.x + x) * 3;
      const targetOffset = (y * cell.width + x) * 3;
      const r = source[sourceOffset];
      const g = source[sourceOffset + 1];
      const b = source[sourceOffset + 2];
      const background = isGeneratedMagenta(r, g, b);
      pixels[targetOffset] = background ? CHROMA.r : r;
      pixels[targetOffset + 1] = background ? CHROMA.g : g;
      pixels[targetOffset + 2] = background ? CHROMA.b : b;
      if (background) chromaPixels += 1;
      else {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < 0) throw new Error(`${cell.role} contains no foreground`);
  return {
    pixels,
    chromaPixels,
    foreground: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
  };
}

function fillChroma(buffer) {
  for (let offset = 0; offset < buffer.length; offset += 3) {
    buffer[offset] = CHROMA.r;
    buffer[offset + 1] = CHROMA.g;
    buffer[offset + 2] = CHROMA.b;
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
  mkdirSync(options.outputDir, { recursive: true });
  const sheet = Buffer.alloc(EXPECTED.width * EXPECTED.height * 3);
  fillChroma(sheet);
  const frames = [];

  for (let index = 0; index < CELLS.length; index += 1) {
    const cell = CELLS[index];
    const frame = cropAndNormalize(source, EXPECTED.width, cell);
    const name = `frame-${String(index + 1).padStart(2, '0')}.png`;
    const output = join(options.outputDir, name);
    encodePng(output, cell.width, cell.height, frame.pixels);
    paste(sheet, EXPECTED.width, frame.pixels, cell.width, cell.height, cell.x, cell.y);
    frames.push({
      index: index + 1,
      role: cell.role,
      sourceCrop: cell,
      output: displayPath(output),
      foreground: frame.foreground,
      chromaPixels: frame.chromaPixels,
      totalPixels: cell.width * cell.height,
    });
    console.log(`${name} ${cell.role} foreground ${frame.foreground.width}x${frame.foreground.height}`);
  }

  encodePng(options.contactSheet, EXPECTED.width, EXPECTED.height, sheet);
  mkdirSync(dirname(options.manifest), { recursive: true });
  writeFileSync(options.manifest, `${JSON.stringify({
    schemaVersion: 1,
    status: 'concept-keyposes-not-production-ready',
    source: displayPath(options.source),
    sourceSha256: createHash('sha256').update(readFileSync(options.source)).digest('hex'),
    sourceCanvas: EXPECTED,
    chromaKey: { ...CHROMA, requiredPaletteIndex: 0 },
    normalization: { rule: 'r>=180 && b>=180 && g<=160 && abs(r-b)<=40' },
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
