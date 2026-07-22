#!/usr/bin/env python3
"""Verify T6 successor acceptance and conditional evidence consumption bindings."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path
from typing import Any


TRACK = Path("measure/tracks/apk_corpus_audit_puzzle_crafting_20260712")
CANDIDATE_COMMIT = "b3c95ab3256b41a82c797eefce62232683a356a9"
REVIEW_COMMIT = "752fecfd1f8f9da0bd3c9a377126bb322a81e37c"
CANDIDATE_PATH = TRACK / "successor-candidate-cohort-manifest-v2.json"
ACCEPTANCE_PATH = TRACK / "product-owner-acceptance-successor-v2.json"
MANIFEST_PATH = TRACK / "successor-accepted-cohort-manifest-v2.json"


def fail(message: str) -> None:
    """Print a gate failure and exit.

    Args:
        message: The invariant that failed.
    """
    print(f"FAIL: {message}")
    raise SystemExit(1)


def expect(condition: bool, label: str) -> None:
    """Require an invariant and print a compact passing label.

    Args:
        condition: Whether the invariant holds.
        label: The invariant's human-readable name.
    """
    if not condition:
        fail(label)
    print(f"PASS: {label}")


def digest(path: Path) -> str:
    """Return the SHA-256 digest of an artifact.

    Args:
        path: The artifact to hash.

    Returns:
        The lowercase SHA-256 hexadecimal digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path: Path) -> dict[str, Any]:
    """Load a JSON object from an artifact path.

    Args:
        path: The JSON artifact to read.

    Returns:
        The parsed JSON object.
    """
    return json.loads(path.read_text())


def git_bytes(commit: str, path: Path) -> bytes:
    """Read an artifact's exact bytes from an immutable Git revision.

    Args:
        commit: The revision that must contain the artifact.
        path: The repository-relative artifact path.

    Returns:
        The artifact bytes stored in Git.
    """
    return subprocess.check_output(["git", "show", f"{commit}:{path}"])


def is_ancestor(older: str, newer: str) -> bool:
    """Return whether Git confirms one revision is an ancestor of another.

    Args:
        older: The required earlier revision.
        newer: The required later revision.

    Returns:
        Whether the required Git ordering holds.
    """
    return subprocess.run(
        ["git", "merge-base", "--is-ancestor", older, newer], check=False
    ).returncode == 0


def git_path_exists(commit: str, path: Path) -> bool:
    """Return whether an artifact exists in a specific immutable Git revision.

    Args:
        commit: The Git revision to inspect.
        path: The repository-relative artifact path.

    Returns:
        Whether the path is present in that revision.
    """
    return subprocess.run(
        ["git", "cat-file", "-e", f"{commit}:{path}"], check=False
    ).returncode == 0


def exact_binding(binding: dict[str, Any], label: str) -> None:
    """Verify a manifest binding points to bytes with its claimed digest.

    Args:
        binding: The binding record containing path and SHA-256.
        label: The human-readable binding name.
    """
    path = Path(binding["path"])
    expect(path.is_file(), f"{label} artifact exists")
    expect(digest(path) == binding["sha256"], f"{label} exact SHA-256")
    commit = binding.get("commit_sha")
    if commit is not None:
        expect(
            hashlib.sha256(git_bytes(commit, path)).hexdigest() == binding["sha256"],
            f"{label} committed SHA-256",
        )


def no_behavior_overclaim(claims: dict[str, Any], label: str) -> None:
    """Require every behavior or delivery claim in an artifact to remain false.

    Args:
        claims: The artifact's behavior-claim map.
        label: The artifact label used in result output.
    """
    forbidden = {
        "browser_behavior_success",
        "gameplay_success",
        "responsive_success",
        "trusted_input_success",
        "completion_success",
        "persistence_success",
        "xp_success",
        "api_correctness",
        "production_success",
        "asset_loading_success",
        "implementation_authorized",
        "shipping_authorized",
        "ontology_authorized",
    }
    expect(forbidden <= set(claims), f"{label} declares all behavior boundaries")
    expect(all(claims[key] is False for key in forbidden), f"{label} makes no behavior or delivery overclaim")


def main() -> None:
    """Validate the exact successor acceptance-to-consumption lifecycle."""
    for path in (CANDIDATE_PATH, ACCEPTANCE_PATH, MANIFEST_PATH):
        expect(path.is_file(), f"{path.name} exists")

    candidate = load(CANDIDATE_PATH)
    acceptance = load(ACCEPTANCE_PATH)
    manifest = load(MANIFEST_PATH)
    expect(candidate["consumable"] is False, "candidate remains non-consumable")
    expect(candidate["acceptance_claimed"] is False, "candidate does not self-claim acceptance")
    expect(candidate["accepted_manifest_claimed"] is False, "candidate does not self-claim accepted manifest")

    bindings = manifest["immutable_bindings"]
    for name, binding in bindings.items():
        exact_binding(binding, name)

    acceptance_bindings = acceptance["immutable_bindings"]
    expect(
        acceptance_bindings["candidate"] == bindings["candidate"],
        "acceptance and manifest bind the identical candidate and commit",
    )
    expect(
        acceptance_bindings["fresh_full_cohort_review"] == bindings["fresh_full_cohort_review"],
        "acceptance and manifest bind the identical review and commit",
    )
    expect(
        acceptance_bindings["fresh_full_cohort_review_receipt"]
        == bindings["fresh_full_cohort_review_receipt"],
        "acceptance and manifest bind the identical receipt and commit",
    )
    expect(
        bindings["product_owner_acceptance"]["sha256"] == digest(ACCEPTANCE_PATH),
        "manifest binds exact product-owner acceptance SHA-256",
    )

    expected_candidate = bindings["candidate"]
    expect(expected_candidate["commit_sha"] == CANDIDATE_COMMIT, "exact candidate commit")
    expect(
        hashlib.sha256(git_bytes(CANDIDATE_COMMIT, CANDIDATE_PATH)).hexdigest()
        == expected_candidate["sha256"],
        "candidate digest is exact in candidate commit",
    )
    expect(is_ancestor(REVIEW_COMMIT, CANDIDATE_COMMIT), "fresh review commit precedes candidate commit")
    expect(not git_path_exists(CANDIDATE_COMMIT, ACCEPTANCE_PATH), "acceptance is not backdated into candidate commit")
    expect(not git_path_exists(CANDIDATE_COMMIT, MANIFEST_PATH), "accepted manifest is not backdated into candidate commit")
    expect(manifest["git_order"] == {
        "fresh_review_precedes_candidate": True,
        "candidate_precedes_acceptance": True,
        "acceptance_precedes_this_manifest": True,
        "evidence": manifest["git_order"]["evidence"],
    }, "declared Git and additive-artifact order")

    review = load(TRACK / "full-cohort-independent-review-v2.json")
    receipt = load(TRACK / "role-receipts/adversarial-reviewer-full-cohort-v2.json")
    zero_findings = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    expect(review["unresolved_findings"] == zero_findings, "review has zero unresolved C/H/M")
    expect(acceptance["review_disposition"]["unresolved_findings"] == zero_findings, "acceptance preserves zero unresolved C/H/M")
    expect(manifest["reconciliation"]["unresolved_findings"] == zero_findings, "manifest preserves zero unresolved C/H/M")
    expect(
        candidate["author_boundary"]["role"] == "successor-candidate-author"
        and receipt["role"] == "adversarial-reviewer-full-cohort"
        and receipt["native_orchestration"]["distinct_role_and_owned_output"] is True
        and str(CANDIDATE_PATH) not in receipt["native_orchestration"]["owned_output_scope"],
        "candidate and reviewer artifact-role separation",
    )
    expect(
        len({str(CANDIDATE_PATH), str(ACCEPTANCE_PATH), str(MANIFEST_PATH)}) == 3
        and "independently staffed authorship" in manifest["artifact_separation"]["acceptance_manifest_authorship_note"],
        "acceptance and accepted-manifest file separation without unverified staffing claim",
    )

    expect(manifest["consumable"] is True and manifest["consumability"] == "conditional", "consumption is explicitly conditional")
    expect(acceptance["conditional_consumability_only"] is True, "acceptance limits authority to conditional consumption")
    expect(len(manifest["conditions"]) >= 3, "manifest supplies revocation and scope conditions")
    no_behavior_overclaim(acceptance["claims"], "acceptance")
    no_behavior_overclaim(manifest["claims"], "accepted manifest")

    provenance = acceptance["authorization"]
    expect(
        all(
            provenance[key] is None
            for key in ("provider_message_id", "provider_event_id", "provider_prompt_sha256", "provider_timestamp")
        ),
        "unavailable provider message/event/prompt/timestamp fields remain null",
    )
    disclosure_text = " ".join(acceptance["disclosures"] + manifest["disclosures"]).lower()
    expect("unknown" in disclosure_text and "provider" in disclosure_text and "historical non-authoritative" in disclosure_text, "unknown, provider, and V1 disclosures retained")
    print("RESULT: successor acceptance/consumption gate passed; exact lifecycle bindings are conditionally consumable with no behavior overclaim; exit 0")


if __name__ == "__main__":
    main()
