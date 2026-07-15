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
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
export const CHROMA = Object.freeze({ r: 252, g: 0, b: 255, hex: '#FC00FF' });
const FOREGROUND_DISTANCE = 24;
const DEFAULT_SPRITE_HEIGHT = 96;

// The concept sheet only has four distinct walk poses. Reusing them makes a
// runnable alignment prototype; it is deliberately not presented as final art.
const PROTOTYPE_MAPPING = Object.freeze([
  { output: 'idle00.gif', source: 'frame-01.png', animation: 'idle' },
  { output: 'walk01.gif', source: 'frame-03.png', animation: 'walk' },
  { output: 'walk02.gif', source: 'frame-04.png', animation: 'walk' },
  { output: 'walk03.gif', source: 'frame-05.png', animation: 'walk' },
  { output: 'walk04.gif', source: 'frame-06.png', animation: 'walk' },
  { output: 'walk05.gif', source: 'frame-03.png', animation: 'walk' },
  { output: 'walk06.gif', source: 'frame-04.png', animation: 'walk' },
  { output: 'walk07.gif', source: 'frame-05.png', animation: 'walk' },
  { output: 'walk08.gif', source: 'frame-06.png', animation: 'walk' },
]);

// Playable engineering coverage for every physical GIF used by the 42
// case-sensitive P0 references. These entries deliberately reuse the twelve
// concept poses; BUILD-MANIFEST.json records each reuse for later redrawing.
const FULL_P0_MAPPING = Object.freeze([
  ...PROTOTYPE_MAPPING,
  { output: 'idle001.gif', source: 'frame-02.png', animation: 'waiting' },
  { output: 'punch001.gif', source: 'frame-02.png', animation: 'attack1' },
  { output: 'punch002.gif', source: 'frame-07.png', animation: 'attack1' },
  { output: 'punch003.gif', source: 'frame-02.png', animation: 'attack2' },
  { output: 'punch004.gif', source: 'frame-07.png', animation: 'attack2' },
  { output: 'punch005.gif', source: 'frame-02.png', animation: 'attack2' },
  { output: 'punch006.gif', source: 'frame-08.png', animation: 'attack3' },
  { output: 'punch007.gif', source: 'frame-08.png', animation: 'attack3' },
  { output: 'block2.GIF', modelFile: 'block2.gif', source: 'frame-09.png', animation: 'attackbackward' },
  { output: 'block1.GIF', modelFile: 'block1.gif', source: 'frame-09.png', animation: 'attackbackward' },
  { output: 'block0.GIF', modelFile: 'block0.gif', source: 'frame-02.png', animation: 'attackbackward' },
  { output: 'spec001.gif', source: 'frame-09.png', animation: 'slide' },
  { output: 'spec002.gif', source: 'frame-07.png', animation: 'slide' },
  { output: 'spec003.gif', source: 'frame-10.png', animation: 'slide' },
  { output: 'jump2.GIF', modelFile: 'jump2.gif', source: 'frame-03.png', animation: 'jump' },
  { output: 'jump3.GIF', modelFile: 'jump3.gif', source: 'frame-04.png', animation: 'jump' },
  { output: 'jk001.gif', source: 'frame-08.png', animation: 'jumpattack' },
  { output: 'jump1.GIF', modelFile: 'jump1.gif', source: 'frame-01.png', animation: 'jumpdelay' },
  { output: 'jump02.gif', source: 'frame-05.png', animation: 'jumpforward' },
  { output: 'jk002.gif', source: 'frame-10.png', animation: 'jumpforward' },
  { output: 'fallf1.GIF', modelFile: 'fallf1.gif', source: 'frame-11.png', animation: 'bdie' },
  { output: 'fallx2.GIF', modelFile: 'fallx2.gif', source: 'frame-12.png', animation: 'bdie', anchor: 'center-bottom' },
  { output: 'fall2.gif', source: 'frame-12.png', animation: 'death', anchor: 'center-bottom' },
  { output: 'fallx3.GIF', modelFile: 'fallx3.gif', source: 'frame-12.png', animation: 'bdie', anchor: 'center-bottom' },
  { output: 'fall3.gif', source: 'frame-12.png', animation: 'death', anchor: 'center-bottom' },
  { output: 'pain2.gif', source: 'frame-11.png', animation: 'pain2' },
  { output: 'fall1.gif', source: 'frame-12.png', animation: 'death', anchor: 'center-bottom' },
  { output: 'fallx.GIF', source: 'frame-11.png', animation: 'fall7' },
  { output: 'pain1.gif', source: 'frame-11.png', animation: 'pain' },
  { output: 'fallr.GIF', source: 'frame-12.png', animation: 'fall7', anchor: 'center-bottom' },
  { output: 'fall004.gif', source: 'frame-12.png', animation: 'rise', anchor: 'center-bottom' },
  { output: 'fallx1.GIF', modelFile: 'fallx1.gif', source: 'frame-11.png', animation: 'sdie' },
]);

function usage() {
  return `Build a local-only Mazinger P0 alignment prototype.

Usage:
  node scripts/build-mazinger-p0-prototype.mjs [options]

Options:
  --source-dir PATH     12 keyed PNG cells (default: workplace vertical slice)
  --extracted-dir PATH  extracted Zhangfei directory (read-only input)
  --output-dir PATH     output root (default: private_assets/...)
  --sprite-height N     visible robot height in pixels (default: 96)
  --scope NAME          basic or full-p0 (default: basic)
  --help                show this help

The basic scope writes idle00.gif and walk01.gif..walk08.gif. full-p0 writes
all 41 physical GIF files required by the 42 P0 model references. It never
writes to workplace/extracted.`;
}

function parseArgs(argv) {
  const options = {
    sourceDir: join(
      REPO_ROOT,
      'workplace/robot_wof_vertical_slice/source/mazinger/keyposes',
    ),
    extractedDir: join(REPO_ROOT, 'workplace/extracted/data/chars/zhangfei'),
    outputDir: join(
      REPO_ROOT,
      'private_assets/robot_wof/mazinger-p0-prototype',
    ),
    spriteHeight: DEFAULT_SPRITE_HEIGHT,
    scope: 'basic',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') {
      console.log(usage());
      process.exit(0);
    }
    const value = argv[index + 1];
    if (argument === '--source-dir' || argument === '--extracted-dir' || argument === '--output-dir') {
      if (!value) throw new Error(`${argument} requires a path`);
      const key = {
        '--source-dir': 'sourceDir',
        '--extracted-dir': 'extractedDir',
        '--output-dir': 'outputDir',
      }[argument];
      options[key] = resolve(value);
      index += 1;
      continue;
    }
    if (argument === '--sprite-height') {
      if (!value || !/^\d+$/.test(value)) {
        throw new Error('--sprite-height requires a positive integer');
      }
      options.spriteHeight = Number(value);
      if (options.spriteHeight < 16 || options.spriteHeight > 256) {
        throw new Error('--sprite-height must be between 16 and 256');
      }
      index += 1;
      continue;
    }
    if (argument === '--scope') {
      if (value !== 'basic' && value !== 'full-p0') {
        throw new Error('--scope must be basic or full-p0');
      }
      options.scope = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }

  const extractedRoot = resolve(REPO_ROOT, 'workplace/extracted');
  if (options.outputDir === extractedRoot || options.outputDir.startsWith(`${extractedRoot}/`)) {
    throw new Error('Refusing to write output inside workplace/extracted');
  }
  return options;
}

function run(binary, args, { binaryStdout = false } = {}) {
  const result = spawnSync(binary, args, {
    encoding: binaryStdout ? null : 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  });
  // Some managed sandboxes report EPERM metadata even when the child exited 0.
  // The exit status and output remain authoritative in that environment.
  if (result.error && result.status === null) throw result.error;
  if (result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr)
      ? result.stderr.toString('utf8')
      : result.stderr;
    throw new Error(`${binary} failed (${result.status}):\n${stderr}`);
  }
  return result.stdout;
}

function requireCommand(binary) {
  const result = spawnSync(binary, ['-version'], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${binary} is required but was not found`);
  }
}

export function probeImage(path) {
  const stdout = run('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,pix_fmt',
    '-of', 'json',
    path,
  ]);
  const stream = JSON.parse(stdout).streams?.[0];
  if (!stream?.width || !stream?.height) {
    throw new Error(`Could not probe image dimensions: ${path}`);
  }
  return stream;
}

function readRgb24(path, width, height) {
  const bytes = run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-i', path,
    '-frames:v', '1',
    '-f', 'rawvideo',
    '-pix_fmt', 'rgb24',
    'pipe:1',
  ], { binaryStdout: true });
  const expected = width * height * 3;
  if (bytes.length !== expected) {
    throw new Error(`Unexpected RGB byte count for ${path}: ${bytes.length}, expected ${expected}`);
  }
  return bytes;
}

function isForeground(r, g, b) {
  const dr = r - CHROMA.r;
  const dg = g - CHROMA.g;
  const db = b - CHROMA.b;
  return dr * dr + dg * dg + db * db > FOREGROUND_DISTANCE ** 2;
}

export function analyzePose(path) {
  const { width, height } = probeImage(path);
  const rgb = readRgb24(path, width, height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const position = (y * width + x) * 3;
      if (!isForeground(rgb[position], rgb[position + 1], rgb[position + 2])) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) throw new Error(`No foreground pixels found in ${path}`);

  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  const bandHeight = Math.max(3, Math.round(cropHeight * 0.08));
  const bandTop = Math.max(minY, maxY - bandHeight + 1);
  let footMinX = width;
  let footMaxX = -1;
  for (let y = bandTop; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const position = (y * width + x) * 3;
      if (!isForeground(rgb[position], rgb[position + 1], rgb[position + 2])) continue;
      footMinX = Math.min(footMinX, x);
      footMaxX = Math.max(footMaxX, x);
    }
  }
  if (footMaxX < 0) {
    throw new Error(`Could not find a foot contact band in ${path}`);
  }

  return {
    sourceCanvas: { width, height },
    crop: { x: minX, y: minY, width: cropWidth, height: cropHeight },
    sourceFootAnchorX: (footMinX + footMaxX) / 2,
    footBand: { y: bandTop, minX: footMinX, maxX: footMaxX },
  };
}

function parseModelFrames(modelPath) {
  const lines = readFileSync(modelPath, 'utf8').split(/\r?\n/);
  const records = [];
  let animation = null;
  let offset = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const fields = line.split(/\s+/);
    const command = fields[0].toLowerCase();
    if (command === 'anim') {
      animation = fields[1]?.toLowerCase() ?? null;
      offset = null;
    } else if (command === 'offset') {
      offset = { x: Number(fields[1]), y: Number(fields[2]) };
    } else if (command === 'frame' && fields[1] && fields[1].toLowerCase() !== 'none') {
      records.push({ animation, offset, file: basename(fields[1].replaceAll('\\', '/')) });
    }
  }
  return records;
}

function targetMetadata(extractedDir, modelRecords, mapping) {
  const modelFile = mapping.modelFile ?? mapping.output;
  const exact = modelRecords.find(
    (record) => record.animation === mapping.animation && record.file === modelFile,
  );
  if (!exact?.offset) {
    throw new Error(`No ${mapping.animation} Offset found for ${modelFile} in zhangfei.txt`);
  }
  const originalPath = join(extractedDir, mapping.output);
  if (!existsSync(originalPath)) {
    throw new Error(`Original target GIF is missing: ${originalPath}`);
  }
  const image = probeImage(originalPath);
  return {
    originalPath,
    canvas: { width: image.width, height: image.height },
    offset: exact.offset,
  };
}

export function makeComposedPng(sourcePath, outputPath, pose, target, spriteHeight, mapping, allowClamping) {
  const requestedScale = spriteHeight / pose.crop.height;
  const fitScale = Math.min(
    requestedScale,
    (target.canvas.width - 2) / pose.crop.width,
    (target.canvas.height - 2) / pose.crop.height,
  );
  const scaledHeight = Math.max(1, Math.round(pose.crop.height * fitScale));
  const scaledWidth = Math.max(1, Math.round(pose.crop.width * fitScale));
  const sourceAnchorInCrop = mapping.sourceAnchor
    ? mapping.sourceAnchor.x - pose.crop.x
    : mapping.anchor === 'center-bottom'
      ? pose.crop.width / 2
      : pose.sourceFootAnchorX - pose.crop.x;
  const scaledAnchorX = sourceAnchorInCrop * (scaledWidth / pose.crop.width);
  const scaledAnchorY = mapping.sourceAnchor
    ? (mapping.sourceAnchor.y - pose.crop.y) * (scaledHeight / pose.crop.height)
    : scaledHeight - 1;
  const requestedX = Math.round(target.offset.x - scaledAnchorX);
  const requestedY = Math.round(target.offset.y - scaledAnchorY);
  const x = allowClamping
    ? Math.max(0, Math.min(requestedX, target.canvas.width - scaledWidth))
    : requestedX;
  const y = allowClamping
    ? Math.max(0, Math.min(requestedY, target.canvas.height - scaledHeight))
    : requestedY;

  if (x < 0 || y < 0 || x + scaledWidth > target.canvas.width || y + scaledHeight > target.canvas.height) {
    throw new Error(
      `Aligned sprite does not fit ${target.canvas.width}x${target.canvas.height}: ` +
      `${scaledWidth}x${scaledHeight} at (${x},${y}). Lower --sprite-height.`,
    );
  }

  const filter = [
    `crop=${pose.crop.width}:${pose.crop.height}:${pose.crop.x}:${pose.crop.y}`,
    `scale=${scaledWidth}:${scaledHeight}:flags=neighbor`,
    `pad=${target.canvas.width}:${target.canvas.height}:${x}:${y}:color=0x${CHROMA.hex.slice(1)}`,
    'format=rgb24',
  ].join(',');
  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', sourcePath,
    '-vf', filter,
    '-frames:v', '1',
    outputPath,
  ]);
  return {
    scale: fitScale,
    requestedScale,
    scaledWidth,
    scaledHeight,
    x,
    y,
    requestedX,
    requestedY,
    anchor: mapping.sourceAnchor ? 'explicit-source-pivot' : mapping.anchor ?? 'foot-contact',
    alignmentClamped: x !== requestedX || y !== requestedY,
    scaledAnchorX,
    scaledAnchorY,
  };
}

export function palettizeWithFfmpeg(composedPath, width, height, tempDir) {
  const palettePath = join(tempDir, 'palette.rgba');
  const palette = run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-i', composedPath,
    '-vf', 'palettegen=reserve_transparent=0:max_colors=256',
    '-frames:v', '1',
    '-f', 'rawvideo', '-pix_fmt', 'rgba',
    'pipe:1',
  ], { binaryStdout: true });
  if (palette.length !== 16 * 16 * 4) {
    throw new Error(`ffmpeg returned an unexpected palette size: ${palette.length}`);
  }
  writeFileSync(palettePath, palette);

  const pal8 = run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-i', composedPath,
    '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', '16x16',
    '-framerate', '1', '-i', palettePath,
    '-filter_complex', '[0:v][1:v]paletteuse=dither=none',
    '-frames:v', '1',
    '-f', 'rawvideo', '-pix_fmt', 'pal8',
    'pipe:1',
  ], { binaryStdout: true });
  const expected = width * height + 256 * 4;
  if (pal8.length !== expected) {
    throw new Error(`ffmpeg returned ${pal8.length} pal8 bytes; expected ${expected}`);
  }
  return {
    pixels: Buffer.from(pal8.subarray(0, width * height)),
    bgraPalette: Buffer.from(pal8.subarray(width * height)),
  };
}

export function forceChromaAtIndexZero(pixels, bgraPalette) {
  let chromaIndex = -1;
  for (let index = 0; index < 256; index += 1) {
    const start = index * 4;
    if (
      bgraPalette[start] === CHROMA.b &&
      bgraPalette[start + 1] === CHROMA.g &&
      bgraPalette[start + 2] === CHROMA.r
    ) {
      chromaIndex = index;
      break;
    }
  }
  if (chromaIndex < 0) {
    throw new Error(
      `ffmpeg palette does not contain exact ${CHROMA.hex}; refusing to emit a non-conforming GIF`,
    );
  }

  if (chromaIndex !== 0) {
    for (let byte = 0; byte < 4; byte += 1) {
      const left = byte;
      const right = chromaIndex * 4 + byte;
      const swap = bgraPalette[left];
      bgraPalette[left] = bgraPalette[right];
      bgraPalette[right] = swap;
    }
    for (let index = 0; index < pixels.length; index += 1) {
      if (pixels[index] === 0) pixels[index] = chromaIndex;
      else if (pixels[index] === chromaIndex) pixels[index] = 0;
    }
  }
  return chromaIndex;
}

function littleEndian16(value) {
  const bytes = Buffer.alloc(2);
  bytes.writeUInt16LE(value);
  return bytes;
}

// A clear code every 200 pixels keeps all codes at nine bits. This is larger
// than dictionary-compressed LZW but simple, deterministic and valid for these
// small, single-frame OpenBOR sprites.
function encodeLiteralLzw(pixels) {
  const CLEAR = 256;
  const END = 257;
  const codes = [];
  for (let start = 0; start < pixels.length; start += 200) {
    codes.push(CLEAR);
    const end = Math.min(start + 200, pixels.length);
    for (let index = start; index < end; index += 1) codes.push(pixels[index]);
  }
  codes.push(END);

  const bytes = [];
  let accumulator = 0;
  let bitCount = 0;
  for (const code of codes) {
    accumulator |= code << bitCount;
    bitCount += 9;
    while (bitCount >= 8) {
      bytes.push(accumulator & 0xff);
      accumulator >>>= 8;
      bitCount -= 8;
    }
  }
  if (bitCount > 0) bytes.push(accumulator & 0xff);
  return Buffer.from(bytes);
}

export function encodeGif(width, height, pixels, bgraPalette) {
  const rgbPalette = Buffer.alloc(256 * 3);
  for (let index = 0; index < 256; index += 1) {
    rgbPalette[index * 3] = bgraPalette[index * 4 + 2];
    rgbPalette[index * 3 + 1] = bgraPalette[index * 4 + 1];
    rgbPalette[index * 3 + 2] = bgraPalette[index * 4];
  }
  const compressed = encodeLiteralLzw(pixels);
  const blocks = [];
  for (let start = 0; start < compressed.length; start += 255) {
    const block = compressed.subarray(start, Math.min(start + 255, compressed.length));
    blocks.push(Buffer.from([block.length]), block);
  }
  blocks.push(Buffer.from([0]));

  return Buffer.concat([
    Buffer.from('GIF89a', 'ascii'),
    littleEndian16(width), littleEndian16(height),
    Buffer.from([0xf7, 0x00, 0x00]),
    rgbPalette,
    Buffer.from([0x2c]),
    littleEndian16(0), littleEndian16(0), littleEndian16(width), littleEndian16(height),
    Buffer.from([0x00, 0x08]),
    ...blocks,
    Buffer.from([0x3b]),
  ]);
}

export function verifyGif(path, expectedWidth, expectedHeight) {
  const bytes = readFileSync(path);
  if (bytes.subarray(0, 6).toString('ascii') !== 'GIF89a') {
    throw new Error(`${path} is not the expected GIF89a output`);
  }
  if (bytes.readUInt16LE(6) !== expectedWidth || bytes.readUInt16LE(8) !== expectedHeight) {
    throw new Error(`${path} canvas does not match the original GIF`);
  }
  const packed = bytes[10];
  if ((packed & 0x80) === 0) throw new Error(`${path} has no global indexed palette`);
  const palette0 = [bytes[13], bytes[14], bytes[15]];
  if (palette0[0] !== CHROMA.r || palette0[1] !== CHROMA.g || palette0[2] !== CHROMA.b) {
    throw new Error(`${path} palette index 0 is not ${CHROMA.hex}`);
  }
  const hasTransparencyExtension = bytes.indexOf(Buffer.from([0x21, 0xf9, 0x04])) >= 0;
  if (hasTransparencyExtension) {
    throw new Error(`${path} unexpectedly contains a GIF transparency extension`);
  }
  const probe = probeImage(path);
  if (probe.width !== expectedWidth || probe.height !== expectedHeight) {
    throw new Error(`ffprobe could not decode ${path} at the expected dimensions`);
  }
  return { paletteIndex0: CHROMA.hex, indexedPalette: true, transparencyExtension: false };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  requireCommand('ffmpeg');
  requireCommand('ffprobe');
  const modelPath = join(options.extractedDir, 'zhangfei.txt');
  if (!existsSync(modelPath)) throw new Error(`Missing model input: ${modelPath}`);
  const activeMapping = options.scope === 'full-p0' ? FULL_P0_MAPPING : PROTOTYPE_MAPPING;
  for (const mapping of activeMapping) {
    const sourcePath = join(options.sourceDir, mapping.source);
    if (!existsSync(sourcePath)) throw new Error(`Missing key pose input: ${sourcePath}`);
  }

  const outputSpriteDir = join(options.outputDir, 'data/chars/zhangfei');
  mkdirSync(outputSpriteDir, { recursive: true });
  const tempDir = mkdtempSync(join(tmpdir(), 'mazinger-p0-'));
  const modelRecords = parseModelFrames(modelPath);
  const results = [];

  try {
    for (const mapping of activeMapping) {
      const sourcePath = join(options.sourceDir, mapping.source);
      const outputPath = join(outputSpriteDir, mapping.output);
      const pose = analyzePose(sourcePath);
      const target = targetMetadata(options.extractedDir, modelRecords, mapping);
      const composedPath = join(tempDir, `${mapping.output}.png`);
      const placement = makeComposedPng(
        sourcePath,
        composedPath,
        pose,
        target,
        options.spriteHeight,
        mapping,
        options.scope === 'full-p0',
      );
      const { pixels, bgraPalette } = palettizeWithFfmpeg(
        composedPath,
        target.canvas.width,
        target.canvas.height,
        tempDir,
      );
      const ffmpegChromaIndex = forceChromaAtIndexZero(pixels, bgraPalette);
      writeFileSync(
        outputPath,
        encodeGif(target.canvas.width, target.canvas.height, pixels, bgraPalette),
      );
      const verification = verifyGif(outputPath, target.canvas.width, target.canvas.height);
      results.push({
        output: outputPath.slice(REPO_ROOT.length + 1),
        source: sourcePath.slice(REPO_ROOT.length + 1),
        animation: mapping.animation,
        modelReference: mapping.modelFile ?? mapping.output,
        prototypePoseReuse: activeMapping.filter((item) => item.source === mapping.source).length > 1,
        sourceAnalysis: pose,
        targetCanvas: target.canvas,
        targetOffset: target.offset,
        placement,
        palette: {
          ffmpegChromaIndexBeforeRemap: ffmpegChromaIndex,
          ...verification,
        },
      });
      console.log(`built ${mapping.output} (${target.canvas.width}x${target.canvas.height}, Offset ${target.offset.x},${target.offset.y})`);
    }

    const manifest = {
      schemaVersion: 1,
      status: 'local-private-prototype',
      productionReady: false,
      scope: options.scope,
      warning: options.scope === 'full-p0'
        ? 'Playable engineering coverage only: 12 concept poses are reused across 41 physical P0 GIFs. Redraw every reused transition before release.'
        : 'walk05..walk08 reuse the four available walk key poses; redraw a true eight-frame gait before release.',
      generatedAt: new Date().toISOString(),
      chromaKey: { ...CHROMA, requiredPaletteIndex: 0 },
      spriteHeight: options.spriteHeight,
      inputs: {
        sourceDir: options.sourceDir.slice(REPO_ROOT.length + 1),
        extractedDir: options.extractedDir.slice(REPO_ROOT.length + 1),
        model: modelPath.slice(REPO_ROOT.length + 1),
      },
      frames: results,
    };
    const manifestPath = join(options.outputDir, 'BUILD-MANIFEST.json');
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`manifest ${manifestPath}`);
    console.log('prototype complete: extracted inputs were not modified');
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
