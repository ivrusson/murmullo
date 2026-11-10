# Signing keys

Releases are signed twice: the `.app` with a self-signed code-signing identity, and the updater
bundles (`.app.tar.gz` + `.sig`) with a minisign key. Both are used by
`.github/workflows/release.yml`. This page lists what exists and how to put it back. It never holds
the values.

## GitHub secrets

| Secret                               | What it is                                                     |
| ------------------------------------ | -------------------------------------------------------------- |
| `MACOS_CERT_P12`                     | Base64 of the `.p12` with "Murmullo Self-Signed Code Signing" |
| `MACOS_CERT_PASSWORD`                | Password of that `.p12`                                        |
| `TAURI_SIGNING_PRIVATE_KEY`          | Minisign private key for the updater                           |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password of the minisign key                                   |

The minisign **public** key is not secret. It lives in `src-tauri/tauri.conf.json`
(`plugins.updater.pubkey`).

## Where the originals live

- On the maintainer's Mac, under `~/.config/murmullo/` (the `.p12`, the minisign key pair and their
  passwords).
- A copy of each in 1Password.

Keep both. GitHub secrets cannot be read back.

## Regenerating the secrets

From a shell signed in to 1Password (`op signin`) and to GitHub (`gh auth login`). Replace the
`op://…` references with the ones of your 1Password items. The values go straight from `op` to
`gh` and never touch the terminal or a file:

```bash
REPO=ivrusson/murmullo

op read "op://<vault>/<item>/<p12-file>" | base64 | gh secret set MACOS_CERT_P12 -R "$REPO"
op read "op://<vault>/<item>/<p12-password>" | gh secret set MACOS_CERT_PASSWORD -R "$REPO"
op read "op://<vault>/<item>/<minisign-private-key>" | gh secret set TAURI_SIGNING_PRIVATE_KEY -R "$REPO"
op read "op://<vault>/<item>/<minisign-password>" | gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD -R "$REPO"
```

Without 1Password, the same works from `~/.config/murmullo/`, e.g.
`base64 -i ~/.config/murmullo/<cert>.p12 | gh secret set MACOS_CERT_P12 -R "$REPO"`.

`gh secret list -R ivrusson/murmullo` shows the names and when they changed, never the values.

## Do not lose the minisign key

Every installed copy only accepts updates signed with the key whose public half shipped inside it.
**If the minisign private key (or its password) is lost, installed apps can no longer update.**
Users would have to download a new `.dmg` by hand. Do not rotate it without a reason.

The code-signing certificate matters too: macOS ties Microphone, Accessibility and Input
Monitoring permissions to that identity. A new certificate makes every user grant them again. It was
created with a long validity; do not replace it unless it is compromised.
