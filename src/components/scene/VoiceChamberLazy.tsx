import { lazy, Suspense } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color, radius } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import type { DictationSceneMode } from '@/hooks/useDictationScene';

const VoiceChamber = lazy(() => import('@/components/scene/VoiceChamber'));

const styles = stylex.create({
  fallback: {
    minHeight: 240,
    height: '32vh',
    maxHeight: 360,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    borderColor: color.line,
    borderStyle: 'solid',
    borderWidth: 1,
  },
});

export function VoiceChamberLazy({
  mode,
  level,
}: {
  mode: DictationSceneMode;
  level: number;
}) {
  return (
    <Suspense fallback={<div {...sx(styles.fallback)} aria-hidden />}>
      <VoiceChamber mode={mode} level={level} />
    </Suspense>
  );
}
