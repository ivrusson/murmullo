# Install from the repository

Signed macOS / Windows / Linux packages are not the default path yet. Until those builds ship, clone
this repo and run the **guided installer**. It checks the toolchain, offers to install what is
missing, then runs `pnpm install`.

Dictation (global hotkey + paste into the focused app) is **macOS 12+**. Windows and Linux can
compile the app for development; paste is still pending.

## Guided installer

### macOS

Double-click `install.command`, or in a terminal:

```bash
git clone https://github.com/ivrusson/murmullo.git
cd murmullo
./install.sh
```

The script speaks Spanish if `LANG` starts with `es`, otherwise English. Force it with `--lang es`
or `--lang en`.

### Windows

Double-click `install.cmd`, or:

```powershell
git clone https://github.com/ivrusson/murmullo.git
cd murmullo
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

### Linux

```bash
git clone https://github.com/ivrusson/murmullo.git
cd murmullo
./install.sh
```

On Debian/Ubuntu the script can install Tauri system libraries (`webkit2gtk`, GTK, and build tools)
with `sudo`.

### Flags

| Flag                          | What it does                                                          |
| ----------------------------- | --------------------------------------------------------------------- |
| `--yes` / `-Yes`              | Accept defaults: install missing tools, do not compile, do not launch |
| `--dev` / `-Dev`              | Start `pnpm tauri dev` when setup finishes                            |
| `--build` / `-Build`          | Compile a release bundle (`pnpm tauri build`)                         |
| `--dry-run` / `-DryRun`       | Only print what is present / missing                                  |
| `--lang es` or `en` / `-Lang` | Force installer language                                              |
| `--dir PATH` / `-Dir`         | Clone destination if you are not already in the repo                  |

`--yes` is safe for a fresh machine: it will not start a GUI or spend twenty minutes compiling
unless you also pass `--dev` or `--build`.

## What it installs (if missing)

- **macOS:** Xcode Command Line Tools, optional Homebrew, Node.js 18+, Rust (rustup stable), pnpm
- **Linux:** git, Node.js, Rust, pnpm, and Tauri GTK/WebKit packages when the distro is known
- **Windows:** Git, Node.js LTS, Rust, pnpm via `winget`

It does **not** download Parakeet or nemo-speech. That happens in the app, on the Runtimes page,
with SHA-256 checks against the NVIDIA release.

## After the installer

```bash
cd murmullo
pnpm tauri dev
```

Then inside Murmullo:

1. **Permissions** — microphone (capture), Input Monitoring (global shortcut while another app is
   focused), Accessibility (paste). On a `tauri dev` binary, grant the permissions to that binary,
   not only to a future `.app`.
2. **Runtimes** — Install and start. First run downloads Parakeet Q8 (~714 MB) and starts
   `nemo-speech serve` on localhost.
3. **Dictate** — hold `⌘ ⌥ T` (default, configurable in Settings), speak, release.

Optional: install [Ollama](https://ollama.com) if you want an LLM rewrite on top of the dictionary.
Dictation already pastes STT + dictionary when the LLM is down.

## Manual toolchain

If you prefer not to use the assistant:

| Tool      | Version | Notes                                      |
| --------- | ------- | ------------------------------------------ |
| macOS     | 12+     | Required for paste                         |
| Node.js   | 18+     | 20 is what CI uses as well                 |
| pnpm      | latest  | `corepack enable` or `npm install -g pnpm` |
| Rust      | stable  | [rustup](https://rustup.rs)                |
| Xcode CLT | current | `xcode-select --install`                   |

```bash
pnpm install
pnpm tauri dev
```

Release compile (slow the first time):

```bash
pnpm tauri build
```

Artifacts land in `src-tauri/target/release/bundle/`.

## Troubleshooting

**Double-click does nothing, or macOS says the file cannot be opened.** In Terminal, from the repo:
`chmod +x install.sh install.command && ./install.sh`. If Gatekeeper quarantined a GitHub ZIP:
`xattr -cr .`

**`xcode-select` dialog never finishes.** Install the tools from the macOS window, then press Enter
in the installer. `cc --version` should print a clang version.

**`rustc` not found after rustup.** Open a new terminal, or run `source "$HOME/.cargo/env"`.

**Hotkey does nothing while Slack/Cursor is focused.** Input Monitoring is off for this binary. Open
Permissions in Murmullo and grant it. Dev and release binaries are different; each needs its own
grant.

**Text stays on the clipboard.** Accessibility is off. Same Permissions page.

**STT never becomes ready.** Open Runtimes, use Install and start, wait for the ~714 MB GGUF. If the
NVIDIA VERSION manifest is unreachable, Murmullo falls back to a pinned `nemo-speech` 0.1.0 archive.

**Windows / Linux paste.** Not implemented. The overlay and workstation still run so the UI can be
developed; insertion into the focused field is macOS-only for now.

**`pnpm tauri build` fails on Windows.** Install Visual Studio Build Tools with the “Desktop
development with C++” workload, then retry.

**`pnpm tauri build` fails on Linux.** Install the WebKit/GTK packages listed in
[Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/).

More architecture: [spec/REWRITE.md](../spec/REWRITE.md). Why the wrapper looks this way:
[spec/DECISIONS.md](../spec/DECISIONS.md).
