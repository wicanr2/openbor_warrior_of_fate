#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_BASE = 'workplace/extracted/data';
const DEFAULT_OVERLAY = 'workplace/robot_wof_vertical_slice/overlay/data';
const EXPECTED_INDEX_0 = '#FC00FF';

function usage() {
  console.log(`Validate an OpenBOR replacement overlay against its extracted base.

Usage:
  node scripts/validate-overlay-parity.mjs [options]

Options:
  --base PATH       extracted OpenBOR data directory
                    (default: ${DEFAULT_BASE})
  --overlay PATH    overlay data directory
                    (default: ${DEFAULT_OVERLAY})
  --help, -h        show this help

Checks every regular overlay file for an exact-case counterpart beneath --base.
GIF and PNG canvases must match their counterparts. Every overlay GIF must be
indexed, and palette index 0 of every image frame must be ${EXPECTED_INDEX_0}.`);
}

function parseArgs(argv) {
  const options = { base: DEFAULT_BASE, overlay: DEFAULT_OVERLAY };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      usage();
      process.exit(0);
    }
    if (argument === '--base' || argument === '--overlay') {
      const value = argv[index + 1];
      if (!value) throw new Error(`${argument} requires a path`);
      options[argument.slice(2)] = value;
      index += 1;
      continue;
    }
    if (argument.startsWith('--base=')) {
      options.base = argument.slice('--base='.length);
      if (!options.base) throw new Error('--base requires a path');
      continue;
    }
    if (argument.startsWith('--overlay=')) {
      options.overlay = argument.slice('--overlay='.length);
      if (!options.overlay) throw new Error('--overlay requires a path');
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }

  return {
    base: path.resolve(options.base),
    overlay: path.resolve(options.overlay),
  };
}

function requireDirectory(directory, option) {
  let stat;
  try {
    stat = fs.statSync(directory);
  } catch {
    throw new Error(`${option} does not exist: ${displayPath(directory)}`);
  }
  if (!stat.isDirectory()) {
    throw new Error(`${option} is not a directory: ${displayPath(directory)}`);
  }
}

function displayPath(file) {
  const relative = path.relative(process.cwd(), file);
  return relative && !relative.startsWith('..') ? relative : file;
}

function slashPath(file) {
  return file.split(path.sep).join('/');
}

function listOverlayFiles(root) {
  const files = [];
  const unsupported = [];

  function visit(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolutePath);
      else if (entry.isFile()) files.push(absolutePath);
      else unsupported.push(absolutePath);
    }
  }

  visit(root);
  return { files, unsupported };
}

// Compare every component with readdir results. This catches mistakes even if
// the validator is later run on a case-insensitive filesystem.
function findExactRelativeFile(root, relativePath) {
  const parts = relativePath.split(path.sep).filter(Boolean);
  let current = root;

  for (let index = 0; index < parts.length; index += 1) {
    const wanted = parts[index];
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return { status: 'missing', path: path.join(current, wanted) };
    }

    const exact = entries.find((entry) => entry.name === wanted);
    if (!exact) {
      const caseMatch = entries.find(
        (entry) => entry.name.toLowerCase() === wanted.toLowerCase(),
      );
      if (caseMatch) {
        return {
          status: 'case-mismatch',
          path: path.join(current, caseMatch.name, ...parts.slice(index + 1)),
        };
      }
      return { status: 'missing', path: path.join(current, wanted) };
    }

    current = path.join(current, exact.name);
    const isLast = index === parts.length - 1;
    if (!isLast && !exact.isDirectory()) return { status: 'missing', path: current };
    if (isLast && !exact.isFile()) return { status: 'not-file', path: current };
  }

  return { status: 'exact', path: current };
}

function rgbHex(buffer, offset) {
  if (offset + 3 > buffer.length) throw new Error('truncated color table');
  return `#${[buffer[offset], buffer[offset + 1], buffer[offset + 2]]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

function skipSubBlocks(buffer, initialOffset) {
  let offset = initialOffset;
  while (true) {
    if (offset >= buffer.length) throw new Error('truncated data sub-block');
    const length = buffer[offset];
    offset += 1;
    if (length === 0) return offset;
    if (offset + length > buffer.length) {
      throw new Error('truncated data sub-block payload');
    }
    offset += length;
  }
}

function inspectGif(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.length < 13) throw new Error('file is shorter than a GIF header');
  const signature = buffer.subarray(0, 6).toString('ascii');
  if (signature !== 'GIF87a' && signature !== 'GIF89a') {
    throw new Error(`invalid GIF signature ${JSON.stringify(signature)}`);
  }

  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  if (!width || !height) throw new Error(`invalid GIF canvas ${width}x${height}`);

  const globalPacked = buffer[10];
  const hasGlobalPalette = Boolean(globalPacked & 0x80);
  const globalEntries = 2 ** ((globalPacked & 0x07) + 1);
  let offset = 13;
  let globalIndex0 = null;
  if (hasGlobalPalette) {
    const byteLength = globalEntries * 3;
    if (offset + byteLength > buffer.length) throw new Error('truncated global color table');
    globalIndex0 = rgbHex(buffer, offset);
    offset += byteLength;
  }

  const frameIndex0 = [];
  let foundTrailer = false;
  while (offset < buffer.length) {
    const marker = buffer[offset];
    if (marker === 0x3B) {
      foundTrailer = true;
      break;
    }

    if (marker === 0x21) {
      if (offset + 2 >= buffer.length) throw new Error('truncated extension block');
      const label = buffer[offset + 1];
      if (label === 0xF9) {
        if (buffer[offset + 2] !== 4 || offset + 8 > buffer.length) {
          throw new Error('invalid Graphic Control Extension');
        }
        if (buffer[offset + 7] !== 0) {
          throw new Error('Graphic Control Extension has no terminator');
        }
        offset += 8;
      } else {
        offset = skipSubBlocks(buffer, offset + 2);
      }
      continue;
    }

    if (marker === 0x2C) {
      if (offset + 10 > buffer.length) throw new Error('truncated image descriptor');
      const packed = buffer[offset + 9];
      const hasLocalPalette = Boolean(packed & 0x80);
      const localEntries = 2 ** ((packed & 0x07) + 1);
      offset += 10;

      let index0 = globalIndex0;
      if (hasLocalPalette) {
        const byteLength = localEntries * 3;
        if (offset + byteLength > buffer.length) throw new Error('truncated local color table');
        index0 = rgbHex(buffer, offset);
        offset += byteLength;
      }
      frameIndex0.push(index0);

      if (offset >= buffer.length) throw new Error('missing LZW minimum code size');
      offset = skipSubBlocks(buffer, offset + 1);
      continue;
    }

    throw new Error(
      `unexpected GIF block marker 0x${marker.toString(16).padStart(2, '0')}`,
    );
  }

  if (!foundTrailer) throw new Error('GIF trailer is missing');
  if (!frameIndex0.length) throw new Error('GIF contains no image frame');
  return {
    type: 'GIF',
    width,
    height,
    indexed: frameIndex0.every((color) => color !== null),
    frameIndex0,
  };
}

function inspectPng(file) {
  const buffer = fs.readFileSync(file);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(signature)) {
    throw new Error('invalid PNG signature or truncated IHDR');
  }
  if (buffer.readUInt32BE(8) !== 13 || buffer.subarray(12, 16).toString('ascii') !== 'IHDR') {
    throw new Error('PNG has no valid leading IHDR chunk');
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (!width || !height) throw new Error(`invalid PNG canvas ${width}x${height}`);
  return { type: 'PNG', width, height };
}

function inspectImage(file, extension) {
  if (extension === '.gif') return inspectGif(file);
  if (extension === '.png') return inspectPng(file);
  return null;
}

function validate() {
  const options = parseArgs(process.argv.slice(2));
  requireDirectory(options.base, '--base');
  requireDirectory(options.overlay, '--overlay');

  const { files, unsupported } = listOverlayFiles(options.overlay);
  const errors = unsupported.map(
    (file) => `${slashPath(path.relative(options.overlay, file))}: overlay entry is not a regular file`,
  );
  if (!files.length) errors.push('overlay contains no regular files');
  let gifCount = 0;
  let pngCount = 0;
  let otherCount = 0;

  for (const overlayFile of files) {
    const relative = path.relative(options.overlay, overlayFile);
    const label = slashPath(relative);
    const counterpart = findExactRelativeFile(options.base, relative);
    if (counterpart.status === 'case-mismatch') {
      errors.push(
        `${label}: base path case mismatch (disk: ${slashPath(path.relative(options.base, counterpart.path))})`,
      );
      continue;
    }
    if (counterpart.status !== 'exact') {
      errors.push(`${label}: base counterpart ${counterpart.status === 'not-file' ? 'is not a file' : 'is missing'}`);
      continue;
    }

    const extension = path.extname(overlayFile).toLowerCase();
    if (extension !== '.gif' && extension !== '.png') {
      otherCount += 1;
      continue;
    }

    try {
      const overlayImage = inspectImage(overlayFile, extension);
      const baseImage = inspectImage(counterpart.path, extension);
      if (extension === '.gif') gifCount += 1;
      else pngCount += 1;

      if (
        overlayImage.width !== baseImage.width
        || overlayImage.height !== baseImage.height
      ) {
        errors.push(
          `${label}: canvas ${overlayImage.width}x${overlayImage.height} does not match base `
          + `${baseImage.width}x${baseImage.height}`,
        );
      }

      if (extension === '.gif') {
        if (!overlayImage.indexed) {
          errors.push(`${label}: overlay GIF has an image frame without a color table`);
        }
        overlayImage.frameIndex0.forEach((color, frame) => {
          if (color !== EXPECTED_INDEX_0) {
            errors.push(
              `${label}: frame ${frame + 1} palette index 0 is ${color ?? 'unavailable'}, expected ${EXPECTED_INDEX_0}`,
            );
          }
        });
      }
    } catch (error) {
      errors.push(`${label}: ${error.message}`);
    }
  }

  console.log(`Base:    ${displayPath(options.base)}`);
  console.log(`Overlay: ${displayPath(options.overlay)}`);
  console.log(
    `Scanned ${files.length} file(s): ${gifCount} GIF, ${pngCount} PNG, ${otherCount} other.`,
  );

  if (errors.length) {
    console.error(`FAILED: ${errors.length} error(s)`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `PASS: every overlay file has an exact-case base counterpart; image canvases and GIF palette index 0 are valid.`,
  );
}

try {
  validate();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 2;
}
