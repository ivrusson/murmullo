export interface ChangelogGroup {
  title: string;
  items: string[];
}

export interface ChangelogRelease {
  version: string;
  date: string | null;
  groups: ChangelogGroup[];
}

const RELEASE_HEADING = /^##\s+\[(\d+\.\d+\.\d+)\](?:\s+-\s+(\S+))?/;
const GROUP_HEADING = /^###\s+(.+?)\s*$/;
const ITEM_START = /^[-*]\s+(.*)$/;

function parts(version: string): [number, number, number] {
  const [major = 0, minor = 0, patch = 0] = version
    .replace(/^v/, '')
    .split('.')
    .map(part => Number.parseInt(part, 10) || 0);
  return [major, minor, patch];
}

export function compareVersions(a: string, b: string): number {
  const left = parts(a);
  const right = parts(b);
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;
  }
  return 0;
}

/** Keep-a-Changelog text → releases, newest first as written. `[Unreleased]` is skipped. */
export function parseChangelog(raw: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = [];
  let release: ChangelogRelease | null = null;
  let group: ChangelogGroup | null = null;
  let item: string | null = null;

  const flushItem = () => {
    if (item !== null && group) group.items.push(item.trim());
    item = null;
  };

  for (const line of raw.split(/\r?\n/)) {
    const heading = RELEASE_HEADING.exec(line);
    if (heading) {
      flushItem();
      release = { version: heading[1], date: heading[2] ?? null, groups: [] };
      releases.push(release);
      group = null;
      continue;
    }
    if (line.startsWith('## ')) {
      // [Unreleased] or anything else that is not a numbered release.
      flushItem();
      release = null;
      group = null;
      continue;
    }
    if (!release) continue;

    const groupHeading = GROUP_HEADING.exec(line);
    if (groupHeading) {
      flushItem();
      group = { title: groupHeading[1], items: [] };
      release.groups.push(group);
      continue;
    }

    const start = ITEM_START.exec(line);
    if (start) {
      flushItem();
      if (!group) {
        group = { title: '', items: [] };
        release.groups.push(group);
      }
      item = start[1];
      continue;
    }

    if (item !== null && /^\s+\S/.test(line)) {
      item += ` ${line.trim()}`;
    } else if (line.trim() === '') {
      flushItem();
    }
  }
  flushItem();
  return releases.filter(entry => entry.groups.some(g => g.items.length > 0));
}

/** Releases newer than `current` up to and including `latest`, newest first. */
export function releasesBetween(
  releases: ChangelogRelease[],
  current: string,
  latest: string
): ChangelogRelease[] {
  return releases
    .filter(
      entry =>
        compareVersions(entry.version, current) > 0 &&
        compareVersions(entry.version, latest) <= 0
    )
    .sort((a, b) => compareVersions(b.version, a.version));
}

export function releaseFor(
  releases: ChangelogRelease[],
  version: string
): ChangelogRelease | undefined {
  return releases.find(entry => compareVersions(entry.version, version) === 0);
}
