#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const targets = [];

function collectMarkdownFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectMarkdownFiles(full);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      targets.push(full);
    }
  }
}

function shouldSkip(link) {
  return (
    !link ||
    link.startsWith('#') ||
    /^[a-z]+:/i.test(link) ||
    link.startsWith('//') ||
    link.startsWith('data:')
  );
}

function resolveLink(baseFile, link) {
  const noAnchor = link.split('#')[0];
  if (!noAnchor || shouldSkip(noAnchor)) return null;
  if (/^[a-z]+:/i.test(noAnchor)) return null;
  return path.resolve(path.dirname(baseFile), noAnchor);
}

collectMarkdownFiles(ROOT);

const problems = [];
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;

for (const file of targets) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(linkPattern)) {
    const rawLink = match[1].trim();
    if (shouldSkip(rawLink)) continue;
    const resolved = resolveLink(file, rawLink);
    if (!resolved) continue;
    if (!fs.existsSync(resolved)) {
      problems.push({
        file: path.relative(ROOT, file),
        link: rawLink,
        resolved: path.relative(ROOT, resolved),
      });
    }
  }
}

if (problems.length) {
  for (const problem of problems) {
    console.error(`${problem.file}: missing link target ${problem.link} -> ${problem.resolved}`);
  }
  process.exitCode = 1;
  console.error(`\n${problems.length} broken markdown link(s) found.`);
} else {
  console.log(`Validated markdown links in ${targets.length} file(s) under ${ROOT}.`);
}
