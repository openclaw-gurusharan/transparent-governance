#!/usr/bin/env python3
"""Verify the trust-state matrix across portfolio apps using the live Chrome Beta debug session."""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any

from websocket import create_connection

CDP_BASE = "http://127.0.0.1:9222"
TRUST_API_BASE = "http://127.0.0.1:8000"

BUYER_ROUTE = "http://127.0.0.1:3002/checkout"
SELLER_ROUTE = "http://127.0.0.1:3003/catalog"
FLATWATCH_ROUTES = [
    "http://127.0.0.1:3004/dashboard",
    "http://127.0.0.1:3004/receipts",
    "http://127.0.0.1:3004/challenges",
]

STATE_LABELS = {
    "no_identity": "No identity",
    "identity_present_unverified": "Unverified",
    "verified": "Verified",
    "manual_review": "Manual review",
    "revoked_or_blocked": "Blocked",
}

BUYER_NOTICE_SUBSTRINGS = {
    "no_identity": "Create an identity anchor in AadhaarChain before continuing.",
    "identity_present_unverified": "Identity anchor exists, but no approved verification is available yet.",
    "manual_review": "Verification escalated for manual review in local trust matrix testing.",
    "revoked_or_blocked": "Verification was blocked for local trust matrix testing.",
}

SELLER_NOTICE_SUBSTRINGS = {
    "no_identity": "Create an identity anchor in AadhaarChain before continuing.",
    "identity_present_unverified": "Identity anchor exists, but no approved verification is available yet.",
    "manual_review": "Verification escalated for manual review in local trust matrix testing.",
    "revoked_or_blocked": "Verification was blocked for local trust matrix testing.",
}

FLATWATCH_NOTICE_SUBSTRINGS = {
    "no_identity": "Create an identity anchor in AadhaarChain before uploading evidence or filing challenges.",
    "identity_present_unverified": "Identity anchor exists, but no approved verification is available yet.",
    "verified": "Verification approved for local trust matrix testing.",
    "manual_review": "Verification escalated for manual review in local trust matrix testing.",
    "revoked_or_blocked": "Verification was blocked for local trust matrix testing.",
}


def fetch_json(url: str) -> Any:
    request = urllib.request.Request(url)
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def post_json(url: str, payload: dict[str, Any]) -> Any:
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


@dataclass
class ButtonSnapshot:
    text: str
    disabled: bool


@dataclass
class PageSnapshot:
    href: str
    title: str
    body: str
    wallet_address: str | None
    buttons: list[ButtonSnapshot]

    def button(self, text: str) -> ButtonSnapshot | None:
        for button in self.buttons:
            if button.text == text:
                return button
        return None

    def has_text(self, text: str) -> bool:
        return text in self.body


class CdpPage:
    def __init__(self, websocket_url: str) -> None:
        self._ws = create_connection(websocket_url, timeout=10, suppress_origin=True)
        self._next_id = 1
        self.send("Page.enable")
        self.send("Runtime.enable")

    def close(self) -> None:
        self._ws.close()

    def send(self, method: str, params: dict[str, Any] | None = None) -> Any:
        if params is None:
            params = {}

        message_id = self._next_id
        self._next_id += 1
        self._ws.send(json.dumps({"id": message_id, "method": method, "params": params}))

        while True:
            message = json.loads(self._ws.recv())
            if message.get("id") != message_id:
                continue
            if "error" in message:
                raise RuntimeError(f"CDP {method} failed: {message['error']}")
            return message.get("result")

    def navigate(self, url: str, wait_seconds: float = 1.25) -> None:
        self.send("Page.navigate", {"url": url})
        deadline = time.time() + 10
        while time.time() < deadline:
            message = json.loads(self._ws.recv())
            if message.get("method") == "Page.loadEventFired":
                break
        time.sleep(wait_seconds)

    def evaluate(self, expression: str) -> Any:
        result = self.send(
            "Runtime.evaluate",
            {"expression": expression, "returnByValue": True, "awaitPromise": True},
        )
        return result.get("result", {}).get("value")

    def snapshot(self) -> PageSnapshot:
        value = self.evaluate(
            """
            (() => ({
              href: location.href,
              title: document.title,
              body: document.body ? document.body.innerText.replace(/\\s+/g, ' ').trim() : '',
              wallet_address:
                globalThis.solflare?.publicKey?.toBase58?.()
                || globalThis.solana?.publicKey?.toBase58?.()
                || null,
              buttons: Array.from(document.querySelectorAll('button')).map((button) => ({
                text: button.innerText.replace(/\\s+/g, ' ').trim(),
                disabled: Boolean(button.disabled),
              })),
            }))()
            """
        )
        return PageSnapshot(
            href=value["href"],
            title=value["title"],
            body=normalize_text(value["body"]),
            wallet_address=value["wallet_address"],
            buttons=[
                ButtonSnapshot(text=normalize_text(button["text"]), disabled=bool(button["disabled"]))
                for button in value["buttons"]
                if normalize_text(button["text"])
            ],
        )

    def click_button(self, label: str, partial: bool = False) -> bool:
        value = self.evaluate(
            f"""
            (() => {{
              const buttons = Array.from(document.querySelectorAll('button'));
              const target = buttons.find((button) => {{
                const text = button.innerText.replace(/\\s+/g, ' ').trim();
                return {'text.includes(' + json.dumps(label) + ')' if partial else 'text === ' + json.dumps(label)};
              }});
              if (!target) return false;
              target.click();
              return true;
            }})()
            """
        )
        return bool(value)


def discover_tabs() -> dict[str, str]:
    tabs = fetch_json(f"{CDP_BASE}/json/list")

    mapping = {}
    for tab in tabs:
        if tab.get("type") != "page":
            continue
        url = tab.get("url", "")
        if url.startswith("http://127.0.0.1:3002/"):
            mapping["buyer"] = tab["webSocketDebuggerUrl"]
        elif url.startswith("http://127.0.0.1:3003/"):
            mapping["seller"] = tab["webSocketDebuggerUrl"]
        elif url.startswith("http://127.0.0.1:3004/"):
            mapping["flatwatch"] = tab["webSocketDebuggerUrl"]

    missing = [name for name in ("buyer", "seller", "flatwatch") if name not in mapping]
    if missing:
        raise RuntimeError(
            "Missing required browser tabs in the live Chrome Beta debug session: "
            + ", ".join(missing)
        )

    return mapping


def seed_trust_fixture(wallet_address: str, state: str, document_type: str = "aadhaar") -> Any:
    return post_json(
        f"{TRUST_API_BASE}/api/identity/dev/fixtures/{wallet_address}",
        {"fixture_state": state, "document_type": document_type},
    )


def infer_wallet_address(buyer: CdpPage, seller: CdpPage, flatwatch: CdpPage) -> str:
    for page, route in ((buyer, BUYER_ROUTE), (seller, SELLER_ROUTE), (flatwatch, FLATWATCH_ROUTES[0])):
        page.navigate(route, wait_seconds=0.75)
        deadline = time.time() + 8
        while time.time() < deadline:
            snapshot = page.snapshot()
            if snapshot.wallet_address:
                return snapshot.wallet_address
            time.sleep(0.75)
    raise RuntimeError(
        "Could not infer a connected wallet address from the existing buyer, seller, or FlatWatch tabs."
    )


def ensure_flatwatch_wallet(flatwatch: CdpPage, expected_wallet: str) -> PageSnapshot:
    flatwatch.navigate(FLATWATCH_ROUTES[0])
    snapshot = flatwatch.snapshot()
    if snapshot.wallet_address == expected_wallet:
        return snapshot

    if snapshot.wallet_address and snapshot.wallet_address != expected_wallet:
        raise RuntimeError(
            f"FlatWatch is connected to {snapshot.wallet_address}, expected {expected_wallet}."
        )

    select_clicked = flatwatch.click_button("Select Wallet")
    if not select_clicked:
        raise RuntimeError("FlatWatch wallet button is not available for connection.")

    deadline = time.time() + 10
    while time.time() < deadline:
        snapshot = flatwatch.snapshot()
        if any("Solflare" in button.text for button in snapshot.buttons):
            break
        time.sleep(0.5)
    else:
        raise RuntimeError("FlatWatch wallet modal did not show a Solflare option.")

    if not flatwatch.click_button("Solflare", partial=True):
        raise RuntimeError("Could not choose Solflare in the FlatWatch wallet modal.")

    deadline = time.time() + 20
    while time.time() < deadline:
        snapshot = flatwatch.snapshot()
        if snapshot.wallet_address == expected_wallet:
            return snapshot
        time.sleep(1)

    raise RuntimeError("FlatWatch did not connect the expected Solflare wallet.")


def assert_buyer(snapshot: PageSnapshot, state: str) -> dict[str, Any]:
    label = f"Trust {STATE_LABELS[state]}"
    if not snapshot.has_text(label):
        raise AssertionError(f"buyer missing state label {label!r}")

    if state == "verified":
        button = snapshot.button("Trust verification required")
        if button is not None:
            raise AssertionError("buyer remained trust-blocked during verified state")
    else:
        button = snapshot.button("Trust verification required")
        if button is None or not button.disabled:
            raise AssertionError(f"buyer checkout gate did not stay blocked for {state}")

    if state != "verified":
        notice = BUYER_NOTICE_SUBSTRINGS[state]
        if notice not in snapshot.body:
            raise AssertionError(f"buyer missing notice for {state}")

    return {
        "label": label,
        "buttons": [button.__dict__ for button in snapshot.buttons],
    }


def assert_seller(snapshot: PageSnapshot, state: str) -> dict[str, Any]:
    label = f"Trust {STATE_LABELS[state]}"
    if not snapshot.has_text(label):
        raise AssertionError(f"seller missing state label {label!r}")

    add_product = snapshot.button("Add New Product")
    if add_product is None:
        raise AssertionError("seller missing Add New Product button")

    if state == "verified":
        if add_product.disabled:
            raise AssertionError("seller Add New Product stayed disabled during verified state")
    else:
        if not add_product.disabled:
            raise AssertionError(f"seller Add New Product stayed enabled for {state}")
        notice = SELLER_NOTICE_SUBSTRINGS[state]
        if notice not in snapshot.body:
            raise AssertionError(f"seller missing notice for {state}")

    return {
        "label": label,
        "buttons": [button.__dict__ for button in snapshot.buttons],
    }


def assert_flatwatch(snapshot: PageSnapshot, state: str, route: str) -> dict[str, Any]:
    panel_label = f"AadhaarChain trust: {STATE_LABELS[state]}"
    if panel_label not in snapshot.body:
        raise AssertionError(f"flatwatch missing panel label {panel_label!r} on {route}")

    if FLATWATCH_NOTICE_SUBSTRINGS[state] not in snapshot.body:
        raise AssertionError(f"flatwatch missing notice for {state} on {route}")

    if route.endswith("/challenges"):
        if state == "verified":
            new_challenge = snapshot.button("New Challenge")
            if new_challenge is None or new_challenge.disabled:
                raise AssertionError("flatwatch challenge flow stayed blocked during verified state")
        else:
            gated = snapshot.button("Verified trust required")
            if gated is None or not gated.disabled:
                raise AssertionError(f"flatwatch challenge flow was not blocked for {state}")

    if route.endswith("/receipts") and state != "verified":
        if "Verified trust required to upload" not in snapshot.body:
            raise AssertionError(f"flatwatch receipts upload gate missing for {state}")

    return {
        "route": route,
        "label": panel_label,
        "buttons": [button.__dict__ for button in snapshot.buttons],
    }


def run_matrix(wallet_address: str, reset_state: str) -> dict[str, Any]:
    tabs = discover_tabs()
    buyer = CdpPage(tabs["buyer"])
    seller = CdpPage(tabs["seller"])
    flatwatch = CdpPage(tabs["flatwatch"])

    try:
        inferred_wallet = infer_wallet_address(buyer, seller, flatwatch)
        if wallet_address and inferred_wallet != wallet_address:
            raise RuntimeError(
                f"Requested wallet {wallet_address} does not match the connected portfolio wallet {inferred_wallet}."
            )
        wallet_address = wallet_address or inferred_wallet
        ensure_flatwatch_wallet(flatwatch, wallet_address)

        matrix: list[dict[str, Any]] = []
        for state in (
            "no_identity",
            "identity_present_unverified",
            "verified",
            "manual_review",
            "revoked_or_blocked",
        ):
            seed_trust_fixture(wallet_address, state)
            buyer.navigate(BUYER_ROUTE)
            seller.navigate(SELLER_ROUTE)

            buyer_snapshot = buyer.snapshot()
            seller_snapshot = seller.snapshot()
            flatwatch_results = []
            for route in FLATWATCH_ROUTES:
                flatwatch.navigate(route)
                flatwatch_results.append(assert_flatwatch(flatwatch.snapshot(), state, route))

            matrix.append(
                {
                    "state": state,
                    "buyer": assert_buyer(buyer_snapshot, state),
                    "seller": assert_seller(seller_snapshot, state),
                    "flatwatch": flatwatch_results,
                }
            )

        return {"wallet_address": wallet_address, "matrix": matrix}
    finally:
        try:
            seed_trust_fixture(wallet_address, reset_state)
        except Exception:
            pass
        try:
            flatwatch.navigate(FLATWATCH_ROUTES[0], wait_seconds=0.5)
        except Exception:
            pass
        buyer.close()
        seller.close()
        flatwatch.close()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate the live trust-state matrix across buyer, seller, and FlatWatch."
    )
    parser.add_argument(
        "--wallet-address",
        default="",
        help="Optional explicit wallet address. If omitted, infer it from the existing buyer/seller tabs.",
    )
    parser.add_argument(
        "--reset-state",
        default="no_identity",
        choices=list(STATE_LABELS.keys()),
        help="Trust state to restore after the matrix run.",
    )
    args = parser.parse_args()

    try:
        result = run_matrix(wallet_address=args.wallet_address, reset_state=args.reset_state)
    except (AssertionError, RuntimeError, urllib.error.URLError) as exc:
        print(f"[error] {exc}", file=sys.stderr)
        return 1

    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
