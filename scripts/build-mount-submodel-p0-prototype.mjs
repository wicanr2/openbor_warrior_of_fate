#!/usr/bin/env node

import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CHROMA, encodeGif, forceChromaAtIndexZero, palettizeWithFfmpeg, probeImage, verifyGif } from './build-mazinger-p0-prototype.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = join(ROOT, '../workplace/extracted/data/chars');
const OUT = join(ROOT, '../openbor_security_materal/assets/players/mount-submodels-p0-v1');
const TARGETS = [
  'guanyu/horse', 'guanyu/w', 'guanyu/w1', 'huangzhong/horse', 'huangzhong/gong',
  'zhaoyun/horse', 'zhaoyun/w', 'zhaoyun/w1', 'zhangfei/horse', 'zhangfei/w',
  'zhangfei/w1', 'weiyan/horse', 'weiyan/news', 'weiyan/w', 'weiyan/w1',
];
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
const temp = mkdtempSync(join(tmpdir(), 'mount-p0-'));
const records = [];
try {
  for (const target of TARGETS) {
    const base = join(BASE, target);
    if (!existsSync(base)) continue;
    for (const source of walk(base)) {
      const rel = relative(BASE, source);
      const image = probeImage(source);
      const output = join(OUT, 'data/chars', rel);
      mkdirSync(dirname(output), { recursive: true });
      let mode = 'blank-tiny-canvas';
      let paletteMode = null;
      if (image.width > 2 && image.height > 2) {
        const png = join(temp, `${records.length}.png`);
        run(['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-vf', `format=rgb24,colorchannelmixer=rr=0.52:gg=0.78:bb=1.10,drawbox=x=0:y=0:w=1:h=1:color=0xFC00FF:t=fill`, '-frames:v', '1', png]);
        const palette = palettizeWithFfmpeg(png, image.width, image.height, temp);
        paletteMode = ensureChroma(palette.pixels, palette.bgraPalette);
        writeFileSync(output, encodeGif(image.width, image.height, palette.pixels, palette.bgraPalette));
        mode = 'mechanical-blue-remap';
      } else writeFileSync(output, blankGif(image.width, image.height));
      verifyGif(output, image.width, image.height);
      records.push({ path: `data/chars/${rel}`, canvas: [image.width, image.height], mode, palette: paletteMode });
    }
    console.log(`${target}: ${records.length} total`);
  }
} finally { rmSync(temp, { recursive: true, force: true }); }
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'BUILD-MANIFEST.json'), `${JSON.stringify({ schemaVersion: 1, status: 'engineering-prototype-not-production-ready', productionReady: false, source: 'original mount/submodel silhouettes with mechanical blue palette remap', gifCount: records.length, deferred: ['distinct mount/mecha designs', 'frame-by-frame redraw and animation timing', 'rider-to-mount alignment', 'BBox/attack-box and gameplay QA'], files: records }, null, 2)}\n`);
console.log(`Built ${records.length} mount/submodel GIFs at ${OUT}`);
