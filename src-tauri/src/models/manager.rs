use std::fs;
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use anyhow::Result;
use tokio::io::AsyncWriteExt;

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

#[allow(dead_code)]
impl ModelManager {
    pub fn new(models_dir: &str) -> Result<Self> {
        let models_dir = PathBuf::from(models_dir);
        
        // Create models directory if it doesn't exist
        if !models_dir.exists() {
            fs::create_dir_all(&models_dir)?;
            println!("📁 Created models directory: {:?}", models_dir);
        }

        let mut manager = Self {
            models_dir,
            available_models: HashMap::new(),
            download_progress: Arc::new(Mutex::new(HashMap::new())),
        };

        // Initialize with available Whisper models
        manager.initialize_models();
        manager.scan_downloaded_models();
        
        println!("📋 ModelManager initialized with {} models", manager.available_models.len());
        for (name, model) in &manager.available_models {
            println!("  - {}: {} ({})", name, model.description, if model.is_downloaded { "downloaded" } else { "not downloaded" });
        }
        
        Ok(manager)
    }

    fn initialize_models(&mut self) {
        let whisper_models = vec![
            ModelInfo {
                name: "tiny.en".to_string(),
                size: 39 * 1024 * 1024, // 39 MB
                path: "ggml-tiny.en.bin".to_string(),
                is_downloaded: false,
                download_url: Some("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin".to_string()),
                description: "Tiny English model - Fastest, least accurate".to_string(),
                languages: vec!["en".to_string()],
                is_loaded: false,
            },
            ModelInfo {
                name: "tiny".to_string(),
                size: 39 * 1024 * 1024, // 39 MB
                path: "ggml-tiny.bin".to_string(),
                is_downloaded: false,
                download_url: Some("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin".to_string()),
                description: "Tiny multilingual model - Fastest, least accurate".to_string(),
                languages: vec!["en".to_string(), "es".to_string(), "fr".to_string()],
                is_loaded: false,
            },
            ModelInfo {
                name: "base.en".to_string(),
                size: 142 * 1024 * 1024, // 142 MB
                path: "ggml-base.en.bin".to_string(),
                is_downloaded: false,
                download_url: Some("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin".to_string()),
                description: "Base English model - Good balance of speed and accuracy".to_string(),
                languages: vec!["en".to_string()],
                is_loaded: false,
            },
            ModelInfo {
                name: "base".to_string(),
                size: 142 * 1024 * 1024, // 142 MB
                path: "ggml-base.bin".to_string(),
                is_downloaded: false,
                download_url: Some("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin".to_string()),
                description: "Base multilingual model - Good balance of speed and accuracy".to_string(),
                languages: vec!["en".to_string(), "es".to_string(), "fr".to_string()],
                is_loaded: false,
            },
            ModelInfo {
                name: "small.en".to_string(),
                size: 244 * 1024 * 1024, // 244 MB
                path: "ggml-small.en.bin".to_string(),
                is_downloaded: false,
                download_url: Some("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin".to_string()),
                description: "Small English model - Better accuracy than base".to_string(),
                languages: vec!["en".to_string()],
                is_loaded: false,
            },
            ModelInfo {
                name: "small".to_string(),
                size: 244 * 1024 * 1024, // 244 MB
                path: "ggml-small.bin".to_string(),
                is_downloaded: false,
                download_url: Some("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin".to_string()),
                description: "Small multilingual model - Better accuracy than base".to_string(),
                languages: vec!["en".to_string(), "es".to_string(), "fr".to_string(), "de".to_string(), "it".to_string(), "pt".to_string()],
                is_loaded: false,
            },
            ModelInfo {
                name: "medium.en".to_string(),
                size: 769 * 1024 * 1024, // 769 MB
                path: "ggml-medium.en.bin".to_string(),
                is_downloaded: false,
                download_url: Some("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.en.bin".to_string()),
                description: "Medium English model - High accuracy".to_string(),
                languages: vec!["en".to_string()],
                is_loaded: false,
            },
            ModelInfo {
                name: "medium".to_string(),
                size: 769 * 1024 * 1024, // 769 MB
                path: "ggml-medium.bin".to_string(),
                is_downloaded: false,
                download_url: Some("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin".to_string()),
                description: "Medium multilingual model - High accuracy".to_string(),
                languages: vec!["en".to_string(), "es".to_string(), "fr".to_string(), "de".to_string(), "it".to_string(), "pt".to_string(), "ru".to_string(), "ja".to_string(), "ko".to_string(), "zh".to_string()],
                is_loaded: false,
            },
            ModelInfo {
                name: "large-v3".to_string(),
                size: 1550 * 1024 * 1024, // 1550 MB
                path: "ggml-large-v3.bin".to_string(),
                is_downloaded: false,
                download_url: Some("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin".to_string()),
                description: "Large multilingual model - Highest accuracy (recommended for production)".to_string(),
                languages: vec!["en".to_string(), "es".to_string(), "fr".to_string(), "de".to_string(), "it".to_string(), "pt".to_string(), "ru".to_string(), "ja".to_string(), "ko".to_string(), "zh".to_string(), "ar".to_string(), "hi".to_string()],
                is_loaded: false,
            },
        ];

        for model in whisper_models {
            self.available_models.insert(model.name.clone(), model);
        }
    }

    fn scan_downloaded_models(&mut self) {
        println!("🔍 Scanning for downloaded models...");
        
        if let Ok(entries) = fs::read_dir(&self.models_dir) {
            for entry in entries.flatten() {
                if let Some(filename) = entry.file_name().to_str() {
                    for (name, model) in self.available_models.iter_mut() {
                        if model.path == filename {
                            model.is_downloaded = true;
                            println!("✅ Found downloaded model: {}", name);
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

    pub fn get_model_info(&self, name: &str) -> Option<ModelInfo> {
        self.available_models.get(name).cloned()
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
            println!("✅ Model {} loaded successfully", name);
            Ok(())
        } else {
            Err(anyhow::anyhow!("Model {} not found", name))
        }
    }

    pub fn is_model_loaded(&self, name: &str) -> bool {
        self.available_models.get(name).map_or(false, |m| m.is_loaded)
    }

    pub fn get_loaded_model_info(&self) -> Option<ModelInfo> {
        self.available_models.values().find(|m| m.is_loaded).cloned()
    }

    pub async fn download_model(&self, name: &str) -> Result<()> {
        println!("🔍 download_model called with name: '{}'", name);
        
        let model = self.available_models.get(name)
            .ok_or_else(|| anyhow::anyhow!("Model {} not found", name))?;

        println!("🔍 Model found: {:?}", model.name);

        if model.is_downloaded {
            println!("⚠️ Model {} already downloaded", name);
            return Ok(());
        }

        let url = model.download_url.as_ref()
            .ok_or_else(|| anyhow::anyhow!("No download URL for model {}", name))?;

        println!("📥 Starting download of model: {}", name);
        println!("📊 Size: {} MB", model.size / (1024 * 1024));
        println!("🔗 URL: {}", url);

        let client = reqwest::Client::new();
        println!("🌐 Making HTTP request to: {}", url);
        
        let response = client.get(url).send().await
            .map_err(|e| {
                eprintln!("❌ HTTP request failed: {}", e);
                anyhow::anyhow!("HTTP request failed: {}", e)
            })?;
        
        println!("📡 HTTP response status: {}", response.status());
        
        if !response.status().is_success() {
            eprintln!("❌ HTTP error: {}", response.status());
            return Err(anyhow::anyhow!("Failed to download model: HTTP {}", response.status()));
        }

        let total_size = response.content_length().unwrap_or(model.size);
        let mut downloaded: u64 = 0;
        let mut stream = response.bytes_stream();
        let file_path = self.models_dir.join(&model.path);
        
        println!("📁 Creating file at: {:?}", file_path);
        let mut file = tokio::fs::File::create(&file_path).await
            .map_err(|e| {
                eprintln!("❌ Failed to create file: {}", e);
                anyhow::anyhow!("Failed to create file: {}", e)
            })?;
        
        println!("✅ File created successfully, starting download stream...");

        use futures_util::StreamExt;
        
        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| {
                eprintln!("❌ Stream error: {}", e);
                anyhow::anyhow!("Stream error: {}", e)
            })?;
            
            file.write_all(&chunk).await.map_err(|e| {
                eprintln!("❌ Write error: {}", e);
                anyhow::anyhow!("Write error: {}", e)
            })?;
            
            downloaded += chunk.len() as u64;
            
            let progress = (downloaded as f32 / total_size as f32) * 100.0;
            
            // Update progress
            {
                let mut progress_map = self.download_progress.lock().unwrap();
                progress_map.insert(name.to_string(), progress);
            }
            
            if downloaded % (1024 * 1024) == 0 { // Log every MB
                println!("📊 Download progress: {:.1}% ({}/{} MB)", 
                    progress, downloaded / (1024 * 1024), total_size / (1024 * 1024));
            }
        }

        file.flush().await.map_err(|e| {
            eprintln!("❌ Flush error: {}", e);
            anyhow::anyhow!("Flush error: {}", e)
        })?;
        
        println!("💾 File flushed successfully");
        
        // Clear progress
        {
            let mut progress_map = self.download_progress.lock().unwrap();
            progress_map.remove(name);
        }

        println!("✅ Model {} downloaded successfully", name);
        Ok(())
    }

    pub fn mark_model_downloaded(&mut self, name: &str) {
        if let Some(model) = self.available_models.get_mut(name) {
            model.is_downloaded = true;
        }
    }

    pub fn get_download_progress(&self, name: &str) -> Option<f32> {
        let progress_map = self.download_progress.lock().unwrap();
        progress_map.get(name).copied()
    }

    pub fn is_model_downloaded(&self, name: &str) -> bool {
        self.available_models.get(name).map_or(false, |m| m.is_downloaded)
    }

    pub fn get_model_path(&self, name: &str) -> Option<String> {
        self.available_models.get(name).map(|m| {
            self.models_dir.join(&m.path).to_string_lossy().to_string()
        })
    }

    pub fn validate_model(&self, path: &str) -> Result<bool> {
        let path = Path::new(path);
        if !path.exists() {
            return Ok(false);
        }
        
        let metadata = fs::metadata(path)?;
        if metadata.len() < 1024 { // At least 1KB
            return Ok(false);
        }
        
        Ok(true)
    }

    pub fn get_download_url(&self, name: &str) -> Option<String> {
        self.available_models.get(name).and_then(|m| m.download_url.clone())
    }

    pub fn get_models_dir(&self) -> &PathBuf {
        &self.models_dir
    }

    pub fn get_downloaded_models(&self) -> Vec<ModelInfo> {
        self.available_models.values()
            .filter(|m| m.is_downloaded)
            .cloned()
            .collect()
    }

    pub fn get_available_downloads(&self) -> Vec<ModelInfo> {
        self.available_models.values()
            .filter(|m| !m.is_downloaded && m.download_url.is_some())
            .cloned()
            .collect()
    }
}