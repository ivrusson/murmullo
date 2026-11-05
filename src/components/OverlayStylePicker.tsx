import * as stylex from '@stylexjs/stylex';
import { toast } from '@/components/ui-system/toast';
import { Button } from '@/components/ui-system/Button';
import { sx } from '@/components/ui-system/sx';
import { overlayService } from '@/services/tauri';
import { useT } from '@/i18n';
import { color, font, space } from '@/styles/tokens.stylex';

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
  showRow: {
    display: 'flex',
    gap: space.sm,
    flexWrap: 'wrap',
    marginTop: space.xs,
  },
});

/** Presence controls for the desktop overlay (style variants retired). */
export function OverlayStylePicker() {
  const t = useT();

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
      <div {...sx(styles.showRow)}>
        <Button tone="quiet" size="sm" onClick={() => void showOverlay()}>
          {t('settings.overlayShow')}
        </Button>
      </div>
    </div>
  );
}
