import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

export const useHotkeyEvents = () => {
  useEffect(() => {
    void invoke('register_global_shortcut').catch(error => {
      console.error('Failed to register global shortcut:', error);
    });

    const unlistenError = listen<{ message?: string }>(
      'error-occurred',
      event => {
        toast.error(event.payload.message || 'Error de dictado');
      }
    );
    const unlistenDone = listen<{ text?: string }>(
      'transcription-completed',
      event => {
        if (event.payload.text) {
          toast.success(event.payload.text);
        }
      }
    );
    const unlistenLog = listen<{ stage?: string; message?: string }>(
      'pipeline-log',
      event => {
        const stage = event.payload.stage || 'log';
        const message = event.payload.message || '';
        console.log(`[murmullo:${stage}] ${message}`);
      }
    );

    return () => {
      unlistenError.then(unlisten => unlisten());
      unlistenDone.then(unlisten => unlisten());
      unlistenLog.then(unlisten => unlisten());
    };
  }, []);
};
