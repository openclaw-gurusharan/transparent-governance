# Aadhaar Chain Trust Architecture Brief

Status: proposed

Owner: workspace governance

Primary repo: `aadhaar-chain`

Related issue: `CODEX-10`

Confidence: high on repo-state observations, medium on downstream adoption sequencing

## Problem

`aadhaar-chain` is currently trying to carry too many claims at once:

- identity tokenization
- government credential pull
- selective disclosure
- Solana-backed self-sovereign identity
- future asset tokenization

That framing is architecturally weak because the current implementation does not yet justify those claims. The repo today is closer to a wallet-bound identity anchor plus simulated verification flows than to a credible credential and consent substrate.

## Repo-State Evidence

The current repo state does not support strong trust claims yet:

- the gateway still describes itself as an identity and asset tokenization platform
- startup initialization for the real agent and MCP verification path is still TODO-driven
- the identity route constructs `IdentityData` with `wallet_address`, but the model expects `owner` and `commitment`
- frontend Aadhaar verification still simulates OTP and processing progress locally
- agent responses still contain placeholder extraction and decision content

This means the right next move is not more product language. The right next move is to harden the trust boundary.

## Decision

Treat `aadhaar-chain` as the portfolio trust substrate, not as a raw identity-tokenization platform.

Its core responsibility should be:

- wallet-bound identity anchors
- credential verification state
- consent grants
- revocation status
- audit receipts
- selective disclosure interfaces

It should explicitly not claim that raw Aadhaar or comparable PII is stored on-chain.

## Architecture Boundary

### On-Chain

Only store artifacts that benefit from integrity, timestamping, revocation visibility, or public verifiability:

- identity anchor commitment
- subject DID or stable subject identifier reference
- issuer attestation references
- consent receipt hashes
- revocation markers
- audit receipt hashes

### Off-Chain

Keep all sensitive and operationally large material off-chain:

- raw documents
- raw government responses
- extracted fields
- OCR output
- encrypted credential payloads
- service-specific disclosure packages
- policy evaluation context

## Recommended Core Objects

### Identity Anchor

Minimal wallet-bound anchor for a subject:

- `did`
- `owner_wallet`
- `commitment`
- `status`
- `created_at`
- `updated_at`

This is the only durable subject anchor the chain needs at the start.

### Verification Record

Off-chain record describing what was verified and by whom:

- `verification_id`
- `subject_did`
- `credential_type`
- `issuer`
- `claim_commitment`
- `evidence_ref`
- `issued_at`
- `expires_at`
- `revocation_ref`
- `status`

### Consent Grant

Explicit grant for claim use:

- `grant_id`
- `subject_did`
- `requester_id`
- `purpose`
- `requested_claims`
- `expires_at`
- `revocable`
- `receipt_hash`

### Audit Event

Immutable or append-only receipt for access and verification actions:

- `event_id`
- `subject_did`
- `actor_id`
- `action`
- `target`
- `consent_grant_id`
- `receipt_hash`
- `timestamp`

## What Should Change Immediately

### 1. Reframe the product language

Stop describing the platform as storing verified identity tokens on-chain. The stronger and more defensible framing is:

- off-chain encrypted credential custody
- on-chain commitments and revocation/audit receipts
- selective disclosure and verifiable access control

### 2. Fix the identity model contract

The current API contract is internally inconsistent. `IdentityData` expects `owner` and `commitment`, but the route creates records with `wallet_address` and no commitment. The identity model must be corrected before downstream apps integrate against it.

### 3. Replace simulated verification with explicit states

The current frontend verification journey is a demo flow. It should become an explicit state machine:

- intake received
- user consent recorded
- document or API evidence captured
- verification decision issued
- credential status published
- consent grant available

### 4. Separate credential issuance from identity creation

Identity anchor creation and credential verification are different operations. They should not collapse into one generic “verified token” idea.

### 5. Make provenance mandatory

Any agent-assisted verification flow must return:

- decision
- evidence sources
- confidence
- assumptions
- failure reason

Placeholder agent responses are not acceptable for trust claims.

## Downstream Contract

### `ondc-seller`

Consume:

- merchant verification status
- business or operator credential status
- consented claim sharing for onboarding and compliance

Do not consume raw identity payloads.

### `ondc-buyer`

Consume:

- buyer trust or eligibility assertions
- limited-purpose claim disclosure
- auditable consent grants

Do not embed protocol assumptions into the trust model.

### `flatwatch`

Consume:

- signed or attestable subject identity where needed
- challenge and audit receipts
- scoped disclosure for evidence-backed public-interest flows

Do not inherit commerce-specific abstractions unless required.

## Anti-Patterns To Reject

- putting raw Aadhaar or equivalent PII on a public chain
- treating OTP completion as a durable verification result
- using a single verification bitmap as the whole trust model
- presenting placeholder agent output as verified evidence
- tying future asset tokenization claims to an unfinished identity substrate

## Implementation Sequence

### Phase 1

- fix identity API contract
- define the anchor, verification, consent, and audit data models
- remove or relabel unsupported product claims

### Phase 2

- implement real verification status objects and evidence provenance
- add consent-grant creation and revocation paths
- define downstream consumption APIs for buyer, seller, and FlatWatch

### Phase 3

- add selective disclosure packages or proof generation
- add issuer and verifier policy controls
- add audit export and challenge workflows

Asset tokenization should remain out of scope until the trust substrate is real.

## Recommended Workspace Follow-Up

- update `aadhaar-chain` repo docs to reflect this boundary
- create repo issues for identity-model repair and verification-state hardening
- update buyer and seller integration plans to depend on explicit trust contracts rather than generic tokenization language
