import { useEffect, useMemo, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import {
  Copy,
  Trash2,
  Download,
  ClipboardPaste,
  SpellCheck,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranscriptionHistory } from '../../hooks/useTranscriptionHistory';
import { insertionService, dictionaryService } from '../../services/tauri';
import { useAppConfig } from '../../contexts/AppConfigContext';
import { formatHotkey } from '../../lib/hotkey';

export function TranscriptionsPage() {
  const { config } = useAppConfig();
  const ptt = formatHotkey(config?.hotkeys.push_to_talk);
  const {
    history,
    removeTranscription,
    copyToClipboard,
    downloadAudioFile,
    refreshHistory,
  } = useTranscriptionHistory();
  const [query, setQuery] = useState('');
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
    const q = query.trim().toLowerCase();
    if (!q) return history;
    return history.filter(item => item.text.toLowerCase().includes(q));
  }, [history, query]);

  const selected =
    filtered.find(item => item.id === selectedId) ?? filtered[0] ?? null;

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const getTimeAgo = (timestamp: string) => {
    const diffMinutes = Math.floor(
      (Date.now() - new Date(timestamp).getTime()) / 60000
    );
    if (diffMinutes < 60) return `${diffMinutes} min`;
    const hours = Math.floor(diffMinutes / 60);
    if (hours < 24) return `${hours} h`;
    return `${Math.floor(hours / 24)} d`;
  };

  const words = history.reduce(
    (sum, item) => sum + item.text.split(/\s+/).filter(Boolean).length,
    0
  );
  const minutes = Math.round(
    history.reduce((sum, item) => sum + item.duration_ms, 0) / 60000
  );

  return (
    <div className="min-h-full px-6 py-6 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">
            Historial de Transcripciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dictados, correcciones y audio local
          </p>
        </div>
        <div className="flex gap-3">
          {[
            { label: 'Palabras', value: words.toLocaleString() },
            { label: 'Minutos', value: String(minutes) },
            { label: 'Clips', value: String(history.length) },
          ].map(stat => (
            <div key={stat.label} className="vf-card px-4 py-2 min-w-[92px]">
              <div className="text-lg font-semibold">{stat.value}</div>
              <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar dictados, conceptos, jerga…"
          className="w-full vf-inset rounded-full pl-11 pr-4 py-2.5 text-sm bg-surface-2 border-0"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="vf-card p-10 text-center text-sm text-muted-foreground">
          Aún no hay transcripciones. Dicta con {ptt} para empezar.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
          <div className="space-y-3">
            {filtered.map(item => {
              const active = selected?.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-left vf-card p-4 transition-shadow ${active ? 'ring-1 ring-primary/70' : ''}`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h3 className="text-sm font-semibold truncate">
                      {item.text.split('.')[0]}
                    </h3>
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                      {getTimeAgo(item.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {item.text}
                  </p>
                  <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
                    <span>{formatDuration(item.duration_ms)}</span>
                    <span className="px-2 py-0.5 rounded-full bg-surface-4">
                      {item.model_used}
                    </span>
                    {item.language && <span>{item.language}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {selected && (
            <aside className="vf-card p-5 h-fit sticky top-4 space-y-4">
              <div>
                <div className="font-mono text-[10px] text-cyan uppercase tracking-wider mb-2">
                  Detalle
                </div>
                <p className="text-sm leading-relaxed">{selected.text}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Action
                  onClick={() => copyToClipboard(selected.text)}
                  icon={Copy}
                  label="Copiar"
                />
                <Action
                  onClick={async () => {
                    try {
                      await insertionService.insertText(selected.text);
                      toast.success('Pegado');
                    } catch (e) {
                      toast.error(String(e));
                    }
                  }}
                  icon={ClipboardPaste}
                  label="Pegar"
                />
                <Action
                  onClick={async () => {
                    const replacement = window.prompt(
                      'Texto corregido',
                      selected.text
                    );
                    if (!replacement) return;
                    await dictionaryService.applyCorrection(
                      selected.raw_text || selected.text,
                      replacement
                    );
                    toast.success('Diccionario actualizado');
                  }}
                  icon={SpellCheck}
                  label="Corregir"
                />
                <Action
                  onClick={async () => {
                    const timestamp = new Date(selected.created_at)
                      .toISOString()
                      .split('T')[0];
                    await downloadAudioFile(
                      selected.id,
                      `murmullo_${timestamp}_${selected.id.substring(0, 8)}.wav`
                    );
                  }}
                  icon={Download}
                  label="Audio"
                />
                <Action
                  onClick={() => removeTranscription(selected.id)}
                  icon={Trash2}
                  label="Borrar"
                />
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

function Action({
  onClick,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  icon: typeof Copy;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-4 text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
    >
      <Icon size={12} />
      {label}
    </button>
  );
}
