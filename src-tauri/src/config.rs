use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::env;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub whisper: WhisperConfig,
    pub audio: AudioConfig,
    pub vad: VadConfig,
    pub hotkeys: HotkeyConfig,
    pub ui: UiConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhisperConfig {
    pub temperature: f32,
    pub best_of: i32,
    pub default_language: Option<String>,
    pub auto_detect: bool,
    pub initial_prompt: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioConfig {
    pub sample_rate: u32,
    pub channels: u16,
    pub bit_depth: u16,
    pub noise_reduction: bool,
    pub normalization: bool,
    pub silence_threshold: f32,
    pub min_audio_length: f32, // seconds
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VadConfig {
    pub enabled: bool,
    pub sensitivity: f32, // 0.0 - 1.0
    pub silence_timeout: f32, // seconds
    pub min_speech_duration: f32, // seconds
    pub pre_padding: f32, // seconds before speech
    pub post_padding: f32, // seconds after speech
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HotkeyConfig {
    pub enabled: bool,
    pub toggle_recording: String,
    pub push_to_talk: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiConfig {
    pub theme: String,
    pub language: String,
    pub show_debug_info: bool,
    pub auto_save_transcriptions: bool,
    pub selected_model: Option<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        AppConfig {
            whisper: WhisperConfig {
                temperature: 0.1, // Slightly more flexible than 0.0 for better accuracy
                best_of: 5,
                default_language: None, // Auto-detect
                auto_detect: true,
                initial_prompt: "".to_string(),
            },
            audio: AudioConfig {
                sample_rate: 16000,
                channels: 1,
                bit_depth: 16,
                noise_reduction: true,
                normalization: true,
                silence_threshold: 0.005, // Less aggressive silence removal
                min_audio_length: 0.5,
            },
            vad: VadConfig {
                enabled: false, // Disabled by default for now
                sensitivity: 0.5,
                silence_timeout: 2.0,
                min_speech_duration: 0.3,
                pre_padding: 0.1,
                post_padding: 0.5,
            },
            hotkeys: HotkeyConfig {
                enabled: true,
                toggle_recording: "".to_string(), // Disabled - using push-to-talk
                push_to_talk: "Cmd+Shift+T".to_string(), // Push-to-talk: hold to record
            },
            ui: UiConfig {
                theme: "light".to_string(),
                language: "es".to_string(),
                show_debug_info: false,
                auto_save_transcriptions: true,
                selected_model: None,
            },
        }
    }
}

impl AppConfig {
    fn get_config_path() -> String {
        // Try to get the application data directory
        if let Ok(home_dir) = env::var("HOME") {
            // On macOS/Linux, use ~/.config/murmullo/
            let config_dir = format!("{}/.config/murmullo", home_dir);
            if let Err(_) = fs::create_dir_all(&config_dir) {
                // If we can't create the directory, fall back to current directory
                return "config.json".to_string();
            }
            return format!("{}/config.json", config_dir);
        }
        
        // Fallback to current directory
        "config.json".to_string()
    }

    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        let config_path = Self::get_config_path();
        
        if Path::new(&config_path).exists() {
            let content = fs::read_to_string(&config_path)?;
            let config: AppConfig = serde_json::from_str(&content)?;
            println!("📁 Config loaded from {}", config_path);
            Ok(config)
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

    pub fn update_whisper_config(&mut self, temperature: f32, best_of: i32, default_language: Option<String>) {
        self.whisper.temperature = temperature;
        self.whisper.best_of = best_of;
        self.whisper.default_language = default_language.clone();
        println!("⚙️ Whisper config updated: temp={}, best_of={}, lang={:?}", 
                temperature, best_of, default_language);
    }

    pub fn update_audio_config(&mut self, noise_reduction: bool, normalization: bool, silence_threshold: f32) {
        self.audio.noise_reduction = noise_reduction;
        self.audio.normalization = normalization;
        self.audio.silence_threshold = silence_threshold;
        println!("🎵 Audio config updated: noise_reduction={}, normalization={}, threshold={}", 
                noise_reduction, normalization, silence_threshold);
    }

    pub fn update_vad_config(&mut self, enabled: bool, sensitivity: f32, silence_timeout: f32) {
        self.vad.enabled = enabled;
        self.vad.sensitivity = sensitivity;
        self.vad.silence_timeout = silence_timeout;
        println!("🎤 VAD config updated: enabled={}, sensitivity={}, timeout={}", 
                enabled, sensitivity, silence_timeout);
    }

    #[allow(dead_code)]
    pub fn update_hotkey_config(&mut self, enabled: bool, toggle_recording: String, push_to_talk: String) {
        self.hotkeys.enabled = enabled;
        self.hotkeys.toggle_recording = toggle_recording;
        self.hotkeys.push_to_talk = push_to_talk;
        println!("🎹 Hotkey config updated: enabled={}, toggle={}, push_to_talk={}", 
                enabled, self.hotkeys.toggle_recording, self.hotkeys.push_to_talk);
    }

    pub fn update_selected_model(&mut self, model_name: Option<String>) {
        self.ui.selected_model = model_name.clone();
        println!("🤖 Selected model updated: {:?}", model_name);
    }

    pub fn get_selected_model(&self) -> Option<String> {
        self.ui.selected_model.clone()
    }
}
