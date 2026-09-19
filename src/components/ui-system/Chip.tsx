import type { HTMLAttributes, ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color, font, radius } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    paddingBlock: 4,
    paddingInline: 10,
    fontFamily: font.sans,
    fontSize: 11,
    fontWeight: 600,
    lineHeight: '14px',
    letterSpacing: '0.02em',
    borderWidth: 0,
    flexShrink: 0,
  },
  muted: {
    backgroundColor: 'rgba(28, 26, 25, 0.05)',
    color: color.muted,
  },
  iris: {
    backgroundColor: '#F4F0F9',
    color: '#6E5696',
  },
  live: {
    backgroundColor: '#EDF4EE',
    color: '#47784E',
  },
  danger: {
    backgroundColor: '#FDF0F0',
    color: '#A44C47',
  },
  trabajo: {
    backgroundColor: '#F4E9C8',
    color: '#8A6A1E',
  },
  diseno: {
    backgroundColor: '#F4F0F9',
    color: '#6E5696',
  },
  reuniones: {
    backgroundColor: '#FDF0F0',
    color: '#A44C47',
  },
  personal: {
    backgroundColor: '#EDF4EE',
    color: '#47784E',
  },
});

type ChipTone =
  | 'muted'
  | 'iris'
  | 'live'
  | 'danger'
  | 'trabajo'
  | 'diseno'
  | 'reuniones'
  | 'personal'
  | 'copper';

function resolveTone(tone: ChipTone): Exclude<ChipTone, 'copper'> {
  return tone === 'copper' ? 'iris' : tone;
}

export function Chip({
  children,
  tone = 'muted',
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: ChipTone;
}) {
  const x = sx(styles.chip, styles[resolveTone(tone)]);
  return (
    <span
      {...rest}
      className={[x.className, className].filter(Boolean).join(' ')}
      style={x.style}
    >
      {children}
    </span>
  );
}
