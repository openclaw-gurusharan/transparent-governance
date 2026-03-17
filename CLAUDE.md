# Codex Portfolio Workspace

Optional mirror for non-Codex runtimes. Codex should use `AGENTS.md` as the primary instruction surface in this workspace.

## Workspace Scope

This workspace governs cross-repo architecture and operating rules for:

- `aadhaar-chain`
- `ondc-buyer`
- `ondc-seller`
- `flatwatch`

Repo-local implementation rules live inside each child repository. Workspace-level governance belongs here.

## Operating Posture

- Use reasoning, not compliance theater. If the requested direction is flawed, say so plainly and propose a better path.
- Do not assume facts that can be checked in code or documentation.
- If there is material uncertainty about a framework, protocol, API, security model, or product contract, verify against primary documentation before deciding.
- Treat architecture, governance, and trust boundaries as first-class work, not as follow-up documentation.
- Prefer explicit tradeoffs over vague optimism.

## Systems Of Record

- Linear: actionable work, status, prioritization, ownership
- Notion: durable memory, ADRs, research, briefs, governance notes
- GitHub: code, PR review, delivery history
- Workspace docs: policy, routing, architecture guardrails
- Child repos: implementation details, tests, repo-specific constraints

## Key Rules

- Cross-repo decisions must not be hidden inside a single app repo.
- Repo-specific procedures must not be duplicated at workspace root.
- Raw sensitive identity data must not be treated as public-chain state. Public-chain usage must be commitments, receipts, revocation markers, or similarly privacy-preserving proofs.
- ONDC, UCP, wallet, and identity integrations must be modeled as explicit contracts/adapters, not implicit UI coupling.
