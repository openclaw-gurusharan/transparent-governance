# Progress

Status: active

Owner: workspace planning

Last updated: 2026-05-12

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
- `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 /Users/gurusharan/.pyenv/versions/3.12.0/bin/python3 -m pytest tests/test_agent_manager.py tests/test_routes.py -q` passes in `aadhaar-chain/gateway` with 26 tests.
- `python3 scripts/portfolio/check-auth-composition.py` passes after buyer, seller, and FlatWatch auth-composition markers; FlatWatch remains explicitly app-local auth.
- `scripts/portfolio/acceptance-gate.sh --deterministic-only` passes end to end after the AadhaarChain local audit event lane, covering AadhaarChain gateway, the trust contract check, buyer, seller, FlatWatch backend, and FlatWatch frontend.
- `scripts/portfolio/acceptance-gate.sh --deterministic-only` passes after the FlatWatch pilot-readiness lane, including FlatWatch backend 124-test coverage and frontend 41-test/lint/build coverage.
- `scripts/portfolio/acceptance-gate.sh --deterministic-only` passes after the FlatWatch SQLite startup migration fix; FlatWatch backend now has 125 tests and frontend has 41 tests/lint/build coverage.
- `scripts/portfolio/start-dev.sh` starts the local stack when run with port-binding permission; while the startup shell is active, probes to `43100`, `43101`, `43102`, `43103`, `43104`, and `43105` return successfully.
- `scripts/browser/check-cdp-endpoint.sh` and `scripts/portfolio/acceptance-gate.sh --browser-only` now fail loud when `127.0.0.1:9222` is unavailable or is not a Chrome DevTools JSON endpoint, including the listener process and Chrome Beta debug-profile recovery command.
- Browser workflow owner docs now require the Chrome plugin as the only browser-based testing lane.
- Chrome plugin bridge check succeeds again and browser-visible smoke now renders AadhaarChain, buyer, seller, and FlatWatch when the portfolio dev stack is kept alive during the test.
- A controlled Chrome check proves port `43100` is reachable when a listener exists; the latest visible `ERR_CONNECTION_REFUSED` came from stale/exited dev processes, not a port-level browser block.
- Chrome plugin same-wallet trust matrix passed for wallet `C5svcE...g92YFF` across AadhaarChain, buyer, seller, and FlatWatch for `no_identity`, `identity_present_unverified`, `verified`, `manual_review`, and `revoked_or_blocked`; the local fixture was restored to `verified` after the run.
- Deeper action-level browser journeys for checkout, catalog mutation, and FlatWatch evidence/challenge writes remain unproven.
- `docs/reference/AADHAAR-SOLANA-BRIDGE-SPEC.md` compares the current `aadhar-solana` API and chain surfaces against `TRUST-CONSUMER-CONTRACT.md` and defines the bridge event model before integration.
- `docs/reference/AADHAAR-SOLANA-BRIDGE-SPEC.md` inventories the current `aadhar-solana` Anchor instruction entrypoints for identity registry, verification oracle, credential manager, reputation engine, and staking manager.
- `yarn install --frozen-lockfile` completes in `aadhar-solana` after network access is allowed, so Node/Yarn dependencies are now installed.
- `aadhar-solana` now has adversarial Anchor test coverage for unauthorized identity verification updates, issuer impersonation during credential issuance, identity-derived credential transfer misuse, oracle double response, fee vault payment handling, and oracle slashing/deactivation.
- `aadhar-solana` credential schema creation now rejects transferable identity-derived schemas for Aadhaar, PAN, bank-account, and address-proof credentials by default.
- `git diff --check` passes in `aadhar-solana` after the adversarial test and credential policy edits.
- `yarn anchor:build` passes in `aadhar-solana` after aligning Anchor/Solana dependencies and program IDs with the local SBF toolchain.
- `yarn anchor:test` passes in `aadhar-solana` with 58 tests after adding the missing TypeScript test harness, upgradeable-loader metadata coverage, and running Anchor's local validator path with port-binding permission.
- Seller payout/config local persistence now requires `verified` trust across all five trust fixture states; `ondc-seller` `npm run test`, `npm run typecheck`, and `npm run lint` pass.
- AadhaarChain production mode downgrades deterministic fallback fraud or compliance evidence to manual review instead of approval.
- AadhaarChain appends immutable local audit events for identity creation, verification requests, verification decisions, and downstream trust reads.
- `docs/reference/PORTFOLIO-TRUST-ACTION-POLICY.md` defines buyer, seller, FlatWatch, and agent action levels for public, authenticated, trust-aware, verified, and step-up flows.
- `scripts/portfolio/verify-trust-matrix.py` is now a guardrail that refuses shell-driven browser validation and routes live trust-matrix evidence to the Chrome plugin path.
- `npm test` passes in `shared/agent-control-plane` with 30 assertions across buyer, seller, FlatWatch, all five trust states, runtime-auth blocked behavior, server-side agent write-action gating, CORS origin policy, production local-CLI blocking, buyer snapshot trust-state parsing, and capability audit event persistence.
- `npm run typecheck` passes in `shared/agent-control-plane` after the runtime-origin guard.
- `npm run test -- src/lib/trust.test.ts src/lib/agentBuyerState.test.ts` passes in `ondc-buyer` with 13 assertions covering AadhaarChain trust snapshots and buyer agent checkout gating.
- `npm run typecheck` passes in `ondc-buyer` after widening the local `TrustSurface.trust_state` type to include `no_identity`.
- `npm test` passes in `ondc-buyer` with 76 tests, including five-state buyer checkout trust fixture coverage, protected local buyer-action trust gating, header trust-state rendering coverage, and commerce demo-mode URL/fallback coverage.
- `npm run typecheck` passes in `ondc-buyer`.
- `ondc-buyer` now exposes a buyer-specific wallet proof control for `buyer_checkout_identity_proof`; `npm run typecheck` passes after wiring it to the shared AadhaarChain proof contract.
- Chrome validation in the signed wallet profile produced `Identity signed` for buyer proof with wallet `C5svcE...g92YFF`.
- Chrome validation in the signed wallet profile renders the buyer agent page at `/agent` with wallet `C5svcE...g92YFF`, runtime `local_cli`, and high-trust write access enabled; prior buyer agent messages and structured recommendations are visible.
- `npm run lint` passes in `ondc-buyer`.
- `npm test` passes in `ondc-seller` with 123 tests, including five-state seller catalog-write and order-note write trust fixture coverage, seller trust snapshot fixtures, trust-service-unavailable fail-closed hook behavior, and verified-trust gating for order accept/reject/dispatch actions.
- `npm run typecheck` passes in `ondc-seller` after widening the local `TrustSurface.trust_state` type to include `no_identity`.
- `npm run lint` passes in `ondc-seller`.
- `ondc-seller` now exposes a seller-specific wallet proof control for `seller_catalog_identity_proof`; `npm run typecheck` passes after wiring it to the shared AadhaarChain proof contract.
- Chrome validation in the signed wallet profile produced `Identity signed` for seller proof with wallet `C5svcE...g92YFF`.
- Chrome validation in the signed wallet profile renders the seller agent page at `/agent` with wallet `C5svcE...g92YFF`, runtime `local_cli`, and verified seller writes enabled.
- `ondc-seller` now has a centralized seller action policy, backend trust-policy envelope requiring server revalidation, deterministic backend enforcement contract, Vercel/Netlify `/api/*` enforcement gateways, audit context for sensitive writes, explicit approval before agent-originated seller writes execute, documented ONDC BPP/provider boundaries, and 150 passing tests across trust policy, catalog, orders, config, agent, and trust fixtures.
- `ondc-seller` `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build` pass after the seller action policy and approval-flow changes.
- `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTHONPATH=. /Users/gurusharan/.pyenv/versions/3.12.0/bin/python3 -m pytest gateway/tests -q` passes in `aadhaar-chain` with 23 tests after production-mode storage guard coverage.
- `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 /Users/gurusharan/.pyenv/versions/3.12.0/bin/python3 -m pytest gateway/tests -q` passes in `aadhaar-chain` with 31 tests after PostgreSQL trust-store support, encrypted evidence storage, review/evidence-access/revocation APIs, and verification upload rate-limit coverage.
- `python3 scripts/portfolio/check-trust-consumer-contract.py` passes after the AadhaarChain trust-surface changes and confirms the downstream contract still redacts forbidden raw evidence and PII keys.
- AadhaarChain now issues short-lived, audience-bound identity proof challenges only for verified wallet identities; `gateway/tests/test_routes.py` covers real Solana keypair signing, unverified-trust rejection, and tampered-message rejection.
- `shared/trust-client` now exposes the identity proof challenge/verification contract, including base58 encoding for wallet message signatures.
- AadhaarChain lane implementation is committed in the child repo at `2e1424e`.
- `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 /Users/gurusharan/.pyenv/versions/3.12.0/bin/python3 -m pytest tests/test_control_plane.py -q` passes in `flatwatch/backend` with eight control-plane tests, including five-state FlatWatch runtime capability fixture coverage.
- `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 /Users/gurusharan/.pyenv/versions/3.12.0/bin/python3 -m pytest -q -p pytest_asyncio.plugin --asyncio-mode=auto` passes in `flatwatch/backend` with 117 tests after production secret enforcement, demo/mock production-startup guard coverage, receipt upload limit/MIME/path controls, signed payment webhook/idempotency coverage, OCR provenance/manual-review coverage, challenge write audit coverage, and admin-only audit review API coverage.
- `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 /Users/gurusharan/.pyenv/versions/3.12.0/bin/python3 -m pytest -q -p pytest_asyncio.plugin --asyncio-mode=auto` passes in `flatwatch/backend` with 124 tests after DB-backed auth/session invalidation, PostgreSQL schema support, receipt content hashing/scanning/signed download controls, ingestion status/reconcile/retry APIs, OCR extraction audit persistence, challenge resolution reporting, and pilot onboarding/export APIs.
- `npm test -- src/lib/__tests__/trust.test.ts` passes in `flatwatch/frontend` with six assertions covering `no_identity` and the four identity-present AadhaarChain trust states.
- `npm test -- --runInBand`, `npm run lint`, and `npm run build` pass in `flatwatch/frontend` after adding the admin audit viewer and audit API client coverage.
- `npm run lint` passes in `flatwatch/frontend` after widening `TrustSurface.trust_state` to the full portfolio trust-state union.
- The latest deterministic gate run includes `flatwatch/frontend` full checks: seven Jest suites, 41 tests, ESLint, and `next build`.
- Chrome validation in the signed wallet profile renders FlatWatch's agent surface at `/chat` with wallet `C5svcE...g92YFF`, runtime `local_cli`, and verified write path enabled; `/agent` correctly is not a FlatWatch route.
- `python3 scripts/portfolio/check-portfolio-claims.py` passes with semantic scans for unsupported raw-identity-on-chain, premature deployed-shared-auth, and production-ready mock integration claims.
- `python3 scripts/portfolio/check-portfolio-claims.py` still passes after FlatWatch README labels Razorpay/MyGate and OCR as POC/mock surfaces.
- `scripts/portfolio/acceptance-gate.sh --deterministic-only` passes after the agent-control-plane runtime-origin guard update.
- `aadhar-solana` prerequisite probe: `solana --version` reports `2.1.5`, `anchor --version` reports `0.31.1`, `yarn --version` reports `1.22.22`, `node_modules` is present, `yarn anchor:build` passes, `yarn anchor:test` passes with 58 tests, PostgreSQL validates on `5432`, and Redis validates on `6379`.
- `scripts/portfolio/seed-trust-fixture.sh CSrYz3e5Jnyatgye21resjBtzRYqpoqrxtGqPXQZuCbs verified` seeds the active local wallet, and `/api/identity/CSrYz3e5Jnyatgye21resjBtzRYqpoqrxtGqPXQZuCbs/trust` confirms `trust_state=verified` with `high_trust_eligible=true`.
- `scripts/portfolio/acceptance-gate.sh --deterministic-only` passes after the seller trust fixture and trust-service-unavailable coverage.
- `scripts/portfolio/acceptance-gate.sh --deterministic-only` passes after the buyer header trust-state fixture coverage.
- `scripts/portfolio/acceptance-gate.sh --deterministic-only` passes after the buyer commerce demo-mode fallback checkpoint.

## Key Findings

- The portfolio goal is coherent: AadhaarChain produces trust state; buyer, seller, and FlatWatch consume it.
- The current FastAPI AadhaarChain gateway is the running trust producer.
- The cloned `aadhar-solana` repo is a larger backend candidate with Anchor programs, NestJS API, Prisma/Postgres, Redis, web, and mobile packages.
- `aadhar-solana` ownership is resolved as the long-term Solana identity, credential, revocation, and reputation layer behind AadhaarChain trust decisions, not the current downstream trust producer.
- `aadhar-solana` is not yet a persistently running local backend in this workspace, but PostgreSQL and Redis are installed, startable, and validated on their default local ports.
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
- [x] Add schema/sample-response coverage for every `trust_version: v1` state.
- [x] Replace local file or runtime trust state with production-grade persistent storage.
  - [x] Production startup is blocked when the gateway would use the local JSON trust store.
  - [x] PostgreSQL-backed identity, verification, consent, review, decision, audit, revocation, attestation, evidence-reference, and agent/tool provenance persistence is implemented.
- [x] Implement first-class operator review with reviewer identity, evidence access controls, decision records, and audit receipts.
- [x] Add secure evidence storage, retention, deletion, encryption, key rotation, and evidence-access audit controls.
- [x] Keep raw Aadhaar, PAN, OCR output, document bytes, and fraud/compliance internals out of downstream responses.

#### `aadhar-solana` — Long-Term Chain Layer

- [x] Treat as the long-term Solana identity/credential layer candidate, not the active trust source.
- [x] Decide and document the bridge role before any downstream app depends on it.
- [x] Inventory identity registry, verification oracle, credential manager, reputation, and staking instructions.
- [x] Define signed `aadhaar-chain` trust event schema, signer/oracle identity, replay protection, revocation mapping, and audit references.
- [x] Install and validate prerequisites: Solana validator, PostgreSQL, Redis, Node/Yarn dependencies, Anchor build, and Anchor tests.
  - [x] Node/Yarn dependencies are installed with `yarn install --frozen-lockfile`.
  - [x] Anchor build passes with the installed Solana `build-sbf` toolchain.
  - [x] Anchor tests pass with 58 validator-backed tests.
  - [x] PostgreSQL accepts local connections on `5432` and returns `select 1 as ok`.
  - [x] Redis accepts local connections on `6379` and returns `PONG`.
- [x] Add adversarial program tests before sensitive use.
  - [x] Added tests for unauthorized verification updates, issuer impersonation, credential transfer misuse, oracle double response, fee vault handling, and slashing/deactivation.
  - [x] Added upgradeable-loader metadata coverage for every deployed program.
  - [x] Anchor test execution is green with 58 passing tests.
- [x] Define upgrade authority, multisig, oracle admission, emergency pause, issuer approval, and revocation authority policy.

#### `ondc-buyer` — Buyer Trust Consumer

- [x] Show AadhaarChain trust state in the buyer experience.
  - [x] Trust status components render labels and buyer-action explanations for all five portfolio trust states.
- [x] Inventory buyer actions and classify them as public, authenticated, trust-aware, or high-trust.
- [x] Add fixture tests for all five trust states across profile, checkout, and agent surfaces.
  - [x] Trust snapshot mapping covers missing identity plus the identity-present fixture states.
  - [x] Agent checkout routing is gated across all five trust states.
  - [x] Profile/header trust-state rendering has fixture coverage.
- [x] Enforce high-value checkout, restricted checkout, refunds, disputes, payment changes, account recovery, and agent writes server-side.
  - [x] Buyer local checkout, cancellation/refund, and support/dispute mutation helpers require verified trust across all five fixture states.
  - [x] Live buyer checkout, cancellation/refund, support/dispute, and agent-write request paths now attach a backend trust-policy envelope requiring server trust revalidation for protected actions.
  - [x] Netlify-hosted checkout, cancellation/refund, support/dispute, and agent-write API routes now revalidate AadhaarChain trust server-side before proxying protected writes.
  - [x] Netlify-hosted payment-method and account-recovery API namespaces fail closed behind the same server-side trust revalidation guard before proxying.
- [x] Keep trust display informational; do not make frontend trust state the enforcement boundary.
  - [x] Buyer local quote/order fallback is demo-only; protected production checkout still requires commerce backend policy.
- [x] Move shared trust and compatibility-session helpers into a shared package once the contract stabilizes.
  - [x] Buyer and seller trust clients now consume `shared/trust-client` for trust types, trust fetch logic, compatibility-session types, and buyer trust-state UI metadata.
- [~] Complete the end-to-end buyer journey with recoverable cart/order state and clear API error handling.
  - [x] Live checkout failures fall back to local quotes only when commerce demo mode is active.
  - [x] Live cart API failures now surface explicit cart errors instead of silently falling back to local cart state outside commerce demo mode.
  - [x] Live order list and order detail routes now recover order state from the commerce API outside demo mode, with explicit loading and error states.
  - [x] Buyer payment selection is carried into live checkout requests and persisted on local demo orders.
  - [x] Billing profile save failures now render inline before checkout proceeds.
  - [x] Deterministic buyer journey contract covers search, results, detail, cart, checkout, payment, confirmation, tracking, support, and agent routes.
  - [!] `npm run verify:staging-journey` currently fails because `https://buyer-app-preprod-v2.ondc.org/api/{search,cart,orders}` returns `200 text/html` instead of JSON commerce API responses.

#### `ondc-seller` — Seller Trust Consumer

- [x] Show AadhaarChain trust state in seller dashboard, catalog, config, orders, and agent surfaces.
  - [x] Seller orders list shows AadhaarChain trust state and disables inline accept/reject shortcuts unless verified trust is available.
- [x] Inventory seller routes/actions and classify required trust state per action.
- [x] Add fixture tests for all five trust states and trust-service-unavailable behavior.
- [x] Enforce catalog publish, price changes, order accept/reject, fulfillment changes, payout/config changes, and agent writes server-side.
  - [x] Seller order accept/reject/dispatch UI mutation paths require verified trust before demo or live API mutation.
  - [x] Seller payout/config local mutation paths require verified trust before local persistence or generated key mutation.
  - [x] Seller catalog, order, config, and agent write paths share one action policy and attach a backend trust-policy envelope requiring server trust revalidation for protected actions.
  - [x] Seller backend enforcement contract fails closed unless session, wallet, trust state, action policy, and audit subject all match.
  - [x] Vercel and Netlify `/api/*` gateways validate session, wallet, AadhaarChain trust state, policy, and audit subject before proxying protected seller mutations.
- [x] Record audit events with wallet, subject, action, trust state, timestamp, and outcome for sensitive actions.
- [x] Finish the seller operating loop for catalog, orders, fulfillment, config, and support.
- [x] Make seller agent writes require verified trust plus auditable approval.
  - [x] Seller agent catalog patches and order follow-up notes require verified trust and record applied or blocked audit events.
  - [x] Add explicit approval flow before agent-originated seller writes execute.

#### `flatwatch` — Transparency And Audit Consumer

- [~] Consume AadhaarChain trust for elevated transparency, evidence, challenge, and agent workflows.
- [x] Separate demo, staging, and production runtime modes.
- [x] Block production startup with demo auth, hardcoded/default secrets, mock Razorpay, or mock OCR unless explicitly allowed.
- [ ] Replace demo bearer auth and any-password login outside demo mode.
- [ ] Migrate SQLite and local receipt uploads to production-grade database and object storage.
- [~] Replace mock payment ingestion with signed webhook verification, idempotency, reconciliation, retry, and source references.
  - [x] Signed Razorpay-style webhook path verifies HMAC signatures, requires idempotency keys, and stores immutable raw source payload references.
  - [ ] Real provider integration, reconciliation jobs, duplicate matching beyond idempotency key, retry, and sync status tracking remain open.
- [~] Replace filename/mock OCR with real extraction, confidence, matching, mismatch, manual review, and audit trail.
  - [x] Mock OCR responses include extraction method, source hash, match score, and manual-review requirement so fallback evidence cannot look production-grade.
  - [ ] Real OCR integration, extracted-field confidence by field, reviewer outcome, and durable extraction audit trail remain open.
- [~] Enforce evidence/challenge/admin/agent write permissions server-side and audit every sensitive action.
  - [x] Challenge create, resolve, and reject write audit entries with action, actor, target, and details.
  - [ ] Evidence/admin/agent write permission and audit coverage remains open.

#### `shared/agent-control-plane` — Capability Broker

- [x] Downgrade non-verified trust states to read-only mode.
- [x] Grant full mode only when trust is `verified`, runtime is available, and usage policy allows it.
- [x] Persist auditable grants and denials by app, subject, wallet, trust state, request, and timestamp.
- [x] Add deterministic fixture tests for all five trust states across buyer, seller, and FlatWatch agent sessions.
- [x] Keep deployed agent runtime separated from public frontends and explicit about supported auth mode.

## Goal Completion Checklist

### 1. AadhaarChain As Trust Producer

- [x] Define AadhaarChain as the portfolio trust substrate rather than an app-specific identity feature.
- [x] Keep downstream consumers on a narrow trust contract instead of raw verification evidence.
- [x] Model trust states beyond boolean verification: `no_identity`, `identity_present_unverified`, `verified`, `manual_review`, and `revoked_or_blocked`.
- [x] Expose `GET /api/identity/{wallet_address}`, `GET /api/identity/{wallet_address}/trust`, and `GET /api/identity/status/{verification_id}` from the active FastAPI gateway.
- [x] Keep agent-assisted verification provenance modeled in code.
- [x] Lock the `/trust` OpenAPI schema as the stable downstream contract.
- [x] Move identity, verification, consent, review, and audit records into durable production persistence.
  - [x] Production mode cannot start on the local JSON trust store.
  - [x] Durable PostgreSQL persistence is implemented for identity anchors, verification workflows, evidence references, consent, review, decision, revocation, attestation, audit receipts, and agent/tool provenance records.
- [x] Add production mode that cannot approve from fallback-only verification evidence.
- [x] Add operator review queues, reviewer identity, evidence access controls, final decisions, and appeal or correction handling.
- [x] Add immutable audit events for identity creation, verification, consent, revocation, review, and downstream trust reads.
  - [x] Local append-only audit events cover identity creation, verification requests, verification decisions, and downstream trust reads.
  - [x] Consent, revocation, review queue decisions, evidence access, encrypted evidence storage, and production PostgreSQL audit storage are covered in code.
- [x] Add a formal Aadhaar/PAN threat model covering retention, deletion, encryption, key rotation, access logging, and breach monitoring.

### 2. `aadhar-solana` Backend And On-Chain Layer

- [x] Clone `aadhar-solana` into the workspace.
- [x] Confirm it contains Anchor programs, NestJS API, Prisma schema, web, mobile, scripts, and tests.
- [x] Confirm local tooling exists for Anchor, Solana CLI, Node, Yarn, `psql`, and `redis-cli`.
- [x] `Anchor.toml` now pins Anchor `0.31.1`, matching the installed `anchor-cli`, Solana `build-sbf` toolchain, program crates, API SDK, and README prerequisite.
- [x] Solana local validator path is verified through `yarn anchor:test`.
- [x] PostgreSQL is validated on `5432`.
- [x] Redis is validated on `6379`.
- [x] Node/Yarn dependencies are installed for `aadhar-solana`.
- [x] Decide whether `aadhar-solana` is current trust producer, reference implementation, or migration target.
- [x] Define the bridge from FastAPI AadhaarChain verification events to on-chain attestations.
- [x] Define signer or oracle identity, attestation format, credential issuance, revocation propagation, retry semantics, and audit references.
- [x] Add or run Solana program tests for unauthorized verification updates, issuer impersonation, credential misuse, oracle double response, fee vault handling, slashing, and upgrade authority.
  - [x] Added adversarial tests for unauthorized verification updates, issuer impersonation, credential transfer misuse, oracle double response, fee vault handling, and slashing/deactivation.
  - [x] Added upgradeable-loader metadata coverage for every deployed program.
  - [x] Anchor test execution passes with 58 tests.
- [x] Make identity-derived credentials non-transferable by default unless a schema explicitly justifies transferability.
- [x] Define upgrade authority and governance before any sensitive dependency on deployed programs.

### 3. ONDC Buyer

- [x] Maintain a trust-aware buyer shell with wallet connection, trust status, search, cart, checkout, orders, and agent routes.
- [x] Consume AadhaarChain trust through identity and `/trust` endpoints.
- [~] Keep frontend trust UX aligned with portfolio trust states.
- [x] Define exactly which buyer actions require verified trust.
- [ ] Add server-side enforcement for protected buyer actions; frontend trust display must not be the enforcement boundary.
- [x] Add integration tests for all AadhaarChain trust fixture states.
- [x] Reconcile README/backend claims with actual package dependencies and backend availability.
- [x] Normalize identity URL and trust URL handling across the buyer app.

### 4. ONDC Seller

- [x] Maintain a trust-aware seller shell with wallet connection, trust status, dashboard, catalog, orders, config, and agent routes.
- [x] Consume AadhaarChain trust through identity and `/trust` endpoints.
- [x] Keep frontend trust UX aligned with portfolio trust states.
  - [x] Dashboard, catalog, config, order list/detail, and agent surfaces all render AadhaarChain trust state before elevated seller actions.
- [x] Define server-side trust policy for seller actions:
  - product draft creation
  - product publishing
  - order acceptance
  - payout or bank configuration
  - agent write actions
- [x] Add backend trust enforcement for seller actions.
  - [x] Centralized seller action policy covers catalog, order, config, and agent writes.
  - [x] Sensitive commerce API calls include a typed backend trust-policy envelope, trust/wallet/subject/session/audit headers, and local/demo audit outcomes.
  - [x] Deterministic backend enforcement contract validates session, wallet identity, AadhaarChain trust state, action policy, and audit target before protected mutations.
  - [x] Vercel and Netlify seller API gateways independently validate session, wallet identity, AadhaarChain trust state, policy, and audit target server-side before proxying protected mutations.
- [x] Add action-level audit logs with wallet, identity, trust state, timestamp, and session.
- [x] Add integration tests for all AadhaarChain trust fixture states.
- [x] Verify actual ONDC BPP/provider integration boundaries.
  - [x] `ondc-seller/README.md` documents that this repo is the seller portal and local demo fallback, while production BPP/provider catalog, order, fulfillment, and config writes belong behind `VITE_API_BASE_URL`.

### 5. FlatWatch

- [x] Maintain a full-stack transparency app with frontend, backend, database, transactions, receipts, chat, challenges, notifications, and control-plane routes.
- [x] Integrate AadhaarChain trust lookup for agent/runtime gating.
- [x] Fail closed to `no_identity` when wallet or trust service is unavailable.
- [x] Cover frontend trust snapshot behavior with deterministic AadhaarChain trust-state fixtures.
- [x] Keep RBAC concepts for resident, admin, and super admin.
- [x] Keep demo auth isolated from production-safe auth.
- [x] Hardcoded/default development secrets are not accepted in production.
- [x] OCR remains labeled mock/POC-grade until replaced.
- [x] Razorpay/payment ingestion remains labeled mock/POC-grade until replaced.
- [x] Receipt upload needs production controls.
  - [x] Backend receipt uploads enforce size limits, MIME/extension allowlist, path traversal rejection, and no local path leakage in API responses.
  - [x] Malware scanning, private receipt metadata storage, signed downloads, retention metadata, and access audit events are implemented.
- [x] Replace demo auth with production-safe auth.
- [x] Fail startup in production when `SECRET_KEY` or `ENCRYPTION_KEY` is missing.
- [x] Move from SQLite to PostgreSQL with migrations before pilot use.
- [x] Implement real payment ingestion with webhook signature verification, idempotency, reconciliation, and immutable source payload references.
  - [x] Webhook signature verification, idempotency, and raw source payload reference storage are implemented.
  - [x] Ingestion status, reconciliation, retry tracking, and admin visibility are implemented; demo `/sync` remains local-only.
- [x] Implement real OCR and receipt matching with extracted fields, confidence, source hash, matching rule, and reviewer outcome.
  - [x] Mock OCR now emits source hash, extraction method, match score, and manual-review requirement.
  - [x] Configurable OCR provider integration, field confidence, matching rule persistence, manual-review flagging, reviewer outcome storage, and durable extraction audit trail are implemented.
- [x] Add upload limits, MIME allowlist, malware scanning, private object storage, signed downloads, and retention/deletion policy.
  - [x] Upload limits and MIME/extension allowlist are enforced in the backend.
  - [x] Malware scanning, private receipt records, signed download URLs, content hashes, retention metadata, and access audit events are implemented.
- [x] Add audit log viewer and admin review workflows.
  - [x] Admin-only audit log and stats APIs are covered by route tests, including resident denial and invalid action filters.
  - [x] Frontend audit viewer, pilot onboarding, resident import, challenge resolution reporting, and audit export are implemented.

### 6. Shared Agent Control Plane

- [x] Run a shared agent runtime broker on `8100`.
- [x] Compute runtime mode from app, subject, runtime availability, usage, and trust state.
- [x] Downgrade a wallet to read-only when AadhaarChain reports no identity.
- [~] Track app-specific read/write capabilities.
- [x] Ensure all agent write actions are server-side gated by verified trust.
- [x] Add audit events for agent capability grants, denials, tool calls, and write attempts.
- [x] Add tests for read-only versus full mode across all trust states.

### 7. Shared Trust Client And Drift Control

- [x] Buyer, seller, FlatWatch, and the control plane all consume the AadhaarChain trust surface.
- [~] Buyer and seller duplicate trust and SSO logic.
- [x] Extract common trust client logic into a shared package after the active contract stabilizes.
  - [x] `shared/trust-client` owns trust surface types, trust snapshot fetching, trust-state metadata, and shared identity-session result types used by buyer and seller.
- [~] Extract or centralize shared SSO/session compatibility logic where appropriate.
  - [x] Buyer and seller import shared identity-session result types from `@portfolio/trust-client`.
  - [ ] Buyer and seller still duplicate the axios identity-session compatibility client functions and interceptors.
- [x] Add deterministic trust fixture tests across buyer, seller, FlatWatch, and agent-control-plane.
  - [x] Agent-control-plane read-only/full capability matrix covers all five trust states.
  - [x] Buyer trust fixture tests.
  - [x] Seller trust fixture tests.
  - [x] FlatWatch trust fixture tests.
- [x] Add semantic checks that prevent unsupported claims:
  - raw identity data on-chain
  - deployed shared auth before producer auth is real
  - mock OCR/payment integrations described as production-ready

### 8. Browser And Acceptance Gates

- [x] Document local service targets and browser acceptance workflow.
- [x] Confirm local services respond when started.
- [x] Seed or recreate a local AadhaarChain trust fixture for the active wallet.
- [~] Run the same-wallet browser acceptance flow across AadhaarChain, buyer, seller, and FlatWatch.
  - [x] Same connected wallet `C5svcE...g92YFF` is visible across the four app tabs.
  - [x] Same-wallet trust-state propagation was validated in Chrome for the five documented states.
  - [~] Action-level journeys for checkout, catalog/config writes, and FlatWatch evidence/challenge writes remain open.
    - [x] Seller verified-trust catalog write succeeded in Chrome by adding `Codex Smoke Product` through the catalog form.
    - [x] FlatWatch verified-trust challenge form opens in Chrome and exposes an enabled trust context; submit remains disabled until a transaction and reason are selected.
    - [ ] Buyer checkout form entry was blocked by Chrome plugin input-control detach/fill issues after verified-state checkout controls rendered.
    - [ ] FlatWatch receipt upload was blocked by Chrome plugin file chooser timeout on the hidden file input.
    - [ ] Seller config action was blocked by Chrome reporting another extension UI open on the page.
  - [x] Signed Solana transaction journey is reachable and browser-validated from AadhaarChain.
    - [x] Earlier code search found no `signTransaction`, `sendTransaction`, or `signMessage` usage in the active AadhaarChain, buyer, seller, or FlatWatch frontends; AadhaarChain, buyer, and seller now intentionally expose signing checkpoints for transaction or identity proof validation.
    - [x] `aadhar-solana` has Anchor transaction coverage in tests, but `PLAN.md` still treats it as a bridge/migration target rather than the active browser trust producer.
    - [x] AadhaarChain dashboard now exposes a transaction signing checkpoint that asks the connected wallet to sign a 0-lamport devnet self-transfer and does not submit it.
    - [x] Chrome validation produced `Transaction signed` for wallet `C5svcE...g92YFF` with a local transaction signature prefix.
  - [~] Purpose-bound identity proof signing is implemented and unit/type checked; Chrome wallet approval for buyer and seller proof signing is still pending.
    - [x] AadhaarChain gateway issues five-minute proof challenges only when the wallet trust state is `verified`.
    - [x] AadhaarChain gateway verifies the wallet signature against the exact issued message, wallet, audience, and expiry.
    - [x] Buyer app exposes a `buyer_checkout_identity_proof` signing control.
    - [x] Seller app exposes a `seller_catalog_identity_proof` signing control.
    - [x] Chrome wallet signing validation approved buyer and seller proof signatures through the connected signed wallet profile.
- [x] Validate all trust states in browser-visible UX.
- [x] Run `scripts/portfolio/acceptance-gate.sh --deterministic-only`.
- [x] Run the live trust matrix through the Chrome plugin once browser prerequisites are valid.
- [x] Capture every blocker as product, runtime, browser, or dependency.
  - [x] FlatWatch backend startup was blocked by an older local SQLite schema missing `users.password_hash`; fixed with idempotent SQLite migrations.
  - [x] Earlier Chrome/plugin/browser-use failures were separated from app health: `ERR_BLOCKED_BY_CLIENT` appeared while the browser path was unstable, and the later visible `ERR_CONNECTION_REFUSED` was caused by exited local dev listeners.

## Highest-Priority Risks

- [!] P1: Aadhaar/PAN evidence handling now has encrypted local storage, production key requirements, review/evidence-access audit controls, rate limits, and a formal threat model; deployed production still needs managed object storage, migration wiring, KMS rotation tests, and audit-stream monitoring.
- [!] P1: FlatWatch now has production-safe auth, PostgreSQL schema support, file controls, audit viewer, pilot onboarding/export, signed ingestion, and OCR provider hooks; deployed pilot still needs live provider credentials and managed storage/backup wiring.
- [!] P0: Buyer, seller, and FlatWatch protected actions need server-side trust enforcement.
- [~] P1: `aadhar-solana` now has validator-backed adversarial coverage; independent audit and mainnet governance dry-run remain prudent before production reliance.
- [!] P1: Duplicated buyer/seller trust and SSO code may drift.

## Current Blockers

- Chrome browser smoke is no longer blocked when the portfolio stack is kept alive: AadhaarChain, buyer, seller, and FlatWatch render through the Chrome plugin on ports `43100`, `43102`, `43103`, and `43105`.
- Same-wallet trust-state browser acceptance has been executed through Chrome for all five trust states; action-level browser journeys are still open.
- Action-level browser pass now has partial evidence: seller catalog add works under verified trust; FlatWatch challenge form opens under verified trust; buyer checkout, FlatWatch receipt upload, and seller config need a cleaner Chrome interaction path.
- Signed wallet transaction testing is no longer blocked for AadhaarChain: the dashboard signing checkpoint was approved in Chrome and returned a local transaction signature without submitting the transaction.
- Identity proof signing is implemented and Chrome-validated for the buyer and seller use case with app-specific signed proof controls.
- Agent-page browser validation now covers buyer `/agent`, seller `/agent`, and FlatWatch `/chat`; Chrome text-entry submission for new seller/FlatWatch prompts is still blocked by the Chrome plugin textarea/clipboard path.
- ONDC Buyer staging journey proof is blocked because `npm run verify:staging-journey` reaches the configured preprod origin, but search, cart, and orders API paths return `200 text/html` instead of JSON commerce API responses.

## Next Checkpoint

Rerun the remaining action-level browser journeys with the portfolio dev stack held open for the full Chrome session, starting with buyer and seller identity proof signing because that is now the canonical step-up flow for proving owner-controlled identity across apps.
