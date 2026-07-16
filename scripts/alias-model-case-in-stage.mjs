#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function usage() {
  console.log(`Usage:
  node scripts/alias-model-case-in-stage.mjs \\
    --source-root /path/to/extracted/data \\
    --stage-root /path/to/disposable/stage \\
    --model data/chars/boss/xuchu/xuchu.txt \\
    [--model data/chars/boss/xuchu/chu.txt] ...

Copies exact-case alias files into the disposable stage so the requested model
paths resolve on Linux strict validators. The source root is read-only; only the
stage tree is modified.`);
}

function parseArgs(argv) {
  const options = { sourceRoot: null, stageRoot: null, models: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }
    if (arg === '--source-root') {
      options.sourceRoot = argv[i + 1];
      if (!options.sourceRoot) throw new Error('--source-root requires a path');
      i += 1;
      continue;
    }
    if (arg === '--stage-root') {
      options.stageRoot = argv[i + 1];
      if (!options.stageRoot) throw new Error('--stage-root requires a path');
      i += 1;
      continue;
    }
    if (arg === '--model') {
      const value = argv[i + 1];
      if (!value) throw new Error('--model requires a path');
      options.models.push(value);
      i += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }
  if (!options.sourceRoot || !options.stageRoot || !options.models.length) {
    throw new Error('--source-root, --stage-root and at least one --model are required');
  }
  return {
    sourceRoot: path.resolve(options.sourceRoot),
    stageRoot: path.resolve(options.stageRoot),
    models: options.models,
  };
}

function readText(file) {
  return fs.readFileSync(file, 'latin1');
}

function extractReferences(textFile) {
  const references = [];
  const lines = readText(textFile).replace(/^\uFEFF/, '').split(/\r?\n/);
  const imageToken = /[^\s"'#;=,()]+\.(?:gif|png)\b/gi;

  lines.forEach((rawLine, lineIndex) => {
    const line = rawLine.split('#', 1)[0];
    for (const match of line.matchAll(imageToken)) {
      references.push({
        token: match[0]
          .replace(/^[\[<{]+/, '')
          .replace(/[\]}>]+$/, '')
          .replaceAll('\\', '/'),
        line: lineIndex + 1,
      });
    }
  });
  return references;
}

function inspectExactCase(absolutePath) {
  const parsed = path.parse(absolutePath);
  const parts = absolutePath.slice(parsed.root.length).split(path.sep).filter(Boolean);
  let current = parsed.root;
  const correctedParts = [];

  for (const part of parts) {
    let entries;
    try {
      entries = fs.readdirSync(current);
    } catch {
      return { status: 'missing', correctedPath: path.join(parsed.root, ...correctedParts, part) };
    }
    if (entries.includes(part)) {
      correctedParts.push(part);
      current = path.join(current, part);
      continue;
    }
    const caseMatches = entries.filter((entry) => entry.toLowerCase() === part.toLowerCase());
    if (caseMatches.length !== 1) {
      return {
        status: caseMatches.length ? 'ambiguous' : 'missing',
        correctedPath: path.join(parsed.root, ...correctedParts, part),
      };
    }
    return {
      status: 'case-mismatch',
      correctedPath: path.join(parsed.root, ...correctedParts, caseMatches[0], ...parts.slice(correctedParts.length + 1)),
    };
  }

  try {
    if (!fs.statSync(current).isFile()) return { status: 'not-file', correctedPath: current };
  } catch {
    return { status: 'missing', correctedPath: current };
  }
  return { status: 'exact', correctedPath: current };
}

function resolveReference(reference, stageRoot) {
  if (/^data\//i.test(reference.token)) {
    return path.join(stageRoot, ...reference.token.split('/'));
  }
  return null;
}

function ensureAlias(correctedPath, requestedPath) {
  fs.mkdirSync(path.dirname(requestedPath), { recursive: true });
  if (fs.existsSync(requestedPath)) return 'exists';
  fs.copyFileSync(correctedPath, requestedPath);
  return 'copied';
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const records = [];
  const seen = new Set();

  for (const model of options.models) {
    const relativeModel = model.replace(/^data\//i, '');
    const modelPath = path.join(options.sourceRoot, relativeModel);
    if (!fs.existsSync(modelPath)) throw new Error(`Missing model file: ${modelPath}`);
    const references = extractReferences(modelPath);
    for (const reference of references) {
      const requestedPath = resolveReference(reference, options.stageRoot);
      if (!requestedPath) continue;
      if (seen.has(requestedPath)) continue;
      seen.add(requestedPath);
      const inspection = inspectExactCase(requestedPath);
      if (inspection.status === 'exact') continue;
      if (inspection.status !== 'case-mismatch') {
        records.push({
          requested: path.relative(options.stageRoot, requestedPath).replaceAll(path.sep, '/'),
          existing: inspection.correctedPath ? path.relative(options.stageRoot, inspection.correctedPath).replaceAll(path.sep, '/') : '',
          model,
          line: reference.line,
          action: inspection.status,
        });
        continue;
      }
      const action = ensureAlias(inspection.correctedPath, requestedPath);
      records.push({
        requested: path.relative(options.stageRoot, requestedPath).replaceAll(path.sep, '/'),
        existing: path.relative(options.stageRoot, inspection.correctedPath).replaceAll(path.sep, '/'),
        model,
        line: reference.line,
        action,
      });
    }
  }

  const reportPath = path.join(options.stageRoot, 'case-alias-report.tsv');
  const lines = ['requested\texisting\tmodel\tline\taction'];
  for (const record of records) {
    lines.push([record.requested, record.existing, record.model, record.line, record.action].join('\t'));
  }
  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`);
  console.log(`Case alias report: ${reportPath}`);
  console.log(`Records: ${records.length}`);
  for (const record of records.slice(0, 10)) {
    console.log(`${record.action}: ${record.requested} <= ${record.existing} (${record.model}:${record.line})`);
  }
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
