#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'research/VISUAL_ASSET_INDEX.md');

const entries = [
  {
    section: 'Stage 01 / environment / grunt',
    source: 'research/manifests/stage01-delivery-checklist.json',
    dir: 'research',
    files: [
      'environment/stage01-background-p0-overview.png',
      'enemy/blue-helmet-grunt-storyboard-v1-keyed.png',
      'props/baoxiang-mechanical-capsule-storyboard-v1-keyed.png',
      'boss/lidian-red-spear-commander-storyboard-v1-keyed.png',
    ],
  },
  {
    section: 'Characters / preview sheets',
    source: 'research/manifests/portrait-work-queue.json',
    dir: 'research/contact-sheets',
    files: [
      'guanyu.png',
      'zhaoyun.png',
      'huangzhong.png',
      'weiyan.png',
      'zhangfei.png',
      'portrait-assets.png',
    ],
  },
  {
    section: 'Character engineering previews',
    source: 'research/manifests/project-roadmap.json',
    dir: 'research/previews',
    files: [
      'guanyu-getter-v2-p0-engineering-preview.png',
      'zhaoyun-p0-engineering-preview.png',
      'huangzhong-p0-engineering-preview.png',
      'weiyan-riftbeast-p0-engineering-preview.png',
      'nu-gundam-sixth-character-p0-engineering-preview.png',
      'stage01-engineering-composite.png',
    ],
  },
  {
    section: 'Boss / story / special previews',
    source: 'research/manifests/boss-next-queue.json',
    dir: 'research',
    files: [
      'zeon-boss/zeon-boss-with-legs-storyboard-v2-overview.png',
      'weiyan/weiyan-riftbeast-storyboard-v2-overview.png',
      'weiyan/weiyan-riftbeast-local-fx-storyboard-v1-overview.png',
      'nu-gundam/nu-gundam-sixth-character-storyboard-v5-overview.png',
      'guanyu/guanyu-getter-v2-storyboard-v5-overview.png',
      'zhaoyun/zhaoyun-violet-synapse-lancer-storyboard-v1-keyed.png',
      'huangzhong/huangzhong-azure-photon-ranger-storyboard-v1-keyed.png',
      'huangzhong/huangzhong-photon-projectile-fx-storyboard-v1-keyed.png',
      'mazinger/mazinger-keyposes-contact-sheet.png',
    ],
  },
  {
    section: 'UI / selection',
    source: 'research/manifests/portrait-work-queue.json',
    dir: 'research/ui',
    files: [
      'five-robot-selection-screen-v1-overview.png',
      'five-robot-selection-screen-v2-getter-overview.png',
      'six-robot-selection-screen-v1-overview.png',
    ],
  },
];

const lines = [];
lines.push('# Visual asset index');
lines.push('');
lines.push('This index maps the current preview and contact-sheet assets to their working theme. It is a handoff aid for locating the right visual reference quickly.');
lines.push('');

for (const group of entries) {
  lines.push(`## ${group.section}`);
  lines.push('');
  const sourceLink = path.relative(path.join(ROOT, 'research'), path.join(ROOT, group.source)).replace(/\\/g, '/');
  lines.push(`- Source: [${sourceLink}](${sourceLink})`);
  lines.push('');
  for (const rel of group.files) {
    const abs = path.join(ROOT, group.dir, rel.split('/').slice(-1)[0]);
    const actual = path.join(ROOT, group.dir, rel);
    const exists = fs.existsSync(actual);
    lines.push(`- ${rel}${exists ? '' : '  (missing)'}`);
  }
  lines.push('');
}

lines.push('## Notes');
lines.push('');
lines.push('- This file is only an index. The authoritative progress state remains the queue / audit / atlas reports.');
lines.push('- If a visual reference moves, regenerate this file and the master atlas together.');

fs.writeFileSync(OUT, lines.join('\n'));
console.log(`Wrote ${path.relative(ROOT, OUT)}`);
