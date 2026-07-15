#!/usr/bin/env node

import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

function usage() {
  return `Build an overview-only 750x390 Zhao Yun P0 engineering preview.

Usage:
  node scripts/build-zhaoyun-engineering-preview.mjs [options]

Options:
  --workspace PATH  private project workspace containing generated overlay inputs
  --output PATH     public PNG output
  --help            show this help

The result is a deterministic composite of private generated overlay outputs,
not an OpenBOR runtime capture or a distributable sprite sheet.`;
}

function parseArgs(argv) {
  const options = {
    workspace: REPO_ROOT,
    output: join(REPO_ROOT, 'research/previews/zhaoyun-p0-engineering-preview.png'),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') { console.log(usage()); process.exit(0); }
    const value = argv[index + 1];
    if (argument === '--workspace' || argument === '--output') {
      if (!value) throw new Error(`${argument} requires a path`);
      options[argument === '--workspace' ? 'workspace' : 'output'] = resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }
  return options;
}

function run(binary, args) {
  const result = spawnSync(binary, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.error && result.status === null) throw result.error;
  if (result.status !== 0) throw new Error(`${binary} failed (${result.status}): ${result.stderr.trim()}`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!existsSync(FONT)) throw new Error(`Missing deterministic preview font: ${FONT}`);
  const input = (path) => join(options.workspace, path);
  const sources = [
    'workplace/robot_wof_vertical_slice/overlay/data/chars/zhaoyun/icon.GIF',
    'workplace/robot_wof_vertical_slice/overlay/data/profiles/zhaoyun.GIF',
    'workplace/robot_wof_vertical_slice/overlay/data/chars/zhaoyun/idle1.GIF',
    'workplace/robot_wof_vertical_slice/overlay/data/chars/zhaoyun/attack8.GIF',
    'workplace/robot_wof_vertical_slice/overlay/data/chars/zhaoyun/c1.GIF',
    'workplace/robot_wof_vertical_slice/overlay/data/chars/zhaoyun/fall2.GIF',
  ].map(input);
  for (const source of sources) if (!existsSync(source)) throw new Error(`Missing private generated input: ${source}`);
  mkdirSync(dirname(options.output), { recursive: true });
  const drawText = (text, x, y, size, color = 'white') =>
    `drawtext=fontfile=${FONT}:text='${text}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}`;
  const filter = [
    `[0:v]format=rgba,drawbox=x=0:y=0:w=750:h=390:color=0x111827:t=fill,` +
      `drawbox=x=0:y=0:w=750:h=5:color=0x8B5CF6:t=fill,` +
      `drawbox=x=18:y=69:w=72:h=118:color=0x1F2937:t=fill,` +
      `drawbox=x=100:y=69:w=210:h=118:color=0x1F2937:t=fill,` +
      `drawbox=x=320:y=69:w=412:h=118:color=0x1F2937:t=fill,` +
      `drawbox=x=18:y=220:w=350:h=118:color=0x1F2937:t=fill,` +
      `drawbox=x=378:y=220:w=354:h=118:color=0x1F2937:t=fill,` +
      `${drawText('ZHAOYUN P0 ENGINEERING PREVIEW', 20, 15, 24)},` +
      `${drawText('82 GIF + 2 HUD + 57 FX  |  palette index 0 = #FC00FF', 21, 46, 12, '0xB9C2D0')},` +
      `${drawText('HUD', 38, 72, 11, '0xA78BFA')},` +
      `${drawText('IDLE', 183, 72, 11, '0xA78BFA')},` +
      `${drawText('LANCE THRUST', 462, 72, 11, '0xA78BFA')},` +
      `${drawText('SPIN SPECIAL', 137, 223, 11, '0xA78BFA')},` +
      `${drawText('PRONE / FALL', 500, 223, 11, '0xA78BFA')},` +
      `${drawText('OVERVIEW-ONLY / NOT RUNTIME CAPTURE', 20, 372, 11, '0x8792A5')}[base]`,
    '[1:v]format=rgba[icon]',
    '[2:v]format=rgba[profile]',
    '[3:v]format=rgba,colorkey=0xFC00FF:0.01:0[idle]',
    '[4:v]format=rgba,colorkey=0xFC00FF:0.01:0[thrust]',
    '[5:v]format=rgba,colorkey=0xFC00FF:0.01:0[spin]',
    '[6:v]format=rgba,colorkey=0xFC00FF:0.01:0[fall]',
    '[base][icon]overlay=19:91[t1]',
    '[t1][profile]overlay=55:91[t2]',
    '[t2][idle]overlay=105:76[t3]',
    '[t3][thrust]overlay=385:76[t4]',
    '[t4][spin]overlay=75:223[t5]',
    '[t5][fall]overlay=430:223[out]',
  ].join(';');
  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=0x111827:s=750x390:r=1',
    ...sources.flatMap((source) => ['-i', source]),
    '-filter_complex', filter, '-map', '[out]', '-frames:v', '1', options.output,
  ]);
  console.log(`built ${options.output}`);
  console.log('preview type: deterministic engineering composite, not runtime capture');
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
