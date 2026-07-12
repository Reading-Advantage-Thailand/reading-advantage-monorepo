"""Focused tests for the provider-neutral OpenCode provenance adapter."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from measure.evidence_integrity_gates.opencode_provenance import (
    ProvenanceError,
    RoleBinding,
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


if __name__ == "__main__":
    unittest.main()
