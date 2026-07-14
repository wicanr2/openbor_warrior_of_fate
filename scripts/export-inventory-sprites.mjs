#!/usr/bin/env node
// Export GIF files directly referenced by the five main character definitions.
import fs from 'node:fs';
import path from 'node:path';

const [sourceRootArgument, destinationRootArgument] = process.argv.slice(2);
if (!sourceRootArgument || !destinationRootArgument) {
  throw new Error('Usage: export-inventory-sprites.mjs <extracted-data-root> <destination-root>');
}
const sourceRoot = path.resolve(sourceRootArgument);
const destinationRoot = path.resolve(destinationRootArgument);
const characters = ['guanyu', 'zhaoyun', 'zhangfei', 'weiyan', 'huangzhong'];
const filesByLowercasePath = new Map();

function index(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) index(absolute);
    else if (entry.isFile()) filesByLowercasePath.set(path.relative(sourceRoot, absolute).replaceAll(path.sep, '/').toLowerCase(), absolute);
  }
}
index(sourceRoot);

const summary = [];
for (const character of characters) {
  const definition = path.join(sourceRoot, 'data', 'chars', character, `${character}.txt`);
  const requested = new Set();
  for (const line of fs.readFileSync(definition, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*frame\s+(\S+)/i);
    if (match && /\.gif$/i.test(match[1]) && match[1].toLowerCase() !== 'none') requested.add(match[1].replaceAll('\\', '/'));
  }
  let copied = 0;
  for (const logicalPath of requested) {
    const source = filesByLowercasePath.get(logicalPath.toLowerCase());
    if (!source) throw new Error(`Missing GIF referenced by ${character}: ${logicalPath}`);
    const relativeName = logicalPath.toLowerCase().startsWith(`data/chars/${character}/`) ? logicalPath.slice(`data/chars/${character}/`.length) : `external/${logicalPath.replaceAll('/', '__')}`;
    const destination = path.join(destinationRoot, character, relativeName);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    copied++;
  }
  summary.push(`- ${character}: ${copied} GIF files`);
}
fs.writeFileSync(path.join(destinationRoot, 'README.md'), `# 分鏡圖片\n\n此目錄只包含五名主角色定義直接引用的 GIF 分鏡；詳細動作對照請見 [角色替換分鏡總表](../CHARACTER_SPRITE_INVENTORY.md)。\n\n${summary.join('\n')}\n`);
