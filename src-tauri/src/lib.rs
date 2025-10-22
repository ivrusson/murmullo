mod models;
mod transcription;
mod audio;
mod config;
mod commands;

use models::ModelManager;
use transcription::processor::TranscriptionProcessor;
use transcription::persistence::TranscriptionPersistence;
use audio::{AudioCapture, AudioProcessor};
use config::AppConfig;
use commands::{AppState, list_audio_devices, start_recording, stop_recording, is_recording, get_audio_level, list_models, get_model_info, download_model, get_download_progress, is_model_downloaded, load_model, is_model_loaded, transcribe_audio, set_transcription_config, set_transcription_language, insert_text, set_insertion_mode, get_insertion_mode, get_app_info, get_config, update_whisper_config, update_audio_config, update_vad_config, update_selected_model, get_selected_model, register_global_shortcut, create_floating_bar_window, save_transcription, list_transcriptions, get_transcription, delete_transcription, update_transcription, download_audio_file, get_audio_file_path, cleanup_orphaned_files, get_recordings_directory};
use std::sync::{Arc, Mutex};
use std::path::PathBuf;
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize simplified app state
    let models_dir = PathBuf::from("../models");
    let model_manager = Arc::new(Mutex::new(
        ModelManager::new(models_dir.to_str().unwrap())
            .expect("Failed to initialize model manager")
    ));

    let transcription_processor = Arc::new(Mutex::new(TranscriptionProcessor::new()));
    
    let audio_capture = Arc::new(Mutex::new(
        AudioCapture::new().expect("Failed to initialize audio capture")
    ));

    // Load configuration
    let config = Arc::new(Mutex::new(
        AppConfig::load().expect("Failed to load configuration")
    ));

    // Initialize audio processor with config
    let config_for_processor = {
        let config = config.lock().unwrap();
        config.audio.clone()
    };
    let audio_processor = Arc::new(Mutex::new(AudioProcessor::new(config_for_processor)));

    // Initialize transcription persistence
    let transcription_persistence = Arc::new(Mutex::new(
        TranscriptionPersistence::new().expect("Failed to initialize transcription persistence")
    ));
    
    // Load transcription database
    let transcription_database = Arc::new(Mutex::new({
        let persistence = transcription_persistence.lock().unwrap();
        persistence.load_database().expect("Failed to load transcription database")
    }));

    let app_state = AppState {
        model_manager,
        transcription_processor,
        audio_capture,
        audio_processor,
        insertion_mode: Arc::new(Mutex::new("clipboard".to_string())),
        config,
        transcription_persistence,
        transcription_database,
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_macos_permissions::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new()
            .with_handler(|app, shortcut, event| {
                println!("🎹 Hotkey event received: {:?} - {:?}", shortcut, event);
                
                // Handle different hotkey events by checking modifiers and key
                let shortcut_str = shortcut.to_string();
                println!("🎹 Shortcut string: {}", shortcut_str);
                
                // Check for Cmd+Option+T (Push-to-talk) - Pressed = start, Released = stop
                if shortcut_str.contains("alt") && shortcut_str.contains("super") && shortcut_str.contains("KeyT") {
                    match event.state {
                        tauri_plugin_global_shortcut::ShortcutState::Pressed => {
                            println!("🎹 Push-to-talk START - emitting event");
                            app.emit("hotkey-push-to-talk", "start").unwrap_or_else(|e| {
                                eprintln!("Failed to emit hotkey-push-to-talk-start event: {}", e);
                            });
                            app.emit("recording-state-changed", serde_json::json!({
                                "state": "recording"
                            })).unwrap_or_else(|e| {
                                eprintln!("Failed to emit recording-state-changed event: {}", e);
                            });
                        }
                        tauri_plugin_global_shortcut::ShortcutState::Released => {
                            println!("🎹 Push-to-talk STOP - emitting event");
                            app.emit("hotkey-push-to-talk", "stop").unwrap_or_else(|e| {
                                eprintln!("Failed to emit hotkey-push-to-talk-stop event: {}", e);
                            });
                            app.emit("recording-state-changed", serde_json::json!({
                                "state": "processing"
                            })).unwrap_or_else(|e| {
                                eprintln!("Failed to emit recording-state-changed event: {}", e);
                            });
                        }
                    }
                }
                else {
                    println!("🎹 Unknown hotkey: {:?}", shortcut);
                }
            })
            .build())
        .manage(app_state)
        .setup(|app| {
            println!("🎹 Global shortcut plugin initialized");
            
            // Create floating bar window on startup
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = create_floating_bar_window(app_handle).await {
                    eprintln!("❌ Failed to create floating bar window: {}", e);
                }
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Audio commands (real)
            list_audio_devices,
            start_recording,
            stop_recording,
            is_recording,
            get_audio_level,
            // Model commands (real)
            list_models,
            get_model_info,
            download_model,
            get_download_progress,
            is_model_downloaded,
            load_model,
            is_model_loaded,
            // Transcription commands (real)
            transcribe_audio,
            set_transcription_config,
            set_transcription_language,
            // Transcription persistence commands
            save_transcription,
            list_transcriptions,
            get_transcription,
            delete_transcription,
            update_transcription,
            download_audio_file,
            get_audio_file_path,
            cleanup_orphaned_files,
            get_recordings_directory,
            // Text insertion commands (simulated)
            insert_text,
            set_insertion_mode,
            get_insertion_mode,
            // Configuration commands
            get_config,
            update_whisper_config,
            update_audio_config,
            update_vad_config,
            update_selected_model,
            get_selected_model,
            register_global_shortcut,
            create_floating_bar_window,
            // Utility commands
            get_app_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
