#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_REPOS = {
    "CodexWorkspace": ROOT,
    "aadhaar-chain": ROOT / "aadhaar-chain",
    "ondc-buyer": ROOT / "ondc-buyer",
    "ondc-seller": ROOT / "ondc-seller",
    "flatwatch": ROOT / "flatwatch",
}

PR_QUERY = """
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      url
      headRefName
      commits(last: 1) {
        nodes {
          commit {
            oid
            statusCheckRollup {
              state
              contexts(first: 50) {
                nodes {
                  __typename
                  ... on CheckRun {
                    name
                    status
                    conclusion
                    completedAt
                  }
                  ... on StatusContext {
                    context
                    state
                    createdAt
                  }
                }
              }
            }
          }
        }
      }
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          isOutdated
          path
          line
          comments(first: 1) {
            nodes {
              author {
                login
              }
            }
          }
        }
      }
    }
  }
}
"""

RESOLVE_MUTATION = """
mutation($threadId: ID!) {
  resolveReviewThread(input: {threadId: $threadId}) {
    thread {
      id
      isResolved
    }
  }
}
"""


def run(cmd: list[str], cwd: Path | None = None) -> str:
    result = subprocess.run(
        cmd,
        cwd=cwd,
        check=True,
        text=True,
        capture_output=True,
    )
    return result.stdout


def repo_slug(repo_path: Path) -> str:
    origin = run(["git", "-C", str(repo_path), "remote", "get-url", "origin"]).strip()
    origin = origin.removeprefix("git@github.com:")
    origin = origin.removeprefix("https://github.com/")
    return origin.removesuffix(".git")


def gh_json(args: list[str]) -> object:
    return json.loads(run(["gh", *args]))


def split_slug(slug: str) -> tuple[str, str]:
    owner, name = slug.split("/", 1)
    return owner, name


def list_open_prs(slug: str) -> list[dict]:
    data = gh_json(
        [
            "pr",
            "list",
            "--repo",
            slug,
            "--state",
            "open",
            "--json",
            "number,title,url,headRefName",
        ]
    )
    return list(data)


def fetch_pr(slug: str, number: int) -> dict:
    owner, name = split_slug(slug)
    data = gh_json(
        [
            "api",
            "graphql",
            "-f",
            f"query={PR_QUERY}",
            "-F",
            f"owner={owner}",
            "-F",
            f"name={name}",
            "-F",
            f"number={number}",
        ]
    )
    return data["data"]["repository"]["pullRequest"]


def resolve_thread(thread_id: str) -> None:
    gh_json(
        [
            "api",
            "graphql",
            "-f",
            f"query={RESOLVE_MUTATION}",
            "-F",
            f"threadId={thread_id}",
        ]
    )


def context_label(context: dict) -> str:
    if context["__typename"] == "CheckRun":
      if context.get("status") != "COMPLETED":
        return f'{context["name"]}:{context["status"]}'
      return f'{context["name"]}:{context.get("conclusion") or "UNKNOWN"}'
    return f'{context["context"]}:{context.get("state") or "UNKNOWN"}'


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check open PRs for latest-head CI failures and unresolved review threads."
    )
    parser.add_argument(
        "repos",
        nargs="*",
        help=f"Managed repo names: {', '.join(DEFAULT_REPOS)}",
    )
    parser.add_argument(
        "--resolve-outdated",
        action="store_true",
        help="Resolve outdated unresolved review threads automatically.",
    )
    args = parser.parse_args()

    selected = args.repos or list(DEFAULT_REPOS)
    unknown = [repo for repo in selected if repo not in DEFAULT_REPOS]
    if unknown:
        print(f"error: unknown managed repo(s): {', '.join(unknown)}", file=sys.stderr)
        return 2

    issues = 0

    for repo_name in selected:
        repo_path = DEFAULT_REPOS[repo_name]
        slug = repo_slug(repo_path)
        print(f"==> {repo_name}")
        prs = list_open_prs(slug)
        if not prs:
            print("open_prs=0\n")
            continue

        print(f"open_prs={len(prs)}")
        for pr in prs:
            pr_data = fetch_pr(slug, int(pr["number"]))
            commit = pr_data["commits"]["nodes"][0]["commit"]
            rollup = commit.get("statusCheckRollup") or {}
            check_state = rollup.get("state")
            contexts = rollup.get("contexts", {}).get("nodes", [])
            unresolved = [
                thread
                for thread in pr_data["reviewThreads"]["nodes"]
                if not thread["isResolved"]
            ]
            outdated = [thread for thread in unresolved if thread["isOutdated"]]
            active = [thread for thread in unresolved if not thread["isOutdated"]]

            if args.resolve_outdated and outdated:
                for thread in outdated:
                    resolve_thread(thread["id"])
                unresolved = active
                outdated = []

            print(f'pr={pr["number"]}')
            print(f'url={pr["url"]}')
            print(f'head_branch={pr_data["headRefName"]}')
            print(f'head_sha={commit["oid"]}')
            print(f'check_state={check_state or "NONE"}')
            print(f'unresolved_threads={len(unresolved)}')

            if check_state not in (None, "SUCCESS"):
                issues += 1
                failing_contexts = ", ".join(context_label(context) for context in contexts) or "no contexts"
                print(f'ISSUE [{repo_name}#{pr["number"]}] latest head checks not green: {failing_contexts}')

            if unresolved:
                issues += 1
                print(
                    f'ISSUE [{repo_name}#{pr["number"]}] unresolved review threads remain '
                    f'({len(active)} active, {len(outdated)} outdated)'
                )
                for thread in unresolved:
                    author = ""
                    comments = thread.get("comments", {}).get("nodes", [])
                    if comments:
                        author = comments[0].get("author", {}).get("login") or ""
                    print(
                        "  "
                        f'thread={thread["id"]} '
                        f'author={author or "unknown"} '
                        f'outdated={str(thread["isOutdated"]).lower()} '
                        f'path={thread["path"]} '
                        f'line={thread["line"] or 0}'
                    )
            print()

    if issues:
        print(f"FAIL: {issues} blocker(s) detected", file=sys.stderr)
        return 1

    print("PASS: no PR review blockers detected")
    return 0


if __name__ == "__main__":
    sys.exit(main())
