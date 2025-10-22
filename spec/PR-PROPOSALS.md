# PR Proposals for Murmullo MVP

## PR #1: Global Hotkey System
**Title**: `feat: implement global hotkey system for hold-to-record functionality`
**Type**: Feature
**Priority**: Critical
**Estimated Time**: 2 days

### Description
Implement global hotkey registration and hold-to-record functionality that works across all applications. Users can hold Ctrl+Shift+T (Cmd+Option+T on macOS) to start recording and release to stop.

### Changes
**Backend Changes**:
- Add `global-shortcut` dependency to `Cargo.toml`
- Create `src-tauri/src/services/hotkey_service.rs`
- Implement global hotkey registration
- Add keydown/keyup event handling
- Add error handling for hotkey conflicts

**Frontend Changes**:
- Update `src/hooks/useHotkeyEvents.ts`
- Add hotkey state management
- Implement recording state transitions
- Add visual feedback for hotkey status

**Configuration Changes**:
- Update `src-tauri/tauri.conf.json` for hotkey permissions
- Add hotkey configuration options

### Acceptance Criteria
- [ ] AC-001: User can start recording by holding hotkey
- [ ] AC-002: User can stop recording by releasing hotkey
- [ ] Hotkey works globally across all applications
- [ ] No conflicts with system hotkeys
- [ ] Works on macOS, Windows, and Linux

### Testing
- [ ] Test hotkey registration on all platforms
- [ ] Verify no conflicts with system hotkeys
- [ ] Test hold-to-record functionality
- [ ] Test error handling for conflicts

### Files Modified
```
src-tauri/Cargo.toml
src-tauri/src/services/hotkey_service.rs
src/hooks/useHotkeyEvents.ts
src-tauri/tauri.conf.json
```

---

## PR #2: Audio Capture System
**Title**: `feat: implement real-time audio capture with level monitoring`
**Type**: Feature
**Priority**: Critical
**Estimated Time**: 3 days

### Description
Implement real-time audio capture from system microphone with audio level monitoring and visualization. Includes microphone permission handling and audio device selection.

### Changes
**Backend Changes**:
- Add `cpal` dependency for audio capture
- Create `src-tauri/src/services/audio_service.rs`
- Implement audio capture functionality
- Add audio level calculation
- Implement audio buffer management
- Add microphone permission handling

**Frontend Changes**:
- Create `src/components/AudioLevelVisualization.tsx`
- Implement real-time audio level display
- Add recording status indicators
- Create audio device selection UI

**Configuration Changes**:
- Update `src-tauri/tauri.conf.json` for microphone permissions
- Add audio device configuration

### Acceptance Criteria
- [ ] AC-003: Audio levels are visualized in real-time
- [ ] AC-005: User can see recording duration and status
- [ ] AC-026: User can select audio input device
- [ ] Audio captured in real-time
- [ ] Microphone permissions handled gracefully

### Testing
- [ ] Test audio capture on different devices
- [ ] Verify audio level accuracy
- [ ] Test microphone permission handling
- [ ] Test audio quality and clarity

### Files Modified
```
src-tauri/Cargo.toml
src-tauri/src/services/audio_service.rs
src/components/AudioLevelVisualization.tsx
src/components/GlobalSelectors.tsx
src-tauri/tauri.conf.json
```

---

## PR #3: Minimal Floating UI
**Title**: `feat: create minimal floating UI positioned center-bottom`
**Type**: Feature
**Priority**: High
**Estimated Time**: 2 days

### Description
Create minimal floating interface that stays on top of other applications, positioned center-bottom of the screen. Provides recording status and quick access to settings.

### Changes
**Backend Changes**:
- Update `src-tauri/tauri.conf.json` for floating window configuration
- Implement window positioning (center-bottom)
- Add window state management

**Frontend Changes**:
- Update `src/components/FloatingBar.tsx`
- Implement center-bottom positioning
- Add recording status display
- Create minimal, unobtrusive design
- Add settings access button

**Styling Changes**:
- Update `src/styles/floating-bar.css`
- Implement responsive design
- Add visual feedback for states
- Ensure cross-platform consistency

### Acceptance Criteria
- [ ] AC-019: Minimal floating UI positioned center-bottom
- [ ] AC-020: Main window can be minimized, floating UI stays visible
- [ ] AC-024: Floating UI shows recording status and feedback
- [ ] AC-025: UI is unobtrusive but informative
- [ ] Always stays on top of other windows

### Testing
- [ ] Test positioning on different screen sizes
- [ ] Verify always-on-top behavior
- [ ] Test recording status display
- [ ] Test cross-platform consistency

### Files Modified
```
src-tauri/tauri.conf.json
src/components/FloatingBar.tsx
src/styles/floating-bar.css
src/components/FloatingBarStates.tsx
```

---

## PR #4: Whisper Integration
**Title**: `feat: integrate Whisper.cpp for speech-to-text conversion`
**Type**: Feature
**Priority**: Critical
**Estimated Time**: 4 days

### Description
Integrate Whisper.cpp for AI-powered speech-to-text conversion with model management, language detection, and performance optimization. Supports English and Spanish with >95% accuracy.

### Changes
**Backend Changes**:
- Add `whisper-rs` dependency
- Create `src-tauri/src/services/whisper_service.rs`
- Implement model loading functionality
- Add transcription processing
- Implement language detection
- Add performance optimization

**Frontend Changes**:
- Update `src/services/transcriptionService.ts`
- Add model selection interface
- Implement language selection
- Add transcription result display

**Configuration Changes**:
- Add model storage configuration
- Update `src-tauri/tauri.conf.json` for model permissions

### Acceptance Criteria
- [ ] AC-008: Audio is processed within 2 seconds
- [ ] AC-009: Transcription accuracy >95% for English/Spanish
- [ ] AC-010: User can select from available Whisper models
- [ ] AC-011: Language detection works automatically
- [ ] AC-013: Last used model is remembered

### Testing
- [ ] Test with different audio qualities
- [ ] Verify accuracy with English/Spanish
- [ ] Test processing time (<2 seconds)
- [ ] Test language detection

### Files Modified
```
src-tauri/Cargo.toml
src-tauri/src/services/whisper_service.rs
src/services/transcriptionService.ts
src/components/GlobalSelectors.tsx
src-tauri/tauri.conf.json
```

---

## PR #5: Clipboard Integration
**Title**: `feat: implement automatic clipboard copying after transcription`
**Type**: Feature
**Priority**: High
**Estimated Time**: 1 day

### Description
Implement automatic clipboard copying of transcribed text with error handling and cross-platform support.

### Changes
**Backend Changes**:
- Add `clipboard` dependency
- Implement `copy_to_clipboard()` function
- Add clipboard error handling
- Create clipboard service

**Frontend Changes**:
- Integrate clipboard copying in transcription flow
- Add success/error feedback
- Update UI after transcription

### Acceptance Criteria
- [ ] AC-014: Transcribed text is automatically copied to clipboard
- [ ] Error handling for clipboard access
- [ ] Works on all platforms

### Testing
- [ ] Test clipboard copying
- [ ] Verify error handling
- [ ] Test across platforms

### Files Modified
```
src-tauri/Cargo.toml
src-tauri/src/services/clipboard_service.rs
src/services/transcriptionService.ts
src/components/FloatingBar.tsx
```

---

## PR #6: Keystroke Simulation
**Title**: `feat: implement keystroke simulation for direct text insertion`
**Type**: Feature
**Priority**: High
**Estimated Time**: 3 days

### Description
Implement keystroke simulation for direct text insertion into active text fields with fallback to clipboard and security permission handling.

### Changes
**Backend Changes**:
- Add `enigo` dependency for keystroke simulation
- Implement `simulate_keystrokes()` function
- Add active window detection
- Create fallback mechanism
- Add security permission handling

**Frontend Changes**:
- Add insertion method selection
- Implement user preferences
- Add feedback for insertion

### Acceptance Criteria
- [ ] AC-015: Text is automatically inserted into active text fields
- [ ] AC-016: If no active text field detected, text goes to clipboard only
- [ ] AC-018: Text insertion works with most common applications
- [ ] Security permissions handled properly

### Testing
- [ ] Test with common applications
- [ ] Verify security permissions
- [ ] Test fallback behavior

### Files Modified
```
src-tauri/Cargo.toml
src-tauri/src/services/keystroke_service.rs
src/components/GlobalSelectors.tsx
src/contexts/AppConfigContext.tsx
```

---

## PR #7: Error Handling System
**Title**: `feat: implement comprehensive error handling and user feedback`
**Type**: Feature
**Priority**: High
**Estimated Time**: 2 days

### Description
Implement comprehensive error handling framework with user-friendly error messages and recovery mechanisms.

### Changes
**Backend Changes**:
- Create error handling framework
- Add user-friendly error messages
- Implement error recovery mechanisms
- Add logging system

**Frontend Changes**:
- Create error display components
- Implement error state management
- Add user feedback system
- Create error recovery UI

### Acceptance Criteria
- [ ] AC-038: Graceful handling of microphone access denied
- [ ] AC-039: Clear error messages shown in floating UI
- [ ] AC-043: Error messages are user-friendly and actionable
- [ ] Recovery mechanisms work

### Testing
- [ ] Test error scenarios
- [ ] Verify error messages
- [ ] Test recovery mechanisms

### Files Modified
```
src-tauri/src/services/error_service.rs
src/components/ErrorDisplay.tsx
src/contexts/AppConfigContext.tsx
src/components/FloatingBar.tsx
```

---

## PR #8: Audio Preprocessing
**Title**: `feat: implement audio preprocessing for better quality`
**Type**: Feature
**Priority**: Medium
**Estimated Time**: 2 days

### Description
Implement audio preprocessing including noise reduction, normalization, silence detection, and short clip rejection.

### Changes
**Backend Changes**:
- Add audio processing dependencies
- Implement noise reduction
- Add audio normalization
- Create silence detection
- Add short clip rejection

### Acceptance Criteria
- [ ] AC-006: Audio preprocessing includes noise reduction and normalization
- [ ] AC-004: Recording automatically stops after 30 seconds of silence
- [ ] AC-007: Very short audio clips (<1 second) are rejected
- [ ] Performance impact minimal

### Testing
- [ ] Test audio quality improvement
- [ ] Verify silence detection
- [ ] Test short clip rejection

### Files Modified
```
src-tauri/Cargo.toml
src-tauri/src/services/audio_service.rs
src/services/transcriptionService.ts
```

---

## Implementation Order

### Week 1: Foundation
1. **PR #1**: Global Hotkey System
2. **PR #2**: Audio Capture System
3. **PR #3**: Minimal Floating UI

### Week 2: Core Functionality
4. **PR #4**: Whisper Integration
5. **PR #5**: Clipboard Integration

### Week 3: Integration
6. **PR #6**: Keystroke Simulation

### Week 4: Polish
7. **PR #7**: Error Handling System
8. **PR #8**: Audio Preprocessing

## Quality Gates

### Before Each PR
- [ ] All tests pass
- [ ] Code reviewed
- [ ] Acceptance criteria met
- [ ] Cross-platform tested

### Before MVP Release
- [ ] All PRs merged
- [ ] Integration testing complete
- [ ] Performance benchmarks met
- [ ] User acceptance testing passed
