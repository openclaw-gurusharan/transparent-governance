# Browser Testing Checklist

Short checklist for efficient browser-based testing in this workspace.

Use this with `docs/workflow/browser-testing-control-plane.md`, not instead of
it.

## Preflight

1. Start the workspace browser:
   `chromebeta-cdp`
2. Verify the debug endpoint:
   `curl http://127.0.0.1:9222/json/version`
3. Start a fresh Codex session only after `9222` is live.
4. Confirm the required app servers and backends are running before opening the
   browser flow.
5. Prefer existing logged-in tabs in the Chrome Beta debug profile over opening
   new ones.

## MCP Sanity Check

1. `codex mcp list` should show `chrome-devtools` as `enabled`.
2. The active config should use:
   `--browser-url=http://127.0.0.1:9222`
3. Do not combine `--browser-url` with `--channel`.
4. If `mcp__chrome_devtools__*` tools are missing from the session, treat that
   as a tooling-path failure before drawing app conclusions.

## Fast Action Loop

1. `list_pages`
2. `select_page`
3. `take_snapshot`
4. `list_console_messages`
5. `list_network_requests`
6. Only then interact with the page using `click`, `fill`, `fill_form`, or
   `evaluate_script`
7. After interaction, use `wait_for` when there is a stable text checkpoint
8. Pull full request bodies with `get_network_request` only for suspicious
   request IDs
9. Use `take_screenshot` only when visual evidence is actually needed

## Default Tool Choices

- prefer `take_snapshot` over screenshots for structure and state
- prefer `evaluate_script` over repeated DOM clicking when checking app state
- prefer `fill_form` over many individual fills when several inputs are present
- prefer `list_network_requests` over guessing whether a backend call happened
- prefer `list_console_messages` before assuming a UI bug is purely cosmetic

## Wallet And Extension Flows

1. Reuse the existing Chrome Beta debug profile.
2. Confirm the expected wallet extension is present before touching the app.
3. Treat signature approval as a human handoff unless the repo has a proven
   automation harness for it.
4. Stay on the same approved tab after wallet actions; do not bounce to a
   different tab unless required by the real flow.

## Failure Classification

Every browser failure should be classified as one of:

- product bug
- missing backend or runtime dependency
- wrong browser profile or missing extension state
- MCP or browser-session startup failure

Do not collapse these into one generic “app broken” result.

## Minimal Evidence For Each App

Capture at least:

- page or route tested
- visible UI state
- console errors
- key failed network requests
- whether the failure is product behavior or environment/tooling

## Good Stop Conditions

Stop and ask or fix the setup first if:

- `9222` is not live
- the Chrome DevTools MCP tools are missing from the session
- the wrong Chrome profile is attached
- the required logged-in or wallet-prepared tab is missing
- the backend needed for the flow is clearly down
