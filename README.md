# Murmullo

Offline voice dictation for the Mac. Record locally, transcribe with **nemo-speech + Parakeet TDT
0.6B v3**, optionally rewrite with a local LLM and a personal dictionary, then paste into the
focused app.

Architecture: [spec/REWRITE.md](spec/REWRITE.md). Why the code looks this way:
[spec/DECISIONS.md](spec/DECISIONS.md). Visual tokens: [DESIGN.md](DESIGN.md).

**Supported today:** macOS 12+. Pasting into the focused app on Windows and Linux is not implemented
yet.

## What it does

- Hold-to-talk (default `⌘ ⌥ T`, configurable in Ajustes)
- Always-on-top overlay: idle, recording, processing, done, error — plus Grabar / Parar / Cancelar
- Tray app: close the window and dictation keeps working
- History of raw STT and final text
- Dictionary that regenerates the LLM system prompt
- Optional local LLM (Ollama-compatible HTTP). If it is down, dictation still pastes STT +
  dictionary
- Runtimes tab to install nemo-speech, download the Parakeet Q8 GGUF, and start the STT server

## Requirements

- macOS 12+
- Rust 1.70+
- Node.js 18+
- pnpm

## Development

```bash
git clone https://github.com/ivrusson/murmullo.git
cd murmullo
pnpm install
pnpm tauri dev
```

Production build:

```bash
pnpm tauri build
```

Frontend-only: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm type-check`.

## Usage

1. **Permissions** — microphone (required), Accessibility (required, paste), Input Monitoring
   (required so the hotkey works while another app is focused).
2. **Runtimes** — install [nemo-speech](https://github.com/NVIDIA/NeMo-Speech.cpp) (or set
   `NEMO_SPEECH_BIN`), download Parakeet Q8 (~714 MB), start the STT server. Optionally install
   [Ollama](https://ollama.com).
3. **Dictate** — hold the hotkey, speak, release. Text is corrected (dictionary ± LLM) and pasted
   into the focused field.

The main window is a workstation, not the recorder:

| Page        | What it is                             |
| ----------- | -------------------------------------- |
| Inicio      | Greeting, recent dictations, inspector |
| Historial   | Searchable history                     |
| Diccionario | Terms that reshape the rewrite prompt  |
| Runtimes    | STT / GGUF / LLM installer and logs    |
| Permisos    | macOS permission status                |
| Ajustes     | Hotkey, mic, overlay style, theme, LLM |

## Architecture

Murmullo is a thin desktop wrapper, not an inference engine:

- **RuntimeManager** starts/stops `nemo-speech serve` and optional Ollama on localhost
- **AudioCapture** records 16 kHz audio with a speech gate
- **HTTP STT** `POST /v1/audio/transcriptions` against Parakeet Q8 GGUF
- **Dictionary + PostProcessor** deterministic replacements, then optional LLM rewrite
- **TextInserter** clipboard + Cmd+V on the macOS main thread
- Overlay + tray for hold-to-talk without stealing focus

The GGUF lives under `~/Library/Application Support/murmullo/models/`.

## Later

- Package `nemo-speech` as a Tauri `externalBin`
- Paste into the focused app on Windows and Linux
- LLM runtimes beyond Ollama HTTP

## License

MIT. See `LICENSE`.

## Acknowledgments

- [NeMo-Speech.cpp](https://github.com/NVIDIA/NeMo-Speech.cpp) — local ASR server
- [Parakeet TDT](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3) — NVIDIA multilingual ASR
- [Tauri](https://tauri.app/) — desktop shell
- [StyleX](https://stylexjs.com/) — typed atomic CSS
- [Base UI](https://base-ui.com/) — accessible primitives
