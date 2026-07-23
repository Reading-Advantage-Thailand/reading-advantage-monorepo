"""Fail-closed V3 truth contracts for Special/Historical Batch A.

This additive suite selects the complete V2 corrective contract plus the three
committed browser audit/receipt pairs available at the supplied role base. All
source, chronology, envelope, semantic, fixture, mapper, receipt, budget, and
bounded browser-disposition gates are expected green. Independent review and
the candidate/owner/accepted lifecycle remain intentionally red.

Run:
    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q \
      measure/tracks/apk_corpus_audit_special_historical_20260712/batch-a/truth-tests-v3.py
"""

from __future__ import annotations

import importlib.util
import json
import sys
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[4]
TRACK_DIR = REPO_ROOT / "measure/tracks/apk_corpus_audit_special_historical_20260712"
RECEIPTS_DIR = TRACK_DIR / "role-receipts"
PHASE_BASE_SHA = "52e48970bc9c4b585c55b53072ebebe466a1c4f4"
ROLE_BASE_SHA = "3d53d031f48eed2bbb324539900108136190cf57"
V2_TEST_PATH = TRACK_DIR / "batch-a/truth-tests-v2.py"
V3_RECEIPT_PATH = RECEIPTS_DIR / "truth-test-author-batch-a-v3.json"
REVIEW_PATH = TRACK_DIR / "batch-a/adversarial-review.json"
REVIEW_RECEIPT_PATH = RECEIPTS_DIR / "adversarial-reviewer-batch-a.json"
CANDIDATE_PATH = TRACK_DIR / "batch-a/candidate-manifest.json"
APPROVAL_PATH = TRACK_DIR / "batch-a/product-owner-acceptance.json"
ACCEPTED_PATH = TRACK_DIR / "batch-a/accepted-manifest.json"

ACTIVE_ROLE_BASE_INPUT_HASHES = {
    "measure/tracks/apk_corpus_audit_special_historical_20260712/batch-a/truth-tests-v2.py": "bf32c25f4252995b4e9a200009b2a1c1d923a1ebb4936848230435cc5b362212",
    "measure/tracks/apk_corpus_audit_special_historical_20260712/role-receipts/truth-test-author-batch-a-v2.json": "1a8abb79581fac3dc243d440b8ec54a0f9232eac41c9dc3e94b18bff3b6fd4ea",
    "measure/tracks/apk_corpus_audit_special_historical_20260712/packages/griffin-sky-joust/browser-audit.json": "618890ec18eb5bfeae6057e187bd52fa5a8d2533e31e7c588a111b1fbedd08ab",
    "measure/tracks/apk_corpus_audit_special_historical_20260712/role-receipts/browser-auditor-griffin-sky-joust.json": "bcd8017ba1a7b83685e27532c83aa6e53f7fd7d2e466921558756b8e2692f4b3",
    "measure/tracks/apk_corpus_audit_special_historical_20260712/packages/realm-carver/browser-audit-batch-a.json": "f0fcbadb8e92b3118d4eb9dd91fab6f51f85b341e59fdd1bf73a827d3c9f56e4",
    "measure/tracks/apk_corpus_audit_special_historical_20260712/role-receipts/browser-auditor-realm-carver-batch-a.json": "054b5c2648de8e384d423bb8961821fb6c0b2d5b9f0ceb51b3177cf17953e21d",
    "measure/tracks/apk_corpus_audit_special_historical_20260712/packages/devourer-slime/browser-audit-v2.json": "46a3e8c68d4f964bc6e34b9a1e3fec7d900afd3f6a77c90fa3b2ec6427e1090f",
    "measure/tracks/apk_corpus_audit_special_historical_20260712/role-receipts/browser-auditor-devourer-slime-v2.json": "8335fb4d38579356f6c84285b7c20902d6a9ba7b7d176a3fb13373ebed7c09e1",
}

BROWSER_CONFIG = {
    "griffin-sky-joust": {
        "game": "Griffin Sky-Joust",
        "audit": "packages/griffin-sky-joust/browser-audit.json",
        "receipt": "browser-auditor-griffin-sky-joust.json",
    },
    "realm-carver": {
        "game": "Realm Carver",
        "audit": "packages/realm-carver/browser-audit-batch-a.json",
        "receipt": "browser-auditor-realm-carver-batch-a.json",
    },
    "devourer-slime": {
        "game": "Devourer Slime",
        "audit": "packages/devourer-slime/browser-audit-v2.json",
        "receipt": "browser-auditor-devourer-slime-v2.json",
    },
}


def _load_v2_module() -> Any:
    """Loads the immutable V2 truth module under a private module name."""
    spec = importlib.util.spec_from_file_location("_special_batch_a_truth_v2", V2_TEST_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Special/Historical Batch A V2 truth module cannot be loaded")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


_v2 = _load_v2_module()


def load_json(path: Path) -> Any:
    """Loads one UTF-8 JSON document."""
    return json.loads(path.read_text(encoding="utf-8"))


def file_hash(path: Path) -> str:
    """Returns the SHA-256 digest of one file."""
    return _v2.file_hash(path)


def git_show(revision: str, relative: str) -> bytes | None:
    """Returns exact repository bytes at a revision, if present."""
    return _v2._git_show(revision, relative)


def browser_audit(game: str) -> dict[str, Any]:
    """Loads one selected browser audit."""
    return load_json(TRACK_DIR / BROWSER_CONFIG[game]["audit"])


def browser_receipt(game: str) -> dict[str, Any]:
    """Loads one selected browser role receipt."""
    return load_json(RECEIPTS_DIR / BROWSER_CONFIG[game]["receipt"])


def required_review_inputs() -> dict[str, str]:
    """Returns exact inputs a future independent review must bind."""
    required = dict(ACTIVE_ROLE_BASE_INPUT_HASHES)
    required[str(Path(__file__).resolve().relative_to(REPO_ROOT))] = file_hash(
        Path(__file__).resolve()
    )
    required[str(V3_RECEIPT_PATH.relative_to(REPO_ROOT))] = file_hash(V3_RECEIPT_PATH)
    return required


class V3SourceClassAndChronologyContract(_v2.V2SourceClassAndChronologyContract):
    """V2 source-class and chronology contracts inherited unchanged."""


class V3EnvelopeAndSemanticContract(_v2.V2EnvelopeAndSemanticContract):
    """V2 exact-envelope and semantic contracts inherited unchanged."""


class V3FixtureContract(_v2.V2FixtureContract):
    """V2 six-class negative-fixture contracts inherited unchanged."""


class V3MappingContract(_v2.V2MappingContract):
    """V2 exact mapping and no-new-fact contracts inherited unchanged."""


class V3ReceiptAndBudgetContract(_v2.V2ReceiptAndBudgetContract):
    """V2 owner receipt and numeric-budget contracts inherited unchanged."""


class V3SelectionContract(_v2.V2FreezeAndInputContract):
    """Selects exact committed V2 corrections and browser evidence at role base."""

    def test_selected_inputs_are_exact_committed_role_base_bytes(self) -> None:
        """Fails when a selected V2 or browser input drifts from the supplied role base."""
        defects: list[str] = []
        self.assertTrue(_v2.is_ancestor(PHASE_BASE_SHA, ROLE_BASE_SHA))
        for relative, expected in ACTIVE_ROLE_BASE_INPUT_HASHES.items():
            path = REPO_ROOT / relative
            if not path.is_file() or file_hash(path) != expected:
                defects.append(f"{relative}:working-tree")
            elif git_show(ROLE_BASE_SHA, relative) != path.read_bytes():
                defects.append(f"{relative}:role-base")
        self.assertEqual(defects, [], f"V3 selected-input defects: {defects}")

    def test_v3_receipt_binds_selection_test_and_role_scope(self) -> None:
        """Fails when the V3 receipt selects another base, input set, test, or role."""
        receipt = load_json(V3_RECEIPT_PATH)
        self.assertEqual(receipt["role"], "truth-test-author-batch-a-v3")
        self.assertEqual(receipt["phase_base_sha"], PHASE_BASE_SHA)
        self.assertEqual(receipt["role_base_sha"], ROLE_BASE_SHA)
        self.assertEqual(receipt["input_hashes"], ACTIVE_ROLE_BASE_INPUT_HASHES)
        self.assertEqual(receipt["role_isolation"]["roles_held"], ["truth-test-author"])
        binding = next(
            item
            for item in receipt["output_paths_and_sha256"]
            if item["path"] == str(Path(__file__).resolve().relative_to(REPO_ROOT))
        )
        self.assertEqual(binding["sha256"], file_hash(Path(__file__).resolve()))


class V3BrowserDispositionContract(unittest.TestCase):
    """Exact committed browser evidence and bounded disposition contracts."""

    def test_all_browser_pairs_are_selected_committed_role_isolated_outputs(self) -> None:
        """Fails when a browser audit/receipt pair is missing, cross-role, or overclaimed."""
        for game, config in BROWSER_CONFIG.items():
            audit = browser_audit(game)
            receipt = browser_receipt(game)
            self.assertEqual(audit["track_id"], _v2.TRACK_ID, game)
            self.assertEqual(receipt["track_id"], _v2.TRACK_ID, game)
            self.assertEqual(audit.get("acceptance", "not-claimed"), "not-claimed", game)
            self.assertEqual(receipt.get("acceptance", "not-claimed"), "not-claimed", game)
            self.assertEqual(audit["marker"], "MEASURE_AGENT_RESULT", game)
            self.assertEqual(receipt["marker"], "MEASURE_AGENT_RESULT", game)
            self.assertEqual(receipt.get("fork_turns", receipt.get("orchestration_provenance", {}).get("fork_turns")), "none", game)
            text = json.dumps(receipt, sort_keys=True).lower()
            self.assertNotIn('provider_attested": true', text, game)
            if game != "griffin-sky-joust":
                self.assertIn("unavailable", text, game)
            else:
                self.assertIsNone(receipt["commit_sha"])
                self.assertIsNone(receipt["actual_usage"]["elapsed_minutes"])
            outputs = receipt.get("output_paths", [])
            outputs.extend(item["path"] for item in receipt.get("outputs", []))
            self.assertIn(str((TRACK_DIR / config["audit"]).relative_to(REPO_ROOT)), outputs, game)
            self.assertIn(str((RECEIPTS_DIR / config["receipt"]).relative_to(REPO_ROOT)), outputs, game)

    def test_griffin_disposition_is_non_runnable_current_unknown(self) -> None:
        """Fails when Griffin's 404/failure evidence is promoted to current behavior."""
        audit = browser_audit("griffin-sky-joust")
        self.assertEqual(audit["disposition"], "non-runnable-current-source-unknown")
        self.assertEqual(audit["observations"]["route_attempts"], 4)
        self.assertEqual(audit["observations"]["trusted_input_events"], 0)
        self.assertEqual(audit["observations"]["synthetic_input_events"], 0)
        self.assertEqual(audit["observations"]["transitions_observed"], 0)
        self.assertEqual(audit["observations"]["current_runnable_disposition"], "unknown")
        self.assertTrue(all(item["candidate_source_class"] == "historical_implementation" for item in audit["route_attempts"]))

    def test_realm_disposition_is_bounded_non_runnable_404_evidence(self) -> None:
        """Fails when Realm's two completed 404 responses become gameplay evidence."""
        audit = browser_audit("realm-carver")
        game = audit["games"][0]
        self.assertEqual(game["disposition"], "non-runnable")
        self.assertEqual(len(game["route_attempts"]), 2)
        self.assertTrue(all("404" in item["route_status"] for item in game["route_attempts"]))
        self.assertEqual(game["real_input_events"], [])
        self.assertEqual(audit["counts"]["runnable_results"], 0)
        self.assertEqual(audit["counts"]["non_runnable_results"], 1)
        self.assertFalse(audit["privacy"]["student_data_accessed"])

    def test_devourer_disposition_is_blocked_application_unavailable(self) -> None:
        """Fails when Devourer's refused connections become live behavior evidence."""
        audit = browser_audit("devourer-slime")
        self.assertEqual(audit["disposition"], "browser-audit-blocked-application-unavailable")
        self.assertTrue(audit["browser_access"]["available"])
        self.assertTrue(audit["browser_access"]["used"])
        self.assertEqual(audit["observations"]["application_responses"], 0)
        self.assertEqual(audit["observations"]["trusted_input_events"], 0)
        self.assertEqual(audit["observations"]["synthetic_input_events"], 0)
        self.assertEqual(audit["observations"]["start_transition"], "unknown")
        self.assertFalse(audit["observations"]["compact_view_observed"])
        self.assertFalse(audit["observations"]["wide_view_observed"])

    def test_browser_actuals_are_matching_and_within_frozen_ceiling(self) -> None:
        """Fails when browser interaction/capture accounting differs or exceeds ceiling."""
        actuals = {
            "griffin-sky-joust": (7, 0),
            "realm-carver": (9, 0),
            "devourer-slime": (7, 0),
        }
        for game, (interactions, artifacts) in actuals.items():
            receipt = browser_receipt(game)
            usage = receipt.get("actual_usage", receipt.get("resource_use", {}))
            if "actual" in usage:
                usage = usage["actual"]
            self.assertEqual(usage["browser_interactions"], interactions, game)
            self.assertLessEqual(interactions, 240, game)
            captured = usage.get("captured_artifacts", usage.get("captured_browser_artifacts"))
            self.assertEqual(captured, artifacts, game)


class V3IndependentReviewContract(unittest.TestCase):
    """Fresh full-batch review existence, exact-input, and blocker contract."""

    def test_fresh_review_binds_all_v3_inputs_and_has_zero_blockers(self) -> None:
        """Fails only while the separate review/receipt is absent, stale, or blocked."""
        self.assertTrue(
            REVIEW_PATH.is_file() and REVIEW_RECEIPT_PATH.is_file(),
            "EXPECTED_STAGE_RED[INDEPENDENT_REVIEW_V3_MISSING]",
        )
        review = load_json(REVIEW_PATH)
        receipt = load_json(REVIEW_RECEIPT_PATH)
        self.assertEqual(set(review["games_reviewed"]), set(BROWSER_CONFIG))
        defects = [
            relative
            for relative, digest in required_review_inputs().items()
            if receipt.get("input_hashes", {}).get(relative) != digest
        ]
        blockers = review.get("unresolved_findings", {})
        for severity in ("critical", "high", "medium"):
            if blockers.get(severity) != 0:
                defects.append(f"unresolved-{severity}")
        self.assertEqual(defects, [], f"independent-review defects: {defects}")


class V3LifecycleContract(unittest.TestCase):
    """Ordered non-consumable candidate, owner approval, and acceptance contracts."""

    def test_candidate_binds_v3_truth_browser_and_review(self) -> None:
        """Fails only while the post-review non-consumable candidate is absent or stale."""
        self.assertTrue(CANDIDATE_PATH.is_file(), "EXPECTED_STAGE_RED[CANDIDATE_V3_MISSING]")
        candidate = load_json(CANDIDATE_PATH)
        self.assertFalse(candidate["consumable"])
        required = required_review_inputs()
        required[str(REVIEW_PATH.relative_to(REPO_ROOT))] = file_hash(REVIEW_PATH)
        required[str(REVIEW_RECEIPT_PATH.relative_to(REPO_ROOT))] = file_hash(REVIEW_RECEIPT_PATH)
        for relative, digest in required.items():
            self.assertEqual(candidate.get("input_hashes", {}).get(relative), digest, relative)

    def test_authentic_owner_approval_binds_candidate_and_review(self) -> None:
        """Fails only while authentic post-candidate product-owner approval is absent."""
        self.assertTrue(APPROVAL_PATH.is_file(), "EXPECTED_STAGE_RED[OWNER_APPROVAL_V3_MISSING]")
        approval = load_json(APPROVAL_PATH)
        self.assertEqual(approval["candidate_manifest_sha256"], file_hash(CANDIDATE_PATH))
        self.assertEqual(approval["review_report_sha256"], file_hash(REVIEW_PATH))
        self.assertEqual(approval["decision"], "approve")
        self.assertIs(approval["revoked"], False)
        for field in ("event_id", "approval_message_sha256", "approval_event_timestamp"):
            self.assertTrue(approval[field])

    def test_accepted_manifest_is_last_and_exactly_bound(self) -> None:
        """Fails only while the separately authored consumable manifest is absent."""
        self.assertTrue(ACCEPTED_PATH.is_file(), "EXPECTED_STAGE_RED[ACCEPTED_MANIFEST_V3_MISSING]")
        accepted = load_json(ACCEPTED_PATH)
        self.assertEqual(accepted["status"], "accepted")
        self.assertTrue(accepted["consumable"])
        self.assertIs(accepted["revoked"], False)
        self.assertEqual(accepted["candidate_manifest_sha256"], file_hash(CANDIDATE_PATH))
        self.assertEqual(accepted["owner_acceptance_sha256"], file_hash(APPROVAL_PATH))
        disclosure = json.dumps(accepted, sort_keys=True).lower()
        self.assertIn("provider-side", disclosure)
        self.assertIn("unavailable", disclosure)


if __name__ == "__main__":
    unittest.main()
