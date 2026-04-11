# Notion Memory Seed

Create these entries first once Notion access is authenticated.

Decision:

- seed Notion with the core workspace decisions before adding narrower project memory
- use this set to establish the privacy, MCP, memory-placement, and trust-boundary defaults for future work
- do not create ad hoc durable memory that conflicts with these seed entries without an explicit superseding decision

## Seed Entries

### 1. Public Chain Privacy Boundary

- Title: `Do not store raw identity data on a public chain`
- Memory Type: `ADR`
- Scope: `workspace`
- Repo: `shared`
- Status: `validated`
- Confidence: `high`
- Decision: `avoid`

Summary:

Use on-chain commitments, proofs, or audit receipts instead of raw PII.

### 2. MCP Integration Default

- Title: `Use project-level Codex MCP config before local wrapper MCP servers`
- Memory Type: `Governance Note`
- Scope: `workspace`
- Repo: `shared`
- Status: `validated`
- Confidence: `high`
- Decision: `adopt`

Summary:

Prefer `.codex/config.toml` plus OAuth. Introduce NanoClaw-style wrapper MCP servers only when unattended automation requires them.

### 3. Memory Placement Rule

- Title: `Repository truth, Linear execution, Notion durable memory`
- Memory Type: `Governance Note`
- Scope: `workspace`
- Repo: `shared`
- Status: `validated`
- Confidence: `high`
- Decision: `adopt`

Summary:

Keep technical truth in repos, execution truth in Linear, and reusable institutional knowledge in Notion.

### 4. Commerce Integration Boundary

- Title: `Integrate ONDC and UCP through explicit adapters`
- Memory Type: `Integration Note`
- Scope: `workspace`
- Repo: `shared`
- Status: `candidate`
- Confidence: `medium`
- Decision: `adopt`

Summary:

Do not let protocol boundaries collapse into frontend coupling or naming assumptions.

### 5. Portfolio Mission

- Title: `The portfolio exists to improve transparency and trust`
- Memory Type: `Governance Note`
- Scope: `workspace`
- Repo: `shared`
- Status: `validated`
- Confidence: `high`
- Decision: `adopt`

Summary:

The platform should reduce corruption and hidden decision-making through verifiable, privacy-conscious trust systems.

## Usage

Once Notion is connected:

1. create the `Agent Memory` database with the approved schema
2. create these seed entries first
3. then add new entries only when they meet the memory threshold
