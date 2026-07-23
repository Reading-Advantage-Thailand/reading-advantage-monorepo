"""Fail-closed stop-loss contracts for Traversal Historical Batch C."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import sys
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = REPO_ROOT / "measure/tracks/apk_corpus_audit_traversal_exploration_20260712"
TRUTH_PATH = TRACK_DIR / "batch-c-truth-tests.py"
REVIEW_PATH = TRACK_DIR / "batch-c-independent-review.json"
STOP_PATH = TRACK_DIR / "batch-c-stop-loss.json"
RECEIPT_PATH = TRACK_DIR / "role-receipts/adversarial-reviewer-sorcerer-ziggurat-batch-c.json"


def load_json(path: Path) -> Any:
    """Loads one UTF-8 JSON document."""
    return json.loads(path.read_text(encoding="utf-8"))


def file_hash(path: Path) -> str:
    """Returns one file's SHA-256 digest."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_truth_module() -> Any:
    """Loads the immutable producer truth module for its exact input selector."""
    spec = importlib.util.spec_from_file_location("_ziggurat_batch_c_truth", TRUTH_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Batch C truth module cannot be loaded")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class BatchCStopLossContract(unittest.TestCase):
    """Review rejection and lifecycle blockade contracts."""

    def test_review_binds_exact_selected_inputs_and_reports_blockers(self) -> None:
        """Fails when the cycle-two review drifts or understates blockers."""
        review = load_json(REVIEW_PATH)
        truth = load_truth_module()
        self.assertEqual(review["input_hashes"], truth.required_review_inputs())
        self.assertEqual(review["validation"]["claims_rederived"], 27)
        self.assertEqual(review["validation"]["source_blob_hash_matches"], 27)
        self.assertEqual(review["validation"]["source_range_hash_matches"], 27)
        self.assertEqual(review["validation"]["fixtures_rederived"], 6)
        self.assertEqual(review["unresolved_findings"]["critical"], 0)
        self.assertEqual(review["unresolved_findings"]["high"], 6)
        self.assertEqual(review["unresolved_findings"]["medium"], 1)
        self.assertIs(review["candidate_authorized"], False)

    def test_second_failed_cycle_blocks_candidate_and_later_lifecycle(self) -> None:
        """Fails if any unauthorized Batch C lifecycle artifact is published."""
        stop = load_json(STOP_PATH)
        self.assertEqual(stop["failed_fix_review_cycles"], 2)
        self.assertEqual(stop["status"], "blocked-pending-product-owner-direction")
        self.assertEqual(stop["unsupported_factual_claims"], 1)
        self.assertIs(stop["candidate_authorized"], False)
        for name in (
            "candidate-cohort-manifest-batch-c.json",
            "product-owner-acceptance-batch-c.json",
            "accepted-cohort-manifest-batch-c.json",
        ):
            self.assertFalse((TRACK_DIR / name).exists(), name)

    def test_reviewer_receipt_binds_rejection_without_inventing_budget_actuals(self) -> None:
        """Fails on stale review hashes, role collision, or fabricated accounting."""
        receipt = load_json(RECEIPT_PATH)
        self.assertEqual(receipt["roles_held"], ["adversarial-reviewer"])
        self.assertEqual(receipt["forbidden_roles_held"], [])
        self.assertIs(receipt["fresh_context"], True)
        self.assertEqual(receipt["fork_turns"], "none")
        self.assertIs(receipt["provider_provenance"]["claimed"], False)
        for relative, digest in receipt["output_paths_and_sha256"].items():
            self.assertEqual(file_hash(REPO_ROOT / relative), digest, relative)
        self.assertIs(receipt["budget"]["compliant"], False)
        for key in ("source_bytes", "source_files_objects", "commands", "elapsed_minutes"):
            self.assertIsNone(receipt["budget"]["actual"][key])
        self.assertIs(receipt["candidate_authorized"], False)


if __name__ == "__main__":
    unittest.main()
