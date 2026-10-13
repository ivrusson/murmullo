#!/usr/bin/env bash
# End-to-end check of install.sh / update.sh against a throwaway local origin.
# No network, no real pnpm/cargo: the toolchain is stubbed (MURMULLO_KEEP_PATH=1).
#
#   bash scripts/test-installer.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'jobs -p | xargs kill 2>/dev/null || true; rm -rf "$TMP"' EXIT

FAILED=0
pass() { printf '  ok   %s\n' "$1"; }
fail() { printf '  FAIL %s\n' "$1"; FAILED=1; }
check() { # check "label" command...
  _label="$1"
  shift
  if "$@" >/dev/null 2>&1; then pass "$_label"; else fail "$_label"; fi
}

export HOME="$TMP/home"
mkdir -p "$HOME" "$TMP/bin"
export GIT_CONFIG_GLOBAL="$TMP/gitconfig"
git config --global user.name tester
git config --global user.email tester@example.com
git config --global init.defaultBranch main
git config --global protocol.file.allow always

# Stub toolchain: every call is appended to $TMP/calls.log. `pnpm fetch` also
# records whether the repo was still on the old version and the app still alive.
for tool in rustc cargo; do
  printf '#!/bin/sh\necho "%s $*" >> "%s/calls.log"\n[ "$1" = "--version" ] && echo "9.9.9"\nexit 0\n' \
    "$tool" "$TMP" >"$TMP/bin/$tool"
done
cat >"$TMP/bin/pnpm" <<STUB
#!/bin/sh
echo "pnpm \$*" >> "$TMP/calls.log"
[ "\$1" = "--version" ] && echo "9.9.9"
if [ "\$1" = "fetch" ]; then
  echo "fetch-sees-head=\$(git -C "$TMP/app" describe --tags --exact-match HEAD 2>/dev/null)" >> "$TMP/calls.log"
  pgrep -f "$TMP/app/src-tauri/target/debug/murmullo" >/dev/null && echo "fetch-sees-app=alive" >> "$TMP/calls.log"
fi
exit 0
STUB
printf '#!/bin/sh\necho "osascript $*" >> "%s/calls.log"\n' "$TMP" >"$TMP/bin/osascript"
printf '#!/bin/sh\n[ "$1" = "-v" ] && { echo v20.0.0; exit 0; }\nexit 0\n' >"$TMP/bin/node"
chmod +x "$TMP"/bin/*
export PATH="$TMP/bin:$PATH" MURMULLO_KEEP_PATH=1 LC_ALL=en_US.UTF-8
: >"$TMP/calls.log"

# Origin with releases 0.1.0 and 0.2.0, a beta tag, and unreleased work on main.
ORIGIN="$TMP/origin.git"
SEED="$TMP/seed"
git init -q --bare "$ORIGIN"
git init -q "$SEED"
release() { # release X.Y.Z [tag]
  mkdir -p "$SEED/src-tauri"
  printf '{\n  "name": "murmullo",\n  "version": "%s"\n}\n' "$1" >"$SEED/package.json"
  echo '{}' >"$SEED/src-tauri/tauri.conf.json"
  mkdir -p "$SEED/scripts"
  cp "$HERE/install.sh" "$HERE/update.sh" "$SEED/"
  cp "$HERE/scripts/update-progress.mjs" "$SEED/scripts/"
  echo "lockfileVersion: '9.0' # $1" >"$SEED/pnpm-lock.yaml"
  git -C "$SEED" add -A
  git -C "$SEED" commit -q -m "release $1"
  git -C "$SEED" tag -a "${2:-v$1}" -m "${2:-v$1}"
}
release 0.1.0
release 0.2.0
release 0.3.0 v0.3.0-beta.1
echo unreleased >"$SEED/notes.txt"
git -C "$SEED" add -A
git -C "$SEED" commit -q -m "unreleased work on main"
git -C "$SEED" remote add origin "$ORIGIN"
git -C "$SEED" push -q origin main --tags

export MURMULLO_REPO_URL="file://$ORIGIN"
run_install() { (cd "$1" && shift && bash ./install.sh "$@" 2>&1); }
head_tag() { git -C "$1" describe --tags --exact-match HEAD 2>/dev/null || echo none; }

echo "fresh clone through the installer"
mkdir "$TMP/standalone"
cp "$HERE/install.sh" "$TMP/standalone/"
OUT=$(run_install "$TMP/standalone" --yes --no-launch --dir "$TMP/fresh")
check "clones the repo" test -d "$TMP/fresh/.git"
check "pins the latest stable release, not main or the beta" test "$(head_tag "$TMP/fresh")" = v0.2.0
check "ignores prerelease tags" test "$(head_tag "$TMP/fresh")" != v0.3.0-beta.1
check "runs pnpm install" grep -q '^pnpm install' "$TMP/calls.log"
check "does not launch the app with --no-launch" bash -c "! grep -q 'tauri dev' '$TMP/calls.log'"
check "reports installed and latest versions" bash -c "echo '$OUT' | grep -q 'Latest release: v0.2.0'"

echo "manual clone stays on main -> gets pinned"
git clone -q "$ORIGIN" "$TMP/manual"
check "starts on main, after the release" test "$(head_tag "$TMP/manual")" = none
run_install "$TMP/manual" --yes --no-launch >/dev/null
check "ends on v0.2.0" test "$(head_tag "$TMP/manual")" = v0.2.0

echo "leaves development checkouts alone"
git clone -q "$ORIGIN" "$TMP/dev"
git -C "$TMP/dev" switch -q -c feat/mine
run_install "$TMP/dev" --yes --no-launch >/dev/null
check "feature branch untouched" test "$(git -C "$TMP/dev" branch --show-current)" = feat/mine
git -C "$TMP/dev" switch -q main
echo dirty >>"$TMP/dev/package.json"
run_install "$TMP/dev" --yes --no-launch >/dev/null
check "dirty tree untouched" test "$(git -C "$TMP/dev" branch --show-current)" = main
git -C "$TMP/dev" checkout -q -- package.json
run_install "$TMP/dev" --yes --no-launch --no-pin >/dev/null
check "--no-pin keeps main" test "$(git -C "$TMP/dev" branch --show-current)" = main
run_install "$TMP/dev" --yes --no-launch --ref v0.1.0 >/dev/null
check "--ref v0.1.0 checks out that tag" test "$(head_tag "$TMP/dev")" = v0.1.0

echo "dry run changes nothing"
git -C "$TMP/dev" checkout -q main
OUT=$(run_install "$TMP/dev" --dry-run)
check "dry run stays on main" test "$(git -C "$TMP/dev" branch --show-current)" = main

echo "update flow"
git clone -q "$ORIGIN" "$TMP/app"
git -C "$TMP/app" checkout -q v0.1.0
set +e
run_install "$TMP/app" --check >/dev/null
CODE=$?
set -e
check "--check exits 10 when behind" test "$CODE" -eq 10
check "--check does not move HEAD" test "$(head_tag "$TMP/app")" = v0.1.0

# A fake running app that must be stopped and a dirty tree that must block.
mkdir -p "$TMP/app/src-tauri/target/debug"
FAKE_APP="$TMP/app/src-tauri/target/debug/murmullo"
touch "$FAKE_APP"
# argv[0] is the binary path, like a real run, so it shows up in `pgrep -f`.
bash -c 'exec -a "$0" sleep 300' "$FAKE_APP" &
APP_PID=$!
sleep 0.3
echo dirty >>"$TMP/app/package.json"
set +e
run_install "$TMP/app" --update --yes >/dev/null
CODE=$?
set -e
check "update refuses a dirty tree" test "$CODE" -ne 0
check "update did not move HEAD" test "$(head_tag "$TMP/app")" = v0.1.0
check "app survives a refused update" kill -0 "$APP_PID"
git -C "$TMP/app" checkout -q -- package.json

: >"$TMP/calls.log"
(cd "$TMP/app" && bash ./update.sh --yes >/dev/null 2>&1)
check "update checks out v0.2.0" test "$(head_tag "$TMP/app")" = v0.2.0
# The fake app is our child: reap it, or a killed process lingers as a zombie.
wait "$APP_PID" 2>/dev/null || true
check "update stops the running app" bash -c "! kill -0 $APP_PID 2>/dev/null"
check "update reinstalls dependencies" grep -q '^pnpm install' "$TMP/calls.log"
check "update relaunches the app" grep -q '^pnpm tauri dev' "$TMP/calls.log"
check "a terminal update sends no desktop notification" bash -c "! grep -q osascript '$TMP/calls.log'"
set +e
run_install "$TMP/app" --check >/dev/null
CODE=$?
set -e
check "--check exits 0 when current" test "$CODE" -eq 0
check "dependencies were downloaded before the switch" grep -q 'fetch-sees-head=v0.1.0' "$TMP/calls.log"
check "the app was still running while downloading" grep -q 'fetch-sees-app=alive' "$TMP/calls.log"

echo "update progress for the app (--status-file)"
STATUS="$TMP/status/status.json"
phase() { sed -n 's/.*"phase":"\([a-z]*\)".*/\1/p' "$STATUS"; }
git -C "$TMP/app" checkout -q v0.1.0
echo dirty >>"$TMP/app/package.json"
set +e
run_install "$TMP/app" --update --yes --status-file "$STATUS" >/dev/null
set -e
check "a refused update reports an error" test "$(phase)" = error
check "the error explains why" grep -q 'local changes' "$STATUS"
git -C "$TMP/app" checkout -q -- package.json
rm -f "$STATUS"

bash -c 'exec -a "$0" sleep 300' "$FAKE_APP" &
APP_PID=$!
sleep 0.3
(cd "$TMP/app" && bash ./update.sh --yes --status-file "$STATUS" >/dev/null 2>&1)
wait "$APP_PID" 2>/dev/null || true
check "status ends on restarting" test "$(phase)" = restarting
if [ "$(uname -s)" = Darwin ]; then
  check "the app-started update warns that it is compiling" grep -q 'osascript.*Compiling' "$TMP/calls.log"
fi
check "status names the target release" grep -q '"target":"v0.2.0"' "$STATUS"
check "status carries the updater pid" grep -Eq '"pid":[0-9]+' "$STATUS"
check "app updated through the status flow" test "$(head_tag "$TMP/app")" = v0.2.0

if [ "$FAILED" -ne 0 ]; then
  echo "FAILED"
  exit 1
fi
echo "all good"
