"""Focused contracts for the R0 fixture generator's non-writing check mode."""
from __future__ import annotations

import hashlib
import importlib.util
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from typing import Any
from unittest import mock


REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURE_ROOT = (
    REPO_ROOT
    / "measure/tracks/business_operations_graph_baseline_remediation_20260730/fixtures/v1"
)
GENERATOR_PATH = FIXTURE_ROOT / "generate-fixtures.py"


def _load_generator() -> Any:
    """Loads the fixture generator as an isolated module for focused tests."""
    spec = importlib.util.spec_from_file_location("r0_fixture_generator", GENERATOR_PATH)
    if spec is None or spec.loader is None:
        raise AssertionError("Unable to load the R0 fixture generator")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _file_snapshot(root: Path) -> dict[str, tuple[str, int, int]]:
    """Returns each fixture file's bytes digest, size, and nanosecond mtime."""
    snapshot: dict[str, tuple[str, int, int]] = {}
    for path in sorted(path for path in root.rglob("*") if path.is_file()):
        data = path.read_bytes()
        stat = path.stat()
        snapshot[path.relative_to(root).as_posix()] = (
            hashlib.sha256(data).hexdigest(),
            len(data),
            stat.st_mtime_ns,
        )
    return snapshot


def _git_snapshot() -> tuple[bytes, bytes, bytes, bytes, int]:
    """Returns worktree status, diffs, and real-index bytes and mtime."""
    def run(*args: str) -> bytes:
        return subprocess.run(
            ["git", *args],
            cwd=REPO_ROOT,
            check=True,
            capture_output=True,
        ).stdout

    index = REPO_ROOT / ".git/index"
    return (
        run("status", "--porcelain=v1", "--untracked-files=all"),
        run("diff", "--no-ext-diff", "--binary"),
        run("diff", "--cached", "--no-ext-diff", "--binary"),
        index.read_bytes(),
        index.stat().st_mtime_ns,
    )


class FixtureGeneratorCheckModeTests(unittest.TestCase):
    """Proves check mode detects drift without changing repository state."""

    def _matching_fixture_copy(self, root: Path) -> Any:
        """Creates a generated fixture copy for pass and mutation checks."""
        root.mkdir()
        shutil.copy2(GENERATOR_PATH, root / "generate-fixtures.py")
        shutil.copytree(FIXTURE_ROOT / "parent-fail-artifacts-v1", root / "parent-fail-artifacts-v1")
        module = _load_generator()
        with mock.patch.object(module, "OUT", root):
            module._generate_all(root)
        return module

    def test_check_pass_preserves_fixture_files_mtimes_index_and_worktree(self) -> None:
        """A matching check exits zero and performs no repository writes."""
        with tempfile.TemporaryDirectory() as directory:
            fixture_copy = Path(directory) / "fixtures"
            module = self._matching_fixture_copy(fixture_copy)
            fixtures_before = _file_snapshot(fixture_copy)
            git_before = _git_snapshot()
            with mock.patch.object(module, "OUT", fixture_copy):
                result = module.main(["--check"])
            self.assertEqual(result, 0)
            self.assertEqual(_file_snapshot(fixture_copy), fixtures_before)
            self.assertEqual(_git_snapshot(), git_before)

    def test_check_mismatch_exits_nonzero_without_writing_fixture_copy(self) -> None:
        """A changed fixture exits nonzero and remains byte- and mtime-stable."""
        with tempfile.TemporaryDirectory() as directory:
            fixture_copy = Path(directory) / "fixtures"
            module = self._matching_fixture_copy(fixture_copy)
            target = fixture_copy / "candidate-envelopes-v1.json"
            target.write_bytes(target.read_bytes().replace(b'"schemaVersion": 1', b'"schemaVersion": 2', 1))
            before = _file_snapshot(fixture_copy)
            with mock.patch.object(module, "OUT", fixture_copy):
                result = module.main(["--check"])
            self.assertEqual(result, 1)
            self.assertEqual(_file_snapshot(fixture_copy), before)

    def test_check_cli_reports_dirty_baseline_without_writing_repository_state(self) -> None:
        """The CLI returns nonzero for current source drift without touching the worktree."""
        fixtures_before = _file_snapshot(FIXTURE_ROOT)
        git_before = _git_snapshot()
        result = subprocess.run(
            ["python3", str(GENERATOR_PATH), "--check"],
            cwd=REPO_ROOT,
            env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("CHECK FAIL", result.stderr)
        self.assertEqual(_file_snapshot(FIXTURE_ROOT), fixtures_before)
        self.assertEqual(_git_snapshot(), git_before)


if __name__ == "__main__":
    unittest.main()
