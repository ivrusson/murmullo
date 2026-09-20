export const LOCALES = ['es', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es';

export const LOCALE_STORAGE_KEY = 'murmullo-locale';

export const LOCALE_EVENT = 'language-updated';

export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) return DEFAULT_LOCALE;
  const lower = value.trim().toLowerCase();
  if (lower === 'en' || lower.startsWith('en-')) return 'en';
  if (lower === 'es' || lower.startsWith('es-')) return 'es';
  return DEFAULT_LOCALE;
}

export function htmlLang(locale: Locale): string {
  return locale === 'en' ? 'en' : 'es-ES';
}

export function intlLocale(locale: Locale): string {
  return locale === 'en' ? 'en' : 'es-ES';
}

export function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function writeStoredLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Private mode / overlay without storage.
  }
}
