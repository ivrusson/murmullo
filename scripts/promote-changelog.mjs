import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.argv[2];
const dryRun = process.env.RELEASE_DRY_RUN === '1';

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('usage: promote-changelog.mjs <semver>');
  process.exit(1);
}

const changelogPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../CHANGELOG.md'
);
const text = fs.readFileSync(changelogPath, 'utf8');

if (!text.includes('## [Unreleased]')) {
  console.error('CHANGELOG.md is missing ## [Unreleased]');
  process.exit(1);
}

if (text.includes(`## [${version}]`)) {
  console.log(`CHANGELOG already has ${version}`);
  process.exit(0);
}

const date = new Date().toISOString().slice(0, 10);
const next = text.replace(
  '## [Unreleased]\n',
  `## [Unreleased]\n\n## [${version}] - ${date}\n`
);

if (dryRun) {
  console.log(`[dry-run] would promote Unreleased → [${version}] - ${date}`);
  process.exit(0);
}

fs.writeFileSync(changelogPath, next);
console.log(`CHANGELOG: Unreleased → [${version}] - ${date}`);
