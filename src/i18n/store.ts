import { es } from './messages/es';
import { en } from './messages/en';
import {
  DEFAULT_LOCALE,
  htmlLang,
  type Locale,
  writeStoredLocale,
} from './locales';
import { translate, type TranslateParams } from './t';
import type { AppMessageKey, Messages } from './types';

export const catalogs: Record<Locale, Messages> = { es, en };

let currentLocale: Locale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return currentLocale;
}

export function getMessages(): Messages {
  return catalogs[currentLocale];
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setLocaleState(next: Locale): void {
  if (currentLocale === next) return;
  currentLocale = next;
  writeStoredLocale(next);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = htmlLang(next);
  }
  listeners.forEach(listener => listener());
}

export function t(key: AppMessageKey, params?: TranslateParams): string {
  return translate(
    getMessages() as unknown as import('./t').MessageTree,
    key,
    params
  );
}

export function hasMessage(key: string): boolean {
  const parts = key.split('.');
  let current: unknown = getMessages();
  for (const part of parts) {
    if (!current || typeof current !== 'object') return false;
    current = (current as Record<string, unknown>)[part];
  }
  return (
    typeof current === 'string' ||
    (typeof current === 'object' &&
      current !== null &&
      'one' in current &&
      'other' in current)
  );
}
