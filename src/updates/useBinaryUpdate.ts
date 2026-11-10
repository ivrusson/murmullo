import { useCallback, useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { toast } from '@/components/ui-system/toast';
import { translateBackendMessage, useT } from '@/i18n';
import { binaryUpdateService } from '@/services/tauri';
import {
  binaryButton,
  type BinaryButton,
  type BinaryUpdateState,
} from './progress';

export interface BinaryUpdate {
  button: BinaryButton;
  /** The "install and restart" dialog; the tray menu can open it too. */
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  installing: boolean;
  install: () => Promise<void>;
}

/** Packaged-app updates: the backend checks and downloads, this only mirrors it. */
export function useBinaryUpdate(): BinaryUpdate {
  const t = useT();
  const [state, setState] = useState<BinaryUpdateState | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    void binaryUpdateService
      .state()
      .then(setState)
      .catch(() => undefined);
    const unlistenState = listen<BinaryUpdateState>(
      'binary-update-changed',
      event => setState(event.payload)
    );
    const unlistenOpen = listen('binary-update-open', () =>
      setDialogOpen(true)
    );
    return () => {
      unlistenState.then(fn => fn()).catch(() => undefined);
      unlistenOpen.then(fn => fn()).catch(() => undefined);
    };
  }, []);

  const install = useCallback(async () => {
    setInstalling(true);
    try {
      // On success the app restarts and this never returns.
      await binaryUpdateService.install();
    } catch (error) {
      toast.error(t('updates.failedTitle'), {
        description: translateBackendMessage(error),
      });
      setInstalling(false);
    }
  }, [t]);

  return {
    button: binaryButton(state),
    dialogOpen,
    setDialogOpen,
    installing,
    install,
  };
}
