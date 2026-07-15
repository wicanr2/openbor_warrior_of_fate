#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');

export const ROSTER = Object.freeze([
  'guanyu',
  'zhangfei',
  'zhaoyun',
  'huangzhong',
  'weiyan',
  'nu_gundam',
]);
export const EXCLUDED_PLAYER_MODELS = Object.freeze(['tiefeifp', 'xiahoudunp']);
export const NU_MODEL_PATH = 'data/chars/nu_gundam/nu_gundam.txt';
export const NU_FUNNEL_MODEL_PATH = 'data/chars/nu_gundam/funnel/nu_funnel_shot.txt';
export const CANONICAL_ALLOWSELECT = `allowselect ${ROSTER.join(' ')}`;
export const CANONICAL_NU_LOAD = `Load\tnu_gundam\t${NU_MODEL_PATH}`;
export const CANONICAL_NU_FUNNEL_LOAD = `Load\tnu_funnel_shot\t${NU_FUNNEL_MODEL_PATH}`;

function usage() {
  return `Create or validate the minimal six-candidate OpenBOR text overlay.

Usage:
  node scripts/patch-six-player-select-overlay.mjs \\
    --data-dir /path/to/extracted/data \\
    --output-dir /path/to/overlay [options]

Options:
  --check              validate existing overlay files without writing
  --require-closure    fail unless all six registered model TXT files exist
  --manifest PATH      manifest path (default: OUTPUT/SIX-PLAYER-SELECT-TXT-MANIFEST.json)
  --help               show this help

Patch mode is the default. It reads an existing output file when present, or
falls back to DATA_DIR, then writes OUTPUT/data/models.txt and
OUTPUT/data/levels/select.txt. Re-running it is byte deterministic.

This script only prepares the text roster. It does not create nu_gundam art,
model data, HUD assets, the six-column selection bitmap, or change maxplayers.`;
}

function parseArgs(argv) {
  const options = {
    check: false,
    requireClosure: false,
    dataDir: null,
    outputDir: null,
    manifest: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') {
      console.log(usage());
      process.exit(0);
    }
    if (argument === '--check') {
      options.check = true;
      continue;
    }
    if (argument === '--require-closure') {
      options.requireClosure = true;
      continue;
    }
    if (!['--data-dir', '--output-dir', '--manifest'].includes(argument)) {
      throw new Error(`Unknown option: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value) throw new Error(`${argument} requires a path`);
    const key = argument === '--data-dir'
      ? 'dataDir'
      : argument === '--output-dir' ? 'outputDir' : 'manifest';
    options[key] = resolve(value);
    index += 1;
  }
  if (!options.dataDir) throw new Error('--data-dir is required');
  if (!options.outputDir) throw new Error('--output-dir is required');
  options.manifest ??= join(options.outputDir, 'SIX-PLAYER-SELECT-TXT-MANIFEST.json');
  return options;
}

function sha256Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function displayPath(path) {
  const local = relative(REPO_ROOT, path);
  return local && !local.startsWith('..')
    ? local.replaceAll('\\', '/')
    : `local-only/${basename(path)}`;
}

// models.txt is legacy ISO-8859/GB-family data. latin1 is intentional: it gives
// a lossless byte-to-codepoint round trip while the patch only edits ASCII.
function decodeBytePreserving(bytes) {
  const text = bytes.toString('latin1');
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const trailingNewline = text.endsWith('\n');
  const lines = text.split(/\r?\n/);
  if (trailingNewline) lines.pop();
  return { lines, newline, trailingNewline };
}

function encodeBytePreserving(document) {
  const suffix = document.trailingNewline ? document.newline : '';
  return Buffer.from(`${document.lines.join(document.newline)}${suffix}`, 'latin1');
}

function activeTokens(line) {
  const body = line.split('#', 1)[0].trim();
  return body ? body.split(/\s+/) : [];
}

function commandIs(line, command) {
  const [actual = ''] = activeTokens(line);
  return actual.toLowerCase() === command;
}

function patchModels(document) {
  const matches = [];
  for (let index = 0; index < document.lines.length; index += 1) {
    const tokens = activeTokens(document.lines[index]);
    if (['load', 'know'].includes((tokens[0] ?? '').toLowerCase())
      && ['nu_gundam', 'nu_funnel_shot'].includes((tokens[1] ?? '').toLowerCase())) {
      matches.push(index);
    }
  }

  const lines = [...document.lines];
  for (let offset = matches.length - 1; offset >= 0; offset -= 1) lines.splice(matches[offset], 1);
  let insertion = -1;
  for (let index = 0; index < lines.length; index += 1) {
    const tokens = activeTokens(lines[index]);
    if ((tokens[0] ?? '').toLowerCase() === 'load'
      && (tokens[1] ?? '').toLowerCase() === 'weiyan') {
      insertion = index + 1;
      break;
    }
  }
  if (insertion < 0) {
    throw new Error('Cannot place ν models deterministically: active Load weiyan was not found');
  }
  lines.splice(insertion, 0, CANONICAL_NU_FUNNEL_LOAD, CANONICAL_NU_LOAD);
  return { ...document, lines };
}

function patchSelect(document) {
  const matches = [];
  for (let index = 0; index < document.lines.length; index += 1) {
    if (commandIs(document.lines[index], 'allowselect')) matches.push(index);
  }
  const lines = [...document.lines];
  if (matches.length) {
    lines[matches[0]] = CANONICAL_ALLOWSELECT;
    for (let offset = matches.length - 1; offset >= 1; offset -= 1) {
      lines.splice(matches[offset], 1);
    }
  } else {
    const background = lines.findIndex((line) => commandIs(line, 'background'));
    if (background < 0) throw new Error('Cannot place allowselect: active BACKGROUND line was not found');
    lines.splice(background + 1, 0, CANONICAL_ALLOWSELECT);
  }
  return { ...document, lines };
}

function registrations(document) {
  const result = [];
  for (let index = 0; index < document.lines.length; index += 1) {
    const tokens = activeTokens(document.lines[index]);
    const command = (tokens[0] ?? '').toLowerCase();
    if (!['load', 'know'].includes(command) || !tokens[1] || !tokens[2]) continue;
    result.push({ command, name: tokens[1].toLowerCase(), path: tokens[2], line: index + 1 });
  }
  return result;
}

function locateDataPath(dataDir, outputDir, enginePath) {
  if (!enginePath.toLowerCase().startsWith('data/')) return null;
  const relativePath = enginePath.slice(5);
  const overlay = join(outputDir, 'data', relativePath);
  if (existsSync(overlay)) return overlay;
  const base = join(dataDir, relativePath);
  return existsSync(base) ? base : null;
}

export function validateDocuments({ modelsDocument, selectDocument, dataDir, outputDir }) {
  const modelRegistrations = registrations(modelsDocument);
  const allowLines = selectDocument.lines
    .map((line, index) => ({ tokens: activeTokens(line), line: index + 1 }))
    .filter(({ tokens }) => (tokens[0] ?? '').toLowerCase() === 'allowselect');

  const errors = [];
  if (allowLines.length !== 1) {
    errors.push(`expected exactly one active allowselect line, got ${allowLines.length}`);
  }
  const allowRoster = allowLines.length
    ? allowLines[0].tokens.slice(1).map((value) => value.toLowerCase())
    : [];
  if (JSON.stringify(allowRoster) !== JSON.stringify(ROSTER)) {
    errors.push(`allowselect must be exactly: ${ROSTER.join(' ')}`);
  }

  const excludedCandidates = EXCLUDED_PLAYER_MODELS.filter((name) => allowRoster.includes(name));
  if (excludedCandidates.length) {
    errors.push(`excluded player models remain selectable: ${excludedCandidates.join(', ')}`);
  }

  const rosterRegistrations = [];
  const missingRegistrations = [];
  const duplicateRegistrations = [];
  const nonLoadRegistrations = [];
  const missingModelFiles = [];
  for (const name of ROSTER) {
    const found = modelRegistrations.filter((entry) => entry.name === name);
    if (!found.length) {
      missingRegistrations.push(name);
      continue;
    }
    if (found.length !== 1) duplicateRegistrations.push(name);
    if (found[0].command !== 'load') nonLoadRegistrations.push(name);
    const resolvedPath = locateDataPath(dataDir, outputDir, found[0].path);
    if (!resolvedPath) missingModelFiles.push({ name, path: found[0].path });
    rosterRegistrations.push({ ...found[0], resolvedPath: resolvedPath ? displayPath(resolvedPath) : null });
  }
  if (missingRegistrations.length) errors.push(`missing roster registrations: ${missingRegistrations.join(', ')}`);
  if (duplicateRegistrations.length) errors.push(`duplicate roster registrations: ${duplicateRegistrations.join(', ')}`);
  if (nonLoadRegistrations.length) errors.push(`roster entries must use Load, not know: ${nonLoadRegistrations.join(', ')}`);

  const nu = modelRegistrations.filter((entry) => entry.name === 'nu_gundam');
  if (nu.length === 1 && nu[0].path !== NU_MODEL_PATH) {
    errors.push(`nu_gundam path must be exact-case ${NU_MODEL_PATH}`);
  }
  const funnel = modelRegistrations.filter((entry) => entry.name === 'nu_funnel_shot');
  if (funnel.length !== 1) errors.push(`expected exactly one nu_funnel_shot registration, got ${funnel.length}`);
  if (funnel.length === 1 && (funnel[0].command !== 'load' || funnel[0].path !== NU_FUNNEL_MODEL_PATH)) {
    errors.push(`nu_funnel_shot must use exact Load path ${NU_FUNNEL_MODEL_PATH}`);
  }
  const funnelResolvedPath = funnel.length === 1
    ? locateDataPath(dataDir, outputDir, funnel[0].path)
    : null;
  if (funnel.length === 1 && !funnelResolvedPath) {
    missingModelFiles.push({ name: 'nu_funnel_shot', path: funnel[0].path });
  }
  const cacheOrder = modelRegistrations
    .filter((entry) => entry.command === 'load' && ROSTER.includes(entry.name))
    .map((entry) => entry.name);
  if (JSON.stringify(cacheOrder) !== JSON.stringify(ROSTER)) {
    errors.push(`loaded roster cache order must be ${ROSTER.join(' -> ')}, got ${cacheOrder.join(' -> ')}`);
  }

  return {
    textValid: errors.length === 0,
    runtimeClosureComplete: errors.length === 0 && missingModelFiles.length === 0,
    roster: allowRoster,
    cacheOrder,
    excludedCandidates,
    excludedModelsRemainLoaded: EXCLUDED_PLAYER_MODELS.filter((name) => modelRegistrations.some(
      (entry) => entry.command === 'load' && entry.name === name,
    )),
    rosterRegistrations,
    supportingRegistrations: funnel.map((entry) => ({
      ...entry,
      resolvedPath: funnelResolvedPath ? displayPath(funnelResolvedPath) : null,
    })),
    missingModelFiles,
    errors,
  };
}

function readRequired(path, label) {
  if (!existsSync(path)) throw new Error(`Missing ${label}: ${path}`);
  return readFileSync(path);
}

function atomicWrite(path, bytes) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp-${process.pid}`;
  try {
    writeFileSync(temp, bytes);
    renameSync(temp, path);
  } finally {
    rmSync(temp, { force: true });
  }
}

function writeIfChanged(path, bytes) {
  if (existsSync(path) && readFileSync(path).equals(bytes)) return false;
  atomicWrite(path, bytes);
  return true;
}

export function patchOverlay(options) {
  const dataDir = resolve(options.dataDir);
  const outputDir = resolve(options.outputDir);
  const modelsOutput = join(outputDir, 'data/models.txt');
  const selectOutput = join(outputDir, 'data/levels/select.txt');
  const modelsBase = join(dataDir, 'models.txt');
  const selectBase = join(dataDir, 'levels/select.txt');
  const check = options.check ?? false;
  const requireClosure = options.requireClosure ?? false;
  const manifestPath = resolve(options.manifest ?? join(outputDir, 'SIX-PLAYER-SELECT-TXT-MANIFEST.json'));

  const modelsInput = check ? modelsOutput : existsSync(modelsOutput) ? modelsOutput : modelsBase;
  const selectInput = check ? selectOutput : existsSync(selectOutput) ? selectOutput : selectBase;
  let modelsDocument = decodeBytePreserving(readRequired(modelsInput, 'models input'));
  let selectDocument = decodeBytePreserving(readRequired(selectInput, 'select input'));
  if (!check) {
    modelsDocument = patchModels(modelsDocument);
    selectDocument = patchSelect(selectDocument);
  }

  const validation = validateDocuments({ modelsDocument, selectDocument, dataDir, outputDir });
  if (!validation.textValid) throw new Error(`Text roster validation failed: ${validation.errors.join('; ')}`);
  if (requireClosure && !validation.runtimeClosureComplete) {
    const missing = validation.missingModelFiles.map(({ name, path }) => `${name} (${path})`).join(', ');
    throw new Error(`Model TXT closure is incomplete: ${missing}`);
  }

  const modelsBytes = encodeBytePreserving(modelsDocument);
  const selectBytes = encodeBytePreserving(selectDocument);
  let modelsChanged = false;
  let selectChanged = false;
  if (!check) {
    modelsChanged = writeIfChanged(modelsOutput, modelsBytes);
    selectChanged = writeIfChanged(selectOutput, selectBytes);
  }

  const manifest = {
    schemaVersion: 1,
    status: validation.runtimeClosureComplete
      ? 'six-player-select-text-overlay-runtime-closure-complete'
      : 'six-player-select-text-overlay-waits-for-model-closure',
    mode: check ? 'check' : 'patch',
    invariant: {
      candidateCount: ROSTER.length,
      allowselect: CANONICAL_ALLOWSELECT,
      cacheOrder: ROSTER,
      explicitlyExcludedFromSelection: EXCLUDED_PLAYER_MODELS,
      simultaneousPlayerCountUnchanged: true,
    },
    files: {
      models: {
        path: displayPath(modelsOutput),
        sha256: sha256Bytes(modelsBytes),
        changed: modelsChanged,
      },
      select: {
        path: displayPath(selectOutput),
        sha256: sha256Bytes(selectBytes),
        changed: selectChanged,
      },
    },
    validation,
    assetsNotCreatedByThisScript: [
      NU_MODEL_PATH,
      NU_FUNNEL_MODEL_PATH,
      'data/chars/nu_gundam/icon.GIF',
      'data/profiles/nu_gundam.gif',
      'data/profiles/nu_gundam_m.gif',
      'data/bgs/select.gif (true six-candidate layout)',
    ],
  };
  if (!check) atomicWrite(manifestPath, Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`));
  return { manifest, manifestPath };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const { manifest, manifestPath } = patchOverlay(options);
  console.log(JSON.stringify(manifest, null, 2));
  if (!options.check) console.error(`manifest ${displayPath(manifestPath)}`);
  if (!manifest.validation.runtimeClosureComplete) {
    console.error('WAITING: TXT patch is valid, but one or more registered model TXT files are missing.');
  }
}

const IS_MAIN = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (IS_MAIN) {
  try {
    main();
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}
