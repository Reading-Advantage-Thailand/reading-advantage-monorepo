"""Additive Batch B truth supersession for delegated WebBridge direction.

The v1-v4 truth artifacts remain immutable. This module retains every v4
contract, binds the later product-owner direction that makes bounded B4 green,
and requires any succeeding independent review to cover exact v5 bytes.
"""

from __future__ import annotations

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
ROLE_BASE_SHA = "be00a04a5335cb89b012c479bb02f27a73bdb995"
V4_TEST_PATH = TRACK_DIR / "batch-b-truth-tests-v4.py"
V5_TEST_PATH = Path(__file__).resolve()
DIRECTION_PATH = TRACK_DIR / "product-owner-direction-batch-b-webbridge.json"
DIRECTION_SHA256 = "7dde397fdb1ceeac3e490d07791e90f69dd630b962d6b799da8426d4e9234498"
DIRECTION_OUTPUT_COMMIT = ROLE_BASE_SHA
BROWSER_OUTPUT_COMMIT = "917fac540b8d97b2d2f48c182ee02b62269f4d61"

ACTIVE_RECEIPTS = (
    "discovery-auditor-batch-b-v2.json",
    "evidence-collector-village-guardian-batch-b.json",
    "evidence-collector-archers-revenge-batch-b.json",
    "evidence-collector-storm-castle-tower-batch-b.json",
    "requirements-mapper-village-guardian-batch-b.json",
    "requirements-mapper-archers-revenge-batch-b.json",
    "requirements-mapper-storm-castle-tower-batch-b.json",
    "truth-test-author-batch-b-v5.json",
    "browser-auditor-batch-b-v3.json",
    "asset-auditor-batch-b.json",
    "adversarial-reviewer-batch-b.json",
)


def _load_v4_module() -> Any:
    """Loads the immutable v4 truth module under a private module name."""
    spec = importlib.util.spec_from_file_location("_batch_b_truth_tests_v4", V4_TEST_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Batch B v4 truth module cannot be loaded")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


_v4 = _load_v4_module()
_v3 = _v4._v3
_v2 = _v4._v2
_v1 = _v4._v1
_v1.CURRENT_RECEIPTS = ACTIVE_RECEIPTS


def direct_json(path: Path) -> dict[str, Any]:
    """Loads one exact JSON object without inherited supersession redirection."""
    return _v4.direct_json(path)


def _committed_exactly(path: Path, commit: str) -> bool:
    """Returns whether current bytes exactly match the path at a named commit."""
    relative = str(path.relative_to(REPO_ROOT))
    committed = _v1.git_show(commit, relative)
    return committed is not None and committed == path.read_bytes()


class BatchBFreezeContract(_v4.BatchBFreezeContract):
    """B0 discovery and immutable-supersession contracts inherited unchanged."""


class BatchBCollectorPackageContract(_v4.BatchBCollectorPackageContract):
    """B1 collector contracts inherited unchanged."""


class BatchBMapperPackageContract(_v4.BatchBMapperPackageContract):
    """B2 mapper contracts inherited unchanged."""


class BatchBClaimTruthContract(_v4.BatchBClaimTruthContract):
    """B3 claim contracts inherited unchanged."""


class BatchBNegativeFixtureContract(_v4.BatchBNegativeFixtureContract):
    """B3 negative-fixture contracts inherited unchanged."""


class BatchBReceiptContract(_v4.BatchBReceiptContract):
    """Receipt gates select v5 while retaining every active role and provenance RED."""

    def test_v4_active_receipt_set_is_complete_and_exact(self) -> None:
        """Fails when: the active set omits or substitutes a discovery, package, truth, B4, or reviewer receipt."""
        self.assertEqual(tuple(_v1.CURRENT_RECEIPTS), ACTIVE_RECEIPTS)
        missing = [name for name in ACTIVE_RECEIPTS if not (RECEIPTS_DIR / name).is_file()]
        self.assertEqual(missing, [], f"missing active receipts: {missing}")

        browser_receipt = direct_json(_v4.ACTIVE_BROWSER_RECEIPT_PATH)
        bindings = browser_receipt.get("output_paths_and_sha256", [])
        browser_binding = next(
            (
                binding
                for binding in bindings
                if binding.get("path") == str(_v4.ACTIVE_BROWSER_PATH.relative_to(REPO_ROOT))
            ),
            None,
        )
        self.assertIsInstance(browser_binding, dict)
        self.assertEqual(browser_binding.get("sha256"), _v1.file_sha256(_v4.ACTIVE_BROWSER_PATH))


class BatchBBrowserContract(_v4.BatchBBrowserContract):
    """B4 remains bounded-green only under the exact delegated direction."""

    def test_product_owner_direction_is_exact_later_and_classifies_b4_green(self) -> None:
        """Fails when: the delegated direction is stale, uncommitted, misbound, or does not explicitly accept bounded WebBridge B4."""
        direction = direct_json(DIRECTION_PATH)
        self.assertEqual(_v1.file_sha256(DIRECTION_PATH), DIRECTION_SHA256)
        self.assertTrue(_committed_exactly(DIRECTION_PATH, DIRECTION_OUTPUT_COMMIT))
        self.assertNotEqual(BROWSER_OUTPUT_COMMIT, DIRECTION_OUTPUT_COMMIT)
        self.assertTrue(_v4._is_ancestor(BROWSER_OUTPUT_COMMIT, DIRECTION_OUTPUT_COMMIT))
        self.assertEqual(direction.get("schema_version"), "apk-product-owner-direction.v1")
        self.assertEqual(direction.get("track_id"), "apk_corpus_audit_action_defense_20260712")
        self.assertEqual(direction.get("batch_id"), "batch-b")
        self.assertEqual(direction.get("decision"), "WEBBRIDGE_ACCEPTED_FOR_B4")
        self.assertEqual(direction.get("scope"), "Batch B browser evidence only")

        accepted = direction.get("accepted_evidence", {})
        self.assertEqual(accepted.get("browser_audit_path"), str(_v4.ACTIVE_BROWSER_PATH.relative_to(REPO_ROOT)))
        self.assertEqual(accepted.get("browser_audit_sha256"), _v1.file_sha256(_v4.ACTIVE_BROWSER_PATH))
        self.assertEqual(accepted.get("tool"), "Kimi WebBridge")
        self.assertEqual(
            accepted.get("accepted_dispositions"),
            {
                "village-guardian": "runnable with disclosed synthetic-input and hidden-tab scheduler limitations",
                "archers-revenge": "non-runnable at role revision after direct exact-route 404",
                "storm-castle-tower": "non-runnable at role revision after direct exact-route 404",
            },
        )
        self.assertEqual(
            direction.get("replaces"),
            "The prior B4 browser-tool stop-loss only; it does not approve any candidate or accepted cohort manifest.",
        )

    def test_direction_retains_limitations_and_prohibits_success_claims(self) -> None:
        """Fails when: B4 direction is used to claim native input/timing, persistence, XP, completion success, or a waived B5 gate."""
        direction = direct_json(DIRECTION_PATH)
        audit = direct_json(_v4.ACTIVE_BROWSER_PATH)
        accepted_surface = json.dumps(direction.get("accepted_evidence", {}), sort_keys=True).lower()
        for forbidden in (
            "trusted native input",
            "ordinary foreground timing",
            "successful persistence",
            "xp awarded",
            "xp earned",
            "successful completion",
        ):
            self.assertNotIn(forbidden, accepted_surface)

        direction_text = direction.get("direction", "")
        self.assertIn("DOM-level synthetic input", direction_text)
        self.assertIn("hidden-tab scheduler limitations", direction_text)
        self.assertIn("must not be represented as trusted native input", direction_text)
        self.assertIn("foreground timing", direction_text)
        self.assertIn("successful completion API flow", direction_text)

        self.assertEqual(
            set(direction.get("non_waived_gates", [])),
            {
                "claim citation and semantic correctness",
                "denominator completeness",
                "asset evidence",
                "role provenance and receipt integrity",
                "fresh independent review",
                "candidate, acceptance, and revocation lifecycle",
                "Village Guardian completion API contract correctness",
            },
        )
        successor = direction.get("successor_note", "")
        self.assertIn("completion HTTP 400", successor)
        self.assertIn("successor porting defect", successor)
        self.assertIn("before any claim of successful persistence or completion", successor)

        village = next(item for item in audit["games"] if item["normalized_id"] == "village-guardian")
        self.assertEqual(audit.get("counts", {}).get("trusted_native_input_events"), 0)
        for viewport in ("compact", "wide"):
            self.assertTrue(all(event.get("isTrusted") is False for event in village[viewport]["real_input_events"]))
        claim_limit = village.get("scheduler_adapter_boundary", {}).get("claim_limit", "")
        self.assertIn("does not establish background-tab wall-clock timing", claim_limit)
        self.assertIn("trusted native input", claim_limit)
        network = "\n".join(village.get("network_observations", []))
        self.assertIn("400 application/json", network)
        self.assertNotIn("completion POST 200", network)
        self.assertIn("XP earned 0", village.get("compact", {}).get("terminal_result_state", ""))


class BatchBAssetContract(_v4.BatchBAssetContract):
    """B4 asset contracts remain inherited and non-waived."""


class BatchBIndependentReviewContract(_v4.BatchBIndependentReviewContract):
    """B5 requires a fresh descendant review of direction, browser-v3, and v5."""

    def test_independent_review_is_fresh_for_active_browser_v3(self) -> None:
        """Fails when: review does not hash exact direction/browser/v5 bytes at a descendant audited head."""
        review = direct_json(_v4.REVIEW_PATH)
        receipt = direct_json(_v4.REVIEW_RECEIPT_PATH)
        inputs = receipt.get("input_hashes", {})
        required_inputs = {
            str(_v4.ACTIVE_BROWSER_PATH.relative_to(REPO_ROOT)): _v1.file_sha256(_v4.ACTIVE_BROWSER_PATH),
            str(DIRECTION_PATH.relative_to(REPO_ROOT)): _v1.file_sha256(DIRECTION_PATH),
            str(V5_TEST_PATH.relative_to(REPO_ROOT)): _v1.file_sha256(V5_TEST_PATH),
        }
        defects = [f"missing-or-stale-input:{path}" for path, digest in required_inputs.items() if inputs.get(path) != digest]

        review_head = review.get("audited_head_sha", review.get("role_base_sha"))
        receipt_head = receipt.get("audited_head_sha", receipt.get("role_base_sha"))
        if review_head != receipt_head:
            defects.append("review-head-receipt-mismatch")
        if not isinstance(review_head, str) or not _v4.HEX40.fullmatch(review_head):
            defects.append("missing-audited-head")
        elif not _v4._is_ancestor(DIRECTION_OUTPUT_COMMIT, review_head):
            defects.append("audited-head-predates-direction")
        else:
            for relative, digest in required_inputs.items():
                committed = _v1.git_show(review_head, relative)
                if committed is None or _v1.sha256(committed) != digest:
                    defects.append(f"audited-head-byte-mismatch:{relative}")

        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B5_STALE_REVIEW_V5]: " + ", ".join(defects))


class BatchBAcceptanceContract(_v4.BatchBAcceptanceContract):
    """B5 acceptance remains unavailable and every lifecycle gate stays fail closed."""


if __name__ == "__main__":
    unittest.main()
