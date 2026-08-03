"""Phase 7 is optional legacy-ingest deferred work; the ElvGames pack is already licensed."""

from __future__ import annotations

import json
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
TRACK = REPO / "measure/tracks/apk_standard_pack_suitability_ingestion_20260728"
CLARIFICATION = TRACK / "phase7-scope-clarification-2026-08-03.json"
META = TRACK / "metadata.json"
LICENSE = REPO / "packages/advantage-play-kit/assets/standard/LICENSE-ELVGAMES.txt"
ACCEPTED = REPO / "packages/advantage-play-kit/assets/standard/accepted-standard-pack-release.json"
PACK = REPO / "packages/advantage-play-kit/assets/standard/standard-pack-release.json"


class Phase7ScopeClarificationTests(unittest.TestCase):
    """Prevents re-blocking the track on already-licensed ElvGames pack usage."""

    def test_phase7_is_optional_deferred_not_track_blocking(self) -> None:
        """Requires the 2026-08-03 clarification superseding the false packet blocker."""
        clarification = json.loads(CLARIFICATION.read_text(encoding="utf-8"))
        self.assertEqual(clarification["status"], "phase7-optional-deferred-not-track-blocking")
        self.assertIn("ElvGames", clarification["clarification"])
        self.assertEqual(clarification["licensed_pack"]["asset_count"], 43075)
        self.assertEqual(
            clarification["licensed_pack"]["required_credit"],
            "Pixel art assets by ElvGames",
        )
        meta = json.loads(META.read_text(encoding="utf-8"))
        self.assertEqual(meta["status"], "complete")
        self.assertIsNone(meta.get("completion_blocker"))

    def test_licensed_pack_files_exist_and_match_clarification(self) -> None:
        """Drives real pack artifacts, not a reimplemented count."""
        clarification = json.loads(CLARIFICATION.read_text(encoding="utf-8"))
        release = json.loads(ACCEPTED.read_text(encoding="utf-8"))
        pack = json.loads(PACK.read_text(encoding="utf-8"))
        self.assertEqual(release["requiredCredit"], clarification["licensed_pack"]["required_credit"])
        self.assertEqual(release["version"], clarification["licensed_pack"]["release"])
        self.assertEqual(len(pack["assets"]), clarification["licensed_pack"]["asset_count"])
        license_text = LICENSE.read_text(encoding="utf-8")
        self.assertIn("Credits to ElvGames", license_text)
        self.assertTrue(CLARIFICATION.is_file())


if __name__ == "__main__":
    unittest.main()
