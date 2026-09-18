import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { dictionaryService } from '@/services/tauri';
import type { DictionaryEntry } from '@/types';

export function DictionaryPage() {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [term, setTerm] = useState('');
  const [replacement, setReplacement] = useState('');
  const [prompt, setPrompt] = useState('');

  const refresh = async () => {
    setEntries(await dictionaryService.list());
    setPrompt(await dictionaryService.prompt());
  };

  useEffect(() => {
    refresh().catch(console.error);
  }, []);

  const add = async () => {
    if (!term.trim() || !replacement.trim()) {
      toast.error('Término y reemplazo son obligatorios');
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
    <div className="min-h-full px-6 py-6 space-y-5">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight">
          Diccionario AI
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Reemplazos deterministas antes del LLM. Cada cambio regenera el system
          prompt.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <div className="vf-card p-5 space-y-4">
          <div className="font-mono text-[10px] text-cyan uppercase tracking-wider">
            Nueva regla de vocabulario
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={term}
              onChange={e => setTerm(e.target.value)}
              placeholder="como lo oye el STT"
              className="flex-1 vf-inset rounded-xl px-3 py-2 text-sm border-0"
            />
            <input
              value={replacement}
              onChange={e => setReplacement(e.target.value)}
              placeholder="reemplazo"
              className="flex-1 vf-inset rounded-xl px-3 py-2 text-sm border-0"
            />
            <button
              onClick={add}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
            >
              <Plus size={14} /> Añadir
            </button>
          </div>

          <div className="space-y-2">
            {entries.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Vacío. Añade nombres, marcas o jerga.
              </p>
            )}
            {entries.map(entry => (
              <div
                key={entry.id}
                className="flex items-center justify-between vf-inset rounded-xl px-3 py-2"
              >
                <div className="text-sm">
                  <span className="font-mono text-muted-foreground">
                    {entry.term}
                  </span>
                  <span className="mx-2 text-cyan">→</span>
                  <span>{entry.replacement}</span>
                </div>
                <button
                  onClick={() => remove(entry.id)}
                  className="text-destructive p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <aside className="vf-card p-5">
          <div className="font-mono text-[10px] text-amber uppercase tracking-wider mb-3">
            System prompt
          </div>
          <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {prompt || 'Se genera al añadir la primera regla.'}
          </pre>
        </aside>
      </div>
    </div>
  );
}
