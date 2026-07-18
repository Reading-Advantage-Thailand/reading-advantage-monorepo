"""Production-path attacks for APK inventory Phase-4 acceptance wiring."""

from __future__ import annotations

import copy
import hashlib
import json
import unittest
from pathlib import Path
from typing import Any
from measure.tests.evidence_integrity_gates import test_apk_inventory_live as live_fixtures

from measure.evidence_integrity_gates.apk_inventory_acceptance import (
    TrustedPhase4Authority,
    validate_phase4_inventory_acceptance,
)
from measure.evidence_integrity_gates.apk_inventory_live import (
    PHASE_ARTIFACT_PATHS,
    TRACK_DIRECTORY,
    canonical_task_prompt,
)
from measure.evidence_integrity_gates.events import MappingEventResolver
from measure.evidence_integrity_gates.git_source import GitSourceAdapter
from measure.evidence_integrity_gates.t2_role_receipt import _EXPECTED_RUNTIME_ENVIRONMENT
from measure.tests import test_apk_source_denominator_inventory_phase4 as legacy_phase4


def _canonical_bytes(value: object) -> bytes:
    """Returns compact sorted JSON bytes for provider and receipt bindings."""
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode()


def _digest(value: bytes) -> str:
    """Returns one lowercase SHA-256 digest."""
    return hashlib.sha256(value).hexdigest()


def _trusted_runtime() -> dict[str, Any]:
    """Builds exact live executable authority for the isolated production fixture."""
    entries = (
        "/usr/bin/env",
        "/usr/bin/python3",
        "/usr/bin/git",
        "/opt/codex-desktop/resources/node-runtime/bin/node",
    )
    executables = []
    for entry in entries:
        resolved = Path(entry).resolve(strict=True)
        executables.append({
            "entry_path": entry,
            "resolved_path": str(resolved),
            "sha256": _digest(resolved.read_bytes()),
        })
    return {
        "schema_version": "apk-trusted-runtime.v1",
        "sanitized_environment": dict(_EXPECTED_RUNTIME_ENVIRONMENT),
        "executables": executables,
    }


class APKInventoryProductionAcceptanceWiringTests(unittest.TestCase):
    """Proves the production freeze cannot fall back to authored record sets."""

    @classmethod
    def setUpClass(cls) -> None:
        """Promotes the legacy Green fixture to a raw-provider production freeze."""
        cls.legacy = legacy_phase4.Phase4GreenBranchCounterexamples
        cls.legacy.setUpClass()
        cls.fixture_repo = cls.legacy.fixture_repo
        cls.freeze_path = cls.legacy.freeze_path
        cls.ownership_path = cls.legacy.ownership_path
        freeze_file = cls.fixture_repo / cls.freeze_path
        ownership_file = cls.fixture_repo / cls.ownership_path
        freeze = json.loads(freeze_file.read_text(encoding="utf-8"))
        ownership = json.loads(ownership_file.read_text(encoding="utf-8"))
        cls.freeze_path = f"{TRACK_DIRECTORY}/phase0-input-freeze.json"
        cls.ownership_path = f"{TRACK_DIRECTORY}/phase0-role-ownership-manifest.json"
        freeze_file = cls.fixture_repo / cls.freeze_path
        ownership_file = cls.fixture_repo / cls.ownership_path
        freeze_file.parent.mkdir(parents=True, exist_ok=True)
        ownership["allowed_input_manifest_path"] = cls.freeze_path
        role_outputs = {
            "discovery-auditor": list(PHASE_ARTIFACT_PATHS["phase1"][:3]),
            "evidence-collector": [
                "asset-file-denominator.json",
                "historical-source-denominator.json",
                *PHASE_ARTIFACT_PATHS["phase2"],
            ],
            "requirements-mapper": [
                "denominator-discrepancies.json",
                "denominator-method.md",
                "phase3-reconciliation.json",
            ],
            "truth-test-author": ["denominator-contract-test-report.json"],
            "adversarial-reviewer": ["independent-review.json"],
        }
        for task in ownership["tasks"]:
            task["expected_outputs"] = role_outputs[task["owner_role"]]
            task["reviewer_role"] = (
                "product-owner"
                if task["owner_role"] == "adversarial-reviewer"
                else "adversarial-reviewer"
            )
            task["execution_contract"] = {
                "schema_version": "apk-role-execution-contract.v1",
                "allowed_provider_tools": ["read", "write"],
                "direct_write_only": True,
                "direct_write_outputs": [
                    f"{TRACK_DIRECTORY}/{name}" for name in task["expected_outputs"]
                ],
                "ordered_operations": [],
                "read_only_shell_commands": [],
                "shell_generators": [],
            }
        ownership["trusted_runtime"] = _trusted_runtime()
        expected_names = {
            name for names in PHASE_ARTIFACT_PATHS.values() for name in names
        } | {
            "denominator-method.md",
            "denominator-contract-test-report.json",
            "independent-review.json",
            "candidate-denominator-manifest.json",
            "candidate-partition-manifest.json",
            "product-owner-acceptance.json",
            "accepted-denominator-manifest.json",
            "accepted-partition-manifest.json",
        }
        freeze["expected_artifacts"] = [
            {"path": f"{TRACK_DIRECTORY}/{name}"} for name in sorted(expected_names)
        ]
        report_path = f"{TRACK_DIRECTORY}/denominator-contract-test-report.json"
        freeze["resource_accounting"] = {
            "schema_version": "apk-logical-input-accounting.v1",
            "roles": {
                role: {
                    "formula": "structured-committed-test-report-only",
                    "report_path": report_path,
                    "admission_pointer": "/phase0_3_admission_result",
                    "inventory_pointer": "/test_inventory",
                    "test_count_field": "tests",
                    "passed_field": "passed",
                    "failed_field": "failed",
                    "exit_code_field": "exit_code",
                }
                for role in cls.legacy.REQUIRED_ROLES
            },
        }
        freeze["frozen_resource_ceilings"] = {
            role: {"bytes_read": 1024, "command_invocations": 20, "test_cases": 54}
            for role in cls.legacy.REQUIRED_ROLES
        }
        freeze_bytes = cls.legacy._json_bytes(freeze)
        freeze_file.write_bytes(freeze_bytes)
        ownership["allowed_input_manifest_sha256"] = _digest(freeze_bytes)
        ownership_file.write_bytes(cls.legacy._json_bytes(ownership))
        cls.legacy._git("add", cls.freeze_path, cls.ownership_path)
        cls.legacy._git("commit", "-q", "-m", "fixture: production phase0")
        phase0_commit = cls.legacy._git("rev-parse", "HEAD").stdout.strip()
        cls.phase0_commit = phase0_commit
        cls.freeze = freeze
        cls.trusted_runtime = ownership["trusted_runtime"]
        cls.tasks = {task["owner_role"]: task for task in ownership["tasks"]}
        docs = live_fixtures._documents()
        for document in docs.values():
            document["source_baseline_revision"] = cls.legacy.source_commit
        track = cls.fixture_repo / TRACK_DIRECTORY
        track.mkdir(parents=True, exist_ok=True)

        def write_doc(name: str, value: object) -> None:
            (track / name).write_bytes(cls.legacy._json_bytes(value))

        phase1 = list(PHASE_ARTIFACT_PATHS["phase1"])
        phase2 = list(PHASE_ARTIFACT_PATHS["phase2"])
        for name in phase1:
            write_doc(name, docs[name])
        cls.legacy._git("add", TRACK_DIRECTORY)
        cls.legacy._git("commit", "-q", "-m", "fixture: production phase1")
        phase1_commit = cls.legacy._git("rev-parse", "HEAD").stdout.strip()
        phase1_hashes = {
            f"{TRACK_DIRECTORY}/{name}": _digest((track / name).read_bytes())
            for name in phase1
        }
        for name in phase2:
            docs[name]["input_provenance"] = {
                "revision": phase1_commit,
                "artifact_sha256": phase1_hashes,
            }
            write_doc(name, docs[name])
        cls.legacy._git("add", TRACK_DIRECTORY)
        cls.legacy._git("commit", "-q", "-m", "fixture: production phase2")
        phase2_commit = cls.legacy._git("rev-parse", "HEAD").stdout.strip()
        phase2_hashes = {
            f"{TRACK_DIRECTORY}/{name}": _digest((track / name).read_bytes())
            for name in phase2
        }
        docs["phase3-reconciliation.json"]["input_provenance"] = {
            "phase1": {"revision": phase1_commit, "output_hashes": phase1_hashes},
            "phase2": {
                "receipt_revision": phase2_commit,
                "consumed_output_hashes": phase2_hashes,
            },
        }
        write_doc("phase3-reconciliation.json", docs["phase3-reconciliation.json"])
        (track / "denominator-method.md").write_text(
            "Schema version: `apk-denominator-method.v1`\n", encoding="utf-8"
        )
        (track / "denominator-contract-test-report.json").write_bytes(
            cls.legacy._json_bytes(
                {
                    "schema_version": "apk-denominator-contract-test-report.v1",
                    "status": "red-contract-authored",
                    "role": "truth-test-author",
                    "source_baseline_revision": cls.legacy.source_commit,
                    "phase0_3_admission_result": {
                        "total_tests": 54,
                        "passed": 54,
                        "failed": 0,
                        "exit_code": 0,
                        "status": "passed",
                    },
                    "test_inventory": [
                        {"tests": 54, "passed": 54, "failed": 0, "exit_code": 0}
                    ],
                    "stop_loss_counters": {
                        "unsupported_factual_claims": 0,
                        "denominator_mismatches": 0,
                        "failed_fix_review_cycles": 0,
                        "failed_correction_review_cycles": 0,
                        "unresolved_blocking_findings": {"critical": 0, "high": 0, "medium": 0},
                    },
                    "unsupported_claims_count": 0,
                }
            )
        )
        cls.legacy._git("add", TRACK_DIRECTORY)
        cls.legacy._git("commit", "-q", "-m", "fixture: production phase3")
        phase3_commit = cls.legacy._git("rev-parse", "HEAD").stdout.strip()
        cls.authority = TrustedPhase4Authority(
            phase0_commit, cls.freeze_path, cls.ownership_path, phase3_commit
        )
        cls.source_adapter = GitSourceAdapter(cls.fixture_repo)

        def ref(name: str) -> dict[str, str]:
            path = f"{TRACK_DIRECTORY}/{name}"
            return {"path": path, "sha256": _digest((cls.fixture_repo / path).read_bytes())}

        phase3_document = docs["phase3-reconciliation.json"]
        coverage = {
            "identities": len(phase3_document["identity_reconciliation_records"]),
            "files": len(phase3_document["file_reconciliation_records"]),
            "source_records": len(phase3_document["source_record_reconciliation_records"]),
            "surfaces": len(phase3_document["surface_reconciliation_records"]),
            "asset_candidates": len(phase3_document["asset_candidate_reconciliation_records"]),
            "identical_hash_groups": len(phase3_document["identical_hash_group_reconciliation_records"]),
            "copies": len(phase3_document["copy_reconciliation_records"]),
            "history_and_discrepancies": len(phase3_document["discrepancy_reconciliation_records"]),
        }
        review_prompt = canonical_task_prompt(cls.tasks["adversarial-reviewer"]).decode()
        review_prompt_hash = _digest(
            _canonical_bytes([{"id": "prt_prompt4", "text": review_prompt}])
        )
        review = {
            "schema_version": "apk-denominator-independent-review.v1",
            "status": "independent-review-complete",
            "source_baseline_revision": cls.legacy.source_commit,
            "reviewer_role": "adversarial-reviewer",
            "reviewer_isolation": {
                "fork_turns": "none",
                "fresh_prompt_sha256": review_prompt_hash,
            },
            "phase3_reconciliation": ref("phase3-reconciliation.json"),
            "full_reconciliation_rerun": {
                "status": "passed",
                "source_baseline_revision": cls.legacy.source_commit,
                "phase3_output_sha256": ref("phase3-reconciliation.json")["sha256"],
                "unresolved_source_count": 0,
                "reconciliation_status": "reconciliation-complete",
                "coverage": coverage,
            },
            "blocking_findings_by_severity": {"critical": 0, "high": 0, "medium": 0},
            "findings": [],
        }
        write_doc("independent-review.json", review)
        candidate = {
            "schema_version": "apk-denominator-candidate-manifest.v1",
            "status": "candidate-non-consumable",
            "consumable": False,
            "accepted": False,
            "revoked": False,
            "source_baseline_revision": cls.legacy.source_commit,
            "phase3_reconciliation": ref("phase3-reconciliation.json"),
            "independent_review": ref("independent-review.json"),
            "denominator_counts": coverage,
        }
        write_doc("candidate-denominator-manifest.json", candidate)
        assignments = [
            {"canonical_identity_label": row["program_identity_label"]}
            for row in phase3_document["replacement_program_identity_records"]
        ]
        partition = {
            "schema_version": "apk-denominator-candidate-partition.v1",
            "status": "candidate-non-consumable",
            "consumable": False,
            "accepted": False,
            "revoked": False,
            "candidate_denominator": ref("candidate-denominator-manifest.json"),
            "assignments": assignments,
        }
        write_doc("candidate-partition-manifest.json", partition)
        approved = {
            "candidate": ref("candidate-denominator-manifest.json")["sha256"],
            "candidate_partition": ref("candidate-partition-manifest.json")["sha256"],
            "review": ref("independent-review.json")["sha256"],
            "gate": cls.legacy.predecessor_gate_sha256,
        }
        owner_message = cls.legacy._json_bytes(
            {"decision": "approve", "approved_hashes": approved}
        )
        owner = {
            "schema_version": "apk-denominator-owner-acceptance.v1",
            "decision": "approve",
            "revoked": False,
            "approved_hashes": approved,
            "current_owner_authorization": {
                "actor_role": "product-owner",
                "status": "currently-authorized",
                "event_id": "evt_owner_approval",
                "approval_message_sha256": _digest(owner_message),
            },
        }
        write_doc("product-owner-acceptance.json", owner)
        accepted = {
            "schema_version": "apk-denominator-accepted-manifest.v1",
            "status": "accepted",
            "consumable": True,
            "revoked": False,
            "candidate_denominator": ref("candidate-denominator-manifest.json"),
            "independent_review": ref("independent-review.json"),
            "owner_acceptance": ref("product-owner-acceptance.json"),
            "gate_manifest_sha256": cls.legacy.predecessor_gate_sha256,
        }
        write_doc("accepted-denominator-manifest.json", accepted)
        accepted_partition = {
            "schema_version": "apk-denominator-accepted-partition-manifest.v1",
            "status": "accepted",
            "consumable": True,
            "revoked": False,
            "candidate_denominator": ref("candidate-denominator-manifest.json"),
            "candidate_partition": ref("candidate-partition-manifest.json"),
            "independent_review": ref("independent-review.json"),
            "owner_acceptance": ref("product-owner-acceptance.json"),
            "gate_manifest_sha256": cls.legacy.predecessor_gate_sha256,
            "assignments": assignments,
        }
        write_doc("accepted-partition-manifest.json", accepted_partition)
        cls.legacy._git("add", TRACK_DIRECTORY)
        cls.legacy._git("commit", "-q", "-m", "fixture: production phase4 closeout")
        closeout = cls.legacy._git("rev-parse", "HEAD").stdout.strip()
        all_names = [
            *PHASE_ARTIFACT_PATHS["phase1"],
            *PHASE_ARTIFACT_PATHS["phase2"],
            *PHASE_ARTIFACT_PATHS["phase3"],
            "denominator-method.md",
            "denominator-contract-test-report.json",
            "independent-review.json",
            "candidate-denominator-manifest.json",
            "candidate-partition-manifest.json",
            "product-owner-acceptance.json",
            "accepted-denominator-manifest.json",
            "accepted-partition-manifest.json",
        ]
        all_bytes = {
            f"{TRACK_DIRECTORY}/{name}": (track / name).read_bytes() for name in all_names
        }
        templates = {
            receipt["role"]: copy.deepcopy(receipt)
            for receipt in cls.legacy.control_bundle["role_receipts"]
        }
        receipts = []
        for role in cls.legacy.REQUIRED_ROLES:
            receipt = templates[role]
            outputs = {
                f"{TRACK_DIRECTORY}/{name}": _digest(
                    all_bytes[f"{TRACK_DIRECTORY}/{name}"]
                )
                for name in role_outputs[role]
            }
            receipt.update(
                {
                    "task_id": cls.tasks[role]["task_id"],
                    "commit_sha": closeout,
                    "output_hashes": outputs,
                    "output_sha256": _digest(_canonical_bytes(outputs)),
                }
            )
            receipts.append(receipt)
        cls.production_bundle = {
            "schema_version": "apk-denominator-phase4-validation.v1",
            "phase_base_sha": phase3_commit,
            "source_baseline_revision": cls.legacy.source_commit,
            "predecessor_gate_sha256": cls.legacy.predecessor_gate_sha256,
            "quarantined_prefix": cls.legacy.quarantined_prefix,
            "frozen_resource_ceilings": freeze["frozen_resource_ceilings"],
            "required_roles": list(cls.legacy.REQUIRED_ROLES),
            "role_receipts": receipts,
            "artifact_paths": {
                "raw_inventory": f"{TRACK_DIRECTORY}/source-denominator.json",
                "human_discovery": f"{TRACK_DIRECTORY}/independent-human-discovery.json",
                "reconciliation": f"{TRACK_DIRECTORY}/phase3-reconciliation.json",
                "review": f"{TRACK_DIRECTORY}/independent-review.json",
                "candidate": f"{TRACK_DIRECTORY}/candidate-denominator-manifest.json",
                "candidate_partition": f"{TRACK_DIRECTORY}/candidate-partition-manifest.json",
                "owner_approval": f"{TRACK_DIRECTORY}/product-owner-acceptance.json",
                "accepted": f"{TRACK_DIRECTORY}/accepted-denominator-manifest.json",
                "accepted_partition": f"{TRACK_DIRECTORY}/accepted-partition-manifest.json",
            },
            "artifact_bytes": all_bytes,
            "artifact_sha256": {path: _digest(data) for path, data in all_bytes.items()},
            "artifact_commits": {path: closeout for path in all_bytes},
        }
        cls.production_events = {}
        cls._install_raw_role_events(
            cls.production_bundle, cls.production_events, freeze_bytes
        )
        cls.production_events["evt_owner_approval"] = {
            "id": "evt_owner_approval",
            "role": "user",
            "actor_role": "product-owner",
            "session_id": "ses_owner",
            "created_ms": 110,
            "message_bytes": owner_message,
            "message_sha256": _digest(owner_message),
            "approved_hashes": approved,
        }
        cls.production_result = cls._validate(
            copy.deepcopy(cls.production_bundle), copy.deepcopy(cls.production_events)
        )

    @classmethod
    def tearDownClass(cls) -> None:
        """Removes the temporary production fixture repository."""
        cls.legacy.tearDownClass()

    @classmethod
    def _install_raw_role_events(
        cls,
        bundle: dict[str, Any],
        events: dict[str, dict[str, Any]],
        freeze_bytes: bytes,
    ) -> None:
        """Replaces every synthetic role event with an exact raw provider export."""
        for index, receipt in enumerate(bundle["role_receipts"]):
            role = receipt["role"]
            task = cls.tasks[role]
            session_id = f"ses_{index}"
            start_id = f"msg_start{index}"
            end_id = f"msg_end{index}"
            provider_agent = "fixtureagent"
            prompt = canonical_task_prompt(task)
            final = b"complete"
            prompt_part = {"type": "text", "id": f"prt_prompt{index}", "text": prompt.decode()}
            final_part = {"type": "text", "id": f"prt_final{index}", "text": final.decode()}
            write_parts = [
                {
                    "type": "tool",
                    "tool": "write",
                    "state": {
                        "status": "completed",
                        "input": {
                            "filePath": path,
                            "content": bundle["artifact_bytes"][path].decode(),
                        },
                    },
                }
                for path in receipt["output_hashes"]
            ]
            started = 90 if role == "adversarial-reviewer" else index * 10 + 1
            raw = _canonical_bytes(
                {
                    "info": {
                        "id": session_id,
                        "parentID": "ses_root",
                        "fork_turns": "none",
                        "directory": str(cls.fixture_repo),
                        "time": {"created": started - 1, "updated": started + 2},
                    },
                    "messages": [
                        {
                            "info": {
                                "id": start_id,
                                "sessionID": session_id,
                                "role": "user",
                                "time": {"created": started},
                            },
                            "parts": [prompt_part],
                        },
                        {
                            "info": {
                                "id": end_id,
                                "sessionID": session_id,
                                "parentID": start_id,
                                "role": "assistant",
                                "agent": provider_agent,
                                "time": {"created": started + 1, "completed": started + 2},
                            },
                            "parts": [final_part, *write_parts],
                        },
                    ],
                }
            )
            raw_document = json.loads(raw)
            messages = raw_document["messages"]
            parts = [part for message in messages for part in message["parts"]]
            context = _canonical_bytes({
                "schema_version": "apk-provider-context-manifest.v2",
                "provider": "opencode-export",
                "raw_export_sha256": _digest(raw),
                "raw_export_bytes": len(raw),
                "session_id": session_id,
                "parent_session_id": "ses_root",
                "session_created_at_ms": started - 1,
                "session_updated_at_ms": started + 2,
                "message_count": len(messages),
                "part_count": len(parts),
                "user_prompt_count": 1,
                "first_user_message_id": start_id,
                "final_assistant_message_id": end_id,
                "message_ledger_sha256": _digest(_canonical_bytes(messages)),
                "message_ledger_hash_basis": "SHA-256 of the raw export messages array serialized as canonical compact JSON with sorted keys and UTF-8 encoding.",
                "part_ledger_sha256": _digest(_canonical_bytes(parts)),
                "part_ledger_hash_basis": "SHA-256 of all raw export message parts flattened in provider message order and serialized as canonical compact JSON with sorted keys and UTF-8 encoding.",
                "raw_write_inventory": sorted(receipt["output_hashes"]),
                "fork_turns": "none",
            })
            budget = _canonical_bytes({
                "schema_version": "apk-role-budget-declaration.v1",
                "actual_usage": {
                    "bytes_read": 0,
                    "command_invocations": len(write_parts),
                    "test_cases": 54,
                },
            })
            receipt["actual_usage"] = json.loads(budget)["actual_usage"]
            attestations = {
                "allowed_input_manifest_sha256": freeze_bytes,
                "actual_context_manifest_sha256": context,
                "budget_declaration_sha256": budget,
                "task_authority_sha256": prompt,
                "stop_loss_observations_sha256": _canonical_bytes(
                    receipt["stop_loss_observations"]
                ),
            }
            receipt.update(
                {
                    "provider_agent": provider_agent,
                    "spawn_id": session_id,
                    "parent_ancestry_ids": ["ses_root"],
                    "prompt_sha256": _digest(
                        _canonical_bytes(
                            [{"id": prompt_part["id"], "text": prompt_part["text"]}]
                        )
                    ),
                    "final_response_sha256": _digest(
                        _canonical_bytes(
                            [{"id": final_part["id"], "text": final_part["text"]}]
                        )
                    ),
                    "actual_context_manifest_sha256": _digest(context),
                    "actual_context_manifest": json.loads(context),
                    "budget_declaration": json.loads(budget),
                    "budget_declaration_sha256": _digest(budget),
                    "start_event_id": start_id,
                    "end_event_id": end_id,
                    "raw_export_sha256": _digest(raw),
                    "stop_loss_observations_sha256": _digest(
                        attestations["stop_loss_observations_sha256"]
                    ),
                    "phase0_authority_commit": cls.phase0_commit,
                    "allowed_input_manifest_sha256": _digest(freeze_bytes),
                    "task_authority_sha256": _digest(prompt),
                    "trusted_runtime_sha256": _digest(_canonical_bytes(cls.trusted_runtime)),
                    "shell_generators": [],
                    "read_only_shell_commands": [],
                }
            )
            events[end_id] = {
                "raw_export_bytes": raw,
                "attested_manifest_bytes": attestations,
            }

        # The authored review and human-discovery fixtures refer to their original
        # logical event IDs. These aliases are resolver lookups only; role receipts
        # remain bound to the raw provider message IDs above.
        events["evt_adversarial_reviewer"] = {
            "task_role": "adversarial-reviewer"
        }
        events["evt_evidence_collector"] = {"task_role": "evidence-collector"}

    @classmethod
    def _validate(
        cls,
        bundle: dict[str, Any],
        events: dict[str, dict[str, Any]],
    ) -> dict[str, Any]:
        """Runs the production validator over one mutation-safe fixture."""
        return validate_phase4_inventory_acceptance(
            bundle,
            MappingEventResolver(events),
            cls.source_adapter,
            cls.authority,
        )

    def _fixture(self) -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
        """Returns a deep-copied production bundle and provider event map."""
        return copy.deepcopy(self.production_bundle), copy.deepcopy(self.production_events)

    def _receipt_event(
        self,
        bundle: dict[str, Any],
        events: dict[str, dict[str, Any]],
        index: int = 0,
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        """Returns one mutable receipt and its raw provider event wrapper."""
        receipt = bundle["role_receipts"][index]
        return receipt, events[receipt["end_event_id"]]

    def _replace_raw(
        self,
        receipt: dict[str, Any],
        event: dict[str, Any],
        raw: dict[str, Any],
    ) -> None:
        """Rebinds coordinated raw-export bytes and their receipt digest."""
        raw_bytes = _canonical_bytes(raw)
        event["raw_export_bytes"] = raw_bytes
        receipt["raw_export_sha256"] = _digest(raw_bytes)
        messages = raw["messages"]
        parts = [part for message in messages for part in message.get("parts", [])]
        users = [message for message in messages if message.get("info", {}).get("role") == "user"]
        assistants = [message for message in messages if message.get("info", {}).get("role") == "assistant"]
        session_time = raw.get("info", {}).get("time", {})
        context: dict[str, Any] = {
            "schema_version": "apk-provider-context-manifest.v2",
            "provider": "opencode-export",
            "raw_export_sha256": _digest(raw_bytes),
            "raw_export_bytes": len(raw_bytes),
            "session_id": raw.get("info", {}).get("id"),
            "parent_session_id": raw.get("info", {}).get("parentID"),
            "session_created_at_ms": session_time.get("created"),
            "session_updated_at_ms": session_time.get("updated"),
            "message_count": len(messages),
            "part_count": len(parts),
            "user_prompt_count": len(users),
            "first_user_message_id": users[0].get("info", {}).get("id") if users else None,
            "final_assistant_message_id": assistants[-1].get("info", {}).get("id") if assistants else None,
            "message_ledger_sha256": _digest(_canonical_bytes(messages)),
            "message_ledger_hash_basis": "SHA-256 of the raw export messages array serialized as canonical compact JSON with sorted keys and UTF-8 encoding.",
            "part_ledger_sha256": _digest(_canonical_bytes(parts)),
            "part_ledger_hash_basis": "SHA-256 of all raw export message parts flattened in provider message order and serialized as canonical compact JSON with sorted keys and UTF-8 encoding.",
            "raw_write_inventory": sorted(receipt["output_hashes"]),
        }
        if "fork_turns" in raw.get("info", {}):
            context["fork_turns"] = raw["info"]["fork_turns"]
        else:
            context["schema_omissions"] = ["fork_turns"]
        context_bytes = _canonical_bytes(context)
        event["attested_manifest_bytes"]["actual_context_manifest_sha256"] = context_bytes
        receipt["actual_context_manifest"] = context
        receipt["actual_context_manifest_sha256"] = _digest(context_bytes)

    def _assert_code(
        self,
        bundle: dict[str, Any],
        events: dict[str, dict[str, Any]],
        code: str,
    ) -> None:
        """Requires one exact production rejection code."""
        fresh_control = self._validate(
            copy.deepcopy(self.production_bundle),
            copy.deepcopy(self.production_events),
        )
        self.assertEqual(fresh_control, {"ok": True}, fresh_control)
        result = self._validate(bundle, events)
        self.assertFalse(result.get("ok"), result)
        self.assertEqual(result.get("code"), code, result)

    def test_production_expected_artifacts_activate_raw_and_live_boundaries(self) -> None:
        """Proves production authority advances beyond legacy Green to the live loader."""
        self.assertEqual(self.production_result, {"ok": True}, self.production_result)

    def test_record_set_aliases_cannot_bypass_production_live_loading(self) -> None:
        """Rejects authored record_sets and rerun_record_sets before acceptance."""
        bundle, events = self._fixture()
        review_path = bundle["artifact_paths"]["review"]
        review = json.loads(bundle["artifact_bytes"][review_path])
        review["coordinated_alias"] = {
            "record_sets": {"synthetic": []},
            "rerun_record_sets": {"synthetic": []},
        }
        data = self.legacy._json_bytes(review)
        bundle["artifact_bytes"][review_path] = data
        bundle["artifact_sha256"][review_path] = _digest(data)
        self._assert_code(bundle, events, "AUTHORED_DENOMINATOR_REJECTED")

    def test_missing_or_forged_raw_export_rejects(self) -> None:
        """Rejects absent raw bytes and a receipt hash detached from raw bytes."""
        for mutation in ("missing", "forged"):
            with self.subTest(mutation=mutation):
                bundle, events = self._fixture()
                receipt, event = self._receipt_event(bundle, events)
                if mutation == "missing":
                    event.pop("raw_export_bytes")
                else:
                    event["raw_export_bytes"] += b" "
                self._assert_code(bundle, events, "PROVIDER_EVENT_INVALID")

    def test_coordinated_raw_and_receipt_task_prompt_forgery_rejects(self) -> None:
        """Rejects a forged prompt even when raw and receipt hashes are coordinated."""
        bundle, events = self._fixture()
        receipt, event = self._receipt_event(bundle, events)
        raw = json.loads(event["raw_export_bytes"])
        raw["messages"][0]["parts"][0]["text"] = '{"task_id":"forged"}'
        prompt_part = raw["messages"][0]["parts"][0]
        receipt["prompt_sha256"] = _digest(
            _canonical_bytes([{"id": prompt_part["id"], "text": prompt_part["text"]}])
        )
        self._replace_raw(receipt, event, raw)
        self._assert_code(bundle, events, "TASK_ENVELOPE_MISMATCH")

    def test_wrong_output_commit_and_nonhex_output_digest_reject(self) -> None:
        """Rejects an unreachable output commit and a non-SHA output digest."""
        bundle, events = self._fixture()
        receipt, _ = self._receipt_event(bundle, events)
        receipt["commit_sha"] = "0" * 40
        self._assert_code(bundle, events, "PROVIDER_EVENT_INVALID")

        bundle, events = self._fixture()
        receipt, _ = self._receipt_event(bundle, events)
        path = next(iter(receipt["output_hashes"]))
        receipt["output_hashes"][path] = "g" * 64
        receipt["output_sha256"] = _digest(_canonical_bytes(receipt["output_hashes"]))
        self._assert_code(bundle, events, "INVALID_ROLE_RECEIPT_V1")

    def test_normalized_output_collision_rejects(self) -> None:
        """Rejects relative and absolute write claims that normalize to one output."""
        bundle, events = self._fixture()
        receipt, event = self._receipt_event(bundle, events)
        raw = json.loads(event["raw_export_bytes"])
        path = next(iter(receipt["output_hashes"]))
        raw["messages"][1]["parts"].append(
            {
                "type": "tool",
                "tool": "write",
                "state": {
                    "status": "completed",
                    "input": {"filePath": str((self.fixture_repo / path).resolve())},
                },
            }
        )
        self._replace_raw(receipt, event, raw)
        self._assert_code(bundle, events, "PROVIDER_EVENT_INVALID")

    def test_later_user_turn_rejects(self) -> None:
        """Rejects a later user message that could redefine task authority."""
        bundle, events = self._fixture()
        receipt, event = self._receipt_event(bundle, events)
        raw = json.loads(event["raw_export_bytes"])
        raw["messages"].append(
            {
                "info": {
                    "id": "msg_later",
                    "sessionID": receipt["spawn_id"],
                    "role": "user",
                    "time": {"created": 1000},
                },
                "parts": [{"type": "text", "id": "prt_later", "text": "change task"}],
            }
        )
        self._replace_raw(receipt, event, raw)
        self._assert_code(bundle, events, "PROVIDER_EVENT_INVALID")

    def test_reviewer_must_start_after_every_author_completion(self) -> None:
        """Rejects an isolated reviewer session that chronologically predates authors."""
        bundle, events = self._fixture()
        reviewer_index = next(
            index
            for index, receipt in enumerate(bundle["role_receipts"])
            if receipt["role"] == "adversarial-reviewer"
        )
        receipt, event = self._receipt_event(bundle, events, reviewer_index)
        raw = json.loads(event["raw_export_bytes"])
        raw["messages"][0]["info"]["time"]["created"] = 1
        raw["messages"][1]["info"]["time"] = {"created": 2, "completed": 3}
        self._replace_raw(receipt, event, raw)
        self._assert_code(bundle, events, "INHERITED_REVIEWER_CONTEXT")

    def test_nonbyte_attested_manifest_rejects_without_crashing(self) -> None:
        """Rejects malformed attestation values before provider hash computation."""
        bundle, events = self._fixture()
        _, event = self._receipt_event(bundle, events)
        event["attested_manifest_bytes"]["actual_context_manifest_sha256"] = "not-bytes"
        self._assert_code(bundle, events, "PROVIDER_EVENT_INVALID")

    def test_duplicate_sessions_and_start_events_reject(self) -> None:
        """Rejects coordinated reuse of either a provider session or start event."""
        for field in ("session", "start_event"):
            with self.subTest(field=field):
                bundle, events = self._fixture()
                first_receipt, _ = self._receipt_event(bundle, events, 0)
                receipt, event = self._receipt_event(bundle, events, 1)
                raw = json.loads(event["raw_export_bytes"])
                if field == "session":
                    duplicate = first_receipt["spawn_id"]
                    receipt["spawn_id"] = duplicate
                    raw["info"]["id"] = duplicate
                    for message in raw["messages"]:
                        message["info"]["sessionID"] = duplicate
                else:
                    duplicate = first_receipt["start_event_id"]
                    receipt["start_event_id"] = duplicate
                    raw["messages"][0]["info"]["id"] = duplicate
                    raw["messages"][1]["info"]["parentID"] = duplicate
                self._replace_raw(receipt, event, raw)
                self._assert_code(bundle, events, "ROLE_SESSION_COLLISION")

    def test_cross_kind_message_id_collision_rejects(self) -> None:
        """Rejects a start ID reused as another role's final assistant ID."""
        bundle, events = self._fixture()
        first_receipt, _ = self._receipt_event(bundle, events, 0)
        receipt, event = self._receipt_event(bundle, events, 1)
        raw = json.loads(event["raw_export_bytes"])
        duplicate = first_receipt["end_event_id"]
        receipt["start_event_id"] = duplicate
        raw["messages"][0]["info"]["id"] = duplicate
        raw["messages"][1]["info"]["parentID"] = duplicate
        self._replace_raw(receipt, event, raw)
        self._assert_code(bundle, events, "ROLE_SESSION_COLLISION")

    def test_context_and_budget_semantics_reject_coordinated_hashes(self) -> None:
        """Rejects semantically forged context and budget after coordinated rehashing."""
        bundle, events = self._fixture()
        receipt, event = self._receipt_event(bundle, events)
        context = json.loads(event["attested_manifest_bytes"]["actual_context_manifest_sha256"])
        context["message_count"] += 1
        context_bytes = _canonical_bytes(context)
        event["attested_manifest_bytes"]["actual_context_manifest_sha256"] = context_bytes
        receipt["actual_context_manifest_sha256"] = _digest(context_bytes)
        self._assert_code(bundle, events, "CONTEXT_BINDING_MISMATCH")

        bundle, events = self._fixture()
        receipt, event = self._receipt_event(bundle, events)
        budget = json.loads(event["attested_manifest_bytes"]["budget_declaration_sha256"])
        budget["actual_usage"] = {"forged": 1}
        budget_bytes = _canonical_bytes(budget)
        event["attested_manifest_bytes"]["budget_declaration_sha256"] = budget_bytes
        receipt["budget_declaration_sha256"] = _digest(budget_bytes)
        self._assert_code(bundle, events, "BUDGET_BINDING_MISMATCH")

    def test_truth_report_and_method_semantics_reject(self) -> None:
        """Rejects forged truth-test results and a non-real method schema marker."""
        bundle, events = self._fixture()
        report_path = f"{TRACK_DIRECTORY}/denominator-contract-test-report.json"
        report = json.loads(bundle["artifact_bytes"][report_path])
        report["phase0_3_admission_result"]["failed"] = 1
        data = _canonical_bytes(report)
        bundle["artifact_bytes"][report_path] = data
        bundle["artifact_sha256"][report_path] = _digest(data)
        self._assert_code(bundle, events, "CONTRACT_REPORT_INVALID")

        bundle, events = self._fixture()
        method_path = f"{TRACK_DIRECTORY}/denominator-method.md"
        data = b"schema_version: apk-denominator-method.v1\n"
        bundle["artifact_bytes"][method_path] = data
        bundle["artifact_sha256"][method_path] = _digest(data)
        self._assert_code(bundle, events, "INVALID_PHASE4_BUNDLE")

    def test_unbound_bash_and_unordered_commits_reject(self) -> None:
        """Rejects unbound mutation commands and commits outside the admitted transition."""
        bundle, events = self._fixture()
        receipt, event = self._receipt_event(bundle, events)
        raw = json.loads(event["raw_export_bytes"])
        raw["messages"][1]["parts"].insert(0, {
            "type": "tool", "tool": "bash",
            "state": {
                "status": "completed",
                "input": {"command": "python3 forge.py", "workdir": str(self.fixture_repo)},
                "metadata": {"output": "", "exit": 0, "truncated": False},
            },
        })
        self._replace_raw(receipt, event, raw)
        self._assert_code(bundle, events, "PROVIDER_EVENT_INVALID")

        bundle, events = self._fixture()
        receipt, _ = self._receipt_event(bundle, events)
        receipt["commit_sha"] = self.authority.phase0_commit_sha
        self._assert_code(bundle, events, "PROVIDER_EVENT_INVALID")

        bundle, events = self._fixture()
        path = next(iter(bundle["artifact_commits"]))
        bundle["artifact_commits"][path] = self.authority.admitted_phase_base_sha
        self._assert_code(bundle, events, "ARTIFACT_ANCESTRY_INVALID")

    def test_receipt_cannot_authorize_arbitrary_read_only_shell(self) -> None:
        """Rejects a real raw command even when a hand-authored receipt declares it safe."""
        bundle, events = self._fixture()
        receipt, event = self._receipt_event(bundle, events)
        raw = json.loads(event["raw_export_bytes"])
        command = "git rev-parse HEAD"
        raw["messages"][1]["parts"].insert(0, {
            "type": "tool",
            "tool": "bash",
            "state": {
                "status": "completed",
                "input": {"command": command, "workdir": str(self.fixture_repo)},
                "metadata": {
                    "output": f"{receipt['commit_sha']}\n",
                    "exit": 0,
                    "truncated": False,
                },
            },
        })
        receipt["read_only_shell_commands"] = [{
            "command": command,
            "command_sha256": _digest(command.encode()),
        }]
        self._replace_raw(receipt, event, raw)
        self._assert_code(bundle, events, "PROVIDER_EVENT_INVALID")

    def test_receipt_cannot_replace_frozen_runtime_identity(self) -> None:
        """Rejects a hand-authored runtime digest absent from committed Phase-0 authority."""
        bundle, events = self._fixture()
        receipt, _ = self._receipt_event(bundle, events)
        receipt["trusted_runtime_sha256"] = "f" * 64
        self._assert_code(bundle, events, "PROVIDER_EVENT_INVALID")

    def test_receipt_cannot_rehash_forged_actual_usage(self) -> None:
        """Rejects coordinated receipt and provider budget counters below the ceiling."""
        bundle, events = self._fixture()
        receipt, event = self._receipt_event(bundle, events)
        forged = dict(receipt["actual_usage"])
        forged["test_cases"] = 0
        budget = {
            "schema_version": "apk-role-budget-declaration.v1",
            "actual_usage": forged,
        }
        budget_bytes = _canonical_bytes(budget)
        receipt["actual_usage"] = forged
        receipt["budget_declaration"] = budget
        receipt["budget_declaration_sha256"] = _digest(budget_bytes)
        event["attested_manifest_bytes"]["budget_declaration_sha256"] = budget_bytes
        self._assert_code(bundle, events, "BUDGET_BINDING_MISMATCH")

    def test_production_cannot_downgrade_to_legacy_contract(self) -> None:
        """Rejects a valid historical synthetic bundle at the production entry point."""
        result = validate_phase4_inventory_acceptance(
            copy.deepcopy(self.legacy.control_bundle),
            MappingEventResolver(copy.deepcopy(self.legacy.control_events)),
            self.legacy.source_adapter,
            self.legacy.authority,
        )
        self.assertEqual(result, {"ok": False, "code": "FROZEN_AUTHORITY_INVALID"})

    def test_shadow_chm_and_unattested_stop_loss_reject(self) -> None:
        """Rejects schema-shadow aliases and receipt-only stop-loss observations."""
        bundle, events = self._fixture()
        review_path = bundle["artifact_paths"]["review"]
        review = json.loads(bundle["artifact_bytes"][review_path])
        review["chm_counts"] = {"critical": 0, "high": 0, "medium": 0}
        data = _canonical_bytes(review)
        bundle["artifact_bytes"][review_path] = data
        bundle["artifact_sha256"][review_path] = _digest(data)
        self._assert_code(bundle, events, "AUTHORED_DENOMINATOR_REJECTED")

        bundle, events = self._fixture()
        receipt, _ = self._receipt_event(bundle, events)
        receipt["stop_loss_observations"]["failed_fix_review_cycles"] = 1
        self._assert_code(bundle, events, "INVALID_STOP_LOSS_OBSERVATION")

    def test_sibling_phase4_commit_rejects_single_transition_claim(self) -> None:
        """Rejects one Phase4 artifact committed on a sibling closeout branch."""
        bundle, events = self._fixture()
        closeout = next(iter(bundle["artifact_commits"].values()))
        tree = self.legacy._git("rev-parse", f"{closeout}^{{tree}}").stdout.strip()
        sibling = self.legacy._git(
            "commit-tree", tree, "-p", self.authority.admitted_phase_base_sha,
            "-m", "fixture: sibling phase4 closeout",
        ).stdout.strip()
        path = next(iter(bundle["artifact_commits"]))
        bundle["artifact_commits"][path] = sibling
        self._assert_code(bundle, events, "ARTIFACT_ANCESTRY_INVALID")


if __name__ == "__main__":
    unittest.main()
