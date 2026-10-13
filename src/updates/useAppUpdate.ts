import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/components/ui-system/toast';
import { translateBackendMessage, useLocale } from '@/i18n';
import { appService, updateService } from '@/services/tauri';
import {
  deriveView,
  type UpdateInfo,
  type UpdateStatus,
  type UpdateView,
} from './progress';

const POLL_MS = 500;

export interface AppUpdate {
  /** Version of the running app; null until it is known. */
  current: string | null;
  info: UpdateInfo | null;
  checking: boolean;
  checkError: string | null;
  starting: boolean;
  view: UpdateView;
  /** Set for the session after an update finished, to show what changed. */
  justUpdated: string | null;
  check: () => Promise<void>;
  /** Starts the update; `fallbackTarget` covers a retry after the app restarted. */
  start: (fallbackTarget?: string) => Promise<void>;
  dismiss: () => Promise<void>;
}

export function useAppUpdate(): AppUpdate {
  const { t, locale } = useLocale();
  const [current, setCurrent] = useState<string | null>(null);
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [justUpdated, setJustUpdated] = useState<string | null>(null);
  const announced = useRef(false);

  const view = deriveView(status, current ?? '');
  const polling = view.kind === 'running';

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await updateService.status());
    } catch {
      // Not running inside Tauri (plain browser dev).
    }
  }, []);

  useEffect(() => {
    void appService
      .getVersion()
      .then(setCurrent)
      .catch(() => undefined);
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (!polling) return undefined;
    const id = window.setInterval(() => void refreshStatus(), POLL_MS);
    return () => window.clearInterval(id);
  }, [polling, refreshStatus]);

  const check = useCallback(async () => {
    setChecking(true);
    setCheckError(null);
    try {
      setInfo(await updateService.check());
    } catch (error) {
      setCheckError(translateBackendMessage(error));
    } finally {
      setChecking(false);
    }
  }, []);

  // The app came back on the target version: say so once and drop the file.
  useEffect(() => {
    if (view.kind !== 'finished' || announced.current) return;
    announced.current = true;
    setJustUpdated(view.version);
    toast.success(t('updates.doneToast', { version: view.version }));
    void updateService.clear().then(refreshStatus);
    void check();
  }, [view, t, refreshStatus, check]);

  const start = useCallback(
    async (fallbackTarget?: string) => {
      const target = info?.latest ?? fallbackTarget;
      if (!target) return;
      setStarting(true);
      try {
        await updateService.start(target, locale);
        await refreshStatus();
      } catch (error) {
        toast.error(t('updates.failedTitle'), {
          description: translateBackendMessage(error),
        });
      } finally {
        setStarting(false);
      }
    },
    [info, locale, refreshStatus, t]
  );

  const dismiss = useCallback(async () => {
    await updateService.clear().catch(() => undefined);
    await refreshStatus();
  }, [refreshStatus]);

  return {
    current,
    info,
    checking,
    checkError,
    starting,
    view,
    justUpdated,
    check,
    start,
    dismiss,
  };
}
