# Decisiones de implementación

Registro de decisiones tomadas al convertir Murmullo en wrapper de escritorio (hold-to-talk,
nemo-speech, overlay, pegado). No sustituye a [REWRITE.md](./REWRITE.md): este archivo explica **por
qué** el código es como es.

Formato: contexto → decisión → por qué → qué no hacemos.

---

## 2026-09-17 — El atajo es de sistema, no de la ventana

**Contexto.** El hold-to-talk no disparaba la grabación si otra app tenía el foco. El overlay
parecía el “botón”, y el PTT vivía en React.

**Decisión.** El atajo se registra en macOS (`tauri-plugin-global-shortcut` /
`RegisterEventHotKey`). Pulsar empieza captura nativa; soltar para y transcribe. La píldora muestra
estado y, desde 2026-09-18, también permite Grabar / Parar / Cancelar.

**Por qué.** Igual que el micrófono: tiene que funcionar con Murmullo en segundo plano. El handler
JS llegaba tarde: `runtime.status()` hacía HTTP al arrancar, y el `Released` se perdía. El registro
en el `setup` del hilo principal fallaba o no tenía ACL; se registra ~250 ms después, en un hilo de
fondo, con permisos `global-shortcut` en capabilities.

**Permisos.** Los tres son de sistema y obligatorios:

| Permiso                   | Para qué                                     |
| ------------------------- | -------------------------------------------- |
| Micrófono                 | Captura                                      |
| Monitorización de entrada | El atajo llega aunque otra app tenga el foco |
| Accesibilidad             | Cmd+V en el campo activo                     |

**Qué no.** No sustituir el atajo de sistema: la píldora no es el único activador.

---

## 2026-09-18 — Controles en la píldora + buffer y ganancia para el STT

**Contexto.** Un clip de exactamente 10.00 s, `rms=0.0005`, `voiced_frames=0`, POST 200 y `text=""`.
El buffer de captura cortaba a 10 s (se tiraba el principio, donde suele estar el habla). La
normalización saltaba picos &lt; 0.02, así que nemo-speech recibía silencio. Probar solo con el
atajo era incómodo.

**Decisión.**

- Buffer de captura **120 s**.
- Boost dedicado al STT (pico objetivo ~0.75, tope ×40) aunque el usuario no normalice.
- Gate: si no hay frames con voz, no se envía (evita POST vacío).
- En la píldora: **Grabar**, **Parar** (transcribe), **Cancelar** (descarta). El atajo de sistema
  sigue siendo el camino principal.

**Por qué.** OpenChamber graba desde su UI; Murmullo también necesita un control visible para
iterar. El atajo no se elimina.

---

## 2026-09-17 — Overlay: HUD abajo al centro, no es el comando

**Contexto.** No quedaba claro en la UI dónde está la píldora ni qué atajo usa.

**Decisión.** Ventana `floating-bar` always-on-top, sin decoración, abajo al centro. Idle muestra el
atajo real de config (no hardcodear `Cmd Opt T`). Al grabar: “Suelta para transcribir”, no “Mantén
Fn”. Al procesar: etapa real (`POST …/transcriptions`), no “Refinando con IA” durante el STT.

**Por qué.** El usuario configura `Cmd+Option+Space`; el default de código es `Cmd+Option+T`. El
overlay mentía. Fn no es el atajo.

---

## 2026-09-17 — STT = nemo-speech en localhost, el mismo contrato que OpenChamber

**Contexto.** Parecía que “no escuchaba”. En realidad el audio se capturaba y a veces ni se llegaba
a POST. OpenChamber, con el mismo `nemo-speech` arrancado a mano, transcribía bien.

**Decisión.** Un único camino STT:

```
POST http://127.0.0.1:{stt_port}/v1/audio/transcriptions
  file=recording.wav
  model=default
  response_format=json
  language=… (si no es auto)
```

Puerto por defecto **18765**. Si `GET /ready` ya responde, **reutilizar** el proceso (no spawnear
otro). `model=default` porque el cliente OpenAI de NeMo-Speech.cpp lo exige; no cambia de modelo,
solo cumple el contrato.

**Por qué.** OpenChamber Voice en modo “server” es un STT OpenAI-compatible. Murmullo es el mismo
POST; la diferencia es que OpenChamber deja el texto en su chat y Murmullo lo pega en la app activa.

**Qué no.** Whisper embebido, cloud STT, streaming/`--live`.

---

## 2026-09-17 — El speech gate no puede comerse el habla baja

**Contexto.** Captura OK (rms ~0.009, picos reales) y el gate rechazaba `speech_ratio` 0.005–0.028.
El umbral contaba samples `\|x\| > max(silence*3, 0.015)`. `reduce_noise` machacaba `\|avg\| < 0.01`
× 0.1. `remove_silence` recortaba huecos internos con `silence_threshold` del usuario (0.01).

**Decisión.**

- Gate: rechazar solo casi-silencio (`rms < 0.0015` y `max < 0.01`). Frames de 20 ms para log; el
  habla baja **pasa a nemo-speech**.
- Noise: media móvil 5 taps, **sin crush**.
- Silencio: solo trim de extremos, floor ≤ 0.004, 200 ms de padding.
- Normalizar picos bajos (hasta ×8) en vez de saltarlos en 0.05.

**Por qué.** Parakeet decide si hay habla. Un gate agresivo + crush convertía voz real en “no se
detectó voz” y nunca había POST.

---

## 2026-09-17 — Listo para dictar ≠ sondear Ollama

**Contexto.** Tras el gate se llamaba `runtime.status()`, que también sonda el LLM. Eso ralentizaba
o colgaba el camino crítico.

**Decisión.** En dictado: `GET {stt}/ready` + existencia del GGUF. Ollama solo si `llm_enabled` y el
modelo está en `/api/tags`.

---

## 2026-09-17 — Logs de pipeline, no println sueltos

**Contexto.** `nemo-speech` arrancaba con `stdout`/`stderr` a `/dev/null`. El POST no se registraba.
Tras `process_audio` no se sabía si el STT se había llamado. OpenChamber “oía” porque su UI sí
muestra el resultado del mismo servidor.

**Decisión.** Módulo `pipeline`:

| Destino                                | Qué                                                                          |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| stdout de Tauri                        | `[HH:MM:SS] [stage] …`                                                       |
| `~/Library/Logs/murmullo/murmullo.log` | misma línea                                                                  |
| evento `pipeline-log`                  | panel en Escritorio y Runtimes; `console.log` en ventana principal y overlay |

Stages: `boot`, `ptt`, `audio`, `stt`, `nemo`, `llm`, `paste`. stdout/stderr de `nemo-speech serve`
se pipean a `[nemo]`.

Un dictado sano debe verse:

1. `POST http://127.0.0.1:18765/v1/audio/transcriptions wav=…KB`
2. `HTTP 200 in …ms`
3. `nemo-speech text="…"`
4. `paste` + `dictation complete`

**Qué no.** Depender de que el usuario lea solo la consola de `pnpm tauri dev`.

---

## 2026-09-18 — El LLM es opcional; un 404 no es un crash

**Contexto.** STT devolvía texto; luego `POST http://127.0.0.1:11434/api/chat model=llama3.2` → 404.
El proceso moría justo después, y parecía culpa de Ollama.

**Decisión.** Si el modelo no está en `/api/tags`, saltar reescritura y pegar STT + diccionario. Log
`[llm] skip rewrite`. Un 404/timeout nunca aborta el dictado. `llm_enabled` puede seguir en true:
“intentar si hay modelo”, no “exigir Ollama”.

**Por qué.** El 404 era `llama3.2` ausente. El criterio de éxito de REWRITE.md es dictar sin LLM.

---

## 2026-09-18 — Pegar en el hilo principal de macOS

**Contexto.** Tras `final text` el proceso salía con `ELIFECYCLE 1`. El texto del STT era correcto.
Enigo + `arboard` corrían en un task de Tokio.

**Decisión.** `AppHandle::run_on_main_thread` para portapapeles y Cmd+V. `catch_unwind` para no
matar el proceso si Enigo paniquea. Si Enigo falla: `osascript` / System Events. El texto **se
queda** en el portapapeles (no restaurar el anterior a los 80 ms: pisa el pegado). Emitir
`transcription-completed` **antes** de guardar historial.

**Por qué.** `CGEvent` / `NSPasteboard` fuera del hilo principal abortan. OpenChamber no pega a
otras apps; Murmullo sí, y ese era el crash. Restaurar el clipboard competía con Cmd+V.

**Qué no.** Enigo desde el worker de transcripción. Tirar el proceso si Accessibility niega el
pegado.

---

## Orden del pipeline (vigente)

```
Atajo nativo (Pressed/Released)
  → captura cpal 48 kHz → resample 16 kHz
  → gate (solo silencio vacío)
  → GET /ready (nemo-speech)
  → MA + normalize + trim extremos
  → POST /v1/audio/transcriptions (model=default)
  → diccionario; LLM solo si el modelo está en Ollama
  → clipboard + Cmd+V en hilo principal
  → overlay “hecho”
  → historial (raw + final + wav)
```

## Cómo comprobar

1. Arrancar o reutilizar `nemo-speech` en `:18765` (como OpenChamber).
2. Hold-to-talk, hablar, soltar.
3. En Runtimes / `~/Library/Logs/murmullo/murmullo.log`: POST 200, `paste`, `dictation complete`.
4. El proceso **no** debe morir. Si Ollama no tiene el modelo: `skip rewrite`, el texto del STT se
   pega igual.
