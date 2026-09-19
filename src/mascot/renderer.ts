import type { MurmulloEngine } from './engine';
import type { MurmulloParamsPatch, MurmulloState } from './types';

/** Common surface of both renderers so they can be swapped at runtime. */
export interface MurmulloRenderer {
  readonly kind: '3d' | '2d';
  readonly engine: MurmulloEngine;
  readonly element: HTMLElement | SVGSVGElement;
  setState(state: MurmulloState): void;
  /** Raw loudness 0..1 */
  pushLevel(level: number): void;
  setParams(patch: MurmulloParamsPatch): void;
  resize(): void;
  /** Pause/resume the internal animation loop. */
  setRunning(running: boolean): void;
  dispose(): void;
}

/** Shared RAF loop with delta-time and background-tab safety. */
export function createLoop(step: (dt: number) => void): {
  start(): void;
  stop(): void;
} {
  let raf = 0;
  let last = 0;
  let running = false;
  const tick = (now: number) => {
    if (!running) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
    last = now;
    step(dt);
    raf = window.requestAnimationFrame(tick);
  };
  return {
    start() {
      if (running) return;
      running = true;
      last = 0;
      raf = window.requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      window.cancelAnimationFrame(raf);
    },
  };
}

/** Hex → [r, g, b] in 0..1 */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(
    h.length === 3
      ? h
          .split('')
          .map(c => c + c)
          .join('')
      : h,
    16
  );
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const k = Math.min(1, Math.max(0, t));
  const to = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(ca[0] + (cb[0] - ca[0]) * k)}${to(ca[1] + (cb[1] - ca[1]) * k)}${to(ca[2] + (cb[2] - ca[2]) * k)}`;
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${Math.min(1, Math.max(0, alpha)).toFixed(3)})`;
}
