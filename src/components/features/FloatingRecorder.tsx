import React, { useState, useEffect } from 'react';
import { Mic, Square, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { AudioBubble } from '../AudioBubble';
import {
  audioService,
  runtimeService,
  transcriptionService,
} from '../../services/tauri';
import { toast } from 'sonner';
import { useAppConfig } from '../../contexts/AppConfigContext';

export const FloatingRecorder: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const { selectedDevice, isLoading, runtimeStatus } = useAppConfig();

  useEffect(() => {
    let interval: number;
    if (isRecording) {
      interval = window.setInterval(
        () => setRecordingTime(prev => prev + 1),
        1000
      );
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStartRecording = async () => {
    if (!selectedDevice) {
      toast.error('Select a microphone first');
      return;
    }
    const status = runtimeStatus ?? (await runtimeService.status());
    if (!status.dictation_ready) {
      toast.error('STT is not ready', {
        description: 'Open Runtimes and start nemo-speech',
      });
      return;
    }
    try {
      setIsRecording(true);
      await audioService.startRecording(selectedDevice);
      const levelInterval = window.setInterval(async () => {
        try {
          const level = await audioService.getAudioLevel();
          setAudioLevel(level.level);
        } catch {
          /* ignore */
        }
      }, 100);
      (window as Window & { audioLevelInterval?: number }).audioLevelInterval =
        levelInterval;
    } catch (error) {
      console.error(error);
      toast.error('Failed to start recording');
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsRecording(false);
      setIsProcessing(true);
      const w = window as Window & { audioLevelInterval?: number };
      if (w.audioLevelInterval) {
        clearInterval(w.audioLevelInterval);
        w.audioLevelInterval = undefined;
      }
      const audioData = await audioService.stopRecording();
      toast.info('Processing audio...');
      const result = await transcriptionService.transcribeAudio(audioData);
      toast.success(result.text);
      setIsProcessing(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Failed to process recording');
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 ${className}`}
    >
      <div
        className={`bg-white border border-gray-200 rounded-xl shadow-lg ${isRecording ? 'px-6 py-4' : 'px-4 py-3'}`}
      >
        {!isRecording ? (
          <Button
            onClick={handleStartRecording}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Mic size={16} />
                Start Recording
              </>
            )}
          </Button>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <AudioBubble
                audioLevel={audioLevel}
                isRecording={isRecording}
                size={60}
              />
              <span className="text-sm text-gray-600 font-mono">
                {formatTime(recordingTime)}
              </span>
            </div>
            <Button
              onClick={handleStopRecording}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Square size={16} />
              Stop
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
