# MCP Setup

Workspace-level MCP configuration is shared through `.codex/config.toml`.

## Enabled Servers

- Linear MCP
- Notion MCP

## Policy

- Linear is the issue system of record.
- Notion is the durable memory system of record.
- Writes to either system should reflect actual reviewed state, not guesses.
- Current decision: use project-level Codex MCP config as the control plane, with direct remote MCP for both Linear and Notion.
- Do not add wrapper layers unless the direct Codex MCP path is provably insufficient.
- Fail loud when required MCP auth or config is missing. Fix the integration before continuing with work that depends on it.

## Authentication

Project-level configuration is checked into `.codex/config.toml`.

Current active mode in this workspace:

- Linear: remote MCP uses OAuth through the Codex control plane
- Notion: remote MCP uses OAuth through the Codex control plane; it should not depend on `NOTION_TOKEN` for `https://mcp.notion.com/mcp`

## Local Secret Policy

Control-plane secrets live in a local uncommitted `.env` file based on `.env.example`.

Rules:

- `.env` may hold workspace metadata or optional fallback secrets, but OAuth-backed MCP should not depend on it
- never commit real tokens
- do not move secrets into `AGENTS.md`, `docs/`, or checked-in config

See:

- `mcp/linear.md`
- `mcp/notion.md`
