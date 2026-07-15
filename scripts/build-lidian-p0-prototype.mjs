#!/usr/bin/env node

import {
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
import { assertExistingPaths, repoRelativeDisplay } from './path-guards.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const DEFAULT_SPRITE_HEIGHT = 124;

const PIVOTS = Object.freeze({
  'frame-01.png': { x: 127, y: 133 },
  'frame-02.png': { x: 125, y: 284 },
  'frame-03.png': { x: 105, y: 193 },
  'frame-04.png': { x: 93, y: 216 },
  'frame-05.png': { x: 90, y: 179 },
  'frame-06.png': { x: 115, y: 193 },
  'frame-07.png': { x: 112, y: 202 },
  'frame-08.png': { x: 150, y: 227 },
  'frame-09.png': { x: 121, y: 143 },
  'frame-10.png': { x: 169, y: 221 },
  'frame-11.png': { x: 106, y: 213 },
  'frame-12.png': { x: 93, y: 226 },
  'frame-13.png': { x: 121, y: 104 },
  'frame-14.png': { x: 168, y: 121 },
  'frame-15.png': { x: 160, y: 122 },
  'frame-16.png': { x: 119, y: 245 },
});

function item(output, source, offset, extra = {}) {
  return { output, source, offset, sourceAnchor: PIVOTS[source], ...extra };
}

const MAIN_MAPPING = Object.freeze([
  item('icon.GIF', 'frame-01.png', { x: 240, y: 252 }, { spriteHeight: 240 }),
  ...['spawn1.GIF', 'spawn2.GIF', 'spawn3.GIF'].map((output) => item(output, 'frame-02.png', { x: 84, y: 113 })),
  item('idle00.gif', 'frame-03.png', { x: 84, y: 113 }),
  ...['walk2.gif', 'walk3.GIF', 'walk4.GIF', 'walk5.GIF'].map((output) => item(output, 'frame-04.png', { x: 84, y: 113 })),
  item('a1.GIF', 'frame-05.png', { x: 84, y: 111 }),
  item('a2.GIF', 'frame-05.png', { x: 84, y: 111 }),
  item('a3.GIF', 'frame-05.png', { x: 87, y: 111 }),
  item('a4.GIF', 'frame-06.png', { x: 87, y: 111 }),
  item('a5.GIF', 'frame-06.png', { x: 87, y: 111 }),
  item('jump1.gif', 'frame-07.png', { x: 74, y: 114 }),
  item('jump2.gif', 'frame-07.png', { x: 71, y: 99 }),
  item('jump3.gif', 'frame-07.png', { x: 80, y: 116 }),
  item('jump4.gif', 'frame-07.png', { x: 63, y: 103 }),
  item('rise1.GIF', 'frame-07.png', { x: 84, y: 113 }),
  item('c1.GIF', 'frame-08.png', { x: 84, y: 113 }),
  item('c2.GIF', 'frame-08.png', { x: 84, y: 113 }),
  item('c3.GIF', 'frame-08.png', { x: 94, y: 111 }),
  item('c4.GIF', 'frame-08.png', { x: 114, y: 103 }),
  item('c5.GIF', 'frame-08.png', { x: 108, y: 101 }),
  item('c6.GIF', 'frame-09.png', { x: 108, y: 78 }),
  item('c7.GIF', 'frame-09.png', { x: 114, y: 78 }),
  item('c8.GIF', 'frame-09.png', { x: 114, y: 78 }),
  ...['z01.GIF', 'z02.GIF', 'z1.GIF', 'z2.GIF', 'z3.GIF', 'z4.GIF', 'z5.GIF']
    .map((output) => item(output, 'frame-10.png', { x: 84, y: 113 })),
  item('pain1.GIF', 'frame-11.png', { x: 80, y: 113 }),
  item('painx1.GIF', 'frame-11.png', { x: 84, y: 113 }),
  item('pain2.gif', 'frame-12.png', { x: 80, y: 113 }),
  item('painx2.GIF', 'frame-12.png', { x: 84, y: 113 }),
  item('fallx.gif', 'frame-13.png', { x: 50, y: 65 }),
  item('fall1.gif', 'frame-13.png', { x: 84, y: 113 }),
  item('fall2.gif', 'frame-14.png', { x: 36, y: 102 }),
  item('fall3.gif', 'frame-14.png', { x: 84, y: 113 }),
  item('fallr.GIF', 'frame-13.png', { x: 78, y: 89 }),
  item('fallf1.GIF', 'frame-14.png', { x: 84, y: 113 }),
  item('fallx2.GIF', 'frame-14.png', { x: 84, y: 113 }),
  item('fallx3.GIF', 'frame-14.png', { x: 84, y: 113 }),
  item('painx01.GIF', 'frame-15.png', { x: 84, y: 113 }),
  item('death1.GIF', 'frame-15.png', { x: 84, y: 113 }),
  item('death2.GIF', 'frame-15.png', { x: 84, y: 113 }),
  item('fallx01.gif', 'frame-15.png', { x: 84, y: 113 }),
  item('fallx02.gif', 'frame-15.png', { x: 84, y: 113 }),
  item('fallx03.gif', 'frame-15.png', { x: 84, y: 113 }),
]);

const SUBMODEL_MAPPING = Object.freeze([
  item('1/a1.GIF', 'frame-16.png', { x: 27, y: 106 }, { spriteHeight: 48 }),
  item('1/a2.GIF', 'frame-16.png', { x: 45, y: 98 }, { spriteHeight: 48 }),
  item('1/a3.GIF', 'frame-16.png', { x: 45, y: 98 }, { spriteHeight: 48 }),
  item('1/a5.GIF', 'frame-16.png', { x: 48, y: 82 }, { spriteHeight: 48 }),
  item('1/a01.GIF', 'frame-16.png', { x: 27, y: 106 }, { spriteHeight: 48 }),
  item('1/a02.GIF', 'frame-16.png', { x: 45, y: 98 }, { spriteHeight: 48 }),
  item('1/a03.GIF', 'frame-16.png', { x: 45, y: 98 }, { spriteHeight: 48 }),
  item('1/a05.GIF', 'frame-16.png', { x: 48, y: 82 }, { spriteHeight: 48 }),
  item('1/tou.GIF', 'frame-16.png', { x: 20, y: 23 }, { spriteHeight: 18 }),
  ...Array.from({ length: 8 }, (_, index) => (
    item(`2/${index + 1}.GIF`, 'frame-16.png', { x: 20, y: 23 }, { spriteHeight: 18 })
  )),
]);

const MODEL_FILES = Object.freeze([
  'li.txt',
  'lidian.txt',
  '1/lidianxo.txt',
  '1/lidianxs.txt',
  '1/lidianxs1.txt',
  '2/jiubei.txt',
]);

const CASE_REPLACEMENTS = Object.freeze([
  ['li.txt', 'data/chars/boss/lidian/pain1.gif', 'data/chars/boss/lidian/pain1.GIF', 23],
  ['li.txt', 'data/chars/boss/lidian/walk3.gif', 'data/chars/boss/lidian/walk3.GIF', 4],
  ['li.txt', 'data/chars/boss/lidian/walk4.gif', 'data/chars/boss/lidian/walk4.GIF', 4],
  ['li.txt', 'data/chars/boss/lidian/painx2.gif', 'data/chars/boss/lidian/painx2.GIF', 4],
  ['li.txt', 'data/chars/boss/lidian/painx1.gif', 'data/chars/boss/lidian/painx1.GIF', 4],
  ['li.txt', 'data/chars/boss/lidian/fallf1.gif', 'data/chars/boss/lidian/fallf1.GIF', 6],
  ['li.txt', 'data/chars/boss/lidian/fallx2.gif', 'data/chars/boss/lidian/fallx2.GIF', 4],
  ['li.txt', 'data/chars/boss/lidian/fallx3.gif', 'data/chars/boss/lidian/fallx3.GIF', 4],
  ['li.txt', 'data/chars/boss/lidian/pain2.GIF', 'data/chars/boss/lidian/pain2.gif', 5],
  ['li.txt', 'data/chars/boss/lidian/walk5.gif', 'data/chars/boss/lidian/walk5.GIF', 1],
  ['lidian.txt', 'data/chars/boss/lidian/icon.gif', 'data/chars/boss/lidian/icon.GIF', 1],
  ['lidian.txt', 'data/chars/boss/lidian/spawn1.gif', 'data/chars/boss/lidian/spawn1.GIF', 4],
  ['lidian.txt', 'data/chars/boss/lidian/spawn2.gif', 'data/chars/boss/lidian/spawn2.GIF', 4],
  ['lidian.txt', 'data/chars/boss/lidian/spawn3.gif', 'data/chars/boss/lidian/spawn3.GIF', 2],
  ['1/lidianxs.txt', 'data/chars/boss/lidian/1/a1.gif', 'data/chars/boss/lidian/1/a1.GIF', 1],
  ['1/lidianxs.txt', 'data/chars/boss/lidian/1/a2.gif', 'data/chars/boss/lidian/1/a2.GIF', 1],
  ['1/lidianxs.txt', 'data/chars/boss/lidian/1/a3.gif', 'data/chars/boss/lidian/1/a3.GIF', 1],
  ['1/lidianxs1.txt', 'data/chars/boss/lidian/1/a01.gif', 'data/chars/boss/lidian/1/a01.GIF', 1],
  ['1/lidianxs1.txt', 'data/chars/boss/lidian/1/a02.gif', 'data/chars/boss/lidian/1/a02.GIF', 1],
  ['1/lidianxs1.txt', 'data/chars/boss/lidian/1/a03.gif', 'data/chars/boss/lidian/1/a03.GIF', 1],
]);

function usage() {
  return `Build local-only Stage01 Lidian red-spear Boss engineering coverage.

Usage:
  node scripts/build-lidian-p0-prototype.mjs [options]

Options:
  --source-dir PATH     normalized 16-key-pose PNG directory
  --extracted-dir PATH  extracted data/chars/boss/lidian directory
  --output-dir PATH     overlay root; data/chars/boss/lidian is appended
  --sprite-height N     requested standing height (default: 124)
  --help                show this help

Outputs the exact 69-GIF Stage01 closure plus six case-normalized model files.
Human blood and flesh summons are remapped only in the private Lidian overlay.`;
}

function parseArgs(argv) {
  const options = {
    sourceDir: join(REPO_ROOT, 'private_assets/robot_wof/boss/lidian/keyposes'),
    extractedDir: join(REPO_ROOT, 'workplace/extracted/data/chars/boss/lidian'),
    outputDir: join(REPO_ROOT, 'private_assets/robot_wof/lidian-boss-p0-prototype'),
    spriteHeight: DEFAULT_SPRITE_HEIGHT,
  };
  const keys = {
    '--source-dir': 'sourceDir',
    '--extracted-dir': 'extractedDir',
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
      if (options.spriteHeight < 64 || options.spriteHeight > 160) {
        throw new Error('--sprite-height must be between 64 and 160');
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
  assertExistingPaths([
    {
      path: options.sourceDir,
      pathLabel: 'Lidian storyboard source directory',
      display: repoRelativeDisplay(REPO_ROOT, options.sourceDir),
      hint: 'This repository does not ship the private source assets; pass --source-dir to an external checkout.',
    },
    {
      path: options.extractedDir,
      pathLabel: 'extracted Lidian data directory',
      display: repoRelativeDisplay(REPO_ROOT, options.extractedDir),
      hint: 'Pass --extracted-dir to the staged extracted tree that contains data/chars/boss/lidian.',
    },
  ]);
  return options;
}

function requireCommand(binary) {
  const result = spawnSync(binary, ['-version'], { encoding: 'utf8' });
  if (result.error && result.status === null) throw result.error;
  if (result.status !== 0) throw new Error(`${binary} is required`);
}

function displayPath(path) {
  const result = relative(REPO_ROOT, path);
  return result && !result.startsWith('..') ? result.replaceAll('\\', '/') : path;
}

function replaceExact(text, from, to, expected, label) {
  const count = text.split(from).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected} occurrences of ${from}, found ${count}`);
  return text.replaceAll(from, to);
}

function rewriteModelFile(relativePath, extractedDir, outputSpriteDir) {
  const sourcePath = join(extractedDir, relativePath);
  if (!existsSync(sourcePath)) throw new Error(`Missing model file: ${sourcePath}`);
  let text = readFileSync(sourcePath, 'utf8').replaceAll('\\', '/');
  for (const [file, from, to, count] of CASE_REPLACEMENTS) {
    if (file === relativePath) text = replaceExact(text, from, to, count, `${relativePath} case debt`);
  }
  if (relativePath === 'li.txt') {
    text = replaceExact(text, '"blood2"', '"Flashb"', 5, 'li.txt blood2');
    text = replaceExact(text, '"blood1"', '"Flashb"', 5, 'li.txt blood1');
    text = replaceExact(text, '"blood3"', '"Dust"', 5, 'li.txt blood3');
    text = replaceExact(text, '"blood"', '"Dust"', 2, 'li.txt blood');
    text = replaceExact(text, 'hitflash\tblood2', 'hitflash\tflashb', 1, 'li.txt hitflash');
    const humanParts = ['hand', 'meat', 'fei', 'gan', 'chang', 'pi', 'rou'];
    for (const part of humanParts) {
      const expression = new RegExp(`^[ \\t]*@cmd[ \\t]+tosser[ \\t]+"${part}"[^\\r\\n]*(?:\\r?\\n)?`, 'gm');
      const matches = text.match(expression) ?? [];
      if (matches.length !== 1) throw new Error(`li.txt expected one ${part} tosser, found ${matches.length}`);
      text = text.replace(expression, `\t# robot overlay: removed human ${part} tosser\n`);
    }
  }
  const fleshSoundCount = relativePath === 'li.txt'
    ? 2
    : ['1/lidianxo.txt', '1/lidianxs.txt', '1/lidianxs1.txt'].includes(relativePath) ? 1 : 0;
  if (fleshSoundCount) {
    text = replaceExact(text, 'data/sounds/rou.wav', 'data/sounds/land.wav', fleshSoundCount, `${relativePath} flesh sound`);
  }
  const outputPath = join(outputSpriteDir, relativePath);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, text);
  return { source: displayPath(sourcePath), output: displayPath(outputPath) };
}

function buildGif(mapping, options, outputSpriteDir, tempDir) {
  const sourcePath = join(options.sourceDir, mapping.source);
  const originalPath = join(options.extractedDir, mapping.output);
  if (!existsSync(sourcePath)) throw new Error(`Missing key pose: ${sourcePath}`);
  if (!existsSync(originalPath)) throw new Error(`Missing original target: ${originalPath}`);
  const image = probeImage(originalPath);
  const target = {
    originalPath,
    canvas: { width: image.width, height: image.height },
    offset: mapping.offset,
  };
  const pose = analyzePose(sourcePath);
  const composedPath = join(tempDir, `${mapping.output.replaceAll('/', '__')}.png`);
  const placement = makeComposedPng(
    sourcePath,
    composedPath,
    pose,
    target,
    mapping.spriteHeight ?? options.spriteHeight,
    mapping,
    true,
  );
  const { pixels, bgraPalette } = palettizeWithFfmpeg(
    composedPath,
    image.width,
    image.height,
    tempDir,
  );
  const ffmpegChromaIndex = forceChromaAtIndexZero(pixels, bgraPalette);
  const outputPath = join(outputSpriteDir, mapping.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, encodeGif(image.width, image.height, pixels, bgraPalette));
  const verification = verifyGif(outputPath, image.width, image.height);
  console.log(`built ${mapping.output} ${image.width}x${image.height} Offset ${mapping.offset.x},${mapping.offset.y}`);
  return {
    output: displayPath(outputPath),
    source: displayPath(sourcePath),
    targetCanvas: target.canvas,
    targetOffset: target.offset,
    sourceAnalysis: pose,
    placement,
    prototypePoseReuse: [...MAIN_MAPPING, ...SUBMODEL_MAPPING]
      .filter((candidate) => candidate.source === mapping.source).length > 1,
    palette: { ffmpegChromaIndexBeforeRemap: ffmpegChromaIndex, ...verification },
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  requireCommand('ffmpeg');
  requireCommand('ffprobe');
  if (MAIN_MAPPING.length !== 52 || SUBMODEL_MAPPING.length !== 17) {
    throw new Error(`Internal closure mismatch: ${MAIN_MAPPING.length} main + ${SUBMODEL_MAPPING.length} submodel`);
  }
  const outputSpriteDir = join(options.outputDir, 'data/chars/boss/lidian');
  mkdirSync(outputSpriteDir, { recursive: true });
  const tempDir = mkdtempSync(join(tmpdir(), 'lidian-p0-'));
  try {
    const frames = [...MAIN_MAPPING, ...SUBMODEL_MAPPING]
      .map((mapping) => buildGif(mapping, options, outputSpriteDir, tempDir));
    const models = MODEL_FILES.map((path) => rewriteModelFile(path, options.extractedDir, outputSpriteDir));
    const liOverlay = readFileSync(join(outputSpriteDir, 'li.txt'), 'utf8');
    const forbidden = /"(?:blood|blood1|blood2|blood3|hand|meat|fei|gan|chang|pi|rou)"|data\/sounds\/rou\.wav/g;
    if (forbidden.test(liOverlay)) throw new Error('Lidian overlay still contains human gore or flesh sound references');
    for (const entity of ['lidianxo', 'lidianxs', 'lidianxs1']) {
      if (!liOverlay.includes(`"${entity}"`)) throw new Error(`Mechanical debris tosser ${entity} was accidentally removed`);
    }
    const manifest = {
      schemaVersion: 1,
      status: 'local-private-engineering-prototype',
      productionReady: false,
      warning: '69 physical GIFs reuse 16 concept key poses. Artists must redraw every transition before release.',
      generatedAt: new Date().toISOString(),
      scope: { mainGif: MAIN_MAPPING.length, submodelGif: SUBMODEL_MAPPING.length, modelTxt: MODEL_FILES.length },
      chromaKey: { ...CHROMA, requiredPaletteIndex: 0 },
      spriteHeight: options.spriteHeight,
      gorePolicy: {
        scope: 'Lidian overlay only',
        bloodSpawns: 'remapped to Flashb or Dust',
        humanPartTossers: 'removed',
        localMechanicalTossers: ['lidianxo', 'lidianxs', 'lidianxs1'],
        fleshSound: 'data/sounds/rou.wav remapped to data/sounds/land.wav',
      },
      inputs: { sourceDir: displayPath(options.sourceDir), extractedDir: displayPath(options.extractedDir) },
      frames,
      models,
    };
    const manifestPath = join(options.outputDir, 'LIDIAN-P0-BUILD-MANIFEST.json');
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`manifest ${displayPath(manifestPath)}`);
    console.log('Lidian P0 complete: 69 GIF + 6 TXT; extracted inputs were not modified');
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
