"""Fail-closed validation for APK inventory Phase-4 acceptance transitions."""

from __future__ import annotations

import hashlib
import json
import re
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any

from measure.evidence_integrity_gates.apk_inventory_live import (
    APKInventoryLiveError,
    PHASE_ARTIFACT_PATHS,
    TRACK_DIRECTORY,
    canonical_task_prompt,
    load_live_phase_bundle,
    normalize_resolved_event,
)
from measure.evidence_integrity_gates.events import EventResolutionError, EventResolver
from measure.evidence_integrity_gates.git_source import GitSourceAdapter, GitSourceError
from measure.evidence_integrity_gates.opencode_provenance import (
    ProvenanceError,
    RoleBinding,
    build_resolved_event,
)
from measure.evidence_integrity_gates.t2_role_accounting import (
    T2RoleAccountingError,
    derive_t2_actual_usage,
)
from measure.evidence_integrity_gates.t2_role_receipt import (
    T2RoleReceiptError,
    _canonical_json as _receipt_canonical_json,
    _context_manifest_bytes,
    _derived_execution_contract,
    _trusted_authority,
    _validate_direct_write_content,
    _validate_execution_trace,
    _validated_commit_binding,
    _validated_stop_loss,
)


_COMMIT_SHA = re.compile(r"[0-9a-f]{40}\Z")
_SHA256 = re.compile(r"[0-9a-f]{64}\Z")
_BLOCKING_SEVERITIES = ("critical", "high", "medium")
_ROLE_RECEIPT_SCHEMA = "apk-role-receipt.v1"
_EVIDENCE_LINEAGE_FIELDS = (
    "schema_version",
    "track_id",
    "task_id",
    "role",
    "phase0_authority_commit",
    "commit_sha",
    "output_hashes",
    "output_sha256",
    "commit_binding",
)


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


def _has_production_artifact_contract(freeze: Mapping[str, Any]) -> bool:
    """Checks whether frozen authority declares the complete production artifact set."""
    expected = freeze.get("expected_artifacts")
    if not isinstance(expected, list):
        return False
    declared_values = [
        item.get("path")
        for item in expected
        if isinstance(item, Mapping) and set(item) == {"path"} and isinstance(item.get("path"), str)
    ]
    declared = set(declared_values)
    required = {
        f"{TRACK_DIRECTORY}/{name}"
        for names in PHASE_ARTIFACT_PATHS.values()
        for name in names
    }
    required.update(
        {
            f"{TRACK_DIRECTORY}/denominator-method.md",
            f"{TRACK_DIRECTORY}/denominator-contract-test-report.json",
            f"{TRACK_DIRECTORY}/independent-review.json",
            f"{TRACK_DIRECTORY}/candidate-denominator-manifest.json",
            f"{TRACK_DIRECTORY}/candidate-partition-manifest.json",
            f"{TRACK_DIRECTORY}/product-owner-acceptance.json",
            f"{TRACK_DIRECTORY}/accepted-denominator-manifest.json",
            f"{TRACK_DIRECTORY}/accepted-partition-manifest.json",
        }
    )
    return len(declared_values) == len(expected) == len(declared) and required == declared


def _rebuild_production_role_event(
    receipt: Mapping[str, Any],
    task: Mapping[str, Any],
    event: Mapping[str, Any],
    source_adapter: GitSourceAdapter,
    authority: TrustedPhase4Authority,
    admitted_evidence_receipt: Mapping[str, Any],
) -> Mapping[str, Any]:
    """Rebuilds one role event solely from raw bytes and committed Phase-0 authority."""
    try:
        repository_root = source_adapter._root
        raw = event.get("raw_export_bytes")
        role = receipt.get("role")
        session_id = receipt.get("spawn_id")
        provider_agent = receipt.get("provider_agent")
        raw_hash = receipt.get("raw_export_sha256")
        commit = receipt.get("commit_sha")
        outputs = receipt.get("output_hashes")
        if (
            not isinstance(repository_root, Path)
            or not isinstance(raw, bytes)
            or not isinstance(role, str)
            or not role
            or not isinstance(session_id, str)
            or not session_id
            or not isinstance(provider_agent, str)
            or not provider_agent
            or not isinstance(raw_hash, str)
            or _SHA256.fullmatch(raw_hash) is None
            or raw_hash != _hash(raw)
            or not isinstance(commit, str)
            or _COMMIT_SHA.fullmatch(commit) is None
            or not isinstance(outputs, Mapping)
            or not outputs
            or not all(
                isinstance(path, str)
                and _safe_relative_path(path)
                and isinstance(digest, str)
                and _SHA256.fullmatch(digest) is not None
                for path, digest in outputs.items()
            )
        ):
            raise ValueError("production role receipt is incomplete")
        output_paths = tuple(outputs)
        if len(output_paths) != len(set(output_paths)):
            raise ValueError("production role output paths collide")
        freeze_bytes, freeze, frozen_task, trusted_runtime = _trusted_authority(
            repository_root,
            authority.phase0_commit_sha,
            authority.input_freeze_path,
            authority.ownership_manifest_path,
            role,
            commit,
        )
        if frozen_task != task:
            raise ValueError("acceptance task differs from committed Phase-0 authority")
        declared = frozen_task.get("expected_outputs")
        if not isinstance(declared, list):
            raise ValueError("frozen role outputs are absent")
        frozen_outputs = tuple(
            path if str(path).startswith(f"{TRACK_DIRECTORY}/") else f"{TRACK_DIRECTORY}/{path}"
            for path in declared
        )
        if frozen_outputs != output_paths:
            raise ValueError("receipt output order differs from committed Phase-0 authority")
        commit_binding = _validated_commit_binding(
            repository_root, role, commit, receipt.get("commit_binding")
        )
        if role == "requirements-mapper":
            if not isinstance(commit_binding, Mapping):
                raise ValueError("mapper commit binding is absent")
            selected_receipt_commit = commit_binding.get("phase2_receipt_commit")
            if not isinstance(selected_receipt_commit, str):
                raise ValueError("mapper selected receipt commit is absent")
            selected_receipt_bytes = source_adapter.resolve_blob_bytes(
                selected_receipt_commit,
                f"{TRACK_DIRECTORY}/role-receipts/evidence-collector.json",
            )
            selected_receipt = json.loads(selected_receipt_bytes)
            if not isinstance(selected_receipt, Mapping):
                raise ValueError("mapper selected evidence receipt is malformed")
            selected_identity = {
                field: selected_receipt.get(field)
                for field in _EVIDENCE_LINEAGE_FIELDS
            }
            admitted_identity = {
                field: admitted_evidence_receipt.get(field)
                for field in _EVIDENCE_LINEAGE_FIELDS
            }
            if (
                any(value is None for value in selected_identity.values())
                or _receipt_canonical_json(selected_identity)
                != _receipt_canonical_json(admitted_identity)
            ):
                raise ValueError(
                    "mapper selected receipt lineage differs from admitted provider evidence"
                )
        generators, read_only, operations, allowed_tools = _derived_execution_contract(
            repository_root,
            authority.phase0_commit_sha,
            role,
            frozen_task,
            frozen_outputs,
            commit,
            commit_binding,
        )
        shell_generators = tuple(item.binding for item in generators)
        read_only_shell_commands = tuple(item.binding for item in read_only)
        expected_generators = [
            {
                "command": item.command,
                "owned_outputs": list(item.owned_outputs),
                "command_sha256": item.command_sha256,
                "attestation_commit": item.attestation_commit,
            }
            for item in shell_generators
        ]
        expected_read_only = [
            {"command": item.command, "command_sha256": item.command_sha256}
            for item in read_only_shell_commands
        ]
        if (
            receipt.get("phase0_authority_commit") != authority.phase0_commit_sha
            or receipt.get("shell_generators") != expected_generators
            or receipt.get("read_only_shell_commands") != expected_read_only
            or receipt.get("trusted_runtime_sha256")
            != _hash(_receipt_canonical_json(trusted_runtime))
        ):
            raise ValueError("receipt execution authority differs from committed Phase 0")
        _validate_execution_trace(
            raw, repository_root, allowed_tools, generators, read_only, operations
        )
        binding = RoleBinding(
            role,
            session_id,
            provider_agent,
            output_paths,
            output_commit=commit,
            shell_generators=shell_generators,
            read_only_shell_commands=read_only_shell_commands,
        )
        attested = event.get("attested_manifest_bytes")
        required_attestations = {
            "allowed_input_manifest_sha256",
            "actual_context_manifest_sha256",
            "budget_declaration_sha256",
            "task_authority_sha256",
            "stop_loss_observations_sha256",
        }
        if (
            not isinstance(attested, Mapping)
            or set(attested) != required_attestations
            or not all(isinstance(value, bytes) for value in attested.values())
        ):
            raise ValueError("provider attested manifests are absent")
        _validate_direct_write_content(
            raw, repository_root, commit, frozen_outputs, shell_generators
        )
        context_bytes = _context_manifest_bytes(
            build_resolved_event(raw, binding, repository_root)
        )
        usage = derive_t2_actual_usage(
            repository_root=repository_root,
            freeze=freeze,
            role=role,
            output_commit=commit,
            raw_export=raw,
            generator_commands=tuple(item.command for item in shell_generators),
            commit_binding=commit_binding,
        )
        budget = {
            "schema_version": "apk-role-budget-declaration.v1",
            "actual_usage": usage,
        }
        budget_bytes = _receipt_canonical_json(budget)
        observations = _validated_stop_loss(receipt.get("stop_loss_observations"), freeze)
        stop_loss_bytes = _receipt_canonical_json(observations)
        if (
            attested.get("actual_context_manifest_sha256") != context_bytes
            or receipt.get("actual_context_manifest") != json.loads(context_bytes)
            or receipt.get("actual_context_manifest_sha256") != _hash(context_bytes)
        ):
            raise APKInventoryLiveError(
                "CONTEXT_BINDING_MISMATCH",
                "receipt context differs from the exact provider export",
            )
        if (
            attested.get("budget_declaration_sha256") != budget_bytes
            or receipt.get("actual_usage") != usage
            or receipt.get("budget_declaration") != budget
            or receipt.get("budget_declaration_sha256") != _hash(budget_bytes)
        ):
            raise APKInventoryLiveError(
                "BUDGET_BINDING_MISMATCH",
                "receipt usage differs from trusted logical-input accounting",
            )
        if (
            attested.get("allowed_input_manifest_sha256") != freeze_bytes
            or attested.get("task_authority_sha256") != canonical_task_prompt(frozen_task)
            or receipt.get("allowed_input_manifest_sha256") != _hash(freeze_bytes)
            or receipt.get("task_authority_sha256")
            != _hash(canonical_task_prompt(frozen_task))
        ):
            raise ValueError("receipt input or task authority differs from committed Phase 0")
        if (
            attested.get("stop_loss_observations_sha256") != stop_loss_bytes
            or receipt.get("stop_loss_observations") != observations
            or receipt.get("stop_loss_observations_sha256") != _hash(stop_loss_bytes)
        ):
            raise APKInventoryLiveError(
                "INVALID_STOP_LOSS_OBSERVATION",
                "receipt stop-loss values differ from trusted validation",
            )
        rebuilt = build_resolved_event(raw, binding, repository_root, attested)
        normalized = normalize_resolved_event(rebuilt, task, receipt)
        if (
            attested.get("allowed_input_manifest_sha256") != freeze_bytes
            or attested.get("task_authority_sha256") != canonical_task_prompt(task)
            or normalized.get("agent") != provider_agent
            or normalized.get("output_commit") != commit
            or normalized.get("raw_export_sha256") != raw_hash
            or not isinstance(normalized.get("raw_write_inventory"), list)
            or len(normalized["raw_write_inventory"]) != len(output_paths)
            or set(normalized["raw_write_inventory"]) != set(output_paths)
        ):
            raise ValueError("production role event differs from its immutable bindings")
        return normalized
    except (
        ValueError,
        ProvenanceError,
        T2RoleAccountingError,
        T2RoleReceiptError,
    ) as error:
        raise APKInventoryLiveError("PROVIDER_EVENT_INVALID", str(error)) from error
    except GitSourceError as error:
        raise APKInventoryLiveError("PROVIDER_EVENT_INVALID", str(error)) from error


def _derive_production_stop_loss(
    source_adapter: GitSourceAdapter,
    authority: TrustedPhase4Authority,
) -> Mapping[str, Any]:
    """Derives final stop-loss observations from the admitted committed test report."""
    report_path = f"{TRACK_DIRECTORY}/denominator-contract-test-report.json"
    try:
        report_bytes = source_adapter.resolve_blob_bytes(
            authority.admitted_phase_base_sha, report_path
        )
        report = json.loads(report_bytes)
    except (GitSourceError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise APKInventoryLiveError(
            "INVALID_STOP_LOSS_OBSERVATION",
            "admitted committed stop-loss report is absent or malformed",
        ) from error
    counters = report.get("stop_loss_counters") if isinstance(report, Mapping) else None
    unsupported = report.get("unsupported_claims_count") if isinstance(report, Mapping) else None
    if not isinstance(counters, Mapping):
        raise APKInventoryLiveError(
            "INVALID_STOP_LOSS_OBSERVATION",
            "admitted committed stop-loss counters are absent",
        )
    observations = {
        "unsupported_factual_claims": unsupported,
        "denominator_mismatches": counters.get("denominator_mismatches"),
        "failed_fix_review_cycles": counters.get("failed_fix_review_cycles"),
        "unresolved_blocking_findings": counters.get("unresolved_blocking_findings"),
    }
    if (
        any(
            not isinstance(value, int) or isinstance(value, bool) or value < 0
            for key, value in observations.items()
            if key != "unresolved_blocking_findings"
        )
        or not isinstance(observations["unresolved_blocking_findings"], Mapping)
    ):
        raise APKInventoryLiveError(
            "INVALID_STOP_LOSS_OBSERVATION",
            "admitted committed stop-loss observations are invalid",
        )
    return observations


def _exact_artifact_reference(path: str, data: bytes) -> dict[str, str]:
    """Builds the exact path-and-hash reference used by production manifests."""
    return {"path": path, "sha256": _hash(data)}


def _validate_production_phase4_semantics(
    artifacts: Mapping[str, Mapping[str, Any]],
    paths: Mapping[str, Any],
    raw_by_path: Mapping[str, bytes],
    live: Mapping[str, Any],
    baseline: str,
    gate_hash: object,
    reviewer_event: Mapping[str, Any],
    resolver: EventResolver,
) -> tuple[str | None, str | None]:
    """Validates real Phase-4 schemas and returns any rejection plus owner event ID."""
    method_path = f"{TRACK_DIRECTORY}/denominator-method.md"
    report_path = f"{TRACK_DIRECTORY}/denominator-contract-test-report.json"
    method_bytes = raw_by_path.get(method_path)
    report_bytes = raw_by_path.get(report_path)
    if (
        not isinstance(method_bytes, bytes)
        or b"Schema version: `apk-denominator-method.v1`" not in method_bytes.splitlines()
        or not isinstance(report_bytes, bytes)
    ):
        return "INVALID_PHASE4_BUNDLE", None
    try:
        contract_report = json.loads(report_bytes)
    except (UnicodeDecodeError, json.JSONDecodeError):
        return "CONTRACT_REPORT_INVALID", None
    admission = contract_report.get("phase0_3_admission_result") if isinstance(contract_report, Mapping) else None
    stop_loss = contract_report.get("stop_loss_counters") if isinstance(contract_report, Mapping) else None
    unresolved = stop_loss.get("unresolved_blocking_findings") if isinstance(stop_loss, Mapping) else None
    if (
        not isinstance(contract_report, Mapping)
        or contract_report.get("schema_version") != "apk-denominator-contract-test-report.v1"
        or contract_report.get("status") != "red-contract-authored"
        or contract_report.get("role") != "truth-test-author"
        or contract_report.get("source_baseline_revision") != baseline
        or admission != {
            "total_tests": 54,
            "passed": 54,
            "failed": 0,
            "exit_code": 0,
            "status": "passed",
        }
        or not isinstance(stop_loss, Mapping)
        or any(
            value != 0
            for key, value in stop_loss.items()
            if key != "unresolved_blocking_findings"
        )
        or unresolved != {"critical": 0, "high": 0, "medium": 0}
        or contract_report.get("unsupported_claims_count") != 0
    ):
        return "CONTRACT_REPORT_INVALID", None
    expected_paths = {
        "raw_inventory": f"{TRACK_DIRECTORY}/source-denominator.json",
        "human_discovery": f"{TRACK_DIRECTORY}/independent-human-discovery.json",
        "reconciliation": f"{TRACK_DIRECTORY}/phase3-reconciliation.json",
        "review": f"{TRACK_DIRECTORY}/independent-review.json",
        "candidate": f"{TRACK_DIRECTORY}/candidate-denominator-manifest.json",
        "candidate_partition": f"{TRACK_DIRECTORY}/candidate-partition-manifest.json",
        "owner_approval": f"{TRACK_DIRECTORY}/product-owner-acceptance.json",
        "accepted": f"{TRACK_DIRECTORY}/accepted-denominator-manifest.json",
        "accepted_partition": f"{TRACK_DIRECTORY}/accepted-partition-manifest.json",
    }
    if any(paths.get(name) != path for name, path in expected_paths.items()):
        return "INVALID_PHASE4_BUNDLE", None
    raw_paths = {
        name: paths.get(name)
        for name in ("reconciliation", "review", "candidate", "candidate_partition", "owner_approval")
    }
    if not all(isinstance(path, str) and path in raw_by_path for path in raw_paths.values()):
        return "INVALID_PHASE4_BUNDLE", None
    phase3_path = str(raw_paths["reconciliation"])
    review_path = str(raw_paths["review"])
    candidate_path = str(raw_paths["candidate"])
    partition_path = str(raw_paths["candidate_partition"])
    owner_path = str(raw_paths["owner_approval"])
    review = artifacts["review"]
    candidate = artifacts["candidate"]
    partition = artifacts["candidate_partition"]
    owner = artifacts["owner_approval"]
    accepted = artifacts["accepted"]
    accepted_partition = artifacts["accepted_partition"]
    exact_keys = {
        "review": {
            "schema_version", "status", "source_baseline_revision", "reviewer_role",
            "reviewer_isolation", "phase3_reconciliation", "full_reconciliation_rerun",
            "blocking_findings_by_severity", "findings",
        },
        "candidate": {
            "schema_version", "status", "consumable", "accepted", "revoked",
            "source_baseline_revision", "phase3_reconciliation", "independent_review",
            "denominator_counts",
        },
        "candidate_partition": {
            "schema_version", "status", "consumable", "accepted", "revoked",
            "candidate_denominator", "assignments",
        },
        "owner_approval": {
            "schema_version", "decision", "revoked", "approved_hashes",
            "current_owner_authorization",
        },
        "accepted": {
            "schema_version", "status", "consumable", "revoked", "candidate_denominator",
            "independent_review", "owner_acceptance", "gate_manifest_sha256",
        },
        "accepted_partition": {
            "schema_version", "status", "consumable", "revoked", "candidate_denominator",
            "candidate_partition", "independent_review", "owner_acceptance",
            "gate_manifest_sha256", "assignments",
        },
    }
    values = {
        "review": review,
        "candidate": candidate,
        "candidate_partition": partition,
        "owner_approval": owner,
        "accepted": accepted,
        "accepted_partition": accepted_partition,
    }
    if any(set(values[name]) != keys for name, keys in exact_keys.items()):
        return "AUTHORED_DENOMINATOR_REJECTED", None
    phase3 = live.get("phase3")
    if not isinstance(phase3, Mapping):
        return "INPUT_PROVENANCE_INVALID", None
    coverage_fields = {
        "identities": "identity_reconciliation_records",
        "files": "file_reconciliation_records",
        "source_records": "source_record_reconciliation_records",
        "surfaces": "surface_reconciliation_records",
        "asset_candidates": "asset_candidate_reconciliation_records",
        "identical_hash_groups": "identical_hash_group_reconciliation_records",
        "copies": "copy_reconciliation_records",
        "history_and_discrepancies": "discrepancy_reconciliation_records",
    }
    coverage: dict[str, int] = {}
    for label, field in coverage_fields.items():
        rows = phase3.get(field)
        if not isinstance(rows, list):
            return "INCOMPLETE_RECORD_SET", None
        coverage[label] = len(rows)
    phase3_ref = _exact_artifact_reference(phase3_path, raw_by_path[phase3_path])
    review_ref = _exact_artifact_reference(review_path, raw_by_path[review_path])
    candidate_ref = _exact_artifact_reference(candidate_path, raw_by_path[candidate_path])
    partition_ref = _exact_artifact_reference(partition_path, raw_by_path[partition_path])
    owner_ref = _exact_artifact_reference(owner_path, raw_by_path[owner_path])
    rerun = review.get("full_reconciliation_rerun")
    isolation = review.get("reviewer_isolation")
    findings = review.get("findings")
    zero_chm = {severity: 0 for severity in sorted(_BLOCKING_SEVERITIES)}
    if (
        review.get("schema_version") != "apk-denominator-independent-review.v1"
        or review.get("status") != "independent-review-complete"
        or review.get("source_baseline_revision") != baseline
        or review.get("reviewer_role") != "adversarial-reviewer"
        or not isinstance(isolation, Mapping)
        or isolation.get("fork_turns") != "none"
        or isolation.get("fresh_prompt_sha256") != reviewer_event.get("prompt_sha256")
        or review.get("phase3_reconciliation") != phase3_ref
        or not isinstance(rerun, Mapping)
        or rerun.get("status") != "passed"
        or rerun.get("source_baseline_revision") != baseline
        or rerun.get("phase3_output_sha256") != phase3_ref["sha256"]
        or rerun.get("unresolved_source_count") != 0
        or rerun.get("reconciliation_status") != "reconciliation-complete"
        or rerun.get("coverage") != coverage
        or review.get("blocking_findings_by_severity") != zero_chm
        or not isinstance(findings, list)
        or any(
            not isinstance(finding, Mapping)
            or str(finding.get("severity", "")).lower()
            not in {*_BLOCKING_SEVERITIES, "low", "informational"}
            or str(finding.get("severity", "")).lower() in _BLOCKING_SEVERITIES
            for finding in findings
        )
    ):
        return "REVIEW_BINDING_MISMATCH", None
    if (
        candidate.get("schema_version") != "apk-denominator-candidate-manifest.v1"
        or candidate.get("status") != "candidate-non-consumable"
        or candidate.get("consumable") is not False
        or candidate.get("accepted") is not False
        or candidate.get("revoked") is not False
        or candidate.get("source_baseline_revision") != baseline
        or candidate.get("phase3_reconciliation") != phase3_ref
        or candidate.get("independent_review") != review_ref
        or candidate.get("denominator_counts") != coverage
    ):
        return "CANDIDATE_HASH_MISMATCH", None
    program_records = phase3.get("replacement_program_identity_records")
    assignments = partition.get("assignments")
    if not isinstance(program_records, list) or not isinstance(assignments, list):
        return "INCOMPLETE_SIMULTANEOUS_CLASSIFICATION", None
    expected_labels = [
        row.get("program_identity_label") for row in program_records if isinstance(row, Mapping)
    ]
    actual_labels = [
        row.get("canonical_identity_label") for row in assignments if isinstance(row, Mapping)
    ]
    if (
        len(expected_labels) != len(program_records)
        or len(actual_labels) != len(assignments)
        or len(actual_labels) != len(set(actual_labels))
        or actual_labels != expected_labels
        or partition.get("schema_version") != "apk-denominator-candidate-partition.v1"
        or partition.get("status") != "candidate-non-consumable"
        or partition.get("consumable") is not False
        or partition.get("accepted") is not False
        or partition.get("revoked") is not False
        or partition.get("candidate_denominator") != candidate_ref
    ):
        return "INCOMPLETE_SIMULTANEOUS_CLASSIFICATION", None
    expected_hashes = {
        "candidate": candidate_ref["sha256"],
        "candidate_partition": partition_ref["sha256"],
        "review": review_ref["sha256"],
        "gate": gate_hash,
    }
    authorization = owner.get("current_owner_authorization")
    if (
        owner.get("schema_version") != "apk-denominator-owner-acceptance.v1"
        or owner.get("decision") != "approve"
        or owner.get("revoked") is not False
        or owner.get("approved_hashes") != expected_hashes
        or not isinstance(authorization, Mapping)
        or authorization.get("actor_role") != "product-owner"
        or authorization.get("status") != "currently-authorized"
    ):
        return "OWNER_APPROVAL_HASH_MISMATCH", None
    owner_event_id = authorization.get("event_id")
    if not isinstance(owner_event_id, str) or not owner_event_id:
        return "FORGED_OWNER_APPROVAL", None
    try:
        owner_event = resolver.resolve(owner_event_id)
    except EventResolutionError:
        return "FORGED_OWNER_APPROVAL", None
    reviewer_completed = reviewer_event.get("completed_ms")
    owner_created = owner_event.get("created_ms")
    if (
        owner_event.get("role") != "user"
        or owner_event.get("actor_role") != "product-owner"
        or not isinstance(reviewer_completed, int)
        or isinstance(reviewer_completed, bool)
        or not isinstance(owner_created, int)
        or isinstance(owner_created, bool)
        or owner_created <= reviewer_completed
    ):
        return "OWNER_ORDERING_INVALID", None
    owner_message = json.dumps(
        {"decision": "approve", "approved_hashes": expected_hashes},
        sort_keys=True,
        separators=(",", ":"),
    ).encode() + b"\n"
    if (
        owner_event.get("approved_hashes") != expected_hashes
        or owner_event.get("message_bytes") != owner_message
        or owner_event.get("message_sha256") != _hash(owner_message)
        or authorization.get("approval_message_sha256") != _hash(owner_message)
    ):
        return "FORGED_OWNER_APPROVAL", None
    common_accepted = (
        accepted.get("schema_version") == "apk-denominator-accepted-manifest.v1"
        and accepted.get("status") == "accepted"
        and accepted.get("consumable") is True
        and accepted.get("revoked") is False
        and accepted.get("candidate_denominator") == candidate_ref
        and accepted.get("independent_review") == review_ref
        and accepted.get("owner_acceptance") == owner_ref
        and accepted.get("gate_manifest_sha256") == gate_hash
    )
    partition_accepted = (
        accepted_partition.get("schema_version") == "apk-denominator-accepted-partition-manifest.v1"
        and accepted_partition.get("status") == "accepted"
        and accepted_partition.get("consumable") is True
        and accepted_partition.get("revoked") is False
        and accepted_partition.get("candidate_denominator") == candidate_ref
        and accepted_partition.get("candidate_partition") == partition_ref
        and accepted_partition.get("independent_review") == review_ref
        and accepted_partition.get("owner_acceptance") == owner_ref
        and accepted_partition.get("gate_manifest_sha256") == gate_hash
        and accepted_partition.get("assignments") == assignments
    )
    if not common_accepted or not partition_accepted:
        return "ACCEPTED_BINDING_MISMATCH", None
    return None, owner_event_id


def _validate_committed_output_bindings(
    raw_by_path: Mapping[str, bytes],
    declared_hashes: Mapping[str, Any],
    artifact_commits: Mapping[str, Any],
    receipts: list[Any],
    source_adapter: GitSourceAdapter,
    authority: TrustedPhase4Authority,
) -> str | None:
    """Checks exact declared hashes, committed bytes, ancestry, and receipt ownership."""
    closeouts = set(artifact_commits.values())
    if (
        len(closeouts) != 1
        or any(not isinstance(commit, str) or _COMMIT_SHA.fullmatch(commit) is None for commit in closeouts)
    ):
        return "ARTIFACT_ANCESTRY_INVALID"
    closeout = next(iter(closeouts))
    for path, data in raw_by_path.items():
        if declared_hashes.get(path) != _hash(data):
            return "ARTIFACT_COMMIT_MISMATCH"
        commit = artifact_commits.get(path)
        if not isinstance(commit, str) or _COMMIT_SHA.fullmatch(commit) is None:
            return "ARTIFACT_COMMIT_MISMATCH"
        if not _is_ancestor(source_adapter, authority.admitted_phase_base_sha, commit):
            return "ARTIFACT_ANCESTRY_INVALID"
        try:
            committed = source_adapter.resolve_blob_bytes(commit, path)
        except GitSourceError:
            return "ARTIFACT_COMMIT_MISMATCH"
        if committed != data:
            return "ARTIFACT_COMMIT_MISMATCH"
    for receipt in receipts:
        if not isinstance(receipt, Mapping):
            return "INVALID_ROLE_RECEIPT_V1"
        commit = receipt.get("commit_sha")
        outputs = receipt.get("output_hashes")
        if not isinstance(commit, str) or _COMMIT_SHA.fullmatch(commit) is None:
            return "RECEIPT_COMMIT_UNREACHABLE"
        if (
            not _is_ancestor(source_adapter, authority.phase0_commit_sha, commit)
            or not _is_ancestor(source_adapter, commit, closeout)
        ):
            return "RECEIPT_COMMIT_UNREACHABLE"
        if not isinstance(outputs, Mapping):
            return "RECEIPT_OUTPUT_MISMATCH"
        for path, digest in outputs.items():
            if (
                not isinstance(path, str)
                or raw_by_path.get(path) is None
                or digest != _hash(raw_by_path[path])
            ):
                return "RECEIPT_OUTPUT_MISMATCH"
            try:
                committed = source_adapter.resolve_blob_bytes(commit, path)
            except GitSourceError:
                return "RECEIPT_COMMIT_UNREACHABLE"
            if committed != raw_by_path[path]:
                return "RECEIPT_COMMIT_UNREACHABLE"
    author_commits = [
        receipt.get("commit_sha")
        for receipt in receipts
        if isinstance(receipt, Mapping) and receipt.get("role") != "adversarial-reviewer"
    ]
    reviewer_commits = [
        receipt.get("commit_sha")
        for receipt in receipts
        if isinstance(receipt, Mapping) and receipt.get("role") == "adversarial-reviewer"
    ]
    if len(reviewer_commits) != 1 or any(
        not isinstance(commit, str)
        or not _is_ancestor(source_adapter, commit, reviewer_commits[0])
        for commit in author_commits
    ):
        return "RECEIPT_COMMIT_UNREACHABLE"
    return None


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
        reviewer = task.get("reviewer_role")
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
            or reviewer != ("product-owner" if role == "adversarial-reviewer" else "adversarial-reviewer")
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


def _validate_phase4_inventory_acceptance(
    bundle: Mapping[str, Any],
    resolver: EventResolver,
    source_adapter: GitSourceAdapter,
    authority: TrustedPhase4Authority,
    *,
    allow_legacy_test_contract: bool,
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
    production_contract = _has_production_artifact_contract(freeze)
    if not production_contract and not allow_legacy_test_contract:
        return _reject("FROZEN_AUTHORITY_INVALID")
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
    admitted_evidence_receipt = next(
        receipt
        for receipt in receipts
        if isinstance(receipt, Mapping) and receipt.get("role") == "evidence-collector"
    )
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
    trusted_stop_loss: Mapping[str, Any] | None = None
    if production_contract:
        try:
            trusted_stop_loss = _derive_production_stop_loss(source_adapter, authority)
        except APKInventoryLiveError as error:
            return _reject(error.code)
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
        if trusted_stop_loss is not None and observations != trusted_stop_loss:
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
        if production_contract:
            try:
                event = _rebuild_production_role_event(
                    receipt_value,
                    task,
                    event,
                    source_adapter,
                    authority,
                    admitted_evidence_receipt,
                )
            except APKInventoryLiveError as error:
                return _reject(error.code)
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

    if production_contract:
        sessions = [event.get("session_id") for event in resolved_events.values()]
        start_events = [event.get("start_event_id") for event in resolved_events.values()]
        end_events = [event.get("end_event_id") for event in resolved_events.values()]
        if (
            len(sessions) != len(set(sessions))
            or len(start_events) + len(end_events) != len(set(start_events + end_events))
        ):
            return _reject("ROLE_SESSION_COLLISION")
        ancestry = [event.get("parent_ancestry_ids") for event in resolved_events.values()]
        if (
            not all(isinstance(value, list) and len(value) == 1 for value in ancestry)
            or len({tuple(value) for value in ancestry}) != 1
        ):
            return _reject("EVENT_IDENTITY_MISMATCH")
        owned_paths = [
            path
            for event in resolved_events.values()
            for path in event.get("raw_write_inventory", [])
        ]
        if len(owned_paths) != len(set(owned_paths)):
            return _reject("OUTPUT_OWNERSHIP_MISMATCH")
        reviewer = resolved_events.get("adversarial-reviewer")
        authors = [
            event for role, event in resolved_events.items() if role != "adversarial-reviewer"
        ]
        reviewer_started = reviewer.get("started_ms") if isinstance(reviewer, Mapping) else None
        author_completed = [event.get("completed_ms") for event in authors]
        if (
            not isinstance(reviewer_started, int)
            or isinstance(reviewer_started, bool)
            or not author_completed
            or not all(
                isinstance(value, int) and not isinstance(value, bool)
                for value in author_completed
            )
            or reviewer_started <= max(author_completed)
        ):
            return _reject("INHERITED_REVIEWER_CONTEXT")

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

    if production_contract:
        try:
            production_live = load_live_phase_bundle(
                source_adapter._root,
                authority.admitted_phase_base_sha,
                source_adapter,
            )
        except APKInventoryLiveError as error:
            return _reject(error.code)
        live_hashes = production_live.get("artifact_sha256")
        if not isinstance(live_hashes, Mapping):
            return _reject("INPUT_PROVENANCE_INVALID")
        for name, digest in live_hashes.items():
            path = f"{TRACK_DIRECTORY}/{name}"
            data = artifact_bytes.get(path)
            owners = [
                receipt
                for receipt in receipts
                if isinstance(receipt, Mapping)
                and isinstance(receipt.get("output_hashes"), Mapping)
                and receipt["output_hashes"].get(path) == digest
            ]
            if (
                not isinstance(name, str)
                or not isinstance(digest, str)
                or _SHA256.fullmatch(digest) is None
                or not isinstance(data, bytes)
                or _hash(data) != digest
                or declared_hashes.get(path) != digest
                or len(owners) != 1
            ):
                return _reject("RECEIPT_OUTPUT_MISMATCH")
            commit = owners[0].get("commit_sha")
            if not isinstance(commit, str) or _COMMIT_SHA.fullmatch(commit) is None:
                return _reject("RECEIPT_COMMIT_UNREACHABLE")
            try:
                committed = source_adapter.resolve_blob_bytes(commit, path)
            except GitSourceError:
                return _reject("RECEIPT_COMMIT_UNREACHABLE")
            if committed != data:
                return _reject("RECEIPT_COMMIT_UNREACHABLE")
        if any(
            "record_sets" in value or "rerun_record_sets" in value
            for artifact in (raw, human, reconciliation, review)
            for value in _walk(artifact)
        ):
            return _reject("AUTHORED_DENOMINATOR_REJECTED")
        semantic_error, owner_event_id = _validate_production_phase4_semantics(
            artifacts,
            paths,
            raw_by_path,
            production_live,
            baseline,
            gate_hash,
            reviewer_event,
            resolver,
        )
        if semantic_error is not None:
            return _reject(semantic_error)
        binding_error = _validate_committed_output_bindings(
            raw_by_path,
            declared_hashes,
            artifact_commits,
            receipts,
            source_adapter,
            authority,
        )
        if binding_error is not None:
            return _reject(binding_error)
        if not isinstance(owner_event_id, str) or not resolver.claim_once(owner_event_id):
            return _reject("REPLAYED_OWNER_APPROVAL")
        return {"ok": True}

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


def validate_phase4_inventory_acceptance(
    bundle: Mapping[str, Any],
    resolver: EventResolver,
    source_adapter: GitSourceAdapter,
    authority: TrustedPhase4Authority,
) -> dict[str, Any]:
    """Validates only the complete production Phase-4 contract."""
    return _validate_phase4_inventory_acceptance(
        bundle, resolver, source_adapter, authority, allow_legacy_test_contract=False
    )


def validate_phase4_inventory_acceptance_legacy_test_only(
    bundle: Mapping[str, Any],
    resolver: EventResolver,
    source_adapter: GitSourceAdapter,
    authority: TrustedPhase4Authority,
) -> dict[str, Any]:
    """Runs the historical synthetic contract exclusively for legacy test fixtures."""
    return _validate_phase4_inventory_acceptance(
        bundle, resolver, source_adapter, authority, allow_legacy_test_contract=True
    )


__all__ = [
    "TrustedPhase4Authority",
    "validate_phase4_inventory_acceptance",
    "validate_phase4_inventory_acceptance_legacy_test_only",
]
