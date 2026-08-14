"""Guards the bounded Existing Core Task 6 retirement disposition."""

from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ROOT = REPO_ROOT / "measure/tracks/apk_existing_core_cutover_20260727"
DISPOSITION_PATH = TRACK_ROOT / "task6-exact-retirement-disposition-v1.json"
OWNER_ACCEPTANCE_PATH = TRACK_ROOT / "task5-task6-product-owner-acceptance-v1.json"
DOSSIER_PATH = TRACK_ROOT / "task5-canonical-reuse-dossiers-v1.json"
MATRIX_PATH = TRACK_ROOT / "task5-canonical-reuse-disposition-matrix-v1.json"
INVENTORY_PATH = TRACK_ROOT / "task5-legacy-source-inventory-v1.json"
READING_REPORT_PATH = TRACK_ROOT / "task5-reading-host-proof-playwright-report-v2.json"
PRIMARY_REPORT_PATH = TRACK_ROOT / "task5-primary-host-proof-playwright-report-v1.json"


def _load(path: Path) -> dict[str, Any]:
    """Loads one repository-local JSON object."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain an object")
    return value


def _sha256(path: Path) -> str:
    """Returns the SHA-256 digest for one evidence file."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _inventory_paths(inventory: dict[str, Any]) -> set[tuple[str, str, str]]:
    """Returns every exact source-inventory path with its title and host."""
    paths = {
        (title["title_id"], "advantage-games", asset["repository_path"])
        for title in inventory["source_backed_titles"]
        for asset in title["assets"]
    }
    paths.update(
        (copy["title_id"], "reading-advantage", copy["repository_path"])
        for copy in inventory["reading_host_public_copies"]
    )
    return paths


class ExistingCoreTask6RetirementTests(unittest.TestCase):
    """Validates exact preservation until retirement proof exists."""

    def test_disposition_binds_inputs_and_resolves_zero_candidates(self) -> None:
        """Requires the disposition to bind current evidence and preserve every path."""
        disposition = _load(DISPOSITION_PATH)
        self.assertEqual(disposition["status"], "blocked-no-approved-retirement-candidates")
        self.assertEqual(disposition["authorization"]["task6_begin_authorized"], True)
        self.assertEqual(disposition["authorization"]["retirement_completed"], False)
        self.assertEqual(disposition["authorization"]["deletion_performed"], False)
        self.assertEqual(disposition["resolution"]["dossier_retirement_candidate_count"], 0)
        self.assertEqual(disposition["resolution"]["matrix_retirement_candidate_count"], 0)
        self.assertEqual(disposition["resolution"]["resolved_proposed_legacy_paths"], [])
        self.assertEqual(disposition["resolution"]["deleted_paths"], [])
        self.assertEqual(disposition["resolution"]["preserved_inventory_path_count"], 32)

        bound_inputs = disposition["bound_inputs"]
        expected_inputs = {
            "task5_task6_owner_acceptance": OWNER_ACCEPTANCE_PATH,
            "canonical_reuse_dossiers": DOSSIER_PATH,
            "canonical_reuse_disposition_matrix": MATRIX_PATH,
            "legacy_source_inventory": INVENTORY_PATH,
            "reading_primary_host_proof_evidence": TRACK_ROOT / "task5-reading-primary-host-proof-evidence-v1.json",
            "reading_host_proof": READING_REPORT_PATH,
            "primary_host_proof": PRIMARY_REPORT_PATH,
        }
        for name, path in expected_inputs.items():
            self.assertEqual(bound_inputs[name]["sha256"], _sha256(path), name)

        inventory = _load(INVENTORY_PATH)
        expected_paths = _inventory_paths(inventory)
        actual_paths = {
            (item["title_id"], item["host"], item["path"])
            for item in disposition["preserved_paths"]
        }
        self.assertEqual(actual_paths, expected_paths)
        self.assertTrue(all(item["disposition"] == "preserve-no-accepted-replacement" for item in disposition["preserved_paths"]))

        dossiers = _load(DOSSIER_PATH)
        self.assertTrue(all(not role.get("legacy_retirement_candidates") for title in dossiers["titles"] for role in title["roles"]))
        matrix = _load(MATRIX_PATH)
        self.assertTrue(all(not row["legacy_retirement_candidates"] for row in matrix["rows"]))

    def test_non_retirement_control_keeps_all_inventory_paths(self) -> None:
        """Rejects a disposition that deletes an unreviewed inventory path."""
        disposition = _load(DISPOSITION_PATH)
        inventory = _load(INVENTORY_PATH)
        for _, _, relative_path in _inventory_paths(inventory):
            self.assertTrue((REPO_ROOT / relative_path).is_file(), relative_path)
        self.assertEqual(disposition["resolution"]["deleted_paths"], [])
        self.assertFalse(disposition["claims"]["retirement_claimed"])
        self.assertFalse(disposition["claims"]["cutover_claimed"])

    def test_host_proof_controls_cover_both_hosts_and_all_titles(self) -> None:
        """Requires both current host reports to retain 41 clean results."""
        reading = _load(READING_REPORT_PATH)
        primary = _load(PRIMARY_REPORT_PATH)
        host_evidence = _load(TRACK_ROOT / "task5-reading-primary-host-proof-evidence-v1.json")
        expected_titles = [
            "dragon-flight",
            "magic-defense",
            "dungeon-liberator",
            "sorcerer-ziggurat",
            "astral-mage",
        ]
        self.assertEqual(host_evidence["host_contract"]["binding_ids"], expected_titles)
        self.assertIn("five fixed bindings", reading["tests"]["matrix_definition"])
        self.assertIn("five fixed bindings", primary["tests"]["matrix_definition"])
        self.assertEqual(
            {
                key: reading["test_result_file"][key]
                for key in ("stats_expected", "stats_unexpected", "stats_skipped")
            },
            {"stats_expected": 41, "stats_unexpected": 0, "stats_skipped": 0},
        )
        self.assertEqual(
            {
                key: primary["tests"]["result_artifact"][key]
                for key in ("stats_expected", "stats_unexpected", "stats_skipped")
            },
            {"stats_expected": 41, "stats_unexpected": 0, "stats_skipped": 0},
        )

    def test_red_exact_retirement_requires_owner_reviewed_replacement(self) -> None:
        """Red: retirement stays incomplete until exact replacement review exists."""
        disposition = _load(DISPOSITION_PATH)
        self.assertTrue(
            disposition["authorization"]["retirement_completed"],
            "Task 6 Red: exact replacement review and retirement proof are not complete",
        )


if __name__ == "__main__":
    unittest.main()
