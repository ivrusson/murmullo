use std::panic::{catch_unwind, AssertUnwindSafe};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;
use tauri::AppHandle;

#[cfg(target_os = "macos")]
mod macos;

/// Virtual key + modifier flags for a platform paste shortcut.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PasteShortcut {
    pub keycode: u16,
    pub flags: u64,
}

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

/// kVK_ANSI_V + kCGEventFlagMaskCommand on macOS.
/// Enigo 0.2 posts V without these flags, so apps never see Cmd+V.
#[cfg(target_os = "macos")]
pub fn paste_shortcut() -> PasteShortcut {
    PasteShortcut {
        keycode: 0x09,
        flags: 0x0010_0000,
    }
}

#[cfg(not(target_os = "macos"))]
pub fn paste_shortcut() -> PasteShortcut {
    PasteShortcut {
        keycode: 0x56,
        flags: 0x0004_0000,
    }
}

pub fn is_paste_target_bundle(bundle_id: &str) -> bool {
    let id = bundle_id.trim();
    if id.is_empty() {
        return false;
    }
    id != "com.murmullo.app"
}

/// AX `SetAttribute` returning 0 is not enough: Electron/Chrome accept the
/// write and change nothing. Only a matching read-back on another process counts.
pub fn ax_insert_is_trusted(
    focused_pid: i32,
    our_pid: i32,
    readback: Option<&str>,
    intended: &str,
) -> bool {
    if focused_pid <= 0 || focused_pid == our_pid {
        return false;
    }
    let Some(got) = readback else {
        return false;
    };
    got == intended || got.ends_with(intended)
}

/// Remember the frontmost foreign app so paste can restore it later.
pub fn remember_frontmost_target() {
    #[cfg(target_os = "macos")]
    macos::snapshot_frontmost_if_foreign();
}

pub fn start_target_tracker() {
    #[cfg(target_os = "macos")]
    macos::start_target_tracker();
}

/// Clipboard + Cmd+V must run on the macOS main thread. Doing it from Tokio
/// aborts the process (CGEvent / NSPasteboard).
pub fn paste_dictation(app: &AppHandle, text: &str, mode: &str) {
    if text.is_empty() {
        crate::pipeline::log("paste", "skip: empty text");
        return;
    }

    remember_frontmost_target();

    crate::pipeline::log(
        "paste",
        format!("insert {} chars mode={mode} (main thread)", text.len()),
    );

    let text = text.to_string();
    let mode = InsertionMode::from_str(mode);
    let handle = app.clone();
    let (tx, rx) = mpsc::channel();

    if let Err(e) = app.run_on_main_thread(move || {
        let outcome = catch_unwind(AssertUnwindSafe(|| {
            insert_now(&handle, &text, &mode).map_err(|err| err.to_string())
        }));
        let _ = tx.send(outcome);
    }) {
        crate::pipeline::log("paste", format!("run_on_main_thread failed: {e}"));
        return;
    }

    match rx.recv_timeout(Duration::from_secs(4)) {
        Ok(Ok(Ok(msg))) => crate::pipeline::log("paste", msg),
        Ok(Ok(Err(e))) => crate::pipeline::log("paste", format!("failed: {e}")),
        Ok(Err(_)) => {
            crate::pipeline::log("paste", "panic while pasting — process kept alive");
            crate::crash::show_if_pending(app);
        }
        Err(_) => crate::pipeline::log("paste", "timeout waiting for main-thread paste"),
    }
}

fn insert_now(
    app: &AppHandle,
    text: &str,
    mode: &InsertionMode,
) -> Result<String, Box<dyn std::error::Error>> {
    match mode {
        InsertionMode::Keystroke => insert_via_keystroke(app, text),
        InsertionMode::Clipboard => insert_via_clipboard(app, text),
    }
}

fn write_clipboard(text: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut clipboard = arboard::Clipboard::new()?;
    clipboard.set_text(text.to_string())?;
    Ok(())
}

fn insert_via_clipboard(app: &AppHandle, text: &str) -> Result<String, Box<dyn std::error::Error>> {
    write_clipboard(text)?;
    thread::sleep(Duration::from_millis(40));
    focus_target_app(app);

    #[cfg(target_os = "macos")]
    {
        if macos::insert_via_accessibility(text) {
            return Ok("ax selected-text (verified)".to_string());
        }
        let pid = macos::target_pid();
        if macos::synthesize_paste(pid) {
            return Ok(format!("clipboard + cmd-v (cgevent pid={pid})"));
        }
        if macos::simulate_paste_osascript() {
            return Ok("clipboard + cmd-v (osascript)".to_string());
        }
        Ok("clipboard only — could not insert into the active field (Accessibility?)".to_string())
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        if simulate_paste_enigo().is_ok() {
            return Ok("clipboard + ctrl-v (enigo)".to_string());
        }
        Ok("clipboard only".to_string())
    }
}

fn insert_via_keystroke(app: &AppHandle, text: &str) -> Result<String, Box<dyn std::error::Error>> {
    focus_target_app(app);
    #[cfg(target_os = "macos")]
    {
        if macos::insert_via_accessibility(text) {
            return Ok("ax selected-text".to_string());
        }
    }
    match enigo::Enigo::new(&enigo::Settings::default()) {
        Ok(mut enigo) => {
            use enigo::Keyboard;
            match enigo.text(text) {
                Ok(()) => Ok("typed".to_string()),
                Err(e) => {
                    crate::pipeline::log(
                        "paste",
                        format!("keystroke failed ({e}), falling back to clipboard"),
                    );
                    insert_via_clipboard(app, text)
                }
            }
        }
        Err(e) => {
            crate::pipeline::log(
                "paste",
                format!("enigo init failed ({e}), falling back to clipboard"),
            );
            insert_via_clipboard(app, text)
        }
    }
}

fn focus_target_app(app: &AppHandle) {
    #[cfg(target_os = "macos")]
    {
        macos::resign_murmullo_windows(app);
        if macos::restore_previous_app() {
            thread::sleep(Duration::from_millis(80));
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
    }
}

#[cfg(not(target_os = "macos"))]
fn simulate_paste_enigo() -> Result<(), String> {
    use enigo::{Direction, Enigo, Key, Keyboard, Settings};
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    enigo
        .key(Key::Control, Direction::Press)
        .map_err(|e| e.to_string())?;
    enigo
        .key(Key::Unicode('v'), Direction::Click)
        .map_err(|e| e.to_string())?;
    enigo
        .key(Key::Control, Direction::Release)
        .map_err(|e| e.to_string())?;
    thread::sleep(Duration::from_millis(50));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(target_os = "macos")]
    #[test]
    fn paste_shortcut_is_command_v_on_macos() {
        let spec = paste_shortcut();
        assert_eq!(
            spec.keycode, 0x09,
            "must use kVK_ANSI_V, not a Unicode char event"
        );
        assert_eq!(
            spec.flags, 0x0010_0000,
            "V must carry kCGEventFlagMaskCommand; Enigo 0.2 omits this flag"
        );
    }

    #[test]
    fn murmullo_is_never_the_paste_target() {
        assert!(!is_paste_target_bundle("com.murmullo.app"));
        assert!(!is_paste_target_bundle("  com.murmullo.app  "));
        assert!(!is_paste_target_bundle(""));
        assert!(is_paste_target_bundle("com.apple.Notes"));
        assert!(is_paste_target_bundle("com.microsoft.VSCode"));
        assert!(is_paste_target_bundle("com.google.Chrome"));
    }

    #[test]
    fn insertion_mode_defaults_to_clipboard() {
        assert!(matches!(
            InsertionMode::from_str("clipboard"),
            InsertionMode::Clipboard
        ));
        assert!(matches!(
            InsertionMode::from_str("api"),
            InsertionMode::Clipboard
        ));
        assert!(matches!(
            InsertionMode::from_str("keystroke"),
            InsertionMode::Keystroke
        ));
    }

    #[test]
    fn unverified_ax_is_not_an_insert() {
        let us = 10;
        let them = 20;
        let text = "hola campo";
        assert!(
            !ax_insert_is_trusted(us, us, Some(text), text),
            "writing AXSelectedText on Murmullo itself is not an insert"
        );
        assert!(
            !ax_insert_is_trusted(them, us, None, text),
            "Electron often returns AX success with no readable value"
        );
        assert!(
            !ax_insert_is_trusted(them, us, Some("otro"), text),
            "a mismatched read-back means the caret did not receive the text"
        );
        assert!(ax_insert_is_trusted(them, us, Some(text), text));
        assert!(ax_insert_is_trusted(
            them,
            us,
            Some("prefijo hola campo"),
            text
        ));
    }
}
