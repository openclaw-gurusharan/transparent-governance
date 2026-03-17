#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if ! command -v git >/dev/null 2>&1; then
  echo "error: git is required" >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "error: gh is required to verify PR state" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "error: gh auth status failed; cannot verify PR state" >&2
  exit 1
fi

declare -a DEFAULT_REPOS=(
  "CodexWorkspace:."
  "aadhaar-chain:aadhaar-chain"
  "ondc-buyer:ondc-buyer"
  "ondc-seller:ondc-seller"
  "flatwatch:flatwatch"
)

usage() {
  cat <<'EOF'
usage: ./scripts/workflow/repo-publication-sweep.sh [repo-name...]

Checks the managed workspace repositories for stranded git state:
- local-only commits on main
- unpublished branches
- diverged branches without open PRs
- dirty current worktrees

When repo names are provided, only those managed repos are checked.
Valid repo names:
- CodexWorkspace
- aadhaar-chain
- ondc-buyer
- ondc-seller
- flatwatch
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

declare -a TARGET_REPOS=()

if [[ "$#" -eq 0 ]]; then
  TARGET_REPOS=("${DEFAULT_REPOS[@]}")
else
  for requested in "$@"; do
    matched=0
    for entry in "${DEFAULT_REPOS[@]}"; do
      name="${entry%%:*}"
      if [[ "$requested" == "$name" ]]; then
        TARGET_REPOS+=("$entry")
        matched=1
        break
      fi
    done
    if [[ "$matched" -eq 0 ]]; then
      echo "error: unknown managed repo '$requested'" >&2
      usage >&2
      exit 1
    fi
  done
fi

issues=0

print_issue() {
  local repo="$1"
  local message="$2"
  issues=$((issues + 1))
  printf 'ISSUE [%s] %s\n' "$repo" "$message"
}

branch_tree_differs_from_main() {
  local repo_path="$1"
  local branch="$2"
  if git -C "$repo_path" diff --quiet "origin/main" "$branch" --; then
    return 1
  fi
  return 0
}

branch_upstream() {
  local repo_path="$1"
  local branch="$2"
  local upstream=""
  if upstream="$(git -C "$repo_path" rev-parse --abbrev-ref --symbolic-full-name "${branch}@{upstream}" 2>/dev/null)"; then
    printf '%s\n' "$upstream"
  fi
}

repo_slug_from_origin() {
  local repo_path="$1"
  local origin_url
  origin_url="$(git -C "$repo_path" remote get-url origin)"
  origin_url="${origin_url#git@github.com:}"
  origin_url="${origin_url#https://github.com/}"
  origin_url="${origin_url%.git}"
  printf '%s\n' "$origin_url"
}

branch_pr_state() {
  local repo_slug="$1"
  local branch="$2"
  gh pr list \
    --repo "$repo_slug" \
    --head "$branch" \
    --state all \
    --json state,mergedAt,number,url \
    --template '{{range .}}{{.state}}|{{if .mergedAt}}merged{{else}}not-merged{{end}}|{{.number}}|{{.url}}{{"\n"}}{{end}}'
}

check_worktree_cleanliness() {
  local repo_name="$1"
  local repo_path="$2"
  local current_branch
  current_branch="$(git -C "$repo_path" branch --show-current || true)"
  local status_output
  status_output="$(git -C "$repo_path" status --short)"

  if [[ -n "$status_output" ]]; then
    if [[ "$current_branch" == "main" ]]; then
      print_issue "$repo_name" "current checkout is dirty on main"
    else
      print_issue "$repo_name" "current checkout on branch '$current_branch' has uncommitted changes"
    fi
  fi
}

check_local_main() {
  local repo_name="$1"
  local repo_path="$2"
  if ! git -C "$repo_path" show-ref --verify --quiet refs/remotes/origin/main; then
    print_issue "$repo_name" "origin/main is missing after fetch"
    return
  fi

  local behind ahead
  read -r behind ahead < <(git -C "$repo_path" rev-list --left-right --count origin/main...main)
  if [[ "$ahead" -gt 0 ]]; then
    print_issue "$repo_name" "local main is ahead of origin/main by $ahead commit(s)"
  fi
}

check_branch_publication() {
  local repo_name="$1"
  local repo_path="$2"
  local repo_slug="$3"
  local branch="$4"

  if [[ "$branch" == "main" ]]; then
    return
  fi

  if ! branch_tree_differs_from_main "$repo_path" "$branch"; then
    return
  fi

  local upstream
  upstream="$(branch_upstream "$repo_path" "$branch")"
  if [[ -z "$upstream" ]]; then
    print_issue "$repo_name" "branch '$branch' differs from origin/main but has no upstream remote branch"
    return
  fi

  if ! git -C "$repo_path" rev-parse --verify --quiet "$upstream" >/dev/null; then
    print_issue "$repo_name" "branch '$branch' points at missing upstream '$upstream'"
    return
  fi

  local remote_behind local_ahead
  read -r remote_behind local_ahead < <(git -C "$repo_path" rev-list --left-right --count "${upstream}...${branch}")
  if [[ "$local_ahead" -gt 0 ]]; then
    print_issue "$repo_name" "branch '$branch' has $local_ahead unpushed commit(s) relative to $upstream"
  fi

  local pr_lines
  pr_lines="$(branch_pr_state "$repo_slug" "$branch")"
  local has_open_pr=0

  if [[ -n "$pr_lines" ]]; then
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      state="${line%%|*}"
      if [[ "$state" == "OPEN" ]]; then
        has_open_pr=1
      fi
    done <<< "$pr_lines"
  fi

  if [[ "$has_open_pr" -eq 0 ]]; then
    print_issue "$repo_name" "branch '$branch' differs from origin/main but has no open PR"
  fi
}

for entry in "${TARGET_REPOS[@]}"; do
  repo_name="${entry%%:*}"
  repo_rel="${entry#*:}"
  repo_path="$ROOT/$repo_rel"

  if [[ "$repo_rel" == "." ]]; then
    repo_path="$ROOT"
  fi

  if [[ ! -d "$repo_path/.git" ]]; then
    print_issue "$repo_name" "path '$repo_path' is not a git repository"
    continue
  fi

  echo "==> $repo_name"

  git -C "$repo_path" fetch origin --prune >/dev/null

  repo_slug="$(repo_slug_from_origin "$repo_path")"
  current_branch="$(git -C "$repo_path" branch --show-current || true)"
  worktree_count="$(git -C "$repo_path" worktree list --porcelain | grep -c '^worktree ' || true)"

  printf 'repo=%s\n' "$repo_name"
  printf 'path=%s\n' "$repo_path"
  printf 'current_branch=%s\n' "${current_branch:-detached}"
  printf 'worktree_count=%s\n' "$worktree_count"

  check_worktree_cleanliness "$repo_name" "$repo_path"
  check_local_main "$repo_name" "$repo_path"

  while IFS= read -r branch; do
    [[ -z "$branch" ]] && continue
    check_branch_publication "$repo_name" "$repo_path" "$repo_slug" "$branch"
  done < <(git -C "$repo_path" for-each-ref --format='%(refname:short)' refs/heads)

  echo
done

if [[ "$issues" -gt 0 ]]; then
  printf 'FAIL: %s issue(s) detected\n' "$issues" >&2
  exit 1
fi

echo "PASS: no stranded repo state detected"
