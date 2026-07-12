"""Archive-portability checks for immutable gate acceptance artifacts."""

from __future__ import annotations

import hashlib
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from measure.evidence_integrity_gates.supervisor_gate import _validate_acceptance_bindings


REPO_ROOT = Path(__file__).resolve().parents[3]
ACCEPTED_MANIFEST = REPO_ROOT / "measure/evidence-integrity-accepted-gate.json"


class AcceptancePortabilityTests(unittest.TestCase):
    """Proves accepted bindings survive removal of the active track directory."""

    def test_bound_artifacts_are_stable_and_portable_after_archive(self) -> None:
        """Validates exact approved bytes without relying on an active track path."""
        manifest = json.loads(ACCEPTED_MANIFEST.read_text(encoding="utf-8"))
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
            self.assertTrue(_validate_acceptance_bindings(portable_repo, manifest))


if __name__ == "__main__":
    unittest.main()
