#!/usr/bin/env node

import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_SOURCE = join(ROOT, '../openbor_security_materal/assets/bosses/zeon-boss-with-legs/references/generated-storyboards/zeon-keyposes');
const DEFAULT_BASE = join(ROOT, '../workplace/extracted/data/chars/boss');
const DEFAULT_OUT = join(ROOT, '../openbor_security_materal/assets/bosses/boss-family-p0-v1');
const MODELS = ['lidian', 'meiling', 'meimei', 'meiya', 'xiahoudun', 'xuchu'];

function parseArgs(argv) {
  const out = { sourceDir: DEFAULT_SOURCE, baseDir: DEFAULT_BASE, outputDir: DEFAULT_OUT, spriteHeight: 150, model: null };
  const values = new Map([['--source-dir', 'sourceDir'], ['--base-dir', 'baseDir'], ['--output-dir', 'outputDir']]);
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--help') { console.log('Build boss sprite candidates for every extracted boss model.'); process.exit(0); }
    if (argv[i] === '--sprite-height') { out.spriteHeight = Number(argv[++i]); continue; }
    if (argv[i] === '--model') { out.model = argv[++i]; continue; }
    const key = values.get(argv[i]);
    if (!key || !argv[i + 1]) throw new Error(`Unknown or incomplete option: ${argv[i]}`);
    out[key] = resolve(argv[++i]);
  }
  return out;
}

function gifFiles(root) {
  const result = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) result.push(...gifFiles(path));
    else if (/\.gif$/i.test(entry.name)) result.push(path);
  }
  return result.sort();
}

function blankGif(width, height) {
  const palette = Buffer.alloc(256 * 4);
  palette[0] = CHROMA.b; palette[1] = CHROMA.g; palette[2] = CHROMA.r; palette[3] = 255;
  return encodeGif(width, height, Buffer.alloc(width * height), palette);
}

const options = parseArgs(process.argv.slice(2));
const sources = Array.from({ length: 16 }, (_, i) => join(options.sourceDir, `frame-${String(i + 1).padStart(2, '0')}.png`));
if (!sources.every(existsSync)) throw new Error('Expected Zeon frame-01.png through frame-16.png');
const models = options.model ? [options.model] : MODELS;
const temp = mkdtempSync(join(tmpdir(), 'boss-family-p0-'));
const records = [];
try {
  for (const model of models) {
    const base = join(options.baseDir, model);
    if (!existsSync(base)) throw new Error(`Missing boss model ${base}`);
    const outputRoot = join(options.outputDir, 'data/chars/boss', model);
    const targets = gifFiles(base);
    for (let index = 0; index < targets.length; index += 1) {
      const original = targets[index];
      const rel = relative(base, original);
      const image = probeImage(original);
      const output = join(outputRoot, rel);
      mkdirSync(dirname(output), { recursive: true });
      let placement = { blank: true };
      if (image.width > 2 && image.height > 2) {
        const sourcePath = sources[index % sources.length];
        const pose = analyzePose(sourcePath);
        const composed = join(temp, `${model}-${index}.png`);
        placement = makeComposedPng(sourcePath, composed, pose, { canvas: { width: image.width, height: image.height }, offset: { x: Math.round(image.width / 2), y: image.height - 1 } }, options.spriteHeight, { anchor: 'center-bottom' }, true);
        const palette = palettizeWithFfmpeg(composed, image.width, image.height, temp);
        forceChromaAtIndexZero(palette.pixels, palette.bgraPalette);
        writeFileSync(output, encodeGif(image.width, image.height, palette.pixels, palette.bgraPalette));
      } else writeFileSync(output, blankGif(image.width, image.height));
      verifyGif(output, image.width, image.height);
      records.push({ model, path: `data/chars/boss/${model}/${rel}`, source: placement.blank ? 'blank-required-by-tiny-base-canvas' : `frame-${String((index % sources.length) + 1).padStart(2, '0')}.png`, canvas: [image.width, image.height], placement });
    }
    console.log(`boss/${model}: ${targets.length} GIFs`);
  }
} finally { rmSync(temp, { recursive: true, force: true }); }
mkdirSync(options.outputDir, { recursive: true });
writeFileSync(join(options.outputDir, 'BUILD-MANIFEST.json'), `${JSON.stringify({ schemaVersion: 1, status: 'engineering-prototype-not-production-ready', productionReady: false, prototypePoseReuse: true, source: 'zeon-keyposes/frame-01..16.png', modelCount: models.length, gifCount: records.length, deferred: ['distinct art direction per boss', 'frame-by-frame redraw and in-betweens', 'boss HUD and icons', 'projectile/debris entities', 'pilot cut-ins', 'BBox/attack-box and gameplay QA'], files: records }, null, 2)}\n`);
console.log(`Built ${records.length} boss GIFs at ${options.outputDir}`);
