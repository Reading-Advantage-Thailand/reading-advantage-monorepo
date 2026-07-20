"""Additive Batch B truth supersession for the Kimi WebBridge v3 audit.

The original, v2, and v3 truth artifacts remain immutable. This module retains
all v3 contracts, selects the additive browser-v3 evidence for B4, expands the
active receipt gate, and requires a fresh ancestry-bound independent review.
"""

from __future__ import annotations

import importlib.util
import re
import sys
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = REPO_ROOT / "measure/tracks/apk_corpus_audit_action_defense_20260712"
RECEIPTS_DIR = TRACK_DIR / "role-receipts"
PHASE_BASE_SHA = "ff01cee9cc973dee89fdc0ba22102dcea0c50542"
ROLE_BASE_SHA = "917fac540b8d97b2d2f48c182ee02b62269f4d61"
V3_TEST_PATH = TRACK_DIR / "batch-b-truth-tests-v3.py"
ORIGINAL_BROWSER_PATH = TRACK_DIR / "batch-b-browser-audit.json"
ACTIVE_BROWSER_PATH = TRACK_DIR / "batch-b-browser-audit-v3.json"
ACTIVE_BROWSER_RECEIPT_PATH = RECEIPTS_DIR / "browser-auditor-batch-b-v3.json"
ACTIVE_BROWSER_OUTPUT_COMMIT = ROLE_BASE_SHA
REVIEW_PATH = TRACK_DIR / "batch-b-adversarial-review.json"
REVIEW_RECEIPT_PATH = RECEIPTS_DIR / "adversarial-reviewer-batch-b.json"
HEX40 = re.compile(r"^[0-9a-f]{40}$")

ACTIVE_RECEIPTS = (
    "discovery-auditor-batch-b-v2.json",
    "evidence-collector-village-guardian-batch-b.json",
    "evidence-collector-archers-revenge-batch-b.json",
    "evidence-collector-storm-castle-tower-batch-b.json",
    "requirements-mapper-village-guardian-batch-b.json",
    "requirements-mapper-archers-revenge-batch-b.json",
    "requirements-mapper-storm-castle-tower-batch-b.json",
    "truth-test-author-batch-b-v4.json",
    "browser-auditor-batch-b-v3.json",
    "asset-auditor-batch-b.json",
    "adversarial-reviewer-batch-b.json",
)


def _load_v3_module() -> Any:
    """Loads the immutable v3 truth module under a private module name."""
    spec = importlib.util.spec_from_file_location("_batch_b_truth_tests_v3", V3_TEST_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Batch B v3 truth module cannot be loaded")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


_v3 = _load_v3_module()
_v2 = _v3._v2
_v1 = _v3._v1
_v3_load_json = _v1.load_json


def active_load_json(path: Path) -> Any:
    """Selects browser audit v3 only when inherited contracts request v1."""
    if Path(path) == ORIGINAL_BROWSER_PATH:
        return _v3_load_json(ACTIVE_BROWSER_PATH)
    return _v3_load_json(Path(path))


_v1._JSON_CACHE.clear()
_v1.load_json = active_load_json
_v1.CURRENT_RECEIPTS = ACTIVE_RECEIPTS


def direct_json(path: Path) -> dict[str, Any]:
    """Loads one exact JSON object without browser supersession redirection."""
    return _v2.direct_json(path)


def _is_ancestor(ancestor: str, descendant: str) -> bool:
    """Returns whether Git proves the first commit is an ancestor of the second."""
    if not HEX40.fullmatch(ancestor) or not HEX40.fullmatch(descendant):
        return False
    return _v1.git("merge-base", "--is-ancestor", ancestor, descendant).returncode == 0


class BatchBFreezeContract(_v3.BatchBFreezeContract):
    """B0 discovery and immutable-supersession contracts inherited unchanged."""


class BatchBCollectorPackageContract(_v3.BatchBCollectorPackageContract):
    """B1 collector contracts inherited unchanged."""


class BatchBMapperPackageContract(_v3.BatchBMapperPackageContract):
    """B2 mapper contracts inherited unchanged."""


class BatchBClaimTruthContract(_v3.BatchBClaimTruthContract):
    """B3 claim contracts inherited unchanged."""


class BatchBNegativeFixtureContract(_v3.BatchBNegativeFixtureContract):
    """B3 negative-fixture contracts inherited unchanged."""


class BatchBReceiptContract(_v3.BatchBReceiptContract):
    """Receipt gates include every active Batch B role and remain provenance-RED."""

    def test_v4_active_receipt_set_is_complete_and_exact(self) -> None:
        """Fails when: B-TEST-002 omits or substitutes an active discovery, package, truth, B4, or reviewer receipt."""
        self.assertEqual(tuple(_v1.CURRENT_RECEIPTS), ACTIVE_RECEIPTS)
        missing = [name for name in ACTIVE_RECEIPTS if not (RECEIPTS_DIR / name).is_file()]
        self.assertEqual(missing, [], f"missing active receipts: {missing}")

        browser_receipt = direct_json(ACTIVE_BROWSER_RECEIPT_PATH)
        bindings = browser_receipt.get("output_paths_and_sha256", [])
        browser_binding = next(
            (
                binding
                for binding in bindings
                if binding.get("path") == str(ACTIVE_BROWSER_PATH.relative_to(REPO_ROOT))
            ),
            None,
        )
        self.assertIsInstance(browser_binding, dict)
        self.assertEqual(browser_binding.get("sha256"), _v1.file_sha256(ACTIVE_BROWSER_PATH))


class BatchBBrowserContract(_v3.BatchBBrowserContract):
    """B4 contracts for the active Kimi-only browser-v3 evidence package."""

    def test_browser_records_require_real_behavior_or_reviewed_failure(self) -> None:
        """Fails when: active B4 records lack runnable state/input proof or bounded reviewed non-runnable evidence."""
        audit = active_load_json(ORIGINAL_BROWSER_PATH)
        self.assertIsInstance(audit, dict, "EXPECTED_STAGE_RED[B4]: browser audit unavailable")
        records = audit.get("games", [])
        defects: list[str] = []
        for item in records:
            game = item.get("normalized_id")
            disposition = item.get("disposition")
            if disposition == "runnable":
                for viewport in ("compact", "wide"):
                    proof = item.get(viewport, {})
                    for key in (
                        "viewport",
                        "start_instruction_state",
                        "active_state",
                        "transition_state",
                        "terminal_result_state",
                        "real_input_events",
                    ):
                        if not proof.get(key):
                            defects.append(f"{game}.{viewport}.{key}")
                for key in (
                    "transition_log",
                    "scheduler_adapter_boundary",
                    "console_observations",
                    "network_observations",
                    "reviewer_disposition",
                ):
                    if not item.get(key):
                        defects.append(f"{game}.{key}")
            elif disposition == "non-runnable":
                for key in (
                    "attempted_command",
                    "environment",
                    "route",
                    "revision",
                    "exact_failure",
                    "logs",
                    "reviewed_bounded_reason",
                    "reviewer_disposition",
                ):
                    if not item.get(key):
                        defects.append(f"{game}.{key}")
            else:
                defects.append(f"{game}.invalid-disposition")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B4]: " + ", ".join(defects))

    def test_active_browser_v3_scope_tool_privacy_and_start_are_exact(self) -> None:
        """Fails when: v3 is not selected/hash-bound, scope drifts, non-Kimi tools leak in, privacy is unsafe, or app start is unproved."""
        selected = active_load_json(ORIGINAL_BROWSER_PATH)
        audit = direct_json(ACTIVE_BROWSER_PATH)
        receipt = direct_json(ACTIVE_BROWSER_RECEIPT_PATH)
        self.assertEqual(selected, audit)
        self.assertEqual(audit.get("schema"), "apk-browser-audit.v3")
        self.assertEqual(audit.get("phase_base_sha"), PHASE_BASE_SHA)

        records = audit.get("games", [])
        self.assertEqual(len(records), 3)
        dispositions = {item.get("normalized_id"): item.get("disposition") for item in records}
        self.assertEqual(
            dispositions,
            {
                "village-guardian": "runnable",
                "archers-revenge": "non-runnable",
                "storm-castle-tower": "non-runnable",
            },
        )
        self.assertEqual(audit.get("counts", {}).get("runnable_results"), 1)
        self.assertEqual(audit.get("counts", {}).get("non_runnable_results"), 2)
        self.assertEqual(audit.get("counts", {}).get("audit_blocked_results"), 0)

        self.assertIn("Only Kimi WebBridge", audit.get("browser_boundary", ""))
        session = receipt.get("browser_session", {})
        self.assertEqual(session.get("tool"), "Kimi WebBridge")
        self.assertEqual(session.get("other_browser_tools_used"), [])
        self.assertEqual(session.get("daemon_url"), "http://127.0.0.1:10086")

        privacy = audit.get("privacy", {})
        self.assertIs(privacy.get("student_data_accessed"), False)
        self.assertEqual(privacy.get("student_data_records"), 0)
        self.assertIs(privacy.get("unrelated_user_tabs_accessed"), False)
        self.assertIs(privacy.get("published_browser_artifacts"), False)
        self.assertEqual(audit.get("counts", {}).get("student_data_records"), 0)
        for item in records:
            self.assertIn("No student data", item.get("data_note", ""))

        start = audit.get("application_start", {})
        self.assertEqual(start.get("attempted_command"), "PORT=3108 pnpm --filter vocabulary-games dev")
        self.assertEqual(start.get("result"), "started")
        self.assertIn("Ready in 1704ms", start.get("ready_log", ""))
        self.assertRegex(start.get("server_log_sha256", ""), r"^[0-9a-f]{64}$")
        self.assertIn("terminated", start.get("shutdown", ""))

    def test_village_guardian_has_bounded_compact_wide_state_and_input_proof(self) -> None:
        """Fails when: Village proof omits states/inputs or treats scheduler and synthetic events as native browser proof."""
        audit = direct_json(ACTIVE_BROWSER_PATH)
        village = next(item for item in audit["games"] if item["normalized_id"] == "village-guardian")
        self.assertEqual(village.get("route_status"), "GET 200 text/html; start, active, and terminal/result UI observed")
        self.assertEqual(village.get("compact", {}).get("viewport"), {"width": 390, "height": 844, "devicePixelRatio": 1})

        for viewport in ("compact", "wide"):
            proof = village[viewport]
            for key in ("start_instruction_state", "active_state", "transition_state", "terminal_result_state"):
                self.assertTrue(proof.get(key), f"{viewport}.{key}")
            events = proof.get("real_input_events", [])
            self.assertTrue(any(event.get("type") == "click" for event in events), viewport)
            self.assertTrue(any(event.get("type") == "keydown" for event in events), viewport)
            self.assertTrue(all(event.get("isTrusted") is False for event in events), viewport)

        transitions = {(item.get("from"), item.get("to")) for item in village.get("transition_log", [])}
        self.assertIn(("start/instruction", "active"), transitions)
        self.assertIn(("active", "terminal/result"), transitions)

        boundary = village.get("scheduler_adapter_boundary", {})
        self.assertIn("requestAnimationFrame", boundary.get("replacement", ""))
        self.assertIn("does not establish", boundary.get("claim_limit", ""))
        self.assertIn("trusted native input", boundary.get("claim_limit", ""))
        self.assertIn("hidden tab", boundary.get("reason", ""))
        limitations = audit.get("input_limitations", {})
        self.assertIn("synthetic events", limitations.get("webbridge_event_trust", ""))
        self.assertIn("isTrusted=false", limitations.get("webbridge_event_trust", ""))
        self.assertEqual(audit.get("counts", {}).get("trusted_native_input_events"), 0)

        network = "\n".join(village.get("network_observations", []))
        self.assertIn("POSTed /api/v1/games/village-guardian/complete", network)
        self.assertIn("400 application/json", network)
        finding = next(item for item in direct_json(ACTIVE_BROWSER_RECEIPT_PATH)["findings"] if item["id"] == "BROWSER-V3-001")
        self.assertEqual(finding.get("severity"), "medium")
        self.assertIs(finding.get("blocking_browser_disposition"), False)
        self.assertIn("completion-route contract", finding.get("finding", ""))

    def test_archer_and_storm_have_bounded_exact_route_404_evidence(self) -> None:
        """Fails when: a non-runnable result is inferred rather than bound to direct exact-route 404 evidence."""
        audit = direct_json(ACTIVE_BROWSER_PATH)
        expected_routes = {
            "archers-revenge": "http://localhost:3108/en/student/games/vocabulary/archers-revenge",
            "storm-castle-tower": "http://localhost:3108/en/student/games/sentence/storm-castle-tower",
        }
        for game, route in expected_routes.items():
            record = next(item for item in audit["games"] if item["normalized_id"] == game)
            self.assertEqual(record.get("disposition"), "non-runnable")
            self.assertEqual(record.get("runnable_disposition"), "non-runnable-at-role-revision")
            self.assertEqual(record.get("route"), route)
            self.assertEqual(record.get("revision"), audit.get("role_base_sha"))
            self.assertIn("HTTP 404 text/html", record.get("exact_failure", ""))
            self.assertEqual(record.get("route_observation", {}).get("body_text"), "404\nThis page could not be found.")
            log_text = "\n".join(record.get("logs", []))
            self.assertIn(f"GET {route}", log_text)
            self.assertIn("status 404", log_text)
            self.assertIn("completed true", log_text)
            self.assertEqual(record.get("network_observations"), ["Exact route GET completed 404 text/html."])
            reason = record.get("reviewed_bounded_reason", "")
            self.assertIn("sibling Village Guardian route returned 200", reason)
            self.assertIn("visited directly", reason)
            self.assertIn("bounded conclusion", reason)


class BatchBAssetContract(_v3.BatchBAssetContract):
    """B4 asset contracts inherited unchanged."""


class BatchBIndependentReviewContract(_v3.BatchBIndependentReviewContract):
    """B5 review contracts require fresh coverage of active browser-v3 bytes."""

    def test_independent_review_is_fresh_for_active_browser_v3(self) -> None:
        """Fails when: the reviewer did not hash active browser-v3 or audit a descendant head containing those exact bytes."""
        review = direct_json(REVIEW_PATH)
        receipt = direct_json(REVIEW_RECEIPT_PATH)
        browser_hash = _v1.file_sha256(ACTIVE_BROWSER_PATH)
        relative_browser_path = str(ACTIVE_BROWSER_PATH.relative_to(REPO_ROOT))
        defects: list[str] = []

        reviewed_hash = receipt.get("input_hashes", {}).get(relative_browser_path)
        if reviewed_hash != browser_hash:
            defects.append("active-browser-v3-hash-not-reviewed")

        review_head = review.get("audited_head_sha", review.get("role_base_sha"))
        receipt_head = receipt.get("audited_head_sha", receipt.get("role_base_sha"))
        if review_head != receipt_head:
            defects.append("review-head-receipt-mismatch")
        if not isinstance(review_head, str) or not HEX40.fullmatch(review_head):
            defects.append("missing-audited-head")
        elif not _is_ancestor(ACTIVE_BROWSER_OUTPUT_COMMIT, review_head):
            defects.append("audited-head-predates-active-browser-v3")
        else:
            committed = _v1.git_show(review_head, relative_browser_path)
            if committed is None or _v1.sha256(committed) != browser_hash:
                defects.append("audited-head-browser-v3-byte-mismatch")

        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B5_STALE_REVIEW]: " + ", ".join(defects))


class BatchBAcceptanceContract(_v3.BatchBAcceptanceContract):
    """B5 acceptance contracts remain inherited, unavailable, and fail closed."""


if __name__ == "__main__":
    unittest.main()
