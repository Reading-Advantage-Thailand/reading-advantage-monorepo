"""Structural agreement checker for option-1 terminal Measure graph.

Loads the single fact table and fails if authority, formals, dispositions,
or metadata disagree with it (stale disclosures, retained∩deleted, bad SHAs).
"""

from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
FACT_PATH = REPO_ROOT / "measure/tracks/apk_option1_terminal_truth_20260803.json"
AUTHORITY_PATH = (
    REPO_ROOT / "measure/product-owner-apk-live-path-deletion-authority-20260803.json"
)
DEFERRED_PATH = (
    REPO_ROOT / "measure/product-owner-apk-deferred-retirement-authority-20260803.json"
)
REJECTED_SELF_SIGN = (
    REPO_ROOT
    / "measure/product-owner-apk-production-deferred-retirement-track-complete-20260803.json"
)


def _load(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must be a JSON object")
    return value


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _formal_path(track_id: str) -> Path:
    return (
        REPO_ROOT
        / "measure/archive"
        / track_id
        / "product-owner-formal-acceptance-2026-08-02.json"
    )


def _retirement_path(track_id: str) -> Path:
    return (
        REPO_ROOT
        / "measure/archive"
        / track_id
        / "retirement-disposition-package-2026-08-02.json"
    )


def _metadata_path(track_id: str) -> Path:
    return REPO_ROOT / "measure/archive" / track_id / "metadata.json"


class ApkOption1TerminalAgreementTests(unittest.TestCase):
    """Single structural checker for option-1 terminal consistency."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.fact = _load(FACT_PATH)
        cls.authority = _load(AUTHORITY_PATH)
        cls.tracks = list(cls.fact["tracks"].keys())

    def test_deleted_paths_from_fact_table_are_absent(self) -> None:
        for path in self.fact["all_deleted_paths_must_be_absent"]:
            self.assertFalse((REPO_ROOT / path).exists(), path)

    def test_authority_criterion_3_matches_fact_table(self) -> None:
        self.assertTrue(self.authority.get("operative", False))
        self.assertEqual(
            self.authority["decision"],
            "AUTHORIZE_LIVE_PATH_DELETION_AFTER_PRODUCTION_CUTOVER",
        )
        auth = self.authority["authorization"]
        self.assertTrue(auth["criterion_3_retirement_complete"])
        self.assertTrue(auth["production_catalog_exposure_authorized"])
        self.assertTrue(auth["live_legacy_path_deletion_authorized"])
        self.assertTrue(auth["production_cutover_authorized"])
        self.assertTrue(auth["track_formal_close_authorized"])
        self.assertEqual(
            auth["criterion_3_retirement_complete"],
            self.fact["criterion_3_retirement_complete"],
        )

    def test_formals_match_authority_and_fact_table(self) -> None:
        auth_sha = _sha256(AUTHORITY_PATH)
        deferred_sha = _sha256(DEFERRED_PATH)
        forbidden = self.fact["forbidden_when_c3_complete"]
        for track_id in self.tracks:
            formal = _load(_formal_path(track_id))
            with self.subTest(track_id=track_id):
                self.assertEqual(formal["status"], "accepted-production-cutover-and-live-deletion-option-1")
                self.assertEqual(formal["decided_by"], "product-owner")
                a = formal["authorization"]
                self.assertTrue(a["criterion_3_retirement_complete"], track_id)
                self.assertTrue(a["production_catalog_exposure_authorized"], track_id)
                self.assertTrue(a["legacy_path_deletion_authorized"], track_id)
                self.assertTrue(a["production_cutover_authorized"], track_id)
                self.assertTrue(a["track_formal_close_authorized"], track_id)
                # No incomplete/zero-deletion language while c3 true
                blob = json.dumps(formal)
                for phrase in forbidden:
                    self.assertNotIn(phrase, blob, f"{track_id}: forbidden {phrase!r}")
                # approved_scope must not claim zero-deletion retain
                scope = formal.get("approved_scope") or {}
                if "retirement" in scope:
                    self.assertNotIn("zero-deletion", str(scope["retirement"]).lower(), track_id)
                note = str(scope.get("host_proof_note") or "")
                self.assertNotIn("not production catalog exposure", note.lower(), track_id)
                self.assertNotIn("not ... criterion-3", note.lower().replace("—", "-"), track_id)
                # Bound SHAs match current bytes
                bound = formal["bound_inputs"]
                live = bound["live_path_deletion_authority_20260803"]
                self.assertEqual(live["sha256"], auth_sha, track_id)
                self.assertEqual(
                    live["path"],
                    "measure/product-owner-apk-live-path-deletion-authority-20260803.json",
                )
                if "deferred_retirement_authority_20260803" in bound:
                    self.assertEqual(
                        bound["deferred_retirement_authority_20260803"]["sha256"],
                        deferred_sha,
                        track_id,
                    )
                ret_bind = bound.get("retirement_disposition_package_2026_08_02")
                if ret_bind:
                    ret_path = REPO_ROOT / ret_bind["path"]
                    self.assertTrue(ret_path.is_file(), ret_path)
                    self.assertEqual(ret_bind["sha256"], _sha256(ret_path), track_id)

    def test_retirement_packages_match_fact_table_no_retained_intersection(self) -> None:
        auth_sha = _sha256(AUTHORITY_PATH)
        for track_id, conf in self.fact["tracks"].items():
            package = _load(_retirement_path(track_id))
            with self.subTest(track_id=track_id):
                self.assertEqual(package["status"], conf["package_status"], track_id)
                decision = package["decision"]
                self.assertEqual(sorted(decision["deleted_paths"]), conf["deleted_paths"], track_id)
                self.assertEqual(decision["deleted_path_count"], conf["deleted_path_count"], track_id)
                for deleted in decision["deleted_paths"]:
                    self.assertFalse((REPO_ROOT / deleted).exists(), deleted)
                auth = package["authorization"]
                self.assertTrue(auth["retirement_completion_claimed"], track_id)
                self.assertTrue(auth["legacy_deletion_authorized"], track_id)
                self.assertTrue(auth["production_cutover_authorized"], track_id)
                self.assertTrue(auth["owner_formal_close_authorized"], track_id)
                # titles
                titles = package.get("titles") or {}
                self.assertEqual(set(titles.keys()), set(conf["titles"].keys()), track_id)
                for title_id, expected in conf["titles"].items():
                    title = titles[title_id]
                    self.assertEqual(title["disposition"], expected["disposition"], f"{track_id}:{title_id}")
                    self.assertEqual(
                        sorted(title.get("deleted_paths") or []),
                        sorted(expected["deleted_paths"]),
                        f"{track_id}:{title_id}",
                    )
                    retained = set(title.get("retained_paths") or [])
                    deleted = set(title.get("deleted_paths") or [])
                    self.assertEqual(retained & deleted, set(), f"{track_id}:{title_id} retained∩deleted")
                    self.assertNotEqual(
                        title["disposition"],
                        "retain-live-callers-zero-deletion",
                        f"{track_id}:{title_id}",
                    )
                # bound authority sha
                bound = (package.get("bound_inputs") or {}).get("live_path_deletion_authority_20260803")
                self.assertIsNotNone(bound, track_id)
                assert bound is not None
                self.assertEqual(bound["sha256"], auth_sha, track_id)

    def test_metadata_complete_for_all_cutovers(self) -> None:
        for track_id, conf in self.fact["tracks"].items():
            metadata = _load(_metadata_path(track_id))
            with self.subTest(track_id=track_id):
                self.assertEqual(metadata["status"], conf["metadata_status"], track_id)
                self.assertIsNone(metadata.get("completion_blocker"))
                # Must not be complete while authority c3 false (checked in authority test)
                self.assertTrue(self.fact["criterion_3_retirement_complete"])

    def test_deferred_and_self_sign_are_non_operative(self) -> None:
        deferred = _load(DEFERRED_PATH)
        self.assertFalse(deferred.get("operative", True))
        self.assertIn("superseded", deferred.get("status", ""))
        rejected = _load(REJECTED_SELF_SIGN)
        self.assertFalse(rejected.get("operative", True))
        self.assertTrue(str(rejected.get("status", "")).startswith("rejected"))


if __name__ == "__main__":
    unittest.main()
