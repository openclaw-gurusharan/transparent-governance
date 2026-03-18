# Docs Pruning Loop

Keep root instructions compressed and move procedures into docs.

## Rule

- `AGENTS.md` should remain the short Codex trigger surface.
- `CLAUDE.md` is optional and should not carry unique Codex-only policy.
- `ARCHITECTURE.md` may exist at the repo root as the compressed orientation map for current mission, repo roles, and protocol boundaries.
- Long workflows belong in `docs/workflow/*`.
- Stable ownership maps belong in `docs/operations/*`.
- Stable detailed architecture context belongs in `docs/reference/*`.
- `ARCHITECTURE.md` should link to owner docs rather than duplicate them deeply.

## When Adding New Governance

1. Add the detailed procedure in the appropriate docs folder.
2. If the change materially alters current workspace architecture, update `ARCHITECTURE.md` in the same workstream.
3. Add only the minimum trigger line to `AGENTS.md`.
4. Update `CLAUDE.md` only if you intentionally want a non-Codex mirror.
5. Avoid duplicating the same rule in multiple files.
