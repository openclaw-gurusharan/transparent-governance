# Docs Folder Index

This workspace keeps portfolio governance compressed at the root and detailed procedures in docs.

## Folder Layout

```text
docs/
  operations/   # ownership, placement, and governance routing
  reference/    # stable portfolio context and architecture guardrails
  workflow/     # issue, memory, and delivery workflows
```

## Start Points

- Workspace scope and architecture guardrails: `docs/reference/WORKSPACE-SCOPE.md`
- Workspace mission: `docs/reference/MISSION.md`
- Workspace roadmap: `ROADMAP.md`
- Ownership and placement rules: `docs/operations/workflow-setup-responsibility-map.md`
- Governance workflow: `docs/workflow/portfolio-governance.md`
- Cross-repo execution loop: `docs/workflow/cross-repo-execution-loop.md`
- Portfolio frontend deployment control plane: `docs/workflow/portfolio-vercel-deployment-control-plane.md`
- Portfolio frontend deployment reference: `docs/reference/PORTFOLIO-VERCEL-DEPLOYMENT-REFERENCE.md`
- Browser testing control plane: `docs/workflow/browser-testing-control-plane.md`
- Browser testing checklist: `docs/workflow/browser-testing-checklist.md`
- Portfolio browser acceptance loop: `docs/workflow/portfolio-browser-acceptance-loop.md`
- Linear issue control plane: `docs/workflow/linear-issue-control-plane.md`
- Notion memory control plane: `docs/workflow/notion-memory-control-plane.md`
- Notion agent-memory schema: `docs/workflow/notion-agent-memory-schema.md`
- Notion memory seed set: `docs/workflow/notion-memory-seed.md`
- Research and validation loop: `docs/workflow/research-validation-loop.md`
- MCP auth bootstrap: `docs/workflow/mcp-auth-bootstrap.md`

## Authority

- `AGENTS.md` is the workspace instruction source for Codex.
- `CLAUDE.md` is optional and may be maintained only for non-Codex runtimes.
- `rules/*.md` define short always-on behavioral rules.
- `mcp/*.md` define tool-specific setup and safety.
