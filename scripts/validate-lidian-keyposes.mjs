#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const manifestPath = path.join(ROOT, 'research/manifests/lidian-red-spear-commander-keyposes.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

const errors = [];

if (!exists('research/manifests/lidian-red-spear-commander-keyposes.json')) {
  errors.push('missing research/manifests/lidian-red-spear-commander-keyposes.json');
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
    if (manifest.status !== 'concept-keyposes-not-production-ready') {
      errors.push(`unexpected status: ${manifest.status}`);
    }
    if (manifest.source !== 'local-only/lidian-red-spear-commander-storyboard-v1.png') {
      errors.push(`unexpected source: ${manifest.source}`);
    }
    if (manifest.chromaKey?.hex !== '#FC00FF' || manifest.chromaKey?.requiredPaletteIndex !== 0) {
      errors.push('unexpected chromaKey contract');
    }
    if (!manifest.sourceCanvas || manifest.sourceCanvas.width !== 1254 || manifest.sourceCanvas.height !== 1254) {
      errors.push('unexpected sourceCanvas');
    }
    if (!Array.isArray(manifest.frames) || manifest.frames.length !== 16) {
      errors.push(`expected 16 frames, found ${Array.isArray(manifest.frames) ? manifest.frames.length : 'non-array'}`);
    } else {
      for (const [index, frame] of manifest.frames.entries()) {
        const expectedOutput = `local-only/frame-${String(index + 1).padStart(2, '0')}.png`;
        if (frame.output !== expectedOutput) {
          errors.push(`frame ${index + 1} output mismatch: expected ${expectedOutput}, found ${frame.output}`);
        }
        if (!frame.sourceCrop || typeof frame.sourceCrop.x !== 'number' || typeof frame.sourceCrop.y !== 'number') {
          errors.push(`frame ${index + 1} missing sourceCrop`);
        }
      }
    }
    if (!manifest.normalization || !manifest.normalization.rule) {
      errors.push('missing normalization rule');
    }
  }
}

if (!exists('research/boss/lidian-red-spear-commander-storyboard-v1-keyed.png')) {
  errors.push('missing public overview image: research/boss/lidian-red-spear-commander-storyboard-v1-keyed.png');
}

if (errors.length) {
  for (const error of errors) {
    console.error(error);
  }
  console.error(`\n${errors.length} Lidian keyposes problem(s) found.`);
  process.exitCode = 1;
} else {
  console.log('Lidian keyposes validation PASS.');
}
