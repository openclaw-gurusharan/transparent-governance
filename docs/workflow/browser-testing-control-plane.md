# Browser Testing Control Plane

Use this workflow when browser validation matters for runtime state, authenticated flows, wallet extensions, or end-to-end UI behavior.

## Goals

- keep browser testing deterministic enough to be reviewable
- avoid launching clean browser sessions when the real flow depends on existing auth or wallet state
- minimize user interruption by defining explicit human handoff points
- capture browser findings in Linear and durable memory when they change future execution

## Validation Order

1. run repo-local deterministic checks first
2. run targeted API or runtime checks second
3. run browser testing only after the first two layers are green or the browser itself is the suspected failure point
4. rerun the smallest meaningful verification set after each browser-found fix

## Tool Selection

Use the lightest tool that can validate the real behavior:

- `chrome-devtools` MCP for DOM inspection, console errors, network inspection, and non-extension UI validation
- live-browser attach over CDP when the user already has the required browser profile, login state, cookies, or wallet extensions installed
- Comet only for exploratory browser checks or flows that do not require extension popup control
- repo-native E2E harnesses such as Playwright or Synpress when the flow must become repeatable in CI or across sessions

Do not default to a fresh automation browser for wallet flows, extension signing, or authenticated journeys that depend on the user's installed browser state.

## Preflight Checklist

Before any browser action, answer these questions explicitly:

1. does this flow require existing auth, cookies, wallet state, or browser extensions
2. which browser and profile actually contains that state
3. which wallet extension is installed in that browser
4. does the app under test support that wallet extension right now
5. which exact tab will be used for the run
6. where is the human handoff point for signing, approval, or OTP-style actions
7. is the CDP attach endpoint already live and verified

If any answer is unknown, stop and resolve it before opening automation tabs or drawing conclusions from the browser run.

## Live Browser Attach Policy

For wallet or authenticated flows, prefer the user's existing browser context over a new automation browser.

Required flow:

1. confirm the app under test is already running locally
2. confirm the installed browser actually contains the required extension and session state
3. if Chrome remote debugging is needed, launch a debuggable copy of the user's profile instead of the default profile
4. attach over CDP
5. use the tab the user designates; do not create or repurpose tabs unless explicitly requested
6. pause at wallet-signing or approval prompts so the user can complete the human-controlled action
7. resume inspection only after the user signals that approval is complete

## Chrome Constraint

Recent Chrome builds ignore remote debugging flags on the default real profile. For attach-based testing, use a copied profile plus an explicit `--user-data-dir` and launch the browser binary directly rather than relying on `open -a`.

Example macOS pattern:

```bash
pkill -f "Google Chrome Beta"
mkdir -p "$HOME/.codex"
rm -rf "$HOME/.codex/chrome-beta-debug-profile"
cp -R "$HOME/Library/Application Support/Google/Chrome Beta" "$HOME/.codex/chrome-beta-debug-profile"
"/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta" \
  --user-data-dir="$HOME/.codex/chrome-beta-debug-profile" \
  --profile-directory="Default" \
  --remote-debugging-port=9222
```

Verify the attach endpoint before starting browser work:

```bash
curl -s http://127.0.0.1:9222/json/version
```

Reusable launcher and endpoint checks live in:

- `scripts/browser/launch-chrome-beta-debug.sh`
- `scripts/browser/check-cdp-endpoint.sh`

## Wallet Flow Rules

- verify that the app supports the wallet extension available in the attached browser before starting the flow
- treat wallet signing as a human handoff point unless the repo has a proven automated wallet harness
- inspect the post-sign state in the same tab the user approved from
- if the browser profile contains a different wallet than the app expects, fix the adapter mismatch before spending more time on browser debugging
- prefer the user's designated tab; do not navigate another live tab on the user's behalf once a test tab has been nominated

## Evidence Capture

Every meaningful browser run should record:

- browser mode used: fresh browser, live attach, or repo E2E harness
- exact journey exercised
- visible result
- console or network failures, if any
- whether the run was blocked by browser/session/tooling constraints

Store the outcome in:

- Linear for execution status and review evidence
- Notion only when the finding changes future governance, tool choice, or architecture decisions

## Failure Handling

If browser testing fails because of tooling rather than product behavior:

- stop and classify the failure correctly
- fix the browser/session/tooling path first
- do not report product conclusions from an invalid browser environment
- update the control-plane docs or reusable scripts if the failure exposed a recurring setup gap

If the flow depends on browser state that is unavailable in automation:

- switch to live-browser attach
- or create a follow-up issue for a repeatable E2E harness

## Escalation Threshold

Create or update a durable memory note when browser testing reveals a reusable constraint such as:

- wallet-extension requirements
- browser security restrictions that change attach strategy
- stable human-in-the-loop testing handoffs
- a new standard tool choice for authenticated or extension-backed flows

## Session Introspection Updates

This workflow was tightened after friction from a live wallet-testing session. The main corrective rules are:

- choose the browser mode first; do not discover mid-run that a clean automation browser cannot exercise the real flow
- confirm the installed wallet before touching the app, because wallet-adapter mismatch is a setup bug, not a product finding
- prefer direct browser-binary launch over `open -a` when a debuggable Chrome copy is required
- require a designated user tab before attach-driven testing begins
- treat browser-tooling failure as its own class of blocker and fix it before resuming product validation
