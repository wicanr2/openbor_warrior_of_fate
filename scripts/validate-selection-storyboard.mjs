#!/usr/bin/env node

import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, 'research/manifests/six-player-selection-storyboard.json');
const IMAGE_PATH = path.join(ROOT, 'research/ui/six-player-selection-storyboard.gif');

function sha256(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function probe(filePath) {
  const result = spawnSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,nb_frames',
    '-of', 'json',
    filePath,
  ], { encoding: 'utf8' });
  if (result.error && result.status === null) throw result.error;
  if (result.status !== 0) throw new Error(`ffprobe failed for ${filePath}: ${result.stderr.trim()}`);
  return JSON.parse(result.stdout).streams?.[0];
}

const errors = [];
if (!fs.existsSync(MANIFEST_PATH)) errors.push('missing storyboard manifest');
if (!fs.existsSync(IMAGE_PATH)) errors.push('missing storyboard image');

if (!errors.length) {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const info = probe(IMAGE_PATH);
  if (manifest.productionReady !== false) errors.push('productionReady must remain false');
  if ((info?.width ?? 0) !== 480 || (info?.height ?? 0) !== 276) errors.push('storyboard canvas must be 480x276');
  if (Number(info?.nb_frames ?? 0) !== 8) errors.push(`storyboard must have 8 frames, got ${info?.nb_frames ?? 'unknown'}`);
  if (manifest.output?.sha256 !== sha256(IMAGE_PATH)) errors.push('storyboard sha256 mismatch');
  if ((manifest.panels ?? []).length !== 8) errors.push(`expected 8 storyboard panels, got ${(manifest.panels ?? []).length}`);
}

if (errors.length) {
  for (const error of errors) console.error(error);
  console.error(`\n${errors.length} storyboard problem(s) found.`);
  process.exitCode = 1;
} else {
  console.log('Selection storyboard validation PASS.');
}

