# Progress

Status: active

Owner: workspace planning

Last updated: 2026-05-11

## Goal Reference

This checklist tracks the remaining work required to achieve `GOAL.md`.

Goal summary: AadhaarChain produces privacy-preserving wallet-bound trust state, and `ondc-buyer`, `ondc-seller`, `flatwatch`, and the agent control plane consume that state safely for higher-trust workflows.

Detailed app targets:

- `aadhaar-chain-GOAL.md`
- `aadhar-solana-GOAL.md`
- `ondc-buyer-GOAL.md`
- `ondc-seller-GOAL.md`
- `flatwatch-GOAL.md`

## Status Legend

- `[x]` Complete with current evidence.
- `[~]` Partially complete or POC-grade.
- `[ ]` Not complete.
- `[!]` Blocked or high-risk.

## Current Workspace State

- Root workspace branch: `codex/workspace-port-alignment-20260411`
- The tracked root worktree already has existing modified and untracked files unrelated to these three planning files.
- `aadhar-solana` has been cloned at `aadhar-solana/` and is clean on `main`.

## Local Services

Observed local portfolio service targets:

- AadhaarChain frontend: `http://127.0.0.1:43100`
- AadhaarChain gateway: `http://127.0.0.1:43101`
- ONDC Buyer: `http://127.0.0.1:43102`
- ONDC Seller: `http://127.0.0.1:43103`
- FlatWatch backend: `http://127.0.0.1:43104`
- FlatWatch frontend: `http://127.0.0.1:43105`
- Agent control plane: `http://127.0.0.1:8100`

## Verified So Far

- AadhaarChain gateway health responds at `/api/health`.
- FlatWatch backend health responds at `/api/health`.
- Buyer, seller, AadhaarChain frontend, and FlatWatch frontend respond over HTTP when their dev servers are running.
- Agent control plane health responds at `/api/health`.
- The shared control plane correctly downgrades a wallet to read-only when the current AadhaarChain gateway reports no identity.
- `python3 scripts/portfolio/check-trust-consumer-contract.py` passes and verifies all five documented trust states against the live FastAPI test client.
- `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 /Users/gurusharan/.pyenv/versions/3.12.0/bin/python3 -m pytest tests/test_routes.py -q` passes in `aadhaar-chain/gateway` with 8 tests.
- `python3 scripts/portfolio/check-auth-composition.py` passes.
- `scripts/portfolio/acceptance-gate.sh --deterministic-only` passes end to end across AadhaarChain gateway, the trust contract check, buyer, seller, FlatWatch backend, and FlatWatch frontend.

## Key Findings

- The portfolio goal is coherent: AadhaarChain produces trust state; buyer, seller, and FlatWatch consume it.
- The current FastAPI AadhaarChain gateway is the running trust producer.
- The cloned `aadhar-solana` repo is a larger backend candidate with Anchor programs, NestJS API, Prisma/Postgres, Redis, web, and mobile packages.
- `aadhar-solana` is not yet a running local backend in this workspace.
- Current deployed shared-auth behavior is still compatibility stub territory; trust state and shared auth must stay separate.

## Checklist Operating Model

Track the work as one root contract lane plus five app lanes. A checkbox should move to `[x]` only when the named app goal has direct evidence from code, deterministic tests, browser proof, or primary docs.

Proceed in this order:

1. Lock the portfolio trust contract at the root and in `aadhaar-chain`.
2. Validate `aadhar-solana` as a long-term bridge target, not as the current producer.
3. Harden each downstream app against all five trust states.
4. Move protected buyer, seller, FlatWatch, and agent actions behind server-side trust policy.
5. Run deterministic gates first, then same-wallet browser acceptance across the portfolio.

### App-Lane Checklist

#### `aadhaar-chain` — Current Trust Producer

- [x] Expose `GET /api/identity/{wallet_address}/trust` as the downstream-safe contract.
- [x] Support deterministic fixture states: `no_identity`, `identity_present_unverified`, `verified`, `manual_review`, `revoked_or_blocked`.
- [ ] Add schema/sample-response coverage for every `trust_version: v1` state.
- [ ] Replace local file or runtime trust state with production-grade persistent storage.
- [ ] Implement first-class operator review with reviewer identity, evidence access controls, decision records, and audit receipts.
- [ ] Add secure evidence storage, retention, deletion, encryption, key rotation, and evidence-access audit controls.
- [x] Keep raw Aadhaar, PAN, OCR output, document bytes, and fraud/compliance internals out of downstream responses.

#### `aadhar-solana` — Long-Term Chain Layer

- [~] Treat as the long-term Solana identity/credential layer candidate, not the active trust source.
- [ ] Decide and document the bridge role before any downstream app depends on it.
- [ ] Inventory identity registry, verification oracle, credential manager, reputation, and staking instructions.
- [ ] Define signed `aadhaar-chain` trust event schema, signer/oracle identity, replay protection, revocation mapping, and audit references.
- [ ] Install and validate prerequisites: Solana validator, PostgreSQL, Redis, Node/Yarn dependencies, Anchor build, and Anchor tests.
- [ ] Add adversarial program tests before sensitive use.
- [ ] Define upgrade authority, multisig, oracle admission, emergency pause, issuer approval, and revocation authority policy.

#### `ondc-buyer` — Buyer Trust Consumer

- [~] Show AadhaarChain trust state in the buyer experience.
- [ ] Inventory buyer actions and classify them as public, authenticated, trust-aware, or high-trust.
- [ ] Add fixture tests for all five trust states across profile, checkout, and agent surfaces.
- [ ] Enforce high-value checkout, restricted checkout, refunds, disputes, payment changes, account recovery, and agent writes server-side.
- [ ] Keep trust display informational; do not make frontend trust state the enforcement boundary.
- [ ] Move shared trust and compatibility-session helpers into a shared package once the contract stabilizes.
- [ ] Complete the end-to-end buyer journey with recoverable cart/order state and clear API error handling.

#### `ondc-seller` — Seller Trust Consumer

- [~] Show AadhaarChain trust state in seller dashboard, catalog, config, orders, and agent surfaces.
- [ ] Inventory seller routes/actions and classify required trust state per action.
- [ ] Add fixture tests for all five trust states and trust-service-unavailable behavior.
- [ ] Enforce catalog publish, price changes, order accept/reject, fulfillment changes, payout/config changes, and agent writes server-side.
- [ ] Record audit events with wallet, subject, action, trust state, timestamp, and outcome for sensitive actions.
- [ ] Finish the seller operating loop for catalog, orders, fulfillment, config, and support.
- [ ] Make seller agent writes require verified trust plus auditable approval.

#### `flatwatch` — Transparency And Audit Consumer

- [~] Consume AadhaarChain trust for elevated transparency, evidence, challenge, and agent workflows.
- [ ] Separate demo, staging, and production runtime modes.
- [ ] Block production startup with demo auth, hardcoded/default secrets, mock Razorpay, or mock OCR unless explicitly allowed.
- [ ] Replace demo bearer auth and any-password login outside demo mode.
- [ ] Migrate SQLite and local receipt uploads to production-grade database and object storage.
- [ ] Replace mock payment ingestion with signed webhook verification, idempotency, reconciliation, retry, and source references.
- [ ] Replace filename/mock OCR with real extraction, confidence, matching, mismatch, manual review, and audit trail.
- [ ] Enforce evidence/challenge/admin/agent write permissions server-side and audit every sensitive action.

#### `shared/agent-control-plane` — Capability Broker

- [~] Downgrade non-verified trust states to read-only mode.
- [ ] Grant full mode only when trust is `verified`, runtime is available, and usage policy allows it.
- [ ] Persist auditable grants and denials by app, subject, wallet, trust state, request, and timestamp.
- [ ] Add deterministic fixture tests for all five trust states across buyer, seller, and FlatWatch agent sessions.
- [ ] Keep deployed agent runtime separated from public frontends and explicit about supported auth mode.

## Goal Completion Checklist

### 1. AadhaarChain As Trust Producer

- [x] Define AadhaarChain as the portfolio trust substrate rather than an app-specific identity feature.
- [x] Keep downstream consumers on a narrow trust contract instead of raw verification evidence.
- [x] Model trust states beyond boolean verification: `no_identity`, `identity_present_unverified`, `verified`, `manual_review`, and `revoked_or_blocked`.
- [x] Expose `GET /api/identity/{wallet_address}`, `GET /api/identity/{wallet_address}/trust`, and `GET /api/identity/status/{verification_id}` from the active FastAPI gateway.
- [~] Keep agent-assisted verification provenance modeled in code.
- [ ] Lock the `/trust` OpenAPI schema as the stable downstream contract.
- [ ] Move identity, verification, consent, review, and audit records into durable production persistence.
- [ ] Add production mode that cannot approve from fallback-only verification evidence.
- [ ] Add operator review queues, reviewer identity, evidence access controls, final decisions, and appeal or correction handling.
- [ ] Add immutable audit events for identity creation, verification, consent, revocation, review, and downstream trust reads.
- [ ] Add a formal Aadhaar/PAN threat model covering retention, deletion, encryption, key rotation, access logging, and breach monitoring.

### 2. `aadhar-solana` Backend And On-Chain Layer

- [x] Clone `aadhar-solana` into the workspace.
- [x] Confirm it contains Anchor programs, NestJS API, Prisma schema, web, mobile, scripts, and tests.
- [~] Confirm local tooling exists for Anchor and Solana CLI.
- [!] Solana local validator is not currently verified on `8899`.
- [!] PostgreSQL is not currently responding on `5432`.
- [!] Redis is not currently running on `6379`.
- [!] Node/Yarn dependencies are not installed for `aadhar-solana`.
- [ ] Decide whether `aadhar-solana` is current trust producer, reference implementation, or migration target.
- [ ] Define the bridge from FastAPI AadhaarChain verification events to on-chain attestations.
- [ ] Define signer or oracle identity, attestation format, credential issuance, revocation propagation, retry semantics, and audit references.
- [ ] Add or run Solana program tests for unauthorized verification updates, issuer impersonation, credential misuse, oracle double response, fee vault handling, slashing, and upgrade authority.
- [ ] Make identity-derived credentials non-transferable by default unless a schema explicitly justifies transferability.
- [ ] Define upgrade authority and governance before any sensitive dependency on deployed programs.

### 3. ONDC Buyer

- [x] Maintain a trust-aware buyer shell with wallet connection, trust status, search, cart, checkout, orders, and agent routes.
- [x] Consume AadhaarChain trust through identity and `/trust` endpoints.
- [~] Keep frontend trust UX aligned with portfolio trust states.
- [ ] Define exactly which buyer actions require verified trust.
- [ ] Add server-side enforcement for protected buyer actions; frontend trust display must not be the enforcement boundary.
- [ ] Add integration tests for all AadhaarChain trust fixture states.
- [ ] Reconcile README/backend claims with actual package dependencies and backend availability.
- [ ] Normalize identity URL and trust URL handling across the buyer app.

### 4. ONDC Seller

- [x] Maintain a trust-aware seller shell with wallet connection, trust status, dashboard, catalog, orders, config, and agent routes.
- [x] Consume AadhaarChain trust through identity and `/trust` endpoints.
- [~] Keep frontend trust UX aligned with portfolio trust states.
- [ ] Define server-side trust policy for seller actions:
  - product draft creation
  - product publishing
  - order acceptance
  - payout or bank configuration
  - agent write actions
- [ ] Add backend trust enforcement for seller actions.
- [ ] Add action-level audit logs with wallet, identity, trust state, timestamp, and session.
- [ ] Add integration tests for all AadhaarChain trust fixture states.
- [ ] Verify actual ONDC BPP/provider integration boundaries.

### 5. FlatWatch

- [x] Maintain a full-stack transparency app with frontend, backend, database, transactions, receipts, chat, challenges, notifications, and control-plane routes.
- [x] Integrate AadhaarChain trust lookup for agent/runtime gating.
- [x] Fail closed to `no_identity` when wallet or trust service is unavailable.
- [~] Keep RBAC concepts for resident, admin, and super admin.
- [!] Demo auth remains unsafe for real users.
- [!] Hardcoded/default development secrets must not be accepted in production.
- [!] OCR remains mock/POC-grade.
- [!] Razorpay/payment ingestion remains mock/POC-grade.
- [!] Receipt upload needs production controls.
- [ ] Replace demo auth with production-safe auth.
- [ ] Fail startup in production when `SECRET_KEY` or `ENCRYPTION_KEY` is missing.
- [ ] Move from SQLite to PostgreSQL with migrations before pilot use.
- [ ] Implement real payment ingestion with webhook signature verification, idempotency, reconciliation, and immutable source payload references.
- [ ] Implement real OCR and receipt matching with extracted fields, confidence, source hash, matching rule, and reviewer outcome.
- [ ] Add upload limits, MIME allowlist, malware scanning, private object storage, signed downloads, and retention/deletion policy.
- [ ] Add audit log viewer and admin review workflows.

### 6. Shared Agent Control Plane

- [x] Run a shared agent runtime broker on `8100`.
- [x] Compute runtime mode from app, subject, runtime availability, usage, and trust state.
- [x] Downgrade a wallet to read-only when AadhaarChain reports no identity.
- [~] Track app-specific read/write capabilities.
- [ ] Ensure all agent write actions are server-side gated by verified trust.
- [ ] Add audit events for agent capability grants, denials, tool calls, and write attempts.
- [ ] Add tests for read-only versus full mode across all trust states.

### 7. Shared Trust Client And Drift Control

- [~] Buyer, seller, FlatWatch, and the control plane all consume the AadhaarChain trust surface.
- [!] Buyer and seller duplicate trust and SSO logic.
- [ ] Extract common trust client logic into a shared package after the active contract stabilizes.
- [ ] Extract or centralize shared SSO/session compatibility logic where appropriate.
- [ ] Add deterministic trust fixture tests across buyer, seller, FlatWatch, and agent-control-plane.
- [ ] Add semantic checks that prevent unsupported claims:
  - raw identity data on-chain
  - deployed shared auth before producer auth is real
  - mock OCR/payment integrations described as production-ready

### 8. Browser And Acceptance Gates

- [x] Document local service targets and browser acceptance workflow.
- [~] Confirm local services respond when started.
- [ ] Seed or recreate a local AadhaarChain trust fixture for the active wallet.
- [ ] Run the same-wallet browser acceptance flow across AadhaarChain, buyer, seller, and FlatWatch.
- [ ] Validate all trust states in browser-visible UX.
- [x] Run `scripts/portfolio/acceptance-gate.sh --deterministic-only`.
- [ ] Run the live trust matrix once browser prerequisites are valid.
- [ ] Capture every blocker as product, runtime, browser, or dependency.

## Highest-Priority Risks

- [!] P0: Aadhaar/PAN evidence handling needs production-grade privacy, storage, review, retention, deletion, encryption, key rotation, and audit controls.
- [!] P0: FlatWatch demo auth and default secrets must be removed before real users or real society data.
- [!] P0: Buyer, seller, and FlatWatch protected actions need server-side trust enforcement.
- [!] P1: FlatWatch OCR and payment ingestion are mocks and must remain labeled as such until replaced.
- [!] P1: `aadhar-solana` oracle governance and Solana program security need adversarial review.
- [!] P1: Duplicated buyer/seller trust and SSO code may drift.

## Current Blockers

- `aadhar-solana` dependencies are not installed.
- Solana local validator was not observed on `8899`.
- PostgreSQL was not responding on `5432`.
- Redis was not running on `6379`.
- The local active wallet trust state needs reseeding or recreation before a full same-wallet browser acceptance run is meaningful.

## Next Checkpoint

Resolve `aadhar-solana` ownership, seed an active local trust fixture, then run deterministic contract checks against `docs/reference/TRUST-CONSUMER-CONTRACT.md`.
