#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const AFFECTED_MODELS = ['g1', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11'];
const TARGET_MODEL = 'Electric';

function usage() {
  console.log(`Usage:
  node scripts/build-guanyu-gore-remap.mjs --base-data PATH --output-dir PATH

Creates a small private overlay package that replaces only Guanyu g1/g5..g11
human blood hitflash references with the already-registered Electric model.
It never changes the base data tree or models.txt.`);
}

function parseArguments(argv) {
  const options = { baseData: null, outputDir: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      usage();
      process.exit(0);
    }
    if (argument === '--base-data' || argument === '--output-dir') {
      if (!argv[index + 1]) throw new Error(`${argument} requires a path`);
      options[argument === '--base-data' ? 'baseData' : 'outputDir'] = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }
  if (!options.baseData || !options.outputDir) throw new Error('--base-data and --output-dir are required');
  return options;
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function assertElectricIsRegistered(baseData) {
  const modelsPath = path.join(baseData, 'models.txt');
  const models = fs.readFileSync(modelsPath, 'utf8');
  if (!/^\s*load\s+Electric\s+data\/chars\/misc\/Electric\/Electric\.txt\s*$/im.test(models)) {
    throw new Error(`Expected exact Electric registration in ${modelsPath}`);
  }
}

function correctGifPathCase(input, baseData) {
  if (!/^data\/.+\.gif$/i.test(input)) return input;
  const parts = input.split('/');
  let current = baseData;
  const actual = [];
  for (const part of parts.slice(1)) {
    const entries = fs.readdirSync(current);
    const match = entries.find((entry) => entry === part)
      ?? entries.find((entry) => entry.toLowerCase() === part.toLowerCase());
    if (!match) throw new Error(`Cannot resolve image path in base data: ${input}`);
    actual.push(match);
    current = path.join(current, match);
  }
  return ['data', ...actual].join('/');
}

function replaceHumanGore(sourcePath, destinationPath, baseData) {
  const input = fs.readFileSync(sourcePath, 'utf8');
  let replacements = 0;
  const output = input.replace(/(\bhitflash\s+)(blood1|blood2)\b/gi, (_match, prefix) => {
    replacements += 1;
    return `${prefix}${TARGET_MODEL}`;
  });
  if (replacements !== 1) {
    throw new Error(`${sourcePath}: expected exactly one blood hitflash, found ${replacements}`);
  }
  if (/\bhitflash\s+(?:blood\d*|organ\w*)\b/i.test(output)) {
    throw new Error(`${sourcePath}: human gore hitflash remains after transform`);
  }
  let caseCorrections = 0;
  const caseCorrected = output.replace(/\bdata\/[\w./-]+\.gif\b/gi, (token) => {
    const corrected = correctGifPathCase(token, baseData);
    if (corrected !== token) caseCorrections += 1;
    return corrected;
  });
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.writeFileSync(destinationPath, caseCorrected);
  return {
    replacements,
    caseCorrections,
    sourceSha256: sha256(sourcePath),
    outputSha256: sha256(destinationPath),
  };
}

try {
  const options = parseArguments(process.argv.slice(2));
  const baseData = path.resolve(options.baseData);
  const outputDir = path.resolve(options.outputDir);
  if (!fs.statSync(baseData).isDirectory()) throw new Error(`Base data is not a directory: ${baseData}`);
  if (fs.existsSync(outputDir) && !fs.statSync(outputDir).isDirectory()) {
    throw new Error(`Output path is not a directory: ${outputDir}`);
  }
  assertElectricIsRegistered(baseData);

  const overlayData = path.join(outputDir, 'overlay', 'data');
  const files = AFFECTED_MODELS.map((model) => {
    const sourcePath = path.join(baseData, 'chars', 'guanyu', `${model}.txt`);
    const destinationPath = path.join(overlayData, 'chars', 'guanyu', `${model}.txt`);
    if (!fs.existsSync(sourcePath)) throw new Error(`Missing Guanyu variant model: ${sourcePath}`);
    const result = replaceHumanGore(sourcePath, destinationPath, baseData);
    return {
      model,
      output: `overlay/data/chars/guanyu/${model}.txt`,
      humanGoreHitflashReplacements: result.replacements,
      exactCaseCorrections: result.caseCorrections,
      sourceSha256: result.sourceSha256,
      outputSha256: result.outputSha256,
    };
  });

  const manifest = {
    schemaVersion: 1,
    package: 'guanyu-getter-gore-remap',
    status: 'engineering-closure-complete-production-art-deferred',
    productionReady: false,
    scope: {
      affectedModels: AFFECTED_MODELS,
      files: files.length,
      globalModelsTxtChanged: false,
      targetHitflashModel: TARGET_MODEL,
      targetRegistration: 'data/models.txt -> Electric -> data/chars/misc/Electric/Electric.txt',
    },
    validation: {
      humanBloodOrOrganHitflashRemaining: 0,
      expectedReplacements: files.length,
    },
    files,
  };
  fs.writeFileSync(path.join(outputDir, 'BUILD-MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ status: 'PASS', ...manifest.scope, outputDir }, null, 2));
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
