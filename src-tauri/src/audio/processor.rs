use crate::config::AudioConfig;
use crate::pipeline;

pub struct AudioProcessor {
    config: AudioConfig,
}

impl AudioProcessor {
    pub fn new(config: AudioConfig) -> Self {
        AudioProcessor { config }
    }

    pub fn process_audio(&self, audio_data: Vec<f32>) -> Vec<f32> {
        let mut processed = audio_data;
        pipeline::log(
            "audio",
            format!(
                "process start samples={} duration={:.2}s noise_reduction={} normalize={}",
                processed.len(),
                processed.len() as f32 / 16000.0,
                self.config.noise_reduction,
                self.config.normalization
            ),
        );

        if self.config.noise_reduction {
            processed = self.reduce_noise(processed);
        }

        if self.config.normalization {
            processed = self.normalize_audio(processed);
        }

        processed = self.boost_for_stt(processed);
        processed = self.trim_silence(processed);
        pipeline::log(
            "audio",
            format!(
                "process done samples={} duration={:.2}s",
                processed.len(),
                processed.len() as f32 / 16000.0
            ),
        );
        processed
    }

    /// Reject only near-empty clips. Quiet speech must still reach nemo-speech.
    pub fn has_sufficient_speech(&self, audio_data: &[f32]) -> Result<(), String> {
        if audio_data.is_empty() {
            return Err(crate::codes::code("audio.empty"));
        }

        let duration = audio_data.len() as f32 / 16000.0;
        if duration < self.config.min_audio_length {
            let reason = crate::codes::code_json(
                "audio.too_short",
                serde_json::json!({
                    "seconds": format!("{:.1}", duration),
                    "min": format!("{:.1}", self.config.min_audio_length),
                }),
            );
            pipeline::log("ptt", format!("speech-gate REJECT {reason}"));
            return Err(reason);
        }

        let rms = self.get_audio_level(audio_data);
        let max_amp = audio_data.iter().map(|&x| x.abs()).fold(0.0f32, f32::max);

        const FRAME: usize = 320; // 20 ms @ 16 kHz
        const FRAME_ENERGY: f32 = 0.003;
        let mut voiced_frames = 0usize;
        let mut total_frames = 0usize;
        for chunk in audio_data.chunks(FRAME) {
            total_frames += 1;
            let energy = (chunk.iter().map(|x| x * x).sum::<f32>() / chunk.len() as f32).sqrt();
            if energy > FRAME_ENERGY {
                voiced_frames += 1;
            }
        }
        let frame_ratio = if total_frames == 0 {
            0.0
        } else {
            voiced_frames as f32 / total_frames as f32
        };

        pipeline::log(
            "ptt",
            format!(
                "speech-gate duration={:.2}s rms={:.4} max={:.4} voiced_frames={}/{} ({:.2})",
                duration, rms, max_amp, voiced_frames, total_frames, frame_ratio
            ),
        );

        if voiced_frames < 3 && rms < 0.002 {
            let reason = crate::codes::code("audio.no_speech");
            pipeline::log(
                "ptt",
                "speech-gate REJECT no voiced frames — not sending empty clip to nemo-speech",
            );
            return Err(reason);
        }

        pipeline::log("ptt", "speech-gate PASS — will POST to nemo-speech");
        Ok(())
    }

    fn reduce_noise(&self, audio_data: Vec<f32>) -> Vec<f32> {
        let window_size = 5;
        let mut filtered = Vec::with_capacity(audio_data.len());

        for i in 0..audio_data.len() {
            let start = i.saturating_sub(window_size / 2);
            let end = (i + window_size / 2 + 1).min(audio_data.len());
            let sum: f32 = audio_data[start..end].iter().sum();
            filtered.push(sum / (end - start) as f32);
        }

        pipeline::log(
            "audio",
            format!(
                "noise reduction: 5-tap MA on {} samples (no crush)",
                filtered.len()
            ),
        );
        filtered
    }

    fn normalize_audio(&self, audio_data: Vec<f32>) -> Vec<f32> {
        if audio_data.is_empty() {
            return audio_data;
        }

        let max_abs = audio_data.iter().map(|&x| x.abs()).fold(0.0f32, f32::max);

        if max_abs == 0.0 {
            return audio_data;
        }

        const MIN_PEAK_TO_NORMALIZE: f32 = 0.02;
        const MAX_SCALE: f32 = 8.0;
        const TARGET_MAX: f32 = 0.9;

        if max_abs < MIN_PEAK_TO_NORMALIZE {
            pipeline::log(
                "audio",
                format!("normalize skip: peak {max_abs:.4} too low"),
            );
            return audio_data;
        }

        let scale_factor = (TARGET_MAX / max_abs).min(MAX_SCALE);
        if scale_factor <= 1.0 {
            pipeline::log(
                "audio",
                format!("normalize skip: already loud peak={max_abs:.4}"),
            );
            return audio_data;
        }

        pipeline::log(
            "audio",
            format!("normalize peak={max_abs:.4} scale={scale_factor:.2}"),
        );
        audio_data.iter().map(|&x| x * scale_factor).collect()
    }

    /// Parakeet needs usable peaks. Quiet mics (peak 0.004) were skipped and STT returned "".
    fn boost_for_stt(&self, audio_data: Vec<f32>) -> Vec<f32> {
        if audio_data.is_empty() {
            return audio_data;
        }
        let max_abs = audio_data.iter().map(|&x| x.abs()).fold(0.0f32, f32::max);
        if max_abs < 0.0004 {
            pipeline::log(
                "audio",
                format!("stt-boost skip: digital silence peak={max_abs:.5}"),
            );
            return audio_data;
        }
        const TARGET: f32 = 0.75;
        const MAX_SCALE: f32 = 40.0;
        let scale = (TARGET / max_abs).min(MAX_SCALE).max(1.0);
        if (scale - 1.0).abs() < 0.05 {
            pipeline::log(
                "audio",
                format!("stt-boost skip: peak {max_abs:.4} already usable"),
            );
            return audio_data;
        }
        pipeline::log(
            "audio",
            format!(
                "stt-boost peak {max_abs:.4} → {:.4} scale={scale:.1}",
                max_abs * scale
            ),
        );
        audio_data
            .iter()
            .map(|&x| (x * scale).clamp(-0.95, 0.95))
            .collect()
    }

    fn trim_silence(&self, audio_data: Vec<f32>) -> Vec<f32> {
        if audio_data.is_empty() {
            return audio_data;
        }

        let threshold = self.config.silence_threshold.min(0.004).max(0.001);
        let pad = 3200; // 200 ms @ 16 kHz
        let first = audio_data.iter().position(|&x| x.abs() > threshold);
        let last = audio_data.iter().rposition(|&x| x.abs() > threshold);
        let (Some(first), Some(last)) = (first, last) else {
            pipeline::log("audio", "trim-silence: all below threshold");
            return audio_data;
        };
        if first >= last {
            return audio_data;
        }
        let start = first.saturating_sub(pad);
        let end = (last + pad).min(audio_data.len());
        pipeline::log(
            "audio",
            format!(
                "trim-silence {} -> {} samples (threshold={threshold})",
                audio_data.len(),
                end - start
            ),
        );
        audio_data[start..end].to_vec()
    }

    pub fn get_audio_level(&self, audio_data: &[f32]) -> f32 {
        if audio_data.is_empty() {
            return 0.0;
        }

        audio_data.iter().map(|&x| x * x).sum::<f32>().sqrt() / (audio_data.len() as f32).sqrt()
    }

    pub fn update_config(&mut self, config: AudioConfig) {
        self.config = config;
    }
}
