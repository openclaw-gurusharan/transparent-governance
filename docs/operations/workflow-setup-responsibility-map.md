# Workflow Setup Responsibility Map

Canonical map for deciding ownership and update placement in this workspace.

## Responsibility And Update Locations

| Concern | Primary Owner | Workspace-Tracked Update Locations | Repo-Local Update Locations |
|---------|---------------|------------------------------------|-----------------------------|
| Cross-repo architecture and trust model | workspace governance | `AGENTS.md`, `docs/reference/WORKSPACE-SCOPE.md`, `rules/decision-preflight.md` | repo ADR/docs only when implementation-specific |
| Issue workflow and delivery status | Linear | `docs/workflow/linear-issue-control-plane.md`, `workflows/linear-issue-template.md` | repo issue references in PRs/docs as needed |
| Durable memory, ADRs, research notes | Notion | `docs/workflow/notion-memory-control-plane.md`, `workflows/notion-*.md` | repo docs only when local implementation detail matters |
| MCP server setup and access policy | workspace governance | `.codex/config.toml`, `mcp/README.md`, `mcp/*.md` | repo `.mcp.json` only if app-specific tooling is needed |
| Portfolio governance workflow | workspace governance | `docs/workflow/portfolio-governance.md` | none |
| Repo-specific implementation, tests, deployments | target repo | none by default | that repo’s code, tests, AGENTS/CLAUDE, README |

## Update Protocol

1. Classify whether the change is workspace-wide or repo-local.
2. Update the owning surface first.
3. Link downstream implementation to the governing decision instead of duplicating it.
4. Keep root instructions compressed; move procedures into docs/workflow or rules.

## Routing Heuristic

- Policy or architecture invariant: workspace root
- Actionable work item: Linear
- Durable reasoning or decision log: Notion
- Code and tests: child repo
