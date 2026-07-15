#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CHROMA, encodeGif, verifyGif } from './build-mazinger-p0-prototype.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const SOURCE_CANVAS = Object.freeze({ width: 1536, height: 1024 });
const TARGET_CANVAS = Object.freeze({ width: 480, height: 276 });
const PROTECTED_START_X = 103;
const SOURCE_FILTER = 'crop=1536:883:0:70,scale=480:276:flags=neighbor,format=rgb24';

function usage() {
  return `Build the Getter-v2 Guanyu selection screen while preserving the other four runtime columns.

Usage:
  node scripts/build-guanyu-selection-runtime-v2.mjs [options]

Options:
  --source PATH       private 1536x1024 Getter-v2 selection master
  --base-gif PATH     current 480x276 indexed runtime select.gif
  --output PATH       output indexed GIF
  --manifest PATH     output verification manifest
  --help              show this help

Only x=0..102 is re-quantized. Palette entries and all palette indices at
x>=103 are required to remain byte-for-byte identical to the base GIF.`;
}

function parseArgs(argv) {
  const options = {
    source: resolve(REPO_ROOT, 'private_assets/robot_wof/ui/five-robot-selection-screen-v2.png'),
    baseGif: resolve(REPO_ROOT, 'workplace/robot_wof_vertical_slice/overlay/data/bgs/select.gif'),
    output: resolve(REPO_ROOT, 'private_assets/robot_wof/ui/runtime/select-getter-v2.gif'),
    manifest: resolve(REPO_ROOT, 'private_assets/robot_wof/ui/runtime/select-getter-v2-manifest.json'),
  };
  const keys = new Map([
    ['--source', 'source'], ['--base-gif', 'baseGif'],
    ['--output', 'output'], ['--manifest', 'manifest'],
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

function run(command, args, { binaryOutput = false } = {}) {
  const result = spawnSync(command, args, {
    encoding: binaryOutput ? null : 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error && result.status === null) throw result.error;
  if (result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr) ? result.stderr.toString('utf8') : result.stderr;
    throw new Error(`${command} failed (${result.status}): ${stderr?.trim()}`);
  }
  return result.stdout;
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function displayPath(path) {
  const local = relative(REPO_ROOT, path);
  return local && !local.startsWith('..') ? local.replaceAll('\\', '/') : `local-only/${basename(path)}`;
}

function probe(path) {
  return JSON.parse(run('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'json', path,
  ])).streams?.[0];
}

function readSubBlocks(bytes, offset) {
  const blocks = [];
  let cursor = offset;
  while (cursor < bytes.length) {
    const size = bytes[cursor];
    cursor += 1;
    if (size === 0) return { data: Buffer.concat(blocks), nextOffset: cursor };
    if (cursor + size > bytes.length) throw new Error('Truncated GIF data sub-block');
    blocks.push(bytes.subarray(cursor, cursor + size));
    cursor += size;
  }
  throw new Error('Unterminated GIF data sub-block sequence');
}

function decodeLzw(data, minimumCodeSize, expectedPixels) {
  const clearCode = 1 << minimumCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minimumCodeSize + 1;
  let nextCode = endCode + 1;
  let bitOffset = 0;
  let previous = null;
  let dictionary = [];
  const output = [];

  const reset = () => {
    dictionary = Array.from({ length: clearCode }, (_, index) => [index]);
    dictionary[clearCode] = null;
    dictionary[endCode] = null;
    codeSize = minimumCodeSize + 1;
    nextCode = endCode + 1;
    previous = null;
  };
  const readCode = () => {
    if (bitOffset + codeSize > data.length * 8) return null;
    let code = 0;
    for (let bit = 0; bit < codeSize; bit += 1) {
      const absolute = bitOffset + bit;
      code |= ((data[absolute >> 3] >> (absolute & 7)) & 1) << bit;
    }
    bitOffset += codeSize;
    return code;
  };

  reset();
  while (true) {
    const code = readCode();
    if (code === null) throw new Error('GIF LZW stream ended before its end code');
    if (code === clearCode) {
      reset();
      continue;
    }
    if (code === endCode) break;

    let entry;
    if (dictionary[code]) entry = dictionary[code];
    else if (code === nextCode && previous) entry = [...previous, previous[0]];
    else throw new Error(`Invalid GIF LZW code ${code} at dictionary size ${nextCode}`);
    output.push(...entry);

    if (previous && nextCode < 4096) {
      dictionary[nextCode] = [...previous, entry[0]];
      nextCode += 1;
      if (nextCode === (1 << codeSize) && codeSize < 12) codeSize += 1;
    }
    previous = entry;
  }
  if (output.length !== expectedPixels) {
    throw new Error(`Decoded ${output.length} GIF pixels; expected ${expectedPixels}`);
  }
  return Buffer.from(output);
}

function deinterlace(pixels, width, height) {
  const result = Buffer.alloc(pixels.length);
  let sourceY = 0;
  for (const [start, step] of [[0, 8], [4, 8], [2, 4], [1, 2]]) {
    for (let y = start; y < height; y += step) {
      pixels.copy(result, y * width, sourceY * width, (sourceY + 1) * width);
      sourceY += 1;
    }
  }
  return result;
}

export function decodeIndexedGif(path) {
  const bytes = readFileSync(path);
  const signature = bytes.subarray(0, 6).toString('ascii');
  if (signature !== 'GIF87a' && signature !== 'GIF89a') throw new Error(`${path} is not a GIF`);
  const width = bytes.readUInt16LE(6);
  const height = bytes.readUInt16LE(8);
  const packed = bytes[10];
  if ((packed & 0x80) === 0) throw new Error('Base GIF must have a global colour table');
  const globalColourCount = 1 << ((packed & 0x07) + 1);
  if (globalColourCount !== 256) throw new Error(`Base GIF must have 256 palette entries, got ${globalColourCount}`);
  const globalPalette = Buffer.from(bytes.subarray(13, 13 + globalColourCount * 3));
  let offset = 13 + globalColourCount * 3;
  let image = null;
  let frames = 0;
  while (offset < bytes.length) {
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0x3b) break;
    if (marker === 0x21) {
      if (offset >= bytes.length) throw new Error('Truncated GIF extension');
      offset += 1;
      offset = readSubBlocks(bytes, offset).nextOffset;
      continue;
    }
    if (marker !== 0x2c) throw new Error(`Unexpected GIF block marker 0x${marker.toString(16)}`);
    if (offset + 9 > bytes.length) throw new Error('Truncated GIF image descriptor');
    const left = bytes.readUInt16LE(offset);
    const top = bytes.readUInt16LE(offset + 2);
    const imageWidth = bytes.readUInt16LE(offset + 4);
    const imageHeight = bytes.readUInt16LE(offset + 6);
    const imagePacked = bytes[offset + 8];
    offset += 9;
    if ((imagePacked & 0x80) !== 0) throw new Error('Local GIF colour tables are not supported for this protected-index build');
    if (left !== 0 || top !== 0 || imageWidth !== width || imageHeight !== height) {
      throw new Error('Base GIF image must occupy the complete logical canvas');
    }
    const minimumCodeSize = bytes[offset];
    offset += 1;
    const blocks = readSubBlocks(bytes, offset);
    offset = blocks.nextOffset;
    let pixels = decodeLzw(blocks.data, minimumCodeSize, imageWidth * imageHeight);
    if ((imagePacked & 0x40) !== 0) pixels = deinterlace(pixels, imageWidth, imageHeight);
    frames += 1;
    if (frames > 1) throw new Error('Base select.gif must be a single-frame GIF');
    image = pixels;
  }
  if (!image) throw new Error('Base GIF has no image frame');
  return { width, height, pixels: image, rgbPalette: globalPalette };
}

function renderRuntimeRgb(sourcePath) {
  const bytes = run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', sourcePath,
    '-vf', SOURCE_FILTER, '-frames:v', '1',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1',
  ], { binaryOutput: true });
  const expected = TARGET_CANVAS.width * TARGET_CANVAS.height * 3;
  if (bytes.length !== expected) throw new Error(`Rendered ${bytes.length} RGB bytes; expected ${expected}`);
  return bytes;
}

function nearestPaletteIndex(r, g, b, rgbPalette) {
  let bestIndex = 1;
  let bestDistance = Number.POSITIVE_INFINITY;
  // Index zero is the OpenBOR chroma key and must remain unused on this opaque screen.
  for (let index = 1; index < 256; index += 1) {
    const offset = index * 3;
    const dr = r - rgbPalette[offset];
    const dg = g - rgbPalette[offset + 1];
    const db = b - rgbPalette[offset + 2];
    // Weighted squared distance gives green detail more influence without adding dither noise.
    const distance = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return bestIndex;
}

function paletteToBgra(rgbPalette) {
  const bgra = Buffer.alloc(256 * 4);
  for (let index = 0; index < 256; index += 1) {
    bgra[index * 4] = rgbPalette[index * 3 + 2];
    bgra[index * 4 + 1] = rgbPalette[index * 3 + 1];
    bgra[index * 4 + 2] = rgbPalette[index * 3];
    bgra[index * 4 + 3] = 255;
  }
  return bgra;
}

function countIndexDifferences(left, right, startX, endX) {
  let count = 0;
  for (let y = 0; y < TARGET_CANVAS.height; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const offset = y * TARGET_CANVAS.width + x;
      if (left[offset] !== right[offset]) count += 1;
    }
  }
  return count;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  for (const [label, path] of [['source', options.source], ['base GIF', options.baseGif]]) {
    if (!existsSync(path)) throw new Error(`Missing ${label}: ${path}`);
  }
  const source = probe(options.source);
  if (source?.width !== SOURCE_CANVAS.width || source?.height !== SOURCE_CANVAS.height) {
    throw new Error(`Source must be ${SOURCE_CANVAS.width}x${SOURCE_CANVAS.height}`);
  }
  const base = decodeIndexedGif(options.baseGif);
  if (base.width !== TARGET_CANVAS.width || base.height !== TARGET_CANVAS.height) {
    throw new Error(`Base GIF must be ${TARGET_CANVAS.width}x${TARGET_CANVAS.height}`);
  }
  if (base.rgbPalette[0] !== CHROMA.r || base.rgbPalette[1] !== CHROMA.g || base.rgbPalette[2] !== CHROMA.b) {
    throw new Error(`Base palette index 0 must be exact ${CHROMA.hex}`);
  }

  const sourceRgb = renderRuntimeRgb(options.source);
  const outputPixels = Buffer.from(base.pixels);
  for (let y = 0; y < TARGET_CANVAS.height; y += 1) {
    for (let x = 0; x < PROTECTED_START_X; x += 1) {
      const pixel = y * TARGET_CANVAS.width + x;
      const rgb = pixel * 3;
      outputPixels[pixel] = nearestPaletteIndex(
        sourceRgb[rgb], sourceRgb[rgb + 1], sourceRgb[rgb + 2], base.rgbPalette,
      );
    }
  }

  mkdirSync(dirname(options.output), { recursive: true });
  writeFileSync(options.output, encodeGif(
    TARGET_CANVAS.width, TARGET_CANVAS.height, outputPixels, paletteToBgra(base.rgbPalette),
  ));
  verifyGif(options.output, TARGET_CANVAS.width, TARGET_CANVAS.height);
  const decodedOutput = decodeIndexedGif(options.output);

  const protectedIndexMismatches = countIndexDifferences(
    base.pixels, decodedOutput.pixels, PROTECTED_START_X, TARGET_CANVAS.width,
  );
  const firstColumnChangedIndices = countIndexDifferences(base.pixels, decodedOutput.pixels, 0, PROTECTED_START_X);
  const paletteByteMismatches = base.rgbPalette.reduce(
    (count, value, index) => count + Number(value !== decodedOutput.rgbPalette[index]), 0,
  );
  let index0PixelCount = 0;
  for (const index of decodedOutput.pixels) if (index === 0) index0PixelCount += 1;
  if (protectedIndexMismatches !== 0) {
    throw new Error(`Output changed ${protectedIndexMismatches} protected palette indices at x>=${PROTECTED_START_X}`);
  }
  if (paletteByteMismatches !== 0) throw new Error(`Output changed ${paletteByteMismatches} palette bytes`);
  if (firstColumnChangedIndices === 0) throw new Error('Getter-v2 build did not change the first column');
  if (index0PixelCount !== 0) throw new Error(`Opaque selection output unexpectedly uses index 0 for ${index0PixelCount} pixels`);

  const manifest = {
    schemaVersion: 1,
    status: 'private-runtime-selection-getter-v2-first-column',
    source: {
      path: displayPath(options.source), sha256: sha256(options.source),
      canvas: [SOURCE_CANVAS.width, SOURCE_CANVAS.height], filter: SOURCE_FILTER,
    },
    baseGif: { path: displayPath(options.baseGif), sha256: sha256(options.baseGif) },
    output: { path: displayPath(options.output), sha256: sha256(options.output) },
    canvas: [TARGET_CANVAS.width, TARGET_CANVAS.height],
    patchRegion: { x: 0, y: 0, width: PROTECTED_START_X, height: TARGET_CANVAS.height },
    protectedRegion: {
      x: PROTECTED_START_X, y: 0,
      width: TARGET_CANVAS.width - PROTECTED_START_X, height: TARGET_CANVAS.height,
    },
    palette: {
      entries: 256, inheritedFromBase: true,
      index0: CHROMA.hex, index0PixelCount,
    },
    verification: {
      protectedPixelCount: (TARGET_CANVAS.width - PROTECTED_START_X) * TARGET_CANVAS.height,
      protectedIndexMismatches,
      paletteByteMismatches,
      firstColumnPixelCount: PROTECTED_START_X * TARGET_CANVAS.height,
      firstColumnChangedIndices,
    },
  };
  mkdirSync(dirname(options.manifest), { recursive: true });
  writeFileSync(options.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest, null, 2));
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
