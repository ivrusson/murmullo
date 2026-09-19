import type { HTMLAttributes, ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color as tokens } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  base: {
    margin: 0,
    padding: 0,
  },
  xs: { fontSize: '0.75rem' },
  sm: { fontSize: '0.875rem' },
  md: { fontSize: '1rem' },
  lg: { fontSize: '1.125rem' },
  normal: { fontWeight: 400 },
  medium: { fontWeight: 500 },
  semibold: { fontWeight: 600 },
  default: { color: tokens.ink },
  muted: { color: tokens.muted },
  secondary: { color: tokens.muted },
  destructive: { color: tokens.danger },
  primary: { color: tokens.iris },
  left: { textAlign: 'left' },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
});

interface TextProps extends Omit<
  HTMLAttributes<HTMLParagraphElement>,
  'style'
> {
  children: ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  weight?: 'normal' | 'medium' | 'semibold';
  color?: 'default' | 'muted' | 'secondary' | 'destructive' | 'primary';
  align?: 'left' | 'center' | 'right';
  xstyle?: StyleXStyles | false | null;
  style?: HTMLAttributes<HTMLParagraphElement>['style'];
}

export function Text({
  children,
  className,
  size = 'md',
  weight = 'normal',
  color = 'default',
  align = 'left',
  xstyle,
  style,
  ...rest
}: TextProps) {
  const x = sx(
    styles.base,
    styles[size],
    styles[weight],
    styles[color],
    styles[align],
    xstyle
  );

  return (
    <p
      {...rest}
      className={[x.className, className].filter(Boolean).join(' ')}
      style={{ ...x.style, ...style }}
    >
      {children}
    </p>
  );
}
