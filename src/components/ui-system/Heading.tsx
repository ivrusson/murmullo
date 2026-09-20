import type { HTMLAttributes, ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color as tokens, font } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  base: {
    margin: 0,
    padding: 0,
    fontFamily: font.display,
    letterSpacing: '-0.02em',
    lineHeight: 1.25,
  },
  xs: { fontSize: '0.75rem' },
  sm: { fontSize: '0.875rem' },
  md: { fontSize: '1rem' },
  lg: { fontSize: '1.125rem' },
  xl: { fontSize: '1.25rem' },
  '2xl': { fontSize: '1.75rem' },
  '3xl': { fontSize: '2.5rem' },
  normal: { fontWeight: 400 },
  medium: { fontWeight: 500 },
  semibold: { fontWeight: 600 },
  bold: { fontWeight: 700 },
  default: { color: tokens.ink },
  muted: { color: tokens.muted },
  primary: { color: tokens.iris },
});

const levelSize = {
  1: '3xl',
  2: '2xl',
  3: 'xl',
  4: 'lg',
  5: 'md',
  6: 'sm',
} as const;

interface HeadingProps extends Omit<
  HTMLAttributes<HTMLHeadingElement>,
  'style' | 'color'
> {
  children: ReactNode;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: 'default' | 'muted' | 'primary';
  xstyle?: StyleXStyles | false | null;
  style?: HTMLAttributes<HTMLHeadingElement>['style'];
}

export function Heading({
  children,
  className,
  level = 1,
  size,
  weight = 'semibold',
  color = 'default',
  xstyle,
  style,
  ...rest
}: HeadingProps) {
  const Component = `h${level}` as 'h1';
  const resolvedSize = size ?? levelSize[level];
  const x = sx(
    styles.base,
    styles[resolvedSize],
    styles[weight],
    styles[color],
    xstyle
  );

  return (
    <Component
      {...rest}
      className={[x.className, className].filter(Boolean).join(' ')}
      style={{ ...x.style, ...style }}
    >
      {children}
    </Component>
  );
}
