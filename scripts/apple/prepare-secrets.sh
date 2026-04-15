#!/usr/bin/env bash

set -euo pipefail

WORKDIR="${APPLE_SIGNING_WORKDIR:-$HOME/.nuwaclaw-apple-signing}"
P12_PATH="${APPLE_P12_PATH:-$WORKDIR/santiclaw-developer-id.p12}"
IDENTITY="${APPLE_SIGNING_IDENTITY:-}"
P12_PASSWORD="${APPLE_P12_PASSWORD:-}"
P8_PATH="${APPLE_P8_PATH:-}"
API_KEY_ID="${APPLE_API_KEY_ID:-}"
ISSUER_ID="${APPLE_ISSUER_ID:-}"
OUT_DIR="${APPLE_SECRET_OUTPUT_DIR:-$WORKDIR/generated-secrets}"
SET_GH_SECRETS="${APPLE_SET_GH_SECRETS:-0}"
GH_REPO="${APPLE_GH_REPO:-$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)}"

if [ ! -f "$P12_PATH" ]; then
  echo "[prepare-secrets] P12 not found: $P12_PATH"
  exit 1
fi

if [ -z "$IDENTITY" ]; then
  echo "[prepare-secrets] APPLE_SIGNING_IDENTITY is required"
  exit 1
fi

if [ -z "$P12_PASSWORD" ]; then
  echo "[prepare-secrets] APPLE_P12_PASSWORD is required"
  exit 1
fi

umask 077
mkdir -p "$OUT_DIR"

base64 < "$P12_PATH" | tr -d '\n' > "$OUT_DIR/APPLE_CERTIFICATE.txt"
printf '%s' "$P12_PASSWORD" > "$OUT_DIR/APPLE_CERTIFICATE_PASSWORD.txt"
printf '%s' "$IDENTITY" > "$OUT_DIR/APPLE_SIGNING_IDENTITY.txt"

NOTARIZATION_READY=0
if [ -n "$P8_PATH" ] || [ -n "$API_KEY_ID" ] || [ -n "$ISSUER_ID" ]; then
  if [ -z "$P8_PATH" ] || [ -z "$API_KEY_ID" ] || [ -z "$ISSUER_ID" ]; then
    echo "[prepare-secrets] APPLE_P8_PATH, APPLE_API_KEY_ID, and APPLE_ISSUER_ID must be provided together"
    exit 1
  fi
  if [ ! -f "$P8_PATH" ]; then
    echo "[prepare-secrets] P8 not found: $P8_PATH"
    exit 1
  fi
  base64 < "$P8_PATH" | tr -d '\n' > "$OUT_DIR/APPLE_API_KEY.txt"
  printf '%s' "$API_KEY_ID" > "$OUT_DIR/APPLE_API_KEY_ID.txt"
  printf '%s' "$ISSUER_ID" > "$OUT_DIR/APPLE_ISSUER_ID.txt"
  NOTARIZATION_READY=1
fi

cat > "$OUT_DIR/summary.txt" <<EOF
Ready secrets:
- APPLE_CERTIFICATE
- APPLE_CERTIFICATE_PASSWORD
- APPLE_SIGNING_IDENTITY
EOF

if [ "$NOTARIZATION_READY" -eq 1 ]; then
  cat >> "$OUT_DIR/summary.txt" <<EOF
- APPLE_API_KEY
- APPLE_API_KEY_ID
- APPLE_ISSUER_ID
EOF
else
  cat >> "$OUT_DIR/summary.txt" <<EOF

Pending notarization secrets:
- APPLE_API_KEY
- APPLE_API_KEY_ID
- APPLE_ISSUER_ID
EOF
fi

if [ "$SET_GH_SECRETS" = "1" ]; then
  if [ -z "$GH_REPO" ]; then
    echo "[prepare-secrets] Could not determine GitHub repo for gh secret set"
    exit 1
  fi
  gh secret set APPLE_CERTIFICATE --repo "$GH_REPO" < "$OUT_DIR/APPLE_CERTIFICATE.txt"
  gh secret set APPLE_CERTIFICATE_PASSWORD --repo "$GH_REPO" < "$OUT_DIR/APPLE_CERTIFICATE_PASSWORD.txt"
  gh secret set APPLE_SIGNING_IDENTITY --repo "$GH_REPO" < "$OUT_DIR/APPLE_SIGNING_IDENTITY.txt"
  if [ "$NOTARIZATION_READY" -eq 1 ]; then
    gh secret set APPLE_API_KEY --repo "$GH_REPO" < "$OUT_DIR/APPLE_API_KEY.txt"
    gh secret set APPLE_API_KEY_ID --repo "$GH_REPO" < "$OUT_DIR/APPLE_API_KEY_ID.txt"
    gh secret set APPLE_ISSUER_ID --repo "$GH_REPO" < "$OUT_DIR/APPLE_ISSUER_ID.txt"
  fi
  echo "[prepare-secrets] GitHub Actions secrets updated for $GH_REPO"
fi

echo "[prepare-secrets] Secret files written to $OUT_DIR"
echo "[prepare-secrets] Summary: $OUT_DIR/summary.txt"
