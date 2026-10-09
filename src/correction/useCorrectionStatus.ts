import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { EMPTY_CORRECTION_STATUS, type CorrectionStatus } from './types';

export function useCorrectionStatus(): CorrectionStatus {
  const [status, setStatus] = useState<CorrectionStatus>(
    EMPTY_CORRECTION_STATUS
  );

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void invoke<CorrectionStatus>('get_correction_status')
      .then(next => {
        if (!cancelled && next?.state) setStatus(next);
      })
      .catch(() => undefined);
    void listen<CorrectionStatus>('correction-status', event => {
      if (event.payload?.state) setStatus(event.payload);
    }).then(unlisten => {
      if (cancelled) {
        unlisten();
        return;
      }
      unsubscribe = unlisten;
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return status;
}
