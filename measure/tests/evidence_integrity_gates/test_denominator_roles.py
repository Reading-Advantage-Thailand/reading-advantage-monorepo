"""Phase 2 falsification tests for denominator and role independence gates."""

from __future__ import annotations

import copy
import hashlib
import json
import unittest
from pathlib import Path

from measure.evidence_integrity_gates.denominator_roles import (
    PHASE2_REJECTION_CODES,
    validate_denominator_bundle,
    validate_owner_approval,
    validate_roles_and_outputs,
)
from measure.evidence_integrity_gates.events import MappingEventResolver

FIXTURES = Path(__file__).parent / "fixtures"


def _set_path(payload, path, value):
    """Apply one declarative fixture mutation.

    @param payload Mutable JSON-compatible payload.
    @param path Dot-separated mapping/list path.
    @param value Replacement value.
    @returns Mutated payload.
    """
    cursor = payload
    parts = path.split(".")
    for part in parts[:-1]:
        cursor = cursor[int(part)] if isinstance(cursor, list) else cursor[part]
    final = parts[-1]
    if isinstance(cursor, list):
        cursor[int(final)] = value
    else:
        cursor[final] = value
    return payload


class DenominatorRoleTests(unittest.TestCase):
    """Rejects each shortcut while preserving paired valid controls."""

    @classmethod
    def setUpClass(cls):
        cls.controls = json.loads((FIXTURES / "valid/phase2_controls.json").read_text())
        cls.cases = json.loads((FIXTURES / "invalid/phase2_invalid_cases.json").read_text())
        role_names = (
            "discovery-auditor", "evidence-collector", "requirements-mapper",
            "truth-test-author", "adversarial-reviewer",
        )
        cls.outputs = {f"{role}.json": f"{role}\n".encode() for role in role_names}
        cls.responses = {}
        cls.discovery_sources = {
            "discovery.json": json.dumps(
                {"items": cls.controls["denominator"]["items"]},
                sort_keys=True,
                separators=(",", ":"),
            ).encode(),
            "requirements.json": b'{"requirement_ids":["req-1"]}',
        }
        cls.controls["denominator"]["discovery_origin"]["source_sha256"] = hashlib.sha256(
            cls.discovery_sources["discovery.json"]
        ).hexdigest()
        cls.events = {
            "evt_requirements": {"id": "evt_requirements", "role": "assistant", "session_id": "ses_requirements", "agent": "requirements-agent", "output_sha256": {"requirements.json": hashlib.sha256(cls.discovery_sources["requirements.json"]).hexdigest()}},
            "evt_discovery": {"id": "evt_discovery", "role": "assistant", "session_id": "ses_discovery", "agent": "discovery-agent", "output_sha256": {"discovery.json": cls.controls["denominator"]["discovery_origin"]["source_sha256"]}},
            "evt_approval": {"provenance_kind": "opencode-raw-export", "id": "evt_approval", "role": "user", "actor_role": "product-owner", "session_id": "ses_owner", "created_ms": 30},
        }
        receipts = []
        tasks = []
        for index, role in enumerate(role_names):
            event_id = f"evt_{index}"
            session_id = f"ses_{index}"
            agent = f"agent-{index}"
            path = f"{role}.json"
            prompt = f"prompt {role}".encode()
            output_hash = hashlib.sha256(cls.outputs[path]).hexdigest()
            cls.responses[event_id] = json.dumps(
                {"output_sha256": {path: output_hash}}, sort_keys=True, separators=(",", ":")
            ).encode()
            started_ms = 10 if role == "adversarial-reviewer" else index + 1
            receipt = {
                "role": role, "actor_kind": "delegated-agent", "session_id": session_id,
                "spawn_id": session_id, "ancestry_ids": ["ses_owner"], "findings": [],
                "agent": agent, "event_id": event_id, "start_event_id": f"msg_start_{index}",
                "prompt_message_id": f"msg_start_{index}", "final_response_message_id": event_id,
                "start_timestamp_ms": started_ms, "end_timestamp_ms": 20 if role == "adversarial-reviewer" else index + 2,
                "prompt_sha256": hashlib.sha256(prompt).hexdigest(),
                "allowed_input_manifest_sha256": "a" * 64, "actual_context_manifest_sha256": "b" * 64,
                "budget_declaration_sha256": "c" * 64, "prior_role_history": [],
                "final_response_sha256": hashlib.sha256(cls.responses[event_id]).hexdigest(),
                "commit_sha": "d" * 40, "outputs": [{"path": path, "sha256": output_hash}],
            }
            receipts.append(receipt)
            tasks.append({
                "task_id": f"{role}:{session_id}", "owner_role": role,
                "forbidden_roles": sorted(set(role_names) - {role}),
                "reviewer_role": "product-owner" if role == "adversarial-reviewer" else "adversarial-reviewer",
                "allowed_input_manifest_sha256": "a" * 64,
                "expected_outputs": [{"path": path, "sha256": output_hash}],
            })
            raw_export = json.dumps({
                "info": {"id": session_id, "parentID": "ses_owner"},
                "messages": [
                    {"info": {"id": f"msg_start_{index}", "role": "user"}, "parts": [{"type": "text", "text": prompt.decode()}]},
                    {"info": {"id": event_id, "role": "assistant", "agent": agent}, "parts": [{"type": "text", "text": cls.responses[event_id].decode()}]},
                ],
            }).encode()
            cls.events[event_id] = {
                "provenance_kind": "opencode-raw-export", "raw_export_bytes": raw_export,
                "raw_export_sha256": hashlib.sha256(raw_export).hexdigest(),
                "id": event_id, "start_event_id": f"msg_start_{index}", "role": "assistant",
                "session_id": session_id, "session_parent_id": "ses_owner", "agent": agent,
                "prompt_message_id": f"msg_start_{index}", "final_response_message_id": event_id,
                "prompt_bytes": prompt, "started_ms": started_ms,
                "completed_ms": receipt["end_timestamp_ms"], "final_response_bytes": cls.responses[event_id],
                "allowed_input_manifest_sha256": "a" * 64,
                "actual_context_manifest_sha256": "b" * 64,
                "budget_declaration_sha256": "c" * 64,
                "attested_manifest_bytes": {
                    "allowed_input_manifest_sha256": b"allowed",
                    "actual_context_manifest_sha256": b"context",
                    "budget_declaration_sha256": b"budget",
                },
                "output_sha256": {path: output_hash}, "raw_write_inventory": [path],
            }
            for field, value in cls.events[event_id]["attested_manifest_bytes"].items():
                digest = hashlib.sha256(value).hexdigest()
                cls.events[event_id][field] = digest
                receipt[field] = digest
            tasks[-1]["allowed_input_manifest_sha256"] = receipt["allowed_input_manifest_sha256"]
            task_bytes = json.dumps(tasks[-1], sort_keys=True, separators=(",", ":")).encode()
            receipt["task_manifest_sha256"] = hashlib.sha256(task_bytes).hexdigest()
            cls.events[event_id]["attested_manifest_bytes"]["task_manifest_sha256"] = task_bytes
            cls.events[event_id]["task_manifest_sha256"] = receipt["task_manifest_sha256"]
            if role == "adversarial-reviewer":
                cls.events[event_id]["schema_omissions"] = ["fork_turns"]
        cls.roles = {
            "schema_version": "evidence-integrity.phase2.v1", "depends_on": ["phase1"],
            "root_session_id": "ses_owner", "required_roles": list(role_names),
            "role_applicability": {role: True for role in role_names},
            "incompatible_roles": [
                [left, right] for offset, left in enumerate(role_names) for right in role_names[offset + 1:]
            ],
            "receipts": receipts, "tasks": tasks,
        }
        approval_message = json.dumps(
            {
                "decision": "approve",
                "approved_hashes": cls.controls["approval"]["approved_hashes"],
            },
            sort_keys=True,
            separators=(",", ":"),
        ).encode()
        cls.events["evt_approval"]["message_bytes"] = approval_message
        approval_export = json.dumps({
            "info": {"id": "ses_owner"},
            "messages": [{"info": {"id": "evt_approval", "role": "user"}, "parts": [{"type": "text", "text": approval_message.decode()}]}],
        }).encode()
        cls.events["evt_approval"]["raw_export_bytes"] = approval_export
        cls.events["evt_approval"]["raw_export_sha256"] = hashlib.sha256(approval_export).hexdigest()
        approval_text = json.dumps(cls.controls["approval"]).replace("__APPROVAL_HASH__", hashlib.sha256(approval_message).hexdigest())
        cls.approval = json.loads(approval_text)
        cls.expected_hashes = dict(cls.approval["approved_hashes"])

    def test_valid_independent_denominator_control(self):
        self.assertEqual(
            validate_denominator_bundle(
                self.controls["denominator"],
                MappingEventResolver(self.events),
                self.discovery_sources,
            ),
            {"ok": True},
        )

    def test_reason_coded_denominator_fixtures(self):
        for case in self.cases["denominator_cases"]:
            with self.subTest(case=case["name"]):
                payload = _set_path(copy.deepcopy(self.controls["denominator"]), case["mutation"]["path"], case["mutation"]["value"])
                sources = self.discovery_sources
                events = self.events
                if case["mutation"]["path"].startswith("items") and payload["items"]:
                    source = json.dumps(
                        {"items": payload["items"]},
                        sort_keys=True,
                        separators=(",", ":"),
                    ).encode()
                    sources = dict(self.discovery_sources)
                    sources["discovery.json"] = source
                    payload["discovery_origin"]["source_sha256"] = hashlib.sha256(source).hexdigest()
                    events = copy.deepcopy(self.events)
                    events["evt_discovery"]["output_sha256"]["discovery.json"] = payload["discovery_origin"]["source_sha256"]
                result = validate_denominator_bundle(
                    payload, MappingEventResolver(events), sources
                )
                self.assertEqual(result["code"], case["expected"])
                self.assertIn(result["code"], PHASE2_REJECTION_CODES)
                self.assertTrue(
                    validate_denominator_bundle(
                        self.controls["denominator"],
                        MappingEventResolver(self.events),
                        self.discovery_sources,
                    )["ok"]
                )

    def test_valid_roles_with_truthful_omitted_fork_field_control(self):
        self.assertEqual(validate_roles_and_outputs(self.roles, MappingEventResolver(self.events), self.outputs), {"ok": True})

    def test_denominator_requires_distinct_resolved_requirements_author(self):
        payload = copy.deepcopy(self.controls["denominator"])
        payload["requirements_author_session_id"] = "ses_discovery"
        events = copy.deepcopy(self.events)
        events["evt_requirements"]["session_id"] = "ses_discovery"
        result = validate_denominator_bundle(
            payload, MappingEventResolver(events), self.discovery_sources
        )
        self.assertEqual(result["code"], "AUTHORED_DENOMINATOR_REJECTED")

    def test_malformed_discovery_output_inventory_fails_closed(self):
        events = copy.deepcopy(self.events)
        events["evt_discovery"]["output_sha256"] = None
        result = validate_denominator_bundle(
            self.controls["denominator"],
            MappingEventResolver(events),
            self.discovery_sources,
        )
        self.assertEqual(result["code"], "AUTHORED_DENOMINATOR_REJECTED")

    def test_missing_role_session_identity_fails_closed(self):
        roles = copy.deepcopy(self.roles)
        events = copy.deepcopy(self.events)
        roles["receipts"][0]["session_id"] = None
        events["evt_0"]["session_id"] = None
        result = validate_roles_and_outputs(
            roles, MappingEventResolver(events), self.outputs
        )
        self.assertEqual(result["code"], "ROOT_ROLE_SUBSTITUTION")

    def test_reason_coded_role_fixtures(self):
        for case in self.cases["role_cases"]:
            with self.subTest(case=case["name"]):
                roles, events, outputs = copy.deepcopy(self.roles), copy.deepcopy(self.events), dict(self.outputs)
                kind = case["kind"]
                if kind == "missing-role":
                    roles["receipts"].pop()
                elif kind == "shared-session":
                    roles["receipts"][4]["session_id"] = roles["receipts"][0]["session_id"]
                elif kind == "copied-event":
                    roles["receipts"][4]["event_id"] = "evt_0"
                elif kind == "root":
                    roles["receipts"][0]["session_id"] = "ses_owner"
                elif kind == "unowned":
                    outputs["stray.txt"] = b"stray"
                elif kind == "duplicate-output":
                    roles["receipts"][4]["outputs"][0] = copy.deepcopy(
                        roles["receipts"][0]["outputs"][0]
                    )
                    events["evt_4"]["output_sha256"] = events["evt_0"]["output_sha256"]
                    events["evt_4"]["raw_write_inventory"] = events["evt_0"]["raw_write_inventory"]
                    events["evt_4"]["final_response_bytes"] = events["evt_0"]["final_response_bytes"]
                    roles["receipts"][4]["final_response_sha256"] = roles["receipts"][0]["final_response_sha256"]
                    raw = json.loads(events["evt_4"]["raw_export_bytes"])
                    raw["messages"][-1]["parts"][0]["text"] = events["evt_4"]["final_response_bytes"].decode()
                    events["evt_4"]["raw_export_bytes"] = json.dumps(raw).encode()
                    events["evt_4"]["raw_export_sha256"] = hashlib.sha256(events["evt_4"]["raw_export_bytes"]).hexdigest()
                elif kind == "output-hash":
                    roles["receipts"][0]["outputs"][0]["sha256"] = "0" * 64
                elif kind == "response-hash":
                    roles["receipts"][0]["final_response_sha256"] = "0" * 64
                elif kind == "fork":
                    events["evt_4"]["fork_turns"] = "all"
                elif kind == "dependencies":
                    roles["dependencies"] = roles.pop("depends_on")
                result = validate_roles_and_outputs(roles, MappingEventResolver(events), outputs)
                self.assertEqual(result["code"], case["expected"])
                self.assertTrue(validate_roles_and_outputs(self.roles, MappingEventResolver(self.events), self.outputs)["ok"])

    def test_valid_authentic_owner_approval_control(self):
        self.assertEqual(
            validate_owner_approval(
                self.approval,
                MappingEventResolver(self.events),
                expected_hashes=self.expected_hashes,
                review_completed_ms=20,
            ),
            {"ok": True},
        )

    def test_missing_approval_session_identity_fails_closed(self):
        approval = copy.deepcopy(self.approval)
        events = copy.deepcopy(self.events)
        approval["session_id"] = None
        events["evt_approval"]["session_id"] = None
        result = validate_owner_approval(
            approval,
            MappingEventResolver(events),
            expected_hashes=self.expected_hashes,
            review_completed_ms=20,
        )
        self.assertEqual(result["code"], "FORGED_OWNER_APPROVAL")

    def test_resolver_atomically_rejects_approval_replay(self):
        resolver = MappingEventResolver(self.events)
        first = validate_owner_approval(
            self.approval, resolver, expected_hashes=self.expected_hashes, review_completed_ms=20
        )
        second = validate_owner_approval(
            self.approval, resolver, expected_hashes=self.expected_hashes, review_completed_ms=20
        )
        self.assertTrue(first["ok"])
        self.assertEqual(second["code"], "REPLAYED_OWNER_APPROVAL")

    def test_reason_coded_approval_fixtures(self):
        for case in self.cases["approval_cases"]:
            with self.subTest(case=case["name"]):
                approval, events, consumed = copy.deepcopy(self.approval), copy.deepcopy(self.events), ()
                if case["kind"] == "forged":
                    events["evt_approval"]["role"] = "assistant"
                elif case["kind"] == "replayed":
                    consumed = ("evt_approval",)
                elif case["kind"] == "hash":
                    approval["message_sha256"] = "0" * 64
                result = validate_owner_approval(
                    approval,
                    MappingEventResolver(events),
                    expected_hashes=self.expected_hashes,
                    review_completed_ms=20,
                    consumed_event_ids=consumed,
                )
                self.assertEqual(result["code"], case["expected"])
                self.assertTrue(
                    validate_owner_approval(
                        self.approval,
                        MappingEventResolver(self.events),
                        expected_hashes=self.expected_hashes,
                        review_completed_ms=20,
                    )["ok"]
                )


if __name__ == "__main__":
    unittest.main()
