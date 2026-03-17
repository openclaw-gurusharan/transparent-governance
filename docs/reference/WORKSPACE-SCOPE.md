# Workspace Scope

This workspace is a portfolio layer over four application repositories:

- `aadhaar-chain`: identity, consent, verification, credential, and trust substrate
- `ondc-buyer`: buyer commerce surface
- `ondc-seller`: seller commerce surface
- `flatwatch`: transparency and audit vertical

## Governance Boundary

Workspace root owns:

- cross-repo architecture decisions
- trust and privacy guardrails
- issue and memory operating model
- MCP configuration and access policy
- portfolio roadmapping and integration direction

Child repos own:

- code and tests
- repo-specific AGENTS/CLAUDE/rules
- implementation details
- app-local debug and deployment procedures

## Architecture Guardrails

### Identity and Trust

- Do not model raw Aadhaar or other government-issued PII as public-chain data.
- Use off-chain encrypted data plus on-chain commitments, attestations, proofs, revocation markers, or audit receipts.
- Consent must be explicit, scoped, and time-bound where feasible.

### Cross-Repo Composition

- `aadhaar-chain` is the trust layer, not just another app.
- `ondc-buyer` and `ondc-seller` consume trust and credential capabilities through explicit contracts.
- `flatwatch` is a transparency/audit application that may consume the same trust layer, but should not force commerce-specific assumptions into its model.

### Protocol Discipline

- ONDC and UCP are integration boundaries and should be implemented as adapters/contracts.
- External protocol claims must be verified against primary docs before architecture changes are approved.

## Change Routing

- If the change affects multiple repos or portfolio direction, update workspace docs first.
- If the change only affects one app’s internals, update that app repo directly.
- If the change affects both, update workspace governance and repo implementation in the same workstream.

