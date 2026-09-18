import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  formatHotkey,
  shortcutFromKeyboardEvent,
  validateHotkey,
} from '@/lib/hotkey';
import { configService } from '@/services/tauri';

interface HotkeyRecorderProps {
  value: string;
  occupied?: string[];
  onChange: (next: string) => void | Promise<void>;
}

export function HotkeyRecorder({
  value,
  occupied = [],
  onChange,
}: HotkeyRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onChangeRef = useRef(onChange);
  const occupiedRef = useRef(occupied);
  onChangeRef.current = onChange;
  occupiedRef.current = occupied;

  useEffect(() => {
    if (!recording) return;

    void configService.unregisterGlobalShortcut().catch(() => undefined);

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'Escape') {
        setRecording(false);
        return;
      }

      const next = shortcutFromKeyboardEvent(event);
      if (!next) return;

      const conflict = validateHotkey(next, occupiedRef.current);
      if (conflict) {
        setError(conflict);
        return;
      }

      void (async () => {
        try {
          await onChangeRef.current(next);
          setError(null);
          setRecording(false);
        } catch (error) {
          const message =
            typeof error === 'string'
              ? error
              : error instanceof Error
                ? error.message
                : 'No se pudo guardar el atajo';
          setError(message);
        }
      })();
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      void configService.registerGlobalShortcut().catch(() => undefined);
    };
  }, [recording]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between vf-inset rounded-xl px-4 py-3">
        <div>
          <div className="text-sm font-medium">Push to talk</div>
          <div className="text-xs text-muted-foreground">
            {recording
              ? 'Pulsa la combinación… Esc cancela'
              : 'Haz clic y pulsa las teclas para cambiar'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setRecording(current => !current);
          }}
          aria-pressed={recording}
          className={cn(
            'font-mono text-xs px-3 py-1 rounded-full transition-all duration-150',
            recording
              ? 'bg-cyan/20 text-cyan ring-1 ring-cyan animate-pulse'
              : 'bg-surface-4 hover:bg-surface-3'
          )}
        >
          {recording ? 'Escuchando…' : formatHotkey(value)}
        </button>
      </div>
      {error && <p className="text-xs text-destructive px-1">{error}</p>}
    </div>
  );
}
