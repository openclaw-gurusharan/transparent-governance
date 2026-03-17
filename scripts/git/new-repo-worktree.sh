#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "usage: $0 <repo-name> <branch-name> [base-branch]" >&2
  exit 1
fi

workspace_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
repo_name="$1"
branch_name="$2"
base_branch="${3:-main}"
repo_path="$workspace_root/$repo_name"
worktree_path="$workspace_root/.worktrees/$repo_name/$branch_name"

if [[ ! -d "$repo_path/.git" ]]; then
  echo "error: $repo_path is not a git repository" >&2
  exit 1
fi

mkdir -p "$(dirname "$worktree_path")"

git -C "$repo_path" fetch origin "$base_branch" --prune

if git -C "$repo_path" show-ref --verify --quiet "refs/heads/$branch_name"; then
  git -C "$repo_path" worktree add "$worktree_path" "$branch_name"
else
  git -C "$repo_path" worktree add -b "$branch_name" "$worktree_path" "origin/$base_branch"
fi

echo "Created worktree:"
echo "  repo:    $repo_path"
echo "  branch:  $branch_name"
echo "  path:    $worktree_path"
