use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::Path;

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
fn default_true() -> bool {
    true
}

impl Default for RuntimeConfig {
    fn default() -> Self {
        Self {
            stt_port: default_stt_port(),
            llm_url: default_llm_url(),
            llm_model: default_llm_model(),
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
}

impl Default for UiConfig {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            language: default_ui_lang(),
            show_debug_info: false,
            auto_save_transcriptions: true,
            selected_model: None,
        }
    }
}

fn default_theme() -> String {
    "dark".to_string()
}
fn default_ui_lang() -> String {
    "es".to_string()
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
            },
        }
    }
}

impl AppConfig {
    fn get_config_path() -> String {
        if let Ok(home_dir) = env::var("HOME") {
            let config_dir = format!("{}/.config/murmullo", home_dir);
            if fs::create_dir_all(&config_dir).is_err() {
                return "config.json".to_string();
            }
            return format!("{}/config.json", config_dir);
        }
        "config.json".to_string()
    }

    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        let config_path = Self::get_config_path();

        if Path::new(&config_path).exists() {
            let content = fs::read_to_string(&config_path)?;
            match serde_json::from_str::<AppConfig>(&content) {
                Ok(config) => {
                    println!("📁 Config loaded from {}", config_path);
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
        println!("💾 Config saved to {}", config_path);
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
        llm_model: String,
        default_language: Option<String>,
    ) {
        self.runtime.llm_enabled = llm_enabled;
        self.runtime.llm_model = llm_model;
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

    pub fn update_selected_model(&mut self, model_name: Option<String>) {
        self.ui.selected_model = model_name;
    }

    pub fn get_selected_model(&self) -> Option<String> {
        self.ui.selected_model.clone()
    }
}
