"""Fail-closed guards for APK title retirement disposition packages (2026-08-02)."""

from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFERRED_AUTHORITY = (
    REPO_ROOT / "measure/product-owner-apk-deferred-retirement-authority-20260803.json"
)

PACKAGES = [
    REPO_ROOT / "measure/tracks/apk_existing_core_cutover_20260727/retirement-disposition-package-2026-08-02.json",
    REPO_ROOT / "measure/tracks/apk_existing_action_cutover_20260727/retirement-disposition-package-2026-08-02.json",
    REPO_ROOT / "measure/tracks/apk_legacy_defense_cutover_20260727/retirement-disposition-package-2026-08-02.json",
    REPO_ROOT / "measure/tracks/apk_legacy_traversal_cutover_20260727/retirement-disposition-package-2026-08-02.json",
    REPO_ROOT / "measure/tracks/apk_legacy_puzzle_cutover_20260727/retirement-disposition-package-2026-08-02.json",
    REPO_ROOT / "measure/tracks/apk_cross_host_closeout_20260727/retirement-disposition-package-2026-08-02.json",
]


def _load(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must be a JSON object")
    return value


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class ApkRetirementDispositionPackageTests(unittest.TestCase):
    def test_live_path_deletion_authority_supersedes_deferred_blocker(self) -> None:
        live = REPO_ROOT / "measure/product-owner-apk-live-path-deletion-authority-20260803.json"
        self.assertTrue(live.is_file(), live)
        authority = _load(live)
        self.assertEqual(authority["decision"], "AUTHORIZE_LIVE_PATH_DELETION_AFTER_PRODUCTION_CUTOVER")
        self.assertTrue(authority["operative"])
        deferred = _load(DEFERRED_AUTHORITY)
        self.assertEqual(deferred["status"], "superseded-by-live-path-deletion-authority")
        self.assertFalse(deferred.get("operative", True))

    def test_all_packages_exist_and_share_schema(self) -> None:
        authority = _load(DEFERRED_AUTHORITY)
        for path in PACKAGES:
            self.assertTrue(path.is_file(), path)
            package = _load(path)
            self.assertEqual(package["schema_version"], "apk-title-retirement-disposition-package.v1")
            self.assertIn(
                package["status"],
                {
                    "live-deletion-after-production-cutover-complete",
                    "source-blocked-cohort-no-playable-routes-option-1-terminal",
                    "residual-closeout-after-cohort-option-1-terminals",
                },
                path,
            )
            auth = package["authorization"]
            self.assertTrue(auth.get("retirement_completion_claimed"), path)
            self.assertTrue(auth.get("legacy_deletion_authorized"), path)
            self.assertTrue(auth.get("owner_formal_close_authorized"), path)
            self.assertTrue(auth.get("production_cutover_authorized"), path)
            for title_id, title in package.get("titles", {}).items():
                self.assertNotEqual(
                    title.get("disposition"),
                    "retain-live-callers-zero-deletion",
                    f"{path}:{title_id} zero-deletion retain is not criterion-3 completion",
                )
            self.assertFalse(auth.get("production_deferred_retirement_authorized", True), path)
            self.assertEqual(
                auth.get("formal_close_mode"),
                "LOCAL_VERIFIABLE_RECEIPTS_ACCEPTED_WITH_DISCLOSURE",
                path,
            )
            self.assertIsNone(auth.get("durable_owner_message_id"))
            self.assertIsNone(auth.get("durable_owner_event_id"))
            self.assertIsNone(auth.get("durable_user_message_id"))
            self.assertIsNone(auth.get("durable_user_event_id"))
            bound = package["bound_inputs"]["live_path_deletion_authority_20260803"]
            live = REPO_ROOT / "measure/product-owner-apk-live-path-deletion-authority-20260803.json"
            self.assertEqual(bound["path"], str(live.relative_to(REPO_ROOT)))
            self.assertEqual(bound["sha256"], _sha256(live))

    def test_deleted_paths_are_absent_from_repository(self) -> None:
        for path in PACKAGES:
            package = _load(path)
            decision = package["decision"]
            self.assertEqual(decision["deleted_path_count"], len(decision["deleted_paths"]))
            for deleted in decision["deleted_paths"]:
                self.assertFalse((REPO_ROOT / deleted).exists(), deleted)
            for title_id, title in package.get("titles", {}).items():
                for deleted in title.get("manifest_deleted_paths", []):
                    self.assertFalse((REPO_ROOT / deleted).exists(), deleted)

    def test_core_package_records_option1_deletions_and_catalog_stays_quarantined(self) -> None:
        package = _load(PACKAGES[0])
        self.assertGreaterEqual(package["decision"]["deleted_path_count"], 1)
        for deleted in package["decision"]["deleted_paths"]:
            self.assertFalse((REPO_ROOT / deleted).exists(), deleted)
        catalog = (REPO_ROOT / "packages/game-cartridges/src/catalog.ts").read_text(encoding="utf-8")
        self.assertNotIn("APK_HOST_PROOF_BINDINGS", catalog)
        self.assertNotIn("loadCartridge", catalog)

    def test_dual_host_proven_titles_may_record_production_cutover_deletions(self) -> None:
        package = _load(PACKAGES[0])
        for title_id in ("dragon-flight", "magic-defense"):
            title = package["titles"][title_id]
            self.assertTrue(title["dual_host_proven"], title_id)
            self.assertIn(title["disposition"], {
                "deleted-after-production-cutover",
                "production-cutover-host-proof-no-reading-student-route-to-delete",
                "source-blocked-no-retirement",
                "blocked-source-or-incomplete-host-proof-no-retirement",
            })


if __name__ == "__main__":
    unittest.main()
