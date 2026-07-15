#!/usr/bin/env node

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  CHROMA,
  analyzePose,
  encodeGif,
  forceChromaAtIndexZero,
  makeComposedPng,
  palettizeWithFfmpeg,
  probeImage,
  verifyGif,
} from './build-mazinger-p0-prototype.mjs';
import { palettizeOpaque, renderPng } from './build-five-robot-selection-p0-prototype.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const DEFAULT_SPRITE_HEIGHT = 90;

const PIVOTS = Object.freeze({
  'frame-01.png': { x: 149, y: 105 },
  'frame-02.png': { x: 126, y: 185 },
  'frame-03.png': { x: 126, y: 272 },
  'frame-04.png': { x: 107, y: 282 },
  'frame-05.png': { x: 111, y: 256 },
  'frame-06.png': { x: 124, y: 240 },
  'frame-07.png': { x: 133, y: 245 },
  'frame-08.png': { x: 79, y: 220 },
  'frame-09.png': { x: 120, y: 203 },
  'frame-10.png': { x: 72, y: 284 },
  'frame-11.png': { x: 143, y: 111 },
  'frame-12.png': { x: 166, y: 119 },
  'frame-13.png': { x: 144, y: 251 },
  'frame-14.png': { x: 134, y: 139 },
  'frame-15.png': { x: 156, y: 66 },
  'frame-16.png': { x: 134, y: 124 },
});

function item(output, source, x, y, extra = {}) {
  return { output, source, offset: { x, y }, sourceAnchor: PIVOTS[source], ...extra };
}

const MAIN_MAPPING = Object.freeze([
  item('idle001.gif', 'frame-03.png', 42, 80),
  item('idle002.gif', 'frame-03.png', 42, 80),
  item('x1.gif', 'frame-02.png', 45, 101),
  item('x2.gif', 'frame-02.png', 45, 101),
  item('walk1.gif', 'frame-04.png', 83, 128, { spriteHeight: 110 }),
  item('walk2.gif', 'frame-05.png', 83, 128, { spriteHeight: 110 }),
  item('walk3.gif', 'frame-04.png', 83, 128, { spriteHeight: 110 }),
  item('walk4.gif', 'frame-05.png', 83, 128, { spriteHeight: 110 }),
  item('walk5.gif', 'frame-04.png', 83, 128, { spriteHeight: 110 }),
  item('walk6.gif', 'frame-05.png', 83, 128, { spriteHeight: 110 }),
  item('walk7.gif', 'frame-04.png', 83, 128, { spriteHeight: 110 }),
  item('walk8.gif', 'frame-05.png', 83, 128, { spriteHeight: 110 }),
  item('jump001.gif', 'frame-10.png', 40, 122),
  item('jump002.gif', 'frame-10.png', 42, 109),
  item('jk001.gif', 'frame-11.png', 49, 70),
  item('jk002.gif', 'frame-11.png', 66, 83),
  item('a1.GIF', 'frame-07.png', 56, 79),
  item('a2.GIF', 'frame-07.png', 56, 79),
  item('a3.GIF', 'frame-07.png', 56, 79),
  item('a4.GIF', 'frame-08.png', 56, 79),
  item('a5.GIF', 'frame-08.png', 56, 79),
  item('a6.GIF', 'frame-08.png', 56, 79),
  item('a7.GIF', 'frame-09.png', 56, 79),
  item('a8.GIF', 'frame-09.png', 56, 79),
  item('a9.GIF', 'frame-09.png', 56, 79),
  item('spa001.gif', 'frame-11.png', 59, 53),
  item('spa002.gif', 'frame-11.png', 67, 60),
  item('spa003.gif', 'frame-11.png', 70, 58),
  item('spec001.gif', 'frame-12.png', 57, 80),
  item('spec002.gif', 'frame-12.png', 57, 80),
  item('spec003.gif', 'frame-12.png', 57, 80),
  item('super001.gif', 'frame-12.png', 66, 80),
  item('super002.gif', 'frame-12.png', 74, 80),
  item('super003.gif', 'frame-12.png', 76, 80),
  item('super004.gif', 'frame-12.png', 68, 80),
  item('head001.gif', 'frame-09.png', 42, 80),
  item('head002.gif', 'frame-09.png', 42, 80),
  item('grab.gif', 'frame-06.png', 42, 80),
  item('grab1.gif', 'frame-06.png', 42, 80),
  item('grab2.gif', 'frame-06.png', 42, 80),
  item('grabup02.GIF', 'frame-09.png', 42, 80),
  item('grabup1.GIF', 'frame-09.png', 42, 80),
  item('grabup2.GIF', 'frame-09.png', 42, 80),
  item('grabx2.GIF', 'frame-10.png', 43, 74),
  item('grabx4.GIF', 'frame-10.png', 40, 70),
  item('fall1.gif', 'frame-14.png', 58, 76),
  item('fall2.gif', 'frame-15.png', 58, 76),
  item('fall3.gif', 'frame-15.png', 60, 48),
  item('fallf1.GIF', 'frame-14.png', 43, 76),
  item('fallr.GIF', 'frame-14.png', 72, 38),
  item('fallx.gif', 'frame-14.png', 60, 57),
  item('fallx1.GIF', 'frame-15.png', 26, 63),
  item('fallx2.GIF', 'frame-15.png', 26, 63),
  item('fallx3.GIF', 'frame-15.png', 60, 48),
  item('pain1.gif', 'frame-13.png', 43, 79),
  item('pain2.GIF', 'frame-13.png', 43, 79),
  item('painx1.GIF', 'frame-13.png', 43, 79),
  item('painx2.GIF', 'frame-13.png', 43, 79),
  item('rise1.GIF', 'frame-10.png', 60, 56),
  item('rise2.GIF', 'frame-10.png', 39, 54),
  item('block.GIF', 'frame-06.png', 56, 79),
  item('block1.GIF', 'frame-06.png', 56, 79),
]);

const CASE_REPLACEMENTS = Object.freeze([
  ['icon.gif', 'icon.GIF', 1],
  ['block.gif', 'block.GIF', 11],
  ['map1.gif', 'map1.GIF', 1],
  ['block1.gif', 'block1.GIF', 1],
  ['fallf1.gif', 'fallf1.GIF', 6],
  ['fallx2.gif', 'fallx2.GIF', 7],
  ['fallx3.gif', 'fallx3.GIF', 6],
  ['pain2.gif', 'pain2.GIF', 29],
  ['jump001.GIF', 'jump001.gif', 3],
  ['jump002.GIF', 'jump002.gif', 1],
  ['idle002.GIF', 'idle002.gif', 1],
  ['x1.GIF', 'x1.gif', 3],
  ['x2.GIF', 'x2.gif', 6],
  ['grabup1.gif', 'grabup1.GIF', 11],
  ['grabup2.gif', 'grabup2.GIF', 9],
  ['grabx2.gif', 'grabx2.GIF', 3],
  ['grabx4.gif', 'grabx4.GIF', 3],
  ['grabup02.gif', 'grabup02.GIF', 9],
  ['painx2.gif', 'painx2.GIF', 4],
  ['painx1.gif', 'painx1.GIF', 4],
  ['rise2.gif', 'rise2.GIF', 2],
  ['rise1.gif', 'rise1.GIF', 2],
  ['fallx1.gif', 'fallx1.GIF', 2],
]);

const SHARED_FX = Object.freeze([
  'chars/misc/black/blackg.gif',
  ...Array.from({ length: 10 }, (_, index) => `chars/misc/dust/${index + 1}.gif`),
  ...Array.from({ length: 13 }, (_, index) => `chars/misc/dust2/${index + 1}.gif`),
  ...Array.from({ length: 9 }, (_, index) => `chars/misc/flash/c${index + 1}.gif`),
]);

function usage() {
  return `Build local-only Guanyu red crescent-warrior P0 engineering coverage.

Usage:
  node scripts/build-guanyu-p0-prototype.mjs [options]

Options:
  --source-dir PATH       normalized 16-key-pose PNG directory
  --selection-source PATH private five-robot selection source for icon/profiles
  --data-dir PATH         extracted OpenBOR data directory
  --output-dir PATH       overlay root; data/... is appended
  --sprite-height N       requested standing height (default: 90)
  --help                  show this help

Outputs 65 Guanyu physical GIFs, two HUD profiles, 33 shared FX palette-key
normalizations, guanyu.txt case fixes and the models.txt Bflash path fix.
g1..g16 weapon/mount/water variants are explicitly outside this P0 scope.`;
}

function parseArgs(argv) {
  const options = {
    sourceDir: join(REPO_ROOT, 'private_assets/robot_wof/guanyu/keyposes'),
    selectionSource: join(REPO_ROOT, 'private_assets/robot_wof/ui/five-robot-selection-screen-v1.png'),
    dataDir: join(REPO_ROOT, 'workplace/extracted/data'),
    outputDir: join(REPO_ROOT, 'workplace/robot_wof_vertical_slice/overlay'),
    spriteHeight: DEFAULT_SPRITE_HEIGHT,
  };
  const keys = {
    '--source-dir': 'sourceDir',
    '--selection-source': 'selectionSource',
    '--data-dir': 'dataDir',
    '--output-dir': 'outputDir',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') {
      console.log(usage());
      process.exit(0);
    }
    const value = argv[index + 1];
    if (keys[argument]) {
      if (!value) throw new Error(`${argument} requires a path`);
      options[keys[argument]] = resolve(value);
      index += 1;
      continue;
    }
    if (argument === '--sprite-height') {
      if (!value || !/^\d+$/.test(value)) throw new Error('--sprite-height requires an integer');
      options.spriteHeight = Number(value);
      if (options.spriteHeight < 56 || options.spriteHeight > 128) {
        throw new Error('--sprite-height must be between 56 and 128');
      }
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }
  const extractedRoot = resolve(REPO_ROOT, 'workplace/extracted');
  if (options.outputDir === extractedRoot || options.outputDir.startsWith(`${extractedRoot}/`)) {
    throw new Error('Refusing to write inside workplace/extracted');
  }
  return options;
}

function requireCommand(binary) {
  const result = spawnSync(binary, ['-version'], { encoding: 'utf8' });
  if (result.error && result.status === null) throw result.error;
  if (result.status !== 0) throw new Error(`${binary} is required`);
}

function displayPath(path) {
  const result = relative(REPO_ROOT, path);
  return result && !result.startsWith('..') ? result.replaceAll('\\', '/') : `local-only/${basename(path)}`;
}

function replaceExact(text, from, to, expected, label) {
  const count = text.split(from).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected} occurrences of ${from}, found ${count}`);
  return text.replaceAll(from, to);
}

function buildGif(mapping, options, outputSpriteDir, tempDir) {
  const sourcePath = join(options.sourceDir, mapping.source);
  const originalPath = join(options.dataDir, 'chars/guanyu', mapping.output);
  if (!existsSync(sourcePath)) throw new Error(`Missing key pose: ${sourcePath}`);
  if (!existsSync(originalPath)) throw new Error(`Missing original target: ${originalPath}`);
  const image = probeImage(originalPath);
  const target = { originalPath, canvas: { width: image.width, height: image.height }, offset: mapping.offset };
  const pose = analyzePose(sourcePath);
  const composedPath = join(tempDir, `${mapping.output}.png`);
  const placement = makeComposedPng(
    sourcePath,
    composedPath,
    pose,
    target,
    mapping.spriteHeight ?? options.spriteHeight,
    mapping,
    true,
  );
  const paletteDir = join(tempDir, `${mapping.output}-palette`);
  mkdirSync(paletteDir, { recursive: true });
  const { pixels, bgraPalette } = palettizeWithFfmpeg(composedPath, image.width, image.height, paletteDir);
  const ffmpegChromaIndex = forceChromaAtIndexZero(pixels, bgraPalette);
  const outputPath = join(outputSpriteDir, mapping.output);
  writeFileSync(outputPath, encodeGif(image.width, image.height, pixels, bgraPalette));
  const verification = verifyGif(outputPath, image.width, image.height);
  console.log(`built ${mapping.output} ${image.width}x${image.height}`);
  return {
    output: displayPath(outputPath),
    source: displayPath(sourcePath),
    targetCanvas: target.canvas,
    targetOffset: target.offset,
    sourceAnalysis: pose,
    placement,
    prototypePoseReuse: MAIN_MAPPING.filter((candidate) => candidate.source === mapping.source).length > 1,
    palette: { ffmpegChromaIndexBeforeRemap: ffmpegChromaIndex, ...verification },
  };
}

function buildOpaqueUi(options, outputPath, mirror, tempDir) {
  const target = {
    id: basename(outputPath),
    filter: `crop=215:332:65:55,scale=35:54:flags=neighbor${mirror ? ',hflip' : ''}`,
  };
  const pngPath = join(tempDir, `${basename(outputPath)}.png`);
  renderPng(options.selectionSource, pngPath, target);
  const paletteDir = join(tempDir, `${basename(outputPath)}-palette`);
  mkdirSync(paletteDir, { recursive: true });
  const { pixels, bgraPalette, injectedChromaIndex } = palettizeOpaque(pngPath, 35, 54, paletteDir);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, encodeGif(35, 54, pixels, bgraPalette));
  const verification = verifyGif(outputPath, 35, 54);
  console.log(`built ${displayPath(outputPath)} opaque UI`);
  return {
    output: displayPath(outputPath),
    source: displayPath(options.selectionSource),
    targetCanvas: { width: 35, height: 54 },
    sourceFilter: target.filter,
    palette: { injectedChromaIndex, index0UsedByPixels: false, ...verification },
  };
}

function skipSubBlocks(bytes, start) {
  let offset = start;
  while (true) {
    if (offset >= bytes.length) throw new Error('Truncated GIF sub-block');
    const size = bytes[offset];
    offset += 1;
    if (size === 0) return offset;
    offset += size;
  }
}

function normalizeGifPaletteZero(sourcePath, outputPath) {
  const bytes = Buffer.from(readFileSync(sourcePath));
  const signature = bytes.subarray(0, 6).toString('ascii');
  if (signature !== 'GIF87a' && signature !== 'GIF89a') throw new Error(`Invalid GIF: ${sourcePath}`);
  let offset = 13;
  const packed = bytes[10];
  if (packed & 0x80) {
    bytes[13] = CHROMA.r;
    bytes[14] = CHROMA.g;
    bytes[15] = CHROMA.b;
    offset += 3 * (2 ** ((packed & 7) + 1));
  }
  while (offset < bytes.length && bytes[offset] !== 0x3b) {
    if (bytes[offset] === 0x21) {
      const label = bytes[offset + 1];
      if (label === 0xf9) offset += 8;
      else offset = skipSubBlocks(bytes, offset + 2);
      continue;
    }
    if (bytes[offset] !== 0x2c) throw new Error(`Unexpected GIF marker in ${sourcePath}`);
    const localPacked = bytes[offset + 9];
    offset += 10;
    if (localPacked & 0x80) {
      bytes[offset] = CHROMA.r;
      bytes[offset + 1] = CHROMA.g;
      bytes[offset + 2] = CHROMA.b;
      offset += 3 * (2 ** ((localPacked & 7) + 1));
    }
    offset = skipSubBlocks(bytes, offset + 1);
  }
  const image = probeImage(sourcePath);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, bytes);
  const verification = verifyGif(outputPath, image.width, image.height);
  return { source: displayPath(sourcePath), output: displayPath(outputPath), ...verification };
}

function writeModelOverlays(options) {
  const sourceGuanyu = join(options.dataDir, 'chars/guanyu/guanyu.txt');
  let guanyu = readFileSync(sourceGuanyu, 'utf8').replaceAll('\\', '/');
  for (const [from, to, count] of CASE_REPLACEMENTS) {
    guanyu = replaceExact(
      guanyu,
      `data/chars/guanyu/${from}`,
      `data/chars/guanyu/${to}`,
      count,
      'guanyu.txt case debt',
    );
  }
  const guanyuOutput = join(options.outputDir, 'data/chars/guanyu/guanyu.txt');
  mkdirSync(dirname(guanyuOutput), { recursive: true });
  writeFileSync(guanyuOutput, guanyu);

  const sourceModels = join(options.dataDir, 'models.txt');
  let models = readFileSync(sourceModels, 'utf8');
  models = replaceExact(
    models,
    'data/chars/misc/flash/Bflash.txt',
    'data/chars/misc/flash/bflash.txt',
    1,
    'models.txt Bflash path',
  );
  const modelsOutput = join(options.outputDir, 'data/models.txt');
  mkdirSync(dirname(modelsOutput), { recursive: true });
  writeFileSync(modelsOutput, models);
  return [
    { source: displayPath(sourceGuanyu), output: displayPath(guanyuOutput), normalizedGifSpellings: 23 },
    { source: displayPath(sourceModels), output: displayPath(modelsOutput), normalizedModelPaths: 1 },
  ];
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  requireCommand('ffmpeg');
  requireCommand('ffprobe');
  if (MAIN_MAPPING.length !== 62) throw new Error(`Expected 62 generated main frames, got ${MAIN_MAPPING.length}`);
  if (!existsSync(options.selectionSource)) throw new Error(`Missing selection source: ${options.selectionSource}`);
  const outputSpriteDir = join(options.outputDir, 'data/chars/guanyu');
  mkdirSync(outputSpriteDir, { recursive: true });
  const tempDir = mkdtempSync(join(tmpdir(), 'guanyu-p0-'));
  try {
    const frames = MAIN_MAPPING.map((mapping) => buildGif(mapping, options, outputSpriteDir, tempDir));
    const icon = buildOpaqueUi(options, join(outputSpriteDir, 'icon.GIF'), false, tempDir);
    frames.push(icon);

    const palettes = [
      ['map1.GIF', 'idle001.gif'],
      ['red.gif', 'a4.GIF'],
    ].map(([output, source]) => {
      const outputPath = join(outputSpriteDir, output);
      copyFileSync(join(outputSpriteDir, source), outputPath);
      const original = probeImage(join(options.dataDir, 'chars/guanyu', output));
      const verification = verifyGif(outputPath, original.width, original.height);
      console.log(`built ${output} identity palette from ${source}`);
      return { output: displayPath(outputPath), source: displayPath(join(outputSpriteDir, source)), identityPalettePrototype: true, palette: verification };
    });
    frames.push(...palettes);

    const profiles = [
      buildOpaqueUi(options, join(options.outputDir, 'data/profiles/guanyu.GIF'), false, tempDir),
      buildOpaqueUi(options, join(options.outputDir, 'data/profiles/guanyu_m.GIF'), true, tempDir),
    ];

    const normalizedSharedFx = SHARED_FX.map((path) => normalizeGifPaletteZero(
      join(options.dataDir, path),
      join(options.outputDir, 'data', path),
    ));
    const models = writeModelOverlays(options);
    const clamped = frames.filter((frame) => frame.placement?.alignmentClamped).length;
    const manifest = {
      schemaVersion: 1,
      status: 'local-private-engineering-prototype',
      productionReady: false,
      warning: '65 physical Guanyu GIFs reuse 16 key poses. g1..g16 mount, weapon and water variants remain outside P0 and are required for full gameplay completion.',
      generatedAt: new Date().toISOString(),
      scope: {
        guanyuPhysicalGif: frames.length,
        hudProfiles: profiles.length,
        sharedFxPaletteNormalizations: normalizedSharedFx.length,
        modelTxt: models.length,
        totalOverlayFiles: frames.length + profiles.length + normalizedSharedFx.length + models.length,
        clampedPlacements: clamped,
      },
      chromaKey: { ...CHROMA, requiredPaletteIndex: 0 },
      inputs: { sourceDir: displayPath(options.sourceDir), selectionSource: displayPath(options.selectionSource), dataDir: displayPath(options.dataDir) },
      frames,
      profiles,
      normalizedSharedFx,
      models,
      deferred: {
        variants: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11', 'g12', 'g13', 'g14', 'g15', 'g16'],
        localHumanGoreHitflashModels: ['g1', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11'],
        audioQa: ['data/sounds/playerdie.wav'],
      },
    };
    const manifestPath = join(options.outputDir, 'GUANYU-P0-BUILD-MANIFEST.json');
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`manifest ${displayPath(manifestPath)}`);
    console.log(`Guanyu P0 complete: ${frames.length} main GIF + ${profiles.length} profiles + ${normalizedSharedFx.length} FX + ${models.length} TXT`);
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
