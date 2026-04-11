#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  echo "usage: $0 <wallet-address> <fixture-state> [document-type]"
  echo "fixture-state: no_identity | identity_present_unverified | verified | manual_review | revoked_or_blocked"
  echo "document-type: aadhaar | pan (default: aadhaar)"
  exit 1
fi

WALLET_ADDRESS="$1"
FIXTURE_STATE="$2"
DOCUMENT_TYPE="${3:-aadhaar}"

curl -sf \
  -X POST \
  "http://127.0.0.1:43101/api/identity/dev/fixtures/${WALLET_ADDRESS}" \
  -H "Content-Type: application/json" \
  -d "{\"fixture_state\":\"${FIXTURE_STATE}\",\"document_type\":\"${DOCUMENT_TYPE}\"}"
echo
