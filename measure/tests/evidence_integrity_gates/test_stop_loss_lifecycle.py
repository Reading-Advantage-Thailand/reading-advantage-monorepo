"""End-to-end CLI tests for the fail-closed Phase 3 lifecycle gate."""

from __future__ import annotations

import base64
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURE_ROOT = Path(__file__).resolve().parent / "fixtures" / "lifecycle"


def _canonical_hash(value: Any) -> str:
    """Returns the SHA-256 of a canonical JSON value.

    @param value JSON-compatible value to hash.
    @returns Lowercase SHA-256 digest.
    """
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


def _valid_history() -> dict[str, Any]:
    """Builds one complete candidate-to-accepted lifecycle history.

    @returns A self-contained history that the CLI must accept.
    """
    gate = {
        "phase": 4,
        "status": "accepted",
        "commit": "a" * 40,
        "manifest_hash": "b" * 64,
        "version": "phase4-accepted-v1",
        "files": {"measure/evidence_integrity_gates/lifecycle.py": "c" * 64},
    }
    candidate = {
        "status": "candidate",
        "games": ["dragon-flight", "rpg-battle", "abyssal-well"],
        "unsupported_claims": [],
        "denominator": {"discovered_items": 3, "reconciled_items": 3},
        "failed_fix_review_cycles": 0,
        "resources": {"tokens": 1000, "seconds": 60},
        "frozen_resource_ceilings": {"tokens": 1200, "seconds": 90},
        "inputs_manifest_hash": "d" * 64,
        "gate": gate,
    }
    candidate_hash = _canonical_hash(candidate)
    review = {
        "status": "reviewed",
        "completed_ms": 10,
        "candidate_hash": candidate_hash,
        "inputs_manifest_hash": candidate["inputs_manifest_hash"],
        "gate_hash": _canonical_hash(gate),
        "findings": [],
    }
    review_hash = _canonical_hash(review)
    expected_hashes = {
        "candidate": candidate_hash,
        "review": review_hash,
        "gate": _canonical_hash(gate),
    }
    approval_message = json.dumps(
        {"decision": "approve", "approved_hashes": expected_hashes},
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    event_id = "evt_owner_approval"
    raw_export = json.dumps(
        {
            "info": {"id": "ses_owner"},
            "messages": [
                {
                    "info": {"id": event_id, "role": "user"},
                    "parts": [{"type": "text", "text": approval_message.decode("utf-8")}],
                }
            ],
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    approval = {
        "schema_version": "evidence-integrity.phase2.v1",
        "event_id": event_id,
        "session_id": "ses_owner",
        "event_timestamp_ms": 20,
        "decision": "approve",
        "message_sha256": hashlib.sha256(approval_message).hexdigest(),
        "approved_hashes": expected_hashes,
    }
    return {
        "schema_version": "evidence-integrity.phase3.v1",
        "candidate": candidate,
        "review": review,
        "approval": approval,
        "pilot": {
            "status": "accepted",
            "candidate_hash": candidate_hash,
            "review_hash": review_hash,
        },
        "product_track": {
            "first_work_started": True,
            "gate_commit": gate["commit"],
            "gate_manifest_hash": gate["manifest_hash"],
            "gate_version": gate["version"],
            "gate_files": gate["files"],
        },
        "events": {
            event_id: {
                "provenance_kind": "opencode-raw-export",
                "id": event_id,
                "role": "user",
                "actor_role": "product-owner",
                "session_id": "ses_owner",
                "created_ms": 20,
                "raw_export_base64": base64.b64encode(raw_export).decode("ascii"),
                "raw_export_sha256": hashlib.sha256(raw_export).hexdigest(),
                "message_base64": base64.b64encode(approval_message).decode("ascii"),
            }
        },
    }


class StopLossLifecycleCliTests(unittest.TestCase):
    """Exercises valid and invalid lifecycle histories only through the CLI boundary."""

    maxDiff = None

    def _run(self, history: dict[str, Any]) -> tuple[subprocess.CompletedProcess[str], dict[str, Any]]:
        """Runs the lifecycle CLI against one temporary history document.

        @param history JSON-compatible lifecycle history.
        @returns CLI process result and its structured report.
        """
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "history.json"
            path.write_text(json.dumps(history), encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "measure.evidence_integrity_gates.cli",
                    "lifecycle",
                    "--history",
                    str(path),
                ],
                cwd=REPO_ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
        return result, json.loads(result.stdout)

    def _assert_blocked(self, history: dict[str, Any], code: str) -> None:
        """Asserts one CLI history is fail-closed with a stable blocker.

        @param history Invalid lifecycle history.
        @param code Expected first stable blocker code.
        @returns Nothing.
        """
        result, report = self._run(history)
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertFalse(report["ok"])
        self.assertEqual(report["blockers"][0]["code"], code)

    def _run_fixture(self, path: Path) -> tuple[subprocess.CompletedProcess[str], dict[str, Any]]:
        """Runs the CLI against a committed end-to-end fixture document.

        @param path Lifecycle fixture path.
        @returns CLI process result and its structured report.
        """
        result = subprocess.run(
            [sys.executable, "-m", "measure.evidence_integrity_gates.cli", "lifecycle", "--history", str(path)],
            cwd=REPO_ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        return result, json.loads(result.stdout)

    def test_001_valid_history_is_accepted_and_emits_transition_resource_report(self) -> None:
        """Accepts the canonical lifecycle and emits a deterministic report."""
        result, report = self._run(_valid_history())
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(report["ok"])
        self.assertEqual(report["state"], "accepted")
        self.assertEqual(
            [transition["to"] for transition in report["transitions"]],
            ["candidate", "reviewed", "owner_approved", "accepted"],
        )
        self.assertEqual(report["resource_report"]["tokens"]["used"], 1000)
        self.assertEqual(report["resource_report"]["seconds"]["ceiling"], 90)

    def test_002_maximum_three_games_is_enforced(self) -> None:
        """Blocks a four-game batch before candidate progression."""
        history = _valid_history()
        history["candidate"]["games"].append("fourth-game")
        self._assert_blocked(history, "BATCH_SIZE_EXCEEDED")

    def test_003_unsupported_claim_stops_the_history(self) -> None:
        """Blocks unsupported claims deterministically."""
        history = _valid_history()
        history["candidate"]["unsupported_claims"] = ["unresolved claim"]
        self._assert_blocked(history, "UNSUPPORTED_CLAIM_STOP")

    def test_004_denominator_mismatch_stops_the_history(self) -> None:
        """Blocks independent-denominator disagreement."""
        history = _valid_history()
        history["candidate"]["denominator"]["reconciled_items"] = 2
        self._assert_blocked(history, "DENOMINATOR_MISMATCH_STOP")

    def test_005_two_failed_fix_review_cycles_block_progress(self) -> None:
        """Blocks at the second failed fix/review cycle."""
        history = _valid_history()
        history["candidate"]["failed_fix_review_cycles"] = 2
        self._assert_blocked(history, "FAILED_FIX_REVIEW_CYCLES_EXHAUSTED")

    def test_006_unresolved_critical_high_and_medium_findings_block(self) -> None:
        """Blocks every severity that cannot remain open at acceptance."""
        for severity in ("Critical", "High", "Medium"):
            with self.subTest(severity=severity):
                history = _valid_history()
                history["review"]["findings"] = [{"severity": severity, "resolved": False}]
                self._assert_blocked(history, "UNRESOLVED_BLOCKING_FINDING")

    def test_007_resources_must_be_positive_numeric_labeled_and_under_frozen_ceilings(self) -> None:
        """Blocks each resource-accounting shortcut at the CLI boundary."""
        cases = (
            ("unmeasured", "UNMEASURED_RESOURCE"),
            ("1000", "NON_NUMERIC_RESOURCE"),
            (0, "NON_POSITIVE_RESOURCE"),
            (1300, "RESOURCE_CEILING_EXCEEDED"),
        )
        for value, code in cases:
            with self.subTest(value=value):
                history = _valid_history()
                history["candidate"]["resources"]["tokens"] = value
                self._assert_blocked(history, code)
        history = _valid_history()
        history["candidate"]["resources"] = {"amount": 1000}
        history["candidate"]["frozen_resource_ceilings"] = {"amount": 1200}
        self._assert_blocked(history, "RESOURCE_UNIT_INVALID")

    def test_008_ordering_and_pilot_acceptance_are_required(self) -> None:
        """Rejects skipped review and missing pilot acceptance."""
        history = _valid_history()
        history.pop("review")
        self._assert_blocked(history, "REVIEW_REQUIRED_BEFORE_APPROVAL")
        history = _valid_history()
        history["pilot"]["status"] = "pending"
        self._assert_blocked(history, "PILOT_ACCEPTANCE_REQUIRED")

    def test_009_approval_replay_is_rejected_by_the_adapter(self) -> None:
        """Consumes an authentic approval event exactly once across CLI runs."""
        # The process boundary creates a fresh resolver, so the replay proof uses the
        # CLI's explicit consumed-event adapter input rather than direct lifecycle calls.
        history = _valid_history()
        history["consumed_approval_event_ids"] = ["evt_owner_approval"]
        self._assert_blocked(history, "OWNER_APPROVAL_REPLAYED")

    def test_010_gate_input_candidate_review_and_product_pin_changes_revoke(self) -> None:
        """Requires complete revalidation after every frozen dependency changes."""
        mutations = (
            (lambda item: item["review"].__setitem__("inputs_manifest_hash", "e" * 64), "INPUT_CHANGED_REVALIDATION_REQUIRED"),
            (lambda item: item["candidate"].__setitem__("games", ["changed-game"]), "CANDIDATE_CHANGED_REVALIDATION_REQUIRED"),
            (lambda item: item["review"].__setitem__("completed_ms", 11), "REVIEW_CHANGED_REVALIDATION_REQUIRED"),
            (lambda item: item["candidate"]["gate"].__setitem__("version", "phase4-accepted-v2"), "GATE_CHANGED_REVALIDATION_REQUIRED"),
            (lambda item: item["product_track"].__setitem__("gate_manifest_hash", "f" * 64), "PRODUCT_GATE_PIN_CHANGED_REVALIDATION_REQUIRED"),
        )
        for mutation, code in mutations:
            with self.subTest(code=code):
                history = _valid_history()
                mutation(history)
                self._assert_blocked(history, code)

    def test_011_product_work_requires_an_accepted_phase_four_pin_before_start(self) -> None:
        """Blocks product work that starts without an accepted Phase 4 gate pin."""
        history = _valid_history()
        history["product_track"].pop("gate_commit")
        self._assert_blocked(history, "PRODUCT_GATE_PIN_REQUIRED_BEFORE_WORK")
        history = _valid_history()
        history["candidate"]["gate"]["phase"] = 3
        self._assert_blocked(history, "ACCEPTED_PHASE4_GATE_REQUIRED")

    def test_012_committed_valid_and_invalid_histories_run_through_the_cli(self) -> None:
        """Executes the committed end-to-end control and counterexample histories."""
        valid_result, valid_report = self._run_fixture(FIXTURE_ROOT / "valid" / "accepted-history.json")
        invalid_result, invalid_report = self._run_fixture(FIXTURE_ROOT / "invalid" / "four-game-batch.json")
        self.assertEqual(valid_result.returncode, 0, valid_result.stderr)
        self.assertTrue(valid_report["ok"])
        self.assertEqual(invalid_result.returncode, 1, invalid_result.stderr)
        self.assertEqual(invalid_report["blockers"][0]["code"], "BATCH_SIZE_EXCEEDED")


if __name__ == "__main__":
    unittest.main()
