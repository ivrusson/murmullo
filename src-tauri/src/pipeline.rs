use serde::Serialize;
use std::collections::VecDeque;
use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

const MAX_RECENT: usize = 250;

#[derive(Debug, Clone, Serialize)]
pub struct PipelineLogEntry {
    pub ts: u64,
    pub stage: String,
    pub message: String,
}

static APP: OnceLock<AppHandle> = OnceLock::new();
static RECENT: OnceLock<Mutex<VecDeque<PipelineLogEntry>>> = OnceLock::new();

fn recent_buf() -> &'static Mutex<VecDeque<PipelineLogEntry>> {
    RECENT.get_or_init(|| Mutex::new(VecDeque::with_capacity(MAX_RECENT)))
}

pub fn init(app: AppHandle) {
    let _ = APP.set(app);
    log("boot", format!("log file {}", log_path().display()));
}

pub fn log_path() -> PathBuf {
    #[cfg(target_os = "macos")]
    {
        return dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("Library/Logs/murmullo/murmullo.log");
    }
    #[cfg(not(target_os = "macos"))]
    {
        dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("murmullo")
            .join("logs")
            .join("murmullo.log")
    }
}

pub fn recent() -> Vec<PipelineLogEntry> {
    recent_buf()
        .lock()
        .map(|buf| buf.iter().cloned().collect())
        .unwrap_or_default()
}

pub fn log(stage: &str, message: impl AsRef<str>) {
    let message = message.as_ref().to_string();
    let ts = now_ms();
    let clock = chrono::Local::now().format("%H:%M:%S%.3f");
    let line = format!("[{clock}] [{stage}] {message}");
    println!("{line}");
    append_file(&line);

    let entry = PipelineLogEntry {
        ts,
        stage: stage.to_string(),
        message: message.clone(),
    };
    if let Ok(mut buf) = recent_buf().lock() {
        if buf.len() >= MAX_RECENT {
            buf.pop_front();
        }
        buf.push_back(entry.clone());
    }

    if let Some(app) = APP.get() {
        let _ = app.emit("pipeline-log", &entry);
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn append_file(line: &str) {
    let path = log_path();
    if let Some(parent) = path.parent() {
        let _ = create_dir_all(parent);
    }
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{line}");
    }
}
