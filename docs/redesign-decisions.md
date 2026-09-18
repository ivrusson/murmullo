# Decisiones del rediseño Booth (StyleX + Three.js)

El archivo de plan original (`rediseño_base_ui_+_stylex_+_three.js`) no estaba en esta VM.
Este log registra las decisiones tomadas al completar el rediseño sobre
`migration/core-and-design-improvements`.

---

## 1. Sistema visual: “Booth” (cabina de voz)

**Contexto.** Murmullo es dictado local hold-to-talk. La UI anterior (“Velvet Flow”)
mezclaba indigo, cian neón y sombras neumórficas; parecía un dashboard SaaS, no una
cabina.

**Decisión.** Un solo gesto memorable: una **membrana acústica de cobre** (Three.js)
en el escritorio. El resto es quieto: sala de grabación en tinta `#162028`, texto
papel `#E7E2D6`, acento cobre `#C9955A`, señal de “escuchando” en teal `#4F9B8C`.

**Alternativas.**
- Seguir con indigo/cian Velvet Flow: no diferenciaba el producto.
- Negro + verde ácido: paleta prohibida y de “hacker toy”.
- Cream + terracota `#D97757`: paleta genérica de plantilla.

**Por qué.** El cobre evoca cinta, aliento y hardware analógico; el teal es estado
vivo, no decoración. Tipografía Fraunces solo en títulos; IBM Plex Sans/Mono en UI
y logs.

**Archivos.** `src/styles/globals.css`, `src/styles/tokens.stylex.ts`,
`src/styles/floating-bar.css`, `index.html`.

---

## 2. StyleX como sistema, Tailwind como puente

**Contexto.** El plan pedía StyleX (tokens/temas, no CSS-in-JS ad hoc). El repo ya
tiene Tailwind v4 + Radix/shadcn.

**Decisión.** StyleX (`defineVars` + `create`) para shell, páginas y primitivas
nuevas. Los tokens StyleX apuntan a CSS custom properties (`--booth-*`) que también
alimentan Tailwind, para que Select/Dialog/ComboBox no se vean de otro producto.

**Alternativas.**
- Tirar Tailwind de golpe: rompe Radix y alarga el PR sin ganar UX.
- Solo Tailwind con nuevas clases: incumple el plan StyleX.

**Por qué.** Un origen de verdad (CSS vars) + StyleX atómico en la UI nueva.
`next-themes` sigue toggling `html.dark`; no hace falta `createTheme` duplicado
(evita FOUC).

**Archivos.** `vite.config.ts`, `src/styles/tokens.stylex.ts`,
`src/components/ui-system/*`, `tailwind.config.ts`, `.eslintrc.cjs`.

El unplugin, con dos HTML (app + overlay), inyectaba el CSS atómico en el chunk
de la píldora. `cssInjectionTarget` apunta a `globals.css`, que cargan ambas
ventanas.

---

## 3. Three.js: cámara de voz, no canvas muerto

**Contexto.** El plan pedía Three.js con sentido, import dinámico, respetar reduced
motion.

**Decisión.** Membrana (plano desplazado, shader cobre/teal) en el escritorio.
Reacciona a `recording-state-changed` y `audio-level-updated`. Chunk aparte
(`React.lazy`). Overlay flotante **sin** Three.js (ventana de 30–60 px).

**Alternativas.**
- R3F: más runtime para una sola escena.
- Partículas genéricas: cliché de “AI hero”.
- 3D en la píldora: mata la batería y el presupuesto de la overlay.

**Por qué.** La membrana es el único gesto ruidoso; el HUD tiene que ser barato.

**Archivos.** `src/components/scene/createVoiceChamber.ts`,
`src/components/scene/VoiceChamber.tsx`,
`src/components/scene/VoiceChamberLazy.tsx`,
`src/hooks/useDictationScene.ts`.

---

## 4. TanStack Router (hash), no TanStack Start

**Contexto.** Las instrucciones piden Router/Start “si encajan”. Murmullo es Tauri
desktop, no un servidor.

**Decisión.** File-based TanStack Router con **hash history** (`#/historial`,
`#/ajustes`). `defaultPreload: 'intent'`. Search param `q` validado en historial.
`notFound` y `errorComponent` concretos. **No** TanStack Start: no hay SSR ni
`createServerFn` en este binario.

**Alternativas.**
- Dejar `useState` de pestañas: no hay URL, no hay preload, peor teclado.
- History API sin hash: en `tauri://` / custom protocol los paths se pelean con el
  filesystem.
- Meter Start “por si acaso”: añade un runtime de servidor que Tauri no usa.

**Por qué.** Rutas tipadas y deep-link de vistas sin fingir un Next.js.

**Archivos.** `src/routes/*`, `src/router.tsx`, `src/routeTree.gen.ts`,
`src/lib/nav.ts`, `src/components/RouteStates.tsx`, `src/App.tsx`.

---

## 5. Convex / auth server-side

**Decisión.** No aplica. No hay Convex. Auth de macOS (mic, input monitoring,
accesibilidad) ya vive en Rust.

---

## 6. Rendimiento React

**Decisiones.**
- `Promise.all` al cargar config + devices + runtime (antes era waterfall).
- Three.js y la escena solo en el chunk del escritorio.
- Sin componentes definidos dentro de componentes en las páginas nuevas.
- Ternarios en vez de `&&` donde un `0` podría pintarse.
- `prefers-reduced-motion`: un frame estático en WebGL + corte global de
  animaciones CSS.

**Archivos.** `src/contexts/AppConfigContext.tsx`, `src/lib/motion.ts`,
`src/hooks/usePrefersReducedMotion.ts`, `src/styles/globals.css`.

---

## 7. Overlay / floating bar

**Decisión.** Misma paleta Booth, IBM Plex, waveform cobre→teal. Comportamiento
(Grabar / Parar / Cancelar, atajo nativo) **sin tocar** el backend. El plan de
rewrite decía no rediseñar la barrita a nivel de contrato; aquí solo se alinea
el look.

**Archivos.** `src/styles/floating-bar.css`, `floating-bar.html`,
`src/components/WaveformVisualization.tsx`.

---

## 8. Copia y navegación

**Decisión.** Títulos en sentence case, español, voz activa. Nav corto:
Escritorio, Historial, Diccionario, Runtimes, Permisos, Ajustes. Vacío e error
dicen qué hacer (“Dicta con ⌘⌥T”, “Vuelve al escritorio”).

**Archivos.** páginas en `src/components/pages/*`, `src/components/Sidebar.tsx`.

---

## Qué no se hizo (y por qué)

| Ítem | Motivo |
| --- | --- |
| Plan file original | No estaba en la VM; se infirió del nombre + app + README/spec. |
| TanStack Start / Convex | Fuera de stack. |
| Reescritura Rust | El plan es UI. |
| Sustituir Radix/shadcn entero | Puente Tailwind con los mismos tokens. |
| Tests E2E de Tauri | No hay harness; verificación con `vite build` + preview. |
