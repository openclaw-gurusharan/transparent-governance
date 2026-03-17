# Notion MCP

Notion MCP is used for durable memory and architecture documentation.

## Server

- URL: `https://mcp.notion.com/mcp`

## Codex Configuration

Configured in `.codex/config.toml`.

## Authentication

Current workspace mode uses:

- direct remote MCP config in `.codex/config.toml`
- OAuth via `codex mcp login notion`

Current expected state:

- the workspace should not configure `bearer_token_env_var` for `https://mcp.notion.com/mcp`
- a fresh Codex session still needs a completed OAuth login before Notion is usable
- if Notion fails to start, verify `codex mcp list` and re-run `codex mcp login notion`

## Usage Boundary

Use Notion MCP for:

- ADRs
- research notes
- governance notes
- reusable portfolio memory

Do not use it for ephemeral scratch notes or unreviewed execution state.

## Safety

Notion MCP operates with the authenticated user’s permissions. Prefer human confirmation for broad write operations.

## Current Expected Local Variables

- `NOTION_AGENT_MEMORY_DATABASE_ID`
- `NOTION_SESSION_SUMMARY_DATABASE_ID`
- `NOTION_PROJECT_REGISTRY_DATABASE_ID`
