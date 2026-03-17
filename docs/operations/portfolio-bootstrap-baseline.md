# Portfolio Bootstrap Baseline

Status: active

Owner: workspace governance

Companion docs:

- `docs/reference/MISSION.md`
- `docs/reference/TRUST-CONSUMER-CONTRACT.md`
- `docs/workflow/browser-testing-control-plane.md`

## Purpose

Define one deterministic local bootstrap and verification path for each portfolio repo.

This doc is operational, not aspirational. It records the commands that were verified in this workspace on 2026-03-17.

## Shared Rules

- `aadhaar-chain` is the only trust producer.
- `ondc-buyer`, `ondc-seller`, and `flatwatch` consume trust through the shared trust contract.
- Browser validation for auth or wallet flows must use the existing Chrome Beta debug session on `127.0.0.1:9222` with `~/.codex/chrome-beta-debug-profile`.
- If the required logged-in tab is missing, stop and ask the user to open the app and log in before testing.

## Workspace Startup

Use the workspace scripts when you want the full local stack instead of starting each repo by hand:

```bash
cd /Users/gurusharan/Documents/remote-claude/CodexWorkspace
./scripts/portfolio/start-dev.sh
```

To stop the full stack:

```bash
cd /Users/gurusharan/Documents/remote-claude/CodexWorkspace
./scripts/portfolio/stop-dev.sh
```

To seed the current wallet into a deterministic trust state for browser validation:

```bash
cd /Users/gurusharan/Documents/remote-claude/CodexWorkspace
./scripts/portfolio/seed-trust-fixture.sh <wallet-address> verified
```

For FlatWatch browser validation, connect the same Solflare wallet used in AadhaarChain inside the already-open logged-in FlatWatch tab before testing trust-gated evidence or challenge flows.

To run the full live trust-state matrix against the existing buyer, seller, and FlatWatch tabs:

```bash
cd /Users/gurusharan/Documents/remote-claude/CodexWorkspace
./scripts/portfolio/verify-trust-matrix.py
```

The matrix harness reuses the existing Chrome Beta debug-profile session on `127.0.0.1:9222`, seeds AadhaarChain trust fixtures for the connected wallet, validates buyer/seller/FlatWatch behavior, and resets the fixture back to `no_identity` by default when it exits.

To run the full acceptance gate for the portfolio:

```bash
cd /Users/gurusharan/Documents/remote-claude/CodexWorkspace
./scripts/portfolio/acceptance-gate.sh
```

Useful shortcuts:

```bash
./scripts/portfolio/acceptance-gate.sh --deterministic-only
./scripts/portfolio/acceptance-gate.sh --browser-only
```

If the browser phase fails because the Chrome Beta debug session is not available on `127.0.0.1:9222`, relaunch the required profile with:

```bash
if ! curl -sf http://127.0.0.1:9222/json/version >/dev/null; then
  open -na "Google Chrome Beta" --args \
    --remote-debugging-port=9222 \
    --user-data-dir="$HOME/.codex/chrome-beta-debug-profile"
fi
```

## Local Port Map

Use these local ports to avoid collisions during portfolio work:

- `aadhaar-chain` frontend: `3000`
- `aadhaar-chain` gateway: `8000`
- `ondc-buyer` frontend: `3002`
- `ondc-seller` frontend: `3003`
- `flatwatch` frontend: `3004` (recommended dev override)
- `flatwatch` backend: `8001` (recommended dev override)

## `aadhaar-chain`

Role: trust producer

### Verified install and checks

Frontend:

```bash
cd /Users/gurusharan/Documents/remote-claude/CodexWorkspace/aadhaar-chain/frontend
npm install
npm run lint
npm run build
```

Gateway tests:

```bash
cd /Users/gurusharan/Documents/remote-claude/CodexWorkspace/aadhaar-chain/gateway
PYTHONPATH="$PWD/venv/lib/python3.12/site-packages${PYTHONPATH:+:$PYTHONPATH}" \
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 \
/Users/gurusharan/.pyenv/versions/3.12.0/bin/python3 -m pytest tests/test_routes.py -q
```

Gateway start and health:

```bash
cd /Users/gurusharan/Documents/remote-claude/CodexWorkspace/aadhaar-chain
./scripts/start-gateway.sh
curl http://127.0.0.1:8000/health
```

### Runtime notes

- Frontend serves on `http://localhost:3000`.
- Gateway serves on `http://127.0.0.1:8000`.
- The gateway startup path relies on the repo’s vendored `gateway/venv` site-packages or the local `pyenv` Python 3.12 interpreter.

### Browser validation baseline

- Use the already-open logged-in AadhaarChain tab in the Chrome Beta debug-profile session.
- Verified authenticated routes:
  - `/dashboard`
  - `/identity/create`
  - `/verify/aadhaar`
  - `/verify/pan`
  - `/credentials`
  - `/settings`

## `ondc-buyer`

Role: trust-consuming buyer commerce surface

### Preconditions

- Local DRAMS package must exist at `/Users/gurusharan/Documents/remote-claude/Research/drams-design`.
- The buyer app expects a commerce backend on `http://localhost:3001` unless `VITE_API_BASE_URL` overrides it.

### Required env vars

- `VITE_API_BASE_URL`
- `VITE_IDENTITY_URL`
- `VITE_IDENTITY_WEB_URL`
- `VITE_TRUST_API_URL`

### Verified install and checks

```bash
cd /Users/gurusharan/Documents/remote-claude/CodexWorkspace/ondc-buyer
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

### Dev start

```bash
cd /Users/gurusharan/Documents/remote-claude/CodexWorkspace/ondc-buyer
npm run dev
```

Expected local frontend: `http://localhost:3002`

### Browser validation target

- Verify trust-aware checkout behavior using the logged-in Chrome Beta debug-profile session.
- Required scenarios:
  - `verified`
  - `no_identity`
  - `identity_present_unverified`
  - `manual_review`
  - `revoked_or_blocked`
- Verified on 2026-03-17 against the connected Solflare wallet `vVtq..UphL`.
- The checkout action is enabled only for `verified`; the other states keep checkout blocked with state-specific AadhaarChain remediation messaging.

## `ondc-seller`

Role: trust-consuming seller commerce surface

### Preconditions

- Local DRAMS package must exist at `/Users/gurusharan/Documents/remote-claude/Research/drams-design`.
- The seller app expects a seller backend on `http://localhost:3001` unless `VITE_API_BASE_URL` overrides it.

### Required env vars

- `VITE_API_BASE_URL`
- `VITE_IDENTITY_URL`
- `VITE_IDENTITY_WEB_URL`
- `VITE_TRUST_API_URL`

### Verified install and checks

```bash
cd /Users/gurusharan/Documents/remote-claude/CodexWorkspace/ondc-seller
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

### Dev start

```bash
cd /Users/gurusharan/Documents/remote-claude/CodexWorkspace/ondc-seller
npm run dev
```

Expected local frontend: `http://localhost:3003`

### Browser validation target

- Verify trust gating for catalog publication and seller configuration actions.
- Keep ONDC configuration messaging separate from trust eligibility messaging.
- Verified on 2026-03-17 against the connected Solflare wallet `vVtq..UphL`.
- Catalog publication actions stay enabled only for `verified`; `no_identity`, `identity_present_unverified`, `manual_review`, and `revoked_or_blocked` all keep seller actions paused with explicit trust-state messaging.

## `flatwatch`

Role: transparency and audit surface

### Required env vars

Frontend:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_IDENTITY_WEB_URL`
- `NEXT_PUBLIC_TRUST_API_URL`

Backend:

- `IDENTITY_URL`

### Verified backend install and checks

```bash
cd /Users/gurusharan/Documents/remote-claude/CodexWorkspace/flatwatch/backend
python3 -m pip install -r requirements-dev.txt
python3 -m pytest -q
```

### Verified frontend install and checks

```bash
cd /Users/gurusharan/Documents/remote-claude/CodexWorkspace/flatwatch/frontend
npm install
npm run test -- --runInBand
npm run lint
npm run build
```

### Recommended dev start

Backend:

```bash
cd /Users/gurusharan/Documents/remote-claude/CodexWorkspace/flatwatch/backend
uvicorn app.main:app --reload --port 8001
```

Frontend:

```bash
cd /Users/gurusharan/Documents/remote-claude/CodexWorkspace/flatwatch/frontend
npm run dev -- --port 3004
```

### Browser validation target

- Verify trust-gated challenge filing and evidence workflows.
- Verify non-verified states are blocked with provenance-oriented messaging.
- Verified on 2026-03-17 against the connected Solflare wallet `vVtq..UphL` in the existing Chrome Beta debug-profile session.
- `verified` enables evidence and challenge actions.
- `no_identity`, `identity_present_unverified`, `manual_review`, and `revoked_or_blocked` all block elevated evidence/challenge actions with explicit AadhaarChain trust-state messaging.
- FlatWatch requires the same wallet used in AadhaarChain to be connected in the already-open FlatWatch tab before the trust matrix is meaningful.

## Acceptance Standard

Do not call a repo “ready” unless all of the following are true:

- install path succeeds from a clean shell
- declared verification commands pass
- trust-consuming repos point remediation back to AadhaarChain
- browser validation uses the real Chrome Beta debug-profile session for auth/wallet flows
- raw identity payloads are not exposed outside `aadhaar-chain`
