import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { PageFrame } from '@/components/ui-system/PageFrame';
import { BoothButton } from '@/components/ui-system/BoothButton';

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
  return (
    <PageFrame>
      <h1 {...sx(styles.title)}>Esta vista no existe</h1>
      <p {...sx(styles.copy)}>
        Elige una sección del menú o vuelve al escritorio para dictar.
      </p>
      <div {...sx(styles.actions)}>
        <Link to="/" preload="intent">
          <BoothButton>Ir al escritorio</BoothButton>
        </Link>
      </div>
    </PageFrame>
  );
}

export function RouteError({ error }: { error: Error }) {
  return (
    <PageFrame>
      <h1 {...sx(styles.title)}>Esta vista se rompió</h1>
      <p {...sx(styles.copy)}>
        Recarga la ventana o vuelve al escritorio. El dictado por atajo sigue
        funcionando en segundo plano.
      </p>
      <div {...sx(styles.actions)}>
        <Link to="/" preload="intent">
          <BoothButton>Ir al escritorio</BoothButton>
        </Link>
      </div>
      {error.message ? (
        <pre {...sx(styles.pre)}>{error.message}</pre>
      ) : null}
    </PageFrame>
  );
}
