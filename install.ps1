# Murmullo guided installer (Windows).
# Paste into the focused app is not implemented yet — this prepares a compile/dev environment.
#
#   git clone https://github.com/ivrusson/murmullo.git
#   cd murmullo
#   powershell -ExecutionPolicy Bypass -File .\install.ps1
#
# Flags: -Yes  -Dev  -Build  -DryRun  -Lang es|en

[CmdletBinding()]
param(
    [switch] $Yes,
    [switch] $Dev,
    [switch] $Build,
    [switch] $DryRun,
    [ValidateSet('en', 'es')]
    [string] $Lang = '',
    [string] $Dir = "$env:USERPROFILE\murmullo",
    [switch] $Help
)

$ErrorActionPreference = 'Stop'
$RepoUrl = if ($env:MURMULLO_REPO_URL) { $env:MURMULLO_REPO_URL } else { 'https://github.com/ivrusson/murmullo.git' }
$MinNodeMajor = 18

function Get-Lang {
    if ($Lang) { return $Lang }
    $ui = [System.Globalization.CultureInfo]::CurrentUICulture.TwoLetterISOLanguageName
    if ($ui -eq 'es') { return 'es' }
    return 'en'
}

$script:L = Get-Lang

function T([string] $key) {
    $map = @{
        'banner.en'      = 'Murmullo setup'
        'banner.es'      = 'Instalación de Murmullo'
        'tagline.en'     = 'Offline voice dictation. Windows paste is not implemented yet.'
        'tagline.es'     = 'Dictado de voz local. El pegado en Windows aún no está implementado.'
        'start.en'       = 'This assistant prepares the toolchain so you can run Murmullo from this repository.'
        'start.es'       = 'Este asistente prepara las herramientas para ejecutar Murmullo desde el repositorio.'
        'warn_paste.en'  = 'macOS is the supported dictation platform today. You can still compile and develop here.'
        'warn_paste.es'  = 'macOS es la plataforma de dictado soportada hoy. Aquí puedes compilar y desarrollar.'
        'found.en'       = 'Using repository at'
        'found.es'       = 'Usando el repositorio en'
        'clone_q.en'     = "Murmullo is not in this folder. Clone it to $Dir?"
        'clone_q.es'     = "Murmullo no está en esta carpeta. ¿Clonar a $Dir?"
        'install_q.en'   = 'Install missing tools now? (winget)'
        'install_q.es'   = '¿Instalar ahora lo que falta? (winget)'
        'build_q.en'     = 'Compile a release build now? First compile takes several minutes.'
        'build_q.es'     = '¿Compilar una build de release ahora? La primera vez tarda varios minutos.'
        'dev_q.en'       = 'Start Murmullo in development mode now (pnpm tauri dev)?'
        'dev_q.es'       = '¿Arrancar Murmullo en modo desarrollo ahora (pnpm tauri dev)?'
        'done.en'        = 'Toolchain is ready.'
        'done.es'        = 'Herramientas listas.'
        'dry.en'         = 'Dry run — nothing was installed.'
        'dry.es'         = 'Simulación — no se ha instalado nada.'
        'next.en'        = 'On Windows, use the app for UI development. Hold-to-talk paste lands on macOS first.'
        'next.es'        = 'En Windows, usa la app para desarrollar la UI. El pegado al dictar llega primero a macOS.'
        'msvc.en'        = 'If the Rust build fails, install "Desktop development with C++" from Visual Studio Build Tools.'
        'msvc.es'        = 'Si falla la compilación Rust, instala "Desarrollo para el escritorio con C++" de Visual Studio Build Tools.'
    }
    $k = "$key.$($script:L)"
    if ($map.ContainsKey($k)) { return $map[$k] }
    return $key
}

function Info([string] $msg) { Write-Host "i  $msg" -ForegroundColor Cyan }
function Ok([string] $msg) { Write-Host "ok $msg" -ForegroundColor Green }
function Warn([string] $msg) { Write-Host "!  $msg" -ForegroundColor Yellow }
function Fail([string] $msg) { Write-Host "x  $msg" -ForegroundColor Red }

function Show-Help {
    @"
Murmullo guided installer (Windows)

Usage:
  .\install.ps1 [-Yes] [-Dev] [-Build] [-DryRun] [-Lang es|en] [-Dir PATH]

macOS is the supported dictation platform. This script only prepares compile/dev tools.
"@ | Write-Host
}

function Test-Yes([string] $prompt, [bool] $defaultYes = $true) {
    if ($Yes) { return $defaultYes }
    $hint = if ($defaultYes) { 'Y/n' } else { 'y/N' }
    $reply = Read-Host "$prompt [$hint]"
    if ([string]::IsNullOrWhiteSpace($reply)) { return $defaultYes }
    return $reply -match '^(y|yes|s|si|sí)$'
}

function Test-Command([string] $name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
        [System.Environment]::GetEnvironmentVariable('Path', 'User')
}

function Test-Repo([string] $path) {
    return (Test-Path (Join-Path $path 'package.json')) -and (Test-Path (Join-Path $path 'src-tauri\tauri.conf.json'))
}

function Get-NodeMajor {
    if (-not (Test-Command node)) { return 0 }
    $v = node -v
    if ($v -match 'v?(\d+)') { return [int]$Matches[1] }
    return 0
}

if ($Help) {
    Show-Help
    exit 0
}

Write-Host ""
Write-Host (T 'banner') -ForegroundColor White
Write-Host (T 'tagline') -ForegroundColor DarkGray
Write-Host ""
Info (T 'start')
Warn (T 'warn_paste')

$root = $null
if (Test-Repo $PSScriptRoot) { $root = $PSScriptRoot }
elseif (Test-Repo (Get-Location).Path) { $root = (Get-Location).Path }

if (-not $root) {
    if ($DryRun) {
        Warn "No repo here; would clone $RepoUrl → $Dir"
        $root = $Dir
    }
    else {
        if (-not (Test-Command git)) {
            Fail 'git is required. Install Git for Windows and retry.'
            exit 1
        }
        if (-not (Test-Yes (T 'clone_q') $true)) {
            Fail 'Stopped.'
            exit 1
        }
        if ((Test-Path $Dir) -and (Test-Repo $Dir)) {
            $root = $Dir
        }
        else {
            git clone $RepoUrl $Dir
            $root = $Dir
        }
    }
}

Ok "$(T 'found') $root"
Set-Location $root

function Show-Tools {
    Write-Host ""
    Write-Host 'Checking tools' -ForegroundColor White
    foreach ($cmd in @('git', 'node', 'pnpm', 'rustc', 'cargo')) {
        if (Test-Command $cmd) { Ok $cmd } else { Warn "$cmd missing" }
    }
}

Show-Tools

if ($DryRun) {
    Warn (T 'dry')
    exit 0
}

$need = -not ((Test-Command git) -and (Test-Command node) -and (Test-Command pnpm) -and (Test-Command rustc) -and (Test-Command cargo))
$nodeOld = (Get-NodeMajor) -gt 0 -and (Get-NodeMajor) -lt $MinNodeMajor
if ($nodeOld) { $need = $true }

if ($need) {
    if (-not (Test-Yes (T 'install_q') $true)) {
        Fail 'Install the missing tools and run this script again.'
        exit 1
    }
    if (-not (Test-Command winget)) {
        Fail 'winget is not available. Install Node.js, Rust and pnpm manually, then retry.'
        exit 1
    }
    if (-not (Test-Command git)) {
        if ($DryRun) { Info 'dry-run: winget install Git.Git' } else {
            winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
        }
        Refresh-Path
    }
    if (-not (Test-Command node) -or $nodeOld) {
        if ($DryRun) { Info 'dry-run: winget install OpenJS.NodeJS.LTS' } else {
            winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
        }
        Refresh-Path
    }
    if (-not (Test-Command rustc)) {
        if ($DryRun) { Info 'dry-run: winget install Rustlang.Rustup' } else {
            winget install --id Rustlang.Rustup -e --accept-source-agreements --accept-package-agreements
        }
        Refresh-Path
        if (Test-Command rustup) { rustup default stable }
    }
    if (-not (Test-Command pnpm)) {
        Refresh-Path
        if (Test-Command corepack) {
            corepack enable
            try { corepack prepare pnpm@latest --activate } catch { }
        }
        Refresh-Path
        if (-not (Test-Command pnpm) -and (Test-Command npm)) {
            npm install -g pnpm
        }
        Refresh-Path
    }
}

if ((Get-NodeMajor) -lt $MinNodeMajor) {
    Fail "Node.js $MinNodeMajor+ is required. Found: $(node -v 2>$null)"
    exit 1
}

Warn (T 'msvc')

Write-Host ""
Info 'Installing JavaScript dependencies (pnpm install)…'
if (-not $DryRun) { pnpm install }
Ok 'pnpm install'

$doBuild = $Build -or ((-not $Dev) -and (Test-Yes (T 'build_q') $false))
if ($doBuild -and -not $DryRun) {
    Info 'Compiling Murmullo…'
    pnpm tauri build
    Ok 'pnpm tauri build'
}

Write-Host ""
Info (T 'next')
Info "Docs: $root\docs\INSTALL.md"

if ($Dev -and -not $DryRun) {
    pnpm tauri dev
    exit $LASTEXITCODE
}
if ((-not $Yes) -and (Test-Yes (T 'dev_q') $true) -and -not $DryRun) {
    pnpm tauri dev
    exit $LASTEXITCODE
}

Write-Host ""
Ok (T 'done')
Info "cd $root; pnpm tauri dev"
