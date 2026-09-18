import type { ReactNode } from 'react';
import { Outlet } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { Sidebar } from '@/components/Sidebar';
import { Toaster } from '@/components/ui/sonner';
import { useHotkeyEvents } from '@/hooks/useHotkeyEvents';

const MOBILE = '@media (max-width: 860px)';

const styles = stylex.create({
  shell: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: color.bg,
    color: color.ink,
    flexDirection: {
      default: 'row',
      [MOBILE]: 'column',
    },
  },
  column: {
    flex: '1',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  main: {
    flex: '1',
    overflowY: 'auto',
  },
});

export function AppShell({ children }: { children?: ReactNode }) {
  useHotkeyEvents();
  return (
    <div {...sx(styles.shell)}>
      <Sidebar />
      <div {...sx(styles.column)}>
        <main {...sx(styles.main)}>{children ?? <Outlet />}</main>
      </div>
      <Toaster />
    </div>
  );
}
