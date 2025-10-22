use whisper_rs::{FullParams, WhisperContext, WhisperContextParameters};
use std::path::Path;
use anyhow::Result;
use lingua::{Language, LanguageDetector, LanguageDetectorBuilder};
use crate::config::WhisperConfig as AppWhisperConfig;

#[derive(Debug, Clone)]
pub struct WhisperConfig {
    pub language: Option<String>,
    pub temperature: f32,
    pub beam_size: i32,
    pub best_of: i32,
}

impl Default for WhisperConfig {
    fn default() -> Self {
        WhisperConfig {
            language: None,  // Auto-detect language instead of forcing English
            temperature: 0.0,  // Better for speech recognition
            beam_size: 5,
            best_of: 5,
        }
    }
}

pub struct WhisperEngine {
    context: Option<WhisperContext>,
    config: WhisperConfig,
    model_path: Option<String>,
    language_detector: LanguageDetector,
}

impl WhisperEngine {
    pub fn new() -> Self {
        // Initialize language detector with common languages
        let languages = vec![
            Language::English,
            Language::Spanish,
            Language::French,
            Language::German,
            Language::Italian,
            Language::Portuguese,
            Language::Dutch,
            Language::Russian,
            Language::Chinese,
            Language::Japanese,
            Language::Korean,
        ];
        
        let detector = LanguageDetectorBuilder::from_languages(&languages)
            .with_minimum_relative_distance(0.1)
            .build();
        
        WhisperEngine {
            context: None,
            config: WhisperConfig::default(),
            model_path: None,
            language_detector: detector,
        }
    }

    pub fn load_model(&mut self, model_path: &str) -> Result<(), Box<dyn std::error::Error>> {
        if !Path::new(model_path).exists() {
            return Err(format!("Model file not found: {}", model_path).into());
        }

        // Create Whisper context parameters
        let mut params = WhisperContextParameters::default();
        params.use_gpu(false); // Start with CPU, can be enabled later for GPU support

        // Load the model
        let context = WhisperContext::new_with_params(model_path, params)
            .map_err(|e| format!("Failed to load Whisper model: {}", e))?;

        self.context = Some(context);
        self.model_path = Some(model_path.to_string());

        log::info!("Whisper model loaded successfully: {}", model_path);
        Ok(())
    }

    pub fn transcribe(&mut self, audio_data: Vec<f32>) -> Result<String, Box<dyn std::error::Error>> {
        println!("🔍 WhisperEngine::transcribe called with {} samples", audio_data.len());
        
        // Determine the language to use
        let language_to_use = if let Some(ref lang) = self.config.language {
            println!("🌍 Using explicitly set language: {}", lang);
            lang.clone()
        } else {
            // For auto-detection, use hybrid detection
            println!("🌍 Using hybrid language detection (Whisper + lingua-rs)");
            self.detect_language_hybrid(&audio_data)?
        };

        let context = self.context.as_mut()
            .ok_or("Whisper model not loaded. Call load_model() first.")?;

        println!("✅ Whisper context is available, creating parameters...");

        // Create full parameters for transcription with improved settings
        let mut params = FullParams::new(whisper_rs::SamplingStrategy::Greedy { best_of: self.config.best_of });
        
        // CRITICAL: Set translate to false FIRST before any other parameters
        params.set_translate(false);
        println!("🚫 Translation disabled FIRST - will transcribe in original language");
        
        // Set the detected/explicit language
        params.set_language(Some(&language_to_use));
        println!("🌍 Language set to: {} - this should prevent translation", language_to_use);
        
        // Set language-specific initial prompt for better detection
        // DISABLED: Initial prompts can interfere with real transcription
        // let initial_prompt = match language_to_use.as_str() {
        //     "es" => "Hola, buenos días. ¿Cómo estás?",
        //     "en" => "Hello, good morning. How are you?",
        //     "fr" => "Bonjour, bon matin. Comment allez-vous?",
        //     "de" => "Guten Morgen. Wie geht es Ihnen?",
        //     "it" => "Buongiorno. Come stai?",
        //     "pt" => "Bom dia. Como você está?",
        //     _ => "",
        // };
        
        // if !initial_prompt.is_empty() {
        //     params.set_initial_prompt(initial_prompt);
        //     println!("🎯 Language-specific initial prompt set: {}", initial_prompt);
        // }
        
        println!("🎯 No initial prompt set - using clean transcription");

        // Set improved parameters for better language detection
        params.set_temperature(self.config.temperature);
        println!("⚙️ Whisper config: lang={}, temp={}, best_of={}", language_to_use, self.config.temperature, self.config.best_of);
        
        // Additional parameters to ensure proper behavior
        params.set_print_progress(false);
        params.set_print_special(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);
        
        // Ensure we're doing transcription, not translation
        params.set_no_context(false); // Allow context for better accuracy
        params.set_single_segment(false); // Allow multiple segments for better accuracy
        
        // CRITICAL: Double-check that translation is disabled
        // This is a workaround for whisper-rs translation issues
        params.set_translate(false);
        println!("🔧 Double-check: Translation disabled again");

        println!("🎤 Starting Whisper transcription...");
        
        // Transcribe the audio
        let mut state = context.create_state()?;
        
        // Whisper expects f32 audio data, so we use the input directly
        state.full(params, &audio_data)?;
        
        println!("✅ Whisper transcription completed");

        // Get the transcription result
        let num_segments = state.full_n_segments()?;
        let mut transcription = String::new();

        for i in 0..num_segments {
            let segment_text = state.full_get_segment_text(i)?;
            transcription.push_str(&segment_text);
            transcription.push(' ');
        }

        // Clean up the transcription
        let cleaned_transcription = transcription.trim().to_string();
        
        log::info!("Transcription completed: {} characters", cleaned_transcription.len());
        Ok(cleaned_transcription)
    }

    pub fn set_language(&mut self, language: Option<String>) {
        self.config.language = language;
        println!("🌍 Language updated to: {:?}", self.config.language);
    }

    #[allow(dead_code)]
    pub fn update_from_app_config(&mut self, app_config: &AppWhisperConfig) {
        self.config.temperature = app_config.temperature;
        self.config.best_of = app_config.best_of;
        self.config.language = app_config.default_language.clone();
        println!("⚙️ Engine config updated from app config: temp={}, best_of={}, lang={:?}", 
                app_config.temperature, app_config.best_of, app_config.default_language);
    }

    #[allow(dead_code)]
    pub fn set_config(&mut self, config: WhisperConfig) {
        self.config = config;
    }

    #[allow(dead_code)]
    pub fn get_config(&self) -> &WhisperConfig {
        &self.config
    }

    pub fn is_loaded(&self) -> bool {
        self.context.is_some()
    }

    #[allow(dead_code)]
    pub fn get_model_path(&self) -> Option<&String> {
        self.model_path.as_ref()
    }

    #[allow(dead_code)]
    pub fn get_model_info(&self) -> Result<String, Box<dyn std::error::Error>> {
        let context = self.context.as_ref()
            .ok_or("Whisper model not loaded")?;

        // Get model information
        let info = format!(
            "Model loaded: {}\nContext size: {}",
            self.model_path.as_deref().unwrap_or("Unknown"),
            context.n_text_ctx()
        );

        Ok(info)
    }

    // Hybrid language detection using both Whisper and lingua-rs
    fn detect_language_hybrid(&mut self, audio_data: &[f32]) -> Result<String, Box<dyn std::error::Error>> {
        println!("🔍 Starting hybrid language detection...");
        
        // First, try a quick Whisper detection with minimal parameters
        let context = self.context.as_mut()
            .ok_or("Whisper model not loaded")?;
        
        let mut quick_params = FullParams::new(whisper_rs::SamplingStrategy::Greedy { best_of: 1 });
        quick_params.set_translate(false);
        quick_params.set_temperature(0.0);
        quick_params.set_print_progress(false);
        quick_params.set_print_special(false);
        quick_params.set_print_realtime(false);
        quick_params.set_print_timestamps(false);
        quick_params.set_no_context(true);
        quick_params.set_single_segment(true); // Single segment for quick detection
        
        let mut state = context.create_state()?;
        state.full(quick_params, audio_data)?;
        
        let num_segments = state.full_n_segments()?;
        let mut quick_transcription = String::new();
        
        for i in 0..num_segments {
            let segment_text = state.full_get_segment_text(i)?;
            quick_transcription.push_str(&segment_text);
            quick_transcription.push(' ');
        }
        
        let cleaned_text = quick_transcription.trim().to_string();
        println!("🔍 Quick transcription for language detection: '{}'", cleaned_text);
        
        if cleaned_text.is_empty() {
            return Ok("en".to_string()); // Default fallback
        }
        
        // Use lingua-rs to detect language from the transcription
        let detected_language = self.language_detector.detect_language_of(&cleaned_text);
        
        match detected_language {
            Some(lang) => {
                let lang_code = match lang {
                    Language::English => "en",
                    Language::Spanish => "es",
                    Language::French => "fr",
                    Language::German => "de",
                    Language::Italian => "it",
                    Language::Portuguese => "pt",
                    Language::Dutch => "nl",
                    Language::Russian => "ru",
                    Language::Chinese => "zh",
                    Language::Japanese => "ja",
                    Language::Korean => "ko",
                    _ => "en", // Default fallback
                };
                println!("🌍 Hybrid detection result: {} (confidence: {})", lang_code, lang);
                Ok(lang_code.to_string())
            }
            None => {
                println!("⚠️ No language detected, using default: en");
                Ok("en".to_string())
            }
        }
    }
}

impl Drop for WhisperEngine {
    fn drop(&mut self) {
        // Clean up resources
        self.context = None;
    }
}
