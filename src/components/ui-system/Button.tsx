import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
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
    transitionProperty:
      'background-color, color, border-color, opacity, transform, box-shadow',
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
    height: 36,
    paddingInline: '1rem',
    fontSize: 13,
  },
  sm: {
    height: 34,
    paddingInline: 14,
    fontSize: 13,
  },
  icon: {
    width: 36,
    height: 36,
    padding: 0,
    flexShrink: 0,
  },
  primary: {
    backgroundColor: {
      default: '#1C1A19',
      ':hover': '#2A2726',
    },
    borderColor: '#1C1A19',
    color: '#FAF8F5',
    transform: {
      default: 'none',
      ':hover': 'scale(1.02)',
      ':disabled': 'none',
    },
    boxShadow: {
      default: 'none',
      ':hover': '0 8px 18px -10px rgba(28, 26, 25, 0.45)',
    },
  },
  quiet: {
    backgroundColor: {
      default: 'rgba(28, 26, 25, 0.05)',
      ':hover': 'rgba(28, 26, 25, 0.08)',
    },
    borderColor: 'rgba(28, 26, 25, 0.06)',
    color: color.ink,
  },
  ghost: {
    backgroundColor: {
      default: 'transparent',
      ':hover': 'rgba(28, 26, 25, 0.05)',
    },
    borderColor: 'transparent',
    borderWidth: 0,
    color: color.ink,
    fontSize: 13,
    fontWeight: 500,
    height: 32,
    paddingInline: 8,
    gap: 6,
  },
  live: {
    backgroundColor: color.sage,
    borderColor: color.sage,
    color: '#FAF8F5',
  },
  danger: {
    backgroundColor: {
      default: 'transparent',
      ':hover': 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
    },
    borderColor: color.danger,
    color: color.danger,
  },
});

export type ButtonTone = 'primary' | 'quiet' | 'ghost' | 'live' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'icon';

type ToneProp = ButtonTone | 'copper';

function resolveTone(tone: ToneProp): ButtonTone {
  return tone === 'copper' ? 'primary' : tone;
}

export function Button({
  children,
  tone = 'primary',
  size = 'md',
  className,
  xstyle,
  style,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: ToneProp;
  size?: ButtonSize;
  xstyle?: StyleXStyles | Array<StyleXStyles | false | null> | false | null;
}) {
  const resolved = resolveTone(tone);
  const extra = Array.isArray(xstyle) ? xstyle : [xstyle];
  const x = sx(styles.base, styles[size], styles[resolved], ...extra);
  return (
    <BaseButton
      type={type}
      {...rest}
      className={[x.className, className].filter(Boolean).join(' ')}
      style={{ ...x.style, ...style }}
    >
      {children}
    </BaseButton>
  );
}
