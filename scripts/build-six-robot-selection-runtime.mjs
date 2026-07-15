#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CHROMA, encodeGif, verifyGif } from './build-mazinger-p0-prototype.mjs';
import {
  decodeIndexedGif,
  nearestPaletteIndex,
  paletteToBgra,
} from './build-guanyu-selection-runtime-v2.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const CANVAS = Object.freeze({ width: 480, height: 276 });
const OLD_COLUMN_WIDTH = 96;
const NEW_COLUMN_WIDTH = 80;
const NU_COLUMN_X = NEW_COLUMN_WIDTH * 5;
const ROSTER = Object.freeze(['guanyu', 'zhangfei', 'zhaoyun', 'huangzhong', 'weiyan', 'nu_gundam']);

function usage() {
  return `Build the six-candidate OpenBOR selection bitmap.

Usage:
  node scripts/build-six-robot-selection-runtime.mjs [options]

Options:
  --base-gif PATH       validated five-column 480x276 indexed select.gif
  --portrait PATH       ν Gundam frame-01 portrait key pose
  --body PATH           ν Gundam frame-03 rifle-idle key pose
  --output PATH         output six-column indexed GIF
  --manifest PATH       output verification manifest
  --help                show this help

The five existing 96px columns are nearest-neighbour resampled to 80px. The
sixth 80px column is composed from the ν portrait and full body on black. The
base 256-colour palette is inherited byte-for-byte; palette index 0 remains
exact #FC00FF and is intentionally unused by this opaque screen.`;
}

function parseArgs(argv) {
  const options = {
    // Keep the five-column input immutable. Once this build is merged, the active
    // overlay select.gif is already six-column and must never be fed back here.
    baseGif: resolve(REPO_ROOT, 'private_assets/robot_wof/ui/runtime/select-getter-v2.gif'),
    portrait: resolve(REPO_ROOT, 'private_assets/robot_wof/nu_gundam/keyposes-v5/frame-01.png'),
    body: resolve(REPO_ROOT, 'private_assets/robot_wof/nu_gundam/keyposes-v5/frame-03.png'),
    output: resolve(REPO_ROOT, 'private_assets/robot_wof/ui/runtime/select-six-robot.gif'),
    manifest: resolve(REPO_ROOT, 'private_assets/robot_wof/ui/runtime/select-six-robot-manifest.json'),
  };
  const keys = new Map([
    ['--base-gif', 'baseGif'], ['--portrait', 'portrait'], ['--body', 'body'],
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
  for (const [label, filePath] of [
    ['base gif', options.baseGif],
    ['portrait key pose', options.portrait],
    ['body key pose', options.body],
  ]) {
    if (!existsSync(filePath)) {
      throw new Error(
        `Missing six-select ${label}: ${displayPath(filePath)}. ` +
        'This repository does not ship the private source assets; pass explicit paths from an external checkout.'
      );
    }
  }
  return options;
}

function run(command, args, { binaryOutput = false } = {}) {
  const result = spawnSync(command, args, {
    encoding: binaryOutput ? null : 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 30_000,
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

function readRgb24(path) {
  const probe = JSON.parse(run('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'json', path,
  ])).streams?.[0];
  if (!probe?.width || !probe?.height) throw new Error(`Could not probe ${path}`);
  const pixels = run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', path, '-frames:v', '1',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1',
  ], { binaryOutput: true });
  if (pixels.length !== probe.width * probe.height * 3) {
    throw new Error(`Unexpected RGB byte count for ${path}`);
  }
  return { width: probe.width, height: probe.height, pixels };
}

function foregroundBounds(image) {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 3;
      const dr = image.pixels[offset] - CHROMA.r;
      const dg = image.pixels[offset + 1] - CHROMA.g;
      const db = image.pixels[offset + 2] - CHROMA.b;
      if (dr * dr + dg * dg + db * db <= 24 ** 2) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) throw new Error('ν key pose has no foreground');
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function scaleForegroundToPanel({ image, bounds, outputRgb, x, y, width, height }) {
  for (let targetY = 0; targetY < height; targetY += 1) {
    const sourceY = bounds.y + Math.min(bounds.height - 1, Math.floor(targetY * bounds.height / height));
    for (let targetX = 0; targetX < width; targetX += 1) {
      const sourceX = bounds.x + Math.min(bounds.width - 1, Math.floor(targetX * bounds.width / width));
      const source = (sourceY * image.width + sourceX) * 3;
      const dr = image.pixels[source] - CHROMA.r;
      const dg = image.pixels[source + 1] - CHROMA.g;
      const db = image.pixels[source + 2] - CHROMA.b;
      if (dr * dr + dg * dg + db * db <= 24 ** 2) continue;
      const target = ((y + targetY) * NEW_COLUMN_WIDTH + x + targetX) * 3;
      outputRgb[target] = image.pixels[source];
      outputRgb[target + 1] = image.pixels[source + 1];
      outputRgb[target + 2] = image.pixels[source + 2];
    }
  }
}

function countDifferences(left, right) {
  let count = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) count += 1;
  }
  return count;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  for (const [label, path] of [['base GIF', options.baseGif], ['portrait', options.portrait], ['body', options.body]]) {
    if (!existsSync(path)) throw new Error(`Missing ${label}: ${path}`);
  }
  const base = decodeIndexedGif(options.baseGif);
  if (base.width !== CANVAS.width || base.height !== CANVAS.height) {
    throw new Error(`Base GIF must be ${CANVAS.width}x${CANVAS.height}`);
  }
  if (base.rgbPalette[0] !== CHROMA.r || base.rgbPalette[1] !== CHROMA.g || base.rgbPalette[2] !== CHROMA.b) {
    throw new Error(`Base palette index 0 must be exact ${CHROMA.hex}`);
  }

  const outputPixels = Buffer.alloc(CANVAS.width * CANVAS.height);
  for (let y = 0; y < CANVAS.height; y += 1) {
    for (let column = 0; column < 5; column += 1) {
      for (let x = 0; x < NEW_COLUMN_WIDTH; x += 1) {
        const sourceX = column * OLD_COLUMN_WIDTH + Math.min(
          OLD_COLUMN_WIDTH - 1,
          Math.floor(x * OLD_COLUMN_WIDTH / NEW_COLUMN_WIDTH),
        );
        outputPixels[y * CANVAS.width + column * NEW_COLUMN_WIDTH + x] = base.pixels[y * CANVAS.width + sourceX];
      }
    }
  }

  const portrait = readRgb24(options.portrait);
  const body = readRgb24(options.body);
  const panelRgb = Buffer.alloc(NEW_COLUMN_WIDTH * CANVAS.height * 3, 0);
  scaleForegroundToPanel({
    image: portrait, bounds: foregroundBounds(portrait), outputRgb: panelRgb,
    x: 1, y: 5, width: 78, height: 106,
  });
  scaleForegroundToPanel({
    image: body, bounds: foregroundBounds(body), outputRgb: panelRgb,
    x: 1, y: 119, width: 78, height: 150,
  });
  for (let y = 0; y < CANVAS.height; y += 1) {
    for (let x = 0; x < NEW_COLUMN_WIDTH; x += 1) {
      const source = (y * NEW_COLUMN_WIDTH + x) * 3;
      outputPixels[y * CANVAS.width + NU_COLUMN_X + x] = nearestPaletteIndex(
        panelRgb[source], panelRgb[source + 1], panelRgb[source + 2], base.rgbPalette,
      );
    }
  }

  mkdirSync(dirname(options.output), { recursive: true });
  writeFileSync(options.output, encodeGif(
    CANVAS.width, CANVAS.height, outputPixels, paletteToBgra(base.rgbPalette),
  ));
  verifyGif(options.output, CANVAS.width, CANVAS.height);
  const decoded = decodeIndexedGif(options.output);
  const paletteByteMismatches = countDifferences(base.rgbPalette, decoded.rgbPalette);
  let index0PixelCount = 0;
  for (const index of decoded.pixels) if (index === 0) index0PixelCount += 1;
  if (paletteByteMismatches !== 0) throw new Error(`Output changed ${paletteByteMismatches} palette bytes`);
  if (index0PixelCount !== 0) throw new Error(`Opaque selection unexpectedly uses index 0 for ${index0PixelCount} pixels`);
  let resampledLegacyPixelMismatches = 0;
  for (let y = 0; y < CANVAS.height; y += 1) {
    for (let column = 0; column < 5; column += 1) {
      for (let x = 0; x < NEW_COLUMN_WIDTH; x += 1) {
        const sourceX = column * OLD_COLUMN_WIDTH + Math.min(
          OLD_COLUMN_WIDTH - 1,
          Math.floor(x * OLD_COLUMN_WIDTH / NEW_COLUMN_WIDTH),
        );
        const expected = base.pixels[y * CANVAS.width + sourceX];
        const actual = decoded.pixels[y * CANVAS.width + column * NEW_COLUMN_WIDTH + x];
        if (actual !== expected) resampledLegacyPixelMismatches += 1;
      }
    }
  }
  if (resampledLegacyPixelMismatches !== 0) {
    throw new Error(`Decoded GIF changed ${resampledLegacyPixelMismatches} resampled legacy pixels`);
  }
  const blackIndex = nearestPaletteIndex(0, 0, 0, base.rgbPalette);
  let nuColumnNonBlackPixels = 0;
  for (let y = 0; y < CANVAS.height; y += 1) {
    for (let x = NU_COLUMN_X; x < CANVAS.width; x += 1) {
      if (decoded.pixels[y * CANVAS.width + x] !== blackIndex) nuColumnNonBlackPixels += 1;
    }
  }
  if (nuColumnNonBlackPixels < 1_000) throw new Error('ν column contains too little visible artwork');

  const manifest = {
    schemaVersion: 1,
    status: 'private-runtime-six-candidate-selection-engineering-p0',
    productionReady: false,
    roster: ROSTER,
    source: {
      baseGif: { path: displayPath(options.baseGif), sha256: sha256(options.baseGif) },
      portrait: { path: displayPath(options.portrait), sha256: sha256(options.portrait) },
      body: { path: displayPath(options.body), sha256: sha256(options.body) },
    },
    output: { path: displayPath(options.output), sha256: sha256(options.output) },
    canvas: [CANVAS.width, CANVAS.height],
    layout: {
      oldColumns: { count: 5, width: OLD_COLUMN_WIDTH },
      newColumns: { count: 6, width: NEW_COLUMN_WIDTH },
      nuColumn: { x: NU_COLUMN_X, width: NEW_COLUMN_WIDTH },
      resampling: 'nearest-neighbour',
    },
    palette: {
      entries: 256,
      inheritedFromBase: true,
      paletteByteMismatches,
      index0: CHROMA.hex,
      index0PixelCount,
    },
    verification: {
      decodedCanvas: [decoded.width, decoded.height],
      resampledLegacyPixelMismatches,
      blackPaletteIndex: blackIndex,
      nuColumnNonBlackPixels,
    },
    deferred: [
      'visible OpenBOR cursor and six-step left/right cycle QA',
      '1P/2P Ready flow and nosame behavior QA',
      'pixel-artist cleanup of horizontally compacted five legacy columns',
    ],
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
