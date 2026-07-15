#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';

const EXPECTED = Object.freeze({ width: 1536, height: 1024 });
const RECTS = Object.freeze([
  { id: 'guanyu-portrait-panel', x: 38, y: 35, width: 269, height: 365 },
  { id: 'guanyu-full-body-slot', x: 0, y: 400, width: 327, height: 553 },
]);

function usage() {
  return `Compose the generated Getter-style Guanyu first column into the original five-character selection master.

Usage:
  node scripts/compose-guanyu-selection-v2.mjs \
    --base five-robot-selection-screen-v1.png \
    --patch five-robot-selection-screen-v2-imagegen-source.png \
    --output five-robot-selection-screen-v2.png \
    --manifest five-robot-selection-screen-v2.json

Only two fixed first-column rectangles may change. All decoded RGB pixels outside
those rectangles are verified byte-identical to the base image.`;
}

function parseArgs(argv) {
  const options = {};
  const keys = new Map([
    ['--base', 'base'], ['--patch', 'patch'], ['--output', 'output'], ['--manifest', 'manifest'],
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
  for (const key of ['base', 'patch', 'output', 'manifest']) {
    if (!options[key]) throw new Error(`--${key} is required`);
  }
  return options;
}

function run(binary, args, options = {}) {
  const result = spawnSync(binary, args, {
    input: options.input,
    encoding: options.binary ? null : 'utf8',
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

function decode(path) {
  return run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', path,
    '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1',
  ], { binary: true });
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

function encode(path, pixels) {
  mkdirSync(dirname(path), { recursive: true });
  const scanlines = Buffer.alloc(EXPECTED.height * (1 + EXPECTED.width * 3));
  for (let y = 0; y < EXPECTED.height; y += 1) {
    const target = y * (1 + EXPECTED.width * 3);
    scanlines[target] = 0;
    pixels.copy(scanlines, target + 1, y * EXPECTED.width * 3, (y + 1) * EXPECTED.width * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(EXPECTED.width, 0);
  ihdr.writeUInt32BE(EXPECTED.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  writeFileSync(path, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(scanlines, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]));
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  for (const key of ['base', 'patch']) {
    if (!existsSync(options[key])) throw new Error(`Missing ${key}: ${options[key]}`);
    const info = probe(options[key]);
    if (info?.width !== EXPECTED.width || info?.height !== EXPECTED.height) {
      throw new Error(`${key} must be ${EXPECTED.width}x${EXPECTED.height}, got ${info?.width}x${info?.height}`);
    }
  }

  const base = decode(options.base);
  const patch = decode(options.patch);
  console.error('decoded base and imagegen patch');
  const output = Buffer.from(base);
  let sourceChangedPixels = 0;
  for (const rect of RECTS) {
    for (let y = rect.y; y < rect.y + rect.height; y += 1) {
      const start = (y * EXPECTED.width + rect.x) * 3;
      const end = start + rect.width * 3;
      for (let offset = start; offset < end; offset += 3) {
        if (base[offset] !== patch[offset] || base[offset + 1] !== patch[offset + 1] || base[offset + 2] !== patch[offset + 2]) {
          sourceChangedPixels += 1;
        }
      }
      patch.copy(output, start, start, end);
    }
  }
  encode(options.output, output);
  console.error('encoded deterministic RGB composite');

  const decoded = decode(options.output);
  let outsideDiffPixels = 0;
  let insideDiffPixels = 0;
  for (let y = 0; y < EXPECTED.height; y += 1) {
    const allowed = RECTS.find((rect) => y >= rect.y && y < rect.y + rect.height);
    const ranges = allowed
      ? [[0, allowed.x, false], [allowed.x, allowed.x + allowed.width, true], [allowed.x + allowed.width, EXPECTED.width, false]]
      : [[0, EXPECTED.width, false]];
    for (const [startX, endX, inside] of ranges) {
      for (let x = startX; x < endX; x += 1) {
        const offset = (y * EXPECTED.width + x) * 3;
        const changed = base[offset] !== decoded[offset]
          || base[offset + 1] !== decoded[offset + 1]
          || base[offset + 2] !== decoded[offset + 2];
        if (!changed) continue;
        if (inside) insideDiffPixels += 1;
        else outsideDiffPixels += 1;
      }
    }
  }
  console.error('verified allowed-mask pixel differences');
  if (outsideDiffPixels !== 0) throw new Error(`Output changed ${outsideDiffPixels} pixels outside the first-column masks`);
  if (insideDiffPixels === 0) throw new Error('Output did not change any allowed first-column pixels');

  const manifest = {
    schemaVersion: 1,
    status: 'private-selection-master-getter-v2-first-column',
    canvas: [EXPECTED.width, EXPECTED.height],
    base: { path: options.base, sha256: sha256(options.base) },
    imagegenPatch: { path: options.patch, sha256: sha256(options.patch) },
    output: { path: options.output, sha256: sha256(options.output) },
    allowedRectangles: RECTS,
    verification: { sourceChangedPixels, insideDiffPixels, outsideDiffPixels },
  };
  mkdirSync(dirname(options.manifest), { recursive: true });
  writeFileSync(options.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
