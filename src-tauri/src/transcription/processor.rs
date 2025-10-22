use crate::transcription::engine::{WhisperEngine, WhisperConfig};
use std::sync::{Arc, Mutex};

pub struct TranscriptionProcessor {
    whisper_engine: Arc<Mutex<WhisperEngine>>,
}

impl TranscriptionProcessor {
    pub fn new() -> Self {
        TranscriptionProcessor {
            whisper_engine: Arc::new(Mutex::new(WhisperEngine::new())),
        }
    }

    pub fn load_model(&self, model_path: &str) -> Result<(), Box<dyn std::error::Error>> {
        let mut engine = self.whisper_engine.lock().unwrap();
        engine.load_model(model_path)
    }

    pub fn transcribe_audio(&self, audio_data: Vec<f32>) -> Result<String, Box<dyn std::error::Error>> {
        let mut engine = self.whisper_engine.lock().unwrap();
        
        if !engine.is_loaded() {
            return Err("Whisper model not loaded. Please load a model first.".into());
        }

        // Preprocess audio if needed
        let processed_audio = self.preprocess_audio(audio_data);
        
        // Transcribe
        let transcription = engine.transcribe(processed_audio)?;
        
        // Post-process transcription
        let cleaned_transcription = self.postprocess_transcription(transcription);
        
        Ok(cleaned_transcription)
    }

    pub fn set_language(&mut self, language: Option<String>) {
        let mut engine = self.whisper_engine.lock().unwrap();
        engine.set_language(language);
    }

    pub fn set_config(&self, config: WhisperConfig) {
        let mut engine = self.whisper_engine.lock().unwrap();
        engine.set_config(config);
    }

    pub fn is_model_loaded(&self) -> bool {
        let engine = self.whisper_engine.lock().unwrap();
        engine.is_loaded()
    }

    #[allow(dead_code)]
    pub fn get_model_info(&self) -> Result<String, Box<dyn std::error::Error>> {
        let engine = self.whisper_engine.lock().unwrap();
        engine.get_model_info()
    }

    fn preprocess_audio(&self, audio_data: Vec<f32>) -> Vec<f32> {
        // Normalize audio to [-1, 1] range
        let max_val = audio_data.iter()
            .map(|&x| x.abs())
            .fold(0.0, f32::max);

        if max_val > 0.0 {
            audio_data.iter()
                .map(|&x| x / max_val)
                .collect()
        } else {
            audio_data
        }
    }

    fn postprocess_transcription(&self, transcription: String) -> String {
        let mut cleaned = transcription.trim().to_string();
        
        // Capitalize first letter
        if !cleaned.is_empty() {
            let mut chars: Vec<char> = cleaned.chars().collect();
            if let Some(first_char) = chars.first_mut() {
                *first_char = first_char.to_uppercase().next().unwrap_or(*first_char);
            }
            cleaned = chars.into_iter().collect();
        }

        // Add period if no punctuation at the end
        if !cleaned.is_empty() && !cleaned.ends_with(['.', '!', '?']) {
            cleaned.push('.');
        }

        cleaned
    }
}
