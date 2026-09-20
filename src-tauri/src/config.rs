use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(default)]
    pub runtime: RuntimeConfig,
    pub audio: AudioConfig,
    #[serde(default)]
    pub hotkeys: HotkeyConfig,
    #[serde(default)]
    pub ui: UiConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeConfig {
    #[serde(default = "default_stt_port")]
    pub stt_port: u16,
    #[serde(default = "default_llm_url")]
    pub llm_url: String,
    #[serde(default = "default_llm_model")]
    pub llm_model: String,
    #[serde(default = "default_llm_provider")]
    pub llm_provider: String,
    #[serde(default = "default_true")]
    pub llm_enabled: bool,
    pub default_language: Option<String>,
}

fn default_stt_port() -> u16 {
    18765
}
fn default_llm_url() -> String {
    "http://127.0.0.1:11434".to_string()
}
fn default_llm_model() -> String {
    "llama3.2".to_string()
}
fn default_llm_provider() -> String {
    "ollama".to_string()
}
fn default_true() -> bool {
    true
}

impl Default for RuntimeConfig {
    fn default() -> Self {
        Self {
            stt_port: default_stt_port(),
            llm_url: default_llm_url(),
            llm_model: default_llm_model(),
            llm_provider: default_llm_provider(),
            llm_enabled: true,
            default_language: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioConfig {
    pub sample_rate: u32,
    pub channels: u16,
    pub bit_depth: u16,
    pub noise_reduction: bool,
    pub normalization: bool,
    pub silence_threshold: f32,
    pub min_audio_length: f32,
}

impl Default for AudioConfig {
    fn default() -> Self {
        Self {
            sample_rate: 16000,
            channels: 1,
            bit_depth: 16,
            noise_reduction: true,
            normalization: true,
            silence_threshold: 0.005,
            min_audio_length: 0.5,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HotkeyConfig {
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub toggle_recording: String,
    #[serde(default = "default_ptt")]
    pub push_to_talk: String,
}

fn default_ptt() -> String {
    "Cmd+Option+T".to_string()
}

impl Default for HotkeyConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            toggle_recording: String::new(),
            push_to_talk: default_ptt(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiConfig {
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_ui_lang")]
    pub language: String,
    #[serde(default)]
    pub show_debug_info: bool,
    #[serde(default = "default_true")]
    pub auto_save_transcriptions: bool,
    pub selected_model: Option<String>,
    #[serde(default)]
    pub overlay_x: Option<f64>,
    #[serde(default)]
    pub overlay_y: Option<f64>,
    #[serde(default)]
    pub overlay_compact: bool,
    #[serde(default = "default_overlay_style")]
    pub overlay_style: String,
}

impl Default for UiConfig {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            language: default_ui_lang(),
            show_debug_info: false,
            auto_save_transcriptions: true,
            selected_model: None,
            overlay_x: None,
            overlay_y: None,
            overlay_compact: false,
            overlay_style: default_overlay_style(),
        }
    }
}

fn default_theme() -> String {
    "light".to_string()
}
fn default_ui_lang() -> String {
    "es".to_string()
}

fn default_overlay_style() -> String {
    "pill".to_string()
}

pub fn normalize_overlay_style(value: &str) -> String {
    match value {
        "island" | "card" | "pill" => value.to_string(),
        _ => default_overlay_style(),
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        AppConfig {
            runtime: RuntimeConfig::default(),
            audio: AudioConfig::default(),
            hotkeys: HotkeyConfig::default(),
            ui: UiConfig {
                theme: default_theme(),
                language: default_ui_lang(),
                show_debug_info: false,
                auto_save_transcriptions: true,
                selected_model: Some("parakeet-tdt-0.6b-v3-q8".to_string()),
                overlay_x: None,
                overlay_y: None,
                overlay_compact: false,
                overlay_style: default_overlay_style(),
            },
        }
    }
}

impl AppConfig {
    fn get_config_path() -> PathBuf {
        crate::paths::ensure_layout();
        crate::paths::config_file()
    }

    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        let config_path = Self::get_config_path();

        if config_path.exists() {
            let content = fs::read_to_string(&config_path)?;
            match serde_json::from_str::<AppConfig>(&content) {
                Ok(config) => {
                    println!("📁 Config loaded from {}", config_path.display());
                    Ok(config)
                }
                Err(e) => {
                    println!("⚠️ Config incompatible ({}), using defaults", e);
                    let config = AppConfig::default();
                    config.save()?;
                    Ok(config)
                }
            }
        } else {
            println!("📁 No config file found, using defaults");
            let config = AppConfig::default();
            config.save()?;
            Ok(config)
        }
    }

    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        let config_path = Self::get_config_path();
        let content = serde_json::to_string_pretty(self)?;
        fs::write(&config_path, content)?;
        println!("💾 Config saved to {}", config_path.display());
        Ok(())
    }

    pub fn update_audio_config(
        &mut self,
        noise_reduction: bool,
        normalization: bool,
        silence_threshold: f32,
    ) {
        self.audio.noise_reduction = noise_reduction;
        self.audio.normalization = normalization;
        self.audio.silence_threshold = silence_threshold;
    }

    pub fn update_runtime_config(
        &mut self,
        llm_enabled: bool,
        llm_provider: String,
        llm_model: String,
        default_language: Option<String>,
    ) {
        self.runtime.llm_enabled = llm_enabled;
        self.runtime.llm_provider = crate::llm::normalize_provider(&llm_provider);
        self.runtime.llm_model = if llm_model.trim().is_empty() {
            crate::llm::default_model_for(&self.runtime.llm_provider).to_string()
        } else {
            llm_model
        };
        self.runtime.default_language = default_language;
    }

    pub fn update_hotkey_config(&mut self, push_to_talk: String, enabled: Option<bool>) {
        self.hotkeys.push_to_talk = push_to_talk;
        if let Some(enabled) = enabled {
            self.hotkeys.enabled = enabled;
        }
    }

    pub fn update_theme(&mut self, theme: String) {
        self.ui.theme = theme;
    }

    pub fn update_language(&mut self, language: String) {
        self.ui.language = language;
    }

    pub fn update_overlay_position(&mut self, x: f64, y: f64) {
        self.ui.overlay_x = Some(x);
        self.ui.overlay_y = Some(y);
    }

    pub fn update_overlay_compact(&mut self, compact: bool) {
        self.ui.overlay_compact = compact;
    }

    pub fn update_overlay_style(&mut self, style: String) {
        self.ui.overlay_style = normalize_overlay_style(&style);
    }

    pub fn update_selected_model(&mut self, model_name: Option<String>) {
        self.ui.selected_model = model_name;
    }

    pub fn get_selected_model(&self) -> Option<String> {
        self.ui.selected_model.clone()
    }
}
