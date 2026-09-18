# 🗣️ Murmullo - Offline Voice Dictation

Murmullo is an open-source desktop dictation wrapper. It records locally, transcribes with
**nemo-speech + Parakeet TDT 0.6B v3**, optionally rewrites with a local LLM + personal dictionary,
and pastes into the focused app.

See [spec/REWRITE.md](spec/REWRITE.md) for the architecture and
[spec/DECISIONS.md](spec/DECISIONS.md) for implementation decisions.

## Features

- **Offline STT**: `nemo-speech serve` + Parakeet Q8 GGUF
- **Background app**: tray + hold-to-talk (`⌘ ⌥ T`)
- **Paste into the active field**: clipboard + Cmd+V (Accessibility permission)
- **History** of dictations (raw + final text)
- **Dictionary** that regenerates the LLM system prompt
- **Optional local LLM** (Ollama-compatible HTTP). If it is down, dictation still works.

## 🚀 Installation

### Requirements

- macOS 12+ (for development)
- Rust 1.70+
- Node.js 18+
- pnpm

### Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/ivrusson/murmullo.git
   cd murmullo
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Run in development mode**

   ```bash
   pnpm tauri dev
   ```

4. **Build for production**
   ```bash
   pnpm tauri build
   ```

## 📱 Usage

### Initial Setup

1. **Permissions**: The application will automatically request the necessary permissions:
   - Microphone Permission (required)
   - Accessibility Permission (required)
   - Input Monitoring Permission (optional)

2. **Runtimes**: Open the Runtimes tab.
   - Install [nemo-speech](https://github.com/NVIDIA/NeMo-Speech.cpp) (or set `NEMO_SPEECH_BIN`)
   - Download Parakeet Q8 (~714 MB)
   - Start the STT server (auto-starts on launch once the model is present)
   - Optionally install [Ollama](https://ollama.com) and start the LLM

3. **Dictate**: Hold `⌘ ⌥ T`, speak, release. Text is corrected (dictionary ± LLM) and pasted into
   the focused app.

### Voice Dictation

1. **Select Device**: In the "Transcription" tab, select your microphone
2. **Start Recording**: Click "Start Recording" or use the global hotkey
3. **View Audio Waveform**: The visualization shows microphone activity in real-time
4. **Stop Recording**: Click "Stop Recording" to process the audio
5. **Insert Text**: Use "Insert Text" to paste the transcription into the active application

### Floating Bar

The floating bar is a key feature that provides a compact, always-on-top interface for voice
dictation:

#### **Visual States**

- **Idle**: Shows microphone icon and "Press to record" text
- **Recording**: Displays animated waveform and recording indicator
- **Processing**: Shows loading dots while transcribing audio
- **Complete**: Displays transcription result with duration and model info
- **Error**: Shows error message with tooltip above the bar

#### **Features**

- **Glassmorphism Design**: Semi-transparent background with blur effects
- **Dynamic Sizing**: Adapts width based on content (max 260px × 30px)
- **Always On Top**: Stays visible above other applications
- **Real-time Audio Visualization**: Live waveform during recording
- **Error Handling**: Clear error messages with auto-recovery
- **Responsive Layout**: Compact design that doesn't interfere with workflow

#### **Usage**

1. The floating bar appears automatically when the app starts
2. Click anywhere on the bar to start recording
3. Visual feedback shows recording state with animated waveform
4. Processing state displays loading animation
5. Completed transcriptions show briefly before returning to idle
6. Errors are displayed with tooltips and auto-recovery after 5 seconds

## 🏗️ Architecture

Murmullo is a thin desktop wrapper (see [spec/REWRITE.md](spec/REWRITE.md)):

- **RuntimeManager**: starts/stops `nemo-speech serve` and optional Ollama on localhost
- **AudioCapture / AudioProcessor**: 16 kHz capture + speech gate
- **HTTP STT client**: `POST /v1/audio/transcriptions` (Parakeet Q8 GGUF)
- **Dictionary + PostProcessor**: deterministic replacements, then optional LLM rewrite
- **TextInserter**: clipboard + Cmd+V (Accessibility on macOS)
- **History / overlay / tray**: hold-to-talk, paste into the focused app

Frontend pages: Historial, Instalador (Runtimes), Diccionario, Permissions, Settings.

## 🔧 Development

### Spec-First Methodology

This project uses a **spec-first** methodology with complete documentation in the `spec/` folder:

- **ONEPAGER.md**: Project overview
- **FEATURES.md**: Detailed feature breakdown
- **IMPLEMENTATION-ROADMAP.md**: 8-week roadmap
- **TASKS-PHASE1.md**: Specific tasks for Phase 1
- **PR-PROPOSALS.md**: Pull Request proposals
- **ACCEPTANCE.md**: Acceptance criteria
- **QUESTIONS.md**: Key project questions

### Project Structure

```
murmullo/
├── src/                    # Frontend React
│   ├── components/         # UI Components
│   │   ├── features/       # Feature-specific components
│   │   ├── forms/          # Form components
│   │   ├── layout/         # Layout components
│   │   ├── pages/          # Main pages
│   │   └── ui/             # Base UI components (shadcn/ui)
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom hooks
│   ├── services/           # Tauri services
│   ├── styles/             # CSS styles
│   ├── types/              # TypeScript types
│   └── App.tsx             # Main component
├── src-tauri/              # Backend Rust
│   ├── src/
│   │   ├── audio/          # Audio capture and processing
│   │   ├── runtime/        # nemo-speech / LLM process manager
│   │   ├── dictionary/     # Local terms + versioned prompt
│   │   ├── postprocess/    # Dictionary then LLM
│   │   ├── models/         # Parakeet GGUF download
│   │   ├── transcription/  # HTTP STT client + history
│   │   ├── insertion/      # Paste into focused app
│   │   ├── commands.rs     # Tauri commands
│   │   └── lib.rs         # Entry point
│   └── Cargo.toml         # Rust dependencies
├── spec/                   # Project documentation
├── models/                 # Downloaded Whisper models
├── recordings/             # Audio recordings
├── public/                 # Public files
├── dist/                   # Production build
└── package.json           # Node.js dependencies
```

### Available Commands

```bash
# Development
pnpm tauri dev              # Run in development mode
pnpm tauri build           # Build for production
pnpm tauri build --debug   # Build in debug mode

# Frontend
pnpm build                 # Build frontend only
pnpm dev                   # Frontend development server
```

## 🛠️ Development Status

### ✅ Implemented

- [x] Desktop wrapper around nemo-speech + Parakeet Q8
- [x] Runtime installer (CLI, GGUF, STT server, optional LLM)
- [x] Hold-to-talk, paste into the focused app, history
- [x] Dictionary + versioned system prompt
- [x] Overlay bar states (idle / recording / processing / done / error)
- [x] Tray + close-to-background

### 🚧 Later

- [ ] Overlay visual redesign
- [ ] Package `nemo-speech` as a Tauri externalBin
- [ ] LLM runtime choice beyond Ollama HTTP

### 📋 Upcoming Features

- [ ] GPU/Metal support for macOS
- [ ] Local REST API for integrations
- [ ] Server mode for external plugins
- [ ] Support for more languages
- [ ] Automatic punctuation

### 🎨 Planned UI/UX Improvements

#### **Visual Enhancements**

- [ ] **Dark/Light Theme Toggle**: System preference detection and manual switching
- [ ] **Custom Color Schemes**: User-defined accent colors and themes
- [ ] **Improved Typography**: Better font hierarchy and readability
- [ ] **Micro-interactions**: Smooth transitions and hover effects
- [ ] **Loading States**: Better skeleton screens and progress indicators

#### **Floating Bar Improvements**

- [ ] **Customizable Position**: Drag to reposition, remember location
- [ ] **Size Options**: Small, medium, large floating bar variants
- [ ] **Transparency Controls**: Adjustable opacity levels
- [ ] **Quick Actions**: Right-click context menu with shortcuts
- [ ] **Keyboard Shortcuts**: Direct keyboard control without clicking

#### **Main Interface Enhancements**

- [ ] **Dashboard Redesign**: More intuitive layout with better information hierarchy
- [ ] **Settings Organization**: Grouped settings with search functionality
- [ ] **Model Management**: Visual model comparison and performance metrics
- [ ] **Transcription History**: Better search, filtering, and export options
- [ ] **Accessibility**: Screen reader support and keyboard navigation

#### **User Experience**

- [ ] **Onboarding Flow**: Interactive tutorial for new users
- [ ] **Tooltips and Help**: Contextual help throughout the interface
- [ ] **Error Recovery**: Better error messages with suggested actions
- [ ] **Performance Indicators**: Real-time CPU/GPU usage during transcription
- [ ] **Customizable Layouts**: User-defined workspace arrangements

## 🤝 Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for more details.

## 🙏 Acknowledgments

- [NeMo-Speech.cpp](https://github.com/NVIDIA/NeMo-Speech.cpp) - Local ASR server
- [Parakeet TDT](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3) - NVIDIA multilingual ASR
- [Tauri](https://tauri.app/) - Desktop application framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

## 📞 Support

If you encounter any issues or have questions:

1. Check existing [Issues](https://github.com/ivrusson/murmullo/issues)
2. Create a new issue with problem details
3. Include operating system and version information

---

**Murmullo** - Democratizing offline dictation, a local, free and transparent alternative. 🗣️✨
