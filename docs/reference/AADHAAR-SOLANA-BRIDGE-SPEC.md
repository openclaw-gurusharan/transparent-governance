# AadhaarChain To aadhar-solana Bridge Spec

Status: active

Owner: workspace governance

Primary producer: `aadhaar-chain`

Bridge target: `aadhar-solana`

## Decision

`aadhar-solana` is a long-term chain and credential layer behind `aadhaar-chain`; it is not the current portfolio trust producer.

Downstream portfolio apps must continue to consume `aadhaar-chain` through `docs/reference/TRUST-CONSUMER-CONTRACT.md`. They must not call `aadhar-solana` directly for trust state until this bridge is implemented, tested, and explicitly promoted.

## Current Contract Mismatch

Repo evidence from `aadhar-solana`:

- `packages/api/src/modules/verification/verification.dto.ts` accepts raw `aadhaarNumber`, `panNumber`, `fullName`, and `dateOfBirth`.
- `packages/api/src/modules/verification/verification.service.ts` calls API Setu-style verification and then updates Solana verification status directly.
- `packages/api/src/modules/credentials/credentials.dto.ts` accepts arbitrary credential `claims`.
- `packages/api/src/modules/credentials/credentials.service.ts` stores credential claims as JSON metadata and issues credentials.
- `packages/api/prisma/schema.prisma` has useful long-term entities for identities, verification requests, credentials, consent, audit logs, and oracle nodes.
- Anchor programs expose identity registry, verification oracle, credential manager, reputation, and staking capabilities.

This does not match the active portfolio trust boundary because downstream consumers may only receive safe trust state, consent summaries, attestation references, revocation references, and audit references. Raw Aadhaar, PAN, OCR output, extracted PII, and internal verifier payloads must stay inside `aadhaar-chain`.

## Anchor Instruction Inventory

Current instruction entrypoints in `aadhar-solana/programs/*/src/lib.rs`:

| Program | Instructions | Portfolio use before promotion |
| --- | --- | --- |
| `identity-registry` | `initialize_config`, `create_identity`, `update_verification_status`, `update_reputation`, `update_staked_amount`, `add_recovery_key`, `recover_identity` | Identity anchor and trust-bit registry behind the FastAPI producer. Must not expose raw identity evidence downstream. |
| `verification-oracle` | `initialize`, `register_oracle`, `deregister_oracle`, `request_verification`, `submit_verification`, `finalize_verification`, `expire_verification`, `slash_oracle`, `update_config` | Candidate signed bridge/oracle lane. Requires signer admission, replay protection, duplicate-response handling, stale-event rejection, and slashing tests before use. |
| `credential-manager` | `initialize`, `create_schema`, `register_issuer`, `issue_credential`, `revoke_credential`, `suspend_credential`, `reactivate_credential`, `transfer_credential`, `verify_credential`, `deactivate_schema`, `deactivate_issuer`, `update_config` | Credential lifecycle lane. Identity-derived schemas must be non-transferable by default and must carry hashes/references only. |
| `reputation-engine` | `initialize`, `initialize_score`, `record_event`, `record_positive_event`, `record_negative_event`, `apply_decay`, `get_tier`, `update_config` | Optional reputation lane. It must not become a second producer of portfolio trust state without an explicit bridge contract. |
| `staking-manager` | `initialize_pool`, `stake`, `request_unstake`, `complete_unstake`, `claim_rewards`, `slash`, `update_pool_config`, `set_pool_paused`, `get_stake_info` | Oracle/economic security lane. Requires governance, emergency pause, oracle admission, and slashing policy before sensitive use. |

## Bridge Event Model

`aadhaar-chain` should emit signed bridge events only after its local verification, review, consent, revocation, and audit records are durable.

Required event envelope:

```json
{
  "event_version": "v1",
  "event_id": "uuid-or-content-address",
  "event_type": "identity_created",
  "wallet_address": "solana-public-key",
  "subject_did": "did:solana:...",
  "portfolio_trust_state": "verified",
  "verification_type": "aadhaar",
  "verification_id": "producer-verification-id",
  "attestation_reference": "attestation:...",
  "audit_receipt_reference": "audit:...",
  "consent_reference": "consent:...",
  "revocation_reference": null,
  "issued_at": "iso-8601",
  "issuer": "aadhaar-chain-bridge-oracle",
  "signature": "detached-signature"
}
```

Allowed event types:

- `identity_created`
- `verification_approved`
- `verification_rejected`
- `manual_review_required`
- `credential_issued`
- `credential_revoked`
- `trust_blocked`

Allowed event payload data:

- wallet address
- subject DID
- portfolio trust state
- verification type
- opaque verification ID
- attestation reference
- audit receipt reference
- consent reference
- revocation reference
- issuer identity
- timestamp
- detached signature

Forbidden event payload data:

- raw Aadhaar number
- raw PAN number
- name
- date of birth
- address
- document bytes
- OCR text
- extracted document fields
- fraud model internals
- compliance engine internals
- full verification report

## Mapping To aadhar-solana

| AadhaarChain event | aadhar-solana target | Required mapping |
| --- | --- | --- |
| `identity_created` | identity registry | Create or confirm wallet DID, metadata commitment, and initial verification bitmap. |
| `verification_approved` | identity registry or verification oracle | Set the safe verification bit and store only proof or attestation references. |
| `verification_rejected` | verification oracle | Record rejected decision reference without raw evidence. |
| `manual_review_required` | verification oracle | Record pending/manual-review state without elevating trust. |
| `credential_issued` | credential manager | Issue non-transferable identity-derived credential by default, using claims hash or schema reference only. |
| `credential_revoked` | credential manager | Revoke credential and link revocation reference. |
| `trust_blocked` | identity registry, verification oracle, or credential manager | Clear or block verification eligibility and publish revocation/block references. |

## Signer And Replay Requirements

- The bridge signer must be an explicit AadhaarChain oracle identity, not a frontend wallet.
- Every event must have a stable `event_id`.
- `aadhar-solana` must reject duplicate `event_id` values.
- `aadhar-solana` must reject stale events when a newer revocation or block event exists.
- Signature verification must bind the full event payload.
- The signer admission and rotation policy must be documented before devnet promotion.

## Governance And Authority Policy

Before `aadhar-solana` can enter any sensitive portfolio trust path:

- Upgrade authority must be held by a documented multisig, not by a single developer wallet.
- Program upgrade authority, oracle admission, issuer approval, revocation authority, staking slashing authority, and emergency pause authority must be separate named roles unless an ADR explicitly justifies combining them.
- Oracle admission must require multisig approval plus a recorded operator identity, stake account, public key, and revocation path.
- Issuer approval must bind issuer authority to schema scope, verification level, credential type, and revocation obligations.
- Revocation authority must support emergency trust-block events and normal credential revocation events without exposing raw identity evidence.
- Emergency pause must stop new identity, verification, credential, reputation, and staking writes while preserving read access to existing trust and revocation references.
- Governance changes must emit audit references consumable by the FastAPI producer bridge before downstream apps rely on chain state.

## Credential Policy

Identity-derived credentials are non-transferable by default.

Transferable credentials require a schema-level exception and must not include KYC, Aadhaar, PAN, or identity-verification semantics.

Credential payloads should contain:

- credential ID
- issuer
- subject DID
- schema reference
- claims hash or proof commitment
- status
- issued timestamp
- expiry timestamp
- revocation reference

Credential payloads must not contain raw or extracted identity evidence.

## Promotion Gates

Do not promote `aadhar-solana` into the portfolio trust path until all are true:

- `aadhaar-chain` has durable producer records for identity, verification, consent, review, revocation, attestation, and audit receipts.
- Bridge event schema has tests for all allowed event types.
- Signature validation, replay protection, and stale-event rejection are tested.
- Solana local validator, PostgreSQL, Redis, Node/Yarn dependencies, Anchor build, and Anchor tests are repeatable locally.
- Anchor tests cover unauthorized verification updates, issuer impersonation, duplicate responses, credential misuse, revocation, and upgrade authority assumptions.
- Downstream apps still pass against `TRUST-CONSUMER-CONTRACT.md` without calling `aadhar-solana` directly.

## Current Status

The bridge is not implemented.

`aadhar-solana` should remain a migration target and security-review candidate until the promotion gates above are complete.
