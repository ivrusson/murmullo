use serde::Serialize;
use tauri::AppHandle;

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
pub struct MacosPermissionStatus {
    pub microphone: bool,
    pub accessibility: bool,
    pub input_monitoring: bool,
}

impl MacosPermissionStatus {
    #[cfg(not(target_os = "macos"))]
    fn granted() -> Self {
        Self {
            microphone: true,
            accessibility: true,
            input_monitoring: true,
        }
    }
}

#[tauri::command]
pub fn check_macos_permissions() -> MacosPermissionStatus {
    current_status()
}

#[tauri::command]
pub fn request_macos_accessibility() -> bool {
    #[cfg(target_os = "macos")]
    {
        macos::request_accessibility()
    }
    #[cfg(not(target_os = "macos"))]
    true
}

#[tauri::command]
pub fn request_macos_input_monitoring() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        macos::open_privacy_pane("Privacy_ListenEvent")?;
        Ok(macos::input_monitoring_granted())
    }
    #[cfg(not(target_os = "macos"))]
    Ok(true)
}

#[tauri::command]
pub async fn request_macos_microphone(app: AppHandle) -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        macos::request_microphone(app).await
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        Ok(true)
    }
}

fn current_status() -> MacosPermissionStatus {
    #[cfg(target_os = "macos")]
    {
        macos::status()
    }
    #[cfg(not(target_os = "macos"))]
    {
        MacosPermissionStatus::granted()
    }
}

#[cfg(target_os = "macos")]
mod macos {
    use super::MacosPermissionStatus;
    use block2::RcBlock;
    use objc2::ffi::NSInteger;
    use objc2::runtime::Bool;
    use objc2::{class, msg_send};
    use objc2_foundation::NSString;
    use std::process::Command;
    use std::sync::mpsc;
    use std::time::Duration;
    use tauri::AppHandle;

    #[link(name = "AVFoundation", kind = "framework")]
    extern "C" {}

    #[link(name = "IOKit", kind = "framework")]
    extern "C" {
        fn IOHIDCheckAccess(request: u32) -> u32;
    }

    const AV_AUTHORIZED: NSInteger = 3;
    const AV_NOT_DETERMINED: NSInteger = 0;
    const IOHID_REQUEST_LISTEN_EVENT: u32 = 1;
    const IOHID_ACCESS_GRANTED: u32 = 0;

    pub fn status() -> MacosPermissionStatus {
        MacosPermissionStatus {
            microphone: microphone_granted(),
            accessibility: accessibility_granted(),
            input_monitoring: input_monitoring_granted(),
        }
    }

    pub fn accessibility_granted() -> bool {
        macos_accessibility_client::accessibility::application_is_trusted()
    }

    pub fn request_accessibility() -> bool {
        macos_accessibility_client::accessibility::application_is_trusted_with_prompt()
    }

    pub fn input_monitoring_granted() -> bool {
        unsafe { IOHIDCheckAccess(IOHID_REQUEST_LISTEN_EVENT) == IOHID_ACCESS_GRANTED }
    }

    pub fn microphone_granted() -> bool {
        microphone_status() == AV_AUTHORIZED
    }

    /// `authorizationStatusForMediaType:` returns NSInteger (`isize` on LP64).
    /// We also link AVFoundation so `AVCaptureDevice` is actually registered;
    /// `tauri-plugin-macos-permissions` 2.3.0 does neither, so the UI never
    /// saw a real microphone status.
    pub fn microphone_status() -> NSInteger {
        unsafe {
            let media_type = NSString::from_str("soun");
            msg_send![
                class!(AVCaptureDevice),
                authorizationStatusForMediaType: &*media_type
            ]
        }
    }

    pub fn open_privacy_pane(pane: &str) -> Result<(), String> {
        Command::new("open")
            .arg(format!(
                "x-apple.systempreferences:com.apple.preference.security?{pane}"
            ))
            .output()
            .map_err(|error| error.to_string())?;
        Ok(())
    }

    pub async fn request_microphone(app: AppHandle) -> Result<bool, String> {
        let status = microphone_status();
        if status == AV_AUTHORIZED {
            return Ok(true);
        }
        if status != AV_NOT_DETERMINED {
            open_privacy_pane("Privacy_Microphone")?;
            return Ok(microphone_granted());
        }

        let (tx, rx) = mpsc::channel();
        app.run_on_main_thread(move || unsafe {
            let media_type = NSString::from_str("soun");
            let completion = RcBlock::new(move |granted: Bool| {
                let _ = tx.send(granted.as_bool());
            });
            let _: () = msg_send![
                class!(AVCaptureDevice),
                requestAccessForMediaType: &*media_type,
                completionHandler: &*completion
            ];
            std::mem::forget(completion);
        })
        .map_err(|error| error.to_string())?;

        match tokio::task::spawn_blocking(move || rx.recv_timeout(Duration::from_secs(60))).await {
            Ok(Ok(granted)) => Ok(granted),
            Ok(Err(_)) => {
                open_privacy_pane("Privacy_Microphone")?;
                Ok(microphone_granted())
            }
            Err(_) => Ok(microphone_granted()),
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use objc2::ffi::NSInteger;

        #[test]
        fn nint_encoding_does_not_panic() {
            let status = microphone_status();
            assert!(
                (AV_NOT_DETERMINED..=AV_AUTHORIZED).contains(&status),
                "unexpected AVAuthorizationStatus {status}"
            );
        }

        #[test]
        fn full_status_does_not_panic() {
            let s = status();
            println!(
                "permissions mic={} ax={} input={}",
                s.microphone, s.accessibility, s.input_monitoring
            );
        }

        #[test]
        fn nsinteger_is_pointer_width() {
            assert_eq!(
                std::mem::size_of::<NSInteger>(),
                std::mem::size_of::<isize>()
            );
        }
    }
}
