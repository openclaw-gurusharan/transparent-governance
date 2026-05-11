#!/usr/bin/env python3
"""Guardrail for live trust-matrix validation.

Browser-based portfolio validation must run through the Chrome plugin in Codex.
This shell-invoked script intentionally does not drive a browser by itself.
"""

from __future__ import annotations

import sys


def main() -> int:
    print(
        "[error] live trust matrix browser validation must use the Chrome plugin, "
        "not this shell-invoked harness.",
        file=sys.stderr,
    )
    print(
        "[hint] run the portfolio pages through the Chrome plugin and record the "
        "same-wallet evidence in PROGRESS.md.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
