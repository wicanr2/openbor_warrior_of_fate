#!/usr/bin/env node

// Converts an original private three-pose box sheet into the three physical
// OpenBOR frames. No private image is included in this repository.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { encodeGif, forceChromaAtIndexZero, palettizeWithFfmpeg, verifyGif } from './build-mazinger-p0-prototype.mjs';

const CHROMA = '#FC00FF';
const FRAMES = [
  { file: 'baoxiang.gif', canvas: [66, 45], crop: [90, 245, 500, 290], fit: [64, 37], role: 'sealed armored capsule' },
  { file: '1.GIF', canvas: [141, 114], crop: [690, 140, 720, 440], fit: [108, 82], role: 'initial armor rupture' },
  { file: '2.GIF', canvas: [141, 114], crop: [1400, 235, 720, 340], fit: [126, 72], role: 'debris and fading energy' },
];

function usage() {
  console.log(`Usage: node scripts/build-baoxiang-original-visible.mjs --source SHEET --output-dir DIR
Builds baoxiang.gif, 1.GIF and 2.GIF with exact OpenBOR canvases and ${CHROMA} at palette index 0.`);
}

function run(binary, args, options = {}) {
  const result = spawnSync(binary, args, { encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${binary} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function args(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--help') { usage(); process.exit(0); }
    if (!['--source', '--output-dir'].includes(argv[i]) || !argv[i + 1]) throw new Error(`Unknown or incomplete argument: ${argv[i]}`);
    options[argv[i].slice(2).replace('-', '')] = resolve(argv[++i]);
  }
  if (!options.source || !options.outputdir) throw new Error('--source and --output-dir are required');
  if (!existsSync(options.source)) throw new Error(`Missing source sheet: ${options.source}`);
  return options;
}

function compose(source, frame, output) {
  const [cropX, cropY, cropW, cropH] = frame.crop;
  const [canvasW, canvasH] = frame.canvas;
  const [fitW, fitH] = frame.fit;
  const x = Math.floor((canvasW - fitW) / 2);
  const y = Math.floor((canvasH - fitH) / 2);
  const filter = [
    `[0:v]crop=${cropW}:${cropH}:${cropX}:${cropY},format=rgba,colorkey=0xFF00FF:0.22:0,scale=${fitW}:${fitH}:flags=neighbor[fg]`,
    `color=c=${CHROMA}:s=${canvasW}x${canvasH},format=rgba[bg]`,
    `[bg][fg]overlay=${x}:${y}:format=auto,format=rgb24[out]`,
  ].join(';');
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', source,
    '-filter_complex', filter, '-map', '[out]', '-frames:v', '1', output]);
}

function encode(png, output, frame, work) {
  mkdirSync(work, { recursive: true });
  const { pixels, bgraPalette } = palettizeWithFfmpeg(png, frame.canvas[0], frame.canvas[1], work);
  forceChromaAtIndexZero(pixels, bgraPalette);
  writeFileSync(output, encodeGif(frame.canvas[0], frame.canvas[1], pixels, bgraPalette));
  return verifyGif(output, frame.canvas[0], frame.canvas[1]);
}

const options = args(process.argv.slice(2));
const work = mkdtempSync(join(tmpdir(), 'baoxiang-original-'));
try {
  mkdirSync(options.outputdir, { recursive: true });
  const files = [];
  for (const frame of FRAMES) {
    const png = join(work, `${frame.file.replace('.', '_')}.png`);
    const output = join(options.outputdir, frame.file);
    compose(options.source, frame, png);
    const verification = encode(png, output, frame, join(work, 'palette'));
    files.push({ path: frame.file, canvas: frame.canvas, role: frame.role, sha256: sha256(output), verification });
  }
  writeFileSync(join(options.outputdir, 'PRODUCTION-MANIFEST.json'), `${JSON.stringify({
    schemaVersion: 1,
    status: 'original-visible-prop-candidate-needs-gameplay-review',
    productionReady: false,
    source: { filename: basename(options.source), sha256: sha256(options.source), originalGeneratedArt: true },
    chroma: { paletteIndex: 0, rgb: CHROMA, gifTransparencyExtension: false },
    files,
    deferred: ['OpenBOR gameplay placement and item-drop visibility review', 'original metal-break audio'],
  }, null, 2)}\n`);
  console.log(`Built ${files.length} original baoxiang frames.`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
