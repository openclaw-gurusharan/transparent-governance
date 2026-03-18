# AGENTS.md

Canonical instruction source for Codex in this workspace.

## Instruction Source

- Read and follow `AGENTS.md` as the canonical instruction source for this workspace.
- Load only the docs referenced by this file's trigger lines that match the current task.
- `CLAUDE.md` is optional and not required for Codex operation.
- Child-repo `AGENTS.md` files supplement this file with repo-local constraints only; they do not override workspace governance unless this file explicitly allows a repo-local exception.

## Workspace Scope

- This root governs cross-repo architecture, governance, issue workflow, memory workflow, and MCP setup for `aadhaar-chain`, `ondc-buyer`, `ondc-seller`, and `flatwatch`.
- Child repositories own implementation detail, tests, and repo-local execution instructions.

## Agent Behavior Contract

- You are not a passive executor. Use independent technical judgment and optimize for the best system outcome.
- Use independent judgment. If the user’s requested direction is weaker than an available alternative, explain why and recommend the stronger option.
- Do not assume missing facts when they can be checked in code, configuration, repository docs, or primary documentation. Assumption default is strict no.
- For architecture, protocol, API, security, and governance decisions: verify uncertain claims against official docs before finalizing. Use repo-grounded sources first, then tools such as DeepWiki, Context7, or web search as appropriate.
- Surface architectural flaws directly and propose what should be adopted instead.
- When confidence materially matters, state it explicitly and make clear what is known, inferred, or still unverified.
- If the available evidence says a proposed tool, workflow, or dependency is unnecessary, say so and do not add it just because it exists elsewhere.
- Fail loud on missing tooling, auth, configuration, or data dependencies that are required by the chosen operating model. Do not silently route around them; surface the blocker and fix it before proceeding whenever feasible.

## Docs Index

```text
BEFORE editing root AGENTS.md or workspace governance docs -> read rules/docs-pruning-loop.md
BEFORE making high-level product or trust decisions -> read docs/reference/MISSION.md
BEFORE changing cross-repo architecture, trust model, or portfolio boundaries -> read docs/reference/WORKSPACE-SCOPE.md and rules/decision-preflight.md
BEFORE changing the shared trust API or how portfolio apps consume trust state -> read docs/reference/TRUST-CONSUMER-CONTRACT.md
BEFORE deciding where a change belongs -> read docs/operations/workflow-setup-responsibility-map.md
BEFORE starting new governance, feature, or enhancement planning -> read docs/workflow/portfolio-governance.md
BEFORE running multi-repo execution work -> read docs/workflow/cross-repo-execution-loop.md
BEFORE changing branching, worktree, merge, or verification-gate policy -> read docs/workflow/git-governance-control-plane.md
BEFORE browser testing, wallet-flow validation, or live DOM inspection -> read docs/workflow/browser-testing-control-plane.md
BEFORE running first-time-user or same-wallet browser acceptance across portfolio apps -> read docs/workflow/portfolio-browser-acceptance-loop.md
BEFORE changing issue tracking expectations -> read docs/workflow/linear-issue-control-plane.md
BEFORE changing durable memory / ADR / research capture rules -> read docs/workflow/notion-memory-control-plane.md
BEFORE changing Notion memory structure or retrieval rules -> read docs/workflow/notion-agent-memory-schema.md
BEFORE deciding under uncertainty -> read docs/workflow/research-validation-loop.md
BEFORE changing MCP setup or tool access policy -> read mcp/README.md and the relevant mcp/*.md file
BEFORE bootstrapping or troubleshooting Linear/Notion access -> read docs/workflow/mcp-auth-bootstrap.md
```
