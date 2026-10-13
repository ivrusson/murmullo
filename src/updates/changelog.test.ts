import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compareVersions,
  parseChangelog,
  releaseFor,
  releasesBetween,
} from './changelog.ts';

const SAMPLE = `# Changelog

Intro text that is not a release.

## [Unreleased]

### Added

- Draft that must not show up.

## [0.9.0] - 2026-11-01

### Added

- A long item that wraps
  onto a second line.
- Short one.

### Fixed

- Something broke and now it does not.

## [0.8.2] - 2026-10-09

### Fixed

- Settings and crash reports show the same version as the release.

## [0.8.1] - 2026-10-09

### Changed

- Floating bar is draggable.

[0.9.0]: https://example.com/compare
`;

test('versions compare numerically, not as text', () => {
  assert.equal(compareVersions('0.10.0', '0.9.9'), 1);
  assert.equal(compareVersions('v0.8.2', '0.8.2'), 0);
  assert.equal(compareVersions('0.8.1', '0.8.2'), -1);
});

test('parses releases, groups and wrapped items; skips Unreleased', () => {
  const releases = parseChangelog(SAMPLE);
  assert.deepEqual(
    releases.map(r => r.version),
    ['0.9.0', '0.8.2', '0.8.1']
  );
  const [latest] = releases;
  assert.equal(latest.date, '2026-11-01');
  assert.deepEqual(
    latest.groups.map(g => g.title),
    ['Added', 'Fixed']
  );
  assert.deepEqual(latest.groups[0].items, [
    'A long item that wraps onto a second line.',
    'Short one.',
  ]);
});

test('link reference footers do not become items', () => {
  const releases = parseChangelog(SAMPLE);
  assert.equal(releases[releases.length - 1]?.groups[0].items.length, 1);
});

test('releasesBetween returns what an update would bring, newest first', () => {
  const releases = parseChangelog(SAMPLE);
  assert.deepEqual(
    releasesBetween(releases, '0.8.1', '0.9.0').map(r => r.version),
    ['0.9.0', '0.8.2']
  );
  assert.deepEqual(releasesBetween(releases, '0.9.0', '0.9.0'), []);
});

test('releaseFor finds the notes of one version', () => {
  const releases = parseChangelog(SAMPLE);
  assert.equal(releaseFor(releases, '0.8.2')?.groups[0].title, 'Fixed');
  assert.equal(releaseFor(releases, '9.9.9'), undefined);
});

test('empty or unrelated text gives no releases', () => {
  assert.deepEqual(parseChangelog(''), []);
  assert.deepEqual(parseChangelog('# Title\n\njust prose'), []);
});
