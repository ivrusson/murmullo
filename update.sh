#!/usr/bin/env bash
# Murmullo updater (macOS / Linux): looks up the latest release, asks, checks it
# out, reinstalls dependencies and relaunches the app. Same flags as install.sh;
# `./update.sh --check` only reports (exit 0 = up to date, 10 = update available).
exec bash "$(cd "$(dirname "$0")" && pwd)/install.sh" --update "$@"
