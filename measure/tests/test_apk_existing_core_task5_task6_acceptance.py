"""Guards the additive Existing Core Task-5 acceptance and Task-6 handoff."""

from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
CORE_TRACK = REPO_ROOT / "measure/tracks/apk_existing_core_cutover_20260727"
SUITABILITY_TRACK = REPO_ROOT / "measure/tracks/apk_standard_pack_suitability_ingestion_20260728"
ACCEPTANCE_PATH = CORE_TRACK / "task5-task6-product-owner-acceptance-v1.json"
HISTORICAL_OWNER_PATH = CORE_TRACK / "task5-canonical-reuse-owner-acceptance-v1.json"

APPROVAL_MESSAGE = (
    "Approve the exact five-title/17-role canonical-reuse dossiers, disposition matrix, selected unions, additive lineage, and current Reading/Primary 41-result host proofs bound by the latest zero-blocker audit. Record additive product-owner acceptance with unavailable durable IDs null (never fabricated). Authorize these exact bindings as consumable for Existing Core Task 5 and authorize beginning Task 6 exact legacy retirement; do not yet authorize production catalog exposure, deployment, cohort closeout, or broader APK claims."
)
EXPECTED_TITLES = [
    "dragon-flight",
    "magic-defense",
    "dungeon-liberator",
    "sorcerer-ziggurat",
    "astral-mage",
]
EXPECTED_UNIONS = [
    {
        "title_id": "dragon-flight",
        "semantic_keys": [
            "audio/native/combat/hit-01",
            "effects/32x32/combat/hit-01",
            "top-down/32x32/characters/hero-01",
        ],
    },
    {
        "title_id": "magic-defense",
        "semantic_keys": [
            "audio/native/combat/hit-01",
            "effects/32x32/combat/hit-01",
            "ui/20x20/inventory/slot",
            "ui/32x32/items/armor-icons",
        ],
    },
    {
        "title_id": "dungeon-liberator",
        "semantic_keys": [
            "effects/32x32/combat/hit-01",
            "side-view/32x32/characters/enemy-001-idle",
            "top-down/32x32/characters/hero-01",
            "ui/16x16/controls/gamepad-buttons",
        ],
    },
    {
        "title_id": "sorcerer-ziggurat",
        "semantic_keys": [
            "effects/32x32/combat/hit-01",
            "top-down/32x32/characters/hero-01",
            "ui/16x16/controls/gamepad-buttons",
        ],
    },
    {
        "title_id": "astral-mage",
        "semantic_keys": [
            "audio/native/combat/hit-01",
            "effects/32x32/combat/hit-01",
            "top-down/32x32/characters/hero-01",
        ],
    },
]


def _load(path: Path) -> dict[str, Any]:
    """Loads one repository-local JSON object.

    Args:
        path: JSON artifact to load.

    Returns:
        Parsed JSON object.
    """
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain an object")
    return value


def _sha256(path: Path) -> str:
    """Returns the SHA-256 digest of one exact repository file.

    Args:
        path: File whose bytes are bound.

    Returns:
        Lowercase SHA-256 digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _path(relative_path: str) -> Path:
    """Resolves a repository-relative binding without allowing path escape.

    Args:
        relative_path: Repository-relative artifact path.

    Returns:
        Resolved repository path.
    """
    candidate = (REPO_ROOT / relative_path).resolve()
    candidate.relative_to(REPO_ROOT.resolve())
    return candidate


class ExistingCoreTask5Task6AcceptanceTests(unittest.TestCase):
    """Validates the exact bounded owner decision and lifecycle markers."""

    def test_acceptance_binds_exact_inputs_and_never_fabricates_durable_ids(self) -> None:
        """Requires every successor binding to match current bytes and exact unions."""
        acceptance = _load(ACCEPTANCE_PATH)
        self.assertEqual(acceptance["schema_version"], "apk-existing-core-task5-task6-product-owner-acceptance.v1")
        self.assertEqual(acceptance["status"], "accepted-task5-consumable-authorized-task6-begin")
        self.assertEqual(acceptance["approval_event"]["message_exact"], APPROVAL_MESSAGE)
        self.assertEqual(
            acceptance["approval_event"]["message_sha256"],
            hashlib.sha256(APPROVAL_MESSAGE.encode()).hexdigest(),
        )
        event = acceptance["approval_event"]
        self.assertIsNone(event["durable_user_message_id"])
        self.assertIsNone(event["durable_user_event_id"])
        self.assertFalse(event["durable_user_message_id_available"])
        self.assertFalse(event["durable_user_event_id_available"])
        self.assertIsNone(event["event_timestamp"])
        self.assertFalse(event["event_timestamp_available"])

        self.assertEqual(acceptance["approved_scope"]["titles"], EXPECTED_TITLES)
        self.assertEqual(acceptance["approved_scope"]["role_count"], 17)
        self.assertTrue(acceptance["approved_scope"]["task5_consumable"])

        for binding_name, binding in acceptance["bound_inputs"].items():
            if binding_name == "selected_union_inputs" or binding_name == "zero_blocker_audits":
                continue
            path = _path(binding["path"])
            self.assertEqual(_sha256(path), binding["sha256"], binding_name)

        selected = acceptance["bound_inputs"]["selected_union_inputs"]
        self.assertEqual(_sha256(_path(selected["source"]["path"])), selected["source"]["sha256"])
        self.assertEqual(_sha256(_path(selected["test"]["path"])), selected["test"]["sha256"])
        self.assertEqual(selected["by_title"], EXPECTED_UNIONS)
        self.assertEqual(selected["unique_key_count"], 7)

        for audit in acceptance["bound_inputs"]["zero_blocker_audits"]:
            self.assertEqual(_sha256(_path(audit["path"])), audit["sha256"])
            self.assertEqual(audit["findings"], {"critical": 0, "high": 0, "medium": 0, "low": 0})

    def test_current_host_reports_are_41_result_zero_blocker_bindings(self) -> None:
        """Requires current Reading and Primary reports to retain 41 clean results."""
        acceptance = _load(ACCEPTANCE_PATH)
        bound = acceptance["bound_inputs"]
        reading = bound["reading_host_proof"]
        reading_report = _load(_path(reading["path"]))
        self.assertEqual(reading_report["test_result_file"]["stats_expected"], 41)
        self.assertEqual(reading_report["test_result_file"]["stats_unexpected"], 0)
        self.assertEqual(reading_report["test_result_file"]["stats_skipped"], 0)
        self.assertEqual(reading_report["test_result_file"]["stats_flaky"], 0)
        self.assertEqual(reading["result_stats"], {"expected": 41, "unexpected": 0, "skipped": 0, "flaky": 0})

        primary = bound["primary_host_proof"]
        primary_report = _load(_path(primary["path"]))
        self.assertEqual(primary_report["tests"]["result_artifact"]["stats_expected"], 41)
        self.assertEqual(primary_report["tests"]["result_artifact"]["stats_unexpected"], 0)
        self.assertEqual(primary_report["tests"]["result_artifact"]["stats_skipped"], 0)
        self.assertEqual(primary["result_stats"], {"expected": 41, "unexpected": 0, "skipped": 0, "browser_cases": 40})

        self.assertEqual(
            _sha256(_path(bound["reading_primary_host_proof_evidence"]["path"])),
            bound["reading_primary_host_proof_evidence"]["sha256"],
        )

    def test_authorization_and_plan_markers_stop_at_task6_begin(self) -> None:
        """Requires Task 5 completion, Task 6 start, and production boundaries."""
        acceptance = _load(ACCEPTANCE_PATH)
        self.assertEqual(acceptance["authorization"], {
            "task5_consumable": True,
            "task5_acceptance_claimed": True,
            "task6_exact_legacy_retirement_begin_authorized": True,
            "title_adoption_authorized": False,
            "production_catalog_exposure_authorized": False,
            "production_loaders_exposure_authorized": False,
            "ingestion_authorized": False,
            "migration_authorized": False,
            "cutover_authorized": False,
            "legacy_retirement_completed": False,
            "deployment_authorized": False,
            "cohort_closeout_authorized": False,
            "broader_apk_claims_authorized": False,
        })

        core_plan = (CORE_TRACK / "plan.md").read_text(encoding="utf-8")
        self.assertTrue(next(line for line in core_plan.splitlines() if "Gate Task 5 acceptance on asset adoption" in line).startswith("- [x]"))
        self.assertTrue(next(line for line in core_plan.splitlines() if "Prove Reading and Primary load" in line).startswith("- [x]"))
        self.assertTrue(next(line for line in core_plan.splitlines() if "Delete only each title's exact replaced legacy paths" in line).startswith("- [~]"))
        self.assertTrue(next(line for line in core_plan.splitlines() if "Obtain independent review and product-owner acceptance" in line).startswith("- [ ]"))

        suitability_plan = (SUITABILITY_TRACK / "plan.md").read_text(encoding="utf-8")
        self.assertTrue(suitability_plan.startswith("# Implementation Plan"))
        self.assertIn("task5-task6-product-owner-acceptance-v1.json", suitability_plan)
        self.assertIn("consumable for", suitability_plan)
        suitability_metadata = _load(SUITABILITY_TRACK / "metadata.json")
        self.assertEqual(
            suitability_metadata["downstream_consumption"]["acceptance_path"],
            str(ACCEPTANCE_PATH.relative_to(REPO_ROOT)),
        )
        self.assertEqual(
            suitability_metadata["downstream_consumption"]["acceptance_sha256"],
            _sha256(ACCEPTANCE_PATH),
        )
        self.assertFalse(suitability_metadata["downstream_consumption"]["real_asset_ingestion_authorized"])
        self.assertFalse(suitability_metadata["downstream_consumption"]["production_exposure_authorized"])

        metadata = _load(CORE_TRACK / "metadata.json")
        task5 = next(item for item in metadata["task_acceptances"] if item["task_number"] == 5)
        self.assertEqual(task5["product_owner_acceptance_path"], str(ACCEPTANCE_PATH.relative_to(REPO_ROOT)))
        self.assertEqual(task5["product_owner_acceptance_sha256"], _sha256(ACCEPTANCE_PATH))
        self.assertTrue(task5["task5_consumable"])
        self.assertTrue(task5["task6_begin_authorized"])
        self.assertFalse(task5["retirement_completed"])

    def test_prior_owner_record_remains_immutable_non_authorizing_history(self) -> None:
        """Requires the additive acceptance not to rewrite the prior owner record."""
        historical = _load(HISTORICAL_OWNER_PATH)
        self.assertEqual(historical["status"], "accepted-exact-canonical-reuse-dossiers-non-authorizing")
        self.assertFalse(historical["authorization"]["task5_acceptance_claimed"])
        self.assertFalse(historical["authorization"]["retirement_authorized"])


if __name__ == "__main__":
    unittest.main()
