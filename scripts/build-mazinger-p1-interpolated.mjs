#!/usr/bin/env node

import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyzePose, encodeGif, forceChromaAtIndexZero, makeComposedPng, palettizeWithFfmpeg, probeImage, verifyGif } from './build-mazinger-p0-prototype.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PRIVATE = join(ROOT, '../openbor_security_materal');
const SOURCE_DIR = join(PRIVATE, 'assets/players/zhangfei/references/generated-storyboards/mazinger-production-candidate-v1-keyposes');
const BASE_DIR = join(ROOT, '../workplace/extracted/data/chars/zhangfei');
const INPUT_MANIFEST = join(PRIVATE, 'assets/players/zhangfei/candidates/mazinger-production-p0-v1/BUILD-MANIFEST.json');
const OUT = join(PRIVATE, 'assets/players/zhangfei/candidates/mazinger-production-p1-interpolated-v1');

function parseArgs(argv) {
  const options = { sourceDir: SOURCE_DIR, baseDir: BASE_DIR, inputManifest: INPUT_MANIFEST, outputDir: OUT, model: 'zhangfei' };
  const keys = new Map([['--source-dir', 'sourceDir'], ['--base-dir', 'baseDir'], ['--input-manifest', 'inputManifest'], ['--output-dir', 'outputDir'], ['--model', 'model']]);
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--help') { console.log('Build independent interpolated rasters from a player manifest.'); process.exit(0); }
    const key = keys.get(argv[i]);
    if (!key || !argv[i + 1]) throw new Error(`Unknown or incomplete option: ${argv[i]}`);
    const value = argv[++i];
    options[key] = key === 'model' ? value : resolve(value);
  }
  return options;
}

function run(args) {
  const result = spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr?.trim() || 'ffmpeg failed');
}
function blend(sourceA, sourceB, output, ratio) {
  const a = (1 - ratio).toFixed(3);
  const b = ratio.toFixed(3);
  run(['-hide_banner', '-loglevel', 'error', '-y', '-i', sourceA, '-i', sourceB, '-filter_complex', `[0:v]scale=313:313:force_original_aspect_ratio=decrease,pad=313:313:(ow-iw)/2:(oh-ih)/2:color=0xFC00FF[a];[1:v]scale=313:313:force_original_aspect_ratio=decrease,pad=313:313:(ow-iw)/2:(oh-ih)/2:color=0xFC00FF[b];[a][b]blend=all_expr='A*${a}+B*${b}',format=rgb24`, '-frames:v', '1', output]);
}
function markChromaCorner(path) {
  const marked = `${path}.marked.png`;
  run(['-hide_banner', '-loglevel', 'error', '-y', '-i', path, '-vf', 'drawbox=x=0:y=0:w=8:h=8:color=0xFC00FF:t=fill', '-frames:v', '1', marked]);
  renameSync(marked, path);
}
function parseFramePath(output) {
  const marker = '/data/chars/';
  const relativeMarker = 'data/chars/';
  const index = output.indexOf(marker);
  if (index < 0 && output.startsWith(relativeMarker)) {
    const rest = output.slice(relativeMarker.length);
    const slash = rest.indexOf('/');
    if (slash < 1) throw new Error(`Unexpected model path ${output}`);
    return { model: rest.slice(0, slash), rel: rest.slice(slash + 1) };
  }
  const dataMarker = '/data/';
  const dataIndex = output.indexOf(dataMarker);
  const relativeDataMarker = 'data/';
  if (dataIndex >= 0 && !output.includes('/data/chars/')) {
    const rest = output.slice(dataIndex + dataMarker.length);
    const slash = rest.indexOf('/');
    if (slash < 1) return { model: rest, rel: '' };
    return { model: rest.slice(0, slash), rel: rest.slice(slash + 1) };
  }
  if (output.startsWith(relativeDataMarker) && !output.startsWith(relativeMarker)) {
    const rest = output.slice(relativeDataMarker.length);
    const slash = rest.indexOf('/');
    if (slash < 1) return { model: rest, rel: '' };
    return { model: rest.slice(0, slash), rel: rest.slice(slash + 1) };
  }
  if (index < 0) {
    const prefix = 'local-only/';
    if (output.startsWith(prefix)) return { model: parseArgs(process.argv.slice(2)).model, rel: output.slice(prefix.length) };
    throw new Error(`Unexpected output path ${output}`);
  }
  const rest = output.slice(index + marker.length);
  const slash = rest.indexOf('/');
  if (slash < 1) throw new Error(`Unexpected model path ${output}`);
  return { model: rest.slice(0, slash), rel: rest.slice(slash + 1) };
}
function findTarget(baseDir, model, rel) {
  const direct = join(baseDir, model, rel);
  if (existsSync(direct)) return direct;
  const wanted = rel.split('/').pop();
  const root = join(baseDir, model);
  const matches = [];
  function visit(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.name === wanted) matches.push(path);
    }
  }
  visit(root);
  if (!matches.length) throw new Error(`Missing target ${model}/${rel}`);
  return matches.sort()[0];
}

const options = parseArgs(process.argv.slice(2));
const manifest = JSON.parse(readFileSync(options.inputManifest, 'utf8'));
const sourceFiles = readdirSync(options.sourceDir)
  .filter((name) => /^frame-\d+\.png$/i.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const sourcePaths = sourceFiles.map((name) => join(options.sourceDir, name));
if (!sourcePaths.every(existsSync)) throw new Error('Missing Mazinger keypose source');
const frames = manifest.frames ?? (manifest.files ?? []).map((file) => ({
  output: file.path,
  targetCanvas: file.canvas ? { width: file.canvas[0], height: file.canvas[1] } : undefined,
  placement: file.placement,
}));
if (!frames.length) throw new Error('Manifest has no frames/files to build');
const temp = mkdtempSync(join(tmpdir(), 'mazinger-p1-'));
const records = [];
try {
  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    const parsed = parseFramePath(frame.output);
    const rel = parsed.rel;
    const base = findTarget(options.baseDir, parsed.model, rel);
    const targetProbe = probeImage(base);
    const sourceA = sourcePaths[index % sourcePaths.length];
    const sourceB = sourcePaths[(index + 1) % sourcePaths.length];
    const ratio = ((index % 4) + 1) / 5;
    const blended = join(temp, `${index}.png`);
    blend(sourceA, sourceB, blended, ratio);
    const pose = analyzePose(blended);
    const composed = join(temp, `${index}-composed.png`);
    const targetCanvas = frame.targetCanvas ?? { width: targetProbe.width, height: targetProbe.height };
    const targetOffset = frame.targetOffset ?? frame.placement?.modelOffset ?? { x: Math.round(targetCanvas.width / 2), y: targetCanvas.height - 1 };
    const target = { originalPath: base, canvas: targetCanvas, offset: targetOffset };
    const spriteHeight = manifest.spriteHeight ?? (frame.placement?.scale ? frame.placement.scale * pose.crop.height : 96);
    const placement = makeComposedPng(blended, composed, pose, target, spriteHeight, { anchor: 'foot-contact' }, true);
    let palette = palettizeWithFfmpeg(composed, targetProbe.width, targetProbe.height, temp);
    try {
      forceChromaAtIndexZero(palette.pixels, palette.bgraPalette, { allowMissing: true });
    } catch (error) {
      if (!String(error?.message).includes('does not contain exact #FC00FF')) throw error;
      markChromaCorner(composed);
      palette = palettizeWithFfmpeg(composed, targetProbe.width, targetProbe.height, temp);
      forceChromaAtIndexZero(palette.pixels, palette.bgraPalette, { allowMissing: true });
    }
    const targetRel = relative(options.baseDir, base);
    const outputRoot = basename(options.baseDir) === 'chars' ? 'data/chars' : 'data';
    const output = join(options.outputDir, outputRoot, targetRel);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, encodeGif(targetProbe.width, targetProbe.height, palette.pixels, palette.bgraPalette));
    verifyGif(output, targetProbe.width, targetProbe.height);
    records.push({ output: `${outputRoot}/${targetRel}`, sourceA: sourceFiles[index % sourceFiles.length], sourceB: sourceFiles[(index + 1) % sourceFiles.length], interpolationRatio: ratio, independentRaster: true, targetCanvas, targetOffset, placement });
  }
} finally { rmSync(temp, { recursive: true, force: true }); }
mkdirSync(options.outputDir, { recursive: true });
  writeFileSync(join(options.outputDir, 'BUILD-MANIFEST.json'), `${JSON.stringify({ schemaVersion: 1, status: 'art-candidate-interpolated-not-production-ready', productionReady: false, sourcePoseReuse: false, interpolation: 'per-output raster blend between adjacent keyed poses; requires artist redraw/review', sourcePoseCount: sourceFiles.length, gifCount: records.length, deferred: ['hand-redrawn in-betweens', 'edge cleanup and silhouette review', 'BBox/attack-box review', 'gameplay QA'], frames: records }, null, 2)}\n`);
console.log(`Built ${records.length} interpolated GIFs at ${options.outputDir}`);
