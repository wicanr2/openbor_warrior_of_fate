#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  encodeGif,
  forceChromaAtIndexZero,
  palettizeWithFfmpeg,
  probeImage,
  verifyGif,
} from './build-mazinger-p0-prototype.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');

const LAYERS = Object.freeze([
  {
    base: 'S2.gif',
    output: 'S2.gif',
    canvas: [2600, 276],
    crop: { x: 0, y: 0, width: 2172, height: 230 },
    role: 'distant forest and mountain layer',
  },
  {
    base: 'panel.gif',
    output: 'panel.gif',
    canvas: [2429, 276],
    crop: { x: 0, y: 250, width: 2172, height: 247 },
    role: 'walkable forest outpost and commander arena',
  },
  {
    base: 'f.GIF',
    output: 'f.GIF',
    canvas: [2429, 272],
    crop: { x: 0, y: 452, width: 2172, height: 244 },
    role: 'foreground foliage and rock occlusion',
  },
]);
const SCANLIGHT = Object.freeze({
  base: 'sunshine1.gif',
  output: 'sunshine1.gif',
  canvas: [480, 272],
  role: 'subtle cyan tactical scan-light atmosphere FX',
});

function usage() {
  return `Build the private Stage01 background engineering prototype.

Usage:
  node scripts/build-stage01-background-p0-prototype.mjs [options]

Options:
  --source PATH       original generated panorama PNG
  --base-dir PATH     extracted data/bgs/01 directory
  --data-dir PATH     extracted data root used for level reference overlays
  --output-dir PATH   overlay root; data/bgs/01 is appended
  --overview PATH     optional public-safe stacked PNG overview
  --help              show this help

The base images are used only as binary index-0 masks. Their artwork is not
copied. Output preserves exact canvas, physical case, mask footprint and GIF
palette index 0 #FC00FF.`;
}

function parseArgs(argv) {
  const options = {
    source: join(
      REPO_ROOT,
      'private_assets/robot_wof/stage01/environment/stage01-forest-outpost-panorama-v1.png',
    ),
    baseDir: join(REPO_ROOT, 'workplace/extracted/data/bgs/01'),
    dataDir: join(REPO_ROOT, 'workplace/extracted/data'),
    outputDir: join(REPO_ROOT, 'workplace/robot_wof_vertical_slice/overlay'),
    overview: null,
  };
  const keys = new Map([
    ['--source', 'source'],
    ['--base-dir', 'baseDir'],
    ['--data-dir', 'dataDir'],
    ['--output-dir', 'outputDir'],
    ['--overview', 'overview'],
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
  return result.stdout;
}

function displayPath(path) {
  const result = relative(REPO_ROOT, path);
  return result && !result.startsWith('..') ? result.replaceAll('\\', '/') : path;
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function assertInput(options) {
  if (!existsSync(options.source)) throw new Error(`Missing source: ${options.source}`);
  if (!existsSync(options.dataDir)) throw new Error(`Missing data root: ${options.dataDir}`);
  const source = probeImage(options.source);
  if (source.width !== 2172 || source.height !== 724) {
    throw new Error(`Expected the reviewed 2172x724 panorama, got ${source.width}x${source.height}`);
  }
  for (const layer of LAYERS) {
    const basePath = join(options.baseDir, layer.base);
    if (!existsSync(basePath)) throw new Error(`Missing base mask: ${basePath}`);
    const probe = probeImage(basePath);
    if (probe.width !== layer.canvas[0] || probe.height !== layer.canvas[1]) {
      throw new Error(
        `${layer.base} must be ${layer.canvas.join('x')}, got ${probe.width}x${probe.height}`,
      );
    }
  }
  const scanlightBase = join(options.baseDir, SCANLIGHT.base);
  if (!existsSync(scanlightBase)) throw new Error(`Missing base FX: ${scanlightBase}`);
  const scanlightProbe = probeImage(scanlightBase);
  if (
    scanlightProbe.width !== SCANLIGHT.canvas[0]
    || scanlightProbe.height !== SCANLIGHT.canvas[1]
  ) {
    throw new Error(`${SCANLIGHT.base} must be ${SCANLIGHT.canvas.join('x')}`);
  }
}

function listTxtFiles(root) {
  const result = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.txt')) result.push(path);
    }
  }
  visit(root);
  return result.sort();
}

function writeLevelReferenceOverlays(dataDir, outputDir) {
  const levelsDir = join(dataDir, 'levels');
  const records = [];
  for (const sourcePath of listTxtFiles(levelsDir)) {
    const source = readFileSync(sourcePath, 'utf8');
    let normalizedReferences = 0;
    const output = source.replace(/data\/bgs\/01\/f\.gif/gi, () => {
      normalizedReferences += 1;
      return 'data/bgs/01/f.GIF';
    });
    if (!normalizedReferences) continue;
    const relativePath = relative(dataDir, sourcePath);
    const outputPath = join(outputDir, 'data', relativePath);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, output);
    records.push({
      path: displayPath(outputPath),
      normalizedReferences,
    });
  }
  return records;
}

function renderMaskedPng(sourcePath, basePath, outputPath, layer) {
  const [width, height] = layer.canvas;
  const { x, y, width: cropWidth, height: cropHeight } = layer.crop;
  const filter = [
    `[0:v]crop=${cropWidth}:${cropHeight}:${x}:${y},scale=${width}:${height}:flags=neighbor,format=rgba[art]`,
    `[1:v]format=rgba,colorkey=0xFC00FF:0.01:0,alphaextract[mask]`,
    `[art][mask]alphamerge[cut]`,
    `color=c=0xFC00FF:s=${width}x${height}:r=1,format=rgba[bg]`,
    '[bg][cut]overlay=0:0:format=auto,format=rgb24[out]',
  ].join(';');
  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', sourcePath,
    '-i', basePath,
    '-filter_complex', filter,
    '-map', '[out]',
    '-frames:v', '1',
    outputPath,
  ]);
}

function renderScanlightPng(outputPath) {
  const [width, height] = SCANLIGHT.canvas;
  const expression = [
    "geq=r='if(lt(mod(X+2*Y,160),16),72,252)'",
    "g='if(lt(mod(X+2*Y,160),16),188,0)'",
    "b='if(lt(mod(X+2*Y,160),16),214,255)'",
  ].join(':');
  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', `color=c=0xFC00FF:s=${width}x${height}:r=1`,
    '-vf', `${expression},format=rgb24`,
    '-frames:v', '1',
    outputPath,
  ]);
}

function encodeLayer(pngPath, outputPath, layer, tempDir) {
  const [width, height] = layer.canvas;
  const paletteDir = join(tempDir, layer.output.replaceAll('.', '_'));
  mkdirSync(paletteDir, { recursive: true });
  const { pixels, bgraPalette } = palettizeWithFfmpeg(pngPath, width, height, paletteDir);
  const ffmpegChromaIndexBeforeRemap = forceChromaAtIndexZero(pixels, bgraPalette);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, encodeGif(width, height, pixels, bgraPalette));
  return {
    ffmpegChromaIndexBeforeRemap,
    ...verifyGif(outputPath, width, height),
  };
}

function writeOverview(layerPngs, outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  const filter = [
    '[0:v]scale=1200:127:flags=neighbor[a]',
    '[1:v]scale=1200:136:flags=neighbor[b]',
    '[2:v]scale=1200:134:flags=neighbor[c]',
    '[a][b][c]vstack=inputs=3[out]',
  ].join(';');
  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', layerPngs[0], '-i', layerPngs[1], '-i', layerPngs[2],
    '-filter_complex', filter,
    '-map', '[out]',
    '-frames:v', '1',
    outputPath,
  ]);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  requireCommand('ffmpeg');
  requireCommand('ffprobe');
  assertInput(options);

  const tempDir = mkdtempSync(join(tmpdir(), 'robot-wof-stage01-bg-'));
  const outputLayerDir = join(options.outputDir, 'data/bgs/01');
  const records = [];
  const layerPngs = [];
  try {
    for (const layer of LAYERS) {
      const basePath = join(options.baseDir, layer.base);
      const pngPath = join(tempDir, `${layer.output}.png`);
      const outputPath = join(outputLayerDir, layer.output);
      renderMaskedPng(options.source, basePath, pngPath, layer);
      const palette = encodeLayer(pngPath, outputPath, layer, tempDir);
      layerPngs.push(pngPath);
      records.push({
        path: displayPath(outputPath),
        baseMask: `local-only/${layer.base}`,
        canvas: layer.canvas,
        crop: layer.crop,
        role: layer.role,
        palette,
      });
      console.log(`built ${layer.output} ${layer.canvas.join('x')}`);
    }

    const scanlightPng = join(tempDir, 'sunshine1.gif.png');
    const scanlightOutput = join(outputLayerDir, SCANLIGHT.output);
    renderScanlightPng(scanlightPng);
    const scanlightPalette = encodeLayer(
      scanlightPng, scanlightOutput, SCANLIGHT, tempDir,
    );
    const atmosphereFx = {
      path: displayPath(scanlightOutput),
      canvas: SCANLIGHT.canvas,
      role: SCANLIGHT.role,
      palette: scanlightPalette,
      generatedBy: 'deterministic diagonal scan-line expression',
    };
    console.log(`built ${SCANLIGHT.output} ${SCANLIGHT.canvas.join('x')}`);

    if (options.overview) writeOverview(layerPngs, options.overview);

    const levelReferenceOverlays = writeLevelReferenceOverlays(options.dataDir, options.outputDir);

    const manifestPath = join(options.outputDir, 'STAGE01-BACKGROUND-P0-MANIFEST.json');
    writeFileSync(manifestPath, `${JSON.stringify({
      schemaVersion: 1,
      status: 'engineering-prototype-not-production-ready',
      source: {
        path: `local-only/${options.source.split('/').pop()}`,
        sha256: sha256(options.source),
        canvas: [2172, 724],
        originalGeneratedArt: true,
      },
      method: 'generated panorama sliced through base index-0 masks; no base artwork copied',
      chroma: { paletteIndex: 0, rgb: '#FC00FF', gifTransparencyExtension: false },
      layers: records,
      atmosphereFx,
      levelReferenceOverlays,
      productionGaps: [
        'full 2429px scene is derived from three horizontal source bands',
        'viewport seams, horizon, walls and foreground occlusion require visible gameplay review',
        'source art is an engineering concept and needs pixel-artist cleanup',
      ],
    }, null, 2)}\n`);
    console.log(`manifest ${displayPath(manifestPath)}`);
    if (options.overview) console.log(`overview ${displayPath(options.overview)}`);
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
