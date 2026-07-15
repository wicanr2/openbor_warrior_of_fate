#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const CHROMA = Object.freeze([252, 0, 255]);

function usage() {
  return `Normalize an image-generation storyboard background to exact #FC00FF.

Only pixels connected to the canvas edge and close to the dominant border color
are replaced. This avoids deleting isolated pink weapons or hit effects.

Usage:
  node scripts/normalize-storyboard-overview.mjs --source INPUT.png --output OUTPUT.png [--threshold 52]
`;
}

function parseArgs(argv) {
  const result = { threshold: 52 };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') {
      console.log(usage());
      process.exit(0);
    }
    const value = argv[index + 1];
    if (!value) throw new Error(`${argument} requires a value`);
    if (argument === '--source') result.source = resolve(value);
    else if (argument === '--output') result.output = resolve(value);
    else if (argument === '--threshold') result.threshold = Number(value);
    else throw new Error(`Unknown option: ${argument}`);
    index += 1;
  }
  if (!result.source || !result.output) throw new Error('--source and --output are required');
  if (!Number.isFinite(result.threshold) || result.threshold <= 0 || result.threshold > 160) {
    throw new Error('--threshold must be in the range 1..160');
  }
  return result;
}

function run(binary, args, input = null, binaryOutput = false) {
  const result = spawnSync(binary, args, {
    input,
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
  const json = run('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,pix_fmt', '-of', 'json', path,
  ]);
  return JSON.parse(json).streams?.[0];
}

function decodeRgb(path) {
  return run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', path,
    '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1',
  ], null, true);
}

function encodePng(path, width, height, pixels) {
  mkdirSync(dirname(path), { recursive: true });
  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${width}x${height}`, '-i', 'pipe:0',
    '-frames:v', '1', path,
  ], pixels);
}

function quantizedKey(r, g, b) {
  return `${r >> 3},${g >> 3},${b >> 3}`;
}

function dominantBorderColor(pixels, width, height) {
  const border = Math.max(2, Math.min(12, Math.floor(Math.min(width, height) / 80)));
  const buckets = new Map();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x >= border && x < width - border && y >= border && y < height - border) continue;
      const offset = (y * width + x) * 3;
      const r = pixels[offset];
      const g = pixels[offset + 1];
      const b = pixels[offset + 2];
      const key = quantizedKey(r, g, b);
      const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
      bucket.count += 1;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      buckets.set(key, bucket);
    }
  }
  const dominant = [...buckets.values()].sort((left, right) => right.count - left.count)[0];
  if (!dominant) throw new Error('Could not sample a border background color');
  return [
    Math.round(dominant.r / dominant.count),
    Math.round(dominant.g / dominant.count),
    Math.round(dominant.b / dominant.count),
  ];
}

function colorDistance(pixels, pixelIndex, reference) {
  const offset = pixelIndex * 3;
  const dr = pixels[offset] - reference[0];
  const dg = pixels[offset + 1] - reference[1];
  const db = pixels[offset + 2] - reference[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function edgeConnectedMask(pixels, width, height, reference, threshold) {
  const count = width * height;
  const mask = new Uint8Array(count);
  const queued = new Uint8Array(count);
  const queue = new Uint32Array(count);
  let head = 0;
  let tail = 0;

  function enqueue(index) {
    if (queued[index]) return;
    queued[index] = 1;
    queue[tail++] = index;
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head++];
    if (colorDistance(pixels, index, reference) > threshold) continue;
    mask[index] = 1;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }
  return mask;
}

function normalize(pixels, mask) {
  const output = Buffer.from(pixels);
  let replaced = 0;
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) continue;
    const offset = index * 3;
    output[offset] = CHROMA[0];
    output[offset + 1] = CHROMA[1];
    output[offset + 2] = CHROMA[2];
    replaced += 1;
  }
  return { output, replaced };
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

const options = parseArgs(process.argv.slice(2));
if (!existsSync(options.source)) throw new Error(`Source not found: ${options.source}`);
const info = probe(options.source);
if (!info?.width || !info?.height) throw new Error('Could not probe source dimensions');
const pixels = decodeRgb(options.source);
const reference = dominantBorderColor(pixels, info.width, info.height);
const mask = edgeConnectedMask(pixels, info.width, info.height, reference, options.threshold);
const { output, replaced } = normalize(pixels, mask);
encodePng(options.output, info.width, info.height, output);

console.log(JSON.stringify({
  source: options.source,
  output: options.output,
  canvas: [info.width, info.height],
  dominantBorderRgb: reference,
  threshold: options.threshold,
  replacedPixels: replaced,
  totalPixels: info.width * info.height,
  outputSha256: sha256(options.output),
}, null, 2));
