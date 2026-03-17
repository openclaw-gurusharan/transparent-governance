# Notion Agent Memory Schema

This document defines the durable memory model for this workspace.

## Purpose

The Notion agent-memory database stores reusable knowledge that should survive beyond a single session and be retrievable by future agents.

It is not:

- a task tracker
- a codebase mirror
- a raw transcript dump
- a substitute for repository docs

## Design Principles

- Memory must be typed.
- Memory must be scoped.
- Memory must be reviewable.
- Memory must be searchable.
- Memory must be allowed to become stale and be superseded explicitly.

## Recommended Database Name

`Agent Memory`

## Core Properties

| Property | Type | Required | Purpose |
|----------|------|----------|---------|
| `Title` | title | yes | short memory title |
| `Memory Type` | select | yes | kind of memory being stored |
| `Scope` | select | yes | where the memory applies |
| `Repo` | select | yes | owning repo or `shared` |
| `Status` | select | yes | lifecycle state |
| `Confidence` | select | yes | confidence in the memory |
| `Summary` | rich_text | yes | short reusable summary |
| `Details` | rich_text | yes | durable explanation |
| `Source Type` | select | yes | where the memory came from |
| `Source Link` | url | no | supporting external or internal link |
| `Linear Issue` | url | no | related execution issue |
| `GitHub PR` | url | no | related code change |
| `Validated On` | date | no | last validation date |
| `Review Due` | date | no | revalidation date |
| `Supersedes` | relation/self or rich_text | no | previous memory replaced by this one |
| `Tags` | multi_select | no | retrieval terms |
| `Decision` | select | no | adopt / avoid / monitor / superseded |

## Enumerations

### Memory Type

- `ADR`
- `Research`
- `Correction`
- `Domain Fact`
- `Integration Note`
- `Governance Note`
- `Incident Note`

### Scope

- `global`
- `workspace`
- `repo`
- `personal`

### Repo

- `shared`
- `aadhaar-chain`
- `ondc-buyer`
- `ondc-seller`
- `flatwatch`

### Status

- `candidate`
- `validated`
- `superseded`
- `stale`

### Confidence

- `high`
- `medium`
- `low`

### Source Type

- `user`
- `repo-doc`
- `repo-code`
- `official-doc`
- `research-article`
- `linear`
- `github`
- `inference`

### Decision

- `adopt`
- `avoid`
- `monitor`
- `superseded`

## Write Rules

Create or update memory only when the knowledge is reusable and non-trivial.

Good candidates:

- a cross-repo architecture decision
- a protocol integration constraint
- a user correction that future work must respect
- a reusable research conclusion
- a governance rule that should be remembered later

Bad candidates:

- temporary debugging steps
- a one-off shell command
- session chatter
- code details already obvious from the repo

## Retrieval Rules

Retrieve memory by:

- repo
- memory type
- status
- tags
- related issue or PR

Preferred retrieval order:

1. `validated`
2. `candidate` if nothing validated exists
3. ignore `superseded` unless researching history
4. treat `stale` as warning-only

## Lifecycle

1. `candidate`
   Memory is proposed but not yet trusted as durable guidance.
2. `validated`
   Memory is considered reusable.
3. `stale`
   Memory may still help but should be rechecked.
4. `superseded`
   Memory should no longer guide decisions.

## Placement Rules

- Repository technical truth stays in repo docs and code.
- Execution state stays in Linear.
- Reusable institutional knowledge goes into Notion memory.

## Example Records

### Example 1

- Title: `Do not put raw identity data on public chain`
- Memory Type: `ADR`
- Scope: `workspace`
- Repo: `shared`
- Status: `validated`
- Confidence: `high`
- Decision: `avoid`

### Example 2

- Title: `Use project-level Codex MCP config before wrapper MCP scripts`
- Memory Type: `Governance Note`
- Scope: `workspace`
- Repo: `shared`
- Status: `validated`
- Confidence: `high`
- Decision: `adopt`

### Example 3

- Title: `ONDC and UCP should be integrated through explicit adapters`
- Memory Type: `Integration Note`
- Scope: `workspace`
- Repo: `shared`
- Status: `candidate`
- Confidence: `medium`
- Decision: `adopt`

