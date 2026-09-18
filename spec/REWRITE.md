# Murmullo como wrapper de escritorio (Wispr Flow)

Punto de partida del rewrite. Murmullo no es un motor de inferencia: es la capa de escritorio que
orquesta STT y LLM locales.

## Tesis

1. **STT** — [NeMo-Speech.cpp](https://github.com/NVIDIA/NeMo-Speech.cpp) +
   `parakeet-tdt-0.6b-v3.q8_0.gguf` (~714 MB, Metal en Apple Silicon).
2. **LLM** — runtime HTTP local (Ollama por defecto) con un **system prompt** y un **diccionario**
   que se actualizan cuando el usuario corrige.

Comportamiento objetivo (Wispr Flow):

- La app vive en **background** (tray).
- Al arrancar, **levanta el servidor** STT (y el LLM si está disponible).
- Un hotkey **graba**, obtiene texto, lo **corrige** con diccionario/LLM y lo **pega** en el campo
  activo.
- Hay **historial**, **overlay** (placeholder) y **diccionario que aprende**.

Parakeet TDT v3 es **offline** (no streaming). El flujo es hold-to-talk: pulsar → hablar → soltar →
transcribir → pegar.

El aprendizaje **no** vive en el STT. Parakeet no se fine-tunea. El diccionario y el prompt son la
capa que se corrige sola.

## Pipeline

```
Hotkey / overlay
  → captura 16 kHz
  → gate de voz
  → POST /v1/audio/transcriptions (nemo-speech)
  → PostProcessor (diccionario, luego LLM si está listo)
  → pegar en la app activa
  → historial (raw + final)
```

## Runtimes

| Pieza            | Cómo                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `nemo-speech`    | PATH o `NEMO_SPEECH_BIN`. `serve --host 127.0.0.1 --port 18765 --no-ui`                     |
| GGUF Parakeet Q8 | `~/Library/Application Support/murmullo/models/` (u homólogo)                               |
| LLM              | HTTP compatible con Ollama (`127.0.0.1:11434`). Opcional: si falla, se pega STT+diccionario |

## Fuera de alcance

- Fine-tune de Parakeet
- Streaming / `--live`
- Cloud STT / cloud LLM como dependencia
- Rediseño visual de la barrita (solo se enganchan estados)

## Criterio de éxito

Un usuario tiene (o instala) nemo-speech, abre Murmullo, la app queda en segundo plano, pulsa el
atajo, habla, suelta, y el texto corregido aparece en Slack/Cursor/Notes. Puede abrir historial y
añadir términos al diccionario.

## Decisiones

El detalle de porqués (atajo nativo, reutilizar nemo-speech, gate permisivo, logs, LLM opcional,
pegado en el hilo principal) está en [DECISIONS.md](./DECISIONS.md).
