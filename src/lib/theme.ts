export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'murmullo-theme';

export const THEME_OPTIONS: ReadonlyArray<{
  value: ThemePreference;
  label: string;
  hint: string;
}> = [
  { value: 'light', label: 'Claro', hint: 'Lienzo frío de cabina' },
  { value: 'dark', label: 'Oscuro', hint: 'Sala de grabación Booth' },
  { value: 'system', label: 'Sistema', hint: 'Sigue el modo de macOS' },
];

export function normalizeTheme(
  value: string | null | undefined
): ThemePreference {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return 'dark';
}
