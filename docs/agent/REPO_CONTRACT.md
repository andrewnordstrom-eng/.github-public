# Repo Contract - .github-public

Status: canonical repo contract
Owner: org-infra
Service class: public_shared_workflow_repo
Contract version: 1
Last updated: 2026-05-13
Last verified: 2026-05-13

> Stable reference for agents and contributors working on the public-safe reusable workflow lane.

---

## 1. What This Repo Is

`.github-public` publishes reusable GitHub Actions workflows that public `andrewnordstrom-eng` repositories can call without inheriting private-org assumptions.

- **Repo:** [andrewnordstrom-eng/.github-public](https://github.com/andrewnordstrom-eng/.github-public)
- **Service class:** `public_shared_workflow_repo`
- **Linear project:** [Org Infrastructure](https://linear.app/andrewnord/project/org-infrastructure-7cf2cf2d8d6c)

## 2. Why It Exists

Public repositories need reusable CI, Linear, review, security, and maintenance workflows that are safe to expose publicly. This repo separates that public workflow lane from the private `.github` control-plane repo.

## 3. System Shape

```text
.github-public/
├── .github/
│   ├── CODEOWNERS
│   ├── scripts/
│   │   └── workflow_policy_check.py
│   └── workflows/
│       ├── coderabbit-freshness.yml
│       ├── coderabbit-thread-check.yml
│       ├── dependabot-automerge.yml
│       ├── internal-tooling-hygiene.yml
│       ├── issue-intake-triage.yml
│       ├── issue-to-linear.yml
│       ├── linear-policy.yml
│       ├── linear-state-sync.yml
│       ├── pr-to-linear.yml
│       ├── quality-gate.yml
│       ├── release-notes.yml
│       ├── secret-scan.yml
│       ├── security-gate.yml
│       ├── security-self-scan.yml
│       ├── stale-triage.yml
│       ├── workflow-lint.yml
│       └── workflow-policy.yml
├── CONTRIBUTING.md
├── README.md
├── SECURITY.md
└── docs/
    └── agent/
        └── REPO_CONTRACT.md
```

There is no application runtime. The repo is a public reusable-workflow surface.

## 4. Key Files and Directories

| File / Dir | Purpose |
|-----------|---------|
| `.github/workflows/` | Public-safe reusable workflows and self-check workflows |
| `.github/scripts/workflow_policy_check.py` | Local workflow policy validator for public workflow constraints |
| `README.md` | Public entrypoint and workflow caller pinning guidance |
| `CONTRIBUTING.md` | Public workflow change process |
| `SECURITY.md` | Public security policy |

## 5. Build / Test / Run Commands

Run from the `.github-public` repo root:

```bash
python3 .github/scripts/workflow_policy_check.py --root .github/workflows
```

Run from the workspace root:

```bash
python3 .github/ops/flow.py validate-contract --strict github-public
python3 .github/ops/flow.py validate-contract --strict .github-public
```

Both keys are valid. `github-public` is the canonical project key and `.github-public` is the compatibility alias; both must succeed with non-empty validation receipt fields.

Validation coverage expectation: the canonical key succeeds with receipt fields, the compatibility alias succeeds with receipt fields, and documented examples match the accepted project keys in validation logic.

## 6. Downstream Consumption

Public repos call reusable workflows from this repo with immutable 40-character commit SHAs:

```yaml
jobs:
  quality-gate:
    uses: andrewnordstrom-eng/.github-public/.github/workflows/quality-gate.yml@<40-char-sha>
```

Mutable refs like `@main`, tags, or branch names are not valid caller refs.

## 7. Linked Deeper Docs

| Doc | Location |
|-----|----------|
| Public workflow usage | `README.md` |
| Public workflow change process | `CONTRIBUTING.md` |
| Security policy | `SECURITY.md` |
| Org service class registry | `.github/ops/SERVICE_CLASSES.yaml` in the private `.github` repo |

## 8. Known Gotchas

1. Public workflows must not rely on private repo secrets unless the caller passes an explicit public-safe secret.
2. Reusable workflow callers must use immutable commit SHAs.
3. Privileged pull request behavior must stay guarded for trusted context only.
4. PROJ-522 approved private `.github` workflow pin: `16278305236d6725ade3c7bbfdf74fe5c373efbb`. This supersedes the earlier `e9f96c4ad018dad850b927c40aa0cc1481ff6e5c` target because the final PROJ-514 packet added org-root startup-reference resolution and local guardrail hardening after that earlier candidate.

| Workflow | Approved private `.github` SHA | Current required value |
|----------|--------------------------------|------------------------|
| `.github/workflows/coderabbit-thread-check.yml` | `16278305236d6725ade3c7bbfdf74fe5c373efbb` | `andrewnordstrom-eng/.github/.github/workflows/coderabbit-thread-check.yml@16278305236d6725ade3c7bbfdf74fe5c373efbb` |

The local workflow policy check records this approved SHA and fails when the actual caller pin drifts from it.

## 9. Where to Get Live State

| Signal | How to check |
|--------|-------------|
| Contract compliance, canonical key | `python3 .github/ops/flow.py validate-contract --strict github-public` from the workspace root |
| Contract compliance, compatibility alias | `python3 .github/ops/flow.py validate-contract --strict .github-public` from the workspace root |
| Public workflow policy | `python3 .github/scripts/workflow_policy_check.py --root .github/workflows` from this repo |
| Workflow caller pin inventory | `rg -n "^\\s*uses:\\s*" .github/workflows` |
| Mutable workflow ref enforcement | `rg -n -P "^\\s*uses:\\s*.+@(?![0-9a-fA-F]{40}\\b)[^\\s#]+" .github/workflows` |

```bash
# Inventory: lists every reusable-workflow or action reference.
rg -n "^\s*uses:\s*" .github/workflows

# Enforcement: expected output is empty; matches refs like @main, @v2, or @release/2026-05, not full 40-character SHAs.
rg -n -P "^\s*uses:\s*.+@(?![0-9a-fA-F]{40}\b)[^\s#]+" .github/workflows
```
