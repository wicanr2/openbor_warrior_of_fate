#!/usr/bin/env node

import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

function parseArgs(argv) {
  const options = {
    workspace: REPO_ROOT,
    output: join(REPO_ROOT, 'research/previews/guanyu-getter-v2-p0-engineering-preview.png'),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') {
      console.log('Usage: node scripts/build-guanyu-getter-v2-engineering-preview.mjs --workspace PATH --output PATH');
      process.exit(0);
    }
    const value = argv[index + 1];
    if (argument !== '--workspace' && argument !== '--output') throw new Error(`Unknown option: ${argument}`);
    if (!value) throw new Error(`${argument} requires a path`);
    options[argument === '--workspace' ? 'workspace' : 'output'] = resolve(value);
    index += 1;
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
    'workplace/robot_wof_vertical_slice/overlay/data/chars/guanyu/icon.GIF',
    'workplace/robot_wof_vertical_slice/overlay/data/profiles/guanyu.GIF',
    'workplace/robot_wof_vertical_slice/overlay/data/chars/guanyu/idle001.gif',
    'workplace/robot_wof_vertical_slice/overlay/data/chars/guanyu/a4.GIF',
    'workplace/robot_wof_vertical_slice/overlay/data/chars/guanyu/spec001.gif',
    'workplace/robot_wof_vertical_slice/overlay/data/chars/guanyu/fall2.gif',
  ].map(input);
  for (const source of sources) if (!existsSync(source)) throw new Error(`Missing private generated input: ${source}`);
  mkdirSync(dirname(options.output), { recursive: true });
  const draw = (text, x, y, size, color = 'white') =>
    `drawtext=fontfile=${FONT}:text='${text}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}`;
  const filter = [
    `[0:v]format=rgba,drawbox=x=0:y=0:w=750:h=390:color=0x111827:t=fill,` +
      `drawbox=x=0:y=0:w=750:h=5:color=0xEF4444:t=fill,` +
      `drawbox=x=18:y=69:w=72:h=118:color=0x1F2937:t=fill,` +
      `drawbox=x=100:y=69:w=210:h=118:color=0x1F2937:t=fill,` +
      `drawbox=x=320:y=69:w=412:h=118:color=0x1F2937:t=fill,` +
      `drawbox=x=18:y=220:w=350:h=118:color=0x1F2937:t=fill,` +
      `drawbox=x=378:y=220:w=354:h=118:color=0x1F2937:t=fill,` +
      `${draw('GUANYU / GETTER V2 P0 ENGINEERING PREVIEW', 20, 15, 22)},` +
      `${draw('65 GIF + 2 HUD  |  zero clamp  |  palette index 0 = #FC00FF', 21, 46, 12, '0xB9C2D0')},` +
      `${draw('HUD', 38, 72, 11, '0xFCA5A5')},` +
      `${draw('IDLE', 183, 72, 11, '0xFCA5A5')},` +
      `${draw('AXE SWEEP', 462, 72, 11, '0xFCA5A5')},` +
      `${draw('AERIAL SPECIAL', 126, 223, 11, '0xFCA5A5')},` +
      `${draw('PRONE / FALL', 500, 223, 11, '0xFCA5A5')},` +
      `${draw('OVERVIEW-ONLY / NOT RUNTIME CAPTURE', 20, 372, 11, '0x8792A5')}[base]`,
    '[1:v]format=rgba[icon]',
    '[2:v]format=rgba[profile]',
    '[3:v]format=rgba,colorkey=0xFC00FF:0.01:0[idle]',
    '[4:v]format=rgba,colorkey=0xFC00FF:0.01:0[sweep]',
    '[5:v]format=rgba,colorkey=0xFC00FF:0.01:0[special]',
    '[6:v]format=rgba,colorkey=0xFC00FF:0.01:0[fall]',
    '[base][icon]overlay=19:91[t1]',
    '[t1][profile]overlay=55:91[t2]',
    '[t2][idle]overlay=165:81[t3]',
    '[t3][sweep]overlay=440:81[t4]',
    '[t4][special]overlay=125:235[t5]',
    '[t5][fall]overlay=465:245[out]',
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
