use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionRecord {
    pub id: String,
    pub text: String,
    pub audio_file_path: String,
    pub duration_ms: u64,
    pub file_size_bytes: u64,
    pub model_used: String,
    pub language: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TranscriptionDatabase {
    pub records: HashMap<String, TranscriptionRecord>,
    pub version: String,
    pub last_updated: DateTime<Utc>,
}

impl Default for TranscriptionDatabase {
    fn default() -> Self {
        Self {
            records: HashMap::new(),
            version: "1.0.0".to_string(),
            last_updated: Utc::now(),
        }
    }
}

pub struct TranscriptionPersistence {
    #[allow(dead_code)]
    data_dir: PathBuf,
    database_path: PathBuf,
    recordings_dir: PathBuf,
}

impl TranscriptionPersistence {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let data_dir = dirs::data_dir()
            .ok_or("Could not find data directory")?
            .join("murmullo");
        
        let database_path = data_dir.join("transcriptions.json");
        let recordings_dir = data_dir.join("recordings");
        
        // Create directories if they don't exist
        fs::create_dir_all(&data_dir)?;
        fs::create_dir_all(&recordings_dir)?;
        
        Ok(Self {
            data_dir,
            database_path,
            recordings_dir,
        })
    }
    
    pub fn load_database(&self) -> Result<TranscriptionDatabase, Box<dyn std::error::Error>> {
        if !self.database_path.exists() {
            println!("📁 Creating new transcription database");
            return Ok(TranscriptionDatabase::default());
        }
        
        let content = fs::read_to_string(&self.database_path)?;
        let database: TranscriptionDatabase = serde_json::from_str(&content)?;
        
        println!("📖 Loaded {} transcription records", database.records.len());
        Ok(database)
    }
    
    pub fn save_database(&self, database: &TranscriptionDatabase) -> Result<(), Box<dyn std::error::Error>> {
        let content = serde_json::to_string_pretty(database)?;
        fs::write(&self.database_path, content)?;
        
        println!("💾 Saved transcription database with {} records", database.records.len());
        Ok(())
    }
    
    pub fn add_transcription(
        &self,
        database: &mut TranscriptionDatabase,
        text: String,
        audio_data: Vec<f32>,
        model_used: String,
        language: Option<String>,
        metadata: HashMap<String, String>,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        
        // Save audio file
        let audio_filename = format!("recording_{}.wav", id);
        let audio_path = self.recordings_dir.join(&audio_filename);
        
        // Convert audio data to WAV format and save
        self.save_audio_as_wav(&audio_path, &audio_data)?;
        
        // Get file size
        let file_size = fs::metadata(&audio_path)?.len();
        
        // Calculate duration
        let duration_ms = (audio_data.len() as f32 / 16000.0 * 1000.0) as u64;
        
        let record = TranscriptionRecord {
            id: id.clone(),
            text,
            audio_file_path: audio_path.to_string_lossy().to_string(),
            duration_ms,
            file_size_bytes: file_size,
            model_used,
            language,
            created_at: now,
            updated_at: now,
            metadata,
        };
        
        database.records.insert(id.clone(), record);
        database.last_updated = now;
        
        println!("✅ Added transcription record: {}", id);
        Ok(id)
    }
    
    pub fn get_transcription<'a>(&self, database: &'a TranscriptionDatabase, id: &str) -> Option<&'a TranscriptionRecord> {
        database.records.get(id)
    }
    
    pub fn list_transcriptions<'a>(&self, database: &'a TranscriptionDatabase) -> Vec<&'a TranscriptionRecord> {
        let mut records: Vec<&'a TranscriptionRecord> = database.records.values().collect();
        records.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        records
    }
    
    pub fn delete_transcription(
        &self,
        database: &mut TranscriptionDatabase,
        id: &str,
    ) -> Result<bool, Box<dyn std::error::Error>> {
        if let Some(record) = database.records.remove(id) {
            // Delete audio file
            if Path::new(&record.audio_file_path).exists() {
                fs::remove_file(&record.audio_file_path)?;
                println!("🗑️ Deleted audio file: {}", record.audio_file_path);
            }
            
            database.last_updated = Utc::now();
            println!("✅ Deleted transcription record: {}", id);
            Ok(true)
        } else {
            Ok(false)
        }
    }
    
    pub fn update_transcription(
        &self,
        database: &mut TranscriptionDatabase,
        id: &str,
        text: Option<String>,
        metadata: Option<HashMap<String, String>>,
    ) -> Result<bool, Box<dyn std::error::Error>> {
        if let Some(record) = database.records.get_mut(id) {
            if let Some(new_text) = text {
                record.text = new_text;
            }
            if let Some(new_metadata) = metadata {
                record.metadata = new_metadata;
            }
            record.updated_at = Utc::now();
            database.last_updated = Utc::now();
            
            println!("✅ Updated transcription record: {}", id);
            Ok(true)
        } else {
            Ok(false)
        }
    }
    
    pub fn get_audio_file_path(&self, database: &TranscriptionDatabase, id: &str) -> Option<PathBuf> {
        database.records.get(id).map(|record| PathBuf::from(&record.audio_file_path))
    }
    
    pub fn copy_audio_file(&self, database: &TranscriptionDatabase, id: &str, destination: &Path) -> Result<bool, Box<dyn std::error::Error>> {
        if let Some(source_path) = self.get_audio_file_path(database, id) {
            if source_path.exists() {
                fs::copy(&source_path, destination)?;
                println!("📋 Copied audio file from {} to {}", source_path.display(), destination.display());
                Ok(true)
            } else {
                Err(format!("Audio file not found: {}", source_path.display()).into())
            }
        } else {
            Err(format!("Transcription record not found: {}", id).into())
        }
    }
    
    fn save_audio_as_wav(&self, path: &Path, audio_data: &[f32]) -> Result<(), Box<dyn std::error::Error>> {
        use std::io::Write;
        
        let mut file = fs::File::create(path)?;
        
        // WAV header
        let sample_rate = 16000;
        let num_channels = 1;
        let bits_per_sample = 16;
        let byte_rate = sample_rate * num_channels * bits_per_sample / 8;
        let block_align = num_channels * bits_per_sample / 8;
        let data_size = audio_data.len() * 2; // 16-bit samples
        let file_size = 36 + data_size;
        
        // Write WAV header
        file.write_all(b"RIFF")?;
        file.write_all(&(file_size as u32).to_le_bytes())?;
        file.write_all(b"WAVE")?;
        file.write_all(b"fmt ")?;
        file.write_all(&16u32.to_le_bytes())?; // fmt chunk size
        file.write_all(&1u16.to_le_bytes())?; // PCM format
        file.write_all(&(num_channels as u16).to_le_bytes())?;
        file.write_all(&(sample_rate as u32).to_le_bytes())?;
        file.write_all(&(byte_rate as u32).to_le_bytes())?;
        file.write_all(&(block_align as u16).to_le_bytes())?;
        file.write_all(&(bits_per_sample as u16).to_le_bytes())?;
        file.write_all(b"data")?;
        file.write_all(&(data_size as u32).to_le_bytes())?;
        
        // Write audio data (convert f32 to i16)
        for &sample in audio_data {
            let sample_i16 = (sample * i16::MAX as f32) as i16;
            file.write_all(&sample_i16.to_le_bytes())?;
        }
        
        Ok(())
    }
    
    pub fn get_recordings_dir(&self) -> &PathBuf {
        &self.recordings_dir
    }
    
    pub fn cleanup_orphaned_files(&self, database: &TranscriptionDatabase) -> Result<usize, Box<dyn std::error::Error>> {
        let mut cleaned_count = 0;
        
        if let Ok(entries) = fs::read_dir(&self.recordings_dir) {
            for entry in entries {
                let entry = entry?;
                let path = entry.path();
                
                if path.extension().and_then(|s| s.to_str()) == Some("wav") {
                    let filename = path.file_name().unwrap().to_string_lossy();
                    
                    // Check if this file is referenced in any record
                    let is_referenced = database.records.values()
                        .any(|record| record.audio_file_path.contains(&*filename));
                    
                    if !is_referenced {
                        fs::remove_file(&path)?;
                        println!("🧹 Cleaned up orphaned file: {}", filename);
                        cleaned_count += 1;
                    }
                }
            }
        }
        
        Ok(cleaned_count)
    }
}
