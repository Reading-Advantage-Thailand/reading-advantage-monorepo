"""Mechanical falsification checks for the APK denominator Phase-0 freeze."""

from __future__ import annotations

import hashlib
import json
import subprocess
import unittest
from itertools import combinations
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK = "apk_source_denominator_inventory_20260712"
BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / TRACK
FREEZE_PATH = TRACK_DIR / "phase0-input-freeze.json"
ROLE_PATH = TRACK_DIR / "phase0-role-ownership-manifest.json"
METADATA_PATH = TRACK_DIR / "metadata.json"


def _load(path: Path) -> dict[str, object]:
    """Loads one JSON object used by the Phase-0 contract.

    Args:
        path: JSON artifact to load.

    Returns:
        The parsed JSON object.
    """
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain a JSON object")
    return value


def _git(*arguments: str) -> str:
    """Runs a read-only Git command against the repository.

    Args:
        arguments: Arguments after the Git executable.

    Returns:
        Standard output from the successful command.
    """
    result = subprocess.run(
        ["git", *arguments],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=True,
    )
    return result.stdout


class Phase0FreezeTests(unittest.TestCase):
    """Rejects drift or scope weakening in the frozen T2 setup."""

    def setUp(self) -> None:
        """Loads the freeze, role plan, and product-track metadata.

        Returns:
            Nothing.
        """
        self.freeze = _load(FREEZE_PATH)
        self.roles = _load(ROLE_PATH)
        self.metadata = _load(METADATA_PATH)

    def test_accepted_predecessor_is_bound_to_baseline_bytes_and_metadata_pin(self) -> None:
        """Binds T2 only to the accepted, consumable T1 predecessor bytes.

        Returns:
            Nothing.
        """
        predecessor = self.freeze["accepted_predecessor"]
        self.assertIsInstance(predecessor, dict)
        assert isinstance(predecessor, dict)
        manifest_path = predecessor["manifest_path"]
        self.assertIsInstance(manifest_path, str)
        assert isinstance(manifest_path, str)
        manifest_bytes = _git("show", f"{BASELINE}:{manifest_path}").encode()
        self.assertEqual(hashlib.sha256(manifest_bytes).hexdigest(), predecessor["manifest_sha256"])
        manifest = json.loads(manifest_bytes)
        self.assertEqual(manifest["status"], predecessor["required_status"])
        self.assertEqual(manifest["consumable"], predecessor["required_consumable"])
        self.assertEqual(manifest["revoked"], predecessor["required_revoked"])
        self.assertEqual(manifest["gate_version"], predecessor["gate_version"])
        self.assertEqual(manifest["gate_commit"], predecessor["gate_commit"])
        self.assertEqual(self.metadata["evidence_integrity_gate"]["manifest_sha256"], predecessor["manifest_sha256"])

    def test_scope_and_quarantine_are_baseline_bound_and_non_factual(self) -> None:
        """Rejects worktree, future, and failed-track input leakage.

        Returns:
            Nothing.
        """
        self.assertEqual(self.freeze["baseline_revision"], BASELINE)
        scope = self.freeze["source_scope"]
        quarantine = self.freeze["failed_track_quarantine"]
        self.assertIsInstance(scope, dict)
        self.assertIsInstance(quarantine, dict)
        assert isinstance(scope, dict) and isinstance(quarantine, dict)
        self.assertEqual(scope["current_revision"], BASELINE)
        self.assertIn(BASELINE, scope["history_command_template"])
        self.assertIn("uncommitted", scope["current_tree_rule"].lower())
        tree = _git("rev-parse", f"{BASELINE}:{quarantine['path']}").strip()
        self.assertEqual(tree, quarantine["baseline_tree_sha1"])
        self.assertEqual(quarantine["disposition"], "rejected-not-completion")
        self.assertIn("Negative fixture", quarantine["permitted_use"])
        self.assertIn("may not supply", quarantine["forbidden_use"])
        roots = scope["roots"]
        self.assertIsInstance(roots, list)
        self.assertTrue(roots)
        self.assertNotIn(quarantine["path"], roots)

    def test_numeric_stop_loss_and_complete_isolated_ownership_are_frozen(self) -> None:
        """Rejects unmeasured budgets, weakened stops, or overlapping role plans.

        Returns:
            Nothing.
        """
        ceilings = self.freeze["frozen_resource_ceilings"]
        stop_loss = self.freeze["stop_loss"]
        self.assertIsInstance(ceilings, dict)
        self.assertIsInstance(stop_loss, dict)
        assert isinstance(ceilings, dict) and isinstance(stop_loss, dict)
        expected_roles = set(self.roles["required_roles"])
        self.assertEqual(set(ceilings), expected_roles)
        for role_budget in ceilings.values():
            self.assertIsInstance(role_budget, dict)
            assert isinstance(role_budget, dict)
            self.assertTrue(role_budget)
            self.assertTrue(all(isinstance(value, int) and not isinstance(value, bool) and value > 0 for value in role_budget.values()))
        self.assertEqual(stop_loss["max_games_per_batch"], 3)
        self.assertEqual(stop_loss["unsupported_factual_claims_before_stop"], 1)
        self.assertEqual(stop_loss["denominator_mismatches_before_stop"], 1)
        self.assertEqual(stop_loss["failed_fix_review_cycles_before_block"], 2)
        self.assertEqual(stop_loss["unresolved_blocking_severities"], ["critical", "high", "medium"])
        self.assertTrue(stop_loss["unmeasured_resource_usage_blocks_checkpoint"])
        self.assertTrue(stop_loss["ceiling_change_requires_product_owner_approval"])
        self.assertEqual(set(self.roles["role_applicability"]), expected_roles)
        self.assertTrue(all(self.roles["role_applicability"].values()))
        self.assertEqual(
            self.roles["allowed_input_manifest_sha256"],
            hashlib.sha256(FREEZE_PATH.read_bytes()).hexdigest(),
        )
        pairs = {tuple(sorted(pair)) for pair in self.roles["incompatible_roles"]}
        self.assertEqual(pairs, {tuple(sorted(pair)) for pair in combinations(expected_roles, 2)})
        self.assertEqual(set(self.roles["root_agent"]["forbidden_roles"]), expected_roles)

    def test_expected_artifacts_are_unique_and_role_owned_without_claiming_receipts(self) -> None:
        """Requires exact future output contracts while rejecting fabricated execution proof.

        Returns:
            Nothing.
        """
        artifacts = self.freeze["expected_artifacts"]
        self.assertIsInstance(artifacts, list)
        assert isinstance(artifacts, list)
        paths = [artifact["path"] for artifact in artifacts]
        self.assertEqual(len(paths), len(set(paths)))
        self.assertTrue(all(path.startswith(f"measure/tracks/{TRACK}/") for path in paths))
        self.assertTrue(all(artifact["schema_version"].endswith(".v1") for artifact in artifacts))
        self.assertEqual(self.roles["status"], "frozen-not-executed")
        self.assertIn("not a receipt", self.roles["execution_note"])
        tasks = self.roles["tasks"]
        self.assertEqual({task["owner_role"] for task in tasks}, set(self.roles["required_roles"]))
        owned = [output for task in tasks for output in task["expected_outputs"]]
        self.assertEqual(len(owned), len(set(owned)))


if __name__ == "__main__":
    unittest.main()
