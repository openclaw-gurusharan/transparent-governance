# Linear Issue Control Plane

Linear is the system of record for actionable work in this workspace.

## Use Linear For

- features
- bugs
- chores
- investigations
- architectural follow-ups that require execution

## Required Issue Shape

Every material issue should capture:

- clear problem statement
- affected repo or repos
- desired outcome
- constraints or risks
- acceptance criteria
- linked Notion context when durable reasoning exists

## Status Expectations

Recommended lifecycle:

1. `Backlog`: not yet active
2. `Planned`: accepted and scoped
3. `In Progress`: actively being worked
4. `In Review`: implementation complete, awaiting validation or review
5. `Done`: shipped and synced

## Governance Rules

- Do not start large or multi-repo implementation without a Linear issue unless the user explicitly wants ad-hoc exploration only.
- If the work changes direction materially, update the issue summary and acceptance criteria.
- Close the issue only after code/tests/docs are aligned and any required Notion memory has been updated.

## Linking Rules

Link the issue to:

- affected repositories
- PRs/commits when available
- the Notion ADR or research page when used

## Autonomous Execution Rules

When the agent is operating autonomously, each active issue should be kept current with:

- active branch name
- latest reviewable commit SHA
- verification summary
- browser testing mode and journey exercised when UI-critical validation is required
- known blockers or known residual gaps

Recommended discipline:

1. move to `In Progress` when the branch is created and implementation begins
2. leave a factual comment when a meaningful checkpoint lands
   Include browser mode and tooling blockers when browser validation is part of the acceptance path.
3. move to `In Review` only after deterministic checks and required browser validation pass
4. move to `Done` only after merge to `main`

## Branch Mapping

- Prefer one Linear issue to one review branch.
- If a single issue requires multiple review branches, say so explicitly in the issue comments.
- If a branch ends up serving a different problem than the current issue summary, update the issue rather than letting branch and issue drift apart.

## When Not To Use Linear

- ephemeral Q&A
- small local inspection with no follow-up action
- one-off notes that belong in Notion rather than execution tracking
