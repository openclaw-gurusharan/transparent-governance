# Mission

Use this document as the canonical mission statement for portfolio decisions in this workspace.

Decision:

- prioritize systems that improve trust, consent, transparency, and auditability without centralizing blind power
- treat `aadhaar-chain` as the trust substrate, not as a place to publish raw identity data
- treat `ondc-buyer`, `ondc-seller`, and `flatwatch` as applications that consume or demonstrate that trust layer for distinct user problems

## Core Mission

Build systems that:

- increase transparency
- reduce corruption and hidden decision-making
- improve trust without centralizing blind power
- make verification, consent, and auditability first-class

## Product Interpretation

### `aadhaar-chain`

This is the trust substrate:

- identity
- verification
- credential handling
- consent
- audit receipts
- privacy-preserving trust signals

It should not degenerate into “put identity data on a blockchain.”

### `ondc-buyer` and `ondc-seller`

These are trust-consuming commerce applications.

They should demonstrate:

- explicit identity and authorization flows
- better onboarding and verification
- more trustworthy commerce interactions
- adapter-based protocol integration

### `flatwatch`

This is the transparency vertical.

It should demonstrate:

- auditability
- explainability
- public-interest accountability
- evidence-backed governance and challenge flows

## Non-Negotiables

- Raw sensitive identity data does not belong on a public chain.
- Verification must be scoped, purposeful, and privacy-conscious.
- Governance should improve trust, not just create more ceremony.
- Protocol usage must be explicit and evidence-based.
- Repository truth outranks oral tradition and chat memory.

## What Success Looks Like

- The apps share a coherent trust model.
- Cross-repo decisions are documented and testable.
- Agents can reason from the repository and durable memory without guessing.
- New work becomes easier because architecture and governance are legible.
- Trust claims are backed by implementation, not branding language.

## What To Avoid

- blockchain theater
- vague “AI agent platform” sprawl
- hidden trust assumptions
- unverified protocol claims
- governance that exists only in conversation and not in the system of record

## Research Lineage

This workspace draws on agent-environment and harness ideas from:

- OpenAI harness engineering
- OpenAI Codex/App Server harness design
- OpenAI’s in-house data agent
- OpenAI Responses API computer environment work
- Anthropic’s MCP code-execution pattern

These are influences, not templates to copy mechanically.
