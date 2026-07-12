"""Archive-portability checks for immutable gate acceptance artifacts."""

from __future__ import annotations

import gzip
import hashlib
import json
import shutil
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
ACCEPTED_MANIFEST = REPO_ROOT / "measure/evidence-integrity-accepted-gate.json"
HISTORICAL_V6_ACCEPTED_MANIFEST = (
    REPO_ROOT
    / "measure/acceptance/measure_apk_evidence_integrity_gates_20260712"
    / "phase4-v6-accepted-gate-manifest.json"
)
HISTORICAL_V2_MANIFEST = (
    REPO_ROOT
    / "measure/acceptance/measure_apk_evidence_integrity_gates_20260712"
    / "phase4-v2-revoked-accepted-gate-manifest.json"
)
V6_ACCEPTED_MANIFEST_SHA256 = "22acc73ab7a2c75b9a472b18d3327c6d1a6c8ec105a17062ffa1e6cb1c3abcec"
V2_REVOKED_MANIFEST_SHA256 = "d52d06ed4926273f1105e3950f4adf998e18c88d7e55c82f6d6325b058abfc20"


class AcceptancePortabilityTests(unittest.TestCase):
    """Proves accepted and revoked acceptance evidence remains portable."""

    def _assert_portable_bound_artifacts(self, manifest: dict[str, object]) -> None:
        """Verifies that one manifest's bound evidence is stable and archive-portable.

        @param manifest Parsed accepted or revoked acceptance manifest.
        @returns Nothing.
        """
        bound_fields = (
            ("candidate_manifest_path", "candidate_manifest_hash"),
            ("review_report_path", "review_hash"),
            ("owner_approval_path", "owner_approval_hash"),
        )
        with tempfile.TemporaryDirectory() as temporary_directory:
            portable_repo = Path(temporary_directory)
            for path_field, hash_field in bound_fields:
                relative_path = manifest[path_field]
                self.assertTrue(relative_path.startswith("measure/acceptance/"))
                self.assertNotIn("/tracks/", relative_path)
                source = REPO_ROOT / relative_path
                self.assertEqual(
                    hashlib.sha256(source.read_bytes()).hexdigest(),
                    manifest[hash_field],
                )
                destination = portable_repo / relative_path
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, destination)

            self.assertFalse((portable_repo / "measure/tracks").exists())

    def _assert_accepted_manifest(self, manifest: dict[str, object]) -> None:
        """Verifies the generic consumable accepted-manifest contract.

        @param manifest Parsed accepted manifest.
        @returns Nothing.
        """
        self.assertEqual(manifest["status"], "accepted")
        self.assertTrue(manifest["consumable"])
        self.assertFalse(manifest["revoked"])
        self._assert_portable_bound_artifacts(manifest)

    def test_current_accepted_manifest_is_consumable_and_portable(self) -> None:
        """Validates accepted evidence generically without binding it to a version."""
        manifest_bytes = HISTORICAL_V6_ACCEPTED_MANIFEST.read_bytes()
        manifest = json.loads(manifest_bytes)
        self.assertEqual(hashlib.sha256(manifest_bytes).hexdigest(), V6_ACCEPTED_MANIFEST_SHA256)
        self._assert_accepted_manifest(manifest)

    def test_historical_v2_revoked_manifest_remains_non_consumable_and_portable(self) -> None:
        """Retains exact v2 evidence without assuming the active root is v2."""
        manifest_bytes = HISTORICAL_V2_MANIFEST.read_bytes()
        manifest = json.loads(manifest_bytes)
        self.assertEqual(hashlib.sha256(manifest_bytes).hexdigest(), V2_REVOKED_MANIFEST_SHA256)
        self.assertEqual(manifest["gate_version"], "phase4-v2-candidate")
        self.assertEqual(manifest["status"], "revoked")
        self.assertTrue(manifest["revoked"])
        self.assertFalse(manifest["consumable"])
        self._assert_portable_bound_artifacts(manifest)

    def test_v6_revocation_preserves_accepted_and_v2_historical_records(self) -> None:
        """Prevents a revocation transition from overwriting prior acceptance evidence."""
        current = json.loads(ACCEPTED_MANIFEST.read_text(encoding="utf-8"))
        accepted = json.loads(HISTORICAL_V6_ACCEPTED_MANIFEST.read_text(encoding="utf-8"))
        historical = json.loads(HISTORICAL_V2_MANIFEST.read_text(encoding="utf-8"))
        self.assertEqual(current["status"], "revoked")
        self.assertTrue(current["revoked"])
        self.assertFalse(current["consumable"])
        self.assertEqual(current["prior_accepted_manifest_path"], str(HISTORICAL_V6_ACCEPTED_MANIFEST.relative_to(REPO_ROOT)))
        self.assertEqual(current["prior_accepted_manifest_hash"], V6_ACCEPTED_MANIFEST_SHA256)
        self.assertNotEqual(accepted["gate_version"], historical["gate_version"])
        self.assertNotEqual(
            accepted["candidate_manifest_hash"], historical["candidate_manifest_hash"]
        )

    def test_retained_exports_are_parseable_and_content_addressed(self) -> None:
        """Verifies every retained compressed snapshot against its exact raw hash."""
        registry_path = (
            REPO_ROOT
            / "measure/acceptance/measure_apk_evidence_integrity_gates_20260712/export-snapshots.json"
        )
        registry = json.loads(registry_path.read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(registry["snapshots"]), 5)
        for snapshot in registry["snapshots"]:
            with self.subTest(purpose=snapshot["purpose"]):
                path = REPO_ROOT / snapshot["path"]
                self.assertEqual(path.name, f"{snapshot['raw_sha256']}.json.gz")
                raw = gzip.decompress(path.read_bytes())
                self.assertEqual(len(raw), snapshot["raw_bytes"])
                self.assertEqual(hashlib.sha256(raw).hexdigest(), snapshot["raw_sha256"])
                self.assertIsInstance(json.loads(raw), dict)


if __name__ == "__main__":
    unittest.main()
