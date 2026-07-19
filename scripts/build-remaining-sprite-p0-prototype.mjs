#!/usr/bin/env node

import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CHROMA, encodeGif, forceChromaAtIndexZero, palettizeWithFfmpeg, probeImage, verifyGif } from './build-mazinger-p0-prototype.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, '../workplace/extracted/data');
const ASSETS = join(ROOT, '../openbor_security_materal/assets');
const OUT = join(ASSETS, 'legacy/remaining-sprite-p0-v1');
function walk(root) {
  const result = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) result.push(...walk(path));
    else if (/\.gif$/i.test(entry.name)) result.push(path);
  }
  return result;
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
function candidatePaths() {
  const result = new Set();
  for (const packageDir of readdirSync(ASSETS, { withFileTypes: true })) {
    if (!packageDir.isDirectory()) continue;
    for (const path of walk(join(ASSETS, packageDir.name))) {
      const marker = `${join('assets', packageDir.name)}${path.slice(join(ASSETS, packageDir.name).length)}`;
      const dataIndex = marker.indexOf('/data/');
      if (dataIndex >= 0) result.add(marker.slice(dataIndex + '/data/'.length));
    }
  }
  return result;
}
const covered = candidatePaths();
const missing = walk(DATA).filter((path) => !covered.has(relative(DATA, path)));
const temp = mkdtempSync(join(tmpdir(), 'remaining-sprite-p0-'));
const records = [];
try {
  for (let index = 0; index < missing.length; index += 1) {
    const source = missing[index];
    const rel = relative(DATA, source);
    const image = probeImage(source);
    const output = join(OUT, 'data', rel);
    mkdirSync(dirname(output), { recursive: true });
    let mode = 'blank-tiny-canvas';
    let paletteMode = null;
    if (image.width > 2 && image.height > 2) {
      const png = join(temp, `${index}.png`);
      run(['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-vf', `format=rgb24,colorchannelmixer=rr=0.58:gg=0.78:bb=1.06,drawbox=x=0:y=0:w=1:h=1:color=0xFC00FF:t=fill`, '-frames:v', '1', png]);
      const palette = palettizeWithFfmpeg(png, image.width, image.height, temp);
      paletteMode = ensureChroma(palette.pixels, palette.bgraPalette);
      writeFileSync(output, encodeGif(image.width, image.height, palette.pixels, palette.bgraPalette));
      mode = 'mechanical-blue-remap';
    } else writeFileSync(output, blankGif(image.width, image.height));
    verifyGif(output, image.width, image.height);
    records.push({ path: `data/${rel}`, canvas: [image.width, image.height], mode, palette: paletteMode });
    if ((index + 1) % 100 === 0) console.log(`remaining: ${index + 1}/${missing.length}`);
  }
} finally { rmSync(temp, { recursive: true, force: true }); }
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'BUILD-MANIFEST.json'), `${JSON.stringify({ schemaVersion: 1, status: 'engineering-prototype-not-production-ready', productionReady: false, source: 'all previously uncovered legacy GIF silhouettes with mechanical blue palette remap', coveredBeforeBuild: covered.size, missingBeforeBuild: missing.length, gifCount: records.length, deferred: ['hand-authored replacement for fonts, profiles, shadows, story props and special attacks', 'semantic review of each remapped silhouette', 'runtime QA'], files: records }, null, 2)}\n`);
console.log(`Built ${records.length} previously uncovered GIFs at ${OUT}`);
