import { Component, type ErrorInfo, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color, font, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { Button } from '@/components/ui-system/Button';
import { PageFrame } from '@/components/ui-system/PageFrame';
import { useT } from '@/i18n';
import { reportFrontendCrash } from '@/lib/crashCapture';
import { invoke } from '@tauri-apps/api/core';

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

type Props = { children: ReactNode };
type State = { error: Error | null };

function CrashFallback({
  error,
  onReport,
}: {
  error: Error;
  onReport: () => void;
}) {
  const t = useT();
  return (
    <PageFrame>
      <h1 {...sx(styles.title)}>{t('route.errorTitle')}</h1>
      <p {...sx(styles.copy)}>{t('route.errorBody')}</p>
      <div {...sx(styles.actions)}>
        <Button onClick={onReport}>{t('feedback.reportThisError')}</Button>
      </div>
      {error.message ? <pre {...sx(styles.pre)}>{error.message}</pre> : null}
    </PageFrame>
  );
}

class CrashBoundaryInner extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const stack = [error.stack, info.componentStack].filter(Boolean).join('\n');
    void reportFrontendCrash({
      message: error.message || 'React render error',
      stack,
      source: 'react',
    });
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <CrashFallback
          error={this.state.error}
          onReport={() => {
            void invoke('show_crash_reporter_window');
          }}
        />
      );
    }
    return this.props.children;
  }
}

export function CrashErrorBoundary({ children }: Props) {
  return <CrashBoundaryInner>{children}</CrashBoundaryInner>;
}
