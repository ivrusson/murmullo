# AGENTS.md

Notes for coding agents working on Murmullo. Product and setup docs live in [`README.md`](README.md),
[`spec/START-HERE.md`](spec/START-HERE.md) and [`docs/`](docs/); the whys behind past choices are in
[`spec/DECISIONS.md`](spec/DECISIONS.md).

## Work tracking

Work items live in Kaneo, project `MUR`, at https://issues.ivrusson.online. Use the `kaneo` MCP
tools. Reference items as `MUR-N` in branches, commits and PRs.

- GitHub Issues stay open as the public inbox: people outside the project report bugs there with
  the issue template. When one is accepted, create a `MUR` item that links to the GitHub issue, and
  close the GitHub issue when the fix ships.
- The README's "What's next" list is the public summary of the roadmap; the `roadmap` items in
  Kaneo are the source of truth. Keep both in step when one changes.
- Before writing to Kaneo (new item, comment, state change), show the draft and ask.
