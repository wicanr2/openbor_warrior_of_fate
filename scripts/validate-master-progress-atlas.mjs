#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const atlasPath = path.join(ROOT, 'research/previews/master-progress-atlas.svg');
const SEARCH_DIRS = [
  'research/previews',
  'research/contact-sheets',
  'research/ui',
  'research/environment',
  'research/guanyu',
  'research/zhaoyun',
  'research/huangzhong',
  'research/weiyan',
  'research/boss',
  'research/zeon-boss',
  'research/enemy',
  'research/props',
  'research/nu-gundam',
  'research/mazinger',
];

function collectImages(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectImages(full, out);
    } else if (entry.isFile() && /\.(png|gif|jpg|jpeg|webp)$/i.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const expected = [...new Set(SEARCH_DIRS.flatMap(dir => collectImages(path.join(ROOT, dir))))]
  .filter(file => path.resolve(file) !== atlasPath)
  .length;

const errors = [];

if (!fs.existsSync(atlasPath)) {
  errors.push('missing research/previews/master-progress-atlas.svg');
} else {
  const text = fs.readFileSync(atlasPath, 'utf8');
  const embedded = (text.match(/<image href="data:/g) || []).length;
  if (!text.includes('Master progress atlas')) {
    errors.push('atlas missing title text');
  }
  if (embedded !== expected) {
    errors.push(`atlas embedded image count mismatch: expected ${expected}, found ${embedded}`);
  }
}

if (errors.length) {
  for (const error of errors) {
    console.error(error);
  }
  console.error(`\n${errors.length} master progress atlas problem(s) found.`);
  process.exitCode = 1;
} else {
  console.log('Master progress atlas validation PASS.');
}
