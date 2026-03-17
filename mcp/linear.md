# Linear MCP

Linear MCP is used for issue lookup, creation, and workflow state.

## Server

- Remote endpoint: `https://mcp.linear.app/mcp`
- Codex server id: `linear`

## Codex Configuration

Configured in `.codex/config.toml`.
This workspace uses direct remote MCP for Linear.

Remote MCP requires:

```toml
[features]
experimental_use_rmcp_client = true
```

## Authentication

Current workspace mode uses:

- direct remote MCP with OAuth via:

```bash
codex mcp login linear
```

Reason:

- it is the simplest supported configuration for the `guru-codex-workspace` Linear workspace and avoids wrapper-specific handshake failures

## Usage Boundary

Use Linear MCP for:

- finding existing work
- creating or updating issues
- checking status and ownership

Do not use it as a memory store for architecture rationale that should live in Notion.

## Current Expected Local Variables

- `LINEAR_TEAM_KEY`
- `LINEAR_PROJECT_NAME`
- `LINEAR_PROJECT_ID`
- `LINEAR_AADHAAR_CHAIN_ARCH_ISSUE_ID`
- `LINEAR_AADHAAR_CHAIN_ARCH_ISSUE_URL`
