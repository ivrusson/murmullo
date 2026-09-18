import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color, font, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  wrap: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space.md,
    marginBottom: space.lg,
  },
  title: {
    fontFamily: font.display,
    fontSize: '2rem',
    fontWeight: 550,
    letterSpacing: '-0.03em',
    lineHeight: 1.15,
    margin: 0,
    color: color.ink,
  },
  lede: {
    marginTop: space.sm,
    marginBottom: 0,
    maxWidth: '38rem',
    color: color.muted,
    fontSize: '0.95rem',
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.sm,
  },
});

export function PageHeader({
  title,
  lede,
  actions,
}: {
  title: string;
  lede?: string;
  actions?: ReactNode;
}) {
  return (
    <header {...sx(styles.wrap)}>
      <div>
        <h1 {...sx(styles.title)}>{title}</h1>
        {lede ? <p {...sx(styles.lede)}>{lede}</p> : null}
      </div>
      {actions ? <div {...sx(styles.actions)}>{actions}</div> : null}
    </header>
  );
}
