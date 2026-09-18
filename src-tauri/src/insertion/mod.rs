use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use std::panic::{catch_unwind, AssertUnwindSafe};
use std::process::Command;
use std::sync::mpsc;
use std::thread;
use std::time::Duration;
use tauri::AppHandle;

#[derive(Debug, Clone)]
pub enum InsertionMode {
    Clipboard,
    Keystroke,
}

impl InsertionMode {
    pub fn from_str(value: &str) -> Self {
        match value {
            "keystroke" => InsertionMode::Keystroke,
            _ => InsertionMode::Clipboard,
        }
    }
}

#[allow(dead_code)]
pub struct TextInserter {
    mode: InsertionMode,
}

impl TextInserter {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(TextInserter {
            mode: InsertionMode::Clipboard,
        })
    }

    pub fn set_mode(&mut self, mode: InsertionMode) {
        self.mode = mode;
    }

    pub fn insert_text(&self, text: &str) -> Result<String, Box<dyn std::error::Error>> {
        insert_now(text, &self.mode)
    }
}

/// Clipboard + Cmd+V must run on the macOS main thread. Doing it from Tokio
/// aborts the process (CGEvent / NSPasteboard).
pub fn paste_dictation(app: &AppHandle, text: &str, mode: &str) {
    if text.is_empty() {
        crate::pipeline::log("paste", "skip: empty text");
        return;
    }

    crate::pipeline::log(
        "paste",
        format!("insert {} chars mode={mode} (main thread)", text.len()),
    );

    let text = text.to_string();
    let mode = InsertionMode::from_str(mode);
    let (tx, rx) = mpsc::channel();

    if let Err(e) = app.run_on_main_thread(move || {
        let outcome = catch_unwind(AssertUnwindSafe(|| {
            insert_now(&text, &mode).map_err(|err| err.to_string())
        }));
        let _ = tx.send(outcome);
    }) {
        crate::pipeline::log("paste", format!("run_on_main_thread failed: {e}"));
        return;
    }

    match rx.recv_timeout(Duration::from_secs(4)) {
        Ok(Ok(Ok(msg))) => crate::pipeline::log("paste", msg),
        Ok(Ok(Err(e))) => crate::pipeline::log("paste", format!("failed: {e}")),
        Ok(Err(_)) => crate::pipeline::log("paste", "panic while pasting — process kept alive"),
        Err(_) => crate::pipeline::log("paste", "timeout waiting for main-thread paste"),
    }
}

fn insert_now(text: &str, mode: &InsertionMode) -> Result<String, Box<dyn std::error::Error>> {
    match mode {
        InsertionMode::Keystroke => insert_via_keystroke(text),
        InsertionMode::Clipboard => insert_via_clipboard(text),
    }
}

fn write_clipboard(text: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut clipboard = arboard::Clipboard::new()?;
    clipboard.set_text(text.to_string())?;
    Ok(())
}

fn insert_via_clipboard(text: &str) -> Result<String, Box<dyn std::error::Error>> {
    write_clipboard(text)?;
    thread::sleep(Duration::from_millis(40));

    if simulate_paste_enigo().is_ok() {
        return Ok("clipboard + cmd-v (enigo)".to_string());
    }

    if simulate_paste_osascript() {
        return Ok("clipboard + cmd-v (osascript)".to_string());
    }

    Ok("clipboard only — could not synthesize Cmd+V (Accessibility?)".to_string())
}

fn insert_via_keystroke(text: &str) -> Result<String, Box<dyn std::error::Error>> {
    match Enigo::new(&Settings::default()) {
        Ok(mut enigo) => match enigo.text(text) {
            Ok(()) => Ok("typed".to_string()),
            Err(e) => {
                crate::pipeline::log(
                    "paste",
                    format!("keystroke failed ({e}), falling back to clipboard"),
                );
                insert_via_clipboard(text)
            }
        },
        Err(e) => {
            crate::pipeline::log(
                "paste",
                format!("enigo init failed ({e}), falling back to clipboard"),
            );
            insert_via_clipboard(text)
        }
    }
}

fn simulate_paste_enigo() -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    {
        enigo
            .key(Key::Meta, Direction::Press)
            .map_err(|e| e.to_string())?;
        enigo
            .key(Key::Unicode('v'), Direction::Click)
            .map_err(|e| e.to_string())?;
        enigo
            .key(Key::Meta, Direction::Release)
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "macos"))]
    {
        enigo
            .key(Key::Control, Direction::Press)
            .map_err(|e| e.to_string())?;
        enigo
            .key(Key::Unicode('v'), Direction::Click)
            .map_err(|e| e.to_string())?;
        enigo
            .key(Key::Control, Direction::Release)
            .map_err(|e| e.to_string())?;
    }
    thread::sleep(Duration::from_millis(50));
    Ok(())
}

fn simulate_paste_osascript() -> bool {
    #[cfg(target_os = "macos")]
    {
        Command::new("osascript")
            .args([
                "-e",
                r#"tell application "System Events" to keystroke "v" using command down"#,
            ])
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }
    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}
