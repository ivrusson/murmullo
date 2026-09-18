use crate::dictionary::DictionaryStore;

/// Deterministic dictionary pass, then optional LLM rewrite.
/// LLM failure never breaks dictation.
pub struct PostProcessor;

impl PostProcessor {
    pub fn run(
        raw: &str,
        dictionary: &DictionaryStore,
        llm_rewrite: Option<String>,
    ) -> (String, bool) {
        let with_dict = dictionary.apply_replacements(raw);
        match llm_rewrite {
            Some(text) if !text.trim().is_empty() => (text.trim().to_string(), true),
            _ => (with_dict, false),
        }
    }
}
