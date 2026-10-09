import { useEffect, useState } from 'react';
import { toast } from '@/components/ui-system/toast';
import * as stylex from '@stylexjs/stylex';
import { dictionaryService } from '@/services/tauri';
import type { DictionaryEntry } from '@/types';
import { Button } from '@/components/ui-system/Button';
import { color, font, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { useT } from '@/i18n';
import {
  correctionLanguageLine,
  defaultCorrectionRules,
  type CorrectionPromptSlot,
} from './prompts';
import {
  loadCorrectionPrompts,
  saveCorrectionPrompt,
  type CorrectionPromptState,
} from './promptStore';

const styles = stylex.create({
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  slots: {
    display: 'flex',
    gap: 8,
  },
  area: {
    width: '100%',
    minHeight: 148,
    resize: 'vertical',
    boxSizing: 'border-box',
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.line,
    backgroundColor: color.surface,
    color: color.ink,
    padding: 12,
    fontFamily: font.mono,
    fontSize: 12,
    lineHeight: 1.5,
  },
  previewLabel: {
    margin: 0,
    marginTop: space.sm,
    color: color.muted,
    fontFamily: font.sans,
    fontSize: 12,
    fontWeight: 600,
  },
  preview: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    fontFamily: font.mono,
    fontSize: 12,
    lineHeight: 1.5,
    color: '#5A5551',
  },
  copy: {
    margin: 0,
    color: '#5A5551',
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: '20px',
  },
});

export function CorrectionPromptEditor({ builtin }: { builtin: boolean }) {
  const t = useT();
  const [slot, setSlot] = useState<CorrectionPromptSlot>('es');
  const [draft, setDraft] = useState('');
  const [stored, setStored] = useState<CorrectionPromptState | null>(null);
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      loadCorrectionPrompts(),
      dictionaryService.list().catch(() => [] as DictionaryEntry[]),
    ]).then(([prompts, dictionary]) => {
      if (cancelled) return;
      setStored(prompts);
      setEntries(dictionary);
      setSlot('es');
      setDraft(initialDraft(builtin, 'es', prompts));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [builtin]);

  if (!ready) return null;

  const fallback = currentDefault(builtin, slot, stored);
  const changed = draft.trim() !== fallback.trim();
  const preview = builtin
    ? `${draft.trim()}\n${correctionLanguageLine(slot)}`
    : providerPreview(draft, entries);

  const persist = async (
    target: 'es' | 'en' | 'provider',
    value: string,
    original: string
  ) => {
    const trimmed = value.trim();
    const text =
      trimmed.length === 0 || trimmed === original.trim() ? null : trimmed;
    const next = await saveCorrectionPrompt(target, text);
    if (!next) {
      toast.error(t('settings.promptSaveFailed'));
      return null;
    }
    setStored(next);
    return next;
  };

  return (
    <div {...sx(styles.stack)}>
      <div {...sx(styles.row)}>
        <p {...sx(styles.previewLabel)}>{t('settings.promptTitle')}</p>
        {builtin ? (
          <div {...sx(styles.slots)}>
            {(['es', 'en'] as const).map(item => (
              <Button
                key={item}
                size="sm"
                tone={slot === item ? 'primary' : 'quiet'}
                aria-pressed={slot === item}
                onClick={() => {
                  if (item === slot) return;
                  void persist(slot, draft, fallback).then(next => {
                    setSlot(item);
                    setDraft(initialDraft(true, item, next ?? stored));
                  });
                }}
              >
                {item === 'es'
                  ? t('settings.promptEs')
                  : t('settings.promptEn')}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
      <p {...sx(styles.copy)}>
        {builtin
          ? t('settings.promptMurmulloBody')
          : t('settings.promptProviderBody')}
      </p>
      <textarea
        {...sx(styles.area)}
        aria-label={t('settings.promptTitle')}
        value={draft}
        onChange={event => setDraft(event.target.value)}
        onBlur={() => {
          void persist(builtin ? slot : 'provider', draft, fallback);
        }}
      />
      <div {...sx(styles.row)}>
        <p {...sx(styles.copy)}>{builtin ? t('settings.promptHint') : null}</p>
        <Button
          tone="quiet"
          size="sm"
          disabled={!changed}
          onClick={() => {
            setDraft(fallback);
            void persist(builtin ? slot : 'provider', fallback, fallback).then(
              ok => {
                if (ok) toast.success(t('settings.promptRestored'));
              }
            );
          }}
        >
          {t('settings.promptRestore')}
        </Button>
      </div>
      <p {...sx(styles.previewLabel)}>{t('settings.promptPreview')}</p>
      <pre {...sx(styles.preview)}>{preview}</pre>
    </div>
  );
}

function currentDefault(
  builtin: boolean,
  slot: CorrectionPromptSlot,
  stored: CorrectionPromptState | null
): string {
  if (!builtin) return stored?.provider_default ?? '';
  return defaultCorrectionRules(slot);
}

function initialDraft(
  builtin: boolean,
  slot: CorrectionPromptSlot,
  stored: CorrectionPromptState | null
): string {
  if (!builtin) return stored?.provider ?? stored?.provider_default ?? '';
  const custom = slot === 'es' ? stored?.es : stored?.en;
  return custom?.trim() ? custom : defaultCorrectionRules(slot);
}

function providerPreview(header: string, entries: DictionaryEntry[]): string {
  const dictionary =
    entries.length === 0
      ? '(vacío)\n'
      : `${entries.map(entry => `- ${entry.term} → ${entry.replacement}`).join('\n')}\n`;
  return `${header.trim()}\n\n## Diccionario\n${dictionary}`;
}
