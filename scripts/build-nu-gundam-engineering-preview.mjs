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
    output: join(REPO_ROOT, 'research/previews/nu-gundam-sixth-character-p0-engineering-preview.png'),
    selectionOverview: join(REPO_ROOT, 'research/ui/six-robot-selection-screen-v1-overview.png'),
  };
  const keys = new Map([
    ['--overlay', 'overlay'], ['--output', 'output'], ['--selection-overview', 'selectionOverview'],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') {
      console.log('Usage: node scripts/build-nu-gundam-engineering-preview.mjs --overlay PATH --output PATH --selection-overview PATH');
      process.exit(0);
    }
    const key = keys.get(argument);
    if (!key) throw new Error(`Unknown option: ${argument}`);
    const value = argv[index + 1];
    if (!value) throw new Error(`${argument} requires a path`);
    options[key] = resolve(value);
    index += 1;
  }
  return options;
}

function run(binary, args) {
  const result = spawnSync(binary, args, {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    timeout: 30_000,
  });
  if (result.error && result.status === null) throw result.error;
  if (result.status !== 0) throw new Error(`${binary} failed (${result.status}): ${result.stderr.trim()}`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!existsSync(FONT)) throw new Error(`Missing deterministic preview font: ${FONT}`);
  const input = (path) => join(options.overlay, path);
  const sources = [
    'data/bgs/select.gif',
    'data/chars/nu_gundam/sp1.GIF',
    'data/chars/nu_gundam/attack07.gif',
    'data/chars/nu_gundam/funnel/nu_funnel_shot.gif',
    'data/chars/nu_gundam/idle.gif',
    'data/chars/nu_gundam/jumpa3.GIF',
    'data/chars/nu_gundam/fall2.GIF',
    'data/chars/nu_gundam/icon.GIF',
  ].map(input);
  for (const source of sources) if (!existsSync(source)) throw new Error(`Missing generated input: ${source}`);
  mkdirSync(dirname(options.output), { recursive: true });
  mkdirSync(dirname(options.selectionOverview), { recursive: true });
  const draw = (text, x, y, size, colour = 'white') =>
    `drawtext=fontfile=${FONT}:text='${text}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${colour}`;
  const filter = [
    `[0:v]format=rgba,drawbox=x=0:y=0:w=1000:h=650:color=0x0B1020:t=fill,` +
      `drawbox=x=0:y=0:w=1000:h=6:color=0x60A5FA:t=fill,` +
      `drawbox=x=18:y=74:w=486:h=282:color=0x172033:t=fill,` +
      `drawbox=x=520:y=74:w=462:h=282:color=0x172033:t=fill,` +
      `drawbox=x=18:y=397:w=964:h=204:color=0x172033:t=fill,` +
      `${draw('NU GUNDAM / SIXTH CHARACTER P0 ENGINEERING PREVIEW', 20, 16, 24)},` +
      `${draw('73 GIF + 2 HUD + 6-shot Funnel proxy | clamp 0 | index 0 = #FC00FF', 21, 48, 13, '0xB8C4D8')},` +
      `${draw('SIX-CANDIDATE 480x276 SELECT.GIF', 27, 78, 12, '0x93C5FD')},` +
      `${draw('FUNNEL COMMAND', 540, 78, 12, '0x93C5FD')},` +
      `${draw('RIFLE FIRE', 790, 78, 12, '0x93C5FD')},` +
      `${draw('MULTI-DEPTH SHOT PROXY', 620, 292, 12, '0x93C5FD')},` +
      `${draw('IDLE', 92, 402, 12, '0x93C5FD')},` +
      `${draw('BOOST', 402, 402, 12, '0x93C5FD')},` +
      `${draw('PRONE', 728, 402, 12, '0x93C5FD')},` +
      `${draw('ENGINEERING COMPOSITE / NOT A RUNTIME CAPTURE / P1 AUTONOMOUS FUNNELS DEFERRED', 20, 624, 11, '0x7F8DA8')}[base]`,
    '[1:v]format=rgba[select]',
    '[2:v]format=rgba,colorkey=0xFC00FF:0.01:0[command]',
    '[3:v]format=rgba,colorkey=0xFC00FF:0.01:0[rifle]',
    '[4:v]format=rgba,colorkey=0xFC00FF:0.01:0,scale=iw*3:ih*3:flags=neighbor[funnel]',
    '[5:v]format=rgba,colorkey=0xFC00FF:0.01:0[idle]',
    '[6:v]format=rgba,colorkey=0xFC00FF:0.01:0[boost]',
    '[7:v]format=rgba,colorkey=0xFC00FF:0.01:0[prone]',
    '[8:v]format=rgba,scale=70:108:flags=neighbor[icon]',
    '[base][select]overlay=21:78[t1]',
    '[t1][command]overlay=526:104[t2]',
    '[t2][rifle]overlay=785:104[t3]',
    '[t3][funnel]overlay=650:315[t4]',
    '[t4][icon]overlay=900:240[t5]',
    '[t5][idle]overlay=35:430[t6]',
    '[t6][boost]overlay=330:430[t7]',
    '[t7][prone]overlay=680:450[out]',
  ].join(';');
  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=0x0B1020:s=1000x650:r=1',
    ...sources.flatMap((source) => ['-i', source]),
    '-filter_complex', filter, '-map', '[out]', '-frames:v', '1', options.output,
  ]);
  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', sources[0],
    '-frames:v', '1', '-vf', 'format=rgb24', options.selectionOverview,
  ]);
  console.log(`built ${options.output}`);
  console.log(`built ${options.selectionOverview}`);
  console.log('preview type: deterministic engineering composite, not runtime capture');
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
