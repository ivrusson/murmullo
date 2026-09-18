import type { HTMLAttributes, ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  base: {
    backgroundColor: color.surface,
    borderColor: color.line,
    borderStyle: 'solid',
    borderWidth: 1,
    borderRadius: radius.lg,
    color: color.ink,
  },
  pad: {
    padding: space.lg,
  },
  padSm: {
    padding: space.md,
  },
  inset: {
    backgroundColor: color.raised,
    boxShadow: 'inset 0 1px 0 color-mix(in srgb, white 8%, transparent)',
  },
});

type SurfaceProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  as?: 'section' | 'div' | 'article' | 'aside';
  padded?: boolean | 'sm';
  inset?: boolean;
};

export function Surface({
  children,
  as: Tag = 'section',
  padded = true,
  inset = false,
  className,
  ...rest
}: SurfaceProps) {
  const x = sx(
    styles.base,
    padded === 'sm' ? styles.padSm : padded ? styles.pad : false,
    inset ? styles.inset : false
  );
  return (
    <Tag
      {...rest}
      className={[x.className, className].filter(Boolean).join(' ')}
      style={x.style}
    >
      {children}
    </Tag>
  );
}
