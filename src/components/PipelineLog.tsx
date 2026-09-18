import { useEffect, useRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { PipelineLogEntry } from '@/types';
import { usePipelineLogs } from '@/hooks/usePipelineLogs';
import { Surface } from '@/components/ui-system/Surface';
import { color, font, radius, space } from '@/styles/tokens.stylex';
import { sx } from '@/components/ui-system/sx';

const styles = stylex.create({
  head: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space.md,
    marginBottom: space.sm,
  },
  title: {
    margin: 0,
    color: color.copper,
    fontSize: '0.8rem',
  },
  path: {
    margin: 0,
    color: color.muted,
    fontFamily: font.mono,
    fontSize: '0.7rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  scroller: {
    fontFamily: font.mono,
    fontSize: '0.7rem',
    lineHeight: 1.5,
    overflowY: 'auto',
    backgroundColor: color.raised,
    borderRadius: radius.md,
    padding: space.md,
    color: color.ink,
  },
  compact: { maxHeight: 144 },
  tall: { maxHeight: 256 },
  line: {
    display: 'flex',
    gap: space.sm,
    minWidth: 0,
  },
  muted: { color: color.muted, flexShrink: 0 },
  live: { color: color.live, flexShrink: 0 },
  copper: { color: color.copper, flexShrink: 0 },
  msg: { wordBreak: 'break-all' },
});

function stageStyle(stage: string) {
  if (stage === 'nemo' || stage === 'stt') return styles.live;
  if (stage === 'ptt') return styles.copper;
  if (stage === 'audio') return styles.copper;
  return styles.muted;
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
    <Surface>
      <div {...sx(styles.head)}>
        <p {...sx(styles.title)}>Pipeline nemo-speech</p>
        {path ? (
          <p {...sx(styles.path)} title={path}>
            {path}
          </p>
        ) : null}
      </div>
      <div
        ref={scroller}
        {...sx(styles.scroller, compact ? styles.compact : styles.tall)}
      >
        {logs.length === 0 ? (
          <div {...sx(styles.muted)}>Esperando eventos del STT…</div>
        ) : (
          logs.map((entry, i) => (
            <LogLine key={`${entry.ts}-${entry.stage}-${i}`} entry={entry} />
          ))
        )}
      </div>
    </Surface>
  );
}

function LogLine({ entry }: { entry: PipelineLogEntry }) {
  return (
    <div {...sx(styles.line)}>
      <span {...sx(styles.muted)}>{formatClock(entry.ts)}</span>
      <span {...sx(stageStyle(entry.stage))}>{entry.stage}</span>
      <span {...sx(styles.msg)}>{entry.message}</span>
    </div>
  );
}
