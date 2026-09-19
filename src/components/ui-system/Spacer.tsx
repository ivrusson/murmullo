import type { HTMLAttributes } from 'react';
import * as stylex from '@stylexjs/stylex';
import { space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  base: {
    flexShrink: 0,
  },
  xXs: { width: space.xs },
  xSm: { width: space.sm },
  xMd: { width: space.md },
  xLg: { width: space.lg },
  xXl: { width: space.xl },
  x2xl: { width: space['2xl'] },
  yXs: { height: space.xs },
  ySm: { height: space.sm },
  yMd: { height: space.md },
  yLg: { height: space.lg },
  yXl: { height: space.xl },
  y2xl: { height: space['2xl'] },
});

const widthStyles = {
  xs: styles.xXs,
  sm: styles.xSm,
  md: styles.xMd,
  lg: styles.xLg,
  xl: styles.xXl,
  '2xl': styles.x2xl,
} as const;

const heightStyles = {
  xs: styles.yXs,
  sm: styles.ySm,
  md: styles.yMd,
  lg: styles.yLg,
  xl: styles.yXl,
  '2xl': styles.y2xl,
} as const;

interface SpacerProps extends HTMLAttributes<HTMLDivElement> {
  size?: keyof typeof widthStyles;
  axis?: 'x' | 'y' | 'both';
}

export function Spacer({
  className,
  size = 'md',
  axis = 'y',
  style,
  ...rest
}: SpacerProps) {
  const x = sx(
    styles.base,
    axis === 'x' || axis === 'both' ? widthStyles[size] : false,
    axis === 'y' || axis === 'both' ? heightStyles[size] : false
  );

  return (
    <div
      {...rest}
      className={[x.className, className].filter(Boolean).join(' ')}
      style={{ ...x.style, ...style }}
    />
  );
}
