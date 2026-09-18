use super::InstallProgress;
use anyhow::{anyhow, bail, Context, Result};
use futures_util::StreamExt;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Arc, Mutex};
use tokio::io::AsyncWriteExt;

/// Pinned NVIDIA release used when the VERSION manifest is unreachable.
pub const PINNED_VERSION: &str = "0.1.0";
const VERSION_URL: &str = "https://raw.githubusercontent.com/NVIDIA/NeMo-Speech.cpp/main/VERSION";
const RELEASE_DOWNLOAD: &str = "https://github.com/NVIDIA/NeMo-Speech.cpp/releases/download";
const USER_AGENT: &str = "Murmullo/0.1 (desktop dictation wrapper)";

/// SHA-256 of known v0.1.0 macOS archives (must match the NVIDIA sidecar).
const PINNED_SHA256: &[(&str, &str)] = &[
    (
        "nemo-speech-0.1.0-macos-aarch64-metal.tar.gz",
        "f1dff4f9dd9c96214f8cb78b982812459132df8a4ad1a42409fd94de4a366244",
    ),
    (
        "nemo-speech-0.1.0-macos-aarch64-cpu.tar.gz",
        "971661d38d4bf97a63c528d13041a964316d25068d8df045e5b4839848092f25",
    ),
    (
        "nemo-speech-0.1.0-macos-x86_64-cpu.tar.gz",
        "042a4612e07460fab6a39b5d862aa1e39d0ac3eaedfdb979f3f5fc12de510c20",
    ),
];

pub fn managed_binary_path(runtime_dir: &Path) -> PathBuf {
    runtime_dir.join("bin").join("nemo-speech")
}

pub fn set_progress(
    progress: &Arc<Mutex<InstallProgress>>,
    phase: &str,
    message: &str,
    value: Option<f32>,
) {
    if let Ok(mut g) = progress.lock() {
        g.phase = phase.into();
        g.message = message.into();
        g.progress = value;
        if phase != "error" {
            g.error = None;
        }
    }
}

pub fn set_error(progress: &Arc<Mutex<InstallProgress>>, message: &str) {
    if let Ok(mut g) = progress.lock() {
        g.phase = "error".into();
        g.message = message.into();
        g.error = Some(message.into());
        g.progress = None;
    }
}

pub fn clear_progress(progress: &Arc<Mutex<InstallProgress>>) {
    if let Ok(mut g) = progress.lock() {
        *g = InstallProgress::default();
    }
}

/// Download and extract the NVIDIA nemo-speech CLI into `runtime_dir` if missing.
pub async fn ensure_stt_binary(
    runtime_dir: &Path,
    progress: Arc<Mutex<InstallProgress>>,
) -> Result<PathBuf> {
    let existing = managed_binary_path(runtime_dir);
    if is_runnable_cli(&existing) {
        return Ok(existing);
    }

    let (os, arch, backends) = current_artifact()?;
    let version = resolve_version()
        .await
        .unwrap_or_else(|_| PINNED_VERSION.to_string());
    let mut last_err = None;

    for backend in backends {
        let archive = format!("nemo-speech-{version}-{os}-{arch}-{backend}.tar.gz");
        set_progress(
            &progress,
            "downloading_cli",
            &format!("Descargando {archive}…"),
            Some(0.0),
        );
        match install_archive(&version, &archive, runtime_dir, &progress).await {
            Ok(path) => {
                set_progress(
                    &progress,
                    "ready",
                    &format!("CLI instalada ({backend})"),
                    Some(100.0),
                );
                return Ok(path);
            }
            Err(e) => {
                println!("⚠️ nemo-speech {archive} failed: {e}");
                last_err = Some(e);
            }
        }
    }

    let err = last_err.unwrap_or_else(|| {
        anyhow!("No hay un binario oficial de nemo-speech para esta plataforma.")
    });
    set_error(&progress, &err.to_string());
    Err(err)
}

fn current_artifact() -> Result<(&'static str, &'static str, Vec<&'static str>)> {
    let os = if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "linux") {
        "linux"
    } else {
        bail!(
            "La auto-instalación de nemo-speech aún no está disponible en este sistema. \
             Instala el CLI desde https://github.com/NVIDIA/NeMo-Speech.cpp/releases"
        );
    };

    let arch = if cfg!(target_arch = "aarch64") {
        "aarch64"
    } else if cfg!(target_arch = "x86_64") {
        "x86_64"
    } else {
        bail!("Arquitectura no soportada para el binario oficial de nemo-speech.");
    };

    let backends = if os == "macos" && arch == "aarch64" {
        vec!["metal", "cpu"]
    } else {
        vec!["cpu"]
    };

    Ok((os, arch, backends))
}

async fn resolve_version() -> Result<String> {
    let client = http_client()?;
    let text = client.get(VERSION_URL).send().await?.text().await?;
    for line in text.lines() {
        if let Some(v) = line.strip_prefix("NEMO_SPEECH_VERSION:") {
            let v = v.trim().trim_start_matches('v');
            if !v.is_empty()
                && v.chars()
                    .all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-')
            {
                return Ok(v.to_string());
            }
        }
    }
    Ok(PINNED_VERSION.to_string())
}

async fn install_archive(
    version: &str,
    archive: &str,
    runtime_dir: &Path,
    progress: &Arc<Mutex<InstallProgress>>,
) -> Result<PathBuf> {
    if !archive
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_'))
    {
        bail!("Nombre de archivo de release no válido");
    }

    let tag = format!("v{version}");
    let url = format!("{RELEASE_DOWNLOAD}/{tag}/{archive}");
    let sha_url = format!("{url}.sha256");
    assert_nvidia_release_url(&url)?;
    assert_nvidia_release_url(&sha_url)?;

    let parent = runtime_dir
        .parent()
        .ok_or_else(|| anyhow!("runtime_dir sin padre"))?;
    fs::create_dir_all(parent)?;
    let staging = parent.join(format!(".nemo-speech-{}-download", std::process::id()));
    let _ = fs::remove_dir_all(&staging);
    fs::create_dir_all(&staging)?;
    let archive_path = staging.join(archive);

    let expected_sidecar = download_checksum(&sha_url).await?;
    let pinned = pinned_sha256(archive);
    if let Some(pinned) = pinned {
        if pinned != expected_sidecar {
            let _ = fs::remove_dir_all(&staging);
            bail!("El checksum publicado de {archive} no coincide con el hash fijado en Murmullo.");
        }
    }

    download_file(&url, &archive_path, progress).await?;
    set_progress(progress, "verifying", "Verificando SHA-256…", None);
    let actual = sha256_file(&archive_path)?;
    if actual != expected_sidecar {
        let _ = fs::remove_dir_all(&staging);
        bail!("SHA-256 de {archive} no coincide (esperado {expected_sidecar}, obtenido {actual}).");
    }

    set_progress(progress, "extracting", "Extrayendo CLI…", None);
    let extract_dir = staging.join("extract");
    fs::create_dir_all(&extract_dir)?;
    extract_tar_gz(&archive_path, &extract_dir)?;

    let binary = locate_binary(&extract_dir)
        .ok_or_else(|| anyhow!("El archivo de release no contiene bin/nemo-speech."))?;
    let package_root = package_root_for(&binary);

    if runtime_dir.exists() {
        fs::remove_dir_all(runtime_dir)?;
    }
    fs::create_dir_all(
        runtime_dir
            .parent()
            .ok_or_else(|| anyhow!("runtime_dir sin padre"))?,
    )?;
    if let Err(e) = fs::rename(&package_root, runtime_dir) {
        copy_dir_all(&package_root, runtime_dir).with_context(|| format!("rename failed: {e}"))?;
    }

    let installed = managed_binary_path(runtime_dir);
    if !installed.is_file() {
        if let Some(found) = locate_binary(runtime_dir) {
            let dest_dir = installed.parent().unwrap();
            fs::create_dir_all(dest_dir)?;
            fs::copy(&found, &installed)?;
        }
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if installed.is_file() {
            let mut perms = fs::metadata(&installed)?.permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&installed, perms)?;
        }
        let _ = Command::new("xattr")
            .args(["-dr", "com.apple.quarantine"])
            .arg(runtime_dir)
            .status();
    }

    let _ = fs::remove_dir_all(&staging);

    if !is_runnable_cli(&installed) {
        bail!(
            "nemo-speech se extrajo pero no responde a --version ({})",
            installed.display()
        );
    }

    Ok(installed)
}

fn assert_nvidia_release_url(url: &str) -> Result<()> {
    if !url.starts_with("https://github.com/NVIDIA/NeMo-Speech.cpp/releases/download/") {
        bail!("URL de descarga no permitida");
    }
    Ok(())
}

fn pinned_sha256(archive: &str) -> Option<&'static str> {
    PINNED_SHA256
        .iter()
        .find(|(name, _)| *name == archive)
        .map(|(_, hash)| *hash)
}

fn http_client() -> Result<reqwest::Client> {
    Ok(reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .redirect(reqwest::redirect::Policy::limited(10))
        .timeout(std::time::Duration::from_secs(120))
        .build()?)
}

async fn download_checksum(url: &str) -> Result<String> {
    let client = http_client()?;
    let resp = client.get(url).send().await?;
    if !resp.status().is_success() {
        bail!("No se pudo descargar el checksum ({})", resp.status());
    }
    let text = resp.text().await?;
    let token = text
        .split_whitespace()
        .next()
        .unwrap_or("")
        .trim()
        .to_lowercase();
    if token.len() != 64 || !token.chars().all(|c| c.is_ascii_hexdigit()) {
        bail!("El archivo .sha256 no contiene un digest SHA-256 válido");
    }
    Ok(token)
}

async fn download_file(
    url: &str,
    dest: &Path,
    progress: &Arc<Mutex<InstallProgress>>,
) -> Result<()> {
    let client = http_client()?;
    let resp = client.get(url).send().await?;
    if !resp.status().is_success() {
        bail!("Descarga fallida: HTTP {}", resp.status());
    }
    let total = resp.content_length().unwrap_or(0);
    let tmp = dest.with_extension("part");
    let mut file = tokio::fs::File::create(&tmp).await?;
    let mut downloaded: u64 = 0;
    let mut stream = resp.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        file.write_all(&chunk).await?;
        downloaded += chunk.len() as u64;
        if total > 0 {
            let pct = (downloaded as f32 / total as f32) * 100.0;
            set_progress(
                progress,
                "downloading_cli",
                &format!("Descargando CLI ({:.0}%)", pct),
                Some(pct),
            );
        }
    }
    file.flush().await?;
    drop(file);
    tokio::fs::rename(&tmp, dest).await?;
    Ok(())
}

fn sha256_file(path: &Path) -> Result<String> {
    let mut file = fs::File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 64 * 1024];
    loop {
        let n = std::io::Read::read(&mut file, &mut buf)?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(hex_encode(&hasher.finalize()))
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn extract_tar_gz(archive: &Path, dest: &Path) -> Result<()> {
    let status = Command::new("tar")
        .arg("-xzf")
        .arg(archive)
        .arg("-C")
        .arg(dest)
        .status()
        .context("tar no está disponible")?;
    if !status.success() {
        bail!("tar no pudo extraer {}", archive.display());
    }
    Ok(())
}

fn locate_binary(root: &Path) -> Option<PathBuf> {
    for entry in walkdir::WalkDir::new(root).into_iter().flatten() {
        if entry.file_type().is_file() && entry.file_name() == "nemo-speech" {
            return Some(entry.into_path());
        }
    }
    None
}

fn package_root_for(binary: &Path) -> PathBuf {
    // Prefer .../bin/nemo-speech → package root is parent of bin.
    if let Some(bin_dir) = binary.parent() {
        if bin_dir.file_name().and_then(|s| s.to_str()) == Some("bin") {
            if let Some(root) = bin_dir.parent() {
                return root.to_path_buf();
            }
        }
        return bin_dir.to_path_buf();
    }
    binary.to_path_buf()
}

fn copy_dir_all(src: &Path, dst: &Path) -> Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let to = dst.join(entry.file_name());
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &to)?;
        } else {
            fs::copy(entry.path(), to)?;
        }
    }
    Ok(())
}

fn is_runnable_cli(path: &Path) -> bool {
    if !path.is_file() {
        return false;
    }
    Command::new(path)
        .arg("--version")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}
