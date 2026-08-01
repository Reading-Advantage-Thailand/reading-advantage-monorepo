"""Guards the accepted Legacy Puzzle Task 2–5 successor without opening hosts or production."""

from __future__ import annotations

import json
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ROOT = REPO_ROOT / "measure/tracks/apk_legacy_puzzle_cutover_20260727"
DOSSIERS = TRACK_ROOT / "task2-standard-pack-suitability-dossiers-v2.json"
DECISIONS = TRACK_ROOT / "task2-accepted-decisions-v2.json"
UNIONS = TRACK_ROOT / "task2-selected-unions-v2.json"
ACCEPTANCE = TRACK_ROOT / "task2-owner-acceptance-v2.json"
EXPECTED_TITLES = [
    "enchanted-library",
    "rune-match",
    "alchemists-synthesis",
    "potion-rush",
    "rune-forge-chamber",
]
EXPECTED_UNIONS = {
    "enchanted-library": ["side-view/native/platformer-world/heroes/hero-001/hero-001-walk-source-0c1cbfb7e747"],
    "rune-match": ["ui/20x20/inventory/slot"],
    "alchemists-synthesis": ["effects/32x32/combat/hit-01"],
    "potion-rush": ["ui/16x16/controls/gamepad-buttons"],
    "rune-forge-chamber": ["top-down/32x32/characters/hero-01"],
}


def _load(path: Path) -> dict[str, Any]:
    """Loads one required JSON object from the successor evidence package.

    Args:
        path: Artifact path to parse.

    Returns:
        Parsed JSON object.

    Raises:
        AssertionError: If an artifact is missing or has the wrong root shape.
    """
    if not path.is_file():
        raise AssertionError(f"MISSING_ARTIFACT: {path}")
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"INVALID_ARTIFACT: {path}")
    return value


class LegacyPuzzleTasksTwoToFiveTests(unittest.TestCase):
    """Requires accepted title-selected output while preserving the complete host quarantine."""

    def test_persists_v2_dossiers_decisions_unions_and_owner_acceptance(self) -> None:
        """Binds every title to an accepted descriptor decision and one minimal semantic union."""
        dossiers = _load(DOSSIERS)
        decisions = _load(DECISIONS)
        unions = _load(UNIONS)
        acceptance = _load(ACCEPTANCE)

        self.assertEqual(dossiers["schema_version"], "apk-legacy-puzzle-task2-suitability-dossiers.v2")
        self.assertEqual(dossiers["status"], "accepted-for-task3-to-task5-advantage-games-qc")
        self.assertEqual([item["title_id"] for item in dossiers["title_dossiers"]], EXPECTED_TITLES)
        self.assertEqual([item["title_id"] for item in decisions["decisions"]], EXPECTED_TITLES)
        self.assertEqual([item["title_id"] for item in unions["unions"]], EXPECTED_TITLES)
        self.assertEqual(acceptance["status"], "accepted")
        self.assertEqual(acceptance["accepted_titles"], EXPECTED_TITLES)

        for dossier in dossiers["title_dossiers"]:
            title_id = dossier["title_id"]
            self.assertEqual(dossier["decision"]["disposition"], "reuse-canonical")
            self.assertEqual(dossier["decision"]["legacy_physical_reuse"], "blocked")
            self.assertEqual(dossier["decision"]["legacy_canonical_ingestion"], "blocked")
            self.assertEqual(dossier["selected_semantic_keys"], EXPECTED_UNIONS[title_id])
            self.assertGreater(len(dossier["source_claim_ids"]), 0)
            self.assertNotIn("/", dossier["descriptor"]["semantic_key"][:1])
            self.assertNotIn(".png", dossier["descriptor"]["semantic_key"])

        self.assertTrue(unions["materialization"] == "accepted-cartridge-selected-union-only")
        self.assertFalse(unions["full_pack_materialized"])
        self.assertFalse(unions["physical_paths_persisted"])
        self.assertFalse(unions["production_loader_registered"])

    def test_preserves_production_and_cross_host_quarantine(self) -> None:
        """Rejects any attempt to reinterpret the owner acceptance as catalog, host, retirement, or cutover authority."""
        dossiers = _load(DOSSIERS)
        decisions = _load(DECISIONS)
        acceptance = _load(ACCEPTANCE)

        for field in (
            "production_catalog_exposure_authorized",
            "reading_host_authorized",
            "primary_host_authorized",
            "legacy_physical_reuse_authorized",
            "legacy_canonical_ingestion_authorized",
            "retirement_authorized",
            "cutover_authorized",
            "deployment_authorized",
        ):
            self.assertIs(dossiers["authority_boundary"][field], False)
        for field in ("production_catalog", "reading_host", "primary_host", "legacy_asset_reuse", "legacy_asset_ingestion", "retirement", "cutover", "deployment"):
            self.assertIs(acceptance["authorization"][field], False)
        self.assertEqual(decisions["prohibited_authority"], {
            "production_catalog": False,
            "reading_host": False,
            "primary_host": False,
            "legacy_reuse": False,
            "legacy_ingestion": False,
            "retirement": False,
            "cutover": False,
        })

    def test_implements_only_title_modules_and_the_advantage_games_qc_adapter(self) -> None:
        """Requires source-bound mechanics and a single explicit QC registration without public catalog exports."""
        suitability = (REPO_ROOT / "packages/game-cartridges/src/puzzle-suitability.ts").read_text(encoding="utf-8")
        enchanted = (REPO_ROOT / "packages/game-cartridges/src/puzzle/enchanted-library-cartridge.ts").read_text(encoding="utf-8")
        rune_match = (REPO_ROOT / "packages/game-cartridges/src/puzzle/rune-match-cartridge.ts").read_text(encoding="utf-8")
        potion = (REPO_ROOT / "packages/game-cartridges/src/puzzle/potion-rush-cartridge.ts").read_text(encoding="utf-8")
        forge = (REPO_ROOT / "packages/game-cartridges/src/puzzle/rune-forge-chamber-cartridge.ts").read_text(encoding="utf-8")
        alchemist = (REPO_ROOT / "packages/game-cartridges/src/puzzle/alchemists-synthesis-cartridge.ts").read_text(encoding="utf-8")
        qc = (REPO_ROOT / "packages/game-cartridges/src/puzzle-cutover-qc.ts").read_text(encoding="utf-8")
        catalog = (REPO_ROOT / "packages/game-cartridges/src/catalog.ts").read_text(encoding="utf-8")

        self.assertIn("frames: [0, 1, 2, 3, 4, 5]", suitability)
        self.assertIn("timing: { fps: 12, loop: true }", suitability)
        self.assertIn("walkPlayback", enchanted)
        self.assertIn("RM-MECH-004", rune_match)
        self.assertIn("RUNE_MATCH_COLUMNS = 6", rune_match)
        self.assertIn("RUNE_MATCH_ROWS = 8", rune_match)
        self.assertIn("BASE_PATIENCE = 60", potion)
        self.assertIn("advancePatience", potion)
        self.assertIn("RUNE_FORGE_INITIAL_HEALTH = 100", forge)
        self.assertIn("RUNE_FORGE_WRONG_WORD_DAMAGE = 15", forge)
        self.assertIn("floor(correctAnswers * accuracy)", alchemist)
        self.assertIn("PUZZLE_QC_REGISTRY", qc)
        self.assertIn("advantage-games-qc-only", qc)
        self.assertNotIn("puzzle", catalog.lower())


if __name__ == "__main__":
    unittest.main()
