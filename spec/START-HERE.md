# START HERE

Murmullo is being rewritten as a **desktop wrapper** around local STT (nemo-speech + Parakeet) and
an optional local LLM for dictionary learning.

**Current source of truth:** [REWRITE.md](./REWRITE.md) · **Porqués:**
[DECISIONS.md](./DECISIONS.md)

The documents below describe the original Whisper-era product. Prefer REWRITE.md for architecture
and DECISIONS.md for why the current code looks the way it does.

## Quick Start

1. **Read [REWRITE.md](./REWRITE.md)** — product thesis, pipeline, runtimes
2. **Read [DECISIONS.md](./DECISIONS.md)** — decisions from the desktop-wrapper work (hotkey, STT,
   gate, logs, paste)
3. **Read ONEPAGER.md** — original high-level overview (Whisper)
4. **Review ACCEPTANCE.md** — original acceptance criteria
5. **Explore features/** — original feature specs

## Project Status

- **Current Phase**: Desktop runtime wrapper (nemo-speech + Parakeet + dictionary/LLM)
- **Branch**: `feat/desktop-runtime-wrapper`
- **Target**: Wispr Flow-style dictation: background app, hold-to-talk, paste into the focused
  field, history, learning dictionary

## Specification Structure

```
spec/
├── REWRITE.md           # Current rewrite map (start here)
├── DECISIONS.md         # Why the wrapper behaves this way
├── ONEPAGER.md          # Original high-level overview
├── ACCEPTANCE.md        # Original acceptance criteria
├── QUESTIONS.md         # Original open decisions
├── START-HERE.md        # This file
├── features/            # Original feature specs
│   ├── audio-recording/
│   ├── transcription/
│   ├── ui-floating/
│   └── integration/
└── prompts/
```
