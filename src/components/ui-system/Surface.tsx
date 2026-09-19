import type { HTMLAttributes, ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color, motion, radius, shadow } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  base: {
    backgroundColor: color.surface,
    borderColor: color.line,
    borderStyle: 'solid',
    borderWidth: 1,
    borderRadius: radius.xl,
    color: color.ink,
    boxShadow: shadow.card,
  },
  pad: {
    padding: 20,
  },
  padSm: {
    padding: 16,
  },
  inset: {
    backgroundColor: color.raised,
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.65)',
  },
  hoverable: {
    transitionProperty: 'background-color, box-shadow, transform',
    transitionDuration: motion.fast,
    backgroundColor: {
      default: color.surface,
      ':hover': '#FFFFFF',
    },
    transform: {
      default: 'none',
      ':hover': 'translateY(-1px)',
    },
    boxShadow: {
      default: shadow.card,
      ':hover':
        '0 8px 24px -6px rgba(45, 42, 41, 0.08), 0 1px 3px 0 rgba(45, 42, 41, 0.04)',
    },
  },
});

type SurfaceProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  as?: 'section' | 'div' | 'article' | 'aside';
  padded?: boolean | 'sm';
  inset?: boolean;
  hoverable?: boolean;
  xstyle?: StyleXStyles | Array<StyleXStyles | false | null> | false | null;
};

export function Surface({
  children,
  as: Tag = 'section',
  padded = true,
  inset = false,
  hoverable = false,
  className,
  xstyle,
  style,
  ...rest
}: SurfaceProps) {
  const extra = Array.isArray(xstyle) ? xstyle : [xstyle];
  const x = sx(
    styles.base,
    padded === 'sm' ? styles.padSm : padded ? styles.pad : false,
    inset ? styles.inset : false,
    hoverable ? styles.hoverable : false,
    ...extra
  );
  return (
    <Tag
      {...rest}
      className={[x.className, className].filter(Boolean).join(' ')}
      style={{ ...x.style, ...style }}
    >
      {children}
    </Tag>
  );
}
