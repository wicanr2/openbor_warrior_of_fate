#!/usr/bin/env node

// Builds medium-sized original Stage02 background layers from private source art.
// Source art stays in the private material repository; this public builder is safe
// to share with collaborating artists.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { palettizeWithFfmpeg, forceChromaAtIndexZero, encodeGif, verifyGif } from './build-mazinger-p0-prototype.mjs';

const CHROMA = '#FC00FF';
const CANONICAL = { width: 2172, height: 724 };
const LAYERS = [
  { file: 'bp.GIF', width: 3123, height: 276, crop: [0, 0, 2172, 500], role: 'distant valley and base' },
  { file: 'p.gif', width: 3000, height: 276, crop: [0, 260, 2172, 404], role: 'walkable base platform' },
  { file: 'f2.GIF', width: 3100, height: 276, crop: [0, 455, 2172, 244], role: 'foreground occlusion' },
  { file: 'f1.GIF', width: 3135, height: 276, crop: [0, 430, 2172, 244], role: 'foreground edge details' },
];

function command(binary, args) { const r = spawnSync(binary, args, { encoding: 'utf8' }); if (r.error) throw r.error; if (r.status !== 0) throw new Error(`${binary} failed: ${r.stderr.trim()}`); }
function sha256(file) { return createHash('sha256').update(readFileSync(file)).digest('hex'); }
function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i += 1) { const k = argv[i]; if (k === '--help') { console.log('Usage: node scripts/build-stage02-production-background.mjs --source PNG --foreground-source PNG --output-dir DIR'); process.exit(0); } if (!['--source', '--foreground-source', '--output-dir'].includes(k) || !argv[i + 1]) throw new Error(`Unknown or incomplete argument: ${k}`); o[k.slice(2).replaceAll('-', '')] = resolve(argv[++i]); }
  if (!o.source || !o.outputdir || !o.foregroundsource) throw new Error('Require --source, --foreground-source and --output-dir');
  for (const k of ['source', 'foregroundsource']) if (!existsSync(o[k])) throw new Error(`Missing source: ${o[k]}`);
  return o;
}
function encodeIndexed(png, output, layer, work) {
  mkdirSync(work, { recursive: true }); const { pixels, bgraPalette } = palettizeWithFfmpeg(png, layer.width, layer.height, work);
  try { forceChromaAtIndexZero(pixels, bgraPalette); } catch (error) {
    const usage = new Uint32Array(256); for (const p of pixels) usage[p] += 1; const spare = [...usage.keys()].find(i => i > 0 && usage[i] === 0); if (spare === undefined) throw error;
    bgraPalette.copy(bgraPalette, spare * 4, 0, 4); for (let i = 0; i < pixels.length; i += 1) if (pixels[i] === 0) pixels[i] = spare;
    bgraPalette[0] = 0xff; bgraPalette[1] = 0x00; bgraPalette[2] = 0xfc; bgraPalette[3] = 0xff;
  }
  writeFileSync(output, encodeGif(layer.width, layer.height, pixels, bgraPalette)); verifyGif(output, layer.width, layer.height);
}
const options = parseArgs(process.argv.slice(2)); const work = mkdtempSync(join(tmpdir(), 'stage02-production-'));
try {
  mkdirSync(options.outputdir, { recursive: true }); const canonical = join(work, 'canonical.png');
  command('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', options.source, '-vf', `scale=${CANONICAL.width}:${CANONICAL.height}:flags=lanczos,format=rgb24`, '-frames:v', '1', canonical]);
  const files = [];
  for (const layer of LAYERS) {
    const [x, y, cw, ch] = layer.crop; const png = join(work, `${layer.file}.png`); const output = join(options.outputdir, layer.file);
    const filter = `[0:v]crop=${cw}:${ch}:${x}:${y},scale=${layer.width}:${layer.height}:flags=lanczos,drawbox=x=0:y=0:w=32:h=32:color=0xFC00FF:t=fill,format=rgb24[out]`;
    command('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', canonical, '-filter_complex', filter, '-map', '[out]', '-frames:v', '1', png]);
    if (layer.file === 'f1.GIF' || layer.file === 'f2.GIF') {
      const fg = join(work, `${layer.file}-fg.png`); const fgFilter = `[0:v]scale=2172:724:flags=lanczos,crop=2172:${ch}:0:${y},scale=${layer.width}:${layer.height}:flags=lanczos,format=rgba,colorkey=0xFF00FF:0.40:0,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(gt(r(X,Y),180)*lt(g(X,Y),100)*gt(b(X,Y),180),0,255)',format=rgba[fg];color=c=${CHROMA}:s=${layer.width}x${layer.height},format=rgba[bg];[bg][fg]overlay=0:0:format=auto,drawbox=x=0:y=0:w=32:h=32:color=0xFC00FF:t=fill,format=rgb24[out]`;
      command('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', options.foregroundsource, '-filter_complex', fgFilter, '-map', '[out]', '-frames:v', '1', fg]); encodeIndexed(fg, output, layer, join(work, 'palette'));
    } else encodeIndexed(png, output, layer, join(work, 'palette'));
    files.push({ path: layer.file, canvas: [layer.width, layer.height], role: layer.role, sha256: sha256(output) });
  }
  writeFileSync(join(options.outputdir, 'PRODUCTION-MANIFEST.json'), `${JSON.stringify({ schemaVersion: 1, status: 'original-visible-background-candidate-needs-runtime-review', productionReady: false, source: { filename: basename(options.source), sha256: sha256(options.source), canonicalCanvas: [CANONICAL.width, CANONICAL.height], originalGeneratedArt: true }, foreground: { filename: basename(options.foregroundsource), originalGeneratedArt: true, centralLaneIntentionallyClear: true }, chroma: { paletteIndex: 0, rgb: CHROMA, gifTransparencyExtension: false }, files, deferred: ['runtime parallax/viewport seam review', 'art-direction and gameplay review'] }, null, 2)}\n`);
  console.log(`Stage02 production candidate built: ${files.map(f => f.path).join(', ')}`);
} finally { rmSync(work, { recursive: true, force: true }); }
