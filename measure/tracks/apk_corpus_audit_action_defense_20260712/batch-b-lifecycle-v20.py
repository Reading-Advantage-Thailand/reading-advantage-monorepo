"""Truth contracts for the superseding T4 Batch B lifecycle."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


TRACK_DIR = Path(__file__).resolve().parent
REPO_ROOT = TRACK_DIR.parents[2]
CANDIDATE = TRACK_DIR / "candidate-cohort-manifest-batch-b-v20.json"
ACCEPTANCE = TRACK_DIR / "product-owner-acceptance-batch-b-v20.json"
ACCEPTED = TRACK_DIR / "accepted-cohort-manifest-batch-b-v20.json"


def load(path: Path) -> dict[str, object]:
    """Loads a Batch B lifecycle artifact.

    @param path The artifact path to parse.
    @returns The parsed JSON object.
    """
    return json.loads(path.read_text())


def digest(path: Path) -> str:
    """Calculates an artifact's exact SHA-256 digest.

    @param path The artifact path to hash.
    @returns The lowercase digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_candidate_binds_green_source_tests_and_fresh_review() -> None:
    """Requires source tests and fresh review rather than chronology substitution."""
    candidate = load(CANDIDATE)
    source_gate = candidate["source_and_truth_gate"]
    review = candidate["fresh_independent_review"]
    assert digest(REPO_ROOT / source_gate["path"]) == source_gate["sha256"]
    assert source_gate["result"] == "49 passed"
    assert digest(REPO_ROOT / review["path"]) == review["sha256"]
    assert review["status"] == "pass"
    assert review["candidate_authorized"] is True
    assert candidate["consumable"] is False


def test_acceptance_is_ordered_after_candidate_publication() -> None:
    """Requires delegated acceptance to bind the exact already-published candidate."""
    acceptance = load(ACCEPTANCE)
    candidate = acceptance["candidate"]
    assert digest(REPO_ROOT / candidate["path"]) == candidate["sha256"]
    subprocess.run(
        ["git", "merge-base", "--is-ancestor", candidate["publication_commit_sha"], "HEAD"],
        cwd=REPO_ROOT,
        check=True,
    )
    assert acceptance["ordered_after_candidate"] is True
    assert acceptance["authority_record"]["original_message_id"] is None
    assert acceptance["authority_record"]["original_identifier_claimed"] is False


def test_accepted_manifest_binds_acceptance_and_preserves_history() -> None:
    """Requires exact acceptance binding and immutable historical lifecycle bytes."""
    accepted = load(ACCEPTED)
    assert digest(REPO_ROOT / accepted["candidate"]["path"]) == accepted["candidate"]["sha256"]
    assert digest(REPO_ROOT / accepted["owner_acceptance"]["path"]) == accepted["owner_acceptance"]["sha256"]
    historical = REPO_ROOT / accepted["supersedes"]["historical_accepted_manifest_path"]
    assert digest(historical) == accepted["supersedes"]["historical_accepted_manifest_sha256"]
    assert accepted["supersedes"]["historical_files_mutated"] is False
    assert accepted["consumable"] is True
    assert accepted["consumability"] == "conditional"
    assert accepted["revoked"] is False


def test_lifecycle_publication_order_is_immutable() -> None:
    """Requires candidate, owner decision, and accepted manifest publication order."""
    accepted = load(ACCEPTED)
    candidate_commit = accepted["candidate"]["publication_commit_sha"]
    acceptance_commit = accepted["owner_acceptance"]["publication_commit_sha"]
    subprocess.run(
        ["git", "merge-base", "--is-ancestor", candidate_commit, acceptance_commit],
        cwd=REPO_ROOT,
        check=True,
    )
    subprocess.run(
        ["git", "merge-base", "--is-ancestor", acceptance_commit, "0a0b43809a51a56db555ccbdfb09ff2cdda85d47"],
        cwd=REPO_ROOT,
        check=True,
    )
    assert digest(ACCEPTED) == "3026323c6a6aed61f3fbcb03bacf200a1a610cb2da852606b6e9fe61f90f63d7"
