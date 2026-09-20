import { useEffect, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Copy, Sparkles, X } from 'lucide-react';
import { toast } from '@/components/ui-system/toast';
import * as stylex from '@stylexjs/stylex';
import {
  color,
  font,
  motion,
  radius,
  shadow,
  space,
} from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { ContextChip } from '@/components/dashboard/ContextChip';
import { Button } from '@/components/ui-system/Button';
import {
  formatDuration,
  formatRelativeTime,
  firstLineTitle,
  wordCount,
} from '@/lib/formatRelativeTime';
import {
  improvePrompt,
  summarizePrompt,
  rewriteWithConfiguredLlm,
} from '@/lib/localLlm';
import { contextFromMetadata } from '@/lib/pendingDictationContext';
import { TranscriptionService } from '@/services/transcriptionService';
import type { TranscriptionRecord } from '@/types/transcription';
import { useT } from '@/i18n';

type InspectorTab = 'texto' | 'resumen' | 'acciones';

const styles = stylex.create({
  panel: {
    flex: {
      default: '0 0 340px',
      '@media (max-width: 1100px)': '1',
    },
    width: {
      default: 340,
      '@media (max-width: 1100px)': '100%',
    },
    maxWidth: '100%',
    minWidth: 0,
    minHeight: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    padding: 20,
    borderRadius: radius.xl,
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderStyle: 'solid',
    borderWidth: 1,
    boxShadow: shadow.card,
  },
  head: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  title: {
    margin: 0,
    flex: '1',
    minWidth: 0,
    fontFamily: font.sans,
    fontSize: 16,
    fontWeight: 600,
    lineHeight: '22px',
    color: color.ink,
  },
  close: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
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
  meta: {
    margin: 0,
    color: color.muted,
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: '18px',
  },
  tabs: {
    display: 'flex',
    padding: 4,
    gap: 2,
    borderRadius: radius.pill,
    backgroundColor: color.raised,
  },
  tab: {
    flex: '1',
    height: 30,
    borderWidth: 0,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    color: color.muted,
    cursor: 'pointer',
    fontFamily: font.sans,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: '16px',
    transitionProperty: 'background-color, color, box-shadow',
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
  tabActive: {
    backgroundColor: color.surface,
    color: color.ink,
    boxShadow: '0 1px 3px rgba(45, 42, 41, 0.08)',
  },
  body: {
    margin: 0,
    color: color.ink,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: '22px',
    whiteSpace: 'pre-wrap',
  },
  empty: {
    margin: 0,
    color: color.muted,
    fontFamily: font.editorial,
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: '24px',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  player: {
    width: '100%',
    marginTop: space.sm,
    height: 36,
  },
});

function isLlmRunning(state: string | undefined): boolean {
  return state === 'running';
}

export function MurmulloInspector({
  record,
  llmState,
  onClose,
}: {
  record: TranscriptionRecord;
  llmState: string | undefined;
  onClose: () => void;
}) {
  const t = useT();
  const [tab, setTab] = useState<InspectorTab>('texto');
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryTried, setSummaryTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const context = contextFromMetadata(record.metadata);
  const llmReady = isLlmRunning(llmState);
  const words = wordCount(record.text);

  useEffect(() => {
    setTab('texto');
    setSummary(null);
    setSummaryTried(false);
    setAudioSrc(null);
  }, [record.id]);

  useEffect(() => {
    let cancelled = false;
    void TranscriptionService.getAudioFilePath(record.id)
      .then(path => {
        if (cancelled || !path) return;
        setAudioSrc(convertFileSrc(path));
      })
      .catch(() => {
        if (!cancelled) setAudioSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [record.id]);

  useEffect(() => {
    if (tab !== 'resumen' || summaryTried || !llmReady) return;
    let cancelled = false;
    setBusy(true);
    void rewriteWithConfiguredLlm(summarizePrompt(), record.text)
      .then(text => {
        if (!cancelled) setSummary(text);
      })
      .finally(() => {
        if (!cancelled) {
          setBusy(false);
          setSummaryTried(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tab, summaryTried, llmReady, record.text]);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(record.text);
      toast.success(t('dashboard.inspector.copied'));
    } catch {
      toast.error(t('dashboard.inspector.copyFailed'));
    }
  };

  const improveText = async () => {
    if (!llmReady) {
      toast.message(t('dashboard.inspector.llmOptional'));
      return;
    }
    setBusy(true);
    try {
      const improved = await rewriteWithConfiguredLlm(
        improvePrompt(),
        record.text
      );
      if (!improved) {
        toast.message(t('dashboard.inspector.llmOptional'));
        return;
      }
      await navigator.clipboard.writeText(improved);
      toast.success(t('dashboard.inspector.improveCopied'));
    } catch {
      toast.message(t('dashboard.inspector.llmOptional'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside {...sx(styles.panel)} aria-label={t('dashboard.inspector.aria')}>
      <div {...sx(styles.head)}>
        <h2 {...sx(styles.title)}>{firstLineTitle(record.text, 96)}</h2>
        <button
          type="button"
          aria-label={t('dashboard.inspector.close')}
          onClick={onClose}
          {...sx(styles.close)}
        >
          <X size={16} strokeWidth={1.8} aria-hidden />
        </button>
      </div>
      <p {...sx(styles.meta)}>
        {formatRelativeTime(record.created_at)} ·{' '}
        {formatDuration(record.duration_ms)} ·{' '}
        {t('dashboard.words', { count: words })}
      </p>
      {context ? <ContextChip context={context} /> : null}

      <div
        {...sx(styles.tabs)}
        role="tablist"
        aria-label={t('dashboard.inspector.tabsAria')}
      >
        {(
          [
            ['texto', t('dashboard.inspector.text')],
            ['resumen', t('dashboard.inspector.summary')],
            ['acciones', t('dashboard.inspector.actions')],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            {...sx(styles.tab, tab === id ? styles.tabActive : false)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'texto' ? <p {...sx(styles.body)}>{record.text}</p> : null}

      {tab === 'resumen' ? (
        summary ? (
          <p {...sx(styles.body)}>{summary}</p>
        ) : (
          <p {...sx(styles.empty)}>
            {busy
              ? t('dashboard.inspector.summarizing')
              : t('dashboard.inspector.llmOptional')}
          </p>
        )
      ) : null}

      {tab === 'acciones' ? (
        <div>
          <div {...sx(styles.actions)}>
            <Button size="sm" tone="ghost" onClick={() => void copyText()}>
              <Copy size={13} strokeWidth={1.5} aria-hidden />
              {t('common.copy')}
            </Button>
            <Button
              size="sm"
              tone="ghost"
              disabled={busy}
              onClick={() => void improveText()}
            >
              <Sparkles size={13} strokeWidth={1.5} aria-hidden />
              {t('dashboard.inspector.improve')}
            </Button>
          </div>
          {audioSrc ? (
            <audio
              controls
              src={audioSrc}
              {...sx(styles.player)}
              onError={() => setAudioSrc(null)}
            >
              {t('dashboard.inspector.audioFallback')}
            </audio>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
