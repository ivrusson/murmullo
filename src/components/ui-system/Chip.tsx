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
    backgroundColor: color.wash,
    color: color.muted,
  },
  iris: {
    backgroundColor: color.toneIrisBg,
    color: color.toneIrisInk,
  },
  live: {
    backgroundColor: color.toneSageBg,
    color: color.toneSageInk,
  },
  danger: {
    backgroundColor: color.toneBlushBg,
    color: color.toneBlushInk,
  },
  trabajo: {
    backgroundColor: color.toneAmberBg,
    color: color.toneAmberInk,
  },
  diseno: {
    backgroundColor: color.toneIrisBg,
    color: color.toneIrisInk,
  },
  reuniones: {
    backgroundColor: color.toneBlushBg,
    color: color.toneBlushInk,
  },
  personal: {
    backgroundColor: color.toneSageBg,
    color: color.toneSageInk,
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
