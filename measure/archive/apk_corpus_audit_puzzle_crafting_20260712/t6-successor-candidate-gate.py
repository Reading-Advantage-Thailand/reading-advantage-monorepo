#!/usr/bin/env python3
"""Verify the T6 successor candidate remains exact, separate, and non-consumable."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path


TRACK = Path("measure/tracks/apk_corpus_audit_puzzle_crafting_20260712")
CANDIDATE_PATH = TRACK / "successor-candidate-cohort-manifest-v2.json"
GREEN_REVIEW_COMMIT = "752fecfd1f8f9da0bd3c9a377126bb322a81e37c"


def fail(message: str) -> None:
    """Print a failing gate message and stop execution.

    Args:
        message: The invariant failure to report.
    """
    print(f"FAIL: {message}")
    raise SystemExit(1)


def digest_bytes(value: bytes) -> str:
    """Return the SHA-256 digest for immutable artifact bytes.

    Args:
        value: The bytes to digest.

    Returns:
        The lowercase hexadecimal SHA-256 digest.
    """
    return hashlib.sha256(value).hexdigest()


def git_bytes(commit: str, path: str) -> bytes:
    """Read a committed artifact without relying on current working-tree bytes.

    Args:
        commit: The immutable Git revision containing the artifact.
        path: The repository-relative artifact path.

    Returns:
        The artifact bytes stored at the requested revision.
    """
    return subprocess.check_output(["git", "show", f"{commit}:{path}"])


def is_ancestor(older: str, newer: str) -> bool:
    """Return whether one immutable revision is an ancestor of another.

    Args:
        older: The proposed earlier revision.
        newer: The proposed later revision.

    Returns:
        Whether Git confirms the required ancestry.
    """
    return subprocess.run(
        ["git", "merge-base", "--is-ancestor", older, newer], check=False
    ).returncode == 0


def expect(condition: bool, label: str) -> None:
    """Require a gate invariant and record a compact passing label.

    Args:
        condition: Whether the invariant holds.
        label: The human-readable invariant name.
    """
    if not condition:
        fail(label)
    print(f"PASS: {label}")


def main() -> None:
    """Validate T6 successor-candidate provenance and lifecycle boundaries."""
    if not CANDIDATE_PATH.is_file():
        fail(f"missing successor candidate: {CANDIDATE_PATH}")

    candidate = json.loads(CANDIDATE_PATH.read_text())
    expect(candidate["schema_version"] == "apk-successor-candidate-cohort-manifest.v2", "candidate schema")
    expect(candidate["track_id"] == "apk_corpus_audit_puzzle_crafting_20260712", "candidate track")
    expect(candidate["status"] == "candidate-awaiting-product-owner-acceptance", "candidate-only status")
    expect(candidate["consumable"] is False, "candidate non-consumability")
    expect(candidate["acceptance_claimed"] is False, "no acceptance claim")
    expect(candidate["accepted_manifest_claimed"] is False, "no accepted-manifest claim")

    scope = candidate["scope"]
    expect(
        scope["assigned_games"] == 6
        and scope["covered_games"] == 6
        and scope["duplicates"] == 0
        and scope["omissions"] == 0,
        "6/6 coverage with no duplicates or omissions",
    )

    bindings = candidate["immutable_bindings"]
    for binding_name, binding in bindings.items():
        path = binding["path"]
        expected_digest = binding["sha256"]
        commit = binding["commit_sha"]
        expect(Path(path).is_file(), f"{binding_name} working-tree path exists")
        expect(digest_bytes(Path(path).read_bytes()) == expected_digest, f"{binding_name} working-tree hash")
        expect(digest_bytes(git_bytes(commit, path)) == expected_digest, f"{binding_name} committed hash")
        expect(is_ancestor(commit, GREEN_REVIEW_COMMIT), f"{binding_name} publication precedes green review")

    review = json.loads((TRACK / "full-cohort-independent-review-v2.json").read_text())
    receipt = json.loads((TRACK / "role-receipts/adversarial-reviewer-full-cohort-v2.json").read_text())
    expect(
        review["unresolved_findings"] == {"critical": 0, "high": 0, "medium": 0, "low": 0},
        "green review has zero unresolved C/H/M",
    )
    expect(
        receipt["review_output"]["sha256"] == bindings["fresh_full_cohort_review"]["sha256"],
        "separate receipt binds exact review digest",
    )
    expect(
        receipt["role"] == "adversarial-reviewer-full-cohort"
        and candidate["author_boundary"]["role"] == "successor-candidate-author"
        and receipt["native_orchestration"]["distinct_role_and_owned_output"] is True
        and str(CANDIDATE_PATH) not in receipt["native_orchestration"]["owned_output_scope"],
        "reviewer and candidate-author role separation",
    )

    expected_review_commit = bindings["fresh_full_cohort_review"]["commit_sha"]
    expect(expected_review_commit == GREEN_REVIEW_COMMIT, "exact green successor-review commit")
    direction_commit = bindings["governing_direction"]["commit_sha"]
    remediation_commit = bindings["governing_remediation"]["commit_sha"]
    expect(
        is_ancestor(direction_commit, expected_review_commit)
        and is_ancestor(remediation_commit, expected_review_commit),
        "governing direction and remediation precede review",
    )

    historical = candidate["historical_non_authoritative_lineage"]
    expect(len(historical) == 5, "five preserved historical lineage artifacts")
    for item in historical:
        expect(item["non_authoritative"] is True, f"historical {item['path']} marked non-authoritative")
        expect(Path(item["path"]).is_file(), f"historical {item['path']} preserved")
        expect(digest_bytes(Path(item["path"]).read_bytes()) == item["sha256"], f"historical {item['path']} hash")

    forbidden = list(TRACK.glob("*successor*acceptance*.json")) + list(
        TRACK.glob("*successor*accepted*.json")
    )
    expect(not forbidden, "no successor acceptance or accepted manifest published")
    expect(
        any("browser-dependent product behavior remains unknown" in item.lower() for item in candidate["disclosures"])
        and any("provider-side fields remain unavailable" in item.lower() for item in candidate["disclosures"])
        and any("historical" in item.lower() and "non-authoritative" in item.lower() for item in candidate["disclosures"]),
        "required unknown and lineage disclosures",
    )
    print("RESULT: candidate gate passed; successor candidate is non-consumable and awaits product-owner acceptance; exit 0")


if __name__ == "__main__":
    main()
