#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const skillDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const write = process.argv.includes('--write');
const sinceArg = flagValue('--since');

function flagValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function repoRoot() {
  const fromGit = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  });
  if (fromGit.status === 0) return fromGit.stdout.trim();
  return path.resolve(skillDir, '../../..');
}

function git(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
  }
  return result.stdout.trim();
}

function lastPublishedVersion(changelog) {
  const match = changelog.match(/^## \[(\d+\.\d+\.\d+)\]/m);
  return match ? match[1] : undefined;
}

function resolveSince(root, changelog, explicit) {
  if (explicit) return explicit;
  const version = lastPublishedVersion(changelog);
  if (!version) return 'HEAD~30';
  const tag = `v${version}`;
  const tagged = spawnSync('git', ['rev-parse', '--verify', `refs/tags/${tag}`], {
    cwd: root,
    encoding: 'utf8',
  });
  if (tagged.status === 0) return tag;
  const introduced = spawnSync(
    'git',
    ['log', '-S', `## [${version}]`, '--format=%H', '--', 'CHANGELOG.md'],
    { cwd: root, encoding: 'utf8' }
  );
  const hashes = introduced.stdout.trim().split('\n').filter(Boolean);
  if (hashes.length > 0) return hashes[hashes.length - 1];
  return 'HEAD~30';
}

function stripFences(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:markdown|md)?\s*([\s\S]*?)\s*```$/i);
  return (fenced ? fenced[1] : trimmed).trim();
}

function extractUnreleased(markdown) {
  const cleaned = stripFences(markdown);
  const start = cleaned.indexOf('## [Unreleased]');
  const body = start === -1 ? cleaned : cleaned.slice(start);
  const next = body.search(/\n## \[(?!Unreleased])/);
  return (next === -1 ? body : body.slice(0, next)).trim() + '\n';
}

function applyUnreleased(changelog, section) {
  const start = changelog.indexOf('## [Unreleased]');
  if (start === -1) {
    throw new Error('CHANGELOG.md is missing ## [Unreleased]');
  }
  const rest = changelog.slice(start);
  const next = rest.search(/\n## \[(?!Unreleased])/);
  const before = changelog.slice(0, start);
  const after = next === -1 ? '' : rest.slice(next);
  return `${before}${section.trim()}\n${after}`;
}

function findAgent() {
  const direct = spawnSync('cursor-agent', ['--version'], { encoding: 'utf8' });
  if (direct.status === 0) return 'cursor-agent';
  const home = path.join(os.homedir(), '.local/bin/cursor-agent');
  if (fs.existsSync(home)) return home;
  throw new Error('cursor-agent not found. Install the Cursor CLI and run `cursor-agent login`.');
}

const root = repoRoot();
const changelogPath = path.join(root, 'CHANGELOG.md');
const promptPath = path.join(skillDir, 'prompt.md');
const changelog = fs.readFileSync(changelogPath, 'utf8');
const since = resolveSince(root, changelog, sinceArg);
const log = git(root, ['log', `${since}..HEAD`, '--pretty=format:%h %s']);
const stat = git(root, ['diff', '--stat', `${since}..HEAD`]);
const contextPath = path.join(os.tmpdir(), `murmullo-changelog-${process.pid}.md`);

fs.writeFileSync(
  contextPath,
  [
    `# Git range`,
    `${since}..HEAD`,
    '',
    '# Commits',
    log || '(none)',
    '',
    '# Diff stat',
    stat || '(none)',
    '',
    '# Current CHANGELOG.md',
    changelog,
  ].join('\n')
);

const prompt = [
  fs.readFileSync(promptPath, 'utf8').trim(),
  '',
  `Read the git context file at ${contextPath} and the current changelog already included in it.`,
  'Reply with only the ## [Unreleased] markdown section.',
].join('\n');

const agent = findAgent();
const result = spawnSync(
  agent,
  [
    '-p',
    '--mode',
    'ask',
    '--trust',
    '--output-format',
    'text',
    '--workspace',
    root,
    prompt,
  ],
  { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, cwd: root }
);

fs.rmSync(contextPath, { force: true });

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || 'cursor-agent failed\n');
  process.exit(result.status ?? 1);
}

const section = extractUnreleased(result.stdout || '');
if (!section.includes('## [Unreleased]')) {
  process.stderr.write('cursor-agent did not return an Unreleased section.\n');
  process.stderr.write(result.stdout || '');
  process.exit(1);
}

if (!write) {
  process.stdout.write(section);
  process.stdout.write('\n');
  process.exit(0);
}

fs.writeFileSync(changelogPath, applyUnreleased(changelog, section));
console.log('Updated CHANGELOG.md ## [Unreleased]');
