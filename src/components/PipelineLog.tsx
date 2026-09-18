import { useEffect, useRef } from 'react';
import type { PipelineLogEntry } from '@/types';
import { usePipelineLogs } from '@/hooks/usePipelineLogs';

function stageClass(stage: string) {
  if (stage === 'nemo' || stage === 'stt') return 'text-cyan';
  if (stage === 'ptt') return 'text-foreground';
  if (stage === 'audio') return 'text-amber';
  return 'text-muted-foreground';
}

function formatClock(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function PipelineLogPanel({ compact = false }: { compact?: boolean }) {
  const { logs, path } = usePipelineLogs(compact ? 8 : 200);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs]);

  return (
    <section className="vf-card p-4 space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-mono text-[10px] text-cyan uppercase tracking-wider">
          Pipeline · nemo-speech
        </div>
        {path && (
          <div
            className="font-mono text-[10px] text-muted-foreground truncate"
            title={path}
          >
            {path}
          </div>
        )}
      </div>
      <div
        ref={scroller}
        className={`font-mono text-[11px] leading-relaxed overflow-y-auto vf-inset rounded-xl px-3 py-2 space-y-0.5 ${
          compact ? 'max-h-36' : 'max-h-64'
        }`}
      >
        {logs.length === 0 ? (
          <div className="text-muted-foreground">
            Esperando eventos del STT…
          </div>
        ) : (
          logs.map((entry, i) => (
            <LogLine key={`${entry.ts}-${entry.stage}-${i}`} entry={entry} />
          ))
        )}
      </div>
    </section>
  );
}

function LogLine({ entry }: { entry: PipelineLogEntry }) {
  return (
    <div className="flex gap-2 min-w-0">
      <span className="text-muted-foreground shrink-0">
        {formatClock(entry.ts)}
      </span>
      <span className={`shrink-0 uppercase ${stageClass(entry.stage)}`}>
        {entry.stage}
      </span>
      <span className="text-foreground/90 break-all">{entry.message}</span>
    </div>
  );
}
