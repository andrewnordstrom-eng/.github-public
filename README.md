# .github-public

Public-safe reusable GitHub workflows for `andrewnordstrom-eng` public repositories.

## Workflow Namespace

Consumers should call workflows from this repository:

`uses: andrewnordstrom-eng/.github-public/.github/workflows/<workflow>.yml@<40-char-sha>`

SHA pinning is mandatory.

## Finding SHAs

Use this pattern in callers:

`uses: andrewnordstrom-eng/.github-public/.github/workflows/<workflow>.yml@<40-char-sha>`

To find the SHA safely:

- Open the target workflow file in this repo (for example, `.github/workflows/linear-policy.yml`).
- Open commit history for that file and copy the exact 40-character commit SHA you want to consume.
- Verify the commit message and diff match the behavior you intend to pin.
- Rotate to a newer SHA only when you need upstream fixes/features, and validate in CI before rollout.

Example:

`uses: andrewnordstrom-eng/.github-public/.github/workflows/linear-policy.yml@95df969e7a134d72f46ed33fd7519426e99503be`

## Secret Contract (Public Lane)

- `LINEAR_API_KEY_PUBLIC`: explicit repo secret used only for public-repo Linear automation.

Caller example:

```yaml
jobs:
  linear-policy:
    uses: andrewnordstrom-eng/.github-public/.github/workflows/linear-policy.yml@<40-char-sha>
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
