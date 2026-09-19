import { useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  formatHotkey,
  shortcutFromKeyboardEvent,
  validateHotkey,
} from '@/lib/hotkey';
import { configService } from '@/services/tauri';
import { color, font, motion, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { useT, mapBackendError } from '@/i18n';

interface HotkeyRecorderProps {
  value: string;
  occupied?: string[];
  onChange: (next: string) => void | Promise<void>;
}

const styles = stylex.create({
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    marginBottom: space.sm,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingBlock: 14,
    paddingInline: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderColor: color.line,
    borderStyle: 'solid',
    borderWidth: 1,
  },
  label: {
    margin: 0,
    fontFamily: font.sans,
    fontSize: 14,
    fontWeight: 600,
    color: color.ink,
  },
  hint: {
    margin: 0,
    color: '#5A5551',
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: '16px',
  },
  key: {
    fontFamily: font.sans,
    fontSize: 12,
    fontWeight: 500,
    paddingBlock: 6,
    paddingInline: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: 'solid',
    cursor: 'pointer',
    transitionProperty: 'background-color, color, border-color',
    transitionDuration: motion.fast,
    outlineColor: {
      default: 'transparent',
      ':focus-visible': color.focus,
    },
    outlineOffset: {
      default: 0,
      ':focus-visible': 2,
    },
    outlineStyle: {
      default: 'none',
      ':focus-visible': 'solid',
    },
    outlineWidth: {
      default: 0,
      ':focus-visible': 2,
    },
  },
  idle: {
    backgroundColor: 'rgba(28, 26, 25, 0.05)',
    borderColor: 'rgba(28, 26, 25, 0.06)',
    color: color.ink,
  },
  listening: {
    backgroundColor: 'color-mix(in srgb, var(--color-iris) 16%, transparent)',
    borderColor: 'color-mix(in srgb, var(--color-iris) 40%, transparent)',
    color: color.iris,
  },
  error: {
    margin: 0,
    color: color.danger,
    fontFamily: font.sans,
    fontSize: 12,
  },
});

export function HotkeyRecorder({
  value,
  occupied = [],
  onChange,
}: HotkeyRecorderProps) {
  const t = useT();
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
          setError(mapBackendError(error));
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
    <div {...sx(styles.wrap)}>
      <div {...sx(styles.row)}>
        <div>
          <p {...sx(styles.label)}>{t('settings.ptt')}</p>
          <p {...sx(styles.hint)}>
            {recording ? t('settings.pttListening') : t('settings.pttIdle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setRecording(current => !current);
          }}
          aria-pressed={recording}
          {...sx(styles.key, recording ? styles.listening : styles.idle)}
        >
          {recording ? t('settings.listening') : formatHotkey(value)}
        </button>
      </div>
      {error ? <p {...sx(styles.error)}>{error}</p> : null}
    </div>
  );
}
