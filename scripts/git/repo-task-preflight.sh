#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "usage: $0 <repo-name> [candidate-branch]" >&2
  exit 1
fi

workspace_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
repo_name="$1"
candidate_branch="${2:-}"
repo_path="$workspace_root/$repo_name"

if [[ ! -d "$repo_path/.git" ]]; then
  echo "error: $repo_path is not a git repository" >&2
  exit 1
fi

current_branch="$(git -C "$repo_path" branch --show-current)"
status_output="$(git -C "$repo_path" status --short)"
is_dirty="no"
if [[ -n "$status_output" ]]; then
  is_dirty="yes"
fi

worktree_lines="$(git -C "$repo_path" worktree list --porcelain)"
worktree_count="$(printf '%s\n' "$worktree_lines" | grep -c '^worktree ' || true)"

local_codex_branches="$(git -C "$repo_path" for-each-ref --format='%(refname:short)' refs/heads/codex || true)"

recommendation="continue_current_branch"
reason="current checkout is the least disruptive place to continue"

if [[ "$current_branch" == "main" ]]; then
  if [[ "$is_dirty" == "yes" || "$worktree_count" -gt 1 ]]; then
    recommendation="create_worktree"
    reason="repo has dirty state or another worktree; isolate the next task"
  else
    recommendation="create_branch"
    reason="repo is clean on main and no parallel checkout exists"
  fi
elif [[ -n "$candidate_branch" && "$current_branch" != "$candidate_branch" ]]; then
  recommendation="create_worktree"
  reason="another non-main branch is already active; do not disturb it"
elif [[ "$is_dirty" == "yes" ]]; then
  recommendation="continue_current_branch"
  reason="active branch has uncommitted changes that likely belong to the current workstream"
fi

printf 'repo=%s\n' "$repo_name"
printf 'path=%s\n' "$repo_path"
printf 'current_branch=%s\n' "$current_branch"
printf 'dirty=%s\n' "$is_dirty"
printf 'worktree_count=%s\n' "$worktree_count"
printf 'recommendation=%s\n' "$recommendation"
printf 'reason=%s\n' "$reason"

if [[ -n "$candidate_branch" ]]; then
  printf 'candidate_branch=%s\n' "$candidate_branch"
fi

echo "local_codex_branches<<EOF"
if [[ -n "$local_codex_branches" ]]; then
  printf '%s\n' "$local_codex_branches"
fi
echo "EOF"

echo "status<<EOF"
if [[ -n "$status_output" ]]; then
  printf '%s\n' "$status_output"
fi
echo "EOF"
