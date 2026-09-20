#!/bin/bash
# Double-click on macOS: opens Terminal and runs the guided installer.
cd "$(dirname "$0")" || exit 1
chmod +x ./install.sh 2>/dev/null || true
exec ./install.sh
