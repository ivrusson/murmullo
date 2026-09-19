mod audio;
mod codes;
mod commands;
mod config;
mod crash;
mod dictionary;
mod insertion;
mod llm;
mod models;
mod paths;
mod permissions;
mod pipeline;
mod postprocess;
mod runtime;
mod transcription;

use audio::{AudioCapture, AudioProcessor};
use commands::{
    add_dictionary_entry, apply_correction, apply_registered_shortcut, cleanup_orphaned_files,
    create_floating_bar_window, delete_transcription, download_audio_file, download_model,
    ensure_floating_bar_window, ensure_stt_runtime, get_app_info, get_audio_file_path,
    get_audio_level, get_config, get_download_progress, get_insertion_mode, get_model_info,
    get_overlay_layout, get_pipeline_log_path, get_pipeline_logs, get_recordings_directory,
    get_runtime_status, get_selected_model, get_system_prompt, get_transcription, insert_text,
    is_model_downloaded, is_model_loaded, is_recording, list_audio_devices, list_dictionary,
    list_llm_providers, list_models, list_transcriptions, load_model, overlay_cancel_dictation,
    overlay_start_dictation, overlay_stop_dictation, register_global_shortcut,
    remove_dictionary_entry, resize_overlay, rewrite_with_configured_llm, save_overlay_position,
    save_transcription, set_insertion_mode, set_overlay_compact, set_overlay_style,
    set_transcription_language, show_main_window, start_llm_runtime, start_push_to_talk,
    start_recording, start_stt_runtime, stop_push_to_talk, stop_recording, stop_stt_runtime,
    transcribe_audio, unregister_global_shortcut, update_audio_config, update_hotkey_config,
    update_runtime_config, update_selected_model, update_transcription, update_ui_language,
    update_ui_theme, AppState,
};
use config::AppConfig;
use dictionary::DictionaryStore;
use models::{ModelManager, PARAKEET_NAME};
use permissions::{
    check_macos_permissions, request_macos_accessibility, request_macos_input_monitoring,
    request_macos_microphone,
};
use runtime::RuntimeManager;
use std::sync::{Arc, Mutex};
use tauri::Manager;
use transcription::persistence::TranscriptionPersistence;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    crate::paths::ensure_layout();

    let models_dir = crate::paths::models_dir();

    let model_manager = Arc::new(Mutex::new(
        ModelManager::new(models_dir.to_str().unwrap())
            .expect("Failed to initialize model manager"),
    ));

    let config = Arc::new(Mutex::new(
        AppConfig::load().expect("Failed to load configuration"),
    ));

    let (stt_port, llm_provider, llm_url, llm_model) = {
        let cfg = config.lock().unwrap();
        (
            cfg.runtime.stt_port,
            cfg.runtime.llm_provider.clone(),
            cfg.runtime.llm_url.clone(),
            cfg.runtime.llm_model.clone(),
        )
    };

    let runtime_dir = crate::paths::runtime_dir();

    let runtime = Arc::new(Mutex::new(RuntimeManager::new(
        models_dir.clone(),
        runtime_dir,
        stt_port,
        llm_provider,
        llm_url,
        llm_model,
    )));

    let dictionary = Arc::new(Mutex::new(
        DictionaryStore::new().expect("Failed to initialize dictionary"),
    ));

    let audio_capture = Arc::new(Mutex::new(
        AudioCapture::new().expect("Failed to initialize audio capture"),
    ));

    let config_for_processor = {
        let config = config.lock().unwrap();
        config.audio.clone()
    };
    let audio_processor = Arc::new(Mutex::new(AudioProcessor::new(config_for_processor)));

    let transcription_persistence = Arc::new(Mutex::new(
        TranscriptionPersistence::new().expect("Failed to initialize transcription persistence"),
    ));

    let transcription_database = Arc::new(Mutex::new({
        let persistence = transcription_persistence.lock().unwrap();
        persistence
            .load_database()
            .expect("Failed to load transcription database")
    }));

    let app_state = AppState {
        model_manager: model_manager.clone(),
        runtime: runtime.clone(),
        dictionary,
        audio_capture,
        audio_processor,
        insertion_mode: Arc::new(Mutex::new("clipboard".to_string())),
        config,
        transcription_persistence,
        transcription_database,
    };

    crate::crash::install_panic_hook();

    tauri::Builder::default()
        .plugin(tauri_plugin_macos_permissions::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| match event.state {
                    tauri_plugin_global_shortcut::ShortcutState::Pressed => {
                        start_push_to_talk(app);
                    }
                    tauri_plugin_global_shortcut::ShortcutState::Released => {
                        stop_push_to_talk(app);
                    }
                })
                .build(),
        )
        .manage(app_state)
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                } else if window.label() == "floating-bar" {
                    api.prevent_close();
                }
            }
        })
        .setup(move |app| {
            create_main_window(app)?;
            crate::pipeline::init(app.handle().clone());
            crate::insertion::start_target_tracker();
            setup_tray(app)?;

            let shortcut_handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(250));
                match apply_registered_shortcut(&shortcut_handle) {
                    Ok(()) => println!("🎹 Global shortcut registered"),
                    Err(e) => eprintln!("⚠️ Could not register global shortcut: {e}"),
                }
            });

            ensure_floating_bar_window(app.handle()).map_err(|e| {
                eprintln!("❌ Failed to create floating bar window: {e}");
                e
            })?;

            crate::crash::show_if_pending(app.handle());

            let runtime_boot = runtime.clone();
            let models_boot = model_manager.clone();
            tauri::async_runtime::spawn_blocking(move || {
                let downloaded = {
                    let mgr = models_boot.lock().unwrap();
                    mgr.is_model_downloaded(PARAKEET_NAME)
                };
                if !downloaded {
                    println!("ℹ️ Parakeet model not downloaded yet — open Runtimes to install.");
                    return;
                }
                let path = {
                    let mgr = models_boot.lock().unwrap();
                    mgr.get_model_path(PARAKEET_NAME)
                };
                if let Some(path) = path {
                    crate::pipeline::log("nemo", format!("auto-start STT with {}", path));
                    let mut rt = runtime_boot.lock().unwrap();
                    if let Err(e) = rt.start_stt(std::path::Path::new(&path)) {
                        crate::pipeline::log("nemo", format!("auto-start FAILED: {e}"));
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_audio_devices,
            start_recording,
            stop_recording,
            is_recording,
            get_audio_level,
            list_models,
            get_model_info,
            download_model,
            get_download_progress,
            is_model_downloaded,
            load_model,
            is_model_loaded,
            transcribe_audio,
            set_transcription_language,
            save_transcription,
            list_transcriptions,
            get_transcription,
            delete_transcription,
            update_transcription,
            download_audio_file,
            get_audio_file_path,
            cleanup_orphaned_files,
            get_recordings_directory,
            insert_text,
            set_insertion_mode,
            get_insertion_mode,
            get_config,
            update_audio_config,
            update_runtime_config,
            update_selected_model,
            get_selected_model,
            update_ui_theme,
            update_ui_language,
            register_global_shortcut,
            unregister_global_shortcut,
            update_hotkey_config,
            create_floating_bar_window,
            save_overlay_position,
            get_overlay_layout,
            set_overlay_compact,
            set_overlay_style,
            resize_overlay,
            show_main_window,
            get_app_info,
            get_runtime_status,
            get_pipeline_logs,
            get_pipeline_log_path,
            overlay_start_dictation,
            overlay_stop_dictation,
            overlay_cancel_dictation,
            start_stt_runtime,
            ensure_stt_runtime,
            stop_stt_runtime,
            start_llm_runtime,
            list_llm_providers,
            rewrite_with_configured_llm,
            list_dictionary,
            add_dictionary_entry,
            remove_dictionary_entry,
            get_system_prompt,
            apply_correction,
            check_macos_permissions,
            request_macos_microphone,
            request_macos_accessibility,
            request_macos_input_monitoring,
            crate::crash::get_feedback_environment,
            crate::crash::get_pending_crash,
            crate::crash::clear_pending_crash,
            crate::crash::show_crash_reporter_window,
            crate::crash::report_frontend_crash,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn create_main_window(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let window_config = app
        .config()
        .app
        .windows
        .iter()
        .find(|window| window.label == "main")
        .cloned()
        .ok_or("missing main window config")?;

    let builder = tauri::WebviewWindowBuilder::from_config(app, &window_config)?;

    #[cfg(target_os = "macos")]
    let builder = builder.traffic_light_position(tauri::LogicalPosition::new(16.0, 16.0));

    builder.build()?;
    Ok(())
}

fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::image::Image;
    use tauri::menu::{MenuBuilder, MenuItemBuilder};
    use tauri::tray::TrayIconBuilder;

    let show = MenuItemBuilder::with_id("show", "Abrir Murmullo").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Salir").build(app)?;
    let menu = MenuBuilder::new(app).items(&[&show, &quit]).build()?;

    #[cfg(target_os = "macos")]
    let icon = Image::from_bytes(include_bytes!("../icons/tray-template-runtime.png"))?;
    #[cfg(not(target_os = "macos"))]
    let icon = Image::from_bytes(include_bytes!("../icons/tray-color-runtime.png"))?;

    TrayIconBuilder::new()
        .icon(icon)
        .icon_as_template(cfg!(target_os = "macos"))
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}
