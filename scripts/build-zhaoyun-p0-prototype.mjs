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
import { normalizeGifPaletteZero } from './build-guanyu-p0-prototype.mjs';
import { palettizeOpaque, renderPng } from './build-five-robot-selection-p0-prototype.mjs';
import { assertExistingPaths, repoRelativeDisplay } from './path-guards.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const DEFAULT_SPRITE_HEIGHT = 108;

const PIVOTS = Object.freeze({
  'frame-01.png': { x: 122, y: 127 },
  'frame-02.png': { x: 78, y: 269 },
  'frame-03.png': { x: 123, y: 245 },
  'frame-04.png': { x: 85, y: 245 },
  'frame-05.png': { x: 108, y: 241 },
  'frame-06.png': { x: 90, y: 264 },
  'frame-07.png': { x: 110, y: 224 },
  'frame-08.png': { x: 200, y: 191 },
  'frame-09.png': { x: 118, y: 252 },
  'frame-10.png': { x: 90, y: 141 },
  'frame-11.png': { x: 84, y: 137 },
  'frame-12.png': { x: 151, y: 221 },
  'frame-13.png': { x: 123, y: 260 },
  'frame-14.png': { x: 137, y: 157 },
  'frame-15.png': { x: 212, y: 73 },
  'frame-16.png': { x: 156, y: 120 },
});

function item(output, source, x = 96, y = 123, extra = {}) {
  return { output, source, offset: { x, y }, sourceAnchor: PIVOTS[source], ...extra };
}

const MAIN_MAPPING = Object.freeze([
  item('idle1.GIF', 'frame-03.png'),
  item('win1.GIF', 'frame-09.png'),
  item('win2.GIF', 'frame-03.png'),
  ...Array.from({ length: 8 }, (_, index) => item(`walk${index + 1}.gif`, index % 2 ? 'frame-05.png' : 'frame-04.png', 70, 128, { spriteHeight: 112 })),
  item('ch01.GIF', 'frame-04.png'), item('ch02.GIF', 'frame-05.png'),
  item('attack1.GIF', 'frame-07.png'), item('attack2.GIF', 'frame-08.png'), item('attack3.GIF', 'frame-03.png'),
  item('attack4.GIF', 'frame-07.png'), item('attack5.GIF', 'frame-08.png'), item('attack6.GIF', 'frame-09.png', 80, 123),
  item('attack7.GIF', 'frame-07.png', 73, 119), item('attack8.GIF', 'frame-08.png', 73, 119), item('attack9.GIF', 'frame-09.png', 73, 119),
  item('attack10.GIF', 'frame-08.png', 73, 119), item('attack11.GIF', 'frame-09.png', 73, 119), item('attack12.GIF', 'frame-07.png', 73, 119), item('attack13.GIF', 'frame-03.png', 73, 119),
  item('c1.GIF', 'frame-12.png'), item('c2.GIF', 'frame-09.png'), item('c3.GIF', 'frame-12.png'),
  item('c4.GIF', 'frame-08.png'), item('c5.GIF', 'frame-12.png'), item('c6.GIF', 'frame-09.png'),
  item('c7.GIF', 'frame-12.png'), item('c8.GIF', 'frame-08.png'), item('c9.GIF', 'frame-12.png'),
  item('ch1.GIF', 'frame-07.png'), item('ch2.GIF', 'frame-08.png'), item('ch3.GIF', 'frame-04.png'), item('ch4.GIF', 'frame-05.png'),
  item('sp1.GIF', 'frame-10.png'), item('sp2.GIF', 'frame-11.png'), item('sp3.GIF', 'frame-12.png'), item('sp4.GIF', 'frame-03.png'),
  item('spa1.GIF', 'frame-09.png', 77, 121), item('spa2.GIF', 'frame-12.png', 77, 121), item('spa3.GIF', 'frame-11.png', 77, 121), item('spa4.GIF', 'frame-03.png', 77, 121),
  item('x0.GIF', 'frame-12.png'), item('x1.GIF', 'frame-09.png', 77, 121), item('x2.GIF', 'frame-08.png', 77, 121), item('x3.GIF', 'frame-11.png', 77, 121), item('x4.GIF', 'frame-03.png', 77, 121),
  item('jump1.GIF', 'frame-10.png'), item('jump2.GIF', 'frame-10.png'), item('jump3.GIF', 'frame-11.png'),
  item('jumpa1.GIF', 'frame-11.png'), item('jumpa2.GIF', 'frame-11.png'), item('jumpf1.GIF', 'frame-11.png'), item('jumpf2.GIF', 'frame-10.png'), item('kong.GIF', 'frame-11.png', 78, 118),
  item('grab.GIF', 'frame-06.png'), item('graba1.GIF', 'frame-07.png'), item('graba2.GIF', 'frame-08.png'), item('graba3.GIF', 'frame-09.png'),
  item('pain1.GIF', 'frame-13.png'), item('pain2.GIF', 'frame-13.png'), item('painx1.GIF', 'frame-13.png'), item('painx2.GIF', 'frame-13.png'),
  item('fall1.GIF', 'frame-14.png', 100, 135), item('fall2.GIF', 'frame-15.png', 97, 110), item('fall3.GIF', 'frame-15.png'), item('fall4.GIF', 'frame-10.png'),
  item('fallf1.GIF', 'frame-14.png', 83, 78), item('fallr.GIF', 'frame-14.png', 111, 102), item('fallx.GIF', 'frame-14.png', 93, 98),
  item('fallx1.GIF', 'frame-15.png', 83, 78), item('fallx2.GIF', 'frame-15.png', 97, 110), item('fallx3.GIF', 'frame-15.png'),
  item('block.GIF', 'frame-06.png'), item('block1.GIF', 'frame-03.png'),
]);

const CASE_REPLACEMENTS = Object.freeze([
  ['icon.gif', 'icon.GIF', 1], ['block.gif', 'block.GIF', 10], ['block1.gif', 'block1.GIF', 1],
  ['fallf1.gif', 'fallf1.GIF', 6], ['fallx2.gif', 'fallx2.GIF', 6], ['fall2.gif', 'fall2.GIF', 3],
  ['fallx3.gif', 'fallx3.GIF', 6], ['fall3.gif', 'fall3.GIF', 6],
  ...Array.from({ length: 8 }, (_, index) => [`walk${index + 1}.GIF`, `walk${index + 1}.gif`, 5]),
  ['pain2.gif', 'pain2.GIF', 10], ['painx2.gif', 'painx2.GIF', 4], ['pain1.gif', 'pain1.GIF', 11],
  ['painx1.gif', 'painx1.GIF', 4], ['fallx1.gif', 'fallx1.GIF', 3],
]);

const SHARED_FX = Object.freeze([
  'chars/misc/black/blacky.GIF',
  ...Array.from({ length: 24 }, (_, index) => `chars/misc/flash/1/${String(862 + index).padStart(4, '0')}.gif`),
  ...Array.from({ length: 10 }, (_, index) => `chars/misc/dust/${index + 1}.gif`),
  ...Array.from({ length: 13 }, (_, index) => `chars/misc/dust2/${index + 1}.gif`),
  ...Array.from({ length: 9 }, (_, index) => `chars/misc/flash/c${index + 1}.gif`),
]);

function usage() {
  return `Build local-only Zhao Yun Violet Synapse Lancer P0 engineering coverage.

Usage:
  node scripts/build-zhaoyun-p0-prototype.mjs [options]

Options:
  --source-dir PATH       normalized 16-key-pose PNG directory
  --selection-source PATH private five-robot selection source for icon/profiles
  --data-dir PATH         extracted OpenBOR data directory
  --output-dir PATH       overlay root; data/... is appended
  --sprite-height N       requested standing height (default: 108)
  --help                  show this help

Outputs 82 Zhao Yun physical GIFs, two HUD profiles, 57 shared FX palette-key
normalizations, model/TXT and Linux script-case fixes. y1..y16 variants remain deferred.`;
}

function parseArgs(argv) {
  const options = {
    sourceDir: join(REPO_ROOT, 'private_assets/robot_wof/zhaoyun/keyposes'),
    selectionSource: join(REPO_ROOT, 'private_assets/robot_wof/ui/five-robot-selection-screen-v1.png'),
    dataDir: join(REPO_ROOT, 'workplace/extracted/data'),
    outputDir: join(REPO_ROOT, 'workplace/robot_wof_vertical_slice/overlay'),
    spriteHeight: DEFAULT_SPRITE_HEIGHT,
  };
  const keys = { '--source-dir': 'sourceDir', '--selection-source': 'selectionSource', '--data-dir': 'dataDir', '--output-dir': 'outputDir' };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') { console.log(usage()); process.exit(0); }
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
      if (options.spriteHeight < 64 || options.spriteHeight > 128) throw new Error('--sprite-height must be between 64 and 128');
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }
  const extractedRoot = resolve(REPO_ROOT, 'workplace/extracted');
  if (options.outputDir === extractedRoot || options.outputDir.startsWith(`${extractedRoot}/`)) throw new Error('Refusing to write inside workplace/extracted');
  assertExistingPaths([
    {
      path: options.sourceDir,
      pathLabel: 'Zhaoyun source directory',
      display: repoRelativeDisplay(REPO_ROOT, options.sourceDir),
      hint: 'This repository does not ship the private source assets; pass --source-dir to an external checkout.',
    },
    {
      path: options.selectionSource,
      pathLabel: 'selection source',
      display: repoRelativeDisplay(REPO_ROOT, options.selectionSource),
      hint: 'Pass --selection-source to a generated or checked-out select artwork.',
    },
    {
      path: options.dataDir,
      pathLabel: 'extracted data tree',
      display: repoRelativeDisplay(REPO_ROOT, options.dataDir),
      hint: 'Pass --data-dir to a staged extracted tree.',
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
  return result && !result.startsWith('..') ? result.replaceAll('\\', '/') : `local-only/${basename(path)}`;
}

function replaceExact(text, from, to, expected, label) {
  const count = text.split(from).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected} occurrences of ${from}, found ${count}`);
  return text.replaceAll(from, to);
}

function buildGif(mapping, options, outputSpriteDir, tempDir) {
  const sourcePath = join(options.sourceDir, mapping.source);
  const originalPath = join(options.dataDir, 'chars/zhaoyun', mapping.output);
  if (!existsSync(sourcePath)) throw new Error(`Missing key pose: ${sourcePath}`);
  if (!existsSync(originalPath)) throw new Error(`Missing original target: ${originalPath}`);
  const image = probeImage(originalPath);
  const target = { originalPath, canvas: { width: image.width, height: image.height }, offset: mapping.offset };
  const pose = analyzePose(sourcePath);
  const composedPath = join(tempDir, `${mapping.output}.png`);
  const placement = makeComposedPng(sourcePath, composedPath, pose, target, mapping.spriteHeight ?? options.spriteHeight, mapping, true);
  const paletteDir = join(tempDir, `${mapping.output}-palette`);
  mkdirSync(paletteDir, { recursive: true });
  const { pixels, bgraPalette } = palettizeWithFfmpeg(composedPath, image.width, image.height, paletteDir);
  const ffmpegChromaIndex = forceChromaAtIndexZero(pixels, bgraPalette);
  const outputPath = join(outputSpriteDir, mapping.output);
  writeFileSync(outputPath, encodeGif(image.width, image.height, pixels, bgraPalette));
  const verification = verifyGif(outputPath, image.width, image.height);
  console.log(`built ${mapping.output} ${image.width}x${image.height}`);
  return {
    output: displayPath(outputPath), source: displayPath(sourcePath), targetCanvas: target.canvas, targetOffset: target.offset,
    sourceAnalysis: pose, placement, prototypePoseReuse: MAIN_MAPPING.filter((candidate) => candidate.source === mapping.source).length > 1,
    palette: { ffmpegChromaIndexBeforeRemap: ffmpegChromaIndex, ...verification },
  };
}

function buildOpaqueUi(options, outputPath, mirror, tempDir) {
  const target = { id: basename(outputPath), filter: `crop=215:332:675:55,scale=35:54:flags=neighbor${mirror ? ',hflip' : ''}` };
  const pngPath = join(tempDir, `${basename(outputPath)}.png`);
  renderPng(options.selectionSource, pngPath, target);
  const paletteDir = join(tempDir, `${basename(outputPath)}-palette`);
  mkdirSync(paletteDir, { recursive: true });
  const { pixels, bgraPalette, injectedChromaIndex } = palettizeOpaque(pngPath, 35, 54, paletteDir);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, encodeGif(35, 54, pixels, bgraPalette));
  const verification = verifyGif(outputPath, 35, 54);
  console.log(`built ${displayPath(outputPath)} opaque UI`);
  return { output: displayPath(outputPath), source: displayPath(options.selectionSource), targetCanvas: { width: 35, height: 54 }, sourceFilter: target.filter, palette: { injectedChromaIndex, index0UsedByPixels: false, ...verification } };
}

function writeTextAndScriptOverlays(options) {
  const outputs = [];
  const writeTransformed = (relativePath, transforms) => {
    const source = join(options.dataDir, relativePath);
    let text = readFileSync(source, 'utf8').replaceAll('\\', '/');
    for (const transform of transforms) text = replaceExact(text, ...transform, relativePath);
    const output = join(options.outputDir, 'data', relativePath);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, text);
    outputs.push({ source: displayPath(source), output: displayPath(output), transformations: transforms.length });
  };

  const zhaoyunTransforms = CASE_REPLACEMENTS.map(([from, to, count]) => [`data/chars/zhaoyun/${from}`, `data/chars/zhaoyun/${to}`, count]);
  zhaoyunTransforms.push(['data/chars/weiyan/fall2.gif', 'data/chars/zhaoyun/fall2.GIF', 1]);
  zhaoyunTransforms.push(['\thitflash\tblood1', '\thitflash\tflashb', 5]);
  writeTransformed('chars/zhaoyun/zhaoyun.txt', zhaoyunTransforms);
  writeTransformed('chars/misc/black/blacky.txt', [['data/chars/misc/black/blacky.gif', 'data/chars/misc/black/blacky.GIF', 2]]);
  writeTransformed('models.txt', [
    ['data/chars/misc/flash/2/Flashbb.txt', 'data/chars/misc/flash/2/flashbb.txt', 1],
    ['data/chars/misc/flash/Bflash.txt', 'data/chars/misc/flash/bflash.txt', 1],
  ]);
  writeTransformed('scripts/WOFplayer.c', [
    ['data/scripts/common/spawnbind.c', 'data/scripts/common/SpawnBind.c', 1],
    ['data/scripts/common/trBody.c', 'data/scripts/common/trbody.c', 1],
    ['data/scripts/msg/sendMsg.c', 'data/scripts/msg/sendmsg.c', 1],
  ]);
  writeTransformed('scripts/common/player.c', [['data/scripts/msg/sendMsg.c', 'data/scripts/msg/sendmsg.c', 1]]);
  writeTransformed('scripts/didhit/guanyu.c', [['data/scripts/didhit/HitFX.c', 'data/scripts/didhit/hitfx.c', 1]]);
  return outputs;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  requireCommand('ffmpeg');
  requireCommand('ffprobe');
  if (MAIN_MAPPING.length !== 80) throw new Error(`Expected 80 generated main frames, got ${MAIN_MAPPING.length}`);
  if (!existsSync(options.selectionSource)) throw new Error(`Missing selection source: ${options.selectionSource}`);
  const outputSpriteDir = join(options.outputDir, 'data/chars/zhaoyun');
  mkdirSync(outputSpriteDir, { recursive: true });
  const tempDir = mkdtempSync(join(tmpdir(), 'zhaoyun-p0-'));
  try {
    const frames = MAIN_MAPPING.map((mapping) => buildGif(mapping, options, outputSpriteDir, tempDir));
    frames.push(buildOpaqueUi(options, join(outputSpriteDir, 'icon.GIF'), false, tempDir));
    const redOutput = join(outputSpriteDir, 'red.gif');
    copyFileSync(join(outputSpriteDir, 'idle1.GIF'), redOutput);
    const redOriginal = probeImage(join(options.dataDir, 'chars/zhaoyun/red.gif'));
    const redVerification = verifyGif(redOutput, redOriginal.width, redOriginal.height);
    frames.push({ output: displayPath(redOutput), source: displayPath(join(outputSpriteDir, 'idle1.GIF')), identityPalettePrototype: true, palette: redVerification });
    console.log('built red.gif identity palette from idle1.GIF');

    const profiles = [
      buildOpaqueUi(options, join(options.outputDir, 'data/profiles/zhaoyun.GIF'), false, tempDir),
      buildOpaqueUi(options, join(options.outputDir, 'data/profiles/zhaoyun_m.GIF'), true, tempDir),
    ];
    const normalizedSharedFx = SHARED_FX.map((path) => normalizeGifPaletteZero(join(options.dataDir, path), join(options.outputDir, 'data', path)));
    const textAndScripts = writeTextAndScriptOverlays(options);
    const clamped = frames.filter((frame) => frame.placement?.alignmentClamped).length;
    const manifest = {
      schemaVersion: 1, status: 'local-private-engineering-prototype', productionReady: false,
      warning: '82 physical Zhao Yun GIFs reuse 16 key poses. y1..y16 mount, weapon and water variants remain required for full gameplay completion.',
      generatedAt: new Date().toISOString(),
      scope: {
        zhaoyunPhysicalGif: frames.length, hudProfiles: profiles.length, sharedFxPaletteNormalizations: normalizedSharedFx.length,
        textAndScriptFiles: textAndScripts.length, totalBatchFiles: frames.length + profiles.length + normalizedSharedFx.length + textAndScripts.length,
        clampedPlacements: clamped,
      },
      chromaKey: { ...CHROMA, requiredPaletteIndex: 0 },
      inputs: { sourceDir: displayPath(options.sourceDir), selectionSource: displayPath(options.selectionSource), dataDir: displayPath(options.dataDir) },
      frames, profiles, normalizedSharedFx, textAndScripts,
      behaviorChanges: { humanGoreHitflashRemaps: 5, crossCharacterFallReferenceLocalized: 1, linuxScriptIncludeCaseFixes: 5 },
      deferred: {
        variants: Array.from({ length: 16 }, (_, index) => `y${index + 1}`),
        audioQa: ['data/chars/zhaoyun/sp.wav', 'data/chars/zhangfei/s2.wav', 'data/chars/guanyu/yayaya.wav', 'data/chars/guanyu/playerdie.wav'],
        productionAnimation: ['replace all key-pose reuse with per-frame cleanup', 'gameplay BBox and attack-box review', '2P palette review'],
      },
    };
    const manifestPath = join(options.outputDir, 'ZHAOYUN-P0-BUILD-MANIFEST.json');
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`manifest ${displayPath(manifestPath)}`);
    console.log(`Zhao Yun P0 complete: ${frames.length} main GIF + ${profiles.length} profiles + ${normalizedSharedFx.length} FX + ${textAndScripts.length} TXT/scripts`);
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
