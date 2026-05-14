#!/usr/bin/env bash

set -euo pipefail

if [ "$(uname -s)" != "Darwin" ]; then
  echo "[generate-csr] macOS is required"
  exit 1
fi

WORKDIR="${APPLE_SIGNING_WORKDIR:-$HOME/.nuwaclaw-apple-signing}"
KEY_PATH="${APPLE_KEY_PATH:-$WORKDIR/santiclaw-developer-id.key}"
CSR_PATH="${APPLE_CSR_PATH:-$WORKDIR/santiclaw-developer-id.csr}"
COMMON_NAME="${APPLE_CSR_COMMON_NAME:-SantiClaw Developer ID}"
EMAIL="${APPLE_CSR_EMAIL:-$(git config user.email 2>/dev/null || true)}"
FORCE="${APPLE_CSR_FORCE:-0}"

if [ -z "$EMAIL" ]; then
  echo "[generate-csr] APPLE_CSR_EMAIL is required when git user.email is not set"
  exit 1
fi

if [ "$FORCE" != "1" ] && { [ -e "$KEY_PATH" ] || [ -e "$CSR_PATH" ]; }; then
  echo "[generate-csr] Refusing to overwrite existing files"
  echo "[generate-csr] Set APPLE_CSR_FORCE=1 to replace them"
  echo "[generate-csr] KEY_PATH=$KEY_PATH"
  echo "[generate-csr] CSR_PATH=$CSR_PATH"
  exit 1
fi

umask 077
mkdir -p "$WORKDIR"

SUBJECT="/emailAddress=${EMAIL}/CN=${COMMON_NAME}"

if [ -n "${APPLE_KEY_PASSWORD:-}" ]; then
  openssl req -new -newkey rsa:2048 \
    -keyout "$KEY_PATH" \
    -out "$CSR_PATH" \
    -subj "$SUBJECT" \
    -passout "env:APPLE_KEY_PASSWORD"
  echo "[generate-csr] Generated encrypted private key"
else
  openssl req -new -newkey rsa:2048 -nodes \
    -keyout "$KEY_PATH" \
    -out "$CSR_PATH" \
    -subj "$SUBJECT"
  echo "[generate-csr] Generated unencrypted private key with 0600 permissions"
fi

echo "[generate-csr] Workspace: $WORKDIR"
echo "[generate-csr] CSR: $CSR_PATH"
echo "[generate-csr] Key: $KEY_PATH"
echo "[generate-csr] Next step: upload the CSR in Apple Developer and download the Developer ID Application .cer file"
