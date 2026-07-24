#!/usr/bin/env node
// Validate the existing private army-family overlay as medium OpenBOR sprites.
// No artwork is stored in this public repository.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { verifyGif } from './build-mazinger-p0-prototype.mjs';

const av = process.argv.slice(2);
const root = resolve(av[av.indexOf('--overlay') + 1] || '');
const replacementRoot = resolve(av[av.indexOf('--replacement-root') + 1] || '');
const manifestPath = resolve(av[av.indexOf('--manifest') + 1] || join(root, '..', 'ARMY-MEDIUM-MANIFEST.json'));
if (!root || !existsSync(root)) throw new Error('Usage: --overlay PRIVATE_ARMY_DIR [--manifest OUTPUT_JSON]');
function files(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(join(dir, e.name)) : /\.(gif|GIF)$/.test(e.name) ? [join(dir, e.name)] : []); }
function canvas(path) { const b = readFileSync(path); if (b.toString('ascii', 0, 6) !== 'GIF89a' && b.toString('ascii', 0, 6) !== 'GIF87a') throw new Error(`Not GIF: ${path}`); return [b.readUInt16LE(6), b.readUInt16LE(8)]; }
const entries = files(root).sort().map(path => { let [width, height] = canvas(path); let verifyPath = path; let replacement = false; if (width > 220 || height > 160) { const candidate = replacementRoot ? join(replacementRoot, relative(root, path)) : ''; if (!candidate || !existsSync(candidate)) throw new Error(`Not medium canvas ${relative(root, path)}: ${width}x${height}`); [width, height] = canvas(candidate); verifyPath = candidate; replacement = true; } if (width < 1 || height < 1 || width > 220 || height > 160) throw new Error(`Not medium canvas ${relative(root, path)}: ${width}x${height}`); const verification = verifyGif(verifyPath, width, height); return { path: relative(root, path), canvas: [width, height], replacement, verification }; });
const manifest = { schemaVersion: 1, status: 'medium-engineering-coverage', productionReady: false, modelCount: 10, gifCount: entries.length, canvasBounds: { maxWidth: 220, maxHeight: 160 }, source: 'private assets/enemies/army-family-p0-v1/data/chars/army', replacementRoot: replacementRoot || null, files: entries, deferred: ['distinct model art', 'model-specific BBox/attack-box review', 'runtime gameplay QA'] };
mkdirSync(dirname(manifestPath), { recursive: true }); writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`); console.log(`Army medium validation PASS: ${entries.length} GIFs; manifest ${manifestPath}`);
