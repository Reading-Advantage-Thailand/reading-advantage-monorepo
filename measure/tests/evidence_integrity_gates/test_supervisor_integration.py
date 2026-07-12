"""Subprocess integration tests for the Phase 4 supervisor completion gate."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
GATE_TRACK = "measure_apk_evidence_integrity_gates_20260712"


class SupervisorIntegrationTests(unittest.TestCase):
    """Runs the public gate and supervisor adapters against isolated Git repositories."""

    maxDiff = None

    def setUp(self) -> None:
        """Creates a minimal protected product track with a valid accepted gate pin."""
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.repo = Path(self.temporary_directory.name)
        (self.repo / "measure" / "tracks" / "product_track").mkdir(parents=True)
        (self.repo / "measure" / "tracks" / GATE_TRACK).mkdir(parents=True)
        (self.repo / "measure" / "generated").mkdir(parents=True)
        (self.repo / "measure" / "evidence_integrity_gates").mkdir(parents=True)
        (self.repo / "tests").mkdir()
        shutil.copy(REPO_ROOT / "measure" / "automation-supervisor.py", self.repo / "measure" / "automation-supervisor.py")
        for source in (REPO_ROOT / "measure" / "evidence_integrity_gates").glob("*.py"):
            shutil.copy(source, self.repo / "measure" / "evidence_integrity_gates" / source.name)
        self._write("measure/tracks.md", "# Tracks\n\n- product_track\n- measure_apk_evidence_integrity_gates_20260712\n\n## Archived Tracks\n")
        self._write("measure/anti-patterns.md", "# Catalog\n\n## A1 — control\n\n**Guard:** `tests/guard.sh`.\n")
        self._write("tests/guard.sh", "#!/usr/bin/env bash\nexit 0\n")
        self._write("measure/tracks/product_track/plan.md", "# Plan\n\n## Phase 1\n\n- [x] Task: done 1234567\n")
        self._write("measure/tracks/measure_apk_evidence_integrity_gates_20260712/plan.md", "# Plan\n\n## Phase 4\n\n- [b] Task: owner acceptance deferred:product-owner\n")
        self._write("measure/gate.py", "GATE = 1\n")
        self._git("init", "-q")
        self._git("config", "user.email", "test@example.com")
        self._git("config", "user.name", "Test")
        self._git("add", ".")
        self._git("commit", "-qm", "gate implementation")
        gate_commit = self._git("rev-parse", "HEAD").stdout.strip()
        gate_files = {"measure/gate.py": self._sha(self.repo / "measure" / "gate.py")}
        manifest = {
            "schema_version": "evidence-integrity.supervisor.v1",
            "gate_version": "phase4-v1",
            "status": "accepted",
            "revoked": False,
            "gate_commit": gate_commit,
            "files": gate_files,
            "review_hash": "a" * 64,
            "owner_approval_hash": "b" * 64,
        }
        self._write("measure/evidence-integrity-accepted-gate.json", json.dumps(manifest, sort_keys=True) + "\n")
        manifest_hash = self._sha(self.repo / "measure" / "evidence-integrity-accepted-gate.json")
        metadata = {
            "track_id": "product_track",
            "status": "in_progress",
            "depends_on": [GATE_TRACK],
            "evidence_integrity_gate": {
                "version": manifest["gate_version"],
                "commit": gate_commit,
                "manifest_sha256": manifest_hash,
                "files": gate_files,
            },
        }
        self._write("measure/tracks/product_track/metadata.json", json.dumps(metadata, indent=2) + "\n")
        self._git("add", ".")
        self._git("commit", "-qm", "pin gate before work")
        self._write("product.txt", "work\n")
        self._git("add", "product.txt")
        self._git("commit", "-qm", "product work")
        first_work_commit = self._git("rev-parse", "HEAD").stdout.strip()
        metadata["first_work_commit"] = first_work_commit
        self._write("measure/tracks/product_track/metadata.json", json.dumps(metadata, indent=2) + "\n")
        self._write_generated_facts()
        self._git("add", ".")
        self._git("commit", "-qm", "record work and generated facts")
        self._write_generated_facts()

    def tearDown(self) -> None:
        """Removes the isolated repository."""
        self.temporary_directory.cleanup()

    def _write(self, relative_path: str, content: str) -> None:
        """Writes one fixture file below the isolated repository."""
        path = self.repo / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def _git(self, *arguments: str) -> subprocess.CompletedProcess[str]:
        """Runs Git in the isolated repository and requires success."""
        return subprocess.run(["git", *arguments], cwd=self.repo, text=True, capture_output=True, check=True)

    def _sha(self, path: Path) -> str:
        """Hashes one fixture file."""
        return hashlib.sha256(path.read_bytes()).hexdigest()

    def _write_generated_facts(self) -> None:
        """Writes generated facts bound to the current source revision."""
        revision = self._git("rev-parse", "HEAD").stdout.strip()
        self._write(
            "measure/generated/architecture.json",
            json.dumps({"schemaVersion": "measure.architecture.v1", "sourceRevision": revision}) + "\n",
        )

    def _run_gate(self) -> tuple[subprocess.CompletedProcess[str], dict[str, Any]]:
        """Runs the versioned completion runner as a real subprocess."""
        result = subprocess.run(
            [sys.executable, "-m", "measure.evidence_integrity_gates.cli", "supervisor-completion", "--repo", str(self.repo), "--track", "product_track"],
            cwd=self.repo,
            text=True,
            capture_output=True,
            check=False,
        )
        return result, json.loads(result.stdout)

    def _assert_blocked(self, code: str) -> None:
        """Requires the completion runner to fail with one stable blocker code."""
        result, report = self._run_gate()
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertEqual(report["blockers"][0]["code"], code)

    def test_001_valid_pinned_product_track_passes_versioned_runner(self) -> None:
        """Accepts a protected track only when every live binding is current."""
        result, report = self._run_gate()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(report["ok"])
        self.assertEqual(report["schema_version"], "evidence-integrity.supervisor.v1")

    def test_002_absent_revoked_stale_and_mismatched_manifests_fail_closed(self) -> None:
        """Rejects each non-consumable accepted-manifest state."""
        manifest_path = self.repo / "measure/evidence-integrity-accepted-gate.json"
        original = manifest_path.read_text(encoding="utf-8")
        manifest_path.unlink()
        self._assert_blocked("ACCEPTED_GATE_MANIFEST_REQUIRED")
        manifest_path.write_text(original, encoding="utf-8")
        manifest = json.loads(original)
        manifest["revoked"] = True
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        self._assert_blocked("ACCEPTED_GATE_REVOKED")
        manifest_path.write_text(original, encoding="utf-8")
        self._write("measure/gate.py", "GATE = 2\n")
        self._assert_blocked("GATE_FILE_HASH_MISMATCH")

    def test_003_legacy_dependencies_and_unpinned_work_are_rejected(self) -> None:
        """Rejects dependency aliases and product work without a complete prior pin."""
        metadata_path = self.repo / "measure/tracks/product_track/metadata.json"
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        metadata["dependencies"] = metadata.pop("depends_on")
        metadata_path.write_text(json.dumps(metadata), encoding="utf-8")
        self._assert_blocked("LEGACY_DEPENDENCIES_FIELD")
        metadata["depends_on"] = metadata.pop("dependencies")
        metadata.pop("evidence_integrity_gate")
        metadata_path.write_text(json.dumps(metadata), encoding="utf-8")
        self._assert_blocked("PRODUCT_GATE_PIN_REQUIRED_BEFORE_WORK")

    def test_004_free_text_deferred_and_legacy_markers_do_not_bypass_completion(self) -> None:
        """Keeps prose deferrals incomplete and rejects legacy blank markers."""
        self._write("measure/tracks/product_track/plan.md", "# Plan\n\n## Phase 1\n\n- [~] Task: deferred until later\n")
        self._assert_blocked("INCOMPLETE_TASK")
        self._write("measure/tracks/product_track/plan.md", "# Plan\n\n## Phase 1\n\n- [ ] Task: hidden\n")
        self._assert_blocked("LEGACY_PLAN_MARKER")

    def test_005_product_track_cannot_edit_accepted_gate_files(self) -> None:
        """Rejects gate implementation edits after product work starts."""
        self._write("measure/gate.py", "GATE = 2\n")
        self._git("add", "measure/gate.py")
        self._git("commit", "-qm", "self edit gate")
        self._assert_blocked("PRODUCT_TRACK_EDITED_GATE")

    def test_006_stale_archive_paths_missing_guards_and_generated_facts_are_rejected(self) -> None:
        """Rejects A9/A10/A12/A13 repository-integrity regressions."""
        (self.repo / "tests" / "guard.sh").unlink()
        self._assert_blocked("CATALOG_GUARD_MISSING")
        self._write("tests/guard.sh", "#!/usr/bin/env bash\nexit 0\n")
        (self.repo / "measure" / "archive" / "product_track").mkdir(parents=True)
        self._assert_blocked("STALE_ARCHIVE_PATH")
        shutil.rmtree(self.repo / "measure" / "archive")
        self._write("apps/example/app/page.tsx", "export default 1\n")
        self._git("add", "apps/example/app/page.tsx")
        self._git("commit", "-qm", "structural change")
        self._assert_blocked("GENERATED_FACTS_STALE")

    def test_007_supervisor_dry_run_executes_gate_status_subprocess(self) -> None:
        """Makes dry-run status report the real completion gate result."""
        environment = os.environ.copy()
        environment["MEASURE_REPO_ROOT"] = str(self.repo)
        result = subprocess.run(
            [sys.executable, "measure/automation-supervisor.py", "--dry-run", "--track", "^product_track$"],
            cwd=self.repo,
            env=environment,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Evidence gate status: PASS", result.stdout)


if __name__ == "__main__":
    unittest.main()
