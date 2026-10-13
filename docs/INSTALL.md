# Install from the repository

Signed macOS / Windows / Linux packages are not the default path yet. Until those builds ship, clone
this repo and run the **guided installer**. It checks the toolchain, offers to install what is
missing, sets the checkout to the **latest release**, then runs `pnpm install`.

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
| `--no-launch`                 | Never start the app or ask about it (setup only)                      |
| `--dry-run` / `-DryRun`       | Only print what is present / missing, and which release is latest     |
| `--lang es` or `en` / `-Lang` | Force installer language                                              |
| `--dir PATH` / `-Dir`         | Clone destination if you are not already in the repo                  |
| `--ref REF`                   | Check out this tag or branch instead of the latest release            |
| `--no-pin`                    | Keep the current checkout; do not switch to the latest release        |
| `--update`, `--check`         | Updater modes, see [Updating](#updating)                              |

`--ref`, `--no-pin`, `--update`, `--check` and `--no-launch` are macOS / Linux only for now;
`install.ps1` does not pin a release or update yet.

`--yes` is safe for a fresh machine: it will not start a GUI or spend twenty minutes compiling
unless you also pass `--dev` or `--build`.

## Which version you get

`main` can be ahead of the last release. The installer asks GitHub for the newest stable tag
(`vX.Y.Z`; prerelease tags such as `v1.0.0-beta.1` are skipped) and checks it out in detached HEAD,
so `git status` says `HEAD detached at v0.8.2`. Then it reinstalls on that version. It leaves the
checkout alone when:

- you are on a branch other than `main` (a development checkout),
- tracked files have local changes (it never discards work),
- GitHub cannot be reached (offline); setup continues on the current version.

Pass `--ref v0.8.1` (or a branch) to pick something else, `--no-pin` to keep what you have.

## Updating

```bash
./update.sh            # macOS / Linux — or double-click update.command on a Mac
./update.sh --check    # only look: exit 0 = up to date, 10 = update available
```

The updater compares the installed version with the newest release tag, tells you, and asks. On yes
it:

1. stops Murmullo if it is running from this folder,
2. fetches and checks out the new release (refuses if tracked files have local changes),
3. runs the installer that ships with the new version (toolchain check, `pnpm install`),
4. starts `pnpm tauri dev` again.

### From the app

**Settings → Updates** does the same without a terminal: _Check for updates_ looks up the newest
release, _What's new_ shows the changelog entries you would get, and _Update now_ runs `update.sh`
in the background. The card shows live progress (release download, dependency download, apply,
install, reopen). Murmullo closes itself when the files are about to change and comes back on the
new version. The first launch compiles for a few minutes with no window, so a macOS notification
says so when it starts and another when Murmullo is ready. If something fails before the switch,
nothing was changed and the card offers _Try again_ and the updater log.

It only works for a source install (the app must have been built from a git clone) and nothing is
checked until you press the button: Murmullo stays offline otherwise.

The updater downloads the release and its dependencies _before_ touching any file, with the app
still running, so a failed download never leaves a half-updated checkout.

`--yes` skips the questions and `--no-launch` stops after reinstalling. This is
`install.sh --update` under the hood, so the same toolchain checks apply. It updates the source
checkout; there is no binary to replace yet.

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

Using the app after that — models, dictionary, Settings: [USAGE.md](USAGE.md).

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

Run `bash scripts/test-installer.sh` to exercise the installer and updater against a throwaway local
origin (no network, stubbed toolchain).

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
