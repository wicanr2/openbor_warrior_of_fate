#!/usr/bin/env node

// Builds a visible, original Stage01 background package from a private source.
// The source art is deliberately external to this public repository; this
// script contains no game artwork and may be committed safely.

import { createHash } from 'node:crypto';
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  palettizeWithFfmpeg, forceChromaAtIndexZero, encodeGif, verifyGif,
} from './build-mazinger-p0-prototype.mjs';

const CHROMA = '#FC00FF';
const CANONICAL = { width: 2172, height: 724 };
const LAYERS = [
  { file: 'S2.gif', width: 2600, height: 276, crop: [0, 0, 2172, 230], role: 'distant background' },
  { file: 'panel.gif', width: 2429, height: 276, crop: [0, 250, 2172, 247], role: 'walkable arena' },
  { file: 'f.GIF', width: 2429, height: 272, crop: [0, 452, 2172, 244], role: 'foreground occlusion', mask: true },
];

function usage() {
  console.log(`Usage: node scripts/build-stage01-production-background.mjs --source SOURCE --output-dir DIR [--foreground-source PNG] [--foreground-mask MASK]

Generates original, visible Stage01 S2/panel/f.GIF layers. The foreground
mask supplies only opacity; no original artwork is copied. All output GIFs
are indexed and have ${CHROMA} at palette index 0 without a GIF transparency extension.`);
}

function command(binary, args) {
  const result = spawnSync(binary, args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${binary} failed: ${result.stderr.trim()}`);
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--help') { usage(); process.exit(0); }
    const key = argv[i];
    if (!['--source', '--foreground-source', '--foreground-mask', '--output-dir'].includes(key) || !argv[i + 1]) {
      throw new Error(`Unknown or incomplete argument: ${key}`);
    }
    options[key.slice(2).replaceAll('-', '')] = resolve(argv[++i]);
  }
  for (const key of ['source', 'outputdir']) {
    if (!options[key]) throw new Error(`Missing --${key.replace('foregroundmask', 'foreground-mask').replace('outputdir', 'output-dir')}`);
  }
  if (!existsSync(options.source)) throw new Error(`Missing source: ${options.source}`);
  if (options.foregroundsource && !existsSync(options.foregroundsource)) throw new Error(`Missing foreground source: ${options.foregroundsource}`);
  if (options.foregroundmask && !existsSync(options.foregroundmask)) throw new Error(`Missing foreground mask: ${options.foregroundmask}`);
  return options;
}

function composeLayer(canonical, mask, layer, output) {
  const [x, y, width, height] = layer.crop;
  const art = `[0:v]crop=${width}:${height}:${x}:${y},scale=${layer.width}:${layer.height}:flags=lanczos,format=rgba[art]`;
  const filter = layer.mask
    ? `${art};[1:v]format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(gt(b(X,Y),100)*lt(g(X,Y),150),0,255)',format=rgba,alphaextract,scale=${layer.width}:${layer.height}:flags=neighbor[alpha];color=c=${CHROMA}:s=${layer.width}x${layer.height},format=rgba[bg];[art][alpha]alphamerge[fg];[bg][fg]overlay=0:0:format=auto,format=rgb24[out]`
    : `[0:v]crop=${width}:${height}:${x}:${y},scale=${layer.width}:${layer.height}:flags=lanczos,format=rgb24[out]`;
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', canonical];
  if (layer.mask) args.push('-i', mask);
  args.push('-filter_complex', filter, '-map', '[out]', '-frames:v', '1', output);
  command('ffmpeg', args);
}

function composeForegroundSource(source, layer, output) {
  const { width, height } = layer;
  // The source is wide but taller than the OpenBOR f layer. Keep its lower
  // roots/rocks, where occlusion belongs, and reserve the central play lane.
  const filter = [
    `[0:v]scale=2172:724:flags=lanczos,crop=2172:244:0:480,scale=${width}:${height}:flags=lanczos,format=rgba,colorkey=0xFF00FF:0.40:0,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(gt(r(X,Y),100)*gt(b(X,Y),100)*lt(g(X,Y),100),0,a(X,Y))',format=rgba[fg]`,
    `color=c=${CHROMA}:s=${width}x${height},format=rgba[bg]`,
    '[bg][fg]overlay=0:0:format=auto,format=rgb24[out]',
  ].join(';');
  command('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', source,
    '-filter_complex', filter, '-map', '[out]', '-frames:v', '1', output]);
}

function encodeIndexed(png, output, layer, work) {
  mkdirSync(work, { recursive: true });
  const { pixels, bgraPalette } = palettizeWithFfmpeg(png, layer.width, layer.height, work);
  try {
    forceChromaAtIndexZero(pixels, bgraPalette);
  } catch (error) {
    const usage = new Uint32Array(256);
    for (const pixel of pixels) usage[pixel] += 1;
    const spare = [...usage.keys()].find(index => index > 0 && usage[index] === 0);
    if (spare === undefined) throw error;
    // Preserve the opaque colour that palettegen assigned to index 0, then
    // reserve the otherwise unused palette entry for those pixels.
    bgraPalette.copy(bgraPalette, spare * 4, 0, 4);
    for (let index = 0; index < pixels.length; index += 1) {
      if (pixels[index] === 0) pixels[index] = spare;
    }
    bgraPalette[0] = 0xff;
    bgraPalette[1] = 0x00;
    bgraPalette[2] = 0xfc;
    bgraPalette[3] = 0xff;
  }
  writeFileSync(output, encodeGif(layer.width, layer.height, pixels, bgraPalette));
  verifyGif(output, layer.width, layer.height);
}

function writeTransparentLayer(output, layer) {
  const pixels = Buffer.alloc(layer.width * layer.height, 0);
  const bgraPalette = Buffer.alloc(256 * 4, 0);
  bgraPalette[0] = 0xff;
  bgraPalette[1] = 0x00;
  bgraPalette[2] = 0xfc;
  bgraPalette[3] = 0xff;
  writeFileSync(output, encodeGif(layer.width, layer.height, pixels, bgraPalette));
  verifyGif(output, layer.width, layer.height);
}

const options = parseArgs(process.argv.slice(2));
const work = mkdtempSync(join(tmpdir(), 'stage01-production-'));
try {
  mkdirSync(options.outputdir, { recursive: true });
  const canonical = join(work, 'canonical.png');
  command('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', options.source,
    '-vf', `scale=${CANONICAL.width}:${CANONICAL.height}:flags=lanczos,format=rgb24`, '-frames:v', '1', canonical]);
  const files = [];
  for (const layer of LAYERS) {
    const png = join(work, `${layer.file.replace('.', '_')}.png`);
    const output = join(options.outputdir, layer.file);
    if (layer.mask && options.foregroundsource) {
      composeForegroundSource(options.foregroundsource, layer, png);
      encodeIndexed(png, output, layer, join(work, 'palette'));
    } else if (layer.mask && !options.foregroundmask) {
      writeTransparentLayer(output, layer);
    } else {
      composeLayer(canonical, options.foregroundmask, layer, png);
      encodeIndexed(png, output, layer, join(work, 'palette'));
    }
    files.push({ path: layer.file, canvas: [layer.width, layer.height], role: layer.role, sha256: sha256(output) });
  }
  writeFileSync(join(options.outputdir, 'PRODUCTION-MANIFEST.json'), `${JSON.stringify({
    schemaVersion: 1,
    status: 'original-visible-background-candidate-needs-runtime-review',
    productionReady: false,
    source: { filename: basename(options.source), sha256: sha256(options.source), canonicalCanvas: [CANONICAL.width, CANONICAL.height], originalGeneratedArt: true },
    foreground: options.foregroundsource
      ? { filename: basename(options.foregroundsource), use: 'original generated lower foreground; central lane intentionally clear' }
      : options.foregroundmask
      ? { filename: basename(options.foregroundmask), use: 'opacity only; original pixels are not copied' }
      : { status: 'intentionally transparent until original foreground redraw is supplied' },
    chroma: { paletteIndex: 0, rgb: CHROMA, gifTransparencyExtension: false },
    files,
    deferred: ['runtime parallax/viewport seam review', 'art-direction and gameplay review'],
  }, null, 2)}\n`);
  console.log(`Stage01 production candidate built: ${files.map(({ path }) => path).join(', ')}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
