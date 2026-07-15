#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  CANONICAL_ALLOWSELECT,
  EXCLUDED_PLAYER_MODELS,
  NU_FUNNEL_MODEL_PATH,
  NU_MODEL_PATH,
  ROSTER,
  patchOverlay,
} from './patch-six-player-select-overlay.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hash(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function write(path, content) {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, content);
}

function main() {
  const root = mkdtempSync(join(tmpdir(), 'openbor-six-select-test-'));
  const dataDir = join(root, 'base-data');
  const outputDir = join(root, 'overlay');
  try {
    const modelLines = [
      'colourselect\t1',
      '# byte-preservation probe: \xff',
      'Load\tguanyu\tdata/chars/guanyu/guanyu.txt',
      'Load\tzhangfei\tdata/chars/zhangfei/zhangfei.txt',
      'Load\tzhaoyun\tdata/chars/zhaoyun/zhaoyun.txt',
      'Load\thuangzhong\tdata/chars/huangzhong/huangzhong.txt',
      'Load\tweiyan\tdata/chars/weiyan/weiyan.txt',
      'load\ttiefeifp\tdata/chars/army/5/tiefeifp.txt',
      'load\txiahoudunp\tdata/chars/boss/xiahoudun/xiahoudunp.txt',
    ];
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(dataDir, 'models.txt'), Buffer.from(`${modelLines.join('\r\n')}\r\n`, 'latin1'));
    write(join(dataDir, 'levels/select.txt'), 'music data/music/menu.bor 1\r\nBACKGROUND data/bgs/select.gif\r\n');
    for (const name of ROSTER) {
      const path = name === 'nu_gundam'
        ? NU_MODEL_PATH
        : `data/chars/${name}/${name}.txt`;
      write(join(dataDir, path.slice(5)), `type player\nname ${name}\n`);
    }
    write(join(dataDir, NU_FUNNEL_MODEL_PATH.slice(5)), 'type none\nname nu_funnel_shot\n');

    const first = patchOverlay({ dataDir, outputDir, requireClosure: true }).manifest;
    assert(first.validation.runtimeClosureComplete, 'first patch did not close the model TXT roster');
    assert(first.files.models.changed && first.files.select.changed, 'first patch did not write both files');
    assert(first.validation.excludedCandidates.length === 0, 'excluded candidates remained in allowselect');
    assert(
      EXCLUDED_PLAYER_MODELS.every((name) => first.validation.excludedModelsRemainLoaded.includes(name)),
      'test did not prove loaded player-style enemies can remain loaded but unselectable',
    );
    const modelsPath = join(outputDir, 'data/models.txt');
    const selectPath = join(outputDir, 'data/levels/select.txt');
    assert(readFileSync(modelsPath).includes(0xff), 'legacy non-UTF8 byte was not preserved');
    assert(readFileSync(selectPath, 'ascii').includes(CANONICAL_ALLOWSELECT), 'canonical allowselect missing');
    const firstHashes = [hash(modelsPath), hash(selectPath)];

    const second = patchOverlay({ dataDir, outputDir, requireClosure: true }).manifest;
    assert(!second.files.models.changed && !second.files.select.changed, 'second patch was not idempotent');
    assert(hash(modelsPath) === firstHashes[0] && hash(selectPath) === firstHashes[1], 'second patch changed bytes');

    writeFileSync(selectPath, Buffer.concat([
      readFileSync(selectPath),
      Buffer.from('ALLOWSELECT tiefeifp xiahoudunp\r\n', 'ascii'),
    ]));
    writeFileSync(modelsPath, Buffer.concat([
      readFileSync(modelsPath),
      Buffer.from('know nu_gundam data/chars/nu_gundam/wrong.txt\r\n', 'ascii'),
    ]));
    const repaired = patchOverlay({ dataDir, outputDir, requireClosure: true }).manifest;
    assert(repaired.validation.runtimeClosureComplete, 'duplicate/conflicting rows were not repaired');
    const allowCount = readFileSync(selectPath, 'latin1').split(/\r?\n/)
      .filter((line) => /^\s*allowselect\b/i.test(line)).length;
    const nuCount = readFileSync(modelsPath, 'latin1').split(/\r?\n/)
      .filter((line) => /^\s*(load|know)\s+nu_gundam\b/i.test(line)).length;
    assert(allowCount === 1 && nuCount === 1, 'repair left duplicate active rows');
    const funnelCount = readFileSync(modelsPath, 'latin1').split(/\r?\n/)
      .filter((line) => /^\s*(load|know)\s+nu_funnel_shot\b/i.test(line)).length;
    assert(funnelCount === 1, 'repair did not leave exactly one Fin Funnel proxy registration');

    const checked = patchOverlay({ dataDir, outputDir, check: true, requireClosure: true }).manifest;
    assert(checked.validation.runtimeClosureComplete, 'check mode rejected valid output');

    unlinkSync(join(dataDir, NU_MODEL_PATH.slice(5)));
    let strictFailed = false;
    try {
      patchOverlay({ dataDir, outputDir, check: true, requireClosure: true });
    } catch (error) {
      strictFailed = /closure is incomplete/.test(error.message);
    }
    assert(strictFailed, 'strict closure check accepted a missing nu_gundam model file');

    console.log(JSON.stringify({
      status: 'PASS',
      assertions: 13,
      roster: ROSTER,
      allowselect: CANONICAL_ALLOWSELECT,
      deterministicHashes: { models: firstHashes[0], select: firstHashes[1] },
    }, null, 2));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
}
