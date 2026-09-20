import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { PipelineLogEntry } from '@/types';

export function usePipelineLogs(limit = 200) {
  const [logs, setLogs] = useState<PipelineLogEntry[]>([]);
  const [path, setPath] = useState('');

  useEffect(() => {
    void invoke<PipelineLogEntry[]>('get_pipeline_logs')
      .then(entries => setLogs(entries.slice(-limit)))
      .catch(() => undefined);
    void invoke<string>('get_pipeline_log_path')
      .then(setPath)
      .catch(() => undefined);

    const unlisten = listen<PipelineLogEntry>('pipeline-log', event => {
      const entry = event.payload;
      setLogs(prev => {
        const last = prev[prev.length - 1];
        if (
          last &&
          last.ts === entry.ts &&
          last.stage === entry.stage &&
          last.message === entry.message
        ) {
          return prev;
        }
        return [...prev, entry].slice(-limit);
      });
    });

    return () => {
      unlisten.then(fn => fn()).catch(() => undefined);
    };
  }, [limit]);

  return { logs, path };
}
