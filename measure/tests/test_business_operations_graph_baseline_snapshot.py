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
        self._write("pnpm-workspace.yaml", "packages:\n  - packages/*\n")
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

    def test_duplicate_and_traversal_archive_paths_are_rejected(self) -> None:
        """Rejects duplicate, absolute, traversal, and alias archive paths."""
        from measure.business_operations_graph_baseline_snapshot import (
            SnapshotValidationError,
            replay_archive,
        )

        content = base64.b64encode(b"source").decode()
        for paths in (("src/a.ts", "src/a.ts"), ("../a.ts",), ("a/../a.ts",), ("/a.ts",)):
            archive = {
                "archiveKind": "source-snapshot",
                "encoding": "base64-per-entry",
                "schemaVersion": 2,
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

    def test_concurrent_drift_aborts_before_publishing_artifacts(self) -> None:
        """Aborts when source bytes or status change in the coordinated window."""
        from measure.business_operations_graph_baseline_snapshot import (
            SnapshotDriftError,
        )

        output = Path(self.temporary.name) / "drift-output"

        def drift() -> None:
            """Mutates a source file at the producer's post-capture test seam."""
            self._write("src/app.ts", "export const app = 99;\n")

        with self.assertRaises(SnapshotDriftError):
            self._producer()(
                self.root,
                output,
                tool_version="test",
                before_post_check=drift,
            )
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
