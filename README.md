# 🗣️ Murmullo - Offline Voice Dictation

Murmullo is an open-source application that allows you to dictate text in any application (Teams, Cursor, VSCode, Slack, etc.) completely offline. It uses local speech recognition models (Whisper) without internet connection, preserving privacy and offering a smooth voice dictation experience.

## 🎯 Key Features

- **Completely Offline**: No internet connection, no telemetry
- **Cross-platform**: Windows, macOS, Linux
- **Modern Interface**: Built with Tauri + React + Tailwind CSS
- **Whisper Models**: Support for local models of different sizes
- **Real-time Visualization**: Microphone audio waveform
- **Model Management**: Download and selection of local models
- **macOS Permissions**: Automatic configuration of required permissions

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

2. **Download Models**: Go to the "Models" tab and download a Whisper model:
   - **Tiny**: Faster, lower accuracy (~39MB)
   - **Base**: Good balance (~142MB)
   - **Small**: Better accuracy (~244MB)
   - **Medium**: High accuracy (~769MB)
   - **Large**: Maximum accuracy (~1.55GB)

3. **Configure**: Go to "Settings" to:
   - Select the downloaded model
   - Configure language
   - Adjust transcription parameters

### Voice Dictation

1. **Select Device**: In the "Transcription" tab, select your microphone
2. **Start Recording**: Click "Start Recording" or use the global hotkey
3. **View Audio Waveform**: The visualization shows microphone activity in real-time
4. **Stop Recording**: Click "Stop Recording" to process the audio
5. **Insert Text**: Use "Insert Text" to paste the transcription into the active application

### Floating Bar

The floating bar is a key feature that provides a compact, always-on-top interface for voice dictation:

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

### Frontend (React + Tailwind CSS)
- **DashboardPage**: Main page with recording controls and audio visualization
- **SettingsPage**: Model and parameter configuration with ComboBox components
- **ModelsPage**: Whisper model download management with progress tracking
- **TranscriptionsPage**: Transcription history with search and filtering
- **PermissionsPage**: System permissions configuration and status
- **FloatingBar**: Always-on-top dictation bar with glassmorphism design
- **FloatingBarStates**: Visual state components (Idle, Recording, Processing, Complete, Error)
- **GlobalSelectors**: Global device, language and model selectors
- **WaveformVisualization**: Real-time audio waveform display

### Backend (Rust + Tauri)
- **ModelManager**: Local Whisper model management
- **AudioCapture**: Microphone audio capture (in development)
- **TranscriptionEngine**: Transcription engine with whisper-rs (in development)
- **TextInserter**: Text insertion in applications (in development)

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
│   │   ├── models/         # Whisper model management
│   │   ├── transcription/  # Transcription engine
│   │   ├── insertion/      # Text insertion
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
- [x] Complete UI with Tailwind CSS and shadcn/ui components
- [x] Page system (Dashboard, Settings, Models, Transcriptions, Permissions)
- [x] Floating bar with glassmorphism design and visual states
- [x] Real-time audio waveform visualization with animated bars
- [x] Whisper model management with download and loading
- [x] macOS permissions configuration and status checking
- [x] Transcription system with SQLite database persistence
- [x] ComboBox and modern UI components with proper styling
- [x] Error handling with tooltips and auto-recovery
- [x] Complete Tauri commands structure for all features
- [x] Build and distribution system

### 🚧 In Development
- [ ] Complete audio capture integration with cpal
- [ ] Fully functional transcription engine with whisper-rs
- [ ] Text insertion with enigo
- [ ] Global hotkeys for push-to-talk
- [ ] Automatic model download from Hugging Face
- [ ] UI/UX improvements and polish
- [ ] Enhanced floating bar interactions
- [ ] Better visual feedback and animations

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

- [Whisper](https://github.com/openai/whisper) - OpenAI's speech recognition model
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) - Efficient C++ implementation
- [Tauri](https://tauri.app/) - Desktop application framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

## 📞 Support

If you encounter any issues or have questions:

1. Check existing [Issues](https://github.com/ivrusson/murmullo/issues)
2. Create a new issue with problem details
3. Include operating system and version information

---

**Murmullo** - Democratizing offline dictation, a local, free and transparent alternative. 🗣️✨