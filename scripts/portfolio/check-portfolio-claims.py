#!/usr/bin/env python3
"""Validate high-risk portfolio architecture claims against owner surfaces."""

from __future__ import annotations

import sys
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SELF_PATH = Path(__file__).resolve()


REQUIRED_SNIPPETS = {
    "docs/reference/TRUST-CONSUMER-CONTRACT.md": [
        "`aadhaar-chain` is the only producer of portfolio trust state",
        "raw Aadhaar payloads, OCR output, and verifier internals must not cross this consumer boundary",
        "`no_identity`",
        "`identity_present_unverified`",
        "`verified`",
        "`manual_review`",
        "`revoked_or_blocked`",
    ],
    "docs/reference/AADHAAR-SOLANA-BRIDGE-SPEC.md": [
        "`aadhar-solana` is a long-term chain and credential layer behind `aadhaar-chain`; it is not the current portfolio trust producer.",
        "Raw Aadhaar, PAN, OCR output, extracted PII, and internal verifier payloads must stay inside `aadhaar-chain`.",
        "raw Aadhaar number",
        "raw PAN number",
        "`aadhar-solana` should remain a migration target and security-review candidate until the promotion gates above are complete.",
    ],
    "docs/reference/PORTFOLIO-TRUST-ACTION-POLICY.md": [
        "Trust display is informational. Protected actions must be enforced by server-side policy or an auditable control-plane decision.",
        "Only `verified` can unlock high-trust writes by default.",
        "If the trust service is unavailable, protected actions must fail closed.",
        "Buyer agent commerce writes",
        "Seller agent catalog/order writes",
        "FlatWatch agent writes",
    ],
    "docs/workflow/browser-testing-checklist.md": [
        "Use the Chrome plugin/browser client for browser-based testing.",
        "Do not satisfy browser validation with shell-only HTTP probes or any browser",
        "tool other than the Chrome plugin.",
    ],
    "docs/workflow/browser-testing-control-plane.md": [
        "Chrome plugin/browser client is the only browser-validation lane",
        "Do not substitute anything else for Chrome-plugin browser-based testing.",
        "scripts/browser/check-cdp-endpoint.sh",
    ],
    "scripts/browser/check-cdp-endpoint.sh": [
        "does not expose DevTools JSON",
        "Use the Chrome plugin/system Chrome flow",
        "Do not substitute another browser tool",
    ],
    "scripts/portfolio/verify-trust-matrix.py": [
        "Browser-based portfolio validation must run through the Chrome plugin in Codex.",
        "This shell-invoked script intentionally does not drive a browser by itself.",
        "live trust matrix browser validation must use the Chrome plugin",
    ],
}

FORBIDDEN_SNIPPETS = {
    "docs/reference/AADHAAR-SOLANA-BRIDGE-SPEC.md": [
        "is the current portfolio trust producer",
        "downstream apps should call `aadhar-solana` directly",
    ],
    "docs/reference/PORTFOLIO-TRUST-ACTION-POLICY.md": [
        "Trust display is enforcement",
        "frontend trust state is the enforcement boundary",
    ],
    "scripts/browser/check-cdp-endpoint.sh": [
        "open -na",
    ],
}

SEMANTIC_FORBIDDEN_CLAIMS = {
    "raw identity on-chain": [
        "raw identity data on-chain",
        "raw identity data is on-chain",
        "raw aadhaar data on-chain",
        "raw aadhaar data is on-chain",
        "raw aadhaar is stored on-chain",
        "raw aadhaar payloads on-chain",
        "raw pan data on-chain",
        "raw pan data is on-chain",
        "store raw aadhaar on-chain",
        "put raw aadhaar on-chain",
    ],
    "deployed shared auth before producer auth is real": [
        "deployed shared auth broker: yes",
        "shared_session_claims_allowed_in_public: true",
        "deployed public shared auth is live",
        "deployed shared login is live",
        "production shared login is live",
        "active wallet-backed sso is deployed",
        "aadhaarchain is the deployed shared session broker",
    ],
    "mock integrations described as production-ready": [
        "mock ocr is production-ready",
        "mock ocr is production ready",
        "filename-based ocr is production-ready",
        "filename-based ocr is production ready",
        "mock payment ingestion is production-ready",
        "mock payment ingestion is production ready",
        "mock razorpay is production-ready",
        "mock razorpay is production ready",
        "razorpay mock is production-ready",
        "razorpay mock is production ready",
    ],
}

TEXT_FILE_SUFFIXES = {
    ".md",
    ".mdx",
    ".txt",
    ".py",
    ".sh",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".yml",
    ".yaml",
}


def tracked_text_files() -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    paths: list[Path] = []
    for line in result.stdout.splitlines():
        path = ROOT / line
        if path == SELF_PATH or path.name == "PROGRESS.md":
            continue
        if path.suffix.lower() in TEXT_FILE_SUFFIXES and path.exists():
            paths.append(path)
    return paths


def check_forbidden_semantic_claims(failures: list[str]) -> None:
    for path in tracked_text_files():
        try:
            lines = path.read_text(errors="ignore").splitlines()
        except OSError as exc:
            failures.append(f"{path.relative_to(ROOT)} could not be read: {exc}")
            continue

        for line_number, line in enumerate(lines, start=1):
            normalized = " ".join(line.lower().split())
            for claim_type, snippets in SEMANTIC_FORBIDDEN_CLAIMS.items():
                for snippet in snippets:
                    if snippet in normalized:
                        failures.append(
                            f"{path.relative_to(ROOT)}:{line_number} contains unsupported {claim_type} claim: {snippet!r}"
                        )


def main() -> int:
    failures: list[str] = []

    for relative_path, snippets in REQUIRED_SNIPPETS.items():
        path = ROOT / relative_path
        if not path.exists():
            failures.append(f"{relative_path} is missing")
            continue

        text = path.read_text()
        for snippet in snippets:
            if snippet not in text:
                failures.append(f"{relative_path} is missing required claim: {snippet!r}")

    for relative_path, snippets in FORBIDDEN_SNIPPETS.items():
        path = ROOT / relative_path
        if not path.exists():
            continue

        text = path.read_text()
        for snippet in snippets:
            if snippet in text:
                failures.append(f"{relative_path} contains forbidden claim: {snippet!r}")

    check_forbidden_semantic_claims(failures)

    if failures:
        for failure in failures:
            print(f"[fail] {failure}")
        return 1

    print("[ok] portfolio architecture claims match owner surfaces")
    return 0


if __name__ == "__main__":
    sys.exit(main())
