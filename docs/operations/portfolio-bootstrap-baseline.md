# Portfolio Bootstrap Baseline

Status: active

Owner: workspace governance

Use this document as the canonical local bootstrap baseline for the full portfolio workspace.

Companion docs:

- `docs/reference/MISSION.md`
- `docs/reference/TRUST-CONSUMER-CONTRACT.md`
- `docs/workflow/browser-testing-control-plane.md`

## Decision

- use one deterministic workspace bootstrap path for the full local portfolio instead of starting each repo ad hoc
- treat the commands in this doc as the verified local operating baseline for this workspace
- use the existing Chrome Beta debug session on `127.0.0.1:9222` for browser validation that depends on real wallet or login state

## Purpose

Define one deterministic local bootstrap and verification path for each portfolio repo.

This doc is operational, not aspirational. It records the commands that were verified in this workspace on 2026-03-17.

## Shared Rules

- `aadhaar-chain` is the only trust producer.
- `ondc-buyer`, `ondc-seller`, and `flatwatch` consume trust through the shared trust contract.
- Browser validation for auth or wallet flows must use the existing Chrome Beta debug session on `127.0.0.1:9222` with `~/.codex/chrome-beta-debug-profile`.
- If the required logged-in tab is missing, stop and ask the user to open the app and log in before testing.

## Path Variables

Set these variables once per shell before running the commands in this document:

```bash
export WORKSPACE_ROOT="/absolute/path/to/CodexWorkspace"
export DRAMS_ROOT="/absolute/path/to/drams-design"
export PYTHON_BIN="${PYTHON_BIN:-python3}"
```

- `WORKSPACE_ROOT` must point to this workspace root.
- `DRAMS_ROOT` is required only for repos that depend on the local DRAMS package.
- `PYTHON_BIN` should resolve to a Python 3.12-compatible interpreter when running AadhaarChain gateway checks.

## Workspace Startup

Use the workspace scripts when you want the full local stack instead of starting each repo by hand:

```bash
cd "$WORKSPACE_ROOT"
./scripts/portfolio/start-dev.sh
```

To stop the full stack:

```bash
cd "$WORKSPACE_ROOT"
./scripts/portfolio/stop-dev.sh
```

To seed the current wallet into a deterministic trust state for browser validation:

```bash
cd "$WORKSPACE_ROOT"
./scripts/portfolio/seed-trust-fixture.sh <wallet-address> verified
```

For FlatWatch browser validation, connect the same Solflare wallet used in AadhaarChain inside the already-open logged-in FlatWatch tab before testing trust-gated evidence or challenge flows.

To run the full live trust-state matrix against the existing buyer, seller, and FlatWatch tabs:

```bash
cd "$WORKSPACE_ROOT"
./scripts/portfolio/verify-trust-matrix.py
```

The matrix harness reuses the existing Chrome Beta debug-profile session on `127.0.0.1:9222`, seeds AadhaarChain trust fixtures for the connected wallet, validates buyer/seller/FlatWatch behavior, and resets the fixture back to `no_identity` by default when it exits.

To run the full acceptance gate for the portfolio:

```bash
cd "$WORKSPACE_ROOT"
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

Use this dedicated high port range to avoid collisions with generic local apps that default to `3000` or `8000`:

- `aadhaar-chain` frontend: `43100`
- `aadhaar-chain` gateway: `43101`
- `ondc-buyer` frontend: `43102`
- `ondc-seller` frontend: `43103`
- `flatwatch` backend: `43104`
- `flatwatch` frontend: `43105`

## `aadhaar-chain`

Role: trust producer

### Verified install and checks

Frontend:

```bash
cd "$WORKSPACE_ROOT/aadhaar-chain/frontend"
npm install
npm run lint
npm run build
```

Gateway tests:

```bash
cd "$WORKSPACE_ROOT/aadhaar-chain/gateway"
PYTHONPATH="$PWD/venv/lib/python3.12/site-packages${PYTHONPATH:+:$PYTHONPATH}" \
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 \
"$PYTHON_BIN" -m pytest tests/test_routes.py -q
```

Gateway start and health:

```bash
cd "$WORKSPACE_ROOT/aadhaar-chain"
./scripts/start-gateway.sh
curl http://127.0.0.1:43101/health
```

### Runtime notes

- Frontend serves on `http://127.0.0.1:43100`.
- Gateway serves on `http://127.0.0.1:43101`.
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

- Local DRAMS package must exist at `$DRAMS_ROOT`.
- The buyer app expects a commerce backend on `http://localhost:3001` unless `VITE_API_BASE_URL` overrides it.

### Required env vars

- `VITE_API_BASE_URL`
- `VITE_IDENTITY_URL`
- `VITE_IDENTITY_WEB_URL`
- `VITE_TRUST_API_URL`

### Verified install and checks

```bash
cd "$WORKSPACE_ROOT/ondc-buyer"
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

### Dev start

```bash
cd "$WORKSPACE_ROOT/ondc-buyer"
npm run dev
```

Expected local frontend: `http://127.0.0.1:43102`

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

- Local DRAMS package must exist at `$DRAMS_ROOT`.
- The seller app expects a seller backend on `http://localhost:3001` unless `VITE_API_BASE_URL` overrides it.

### Required env vars

- `VITE_API_BASE_URL`
- `VITE_IDENTITY_URL`
- `VITE_IDENTITY_WEB_URL`
- `VITE_TRUST_API_URL`

### Verified install and checks

```bash
cd "$WORKSPACE_ROOT/ondc-seller"
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

### Dev start

```bash
cd "$WORKSPACE_ROOT/ondc-seller"
npm run dev
```

Expected local frontend: `http://127.0.0.1:43103`

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
cd "$WORKSPACE_ROOT/flatwatch/backend"
python3 -m pip install -r requirements-dev.txt
python3 -m pytest -q
```

### Verified frontend install and checks

```bash
cd "$WORKSPACE_ROOT/flatwatch/frontend"
npm install
npm run test -- --runInBand
npm run lint
npm run build
```

### Recommended dev start

Backend:

```bash
cd "$WORKSPACE_ROOT/flatwatch/backend"
uvicorn app.main:app --reload --port 8001
```

Frontend:

```bash
cd "$WORKSPACE_ROOT/flatwatch/frontend"
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
