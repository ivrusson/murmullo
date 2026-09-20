#!/usr/bin/env bash
# Murmullo guided installer (macOS / Linux).
# Bash 3.2 compatible (macOS /usr/bin/bash).
#
#   git clone https://github.com/ivrusson/murmullo.git
#   cd murmullo
#   ./install.sh
#
# Flags: --yes  --dev  --build  --dry-run  --lang es|en  --help

set -euo pipefail

if [ -z "${BASH_VERSION:-}" ]; then
  echo "Run with bash: bash install.sh" >&2
  exit 1
fi

REPO_URL="${MURMULLO_REPO_URL:-https://github.com/ivrusson/murmullo.git}"
CLONE_DIR="${MURMULLO_DIR:-$HOME/murmullo}"
MIN_NODE_MAJOR=18
MIN_MACOS_MAJOR=12

MURMULLO_LANG="en"
ASSUME_YES=0
DO_DEV=0
DO_BUILD=0
DRY_RUN=0
ROOT=""

if [ -z "${TERM:-}" ]; then
  TERM=dumb
fi

if [ -t 1 ] && command -v tput >/dev/null 2>&1; then
  BOLD="$(tput bold 2>/dev/null || true)"
  DIM="$(tput dim 2>/dev/null || true)"
  RED="$(tput setaf 1 2>/dev/null || true)"
  GREEN="$(tput setaf 2 2>/dev/null || true)"
  YELLOW="$(tput setaf 3 2>/dev/null || true)"
  BLUE="$(tput setaf 4 2>/dev/null || true)"
  RESET="$(tput sgr0 2>/dev/null || true)"
else
  BOLD="" DIM="" RED="" GREEN="" YELLOW="" BLUE="" RESET=""
fi

usage() {
  cat <<'EOF'
Murmullo guided installer

Usage:
  ./install.sh [options]

Options:
  --yes, -y          Non-interactive (install missing tools without asking)
  --dev              Start `pnpm tauri dev` after setup
  --build            Compile a release build (`pnpm tauri build`)
  --dry-run          Only report what is missing
  --lang es|en       Force language (default: $LANG)
  --dir PATH         Clone destination if this is not already the repo
  --help, -h         Show this help

macOS 12+ is the supported dictation platform. Windows/Linux can compile, but
paste into the focused app is not implemented yet.
EOF
}

detect_lang() {
  _lang=$(printf '%s' "${LC_ALL:-${LC_MESSAGES:-${LANG:-en}}}" | tr '[:upper:]' '[:lower:]')
  case "$_lang" in
    es*) MURMULLO_LANG=es ;;
    *) MURMULLO_LANG=en ;;
  esac
}

t() {
  case "$1.$MURMULLO_LANG" in
    banner.en) echo "Murmullo setup" ;;
    banner.es) echo "Instalación de Murmullo" ;;
    tagline.en) echo "Offline voice dictation. A small presence that listens." ;;
    tagline.es) echo "Dictado de voz local. Una pequeña presencia que te escucha." ;;
    start.en) echo "This assistant prepares the toolchain so you can run Murmullo from this repository." ;;
    start.es) echo "Este asistente prepara las herramientas para ejecutar Murmullo desde el repositorio." ;;
    macos_ok.en) echo "Dictation (hotkey + paste) is supported on this Mac." ;;
    macos_ok.es) echo "El dictado (atajo + pegado) está soportado en este Mac." ;;
    not_macos.en) echo "This OS can compile Murmullo, but pasting into the focused app is not implemented yet. Use it for development only." ;;
    not_macos.es) echo "Este sistema puede compilar Murmullo, pero pegar en la app activa aún no está implementado. Úsalo solo para desarrollo." ;;
    old_macos.en) echo "Murmullo needs macOS 12 or later." ;;
    old_macos.es) echo "Murmullo necesita macOS 12 o posterior." ;;
    found_repo.en) echo "Using repository at" ;;
    found_repo.es) echo "Usando el repositorio en" ;;
    clone_q.en) echo "Murmullo is not in this folder. Clone it to ${CLONE_DIR}?" ;;
    clone_q.es) echo "Murmullo no está en esta carpeta. ¿Clonar a ${CLONE_DIR}?" ;;
    cloning.en) echo "Cloning Murmullo…" ;;
    cloning.es) echo "Clonando Murmullo…" ;;
    check_tools.en) echo "Checking tools" ;;
    check_tools.es) echo "Comprobando herramientas" ;;
    missing.en) echo "missing" ;;
    missing.es) echo "falta" ;;
    found.en) echo "ok" ;;
    found.es) echo "ok" ;;
    install_q.en) echo "Install missing tools now?" ;;
    install_q.es) echo "¿Instalar ahora lo que falta?" ;;
    skip_tools.en) echo "Skipping installs. Install the missing tools and run this script again." ;;
    skip_tools.es) echo "No se instala nada. Instala lo que falta y vuelve a ejecutar el script." ;;
    clt.en) echo "Xcode Command Line Tools are required. A macOS dialog will open. Install them, then press Enter here." ;;
    clt.es) echo "Hacen falta las Command Line Tools de Xcode. Se abrirá un diálogo de macOS. Instálalas y pulsa Enter aquí." ;;
    brew_q.en) echo "Homebrew is the easiest way to install Node.js. Install Homebrew?" ;;
    brew_q.es) echo "Homebrew es la forma más sencilla de instalar Node.js. ¿Instalar Homebrew?" ;;
    node_q.en) echo "Install Node.js 18+ with Homebrew?" ;;
    node_q.es) echo "¿Instalar Node.js 18+ con Homebrew?" ;;
    rust_q.en) echo "Install Rust with rustup (stable)?" ;;
    rust_q.es) echo "¿Instalar Rust con rustup (stable)?" ;;
    pnpm_q.en) echo "Install pnpm?" ;;
    pnpm_q.es) echo "¿Instalar pnpm?" ;;
    linux_deps_q.en) echo "Install Tauri system libraries (needs sudo)?" ;;
    linux_deps_q.es) echo "¿Instalar las librerías de sistema de Tauri (necesita sudo)?" ;;
    deps.en) echo "Installing JavaScript dependencies (pnpm install)…" ;;
    deps.es) echo "Instalando dependencias de JavaScript (pnpm install)…" ;;
    build_q.en) echo "Compile a release build now? First compile takes several minutes." ;;
    build_q.es) echo "¿Compilar una build de release ahora? La primera vez tarda varios minutos." ;;
    building.en) echo "Compiling Murmullo…" ;;
    building.es) echo "Compilando Murmullo…" ;;
    dev_q.en) echo "Start Murmullo in development mode now (pnpm tauri dev)?" ;;
    dev_q.es) echo "¿Arrancar Murmullo en modo desarrollo ahora (pnpm tauri dev)?" ;;
    next.en) echo "Next inside the app" ;;
    next.es) echo "Siguiente paso dentro de la app" ;;
    next_1.en) echo "Permissions — microphone, Input Monitoring, Accessibility." ;;
    next_1.es) echo "Permisos — micrófono, Input Monitoring y Accesibilidad." ;;
    next_2.en) echo "Runtimes — one click installs nemo-speech and downloads Parakeet Q8 (~714 MB)." ;;
    next_2.es) echo "Runtimes — un clic instala nemo-speech y descarga Parakeet Q8 (~714 MB)." ;;
    next_3.en) echo "Hold ⌘ ⌥ T (or your shortcut), speak, release. Text pastes into the focused app." ;;
    next_3.es) echo "Mantén ⌘ ⌥ T (o tu atajo), habla y suelta. El texto se pega en la app activa." ;;
    done.en) echo "Toolchain is ready." ;;
    done.es) echo "Herramientas listas." ;;
    dry.en) echo "Dry run — nothing was installed." ;;
    dry.es) echo "Simulación — no se ha instalado nada." ;;
    abort.en) echo "Stopped." ;;
    abort.es) echo "Detenido." ;;
    need_tty.en) echo "No terminal for questions. Re-run with --yes, or from a real terminal." ;;
    need_tty.es) echo "No hay terminal para preguntas. Vuelve a ejecutar con --yes, o en una terminal." ;;
    node_manual.en) echo "Install Node.js 18 or later from https://nodejs.org and run this script again." ;;
    node_manual.es) echo "Instala Node.js 18 o posterior desde https://nodejs.org y vuelve a ejecutar este script." ;;
    *) echo "$1" ;;
  esac
}

log() { printf '%s\n' "$*"; }
info() { printf '%sℹ%s %s\n' "$BLUE" "$RESET" "$*"; }
ok() { printf '%s✓%s %s\n' "$GREEN" "$RESET" "$*"; }
warn() { printf '%s!%s %s\n' "$YELLOW" "$RESET" "$*"; }
err() { printf '%s✗%s %s\n' "$RED" "$RESET" "$*" >&2; }
step() {
  printf '\n%s%s%s\n' "$BOLD" "$*" "$RESET"
}

have_tty() {
  [ -c /dev/tty ]
}

ask_yes() {
  prompt="$1"
  default_yes="${2:-1}"
  if [ "$ASSUME_YES" -eq 1 ]; then
    [ "$default_yes" -eq 1 ]
    return $?
  fi
  if ! have_tty; then
    err "$(t need_tty)"
    exit 1
  fi
  if [ "$default_yes" -eq 1 ]; then
    hint="Y/n"
  else
    hint="y/N"
  fi
  printf '%s?%s %s [%s] ' "$BLUE" "$RESET" "$prompt" "$hint" >/dev/tty
  read -r reply </dev/tty || reply=""
  reply=$(printf '%s' "$reply" | tr '[:upper:]' '[:lower:]')
  if [ -z "$reply" ]; then
    [ "$default_yes" -eq 1 ]
    return $?
  fi
  case "$reply" in
    y|yes|s|si|sí) return 0 ;;
    *) return 1 ;;
  esac
}

run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    info "dry-run: $*"
    return 0
  fi
  "$@"
}

is_repo() {
  [ -f "$1/package.json" ] && [ -f "$1/src-tauri/tauri.conf.json" ]
}

script_dir() {
  if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
    cd "$(dirname "${BASH_SOURCE[0]}")" && pwd
  else
    echo ""
  fi
}

os_family() {
  case "$(uname -s)" in
    Darwin) echo macos ;;
    Linux) echo linux ;;
    MINGW*|MSYS*|CYGWIN*) echo windows ;;
    *) echo unknown ;;
  esac
}

macos_major() {
  sw_vers -productVersion 2>/dev/null | cut -d. -f1
}

node_major() {
  node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

refresh_path() {
  export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.cargo/bin:$HOME/.local/share/fnm:$PATH"
  if [ -f "$HOME/.cargo/env" ]; then
    # shellcheck disable=SC1090
    . "$HOME/.cargo/env"
  fi
  if has_cmd brew; then
    eval "$(brew shellenv 2>/dev/null)" || true
  fi
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$HOME/.nvm/nvm.sh"
  fi
}

ensure_dir_ok() {
  os=$(os_family)
  if [ "$os" = macos ]; then
    major=$(macos_major)
    if [ -n "$major" ] && [ "$major" -lt "$MIN_MACOS_MAJOR" ]; then
      err "$(t old_macos) (detected $major)"
      exit 1
    fi
    ok "$(t macos_ok)"
  elif [ "$os" = windows ]; then
    warn "$(t not_macos)"
    info "On Windows use .\\install.ps1"
  else
    warn "$(t not_macos)"
  fi
}

resolve_root() {
  here=$(script_dir)
  cwd=$(pwd)
  if [ -n "$here" ] && is_repo "$here"; then
    ROOT="$here"
  elif is_repo "$cwd"; then
    ROOT="$cwd"
  elif [ -n "$here" ] && is_repo "$(cd "$here/.." && pwd)"; then
    ROOT="$(cd "$here/.." && pwd)"
  fi

  if [ -n "$ROOT" ]; then
    ok "$(t found_repo) $ROOT"
    return 0
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    warn "No repo here; would clone $REPO_URL → $CLONE_DIR"
    ROOT="$CLONE_DIR"
    return 0
  fi

  if ! has_cmd git; then
    err "git is required to clone Murmullo."
    exit 1
  fi

  if ! ask_yes "$(t clone_q)" 1; then
    err "$(t abort)"
    exit 1
  fi
  step "$(t cloning)"
  if [ -d "$CLONE_DIR" ] && is_repo "$CLONE_DIR"; then
    ROOT="$CLONE_DIR"
    ok "$(t found_repo) $ROOT"
    return 0
  fi
  parent=$(dirname "$CLONE_DIR")
  mkdir -p "$parent"
  git clone "$REPO_URL" "$CLONE_DIR"
  ROOT="$CLONE_DIR"
  ok "$(t found_repo) $ROOT"
}

need_clt() {
  if [ "$(os_family)" != macos ]; then
    return 1
  fi
  if ! xcode-select -p >/dev/null 2>&1; then
    return 0
  fi
  if ! cc --version >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

install_clt() {
  step "Xcode Command Line Tools"
  info "$(t clt)"
  if [ "$DRY_RUN" -eq 1 ]; then
    return 0
  fi
  xcode-select --install 2>/dev/null || true
  if have_tty; then
    printf '%s' "Enter / Intro  " >/dev/tty
    read -r _ </dev/tty || true
  fi
  if need_clt; then
    err "Command Line Tools still missing."
    exit 1
  fi
  ok "Xcode Command Line Tools"
}

install_homebrew() {
  if has_cmd brew; then
    return 0
  fi
  if [ "$(os_family)" != macos ]; then
    return 0
  fi
  if ! ask_yes "$(t brew_q)" 1; then
    return 1
  fi
  if [ "$DRY_RUN" -eq 1 ]; then
    info "dry-run: install Homebrew"
    return 0
  fi
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  refresh_path
}

install_node() {
  if has_cmd node; then
    major=$(node_major)
    if [ -n "$major" ] && [ "$major" -ge "$MIN_NODE_MAJOR" ]; then
      ok "Node.js $(node -v)"
      return 0
    fi
    warn "Node.js $(node -v) is below $MIN_NODE_MAJOR"
  fi
  if [ "$(os_family)" = macos ]; then
    install_homebrew || true
    refresh_path
    if has_cmd brew; then
      if ask_yes "$(t node_q)" 1; then
        run brew install node
        refresh_path
      fi
    fi
  elif [ "$(os_family)" = linux ] && has_cmd apt-get; then
    if ask_yes "Install Node.js with apt (nodejs + npm)?" 1; then
      run sudo apt-get update
      run sudo apt-get install -y nodejs npm
      refresh_path
    fi
  fi
  if ! has_cmd node; then
    err "$(t node_manual)"
    exit 1
  fi
  major=$(node_major)
  if [ -z "$major" ] || [ "$major" -lt "$MIN_NODE_MAJOR" ]; then
    err "$(t node_manual) (found $(node -v 2>/dev/null || echo none))"
    exit 1
  fi
  ok "Node.js $(node -v)"
}

install_rust() {
  refresh_path
  if has_cmd rustc && has_cmd cargo; then
    ok "Rust $(rustc --version | awk '{print $2}')"
    return 0
  fi
  if ! ask_yes "$(t rust_q)" 1; then
    err "Rust is required: https://rustup.rs"
    exit 1
  fi
  if [ "$DRY_RUN" -eq 1 ]; then
    info "dry-run: rustup (stable)"
    return 0
  fi
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  refresh_path
  if ! has_cmd rustc; then
    err "rustup finished but rustc is not on PATH. Open a new terminal and retry."
    exit 1
  fi
  run rustup default stable
  ok "Rust $(rustc --version | awk '{print $2}')"
}

install_pnpm() {
  refresh_path
  if has_cmd pnpm; then
    ok "pnpm $(pnpm --version)"
    return 0
  fi
  if ! ask_yes "$(t pnpm_q)" 1; then
    err "pnpm is required: npm install -g pnpm"
    exit 1
  fi
  if has_cmd corepack; then
    run corepack enable
    run corepack prepare pnpm@latest --activate || true
  fi
  refresh_path
  if ! has_cmd pnpm && has_cmd npm; then
    run npm install -g pnpm
  fi
  refresh_path
  if ! has_cmd pnpm && has_cmd brew; then
    run brew install pnpm
    refresh_path
  fi
  if ! has_cmd pnpm; then
    err "Could not install pnpm. Try: npm install -g pnpm"
    exit 1
  fi
  ok "pnpm $(pnpm --version)"
}

install_linux_tauri_deps() {
  if [ "$(os_family)" != linux ]; then
    return 0
  fi
  if ! ask_yes "$(t linux_deps_q)" 1; then
    warn "Skipping system packages. Tauri build may fail without webkit/gtk."
    return 0
  fi
  if has_cmd apt-get; then
    run sudo apt-get update
    run sudo apt-get install -y \
      libwebkit2gtk-4.1-dev \
      build-essential \
      curl \
      wget \
      file \
      libxdo-dev \
      libssl-dev \
      libayatana-appindicator3-dev \
      librsvg2-dev \
      libgtk-3-dev \
      git
  elif has_cmd dnf; then
    run sudo dnf install -y webkit2gtk4.1-devel openssl-devel curl wget file \
      libappindicator-gtk3-devel librsvg2-devel gtk3-devel gcc
  elif has_cmd pacman; then
    run sudo pacman -Sy --needed --noconfirm webkit2gtk-4.1 base-devel curl wget file \
      openssl appmenu-gtk-module libappindicator-gtk3 librsvg gtk3
  else
    warn "Unknown distro. See https://v2.tauri.app/start/prerequisites/"
  fi
}

print_tool_status() {
  step "$(t check_tools)"
  for cmd in git node pnpm rustc cargo; do
    if has_cmd "$cmd"; then
      case "$cmd" in
        node) extra=$(node -v) ;;
        pnpm) extra=$(pnpm --version) ;;
        rustc) extra=$(rustc --version 2>/dev/null | awk '{print $2}') ;;
        cargo) extra=$(cargo --version 2>/dev/null | awk '{print $2}') ;;
        git) extra=$(git --version | awk '{print $3}') ;;
        *) extra="" ;;
      esac
      ok "$cmd ${extra} ($(t found))"
    else
      warn "$cmd ($(t missing))"
    fi
  done
  if [ "$(os_family)" = macos ]; then
    if need_clt; then
      warn "Xcode Command Line Tools ($(t missing))"
    else
      ok "Xcode Command Line Tools"
    fi
  fi
}

parse_args() {
  detect_lang
  while [ $# -gt 0 ]; do
    case "$1" in
      --yes|-y) ASSUME_YES=1 ;;
      --dev) DO_DEV=1 ;;
      --build) DO_BUILD=1 ;;
      --dry-run) DRY_RUN=1 ;;
      --lang)
        shift
        case "${1:-}" in
          es|en) MURMULLO_LANG="$1" ;;
          *) err "lang must be es or en"; exit 1 ;;
        esac
        ;;
      --dir)
        shift
        CLONE_DIR="${1:-}"
        if [ -z "$CLONE_DIR" ]; then
          err "--dir needs a path"
          exit 1
        fi
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        err "Unknown option: $1"
        usage
        exit 1
        ;;
    esac
    shift
  done
}

main() {
  parse_args "$@"
  printf '\n%s%s%s\n' "$BOLD" "$(t banner)" "$RESET"
  printf '%s%s%s\n\n' "$DIM" "$(t tagline)" "$RESET"
  info "$(t start)"
  ensure_dir_ok
  resolve_root
  cd "$ROOT"
  refresh_path
  print_tool_status

  if [ "$DRY_RUN" -eq 1 ]; then
    warn "$(t dry)"
    exit 0
  fi

  missing=0
  has_cmd git || missing=1
  has_cmd pnpm || missing=1
  has_cmd rustc || missing=1
  has_cmd cargo || missing=1
  if ! has_cmd node; then
    missing=1
  else
    _major=$(node_major)
    if [ -z "$_major" ] || [ "$_major" -lt "$MIN_NODE_MAJOR" ]; then
      missing=1
    fi
  fi
  if [ "$(os_family)" = macos ] && need_clt; then
    missing=1
  fi

  if [ "$missing" -eq 1 ]; then
    if ! ask_yes "$(t install_q)" 1; then
      warn "$(t skip_tools)"
      exit 1
    fi
    if [ "$(os_family)" = macos ] && need_clt; then
      install_clt
    fi
    if ! has_cmd git; then
      if has_cmd brew; then
        run brew install git
      elif has_cmd apt-get; then
        run sudo apt-get install -y git
      else
        err "Install git and retry."
        exit 1
      fi
    fi
    install_linux_tauri_deps
    install_node
    install_rust
    install_pnpm
  else
    install_linux_tauri_deps
  fi

  step "$(t deps)"
  run pnpm install
  ok "pnpm install"

  if [ "$DO_BUILD" -eq 1 ] || { [ "$DO_DEV" -eq 0 ] && ask_yes "$(t build_q)" 0; }; then
    step "$(t building)"
    run pnpm tauri build
    ok "pnpm tauri build"
    bundle="$ROOT/src-tauri/target/release/bundle"
    if [ -d "$bundle" ]; then
      info "Artifacts: $bundle"
    fi
  fi

  step "$(t next)"
  log "  1. $(t next_1)"
  log "  2. $(t next_2)"
  log "  3. $(t next_3)"
  log ""
  info "Docs: $ROOT/docs/INSTALL.md"

  if [ "$DO_DEV" -eq 1 ]; then
    step "pnpm tauri dev"
    exec pnpm tauri dev
  fi
  if [ "$ASSUME_YES" -eq 0 ] && ask_yes "$(t dev_q)" 1; then
    step "pnpm tauri dev"
    exec pnpm tauri dev
  fi

  printf '\n%s%s%s\n' "$GREEN" "$(t done)" "$RESET"
  info "cd $ROOT && pnpm tauri dev"
}

main "$@"
