"""Focused contracts for the committed APK inventory production bridge."""

from __future__ import annotations

import copy
import hashlib
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from typing import Any, Mapping

from measure.evidence_integrity_gates.apk_inventory_live import (
    APKInventoryLiveError,
    TRACK_DIRECTORY,
    canonical_task_prompt,
    load_live_phase_bundle,
    normalize_resolved_event,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
SYNTHETIC_PHASE3_REVISION = "d" * 40


def _canonical(value: object) -> str:
    """Returns compact canonical JSON for synthetic production keys."""
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def _digest(value: bytes) -> str:
    """Returns one lowercase SHA-256 digest."""
    return hashlib.sha256(value).hexdigest()


class FrozenBlobSource:
    """Serves synthetic immutable artifact bytes without a worktree fallback."""

    def __init__(
        self,
        documents: Mapping[str, Mapping[str, Any]],
        *,
        unrelated: bool = False,
    ) -> None:
        """Canonicalizes synthetic documents into exact frozen bytes."""
        self.unrelated = unrelated
        self.bytes = {
            f"{TRACK_DIRECTORY}/{name}": (
                json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n"
            ).encode()
            for name, value in documents.items()
        }

    def resolve_blob_bytes(self, revision: str, path: str) -> bytes:
        """Returns only the frozen byte mapping for the requested artifact."""
        del revision
        return self.bytes[path]

    def is_ancestor(self, ancestor: str, descendant: str) -> bool:
        """Models the synthetic Phase1-to-Phase2-to-Phase3 history relation."""
        if self.unrelated:
            return False
        return (ancestor, descendant) in {
            ("a" * 40, "b" * 40),
            ("b" * 40, "d" * 40),
        }


def _documents(*, blocker: bool = False) -> dict[str, dict[str, Any]]:
    """Builds a minimal complete set of real Phase 1--3 production schemas."""
    evidence = {"revision": "a" * 40, "path": "source.ts", "range": {"start_line": 1, "end_line": 1}}
    file_row = {
        "record_id": "file:source.ts",
        "record_type": "file",
        "file_path": "source.ts",
        "evidence": evidence,
    }
    copy_row = {
        "record_id": "copy:copy.ts",
        "record_type": "copy",
        "copy_source_record_id": "file:source.ts",
        "evidence": evidence,
    }
    edge = {"from_record_id": "file:source.ts", "to_record_id": "copy:copy.ts", "evidence": evidence}
    scene = {"scene_occurrence_id": "scene:1", "scene_id": "Scene", "evidence": evidence}
    idle = {"state_occurrence_id": "state:idle", "source_symbol": "status", "state_id": "idle", "evidence": evidence}
    playing = {"state_occurrence_id": "state:playing", "source_symbol": "status", "state_id": "playing", "evidence": evidence}
    transition = {
        "from_state_occurrence_id": "state:idle",
        "to_state_occurrence_id": "state:playing",
        "source_symbol": "status",
        "from_state_id": "idle",
        "to_state_id": "playing",
        "transition_kind": "phase",
        "evidence": evidence,
    }
    asset = {
        "canonical_path": "public/a.png",
        "sha256": "b" * 64,
        "identical_hash_group": "sha256:" + "b" * 64,
    }
    history_row = {"classification": "deleted", "evidence": evidence}
    observation = {"observation_id": "obs:1", "evidence": [evidence]}
    identity = {
        "canonical_identity_id": "catalog/demo",
        "catalog_identity_id": "demo",
        "catalog_evidence": evidence,
    }
    source_rows = [file_row, copy_row]
    surfaces = [scene, idle, playing, transition]

    raw_file = {"canonical_path": "source.ts"}
    raw_identity = {"catalog_id": "demo", "evidence": evidence}
    raw_idle = {"path": "source.ts", "source_symbol": "status", "state_id": "idle", "evidence": evidence}
    raw_playing = {"path": "source.ts", "source_symbol": "status", "state_id": "playing", "evidence": evidence}
    raw_transition = {
        "path": "source.ts", "source_symbol": "status", "from_state_id": "idle",
        "to_state_id": "playing", "evidence": evidence,
    }
    raw_asset = {"canonical_path": "public/a.png"}
    raw_history = {"path": "source.ts"}
    symmetric_rows: list[dict[str, Any]] = [
        {
            "category": category,
            "record_key": key,
            "comparison_status": "matched",
            "blocking": False,
            "resolution_status": "compared",
            "mechanical_evidence": mechanical,
            "human_evidence": human,
        }
        for category, key, mechanical, human in (
            ("identities", "demo", [evidence], [evidence]),
            ("files", "source.ts", [evidence], [raw_file]),
            ("states", _canonical(["source.ts", "status", "idle"]), [evidence], [evidence]),
            ("states", _canonical(["source.ts", "status", "playing"]), [evidence], [evidence]),
            ("transitions", _canonical(["source.ts", "status", "idle", "playing", 1]), [evidence], [evidence]),
            ("assets", "public/a.png", [asset], [raw_asset]),
            ("history-paths", "source.ts", [evidence], [raw_history]),
        )
    ]
    symmetric_blockers: list[dict[str, Any]] = []
    unresolved: list[dict[str, Any]] = []
    symmetric_discrepancies: list[dict[str, Any]] = []
    extra_raw_file = {"canonical_path": "missing-source"}
    if blocker:
        blocker_row = {
            "category": "files",
            "record_key": "missing-source",
            "comparison_status": "human-only",
            "blocking": True,
            "resolution_status": "compared",
            "mechanical_evidence": [],
            "human_evidence": [extra_raw_file],
        }
        blocker_id = (
            "independent-symmetric:files:"
            + _digest(blocker_row["record_key"].encode())
        )
        symmetric_rows.append(blocker_row)
        symmetric_blockers.append(blocker_row)
        symmetric_discrepancies.append(
            {
                "discrepancy_key": blocker_id,
                "blocking": True,
                "resolution_status": "unresolved",
                "unresolved_source_id": blocker_id,
            }
        )
        unresolved.append({"unresolved_source_id": blocker_id})

    deleted = {"record_id": "deleted:1", "evidence": evidence}
    duplicate = {"record_id": "dup:1", "evidence": [evidence]}
    program = {"program_identity_label": "Demo Program"}
    discrepancy_keys = {
        "mechanical:obs:1",
        "human-duplicate:dup:1",
        f"historical:{_canonical(evidence)}",
        f"human-historical:{_canonical(evidence)}",
        "human-comparison:obs:1",
    }
    discrepancy_records = [
        {"discrepancy_key": key, "blocking": False, "resolution_status": "matched"}
        for key in sorted(discrepancy_keys)
    ] + symmetric_discrepancies

    documents = {
        "source-denominator.json": {"records": source_rows, "graph_edges": [edge]},
        "game-identity-ledger.json": {"identity_records": [identity]},
        "scene-state-denominator.json": {
            "scene_records": [scene],
            "state_records": [idle, playing],
            "transitions": [transition],
            "transition_write_candidates": [],
        },
        "asset-file-denominator.json": {"candidate_files": [asset]},
        "historical-source-denominator.json": {"records": [history_row]},
        "denominator-discrepancies.json": {"records": [observation]},
        "independent-human-discovery.json": {
            "status": "independent-human-discovery-complete",
            "raw_frozen_source_discovery": {
                "raw_file_records": [raw_file] + ([extra_raw_file] if blocker else []),
                "raw_identity_records": [raw_identity],
                "raw_route_records": [],
                "raw_state_records": [raw_idle, raw_playing],
                "raw_transition_records": [raw_transition],
                "raw_transition_write_candidates": [],
                "raw_asset_records": [raw_asset],
                "raw_history_records": [raw_history],
            },
            "mechanical_source_record_reviews": [
                {"mechanical_record_id": row["record_id"]} for row in source_rows
            ],
            "mechanical_graph_edge_reviews": [
                {"mechanical_graph_edge_key": _canonical(edge)}
            ],
            "surface_reviews": [
                {"mechanical_surface_key": _canonical(row)} for row in surfaces
            ],
            "asset_candidate_reviews": [{"canonical_path": asset["canonical_path"]}],
            "identical_hash_group_reviews": [
                {"identical_hash_group": asset["identical_hash_group"]}
            ],
            "replacement_program_identity_reviews": [program],
        },
        "human-duplicate-drift-records.json": {
            "status": "independent-human-discovery-complete",
            "mechanical_copy_record_reviews": [
                {"mechanical_copy_record_id": copy_row["record_id"]}
            ],
            "duplicate_drift_records": [duplicate],
        },
        "human-historical-deleted-records.json": {
            "status": "independent-human-discovery-complete",
            "mechanical_historical_locator_reviews": [
                {"mechanical_locator_key": _canonical(evidence)}
            ],
            "historical_deleted_records": [deleted],
        },
        "human-discrepancy-records.json": {
            "status": (
                "independent-human-reconciliation-blocked"
                if blocker
                else "independent-human-discovery-complete"
            ),
            "coverage_status": "blocked" if blocker else "complete",
            "identity_comparison_records": [
                {"canonical_identity_id": identity["canonical_identity_id"]}
            ],
            "mechanical_observation_records": [{"observation_id": "obs:1"}],
            "program_identity_disposition_records": [program],
            "independent_symmetric_reconciliation": symmetric_rows,
            "independent_symmetric_blocking_records": symmetric_blockers,
        },
        "phase3-reconciliation.json": {
            "status": "reconciliation-blocked" if blocker else "reconciliation-complete",
            "source_record_reconciliation_records": [
                {"mechanical_record_id": row["record_id"], "blocking": False}
                for row in source_rows
            ],
            "file_reconciliation_records": [
                {"mechanical_record_id": file_row["record_id"], "blocking": False}
            ],
            "graph_edge_reconciliation_records": [
                {"mechanical_graph_edge_key": _canonical(edge), "blocking": False}
            ],
            "surface_reconciliation_records": [
                {"mechanical_surface": row, "blocking": False} for row in surfaces
            ],
            "asset_candidate_reconciliation_records": [
                {"canonical_path": asset["canonical_path"], "blocking": False}
            ],
            "identity_reconciliation_records": [
                {"canonical_identity_id": identity["canonical_identity_id"], "blocking": False}
            ],
            "copy_reconciliation_records": [
                {"mechanical_copy_record_id": copy_row["record_id"], "blocking": False}
            ],
            "identical_hash_group_reconciliation_records": [
                {"identical_hash_group": asset["identical_hash_group"], "blocking": False}
            ],
            "replacement_program_identity_records": [
                {"program_identity_label": program["program_identity_label"], "blocking": False}
            ],
            "discrepancy_reconciliation_records": discrepancy_records,
            "unresolved_sources": unresolved,
        },
    }
    phase1_names = (
        "source-denominator.json",
        "game-identity-ledger.json",
        "scene-state-denominator.json",
        "asset-file-denominator.json",
        "historical-source-denominator.json",
        "denominator-discrepancies.json",
    )
    phase2_names = (
        "independent-human-discovery.json",
        "human-duplicate-drift-records.json",
        "human-historical-deleted-records.json",
        "human-discrepancy-records.json",
    )
    phase1_revision = "a" * 40
    phase2_revision = "b" * 40
    baseline = "c" * 40
    schemas = {
        "source-denominator.json": "apk-source-denominator.v1",
        "game-identity-ledger.json": "apk-game-identity-ledger.v1",
        "scene-state-denominator.json": "apk-scene-state-denominator.v1",
        "asset-file-denominator.json": "apk-asset-file-denominator.v1",
        "historical-source-denominator.json": "apk-historical-source-denominator.v1",
        "denominator-discrepancies.json": "apk-denominator-discrepancies.v1",
        "independent-human-discovery.json": "apk-denominator-independent-human-discovery.v1",
        "human-duplicate-drift-records.json": "apk-denominator-human-duplicate-drift.v1",
        "human-historical-deleted-records.json": "apk-denominator-human-historical-deleted.v1",
        "human-discrepancy-records.json": "apk-denominator-human-discrepancies.v1",
        "phase3-reconciliation.json": "apk-source-denominator-phase3-reconciliation.v1",
    }
    for name, schema in schemas.items():
        documents[name]["schema_version"] = schema
        documents[name]["source_baseline_revision"] = baseline
    for name in phase1_names:
        documents[name]["status"] = "mechanical-discovery-complete"
    for field, rows in documents["phase3-reconciliation.json"].items():
        if field.endswith("_records") and isinstance(rows, list):
            for row in rows:
                row["resolution_status"] = (
                    "unresolved-source" if row.get("blocking") is True else "matched"
                )
    phase1_hashes = {
        f"{TRACK_DIRECTORY}/{name}": _digest(
            (_canonical(documents[name]) + "\n").encode()
        )
        for name in phase1_names
    }
    phase2_input = {
        "revision": phase1_revision,
        "artifact_sha256": phase1_hashes,
    }
    for name in phase2_names:
        documents[name]["input_provenance"] = phase2_input
    phase2_hashes = {
        f"{TRACK_DIRECTORY}/{name}": _digest(
            (_canonical(documents[name]) + "\n").encode()
        )
        for name in phase2_names
    }
    documents["phase3-reconciliation.json"]["input_provenance"] = {
        "phase1": {"revision": phase1_revision, "output_hashes": phase1_hashes},
        "phase2": {
            "receipt_revision": phase2_revision,
            "consumed_output_hashes": phase2_hashes,
        },
    }
    return documents


def _refresh_phase3_hash_provenance(documents: dict[str, dict[str, Any]]) -> None:
    """Rebinds Phase-3 hashes after an intentional deeper-layer mutation."""
    phase1_names = (
        "source-denominator.json", "game-identity-ledger.json",
        "scene-state-denominator.json", "asset-file-denominator.json",
        "historical-source-denominator.json", "denominator-discrepancies.json",
    )
    phase2_names = (
        "independent-human-discovery.json", "human-duplicate-drift-records.json",
        "human-historical-deleted-records.json", "human-discrepancy-records.json",
    )
    phase1_hashes = {
        f"{TRACK_DIRECTORY}/{name}": _digest((_canonical(documents[name]) + "\n").encode())
        for name in phase1_names
    }
    phase2_input = {"revision": "a" * 40, "artifact_sha256": phase1_hashes}
    for name in phase2_names:
        documents[name]["input_provenance"] = phase2_input
    phase2_hashes = {
        f"{TRACK_DIRECTORY}/{name}": _digest((_canonical(documents[name]) + "\n").encode())
        for name in phase2_names
    }
    documents["phase3-reconciliation.json"]["input_provenance"] = {
        "phase1": {"revision": "a" * 40, "output_hashes": phase1_hashes},
        "phase2": {"receipt_revision": "b" * 40, "consumed_output_hashes": phase2_hashes},
    }


class APKInventoryLiveArtifactTests(unittest.TestCase):
    """Falsifies schema aliases, omissions, stale coverage, and mutable reads."""

    def test_synthetic_complete_real_schema_bundle_passes(self) -> None:
        """Accepts a complete real-schema projection with exact predecessor keys."""
        documents = _documents()
        bundle = load_live_phase_bundle(
            REPO_ROOT, SYNTHETIC_PHASE3_REVISION, FrozenBlobSource(documents)
        )
        self.assertEqual(len(bundle["phase1"]["source_records"]), 2)
        self.assertEqual(bundle["phase3"]["unresolved_sources"], [])

    def test_synthetic_blocker_is_exactly_propagated_and_rejected(self) -> None:
        """Rejects a blocker only after its Phase-3 ID is proved one-to-one."""
        documents = _documents(blocker=True)
        with self.assertRaises(APKInventoryLiveError) as raised:
            load_live_phase_bundle(REPO_ROOT, SYNTHETIC_PHASE3_REVISION, FrozenBlobSource(documents))
        self.assertEqual(raised.exception.code, "UNRESOLVED_INVENTORY_BLOCKERS")

    def test_real_schema_omission_fails_closed(self) -> None:
        """Rejects an omitted production review collection without record-set aliases."""
        documents = _documents()
        del documents["independent-human-discovery.json"]["mechanical_source_record_reviews"]
        _refresh_phase3_hash_provenance(documents)
        with self.assertRaises(APKInventoryLiveError) as raised:
            load_live_phase_bundle(REPO_ROOT, SYNTHETIC_PHASE3_REVISION, FrozenBlobSource(documents))
        self.assertEqual(raised.exception.code, "ARTIFACT_SCHEMA_INVALID")

    def test_incomplete_phase_statuses_fail_closed_even_without_blocker_rows(self) -> None:
        """Rejects false completion when any Phase-2/3 status or coverage is incomplete."""
        cases = (
            ("independent-human-discovery.json", "status", "blocked"),
            ("human-duplicate-drift-records.json", "status", "blocked"),
            ("human-historical-deleted-records.json", "status", "blocked"),
            ("human-discrepancy-records.json", "status", "independent-human-reconciliation-blocked"),
            ("human-discrepancy-records.json", "coverage_status", "blocked"),
            ("phase3-reconciliation.json", "status", "reconciliation-blocked"),
        )
        for artifact, field, value in cases:
            with self.subTest(artifact=artifact, field=field):
                documents = _documents()
                documents[artifact][field] = value
                _refresh_phase3_hash_provenance(documents)
                with self.assertRaises(APKInventoryLiveError) as raised:
                    load_live_phase_bundle(REPO_ROOT, SYNTHETIC_PHASE3_REVISION, FrozenBlobSource(documents))
                self.assertEqual(raised.exception.code, "INVENTORY_PHASE_INCOMPLETE")

    def test_raw_symmetric_key_mutation_is_rejected(self) -> None:
        """Rejects declared matched rows when independently discovered raw keys drift."""
        documents = _documents()
        documents["independent-human-discovery.json"]["raw_frozen_source_discovery"]["raw_file_records"][0]["canonical_path"] = "substituted.ts"
        _refresh_phase3_hash_provenance(documents)
        with self.assertRaises(APKInventoryLiveError) as raised:
            load_live_phase_bundle(REPO_ROOT, SYNTHETIC_PHASE3_REVISION, FrozenBlobSource(documents))
        self.assertEqual(raised.exception.code, "SYMMETRIC_RECONCILIATION_MISMATCH")

    def test_committed_loader_ignores_mutated_worktree_artifact(self) -> None:
        """Reads committed blobs even when the corresponding worktree file is corrupted."""
        documents = _documents()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            subprocess.run(("git", "init", "-q"), cwd=root, check=True)
            subprocess.run(("git", "config", "user.email", "test@example.com"), cwd=root, check=True)
            subprocess.run(("git", "config", "user.name", "Test"), cwd=root, check=True)
            track = root / TRACK_DIRECTORY
            track.mkdir(parents=True)
            phase1_names = (
                "source-denominator.json", "game-identity-ledger.json",
                "scene-state-denominator.json", "asset-file-denominator.json",
                "historical-source-denominator.json", "denominator-discrepancies.json",
            )
            phase2_names = (
                "independent-human-discovery.json", "human-duplicate-drift-records.json",
                "human-historical-deleted-records.json", "human-discrepancy-records.json",
            )
            for name in phase1_names:
                value = documents[name]
                (track / name).write_text(
                    json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n",
                    encoding="utf-8",
                )
            subprocess.run(("git", "add", TRACK_DIRECTORY), cwd=root, check=True)
            subprocess.run(("git", "commit", "-qm", "phase1"), cwd=root, check=True)
            phase1_revision = subprocess.check_output(
                ("git", "rev-parse", "HEAD"), cwd=root, text=True
            ).strip()
            phase1_hashes = {
                f"{TRACK_DIRECTORY}/{name}": _digest((track / name).read_bytes())
                for name in phase1_names
            }
            for name in phase2_names:
                documents[name]["input_provenance"] = {
                    "revision": phase1_revision,
                    "artifact_sha256": phase1_hashes,
                }
                (track / name).write_text(
                    _canonical(documents[name]) + "\n", encoding="utf-8"
                )
            subprocess.run(("git", "add", TRACK_DIRECTORY), cwd=root, check=True)
            subprocess.run(("git", "commit", "-qm", "phase2"), cwd=root, check=True)
            phase2_revision = subprocess.check_output(
                ("git", "rev-parse", "HEAD"), cwd=root, text=True
            ).strip()
            phase2_hashes = {
                f"{TRACK_DIRECTORY}/{name}": _digest((track / name).read_bytes())
                for name in phase2_names
            }
            documents["phase3-reconciliation.json"]["input_provenance"] = {
                "phase1": {"revision": phase1_revision, "output_hashes": phase1_hashes},
                "phase2": {
                    "receipt_revision": phase2_revision,
                    "consumed_output_hashes": phase2_hashes,
                },
            }
            (track / "phase3-reconciliation.json").write_text(
                _canonical(documents["phase3-reconciliation.json"]) + "\n",
                encoding="utf-8",
            )
            subprocess.run(("git", "add", TRACK_DIRECTORY), cwd=root, check=True)
            subprocess.run(("git", "commit", "-qm", "phase3"), cwd=root, check=True)
            revision = subprocess.check_output(
                ("git", "rev-parse", "HEAD"), cwd=root, text=True
            ).strip()
            linear = load_live_phase_bundle(root, revision)
            self.assertEqual(linear["phase3"]["unresolved_sources"], [])
            phase2_tree = subprocess.check_output(
                ("git", "rev-parse", f"{phase2_revision}^{{tree}}"), cwd=root, text=True
            ).strip()
            unrelated_phase2 = subprocess.check_output(
                ("git", "commit-tree", phase2_tree, "-m", "unrelated phase2 root"),
                cwd=root,
                text=True,
            ).strip()
            documents["phase3-reconciliation.json"]["input_provenance"]["phase2"][
                "receipt_revision"
            ] = unrelated_phase2
            (track / "phase3-reconciliation.json").write_text(
                _canonical(documents["phase3-reconciliation.json"]) + "\n",
                encoding="utf-8",
            )
            subprocess.run(("git", "add", TRACK_DIRECTORY), cwd=root, check=True)
            subprocess.run(("git", "commit", "-qm", "phase3 unrelated predecessor"), cwd=root, check=True)
            unrelated_revision = subprocess.check_output(
                ("git", "rev-parse", "HEAD"), cwd=root, text=True
            ).strip()
            with self.assertRaises(APKInventoryLiveError) as raised:
                load_live_phase_bundle(root, unrelated_revision)
            self.assertEqual(raised.exception.code, "INPUT_PROVENANCE_INVALID")
            (track / "phase3-reconciliation.json").write_text(
                '{"record_sets":"mutable-forgery"}\n', encoding="utf-8"
            )
            bundle = load_live_phase_bundle(root, revision)
            self.assertEqual(bundle["phase3"]["unresolved_sources"], [])

    def test_current_committed_bundle_rejects_stale_predecessor_provenance(self) -> None:
        """Keeps the live smoke RED until committed phases bind exact predecessor blobs."""
        revision = subprocess.check_output(
            ("git", "rev-parse", "HEAD"), cwd=REPO_ROOT, text=True
        ).strip()
        with self.assertRaises(APKInventoryLiveError) as raised:
            load_live_phase_bundle(REPO_ROOT, revision)
        self.assertEqual(raised.exception.code, "INPUT_PROVENANCE_INVALID")


class APKInventoryLiveEventTests(unittest.TestCase):
    """Requires exact task-envelope and receipt binding before normalization."""

    def setUp(self) -> None:
        """Builds one fully bound synthetic provider event and receipt."""
        self.task = {
            "task_id": "evidence-collector:asset-history-denominator",
            "owner_role": "evidence-collector",
            "forbidden_roles": ["discovery-auditor", "requirements-mapper"],
            "reviewer_role": "adversarial-reviewer",
            "expected_outputs": ["one.json"],
        }
        prompt = canonical_task_prompt(self.task)
        final = b"complete"
        prompt_text = prompt.decode()
        final_text = final.decode()
        raw_export = _canonical({
            "info": {
                "id": "ses_child",
                "parentID": "ses_root",
                "time": {"created": 0, "updated": 3},
            },
            "messages": [
                {
                    "info": {"id": "msg_start", "sessionID": "ses_child", "role": "user", "time": {"created": 1}},
                    "parts": [{"type": "text", "id": "prt_prompt", "text": prompt_text}],
                },
                {
                    "info": {"id": "msg_end", "sessionID": "ses_child", "parentID": "msg_start", "role": "assistant", "time": {"created": 2, "completed": 3}},
                    "parts": [{"type": "text", "id": "prt_final", "text": final_text}],
                },
            ],
        }).encode()
        prompt_parts = _canonical([{"id": "prt_prompt", "text": prompt_text}]).encode()
        final_parts = _canonical([{"id": "prt_final", "text": final_text}]).encode()
        output_hashes = {f"{TRACK_DIRECTORY}/one.json": "c" * 64}
        raw_document = json.loads(raw_export)
        messages = raw_document["messages"]
        parts = [part for message in messages for part in message["parts"]]
        context_bytes = _canonical({
            "schema_version": "apk-provider-context-manifest.v2",
            "provider": "opencode-export",
            "raw_export_sha256": _digest(raw_export),
            "raw_export_bytes": len(raw_export),
            "session_id": "ses_child",
            "parent_session_id": "ses_root",
            "session_created_at_ms": 0,
            "session_updated_at_ms": 3,
            "message_count": 2,
            "part_count": 2,
            "user_prompt_count": 1,
            "first_user_message_id": "msg_start",
            "final_assistant_message_id": "msg_end",
            "message_ledger_sha256": _digest(_canonical(messages).encode()),
            "message_ledger_hash_basis": "SHA-256 of the raw export messages array serialized as canonical compact JSON with sorted keys and UTF-8 encoding.",
            "part_ledger_sha256": _digest(_canonical(parts).encode()),
            "part_ledger_hash_basis": "SHA-256 of all raw export message parts flattened in provider message order and serialized as canonical compact JSON with sorted keys and UTF-8 encoding.",
            "raw_write_inventory": [f"{TRACK_DIRECTORY}/one.json"],
            "schema_omissions": ["fork_turns"],
        }).encode()
        actual_usage = {"tokens": 1000}
        budget_bytes = _canonical({
            "schema_version": "apk-role-budget-declaration.v1",
            "actual_usage": actual_usage,
        }).encode()
        self.event = {
            "provenance_kind": "opencode-raw-export",
            "raw_export_bytes": raw_export,
            "raw_export_sha256": _digest(raw_export),
            "session_id": "ses_child",
            "session_parent_id": "ses_root",
            "prompt_bytes": prompt,
            "final_response_bytes": final,
            "canonical_prompt_sha256": _digest(prompt_parts),
            "canonical_final_response_sha256": _digest(final_parts),
            "prompt_content_sha256": _digest(prompt),
            "final_response_content_sha256": _digest(final),
            "output_sha256": output_hashes,
            "actual_context_manifest_sha256": _digest(context_bytes),
            "budget_declaration_sha256": _digest(budget_bytes),
            "attested_manifest_bytes": {
                "actual_context_manifest_sha256": context_bytes,
                "budget_declaration_sha256": budget_bytes,
            },
            "start_event_id": "msg_start",
            "id": "msg_end",
            "prompt_message_id": "msg_start",
            "final_response_message_id": "msg_end",
            "raw_write_inventory": [f"{TRACK_DIRECTORY}/one.json"],
            "schema_omissions": ["fork_turns"],
        }
        self.receipt = {
            "task_id": self.task["task_id"],
            "role": self.task["owner_role"],
            "spawn_id": self.event["session_id"],
            "parent_ancestry_ids": ["ses_root"],
            "prompt_sha256": self.event["canonical_prompt_sha256"],
            "final_response_sha256": self.event["canonical_final_response_sha256"],
            "output_hashes": output_hashes,
            "output_sha256": _digest(_canonical(output_hashes).encode()),
            "actual_context_manifest_sha256": self.event["actual_context_manifest_sha256"],
            "budget_declaration_sha256": self.event["budget_declaration_sha256"],
            "start_event_id": self.event["start_event_id"],
            "end_event_id": self.event["id"],
            "actual_usage": actual_usage,
        }

    def test_exact_task_envelope_and_complete_binding_pass(self) -> None:
        """Accepts only the canonical first-prompt JSON and every exact receipt binding."""
        self.assertEqual(
            self.event["prompt_bytes"],
            b'{"expected_outputs":["one.json"],"forbidden_roles":["discovery-auditor","requirements-mapper"],"reviewer_role":"adversarial-reviewer","schema_version":"apk-inventory-task-envelope.v1","task_id":"evidence-collector:asset-history-denominator","task_role":"evidence-collector"}',
        )
        normalized = normalize_resolved_event(self.event, self.task, self.receipt)
        self.assertEqual(normalized["task_id"], self.task["task_id"])
        self.assertEqual(normalized["output_hashes"], self.receipt["output_hashes"])

    def test_every_receipt_binding_mutation_fails_closed(self) -> None:
        """Rejects each independently mutated receipt identity or aggregate binding."""
        mutations = {
            "task_id": "wrong",
            "role": "wrong",
            "spawn_id": "wrong",
            "parent_ancestry_ids": [],
            "prompt_sha256": "0" * 64,
            "final_response_sha256": "0" * 64,
            "output_hashes": {f"{TRACK_DIRECTORY}/one.json": "0" * 64},
            "output_sha256": "0" * 64,
            "actual_context_manifest_sha256": "0" * 64,
            "budget_declaration_sha256": "0" * 64,
            "start_event_id": "wrong",
            "end_event_id": "wrong",
        }
        for field, value in mutations.items():
            with self.subTest(field=field):
                receipt = copy.deepcopy(self.receipt)
                receipt[field] = value
                with self.assertRaises(APKInventoryLiveError):
                    normalize_resolved_event(self.event, self.task, receipt)

    def test_every_provider_binding_mutation_fails_closed(self) -> None:
        """Rejects altered prompt/final hashes, outputs, session, ancestry, and IDs."""
        mutations = {
            "session_id": "wrong",
            "session_parent_id": "wrong",
            "prompt_bytes": b"{}",
            "final_response_bytes": b"wrong",
            "canonical_prompt_sha256": "0" * 64,
            "canonical_final_response_sha256": "0" * 64,
            "output_sha256": {f"{TRACK_DIRECTORY}/one.json": "0" * 64},
            "actual_context_manifest_sha256": "0" * 64,
            "budget_declaration_sha256": "0" * 64,
            "start_event_id": "wrong",
            "id": "wrong",
        }
        for field, value in mutations.items():
            with self.subTest(field=field):
                event = copy.deepcopy(self.event)
                event[field] = value
                with self.assertRaises(APKInventoryLiveError):
                    normalize_resolved_event(event, self.task, self.receipt)

    def test_raw_export_rejects_second_prompt_or_assistant_branch(self) -> None:
        """Rejects later user authority and sibling assistant response branches."""
        for role in ("user", "assistant"):
            with self.subTest(role=role):
                event = copy.deepcopy(self.event)
                raw = json.loads(event["raw_export_bytes"])
                raw["messages"].append({
                    "info": {
                        "id": f"msg_extra_{role}",
                        "sessionID": "ses_child",
                        "parentID": "msg_start",
                        "role": role,
                        "time": {"created": 4, "completed": 5},
                    },
                    "parts": [{"type": "text", "id": f"prt_extra_{role}", "text": "extra"}],
                })
                event["raw_export_bytes"] = _canonical(raw).encode()
                event["raw_export_sha256"] = _digest(event["raw_export_bytes"])
                with self.assertRaises(APKInventoryLiveError) as raised:
                    normalize_resolved_event(event, self.task, self.receipt)
                self.assertEqual(
                    raised.exception.code,
                    "PROVIDER_EVENT_INVALID" if role == "user" else "EVENT_IDENTITY_MISMATCH",
                )


if __name__ == "__main__":
    unittest.main()
