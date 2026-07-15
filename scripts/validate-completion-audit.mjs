#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const auditPath = path.join(ROOT, 'research/manifests/completion-audit.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function exists(relativePath) {
  const filePath = relativePath.split('#')[0];
  if (!filePath) return false;
  return fs.existsSync(path.join(ROOT, filePath));
}

const allowedStatuses = new Set([
  'proven',
  'proven-as-documentation',
  'incomplete',
  'false',
]);

const errors = [];

if (!exists('research/manifests/completion-audit.json')) {
  errors.push('missing completion audit manifest');
} else {
  let audit;
  try {
    audit = readJson(auditPath);
  } catch (error) {
    errors.push(`completion audit JSON parse failed: ${error.message}`);
  }

  if (audit) {
    if (!Array.isArray(audit.requirements) || audit.requirements.length === 0) {
      errors.push('completion audit requirements must be a non-empty array');
    } else {
      const ids = new Set();
      for (const requirement of audit.requirements) {
        if (!requirement || typeof requirement !== 'object') {
          errors.push('completion audit contains a non-object requirement');
          continue;
        }
        if (!requirement.id) {
          errors.push('completion audit requirement missing id');
          continue;
        }
        if (ids.has(requirement.id)) {
          errors.push(`duplicate requirement id: ${requirement.id}`);
        }
        ids.add(requirement.id);

        if (!allowedStatuses.has(requirement.status)) {
          errors.push(`unsupported status for ${requirement.id}: ${requirement.status}`);
        }

        if (!Array.isArray(requirement.evidence) || requirement.evidence.length === 0) {
          errors.push(`requirement ${requirement.id} missing evidence list`);
        } else {
          for (const evidence of requirement.evidence) {
            if (!exists(evidence)) {
              errors.push(`requirement ${requirement.id} references missing evidence: ${evidence}`);
            }
          }
        }

        if (!requirement.requirement || typeof requirement.requirement !== 'string') {
          errors.push(`requirement ${requirement.id} missing requirement text`);
        }
        if (!requirement.note || typeof requirement.note !== 'string') {
          errors.push(`requirement ${requirement.id} missing note`);
        }
      }
    }

    if (audit.auditStatus !== 'incomplete') {
      errors.push(`auditStatus should remain incomplete until every requirement is proven, got ${audit.auditStatus}`);
    }
  }
}

if (errors.length) {
  for (const error of errors) {
    console.error(error);
  }
  console.error(`\n${errors.length} completion audit problem(s) found.`);
  process.exitCode = 1;
} else {
  console.log('Completion audit validation PASS.');
}
