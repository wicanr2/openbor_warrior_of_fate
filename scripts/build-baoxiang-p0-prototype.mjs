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
  analyzePose,
  encodeGif,
  forceChromaAtIndexZero,
  palettizeWithFfmpeg,
  probeImage,
  verifyGif,
} from './build-mazinger-p0-prototype.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const TARGETS = Object.freeze([
  {
    output: 'baoxiang.gif', source: 'frame-01.png', role: 'sealed-capsule',
    canvas: [66, 45], offset: [38, 41], occupancy: { x: 1, y: 4, width: 64, height: 37 },
  },
  {
    output: '1.GIF', source: 'frame-02.png', role: 'rupture-a',
    canvas: [141, 114], offset: [65, 86], occupancy: { x: 27, y: 21, width: 74, height: 65 },
  },
  {
    output: '2.GIF', source: 'frame-03.png', role: 'rupture-b',
    canvas: [141, 114], offset: [65, 86], occupancy: { x: 20, y: 5, width: 109, height: 88 },
  },
]);

function usage() {
  return `Build the Stage01 baoxiang mechanical supply engineering prototype.

Usage:
  node scripts/build-baoxiang-p0-prototype.mjs [options]

Options:
  --source-dir PATH     normalized three-pose PNG directory
  --base-dir PATH       extracted data/chars/misc/box/1 directory
  --output-dir PATH     overlay root; data/chars/misc/box/1 is appended
  --help                show this help`;
}

function parseArgs(argv) {
  const options = {
    sourceDir: join(REPO_ROOT, 'private_assets/robot_wof/stage01/supply/keyposes'),
    baseDir: join(REPO_ROOT, 'workplace/extracted/data/chars/misc/box/1'),
    outputDir: join(REPO_ROOT, 'workplace/robot_wof_vertical_slice/overlay'),
  };
  const keys = new Map([
    ['--source-dir', 'sourceDir'],
    ['--base-dir', 'baseDir'],
    ['--output-dir', 'outputDir'],
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

function requireCommand(binary) {
  const result = spawnSync(binary, ['-version'], { encoding: 'utf8' });
  if (result.error && result.status === null) throw result.error;
  if (result.status !== 0) throw new Error(`${binary} is required`);
}

function run(binary, args) {
  const result = spawnSync(binary, args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${binary} failed (${result.status}): ${result.stderr.trim()}`);
  }
}

function displayPath(path) {
  const result = relative(REPO_ROOT, path);
  return result && !result.startsWith('..')
    ? result.replaceAll('\\', '/')
    : `local-only/${basename(path)}`;
}

function assertInputs(options) {
  for (const target of TARGETS) {
    const sourcePath = join(options.sourceDir, target.source);
    const basePath = join(options.baseDir, target.output);
    if (!existsSync(sourcePath)) throw new Error(`Missing source pose: ${sourcePath}`);
    if (!existsSync(basePath)) throw new Error(`Missing base target: ${basePath}`);
    const probe = probeImage(basePath);
    if (probe.width !== target.canvas[0] || probe.height !== target.canvas[1]) {
      throw new Error(`${target.output} must be ${target.canvas.join('x')}`);
    }
  }
  if (!existsSync(join(options.baseDir, 'baoxiang.txt'))) {
    throw new Error(`Missing model: ${join(options.baseDir, 'baoxiang.txt')}`);
  }
}

function compose(sourcePath, outputPath, target, pose) {
  const scale = Math.min(
    target.occupancy.width / pose.crop.width,
    target.occupancy.height / pose.crop.height,
  );
  const scaledWidth = Math.max(1, Math.round(pose.crop.width * scale));
  const scaledHeight = Math.max(1, Math.round(pose.crop.height * scale));
  const x = target.occupancy.x + Math.floor((target.occupancy.width - scaledWidth) / 2);
  const y = target.occupancy.y + Math.floor((target.occupancy.height - scaledHeight) / 2);
  const filter = [
    `[0:v]crop=${pose.crop.width}:${pose.crop.height}:${pose.crop.x}:${pose.crop.y},scale=${scaledWidth}:${scaledHeight}:flags=neighbor[fg]`,
    `color=c=0xFC00FF:s=${target.canvas[0]}x${target.canvas[1]}:r=1[bg]`,
    `[bg][fg]overlay=${x}:${y}:format=auto,format=rgb24[out]`,
  ].join(';');
  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', sourcePath,
    '-filter_complex', filter,
    '-map', '[out]', '-frames:v', '1', outputPath,
  ]);
  return { scale, scaledWidth, scaledHeight, x, y };
}

function buildGif(options, target, tempDir, outputSpriteDir) {
  const sourcePath = join(options.sourceDir, target.source);
  const pose = analyzePose(sourcePath);
  const composedPath = join(tempDir, `${target.output}.png`);
  const placement = compose(sourcePath, composedPath, target, pose);
  const paletteDir = join(tempDir, target.output.replaceAll('.', '_'));
  mkdirSync(paletteDir, { recursive: true });
  const { pixels, bgraPalette } = palettizeWithFfmpeg(
    composedPath, target.canvas[0], target.canvas[1], paletteDir,
  );
  const ffmpegChromaIndexBeforeRemap = forceChromaAtIndexZero(pixels, bgraPalette);
  const outputPath = join(outputSpriteDir, target.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, encodeGif(target.canvas[0], target.canvas[1], pixels, bgraPalette));
  const verification = verifyGif(outputPath, target.canvas[0], target.canvas[1]);
  console.log(`built ${target.output} ${target.canvas.join('x')}`);
  return {
    path: displayPath(outputPath), source: displayPath(sourcePath), role: target.role,
    canvas: target.canvas, offset: target.offset, occupancy: target.occupancy,
    sourceForeground: pose.crop, placement,
    palette: { ffmpegChromaIndexBeforeRemap, ...verification },
  };
}

function writeModelOverlay(baseDir, outputSpriteDir) {
  const sourcePath = join(baseDir, 'baoxiang.txt');
  let text = readFileSync(sourcePath, 'utf8');
  let normalizedReferences = 0;
  text = text.replace(/(Frame\s+data\/chars\/misc\/box\/1\/)1\.gif/gi, (match, prefix) => {
    normalizedReferences += 1;
    return `${prefix}1.GIF`;
  });
  text = text.replace(/(Frame\s+data\/chars\/misc\/box\/1\/)2\.gif/gi, (match, prefix) => {
    normalizedReferences += 1;
    return `${prefix}2.GIF`;
  });
  if (normalizedReferences !== 2) {
    throw new Error(`Expected two model case fixes, got ${normalizedReferences}`);
  }
  const outputPath = join(outputSpriteDir, 'baoxiang.txt');
  writeFileSync(outputPath, text);
  return { path: displayPath(outputPath), normalizedReferences };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  requireCommand('ffmpeg');
  requireCommand('ffprobe');
  assertInputs(options);
  const tempDir = mkdtempSync(join(tmpdir(), 'robot-wof-baoxiang-'));
  const outputSpriteDir = join(options.outputDir, 'data/chars/misc/box/1');
  try {
    const assets = TARGETS.map((target) => buildGif(
      options, target, tempDir, outputSpriteDir,
    ));
    const modelOverlay = writeModelOverlay(options.baseDir, outputSpriteDir);
    const manifestPath = join(options.outputDir, 'BAOXIANG-P0-BUILD-MANIFEST.json');
    writeFileSync(manifestPath, `${JSON.stringify({
      schemaVersion: 1,
      status: 'engineering-prototype-not-production-ready',
      model: 'baoxiang',
      physicalAssets: assets.length,
      sourceStoryboard: 'local-only/baoxiang-mechanical-capsule-storyboard-v1.png',
      chroma: { paletteIndex: 0, rgb: '#FC00FF', gifTransparencyExtension: false },
      modelOverlay,
      assets,
      productionGaps: [
        'three generated poses require pixel-artist cleanup',
        'existing wooden box sound must be replaced with an original private metal-break sound',
        'spawned item art remains outside this P0 package',
      ],
    }, null, 2)}\n`);
    console.log(`manifest ${displayPath(manifestPath)}`);
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
