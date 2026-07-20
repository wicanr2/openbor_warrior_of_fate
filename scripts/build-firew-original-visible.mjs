#!/usr/bin/env node

// Build a private original replacement for firew's three 48x73 OpenBOR GIFs.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { encodeGif, forceChromaAtIndexZero, palettizeWithFfmpeg, verifyGif } from './build-mazinger-p0-prototype.mjs';

const CHROMA = '#FC00FF';
const CANVAS = [48, 73];
const FRAMES = [
  { file: 'b1.GIF', crop: [30, 430, 520, 450], fit: [44, 52], role: 'dormant beacon' },
  { file: 'b2.GIF', crop: [575, 10, 640, 860], fit: [44, 70], role: 'active energy column' },
  { file: 'b3.GIF', crop: [1190, 360, 560, 500], fit: [44, 58], role: 'overload and fade' },
];

function run(binary, commandArgs, options = {}) {
  const result = spawnSync(binary, commandArgs, { encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${binary} failed: ${result.stderr.trim()}`);
}
function sha256(file) { return createHash('sha256').update(readFileSync(file)).digest('hex'); }
function parse(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--help') { console.log('Usage: node scripts/build-firew-original-visible.mjs --source SHEET --output-dir DIR'); process.exit(0); }
    if (!['--source', '--output-dir'].includes(argv[i]) || !argv[i + 1]) throw new Error(`Unknown or incomplete argument: ${argv[i]}`);
    options[argv[i].slice(2).replace('-', '')] = resolve(argv[++i]);
  }
  if (!options.source || !options.outputdir || !existsSync(options.source)) throw new Error('Existing --source and --output-dir are required');
  return options;
}
function buildPng(source, frame, output) {
  const [x, y, width, height] = frame.crop;
  const [fitW, fitH] = frame.fit;
  const [canvasW, canvasH] = CANVAS;
  const filter = [
    `[0:v]crop=${width}:${height}:${x}:${y},format=rgba,colorkey=0xFF00FF:0.24:0,scale=${fitW}:${fitH}:flags=neighbor[fg]`,
    `color=c=${CHROMA}:s=${canvasW}x${canvasH},format=rgba[bg]`,
    `[bg][fg]overlay=${Math.floor((canvasW - fitW) / 2)}:${canvasH - fitH}:format=auto,format=rgb24[out]`,
  ].join(';');
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-filter_complex', filter, '-map', '[out]', '-frames:v', '1', output]);
}
const options = parse(process.argv.slice(2));
const work = mkdtempSync(join(tmpdir(), 'firew-original-'));
try {
  mkdirSync(options.outputdir, { recursive: true });
  const files = [];
  for (const frame of FRAMES) {
    const png = join(work, `${frame.file}.png`);
    const output = join(options.outputdir, frame.file);
    buildPng(options.source, frame, png);
    const paletteDir = join(work, frame.file.replace('.', '_'));
    mkdirSync(paletteDir, { recursive: true });
    const { pixels, bgraPalette } = palettizeWithFfmpeg(png, ...CANVAS, paletteDir);
    forceChromaAtIndexZero(pixels, bgraPalette);
    writeFileSync(output, encodeGif(...CANVAS, pixels, bgraPalette));
    files.push({ path: frame.file, role: frame.role, canvas: CANVAS, sha256: sha256(output), verification: verifyGif(output, ...CANVAS) });
  }
  writeFileSync(join(options.outputdir, 'PRODUCTION-MANIFEST.json'), `${JSON.stringify({ schemaVersion: 1, status: 'original-visible-prop-candidate-needs-gameplay-review', productionReady: false, source: { filename: basename(options.source), sha256: sha256(options.source), originalGeneratedArt: true }, chroma: { paletteIndex: 0, rgb: CHROMA, gifTransparencyExtension: false }, files, deferred: ['script/gameplay-effect review', 'OpenBOR placement review'] }, null, 2)}\n`);
  console.log(`Built ${files.length} original firew frames.`);
} finally { rmSync(work, { recursive: true, force: true }); }
