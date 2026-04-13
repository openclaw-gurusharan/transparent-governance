# Transparent Governance

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/openclaw-gurusharan/transparent-governance)

Umbrella governance and trust-control-plane repository for the OpenClaw workspace.

This repository owns the shared portfolio artifacts that should not live inside any single app repository:

- workspace mission and scope
- governance and execution workflows
- Notion and Linear control-plane guidance
- MCP setup and safety notes
- cross-repo rules and decision hygiene
- reusable workflow templates

## Child Repositories

The application repositories remain independent and are not mirrored here:

- `aadhaar-chain`
- `ondc-buyer`
- `ondc-seller`
- `flatwatch`

When this repository is used at the `CodexWorkspace` root, those child repos exist locally and are intentionally gitignored here so the umbrella repo only tracks governance artifacts.

This repo exists to keep the multi-project governance layer legible, versioned, and reviewable without coupling it to any one child project.

## Start Here

- [ARCHITECTURE.md](/Users/gurusharan/Documents/remote-claude/CodexWorkspace/ARCHITECTURE.md): root-level mission, current architecture, protocol boundaries, and operating model
- [docs/reference/MISSION.md](/Users/gurusharan/Documents/remote-claude/CodexWorkspace/docs/reference/MISSION.md): canonical mission
- [docs/reference/WORKSPACE-SCOPE.md](/Users/gurusharan/Documents/remote-claude/CodexWorkspace/docs/reference/WORKSPACE-SCOPE.md): workspace scope and architecture guardrails

## Source Layout

- `AGENTS.md`: workspace instruction source
- `ARCHITECTURE.md`: root-level architecture and orientation brief
- `ROADMAP.md`: portfolio roadmap
- `docs/`: governance, workflow, architecture, and reference docs
- `mcp/`: MCP integration notes
- `rules/`: concise governance rules
- `scripts/`: shared workspace scripts
- `workflows/`: reusable templates
