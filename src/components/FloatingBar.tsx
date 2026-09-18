import React, { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import {
  IdleState,
  RecordingState,
  ProcessingState,
  TranscriptionCompleteState,
  ErrorState,
} from './FloatingBarStates';
import { hotkeyParts } from '../lib/hotkey';
import type { AppConfig } from '../types';

type DictationState =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'transcription-complete'
  | 'error';

interface TranscriptionData {
  text: string;
  duration_ms: number;
  model_used: string;
}

export const FloatingBar: React.FC = () => {
  const [currentState, setCurrentState] = useState<DictationState>('idle');
  const [transcriptionData, setTranscriptionData] =
    useState<TranscriptionData | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [processingMessage, setProcessingMessage] = useState(
    'Enviando a nemo-speech'
  );
  const [pttParts, setPttParts] = useState<string[]>(['Cmd', 'Opt', 'T']);

  useEffect(() => {
    void invoke<AppConfig>('get_config')
      .then(config => setPttParts(hotkeyParts(config.hotkeys.push_to_talk)))
      .catch(() => undefined);

    const unlistenRecording = listen('recording-state-changed', event => {
      const payload = event.payload as {
        state: DictationState | 'done';
        message?: string;
      };
      if (payload.state === 'done') {
        setCurrentState('transcription-complete');
        return;
      }
      setCurrentState(payload.state === 'error' ? 'error' : payload.state);
      if (payload.state === 'processing' && payload.message) {
        setProcessingMessage(payload.message);
      }
      if (payload.state === 'error' && payload.message) {
        setErrorMessage(payload.message);
      }
    });

    const unlistenTranscription = listen('transcription-completed', event => {
      const payload = event.payload as TranscriptionData;
      console.log('[murmullo:overlay] transcription-completed', payload);
      setTranscriptionData(payload);
      setCurrentState('transcription-complete');

      setTimeout(() => {
        setCurrentState('idle');
        setTranscriptionData(null);
      }, 3000);
    });

    const unlistenAudioLevel = listen('audio-level-updated', event => {
      const payload = event.payload as { level: number };
      setAudioLevel(payload.level);
    });

    const unlistenError = listen('error-occurred', event => {
      const payload = event.payload as { message: string };
      console.log('[murmullo:overlay] error', payload);
      setErrorMessage(payload.message);
      setCurrentState('error');

      setTimeout(() => {
        setCurrentState('idle');
        setErrorMessage('');
      }, 5000);
    });

    const unlistenLog = listen<{ stage?: string; message?: string }>(
      'pipeline-log',
      event => {
        const stage = event.payload.stage || 'log';
        const message = event.payload.message || '';
        console.log(`[murmullo:${stage}] ${message}`);
      }
    );

    return () => {
      unlistenRecording.then(unlistenFn => unlistenFn());
      unlistenTranscription.then(unlistenFn => unlistenFn());
      unlistenAudioLevel.then(unlistenFn => unlistenFn());
      unlistenError.then(unlistenFn => unlistenFn());
      unlistenLog.then(unlistenFn => unlistenFn());
    };
  }, []);

  const startRecording = () => {
    void invoke('overlay_start_dictation').catch(error => {
      console.error('[murmullo:overlay] start failed', error);
    });
  };

  const stopRecording = () => {
    void invoke('overlay_stop_dictation').catch(error => {
      console.error('[murmullo:overlay] stop failed', error);
    });
  };

  const cancelRecording = () => {
    void invoke('overlay_cancel_dictation').catch(error => {
      console.error('[murmullo:overlay] cancel failed', error);
    });
  };

  const renderState = () => {
    switch (currentState) {
      case 'idle':
        return <IdleState hotkeyParts={pttParts} onStart={startRecording} />;
      case 'recording':
        return (
          <RecordingState
            audioLevel={audioLevel}
            onStop={stopRecording}
            onCancel={cancelRecording}
          />
        );
      case 'processing':
        return <ProcessingState message={processingMessage} />;
      case 'transcription-complete':
        return transcriptionData ? (
          <TranscriptionCompleteState transcription={transcriptionData} />
        ) : (
          <IdleState hotkeyParts={pttParts} onStart={startRecording} />
        );
      case 'error':
        return <ErrorState error={errorMessage} />;
      default:
        return <IdleState hotkeyParts={pttParts} onStart={startRecording} />;
    }
  };

  return (
    <div className="floating-bar-container">
      <div className="floating-bar-capsule">{renderState()}</div>
    </div>
  );
};
