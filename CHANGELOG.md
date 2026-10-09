# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Murmullo is still **beta**. Versions stay on the `0.x` line until the product is ready for 1.0.0.

## [Unreleased]

## [0.8.2] - 2026-10-09

### Fixed

- Settings and crash reports show the same version as the release. 0.8.1 still reported 0.8.0.

## [0.8.1] - 2026-10-09

### Fixed

- The floating bar accepts clicks and can be dragged again. Text on the pill and the mascot still
  does not stay highlighted. Empty padding around the bar passes through to the desktop.
- macOS paste sends Cmd+V once and brings the target app's window forward, so the caret receives the
  line.
- Auto-insert stays on for configs saved before the toggle, and turning it off no longer pastes the
  same dictation twice.

### Changed

- README and the usage guide describe the on-device Qwen corrector. Home in the README is a current
  capture, with the companion from the in-app hero.

## [0.8.0] - 2026-10-09

On-device dictation correction, flexible push-to-talk chords, and easier source installs.

### Added

- Guided `install.sh` / `install.command` (macOS, Linux) and `install.ps1` / `install.cmd` (Windows)
  so cloning the repo is enough to get a toolchain before native OS packages exist
- README screenshot, usage, roadmap, and acknowledgments for the open-source stack
- [docs/INSTALL.md](docs/INSTALL.md) with installer flags and first-run troubleshooting
- [docs/USAGE.md](docs/USAGE.md) getting-started guide: dictation flow, Parakeet vs optional LLM,
  and Settings / dictionary
- Built-in on-device correction (Qwen 2.5 0.5B, ~480 MB) with in-app download and progress, so
  transcripts can be cleaned up without a separate Ollama or HTTP LLM
- Editable Spanish and English correction system prompts in Settings, with restore to the defaults
- Push-to-talk shortcuts of one to three keys; the new chord applies immediately without restarting
- App version shown in Settings → Help, sourced from the Cargo package version

### Changed

- `pnpm release:dry` promotes Keep a Changelog, bumps package/Cargo/tauri versions, and skips the
  Tauri build. Real releases still refuse 1.x while we are in beta.
- `pnpm changelog` drafts Unreleased notes with `cursor-agent` (Keep a Changelog). Do not use
  conventional-changelog.
- Hero mascot brand asset refreshed for the landing and workstation companion

### Fixed

- Crash reporter is a self-contained `crash://` page (no Vite, no Google Fonts). If the dev server
  dies, the pending report in `~/.murmullo` still opens.
- Floating bar hitbox only captures the HUD chrome, so clicks outside the pill pass through to the
  desktop; status copy matches what the bar is doing
- macOS dictation insert no longer pastes the same text twice into the focused app

## [0.7.0] - 2026-09-19

GitHub-bound feedback and a crash reporter that still works if React is dead.

### Added

- Issue templates for bug, feature, and crash reports with stable field ids for URL prefilling
- In-app feedback from the sidebar companion and Ajustes: opens a prefilled GitHub form, with a
  markdown copy fallback if the browser cannot be launched
- Compact Bug / Lightbulb icon cluster with ceramic tooltips under the mascot
- Vanilla `crash.html` window (no React) so a broken UI can still file a crash
- Rust panic hook, pending crash JSON under `~/.murmullo`, and frontend `onerror` /
  `unhandledrejection` / ErrorBoundary capture
- Tauri opener scoped to `github.com` for the prefilled issue URL

### Changed

- Help copy in Ajustes now launches the same GitHub flow instead of a dead-end support note

## [0.6.0] - 2026-09-12

Localization, overlay personality, and local LLM providers.

### Added

- Spanish / English locale toggle with message catalogs for workstation, overlay, and errors
- Overlay style picker (ceramic HUD variants) and placement helpers
- Local LLM provider wiring (Ollama-compatible HTTP) with graceful fallback to STT + dictionary
- Pending dictation context so the overlay can finish a take after the main window is closed

### Changed

- Overlay bar is a real HUD (idle / recording / processing / done / error), not a placeholder
- Settings expose overlay style, locale, and LLM endpoint in the same ceramic surface

## [0.5.0] - 2026-09-05

Ceramic workstation: StyleX + Base UI, companion mascot, hash routes.

### Added

- Design tokens in [DESIGN.md](DESIGN.md) (paper, ink, glaze, copper) shared with StyleX
- Workstation shell: Inicio, Historial, Diccionario, Runtimes, Permisos, Ajustes
- Companion mascot (2D SVG + optional Three.js) with idle / listening / thinking presets
- TanStack Router file-based routes with hash history for the Tauri webview
- Base UI primitives (Dialog, Select, Switch, Tooltip, Toaster) replacing shadcn leftovers

### Changed

- Booth / Tailwind / Radix bridge is gone; screens paint from ceramic tokens
- App icon and tray assets regenerated from the imagotipo

### Removed

- Whisper-era shadcn, Tailwind config, and Three.js “voice membrane” experiment
- Spec documents from the original Whisper product plan

## [0.4.0] - 2026-08-29

Runtimes installer, learning dictionary, history, and macOS permissions.

### Added

- Runtimes tab to install nemo-speech, download Parakeet Q8 GGUF, start the STT server
- Pipeline logs for install / serve / rewrite
- Learning dictionary that regenerates the LLM system prompt
- Searchable history of raw STT and final text
- Permissions page for Microphone, Accessibility, and Input Monitoring

### Changed

- GGUF and runtime state live under Application Support; pending crashes do not

## [0.3.0] - 2026-08-22

Hold-to-talk overlay, tray, and paste into the focused Mac app.

### Added

- Hold-to-talk via a system hotkey (default `⌘ ⌥ T`), with Grabar / Parar / Cancelar on the overlay
- Always-on-top overlay window that does not steal key focus
- Tray + close-to-background so dictation keeps working with the workstation closed
- Paste into the focused macOS app (clipboard + Cmd+V on the main thread, Accessibility)

### Changed

- Overlay is no longer the only way to start recording; the hotkey works from any app

## [0.2.0] - 2026-08-15

Rewrite around local STT. Murmullo is a macOS desktop wrapper around `nemo-speech serve` + Parakeet,
with optional LLM rewrite. Pasting into the focused app on Windows and Linux is still pending.

### Added

- Desktop wrapper around `nemo-speech serve` + Parakeet TDT 0.6B v3 Q8 GGUF
- HTTP STT against the local OpenAI-compatible transcriptions endpoint
- Optional Ollama-compatible rewrite; dictation still works if the LLM is down

### Changed

- Replaced the embedded Whisper path with HTTP STT against nemo-speech

### Removed

- Whisper model manager UI

## [0.1.0] - 2024-12-19

Early Whisper-era snapshot. Not the current stack.
