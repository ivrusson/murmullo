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
    paddingBlock: space.xl,
  },
  title: {
    fontFamily: font.display,
    fontSize: '1.4rem',
    margin: 0,
    color: color.ink,
  },
  copy: {
    color: color.muted,
    fontSize: '0.9rem',
    lineHeight: 1.5,
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
