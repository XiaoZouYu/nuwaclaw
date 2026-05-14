#!/usr/bin/env bash

set -euo pipefail

if [ "$(uname -s)" != "Darwin" ]; then
  echo "[verify-electron-release] macOS is required"
  exit 1
fi

if [ -z "${APPLE_SIGNING_IDENTITY:-}" ]; then
  echo "[verify-electron-release] APPLE_SIGNING_IDENTITY is required"
  exit 1
fi

ARCH="${1:-arm64}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ELECTRON_DIR="${PROJECT_ROOT}/crates/agent-electron-client"
DIST_CMD="dist:mac:${ARCH}"

if [ "$ARCH" = "universal" ]; then
  DIST_CMD="dist:mac"
fi

if [ ! -d "$ELECTRON_DIR" ]; then
  echo "[verify-electron-release] Electron project not found: $ELECTRON_DIR"
  exit 1
fi

if [ -n "${APPLE_API_KEY:-}" ] && [ -n "${APPLE_API_KEY_ID:-}" ] && [ -n "${APPLE_ISSUER_ID:-}" ]; then
  export APPLE_API_ISSUER="${APPLE_API_ISSUER:-$APPLE_ISSUER_ID}"
  echo "[verify-electron-release] Notarization env detected"
else
  echo "[verify-electron-release] Notarization env missing; build will be signed but may skip notarization"
fi

cd "$ELECTRON_DIR"
npm run "$DIST_CMD"
npm run verify:sign

echo "[verify-electron-release] Completed $DIST_CMD and verify:sign"
