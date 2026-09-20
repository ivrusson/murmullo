import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { sceneModeToState } from './engine';
import type { MurmulloRenderer } from './renderer';
import { createMurmullo2D } from './svg/createMurmullo2D';
import type { MurmulloState } from './types';

export type MurmulloSceneMode = Parameters<typeof sceneModeToState>[0];

export type MurmulloViewProps = {
  kind?: '2d' | '3d';
  state?: MurmulloState;
  /** app dictation mode; mapped via sceneModeToState if state not given */
  sceneMode?: MurmulloSceneMode;
  /** 0..1 raw loudness */
  level?: number;
  /** css px, default 88 */
  size?: number;
  /** `haze` expands the 2D viewBox so aura/smoke is not clipped */
  frame?: 'body' | 'haze';
  reducedMotion?: boolean;
  className?: string;
  interactive?: boolean;
};

function resolveState(
  state: MurmulloState | undefined,
  sceneMode: MurmulloSceneMode | undefined
): MurmulloState {
  if (state !== undefined) return state;
  if (sceneMode !== undefined) return sceneModeToState(sceneMode);
  return 'idle';
}

function clampLevel(level: number): number {
  return Math.min(1, Math.max(0, level));
}

/**
 * React host for the framework-agnostic mascot renderers.
 * Audio envelope lives inside the engine — this only calls `pushLevel` / `setState`.
 */
export function MurmulloView({
  kind = '2d',
  state,
  sceneMode,
  level,
  size = 88,
  frame = 'body',
  reducedMotion: reducedMotionProp,
  className,
  interactive = true,
}: MurmulloViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MurmulloRenderer | null>(null);

  const prefersReduced = usePrefersReducedMotion();
  const reducedMotion = reducedMotionProp ?? prefersReduced;
  const resolvedState = resolveState(state, sceneMode);

  const stateRef = useRef(resolvedState);
  const levelRef = useRef(level);
  const reducedRef = useRef(reducedMotion);
  stateRef.current = resolvedState;
  levelRef.current = level;
  reducedRef.current = reducedMotion;

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let cancelled = false;
    let renderer: MurmulloRenderer | null = null;

    const sync = (next: MurmulloRenderer) => {
      next.setParams({ motion: { reducedMotion: reducedRef.current } });
      next.setState(stateRef.current);
      const currentLevel = levelRef.current;
      if (typeof currentLevel === 'number') {
        next.pushLevel(clampLevel(currentLevel));
      }
      next.resize();
    };

    const attach = (next: MurmulloRenderer) => {
      if (cancelled) {
        next.dispose();
        return;
      }
      renderer = next;
      rendererRef.current = next;
      sync(next);
    };

    if (kind === '3d') {
      const canvas = canvasRef.current;
      if (!canvas) return undefined;
      void import('./three/createMurmullo3D').then(({ createMurmullo3D }) => {
        if (cancelled) return;
        attach(
          createMurmullo3D(canvas, {
            state: stateRef.current,
            params: { motion: { reducedMotion: reducedRef.current } },
          })
        );
      });
    } else {
      attach(
        createMurmullo2D(host, {
          state: stateRef.current,
          params: { motion: { reducedMotion: reducedRef.current } },
          frame,
        })
      );
    }

    const onResize = () => rendererRef.current?.resize();
    const onVisibility = () => {
      rendererRef.current?.setRunning(!document.hidden);
    };

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    const observer = new ResizeObserver(onResize);
    observer.observe(host);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      observer.disconnect();
      renderer?.dispose();
      rendererRef.current = null;
    };
  }, [kind, frame]);

  useEffect(() => {
    rendererRef.current?.setState(resolvedState);
  }, [resolvedState]);

  useEffect(() => {
    if (typeof level === 'number') {
      rendererRef.current?.pushLevel(clampLevel(level));
    }
  }, [level]);

  useEffect(() => {
    rendererRef.current?.setParams({ motion: { reducedMotion } });
  }, [reducedMotion]);

  useEffect(() => {
    rendererRef.current?.resize();
  }, [size]);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{
        width: size,
        height: size,
        position: 'relative',
        flexShrink: 0,
        overflow: 'visible',
        background: 'transparent',
        pointerEvents: interactive ? 'auto' : 'none',
        userSelect: 'none',
      }}
      aria-hidden={interactive ? undefined : true}
    >
      {kind === '3d' ? (
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Murmullo"
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            background: 'transparent',
          }}
        />
      ) : null}
    </div>
  );
}
