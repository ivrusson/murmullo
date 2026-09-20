---
name: changelog
description: >
  Drafts and updates Keep a Changelog Unreleased notes via cursor-agent, then promotes them on a 0.x
  release-it bump. Use when the user asks for a changelog, Unreleased notes, version bump, release
  notes, or pnpm release:dry / release:patch.
---

# Changelog

Murmullo uses **Keep a Changelog** (English, user-facing) plus **release-it**. Do not run
`conventional-changelog`; it overwrites the file.

## Draft Unreleased

Run the script (it calls `cursor-agent -p --mode ask`):

```bash
pnpm changelog
# or apply into CHANGELOG.md:
pnpm changelog:write
```

Then read `CHANGELOG.md` and edit bullets if the draft is noisy.

**Do not** invent git tags. Intermediate `0.x` headings are only for the changelog narrative when
the user asks for a large jump (still below 1.0.0).

## Bump (separate from drafting)

1. Unreleased must already describe the work.
2. `pnpm release:dry` — simulates **0.7.0 → 0.7.1** (patch), promotes Unreleased, skips Tauri build.
3. Real bump: `pnpm release:patch` or `pnpm release:minor`. Never `release:major` while beta.

`scripts/promote-changelog.mjs` turns Unreleased into `## [version] - YYYY-MM-DD`.
`scripts/assert-beta-version.mjs` refuses `1.x`. `scripts/sync-cargo-lock-version.mjs` updates only
the `murmullo` package in `Cargo.lock`.

Version files: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`. `get_app_info`
uses `CARGO_PKG_VERSION` — do not hardcode. **Never** bump `src-tauri/src/runtime/install.rs`
`PINNED_VERSION` (nemo-speech).

## Style

- Sections only as needed: Added, Changed, Fixed, Removed.
- User-visible why, not commit subjects.
- Skip internal chore unless it changes how people release or run the app.
- Stay on `0.x` until the user explicitly wants 1.0.0.

## Script details

See [prompt.md](prompt.md). Implementation:
[scripts/draft-changelog.mjs](scripts/draft-changelog.mjs).
