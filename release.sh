#!/bin/bash

# Murmullo Release Script
# This script automates the release process with semantic versioning

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if we're on main branch
check_branch() {
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "main" ]; then
        print_error "You must be on the main branch to release. Current branch: $current_branch"
        exit 1
    fi
}

# Function to check if working directory is clean
check_working_dir() {
    if [ -n "$(git status --porcelain)" ]; then
        print_error "Working directory is not clean. Please commit or stash your changes."
        exit 1
    fi
}

# Function to check if we're up to date with remote
check_upstream() {
    git fetch origin
    local=$(git rev-parse HEAD)
    remote=$(git rev-parse origin/main)
    
    if [ "$local" != "$remote" ]; then
        print_error "Local branch is not up to date with origin/main. Please pull latest changes."
        exit 1
    fi
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    
    # Frontend tests
    print_status "Running frontend type check..."
    pnpm run type-check
    
    # Backend tests
    print_status "Running Rust tests..."
    cd src-tauri && cargo test && cd ..
    
    print_success "All tests passed!"
}

# Function to build the application
build_app() {
    print_status "Building application..."
    
    # Build frontend
    print_status "Building frontend..."
    pnpm run build
    
    # Build Tauri app
    print_status "Building Tauri application..."
    pnpm tauri build
    
    print_success "Application built successfully!"
}

# Function to create release
create_release() {
    local release_type=$1
    
    print_status "Creating $release_type release..."
    
    case $release_type in
        "patch")
            pnpm run release:patch
            ;;
        "minor")
            pnpm run release:minor
            ;;
        "major")
            pnpm run release:major
            ;;
        *)
            print_error "Invalid release type. Use: patch, minor, or major"
            exit 1
            ;;
    esac
    
    print_success "Release created successfully!"
}

# Function to show help
show_help() {
    echo "Murmullo Release Script"
    echo ""
    echo "Usage: $0 [OPTIONS] RELEASE_TYPE"
    echo ""
    echo "RELEASE_TYPE:"
    echo "  patch    - Bug fixes (0.1.0 -> 0.1.1)"
    echo "  minor    - New features (0.1.0 -> 0.2.0)"
    echo "  major    - Breaking changes (0.1.0 -> 1.0.0)"
    echo ""
    echo "OPTIONS:"
    echo "  --dry-run    - Show what would be done without executing"
    echo "  --skip-tests - Skip running tests"
    echo "  --skip-build - Skip building the application"
    echo "  --help       - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 patch           # Create a patch release"
    echo "  $0 minor --dry-run # Show what a minor release would do"
    echo "  $0 major --skip-tests # Create a major release without tests"
}

# Main function
main() {
    local release_type=""
    local dry_run=false
    local skip_tests=false
    local skip_build=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                dry_run=true
                shift
                ;;
            --skip-tests)
                skip_tests=true
                shift
                ;;
            --skip-build)
                skip_build=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            patch|minor|major)
                release_type=$1
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Check if release type is provided
    if [ -z "$release_type" ]; then
        print_error "Release type is required"
        show_help
        exit 1
    fi
    
    print_status "Starting release process for $release_type release..."
    
    # Pre-release checks
    check_branch
    check_working_dir
    check_upstream
    
    # Run tests if not skipped
    if [ "$skip_tests" = false ]; then
        run_tests
    else
        print_warning "Skipping tests"
    fi
    
    # Build application if not skipped
    if [ "$skip_build" = false ]; then
        build_app
    else
        print_warning "Skipping build"
    fi
    
    # Create release
    if [ "$dry_run" = true ]; then
        print_status "Dry run mode - showing what would be done:"
        pnpm run release:dry
    else
        create_release $release_type
        print_success "Release $release_type completed! 🎉"
        print_status "The GitHub Actions pipeline will now build and publish the release artifacts."
    fi
}

# Run main function with all arguments
main "$@"
