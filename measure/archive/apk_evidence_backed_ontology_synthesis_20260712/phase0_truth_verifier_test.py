"""Tests for the T9 Phase 0 fail-closed truth verifier."""

from contextlib import contextmanager, redirect_stdout
import copy
import hashlib
import io
import json
from pathlib import Path
import shutil
import tempfile
import time
import unittest
from unittest.mock import patch

import phase0_truth_verifier


TRACK_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TRACK_ROOT.parents[2]


@contextmanager
def _prebind_track_snapshot():
    """Yields a controlled copy of the former pre-rebind lifecycle state."""
    with tempfile.TemporaryDirectory() as directory:
        track = Path(directory) / "track"
        shutil.copytree(
            TRACK_ROOT,
            track,
            ignore=shutil.ignore_patterns("__pycache__"),
        )
        proof_path = (
            track
            / "role-receipts/phase0"
            / "governance-remediation-author-provider-attestation-v1.json"
        )
        proof_path.unlink()
        current_receipt_path = (
            track / phase0_truth_verifier.CURRENT_GOVERNANCE_RECEIPT_PATH
        )
        current_receipt_path.unlink()
        roles_path = track / "phase0-role-ownership-manifest-pending-v1.json"
        roles = phase0_truth_verifier.load_json(roles_path)
        roles["assignments"] = [
            assignment
            for assignment in roles["assignments"]
            if assignment["task_id"]
            not in phase0_truth_verifier.REQUIRED_TASK_OWNERSHIP
        ]
        roles_path.write_text(json.dumps(roles), encoding="utf-8")
        freeze_path = track / "phase0-input-freeze-pending-v1.json"
        freeze = phase0_truth_verifier.load_json(freeze_path)
        for binding in freeze["contract_bindings"]:
            if binding["path"] == roles_path.name:
                binding["sha256"] = hashlib.sha256(
                    roles_path.read_bytes()
                ).hexdigest()
            elif binding["path"] == "phase0-budget-stop-loss-pending-v1.json":
                binding["sha256"] = "0" * 64
        freeze_path.write_text(json.dumps(freeze), encoding="utf-8")
        yield track


@contextmanager
def _rebound_contract_snapshot():
    """Yields the package with the parent-owned freeze budget hash rebound."""
    with tempfile.TemporaryDirectory() as directory:
        track = Path(directory) / "track"
        shutil.copytree(
            TRACK_ROOT,
            track,
            ignore=shutil.ignore_patterns("__pycache__"),
        )
        freeze_path = track / "phase0-input-freeze-pending-v1.json"
        freeze = phase0_truth_verifier.load_json(freeze_path)
        budget_path = track / "phase0-budget-stop-loss-pending-v1.json"
        for binding in freeze["contract_bindings"]:
            if binding["path"] == budget_path.name:
                binding["sha256"] = hashlib.sha256(
                    budget_path.read_bytes()
                ).hexdigest()
        freeze_path.write_text(json.dumps(freeze), encoding="utf-8")
        yield track


class Phase0TruthVerifierTest(unittest.TestCase):
    """Exercises the live pending gate and every required counterexample."""

    def test_bound_live_state_has_exact_owner_gates(self) -> None:
        """The delegated-owner package must retain only the T8 gate."""
        with (
            _rebound_contract_snapshot() as track,
            patch.object(
                phase0_truth_verifier,
                "_verify_governance_author",
                return_value=12,
            ),
            patch.object(
                phase0_truth_verifier,
                "_verify_current_receipt",
                return_value=10,
            ),
        ):
            result = phase0_truth_verifier.verify_phase0(REPO_ROOT, track)

        self.assertFalse(result.passed)
        self.assertEqual(
            {finding.code for finding in result.findings},
            {
                "T8_PENDING_POST_REVIEW_USER_APPROVAL",
            },
        )
        self.assertEqual(result.state, "STOPPED_BEFORE_SYNTHESIS")

    def test_prebind_state_preserves_pending_stops(self) -> None:
        """The former unbound lifecycle must retain every pending stop."""
        with _prebind_track_snapshot() as track:
            result = phase0_truth_verifier.verify_phase0(REPO_ROOT, track)

        self.assertEqual(
            {finding.code for finding in result.findings},
            {
                "CURRENT_GOVERNANCE_RECEIPT_REBIND_PENDING",
                "GOVERNANCE_AUTHOR_PROOF_PENDING",
                "GOVERNANCE_REBIND_PENDING",
                "MISSING_TASK_OWNERSHIP",
                "T8_PENDING_POST_REVIEW_USER_APPROVAL",
            },
        )
        self.assertEqual(result.state, "STOPPED_BEFORE_SYNTHESIS")

    def test_required_negative_fixtures_fail_for_the_named_reason(self) -> None:
        """Every required bypass fixture must fail with its expected code."""
        manifest = phase0_truth_verifier.load_json(
            TRACK_ROOT / "phase0-fixture-manifest-pending-v1.json"
        )

        for fixture in manifest["fixtures"]:
            with self.subTest(fixture=fixture["id"]):
                result = phase0_truth_verifier.verify_phase0(
                    REPO_ROOT,
                    TRACK_ROOT,
                    fixture_path=TRACK_ROOT / fixture["path"],
                )
                codes = {finding.code for finding in result.findings}
                self.assertFalse(result.passed)
                self.assertEqual(result.state, "INVALID")
                for expected_code in fixture["expected_codes"]:
                    self.assertIn(expected_code, codes)

    def test_expect_code_accepts_exact_and_rejects_companions(self) -> None:
        """Expected-code mode accepts exact sets and rejects companions."""
        with (
            _rebound_contract_snapshot() as track,
            patch.object(
                phase0_truth_verifier,
                "_verify_governance_author",
                return_value=12,
            ),
            patch.object(
                phase0_truth_verifier,
                "_verify_current_receipt",
                return_value=10,
            ),
        ):
            live_args = [
                "--repo-root",
                str(REPO_ROOT),
                "--track-root",
                str(track),
                "--expect-code",
                "T8_PENDING_POST_REVIEW_USER_APPROVAL",
            ]
            with redirect_stdout(io.StringIO()):
                self.assertEqual(
                    phase0_truth_verifier.main(live_args),
                    0,
                )

            strict_live_args = [
                *live_args[:-2],
                "--expect-codes",
                "T8_PENDING_POST_REVIEW_USER_APPROVAL",
            ]
            with redirect_stdout(io.StringIO()):
                self.assertEqual(
                    phase0_truth_verifier.main(strict_live_args),
                    0,
                )

        fixture_args = [
            "--repo-root",
            str(REPO_ROOT),
            "--track-root",
            str(TRACK_ROOT),
            "--fixture",
            str(
                TRACK_ROOT / "negative-fixtures/phase0/missing-predecessor.json"
            ),
            "--expect-code",
            "MISSING_PREDECESSOR",
        ]
        with redirect_stdout(io.StringIO()):
            self.assertEqual(
                phase0_truth_verifier.main(fixture_args),
                1,
            )

    def test_full_fixture_suite_stays_inside_frozen_runtime_budget(
        self,
    ) -> None:
        """Cached verification must keep the matrix under 30 seconds."""
        manifest = phase0_truth_verifier.load_json(
            TRACK_ROOT / "phase0-fixture-manifest-pending-v1.json"
        )
        start = time.monotonic()
        phase0_truth_verifier.verify_phase0(REPO_ROOT, TRACK_ROOT)
        for fixture in manifest["fixtures"]:
            phase0_truth_verifier.verify_phase0(
                REPO_ROOT,
                TRACK_ROOT,
                fixture_path=TRACK_ROOT / fixture["path"],
            )
        elapsed = time.monotonic() - start

        self.assertLess(elapsed, 30.0)

    def test_live_registry_excludes_failed_monolith(self) -> None:
        """The live source registry must contain no monolith-derived input."""
        registry = phase0_truth_verifier.load_json(
            TRACK_ROOT / "phase0-source-registry-pending-v1.json"
        )
        paths = [record["path"] for record in registry["sources"]]

        self.assertFalse(
            any(
                "apk_cross_game_asset_ontology_20260712" in path
                for path in paths
            )
        )

    def test_task_ownership_contract_covers_later_truth_responsibilities(
        self,
    ) -> None:
        """Later artifact truth authors must be explicitly assigned by task."""
        with _prebind_track_snapshot() as track:
            result = phase0_truth_verifier.verify_phase0(REPO_ROOT, track)
        finding = next(
            finding
            for finding in result.findings
            if finding.code == "MISSING_TASK_OWNERSHIP"
        )

        self.assertIn("phase2-compare-capability-claims", finding.message)
        self.assertIn("phase2-classify-capabilities", finding.message)
        self.assertIn("phase2-run-capability-truth-tests", finding.message)
        self.assertIn("phase2-review-capabilities", finding.message)
        self.assertIn(
            "phase5-test-unknown-must-have-preservation", finding.message
        )
        self.assertIn(
            "later-artifact-specific-truth-test-author", finding.message
        )

    def test_stop_loss_count_is_two_and_has_delegated_direction(
        self,
    ) -> None:
        """Two failed cycles must bind delegated product-owner direction."""
        budget = phase0_truth_verifier.load_json(
            TRACK_ROOT / "phase0-budget-stop-loss-pending-v1.json"
        )
        ledger = phase0_truth_verifier.load_json(
            TRACK_ROOT / "phase0-fix-review-cycle-ledger-v1.json"
        )
        proof = phase0_truth_verifier.load_json(
            TRACK_ROOT / phase0_truth_verifier.GOVERNANCE_PROOF_PATH
        )
        cycle_stop = budget["fix_review_cycle_stop_loss"]

        self.assertEqual(
            budget["observed_state"]["failed_fix_review_cycles"],
            2,
        )
        self.assertTrue(cycle_stop["triggered"])
        self.assertTrue(
            phase0_truth_verifier._delegated_owner_direction_matches(
                cycle_stop["delegated_owner_direction_event"],
                contract=cycle_stop["delegated_owner_direction_contract"],
                proof=proof,
                ledger=ledger,
            )
        )

    def test_governance_proof_contract_requires_live_rollout_corroboration(
        self,
    ) -> None:
        """Proof pending clears only in the exact bound lifecycle snapshot."""
        with _prebind_track_snapshot() as track:
            prebind = phase0_truth_verifier.verify_phase0(REPO_ROOT, track)
        with patch.object(
            phase0_truth_verifier,
            "_verify_governance_author",
            return_value=12,
        ):
            bound = phase0_truth_verifier.verify_phase0(REPO_ROOT, TRACK_ROOT)

        self.assertIn(
            "GOVERNANCE_AUTHOR_PROOF_PENDING",
            {finding.code for finding in prebind.findings},
        )
        self.assertNotIn(
            "GOVERNANCE_AUTHOR_PROOF_PENDING",
            {finding.code for finding in bound.findings},
        )
        self.assertTrue(
            hasattr(
                phase0_truth_verifier,
                "verify_governance_author_proof",
            )
        )

    def test_rollout_index_links_final_answer_to_task_complete(self) -> None:
        """A final answer must precede its exact same-turn completion event."""
        proof = phase0_truth_verifier.load_json(
            TRACK_ROOT
            / "role-receipts/phase0"
            / "phase0-truth-author-provider-attestation-v1.json"
        )
        child_path = Path(proof["source_rollout_bindings"]["child"]["path"])
        index = phase0_truth_verifier._indexed_rollout(child_path)
        turn_id = proof["end_event"]["id"]
        final = index["finals"][turn_id]
        completion = index["task_completes"][turn_id]

        self.assertLess(final["line"], completion["line"])
        self.assertEqual(
            completion["record"]["payload"]["last_agent_message"],
            phase0_truth_verifier._message_text(final["record"]["payload"]),
        )

    def test_initial_task_allows_later_same_parent_followups(self) -> None:
        """The spawn task stays first across same-parent followups."""
        task_path = "/root/t9_phase0_governance_author"

        def agent_message(message_type: str, payload: str) -> bytes:
            """Builds one realistic encrypted inter-agent delivery record.

            Args:
                message_type: Provider delivery type to encode.
                payload: Encrypted provider payload placeholder.

            Returns:
                One newline-terminated JSONL record.
            """
            text = (
                f"Message Type: {message_type}\n"
                f"Task name: {task_path}\n"
                "Sender: /root\n"
                f"Payload:\n{payload}"
            )
            record = {
                "timestamp": "2026-07-24T12:00:00Z",
                "type": "response_item",
                "payload": {
                    "type": "agent_message",
                    "recipient": task_path,
                    "content": [
                        {"type": "input_text", "text": text},
                        {
                            "type": "encrypted_content",
                            "encrypted_content": payload,
                        },
                    ],
                },
            }
            return json.dumps(record, separators=(",", ":")).encode() + b"\n"

        assistant_record = {
            "timestamp": "2026-07-24T12:00:01Z",
            "type": "response_item",
            "payload": {
                "type": "message",
                "role": "assistant",
                "phase": "commentary",
                "content": [{"type": "output_text", "text": "Working."}],
            },
        }
        assistant_raw = (
            json.dumps(assistant_record, separators=(",", ":")).encode() + b"\n"
        )
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "child.jsonl"
            path.write_bytes(
                agent_message("NEW_TASK", "initial encrypted prompt")
                + assistant_raw
                + agent_message("MESSAGE", "status request")
                + agent_message("NEW_TASK", "followup correction one")
                + agent_message("NEW_TASK", "followup correction two")
                + agent_message("NEW_TASK", "followup correction three")
            )
            index = phase0_truth_verifier._indexed_rollout(path)
            initial, routed = (
                phase0_truth_verifier._governance_task_message_sequence(
                    index,
                    task_path,
                    "/root",
                )
            )

            self.assertEqual(initial["line"], 1)
            self.assertEqual(len(routed), 5)
            self.assertEqual(
                [
                    phase0_truth_verifier._agent_message_headers(
                        item["record"]["payload"]
                    )["message_type"]
                    for item in routed
                ],
                ["NEW_TASK", "MESSAGE", "NEW_TASK", "NEW_TASK", "NEW_TASK"],
            )

    def test_task_complete_allows_one_memory_citation_suffix(self) -> None:
        """Lifecycle text may omit one valid trailing memory citation."""
        body = "Exact response body."
        citation = (
            "<oai-mem-citation>\n"
            "<citation_entries>\n"
            "MEMORY.md:1-2|note=[bounded context]\n"
            "</citation_entries>\n"
            "<rollout_ids>\n"
            "019f6d5b-e6a3-7ad3-8c77-4d47fa3404fb\n"
            "</rollout_ids>\n"
            "</oai-mem-citation>"
        )

        self.assertTrue(
            phase0_truth_verifier._task_complete_matches_final(body, body)
        )
        self.assertTrue(
            phase0_truth_verifier._task_complete_matches_final(
                body,
                body + citation,
            )
        )

    def test_task_complete_rejects_noncanonical_final_suffixes(self) -> None:
        """Malformed or repeated citation suffixes remain invalid."""
        body = "Exact response body."
        citation = (
            "<oai-mem-citation>"
            "<citation_entries>MEMORY.md:1-2|note=[bounded]</citation_entries>"
            "<rollout_ids>019f6d5b-e6a3-7ad3-8c77-4d47fa3404fb</rollout_ids>"
            "</oai-mem-citation>"
        )
        rejected = {
            "arbitrary": body + "not a citation",
            "truncated": body + citation[:-8],
            "multiple": body + citation + citation,
        }

        for name, final_text in rejected.items():
            with self.subTest(name=name):
                self.assertFalse(
                    phase0_truth_verifier._task_complete_matches_final(
                        body,
                        final_text,
                    )
                )

    def test_parent_prefix_allows_append_but_rejects_prefix_mutation(
        self,
    ) -> None:
        """Parent suffix growth must preserve the frozen spawn prefix."""
        prefix = (
            b'{"type":"response_item","payload":'
            b'{"type":"function_call_output"}}\n'
        )
        binding = {
            "prefix_bytes": len(prefix),
            "prefix_sha256": hashlib.sha256(prefix).hexdigest(),
        }
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "parent.jsonl"
            path.write_bytes(prefix)
            self.assertTrue(
                phase0_truth_verifier._parent_prefix_matches(path, binding)
            )

            with path.open("ab") as handle:
                handle.write(
                    b'{"type":"event_msg","payload":{"type":"later"}}\n'
                )
            self.assertTrue(
                phase0_truth_verifier._parent_prefix_matches(path, binding)
            )

            changed = bytearray(path.read_bytes())
            changed[0] = ord("[")
            path.write_bytes(changed)
            self.assertFalse(
                phase0_truth_verifier._parent_prefix_matches(path, binding)
            )

    def test_owner_direction_requires_exact_delegation_and_direction(
        self,
    ) -> None:
        """Altered, historical, interrupted, or wrong-thread events fail."""
        budget = phase0_truth_verifier.load_json(
            TRACK_ROOT / "phase0-budget-stop-loss-pending-v1.json"
        )
        contract = budget["fix_review_cycle_stop_loss"][
            "delegated_owner_direction_contract"
        ]
        ledger = {
            "failed_cycle_count": 2,
            "cycles": [
                {"final_response": {"timestamp": "2026-07-24T04:47:09.034Z"}},
                {"final_response": {"timestamp": "2026-07-24T06:51:16.685Z"}},
            ],
        }

        def build(
            path: Path,
            delegation_text: str,
            delegation_time: str,
            *,
            assistant_text: str | None = None,
            intervening: bool = False,
            same_turn: bool = True,
        ) -> tuple[dict[str, object], dict[str, object]]:
            """Builds one synthetic delegated-owner evidence prefix.

            Args:
                path: Temporary rollout path to write.
                delegation_text: Synthetic user delegation text.
                delegation_time: Synthetic delegation timestamp.
                assistant_text: Optional replacement direction text.
                intervening: Whether to insert another user record.
                same_turn: Whether both records share one turn identifier.

            Returns:
                The synthetic event and its verification context.
            """
            owner_turn = "owner-turn"
            direction_turn = owner_turn if same_turn else "other-turn"
            direction_text = (
                assistant_text or contract["exact_assistant_direction_text"]
            )
            records = [
                {
                    "timestamp": "2026-07-23T10:00:00.000Z",
                    "type": "session_meta",
                    "payload": {"id": contract["root_session_id"]},
                },
                {
                    "timestamp": delegation_time,
                    "type": "response_item",
                    "payload": {
                        "type": "message",
                        "role": "user",
                        "content": [
                            {
                                "type": "input_text",
                                "text": delegation_text,
                            }
                        ],
                        "internal_chat_message_metadata_passthrough": {
                            "turn_id": owner_turn
                        },
                    },
                },
            ]
            if intervening:
                records.append(
                    {
                        "timestamp": "2026-07-24T09:51:35.000Z",
                        "type": "response_item",
                        "payload": {
                            "type": "message",
                            "role": "user",
                            "content": [
                                {
                                    "type": "input_text",
                                    "text": "Do not continue.",
                                }
                            ],
                        },
                    }
                )
            records.append(
                {
                    "timestamp": "2026-07-24T09:51:39.923Z",
                    "type": "response_item",
                    "payload": {
                        "type": "message",
                        "role": "assistant",
                        "content": [
                            {"type": "output_text", "text": direction_text}
                        ],
                        "internal_chat_message_metadata_passthrough": {
                            "turn_id": direction_turn
                        },
                    },
                }
            )
            raw = [
                json.dumps(record, separators=(",", ":")).encode() + b"\n"
                for record in records
            ]
            path.write_bytes(b"".join(raw))
            assistant_line = len(records)
            event = {
                "schema_version": ("apk-t9-delegated-owner-direction-event.v1"),
                "root_rollout_path": str(path),
                "root_session_id": contract["root_session_id"],
                "cycle_ledger_path": (contract["cycle_ledger_path"]),
                "cycle_ledger_sha256": (contract["cycle_ledger_sha256"]),
                "source_prefix_bytes": path.stat().st_size,
                "source_prefix_sha256": hashlib.sha256(
                    path.read_bytes()
                ).hexdigest(),
                "user_delegation": {
                    "record_line": 2,
                    "timestamp": records[1]["timestamp"],
                    "record_sha256": hashlib.sha256(
                        raw[1].rstrip()
                    ).hexdigest(),
                    "text_sha256": hashlib.sha256(
                        delegation_text.encode()
                    ).hexdigest(),
                },
                "assistant_direction": {
                    "record_line": assistant_line,
                    "timestamp": records[-1]["timestamp"],
                    "record_sha256": hashlib.sha256(
                        raw[-1].rstrip()
                    ).hexdigest(),
                    "text_sha256": hashlib.sha256(
                        direction_text.encode()
                    ).hexdigest(),
                },
            }
            local_contract = copy.deepcopy(contract)
            local_contract["root_rollout_path"] = str(path)
            proof = {
                "parent_session_id": contract["root_session_id"],
                "source_rollout_bindings": {"parent": {"path": str(path)}},
            }
            return event, {
                "contract": local_contract,
                "proof": proof,
                "ledger": ledger,
            }

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            accepted, context = build(
                root / "accepted.jsonl",
                contract["exact_user_delegation_text"],
                "2026-07-24T09:51:30.339Z",
            )
            self.assertTrue(
                phase0_truth_verifier._delegated_owner_direction_matches(
                    accepted, **context
                )
            )
            later_feedback = {
                "timestamp": "2026-07-24T10:00:00.000Z",
                "type": "response_item",
                "payload": {
                    "type": "message",
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": "Continue with the delegated decision.",
                        }
                    ],
                },
            }
            with (root / "accepted.jsonl").open("ab") as handle:
                handle.write(
                    json.dumps(
                        later_feedback,
                        separators=(",", ":"),
                    ).encode()
                    + b"\n"
                )
            self.assertTrue(
                phase0_truth_verifier._delegated_owner_direction_matches(
                    accepted, **context
                )
            )
            cases = [
                build(
                    root / "altered-delegation.jsonl",
                    "You are an observer.",
                    "2026-07-24T09:51:30.339Z",
                ),
                build(
                    root / "historical.jsonl",
                    contract["exact_user_delegation_text"],
                    "2000-01-01T00:00:00.000Z",
                ),
                build(
                    root / "intervening.jsonl",
                    contract["exact_user_delegation_text"],
                    "2026-07-24T09:51:30.339Z",
                    intervening=True,
                ),
                build(
                    root / "altered-direction.jsonl",
                    contract["exact_user_delegation_text"],
                    "2026-07-24T09:51:30.339Z",
                    assistant_text="Continue without evidence.",
                ),
                build(
                    root / "wrong-turn.jsonl",
                    contract["exact_user_delegation_text"],
                    "2026-07-24T09:51:30.339Z",
                    same_turn=False,
                ),
            ]
            replayed = copy.deepcopy(accepted)
            replayed["cycle_ledger_sha256"] = "f" * 64
            cases.append((replayed, context))
            wrong_thread = copy.deepcopy(accepted)
            wrong_thread["root_session_id"] = "wrong-thread"
            cases.append((wrong_thread, context))
            missing = copy.deepcopy(accepted)
            missing["assistant_direction"]["record_line"] = 99
            cases.append((missing, context))
            for candidate, candidate_context in cases:
                self.assertFalse(
                    phase0_truth_verifier._delegated_owner_direction_matches(
                        candidate, **candidate_context
                    )
                )

    def test_cycle_ledger_rederives_two_live_failed_reviews(self) -> None:
        """Falsified scalar, ledger, or reviewer-final bindings fail."""
        budget = phase0_truth_verifier.load_json(
            TRACK_ROOT / "phase0-budget-stop-loss-pending-v1.json"
        )
        ledger = phase0_truth_verifier.load_json(
            TRACK_ROOT / "phase0-fix-review-cycle-ledger-v1.json"
        )
        self.assertEqual(
            phase0_truth_verifier.verify_fix_review_cycle_ledger(
                TRACK_ROOT, budget, ledger
            ),
            (),
        )
        first_rollout = ledger["cycles"][0]["reviewer_rollout"]
        first_path = Path(first_rollout["path"])
        self.assertGreater(first_path.stat().st_size, first_rollout["bytes"])
        self.assertTrue(
            phase0_truth_verifier._prefix_matches(
                first_path,
                first_rollout["bytes"],
                first_rollout["sha256"],
            )
        )
        first_index = phase0_truth_verifier._indexed_rollout(first_path)
        bound_final = first_index["finals"][
            ledger["cycles"][0]["final_response"]["turn_id"]
        ]
        bound_complete = first_index["task_completes"][
            ledger["cycles"][0]["task_complete"]["turn_id"]
        ]
        self.assertEqual(
            bound_final["line"],
            max(item["line"] for item in first_index["finals"].values()),
        )
        self.assertEqual(
            bound_complete["line"],
            max(
                item["line"] for item in first_index["task_completes"].values()
            ),
        )
        cases = []
        scalar = copy.deepcopy(budget)
        scalar["observed_state"]["failed_fix_review_cycles"] = 3
        cases.append((scalar, ledger))
        false_ledger = copy.deepcopy(ledger)
        false_ledger["failed_cycle_count"] = 3
        cases.append((budget, false_ledger))
        false_final = copy.deepcopy(ledger)
        false_final["cycles"][1]["final_response"]["record_sha256"] = "0" * 64
        cases.append((budget, false_final))
        for candidate_budget, candidate_ledger in cases:
            self.assertTrue(
                phase0_truth_verifier.verify_fix_review_cycle_ledger(
                    TRACK_ROOT, candidate_budget, candidate_ledger
                )
            )

    def test_current_receipt_rejects_missing_tampered_and_substituted(
        self,
    ) -> None:
        """The current receipt must use the exact cycle-safe v2 schema."""
        self.assertTrue(
            phase0_truth_verifier.verify_current_governance_receipt(
                TRACK_ROOT, {}, None, None
            )
        )
        current = phase0_truth_verifier.load_json(
            TRACK_ROOT / phase0_truth_verifier.CURRENT_GOVERNANCE_RECEIPT_PATH
        )
        tampered = copy.deepcopy(current)
        tampered["status"] = "tampered"
        historical = phase0_truth_verifier.load_json(
            TRACK_ROOT
            / "role-receipts/phase0/truth-test-author-pending-v1.json"
        )
        for candidate in (tampered, historical):
            self.assertTrue(
                phase0_truth_verifier.verify_current_governance_receipt(
                    TRACK_ROOT, {}, candidate, "0" * 64
                )
            )


if __name__ == "__main__":
    unittest.main()
