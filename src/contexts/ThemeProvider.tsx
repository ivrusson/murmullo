import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  type ReactNode,
} from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { listen } from '@tauri-apps/api/event';
import { configService } from '../services/tauri';
import {
  THEME_STORAGE_KEY,
  normalizeTheme,
  type ThemePreference,
} from '../lib/theme';

interface AppThemeContextType {
  theme: ThemePreference;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemePreference) => Promise<void>;
}

const AppThemeContext = createContext<AppThemeContextType | undefined>(
  undefined
);

function ThemeController({ children }: { children: ReactNode }) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const applyTheme = useCallback(
    async (next: ThemePreference) => {
      setTheme(next);
      try {
        await configService.updateUiTheme(next);
      } catch {
        // Browser preview without Tauri still keeps the local theme.
      }
    },
    [setTheme]
  );

  useEffect(() => {
    const unlisten = listen<string>('theme-updated', event => {
      setTheme(normalizeTheme(event.payload));
    });
    return () => {
      unlisten.then(fn => fn()).catch(() => undefined);
    };
  }, [setTheme]);

  return (
    <AppThemeContext.Provider
      value={{
        theme: normalizeTheme(theme),
        resolvedTheme: resolvedTheme === 'light' ? 'light' : 'dark',
        setTheme: applyTheme,
      }}
    >
      {children}
    </AppThemeContext.Provider>
  );
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      storageKey={THEME_STORAGE_KEY}
    >
      <ThemeController>{children}</ThemeController>
    </NextThemesProvider>
  );
}

export function useAppTheme(): AppThemeContextType {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within an AppThemeProvider');
  }
  return context;
}
