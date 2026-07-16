#!/usr/bin/env node

// Assemble a disposable OpenBOR overlay from separately versioned private
// material packages. A private checkout is always explicit; no assets are
// copied into this public engineering repository.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const PACKAGE_ORDER = [
  'assets/players/guanyu',
  'assets/players/zhangfei',
  'assets/players/zhaoyun',
  'assets/players/huangzhong',
  'assets/players/weiyan',
  'assets/players/nu-gundam',
  'assets/ui/six-player-selection',
  'assets/environments/stage01-forest-outpost',
  'assets/enemies/blue-helmet-grunt',
  'assets/props/mechanical-supply-box',
  // Both following packages write models.txt. Their order is a contract.
  'assets/integration/six-player-roster',
  'assets/integration/weiyan-tail-ray-registration',
  'assets/integration/guanyu-gore-remap',
];

function usage() {
  console.log(`Usage:
  node scripts/assemble-super-robot-overlay.mjs \\
    --private-repo /path/to/openbor_security_materal \\
    --output /tmp/robot-wof-super-robot-overlay

Copies the declared package set, in a fixed overwrite order, to OUTPUT/data.
OUTPUT must not exist. A manifest with package hashes is written beside data.`);
}

function parse(argv) {
  const options = { privateRepo: '', output: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const argument = argv[i];
    if (argument === '--help' || argument === '-h') { usage(); process.exit(0); }
    if (argument === '--private-repo' || argument === '--output') {
      if (!argv[i + 1]) throw new Error(`${argument} requires a path`);
      options[argument === '--private-repo' ? 'privateRepo' : 'output'] = argv[++i];
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }
  if (!options.privateRepo || !options.output) throw new Error('--private-repo and --output are required');
  return { privateRepo: path.resolve(options.privateRepo), output: path.resolve(options.output) };
}

function filesBelow(root) {
  const files = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(entryPath);
      else if (entry.isFile()) files.push(entryPath);
    }
  }
  return files.sort();
}

function digestFiles(root) {
  const hash = crypto.createHash('sha256');
  const files = filesBelow(root);
  for (const file of files) {
    hash.update(path.relative(root, file).replaceAll(path.sep, '/'));
    hash.update('\0');
    hash.update(fs.readFileSync(file));
    hash.update('\0');
  }
  return { fileCount: files.length, sha256: hash.digest('hex') };
}

function copyContents(source, destination) {
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    fs.cpSync(path.join(source, entry.name), path.join(destination, entry.name), {
      recursive: true, force: true, dereference: true,
    });
  }
}

try {
  const options = parse(process.argv.slice(2));
  if (!fs.existsSync(options.privateRepo) || !fs.statSync(options.privateRepo).isDirectory()) {
    throw new Error(`Not a directory: ${options.privateRepo}`);
  }
  if (fs.existsSync(options.output)) throw new Error(`Output already exists (refusing to merge into it): ${options.output}`);
  fs.mkdirSync(path.join(options.output, 'data'), { recursive: true });

  const packages = [];
  for (const packagePath of PACKAGE_ORDER) {
    const source = path.join(options.privateRepo, packagePath, 'overlay', 'data');
    if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
      throw new Error(`Required package overlay is missing: ${packagePath}/overlay/data`);
    }
    const digest = digestFiles(source);
    copyContents(source, path.join(options.output, 'data'));
    packages.push({ package: packagePath, ...digest });
  }

  fs.writeFileSync(path.join(options.output, 'ASSEMBLY-MANIFEST.json'), `${JSON.stringify({
    schema: 1,
    purpose: 'disposable Super Robot Wars themed Warriors of Fate OpenBOR overlay',
    generatedAt: new Date().toISOString(),
    packageOrderIsSignificant: true,
    packages,
  }, null, 2)}\n`);
  console.log(`PASS: assembled ${packages.length} packages into ${options.output}`);
  for (const item of packages) console.log(`${item.package}: ${item.fileCount} files ${item.sha256}`);
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
