import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { listen } from '@tauri-apps/api/event';
import { configService } from '@/services/tauri';
import {
  LOCALE_EVENT,
  htmlLang,
  normalizeLocale,
  readStoredLocale,
  type Locale,
} from './locales';
import {
  getLocale,
  setLocaleState,
  subscribeLocale,
  t as translateStored,
} from './store';
import type { AppMessageKey } from './types';
import type { TranslateParams } from './t';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: AppMessageKey, params?: TranslateParams) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = readStoredLocale();
    setLocaleState(stored);
    return stored;
  });

  useEffect(() => {
    return subscribeLocale(() => {
      setLocale(getLocale());
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = htmlLang(locale);
  }, [locale]);

  useEffect(() => {
    void configService
      .getConfig()
      .then(config => {
        setLocaleState(normalizeLocale(config.ui?.language));
      })
      .catch(() => undefined);

    const unlisten = listen<string>(LOCALE_EVENT, event => {
      setLocaleState(normalizeLocale(event.payload));
    });
    return () => {
      unlisten.then(fn => fn()).catch(() => undefined);
    };
  }, []);

  const applyLocale = useCallback(async (next: Locale) => {
    setLocaleState(next);
    try {
      await configService.updateUiLanguage(next);
    } catch {
      // Browser preview without Tauri still keeps the local locale.
    }
  }, []);

  const t = useCallback(
    (key: AppMessageKey, params?: TranslateParams) =>
      translateStored(key, params),
    // locale is required so `t` identity changes and useT() re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale]
  );

  return (
    <LocaleContext.Provider
      value={{
        locale,
        setLocale: applyLocale,
        t,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextType {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

export function useT(): LocaleContextType['t'] {
  return useLocale().t;
}
