use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::Once;

const APP_DIR_NAME: &str = ".murmullo";

static INIT: Once = Once::new();

pub fn home_dir() -> PathBuf {
    dirs::home_dir().unwrap_or_else(|| PathBuf::from("."))
}

/// `~/.murmullo` — única carpeta local de Murmullo.
pub fn app_dir() -> PathBuf {
    home_dir().join(APP_DIR_NAME)
}

pub fn config_file() -> PathBuf {
    app_dir().join("config.json")
}

pub fn transcriptions_file() -> PathBuf {
    app_dir().join("transcriptions.json")
}

pub fn recordings_dir() -> PathBuf {
    app_dir().join("recordings")
}

pub fn dictionary_file() -> PathBuf {
    app_dir().join("dictionary.json")
}

pub fn prompt_file() -> PathBuf {
    app_dir().join("prompt.md")
}

pub fn models_dir() -> PathBuf {
    app_dir().join("models")
}

pub fn runtime_dir() -> PathBuf {
    app_dir().join("runtime").join("nemo-speech")
}

pub fn llm_scratch_dir() -> PathBuf {
    app_dir().join("runtime").join("llm-scratch")
}

pub fn logs_dir() -> PathBuf {
    app_dir().join("logs")
}

pub fn log_file() -> PathBuf {
    logs_dir().join("murmullo.log")
}

/// Crea `~/.murmullo` y migra datos de rutas antiguas si hace falta.
pub fn ensure_layout() {
    INIT.call_once(|| {
        if let Err(e) = init_layout() {
            eprintln!("⚠️ Failed to initialize {}: {e}", app_dir().display());
        }
    });
}

fn init_layout() -> Result<(), Box<dyn std::error::Error>> {
    fs::create_dir_all(app_dir())?;
    fs::create_dir_all(recordings_dir())?;
    fs::create_dir_all(models_dir())?;
    fs::create_dir_all(runtime_dir())?;
    fs::create_dir_all(llm_scratch_dir())?;
    fs::create_dir_all(logs_dir())?;
    migrate_legacy();
    println!("📁 Local data directory: {}", app_dir().display());
    Ok(())
}

fn legacy_config_file() -> PathBuf {
    home_dir()
        .join(".config")
        .join("murmullo")
        .join("config.json")
}

fn legacy_data_dir() -> Option<PathBuf> {
    dirs::data_dir().map(|dir| dir.join("murmullo"))
}

fn legacy_log_file() -> PathBuf {
    #[cfg(target_os = "macos")]
    {
        return home_dir()
            .join("Library")
            .join("Logs")
            .join("murmullo")
            .join("murmullo.log");
    }
    #[cfg(not(target_os = "macos"))]
    {
        dirs::data_dir()
            .unwrap_or_else(home_dir)
            .join("murmullo")
            .join("logs")
            .join("murmullo.log")
    }
}

fn migrate_legacy() {
    migrate_file(&legacy_config_file(), &config_file());

    if let Some(old) = legacy_data_dir() {
        migrate_file(&old.join("transcriptions.json"), &transcriptions_file());
        migrate_file(&old.join("dictionary.json"), &dictionary_file());
        migrate_file(&old.join("prompt.md"), &prompt_file());
        migrate_dir(&old.join("recordings"), &recordings_dir());
        migrate_dir(&old.join("models"), &models_dir());
        migrate_dir(&old.join("runtime").join("nemo-speech"), &runtime_dir());
        migrate_file(&old.join("logs").join("murmullo.log"), &log_file());
    }

    migrate_file(&legacy_log_file(), &log_file());
}

fn migrate_file(src: &Path, dest: &Path) {
    if dest.exists() || !src.exists() || !src.is_file() {
        return;
    }
    if let Some(parent) = dest.parent() {
        let _ = fs::create_dir_all(parent);
    }
    match fs::rename(src, dest) {
        Ok(()) => {
            println!("📦 Migrated {} → {}", src.display(), dest.display());
        }
        Err(_) => match fs::copy(src, dest) {
            Ok(_) => println!("📦 Copied {} → {}", src.display(), dest.display()),
            Err(e) => eprintln!(
                "⚠️ Could not migrate {} → {}: {e}",
                src.display(),
                dest.display()
            ),
        },
    }
}

fn migrate_dir(src: &Path, dest: &Path) {
    if !src.exists() || !src.is_dir() || src == dest {
        return;
    }

    let dest_empty = dest
        .read_dir()
        .map(|mut entries| entries.next().is_none())
        .unwrap_or(true);

    if dest_empty {
        let _ = fs::remove_dir(dest);
        match fs::rename(src, dest) {
            Ok(()) => {
                println!("📦 Migrated {} → {}", src.display(), dest.display());
                return;
            }
            Err(_) => {
                let _ = fs::create_dir_all(dest);
            }
        }
    }

    if let Err(e) = copy_missing(src, dest) {
        eprintln!(
            "⚠️ Could not migrate {} → {}: {e}",
            src.display(),
            dest.display()
        );
    } else {
        println!("📦 Merged {} → {}", src.display(), dest.display());
    }
}

fn copy_missing(src: &Path, dest: &Path) -> io::Result<()> {
    fs::create_dir_all(dest)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let from = entry.path();
        let to = dest.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_missing(&from, &to)?;
        } else if !to.exists() {
            fs::copy(&from, &to)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn local_layout_lives_under_dot_murmullo() {
        let root = home_dir().join(".murmullo");
        assert_eq!(app_dir(), root);
        assert_eq!(config_file(), root.join("config.json"));
        assert_eq!(transcriptions_file(), root.join("transcriptions.json"));
        assert_eq!(recordings_dir(), root.join("recordings"));
        assert_eq!(dictionary_file(), root.join("dictionary.json"));
        assert_eq!(prompt_file(), root.join("prompt.md"));
        assert_eq!(models_dir(), root.join("models"));
        assert_eq!(runtime_dir(), root.join("runtime").join("nemo-speech"));
        assert_eq!(log_file(), root.join("logs").join("murmullo.log"));
    }
}
