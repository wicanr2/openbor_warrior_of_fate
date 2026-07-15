#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.resolve(scriptDirectory, '..');
const workplaceDirectory = path.join(repositoryDirectory, 'workplace');
const DEFAULT_BASE = path.join(workplaceDirectory, 'extracted', 'data');
const DEFAULT_OVERLAY = path.join(workplaceDirectory, 'robot_wof_vertical_slice', 'overlay', 'data');

function usage() {
  console.log(`Usage:
  node scripts/prepare-openbor-smoke.mjs [options]

Options:
  --base PATH          Read-only base data directory
                       (default: workplace/extracted/data)
  --overlay PATH       Overlay data directory copied over the base
                       (default: workplace/robot_wof_vertical_slice/overlay/data)
  --output PATH        New staging directory; it must not already exist
                       (default: a unique directory below ${os.tmpdir()})
  --no-case-aliases    Report Zhang Fei image path case mismatches without
                       creating exact-case copies in the disposable tree
  --help               Show this help

The script never writes to --base or --overlay. The result contains a merged
data/ tree, isolated Logs/Saves/ScreenShots/Paks directories, and an empty
robot-wof.dev.pak sentinel used only to bypass OpenBOR's module menu while the
engine detects and loads the loose data/ directory.`);
}

function parseArguments(argv) {
  const options = {
    base: DEFAULT_BASE,
    overlay: DEFAULT_OVERLAY,
    output: null,
    caseAliases: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      usage();
      process.exit(0);
    }
    if (argument === '--no-case-aliases') {
      options.caseAliases = false;
      continue;
    }
    for (const name of ['base', 'overlay', 'output']) {
      if (argument === `--${name}`) {
        if (!argv[index + 1]) throw new Error(`${argument} requires a path`);
        options[name] = argv[index + 1];
        index += 1;
        break;
      }
      if (argument.startsWith(`--${name}=`)) {
        options[name] = argument.slice(name.length + 3);
        if (!options[name]) throw new Error(`${argument} requires a path`);
        break;
      }
    }
    if (!['--base', '--overlay', '--output'].includes(argument)
        && !argument.startsWith('--base=')
        && !argument.startsWith('--overlay=')
        && !argument.startsWith('--output=')) {
      throw new Error(`Unknown option: ${argument}`);
    }
  }
  return options;
}

function requireDirectory(directory, label) {
  let stat;
  try {
    stat = fs.statSync(directory);
  } catch {
    throw new Error(`${label} does not exist: ${directory}`);
  }
  if (!stat.isDirectory()) throw new Error(`${label} is not a directory: ${directory}`);
}

function countFiles(directory) {
  let count = 0;
  const pending = [directory];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(entryPath);
      else if (entry.isFile()) count += 1;
    }
  }
  return count;
}

function copyOverlayContents(source, destination) {
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    fs.cpSync(sourcePath, destinationPath, {
      recursive: true,
      force: true,
      errorOnExist: false,
      dereference: true,
    });
  }
}

function listTextFiles(directory) {
  const files = [];
  const pending = [directory];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(entryPath);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.txt')) files.push(entryPath);
    }
  }
  return files.sort();
}

function extractImageReferences(textFile) {
  const references = [];
  const lines = fs.readFileSync(textFile, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  const imageToken = /[^\s"'#;=,()]+\.(?:gif|png)\b/gi;

  lines.forEach((rawLine, lineIndex) => {
    const line = rawLine.split('#', 1)[0];
    for (const match of line.matchAll(imageToken)) {
      references.push({
        token: match[0]
          .replace(/^[\[<{]+/, '')
          .replace(/[\]}>]+$/, '')
          .replaceAll('\\', '/'),
        textFile,
        line: lineIndex + 1,
      });
    }
  });
  return references;
}

function inspectCase(absolutePath) {
  const parsed = path.parse(absolutePath);
  const components = absolutePath.slice(parsed.root.length).split(path.sep).filter(Boolean);
  let current = parsed.root;

  for (let index = 0; index < components.length; index += 1) {
    const wanted = components[index];
    let entries;
    try {
      entries = fs.readdirSync(current);
    } catch {
      return { status: 'missing', correctedPath: null };
    }
    if (entries.includes(wanted)) {
      current = path.join(current, wanted);
      continue;
    }
    const matches = entries.filter((entry) => entry.toLowerCase() === wanted.toLowerCase());
    if (matches.length !== 1) {
      return { status: matches.length ? 'ambiguous' : 'missing', correctedPath: null };
    }
    const corrected = path.join(current, matches[0], ...components.slice(index + 1));
    return { status: 'case-mismatch', correctedPath: corrected };
  }
  return { status: 'exact', correctedPath: current };
}

function resolveReference(reference, stagingRoot, dataDirectory) {
  if (/^data\//i.test(reference.token)) {
    return path.join(stagingRoot, ...reference.token.split('/'));
  }
  return path.resolve(path.dirname(reference.textFile), ...reference.token.split('/'));
}

function repairZhangfeiCase(stagingRoot, dataDirectory, createAliases) {
  const modelDirectory = path.join(dataDirectory, 'chars', 'zhangfei');
  if (!fs.existsSync(modelDirectory)) {
    return [{ requested: '', existing: '', source: '', action: 'zhangfei model directory missing' }];
  }

  const records = [];
  const seen = new Set();
  for (const textFile of listTextFiles(modelDirectory)) {
    for (const reference of extractImageReferences(textFile)) {
      const requestedPath = resolveReference(reference, stagingRoot, dataDirectory);
      const key = requestedPath;
      if (seen.has(key)) continue;
      seen.add(key);
      const inspection = inspectCase(requestedPath);
      if (inspection.status === 'exact') continue;

      let action = inspection.status;
      if (inspection.status === 'case-mismatch' && createAliases) {
        fs.mkdirSync(path.dirname(requestedPath), { recursive: true });
        fs.copyFileSync(inspection.correctedPath, requestedPath);
        action = 'copied exact-case alias in staging';
      }
      records.push({
        requested: path.relative(stagingRoot, requestedPath).replaceAll(path.sep, '/'),
        existing: inspection.correctedPath
          ? path.relative(stagingRoot, inspection.correctedPath).replaceAll(path.sep, '/')
          : '',
        source: `${path.relative(stagingRoot, textFile).replaceAll(path.sep, '/')}:${reference.line}`,
        action,
      });
    }
  }
  return records;
}

function writeCaseReport(output, records) {
  const lines = ['requested\texisting\tsource\taction'];
  for (const record of records) {
    lines.push([record.requested, record.existing, record.source, record.action].join('\t'));
  }
  fs.writeFileSync(path.join(output, 'zhangfei-case-report.tsv'), `${lines.join('\n')}\n`);
}

function createOutput(requestedOutput) {
  if (!requestedOutput) return fs.mkdtempSync(path.join(os.tmpdir(), 'robot-wof-openbor-smoke-'));
  const output = path.resolve(requestedOutput);
  if (fs.existsSync(output)) {
    throw new Error(`--output already exists; refusing to overwrite it: ${output}`);
  }
  fs.mkdirSync(output, { recursive: true });
  return output;
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  const base = path.resolve(options.base);
  const overlay = path.resolve(options.overlay);
  requireDirectory(base, '--base');
  requireDirectory(overlay, '--overlay');

  const output = createOutput(options.output);
  const dataOutput = path.join(output, 'data');
  fs.cpSync(base, dataOutput, { recursive: true, force: false, errorOnExist: true, dereference: true });
  const overlayFileCount = countFiles(overlay);
  copyOverlayContents(overlay, dataOutput);

  const caseRecords = repairZhangfeiCase(output, dataOutput, options.caseAliases);
  writeCaseReport(output, caseRecords);

  for (const directory of ['Logs', 'Paks', 'Saves', 'ScreenShots']) {
    fs.mkdirSync(path.join(output, directory));
  }
  fs.writeFileSync(path.join(output, 'robot-wof.dev.pak'), '');
  fs.writeFileSync(path.join(output, 'SMOKE-STAGING.txt'), [
    'Disposable OpenBOR raw-data staging tree.',
    `Base (read only): ${base}`,
    `Overlay (read only): ${overlay}`,
    `Overlay files copied: ${overlayFileCount}`,
    `Zhang Fei case mismatches: ${caseRecords.length}`,
    `Exact-case aliases created: ${options.caseAliases ? 'yes' : 'no'}`,
    '',
    'robot-wof.dev.pak is an empty development sentinel, not a distributable PAK.',
    'Run OpenBOR with this file as argv[1] from this directory; loose data/ wins.',
    '',
  ].join('\n'));

  console.log('OpenBOR disposable smoke tree prepared');
  console.log(`Stage: ${output}`);
  console.log(`Base files: ${countFiles(base)}`);
  console.log(`Overlay files copied: ${overlayFileCount}`);
  console.log(`Zhang Fei case mismatches: ${caseRecords.length}`);
  console.log(`Case action: ${options.caseAliases ? 'exact-case copies created only in staging' : 'report only'}`);
  console.log(`Case report: ${path.join(output, 'zhangfei-case-report.tsv')}`);
  console.log('Validate:');
  console.log(`  node ${path.join(scriptDirectory, 'validate-openbor-assets.mjs')} --data ${path.join(dataOutput, 'chars', 'zhangfei', 'zhangfei.txt')} --strict`);
  console.log('Launch (replace /path/to/OpenBOR):');
  console.log(`  cd ${output} && /path/to/OpenBOR ./robot-wof.dev.pak`);
}

try {
  main();
} catch (error) {
  console.error(`prepare-openbor-smoke: ${error.message}`);
  process.exitCode = 1;
}
