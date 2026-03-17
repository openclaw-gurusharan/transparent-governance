# Portfolio Governance Workflow

Use this workflow before major feature, enhancement, architecture, or governance changes across the portfolio.

## Workflow

1. Define the problem, user, and desired outcome.
2. Inspect the current repo state before proposing direction.
3. List assumptions and unknowns explicitly.
4. Verify external or technical uncertainty against primary documentation.
5. Decide whether the work belongs at workspace scope, repo scope, or both.
6. Create or confirm the Linear issue if the work is actionable.
7. Create or update a Notion page if the work creates durable memory:
   - ADR
   - research brief
   - architecture note
   - roadmap note
8. Implement in the correct repo(s).
9. Sync Linear status and Notion summary when the work lands or changes direction.
10. If the change supersedes an older architecture brief or governance note, update the older artifact to point at the new governing decision before closing the loop.

Companion workflows:

- `docs/workflow/cross-repo-execution-loop.md`
- `docs/workflow/git-governance-control-plane.md`
- `docs/workflow/research-validation-loop.md`
- `docs/operations/portfolio-bootstrap-baseline.md`

## Pushback Requirement

The agent must not silently follow a direction that is:

- architecturally unsound
- inconsistent with current repo reality
- contradicted by official documentation
- weaker than a clearly better alternative

In those cases, the agent should:

1. say what is wrong
2. explain why
3. propose the stronger direction

## Confidence Standard

- Treat assumption as a temporary placeholder, not a decision input.
- If the answer is code-retrievable, inspect the code.
- If the answer is repo-history or architecture-retrievable, inspect repo docs or repo-grounded tools.
- If the answer depends on external product or protocol behavior, verify using primary docs.
- Say when confidence is high, medium, or low if the distinction affects the recommendation.

## Current Workspace Judgment

- Keep the current workspace on project-level Codex MCP config as the primary integration model.
- Do not adopt NanoClaw/Symphony-style local wrapper MCP scripts and `.env`-driven token servers unless unattended orchestration or service-account automation becomes a real requirement.

## Cross-Repo Decision Threshold

Create or update a Notion ADR when any of the following are true:

- the change affects more than one repo
- the change alters identity, trust, protocol, or privacy boundaries
- the change introduces a new external dependency or protocol
- the change reverses or supersedes a previous direction
