#!/usr/bin/env node

import { createHash } from 'node:crypto';
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
import { MAIN_MAPPING as HUANGZHONG_MAPPING } from './build-huangzhong-p0-prototype.mjs';
import { palettizeOpaque, renderPng } from './build-five-robot-selection-p0-prototype.mjs';
import { assertExistingPaths, repoRelativeDisplay } from './path-guards.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const DEFAULT_SPRITE_HEIGHT = 107;

const SOURCE_REMAP = Object.freeze({
  'frame-03.png': 'frame-03.png',
  'frame-04.png': 'frame-04.png',
  'frame-05.png': 'frame-05.png',
  'frame-06.png': 'frame-06.png',
  'frame-07.png': 'frame-07.png',
  'frame-08.png': 'frame-08.png',
  'frame-09.png': 'frame-09.png',
  'frame-10.png': 'frame-11.png',
  'frame-11.png': 'frame-12.png',
  'frame-12.png': 'frame-13.png',
  'frame-13.png': 'frame-14.png',
  'frame-14.png': 'frame-15.png',
  'frame-15.png': 'frame-16.png',
});

const OUTPUT_SOURCE_OVERRIDES = Object.freeze({
  'win1.GIF': 'frame-13.png',
  'attack006.gif': 'frame-07.png', 'attack06.gif': 'frame-07.png', 'attack07.gif': 'frame-08.png',
  'attack1.GIF': 'frame-07.png', 'attack2.GIF': 'frame-07.png', 'attack3.GIF': 'frame-07.png',
  'attack4.GIF': 'frame-07.png', 'attack5.GIF': 'frame-07.png',
  'attack6.GIF': 'frame-08.png', 'attack7.GIF': 'frame-08.png',
  'f1.GIF': 'frame-09.png', 'f2.GIF': 'frame-10.png', 'f3.GIF': 'frame-10.png',
  'f4.GIF': 'frame-09.png', 'f5.GIF': 'frame-11.png', 'f6.GIF': 'frame-12.png',
  'f7.GIF': 'frame-12.png', 'f8.GIF': 'frame-02.png',
  'sp.gif': 'frame-12.png', 'sp1.GIF': 'frame-13.png', 'sp2.GIF': 'frame-09.png',
  'sp3.GIF': 'frame-10.png', 'sp4.GIF': 'frame-09.png', 'sp5.GIF': 'frame-10.png',
  'sp6.GIF': 'frame-03.png',
  'jump.GIF': 'frame-11.png', 'jump1.GIF': 'frame-11.png', 'jump2.GIF': 'frame-11.png',
  'jumpa1.GIF': 'frame-07.png', 'jumpa2.GIF': 'frame-08.png', 'jumpa3.GIF': 'frame-11.png',
  'jumpfa1.GIF': 'frame-11.png', 'jumpfa2.GIF': 'frame-12.png',
  'grab.gif': 'frame-06.png', 'graba1.GIF': 'frame-09.png',
  'graba2.GIF': 'frame-10.png', 'graba3.GIF': 'frame-10.png',
  'grabj01.GIF': 'frame-09.png', 'grabj1.GIF': 'frame-09.png', 'grabj2.GIF': 'frame-10.png',
  'grabj3.GIF': 'frame-11.png', 'grabj4.GIF': 'frame-12.png', 'grabj5.GIF': 'frame-02.png',
  'fall1.GIF': 'frame-15.png', 'fallf1.GIF': 'frame-15.png', 'fallr.GIF': 'frame-15.png',
  'fallx.GIF': 'frame-15.png', 'fallx1.GIF': 'frame-15.png',
  'fall2.GIF': 'frame-16.png', 'fall3.GIF': 'frame-16.png', 'fall4.GIF': 'frame-16.png',
  'fallx2.GIF': 'frame-16.png', 'fallx3.GIF': 'frame-16.png',
  'pain1.GIF': 'frame-14.png', 'pain2.GIF': 'frame-14.png',
  'painx1.GIF': 'frame-14.png', 'painx2.GIF': 'frame-14.png',
  'rise1.GIF': 'frame-02.png',
});

const NU_MAPPING = Object.freeze(HUANGZHONG_MAPPING.map((entry) => {
  const source = OUTPUT_SOURCE_OVERRIDES[entry.output] ?? SOURCE_REMAP[entry.source];
  if (!source) throw new Error(`No ν source mapping for ${entry.output} from ${entry.source}`);
  return { ...entry, source };
}));

function usage() {
  return `Build the ν Gundam sixth-character P0 engineering runtime.

Usage:
  node scripts/build-nu-gundam-p0-prototype.mjs [options]

Options:
  --source-dir PATH          normalized ν v5 key poses
  --keypose-manifest PATH    ν v5 crop/pivot manifest
  --base-data PATH           extracted OpenBOR data directory (read only)
  --template-data PATH       validated overlay data containing Huangzhong P0 TXT
  --selection-gif PATH       generated six-column 480x276 select.gif
  --output-dir PATH          output overlay root; data/... is appended
  --sprite-height N          maximum standing target (default: 107)
  --help                     show this help

The 71 Huangzhong physical canvases are reused only as an engine geometry
contract. ν artwork is placed around each original foreground centre/bottom
with a one-pixel safe inset and no hard clamp. The P0 model keeps the proven
gong projectile behavior temporarily, removes h1..h16 weapon switching, and
does not claim production Fin Funnel closure.`;
}

function parseArgs(argv) {
  const options = {
    sourceDir: join(REPO_ROOT, 'private_assets/robot_wof/nu_gundam/keyposes-v5'),
    keyposeManifest: join(REPO_ROOT, 'research/manifests/nu-gundam-sixth-character-v5-keyposes.json'),
    baseData: join(REPO_ROOT, 'workplace/extracted/data'),
    templateData: join(REPO_ROOT, 'workplace/robot_wof_vertical_slice/overlay/data'),
    selectionGif: join(REPO_ROOT, 'private_assets/robot_wof/ui/runtime/select-six-robot.gif'),
    outputDir: join(REPO_ROOT, 'workplace/nu_gundam_p0/overlay'),
    spriteHeight: DEFAULT_SPRITE_HEIGHT,
  };
  const keys = new Map([
    ['--source-dir', 'sourceDir'], ['--keypose-manifest', 'keyposeManifest'],
    ['--base-data', 'baseData'], ['--template-data', 'templateData'],
    ['--selection-gif', 'selectionGif'], ['--output-dir', 'outputDir'],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') {
      console.log(usage());
      process.exit(0);
    }
    if (argument === '--sprite-height') {
      const value = argv[index + 1];
      if (!value || !/^\d+$/.test(value)) throw new Error('--sprite-height requires an integer');
      options.spriteHeight = Number(value);
      if (options.spriteHeight < 64 || options.spriteHeight > 128) {
        throw new Error('--sprite-height must be between 64 and 128');
      }
      index += 1;
      continue;
    }
    const key = keys.get(argument);
    if (!key) throw new Error(`Unknown option: ${argument}`);
    const value = argv[index + 1];
    if (!value) throw new Error(`${argument} requires a path`);
    options[key] = resolve(value);
    index += 1;
  }
  const extractedRoot = resolve(REPO_ROOT, 'workplace/extracted');
  if (options.outputDir === extractedRoot || options.outputDir.startsWith(`${extractedRoot}/`)) {
    throw new Error('Refusing to write inside workplace/extracted');
  }
  assertExistingPaths([
    {
      path: options.sourceDir,
      pathLabel: 'ν source directory',
      display: repoRelativeDisplay(REPO_ROOT, options.sourceDir),
      hint: 'This repository does not ship the private source assets; pass --source-dir to an external checkout.',
    },
    {
      path: options.keyposeManifest,
      pathLabel: 'ν keypose manifest',
      display: repoRelativeDisplay(REPO_ROOT, options.keyposeManifest),
    },
    {
      path: options.baseData,
      pathLabel: 'base data tree',
      display: repoRelativeDisplay(REPO_ROOT, options.baseData),
    },
    {
      path: options.templateData,
      pathLabel: 'template data tree',
      display: repoRelativeDisplay(REPO_ROOT, options.templateData),
    },
    {
      path: options.selectionGif,
      pathLabel: 'six-column selection GIF',
      display: repoRelativeDisplay(REPO_ROOT, options.selectionGif),
      hint: 'Pass --selection-gif to a generated select-six asset.',
    },
  ]);
  return options;
}

function requireCommand(binary) {
  const result = spawnSync(binary, ['-version'], { encoding: 'utf8', timeout: 30_000 });
  if (result.error && result.status === null) throw result.error;
  if (result.status !== 0) throw new Error(`${binary} is required`);
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function displayPath(path) {
  const local = relative(REPO_ROOT, path);
  return local && !local.startsWith('..') ? local.replaceAll('\\', '/') : `local-only/${basename(path)}`;
}

function templatePath(options, relativePath) {
  const overlay = join(options.templateData, relativePath);
  if (existsSync(overlay)) return overlay;
  const base = join(options.baseData, relativePath);
  if (existsSync(base)) return base;
  throw new Error(`Missing template data path: ${relativePath}`);
}

function buildGif(mapping, options, outputSpriteDir, tempDir) {
  const sourcePath = join(options.sourceDir, mapping.source);
  const originalPath = join(options.baseData, 'chars/huangzhong', mapping.output);
  if (!existsSync(sourcePath)) throw new Error(`Missing ν key pose: ${sourcePath}`);
  if (!existsSync(originalPath)) throw new Error(`Missing Huangzhong target canvas: ${originalPath}`);
  const image = probeImage(originalPath);
  const target = {
    originalPath,
    canvas: { width: image.width, height: image.height },
    offset: mapping.offset,
  };
  const pose = analyzePose(sourcePath);
  const originalPose = analyzePose(originalPath);
  const composedPath = join(tempDir, `${mapping.output}.png`);
  const inset = 1;
  const originalCenterX = originalPose.crop.x + originalPose.crop.width / 2;
  const originalBottomY = originalPose.crop.y + originalPose.crop.height - 1;
  const anchor = {
    x: originalCenterX,
    y: Math.min(originalBottomY, target.canvas.height - inset - 1),
  };
  const availableWidth = Math.max(1, 2 * Math.min(
    anchor.x - inset,
    target.canvas.width - inset - anchor.x,
  ));
  const availableHeight = Math.max(1, anchor.y - inset + 1);
  const requestedScale = Math.min(options.spriteHeight / pose.crop.height, originalPose.crop.height / pose.crop.height);
  const safeScale = Math.min(
    requestedScale,
    availableWidth / pose.crop.width,
    availableHeight / pose.crop.height,
  );
  const outputPath = join(outputSpriteDir, mapping.output);
  const paletteDir = join(tempDir, `${mapping.output}-palette`);
  mkdirSync(paletteDir, { recursive: true });
  const postPaletteAnchorCorrection = { x: 0, y: 0 };
  let placement;
  let verification;
  let ffmpegChromaIndex;
  let outputPose;
  let outputAnchorDelta;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const correctedAnchor = {
      x: anchor.x + postPaletteAnchorCorrection.x,
      y: anchor.y + postPaletteAnchorCorrection.y,
    };
    placement = makeComposedPng(
      sourcePath,
      composedPath,
      pose,
      { ...target, offset: correctedAnchor },
      pose.crop.height * safeScale,
      { ...mapping, sourceAnchor: undefined, anchor: 'center-bottom' },
      false,
    );
    const { pixels, bgraPalette } = palettizeWithFfmpeg(
      composedPath,
      image.width,
      image.height,
      paletteDir,
    );
    ffmpegChromaIndex = forceChromaAtIndexZero(pixels, bgraPalette);
    writeFileSync(outputPath, encodeGif(image.width, image.height, pixels, bgraPalette));
    verification = verifyGif(outputPath, image.width, image.height);
    outputPose = analyzePose(outputPath);
    const outputAnchor = {
      x: outputPose.crop.x + outputPose.crop.width / 2,
      y: outputPose.crop.y + outputPose.crop.height - 1,
    };
    outputAnchorDelta = {
      x: outputAnchor.x - originalCenterX,
      y: outputAnchor.y - originalBottomY,
    };
    if (Math.abs(outputAnchorDelta.x) <= 1 && Math.abs(outputAnchorDelta.y) <= 1) break;
    if (attempt === 2) {
      throw new Error(`${mapping.output}: palette-stage anchor drift remains ${outputAnchorDelta.x},${outputAnchorDelta.y}`);
    }
    postPaletteAnchorCorrection.x -= Math.round(outputAnchorDelta.x);
    postPaletteAnchorCorrection.y -= Math.round(outputAnchorDelta.y);
  }
  placement.mode = 'legacy-foreground-bounds';
  placement.originalForeground = originalPose.crop;
  placement.originalForegroundAnchor = { x: originalCenterX, y: originalBottomY };
  placement.safeCanvasInset = inset;
  placement.requestedScale = requestedScale;
  placement.safeScale = safeScale;
  placement.scaleReduction = requestedScale === 0 ? 1 : safeScale / requestedScale;
  placement.legacyAnchorAdjustment = {
    x: anchor.x - originalCenterX,
    y: anchor.y - originalBottomY,
  };
  placement.postPaletteAnchorCorrection = postPaletteAnchorCorrection;
  placement.outputForeground = outputPose.crop;
  placement.outputAnchorDelta = outputAnchorDelta;
  console.log(`built nu_gundam/${mapping.output} ${image.width}x${image.height}`);
  return {
    output: displayPath(outputPath),
    source: displayPath(sourcePath),
    template: displayPath(originalPath),
    targetCanvas: target.canvas,
    targetOffset: target.offset,
    sourceAnalysis: pose,
    placement,
    prototypePoseReuse: NU_MAPPING.filter((candidate) => candidate.source === mapping.source).length > 1,
    palette: { ffmpegChromaIndexBeforeRemap: ffmpegChromaIndex, ...verification },
  };
}

function buildOpaqueUi(options, outputPath, mirror, tempDir) {
  const target = {
    id: basename(outputPath),
    filter: `crop=80:118:400:0,scale=35:54:flags=neighbor${mirror ? ',hflip' : ''}`,
  };
  const pngPath = join(tempDir, `${basename(outputPath)}-${mirror ? 'mirror' : 'normal'}.png`);
  renderPng(options.selectionGif, pngPath, target);
  const paletteDir = join(tempDir, `${basename(outputPath)}-${mirror ? 'mirror' : 'normal'}-palette`);
  mkdirSync(paletteDir, { recursive: true });
  const { pixels, bgraPalette, injectedChromaIndex } = palettizeOpaque(pngPath, 35, 54, paletteDir);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, encodeGif(35, 54, pixels, bgraPalette));
  const verification = verifyGif(outputPath, 35, 54);
  console.log(`built ${displayPath(outputPath)} opaque UI`);
  return {
    output: displayPath(outputPath),
    source: displayPath(options.selectionGif),
    targetCanvas: { width: 35, height: 54 },
    sourceFilter: target.filter,
    palette: { injectedChromaIndex, index0UsedByPixels: false, ...verification },
  };
}

function proxyPalette() {
  const bgra = Buffer.alloc(256 * 4, 0);
  const colours = [
    [CHROMA.r, CHROMA.g, CHROMA.b],
    [14, 28, 52],
    [235, 240, 244],
    [252, 197, 24],
    [62, 235, 255],
    [255, 106, 238],
    [112, 130, 148],
    [42, 90, 166],
  ];
  for (let index = 0; index < 256; index += 1) bgra[index * 4 + 3] = 255;
  colours.forEach(([r, g, b], index) => {
    bgra[index * 4] = b;
    bgra[index * 4 + 1] = g;
    bgra[index * 4 + 2] = r;
  });
  return bgra;
}

function setPixel(pixels, width, height, x, y, colour) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  pixels[y * width + x] = colour;
}

function drawLine(pixels, width, height, x0, y0, x1, y1, colour) {
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  while (true) {
    setPixel(pixels, width, height, x0, y0, colour);
    if (x0 === x1 && y0 === y1) break;
    const twice = 2 * error;
    if (twice >= dy) { error += dy; x0 += sx; }
    if (twice <= dx) { error += dx; y0 += sy; }
  }
}

function writeProxyGif(path, width, height, draw) {
  const pixels = Buffer.alloc(width * height, 0);
  draw(pixels, width, height);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodeGif(width, height, pixels, proxyPalette()));
  const verification = verifyGif(path, width, height);
  return { output: displayPath(path), canvas: { width, height }, palette: verification };
}

function buildFinFunnelProxy(options) {
  const outputDir = join(options.outputDir, 'data/chars/nu_gundam/funnel');
  const shot = writeProxyGif(join(outputDir, 'nu_funnel_shot.gif'), 64, 16, (pixels, width, height) => {
    for (let x = 2; x <= 18; x += 1) {
      const half = Math.max(1, Math.floor((x - 1) / 4));
      for (let y = 8 - half; y <= 8 + half; y += 1) setPixel(pixels, width, height, x, y, 2);
    }
    drawLine(pixels, width, height, 1, 8, 19, 8, 1);
    drawLine(pixels, width, height, 4, 5, 17, 8, 6);
    drawLine(pixels, width, height, 4, 11, 17, 8, 7);
    for (let y = 6; y <= 10; y += 1) setPixel(pixels, width, height, 7, y, 3);
    drawLine(pixels, width, height, 19, 7, 63, 7, 5);
    drawLine(pixels, width, height, 19, 8, 63, 8, 4);
    drawLine(pixels, width, height, 19, 9, 63, 9, 5);
  });
  const hit = writeProxyGif(join(outputDir, 'nu_funnel_hit.gif'), 32, 32, (pixels, width, height) => {
    for (const [x, y] of [[2, 16], [29, 16], [16, 2], [16, 29], [6, 6], [26, 6], [6, 26], [26, 26]]) {
      drawLine(pixels, width, height, 16, 16, x, y, 5);
    }
    for (let y = 12; y <= 20; y += 1) {
      for (let x = 12; x <= 20; x += 1) {
        const distance = Math.abs(x - 16) + Math.abs(y - 16);
        if (distance <= 5) setPixel(pixels, width, height, x, y, distance <= 2 ? 2 : 4);
      }
    }
  });
  const fall = writeProxyGif(join(outputDir, 'nu_funnel_fall.gif'), 32, 20, (pixels, width, height) => {
    drawLine(pixels, width, height, 5, 15, 24, 4, 1);
    drawLine(pixels, width, height, 6, 14, 23, 5, 2);
    drawLine(pixels, width, height, 9, 15, 19, 5, 6);
    setPixel(pixels, width, height, 13, 10, 3);
    setPixel(pixels, width, height, 14, 10, 3);
  });
  const modelPath = join(outputDir, 'nu_funnel_shot.txt');
  const model = `name\t\tnu_funnel_shot
health\t\t1
speed\t\t25
type\t\tnone
grabdistance\t13
hitenemy\t0 0
projectilehit\tobstacle enemy
hostile\t\tobstacle enemy
candamage\tobstacle enemy
shadow\t\t1
gfxshadow\t1
nolife\t\t1
subject_to_screen\t0
subject_to_obstacle\t0
subject_to_platform\t0
subject_to_hole\t0
subject_to_gravity\t0
remove\t\t1
lifespan\t1.5

anim\tidle
\tfollowanim\t1
\tfollowcond\t3
\tloop\t1
\tDelay\t10
\tOffSet\t4 8
\thitflash\tjflash03
\thitfx\tdata/sounds/knife.wav
\tattack3\t0 4 64 8 7 0 1 0 10 25
\tBBox\t0 0 64 16
\tFrame\tdata/chars/nu_gundam/funnel/nu_funnel_shot.gif
\tFrame\tdata/chars/nu_gundam/funnel/nu_funnel_shot.gif
\tFrame\tdata/chars/nu_gundam/funnel/nu_funnel_shot.gif

anim\tfollow1
\tloop\t0
\tDelay\t10
\tOffSet\t16 16
\tFrame\tdata/chars/nu_gundam/funnel/nu_funnel_hit.gif

anim\tfall
\tDelay\t25
\tOffSet\t16 10
\tFrame\tdata/chars/nu_gundam/funnel/nu_funnel_fall.gif

anim\tpain
\tDelay\t10
\tOffSet\t16 16
\tFrame\tdata/chars/nu_gundam/funnel/nu_funnel_hit.gif
`;
  writeFileSync(modelPath, model);
  return {
    status: 'fin-funnel-multi-depth-shot-proxy-not-autonomous-drone',
    model: { output: displayPath(modelPath), name: 'nu_funnel_shot' },
    gifs: [shot, hit, fall],
    behavior: { shotsPerCommand: 6, lifespanSeconds: 1.5, candamage: ['obstacle', 'enemy'] },
  };
}

function buildModelText(options) {
  const sourcePath = templatePath(options, 'chars/huangzhong/huangzhong.txt');
  let text = readFileSync(sourcePath, 'utf8').replaceAll('\\', '/');
  const original = text;
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  text = text.replace(/^(name\s+)huangzhong\s*$/mi, '$1nu_gundam');
  text = text.replace(/data\/chars\/huangzhong\/([^\s]+\.(?:gif))/gi, 'data/chars/nu_gundam/$1');
  text = text.replace(/^onspawnscript\s+data\/scripts\/spawn\/huangzhong\.c\s*$/mi, 'onspawnscript\tdata/scripts/spawn/nu_gundam.c');
  text = text.replace(/^(load\s+gongjx\s*)$/mi, '$1\nload\t\tnu_funnel_shot');
  text = text.replace(/^weapons\s+h1(?:\s+h\d+)+\s*$/mi, '# P0: h1..h16 human weapon variants intentionally disabled');
  text = text.replace(/^hmap\s+1\s+1\s*$/mi, '# P0: no Huangzhong weapon palette map');
  let removedWeaponframes = 0;
  text = text.replace(/^\s*weaponframe\s+.*$/gmi, () => {
    removedWeaponframes += 1;
    return '\t# P0: Huangzhong weaponframe removed';
  });
  if (text === original) throw new Error('ν model transform did not change Huangzhong template');
  if (!/^name\s+nu_gundam\s*$/mi.test(text)) throw new Error('ν model name transform failed');
  if (removedWeaponframes !== 3) throw new Error(`Expected 3 weaponframe removals, got ${removedWeaponframes}`);
  if (/data\/chars\/nu_gundam\/sp\.wav/i.test(text)) {
    throw new Error('Huangzhong-local sp.wav was incorrectly rewritten to a missing ν path');
  }
  if (/^weapons\s+/mi.test(text) || /^hmap\s+/mi.test(text)) {
    throw new Error('Human weapon-switching directives remain active');
  }
  const funnelSpecial = `anim\tfreespecial4
\t@cmd\tcostSelf1 50
\tloop\t0
\tDelay\t8
\tOffSet\t120 107
\tbbox\t98 50 41 57
\t@cmd\tmakeInv 120
\tFrame\tdata/chars/nu_gundam/sp1.GIF
\t@cmd\tshoot "nu_funnel_shot" 52 55 -25
\tDelay\t4
\tFrame\tdata/chars/nu_gundam/sp1.GIF
\t@cmd\tshoot "nu_funnel_shot" 52 52 -15
\tFrame\tdata/chars/nu_gundam/sp1.GIF
\t@cmd\tshoot "nu_funnel_shot" 52 49 -5
\tFrame\tdata/chars/nu_gundam/sp1.GIF
\t@cmd\tshoot "nu_funnel_shot" 52 49 5
\tFrame\tdata/chars/nu_gundam/sp1.GIF
\t@cmd\tshoot "nu_funnel_shot" 52 52 15
\tFrame\tdata/chars/nu_gundam/sp1.GIF
\t@cmd\tshoot "nu_funnel_shot" 52 55 25
\tDelay\t10
\tFrame\tdata/chars/nu_gundam/sp6.GIF
\tOffSet\t71 107
\tDelay\t3
\tFrame\tdata/chars/nu_gundam/attack006.gif
\tOffSet\t82 107
\tbbox\t60 50 41 57
\tDelay\t5
\tFrame\tdata/chars/nu_gundam/idle.gif
\t\t
`;
  const specialPattern = /anim\s+freespecial4\b[\s\S]*?(?=anim\s+freespecial5\b)/i;
  if (!specialPattern.test(text)) throw new Error('Could not locate Huangzhong freespecial4 block');
  text = text.replace(specialPattern, funnelSpecial);
  text = text.replace(/\r?\n/g, newline);
  const outputPath = join(options.outputDir, 'data/chars/nu_gundam/nu_gundam.txt');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, text);

  const spawnPath = join(options.outputDir, 'data/scripts/spawn/nu_gundam.c');
  mkdirSync(dirname(spawnPath), { recursive: true });
  writeFileSync(spawnPath, '#import "data/scripts/levelup/lvup.c"\nvoid main()\n{\n\tsetLevel();\n}\n');
  return {
    model: { source: displayPath(sourcePath), output: displayPath(outputPath), removedWeaponframes },
    spawnScript: { output: displayPath(spawnPath), behavior: 'setLevel-only; no h1..h16 loadmodel calls' },
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  requireCommand('ffmpeg');
  requireCommand('ffprobe');
  if (NU_MAPPING.length !== 71) throw new Error(`Expected 71 ν action frames, got ${NU_MAPPING.length}`);
  for (const [label, path] of [
    ['source directory', options.sourceDir],
    ['keypose manifest', options.keyposeManifest],
    ['base data', options.baseData],
    ['template data', options.templateData],
    ['six-column selection GIF', options.selectionGif],
  ]) {
    if (!existsSync(path)) throw new Error(`Missing ${label}: ${path}`);
  }
  const keyposeManifest = JSON.parse(readFileSync(options.keyposeManifest, 'utf8'));
  if (keyposeManifest.frames?.length !== 16) throw new Error('ν keypose manifest must contain 16 frames');
  if (keyposeManifest.sourceSha256 !== 'ceb788a62ae5ac3c3c09e49e946346b73a96a7d8d3db3ea08e34f8de4e1bcec2') {
    throw new Error(`Unexpected ν v5 storyboard hash: ${keyposeManifest.sourceSha256}`);
  }
  const outputSpriteDir = join(options.outputDir, 'data/chars/nu_gundam');
  mkdirSync(outputSpriteDir, { recursive: true });
  const tempDir = mkdtempSync(join(tmpdir(), 'nu-gundam-p0-'));
  try {
    const frames = NU_MAPPING.map((mapping) => buildGif(mapping, options, outputSpriteDir, tempDir));
    const icon = buildOpaqueUi(options, join(outputSpriteDir, 'icon.GIF'), false, tempDir);
    frames.push(icon);
    const redPath = join(outputSpriteDir, 'red.gif');
    copyFileSync(join(outputSpriteDir, 'idle.gif'), redPath);
    const redTemplate = probeImage(join(options.baseData, 'chars/huangzhong/red.gif'));
    const redVerification = verifyGif(redPath, redTemplate.width, redTemplate.height);
    frames.push({
      output: displayPath(redPath),
      source: displayPath(join(outputSpriteDir, 'idle.gif')),
      identityPalettePrototype: true,
      palette: redVerification,
    });
    const profiles = [
      buildOpaqueUi(options, join(options.outputDir, 'data/profiles/nu_gundam.gif'), false, tempDir),
      buildOpaqueUi(options, join(options.outputDir, 'data/profiles/nu_gundam_m.gif'), true, tempDir),
    ];
    const funnelProxy = buildFinFunnelProxy(options);
    const model = buildModelText(options);
    const clamped = frames.filter((frame) => frame.placement?.alignmentClamped).length;
    const minimumSafeScaleRatio = Math.min(...frames
      .filter((frame) => frame.placement)
      .map((frame) => frame.placement.scaleReduction));
    const manifest = {
      schemaVersion: 1,
      status: 'local-private-nu-gundam-sixth-character-engineering-p0',
      productionReady: false,
      warning: '71 action GIFs reuse 15 ν key poses. Rifle uses proven gong projectile behavior; Fin Funnel entity art/return behavior and production interpolation remain deferred.',
      generatedAt: new Date().toISOString(),
      scope: {
        nuPhysicalGif: frames.length,
        actionGif: 71,
        hudProfiles: profiles.length,
        modelTxt: 1,
        spawnScript: 1,
        finFunnelProxyModel: 1,
        finFunnelProxyGif: funnelProxy.gifs.length,
        clampedPlacements: clamped,
      },
      chromaKey: { ...CHROMA, requiredPaletteIndex: 0 },
      inputs: {
        sourceDir: displayPath(options.sourceDir),
        keyposeManifest: displayPath(options.keyposeManifest),
        keyposeManifestSha256: sha256(options.keyposeManifest),
        selectionGif: displayPath(options.selectionGif),
        selectionGifSha256: sha256(options.selectionGif),
        baseData: displayPath(options.baseData),
        templateData: displayPath(options.templateData),
      },
      placement: {
        mode: 'legacy-foreground-bounds',
        maximumSpriteHeight: options.spriteHeight,
        safeCanvasInset: 1,
        minimumSafeScaleRatio,
      },
      behavior: {
        template: 'huangzhong ranged player',
        retainedProjectileModels: ['gongjx', 'gongjz', 'gongjfp'],
        finFunnelProxy: funnelProxy.behavior,
        retainedLocalSoundPaths: ['data/chars/huangzhong/sp.wav'],
        disabledHumanWeaponVariants: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9', 'h10', 'h11', 'h12', 'h13', 'h14', 'h15', 'h16'],
      },
      frames,
      profiles,
      funnelProxy,
      model,
      deferred: {
        finFunnel: ['autonomous drone deploy/orbit/fire/return/death cleanup', 'target acquisition', '2P entity stress'],
        art: ['mask baked frame-10 saber beam for entity-based FX', 'production in-betweens', '2P palette cleanup'],
        gameplayQa: ['six-step roster cycle', '1P/2P select and Stage 1 spawn', 'bbox/attack box', 'audio replacement'],
      },
    };
    const manifestPath = join(options.outputDir, 'NU-GUNDAM-P0-BUILD-MANIFEST.json');
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`manifest ${displayPath(manifestPath)}`);
    console.log(`ν Gundam P0 complete: ${frames.length} main + ${profiles.length} profiles + model/spawn TXT`);
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
