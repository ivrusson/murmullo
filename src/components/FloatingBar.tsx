import React, { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { IdleState, RecordingState, ProcessingState, TranscriptionCompleteState, ErrorState } from './FloatingBarStates';

type DictationState = 'idle' | 'recording' | 'processing' | 'transcription-complete' | 'error';

interface TranscriptionData {
  text: string;
  duration_ms: number;
  model_used: string;
}

export const FloatingBar: React.FC = () => {
  const [currentState, setCurrentState] = useState<DictationState>('idle');
  const [transcriptionData, setTranscriptionData] = useState<TranscriptionData | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    console.log('🔧 Setting up event listeners for floating bar...');
    
    // Listen for recording state changes from the main app
    const unlistenRecording = listen('recording-state-changed', (event) => {
      const payload = event.payload as { state: DictationState };
      console.log('🎤 Recording state changed:', payload);
      setCurrentState(payload.state);
    });

    // Listen for transcription completed events
    const unlistenTranscription = listen('transcription-completed', (event) => {
      const payload = event.payload as TranscriptionData;
      console.log('📝 Transcription completed event received:', payload);
      setTranscriptionData(payload);
      setCurrentState('transcription-complete');
      
      // Return to idle after 3 seconds
      setTimeout(() => {
        console.log('⏰ Returning to idle state after transcription display');
        setCurrentState('idle');
        setTranscriptionData(null);
      }, 3000);
    });

    // Listen for audio level updates
    const unlistenAudioLevel = listen('audio-level-updated', (event) => {
      const payload = event.payload as { level: number };
      setAudioLevel(payload.level);
    });

    // Listen for error events
    const unlistenError = listen('error-occurred', (event) => {
      const payload = event.payload as { message: string };
      console.log('❌ Error event received:', payload);
      setErrorMessage(payload.message);
      setCurrentState('error');
      
      // Return to idle after 5 seconds
      setTimeout(() => {
        console.log('⏰ Returning to idle state after error display');
        setCurrentState('idle');
        setErrorMessage('');
      }, 5000);
    });

    console.log('✅ Event listeners set up successfully');

    return () => {
      console.log('🧹 Cleaning up event listeners');
      unlistenRecording.then(unlistenFn => unlistenFn());
      unlistenTranscription.then(unlistenFn => unlistenFn());
      unlistenAudioLevel.then(unlistenFn => unlistenFn());
      unlistenError.then(unlistenFn => unlistenFn());
    };
  }, []);

  const renderState = () => {
    switch (currentState) {
      case 'idle':
        return <IdleState />;
      case 'recording':
        return <RecordingState audioLevel={audioLevel} />;
      case 'processing':
        return <ProcessingState />;
      case 'transcription-complete':
        return transcriptionData ? <TranscriptionCompleteState transcription={transcriptionData} /> : <IdleState />;
      case 'error':
        return <ErrorState error={errorMessage} />;
      default:
        return <IdleState />;
    }
  };

  return (
    <div className="floating-bar-container">
      <div className="floating-bar-capsule">
        {renderState()}
      </div>
    </div>
  );
};
