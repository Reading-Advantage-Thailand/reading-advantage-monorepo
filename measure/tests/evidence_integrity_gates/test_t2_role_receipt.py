"""Focused production tests for the T2 OpenCode role-receipt renderer."""

from __future__ import annotations

import json
import hashlib
import inspect
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from measure.evidence_integrity_gates.apk_inventory_live import canonical_task_prompt
from measure.evidence_integrity_gates.opencode_provenance import (
    ReadOnlyShellBinding,
    ShellGeneratorBinding,
)
from measure.evidence_integrity_gates.t2_role_receipt import (
    T2RoleReceiptError,
    _FrozenGenerator,
    _FrozenReadOnly,
    _render_t2_role_receipt_core,
    _validate_execution_trace,
    _verified_live_export,
    export_t2_raw_session,
    render_t2_role_receipt,
)
from measure.evidence_integrity_gates import t2_role_receipt as receipt_module
from measure.evidence_integrity_gates.t2_role_accounting import derive_t2_actual_usage


TRACK = "measure/tracks/apk_source_denominator_inventory_20260712"


class _RetainedExportAdapter:
    """Copies exact retained fixture bytes through the live-export boundary."""

    def __init__(self, retained_path: Path) -> None:
        """Binds the exact retained fixture path returned by the fake adapter."""
        self._retained_path = retained_path

    def export(self, session_id: str, destination: Path) -> bytes:
        """Writes immutable matching bytes to the renderer's temporary destination."""
        raw = self._retained_path.read_bytes()
        self.assert_session(raw, session_id)
        destination.write_bytes(raw)
        destination.chmod(0o444)
        return raw

    @staticmethod
    def assert_session(raw: bytes, session_id: str) -> None:
        """Rejects fixture misuse when the retained session identity differs."""
        if json.loads(raw).get("info", {}).get("id") != session_id:
            raise AssertionError("fixture adapter session mismatch")


class T2RoleReceiptTests(unittest.TestCase):
    """Proves that receipts are rendered only from strict provider evidence."""

    def _git(self, root: Path, *args: str) -> str:
        """Runs one fixture Git command and returns its standard output."""
        result = subprocess.run(
            ("git", *args),
            cwd=root,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        return result.stdout.strip()

    def _fixture(
        self, role: str = "discovery-auditor"
    ) -> tuple[Path, tempfile.TemporaryDirectory[str], dict, Path, str]:
        """Creates a committed output, frozen task, and exact child export fixture."""
        temporary = tempfile.TemporaryDirectory()
        root = Path(temporary.name)
        self._git(root, "init", "-q")
        self._git(root, "config", "user.email", "test@example.com")
        self._git(root, "config", "user.name", "Test")

        logical_input = root / "input.ts"
        logical_input.write_text("fixture logical input\n", encoding="utf-8")
        evidence_receipt = root / TRACK / "role-receipts" / "evidence-collector.json"
        evidence_receipt.parent.mkdir(parents=True, exist_ok=True)
        evidence_receipt.write_text("{}\n", encoding="utf-8")
        self._git(root, "add", "input.ts")
        self._git(root, "add", str(evidence_receipt.relative_to(root)))
        self._git(root, "commit", "-qm", "fixture baseline")
        baseline_commit = self._git(root, "rev-parse", "HEAD")
        logical_hash = hashlib.sha256(logical_input.read_bytes()).hexdigest()
        locator = {
            "revision": baseline_commit,
            "path": "input.ts",
            "blob_sha256": logical_hash,
        }

        roles = [
            "discovery-auditor",
            "evidence-collector",
            "requirements-mapper",
            "truth-test-author",
            "adversarial-reviewer",
        ]
        task_ids = {
            "discovery-auditor": "discovery-auditor:mechanical-denominator",
            "evidence-collector": "evidence-collector:asset-history-denominator",
        }
        output_name = (
            "phase3-reconciliation.json"
            if role == "requirements-mapper"
            else "source-denominator.json"
        )
        task = {
            "task_id": task_ids.get(role, f"{role}:fixture-task"),
            "owner_role": role,
            "forbidden_roles": [value for value in roles if value != role],
            "reviewer_role": "adversarial-reviewer" if role != "adversarial-reviewer" else "product-owner",
            "expected_outputs": [output_name],
            "execution_contract": {
                "schema_version": "apk-role-execution-contract.v1",
                "allowed_provider_tools": ["read", "write"],
                "direct_write_only": True,
                "direct_write_outputs": [f"{TRACK}/{output_name}"],
                "ordered_operations": [],
                "read_only_shell_commands": [],
                "shell_generators": [],
            },
        }
        output = root / TRACK / output_name
        output.parent.mkdir(parents=True, exist_ok=True)
        output_values = {
            "discovery-auditor": {
                "records": [{
                    "record_type": "file",
                    "file_path": "input.ts",
                    "evidence": locator,
                }],
            },
            "evidence-collector": {
                "records": [{
                    "record_type": "file",
                    "file_path": "input.ts",
                    "evidence": locator,
                }],
                "assets": [{
                    "revision": baseline_commit,
                    "canonical_path": "input.ts",
                    "sha256": logical_hash,
                }],
                "history": [{"evidence": locator}],
            },
            "requirements-mapper": {
                "input_provenance": {
                    "phase1": {
                        "revision": baseline_commit,
                        "output_hashes": {"input.ts": logical_hash},
                    },
                    "phase2": {
                        "implementation_revision": baseline_commit,
                        "receipt_revision": baseline_commit,
                        "consumed_output_hashes": {"input.ts": logical_hash},
                    },
                },
                "records": [],
            },
            "truth-test-author": {
                "phase0_3_admission_result": {
                    "status": "passed",
                    "total_tests": 2,
                    "passed": 2,
                    "failed": 0,
                    "exit_code": 0,
                },
                "test_inventory": [{
                    "tests": 2,
                    "passed": 2,
                    "failed": 0,
                    "exit_code": 0,
                }],
            },
            "adversarial-reviewer": {
                "reviewed_input_ledger": {
                    "artifact_refs": [{
                        "revision": baseline_commit,
                        "path": "input.ts",
                        "sha256": logical_hash,
                    }],
                },
            },
        }
        output_content = json.dumps(output_values[role], sort_keys=True) + "\n"
        output.write_text(output_content, encoding="utf-8")
        counter = {
            "requirements-mapper": "claim_records",
            "truth-test-author": "test_cases",
        }.get(role, "source_files")
        accounting_formulas = {
            "discovery-auditor": {
                "formula": "unique-baseline-source-record-blobs",
                "artifact_path": f"{TRACK}/source-denominator.json",
                "collection_pointer": "/records",
                "required_record_type": "file",
                "path_field": "file_path",
                "locator_pointer": "/evidence",
                "required_revision_field": "baseline_revision",
            },
            "evidence-collector": {
                "formula": "phase1-source-assets-history-and-artifact-union",
                "phase1_commit_binding_field": "phase1_attestation_commit",
                "phase2_commit_binding_field": "phase2_attestation_commit",
                "phase1_artifact_paths": [f"{TRACK}/source-denominator.json"],
                "source_records": {
                    "artifact_path": f"{TRACK}/source-denominator.json",
                    "collection_pointer": "/records",
                    "required_record_type": "file",
                    "path_field": "file_path",
                    "locator_pointer": "/evidence",
                },
                "asset_records": {
                    "artifact_path": f"{TRACK}/source-denominator.json",
                    "collection_pointer": "/assets",
                    "revision_field": "revision",
                    "path_field": "canonical_path",
                    "sha256_field": "sha256",
                },
                "historical_records": {
                    "artifact_path": f"{TRACK}/source-denominator.json",
                    "collection_pointer": "/history",
                    "locator_pointer": "/evidence",
                },
            },
            "requirements-mapper": {
                "formula": "phase3-exact-predecessor-artifacts-and-frozen-claim-pointers",
                "phase3_artifact_path": f"{TRACK}/phase3-reconciliation.json",
                "phase1_revision_pointer": "/input_provenance/phase1/revision",
                "phase1_hashes_pointer": "/input_provenance/phase1/output_hashes",
                "phase2_revision_pointer": "/input_provenance/phase2/implementation_revision",
                "phase2_hashes_pointer": "/input_provenance/phase2/consumed_output_hashes",
                "claim_record_pointers": {
                    f"{TRACK}/phase3-reconciliation.json": ["/records"],
                },
            },
            "truth-test-author": {
                "formula": "structured-committed-test-report-only",
                "report_path": f"{TRACK}/source-denominator.json",
                "admission_pointer": "/phase0_3_admission_result",
                "inventory_pointer": "/test_inventory",
                "test_count_field": "tests",
                "passed_field": "passed",
                "failed_field": "failed",
                "exit_code_field": "exit_code",
            },
            "adversarial-reviewer": {
                "formula": "exact-reviewed-input-artifact-ledger",
                "review_path": f"{TRACK}/source-denominator.json",
                "ledger_pointer": "/reviewed_input_ledger/artifact_refs",
                "required_artifact_paths": ["input.ts"],
            },
        }
        freeze = {
            "schema_version": "apk-source-denominator.phase0-input-freeze.v1",
            "track_id": "apk_source_denominator_inventory_20260712",
            "baseline_revision": baseline_commit,
            "frozen_resource_ceilings": {
                role: {
                    counter: 10,
                    "command_invocations": 10,
                    "bytes_read": 4096,
                }
            },
            "resource_accounting": {
                "schema_version": "apk-logical-input-accounting.v1",
                "roles": {role: accounting_formulas[role]},
            },
            "stop_loss": {
                "unsupported_factual_claims_before_stop": 1,
                "denominator_mismatches_before_stop": 1,
                "failed_fix_review_cycles_before_block": 2,
                "unresolved_blocking_severities": ["critical", "high", "medium"],
            },
        }
        freeze_path = root / TRACK / "phase0-input-freeze.json"
        freeze_path.write_text(json.dumps(freeze), encoding="utf-8")
        ownership_path = root / TRACK / "phase0-role-ownership-manifest.json"
        ownership_path.write_text(
            json.dumps(
                {
                    "schema_version": "apk-source-denominator.phase0-role-ownership.v1",
                    "track_id": "apk_source_denominator_inventory_20260712",
                    "allowed_input_manifest_sha256": hashlib.sha256(
                        freeze_path.read_bytes()
                    ).hexdigest(),
                    "trusted_runtime": {
                        "schema_version": "apk-trusted-runtime.v1",
                        "sanitized_environment": {
                            "PATH": "/opt/codex-desktop/resources/node-runtime/bin:/usr/bin:/bin",
                            "LANG": "C",
                            "PYTHONDONTWRITEBYTECODE": "1",
                        },
                        "executables": [
                            {
                                "entry_path": entry,
                                "resolved_path": str(Path(entry).resolve()),
                                "sha256": hashlib.sha256(
                                    Path(entry).resolve().read_bytes()
                                ).hexdigest(),
                            }
                            for entry in (
                                "/usr/bin/env",
                                "/usr/bin/python3",
                                "/usr/bin/git",
                                "/opt/codex-desktop/resources/node-runtime/bin/node",
                            )
                        ],
                    },
                    "tasks": [task],
                }
            ),
            encoding="utf-8",
        )
        self._git(root, "add", ".")
        self._git(root, "commit", "-qm", "fixture")
        commit = self._git(root, "rev-parse", "HEAD")

        prompt = canonical_task_prompt(task).decode()
        raw = {
            "info": {
                "id": "ses_child1",
                "parentID": "ses_parent1",
                "fork_turns": "none",
                "directory": str(root),
                "time": {"created": 1, "updated": 4},
            },
            "messages": [
                {
                    "info": {
                        "id": "msg_user1",
                        "sessionID": "ses_child1",
                        "role": "user",
                        "time": {"created": 2},
                    },
                    "parts": [{"type": "text", "id": "prt_prompt1", "text": prompt}],
                },
                {
                    "info": {
                        "id": "msg_assistant1",
                        "sessionID": "ses_child1",
                        "parentID": "msg_user1",
                        "role": "assistant",
                        "agent": "build",
                        "time": {"created": 3, "completed": 4},
                    },
                    "parts": [
                        {
                            "type": "tool",
                            "tool": "read",
                            "state": {
                                "status": "completed",
                                "input": {"filePath": str(root / "input.ts")},
                                "output": "Ran 2 tests\n" if role == "truth-test-author" else "abcdef",
                            },
                        },
                        {
                            "type": "tool",
                            "tool": "write",
                            "state": {
                                "status": "completed",
                                "input": {
                                    "filePath": str(output),
                                    "content": output_content,
                                },
                                "output": "written",
                            },
                        },
                        {"type": "text", "id": "prt_final1", "text": "complete"},
                    ],
                },
            ],
        }
        raw_path = root / "raw-export.json"
        raw_path.write_bytes(json.dumps(raw, sort_keys=True).encode())
        return root, temporary, task, raw_path, commit

    def _role_commit_binding(
        self, root: Path, role: str, output_commit: str
    ) -> dict[str, str] | None:
        """Builds the exact immutable handoff binding required by one fixture role."""
        if role == "evidence-collector":
            return {
                "phase1_attestation_commit": output_commit,
                "phase2_attestation_commit": output_commit,
            }
        if role == "requirements-mapper":
            phase3 = json.loads((root / TRACK / "phase3-reconciliation.json").read_bytes())
            return {
                "mapper_phase1_attestation_commit": output_commit,
                "phase2_receipt_commit": phase3["input_provenance"]["phase2"][
                    "receipt_revision"
                ],
            }
        return None

    def _render(
        self,
        root: Path,
        task: dict,
        raw_path: Path,
        commit: str,
        *,
        commit_binding: dict | None = None,
        destination: Path | None = None,
        phase0_commit: str | None = None,
        shell_generators: tuple[ShellGeneratorBinding, ...] = (),
        read_only_shell_commands: tuple[ReadOnlyShellBinding, ...] = (),
    ) -> dict:
        """Renders the standard Green fixture receipt."""
        return dict(
            _render_t2_role_receipt_core(
                repository_root=root,
                raw_export=raw_path.read_bytes(),
                destination=destination or root / "receipt.json",
                session_id="ses_child1",
                role=task["owner_role"],
                provider_agent="build",
                output_commit=commit,
                phase0_commit=phase0_commit or commit,
                input_freeze_path=f"{TRACK}/phase0-input-freeze.json",
                ownership_manifest_path=f"{TRACK}/phase0-role-ownership-manifest.json",
                stop_loss_observations={
                    "unsupported_factual_claims": 0,
                    "denominator_mismatches": 0,
                    "failed_fix_review_cycles": 0,
                    "unresolved_blocking_findings": {
                        "critical": 0,
                        "high": 0,
                        "medium": 0,
                    },
                },
                commit_binding=commit_binding,
                shell_generators=shell_generators,
                read_only_shell_commands=read_only_shell_commands,
            )
        )

    def _replace_execution_contract(self, root: Path, contract: dict) -> str:
        """Commits one replacement fixture contract and returns its authority SHA."""
        path = root / TRACK / "phase0-role-ownership-manifest.json"
        ownership = json.loads(path.read_bytes())
        ownership["tasks"][0]["execution_contract"] = contract
        path.write_text(json.dumps(ownership), encoding="utf-8")
        self._git(root, "add", ".")
        self._git(root, "commit", "-qm", "replace execution contract")
        return self._git(root, "rev-parse", "HEAD")

    def test_renders_minimum_complete_receipt_from_child_export(self) -> None:
        """Binds a Green export to committed outputs and canonical attestations."""
        root, temporary, task, raw_path, commit = self._fixture()
        self.addCleanup(temporary.cleanup)
        receipt = self._render(root, task, raw_path, commit)
        self.assertEqual(receipt["schema_version"], "apk-role-receipt.v1")
        self.assertEqual(receipt["parent_ancestry_ids"], ["ses_parent1"])
        self.assertEqual(receipt["commit_sha"], commit)
        self.assertEqual(
            receipt["actual_usage"],
            {"bytes_read": 35, "command_invocations": 2, "source_files": 1},
        )
        self.assertEqual(receipt["output_paths"], [f"{TRACK}/source-denominator.json"])
        self.assertTrue((root / "receipt.json").is_file())

    def test_public_renderer_has_no_authority_or_adapter_injection_surface(self) -> None:
        """Exposes no caller-controlled provider adapter, authority SHA, or authority path."""
        parameters = inspect.signature(render_t2_role_receipt).parameters
        self.assertNotIn("export_adapter", parameters)
        self.assertNotIn("phase0_commit", parameters)
        self.assertNotIn("input_freeze_path", parameters)
        self.assertNotIn("ownership_manifest_path", parameters)
        with self.assertRaises(TypeError):
            render_t2_role_receipt(
                repository_root=Path("."),
                raw_export_path=Path("raw.json"),
                destination=Path("receipt.json"),
                session_id="ses_child1",
                role="discovery-auditor",
                provider_agent="build",
                output_commit="0" * 40,
                stop_loss_observations={},
                export_adapter=object(),
                phase0_commit="1" * 40,
            )

    def test_public_renderer_fails_closed_before_authority_binding(self) -> None:
        """Refuses production rendering before the bootstrap authority SHA is committed."""
        with mock.patch.object(receipt_module, "T2_PHASE0_AUTHORITY_COMMIT", None), mock.patch.object(
            receipt_module.OpenCodeExportAdapter,
            "export",
        ) as export:
            with self.assertRaisesRegex(T2RoleReceiptError, "authority commit is unbound"):
                render_t2_role_receipt(
                    repository_root=Path("."),
                    raw_export_path=Path("raw.json"),
                    destination=Path("receipt.json"),
                    session_id="ses_child1",
                    role="discovery-auditor",
                    provider_agent="build",
                    output_commit="0" * 40,
                    stop_loss_observations={},
                )
        export.assert_not_called()

    def test_public_renderer_uses_live_adapter_and_canonical_authority_only(self) -> None:
        """Routes exact live bytes and repository-pinned authority values into the core."""
        retained = b'{"info":{"id":"ses_child1"},"messages":[]}'

        class LiveAdapter:
            """Writes exact retained bytes through the production live-export path."""

            def export(self, session_id: str, destination: Path) -> bytes:
                """Writes a regular immutable export for the requested child session."""
                self.session_id = session_id
                destination.write_bytes(retained)
                destination.chmod(0o444)
                return retained

        with tempfile.TemporaryDirectory() as directory:
            raw_path = Path(directory) / "retained.json"
            raw_path.write_bytes(retained)
            core_result = {"status": "core-called"}
            with mock.patch.object(
                receipt_module, "T2_PHASE0_AUTHORITY_COMMIT", "a" * 40
            ), mock.patch.object(
                receipt_module, "OpenCodeExportAdapter", LiveAdapter
            ), mock.patch.object(
                receipt_module,
                "_render_t2_role_receipt_core",
                return_value=core_result,
            ) as core:
                result = render_t2_role_receipt(
                    repository_root=Path(directory),
                    raw_export_path=raw_path,
                    destination=Path(directory) / "receipt.json",
                    session_id="ses_child1",
                    role="discovery-auditor",
                    provider_agent="build",
                    output_commit="b" * 40,
                    stop_loss_observations={"unsupported_factual_claims": 0},
                )
        self.assertIs(result, core_result)
        keywords = core.call_args.kwargs
        self.assertEqual(keywords["raw_export"], retained)
        self.assertEqual(keywords["phase0_commit"], "a" * 40)
        self.assertEqual(keywords["input_freeze_path"], receipt_module.T2_INPUT_FREEZE_PATH)
        self.assertEqual(
            keywords["ownership_manifest_path"],
            receipt_module.T2_OWNERSHIP_MANIFEST_PATH,
        )

    def test_renderer_usage_matches_frozen_accounting_for_every_fixture_role(self) -> None:
        """Emits exactly the standalone accounting result for all five role formulas."""
        roles = (
            "discovery-auditor",
            "evidence-collector",
            "requirements-mapper",
            "truth-test-author",
            "adversarial-reviewer",
        )
        for role in roles:
            with self.subTest(role=role):
                root, temporary, task, raw_path, commit = self._fixture(role)
                try:
                    binding = self._role_commit_binding(root, role, commit)
                    receipt = self._render(
                        root,
                        task,
                        raw_path,
                        commit,
                        commit_binding=binding,
                    )
                    freeze = json.loads(
                        self._git(
                            root,
                            "show",
                            f"{commit}:{TRACK}/phase0-input-freeze.json",
                        )
                    )
                    expected = derive_t2_actual_usage(
                        repository_root=root,
                        freeze=freeze,
                        role=role,
                        output_commit=commit,
                        raw_export=raw_path.read_bytes(),
                        commit_binding=binding,
                    )
                    self.assertEqual(receipt["actual_usage"], expected)
                    self.assertEqual(receipt["budget_declaration"]["actual_usage"], expected)
                finally:
                    temporary.cleanup()

    def test_rejects_coordinated_provider_and_ceiling_underreporting(self) -> None:
        """Counts committed logical blobs even when every provider result claims zero bytes."""
        root, temporary, task, raw_path, _commit = self._fixture()
        self.addCleanup(temporary.cleanup)
        raw = json.loads(raw_path.read_bytes())
        for part in raw["messages"][1]["parts"]:
            state = part.get("state")
            if isinstance(state, dict):
                state["output"] = ""
        raw_path.write_bytes(json.dumps(raw, sort_keys=True).encode())

        freeze_path = root / TRACK / "phase0-input-freeze.json"
        freeze = json.loads(freeze_path.read_bytes())
        freeze["frozen_resource_ceilings"]["discovery-auditor"]["bytes_read"] = 21
        freeze_path.write_text(json.dumps(freeze), encoding="utf-8")
        ownership_path = root / TRACK / "phase0-role-ownership-manifest.json"
        ownership = json.loads(ownership_path.read_text(encoding="utf-8"))
        ownership["allowed_input_manifest_sha256"] = hashlib.sha256(
            freeze_path.read_bytes()
        ).hexdigest()
        ownership_path.write_text(json.dumps(ownership), encoding="utf-8")
        self._git(
            root,
            "add",
            f"{TRACK}/phase0-input-freeze.json",
            f"{TRACK}/phase0-role-ownership-manifest.json",
        )
        self._git(root, "commit", "-qm", "underreported accounting authority")
        output_commit = self._git(root, "rev-parse", "HEAD")

        with self.assertRaisesRegex(T2RoleReceiptError, "derived usage exceeds"):
            self._render(root, task, raw_path, output_commit)
        self.assertFalse((root / "receipt.json").exists())

    def test_rejects_forged_prompt_without_writing_receipt(self) -> None:
        """Rejects a provider prompt that is not the frozen canonical envelope."""
        root, temporary, task, raw_path, commit = self._fixture()
        self.addCleanup(temporary.cleanup)
        raw = json.loads(raw_path.read_bytes())
        raw["messages"][0]["parts"][0]["text"] = "forged"
        raw_path.write_bytes(json.dumps(raw).encode())
        with self.assertRaisesRegex(T2RoleReceiptError, "task envelope"):
            self._render(root, task, raw_path, commit)
        self.assertFalse((root / "receipt.json").exists())

    def test_rejects_parentless_and_multi_user_exports(self) -> None:
        """Rejects sessions without exact child lineage or a sole user prompt."""
        for mutation, expected in (
            (lambda raw: raw["info"].pop("parentID"), "parent"),
            (
                lambda raw: raw["messages"].append(
                    {
                        "info": {
                            "id": "msg_user2",
                            "sessionID": "ses_child1",
                            "role": "user",
                            "time": {"created": 5},
                        },
                        "parts": [{"type": "text", "id": "prt_prompt2", "text": "again"}],
                    }
                ),
                "exactly one canonical user prompt",
            ),
        ):
            with self.subTest(expected=expected):
                root, temporary, task, raw_path, commit = self._fixture()
                try:
                    raw = json.loads(raw_path.read_bytes())
                    mutation(raw)
                    raw_path.write_bytes(json.dumps(raw).encode())
                    with self.assertRaisesRegex(T2RoleReceiptError, expected):
                        self._render(root, task, raw_path, commit)
                    self.assertFalse((root / "receipt.json").exists())
                finally:
                    temporary.cleanup()

    def test_rejects_incomplete_assistant_and_unbound_bash(self) -> None:
        """Rejects incomplete responses and every undeclared completed Bash call."""
        for mutation, expected in (
            (
                lambda raw: raw["messages"][1]["info"]["time"].pop("completed"),
                "incomplete",
            ),
            (
                lambda raw: raw["messages"][1]["parts"].insert(
                    0,
                    {
                        "type": "tool",
                        "tool": "bash",
                        "state": {
                            "status": "completed",
                            "input": {
                                "command": "git status --short",
                                "workdir": raw["info"]["directory"],
                            },
                            "metadata": {"output": "", "exit": 0, "truncated": False},
                        },
                    },
                ),
                "provider tools differ|unbound mutating Bash",
            ),
        ):
            with self.subTest(expected=expected):
                root, temporary, task, raw_path, commit = self._fixture()
                try:
                    raw = json.loads(raw_path.read_bytes())
                    mutation(raw)
                    raw_path.write_bytes(json.dumps(raw).encode())
                    with self.assertRaisesRegex(T2RoleReceiptError, expected):
                        self._render(root, task, raw_path, commit)
                    self.assertFalse((root / "receipt.json").exists())
                finally:
                    temporary.cleanup()

    def test_rejects_direct_write_rebound_to_later_commit_bytes(self) -> None:
        """Rejects committed bytes that differ from the session's exact write content."""
        root, temporary, task, raw_path, _commit = self._fixture()
        self.addCleanup(temporary.cleanup)
        output = root / TRACK / "source-denominator.json"
        output.write_text('{"records":[{"forged":true}]}\n', encoding="utf-8")
        self._git(root, "add", ".")
        self._git(root, "commit", "-qm", "later external mutation")
        later_commit = self._git(root, "rev-parse", "HEAD")
        with self.assertRaisesRegex(T2RoleReceiptError, "committed bytes"):
            self._render(root, task, raw_path, later_commit)
        self.assertFalse((root / "receipt.json").exists())

    def test_rejects_git_diff_output_flag_as_read_only(self) -> None:
        """Rejects a Git inspection command that can write an arbitrary output file."""
        from measure.evidence_integrity_gates.opencode_provenance import ReadOnlyShellBinding

        with self.assertRaisesRegex(ValueError, "outside the allowed command family"):
            ReadOnlyShellBinding("git diff --output=forged.patch")

    def test_validates_evidence_phase_commit_binding(self) -> None:
        """Accepts only ancestor Phase-1 and exact-output Phase-2 attestations."""
        root, temporary, task, raw_path, commit = self._fixture("evidence-collector")
        self.addCleanup(temporary.cleanup)
        binding = {
            "status": "committed-output-binding",
            "phase1_attestation_commit": commit,
            "phase2_attestation_commit": commit,
        }
        receipt = self._render(
            root, task, raw_path, commit, commit_binding=binding
        )
        self.assertEqual(receipt["commit_binding"], binding)

        invalid = dict(binding)
        invalid["phase2_attestation_commit"] = "0" * 40
        with self.assertRaisesRegex(T2RoleReceiptError, "output ancestor|receipt commit"):
            self._render(root, task, raw_path, commit, commit_binding=invalid)

    def test_uses_committed_authority_and_rejects_symlink_destination(self) -> None:
        """Ignores worktree authority drift and refuses a symlink receipt target."""
        root, temporary, task, raw_path, commit = self._fixture()
        self.addCleanup(temporary.cleanup)
        (root / TRACK / "phase0-input-freeze.json").write_text("{}", encoding="utf-8")
        (root / TRACK / "phase0-role-ownership-manifest.json").write_text(
            '{"tasks":[]}', encoding="utf-8"
        )
        receipt = self._render(root, task, raw_path, commit)
        self.assertEqual(
            receipt["source_baseline_revision"],
            self._git(root, "rev-parse", f"{commit}^"),
        )
        self.assertEqual(receipt["phase0_authority_commit"], commit)

        symlink = root / "linked-receipt.json"
        symlink.symlink_to(root / "actual-receipt.json")
        with self.assertRaisesRegex(T2RoleReceiptError, "symlink"):
            self._render(root, task, raw_path, commit, destination=symlink)
        with self.assertRaisesRegex(T2RoleReceiptError, "escapes"):
            self._render(
                root,
                task,
                raw_path,
                commit,
                destination=Path(temporary.name).parent / "outside-receipt.json",
            )

    def test_rejects_ownership_manifest_with_wrong_freeze_hash(self) -> None:
        """Rejects committed role authority not bound to the exact frozen inputs."""
        root, temporary, task, raw_path, _commit = self._fixture()
        self.addCleanup(temporary.cleanup)
        ownership_path = root / TRACK / "phase0-role-ownership-manifest.json"
        ownership = json.loads(ownership_path.read_text(encoding="utf-8"))
        ownership["allowed_input_manifest_sha256"] = "0" * 64
        ownership_path.write_text(json.dumps(ownership), encoding="utf-8")
        self._git(root, "add", str(ownership_path.relative_to(root)))
        self._git(root, "commit", "-qm", "forge authority freeze binding")
        forged_commit = self._git(root, "rev-parse", "HEAD")
        with self.assertRaisesRegex(T2RoleReceiptError, "malformed or ambiguous"):
            self._render(root, task, raw_path, forged_commit)
        self.assertFalse((root / "receipt.json").exists())

    def test_renders_every_role_specific_usage_counter(self) -> None:
        """Computes source, claim, and test counters without caller-supplied usage."""
        expected_counters = {
            "requirements-mapper": ("claim_records", 0),
            "truth-test-author": ("test_cases", 2),
            "adversarial-reviewer": ("source_files", 1),
        }
        for role, (counter, expected) in expected_counters.items():
            with self.subTest(role=role):
                root, temporary, task, raw_path, commit = self._fixture(role)
                try:
                    receipt = self._render(
                        root,
                        task,
                        raw_path,
                        commit,
                        commit_binding=self._role_commit_binding(root, role, commit),
                    )
                    self.assertEqual(receipt["actual_usage"][counter], expected)
                    self.assertEqual(set(receipt["actual_usage"]), {
                        counter,
                        "bytes_read",
                        "command_invocations",
                    })
                finally:
                    temporary.cleanup()

    def test_exports_through_adapter_and_preserves_fork_schema_omission(self) -> None:
        """Uses the adapter boundary and records a real omitted fork field without invention."""
        class FakeAdapter:
            """Writes deterministic raw bytes without an external provider call."""

            def export(self, session_id: str, destination: Path) -> bytes:
                """Writes and returns the exact fake provider bytes."""
                raw = json.dumps({"info": {"id": session_id}, "messages": []}).encode()
                destination.write_bytes(raw)
                return raw

        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "export.json"
            raw = export_t2_raw_session("ses_child1", destination, FakeAdapter())
            self.assertEqual(raw, destination.read_bytes())

        root, temporary, task, raw_path, commit = self._fixture()
        self.addCleanup(temporary.cleanup)
        document = json.loads(raw_path.read_bytes())
        document["info"].pop("fork_turns")
        raw_path.write_bytes(json.dumps(document).encode())
        receipt = self._render(root, task, raw_path, commit)
        self.assertEqual(receipt["actual_context_manifest"]["schema_omissions"], ["fork_turns"])

    def test_rejects_retained_export_that_differs_from_live_adapter_bytes(self) -> None:
        """Rejects synthetic retained bytes unless a live adapter returns an exact match."""
        root, temporary, task, raw_path, commit = self._fixture()
        self.addCleanup(temporary.cleanup)

        class MismatchedAdapter:
            """Returns a different valid-looking export for the same session."""

            def export(self, session_id: str, destination: Path) -> bytes:
                """Writes immutable mismatched bytes to the requested live destination."""
                raw = json.dumps({"info": {"id": session_id}, "messages": []}).encode()
                destination.write_bytes(raw)
                destination.chmod(0o444)
                return raw

        with self.assertRaisesRegex(T2RoleReceiptError, "live provider export"):
            _verified_live_export(
                "ses_child1",
                raw_path,
                MismatchedAdapter(),
            )
        self.assertFalse((root / "mismatch-receipt.json").exists())

    def test_rejects_missing_and_additional_frozen_shell_bindings(self) -> None:
        """Rejects caller no-op and extra read-only bindings against Phase-0 authority."""
        root, temporary, task, raw_path, commit = self._fixture()
        self.addCleanup(temporary.cleanup)
        dependency = f"{TRACK}/source-denominator.json"
        contract = {
            "schema_version": "apk-role-execution-contract.v1",
            "allowed_provider_tools": ["bash", "read", "write"],
            "direct_write_only": False,
            "direct_write_outputs": [],
            "ordered_operations": ["generator:0"],
            "read_only_shell_commands": [],
            "shell_generators": [{
                "command_template": "python3 generator.py",
                "dependency_blobs": [{
                    "path": dependency,
                    "revision": commit,
                    "sha256": hashlib.sha256((root / dependency).read_bytes()).hexdigest(),
                }],
                "owned_outputs": [dependency],
                "commit": {
                    "mode": "normal-only",
                    "subject": "fixture generator",
                    "immediate_adjacency": True,
                    "attestation_commit_source": "output_commit",
                },
            }],
        }
        authority = self._replace_execution_contract(root, contract)
        with self.assertRaisesRegex(T2RoleReceiptError, "shell generator bindings differ"):
            self._render(root, task, raw_path, authority)

        root2, temporary2, task2, raw_path2, commit2 = self._fixture()
        self.addCleanup(temporary2.cleanup)
        with self.assertRaisesRegex(T2RoleReceiptError, "read-only shell bindings differ"):
            self._render(
                root2,
                task2,
                raw_path2,
                commit2,
                read_only_shell_commands=(ReadOnlyShellBinding("git rev-parse HEAD"),),
            )

    def test_rejects_placeholder_and_dependency_hash_mismatch(self) -> None:
        """Binds evidence placeholders to validated commits and verifies dependency blobs."""
        root, temporary, task, raw_path, commit = self._fixture("evidence-collector")
        self.addCleanup(temporary.cleanup)
        dependency = f"{TRACK}/source-denominator.json"
        contract = {
            "schema_version": "apk-role-execution-contract.v1",
            "allowed_provider_tools": ["bash", "read", "write"],
            "direct_write_only": False,
            "direct_write_outputs": [],
            "ordered_operations": ["generator:0"],
            "read_only_shell_commands": [],
            "shell_generators": [{
            "command_template": (
                "python3 generator.py --authority {phase0_commit}"
                " --rev {phase1_attestation_commit}"
            ),
                "dependency_blobs": [{
                    "path": dependency,
                    "revision": commit,
                    "sha256": hashlib.sha256((root / dependency).read_bytes()).hexdigest(),
                }],
                "owned_outputs": [dependency],
                "commit": {
                    "mode": "normal-only",
                    "subject": "fixture generator",
                    "immediate_adjacency": True,
                    "attestation_commit_source": "output_commit",
                },
            }],
        }
        authority = self._replace_execution_contract(root, contract)
        binding = {
            "phase1_attestation_commit": commit,
            "phase2_attestation_commit": authority,
        }
        wrong = ShellGeneratorBinding(
            f"python3 generator.py --authority {authority} --rev " + "0" * 40,
            (dependency,),
        )
        with self.assertRaisesRegex(T2RoleReceiptError, "shell generator bindings differ"):
            self._render(
                root,
                task,
                raw_path,
                authority,
                commit_binding=binding,
                shell_generators=(wrong,),
            )

        contract["shell_generators"][0]["dependency_blobs"][0]["sha256"] = "0" * 64
        authority = self._replace_execution_contract(root, contract)
        binding["phase2_attestation_commit"] = authority
        expected = ShellGeneratorBinding(
            f"python3 generator.py --authority {authority} --rev {commit}",
            (dependency,),
        )
        with self.assertRaisesRegex(T2RoleReceiptError, "dependency blob"):
            self._render(
                root,
                task,
                raw_path,
                authority,
                commit_binding=binding,
                shell_generators=(expected,),
            )

    def test_real_manifest_expands_brace_free_sanitized_launchers(self) -> None:
        """Derives exact executable commands from the real Phase-0 task authority."""
        repository_root = Path(__file__).resolve().parents[3]
        manifest_path = repository_root / TRACK / "phase0-role-ownership-manifest.json"
        manifest = json.loads(manifest_path.read_bytes())
        task = next(
            item for item in manifest["tasks"]
            if item["owner_role"] == "evidence-collector"
        )
        outputs = tuple(
            f"{TRACK}/{path}" for path in task["expected_outputs"]
        )
        phase0_commit = "a" * 40
        phase1_commit = "b" * 40
        output_commit = "c" * 40
        with mock.patch.object(receipt_module, "_validate_dependency_blobs"):
            generators, reads, order, tools = receipt_module._derived_execution_contract(
                repository_root,
                phase0_commit,
                "evidence-collector",
                task,
                outputs,
                output_commit,
                {
                    "phase1_attestation_commit": phase1_commit,
                    "phase2_attestation_commit": output_commit,
                },
            )
        self.assertEqual(order, ("generator:0", "read-only:0", "generator:1"))
        self.assertEqual(tools, frozenset({"bash", "read"}))
        self.assertEqual(len(reads), 1)
        self.assertEqual(len(generators), 2)
        for generator in generators:
            command = generator.binding.command
            self.assertTrue(command.startswith(
                "/usr/bin/env -i "
                "PATH=/opt/codex-desktop/resources/node-runtime/bin:/usr/bin:/bin "
                "LANG=C PYTHONDONTWRITEBYTECODE=1 /usr/bin/python3 -I -S -c "
            ))
            self.assertIn('check_output(("/usr/bin/git","show",', command)
            self.assertIn("dict(__file__=", command)
            self.assertNotIn("{", command)
            self.assertNotIn("}", command)
            self.assertIn(phase0_commit, command)
        self.assertIn(phase1_commit, generators[1].binding.command)

    def test_mapper_receipt_placeholder_is_authority_bound_to_phase3(self) -> None:
        """Requires the mapper receipt commit to match committed Phase-3 provenance."""
        root, temporary, _task, _raw_path, output_commit = self._fixture(
            "requirements-mapper"
        )
        self.addCleanup(temporary.cleanup)
        binding = self._role_commit_binding(root, "requirements-mapper", output_commit)
        assert binding is not None
        self.assertEqual(
            receipt_module._validated_commit_binding(
                root, "requirements-mapper", output_commit, binding
            ),
            binding,
        )
        command = receipt_module._expanded_command_template(
            "python3 phase3.py --phase2-receipt-revision {phase2_receipt_commit}",
            output_commit,
            "requirements-mapper",
            binding,
        )
        self.assertEqual(
            command,
            "python3 phase3.py --phase2-receipt-revision "
            + binding["phase2_receipt_commit"],
        )
        forged = {**binding, "phase2_receipt_commit": output_commit}
        with self.assertRaisesRegex(T2RoleReceiptError, "differs from committed Phase-3"):
            receipt_module._validated_commit_binding(
                root, "requirements-mapper", output_commit, forged
            )
        evidence_receipt = root / TRACK / "role-receipts" / "evidence-collector.json"
        evidence_receipt.write_text('{"newer":true}\n', encoding="utf-8")
        self._git(root, "add", str(evidence_receipt.relative_to(root)))
        self._git(root, "commit", "-qm", "newer evidence receipt")
        later_output = self._git(root, "rev-parse", "HEAD")
        with self.assertRaisesRegex(T2RoleReceiptError, "latest committed evidence receipt"):
            receipt_module._validated_commit_binding(
                root, "requirements-mapper", later_output, binding
            )
        with self.assertRaisesRegex(T2RoleReceiptError, "unauthorized placeholder"):
            receipt_module._expanded_command_template(
                "python3 phase3.py {phase2_receipt_commit}",
                output_commit,
                "evidence-collector",
                binding,
            )

    def test_reviewer_receipt_placeholder_selects_latest_phase2_receipt(self) -> None:
        """Requires reviewer regeneration to select the Phase3-bound latest receipt."""
        root, temporary, _task, _raw_path, _fixture_commit = self._fixture(
            "adversarial-reviewer"
        )
        self.addCleanup(temporary.cleanup)
        receipt_path = root / TRACK / "role-receipts" / "evidence-collector.json"
        receipt_path.parent.mkdir(parents=True, exist_ok=True)
        receipt_path.write_text('{"status":"complete-provider-attested"}\n', encoding="utf-8")
        self._git(root, "add", str(receipt_path.relative_to(root)))
        self._git(root, "commit", "-qm", "fixture evidence receipt")
        receipt_commit = self._git(root, "rev-parse", "HEAD")
        phase3_path = root / TRACK / "phase3-reconciliation.json"
        phase3_path.write_text(
            json.dumps({
                "input_provenance": {
                    "phase2": {"receipt_revision": receipt_commit}
                }
            }) + "\n",
            encoding="utf-8",
        )
        self._git(root, "add", str(phase3_path.relative_to(root)))
        self._git(root, "commit", "-qm", "fixture reviewer phase3")
        output_commit = self._git(root, "rev-parse", "HEAD")
        binding = {"phase2_receipt_commit": receipt_commit}
        expected_binding = {
            **binding,
            "admission_commit": output_commit,
        }
        self.assertEqual(
            receipt_module._validated_commit_binding(
                root, "adversarial-reviewer", output_commit, binding
            ),
            expected_binding,
        )
        self.assertEqual(
            receipt_module._expanded_command_template(
                "python3 verify.py --phase2-receipt-revision {phase2_receipt_commit}",
                output_commit,
                "adversarial-reviewer",
                binding,
            ),
            f"python3 verify.py --phase2-receipt-revision {receipt_commit}",
        )
        receipt_path.write_text('{"status":"newer"}\n', encoding="utf-8")
        self._git(root, "add", str(receipt_path.relative_to(root)))
        self._git(root, "commit", "-qm", "newer reviewer evidence receipt")
        later_output = self._git(root, "rev-parse", "HEAD")
        with self.assertRaisesRegex(T2RoleReceiptError, "latest committed evidence receipt"):
            receipt_module._validated_commit_binding(
                root, "adversarial-reviewer", later_output, binding
            )
        with self.assertRaisesRegex(T2RoleReceiptError, "unauthorized placeholder"):
            receipt_module._expanded_command_template(
                "python3 verify.py {phase2_receipt_commit}",
                output_commit,
                "adversarial-reviewer",
                None,
            )

    def test_rejects_live_trusted_runtime_hash_drift(self) -> None:
        """Fails closed when one frozen executable digest differs from live bytes."""
        repository_root = Path(__file__).resolve().parents[3]
        manifest = json.loads(
            (repository_root / TRACK / "phase0-role-ownership-manifest.json").read_bytes()
        )
        runtime = manifest["trusted_runtime"]
        receipt_module._validate_trusted_runtime(runtime)
        drifted = json.loads(json.dumps(runtime))
        drifted["executables"][0]["sha256"] = "0" * 64
        with self.assertRaisesRegex(T2RoleReceiptError, "bytes differ"):
            receipt_module._validate_trusted_runtime(drifted)

    def test_rejects_phase0_dependency_drift_even_when_output_restores_frozen_bytes(self) -> None:
        """Rejects G-to-A drift that a later output commit restores after execution."""
        root, temporary, task, raw_path, dependency_commit = self._fixture()
        self.addCleanup(temporary.cleanup)
        dependency = f"{TRACK}/source-denominator.json"
        frozen_bytes = (root / dependency).read_bytes()
        contract = {
            "schema_version": "apk-role-execution-contract.v1",
            "allowed_provider_tools": ["bash", "read", "write"],
            "direct_write_only": False,
            "direct_write_outputs": [],
            "ordered_operations": ["generator:0"],
            "read_only_shell_commands": [],
            "shell_generators": [{
                "command_template": "python3 generator.py --authority {phase0_commit}",
                "dependency_blobs": [{
                    "path": dependency,
                    "revision": dependency_commit,
                    "sha256": hashlib.sha256(frozen_bytes).hexdigest(),
                }],
                "owned_outputs": [dependency],
                "commit": {
                    "mode": "normal-only",
                    "subject": "fixture generator",
                    "immediate_adjacency": True,
                    "attestation_commit_source": "output_commit",
                },
            }],
        }
        manifest = root / TRACK / "phase0-role-ownership-manifest.json"
        ownership = json.loads(manifest.read_bytes())
        ownership["tasks"][0]["execution_contract"] = contract
        manifest.write_text(json.dumps(ownership), encoding="utf-8")
        (root / dependency).write_text('{"records":["authority-drift"]}\n', encoding="utf-8")
        self._git(root, "add", ".")
        self._git(root, "commit", "-qm", "drift authority dependency")
        authority = self._git(root, "rev-parse", "HEAD")

        (root / dependency).write_bytes(frozen_bytes)
        self._git(root, "add", dependency)
        self._git(root, "commit", "-qm", "restore dependency after authority")
        output_commit = self._git(root, "rev-parse", "HEAD")

        with self.assertRaisesRegex(
            T2RoleReceiptError, "Phase-0 generator dependency bytes differ"
        ):
            self._render(
                root,
                task,
                raw_path,
                output_commit,
                phase0_commit=authority,
            )

    def test_rejects_provider_tool_outside_frozen_contract(self) -> None:
        """Rejects an otherwise safe provider tool not authorized by the role contract."""
        root, temporary, task, raw_path, commit = self._fixture()
        self.addCleanup(temporary.cleanup)
        raw = json.loads(raw_path.read_bytes())
        raw["messages"][1]["parts"].insert(0, {
            "type": "tool",
            "tool": "todowrite",
            "state": {"status": "completed", "input": {}, "output": "updated"},
        })
        raw_path.chmod(0o644)
        raw_path.write_bytes(json.dumps(raw).encode())
        with self.assertRaisesRegex(T2RoleReceiptError, "provider tools differ"):
            self._render(root, task, raw_path, commit)

    def test_rejects_malformed_frozen_execution_contract_shapes(self) -> None:
        """Fails closed for missing keys, invalid tools, and non-list collections."""
        mutations = (
            (
                lambda contract: contract.pop("ordered_operations"),
                "execution contract is absent or malformed",
            ),
            (
                lambda contract: contract["allowed_provider_tools"].append("todowrite"),
                "provider tool contract is malformed",
            ),
            (
                lambda contract: contract.__setitem__("ordered_operations", None),
                "execution contract collections are malformed",
            ),
        )
        for mutate, expected_error in mutations:
            with self.subTest(expected_error=expected_error):
                root, temporary, task, raw_path, _commit = self._fixture()
                try:
                    contract = json.loads(json.dumps(task["execution_contract"]))
                    mutate(contract)
                    authority = self._replace_execution_contract(root, contract)
                    with self.assertRaisesRegex(T2RoleReceiptError, expected_error):
                        self._render(root, task, raw_path, authority)
                finally:
                    temporary.cleanup()

    def test_accepts_exact_frozen_generator_and_allow_empty_commit_trace(self) -> None:
        """Accepts one exact generator followed immediately by its frozen attestation."""
        root, temporary, task, raw_path, dependency_commit = self._fixture()
        self.addCleanup(temporary.cleanup)
        dependency = f"{TRACK}/source-denominator.json"
        subject = "fixture allow-empty generator"
        contract = {
            "schema_version": "apk-role-execution-contract.v1",
            "allowed_provider_tools": ["bash", "read", "write"],
            "direct_write_only": False,
            "direct_write_outputs": [],
            "ordered_operations": ["generator:0"],
            "read_only_shell_commands": [],
            "shell_generators": [{
                "command_template": "python3 generator.py",
                "dependency_blobs": [{
                    "path": dependency,
                    "revision": dependency_commit,
                    "sha256": hashlib.sha256((root / dependency).read_bytes()).hexdigest(),
                }],
                "owned_outputs": [dependency],
                "commit": {
                    "mode": "allow-empty-only",
                    "subject": subject,
                    "immediate_adjacency": True,
                    "attestation_commit_source": "output_commit",
                },
            }],
        }
        self._replace_execution_contract(root, contract)
        self._git(
            root,
            "commit",
            "--allow-empty",
            "--only",
            dependency,
            "-m",
            subject,
        )
        output_commit = self._git(root, "rev-parse", "HEAD")
        task["execution_contract"] = contract
        raw = json.loads(raw_path.read_bytes())
        raw["messages"][0]["parts"][0]["text"] = canonical_task_prompt(task).decode()
        raw["messages"][1]["parts"][0:0] = [
            {
                "type": "tool",
                "tool": "bash",
                "state": {
                    "status": "completed",
                    "input": {"command": "python3 generator.py", "workdir": str(root)},
                    "metadata": {"output": "", "exit": 0, "truncated": False},
                },
            },
            {
                "type": "tool",
                "tool": "bash",
                "state": {
                    "status": "completed",
                    "input": {
                        "command": (
                            f"git commit --allow-empty --only {dependency} -m '{subject}'"
                        ),
                        "workdir": str(root),
                    },
                    "metadata": {
                        "output": f"[master {output_commit[:7]}] {subject}\n",
                        "exit": 0,
                        "truncated": False,
                    },
                },
            },
        ]
        raw_path.write_bytes(json.dumps(raw).encode())
        expected = ShellGeneratorBinding(
            "python3 generator.py", (dependency,), attestation_commit=output_commit
        )
        receipt = self._render(
            root,
            task,
            raw_path,
            output_commit,
            shell_generators=(expected,),
        )
        self.assertEqual(receipt["shell_generators"][0]["attestation_commit"], output_commit)

        (root / dependency).write_text('{"records":["worktree-drift"]}\n', encoding="utf-8")
        with self.assertRaisesRegex(T2RoleReceiptError, "executed generator dependency bytes"):
            self._render(
                root,
                task,
                raw_path,
                output_commit,
                shell_generators=(expected,),
            )

    def test_rejects_reordered_generators_and_incorrect_read_only_stdout(self) -> None:
        """Rejects evidence commands outside frozen order or with a false HEAD result."""
        root, temporary, _task, _raw_path, commit = self._fixture()
        self.addCleanup(temporary.cleanup)
        dependency = f"{TRACK}/source-denominator.json"
        generators = (
            _FrozenGenerator(
                ShellGeneratorBinding("python3 phase1.py", (dependency,)),
                "normal-only",
                "phase one",
                commit,
            ),
            _FrozenGenerator(
                ShellGeneratorBinding("python3 phase2.py", (dependency,)),
                "normal-only",
                "phase two",
                commit,
            ),
        )
        reordered = {
            "messages": [{
                "parts": [{
                    "type": "tool",
                    "tool": "bash",
                    "state": {
                        "status": "completed",
                        "input": {"command": "python3 phase2.py"},
                        "metadata": {"output": "", "exit": 0, "truncated": False},
                    },
                }],
            }],
        }
        with self.assertRaisesRegex(T2RoleReceiptError, "generator execution trace"):
            _validate_execution_trace(
                json.dumps(reordered).encode(),
                root,
                frozenset({"bash"}),
                generators,
                (),
                ("generator:0", "generator:1"),
            )

        read_only = _FrozenReadOnly(
            ReadOnlyShellBinding("git rev-parse HEAD"), f"{commit}\n"
        )
        false_head = {
            "messages": [{
                "parts": [{
                    "type": "tool",
                    "tool": "bash",
                    "state": {
                        "status": "completed",
                        "input": {"command": "git rev-parse HEAD"},
                        "metadata": {
                            "output": f"{'0' * 40}\n",
                            "exit": 0,
                            "truncated": False,
                        },
                    },
                }],
            }],
        }
        with self.assertRaisesRegex(T2RoleReceiptError, "read-only shell trace"):
            _validate_execution_trace(
                json.dumps(false_head).encode(),
                root,
                frozenset({"bash"}),
                (),
                (read_only,),
                ("read-only:0",),
            )


if __name__ == "__main__":
    unittest.main()
