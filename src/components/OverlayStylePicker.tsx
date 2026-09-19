import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import * as stylex from '@stylexjs/stylex';
import { toast } from '@/components/ui-system/toast';
import { Button } from '@/components/ui-system/Button';
import { sx } from '@/components/ui-system/sx';
import {
  OVERLAY_STYLES,
  normalizeOverlayStyle,
  readStoredOverlayStyle,
  broadcastOverlayStyle,
  type OverlayStyle,
} from '@/lib/overlayStyle';
import { overlayService } from '@/services/tauri';
import { useT, mapBackendError, type AppMessageKey } from '@/i18n';
import type { OverlayLayout } from '@/types';
import { color, font, motion, radius, space } from '@/styles/tokens.stylex';

const styles = stylex.create({
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    marginTop: space.lg,
  },
  kicker: {
    margin: 0,
    fontFamily: font.sans,
    fontSize: 12,
    fontWeight: 600,
    color: color.muted,
  },
  copy: {
    margin: 0,
    color: '#5A5551',
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: '20px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'repeat(3, minmax(0, 1fr))',
      '@media (max-width: 720px)': '1fr',
    },
    gap: space.sm,
  },
  option: {
    appearance: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 10,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.line,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    color: color.ink,
    cursor: 'pointer',
    textAlign: 'left',
    transitionProperty: 'border-color, background-color, box-shadow',
    transitionDuration: motion.fast,
    outline: 'none',
  },
  optionActive: {
    borderColor: color.ink,
    boxShadow: '0 0 0 1px #1c1a19',
  },
  preview: {
    height: 76,
    borderRadius: 16,
    backgroundColor: color.raised,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  mascot: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    backgroundColor: '#2f2c38',
    boxShadow: 'inset 4px 3px 0 #5a5568',
    flexShrink: 0,
  },
  glass: {
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.9)',
    boxShadow: '0 8px 16px -10px rgba(35,33,40,0.28)',
  },
  pillPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    transform: 'translateX(-10px)',
  },
  pillBar: {
    width: 78,
    height: 22,
    marginLeft: -8,
  },
  islandPreview: {
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 10,
    gap: 6,
    width: 92,
    height: 26,
  },
  islandWave: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 2,
    height: 12,
    flex: '1',
  },
  islandBar: {
    width: 2,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#1c1a19',
  },
  cardPreview: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transform: 'translateY(8px)',
  },
  cardSheet: {
    width: 72,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.95)',
    boxShadow: '0 10px 18px -12px rgba(35,33,40,0.3)',
    marginTop: -8,
    paddingTop: 14,
    paddingInline: 8,
  },
  cardLine: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(28,26,25,0.12)',
    marginBottom: 4,
  },
  label: {
    margin: 0,
    fontFamily: font.sans,
    fontSize: 13,
    fontWeight: 600,
  },
  hint: {
    margin: 0,
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: '16px',
    color: color.muted,
  },
  showRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 4,
  },
});

function MiniMascot() {
  return <span {...sx(styles.mascot)} aria-hidden />;
}

function StylePreview({ value }: { value: OverlayStyle }) {
  if (value === 'island') {
    return (
      <div {...sx(styles.preview)}>
        <div {...sx(styles.glass, styles.islandPreview)}>
          <MiniMascot />
          <span {...sx(styles.islandWave)} aria-hidden>
            <span {...sx(styles.islandBar)} />
            <span {...sx(styles.islandBar)} />
            <span {...sx(styles.islandBar)} />
            <span {...sx(styles.islandBar)} />
            <span {...sx(styles.islandBar)} />
          </span>
        </div>
      </div>
    );
  }
  if (value === 'card') {
    return (
      <div {...sx(styles.preview)}>
        <div {...sx(styles.cardPreview)}>
          <MiniMascot />
          <div {...sx(styles.cardSheet)}>
            <div {...sx(styles.cardLine)} />
            <div {...sx(styles.cardLine)} />
            <div {...sx(styles.cardLine)} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div {...sx(styles.preview)}>
      <div {...sx(styles.pillPreview)}>
        <MiniMascot />
        <span {...sx(styles.glass, styles.pillBar)} />
      </div>
    </div>
  );
}

const STYLE_COPY: Record<
  OverlayStyle,
  { label: AppMessageKey; hint: AppMessageKey }
> = {
  pill: { label: 'settings.overlayPill', hint: 'settings.overlayPillHint' },
  island: {
    label: 'settings.overlayIsland',
    hint: 'settings.overlayIslandHint',
  },
  card: { label: 'settings.overlayCard', hint: 'settings.overlayCardHint' },
};

export function OverlayStylePicker() {
  const t = useT();
  const [style, setStyle] = useState<OverlayStyle>(readStoredOverlayStyle);

  useEffect(() => {
    void overlayService
      .getLayout()
      .then(layout => setStyle(normalizeOverlayStyle(layout.style)))
      .catch(() => undefined);

    const unlisten = listen<OverlayLayout>('overlay-layout-updated', event => {
      setStyle(normalizeOverlayStyle(event.payload.style));
    });
    return () => {
      unlisten.then(fn => fn()).catch(() => undefined);
    };
  }, []);

  const select = async (next: OverlayStyle) => {
    setStyle(next);
    broadcastOverlayStyle(next);
    try {
      await overlayService.setStyle(next);
    } catch (error) {
      const raw =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : '';
      if (raw && !/invoke|__TAURI|not allowed/i.test(raw)) {
        toast.error(mapBackendError(raw));
      }
    }
  };

  const showOverlay = async () => {
    try {
      await overlayService.show();
    } catch {
      toast.error(t('settings.overlayShowFailed'));
    }
  };

  return (
    <div {...sx(styles.wrap)}>
      <p {...sx(styles.kicker)}>{t('settings.overlay')}</p>
      <p {...sx(styles.copy)}>{t('settings.overlayBody')}</p>
      <div
        {...sx(styles.grid)}
        role="radiogroup"
        aria-label={t('settings.overlayAria')}
      >
        {OVERLAY_STYLES.map(value => {
          const active = style === value;
          const copy = STYLE_COPY[value];
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => void select(value)}
              {...sx(styles.option, active ? styles.optionActive : false)}
            >
              <StylePreview value={value} />
              <p {...sx(styles.label)}>{t(copy.label)}</p>
              <p {...sx(styles.hint)}>{t(copy.hint)}</p>
            </button>
          );
        })}
      </div>
      <div {...sx(styles.showRow)}>
        <Button tone="quiet" size="sm" onClick={() => void showOverlay()}>
          {t('settings.overlayShow')}
        </Button>
      </div>
    </div>
  );
}
