# Browser Testing Control Plane

Use this workflow when browser validation matters for runtime state, authenticated flows, wallet extensions, or end-to-end UI behavior.

Companion quick reference:

- `docs/workflow/browser-testing-checklist.md`
- `docs/workflow/portfolio-browser-acceptance-loop.md` for same-user, cross-app acceptance runs

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

## Workspace Browser Standard

For this workspace, the default browser-testing target is the existing Chrome Beta debug session exposed on `127.0.0.1:9222` and backed by:

- profile: `~/.codex/chrome-beta-debug-profile`
- browser: `Google Chrome Beta`
- mode: live CDP reuse, not fresh browser launch

This is the workspace-standard browser for web testing because it contains the user's real extensions, wallet state, cookies, and settings. Treat this profile as the default for all browser testing in this workspace unless the user explicitly asks for a different browser context.

Operational rules:

1. if `curl -s http://127.0.0.1:9222/json/version` succeeds, reuse that session
2. do not launch a new Chrome, Chromium, or automation browser while that session is available
3. do not create a separate browser session for testing just because a tool can do so
4. prefer the user's already-open designated tab in that attached session
5. only open a new tab inside the existing attached session when the user explicitly approves it or no designated tab exists and the task cannot proceed otherwise
6. if the `9222` endpoint is unavailable, stop and ask before launching or replacing the debug session

This is stricter than the generic live-attach guidance because wallet, cookie, and extension-backed validation becomes invalid when the agent drifts into a clean browser.

MCP attachment rules:

- when Codex uses `chrome-devtools-mcp` against the live browser, configure it with `--browser-url=http://127.0.0.1:9222`
- do not combine `--browser-url` with `--channel`; that combination causes `chrome-devtools-mcp` startup failure and the browser tools will not register in the session
- start the Chrome Beta debug browser before starting the Codex session; if Codex starts first, the browser tools may not bind even when the config is otherwise correct
- for wallet or extension-backed flows, prefer attaching to the already-running debug browser over asking MCP to launch its own Chrome instance

## User-Managed Session Contract

For workflows that depend on login state, wallet state, or installed extensions:

1. prefer the user's already-open logged-in tab in the workspace-standard Chrome Beta profile
2. if that tab already exists, do not navigate a different live tab instead
3. if the required tab does not exist yet, ask the user to open the app in that profile and complete login or wallet setup before continuing
4. if the browser is open but the wrong profile is attached, stop and ask the user to relaunch the correct profile rather than continuing in the wrong context
5. do not treat a blank or automation-created page as an acceptable substitute for the user-managed tab when the flow depends on existing browser state

The default posture for authenticated or wallet-backed testing is: attach to the real profile, find the real tab, and use that exact tab. If the tab is missing, ask the user to create it first.

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

## UI Completion Gate

For UI-critical or interaction-critical changes:

- do not report the work as complete after lint, build, or unit tests alone
- treat browser validation as a required gate when the user-visible outcome depends on layout, responsive behavior, runtime interaction, wallet state, or authenticated browser state
- if browser validation is blocked by tooling or session setup, report the work as blocked on browser validation rather than complete
- only claim completion before a browser pass when the governing repo policy explicitly says browser validation is unnecessary for that surface

This rule exists to prevent "implemented" from being reported when the visual or interactive outcome is still unverified.

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

Execution recipe for this workspace:

1. verify `127.0.0.1:9222` is live
2. confirm the process is `Google Chrome Beta` using `~/.codex/chrome-beta-debug-profile`
3. inspect the live targets from `http://127.0.0.1:9222/json/list`
4. identify the already-open AadhaarChain or target-app tab the user intends to use
5. if no logged-in target tab exists, ask the user to open it and log in before proceeding
6. attach to that exact tab over CDP
7. only then begin DOM inspection, network inspection, or interaction

Do not skip from "debug endpoint is live" straight to browser actions. The tab-selection step is mandatory.

Hard rule for this workspace:

- when the Chrome Beta debug session on `127.0.0.1:9222` is live, agents must attach to and reuse it
- agents must not create a separate Chrome session for testing while that session is healthy
- agents must not treat "new browser tab" as the default first action; the default first action is attach, inspect existing tabs, and select the user-designated one
- agents must not proceed with authenticated or wallet-backed testing unless the target logged-in tab is already open or the user has explicitly been asked to open and log in to it first
- agents must not rely on a blank automation page when the real workflow requires the user's configured profile state

## Missing Session Handoff

If the workspace-standard Chrome Beta debug session cannot be found, the agent should hand the restart or launch command to the user instead of silently launching a fresh browser on its own.

Default handoff command:

```bash
if ! curl -sf http://127.0.0.1:9222/json/version >/dev/null; then
  open -na "Google Chrome Beta" --args \
    --remote-debugging-port=9222 \
    --user-data-dir="$HOME/.codex/chrome-beta-debug-profile"
fi
```

Use the force-restart variant only when the existing session is stale, bound to the wrong profile, or explicitly approved for replacement.

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
- when the Chrome Beta debug session is already open, never replace it with a fresh browser just to simplify automation

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

Examples of tooling-path failure that must be fixed before product conclusions:

- the browser tool is attached to a blank automation context instead of the live Chrome Beta debug-profile tab
- the `9222` endpoint is live but the expected logged-in app tab is missing
- the browser is open under the wrong profile and therefore missing required extensions or wallet state
- `chrome-devtools-mcp` is configured with mutually exclusive flags such as `--channel` and `--browser-url`, so Codex never receives the browser tool bindings even though the server appears enabled in config

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
- if `127.0.0.1:9222` is already live, reuse that Chrome Beta debug session and never spin up a separate Chrome session for testing
- if the `9222` session is missing and the user has not asked the agent to replace it, give the user the launch command rather than opening a different browser session
- if Chrome DevTools MCP tools are missing from the session, verify both the debug endpoint and the MCP args before blaming the browser state
