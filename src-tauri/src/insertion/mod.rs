use enigo::{Enigo, Key, Keyboard, Settings};
use tauri::api::clipboard;
use std::thread;
use std::time::Duration;

#[derive(Debug, Clone)]
pub enum InsertionMode {
    Clipboard,
    Keystroke,
    Api,
}

pub struct TextInserter {
    enigo: Enigo,
    mode: InsertionMode,
}

impl TextInserter {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let enigo = Enigo::new(&Settings::default(), Keyboard::default())?;
        
        Ok(TextInserter {
            enigo,
            mode: InsertionMode::Clipboard,
        })
    }

    pub fn set_mode(&mut self, mode: InsertionMode) {
        self.mode = mode;
    }

    pub fn insert_text(&mut self, text: &str) -> Result<(), Box<dyn std::error::Error>> {
        match self.mode {
            InsertionMode::Clipboard => self.insert_via_clipboard(text),
            InsertionMode::Keystroke => self.insert_via_keystroke(text),
            InsertionMode::Api => {
                // For future API implementation
                log::info!("API insertion mode - text: {}", text);
                Ok(())
            }
        }
    }

    fn insert_via_clipboard(&mut self, text: &str) -> Result<(), Box<dyn std::error::Error>> {
        // Copy text to clipboard
        clipboard::write_text(text)?;
        
        // Small delay to ensure clipboard is updated
        thread::sleep(Duration::from_millis(50));
        
        // Simulate Cmd+V (macOS) or Ctrl+V (Windows/Linux)
        #[cfg(target_os = "macos")]
        {
            self.enigo.key(Key::Meta, enigo::Direction::Press)?;
            self.enigo.key(Key::Unicode('v'), enigo::Direction::Press)?;
            self.enigo.key(Key::Meta, enigo::Direction::Release)?;
        }
        
        #[cfg(not(target_os = "macos"))]
        {
            self.enigo.key(Key::Control, enigo::Direction::Press)?;
            self.enigo.key(Key::Unicode('v'), enigo::Direction::Press)?;
            self.enigo.key(Key::Control, enigo::Direction::Release)?;
        }
        
        Ok(())
    }

    fn insert_via_keystroke(&mut self, text: &str) -> Result<(), Box<dyn std::error::Error>> {
        // Type each character directly
        for ch in text.chars() {
            match ch {
                '\n' => {
                    self.enigo.key(Key::Return, enigo::Direction::Press)?;
                }
                '\t' => {
                    self.enigo.key(Key::Tab, enigo::Direction::Press)?;
                }
                ' ' => {
                    self.enigo.key(Key::Space, enigo::Direction::Press)?;
                }
                _ => {
                    self.enigo.key(Key::Unicode(ch), enigo::Direction::Press)?;
                }
            }
            
            // Small delay between keystrokes to avoid overwhelming the system
            thread::sleep(Duration::from_millis(10));
        }
        
        Ok(())
    }

    pub fn get_mode(&self) -> &InsertionMode {
        &self.mode
    }
}
