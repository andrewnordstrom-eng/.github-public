#!/usr/bin/env python3
"""Policy checks for reusable GitHub workflows."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


SHA_REF_RE = re.compile(r"@[0-9a-f]{40}$")
USES_RE = re.compile(r"^\s*uses:\s*([^\s#]+)", re.MULTILINE)
TOP_KEY_RE = re.compile(r"^[A-Za-z0-9_-]+:")


def iter_workflows(root: Path) -> list[Path]:
    return sorted(p for p in root.glob("*.yml") if p.is_file())


def top_permissions_block(text: str) -> str:
    lines = text.splitlines()
    in_block = False
    block: list[str] = []
    for line in lines:
        if not in_block:
            if line.strip() == "permissions:" and not line.startswith((" ", "\t")):
                in_block = True
                block.append(line)
            continue
        if not line.strip():
            block.append(line)
            continue
        if not line.startswith((" ", "\t")) and TOP_KEY_RE.match(line):
            break
        block.append(line)
    return "\n".join(block).strip()


def check_uses_refs(path: Path, text: str) -> list[str]:
    errors: list[str] = []
    for match in USES_RE.finditer(text):
        ref = match.group(1)
        if ref.startswith("./"):
            continue
        if ref.startswith("docker://"):
            errors.append(f"{path.name}: docker:// actions are not allowed in public workflows ({ref}).")
            continue
        if "@" not in ref:
            errors.append(f"{path.name}: action ref missing immutable pin ({ref}).")
            continue
        if not SHA_REF_RE.search(ref):
            errors.append(f"{path.name}: action ref must be pinned to a full commit SHA ({ref}).")
    return errors


def check_top_permissions(path: Path, text: str) -> list[str]:
    errors: list[str] = []
    block = top_permissions_block(text)
    if not block:
        errors.append(f"{path.name}: top-level permissions block is required.")
        return errors
    if "contents: read" not in block:
        errors.append(f"{path.name}: top-level permissions must include 'contents: read'.")
    for line in block.splitlines():
        stripped = line.strip().lower()
        if ":" not in stripped:
            continue
        if stripped in {"permissions:", "contents: read"}:
            continue
        if stripped.endswith(": write") or stripped.endswith(": admin"):
            errors.append(f"{path.name}: top-level permissions must not grant write/admin ({stripped}).")
    return errors


def check_pull_request_target_guard(path: Path, text: str) -> list[str]:
    errors: list[str] = []
    if "pull_request_target:" not in text:
        return errors
    has_fork_guard = "head.repo.fork" in text or "IS_FORK" in text
    has_assoc_guard = "author_association" in text or "AUTHOR_ASSOC" in text
    if not (has_fork_guard and has_assoc_guard):
        errors.append(
            f"{path.name}: pull_request_target workflows must gate on fork and author association trust."
        )
    return errors


def check_file(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    errors: list[str] = []
    if "secrets: inherit" in text:
        errors.append(f"{path.name}: secrets: inherit is forbidden; use explicit secret mapping.")
    errors.extend(check_uses_refs(path, text))
    errors.extend(check_top_permissions(path, text))
    errors.extend(check_pull_request_target_guard(path, text))
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate workflow policy requirements.")
    parser.add_argument(
        "--root",
        default=".github/workflows",
        help="Directory containing workflow YAML files.",
    )
    args = parser.parse_args()
    root = Path(args.root)
    if not root.exists():
        print(f"::error::{root} does not exist.")
        return 1

    workflows = iter_workflows(root)
    if not workflows:
        print("::error::No workflow files found.")
        return 1

    violations: list[str] = []
    for wf in workflows:
        violations.extend(check_file(wf))

    if violations:
        print("Workflow policy violations detected:")
        for v in violations:
            print(f"- {v}")
        return 1

    print(f"Workflow policy checks passed for {len(workflows)} files.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
