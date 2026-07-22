"""Fail-closed candidate-stage checks for the Batch C V2 candidate."""

from __future__ import annotations

import hashlib
import json
import subprocess
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = Path(__file__).resolve().parent
RECEIPTS_DIR = TRACK_DIR / "role-receipts"
PRODUCER_COMMIT = "16be1f15fdcb1deeb7bd1e0a6971db545e57a0cf"
INPUT_COMMIT = "7f3b89fa24f003f8cc40b3a4d9ce26df18f7b107"
REVIEW_COMMIT = "2496b0c38ed2c6445655dd46b33d065da1982185"
INPUT_MANIFEST = TRACK_DIR / "batch-c-committed-input-manifest-v2.json"
REVIEW = TRACK_DIR / "batch-c-independent-review-v2.json"
REVIEW_RECEIPT = RECEIPTS_DIR / "adversarial-reviewer-sorcerer-ziggurat-batch-c-v2.json"
CANDIDATE = TRACK_DIR / "candidate-cohort-manifest-batch-c-v2.json"
CANDIDATE_RECEIPT = RECEIPTS_DIR / "candidate-author-batch-c-v2.json"


def load_json(path: Path) -> dict[str, Any]:
    """Loads a JSON object from a UTF-8 file.

    Args:
        path: The JSON file to load.

    Returns:
        The decoded JSON object.
    """
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path}: expected object")
    return value


def file_hash(path: Path) -> str:
    """Computes the SHA-256 digest of a local file.

    Args:
        path: The file whose bytes are hashed.

    Returns:
        The lowercase hexadecimal SHA-256 digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git_bytes(commit: str, path: str) -> bytes:
    """Reads one immutable file object from a Git commit.

    Args:
        commit: The full commit SHA containing the file.
        path: The repository-relative path of the file.

    Returns:
        The exact Git object bytes.
    """
    return subprocess.run(
        ["git", "show", f"{commit}:{path}"],
        cwd=REPO_ROOT,
        capture_output=True,
        check=True,
    ).stdout


class BatchCCandidateContract(unittest.TestCase):
    """Validates that Batch C V2 remains a candidate-only publication."""

    def test_exact_committed_producer_input_and_review_bindings(self) -> None:
        """Binds all candidate inputs to the specified immutable commits and hashes."""
        manifest = load_json(INPUT_MANIFEST)
        review = load_json(REVIEW)
        review_receipt = load_json(REVIEW_RECEIPT)
        candidate = load_json(CANDIDATE)

        self.assertEqual(manifest["producer_publication_commit_sha"], PRODUCER_COMMIT)
        self.assertEqual(candidate["producer_publication_commit_sha"], PRODUCER_COMMIT)
        self.assertEqual(candidate["input_publication_commit_sha"], INPUT_COMMIT)
        self.assertEqual(candidate["review_publication_commit_sha"], REVIEW_COMMIT)
        self.assertEqual(candidate["selected_input_hashes"], manifest["selected_input_hashes"])
        self.assertEqual(len(manifest["selected_input_hashes"]), 13)
        self.assertEqual(git_bytes(INPUT_COMMIT, str(INPUT_MANIFEST.relative_to(REPO_ROOT))), INPUT_MANIFEST.read_bytes())
        self.assertEqual(git_bytes(REVIEW_COMMIT, str(REVIEW.relative_to(REPO_ROOT))), REVIEW.read_bytes())
        self.assertEqual(git_bytes(REVIEW_COMMIT, str(REVIEW_RECEIPT.relative_to(REPO_ROOT))), REVIEW_RECEIPT.read_bytes())
        for path, expected_hash in manifest["selected_input_hashes"].items():
            self.assertEqual(hashlib.sha256(git_bytes(PRODUCER_COMMIT, path)).hexdigest(), expected_hash)
        binding = candidate["review_binding"]
        self.assertEqual(binding["review_sha256"], file_hash(REVIEW))
        self.assertEqual(binding["review_receipt_sha256"], file_hash(REVIEW_RECEIPT))
        self.assertEqual(binding["review_sha256"], review_receipt["review_output"]["sha256"])

    def test_candidate_authorization_and_bounded_evidence(self) -> None:
        """Requires the green review counts and preserves source/browser boundaries."""
        review = load_json(REVIEW)
        candidate = load_json(CANDIDATE)
        receipt = load_json(CANDIDATE_RECEIPT)

        self.assertEqual(review["unresolved_findings"], {"critical": 0, "high": 0, "medium": 0, "low": 0})
        self.assertTrue(review["authorization"]["candidate"])
        self.assertFalse(review["authorization"]["product_owner_acceptance"])
        self.assertFalse(review["authorization"]["accepted_manifest"])
        self.assertEqual(review["accepted_denominator_rederivation"]["selected_total"], 15)
        self.assertEqual(review["claim_rederivation"]["claims"], 27)
        self.assertEqual(review["asset_rederivation"]["candidates"], 2)
        self.assertFalse(review["browser_boundary"]["browser_run"])
        self.assertEqual(candidate["evidence_boundary"], {"source_claims_authored": False, "browser_evidence_authored": False, "browser_evidence_claimed": False})
        self.assertEqual(receipt["evidence_boundary"], candidate["evidence_boundary"])

    def test_candidate_only_lifecycle_disclosures_and_receipt_hashes(self) -> None:
        """Prohibits consumption or acceptance while requiring complete disclosures."""
        candidate = load_json(CANDIDATE)
        receipt = load_json(CANDIDATE_RECEIPT)

        self.assertEqual(candidate["status"], "candidate-awaiting-product-owner-acceptance")
        self.assertFalse(candidate["consumable"])
        self.assertFalse(candidate["acceptance_claimed"])
        self.assertTrue(candidate["candidate_only"])
        self.assertFalse(candidate["lifecycle"]["product_owner_acceptance_published"])
        self.assertFalse(candidate["lifecycle"]["product_owner_acceptance_authorized"])
        self.assertFalse(candidate["lifecycle"]["accepted_manifest_published"])
        self.assertFalse(candidate["lifecycle"]["accepted_manifest_authorized"])
        self.assertFalse((TRACK_DIR / "product-owner-acceptance-batch-c-v2.json").exists())
        self.assertFalse((TRACK_DIR / "accepted-cohort-manifest-batch-c-v2.json").exists())
        self.assertTrue(candidate["disclosures"])
        self.assertTrue(candidate["revocation_rules"]["automatic_triggers"])
        self.assertIn("candidate-manifest-author", candidate["budget_disclosure"]["candidate_author_ceiling"])
        self.assertFalse(candidate["budget_disclosure"]["budget_conclusion_claimed"])
        self.assertEqual(candidate["budget_disclosure"]["elapsed_minutes"], 0)
        self.assertEqual(candidate["budget_disclosure"]["timing_measurement"], "unavailable-in-harness")
        self.assertFalse(candidate["provider_provenance"]["available"])
        self.assertFalse(candidate["provider_provenance"]["claimed"])
        self.assertEqual(receipt["candidate_output"]["sha256"], file_hash(CANDIDATE))
        self.assertEqual(receipt["focused_test_output"]["sha256"], file_hash(Path(__file__)))
        self.assertEqual(receipt["outputs"][0]["sha256"], file_hash(CANDIDATE))
        self.assertEqual(receipt["outputs"][1]["sha256"], file_hash(Path(__file__)))


if __name__ == "__main__":
    unittest.main()
