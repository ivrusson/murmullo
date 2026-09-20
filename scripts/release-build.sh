#!/usr/bin/env sh
set -e

if [ "$RELEASE_DRY_RUN" = "1" ]; then
  echo "Skipping frontend/Tauri build (dry-run)"
  exit 0
fi

echo "Building frontend…"
pnpm run build
echo "Building Tauri app…"
pnpm tauri build
