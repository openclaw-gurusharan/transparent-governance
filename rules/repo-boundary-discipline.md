# Repo Boundary Discipline

This workspace is a portfolio governance layer, not a replacement for repo-local instructions.

## Rule

- Put cross-repo rules here.
- Put app implementation rules in the child repo that owns them.
- Link across boundaries; do not duplicate entire procedures.

## Examples

- Shared identity/privacy guardrail: workspace root
- `ondc-buyer` build or test procedure: `ondc-buyer`
- `flatwatch` backend auth implementation note: `flatwatch`

