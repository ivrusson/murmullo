import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { PageFrame } from '@/components/ui-system/PageFrame';
import { Button } from '@/components/ui-system/Button';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import { useT } from '@/i18n';

const styles = stylex.create({
  title: {
    fontFamily: font.display,
    fontSize: '2rem',
    margin: 0,
  },
  copy: {
    color: color.muted,
    maxWidth: '28rem',
    lineHeight: 1.5,
    marginTop: space.sm,
  },
  actions: {
    display: 'flex',
    gap: space.sm,
    marginTop: space.lg,
  },
  pre: {
    marginTop: space.lg,
    color: color.danger,
    fontFamily: font.mono,
    fontSize: '0.75rem',
    whiteSpace: 'pre-wrap',
  },
});

export function NotFound() {
  const t = useT();
  return (
    <PageFrame>
      <h1 {...sx(styles.title)}>{t('route.notFoundTitle')}</h1>
      <p {...sx(styles.copy)}>{t('route.notFoundBody')}</p>
      <div {...sx(styles.actions)}>
        <Link to="/" preload="intent">
          <Button>{t('route.goHome')}</Button>
        </Link>
      </div>
    </PageFrame>
  );
}

export function RouteError({ error }: { error: Error }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <PageFrame>
      <h1 {...sx(styles.title)}>{t('route.errorTitle')}</h1>
      <p {...sx(styles.copy)}>{t('route.errorBody')}</p>
      <div {...sx(styles.actions)}>
        <Link to="/" preload="intent">
          <Button>{t('route.goHome')}</Button>
        </Link>
        <Button tone="quiet" onClick={() => setOpen(true)}>
          {t('feedback.reportThisError')}
        </Button>
      </div>
      {error.message ? <pre {...sx(styles.pre)}>{error.message}</pre> : null}
      <FeedbackDialog
        open={open}
        onOpenChange={setOpen}
        kind="bug"
        initialTitle={t('route.errorTitle')}
        initialDescription={error.message}
        initialActual={error.message}
        initialStack={error.stack ?? ''}
      />
    </PageFrame>
  );
}
