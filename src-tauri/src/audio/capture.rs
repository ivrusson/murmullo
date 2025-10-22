use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, Host, Stream, StreamConfig};
use std::sync::{Arc, Mutex};
use std::collections::VecDeque;
use anyhow::Result;
use std::path::Path;
use std::fs::File;
use std::io::BufWriter;
use rubato::{Resampler, SincFixedIn, SincInterpolationType, SincInterpolationParameters, WindowFunction};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AudioDevice {
    pub id: String,
    pub name: String,
}

pub struct AudioCapture {
    host: Host,
    device: Option<Device>,
    stream: Option<Stream>,
    audio_buffer: Arc<Mutex<VecDeque<f32>>>,
    is_recording: Arc<Mutex<bool>>,
    #[allow(dead_code)]
    sample_rate: u32,
    needs_resampling: bool,
    device_sample_rate: u32,
}

impl AudioCapture {
    pub fn new() -> Result<Self> {
        let host = cpal::default_host();
        let audio_buffer = Arc::new(Mutex::new(VecDeque::new()));
        let is_recording = Arc::new(Mutex::new(false));

        Ok(Self {
            host,
            device: None,
            stream: None,
            audio_buffer,
            is_recording,
            sample_rate: 16000, // Whisper expects 16kHz
            needs_resampling: false,
            device_sample_rate: 0,
        })
    }

    pub fn list_devices(&self) -> Result<Vec<AudioDevice>> {
        let mut devices = Vec::new();
        
        println!("🔍 Listing all available audio devices...");
        
        // Add default input device
        if let Some(device) = self.host.default_input_device() {
            if let Ok(name) = device.name() {
                println!("📱 Default device: {}", name);
                devices.push(AudioDevice {
                    id: "default".to_string(),
                    name: format!("Default: {}", name),
                });
            }
        }

        // Add other input devices
        for (index, device) in self.host.input_devices()?.enumerate() {
            if let Ok(name) = device.name() {
                println!("🎤 Device {}: {}", index, name);
                
                // Get device capabilities
                if let Ok(config) = device.default_input_config() {
                    println!("   └─ Config: {:?}", config);
                }
                
                devices.push(AudioDevice {
                    id: format!("device_{}", index),
                    name,
                });
            }
        }

        println!("✅ Found {} audio devices", devices.len());
        Ok(devices)
    }

    pub fn select_device(&mut self, device_id: &str) -> Result<()> {
        println!("🎯 Selecting device: {}", device_id);
        
        if device_id == "default" {
            self.device = self.host.default_input_device();
            if let Some(ref device) = self.device {
                if let Ok(name) = device.name() {
                    println!("✅ Selected default device: {}", name);
                }
            }
        } else if device_id.starts_with("device_") {
            let index_str = &device_id[7..]; // Remove "device_" prefix
            if let Ok(index) = index_str.parse::<usize>() {
                let devices: Vec<_> = self.host.input_devices()?.collect();
                if index < devices.len() {
                    self.device = Some(devices[index].clone());
                    if let Ok(name) = devices[index].name() {
                        println!("✅ Selected device {}: {}", index, name);
                    }
                } else {
                    return Err(anyhow::anyhow!("Device index {} out of range", index));
                }
            } else {
                return Err(anyhow::anyhow!("Invalid device index: {}", index_str));
            }
        } else {
            return Err(anyhow::anyhow!("Unknown device ID: {}", device_id));
        }
        
        Ok(())
    }

    pub fn start_recording(&mut self) -> Result<()> {
        if self.stream.is_some() {
            return Ok(()); // Already recording
        }

        let device = self.device.as_ref()
            .ok_or_else(|| anyhow::anyhow!("No device selected"))?;

        // Get the default input config first
        let default_config = device.default_input_config()?;
        println!("🎤 Default device config: {:?}", default_config);

        // Use the device's native configuration with optimized buffer size
        let config = StreamConfig {
            channels: 1, // Mono
            sample_rate: default_config.sample_rate(), // Use device's native sample rate
            buffer_size: cpal::BufferSize::Fixed(512), // Smaller buffer for lower latency
        };
        
        println!("🎤 Using config: channels={}, sample_rate={}, buffer_size={:?}", 
                 config.channels, config.sample_rate.0, config.buffer_size);

        // Check if resampling is needed
        let device_sample_rate = config.sample_rate.0;
        let target_sample_rate = 16000; // Whisper expects 16kHz
        
        let needs_resampling = device_sample_rate != target_sample_rate;
        
        if needs_resampling {
            println!("🔄 Resampling needed: {}Hz -> {}Hz", device_sample_rate, target_sample_rate);
        } else {
            println!("✅ No resampling needed, sample rates match");
        }

        // Store resampling info
        self.needs_resampling = needs_resampling;
        self.device_sample_rate = device_sample_rate;

        let audio_buffer = Arc::clone(&self.audio_buffer);
        let is_recording = Arc::clone(&self.is_recording);
        let actual_sample_rate = config.sample_rate.0; // Get the actual sample rate from config

        let stream = device.build_input_stream(
            &config,
            move |data: &[f32], _: &cpal::InputCallbackInfo| {
                let mut buffer = audio_buffer.lock().unwrap();
                let recording = *is_recording.lock().unwrap();
                
                if recording {
                    // Calculate audio level for this chunk
                    let chunk_max = data.iter().map(|&x| x.abs()).fold(0.0, f32::max);
                    let chunk_avg = data.iter().map(|&x| x.abs()).sum::<f32>() / data.len() as f32;
                    
                    // Log audio levels occasionally (every 100 chunks to avoid spam)
                    static mut CHUNK_COUNT: u32 = 0;
                    unsafe {
                        CHUNK_COUNT += 1;
                        if CHUNK_COUNT % 100 == 0 {
                            println!("🎤 Audio chunk: {} samples, max={:.4}, avg={:.4}", 
                                     data.len(), chunk_max, chunk_avg);
                        }
                    }
                    
                    // Add raw audio data to buffer with clipping prevention
                    for &sample in data {
                        // Prevent clipping by limiting amplitude
                        let normalized_sample = sample.clamp(-0.95, 0.95);
                        buffer.push_back(normalized_sample);
                        // Keep buffer size reasonable (10 seconds max)
                        if buffer.len() > actual_sample_rate as usize * 10 {
                            buffer.pop_front();
                        }
                    }
                }
            },
            move |err| {
                eprintln!("Audio stream error: {}", err);
            },
            None,
        )?;

        stream.play()?;
        self.stream = Some(stream);
        
        {
            let mut recording = self.is_recording.lock().unwrap();
            *recording = true;
        }

        println!("🎤 Started real audio recording");
        Ok(())
    }

    pub fn stop_recording(&mut self) -> Result<Vec<f32>> {
        println!("⏹️ Stopping real recording");
        
        {
            let mut recording = self.is_recording.lock().unwrap();
            *recording = false;
        }

        if let Some(stream) = self.stream.take() {
            drop(stream); // Stop the stream
        }

        let mut buffer = self.audio_buffer.lock().unwrap();
        let raw_audio_data: Vec<f32> = buffer.drain(..).collect();

        // Analyze the captured audio
        if !raw_audio_data.is_empty() {
            // Safety check for device_sample_rate
            if self.device_sample_rate == 0 {
                eprintln!("❌ Error: device_sample_rate is 0, using default 48000Hz");
                self.device_sample_rate = 48000;
            }
            
            let max_amplitude = raw_audio_data.iter().map(|&x| x.abs()).fold(0.0, f32::max);
            let avg_amplitude = raw_audio_data.iter().map(|&x| x.abs()).sum::<f32>() / raw_audio_data.len() as f32;
            let duration_seconds = raw_audio_data.len() as f32 / self.device_sample_rate as f32;
            
            println!("⏹️ Stopped real audio recording, captured {} samples at {}Hz", 
                     raw_audio_data.len(), self.device_sample_rate);
            println!("📊 Raw audio: duration={:.2}s, max_amp={:.4}, avg_amp={:.4}", 
                     duration_seconds, max_amplitude, avg_amplitude);
            
            if max_amplitude < 0.001 {
                println!("⚠️ Warning: Very low audio amplitude, might be silence or noise");
            } else if max_amplitude > 0.1 {
                println!("⚠️ Warning: Very high audio amplitude, might be clipping");
            } else {
                println!("✅ Audio amplitude looks good for speech");
            }

            // Save raw audio first (before resampling)
            let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
            let filename = format!("recording_{}.wav", timestamp);
            
            println!("💾 Attempting to save raw audio...");
            if let Err(e) = self.save_audio_to_file(&raw_audio_data, self.device_sample_rate, &format!("raw_{}", filename)) {
                eprintln!("⚠️ Failed to save raw audio: {}", e);
            } else {
                println!("✅ Raw audio saved successfully");
            }

            // Resample if needed using high-quality resampling
            let audio_data = if self.needs_resampling {
                println!("🔄 High-quality resampling from {}Hz to 16kHz...", self.device_sample_rate);
                
                // Use rubato for high-quality resampling
                let params = SincInterpolationParameters {
                    sinc_len: 256,
                    f_cutoff: 0.95,
                    interpolation: SincInterpolationType::Linear,
                    oversampling_factor: 256,
                    window: WindowFunction::BlackmanHarris2,
                };
                
                let mut resampler = SincFixedIn::<f32>::new(
                    16000.0 / self.device_sample_rate as f64,
                    2.0, // Max ratio
                    params,
                    raw_audio_data.len(),
                    1,   // Channels
                ).map_err(|e| anyhow::anyhow!("Failed to create resampler: {}", e))?;
                
                // Convert Vec<f32> to Vec<Vec<f32>> format expected by rubato
                // Rubato expects: Vec<Vec<f32>> where each inner Vec is a channel
                let input: Vec<Vec<f32>> = vec![raw_audio_data.clone()];
                let output = resampler.process(&input, None)
                    .map_err(|e| anyhow::anyhow!("Resampling failed: {}", e))?;
                
                // Flatten the output back to Vec<f32>
                let resampled: Vec<f32> = output.into_iter().flatten().collect();
                
                println!("✅ High-quality resampling completed: {} -> {} samples", 
                         raw_audio_data.len(), resampled.len());
                resampled
            } else {
                println!("✅ No resampling needed, using raw audio");
                raw_audio_data.clone()
            };
            
            // Save processed audio
            println!("💾 Attempting to save processed audio...");
            if let Err(e) = self.save_audio_to_file(&audio_data, 16000, &format!("processed_{}", filename)) {
                eprintln!("⚠️ Failed to save processed audio: {}", e);
            } else {
                println!("✅ Processed audio saved successfully");
            }

            println!("✅ Audio processing completed successfully");
            Ok(audio_data)
        } else {
            println!("⚠️ Warning: No audio data captured");
            Ok(Vec::new())
        }
    }

    pub fn is_recording(&self) -> bool {
        *self.is_recording.lock().unwrap()
    }

    pub fn get_audio_level(&self) -> f32 {
        let buffer = self.audio_buffer.lock().unwrap();
        if buffer.is_empty() {
            return 0.0;
        }

        // Calculate RMS (Root Mean Square) for audio level
        let sum_squares: f32 = buffer.iter().map(|&x| x * x).sum();
        let rms = (sum_squares / buffer.len() as f32).sqrt();
        
        // Normalize to 0-1 range
        (rms * 10.0).min(1.0)
    }

    #[allow(dead_code)]
    pub fn get_audio_data(&self) -> Vec<f32> {
        let buffer = self.audio_buffer.lock().unwrap();
        buffer.iter().cloned().collect()
    }

    #[allow(dead_code)]
    pub fn clear_buffer(&self) {
        let mut buffer = self.audio_buffer.lock().unwrap();
        buffer.clear();
    }

    pub fn save_audio_to_file(&self, audio_data: &[f32], sample_rate: u32, filename: &str) -> Result<()> {
        println!("💾 Saving audio to file: {}", filename);
        
        // Validate inputs
        if audio_data.is_empty() {
            return Err(anyhow::anyhow!("Audio data is empty"));
        }
        
        if sample_rate == 0 {
            return Err(anyhow::anyhow!("Sample rate cannot be 0"));
        }
        
        // Create recordings directory if it doesn't exist (outside src-tauri to avoid hot reload)
        let recordings_dir = Path::new("../recordings");
        if !recordings_dir.exists() {
            std::fs::create_dir_all(recordings_dir)?;
            println!("📁 Created recordings directory");
        }
        
        let file_path = recordings_dir.join(filename);
        let file = File::create(&file_path)?;
        let writer = BufWriter::new(file);
        
        // Create WAV spec
        let spec = hound::WavSpec {
            channels: 1,
            sample_rate,
            bits_per_sample: 16,
            sample_format: hound::SampleFormat::Int,
        };
        
        let mut writer = hound::WavWriter::new(writer, spec)?;
        
        // Convert f32 samples to i16 and write
        for &sample in audio_data {
            // Clamp sample to [-1.0, 1.0] range
            let clamped_sample = sample.max(-1.0).min(1.0);
            // Convert to i16 range
            let sample_i16 = (clamped_sample * i16::MAX as f32) as i16;
            writer.write_sample(sample_i16)?;
        }
        
        writer.finalize()?;
        
        println!("✅ Audio saved to: {:?}", file_path);
        println!("📊 Saved {} samples at {}Hz (duration: {:.2}s)", 
                 audio_data.len(), sample_rate, audio_data.len() as f32 / sample_rate as f32);
        
        Ok(())
    }
}

// Implement Send and Sync manually to work around cpal limitations
unsafe impl Send for AudioCapture {}
unsafe impl Sync for AudioCapture {}