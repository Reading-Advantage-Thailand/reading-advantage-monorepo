"""Additive truth-test supersession for the Batch B discovery v2 package.

The original truth module remains immutable at its output commit.  This module
reuses its contracts while redirecting only the superseded discovery audit and
receipt to validated v2 artifacts.  Provenance and B4/B5 remain fail-closed.
"""

from __future__ import annotations

import copy
import importlib.util
import json
import sys
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = REPO_ROOT / "measure/tracks/apk_corpus_audit_action_defense_20260712"
RECEIPTS_DIR = TRACK_DIR / "role-receipts"
PHASE_BASE_SHA = "ff01cee9cc973dee89fdc0ba22102dcea0c50542"
ROLE_BASE_SHA = "3aadde637bf8e38a8575cfbea6fea59514cf03d6"
ORIGINAL_TRUTH_OUTPUT_COMMIT = "e5693e6593d4019407d5e27d9c3b0998c42d8540"

ORIGINAL_TEST_PATH = TRACK_DIR / "batch-b-truth-tests.py"
ORIGINAL_TRUTH_RECEIPT_PATH = RECEIPTS_DIR / "truth-test-author-batch-b.json"
ORIGINAL_DISCOVERY_PATH = TRACK_DIR / "batch-b-discovery-audit.json"
ORIGINAL_DISCOVERY_RECEIPT_PATH = RECEIPTS_DIR / "discovery-auditor-batch-b.json"
ACTIVE_DISCOVERY_PATH = TRACK_DIR / "batch-b-discovery-audit-v2.json"
ACTIVE_DISCOVERY_RECEIPT_PATH = RECEIPTS_DIR / "discovery-auditor-batch-b-v2.json"


def _load_original_module() -> Any:
    """Loads the immutable v1 truth module under a private module name."""
    spec = importlib.util.spec_from_file_location("_batch_b_truth_tests_v1", ORIGINAL_TEST_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("original Batch B truth module cannot be loaded")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


_v1 = _load_original_module()
_v1_load_json = _v1.load_json


def active_load_json(path: Path) -> Any:
    """Selects the v2 discovery audit only for the superseded v1 audit path."""
    if Path(path) == ORIGINAL_DISCOVERY_PATH:
        return _v1_load_json(ACTIVE_DISCOVERY_PATH)
    return _v1_load_json(Path(path))


_v1._JSON_CACHE.clear()
_v1.load_json = active_load_json
_v1.CURRENT_RECEIPTS = tuple(
    "discovery-auditor-batch-b-v2.json"
    if name == "discovery-auditor-batch-b.json"
    else "truth-test-author-batch-b-v2.json"
    if name == "truth-test-author-batch-b.json"
    else name
    for name in _v1.CURRENT_RECEIPTS
)


def direct_json(path: Path) -> dict[str, Any]:
    """Loads one exact JSON artifact without active-supersession redirection."""
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise AssertionError(f"{path}: unreadable JSON: {exc}") from exc
    if not isinstance(value, dict):
        raise AssertionError(f"{path}: expected JSON object")
    return value


class BatchBFreezeContract(_v1.BatchBFreezeContract):
    """B0 v2 active-discovery selection and immutable-supersession contracts."""

    def test_active_discovery_selection_resolves_to_valid_v2_output(self) -> None:
        """Fails when: the v2 suite silently reads v1 discovery or v2 output bytes do not match its receipt."""
        selected = active_load_json(ORIGINAL_DISCOVERY_PATH)
        active = direct_json(ACTIVE_DISCOVERY_PATH)
        receipt = direct_json(ACTIVE_DISCOVERY_RECEIPT_PATH)
        self.assertEqual(selected, active)
        self.assertIn("supersedes", selected)
        binding = receipt["output_paths_and_sha256"]
        self.assertEqual(len(binding), 1)
        self.assertEqual(binding[0]["path"], str(ACTIVE_DISCOVERY_PATH.relative_to(REPO_ROOT)))
        self.assertEqual(binding[0]["sha256"], _v1.file_sha256(ACTIVE_DISCOVERY_PATH))

    def test_original_truth_outputs_remain_immutable_at_e5693e6(self) -> None:
        """Fails when: A15 original truth-test or receipt bytes differ from their immutable output commit."""
        for path in (ORIGINAL_TEST_PATH, ORIGINAL_TRUTH_RECEIPT_PATH):
            relative = str(path.relative_to(REPO_ROOT))
            committed = _v1.git_show(ORIGINAL_TRUTH_OUTPUT_COMMIT, relative)
            self.assertIsNotNone(committed, f"{relative} missing at original truth output commit")
            self.assertEqual(path.read_bytes(), committed, f"A15 mutation: {relative}")

    def test_original_discovery_artifacts_remain_immutable_and_hash_bound(self) -> None:
        """Fails when: additive supersession rewrites either original discovery artifact or binds stale original hashes."""
        active = direct_json(ACTIVE_DISCOVERY_PATH)
        supersedes = active["supersedes"]
        expected = {
            ORIGINAL_DISCOVERY_PATH: supersedes["original_audit_sha256"],
            ORIGINAL_DISCOVERY_RECEIPT_PATH: supersedes["original_receipt_sha256"],
        }
        for path, digest in expected.items():
            self.assertEqual(_v1.file_sha256(path), digest, str(path))
            relative = str(path.relative_to(REPO_ROOT))
            committed = _v1.git_show(ORIGINAL_TRUTH_OUTPUT_COMMIT, relative)
            self.assertIsNotNone(committed, f"{relative} missing at supersession base")
            self.assertEqual(path.read_bytes(), committed, f"original discovery artifact mutated: {relative}")

    def test_v2_changes_only_supersession_and_disclosure_placement(self) -> None:
        """Fails when: v2 changes scope, predecessors, denominator candidates, unknowns, resources, or other discovery content."""
        original = direct_json(ORIGINAL_DISCOVERY_PATH)
        active = copy.deepcopy(direct_json(ACTIVE_DISCOVERY_PATH))
        supersedes = active.pop("supersedes", None)
        self.assertIsInstance(supersedes, dict)
        self.assertEqual(active, original)
        self.assertEqual(active["authoritative_scope"], original["authoritative_scope"])
        self.assertEqual(active["predecessor_bindings"], original["predecessor_bindings"])
        self.assertEqual(supersedes["original_audit_sha256"], _v1.file_sha256(ORIGINAL_DISCOVERY_PATH))
        self.assertEqual(supersedes["original_receipt_sha256"], _v1.file_sha256(ORIGINAL_DISCOVERY_RECEIPT_PATH))

    def test_active_v2_discovery_has_no_unlabelled_disc_001_location(self) -> None:
        """Fails when: B0 still finds DISC-001 outside carried_forward_disclosures in active discovery outputs."""
        violations = []
        occurrences = 0
        for path in (ACTIVE_DISCOVERY_PATH, ACTIVE_DISCOVERY_RECEIPT_PATH):
            document = direct_json(path)
            for location in _v1.disc_001_locations(document):
                occurrences += 1
                if "carried_forward_disclosures" not in location:
                    violations.append(f"{path.name}:{'.'.join(location)}")
        self.assertGreater(occurrences, 0, "active discovery audit lost the required labeled carry-forward")
        self.assertEqual(violations, [], f"DISC-001 active-v2 leakage: {violations}")


class BatchBCollectorPackageContract(_v1.BatchBCollectorPackageContract):
    """B1 contracts inherited unchanged while using active v2 discovery."""


class BatchBMapperPackageContract(_v1.BatchBMapperPackageContract):
    """B2 contracts inherited unchanged."""


class BatchBClaimTruthContract(_v1.BatchBClaimTruthContract):
    """B3 source and semantic contracts inherited unchanged."""


class BatchBNegativeFixtureContract(_v1.BatchBNegativeFixtureContract):
    """B3 negative-fixture contracts inherited unchanged."""


class BatchBReceiptContract(_v1.BatchBReceiptContract):
    """Receipt contracts preserve exact bytes and fail-closed provenance."""

    def test_receipt_phase_role_and_budget_bindings_are_exact(self) -> None:
        """Fails when: any active receipt drifts from phase base, allowed inputs, or the exact frozen budget hash."""
        missing = []
        for name in _v1.CURRENT_RECEIPTS:
            receipt = _v1.load_json(RECEIPTS_DIR / name)
            if not isinstance(receipt, dict):
                missing.append(name)
                continue
            budget_hash = receipt.get("budget_declaration_sha256")
            if budget_hash is None:
                budget_hash = _v1.nested(
                    receipt,
                    ("budget", "declaration_sha256"),
                    ("budget_preserved", "declaration_sha256"),
                )
            self.assertEqual(receipt.get("phase_base_sha"), PHASE_BASE_SHA, name)
            self.assertEqual(receipt.get("allowed_input_manifest_sha256"), _v1.ALLOWED_INPUT_MANIFEST_SHA256, name)
            self.assertEqual(budget_hash, _v1.BUDGET_SHA256, name)
        self.assertEqual(missing, [], "missing/unparseable active receipts: " + ", ".join(missing))


class BatchBBrowserContract(_v1.BatchBBrowserContract):
    """B4 browser prerequisites inherited unchanged and intentionally RED."""


class BatchBAssetContract(_v1.BatchBAssetContract):
    """B4 asset prerequisites inherited unchanged and intentionally RED."""


class BatchBIndependentReviewContract(_v1.BatchBIndependentReviewContract):
    """B5 independent-review prerequisites inherited unchanged and intentionally RED."""


class BatchBAcceptanceContract(_v1.BatchBAcceptanceContract):
    """B5 acceptance prerequisites inherited unchanged and intentionally RED."""


if __name__ == "__main__":
    unittest.main()
