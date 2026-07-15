#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
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
import { assertExistingPaths, repoRelativeDisplay } from './path-guards.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const EXPECTED_STORYBOARD_SHA256 = '6bb0cb6e71400c827fae31f0e01f2e6de3ad31fbffde014f90ad72356d8c164e';
const DEFAULT_SPRITE_HEIGHT = 108;

function usage() {
  return `Build the Wei Yan Riftbeast/Mecha-Godzilla P0 engineering runtime.

Usage:
  node scripts/build-weiyan-riftbeast-p0-prototype.mjs [options]

Options:
  --source-dir PATH          normalized Riftbeast v2 key poses
  --keypose-manifest PATH    v2 crop/pivot manifest
  --base-data PATH           extracted OpenBOR data directory (read only)
  --template-data PATH       validated merged overlay data
  --selection-gif PATH       six-column 480x276 select.gif
  --output-dir PATH          output overlay root; data/... is appended
  --sprite-height N          maximum standing target (default: 108)
  --help                     show this help

The existing Wei Yan canvases are geometry contracts only. Every canonical
case-sensitive GIF reference is rebuilt around its original foreground
centre/bottom with a one-pixel inset and no hard clamp. Human w1..w16 weapon
switching and blood hitflashes are disabled, while gameplay scripts and the
blackw selection helper remain as temporary engine dependencies.`;
}

function parseArgs(argv) {
  const options = {
    sourceDir: join(REPO_ROOT, 'private_assets/robot_wof/weiyan/keyposes-v2'),
    keyposeManifest: join(REPO_ROOT, 'research/manifests/weiyan-riftbeast-v2-keyposes.json'),
    baseData: join(REPO_ROOT, 'workplace/extracted/data'),
    templateData: join(REPO_ROOT, 'workplace/robot_wof_vertical_slice/overlay/data'),
    selectionGif: join(REPO_ROOT, 'workplace/robot_wof_vertical_slice/overlay/data/bgs/select.gif'),
    outputDir: join(REPO_ROOT, 'workplace/weiyan_riftbeast_p0/overlay'),
    spriteHeight: DEFAULT_SPRITE_HEIGHT,
  };
  const keys = new Map([
    ['--source-dir', 'sourceDir'], ['--keypose-manifest', 'keyposeManifest'],
    ['--base-data', 'baseData'], ['--template-data', 'templateData'],
    ['--selection-gif', 'selectionGif'], ['--output-dir', 'outputDir'],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') { console.log(usage()); process.exit(0); }
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
      pathLabel: 'Wei Yan source directory',
      display: repoRelativeDisplay(REPO_ROOT, options.sourceDir),
      hint: 'This repository does not ship the private source assets; pass --source-dir to an external checkout.',
    },
    {
      path: options.keyposeManifest,
      pathLabel: 'Wei Yan keypose manifest',
      display: repoRelativeDisplay(REPO_ROOT, options.keyposeManifest),
      hint: 'Pass --keypose-manifest to a validated manifest file.',
    },
    {
      path: options.baseData,
      pathLabel: 'base data tree',
      display: repoRelativeDisplay(REPO_ROOT, options.baseData),
      hint: 'Pass --base-data to a staged extracted tree.',
    },
    {
      path: options.templateData,
      pathLabel: 'template data tree',
      display: repoRelativeDisplay(REPO_ROOT, options.templateData),
      hint: 'Pass --template-data to a validated overlay tree.',
    },
    {
      path: options.selectionGif,
      pathLabel: 'selection GIF',
      display: repoRelativeDisplay(REPO_ROOT, options.selectionGif),
      hint: 'Pass --selection-gif to the six-column select runtime GIF.',
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

function walkFiles(root) {
  const files = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  return files;
}

function canonicalGifInventory(options) {
  const root = join(options.baseData, 'chars/weiyan');
  const physical = walkFiles(root).filter((path) => /\.gif$/i.test(path));
  const byFoldedPath = new Map(physical.map((path) => [path.toLowerCase(), path]));
  const modelPath = join(root, 'weiyan.txt');
  const modelText = readFileSync(modelPath, 'latin1');
  const normalizedModelText = modelText.replaceAll('\\', '/');
  const tokens = [...normalizedModelText.matchAll(/data\/chars\/weiyan\/([^\s#;]+\.gif)/gi)]
    .map((match) => match[1].replaceAll('\\', '/'));
  const tokenToCanonical = new Map();
  for (const token of tokens) {
    const absolute = byFoldedPath.get(join(root, token).toLowerCase());
    if (!absolute) throw new Error(`Cannot resolve Wei Yan model GIF case: ${token}`);
    tokenToCanonical.set(token.toLowerCase(), relative(root, absolute).replaceAll('\\', '/'));
  }
  const refs = [...new Set(tokenToCanonical.values())].sort((a, b) => a.localeCompare(b));
  return { modelPath, modelText, tokenToCanonical, refs };
}

function sourceFor(output) {
  const name = basename(output).toLowerCase();
  if (output.toLowerCase().startsWith('news/')) {
    const number = Number((name.match(/\d+/) ?? ['1'])[0]);
    return ['frame-06.png', 'frame-07.png', 'frame-08.png', 'frame-09.png'][number % 4];
  }
  if (name === 'idle.gif') return 'frame-03.png';
  if (/^walk[1-8]\.gif$/.test(name)) return Number(name.match(/\d+/)[0]) % 2 ? 'frame-04.png' : 'frame-05.png';
  if (/^attack(?:1|2)\.gif$/.test(name)) return 'frame-06.png';
  if (/^attack(?:3|4|5)\.gif$/.test(name)) return 'frame-07.png';
  if (/^attack(?:6|7|8|9|10)\.gif$/.test(name)) return 'frame-09.png';
  if (/^block1?\.gif$/.test(name)) return name === 'block1.gif' ? 'frame-03.png' : 'frame-06.png';
  if (/^ssp[1-4]\.gif$/.test(name)) return 'frame-09.png';
  if (/^sp[1-4]\.gif$/.test(name)) return 'frame-08.png';
  if (/^jump(?:1|2|3)\.gif$/.test(name)) return name === 'jump3.gif' ? 'frame-11.png' : 'frame-10.png';
  if (/^jumpa[12]\.gif$/.test(name)) return 'frame-11.png';
  if (/^slide[12]\.gif$/.test(name)) return name === 'slide1.gif' ? 'frame-12.png' : 'frame-11.png';
  if (/^f[1-5]\.gif$/.test(name)) return ['frame-10.png', 'frame-11.png', 'frame-11.png', 'frame-12.png', 'frame-14.png'][Number(name[1]) - 1];
  if (name === 'grab.gif') return 'frame-06.png';
  if (/^graba[1-3]\.gif$/.test(name)) return 'frame-07.png';
  if (/^grabja[1-6]\.gif$/.test(name)) {
    return ['frame-07.png', 'frame-09.png', 'frame-10.png', 'frame-11.png', 'frame-12.png', 'frame-14.png'][Number(name.match(/\d+/)[0]) - 1];
  }
  if (name === 'get.gif') return 'frame-02.png';
  if (/^painx?[12]\.gif$/.test(name)) return 'frame-13.png';
  if (/^fall/.test(name)) return /(?:2|3|4)\.gif$/.test(name) ? 'frame-15.png' : 'frame-14.png';
  if (/^win1?\.gif$/.test(name)) return name === 'win1.gif' ? 'frame-03.png' : 'frame-06.png';
  throw new Error(`No Riftbeast key-pose mapping for ${output}`);
}

function buildGif(output, options, tempDir) {
  const source = sourceFor(output);
  const sourcePath = join(options.sourceDir, source);
  const originalPath = join(options.baseData, 'chars/weiyan', output);
  if (!existsSync(sourcePath)) throw new Error(`Missing Riftbeast key pose: ${sourcePath}`);
  if (!existsSync(originalPath)) throw new Error(`Missing Wei Yan target GIF: ${originalPath}`);
  const image = probeImage(originalPath);
  const pose = analyzePose(sourcePath);
  const originalPose = analyzePose(originalPath);
  const originalCenterX = originalPose.crop.x + originalPose.crop.width / 2;
  const originalBottomY = originalPose.crop.y + originalPose.crop.height - 1;
  const inset = 1;
  const anchor = {
    x: originalCenterX,
    y: Math.min(originalBottomY, image.height - inset - 1),
  };
  const availableWidth = Math.max(1, 2 * Math.min(
    anchor.x - inset,
    image.width - inset - anchor.x,
  ));
  const availableHeight = Math.max(1, anchor.y - inset + 1);
  const requestedScale = Math.min(
    options.spriteHeight / pose.crop.height,
    originalPose.crop.height / pose.crop.height,
  );
  const safeScale = Math.min(requestedScale, availableWidth / pose.crop.width, availableHeight / pose.crop.height);
  if (!(safeScale > 0)) throw new Error(`${output}: no positive safe scale`);
  const outputPath = join(options.outputDir, 'data/chars/weiyan', output);
  mkdirSync(dirname(outputPath), { recursive: true });
  const stem = output.replaceAll('/', '__');
  const composedPath = join(tempDir, `${stem}.png`);
  const paletteDir = join(tempDir, `${stem}-palette`);
  mkdirSync(paletteDir, { recursive: true });
  const correction = { x: 0, y: 0 };
  let placement;
  let verification;
  let ffmpegChromaIndex;
  let outputPose;
  let outputAnchorDelta;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const correctedAnchor = { x: anchor.x + correction.x, y: anchor.y + correction.y };
    placement = makeComposedPng(
      sourcePath,
      composedPath,
      pose,
      { originalPath, canvas: { width: image.width, height: image.height }, offset: correctedAnchor },
      pose.crop.height * safeScale,
      { output, source, anchor: 'center-bottom' },
      false,
    );
    const { pixels, bgraPalette } = palettizeWithFfmpeg(composedPath, image.width, image.height, paletteDir);
    ffmpegChromaIndex = forceChromaAtIndexZero(pixels, bgraPalette);
    writeFileSync(outputPath, encodeGif(image.width, image.height, pixels, bgraPalette));
    verification = verifyGif(outputPath, image.width, image.height);
    outputPose = analyzePose(outputPath);
    const outputAnchor = {
      x: outputPose.crop.x + outputPose.crop.width / 2,
      y: outputPose.crop.y + outputPose.crop.height - 1,
    };
    outputAnchorDelta = { x: outputAnchor.x - originalCenterX, y: outputAnchor.y - originalBottomY };
    if (Math.abs(outputAnchorDelta.x) <= 1 && Math.abs(outputAnchorDelta.y) <= 1) break;
    if (attempt === 2) throw new Error(`${output}: anchor drift ${outputAnchorDelta.x},${outputAnchorDelta.y}`);
    correction.x -= Math.round(outputAnchorDelta.x);
    correction.y -= Math.round(outputAnchorDelta.y);
  }
  placement.mode = 'legacy-foreground-bounds';
  placement.originalForeground = originalPose.crop;
  placement.originalForegroundAnchor = { x: originalCenterX, y: originalBottomY };
  placement.safeCanvasInset = inset;
  placement.requestedScale = requestedScale;
  placement.safeScale = safeScale;
  placement.scaleReduction = requestedScale === 0 ? 1 : safeScale / requestedScale;
  placement.postPaletteAnchorCorrection = correction;
  placement.outputForeground = outputPose.crop;
  placement.outputAnchorDelta = outputAnchorDelta;
  console.log(`built weiyan/${output} ${image.width}x${image.height}`);
  return {
    output: displayPath(outputPath), source: displayPath(sourcePath), template: displayPath(originalPath),
    targetCanvas: { width: image.width, height: image.height }, sourceAnalysis: pose, placement,
    palette: { ffmpegChromaIndexBeforeRemap: ffmpegChromaIndex, ...verification },
  };
}

function buildOpaqueUi(options, outputPath, mirror, tempDir) {
  const filter = `crop=80:118:320:0,scale=35:54:flags=neighbor${mirror ? ',hflip' : ''}`;
  const pngPath = join(tempDir, `${basename(outputPath)}-${mirror ? 'mirror' : 'normal'}.png`);
  renderPng(options.selectionGif, pngPath, { id: basename(outputPath), filter });
  const paletteDir = join(tempDir, `${basename(outputPath)}-${mirror ? 'mirror' : 'normal'}-palette`);
  mkdirSync(paletteDir, { recursive: true });
  const { pixels, bgraPalette, injectedChromaIndex } = palettizeOpaque(pngPath, 35, 54, paletteDir);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, encodeGif(35, 54, pixels, bgraPalette));
  return {
    output: displayPath(outputPath), source: displayPath(options.selectionGif),
    sourceFilter: filter, targetCanvas: { width: 35, height: 54 },
    palette: { injectedChromaIndex, index0UsedByPixels: false, ...verifyGif(outputPath, 35, 54) },
  };
}

function proxyPalette() {
  const bgra = Buffer.alloc(256 * 4, 0);
  const colours = [
    [CHROMA.r, CHROMA.g, CHROMA.b],
    [22, 26, 30], [252, 154, 22], [255, 232, 78],
    [80, 238, 255], [230, 247, 255], [112, 124, 136], [45, 56, 66],
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
  if (x >= 0 && y >= 0 && x < width && y < height) pixels[y * width + x] = colour;
}

function writeProxyGif(path, width, height, draw) {
  const pixels = Buffer.alloc(width * height, 0);
  draw(pixels, width, height);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodeGif(width, height, pixels, proxyPalette()));
  return { output: displayPath(path), canvas: { width, height }, palette: verifyGif(path, width, height) };
}

function buildTailRayProxy(options) {
  const root = join(options.outputDir, 'data/chars/weiyan/tail_ray');
  const shot = writeProxyGif(join(root, 'weiyan_tail_ray.gif'), 52, 16, (pixels, width, height) => {
    const cy = Math.floor(height / 2);
    for (let x = 4; x < width - 4; x += 1) {
      const taper = x < 10 || x > width - 11 ? 1 : 2;
      for (let y = cy - taper; y <= cy + taper; y += 1) setPixel(pixels, width, height, x, y, 3);
      setPixel(pixels, width, height, x, cy, x % 3 ? 2 : 5);
    }
    for (let x = width - 8; x < width - 2; x += 1) {
      setPixel(pixels, width, height, x, cy - 3, 2);
      setPixel(pixels, width, height, x, cy + 3, 2);
    }
  });
  const hit = writeProxyGif(join(root, 'weiyan_tail_hit.gif'), 32, 32, (pixels, width, height) => {
    const cx = 16; const cy = 16;
    for (let radius = 3; radius <= 13; radius += 2) {
      for (let step = 0; step < 16; step += 1) {
        const angle = step * Math.PI / 8;
        setPixel(pixels, width, height, Math.round(cx + Math.cos(angle) * radius), Math.round(cy + Math.sin(angle) * radius), radius % 4 ? 4 : 3);
      }
    }
    for (let d = -5; d <= 5; d += 1) {
      setPixel(pixels, width, height, cx + d, cy, 5);
      setPixel(pixels, width, height, cx, cy + d, 5);
    }
  });
  const fall = writeProxyGif(join(root, 'weiyan_tail_fall.gif'), 28, 20, (pixels, width, height) => {
    for (let y = 5; y < 16; y += 1) {
      const half = Math.max(1, Math.floor((y - 3) / 3));
      for (let x = 14 - half; x <= 14 + half; x += 1) setPixel(pixels, width, height, x, y, y % 2 ? 6 : 7);
    }
    for (let x = 6; x < 23; x += 2) setPixel(pixels, width, height, x, 16 + (x % 3), 2);
  });
  const modelPath = join(root, 'weiyan_tail_ray.txt');
  const modelText = `name weiyan_tail_ray
health 1
speed 22
type none
hitenemy 0 0
projectilehit obstacle enemy
hostile obstacle enemy
candamage obstacle enemy
shadow 1
gfxshadow 1
nolife 1
subject_to_screen 0
subject_to_obstacle 0
subject_to_platform 0
subject_to_hole 0
subject_to_gravity 0
remove 1
lifespan 1.5

anim idle
  followanim 1
  followcond 3
  loop 1
  delay 6
  offset 6 8
  hitflash jflash03
  hitfx data/sounds/whit1.wav
  attack3 2 4 48 9 10 0 1 0 10 20
  bbox 4 5 44 7
  frame data/chars/weiyan/tail_ray/weiyan_tail_ray.gif
  frame data/chars/weiyan/tail_ray/weiyan_tail_ray.gif

anim follow1
  loop 0
  delay 8
  offset 16 16
  bbox 0
  frame data/chars/weiyan/tail_ray/weiyan_tail_hit.gif

anim fall
  loop 0
  delay 10
  offset 14 17
  bbox 0
  frame data/chars/weiyan/tail_ray/weiyan_tail_fall.gif

anim pain
  loop 0
  delay 8
  offset 16 16
  bbox 0
  frame data/chars/weiyan/tail_ray/weiyan_tail_hit.gif
`;
  writeFileSync(modelPath, modelText);
  return {
    model: { name: 'weiyan_tail_ray', output: displayPath(modelPath) },
    gifs: [shot, hit, fall],
    behavior: {
      role: 'P0 tail-cannon engineering proxy; not production beam art',
      candamage: ['obstacle', 'enemy'],
      excludedDamageTargets: ['player', 'npc'],
      lifespanSeconds: 1.5,
    },
  };
}

function buildModelsRegistry(options) {
  const sourcePath = join(options.templateData, 'models.txt');
  let text = readFileSync(sourcePath, 'latin1');
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/).filter((line) => {
    const tokens = line.split('#', 1)[0].trim().split(/\s+/);
    return !(['load', 'know'].includes((tokens[0] ?? '').toLowerCase())
      && (tokens[1] ?? '').toLowerCase() === 'weiyan_tail_ray');
  });
  const index = lines.findIndex((line) => {
    const tokens = line.split('#', 1)[0].trim().split(/\s+/);
    return (tokens[0] ?? '').toLowerCase() === 'load' && (tokens[1] ?? '').toLowerCase() === 'weiyan';
  });
  if (index < 0) throw new Error('Cannot register tail ray: Load weiyan not found');
  lines.splice(index, 0, 'Load\tweiyan_tail_ray\tdata/chars/weiyan/tail_ray/weiyan_tail_ray.txt');
  const outputPath = join(options.outputDir, 'data/models.txt');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, Buffer.from(lines.join(newline), 'latin1'));
  return { source: displayPath(sourcePath), output: displayPath(outputPath), name: 'weiyan_tail_ray' };
}

function buildModel(options, inventory) {
  const newline = inventory.modelText.includes('\r\n') ? '\r\n' : '\n';
  let text = inventory.modelText.replaceAll('\\', '/');
  text = text.replace(/data\/chars\/weiyan\/([^\s#;]+\.gif)/gi, (full, token) => {
    const canonical = inventory.tokenToCanonical.get(token.toLowerCase());
    if (!canonical) throw new Error(`Model rewrite cannot resolve ${token}`);
    return `data/chars/weiyan/${canonical}`;
  });
  text = text.replace(/^weapons\s+w1(?:\s+w\d+)+\s*$/gmi, '# P0: w1..w16 human weapon variants intentionally disabled');
  text = text.replace(/^hmap\s+1\s+1\s*$/gmi, '# P0: no human weapon palette map');
  let removedWeaponframes = 0;
  text = text.replace(/^[\t ]*weaponframe[\t ]+.*$/gmi, () => {
    removedWeaponframes += 1;
    return '\t# P0: human weaponframe removed';
  });
  let mechanicalHitflashRewrites = 0;
  text = text.replace(/^([\t ]*hitflash[\t ]+)blood1[\t ]*$/gmi, (_, prefix) => {
    mechanicalHitflashRewrites += 1;
    return `${prefix}flashb`;
  });
  let mechanicalHitfxRewrites = 0;
  text = text.replace(/^([\t ]*hitfx[\t ]+)data\/sounds\/knife\d*\.wav[\t ]*$/gmi, (_, prefix) => {
    mechanicalHitfxRewrites += 1;
    return `${prefix}data/sounds/whit1.wav`;
  });
  let characterVoiceRewrites = 0;
  text = text.replace(/^([\t ]*sound[\t ]+)data\/chars\/(?:weiyan|zhangfei|guanyu)\/[^\s#]+\.wav[\t ]*$/gmi, (_, prefix) => {
    characterVoiceRewrites += 1;
    return `${prefix}data/sounds/rock.wav`;
  });
  text = text.replace(/^(alternatepal\s+data\/chars\/weiyan\/red\.gif\s*)$/mi, '$1\ndiesound\tdata/sounds/rock.wav');
  const tailRaySpecial = `anim\tfreespecial4
\t@cmd\tcostSelf 20
\tloop\t0
\tDelay\t8
\tOffSet\t87 109
\tbbox\t64 51 36 58
\t@cmd\tmakeInv 100
\tFrame\tdata/chars/weiyan/sp1.GIF
\t@cmd\tshoot "weiyan_tail_ray" 68 55 0
\tDelay\t6
\tFrame\tdata/chars/weiyan/attack9.GIF
\tDelay\t10
\tFrame\tdata/chars/weiyan/idle.gif
\t\t
`;
  const specialPattern = /anim\s+freespecial4\b[\s\S]*?(?=anim\s+freespecial5\b)/i;
  if (!specialPattern.test(text)) throw new Error('Could not locate Wei Yan freespecial4 block');
  text = text.replace(specialPattern, tailRaySpecial);
  if (removedWeaponframes !== 3) throw new Error(`Expected 3 weaponframe removals, got ${removedWeaponframes}`);
  if (mechanicalHitflashRewrites !== 3) {
    throw new Error(`Expected 3 blood1 hitflash rewrites, got ${mechanicalHitflashRewrites}`);
  }
  if (mechanicalHitfxRewrites !== 16) {
    throw new Error(`Expected 16 knife hitfx rewrites, got ${mechanicalHitfxRewrites}`);
  }
  if (characterVoiceRewrites !== 15) {
    throw new Error(`Expected 15 character voice rewrites, got ${characterVoiceRewrites}`);
  }
  if (/^weapons\s+/mi.test(text) || /^hmap\s+/mi.test(text) || /^[\t ]*weaponframe[\t ]+/mi.test(text)) {
    throw new Error('Human weapon-switching directives remain active');
  }
  text = text.replace(/\r?\n/g, newline);
  const modelPath = join(options.outputDir, 'data/chars/weiyan/weiyan.txt');
  mkdirSync(dirname(modelPath), { recursive: true });
  writeFileSync(modelPath, Buffer.from(text, 'latin1'));
  const spawnPath = join(options.outputDir, 'data/scripts/spawn/weiyan.c');
  mkdirSync(dirname(spawnPath), { recursive: true });
  writeFileSync(spawnPath, '#import "data/scripts/levelup/lvup.c"\nvoid main()\n{\n\tsetLevel();\n}\n');
  return {
    model: {
      output: displayPath(modelPath), removedWeaponframes, mechanicalHitflashRewrites,
      mechanicalHitfxRewrites, characterVoiceRewrites, diesoundOverride: 'data/sounds/rock.wav',
    },
    spawnScript: { output: displayPath(spawnPath), behavior: 'setLevel-only; no w1..w16 loadmodel calls' },
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  requireCommand('ffmpeg');
  requireCommand('ffprobe');
  for (const [label, path] of [
    ['source directory', options.sourceDir], ['keypose manifest', options.keyposeManifest],
    ['base data', options.baseData], ['template data', options.templateData],
    ['six-column selection GIF', options.selectionGif],
  ]) {
    if (!existsSync(path)) throw new Error(`Missing ${label}: ${path}`);
  }
  const keyposeManifest = JSON.parse(readFileSync(options.keyposeManifest, 'utf8'));
  if (keyposeManifest.frames?.length !== 16) throw new Error('Riftbeast keypose manifest must contain 16 frames');
  if (keyposeManifest.sourceSha256 !== EXPECTED_STORYBOARD_SHA256) {
    throw new Error(`Unexpected Riftbeast v2 storyboard hash: ${keyposeManifest.sourceSha256}`);
  }
  const inventory = canonicalGifInventory(options);
  const actions = inventory.refs.filter((path) => !['icon.gif', 'red.gif'].includes(path.toLowerCase()));
  if (actions.length !== 84) throw new Error(`Expected 84 canonical action GIFs, got ${actions.length}`);
  const tempDir = mkdtempSync(join(tmpdir(), 'weiyan-riftbeast-p0-'));
  try {
    const frames = actions.map((output) => buildGif(output, options, tempDir));
    const icon = buildOpaqueUi(options, join(options.outputDir, 'data/chars/weiyan/icon.gif'), false, tempDir);
    const redPath = join(options.outputDir, 'data/chars/weiyan/red.gif');
    copyFileSync(join(options.outputDir, 'data/chars/weiyan/idle.gif'), redPath);
    const redTemplate = probeImage(join(options.baseData, 'chars/weiyan/red.gif'));
    const red = {
      output: displayPath(redPath), identityPalettePrototype: true,
      palette: verifyGif(redPath, redTemplate.width, redTemplate.height),
    };
    const profiles = [
      buildOpaqueUi(options, join(options.outputDir, 'data/profiles/weiyan.gif'), false, tempDir),
      buildOpaqueUi(options, join(options.outputDir, 'data/profiles/weiyan_m.gif'), true, tempDir),
    ];
    const model = buildModel(options, inventory);
    const tailRayProxy = buildTailRayProxy(options);
    const modelsRegistry = buildModelsRegistry(options);
    const minimumSafeScaleRatio = Math.min(...frames.map((frame) => frame.placement.scaleReduction));
    const manifest = {
      schemaVersion: 1,
      status: 'local-private-weiyan-riftbeast-engineering-p0',
      productionReady: false,
      warning: '84 action GIFs reuse 15 Riftbeast key poses. Tail cannon art, claw arcs, autonomous projectiles, final sound design and production interpolation remain deferred.',
      generatedAt: new Date().toISOString(),
      scope: {
        actionGif: frames.length,
        mainModelGifRefs: frames.length + 2,
        hudProfiles: profiles.length,
        modelTxt: 1,
        spawnScript: 1,
        tailRayModel: 1,
        tailRayGif: tailRayProxy.gifs.length,
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
        mode: 'legacy-foreground-bounds', maximumSpriteHeight: options.spriteHeight,
        safeCanvasInset: 1, minimumSafeScaleRatio,
      },
      behavior: {
        retainedLoadDependencies: ['blackw'],
        retainedScripts: ['data/scripts/didhit/guanyu.c', 'data/scripts/block/guanyu.c', 'data/scripts/main/huangzhong.c'],
        disabledHumanWeaponVariants: Array.from({ length: 16 }, (_, index) => `w${index + 1}`),
        mechanicalHitflashRewrites: 3,
        tailRayProxy: tailRayProxy.behavior,
      },
      frames,
      icon,
      red,
      profiles,
      model,
      tailRayProxy,
      modelsRegistry,
      deferred: [
        'production in-between animation and tail continuity',
        'separate tail-cannon projectile and local claw/ground FX entities',
        'original mechanical audio and removal of cross-player script placeholders',
        'visible selection, Stage 1 spawn, BBox/attack box and 1P/2P gameplay QA',
        'w1..w16 variants and mounted form',
      ],
    };
    const manifestPath = join(options.outputDir, 'WEIYAN-RIFTBEAST-P0-BUILD-MANIFEST.json');
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`manifest ${displayPath(manifestPath)}`);
    console.log(`Wei Yan Riftbeast P0 complete: ${frames.length + 2} main + ${profiles.length} profiles + model/spawn TXT`);
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
