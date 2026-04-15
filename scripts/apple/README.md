# Apple Signing Helpers

These scripts automate the local parts of the SantiClaw macOS signing flow without changing the existing Electron signing or notarization logic.

## Flow

1. Generate a CSR and private key on this Mac.
2. Upload the CSR in Apple Developer and download the `Developer ID Application` certificate (`.cer`).
3. Import the certificate, create a `.p12`, and verify the signing identity.
4. Optionally prepare GitHub Actions secrets and push them with `gh`.
5. Run a signed local Electron build and verify `codesign` / `spctl`.

## Scripts

### `generate-csr.sh`

Creates a local Apple-signing workspace under `~/.nuwaclaw-apple-signing` by default and generates:

- `santiclaw-developer-id.key`
- `santiclaw-developer-id.csr`

Example:

```bash
APPLE_CSR_EMAIL="you@example.com" \
APPLE_CSR_COMMON_NAME="SantiClaw Developer ID" \
./scripts/apple/generate-csr.sh
```

### `import-developer-id.sh`

Takes the downloaded Apple `.cer`, pairs it with the generated private key, exports a `.p12`, imports it into the login keychain, and prints the detected `Developer ID Application` identity.

Example:

```bash
APPLE_P12_PASSWORD="choose-a-strong-password" \
./scripts/apple/import-developer-id.sh ~/Downloads/developer_id_application.cer
```

If the key was generated with a passphrase, also set `APPLE_KEY_PASSWORD`.

### `prepare-secrets.sh`

Creates local secret material files under `~/.nuwaclaw-apple-signing/generated-secrets` and can optionally push them to GitHub Actions with `gh secret set`.

Required for cert secrets:

- `APPLE_SIGNING_IDENTITY`
- `APPLE_P12_PASSWORD`

Optional for notarization secrets:

- `APPLE_P8_PATH`
- `APPLE_API_KEY_ID`
- `APPLE_ISSUER_ID`

Example:

```bash
APPLE_SIGNING_IDENTITY="Developer ID Application: Example Name (TEAMID)" \
APPLE_P12_PASSWORD="choose-a-strong-password" \
APPLE_P8_PATH=~/Downloads/AuthKey_ABC123XYZ.p8 \
APPLE_API_KEY_ID="ABC123XYZ" \
APPLE_ISSUER_ID="00000000-0000-0000-0000-000000000000" \
APPLE_SET_GH_SECRETS=1 \
./scripts/apple/prepare-secrets.sh
```

### `verify-electron-release.sh`

Runs the existing Electron macOS build and verification flow. If notarization env vars are present, the current repo hooks will notarize automatically during build.

Example:

```bash
APPLE_SIGNING_IDENTITY="Developer ID Application: Example Name (TEAMID)" \
APPLE_API_KEY="$HOME/private_keys/AuthKey_ABC123XYZ.p8" \
APPLE_API_KEY_ID="ABC123XYZ" \
APPLE_ISSUER_ID="00000000-0000-0000-0000-000000000000" \
./scripts/apple/verify-electron-release.sh arm64
```

## Notes

- These helpers never write secrets into the git-tracked repo.
- `prepare-secrets.sh` supports the current GitHub Actions secret contract already used by the Electron release workflow.
- If App Store Connect API access is still pending, run `prepare-secrets.sh` without the `.p8` inputs; notarization secrets can be added later.
