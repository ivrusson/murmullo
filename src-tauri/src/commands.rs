use crate::models::{ModelManager, ModelInfo};
use crate::transcription::processor::TranscriptionProcessor;
use crate::transcription::engine::WhisperConfig;
use crate::transcription::persistence::{TranscriptionPersistence, TranscriptionDatabase, TranscriptionRecord};
use crate::audio::{AudioCapture, AudioDevice, AudioProcessor};
use crate::config::AppConfig;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tauri::{State, Emitter};

// App state with real audio capture
pub struct AppState {
    pub model_manager: Arc<Mutex<ModelManager>>,
    pub transcription_processor: Arc<Mutex<TranscriptionProcessor>>,
    pub audio_capture: Arc<Mutex<AudioCapture>>,
    pub audio_processor: Arc<Mutex<AudioProcessor>>,
    pub insertion_mode: Arc<Mutex<String>>,
    pub config: Arc<Mutex<AppConfig>>,
    pub transcription_persistence: Arc<Mutex<TranscriptionPersistence>>,
    pub transcription_database: Arc<Mutex<TranscriptionDatabase>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TranscriptionResult {
    pub text: String,
    pub duration_ms: u64,
    pub model_used: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AudioLevel {
    pub level: f32,
    pub is_recording: bool,
}

// Simplified commands without audio/keyboard functionality for now
#[tauri::command]
pub async fn list_models(state: State<'_, AppState>) -> Result<Vec<ModelInfo>, String> {
    let model_manager = state.model_manager.lock().unwrap();
    let models = model_manager.list_models();
    println!("📋 list_models called, returning {} models", models.len());
    for model in &models {
        println!("  - {}: {}", model.name, model.description);
    }
    Ok(models)
}

#[tauri::command]
pub async fn get_model_info(
    model_name: String,
    state: State<'_, AppState>,
) -> Result<Option<ModelInfo>, String> {
    let model_manager = state.model_manager.lock().unwrap();
    Ok(model_manager.get_model(&model_name).cloned())
}

#[tauri::command]
pub async fn get_app_info() -> Result<String, String> {
    Ok("Murmullo v0.1.0 - Offline Voice Dictation".to_string())
}

// Hotkey commands (temporarily disabled)
/*
#[tauri::command]
pub async fn register_hotkeys(app_handle: AppHandle) -> Result<(), String> {
    use crate::hotkeys::HotkeyManager;
    use std::sync::{Arc, Mutex};
    
    let is_recording = Arc::new(Mutex::new(false));
    let hotkey_manager = HotkeyManager::new(app_handle, is_recording);
    
    match hotkey_manager.register_hotkeys() {
        Ok(_) => {
            println!("✅ Hotkeys registered successfully");
            Ok(())
        }
        Err(e) => {
            eprintln!("❌ Failed to register hotkeys: {}", e);
            Err(format!("Failed to register hotkeys: {}", e))
        }
    }
}

#[tauri::command]
pub async fn unregister_hotkeys(app_handle: AppHandle) -> Result<(), String> {
    use crate::hotkeys::HotkeyManager;
    use std::sync::{Arc, Mutex};
    
    let is_recording = Arc::new(Mutex::new(false));
    let hotkey_manager = HotkeyManager::new(app_handle, is_recording);
    
    match hotkey_manager.unregister_hotkeys() {
        Ok(_) => {
            println!("✅ Hotkeys unregistered successfully");
            Ok(())
        }
        Err(e) => {
            eprintln!("❌ Failed to unregister hotkeys: {}", e);
            Err(format!("Failed to unregister hotkeys: {}", e))
        }
    }
}
*/

// Placeholder commands for future implementation
#[tauri::command]
pub async fn list_audio_devices(state: State<'_, AppState>) -> Result<Vec<AudioDevice>, String> {
    let capture = state.audio_capture.lock().unwrap();
    match capture.list_devices() {
        Ok(devices) => Ok(devices),
        Err(e) => {
            eprintln!("❌ Failed to list audio devices: {}", e);
            Err(format!("Failed to list audio devices: {}", e))
        }
    }
}

#[tauri::command]
pub async fn start_recording(state: State<'_, AppState>, device_id: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    println!("🎤 Starting real recording on device: {}", device_id);
    
    let mut capture = state.audio_capture.lock().unwrap();
    
    // Select the device
    if let Err(e) = capture.select_device(&device_id) {
        eprintln!("❌ Failed to select device: {}", e);
        return Err(format!("Failed to select device: {}", e));
    }
    
    // Start recording
    match capture.start_recording() {
        Ok(_) => {
            println!("✅ Real recording started successfully");
            
            // Emit recording state change event
            let _ = app_handle.emit("recording-state-changed", serde_json::json!({
                "state": "recording"
            }));
            
            Ok(())
        }
        Err(e) => {
            eprintln!("❌ Failed to start recording: {}", e);
            Err(format!("Failed to start recording: {}", e))
        }
    }
}

#[tauri::command]
pub async fn stop_recording(state: State<'_, AppState>, app_handle: tauri::AppHandle) -> Result<Vec<f32>, String> {
    println!("⏹️ Stopping real recording");
    
    let mut capture = state.audio_capture.lock().unwrap();
    
    match capture.stop_recording() {
        Ok(audio_data) => {
            println!("📊 Captured {} real audio samples", audio_data.len());
            
            // Emit processing state change event
            let _ = app_handle.emit("recording-state-changed", serde_json::json!({
                "state": "processing"
            }));
            
            Ok(audio_data)
        }
        Err(e) => {
            eprintln!("❌ Failed to stop recording: {}", e);
            Err(format!("Failed to stop recording: {}", e))
        }
    }
}

#[tauri::command]
pub async fn is_recording(state: State<'_, AppState>) -> Result<bool, String> {
    let capture = state.audio_capture.lock().unwrap();
    Ok(capture.is_recording())
}

#[tauri::command]
pub async fn get_audio_level(state: State<'_, AppState>, app_handle: tauri::AppHandle) -> Result<AudioLevel, String> {
    let capture = state.audio_capture.lock().unwrap();
    let level = capture.get_audio_level();
    let recording = capture.is_recording();
    
    // Emit audio level update event for floating bar
    if recording {
        let _ = app_handle.emit("audio-level-updated", serde_json::json!({
            "level": level
        }));
    }
    
    Ok(AudioLevel {
        level,
        is_recording: recording,
    })
}

#[tauri::command]
pub async fn download_model(state: State<'_, AppState>, model_name: String) -> Result<(), String> {
    println!("📥 Starting download of model: {}", model_name);
    println!("🔍 Command received - model_name: '{}'", model_name);
    
    // Clone the manager to avoid holding the lock across await
    let manager = {
        let mgr = state.model_manager.lock().unwrap();
        mgr.clone() // We need to implement Clone for ModelManager
    };
    
    println!("🔍 Manager cloned, starting download...");
    
    match manager.download_model(&model_name).await {
        Ok(_) => {
            println!("✅ Model {} downloaded successfully", model_name);
            
            // Update the original manager with the downloaded model
            {
                let mut mgr = state.model_manager.lock().unwrap();
                mgr.mark_model_downloaded(&model_name);
                println!("📝 Updated original manager: Model {} status to downloaded", model_name);
            }
            
            Ok(())
        }
        Err(e) => {
            eprintln!("❌ Download failed: {}", e);
            Err(format!("Download failed: {}", e))
        }
    }
}

#[tauri::command]
pub async fn get_download_progress(state: State<'_, AppState>, model_name: String) -> Result<f32, String> {
    let manager = state.model_manager.lock().unwrap();
    Ok(manager.get_download_progress(&model_name).unwrap_or(0.0))
}

#[tauri::command]
pub async fn is_model_downloaded(state: State<'_, AppState>, model_name: String) -> Result<bool, String> {
    let manager = state.model_manager.lock().unwrap();
    Ok(manager.is_model_downloaded(&model_name))
}

#[tauri::command]
pub async fn load_model(state: State<'_, AppState>, model_name: String) -> Result<(), String> {
    println!("🔄 Loading model: {}", model_name);
    
    let mut manager = state.model_manager.lock().unwrap();
    let processor = state.transcription_processor.lock().unwrap();
    
    // Check if model is downloaded first
    if !manager.is_model_downloaded(&model_name) {
        println!("❌ Model {} is not downloaded yet", model_name);
        return Err(format!("Model {} is not downloaded. Please download it first.", model_name));
    }
    
    println!("✅ Model {} is downloaded, proceeding with load", model_name);
    
    // First load the model in the manager
    match manager.load_model(&model_name) {
        Ok(_) => {
            println!("✅ Model {} loaded in manager", model_name);
            
            // Then load it in the transcription processor
            if let Some(model_path) = manager.get_model_path(&model_name) {
                println!("📁 Model path: {}", model_path);
                
                match processor.load_model(&model_path) {
                    Ok(_) => {
                        println!("✅ Model {} loaded successfully in transcription processor", model_name);
                        Ok(())
                    }
                    Err(e) => {
                        eprintln!("❌ Failed to load model in processor: {}", e);
                        Err(format!("Failed to load model in processor: {}", e))
                    }
                }
            } else {
                println!("❌ Model path not found for {}", model_name);
                Err("Model path not found".to_string())
            }
        }
        Err(e) => {
            eprintln!("❌ Failed to load model: {}", e);
            Err(format!("Failed to load model: {}", e))
        }
    }
}

#[tauri::command]
pub async fn is_model_loaded(state: State<'_, AppState>, _model_name: String) -> Result<bool, String> {
    let processor = state.transcription_processor.lock().unwrap();
    Ok(processor.is_model_loaded())
}

#[tauri::command]
pub async fn transcribe_audio(state: State<'_, AppState>, audio_data: Vec<f32>, app_handle: tauri::AppHandle) -> Result<TranscriptionResult, String> {
    println!("🎯 Starting real transcription of {} audio samples", audio_data.len());
    
    // Audio analysis
    if audio_data.is_empty() {
        println!("⚠️ Warning: Empty audio data received");
        return Ok(TranscriptionResult {
            text: "No audio data received".to_string(),
            duration_ms: 0,
            model_used: "none".to_string(),
        });
    }
    
    // Calculate audio statistics
    let duration_seconds = audio_data.len() as f32 / 16000.0;
    let max_amplitude = audio_data.iter().map(|&x| x.abs()).fold(0.0, f32::max);
    let avg_amplitude = audio_data.iter().map(|&x| x.abs()).sum::<f32>() / audio_data.len() as f32;
    
    println!("📊 Audio stats: duration={:.2}s, max_amp={}, avg_amp={}", 
             duration_seconds, max_amplitude, avg_amplitude);
    
    // Check if audio has sufficient signal
    if max_amplitude < 0.001 {
        println!("⚠️ Warning: Very low audio amplitude (max={}), might be silence", max_amplitude);
    }
    
    let mut processor = state.transcription_processor.lock().unwrap();
    
    if !processor.is_model_loaded() {
        println!("❌ No Whisper model loaded");
        return Ok(TranscriptionResult {
            text: "No Whisper model loaded. Please load a model first.".to_string(),
            duration_ms: 0,
            model_used: "none".to_string(),
        });
    }
    
    println!("✅ Model is loaded, proceeding with transcription");
    
    // Apply current language configuration before transcription
    let config = state.config.lock().unwrap();
    let default_language = config.whisper.default_language.clone();
    drop(config); // Release the lock
    
    if let Some(lang) = default_language {
        println!("🌍 Applying default language from config: {}", lang);
        processor.set_language(Some(lang));
    } else {
        println!("🌍 No default language set, using auto-detect");
        processor.set_language(None);
    }
    
    // Process audio before transcription
    let config = state.config.lock().unwrap();
    let mut audio_processor = state.audio_processor.lock().unwrap();
    audio_processor.update_config(config.audio.clone());
    drop(config); // Release the lock
    
    let processed_audio = audio_processor.process_audio(audio_data.clone());
    println!("🎵 Audio processed: {} -> {} samples", audio_data.len(), processed_audio.len());
    
    match processor.transcribe_audio(processed_audio) {
        Ok(text) => {
            println!("✅ Transcription successful: '{}'", text);
            
            // Save transcription automatically
            let persistence = state.transcription_persistence.lock().unwrap();
            let mut database = state.transcription_database.lock().unwrap();
            let duration_ms = (duration_seconds * 1000.0) as u64;
            
            match persistence.add_transcription(
                &mut database,
                text.clone(),
                audio_data,
                "whisper".to_string(),
                None, // language
                std::collections::HashMap::new(), // metadata
            ) {
                Ok(transcription_id) => {
                    println!("💾 Transcription saved with ID: {}", transcription_id);
                    
                    // Save the database
                    if let Err(e) = persistence.save_database(&database) {
                        eprintln!("⚠️ Failed to save database: {}", e);
                    }
                    
                    // Emit event to refresh transcription history in main app
                    let _ = app_handle.emit("transcription-saved", serde_json::json!({
                        "id": transcription_id,
                        "text": text.clone()
                    }));
                }
                Err(e) => {
                    eprintln!("⚠️ Failed to save transcription: {}", e);
                }
            }
            
            // Emit idle state change event after successful transcription
            let _ = app_handle.emit("recording-state-changed", serde_json::json!({
                "state": "idle"
            }));
            
            // Emit transcription completed event
            let _ = app_handle.emit("transcription-completed", serde_json::json!({
                "text": text.clone(),
                "duration_ms": duration_ms,
                "model_used": "whisper".to_string()
            }));
            
            Ok(TranscriptionResult {
                text,
                duration_ms,
                model_used: "whisper".to_string(),
            })
        }
        Err(e) => {
            eprintln!("❌ Transcription failed: {}", e);
            
            // Emit idle state change event even on failure
            let _ = app_handle.emit("recording-state-changed", serde_json::json!({
                "state": "idle"
            }));
            
            Ok(TranscriptionResult {
                text: format!("Transcription failed: {}", e),
                duration_ms: 0,
                model_used: "none".to_string(),
            })
        }
    }
}

#[tauri::command]
pub async fn set_transcription_config(
    state: State<'_, AppState>,
    language: Option<String>,
    temperature: f32,
    beam_size: i32,
) -> Result<(), String> {
    println!("⚙️ Setting transcription config: lang={:?}, temp={}, beam={}", language, temperature, beam_size);
    
    let processor = state.transcription_processor.lock().unwrap();
    let mut config = WhisperConfig::default();
    
    config.language = language;
    config.temperature = temperature;
    config.beam_size = beam_size as i32;
    
    processor.set_config(config);
    println!("✅ Transcription config updated");
    Ok(())
}

#[tauri::command]
pub async fn set_transcription_language(state: State<'_, AppState>, language: Option<String>) -> Result<(), String> {
    println!("🌍 Setting transcription language to: {:?}", language);
    
    let mut processor = state.transcription_processor.lock().unwrap();
    processor.set_language(language.clone());
    
    println!("✅ Language set to: {:?}", language);
    Ok(())
}

#[tauri::command]
pub async fn insert_text(_state: State<'_, AppState>, text: String) -> Result<(), String> {
    println!("📝 Simulating text insertion: '{}'", text);
    
    // In a real implementation, this would use the clipboard or keyboard simulation
    // For now, we'll just simulate it
    println!("✅ Text insertion simulated successfully");
    Ok(())
}

#[tauri::command]
pub async fn set_insertion_mode(state: State<'_, AppState>, mode: String) -> Result<(), String> {
    println!("🔄 Setting insertion mode to: {}", mode);
    
    let mut insertion_mode = state.insertion_mode.lock().unwrap();
    *insertion_mode = mode;
    
    println!("✅ Insertion mode updated");
    Ok(())
}

#[tauri::command]
pub async fn get_insertion_mode(state: State<'_, AppState>) -> Result<String, String> {
    let insertion_mode = state.insertion_mode.lock().unwrap();
    Ok(insertion_mode.clone())
}

// Configuration commands
#[tauri::command]
pub async fn get_config(state: State<'_, AppState>) -> Result<AppConfig, String> {
    let config = state.config.lock().unwrap();
    Ok(config.clone())
}

#[tauri::command]
pub async fn update_whisper_config(
    temperature: f32,
    best_of: i32,
    default_language: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut config = state.config.lock().unwrap();
    config.update_whisper_config(temperature, best_of, default_language);
    config.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_audio_config(
    noise_reduction: bool,
    normalization: bool,
    silence_threshold: f32,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut config = state.config.lock().unwrap();
    config.update_audio_config(noise_reduction, normalization, silence_threshold);
    config.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_vad_config(
    enabled: bool,
    sensitivity: f32,
    silence_timeout: f32,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut config = state.config.lock().unwrap();
    config.update_vad_config(enabled, sensitivity, silence_timeout);
    config.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_selected_model(
    model_name: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut config = state.config.lock().unwrap();
    config.update_selected_model(model_name);
    config.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_selected_model(
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    let config = state.config.lock().unwrap();
    Ok(config.get_selected_model())
}

#[tauri::command]
pub async fn register_global_shortcut(app_handle: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, Modifiers, Code};
    
    let shortcut = Shortcut::new(
        Some(Modifiers::ALT | Modifiers::SUPER),
        Code::KeyT
    );
    
    match app_handle.global_shortcut().register(shortcut) {
        Ok(_) => {
            println!("✅ Successfully registered push-to-talk hotkey: Cmd+Option+T");
            Ok(())
        }
        Err(e) => {
            println!("⚠️ Failed to register push-to-talk hotkey: {}", e);
            Err(format!("Failed to register hotkey: {}", e))
        }
    }
}

#[tauri::command]
pub async fn create_floating_bar_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    use tauri::WebviewWindowBuilder;

    println!("🪟 Creating floating dictation bar window...");

    // Obtener el monitor principal
    let primary_monitor = app_handle.primary_monitor().unwrap().unwrap();
    let monitor_size = primary_monitor.size();

    // Tamaño de la ventana
    let width = 400.0;
    let height = 180.0;

    // Calcular posición centrada horizontal y al fondo vertical
    let x = (monitor_size.width as f64 - width) / 2.0;
    let y = (monitor_size.height as f64 - height) - 20.0; // 20px de margen inferior

    let win = tauri::WebviewWindowBuilder::new(
        &app_handle,
        "floating-bar",
        tauri::WebviewUrl::App("floating-bar.html".into()),
    )
    .title("Murmullo Voice Dictation Bar")
    .decorations(false)
    .shadow(false)
    .visible(false)
    .transparent(true)
    .resizable(false)
    .always_on_top(true)
    .inner_size(width, height)
    .position(x, y) // posición calculada manualmente
    .user_agent("MurmulloFloatingBar/1.0")
    .build()
    .map_err(|e| e.to_string())?;

    win.show().map_err(|e| e.to_string())?;
    println!("✅ Floating dictation bar window created successfully");
    Ok(())
}

// Transcription Persistence Commands
#[tauri::command]
pub async fn save_transcription(
    state: State<'_, AppState>,
    text: String,
    audio_data: Vec<f32>,
    model_used: String,
    language: Option<String>,
    metadata: HashMap<String, String>,
) -> Result<String, String> {
    println!("💾 Saving transcription with {} characters", text.len());
    
    let persistence = state.transcription_persistence.lock().unwrap();
    let mut database = state.transcription_database.lock().unwrap();
    
    match persistence.add_transcription(
        &mut database,
        text,
        audio_data,
        model_used,
        language,
        metadata,
    ) {
        Ok(id) => {
            // Save the updated database
            if let Err(e) = persistence.save_database(&database) {
                eprintln!("❌ Failed to save database: {}", e);
                return Err(format!("Failed to save database: {}", e));
            }
            
            println!("✅ Transcription saved with ID: {}", id);
            Ok(id)
        }
        Err(e) => {
            eprintln!("❌ Failed to save transcription: {}", e);
            Err(format!("Failed to save transcription: {}", e))
        }
    }
}

#[tauri::command]
pub async fn list_transcriptions(state: State<'_, AppState>) -> Result<Vec<TranscriptionRecord>, String> {
    let persistence = state.transcription_persistence.lock().unwrap();
    let database = state.transcription_database.lock().unwrap();
    
    let records = persistence.list_transcriptions(&database);
    let records_cloned: Vec<TranscriptionRecord> = records.into_iter().cloned().collect();
    
    println!("📋 Listed {} transcription records", records_cloned.len());
    Ok(records_cloned)
}

#[tauri::command]
pub async fn get_transcription(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<TranscriptionRecord>, String> {
    let persistence = state.transcription_persistence.lock().unwrap();
    let database = state.transcription_database.lock().unwrap();
    
    match persistence.get_transcription(&database, &id) {
        Some(record) => {
            println!("📖 Retrieved transcription: {}", id);
            Ok(Some(record.clone()))
        }
        None => {
            println!("❌ Transcription not found: {}", id);
            Ok(None)
        }
    }
}

#[tauri::command]
pub async fn delete_transcription(
    state: State<'_, AppState>,
    id: String,
) -> Result<bool, String> {
    println!("🗑️ Deleting transcription: {}", id);
    
    let persistence = state.transcription_persistence.lock().unwrap();
    let mut database = state.transcription_database.lock().unwrap();
    
    match persistence.delete_transcription(&mut database, &id) {
        Ok(deleted) => {
            if deleted {
                // Save the updated database
                if let Err(e) = persistence.save_database(&database) {
                    eprintln!("❌ Failed to save database after deletion: {}", e);
                    return Err(format!("Failed to save database: {}", e));
                }
                
                println!("✅ Transcription deleted: {}", id);
                Ok(true)
            } else {
                println!("❌ Transcription not found: {}", id);
                Ok(false)
            }
        }
        Err(e) => {
            eprintln!("❌ Failed to delete transcription: {}", e);
            Err(format!("Failed to delete transcription: {}", e))
        }
    }
}

#[tauri::command]
pub async fn update_transcription(
    state: State<'_, AppState>,
    id: String,
    text: Option<String>,
    metadata: Option<HashMap<String, String>>,
) -> Result<bool, String> {
    println!("✏️ Updating transcription: {}", id);
    
    let persistence = state.transcription_persistence.lock().unwrap();
    let mut database = state.transcription_database.lock().unwrap();
    
    match persistence.update_transcription(&mut database, &id, text, metadata) {
        Ok(updated) => {
            if updated {
                // Save the updated database
                if let Err(e) = persistence.save_database(&database) {
                    eprintln!("❌ Failed to save database after update: {}", e);
                    return Err(format!("Failed to save database: {}", e));
                }
                
                println!("✅ Transcription updated: {}", id);
                Ok(true)
            } else {
                println!("❌ Transcription not found: {}", id);
                Ok(false)
            }
        }
        Err(e) => {
            eprintln!("❌ Failed to update transcription: {}", e);
            Err(format!("Failed to update transcription: {}", e))
        }
    }
}

#[tauri::command]
pub async fn download_audio_file(
    state: State<'_, AppState>,
    id: String,
    destination_path: String,
) -> Result<bool, String> {
    println!("📥 Downloading audio file for transcription: {}", id);
    
    let persistence = state.transcription_persistence.lock().unwrap();
    let database = state.transcription_database.lock().unwrap();
    
    match persistence.copy_audio_file(&database, &id, std::path::Path::new(&destination_path)) {
        Ok(success) => {
            if success {
                println!("✅ Audio file downloaded to: {}", destination_path);
                Ok(true)
            } else {
                println!("❌ Audio file not found for transcription: {}", id);
                Ok(false)
            }
        }
        Err(e) => {
            eprintln!("❌ Failed to download audio file: {}", e);
            Err(format!("Failed to download audio file: {}", e))
        }
    }
}

#[tauri::command]
pub async fn get_audio_file_path(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<String>, String> {
    let persistence = state.transcription_persistence.lock().unwrap();
    let database = state.transcription_database.lock().unwrap();
    
    match persistence.get_audio_file_path(&database, &id) {
        Some(path) => {
            println!("📁 Audio file path for {}: {}", id, path.display());
            Ok(Some(path.to_string_lossy().to_string()))
        }
        None => {
            println!("❌ Audio file not found for transcription: {}", id);
            Ok(None)
        }
    }
}

#[tauri::command]
pub async fn cleanup_orphaned_files(state: State<'_, AppState>) -> Result<usize, String> {
    println!("🧹 Cleaning up orphaned audio files");
    
    let persistence = state.transcription_persistence.lock().unwrap();
    let database = state.transcription_database.lock().unwrap();
    
    match persistence.cleanup_orphaned_files(&database) {
        Ok(cleaned_count) => {
            println!("✅ Cleaned up {} orphaned files", cleaned_count);
            Ok(cleaned_count)
        }
        Err(e) => {
            eprintln!("❌ Failed to cleanup orphaned files: {}", e);
            Err(format!("Failed to cleanup orphaned files: {}", e))
        }
    }
}

#[tauri::command]
pub async fn get_recordings_directory(state: State<'_, AppState>) -> Result<String, String> {
    let persistence = state.transcription_persistence.lock().unwrap();
    let recordings_dir = persistence.get_recordings_dir();
    
    println!("📁 Recordings directory: {}", recordings_dir.display());
    Ok(recordings_dir.to_string_lossy().to_string())
}