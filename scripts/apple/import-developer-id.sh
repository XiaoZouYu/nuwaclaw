#!/usr/bin/env bash

set -euo pipefail

if [ "$(uname -s)" != "Darwin" ]; then
  echo "[import-developer-id] macOS is required"
  exit 1
fi

if [ $# -lt 1 ] && [ -z "${APPLE_CERT_CER_PATH:-}" ]; then
  echo "Usage: APPLE_P12_PASSWORD=... $0 /path/to/developer_id_application.cer"
  exit 1
fi

CER_PATH="${1:-${APPLE_CERT_CER_PATH:-}}"
WORKDIR="${APPLE_SIGNING_WORKDIR:-$HOME/.nuwaclaw-apple-signing}"
KEY_PATH="${APPLE_KEY_PATH:-$WORKDIR/santiclaw-developer-id.key}"
P12_PATH="${APPLE_P12_PATH:-$WORKDIR/santiclaw-developer-id.p12}"
KEYCHAIN_PATH="${APPLE_KEYCHAIN_PATH:-$HOME/Library/Keychains/login.keychain-db}"

if [ ! -f "$CER_PATH" ]; then
  echo "[import-developer-id] Certificate file not found: $CER_PATH"
  exit 1
fi

if [ ! -f "$KEY_PATH" ]; then
  echo "[import-developer-id] Private key not found: $KEY_PATH"
  echo "[import-developer-id] Run ./scripts/apple/generate-csr.sh first"
  exit 1
fi

if [ -z "${APPLE_P12_PASSWORD:-}" ]; then
  echo "[import-developer-id] APPLE_P12_PASSWORD is required"
  exit 1
fi

umask 077
mkdir -p "$WORKDIR"

TEMP_CERT_PEM="$(mktemp "$WORKDIR/cert.XXXXXX.pem")"
cleanup() {
  rm -f "$TEMP_CERT_PEM"
}
trap cleanup EXIT

if openssl x509 -inform DER -in "$CER_PATH" -noout >/dev/null 2>&1; then
  openssl x509 -inform DER -in "$CER_PATH" -out "$TEMP_CERT_PEM"
else
  cp "$CER_PATH" "$TEMP_CERT_PEM"
fi

PKCS12_ARGS=(
  pkcs12 -export -legacy
  -inkey "$KEY_PATH"
  -in "$TEMP_CERT_PEM"
  -out "$P12_PATH"
  -passout "env:APPLE_P12_PASSWORD"
)

if [ -n "${APPLE_KEY_PASSWORD:-}" ]; then
  PKCS12_ARGS+=(-passin "env:APPLE_KEY_PASSWORD")
fi

openssl "${PKCS12_ARGS[@]}"

security import "$P12_PATH" \
  -k "$KEYCHAIN_PATH" \
  -P "$APPLE_P12_PASSWORD" \
  -T /usr/bin/codesign \
  -T /usr/bin/security \
  -T /usr/bin/productbuild

IDENTITY="$(security find-identity -v -p codesigning 2>/dev/null | awk -F'"' '/Developer ID Application:/ { print $2; exit }')"

echo "[import-developer-id] P12: $P12_PATH"
echo "[import-developer-id] Imported into keychain: $KEYCHAIN_PATH"
if [ -n "$IDENTITY" ]; then
  echo "[import-developer-id] Detected identity: $IDENTITY"
else
  echo "[import-developer-id] No Developer ID Application identity detected yet"
  echo "[import-developer-id] Run: security find-identity -v -p codesigning"
fi
