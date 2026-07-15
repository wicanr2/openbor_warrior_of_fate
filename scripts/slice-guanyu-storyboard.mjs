#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const EXPECTED = Object.freeze({ width: 1254, height: 1254 });
const CHROMA = Object.freeze({ r: 252, g: 0, b: 255, hex: '#FC00FF' });
const CELLS = Object.freeze([
  { role: 'portrait', x: 9, y: 35, width: 271, height: 257, pivot: { x: 149, y: 105 } },
  { role: 'spawn-landing', x: 330, y: 95, width: 252, height: 198, pivot: { x: 126, y: 185 } },
  { role: 'idle-ready', x: 648, y: 11, width: 226, height: 285, pivot: { x: 126, y: 272 } },
  { role: 'walk-contact', x: 951, y: 0, width: 218, height: 295, pivot: { x: 107, y: 282 } },
  { role: 'walk-passing', x: 34, y: 336, width: 204, height: 269, pivot: { x: 111, y: 256 } },
  { role: 'guard-block', x: 319, y: 351, width: 251, height: 253, pivot: { x: 124, y: 240 } },
  { role: 'polearm-windup', x: 631, y: 343, width: 234, height: 258, pivot: { x: 133, y: 245 } },
  { role: 'horizontal-sweep', x: 906, y: 370, width: 346, height: 233, pivot: { x: 79, y: 220 } },
  { role: 'combo-finisher', x: 22, y: 677, width: 261, height: 216, pivot: { x: 120, y: 203 } },
  { role: 'jump-takeoff', x: 330, y: 597, width: 212, height: 297, pivot: { x: 72, y: 284 } },
  { role: 'aerial-attack', x: 605, y: 649, width: 250, height: 239, pivot: { x: 143, y: 111 } },
  { role: 'spin-special', x: 918, y: 661, width: 314, height: 233, pivot: { x: 166, y: 119 } },
  { role: 'pain-recoil', x: 21, y: 942, width: 269, height: 264, pivot: { x: 144, y: 251 } },
  { role: 'airborne-fall', x: 303, y: 936, width: 234, height: 261, pivot: { x: 134, y: 139 } },
  { role: 'death-wreckage', x: 603, y: 1014, width: 291, height: 172, pivot: { x: 156, y: 66 } },
  { role: 'mechanical-debris', x: 944, y: 950, width: 269, height: 248, pivot: { x: 134, y: 124 } },
]);

function usage() {
  return `Slice and normalize the Guanyu red crescent-warrior storyboard.

Usage:
  node scripts/slice-guanyu-storyboard.mjs [options]

Options:
  --source PATH         private 1254x1254 RGB PNG source
  --output-dir PATH     private normalized key-pose directory
  --contact-sheet PATH  public overview with normalized #FC00FF background
  --manifest PATH       public crop/foreground/pivot manifest
  --help                show this help`;
}

function parseArgs(argv) {
  const options = {
    source: join(REPO_ROOT, 'private_assets/robot_wof/guanyu/guanyu-red-crescent-warrior-storyboard-v1.png'),
    outputDir: join(REPO_ROOT, 'private_assets/robot_wof/guanyu/keyposes'),
    contactSheet: join(REPO_ROOT, 'research/guanyu/guanyu-red-crescent-warrior-storyboard-v1-keyed.png'),
    manifest: join(REPO_ROOT, 'research/manifests/guanyu-red-crescent-warrior-keyposes.json'),
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

function run(binary, args, binaryOutput = false) {
  const result = spawnSync(binary, args, {
    encoding: binaryOutput ? null : 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error && result.status === null) throw result.error;
  if (result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr) ? result.stderr.toString('utf8') : result.stderr;
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
  ], true);
}

function hueDegrees(r, g, b) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  if (delta === 0) return 0;
  let hue;
  if (max === red) hue = 60 * (((green - blue) / delta) % 6);
  else if (max === green) hue = 60 * ((blue - red) / delta + 2);
  else hue = 60 * ((red - green) / delta + 4);
  return hue < 0 ? hue + 360 : hue;
}

function isGeneratedMagenta(r, g, b) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const saturation = max === 0 ? 0 : (max - min) / max;
  const hue = hueDegrees(r, g, b);
  return hue >= 285 && hue <= 335 && saturation >= 0.35 && max >= 0.35;
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

function normalizeCanvas(source) {
  const pixels = Buffer.from(source);
  for (let offset = 0; offset < pixels.length; offset += 3) {
    if (!isGeneratedMagenta(pixels[offset], pixels[offset + 1], pixels[offset + 2])) continue;
    pixels[offset] = CHROMA.r;
    pixels[offset + 1] = CHROMA.g;
    pixels[offset + 2] = CHROMA.b;
  }
  return pixels;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const body = Buffer.concat([name, data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

function encodePng(path, width, height, pixels) {
  mkdirSync(dirname(path), { recursive: true });
  const scanlines = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y += 1) {
    const target = y * (1 + width * 3);
    scanlines[target] = 0;
    pixels.copy(scanlines, target + 1, y * width * 3, (y + 1) * width * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  writeFileSync(path, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(scanlines, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]));
}

function displayPath(path) {
  const result = relative(REPO_ROOT, path);
  return result && !result.startsWith('..')
    ? result.replaceAll('\\', '/')
    : `local-only/${basename(path)}`;
}

export function sliceStoryboard(options, config = {}) {
  const expected = config.expected ?? EXPECTED;
  const cells = config.cells ?? CELLS;
  const status = config.status ?? 'concept-keyposes-not-production-ready';
  const warning = config.warning ?? 'Cells 08, 10, 11, 12 and 15 cross nominal grid lines; use only the independent crops in this manifest.';
  if (!existsSync(options.source)) throw new Error(`Missing source: ${options.source}`);
  const stream = probe(options.source);
  if (stream?.width !== expected.width || stream?.height !== expected.height) {
    throw new Error(`Expected ${expected.width}x${expected.height}, got ${stream?.width}x${stream?.height}`);
  }
  const source = decodeRgb(options.source);
  mkdirSync(options.outputDir, { recursive: true });
  const frames = [];
  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index];
    const frame = cropAndNormalize(source, expected.width, cell);
    const name = `frame-${String(index + 1).padStart(2, '0')}.png`;
    const output = join(options.outputDir, name);
    encodePng(output, cell.width, cell.height, frame.pixels);
    frames.push({
      index: index + 1,
      role: cell.role,
      sourceCrop: { role: cell.role, x: cell.x, y: cell.y, width: cell.width, height: cell.height },
      semanticPivot: cell.pivot,
      output: displayPath(output),
      foreground: frame.foreground,
      chromaPixels: frame.chromaPixels,
      totalPixels: cell.width * cell.height,
    });
    console.log(`${name} ${cell.role} foreground ${frame.foreground.width}x${frame.foreground.height}`);
  }
  encodePng(options.contactSheet, expected.width, expected.height, normalizeCanvas(source));
  mkdirSync(dirname(options.manifest), { recursive: true });
  writeFileSync(options.manifest, `${JSON.stringify({
    schemaVersion: 1,
    status,
    source: displayPath(options.source),
    sourceSha256: createHash('sha256').update(readFileSync(options.source)).digest('hex'),
    sourceCanvas: expected,
    chromaKey: { ...CHROMA, requiredPaletteIndex: 0 },
    normalization: { colorSpace: 'HSV', hueDegrees: [285, 335], minimumSaturation: 0.35, minimumValue: 0.35 },
    warning,
    frames,
  }, null, 2)}\n`);
  console.log(`contact sheet ${displayPath(options.contactSheet)}`);
  console.log(`manifest ${displayPath(options.manifest)}`);
}

function main() {
  sliceStoryboard(parseArgs(process.argv.slice(2)));
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
