# Acceptance Criteria

## Core Functionality

### Audio Recording
- [ ] **AC-001**: User can start recording by holding hotkey (default: Ctrl+Shift+T, macOS: Command+Option+T)
- [ ] **AC-002**: User can stop recording by releasing hotkey
- [ ] **AC-003**: Audio levels are visualized in real-time during recording
- [ ] **AC-004**: Recording automatically stops after 30 seconds of silence
- [ ] **AC-005**: User can see recording duration and status
- [ ] **AC-006**: Audio preprocessing includes noise reduction and normalization
- [ ] **AC-007**: Very short audio clips (<1 second) are rejected and not transcribed

### Transcription Processing
- [ ] **AC-008**: Audio is processed within 2 seconds of recording stop
- [ ] **AC-009**: Transcription accuracy is >95% for clear English/Spanish speech
- [ ] **AC-010**: User can select from available Whisper models
- [ ] **AC-011**: Language detection works automatically
- [ ] **AC-012**: User can manually override language selection in settings
- [ ] **AC-013**: Last used model is remembered and selected by default

### Text Output
- [ ] **AC-014**: Transcribed text is automatically copied to clipboard
- [ ] **AC-015**: Text is automatically inserted into active text fields via keystroke simulation
- [ ] **AC-016**: If no active text field is detected, text goes to clipboard only
- [ ] **AC-017**: User can see transcription result in floating UI
- [ ] **AC-018**: Text insertion works with most common applications

### User Interface
- [ ] **AC-019**: Minimal floating UI is positioned center-bottom of screen
- [ ] **AC-020**: Main window can be minimized, floating UI stays visible
- [ ] **AC-021**: Settings panel opens from floating bar
- [ ] **AC-022**: User can configure hotkeys in settings
- [ ] **AC-023**: UI shows current model and language selection
- [ ] **AC-024**: Floating UI shows recording status and feedback
- [ ] **AC-025**: UI is unobtrusive but informative

### Configuration
- [ ] **AC-026**: User can select audio input device
- [ ] **AC-027**: User can adjust VAD sensitivity
- [ ] **AC-028**: User can configure Whisper parameters (temperature, beam_size)
- [ ] **AC-029**: Settings persist between app restarts
- [ ] **AC-030**: User can reset settings to defaults
- [ ] **AC-031**: User can download and manage Whisper models
- [ ] **AC-032**: Model download progress is shown to user

### Performance
- [ ] **AC-033**: App memory usage stays under 500MB
- [ ] **AC-034**: CPU usage under 30% during idle
- [ ] **AC-035**: Transcription processing under 2 seconds
- [ ] **AC-036**: No audio dropouts during recording
- [ ] **AC-037**: App starts in under 3 seconds

### Error Handling
- [ ] **AC-038**: Graceful handling of microphone access denied
- [ ] **AC-039**: Clear error messages shown in floating UI
- [ ] **AC-040**: Fallback behavior when no audio devices available
- [ ] **AC-041**: Recovery from model loading failures
- [ ] **AC-042**: User notification for system resource issues
- [ ] **AC-043**: Error messages are user-friendly and actionable

### Transcription History
- [ ] **AC-044**: Transcription history is stored persistently
- [ ] **AC-045**: History shows chronological list (newest to oldest)
- [ ] **AC-046**: User can copy text from history entries
- [ ] **AC-047**: User can delete individual history entries
- [ ] **AC-048**: User can download original audio for verification
- [ ] **AC-049**: User can clear entire history

## Quality Gates
- All acceptance criteria must pass before release
- Performance benchmarks must be met
- No critical bugs in core workflow
- User testing validates ease of use
- Cross-platform compatibility verified
