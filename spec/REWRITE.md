# Murmullo as a desktop wrapper

Murmullo is not an inference engine. It is the desktop layer that orchestrates local STT and an
optional local LLM.

## Thesis

1. **STT** — [NeMo-Speech.cpp](https://github.com/NVIDIA/NeMo-Speech.cpp) +
   `parakeet-tdt-0.6b-v3.q8_0.gguf` (~714 MB, Metal on Apple Silicon).
2. **LLM** — local HTTP runtime (Ollama by default) with a **system prompt** and a **dictionary**
   that update when the user corrects.

Target behaviour:

- The app lives in the **background** (tray).
- On launch it **starts the STT server** (and the LLM if available).
- A system hotkey **records**, gets text, **corrects** it with dictionary/LLM, and **pastes** into
  the focused field.
- There is **history**, an **always-on-top overlay**, and a **dictionary that learns**.

Parakeet TDT v3 is **offline** (not streaming). The flow is hold-to-talk: press → speak → release →
transcribe → paste.

Learning does **not** live in the STT. Parakeet is not fine-tuned. The dictionary and prompt are the
layer that corrects itself.

**Supported today:** macOS (capture, hotkey, paste). Windows/Linux paste is pending.

## Pipeline

```
Hotkey / overlay
  → 16 kHz capture
  → speech gate
  → POST /v1/audio/transcriptions (nemo-speech)
  → PostProcessor (dictionary, then LLM if ready)
  → paste into the focused app (macOS)
  → history (raw + final)
```

The overlay (`floating-bar`) is a HUD: idle shows the real hotkey, recording / processing / done /
error, plus Grabar / Parar / Cancelar. The system hotkey remains the primary trigger.

## Runtimes

| Piece            | How                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `nemo-speech`    | PATH or `NEMO_SPEECH_BIN`. `serve --host 127.0.0.1 --port 18765 --no-ui`                 |
| Parakeet Q8 GGUF | `~/.murmullo/models/`                                                                    |
| LLM              | Ollama-compatible HTTP (`127.0.0.1:11434`). Optional: on failure, paste STT + dictionary |

## Workstation pages

Inicio, Historial, Diccionario, Runtimes, Permisos, Ajustes. See
[../src/lib/nav.ts](../src/lib/nav.ts).

## Out of scope (now)

- Fine-tune of Parakeet
- Streaming / `--live`
- Cloud STT / cloud LLM as a dependency
- Paste into the focused app on Windows and Linux (declared pending)

## Success

A user has (or installs) nemo-speech, opens Murmullo, the app stays in the background, holds the
hotkey, speaks, releases, and the corrected text appears in Slack / Cursor / Notes. They can open
history and add dictionary terms.

## Decisions

Whys (native hotkey, reuse nemo-speech, permissive gate, logs, optional LLM, paste on the main
thread, StyleX, hash router) live in [DECISIONS.md](./DECISIONS.md).
