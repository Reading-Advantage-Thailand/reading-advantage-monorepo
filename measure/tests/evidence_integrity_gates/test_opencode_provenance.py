"""Focused tests for the provider-neutral OpenCode provenance adapter."""

from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from measure.evidence_integrity_gates.opencode_provenance import (
    ProvenanceError,
    RoleBinding,
    ShellGeneratorBinding,
    _parse_simple_commit,
    _shell_owned_paths,
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

    def _git(self, root: Path, *args: str, input: str | None = None) -> str:
        result = subprocess.run(
            ("git", *args), cwd=root, input=input, text=True,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True,
        )
        return result.stdout.strip()

    def _shell_commit_fixture(self, root: Path, *, extra_path: bool = False) -> tuple[ShellGeneratorBinding, dict, dict, str]:
        self._git(root, "init", "-q")
        self._git(root, "config", "user.email", "test@example.com")
        self._git(root, "config", "user.name", "Test")
        (root / "base.md").write_text("base\n", encoding="utf-8")
        self._git(root, "add", "base.md")
        self._git(root, "commit", "-qm", "base")
        (root / "out.md").write_text("owned\n", encoding="utf-8")
        if extra_path:
            (root / "extra.md").write_text("extra\n", encoding="utf-8")
        self._git(root, "add", "out.md", "extra.md" if extra_path else "out.md")
        self._git(root, "commit", "-qm", "generator")
        commit_sha = self._git(root, "rev-parse", "HEAD")
        binding = ShellGeneratorBinding("python3 generate.py", ("out.md",))
        tool_input = {"command": "git commit --only out.md -m 'generator'", "workdir": str(root)}
        metadata = {"output": f"[master {commit_sha}] generator", "exit": 0, "truncated": False}
        return binding, tool_input, metadata, commit_sha

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
        with self.assertRaises(ValueError):
            ShellGeneratorBinding("python3 ./generate.py", ("out.md",), attestation_commit="A" * 40)

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
            output_commit="4f5dde0a04c70c57f123a72eded84836325743da",
            shell_generators=(
                ShellGeneratorBinding(phase1.command, phase1.owned_outputs, attestation_commit="990dd9c060ca844ad16d141b1eb4086b310369a4"),
                ShellGeneratorBinding(phase2.command, phase2.owned_outputs, attestation_commit="4f5dde0a04c70c57f123a72eded84836325743da"),
            ),
        )
        event = build_resolved_event(raw_path.read_bytes(), binding, repo_root)
        self.assertEqual(set(event["raw_write_inventory"]), set(binding.owned_outputs))
        self.assertEqual(set(event["output_sha256"]), set(binding.owned_outputs))

    def test_shell_generator_rejects_incomplete_generator(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shell, commit_input, commit_metadata, commit_sha = self._shell_commit_fixture(root)
            self.assertEqual(_parse_simple_commit(commit_input, commit_metadata, shell, root, commit_sha), commit_sha)
            path = root / "out.md"
            command = shell.command
            raw = json.loads(self._export(root, "ses_a1", "measure-strategy", "out.md"))
            raw["messages"][-1]["parts"] = [
                {"type": "tool", "tool": "bash", "state": {
                    "status": "completed",
                    "input": {"command": command, "workdir": str(root)},
                    "metadata": {"output": "(no output)", "exit": None, "truncated": False},
                }},
                {"type": "text", "id": "prt_final", "text": "final"},
            ]
            binding = RoleBinding("strategy", "ses_a1", "measure-strategy", ("out.md",), output_commit=commit_sha, shell_generators=(shell,))
            with self.assertRaisesRegex(ProvenanceError, "missing"):
                build_evidence(json.dumps(raw).encode(), binding, root)

    def test_shell_generator_rejects_chaining(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            binding = ShellGeneratorBinding("python3 generate.py", ("out.md",))
            with self.assertRaises(ValueError):
                ShellGeneratorBinding("python3 generate.py && touch out.md", ("out.md",))
            self.assertEqual(binding.owned_outputs, ("out.md",))

    def test_shell_commit_rejects_nonancestor_result(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            binding, tool_input, metadata, ownership = self._shell_commit_fixture(root)
            self.assertEqual(_parse_simple_commit(tool_input, metadata, binding, root, ownership), ownership)
            self.assertIsNone(_parse_simple_commit(tool_input, metadata, binding, root, "0" * 40))

    def test_shell_commit_rejects_output_changed_after_ownership(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            binding, tool_input, metadata, ownership = self._shell_commit_fixture(root)
            self.assertEqual(_parse_simple_commit(tool_input, metadata, binding, root, ownership), ownership)
            (root / "out.md").write_text("changed\n", encoding="utf-8")
            self._git(root, "add", "out.md")
            self._git(root, "commit", "-qm", "later")
            final = self._git(root, "rev-parse", "HEAD")
            self.assertNotEqual(ownership, final)
            self.assertIsNone(_parse_simple_commit(tool_input, metadata, binding, root, final))

    def test_shell_commit_requires_adjacent_tool_part(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            binding, tool_input, metadata, commit_sha = self._shell_commit_fixture(root)
            commit_part = {"type": "tool", "tool": "bash", "state": {"status": "completed", "input": tool_input, "metadata": metadata}}
            generator_part = {"type": "tool", "tool": "bash", "state": {"status": "completed", "input": {"command": "python3 generate.py", "workdir": str(root)}, "metadata": {"output": "(no output)", "exit": 0, "truncated": False}}}
            messages = [{"parts": [generator_part, commit_part]}]
            self.assertEqual(_shell_owned_paths(messages, root, (binding,), commit_sha), {"out.md"})
            messages[0]["parts"].insert(1, {"type": "tool", "tool": "read", "state": {"status": "completed", "input": tool_input, "metadata": metadata}})
            with self.assertRaisesRegex(ProvenanceError, "no valid subsequent commit"):
                _shell_owned_paths(messages, root, (binding,), commit_sha)

    def test_shell_commit_rejects_forged_result_and_missing_output_blob(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            binding, tool_input, metadata, commit_sha = self._shell_commit_fixture(root)
            self.assertEqual(_parse_simple_commit(tool_input, metadata, binding, root, commit_sha), commit_sha)
            metadata["output"] = "[master deadbeef] forged"
            self.assertIsNone(_parse_simple_commit(tool_input, metadata, binding, root, commit_sha))

            (root / "out.md").unlink()
            self._git(root, "add", "-u")
            self._git(root, "commit", "-qm", "remove")
            final = self._git(root, "rev-parse", "HEAD")
            metadata["output"] = f"[master {commit_sha}] generator"
            self.assertIsNone(_parse_simple_commit(tool_input, metadata, binding, root, final))

    def test_shell_commit_rejects_actual_extra_path_inventory(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            positive_binding, positive_input, positive_metadata, positive_sha = self._shell_commit_fixture(root)
            self.assertEqual(_parse_simple_commit(positive_input, positive_metadata, positive_binding, root, positive_sha), positive_sha)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            binding, tool_input, metadata, commit_sha = self._shell_commit_fixture(root, extra_path=True)
            self.assertIsNone(_parse_simple_commit(tool_input, metadata, binding, root, commit_sha))

    def test_shell_commit_rejects_nonempty_allow_empty(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            binding, tool_input, metadata, commit_sha = self._shell_commit_fixture(root)
            self.assertEqual(_parse_simple_commit(tool_input, metadata, binding, root, commit_sha), commit_sha)
            metadata["output"] = f"[master {commit_sha}] generator"
            tool_input["command"] = "git commit --allow-empty --only out.md -m 'generator'"
            self.assertIsNone(_parse_simple_commit(tool_input, metadata, binding, root, commit_sha))

    def test_shell_binding_attestation_requires_allow_empty_command(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            _, tool_input, metadata, ownership = self._shell_commit_fixture(root)
            binding = ShellGeneratorBinding("python3 generate.py", ("out.md",), attestation_commit=ownership)
            self.assertIsNone(_parse_simple_commit(tool_input, metadata, binding, root, ownership))

    def test_shell_commit_rejects_extra_valid_prior_sha_result_line(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            binding, tool_input, metadata, commit_sha = self._shell_commit_fixture(root)
            self.assertEqual(_parse_simple_commit(tool_input, metadata, binding, root, commit_sha), commit_sha)
            metadata["output"] += f"\n[master {commit_sha}] generator"
            self.assertIsNone(_parse_simple_commit(tool_input, metadata, binding, root, commit_sha))

    def test_shell_commit_accepts_matching_empty_attestation_only(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            binding, tool_input, metadata, ownership = self._shell_commit_fixture(root)
            self._git(root, "commit", "--allow-empty", "-qm", "generator")
            attestation = self._git(root, "rev-parse", "HEAD")
            binding = ShellGeneratorBinding("python3 generate.py", ("out.md",), attestation_commit=attestation)
            tool_input["command"] = "git commit --allow-empty --only out.md -m 'generator'"
            metadata["output"] = f"[master {attestation}] generator"
            self.assertEqual(_parse_simple_commit(tool_input, metadata, binding, root, attestation), attestation)

    def test_shell_commit_rejects_chained_command(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            binding, tool_input, metadata, commit_sha = self._shell_commit_fixture(root)
            self.assertEqual(_parse_simple_commit(tool_input, metadata, binding, root, commit_sha), commit_sha)
            tool_input["command"] += " && touch forged.md"
            self.assertIsNone(_parse_simple_commit(tool_input, metadata, binding, root, commit_sha))


if __name__ == "__main__":
    unittest.main()
