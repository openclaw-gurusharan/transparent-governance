# MCP Auth Bootstrap

Use this workflow to make Linear and Notion actually usable in this workspace.

## Current Model

- Server definitions live in `.codex/config.toml`
- Linear remains direct remote MCP and authenticates through OAuth
- Notion remains direct remote MCP and authenticates through OAuth

## Required Services

- `linear`
- `notion`

## Bootstrap Steps

1. Trust the project so project-level `.codex/config.toml` is active.
2. Complete Linear OAuth login:

```bash
codex mcp login linear
```
3. Complete Notion OAuth login:

```bash
codex mcp login notion
```
4. Check current MCP state:

```bash
bash scripts/workspace-preflight.sh
```

## Expected Outcome

- `linear` enabled and authenticated for Linear issue/project work
- `notion` enabled and authenticated for durable-memory writes
- workspace ready for issue and durable-memory workflows

## Current Known Gap

- if Linear has not completed OAuth in the active Codex environment, the server will appear configured but remain unusable
- do not mark the Linear bootstrap complete until `codex mcp login linear` succeeds in the active environment
- if Notion has not completed OAuth in the active Codex environment, the server will appear configured but remain unusable
- do not mark the Notion bootstrap complete until `codex mcp login notion` succeeds in the active environment

## Do Not Do This By Default

- do not add extra wrapper MCP scripts when the direct Codex control plane works reliably
- do not move tokens into checked-in config
- do not continue with Linear/Notion-dependent work while MCP auth is broken; fix auth first
