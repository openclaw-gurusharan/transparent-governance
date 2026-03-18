# Portfolio Browser Acceptance Loop

Use this workflow when the goal is to validate the portfolio as one user-visible
system rather than as isolated app shells.

This is the canonical workflow for:

- first-time-user portfolio validation
- same-wallet cross-app trust validation
- pre-demo or pre-release browser acceptance testing
- browser-driven bug fixing that must leave behind execution and memory artifacts

Read this together with:

- `docs/workflow/browser-testing-control-plane.md`
- `docs/workflow/cross-repo-execution-loop.md`
- `docs/workflow/linear-issue-control-plane.md`
- `docs/workflow/notion-memory-control-plane.md`

## Why This Exists

The portfolio promise is cross-app trust, not four disconnected UIs.

A meaningful acceptance run must answer:

- can one user start in `aadhaar-chain` and establish trust state
- do `ondc-buyer`, `ondc-seller`, and `flatwatch` read that state correctly
- are browser-visible gates, prompts, and links coherent across apps
- when the browser exposes failures, are they fixed or routed into explicit issues

## Standard Journey

Use one designated user identity for the full run:

- one wallet across all wallet-backed flows
- one logged-in browser profile in Chrome Beta debug mode
- one consistent user persona across all apps

Default journey order:

1. `aadhaar-chain`
   Create or confirm the wallet-bound identity anchor first.
   Then run the verification and credential surfaces that publish trust state.
2. `ondc-buyer`
   Confirm trust status visibility before testing search, result browsing, and checkout-adjacent behavior.
3. `ondc-seller`
   Confirm seller trust gating before testing dashboard, catalog, edit, and configuration surfaces.
4. `flatwatch`
   Confirm trust visibility before testing dashboard, evidence, challenge, or transparency actions.

Do not start downstream app conclusions while the trust substrate is clearly down.

## Preconditions

Before opening the journey:

1. Reuse the Chrome Beta debug profile on `127.0.0.1:9222`.
2. Confirm the required wallet extension is installed in that profile.
3. Start the local app servers and required backends.
4. If a dependency is found to be missing during setup, classify the reason:
   - product bug
   - missing runtime dependency
   - wrong browser profile or session
   - missing backend
5. Create or confirm Linear issues before material fixes begin.

## Fix-As-You-Test Rule

When browser testing exposes a real prerequisite defect:

- fix it in the active workstream if it blocks the acceptance journey
- rerun the smallest meaningful browser checkpoint after the fix
- do not leave a blocker unfixed and then continue pretending later results are valid

Examples of defects that should be fixed immediately when feasible:

- local runtime defaults point to the wrong host or port
- a backend cannot boot because required local dependencies are invalid
- browser-visible trust links route to the wrong local surface
- console or network failures prevent the core journey from progressing

Examples that may become follow-up issues instead:

- non-blocking UI polish
- secondary routes outside the current acceptance path
- known feature gaps that do not invalidate the main portfolio story

## Evidence Standard

For each app, capture:

- route or journey exercised
- visible user-facing state
- console failures
- key failed or suspicious network requests
- whether the result is valid product behavior or a tooling/runtime problem
- post-fix rerun result when a blocker was repaired

## Required Execution Artifacts

This workflow should leave behind explicit execution state, not just chat history.

### Linear

Create or update one testing issue per app in that app's project board.

Each issue should capture:

- that the work is browser acceptance testing
- the same-user cross-app journey being exercised
- exact browser mode used
- current blockers and fixes
- acceptance criteria for the app's role in the portfolio flow

Recommended issue title pattern:

- `{repo}: Browser acceptance: first-time portfolio user journey`

### Notion

Maintain one durable browser-testing memory per app and update it over time.

Create or update the memory when the run establishes reusable knowledge such as:

- required local startup order
- same-wallet identity assumptions
- trust-state expectations for that app
- recurring browser/tooling constraints
- stable acceptance checkpoints that future sessions should rerun

Do not create duplicate memories for every run. Update the canonical app memory when the workflow is being refined.

Recommended memory title pattern:

- `{repo}: browser acceptance journey`

## Output Of A Successful Run

A successful run leaves the workspace with:

- the trust substrate validated first
- downstream trust consumers checked against the same user identity
- blocking defects fixed or routed into explicit follow-up issues
- one current Linear testing issue per app
- one current Notion memory per app for the reusable test journey

## Session Introspection Requirement

After the run:

1. update the Linear issues with verification evidence and residual gaps
2. update the relevant Notion memories with reusable findings
3. revise this workflow if the session exposed a better sequence, a missing prerequisite, or a repeated failure mode

This workflow is expected to evolve. The goal is not to freeze it early; the goal
is to keep improvements inside the governing procedure instead of losing them in
session-only history.
