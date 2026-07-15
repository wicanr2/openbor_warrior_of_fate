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

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const DEFAULT_SPRITE_HEIGHT = 108;

const PIVOTS = Object.freeze({
  'frame-01.png': { x: 120, y: 88 }, 'frame-02.png': { x: 103, y: 269 },
  'frame-03.png': { x: 101, y: 253 }, 'frame-04.png': { x: 108, y: 253 },
  'frame-05.png': { x: 112, y: 250 }, 'frame-06.png': { x: 107, y: 241 },
  'frame-07.png': { x: 105, y: 244 }, 'frame-08.png': { x: 106, y: 244 },
  'frame-09.png': { x: 102, y: 202 }, 'frame-10.png': { x: 119, y: 110 },
  'frame-11.png': { x: 102, y: 104 }, 'frame-12.png': { x: 111, y: 235 },
  'frame-13.png': { x: 86, y: 269 }, 'frame-14.png': { x: 131, y: 145 },
  'frame-15.png': { x: 186, y: 63 }, 'frame-16.png': { x: 152, y: 112 },
});

const FX_PIVOTS = Object.freeze({
  'frame-01.png': { x: 45, y: 26 }, 'frame-02.png': { x: 83, y: 40 },
  'frame-03.png': { x: 223, y: 29 }, 'frame-04.png': { x: 101, y: 139 },
  'frame-05.png': { x: 63, y: 40 }, 'frame-06.png': { x: 146, y: 37 },
  'frame-07.png': { x: 78, y: 87 }, 'frame-08.png': { x: 86, y: 83 },
  'frame-09.png': { x: 83, y: 84 }, 'frame-10.png': { x: 113, y: 159 },
  'frame-11.png': { x: 143, y: 215 }, 'frame-12.png': { x: 107, y: 136 },
  'frame-13.png': { x: 107, y: 113 }, 'frame-14.png': { x: 50, y: 101 },
  'frame-15.png': { x: 117, y: 101 }, 'frame-16.png': { x: 121, y: 88 },
});

function item(output, source, x = 82, y = 107, extra = {}) {
  return { output, source, offset: { x, y }, sourceAnchor: PIVOTS[source], ...extra };
}

export const MAIN_MAPPING = Object.freeze([
  item('idle.gif', 'frame-03.png'), item('win1.GIF', 'frame-09.png'), item('win2.GIF', 'frame-03.png'),
  ...Array.from({ length: 8 }, (_, index) => item(`walk${index + 1}.gif`, index % 2 ? 'frame-05.png' : 'frame-04.png', 73, 128, { spriteHeight: 112 })),
  item('attack006.gif', 'frame-08.png', 71), item('attack06.gif', 'frame-08.png', 71), item('attack07.gif', 'frame-08.png', 71),
  item('attack1.GIF', 'frame-07.png', 71), item('attack2.GIF', 'frame-07.png', 71), item('attack3.GIF', 'frame-07.png', 71), item('attack4.GIF', 'frame-07.png', 71),
  item('attack5.GIF', 'frame-07.png', 71), item('attack6.GIF', 'frame-08.png', 71), item('attack7.GIF', 'frame-08.png', 71),
  item('f1.GIF', 'frame-07.png'), item('f2.GIF', 'frame-08.png'), item('f3.GIF', 'frame-09.png'), item('f4.GIF', 'frame-07.png'),
  item('f5.GIF', 'frame-08.png'), item('f6.GIF', 'frame-09.png'), item('f7.GIF', 'frame-12.png', 115, 112), item('f8.GIF', 'frame-12.png', 113, 106),
  item('sp.gif', 'frame-12.png', 120), item('sp1.GIF', 'frame-07.png', 120), item('sp2.GIF', 'frame-08.png', 120),
  item('sp3.GIF', 'frame-09.png', 120), item('sp4.GIF', 'frame-12.png', 120), item('sp5.GIF', 'frame-08.png', 120), item('sp6.GIF', 'frame-12.png', 120),
  item('jump.GIF', 'frame-10.png'), item('jump1.GIF', 'frame-10.png'), item('jump2.GIF', 'frame-10.png'),
  item('jumpa1.GIF', 'frame-11.png'), item('jumpa2.GIF', 'frame-11.png'), item('jumpa3.GIF', 'frame-11.png'),
  item('jumpfa1.GIF', 'frame-11.png'), item('jumpfa2.GIF', 'frame-10.png'),
  item('grab.gif', 'frame-06.png'), item('graba1.GIF', 'frame-07.png'), item('graba2.GIF', 'frame-08.png'), item('graba3.GIF', 'frame-09.png'),
  item('grabj01.GIF', 'frame-10.png'), item('grabj1.GIF', 'frame-10.png'), item('grabj2.GIF', 'frame-11.png'),
  item('grabj3.GIF', 'frame-11.png', 84, 52), item('grabj4.GIF', 'frame-11.png', 84, 60), item('grabj5.GIF', 'frame-11.png', 84, 40),
  item('fall1.GIF', 'frame-14.png', 83, 79), item('fall2.GIF', 'frame-15.png', 67, 102), item('fall3.GIF', 'frame-15.png'), item('fall4.GIF', 'frame-10.png'),
  item('fallf1.GIF', 'frame-14.png', 65, 75), item('fallr.GIF', 'frame-14.png', 88, 79), item('fallx.GIF', 'frame-14.png', 85, 77),
  item('fallx1.GIF', 'frame-15.png', 65, 75), item('fallx2.GIF', 'frame-15.png', 67, 102), item('fallx3.GIF', 'frame-15.png'),
  item('pain1.GIF', 'frame-13.png'), item('pain2.GIF', 'frame-13.png'), item('painx1.GIF', 'frame-13.png'), item('painx2.GIF', 'frame-13.png'), item('rise1.GIF', 'frame-03.png'),
  item('block.GIF', 'frame-06.png'), item('block1.GIF', 'frame-03.png'),
]);

function fxItem(output, source, x, y) {
  return { output, source, offset: { x, y }, sourceAnchor: FX_PIVOTS[source] };
}

const PROJECTILE_MAPPING = Object.freeze([
  fxItem('a01.GIF', 'frame-02.png', 26, 18), fxItem('a02.GIF', 'frame-03.png', 24, 17), fxItem('a1.GIF', 'frame-01.png', 29, 20),
  fxItem('b1.GIF', 'frame-01.png', 29, 12), fxItem('fall.GIF', 'frame-04.png', 38, 15), fxItem('goj.gif', 'frame-03.png', 32, 2),
  fxItem('sa1.gif', 'frame-05.png', 74, 40), fxItem('sa2.gif', 'frame-06.png', 76, 38), fxItem('sa3.gif', 'frame-07.png', 76, 36), fxItem('sa4.gif', 'frame-08.png', 77, 35),
  fxItem('spa01.gif', 'frame-13.png', 74, 28), fxItem('spa05.GIF', 'frame-14.png', 72, 32), fxItem('spa06.GIF', 'frame-15.png', 72, 32), fxItem('spa07.GIF', 'frame-16.png', 72, 32),
  fxItem('spa1.gif', 'frame-09.png', 73, 27), fxItem('spa2.gif', 'frame-10.png', 73, 27), fxItem('spa3.gif', 'frame-11.png', 73, 27), fxItem('spa4.gif', 'frame-12.png', 74, 28),
  fxItem('sx1.gif', 'frame-09.png', 74, 40), fxItem('sx2.gif', 'frame-10.png', 76, 38), fxItem('sx3.gif', 'frame-11.png', 76, 36), fxItem('sx4.gif', 'frame-12.png', 77, 35),
]);

const CASE_REPLACEMENTS = Object.freeze([
  ['icon.gif', 'icon.GIF', 1], ['attack06.GIF', 'attack06.gif', 4], ['attack07.GIF', 'attack07.gif', 5],
  ['block.gif', 'block.GIF', 10], ['block1.gif', 'block1.GIF', 1], ['fallf1.gif', 'fallf1.GIF', 6],
  ['fallx2.gif', 'fallx2.GIF', 6], ['fall2.gif', 'fall2.GIF', 5], ['fallx3.gif', 'fallx3.GIF', 6],
  ['fall3.gif', 'fall3.GIF', 8], ['fall1.gif', 'fall1.GIF', 1], ['win1.gif', 'win1.GIF', 3], ['win2.gif', 'win2.GIF', 5],
  ...Array.from({ length: 8 }, (_, index) => [`walk${index + 1}.GIF`, `walk${index + 1}.gif`, 6]),
  ['pain2.gif', 'pain2.GIF', 4], ['painx2.gif', 'painx2.GIF', 4], ['pain1.gif', 'pain1.GIF', 17],
  ['painx1.gif', 'painx1.GIF', 4], ['attack006.GIF', 'attack006.gif', 1], ['fallx1.gif', 'fallx1.GIF', 3],
]);

const SHARED_FX = Object.freeze([
  'chars/misc/black/blackh.GIF',
  ...Array.from({ length: 24 }, (_, index) => `chars/misc/flash/1/${String(862 + index).padStart(4, '0')}.gif`),
  ...Array.from({ length: 10 }, (_, index) => `chars/misc/dust/${index + 1}.gif`),
  ...Array.from({ length: 13 }, (_, index) => `chars/misc/dust2/${index + 1}.gif`),
  ...Array.from({ length: 9 }, (_, index) => `chars/misc/flash/c${index + 1}.gif`),
]);

function usage() {
  return `Build local-only Huang Zhong Azure Photon Ranger P0 engineering coverage.

Usage:
  node scripts/build-huangzhong-p0-prototype.mjs [options]

Options:
  --source-dir PATH       normalized 16 main key poses
  --projectile-dir PATH   normalized 16 projectile/FX key poses
  --selection-source PATH private five-robot selection source
  --data-dir PATH         extracted OpenBOR data directory
  --output-dir PATH       overlay root; data/... is appended
  --sprite-height N       requested standing height (default: 108)
  --help                  show this help

Outputs 73 active-player GIFs, two HUD profiles, all 22 effective projectile
GIFs, shared FX palette normalization and Linux-safe model/script references.
h1..h16 mounted, weapon and water variants remain explicitly deferred.`;
}

function parseArgs(argv) {
  const options = {
    sourceDir: join(REPO_ROOT, 'private_assets/robot_wof/huangzhong/keyposes'),
    projectileDir: join(REPO_ROOT, 'private_assets/robot_wof/huangzhong/projectile-keyposes'),
    selectionSource: join(REPO_ROOT, 'private_assets/robot_wof/ui/five-robot-selection-screen-v1.png'),
    dataDir: join(REPO_ROOT, 'workplace/extracted/data'),
    outputDir: join(REPO_ROOT, 'workplace/robot_wof_vertical_slice/overlay'),
    spriteHeight: DEFAULT_SPRITE_HEIGHT,
  };
  const keys = { '--source-dir': 'sourceDir', '--projectile-dir': 'projectileDir', '--selection-source': 'selectionSource', '--data-dir': 'dataDir', '--output-dir': 'outputDir' };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') { console.log(usage()); process.exit(0); }
    const value = argv[index + 1];
    if (keys[argument]) {
      if (!value) throw new Error(`${argument} requires a path`);
      options[keys[argument]] = resolve(value); index += 1; continue;
    }
    if (argument === '--sprite-height') {
      if (!value || !/^\d+$/.test(value)) throw new Error('--sprite-height requires an integer');
      options.spriteHeight = Number(value);
      if (options.spriteHeight < 64 || options.spriteHeight > 128) throw new Error('--sprite-height must be between 64 and 128');
      index += 1; continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }
  const extractedRoot = resolve(REPO_ROOT, 'workplace/extracted');
  if (options.outputDir === extractedRoot || options.outputDir.startsWith(`${extractedRoot}/`)) throw new Error('Refusing to write inside workplace/extracted');
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

function buildGif(mapping, options, sourceDir, targetDir, outputDir, tempDir, spriteHeight) {
  const sourcePath = join(sourceDir, mapping.source);
  const originalPath = join(options.dataDir, targetDir, mapping.output);
  if (!existsSync(sourcePath)) throw new Error(`Missing key pose: ${sourcePath}`);
  if (!existsSync(originalPath)) throw new Error(`Missing original target: ${originalPath}`);
  const image = probeImage(originalPath);
  const target = { originalPath, canvas: { width: image.width, height: image.height }, offset: mapping.offset };
  const pose = analyzePose(sourcePath);
  const composedPath = join(tempDir, `${targetDir.replaceAll('/', '-')}-${mapping.output}.png`);
  const placement = makeComposedPng(sourcePath, composedPath, pose, target, spriteHeight, mapping, true);
  const paletteDir = join(tempDir, `${targetDir.replaceAll('/', '-')}-${mapping.output}-palette`);
  mkdirSync(paletteDir, { recursive: true });
  const { pixels, bgraPalette } = palettizeWithFfmpeg(composedPath, image.width, image.height, paletteDir);
  const ffmpegChromaIndex = forceChromaAtIndexZero(pixels, bgraPalette);
  const outputPath = join(outputDir, mapping.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, encodeGif(image.width, image.height, pixels, bgraPalette));
  const verification = verifyGif(outputPath, image.width, image.height);
  console.log(`built ${targetDir}/${mapping.output} ${image.width}x${image.height}`);
  return { output: displayPath(outputPath), source: displayPath(sourcePath), targetCanvas: target.canvas, targetOffset: target.offset, sourceAnalysis: pose, placement, palette: { ffmpegChromaIndexBeforeRemap: ffmpegChromaIndex, ...verification } };
}

function buildOpaqueUi(options, outputPath, mirror, tempDir) {
  const target = { id: basename(outputPath), filter: `crop=215:332:980:55,scale=35:54:flags=neighbor${mirror ? ',hflip' : ''}` };
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

  const mainTransforms = CASE_REPLACEMENTS.map(([from, to, count]) => [`data/chars/huangzhong/${from}`, `data/chars/huangzhong/${to}`, count]);
  mainTransforms.push(['\thitflash\tblood2', '\thitflash\tflashb', 5]);
  writeTransformed('chars/huangzhong/huangzhong.txt', mainTransforms);
  writeTransformed('chars/misc/black/blackh.txt', [['data/chars/misc/black/blackh.gif', 'data/chars/misc/black/blackh.GIF', 2]]);
  writeTransformed('chars/huangzhong/gong/gongjz.txt', [['data/chars/huangzhong/gong/goj.GIF', 'data/chars/huangzhong/gong/goj.gif', 3]]);
  writeTransformed('chars/huangzhong/gong/gongjfx.txt', [
    ['data/chars/huangzhong/gong/spa05.gif', 'data/chars/huangzhong/gong/spa05.GIF', 3],
    ['data/chars/huangzhong/gong/spa06.gif', 'data/chars/huangzhong/gong/spa06.GIF', 3],
    ['data/chars/huangzhong/gong/spa07.gif', 'data/chars/huangzhong/gong/spa07.GIF', 3],
  ]);
  writeTransformed('chars/huangzhong/gong/gongjfp.txt', [
    ['data/chars/huangzhong/gong/spa05.gif', 'data/chars/huangzhong/gong/spa05.GIF', 4],
    ['data/chars/huangzhong/gong/spa06.gif', 'data/chars/huangzhong/gong/spa06.GIF', 3],
    ['data/chars/huangzhong/gong/spa07.gif', 'data/chars/huangzhong/gong/spa07.GIF', 3],
  ]);
  writeTransformed('chars/misc/flash/jflash03.txt', [['data/chars/huangzhong/gong/goj1.GIF', 'data/chars/huangzhong/gong/goj1.gif', 3]]);
  writeTransformed('chars/misc/fire/fire.txt', [
    ['data/chars/misc/fire/2.gif', 'data/chars/misc/fire/2.GIF', 4], ['data/chars/misc/fire/4.gif', 'data/chars/misc/fire/4.GIF', 1],
    ['data/chars/misc/fire/5.gif', 'data/chars/misc/fire/5.GIF', 2], ['data/chars/misc/fire/6.gif', 'data/chars/misc/fire/6.GIF', 2],
    ['data/chars/misc/fire/7.gif', 'data/chars/misc/fire/7.GIF', 2],
  ]);
  writeTransformed('models.txt', [
    ['data/chars/misc/flash/2/Flashbb.txt', 'data/chars/misc/flash/2/flashbb.txt', 1],
    ['data/chars/misc/flash/Bflash.txt', 'data/chars/misc/flash/bflash.txt', 1],
  ]);
  writeTransformed('scripts/WOFplayer.c', [
    ['data/scripts/common/spawnbind.c', 'data/scripts/common/SpawnBind.c', 1], ['data/scripts/common/trBody.c', 'data/scripts/common/trbody.c', 1],
    ['data/scripts/msg/sendMsg.c', 'data/scripts/msg/sendmsg.c', 1],
  ]);
  writeTransformed('scripts/common/player.c', [['data/scripts/msg/sendMsg.c', 'data/scripts/msg/sendmsg.c', 1]]);
  writeTransformed('scripts/didhit/guanyu.c', [['data/scripts/didhit/HitFX.c', 'data/scripts/didhit/hitfx.c', 1]]);
  return outputs;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  requireCommand('ffmpeg'); requireCommand('ffprobe');
  if (MAIN_MAPPING.length !== 71) throw new Error(`Expected 71 generated main frames, got ${MAIN_MAPPING.length}`);
  if (PROJECTILE_MAPPING.length !== 22) throw new Error(`Expected 22 projectile frames, got ${PROJECTILE_MAPPING.length}`);
  if (!existsSync(options.selectionSource)) throw new Error(`Missing selection source: ${options.selectionSource}`);
  const mainOutputDir = join(options.outputDir, 'data/chars/huangzhong');
  const projectileOutputDir = join(mainOutputDir, 'gong');
  mkdirSync(projectileOutputDir, { recursive: true });
  const tempDir = mkdtempSync(join(tmpdir(), 'huangzhong-p0-'));
  try {
    const frames = MAIN_MAPPING.map((mapping) => buildGif(mapping, options, options.sourceDir, 'chars/huangzhong', mainOutputDir, tempDir, mapping.spriteHeight ?? options.spriteHeight));
    frames.push(buildOpaqueUi(options, join(mainOutputDir, 'icon.GIF'), false, tempDir));
    const redOutput = join(mainOutputDir, 'red.gif');
    copyFileSync(join(mainOutputDir, 'idle.gif'), redOutput);
    frames.push({ output: displayPath(redOutput), source: displayPath(join(mainOutputDir, 'idle.gif')), identityPalettePrototype: true, palette: verifyGif(redOutput, 172, 116) });
    const profiles = [
      buildOpaqueUi(options, join(options.outputDir, 'data/profiles/huangzhong.GIF'), false, tempDir),
      buildOpaqueUi(options, join(options.outputDir, 'data/profiles/huangzhong_m.GIF'), true, tempDir),
    ];
    const projectiles = PROJECTILE_MAPPING.map((mapping) => buildGif(mapping, options, options.projectileDir, 'chars/huangzhong/gong', projectileOutputDir, tempDir, Math.max(1, probeImage(join(options.dataDir, 'chars/huangzhong/gong', mapping.output)).height - 2)));
    const normalizedSharedFx = SHARED_FX.map((path) => normalizeGifPaletteZero(join(options.dataDir, path), join(options.outputDir, 'data', path)));
    const textAndScripts = writeTextAndScriptOverlays(options);
    const manifest = {
      schemaVersion: 1, status: 'local-private-engineering-prototype', productionReady: false,
      warning: 'The active Huang Zhong model and all eight projectile models are covered with reused concept poses. h1..h16 mounted, weapon and water variants remain required for full gameplay completion.',
      generatedAt: new Date().toISOString(),
      scope: {
        huangzhongPhysicalGif: frames.length, hudProfiles: profiles.length, effectiveProjectileGif: projectiles.length,
        projectileModels: 8, sharedFxPaletteNormalizations: normalizedSharedFx.length, textAndScriptFiles: textAndScripts.length,
        totalBatchFiles: frames.length + profiles.length + projectiles.length + normalizedSharedFx.length + textAndScripts.length,
      },
      chromaKey: { ...CHROMA, requiredPaletteIndex: 0 },
      inputs: { sourceDir: displayPath(options.sourceDir), projectileDir: displayPath(options.projectileDir), selectionSource: displayPath(options.selectionSource), dataDir: displayPath(options.dataDir) },
      frames, profiles, projectiles, normalizedSharedFx, textAndScripts,
      behaviorChanges: { humanGoreHitflashRemaps: 5, linuxPathCaseReferenceFixes: 187 },
      deferred: {
        variants: Array.from({ length: 16 }, (_, index) => `h${index + 1}`),
        productionAnimation: ['split inventory cells into individual projectile/debris assets', 'replace key-pose reuse with per-frame cleanup', 'gameplay BBox and attack-box review', '2P palette review'],
        audioQa: ['data/sounds/gongjian.wav', 'data/chars/huangzhong/sp.wav', 'cross-character voice references'],
      },
    };
    const manifestPath = join(options.outputDir, 'HUANGZHONG-P0-BUILD-MANIFEST.json');
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`manifest ${displayPath(manifestPath)}`);
    console.log(`Huang Zhong P0 complete: ${frames.length} main + ${profiles.length} profiles + ${projectiles.length} projectiles + ${normalizedSharedFx.length} FX + ${textAndScripts.length} TXT/scripts`);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
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
