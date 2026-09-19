import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  Outlet,
  useLocation,
  useNavigate,
  useRouter,
  useSearch,
} from '@tanstack/react-router';
import { invoke } from '@tauri-apps/api/core';
import { ChevronLeft, Keyboard, Mic, Search } from 'lucide-react';
import { toast } from '@/components/ui-system/toast';
import * as stylex from '@stylexjs/stylex';
import { color, font, motion, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { Sidebar } from '@/components/Sidebar';
import { Toaster } from '@/components/ui-system/Toaster';
import { useHotkeyEvents } from '@/hooks/useHotkeyEvents';
import { useAppConfig } from '@/contexts/AppConfigContext';
import { formatHotkey } from '@/lib/hotkey';
import { titleForPath } from '@/lib/nav';
import { useT } from '@/i18n';

const MOBILE = '@media (max-width: 720px)';
const NARROW = '@media (max-width: 960px)';

const styles = stylex.create({
  shell: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: 'transparent',
    color: color.ink,
    flexDirection: {
      default: 'row',
      [MOBILE]: 'column',
    },
  },
  column: {
    flex: '1',
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--brand-column-veil)',
    paddingTop: {
      default: 8,
      [MOBILE]: 8,
    },
    paddingRight: {
      default: 16,
      [MOBILE]: 12,
    },
    paddingBottom: {
      default: 16,
      [MOBILE]: 12,
    },
    paddingLeft: {
      default: 8,
      [MOBILE]: 12,
    },
    gap: 8,
  },
  topbar: {
    display: 'flex',
    alignItems: 'center',
    gap: {
      default: 16,
      [NARROW]: 10,
    },
    flexShrink: 0,
    height: 44,
    minHeight: 44,
    minWidth: 0,
    paddingInline: 8,
    paddingBlock: 0,
  },
  backTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    flexShrink: 0,
    minWidth: 0,
    width: {
      default: 120,
      [NARROW]: 'auto',
    },
  },
  back: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    padding: 0,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: {
      default: 'transparent',
      ':hover': color.raised,
    },
    color: color.muted,
    cursor: 'pointer',
    flexShrink: 0,
    outlineColor: {
      default: 'transparent',
      ':focus-visible': color.focus,
    },
    outlineOffset: {
      default: 0,
      ':focus-visible': 2,
    },
    outlineStyle: {
      default: 'none',
      ':focus-visible': 'solid',
    },
    outlineWidth: {
      default: 0,
      ':focus-visible': 2,
    },
  },
  title: {
    margin: 0,
    fontFamily: font.sans,
    fontSize: 14,
    fontWeight: 500,
    lineHeight: '20px',
    color: color.ink,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  search: {
    display: 'flex',
    alignItems: 'center',
    flex: '1',
    minWidth: 0,
    gap: 10,
    height: 36,
    paddingInline: 14,
    backgroundColor: color.surface,
    borderWidth: 0,
    borderStyle: 'none',
    borderRadius: radius.pill,
    boxShadow: {
      default: 'inset 0 1px 2px rgba(28, 26, 25, 0.03)',
      ':focus-within':
        'inset 0 1px 2px rgba(28, 26, 25, 0.03), 0 0 0 1.5px color-mix(in srgb, var(--color-iris) 40%, transparent)',
    },
    outline: 'none',
  },
  searchIcon: {
    color: color.muted,
    flexShrink: 0,
  },
  searchInput: {
    flex: '1',
    minWidth: 0,
    height: '100%',
    margin: 0,
    padding: 0,
    borderWidth: 0,
    borderStyle: 'none',
    borderColor: 'transparent',
    borderRadius: 0,
    backgroundColor: 'transparent',
    color: color.ink,
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: '18px',
    outline: 'none',
    boxShadow: 'none',
    appearance: 'none',
  },
  kChip: {
    display: {
      default: 'inline-flex',
      [NARROW]: 'none',
    },
    alignItems: 'center',
    flexShrink: 0,
    padding: 0,
    borderWidth: 0,
    borderStyle: 'none',
    backgroundColor: 'transparent',
    color: color.muted,
    fontFamily: font.sans,
    fontSize: 11,
    lineHeight: '14px',
    letterSpacing: '0.04em',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  dictar: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    height: 36,
    paddingInline: 16,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: {
      default: color.ink,
      ':hover': color.ink,
    },
    color: color.surface,
    cursor: 'pointer',
    fontFamily: font.sans,
    fontSize: 13,
    fontWeight: 500,
    lineHeight: '18px',
    transform: {
      default: 'none',
      ':hover': 'scale(1.02)',
    },
    transitionProperty: 'transform, opacity',
    transitionDuration: motion.fast,
    outlineColor: {
      default: 'transparent',
      ':focus-visible': color.focus,
    },
    outlineOffset: {
      default: 0,
      ':focus-visible': 2,
    },
    outlineStyle: {
      default: 'none',
      ':focus-visible': 'solid',
    },
    outlineWidth: {
      default: 0,
      ':focus-visible': 2,
    },
  },
  hotkeyChip: {
    display: {
      default: 'inline-flex',
      [NARROW]: 'none',
    },
    alignItems: 'center',
    gap: 8,
    height: 36,
    paddingInline: 14,
    backgroundColor: color.surface,
    borderColor: color.line,
    borderStyle: 'solid',
    borderWidth: 1,
    borderRadius: radius.pill,
    color: color.ink,
    fontFamily: font.sans,
    fontSize: 13,
    fontWeight: 500,
    lineHeight: '18px',
    whiteSpace: 'nowrap',
  },
  main: {
    flex: '1',
    minWidth: 0,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  footer: {
    display: {
      default: 'flex',
      [MOBILE]: 'none',
    },
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    paddingTop: 4,
    paddingBottom: 8,
    paddingInline: 8,
    color: color.muted,
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: '16px',
  },
});

export function AppShell({ children }: { children?: ReactNode }) {
  useHotkeyEvents();
  const t = useT();
  const shell = sx(styles.shell);
  return (
    <div
      className={['murmullo-atmosphere-shell', shell.className]
        .filter(Boolean)
        .join(' ')}
      style={shell.style}
    >
      <Sidebar />
      <div {...sx(styles.column)}>
        <CanvasTopBar />
        <main {...sx(styles.main)}>{children ?? <Outlet />}</main>
        <footer {...sx(styles.footer)}>
          <span>{t('nav.footerLeft')}</span>
          <span>{t('nav.footerRight')}</span>
        </footer>
      </div>
      <Toaster />
    </div>
  );
}

function CanvasTopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const router = useRouter();
  const { config } = useAppConfig();
  const t = useT();
  const searchParams = useSearch({ strict: false }) as { q?: string };
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(searchParams.q ?? '');
  const title = titleForPath(location.pathname);
  const ptt = formatHotkey(config?.hotkeys.push_to_talk);

  useEffect(() => {
    setQuery(location.pathname === '/historial' ? (searchParams.q ?? '') : '');
  }, [location.pathname, searchParams.q]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const goBack = () => {
    if (router.history.canGoBack()) {
      router.history.back();
      return;
    }
    if (location.pathname !== '/') {
      void navigate({ to: '/' });
    }
  };

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    void navigate({
      to: '/historial',
      search: q ? { q } : {},
    });
  };

  const startDictation = () => {
    void invoke('overlay_start_dictation').catch(() => {
      toast.error(t('nav.startFailed'));
    });
  };

  return (
    <header {...sx(styles.topbar)}>
      <div {...sx(styles.backTitle)}>
        <button
          type="button"
          aria-label={t('common.back')}
          onClick={goBack}
          {...sx(styles.back)}
        >
          <ChevronLeft size={16} strokeWidth={1.8} aria-hidden />
        </button>
        <p {...sx(styles.title)}>{title}</p>
      </div>
      <form {...sx(styles.search)} onSubmit={onSearch} role="search">
        <Search
          size={16}
          strokeWidth={1.7}
          aria-hidden
          {...sx(styles.searchIcon)}
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={t('nav.searchPlaceholder')}
          aria-label={t('nav.searchAria')}
          {...sx(styles.searchInput)}
        />
        <kbd {...sx(styles.kChip)}>⌘K</kbd>
      </form>
      <div {...sx(styles.actions)}>
        <button type="button" onClick={startDictation} {...sx(styles.dictar)}>
          <Mic size={14} strokeWidth={1.8} aria-hidden />
          {t('common.dictation')}
        </button>
        <span
          {...sx(styles.hotkeyChip)}
          title={t('nav.dictationShortcut', { ptt })}
        >
          <Keyboard size={14} strokeWidth={1.7} aria-hidden />
          {ptt}
        </span>
      </div>
    </header>
  );
}
