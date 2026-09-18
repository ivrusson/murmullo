import type { ThemePreference } from '../lib/theme';

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
  is_loaded?: boolean;
}

export interface TranscriptionResult {
  text: string;
  raw_text?: string;
  duration_ms: number;
  model_used: string;
  llm_used?: boolean;
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

export type InsertionMode = 'clipboard' | 'keystroke' | 'api';

export interface HotkeyConfig {
  enabled?: boolean;
  toggle_recording: string;
  push_to_talk: string;
}

export interface AppConfig {
  runtime: RuntimeConfig;
  audio: AudioConfig;
  hotkeys: HotkeyConfig;
  ui: UiConfig;
}

export interface RuntimeConfig {
  stt_port: number;
  llm_url: string;
  llm_model: string;
  llm_enabled: boolean;
  default_language?: string;
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

export interface UiConfig {
  theme: ThemePreference;
  language: string;
  show_debug_info: boolean;
  auto_save_transcriptions: boolean;
  selected_model?: string;
}

export interface ComponentStatus {
  state: string;
  message: string;
  progress: number | null;
}

export interface RuntimeStatus {
  stt_binary: ComponentStatus;
  stt_model: ComponentStatus;
  stt_server: ComponentStatus;
  llm_binary: ComponentStatus;
  llm_server: ComponentStatus;
  llm_model: string | null;
  llm_model_status?: ComponentStatus;
  dictation_ready: boolean;
}

export interface PipelineLogEntry {
  ts: number;
  stage: string;
  message: string;
}

export interface DictionaryEntry {
  id: string;
  term: string;
  replacement: string;
  language?: string;
  origin: string;
  created_at: string;
}

export interface MacosPermissionStatus {
  microphone: boolean;
  accessibility: boolean;
  input_monitoring: boolean;
}
