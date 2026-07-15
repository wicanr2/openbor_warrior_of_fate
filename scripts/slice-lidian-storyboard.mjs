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
  { role: 'boss-portrait', x: 27, y: 32, width: 253, height: 266 },
  { role: 'spawn-landing', x: 326, y: 6, width: 247, height: 289 },
  { role: 'idle', x: 649, y: 94, width: 273, height: 198 },
  { role: 'walk', x: 969, y: 71, width: 175, height: 221 },
  { role: 'spear-thrust', x: 6, y: 399, width: 294, height: 184 },
  { role: 'spear-sweep', x: 335, y: 382, width: 276, height: 198 },
  { role: 'jump', x: 668, y: 329, width: 226, height: 207 },
  { role: 'aerial-charge', x: 942, y: 327, width: 279, height: 232 },
  { role: 'downward-strike', x: 29, y: 617, width: 205, height: 281 },
  { role: 'ground-special', x: 282, y: 641, width: 320, height: 226 },
  { role: 'light-pain', x: 685, y: 650, width: 212, height: 218 },
  { role: 'heavy-pain', x: 1001, y: 638, width: 187, height: 231 },
  { role: 'airborne-fall', x: 38, y: 951, width: 240, height: 214 },
  { role: 'prone-fall', x: 290, y: 1057, width: 292, height: 140 },
  { role: 'death-wreckage', x: 615, y: 1056, width: 320, height: 127 },
  { role: 'mechanical-debris', x: 965, y: 939, width: 239, height: 250 },
]);

function usage() {
  return `Slice and normalize the original Lidian red-spear commander storyboard.

Usage:
  node scripts/slice-lidian-storyboard.mjs [options]

Options:
  --source PATH         private 1254x1254 RGB PNG source
  --output-dir PATH     private normalized key-pose directory
  --contact-sheet PATH  public-safe normalized 16-pose overview
  --manifest PATH       public crop/foreground manifest
  --help                show this help`;
}

function parseArgs(argv) {
  const options = {
    source: join(REPO_ROOT, 'private_assets/robot_wof/boss/lidian/lidian-red-spear-commander-storyboard-v1.png'),
    outputDir: join(REPO_ROOT, 'private_assets/robot_wof/boss/lidian/keyposes'),
    contactSheet: join(REPO_ROOT, 'research/boss/lidian-red-spear-commander-storyboard-v1-keyed.png'),
    manifest: join(REPO_ROOT, 'research/manifests/lidian-red-spear-commander-keyposes.json'),
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
  ], undefined, true);
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

function pngChunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const body = Buffer.concat([name, data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function isGeneratedMagenta(r, g, b) {
  return r >= 180 && b >= 180 && g <= 160 && Math.abs(r - b) <= 40;
}

function normalizeCanvas(source, width, height) {
  const pixels = Buffer.from(source);
  for (let offset = 0; offset < pixels.length; offset += 3) {
    if (!isGeneratedMagenta(pixels[offset], pixels[offset + 1], pixels[offset + 2])) continue;
    pixels[offset] = CHROMA.r;
    pixels[offset + 1] = CHROMA.g;
    pixels[offset + 2] = CHROMA.b;
  }
  if (pixels.length !== width * height * 3) throw new Error('Unexpected decoded RGB size');
  return pixels;
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
  const frames = [];
  for (let index = 0; index < CELLS.length; index += 1) {
    const cell = CELLS[index];
    const frame = cropAndNormalize(source, EXPECTED.width, cell);
    const name = `frame-${String(index + 1).padStart(2, '0')}.png`;
    const output = join(options.outputDir, name);
    encodePng(output, cell.width, cell.height, frame.pixels);
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

  encodePng(options.contactSheet, EXPECTED.width, EXPECTED.height, normalizeCanvas(source, EXPECTED.width, EXPECTED.height));
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
