import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { listen } from '@tauri-apps/api/event';
import * as stylex from '@stylexjs/stylex';
import { useTranscriptionHistory } from '@/hooks/useTranscriptionHistory';
import { useAppConfig } from '@/contexts/AppConfigContext';
import { PromptPills } from '@/components/dashboard/PromptPills';
import { RecentMurmulloList } from '@/components/dashboard/RecentMurmulloList';
import { MurmulloInspector } from '@/components/dashboard/MurmulloInspector';
import { color, font, radius, shadow } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { getDisplayName, greetingForHour } from '@/lib/displayName';
import { attachPendingContextIfAny } from '@/lib/pendingDictationContext';
import { useT } from '@/i18n';

const RECENT_LIMIT = 8;
const HERO_SRC = '/brand/hero-mascot.jpg';
const STACK = '@media (max-width: 1100px)';

const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden',
    gap: 8,
  },
  hero: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    height: {
      default: 240,
      '@media (max-width: 860px)': 'auto',
    },
    minHeight: {
      default: 240,
      '@media (max-width: 860px)': 0,
    },
    paddingBlock: 16,
    paddingInline: 24,
    borderRadius: radius.xl,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderStyle: 'solid',
    borderWidth: 1,
    boxShadow: shadow.card,
    flexShrink: 0,
  },
  greetingCol: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    width: {
      default: 420,
      '@media (max-width: 860px)': '100%',
    },
    flexShrink: 0,
  },
  greetingText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  greeting: {
    margin: 0,
    fontFamily: font.display,
    fontSize: {
      default: '36px',
      '@media (max-width: 860px)': '28px',
    },
    fontWeight: 500,
    letterSpacing: '-0.03em',
    lineHeight: {
      default: '42px',
      '@media (max-width: 860px)': '34px',
    },
    color: color.ink,
  },
  subhead: {
    margin: 0,
    fontFamily: font.display,
    fontSize: 22,
    fontWeight: 400,
    letterSpacing: '-0.02em',
    lineHeight: '28px',
    color: color.muted,
  },
  heroImg: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    display: {
      default: 'block',
      '@media (max-width: 860px)': 'none',
    },
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'right center',
    pointerEvents: 'none',
    userSelect: 'none',
  },
  heroScrim: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    display: {
      default: 'block',
      '@media (max-width: 860px)': 'none',
    },
    pointerEvents: 'none',
    backgroundImage:
      'linear-gradient(90deg, color-mix(in srgb, var(--color-bg) 70%, transparent) 0%, color-mix(in srgb, var(--color-bg) 22%, transparent) 40%, transparent 62%)',
  },
  content: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
    flex: '1',
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden',
  },
  mainCard: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minWidth: 0,
    minHeight: 0,
    paddingTop: 8,
    paddingRight: 20,
    paddingBottom: 16,
    paddingLeft: 24,
    borderRadius: 24,
    backgroundColor: color.surface,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderStyle: 'solid',
    borderWidth: 1,
    boxShadow: shadow.card,
    overflow: 'hidden',
  },
  mainCardHiddenOnStack: {
    display: {
      default: 'flex',
      [STACK]: 'none',
    },
  },
  recent: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minHeight: 0,
    minWidth: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
    paddingTop: 16,
    paddingInline: 4,
    gap: 10,
  },
  feedHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  feedTitle: {
    margin: 0,
    flex: '1',
    fontFamily: font.sans,
    fontSize: 16,
    fontWeight: 600,
    lineHeight: '24px',
    color: color.ink,
  },
  allLink: {
    color: color.muted,
    fontFamily: font.sans,
    fontSize: 13,
    fontWeight: 500,
    lineHeight: '18px',
    textDecoration: {
      default: 'none',
      ':hover': 'underline',
    },
  },
  loading: {
    margin: 0,
    color: color.muted,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: '22px',
  },
  empty: {
    margin: 0,
    paddingBlock: 24,
    color: color.muted,
    fontFamily: font.display,
    fontSize: 16,
    lineHeight: '24px',
  },
});

export function DashboardPage() {
  const t = useT();
  const { runtimeStatus } = useAppConfig();
  const { history, isLoading, refreshHistory } = useTranscriptionHistory();
  const [displayName, setDisplayName] = useState('Iván');
  const [hour, setHour] = useState(() => new Date().getHours());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getDisplayName().then(name => {
      if (!cancelled) setDisplayName(name);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHour(new Date().getHours());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const unlisten = listen<{ id?: string }>('transcription-saved', event => {
      const id = event.payload.id;
      void (async () => {
        if (typeof id === 'string' && id.length > 0) {
          await attachPendingContextIfAny(id);
        }
        await refreshHistory();
      })();
    });
    return () => {
      unlisten.then(fn => fn()).catch(() => undefined);
    };
  }, [refreshHistory]);

  const recent = useMemo(() => history.slice(0, RECENT_LIMIT), [history]);
  const selected = recent.find(item => item.id === selectedId) ?? null;

  return (
    <div {...sx(styles.page)}>
      <div {...sx(styles.hero)}>
        <img
          src={HERO_SRC}
          alt={t('dashboard.heroAlt')}
          {...sx(styles.heroImg)}
        />
        <div {...sx(styles.heroScrim)} />
        <div {...sx(styles.greetingCol)}>
          <div {...sx(styles.greetingText)}>
            <h1 {...sx(styles.greeting)}>
              {greetingForHour(hour)}, {displayName}
            </h1>
            <p {...sx(styles.subhead)}>{t('dashboard.subhead')}</p>
          </div>
          <PromptPills />
        </div>
      </div>

      <section {...sx(styles.content)}>
        <div
          {...sx(
            styles.mainCard,
            selected ? styles.mainCardHiddenOnStack : false
          )}
        >
          <div {...sx(styles.recent)}>
            <div {...sx(styles.feedHead)}>
              <h2 {...sx(styles.feedTitle)}>{t('dashboard.recent')}</h2>
              <Link to="/historial" {...sx(styles.allLink)}>
                {t('common.seeAll')}
              </Link>
            </div>
            {isLoading ? (
              <p {...sx(styles.loading)}>{t('dashboard.loading')}</p>
            ) : recent.length === 0 ? (
              <p {...sx(styles.empty)}>{t('dashboard.empty')}</p>
            ) : (
              <RecentMurmulloList
                items={recent}
                selectedId={selected?.id ?? null}
                onSelect={id =>
                  setSelectedId(current => (current === id ? null : id))
                }
              />
            )}
          </div>
        </div>
        {selected ? (
          <MurmulloInspector
            record={selected}
            llmState={runtimeStatus?.llm_server.state}
            onClose={() => setSelectedId(null)}
          />
        ) : null}
      </section>
    </div>
  );
}
