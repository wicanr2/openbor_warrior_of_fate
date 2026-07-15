#!/usr/bin/env node

import { existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const source = path.join(projectRoot, 'private_assets/robot_wof/mazinger/mazinger_p0_storyboard_v1-keyed.png');
const outputDirectory = path.join(projectRoot, 'private_assets/robot_wof/mazinger/keyposes');
const contactSheet = path.join(projectRoot, 'research/mazinger/mazinger-keyposes-contact-sheet.png');

if (!existsSync(source)) {
  throw new Error(`Local-only source sheet is missing: ${path.relative(projectRoot, source)}`);
}

// The generated figures cross nominal 4x3 grid boundaries. These hand-checked
// crop windows are intentional: frame 07/11 remove the next pose's boot, while
// frame 08/12 start farther left to preserve that boot in its correct pose.
const crops = [
  { x: 0, y: 0, width: 313, height: 418 },
  { x: 314, y: 0, width: 313, height: 418 },
  { x: 627, y: 0, width: 313, height: 418 },
  { x: 941, y: 0, width: 313, height: 418 },
  { x: 0, y: 418, width: 313, height: 418 },
  { x: 314, y: 418, width: 313, height: 418 },
  { x: 627, y: 418, width: 293, height: 418, outputWidth: 313 },
  { x: 915, y: 418, width: 313, height: 418 },
  { x: 0, y: 836, width: 313, height: 418 },
  { x: 314, y: 836, width: 313, height: 418 },
  { x: 627, y: 836, width: 223, height: 418, outputWidth: 313 },
  { x: 850, y: 836, width: 379, height: 418 },
];

function runFfmpeg(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.trim() || `ffmpeg exited ${result.status}`);
}

mkdirSync(outputDirectory, { recursive: true });

const outputs = crops.map((crop, index) => {
  const output = path.join(outputDirectory, `frame-${String(index + 1).padStart(2, '0')}.png`);
  let filter = `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`;
  if (crop.outputWidth) filter += `,pad=${crop.outputWidth}:${crop.height}:0:0:color=0xFC00FF`;
  runFfmpeg(['-i', source, '-vf', filter, output]);
  return output;
});

const filters = outputs
  .map((_, index) => `[${index}:v]pad=400:418:(400-iw)/2:0:color=0xFC00FF[p${index}]`)
  .join(';');
const streams = outputs.map((_, index) => `[p${index}]`).join('');
const layout = outputs
  .map((_, index) => `${(index % 4) * 400}_${Math.floor(index / 4) * 418}`)
  .join('|');

runFfmpeg([
  ...outputs.flatMap((file) => ['-i', file]),
  '-filter_complex',
  `${filters};${streams}xstack=inputs=12:layout=${layout}:fill=0xFC00FF`,
  '-frames:v', '1',
  contactSheet,
]);

console.log(`Wrote ${outputs.length} key poses to ${path.relative(projectRoot, outputDirectory)}`);
console.log(`Wrote ${path.relative(projectRoot, contactSheet)}`);
