#!/usr/bin/env python3
"""Verify the active gateway trust API against the workspace consumer contract."""

from __future__ import annotations

import re
import sys
import os
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
CONTRACT_DOC = ROOT / "docs/reference/TRUST-CONSUMER-CONTRACT.md"
GATEWAY_DIR = ROOT / "aadhaar-chain/gateway"

EXPECTED_STATES = {
    "no_identity",
    "identity_present_unverified",
    "verified",
    "manual_review",
    "revoked_or_blocked",
}

REQUIRED_SURFACE_KEYS = {
    "trust_version",
    "wallet_address",
    "did",
    "verification_bitmap",
    "updated_at",
    "trust_state",
    "state_reason",
    "high_trust_eligible",
    "verifications",
}

REQUIRED_VERIFICATION_KEYS = {
    "document_type",
    "verification_id",
    "workflow_status",
    "decision",
    "reason",
    "evidence_status",
    "consent",
    "attestation",
    "revocation",
    "review",
    "audit_receipts",
}

FORBIDDEN_KEYS = {
    "document",
    "fraud",
    "compliance",
    "extracted_fields",
    "submitted_claims",
    "raw_document",
    "uid",
    "pan_number",
}


def parse_contract_states() -> set[str]:
    text = CONTRACT_DOC.read_text()
    match = re.search(r"## Portfolio Trust States\s+(.*?)(?:\n## |\Z)", text, re.S)
    if not match:
        raise SystemExit("[fail] missing Portfolio Trust States section in trust consumer contract")

    return set(re.findall(r"- `([^`]+)`", match.group(1)))


def collect_forbidden_keys(value: Any, path: str = "$") -> list[str]:
    found: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            if key in FORBIDDEN_KEYS:
                found.append(child_path)
            found.extend(collect_forbidden_keys(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(collect_forbidden_keys(child, f"{path}[{index}]"))
    return found


def import_gateway() -> tuple[Any, Any, Any]:
    os.chdir(GATEWAY_DIR)
    sys.path.insert(0, str(GATEWAY_DIR))
    from fastapi.testclient import TestClient
    from main import app
    from app.routes import agent_manager, identities

    return TestClient(app), identities, agent_manager


def main() -> int:
    contract_states = parse_contract_states()
    failures: list[str] = []

    if contract_states != EXPECTED_STATES:
        failures.append(
            "TRUST-CONSUMER-CONTRACT.md states do not match the expected portfolio matrix: "
            f"{sorted(contract_states)}"
        )

    client, identities, agent_manager = import_gateway()
    identities.clear()
    agent_manager.verification_records.clear()

    for state in sorted(EXPECTED_STATES):
        wallet_address = f"contract-{state}"
        seed_response = client.post(
            f"/api/identity/dev/fixtures/{wallet_address}",
            json={"fixture_state": state, "document_type": "aadhaar"},
        )
        if seed_response.status_code != 200:
            failures.append(f"{state}: fixture seed returned {seed_response.status_code}")
            continue

        trust_response = client.get(f"/api/identity/{wallet_address}/trust")
        if trust_response.status_code != 200:
            failures.append(f"{state}: trust endpoint returned {trust_response.status_code}")
            continue

        payload = trust_response.json()
        trust_surface = payload.get("data")
        if not payload.get("success") or not isinstance(trust_surface, dict):
            failures.append(f"{state}: trust endpoint did not return a successful object payload")
            continue

        missing_keys = sorted(REQUIRED_SURFACE_KEYS - set(trust_surface))
        if missing_keys:
            failures.append(f"{state}: trust surface missing keys {missing_keys}")

        if trust_surface.get("trust_state") != state:
            failures.append(f"{state}: trust_state was {trust_surface.get('trust_state')!r}")

        expected_eligible = state == "verified"
        if trust_surface.get("high_trust_eligible") is not expected_eligible:
            failures.append(f"{state}: high_trust_eligible must be {expected_eligible}")

        forbidden_paths = collect_forbidden_keys(trust_surface)
        if forbidden_paths:
            failures.append(f"{state}: trust surface leaks forbidden internal keys {forbidden_paths}")

        verifications = trust_surface.get("verifications", [])
        if state in {"verified", "manual_review", "revoked_or_blocked"} and not verifications:
            failures.append(f"{state}: expected at least one downstream-safe verification summary")

        for index, verification in enumerate(verifications):
            if not isinstance(verification, dict):
                failures.append(f"{state}: verification {index} is not an object")
                continue
            missing_verification_keys = sorted(REQUIRED_VERIFICATION_KEYS - set(verification))
            if missing_verification_keys:
                failures.append(
                    f"{state}: verification {index} missing keys {missing_verification_keys}"
                )

    no_identity_response = client.get("/api/identity/contract-no-identity")
    if no_identity_response.status_code != 200 or no_identity_response.json().get("data") is not None:
        failures.append("GET /api/identity/{wallet} must keep data=null for missing identity anchors")

    if failures:
        for failure in failures:
            print(f"[fail] {failure}")
        return 1

    print("[ok] aadhaar-chain trust API matches TRUST-CONSUMER-CONTRACT.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
