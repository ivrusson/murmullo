import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.argv[2];
const dryRun = process.env.RELEASE_DRY_RUN === '1';

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('usage: sync-cargo-lock-version.mjs <semver>');
  process.exit(1);
}

const lockPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src-tauri/Cargo.lock'
);
const text = fs.readFileSync(lockPath, 'utf8');
const next = text.replace(
  /name = "murmullo"\nversion = "[^"]+"/,
  `name = "murmullo"\nversion = "${version}"`
);

if (next === text) {
  console.log(`Cargo.lock murmullo version already ${version} or package block missing`);
  process.exit(0);
}

if (dryRun) {
  console.log(`[dry-run] would set Cargo.lock murmullo version to ${version}`);
  process.exit(0);
}

fs.writeFileSync(lockPath, next);
console.log(`Cargo.lock: murmullo → ${version}`);
