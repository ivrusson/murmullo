#!/bin/bash
# Double-click on macOS: opens Terminal and runs the updater.
cd "$(dirname "$0")" || exit 1
chmod +x ./update.sh 2>/dev/null || true
exec ./update.sh
