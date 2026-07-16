#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const validator = path.join(scriptDirectory, 'validate-openbor-assets.mjs');
const TARGETS = [
  'chars/guanyu/guanyu.txt',
  'chars/zhangfei/zhangfei.txt',
  'chars/zhaoyun/zhaoyun.txt',
  'chars/huangzhong/huangzhong.txt',
  'chars/weiyan/weiyan.txt',
  'chars/nu_gundam/nu_gundam.txt',
  'levels/select.txt',
  'levels/NewWof/1/01.txt',
  'chars/army/1/bing.txt',
];

function usage() {
  console.log('Usage: node scripts/validate-super-robot-integration.mjs --stage /tmp/robot-wof-super-robot-stage');
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--help' || args[0] === '-h') { usage(); return; }
  if (args.length !== 2 || args[0] !== '--stage') throw new Error('--stage PATH is required');
  const stage = path.resolve(args[1]);
  const data = path.join(stage, 'data');
  if (!fs.existsSync(data)) throw new Error(`Missing stage data directory: ${data}`);
  const selectText = fs.readFileSync(path.join(data, 'levels', 'select.txt'), 'latin1');
  for (const player of ['guanyu', 'zhangfei', 'zhaoyun', 'huangzhong', 'weiyan', 'nu_gundam']) {
    if (!new RegExp(`\\ballowselect\\b[^\\n]*\\b${player}\\b`, 'i').test(selectText)) {
      throw new Error(`select.txt does not allow ${player}`);
    }
  }
  for (const target of TARGETS) {
    const input = path.join(data, target);
    const result = spawnSync(process.execPath, [validator, '--data', input, '--strict'], { encoding: 'utf8' });
    if (result.status !== 0) {
      process.stderr.write(result.stdout);
      process.stderr.write(result.stderr);
      throw new Error(`Target asset gate failed: ${target}`);
    }
    const line = result.stdout.split(/\r?\n/).find((value) => value.startsWith('PASS:')) ?? 'PASS';
    console.log(`${target}: ${line}`);
  }
  console.log(`PASS: Super Robot integration target gate passed (${TARGETS.length} targets)`);
}

try { main(); } catch (error) { console.error(`ERROR: ${error.message}`); process.exitCode = 1; }
