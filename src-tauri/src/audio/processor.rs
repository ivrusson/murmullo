use crate::config::AudioConfig;

pub struct AudioProcessor {
    config: AudioConfig,
}

impl AudioProcessor {
    pub fn new(config: AudioConfig) -> Self {
        AudioProcessor { config }
    }

    pub fn process_audio(&self, audio_data: Vec<f32>) -> Vec<f32> {
        let mut processed = audio_data;
        
        // Apply noise reduction if enabled
        if self.config.noise_reduction {
            processed = self.reduce_noise(processed);
        }
        
        // Apply normalization if enabled
        if self.config.normalization {
            processed = self.normalize_audio(processed);
        }
        
        // Remove silence if below threshold
        processed = self.remove_silence(processed);
        
        processed
    }

    fn reduce_noise(&self, audio_data: Vec<f32>) -> Vec<f32> {
        println!("🔇 Applying noise reduction...");
        
        // Simple noise reduction using a moving average filter
        let window_size = 5;
        let mut filtered = Vec::with_capacity(audio_data.len());
        
        for i in 0..audio_data.len() {
            let start = i.saturating_sub(window_size / 2);
            let end = (i + window_size / 2 + 1).min(audio_data.len());
            
            let sum: f32 = audio_data[start..end].iter().sum();
            let avg = sum / (end - start) as f32;
            
            // Apply soft thresholding
            let threshold = 0.01;
            let filtered_sample = if avg.abs() < threshold {
                avg * 0.1 // Reduce very quiet sounds
            } else {
                avg
            };
            
            filtered.push(filtered_sample);
        }
        
        println!("✅ Noise reduction applied to {} samples", filtered.len());
        filtered
    }

    fn normalize_audio(&self, audio_data: Vec<f32>) -> Vec<f32> {
        println!("📊 Applying audio normalization...");
        
        if audio_data.is_empty() {
            return audio_data;
        }
        
        // Find the maximum absolute value
        let max_abs = audio_data.iter()
            .map(|&x| x.abs())
            .fold(0.0f32, |a, b| a.max(b));
        
        if max_abs == 0.0 {
            return audio_data;
        }
        
        // Normalize to prevent clipping (target 0.95 of max)
        let target_max = 0.95;
        let scale_factor = target_max / max_abs;
        
        let normalized: Vec<f32> = audio_data.iter()
            .map(|&x| x * scale_factor)
            .collect();
        
        println!("✅ Audio normalized: max_abs={:.4}, scale_factor={:.4}", max_abs, scale_factor);
        normalized
    }

    fn remove_silence(&self, audio_data: Vec<f32>) -> Vec<f32> {
        println!("🔇 Removing silence below threshold: {}", self.config.silence_threshold);
        
        let mut result = Vec::new();
        let mut silence_start = None;
        let min_silence_duration = (self.config.min_audio_length * 16000.0) as usize; // Convert to samples
        
        for (i, &sample) in audio_data.iter().enumerate() {
            if sample.abs() < self.config.silence_threshold {
                if silence_start.is_none() {
                    silence_start = Some(i);
                }
            } else {
                // Found non-silent audio
                if let Some(start) = silence_start {
                    let silence_duration = i - start;
                    
                    // Only remove silence if it's long enough
                    if silence_duration >= min_silence_duration {
                        println!("🔇 Removed {} samples of silence", silence_duration);
                    } else {
                        // Keep the silence if it's too short
                        result.extend_from_slice(&audio_data[start..i]);
                    }
                }
                silence_start = None;
                result.push(sample);
            }
        }
        
        // Handle trailing silence
        if let Some(start) = silence_start {
            let silence_duration = audio_data.len() - start;
            if silence_duration < min_silence_duration {
                result.extend_from_slice(&audio_data[start..]);
            }
        }
        
        println!("✅ Silence removal: {} -> {} samples", audio_data.len(), result.len());
        result
    }

    #[allow(dead_code)]
    pub fn detect_voice_activity(&self, audio_data: &[f32]) -> bool {
        if audio_data.is_empty() {
            return false;
        }
        
        // Calculate RMS (Root Mean Square) for voice activity detection
        let rms: f32 = audio_data.iter()
            .map(|&x| x * x)
            .sum::<f32>()
            .sqrt() / (audio_data.len() as f32).sqrt();
        
        let is_voice = rms > self.config.silence_threshold;
        
        if is_voice {
            println!("🎤 Voice detected: RMS={:.4}", rms);
        }
        
        is_voice
    }

    #[allow(dead_code)]
    pub fn get_audio_level(&self, audio_data: &[f32]) -> f32 {
        if audio_data.is_empty() {
            return 0.0;
        }
        
        let rms: f32 = audio_data.iter()
            .map(|&x| x * x)
            .sum::<f32>()
            .sqrt() / (audio_data.len() as f32).sqrt();
        
        rms
    }

    pub fn update_config(&mut self, config: AudioConfig) {
        self.config = config;
        println!("⚙️ Audio processor config updated");
    }
}
