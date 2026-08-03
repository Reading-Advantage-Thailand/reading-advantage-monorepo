"""Guards APK product-owner formal close after option-1 production cutover + live deletion."""

from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
PROVENANCE = REPO_ROOT / "measure/product-owner-apk-provenance-direction-20260721.json"
DEFERRED_AUTHORITY = (
    REPO_ROOT / "measure/product-owner-apk-deferred-retirement-authority-20260803.json"
)
LIVE_PATH_DELETION_AUTHORITY = (
    REPO_ROOT / "measure/product-owner-apk-live-path-deletion-authority-20260803.json"
)
USER_INPUT = (
    REPO_ROOT
    / "measure/tracks/apk_cross_host_closeout_20260727"
    / "USER-INPUT-REQUIRED-production-cutover-and-live-retirement-20260803.json"
)

ACCEPTANCES = [
    "apk_existing_core_cutover_20260727",
    "apk_existing_action_cutover_20260727",
    "apk_legacy_defense_cutover_20260727",
    "apk_legacy_puzzle_cutover_20260727",
    "apk_legacy_traversal_cutover_20260727",
    "apk_cross_host_closeout_20260727",
]


def _load(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain an object")
    return value


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class ApkProductOwnerFormalAcceptanceTests(unittest.TestCase):
    def test_live_path_deletion_authority_is_operative_option_1(self) -> None:
        authority = _load(LIVE_PATH_DELETION_AUTHORITY)
        self.assertEqual(authority["decision"], "AUTHORIZE_LIVE_PATH_DELETION_AFTER_PRODUCTION_CUTOVER")
        self.assertIn(authority["status"], {"operative", "operative-executed"})
        self.assertTrue(authority["operative"])
        self.assertTrue(authority["authorization"]["live_legacy_path_deletion_authorized"])
        self.assertTrue(authority["authorization"]["production_cutover_authorized"])
        self.assertTrue(authority["authorization"]["production_catalog_exposure_authorized"])
        event = authority["approval_event"]
        self.assertIsNone(event["durable_user_message_id"])
        self.assertIsNone(event["durable_user_event_id"])
        self.assertEqual(
            event["message_sha256"],
            hashlib.sha256(event["message_exact"].encode("utf-8")).hexdigest(),
        )

    def test_user_input_resolved_to_live_path_deletion(self) -> None:
        user_input = _load(USER_INPUT)
        self.assertEqual(user_input["resolved_option_id"], "authorize-live-path-deletion")
        self.assertTrue(user_input["status"].startswith("resolved-authorize-live-path-deletion"))

    def test_deferred_authority_superseded_not_track_complete_blocker(self) -> None:
        deferred = _load(DEFERRED_AUTHORITY)
        self.assertEqual(deferred["status"], "superseded-by-live-path-deletion-authority")
        self.assertFalse(deferred.get("operative", True))

    def test_acceptances_authorize_production_cutover_and_live_deletion(self) -> None:
        provenance = _load(PROVENANCE)
        self.assertEqual(provenance["decision"], "LOCAL_VERIFIABLE_RECEIPTS_ACCEPTED_WITH_DISCLOSURE")
        for track_id in ACCEPTANCES:
            path = REPO_ROOT / "measure/tracks" / track_id / "product-owner-formal-acceptance-2026-08-02.json"
            acceptance = _load(path)
            self.assertEqual(
                acceptance["status"],
                "accepted-production-cutover-and-live-deletion-option-1",
                track_id,
            )
            self.assertEqual(acceptance.get("decided_by"), "product-owner", track_id)
            auth = acceptance["authorization"]
            self.assertTrue(auth["track_formal_close_authorized"], track_id)
            self.assertTrue(auth["production_catalog_exposure_authorized"], track_id)
            self.assertTrue(auth["legacy_path_deletion_authorized"], track_id)
            self.assertTrue(auth["production_cutover_authorized"], track_id)
            self.assertTrue(auth["criterion_3_retirement_complete"], track_id)
            event = acceptance["approval_event"]
            self.assertIsNone(event["durable_user_message_id"])
            self.assertIsNone(event["durable_user_event_id"])
            bound = acceptance["bound_inputs"]["live_path_deletion_authority_20260803"]
            self.assertEqual(bound["sha256"], _sha256(LIVE_PATH_DELETION_AUTHORITY))

    def test_metadata_complete_after_option_1(self) -> None:
        for track_id in ACCEPTANCES:
            metadata = _load(REPO_ROOT / "measure/tracks" / track_id / "metadata.json")
            self.assertEqual(metadata["status"], "complete", track_id)
            self.assertIsNone(metadata.get("completion_blocker"))

    def test_rejected_self_sign_file_is_non_operative(self) -> None:
        rejected = _load(
            REPO_ROOT / "measure/product-owner-apk-production-deferred-retirement-track-complete-20260803.json"
        )
        self.assertTrue(rejected["status"].startswith("rejected"))
        self.assertFalse(rejected.get("operative", True))

    def test_suitability_closed_on_licensed_elv_games_pack(self) -> None:
        metadata = _load(
            REPO_ROOT / "measure/tracks/apk_standard_pack_suitability_ingestion_20260728/metadata.json"
        )
        self.assertEqual(metadata["status"], "complete")
        self.assertIsNone(metadata.get("completion_blocker"))


if __name__ == "__main__":
    unittest.main()
