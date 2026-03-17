# Transparent Governance

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

This repo exists to keep the multi-project governance layer legible, versioned, and reviewable without coupling it to any one child project.

## Source Layout

- `AGENTS.md`: workspace instruction source
- `ROADMAP.md`: portfolio roadmap
- `docs/`: governance, workflow, architecture, and reference docs
- `mcp/`: MCP integration notes
- `rules/`: concise governance rules
- `scripts/`: shared workspace scripts
- `workflows/`: reusable templates
