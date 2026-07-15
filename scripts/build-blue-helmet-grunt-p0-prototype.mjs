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
import { assertExistingPaths, repoRelativeDisplay } from './path-guards.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const DEFAULT_SPRITE_HEIGHT = 78;

// Engineering coverage only. Reuse is explicit so artists can replace each
// transition without guessing the OpenBOR canvas/Offset contract.
const MAIN_MAPPING = Object.freeze([
  { output: 'idle00.gif', source: 'frame-02.png', animation: 'idle' },
  { output: 'walk001.gif', source: 'frame-03.png', animation: 'walk' },
  { output: 'walk002.gif', source: 'frame-04.png', animation: 'walk' },
  { output: 'walk003.gif', source: 'frame-03.png', animation: 'walk' },
  { output: 'walk004.gif', source: 'frame-04.png', animation: 'walk' },
  { output: 'walk005.gif', source: 'frame-02.png', animation: 'walk' },
  { output: 'a1.gif', source: 'frame-05.png', animation: 'attack1' },
  { output: 'a2.gif', source: 'frame-06.png', animation: 'attack1' },
  { output: 'a5.gif', source: 'frame-06.png', animation: 'attack1' },
  { output: 'a4.gif', source: 'frame-05.png', animation: 'attack2' },
  { output: 'a3.gif', source: 'frame-06.png', animation: 'attack2' },
  { output: 'jk001.gif', source: 'frame-11.png', animation: 'attack3' },
  { output: 'jk002.gif', source: 'frame-11.png', animation: 'attack3' },
  { output: 'jk003.gif', source: 'frame-06.png', animation: 'attack3' },
  { output: 'jk004.gif', source: 'frame-06.png', animation: 'attack3' },
  { output: 'pain1.gif', source: 'frame-08.png', animation: 'death6' },
  { output: 'pain2.gif', source: 'frame-08.png', animation: 'bdie' },
  { output: 'painx1.GIF', modelFile: 'painx1.gif', source: 'frame-08.png', animation: 'follow6' },
  { output: 'painx2.GIF', modelFile: 'painx2.gif', source: 'frame-08.png', animation: 'death10' },
  { output: 'fall1.gif', source: 'frame-09.png', animation: 'death', anchor: 'center-bottom' },
  { output: 'fall2.gif', source: 'frame-09.png', animation: 'death', anchor: 'center-bottom' },
  { output: 'fall3.gif', source: 'frame-10.png', animation: 'death', anchor: 'center-bottom' },
  { output: 'fall72.gif', source: 'frame-09.png', animation: 'fall7', anchor: 'center-bottom' },
  { output: 'fall73.gif', source: 'frame-09.png', animation: 'fall4', anchor: 'center-bottom' },
  { output: 'fallf1.GIF', modelFile: 'fallf1.gif', source: 'frame-09.png', animation: 'follow7', anchor: 'center-bottom' },
  { output: 'fallx02.GIF', modelFile: 'fallx02.gif', source: 'frame-09.png', animation: 'follow7', anchor: 'center-bottom' },
  { output: 'fallx03.GIF', modelFile: 'fallx03.gif', source: 'frame-10.png', animation: 'follow7', anchor: 'center-bottom' },
  { output: 'fallx1.GIF', modelFile: 'fallx1.gif', source: 'frame-09.png', animation: 'death5', anchor: 'center-bottom' },
  { output: 'fallx2.GIF', modelFile: 'fallx2.gif', source: 'frame-09.png', animation: 'death5', anchor: 'center-bottom' },
  { output: 'fallx3.GIF', modelFile: 'fallx3.gif', source: 'frame-12.png', animation: 'death5', anchor: 'center-bottom' },
  { output: 'sp2.GIF', modelFile: 'sp2.gif', source: 'frame-11.png', animation: 'follow2' },
]);

const SUBMODEL_MAPPING = Object.freeze([
  { output: '1/a1.GIF', modelFile: 'a1.gif', source: 'frame-12.png', animation: 'idle', anchor: 'center-bottom' },
  { output: '1/a2.GIF', modelFile: 'a2.gif', source: 'frame-12.png', animation: 'idle', anchor: 'center-bottom' },
  { output: '1/a3.GIF', modelFile: 'a3.gif', source: 'frame-12.png', animation: 'idle', anchor: 'center-bottom' },
]);

function usage() {
  return `Build local-only Stage01 blue-helmet grunt engineering coverage.

Usage:
  node scripts/build-blue-helmet-grunt-p0-prototype.mjs [options]

Options:
  --source-dir PATH     normalized 12-key-pose PNG directory
  --extracted-dir PATH  extracted data/chars/army/1 directory
  --output-dir PATH     overlay root; data/chars/army/1 is appended
  --sprite-height N     requested standing height (default: 78)
  --help                show this help

Outputs 38 main assets plus four bingxs assets, identity alternate palettes,
24x36 icon, and a private bing.txt overlay that removes human blood summons.`;
}

function parseArgs(argv) {
  const options = {
    sourceDir: join(REPO_ROOT, 'private_assets/robot_wof/enemy/blue-helmet-grunt/keyposes'),
    extractedDir: join(REPO_ROOT, 'workplace/extracted/data/chars/army/1'),
    outputDir: join(REPO_ROOT, 'private_assets/robot_wof/blue-helmet-grunt-p0-prototype'),
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
      if (options.spriteHeight < 32 || options.spriteHeight > 128) {
        throw new Error('--sprite-height must be between 32 and 128');
      }
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }
  if (options.outputDir === options.extractedDir || options.outputDir.startsWith(`${options.extractedDir}/`)) {
    throw new Error('Refusing to write inside extracted input');
  }
  assertExistingPaths([
    {
      path: options.sourceDir,
      pathLabel: 'blue-helmet source directory',
      display: repoRelativeDisplay(REPO_ROOT, options.sourceDir),
      hint: 'This repository does not ship the private source assets; pass --source-dir to an external checkout.',
    },
    {
      path: options.extractedDir,
      pathLabel: 'blue-helmet extracted directory',
      display: repoRelativeDisplay(REPO_ROOT, options.extractedDir),
      hint: 'Pass --extracted-dir to the staged extracted tree that contains data/chars/army/1.',
    },
  ]);
  return options;
}

function requireCommand(binary) {
  const result = spawnSync(binary, ['-version'], { encoding: 'utf8' });
  if (result.error && result.status === null) throw result.error;
  if (result.status !== 0) throw new Error(`${binary} is required`);
}

function parseModelFrames(modelPath) {
  const records = [];
  let animation = null;
  let offset = null;
  for (const rawLine of readFileSync(modelPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const fields = line.split(/\s+/);
    const command = fields[0].toLowerCase();
    if (command === 'anim') {
      animation = fields[1]?.toLowerCase() ?? null;
      offset = null;
    } else if (command === 'offset') {
      offset = { x: Number(fields[1]), y: Number(fields[2]) };
    } else if (command === 'frame' && fields[1]?.toLowerCase() !== 'none') {
      records.push({
        animation,
        offset,
        file: basename(fields[1].replaceAll('\\', '/')).toLowerCase(),
      });
    }
  }
  return records;
}

function targetFor(extractedDir, records, mapping) {
  const modelFile = (mapping.modelFile ?? basename(mapping.output)).toLowerCase();
  const record = records.find((candidate) => (
    candidate.animation === mapping.animation && candidate.file === modelFile
  ));
  if (!record?.offset) {
    throw new Error(`Missing ${mapping.animation} Offset for ${modelFile}`);
  }
  const originalPath = join(extractedDir, mapping.output);
  if (!existsSync(originalPath)) throw new Error(`Missing original target: ${originalPath}`);
  const image = probeImage(originalPath);
  return {
    originalPath,
    canvas: { width: image.width, height: image.height },
    offset: record.offset,
  };
}

function displayPath(path) {
  const result = relative(REPO_ROOT, path);
  return result && !result.startsWith('..') ? result.replaceAll('\\', '/') : path;
}

function buildGif({ mapping, sourceDir, extractedDir, outputSpriteDir, records, tempDir, spriteHeight }) {
  const sourcePath = join(sourceDir, mapping.source);
  if (!existsSync(sourcePath)) throw new Error(`Missing key pose: ${sourcePath}`);
  const target = targetFor(extractedDir, records, mapping);
  const outputPath = join(outputSpriteDir, mapping.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  const pose = analyzePose(sourcePath);
  const tempName = mapping.output.replaceAll('/', '__').replaceAll('\\', '__');
  const composedPath = join(tempDir, `${tempName}.png`);
  const placement = makeComposedPng(
    sourcePath,
    composedPath,
    pose,
    target,
    mapping.spriteHeight ?? spriteHeight,
    mapping,
    true,
  );
  const { pixels, bgraPalette } = palettizeWithFfmpeg(
    composedPath,
    target.canvas.width,
    target.canvas.height,
    tempDir,
  );
  const ffmpegChromaIndex = forceChromaAtIndexZero(pixels, bgraPalette);
  writeFileSync(outputPath, encodeGif(target.canvas.width, target.canvas.height, pixels, bgraPalette));
  const verification = verifyGif(outputPath, target.canvas.width, target.canvas.height);
  console.log(`built ${mapping.output} ${target.canvas.width}x${target.canvas.height}`);
  return {
    output: displayPath(outputPath),
    source: displayPath(sourcePath),
    animation: mapping.animation,
    modelReference: mapping.modelFile ?? basename(mapping.output),
    sourceAnalysis: pose,
    targetCanvas: target.canvas,
    targetOffset: target.offset,
    placement,
    palette: { ffmpegChromaIndexBeforeRemap: ffmpegChromaIndex, ...verification },
  };
}

function buildIcon(sourceDir, extractedDir, outputSpriteDir, tempDir) {
  const mapping = {
    output: 'icon.GIF',
    source: 'frame-01.png',
    animation: 'icon',
    anchor: 'center-bottom',
    spriteHeight: 28,
  };
  const sourcePath = join(sourceDir, mapping.source);
  const originalPath = join(extractedDir, mapping.output);
  const image = probeImage(originalPath);
  const target = {
    originalPath,
    canvas: { width: image.width, height: image.height },
    offset: { x: Math.floor(image.width / 2), y: image.height - 4 },
  };
  const pose = analyzePose(sourcePath);
  const composedPath = join(tempDir, 'icon.GIF.png');
  const placement = makeComposedPng(sourcePath, composedPath, pose, target, 28, mapping, true);
  const { pixels, bgraPalette } = palettizeWithFfmpeg(composedPath, image.width, image.height, tempDir);
  const ffmpegChromaIndex = forceChromaAtIndexZero(pixels, bgraPalette);
  const outputPath = join(outputSpriteDir, mapping.output);
  writeFileSync(outputPath, encodeGif(image.width, image.height, pixels, bgraPalette));
  const verification = verifyGif(outputPath, image.width, image.height);
  console.log(`built ${mapping.output} ${image.width}x${image.height}`);
  return {
    output: displayPath(outputPath),
    source: displayPath(sourcePath),
    animation: 'icon',
    targetCanvas: target.canvas,
    targetOffset: target.offset,
    sourceAnalysis: pose,
    placement,
    palette: { ffmpegChromaIndexBeforeRemap: ffmpegChromaIndex, ...verification },
  };
}

function buildBlankOnePixel(outputPath) {
  const pixels = Buffer.from([0]);
  const palette = Buffer.alloc(256 * 4);
  palette[0] = CHROMA.b;
  palette[1] = CHROMA.g;
  palette[2] = CHROMA.r;
  palette[3] = 255;
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, encodeGif(1, 1, pixels, palette));
  return verifyGif(outputPath, 1, 1);
}

function writeMechanicalModelOverlay(sourcePath, outputPath) {
  const caseMap = new Map([
    ['icon.gif', 'icon.GIF'],
    ['painx1.gif', 'painx1.GIF'],
    ['painx2.gif', 'painx2.GIF'],
    ['fallf1.gif', 'fallf1.GIF'],
    ['fallx02.gif', 'fallx02.GIF'],
    ['fallx03.gif', 'fallx03.GIF'],
    ['fallx1.gif', 'fallx1.GIF'],
    ['fallx2.gif', 'fallx2.GIF'],
    ['fallx3.gif', 'fallx3.GIF'],
    ['sp2.gif', 'sp2.GIF'],
  ]);
  const lines = readFileSync(sourcePath, 'utf8').split(/\r?\n/);
  const replaced = lines.map((line) => {
    if (/^\s*@cmd\s+spawn01\s+"blood/i.test(line)) {
      return `# robot-wof: removed human gore command: ${line.trim()}`;
    }
    if (/^\s*@cmd\s+tosser\s+"quans"/i.test(line)) {
      return line.replace(/"quans"/i, '"bingxs"');
    }
    let normalized = line;
    for (const [from, to] of caseMap) normalized = normalized.replaceAll(from, to);
    return normalized;
  });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${replaced.join('\n')}\n`);
  return {
    removedHumanBloodCommands: lines.filter((line) => /^\s*@cmd\s+spawn01\s+"blood/i.test(line)).length,
    replacedHumanDebrisCommands: lines.filter((line) => /^\s*@cmd\s+tosser\s+"quans"/i.test(line)).length,
    normalizedImageReferences: [...caseMap].filter(([from]) => lines.some((line) => line.includes(from))).length,
  };
}

function writeSubmodelOverlay(sourcePath, outputPath) {
  const lines = readFileSync(sourcePath, 'utf8').split(/\r?\n/);
  const replaced = lines.map((line) => line.replace(
    /(data\/chars\/army\/1\/1\/a[1-4])\.gif/gi,
    '$1.GIF',
  ));
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${replaced.join('\n')}\n`);
  return lines.filter((line, index) => line !== replaced[index]).length;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  requireCommand('ffmpeg');
  requireCommand('ffprobe');
  const mainModel = join(options.extractedDir, 'bing.txt');
  const subModel = join(options.extractedDir, '1/bingxs.txt');
  if (!existsSync(mainModel) || !existsSync(subModel)) throw new Error('Missing bing model input');
  const outputSpriteDir = join(options.outputDir, 'data/chars/army/1');
  mkdirSync(outputSpriteDir, { recursive: true });
  const tempDir = mkdtempSync(join(tmpdir(), 'blue-helmet-grunt-p0-'));
  const frames = [];

  try {
    const mainRecords = parseModelFrames(mainModel);
    for (const mapping of MAIN_MAPPING) {
      frames.push(buildGif({
        mapping,
        sourceDir: options.sourceDir,
        extractedDir: options.extractedDir,
        outputSpriteDir,
        records: mainRecords,
        tempDir,
        spriteHeight: options.spriteHeight,
      }));
    }

    frames.push(buildIcon(options.sourceDir, options.extractedDir, outputSpriteDir, tempDir));

    const idleOutput = join(outputSpriteDir, 'idle00.gif');
    for (let index = 1; index <= 6; index += 1) {
      const name = `map${index}.gif`;
      const outputPath = join(outputSpriteDir, name);
      copyFileSync(idleOutput, outputPath);
      const image = probeImage(join(options.extractedDir, name));
      const verification = verifyGif(outputPath, image.width, image.height);
      frames.push({
        output: displayPath(outputPath),
        source: displayPath(idleOutput),
        animation: 'alternatepal',
        identityPalettePrototype: true,
        targetCanvas: { width: image.width, height: image.height },
        palette: verification,
      });
      console.log(`built ${name} identity palette`);
    }

    const subRecords = parseModelFrames(subModel);
    for (const mapping of SUBMODEL_MAPPING) {
      frames.push(buildGif({
        mapping,
        sourceDir: options.sourceDir,
        extractedDir: options.extractedDir,
        outputSpriteDir,
        records: subRecords,
        tempDir,
        spriteHeight: 70,
      }));
    }
    const blankPath = join(outputSpriteDir, '1/a4.GIF');
    frames.push({
      output: displayPath(blankPath),
      source: 'generated-blank',
      animation: 'bingxs-idle',
      targetCanvas: { width: 1, height: 1 },
      palette: buildBlankOnePixel(blankPath),
    });
    console.log('built 1/a4.GIF 1x1 blank');

    const modelOverlayPath = join(outputSpriteDir, 'bing.txt');
    const goreRewrite = writeMechanicalModelOverlay(mainModel, modelOverlayPath);
    const submodelOverlayPath = join(outputSpriteDir, '1/bingxs.txt');
    const submodelCaseNormalizedLines = writeSubmodelOverlay(subModel, submodelOverlayPath);
    const manifestPath = join(options.outputDir, 'BLUE-HELMET-GRUNT-BUILD-MANIFEST.json');
    const clamped = frames.filter((frame) => frame.placement?.alignmentClamped).length;
    writeFileSync(manifestPath, `${JSON.stringify({
      schemaVersion: 1,
      status: 'local-private-engineering-prototype',
      productionReady: false,
      warning: 'Twelve concept poses are reused across 42 physical assets. Airborne, walk, debris, icon and attack transitions require pixel-art redraw.',
      chromaKey: { ...CHROMA, requiredPaletteIndex: 0 },
      requestedSpriteHeight: options.spriteHeight,
      coverage: {
        mainAnimationFrames: 31,
        icon: 1,
        identityAlternatePalettes: 6,
        bingxsFrames: 4,
        totalPhysicalAssets: frames.length,
        clampedPlacements: clamped,
      },
      goreRewrite,
      caseNormalization: {
        mainModelReferences: goreRewrite.normalizedImageReferences,
        submodelLines: submodelCaseNormalizedLines,
      },
      inputs: {
        sourceDir: displayPath(options.sourceDir),
        extractedDir: displayPath(options.extractedDir),
        mainModel: displayPath(mainModel),
        subModel: displayPath(subModel),
      },
      frames,
    }, null, 2)}\n`);
    console.log(`model overlay ${displayPath(modelOverlayPath)}`);
    console.log(`submodel overlay ${displayPath(submodelOverlayPath)}`);
    console.log(`manifest ${displayPath(manifestPath)}`);
    console.log(`prototype complete: ${frames.length} physical assets, ${clamped} clamped placements`);
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
