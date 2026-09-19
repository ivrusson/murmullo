/**
 * Standalone sandbox for the Murmullo mascot.
 * Served by Vite at /mascot-sandbox.html — not part of the Tauri build.
 */
import {
  DEFAULT_PARAMS,
  MURMULLO_STATES,
  PALETTES,
  PALETTE_LABELS,
  PERSONALITIES,
  STATE_LABELS,
  createMicLevelSource,
  createMurmullo2D,
  createMurmullo3D,
  createSyntheticLevelSource,
  mergeParams,
  type LevelSource,
  type MurmulloPaletteName,
  type MurmulloParams,
  type MurmulloParamsPatch,
  type MurmulloRenderer,
  type MurmulloState,
} from '..';

type RendererMode = '3d' | '2d' | 'both';
type AudioMode = 'none' | 'synthetic' | 'mic';

const $ = <T extends Element>(sel: string): T => {
  const node = document.querySelector<T>(sel);
  if (!node) throw new Error(`Missing ${sel}`);
  return node;
};

const app = $<HTMLDivElement>('#app');
const stageWrap = $<HTMLElement>('#stage-wrap');
const statesBar = $<HTMLElement>('#states');
const meter = $<HTMLElement>('#meter');
const audioHint = $<HTMLParagraphElement>('#audio-hint');
const slidersSection = $<HTMLElement>('#sliders');

// ------------------------------------------------------------------ state
let params: MurmulloParams = mergeParams(DEFAULT_PARAMS, PERSONALITIES.curioso);
let paletteName: MurmulloPaletteName = 'aurora';
let state: MurmulloState = 'idle';
let renderers: MurmulloRenderer[] = [];
let rendererMode: RendererMode = '3d';
let audioSource: LevelSource | null = null;
let audioMode: AudioMode = 'none';
let autocycleTimer = 0;

// ------------------------------------------------------------------ stages
function makeStage(kind: '3d' | '2d'): MurmulloRenderer {
  const stage = document.createElement('div');
  stage.className = 'stage';
  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.textContent = kind === '3d' ? 'three.js · shader' : 'svg · spline';
  stage.appendChild(tag);

  let renderer: MurmulloRenderer;
  if (kind === '3d') {
    const canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    stageWrap.appendChild(stage);
    renderer = createMurmullo3D(canvas, { params, state });
  } else {
    const host = document.createElement('div');
    host.style.position = 'absolute';
    host.style.inset = '0';
    stage.appendChild(host);
    stageWrap.appendChild(stage);
    renderer = createMurmullo2D(host, { params, state });
  }

  const caption = document.createElement('div');
  caption.className = 'caption';
  caption.innerHTML = `<strong></strong><span></span>`;
  stage.appendChild(caption);
  return renderer;
}

function mountRenderers(): void {
  renderers.forEach(r => r.dispose());
  renderers = [];
  stageWrap.innerHTML = '';
  stageWrap.classList.toggle('both', rendererMode === 'both');
  if (rendererMode === '3d' || rendererMode === 'both')
    renderers.push(makeStage('3d'));
  if (rendererMode === '2d' || rendererMode === 'both')
    renderers.push(makeStage('2d'));
  renderers.forEach(r => r.resize());
  updateCaptions();
}

function updateCaptions(): void {
  const label = STATE_LABELS[state];
  stageWrap.querySelectorAll<HTMLElement>('.caption').forEach(caption => {
    caption.querySelector('strong')!.textContent = label.title;
    caption.querySelector('span')!.textContent = label.sub;
  });
}

function applyParams(patch: MurmulloParamsPatch): void {
  params = mergeParams(params, patch);
  renderers.forEach(r => r.setParams(patch));
}

function setState(next: MurmulloState): void {
  state = next;
  renderers.forEach(r => r.setState(next));
  statesBar.querySelectorAll<HTMLButtonElement>('button').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.state === next));
  });
  updateCaptions();
}

// ------------------------------------------------------------------ segmented controls
function bindSegment(
  selector: string,
  attr: string,
  onSelect: (value: string) => void
): void {
  const seg = $<HTMLElement>(selector);
  seg.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      'button'
    );
    if (!button) return;
    const value = button.dataset[attr];
    if (!value) return;
    seg
      .querySelectorAll('button')
      .forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    onSelect(value);
  });
}

bindSegment('#renderer-seg', 'renderer', value => {
  rendererMode = value as RendererMode;
  mountRenderers();
});

bindSegment('#personality-seg', 'personality', value => {
  applyParams(PERSONALITIES[value as keyof typeof PERSONALITIES]);
  syncSliders();
});

bindSegment('#audio-seg', 'audio', value => {
  void setAudioMode(value as AudioMode);
});

async function setAudioMode(mode: AudioMode): Promise<void> {
  audioSource?.stop();
  audioSource = null;
  audioMode = mode;
  audioHint.textContent =
    'Con «Escuchando» o «Hablando» el nivel deforma el cuerpo y el brillo.';
  if (mode === 'synthetic') {
    audioSource = createSyntheticLevelSource();
    if (state === 'idle') setState('listening');
  } else if (mode === 'mic') {
    try {
      audioSource = await createMicLevelSource();
      audioHint.textContent = 'Micrófono activo. Habla y observa cómo respira.';
      if (state === 'idle') setState('listening');
    } catch (error) {
      audioHint.textContent = `No se pudo abrir el micrófono: ${error instanceof Error ? error.message : String(error)}`;
      audioMode = 'none';
    }
  }
}

// ------------------------------------------------------------------ palette swatches
const swatches = $<HTMLElement>('#swatches');
(Object.keys(PALETTES) as MurmulloPaletteName[]).forEach(name => {
  const p = PALETTES[name];
  const button = document.createElement('button');
  button.className = 'swatch';
  button.title = PALETTE_LABELS[name];
  button.setAttribute('aria-pressed', String(name === paletteName));
  button.style.background = `radial-gradient(circle at 35% 30%, ${p.deep}, ${p.core} 60%, ${p.rim})`;
  button.addEventListener('click', () => {
    paletteName = name;
    swatches
      .querySelectorAll('button')
      .forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    applyParams({ palette: PALETTES[name] });
  });
  swatches.appendChild(button);
});

// ------------------------------------------------------------------ sliders
interface SliderDef {
  label: string;
  group: keyof Omit<MurmulloParams, 'palette'>;
  key: string;
  min: number;
  max: number;
  step: number;
}

const SLIDERS: SliderDef[] = [
  {
    label: 'Aspecto',
    group: 'shape',
    key: 'aspect',
    min: 0.9,
    max: 1.8,
    step: 0.01,
  },
  {
    label: 'Asimetría',
    group: 'shape',
    key: 'asymmetry',
    min: 0,
    max: 0.5,
    step: 0.01,
  },
  {
    label: 'Lóbulos',
    group: 'shape',
    key: 'lobeFrequency',
    min: 0.5,
    max: 2.5,
    step: 0.05,
  },
  {
    label: 'Translucidez',
    group: 'material',
    key: 'translucency',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    label: 'Iridiscencia',
    group: 'material',
    key: 'iridescence',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    label: 'Borde',
    group: 'material',
    key: 'rim',
    min: 0,
    max: 1.5,
    step: 0.01,
  },
  {
    label: 'Brillo',
    group: 'material',
    key: 'gloss',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    label: 'Ojos · tamaño',
    group: 'eyes',
    key: 'size',
    min: 0.08,
    max: 0.3,
    step: 0.005,
  },
  {
    label: 'Ojos · separación',
    group: 'eyes',
    key: 'spacing',
    min: 0.1,
    max: 0.5,
    step: 0.005,
  },
  {
    label: 'Ojos · altura',
    group: 'eyes',
    key: 'height',
    min: -0.3,
    max: 0.4,
    step: 0.01,
  },
  {
    label: 'Ojos · inclinación',
    group: 'eyes',
    key: 'tilt',
    min: -15,
    max: 25,
    step: 0.5,
  },
  {
    label: 'Flujo · velocidad',
    group: 'motion',
    key: 'flowSpeed',
    min: 0,
    max: 3,
    step: 0.05,
  },
  {
    label: 'Flujo · amplitud',
    group: 'motion',
    key: 'flowAmp',
    min: 0,
    max: 2.5,
    step: 0.05,
  },
  {
    label: 'Reactividad',
    group: 'motion',
    key: 'reactivity',
    min: 0,
    max: 3,
    step: 0.05,
  },
  {
    label: 'Squash',
    group: 'motion',
    key: 'squash',
    min: 0,
    max: 3,
    step: 0.05,
  },
  {
    label: 'Mirada',
    group: 'motion',
    key: 'gazeWander',
    min: 0,
    max: 2,
    step: 0.05,
  },
  {
    label: 'Ataque (s)',
    group: 'audio',
    key: 'attack',
    min: 0.01,
    max: 0.3,
    step: 0.005,
  },
  {
    label: 'Release (s)',
    group: 'audio',
    key: 'release',
    min: 0.05,
    max: 1.2,
    step: 0.01,
  },
];

const sliderInputs = new Map<
  string,
  { input: HTMLInputElement; output: HTMLOutputElement; def: SliderDef }
>();

SLIDERS.forEach(def => {
  const row = document.createElement('div');
  row.className = 'row';
  const label = document.createElement('label');
  label.textContent = def.label;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(def.min);
  input.max = String(def.max);
  input.step = String(def.step);
  const output = document.createElement('output');
  row.append(label, input, output);
  slidersSection.appendChild(row);
  const id = `${def.group}.${def.key}`;
  sliderInputs.set(id, { input, output, def });
  input.addEventListener('input', () => {
    const value = Number(input.value);
    output.value = value.toFixed(def.step < 0.01 ? 3 : 2);
    applyParams({ [def.group]: { [def.key]: value } } as MurmulloParamsPatch);
  });
});

function syncSliders(): void {
  sliderInputs.forEach(({ input, output, def }) => {
    const group = params[def.group] as unknown as Record<string, number>;
    const value = group[def.key];
    input.value = String(value);
    output.value = value.toFixed(def.step < 0.01 ? 3 : 2);
  });
}
syncSliders();

// ------------------------------------------------------------------ motion toggles
$<HTMLInputElement>('#reduced').addEventListener('change', event => {
  applyParams({
    motion: { reducedMotion: (event.target as HTMLInputElement).checked },
  });
});

$<HTMLInputElement>('#autocycle').addEventListener('change', event => {
  window.clearInterval(autocycleTimer);
  if ((event.target as HTMLInputElement).checked) {
    const cycle: MurmulloState[] = [
      'idle',
      'listening',
      'speaking',
      'processing',
      'done',
      'vanishing',
      'background',
    ];
    let i = 0;
    autocycleTimer = window.setInterval(() => {
      i = (i + 1) % cycle.length;
      setState(cycle[i]);
    }, 2800);
  }
});

$<HTMLButtonElement>('#reseed').addEventListener('click', () => {
  applyParams({ shape: { seed: Math.floor(Math.random() * 1000) } });
});

$<HTMLButtonElement>('#toggle-theme').addEventListener('click', () => {
  document.body.classList.toggle('dark');
});

$<HTMLButtonElement>('#toggle-panel').addEventListener('click', () => {
  app.classList.toggle('no-panel');
  requestAnimationFrame(() => renderers.forEach(r => r.resize()));
});

// ------------------------------------------------------------------ state chips
MURMULLO_STATES.forEach((name, index) => {
  const button = document.createElement('button');
  button.className = 'state';
  button.dataset.state = name;
  button.setAttribute('aria-pressed', String(name === state));
  button.innerHTML = `${STATE_LABELS[name].title} <kbd>${index + 1}</kbd>`;
  button.addEventListener('click', () => setState(name));
  statesBar.appendChild(button);
});

window.addEventListener('keydown', event => {
  if ((event.target as HTMLElement).tagName === 'INPUT') return;
  const index = Number(event.key) - 1;
  if (index >= 0 && index < MURMULLO_STATES.length)
    setState(MURMULLO_STATES[index]);
  if (event.key === ' ') {
    event.preventDefault();
    setState(state === 'listening' ? 'processing' : 'listening');
  }
});

// ------------------------------------------------------------------ audio pump
function pumpAudio(): void {
  const level = audioSource ? audioSource.read() : 0;
  renderers.forEach(r => r.pushLevel(level));
  meter.style.width = `${Math.round(level * 100)}%`;
  requestAnimationFrame(pumpAudio);
}

window.addEventListener('resize', () => renderers.forEach(r => r.resize()));
document.addEventListener('visibilitychange', () => {
  renderers.forEach(r => r.setRunning(!document.hidden));
});

mountRenderers();
pumpAudio();
void audioMode;
