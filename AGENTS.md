# AGENTS.md

Notes for coding agents working on Murmullo. Product and setup docs live in
[`README.md`](README.md), [`spec/START-HERE.md`](spec/START-HERE.md) and [`docs/`](docs/); the whys
behind past choices are in [`spec/DECISIONS.md`](spec/DECISIONS.md).

## Documentation map

| Doc                                      | Use it for                                                             |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| [README.md](README.md)                   | Product summary, install, dev commands, public roadmap (“What’s next”) |
| [spec/START-HERE.md](spec/START-HERE.md) | Where to read first in the repo                                        |
| [spec/REWRITE.md](spec/REWRITE.md)       | Architecture: STT pipeline, runtimes, overlay                          |
| [spec/DECISIONS.md](spec/DECISIONS.md)   | Rationale for UI and wrapper design                                    |
| [DESIGN.md](DESIGN.md)                   | Ceramic visual tokens                                                  |
| [docs/USAGE.md](docs/USAGE.md)           | Models, dictionary, Settings                                           |
| [docs/INSTALL.md](docs/INSTALL.md)       | Guided installer from a git clone                                      |

## Development

Requirements: macOS 12+ for dictation, Rust stable, Node.js 18+, pnpm.

```bash
pnpm install
pnpm tauri dev          # full desktop app
pnpm dev                # frontend only
pnpm build
pnpm lint
pnpm type-check
pnpm tauri build        # production compile
```

Rust (Tauri backend):

```bash
cd src-tauri && cargo check
cd src-tauri && cargo test
```

Architecture in one line: Murmullo is a **thin desktop wrapper** around local STT (nemo-speech +
Parakeet) and optional on-device or local LLM correction — not an inference engine. See
[spec/REWRITE.md](spec/REWRITE.md).

## Issues and scope

- **GitHub Issues** are the public place to track bugs and feature requests from outside the project
  (use the issue templates when opening new work).
- The README **“What’s next”** section is the public roadmap summary; keep it aligned when you ship
  or reprioritize visible work.
- Respect **out of scope** in the README (no cloud STT/LLM dependency, no Parakeet fine-tuning,
  etc.) unless the user explicitly expands scope.

## Conventions for changes

- Match existing StyleX + React patterns in `src/` and Rust patterns in `src-tauri/`.
- Prefer small, focused diffs; do not refactor unrelated code.
- User-facing copy is often bilingual (installer follows `LANG`); UI strings may mix Spanish and
  English — follow nearby files.
- Release notes live in [`CHANGELOG.md`](CHANGELOG.md); version bumps use the project’s release
  tooling (`pnpm release` / release-it) when cutting a release.
