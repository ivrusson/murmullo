use crate::commands::AppState;
use crate::config::AppConfig;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::http::{header::CONTENT_TYPE, Request, Response, StatusCode};
use tauri::{AppHandle, Manager, UriSchemeContext};

const CRASH_WINDOW_LABEL: &str = "crash-reporter";
const CRASH_PROTOCOL: &str = "crash";
const CRASH_PAGE_URL: &str = "crash://localhost/";
const MAX_STACK_CHARS: usize = 16_384;
const CRASH_HTML: &[u8] = include_bytes!("../../crash.html");
pub const FRONTEND_CAPTURE_SCRIPT: &str = include_str!("../crash-capture.js");

static SHOWING_REPORTER: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingCrash {
    pub source: String,
    pub message: String,
    pub stack: Option<String>,
    pub version: String,
    pub os: String,
    pub locale: String,
    pub environment: String,
    pub recorded_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedbackEnvironment {
    pub version: String,
    pub os: String,
    pub locale: String,
    pub stt: String,
    pub llm: String,
    pub summary: String,
}

pub fn pending_path() -> PathBuf {
    crate::paths::app_dir().join("crash-pending.json")
}

pub fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

pub fn os_label() -> String {
    #[cfg(target_os = "macos")]
    {
        let version = std::process::Command::new("sw_vers")
            .arg("-productVersion")
            .output()
            .ok()
            .and_then(|output| String::from_utf8(output.stdout).ok())
            .map(|text| text.trim().to_string())
            .filter(|text| !text.is_empty());
        return match version {
            Some(ver) => format!("macOS {ver} ({})", std::env::consts::ARCH),
            None => format!("macOS ({})", std::env::consts::ARCH),
        };
    }
    #[cfg(not(target_os = "macos"))]
    {
        format!("{} ({})", std::env::consts::OS, std::env::consts::ARCH)
    }
}

fn clip_stack(stack: Option<String>) -> Option<String> {
    stack.map(|text| {
        if text.len() <= MAX_STACK_CHARS {
            text
        } else {
            format!("{}\n…(truncated)", &text[..MAX_STACK_CHARS])
        }
    })
}

fn format_summary(env: &FeedbackEnvironment) -> String {
    format!(
        "Murmullo {version}\nOS: {os}\nLocale: {locale}\nSTT: {stt}\nLLM: {llm}",
        version = env.version,
        os = env.os,
        locale = env.locale,
        stt = env.stt,
        llm = env.llm
    )
}

fn locale_from_config(config: Option<&AppConfig>) -> String {
    config
        .map(|cfg| cfg.ui.language.clone())
        .filter(|lang| !lang.is_empty())
        .unwrap_or_else(|| "es".to_string())
}

fn snapshot_from_state(state: Option<&AppState>) -> FeedbackEnvironment {
    let config = state.and_then(|app| app.config.lock().ok());
    let runtime = state.and_then(|app| app.runtime.lock().ok());
    let locale = locale_from_config(config.as_deref());
    let (stt, llm) = match (config.as_deref(), runtime.as_ref()) {
        (Some(cfg), Some(runtime)) => {
            let status = runtime.status(None);
            let stt = format!(
                "server={} model={}",
                status.stt_server.state, status.stt_model.state
            );
            let llm = if cfg.runtime.llm_enabled {
                format!(
                    "{} {} ({})",
                    cfg.runtime.llm_provider, cfg.runtime.llm_model, status.llm_server.state
                )
            } else {
                "disabled".to_string()
            };
            (stt, llm)
        }
        (Some(cfg), None) => (
            "unknown".to_string(),
            if cfg.runtime.llm_enabled {
                format!("{} {}", cfg.runtime.llm_provider, cfg.runtime.llm_model)
            } else {
                "disabled".to_string()
            },
        ),
        _ => ("unknown".to_string(), "unknown".to_string()),
    };

    let mut env = FeedbackEnvironment {
        version: app_version(),
        os: os_label(),
        locale,
        stt,
        llm,
        summary: String::new(),
    };
    env.summary = format_summary(&env);
    env
}

pub fn collect_environment(app: Option<&AppHandle>) -> FeedbackEnvironment {
    let state = app.and_then(|handle| handle.try_state::<AppState>());
    snapshot_from_state(state.as_deref())
}

pub fn write_pending(mut crash: PendingCrash) -> Result<(), String> {
    crate::paths::ensure_layout();
    crash.stack = clip_stack(crash.stack);
    if crash.version.is_empty() {
        crash.version = app_version();
    }
    if crash.os.is_empty() {
        crash.os = os_label();
    }
    let json = serde_json::to_string_pretty(&crash).map_err(|e| e.to_string())?;
    fs::write(pending_path(), json).map_err(|e| e.to_string())
}

pub fn read_pending() -> Option<PendingCrash> {
    let path = pending_path();
    let raw = fs::read_to_string(path).ok()?;
    serde_json::from_str(&raw).ok()
}

pub fn has_pending() -> bool {
    pending_path().is_file()
}

pub fn clear_pending() -> Result<(), String> {
    let path = pending_path();
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    SHOWING_REPORTER.store(false, Ordering::SeqCst);
    Ok(())
}

pub fn record_panic(info: &std::panic::PanicHookInfo<'_>) {
    let message = info.to_string();
    let location = info.location().map(|loc| {
        format!(
            "{}:{}:{}\n{}",
            loc.file(),
            loc.line(),
            loc.column(),
            std::backtrace::Backtrace::force_capture()
        )
    });
    let env = collect_environment(None);
    let _ = write_pending(PendingCrash {
        source: "rust-panic".into(),
        message,
        stack: location,
        version: env.version,
        os: env.os,
        locale: env.locale,
        environment: env.summary,
        recorded_at: chrono::Utc::now().to_rfc3339(),
    });
}

pub fn install_panic_hook() {
    let previous = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        record_panic(info);
        previous(info);
    }));
}

pub fn serve_crash_html(
    _ctx: UriSchemeContext<'_, impl tauri::Runtime>,
    request: Request<Vec<u8>>,
) -> Response<&'static [u8]> {
    let path = request.uri().path();
    if path.ends_with("favicon.ico") {
        return Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(&b""[..])
            .expect("empty favicon response");
    }
    Response::builder()
        .status(StatusCode::OK)
        .header(CONTENT_TYPE, "text/html; charset=utf-8")
        .header("Cache-Control", "no-store")
        .body(CRASH_HTML)
        .expect("crash html response")
}

fn crash_page_url() -> tauri::WebviewUrl {
    tauri::WebviewUrl::CustomProtocol(CRASH_PAGE_URL.parse().expect("crash protocol url is valid"))
}

fn window_uses_embedded_page(win: &tauri::WebviewWindow) -> bool {
    win.url()
        .map(|url| url.scheme() == CRASH_PROTOCOL)
        .unwrap_or(false)
}

fn create_crash_window(app: &AppHandle) -> Result<tauri::WebviewWindow, String> {
    tauri::WebviewWindowBuilder::new(app, CRASH_WINDOW_LABEL, crash_page_url())
        .title("Murmullo")
        .inner_size(520.0, 640.0)
        .min_inner_size(420.0, 480.0)
        .resizable(true)
        .decorations(true)
        .always_on_top(false)
        .skip_taskbar(false)
        .visible(true)
        .focused(true)
        .center()
        .build()
        .map_err(|e| format!("create crash reporter: {e}"))
}

pub fn show_crash_reporter(app: &AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(CRASH_WINDOW_LABEL) {
        if window_uses_embedded_page(&win) {
            win.show().map_err(|e| e.to_string())?;
            let _ = win.unminimize();
            let _ = win.set_focus();
            SHOWING_REPORTER.store(true, Ordering::SeqCst);
            return Ok(());
        }
        let _ = win.destroy();
    }
    create_crash_window(app)?;
    SHOWING_REPORTER.store(true, Ordering::SeqCst);
    Ok(())
}

pub fn show_if_pending(app: &AppHandle) {
    if !has_pending() {
        return;
    }
    if let Err(e) = show_crash_reporter(app) {
        eprintln!("⚠️ Could not show crash reporter: {e}");
    }
}

#[tauri::command]
pub fn get_feedback_environment(app: AppHandle) -> Result<FeedbackEnvironment, String> {
    Ok(collect_environment(Some(&app)))
}

#[tauri::command]
pub fn get_pending_crash() -> Result<Option<PendingCrash>, String> {
    Ok(read_pending())
}

#[tauri::command]
pub fn clear_pending_crash() -> Result<(), String> {
    clear_pending()
}

#[tauri::command]
pub fn show_crash_reporter_window(app: AppHandle) -> Result<(), String> {
    show_crash_reporter(&app)
}

#[tauri::command]
pub fn close_crash_reporter_window(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(CRASH_WINDOW_LABEL) {
        win.close().map_err(|e| e.to_string())?;
    }
    SHOWING_REPORTER.store(false, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub fn report_frontend_crash(
    app: AppHandle,
    message: String,
    stack: Option<String>,
    source: String,
) -> Result<(), String> {
    let env = collect_environment(Some(&app));
    write_pending(PendingCrash {
        source,
        message,
        stack,
        version: env.version,
        os: env.os,
        locale: env.locale,
        environment: env.summary,
        recorded_at: chrono::Utc::now().to_rfc3339(),
    })?;
    show_crash_reporter(&app)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pending_file_lives_under_app_dir() {
        assert_eq!(
            pending_path(),
            crate::paths::app_dir().join("crash-pending.json")
        );
    }

    #[test]
    fn crash_html_does_not_depend_on_vite() {
        let html = include_str!("../../crash.html");
        assert!(!html.contains("type=\"module\""));
        assert!(!html.contains("/src/"));
        assert!(!html.contains("fonts.googleapis.com"));
        assert!(html.contains("__TAURI_INTERNALS__"));
    }
}
