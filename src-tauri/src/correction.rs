use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::sync::oneshot;
use uuid::Uuid;

pub const REQUEST_EVENT: &str = "browser-correction-request";
pub const CANCEL_EVENT: &str = "browser-correction-cancel";
pub const STATUS_EVENT: &str = "correction-status";
pub const DOWNLOAD_EVENT: &str = "builtin-model-download";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrectionStatus {
    pub state: String,
    pub progress: Option<u8>,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub backend: Option<String>,
}

impl Default for CorrectionStatus {
    fn default() -> Self {
        Self {
            state: "unavailable".into(),
            progress: None,
            provider: None,
            model: None,
            backend: None,
        }
    }
}

#[derive(Debug, Clone)]
pub struct BrowserCorrectionOutcome {
    pub text: Option<String>,
    pub used_model: bool,
}

#[derive(Clone, Serialize)]
struct BrowserCorrectionRequest {
    id: String,
    text: String,
    language: Option<String>,
}

pub struct CorrectionBridge {
    pending: Mutex<HashMap<String, oneshot::Sender<BrowserCorrectionOutcome>>>,
    hosts: Mutex<HashSet<String>>,
    status: Mutex<CorrectionStatus>,
}

impl CorrectionBridge {
    pub fn new() -> Self {
        Self {
            pending: Mutex::new(HashMap::new()),
            hosts: Mutex::new(HashSet::new()),
            status: Mutex::new(CorrectionStatus::default()),
        }
    }

    pub fn register(&self, label: &str) {
        if let Ok(mut hosts) = self.hosts.lock() {
            hosts.insert(label.to_string());
        }
    }

    pub fn unregister(&self, label: &str) {
        if let Ok(mut hosts) = self.hosts.lock() {
            hosts.remove(label);
        }
    }

    pub fn status(&self) -> CorrectionStatus {
        self.status
            .lock()
            .map(|status| status.clone())
            .unwrap_or_default()
    }

    pub fn report(&self, app: &AppHandle, status: CorrectionStatus) {
        if let Ok(mut slot) = self.status.lock() {
            *slot = status.clone();
        }
        let _ = app.emit(STATUS_EVENT, &status);
        let busy = self
            .pending
            .lock()
            .map(|pending| !pending.is_empty())
            .unwrap_or(false);
        if busy {
            if let Some(message) = processing_message(&status) {
                let _ = app.emit(
                    "recording-state-changed",
                    serde_json::json!({ "state": "processing", "message": message }),
                );
            }
        }
    }

    pub fn submit(&self, id: &str, text: Option<String>, used_model: bool) {
        let sender = self
            .pending
            .lock()
            .ok()
            .and_then(|mut pending| pending.remove(id));
        if let Some(sender) = sender {
            let _ = sender.send(BrowserCorrectionOutcome { text, used_model });
        }
    }

    pub fn cancel_all(&self, app: &AppHandle) {
        let _ = app.emit(CANCEL_EVENT, ());
        let pending = self
            .pending
            .lock()
            .map(|mut pending| std::mem::take(&mut *pending))
            .unwrap_or_default();
        for (_, sender) in pending {
            let _ = sender.send(BrowserCorrectionOutcome {
                text: None,
                used_model: false,
            });
        }
    }

    pub async fn request(
        &self,
        app: &AppHandle,
        text: &str,
        language: Option<String>,
    ) -> Option<BrowserCorrectionOutcome> {
        let hosts = self.hosts.lock().map(|hosts| hosts.len()).unwrap_or(0);
        if hosts == 0 {
            crate::pipeline::log(
                "llm",
                "browser corrector not mounted — keeping dictionary text",
            );
            return None;
        }

        let id = Uuid::new_v4().to_string();
        let (sender, receiver) = oneshot::channel();
        if let Ok(mut pending) = self.pending.lock() {
            pending.insert(id.clone(), sender);
        } else {
            return None;
        }

        let _ = app.emit(
            REQUEST_EVENT,
            BrowserCorrectionRequest {
                id: id.clone(),
                text: text.to_string(),
                language,
            },
        );

        match tokio::time::timeout(Duration::from_secs(180), receiver).await {
            Ok(Ok(outcome)) => Some(outcome),
            Ok(Err(_)) => None,
            Err(_) => {
                if let Ok(mut pending) = self.pending.lock() {
                    pending.remove(&id);
                }
                crate::pipeline::log(
                    "llm",
                    "browser correction timed out — keeping dictionary text",
                );
                None
            }
        }
    }
}

impl Default for CorrectionBridge {
    fn default() -> Self {
        Self::new()
    }
}

fn processing_message(status: &CorrectionStatus) -> Option<String> {
    match status.state.as_str() {
        "downloading" => Some(crate::codes::code_json(
            "status.browserDownloading",
            serde_json::json!({ "pct": status.progress.unwrap_or(0) }),
        )),
        "checking" | "loading" => Some(crate::codes::code("status.browserLoading")),
        "processing" => Some(crate::codes::code("status.browserCorrecting")),
        _ => None,
    }
}
