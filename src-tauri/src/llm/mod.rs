use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;
use tokio::process::Command as TokioCommand;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LlmKind {
    Server,
    Cli,
}

impl LlmKind {
    fn as_str(self) -> &'static str {
        match self {
            LlmKind::Server => "server",
            LlmKind::Cli => "cli",
        }
    }
}

struct ProviderSpec {
    id: &'static str,
    aliases: &'static [&'static str],
    label: &'static str,
    kind: LlmKind,
    binaries: &'static [&'static str],
    env_keys: &'static [&'static str],
    extra_paths: fn() -> Vec<PathBuf>,
    default_model: &'static str,
    fallback_models: &'static [&'static str],
    hint: &'static str,
}

const PROVIDERS: &[ProviderSpec] = &[
    ProviderSpec {
        id: "ollama",
        aliases: &[],
        label: "Ollama",
        kind: LlmKind::Server,
        binaries: &["ollama"],
        env_keys: &["OLLAMA_BIN"],
        extra_paths: ollama_extra_paths,
        default_model: "llama3.2",
        fallback_models: &["llama3.2", "llama3.1", "qwen2.5", "mistral", "gemma3"],
        hint: "Servidor local. Instala Ollama y arranca `ollama serve`.",
    },
    ProviderSpec {
        id: "kimi",
        aliases: &[],
        label: "Kimi",
        kind: LlmKind::Cli,
        binaries: &["kimi"],
        env_keys: &["KIMI_BIN"],
        extra_paths: common_cli_paths,
        default_model: "kimi-k2.5",
        fallback_models: &["kimi-k2.5", "kimi-for-coding", "kimi-code"],
        hint: "CLI `kimi`. Un prompt (`kimi -p`) reescribe el dictado.",
    },
    ProviderSpec {
        id: "kilo",
        aliases: &["kili"],
        label: "Kilo",
        kind: LlmKind::Cli,
        binaries: &["kilo", "kili"],
        env_keys: &["KILO_BIN", "KILI_BIN"],
        extra_paths: common_cli_paths,
        default_model: "auto",
        fallback_models: &["auto", "anthropic/claude-sonnet-4", "openai/gpt-5"],
        hint: "CLI `kilo` (también se detecta `kili`). `kilo run` reescribe el texto.",
    },
    ProviderSpec {
        id: "cursor",
        aliases: &[],
        label: "Cursor",
        kind: LlmKind::Cli,
        binaries: &["agent", "cursor-agent"],
        env_keys: &["CURSOR_AGENT_BIN", "AGENT_BIN"],
        extra_paths: cursor_extra_paths,
        default_model: "auto",
        fallback_models: &[
            "auto",
            "composer-2",
            "grok-4.5",
            "claude-4.6-sonnet",
            "gpt-5.4",
        ],
        hint: "CLI `agent` o `cursor-agent` en modo ask, sin editar archivos.",
    },
    ProviderSpec {
        id: "claude",
        aliases: &[],
        label: "Claude",
        kind: LlmKind::Cli,
        binaries: &["claude"],
        env_keys: &["CLAUDE_BIN"],
        extra_paths: common_cli_paths,
        default_model: "sonnet",
        fallback_models: &["sonnet", "opus", "haiku"],
        hint: "CLI `claude -p`. Usa el modelo que elijas (sonnet, opus, haiku…).",
    },
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmProviderInfo {
    pub id: String,
    pub label: String,
    pub kind: String,
    pub installed: bool,
    pub ready: bool,
    pub binary: Option<String>,
    pub default_model: String,
    pub models: Vec<String>,
    pub hint: String,
}

#[derive(Debug, Clone)]
pub struct LlmSnapshot {
    pub provider: String,
    pub label: String,
    pub kind: String,
    pub hint: String,
    pub installed: bool,
    pub ready: bool,
    pub binary: Option<String>,
    pub model: String,
    pub model_ready: bool,
    pub models: Vec<String>,
}

pub fn normalize_provider(raw: &str) -> String {
    let trimmed = raw.trim().to_lowercase();
    if trimmed.is_empty() {
        return "ollama".into();
    }
    for spec in PROVIDERS {
        if spec.id == trimmed || spec.aliases.iter().any(|alias| *alias == trimmed) {
            return spec.id.to_string();
        }
    }
    trimmed
}

pub fn default_model_for(provider: &str) -> &'static str {
    spec_for(provider)
        .map(|s| s.default_model)
        .unwrap_or("llama3.2")
}

pub fn list_providers(llm_url: &str) -> Vec<LlmProviderInfo> {
    PROVIDERS
        .iter()
        .map(|spec| provider_info(spec, llm_url))
        .collect()
}

pub fn snapshot(provider: &str, llm_url: &str, configured_model: &str) -> LlmSnapshot {
    let id = normalize_provider(provider);
    let spec = spec_for(&id);
    let info = spec
        .map(|s| provider_info(s, llm_url))
        .unwrap_or_else(|| unknown_provider(&id));

    let model = if configured_model.trim().is_empty() {
        info.default_model.clone()
    } else {
        configured_model.to_string()
    };

    let model_known = info.models.is_empty()
        || info
            .models
            .iter()
            .any(|candidate| model_matches(candidate, &model));
    let model_ready = info.ready && (info.kind == "cli" || model_known);

    LlmSnapshot {
        provider: info.id,
        label: info.label,
        kind: info.kind,
        hint: info.hint,
        installed: info.installed,
        ready: info.ready,
        binary: info.binary,
        model,
        model_ready,
        models: info.models,
    }
}

pub fn start_backend(provider: &str, llm_url: &str) -> Result<StartOutcome> {
    let id = normalize_provider(provider);
    let spec = spec_for(&id).ok_or_else(|| anyhow!(crate::codes::code("llm.unknown_provider")))?;
    match spec.kind {
        LlmKind::Server => start_ollama(spec, llm_url),
        LlmKind::Cli => {
            if find_spec_binary(spec).is_some() {
                Ok(StartOutcome::AlreadyReady)
            } else {
                Err(anyhow!("{}", spec.hint))
            }
        }
    }
}

pub enum StartOutcome {
    Spawned(std::process::Child),
    OpenedApp,
    AlreadyReady,
}

pub fn is_server_provider(provider: &str) -> bool {
    spec_for(&normalize_provider(provider))
        .map(|s| s.kind == LlmKind::Server)
        .unwrap_or(false)
}

pub async fn provider_has_model(provider: &str, llm_url: &str, wanted: &str) -> bool {
    let id = normalize_provider(provider);
    let Some(spec) = spec_for(&id) else {
        return false;
    };
    if spec.kind == LlmKind::Cli {
        return find_spec_binary(spec).is_some() && !wanted.trim().is_empty();
    }
    ollama_has_model(llm_url, wanted).await
}

pub async fn rewrite(
    provider: &str,
    llm_url: &str,
    model: &str,
    system_prompt: &str,
    user_text: &str,
) -> Result<String> {
    let id = normalize_provider(provider);
    let spec = spec_for(&id).ok_or_else(|| anyhow!(crate::codes::code("llm.unknown_provider")))?;
    let prompt = compose_prompt(system_prompt, user_text);
    match spec.kind {
        LlmKind::Server => rewrite_ollama(llm_url, model, system_prompt, user_text).await,
        LlmKind::Cli => rewrite_cli(spec, model, &prompt).await,
    }
}

fn provider_info(spec: &ProviderSpec, llm_url: &str) -> LlmProviderInfo {
    let binary = find_spec_binary(spec);
    let (ready, live_models) = match spec.kind {
        LlmKind::Server => {
            let probe = probe_ollama(llm_url);
            (probe.ready, probe.models)
        }
        LlmKind::Cli => (binary.is_some(), Vec::new()),
    };
    let mut models = if live_models.is_empty() {
        spec.fallback_models
            .iter()
            .map(|s| (*s).to_string())
            .collect()
    } else {
        live_models
    };
    if !models.iter().any(|m| model_matches(m, spec.default_model)) {
        models.insert(0, spec.default_model.to_string());
    }
    models.sort();
    models.dedup();

    LlmProviderInfo {
        id: spec.id.to_string(),
        label: spec.label.to_string(),
        kind: spec.kind.as_str().to_string(),
        installed: binary.is_some() || (spec.id == "ollama" && (ready || ollama_app_installed())),
        ready,
        binary: binary.map(|p| p.display().to_string()),
        default_model: spec.default_model.to_string(),
        models,
        hint: spec.hint.to_string(),
    }
}

fn unknown_provider(id: &str) -> LlmProviderInfo {
    LlmProviderInfo {
        id: id.to_string(),
        label: id.to_string(),
        kind: "cli".into(),
        installed: false,
        ready: false,
        binary: None,
        default_model: String::new(),
        models: Vec::new(),
        hint: crate::codes::code("llm.unknown_provider"),
    }
}

fn spec_for(id: &str) -> Option<&'static ProviderSpec> {
    let normalized = normalize_provider(id);
    PROVIDERS.iter().find(|spec| spec.id == normalized)
}

fn compose_prompt(system_prompt: &str, user_text: &str) -> String {
    format!(
        "{system_prompt}\n\nTexto:\n{user_text}\n\nResponde únicamente con el texto final. Sin preámbulo, sin comillas y sin usar herramientas."
    )
}

async fn rewrite_ollama(
    llm_url: &str,
    llm_model: &str,
    system_prompt: &str,
    user_text: &str,
) -> Result<String> {
    let url = format!("{}/api/chat", llm_url.trim_end_matches('/'));
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
        format!(
            "POST {url} provider=ollama model={llm_model} chars={}",
            user_text.len()
        ),
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
    finish_rewrite(text)
}

async fn rewrite_cli(spec: &ProviderSpec, model: &str, prompt: &str) -> Result<String> {
    let bin = find_spec_binary(spec).ok_or_else(|| anyhow!("{}", spec.hint))?;
    let args = cli_args(spec.id, model, prompt);
    crate::pipeline::log(
        "llm",
        format!(
            "CLI {} {} model={model} chars={}",
            spec.id,
            bin.display(),
            prompt.len()
        ),
    );

    let scratch = crate::paths::llm_scratch_dir();
    let _ = std::fs::create_dir_all(&scratch);

    let mut cmd = TokioCommand::new(&bin);
    cmd.args(&args)
        .current_dir(&scratch)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .env("TERM", "dumb")
        .env("NO_COLOR", "1");

    let child = cmd
        .spawn()
        .map_err(|_e| anyhow!(crate::codes::code("llm.launch_failed")))?;
    let output = tokio::time::timeout(Duration::from_secs(45), child.wait_with_output())
        .await
        .map_err(|_| anyhow!(crate::codes::code("llm.timeout")))?
        .map_err(|_| anyhow!(crate::codes::code("llm.launch_failed")))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        let preview: String = err.chars().take(240).collect();
        crate::pipeline::log("llm", format!("CLI {} failed: {preview}", spec.id));
        return Err(anyhow!("{} error: {preview}", spec.label));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    finish_rewrite(clean_cli_output(&stdout))
}

fn cli_args(provider_id: &str, model: &str, prompt: &str) -> Vec<String> {
    let model = model.trim();
    let include_model =
        !model.is_empty() && !(provider_id == "kilo" && (model == "auto" || model == "kilo-auto"));
    match provider_id {
        "kimi" => {
            let mut args = vec![
                "-p".into(),
                prompt.into(),
                "--output-format".into(),
                "text".into(),
            ];
            if include_model {
                args.extend(["-m".into(), model.into()]);
            }
            args
        }
        "kilo" => {
            let mut args = vec![
                "run".into(),
                "--auto".into(),
                "--format".into(),
                "text".into(),
            ];
            if include_model {
                args.extend(["--model".into(), model.into()]);
            }
            args.push(prompt.into());
            args
        }
        "cursor" => {
            let mut args = vec![
                "-p".into(),
                prompt.into(),
                "--print".into(),
                "--mode".into(),
                "ask".into(),
                "--output-format".into(),
                "text".into(),
            ];
            if include_model {
                args.extend(["--model".into(), model.into()]);
            }
            args
        }
        "claude" => {
            let mut args = vec![
                "-p".into(),
                prompt.into(),
                "--output-format".into(),
                "text".into(),
                "--max-turns".into(),
                "1".into(),
            ];
            if include_model {
                args.extend(["--model".into(), model.into()]);
            }
            args
        }
        _ => vec!["-p".into(), prompt.into()],
    }
}

fn clean_cli_output(stdout: &str) -> String {
    let stripped = strip_ansi(stdout);
    let text = stripped.trim();
    if text.is_empty() {
        return String::new();
    }
    // Some CLIs print logs before the answer; keep the last non-empty block.
    let blocks: Vec<&str> = text
        .split("\n\n")
        .map(str::trim)
        .filter(|block| !block.is_empty())
        .collect();
    blocks.last().copied().unwrap_or(text).to_string()
}

fn strip_ansi(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut chars = input.chars().peekable();
    while let Some(ch) = chars.next() {
        if ch == '\u{1b}' {
            if chars.peek() == Some(&'[') {
                chars.next();
                for next in chars.by_ref() {
                    if next.is_ascii_alphabetic() {
                        break;
                    }
                }
            }
            continue;
        }
        out.push(ch);
    }
    out
}

fn finish_rewrite(text: String) -> Result<String> {
    let text = text.trim().to_string();
    if text.is_empty() {
        crate::pipeline::log("llm", "empty rewrite");
        return Err(anyhow!(crate::codes::code("llm.empty")));
    }
    crate::pipeline::log("llm", format!("rewrite chars={}", text.len()));
    Ok(text)
}

fn start_ollama(spec: &ProviderSpec, llm_url: &str) -> Result<StartOutcome> {
    if probe_ollama(llm_url).ready {
        return Ok(StartOutcome::AlreadyReady);
    }
    if let Some(bin) = find_spec_binary(spec) {
        let child = std::process::Command::new(bin)
            .arg("serve")
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()?;
        crate::pipeline::log("llm", "ollama serve started");
        return Ok(StartOutcome::Spawned(child));
    }
    if ollama_app_installed() {
        let status = std::process::Command::new("open")
            .args(["-a", "Ollama"])
            .status()?;
        if !status.success() {
            return Err(anyhow!("No se pudo abrir Ollama.app"));
        }
        crate::pipeline::log("llm", "opened Ollama.app");
        return Ok(StartOutcome::OpenedApp);
    }
    Err(anyhow!("{}", spec.hint))
}

#[derive(Debug, Default, Clone)]
struct OllamaProbe {
    ready: bool,
    models: Vec<String>,
}

fn probe_ollama(llm_url: &str) -> OllamaProbe {
    let url = llm_url.to_string();
    std::thread::Builder::new()
        .name("murmullo-llm-probe".into())
        .spawn(move || probe_ollama_blocking(&url))
        .ok()
        .and_then(|handle| handle.join().ok())
        .unwrap_or_default()
}

fn probe_ollama_blocking(llm_url: &str) -> OllamaProbe {
    let client = match reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
    {
        Ok(c) => c,
        Err(_) => return OllamaProbe::default(),
    };

    let tags_url = format!("{}/api/tags", llm_url.trim_end_matches('/'));
    if let Ok(resp) = client.get(&tags_url).send() {
        if resp.status().is_success() {
            let models = parse_ollama_models(resp.json::<serde_json::Value>().ok());
            return OllamaProbe {
                ready: true,
                models,
            };
        }
    }

    let version_url = format!("{}/api/version", llm_url.trim_end_matches('/'));
    if let Ok(resp) = client.get(&version_url).send() {
        if resp.status().is_success() {
            return OllamaProbe {
                ready: true,
                models: Vec::new(),
            };
        }
    }

    OllamaProbe::default()
}

async fn ollama_has_model(llm_url: &str, wanted: &str) -> bool {
    let Ok(client) = reqwest::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
    else {
        return false;
    };
    let Ok(resp) = client
        .get(format!("{}/api/tags", llm_url.trim_end_matches('/')))
        .send()
        .await
    else {
        return false;
    };
    if !resp.status().is_success() {
        return false;
    }
    let models = parse_ollama_models(resp.json::<serde_json::Value>().await.ok());
    models.iter().any(|m| model_matches(m, wanted))
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

fn find_spec_binary(spec: &ProviderSpec) -> Option<PathBuf> {
    let extra = (spec.extra_paths)();
    for name in spec.binaries {
        if let Some(found) = find_binary(name, spec.env_keys, &extra) {
            return Some(found);
        }
    }
    None
}

fn find_binary(name: &str, env_keys: &[&str], extra: &[PathBuf]) -> Option<PathBuf> {
    for key in env_keys {
        if let Ok(p) = std::env::var(key) {
            let pb = PathBuf::from(p);
            if is_executable(&pb) {
                return Some(pb);
            }
        }
    }
    for candidate in extra {
        let path = if candidate.ends_with(name) {
            candidate.clone()
        } else {
            candidate.join(name)
        };
        if is_executable(&path) {
            return Some(path);
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

fn ollama_app_installed() -> bool {
    Path::new("/Applications/Ollama.app").is_dir()
}

fn bin_dirs() -> Vec<PathBuf> {
    let mut dirs = vec![
        PathBuf::from("/opt/homebrew/bin"),
        PathBuf::from("/usr/local/bin"),
        PathBuf::from("/usr/bin"),
    ];
    if let Some(home) = dirs::home_dir() {
        dirs.push(home.join(".local/bin"));
        dirs.push(home.join(".volta/bin"));
        dirs.push(home.join(".kimi-code/bin"));
        dirs.push(home.join(".npm-global/bin"));
        dirs.push(home.join(".cursor/bin"));
        dirs.push(home.join("Library/pnpm"));
    }
    dirs
}

fn common_cli_paths() -> Vec<PathBuf> {
    bin_dirs()
}

fn ollama_extra_paths() -> Vec<PathBuf> {
    let mut paths = bin_dirs();
    paths.push(PathBuf::from("/opt/homebrew/opt/ollama/bin"));
    paths.push(PathBuf::from("/Applications/Ollama.app/Contents/Resources"));
    paths.push(PathBuf::from("/Applications/Ollama.app/Contents/MacOS"));
    if let Some(home) = dirs::home_dir() {
        paths.push(home.join(".ollama/bin"));
    }
    paths
}

fn cursor_extra_paths() -> Vec<PathBuf> {
    let mut paths = bin_dirs();
    if let Some(home) = dirs::home_dir() {
        paths.push(home.join(".local/bin"));
        paths.push(home.join(".cursor/bin"));
    }
    paths
}
