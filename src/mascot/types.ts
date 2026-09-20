/**
 * Murmullo mascot — shared types.
 *
 * The engine (`engine.ts`) turns params + state + audio into a `MurmulloPose`
 * every frame. Both renderers (three.js / SVG) only read the pose, so they
 * stay visually in sync and can be swapped freely.
 */

/** Interaction states, mirroring the brand sheet ("Estados principales"). */
export type MurmulloState =
  | 'idle' // En reposo
  | 'listening' // Escuchando
  | 'speaking' // Hablando
  | 'processing' // Procesando
  | 'done' // Texto listo
  | 'vanishing' // Desapareciendo
  | 'background' // En segundo plano
  | 'error';

export type MurmulloPaletteName = 'aurora' | 'bosque' | 'atardecer' | 'noche';

export interface MurmulloPalette {
  /** Dense obsidian body colour. */
  core: string;
  /** Lighter smoky tone that shows through the translucent edges. */
  deep: string;
  /** Rim / fresnel colour (lavender in "aurora"). */
  rim: string;
  /** Warm iridescent accent (blush / apricot). */
  glowA: string;
  /** Cool iridescent accent (sky / mint). */
  glowB: string;
  /** Eye colour. */
  eye: string;
  /** Ambient aura projected on the surface beneath. */
  aura: string;
  /** Tint used while vanishing (turns the eyes ghostly blue). */
  ghost: string;
}

export interface MurmulloShapeParams {
  /** Width / height ratio of the body (the sheet is ~1.3). */
  aspect: number;
  /** Depth ratio (3D only). */
  depth: number;
  /** Strength of the static, asymmetric lobes that make it look like a cloud. */
  asymmetry: number;
  /** Frequency of those lobes; lower = fewer, bigger bumps. */
  lobeFrequency: number;
  /** Deterministic seed so every instance can look slightly different. */
  seed: number;
}

export interface MurmulloMaterialParams {
  /** 0..1 how translucent the edges get. */
  translucency: number;
  /** 0..1 thin-film colour sheen along the rim. */
  iridescence: number;
  /** 0..1 fresnel rim brightness. */
  rim: number;
  /** 0..1 specular highlight size / brightness. */
  gloss: number;
}

export interface MurmulloEyeParams {
  /** Eye half-height relative to body radius. */
  size: number;
  /** Horizontal offset of each eye from the centre line, relative to body radius. */
  spacing: number;
  /** Vertical position (positive = higher), relative to body radius. */
  height: number;
  /** Inward tilt, degrees. */
  tilt: number;
  /** 0..1 bloom around the eyes. */
  glow: number;
  /** Width / height ratio of an open eye. */
  aspect: number;
}

export interface MurmulloMotionParams {
  /** Speed multiplier of the flowing surface noise. */
  flowSpeed: number;
  /** Amplitude multiplier of the flowing surface noise. */
  flowAmp: number;
  /** Idle breathing amplitude (0 = still). */
  breathAmp: number;
  /** Breathing cycles per second. */
  breathRate: number;
  /** How strongly audio drives shape and glow. */
  reactivity: number;
  /** Squash & stretch intensity on audio peaks. */
  squash: number;
  /** How much the eyes wander around while idle (0 = none). */
  gazeWander: number;
  /** Average blinks per minute. */
  blinkRate: number;
  /** Disable continuous animation (prefers-reduced-motion). */
  reducedMotion: boolean;
}

export interface MurmulloAudioParams {
  /** Envelope attack time in seconds. */
  attack: number;
  /** Envelope release time in seconds. */
  release: number;
  /** Input below this is treated as silence. */
  gate: number;
  /** Input gain before soft clipping. */
  gain: number;
  /** Onset sensitivity (0 disables onset pulses). */
  onset: number;
}

export interface MurmulloParams {
  palette: MurmulloPalette;
  shape: MurmulloShapeParams;
  material: MurmulloMaterialParams;
  eyes: MurmulloEyeParams;
  motion: MurmulloMotionParams;
  audio: MurmulloAudioParams;
}

export type MurmulloParamsPatch = {
  [K in keyof MurmulloParams]?: Partial<MurmulloParams[K]>;
};

/** Per-frame output of the engine. Normalised, renderer-agnostic. */
export interface MurmulloPose {
  time: number;
  /** Body transform */
  scaleX: number;
  scaleY: number;
  scale: number;
  tilt: number; // radians
  offsetX: number; // body radii
  offsetY: number; // body radii
  /** Surface */
  flowAmp: number;
  flowSpeed: number;
  flowPhase: number;
  /** 0..1 smoothed audio envelope */
  level: number;
  /** 0..1 short pulse on onsets */
  pulse: number;
  /** Look */
  glow: number;
  opacity: number;
  ghost: number;
  hueShift: number;
  /** Eyes */
  eyeOpen: number; // 0 closed .. 1 open (can exceed 1 when surprised)
  eyeSmile: number; // 0..1 closed happy arcs ^ ^
  eyeDroop: number; // 0..1 sad tilt
  eyeLookX: number; // -1..1
  eyeLookY: number; // -1..1
  eyeSpacing: number; // multiplier
  eyeSize: number; // multiplier
  /** Accents */
  arcs: number; // motion arcs beside the body (listening)
  sparkle: number; // sparkles around (processing)
  rays: number; // radiating lines above (done)
  trail: number; // ghost trail dots (vanishing)
}
