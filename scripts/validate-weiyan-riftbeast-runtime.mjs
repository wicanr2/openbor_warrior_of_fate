#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { analyzePose, verifyGif } from './build-mazinger-p0-prototype.mjs';

function usage() {
  return `Validate the Wei Yan Riftbeast P0 engineering runtime.

Usage:
  node scripts/validate-weiyan-riftbeast-runtime.mjs \\
    --base-data PATH --template-data PATH --build-dir PATH

Checks 84 canonical action GIFs against Wei Yan canvases/foreground anchors,
86 main-model GIF refs, all exact-case data dependencies, disabled w1..w16,
mechanical audio/hitflash rewrites, lowercase HUD profiles and the tail-ray
P0 support model.`;
}

function parseArgs(argv) {
  const options = { baseData: null, templateData: null, buildDir: null };
  const keys = new Map([
    ['--base-data', 'baseData'], ['--template-data', 'templateData'], ['--build-dir', 'buildDir'],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') { console.log(usage()); process.exit(0); }
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

function engineRefs(text) {
  return [...text.replaceAll('\\', '/').matchAll(/\bdata\/[^\s"'#;,()]+\.(?:gif|png|wav|c|txt|bor)\b/gi)]
    .map((match) => match[0]);
}

function resolveDataPath(options, enginePath) {
  if (!enginePath.startsWith('data/')) return null;
  const relative = enginePath.slice(5);
  for (const candidate of [
    join(options.buildDir, 'data', relative),
    join(options.templateData, relative),
    join(options.baseData, relative),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function edgeSet(pose) {
  const { width, height } = pose.sourceCanvas;
  const { x, y, width: cropWidth, height: cropHeight } = pose.crop;
  return new Set([
    ...(x === 0 ? ['left'] : []), ...(y === 0 ? ['top'] : []),
    ...(x + cropWidth === width ? ['right'] : []),
    ...(y + cropHeight === height ? ['bottom'] : []),
  ]);
}

function anchor(pose) {
  return { x: pose.crop.x + pose.crop.width / 2, y: pose.crop.y + pose.crop.height - 1 };
}

function directiveLines(text, directive) {
  return text.split(/\r?\n/).filter((line) => {
    const body = line.split('#', 1)[0].trim();
    return body && body.split(/\s+/, 1)[0].toLowerCase() === directive;
  });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const modelPath = join(options.buildDir, 'data/chars/weiyan/weiyan.txt');
  const spawnPath = join(options.buildDir, 'data/scripts/spawn/weiyan.c');
  const rayModelPath = join(options.buildDir, 'data/chars/weiyan/tail_ray/weiyan_tail_ray.txt');
  const modelsPath = join(options.buildDir, 'data/models.txt');
  for (const path of [modelPath, spawnPath, rayModelPath, modelsPath]) {
    if (!existsSync(path)) throw new Error(`Missing runtime file: ${path}`);
  }
  const modelText = readFileSync(modelPath, 'latin1').replaceAll('\\', '/');
  const mainImageOccurrences = [...modelText.matchAll(/data\/chars\/weiyan\/([^\s#;]+\.gif)/gi)]
    .map((match) => match[1]);
  const mainImageRefs = [...new Set(mainImageOccurrences)];
  if (mainImageRefs.length !== 86) throw new Error(`Expected 86 main GIF refs, got ${mainImageRefs.length}`);
  const actions = mainImageRefs.filter((path) => !['icon.gif', 'red.gif'].includes(path.toLowerCase()));
  if (actions.length !== 84) throw new Error(`Expected 84 action GIFs, got ${actions.length}`);

  const placementFailures = [];
  let addedCanvasEdges = 0;
  let maximumAnchorDrift = 0;
  for (const relative of actions) {
    const outputPath = join(options.buildDir, 'data/chars/weiyan', relative);
    const templatePath = join(options.baseData, 'chars/weiyan', relative);
    if (!existsSync(outputPath) || !existsSync(templatePath)) {
      placementFailures.push(`${relative}: missing output or exact-case template`);
      continue;
    }
    const templatePose = analyzePose(templatePath);
    const outputPose = analyzePose(outputPath);
    if (templatePose.sourceCanvas.width !== outputPose.sourceCanvas.width
      || templatePose.sourceCanvas.height !== outputPose.sourceCanvas.height) {
      placementFailures.push(`${relative}: canvas mismatch`);
      continue;
    }
    verifyGif(outputPath, templatePose.sourceCanvas.width, templatePose.sourceCanvas.height);
    const oldEdges = edgeSet(templatePose);
    const newEdges = [...edgeSet(outputPose)].filter((edge) => !oldEdges.has(edge));
    addedCanvasEdges += newEdges.length;
    if (newEdges.length) placementFailures.push(`${relative}: added edge ${newEdges.join(',')}`);
    const oldAnchor = anchor(templatePose);
    const newAnchor = anchor(outputPose);
    const drift = Math.max(Math.abs(newAnchor.x - oldAnchor.x), Math.abs(newAnchor.y - oldAnchor.y));
    maximumAnchorDrift = Math.max(maximumAnchorDrift, drift);
    if (drift > 1) placementFailures.push(`${relative}: anchor drift ${drift}`);
  }
  if (placementFailures.length) throw new Error(`Placement failures:\n${placementFailures.join('\n')}`);

  const dataRefs = [...new Set(engineRefs(modelText))];
  const missingRefs = dataRefs.filter((path) => !resolveDataPath(options, path));
  if (missingRefs.length) throw new Error(`Missing exact-case data refs:\n${missingRefs.join('\n')}`);
  if (directiveLines(modelText, 'weapons').length
    || directiveLines(modelText, 'hmap').length
    || directiveLines(modelText, 'weaponframe').length) {
    throw new Error('Human weapon-switching directive remains active');
  }
  if (/loadmodel\s*\(\s*"w\d+"/i.test(readFileSync(spawnPath, 'utf8'))) {
    throw new Error('Spawn script still loads w1..w16');
  }
  if (/hitflash[\t ]+blood|data\/sounds\/knife\d*\.wav|data\/chars\/(?:weiyan|zhangfei|guanyu)\/[^\s#]+\.wav/i.test(modelText)) {
    throw new Error('Human blood, knife or character-voice reference remains');
  }
  if (!/^diesound[\t ]+data\/sounds\/rock\.wav$/mi.test(modelText)) {
    throw new Error('Mechanical diesound override is missing');
  }
  if (!/@cmd[\t ]+shoot[\t ]+"weiyan_tail_ray"/i.test(modelText)) {
    throw new Error('Tail-ray command is not wired into the player model');
  }

  const profiles = ['weiyan.gif', 'weiyan_m.gif'];
  for (const profile of profiles) verifyGif(join(options.buildDir, 'data/profiles', profile), 35, 54);
  const rayText = readFileSync(rayModelPath, 'utf8');
  const rayRefs = [...new Set(engineRefs(rayText).filter((path) => /\.gif$/i.test(path)))];
  if (rayRefs.length !== 3) throw new Error(`Expected 3 tail-ray GIF refs, got ${rayRefs.length}`);
  for (const ref of rayRefs) {
    const path = resolveDataPath(options, ref);
    if (!path) throw new Error(`Missing tail-ray ref: ${ref}`);
    const canvas = analyzePose(path).sourceCanvas;
    verifyGif(path, canvas.width, canvas.height);
  }
  const damage = directiveLines(rayText, 'candamage').join(' ').toLowerCase();
  if (!damage.includes('enemy') || !damage.includes('obstacle') || /\b(player|npc)\b/.test(damage)) {
    throw new Error(`Unsafe tail-ray candamage: ${damage}`);
  }
  const modelsText = readFileSync(modelsPath, 'latin1');
  const registrations = modelsText.split(/\r?\n/).filter((line) => {
    const tokens = line.split('#', 1)[0].trim().split(/\s+/);
    return (tokens[0] ?? '').toLowerCase() === 'load' && (tokens[1] ?? '').toLowerCase() === 'weiyan_tail_ray';
  });
  if (registrations.length !== 1) throw new Error(`Expected one tail-ray Load, got ${registrations.length}`);

  const buildManifest = JSON.parse(readFileSync(join(options.buildDir, 'WEIYAN-RIFTBEAST-P0-BUILD-MANIFEST.json')));
  console.log(JSON.stringify({
    status: 'PASS',
    actionGif: actions.length,
    mainModelGifRefs: mainImageRefs.length,
    mainImageOccurrences: mainImageOccurrences.length,
    exactCaseDataRefs: dataRefs.length,
    missingRefs: 0,
    addedCanvasEdges,
    maximumAnchorDrift,
    minimumSafeScaleRatio: buildManifest.placement.minimumSafeScaleRatio,
    disabledHumanWeaponVariants: 16,
    mechanicalHitflashRewrites: buildManifest.behavior.mechanicalHitflashRewrites,
    mechanicalHitfxRewrites: buildManifest.model.model.mechanicalHitfxRewrites,
    characterVoiceRewrites: buildManifest.model.model.characterVoiceRewrites,
    hudProfiles: profiles.length,
    tailRayProxy: { model: 'weiyan_tail_ray', gifRefs: rayRefs.length, damageTargets: ['obstacle', 'enemy'] },
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
