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
} from 'lucide-react';
import { toast } from 'sonner';
import * as stylex from '@stylexjs/stylex';
import { useTranscriptionHistory } from '@/hooks/useTranscriptionHistory';
import { insertionService, dictionaryService } from '@/services/tauri';
import { useAppConfig } from '@/contexts/AppConfigContext';
import { formatHotkey } from '@/lib/hotkey';
import { PageFrame } from '@/components/ui-system/PageFrame';
import { PageHeader } from '@/components/ui-system/PageHeader';
import { Surface } from '@/components/ui-system/Surface';
import { EmptyState } from '@/components/ui-system/EmptyState';
import { BoothButton } from '@/components/ui-system/BoothButton';
import { color, font, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const historialRoute = getRouteApi('/historial');

const styles = stylex.create({
  stats: {
    display: 'flex',
    gap: space.sm,
    flexWrap: 'wrap',
  },
  stat: {
    minWidth: 88,
  },
  statValue: {
    margin: 0,
    fontFamily: font.display,
    fontSize: '1.4rem',
  },
  statLabel: {
    margin: 0,
    color: color.muted,
    fontSize: '0.75rem',
  },
  search: {
    position: 'relative',
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
    fontSize: '0.9rem',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: {
      default: '1fr 320px',
      '@media (max-width: 1080px)': '1fr',
    },
    gap: space.md,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
  },
  item: {
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    color: 'inherit',
  },
  active: {
    outlineColor: color.copper,
    outlineStyle: 'solid',
    outlineWidth: 1,
    borderRadius: radius.lg,
  },
  itemTitle: {
    margin: 0,
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  meta: {
    color: color.muted,
    fontSize: '0.75rem',
    fontFamily: font.mono,
  },
  snippet: {
    color: color.muted,
    fontSize: '0.85rem',
    marginTop: space.sm,
    marginBottom: space.sm,
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  kicker: {
    margin: 0,
    marginBottom: space.sm,
    color: color.copper,
    fontSize: '0.8rem',
  },
});

export function TranscriptionsPage() {
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
    <PageFrame>
      <PageHeader
        title="Historial"
        lede="Dictados, correcciones y audio local. Busca y pega de nuevo."
        actions={
          <div {...sx(styles.stats)}>
            {[
              { label: 'Palabras', value: words.toLocaleString() },
              { label: 'Minutos', value: String(minutes) },
              { label: 'Clips', value: String(history.length) },
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
          placeholder="Busca un dictado"
          aria-label="Buscar dictados"
          {...sx(styles.input)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={history.length === 0 ? 'Aún no hay dictados' : 'Nada coincide'}
          body={
            history.length === 0
              ? `Dicta con ${ptt} y el texto aparecerá aquí.`
              : 'Prueba otro término o borra la búsqueda.'
          }
        />
      ) : (
        <div {...sx(styles.layout)}>
          <div {...sx(styles.list)}>
            {filtered.map(item => {
              const active = selected?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  {...sx(styles.item, active ? styles.active : false)}
                >
                  <Surface>
                    <p {...sx(styles.itemTitle)}>
                      {item.text.split('.')[0]}
                    </p>
                    <p {...sx(styles.snippet)}>{item.text}</p>
                    <p {...sx(styles.meta)}>
                      {getTimeAgo(item.created_at)} ·{' '}
                      {formatDuration(item.duration_ms)} · {item.model_used}
                    </p>
                  </Surface>
                </button>
              );
            })}
          </div>

          {selected ? (
            <Surface as="aside">
              <p {...sx(styles.kicker)}>Detalle</p>
              <p>{selected.text}</p>
              <div {...sx(styles.actions)}>
                <BoothButton
                  size="sm"
                  tone="quiet"
                  onClick={() => copyToClipboard(selected.text)}
                >
                  <Copy size={12} /> Copiar
                </BoothButton>
                <BoothButton
                  size="sm"
                  tone="quiet"
                  onClick={async () => {
                    try {
                      await insertionService.insertText(selected.text);
                      toast.success('Pegado');
                    } catch (e) {
                      toast.error(String(e));
                    }
                  }}
                >
                  <ClipboardPaste size={12} /> Pegar
                </BoothButton>
                <BoothButton
                  size="sm"
                  tone="quiet"
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
                >
                  <SpellCheck size={12} /> Corregir
                </BoothButton>
                <BoothButton
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
                  <Download size={12} /> Audio
                </BoothButton>
                <BoothButton
                  size="sm"
                  tone="danger"
                  onClick={() => removeTranscription(selected.id)}
                >
                  <Trash2 size={12} /> Borrar
                </BoothButton>
              </div>
            </Surface>
          ) : null}
        </div>
      )}
    </PageFrame>
  );
}
