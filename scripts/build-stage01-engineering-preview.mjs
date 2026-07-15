#!/usr/bin/env node

import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');

function usage() {
  return `Build an overview-only 480x276 Stage01 engineering composite.

Usage:
  node scripts/build-stage01-engineering-preview.mjs [options]

Options:
  --workspace PATH  private project workspace containing generated overlay inputs
                    (default: repository root)
  --output PATH     public PNG output
                    (default: research/previews/stage01-engineering-composite.png)
  --help            show this help

The result is a deterministic composite of generated artwork, not an OpenBOR
runtime capture. It contains no extracted base sprite or third-party concept image.`;
}

function parseArgs(argv) {
  const options = {
    workspace: REPO_ROOT,
    output: join(REPO_ROOT, 'research/previews/stage01-engineering-composite.png'),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') {
      console.log(usage());
      process.exit(0);
    }
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
  const input = (path) => join(options.workspace, path);
  const sources = [
    'private_assets/robot_wof/stage01/environment/stage01-forest-outpost-panorama-v1.png',
    'workplace/robot_wof_vertical_slice/overlay/data/chars/zhangfei/idle00.gif',
    'workplace/robot_wof_vertical_slice/overlay/data/chars/army/1/a1.gif',
    'workplace/robot_wof_vertical_slice/overlay/data/chars/boss/lidian/a4.GIF',
    'workplace/robot_wof_vertical_slice/overlay/data/chars/misc/box/1/baoxiang.gif',
    'workplace/robot_wof_vertical_slice/overlay/data/chars/army/1/walk001.gif',
    'workplace/robot_wof_vertical_slice/overlay/data/profiles/zhangfei.GIF',
  ].map(input);
  for (const source of sources) {
    if (!existsSync(source)) throw new Error(`Missing private generated input: ${source}`);
  }
  mkdirSync(dirname(options.output), { recursive: true });
  const filter = [
    '[0:v]crop=1259:724:900:0,scale=480:276:flags=neighbor[bg]',
    '[1:v]colorkey=0xFC00FF:0.01:0[mazinger]',
    '[2:v]colorkey=0xFC00FF:0.01:0[grunt_attack]',
    '[3:v]colorkey=0xFC00FF:0.01:0[lidian]',
    '[4:v]colorkey=0xFC00FF:0.01:0[supply]',
    '[5:v]colorkey=0xFC00FF:0.01:0[grunt_walk]',
    '[6:v]colorkey=0xFC00FF:0.01:0[profile]',
    '[bg][grunt_attack]overlay=177:151[t1]',
    '[t1][mazinger]overlay=26:135[t2]',
    '[t2][lidian]overlay=293:121[t3]',
    '[t3][supply]overlay=237:197[t4]',
    '[t4][grunt_walk]overlay=285:169[t5]',
    '[t5][profile]overlay=10:8,' +
      'drawbox=x=50:y=14:w=165:h=14:color=black@0.85:t=fill,' +
      'drawbox=x=53:y=17:w=150:h=8:color=0x40D060@1:t=fill,' +
      'drawbox=x=50:y=31:w=130:h=9:color=black@0.85:t=fill,' +
      'drawbox=x=53:y=34:w=112:h=3:color=0x50C8FF@1:t=fill[out]',
  ].join(';');
  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    ...sources.flatMap((source) => ['-i', source]),
    '-filter_complex', filter,
    '-map', '[out]', '-frames:v', '1', options.output,
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
