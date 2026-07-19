#!/usr/bin/env node

import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { CHROMA, analyzePose, encodeGif, forceChromaAtIndexZero, makeComposedPng, palettizeWithFfmpeg, probeImage, verifyGif } from './build-mazinger-p0-prototype.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, '../openbor_security_materal/references/generated-storyboards/blue-helmet-grunt/keyposes');
const BASE = join(ROOT, '../workplace/extracted/data/chars/npc');
const OUT = join(ROOT, '../openbor_security_materal/assets/enemies/npc-family-p0-v1');
const FAMILIES = ['men', 'women'];

function gifs(root) {
  const result = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) result.push(...gifs(path));
    else if (/\.gif$/i.test(entry.name)) result.push(path);
  }
  return result.sort();
}
function blankGif(width, height) {
  const palette = Buffer.alloc(256 * 4);
  palette[0] = CHROMA.b; palette[1] = CHROMA.g; palette[2] = CHROMA.r; palette[3] = 255;
  return encodeGif(width, height, Buffer.alloc(width * height), palette);
}

const sourcePaths = Array.from({ length: 12 }, (_, i) => join(SOURCE, `frame-${String(i + 1).padStart(2, '0')}.png`));
if (!sourcePaths.every(existsSync)) throw new Error('Missing Blue Helmet keyposes');
const poses = sourcePaths.map(analyzePose);
const temp = mkdtempSync(join(tmpdir(), 'npc-family-p0-'));
const records = [];
try {
  for (const family of FAMILIES) {
    const base = join(BASE, family);
    if (!existsSync(base)) throw new Error(`Missing NPC family ${base}`);
    const outputRoot = join(OUT, 'data/chars/npc', family);
    const targets = gifs(base);
    for (let index = 0; index < targets.length; index += 1) {
      const original = targets[index];
      const rel = relative(base, original);
      const image = probeImage(original);
      const output = join(outputRoot, rel);
      mkdirSync(dirname(output), { recursive: true });
      let placement = { blank: true };
      if (image.width > 2 && image.height > 2) {
        const pose = poses[index % poses.length];
        const composed = join(temp, `${family}-${index}.png`);
        placement = makeComposedPng(sourcePaths[index % sourcePaths.length], composed, pose, { canvas: { width: image.width, height: image.height }, offset: { x: Math.round(image.width / 2), y: image.height - 1 } }, 58, { anchor: 'center-bottom' }, true);
        const palette = palettizeWithFfmpeg(composed, image.width, image.height, temp);
        forceChromaAtIndexZero(palette.pixels, palette.bgraPalette);
        writeFileSync(output, encodeGif(image.width, image.height, palette.pixels, palette.bgraPalette));
      } else writeFileSync(output, blankGif(image.width, image.height));
      verifyGif(output, image.width, image.height);
      records.push({ family, path: `data/chars/npc/${family}/${rel}`, source: placement.blank ? 'blank-required-by-tiny-base-canvas' : `frame-${String((index % sourcePaths.length) + 1).padStart(2, '0')}.png`, canvas: [image.width, image.height], placement });
    }
    console.log(`npc/${family}: ${targets.length} GIFs`);
  }
} finally { rmSync(temp, { recursive: true, force: true }); }
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'BUILD-MANIFEST.json'), `${JSON.stringify({ schemaVersion: 1, status: 'engineering-prototype-not-production-ready', productionReady: false, prototypePoseReuse: true, source: 'blue-helmet-grunt/keyposes/frame-01..12.png', familyCount: FAMILIES.length, gifCount: records.length, deferred: ['distinct civilian/NPC designs', 'frame-by-frame redraw and in-betweens', 'story portrait variants', 'BBox/attack-box review', 'runtime QA'], files: records }, null, 2)}\n`);
console.log(`Built ${records.length} NPC GIFs at ${OUT}`);
