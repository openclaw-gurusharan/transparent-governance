# Notion Memory Control Plane

Notion is the durable memory system for this portfolio.

## Use Notion For

- architecture decision records
- research briefs
- governance notes
- roadmap narratives
- incident summaries
- cross-repo integration notes

Schema and retrieval contract:

- `docs/workflow/notion-agent-memory-schema.md`

## Do Not Use Notion For

- ephemeral chat transcript
- throwaway scratch notes
- code-level details that belong in the repository
- execution status that belongs in Linear

## Page Types

Recommended durable page types:

- `ADR`: decision, alternatives, rationale, consequences
- `Research`: source-backed findings and recommendation
- `Brief`: problem framing, goals, non-goals, constraints
- `Incident`: what happened, root cause, prevention

## Update Rules

- Create a new page when a decision or research artifact must be reusable later.
- Update an existing page when refining or superseding prior reasoning.
- When a page is superseded, add an explicit note and link to the governing replacement page instead of leaving multiple pages to imply authority.
- Link related Linear issues and GitHub PRs.
- Summarize reasoning; do not dump raw chat history.
- Use the typed agent-memory schema for reusable entries rather than ad-hoc titles and fields.
- Keep one clearly governing page per active architecture decision; older briefs may remain for history, but they must not read like the current source of truth.

## Memory Creation Threshold

Create or update an agent-memory entry when:

- a decision affects more than one repo
- a user gives a correction that should shape future work
- research produces a reusable recommendation
- a governance or integration constraint should be remembered

Do not create memory just because the session was long.

## Safety Rules

- Notion MCP has the same access as the authenticated Notion user account.
- Prefer human confirmation for writes that change broad shared documentation.
- If the workspace is not authenticated, do not pretend memory was stored.
