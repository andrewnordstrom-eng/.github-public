# Contributing

## Purpose

This repository provides reusable workflows for public repositories. Keep changes small,
auditable, and security-first.

## Pull Request Requirements

- Open PRs against `main`.
- Resolve all review conversations before merge.
- Pass all required checks:
  - `workflow-lint`
  - `workflow-policy`
  - `security-self-scan`
- Use immutable action pins (full commit SHAs).
- Keep top-level permissions minimal (`contents: read`).
- Use explicit secrets in callers. Do not use `secrets: inherit`.

## Safe Change Process

1. Update one workflow at a time when possible.
2. Include threat-model notes in PR description for privileged behavior changes.
3. Run local checks before pushing:
   - `python3 .github/scripts/workflow_policy_check.py --root .github/workflows`
4. Validate canary behavior in `bluesky-community-feed` before broader rollout.
