import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import * as stylex from '@stylexjs/stylex';
import { dictionaryService } from '@/services/tauri';
import type { DictionaryEntry } from '@/types';
import { PageFrame } from '@/components/ui-system/PageFrame';
import { PageHeader } from '@/components/ui-system/PageHeader';
import { Surface } from '@/components/ui-system/Surface';
import { BoothButton } from '@/components/ui-system/BoothButton';
import { EmptyState } from '@/components/ui-system/EmptyState';
import { color, font, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  grid: {
    display: 'grid',
    gridTemplateColumns: {
      default: '1fr 360px',
      '@media (max-width: 1080px)': '1fr',
    },
    gap: space.md,
  },
  form: {
    display: 'flex',
    flexDirection: 'row',
    gap: space.sm,
    flexWrap: 'wrap',
  },
  input: {
    flex: '1',
    minWidth: 140,
    borderRadius: radius.md,
    borderWidth: 0,
    padding: '0.65rem 0.8rem',
    backgroundColor: color.raised,
    color: color.ink,
  },
  kicker: {
    margin: 0,
    marginBottom: space.md,
    color: color.copper,
    fontSize: '0.8rem',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: color.raised,
    marginBottom: space.sm,
  },
  term: {
    fontFamily: font.mono,
    color: color.muted,
    fontSize: '0.85rem',
  },
  prompt: {
    margin: 0,
    fontFamily: font.mono,
    fontSize: '0.7rem',
    color: color.muted,
    whiteSpace: 'pre-wrap',
    lineHeight: 1.5,
  },
});

export function DictionaryPage() {
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
      toast.error('Escribe el término oído y el reemplazo');
      return;
    }
    await dictionaryService.add(term.trim(), replacement.trim());
    setTerm('');
    setReplacement('');
    await refresh();
    toast.success('Diccionario actualizado');
  };

  const remove = async (id: string) => {
    await dictionaryService.remove(id);
    await refresh();
  };

  return (
    <PageFrame>
      <PageHeader
        title="Diccionario"
        lede="Reemplazos deterministas antes del LLM. Cada cambio regenera el system prompt."
      />

      <div {...sx(styles.grid)}>
        <Surface>
          <p {...sx(styles.kicker)}>Nueva regla</p>
          <div {...sx(styles.form)}>
            <input
              value={term}
              onChange={e => setTerm(e.target.value)}
              placeholder="como lo oye el STT"
              aria-label="Término oído"
              {...sx(styles.input)}
            />
            <input
              value={replacement}
              onChange={e => setReplacement(e.target.value)}
              placeholder="reemplazo"
              aria-label="Reemplazo"
              {...sx(styles.input)}
            />
            <BoothButton onClick={() => void add()}>
              <Plus size={14} /> Añadir
            </BoothButton>
          </div>
          <div>
            {entries.length === 0 ? (
              <EmptyState
                title="Sin reglas todavía"
                body="Añade nombres, marcas o jerga que Parakeet suele transcribir mal."
              />
            ) : (
              entries.map(entry => (
                <div key={entry.id} {...sx(styles.row)}>
                  <div>
                    <span {...sx(styles.term)}>{entry.term}</span>
                    <span> se convierte en </span>
                    <span>{entry.replacement}</span>
                  </div>
                  <BoothButton
                    size="sm"
                    tone="danger"
                    onClick={() => void remove(entry.id)}
                    aria-label={`Borrar ${entry.term}`}
                  >
                    <Trash2 size={14} />
                  </BoothButton>
                </div>
              ))
            )}
          </div>
        </Surface>

        <Surface as="aside">
          <p {...sx(styles.kicker)}>System prompt</p>
          <pre {...sx(styles.prompt)}>
            {prompt || 'Se genera al añadir la primera regla.'}
          </pre>
        </Surface>
      </div>
    </PageFrame>
  );
}
