import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color, font, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { Surface } from '@/components/ui-system/Surface';

const styles = stylex.create({
  body: {
    textAlign: 'center',
    maxWidth: '28rem',
    marginInline: 'auto',
    paddingBlock: space.lg,
  },
  title: {
    fontFamily: font.display,
    fontSize: '1.35rem',
    fontWeight: 500,
    letterSpacing: '-0.02em',
    margin: 0,
    color: color.ink,
  },
  copy: {
    color: '#5A5551',
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: '22px',
    marginTop: space.sm,
    marginBottom: 0,
  },
  action: {
    marginTop: space.lg,
  },
});

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Surface>
      <div {...sx(styles.body)}>
        <h2 {...sx(styles.title)}>{title}</h2>
        <p {...sx(styles.copy)}>{body}</p>
        {action ? <div {...sx(styles.action)}>{action}</div> : null}
      </div>
    </Surface>
  );
}
