import type { HTMLAttributes, ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color, font, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.pill,
    paddingBlock: '0.28rem',
    paddingInline: '0.7rem',
    fontFamily: font.sans,
    fontSize: '0.75rem',
    fontWeight: 500,
    backgroundColor: color.raised,
    color: color.ink,
    borderColor: color.line,
    borderStyle: 'solid',
    borderWidth: 1,
  },
  copper: { color: color.copper },
  live: { color: color.live },
  muted: { color: color.muted },
  danger: { color: color.danger },
});

export function Chip({
  children,
  tone = 'muted',
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: 'copper' | 'live' | 'muted' | 'danger';
}) {
  const x = sx(styles.chip, styles[tone]);
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
