use crate::audio::{AudioCapture, AudioDevice, AudioProcessor};
use crate::config::AppConfig;
use crate::dictionary::{DictionaryEntry, DictionaryStore};
use crate::models::{ModelInfo, ModelManager, PARAKEET_NAME};
use crate::postprocess::PostProcessor;
use crate::runtime::{self, RuntimeManager, RuntimeStatus};
use crate::transcription::persistence::{
    TranscriptionDatabase, TranscriptionPersistence, TranscriptionRecord,
};
use crate::transcription::processor::postprocess_transcription;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::str::FromStr;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{Emitter, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

static PTT_HELD: AtomicBool = AtomicBool::new(false);

pub struct AppState {
    pub model_manager: Arc<Mutex<ModelManager>>,
    pub runtime: Arc<Mutex<RuntimeManager>>,
    pub dictionary: Arc<Mutex<DictionaryStore>>,
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
    pub raw_text: String,
    pub duration_ms: u64,
    pub model_used: String,
    pub llm_used: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AudioLevel {
    pub level: f32,
    pub is_recording: bool,
}

#[tauri::command]
pub async fn get_app_info() -> Result<String, String> {
    Ok(format!(
        "Murmullo v{} — desktop dictation wrapper",
        env!("CARGO_PKG_VERSION")
    ))
}

#[tauri::command]
pub async fn get_runtime_status(state: State<'_, AppState>) -> Result<RuntimeStatus, String> {
    let runtime = state.runtime.lock().map_err(|e| e.to_string())?;
    let progress = state
        .model_manager
        .lock()
        .ok()
        .and_then(|m| m.get_download_progress(PARAKEET_NAME));
    Ok(runtime.status(progress))
}

#[tauri::command]
pub async fn start_stt_runtime(state: State<'_, AppState>) -> Result<RuntimeStatus, String> {
    let model_path = {
        let manager = state.model_manager.lock().map_err(|e| e.to_string())?;
        manager
            .get_model_path(PARAKEET_NAME)
            .ok_or_else(|| crate::codes::code("model.path_missing"))?
    };

    let ready_url = {
        let mut runtime = state.runtime.lock().map_err(|e| e.to_string())?;
        runtime
            .start_stt(std::path::Path::new(&model_path))
            .map_err(|e| e.to_string())?;
        format!("{}/ready", runtime.stt_base_url())
    };

    runtime::wait_http_ready(&ready_url, Duration::from_secs(90))
        .await
        .map_err(|e| e.to_string())?;

    get_runtime_status(state).await
}

#[tauri::command]
pub async fn ensure_stt_runtime(state: State<'_, AppState>) -> Result<RuntimeStatus, String> {
    let (runtime_dir, install, needs_bin) = {
        let rt = state.runtime.lock().map_err(|e| e.to_string())?;
        (
            rt.runtime_dir(),
            rt.install_handle(),
            rt.find_stt_binary().is_none(),
        )
    };

    if needs_bin {
        if let Err(e) = runtime::ensure_stt_binary(&runtime_dir, install.clone()).await {
            runtime::set_error(&install, &e.to_string());
            return Err(e.to_string());
        }
    }

    let model_ready = {
        let manager = state.model_manager.lock().map_err(|e| e.to_string())?;
        manager.is_model_downloaded(PARAKEET_NAME)
    };
    if !model_ready {
        runtime::set_progress(
            &install,
            "downloading_model",
            &crate::codes::code("status.downloadingModel"),
            Some(0.0),
        );
        let name = PARAKEET_NAME.to_string();
        let manager = {
            let mgr = state.model_manager.lock().map_err(|e| e.to_string())?;
            mgr.clone()
        };
        if let Err(e) = manager.download_model(&name).await {
            runtime::set_error(&install, &e.to_string());
            return Err(e.to_string());
        }
        let mut mgr = state.model_manager.lock().map_err(|e| e.to_string())?;
        mgr.mark_model_downloaded(&name);
    }

    runtime::set_progress(
        &install,
        "starting",
        &crate::codes::code("status.startingStt"),
        None,
    );

    let model_path = {
        let manager = state.model_manager.lock().map_err(|e| e.to_string())?;
        manager
            .get_model_path(PARAKEET_NAME)
            .ok_or_else(|| crate::codes::code("model.path_missing"))?
    };

    let ready_url = {
        let mut runtime = state.runtime.lock().map_err(|e| e.to_string())?;
        runtime
            .start_stt(std::path::Path::new(&model_path))
            .map_err(|e| {
                runtime::set_error(&install, &e.to_string());
                e.to_string()
            })?;
        format!("{}/ready", runtime.stt_base_url())
    };

    if let Err(e) = runtime::wait_http_ready(&ready_url, Duration::from_secs(90)).await {
        runtime::set_error(&install, &e.to_string());
        return Err(e.to_string());
    }

    runtime::clear_progress(&install);
    get_runtime_status(state).await
}

#[tauri::command]
pub async fn stop_stt_runtime(state: State<'_, AppState>) -> Result<RuntimeStatus, String> {
    {
        let mut runtime = state.runtime.lock().map_err(|e| e.to_string())?;
        runtime.stop_stt();
    }
    get_runtime_status(state).await
}

#[tauri::command]
pub async fn start_llm_runtime(state: State<'_, AppState>) -> Result<RuntimeStatus, String> {
    let wait_url = {
        let mut runtime = state.runtime.lock().map_err(|e| e.to_string())?;
        runtime.start_llm().map_err(|e| e.to_string())?;
        if runtime.llm_is_server() {
            Some(runtime.llm_tags_url())
        } else {
            None
        }
    };
    if let Some(url) = wait_url {
        let _ = runtime::wait_http_ready(&url, Duration::from_secs(20)).await;
    }
    get_runtime_status(state).await
}

#[tauri::command]
pub async fn list_audio_devices(state: State<'_, AppState>) -> Result<Vec<AudioDevice>, String> {
    let capture = state.audio_capture.lock().map_err(|e| e.to_string())?;
    capture.list_devices().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn start_recording(
    state: State<'_, AppState>,
    device_id: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let mut capture = state.audio_capture.lock().map_err(|e| e.to_string())?;
    capture
        .select_device(&device_id)
        .map_err(|e| e.to_string())?;
    capture.start_recording().map_err(|e| e.to_string())?;
    let _ = app_handle.emit(
        "recording-state-changed",
        serde_json::json!({ "state": "recording" }),
    );
    Ok(())
}

#[tauri::command]
pub async fn stop_recording(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<Vec<f32>, String> {
    let mut capture = state.audio_capture.lock().map_err(|e| e.to_string())?;
    let audio_data = capture.stop_recording().map_err(|e| e.to_string())?;
    let _ = app_handle.emit(
        "recording-state-changed",
        serde_json::json!({ "state": "processing" }),
    );
    Ok(audio_data)
}

#[tauri::command]
pub async fn is_recording(state: State<'_, AppState>) -> Result<bool, String> {
    let capture = state.audio_capture.lock().map_err(|e| e.to_string())?;
    Ok(capture.is_recording())
}

#[tauri::command]
pub async fn get_audio_level(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<AudioLevel, String> {
    let capture = state.audio_capture.lock().map_err(|e| e.to_string())?;
    let level = capture.get_audio_level();
    let recording = capture.is_recording();
    if recording {
        let _ = app_handle.emit("audio-level-updated", serde_json::json!({ "level": level }));
    }
    Ok(AudioLevel {
        level,
        is_recording: recording,
    })
}

#[tauri::command]
pub async fn list_models(state: State<'_, AppState>) -> Result<Vec<ModelInfo>, String> {
    let model_manager = state.model_manager.lock().map_err(|e| e.to_string())?;
    Ok(model_manager.list_models())
}

#[tauri::command]
pub async fn get_model_info(
    model_name: String,
    state: State<'_, AppState>,
) -> Result<Option<ModelInfo>, String> {
    let model_manager = state.model_manager.lock().map_err(|e| e.to_string())?;
    Ok(model_manager.get_model(&model_name).cloned())
}

#[tauri::command]
pub async fn download_model(state: State<'_, AppState>, model_name: String) -> Result<(), String> {
    let name = if model_name.is_empty() {
        PARAKEET_NAME.to_string()
    } else {
        model_name
    };
    let manager = {
        let mgr = state.model_manager.lock().map_err(|e| e.to_string())?;
        mgr.clone()
    };
    manager
        .download_model(&name)
        .await
        .map_err(|e| e.to_string())?;
    let mut mgr = state.model_manager.lock().map_err(|e| e.to_string())?;
    mgr.mark_model_downloaded(&name);
    Ok(())
}

#[tauri::command]
pub async fn get_download_progress(
    state: State<'_, AppState>,
    model_name: String,
) -> Result<f32, String> {
    let name = if model_name.is_empty() {
        PARAKEET_NAME.to_string()
    } else {
        model_name
    };
    let manager = state.model_manager.lock().map_err(|e| e.to_string())?;
    Ok(manager.get_download_progress(&name).unwrap_or(0.0))
}

#[tauri::command]
pub async fn is_model_downloaded(
    state: State<'_, AppState>,
    model_name: String,
) -> Result<bool, String> {
    let manager = state.model_manager.lock().map_err(|e| e.to_string())?;
    Ok(manager.is_model_downloaded(&model_name))
}

#[tauri::command]
pub async fn load_model(state: State<'_, AppState>, model_name: String) -> Result<(), String> {
    let name = if model_name.is_empty() {
        PARAKEET_NAME.to_string()
    } else {
        model_name
    };
    let model_path = {
        let mut manager = state.model_manager.lock().map_err(|e| e.to_string())?;
        if !manager.is_model_downloaded(&name) {
            return Err(crate::codes::code_json(
                "model.not_downloaded",
                serde_json::json!({ "model": name }),
            ));
        }
        manager.load_model(&name).map_err(|e| e.to_string())?;
        manager
            .get_model_path(&name)
            .ok_or_else(|| crate::codes::code("model.path_missing"))?
    };
    let ready_url = {
        let mut runtime = state.runtime.lock().map_err(|e| e.to_string())?;
        runtime
            .start_stt(std::path::Path::new(&model_path))
            .map_err(|e| e.to_string())?;
        format!("{}/ready", runtime.stt_base_url())
    };
    runtime::wait_http_ready(&ready_url, Duration::from_secs(90))
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn is_model_loaded(
    state: State<'_, AppState>,
    _model_name: String,
) -> Result<bool, String> {
    let runtime = state.runtime.lock().map_err(|e| e.to_string())?;
    Ok(runtime.status(None).stt_server.state == "running")
}

pub fn start_push_to_talk(app: &tauri::AppHandle) {
    if PTT_HELD.swap(true, Ordering::SeqCst) {
        return;
    }

    unhide_floating_bar(app);
    crate::pipeline::log("ptt", "hotkey pressed — starting capture");
    if let Err(e) = begin_recording(app) {
        PTT_HELD.store(false, Ordering::SeqCst);
        crate::pipeline::log("ptt", format!("start FAILED: {e}"));
        let _ = app.emit(
            "recording-state-changed",
            serde_json::json!({ "state": "error", "message": e }),
        );
        let _ = app.emit("error-occurred", serde_json::json!({ "message": e }));
    }
}

pub fn stop_push_to_talk(app: &tauri::AppHandle) {
    if !PTT_HELD.swap(false, Ordering::SeqCst) {
        return;
    }

    crate::pipeline::log("ptt", "hotkey released — stopping capture");
    finish_recording(app, true);
}

#[tauri::command]
pub fn overlay_start_dictation(app: tauri::AppHandle) -> Result<(), String> {
    crate::pipeline::log("ptt", "overlay: start");
    start_push_to_talk(&app);
    Ok(())
}

#[tauri::command]
pub fn overlay_stop_dictation(app: tauri::AppHandle) {
    crate::pipeline::log("ptt", "overlay: stop + transcribe");
    PTT_HELD.store(true, Ordering::SeqCst);
    stop_push_to_talk(&app);
}

#[tauri::command]
pub fn overlay_cancel_dictation(app: tauri::AppHandle) {
    crate::pipeline::log("ptt", "overlay: cancel");
    PTT_HELD.store(false, Ordering::SeqCst);
    finish_recording(&app, false);
}

fn finish_recording(app: &tauri::AppHandle, transcribe: bool) {
    let audio_data = {
        let state = app.state::<AppState>();
        let mut capture = match state.audio_capture.lock() {
            Ok(guard) => guard,
            Err(_e) => {
                emit_dictation_error(app, crate::codes::code("audio.mic_access"));
                return;
            }
        };
        if !capture.is_recording() {
            crate::pipeline::log("ptt", "finish ignored — not recording");
            let _ = app.emit(
                "recording-state-changed",
                serde_json::json!({ "state": "idle" }),
            );
            return;
        }
        match capture.stop_recording() {
            Ok(data) => data,
            Err(e) => {
                drop(capture);
                emit_dictation_error(app, e.to_string());
                return;
            }
        }
    };

    if !transcribe {
        crate::pipeline::log("ptt", "recording discarded");
        let _ = app.emit(
            "recording-state-changed",
            serde_json::json!({ "state": "idle" }),
        );
        return;
    }

    emit_processing(app, &crate::codes::code("status.sendingStt"));

    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = run_transcription(app.clone(), audio_data).await {
            emit_dictation_error(&app, e);
        }
    });
}

fn begin_recording(app: &tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    let mut capture = state.audio_capture.lock().map_err(|e| e.to_string())?;
    if capture.is_recording() {
        return Ok(());
    }

    let devices = capture.list_devices().map_err(|e| e.to_string())?;
    let device_id = devices
        .iter()
        .find(|d| d.id == "default")
        .or_else(|| devices.first())
        .map(|d| d.id.clone())
        .ok_or_else(|| crate::codes::code("audio.no_device"))?;

    capture
        .select_device(&device_id)
        .map_err(|e| e.to_string())?;
    capture.start_recording().map_err(|e| e.to_string())?;
    drop(capture);
    crate::insertion::remember_frontmost_target();

    let _ = app.emit(
        "recording-state-changed",
        serde_json::json!({ "state": "recording" }),
    );
    spawn_level_monitor(app.clone());
    crate::pipeline::log("ptt", format!("recording started on {device_id}"));
    Ok(())
}

fn spawn_level_monitor(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_millis(50)).await;
            let level = {
                let state = app.state::<AppState>();
                let Ok(capture) = state.audio_capture.lock() else {
                    return;
                };
                if !capture.is_recording() {
                    None
                } else {
                    Some(capture.get_audio_level())
                }
            };
            let Some(level) = level else {
                break;
            };
            let payload = serde_json::json!({ "level": level });
            let _ = app.emit("audio-level-updated", &payload);
            if let Some(win) = app.get_webview_window("floating-bar") {
                let _ = win.emit("audio-level-updated", &payload);
            }
        }
    });
}

fn emit_processing(app: &tauri::AppHandle, message: &str) {
    crate::pipeline::log("ptt", message);
    let _ = app.emit(
        "recording-state-changed",
        serde_json::json!({ "state": "processing", "message": message }),
    );
}

fn emit_dictation_error(app: &tauri::AppHandle, message: String) {
    crate::pipeline::log("ptt", format!("error: {message}"));
    let _ = app.emit(
        "recording-state-changed",
        serde_json::json!({ "state": "error", "message": message }),
    );
    let _ = app.emit("error-occurred", serde_json::json!({ "message": message }));
}

#[tauri::command]
pub fn get_pipeline_logs() -> Vec<crate::pipeline::PipelineLogEntry> {
    crate::pipeline::recent()
}

#[tauri::command]
pub fn get_pipeline_log_path() -> String {
    crate::pipeline::log_path().display().to_string()
}

#[tauri::command]
pub async fn transcribe_audio(
    audio_data: Vec<f32>,
    app_handle: tauri::AppHandle,
) -> Result<TranscriptionResult, String> {
    run_transcription(app_handle, audio_data).await
}

async fn run_transcription(
    app_handle: tauri::AppHandle,
    audio_data: Vec<f32>,
) -> Result<TranscriptionResult, String> {
    let state = app_handle.state::<AppState>();
    if audio_data.is_empty() {
        return Err(crate::codes::code("audio.empty"));
    }

    let duration_seconds = audio_data.len() as f32 / 16000.0;
    crate::pipeline::log(
        "ptt",
        format!(
            "transcription start samples={} duration={:.2}s",
            audio_data.len(),
            duration_seconds
        ),
    );

    {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        let mut audio_processor = state.audio_processor.lock().map_err(|e| e.to_string())?;
        audio_processor.update_config(config.audio.clone());
        if let Err(reason) = audio_processor.has_sufficient_speech(&audio_data) {
            let _ = app_handle.emit(
                "recording-state-changed",
                serde_json::json!({ "state": "error", "message": reason }),
            );
            let _ = app_handle.emit("error-occurred", serde_json::json!({ "message": reason }));
            return Err(reason);
        }
    }

    let (stt_url, stt_ready, model_ok) = {
        let runtime = state.runtime.lock().map_err(|e| e.to_string())?;
        (
            runtime.stt_base_url(),
            runtime.stt_is_ready_blocking(),
            runtime.parakeet_path().exists(),
        )
    };
    crate::pipeline::log(
        "stt",
        format!("ready check GET {stt_url}/ready => {stt_ready} parakeet={model_ok}"),
    );
    if !stt_ready || !model_ok {
        let reason = crate::codes::code("runtime.not_ready");
        let _ = app_handle.emit("error-occurred", serde_json::json!({ "message": reason }));
        return Err(reason);
    }

    emit_processing(&app_handle, &crate::codes::code("status.preparingAudio"));
    let processed_audio = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        let mut audio_processor = state.audio_processor.lock().map_err(|e| e.to_string())?;
        audio_processor.update_config(config.audio.clone());
        audio_processor.process_audio(audio_data.clone())
    };
    if processed_audio.is_empty() {
        return Err(crate::codes::code("audio.silence_only"));
    }

    let language = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        config.runtime.default_language.clone()
    };
    {
        let mut runtime = state.runtime.lock().map_err(|e| e.to_string())?;
        runtime.set_language(language.clone());
    }

    emit_processing(
        &app_handle,
        &format!("POST {stt_url}/v1/audio/transcriptions"),
    );
    let raw = transcribe_with_runtime(&state, &processed_audio).await?;
    let raw = postprocess_transcription(raw);
    if raw.is_empty() {
        let reason = crate::codes::code("runtime.stt_empty");
        let _ = app_handle.emit("error-occurred", serde_json::json!({ "message": reason }));
        return Err(reason);
    }

    let llm_enabled = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        config.runtime.llm_enabled
    };

    if llm_enabled {
        emit_processing(&app_handle, &crate::codes::code("status.llmRewrite"));
    } else {
        emit_processing(&app_handle, &crate::codes::code("status.dictionary"));
    }

    let (final_text, llm_used) = postprocess_with_state(&state, &raw, llm_enabled).await?;
    crate::pipeline::log(
        "ptt",
        format!(
            "final text chars={} llm_used={llm_used} preview=\"{}\"",
            final_text.len(),
            final_text.chars().take(80).collect::<String>()
        ),
    );

    let insert_mode = {
        state
            .insertion_mode
            .lock()
            .map_err(|e| e.to_string())?
            .clone()
    };
    crate::insertion::paste_dictation(&app_handle, &final_text, &insert_mode);

    let duration_ms = (duration_seconds * 1000.0) as u64;
    let model_used = PARAKEET_NAME.to_string();

    let _ = app_handle.emit(
        "transcription-completed",
        serde_json::json!({
            "text": final_text.clone(),
            "duration_ms": duration_ms,
            "model_used": model_used.clone()
        }),
    );
    let _ = app_handle.emit(
        "recording-state-changed",
        serde_json::json!({ "state": "done" }),
    );

    {
        let persistence = state
            .transcription_persistence
            .lock()
            .map_err(|e| e.to_string())?;
        let mut database = state
            .transcription_database
            .lock()
            .map_err(|e| e.to_string())?;
        match persistence.add_transcription_with_raw(
            &mut database,
            final_text.clone(),
            Some(raw.clone()),
            audio_data,
            model_used.clone(),
            language,
            HashMap::new(),
        ) {
            Ok(id) => {
                let _ = persistence.save_database(&database);
                crate::pipeline::log("ptt", format!("saved history id={id}"));
                let _ = app_handle.emit(
                    "transcription-saved",
                    serde_json::json!({ "id": id, "text": final_text.clone() }),
                );
            }
            Err(e) => crate::pipeline::log("ptt", format!("history save failed: {e}")),
        }
    }

    crate::pipeline::log("ptt", "dictation complete");

    Ok(TranscriptionResult {
        text: final_text,
        raw_text: raw,
        duration_ms,
        model_used,
        llm_used,
    })
}

async fn transcribe_with_runtime(state: &AppState, audio: &[f32]) -> Result<String, String> {
    let (base_url, language) = {
        let runtime = state.runtime.lock().map_err(|e| e.to_string())?;
        (runtime.stt_base_url(), runtime.language())
    };
    crate::transcription::engine::transcribe_samples(&base_url, audio, 16000, language)
        .await
        .map_err(|e| e.to_string())
}

async fn postprocess_with_state(
    state: &AppState,
    raw: &str,
    llm_enabled: bool,
) -> Result<(String, bool), String> {
    let (prompt, with_dict) = {
        let dict = state.dictionary.lock().map_err(|e| e.to_string())?;
        (dict.system_prompt(), dict.apply_replacements(raw))
    };
    if !llm_enabled {
        let dict = state.dictionary.lock().map_err(|e| e.to_string())?;
        return Ok(PostProcessor::run(raw, &dict, None));
    }
    let (llm_provider, llm_url, llm_model) = {
        let cfg = state.config.lock().map_err(|e| e.to_string())?;
        (
            cfg.runtime.llm_provider.clone(),
            cfg.runtime.llm_url.clone(),
            cfg.runtime.llm_model.clone(),
        )
    };
    if !crate::llm::provider_has_model(&llm_provider, &llm_url, &llm_model).await {
        crate::pipeline::log(
            "llm",
            format!(
                "skip rewrite: {llm_model} not ready on {llm_provider} — pasting STT+dictionary"
            ),
        );
        let dict = state.dictionary.lock().map_err(|e| e.to_string())?;
        return Ok(PostProcessor::run(raw, &dict, None));
    }
    let llm_rewrite = crate::llm::rewrite(&llm_provider, &llm_url, &llm_model, &prompt, &with_dict)
        .await
        .ok();
    let dict = state.dictionary.lock().map_err(|e| e.to_string())?;
    Ok(PostProcessor::run(raw, &dict, llm_rewrite))
}

#[tauri::command]
pub async fn set_transcription_language(
    state: State<'_, AppState>,
    language: Option<String>,
) -> Result<(), String> {
    {
        let mut runtime = state.runtime.lock().map_err(|e| e.to_string())?;
        runtime.set_language(language.clone());
    }
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    config.runtime.default_language = language.filter(|l| l != "auto");
    config.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn insert_text(
    text: String,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mode = state
        .insertion_mode
        .lock()
        .map_err(|e| e.to_string())?
        .clone();
    crate::insertion::paste_dictation(&app_handle, &text, &mode);
    Ok(())
}

#[tauri::command]
pub async fn set_insertion_mode(state: State<'_, AppState>, mode: String) -> Result<(), String> {
    *state.insertion_mode.lock().map_err(|e| e.to_string())? = mode;
    Ok(())
}

#[tauri::command]
pub async fn get_insertion_mode(state: State<'_, AppState>) -> Result<String, String> {
    Ok(state
        .insertion_mode
        .lock()
        .map_err(|e| e.to_string())?
        .clone())
}

#[tauri::command]
pub async fn get_config(state: State<'_, AppState>) -> Result<AppConfig, String> {
    Ok(state.config.lock().map_err(|e| e.to_string())?.clone())
}

#[tauri::command]
pub async fn update_audio_config(
    noise_reduction: bool,
    normalization: bool,
    silence_threshold: f32,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    config.update_audio_config(noise_reduction, normalization, silence_threshold);
    config.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_runtime_config(
    llm_enabled: bool,
    llm_provider: Option<String>,
    llm_model: String,
    default_language: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let provider = llm_provider.unwrap_or_else(|| "ollama".into());
    let (provider, url, model) = {
        let mut config = state.config.lock().map_err(|e| e.to_string())?;
        config.update_runtime_config(
            llm_enabled,
            provider.clone(),
            llm_model.clone(),
            default_language,
        );
        config.save().map_err(|e| e.to_string())?;
        (
            config.runtime.llm_provider.clone(),
            config.runtime.llm_url.clone(),
            config.runtime.llm_model.clone(),
        )
    };
    {
        let mut runtime = state.runtime.lock().map_err(|e| e.to_string())?;
        runtime.set_llm_config(provider, url, model);
    }
    Ok(())
}

#[tauri::command]
pub async fn list_llm_providers(
    state: State<'_, AppState>,
) -> Result<Vec<crate::llm::LlmProviderInfo>, String> {
    let llm_url = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        config.runtime.llm_url.clone()
    };
    Ok(crate::llm::list_providers(&llm_url))
}

#[tauri::command]
pub async fn rewrite_with_configured_llm(
    system_prompt: String,
    user_text: String,
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    let (enabled, provider, llm_url, llm_model) = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        (
            config.runtime.llm_enabled,
            config.runtime.llm_provider.clone(),
            config.runtime.llm_url.clone(),
            config.runtime.llm_model.clone(),
        )
    };
    if !enabled {
        return Ok(None);
    }
    if !crate::llm::provider_has_model(&provider, &llm_url, &llm_model).await {
        return Ok(None);
    }
    Ok(
        crate::llm::rewrite(&provider, &llm_url, &llm_model, &system_prompt, &user_text)
            .await
            .ok(),
    )
}

#[tauri::command]
pub async fn update_selected_model(
    model_name: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    config.update_selected_model(model_name);
    config.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_ui_theme(
    theme: String,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    match theme.as_str() {
        "light" | "dark" | "system" => {}
        _ => return Err(crate::codes::code("theme.invalid")),
    }

    {
        let mut config = state.config.lock().map_err(|e| e.to_string())?;
        config.update_theme(theme.clone());
        config.save().map_err(|e| e.to_string())?;
    }

    let _ = app_handle.emit("theme-updated", theme);
    Ok(())
}

#[tauri::command]
pub async fn update_ui_language(
    language: String,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    match language.as_str() {
        "es" | "en" => {}
        _ => return Err(crate::codes::code("locale.invalid")),
    }

    {
        let mut config = state.config.lock().map_err(|e| e.to_string())?;
        config.update_language(language.clone());
        config.save().map_err(|e| e.to_string())?;
    }

    let _ = app_handle.emit("language-updated", language);
    Ok(())
}

#[tauri::command]
pub async fn get_selected_model(state: State<'_, AppState>) -> Result<Option<String>, String> {
    Ok(state
        .config
        .lock()
        .map_err(|e| e.to_string())?
        .get_selected_model())
}

#[tauri::command]
pub async fn list_dictionary(state: State<'_, AppState>) -> Result<Vec<DictionaryEntry>, String> {
    Ok(state.dictionary.lock().map_err(|e| e.to_string())?.list())
}

#[tauri::command]
pub async fn add_dictionary_entry(
    term: String,
    replacement: String,
    language: Option<String>,
    origin: Option<String>,
    state: State<'_, AppState>,
) -> Result<DictionaryEntry, String> {
    state
        .dictionary
        .lock()
        .map_err(|e| e.to_string())?
        .add(
            term,
            replacement,
            language,
            origin.as_deref().unwrap_or("manual"),
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_dictionary_entry(
    id: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    state
        .dictionary
        .lock()
        .map_err(|e| e.to_string())?
        .remove(&id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_system_prompt(state: State<'_, AppState>) -> Result<String, String> {
    Ok(state
        .dictionary
        .lock()
        .map_err(|e| e.to_string())?
        .system_prompt())
}

#[tauri::command]
pub async fn apply_correction(
    term: String,
    replacement: String,
    state: State<'_, AppState>,
) -> Result<DictionaryEntry, String> {
    state
        .dictionary
        .lock()
        .map_err(|e| e.to_string())?
        .add(term, replacement, None, "from_correction")
        .map_err(|e| e.to_string())
}

fn parse_ptt_shortcut(binding: &str) -> Result<Shortcut, String> {
    let binding = binding.trim();
    if binding.is_empty() {
        return Err(crate::codes::code("hotkey.empty"));
    }

    let shortcut = Shortcut::from_str(binding).map_err(|_| crate::codes::code("hotkey.invalid"))?;

    if shortcut.mods.is_empty() {
        return Err(crate::codes::code("hotkey.needs_modifier"));
    }

    Ok(shortcut)
}

pub fn apply_registered_shortcut(app: &tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    let (enabled, binding, toggle) = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        (
            config.hotkeys.enabled,
            config.hotkeys.push_to_talk.clone(),
            config.hotkeys.toggle_recording.clone(),
        )
    };

    if let Err(e) = app.global_shortcut().unregister_all() {
        eprintln!("⚠️ unregister_all: {e}");
    }

    if !enabled {
        return Ok(());
    }

    if !toggle.is_empty() && toggle.eq_ignore_ascii_case(&binding) {
        return Err(crate::codes::code("hotkey.conflict"));
    }

    let shortcut = parse_ptt_shortcut(&binding)?;
    app.global_shortcut()
        .register(shortcut)
        .map_err(|_| crate::codes::code("hotkey.register_failed"))?;
    Ok(())
}

#[tauri::command]
pub async fn register_global_shortcut(app_handle: tauri::AppHandle) -> Result<(), String> {
    apply_registered_shortcut(&app_handle)
}

#[tauri::command]
pub async fn unregister_global_shortcut(app_handle: tauri::AppHandle) -> Result<(), String> {
    app_handle
        .global_shortcut()
        .unregister_all()
        .map_err(|e| format!("Failed to unregister hotkey: {e}"))
}

#[tauri::command]
pub async fn update_hotkey_config(
    push_to_talk: String,
    enabled: Option<bool>,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let previous = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        (config.hotkeys.push_to_talk.clone(), config.hotkeys.enabled)
    };

    parse_ptt_shortcut(&push_to_talk)?;

    {
        let mut config = state.config.lock().map_err(|e| e.to_string())?;
        if !config.hotkeys.toggle_recording.is_empty()
            && config
                .hotkeys
                .toggle_recording
                .eq_ignore_ascii_case(push_to_talk.trim())
        {
            return Err(crate::codes::code("hotkey.conflict"));
        }
        config.update_hotkey_config(push_to_talk.trim().to_string(), enabled);
        config.save().map_err(|e| e.to_string())?;
    }

    match apply_registered_shortcut(&app_handle) {
        Ok(()) => {
            let _ = app_handle.emit(
                "hotkeys-updated",
                serde_json::json!({ "push_to_talk": push_to_talk.trim() }),
            );
            Ok(())
        }
        Err(e) => {
            {
                let mut config = state.config.lock().map_err(|err| err.to_string())?;
                config.update_hotkey_config(previous.0, Some(previous.1));
                config.save().map_err(|err| err.to_string())?;
            }
            let _ = apply_registered_shortcut(&app_handle);
            Err(e)
        }
    }
}

const FLOATING_BAR_LABEL: &str = "floating-bar";
const FLOATING_BAR_WIDTH: f64 = 560.0;
const FLOATING_BAR_HEIGHT: f64 = 168.0;
const FLOATING_BAR_BOTTOM_MARGIN: f64 = 24.0;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OverlayLayout {
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub compact: bool,
    pub style: String,
}

fn floating_bar_anchor(app: &tauri::AppHandle) -> Result<(f64, f64), String> {
    let monitor = app
        .primary_monitor()
        .map_err(|e| format!("primary monitor: {e}"))?
        .ok_or_else(|| "No primary monitor available".to_string())?;
    let scale = monitor.scale_factor();
    if scale <= 0.0 {
        return Err("Invalid monitor scale factor".into());
    }
    let work = monitor.work_area();
    let origin = work.position.to_logical::<f64>(scale);
    let area = work.size.to_logical::<f64>(scale);
    let x = origin.x + ((area.width - FLOATING_BAR_WIDTH) / 2.0).max(0.0);
    let y = origin.y + (area.height - FLOATING_BAR_HEIGHT - FLOATING_BAR_BOTTOM_MARGIN).max(0.0);
    Ok((x, y))
}

fn overlay_saved_position(app: &tauri::AppHandle) -> Option<(f64, f64)> {
    let state = app.state::<AppState>();
    let config = state.config.lock().ok()?;
    match (config.ui.overlay_x, config.ui.overlay_y) {
        (Some(x), Some(y)) if x.is_finite() && y.is_finite() => Some((x, y)),
        _ => None,
    }
}

fn point_in_any_work_area(app: &tauri::AppHandle, x: f64, y: f64) -> bool {
    let Ok(monitors) = app.available_monitors() else {
        return false;
    };
    for monitor in monitors {
        let scale = monitor.scale_factor();
        if scale <= 0.0 {
            continue;
        }
        let work = monitor.work_area();
        let origin = work.position.to_logical::<f64>(scale);
        let area = work.size.to_logical::<f64>(scale);
        if x >= origin.x && y >= origin.y && x < origin.x + area.width && y < origin.y + area.height
        {
            return true;
        }
    }
    false
}

/// Restore a saved overlay origin when it still sits on a monitor.
/// Otherwise use bottom-center once and persist it so later shows do not re-anchor.
fn resolve_overlay_position(app: &tauri::AppHandle) -> Result<(f64, f64, bool), String> {
    if let Some((x, y)) = overlay_saved_position(app) {
        if point_in_any_work_area(app, x, y) {
            return Ok((x, y, false));
        }
    }
    let (x, y) = floating_bar_anchor(app)?;
    Ok((x, y, true))
}

fn persist_overlay_position(app: &tauri::AppHandle, x: f64, y: f64) -> Result<(), String> {
    let state = app.state::<AppState>();
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    config.update_overlay_position(x, y);
    config.save().map_err(|e| e.to_string())?;
    Ok(())
}

fn show_floating_bar(win: &tauri::WebviewWindow) -> Result<(), String> {
    let (x, y, persist) = resolve_overlay_position(win.app_handle())?;
    win.set_position(tauri::LogicalPosition::new(x, y))
        .map_err(|e| format!("set overlay position: {e}"))?;
    if persist {
        persist_overlay_position(win.app_handle(), x, y)?;
    }
    win.set_always_on_top(true)
        .map_err(|e| format!("set overlay always-on-top: {e}"))?;
    let _ = win.set_skip_taskbar(true);
    win.show().map_err(|e| format!("show overlay: {e}"))?;
    Ok(())
}

/// Inverse of overlay Salir (`win.hide()`): reveal the existing window
/// without recreating it or changing its saved position.
fn unhide_floating_bar(app: &tauri::AppHandle) {
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || {
        let Some(win) = handle.get_webview_window(FLOATING_BAR_LABEL) else {
            return;
        };
        if win.is_visible().unwrap_or(false) {
            return;
        }
        if let Err(e) = win.show() {
            eprintln!("⚠️ Could not show floating bar: {e}");
        }
    });
}

/// Create or reveal the isolated overlay on the calling thread.
/// Must run on the main thread on macOS.
pub fn ensure_floating_bar_window(app_handle: &tauri::AppHandle) -> Result<(), String> {
    if let Some(win) = app_handle.get_webview_window(FLOATING_BAR_LABEL) {
        show_floating_bar(&win)?;
        println!("✅ Floating bar overlay shown");
        return Ok(());
    }

    let (x, y, _) = resolve_overlay_position(app_handle)?;
    let win = tauri::WebviewWindowBuilder::new(
        app_handle,
        FLOATING_BAR_LABEL,
        tauri::WebviewUrl::App("floating-bar.html".into()),
    )
    .title("Murmullo Voice Dictation Bar")
    .decorations(false)
    .shadow(false)
    .transparent(true)
    .resizable(false)
    .always_on_top(true)
    .visible_on_all_workspaces(true)
    .skip_taskbar(true)
    .accept_first_mouse(true)
    .focused(false)
    .visible(true)
    .inner_size(FLOATING_BAR_WIDTH, FLOATING_BAR_HEIGHT)
    .position(x, y)
    .prevent_overflow()
    .user_agent("MurmulloFloatingBar/1.0")
    .initialization_script(crate::crash::FRONTEND_CAPTURE_SCRIPT)
    .build()
    .map_err(|e| format!("create overlay window: {e}"))?;

    show_floating_bar(&win)?;
    println!("✅ Floating bar overlay created");
    Ok(())
}

#[tauri::command]
pub async fn create_floating_bar_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    ensure_floating_bar_window(&app_handle)
}

#[tauri::command]
pub async fn save_overlay_position(
    x: f64,
    y: f64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if !x.is_finite() || !y.is_finite() {
        return Err(crate::codes::code("overlay.invalid_position"));
    }
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    config.update_overlay_position(x, y);
    config.save().map_err(|e| e.to_string())?;
    Ok(())
}

fn current_overlay_layout(config: &AppConfig) -> OverlayLayout {
    OverlayLayout {
        x: config.ui.overlay_x,
        y: config.ui.overlay_y,
        compact: config.ui.overlay_compact,
        style: crate::config::normalize_overlay_style(&config.ui.overlay_style),
    }
}

fn emit_overlay_layout(app_handle: &tauri::AppHandle, layout: &OverlayLayout) {
    let _ = app_handle.emit("overlay-layout-updated", layout);
}

#[tauri::command]
pub async fn get_overlay_layout(state: State<'_, AppState>) -> Result<OverlayLayout, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    Ok(current_overlay_layout(&config))
}

#[tauri::command]
pub async fn set_overlay_compact(
    compact: bool,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let layout = {
        let mut config = state.config.lock().map_err(|e| e.to_string())?;
        config.update_overlay_compact(compact);
        config.save().map_err(|e| e.to_string())?;
        current_overlay_layout(&config)
    };
    emit_overlay_layout(&app_handle, &layout);
    Ok(())
}

#[tauri::command]
pub async fn set_overlay_style(
    style: String,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<OverlayLayout, String> {
    match style.as_str() {
        "pill" | "island" | "card" => {}
        _ => return Err(crate::codes::code("overlay.invalid_style")),
    }

    let layout = {
        let mut config = state.config.lock().map_err(|e| e.to_string())?;
        config.update_overlay_style(style);
        config.save().map_err(|e| e.to_string())?;
        current_overlay_layout(&config)
    };
    emit_overlay_layout(&app_handle, &layout);
    Ok(layout)
}

#[tauri::command]
pub async fn resize_overlay(
    width: f64,
    height: f64,
    x: Option<f64>,
    y: Option<f64>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    if !width.is_finite() || !height.is_finite() || width <= 0.0 || height <= 0.0 {
        return Err(crate::codes::code("overlay.invalid_size"));
    }
    if matches!(x, Some(v) if !v.is_finite()) || matches!(y, Some(v) if !v.is_finite()) {
        return Err(crate::codes::code("overlay.invalid_position"));
    }
    let win = app_handle
        .get_webview_window(FLOATING_BAR_LABEL)
        .ok_or_else(|| crate::codes::code("overlay.unavailable"))?;

    if x.is_none() && y.is_none() {
        win.set_size(tauri::LogicalSize::new(width, height))
            .map_err(|e| format!("set overlay size: {e}"))?;
        return Ok(());
    }

    let scale = win.scale_factor().unwrap_or(1.0);
    let scale = if scale > 0.0 { scale } else { 1.0 };
    let current = win.outer_position().ok();
    let current_x = current
        .as_ref()
        .map(|position| position.x as f64 / scale)
        .unwrap_or(0.0);
    let current_y = current
        .as_ref()
        .map(|position| position.y as f64 / scale)
        .unwrap_or(0.0);
    let next_x = x.unwrap_or(current_x);
    let next_y = y.unwrap_or(current_y);
    let moving_up = next_y < current_y - 0.5;

    if moving_up {
        win.set_position(tauri::LogicalPosition::new(next_x, next_y))
            .map_err(|e| format!("set overlay position: {e}"))?;
        win.set_size(tauri::LogicalSize::new(width, height))
            .map_err(|e| format!("set overlay size: {e}"))?;
    } else {
        win.set_size(tauri::LogicalSize::new(width, height))
            .map_err(|e| format!("set overlay size: {e}"))?;
        win.set_position(tauri::LogicalPosition::new(next_x, next_y))
            .map_err(|e| format!("set overlay position: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn show_main_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(win) = app_handle.get_webview_window("main") {
        win.show().map_err(|e| e.to_string())?;
        win.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn save_transcription(
    state: State<'_, AppState>,
    text: String,
    audio_data: Vec<f32>,
    model_used: String,
    language: Option<String>,
    metadata: HashMap<String, String>,
) -> Result<String, String> {
    let persistence = state
        .transcription_persistence
        .lock()
        .map_err(|e| e.to_string())?;
    let mut database = state
        .transcription_database
        .lock()
        .map_err(|e| e.to_string())?;
    let id = persistence
        .add_transcription(
            &mut database,
            text,
            audio_data,
            model_used,
            language,
            metadata,
        )
        .map_err(|e| e.to_string())?;
    persistence
        .save_database(&database)
        .map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command]
pub async fn list_transcriptions(
    state: State<'_, AppState>,
) -> Result<Vec<TranscriptionRecord>, String> {
    let persistence = state
        .transcription_persistence
        .lock()
        .map_err(|e| e.to_string())?;
    let database = state
        .transcription_database
        .lock()
        .map_err(|e| e.to_string())?;
    Ok(persistence
        .list_transcriptions(&database)
        .into_iter()
        .cloned()
        .collect())
}

#[tauri::command]
pub async fn get_transcription(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<TranscriptionRecord>, String> {
    let persistence = state
        .transcription_persistence
        .lock()
        .map_err(|e| e.to_string())?;
    let database = state
        .transcription_database
        .lock()
        .map_err(|e| e.to_string())?;
    Ok(persistence.get_transcription(&database, &id).cloned())
}

#[tauri::command]
pub async fn delete_transcription(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let persistence = state
        .transcription_persistence
        .lock()
        .map_err(|e| e.to_string())?;
    let mut database = state
        .transcription_database
        .lock()
        .map_err(|e| e.to_string())?;
    let deleted = persistence
        .delete_transcription(&mut database, &id)
        .map_err(|e| e.to_string())?;
    if deleted {
        persistence
            .save_database(&database)
            .map_err(|e| e.to_string())?;
    }
    Ok(deleted)
}

#[tauri::command]
pub async fn update_transcription(
    state: State<'_, AppState>,
    id: String,
    text: Option<String>,
    metadata: Option<HashMap<String, String>>,
) -> Result<bool, String> {
    let persistence = state
        .transcription_persistence
        .lock()
        .map_err(|e| e.to_string())?;
    let mut database = state
        .transcription_database
        .lock()
        .map_err(|e| e.to_string())?;
    let updated = persistence
        .update_transcription(&mut database, &id, text, metadata)
        .map_err(|e| e.to_string())?;
    if updated {
        persistence
            .save_database(&database)
            .map_err(|e| e.to_string())?;
    }
    Ok(updated)
}

#[tauri::command]
pub async fn download_audio_file(
    state: State<'_, AppState>,
    id: String,
    destination_path: String,
) -> Result<bool, String> {
    let persistence = state
        .transcription_persistence
        .lock()
        .map_err(|e| e.to_string())?;
    let database = state
        .transcription_database
        .lock()
        .map_err(|e| e.to_string())?;
    persistence
        .copy_audio_file(&database, &id, std::path::Path::new(&destination_path))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_audio_file_path(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<String>, String> {
    let persistence = state
        .transcription_persistence
        .lock()
        .map_err(|e| e.to_string())?;
    let database = state
        .transcription_database
        .lock()
        .map_err(|e| e.to_string())?;
    Ok(persistence
        .get_audio_file_path(&database, &id)
        .map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn cleanup_orphaned_files(state: State<'_, AppState>) -> Result<usize, String> {
    let persistence = state
        .transcription_persistence
        .lock()
        .map_err(|e| e.to_string())?;
    let database = state
        .transcription_database
        .lock()
        .map_err(|e| e.to_string())?;
    persistence
        .cleanup_orphaned_files(&database)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_recordings_directory(state: State<'_, AppState>) -> Result<String, String> {
    let persistence = state
        .transcription_persistence
        .lock()
        .map_err(|e| e.to_string())?;
    Ok(persistence
        .get_recordings_dir()
        .to_string_lossy()
        .to_string())
}
