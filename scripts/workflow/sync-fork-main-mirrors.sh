#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

declare -a REPO_MAP=(
  "aadhaar-chain|openclaw-gurusharan/aadhaar-chain|ingpoc/aadhaar-chain"
  "ondc-buyer|openclaw-gurusharan/ondc-buyer|ingpoc/ondc-buyer"
  "ondc-seller|openclaw-gurusharan/ondc-seller|ingpoc/ondc-seller"
  "flatwatch|openclaw-gurusharan/flatwatch|ingpoc/flatwatch"
)

dry_run=0

usage() {
  cat <<'EOF'
usage: ./scripts/workflow/sync-fork-main-mirrors.sh [--dry-run] [repo-name...]

Synchronize the managed fork `main` branches so they exactly match the
corresponding upstream `main` branches.

Rules:
- `upstream/main` is the source of truth for application repos.
- `origin/main` is rewritten only from `upstream/main`, never the reverse.
- If the fork has unique `main` history, the script creates a timestamped backup
  branch before rewriting.
- Branch protection on the fork is restored after every sync attempt.

When repo names are provided, only those managed repos are synchronized.
Valid repo names:
- aadhaar-chain
- ondc-buyer
- ondc-seller
- flatwatch
EOF
}

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "error: required command '$cmd' is not installed" >&2
    exit 1
  fi
}

normalize_protection_payload() {
  local input_json="$1"
  local output_json="$2"
  python3 - "$input_json" "$output_json" <<'PY'
import json
import sys

source_path, dest_path = sys.argv[1], sys.argv[2]

with open(source_path, "r", encoding="utf-8") as handle:
    source = json.load(handle)

required_status_checks = source.get("required_status_checks")
if required_status_checks:
    required_status_checks = {
        "strict": required_status_checks.get("strict", False),
        "checks": [
            {
                "context": check["context"],
                "app_id": check.get("app_id"),
            }
            for check in required_status_checks.get("checks", [])
        ],
    }
else:
    required_status_checks = None

required_pull_request_reviews = source.get("required_pull_request_reviews")
if required_pull_request_reviews:
    required_pull_request_reviews = {
        "dismiss_stale_reviews": required_pull_request_reviews.get("dismiss_stale_reviews", False),
        "require_code_owner_reviews": required_pull_request_reviews.get("require_code_owner_reviews", False),
        "require_last_push_approval": required_pull_request_reviews.get("require_last_push_approval", False),
        "required_approving_review_count": required_pull_request_reviews.get("required_approving_review_count", 0),
    }
else:
    required_pull_request_reviews = None

restrictions = source.get("restrictions")
if restrictions:
    restrictions = {
        "users": [user["login"] for user in restrictions.get("users", [])],
        "teams": [team["slug"] for team in restrictions.get("teams", [])],
        "apps": [app["slug"] for app in restrictions.get("apps", [])],
    }
else:
    restrictions = None

payload = {
    "required_status_checks": required_status_checks,
    "enforce_admins": source.get("enforce_admins", {}).get("enabled", False),
    "required_pull_request_reviews": required_pull_request_reviews,
    "restrictions": restrictions,
    "required_linear_history": source.get("required_linear_history", {}).get("enabled", False),
    "allow_force_pushes": source.get("allow_force_pushes", {}).get("enabled", False),
    "allow_deletions": source.get("allow_deletions", {}).get("enabled", False),
    "block_creations": source.get("block_creations", {}).get("enabled", False),
    "required_conversation_resolution": source.get("required_conversation_resolution", {}).get("enabled", False),
    "lock_branch": source.get("lock_branch", {}).get("enabled", False),
    "allow_fork_syncing": source.get("allow_fork_syncing", {}).get("enabled", False),
}

with open(dest_path, "w", encoding="utf-8") as handle:
    json.dump(payload, handle, indent=2, sort_keys=True)
    handle.write("\n")
PY
}

repo_entry_for() {
  local requested="$1"
  local entry
  for entry in "${REPO_MAP[@]}"; do
    if [[ "${entry%%|*}" == "$requested" ]]; then
      printf '%s\n' "$entry"
      return 0
    fi
  done
  return 1
}

resolve_targets() {
  if [[ "$#" -eq 0 ]]; then
    printf '%s\n' "${REPO_MAP[@]}"
    return 0
  fi

  local requested
  for requested in "$@"; do
    if ! repo_entry_for "$requested" >/dev/null; then
      echo "error: unknown managed repo '$requested'" >&2
      usage >&2
      exit 1
    fi
  done

  for requested in "$@"; do
    repo_entry_for "$requested"
  done
}

sync_repo() {
  local name="$1"
  local fork_slug="$2"
  local upstream_slug="$3"

  local workdir
  workdir="$(mktemp -d "${TMPDIR:-/tmp}/fork-sync-${name}-XXXXXX")"
  local protection_json="$workdir/protection.json"
  local protection_payload="$workdir/protection-payload.json"

  echo "==> $name"
  git -C "$workdir" init -q
  git -C "$workdir" remote add origin "https://github.com/$fork_slug.git"
  git -C "$workdir" remote add upstream "https://github.com/$upstream_slug.git"
  git -C "$workdir" fetch --quiet --depth=200 origin main
  git -C "$workdir" fetch --quiet --depth=200 upstream main

  local origin_ref="refs/remotes/origin/main"
  local upstream_ref="refs/remotes/upstream/main"
  local origin_sha
  origin_sha="$(git -C "$workdir" rev-parse "$origin_ref")"
  local upstream_sha
  upstream_sha="$(git -C "$workdir" rev-parse "$upstream_ref")"

  echo "origin/main  $origin_sha"
  echo "upstream/main $upstream_sha"

  if [[ "$origin_sha" == "$upstream_sha" ]]; then
    echo "status: already synchronized"
    return 0
  fi

  local origin_is_ancestor=0
  if git -C "$workdir" merge-base --is-ancestor "$origin_ref" "$upstream_ref"; then
    origin_is_ancestor=1
  fi

  local backup_branch=""
  if [[ "$origin_is_ancestor" -eq 0 ]]; then
    backup_branch="codex/origin-main-backup-$(date -u +%Y%m%d%H%M%S)"
    echo "origin/main has unique history; backup branch: $backup_branch"
    if [[ "$dry_run" -eq 0 ]]; then
      gh api \
        --method POST \
        -H "Accept: application/vnd.github+json" \
        "repos/$fork_slug/git/refs" \
        -f ref="refs/heads/$backup_branch" \
        -f sha="$origin_sha" >/dev/null
    fi
  fi

  echo "capturing branch protection"
  gh api \
    -H "Accept: application/vnd.github+json" \
    "repos/$fork_slug/branches/main/protection" >"$protection_json"
  normalize_protection_payload "$protection_json" "$protection_payload"

  if [[ "$dry_run" -eq 1 ]]; then
    echo "dry-run: would rewrite $fork_slug main to $upstream_sha and restore protection"
    rm -rf "$workdir"
    return 0
  fi

  echo "temporarily removing branch protection"
  gh api \
    --method DELETE \
    -H "Accept: application/vnd.github+json" \
    "repos/$fork_slug/branches/main/protection" >/dev/null

  echo "rewriting fork main"
  if ! git -C "$workdir" push origin "$upstream_ref:refs/heads/main" --force-with-lease="main:$origin_sha" >/dev/null; then
    echo "rewrite failed; restoring branch protection" >&2
    gh api \
      --method PUT \
      -H "Accept: application/vnd.github+json" \
      "repos/$fork_slug/branches/main/protection" \
      --input "$protection_payload" >/dev/null
    rm -rf "$workdir"
    exit 1
  fi

  echo "restoring branch protection"
  gh api \
    --method PUT \
    -H "Accept: application/vnd.github+json" \
    "repos/$fork_slug/branches/main/protection" \
    --input "$protection_payload" >/dev/null

  git -C "$workdir" fetch --quiet origin main
  local verified_sha
  verified_sha="$(git -C "$workdir" rev-parse "$origin_ref")"
  if [[ "$verified_sha" != "$upstream_sha" ]]; then
    rm -rf "$workdir"
    echo "error: post-sync verification failed for $name" >&2
    exit 1
  fi

  echo "status: synchronized"
  rm -rf "$workdir"
}

main() {
  require_command git
  require_command gh
  require_command python3

  if ! gh auth status >/dev/null 2>&1; then
    echo "error: gh auth status failed; cannot manage fork syncs" >&2
    exit 1
  fi

  local args=()
  while [[ "$#" -gt 0 ]]; do
    case "$1" in
      --dry-run)
        dry_run=1
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        args+=("$1")
        ;;
    esac
    shift
  done

  local entry
  while IFS= read -r entry; do
    [[ -z "$entry" ]] && continue
    IFS='|' read -r name fork_slug upstream_slug <<<"$entry"
    sync_repo "$name" "$fork_slug" "$upstream_slug"
  done < <(resolve_targets "${args[@]}")
}

main "$@"
