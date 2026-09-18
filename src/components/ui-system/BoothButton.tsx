import type { ButtonHTMLAttributes, ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color, font, motion, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderRadius: radius.pill,
    borderStyle: 'solid',
    borderWidth: 1,
    fontFamily: font.sans,
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1,
    cursor: {
      default: 'pointer',
      ':disabled': 'not-allowed',
    },
    opacity: {
      default: 1,
      ':disabled': 0.4,
    },
    transitionProperty: 'background-color, color, border-color, opacity',
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
  md: {
    paddingBlock: '0.65rem',
    paddingInline: '1rem',
  },
  sm: {
    paddingBlock: '0.4rem',
    paddingInline: '0.75rem',
    fontSize: '0.8rem',
  },
  copper: {
    backgroundColor: color.copper,
    borderColor: color.copper,
    color: color.copperInk,
  },
  quiet: {
    backgroundColor: 'transparent',
    borderColor: color.line,
    color: color.ink,
  },
  live: {
    backgroundColor: color.live,
    borderColor: color.live,
    color: color.liveInk,
  },
  danger: {
    backgroundColor: 'transparent',
    borderColor: color.danger,
    color: color.danger,
  },
});

type Tone = 'copper' | 'quiet' | 'live' | 'danger';

export function BoothButton({
  children,
  tone = 'copper',
  size = 'md',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: Tone;
  size?: 'sm' | 'md';
}) {
  const x = sx(
    styles.base,
    size === 'sm' ? styles.sm : styles.md,
    styles[tone]
  );
  return (
    <button
      type="button"
      {...rest}
      className={[x.className, className].filter(Boolean).join(' ')}
      style={x.style}
    >
      {children}
    </button>
  );
}
