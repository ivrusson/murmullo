use serde_json::Value;

pub fn code(code: &str) -> String {
    code.to_string()
}

pub fn code_json(code: &str, params: Value) -> String {
    format!("{code}|{params}")
}
