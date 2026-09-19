use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictionaryEntry {
    pub id: String,
    pub term: String,
    pub replacement: String,
    pub language: Option<String>,
    pub origin: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct DictionaryFile {
    entries: Vec<DictionaryEntry>,
}

const PROMPT_HEADER: &str = r#"Eres el corrector de dictado de Murmullo.
Reglas:
- No inventes contenido que no esté en el texto.
- Conserva el idioma original.
- Aplica el diccionario del usuario (nombres, marcas, jerga).
- Corrige puntuación y mayúsculas si faltan.
- Quita muletillas evidentes (eh, o sea, este) solo si no cambian el sentido.
- Devuelve únicamente el texto final, sin comillas ni explicación.
"#;

pub struct DictionaryStore {
    path: PathBuf,
    prompt_path: PathBuf,
}

impl DictionaryStore {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        crate::paths::ensure_layout();
        fs::create_dir_all(crate::paths::app_dir())?;
        Ok(Self {
            path: crate::paths::dictionary_file(),
            prompt_path: crate::paths::prompt_file(),
        })
    }

    fn load_file(&self) -> DictionaryFile {
        fs::read_to_string(&self.path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    fn save_file(&self, file: &DictionaryFile) -> Result<(), Box<dyn std::error::Error>> {
        fs::write(&self.path, serde_json::to_string_pretty(file)?)?;
        self.regenerate_prompt(file)?;
        Ok(())
    }

    pub fn list(&self) -> Vec<DictionaryEntry> {
        self.load_file().entries
    }

    pub fn add(
        &self,
        term: String,
        replacement: String,
        language: Option<String>,
        origin: &str,
    ) -> Result<DictionaryEntry, Box<dyn std::error::Error>> {
        let mut file = self.load_file();
        let term_l = term.to_lowercase();
        if let Some(idx) = file
            .entries
            .iter()
            .position(|e| e.term.to_lowercase() == term_l)
        {
            file.entries[idx].replacement = replacement.clone();
            file.entries[idx].origin = origin.to_string();
            let updated = file.entries[idx].clone();
            self.save_file(&file)?;
            return Ok(updated);
        }
        let entry = DictionaryEntry {
            id: Uuid::new_v4().to_string(),
            term,
            replacement,
            language,
            origin: origin.to_string(),
            created_at: Utc::now(),
        };
        file.entries.push(entry.clone());
        self.save_file(&file)?;
        Ok(entry)
    }

    pub fn remove(&self, id: &str) -> Result<bool, Box<dyn std::error::Error>> {
        let mut file = self.load_file();
        let before = file.entries.len();
        file.entries.retain(|e| e.id != id);
        if file.entries.len() == before {
            return Ok(false);
        }
        self.save_file(&file)?;
        Ok(true)
    }

    pub fn apply_replacements(&self, text: &str) -> String {
        let file = self.load_file();
        let mut result = text.to_string();
        let mut entries = file.entries;
        entries.sort_by(|a, b| b.term.len().cmp(&a.term.len()));
        for entry in entries {
            if entry.term.is_empty() {
                continue;
            }
            result = replace_case_insensitive(&result, &entry.term, &entry.replacement);
        }
        result
    }

    pub fn system_prompt(&self) -> String {
        if self.prompt_path.exists() {
            fs::read_to_string(&self.prompt_path)
                .unwrap_or_else(|_| self.build_prompt(&self.load_file()))
        } else {
            let prompt = self.build_prompt(&self.load_file());
            let _ = fs::write(&self.prompt_path, &prompt);
            prompt
        }
    }

    fn regenerate_prompt(&self, file: &DictionaryFile) -> Result<(), Box<dyn std::error::Error>> {
        fs::write(&self.prompt_path, self.build_prompt(file))?;
        Ok(())
    }

    fn build_prompt(&self, file: &DictionaryFile) -> String {
        let mut out = String::from(PROMPT_HEADER);
        out.push_str("\n## Diccionario\n");
        if file.entries.is_empty() {
            out.push_str("(vacío)\n");
        } else {
            for e in &file.entries {
                out.push_str(&format!("- {} → {}\n", e.term, e.replacement));
            }
        }
        out
    }
}

fn replace_case_insensitive(haystack: &str, needle: &str, replacement: &str) -> String {
    let lower = haystack.to_lowercase();
    let needle_l = needle.to_lowercase();
    if needle_l.is_empty() {
        return haystack.to_string();
    }
    let mut result = String::with_capacity(haystack.len());
    let mut last = 0;
    let mut search_from = 0;
    while let Some(pos) = lower[search_from..].find(&needle_l) {
        let abs = search_from + pos;
        result.push_str(&haystack[last..abs]);
        result.push_str(replacement);
        last = abs + needle.len();
        search_from = last;
        if search_from > haystack.len() {
            break;
        }
    }
    result.push_str(&haystack[last..]);
    result
}
