import { useEffect, useMemo, useState } from 'react';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { listen } from '@tauri-apps/api/event';
import {
  Copy,
  Trash2,
  Download,
  ClipboardPaste,
  SpellCheck,
  Search,
  X,
} from 'lucide-react';
import { toast } from '@/components/ui-system/toast';
import * as stylex from '@stylexjs/stylex';
import { useTranscriptionHistory } from '@/hooks/useTranscriptionHistory';
import { insertionService, dictionaryService } from '@/services/tauri';
import { useAppConfig } from '@/contexts/AppConfigContext';
import { formatHotkey } from '@/lib/hotkey';
import {
  firstLineTitle,
  formatDuration,
  formatRelativeTime,
  previewText,
} from '@/lib/formatRelativeTime';
import { contextFromMetadata } from '@/lib/pendingDictationContext';
import { PageFrame } from '@/components/ui-system/PageFrame';
import { PageHeader } from '@/components/ui-system/PageHeader';
import { Surface } from '@/components/ui-system/Surface';
import { EmptyState } from '@/components/ui-system/EmptyState';
import { Button } from '@/components/ui-system/Button';
import { ContextChip } from '@/components/dashboard/ContextChip';
import {
  color,
  font,
  motion,
  radius,
  shadow,
  space,
} from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { useT, mapBackendError } from '@/i18n';

const historialRoute = getRouteApi('/historial');

const COMPACT = '@media (max-width: 960px)';
const STACK = '@media (max-width: 1100px)';

const styles = stylex.create({
  stats: {
    display: 'flex',
    gap: space.sm,
    flexWrap: 'nowrap',
  },
  stat: {
    minWidth: {
      default: 88,
      [COMPACT]: 56,
    },
  },
  statValue: {
    margin: 0,
    fontFamily: font.display,
    fontSize: {
      default: '1.4rem',
      [COMPACT]: '1.2rem',
    },
    fontWeight: 500,
  },
  statLabel: {
    margin: 0,
    color: color.muted,
    fontFamily: font.sans,
    fontSize: 12,
  },
  search: {
    position: 'relative',
    flexShrink: 0,
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    color: color.muted,
  },
  input: {
    width: '100%',
    borderRadius: radius.pill,
    borderWidth: 0,
    paddingLeft: 42,
    paddingRight: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: color.raised,
    color: color.ink,
    fontFamily: font.sans,
    fontSize: 14,
    boxShadow: 'inset 0 1px 2px rgba(28, 26, 25, 0.03)',
    outlineColor: {
      default: 'transparent',
      ':focus': color.focus,
    },
    outlineStyle: {
      default: 'none',
      ':focus': 'solid',
    },
    outlineWidth: {
      default: 0,
      ':focus': 2,
    },
  },
  layout: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
    flex: '1',
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    flex: '1',
    minWidth: 0,
    minHeight: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  listHiddenOnStack: {
    display: {
      default: 'flex',
      [STACK]: 'none',
    },
  },
  detail: {
    flex: {
      default: '0 0 340px',
      [STACK]: '1',
    },
    width: {
      default: 340,
      [STACK]: '100%',
    },
    maxWidth: '100%',
    minWidth: 0,
    minHeight: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
    backgroundColor: '#FFFFFF',
  },
  detailHead: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
    marginBottom: space.sm,
  },
  close: {
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
  },
  item: {
    display: 'grid',
    gridTemplateColumns: '32px minmax(0, 1fr) auto',
    alignItems: 'center',
    columnGap: 12,
    width: '100%',
    minWidth: 0,
    overflow: 'hidden',
    textAlign: 'left',
    cursor: 'pointer',
    paddingBlock: {
      default: 16,
      [COMPACT]: 12,
    },
    paddingInline: {
      default: 20,
      [COMPACT]: 14,
    },
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.line,
    borderRadius: 20,
    backgroundColor: {
      default: color.surface,
      ':hover': '#FFFFFF',
    },
    color: 'inherit',
    boxShadow: {
      default: shadow.card,
      ':hover':
        '0 8px 24px -6px rgba(45, 42, 41, 0.08), 0 1px 3px 0 rgba(45, 42, 41, 0.04)',
    },
    transform: {
      default: 'none',
      ':hover': 'translateY(-1px)',
    },
    transitionProperty: 'background-color, box-shadow, transform',
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
  active: {
    backgroundColor: '#FFFFFF',
    boxShadow: shadow.card,
    borderColor: 'rgba(138, 127, 214, 0.35)',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    flexShrink: 0,
    backgroundColor: '#232128',
    boxShadow: '0 8px 18px -8px rgba(138, 127, 214, 0.45)',
    position: 'relative',
  },
  eye: {
    position: 'absolute',
    top: 11,
    width: 4,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: '#f7f4ef',
  },
  eyeLeft: { left: 8 },
  eyeRight: { right: 8 },
  body: {
    flex: '1',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  itemTitle: {
    margin: 0,
    fontFamily: font.sans,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: '20px',
    color: color.ink,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  snippet: {
    margin: 0,
    color: '#5A5551',
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: '16px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  trailing: {
    display: 'flex',
    flexDirection: {
      default: 'row',
      [STACK]: 'column',
    },
    alignItems: {
      default: 'center',
      [STACK]: 'flex-end',
    },
    justifyContent: 'flex-end',
    gap: 8,
    minWidth: 0,
    flexShrink: 0,
  },
  meta: {
    color: color.muted,
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: '16px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  kicker: {
    margin: 0,
    color: color.muted,
    fontFamily: font.sans,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  detailText: {
    margin: 0,
    marginBottom: space.md,
    color: color.ink,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: '22px',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },
});

function MiniCompanion() {
  return (
    <span {...sx(styles.avatar)} aria-hidden>
      <span {...sx(styles.eye, styles.eyeLeft)} />
      <span {...sx(styles.eye, styles.eyeRight)} />
    </span>
  );
}

export function TranscriptionsPage() {
  const t = useT();
  const { q } = historialRoute.useSearch();
  const navigate = useNavigate({ from: '/historial' });
  const { config } = useAppConfig();
  const ptt = formatHotkey(config?.hotkeys.push_to_talk);
  const {
    history,
    removeTranscription,
    copyToClipboard,
    downloadAudioFile,
    refreshHistory,
  } = useTranscriptionHistory();
  const query = q ?? '';
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const unlisten = listen('transcription-saved', () => {
      refreshHistory();
    });
    return () => {
      unlisten.then(fn => fn());
    };
  }, [refreshHistory]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return history;
    return history.filter(item => item.text.toLowerCase().includes(needle));
  }, [history, query]);

  const selected = filtered.find(item => item.id === selectedId) ?? null;

  const words = history.reduce(
    (sum, item) => sum + item.text.split(/\s+/).filter(Boolean).length,
    0
  );
  const minutes = Math.round(
    history.reduce((sum, item) => sum + item.duration_ms, 0) / 60000
  );

  return (
    <PageFrame fill>
      <PageHeader
        title={t('history.title')}
        lede={t('history.lede')}
        actions={
          <div {...sx(styles.stats)}>
            {[
              { label: t('history.words'), value: words.toLocaleString() },
              { label: t('history.minutes'), value: String(minutes) },
              { label: t('history.clips'), value: String(history.length) },
            ].map(stat => (
              <Surface key={stat.label} padded="sm">
                <div {...sx(styles.stat)}>
                  <p {...sx(styles.statValue)}>{stat.value}</p>
                  <p {...sx(styles.statLabel)}>{stat.label}</p>
                </div>
              </Surface>
            ))}
          </div>
        }
      />

      <div {...sx(styles.search)}>
        <Search size={16} {...sx(styles.searchIcon)} />
        <input
          value={query}
          onChange={e =>
            void navigate({
              search: prev => ({
                ...prev,
                q: e.target.value ? e.target.value : undefined,
              }),
            })
          }
          placeholder={t('history.searchPlaceholder')}
          aria-label={t('history.searchAria')}
          {...sx(styles.input)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={
            history.length === 0
              ? t('history.emptyTitle')
              : t('history.noMatchTitle')
          }
          body={
            history.length === 0
              ? t('history.emptyBody', { ptt })
              : t('history.noMatchBody')
          }
        />
      ) : (
        <div {...sx(styles.layout)}>
          <div
            {...sx(styles.list, selected ? styles.listHiddenOnStack : false)}
          >
            {filtered.map(item => {
              const active = selected?.id === item.id;
              const context = contextFromMetadata(item.metadata);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setSelectedId(current =>
                      current === item.id ? null : item.id
                    )
                  }
                  aria-pressed={active}
                  {...sx(styles.item, active ? styles.active : false)}
                >
                  <MiniCompanion />
                  <span {...sx(styles.body)}>
                    <span {...sx(styles.itemTitle)}>
                      {firstLineTitle(item.text)}
                    </span>
                    <span {...sx(styles.snippet)}>
                      {previewText(item.text)}
                    </span>
                  </span>
                  <span {...sx(styles.trailing)}>
                    <span {...sx(styles.meta)}>
                      {formatRelativeTime(item.created_at)}
                    </span>
                    {context ? <ContextChip context={context} /> : null}
                  </span>
                </button>
              );
            })}
          </div>

          {selected ? (
            <Surface
              as="aside"
              xstyle={styles.detail}
              aria-label={t('history.detail')}
            >
              <div {...sx(styles.detailHead)}>
                <p {...sx(styles.kicker)}>{t('history.detail')}</p>
                <button
                  type="button"
                  aria-label={t('history.closeDetail')}
                  onClick={() => setSelectedId(null)}
                  {...sx(styles.close)}
                >
                  <X size={16} strokeWidth={1.8} aria-hidden />
                </button>
              </div>
              <p {...sx(styles.detailText)}>{selected.text}</p>
              <p {...sx(styles.meta)}>
                {formatDuration(selected.duration_ms)} · {selected.model_used}
              </p>
              <div {...sx(styles.actions)}>
                <Button
                  size="sm"
                  tone="ghost"
                  onClick={() => copyToClipboard(selected.text)}
                >
                  <Copy size={13} strokeWidth={1.5} /> {t('history.copy')}
                </Button>
                <Button
                  size="sm"
                  tone="ghost"
                  onClick={async () => {
                    try {
                      await insertionService.insertText(selected.text);
                      toast.success(t('history.pasted'));
                    } catch (e) {
                      toast.error(mapBackendError(e));
                    }
                  }}
                >
                  <ClipboardPaste size={13} strokeWidth={1.5} />{' '}
                  {t('history.paste')}
                </Button>
                <Button
                  size="sm"
                  tone="ghost"
                  onClick={async () => {
                    const replacement = window.prompt(
                      t('history.correctedPrompt'),
                      selected.text
                    );
                    if (!replacement) return;
                    await dictionaryService.applyCorrection(
                      selected.raw_text || selected.text,
                      replacement
                    );
                    toast.success(t('dictionary.updated'));
                  }}
                >
                  <SpellCheck size={13} strokeWidth={1.5} />{' '}
                  {t('history.correct')}
                </Button>
                <Button
                  size="sm"
                  tone="quiet"
                  onClick={async () => {
                    const timestamp = new Date(selected.created_at)
                      .toISOString()
                      .split('T')[0];
                    await downloadAudioFile(
                      selected.id,
                      `murmullo_${timestamp}_${selected.id.substring(0, 8)}.wav`
                    );
                  }}
                >
                  <Download size={13} strokeWidth={1.5} /> {t('history.audio')}
                </Button>
                <Button
                  size="sm"
                  tone="danger"
                  onClick={() => removeTranscription(selected.id)}
                >
                  <Trash2 size={13} strokeWidth={1.5} /> {t('history.delete')}
                </Button>
              </div>
            </Surface>
          ) : null}
        </div>
      )}
    </PageFrame>
  );
}
