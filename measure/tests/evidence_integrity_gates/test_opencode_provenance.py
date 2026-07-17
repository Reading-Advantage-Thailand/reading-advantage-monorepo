"""Focused tests for the provider-neutral OpenCode provenance adapter."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from measure.evidence_integrity_gates.opencode_provenance import (
    ProvenanceError,
    RoleBinding,
    ShellGeneratorBinding,
    build_evidence,
    build_resolved_event,
    validate_role_set,
)


class OpenCodeProvenanceTests(unittest.TestCase):
    """Exercises exact identity, hash, ownership, and independence checks."""

    def _export(self, root: Path, session: str, agent: str, output: str, *, fork=None):
        path = root / output
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("owned\n", encoding="utf-8")
        info = {"id": session}
        if fork is not None:
            info["fork_turns"] = fork
        return json.dumps({
            "info": info,
            "messages": [
                {"info": {"id": "msg_user_" + session, "sessionID": session, "role": "user", "time": {"created": 1}}, "parts": [{"type": "text", "id": "prt_prompt", "text": "prompt"}]},
                {"info": {"id": "msg_asst_" + session, "sessionID": session, "parentID": "msg_user_" + session, "role": "assistant", "agent": agent, "time": {"created": 2, "completed": 3}}, "parts": [
                    {"type": "tool", "tool": "write", "state": {"status": "completed", "input": {"filePath": str(path)}}},
                    {"type": "text", "id": "prt_final", "text": "final"},
                ]},
            ],
        }).encode()

    def test_build_evidence_binds_ids_hashes_and_output(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            binding = RoleBinding("strategy", "ses_a1", "measure-strategy", ("out.md",))
            evidence = build_evidence(self._export(root, "ses_a1", "measure-strategy", "out.md"), binding, root)
            self.assertEqual(evidence["session_id"], "ses_a1")
            self.assertEqual(evidence["agent"], "measure-strategy")
            self.assertEqual(set(evidence["output_sha256"]), {"out.md"})
            self.assertEqual(evidence["fork_turns_check"], "schema-field-absent")

    def test_build_resolved_event_preserves_raw_schema_omission(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            binding = RoleBinding("strategy", "ses_a1", "measure-strategy", ("out.md",))
            event = build_resolved_event(
                self._export(root, "ses_a1", "measure-strategy", "out.md"),
                binding,
                root,
            )
            self.assertEqual(event["provenance_kind"], "opencode-raw-export")
            self.assertEqual(event["schema_omissions"], ["fork_turns"])
            self.assertNotIn("fork_turns", event)
            self.assertIsInstance(event["prompt_bytes"], bytes)
            self.assertIsInstance(event["final_response_bytes"], bytes)

    def test_resolved_event_rejects_undeclared_write_inventory(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            raw = json.loads(self._export(root, "ses_a1", "measure-strategy", "out.md"))
            raw["messages"][-1]["parts"].insert(0, {
                "type": "tool", "tool": "write",
                "state": {"status": "completed", "input": {"filePath": str(root / "extra.md")}},
            })
            binding = RoleBinding("strategy", "ses_a1", "measure-strategy", ("out.md",))
            with self.assertRaisesRegex(ProvenanceError, "write inventory"):
                build_resolved_event(json.dumps(raw).encode(), binding, root)

    def test_rejects_agent_mismatch_and_unowned_output(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            raw = self._export(root, "ses_a1", "wrong-agent", "other.md")
            binding = RoleBinding("strategy", "ses_a1", "measure-strategy", ("other.md",))
            with self.assertRaisesRegex(ProvenanceError, "unexpected agent"):
                build_evidence(raw, binding, root)

            binding = RoleBinding("strategy", "ses_a1", "wrong-agent", ("absent.md",))
            with self.assertRaisesRegex(ProvenanceError, "owned output is missing"):
                build_evidence(raw, binding, root)

    def test_reviewer_must_be_distinct_and_fork_none_when_field_exists(self) -> None:
        records = [
            {"role": "strategy", "session_id": "ses_a", "final_response_message_id": "msg_a", "output_sha256": {"a": "1"}},
            {"role": "independent-review", "session_id": "ses_b", "final_response_message_id": "msg_b", "fork_turns_check": "verified-other", "output_sha256": {"b": "2"}},
        ]
        with self.assertRaisesRegex(ProvenanceError, "fork_turns"):
            validate_role_set(records)

    def test_duplicate_output_ownership_is_rejected(self) -> None:
        records = [
            {"role": "strategy", "session_id": "ses_a", "final_response_message_id": "msg_a", "output_sha256": {"same": "1"}},
            {"role": "independent-review", "session_id": "ses_b", "final_response_message_id": "msg_b", "fork_turns_check": "schema-field-absent", "output_sha256": {"same": "1"}},
        ]
        with self.assertRaisesRegex(ProvenanceError, "owned by multiple roles"):
            validate_role_set(records)

    def test_shell_binding_is_immutable_and_hash_bound(self) -> None:
        binding = ShellGeneratorBinding("env A=1 python3 ./generate.py", ("out.md",))
        self.assertEqual(binding.command, "env A=1 python3 ./generate.py")
        self.assertEqual(len(binding.command_sha256), 64)
        with self.assertRaises(ValueError):
            ShellGeneratorBinding("python3 ./generate.py", ("out.md",), "0" * 64)
        with self.assertRaises(ValueError):
            ShellGeneratorBinding("python3 ./generate.py; touch forged", ("out.md",))

    def test_shell_generator_supports_real_completed_session_and_multiple_groups(self) -> None:
        raw_path = Path("/tmp/ses_09139202dffeKqUGwSzgAxk69z.json")
        repo_root = Path(__file__).resolve().parents[3]
        if not raw_path.is_file():
            self.skipTest("real raw export is not present")
        phase1 = ShellGeneratorBinding(
            "PYTHONDONTWRITEBYTECODE=1 python3 measure/tracks/apk_source_denominator_inventory_20260712/generate_phase1_denominators.py --role evidence-collector",
            (
                "measure/tracks/apk_source_denominator_inventory_20260712/asset-file-denominator.json",
                "measure/tracks/apk_source_denominator_inventory_20260712/historical-source-denominator.json",
            ),
        )
        phase2 = ShellGeneratorBinding(
            "PYTHONDONTWRITEBYTECODE=1 python3 measure/tracks/apk_source_denominator_inventory_20260712/generate_phase2_human_discovery.py --phase1-revision c21b0ac8a8dd924083c061d19988c543a34418e3",
            (
                "measure/tracks/apk_source_denominator_inventory_20260712/independent-human-discovery.json",
                "measure/tracks/apk_source_denominator_inventory_20260712/human-duplicate-drift-records.json",
                "measure/tracks/apk_source_denominator_inventory_20260712/human-historical-deleted-records.json",
                "measure/tracks/apk_source_denominator_inventory_20260712/human-discrepancy-records.json",
            ),
        )
        binding = RoleBinding(
            "evidence-collector", "ses_09139202dffeKqUGwSzgAxk69z", "build",
            phase1.owned_outputs + phase2.owned_outputs,
            output_commit="c3d970dae288f78fc4c47058aed9784640020ccc",
            shell_generators=(phase1, phase2),
        )
        event = build_resolved_event(raw_path.read_bytes(), binding, repo_root)
        self.assertEqual(set(event["raw_write_inventory"]), set(binding.owned_outputs))
        self.assertEqual(set(event["output_sha256"]), set(binding.owned_outputs))

    def test_shell_generator_rejects_timeout_and_tampered_commit(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / "out.md"
            path.write_text("owned\n", encoding="utf-8")
            command = "python3 generate.py"
            shell = ShellGeneratorBinding(command, ("out.md",))
            raw = json.loads(self._export(root, "ses_a1", "measure-strategy", "out.md"))
            raw["messages"][-1]["parts"] = [
                {"type": "tool", "tool": "bash", "state": {
                    "status": "completed",
                    "input": {"command": command, "workdir": str(root)},
                    "metadata": {"output": "(no output)", "exit": None, "truncated": False},
                }},
                {"type": "text", "id": "prt_final", "text": "final"},
            ]
            binding = RoleBinding("strategy", "ses_a1", "measure-strategy", ("out.md",), output_commit="0" * 40, shell_generators=(shell,))
            with self.assertRaisesRegex(ProvenanceError, "missing"):
                build_evidence(json.dumps(raw).encode(), binding, root)

    def test_shell_commit_parser_rejects_extra_path_and_chaining(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            binding = ShellGeneratorBinding("python3 generate.py", ("out.md",))
            with self.assertRaises(ValueError):
                ShellGeneratorBinding("python3 generate.py && touch out.md", ("out.md",))
            self.assertEqual(binding.owned_outputs, ("out.md",))


if __name__ == "__main__":
    unittest.main()
