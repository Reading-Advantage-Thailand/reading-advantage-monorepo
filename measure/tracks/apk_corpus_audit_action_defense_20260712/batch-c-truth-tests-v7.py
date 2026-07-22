"""Fail-closed Batch C v7 selector contracts bound to the fresh Browser and Asset successors."""

from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path
from typing import Any


HERE = Path(__file__).resolve()
ROOT = HERE.parents[3]
TRACK_DIR = HERE.parent
EXPECTED_ROLES = {
    "C3-DISCOVERY": "discovery-auditor-batch-c",
    "C3-COLLECT-PALADIN": "evidence-collector-paladins-twin-soul-batch-c",
    "C3-COLLECT-GRYPHON": "evidence-collector-gryphon-patrol-batch-c",
    "C3-MAP-PALADIN": "requirements-mapper-paladins-twin-soul-batch-c",
    "C3-MAP-GRYPHON": "requirements-mapper-gryphon-patrol-batch-c",
    "C3-TRUTH": "truth-test-author-batch-c",
    "C3-BROWSER": "browser-auditor-batch-c",
    "C3-ASSET": "asset-auditor-batch-c",
}


def load(path: Path) -> Any:
    """Loads a JSON artifact.

    @param path JSON artifact path.
    @returns Parsed JSON value.
    """
    return json.loads(path.read_text())


def file_sha(path: Path) -> str:
    """Returns the SHA-256 digest for an exact file.

    @param path File whose bytes are bound.
    @returns Lowercase SHA-256 digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


class BatchCV7SelectorContract(unittest.TestCase):
    """Requires the stable v7 selector to preserve the current denominator role set."""

    def test_eight_exact_role_bindings_are_hash_bound(self) -> None:
        """Requires the eight current roles, unique providers, and exact proof and receipt bytes."""
        selection = load(TRACK_DIR / "batch-c-role-receipt-selection-v7.json")
        self.assertEqual(selection["schema"], "apk-role-receipt-selection.v7")
        self.assertFalse(selection["lifecycle"]["candidate_authorized"])
        self.assertFalse(selection["lifecycle"]["acceptance_authorized"])
        entries = selection["selected_receipts"]
        self.assertEqual({entry["task_id"] for entry in entries}, set(EXPECTED_ROLES))
        self.assertEqual(len(entries), 8)
        self.assertEqual(len({entry["provider_identifier"] for entry in entries}), 8)
        for entry in entries:
            self.assertEqual(entry["role"], EXPECTED_ROLES[entry["task_id"]])
            self.assertTrue(entry["parent_task"].strip())
            self.assertEqual(file_sha(ROOT / entry["receipt_path"]), entry["receipt_sha256"])
            self.assertEqual(file_sha(ROOT / entry["proof_path"]), entry["proof_sha256"])

    def test_corrected_denominator_contract_is_reused_unchanged(self) -> None:
        """Binds the v7 selector to the established corrected denominator instead of widening it."""
        selection = load(TRACK_DIR / "batch-c-role-receipt-selection-v7.json")
        contract = selection["selection_contract"]
        correction = ROOT / contract["corrected_denominator"]["path"]
        self.assertEqual(file_sha(correction), contract["corrected_denominator"]["sha256"])
        self.assertEqual(load(correction)["status"], "denominator-corrected-awaiting-fresh-specialists")
        self.assertEqual(contract["denominator_scope"], "reused-without-expansion")

    def test_browser_v6_is_helper_bound_non_runnable_and_v5_is_excluded(self) -> None:
        """Requires the root-arbiter Browser v6 set, helper-only captures, and bounded 404 truth."""
        selection = load(TRACK_DIR / "batch-c-role-receipt-selection-v7.json")
        browser = next(item for item in selection["selected_receipts"] if item["task_id"] == "C3-BROWSER")
        deviation = ROOT / selection["required_exclusions"]["browser_v5_skill_deviation"]["path"]
        self.assertEqual(file_sha(deviation), selection["required_exclusions"]["browser_v5_skill_deviation"]["sha256"])
        self.assertEqual(load(deviation)["lifecycle"]["v5_browser_selection_authorized"], False)
        ownership = load(ROOT / browser["ownership"]["path"])
        self.assertEqual(file_sha(ROOT / browser["ownership"]["path"]), browser["ownership"]["sha256"])
        self.assertEqual(browser["provider_identifier"], ownership["provider_identifier"])
        self.assertEqual(browser["parent_task"], ownership["parent_task"])
        self.assertEqual(browser["proof_path"], ownership["reserved_paths"][-2])
        self.assertEqual(browser["receipt_path"], ownership["reserved_paths"][-1])
        audit = load(ROOT / browser["audit"]["path"])
        proof = load(ROOT / browser["proof_path"])
        receipt = load(ROOT / browser["receipt_path"])
        self.assertEqual(file_sha(ROOT / browser["audit"]["path"]), browser["audit"]["sha256"])
        self.assertEqual(proof["attestations"]["helper_only_capture_requests"], True)
        self.assertEqual(proof["attestations"]["direct_screenshot_api_command_by_role"], False)
        self.assertTrue(receipt["scope_attestation"]["helper_only_capture_requests"])
        self.assertFalse(receipt["scope_attestation"]["direct_screenshot_api_command_by_role"])
        self.assertTrue(receipt["result"]["session_closed"])
        self.assertTrue(receipt["result"]["server_stopped"])
        self.assertTrue(receipt["result"]["port_closed"])
        disclosure = audit["screenshots"]["daemon_helper_compatibility_disclosure"]
        self.assertEqual(disclosure, selection["browser_helper_compatibility_disclosure"])
        self.assertEqual(audit["screenshots"]["capture_policy"], selection["browser_helper_capture_policy"])
        self.assertIn("mandated screenshot helper", selection["browser_helper_capture_policy"])
        self.assertIn("exited 4 after successful post-processing", disclosure)
        self.assertIn("exit 28", disclosure)
        self.assertIn("copied unchanged", disclosure)
        self.assertIn("source and destination hashes matched", disclosure)
        for route in audit["route_observations"]:
            self.assertEqual(route["network_status"], 404)
            self.assertEqual(route["disposition"], "non-runnable-at-bound-head")
        for output in receipt["outputs"]:
            if output["sha256"] is not None:
                self.assertEqual(file_sha(ROOT / output["path"]), output["sha256"])

    def test_asset_root_arbiter_set_requires_independent_successor_without_rewrite(self) -> None:
        """Requires the root-arbiter Asset set and its independent validation companion."""
        selection = load(TRACK_DIR / "batch-c-role-receipt-selection-v7.json")
        asset = next(item for item in selection["selected_receipts"] if item["task_id"] == "C3-ASSET")
        ownership = load(ROOT / asset["ownership"]["path"])
        self.assertEqual(file_sha(ROOT / asset["ownership"]["path"]), asset["ownership"]["sha256"])
        self.assertEqual(asset["provider_identifier"], ownership["provider_identifier"])
        self.assertEqual(asset["parent_task"], ownership["parent_task"])
        self.assertEqual(asset["proof_path"], ownership["reserved_paths"][-2])
        self.assertEqual(asset["receipt_path"], ownership["reserved_paths"][-1])
        receipt = load(ROOT / asset["receipt_path"])
        self.assertEqual(receipt["validation"], asset["original_pending_validation_fields"])
        companion = asset["independent_validation_successor"]
        self.assertEqual(file_sha(ROOT / companion["record"]["path"]), companion["record"]["sha256"])
        self.assertEqual(file_sha(ROOT / companion["proof"]["path"]), companion["proof"]["sha256"])
        self.assertEqual(file_sha(ROOT / companion["receipt"]["path"]), companion["receipt"]["sha256"])
        validation = load(ROOT / companion["record"]["path"])
        self.assertEqual(validation["status"], "complete-bounded-independent-validation")
        self.assertTrue(
            all(check["result"] == "pass" for check in validation["independent_checks"].values())
        )
        self.assertEqual(
            load(ROOT / companion["receipt"]["path"])["original_receipt_disposition"],
            "The original root-arbiter receipt remains unchanged and truthfully retains its five pending self-check fields. This successor accompanies it; it neither replaces nor impersonates the selected Asset role.",
        )

    def test_known_collision_artifacts_are_fail_closed(self) -> None:
        """Excludes both collided Asset v4 sets and the invalid Gryphon mapper v5 selection."""
        selection = load(TRACK_DIR / "batch-c-role-receipt-selection-v7.json")
        entries = selection["selected_receipts"]
        selected_paths = {item["receipt_path"] for item in entries} | {item["proof_path"] for item in entries}
        asset_collision = load(TRACK_DIR / "batch-c-asset-auditor-v4-collision.json")
        self.assertFalse(asset_collision["arbitration"]["v4_selection_authorized"])
        for provider_set in asset_collision["provider_sets"]:
            self.assertNotIn(provider_set["provider_identifier"], {item["provider_identifier"] for item in entries})
            self.assertTrue(selected_paths.isdisjoint({item["path"] for item in provider_set["files"]}))
        mapper_collision = load(TRACK_DIR / "batch-c-gryphon-mapper-v5-collision.json")
        self.assertFalse(mapper_collision["arbitration"]["v5_selection_authorized"])


if __name__ == "__main__":
    unittest.main()
