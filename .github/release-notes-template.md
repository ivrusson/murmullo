<!-- Release notes template. Replace the first section; keep "Install on macOS" as is. -->

## What's new

- …

See [CHANGELOG.md](https://github.com/ivrusson/murmullo/blob/main/CHANGELOG.md) for details.

## Install on macOS

Pick the image for your Mac: `_aarch64.dmg` for Apple Silicon, `_x64.dmg` for Intel. Already
installed? The app downloads this update by itself; use **Install and restart** when it is ready.

**Installer (recommended):**

```bash
curl -fsSLO https://raw.githubusercontent.com/ivrusson/murmullo/main/install.sh
bash install.sh
```

**By hand:** open the `.dmg`, drag Murmullo to Applications and open it once. macOS says it cannot
verify the developer. Go to **System Settings → Privacy & Security** and click **Open Anyway**
(on macOS 15+, right-click → Open no longer works). Or, from Terminal:

```bash
xattr -dr com.apple.quarantine /Applications/Murmullo.app
```

Murmullo is signed with its own stable certificate, not an Apple Developer ID, so it is not
notarized. The identity is the same in every release, so macOS keeps your Microphone,
Accessibility and Input Monitoring permissions across updates. Homebrew: coming soon.
