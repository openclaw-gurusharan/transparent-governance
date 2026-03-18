# Chrome DevTools MCP

Chrome DevTools MCP is the workspace-standard browser inspection tool when the
agent must work against the user's existing Chrome Beta debug session rather
than a fresh automation browser.

## Server

- command: `npx`
- package: `chrome-devtools-mcp`
- transport: stdio

## Required Configuration

The active Codex config should attach to the running Chrome debug endpoint:

```toml
[mcp_servers.chrome-devtools]
command = "npx"
args = ["-y", "chrome-devtools-mcp", "--browser-url=http://127.0.0.1:9222"]
startup_timeout_sec = 60.0
tool_timeout_sec = 120.0
```

## Critical Rules

- Start Chrome Beta with remote debugging on `127.0.0.1:9222` before starting a
  fresh Codex session.
- Use `--browser-url=http://127.0.0.1:9222` when attaching to the running debug
  browser.
- Do not combine `--browser-url` with `--channel`; the server rejects that
  combination and the browser tools will never register.
- Do not rely on MCP launching its own browser for wallet or extension-backed
  flows. The launched browser path can omit the user's real profile state and
  may disable extensions by default.

## Workspace Browser Target

- browser: `Google Chrome Beta`
- profile: `~/.codex/chrome-beta-debug-profile`
- launch helper: `scripts/browser/launch-chrome-beta-debug.sh`
- convenience alias: `chromebeta-cdp`

## Verification

Before opening Codex, verify the browser endpoint is live:

```bash
curl http://127.0.0.1:9222/json/version
```

Then verify Codex sees the MCP server:

```bash
codex mcp list
```

Expected shape:

- `chrome-devtools` is `enabled`
- the args include only `--browser-url=http://127.0.0.1:9222`

## Failure Mode We Hit

The following misconfiguration breaks MCP startup:

```toml
args = ["-y", "chrome-devtools-mcp", "--channel=beta", "--browser-url=http://127.0.0.1:9222"]
```

Reason:

- `chrome-devtools-mcp` treats `--channel` and `--browser-url` as mutually
  exclusive.
- Codex can still show the server as `enabled` in config, but the MCP
  handshake will fail and the `mcp__chrome_devtools__*` tools will not appear
  in the session.
