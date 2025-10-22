export interface TranscriptionRecord {
  id: string;
  text: string;
  audio_file_path: string;
  duration_ms: number;
  file_size_bytes: number;
  model_used: string;
  language?: string;
  created_at: string; // ISO 8601 datetime string
  updated_at: string; // ISO 8601 datetime string
  metadata: Record<string, string>;
}

export interface TranscriptionResult {
  text: string;
  duration_ms: number;
  model_used: string;
}

export interface AudioLevel {
  level: number;
  is_recording: boolean;
}

export interface AudioDevice {
  id: string;
  name: string;
  is_default: boolean;
}

export interface ModelInfo {
  name: string;
  description: string;
  size: number;
  languages: string[];
  is_downloaded: boolean;
}

export interface AppConfig {
  whisper: WhisperConfig;
  audio: AudioConfig;
  vad: VadConfig;
  hotkeys: HotkeyConfig;
  ui: UiConfig;
  selected_model?: string;
}

export interface WhisperConfig {
  temperature: number;
  best_of: number;
  default_language?: string;
}

export interface AudioConfig {
  sample_rate: number;
  channels: number;
  bit_depth: number;
  noise_reduction: boolean;
  normalization: boolean;
  silence_threshold: number;
}

export interface VadConfig {
  enabled: boolean;
  sensitivity: number;
  silence_timeout: number;
}

export interface HotkeyConfig {
  toggle_recording: string;
  push_to_talk: string;
}

export interface UiConfig {
  theme: string;
  show_debug_info: boolean;
  auto_save_transcriptions: boolean;
}
