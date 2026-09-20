import { MurmulloEngine, type MurmulloEngineOptions } from '../engine';
import { SimplexNoise } from '../noise';
import { createLoop, mixHex, rgba, type MurmulloRenderer } from '../renderer';
import type {
  MurmulloParams,
  MurmulloParamsPatch,
  MurmulloPose,
  MurmulloState,
} from '../types';

export interface Murmullo2DOptions extends MurmulloEngineOptions {
  /** Number of spline samples around the blob (≥ 32 keeps the noise smooth). */
  points?: number;
  autoStart?: boolean;
  /**
   * SVG viewBox. `haze` leaves room for the floor aura and sparkles so the
   * character is not clipped to a hard square. Default `body` matches the 3D
   * camera framing.
   */
  frame?: 'body' | 'haze';
}

const VIEWBOX = {
  body: '-2.5 -2.3 5 4.6',
  haze: '-3.6 -3.5 7.2 7.2',
} as const;

const NS = 'http://www.w3.org/2000/svg';
const SPARKLE_COUNT = 5;
const RAY_COUNT = 5;
const TRAIL_COUNT = 3;
let instanceCounter = 0;

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  parent?: Element
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, String(v)));
  parent?.appendChild(node);
  return node;
}

const f = (n: number) => (Math.abs(n) < 1e-4 ? '0' : n.toFixed(3));

/** Closed Catmull-Rom spline → cubic Bézier path. */
function splinePath(pts: Array<[number, number]>): string {
  const n = pts.length;
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n; i += 1) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${f(c1x)},${f(c1y)} ${f(c2x)},${f(c2y)} ${f(p2[0])},${f(p2[1])}`;
  }
  return `${d}Z`;
}

function arcPath(
  rx: number,
  ry: number,
  from: number,
  to: number,
  steps = 14
): string {
  let d = '';
  for (let i = 0; i <= steps; i += 1) {
    const a = from + ((to - from) * i) / steps;
    d += `${i === 0 ? 'M' : 'L'}${f(Math.cos(a) * rx)},${f(-Math.sin(a) * ry)}`;
  }
  return d;
}

function starPath(s: number): string {
  const k = s * 0.28;
  return `M0,${f(-s)}L${f(k)},${f(-k)}L${f(s)},0L${f(k)},${f(k)}L0,${f(s)}L${f(-k)},${f(k)}L${f(-s)},0L${f(-k)},${f(-k)}Z`;
}

interface Eye {
  group: SVGGElement;
  glow: SVGEllipseElement;
  open: SVGEllipseElement;
  smile: SVGPathElement;
  side: -1 | 1;
}

/**
 * SVG renderer for the Murmullo mascot. Same engine and pose as the 3D
 * version; the body is a Catmull-Rom blob whose radius is modulated by the
 * same seeded lobes + flowing noise + audio ring.
 */
export function createMurmullo2D(
  host: HTMLElement,
  options: Murmullo2DOptions = {}
): MurmulloRenderer {
  const engine = new MurmulloEngine(options);
  let params: MurmulloParams = engine.params;
  let noise = new SimplexNoise(params.shape.seed);
  const id = `murmullo-${(instanceCounter += 1)}`;
  const pointCount = options.points ?? 40;
  // the 3D eyes sit on the front of the body, closer to the camera; scale the
  // 2D eyes up a touch so both renderers read the same
  const EYE_PARITY = 1.2;

  const svg = el('svg', {
    viewBox: VIEWBOX[options.frame ?? 'body'],
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-label': 'Murmullo',
    overflow: 'visible',
  });
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.display = 'block';
  svg.style.overflow = 'visible';
  host.appendChild(svg);

  // ---------------------------------------------------------------- defs
  const defs = el('defs', {}, svg);
  const bodyGrad = el(
    'radialGradient',
    {
      id: `${id}-body`,
      cx: '0.4',
      cy: '0.32',
      r: '0.78',
      fx: '0.36',
      fy: '0.28',
    },
    defs
  );
  const gradStops = [
    el('stop', { offset: '0' }, bodyGrad),
    el('stop', { offset: '0.45' }, bodyGrad),
    el('stop', { offset: '0.82' }, bodyGrad),
    el('stop', { offset: '1' }, bodyGrad),
  ];
  const iridGrad = el(
    'linearGradient',
    { id: `${id}-irid`, x1: '0', y1: '0', x2: '1', y2: '1' },
    defs
  );
  const iridStops = [
    el('stop', { offset: '0' }, iridGrad),
    el('stop', { offset: '0.5' }, iridGrad),
    el('stop', { offset: '1' }, iridGrad),
  ];
  const makeBlur = (name: string, sd: number) => {
    const filter = el(
      'filter',
      {
        id: `${id}-${name}`,
        x: '-5',
        y: '-5',
        width: '10',
        height: '10',
        filterUnits: 'userSpaceOnUse',
      },
      defs
    );
    el('feGaussianBlur', { stdDeviation: sd }, filter);
    return filter;
  };
  makeBlur('blur-aura', 0.22);
  makeBlur('blur-shadow', 0.1);
  makeBlur('blur-rim', 0.06);
  makeBlur('blur-eye', 0.09);
  makeBlur('blur-hi', 0.08);

  // ---------------------------------------------------------------- floor
  const aura = el(
    'ellipse',
    { cx: 0, cy: 1.42, filter: `url(#${id}-blur-aura)` },
    svg
  );
  const shadow = el(
    'ellipse',
    { cx: 0, cy: 1.4, filter: `url(#${id}-blur-shadow)` },
    svg
  );

  // ---------------------------------------------------------------- body
  const bodyGroup = el('g', {}, svg);
  const rimGlow = el(
    'path',
    {
      fill: 'none',
      'stroke-width': 0.1,
      filter: `url(#${id}-blur-rim)`,
      'stroke-linejoin': 'round',
    },
    bodyGroup
  );
  const body = el('path', { fill: `url(#${id}-body)` }, bodyGroup);
  const irid = el(
    'path',
    {
      fill: 'none',
      stroke: `url(#${id}-irid)`,
      'stroke-width': 0.05,
      'stroke-linejoin': 'round',
    },
    bodyGroup
  );
  const highlight = el(
    'ellipse',
    {
      fill: '#ffffff',
      filter: `url(#${id}-blur-hi)`,
      cx: -0.55,
      cy: -0.55,
      rx: 0.42,
      ry: 0.2,
    },
    bodyGroup
  );

  const makeEye = (side: -1 | 1): Eye => {
    const group = el('g', {}, bodyGroup);
    const glow = el('ellipse', { filter: `url(#${id}-blur-eye)` }, group);
    const open = el('ellipse', {}, group);
    const smile = el(
      'path',
      { fill: 'none', 'stroke-linecap': 'round' },
      group
    );
    return { group, glow, open, smile, side };
  };
  const eyes: Eye[] = [makeEye(-1), makeEye(1)];

  // ---------------------------------------------------------------- accents
  const accents = el('g', {}, svg);
  const arcs = [-1, 1].map(side =>
    el(
      'path',
      {
        fill: 'none',
        'stroke-width': 0.045,
        'stroke-linecap': 'round',
        'data-side': side,
      },
      accents
    )
  );
  const sparkles = Array.from({ length: SPARKLE_COUNT }, () =>
    el('path', {}, accents)
  );
  const rays = Array.from({ length: RAY_COUNT }, () =>
    el('line', { 'stroke-width': 0.045, 'stroke-linecap': 'round' }, accents)
  );
  const trail = Array.from({ length: TRAIL_COUNT }, () =>
    el('circle', {}, accents)
  );

  // ---------------------------------------------------------------- params → static attrs
  const applyParams = () => {
    params = engine.params;
    noise = new SimplexNoise(params.shape.seed);
    const { palette, material } = params;
    const lit = mixHex(palette.deep, palette.rim, 0.25 * material.translucency);
    gradStops[0].setAttribute('stop-color', lit);
    gradStops[1].setAttribute('stop-color', palette.core);
    gradStops[2].setAttribute(
      'stop-color',
      mixHex(palette.core, palette.deep, 0.5)
    );
    gradStops[3].setAttribute(
      'stop-color',
      mixHex(palette.deep, palette.rim, 0.55 * material.translucency + 0.15)
    );
    iridStops[0].setAttribute('stop-color', palette.glowA);
    iridStops[1].setAttribute('stop-color', palette.rim);
    iridStops[2].setAttribute('stop-color', palette.glowB);
    irid.setAttribute('stroke-opacity', String(material.iridescence * 0.7));
    highlight.setAttribute('opacity', String(0.1 + material.gloss * 0.2));
    aura.setAttribute('fill', palette.aura);
    shadow.setAttribute('fill', palette.core);
    arcs.forEach(a => a.setAttribute('stroke', palette.rim));
    sparkles.forEach((s, i) =>
      s.setAttribute(
        'fill',
        palette[(['glowA', 'glowB', 'rim'] as const)[i % 3]]
      )
    );
    rays.forEach(r => r.setAttribute('stroke', palette.deep));
    trail.forEach(c => c.setAttribute('fill', palette.ghost));
  };

  // ---------------------------------------------------------------- per frame
  const pts: Array<[number, number]> = Array.from(
    { length: pointCount },
    () => [0, 0]
  );

  const buildBody = (pose: MurmulloPose) => {
    const { shape } = params;
    const a = shape.aspect;
    for (let i = 0; i < pointCount; i += 1) {
      const th = (i / pointCount) * Math.PI * 2;
      const cx = Math.cos(th);
      const sy = Math.sin(th);
      // ellipse radius at this angle
      const base = 1 / Math.sqrt((cx * cx) / (a * a) + sy * sy);
      let r = base;
      const lobes = noise.noise3(
        cx * shape.lobeFrequency + shape.seed * 0.7,
        sy * shape.lobeFrequency,
        shape.seed * 0.4
      );
      r += lobes * shape.asymmetry;
      // flatter, heavier bottom (smooth so the spline doesn't cusp)
      const bottom = Math.max(0, -sy - 0.2) / 0.8;
      r -= bottom * bottom * 0.08 * shape.asymmetry * 4;
      const flow =
        noise.noise3(
          cx * 1.45,
          sy * 1.45 + pose.flowPhase * 0.55,
          pose.flowPhase * 0.35
        ) *
          0.11 +
        noise.noise3(
          cx * 3.0 - pose.flowPhase * 0.4,
          sy * 3.0,
          pose.flowPhase * 0.6
        ) *
          0.014;
      r += flow * pose.flowAmp;
      r +=
        Math.sin(sy * 4 - pose.flowPhase * 6) * pose.level * 0.05 +
        pose.pulse * 0.04;
      pts[i][0] = cx * r;
      pts[i][1] = -sy * r;
    }
    return splinePath(pts);
  };

  const placeEye = (eye: Eye, pose: MurmulloPose) => {
    const e = params.eyes;
    const size = e.size * pose.eyeSize * EYE_PARITY;
    const x =
      eye.side * e.spacing * pose.eyeSpacing * EYE_PARITY + pose.eyeLookX * 0.1;
    const y = -(e.height + pose.eyeLookY * 0.08);
    const rot = -eye.side * e.tilt + eye.side * pose.eyeDroop * 26;
    eye.group.setAttribute(
      'transform',
      `translate(${f(x)},${f(y)}) rotate(${f(rot)})`
    );

    const open = Math.max(0, pose.eyeOpen);
    const rx = size * e.aspect * (1 + (1 - Math.min(1, open)) * 0.15);
    eye.open.setAttribute('rx', f(rx));
    eye.open.setAttribute('ry', f(Math.max(0.002, size * open)));
    eye.open.setAttribute('opacity', open > 0.01 ? '1' : '0');

    const smile = pose.eyeSmile;
    const w = size * 0.9;
    const h = size * 0.75 * smile;
    eye.smile.setAttribute(
      'd',
      `M${f(-w)},${f(h * 0.4)}Q0,${f(-h)} ${f(w)},${f(h * 0.4)}`
    );
    eye.smile.setAttribute('stroke-width', f(size * 0.34));
    eye.smile.setAttribute('opacity', String(Math.min(1, smile * 1.4)));

    const glowStrength =
      e.glow * (0.5 + pose.glow * 0.6) * Math.max(open, smile * 0.8);
    eye.glow.setAttribute('rx', f(rx * 1.9));
    eye.glow.setAttribute('ry', f(size * 1.6));
    eye.glow.setAttribute('opacity', String(glowStrength * 0.55));
  };

  const step = (dt: number) => {
    const pose = engine.update(dt);
    const { shape, palette, material } = params;
    const tiltDeg = (-pose.tilt * 180) / Math.PI;

    bodyGroup.setAttribute(
      'transform',
      `translate(${f(pose.offsetX)},${f(-pose.offsetY)}) rotate(${f(tiltDeg)}) scale(${f(pose.scaleX)},${f(pose.scaleY)})`
    );
    bodyGroup.setAttribute('opacity', String(pose.opacity));

    const d = buildBody(pose);
    body.setAttribute('d', d);
    rimGlow.setAttribute('d', d);
    irid.setAttribute('d', d);

    // rim colour follows hue shift (error → warm, vanishing → ghost)
    let rimCol = palette.rim;
    if (pose.hueShift < 0)
      rimCol = mixHex(palette.rim, palette.glowA, -pose.hueShift);
    if (pose.hueShift > 0)
      rimCol = mixHex(palette.rim, palette.ghost, pose.hueShift);
    rimGlow.setAttribute('stroke', rimCol);
    rimGlow.setAttribute(
      'stroke-opacity',
      String((0.25 + pose.glow * 0.6) * material.rim)
    );
    rimGlow.setAttribute('stroke-width', f(0.08 + pose.glow * 0.08));

    // ghost tint: lighten the whole body when in the background
    body.setAttribute('opacity', String(1 - pose.ghost * 0.35));
    gradStops[3].setAttribute(
      'stop-color',
      mixHex(
        mixHex(palette.deep, rimCol, 0.55 * material.translucency + 0.15),
        palette.ghost,
        pose.ghost * 0.6
      )
    );

    highlight.setAttribute(
      'cx',
      f(-0.55 * shape.aspect + pose.eyeLookX * 0.05)
    );

    // eyes turn ghostly blue while fading away
    const eyeCol =
      pose.ghost > 0.01
        ? mixHex(palette.eye, palette.ghost, pose.ghost * 0.75)
        : palette.eye;
    eyes.forEach(eye => {
      eye.open.setAttribute('fill', eyeCol);
      eye.glow.setAttribute('fill', eyeCol);
      eye.smile.setAttribute('stroke', eyeCol);
      placeEye(eye, pose);
    });

    // floor
    const auraScale = 1 + pose.level * 0.2;
    aura.setAttribute('cx', f(pose.offsetX * 0.6));
    aura.setAttribute('rx', f(shape.aspect * 1.25 * auraScale * pose.scaleX));
    aura.setAttribute('ry', f(0.32 * auraScale));
    aura.setAttribute(
      'opacity',
      String((0.2 + pose.glow * 0.35) * pose.opacity * (1 - pose.ghost * 0.6))
    );
    shadow.setAttribute('cx', f(pose.offsetX * 0.8));
    shadow.setAttribute('rx', f(shape.aspect * 0.85 * pose.scaleX));
    shadow.setAttribute('ry', f(0.14));
    shadow.setAttribute(
      'opacity',
      String(0.16 * pose.opacity * (1 - pose.ghost))
    );

    // accents
    const t = pose.time;
    accents.setAttribute(
      'transform',
      `translate(${f(pose.offsetX)},${f(-pose.offsetY)})`
    );

    arcs.forEach((arc, i) => {
      const side = i === 0 ? -1 : 1;
      const wob = 1 + Math.sin(t * 4.2 + i) * 0.03 + pose.level * 0.12;
      const centre = side > 0 ? 0 : Math.PI;
      arc.setAttribute(
        'd',
        arcPath(
          1.5 * shape.aspect * wob,
          1.5 * wob,
          centre - 0.42,
          centre + 0.42
        )
      );
      arc.setAttribute('opacity', String(pose.arcs * 0.7 * pose.opacity));
    });

    sparkles.forEach((s, i) => {
      const ang = (i / SPARKLE_COUNT) * Math.PI * 2 + t * 0.55;
      const r = shape.aspect + 0.45 + Math.sin(t * 1.3 + i) * 0.08;
      const x = Math.cos(ang) * r;
      const y = -(Math.sin(ang * 1.3 + i) * 0.85 + 0.15);
      const twinkle = 0.4 + 0.6 * Math.max(0, Math.sin(t * 3.1 + i * 1.7));
      s.setAttribute('d', starPath(0.07 + twinkle * 0.06));
      s.setAttribute(
        'transform',
        `translate(${f(x)},${f(y)}) rotate(${f(t * 40 + i * 30)})`
      );
      s.setAttribute('opacity', String(pose.sparkle * twinkle * pose.opacity));
    });

    const grow = 1 + (1 - pose.rays) * 0.3 + Math.sin(t * 6) * 0.02;
    rays.forEach((line, i) => {
      const ang = ((50 + (80 / (RAY_COUNT - 1)) * i) * Math.PI) / 180;
      const cx = Math.cos(ang) * shape.aspect;
      const cy = -Math.sin(ang);
      const r0 = 1.2 * grow;
      const r1 = r0 + 0.22 + (i % 2) * 0.08;
      line.setAttribute('x1', f(cx * r0));
      line.setAttribute('y1', f(cy * r0));
      line.setAttribute('x2', f(cx * r1));
      line.setAttribute('y2', f(cy * r1));
      line.setAttribute('opacity', String(pose.rays * 0.7 * pose.opacity));
    });

    trail.forEach((c, i) => {
      const lag = (i + 1) * 0.55;
      c.setAttribute('cx', f(-(shape.aspect + 0.25) - lag * pose.trail));
      c.setAttribute('cy', f(-(0.1 - i * 0.12 + Math.sin(t * 2 + i) * 0.04)));
      c.setAttribute('r', f(0.2 - i * 0.05));
      c.setAttribute(
        'fill',
        rgba(palette.ghost, pose.trail * (0.32 - i * 0.08))
      );
    });
  };

  applyParams();
  step(0);
  const loop = createLoop(step);
  if (options.autoStart !== false) loop.start();

  return {
    kind: '2d',
    engine,
    element: svg,
    setState: (state: MurmulloState) => engine.setState(state),
    pushLevel: (level: number) => engine.pushLevel(level),
    setParams: (patch: MurmulloParamsPatch) => {
      engine.setParams(patch);
      applyParams();
    },
    resize: () => {
      /* SVG scales through its viewBox */
    },
    setRunning: (running: boolean) => (running ? loop.start() : loop.stop()),
    dispose: () => {
      loop.stop();
      svg.remove();
    },
  };
}
