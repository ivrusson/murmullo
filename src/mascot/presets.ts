import type {
  MurmulloPalette,
  MurmulloPaletteName,
  MurmulloParams,
  MurmulloParamsPatch,
  MurmulloState,
} from './types';

/** "Variaciones" from the brand sheet. */
export const PALETTES: Record<MurmulloPaletteName, MurmulloPalette> = {
  aurora: {
    core: '#232128',
    deep: '#3E3A4B',
    rim: '#8A7FD6',
    glowA: '#E0837E',
    glowB: '#7AA2C0',
    eye: '#FFFFFF',
    aura: '#8A7FD6',
    ghost: '#7AA2C0',
  },
  bosque: {
    core: '#1F2624',
    deep: '#35443E',
    rim: '#729B79',
    glowA: '#C7B96A',
    glowB: '#7AA2C0',
    eye: '#FFFFFF',
    aura: '#729B79',
    ghost: '#9BC4B0',
  },
  atardecer: {
    core: '#2A211F',
    deep: '#4A3532',
    rim: '#E0837E',
    glowA: '#F2B27A',
    glowB: '#C98CA7',
    eye: '#FFFFFF',
    aura: '#E0837E',
    ghost: '#F2B27A',
  },
  noche: {
    core: '#1A1B2E',
    deep: '#2C2F4F',
    rim: '#5A67D8',
    glowA: '#8A7FD6',
    glowB: '#7AA2C0',
    eye: '#FFFFFF',
    aura: '#5A67D8',
    ghost: '#7AA2C0',
  },
};

export const PALETTE_LABELS: Record<MurmulloPaletteName, string> = {
  aurora: 'Aurora',
  bosque: 'Bosque',
  atardecer: 'Atardecer',
  noche: 'Noche',
};

export const DEFAULT_PARAMS: MurmulloParams = {
  palette: PALETTES.aurora,
  shape: {
    aspect: 1.32,
    depth: 0.92,
    asymmetry: 0.2,
    lobeFrequency: 0.9,
    seed: 7,
  },
  material: {
    translucency: 0.55,
    iridescence: 0.6,
    rim: 0.75,
    gloss: 0.5,
  },
  eyes: {
    size: 0.17,
    spacing: 0.27,
    height: 0.04,
    tilt: 8,
    glow: 0.7,
    aspect: 0.62,
  },
  motion: {
    flowSpeed: 1,
    flowAmp: 1,
    breathAmp: 0.035,
    breathRate: 0.22,
    reactivity: 1,
    squash: 1,
    gazeWander: 1,
    blinkRate: 12,
    reducedMotion: false,
  },
  audio: {
    attack: 0.045,
    release: 0.28,
    gate: 0.03,
    gain: 1.6,
    onset: 1,
  },
};

/** "Personalidad" presets — tweak motion so the same body feels different. */
export const PERSONALITIES: Record<
  'curioso' | 'amigable' | 'expresivo',
  MurmulloParamsPatch
> = {
  curioso: {
    motion: { gazeWander: 1.4, blinkRate: 14, squash: 0.8, reactivity: 0.9 },
    eyes: { size: 0.18, aspect: 0.6 },
  },
  amigable: {
    motion: { gazeWander: 0.6, blinkRate: 10, squash: 0.7, breathAmp: 0.045 },
    eyes: { size: 0.16, aspect: 0.7, height: 0.02 },
  },
  expresivo: {
    motion: { gazeWander: 1, blinkRate: 12, squash: 1.5, reactivity: 1.4 },
    eyes: { size: 0.19, aspect: 0.58, tilt: 12 },
  },
};

export const STATE_LABELS: Record<
  MurmulloState,
  { title: string; sub: string }
> = {
  idle: { title: 'En reposo', sub: 'Discreta, a tu lado.' },
  listening: { title: 'Escuchando', sub: 'Te escucha…' },
  speaking: { title: 'Hablando', sub: 'Tu voz le da forma.' },
  processing: { title: 'Procesando', sub: 'Organizando tus ideas…' },
  done: { title: 'Texto listo', sub: '¡Listo!' },
  vanishing: { title: 'Desapareciendo', sub: 'Vuelve a su lugar.' },
  background: { title: 'En segundo plano', sub: 'Siempre cerca.' },
  error: { title: 'Algo falló', sub: 'Vuelve a intentarlo.' },
};

export const MURMULLO_STATES: MurmulloState[] = [
  'idle',
  'listening',
  'speaking',
  'processing',
  'done',
  'vanishing',
  'background',
  'error',
];

/** Deep-merge a patch onto params (one level of nesting is all we have). */
export function mergeParams(
  base: MurmulloParams,
  patch?: MurmulloParamsPatch | null
): MurmulloParams {
  if (!patch) return base;
  return {
    palette: { ...base.palette, ...(patch.palette ?? {}) },
    shape: { ...base.shape, ...(patch.shape ?? {}) },
    material: { ...base.material, ...(patch.material ?? {}) },
    eyes: { ...base.eyes, ...(patch.eyes ?? {}) },
    motion: { ...base.motion, ...(patch.motion ?? {}) },
    audio: { ...base.audio, ...(patch.audio ?? {}) },
  };
}
