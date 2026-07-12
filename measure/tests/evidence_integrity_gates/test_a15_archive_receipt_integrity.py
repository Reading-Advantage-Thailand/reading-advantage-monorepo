"""Guard tests for A15 — archive-only role-receipt integrity.

The orchestrator_role_receipt_integrity.sh guard must find provenance
evidence under both measure/tracks/ (active) and measure/archive/ (archived).
These tests prove the guard does not break when all provenance lives under
archive/, and that stale archived hashes are still rejected.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
GUARD_SCRIPT = REPO_ROOT / "tests/orchestrator_role_receipt_integrity.sh"


class A15ArchiveReceiptIntegrityTests(unittest.TestCase):
    """Exercises the A15 guard against archive-only provenance scenarios."""

    @classmethod
    def setUpClass(cls):
        """Verify the archived provenance file exists before any test runs."""
        cls.archived_prov_path = (
            REPO_ROOT
            / "measure/archive/measure_apk_evidence_integrity_gates_20260712"
            / "phase0-opencode-provenance.json"
        )
        cls.archived_prov_exists = cls.archived_prov_path.is_file()

    def test_archive_only_provenance_passes_in_live_repo(self) -> None:
        """Archived provenance is discovered when no active provenance files exist."""
        result = subprocess.run(
            ["bash", str(GUARD_SCRIPT)],
            cwd=REPO_ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, f"stderr: {result.stderr}\nstdout: {result.stdout}")

    def test_archived_provenance_hashes_are_independently_verifiable(self) -> None:
        """One role's output_sha256 entry verifies against its attested commit."""
        self.assertTrue(self.archived_prov_exists, "archived provenance must exist")
        payload = json.loads(self.archived_prov_path.read_text(encoding="utf-8"))
        roles = payload.get("roles", [])
        self.assertGreater(len(roles), 0)
        # Verify the first role's first output hash independently
        role = roles[0]
        commit = role.get("output_commit")
        self.assertIsInstance(commit, str)
        for output_path, expected_hash in (role.get("output_sha256") or {}).items():
            git_output = subprocess.run(
                ("git", "show", f"{commit}:{output_path}"),
                cwd=REPO_ROOT,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=True,
            ).stdout
            actual_hash = hashlib.sha256(git_output).hexdigest()
            self.assertEqual(
                actual_hash,
                expected_hash,
                f"archived provenance stale hash for {output_path} at {commit}",
            )
            break  # one assertion is sufficient

    def test_stale_archived_hash_fails(self) -> None:
        """A forged hash in archived provenance triggers 'stale hash' failure."""
        self.assertTrue(self.archived_prov_exists)
        real_prov = json.loads(self.archived_prov_path.read_text(encoding="utf-8"))

        # Create a temp git repo with the same content as the real provenance's
        # attested output, but record a wrong hash in provenance.
        import tempfile

        with tempfile.TemporaryDirectory() as td:
            temp_root = Path(td)
            subprocess.run(("git", "init", "-q"), cwd=temp_root, check=True)
            subprocess.run(
                ("git", "config", "user.email", "t@t.com"),
                cwd=temp_root, check=True,
            )
            subprocess.run(
                ("git", "config", "user.name", "T"),
                cwd=temp_root, check=True,
            )

            # Write the same content the real provenance attests and commit it
            role = real_prov["roles"][0]
            real_commit = role["output_commit"]
            output_path, real_hash = next(iter((role.get("output_sha256") or {}).items()))

            real_content = subprocess.run(
                ("git", "show", f"{real_commit}:{output_path}"),
                cwd=REPO_ROOT,
                stdout=subprocess.PIPE,
                check=True,
            ).stdout

            out_file = temp_root / output_path
            out_file.parent.mkdir(parents=True, exist_ok=True)
            out_file.write_bytes(real_content)

            subprocess.run(("git", "add", "."), cwd=temp_root, check=True)
            subprocess.run(
                ("git", "commit", "-qm", "initial"),
                cwd=temp_root, check=True,
            )
            first_commit = subprocess.run(
                ("git", "rev-parse", "HEAD"),
                cwd=temp_root,
                capture_output=True, text=True, check=True,
            ).stdout.strip()

            # Verify the real hash matches
            self.assertEqual(
                hashlib.sha256(real_content).hexdigest(), real_hash,
            )

            # Provenance with a FORGED hash (wrong)
            forged_prov = {
                "schema_version": "opencode-provenance.v1",
                "roles": [
                    {
                        "role": "strategy",
                        "session_id": "ses_forged",
                        "agent": "measure-strategy",
                        "raw_export_sha256": "a" * 64,
                        "raw_export_bytes": 100,
                        "prompt_sha256": "b" * 64,
                        "final_response_sha256": "c" * 64,
                        "output_sha256": {output_path: "0" * 64},
                        "output_commit": first_commit,
                        "fork_turns": None,
                        "fork_turns_check": "schema-field-absent",
                    }
                ],
            }
            archive_dir = temp_root / "measure/archive/forged_track"
            archive_dir.mkdir(parents=True)
            (archive_dir / "phase0-opencode-provenance.json").write_text(
                json.dumps(forged_prov, indent=2), encoding="utf-8",
            )

            # Run the guard script's embedded Python code in the temp repo
            script = GUARD_SCRIPT.read_text(encoding="utf-8")
            py_code = script.split("python3 - <<'PY'")[1].rsplit("\nPY", 1)[0].strip()
            result = subprocess.run(
                ["python3", "-c", py_code],
                cwd=temp_root,
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertNotEqual(result.returncode, 0, f"expected failure:\n{result.stdout}")
            self.assertIn("stale hash", result.stdout)

    def test_archived_provenance_missing_output_fails(self) -> None:
        """Archived provenance with a file not at the attested commit."""
        import tempfile

        with tempfile.TemporaryDirectory() as td:
            temp_root = Path(td)
            subprocess.run(("git", "init", "-q"), cwd=temp_root, check=True)
            subprocess.run(
                ("git", "config", "user.email", "t@t.com"),
                cwd=temp_root, check=True,
            )
            subprocess.run(
                ("git", "config", "user.name", "T"),
                cwd=temp_root, check=True,
            )

            # Commit a dummy file so there's a valid commit
            (temp_root / "placeholder.md").write_text("placeholder\n", encoding="utf-8")
            subprocess.run(("git", "add", "."), cwd=temp_root, check=True)
            subprocess.run(
                ("git", "commit", "-qm", "init"),
                cwd=temp_root, check=True,
            )
            commit_sha = subprocess.run(
                ("git", "rev-parse", "HEAD"),
                cwd=temp_root,
                capture_output=True, text=True, check=True,
            ).stdout.strip()

            # Provenance referencing a file that was never committed
            missing_prov = {
                "schema_version": "opencode-provenance.v1",
                "roles": [
                    {
                        "role": "strategy",
                        "session_id": "ses_missing",
                        "agent": "measure-strategy",
                        "raw_export_sha256": "a" * 64,
                        "raw_export_bytes": 100,
                        "prompt_sha256": "b" * 64,
                        "final_response_sha256": "c" * 64,
                        "output_sha256": {"outputs/missing.md": "d" * 64},
                        "output_commit": commit_sha,
                        "fork_turns": None,
                        "fork_turns_check": "schema-field-absent",
                    }
                ],
            }
            archive_dir = temp_root / "measure/archive/missing_track"
            archive_dir.mkdir(parents=True)
            (archive_dir / "phase0-opencode-provenance.json").write_text(
                json.dumps(missing_prov, indent=2), encoding="utf-8",
            )

            script = GUARD_SCRIPT.read_text(encoding="utf-8")
            py_code = script.split("python3 - <<'PY'")[1].rsplit("\nPY", 1)[0].strip()
            result = subprocess.run(
                ["python3", "-c", py_code],
                cwd=temp_root,
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertNotEqual(result.returncode, 0, f"expected failure:\n{result.stdout}")
            self.assertIn("missing", result.stdout)


if __name__ == "__main__":
    unittest.main()
