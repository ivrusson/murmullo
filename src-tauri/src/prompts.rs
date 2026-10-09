use serde::{Deserialize, Serialize};
use std::fs;

pub const PROVIDER_PROMPT_DEFAULT: &str = r#"Eres el corrector de dictado de Murmullo.
Reglas:
- No inventes contenido que no esté en el texto.
- Conserva el idioma original.
- Aplica el diccionario del usuario (nombres, marcas, jerga).
- Corrige puntuación y mayúsculas si faltan.
- Quita muletillas evidentes (eh, o sea, este) solo si no cambian el sentido.
- Devuelve únicamente el texto final, sin comillas ni explicación.
"#;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct CorrectionPromptOverrides {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub es: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub en: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CorrectionPromptState {
    pub es: Option<String>,
    pub en: Option<String>,
    pub provider: Option<String>,
    pub provider_default: String,
}

pub fn provider_header() -> String {
    load()
        .provider
        .filter(|text| !text.trim().is_empty())
        .unwrap_or_else(|| PROVIDER_PROMPT_DEFAULT.to_string())
}

pub fn state() -> CorrectionPromptState {
    let stored = load();
    CorrectionPromptState {
        es: stored.es,
        en: stored.en,
        provider: stored.provider,
        provider_default: PROVIDER_PROMPT_DEFAULT.to_string(),
    }
}

pub fn set_override(slot: &str, text: Option<String>) -> Result<CorrectionPromptState, String> {
    let mut stored = load();
    let next = normalize_override(text);
    match slot {
        "es" => stored.es = next,
        "en" => stored.en = next,
        "provider" => {
            stored.provider = next.filter(|value| value.trim() != PROVIDER_PROMPT_DEFAULT.trim());
        }
        _ => return Err(format!("unknown correction prompt: {slot}")),
    }
    save(&stored)?;
    Ok(state())
}

fn normalize_override(text: Option<String>) -> Option<String> {
    text.map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn load() -> CorrectionPromptOverrides {
    let _ = crate::paths::ensure_layout();
    fs::read_to_string(crate::paths::correction_prompts_file())
        .ok()
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_default()
}

fn save(stored: &CorrectionPromptOverrides) -> Result<(), String> {
    let _ = crate::paths::ensure_layout();
    let raw = serde_json::to_string_pretty(stored).map_err(|err| err.to_string())?;
    fs::write(crate::paths::correction_prompts_file(), raw).map_err(|err| err.to_string())
}

#[cfg(test)]
mod tests {
    use super::normalize_override;

    #[test]
    fn blank_override_clears_the_custom_prompt() {
        assert_eq!(normalize_override(None), None);
        assert_eq!(normalize_override(Some("  ".into())), None);
        assert_eq!(
            normalize_override(Some("  Corrige nombres.  ".into())),
            Some("Corrige nombres.".into())
        );
    }
}
