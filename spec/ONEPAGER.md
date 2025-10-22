# Murmullo - Voice Transcription App

## Overview
Murmullo is a real-time voice transcription application built with Tauri, React, and Whisper AI. It provides seamless audio-to-text conversion with floating UI components and hotkey support.

## Core Value Proposition
- **Real-time transcription** using Whisper AI models
- **Floating UI** that stays accessible while using other applications
- **Hotkey-driven** workflow for quick activation
- **Multi-language support** with automatic detection
- **Local processing** for privacy and offline capability

## Key Features
1. **Audio Recording & Processing**
   - Real-time audio capture from system microphones
   - Voice Activity Detection (VAD) for automatic start/stop
   - Audio level visualization and monitoring

2. **AI Transcription**
   - Multiple Whisper model support (tiny, small, base)
   - Configurable temperature and beam search parameters
   - Language detection and manual language selection

3. **User Interface**
   - Floating bar for quick access
   - Global hotkeys for recording control
   - Settings panel for configuration
   - Transcription history and management

4. **Integration**
   - Clipboard integration for easy text insertion
   - Keystroke simulation for direct text input
   - API endpoints for external integration

## Technical Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Rust + Tauri
- **AI**: Whisper (via whisper.cpp)
- **Audio**: System audio APIs
- **UI**: Custom components with Lucide icons

## Target Users
- Content creators needing quick transcription
- Developers wanting voice-to-code capabilities
- Accessibility users requiring voice input
- General users seeking efficient text input methods

## Success Metrics
- Transcription accuracy > 95% for clear speech
- Response time < 2 seconds for processing
- Memory usage < 500MB during operation
- User satisfaction with hotkey workflow
