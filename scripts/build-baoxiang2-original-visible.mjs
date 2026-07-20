#!/usr/bin/env node

// Build the two 50x41 physical GIFs for the small baoxiang2 prop from a
// private original source sheet. The public repository contains no artwork.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { encodeGif, forceChromaAtIndexZero, palettizeWithFfmpeg, verifyGif } from './build-mazinger-p0-prototype.mjs';

const CHROMA = '#FC00FF';
const CANVAS = [50, 41];
const FRAMES = [
  { file: '1.gif', crop: [180, 290, 760, 360], fit: [48, 27], role: 'sealed light ammo case' },
  { file: '2.GIF', crop: [950, 190, 850, 440], fit: [50, 32], role: 'broken light ammo case' },
];
function run(binary, args) { const result = spawnSync(binary, args, { encoding: 'utf8' }); if (result.error) throw result.error; if (result.status !== 0) throw new Error(`${binary} failed: ${result.stderr.trim()}`); }
function hash(file) { return createHash('sha256').update(readFileSync(file)).digest('hex'); }
function parse(argv) { const result = {}; for (let i = 0; i < argv.length; i += 1) { if (argv[i] === '--help') { console.log('Usage: node scripts/build-baoxiang2-original-visible.mjs --source SHEET --output-dir DIR'); process.exit(0); } if (!['--source', '--output-dir'].includes(argv[i]) || !argv[i + 1]) throw new Error(`Unknown or incomplete argument: ${argv[i]}`); result[argv[i].slice(2).replace('-', '')] = resolve(argv[++i]); } if (!result.source || !result.outputdir || !existsSync(result.source)) throw new Error('Existing --source and --output-dir are required'); return result; }
function compose(source, frame, output) { const [x, y, w, h] = frame.crop; const [fw, fh] = frame.fit; const [cw, ch] = CANVAS; const filter = [`[0:v]crop=${w}:${h}:${x}:${y},format=rgba,colorkey=0xFF00FF:0.24:0,scale=${fw}:${fh}:flags=neighbor[fg]`, `color=c=${CHROMA}:s=${cw}x${ch},format=rgba[bg]`, `[bg][fg]overlay=${Math.floor((cw - fw) / 2)}:${ch - fh}:format=auto,format=rgb24[out]`].join(';'); run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-filter_complex', filter, '-map', '[out]', '-frames:v', '1', output]); }
const options = parse(process.argv.slice(2));
const work = mkdtempSync(join(tmpdir(), 'baoxiang2-original-'));
try { mkdirSync(options.outputdir, { recursive: true }); const files = []; for (const frame of FRAMES) { const png = join(work, `${frame.file}.png`); const output = join(options.outputdir, frame.file); compose(options.source, frame, png); const paletteDir = join(work, frame.file.replace('.', '_')); mkdirSync(paletteDir, { recursive: true }); const { pixels, bgraPalette } = palettizeWithFfmpeg(png, ...CANVAS, paletteDir); forceChromaAtIndexZero(pixels, bgraPalette); writeFileSync(output, encodeGif(...CANVAS, pixels, bgraPalette)); files.push({ path: frame.file, role: frame.role, canvas: CANVAS, sha256: hash(output), verification: verifyGif(output, ...CANVAS) }); } writeFileSync(join(options.outputdir, 'PRODUCTION-MANIFEST.json'), `${JSON.stringify({ schemaVersion: 1, status: 'original-visible-prop-candidate-needs-gameplay-review', productionReady: false, source: { filename: basename(options.source), sha256: hash(options.source), originalGeneratedArt: true }, chroma: { paletteIndex: 0, rgb: CHROMA, gifTransparencyExtension: false }, files, deferred: ['OpenBOR placement and drop visibility review'] }, null, 2)}\n`); console.log(`Built ${files.length} original baoxiang2 frames.`); } finally { rmSync(work, { recursive: true, force: true }); }
