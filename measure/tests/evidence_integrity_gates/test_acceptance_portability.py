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


class AcceptancePortabilityTests(unittest.TestCase):
    """Proves historical v2 bindings remain portable while revoked."""

    def test_bound_artifacts_are_stable_and_portable_after_archive(self) -> None:
        """Retains exact historical bytes without treating revoked v2 as consumable."""
        manifest = json.loads(ACCEPTED_MANIFEST.read_text(encoding="utf-8"))
        self.assertEqual(manifest["status"], "revoked")
        self.assertTrue(manifest["revoked"])
        self.assertFalse(manifest["consumable"])
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
