import { createRootRoute, Outlet } from '@tanstack/react-router';
import { AppThemeProvider } from '@/contexts/ThemeProvider';
import { AppConfigProvider } from '@/contexts/AppConfigContext';
import { LocaleProvider } from '@/i18n';
import { AppShell } from '@/components/layout/AppShell';
import { CrashErrorBoundary } from '@/components/CrashErrorBoundary';
import { NotFound, RouteError } from '@/components/RouteStates';

function RootLayout() {
  return (
    <AppThemeProvider>
      <LocaleProvider>
        <AppConfigProvider>
          <CrashErrorBoundary>
            <AppShell>
              <Outlet />
            </AppShell>
          </CrashErrorBoundary>
        </AppConfigProvider>
      </LocaleProvider>
    </AppThemeProvider>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: ({ error }) => (
    <RouteError error={error instanceof Error ? error : new Error('')} />
  ),
});
