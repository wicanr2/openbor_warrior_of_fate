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

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const DEFAULT_SOURCE = join(ROOT, '../openbor_security_materal/references/generated-storyboards/blue-helmet-grunt/keyposes');
const DEFAULT_BASE = join(ROOT, '../workplace/extracted/data/chars/army');
const DEFAULT_OUT = join(ROOT, '../openbor_security_materal/assets/enemies/army-family-p0-v1');

function parseArgs(argv) {
  const out = { sourceDir: DEFAULT_SOURCE, baseDir: DEFAULT_BASE, outputDir: DEFAULT_OUT, spriteHeight: 78, model: null, manifestOnly: false };
  const values = new Map([['--source-dir', 'sourceDir'], ['--base-dir', 'baseDir'], ['--output-dir', 'outputDir']]);
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--help') { console.log('Build army/1..10 mechanical enemy sprite candidate.'); process.exit(0); }
    if (argv[i] === '--sprite-height') { out.spriteHeight = Number(argv[++i]); continue; }
    if (argv[i] === '--model') { out.model = Number(argv[++i]); continue; }
    if (argv[i] === '--manifest-only') { out.manifestOnly = true; continue; }
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

function blankIndexedGif(width, height) {
  const palette = Buffer.alloc(256 * 4);
  palette[0] = CHROMA.b;
  palette[1] = CHROMA.g;
  palette[2] = CHROMA.r;
  palette[3] = 255;
  return encodeGif(width, height, Buffer.alloc(width * height), palette);
}

const options = parseArgs(process.argv.slice(2));
if (options.manifestOnly) {
  const files = [];
  for (let model = 1; model <= 10; model += 1) {
    const root = join(options.outputDir, 'data/chars/army', String(model));
    if (!existsSync(root)) continue;
    for (const original of gifFiles(root)) {
      files.push({ model: String(model), path: `data/chars/army/${model}/${relative(root, original)}` });
    }
  }
  mkdirSync(options.outputDir, { recursive: true });
  writeFileSync(join(options.outputDir, 'BUILD-MANIFEST.json'), `${JSON.stringify({ schemaVersion: 1, status: 'engineering-prototype-not-production-ready', productionReady: false, prototypePoseReuse: true, source: 'blue-helmet-grunt/keyposes/frame-01..12.png', modelCount: 10, gifCount: files.length, deferred: ['distinct art direction for each army model', 'frame-by-frame redraw and in-betweens', 'shooter/muzzle/projectile entities', 'independent death fragments', 'BBox/attack-box review', 'runtime gameplay QA'], files }, null, 2)}\n`);
  console.log(`Manifest assembled for ${files.length} army GIFs`);
  process.exit(0);
}
const sourcePaths = Array.from({ length: 12 }, (_, i) => join(options.sourceDir, `frame-${String(i + 1).padStart(2, '0')}.png`));
if (!sourcePaths.every(existsSync)) throw new Error('Expected frame-01.png through frame-12.png');
const temp = mkdtempSync(join(tmpdir(), 'army-family-p0-'));
const records = [];
let total = 0;
try {
  const firstModel = options.model ?? 1;
  const lastModel = options.model ?? 10;
  for (let model = firstModel; model <= lastModel; model += 1) {
    const baseModel = join(options.baseDir, String(model));
    if (!existsSync(baseModel)) throw new Error(`Missing army model ${baseModel}`);
    const targets = gifFiles(baseModel);
    const outputModel = join(options.outputDir, 'data/chars/army', String(model));
    for (let index = 0; index < targets.length; index += 1) {
      const original = targets[index];
      const rel = relative(baseModel, original);
      const image = probeImage(original);
      const target = { canvas: { width: image.width, height: image.height }, offset: { x: Math.round(image.width / 2), y: image.height - 1 } };
      const output = join(outputModel, rel);
      mkdirSync(dirname(output), { recursive: true });
      let placement = { blank: true };
      if (image.width > 2 && image.height > 2) {
        const sourcePath = sourcePaths[index % sourcePaths.length];
        const pose = analyzePose(sourcePath);
        const composed = join(temp, `${model}-${index}.png`);
        placement = makeComposedPng(sourcePath, composed, pose, target, options.spriteHeight, { anchor: 'center-bottom' }, true);
        const palette = palettizeWithFfmpeg(composed, image.width, image.height, temp);
        forceChromaAtIndexZero(palette.pixels, palette.bgraPalette);
        writeFileSync(output, encodeGif(image.width, image.height, palette.pixels, palette.bgraPalette));
      } else {
        writeFileSync(output, blankIndexedGif(image.width, image.height));
      }
      verifyGif(output, image.width, image.height);
      records.push({ model: String(model), path: `data/chars/army/${model}/${rel}`, source: placement.blank ? 'blank-required-by-1px-base-canvas' : `frame-${String((index % sourcePaths.length) + 1).padStart(2, '0')}.png`, canvas: [image.width, image.height], placement });
      total += 1;
    }
    console.log(`army/${model}: ${targets.length} GIFs`);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
mkdirSync(options.outputDir, { recursive: true });
writeFileSync(join(options.outputDir, 'BUILD-MANIFEST.json'), `${JSON.stringify({
  schemaVersion: 1,
  status: 'engineering-prototype-not-production-ready',
  productionReady: false,
  prototypePoseReuse: true,
  source: 'blue-helmet-grunt/keyposes/frame-01..12.png',
  modelCount: 10,
  gifCount: total,
  deferred: ['distinct art direction for each army model', 'frame-by-frame redraw and in-betweens', 'shooter/muzzle/projectile entities', 'independent death fragments', 'BBox/attack-box review', 'runtime gameplay QA'],
  files: records,
}, null, 2)}\n`);
console.log(`Built ${total} army GIFs at ${options.outputDir}`);
