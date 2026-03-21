# Security Policy

## Scope

`andrewnordstrom-eng/.github-public` contains public-safe reusable GitHub workflows.
It must never include private infrastructure internals, private credentials, or private
automation playbooks.

## Threat Model

- Assume every public-repo PR can come from an untrusted fork.
- Assume reusable workflows are callable by any configured public repository.
- Treat write operations (labels, comments, merges, state sync) as privileged.

## Required Controls

- Pin all third-party actions to immutable commit SHAs.
- Keep top-level workflow permissions at `contents: read` and elevate per job only.
- Never use `secrets: inherit` in public caller workflows.
- For `pull_request_target`, enforce trusted-context guards and avoid untrusted checkout/exec.
- Use explicit, least-privilege secret mapping for Linear (`LINEAR_API_KEY_PUBLIC` lane).

## Reporting

Please report security issues privately via GitHub Security Advisories for this repository:

<https://github.com/andrewnordstrom-eng/.github-public/security/advisories/new>
