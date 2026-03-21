# .github-public

Public-safe reusable GitHub workflows for `andrewnordstrom-eng` public repositories.

## Workflow Namespace

Consumers should call workflows from this repository:

`uses: andrewnordstrom-eng/.github-public/.github/workflows/<workflow>.yml@v1`

For strict immutability, pin to a commit SHA.

## Secret Contract (Public Lane)

- `LINEAR_API_KEY_PUBLIC`: explicit repo secret used only for public-repo Linear automation.

Caller example:

```yaml
jobs:
  linear-policy:
    uses: andrewnordstrom-eng/.github-public/.github/workflows/linear-policy.yml@v1
    secrets:
      LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY_PUBLIC }}
```

## Security Rules

- Default permissions: `contents: read`.
- Elevate permissions per job only when required.
- No `secrets: inherit`.
- Pin third-party actions to immutable SHAs.
- Guard privileged pull request automations for trusted context only.

See [SECURITY.md](SECURITY.md) for the full policy.
