import { invoke } from '@tauri-apps/api/core';
import type {
  AudioDevice,
  ModelInfo,
  TranscriptionResult,
  AudioLevel,
  InsertionMode,
  AppConfig,
  OverlayLayout,
  OverlayStyle,
  RuntimeStatus,
  DictionaryEntry,
  MacosPermissionStatus,
  LlmProviderInfo,
} from '../types';

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
  },
};

export const modelService = {
  async listModels(): Promise<ModelInfo[]> {
    return await invoke('list_models');
  },
  async downloadModel(modelName = 'parakeet-tdt-0.6b-v3-q8'): Promise<void> {
    return await invoke('download_model', { modelName });
  },
  async loadModel(modelName = 'parakeet-tdt-0.6b-v3-q8'): Promise<void> {
    return await invoke('load_model', { modelName });
  },
  async isModelLoaded(modelName = 'parakeet-tdt-0.6b-v3-q8'): Promise<boolean> {
    return await invoke('is_model_loaded', { modelName });
  },
  async getDownloadProgress(
    modelName = 'parakeet-tdt-0.6b-v3-q8'
  ): Promise<number> {
    return await invoke('get_download_progress', { modelName });
  },
};

export const runtimeService = {
  async status(): Promise<RuntimeStatus> {
    return await invoke('get_runtime_status');
  },
  async ensureStt(): Promise<RuntimeStatus> {
    return await invoke('ensure_stt_runtime');
  },
  async startStt(): Promise<RuntimeStatus> {
    return await invoke('start_stt_runtime');
  },
  async stopStt(): Promise<RuntimeStatus> {
    return await invoke('stop_stt_runtime');
  },
  async startLlm(): Promise<RuntimeStatus> {
    return await invoke('start_llm_runtime');
  },
  async listLlmProviders(): Promise<LlmProviderInfo[]> {
    return await invoke('list_llm_providers');
  },
  async pipelineLogs(): Promise<import('../types').PipelineLogEntry[]> {
    return await invoke('get_pipeline_logs');
  },
  async pipelineLogPath(): Promise<string> {
    return await invoke('get_pipeline_log_path');
  },
};

export const dictionaryService = {
  async list(): Promise<DictionaryEntry[]> {
    return await invoke('list_dictionary');
  },
  async add(
    term: string,
    replacement: string,
    origin = 'manual'
  ): Promise<DictionaryEntry> {
    return await invoke('add_dictionary_entry', { term, replacement, origin });
  },
  async remove(id: string): Promise<boolean> {
    return await invoke('remove_dictionary_entry', { id });
  },
  async prompt(): Promise<string> {
    return await invoke('get_system_prompt');
  },
  async applyCorrection(
    term: string,
    replacement: string
  ): Promise<DictionaryEntry> {
    return await invoke('apply_correction', { term, replacement });
  },
};

export const transcriptionService = {
  async transcribeAudio(audioData: number[]): Promise<TranscriptionResult> {
    return await invoke('transcribe_audio', { audioData });
  },
  async setLanguage(language: string | null): Promise<void> {
    return await invoke('set_transcription_language', { language });
  },
};

export const insertionService = {
  async insertText(text: string): Promise<void> {
    return await invoke('insert_text', { text });
  },
  async setMode(mode: InsertionMode): Promise<void> {
    return await invoke('set_insertion_mode', { mode });
  },
  async getMode(): Promise<InsertionMode> {
    return await invoke('get_insertion_mode');
  },
};

export const permissionService = {
  async status(): Promise<MacosPermissionStatus> {
    return await invoke('check_macos_permissions');
  },
  async requestMicrophone(): Promise<boolean> {
    return await invoke('request_macos_microphone');
  },
  async requestAccessibility(): Promise<boolean> {
    return await invoke('request_macos_accessibility');
  },
  async requestInputMonitoring(): Promise<boolean> {
    return await invoke('request_macos_input_monitoring');
  },
};

export const configService = {
  async getConfig(): Promise<AppConfig> {
    return await invoke('get_config');
  },
  async updateAudioConfig(
    noiseReduction: boolean,
    normalization: boolean,
    silenceThreshold: number
  ): Promise<void> {
    return await invoke('update_audio_config', {
      noiseReduction,
      normalization,
      silenceThreshold,
    });
  },
  async updateRuntimeConfig(
    llmEnabled: boolean,
    llmModel: string,
    defaultLanguage?: string,
    llmProvider?: string
  ): Promise<void> {
    return await invoke('update_runtime_config', {
      llmEnabled,
      llmProvider,
      llmModel,
      defaultLanguage,
    });
  },
  async updateSelectedModel(modelName: string | null): Promise<void> {
    return await invoke('update_selected_model', { modelName });
  },
  async getSelectedModel(): Promise<string | null> {
    return await invoke('get_selected_model');
  },
  async updateHotkeyConfig(
    pushToTalk: string,
    enabled?: boolean
  ): Promise<void> {
    return await invoke('update_hotkey_config', { pushToTalk, enabled });
  },
  async updateUiTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    return await invoke('update_ui_theme', { theme });
  },
  async updateUiLanguage(language: 'es' | 'en'): Promise<void> {
    return await invoke('update_ui_language', { language });
  },
  async registerGlobalShortcut(): Promise<void> {
    return await invoke('register_global_shortcut');
  },
  async unregisterGlobalShortcut(): Promise<void> {
    return await invoke('unregister_global_shortcut');
  },
};

export const overlayService = {
  async show(): Promise<void> {
    return await invoke('create_floating_bar_window');
  },
  async savePosition(x: number, y: number): Promise<void> {
    return await invoke('save_overlay_position', { x, y });
  },
  async getLayout(): Promise<OverlayLayout> {
    return await invoke('get_overlay_layout');
  },
  async setCompact(compact: boolean): Promise<void> {
    return await invoke('set_overlay_compact', { compact });
  },
  async setStyle(style: OverlayStyle): Promise<OverlayLayout> {
    return await invoke('set_overlay_style', { style });
  },
  async resize(
    width: number,
    height: number,
    x?: number,
    y?: number
  ): Promise<void> {
    return await invoke('resize_overlay', {
      width,
      height,
      x: x ?? null,
      y: y ?? null,
    });
  },
};
