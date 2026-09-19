export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'murmullo-theme';

export const THEME_OPTIONS: ReadonlyArray<ThemePreference> = [
  'light',
  'dark',
  'system',
];

export function normalizeTheme(
  value: string | null | undefined
): ThemePreference {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return 'light';
}
