export interface AudioDevice {
  id: string;
  name: string;
}

export interface ModelInfo {
  name: string;
  size: number;
  path: string;
  is_downloaded: boolean;
  download_url?: string;
  description: string;
  languages: string[];
}

export interface TranscriptionResult {
  text: string;
  duration_ms: number;
  model_used: string;
}

export interface TranscriptionHistoryItem {
  id: string;
  text: string;
  timestamp: Date;
  duration_ms: number;
  model_used: string;
  language?: string;
}

export interface AudioLevel {
  level: number;
  is_recording: boolean;
}

export interface WhisperConfig {
  language?: string;
  temperature: number;
  beam_size: number;
}

export type InsertionMode = 'clipboard' | 'keystroke' | 'api';

export interface AppSettings {
  selectedModel: string;
  selectedLanguage: string;
  insertionMode: InsertionMode;
  hotkey: string;
  temperature: number;
  beamSize: number;
}

// Configuration interfaces
export interface HotkeyConfig {
  enabled: boolean;
  toggle_recording: string;
  push_to_talk: string;
}

export interface AppConfig {
  whisper: WhisperConfigApp;
  audio: AudioConfig;
  vad: VadConfig;
  hotkeys: HotkeyConfig;
  ui: UiConfig;
}

export interface WhisperConfigApp {
  temperature: number;
  best_of: number;
  default_language?: string;
  auto_detect: boolean;
  initial_prompt: string;
}

export interface AudioConfig {
  sample_rate: number;
  channels: number;
  bit_depth: number;
  noise_reduction: boolean;
  normalization: boolean;
  silence_threshold: number;
  min_audio_length: number;
}

export interface VadConfig {
  enabled: boolean;
  sensitivity: number;
  silence_timeout: number;
  min_speech_duration: number;
  pre_padding: number;
  post_padding: number;
}

export interface UiConfig {
  theme: string;
  language: string;
  show_debug_info: boolean;
  auto_save_transcriptions: boolean;
  selected_model?: string;
}
