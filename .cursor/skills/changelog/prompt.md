# Unreleased draft rules

You are drafting Murmullo's `CHANGELOG.md` Unreleased section.

Output **only** markdown starting with `## [Unreleased]` and ending when the bullets finish. No
preamble, no code fences, no next version heading.

## Format

Keep a Changelog, English, user-facing. Optional one-line lede under the heading, then only the
groups that have items:

### Added

### Changed

### Fixed

### Removed

Each bullet is one concrete change and the reason it matters. Do not paste raw commit subjects. Do
not list file paths unless the path is the feature (for example `crash.html`).

## Constraints

- Merge and keep accurate bullets already in Unreleased.
- Ignore noise: formatting-only, lockfile-only, generated files, "wip".
- Include contributor-facing release tooling if it changes `pnpm release` / `release:dry`.
- Product is beta: do not mention 1.0.0.
- Do not mention nemo-speech PINNED_VERSION unless that pin actually changed (it must not).
- Do not invent version numbers or dates in this draft. That happens at bump time.
