//! In-app updates for the packaged app (.dmg installs).
//!
//! Source installs keep using `updater.rs` + `update.sh`. A bundled build instead asks
//! `tauri-plugin-updater` for `latest.json`, downloads the signed `.app.tar.gz` in the
//! background and keeps the bytes in memory. The user installs from the sidebar button or
//! the tray menu ("Instalar y reiniciar"); if they never do, the update is applied when the
//! app quits. Installing is refused while a dictation is recording or transcribing.

use crate::codes::code;
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use tauri::menu::{Menu, MenuItem};
use tauri::{AppHandle, Emitter, Listener, Manager, Wry};
use tauri_plugin_updater::{Update, UpdaterExt};

const CHECK_EVERY: Duration = Duration::from_secs(6 * 60 * 60);
/// State changes; download progress is throttled to whole percent steps.
const CHANGED_EVENT: &str = "binary-update-changed";
/// Asks the main window to open the "install and restart" dialog (from the tray).
const OPEN_EVENT: &str = "binary-update-open";
pub const TRAY_ITEM_ID: &str = "binary-update";

#[derive(Debug, Serialize, Clone, PartialEq, Default)]
pub struct BinaryUpdateState {
    /// `idle`, `checking`, `downloading`, `ready`, `installing` or `error`.
    pub phase: String,
    pub version: Option<String>,
    pub downloaded: u64,
    pub total: Option<u64>,
    pub error: Option<String>,
    /// A dictation is recording or transcribing, so installing has to wait.
    pub busy: bool,
}

impl BinaryUpdateState {
    fn percent(&self) -> Option<u8> {
        let total = self.total.filter(|t| *t > 0)?;
        Some(((self.downloaded.min(total) * 100) / total) as u8)
    }
}

#[derive(Default)]
pub struct BinaryUpdater {
    state: Mutex<BinaryUpdateState>,
    /// The verified download, waiting to be installed.
    pending: Mutex<Option<(Update, Vec<u8>)>>,
    busy: AtomicBool,
    tray: Mutex<Option<(Menu<Wry>, MenuItem<Wry>, bool)>>,
}

/// Bundled builds only: a build that still sits next to its git clone updates from source.
pub fn enabled() -> bool {
    crate::updater::source_root().is_none()
}

fn english() -> bool {
    crate::config::AppConfig::load().is_ok_and(|c| c.ui.language == "en")
}

/// Tray label for the current state; None hides the entry.
fn tray_label(state: &BinaryUpdateState, english: bool) -> Option<(String, bool)> {
    let version = state.version.as_deref().unwrap_or_default();
    match state.phase.as_str() {
        "downloading" => {
            let percent = state
                .percent()
                .map(|p| format!(" {p}%"))
                .unwrap_or_default();
            Some((
                if english {
                    format!("Downloading update…{percent}")
                } else {
                    format!("Descargando actualización…{percent}")
                },
                false,
            ))
        }
        "ready" if state.busy => Some((
            if english {
                "Finish dictating to update".to_string()
            } else {
                "Termina el dictado para actualizar".to_string()
            },
            false,
        )),
        "ready" => Some((
            if english {
                format!("Install v{version} and restart")
            } else {
                format!("Instalar v{version} y reiniciar")
            },
            true,
        )),
        "installing" => Some((
            if english {
                "Installing update…".to_string()
            } else {
                "Instalando actualización…".to_string()
            },
            false,
        )),
        _ => None,
    }
}

impl BinaryUpdater {
    pub fn snapshot(&self) -> BinaryUpdateState {
        self.state.lock().unwrap().clone()
    }

    fn set(&self, app: &AppHandle, change: impl FnOnce(&mut BinaryUpdateState)) {
        let (before, after) = {
            let mut state = self.state.lock().unwrap();
            let before = state.clone();
            change(&mut state);
            state.busy = self.busy.load(Ordering::SeqCst);
            (before, state.clone())
        };
        let progress_only = before.phase == after.phase
            && before.busy == after.busy
            && before.percent() == after.percent();
        if before == after || progress_only {
            return;
        }
        let _ = app.emit(CHANGED_EVENT, &after);
        self.refresh_tray(&after);
    }

    fn refresh_tray(&self, state: &BinaryUpdateState) {
        let mut tray = self.tray.lock().unwrap();
        let Some((menu, item, shown)) = tray.as_mut() else {
            return;
        };
        match tray_label(state, english()) {
            Some((text, enabled)) => {
                let _ = item.set_text(text);
                let _ = item.set_enabled(enabled);
                if !*shown && menu.insert(item, 1).is_ok() {
                    *shown = true;
                }
            }
            None if *shown => {
                if menu.remove(item).is_ok() {
                    *shown = false;
                }
            }
            None => {}
        }
    }
}

/// Registers the tray entry; it stays out of the menu until there is something to show.
pub fn attach_tray(app: &AppHandle, menu: &Menu<Wry>) -> tauri::Result<()> {
    let item = MenuItem::with_id(app, TRAY_ITEM_ID, "", false, None::<&str>)?;
    let updater = app.state::<BinaryUpdater>();
    *updater.tray.lock().unwrap() = Some((menu.clone(), item, false));
    updater.refresh_tray(&updater.snapshot());
    Ok(())
}

pub fn on_tray_click(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.set_focus();
    }
    let _ = app.emit(OPEN_EVENT, ());
}

/// Starts the background check loop. No-op for source installs.
pub fn init(app: &AppHandle) {
    if !enabled() {
        return;
    }

    let listener = app.clone();
    app.listen_any("recording-state-changed", move |event| {
        let state = serde_json::from_str::<serde_json::Value>(event.payload())
            .ok()
            .and_then(|v| v.get("state").and_then(|s| s.as_str()).map(str::to_owned));
        let busy = matches!(state.as_deref(), Some("recording" | "processing"));
        let updater = listener.state::<BinaryUpdater>();
        updater.busy.store(busy, Ordering::SeqCst);
        updater.set(&listener, |_| {});
    });

    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            check_and_download(&app).await;
            tokio::time::sleep(CHECK_EVERY).await;
        }
    });
}

async fn check_and_download(app: &AppHandle) {
    let updater = app.state::<BinaryUpdater>();
    if matches!(
        updater.snapshot().phase.as_str(),
        "ready" | "downloading" | "installing"
    ) {
        return;
    }
    updater.set(app, |s| s.phase = "checking".into());

    let found = match app.updater() {
        Ok(plugin) => plugin.check().await,
        Err(e) => Err(e),
    };
    let update = match found {
        Ok(Some(update)) => update,
        Ok(None) => {
            updater.set(app, |s| *s = BinaryUpdateState::default());
            return;
        }
        Err(e) => {
            crate::pipeline::log("updater", format!("check failed: {e}"));
            updater.set(app, |s| {
                *s = BinaryUpdateState {
                    phase: "idle".into(),
                    error: Some(code("update.check_failed")),
                    ..Default::default()
                }
            });
            return;
        }
    };

    let version = update.version.clone();
    crate::pipeline::log("updater", format!("downloading v{version}"));
    updater.set(app, |s| {
        *s = BinaryUpdateState {
            phase: "downloading".into(),
            version: Some(version.clone()),
            ..Default::default()
        }
    });

    let progress = app.clone();
    // `download` verifies the minisign signature before returning the bytes.
    let result = update
        .download(
            move |chunk, total| {
                progress.state::<BinaryUpdater>().set(&progress, |s| {
                    s.downloaded += chunk as u64;
                    s.total = total;
                });
            },
            || {},
        )
        .await;

    match result {
        Ok(bytes) => {
            *updater.pending.lock().unwrap() = Some((update, bytes));
            crate::pipeline::log("updater", format!("v{version} downloaded and verified"));
            updater.set(app, |s| s.phase = "ready".into());
        }
        Err(e) => {
            // A bad signature lands here too: the bytes are dropped, nothing is installed.
            crate::pipeline::log("updater", format!("download of v{version} discarded: {e}"));
            updater.set(app, |s| {
                *s = BinaryUpdateState {
                    phase: "error".into(),
                    version: Some(version.clone()),
                    error: Some(code("update.download_failed")),
                    ..Default::default()
                }
            });
        }
    }
}

fn install_pending(app: &AppHandle) -> Result<bool, String> {
    let Some((update, bytes)) = app.state::<BinaryUpdater>().pending.lock().unwrap().take() else {
        return Ok(false);
    };
    crate::pipeline::log("updater", format!("installing v{}", update.version));
    update.install(bytes).map_err(|e| {
        crate::pipeline::log("updater", format!("install failed: {e}"));
        code("update.install_failed")
    })?;
    Ok(true)
}

fn dictation_running(app: &AppHandle) -> bool {
    let state = app.state::<crate::commands::AppState>();
    let recording = state
        .audio_capture
        .lock()
        .map(|c| c.is_recording())
        .unwrap_or(false);
    recording || app.state::<BinaryUpdater>().busy.load(Ordering::SeqCst)
}

/// App is quitting: apply a downloaded update so the next launch is the new version.
pub fn install_on_exit(app: &AppHandle) {
    if let Err(e) = install_pending(app) {
        eprintln!("⚠️ Could not install the update on exit: {e}");
    }
}

#[tauri::command]
pub fn get_binary_update(app: AppHandle) -> Option<BinaryUpdateState> {
    enabled().then(|| app.state::<BinaryUpdater>().snapshot())
}

#[tauri::command]
pub async fn check_binary_update(app: AppHandle) -> Result<BinaryUpdateState, String> {
    if !enabled() {
        return Err(code("update.not_binary_install"));
    }
    check_and_download(&app).await;
    Ok(app.state::<BinaryUpdater>().snapshot())
}

#[tauri::command]
pub fn install_binary_update(app: AppHandle) -> Result<(), String> {
    if dictation_running(&app) {
        return Err(code("update.dictation_running"));
    }
    let updater = app.state::<BinaryUpdater>();
    updater.set(&app, |s| s.phase = "installing".into());
    match install_pending(&app) {
        Ok(true) => app.restart(),
        Ok(false) => {
            updater.set(&app, |s| *s = BinaryUpdateState::default());
            Err(code("update.nothing_to_install"))
        }
        Err(e) => {
            updater.set(&app, |s| {
                s.phase = "error".into();
                s.error = Some(e.clone());
            });
            Err(e)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn state(phase: &str) -> BinaryUpdateState {
        BinaryUpdateState {
            phase: phase.into(),
            version: Some("0.11.0".into()),
            ..Default::default()
        }
    }

    #[test]
    fn percent_needs_a_known_total() {
        let mut s = state("downloading");
        s.downloaded = 50;
        assert_eq!(s.percent(), None);
        s.total = Some(200);
        assert_eq!(s.percent(), Some(25));
        s.downloaded = 500;
        assert_eq!(s.percent(), Some(100));
    }

    #[test]
    fn tray_entry_follows_the_phase() {
        assert_eq!(tray_label(&state("idle"), false), None);
        assert_eq!(tray_label(&state("checking"), false), None);
        let (text, enabled) = tray_label(&state("ready"), false).unwrap();
        assert_eq!(text, "Instalar v0.11.0 y reiniciar");
        assert!(enabled);
        let mut busy = state("ready");
        busy.busy = true;
        assert_eq!(
            tray_label(&busy, true),
            Some(("Finish dictating to update".to_string(), false))
        );
        let (text, enabled) = tray_label(&state("downloading"), true).unwrap();
        assert_eq!(text, "Downloading update…");
        assert!(!enabled);
    }
}
