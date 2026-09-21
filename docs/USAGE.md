# Using Murmullo

Getting started, how the models fit together, and what to change in Settings. For cloning the repo
and the toolchain, see [INSTALL.md](INSTALL.md). Architecture lives in
[spec/REWRITE.md](../spec/REWRITE.md).

**Supported today:** macOS 12+. The workstation can run on Windows and Linux; paste into the focused
app is still macOS-only.

The main window is a **workstation**, not the recorder. Close it; dictation keeps working from the
tray and the overlay.

## First day

1. Launch Murmullo (`pnpm tauri dev` after the installer, or the app once you have a build).
2. Open **Permissions**. Grant **microphone**, **Input Monitoring**, and **Accessibility**.
   - Microphone records while another app is focused.
   - Input Monitoring lets the hold-to-talk shortcut fire outside Murmullo.
   - Accessibility pastes at the caret. Without it, text only reaches the clipboard.
   - A `tauri dev` binary is not the same as a future `.app`. Grant the binary you are actually
     running.
3. Open **Runtimes** and press **Install and start**. First run downloads the NVIDIA `nemo-speech`
   CLI (SHA-256 checked) and **Parakeet Q8** (~714 MB), then starts STT on `127.0.0.1:18765`.
4. Click a text field in Slack, Mail, Notes, Cursor — anywhere.
5. Hold **`⌘ ⌥ T`** (default), speak, release. Corrected text is pasted at the caret. Raw STT and
   the final line land in **History**.

The overlay HUD shows idle / recording / processing / done / error, plus Record / Stop / Cancel. The
system shortcut is the primary trigger so Murmullo never has to steal focus.

Optional: install [Ollama](https://ollama.com) (or another provider below) if you want an LLM
rewrite on top of the dictionary. Dictation already works with STT + dictionary when the LLM is
down.

## How dictation works

```
Hold ⌘ ⌥ T (or overlay Record)
  → 16 kHz capture from the selected mic
  → speech gate (short silences are ignored)
  → POST /v1/audio/transcriptions on localhost (nemo-speech + Parakeet)
  → Dictionary replacements (exact “heard → replacement” rules)
  → Optional LLM rewrite (same meaning, cleaner punctuation)
  → Paste into the focused app (macOS)
  → History (raw STT + final text)
```

Two different kinds of “model” sit on that path. They are not interchangeable.

| Layer            | Role                                                                     | Required?       |
| ---------------- | ------------------------------------------------------------------------ | --------------- |
| **Speech (STT)** | Turns audio into text                                                    | Yes             |
| **Dictionary**   | Deterministic fixes for names, brands, jargon                            | No, recommended |
| **LLM rewrite**  | Punctuation, muletillas, tone — using a prompt built from the dictionary | No              |

Learning does **not** live in Parakeet. The speech model is not fine-tuned. When Parakeet hears “sub
sierra” instead of “Subsierra”, add a dictionary rule. That rule is applied on every take, and it is
also folded into the LLM system prompt.

If the LLM is missing, stopped, or the chosen model is not pulled, Murmullo pastes **STT +
dictionary** and keeps going.

## How the models work

### Speech — nemo-speech + Parakeet Q8 (required)

Murmullo is not an inference engine. It starts a local
[NeMo-Speech.cpp](https://github.com/NVIDIA/NeMo-Speech.cpp) server and talks to it over HTTP
(OpenAI-compatible `/v1/audio/transcriptions`).

| Piece                   | What it is                                                   | Where                                                              |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `nemo-speech`           | NVIDIA CLI. `serve --host 127.0.0.1 --port 18765 --no-ui`    | `~/.murmullo/runtime/nemo-speech/` (or `PATH` / `NEMO_SPEECH_BIN`) |
| Parakeet TDT 0.6B v3 Q8 | Multilingual ASR, offline, hold-to-talk (not live streaming) | `~/.murmullo/models/parakeet-tdt-0.6b-v3.q8_0.gguf` (~714 MB)      |

On Apple Silicon the NVIDIA archive prefers Metal. First load into RAM can take a moment; later
takes reuse the same GGUF.

**Install it from Runtimes**, not from the shell installer. The workstation verifies the CLI
checksum against the pinned NVIDIA release. You can also drop a `nemo-speech` binary on `PATH`, set
`NEMO_SPEECH_BIN`, or use Homebrew / the official NVIDIA install — Runtimes will detect it.

There is no model picker for STT today. The pinned GGUF is Parakeet Q8. Streaming / `--live` is out
of scope.

**STT language** (Settings): Auto, English, Spanish, French, German, Italian, Portuguese. Auto is
the default. This is the speech language, not the workstation locale.

### Rewrite — local LLM (optional)

After the dictionary pass, Murmullo may send the text to a local provider. The LLM must **not invent
content**; the baked-in prompt asks it to keep the original language, apply dictionary terms, fix
punctuation, and drop filler words only when the meaning stays the same.

Turn rewrite on or off in **Settings → AI rewrite**. Default provider is **Ollama** at
`http://127.0.0.1:11434`, model `llama3.2`.

| Provider | Kind   | Default model | Notes                                                                                                                             |
| -------- | ------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Ollama   | Server | `llama3.2`    | Detected on PATH, Homebrew, `/usr/local/bin`, `Ollama.app`. Pull the model (`ollama pull llama3.2`) or pick one you already have. |
| Kimi     | CLI    | `kimi-k2.5`   | `kimi -p` rewrites the take.                                                                                                      |
| Kilo     | CLI    | `auto`        | `kilo` (or `kili`) `run`.                                                                                                         |
| Cursor   | CLI    | `auto`        | `agent` / `cursor-agent` in ask mode — it must not edit files.                                                                    |
| Claude   | CLI    | `sonnet`      | `claude -p` (`sonnet`, `opus`, `haiku`, …).                                                                                       |

Runtimes shows whether the backend and the configured model are actually there. If the CLI is
missing, switch provider in Settings — dictation does not wait on it.

Home’s inspector (Improve / summarise) uses the same configured LLM when it is ready.

## Configure

Everything below is in the workstation. Changes to the shortcut, theme, locale, overlay, and LLM
apply without restarting.

### Permissions

**Permissions** page, or System Settings → Privacy & Security:

- Microphone
- Input Monitoring
- Accessibility

Status on that page updates on its own after you grant them. If the shortcut works in Murmullo but
not in Slack, Input Monitoring is still off for this binary.

### Shortcut

**Settings → Global shortcuts.** Default hold-to-talk is `Cmd+Option+T`. Click the field and press
the new combination (needs a modifier + a key). Esc cancels. Reserved chords (`Cmd+Space`,
`Cmd+Tab`, `Cmd+Q`, …) are rejected.

### Microphone and audio

**Settings → Microphone** picks the input device. **Cancellation and audio** toggles noise reduction
and normalisation before STT. Leave them on unless you are debugging a bad take.

**Settings → Language** (under the STT block) is the speech language hint for Parakeet, not the UI
language.

### LLM rewrite

**Settings → AI rewrite:**

1. Enable or disable rewrite.
2. Choose provider (Ollama, Kimi, Kilo, Cursor, Claude).
3. Choose a model from the list Murmullo detected. If the list is empty, the backend is not
   installed or has no models pulled yet.

Runtimes can start Ollama when it is installed but not running.

### Dictionary

**Dictionary** is the layer that “learns.” Each row is `as the STT heard it` → `replacement`.
Examples: a last name, a product, a team acronym.

- Replacements run on every take, even with the LLM off.
- Adding or removing a rule regenerates `~/.murmullo/prompt.md`, which is the system prompt the LLM
  sees next time rewrite is on.

Do not try to “train” Parakeet. Fix the word here.

### Overlay, theme, locale

**Settings → Appearance:** light (ceramic), dark, or system.

**Settings → Interface language:** Español (España) or English. Default is Spanish.

**Settings → Floating bar:** Pill (compact at rest), Island, or Card. If you quit the overlay, show
it again here or press Dictate.

The overlay can be dragged. Placement is stored in config.

### Files on disk

All local state lives under **`~/.murmullo/`** (legacy Application Support / `.config` folders are
migrated once):

| Path                   | What                             |
| ---------------------- | -------------------------------- |
| `config.json`          | Hotkey, mic, theme, overlay, LLM |
| `models/*.gguf`        | Parakeet Q8                      |
| `runtime/nemo-speech/` | Managed CLI                      |
| `dictionary.json`      | Heard → replacement rules        |
| `prompt.md`            | Generated LLM system prompt      |
| `transcriptions.json`  | History metadata                 |
| `recordings/`          | Local clip audio                 |
| `logs/murmullo.log`    | App log                          |

Nothing in that folder is uploaded. Feedback to GitHub includes version and environment, not audio
or dictations.

## The workstation

| Page        | What it is                                                            |
| ----------- | --------------------------------------------------------------------- |
| Home        | Greeting, prompts, recent murmurs, inspector (copy / improve / audio) |
| History     | Search, paste again, correct, delete                                  |
| Dictionary  | STT replacement rules + generated prompt                              |
| Runtimes    | Install CLI / GGUF, start STT, optional LLM, pipeline logs            |
| Permissions | Microphone, shortcut, paste                                           |
| Settings    | Hotkey, mic, STT language, LLM, overlay, theme, locale                |

Typical uses: notes without looking at the keyboard, drafting mail, thinking out loud, catching an
idea before it evaporates. The companion on Home is a presence. The work happens in the other app.

## If something fails

| Symptom                                            | Likely cause                                                                 |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| Shortcut does nothing while another app is focused | Input Monitoring off for this binary                                         |
| Text stays on the clipboard                        | Accessibility off                                                            |
| Runtimes never becomes ready                       | Parakeet Q8 not downloaded, or STT not started                               |
| Rewrite never changes the text                     | LLM off, backend missing, or model not pulled — STT + dictionary still paste |
| Hotkey works in Murmullo only                      | You granted permissions to a different binary (`tauri dev` vs `.app`)        |

Toolchain and Gatekeeper issues: [INSTALL.md](INSTALL.md). Bugs and feature requests: in-app Help,
which opens a GitHub form (you review it before submit).
