# Docs Vs MCP Map

This workspace does not rely on local custom skills. Governance here is docs-first and tool-routed.

## Core Principle

- Docs define what must remain true.
- MCP tools execute against external systems of record.
- Repo-local instructions govern implementation inside each app.

## Decision Policy

| Task Type | Primary Path | Why |
|-----------|--------------|-----|
| Cross-repo architecture, trust model, governance | docs-first | contractual and durable |
| Linear issue creation, lookup, status sync | Linear MCP first | issue system of record |
| Notion ADR/research/memory updates | Notion MCP first | memory system of record |
| Protocol/library/API uncertainty | official documentation first | avoid assumption drift |
| Single-repo implementation work | repo-local docs/code first | correct ownership |

## Verification Rule

When a technical claim materially affects architecture, security, compliance, or integration direction:

1. Inspect the current code/config.
2. Identify assumptions.
3. Verify uncertain claims using primary documentation.
4. Then decide.

## Fail-Loud Policy

- If a required MCP is not configured or authenticated, stop and treat that as an operational defect to fix.
- Do not silently switch to a weaker process that bypasses the system of record.
- Do not invent external state that was not read from the system of record.
- Only continue without the MCP when the task itself is exploratory and does not require that system of record.
