"""Subprocess integration tests for the Phase 4 supervisor completion gate."""

from __future__ import annotations

import gzip
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from typing import Any

from measure.evidence_integrity_gates.supervisor_gate import (
    _validate_owner_provenance,
    _validate_review_provenance,
    validate_supervisor_completion,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
GATE_TRACK = "measure_apk_evidence_integrity_gates_20260712"
OWNER_DELEGATION_TEXT = (
    "For this project, YOU are the orchestrator, therefore YOU are acting as the owner."
)


class FixtureTrustedResolver:
    """Resolves test sessions from an explicit trusted-export mapping."""

    def __init__(self, exports: dict[str, bytes]) -> None:
        """Creates a resolver over immutable fixture exports.

        @param exports Session IDs mapped to trusted provider bytes.
        """
        self.exports = dict(exports)

    def resolve(self, session_id: str) -> bytes:
        """Returns trusted export bytes for a named fixture session.

        @param session_id Session to resolve.
        @returns Exact trusted provider export bytes.
        @throws RuntimeError When the session is unavailable.
        """
        if session_id not in self.exports:
            raise RuntimeError("trusted session unavailable")
        return self.exports[session_id]


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
        self._write_bytes("measure/gate.bin", b"\xff\x00gate\n")
        self._git("init", "-q")
        self._git("config", "user.email", "test@example.com")
        self._git("config", "user.name", "Test")
        self._git("add", ".")
        self._git("commit", "-qm", "gate implementation")
        gate_commit = self._git("rev-parse", "HEAD").stdout.strip()
        gate_paths = ["measure/automation-supervisor.py", "measure/gate.py", "measure/gate.bin"]
        gate_paths.extend(
            str(path.relative_to(self.repo))
            for path in sorted((self.repo / "measure/evidence_integrity_gates").glob("*.py"))
        )
        gate_files = {path: self._sha(self.repo / path) for path in gate_paths}
        candidate = {
            "schema_version": "evidence-integrity.supervisor.v1",
            "gate_version": "phase4-v1",
            "status": "candidate",
            "consumable": False,
            "revoked": False,
            "implementation_commit": gate_commit,
            "source_base_commit": gate_commit,
            "files": gate_files,
            "independent_review": {"status": "pending"},
            "owner_approval": {"status": "pending"},
            "accepted_manifest_published": False,
        }
        candidate_path = "measure/candidate.json"
        self._write(candidate_path, json.dumps(candidate, sort_keys=True) + "\n")
        candidate_hash = self._sha(self.repo / candidate_path)
        review_prompt = json.dumps({
            "candidate_manifest_sha256": candidate_hash,
            "gate_version": "phase4-v1",
            "implementation_commit": gate_commit,
            "source_base_commit": gate_commit,
            "task": "independent-adversarial-review",
        }, sort_keys=True, separators=(",", ":"))
        review_result = {
            "candidate_manifest_sha256": candidate_hash,
            "review_status": "pass",
            "unresolved_findings": {"critical": [], "high": [], "medium": []},
        }
        review_final = json.dumps(review_result, sort_keys=True, separators=(",", ":"))
        review_raw = self._raw_export(
            session_id="ses_review",
            parent_session_id="ses_root",
            agent="independent-reviewer",
            prompt_id="msg_review_prompt",
            prompt=review_prompt,
            prompt_created_ms=20,
            final_id="msg_review_final",
            final_text=review_final,
            completed_ms=30,
        )
        review_export_path, review_export_hash = self._write_export(review_raw)
        review = {
            **review_result,
            "revoked": False,
            "fresh_context_provenance": {
                "raw_export_path": review_export_path,
                "raw_export_sha256": review_export_hash,
                "stored_export_sha256": self._sha(self.repo / review_export_path),
                "session_id": "ses_review",
                "parent_session_id": "ses_root",
                "agent": "independent-reviewer",
                "role": "adversarial-reviewer",
                "prompt_message_id": "msg_review_prompt",
                "prompt_text_sha256": self._sha_bytes(review_prompt.encode()),
                "final_response_message_id": "msg_review_final",
                "final_response_text_sha256": self._sha_bytes(review_final.encode()),
                "started_ms": 20,
                "completed_ms": 30,
                "isolation_proof": "raw-history-begins-with-fresh-prompt",
            },
        }
        review_path = "measure/review.json"
        self._write(review_path, json.dumps(review, sort_keys=True) + "\n")
        review_hash = self._sha(self.repo / review_path)
        approval_prompt = json.dumps({
            "candidate_manifest_sha256": candidate_hash,
            "decision": "approve",
            "gate_commit": gate_commit,
            "gate_version": "phase4-v1",
            "review_report_sha256": review_hash,
        }, sort_keys=True, separators=(",", ":"))
        approval_raw = self._raw_export(
            session_id="ses_approval",
            parent_session_id="ses_root",
            agent="approval-publisher",
            prompt_id="msg_approval_prompt",
            prompt=approval_prompt,
            prompt_created_ms=50,
            final_id="msg_approval_final",
            final_text="Published",
            completed_ms=60,
        )
        approval_export_path, approval_export_hash = self._write_export(approval_raw)
        root_raw = self._root_export(approval_prompt)
        root_export_path, root_export_hash = self._write_export(root_raw)
        self.trusted_exports = {
            "ses_review": review_raw,
            "ses_approval": approval_raw,
            "ses_root": root_raw,
        }
        approval = {
            "decision": "approve",
            "revoked": False,
            "candidate_manifest_hash": candidate_hash,
            "review_report_hash": review_hash,
            "gate_version": "phase4-v1",
            "gate_commit": gate_commit,
            "approval_event": {
                "raw_export_path": approval_export_path,
                "raw_export_sha256": approval_export_hash,
                "stored_export_sha256": self._sha(self.repo / approval_export_path),
                "session_id": "ses_approval",
                "parent_session_id": "ses_root",
                "agent": "approval-publisher",
                "role": "product-owner",
                "prompt_message_id": "msg_approval_prompt",
                "prompt_text_sha256": self._sha_bytes(approval_prompt.encode()),
                "prompt_created_ms": 50,
            },
            "root_owner_delegation": {
                "raw_export_path": root_export_path,
                "raw_export_sha256": root_export_hash,
                "stored_export_sha256": self._sha(self.repo / root_export_path),
                "session_id": "ses_root",
                "agent": "root-agent",
                "owner_designation_event": {
                    "message_id": "msg_owner_designation",
                    "message_text_sha256": self._sha_bytes(OWNER_DELEGATION_TEXT.encode()),
                    "created_ms": 10,
                    "designated_role": "product-owner",
                    "delegate_agent": "approval-publisher",
                },
                "approval_publication_event": {
                    "message_id": "msg_publication",
                    "task_call_id": "call_approval",
                    "delegated_session_id": "ses_approval",
                    "delegated_prompt_sha256": self._sha_bytes(approval_prompt.encode()),
                    "created_ms": 40,
                },
            },
        }
        approval_path = "measure/approval.json"
        self._write(approval_path, json.dumps(approval, sort_keys=True) + "\n")
        approval_hash = self._sha(self.repo / approval_path)
        manifest = {
            "schema_version": "evidence-integrity.supervisor.v1",
            "gate_version": "phase4-v1",
            "status": "accepted",
            "revoked": False,
            "gate_commit": gate_commit,
            "files": gate_files,
            "candidate_manifest_path": candidate_path,
            "candidate_manifest_hash": candidate_hash,
            "review_report_path": review_path,
            "review_hash": review_hash,
            "owner_approval_path": approval_path,
            "owner_approval_hash": approval_hash,
            "approval_consumption": {
                "event_id": "msg_approval_prompt",
                "candidate_manifest_hash": candidate_hash,
                "review_report_hash": review_hash,
                "gate_commit": gate_commit,
                "gate_version": "phase4-v1",
            },
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

    def tearDown(self) -> None:
        """Removes the isolated repository."""
        self.temporary_directory.cleanup()

    def _write(self, relative_path: str, content: str) -> None:
        """Writes one fixture file below the isolated repository."""
        path = self.repo / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def _write_bytes(self, relative_path: str, content: bytes) -> None:
        """Writes exact fixture bytes below the isolated repository."""
        path = self.repo / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)

    def _git(self, *arguments: str) -> subprocess.CompletedProcess[str]:
        """Runs Git in the isolated repository and requires success."""
        return subprocess.run(["git", *arguments], cwd=self.repo, text=True, capture_output=True, check=True)

    def _sha(self, path: Path) -> str:
        """Hashes one fixture file."""
        return hashlib.sha256(path.read_bytes()).hexdigest()

    def _sha_bytes(self, content: bytes) -> str:
        """Hashes exact fixture bytes."""
        return hashlib.sha256(content).hexdigest()

    def _write_export(self, raw: bytes) -> tuple[str, str]:
        """Writes one deterministic content-addressed compressed raw export."""
        raw_hash = self._sha_bytes(raw)
        relative_path = f"measure/acceptance/test/exports/{raw_hash}.json.gz"
        self._write_bytes(relative_path, gzip.compress(raw, mtime=0))
        return relative_path, raw_hash

    def _raw_export(
        self,
        *,
        session_id: str,
        parent_session_id: str,
        agent: str,
        prompt_id: str,
        prompt: str,
        prompt_created_ms: int,
        final_id: str,
        final_text: str,
        completed_ms: int,
    ) -> bytes:
        """Builds a minimal provider export with exact IDs, text, and chronology."""
        return json.dumps({
            "info": {"id": session_id, "parentID": parent_session_id, "agent": agent},
            "messages": [
                {
                    "info": {"id": prompt_id, "sessionID": session_id, "role": "user", "time": {"created": prompt_created_ms}},
                    "parts": [{"type": "text", "text": prompt}],
                },
                {
                    "info": {
                        "id": final_id,
                        "sessionID": session_id,
                        "parentID": prompt_id,
                        "role": "assistant",
                        "agent": agent,
                        "time": {"created": prompt_created_ms + 1, "completed": completed_ms},
                    },
                    "parts": [{"type": "text", "text": final_text}],
                },
            ],
        }, sort_keys=True).encode()

    def _root_export(self, delegated_prompt: str) -> bytes:
        """Builds root owner-designation and approval-publication evidence."""
        return json.dumps({
            "info": {"id": "ses_root", "agent": "root-agent"},
            "messages": [
                {
                    "info": {"id": "msg_owner_designation", "sessionID": "ses_root", "role": "user", "time": {"created": 10}},
                    "parts": [{"type": "text", "text": OWNER_DELEGATION_TEXT}],
                },
                {
                    "info": {
                        "id": "msg_publication", "sessionID": "ses_root", "parentID": "msg_owner_designation",
                        "role": "assistant", "agent": "root-agent", "time": {"created": 40, "completed": 41},
                    },
                    "parts": [{
                        "type": "tool", "tool": "task", "callID": "call_approval",
                        "state": {
                            "status": "completed",
                            "input": {"prompt": delegated_prompt},
                            "metadata": {"sessionId": "ses_approval", "parentSessionId": "ses_root"},
                        },
                    }],
                },
            ],
        }, sort_keys=True).encode()

    def _write_generated_facts(self) -> None:
        """Writes generated facts bound to the current source revision."""
        revision = self._git("rev-parse", "HEAD").stdout.strip()
        self._write(
            "measure/generated/architecture.json",
            json.dumps({"schemaVersion": "measure.architecture.v1", "sourceRevision": revision}) + "\n",
        )

    def _replace_fixture(self) -> None:
        """Disposes the current repository and creates a fresh baseline fixture."""
        self.temporary_directory.cleanup()
        self.setUp()

    def _run_gate(self) -> tuple[subprocess.CompletedProcess[str], dict[str, Any]]:
        """Runs the completion gate with an explicit trusted session resolver."""
        report = validate_supervisor_completion(
            self.repo,
            "product_track",
            trusted_resolver=FixtureTrustedResolver(self.trusted_exports),
        )
        result = SimpleNamespace(returncode=0 if report["ok"] else 1, stderr="")
        return result, report

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

    def test_007_supervisor_dry_run_fails_closed_without_live_provider_session(self) -> None:
        """Makes production dry-run reject locally valid snapshots when live export fails."""
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
        self.assertNotEqual(result.returncode, 0, result.stderr)
        self.assertIn("Evidence gate status: BLOCKED", result.stdout)

    def test_008_manifest_requires_runtime_gate_files_and_bound_acceptance_artifacts(self) -> None:
        """Rejects manifests that omit the runtime gate or forge review and approval hashes."""
        manifest_path = self.repo / "measure/evidence-integrity-accepted-gate.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest["files"] = {"measure/gate.py": manifest["files"]["measure/gate.py"]}
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        self._assert_blocked("ACCEPTED_GATE_MANIFEST_INVALID")

        self._replace_fixture()
        (self.repo / "measure/review.json").write_text('{"status":"pass"}\n', encoding="utf-8")
        self._assert_blocked("ACCEPTED_GATE_MANIFEST_INVALID")

    def test_009_symlinks_path_traversal_and_dirty_worktrees_fail_closed(self) -> None:
        """Rejects filesystem indirection, unsafe manifest paths, and uncommitted source."""
        gate_path = self.repo / "measure/gate.py"
        external = self.repo.parent / f"{self.repo.name}-external-gate.py"
        external.write_bytes(gate_path.read_bytes())
        gate_path.unlink()
        gate_path.symlink_to(external)
        self._assert_blocked("GATE_FILE_HASH_MISMATCH")
        external.unlink()

        self._replace_fixture()
        manifest_path = self.repo / "measure/evidence-integrity-accepted-gate.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest["files"]["../outside"] = "0" * 64
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        self._assert_blocked("ACCEPTED_GATE_MANIFEST_INVALID")

        self._replace_fixture()
        self._write("product.txt", "dirty\n")
        self._assert_blocked("DIRTY_WORKTREE")

    def test_010_dependency_cycles_and_marker_evasion_do_not_pass(self) -> None:
        """Rejects a cyclic dependency branch and plans with hidden or absent work markers."""
        metadata_path = self.repo / "measure/tracks/product_track/metadata.json"
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        metadata["depends_on"] = ["cycle_a", GATE_TRACK]
        metadata_path.write_text(json.dumps(metadata), encoding="utf-8")
        self._write("measure/tracks/cycle_a/metadata.json", json.dumps({"depends_on": ["product_track"]}))
        self._assert_blocked("CANONICAL_DEPENDENCY_REQUIRED")

        self._replace_fixture()
        self._write("measure/tracks/product_track/plan.md", "# Plan\n\n  - [~] hidden task\n")
        self._assert_blocked("INCOMPLETE_TASK")
        self._write("measure/tracks/product_track/plan.md", "# Plan without tasks\n")
        self._assert_blocked("INCOMPLETE_TASK")

    def test_011_raw_export_tamper_forgery_replay_and_early_approval_fail(self) -> None:
        """Rejects tampered snapshots, forged identity, replay drift, and approval before review."""
        manifest_path = self.repo / "measure/evidence-integrity-accepted-gate.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        approval_path = self.repo / manifest["owner_approval_path"]
        approval = json.loads(approval_path.read_text(encoding="utf-8"))

        export_path = self.repo / approval["approval_event"]["raw_export_path"]
        export_path.write_bytes(export_path.read_bytes() + b"tamper")
        self._assert_blocked("ACCEPTED_GATE_MANIFEST_INVALID")

        self._replace_fixture()
        manifest_path = self.repo / "measure/evidence-integrity-accepted-gate.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        approval_path = self.repo / manifest["owner_approval_path"]
        approval = json.loads(approval_path.read_text(encoding="utf-8"))
        approval["approval_event"]["session_id"] = "ses_forged"
        approval_path.write_text(json.dumps(approval), encoding="utf-8")
        manifest["owner_approval_hash"] = self._sha(approval_path)
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        self._assert_blocked("ACCEPTED_GATE_MANIFEST_INVALID")

        self._replace_fixture()
        manifest_path = self.repo / "measure/evidence-integrity-accepted-gate.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest["approval_consumption"]["event_id"] = "msg_replayed"
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        self._assert_blocked("ACCEPTED_GATE_MANIFEST_INVALID")

        self._replace_fixture()
        manifest_path = self.repo / "measure/evidence-integrity-accepted-gate.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        approval_path = self.repo / manifest["owner_approval_path"]
        approval = json.loads(approval_path.read_text(encoding="utf-8"))
        approval["approval_event"]["prompt_created_ms"] = 25
        approval_path.write_text(json.dumps(approval), encoding="utf-8")
        manifest["owner_approval_hash"] = self._sha(approval_path)
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        self._assert_blocked("ACCEPTED_GATE_MANIFEST_INVALID")

    def test_012_inherited_reviewer_message_without_fork_attestation_fails(self) -> None:
        """Rejects an omission-based isolation proof when a pre-prompt turn exists."""
        manifest_path = self.repo / "measure/evidence-integrity-accepted-gate.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        review_path = self.repo / manifest["review_report_path"]
        review = json.loads(review_path.read_text(encoding="utf-8"))
        export_path = self.repo / review["fresh_context_provenance"]["raw_export_path"]
        raw = json.loads(gzip.decompress(export_path.read_bytes()))
        raw["messages"].insert(0, {
            "info": {"id": "msg_inherited", "sessionID": "ses_review", "role": "user", "time": {"created": 19}},
            "parts": [{"type": "text", "text": "inherited context"}],
        })
        mutated = json.dumps(raw, sort_keys=True).encode()
        mutated_path, mutated_hash = self._write_export(mutated)
        review["fresh_context_provenance"]["raw_export_path"] = mutated_path
        review["fresh_context_provenance"]["raw_export_sha256"] = mutated_hash
        review_path.write_text(json.dumps(review), encoding="utf-8")
        manifest["review_hash"] = self._sha(review_path)
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        self._assert_blocked("ACCEPTED_GATE_MANIFEST_INVALID")

    def test_013_review_prompt_and_final_response_bind_exact_candidate(self) -> None:
        """Rejects stale review exports replayed across candidate or gate revisions."""
        manifest = json.loads(
            (self.repo / "measure/evidence-integrity-accepted-gate.json").read_text()
        )
        candidate = json.loads((self.repo / manifest["candidate_manifest_path"]).read_text())
        review = json.loads((self.repo / manifest["review_report_path"]).read_text())
        valid, _ = _validate_review_provenance(
            self.repo,
            review,
            candidate_hash=manifest["candidate_manifest_hash"],
            candidate=candidate,
            gate_commit=manifest["gate_commit"],
            gate_version=manifest["gate_version"],
            trusted_resolver=FixtureTrustedResolver(self.trusted_exports),
        )
        self.assertTrue(valid)
        replayed, _ = _validate_review_provenance(
            self.repo,
            review,
            candidate_hash="f" * 64,
            candidate=candidate,
            gate_commit=manifest["gate_commit"],
            gate_version=manifest["gate_version"],
            trusted_resolver=FixtureTrustedResolver(self.trusted_exports),
        )
        self.assertFalse(replayed)

    def test_014_recompressed_export_and_explicit_fork_with_history_fail(self) -> None:
        """Binds stored gzip bytes and rejects inherited turns despite a fork-none claim."""
        manifest = json.loads(
            (self.repo / "measure/evidence-integrity-accepted-gate.json").read_text()
        )
        candidate = json.loads((self.repo / manifest["candidate_manifest_path"]).read_text())
        review_path = self.repo / manifest["review_report_path"]
        review = json.loads(review_path.read_text())
        provenance = review["fresh_context_provenance"]
        export_path = self.repo / provenance["raw_export_path"]
        raw = gzip.decompress(export_path.read_bytes())
        export_path.write_bytes(gzip.compress(raw, mtime=123))
        valid, _ = _validate_review_provenance(
            self.repo,
            review,
            candidate_hash=manifest["candidate_manifest_hash"],
            candidate=candidate,
            gate_commit=manifest["gate_commit"],
            gate_version=manifest["gate_version"],
        )
        self.assertFalse(valid)

        raw_document = json.loads(raw)
        raw_document["info"]["fork_turns"] = "none"
        raw_document["messages"].insert(0, {
            "info": {
                "id": "msg_inherited",
                "sessionID": "ses_review",
                "role": "user",
                "time": {"created": 19},
            },
            "parts": [{"type": "text", "text": "inherited"}],
        })
        inherited_raw = json.dumps(raw_document, sort_keys=True).encode()
        inherited_path, inherited_hash = self._write_export(inherited_raw)
        provenance["raw_export_path"] = inherited_path
        provenance["raw_export_sha256"] = inherited_hash
        provenance["stored_export_sha256"] = self._sha(self.repo / inherited_path)
        valid, _ = _validate_review_provenance(
            self.repo,
            review,
            candidate_hash=manifest["candidate_manifest_hash"],
            candidate=candidate,
            gate_commit=manifest["gate_commit"],
            gate_version=manifest["gate_version"],
        )
        self.assertFalse(valid)

    def test_015_revoked_review_or_candidate_fails_closed(self) -> None:
        """Prevents revocation fields from being ignored after acceptance publication."""
        manifest_path = self.repo / "measure/evidence-integrity-accepted-gate.json"
        manifest = json.loads(manifest_path.read_text())
        review_path = self.repo / manifest["review_report_path"]
        review = json.loads(review_path.read_text())
        review["revoked"] = True
        review_path.write_text(json.dumps(review))
        manifest["review_hash"] = self._sha(review_path)
        manifest_path.write_text(json.dumps(manifest))
        self._assert_blocked("ACCEPTED_GATE_MANIFEST_INVALID")

        self._replace_fixture()
        manifest_path = self.repo / "measure/evidence-integrity-accepted-gate.json"
        manifest = json.loads(manifest_path.read_text())
        candidate_path = self.repo / manifest["candidate_manifest_path"]
        candidate = json.loads(candidate_path.read_text())
        candidate["revoked"] = True
        candidate_path.write_text(json.dumps(candidate))
        manifest["candidate_manifest_hash"] = self._sha(candidate_path)
        manifest_path.write_text(json.dumps(manifest))
        self._assert_blocked("ACCEPTED_GATE_MANIFEST_INVALID")

    def test_016_forged_reviewer_agent_message_parent_role_and_prompt_fail(self) -> None:
        """Rejects independently rehashed identity and exact-prompt forgeries."""
        mutations = ("agent", "message", "parent", "role", "prompt")
        for index, mutation in enumerate(mutations):
            with self.subTest(mutation=mutation):
                if index:
                    self._replace_fixture()
                manifest = json.loads(
                    (self.repo / "measure/evidence-integrity-accepted-gate.json").read_text()
                )
                review_path = self.repo / manifest["review_report_path"]
                review = json.loads(review_path.read_text())
                provenance = review["fresh_context_provenance"]
                raw = json.loads(gzip.decompress(
                    (self.repo / provenance["raw_export_path"]).read_bytes()
                ))
                if mutation == "agent":
                    raw["info"]["agent"] = "forged-agent"
                elif mutation == "message":
                    raw["messages"][-1]["info"]["id"] = "msg_forged_final"
                elif mutation == "parent":
                    raw["messages"][-1]["info"]["parentID"] = "msg_forged_parent"
                elif mutation == "role":
                    raw["messages"][-1]["info"]["role"] = "user"
                else:
                    raw["messages"][0]["parts"][0]["text"] = "wrong prompt bytes"
                    provenance["prompt_text_sha256"] = self._sha_bytes(b"wrong prompt bytes")
                mutated_raw = json.dumps(raw, sort_keys=True).encode()
                export_path, raw_hash = self._write_export(mutated_raw)
                provenance["raw_export_path"] = export_path
                provenance["raw_export_sha256"] = raw_hash
                provenance["stored_export_sha256"] = self._sha(self.repo / export_path)
                candidate = json.loads(
                    (self.repo / manifest["candidate_manifest_path"]).read_text()
                )
                valid, _ = _validate_review_provenance(
                    self.repo,
                    review,
                    candidate_hash=manifest["candidate_manifest_hash"],
                    candidate=candidate,
                    gate_commit=manifest["gate_commit"],
                    gate_version=manifest["gate_version"],
                )
                self.assertFalse(valid)

    def test_017_local_snapshots_fail_when_trusted_tool_is_unavailable(self) -> None:
        """Rejects otherwise valid local artifacts without trusted live resolution."""
        report = validate_supervisor_completion(
            self.repo,
            "product_track",
            trusted_resolver=FixtureTrustedResolver({}),
        )
        self.assertFalse(report["ok"])
        self.assertEqual(report["blockers"][0]["code"], "ACCEPTED_GATE_MANIFEST_INVALID")

    def test_018_synthetic_live_export_impersonation_fails_exact_event_comparison(self) -> None:
        """Rejects a live export that impersonates labels but changes provider event bytes."""
        forged = json.loads(self.trusted_exports["ses_review"])
        forged["messages"][0]["parts"][0]["text"] = "synthetic impersonation"
        exports = dict(self.trusted_exports)
        exports["ses_review"] = json.dumps(forged, sort_keys=True).encode()
        report = validate_supervisor_completion(
            self.repo,
            "product_track",
            trusted_resolver=FixtureTrustedResolver(exports),
        )
        self.assertFalse(report["ok"])
        self.assertEqual(report["blockers"][0]["code"], "ACCEPTED_GATE_MANIFEST_INVALID")

    def test_019_owner_label_cannot_replace_exact_delegation_contract(self) -> None:
        """Rejects matching retained/live owner labels that omit the exact owner contract."""
        manifest = json.loads(
            (self.repo / "measure/evidence-integrity-accepted-gate.json").read_text()
        )
        approval = json.loads((self.repo / manifest["owner_approval_path"]).read_text())
        weak_text = "YOU are acting as the owner."
        root = json.loads(self.trusted_exports["ses_root"])
        root["messages"][0]["parts"][0]["text"] = weak_text
        weak_raw = json.dumps(root, sort_keys=True).encode()
        weak_path, weak_hash = self._write_export(weak_raw)
        delegation = approval["root_owner_delegation"]
        delegation["raw_export_path"] = weak_path
        delegation["raw_export_sha256"] = weak_hash
        delegation["stored_export_sha256"] = self._sha(self.repo / weak_path)
        delegation["owner_designation_event"]["message_text_sha256"] = self._sha_bytes(
            weak_text.encode()
        )
        valid, _ = _validate_owner_provenance(
            self.repo,
            approval,
            candidate_hash=manifest["candidate_manifest_hash"],
            review_hash=manifest["review_hash"],
            gate_commit=manifest["gate_commit"],
            gate_version=manifest["gate_version"],
            review_completed_ms=30,
            trusted_resolver=FixtureTrustedResolver(
                {**self.trusted_exports, "ses_root": weak_raw}
            ),
        )
        self.assertFalse(valid)

if __name__ == "__main__":
    unittest.main()
