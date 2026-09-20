import { invoke } from '@tauri-apps/api/core';

const WINDOW_FLAG = '__murmulloCrashCapture';

type CrashWindow = Window & {
  [WINDOW_FLAG]?: boolean;
};

function isCrashReporterWindow(): boolean {
  if (typeof window === 'undefined') return false;
  const href = window.location.href;
  return (
    window.location.protocol === 'crash:' ||
    href.includes('crash.html') ||
    window.location.pathname.endsWith('crash.html')
  );
}

let reporting = false;

export async function reportFrontendCrash(input: {
  message: string;
  stack?: string;
  source: string;
}): Promise<void> {
  if (isCrashReporterWindow() || reporting) return;
  const message = input.message.trim();
  if (!message) return;
  reporting = true;
  try {
    await invoke('report_frontend_crash', {
      message,
      stack: input.stack ?? null,
      source: input.source,
    });
  } catch (error) {
    console.error('Could not open crash reporter', error);
  } finally {
    window.setTimeout(() => {
      reporting = false;
    }, 2500);
  }
}

export function installCrashCapture(): void {
  const win = window as CrashWindow;
  if (win[WINDOW_FLAG] || isCrashReporterWindow()) return;
  win[WINDOW_FLAG] = true;

  window.addEventListener('error', event => {
    const error = event.error;
    const message =
      error instanceof Error
        ? error.message
        : event.message || 'Unhandled error';
    const stack = error instanceof Error ? error.stack : undefined;
    void reportFrontendCrash({
      message,
      stack,
      source: 'window.onerror',
    });
  });

  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled promise rejection';
    const stack = reason instanceof Error ? reason.stack : undefined;
    void reportFrontendCrash({
      message,
      stack,
      source: 'unhandledrejection',
    });
  });
}
