import { createRootRoute, Outlet } from '@tanstack/react-router';
import { AppThemeProvider } from '@/contexts/ThemeProvider';
import { AppConfigProvider } from '@/contexts/AppConfigContext';
import { AppShell } from '@/components/layout/AppShell';
import { NotFound, RouteError } from '@/components/RouteStates';

function RootLayout() {
  return (
    <AppThemeProvider>
      <AppConfigProvider>
        <AppShell>
          <Outlet />
        </AppShell>
      </AppConfigProvider>
    </AppThemeProvider>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: ({ error }) => (
    <RouteError error={error instanceof Error ? error : new Error('Error')} />
  ),
});
