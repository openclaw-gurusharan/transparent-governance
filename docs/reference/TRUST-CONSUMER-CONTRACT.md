# Trust Consumer Contract

Status: active

Owner: workspace governance

Primary producer: `aadhaar-chain`

Primary consumers: `ondc-buyer`, `ondc-seller`, `flatwatch`

## Purpose

Define the single downstream-safe trust contract that portfolio apps may consume from `aadhaar-chain`.

This contract exists to keep the portfolio aligned with the workspace mission:

- `aadhaar-chain` is the trust substrate
- buyer and seller are trust-consuming commerce surfaces
- FlatWatch is the transparency and audit surface

The contract is intentionally narrow. Consumers should read trust state, consent state, attestation state, revocation state, and audit references. They should not consume raw Aadhaar payloads, OCR output, or verifier internals.

## Non-Negotiables

- Raw Aadhaar or comparable sensitive PII must not be exposed through this contract.
- On-chain data should be limited to commitments, attestations, revocation markers, consent receipts, and audit references.
- Consumer apps must not infer trust state from ad hoc local heuristics if `aadhaar-chain` already exposes the relevant state.
- ONDC and UCP remain adapter and protocol boundaries, not the trust model itself.

## Producer APIs

`aadhaar-chain` is the only producer of portfolio trust state.

Minimum APIs:

- `GET /api/identity/{wallet_address}`
  - Purpose: identity anchor presence
  - Success with `data = null` means no identity anchor exists yet
- `GET /api/identity/{wallet_address}/trust`
  - Purpose: downstream-safe trust surface
  - Must exclude raw verification evidence
- `GET /api/identity/status/{verification_id}`
  - Purpose: workflow polling for verification UX

## Portfolio Trust States

These are the only shared interpretation states portfolio consumers should use:

- `no_identity`
- `identity_present_unverified`
- `verified`
- `manual_review`
- `revoked_or_blocked`

## Interpretation Rules

Consumers should treat the trust producer output as authoritative.

Interpretation:

- `no_identity`
  - No identity anchor exists for the wallet address.
- `identity_present_unverified`
  - Identity anchor exists, but there is no approved verification usable for elevated actions.
- `verified`
  - There is at least one approved verification, no active revocation, and no blocking decision.
- `manual_review`
  - The latest relevant verification requires human review or has unresolved gaps that prevent elevated access.
- `revoked_or_blocked`
  - There is an explicit revoke/block outcome, or the active trust artifact is no longer usable.

## Producer Surface Shape

The trust surface must remain stable and downstream-safe.

Required fields:

- `trust_version`
- `wallet_address`
- `did`
- `verification_bitmap`
- `updated_at`
- `trust_state`
- `high_trust_eligible`
- `verifications[]`

Each verification summary may include:

- `document_type`
- `verification_id`
- `workflow_status`
- `decision`
- `reason`
- `evidence_status`
- `consent`
- `attestation`
- `revocation`
- `review`
- `audit_receipts`

Each verification summary must not include:

- raw document contents
- OCR field dumps
- extracted Aadhaar or PAN values
- fraud model internals beyond safe summary state
- compliance engine internals beyond safe summary state

## Consumer Responsibilities

### `ondc-buyer`

Use trust state for:

- buyer onboarding readiness
- checkout gating for elevated or high-trust actions
- verified-buyer indicators in profile and order surfaces

Do not:

- copy trust logic into buyer-only rules
- read raw verification payloads

### `ondc-seller`

Use trust state for:

- seller/operator readiness
- listing and payout eligibility
- verified-seller indicators in seller control surfaces

Do not:

- treat ONDC subscriber config as a replacement for trust state
- store duplicate identity verification state locally

### `flatwatch`

Use trust state for:

- challenge filing eligibility
- evidence provenance messaging
- reviewer or operator audit trace surfaces

Do not:

- force commerce abstractions into transparency flows
- infer trust from local roles alone

## UI Contract

Consumer apps should present trust outcomes explicitly:

- explain why an action is blocked
- link the user back to `aadhaar-chain` to remediate trust issues
- distinguish missing identity from unverified identity
- distinguish manual review from blocked or revoked state

Recommended copy patterns:

- `no_identity`: create an identity anchor in AadhaarChain before this action is available
- `identity_present_unverified`: complete verification in AadhaarChain to unlock this action
- `manual_review`: verification is under manual review; elevated actions stay paused
- `revoked_or_blocked`: trust state is revoked or blocked; review identity and consent records in AadhaarChain

## Protocol Boundary

Trust state governs whether a user or operator is eligible to perform higher-trust actions.

- ONDC handles marketplace protocol semantics.
- UCP handles commerce interoperability semantics.
- `aadhaar-chain` handles trust, consent, provenance, and revocation semantics.

No consumer app should collapse these layers into one undifferentiated platform claim.
