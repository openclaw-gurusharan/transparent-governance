# Docs Pruning Loop

Keep root instructions compressed and move procedures into docs.

## Rule

- `AGENTS.md` should remain the short Codex trigger surface.
- `CLAUDE.md` is optional and should not carry unique Codex-only policy.
- Long workflows belong in `docs/workflow/*`.
- Stable ownership maps belong in `docs/operations/*`.
- Stable architecture context belongs in `docs/reference/*`.

## When Adding New Governance

1. Add the detailed procedure in the appropriate docs folder.
2. Add only the minimum trigger line to `AGENTS.md`.
3. Update `CLAUDE.md` only if you intentionally want a non-Codex mirror.
4. Avoid duplicating the same rule in multiple files.
