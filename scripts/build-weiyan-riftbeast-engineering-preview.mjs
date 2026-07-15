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
    overlay: join(REPO_ROOT, 'workplace/robot_wof_vertical_slice/overlay'),
    output: join(REPO_ROOT, 'research/previews/weiyan-riftbeast-p0-engineering-preview.png'),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') {
      console.log('Usage: node scripts/build-weiyan-riftbeast-engineering-preview.mjs --overlay PATH --output PATH');
      process.exit(0);
    }
    if (!['--overlay', '--output'].includes(argument)) throw new Error(`Unknown option: ${argument}`);
    const value = argv[index + 1];
    if (!value) throw new Error(`${argument} requires a path`);
    options[argument === '--overlay' ? 'overlay' : 'output'] = resolve(value);
    index += 1;
  }
  return options;
}

function run(binary, args) {
  const result = spawnSync(binary, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 30_000 });
  if (result.error && result.status === null) throw result.error;
  if (result.status !== 0) throw new Error(`${binary} failed (${result.status}): ${result.stderr.trim()}`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!existsSync(FONT)) throw new Error(`Missing deterministic preview font: ${FONT}`);
  const input = (path) => join(options.overlay, path);
  const sources = [
    'data/bgs/select.gif',
    'data/chars/weiyan/idle.gif',
    'data/chars/weiyan/sp1.GIF',
    'data/chars/weiyan/attack9.GIF',
    'data/chars/weiyan/tail_ray/weiyan_tail_ray.gif',
    'data/chars/weiyan/jump3.GIF',
    'data/chars/weiyan/fall2.gif',
    'data/chars/weiyan/icon.gif',
  ].map(input);
  for (const source of sources) if (!existsSync(source)) throw new Error(`Missing generated input: ${source}`);
  mkdirSync(dirname(options.output), { recursive: true });
  const draw = (text, x, y, size, colour = 'white') =>
    `drawtext=fontfile=${FONT}:text='${text}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${colour}`;
  const filter = [
    `[0:v]format=rgba,drawbox=x=0:y=0:w=1000:h=620:color=0x0B1018:t=fill,` +
      `drawbox=x=0:y=0:w=1000:h=6:color=0xF59E0B:t=fill,` +
      `drawbox=x=18:y=72:w=486:h=282:color=0x171F29:t=fill,` +
      `drawbox=x=520:y=72:w=462:h=282:color=0x171F29:t=fill,` +
      `drawbox=x=18:y=382:w=964:h=190:color=0x171F29:t=fill,` +
      `${draw('WEI YAN RIFTBEAST / PLAYABLE P0 ENGINEERING PREVIEW', 20, 16, 23)},` +
      `${draw('86 main GIF refs + 2 HUD + tail-ray proxy | clamp 0 | #FC00FF index 0', 21, 47, 13, '0xC8D0DB')},` +
      `${draw('SIX-CANDIDATE SELECT.GIF', 27, 76, 12, '0xFCD34D')},` +
      `${draw('IDLE', 545, 76, 12, '0xFCD34D')},` +
      `${draw('TAIL-CANNON COMMAND', 748, 76, 12, '0xFCD34D')},` +
      `${draw('P0 RAY ENTITY', 672, 292, 12, '0xFCD34D')},` +
      `${draw('SPIN CLAW', 90, 388, 12, '0xFCD34D')},` +
      `${draw('DIVE', 418, 388, 12, '0xFCD34D')},` +
      `${draw('WRECKAGE', 730, 388, 12, '0xFCD34D')},` +
      `${draw('ENGINEERING COMPOSITE / NOT RUNTIME CAPTURE / PRODUCTION FX AND GAMEPLAY QA DEFERRED', 20, 594, 11, '0x7F8DA8')}[base]`,
    '[1:v]format=rgba[select]',
    '[2:v]format=rgba,colorkey=0xFC00FF:0.01:0[idle]',
    '[3:v]format=rgba,colorkey=0xFC00FF:0.01:0[command]',
    '[4:v]format=rgba,colorkey=0xFC00FF:0.01:0[spin]',
    '[5:v]format=rgba,colorkey=0xFC00FF:0.01:0,scale=iw*4:ih*4:flags=neighbor[ray]',
    '[6:v]format=rgba,colorkey=0xFC00FF:0.01:0[dive]',
    '[7:v]format=rgba,colorkey=0xFC00FF:0.01:0[wreck]',
    '[8:v]format=rgba,scale=70:108:flags=neighbor[icon]',
    '[base][select]overlay=21:76[t1]',
    '[t1][idle]overlay=525:104[t2]',
    '[t2][command]overlay=750:104[t3]',
    '[t3][ray]overlay=648:310[t4]',
    '[t4][icon]overlay=900:240[t5]',
    '[t5][spin]overlay=35:420[t6]',
    '[t6][dive]overlay=340:420[t7]',
    '[t7][wreck]overlay=660:420[out]',
  ].join(';');
  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=0x0B1018:s=1000x620:r=1',
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
