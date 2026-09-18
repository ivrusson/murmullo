import { useState, useCallback, useRef, useEffect } from 'react';
import {
  audioService,
  transcriptionService,
  insertionService,
} from '../services/tauri';
import type { TranscriptionResult, AudioLevel } from '../types';

export interface UseTranscriptionReturn {
  // State
  isRecording: boolean;
  isProcessing: boolean;
  transcription: string;
  error: string | null;
  audioLevel: number;

  // Actions
  startRecording: (deviceId: string) => Promise<void>;
  stopRecording: () => Promise<void>;
  insertText: (text?: string) => Promise<void>;
  clearTranscription: () => void;

  // Audio level monitoring
  startAudioLevelMonitoring: () => void;
  stopAudioLevelMonitoring: () => void;
}

export function useTranscription(): UseTranscriptionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const audioLevelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const startRecording = useCallback(async (deviceId: string) => {
    try {
      setError(null);
      await audioService.startRecording(deviceId);
      setIsRecording(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to start recording'
      );
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      setIsRecording(false);
      setIsProcessing(true);
      setError(null);

      const audioData = await audioService.stopRecording();
      const result: TranscriptionResult =
        await transcriptionService.transcribeAudio(audioData);

      setTranscription(result.text); // Replace instead of accumulate
      setIsProcessing(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to transcribe audio'
      );
      setIsProcessing(false);
    }
  }, []);

  const insertText = useCallback(
    async (text?: string) => {
      try {
        const textToInsert = text || transcription;
        if (textToInsert) {
          await insertionService.insertText(textToInsert);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to insert text');
      }
    },
    [transcription]
  );

  const clearTranscription = useCallback(() => {
    setTranscription('');
    setError(null);
  }, []);

  const startAudioLevelMonitoring = useCallback(() => {
    if (audioLevelIntervalRef.current) return;

    audioLevelIntervalRef.current = setInterval(async () => {
      try {
        const level: AudioLevel = await audioService.getAudioLevel();
        setAudioLevel(level.level);
        setIsRecording(level.is_recording);
      } catch (err) {
        console.warn('Failed to get audio level:', err);
      }
    }, 100); // Update every 100ms for smooth visualization
  }, []);

  const stopAudioLevelMonitoring = useCallback(() => {
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioLevelMonitoring();
    };
  }, [stopAudioLevelMonitoring]);

  return {
    isRecording,
    isProcessing,
    transcription,
    error,
    audioLevel,
    startRecording,
    stopRecording,
    insertText,
    clearTranscription,
    startAudioLevelMonitoring,
    stopAudioLevelMonitoring,
  };
}
