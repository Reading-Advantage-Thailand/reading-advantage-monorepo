"""Committed-artifact and provider-event bridge for the APK inventory gates.

This module is deliberately separate from the acceptance validator.  It translates
the production Phase 1--3 artifact schemas and the exact output of
``build_resolved_event`` into the validator-facing vocabulary without consulting
mutable worktree files.
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any, Mapping, Protocol

from .git_source import GitSourceAdapter, GitSourceError


TRACK_DIRECTORY = "measure/tracks/apk_source_denominator_inventory_20260712"
SHA256 = re.compile(r"[0-9a-f]{64}\Z")
COMMIT_SHA = re.compile(r"[0-9a-f]{40}\Z")

PHASE_ARTIFACT_PATHS: Mapping[str, tuple[str, ...]] = {
    "phase1": (
        "source-denominator.json",
        "game-identity-ledger.json",
        "scene-state-denominator.json",
        "asset-file-denominator.json",
        "historical-source-denominator.json",
        "denominator-discrepancies.json",
    ),
    "phase2": (
        "independent-human-discovery.json",
        "human-duplicate-drift-records.json",
        "human-historical-deleted-records.json",
        "human-discrepancy-records.json",
    ),
    "phase3": ("phase3-reconciliation.json",),
}
EXPECTED_SCHEMAS = {
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


class APKInventoryLiveError(RuntimeError):
    """Reports a stable fail-closed reason from the live artifact bridge."""

    def __init__(self, code: str, message: str) -> None:
        """Initializes a live-bridge failure.

        Args:
            code: Stable machine-readable rejection code.
            message: Human-readable diagnostic.
        """
        super().__init__(message)
        self.code = code


class BlobSource(Protocol):
    """Describes the immutable blob operation required by the bridge."""

    def resolve_blob_bytes(self, revision: str, path: str) -> bytes:
        """Returns exact bytes for one path at one committed revision."""

    def is_ancestor(self, ancestor: str, descendant: str) -> bool:
        """Returns whether the first revision is a strict history predecessor."""


@dataclass(frozen=True)
class CommittedArtifact:
    """Carries a parsed artifact together with its immutable byte identity."""

    revision: str
    path: str
    sha256: str
    raw_bytes: bytes
    value: Mapping[str, Any]


def _sha256(value: bytes) -> str:
    """Returns the lowercase SHA-256 digest of exact bytes."""
    return hashlib.sha256(value).hexdigest()


def _as_mapping(value: object, label: str) -> Mapping[str, Any]:
    """Returns a mapping or rejects the malformed production artifact."""
    if not isinstance(value, Mapping):
        raise APKInventoryLiveError("ARTIFACT_SCHEMA_INVALID", f"{label} must be an object")
    return value


def _as_records(value: object, label: str) -> list[Mapping[str, Any]]:
    """Returns a record list while rejecting missing or non-object rows."""
    if not isinstance(value, list) or any(not isinstance(row, Mapping) for row in value):
        raise APKInventoryLiveError("ARTIFACT_SCHEMA_INVALID", f"{label} must be a list of objects")
    return [row for row in value if isinstance(row, Mapping)]


def _canonical_json(value: object) -> bytes:
    """Serializes JSON with the single compact ordering used by live bindings."""
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode()


def _expected_provider_context_manifest(
    provider_event: Mapping[str, Any], context_bytes: bytes
) -> Mapping[str, Any]:
    """Recomputes the exact provider-context manifest from immutable raw bytes.

    Args:
        provider_event: Event rebuilt directly from the raw provider export.
        context_bytes: Exact attested context-manifest bytes.
    Returns:
        Parsed context manifest after exact semantic and canonical-byte checks.
    Raises:
        APKInventoryLiveError: If the context is malformed or differs from provider facts.
    """
    try:
        context = json.loads(context_bytes)
        raw = provider_event.get("raw_export_bytes")
        if not isinstance(context, Mapping) or not isinstance(raw, bytes):
            raise ValueError("context or raw export is absent")
        export = json.loads(raw)
        info = export["info"]
        messages = export["messages"]
        if not isinstance(info, Mapping) or not isinstance(messages, list):
            raise ValueError("raw provider export is malformed")
        session_time = info.get("time")
        if not isinstance(session_time, Mapping):
            raise ValueError("provider session timestamps are absent")
        parts = [part for message in messages for part in message.get("parts", [])]
        users = [message for message in messages if message.get("info", {}).get("role") == "user"]
        assistants = [
            message for message in messages if message.get("info", {}).get("role") == "assistant"
        ]
        expected: dict[str, Any] = {
            "schema_version": "apk-provider-context-manifest.v2",
            "provider": "opencode-export",
            "raw_export_sha256": _sha256(raw),
            "raw_export_bytes": len(raw),
            "session_id": provider_event.get("session_id"),
            "parent_session_id": provider_event.get("session_parent_id"),
            "session_created_at_ms": session_time.get("created"),
            "session_updated_at_ms": session_time.get("updated"),
            "message_count": len(messages),
            "part_count": len(parts),
            "user_prompt_count": len(users),
            "first_user_message_id": users[0].get("info", {}).get("id") if users else None,
            "final_assistant_message_id": assistants[-1].get("info", {}).get("id") if assistants else None,
            "message_ledger_sha256": _sha256(_canonical_json(messages)),
            "message_ledger_hash_basis": (
                "SHA-256 of the raw export messages array serialized as canonical compact JSON "
                "with sorted keys and UTF-8 encoding."
            ),
            "part_ledger_sha256": _sha256(_canonical_json(parts)),
            "part_ledger_hash_basis": (
                "SHA-256 of all raw export message parts flattened in provider message order and "
                "serialized as canonical compact JSON with sorted keys and UTF-8 encoding."
            ),
            "raw_write_inventory": provider_event.get("raw_write_inventory"),
        }
        if "fork_turns" in provider_event:
            expected["fork_turns"] = provider_event["fork_turns"]
        else:
            expected["schema_omissions"] = provider_event.get("schema_omissions")
        if dict(context) != expected or context_bytes != _canonical_json(context):
            raise ValueError("context manifest differs from recomputed provider facts")
        return context
    except (KeyError, TypeError, ValueError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise APKInventoryLiveError(
            "CONTEXT_BINDING_MISMATCH", "provider context manifest is malformed or semantically unbound"
        ) from error


def _canonical_key(value: object) -> str:
    """Returns one compact canonical JSON record key."""
    return _canonical_json(value).decode()


def _transition_candidate_key(row: Mapping[str, Any]) -> str:
    """Returns the exact path/symbol/target/line/optional-from candidate key."""
    evidence = row.get("evidence")
    evidence_map = evidence if isinstance(evidence, Mapping) else {}
    source_range = evidence_map.get("range")
    range_map = source_range if isinstance(source_range, Mapping) else {}
    path = row.get("path", evidence_map.get("path"))
    line = row.get("start_line", range_map.get("start_line"))
    payload: dict[str, Any] = {
        "path": path,
        "source_symbol": row.get("source_symbol"),
        "to_state_id": row.get("to_state_id"),
        "start_line": line,
        "reason": row.get("reason"),
    }
    from_state = row.get("from_state_id", row.get("proven_from_state_id"))
    if isinstance(from_state, str):
        payload["proven_from_state_id"] = from_state
        payload["transition_evidence_kind"] = row.get("transition_evidence_kind")
    if (
        not isinstance(path, str)
        or not isinstance(payload["source_symbol"], str)
        or not isinstance(payload["to_state_id"], str)
        or not isinstance(line, int)
        or not isinstance(payload["reason"], str)
        or isinstance(from_state, str)
        and not isinstance(payload.get("transition_evidence_kind"), str)
    ):
        raise APKInventoryLiveError(
            "ARTIFACT_SCHEMA_INVALID", "transition candidate has an invalid exact key"
        )
    return _canonical_key(payload)


def _field_keys(
    records: list[Mapping[str, Any]], field: str, label: str
) -> set[str]:
    """Returns a duplicate-free set of required nonempty string field values."""
    values: list[str] = []
    for record in records:
        value = record.get(field)
        if not isinstance(value, str) or not value:
            raise APKInventoryLiveError(
                "ARTIFACT_SCHEMA_INVALID", f"{label} has an invalid {field}"
            )
        values.append(value)
    if len(values) != len(set(values)):
        raise APKInventoryLiveError(
            "ARTIFACT_SCHEMA_INVALID", f"{label} has duplicate {field} values"
        )
    return set(values)


def _canonical_keys(records: list[Mapping[str, Any]], label: str) -> set[str]:
    """Returns duplicate-free canonical keys for complete artifact records."""
    values = [_canonical_key(record) for record in records]
    if len(values) != len(set(values)):
        raise APKInventoryLiveError(
            "ARTIFACT_SCHEMA_INVALID", f"{label} has duplicate records"
        )
    return set(values)


def _require_same_keys(
    expected: set[str], actual: set[str], label: str, code: str
) -> None:
    """Fails closed unless two predecessor/review key sets are identical."""
    if expected != actual:
        missing = len(expected - actual)
        extra = len(actual - expected)
        raise APKInventoryLiveError(
            code,
            f"{label} differs from its predecessor: {missing} missing, {extra} extra",
        )


def canonical_task_prompt(task: Mapping[str, Any]) -> bytes:
    """Builds the exact compact task-authority envelope for a frozen role task."""
    task_id = task.get("task_id")
    task_role = task.get("owner_role")
    outputs = task.get("expected_outputs")
    forbidden_roles = task.get("forbidden_roles")
    reviewer_role = task.get("reviewer_role")
    if (
        not isinstance(task_id, str)
        or not task_id
        or not isinstance(task_role, str)
        or not task_role
        or not isinstance(outputs, list)
        or not outputs
        or not all(isinstance(path, str) and path for path in outputs)
        or len(outputs) != len(set(outputs))
        or not isinstance(forbidden_roles, list)
        or not forbidden_roles
        or not all(isinstance(role, str) and role for role in forbidden_roles)
        or len(forbidden_roles) != len(set(forbidden_roles))
        or task_role in forbidden_roles
        or not isinstance(reviewer_role, str)
        or not reviewer_role
    ):
        raise APKInventoryLiveError("TASK_BINDING_INVALID", "frozen task is incomplete")
    for path in outputs:
        candidate = PurePosixPath(path)
        if candidate.is_absolute() or ".." in candidate.parts or str(candidate) != path:
            raise APKInventoryLiveError(
                "TASK_BINDING_INVALID", "task output path is not normalized"
            )
    return _canonical_json(
        {
            "schema_version": "apk-inventory-task-envelope.v1",
            "task_id": task_id,
            "task_role": task_role,
            "expected_outputs": outputs,
            "forbidden_roles": forbidden_roles,
            "reviewer_role": reviewer_role,
        }
    )


def _provider_text_parts(message: Mapping[str, Any]) -> tuple[bytes, bytes]:
    """Returns canonical provider-part bytes and plain ordered text bytes."""
    parts = message.get("parts")
    if not isinstance(parts, list):
        raise APKInventoryLiveError("PROVIDER_EVENT_INVALID", "provider message parts are absent")
    text_parts = [
        {"id": part.get("id"), "text": part.get("text")}
        for part in parts
        if isinstance(part, Mapping)
        and part.get("type") == "text"
        and isinstance(part.get("text"), str)
    ]
    if not text_parts:
        raise APKInventoryLiveError("PROVIDER_EVENT_INVALID", "provider message has no text parts")
    return _canonical_json(text_parts), "".join(str(part["text"]) for part in text_parts).encode()


def _validate_provider_raw_export(provider_event: Mapping[str, Any]) -> None:
    """Reparses raw provider authority and recomputes message/session identities."""
    raw = provider_event.get("raw_export_bytes")
    if (
        provider_event.get("provenance_kind") != "opencode-raw-export"
        or not isinstance(raw, bytes)
        or provider_event.get("raw_export_sha256") != _sha256(raw)
    ):
        raise APKInventoryLiveError("PROVIDER_EVENT_INVALID", "raw provider export binding is invalid")
    try:
        export = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise APKInventoryLiveError("PROVIDER_EVENT_INVALID", "raw provider export is invalid JSON") from error
    root = _as_mapping(export, "provider export")
    info = _as_mapping(root.get("info"), "provider export info")
    if (
        info.get("id") != provider_event.get("session_id")
        or info.get("parentID") != provider_event.get("session_parent_id")
    ):
        raise APKInventoryLiveError("SESSION_BINDING_MISMATCH", "raw provider session lineage differs")
    messages = _as_records(root.get("messages"), "provider export messages")
    users = [row for row in messages if isinstance(row.get("info"), Mapping) and row["info"].get("role") == "user"]
    assistants = [row for row in messages if isinstance(row.get("info"), Mapping) and row["info"].get("role") == "assistant"]
    if len(users) != 1 or not assistants:
        raise APKInventoryLiveError(
            "PROVIDER_EVENT_INVALID", "provider export must contain one prompt and an assistant tool-loop"
        )
    user_info = _as_mapping(users[0].get("info"), "provider prompt info")
    assistant_info = _as_mapping(assistants[-1].get("info"), "provider response info")
    if (
        messages[0] is not users[0]
        or messages[-1] is not assistants[-1]
        or any(
            row.get("info", {}).get("role") not in {"user", "assistant"}
            for row in messages
        )
        or any(
            row.get("info", {}).get("parentID") != user_info.get("id")
            for row in assistants
        )
        or
        user_info.get("id") != provider_event.get("start_event_id")
        or assistant_info.get("id") != provider_event.get("id")
    ):
        raise APKInventoryLiveError("EVENT_IDENTITY_MISMATCH", "raw provider message chain differs")
    prompt_parts, prompt_text = _provider_text_parts(users[0])
    final_parts, final_text = _provider_text_parts(assistants[-1])
    if (
        provider_event.get("prompt_bytes") != prompt_text
        or provider_event.get("final_response_bytes") != final_text
        or provider_event.get("canonical_prompt_sha256") != _sha256(prompt_parts)
        or provider_event.get("canonical_final_response_sha256") != _sha256(final_parts)
    ):
        raise APKInventoryLiveError("EVENT_IDENTITY_MISMATCH", "provider text-part authority differs")


class CommittedArtifactLoader:
    """Loads JSON artifacts exclusively from reachable Git blob objects."""

    def __init__(
        self,
        repository_root: Path,
        revision: str,
        source: BlobSource | None = None,
    ) -> None:
        """Creates a committed-byte loader for one frozen revision.

        Args:
            repository_root: Repository used by the default Git source adapter.
            revision: Frozen commit whose tree is authoritative.
            source: Optional immutable source implementation for focused tests.
        """
        self.revision = revision
        self._source = source or GitSourceAdapter(repository_root)

    def load(self, path: str) -> CommittedArtifact:
        """Loads and parses one repository-relative committed JSON blob.

        Args:
            path: Repository-relative artifact path.
        Returns:
            Parsed artifact bound to its exact committed bytes.
        Raises:
            APKInventoryLiveError: If the path, blob, JSON, or root shape is invalid.
        """
        candidate = PurePosixPath(path)
        if candidate.is_absolute() or ".." in candidate.parts or str(candidate) != path:
            raise APKInventoryLiveError("ARTIFACT_PATH_INVALID", "artifact path must be normalized and repository-relative")
        try:
            raw = self._source.resolve_blob_bytes(self.revision, path)
        except GitSourceError as error:
            raise APKInventoryLiveError(error.code, str(error)) from error
        try:
            parsed = json.loads(raw)
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise APKInventoryLiveError("ARTIFACT_JSON_INVALID", f"{path} is not valid JSON") from error
        value = _as_mapping(parsed, path)
        return CommittedArtifact(self.revision, path, _sha256(raw), raw, value)

    def load_phase(self, phase: str) -> Mapping[str, CommittedArtifact]:
        """Loads every required production artifact for a phase."""
        names = PHASE_ARTIFACT_PATHS.get(phase)
        if names is None:
            raise APKInventoryLiveError("PHASE_UNKNOWN", f"unknown phase: {phase}")
        return {
            name: self.load(f"{TRACK_DIRECTORY}/{name}")
            for name in names
        }


def _validate_artifact_metadata(
    artifacts: Mapping[str, CommittedArtifact], baseline: str | None = None
) -> str:
    """Validates exact schema versions and one shared frozen source baseline."""
    observed = baseline
    for name, artifact in artifacts.items():
        if artifact.value.get("schema_version") != EXPECTED_SCHEMAS.get(name):
            raise APKInventoryLiveError(
                "ARTIFACT_SCHEMA_INVALID", f"{name} has an unexpected schema version"
            )
        value_baseline = artifact.value.get("source_baseline_revision")
        if not isinstance(value_baseline, str) or COMMIT_SHA.fullmatch(value_baseline) is None:
            raise APKInventoryLiveError(
                "ARTIFACT_SCHEMA_INVALID", f"{name} has an invalid source baseline"
            )
        if observed is None:
            observed = value_baseline
        elif observed != value_baseline:
            raise APKInventoryLiveError(
                "INPUT_PROVENANCE_INVALID", f"{name} uses a different source baseline"
            )
    if observed is None:
        raise APKInventoryLiveError("ARTIFACT_SCHEMA_INVALID", "artifact collection is empty")
    return observed


def project_phase1(artifacts: Mapping[str, CommittedArtifact]) -> Mapping[str, list[Mapping[str, Any]]]:
    """Projects real Phase-1 schemas into named denominator record sets."""
    source = artifacts["source-denominator.json"].value
    identities = artifacts["game-identity-ledger.json"].value
    scene = artifacts["scene-state-denominator.json"].value
    assets = artifacts["asset-file-denominator.json"].value
    history = artifacts["historical-source-denominator.json"].value
    discrepancies = artifacts["denominator-discrepancies.json"].value
    return {
        "source_records": _as_records(source.get("records"), "source-denominator.records"),
        "graph_edges": _as_records(source.get("graph_edges"), "source-denominator.graph_edges"),
        "identities": _as_records(identities.get("identity_records"), "game-identity-ledger.identity_records"),
        "scenes": _as_records(scene.get("scene_records"), "scene-state-denominator.scene_records"),
        "states": _as_records(scene.get("state_records"), "scene-state-denominator.state_records"),
        "transitions": _as_records(scene.get("transitions"), "scene-state-denominator.transitions"),
        "transition_candidates": _as_records(
            scene.get("transition_write_candidates"),
            "scene-state-denominator.transition_write_candidates",
        ),
        "assets": _as_records(assets.get("candidate_files"), "asset-file-denominator.candidate_files"),
        "history": _as_records(history.get("records"), "historical-source-denominator.records"),
        "discrepancies": _as_records(
            discrepancies.get("records"), "denominator-discrepancies.records"
        ),
    }


def project_phase2(artifacts: Mapping[str, CommittedArtifact]) -> Mapping[str, Any]:
    """Projects the real independent-discovery and discrepancy schemas."""
    discovery = artifacts["independent-human-discovery.json"].value
    duplicates = artifacts["human-duplicate-drift-records.json"].value
    history = artifacts["human-historical-deleted-records.json"].value
    discrepancies = artifacts["human-discrepancy-records.json"].value
    raw = _as_mapping(discovery.get("raw_frozen_source_discovery"), "raw_frozen_source_discovery")
    return {
        "status": discrepancies.get("status"),
        "coverage_status": discrepancies.get("coverage_status"),
        "discovery_status": discovery.get("status"),
        "duplicate_status": duplicates.get("status"),
        "historical_status": history.get("status"),
        "raw_frozen_source_discovery": raw,
        "source_reviews": _as_records(
            discovery.get("mechanical_source_record_reviews"),
            "independent-human-discovery.mechanical_source_record_reviews",
        ),
        "graph_edge_reviews": _as_records(
            discovery.get("mechanical_graph_edge_reviews"),
            "independent-human-discovery.mechanical_graph_edge_reviews",
        ),
        "surface_reviews": _as_records(
            discovery.get("surface_reviews"),
            "independent-human-discovery.surface_reviews",
        ),
        "asset_reviews": _as_records(
            discovery.get("asset_candidate_reviews"),
            "independent-human-discovery.asset_candidate_reviews",
        ),
        "asset_group_reviews": _as_records(
            discovery.get("identical_hash_group_reviews"),
            "independent-human-discovery.identical_hash_group_reviews",
        ),
        "program_identity_reviews": _as_records(
            discovery.get("replacement_program_identity_reviews"),
            "independent-human-discovery.replacement_program_identity_reviews",
        ),
        "copy_reviews": _as_records(
            duplicates.get("mechanical_copy_record_reviews"),
            "human-duplicate-drift-records.mechanical_copy_record_reviews",
        ),
        "duplicate_drift_records": _as_records(
            duplicates.get("duplicate_drift_records"),
            "human-duplicate-drift-records.duplicate_drift_records",
        ),
        "historical_locator_reviews": _as_records(
            history.get("mechanical_historical_locator_reviews"),
            "human-historical-deleted-records.mechanical_historical_locator_reviews",
        ),
        "historical_deleted_records": _as_records(
            history.get("historical_deleted_records"),
            "human-historical-deleted-records.historical_deleted_records",
        ),
        "identity_comparison_records": _as_records(
            discrepancies.get("identity_comparison_records"),
            "human-discrepancy-records.identity_comparison_records",
        ),
        "program_identity_disposition_records": _as_records(
            discrepancies.get("program_identity_disposition_records"),
            "human-discrepancy-records.program_identity_disposition_records",
        ),
        "independent_symmetric_reconciliation": _as_records(
            discrepancies.get("independent_symmetric_reconciliation"),
            "human-discrepancy-records.independent_symmetric_reconciliation",
        ),
        "independent_symmetric_blocking_records": _as_records(
            discrepancies.get("independent_symmetric_blocking_records"),
            "human-discrepancy-records.independent_symmetric_blocking_records",
        ),
        "mechanical_observation_records": _as_records(
            discrepancies.get("mechanical_observation_records"),
            "human-discrepancy-records.mechanical_observation_records",
        ),
    }


def project_phase3(artifact: CommittedArtifact) -> Mapping[str, Any]:
    """Projects real Phase-3 reconciliation collections without fixture aliases."""
    value = artifact.value
    required = (
        "source_record_reconciliation_records",
        "file_reconciliation_records",
        "graph_edge_reconciliation_records",
        "surface_reconciliation_records",
        "asset_candidate_reconciliation_records",
        "identity_reconciliation_records",
        "copy_reconciliation_records",
        "identical_hash_group_reconciliation_records",
        "replacement_program_identity_records",
        "discrepancy_reconciliation_records",
    )
    projected = {
        key: _as_records(value.get(key), f"phase3-reconciliation.{key}")
        for key in required
    }
    projected["unresolved_sources"] = _as_records(value.get("unresolved_sources"), "phase3-reconciliation.unresolved_sources")
    projected["status"] = value.get("status")
    return projected


def validate_cross_artifact_coverage(
    phase1: Mapping[str, list[Mapping[str, Any]]],
    phase2: Mapping[str, Any],
    phase3: Mapping[str, Any],
) -> None:
    """Recomputes exact Phase-1 through Phase-3 one-to-one coverage."""
    source_ids = _field_keys(phase1["source_records"], "record_id", "Phase-1 source records")
    file_ids = {
        row["record_id"]
        for row in phase1["source_records"]
        if row.get("record_type") == "file"
    }
    copy_ids = {
        row["record_id"]
        for row in phase1["source_records"]
        if row.get("record_type") == "copy"
    }
    graph_keys = _canonical_keys(phase1["graph_edges"], "Phase-1 graph edges")
    surface_rows = (
        phase1["scenes"]
        + phase1["states"]
        + phase1["transitions"]
        + phase1["transition_candidates"]
    )
    surface_keys = _canonical_keys(surface_rows, "Phase-1 surfaces")
    asset_paths = _field_keys(phase1["assets"], "canonical_path", "Phase-1 assets")
    identity_ids = _field_keys(
        phase1["identities"], "canonical_identity_id", "Phase-1 identities"
    )
    history_keys: set[str] = set()
    asset_group_ids: set[str] = set()
    for row in phase1["history"]:
        history_keys.add(_canonical_key(_as_mapping(row.get("evidence"), "Phase-1 historical evidence")))
    for row in phase1["assets"]:
        group = row.get("identical_hash_group")
        if not isinstance(group, str) or not group:
            raise APKInventoryLiveError(
                "ARTIFACT_SCHEMA_INVALID", "Phase-1 asset has an invalid identical-hash group"
            )
        asset_group_ids.add(group)

    phase2_comparisons = {
        "source review coverage": (
            source_ids,
            _field_keys(phase2["source_reviews"], "mechanical_record_id", "Phase-2 source reviews"),
        ),
        "graph review coverage": (
            graph_keys,
            _field_keys(phase2["graph_edge_reviews"], "mechanical_graph_edge_key", "Phase-2 graph reviews"),
        ),
        "surface review coverage": (
            surface_keys,
            _field_keys(phase2["surface_reviews"], "mechanical_surface_key", "Phase-2 surface reviews"),
        ),
        "asset review coverage": (
            asset_paths,
            _field_keys(phase2["asset_reviews"], "canonical_path", "Phase-2 asset reviews"),
        ),
        "copy review coverage": (
            copy_ids,
            _field_keys(phase2["copy_reviews"], "mechanical_copy_record_id", "Phase-2 copy reviews"),
        ),
        "historical review coverage": (
            history_keys,
            _field_keys(
                phase2["historical_locator_reviews"],
                "mechanical_locator_key",
                "Phase-2 historical reviews",
            ),
        ),
        "asset-group review coverage": (
            asset_group_ids,
            _field_keys(
                phase2["asset_group_reviews"],
                "identical_hash_group",
                "Phase-2 asset-group reviews",
            ),
        ),
    }
    for label, (expected, actual) in phase2_comparisons.items():
        _require_same_keys(expected, actual, label, "PHASE2_COVERAGE_MISMATCH")

    program_labels = _field_keys(
        phase2["program_identity_reviews"],
        "program_identity_label",
        "Phase-2 replacement-program reviews",
    )
    _require_same_keys(
        program_labels,
        _field_keys(
            phase2["program_identity_disposition_records"],
            "program_identity_label",
            "Phase-2 replacement-program dispositions",
        ),
        "replacement-program disposition coverage",
        "PHASE2_COVERAGE_MISMATCH",
    )

    raw = phase2["raw_frozen_source_discovery"]

    def indexed(
        rows: list[Mapping[str, Any]],
        key_of: Any,
        evidence_of: Any,
        label: str,
    ) -> dict[str, list[Mapping[str, Any]]]:
        """Indexes one raw/mechanical surface without allowing key collisions."""
        result: dict[str, list[Mapping[str, Any]]] = {}
        for row in rows:
            key = key_of(row)
            if not isinstance(key, str) or not key or key in result:
                raise APKInventoryLiveError(
                    "ARTIFACT_SCHEMA_INVALID", f"{label} has an invalid or duplicate key"
                )
            result[key] = evidence_of(row)
        return result

    mechanical_maps = {
        "identities": indexed(
            phase1["identities"],
            lambda row: row.get("catalog_identity_id"),
            lambda row: [row.get("catalog_evidence")],
            "mechanical identities",
        ),
        "files": indexed(
            [row for row in phase1["source_records"] if row.get("record_type") == "file"],
            lambda row: row.get("file_path"),
            lambda row: [row.get("evidence")],
            "mechanical files",
        ),
        "states": indexed(
            phase1["states"],
            lambda row: _canonical_key([
                row.get("evidence", {}).get("path"), row.get("source_symbol"), row.get("state_id")
            ]),
            lambda row: [row.get("evidence")],
            "mechanical states",
        ),
        "transitions": indexed(
            phase1["transitions"],
            lambda row: _canonical_key([
                row.get("evidence", {}).get("path"), row.get("source_symbol"),
                row.get("from_state_id"), row.get("to_state_id"),
                row.get("evidence", {}).get("range", {}).get("start_line"),
            ]),
            lambda row: [row.get("evidence")],
            "mechanical transitions",
        ),
        "transition-write-candidates": indexed(
            phase1["transition_candidates"],
            _transition_candidate_key,
            lambda row: [row.get("evidence")],
            "mechanical transition candidates",
        ),
        "assets": indexed(
            phase1["assets"],
            lambda row: row.get("canonical_path"),
            lambda row: [row],
            "mechanical assets",
        ),
        "history-paths": indexed(
            [row for row in phase1["history"] if row.get("classification") != "current"],
            lambda row: row.get("evidence", {}).get("path"),
            lambda row: [row.get("evidence")],
            "mechanical history paths",
        ),
    }
    raw_maps = {
        "identities": indexed(
            _as_records(raw.get("raw_identity_records"), "raw identity records"),
            lambda row: row.get("catalog_id"), lambda row: [row.get("evidence")], "raw identities",
        ),
        "files": indexed(
            _as_records(raw.get("raw_file_records"), "raw file records"),
            lambda row: row.get("canonical_path"), lambda row: [row], "raw files",
        ),
        "states": indexed(
            _as_records(raw.get("raw_state_records"), "raw state records"),
            lambda row: _canonical_key([row.get("path"), row.get("source_symbol"), row.get("state_id")]),
            lambda row: [row.get("evidence")], "raw states",
        ),
        "transitions": indexed(
            _as_records(raw.get("raw_transition_records"), "raw transition records"),
            lambda row: _canonical_key([
                row.get("path"), row.get("source_symbol"), row.get("from_state_id"),
                row.get("to_state_id"), row.get("evidence", {}).get("range", {}).get("start_line"),
            ]),
            lambda row: [row.get("evidence")], "raw transitions",
        ),
        "transition-write-candidates": indexed(
            _as_records(raw.get("raw_transition_write_candidates"), "raw transition candidates"),
            _transition_candidate_key, lambda row: [row.get("evidence")], "raw transition candidates",
        ),
        "assets": indexed(
            _as_records(raw.get("raw_asset_records"), "raw asset records"),
            lambda row: row.get("canonical_path"), lambda row: [row], "raw assets",
        ),
        "history-paths": indexed(
            _as_records(raw.get("raw_history_records"), "raw history records"),
            lambda row: row.get("path"), lambda row: [row], "raw history paths",
        ),
    }
    expected_symmetric_rows: list[Mapping[str, Any]] = []
    for category in mechanical_maps:
        mechanical = mechanical_maps[category]
        human = raw_maps[category]
        for record_key in sorted(set(mechanical) | set(human)):
            if record_key in mechanical and record_key in human:
                status = (
                    "evidence-mismatch"
                    if category == "transition-write-candidates"
                    and _canonical_key(mechanical[record_key]) != _canonical_key(human[record_key])
                    else "matched"
                )
            else:
                status = "mechanical-only" if record_key in mechanical else "human-only"
            candidate = category == "transition-write-candidates"
            expected_symmetric_rows.append({
                "category": category,
                "record_key": record_key,
                "comparison_status": status,
                "blocking": status != "matched",
                "resolution_status": (
                    "unresolved-candidate"
                    if candidate and status != "matched"
                    else "retained-target-write-candidate"
                    if candidate
                    else "compared"
                ),
                "mechanical_evidence": mechanical.get(record_key, []),
                "human_evidence": human.get(record_key, []),
            })
    declared_symmetric_rows = phase2["independent_symmetric_reconciliation"]
    if _canonical_keys(expected_symmetric_rows, "recomputed symmetric rows") != _canonical_keys(
        declared_symmetric_rows, "declared symmetric rows"
    ):
        raise APKInventoryLiveError(
            "SYMMETRIC_RECONCILIATION_MISMATCH",
            "declared symmetric reconciliation differs from raw/Phase-1 recomputation",
        )
    symmetric_rows = expected_symmetric_rows
    derived_blockers: list[Mapping[str, Any]] = []
    symmetric_pairs: set[tuple[str, str]] = set()
    for row in symmetric_rows:
        category = row.get("category")
        record_key = row.get("record_key")
        status = row.get("comparison_status")
        if (
            not isinstance(category, str)
            or not category
            or not isinstance(record_key, str)
            or not record_key
            or status not in {"matched", "mechanical-only", "human-only", "evidence-mismatch"}
        ):
            raise APKInventoryLiveError(
                "ARTIFACT_SCHEMA_INVALID", "Phase-2 symmetric reconciliation row is invalid"
            )
        pair = (category, record_key)
        if pair in symmetric_pairs:
            raise APKInventoryLiveError(
                "ARTIFACT_SCHEMA_INVALID", "Phase-2 symmetric reconciliation key is duplicated"
            )
        symmetric_pairs.add(pair)
        candidate = category == "transition-write-candidates"
        if status == "evidence-mismatch" and not candidate:
            raise APKInventoryLiveError(
                "ARTIFACT_SCHEMA_INVALID", "non-candidate evidence mismatch is invalid"
            )
        expected_resolution = (
            "retained-target-write-candidate" if candidate and status == "matched"
            else "unresolved-candidate" if candidate else "compared"
        )
        blocking = status != "matched"
        if row.get("resolution_status") != expected_resolution:
            raise APKInventoryLiveError(
                "SYMMETRIC_BLOCKER_SET_MISMATCH", "symmetric resolution status differs from status"
            )
        if row.get("blocking") is not blocking:
            raise APKInventoryLiveError(
                "SYMMETRIC_BLOCKER_SET_MISMATCH", "symmetric blocking flag differs from status"
            )
        if blocking:
            derived_blockers.append(row)
    if _canonical_keys(derived_blockers, "derived symmetric blockers") != _canonical_keys(
        phase2["independent_symmetric_blocking_records"], "declared symmetric blockers"
    ):
        raise APKInventoryLiveError(
            "SYMMETRIC_BLOCKER_SET_MISMATCH", "declared symmetric blockers differ from derived blockers"
        )

    phase3_comparisons = {
        "source reconciliation coverage": (
            source_ids,
            _field_keys(
                phase3["source_record_reconciliation_records"],
                "mechanical_record_id",
                "Phase-3 source reconciliation",
            ),
        ),
        "file reconciliation coverage": (
            file_ids,
            _field_keys(
                phase3["file_reconciliation_records"],
                "mechanical_record_id",
                "Phase-3 file reconciliation",
            ),
        ),
        "graph reconciliation coverage": (
            graph_keys,
            _field_keys(
                phase3["graph_edge_reconciliation_records"],
                "mechanical_graph_edge_key",
                "Phase-3 graph reconciliation",
            ),
        ),
        "surface reconciliation coverage": (
            surface_keys,
            _canonical_keys(
                [
                    _as_mapping(row.get("mechanical_surface"), "Phase-3 mechanical surface")
                    for row in phase3["surface_reconciliation_records"]
                ],
                "Phase-3 surface reconciliation",
            ),
        ),
        "asset reconciliation coverage": (
            asset_paths,
            _field_keys(
                phase3["asset_candidate_reconciliation_records"],
                "canonical_path",
                "Phase-3 asset reconciliation",
            ),
        ),
        "identity reconciliation coverage": (
            identity_ids,
            _field_keys(
                phase3["identity_reconciliation_records"],
                "canonical_identity_id",
                "Phase-3 identity reconciliation",
            ),
        ),
        "copy reconciliation coverage": (
            copy_ids,
            _field_keys(
                phase3["copy_reconciliation_records"],
                "mechanical_copy_record_id",
                "Phase-3 copy reconciliation",
            ),
        ),
        "asset-group reconciliation coverage": (
            asset_group_ids,
            _field_keys(
                phase3["identical_hash_group_reconciliation_records"],
                "identical_hash_group",
                "Phase-3 asset-group reconciliation",
            ),
        ),
        "replacement-program reconciliation coverage": (
            program_labels,
            _field_keys(
                phase3["replacement_program_identity_records"],
                "program_identity_label",
                "Phase-3 replacement-program reconciliation",
            ),
        ),
    }
    for label, (expected, actual) in phase3_comparisons.items():
        _require_same_keys(expected, actual, label, "PHASE3_COVERAGE_MISMATCH")

    discrepancy_keys = {
        f"mechanical:{row['observation_id']}"
        for row in phase1["discrepancies"]
        if isinstance(row.get("observation_id"), str)
    }
    discrepancy_keys.update(
        f"human-duplicate:{row['record_id']}"
        for row in phase2["duplicate_drift_records"]
        if isinstance(row.get("record_id"), str)
    )
    discrepancy_keys.update(f"historical:{key}" for key in history_keys)
    discrepancy_keys.update(
        f"human-historical:{_canonical_key(_as_mapping(row.get('evidence'), 'human historical evidence'))}"
        for row in phase2["historical_deleted_records"]
    )
    discrepancy_keys.update(
        f"human-comparison:{row['observation_id']}"
        for row in phase2["mechanical_observation_records"]
        if isinstance(row.get("observation_id"), str)
    )
    discrepancy_keys.update(
        f"independent-symmetric:{row['category']}:{_sha256(str(row['record_key']).encode())}"
        for row in derived_blockers
    )
    _require_same_keys(
        discrepancy_keys,
        _field_keys(
            phase3["discrepancy_reconciliation_records"],
            "discrepancy_key",
            "Phase-3 discrepancy reconciliation",
        ),
        "discrepancy reconciliation coverage",
        "PHASE3_COVERAGE_MISMATCH",
    )

    blocking_ids: list[str] = []
    for name, records in phase3.items():
        if not name.endswith("_records") or not isinstance(records, list):
            continue
        for row in records:
            status = row.get("resolution_status")
            expected_blocking = status == "unresolved-source"
            retained_candidate = (
                name == "surface_reconciliation_records"
                and row.get("surface_kind") == "transition-write-candidate"
                and status == "retained-target-write-candidate"
                and row.get("edge_inferred") is False
            )
            if (
                status not in {"matched", "unresolved-source"}
                and not retained_candidate
                or row.get("blocking") is not expected_blocking
            ):
                raise APKInventoryLiveError(
                    "ARTIFACT_SCHEMA_INVALID",
                    f"{name} has an invalid resolution/blocking state",
                )
            if expected_blocking:
                unresolved_id = row.get("unresolved_source_id")
                if not isinstance(unresolved_id, str) or not unresolved_id:
                    raise APKInventoryLiveError(
                        "PHASE3_UNRESOLVED_SET_MISMATCH",
                        f"{name} has a blocker without an unresolved-source ID",
                    )
                blocking_ids.append(unresolved_id)
    _require_same_keys(
        set(blocking_ids),
        _field_keys(
            phase3["unresolved_sources"],
            "unresolved_source_id",
            "Phase-3 unresolved sources",
        ),
        "Phase-3 unresolved-source coverage",
        "PHASE3_UNRESOLVED_SET_MISMATCH",
    )


def normalize_resolved_event(
    provider_event: Mapping[str, Any],
    task: Mapping[str, Any],
    receipt: Mapping[str, Any],
) -> Mapping[str, Any]:
    """Binds exact ``build_resolved_event`` output to a frozen task and receipt.

    Args:
        provider_event: Exact mapping returned by ``build_resolved_event``.
        task: Frozen Phase-0 task declaration.
        receipt: Role receipt containing task and context bindings.
    Returns:
        Validator-facing task/output/context-bound provider event.
    Raises:
        APKInventoryLiveError: If any provider, task, output, or context identity differs.
    """
    _validate_provider_raw_export(provider_event)
    task_id = task.get("task_id")
    task_role = task.get("owner_role")
    declared_outputs = task.get("expected_outputs")
    authoritative_prompt = canonical_task_prompt(task)
    if (
        not isinstance(task_id, str)
        or not isinstance(task_role, str)
        or not isinstance(declared_outputs, list)
    ):
        raise APKInventoryLiveError("TASK_BINDING_INVALID", "frozen task is incomplete")

    prompt = provider_event.get("prompt_bytes")
    final = provider_event.get("final_response_bytes")
    if not isinstance(prompt, bytes) or prompt != authoritative_prompt:
        raise APKInventoryLiveError(
            "TASK_ENVELOPE_MISMATCH", "provider first prompt differs from the frozen task envelope"
        )
    if not isinstance(final, bytes) or not final:
        raise APKInventoryLiveError(
            "PROVIDER_EVENT_INVALID", "provider final-response bytes are absent"
        )
    if (
        provider_event.get("prompt_content_sha256") != _sha256(prompt)
        or provider_event.get("final_response_content_sha256") != _sha256(final)
    ):
        raise APKInventoryLiveError(
            "PROVIDER_EVENT_INVALID", "provider content bytes differ from their content hashes"
        )

    expected_output_paths = {
        path if path.startswith(f"{TRACK_DIRECTORY}/") else f"{TRACK_DIRECTORY}/{path}"
        for path in declared_outputs
    }
    if len(expected_output_paths) != len(declared_outputs):
        raise APKInventoryLiveError(
            "TASK_BINDING_INVALID", "task output paths collide after track normalization"
        )
    provider_outputs = provider_event.get("output_sha256")
    if (
        not isinstance(provider_outputs, Mapping)
        or set(provider_outputs) != expected_output_paths
        or not all(
            isinstance(digest, str) and SHA256.fullmatch(digest) is not None
            for digest in provider_outputs.values()
        )
    ):
        raise APKInventoryLiveError(
            "PROVIDER_OUTPUT_MISMATCH", "provider output inventory differs from the frozen task"
        )
    if receipt.get("task_id") != task_id or receipt.get("role") != task_role:
        raise APKInventoryLiveError(
            "TASK_OWNERSHIP_MISMATCH", "receipt does not bind the prompt-authorized task"
        )
    if (
        receipt.get("output_hashes") != provider_outputs
        or receipt.get("output_sha256") != _sha256(_canonical_json(provider_outputs))
    ):
        raise APKInventoryLiveError(
            "PROVIDER_OUTPUT_MISMATCH", "receipt output hashes differ from provider-owned bytes"
        )

    canonical_prompt_hash = provider_event.get("canonical_prompt_sha256")
    canonical_final_hash = provider_event.get("canonical_final_response_sha256")
    if (
        not isinstance(canonical_prompt_hash, str)
        or not isinstance(canonical_final_hash, str)
        or receipt.get("prompt_sha256") != canonical_prompt_hash
        or receipt.get("final_response_sha256") != canonical_final_hash
        or receipt.get("start_event_id") != provider_event.get("start_event_id")
        or receipt.get("end_event_id") != provider_event.get("id")
        or provider_event.get("prompt_message_id") != provider_event.get("start_event_id")
        or provider_event.get("final_response_message_id") != provider_event.get("id")
    ):
        raise APKInventoryLiveError(
            "EVENT_IDENTITY_MISMATCH", "receipt identity differs from canonical provider message identity"
        )

    session_id = provider_event.get("session_id")
    parent_session_id = provider_event.get("session_parent_id")
    if (
        not isinstance(session_id, str)
        or receipt.get("spawn_id") != session_id
        or not isinstance(parent_session_id, str)
        or receipt.get("parent_ancestry_ids") != [parent_session_id]
    ):
        raise APKInventoryLiveError(
            "SESSION_BINDING_MISMATCH", "receipt spawn or exact parent ancestry differs from provider lineage"
        )

    attested = provider_event.get("attested_manifest_bytes")
    if not isinstance(attested, Mapping):
        raise APKInventoryLiveError(
            "CONTEXT_BINDING_MISMATCH", "provider attested manifest bytes are absent"
        )
    context_bytes = attested.get("actual_context_manifest_sha256")
    budget_bytes = attested.get("budget_declaration_sha256")
    if not isinstance(context_bytes, bytes) or not isinstance(budget_bytes, bytes):
        raise APKInventoryLiveError(
            "CONTEXT_BINDING_MISMATCH", "provider context or budget attestation bytes are absent"
        )
    context_hash = receipt.get("actual_context_manifest_sha256")
    if (
        not isinstance(context_hash, str)
        or context_hash != _sha256(context_bytes)
        or provider_event.get("actual_context_manifest_sha256") != context_hash
    ):
        raise APKInventoryLiveError(
            "CONTEXT_BINDING_MISMATCH", "provider context differs from the role receipt"
        )
    _expected_provider_context_manifest(provider_event, context_bytes)
    budget_hash = receipt.get("budget_declaration_sha256")
    if (
        not isinstance(budget_hash, str)
        or budget_hash != _sha256(budget_bytes)
        or provider_event.get("budget_declaration_sha256") != budget_hash
    ):
        raise APKInventoryLiveError(
            "BUDGET_BINDING_MISMATCH", "provider budget differs from the role receipt"
        )
    try:
        budget = json.loads(budget_bytes)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise APKInventoryLiveError(
            "BUDGET_BINDING_MISMATCH", "provider budget declaration is malformed"
        ) from error
    if (
        not isinstance(budget, Mapping)
        or set(budget) != {"schema_version", "actual_usage"}
        or budget.get("schema_version") != "apk-role-budget-declaration.v1"
        or budget.get("actual_usage") != receipt.get("actual_usage")
        or budget_bytes != _canonical_json(budget)
    ):
        raise APKInventoryLiveError(
            "BUDGET_BINDING_MISMATCH", "provider budget declaration differs from receipt usage"
        )

    normalized = dict(provider_event)
    normalized.update(
        {
            "task_id": task_id,
            "task_role": task_role,
            "spawn_id": session_id,
            "parent_ancestry_ids": [parent_session_id],
            "prompt_sha256": canonical_prompt_hash,
            "actual_context_manifest_sha256": context_hash,
            "start_event_id": provider_event["start_event_id"],
            "end_event_id": provider_event["id"],
            "final_response_sha256": canonical_final_hash,
            "budget_declaration_sha256": budget_hash,
            "output_hashes": dict(provider_outputs),
        }
    )
    return normalized


def load_live_phase_bundle(
    repository_root: Path,
    revision: str,
    source: BlobSource | None = None,
) -> Mapping[str, Any]:
    """Loads and projects committed Phase 1--3 artifacts, failing on blockers.

    Args:
        repository_root: Repository used by the default Git adapter.
        revision: Frozen reachable commit whose blobs are authoritative.
        source: Optional immutable blob source for tests.
    Returns:
        Projected phase data and exact artifact hashes.
    Raises:
        APKInventoryLiveError: If Phase 2 blockers or Phase 3 unresolved sources remain.
    """
    if not isinstance(revision, str) or COMMIT_SHA.fullmatch(revision) is None:
        raise APKInventoryLiveError(
            "INPUT_PROVENANCE_INVALID", "admitted Phase-3 revision is not a full commit SHA"
        )
    trusted_source = source or GitSourceAdapter(repository_root)
    phase3_loader = CommittedArtifactLoader(repository_root, revision, trusted_source)
    phase3 = phase3_loader.load_phase("phase3")
    phase3_value = phase3["phase3-reconciliation.json"].value
    provenance = _as_mapping(phase3_value.get("input_provenance"), "Phase-3 input provenance")
    phase1_provenance = _as_mapping(provenance.get("phase1"), "Phase-3 Phase-1 provenance")
    phase2_provenance = _as_mapping(provenance.get("phase2"), "Phase-3 Phase-2 provenance")
    phase1_revision = phase1_provenance.get("revision")
    phase2_revision = phase2_provenance.get("receipt_revision")
    if (
        not isinstance(phase1_revision, str)
        or COMMIT_SHA.fullmatch(phase1_revision) is None
        or not isinstance(phase2_revision, str)
        or COMMIT_SHA.fullmatch(phase2_revision) is None
    ):
        raise APKInventoryLiveError(
            "INPUT_PROVENANCE_INVALID", "Phase-3 predecessor revisions are invalid"
        )
    if len({phase1_revision, phase2_revision, revision}) != 3:
        raise APKInventoryLiveError(
            "INPUT_PROVENANCE_INVALID", "Phase predecessor revisions must be distinct commits"
        )

    def proves_ancestor(ancestor: str, descendant: str) -> bool:
        method = getattr(trusted_source, "is_ancestor", None)
        if callable(method):
            return bool(method(ancestor, descendant))
        run = getattr(trusted_source, "_run", None)
        if not callable(run):
            return False
        return run("merge-base", "--is-ancestor", ancestor, descendant).returncode == 0

    if not proves_ancestor(phase1_revision, phase2_revision) or not proves_ancestor(
        phase2_revision, revision
    ):
        raise APKInventoryLiveError(
            "INPUT_PROVENANCE_INVALID",
            "Phase revisions do not form the required Phase1-to-Phase2-to-Phase3 ancestry",
        )
    phase1 = CommittedArtifactLoader(repository_root, phase1_revision, trusted_source).load_phase("phase1")
    phase2 = CommittedArtifactLoader(repository_root, phase2_revision, trusted_source).load_phase("phase2")
    baseline = _validate_artifact_metadata(phase1)
    _validate_artifact_metadata(phase2, baseline)
    _validate_artifact_metadata(phase3, baseline)
    phase1_hashes = {
        f"{TRACK_DIRECTORY}/{name}": artifact.sha256 for name, artifact in phase1.items()
    }
    phase2_hashes = {
        f"{TRACK_DIRECTORY}/{name}": artifact.sha256 for name, artifact in phase2.items()
    }
    if phase1_provenance.get("output_hashes") != phase1_hashes:
        raise APKInventoryLiveError(
            "INPUT_PROVENANCE_INVALID", "Phase-3 Phase-1 hashes differ from exact loaded blobs"
        )
    if phase2_provenance.get("consumed_output_hashes") != phase2_hashes:
        raise APKInventoryLiveError(
            "INPUT_PROVENANCE_INVALID", "Phase-3 Phase-2 hashes differ from exact loaded blobs"
        )
    expected_phase2_input = {
        "revision": phase1_revision,
        "artifact_sha256": phase1_hashes,
    }
    for name, artifact in phase2.items():
        if artifact.value.get("input_provenance") != expected_phase2_input:
            raise APKInventoryLiveError(
                "INPUT_PROVENANCE_INVALID", f"{name} does not bind exact Phase-1 blobs"
            )
    p1 = project_phase1(phase1)
    p2 = project_phase2(phase2)
    p3 = project_phase3(phase3["phase3-reconciliation.json"])
    validate_cross_artifact_coverage(p1, p2, p3)
    blockers = p2["independent_symmetric_blocking_records"]
    unresolved = p3["unresolved_sources"]
    if blockers or unresolved:
        raise APKInventoryLiveError(
            "UNRESOLVED_INVENTORY_BLOCKERS",
            f"committed artifacts contain {len(blockers)} Phase-2 blockers and {len(unresolved)} Phase-3 unresolved sources",
        )
    if (
        p2.get("discovery_status") != "independent-human-discovery-complete"
        or p2.get("duplicate_status") != "independent-human-discovery-complete"
        or p2.get("historical_status") != "independent-human-discovery-complete"
        or p2.get("status") != "independent-human-discovery-complete"
        or p2.get("coverage_status") != "complete"
        or p3.get("status") != "reconciliation-complete"
    ):
        raise APKInventoryLiveError(
            "INVENTORY_PHASE_INCOMPLETE",
            "committed Phase-2 or Phase-3 status is not truthfully complete",
        )
    all_artifacts = {**phase1, **phase2, **phase3}
    return {
        "revision": revision,
        "phase1_revision": phase1_revision,
        "phase2_revision": phase2_revision,
        "artifact_sha256": {name: artifact.sha256 for name, artifact in all_artifacts.items()},
        "phase1": p1,
        "phase2": p2,
        "phase3": p3,
    }
