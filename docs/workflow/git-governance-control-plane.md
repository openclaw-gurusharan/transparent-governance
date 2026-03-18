# Git Governance Control Plane

This document defines the default git operating model for the workspace governance repo and every child application repo.

## Scope

- Workspace governance repo: `CodexWorkspace` tracking `openclaw-gurusharan/transparent-governance`
- Child repos: `aadhaar-chain`, `ondc-buyer`, `ondc-seller`, `flatwatch`

The workspace root is a governance repository, not an umbrella source repository. Each child application remains an independent git repository with its own history, checks, and release cadence.

## Primary Judgments

1. `main` must remain releasable and protected in every repo.
2. All material changes land through short-lived review branches, not direct pushes to `main`.
3. Branches are issue-sized. Long-lived integration branches are not the default.
4. Worktrees are repo-scoped, not workspace-scoped.
5. Local hooks are useful guardrails, but CI and protected-branch checks are the real merge gate.
6. Deterministic checks come before browser testing, and review comes before merge.

## Remote Protection Standard

Use GitHub branch protection or rulesets on `main` in every repo.

Required baseline:

- require pull requests before merging
- require status checks before merging
- require conversation resolution before merging
- require linear history
- do not allow bypassing protections
- disable force pushes to `main`
- disable deletions for `main`

Required when the repo deploys or publishes runtime behavior:

- require deployments to succeed before merging

Recommended implementation detail:

- Prefer a ruleset-based standard across the `openclaw-gurusharan` organization rather than ad hoc per-repo branch rules.
  GitHub documents that only one branch protection rule applies at a time and points to rulesets as the alternative for clearer governance.

## Merge Method Standard

Workspace default: enable `squash merge` and disable merge commits on protected branches.

Why:

- GitHub documents that linear history forbids merge commits.
- Squash merge keeps `main` readable when branches contain local checkpoint commits.
- One merged commit per issue-sized branch creates a clean mapping between Linear issue, PR, and shipped change.

Do not use merge queue by default yet.

Why:

- GitHub documents that merge queue is most useful for busy branches with many PRs from many users.
- It also requires CI to handle `merge_group` events.
- Current workspace throughput does not justify that extra complexity.

Revisit merge queue only when a repo has sustained concurrent merge pressure.

## Branching Strategy

Default branch naming:

- `codex/<scope>`

Rules:

- branch from the latest `origin/main`
- one branch per coherent issue-sized change
- one active Linear issue should map to one active review branch unless the issue explicitly needs multiple review branches
- branch is the default review unit; worktree is only a local isolation tool when the same repo needs parallel active work
- avoid stacked branches by default
- if stacking is temporarily required, unstack before review unless stacked review is explicitly desired
- do not mix unrelated fixes into the branch unless they are true blockers

Direct commits to `main` are not part of the normal flow.

Exception:

- emergency rollback or hotfix only when repository protections or delivery constraints make the branch flow impossible
- if that happens, open or update the issue and create follow-up documentation immediately so the audit trail is restored

## Autonomous Task Preflight

For every material task, Codex should inspect current development before deciding how to work.

Required preflight checks:

- current branch
- working tree cleanliness
- existing local worktrees for the repo
- existing local `codex/` branches for the repo
- matching Linear issues already `In Progress` or `In Review`

Hard gate:

- complete the branch or worktree decision before the first material edit
- do not start implementation on `main` and plan to move it later
- if the current checkout is `main` and the task is not a true emergency hotfix, create or switch to the correct `codex/` branch first
- if the current checkout is dirty and the right branch is unclear, stop and resolve the checkout strategy before touching code
- if local `main` is ahead of `origin/main`, stop treating it as a working branch; preserve the state on a `codex/` branch immediately and continue through a PR path
- if `.git/sequencer`, `CHERRY_PICK_HEAD`, `MERGE_HEAD`, or equivalent git-operation state is present, do not keep working in that checkout; either resolve the operation intentionally or move the new task to a clean worktree

Decision rules:

- continue the existing branch when the task is the same workstream and the current checkout is the right place to continue
- create a new branch when the repo checkout is clean and there is no conflicting in-progress work
- create a new worktree when another branch in the same repo is active, the current checkout is dirty, or parallel work must proceed without disturbing the active checkout
- stop and surface a blocker when another in-progress branch overlaps the same problem or files and the correct path is ambiguous

Clear direction:

- use a branch for normal feature, fix, docs, CI, and governance work
- use a worktree only when one repo needs two active local branches at the same time
- do not reach for a worktree for cross-repo coordination; use one repo-scoped branch per affected repo instead
- do not use local `main` as a staging area that will be sorted out later

Codex should not ask for permission for these normal control-plane actions. Branch creation, worktree creation, verification, issue sync, and merge execution are part of the autonomous operating model.

## Worktree Strategy

Use `git worktree` inside the individual repository that owns the code being changed.

Do:

- create worktrees for parallel work in the same repo
- create worktrees when you need a clean branch while preserving an in-progress checkout
- keep worktrees under `CodexWorkspace/.worktrees/<repo>/<branch>`
- remove merged or abandoned worktrees promptly
- run `git worktree prune` periodically when stale worktrees exist

Do not:

- treat the workspace governance repo as the git parent for child-repo work
- create one shared worktree that spans multiple child repos
- leave stale worktrees around indefinitely

If a repo needs config that differs per worktree, Git documents support for `extensions.worktreeConfig` and `git config --worktree`. Use that only when there is a real need for worktree-specific config.

Standard bootstrap command:

```bash
./scripts/git/new-repo-worktree.sh aadhaar-chain codex/example-branch
```

Repo-state recommendation command:

```bash
./scripts/git/repo-task-preflight.sh aadhaar-chain codex/example-branch
```

## Commit Strategy

Use local commits as honest checkpoints on the review branch.

Rules:

- use conventional commit prefixes when practical: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- checkpoint commits are allowed on a branch
- reviewable branches should still tell one coherent story
- do not rewrite shared branch history after review has started unless there is a concrete reason
- do not commit generated noise, local virtualenvs, local secrets, or editor state

Default merge result on `main`:

- one squashed commit per branch

## Publication Protocol

Branch creation is not sufficient. The durable handoff unit is:

- pushed branch
- open PR
- recorded head SHA

Required protocol:

- after the first meaningful checkpoint commit on a non-`main` branch, push with upstream and open a draft PR
- record the repo, branch, PR URL, and head SHA in the parent work item before moving attention elsewhere
- do not leave material changes only on a local branch or local `main`
- do not end a session with any affected repo in a local-only state

Hard gates:

- local `main` must never be ahead of `origin/main`
- a branch whose end-state still differs from `origin/main` must have an upstream remote branch
- a branch whose end-state still differs from `origin/main` must have an open PR unless it has already been merged
- current worktrees must be clean before claiming handoff complete
- behind-only local branches with no unique commits relative to `origin/main` are cleanup noise, not unpublished work; delete them during close-out, but do not treat them as publication blockers

Session-end enforcement:

- run `./scripts/workflow/repo-publication-sweep.sh` before closing a multi-repo or git-heavy session
- after pushing to any review branch with an open PR, run `python3 scripts/workflow/pr-review-sweep.py`
- if the latest head only leaves outdated unresolved threads, resolve them in the same workstream instead of waiting for a manual reminder
- do not end a session while the latest PR head still has failing checks or active unresolved review threads
- treat any failing result from that sweep as a blocker, not a reminder

Post-merge cleanup:

- fast-forward local `main` to `origin/main` after a merge lands
- delete local topic branches once the PR is merged or closed and no local-only work remains
- if a PR was squash-merged and the local topic branch still has unique commits but no tree diff versus `origin/main`, treat it as cleanup, not active unpublished work

## Merge Autonomy

Codex should merge to `main` autonomously when the policy gates are satisfied.

Required conditions:

- the branch is issue-scoped and independently reviewable
- the required local verification has passed
- any required runtime or browser validation has passed
- Linear and Notion state are synced where required
- the repository protection model allows the merge path being used

If the repo requires a PR, Codex should push the branch, update the issue with the branch and verification evidence, and complete the merge through the allowed review path. If protections permit direct fast-forward or squash merge from the CLI, Codex may complete that merge once the gates are satisfied.

Protected-branch recovery rules:

- do not attempt to push local-only work on protected `main` directly
- if a direct push is rejected because `main` contains local commits, branch from that exact state, push the branch, and continue with a PR
- when branch protection requires conversation resolution, check unresolved review threads before attempting merge
- when PR checks show repeated historical entries, evaluate the newest run for the current head SHA instead of assuming the full rollup is the active gate state

## Verification Gates

Verification is tiered. Do not treat "I changed the code" as completion.

### Before a Reviewable Commit

Run the fastest deterministic checks that prove the edited surface is still sane.

Examples:

- affected unit tests
- lint or typecheck for touched code paths
- compile or import validation for Python changes
- schema or migration validation when relevant

### Before Push or PR

Run the repo's required local verification entrypoints.

For application repos this usually means:

- lint
- tests
- typecheck or compile checks
- build when the change can affect build output
- targeted API or runtime checks when acceptance depends on integration

For the workspace governance repo this usually means:

- docs link and formatting checks when configured
- script smoke checks for changed operational scripts
- manual diff review for policy correctness

### Before Merge to `main`

All of the following must be true:

- protected-branch required checks are green
- required runtime or browser validation is complete for UI-critical work
- the branch has been reviewed for regressions or risky patterns
- issue status, docs, and durable memory reflect reality

OpenAI's Codex guidance is explicit here: do not stop at making a change; create or update tests when needed, run relevant checks, confirm the result, and review the work before accepting it.

## Browser Testing Order

For UI work:

1. deterministic checks first
2. targeted API or runtime checks second
3. browser testing last

Wallet flows, authenticated journeys, and live-browser attach workflows are governed by `docs/workflow/browser-testing-control-plane.md`.

## Hooks Strategy

Git hooks are local enforcement aids, not the final source of truth.

Use them for:

- commit message normalization
- fast pre-commit lint or unit checks
- blocking obvious bad pushes with `pre-push`

Do not rely on them as the only gate because Git documents that hooks like `pre-commit`, `pre-merge-commit`, and `commit-msg` can be bypassed with `--no-verify`.

Operational rule:

- repo-local hooks may block bad changes early
- protected branches plus CI remain the authoritative merge gate

## Repo-Class Defaults

### Governance Repo

Repository:

- `CodexWorkspace`

Default profile:

- small policy and docs branches
- squash merge to `main`
- no browser testing unless the change affects tooling UX
- script smoke checks when scripts change

### Application Repos

Repositories:

- `aadhaar-chain`
- `ondc-buyer`
- `ondc-seller`
- `flatwatch`

Default profile:

- issue-sized feature or fix branches
- stronger required checks than the governance repo
- browser testing for user-critical flows
- runtime validation when trust, auth, wallet, protocol, or backend integration is affected

Each application repo should document its concrete verification entrypoints in repo-local docs or scripts. This workspace document defines the policy layer, not each repo's test command list.

## Source Notes

Primary references used for this control plane:

- OpenAI Codex best practices: planning difficult work first and requiring testing plus review before acceptance
- Git `git-worktree` documentation: multiple working trees, `lock`, `prune`, and worktree-specific config
- Git `githooks` documentation: hook directories and bypass behavior
- GitHub protected branches documentation: PR reviews, status checks, linear history, deployments, and anti-bypass settings
- GitHub merge methods documentation: repository-level merge method enforcement and the tradeoffs between merge, squash, and rebase
- GitHub merge queue documentation: useful for busy branches, but adds `merge_group` CI requirements

Official sources:

- [OpenAI Codex best practices](https://developers.openai.com/codex/learn/best-practices)
- [Git `git-worktree` docs](https://git-scm.com/docs/git-worktree)
- [Git `githooks` docs](https://git-scm.com/docs/githooks)
- [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub merge methods](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/about-merge-methods-on-github)
- [GitHub merge queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)
