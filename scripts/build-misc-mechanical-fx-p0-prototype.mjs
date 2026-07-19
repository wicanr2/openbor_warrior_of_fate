#!/usr/bin/env node

import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CHROMA, encodeGif, forceChromaAtIndexZero, palettizeWithFfmpeg, probeImage, verifyGif } from './build-mazinger-p0-prototype.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = join(ROOT, '../workplace/extracted/data/chars/misc');
const OUT = join(ROOT, '../openbor_security_materal/assets/effects/misc-mechanical-fx-p0-v1');

function walk(root) {
  const result = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) result.push(...walk(path));
    else if (/\.gif$/i.test(entry.name)) result.push(path);
  }
  return result.sort();
}
function run(args) {
  const result = spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr?.trim() || 'ffmpeg failed');
}
function blankGif(width, height) {
  const palette = Buffer.alloc(256 * 4);
  palette[0] = CHROMA.b; palette[1] = CHROMA.g; palette[2] = CHROMA.r; palette[3] = 255;
  return encodeGif(width, height, Buffer.alloc(width * height), palette);
}
function ensureChromaAtZero(pixels, palette) {
  try { forceChromaAtIndexZero(pixels, palette); return 'exact'; } catch (error) {
    // FFmpeg can quantize the keyed background by a few RGB units after the
    // hue remap. Palette index 0 is still the keyed background in this
    // pipeline, so normalize that entry explicitly and retain the pixel map.
    palette[0] = CHROMA.b; palette[1] = CHROMA.g; palette[2] = CHROMA.r; palette[3] = 255;
    return 'normalized-index-0';
  }
}

const files = walk(BASE);
const temp = mkdtempSync(join(tmpdir(), 'misc-fx-p0-'));
const records = [];
try {
  for (let index = 0; index < files.length; index += 1) {
    const source = files[index];
    const rel = relative(BASE, source);
    const image = probeImage(source);
    const output = join(OUT, 'data/chars/misc', rel);
    mkdirSync(dirname(output), { recursive: true });
    let mode = 'blank-tiny-canvas';
    let paletteMode = null;
    if (image.width > 2 && image.height > 2) {
      const png = join(temp, `${index}.png`);
      run(['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-filter_complex', `[0:v]format=rgba,colorkey=0xFC00FF:0.03:0,colorchannelmixer=rr=0.55:gg=0.82:bb=1.08[fg];color=c=0xFC00FF:s=${image.width}x${image.height}:r=1,format=rgba[bg];[bg][fg]overlay=0:0,format=rgb24,drawbox=x=0:y=0:w=1:h=1:color=0xFC00FF:t=fill`, '-frames:v', '1', png]);
      const palette = palettizeWithFfmpeg(png, image.width, image.height, temp);
      const paletteMode = ensureChromaAtZero(palette.pixels, palette.bgraPalette);
      writeFileSync(output, encodeGif(image.width, image.height, palette.pixels, palette.bgraPalette));
      mode = 'mechanical-blue-remap';
    } else writeFileSync(output, blankGif(image.width, image.height));
    verifyGif(output, image.width, image.height);
    records.push({ path: `data/chars/misc/${rel}`, canvas: [image.width, image.height], mode, palette: mode === 'mechanical-blue-remap' ? paletteMode : undefined });
    if ((index + 1) % 100 === 0) console.log(`misc: ${index + 1}/${files.length}`);
  }
} finally { rmSync(temp, { recursive: true, force: true }); }
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'BUILD-MANIFEST.json'), `${JSON.stringify({ schemaVersion: 1, status: 'engineering-prototype-not-production-ready', productionReady: false, source: 'original misc silhouettes with mechanical blue palette remap', gifCount: records.length, deferred: ['hand-drawn mechanical FX redesign', 'family-specific beam/explosion palettes', 'frame-by-frame timing review', 'gameplay QA and removal of any remaining organic semantics'], files: records }, null, 2)}\n`);
console.log(`Built ${records.length} misc FX GIFs at ${OUT}`);
