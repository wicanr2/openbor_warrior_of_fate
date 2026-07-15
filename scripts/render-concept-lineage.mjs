#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'research/CONCEPT_LINEAGE.md');

const rows = [
  {
    category: 'Player slot',
    slot: 'guanyu',
    concept: '蓋特系紅色合體機 / 流龍馬',
    assets: [
      'research/guanyu/guanyu-getter-v2-storyboard-v5-overview.png',
      'research/previews/guanyu-getter-v2-p0-engineering-preview.png',
      'research/manifests/guanyu-getter-v2-runtime-audit.json',
    ],
    next: 'research/manifests/guanyu-next-queue.json',
    status: 'p0-engineering-runtime-complete-but-production-remaining',
  },
  {
    category: 'Player slot',
    slot: 'zhangfei',
    concept: '無敵鐵金剛 / 兜甲兒',
    assets: [
      'research/mazinger/mazinger-keyposes-contact-sheet.png',
      'research/ui/five-robot-selection-screen-v1-overview.png',
      'research/MAZINGER_P0_FRAME_MAP.md',
    ],
    next: 'research/manifests/mazinger-keyposes.json',
    status: 'engineering-coverage-only',
  },
  {
    category: 'Player slot',
    slot: 'zhaoyun',
    concept: 'EVA 初號機 / 碇真嗣',
    assets: [
      'research/zhaoyun/zhaoyun-violet-synapse-lancer-storyboard-v1-keyed.png',
      'research/previews/zhaoyun-p0-engineering-preview.png',
      'research/manifests/nu-gundam-sixth-character-v5.json',
    ],
    next: 'research/manifests/nu-gundam-next-queue.json',
    status: 'p0-engineering-runtime-complete-but-production-remaining',
  },
  {
    category: 'Player slot',
    slot: 'huangzhong',
    concept: 'RX-78-2 / 阿姆羅',
    assets: [
      'research/huangzhong/huangzhong-azure-photon-ranger-storyboard-v1-keyed.png',
      'research/previews/huangzhong-p0-engineering-preview.png',
      'research/huangzhong/huangzhong-photon-projectile-fx-storyboard-v1-keyed.png',
    ],
    next: 'research/manifests/huangzhong-azure-photon-ranger-keyposes.json',
    status: 'p0-engineering-runtime-complete-but-production-remaining',
  },
  {
    category: 'Player slot',
    slot: 'weiyan',
    concept: '機械哥吉拉 / 迷你哥吉拉',
    assets: [
      'research/weiyan/weiyan-riftbeast-storyboard-v2-overview.png',
      'research/previews/weiyan-riftbeast-p0-engineering-preview.png',
      'research/weiyan/weiyan-riftbeast-local-fx-storyboard-v1-overview.png',
    ],
    next: 'research/manifests/weiyan-riftbeast-p0-runtime-audit.json',
    status: 'p0-engineering-runtime-complete-but-production-remaining',
  },
  {
    category: 'Sixth slot',
    slot: 'nu_gundam',
    concept: 'ν Gundam / sixth selectable robot',
    assets: [
      'research/nu-gundam/nu-gundam-sixth-character-storyboard-v5-overview.png',
      'research/previews/nu-gundam-sixth-character-p0-engineering-preview.png',
      'research/ui/six-robot-selection-screen-v1-overview.png',
    ],
    next: 'research/manifests/nu-gundam-next-queue.json',
    status: 'p0-engineering-runtime-complete-but-production-remaining',
  },
  {
    category: 'Stage 01',
    slot: 'bing / lidian / baoxiang',
    concept: '藍盔巡邏兵 / 紅槍指揮機 / 機械補給箱',
    assets: [
      'research/enemy/blue-helmet-grunt-storyboard-v1-keyed.png',
      'research/boss/lidian-red-spear-commander-storyboard-v1-keyed.png',
      'research/props/baoxiang-mechanical-capsule-storyboard-v1-keyed.png',
      'research/previews/stage01-engineering-composite.png',
    ],
    next: 'research/manifests/stage01-delivery-checklist.json',
    status: 'engineering-coverage-only',
  },
  {
    category: 'Boss plan',
    slot: 'zeon_boss / xuchu / xiahorse / meimei trio',
    concept: '有腳吉翁克、巨型主角機、兩階段騎乘 Boss、成年女性 Boss 三人組',
    assets: [
      'research/zeon-boss/zeon-boss-with-legs-storyboard-v2-overview.png',
      'research/previews/weiyan-riftbeast-p0-engineering-preview.png',
      'research/previews/huangzhong-p0-engineering-preview.png',
      'research/diagrams/enemy-boss-roster.svg',
    ],
    next: 'research/manifests/boss-next-queue.json',
    status: 'mixed-engineering-and-production-remaining',
  },
  {
    category: 'Portrait routing',
    slot: 'liubei / caocao / lubu',
    concept: 'story-only defaults until explicitly promoted to selectable or boss-event roles',
    assets: [
      'docs/PORTRAIT_ASSETS.md',
      'research/manifests/portrait-work-queue.json',
      'research/VISUAL_ASSET_INDEX.md',
    ],
    next: 'docs/PORTRAIT_ASSETS.md',
    status: 'story-only-routing-confirmed',
  },
  {
    category: 'Portrait routing',
    slot: 'nu_gundam / zeon_boss',
    concept: 'nu_gundam pilot portrait TBD; zeon_boss pilot cut-in separated from mecha portrait',
    assets: [
      'docs/PILOT_AND_PORTRAIT_ROSTER.md',
      'research/manifests/portrait-work-queue.json',
      'research/NU_GUNDAM_RUNNER_QA.md',
    ],
    next: 'docs/PILOT_AND_PORTRAIT_ROSTER.md',
    status: 'routing-confirmed-but-art-remaining',
  },
];

function toResearchRel(relPath) {
  return path.relative(path.dirname(OUT), path.join(ROOT, relPath)).replace(/\\/g, '/');
}

const lines = [];
lines.push('# Concept lineage');
lines.push('');
lines.push('This report ties the concept directions to the assets already in the repository and the open queues that still need production closure. It is the shortest useful map from concept art to current implementation state.');
lines.push('');
lines.push('| Category | Slot | Concept brief | Current assets | Open queue / next step | Status |');
lines.push('| --- | --- | --- | --- | --- | --- |');

for (const row of rows) {
  const assets = row.assets.map(rel => {
    const link = toResearchRel(rel);
    return `[${path.basename(rel)}](${link})`;
  }).join('<br>');
  const next = row.next ? `[${path.basename(row.next)}](${toResearchRel(row.next)})` : '—';
  lines.push(`| ${row.category} | ${row.slot} | ${row.concept} | ${assets} | ${next} | ${row.status} |`);
}

lines.push('');
lines.push('## Notes');
lines.push('');
lines.push('- Concept names are production-direction labels, not proof of rights clearance.');
lines.push('- Current assets are preview/contact-sheet/storyboard artifacts only; production GIFs remain governed by the queue and audit reports.');
lines.push('- If a slot changes direction, regenerate this report together with the open items report and master atlas.');

fs.writeFileSync(OUT, lines.join('\n'));
console.log(`Wrote ${path.relative(ROOT, OUT)}`);
