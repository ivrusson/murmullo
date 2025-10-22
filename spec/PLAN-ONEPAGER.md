# Murmullo Implementation Plan

## Project Vision
A simple, plug-and-play voice transcription app that works with a single hotkey press. Users hold the hotkey, speak, and get text copied to clipboard or inserted into active text fields.

## Core Philosophy
- **Simplicity First**: Almost plug-and-play experience
- **Casual Users**: Designed for non-technical users
- **Hold-to-Record**: Single hotkey interaction model
- **Automatic Integration**: Clipboard + keystroke simulation

## Implementation Strategy

### Phase 1: Core MVP (Weeks 1-4)
**Goal**: Basic hold-to-record functionality with transcription

**Key Features**:
- Hold hotkey (Ctrl+Shift+T / Cmd+Option+T) to record
- Release hotkey to stop and transcribe
- Copy result to clipboard automatically
- Minimal floating UI showing recording status
- Basic model selection and language configuration

**Success Criteria**:
- User can hold hotkey, speak, and get text in clipboard
- Recording status is clearly visible
- Works on macOS (primary platform)

### Phase 2: Enhanced Integration (Weeks 5-6)
**Goal**: Seamless text insertion into active applications

**Key Features**:
- Keystroke simulation for direct text insertion
- Smart detection of active text fields
- Improved floating UI with minimal footprint
- Error handling and user feedback

**Success Criteria**:
- Text automatically appears in active text fields
- Floating UI is unobtrusive but informative
- Error messages are clear and helpful

### Phase 3: Polish & Reliability (Weeks 7-8)
**Goal**: Production-ready experience

**Key Features**:
- Transcription history with management
- Audio preprocessing (noise reduction, normalization)
- Model download and management
- Cross-platform compatibility (Windows, Linux)
- Performance optimization

**Success Criteria**:
- App feels polished and reliable
- Users can manage their transcription history
- Works consistently across platforms

## Technical Architecture

### Core Components
1. **Hotkey Manager**: Global hotkey registration and handling
2. **Audio Pipeline**: Recording → Processing → Transcription
3. **Floating UI**: Minimal status indicator and controls
4. **Integration Layer**: Clipboard + keystroke simulation
5. **Configuration**: Model selection, language, settings

### Technology Stack
- **Frontend**: React + TypeScript (existing)
- **Backend**: Rust + Tauri (existing)
- **AI**: Whisper.cpp (existing)
- **Audio**: System audio APIs
- **UI**: Minimal floating components

### Key Design Decisions
- **Hold-to-Record**: Single interaction model for simplicity
- **Automatic Integration**: Clipboard + keystroke simulation
- **Minimal UI**: Small floating indicator, main window can be minimized
- **Model Persistence**: Remember last used model in configuration
- **Error Visibility**: Show errors in floating UI

## Risk Mitigation
- **Audio Permissions**: Clear setup instructions for microphone access
- **Model Downloads**: Progress indicators and error handling
- **Cross-Platform**: Test early and often on target platforms
- **Performance**: Monitor memory usage and optimize as needed

## Success Metrics
- **Usability**: Users can transcribe text in <30 seconds from first launch
- **Reliability**: >95% success rate for clear speech
- **Performance**: <2 second processing time
- **Adoption**: Users continue using after first week
