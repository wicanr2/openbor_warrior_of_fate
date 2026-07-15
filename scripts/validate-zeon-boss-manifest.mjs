#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const manifestPath = path.join(ROOT, 'research/manifests/zeon-boss-with-legs-v2.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

const expectedPackages = [
  'bossModel',
  'bossHud',
  'projectile',
  'robotDebris',
  'pilotCutin',
  'storyDialogue',
  'stageSpawns',
];

const errors = [];

if (!exists('research/manifests/zeon-boss-with-legs-v2.json')) {
  errors.push('missing research/manifests/zeon-boss-with-legs-v2.json');
} else {
  let manifest;
  try {
    manifest = readJson(manifestPath);
  } catch (error) {
    errors.push(`manifest JSON parse failed: ${error.message}`);
  }

  if (manifest) {
    if (manifest.schemaVersion !== 1) {
      errors.push(`unexpected schemaVersion: ${manifest.schemaVersion}`);
    }
    if (manifest.status !== 'art-candidate-custom-crop-only-not-runtime-overlay') {
      errors.push(`unexpected status: ${manifest.status}`);
    }
    if (manifest.modelId !== 'zeon_boss') {
      errors.push(`unexpected modelId: ${manifest.modelId}`);
    }
    if (manifest.pilot !== 'char_pilot') {
      errors.push(`unexpected pilot: ${manifest.pilot}`);
    }
    if (manifest.publicOverview !== 'research/zeon-boss/zeon-boss-with-legs-storyboard-v2-overview.png') {
      errors.push(`unexpected publicOverview: ${manifest.publicOverview}`);
    } else if (!exists(manifest.publicOverview)) {
      errors.push(`missing publicOverview image: ${manifest.publicOverview}`);
    }
    if (!manifest.source || manifest.source.path !== 'private-only/zeon-boss-with-legs-storyboard-v2.png') {
      errors.push('unexpected source.path for zeon_boss manifest');
    }
    if (!Array.isArray(manifest.customCrops) || manifest.customCrops.length !== 16) {
      errors.push(`expected 16 custom crops, found ${Array.isArray(manifest.customCrops) ? manifest.customCrops.length : 'non-array'}`);
    } else {
      for (const [index, crop] of manifest.customCrops.entries()) {
        if (!Array.isArray(crop) || crop.length !== 4 || crop.some(value => !Number.isInteger(value) || value < 0)) {
          errors.push(`invalid crop at index ${index}`);
        }
      }
    }
    if (manifest.minimumPrivateGifClosure !== 67) {
      errors.push(`unexpected minimumPrivateGifClosure: ${manifest.minimumPrivateGifClosure}`);
    }
    if (!manifest.chroma || manifest.chroma.runtimeGifRequiredPaletteIndex !== 0 || manifest.chroma.overviewNormalized !== '#FC00FF') {
      errors.push('unexpected chroma contract');
    }
    if (!manifest.runtimeState || manifest.runtimeState.productionReady !== false) {
      errors.push('zeon_boss runtimeState.productionReady should remain false');
    }
    if (!Array.isArray(manifest.handoffQueue)) {
      errors.push('handoffQueue must be an array');
    } else {
      const packages = new Set();
      for (const item of manifest.handoffQueue) {
        if (!item || typeof item !== 'object' || !item.package) {
          errors.push('handoffQueue contains an invalid entry');
          continue;
        }
        packages.add(item.package);
      }
      for (const pkg of expectedPackages) {
        if (!packages.has(pkg)) {
          errors.push(`handoffQueue missing package: ${pkg}`);
        }
      }
    }
  }
}

if (errors.length) {
  for (const error of errors) {
    console.error(error);
  }
  console.error(`\n${errors.length} zeon boss manifest problem(s) found.`);
  process.exitCode = 1;
} else {
  console.log('Zeon boss manifest validation PASS.');
}
