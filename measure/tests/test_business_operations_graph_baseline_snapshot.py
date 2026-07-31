"""Focused Red tests for the dirty-worktree source snapshot producer."""
from __future__ import annotations

import base64
import copy
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock


REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURE_ROOT = (
    REPO_ROOT
    / "measure/tracks/business_operations_graph_baseline_remediation_20260730/fixtures/v1"
)


class BusinessOperationsGraphSnapshotRedTests(unittest.TestCase):
    """Defines the non-mutating R1 snapshot producer contract."""

    def setUp(self) -> None:
        """Creates a small master worktree with tracked scanner inputs."""
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name) / "repo"
        self.root.mkdir()
        self._git("init", "-b", "master")
        self._git("config", "user.email", "snapshot@example.test")
        self._git("config", "user.name", "Snapshot Test")
        self._write("src/app.ts", "export const app = 1;\n")
        self._write("src/extra.mts", "export const extra = 1;\n")
        self._write("config/base.json", '{"compilerOptions":{"strict":true}}\n')
        self._write(
            "tsconfig.json",
            '{"extends":"./config/base","include":["src"]}\n',
        )
        self._write("package.json", '{"name":"snapshot-fixture"}\n')
        self._write("packages/demo/package.json", '{"name":"demo"}\n')
        self._write("pnpm-workspace.yaml", "packages:\n  - \"packages/*\"\n")
        self._write("pnpm-lock.yaml", "lockfileVersion: '9.0'\n")
        self._write("build-graph.config.json", '{"include":["**/*.ts"]}\n')
        self._git("add", ".")
        self._git("commit", "-m", "initial")

    def tearDown(self) -> None:
        """Removes the temporary worktree."""
        self.temporary.cleanup()

    def _git(self, *args: str) -> bytes:
        """Runs one read-only or setup Git command in the fixture worktree."""
        result = subprocess.run(
            ["git", *args],
            cwd=self.root,
            check=True,
            capture_output=True,
        )
        return result.stdout

    def _write(self, relative: str, content: str) -> None:
        """Writes one fixture file, creating its parent directories."""
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def _producer(self):
        """Imports the R1 producer under test."""
        from measure.business_operations_graph_baseline_snapshot import (
            produce_snapshot,
        )

        return produce_snapshot

    def _json_ref(self, root: Path, name: str, value: object) -> dict[str, object]:
        """Writes canonical fixture JSON and returns its immutable reference."""
        data = (json.dumps(value, indent=2, sort_keys=True) + "\n").encode()
        (root / name).write_bytes(data)
        return {"path": name, "sha256": hashlib.sha256(data).hexdigest(), "size": len(data)}

    def test_complete_discovery_includes_ts_configs_extends_manifests_and_graph_config(
        self,
    ) -> None:
        """Discovers the complete scanner-input denominator without a hand list."""
        with tempfile.TemporaryDirectory() as output:
            result = self._producer()(
                self.root,
                Path(output),
                tool_version="repo-graph 0.1.0",
            )
        paths = {entry["path"] for entry in result.manifest["entries"]}
        self.assertTrue({
            "src/app.ts",
            "src/extra.mts",
            "tsconfig.json",
            "config/base.json",
            "package.json",
            "packages/demo/package.json",
            "pnpm-workspace.yaml",
            "pnpm-lock.yaml",
            "build-graph.config.json",
        } <= paths)
        discovery = result.manifest["discovery"]
        self.assertEqual(discovery["candidateExtensions"], [".ts", ".tsx", ".mts", ".cts"])
        self.assertIn("config/base.json", discovery["extendsPaths"])

    def test_nested_extends_chain_is_recursively_hashed(self) -> None:
        """Includes an extended config's own non-tsconfig-named extends target."""
        self._write("config/base.json", '{"extends":"./deep/shared"}\n')
        self._write("config/deep/shared.json", '{"compilerOptions":{"strict":true}}\n')
        with tempfile.TemporaryDirectory() as output:
            result = self._producer()(self.root, output, tool_version="test")
        entries = {entry["path"] for entry in result.manifest["entries"]}
        self.assertIn("config/deep/shared.json", entries)
        self.assertTrue(
            {"config/base.json", "config/deep/shared.json"}
            <= set(result.manifest["discovery"]["extendsPaths"])
        )

    def test_tracked_modification_and_untracked_input_are_hashed_without_index_mutation(
        self,
    ) -> None:
        """Captures current bytes and tracked state while preserving the index."""
        index_before = (self.root / ".git/index").read_bytes()
        self._write("src/app.ts", "export const app = 2;\n")
        self._write("src/untracked.cts", "export const untracked = 1;\n")
        with tempfile.TemporaryDirectory() as output:
            result = self._producer()(self.root, Path(output), tool_version="test")
        index_after = (self.root / ".git/index").read_bytes()
        self.assertEqual(index_before, index_after)
        entries = {entry["path"]: entry for entry in result.manifest["entries"]}
        self.assertEqual(entries["src/app.ts"]["state"], "tracked")
        self.assertEqual(entries["src/untracked.cts"]["state"], "untracked")
        self.assertEqual(
            entries["src/app.ts"]["sha256"],
            hashlib.sha256(b"export const app = 2;\n").hexdigest(),
        )
        self.assertEqual(result.manifest["branch"], "master")
        self.assertEqual(result.manifest["scanCommand"], "repo-graph scan . ./graph.db")

    def test_deletion_is_preserved_as_a_tracked_scanner_input_event(self) -> None:
        """Records a deleted tracked source rather than silently dropping it."""
        (self.root / "src/app.ts").unlink()
        with tempfile.TemporaryDirectory() as output:
            result = self._producer()(self.root, Path(output), tool_version="test")
        deleted = {entry["path"]: entry for entry in result.manifest["deletedInputs"]}
        self.assertIn("src/app.ts", deleted)
        self.assertEqual(deleted["src/app.ts"]["state"], "deleted")
        entry = next(item for item in result.manifest["entries"] if item["path"] == "src/app.ts")
        self.assertEqual(entry["state"], "deleted")
        self.assertEqual(entry["sha256"], hashlib.sha256(b"export const app = 1;\n").hexdigest())
        self.assertIn(" D src/app.ts", result.manifest["status"])

    def test_staged_deletion_is_preserved_in_the_denominator(self) -> None:
        """Includes a staged deletion that no longer appears in git ls-files --deleted."""
        (self.root / "src/app.ts").unlink()
        self._git("add", "src/app.ts")
        with tempfile.TemporaryDirectory() as output:
            result = self._producer()(self.root, output, tool_version="test")
        deleted = {entry["path"] for entry in result.manifest["deletedInputs"]}
        self.assertIn("src/app.ts", deleted)
        self.assertIn("D src/app.ts", result.manifest["status"])

    def test_unstaged_deleted_extends_target_is_preserved_in_scope_and_replay(self) -> None:
        """Retains an unstaged nonstandard tsconfig extends target as a tombstone."""
        from measure.business_operations_graph_baseline_snapshot import verify_snapshot

        (self.root / "config/base.json").unlink()
        index_before = (self.root / ".git/index").read_bytes()
        output = Path(self.temporary.name) / "unstaged-extends-output"

        result = self._producer()(self.root, output, tool_version="test")

        deleted = {entry["path"] for entry in result.manifest["deletedInputs"]}
        self.assertIn("config/base.json", deleted)
        self.assertIn("config/base.json", result.pre_state["scannerPaths"])
        self.assertIn("config/base.json", result.post_state["scannerPaths"])
        self.assertIn(" D config/base.json", result.pre_state["status"])
        self.assertEqual(
            verify_snapshot(output)["config/base.json"],
            b'{"compilerOptions":{"strict":true}}\n',
        )
        self.assertEqual(index_before, (self.root / ".git/index").read_bytes())

    def test_staged_deleted_extends_target_is_preserved_in_scope_and_replay(self) -> None:
        """Retains a staged nonstandard tsconfig extends target as a tombstone."""
        from measure.business_operations_graph_baseline_snapshot import verify_snapshot

        (self.root / "config/base.json").unlink()
        self._git("add", "config/base.json")
        index_before = (self.root / ".git/index").read_bytes()
        output = Path(self.temporary.name) / "staged-extends-output"

        result = self._producer()(self.root, output, tool_version="test")

        deleted = {entry["path"] for entry in result.manifest["deletedInputs"]}
        self.assertIn("config/base.json", deleted)
        self.assertIn("config/base.json", result.pre_state["scannerPaths"])
        self.assertIn("D config/base.json", result.pre_state["status"])
        self.assertIn("config/base.json", result.pre_state["stagedDiff"])
        self.assertEqual(
            verify_snapshot(output)["config/base.json"],
            b'{"compilerOptions":{"strict":true}}\n',
        )
        self.assertEqual(index_before, (self.root / ".git/index").read_bytes())

    def test_staged_deleted_workspace_export_extends_target_is_preserved(self) -> None:
        """Retains a deleted workspace-export tsconfig dependency outside filename rules."""
        from measure.business_operations_graph_baseline_snapshot import verify_snapshot

        self._write(
            "packages/demo/package.json",
            '{"name":"@snapshot/demo-config","exports":{"./strict":"./config/base.json"}}\n',
        )
        self._write(
            "packages/demo/config/base.json",
            '{"compilerOptions":{"noUncheckedIndexedAccess":true}}\n',
        )
        self._write(
            "packages/demo/strict.json",
            '{"compilerOptions":{"strict":false}}\n',
        )
        self._write(
            "tsconfig.json",
            '{"extends":"@snapshot/demo-config/strict","include":["src"]}\n',
        )
        self._git(
            "add",
            "packages/demo/package.json",
            "packages/demo/config/base.json",
            "packages/demo/strict.json",
            "tsconfig.json",
        )
        self._git("commit", "-m", "add workspace config export")
        (self.root / "packages/demo/config/base.json").unlink()
        self._git("add", "packages/demo/config/base.json")
        index_before = (self.root / ".git/index").read_bytes()
        output = Path(self.temporary.name) / "workspace-extends-output"

        result = self._producer()(self.root, output, tool_version="test")

        target = "packages/demo/config/base.json"
        self.assertIn(target, {entry["path"] for entry in result.manifest["deletedInputs"]})
        self.assertIn(target, result.manifest["discovery"]["extendsPaths"])
        self.assertIn(target, result.pre_state["scannerPaths"])
        self.assertIn(target, result.pre_state["stagedDiff"])
        self.assertEqual(
            verify_snapshot(output)[target],
            b'{"compilerOptions":{"noUncheckedIndexedAccess":true}}\n',
        )
        self.assertEqual(index_before, (self.root / ".git/index").read_bytes())

    def test_staged_scanner_to_documentation_rename_keeps_source_tombstone(self) -> None:
        """Retains a scanner rename source even when its destination is not a scanner input."""
        from measure.business_operations_graph_baseline_snapshot import verify_snapshot

        destination = self.root / "docs/app.md"
        destination.parent.mkdir(parents=True, exist_ok=True)
        (self.root / "src/app.ts").rename(destination)
        self._git("add", "-A")
        index_before = (self.root / ".git/index").read_bytes()
        output = Path(self.temporary.name) / "scanner-rename-output"

        result = self._producer()(self.root, output, tool_version="test")

        source = "src/app.ts"
        self.assertIn(source, {entry["path"] for entry in result.manifest["deletedInputs"]})
        self.assertIn(source, result.pre_state["scannerPaths"])
        self.assertIn(source, result.post_state["scannerPaths"])
        self.assertIn(source, result.pre_state["status"])
        self.assertIn(source, result.pre_state["stagedDiff"])
        self.assertEqual(verify_snapshot(output)[source], b"export const app = 1;\n")
        self.assertEqual(index_before, (self.root / ".git/index").read_bytes())

    def test_symlink_is_archived_with_target_metadata_and_bytes(self) -> None:
        """Archives an in-repository TypeScript symlink without following directories."""
        (self.root / "src/alias.ts").symlink_to("app.ts")
        with tempfile.TemporaryDirectory() as output:
            result = self._producer()(self.root, Path(output), tool_version="test")
        entry = next(item for item in result.manifest["entries"] if item["path"] == "src/alias.ts")
        self.assertEqual(entry["kind"], "symlink")
        self.assertEqual(entry["symlinkTarget"], "app.ts")
        self.assertEqual(entry["resolvedTargetPath"], "src/app.ts")
        self.assertEqual(entry["sha256"], hashlib.sha256(b"export const app = 1;\n").hexdigest())

    def test_non_scanner_markdown_symlink_is_excluded_from_discovery(self) -> None:
        """Excludes unrelated file symlinks instead of adding every symlink to scope."""
        markdown_link = self.root / "docs/alias.md"
        markdown_link.parent.mkdir(parents=True, exist_ok=True)
        markdown_link.symlink_to("../src/app.ts")

        with tempfile.TemporaryDirectory() as output:
            result = self._producer()(self.root, output, tool_version="test")

        self.assertNotIn(
            "docs/alias.md",
            {entry["path"] for entry in result.manifest["entries"]},
        )

    def test_symlink_target_staged_drift_aborts_when_live_bytes_are_restored(self) -> None:
        """Rejects staged drift in physical bytes supplied through a scanner symlink."""
        from measure.business_operations_graph_baseline_snapshot import SnapshotDriftError

        target = self.root / "shared/source.txt"
        self._write("shared/source.txt", "export const source = 1;\n")
        (self.root / "src/alias.ts").symlink_to("../shared/source.txt")
        self._git("add", "shared/source.txt", "src/alias.ts")
        self._git("commit", "-m", "add scanner symlink target")
        index_after_drift: list[bytes] = []
        output = Path(self.temporary.name) / "symlink-target-staged-drift-output"

        with tempfile.TemporaryDirectory() as pristine_output:
            pristine = self._producer()(self.root, pristine_output, tool_version="test")
        self.assertIn("shared/source.txt", pristine.pre_state["dependencyPaths"])
        self.assertIn("shared/source.txt", pristine.post_state["dependencyPaths"])

        def staged_target_drift() -> None:
            """Stages target bytes before restoring the live target content."""
            self._write("shared/source.txt", "export const source = 2;\n")
            self._git("add", "shared/source.txt")
            self._write("shared/source.txt", "export const source = 1;\n")
            index_after_drift.append((self.root / ".git/index").read_bytes())

        with self.assertRaises(SnapshotDriftError) as caught:
            self._producer()(
                self.root,
                output,
                tool_version="test",
                before_post_check=staged_target_drift,
            )
        self.assertIn("status or staged-diff", str(caught.exception))
        self.assertEqual(index_after_drift, [(self.root / ".git/index").read_bytes()])
        self.assertFalse(output.exists())

    def test_changed_and_reverted_symlink_target_commits_during_scan_abort(self) -> None:
        """Rejects changed-and-restored non-TypeScript target commits supplying scanner bytes."""
        from measure.business_operations_graph_baseline_snapshot import (
            SnapshotDriftError,
            produce_scan_bracketed_snapshot,
        )

        self._write("shared/source.txt", "export const source = 1;\n")
        (self.root / "src/alias.ts").symlink_to("../shared/source.txt")
        self._git("add", "shared/source.txt", "src/alias.ts")
        self._git("commit", "-m", "add scanner symlink target")
        (self.root / ".git/info/exclude").write_text("graph.db\n", encoding="utf-8")
        output = Path(self.temporary.name) / "symlink-target-commit-drift-output"

        def scan_runner(repo: Path) -> dict[str, object]:
            """Writes scan output while committing and restoring the physical target."""
            (repo / "graph.db").write_bytes(b"graph output\n")
            self._write("shared/source.txt", "export const source = 2;\n")
            self._git("add", "shared/source.txt")
            self._git("commit", "-m", "test: change symlink target")
            self._write("shared/source.txt", "export const source = 1;\n")
            self._git("add", "shared/source.txt")
            self._git("commit", "-m", "test: restore symlink target")
            return {
                "command": "repo-graph scan . ./graph.db",
                "exitCode": 0,
                "graphPath": "graph.db",
                "stderr": "",
                "stdout": "scanned",
            }

        with self.assertRaises(SnapshotDriftError) as caught:
            produce_scan_bracketed_snapshot(
                self.root, output, tool_version="test", scan_runner=scan_runner
            )
        self.assertIn("shared/source.txt", str(caught.exception))
        self.assertFalse(output.exists())

    def test_duplicate_and_traversal_archive_paths_are_rejected(self) -> None:
        """Rejects duplicate, absolute, traversal, and alias archive paths."""
        from measure.business_operations_graph_baseline_snapshot import (
            SCHEMA_VERSION,
            SnapshotValidationError,
            replay_archive,
        )

        content = base64.b64encode(b"source").decode()
        for paths in (("src/a.ts", "src/a.ts"), ("../a.ts",), ("a/../a.ts",), ("/a.ts",)):
            archive = {
                "archiveKind": "source-snapshot",
                "encoding": "base64-per-entry",
                "schemaVersion": SCHEMA_VERSION,
                "entries": [
                    {
                        "contentBase64": content,
                        "kind": "file",
                        "mode": "100644",
                        "path": path,
                        "sha256": hashlib.sha256(b"source").hexdigest(),
                        "size": 6,
                        "state": "tracked",
                        "symlinkTarget": None,
                        "resolvedTargetPath": None,
                    }
                    for path in paths
                ],
            }
            with self.subTest(paths=paths):
                with self.assertRaises(SnapshotValidationError):
                    replay_archive(archive)

    def test_archive_tampering_is_rejected_by_replay_verification(self) -> None:
        """Rejects modified archive bytes when the manifest digest is unchanged."""
        from measure.business_operations_graph_baseline_snapshot import (
            SnapshotValidationError,
            verify_snapshot,
        )

        with tempfile.TemporaryDirectory() as output:
            output_path = Path(output)
            self._producer()(self.root, output_path, tool_version="test")
            archive_path = output_path / "snapshot.archive.json"
            archive = json.loads(archive_path.read_text(encoding="utf-8"))
            archive["entries"][0]["contentBase64"] = base64.b64encode(b"tampered").decode()
            archive_path.write_text(
                json.dumps(archive, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
            with self.assertRaises(SnapshotValidationError):
                verify_snapshot(output_path)

    def test_untouched_archive_verifies_and_replays_exact_bytes(self) -> None:
        """Accepts an untouched producer bundle before applying tampering controls."""
        from measure.business_operations_graph_baseline_snapshot import verify_snapshot

        with tempfile.TemporaryDirectory() as output:
            output_path = Path(output)
            self._producer()(self.root, output_path, tool_version="test")
            replay = verify_snapshot(output_path)
        self.assertEqual(replay["src/app.ts"], b"export const app = 1;\n")

    def test_workspace_package_globs_are_recorded_from_pnpm_workspace(self) -> None:
        """Records the declared workspace globs in the rich discovery manifest."""
        with tempfile.TemporaryDirectory() as output:
            result = self._producer()(self.root, output, tool_version="test")
        self.assertEqual(result.manifest["discovery"]["packageGlobs"], ["packages/*"])

    def test_scan_runner_executes_between_state_captures_and_binds_its_record(self) -> None:
        """Runs the injected canonical scan between pre and post state captures."""
        import measure.business_operations_graph_baseline_snapshot as snapshot_module
        from measure.business_operations_graph_baseline_snapshot import (
            produce_scan_bracketed_snapshot,
            verify_scan_bracketed_snapshot,
        )

        events: list[str] = []
        (self.root / ".git/info/exclude").write_text("graph.db\n", encoding="utf-8")
        original_capture = snapshot_module._capture_state

        def capture(
            repo: Path,
            scanner_paths: object,
            dependency_paths: object | None = None,
        ):
            events.append("capture")
            return original_capture(repo, scanner_paths, dependency_paths)

        def scan_runner(repo: Path) -> dict[str, object]:
            events.append("scan")
            (repo / "graph.db").write_bytes(b"graph output\n")
            return {
                "command": "repo-graph scan . ./graph.db",
                "exitCode": 0,
                "graphPath": "graph.db",
                "stderr": "",
                "stdout": "scanned",
            }

        with tempfile.TemporaryDirectory() as output:
            output_path = Path(output)
            with mock.patch.object(snapshot_module, "_capture_state", side_effect=capture):
                produce_scan_bracketed_snapshot(
                    self.root, output_path, tool_version="test", scan_runner=scan_runner
                )
            self.assertEqual(events, ["capture", "scan", "capture"])
            record = json.loads((output_path / "snapshot.scan.json").read_text(encoding="utf-8"))
            self.assertEqual(record["command"], "repo-graph scan . ./graph.db")
            self.assertEqual(record["exitCode"], 0)
            self.assertEqual(record["graph"]["sha256"], hashlib.sha256(b"graph output\n").hexdigest())
            self.assertEqual(verify_scan_bracketed_snapshot(output_path)["src/app.ts"], b"export const app = 1;\n")

    def test_non_scanner_commit_during_scan_preserves_source_snapshot_and_records_head_interval(
        self,
    ) -> None:
        """Allows a committed non-scanner plan update while recording the Git-head interval."""
        from measure.business_operations_graph_baseline_snapshot import (
            produce_scan_bracketed_snapshot,
            verify_scan_bracketed_snapshot,
        )

        (self.root / ".git/info/exclude").write_text("graph.db\n", encoding="utf-8")
        pre_head = self._git("rev-parse", "HEAD").decode().strip()

        def scan_runner(repo: Path) -> dict[str, object]:
            """Writes ignored scan output and commits a non-scanner Measure-plan update."""
            (repo / "graph.db").write_bytes(b"graph output\n")
            self._write("measure/tracks/unrelated/plan.md", "# Unrelated plan\n")
            self._git("add", "measure/tracks/unrelated/plan.md")
            self._git("commit", "-m", "docs: update unrelated plan")
            return {
                "command": "repo-graph scan . ./graph.db",
                "exitCode": 0,
                "graphPath": "graph.db",
                "stderr": "",
                "stdout": "scanned",
            }

        with tempfile.TemporaryDirectory() as output:
            output_path = Path(output)
            result = produce_scan_bracketed_snapshot(
                self.root, output_path, tool_version="test", scan_runner=scan_runner
            )
            post_head = self._git("rev-parse", "HEAD").decode().strip()
            record = json.loads((output_path / "snapshot.scan.json").read_text(encoding="utf-8"))

            self.assertEqual(result.manifest["baselineHead"], pre_head)
            self.assertEqual(result.manifest["preHead"], pre_head)
            self.assertEqual(result.manifest["postHead"], post_head)
            self.assertEqual(result.pre_state["denominatorSha256"], result.post_state["denominatorSha256"])
            self.assertEqual(result.pre_state["porcelain"], result.post_state["porcelain"])
            self.assertEqual(result.pre_state["stagedDiff"], result.post_state["stagedDiff"])
            self.assertEqual(record["preHead"], pre_head)
            self.assertEqual(record["postHead"], post_head)
            self.assertNotEqual(record["preHead"], record["postHead"])
            self.assertEqual(
                verify_scan_bracketed_snapshot(output_path)["src/app.ts"],
                b"export const app = 1;\n",
            )

    def test_changed_and_reverted_scanner_commits_during_scan_abort(self) -> None:
        """Rejects an ancestor HEAD advance that changes then restores scanner input bytes."""
        from measure.business_operations_graph_baseline_snapshot import (
            SnapshotDriftError,
            produce_scan_bracketed_snapshot,
        )

        (self.root / ".git/info/exclude").write_text("graph.db\n", encoding="utf-8")
        output = Path(self.temporary.name) / "changed-and-reverted-output"

        def scan_runner(repo: Path) -> dict[str, object]:
            """Commits and reverts a source edit before returning a scan result."""
            (repo / "graph.db").write_bytes(b"graph output\n")
            self._write("src/app.ts", "export const app = 2;\n")
            self._git("add", "src/app.ts")
            self._git("commit", "-m", "test: change scanner input")
            self._write("src/app.ts", "export const app = 1;\n")
            self._git("add", "src/app.ts")
            self._git("commit", "-m", "test: restore scanner input")
            return {
                "command": "repo-graph scan . ./graph.db",
                "exitCode": 0,
                "graphPath": "graph.db",
                "stderr": "",
                "stdout": "scanned",
            }

        with self.assertRaises(SnapshotDriftError) as caught:
            produce_scan_bracketed_snapshot(
                self.root, output, tool_version="test", scan_runner=scan_runner
            )
        self.assertIn("src/app.ts", str(caught.exception))
        self.assertFalse(output.exists())

    def test_unrelated_staged_diff_drift_is_outside_the_scanner_scope(self) -> None:
        """Allows concurrent documentation index changes outside the scanner denominator."""
        self._write("docs/notes.md", "before\n")
        self._git("add", "docs/notes.md")

        def unrelated_drift() -> None:
            """Changes only a staged documentation file after the pre-state capture."""
            self._write("docs/notes.md", "after\n")
            self._git("add", "docs/notes.md")

        with tempfile.TemporaryDirectory() as output:
            result = self._producer()(
                self.root,
                output,
                tool_version="test",
                before_post_check=unrelated_drift,
            )

        scanner_paths = sorted(entry["path"] for entry in result.manifest["entries"])
        self.assertEqual(result.pre_state["scannerPaths"], scanner_paths)
        self.assertEqual(result.pre_state["stagedDiff"], result.post_state["stagedDiff"])
        self.assertNotIn("docs/notes.md", result.pre_state["stagedDiff"])

    def test_scanner_staged_diff_drift_aborts_even_when_worktree_bytes_match(self) -> None:
        """Rejects a scanner input whose Git index changes while its live bytes are restored."""
        from measure.business_operations_graph_baseline_snapshot import SnapshotDriftError

        output = Path(self.temporary.name) / "scanner-staged-drift-output"

        def staged_drift() -> None:
            """Stages different source bytes before restoring the live source file."""
            self._write("src/app.ts", "export const app = 2;\n")
            self._git("add", "src/app.ts")
            self._write("src/app.ts", "export const app = 1;\n")

        with self.assertRaises(SnapshotDriftError) as caught:
            self._producer()(
                self.root,
                output,
                tool_version="test",
                before_post_check=staged_drift,
            )
        self.assertIn("status or staged-diff", str(caught.exception))
        self.assertFalse(output.exists())

    def test_non_ancestor_history_during_scan_aborts(self) -> None:
        """Rejects a rewritten master history even when the final source bytes match."""
        from measure.business_operations_graph_baseline_snapshot import (
            SnapshotDriftError,
            produce_scan_bracketed_snapshot,
        )

        (self.root / ".git/info/exclude").write_text("graph.db\n", encoding="utf-8")
        output = Path(self.temporary.name) / "non-ancestor-output"

        def scan_runner(repo: Path) -> dict[str, object]:
            """Replaces master with an orphan commit that retains the source tree."""
            (repo / "graph.db").write_bytes(b"graph output\n")
            self._git("switch", "--orphan", "rewritten-history")
            self._write("measure/tracks/unrelated/plan.md", "# Unrelated plan\n")
            self._git("add", ".")
            self._git("commit", "-m", "docs: rewrite unrelated plan")
            self._git("branch", "-M", "master")
            return {
                "command": "repo-graph scan . ./graph.db",
                "exitCode": 0,
                "graphPath": "graph.db",
                "stderr": "",
                "stdout": "scanned",
            }

        with self.assertRaises(SnapshotDriftError) as caught:
            produce_scan_bracketed_snapshot(
                self.root, output, tool_version="test", scan_runner=scan_runner
            )
        self.assertIn("not an ancestor", str(caught.exception))
        self.assertFalse(output.exists())

    def test_verification_rejects_tampered_rich_and_r0_state_artifacts(self) -> None:
        """Fails closed when any pre or post state artifact changes after capture."""
        from measure.business_operations_graph_baseline_snapshot import (
            SnapshotValidationError,
            verify_snapshot,
        )

        for name in (
            "snapshot.pre-state.json",
            "snapshot.post-state.json",
            "snapshot.r0.pre-state.json",
            "snapshot.r0.post-state.json",
        ):
            with self.subTest(name=name), tempfile.TemporaryDirectory() as output:
                output_path = Path(output)
                self._producer()(self.root, output_path, tool_version="test")
                path = output_path / name
                state = json.loads(path.read_text(encoding="utf-8"))
                state["status"] = "tampered"
                path.write_text(json.dumps(state, indent=2, sort_keys=True) + "\n", encoding="utf-8")
                with self.assertRaises(SnapshotValidationError):
                    verify_snapshot(output_path)

    def test_verification_rejects_noncanonical_manifest_and_scan_object_ids(self) -> None:
        """Rejects 41- and 63-character SHA-like values in manifests and scan records."""
        from measure.business_operations_graph_baseline_snapshot import (
            SnapshotValidationError,
            produce_scan_bracketed_snapshot,
            verify_snapshot,
        )

        (self.root / ".git/info/exclude").write_text("graph.db\n", encoding="utf-8")

        def scan_runner(repo: Path) -> dict[str, object]:
            """Writes deterministic ignored graph bytes for scan-record verification."""
            (repo / "graph.db").write_bytes(b"graph output\n")
            return {
                "command": "repo-graph scan . ./graph.db",
                "exitCode": 0,
                "graphPath": "graph.db",
                "stderr": "",
                "stdout": "scanned",
            }

        for length in (41, 63):
            with self.subTest(artifact="manifest", length=length), tempfile.TemporaryDirectory() as output:
                output_path = Path(output)
                self._producer()(self.root, output_path, tool_version="test")
                manifest_path = output_path / "snapshot.manifest.json"
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                manifest["baselineHead"] = "a" * length
                manifest["preHead"] = "a" * length
                manifest_path.write_text(
                    json.dumps(manifest, indent=2, sort_keys=True) + "\n",
                    encoding="utf-8",
                )
                with self.assertRaisesRegex(SnapshotValidationError, "manifest HEAD interval is invalid"):
                    verify_snapshot(output_path)

            with self.subTest(artifact="scan", length=length), tempfile.TemporaryDirectory() as output:
                output_path = Path(output)
                produce_scan_bracketed_snapshot(
                    self.root, output_path, tool_version="test", scan_runner=scan_runner
                )
                scan_path = output_path / "snapshot.scan.json"
                scan = json.loads(scan_path.read_text(encoding="utf-8"))
                scan["preHead"] = "a" * length
                scan_path.write_text(
                    json.dumps(scan, indent=2, sort_keys=True) + "\n",
                    encoding="utf-8",
                )
                with self.assertRaisesRegex(SnapshotValidationError, "scan artifact HEAD interval is invalid"):
                    verify_snapshot(output_path)

    def test_verification_rejects_tampered_r0_archive_and_manifest(self) -> None:
        """Fails closed when either R0 projection artifact changes after capture."""
        from measure.business_operations_graph_baseline_snapshot import (
            SnapshotValidationError,
            verify_snapshot,
        )

        for name in ("snapshot.r0.archive.json", "snapshot.r0.manifest.json"):
            with self.subTest(name=name), tempfile.TemporaryDirectory() as output:
                output_path = Path(output)
                self._producer()(self.root, output_path, tool_version="test")
                path = output_path / name
                value = json.loads(path.read_text(encoding="utf-8"))
                if name.endswith("archive.json"):
                    value["entries"][0]["size"] = 0
                else:
                    value["branch"] = "tampered"
                path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")
                with self.assertRaises(SnapshotValidationError):
                    verify_snapshot(output_path)

    def test_publish_scan_snapshot_keeps_a_durable_verified_bundle(self) -> None:
        """Publishes an external scan bundle into the track after stable-window verification."""
        from measure.business_operations_graph_baseline_snapshot import (
            produce_scan_bracketed_snapshot,
            publish_scan_bracketed_snapshot,
            verify_scan_bracketed_snapshot,
        )

        (self.root / ".git/info/exclude").write_text("graph.db\n", encoding="utf-8")

        def scan_runner(repo: Path) -> dict[str, object]:
            (repo / "graph.db").write_bytes(b"graph output\n")
            return {
                "command": "repo-graph scan . ./graph.db",
                "exitCode": 0,
                "graphPath": "graph.db",
                "stderr": "",
                "stdout": "scanned",
            }

        source = Path(self.temporary.name) / "external-snapshot"
        produce_scan_bracketed_snapshot(
            self.root, source, tool_version="test", scan_runner=scan_runner
        )
        published = publish_scan_bracketed_snapshot(
            self.root, source, "measure/tracks/r1/evidence"
        )
        shutil.rmtree(source)
        self.assertEqual(published["path"], "measure/tracks/r1/evidence")
        self.assertEqual(
            verify_scan_bracketed_snapshot(self.root / published["path"])["src/app.ts"],
            b"export const app = 1;\n",
        )

    def test_concurrent_drift_aborts_before_publishing_artifacts(self) -> None:
        """Aborts when source bytes or status change in the coordinated window."""
        from measure.business_operations_graph_baseline_snapshot import (
            SnapshotDriftError,
        )

        output = Path(self.temporary.name) / "drift-output"

        def drift() -> None:
            """Mutates a source file at the producer's post-capture test seam."""
            self._write("src/app.ts", "export const app = 99;\n")

        with self.assertRaises(SnapshotDriftError) as caught:
            self._producer()(
                self.root,
                output,
                tool_version="test",
                before_post_check=drift,
            )
        self.assertIn("src/app.ts", str(caught.exception))
        self.assertFalse(output.exists())

    def test_already_dirty_content_drift_aborts_with_unchanged_git_status(self) -> None:
        """Hashes bytes, not only status, for an input already marked modified."""
        from measure.business_operations_graph_baseline_snapshot import SnapshotDriftError

        self._write("src/app.ts", "export const app = 2;\n")
        status_before = self._git("status", "--short").decode()

        def drift() -> None:
            self._write("src/app.ts", "export const app = 3;\n")

        output = Path(self.temporary.name) / "already-dirty-output"
        with self.assertRaises(SnapshotDriftError):
            self._producer()(
                self.root,
                output,
                tool_version="test",
                before_post_check=drift,
            )
        self.assertEqual(status_before, self._git("status", "--short").decode())
        self.assertFalse(output.exists())

    def test_non_master_and_non_root_scanner_inputs_are_rejected(self) -> None:
        """Enforces the actual symbolic branch and sole scanner worktree root."""
        from measure.business_operations_graph_baseline_snapshot import SnapshotError

        self._git("switch", "-c", "feature")
        with tempfile.TemporaryDirectory() as output:
            with self.assertRaises(SnapshotError):
                self._producer()(self.root, output, tool_version="test")
        self._git("switch", "master")
        with tempfile.TemporaryDirectory() as output:
            with self.assertRaises(SnapshotError):
                self._producer()(
                    self.root,
                    output,
                    tool_version="test",
                    worktree_root=self.root / "src",
                )

    def test_second_physical_worktree_is_rejected(self) -> None:
        """Rejects snapshots while another physical Git worktree exists."""
        from measure.business_operations_graph_baseline_snapshot import SnapshotError

        second = Path(self.temporary.name) / "second-worktree"
        self._git("worktree", "add", "-b", "second", str(second))
        try:
            with tempfile.TemporaryDirectory() as output:
                with self.assertRaises(SnapshotError):
                    self._producer()(self.root, output, tool_version="test")
        finally:
            self._git("worktree", "remove", "--force", str(second))

    def test_executable_mode_is_derived_from_lstat(self) -> None:
        """Preserves executable metadata instead of fabricating mode 100644."""
        executable = self.root / "src/app.ts"
        os.chmod(executable, 0o755)
        with tempfile.TemporaryDirectory() as output:
            result = self._producer()(self.root, output, tool_version="test")
        entry = next(item for item in result.manifest["entries"] if item["path"] == "src/app.ts")
        r0_entry = next(item for item in result.r0_manifest["entries"] if item["path"] == "src/app.ts")
        self.assertEqual(entry["mode"], "100755")
        self.assertEqual(r0_entry["mode"], "100755")

    def test_output_is_deterministic_and_source_snapshot_matches_r0_shape(self) -> None:
        """Produces repeatable bytes and the accepted R0 sourceSnapshot projection."""
        from measure.business_operations_graph_baseline_snapshot import (
            R0_SOURCE_SNAPSHOT_KEYS,
        )

        first = Path(self.temporary.name) / "first"
        second = Path(self.temporary.name) / "second"
        first_result = self._producer()(self.root, first, tool_version="test")
        second_result = self._producer()(self.root, second, tool_version="test")
        for name in (
            "snapshot.archive.json", "snapshot.manifest.json",
            "snapshot.pre-state.json", "snapshot.post-state.json",
            "snapshot.r0.archive.json", "snapshot.r0.manifest.json",
            "snapshot.r0.pre-state.json", "snapshot.r0.post-state.json",
        ):
            self.assertEqual((first / name).read_bytes(), (second / name).read_bytes(), name)
        self.assertEqual(set(first_result.source_snapshot), R0_SOURCE_SNAPSHOT_KEYS)
        self.assertEqual(first_result.source_snapshot, second_result.source_snapshot)

    def test_produced_projection_is_accepted_end_to_end_by_r0_validator(self) -> None:
        """Feeds producer-written v1 artifacts through the unchanged R0 candidate validator."""
        import measure.business_operations_graph_baseline_snapshot as snapshot_module
        from measure.business_operations_graph_baseline_validation import validate_candidate

        frozen_archive = json.loads(
            (FIXTURE_ROOT / "snapshot-clean-v1.archive.json").read_text(encoding="utf-8")
        )
        integration_root = Path(self.temporary.name) / "integration-repo"
        integration_root.mkdir()
        subprocess.run(["git", "init", "-b", "master"], cwd=integration_root, check=True, capture_output=True)
        subprocess.run(["git", "config", "user.email", "snapshot@example.test"], cwd=integration_root, check=True)
        subprocess.run(["git", "config", "user.name", "Snapshot Test"], cwd=integration_root, check=True)
        tracked: list[str] = []
        for entry in frozen_archive["entries"]:
            path = integration_root / entry["path"]
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(base64.b64decode(entry["contentBase64"], validate=True))
            if entry["state"] == "tracked":
                tracked.append(entry["path"])
        subprocess.run(["git", "add", "--", *tracked], cwd=integration_root, check=True)
        subprocess.run(["git", "commit", "-m", "frozen inputs"], cwd=integration_root, check=True, capture_output=True)

        original_git_text = snapshot_module._git_text

        def frozen_head(repo: Path, *args: str) -> str:
            if args == ("rev-parse", "HEAD"):
                return "3ff9b734a9e5a69f777108827b569e4f20a5ceb8\n"
            return original_git_text(repo, *args)

        produced_root = Path(self.temporary.name) / "produced"
        with mock.patch.object(snapshot_module, "_git_text", side_effect=frozen_head):
            produced = snapshot_module.produce_snapshot(
                integration_root,
                produced_root,
                tool_version="0.1.0",
            )
        frozen_paths = {entry["path"] for entry in frozen_archive["entries"]}
        produced_paths = {entry["path"] for entry in produced.r0_archive["entries"]}
        self.assertEqual(produced_paths, frozen_paths)

        validation_root = Path(self.temporary.name) / "validation-v1"
        shutil.copytree(FIXTURE_ROOT, validation_root)
        for reference in (
            produced.source_snapshot["archive"],
            produced.source_snapshot["manifest"],
            produced.source_snapshot["preScan"]["stateArtifact"],
            produced.source_snapshot["postScan"]["stateArtifact"],
        ):
            shutil.copy2(produced_root / reference["path"], validation_root / reference["path"])

        envelopes = json.loads((FIXTURE_ROOT / "candidate-envelopes-v1.json").read_text())
        candidate = copy.deepcopy(envelopes["candidates"]["clean"])
        candidate["sourceSnapshot"] = produced.source_snapshot

        graph = json.loads((validation_root / candidate["graph"]["path"]).read_text())
        graph["sourceManifestSha256"] = produced.source_snapshot["manifest"]["sha256"]
        candidate["graph"] = self._json_ref(validation_root, "integration-graph.json", graph)

        commands = json.loads((validation_root / candidate["requiredCommands"]["artifact"]["path"]).read_text())
        for record in commands["records"]:
            record["snapshotManifestSha256"] = produced.source_snapshot["manifest"]["sha256"]
            body = {key: value for key, value in record.items() if key != "recordSha256"}
            record["recordSha256"] = hashlib.sha256(
                json.dumps(body, sort_keys=True, separators=(",", ":")).encode()
            ).hexdigest()
        candidate["requiredCommands"]["artifact"] = self._json_ref(
            validation_root, "integration-commands.json", commands
        )

        candidate.pop("lineage")
        canonical = lambda value: json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
        candidate_sha = hashlib.sha256(canonical(candidate)).hexdigest()
        artifacts = [
            candidate["sourceSnapshot"]["archive"], candidate["sourceSnapshot"]["manifest"],
            candidate["sourceSnapshot"]["preScan"]["stateArtifact"],
            candidate["sourceSnapshot"]["postScan"]["stateArtifact"], candidate["graph"],
            candidate["requiredCommands"]["artifact"], candidate["parentEvidence"],
        ]
        gates = [
            {"name": "small_company_admin_privileges_20260722:Phase-S1", "state": "BLOCKED_UNTIL_HASH_BOUND_HANDOFF"},
            {"name": "customer_licensing_crm_20260722:contract-schema-red", "state": "BLOCKED_UNTIL_HASH_BOUND_HANDOFF"},
        ]
        candidate_manifest_ref = self._json_ref(validation_root, "integration-candidate.json", {
            "artifacts": artifacts, "candidateId": candidate["candidateId"],
            "candidateSha256": candidate_sha, "schemaVersion": 1, "successorGates": gates,
        })
        producer_ref = self._json_ref(validation_root, "integration-producer.json", {
            "candidateManifest": candidate_manifest_ref, "candidateSha256": candidate_sha,
            "identity": "producer@example.test", "role": "producer", "schemaVersion": 1,
            "state": "CANDIDATE_PUBLISHED", "timestamp": "2026-07-30T00:00:00Z",
        })
        ledger_ref = self._json_ref(validation_root, "integration-ledger.json", {
            "artifacts": [*artifacts, candidate_manifest_ref, producer_ref],
            "candidateSha256": candidate_sha, "schemaVersion": 1,
            "successorGates": [{**gate, "recordSha256": hashlib.sha256(canonical(gate)).hexdigest()} for gate in gates],
        })
        reviewer_ref = self._json_ref(validation_root, "integration-reviewer.json", {
            "candidateManifest": candidate_manifest_ref, "candidateSha256": candidate_sha,
            "decision": "ACCEPT", "findings": [], "identity": "reviewer@example.test",
            "producerReceipt": producer_ref, "recomputedArtifactLedger": ledger_ref,
            "role": "independent-reviewer", "schemaVersion": 1,
            "severityGate": "Critical/High forces REJECT", "state": "FINAL",
            "successorGates": "blocked-until-handoff", "timestamp": "2026-07-30T01:00:00Z",
        })
        candidate["lineage"] = {
            "candidateManifest": candidate_manifest_ref,
            "producerReceipt": producer_ref,
            "recomputedArtifactLedger": ledger_ref,
            "reviewerReceipt": reviewer_ref,
        }
        result = validate_candidate(candidate, fixture_root=validation_root)
        self.assertEqual(result, {"decision": "ACCEPT", "reasons": []})

    def test_accepted_r0_validator_remains_green(self) -> None:
        """Keeps the accepted R0 validator contract executable and unchanged."""
        from measure.business_operations_graph_baseline_validation import (
            CANDIDATE_SCHEMA_VERSION,
            validate_candidate,
        )

        envelopes = json.loads(
            (FIXTURE_ROOT / "candidate-envelopes-v1.json").read_text(encoding="utf-8")
        )
        for candidate in envelopes["candidates"].values():
            result = validate_candidate(candidate, fixture_root=FIXTURE_ROOT)
            self.assertEqual(result["decision"], "ACCEPT")
        self.assertEqual(CANDIDATE_SCHEMA_VERSION, 1)


if __name__ == "__main__":
    unittest.main()
