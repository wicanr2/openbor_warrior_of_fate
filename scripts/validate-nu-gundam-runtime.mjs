#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import {
  analyzePose,
  probeImage,
  verifyGif,
} from './build-mazinger-p0-prototype.mjs';

function usage() {
  return `Validate the ν Gundam sixth-character P0 runtime.

Usage:
  node scripts/validate-nu-gundam-runtime.mjs \\
    --base-data PATH --template-data PATH --build-dir PATH

Checks 71 action GIFs against Huangzhong canvas/foreground anchors, all 73 ν
model GIF references, exact-case data dependencies, disabled h1..h16 weapon
switching, HUD profiles, indexed palettes and exact #FC00FF palette index 0.`;
}

function parseArgs(argv) {
  const options = { baseData: null, templateData: null, buildDir: null };
  const keys = new Map([
    ['--base-data', 'baseData'],
    ['--template-data', 'templateData'],
    ['--build-dir', 'buildDir'],
  ]);
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
  if (!options.baseData || !options.templateData || !options.buildDir) {
    throw new Error('--base-data, --template-data and --build-dir are required');
  }
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

function resolveDataPath(options, enginePath) {
  if (!enginePath.startsWith('data/')) return null;
  const relative = enginePath.slice(5);
  const build = join(options.buildDir, 'data', relative);
  if (existsSync(build)) return build;
  const template = join(options.templateData, relative);
  if (existsSync(template)) return template;
  const base = join(options.baseData, relative);
  return existsSync(base) ? base : null;
}

function activeDirective(text, name) {
  return text.split(/\r?\n/).filter((line) => {
    const body = line.split('#', 1)[0].trim();
    return body && body.split(/\s+/, 1)[0].toLowerCase() === name;
  });
}

function modelRegistryNames(path) {
  const names = new Set();
  for (const line of readFileSync(path, 'latin1').split(/\r?\n/)) {
    const tokens = line.split('#', 1)[0].trim().split(/\s+/);
    if (['load', 'know'].includes((tokens[0] ?? '').toLowerCase()) && tokens[1]) {
      names.add(tokens[1].toLowerCase());
    }
  }
  return names;
}

function frameManifestByOutput(manifest) {
  const frames = new Map();
  for (const frame of manifest.frames ?? []) {
    if (frame?.output) frames.set(basename(frame.output), frame);
  }
  return frames;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifestPath = join(options.buildDir, 'NU-GUNDAM-P0-BUILD-MANIFEST.json');
  if (!existsSync(manifestPath)) throw new Error(`Missing build manifest: ${manifestPath}`);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.scope?.nuPhysicalGif !== 73 || manifest.scope?.actionGif !== 71) {
    throw new Error(`Expected 73 physical / 71 action GIFs, got ${manifest.scope?.nuPhysicalGif}/${manifest.scope?.actionGif}`);
  }
  if (manifest.scope?.clampedPlacements !== 0) {
    throw new Error(`Expected zero clamped placements, got ${manifest.scope?.clampedPlacements}`);
  }
  const frameManifests = frameManifestByOutput(manifest);
  const actionFrames = manifest.frames.filter((frame) => frame.placement);
  if (actionFrames.length !== 71) throw new Error(`Expected 71 placed action frames, got ${actionFrames.length}`);

  const placementFailures = [];
  const placementRows = [];
  for (const frame of actionFrames) {
    const file = basename(frame.output);
    const templatePath = join(options.baseData, 'chars/huangzhong', file);
    const outputPath = join(options.buildDir, 'data/chars/nu_gundam', file);
    if (!existsSync(templatePath) || !existsSync(outputPath)) {
      placementFailures.push(`${file}: missing template or output`);
      continue;
    }
    const templateImage = probeImage(templatePath);
    const outputImage = probeImage(outputPath);
    if (templateImage.width !== outputImage.width || templateImage.height !== outputImage.height) {
      placementFailures.push(`${file}: canvas ${outputImage.width}x${outputImage.height} != ${templateImage.width}x${templateImage.height}`);
      continue;
    }
    verifyGif(outputPath, templateImage.width, templateImage.height);
    const templatePose = analyzePose(templatePath);
    const outputPose = analyzePose(outputPath);
    const outputEdges = edgeSet(outputPose);
    const addedEdges = [...outputEdges].filter((edge) => !edgeSet(templatePose).has(edge));
    const manifestFrame = frameManifests.get(file);
    if (!manifestFrame) {
      placementFailures.push(`${file}: missing frame manifest entry`);
      continue;
    }
    const expectedAnchor = manifestFrame.placement?.originalForegroundAnchor;
    const expectedDelta = manifestFrame.placement?.outputAnchorDelta;
    if (!expectedAnchor || !expectedDelta) {
      placementFailures.push(`${file}: missing manifest anchor data`);
      continue;
    }
    const outputAnchor = anchor(outputPose);
    const delta = {
      x: outputAnchor.x - expectedAnchor.x,
      y: outputAnchor.y - expectedAnchor.y,
    };
    const manifestDelta = {
      x: expectedDelta.x,
      y: expectedDelta.y,
    };
    if (frame.placement.alignmentClamped) placementFailures.push(`${file}: alignmentClamped=true`);
    if (addedEdges.length) placementFailures.push(`${file}: added canvas edges ${addedEdges.join(',')}`);
    if (Math.abs(delta.x - manifestDelta.x) > 0.5 || Math.abs(delta.y - manifestDelta.y) > 0.5) {
      placementFailures.push(`${file}: output delta ${delta.x},${delta.y} disagrees with manifest ${manifestDelta.x},${manifestDelta.y}`);
    }
    if (Math.abs(delta.x) > 1 || Math.abs(delta.y) > 1) {
      placementFailures.push(`${file}: anchor drift ${delta.x},${delta.y}`);
    }
    placementRows.push({ file, addedEdges, anchorDelta: delta, scaleReduction: frame.placement.scaleReduction });
  }

  const modelPath = join(options.buildDir, 'data/chars/nu_gundam/nu_gundam.txt');
  if (!existsSync(modelPath)) throw new Error(`Missing ν model: ${modelPath}`);
  const model = readFileSync(modelPath, 'utf8').replaceAll('\\', '/');
  if (!/^name\s+nu_gundam\s*$/mi.test(model)) throw new Error('ν model has no exact name nu_gundam');
  for (const forbidden of ['weapons', 'hmap', 'weaponframe']) {
    const active = activeDirective(model, forbidden);
    if (active.length) throw new Error(`ν model still has active ${forbidden}: ${active.join(' | ')}`);
  }
  if (/onspawnscript\s+data\/scripts\/spawn\/huangzhong\.c/i.test(model)) {
    throw new Error('ν model still uses Huangzhong spawn script');
  }
  if (/data\/chars\/nu_gundam\/sp\.wav/i.test(model)) {
    throw new Error('ν model points at nonexistent ν-local sp.wav');
  }
  const gifRefs = [...new Set(model.match(/data\/chars\/nu_gundam\/[A-Za-z0-9_.\/-]+\.gif/gi) ?? [])];
  if (gifRefs.length !== 73) throw new Error(`Expected 73 unique ν GIF refs, got ${gifRefs.length}`);
  const dataRefs = [...new Set(model.match(/data\/[A-Za-z0-9_.\/-]+\.(?:gif|wav|c|txt|bor)/gi) ?? [])];
  const missingRefs = dataRefs.filter((path) => !resolveDataPath(options, path));
  if (missingRefs.length) throw new Error(`Missing exact-case model refs: ${missingRefs.join(', ')}`);

  const registryPath = join(options.templateData, 'models.txt');
  const registry = modelRegistryNames(existsSync(registryPath) ? registryPath : join(options.baseData, 'models.txt'));
  const loads = activeDirective(model, 'load').map((line) => line.split('#', 1)[0].trim().split(/\s+/)[1]?.toLowerCase());
  const locallyBuiltLoads = new Map([
    ['nu_funnel_shot', join(options.buildDir, 'data/chars/nu_gundam/funnel/nu_funnel_shot.txt')],
  ]);
  const missingLoads = loads.filter((name) => name && !registry.has(name) && !existsSync(locallyBuiltLoads.get(name) ?? ''));
  if (missingLoads.length) throw new Error(`ν load dependencies not registered: ${missingLoads.join(', ')}`);
  const funnelModelPath = locallyBuiltLoads.get('nu_funnel_shot');
  const funnelModel = readFileSync(funnelModelPath, 'utf8').replaceAll('\\', '/');
  const funnelRefs = [...new Set(funnelModel.match(/data\/[A-Za-z0-9_.\/-]+\.(?:gif|wav)/gi) ?? [])];
  const missingFunnelRefs = funnelRefs.filter((path) => !resolveDataPath(options, path));
  if (missingFunnelRefs.length) throw new Error(`Missing Fin Funnel proxy refs: ${missingFunnelRefs.join(', ')}`);
  if (!/candamage\s+obstacle enemy\s*$/mi.test(funnelModel) || /candamage[^\r\n]*player/i.test(funnelModel)) {
    throw new Error('Fin Funnel proxy candamage must exclude player and npc');
  }
  const funnelShots = (model.match(/@cmd\s+shoot\s+"nu_funnel_shot"/gi) ?? []).length;
  if (funnelShots !== 6) throw new Error(`Expected 6 Fin Funnel proxy shots, got ${funnelShots}`);

  const profilePaths = [
    join(options.buildDir, 'data/profiles/nu_gundam.gif'),
    join(options.buildDir, 'data/profiles/nu_gundam_m.gif'),
  ];
  for (const path of profilePaths) {
    if (!existsSync(path)) throw new Error(`Missing ν profile: ${path}`);
    verifyGif(path, 35, 54);
  }
  const spawnPath = join(options.buildDir, 'data/scripts/spawn/nu_gundam.c');
  if (!existsSync(spawnPath) || !/setLevel\s*\(\s*\)/.test(readFileSync(spawnPath, 'utf8'))) {
    throw new Error('ν spawn script is missing its setLevel-only closure');
  }
  if (placementFailures.length) {
    console.error(JSON.stringify({ status: 'FAIL', placementFailures, placementRows }, null, 2));
    throw new Error(`${placementFailures.length} placement gate(s) failed`);
  }

  console.log(JSON.stringify({
    status: 'PASS',
    actionGif: actionFrames.length,
    modelGifRefs: gifRefs.length,
    exactCaseDataRefs: dataRefs.length,
    missingRefs: 0,
    clampedPlacements: 0,
    addedCanvasEdges: 0,
    maximumAnchorDrift: Math.max(...placementRows.flatMap((row) => [Math.abs(row.anchorDelta.x), Math.abs(row.anchorDelta.y)])),
    minimumSafeScaleRatio: Math.min(...placementRows.map((row) => row.scaleReduction)),
    activeLoadDependencies: loads,
    finFunnelProxy: { model: 'nu_funnel_shot', shotsPerCommand: funnelShots, exactCaseRefs: funnelRefs.length },
    disabledHumanWeaponDirectives: ['weapons', 'hmap', 'weaponframe'],
    hudProfiles: profilePaths.length,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
