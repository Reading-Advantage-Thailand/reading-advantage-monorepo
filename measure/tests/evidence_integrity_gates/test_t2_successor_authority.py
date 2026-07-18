"""Focused contracts for the T2 successor evidence-production authority."""

from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from measure.tracks.apk_source_denominator_inventory_20260712.verify_phase4_role_evidence import (
    T2EvidenceVerificationError,
    build_reviewed_input_ledger,
    validate_truth_report,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK = "apk_source_denominator_inventory_20260712"
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / TRACK
FREEZE_PATH = TRACK_DIR / "phase0-input-freeze.json"
OWNERSHIP_PATH = TRACK_DIR / "phase0-role-ownership-manifest.json"
BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
FINAL_ROLES = {"truth-test-author", "adversarial-reviewer"}


def _load(path: Path) -> dict[str, object]:
    """Loads one JSON object from the successor authority.

    Args:
        path: JSON artifact to load.

    Returns:
        Parsed JSON object.
    """
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain an object")
    return value


class SuccessorAuthorityTests(unittest.TestCase):
    """Rejects unverifiable final-role commands or ambiguous rerun consequences."""

    def setUp(self) -> None:
        """Loads the frozen input and ownership manifests.

        Returns:
            Nothing.
        """
        self.freeze = _load(FREEZE_PATH)
        self.ownership = _load(OWNERSHIP_PATH)

    def test_final_roles_have_one_pinned_verifier_and_exact_commit_ownership(self) -> None:
        """Requires one sanitized verifier and adjacent single-output commit per role."""
        tasks = {task["owner_role"]: task for task in self.ownership["tasks"]}
        for role in FINAL_ROLES:
            task = tasks[role]
            contract = task["execution_contract"]
            self.assertEqual(contract["allowed_provider_tools"], ["bash", "read", "write"])
            self.assertFalse(contract["direct_write_only"])
            self.assertEqual(contract["direct_write_outputs"], [])
            self.assertEqual(contract["ordered_operations"], ["generator:0"])
            self.assertEqual(contract["read_only_shell_commands"], [])
            self.assertEqual(len(contract["shell_generators"]), 1)
            verifier = contract["shell_generators"][0]
            command = verifier["command_template"]
            self.assertTrue(command.startswith(
                "/usr/bin/env -i PATH=/opt/codex-desktop/resources/node-runtime/bin:/usr/bin:/bin "
                "LANG=C PYTHONDONTWRITEBYTECODE=1 /usr/bin/python3 -I -S -c "
            ))
            self.assertIn("verify_phase4_role_evidence.py", command)
            self.assertIn(f"--role {role}", command)
            self.assertIn("--phase0-authority-revision {phase0_commit}", command)
            self.assertNotIn(";", command)
            self.assertNotIn("&&", command)
            self.assertNotIn("||", command)
            if role == "adversarial-reviewer":
                self.assertIn("--phase2-receipt-revision {phase2_receipt_commit}", command)
            self.assertEqual(
                verifier["owned_outputs"],
                [f"measure/tracks/{TRACK}/{task['expected_outputs'][0]}"],
            )
            commit = verifier["commit"]
            self.assertEqual(commit["mode"], "normal-only")
            self.assertTrue(commit["immediate_adjacency"])
            self.assertEqual(commit["attestation_commit_source"], "output_commit")
            for dependency in verifier["dependency_blobs"]:
                revision = dependency["revision"]
                path = dependency["path"]
                blob = __import__("subprocess").check_output(
                    ["/usr/bin/git", "show", f"{revision}:{path}"], cwd=REPO_ROOT
                )
                self.assertEqual(hashlib.sha256(blob).hexdigest(), dependency["sha256"])

    def test_successor_declares_that_every_role_receipt_must_be_rerun(self) -> None:
        """Documents the fail-closed consequence of changing the authority hash."""
        successor = self.freeze["authority_successor"]
        self.assertTrue(successor["requires_all_role_reruns"])
        self.assertEqual(set(successor["invalidated_roles"]), set(self.ownership["required_roles"]))
        self.assertEqual(
            successor["reason"],
            "Every admitted receipt must name one authority commit, bind its exact input-freeze hash, and descend from that authority commit.",
        )
        self.assertFalse(successor["product_owner_acceptance_claimed"])

    def test_review_accounting_requires_the_exact_frozen_ledger_path_set(self) -> None:
        """Requires the reviewer verifier to derive every ledger hash from Git bytes."""
        accounting = self.freeze["resource_accounting"]["roles"]["adversarial-reviewer"]
        ledger = build_reviewed_input_ledger(
            REPO_ROOT,
            "HEAD",
            tuple(accounting["required_artifact_paths"]),
        )
        self.assertEqual(
            [entry["path"] for entry in ledger], accounting["required_artifact_paths"]
        )
        self.assertTrue(all(entry["revision"] for entry in ledger))
        self.assertTrue(all(len(entry["sha256"]) == 64 for entry in ledger))

    def test_truth_report_rejects_a_passing_summary_that_disagrees_with_inventory(self) -> None:
        """Proves the admission report cannot claim more passing tests than were run."""
        report = {
            "schema_version": "apk-denominator-contract-test-report.v1",
            "status": "red-contract-authored",
            "track_id": TRACK,
            "source_baseline_revision": BASELINE,
            "role": "truth-test-author",
            "phase0_3_admission_command": "frozen-command",
            "phase0_3_admission_result": {
                "total_tests": 2,
                "passed": 2,
                "failed": 0,
                "exit_code": 0,
                "status": "passed",
            },
            "test_inventory": [
                {"phase": 0, "module": "m0", "tests": 1, "passed": 1, "failed": 0, "exit_code": 0}
            ],
            "stop_loss_counters": {
                "unsupported_factual_claims": 0,
                "denominator_mismatches": 0,
                "failed_fix_review_cycles": 0,
                "unresolved_blocking_findings": {"critical": 0, "high": 0, "medium": 0},
            },
            "unsupported_claims_count": 0,
        }
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "report.json"
            path.write_text(json.dumps(report), encoding="utf-8")
            with self.assertRaisesRegex(
                T2EvidenceVerificationError, "admission summary differs"
            ):
                validate_truth_report(path, report["test_inventory"], "frozen-command")


if __name__ == "__main__":
    unittest.main()
