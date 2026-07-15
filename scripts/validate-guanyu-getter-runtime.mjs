#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import {
  analyzePose,
  probeImage,
  verifyGif,
} from './build-mazinger-p0-prototype.mjs';

function usage() {
  return `Validate a Getter-v2 Guanyu runtime build against the extracted base.

Usage:
  node scripts/validate-guanyu-getter-runtime.mjs \
    --base-data PATH --build-dir PATH

Gates all 62 physical action GIFs for canvas and palette compatibility,
zero hard clamping, no newly introduced canvas-edge contact, and at most
one pixel of centre/bottom foreground-anchor drift.`;
}

function parseArgs(argv) {
  const options = { baseData: null, buildDir: null };
  const keys = new Map([['--base-data', 'baseData'], ['--build-dir', 'buildDir']]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') {
      console.log(usage());
      process.exit(0);
    }
    const key = keys.get(argument);
    if (!key) throw new Error(`Unknown option: ${argument}`);
    const value = argv[index + 1];
    if (!value) throw new Error(`${argument} requires a path`);
    options[key] = resolve(value);
    index += 1;
  }
  if (!options.baseData || !options.buildDir) throw new Error('--base-data and --build-dir are required');
  return options;
}

function edgeSet(pose) {
  const { width, height } = pose.sourceCanvas;
  const { x, y, width: cropWidth, height: cropHeight } = pose.crop;
  return new Set([
    ...(x === 0 ? ['left'] : []),
    ...(y === 0 ? ['top'] : []),
    ...(x + cropWidth === width ? ['right'] : []),
    ...(y + cropHeight === height ? ['bottom'] : []),
  ]);
}

function anchor(pose) {
  return {
    x: pose.crop.x + pose.crop.width / 2,
    y: pose.crop.y + pose.crop.height - 1,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifestPath = join(options.buildDir, 'GUANYU-P0-BUILD-MANIFEST.json');
  if (!existsSync(manifestPath)) throw new Error(`Missing build manifest: ${manifestPath}`);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.artVersion !== 'getter-v2-storyboard-v5') {
    throw new Error(`Expected getter-v2-storyboard-v5, got ${manifest.artVersion}`);
  }
  if (manifest.placementMode !== 'legacy-foreground-bounds') {
    throw new Error(`Expected legacy-foreground-bounds, got ${manifest.placementMode}`);
  }
  if (manifest.scope?.guanyuPhysicalGif !== 65) {
    throw new Error(`Expected 65 Guanyu GIFs, got ${manifest.scope?.guanyuPhysicalGif}`);
  }
  if (manifest.scope?.clampedPlacements !== 0) {
    throw new Error(`Expected zero clamped placements, got ${manifest.scope?.clampedPlacements}`);
  }

  const physicalFrames = manifest.frames.filter((frame) => frame.placement);
  if (physicalFrames.length !== 62) {
    throw new Error(`Expected 62 physical action GIFs, got ${physicalFrames.length}`);
  }
  const failures = [];
  const rows = [];
  for (const frame of physicalFrames) {
    const file = basename(frame.output);
    const basePath = join(options.baseData, 'chars/guanyu', file);
    const outputPath = join(options.buildDir, 'data/chars/guanyu', file);
    if (!existsSync(basePath) || !existsSync(outputPath)) {
      failures.push(`${file}: missing base or output file`);
      continue;
    }
    const baseImage = probeImage(basePath);
    const outputImage = probeImage(outputPath);
    if (baseImage.width !== outputImage.width || baseImage.height !== outputImage.height) {
      failures.push(`${file}: canvas ${outputImage.width}x${outputImage.height} != base ${baseImage.width}x${baseImage.height}`);
      continue;
    }
    verifyGif(outputPath, baseImage.width, baseImage.height);
    const basePose = analyzePose(basePath);
    const outputPose = analyzePose(outputPath);
    const baseEdges = edgeSet(basePose);
    const outputEdges = edgeSet(outputPose);
    const addedEdges = [...outputEdges].filter((edge) => !baseEdges.has(edge));
    const baseAnchor = anchor(basePose);
    const outputAnchor = anchor(outputPose);
    const delta = {
      x: outputAnchor.x - baseAnchor.x,
      y: outputAnchor.y - baseAnchor.y,
    };
    if (frame.placement.alignmentClamped) failures.push(`${file}: alignmentClamped=true`);
    if (addedEdges.length) failures.push(`${file}: added canvas edge(s): ${addedEdges.join(',')}`);
    if (Math.abs(delta.x) > 1 || Math.abs(delta.y) > 1) {
      failures.push(`${file}: foreground anchor drift (${delta.x},${delta.y}) exceeds 1px`);
    }
    rows.push({
      file,
      baseEdges: [...baseEdges],
      outputEdges: [...outputEdges],
      addedEdges,
      anchorDelta: delta,
      scale: frame.placement.scale,
      legacyRequestedScale: frame.placement.legacyRequestedScale,
    });
  }
  if (failures.length) {
    console.error(JSON.stringify({ status: 'FAIL', failures, rows }, null, 2));
    throw new Error(`${failures.length} Getter runtime gate(s) failed`);
  }
  const reductions = rows.map((row) => row.scale / row.legacyRequestedScale);
  console.log(JSON.stringify({
    status: 'PASS',
    physicalGif: rows.length,
    clampedPlacements: 0,
    addedCanvasEdges: 0,
    maximumAnchorDrift: Math.max(...rows.flatMap((row) => [Math.abs(row.anchorDelta.x), Math.abs(row.anchorDelta.y)])),
    minimumSafeScaleRatio: Math.min(...reductions),
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
