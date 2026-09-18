mod install;

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Read};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

pub use install::{
    clear_progress, ensure_stt_binary, managed_binary_path, set_error, set_progress,
};

#[allow(dead_code)]
pub const STT_PORT: u16 = 18765;
#[allow(dead_code)]
pub const PARAKEET_MODEL: &str = "parakeet-tdt-0.6b-v3-q8";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentStatus {
    pub state: String,
    pub message: String,
    pub progress: Option<f32>,
}

impl ComponentStatus {
    fn missing(message: &str) -> Self {
        Self {
            state: "missing".into(),
            message: message.into(),
            progress: None,
        }
    }
    fn ready(message: &str) -> Self {
        Self {
            state: "ready".into(),
            message: message.into(),
            progress: None,
        }
    }
    fn running(message: &str) -> Self {
        Self {
            state: "running".into(),
            message: message.into(),
            progress: None,
        }
    }
    fn error(message: &str) -> Self {
        Self {
            state: "error".into(),
            message: message.into(),
            progress: None,
        }
    }
    fn stopped(message: &str) -> Self {
        Self {
            state: "stopped".into(),
            message: message.into(),
            progress: None,
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct InstallProgress {
    pub phase: String,
    pub message: String,
    pub progress: Option<f32>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeStatus {
    pub stt_binary: ComponentStatus,
    pub stt_model: ComponentStatus,
    pub stt_server: ComponentStatus,
    pub llm_binary: ComponentStatus,
    pub llm_server: ComponentStatus,
    pub llm_model: Option<String>,
    pub llm_model_status: ComponentStatus,
    pub dictation_ready: bool,
}

pub struct RuntimeManager {
    stt_child: Option<Child>,
    llm_child: Option<Child>,
    we_started_llm: bool,
    models_dir: PathBuf,
    runtime_dir: PathBuf,
    stt_port: u16,
    llm_url: String,
    llm_model: String,
    language: Option<String>,
    last_stt_error: Option<String>,
    install: Arc<Mutex<InstallProgress>>,
}

impl RuntimeManager {
    pub fn new(
        models_dir: PathBuf,
        runtime_dir: PathBuf,
        stt_port: u16,
        llm_url: String,
        llm_model: String,
    ) -> Self {
        let _ = std::fs::create_dir_all(&models_dir);
        let _ = std::fs::create_dir_all(&runtime_dir);
        Self {
            stt_child: None,
            llm_child: None,
            we_started_llm: false,
            models_dir,
            runtime_dir,
            stt_port,
            llm_url,
            llm_model,
            language: None,
            last_stt_error: None,
            install: Arc::new(Mutex::new(InstallProgress::default())),
        }
    }

    pub fn runtime_dir(&self) -> PathBuf {
        self.runtime_dir.clone()
    }

    pub fn install_handle(&self) -> Arc<Mutex<InstallProgress>> {
        self.install.clone()
    }

    pub fn set_language(&mut self, language: Option<String>) {
        self.language = language;
    }

    pub fn language(&self) -> Option<String> {
        self.language.clone()
    }

    pub fn stt_base_url(&self) -> String {
        format!("http://127.0.0.1:{}", self.stt_port)
    }

    pub fn llm_tags_url(&self) -> String {
        format!("{}/api/tags", self.llm_url)
    }

    pub fn find_stt_binary(&self) -> Option<PathBuf> {
        find_binary(
            "nemo-speech",
            "NEMO_SPEECH_BIN",
            &stt_search_paths(&self.runtime_dir),
        )
    }

    pub fn find_llm_binary() -> Option<PathBuf> {
        find_binary("ollama", "OLLAMA_BIN", &llm_search_paths())
    }

    pub fn parakeet_path(&self) -> PathBuf {
        self.models_dir.join("parakeet-tdt-0.6b-v3.q8_0.gguf")
    }

    #[allow(dead_code)]
    pub fn models_dir(&self) -> &PathBuf {
        &self.models_dir
    }

    pub fn status(&self, download_progress: Option<f32>) -> RuntimeStatus {
        let install = self
            .install
            .lock()
            .ok()
            .map(|g| g.clone())
            .unwrap_or_default();

        let stt_binary = if let Some(p) = self.find_stt_binary() {
            ComponentStatus::ready(&p.display().to_string())
        } else if install.phase == "downloading_cli"
            || install.phase == "verifying"
            || install.phase == "extracting"
        {
            ComponentStatus {
                state: "downloading".into(),
                message: install.message.clone(),
                progress: install.progress,
            }
        } else if install.phase == "error" {
            ComponentStatus::error(install.error.as_deref().unwrap_or(&install.message))
        } else {
            ComponentStatus::missing("nemo-speech no está instalado. Pulsa Instalar y arrancar.")
        };

        let model_path = self.parakeet_path();
        let stt_model = if model_path.exists() {
            ComponentStatus::ready(&model_path.display().to_string())
        } else if let Some(p) = download_progress {
            ComponentStatus {
                state: "downloading".into(),
                message: format!("Descargando Parakeet Q8 ({:.0}%)", p),
                progress: Some(p),
            }
        } else if install.phase == "downloading_model" {
            ComponentStatus {
                state: "downloading".into(),
                message: install.message.clone(),
                progress: install.progress,
            }
        } else {
            ComponentStatus::missing("Modelo Parakeet Q8 no descargado.")
        };

        let stt_ready = self.stt_is_ready_blocking();
        let stt_server = if stt_ready {
            ComponentStatus::running(&self.stt_base_url())
        } else if let Some(err) = &self.last_stt_error {
            ComponentStatus::error(err)
        } else if self.stt_child.is_some() || install.phase == "starting" {
            ComponentStatus {
                state: "starting".into(),
                message: "Cargando modelo en RAM…".into(),
                progress: None,
            }
        } else if self.find_stt_binary().is_some() && model_path.exists() {
            ComponentStatus::stopped("Servidor STT parado.")
        } else {
            ComponentStatus::missing("Servidor STT no arrancado.")
        };

        let llm_bin = Self::find_llm_binary();
        let ollama_app = ollama_app_installed();
        let probe = self.llm_probe();

        let llm_binary = match &llm_bin {
            Some(p) => ComponentStatus::ready(&p.display().to_string()),
            None if probe.ready => {
                ComponentStatus::ready("Ollama responde en HTTP (CLI no está en PATH).")
            }
            None if ollama_app => ComponentStatus::ready("/Applications/Ollama.app"),
            None => ComponentStatus::missing(
                "Ollama no está instalado (opcional). El dictado funciona sin él.",
            ),
        };

        let llm_server = if probe.ready {
            ComponentStatus::running(&self.llm_url)
        } else if llm_bin.is_some() || ollama_app {
            ComponentStatus::stopped(&format!(
                "Ollama está instalado pero no responde en {}.",
                self.llm_url
            ))
        } else {
            ComponentStatus::missing("LLM no instalado. El dictado sigue funcionando sin él.")
        };

        let configured = self.llm_model.clone();
        let model_found = probe.models.iter().any(|m| model_matches(m, &configured));
        let llm_model_status = if !probe.ready {
            if llm_bin.is_some() || ollama_app {
                ComponentStatus::stopped(&format!("Arranca Ollama para usar {}.", configured))
            } else {
                ComponentStatus::missing("Sin servidor LLM.")
            }
        } else if model_found {
            ComponentStatus::ready(&configured)
        } else {
            ComponentStatus::missing(&format!(
                "{} no está descargado en Ollama. El dictado sigue sin LLM.",
                configured
            ))
        };

        RuntimeStatus {
            dictation_ready: stt_ready && model_path.exists(),
            stt_binary,
            stt_model,
            stt_server,
            llm_binary,
            llm_server,
            llm_model: if probe.ready && model_found {
                Some(configured)
            } else if probe.ready {
                probe.models.first().cloned()
            } else {
                None
            },
            llm_model_status,
        }
    }

    pub fn stt_is_ready_blocking(&self) -> bool {
        http_ok_off_tokio(format!("{}/ready", self.stt_base_url()))
    }

    fn llm_is_ready_blocking(&self) -> bool {
        self.llm_probe().ready
    }

    fn llm_probe(&self) -> LlmProbe {
        let llm_url = self.llm_url.clone();
        std::thread::Builder::new()
            .name("murmullo-llm-probe".into())
            .spawn(move || probe_llm(&llm_url))
            .ok()
            .and_then(|handle| handle.join().ok())
            .unwrap_or_default()
    }

    pub fn start_stt(&mut self, model_path: &Path) -> Result<()> {
        let ready_url = format!("{}/ready", self.stt_base_url());
        if self.stt_is_ready_blocking() {
            crate::pipeline::log(
                "nemo",
                format!(
                    "already serving {ready_url} — reusing existing nemo-speech (not spawning)"
                ),
            );
            return Ok(());
        }

        self.stop_stt();

        let bin = self.find_stt_binary().ok_or_else(|| {
            anyhow!("nemo-speech no encontrado. Pulsa Instalar y arrancar en Runtimes.")
        })?;

        if !model_path.exists() {
            return Err(anyhow!("Modelo no encontrado: {}", model_path.display()));
        }

        let device = if cfg!(target_os = "macos") && cfg!(target_arch = "aarch64") {
            "metal"
        } else {
            "cpu"
        };

        crate::pipeline::log(
            "nemo",
            format!(
                "spawning {} serve --host 127.0.0.1 --port {} --asr-model {} --device {}",
                bin.display(),
                self.stt_port,
                model_path.display(),
                device
            ),
        );

        match spawn_nemo_serve(&bin, model_path, self.stt_port, device) {
            Ok(mut child) => {
                attach_nemo_logs(&mut child);
                crate::pipeline::log(
                    "nemo",
                    format!(
                        "pid={} listening on {} model={}",
                        child.id(),
                        self.stt_base_url(),
                        model_path.display()
                    ),
                );
                self.stt_child = Some(child);
                self.last_stt_error = None;
                Ok(())
            }
            Err(e) => {
                if device == "metal" {
                    crate::pipeline::log("nemo", format!("Metal spawn failed ({e}), retrying CPU"));
                    let mut child = spawn_nemo_serve(&bin, model_path, self.stt_port, "cpu")?;
                    attach_nemo_logs(&mut child);
                    crate::pipeline::log(
                        "nemo",
                        format!("pid={} CPU fallback on {}", child.id(), self.stt_base_url()),
                    );
                    self.stt_child = Some(child);
                    self.last_stt_error = None;
                    Ok(())
                } else {
                    self.last_stt_error = Some(e.to_string());
                    crate::pipeline::log("nemo", format!("spawn FAILED: {e}"));
                    Err(e.into())
                }
            }
        }
    }

    pub fn stop_stt(&mut self) {
        if let Some(mut child) = self.stt_child.take() {
            terminate_child(&mut child);
            crate::pipeline::log("nemo", "serve stopped");
        }
    }

    pub fn start_llm(&mut self) -> Result<()> {
        if self.llm_is_ready_blocking() {
            return Ok(());
        }
        if let Some(bin) = Self::find_llm_binary() {
            let child = Command::new(bin)
                .arg("serve")
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()?;
            self.llm_child = Some(child);
            self.we_started_llm = true;
            crate::pipeline::log("llm", "ollama serve started");
            return Ok(());
        }
        if ollama_app_installed() {
            let status = Command::new("open").args(["-a", "Ollama"]).status()?;
            if !status.success() {
                return Err(anyhow!("No se pudo abrir Ollama.app"));
            }
            self.we_started_llm = false;
            crate::pipeline::log("llm", "opened Ollama.app");
            return Ok(());
        }
        Err(anyhow!(
            "Ollama no está instalado. Instálalo desde https://ollama.com (opcional)."
        ))
    }

    pub fn stop_llm(&mut self) {
        if self.we_started_llm {
            if let Some(mut child) = self.llm_child.take() {
                terminate_child(&mut child);
            }
            self.we_started_llm = false;
        }
    }

    #[allow(dead_code)]
    pub async fn wait_stt_ready(&self, timeout: Duration) -> Result<()> {
        wait_http_ready(&format!("{}/ready", self.stt_base_url()), timeout).await
    }

    #[allow(dead_code)]
    pub async fn transcribe_wav(&self, wav_bytes: Vec<u8>) -> Result<String> {
        transcribe_wav_at(&self.stt_base_url(), wav_bytes, self.language.clone()).await
    }

    #[allow(dead_code)]
    pub async fn rewrite_with_llm(&self, system_prompt: &str, user_text: &str) -> Result<String> {
        rewrite_with_llm_at(&self.llm_url, &self.llm_model, system_prompt, user_text).await
    }
}

pub async fn is_http_ok(url: &str) -> bool {
    let Ok(client) = reqwest::Client::builder()
        .timeout(Duration::from_secs(1))
        .build()
    else {
        return false;
    };
    client
        .get(url)
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

pub async fn wait_http_ready(url: &str, timeout: Duration) -> Result<()> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()?;
    let start = std::time::Instant::now();
    loop {
        if start.elapsed() > timeout {
            return Err(anyhow!("Timeout esperando a que el runtime esté listo"));
        }
        if let Ok(resp) = client.get(url).send().await {
            if resp.status().is_success() {
                return Ok(());
            }
        }
        tokio::time::sleep(Duration::from_millis(400)).await;
    }
}

pub async fn transcribe_wav_at(
    base_url: &str,
    wav_bytes: Vec<u8>,
    language: Option<String>,
) -> Result<String> {
    let url = format!("{}/v1/audio/transcriptions", base_url);
    let wav_kb = wav_bytes.len() as f32 / 1024.0;
    let lang_label = language
        .as_deref()
        .filter(|l| *l != "auto")
        .unwrap_or("auto");
    crate::pipeline::log(
        "stt",
        format!(
            "POST {url} wav={wav_kb:.1}KB lang={lang_label} model=default timeout=120s (nemo-speech OpenAI-compat, same as OpenChamber server STT)"
        ),
    );

    let part = reqwest::multipart::Part::bytes(wav_bytes)
        .file_name("recording.wav")
        .mime_str("audio/wav")?;
    let mut form = reqwest::multipart::Form::new()
        .part("file", part)
        .text("model", "default")
        .text("response_format", "json");

    if let Some(lang) = language {
        if lang != "auto" {
            form = form.text("language", lang);
        }
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(120))
        .build()?;
    let started = Instant::now();
    let resp = match client.post(&url).multipart(form).send().await {
        Ok(resp) => resp,
        Err(e) => {
            crate::pipeline::log(
                "stt",
                format!("FAILED connect {url}: {e} — is nemo-speech running on {base_url}?"),
            );
            return Err(anyhow!("No se pudo conectar a nemo-speech en {url}: {e}"));
        }
    };

    let status = resp.status();
    let elapsed_ms = started.elapsed().as_millis();
    let body = resp.text().await.unwrap_or_default();
    crate::pipeline::log(
        "stt",
        format!(
            "HTTP {status} in {elapsed_ms}ms body={}B from {url}",
            body.len()
        ),
    );

    if !status.is_success() {
        let preview: String = body.chars().take(400).collect();
        crate::pipeline::log("stt", format!("error body: {preview}"));
        return Err(anyhow!("nemo-speech {status}: {preview}"));
    }

    let json: serde_json::Value = serde_json::from_str(&body).unwrap_or(serde_json::Value::Null);
    let text = json
        .get("text")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    let preview: String = text.chars().take(80).collect();
    if text.is_empty() {
        let keys: Vec<&str> = json
            .as_object()
            .map(|o| o.keys().map(|k| k.as_str()).collect())
            .unwrap_or_default();
        crate::pipeline::log(
            "stt",
            format!("empty text from nemo-speech; json keys={keys:?}"),
        );
    } else {
        crate::pipeline::log(
            "stt",
            format!("nemo-speech text=\"{preview}\" chars={}", text.len()),
        );
    }
    Ok(text)
}

pub async fn rewrite_with_llm_at(
    llm_url: &str,
    llm_model: &str,
    system_prompt: &str,
    user_text: &str,
) -> Result<String> {
    let url = format!("{}/api/chat", llm_url);
    let body = serde_json::json!({
        "model": llm_model,
        "stream": false,
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": user_text }
        ]
    });
    crate::pipeline::log(
        "llm",
        format!("POST {url} model={llm_model} chars={}", user_text.len()),
    );
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()?;
    let resp = match client.post(&url).json(&body).send().await {
        Ok(resp) => resp,
        Err(e) => {
            crate::pipeline::log("llm", format!("FAILED {url}: {e}"));
            return Err(anyhow!("LLM connect error: {e}"));
        }
    };
    let status = resp.status();
    if !status.is_success() {
        let err_body = resp.text().await.unwrap_or_default();
        let preview: String = err_body.chars().take(240).collect();
        crate::pipeline::log("llm", format!("HTTP {status} body={preview}"));
        return Err(anyhow!("LLM HTTP {status}: {preview}"));
    }
    let json: serde_json::Value = resp.json().await?;
    let text = json
        .pointer("/message/content")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if text.is_empty() {
        crate::pipeline::log("llm", "empty rewrite");
        return Err(anyhow!("LLM returned empty text"));
    }
    crate::pipeline::log("llm", format!("rewrite chars={}", text.len()));
    Ok(text)
}

pub async fn llm_has_model(llm_url: &str, wanted: &str) -> bool {
    let Ok(client) = reqwest::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
    else {
        return false;
    };
    let Ok(resp) = client.get(format!("{llm_url}/api/tags")).send().await else {
        return false;
    };
    if !resp.status().is_success() {
        return false;
    }
    let models = parse_ollama_models(resp.json::<serde_json::Value>().await.ok());
    models.iter().any(|m| model_matches(m, wanted))
}

impl Drop for RuntimeManager {
    fn drop(&mut self) {
        self.stop_stt();
        self.stop_llm();
    }
}

fn terminate_child(child: &mut Child) {
    #[cfg(unix)]
    {
        let pid = child.id();
        let _ = Command::new("kill")
            .args(["-TERM", &pid.to_string()])
            .status();
        let started = std::time::Instant::now();
        loop {
            match child.try_wait() {
                Ok(Some(_)) => return,
                Ok(None) if started.elapsed() < Duration::from_secs(3) => {
                    std::thread::sleep(Duration::from_millis(100));
                }
                _ => break,
            }
        }
    }
    let _ = child.kill();
    let _ = child.wait();
}

fn spawn_nemo_serve(
    bin: &Path,
    model_path: &Path,
    port: u16,
    device: &str,
) -> std::io::Result<Child> {
    let mut cmd = Command::new(bin);
    cmd.arg("serve")
        .arg("--host")
        .arg("127.0.0.1")
        .arg("--port")
        .arg(port.to_string())
        .arg("--asr-model")
        .arg(model_path)
        .arg("--no-ui")
        .arg("--device")
        .arg(device)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    apply_runtime_lib_path(&mut cmd, bin);
    cmd.spawn()
}

fn attach_nemo_logs(child: &mut Child) {
    if let Some(stdout) = child.stdout.take() {
        pump_nemo_stdio(stdout, "stdout");
    }
    if let Some(stderr) = child.stderr.take() {
        pump_nemo_stdio(stderr, "stderr");
    }
}

fn pump_nemo_stdio(stream: impl Read + Send + 'static, stream_name: &'static str) {
    let _ = std::thread::Builder::new()
        .name(format!("nemo-{stream_name}"))
        .spawn(move || {
            let reader = BufReader::new(stream);
            for line in reader.lines() {
                match line {
                    Ok(line) if !line.trim().is_empty() => {
                        crate::pipeline::log("nemo", format!("{stream_name}: {line}"));
                    }
                    Ok(_) => {}
                    Err(_) => break,
                }
            }
        });
}

#[derive(Debug, Default, Clone)]
struct LlmProbe {
    ready: bool,
    models: Vec<String>,
}

fn http_ok_off_tokio(url: String) -> bool {
    std::thread::Builder::new()
        .name("murmullo-http-probe".into())
        .spawn(move || {
            let client = reqwest::blocking::Client::builder()
                .timeout(Duration::from_secs(2))
                .build();
            let Ok(client) = client else {
                return false;
            };
            client
                .get(&url)
                .send()
                .map(|r| r.status().is_success())
                .unwrap_or(false)
        })
        .ok()
        .and_then(|handle| handle.join().ok())
        .unwrap_or(false)
}

fn probe_llm(llm_url: &str) -> LlmProbe {
    let client = match reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
    {
        Ok(c) => c,
        Err(_) => return LlmProbe::default(),
    };

    let tags_url = format!("{}/api/tags", llm_url);
    if let Ok(resp) = client.get(&tags_url).send() {
        if resp.status().is_success() {
            let models = parse_ollama_models(resp.json::<serde_json::Value>().ok());
            return LlmProbe {
                ready: true,
                models,
            };
        }
    }

    let version_url = format!("{}/api/version", llm_url);
    if let Ok(resp) = client.get(&version_url).send() {
        if resp.status().is_success() {
            return LlmProbe {
                ready: true,
                models: Vec::new(),
            };
        }
    }

    LlmProbe::default()
}

fn parse_ollama_models(json: Option<serde_json::Value>) -> Vec<String> {
    let Some(json) = json else {
        return Vec::new();
    };
    json.get("models")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|m| {
                    m.get("name")
                        .or_else(|| m.get("model"))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                })
                .collect()
        })
        .unwrap_or_default()
}

fn model_matches(installed: &str, wanted: &str) -> bool {
    let inst = installed.to_lowercase();
    let want = wanted.to_lowercase();
    if inst == want {
        return true;
    }
    let inst_base = inst.split(':').next().unwrap_or(&inst);
    let want_base = want.split(':').next().unwrap_or(&want);
    inst_base == want_base
}

fn ollama_app_installed() -> bool {
    Path::new("/Applications/Ollama.app").is_dir()
}

fn stt_search_paths(runtime_dir: &Path) -> Vec<PathBuf> {
    let mut paths = vec![
        managed_binary_path(runtime_dir),
        runtime_dir.join("nemo-speech"),
    ];
    if let Some(home) = dirs::home_dir() {
        paths.push(home.join("Library/Application Support/NeMoSpeech/bin/nemo-speech"));
        paths.push(home.join(".local/bin/nemo-speech"));
    }
    paths.extend(common_bin_paths("nemo-speech"));
    paths
}

fn common_bin_paths(name: &str) -> Vec<PathBuf> {
    vec![
        PathBuf::from("/opt/homebrew/bin").join(name),
        PathBuf::from("/usr/local/bin").join(name),
        PathBuf::from("/usr/bin").join(name),
    ]
}

fn llm_search_paths() -> Vec<PathBuf> {
    let mut paths = common_bin_paths("ollama");
    paths.push(PathBuf::from("/opt/homebrew/opt/ollama/bin/ollama"));
    paths.push(PathBuf::from(
        "/Applications/Ollama.app/Contents/Resources/ollama",
    ));
    paths.push(PathBuf::from(
        "/Applications/Ollama.app/Contents/MacOS/ollama",
    ));
    if let Some(home) = dirs::home_dir() {
        paths.push(home.join(".local/bin/ollama"));
        paths.push(home.join(".ollama/bin/ollama"));
    }
    paths
}

fn apply_runtime_lib_path(cmd: &mut Command, bin: &Path) {
    let Some(bin_dir) = bin.parent() else {
        return;
    };
    let lib_dir = bin_dir
        .parent()
        .map(|p| p.join("lib"))
        .unwrap_or_else(|| bin_dir.join("lib"));
    if !lib_dir.is_dir() {
        return;
    }
    #[cfg(target_os = "macos")]
    {
        cmd.env("DYLD_LIBRARY_PATH", &lib_dir);
    }
    #[cfg(target_os = "linux")]
    {
        cmd.env("LD_LIBRARY_PATH", &lib_dir);
    }
}

fn is_executable(path: &Path) -> bool {
    if !path.is_file() {
        return false;
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(meta) = std::fs::metadata(path) {
            return meta.permissions().mode() & 0o111 != 0;
        }
    }
    true
}

fn find_binary(name: &str, env_key: &str, extra: &[PathBuf]) -> Option<PathBuf> {
    if let Ok(p) = std::env::var(env_key) {
        let pb = PathBuf::from(p);
        if is_executable(&pb) {
            return Some(pb);
        }
    }
    for candidate in extra {
        if is_executable(candidate) {
            return Some(candidate.clone());
        }
    }
    if let Ok(path) = std::env::var("PATH") {
        for dir in std::env::split_paths(&path) {
            let candidate = dir.join(name);
            if is_executable(&candidate) {
                return Some(candidate);
            }
        }
    }
    None
}
