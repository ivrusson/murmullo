import React, { useState, useEffect } from 'react';
import { Mic, Square, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { AudioBubble } from '../AudioBubble';
import { audioService, modelService, transcriptionService } from '../../services/tauri';
import { TranscriptionService } from '../../services/transcriptionService';
import { toast } from 'sonner';
import { emit } from '@tauri-apps/api/event';
import { useAppConfig } from '../../contexts/AppConfigContext';

interface FloatingRecorderProps {
  className?: string;
}

export const FloatingRecorder: React.FC<FloatingRecorderProps> = ({ className = '' }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const { selectedDevice, selectedModel, isLoading } = useAppConfig();

  // Recording timer
  useEffect(() => {
    let interval: number;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStartRecording = async () => {
    if (!selectedDevice || !selectedModel) {
      toast.error('Please select a microphone and model first');
      return;
    }

    try {
      setIsRecording(true);

      // Load model if not already loaded
      const isLoaded = await modelService.isModelLoaded(selectedModel);
      if (!isLoaded) {
        await modelService.loadModel(selectedModel);
      }

      // Start recording
      await audioService.startRecording(selectedDevice);

      toast.success('Recording started');

      // Start audio level monitoring
      const levelInterval = setInterval(async () => {
        try {
          const level = await audioService.getAudioLevel();
          setAudioLevel(level.level);
        } catch (error) {
          console.error('Error getting audio level:', error);
        }
      }, 100);

      // Store interval for cleanup
      (window as any).audioLevelInterval = levelInterval;

    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsRecording(false);
      setIsProcessing(true);

      // Clear audio level monitoring
      if ((window as any).audioLevelInterval) {
        clearInterval((window as any).audioLevelInterval);
        (window as any).audioLevelInterval = null;
      }

      // Stop recording and get audio data
      const audioData = await audioService.stopRecording();

      toast.info('Processing audio...');

      // Transcribe audio
      const result = await transcriptionService.transcribeAudio(audioData);

      // Save transcription with audio data to persistent storage
      try {
        const transcriptionId = await TranscriptionService.saveTranscription(
          result.text,
          audioData,
          result.model_used,
          undefined, // language - could be set from config
          {
            duration_seconds: (result.duration_ms / 1000).toString(),
            recording_time: recordingTime.toString(),
            device_used: selectedDevice,
          }
        );

        console.log('✅ Transcription saved with ID:', transcriptionId);

        // Emit event to refresh transcription history
        emit('transcription-saved', {
          id: transcriptionId,
          text: result.text
        });

        toast.success('Transcription saved successfully');

      } catch (saveError) {
        console.error('❌ Failed to save transcription:', saveError);
        toast.error('Transcription completed but failed to save');
      }

      setIsProcessing(false);

    } catch (error) {
      console.error('Error stopping recording:', error);
      toast.error('Failed to process recording');
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't render if still loading configuration
  if (isLoading) {
    return null;
  }

  return (
    <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
      <div className={`bg-white border border-gray-200 rounded-xl shadow-lg transition-all duration-300 ${
        isRecording ? 'px-6 py-4' : 'px-4 py-3'
      }`}>
        {!isRecording ? (
          <Button
            onClick={handleStartRecording}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isProcessing ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Loading...
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