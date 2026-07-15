#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { basename, relative } from 'node:path';

export function repoRelativeDisplay(root, filePath, fallbackPrefix = 'local-only') {
  const local = relative(root, filePath);
  return local && !local.startsWith('..') ? local.replaceAll('\\', '/') : `${fallbackPrefix}/${basename(filePath)}`;
}

export function assertExistingPaths(specs) {
  for (const spec of specs) {
    if (!existsSync(spec.path)) {
      const label = spec.pathLabel || 'path';
      const display = spec.display ?? spec.path;
      const hint = spec.hint ? ` ${spec.hint}` : '';
      throw new Error(`Missing ${label}: ${display}.${hint}`.trim());
    }
  }
}
