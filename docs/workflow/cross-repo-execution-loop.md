# Cross-Repo Execution Loop

This is the default operating loop for meaningful workspace work.

## Loop

1. Frame the problem in workspace terms.
2. Check current code and docs in the affected repo or repos.
3. Decide whether the work is:
   - workspace-only
   - repo-only
   - both
4. If the work is actionable, create or confirm the Linear issue.
5. If the work creates reusable reasoning, create or update Notion memory.
6. Implement in the correct repo.
7. Validate with code, tests, runtime evidence, or official docs.
8. Sync issue status, memory, and repo docs before considering the work complete.
9. If a new decision supersedes older guidance, update or mark the superseded repo and Notion artifacts in the same workstream.

## Autonomous Execution Governance

Use this stricter loop when the agent is expected to operate with high autonomy.

1. Confirm or create the Linear issue before starting material implementation.
2. Create one focused git branch per coherent behavior change.
3. Keep architecture or governance memory in Notion when the change should shape future work.
4. Run deterministic checks before browser testing.
5. Use browser testing only for flows where UI state, runtime integration, or authenticated behavior matters.
   Browser governance for live sessions, wallet flows, and attach strategy lives in `docs/workflow/browser-testing-control-plane.md`.
6. Fix blocking findings in the active branch only when they are true prerequisites; otherwise create a follow-up issue.
7. Move the issue to `In Review` only after implementation, verification, and memory sync are complete.
8. Merge to `main` only when the branch is independently reviewable and `main` can remain releasable.

## Branch Governance

- Branch names should use the `codex/` prefix.
- Keep one branch per issue-sized unit of work.
- Avoid stacked branches by default.
- If stacked branches are temporarily required, split them back to branches based on `main` before review unless stacked review is explicitly desired.
- Do not mix unrelated fixes into the active branch unless they block the current issue.

## Validation Order

1. repo-local deterministic checks
2. targeted runtime or API checks
3. browser-based testing for critical journeys
   Use the browser-testing control plane when the flow depends on authentication, wallet extensions, or a live user browser context.
4. rerun the minimum full verification set needed to regain confidence

## Merge Standard

Do not recommend merge until all of the following are true:

- the branch scope is coherent
- the issue status matches reality
- known limitations are explicitly documented
- any required Notion memory has been updated
- browser testing has been completed for UI-critical work

## Write Destinations

| Artifact | System |
|----------|--------|
| executable work item | Linear |
| durable architecture or research memory | Notion |
| technical source of truth | repo docs/code |
| workspace-wide policy | workspace docs |

## When To Open A Linear Issue

Open or confirm a Linear issue when:

- work spans more than one session
- work affects more than one repo
- work changes user-facing behavior
- work changes architecture, trust, or integration boundaries

## When To Write Notion Memory

Write or update Notion memory when:

- a decision should shape future work
- research yields a reusable conclusion
- a user correction must persist
- a cross-repo rule or pattern is now established

## Completion Standard

The loop is not done until:

- implementation reflects the decision
- repo or workspace docs reflect the truth
- Linear status matches reality
- any required Notion memory has been captured
- superseded durable-memory or governance artifacts are explicitly linked forward instead of silently drifting
