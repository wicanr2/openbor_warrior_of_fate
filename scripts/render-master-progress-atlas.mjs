#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'research/previews/master-progress-atlas.svg');
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

function mimeFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

const files = SEARCH_DIRS.flatMap(dir => collectImages(path.join(ROOT, dir)));
const unique = [...new Set(files)]
  .filter(file => path.resolve(file) !== OUT)
  .sort((a, b) => a.localeCompare(b));

if (unique.length === 0) {
  console.error('No preview images found.');
  process.exit(1);
}

const cols = 5;
const cellW = 320;
const cellH = 210;
const thumbW = 292;
const thumbH = 142;
const labelH = 48;
const gap = 12;
const rows = Math.ceil(unique.length / cols);
const width = cols * cellW + (cols + 1) * gap;
const height = rows * cellH + (rows + 1) * gap + 80;

const cells = unique.map((file, index) => {
  const col = index % cols;
  const row = Math.floor(index / cols);
  const x = gap + col * (cellW + gap);
  const y = 60 + gap + row * (cellH + gap);
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const data = fs.readFileSync(file).toString('base64');
  const mime = mimeFor(file);
  const href = `data:${mime};base64,${data}`;
  const safeLabel = rel.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `
    <g transform="translate(${x},${y})">
      <rect x="0" y="0" width="${cellW}" height="${cellH}" rx="12" fill="#111827" stroke="#334155" />
      <rect x="14" y="14" width="${thumbW}" height="${thumbH}" rx="8" fill="#050816" opacity="0.85" />
      <image href="${href}" x="14" y="14" width="${thumbW}" height="${thumbH}" preserveAspectRatio="xMidYMid meet" />
      <text x="16" y="${thumbH + 34}" fill="#e5e7eb" font-family="monospace" font-size="12">${safeLabel}</text>
    </g>`;
}).join('\n');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#0b1020"/>
  <text x="${gap}" y="30" fill="#f8fafc" font-family="sans-serif" font-size="24" font-weight="700">Master progress atlas</text>
  <text x="${gap}" y="52" fill="#cbd5e1" font-family="sans-serif" font-size="14">Current preview / contact-sheet / storyboard assets already present in the repository.</text>
  ${cells}
</svg>`;

fs.writeFileSync(OUT, svg);
console.log(`Wrote ${path.relative(ROOT, OUT)} with ${unique.length} source image(s).`);
