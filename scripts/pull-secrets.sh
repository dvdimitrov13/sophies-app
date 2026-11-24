#!/usr/bin/env bash
# Writes .env.local from the sophies-app-kv Key Vault, so secrets never have
# to be passed around. Needs `az login` with read access to the vault.
set -euo pipefail

VAULT=sophies-app-kv
OUT="$(cd "$(dirname "$0")/.." && pwd)/.env.local"

get() { az keyvault secret show --vault-name "$VAULT" -n "$1" --query value -o tsv; }

ANTHROPIC_API_KEY=$(get ANTHROPIC-API-KEY)
AUTH_SECRET=$(get AUTH-SECRET)
MONGODB_URI=$(get MONGODB-URI)
SOPHIE_PASSWORD_HASH=$(get SOPHIE-PASSWORD-HASH)

if [ -f "$OUT" ]; then
  cp "$OUT" "$OUT.bak"
  echo "Backed up existing .env.local to .env.local.bak"
fi

# Next.js expands $VARS in env files, so the bcrypt hash's $ signs are escaped.
{
  echo "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY"
  echo "AUTH_SECRET=$AUTH_SECRET"
  echo "AUTH_TRUST_HOST=true"
  echo "MONGODB_URI=$MONGODB_URI"
  echo "SOPHIE_PASSWORD_HASH=${SOPHIE_PASSWORD_HASH//\$/\\\$}"
} > "$OUT"
chmod 600 "$OUT"

echo "Wrote $OUT from Key Vault $VAULT"
