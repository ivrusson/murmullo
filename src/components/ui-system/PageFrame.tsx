import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  frame: {
    minHeight: '100%',
    paddingInline: space.lg,
    paddingBlock: space.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: space.lg,
  },
});

export function PageFrame({ children }: { children: ReactNode }) {
  return <div {...sx(styles.frame)}>{children}</div>;
}
