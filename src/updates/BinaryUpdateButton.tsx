import { ArrowDown, LoaderCircle } from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import { Button } from '@/components/ui-system/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui-system/Dialog';
import { Tooltip } from '@/components/ui-system/Tooltip';
import { sx } from '@/components/ui-system/sx';
import { spin } from '@/components/ui-system/spin';
import { useT } from '@/i18n';
import { color, radius } from '@/styles/tokens.stylex';
import { useBinaryUpdate } from './useBinaryUpdate';

const SIZE = 32;
const STROKE = 2.5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const styles = stylex.create({
  button: {
    position: 'relative',
    width: SIZE,
    height: SIZE,
    padding: 0,
    borderRadius: radius.pill,
    color: color.ink,
    backgroundColor: color.raised,
  },
  ring: {
    position: 'absolute',
    inset: 0,
    transform: 'rotate(-90deg)',
    pointerEvents: 'none',
  },
  track: {
    stroke: color.line,
  },
  progress: {
    stroke: color.copper,
    transitionProperty: 'stroke-dashoffset',
    transitionDuration: '200ms',
  },
  note: {
    margin: 0,
    color: color.muted,
    fontSize: 13,
  },
});

/** Round button in the sidebar corner for packaged-app updates. */
export function BinaryUpdateButton() {
  const t = useT();
  const { button, dialogOpen, setDialogOpen, installing, install } =
    useBinaryUpdate();

  if (button.kind === 'hidden') return null;

  const percent =
    button.kind === 'downloading'
      ? button.percent
      : button.kind === 'ready'
        ? 100
        : null;
  const label =
    button.kind === 'downloading'
      ? button.percent === null
        ? t('updates.binary.downloadingUnknown')
        : t('updates.binary.downloading', { percent: button.percent })
      : button.kind === 'installing'
        ? t('updates.binary.installing')
        : button.blocked
          ? t('updates.binary.busy')
          : t('updates.binary.available');
  const blocked = button.kind === 'ready' && button.blocked;

  return (
    <>
      <Tooltip label={label}>
        <Button
          tone="ghost"
          size="icon"
          xstyle={styles.button}
          aria-label={label}
          disabled={button.kind !== 'ready'}
          onClick={() => setDialogOpen(true)}
        >
          <svg
            {...sx(styles.ring)}
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            aria-hidden
          >
            <circle
              {...sx(styles.track)}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
            />
            {percent !== null ? (
              <circle
                {...sx(styles.progress)}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
              />
            ) : null}
          </svg>
          {button.kind === 'ready' ? (
            <ArrowDown size={16} strokeWidth={1.9} aria-hidden />
          ) : (
            <LoaderCircle
              {...sx(spin.icon)}
              size={14}
              strokeWidth={1.9}
              aria-hidden
            />
          )}
        </Button>
      </Tooltip>
      {button.kind === 'ready' || installing ? (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t('updates.binary.dialogTitle', {
                  version: button.kind === 'ready' ? button.version : '',
                })}
              </DialogTitle>
              <DialogDescription>
                {t('updates.binary.dialogBody')}
              </DialogDescription>
            </DialogHeader>
            {blocked ? (
              <p {...sx(styles.note)}>{t('updates.binary.busy')}</p>
            ) : null}
            <DialogFooter>
              <Button tone="quiet" onClick={() => setDialogOpen(false)}>
                {t('updates.binary.later')}
              </Button>
              <Button
                disabled={blocked || installing}
                onClick={() => void install()}
              >
                {installing
                  ? t('updates.binary.installing')
                  : t('updates.binary.install')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
