import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const COMPACT = '@media (max-width: 960px)';

const styles = stylex.create({
  frame: {
    flex: '1',
    minHeight: 0,
    minWidth: 0,
    overflow: 'auto',
    paddingInline: {
      default: space.lg,
      [COMPACT]: space.md,
    },
    paddingBlock: {
      default: space.lg,
      [COMPACT]: space.md,
    },
    display: 'flex',
    flexDirection: 'column',
    gap: {
      default: space.lg,
      [COMPACT]: space.md,
    },
  },
  fill: {
    overflow: 'hidden',
  },
});

export function PageFrame({
  children,
  fill = false,
}: {
  children: ReactNode;
  fill?: boolean;
}) {
  return <div {...sx(styles.frame, fill && styles.fill)}>{children}</div>;
}
