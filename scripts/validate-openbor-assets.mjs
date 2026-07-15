#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_DATA = 'workplace/extracted/data';
const EXPECTED_INDEX_0 = '#FC00FF';

function usage() {
  console.log(`Usage:
  node workplace/scripts/validate-openbor-assets.mjs [--data PATH] [--strict]

Options:
  --data PATH  OpenBOR data directory or one .txt model/level file
               (default: ${DEFAULT_DATA})
  --strict     Treat palette-index-0 mismatches and an empty scan as errors
  --help       Show this help

Checks:
  - every .gif/.png reference exists with exactly matching path case;
  - every GIF is a valid indexed image;
  - every GIF image frame uses ${EXPECTED_INDEX_0} at palette index 0.

The GIF Graphic Control Extension transparency flag is reported for information
only. OpenBOR chroma-key assets do not need that flag.`);
}

function parseArgs(argv) {
  const options = { data: DEFAULT_DATA, strict: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }
    if (arg === '--strict') {
      options.strict = true;
      continue;
    }
    if (arg === '--data') {
      if (!argv[i + 1]) throw new Error('--data requires a path');
      options.data = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--data=')) {
      options.data = arg.slice('--data='.length);
      if (!options.data) throw new Error('--data requires a path');
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function listTxtFiles(input) {
  const stat = fs.statSync(input);
  if (stat.isFile()) {
    if (path.extname(input).toLowerCase() !== '.txt') {
      throw new Error(`--data file must be a .txt file: ${input}`);
    }
    return [input];
  }
  if (!stat.isDirectory()) throw new Error(`--data is not a file or directory: ${input}`);

  const files = [];
  const pending = [input];
  while (pending.length) {
    const directory = pending.pop();
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) pending.push(entryPath);
      else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.txt') files.push(entryPath);
    }
  }
  return files.sort();
}

function findDataDirectory(input) {
  let current = fs.statSync(input).isDirectory() ? input : path.dirname(input);
  current = path.resolve(current);
  while (true) {
    if (path.basename(current).toLowerCase() === 'data') return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function extractReferences(txtFile) {
  const references = [];
  const lines = fs.readFileSync(txtFile, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  const imageToken = /[^\s"'#;=,()]+\.(?:gif|png)\b/gi;

  lines.forEach((rawLine, index) => {
    const line = rawLine.split('#', 1)[0];
    for (const match of line.matchAll(imageToken)) {
      const token = match[0]
        .replace(/^[\[<{]+/, '')
        .replace(/[\]}>]+$/, '')
        .replaceAll('\\', '/');
      references.push({ token, txtFile, line: index + 1 });
    }
  });
  return references;
}

function resolveReference(reference, dataDirectory) {
  if (/^data\//i.test(reference.token) && dataDirectory) {
    return path.resolve(path.dirname(dataDirectory), ...reference.token.split('/'));
  }
  return path.resolve(path.dirname(reference.txtFile), ...reference.token.split('/'));
}

// Walk each path component instead of relying on existsSync. This detects case
// mistakes even when the validator itself runs on a case-insensitive filesystem.
function inspectExactCase(absolutePath) {
  const parsed = path.parse(absolutePath);
  const parts = absolutePath.slice(parsed.root.length).split(path.sep).filter(Boolean);
  let current = parsed.root;
  const correctedParts = [];

  for (const part of parts) {
    let entries;
    try {
      entries = fs.readdirSync(current);
    } catch {
      return { status: 'missing', correctedPath: path.join(parsed.root, ...correctedParts, part) };
    }

    if (entries.includes(part)) {
      correctedParts.push(part);
      current = path.join(current, part);
      continue;
    }

    const caseMatches = entries.filter((entry) => entry.toLowerCase() === part.toLowerCase());
    if (caseMatches.length) {
      correctedParts.push(caseMatches[0]);
      return {
        status: 'case-mismatch',
        correctedPath: path.join(parsed.root, ...correctedParts, ...parts.slice(correctedParts.length)),
      };
    }
    return { status: 'missing', correctedPath: path.join(parsed.root, ...correctedParts, part) };
  }

  try {
    if (!fs.statSync(current).isFile()) return { status: 'not-file', correctedPath: current };
  } catch {
    return { status: 'missing', correctedPath: current };
  }
  return { status: 'exact', correctedPath: current };
}

function hexRgb(buffer, offset) {
  return `#${[buffer[offset], buffer[offset + 1], buffer[offset + 2]]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

function skipSubBlocks(buffer, initialOffset) {
  let offset = initialOffset;
  while (true) {
    if (offset >= buffer.length) throw new Error('truncated data sub-block');
    const size = buffer[offset];
    offset += 1;
    if (size === 0) return offset;
    if (offset + size > buffer.length) throw new Error('truncated data sub-block payload');
    offset += size;
  }
}

function inspectGif(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.length < 13) throw new Error('file is shorter than a GIF header');
  const signature = buffer.subarray(0, 6).toString('ascii');
  if (signature !== 'GIF87a' && signature !== 'GIF89a') throw new Error(`invalid GIF signature ${JSON.stringify(signature)}`);

  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  const globalPacked = buffer[10];
  const hasGlobalPalette = Boolean(globalPacked & 0x80);
  const globalPaletteEntries = 2 ** ((globalPacked & 0x07) + 1);
  let offset = 13;
  let globalIndex0 = null;

  if (hasGlobalPalette) {
    const byteLength = globalPaletteEntries * 3;
    if (offset + byteLength > buffer.length) throw new Error('truncated global color table');
    globalIndex0 = hexRgb(buffer, offset);
    offset += byteLength;
  }

  const framePalettes = [];
  let transparencyFlagCount = 0;

  while (offset < buffer.length) {
    const marker = buffer[offset];
    if (marker === 0x3B) break;

    if (marker === 0x21) {
      if (offset + 2 >= buffer.length) throw new Error('truncated extension block');
      const label = buffer[offset + 1];
      if (label === 0xF9) {
        const blockSize = buffer[offset + 2];
        if (blockSize !== 4 || offset + 3 + blockSize >= buffer.length) {
          throw new Error('invalid Graphic Control Extension');
        }
        if (buffer[offset + 3] & 0x01) transparencyFlagCount += 1;
        offset += 3 + blockSize;
        if (buffer[offset] !== 0) throw new Error('Graphic Control Extension has no terminator');
        offset += 1;
      } else {
        offset = skipSubBlocks(buffer, offset + 2);
      }
      continue;
    }

    if (marker === 0x2C) {
      if (offset + 10 > buffer.length) throw new Error('truncated image descriptor');
      const imagePacked = buffer[offset + 9];
      const hasLocalPalette = Boolean(imagePacked & 0x80);
      const localPaletteEntries = 2 ** ((imagePacked & 0x07) + 1);
      offset += 10;

      let index0 = globalIndex0;
      if (hasLocalPalette) {
        const byteLength = localPaletteEntries * 3;
        if (offset + byteLength > buffer.length) throw new Error('truncated local color table');
        index0 = hexRgb(buffer, offset);
        offset += byteLength;
      }
      framePalettes.push(index0);

      if (offset >= buffer.length) throw new Error('missing LZW minimum code size');
      offset = skipSubBlocks(buffer, offset + 1);
      continue;
    }

    throw new Error(`unexpected GIF block marker 0x${marker.toString(16).padStart(2, '0')}`);
  }

  if (!framePalettes.length) throw new Error('GIF contains no image frame');
  return {
    width,
    height,
    indexed: framePalettes.every(Boolean),
    framePalettes,
    transparencyFlagCount,
  };
}

function inspectPng(file) {
  const buffer = fs.readFileSync(file);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) throw new Error('invalid PNG signature or truncated IHDR');
  if (buffer.subarray(12, 16).toString('ascii') !== 'IHDR') throw new Error('PNG has no leading IHDR chunk');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function relativeDisplay(file) {
  const relative = path.relative(process.cwd(), file);
  return relative && !relative.startsWith('..') ? relative : file;
}

function sourceDisplay(reference, occurrences) {
  const extra = occurrences > 1 ? ` (+${occurrences - 1} more reference${occurrences === 2 ? '' : 's'})` : '';
  return `${relativeDisplay(reference.txtFile)}:${reference.line}${extra}`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const input = path.resolve(options.data);
  if (!fs.existsSync(input)) throw new Error(`--data path does not exist: ${options.data}`);

  const txtFiles = listTxtFiles(input);
  const dataDirectory = findDataDirectory(input);
  const allReferences = txtFiles.flatMap(extractReferences);
  const unique = new Map();

  for (const reference of allReferences) {
    const absolutePath = resolveReference(reference, dataDirectory);
    const key = absolutePath;
    const existing = unique.get(key);
    if (existing) existing.occurrences += 1;
    else unique.set(key, { reference, absolutePath, occurrences: 1 });
  }

  const errors = [];
  const warnings = [];
  let gifCount = 0;
  let pngCount = 0;
  let gifTransparencyFlagCount = 0;
  const dimensions = new Map();

  for (const asset of unique.values()) {
    const location = inspectExactCase(asset.absolutePath);
    const source = sourceDisplay(asset.reference, asset.occurrences);
    if (location.status === 'case-mismatch') {
      errors.push(`${source}: path case mismatch: ${asset.reference.token} (disk: ${relativeDisplay(location.correctedPath)})`);
      continue;
    }
    if (location.status !== 'exact') {
      errors.push(`${source}: referenced asset ${location.status === 'not-file' ? 'is not a file' : 'is missing'}: ${asset.reference.token}`);
      continue;
    }

    const extension = path.extname(asset.absolutePath).toLowerCase();
    try {
      if (extension === '.gif') {
        gifCount += 1;
        const result = inspectGif(asset.absolutePath);
        dimensions.set(`${result.width}x${result.height}`, (dimensions.get(`${result.width}x${result.height}`) ?? 0) + 1);
        gifTransparencyFlagCount += result.transparencyFlagCount;
        if (!result.indexed) {
          errors.push(`${source}: GIF frame has no active color table (not a valid indexed asset): ${asset.reference.token}`);
          continue;
        }
        const mismatches = [...new Set(result.framePalettes.filter((colour) => colour !== EXPECTED_INDEX_0))];
        if (mismatches.length) {
          const message = `${source}: GIF palette index 0 is ${mismatches.join('/')} (expected ${EXPECTED_INDEX_0}): ${asset.reference.token}`;
          (options.strict ? errors : warnings).push(message);
        }
      } else {
        pngCount += 1;
        const result = inspectPng(asset.absolutePath);
        dimensions.set(`${result.width}x${result.height}`, (dimensions.get(`${result.width}x${result.height}`) ?? 0) + 1);
      }
    } catch (error) {
      errors.push(`${source}: ${error.message}: ${asset.reference.token}`);
    }
  }

  if (!allReferences.length) {
    const message = `No .gif/.png references found in ${txtFiles.length} TXT file(s)`;
    (options.strict ? errors : warnings).push(message);
  }

  console.log('OpenBOR asset validation');
  console.log(`Input: ${relativeDisplay(input)}`);
  console.log(`Mode: ${options.strict ? 'strict' : 'normal'}`);
  console.log(`TXT files: ${txtFiles.length}`);
  console.log(`Image references: ${allReferences.length} occurrences, ${unique.size} resolved paths`);
  console.log(`Readable assets: ${gifCount} GIF, ${pngCount} PNG`);
  console.log(`GIF transparency flags: ${gifTransparencyFlagCount} (informational only; not required)`);
  if (dimensions.size) {
    const rankedSizes = [...dimensions].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const shownSizes = rankedSizes.slice(0, 20).map(([size, count]) => `${size}=${count}`).join(', ');
    const omitted = rankedSizes.length > 20 ? `, … +${rankedSizes.length - 20} more` : '';
    console.log(`Canvas sizes (${rankedSizes.length} unique; most common first): ${shownSizes}${omitted}`);
  }

  if (warnings.length) {
    console.log(`\nWarnings (${warnings.length}):`);
    warnings.forEach((warning) => console.log(`  WARN ${warning}`));
  }
  if (errors.length) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach((error) => console.log(`  ERROR ${error}`));
  }

  if (errors.length) {
    console.log(`\nFAIL: ${errors.length} error(s), ${warnings.length} warning(s)`);
    process.exitCode = 1;
  } else {
    console.log(`\n${warnings.length ? 'PASS WITH WARNINGS' : 'PASS'}: ${unique.size} referenced asset path(s) checked`);
  }
}

try {
  main();
} catch (error) {
  console.error(`validate-openbor-assets: ${error.message}`);
  process.exitCode = 2;
}
