//! macOS insertion: restore the last foreign app, then Cmd+V into that PID.
//!
//! AX `SetAttribute` often returns 0 on Electron/Chrome without changing the
//! caret. That false success used to skip Cmd+V, so text stayed on the clipboard.

use objc2::runtime::{AnyObject, Bool};
use objc2::{class, msg_send};
use objc2_foundation::NSString;
use std::ffi::{c_char, c_void, CStr};
use std::sync::atomic::{AtomicI32, Ordering};
use std::sync::Once;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};

const OUR_BUNDLE_ID: &str = "com.murmullo.app";
const HID_TAP: u32 = 0;
const HID_SYSTEM_STATE: u32 = 1;
const AX_SUCCESS: i32 = 0;
const NS_APPLICATION_ACTIVATE_IGNORING_OTHER_APPS: u64 = 1 << 1;

static LAST_TARGET_PID: AtomicI32 = AtomicI32::new(-1);
static TRACKER: Once = Once::new();

#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGEventSourceCreate(state_id: u32) -> *mut c_void;
    fn CGEventCreateKeyboardEvent(
        source: *mut c_void,
        virtual_key: u16,
        key_down: bool,
    ) -> *mut c_void;
    fn CGEventSetFlags(event: *mut c_void, flags: u64);
    fn CGEventPost(tap: u32, event: *mut c_void);
    fn CGEventPostToPid(pid: i32, event: *mut c_void);
}

#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn AXUIElementCreateSystemWide() -> *mut c_void;
    fn AXUIElementCopyAttributeValue(
        element: *mut c_void,
        attribute: *const c_void,
        value: *mut *mut c_void,
    ) -> i32;
    fn AXUIElementSetAttributeValue(
        element: *mut c_void,
        attribute: *const c_void,
        value: *const c_void,
    ) -> i32;
    fn AXUIElementGetPid(element: *mut c_void, pid: *mut i32) -> i32;
}

#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    fn CFRelease(cf: *const c_void);
}

pub fn start_target_tracker() {
    TRACKER.call_once(|| {
        thread::spawn(|| loop {
            snapshot_frontmost_if_foreign();
            thread::sleep(Duration::from_millis(200));
        });
    });
}

pub fn snapshot_frontmost_if_foreign() {
    let Some((pid, bundle)) = frontmost_app() else {
        return;
    };
    if is_self(pid, bundle.as_deref()) {
        return;
    }
    if bundle
        .as_deref()
        .is_some_and(|id| !id.trim().is_empty() && !super::is_paste_target_bundle(id))
    {
        return;
    }
    LAST_TARGET_PID.store(pid, Ordering::SeqCst);
}

pub fn target_pid() -> i32 {
    LAST_TARGET_PID.load(Ordering::SeqCst)
}

pub fn restore_previous_app() -> bool {
    snapshot_frontmost_if_foreign();
    let pid = target_pid();
    if pid <= 0 || pid == std::process::id() as i32 {
        return false;
    }
    if !activate_pid(pid) {
        return false;
    }
    wait_until_frontmost(pid, 400)
}

pub fn resign_murmullo_windows(app: &AppHandle) {
    for label in ["floating-bar", "main"] {
        let Some(win) = app.get_webview_window(label) else {
            continue;
        };
        let Ok(ptr) = win.ns_window() else {
            continue;
        };
        if ptr.is_null() {
            continue;
        }
        unsafe {
            let _: () = msg_send![ptr as *mut AnyObject, resignKeyWindow];
        }
    }
}

pub fn insert_via_accessibility(text: &str) -> bool {
    if text.is_empty() {
        return false;
    }
    unsafe {
        let system = AXUIElementCreateSystemWide();
        if system.is_null() {
            return false;
        }
        let focused_attr = NSString::from_str("AXFocusedUIElement");
        let mut focused: *mut c_void = std::ptr::null_mut();
        let copy_status = AXUIElementCopyAttributeValue(
            system,
            &*focused_attr as *const NSString as *const c_void,
            &mut focused,
        );
        CFRelease(system);
        if copy_status != AX_SUCCESS || focused.is_null() {
            crate::pipeline::log("paste", "ax: no focused element");
            return false;
        }

        let mut focused_pid: i32 = 0;
        let _ = AXUIElementGetPid(focused, &mut focused_pid);
        let role = ax_string_attribute(focused, "AXRole");
        crate::pipeline::log(
            "paste",
            format!(
                "ax: focused pid={focused_pid} role={}",
                role.as_deref().unwrap_or("?")
            ),
        );

        let selected_attr = NSString::from_str("AXSelectedText");
        let value = NSString::from_str(text);
        let set_status = AXUIElementSetAttributeValue(
            focused,
            &*selected_attr as *const NSString as *const c_void,
            &*value as *const NSString as *const c_void,
        );
        let readback = ax_string_attribute(focused, "AXSelectedText");
        CFRelease(focused);

        let trusted = super::ax_insert_is_trusted(
            focused_pid,
            std::process::id() as i32,
            readback.as_deref(),
            text,
        );
        crate::pipeline::log(
            "paste",
            format!(
                "ax: set status={set_status} readback_chars={} trusted={trusted}",
                readback.as_ref().map(|s| s.len()).unwrap_or(0)
            ),
        );
        trusted
    }
}

pub fn synthesize_paste(pid: i32) -> bool {
    let spec = super::paste_shortcut();

    unsafe {
        let source = CGEventSourceCreate(HID_SYSTEM_STATE);
        if source.is_null() {
            return false;
        }

        let posted = post_key(source, spec.keycode, true, spec.flags, pid)
            && post_key(source, spec.keycode, false, spec.flags, pid);

        CFRelease(source);
        if !posted {
            return false;
        }
    }
    thread::sleep(Duration::from_millis(60));
    true
}

pub fn simulate_paste_osascript() -> bool {
    std::process::Command::new("osascript")
        .args([
            "-e",
            r#"tell application "System Events" to keystroke "v" using command down"#,
        ])
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn post_key(source: *mut c_void, keycode: u16, down: bool, flags: u64, pid: i32) -> bool {
    unsafe {
        let event = CGEventCreateKeyboardEvent(source, keycode, down);
        if event.is_null() {
            return false;
        }
        CGEventSetFlags(event, flags);
        if pid > 0 {
            CGEventPostToPid(pid, event);
        }
        CGEventPost(HID_TAP, event);
        CFRelease(event);
        true
    }
}

fn ax_string_attribute(element: *mut c_void, name: &str) -> Option<String> {
    unsafe {
        let attr = NSString::from_str(name);
        let mut value: *mut c_void = std::ptr::null_mut();
        let status = AXUIElementCopyAttributeValue(
            element,
            &*attr as *const NSString as *const c_void,
            &mut value,
        );
        if status != AX_SUCCESS || value.is_null() {
            return None;
        }
        let text = nsstring_to_string(value as *mut AnyObject);
        CFRelease(value);
        text
    }
}

fn wait_until_frontmost(pid: i32, timeout_ms: u64) -> bool {
    let deadline = Instant::now() + Duration::from_millis(timeout_ms);
    loop {
        if frontmost_app().is_some_and(|(front, _)| front == pid) {
            return true;
        }
        if Instant::now() >= deadline {
            crate::pipeline::log(
                "paste",
                format!("restore: timed out waiting for pid={pid} to become frontmost"),
            );
            return false;
        }
        thread::sleep(Duration::from_millis(20));
    }
}

fn is_self(pid: i32, bundle: Option<&str>) -> bool {
    if pid == std::process::id() as i32 {
        return true;
    }
    bundle.is_some_and(|id| id.trim() == OUR_BUNDLE_ID)
}

fn frontmost_app() -> Option<(i32, Option<String>)> {
    unsafe {
        let workspace: *mut AnyObject = msg_send![class!(NSWorkspace), sharedWorkspace];
        if workspace.is_null() {
            return None;
        }
        let app: *mut AnyObject = msg_send![workspace, frontmostApplication];
        if app.is_null() {
            return None;
        }
        let pid: i32 = msg_send![app, processIdentifier];
        let bundle: *mut AnyObject = msg_send![app, bundleIdentifier];
        Some((pid, nsstring_to_string(bundle)))
    }
}

fn activate_pid(pid: i32) -> bool {
    unsafe {
        let running: *mut AnyObject = msg_send![
            class!(NSRunningApplication),
            runningApplicationWithProcessIdentifier: pid
        ];
        if running.is_null() {
            crate::pipeline::log("paste", format!("restore: no app for pid={pid}"));
            return false;
        }
        let ok: Bool = msg_send![
            running,
            activateWithOptions: NS_APPLICATION_ACTIVATE_IGNORING_OTHER_APPS
        ];
        let granted = ok.as_bool();
        crate::pipeline::log("paste", format!("restore pid={pid} activate={granted}"));
        granted
    }
}

fn nsstring_to_string(s: *mut AnyObject) -> Option<String> {
    if s.is_null() {
        return None;
    }
    unsafe {
        let utf8: *const c_char = msg_send![s, UTF8String];
        if utf8.is_null() {
            return None;
        }
        Some(CStr::from_ptr(utf8).to_string_lossy().into_owned())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn self_pid_is_not_a_paste_target() {
        let pid = std::process::id() as i32;
        assert!(is_self(pid, Some("com.apple.Notes")));
        assert!(is_self(pid + 1, Some(OUR_BUNDLE_ID)));
        assert!(!is_self(pid + 1, Some("com.apple.Notes")));
        assert!(!is_self(pid + 1, Some("")));
        assert!(!is_self(pid + 1, None));
    }
}
