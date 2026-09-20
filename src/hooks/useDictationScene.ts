import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

export type DictationSceneMode =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'complete'
  | 'error';

export function useDictationScene(): {
  mode: DictationSceneMode;
  level: number;
} {
  const [mode, setMode] = useState<DictationSceneMode>('idle');
  const [level, setLevel] = useState(0);

  useEffect(() => {
    const unlistenState = listen<{
      state?: string;
    }>('recording-state-changed', event => {
      const next = event.payload.state;
      if (next === 'recording') {
        setMode('recording');
        return;
      }
      if (next === 'processing') {
        setMode('processing');
        return;
      }
      if (next === 'done' || next === 'transcription-complete') {
        setMode('complete');
        return;
      }
      if (next === 'error') {
        setMode('error');
        return;
      }
      setMode('idle');
    });

    const unlistenDone = listen('transcription-completed', () => {
      setMode('complete');
      window.setTimeout(() => setMode('idle'), 2800);
    });

    const unlistenLevel = listen<{ level: number }>(
      'audio-level-updated',
      event => {
        setLevel(Math.max(0, Math.min(1, event.payload.level)));
      }
    );

    const unlistenError = listen('error-occurred', () => {
      setMode('error');
      window.setTimeout(() => setMode('idle'), 4000);
    });

    return () => {
      unlistenState.then(fn => fn()).catch(() => undefined);
      unlistenDone.then(fn => fn()).catch(() => undefined);
      unlistenLevel.then(fn => fn()).catch(() => undefined);
      unlistenError.then(fn => fn()).catch(() => undefined);
    };
  }, []);

  return { mode, level };
}
