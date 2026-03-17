# Workspace Roadmap

This roadmap is for cross-repo portfolio direction, not app-local implementation detail.

## Phase 1: Governance And Trust Model

- establish workspace governance, issue routing, and memory routing
- define mission, architecture boundaries, and evidence rules
- keep MCP integrations simple and use direct Codex control-plane setup unless runtime constraints justify a local wrapper
- prevent identity/blockchain overreach early

Status: in progress

## Phase 2: Trust Substrate Hardening

Primary repo: `aadhaar-chain`

- convert identity vision into a concrete trust architecture
- separate off-chain sensitive data from on-chain trust artifacts
- define credential, consent, and revocation models
- replace placeholder verification flows with real contract boundaries

Success condition:

- `aadhaar-chain` becomes the credible substrate for the other apps instead of remaining a concept-heavy prototype

## Phase 3: Commerce Integration Discipline

Primary repos:

- `ondc-buyer`
- `ondc-seller`

Goals:

- make ONDC/UCP integration explicit and adapter-based
- align identity and wallet flows to the trust substrate
- remove mocked critical flows where trust claims depend on them
- define seller onboarding and buyer trust checkpoints clearly

Success condition:

- buyer and seller apps can demonstrate trustworthy commerce behavior using shared identity and verification capabilities

## Phase 4: Transparency Vertical Hardening

Primary repo: `flatwatch`

Goals:

- keep FlatWatch focused on transparency, challenge resolution, and auditability
- integrate trust capabilities only where they materially improve accountability
- avoid forcing commerce abstractions into FlatWatch

Success condition:

- FlatWatch stands as a serious transparency vertical, not just another frontend demo

## Phase 5: Automation Only Where Earned

- add unattended orchestration, wrapper MCP servers, or Symphony-style flows only when real operating pressure justifies them
- prefer simpler direct workflows until the manual loop becomes the bottleneck

Success condition:

- automation exists to reduce real coordination cost, not because it feels advanced

## Current Position

- governance baseline established
- Codex Linear project created for `aadhaar-chain`
- Codex Notion control plane created with agent memory, project registry, and session summaries
- Notion MCP is live in-session; `linear_codex` requires a desktop-session reload before its tools appear in-session
- next substantive architectural focus should be `aadhaar-chain`
