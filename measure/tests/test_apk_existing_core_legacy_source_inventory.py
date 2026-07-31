"""Guards the evidence-only legacy source inventory for Existing Core Task 5."""

from __future__ import annotations

import hashlib
import json
import struct
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ROOT = REPO_ROOT / "measure/tracks/apk_existing_core_cutover_20260727"
INVENTORY_PATH = TRACK_ROOT / "task5-legacy-source-inventory-v1.json"
EXPECTED_FILES = {
    "dragon-flight": {
        "boss-3x3-sheet-facing-up.png",
        "dragon-army-3x3-sheet-facing-up.png",
        "gates-3x3-sheet-facing-up.png",
        "loading-screen-background.png",
        "parallax-bottom-tiling.png",
        "parallax-middle-tiling.png",
        "parallax-top-tiling.png",
        "player-3x3-sheet-facing-camera.png",
        "player-3x3-sheet-facing-down.png",
        "projectile-boss.png",
        "projectile-fireball.png",
    },
    "magic-defense": {
        "background.png",
        "castles_3x2_sheet.png",
        "skeletons_3x3_pose_sheet.png",
    },
    "dungeon-liberator": {
        "background.png",
        "player-sheet.png",
        "prisoner-sheet.png",
        "slime-sheet.png",
    },
}
EXPECTED_READING_COPY_FILES = {
    "dragon-flight": EXPECTED_FILES["dragon-flight"],
    "magic-defense": EXPECTED_FILES["magic-defense"],
}


def _load(path: Path) -> dict[str, Any]:
    """Loads one JSON object from the inventory path."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain an object")
    return value


def _repo_path(path: str) -> Path:
    """Resolves a repository-relative evidence path without permitting escapes."""
    candidate = Path(path)
    if candidate.is_absolute():
        raise AssertionError(f"Inventory path must be relative: {path}")
    resolved = (REPO_ROOT / candidate).resolve()
    try:
        resolved.relative_to(REPO_ROOT.resolve())
    except ValueError as error:
        raise AssertionError(f"Inventory path escapes repository: {path}") from error
    return resolved


def _sha256(path: Path) -> str:
    """Returns the SHA-256 digest for one exact legacy file."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _png_dimensions(path: Path) -> tuple[int, int]:
    """Reads PNG dimensions directly from the IHDR header."""
    with path.open("rb") as source:
        header = source.read(24)
    if header[:8] != b"\x89PNG\r\n\x1a\n" or header[12:16] != b"IHDR":
        raise AssertionError(f"Expected PNG IHDR header: {path}")
    return struct.unpack(">II", header[16:24])


class ExistingCoreLegacySourceInventoryTests(unittest.TestCase):
    """Ensures source discovery records exact files without becoming adoption evidence."""

    def test_inventory_binds_all_current_source_backed_title_files(self) -> None:
        """Recomputes every inventory file hash and PNG dimension from its recorded runtime source."""
        inventory = _load(INVENTORY_PATH)
        self.assertEqual(inventory["schema_version"], "apk-existing-core-task5-legacy-source-inventory.v1")
        self.assertEqual(inventory["status"], "source-inventory-only")
        self.assertEqual([title["title_id"] for title in inventory["source_backed_titles"]], [
            "dragon-flight", "magic-defense", "dungeon-liberator",
        ])
        for title in inventory["source_backed_titles"]:
            asset_names = {Path(asset["repository_path"]).name for asset in title["assets"]}
            self.assertEqual(asset_names, EXPECTED_FILES[title["title_id"]])
            for asset in title["assets"]:
                path = _repo_path(asset["repository_path"])
                self.assertTrue(path.is_file())
                self.assertEqual(_sha256(path), asset["sha256"])
                self.assertEqual(_png_dimensions(path), (asset["width"], asset["height"]))
                self.assertEqual(asset["runtime_url"], "/" + str(path.relative_to(REPO_ROOT / "apps/advantage-games/public")))
                self.assertEqual(asset["provenance_status"], "unverified")
                self.assertEqual(asset["license_status"], "unverified")
                self.assertEqual(asset["credit_status"], "unverified")
                self.assertEqual(asset["suitability_status"], "unreviewed")
                self.assertEqual(asset["retirement_disposition"], "unreviewed")

    def test_inventory_preserves_missing_source_and_authority_boundaries(self) -> None:
        """Rejects any claim that source identity alone authorizes asset adoption or cutover."""
        inventory = _load(INVENTORY_PATH)
        self.assertEqual(inventory["source_blocked_titles"], [
            {
                "title_id": "sorcerer-ziggurat",
                "reason": "No accepted current gameplay implementation or legacy asset source exists; historical cover evidence is not a migration source.",
            },
            {
                "title_id": "astral-mage",
                "reason": "No accepted current gameplay implementation or legacy asset source exists; historical cover evidence is not a migration source.",
            },
        ])
        self.assertEqual(inventory["claims"], {
            "physical_asset_adoption_claimed": False,
            "suitability_dossier_claimed": False,
            "reuse_or_ingestion_decision_claimed": False,
            "additive_release_claimed": False,
            "task5_acceptance_claimed": False,
            "migration_claimed": False,
            "cutover_claimed": False,
            "retirement_claimed": False,
            "deployment_claimed": False,
        })
        self.assertEqual(inventory["required_before_adoption"], [
            "dossier-bound provenance, license review, and required credit for every source row",
            "per-title/per-role physical behavior and suitability review with reuse, ingest, or blocked decision",
            "accepted additive release or accepted canonical-reuse binding plus independent review and product-owner acceptance",
        ])

    def test_inventory_records_reading_host_copies_and_byte_drift(self) -> None:
        """Requires host-copy hashes instead of assuming same-named files are interchangeable."""
        inventory = _load(INVENTORY_PATH)
        primary_assets = {
            (title["title_id"], Path(asset["repository_path"]).name): asset
            for title in inventory["source_backed_titles"]
            for asset in title["assets"]
        }
        copies_by_title: dict[str, set[str]] = {}
        for copy in inventory["reading_host_public_copies"]:
            title_id = copy["title_id"]
            path = _repo_path(copy["repository_path"])
            filename = path.name
            copies_by_title.setdefault(title_id, set()).add(filename)
            self.assertTrue(path.is_file())
            self.assertEqual(_sha256(path), copy["sha256"])
            self.assertEqual(_png_dimensions(path), (copy["width"], copy["height"]))
            self.assertEqual(copy["runtime_url"], "/" + str(path.relative_to(REPO_ROOT / "apps/reading-advantage/public")))
            self.assertEqual(copy["reconciliation_status"], "unreviewed")
            primary = primary_assets[(title_id, filename)]
            self.assertEqual(copy["matches_advantage_games_sha256"], copy["sha256"] == primary["sha256"])
        self.assertEqual(copies_by_title, EXPECTED_READING_COPY_FILES)
        drift = {
            Path(copy["repository_path"]).name
            for copy in inventory["reading_host_public_copies"]
            if not copy["matches_advantage_games_sha256"]
        }
        self.assertEqual(drift, {"projectile-boss.png", "projectile-fireball.png"})


if __name__ == "__main__":
    unittest.main()
