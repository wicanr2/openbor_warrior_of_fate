#!/usr/bin/env node

import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CHROMA, encodeGif, forceChromaAtIndexZero, palettizeWithFfmpeg, probeImage, verifyGif } from './build-mazinger-p0-prototype.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = join(ROOT, '../workplace/extracted/data/bgs');
const OUT = join(ROOT, '../openbor_security_materal/assets/environments/bgs-mechanical-p0-v1');
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
function ensureChroma(pixels, palette) {
  try { forceChromaAtIndexZero(pixels, palette); return 'exact'; }
  catch { palette[0] = CHROMA.b; palette[1] = CHROMA.g; palette[2] = CHROMA.r; palette[3] = 255; return 'normalized-index-0'; }
}

const files = walk(BASE);
const temp = mkdtempSync(join(tmpdir(), 'bgs-p0-'));
const records = [];
try {
  for (let index = 0; index < files.length; index += 1) {
    const source = files[index];
    const rel = relative(BASE, source);
    const image = probeImage(source);
    const output = join(OUT, 'data/bgs', rel);
    mkdirSync(dirname(output), { recursive: true });
    let mode = 'blank-tiny-canvas';
    let paletteMode = null;
    if (image.width > 2 && image.height > 2) {
      const png = join(temp, `${index}.png`);
      run(['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-vf', `format=rgb24,colorchannelmixer=rr=0.60:gg=0.78:bb=1.05,drawbox=x=0:y=0:w=1:h=1:color=0xFC00FF:t=fill`, '-frames:v', '1', png]);
      const palette = palettizeWithFfmpeg(png, image.width, image.height, temp);
      paletteMode = ensureChroma(palette.pixels, palette.bgraPalette);
      writeFileSync(output, encodeGif(image.width, image.height, palette.pixels, palette.bgraPalette));
      mode = 'mechanical-blue-remap';
    } else writeFileSync(output, blankGif(image.width, image.height));
    verifyGif(output, image.width, image.height);
    records.push({ path: `data/bgs/${rel}`, canvas: [image.width, image.height], mode, palette: paletteMode });
    if ((index + 1) % 25 === 0) console.log(`bgs: ${index + 1}/${files.length}`);
  }
} finally { rmSync(temp, { recursive: true, force: true }); }
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'BUILD-MANIFEST.json'), `${JSON.stringify({ schemaVersion: 1, status: 'engineering-prototype-not-production-ready', productionReady: false, source: 'original background silhouettes with mechanical blue palette remap', gifCount: records.length, deferred: ['hand-drawn mechanical backgrounds and tiles', 'stage-specific palette and lighting', 'foreground/wall/tile alignment review', 'runtime QA'], files: records }, null, 2)}\n`);
console.log(`Built ${records.length} background GIFs at ${OUT}`);
