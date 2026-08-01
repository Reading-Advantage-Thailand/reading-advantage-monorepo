"""Verifies the R2 Task 2 compensation evidence and fail-closed mutations."""
from __future__ import annotations

import copy
import json
import unittest
from pathlib import Path
from typing import Any

from measure.business_operations_graph_baseline_compensation import (
    CompensationValidationError,
    resolve_route_position,
    validate_compensation_evidence,
)


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ID = "business_operations_graph_baseline_remediation_20260730"
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / TRACK_ID
PLAN_PATH = TRACK_DIR / "plan.md"
EVIDENCE_PATH = TRACK_DIR / "r2-task2-compensation-denominator-v2-20260801.json"
FIXTURES_PATH = TRACK_DIR / "r2-task2-adversarial-fixtures-v1.json"


def _load_json(path: Path) -> Any:
    """Loads one UTF-8 JSON artifact.

    @param path The artifact to parse.
    @returns The parsed JSON value.
    """
    return json.loads(path.read_text(encoding="utf-8"))


class R2Task2CompensationDenominatorTests(unittest.TestCase):
    """Binds the frozen denominator to durable scans and strict validation."""

    def test_plan_marks_task_two_completed_with_evidence_scope(self) -> None:
        """Pins the bounded completed-task marker and evidence scope."""
        plan = PLAN_PATH.read_text(encoding="utf-8")
        self.assertIn("- [x] Task: If the clean branch is unavailable", plan)
        self.assertIn("measure/business_operations_graph_baseline_compensation.py", plan)
        self.assertIn("measure/tests/test_business_operations_graph_baseline_r2_compensation.py", plan)
        self.assertIn("r2-task2-compensation-denominator-v2-20260801.json", plan)
        self.assertIn("r2-task2-adversarial-fixtures-v1.json", plan)
        self.assertIn("r2-task2-scan-transaction-v2-20260801", plan)

    def test_valid_evidence_is_nonempty_and_fully_validated(self) -> None:
        """Accepts committed evidence only through the production validator."""
        evidence = _load_json(EVIDENCE_PATH)
        validate_compensation_evidence(evidence, track_dir=TRACK_DIR)
        self.assertEqual(evidence["track"], TRACK_ID)
        denominator = evidence["unauditedDenominator"]
        self.assertGreater(denominator["totalCount"], 0)
        self.assertEqual(
            denominator["totalCount"],
            denominator["fieldCount"] + denominator["routeCount"],
        )
        self.assertEqual(
            denominator["totalCount"],
            len(denominator["fieldReconciliation"]) + len(denominator["routeReconciliation"]),
        )
        transaction = evidence["scanTransaction"]
        self.assertGreater(transaction["sourceEntryCount"], 0)
        self.assertNotIn("/tmp", json.dumps(transaction))
        self.assertNotIn('"graph.db"', json.dumps(transaction))


class R2Task2AdversarialCompensationTests(unittest.TestCase):
    """Executes every versioned adversarial mutation through the validator."""

    def test_every_versioned_mutation_is_fail_closed(self) -> None:
        """Requires each corpus case to raise its declared stable error code."""
        evidence = _load_json(EVIDENCE_PATH)
        fixtures = _load_json(FIXTURES_PATH)["fixtures"]
        self.assertGreater(len(fixtures), 0)
        for fixture in fixtures:
            with self.subTest(fixture=fixture["name"]):
                clone = copy.deepcopy(evidence)
                self._apply_mutation(clone, fixture["operation"])
                with self.assertRaisesRegex(
                    CompensationValidationError, fixture["expectedFailure"]
                ):
                    validate_compensation_evidence(clone, track_dir=TRACK_DIR)

    def _apply_mutation(self, evidence: dict[str, Any], operation: str) -> None:
        """Applies one declared corpus operation to an in-memory evidence clone.

        @param evidence The cloned evidence object to mutate.
        @param operation The versioned mutation operation.
        @returns Nothing.
        """
        denominator = evidence["unauditedDenominator"]
        if operation == "remove-last-route":
            denominator["routeReconciliation"].pop()
        elif operation == "remove-last-field":
            denominator["fieldReconciliation"].pop()
        elif operation == "duplicate-first-field":
            denominator["fieldReconciliation"].append(copy.deepcopy(denominator["fieldReconciliation"][0]))
        elif operation == "duplicate-first-route":
            denominator["routeReconciliation"].append(copy.deepcopy(denominator["routeReconciliation"][0]))
        elif operation == "copy-first-field-to-routes":
            denominator["routeReconciliation"].append(copy.deepcopy(denominator["fieldReconciliation"][0]))
        elif operation == "tamper-first-field-anchor-kind":
            denominator["fieldReconciliation"][0]["declarationAnchor"]["kind"] = "RouteHandler"
        elif operation == "tamper-first-field-path":
            denominator["fieldReconciliation"][0]["path"] = "apps/not-a-real-path.ts"
        elif operation == "tamper-first-field-name":
            denominator["fieldReconciliation"][0]["name"] = "tampered"
        elif operation == "tamper-first-route-span":
            denominator["routeReconciliation"][0]["lineStart"] += 1
        elif operation == "tamper-first-field-fingerprint":
            denominator["fieldReconciliation"][0]["fingerprint"] = "0" * 64
        elif operation == "tamper-first-field-source-range":
            denominator["fieldReconciliation"][0]["sourceRangeSha256"] = "0" * 64
        elif operation == "tamper-symbol-digest":
            denominator["symbolsSha256"] = "0" * 64
        elif operation == "reuse-scan-one-as-scan-two":
            scan_one = evidence["scanTransaction"]["scan1"]["graphArtifact"]
            scan_two = evidence["scanTransaction"]["scan2"]["graphArtifact"]
            scan_two["sha256"] = scan_one["sha256"]
            scan_two["size"] = scan_one["size"]
        elif operation == "remove-scan-two-inventory":
            evidence["scanTransaction"]["scan2"].pop("normalizedInventory")
        else:
            self.fail(f"unknown corpus operation: {operation}")


class R2Task2NullSpanFallbackTests(unittest.TestCase):
    """Restricts scanner-null route recovery to file-based Next pages."""

    def test_page_null_span_uses_full_file_with_provenance(self) -> None:
        """Allows the explicit full-file fallback for a page.tsx route."""
        position, provenance = resolve_route_position(
            "apps/example/page.tsx", None, None, {"apps/example/page.tsx": b"one\ntwo\n"}
        )
        self.assertEqual((position.line_start, position.line_end), (1, 2))
        self.assertEqual(provenance, "page-file-fallback")

    def test_non_page_null_span_is_rejected(self) -> None:
        """Rejects a scanner-null non-page route instead of inventing a declaration span."""
        with self.assertRaisesRegex(CompensationValidationError, "NULL_SPAN_FALLBACK_NON_PAGE"):
            resolve_route_position(
                "apps/example/route.ts", None, None, {"apps/example/route.ts": b"export {}\n"}
            )


if __name__ == "__main__":
    unittest.main()
