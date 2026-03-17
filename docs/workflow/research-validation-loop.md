# Research And Validation Loop

Use this when technical uncertainty affects architecture, dependencies, protocols, or security.

## Goal

Replace assumptions with inspected evidence.

## Default Order

1. Inspect the current repo state.
2. Inspect repo-local docs.
3. Use repo-grounded tools when helpful:
   - DeepWiki for repository structure and docs
   - Context7 for framework or library documentation
4. Use primary external docs for protocol or platform behavior.
5. Use broader web search only after primary sources or when corroboration is needed.

## Confidence Labels

- `High`: directly verified in code or official docs
- `Medium`: partly verified, some inference remains
- `Low`: limited evidence or conflicting signals

## Output Standard

When validation matters, distinguish:

- what is known
- what is inferred
- what remains unverified

## Failure Standard

- Missing access to a required verification source is a blocker, not a detail to route around.
- If the chosen operating model depends on a tool or source of truth, fix that dependency before proceeding whenever feasible.

## Tool Guidance

### Use repo inspection first

If the answer is visible in code, tests, or config, do not browse the web first.

### Use official docs for protocol truth

For ONDC, UCP, framework APIs, or security guidance, prefer official or primary sources.

### Use execution environments for large or complex intermediate work

If the task needs transformation, filtering, or heavy intermediate state, keep that work in tools or execution environments rather than prompt context.

## Why This Exists

This loop aligns with the underlying agent-harness lesson:

- repository knowledge should be the system of record
- agents need legible environments, not giant static prompts
- memory should store durable conclusions, not replace evidence gathering
