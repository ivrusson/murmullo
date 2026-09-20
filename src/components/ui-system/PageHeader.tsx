import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color, font, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const COMPACT = '@media (max-width: 960px)';

const styles = stylex.create({
  wrap: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space.md,
    marginBottom: space.sm,
    minWidth: 0,
    flexShrink: 0,
  },
  copy: {
    flex: '1',
    minWidth: 0,
  },
  title: {
    fontFamily: font.display,
    fontSize: {
      default: '2rem',
      [COMPACT]: '1.65rem',
    },
    fontWeight: 500,
    letterSpacing: '-0.03em',
    lineHeight: 1.15,
    margin: 0,
    color: color.ink,
  },
  lede: {
    marginTop: space.sm,
    marginBottom: 0,
    maxWidth: '38rem',
    color: '#5A5551',
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: '22px',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.sm,
    flexShrink: 0,
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
      <div {...sx(styles.copy)}>
        <h1 {...sx(styles.title)}>{title}</h1>
        {lede ? <p {...sx(styles.lede)}>{lede}</p> : null}
      </div>
      {actions ? <div {...sx(styles.actions)}>{actions}</div> : null}
    </header>
  );
}
