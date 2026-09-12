"""Guards Tasks 2-5 evidence and strict ownership for Legacy Defense."""

from __future__ import annotations

import json
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ROOT = REPO_ROOT / "measure/archive/apk_legacy_defense_cutover_20260727"
SUITABILITY_PATH = TRACK_ROOT / "task2-standard-pack-suitability-dossiers-v2.json"
OWNER_ACCEPTANCE_PATH = TRACK_ROOT / "task2-owner-acceptance-v2.json"
TASK5_EVIDENCE_PATH = TRACK_ROOT / "task5-advantage-games-qc-native-input-evidence-v2.json"
EXPECTED_TITLES = [
    "castle-defense",
    "wizard-vs-zombie",
    "village-guardian",
    "storm-castle-tower",
]
EXPECTED_SELECTED_KEYS = {
    "castle-defense": [
        "effects/32x32/combat/hit-01",
        "side-view/32x32/characters/enemy-001-idle",
        "top-down/32x32/characters/hero-01",
        "ui/16x16/controls/gamepad-buttons",
    ],
    "wizard-vs-zombie": [
        "audio/native/combat/hit-01",
        "effects/32x32/combat/hit-01",
        "side-view/32x32/characters/enemy-001-idle",
        "top-down/32x32/characters/hero-01",
        "ui/16x16/controls/gamepad-buttons",
    ],
    "village-guardian": [
        "effects/32x32/combat/hit-01",
        "side-view/32x32/characters/enemy-001-idle",
        "top-down/32x32/characters/hero-01",
        "ui/16x16/controls/gamepad-buttons",
    ],
    "storm-castle-tower": [
        "effects/32x32/combat/hit-01",
        "top-down/32x32/characters/hero-01",
        "ui/16x16/controls/gamepad-buttons",
    ],
}
OWNED_CARTRIDGE_PATHS = [
    REPO_ROOT / "packages/game-cartridges/src/castle-defense-cartridge.ts",
    REPO_ROOT / "packages/game-cartridges/src/wizard-vs-zombie-cartridge.ts",
    REPO_ROOT / "packages/game-cartridges/src/village-guardian-cartridge.ts",
    REPO_ROOT / "packages/game-cartridges/src/storm-castle-tower-cartridge.ts",
]


def _load_object(path: Path) -> dict[str, Any]:
    """Loads one required repository-local JSON object.

    Args:
        path: JSON evidence file to parse.

    Returns:
        The parsed JSON object.

    Raises:
        AssertionError: If the file is missing or not a JSON object.
    """
    if not path.is_file():
        raise AssertionError(f"MISSING_ARTIFACT: {path}")
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"INVALID_ARTIFACT: {path}")
    return value


class LegacyDefenseCutoverTasksTwoToFiveTests(unittest.TestCase):
    """Requires real canonical selections and isolated title-specific cartridges."""

    def test_task2_pins_owner_accepted_v2_dossiers_without_cutover_authority(self) -> None:
        """Rejects a stale canonical release or elevated host, catalog, and ingestion authority."""
        suitability = _load_object(SUITABILITY_PATH)
        owner_acceptance = _load_object(OWNER_ACCEPTANCE_PATH)

        self.assertEqual(suitability["schema_version"], "apk-legacy-defense-task2-standard-pack-suitability-dossiers.v2")
        self.assertEqual(suitability["status"], "reviewed-canonical-reuse-dossiers-awaiting-owner-record")
        self.assertEqual(owner_acceptance["status"], "accepted-for-advantage-games-qc-only")
        self.assertEqual(owner_acceptance["dossier_artifact"]["path"], str(SUITABILITY_PATH.relative_to(REPO_ROOT)))
        self.assertEqual(owner_acceptance["dossier_artifact"]["descriptor_count"], 5)
        self.assertEqual(owner_acceptance["dossier_artifact"]["role_count"], 16)
        self.assertEqual(len(owner_acceptance["accepted_title_roles"]), 16)
        self.assertEqual(
            suitability["accepted_standard_pack"]["version"], "2026.07.23",
        )
        for field in (
            "production_use_authorized", "catalog_exposure_authorized", "reading_host_authorized",
            "primary_host_authorized", "legacy_asset_reuse_authorized", "legacy_asset_ingestion_authorized",
        ):
            self.assertIs(suitability["authority_boundary"][field], False)
        for field in ("production_catalog", "reading_host", "primary_host", "completion_delivery", "progress_persistence", "legacy_asset_reuse", "legacy_asset_ingestion"):
            self.assertIs(owner_acceptance["authorization"][field], False)

    def test_task2_selected_unions_are_title_specific_canonical_keys_and_legacy_art_stays_blocked(self) -> None:
        """Requires exact semantic outputs for every title without physical or legacy substitution."""
        suitability = _load_object(SUITABILITY_PATH)
        titles = suitability["titles"]

        self.assertEqual([title["title_id"] for title in titles], EXPECTED_TITLES)
        self.assertEqual(suitability["descriptor_count"], 5)
        self.assertEqual(len(suitability["descriptors"]), 5)
        self.assertEqual(suitability["role_count"], 16)
        self.assertEqual(sum(len(title["roles"]) for title in titles), 16)
        for title in titles:
            selected = title["selected_semantic_keys"]
            self.assertEqual(selected, EXPECTED_SELECTED_KEYS[title["title_id"]])
            self.assertEqual(selected, sorted(set(selected)))
            self.assertTrue(all("." not in key and not key.startswith("/") for key in selected))
            self.assertGreater(len(title["roles"]), 0)
            self.assertTrue(all(role["descriptor_id"].endswith("-v2") for role in title["roles"]))

    def test_tasks_three_to_five_use_four_title_specific_cartridges_and_reject_the_generic_qc_substitute(self) -> None:
        """Requires one cartridge per title and prevents the removed generic evidence adapter from returning."""
        for path in OWNED_CARTRIDGE_PATHS:
            self.assertTrue(path.is_file(), path)
            source = path.read_text(encoding="utf-8")
            self.assertIn("validateCartridgeManifest", source)
            self.assertIn("getLegacyDefenseSelectedSemanticKeys", source)
            self.assertIn("completionSupported: false", source)
            self.assertNotIn("/public/", source)
            self.assertNotIn("legacy/", source)
            self.assertNotIn("GameResults", source)
            self.assertNotIn("onComplete", source)

        self.assertTrue((REPO_ROOT / "packages/game-cartridges/src/legacy-defense-cutover-qc.ts").is_file())
        self.assertFalse((REPO_ROOT / "packages/game-cartridges/src/legacy-defense-qc.ts").exists())
        self.assertFalse((REPO_ROOT / "packages/game-cartridges/src/legacy-defense-cutover.red.test.ts").exists())

        task5_evidence = _load_object(TASK5_EVIDENCE_PATH)
        self.assertEqual(task5_evidence["scope"], "advantage-games-qc-only")
        self.assertEqual(task5_evidence["test"]["result"], "2 passed")
        self.assertEqual([title["id"] for title in task5_evidence["titles"]], EXPECTED_TITLES)
        self.assertTrue(all(title["keyboard"] and title["pointer"] and title["touch"] and title["compact"] and title["wide"] for title in task5_evidence["titles"]))
        self.assertTrue(all(title["completion_emissions"] == 0 for title in task5_evidence["titles"]))
        self.assertEqual(task5_evidence["titles"][-1]["mechanic_status"], "blocked")


if __name__ == "__main__":
    unittest.main()
