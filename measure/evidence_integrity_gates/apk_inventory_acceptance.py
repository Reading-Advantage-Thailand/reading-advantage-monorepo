"""Fail-closed validation for APK inventory Phase-4 acceptance transitions."""

from __future__ import annotations

import hashlib
import json
import re
from collections.abc import Iterable, Mapping
from typing import Any

from measure.evidence_integrity_gates.events import EventResolutionError, EventResolver
from measure.evidence_integrity_gates.git_source import GitSourceAdapter, GitSourceError


_COMMIT_SHA = re.compile(r"[0-9a-f]{40}\Z")
_BLOCKING_SEVERITIES = ("critical", "high", "medium")


def _reject(code: str) -> dict[str, Any]:
    """Builds a stable fail-closed rejection result.

    Args:
        code: Frozen rejection code for the violated contract.

    Returns:
        A reason-coded rejection mapping.
    """
    return {"ok": False, "code": code}


def _json_object(data: object) -> dict[str, Any] | None:
    """Parses canonical artifact bytes into one JSON object.

    Args:
        data: Candidate serialized artifact bytes.

    Returns:
        The decoded object, or None when bytes or JSON shape are invalid.
    """
    if not isinstance(data, bytes):
        return None
    try:
        value = json.loads(data)
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None
    return value if isinstance(value, dict) else None


def _walk(value: object) -> Iterable[Mapping[str, Any]]:
    """Yields every nested mapping in a JSON-compatible value.

    Args:
        value: Value whose nested objects are traversed.

    Returns:
        An iterator over nested mappings, including the root when applicable.
    """
    if isinstance(value, Mapping):
        yield value
        for nested in value.values():
            yield from _walk(nested)
    elif isinstance(value, list):
        for nested in value:
            yield from _walk(nested)


def _record_sets(artifact: Mapping[str, Any]) -> Mapping[str, Any] | None:
    """Returns an artifact's record-set mapping when structurally valid.

    Args:
        artifact: Inventory, discovery, reconciliation, or review artifact.

    Returns:
        The record-set mapping, or None when absent.
    """
    value = artifact.get("record_sets", artifact.get("rerun_record_sets"))
    return value if isinstance(value, Mapping) else None


def _hash(data: bytes) -> str:
    """Calculates a lowercase SHA-256 digest.

    Args:
        data: Exact bytes to hash.

    Returns:
        Lowercase hexadecimal SHA-256 digest.
    """
    return hashlib.sha256(data).hexdigest()


def validate_phase4_inventory_acceptance(
    bundle: Mapping[str, Any],
    resolver: EventResolver,
    source_adapter: GitSourceAdapter,
) -> dict[str, Any]:
    """Validates a complete Phase-4 inventory acceptance transition.

    The validator treats bundle fields as untrusted claims. It independently resolves
    collaboration events and committed Git bytes, verifies exact denominator sets and
    hash bindings, and consumes the product-owner authorization only after every other
    invariant passes.

    Args:
        bundle: Phase-4 artifacts, receipts, immutable bindings, and resource ceilings.
        resolver: Trusted collaboration-event resolver with single-use claiming.
        source_adapter: Git-backed resolver for committed artifacts and evidence lines.

    Returns:
        ``{"ok": True}`` for a valid transition, otherwise a stable reason-coded rejection.
    """
    if not isinstance(bundle, Mapping) or bundle.get("schema_version") != "apk-denominator-phase4-validation.v1":
        return _reject("INVALID_PHASE4_BUNDLE")

    required_roles = bundle.get("required_roles")
    receipts = bundle.get("role_receipts")
    ceilings = bundle.get("frozen_resource_ceilings")
    if not isinstance(required_roles, list) or not isinstance(receipts, list) or not isinstance(ceilings, Mapping):
        return _reject("INVALID_PHASE4_BUNDLE")
    receipt_roles = [receipt.get("role") for receipt in receipts if isinstance(receipt, Mapping)]
    if len(receipt_roles) != len(receipts) or len(set(receipt_roles)) != len(receipt_roles) or set(receipt_roles) != set(required_roles):
        return _reject("MISSING_REQUIRED_ROLE")

    paths = bundle.get("artifact_paths")
    artifact_bytes = bundle.get("artifact_bytes")
    declared_hashes = bundle.get("artifact_sha256")
    artifact_commits = bundle.get("artifact_commits")
    required_artifacts = {
        "raw_inventory",
        "human_discovery",
        "reconciliation",
        "review",
        "candidate",
        "candidate_partition",
        "owner_approval",
        "accepted",
        "accepted_partition",
    }
    if not all(isinstance(value, Mapping) for value in (paths, artifact_bytes, declared_hashes, artifact_commits)):
        return _reject("INVALID_PHASE4_BUNDLE")
    assert isinstance(paths, Mapping)
    assert isinstance(artifact_bytes, Mapping)
    assert isinstance(declared_hashes, Mapping)
    assert isinstance(artifact_commits, Mapping)
    if not required_artifacts.issubset(paths):
        return _reject("INVALID_PHASE4_BUNDLE")

    artifacts: dict[str, dict[str, Any]] = {}
    raw_by_path: dict[str, bytes] = {
        path: data
        for path, data in artifact_bytes.items()
        if isinstance(path, str) and isinstance(data, bytes)
    }
    for name in required_artifacts:
        path = paths.get(name)
        if not isinstance(path, str):
            return _reject("INVALID_PHASE4_BUNDLE")
        data = artifact_bytes.get(path)
        if data is None and name == "owner_approval":
            return _reject("OWNER_APPROVAL_REQUIRED")
        artifact = _json_object(data)
        if artifact is None or not isinstance(data, bytes):
            return _reject("INVALID_PHASE4_BUNDLE")
        artifacts[name] = artifact

    # Provider-resolved role provenance and measured resource use are mandatory.
    resolved_events: dict[str, Mapping[str, Any]] = {}
    for receipt_value in receipts:
        assert isinstance(receipt_value, Mapping)
        role = receipt_value["role"]
        ceiling = ceilings.get(role)
        usage = receipt_value.get("actual_usage")
        if not isinstance(ceiling, Mapping) or not isinstance(usage, Mapping) or set(usage) != set(ceiling):
            return _reject("INVALID_RESOURCE_USAGE")
        for field, limit in ceiling.items():
            value = usage.get(field)
            if (
                not isinstance(limit, int)
                or isinstance(limit, bool)
                or not isinstance(value, int)
                or isinstance(value, bool)
                or value < 0
                or value > limit
            ):
                return _reject("INVALID_RESOURCE_USAGE")
        event_id = receipt_value.get("event_id")
        if not isinstance(event_id, str):
            return _reject("EVENT_UNREACHABLE")
        try:
            event = resolver.resolve(event_id)
        except EventResolutionError:
            return _reject("EVENT_UNREACHABLE")
        expected_event_fields = {
            "task_role": role,
            "session_id": receipt_value.get("session_id"),
            "parent_session_id": receipt_value.get("parent_session_id"),
            "agent": receipt_value.get("agent"),
            "prompt_sha256": receipt_value.get("prompt_sha256"),
            "context_sha256": receipt_value.get("context_sha256"),
            "final_response_sha256": receipt_value.get("final_response_sha256"),
        }
        if any(event.get(field) != expected for field, expected in expected_event_fields.items()):
            return _reject("EVENT_IDENTITY_MISMATCH")
        resolved_events[role] = event

    reviewer_event = resolved_events.get("adversarial-reviewer")
    if reviewer_event is None:
        return _reject("MISSING_REQUIRED_ROLE")
    if reviewer_event.get("fork_turns") != "none" or reviewer_event.get("inherited_turn_count", 0) != 0:
        return _reject("INHERITED_REVIEWER_CONTEXT")

    raw = artifacts["raw_inventory"]
    human = artifacts["human_discovery"]
    reconciliation = artifacts["reconciliation"]
    review = artifacts["review"]
    candidate = artifacts["candidate"]
    partition = artifacts["candidate_partition"]
    owner = artifacts["owner_approval"]
    accepted = artifacts["accepted"]
    accepted_partition = artifacts["accepted_partition"]

    review_event_id = review.get("reviewer_event_id")
    if not isinstance(review_event_id, str):
        return _reject("EVENT_UNREACHABLE")
    try:
        artifact_reviewer_event = resolver.resolve(review_event_id)
    except EventResolutionError:
        return _reject("EVENT_UNREACHABLE")
    if artifact_reviewer_event.get("task_role") != "adversarial-reviewer":
        return _reject("EVENT_IDENTITY_MISMATCH")

    quarantined_prefix = bundle.get("quarantined_prefix")
    if not isinstance(quarantined_prefix, str) or not quarantined_prefix:
        return _reject("INVALID_PHASE4_BUNDLE")
    for artifact in (raw, human, reconciliation):
        for value in _walk(artifact):
            locator_keys = {"revision", "path", "line_start", "line_end", "cited_range_sha256"}
            if not locator_keys.issubset(value):
                continue
            path = value.get("path")
            if isinstance(path, str) and path.startswith(quarantined_prefix):
                return _reject("QUARANTINED_SOURCE")
            try:
                resolved = source_adapter.resolve(
                    str(value.get("revision")),
                    str(path),
                    value.get("line_start"),
                    value.get("line_end"),
                )
            except (GitSourceError, TypeError):
                return _reject("SOURCE_LOCATOR_INVALID")
            if _hash(resolved.cited_bytes) != value.get("cited_range_sha256"):
                return _reject("SOURCE_LOCATOR_INVALID")

    if human.get("discovery_origin") != "independent-raw-source-event":
        return _reject("AUTHORED_DENOMINATOR_REJECTED")
    human_event_id = human.get("event_id")
    try:
        human_event = resolver.resolve(str(human_event_id))
    except EventResolutionError:
        return _reject("EVENT_UNREACHABLE")
    if human_event.get("task_role") != "evidence-collector":
        return _reject("EVENT_IDENTITY_MISMATCH")

    raw_sets = _record_sets(raw)
    human_sets = _record_sets(human)
    reconciliation_sets = _record_sets(reconciliation)
    review_sets = _record_sets(review)
    if not all(isinstance(value, Mapping) for value in (raw_sets, human_sets, reconciliation_sets, review_sets)):
        return _reject("INCOMPLETE_RECORD_SET")
    assert isinstance(raw_sets, Mapping)
    assert isinstance(human_sets, Mapping)
    assert isinstance(reconciliation_sets, Mapping)
    assert isinstance(review_sets, Mapping)

    for record_set in reconciliation_sets.values():
        if not isinstance(record_set, list):
            return _reject("INCOMPLETE_RECORD_SET")
        record_ids = [row.get("record_id") for row in record_set if isinstance(row, Mapping)]
        if len(record_ids) != len(record_set):
            return _reject("INCOMPLETE_RECORD_SET")
        if len(record_ids) != len(set(record_ids)):
            return _reject("DUPLICATE_RECORD")

    # Transition claims must be supported by their exact cited source bytes before
    # cross-artifact set comparison, so coordinated unsupported claims fail precisely.
    for record_set_map in (raw_sets, reconciliation_sets):
        surfaces = record_set_map.get("surfaces")
        if not isinstance(surfaces, list):
            return _reject("INCOMPLETE_RECORD_SET")
        for surface in surfaces:
            if not isinstance(surface, Mapping) or surface.get("kind") != "transition":
                continue
            signature = surface.get("source_signature")
            evidence = surface.get("evidence")
            if not isinstance(signature, str) or not isinstance(evidence, list) or not evidence:
                return _reject("UNSUPPORTED_TRANSITION_CLAIM")
            supported = False
            for locator in evidence:
                if not isinstance(locator, Mapping):
                    continue
                try:
                    cited = source_adapter.resolve(
                        str(locator.get("revision")),
                        str(locator.get("path")),
                        locator.get("line_start"),
                        locator.get("line_end"),
                    ).cited_bytes
                except (GitSourceError, TypeError):
                    continue
                if signature.encode() in cited:
                    supported = True
                    break
            if not supported:
                return _reject("UNSUPPORTED_TRANSITION_CLAIM")

    if raw_sets != human_sets or raw_sets != reconciliation_sets or raw_sets != review_sets:
        return _reject("INCOMPLETE_RECORD_SET")

    chm = review.get("blocking_findings_by_severity")
    if not isinstance(chm, Mapping):
        return _reject("NON_INTEGER_CHM_COUNT")
    for severity in _BLOCKING_SEVERITIES:
        value = chm.get(severity)
        if not isinstance(value, int) or isinstance(value, bool):
            return _reject("NON_INTEGER_CHM_COUNT")
        if value != 0:
            return _reject("BLOCKING_FINDINGS_REMAIN")

    phase_base = bundle.get("phase_base_sha")
    source_baseline = bundle.get("source_baseline_revision")
    gate_hash = bundle.get("predecessor_gate_sha256")
    reconciliation_path = paths["reconciliation"]
    review_path = paths["review"]
    candidate_path = paths["candidate"]
    partition_path = paths["candidate_partition"]
    owner_path = paths["owner_approval"]
    if (
        review.get("status") != "independent-review-complete"
        or review.get("phase_base_sha") != phase_base
        or review.get("source_baseline_revision") != source_baseline
        or review.get("reconciliation_sha256") != _hash(raw_by_path[reconciliation_path])
    ):
        return _reject("REVIEW_BINDING_MISMATCH")
    expected_candidate_hashes = {
        "reconciliation": _hash(raw_by_path[reconciliation_path]),
        "review": _hash(raw_by_path[review_path]),
        "gate": gate_hash,
    }
    if (
        candidate.get("status") != "candidate-non-consumable"
        or candidate.get("consumable") is not False
        or candidate.get("phase_base_sha") != phase_base
        or candidate.get("source_baseline_revision") != source_baseline
        or candidate.get("bound_hashes") != expected_candidate_hashes
    ):
        return _reject("CANDIDATE_HASH_MISMATCH")

    identities = raw_sets.get("identities")
    assignments = partition.get("assignments")
    if not isinstance(identities, list) or not isinstance(assignments, list):
        return _reject("INCOMPLETE_SIMULTANEOUS_CLASSIFICATION")
    expected_assignments = [
        {"identity_id": row.get("identity_id"), "states": row.get("states")}
        for row in identities
        if isinstance(row, Mapping)
    ]
    if (
        partition.get("status") != "candidate-non-consumable"
        or partition.get("consumable") is not False
        or assignments != expected_assignments
    ):
        return _reject("INCOMPLETE_SIMULTANEOUS_CLASSIFICATION")
    if partition.get("candidate_sha256") != _hash(raw_by_path[candidate_path]):
        return _reject("ARTIFACT_COMMIT_MISMATCH")

    expected_approved_hashes = {
        "candidate": _hash(raw_by_path[candidate_path]),
        "candidate_partition": _hash(raw_by_path[partition_path]),
        "review": _hash(raw_by_path[review_path]),
        "gate": gate_hash,
    }
    if owner.get("decision") != "approve" or owner.get("approved_hashes") != expected_approved_hashes:
        return _reject("OWNER_APPROVAL_HASH_MISMATCH")
    owner_event_id = owner.get("event_id")
    if not isinstance(owner_event_id, str):
        return _reject("FORGED_OWNER_APPROVAL")
    try:
        owner_event = resolver.resolve(owner_event_id)
    except EventResolutionError:
        return _reject("FORGED_OWNER_APPROVAL")
    if owner_event.get("role") != "user" or owner_event.get("actor_role") != "product-owner":
        return _reject("FORGED_OWNER_APPROVAL")
    reviewer_completed = reviewer_event.get("completed_ms")
    owner_created = owner_event.get("created_ms")
    if (
        not isinstance(reviewer_completed, int)
        or isinstance(reviewer_completed, bool)
        or not isinstance(owner_created, int)
        or isinstance(owner_created, bool)
        or owner_created <= reviewer_completed
    ):
        return _reject("OWNER_ORDERING_INVALID")
    owner_message = json.dumps(
        {"decision": "approve", "approved_hashes": expected_approved_hashes},
        sort_keys=True,
        separators=(",", ":"),
    ).encode() + b"\n"
    if (
        owner_event.get("session_id") != owner.get("session_id")
        or owner_event.get("created_ms") != owner.get("event_timestamp_ms")
        or owner_event.get("approved_hashes") != expected_approved_hashes
        or owner_event.get("message_bytes") != owner_message
        or owner_event.get("message_sha256") != _hash(owner_message)
        or owner.get("message_sha256") != _hash(owner_message)
    ):
        return _reject("FORGED_OWNER_APPROVAL")

    owner_hash = _hash(raw_by_path[owner_path])
    if (
        accepted.get("status") != "accepted"
        or accepted.get("consumable") is not True
        or accepted.get("candidate_sha256") != expected_approved_hashes["candidate"]
        or accepted.get("review_sha256") != expected_approved_hashes["review"]
        or accepted.get("owner_approval_sha256") != owner_hash
        or accepted.get("gate_sha256") != gate_hash
        or accepted_partition.get("status") != "accepted"
        or accepted_partition.get("consumable") is not True
        or accepted_partition.get("candidate_partition_sha256") != expected_approved_hashes["candidate_partition"]
        or accepted_partition.get("owner_approval_sha256") != owner_hash
        or accepted_partition.get("assignments") != expected_assignments
    ):
        return _reject("ACCEPTED_BINDING_MISMATCH")

    # Only after semantic checks do coordinated worktree bytes get compared with
    # immutable declarations and commits. This preserves the most specific attack code.
    for path, data in raw_by_path.items():
        if declared_hashes.get(path) != _hash(data):
            return _reject("ARTIFACT_COMMIT_MISMATCH")
        commit = artifact_commits.get(path)
        if not isinstance(commit, str) or _COMMIT_SHA.fullmatch(commit) is None:
            return _reject("ARTIFACT_COMMIT_MISMATCH")
        try:
            committed = source_adapter.resolve_blob_bytes(commit, path)
        except GitSourceError:
            return _reject("ARTIFACT_COMMIT_MISMATCH")
        if committed != data:
            return _reject("ARTIFACT_COMMIT_MISMATCH")

    for receipt_value in receipts:
        assert isinstance(receipt_value, Mapping)
        commit = receipt_value.get("commit_sha")
        if not isinstance(commit, str) or _COMMIT_SHA.fullmatch(commit) is None:
            return _reject("RECEIPT_COMMIT_UNREACHABLE")
        outputs = receipt_value.get("output_sha256")
        if not isinstance(outputs, Mapping):
            return _reject("RECEIPT_OUTPUT_MISMATCH")
        for path, digest in outputs.items():
            if not isinstance(path, str) or raw_by_path.get(path) is None or digest != _hash(raw_by_path[path]):
                return _reject("RECEIPT_OUTPUT_MISMATCH")
            try:
                committed = source_adapter.resolve_blob_bytes(commit, path)
            except GitSourceError:
                return _reject("RECEIPT_COMMIT_UNREACHABLE")
            if committed != raw_by_path[path]:
                return _reject("RECEIPT_COMMIT_UNREACHABLE")

    if not resolver.claim_once(owner_event_id):
        return _reject("REPLAYED_OWNER_APPROVAL")
    return {"ok": True}


__all__ = ["validate_phase4_inventory_acceptance"]
