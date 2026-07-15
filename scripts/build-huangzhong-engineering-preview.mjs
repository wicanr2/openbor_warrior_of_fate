#!/usr/bin/env node

import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

function usage() {
  return `Build an overview-only 750x430 Huang Zhong P0 engineering preview.

Usage:
  node scripts/build-huangzhong-engineering-preview.mjs [options]

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
    output: join(REPO_ROOT, 'research/previews/huangzhong-p0-engineering-preview.png'),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') { console.log(usage()); process.exit(0); }
    const value = argv[index + 1];
    if (argument === '--workspace' || argument === '--output') {
      if (!value) throw new Error(`${argument} requires a path`);
      options[argument === '--workspace' ? 'workspace' : 'output'] = resolve(value);
      index += 1; continue;
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
    'workplace/robot_wof_vertical_slice/overlay/data/chars/huangzhong/icon.GIF',
    'workplace/robot_wof_vertical_slice/overlay/data/profiles/huangzhong.GIF',
    'workplace/robot_wof_vertical_slice/overlay/data/chars/huangzhong/idle.gif',
    'workplace/robot_wof_vertical_slice/overlay/data/chars/huangzhong/attack7.GIF',
    'workplace/robot_wof_vertical_slice/overlay/data/chars/huangzhong/sp4.GIF',
    'workplace/robot_wof_vertical_slice/overlay/data/chars/huangzhong/fall2.GIF',
    'workplace/robot_wof_vertical_slice/overlay/data/chars/huangzhong/gong/spa4.gif',
    'workplace/robot_wof_vertical_slice/overlay/data/chars/huangzhong/gong/sx3.gif',
  ].map(input);
  for (const source of sources) if (!existsSync(source)) throw new Error(`Missing private generated input: ${source}`);
  mkdirSync(dirname(options.output), { recursive: true });
  const drawText = (text, x, y, size, color = 'white') =>
    `drawtext=fontfile=${FONT}:text='${text}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}`;
  const filter = [
    `[0:v]format=rgba,drawbox=x=0:y=0:w=750:h=430:color=0x0B1724:t=fill,` +
      `drawbox=x=0:y=0:w=750:h=5:color=0x22D3EE:t=fill,` +
      `drawbox=x=18:y=69:w=72:h=118:color=0x142536:t=fill,` +
      `drawbox=x=100:y=69:w=205:h=118:color=0x142536:t=fill,` +
      `drawbox=x=315:y=69:w=417:h=118:color=0x142536:t=fill,` +
      `drawbox=x=18:y=220:w=350:h=118:color=0x142536:t=fill,` +
      `drawbox=x=378:y=220:w=354:h=118:color=0x142536:t=fill,` +
      `drawbox=x=18:y=350:w=714:h=48:color=0x142536:t=fill,` +
      `${drawText('HUANGZHONG P0 ENGINEERING PREVIEW', 20, 15, 24)},` +
      `${drawText('73 GIF + 2 HUD + 22 PROJECTILES + 57 FX', 21, 46, 12, '0xB8C6D5')},` +
      `${drawText('HUD', 38, 72, 11, '0x67E8F9')},` +
      `${drawText('IDLE', 180, 72, 11, '0x67E8F9')},` +
      `${drawText('PHOTON RIFLE', 466, 72, 11, '0x67E8F9')},` +
      `${drawText('MISSILE SPECIAL', 129, 223, 11, '0x67E8F9')},` +
      `${drawText('PRONE / FALL', 501, 223, 11, '0x67E8F9')},` +
      `${drawText('PROJECTILE / IMPACT', 31, 355, 11, '0x67E8F9')},` +
      `${drawText('PALETTE INDEX 0 = #FC00FF  |  OVERVIEW-ONLY', 360, 405, 10, '0x8792A5')}[base]`,
    '[1:v]format=rgba[icon]', '[2:v]format=rgba[profile]',
    '[3:v]format=rgba,colorkey=0xFC00FF:0.01:0[idle]',
    '[4:v]format=rgba,colorkey=0xFC00FF:0.01:0[rifle]',
    '[5:v]format=rgba,colorkey=0xFC00FF:0.01:0[missile]',
    '[6:v]format=rgba,colorkey=0xFC00FF:0.01:0[fall]',
    '[7:v]format=rgba,colorkey=0xFC00FF:0.01:0[impact]',
    '[8:v]format=rgba,colorkey=0xFC00FF:0.01:0[burst]',
    '[base][icon]overlay=19:91[t1]', '[t1][profile]overlay=55:91[t2]',
    '[t2][idle]overlay=108:76[t3]', '[t3][rifle]overlay=390:76[t4]',
    '[t4][missile]overlay=70:223[t5]', '[t5][fall]overlay=430:223[t6]',
    '[t6][impact]overlay=210:353[t7]', '[t7][burst]overlay=340:347[out]',
  ].join(';');
  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=0x0B1724:s=750x430:r=1',
    ...sources.flatMap((source) => ['-i', source]),
    '-filter_complex', filter, '-map', '[out]', '-frames:v', '1', options.output,
  ]);
  console.log(`built ${options.output}`);
  console.log('preview type: deterministic engineering composite, not runtime capture');
}

try { main(); } catch (error) { console.error(`ERROR: ${error.message}`); process.exitCode = 1; }
