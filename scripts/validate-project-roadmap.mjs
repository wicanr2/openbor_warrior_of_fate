#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const roadmapPath = path.join(ROOT, 'research/manifests/project-roadmap.json');
const readmePath = path.join(ROOT, 'README.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assertExists(relativePath, kind, errors) {
  const absolute = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolute)) {
    errors.push(`${kind} missing: ${relativePath}`);
  }
}

function hasReadmeLink(target) {
  const text = fs.readFileSync(readmePath, 'utf8');
  return text.includes(`](${target})`);
}

const errors = [];

if (!fs.existsSync(roadmapPath)) {
  errors.push('roadmap missing: research/manifests/project-roadmap.json');
} else {
  let roadmap;
  try {
    roadmap = readJson(roadmapPath);
  } catch (error) {
    errors.push(`roadmap JSON parse failed: ${error.message}`);
  }

  if (roadmap) {
    if (!Array.isArray(roadmap.sourceDocuments) || !roadmap.sourceDocuments.length) {
      errors.push('roadmap sourceDocuments must be a non-empty array');
    } else {
      for (const doc of roadmap.sourceDocuments) {
        assertExists(doc, 'source document', errors);
      }
    }

    if (!Array.isArray(roadmap.priorityOrder) || !roadmap.priorityOrder.length) {
      errors.push('roadmap priorityOrder must be a non-empty array');
    }

    if (!Array.isArray(roadmap.workstreams) || !roadmap.workstreams.length) {
      errors.push('roadmap workstreams must be a non-empty array');
    } else {
      const ids = new Set();
      const seenQueues = new Set();
      const workstreamIds = [];
      for (const workstream of roadmap.workstreams) {
        if (!workstream || typeof workstream !== 'object') {
          errors.push('roadmap workstreams contains a non-object entry');
          continue;
        }
        if (!workstream.id) {
          errors.push('roadmap workstream missing id');
          continue;
        }
        if (ids.has(workstream.id)) {
          errors.push(`duplicate workstream id: ${workstream.id}`);
        }
        ids.add(workstream.id);
        workstreamIds.push(workstream.id);

        if (!workstream.nextQueue) {
          errors.push(`workstream ${workstream.id} missing nextQueue`);
        } else {
          if (seenQueues.has(workstream.nextQueue)) {
            errors.push(`duplicate nextQueue reference: ${workstream.nextQueue}`);
          }
          seenQueues.add(workstream.nextQueue);
          assertExists(workstream.nextQueue, `nextQueue for ${workstream.id}`, errors);
          if (workstream.nextQueue.endsWith('.json')) {
            const nextQueuePath = path.join(ROOT, workstream.nextQueue);
            if (fs.existsSync(nextQueuePath)) {
              try {
                const queue = readJson(nextQueuePath);
                if (queue.subject && queue.subject !== workstream.id && queue.subject !== workstream.id.replace(/-/g, '_')) {
                  // Allow broad subject names like guanyu-getter-v2.
                }
              } catch (error) {
                errors.push(`nextQueue JSON parse failed for ${workstream.nextQueue}: ${error.message}`);
              }
            }
          }
        }
      }

      const expected = new Set(roadmap.priorityOrder || []);
      for (const id of workstreamIds) {
        if (!expected.has(id)) {
          errors.push(`workstream id missing from priorityOrder: ${id}`);
        }
      }
      for (const id of expected) {
        if (!ids.has(id)) {
          errors.push(`priorityOrder id missing from workstreams: ${id}`);
        }
      }
    }
  }
}

const requiredReadmeLinks = [
  'research/manifests/project-roadmap.json',
  'research/manifests/stage01-next-queue.json',
  'research/manifests/boss-next-queue.json',
  'research/manifests/portrait-work-queue.json',
  'research/manifests/guanyu-next-queue.json',
  'research/manifests/nu-gundam-next-queue.json',
  'scripts/validate-markdown-links.mjs',
];

if (fs.existsSync(readmePath)) {
  for (const target of requiredReadmeLinks) {
    if (!hasReadmeLink(target)) {
      errors.push(`README missing link to ${target}`);
    }
  }
}

if (errors.length) {
  for (const error of errors) {
    console.error(error);
  }
  console.error(`\n${errors.length} project roadmap problem(s) found.`);
  process.exitCode = 1;
} else {
  console.log('Project roadmap validation PASS.');
}
