//! In-app updates for source installs.
//!
//! Murmullo is installed from a git clone (see `install.sh`), so "updating" means
//! checking out the newest release tag and reinstalling. The heavy lifting lives in
//! `update.sh`; this module only looks up versions, starts that script detached and
//! reads the progress file it writes (`~/.murmullo/update/status.json`). The file is
//! the source of truth so progress survives the app closing and coming back.

use crate::codes::code;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;
use tauri::AppHandle;
use tokio::process::Command;
use tokio::time::timeout;

const REMOTE_TIMEOUT: Duration = Duration::from_secs(25);
const LOG_TAIL_LINES: usize = 40;

#[derive(Debug, Serialize, Clone, PartialEq)]
pub struct UpdateInfo {
    /// False when this build is not running from a git clone (nothing to update).
    pub supported: bool,
    /// Error code explaining `supported == false`.
    pub reason: Option<String>,
    pub current: String,
    /// Newest stable release, without the leading `v`.
    pub latest: Option<String>,
    pub update_available: bool,
    /// Tracked files were edited, so the updater would refuse to switch versions.
    pub has_local_changes: bool,
    /// Raw `CHANGELOG.md` at the latest tag; the UI picks the releases to show.
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct UpdateStatus {
    pub phase: String,
    pub percent: Option<u8>,
    #[serde(default)]
    pub target: String,
    #[serde(default)]
    pub detail: String,
    #[serde(default)]
    pub pid: u32,
    #[serde(default)]
    pub updated_at: u64,
    /// Filled in on read: whether the updater process still exists.
    #[serde(default)]
    pub alive: bool,
}

fn update_dir() -> PathBuf {
    crate::paths::app_dir().join("update")
}

fn status_file() -> PathBuf {
    update_dir().join("status.json")
}

fn log_file() -> PathBuf {
    update_dir().join("update.log")
}

/// The clone this binary was built from, if it is still there and updatable.
fn source_root() -> Option<PathBuf> {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()?
        .to_path_buf();
    let usable = root.join(".git").exists()
        && root.join("install.sh").is_file()
        && root.join("update.sh").is_file();
    usable.then_some(root)
}

fn parse_stable_version(tag: &str) -> Option<(u64, u64, u64)> {
    let mut parts = tag.strip_prefix('v').unwrap_or(tag).split('.');
    let major = parts.next()?.parse().ok()?;
    let minor = parts.next()?.parse().ok()?;
    let patch = parts.next()?.parse().ok()?;
    if parts.next().is_some() {
        return None;
    }
    Some((major, minor, patch))
}

/// Highest stable `vX.Y.Z` in `git ls-remote --tags --refs` output. Prerelease
/// tags (`v1.0.0-beta.1`) never parse, so they are skipped.
fn latest_stable_tag(ls_remote: &str) -> Option<String> {
    ls_remote
        .lines()
        .filter_map(|line| line.split_once("refs/tags/").map(|(_, tag)| tag.trim()))
        .filter_map(|tag| parse_stable_version(tag).map(|version| (version, tag)))
        .max_by_key(|(version, _)| *version)
        .map(|(_, tag)| tag.to_string())
}

async fn git(root: &Path, args: &[&str]) -> Result<String, String> {
    let run = Command::new("git")
        .arg("-C")
        .arg(root)
        .args(args)
        .env("GIT_TERMINAL_PROMPT", "0")
        .stdin(Stdio::null())
        .kill_on_drop(true)
        .output();
    let output = timeout(REMOTE_TIMEOUT, run)
        .await
        .map_err(|_| "git timed out".to_string())?
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

fn unsupported(current: String, reason: &str) -> UpdateInfo {
    UpdateInfo {
        supported: false,
        reason: Some(code(reason)),
        current,
        latest: None,
        update_available: false,
        has_local_changes: false,
        notes: None,
    }
}

async fn release_notes(root: &Path, tag: &str) -> Option<String> {
    let local = format!("refs/tags/{tag}");
    if git(root, &["rev-parse", "-q", "--verify", &local])
        .await
        .is_err()
    {
        let refspec = format!("+refs/tags/{tag}:refs/tags/{tag}");
        git(root, &["fetch", "--quiet", "origin", &refspec])
            .await
            .ok()?;
    }
    git(root, &["show", &format!("{tag}:CHANGELOG.md")])
        .await
        .ok()
}

async fn has_local_changes(root: &Path) -> bool {
    git(root, &["status", "--porcelain", "--untracked-files=no"])
        .await
        .map(|out| !out.trim().is_empty())
        .unwrap_or(false)
}

#[tauri::command]
pub async fn check_for_update() -> Result<UpdateInfo, String> {
    let current = env!("CARGO_PKG_VERSION").to_string();
    let Some(root) = source_root() else {
        return Ok(unsupported(current, "update.not_source_install"));
    };

    let remote = git(&root, &["ls-remote", "--tags", "--refs", "origin"])
        .await
        .map_err(|_| code("update.check_failed"))?;
    let tag = latest_stable_tag(&remote).ok_or_else(|| code("update.no_release"))?;
    let available = match (parse_stable_version(&tag), parse_stable_version(&current)) {
        (Some(latest), Some(installed)) => latest > installed,
        _ => false,
    };

    Ok(UpdateInfo {
        supported: true,
        reason: None,
        has_local_changes: has_local_changes(&root).await,
        notes: release_notes(&root, &tag).await,
        latest: Some(tag.trim_start_matches('v').to_string()),
        update_available: available,
        current,
    })
}

#[cfg(unix)]
fn process_alive(pid: u32) -> bool {
    pid != 0
        && std::process::Command::new("kill")
            .args(["-0", &pid.to_string()])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
}

#[cfg(not(unix))]
fn process_alive(_pid: u32) -> bool {
    false
}

fn read_status() -> Option<UpdateStatus> {
    let raw = fs::read_to_string(status_file()).ok()?;
    let mut status: UpdateStatus = serde_json::from_str(&raw).ok()?;
    status.alive = process_alive(status.pid);
    Some(status)
}

fn write_status(phase: &str, percent: u8, target: &str, pid: u32) {
    let status = UpdateStatus {
        phase: phase.to_string(),
        percent: Some(percent),
        target: target.to_string(),
        detail: String::new(),
        pid,
        updated_at: chrono::Utc::now().timestamp() as u64,
        alive: true,
    };
    if let Ok(json) = serde_json::to_string(&status) {
        let _ = fs::create_dir_all(update_dir());
        let _ = fs::write(status_file(), json);
    }
}

/// A run that is still working. `restarting` is excluded on purpose: from then on the
/// script *is* the new `tauri dev`, so it stays alive for as long as the app does.
fn in_progress(status: &UpdateStatus) -> bool {
    status.alive && !matches!(status.phase.as_str(), "error" | "done" | "restarting")
}

#[tauri::command]
pub fn get_update_status() -> Option<UpdateStatus> {
    read_status()
}

#[tauri::command]
pub fn clear_update_status() {
    if read_status().is_some_and(|s| in_progress(&s)) {
        return;
    }
    let _ = fs::remove_file(status_file());
}

/// macOS banner; best effort and silent elsewhere.
fn notify(body: &str) {
    #[cfg(target_os = "macos")]
    {
        let script = format!("display notification \"{body}\" with title \"Murmullo\"");
        let _ = std::process::Command::new("osascript")
            .args(["-e", &script])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
    #[cfg(not(target_os = "macos"))]
    let _ = body;
}

/// After an in-app update the first launch compiles for minutes with no window. When the
/// new build finally starts, say so once (the status file remembers it was announced).
pub fn announce_if_just_updated() {
    let Some(status) = read_status() else { return };
    let version = env!("CARGO_PKG_VERSION");
    if status.phase != "restarting"
        || status.target.trim_start_matches('v') != version
        || status.detail == "notified"
    {
        return;
    }
    let english = crate::config::AppConfig::load().is_ok_and(|c| c.ui.language == "en");
    notify(&if english {
        format!("Murmullo v{version} is ready.")
    } else {
        format!("Murmullo v{version} está listo.")
    });
    if let Ok(json) = serde_json::to_string(&UpdateStatus {
        detail: "notified".to_string(),
        ..status
    }) {
        let _ = fs::write(status_file(), json);
    }
}

/// Last lines of the updater log, for the error panel.
#[tauri::command]
pub fn get_update_log() -> String {
    let raw = fs::read_to_string(log_file()).unwrap_or_default();
    let lines: Vec<&str> = raw.lines().collect();
    let start = lines.len().saturating_sub(LOG_TAIL_LINES);
    lines[start..].join("\n")
}

/// Start `update.sh` detached from the app, then close the app once the script
/// reaches the point where files change (so it exits cleanly, not by SIGTERM).
#[tauri::command]
pub async fn start_update(app: AppHandle, target: String, lang: String) -> Result<(), String> {
    #[cfg(not(unix))]
    {
        let _ = (&app, &target, &lang);
        return Err(code("update.not_source_install"));
    }
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;

        let root = source_root().ok_or_else(|| code("update.not_source_install"))?;
        if read_status().is_some_and(|s| in_progress(&s)) {
            return Err(code("update.already_running"));
        }
        if has_local_changes(&root).await {
            return Err(code("update.local_changes"));
        }

        fs::create_dir_all(update_dir()).map_err(|e| e.to_string())?;
        let _ = fs::remove_file(status_file());
        let log = fs::File::create(log_file()).map_err(|e| e.to_string())?;
        let log_err = log.try_clone().map_err(|e| e.to_string())?;

        let mut child = std::process::Command::new("bash")
            .arg(root.join("update.sh"))
            .arg("--yes")
            // The app has no LANG when launched from the GUI; use the UI language.
            .arg("--lang")
            .arg(if lang == "en" { "en" } else { "es" })
            .arg("--status-file")
            .arg(status_file())
            .current_dir(&root)
            .stdin(Stdio::null())
            .stdout(log)
            .stderr(log_err)
            // Own process group: the script outlives the app it is about to stop.
            .process_group(0)
            .spawn()
            .map_err(|_| code("update.spawn_failed"))?;

        write_status(
            "checking",
            1,
            &format!("v{}", target.trim_start_matches('v')),
            child.id(),
        );
        std::thread::spawn(move || {
            let _ = child.wait();
        });

        tauri::async_runtime::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_millis(300)).await;
                match read_status() {
                    Some(s) if s.phase == "applying" => {
                        app.exit(0);
                        return;
                    }
                    Some(s) if !s.alive || matches!(s.phase.as_str(), "error" | "done") => return,
                    None => return,
                    _ => {}
                }
            }
        });
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn picks_the_highest_stable_tag() {
        let out = "\
a1\trefs/tags/v0.8.1
b2\trefs/tags/v0.10.0
c3\trefs/tags/v0.9.9
d4\trefs/tags/v1.0.0-beta.1
e5\trefs/tags/nightly
";
        assert_eq!(latest_stable_tag(out).as_deref(), Some("v0.10.0"));
    }

    #[test]
    fn no_stable_tag_means_none() {
        assert_eq!(latest_stable_tag("a\trefs/tags/v1.0.0-rc.1\n"), None);
        assert_eq!(latest_stable_tag(""), None);
    }

    #[test]
    fn versions_compare_numerically() {
        assert!(parse_stable_version("v0.10.0") > parse_stable_version("0.9.9"));
        assert_eq!(parse_stable_version("v1.2"), None);
        assert_eq!(parse_stable_version("v1.2.3.4"), None);
    }

    #[test]
    fn status_json_from_the_script_parses() {
        let raw = r#"{"phase":"downloading","percent":42,"target":"v0.9.0","detail":"21/50 packages","pid":123,"updated_at":1790000000}"#;
        let status: UpdateStatus = serde_json::from_str(raw).unwrap();
        assert_eq!(status.phase, "downloading");
        assert_eq!(status.percent, Some(42));
        assert!(!status.alive);

        let error = r#"{"phase":"error","percent":null,"target":"","detail":"boom","pid":1,"updated_at":1}"#;
        let status: UpdateStatus = serde_json::from_str(error).unwrap();
        assert_eq!(status.percent, None);
    }

    #[test]
    fn only_a_live_unfinished_run_counts_as_in_progress() {
        let mut status = UpdateStatus {
            phase: "installing".into(),
            percent: Some(90),
            target: "v0.9.0".into(),
            detail: String::new(),
            pid: 1,
            updated_at: 0,
            alive: true,
        };
        assert!(in_progress(&status));
        status.alive = false;
        assert!(!in_progress(&status));
        status.alive = true;
        status.phase = "error".into();
        assert!(!in_progress(&status));
        status.phase = "restarting".into();
        assert!(!in_progress(&status));
    }
}
