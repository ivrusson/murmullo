import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { audioService, transcriptionService, modelService, configService } from '../services/tauri';
import { toast } from 'sonner';

export const useHotkeyEvents = () => {
  const lastHotkeyTime = useRef<number>(0);
  const HOTKEY_DEBOUNCE_MS = 100; // Shorter debounce for push-to-talk

  useEffect(() => {
    console.log('🎹 Setting up push-to-talk event listeners...');

    // Register the global shortcut
    const registerShortcut = async () => {
      try {
        await invoke('register_global_shortcut');
        console.log('✅ Global shortcut registered successfully');
      } catch (error) {
        console.error('❌ Failed to register global shortcut:', error);
      }
    };

    registerShortcut();

    // Listen for push-to-talk events from the backend
    const unlistenPushToTalk = listen('hotkey-push-to-talk', async (event) => {
      const now = Date.now();
      if (now - lastHotkeyTime.current < HOTKEY_DEBOUNCE_MS) {
        console.log('🎹 Push-to-talk debounced - too soon after last execution');
        return;
      }
      lastHotkeyTime.current = now;
      
      console.log('🎹 Push-to-talk event:', event.payload);
      await handlePushToTalk(event.payload as string);
    });

    // Cleanup function
    return () => {
      console.log('🎹 Cleaning up push-to-talk event listeners...');
      unlistenPushToTalk.then(unlisten => unlisten());
    };
  }, []);
};

// Helper function to ensure model is loaded before transcription
const ensureModelLoaded = async () => {
  try {
    console.log('🤖 Ensuring model is loaded for hotkey transcription...');
    
    // Get the selected model from config
    const selectedModel = await configService.getSelectedModel();
    console.log('📋 Selected model from config:', selectedModel);
    
    if (!selectedModel) {
      console.log('⚠️ No model selected, using default "base"');
      await configService.updateSelectedModel('base');
      return 'base';
    }
    
    // Check if model is loaded
    const isLoaded = await modelService.isModelLoaded(selectedModel);
    console.log('📋 Model loaded status:', isLoaded);
    
    if (!isLoaded) {
      console.log('📥 Loading model for hotkey transcription:', selectedModel);
      await modelService.loadModel(selectedModel);
      console.log('✅ Model loaded successfully for hotkey transcription');
    } else {
      console.log('✅ Model already loaded for hotkey transcription');
    }
    
    return selectedModel;
  } catch (error) {
    console.error('❌ Error ensuring model is loaded:', error);
    throw error;
  }
};

const handlePushToTalk = async (action: string) => {
  try {
    console.log('🎹 Push-to-talk action:', action);
    
    if (action === 'start') {
      console.log('🎹 Starting recording via push-to-talk...');
      const isCurrentlyRecording = await audioService.isRecording();
      
      if (!isCurrentlyRecording) {
        const devices = await audioService.listDevices();
        if (devices.length > 0) {
          console.log('🎹 Starting recording on device:', devices[0].id);
          await audioService.startRecording(devices[0].id);
          
          // Verify recording started
          const recordingStatus = await audioService.isRecording();
          console.log('🎹 Recording status after start:', recordingStatus);
          
          toast.success('Recording started', {
            description: 'Hold Cmd+Shift+T to record'
          });
        } else {
          console.error('❌ No audio devices available for push-to-talk recording');
          toast.error('No audio devices available', {
            description: 'Please check your microphone settings'
          });
        }
      } else {
        console.log('🎹 Already recording, ignoring start command');
      }
      
    } else if (action === 'stop') {
      console.log('🎹 Stopping recording via push-to-talk...');
      const isCurrentlyRecording = await audioService.isRecording();
      
      if (isCurrentlyRecording) {
        // Stop recording and get audio data
        console.log('🛑 Stopping recording...');
        const audioData = await audioService.stopRecording();
        console.log('📊 Audio data received:', audioData.length, 'samples');
        
        toast.info('Processing audio', {
          description: 'Converting speech to text...'
        });

        // Ensure model is loaded before transcription
        await ensureModelLoaded();
        
        // Transcribe audio
        console.log('🎯 Starting transcription...');
        const result = await transcriptionService.transcribeAudio(audioData);
        console.log('✅ Transcription result:', result);
        
        toast.success('Transcription complete', {
          description: `"${result.text}"`
        });
      } else {
        console.log('🎹 Not recording, ignoring stop command');
      }
    }
  } catch (error) {
    console.error('❌ Error handling push-to-talk:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    toast.error('Push-to-talk error', {
      description: errorMessage
    });
  }
};

