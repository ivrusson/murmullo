import type { ThemePreference } from '../lib/theme';

export interface TranscriptionRecord {
  id: string;
  text: string;
  raw_text?: string | null;
  audio_file_path: string;
  duration_ms: number;
  file_size_bytes: number;
  model_used: string;
  language?: string;
  created_at: string;
  updated_at: string;
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
  runtime: RuntimeConfig;
  audio: AudioConfig;
  hotkeys: HotkeyConfig;
  ui: UiConfig;
}

export interface RuntimeConfig {
  stt_port: number;
  llm_url: string;
  llm_model: string;
  llm_provider?: string;
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

export interface OverlayLayout {
  x: number | null;
  y: number | null;
  compact: boolean;
  style?: OverlayStyle;
}

export type OverlayStyle = 'pill' | 'island' | 'card';

export interface UiConfig {
  theme: ThemePreference;
  language: string;
  show_debug_info: boolean;
  auto_save_transcriptions: boolean;
  selected_model?: string;
  overlay_x?: number | null;
  overlay_y?: number | null;
  overlay_compact?: boolean;
  overlay_style?: OverlayStyle;
}

export interface HotkeyConfig {
  enabled?: boolean;
  toggle_recording: string;
  push_to_talk: string;
}
