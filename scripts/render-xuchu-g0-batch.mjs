#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_MD = path.join(ROOT, 'research/XUCHU_G0_BATCH.md');
const OUT_JSON = path.join(ROOT, 'research/manifests/xuchu-g0-closure.json');

function usage() {
  return `Render the Xuchu G0 boss batch from an extracted model tree.

Usage:
  node scripts/render-xuchu-g0-batch.mjs --model-root PATH
`;
}

function parseArgs(argv) {
  let modelRoot = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    }
    if (arg === '--model-root') {
      modelRoot = argv[i + 1];
      if (!modelRoot) throw new Error('--model-root requires a path');
      i += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }
  if (!modelRoot) throw new Error('--model-root is required');
  return { modelRoot: path.resolve(modelRoot) };
}

function readText(p) {
  return fs.readFileSync(p, 'latin1');
}

function rel(from, to) {
  return path.relative(path.join(ROOT, from), path.join(ROOT, to)).replace(/\\/g, '/');
}

function extractRefs(text) {
  const refs = text.match(/data\/chars\/boss\/xuchu\/[A-Za-z0-9_.\/-]+\.(?:gif|GIF|txt|wav)/g) ?? [];
  return refs.map(ref => ref.replace(/\\/g, '/'));
}

function categoryFor(ref) {
  const name = path.posix.basename(ref).toLowerCase();
  if (name === 'xuchu.txt' || name === 'chu.txt' || name === 'xuchuxs.txt' || name === 'xuchuxs1.txt' || name === 'xuchuxo.txt') return 'models';
  if (name === 'icon.gif' || name === 'iconp.gif') return 'identity';
  if (name === 'idle00.gif' || name.startsWith('walk')) return 'locomotion';
  if (name.startsWith('punch') || name.startsWith('throw') || name.startsWith('jk')) return 'combat';
  if (name.startsWith('jump')) return 'airborne';
  if (name.startsWith('pain') || name.startsWith('fall') || name.startsWith('death')) return 'damage';
  if (name.startsWith('sb') || name === 'haha00.gif' || name === 'red.gif') return 'fx';
  return 'other';
}

function main() {
  const { modelRoot } = parseArgs(process.argv.slice(2));
  const inputFiles = [
    path.join(modelRoot, 'xuchu.txt'),
    path.join(modelRoot, 'chu.txt'),
    path.join(modelRoot, '1/xuchuxs.txt'),
  ];
  for (const file of inputFiles) {
    if (!fs.existsSync(file)) throw new Error(`Missing required file: ${file}`);
  }

  const refs = new Set();
  const sourceFiles = [];
  for (const file of inputFiles) {
    const text = readText(file);
    sourceFiles.push(rel('research', file));
    for (const ref of extractRefs(text)) refs.add(ref);
  }
  const refsSorted = [...refs].sort((a, b) => a.localeCompare(b));
  const groups = new Map();
  for (const ref of refsSorted) {
    const category = categoryFor(ref);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(ref);
  }

  const json = {
    schemaVersion: 1,
    slot: 'xuchu',
    status: 'g0-batch-closure-verified-from-existing-tree',
    sourceFiles,
    totals: {
      uniqueRefs: refsSorted.length,
      categoryCounts: Object.fromEntries([...groups.entries()].map(([k, v]) => [k, v.length])),
    },
    categories: Object.fromEntries(groups),
  };
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(json, null, 2)}\n`);

  const lines = [];
  lines.push('# Xuchu G0 batch');
  lines.push('');
  lines.push('這份文件把 `xuchu` 的現成模型 closure 收斂成 G0 的可交接批次。');
  lines.push('它保留原 canvas／玩法契約，但把依賴、幾何與 production redraw 的入口明確化。');
  lines.push('');
  lines.push('## 範圍定義');
  lines.push('');
  lines.push('- G0 目標：維持原劇情 slot，先把大型主角機 Boss 的可視可玩版本做出來。');
  lines.push('- 先不改成真正超巨大戰；仍沿用原 canvas、Offset、BBox 與 attack box 的思路。');
  lines.push('- 必要交付：主體、identity、locomotion、combat、airborne、damage、FX、子模型。');
  lines.push('');
  lines.push('## 來源文件');
  lines.push('');
  for (const file of inputFiles) {
    lines.push(`- \`${file}\``);
  }
  lines.push('');
  lines.push('## 依賴閉包');
  lines.push('');
  lines.push(`- unique refs: ${refsSorted.length}`);
  for (const [category, items] of groups.entries()) {
    lines.push(`- ${category}: ${items.length}`);
  }
  lines.push('');
  lines.push('### 全部唯一引用');
  lines.push('');
  lines.push('| Category | Ref |');
  lines.push('| --- | --- |');
  for (const ref of refsSorted) {
    lines.push(`| ${categoryFor(ref)} | ${ref} |`);
  }
  lines.push('');
  lines.push('## G0 驗證重點');
  lines.push('');
  lines.push('- 保留 `xuchu` 的原依賴閉包，不把馬匹或人類血肉語彙帶進 G0。');
  lines.push('- `geometry-migration.json` 只在 canvas / offset 真正要動時加入，不能默默改圖。');
  lines.push('- 先完成一套可視 gameplay review，再談更高階的超巨大戰。');
  lines.push('');
  lines.push('## 驗證命令');
  lines.push('');
  lines.push('```bash');
  lines.push('node scripts/validate-openbor-assets.mjs --data <staging-tree>/data/chars/boss/xuchu/xuchu.txt --strict');
  lines.push('scripts/run-openbor-smoke-docker.sh --binary /path/to/OpenBOR --stage <staging-tree> --seconds 20');
  lines.push('```');

  fs.writeFileSync(OUT_MD, lines.join('\n'));
  console.log(`Wrote ${path.relative(ROOT, OUT_MD)}`);
  console.log(`Wrote ${path.relative(ROOT, OUT_JSON)}`);
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
