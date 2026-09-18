use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tokio::io::AsyncWriteExt;

pub const PARAKEET_NAME: &str = "parakeet-tdt-0.6b-v3-q8";
pub const PARAKEET_FILE: &str = "parakeet-tdt-0.6b-v3.q8_0.gguf";
pub const PARAKEET_URL: &str =
    "https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3/resolve/main/parakeet-tdt-0.6b-v3.q8_0.gguf";
pub const PARAKEET_SIZE: u64 = 714 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub name: String,
    pub size: u64,
    pub path: String,
    pub is_downloaded: bool,
    pub download_url: Option<String>,
    pub description: String,
    pub languages: Vec<String>,
    pub is_loaded: bool,
}

#[derive(Debug, Clone)]
pub struct ModelManager {
    models_dir: PathBuf,
    available_models: HashMap<String, ModelInfo>,
    download_progress: Arc<Mutex<HashMap<String, f32>>>,
}

impl ModelManager {
    pub fn new(models_dir: &str) -> Result<Self> {
        let models_dir = PathBuf::from(models_dir);
        if !models_dir.exists() {
            fs::create_dir_all(&models_dir)?;
        }

        let mut manager = Self {
            models_dir,
            available_models: HashMap::new(),
            download_progress: Arc::new(Mutex::new(HashMap::new())),
        };
        manager.initialize_models();
        manager.scan_downloaded_models();
        Ok(manager)
    }

    fn initialize_models(&mut self) {
        self.available_models.insert(
            PARAKEET_NAME.to_string(),
            ModelInfo {
                name: PARAKEET_NAME.to_string(),
                size: PARAKEET_SIZE,
                path: PARAKEET_FILE.to_string(),
                is_downloaded: false,
                download_url: Some(PARAKEET_URL.to_string()),
                description: "Parakeet TDT 0.6B v3 Q8 — multilingual ASR (nemo-speech)".to_string(),
                languages: vec![
                    "es".into(),
                    "en".into(),
                    "fr".into(),
                    "de".into(),
                    "it".into(),
                    "pt".into(),
                ],
                is_loaded: false,
            },
        );
    }

    fn scan_downloaded_models(&mut self) {
        if let Ok(entries) = fs::read_dir(&self.models_dir) {
            for entry in entries.flatten() {
                if let Some(filename) = entry.file_name().to_str() {
                    for model in self.available_models.values_mut() {
                        if model.path == filename {
                            model.is_downloaded = true;
                        }
                    }
                }
            }
        }
    }

    pub fn list_models(&self) -> Vec<ModelInfo> {
        self.available_models.values().cloned().collect()
    }

    pub fn get_model(&self, name: &str) -> Option<&ModelInfo> {
        self.available_models.get(name)
    }

    pub fn load_model(&mut self, name: &str) -> Result<()> {
        if let Some(model) = self.available_models.get_mut(name) {
            if !model.is_downloaded {
                return Err(anyhow::anyhow!("Model {} is not downloaded", name));
            }
            let model_path = self.models_dir.join(&model.path);
            if !model_path.exists() {
                return Err(anyhow::anyhow!("Model file not found: {:?}", model_path));
            }
            model.is_loaded = true;
            Ok(())
        } else {
            Err(anyhow::anyhow!("Model {} not found", name))
        }
    }

    pub async fn download_model(&self, name: &str) -> Result<()> {
        let model = self
            .available_models
            .get(name)
            .ok_or_else(|| anyhow::anyhow!("Model {} not found", name))?
            .clone();

        if model.is_downloaded && self.models_dir.join(&model.path).exists() {
            return Ok(());
        }

        let url = model
            .download_url
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("No download URL for model {}", name))?;

        let client = reqwest::Client::new();
        let response = client.get(url).send().await?;
        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "Failed to download model: HTTP {}",
                response.status()
            ));
        }

        let total_size = response.content_length().unwrap_or(model.size);
        let mut downloaded: u64 = 0;
        let mut stream = response.bytes_stream();
        let file_path = self.models_dir.join(&model.path);
        let tmp_path = file_path.with_extension("gguf.part");
        let mut file = tokio::fs::File::create(&tmp_path).await?;

        use futures_util::StreamExt;
        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            file.write_all(&chunk).await?;
            downloaded += chunk.len() as u64;
            let progress = (downloaded as f32 / total_size as f32) * 100.0;
            if let Ok(mut progress_map) = self.download_progress.lock() {
                progress_map.insert(name.to_string(), progress);
            }
        }
        file.flush().await?;
        tokio::fs::rename(&tmp_path, &file_path).await?;

        if let Ok(mut progress_map) = self.download_progress.lock() {
            progress_map.remove(name);
        }
        Ok(())
    }

    pub fn mark_model_downloaded(&mut self, name: &str) {
        if let Some(model) = self.available_models.get_mut(name) {
            model.is_downloaded = true;
        }
        self.scan_downloaded_models();
    }

    pub fn get_download_progress(&self, name: &str) -> Option<f32> {
        self.download_progress.lock().ok()?.get(name).copied()
    }

    pub fn is_model_downloaded(&self, name: &str) -> bool {
        self.available_models.get(name).map_or(false, |m| {
            m.is_downloaded && self.models_dir.join(&m.path).exists()
        })
    }

    pub fn get_model_path(&self, name: &str) -> Option<String> {
        self.available_models
            .get(name)
            .map(|m| self.models_dir.join(&m.path).to_string_lossy().to_string())
    }

    #[allow(dead_code)]
    pub fn get_models_dir(&self) -> &PathBuf {
        &self.models_dir
    }

    #[allow(dead_code)]
    pub fn validate_model(&self, path: &str) -> Result<bool> {
        let path = Path::new(path);
        if !path.exists() {
            return Ok(false);
        }
        Ok(fs::metadata(path)?.len() > 1024)
    }
}
