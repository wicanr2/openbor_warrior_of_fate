#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'research/PREVIEW_GALLERY.md');
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
    if (entry.isDirectory()) collectImages(full, out);
    else if (entry.isFile() && /\.(png|gif|jpg|jpeg|webp)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

const files = SEARCH_DIRS.flatMap(dir => collectImages(path.join(ROOT, dir)));
const unique = [...new Set(files)].sort((a, b) => a.localeCompare(b));

const groups = new Map();
for (const file of unique) {
  const relRoot = path.relative(ROOT, file).replace(/\\/g, '/');
  const rel = path.relative(path.join(ROOT, 'research'), file).replace(/\\/g, '/');
  const dir = path.dirname(relRoot);
  if (!groups.has(dir)) groups.set(dir, []);
  groups.get(dir).push(rel);
}

const orderedDirs = [...groups.keys()].sort((a, b) => a.localeCompare(b));

const lines = [];
lines.push('# Preview gallery');
lines.push('');
lines.push('This page is generated from the current repository image set. It is an overview of the public/review assets already present in the tree, not a claim of game completion.');
lines.push('');
lines.push(`Total images: ${unique.length}`);
lines.push('');
for (const dir of orderedDirs) {
  const items = groups.get(dir);
  lines.push(`## ${dir}`);
  lines.push('');
  for (const rel of items) {
    const file = path.basename(rel);
    lines.push(`- ${file}`);
    lines.push(`  - ![${file}](${rel})`);
  }
  lines.push('');
}

fs.writeFileSync(OUT, lines.join('\n'));
console.log(`Wrote ${path.relative(ROOT, OUT)} with ${unique.length} image(s).`);
