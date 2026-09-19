import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui-system/toast';
import * as stylex from '@stylexjs/stylex';
import { dictionaryService } from '@/services/tauri';
import type { DictionaryEntry } from '@/types';
import { PageFrame } from '@/components/ui-system/PageFrame';
import { PageHeader } from '@/components/ui-system/PageHeader';
import { Surface } from '@/components/ui-system/Surface';
import { Button } from '@/components/ui-system/Button';
import { EmptyState } from '@/components/ui-system/EmptyState';
import { color, font, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';
import { useT } from '@/i18n';

const styles = stylex.create({
  grid: {
    display: 'grid',
    gridTemplateColumns: {
      default: '1fr 360px',
      '@media (max-width: 1100px)': '1fr',
    },
    gap: space.md,
    alignItems: 'start',
  },
  form: {
    display: 'flex',
    flexDirection: 'row',
    gap: space.sm,
    flexWrap: 'wrap',
    marginBottom: space.md,
  },
  input: {
    flex: '1',
    minWidth: 140,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 0,
    paddingInline: '0.9rem',
    backgroundColor: color.raised,
    color: color.ink,
    fontFamily: font.sans,
    fontSize: 13,
  },
  kicker: {
    margin: 0,
    marginBottom: space.md,
    color: color.muted,
    fontFamily: font.sans,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  rows: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingBlock: 14,
    paddingInline: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderColor: color.line,
    borderStyle: 'solid',
    borderWidth: 1,
  },
  term: {
    fontFamily: font.sans,
    color: color.muted,
    fontSize: 13,
  },
  replacement: {
    fontFamily: font.sans,
    fontWeight: 600,
    fontSize: 13,
    color: color.ink,
  },
  prompt: {
    margin: 0,
    fontFamily: font.mono,
    fontSize: '0.7rem',
    color: '#5A5551',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.5,
  },
});

export function DictionaryPage() {
  const t = useT();
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [term, setTerm] = useState('');
  const [replacement, setReplacement] = useState('');
  const [prompt, setPrompt] = useState('');

  const refresh = async () => {
    const [nextEntries, nextPrompt] = await Promise.all([
      dictionaryService.list(),
      dictionaryService.prompt(),
    ]);
    setEntries(nextEntries);
    setPrompt(nextPrompt);
  };

  useEffect(() => {
    refresh().catch(console.error);
  }, []);

  const add = async () => {
    if (!term.trim() || !replacement.trim()) {
      toast.error(t('dictionary.needBoth'));
      return;
    }
    await dictionaryService.add(term.trim(), replacement.trim());
    setTerm('');
    setReplacement('');
    await refresh();
    toast.success(t('dictionary.updated'));
  };

  const remove = async (id: string) => {
    await dictionaryService.remove(id);
    await refresh();
  };

  return (
    <PageFrame>
      <PageHeader title={t('dictionary.title')} lede={t('dictionary.lede')} />

      <div {...sx(styles.grid)}>
        <Surface>
          <p {...sx(styles.kicker)}>{t('dictionary.newRule')}</p>
          <div {...sx(styles.form)}>
            <input
              value={term}
              onChange={e => setTerm(e.target.value)}
              placeholder={t('dictionary.heardPlaceholder')}
              aria-label={t('dictionary.heardAria')}
              {...sx(styles.input)}
            />
            <input
              value={replacement}
              onChange={e => setReplacement(e.target.value)}
              placeholder={t('dictionary.replacementPlaceholder')}
              aria-label={t('dictionary.replacementAria')}
              {...sx(styles.input)}
            />
            <Button onClick={() => void add()}>
              <Plus size={14} strokeWidth={1.5} /> {t('dictionary.add')}
            </Button>
          </div>
          <div {...sx(styles.rows)}>
            {entries.length === 0 ? (
              <EmptyState
                title={t('dictionary.emptyTitle')}
                body={t('dictionary.emptyBody')}
              />
            ) : (
              entries.map(entry => (
                <div key={entry.id} {...sx(styles.row)}>
                  <div>
                    <span {...sx(styles.term)}>{entry.term}</span>
                    <span>{t('dictionary.becomes')}</span>
                    <span {...sx(styles.replacement)}>{entry.replacement}</span>
                  </div>
                  <Button
                    size="icon"
                    tone="danger"
                    onClick={() => void remove(entry.id)}
                    aria-label={t('dictionary.deleteTerm', {
                      term: entry.term,
                    })}
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </Button>
                </div>
              ))
            )}
          </div>
        </Surface>

        <Surface as="aside">
          <p {...sx(styles.kicker)}>{t('dictionary.systemPrompt')}</p>
          <pre {...sx(styles.prompt)}>
            {prompt || t('dictionary.promptEmpty')}
          </pre>
        </Surface>
      </div>
    </PageFrame>
  );
}
