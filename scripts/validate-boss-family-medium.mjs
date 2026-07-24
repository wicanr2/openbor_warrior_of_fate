#!/usr/bin/env node
// Validate private Boss-family p0 GIFs as medium Boss assets.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { verifyGif } from './build-mazinger-p0-prototype.mjs';
const av=process.argv.slice(2);const root=resolve(av[av.indexOf('--overlay')+1]||'');const manifestPath=resolve(av[av.indexOf('--manifest')+1]||join(root,'BOSS-FAMILY-MEDIUM-MANIFEST.json'));if(!root||!existsSync(root))throw new Error('Usage: --overlay PRIVATE_BOSS_DIR [--manifest OUTPUT_JSON]');
function files(d){return readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(d,e.name)):/\.(gif|GIF)$/.test(e.name)?[join(d,e.name)]:[])}
const entries=files(root).sort().map(path=>{const b=readFileSync(path);if(b.toString('ascii',0,3)!=='GIF')throw new Error(`Not GIF: ${path}`);const w=b.readUInt16LE(6),h=b.readUInt16LE(8);if(w<1||h<1||w>640||h>360)throw new Error(`Not medium Boss canvas ${relative(root,path)} ${w}x${h}`);return {path:relative(root,path),canvas:[w,h],verification:verifyGif(path,w,h)}});
const manifest={schemaVersion:1,status:'medium-engineering-coverage',productionReady:false,modelCount:6,gifCount:entries.length,canvasBounds:{maxWidth:640,maxHeight:360},source:'private assets/bosses/boss-family-p0-v1/data',files:entries,deferred:['model-specific redraw','HUD portraits','projectile/debris FX','attack-box and gameplay QA']};mkdirSync(dirname(manifestPath),{recursive:true});writeFileSync(manifestPath,`${JSON.stringify(manifest,null,2)}\n`);console.log(`Boss family medium validation PASS: ${entries.length} GIFs`);
