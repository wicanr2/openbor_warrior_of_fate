#!/usr/bin/env node
// Export all existing OpenBOR icon and HUD-profile GIF assets for documentation.
import fs from 'node:fs';
import path from 'node:path';

const [sourceArgument, destinationArgument] = process.argv.slice(2);
if (!sourceArgument || !destinationArgument) throw new Error('Usage: export-portrait-assets.mjs <extracted-root> <destination>');
const source = path.resolve(sourceArgument);
const destination = path.resolve(destinationArgument);

function copyIconFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) copyIconFiles(absolute);
    else if (entry.isFile() && /^icon.*\.gif$/i.test(entry.name)) copy(absolute);
  }
}
function copy(absolute) {
  const relative = path.relative(source, absolute);
  const output = path.join(destination, relative);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.copyFileSync(absolute, output);
}

copyIconFiles(path.join(source, 'data', 'chars'));
for (const entry of fs.readdirSync(path.join(source, 'data', 'profiles'), { withFileTypes: true })) {
  if (entry.isFile() && /\.gif$/i.test(entry.name)) copy(path.join(source, 'data', 'profiles', entry.name));
}
