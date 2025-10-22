import { invoke } from '@tauri-apps/api/core';
import type { 
  AudioDevice, 
  ModelInfo, 
  TranscriptionResult, 
  AudioLevel, 
  WhisperConfig,
  InsertionMode,
  AppConfig
} from '../types';

// Audio services
export const audioService = {
  async listDevices(): Promise<AudioDevice[]> {
    return await invoke('list_audio_devices');
  },

  async startRecording(deviceId: string): Promise<void> {
    return await invoke('start_recording', { deviceId });
  },

  async stopRecording(): Promise<number[]> {
    return await invoke('stop_recording');
  },

  async isRecording(): Promise<boolean> {
    return await invoke('is_recording');
  },

  async getAudioLevel(): Promise<AudioLevel> {
    return await invoke('get_audio_level');
  }
};

// Model services
export const modelService = {
  async listModels(): Promise<ModelInfo[]> {
    return await invoke('list_models');
  },

  async getModelInfo(modelName: string): Promise<ModelInfo | null> {
    return await invoke('get_model_info', { modelName });
  },

  async downloadModel(modelName: string): Promise<void> {
    return await invoke('download_model', { modelName });
  },

  async loadModel(modelName: string): Promise<void> {
    return await invoke('load_model', { modelName });
  },

  async isModelLoaded(modelName: string): Promise<boolean> {
    return await invoke('is_model_loaded', { modelName });
  },

  async getModelInfoLoaded(): Promise<string> {
    return await invoke('get_model_info_loaded');
  }
};

// Transcription services
export const transcriptionService = {
  async transcribeAudio(audioData: number[]): Promise<TranscriptionResult> {
    return await invoke('transcribe_audio', { audioData });
  },

  async setConfig(config: WhisperConfig): Promise<void> {
    return await invoke('set_transcription_config', {
      language: config.language,
      temperature: config.temperature,
      beam_size: config.beam_size,
    });
  },

  async setLanguage(language: string | null): Promise<void> {
    return await invoke('set_transcription_language', { language });
  }
};

// Text insertion services
export const insertionService = {
  async insertText(text: string): Promise<void> {
    return await invoke('insert_text', { text });
  },

  async setMode(mode: InsertionMode): Promise<void> {
    return await invoke('set_insertion_mode', { mode });
  },

  async getMode(): Promise<InsertionMode> {
    return await invoke('get_insertion_mode');
  }
};

// Utility services
export const utilityService = {
  async getAppInfo(): Promise<string> {
    return await invoke('get_app_info');
  }
};

// Configuration services
export const configService = {
  async getConfig(): Promise<AppConfig> {
    return await invoke('get_config');
  },

  async updateWhisperConfig(temperature: number, bestOf: number, defaultLanguage?: string): Promise<void> {
    return await invoke('update_whisper_config', { temperature, bestOf, defaultLanguage });
  },

  async updateAudioConfig(noiseReduction: boolean, normalization: boolean, silenceThreshold: number): Promise<void> {
    return await invoke('update_audio_config', { noiseReduction, normalization, silenceThreshold });
  },

  async updateVadConfig(enabled: boolean, sensitivity: number, silenceTimeout: number): Promise<void> {
    return await invoke('update_vad_config', { enabled, sensitivity, silenceTimeout });
  },

  async resetToDefaults(): Promise<void> {
    return await invoke('reset_config_to_defaults');
  },

  async updateSelectedModel(modelName: string | null): Promise<void> {
    return await invoke('update_selected_model', { modelName });
  },

  async getSelectedModel(): Promise<string | null> {
    return await invoke('get_selected_model');
  }
};
