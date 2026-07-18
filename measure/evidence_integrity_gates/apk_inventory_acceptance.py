"""Fail-closed validation for APK inventory Phase-4 acceptance transitions."""

from __future__ import annotations

import hashlib
import json
import re
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from pathlib import PurePosixPath
from typing import Any

from measure.evidence_integrity_gates.events import EventResolutionError, EventResolver
from measure.evidence_integrity_gates.git_source import GitSourceAdapter, GitSourceError


_COMMIT_SHA = re.compile(r"[0-9a-f]{40}\Z")
_SHA256 = re.compile(r"[0-9a-f]{64}\Z")
_BLOCKING_SEVERITIES = ("critical", "high", "medium")
_ROLE_RECEIPT_SCHEMA = "apk-role-receipt.v1"


@dataclass(frozen=True)
class TrustedPhase4Authority:
    """Identifies committed Phase-0 authority outside the untrusted bundle.

    Args:
        phase0_commit_sha: Reachable commit containing both frozen authority files.
        input_freeze_path: Repository path to the frozen input manifest.
        ownership_manifest_path: Repository path to the frozen ownership manifest.
        admitted_phase_base_sha: Reviewed Phase 0-3 commit from which Phase 4 descends.
    """

    phase0_commit_sha: str
    input_freeze_path: str
    ownership_manifest_path: str
    admitted_phase_base_sha: str


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


def _canonical_hash(value: object) -> str:
    """Hashes one JSON value using the receipt contract's canonical encoding.

    Args:
        value: JSON-compatible value whose exact logical content is bound.

    Returns:
        Lowercase SHA-256 digest of compact, sorted-key JSON bytes.
    """
    return _hash(json.dumps(value, sort_keys=True, separators=(",", ":")).encode())


def _frozen_role_tasks(
    ownership: Mapping[str, Any], trusted_roles: list[Any]
) -> dict[str, Mapping[str, Any]] | None:
    """Validates frozen task and incompatibility authority for every role.

    Args:
        ownership: Trusted Phase-0 ownership manifest.
        trusted_roles: Frozen ordered role names.

    Returns:
        Tasks keyed by owner role, or None when authority is malformed.
    """
    if not all(isinstance(role, str) and role for role in trusted_roles):
        return None
    role_set = set(trusted_roles)
    tasks = ownership.get("tasks")
    incompatible = ownership.get("incompatible_roles")
    if not isinstance(tasks, list) or not isinstance(incompatible, list):
        return None
    by_role: dict[str, Mapping[str, Any]] = {}
    task_ids: set[str] = set()
    for task in tasks:
        if not isinstance(task, Mapping):
            return None
        role = task.get("owner_role")
        task_id = task.get("task_id")
        outputs = task.get("expected_outputs")
        forbidden = task.get("forbidden_roles")
        if (
            role not in role_set
            or role in by_role
            or not isinstance(task_id, str)
            or not task_id
            or task_id in task_ids
            or not isinstance(outputs, list)
            or not outputs
            or not all(isinstance(path, str) and path for path in outputs)
            or len(outputs) != len(set(outputs))
            or not isinstance(forbidden, list)
            or not all(isinstance(value, str) and value for value in forbidden)
            or len(forbidden) != len(set(forbidden))
            or set(forbidden) != role_set - {role}
        ):
            return None
        by_role[role] = task
        task_ids.add(task_id)
    expected_pairs = {
        frozenset((left, right))
        for index, left in enumerate(trusted_roles)
        for right in trusted_roles[index + 1 :]
    }
    actual_pairs: set[frozenset[str]] = set()
    for pair in incompatible:
        if (
            not isinstance(pair, list)
            or len(pair) != 2
            or not all(isinstance(role, str) and role in role_set for role in pair)
            or pair[0] == pair[1]
        ):
            return None
        actual_pairs.add(frozenset(pair))
    input_manifest_path = ownership.get("allowed_input_manifest_path")
    if (
        set(by_role) != role_set
        or actual_pairs != expected_pairs
        or len(incompatible) != len(expected_pairs)
        or not isinstance(input_manifest_path, str)
        or not _safe_relative_path(input_manifest_path)
    ):
        return None
    return by_role, str(PurePosixPath(input_manifest_path).parent)


def _safe_relative_path(path: str) -> bool:
    """Checks that a repository path is normalized and cannot escape.

    Args:
        path: Candidate repository-relative path.

    Returns:
        Whether the path is normalized, relative, and traversal-free.
    """
    parsed = PurePosixPath(path)
    return (
        bool(path)
        and path != "."
        and bool(parsed.parts)
        and "\\" not in path
        and not parsed.is_absolute()
        and parsed.as_posix() == path
        and "." not in parsed.parts
        and ".." not in parsed.parts
    )


def _outputs_match_frozen_task(
    expected: object, actual: Mapping[str, Any], output_prefix: str
) -> bool:
    """Checks receipt output paths against one frozen task declaration.

    Args:
        expected: Frozen expected-output list.
        actual: Receipt output hash mapping.
        output_prefix: Trusted directory containing basename-only declarations.

    Returns:
        Whether normalized exact paths match the frozen declaration.
    """
    if (
        not isinstance(expected, list)
        or not all(isinstance(path, str) and _safe_relative_path(path) for path in expected)
        or not all(isinstance(path, str) and _safe_relative_path(path) for path in actual)
        or not _safe_relative_path(output_prefix)
    ):
        return False
    if any("/" in path for path in expected):
        expected_paths = set(expected)
    else:
        expected_paths = {f"{output_prefix}/{path}" for path in expected}
    return set(actual) == expected_paths and len(actual) == len(expected_paths)


def _event_has_fresh_context(event: Mapping[str, Any]) -> bool:
    """Checks explicit or retained-raw proof of a fresh role context.

    Args:
        event: Trusted provider-resolved role event.

    Returns:
        Whether the event proves zero inherited turns and fresh context.
    """
    inherited = event.get("inherited_turn_count", 0)
    if not isinstance(inherited, int) or isinstance(inherited, bool) or inherited != 0:
        return False
    if event.get("fork_turns") == "none":
        return True
    if "fork_turns" in event:
        return False
    omissions = event.get("schema_omissions")
    return (
        isinstance(omissions, list)
        and "fork_turns" in omissions
        and event.get("reviewer_isolation_proof")
        == "raw-history-begins-with-fresh-prompt"
    )


def _is_ancestor(source_adapter: GitSourceAdapter, ancestor: str, descendant: str) -> bool:
    """Checks commit ancestry through the trusted Git adapter's repository.

    Args:
        source_adapter: Git adapter whose object database is authoritative.
        ancestor: Commit expected to be an ancestor.
        descendant: Commit expected to descend from ancestor.

    Returns:
        Whether Git proves the required ancestry relation.
    """
    run = getattr(source_adapter, "_run", None)
    if not callable(run):
        return False
    result = run("merge-base", "--is-ancestor", ancestor, descendant)
    return result.returncode == 0


def _trusted_contract(
    authority: TrustedPhase4Authority,
    source_adapter: GitSourceAdapter,
) -> tuple[dict[str, Any], dict[str, Any]] | None:
    """Loads and cross-binds both committed Phase-0 authority manifests.

    Args:
        authority: Out-of-band trusted revision and paths.
        source_adapter: Git adapter used to load immutable manifest bytes.

    Returns:
        Parsed input-freeze and ownership manifests, or None when invalid.
    """
    if any(
        _COMMIT_SHA.fullmatch(value) is None
        for value in (authority.phase0_commit_sha, authority.admitted_phase_base_sha)
    ):
        return None
    try:
        freeze_bytes = source_adapter.resolve_blob_bytes(
            authority.phase0_commit_sha, authority.input_freeze_path
        )
        ownership_bytes = source_adapter.resolve_blob_bytes(
            authority.phase0_commit_sha, authority.ownership_manifest_path
        )
    except GitSourceError:
        return None
    freeze = _json_object(freeze_bytes)
    ownership = _json_object(ownership_bytes)
    if freeze is None or ownership is None:
        return None
    if (
        freeze.get("schema_version") != "apk-source-denominator.phase0-input-freeze.v1"
        or ownership.get("schema_version")
        != "apk-source-denominator.phase0-role-ownership.v1"
        or ownership.get("allowed_input_manifest_path") != authority.input_freeze_path
        or ownership.get("allowed_input_manifest_sha256") != _hash(freeze_bytes)
        or not _is_ancestor(
            source_adapter, authority.phase0_commit_sha, authority.admitted_phase_base_sha
        )
    ):
        return None
    return freeze, ownership


def _locator_parts(value: Mapping[str, Any]) -> tuple[str, str, str | None, int, int, str] | None:
    """Adapts a supported flat or live nested source locator.

    Args:
        value: Candidate locator mapping.

    Returns:
        Revision, path, optional blob hash, range bounds, and range hash.
    """
    revision = value.get("revision")
    path = value.get("path")
    if not isinstance(revision, str) or not isinstance(path, str):
        return None
    nested_range = value.get("range")
    if isinstance(nested_range, Mapping):
        blob_sha256 = value.get("blob_sha256")
        start = nested_range.get("start_line")
        end = nested_range.get("end_line")
        range_sha256 = nested_range.get("sha256")
        if (
            not isinstance(blob_sha256, str)
            or not isinstance(start, int)
            or isinstance(start, bool)
            or not isinstance(end, int)
            or isinstance(end, bool)
            or not isinstance(range_sha256, str)
        ):
            return None
        return revision, path, blob_sha256, start, end, range_sha256
    flat_keys = {"line_start", "line_end", "cited_range_sha256"}
    if flat_keys.issubset(value):
        start = value.get("line_start")
        end = value.get("line_end")
        range_sha256 = value.get("cited_range_sha256")
        if (
            not isinstance(start, int)
            or isinstance(start, bool)
            or not isinstance(end, int)
            or isinstance(end, bool)
            or not isinstance(range_sha256, str)
        ):
            return None
        blob_sha256 = value.get("blob_sha256")
        if blob_sha256 is not None and not isinstance(blob_sha256, str):
            return None
        return revision, path, blob_sha256, start, end, range_sha256
    return None


def _looks_like_locator(value: Mapping[str, Any]) -> bool:
    """Reports whether a mapping makes a source-locator-shaped claim.

    Args:
        value: Nested artifact mapping.

    Returns:
        Whether unrecognized locator data must fail closed.
    """
    return (
        "revision" in value
        and "path" in value
        and any(
            key in value
            for key in ("blob_sha256", "range", "line_start", "line_end", "cited_range_sha256", "line_span")
        )
    )


def _resolve_locator(
    value: Mapping[str, Any],
    source_adapter: GitSourceAdapter,
    baseline: str,
    roots: tuple[str, ...],
    quarantined_prefix: str,
) -> tuple[bytes, str | None]:
    """Resolves and validates one supported committed locator.

    Args:
        value: Locator mapping from a Phase 0-3 artifact.
        source_adapter: Trusted committed-source resolver.
        baseline: Frozen current-source revision.
        roots: Frozen allowed source roots.
        quarantined_prefix: Frozen failed-track prefix.

    Returns:
        Cited bytes and an optional stable rejection code.
    """
    parts = _locator_parts(value)
    if parts is None:
        return b"", "UNRECOGNIZED_SOURCE_LOCATOR"
    revision, path, blob_sha256, start, end, range_sha256 = parts
    if path.startswith(quarantined_prefix):
        return b"", "QUARANTINED_SOURCE"
    if path.startswith("/") or not any(path == root or path.startswith(f"{root}/") for root in roots):
        return b"", "SOURCE_LOCATOR_INVALID"
    if revision != baseline and not _is_ancestor(source_adapter, revision, baseline):
        return b"", "SOURCE_LOCATOR_INVALID"
    try:
        blob = source_adapter.resolve_blob_bytes(revision, path)
        resolved = source_adapter.resolve(revision, path, start, end)
    except (GitSourceError, TypeError):
        return b"", "SOURCE_LOCATOR_INVALID"
    if (
        blob_sha256 is not None
        and _hash(blob) != blob_sha256
        or _hash(resolved.cited_bytes) != range_sha256
    ):
        return b"", "SOURCE_LOCATOR_INVALID"
    return resolved.cited_bytes, None


def validate_phase4_inventory_acceptance(
    bundle: Mapping[str, Any],
    resolver: EventResolver,
    source_adapter: GitSourceAdapter,
    authority: TrustedPhase4Authority,
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
        authority: Out-of-band committed Phase-0 and admitted phase-base authority.

    Returns:
        ``{"ok": True}`` for a valid transition, otherwise a stable reason-coded rejection.
    """
    if not isinstance(bundle, Mapping) or bundle.get("schema_version") != "apk-denominator-phase4-validation.v1":
        return _reject("INVALID_PHASE4_BUNDLE")

    trusted = _trusted_contract(authority, source_adapter)
    if trusted is None:
        return _reject("FROZEN_AUTHORITY_INVALID")
    freeze, ownership = trusted
    trusted_roles = ownership.get("required_roles")
    trusted_ceilings = freeze.get("frozen_resource_ceilings")
    stop_loss = freeze.get("stop_loss")
    source_scope = freeze.get("source_scope")
    predecessor = freeze.get("accepted_predecessor")
    quarantine = freeze.get("failed_track_quarantine")
    if not all(
        isinstance(value, Mapping)
        for value in (trusted_ceilings, stop_loss, source_scope, predecessor, quarantine)
    ) or not isinstance(trusted_roles, list):
        return _reject("FROZEN_AUTHORITY_INVALID")
    assert isinstance(trusted_ceilings, Mapping)
    assert isinstance(stop_loss, Mapping)
    assert isinstance(source_scope, Mapping)
    assert isinstance(predecessor, Mapping)
    assert isinstance(quarantine, Mapping)
    baseline = source_scope.get("current_revision")
    roots_value = source_scope.get("roots")
    quarantine_path = quarantine.get("path")
    gate_hash = predecessor.get("manifest_sha256")
    if (
        not isinstance(baseline, str)
        or _COMMIT_SHA.fullmatch(baseline) is None
        or not isinstance(roots_value, list)
        or not roots_value
        or not all(isinstance(root, str) and root for root in roots_value)
        or not isinstance(quarantine_path, str)
        or not quarantine_path
        or not isinstance(gate_hash, str)
        or not _is_ancestor(source_adapter, baseline, authority.admitted_phase_base_sha)
    ):
        return _reject("FROZEN_AUTHORITY_INVALID")
    roots = tuple(roots_value)
    quarantined_prefix = quarantine_path.rstrip("/") + "/"

    required_roles = bundle.get("required_roles")
    receipts = bundle.get("role_receipts")
    ceilings = bundle.get("frozen_resource_ceilings")
    if not isinstance(required_roles, list) or not isinstance(receipts, list) or not isinstance(ceilings, Mapping):
        return _reject("INVALID_PHASE4_BUNDLE")
    if (
        required_roles != trusted_roles
        or ceilings != trusted_ceilings
        or bundle.get("phase_base_sha") != authority.admitted_phase_base_sha
        or bundle.get("source_baseline_revision") != baseline
        or bundle.get("predecessor_gate_sha256") != gate_hash
        or bundle.get("quarantined_prefix") != quarantined_prefix
    ):
        return _reject("FROZEN_AUTHORITY_MISMATCH")
    receipt_roles = [receipt.get("role") for receipt in receipts if isinstance(receipt, Mapping)]
    if len(receipt_roles) != len(receipts) or len(set(receipt_roles)) != len(receipt_roles) or set(receipt_roles) != set(required_roles):
        return _reject("MISSING_REQUIRED_ROLE")
    role_contract = _frozen_role_tasks(ownership, trusted_roles)
    if role_contract is None:
        return _reject("FROZEN_AUTHORITY_INVALID")
    role_tasks, frozen_output_prefix = role_contract

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
    receipt_contract = ownership.get("receipt_contract")
    if not isinstance(receipt_contract, Mapping):
        return _reject("FROZEN_AUTHORITY_INVALID")
    required_provenance = receipt_contract.get("required_provenance")
    if (
        receipt_contract.get("schema_version") != _ROLE_RECEIPT_SCHEMA
        or not isinstance(required_provenance, list)
        or not all(isinstance(field, str) for field in required_provenance)
    ):
        return _reject("FROZEN_AUTHORITY_INVALID")
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
        if (
            receipt_value.get("schema_version") != _ROLE_RECEIPT_SCHEMA
            or any(field not in receipt_value for field in required_provenance)
            or not isinstance(receipt_value.get("spawn_id"), str)
            or not receipt_value.get("spawn_id")
            or not isinstance(receipt_value.get("parent_ancestry_ids"), list)
            or not all(isinstance(value, str) for value in receipt_value.get("parent_ancestry_ids", []))
            or any(
                not isinstance(receipt_value.get(field), str)
                or _SHA256.fullmatch(receipt_value[field]) is None
                for field in (
                    "prompt_sha256",
                    "actual_context_manifest_sha256",
                    "final_response_sha256",
                    "output_sha256",
                    "budget_declaration_sha256",
                )
            )
            or any(
                not isinstance(receipt_value.get(field), str)
                or not receipt_value[field]
                for field in ("start_event_id", "end_event_id")
            )
            or not isinstance(receipt_value.get("commit_sha"), str)
            or _COMMIT_SHA.fullmatch(receipt_value["commit_sha"]) is None
        ):
            return _reject("INVALID_ROLE_RECEIPT_V1")
        outputs = receipt_value.get("output_hashes")
        if (
            not isinstance(outputs, Mapping)
            or not outputs
            or not all(
                isinstance(path, str)
                and bool(path)
                and isinstance(digest, str)
                and _SHA256.fullmatch(digest) is not None
                for path, digest in outputs.items()
            )
            or receipt_value.get("output_sha256") != _canonical_hash(outputs)
        ):
            return _reject("INVALID_ROLE_RECEIPT_V1")
        task = role_tasks[role]
        if receipt_value.get("task_id") != task.get("task_id"):
            return _reject("TASK_OWNERSHIP_MISMATCH")
        if not _outputs_match_frozen_task(
            task.get("expected_outputs"), outputs, frozen_output_prefix
        ):
            return _reject("OUTPUT_OWNERSHIP_MISMATCH")
        observations = receipt_value.get("stop_loss_observations")
        expected_observation_keys = {
            "unsupported_factual_claims",
            "denominator_mismatches",
            "failed_fix_review_cycles",
            "unresolved_blocking_findings",
        }
        if not isinstance(observations, Mapping) or set(observations) != expected_observation_keys:
            return _reject("INVALID_STOP_LOSS_OBSERVATION")
        for field in expected_observation_keys - {"unresolved_blocking_findings"}:
            value = observations.get(field)
            if not isinstance(value, int) or isinstance(value, bool) or value < 0:
                return _reject("INVALID_STOP_LOSS_OBSERVATION")
        unresolved = observations.get("unresolved_blocking_findings")
        severities = stop_loss.get("unresolved_blocking_severities")
        if (
            not isinstance(severities, list)
            or not isinstance(unresolved, Mapping)
            or set(unresolved) != set(severities)
            or any(not isinstance(value, int) or isinstance(value, bool) or value < 0 for value in unresolved.values())
        ):
            return _reject("INVALID_STOP_LOSS_OBSERVATION")
        unsupported_limit = stop_loss.get("unsupported_factual_claims_before_stop")
        mismatch_limit = stop_loss.get("denominator_mismatches_before_stop")
        cycle_limit = stop_loss.get("failed_fix_review_cycles_before_block")
        if any(not isinstance(value, int) or isinstance(value, bool) or value < 1 for value in (unsupported_limit, mismatch_limit, cycle_limit)):
            return _reject("FROZEN_AUTHORITY_INVALID")
        if (
            observations["unsupported_factual_claims"] >= unsupported_limit
            or observations["denominator_mismatches"] >= mismatch_limit
            or observations["failed_fix_review_cycles"] >= cycle_limit
            or any(value != 0 for value in unresolved.values())
        ):
            return _reject("STOP_LOSS_BREACHED")
        event_id = receipt_value.get("end_event_id")
        if not isinstance(event_id, str):
            return _reject("EVENT_UNREACHABLE")
        try:
            event = resolver.resolve(event_id)
        except EventResolutionError:
            return _reject("EVENT_UNREACHABLE")
        if event.get("task_id") != task.get("task_id"):
            return _reject("TASK_OWNERSHIP_MISMATCH")
        expected_event_fields = {
            "task_role": role,
            "spawn_id": receipt_value.get("spawn_id"),
            "parent_ancestry_ids": receipt_value.get("parent_ancestry_ids"),
            "prompt_sha256": receipt_value.get("prompt_sha256"),
            "actual_context_manifest_sha256": receipt_value.get("actual_context_manifest_sha256"),
            "start_event_id": receipt_value.get("start_event_id"),
            "end_event_id": receipt_value.get("end_event_id"),
            "final_response_sha256": receipt_value.get("final_response_sha256"),
            "budget_declaration_sha256": receipt_value.get("budget_declaration_sha256"),
        }
        if any(event.get(field) != expected for field, expected in expected_event_fields.items()):
            return _reject("EVENT_IDENTITY_MISMATCH")
        if event.get("output_hashes") != outputs:
            return _reject("PROVIDER_OUTPUT_MISMATCH")
        if not _event_has_fresh_context(event):
            return _reject(
                "INHERITED_REVIEWER_CONTEXT"
                if role == "adversarial-reviewer"
                else "INHERITED_ROLE_CONTEXT"
            )
        resolved_events[role] = event

    reviewer_event = resolved_events.get("adversarial-reviewer")
    if reviewer_event is None:
        return _reject("MISSING_REQUIRED_ROLE")

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

    for artifact in (raw, human, reconciliation):
        for value in _walk(artifact):
            if not _looks_like_locator(value):
                continue
            _, locator_error = _resolve_locator(
                value, source_adapter, baseline, roots, quarantined_prefix
            )
            if locator_error is not None:
                return _reject(locator_error)

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
                cited, locator_error = _resolve_locator(
                    locator, source_adapter, baseline, roots, quarantined_prefix
                )
                if locator_error is not None:
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
        if not _is_ancestor(source_adapter, authority.admitted_phase_base_sha, commit):
            return _reject("ARTIFACT_ANCESTRY_INVALID")
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
        outputs = receipt_value.get("output_hashes")
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


__all__ = ["TrustedPhase4Authority", "validate_phase4_inventory_acceptance"]
