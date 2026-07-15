#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_BASE = 'workplace/extracted/data';
const DEFAULT_OVERLAY = 'local-only/robot_wof_vertical_slice/overlay/data';

const P0_ANIMATIONS = new Set([
  'idle', 'walk', 'run', 'turn', 'waiting',
  'attack1', 'attack2', 'attack3', 'chargeattack', 'attackbackward',
  'attackboth', 'runattack', 'slide',
  'jump', 'jumpattack', 'jumpattack2', 'jumpdelay', 'jumpforward', 'land',
  'pain', 'pain2', 'pain3', 'pain10', 'spain', 'bpain', 'shock', 'burn',
  'fall', 'fall4', 'fall7', 'bdie', 'sdie', 'death', 'rise', 'respawn',
]);

function usage() {
  console.log(`Validate Robot WOF vertical-slice replacement coverage (read only).

Usage:
  node scripts/validate-vertical-slice-coverage.mjs [options]

Options:
  --base PATH       extracted OpenBOR data directory
                    (default: ${DEFAULT_BASE})
  --overlay PATH    replacement overlay data directory
                    (default: ${DEFAULT_OVERLAY})
  --json            emit machine-readable JSON only
  --help, -h        show this help

Exit codes: 0 = all required assets replaced, 1 = incomplete, 2 = CLI/input error.

Coverage is based on file presence plus byte difference from the base. Run
validate-overlay-parity.mjs separately for canvas, indexed-GIF and palette checks.`);
}

function parseArgs(argv) {
  const options = { base: DEFAULT_BASE, overlay: DEFAULT_OVERLAY, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      usage();
      process.exit(0);
    }
    if (argument === '--json') {
      options.json = true;
      continue;
    }
    if (argument === '--base' || argument === '--overlay') {
      if (!argv[index + 1]) throw new Error(`${argument} requires a path`);
      options[argument.slice(2)] = argv[index + 1];
      index += 1;
      continue;
    }
    if (argument.startsWith('--base=')) {
      options.base = argument.slice('--base='.length);
      if (!options.base) throw new Error('--base requires a path');
      continue;
    }
    if (argument.startsWith('--overlay=')) {
      options.overlay = argument.slice('--overlay='.length);
      if (!options.overlay) throw new Error('--overlay requires a path');
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }
  return {
    base: path.resolve(options.base),
    overlay: path.resolve(options.overlay),
    json: options.json,
  };
}

function requireDirectory(directory, option) {
  let stat;
  try {
    stat = fs.statSync(directory);
  } catch {
    throw new Error(`${option} does not exist: ${displayPath(directory)}`);
  }
  if (!stat.isDirectory()) throw new Error(`${option} is not a directory: ${displayPath(directory)}`);
}

function displayPath(file) {
  const relative = path.relative(process.cwd(), file);
  return relative && !relative.startsWith('..') ? slash(relative) : slash(file);
}

function slash(file) {
  return file.split(path.sep).join('/');
}

function normalizeDataReference(reference) {
  const normalized = reference.replaceAll('\\', '/').replace(/^\.\//, '');
  return /^data\//i.test(normalized) ? normalized.slice(5) : normalized;
}

function inspectRelative(root, relativePath) {
  const parts = normalizeDataReference(relativePath).split('/').filter(Boolean);
  let current = root;
  const diskParts = [];
  let caseMismatch = false;

  for (let index = 0; index < parts.length; index += 1) {
    const wanted = parts[index];
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return { status: 'missing', relative: slash(path.join(...diskParts, wanted)) };
    }

    let entry = entries.find((candidate) => candidate.name === wanted);
    if (!entry) {
      const matches = entries.filter(
        (candidate) => candidate.name.toLowerCase() === wanted.toLowerCase(),
      );
      if (matches.length !== 1) {
        return {
          status: matches.length ? 'ambiguous-case' : 'missing',
          relative: slash(path.join(...diskParts, wanted)),
        };
      }
      [entry] = matches;
      caseMismatch = true;
    }

    diskParts.push(entry.name);
    current = path.join(current, entry.name);
    const isLast = index === parts.length - 1;
    if (!isLast && !entry.isDirectory()) {
      return { status: 'missing', relative: slash(path.join(...diskParts)) };
    }
    if (isLast && !entry.isFile()) {
      return { status: 'not-file', relative: slash(path.join(...diskParts)) };
    }
  }

  return {
    status: caseMismatch ? 'case-mismatch' : 'exact',
    relative: slash(path.join(...diskParts)),
    absolute: current,
  };
}

function parseAnimations(modelFile) {
  const animations = new Map();
  let animation = null;
  const lines = fs.readFileSync(modelFile, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.split('#', 1)[0];
    const animationMatch = line.match(/^\s*anim\s+(\S+)/i);
    if (animationMatch) {
      animation = animationMatch[1].toLowerCase();
      if (!animations.has(animation)) animations.set(animation, []);
      continue;
    }
    const frameMatch = line.match(/^\s*frame\s+(\S+)/i);
    if (animation && frameMatch && frameMatch[1].toLowerCase() !== 'none') {
      animations.get(animation).push(frameMatch[1].replaceAll('\\', '/'));
    }
  }
  return animations;
}

function parseDirectiveImages(modelFile, directives) {
  const output = [];
  const wanted = new Set(directives.map((directive) => directive.toLowerCase()));
  for (const rawLine of fs.readFileSync(modelFile, 'utf8').split(/\r?\n/)) {
    const line = rawLine.split('#', 1)[0];
    const match = line.match(/^\s*(\S+)\s+(\S+\.(?:gif|png))\b/i);
    if (match && wanted.has(match[1].toLowerCase())) {
      output.push(match[2].replaceAll('\\', '/'));
    }
  }
  return output;
}

function addCategory(categories, id, label, required = true) {
  const category = { id, label, required, entries: new Map() };
  categories.push(category);
  return category;
}

function addRequirement(base, category, reference, reason) {
  const requested = normalizeDataReference(reference);
  const baseInspection = inspectRelative(base, requested);
  const canonical = baseInspection.absolute ? baseInspection.relative : requested;
  let entry = category.entries.get(canonical);
  if (!entry) {
    entry = {
      path: canonical,
      requestedPaths: new Set(),
      reasons: new Set(),
      baseStatus: baseInspection.absolute ? 'present' : baseInspection.status,
      basePath: baseInspection.absolute ?? null,
      status: 'unchecked',
    };
    category.entries.set(canonical, entry);
  }
  entry.requestedPaths.add(requested);
  if (reason) entry.reasons.add(reason);
  return entry;
}

function sameFileContents(first, second) {
  const firstStat = fs.statSync(first);
  const secondStat = fs.statSync(second);
  if (firstStat.size !== secondStat.size) return false;
  return fs.readFileSync(first).equals(fs.readFileSync(second));
}

function evaluateEntry(overlay, entry) {
  if (!entry.basePath) {
    entry.status = 'base-missing';
    return;
  }
  const overlayInspection = inspectRelative(overlay, entry.path);
  if (overlayInspection.status === 'case-mismatch') {
    entry.status = 'overlay-case-mismatch';
    entry.overlayPath = overlayInspection.relative;
    return;
  }
  if (overlayInspection.status !== 'exact') {
    entry.status = overlayInspection.status === 'not-file' ? 'overlay-not-file' : 'missing';
    return;
  }
  entry.overlayPath = overlayInspection.relative;
  entry.status = sameFileContents(entry.basePath, overlayInspection.absolute)
    ? 'unchanged'
    : 'replaced';
}

function listFiles(root) {
  const files = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(absolute);
      else if (entry.isFile()) files.push(slash(path.relative(root, absolute)));
    }
  }
  return files.sort();
}

function readManifest(overlay) {
  const manifestPath = path.join(path.dirname(overlay), 'BUILD-MANIFEST.json');
  if (!fs.existsSync(manifestPath)) return { path: null, found: false };
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return {
      path: displayPath(manifestPath),
      found: true,
      status: manifest.status ?? null,
      productionReady: manifest.productionReady ?? null,
      warning: manifest.warning ?? null,
      frameCount: Array.isArray(manifest.frames) ? manifest.frames.length : null,
    };
  } catch (error) {
    return { path: displayPath(manifestPath), found: true, error: error.message };
  }
}

function summarizeCategory(category) {
  const entries = [...category.entries.values()];
  const statuses = {};
  for (const entry of entries) statuses[entry.status] = (statuses[entry.status] ?? 0) + 1;
  return {
    id: category.id,
    label: category.label,
    required: category.required,
    total: entries.length,
    replaced: statuses.replaced ?? 0,
    complete: entries.length > 0 && entries.every((entry) => entry.status === 'replaced'),
    statuses,
    entries: entries.map((entry) => ({
      path: entry.path,
      status: entry.status,
      requestedPaths: [...entry.requestedPaths].sort(),
      reasons: [...entry.reasons].sort(),
      overlayPath: entry.overlayPath ?? null,
    })),
  };
}

function buildReport(options) {
  requireDirectory(options.base, '--base');
  requireDirectory(options.overlay, '--overlay');

  const zhangfeiModel = path.join(options.base, 'chars', 'zhangfei', 'zhangfei.txt');
  const bingModel = path.join(options.base, 'chars', 'army', '1', 'bing.txt');
  const bingSubModel = path.join(options.base, 'chars', 'army', '1', '1', 'bingxs.txt');
  const boxModel = path.join(options.base, 'chars', 'misc', 'box', '1', 'baoxiang.txt');
  for (const model of [zhangfeiModel, bingModel, bingSubModel, boxModel]) {
    if (!fs.existsSync(model)) throw new Error(`required base model is missing: ${displayPath(model)}`);
  }

  const categories = [];
  const p0 = addCategory(categories, 'zhangfei-p0', 'Zhang Fei → Mazinger P0 animation frames');
  const selection = addCategory(categories, 'selection-portrait', 'Five-character selection composite / large portrait');
  const playerUi = addCategory(categories, 'player-ui', 'Zhang Fei HUD icon/profile pair');
  const background = addCategory(categories, 'stage01-background', 'Stage 01 opening background/panel/foreground');
  const enemy = addCategory(categories, 'stage01-bing', 'Stage 01 bing main, bingxs debris, and HUD icon');
  const enemyDefinition = addCategory(categories, 'stage01-bing-mechanical-death', 'Bing model overlay removes human gore/debris');
  const supply = addCategory(categories, 'stage01-supply', 'Stage 01 baoxiang supply box idle/destruction frames');
  const enemyPalettes = addCategory(categories, 'stage01-bing-palettes', 'Bing alternate palette maps (post-M1)', false);

  const p0Animations = parseAnimations(zhangfeiModel);
  const p0Logical = new Map();
  for (const [animation, references] of p0Animations) {
    if (!P0_ANIMATIONS.has(animation)) continue;
    for (const reference of new Set(references)) {
      const entry = addRequirement(options.base, p0, reference, animation);
      const logicalKey = normalizeDataReference(reference);
      let logical = p0Logical.get(logicalKey);
      if (!logical) {
        logical = { path: logicalKey, animations: new Set(), entry };
        p0Logical.set(logicalKey, logical);
      }
      logical.animations.add(animation);
    }
  }

  addRequirement(options.base, selection, 'data/bgs/select.gif', 'large portraits are baked into this 480x276 screen');

  for (const reference of parseDirectiveImages(zhangfeiModel, ['icon'])) {
    addRequirement(options.base, playerUi, reference, 'model icon');
  }
  addRequirement(options.base, playerUi, 'data/profiles/zhangfei.GIF', 'HUD profile');
  addRequirement(options.base, playerUi, 'data/profiles/zhangfei_m.GIF', 'mirrored HUD profile');

  addRequirement(options.base, background, 'data/bgs/01/S2.gif', 'background');
  addRequirement(options.base, background, 'data/bgs/01/panel.gif', 'walkable panel');
  addRequirement(options.base, background, 'data/bgs/01/f.GIF', 'foreground occlusion layer');

  const bingAnimations = parseAnimations(bingModel);
  for (const [animation, references] of bingAnimations) {
    for (const reference of new Set(references)) {
      addRequirement(options.base, enemy, reference, animation);
    }
  }
  for (const reference of parseDirectiveImages(bingModel, ['icon'])) {
    addRequirement(options.base, enemy, reference, 'enemy HUD icon');
  }
  for (const reference of parseDirectiveImages(bingModel, ['alternatepal'])) {
    addRequirement(options.base, enemyPalettes, reference, 'alternate palette');
  }
  const bingSubAnimations = parseAnimations(bingSubModel);
  for (const [animation, references] of bingSubAnimations) {
    for (const reference of new Set(references)) {
      addRequirement(options.base, enemy, reference, `bingxs:${animation}`);
    }
  }
  addRequirement(
    options.base,
    enemyDefinition,
    'data/chars/army/1/bing.txt',
    'remove human blood summons and shared quans body debris',
  );
  addRequirement(
    options.base,
    enemyDefinition,
    'data/chars/army/1/1/bingxs.txt',
    'normalize case-sensitive GIF references for Linux',
  );

  const supplyAnimations = parseAnimations(boxModel);
  for (const [animation, references] of supplyAnimations) {
    for (const reference of new Set(references)) {
      addRequirement(options.base, supply, reference, animation);
    }
  }

  for (const category of categories) {
    for (const entry of category.entries.values()) evaluateEntry(options.overlay, entry);
  }

  const requiredPaths = new Set(
    categories.flatMap((category) => [...category.entries.keys()]),
  );
  const unexpectedOverlayFiles = listFiles(options.overlay)
    .filter((file) => !requiredPaths.has(file));

  const animationResults = [];
  for (const animation of [...P0_ANIMATIONS].sort()) {
    const entries = [...p0.entries.values()].filter((entry) => entry.reasons.has(animation));
    if (!entries.length) continue;
    const replaced = entries.filter((entry) => entry.status === 'replaced').length;
    animationResults.push({
      animation,
      total: entries.length,
      replaced,
      status: replaced === entries.length ? 'complete' : replaced ? 'partial' : 'missing',
    });
  }

  const logicalResults = [...p0Logical.values()].map((logical) => ({
    path: logical.path,
    animations: [...logical.animations].sort(),
    physicalPath: logical.entry.path,
    status: logical.entry.status,
  }));
  const categoryResults = categories.map(summarizeCategory);
  const requiredCategories = categoryResults.filter((category) => category.required);
  const requiredTotal = requiredCategories.reduce((sum, category) => sum + category.total, 0);
  const requiredReplaced = requiredCategories.reduce((sum, category) => sum + category.replaced, 0);
  const complete = requiredTotal > 0 && requiredReplaced === requiredTotal;

  return {
    schemaVersion: 1,
    base: displayPath(options.base),
    overlay: displayPath(options.overlay),
    complete,
    required: { total: requiredTotal, replaced: requiredReplaced },
    p0: {
      modelAnimations: animationResults.length,
      completeAnimations: animationResults.filter((result) => result.status === 'complete').length,
      partialAnimations: animationResults.filter((result) => result.status === 'partial').length,
      missingAnimations: animationResults.filter((result) => result.status === 'missing').length,
      logicalReferences: logicalResults.length,
      replacedLogicalReferences: logicalResults.filter((result) => result.status === 'replaced').length,
      physicalAssets: p0.entries.size,
      animations: animationResults,
      logical: logicalResults,
    },
    manifest: readManifest(options.overlay),
    categories: categoryResults,
    unexpectedOverlayFiles,
    limitations: [
      'byte difference does not prove that the intended subject was redrawn',
      'canvas, indexed palette and chroma key are delegated to validate-overlay-parity.mjs',
      'in-engine offsets, hit boxes, animation flow and foreground occlusion require smoke/manual testing',
    ],
  };
}

function printReport(report) {
  console.log('Robot WOF vertical-slice coverage');
  console.log(`Base:    ${report.base}`);
  console.log(`Overlay: ${report.overlay}`);
  console.log(`Required assets replaced: ${report.required.replaced}/${report.required.total}`);
  console.log(
    `Zhang Fei P0: ${report.p0.replacedLogicalReferences}/${report.p0.logicalReferences} logical references; `
    + `${report.p0.completeAnimations}/${report.p0.modelAnimations} complete animations `
    + `(${report.p0.physicalAssets} physical assets)`,
  );
  if (report.manifest.found) {
    console.log(
      `Manifest: ${report.manifest.status ?? 'status unavailable'}; `
      + `productionReady=${String(report.manifest.productionReady)}`,
    );
    if (report.manifest.warning) console.log(`Manifest warning: ${report.manifest.warning}`);
    if (report.manifest.error) console.log(`Manifest error: ${report.manifest.error}`);
  } else {
    console.log('Manifest: not found (coverage is derived from base model definitions)');
  }

  console.log('\nCategory coverage:');
  for (const category of report.categories) {
    const marker = category.complete ? 'PASS' : category.required ? 'MISS' : 'INFO';
    console.log(`  ${marker} ${category.id}: ${category.replaced}/${category.total} — ${category.label}`);
  }

  for (const category of report.categories.filter((item) => item.required && !item.complete)) {
    console.log(`\n${category.id} gaps:`);
    for (const entry of category.entries.filter((item) => item.status !== 'replaced')) {
      console.log(`  - ${entry.status}: ${entry.path}`);
    }
  }

  const incompleteAnimations = report.p0.animations.filter((animation) => animation.status !== 'complete');
  if (incompleteAnimations.length) {
    console.log('\nIncomplete P0 animations:');
    console.log(`  ${incompleteAnimations.map((item) => `${item.animation}=${item.replaced}/${item.total}`).join(', ')}`);
  }
  if (report.unexpectedOverlayFiles.length) {
    console.log('\nOverlay files outside this M1 coverage contract (informational):');
    for (const file of report.unexpectedOverlayFiles) console.log(`  - ${file}`);
  }

  console.log(`\n${report.complete ? 'PASS: required vertical-slice coverage is complete.' : 'INCOMPLETE: required replacement coverage has gaps.'}`);
}

try {
  const options = parseArgs(process.argv.slice(2));
  const report = buildReport(options);
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else printReport(report);
  if (!report.complete) process.exitCode = 1;
} catch (error) {
  console.error(`validate-vertical-slice-coverage: ${error.message}`);
  process.exitCode = 2;
}
