import { useEffect, useRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color, radius } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { useAppTheme } from '@/contexts/ThemeProvider';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import type { DictationSceneMode } from '@/hooks/useDictationScene';
import {
  createVoiceChamber,
  type ChamberHandle,
} from '@/components/scene/createVoiceChamber';

const styles = stylex.create({
  frame: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    borderColor: color.line,
    borderStyle: 'solid',
    borderWidth: 1,
    minHeight: 240,
    height: '32vh',
    maxHeight: 360,
  },
  canvas: {
    display: 'block',
    width: '100%',
    height: '100%',
  },
  caption: {
    position: 'absolute',
    left: 16,
    bottom: 12,
    margin: 0,
    color: color.muted,
    fontSize: '0.75rem',
    pointerEvents: 'none',
  },
});

function captionFor(mode: DictationSceneMode): string {
  if (mode === 'recording') return 'La membrana sigue el micrófono';
  if (mode === 'processing') return 'Parakeet está leyendo el clip';
  if (mode === 'complete') return 'Texto pegado en la app activa';
  if (mode === 'error') return 'El dictado se detuvo; revisa Runtimes';
  return 'Cámara de voz en reposo';
}

export default function VoiceChamber({
  mode,
  level,
}: {
  mode: DictationSceneMode;
  level: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleRef = useRef<ChamberHandle | null>(null);
  const reduced = usePrefersReducedMotion();
  const { resolvedTheme } = useAppTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    try {
      handleRef.current = createVoiceChamber(canvas, {
        reducedMotion: reduced,
        colorMode: resolvedTheme,
      });
    } catch {
      handleRef.current = null;
      return undefined;
    }

    const onResize = () => handleRef.current?.resize();
    window.addEventListener('resize', onResize);
    const observer = new ResizeObserver(onResize);
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      observer.disconnect();
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [reduced, resolvedTheme]);

  useEffect(() => {
    handleRef.current?.setMode(mode);
    handleRef.current?.setLevel(level);
  }, [mode, level]);

  return (
    <figure {...sx(styles.frame)} aria-label="Cámara de voz">
      <canvas ref={canvasRef} {...sx(styles.canvas)} />
      <figcaption {...sx(styles.caption)}>{captionFor(mode)}</figcaption>
    </figure>
  );
}
