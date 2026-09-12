"""Keeps suitability track closed on the licensed ElvGames pack, not legacy Phase 7 inventing."""

from __future__ import annotations

import json
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ID = "apk_standard_pack_suitability_ingestion_20260728"
TRACK_ROOT = REPO_ROOT / "measure/archive" / TRACK_ID
PLAN_PATH = TRACK_ROOT / "plan.md"
METADATA_PATH = TRACK_ROOT / "metadata.json"
REGISTRY_PATH = REPO_ROOT / "measure/tracks.md"
CURRENT_ACCEPTANCE_PATH = TRACK_ROOT / "product-owner-acceptance-v2.json"
FORMAL_ACCEPTANCE_PATH = TRACK_ROOT / "product-owner-formal-acceptance-2026-08-03.json"
LICENSE_PATH = REPO_ROOT / "packages/advantage-play-kit/assets/standard/LICENSE-ELVGAMES.txt"
ACCEPTED_RELEASE_PATH = (
    REPO_ROOT / "packages/advantage-play-kit/assets/standard/accepted-standard-pack-release.json"
)


def _load_object(path: Path) -> dict[str, Any]:
    """Loads one repository-local JSON object."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain a JSON object")
    return value


class StandardPackSuitabilityTrackTruthTests(unittest.TestCase):
    """Closes the track on licensed pack + reuse-canonical; defers optional legacy ingest."""

    def test_licensed_elv_games_pack_is_the_production_art_source(self) -> None:
        """Requires the purchased pack release and ElvGames license on disk."""
        release = _load_object(ACCEPTED_RELEASE_PATH)
        self.assertEqual(release["version"], "2026.07.23")
        self.assertEqual(release["requiredCredit"], "Pixel art assets by ElvGames")
        self.assertEqual(release["status"], "accepted")
        license_text = LICENSE_PATH.read_text(encoding="utf-8")
        self.assertIn("Credits to ElvGames", license_text)
        self.assertIn("commercial projects", license_text.lower())
        self.assertIn("ElvGames", license_text)

    def test_plan_defers_optional_legacy_ingest_without_blocking_closeout(self) -> None:
        """Phase 7 is optional deferred legacy ingest, not a pack-licensing gate."""
        plan = PLAN_PATH.read_text(encoding="utf-8")
        self.assertIn(
            "## Phase 7: Optional legacy-source ingest when pack lacks a suitable asset",
            plan,
        )
        self.assertIn("not track-blocking", plan)
        self.assertIn("Pixel art assets by ElvGames", plan)
        self.assertIn("43,075", plan)
        completion = " ".join(plan.partition("## Completion rule")[2].split()).replace("**", "")
        self.assertIn("Optional Phase 7 legacy-ingest is not required for closeout", completion)
        self.assertIn("accepted ElvGames standard pack remains the sole production-art source", completion)

    def test_plan_registry_and_metadata_agree_on_complete(self) -> None:
        """Track truth surfaces mark complete after licensed-pack closeout."""
        metadata = _load_object(METADATA_PATH)
        registry = REGISTRY_PATH.read_text(encoding="utf-8")
        self.assertEqual(metadata["status"], "complete")
        self.assertIsNone(metadata.get("completion_blocker"))
        self.assertIn(
            "- [x] **Track: APK Standard-Pack Suitability and Canonical Ingestion**",
            registry,
        )
        self.assertNotIn(
            "- [b] **Track: APK Standard-Pack Suitability and Canonical Ingestion**",
            registry,
        )
        formal = metadata["owner_formal_close"]
        self.assertTrue(formal["authorized"])
        self.assertEqual(formal["mode"], "LOCAL_VERIFIABLE_RECEIPTS_ACCEPTED_WITH_DISCLOSURE")
        self.assertTrue(FORMAL_ACCEPTANCE_PATH.is_file())

    def test_real_legacy_ingestion_and_production_authority_remain_false(self) -> None:
        """Closing on reuse-canonical does not authorize legacy ingest or production flip."""
        metadata = _load_object(METADATA_PATH)
        acceptance = _load_object(CURRENT_ACCEPTANCE_PATH)
        formal = _load_object(FORMAL_ACCEPTANCE_PATH)
        self.assertFalse(metadata["downstream_consumption"]["real_asset_ingestion_authorized"])
        self.assertFalse(metadata["downstream_consumption"]["production_exposure_authorized"])
        self.assertFalse(metadata["downstream_consumption"]["deployment_authorized"])
        self.assertTrue(
            metadata["downstream_consumption"].get("reuse_canonical_from_licensed_pack_authorized")
        )
        self.assertFalse(acceptance["authorization"]["ingestionAuthorized"])
        self.assertFalse(acceptance["authorization"]["titleAdoptionAuthorized"])
        self.assertFalse(formal["authorization"]["phase7_real_asset_ingestion_authorized"])
        self.assertTrue(formal["authorization"]["reuse_canonical_authorized"])
        self.assertTrue(formal["authorization"]["licensed_elv_games_pack_consumable_as_production_art_source"])
        self.assertFalse(formal["authorization"]["legacy_ingest_phase7_required_for_closeout"])


if __name__ == "__main__":
    unittest.main()
