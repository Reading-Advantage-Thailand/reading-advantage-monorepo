"""Strict Phase 2 denominator, role, ownership, and approval validation."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import PurePosixPath
from typing import Any, Mapping, Sequence

from measure.evidence_integrity_gates.contracts import validate_dependency_field
from measure.evidence_integrity_gates.events import EventResolutionError, EventResolver

PHASE2_SCHEMA_VERSION = "evidence-integrity.phase2.v1"

PHASE2_REJECTION_CODES = frozenset({
    "UNKNOWN_PHASE2_SCHEMA", "AUTHORED_DENOMINATOR_REJECTED", "EMPTY_DENOMINATOR",
    "DUPLICATE_DENOMINATOR_ITEM", "INVALID_DISCOVERY_ORIGIN", "SYNTHETIC_SCENE_REJECTED",
    "HARDCODED_SUMMARY_REJECTED", "KEYWORD_RESPONSIVE_PROFILE_REJECTED",
    "SLUG_ASSET_ALLOWLIST_REJECTED", "COHORT_ONLY_ASSET_INSPECTION_REJECTED",
    "EMPTY_RECONCILIATION", "DUPLICATE_RECONCILIATION", "INCOMPLETE_RECONCILIATION",
    "COVERAGE_COUNT_MISMATCH", "MISSING_REQUIRED_ROLE", "INVALID_ROLE_APPLICABILITY", "INCOMPATIBLE_ROLE_ASSIGNMENT",
    "EVENT_UNREACHABLE", "EVENT_ID_REPLAYED", "EVENT_IDENTITY_MISMATCH",
    "ROOT_ROLE_SUBSTITUTION", "INHERITED_REVIEWER_CONTEXT", "UNOWNED_OUTPUT",
    "DUPLICATE_OUTPUT_OWNERSHIP", "OUTPUT_HASH_MISMATCH", "FINAL_RESPONSE_HASH_MISMATCH",
    "FORGED_OWNER_APPROVAL", "REPLAYED_OWNER_APPROVAL", "OWNER_APPROVAL_HASH_MISMATCH",
    "NON_CANONICAL_DEPENDENCY_FIELD",
})

_SHA256 = re.compile(r"[0-9a-f]{64}\Z")
_ITEM_CONTRACTS = {
    "scene": ("discovery_method", {"source-enumeration"}, "SYNTHETIC_SCENE_REJECTED"),
    "summary": ("evidence_method", {"source-derived"}, "HARDCODED_SUMMARY_REJECTED"),
    "responsive-profile": ("discovery_method", {"runtime-measurement"}, "KEYWORD_RESPONSIVE_PROFILE_REJECTED"),
    "asset": ("selection_method", {"full-inventory"}, "SLUG_ASSET_ALLOWLIST_REJECTED"),
}
_MANDATORY_ROLES = {
    "discovery-auditor", "evidence-collector", "requirements-mapper",
    "truth-test-author", "adversarial-reviewer",
}
_RECEIPT_HASH_FIELDS = {
    "prompt_sha256", "allowed_input_manifest_sha256", "actual_context_manifest_sha256",
    "budget_declaration_sha256", "final_response_sha256",
    "task_manifest_sha256",
}


def _reject(code: str, **detail: Any) -> dict[str, Any]:
    """Build a stable Phase 2 rejection result.

    @param code Stable Phase 2 rejection code.
    @param detail Relevant non-authoritative diagnostic fields.
    @returns Reason-coded rejection result.
    """
    if code not in PHASE2_REJECTION_CODES:
        raise ValueError(f"unknown Phase 2 rejection code: {code}")
    result: dict[str, Any] = {"ok": False, "code": code}
    if detail:
        result["detail"] = detail
    return result


def _valid_hash(value: Any) -> bool:
    return isinstance(value, str) and _SHA256.fullmatch(value) is not None


def _safe_output(path: Any) -> bool:
    if not isinstance(path, str) or not path or "\\" in path or path.endswith("/"):
        return False
    parsed = PurePosixPath(path)
    return not parsed.is_absolute() and ".." not in parsed.parts


def validate_denominator_bundle(
    bundle: Mapping[str, Any], resolver: EventResolver, discovery_sources: Mapping[str, bytes]
) -> dict[str, Any]:
    """Validate an independently discovered denominator and exact reconciliation.

    @param bundle Versioned denominator, reconciliation, and coverage bundle.
    @param resolver Collaboration-event resolver proving discovery provenance.
    @param discovery_sources Exact independent discovery exports keyed by source reference.
    @returns Success or the first stable reason-coded rejection.
    """
    if not isinstance(bundle, Mapping) or bundle.get("schema_version") != PHASE2_SCHEMA_VERSION:
        return _reject("UNKNOWN_PHASE2_SCHEMA")
    origin = bundle.get("discovery_origin")
    if not isinstance(origin, Mapping):
        return _reject("AUTHORED_DENOMINATOR_REJECTED")
    if origin.get("kind") != "independent-discovery-export":
        return _reject("AUTHORED_DENOMINATOR_REJECTED")
    source_ref = origin.get("source_ref")
    if not _valid_hash(origin.get("source_sha256")) or not isinstance(origin.get("event_id"), str) or not isinstance(source_ref, str):
        return _reject("INVALID_DISCOVERY_ORIGIN")
    source = discovery_sources.get(source_ref)
    if not isinstance(source, bytes) or hashlib.sha256(source).hexdigest() != origin["source_sha256"]:
        return _reject("INVALID_DISCOVERY_ORIGIN")
    try:
        discovered = json.loads(source)
    except (UnicodeDecodeError, json.JSONDecodeError):
        return _reject("INVALID_DISCOVERY_ORIGIN")
    try:
        discovery_event = resolver.resolve(origin["event_id"])
    except EventResolutionError:
        return _reject("EVENT_UNREACHABLE", event_id=origin["event_id"])
    requirements_event_id = bundle.get("requirements_author_event_id")
    try:
        requirements_event = resolver.resolve(str(requirements_event_id))
    except EventResolutionError:
        return _reject("EVENT_UNREACHABLE", event_id=requirements_event_id)
    discovery_outputs = discovery_event.get("output_sha256")
    requirements_ref = bundle.get("requirements_source_ref")
    requirements_source = discovery_sources.get(str(requirements_ref))
    try:
        requirements_document = json.loads(requirements_source) if isinstance(requirements_source, bytes) else None
    except (UnicodeDecodeError, json.JSONDecodeError):
        requirements_document = None
    requirements_outputs = requirements_event.get("output_sha256")
    if (
        discovery_event.get("id") != origin["event_id"]
        or discovery_event.get("role") != "assistant"
        or not isinstance(discovery_event.get("session_id"), str)
        or discovery_event.get("session_id") != origin.get("session_id")
        or discovery_event.get("agent") != origin.get("agent")
        or not isinstance(discovery_outputs, Mapping)
        or discovery_outputs.get(source_ref) != origin["source_sha256"]
        or requirements_event.get("id") != requirements_event_id
        or requirements_event.get("role") != "assistant"
        or not isinstance(requirements_event.get("session_id"), str)
        or requirements_event.get("session_id") != bundle.get("requirements_author_session_id")
        or discovery_event.get("session_id") == requirements_event.get("session_id")
        or discovery_event.get("agent") == requirements_event.get("agent")
        or not isinstance(requirements_outputs, Mapping)
        or not isinstance(requirements_document, Mapping)
        or requirements_outputs.get(requirements_ref) != hashlib.sha256(requirements_source).hexdigest()
    ):
        return _reject("AUTHORED_DENOMINATOR_REJECTED")
    items = bundle.get("items")
    if not isinstance(items, list) or not items:
        return _reject("EMPTY_DENOMINATOR")
    if not isinstance(discovered, Mapping) or discovered.get("items") != items:
        return _reject("INVALID_DISCOVERY_ORIGIN")
    item_ids: list[str] = []
    for item in items:
        if not isinstance(item, Mapping) or not isinstance(item.get("item_id"), str) or not item["item_id"]:
            return _reject("INVALID_DISCOVERY_ORIGIN")
        item_ids.append(item["item_id"])
        contract = _ITEM_CONTRACTS.get(str(item.get("item_kind")))
        if contract is None:
            return _reject("INVALID_DISCOVERY_ORIGIN", item_id=item["item_id"])
        if item.get(contract[0]) not in contract[1]:
            return _reject(contract[2], item_id=item["item_id"])
        if item.get("item_kind") == "asset" and item.get("inspection_scope") == "cohort-only":
            return _reject("COHORT_ONLY_ASSET_INSPECTION_REJECTED", item_id=item["item_id"])
    if len(item_ids) != len(set(item_ids)):
        return _reject("DUPLICATE_DENOMINATOR_ITEM")
    reconciliation = bundle.get("reconciliation")
    if not isinstance(reconciliation, list) or not reconciliation:
        return _reject("EMPTY_RECONCILIATION")
    reconciled_ids = [entry.get("denominator_item_id") for entry in reconciliation if isinstance(entry, Mapping)]
    if len(reconciled_ids) != len(reconciliation) or len(reconciled_ids) != len(set(reconciled_ids)):
        return _reject("DUPLICATE_RECONCILIATION")
    if set(reconciled_ids) != set(item_ids) or any(entry.get("status") not in {"matched", "unmatched"} for entry in reconciliation):
        return _reject("INCOMPLETE_RECONCILIATION")
    requirement_ids = bundle.get("requirement_ids")
    if not isinstance(requirement_ids, list) or not requirement_ids or len(requirement_ids) != len(set(requirement_ids)) or not all(isinstance(value, str) and value for value in requirement_ids):
        return _reject("INCOMPLETE_RECONCILIATION")
    if requirements_document.get("requirement_ids") != requirement_ids:
        return _reject("INCOMPLETE_RECONCILIATION")
    matched_requirement_ids = [
        entry.get("requirement_id") for entry in reconciliation if entry["status"] == "matched"
    ]
    if (
        not all(isinstance(value, str) and value in requirement_ids for value in matched_requirement_ids)
        or len(matched_requirement_ids) != len(set(matched_requirement_ids))
        or set(matched_requirement_ids) != set(requirement_ids)
        or any(entry.get("requirement_id") is not None for entry in reconciliation if entry["status"] == "unmatched")
    ):
        return _reject("INCOMPLETE_RECONCILIATION")
    coverage = bundle.get("coverage")
    matched = sum(entry["status"] == "matched" for entry in reconciliation)
    counts = () if not isinstance(coverage, Mapping) else (
        coverage.get("denominator_items"), coverage.get("reconciled_items"), coverage.get("matched_items")
    )
    if any(isinstance(count, bool) or not isinstance(count, int) for count in counts) or len(counts) != 3 or counts != (len(items), len(reconciliation), matched):
        return _reject("COVERAGE_COUNT_MISMATCH")
    return {"ok": True}


def validate_roles_and_outputs(
    manifest: Mapping[str, Any], resolver: EventResolver, output_bytes: Mapping[str, bytes]
) -> dict[str, Any]:
    """Validate applicable roles, raw events, and exclusive output ownership.

    @param manifest Versioned role, receipt, and ownership manifest.
    @param resolver Collaboration-event resolver at the provider boundary.
    @param output_bytes Exact candidate output bytes keyed by repository-relative path.
    @returns Success or the first stable reason-coded rejection.
    """
    if not isinstance(manifest, Mapping) or manifest.get("schema_version") != PHASE2_SCHEMA_VERSION:
        return _reject("UNKNOWN_PHASE2_SCHEMA")
    dependency = validate_dependency_field(manifest)
    if not dependency["ok"]:
        return _reject("NON_CANONICAL_DEPENDENCY_FIELD")
    if "depends_on" not in manifest:
        return _reject("NON_CANONICAL_DEPENDENCY_FIELD")
    required = manifest.get("required_roles")
    receipts = manifest.get("receipts")
    if not isinstance(required, list) or len(required) != len(_MANDATORY_ROLES) or set(required) != _MANDATORY_ROLES or not isinstance(receipts, list):
        return _reject("MISSING_REQUIRED_ROLE")
    by_role = {receipt.get("role"): receipt for receipt in receipts if isinstance(receipt, Mapping)}
    if len(by_role) != len(receipts) or any(role not in by_role for role in required):
        return _reject("MISSING_REQUIRED_ROLE")
    applicability = manifest.get("role_applicability")
    if not isinstance(applicability, Mapping) or set(applicability) != set(required) or any(
        applicability.get(role) is not True for role in required
    ):
        return _reject("INVALID_ROLE_APPLICABILITY")
    incompatible = manifest.get("incompatible_roles")
    expected_pairs = {tuple(sorted((left, right))) for left in required for right in required if left < right}
    if not isinstance(incompatible, list) or len(incompatible) != len(expected_pairs) or {
        tuple(sorted(pair)) for pair in incompatible if isinstance(pair, list) and len(pair) == 2
    } != expected_pairs:
        return _reject("INCOMPATIBLE_ROLE_ASSIGNMENT")
    for pair in incompatible:
        if not isinstance(pair, list) or len(pair) != 2:
            return _reject("INCOMPATIBLE_ROLE_ASSIGNMENT")
        left, right = by_role.get(pair[0]), by_role.get(pair[1])
        if left and right and left.get("session_id") == right.get("session_id"):
            return _reject("INCOMPATIBLE_ROLE_ASSIGNMENT")
    seen_events: set[str] = set()
    seen_sessions: set[str] = set()
    parent_sessions: set[str] = set()
    owners: dict[str, str] = {}
    owned_hashes: dict[str, str] = {}
    completion_by_role: dict[str, int] = {}
    event_by_role: dict[str, Mapping[str, Any]] = {}
    agents: set[str] = set()
    for role, receipt in by_role.items():
        if (
            receipt.get("actor_kind") != "delegated-agent"
            or not isinstance(receipt.get("session_id"), str)
            or not receipt["session_id"]
            or receipt.get("session_id") == manifest.get("root_session_id")
        ):
            return _reject("ROOT_ROLE_SUBSTITUTION", role=role)
        event_id = receipt.get("event_id")
        if not isinstance(event_id, str) or not event_id or receipt.get("spawn_id") != receipt.get("session_id") or receipt.get("ancestry_ids") != [manifest.get("root_session_id")] or not isinstance(receipt.get("findings"), list) or not all(
            _valid_hash(receipt.get(field)) for field in _RECEIPT_HASH_FIELDS
        ) or not isinstance(receipt.get("start_event_id"), str) or isinstance(receipt.get("start_timestamp_ms"), bool) or not isinstance(receipt.get("start_timestamp_ms"), int) or isinstance(receipt.get("end_timestamp_ms"), bool) or not isinstance(receipt.get("end_timestamp_ms"), int) or receipt["end_timestamp_ms"] < receipt["start_timestamp_ms"] or not isinstance(receipt.get("prior_role_history"), list) or len(receipt["prior_role_history"]) != len(set(receipt["prior_role_history"])) or role in receipt["prior_role_history"] or not isinstance(receipt.get("commit_sha"), str) or re.fullmatch(r"[0-9a-f]{40}", receipt["commit_sha"]) is None:
            return _reject("EVENT_IDENTITY_MISMATCH")
        if event_id in seen_events:
            return _reject("EVENT_ID_REPLAYED", event_id=event_id)
        seen_events.add(event_id)
        try:
            event = resolver.resolve(event_id)
        except EventResolutionError:
            return _reject("EVENT_UNREACHABLE", event_id=event_id)
        prompt_bytes = event.get("prompt_bytes")
        event_by_role[role] = event
        raw_export = event.get("raw_export_bytes")
        attested = event.get("attested_manifest_bytes")
        if event.get("provenance_kind") != "opencode-raw-export" or not isinstance(raw_export, bytes) or hashlib.sha256(raw_export).hexdigest() != event.get("raw_export_sha256") or event.get("id") != event_id or event.get("start_event_id") != receipt.get("start_event_id") or event.get("session_id") != receipt.get("session_id") or event.get("agent") != receipt.get("agent") or event.get("role") != "assistant" or event.get("prompt_message_id") != receipt.get("prompt_message_id") or event.get("final_response_message_id") != receipt.get("final_response_message_id") or not isinstance(event.get("session_parent_id"), str) or not isinstance(prompt_bytes, bytes) or hashlib.sha256(prompt_bytes).hexdigest() != receipt.get("prompt_sha256") or event.get("started_ms") != receipt.get("start_timestamp_ms") or event.get("completed_ms") != receipt.get("end_timestamp_ms") or not isinstance(attested, Mapping):
            return _reject("EVENT_IDENTITY_MISMATCH", event_id=event_id)
        try:
            raw_document = json.loads(raw_export)
            raw_info = raw_document["info"]
            raw_messages = raw_document["messages"]
        except (UnicodeDecodeError, json.JSONDecodeError, KeyError, TypeError):
            return _reject("EVENT_IDENTITY_MISMATCH", event_id=event_id)
        raw_message_ids = {
            message.get("info", {}).get("id") for message in raw_messages if isinstance(message, Mapping)
        }
        if raw_info.get("id") != receipt.get("session_id") or raw_info.get("parentID") != manifest.get("root_session_id") or receipt.get("start_event_id") not in raw_message_ids or event_id not in raw_message_ids:
            return _reject("EVENT_IDENTITY_MISMATCH", event_id=event_id)
        raw_by_id = {
            message.get("info", {}).get("id"): message for message in raw_messages
            if isinstance(message, Mapping)
        }
        raw_prompt = "".join(
            part.get("text", "") for part in raw_by_id[receipt["start_event_id"]].get("parts", [])
            if part.get("type") == "text" and isinstance(part.get("text"), str)
        ).encode()
        raw_response = "".join(
            part.get("text", "") for part in raw_by_id[event_id].get("parts", [])
            if part.get("type") == "text" and isinstance(part.get("text"), str)
        ).encode()
        if raw_prompt != prompt_bytes or raw_response != event.get("final_response_bytes"):
            return _reject("EVENT_IDENTITY_MISMATCH", event_id=event_id)
        if any(event.get(field) != receipt.get(field) or not isinstance(attested.get(field), bytes) or hashlib.sha256(attested[field]).hexdigest() != receipt.get(field) for field in (
            "allowed_input_manifest_sha256", "actual_context_manifest_sha256",
            "budget_declaration_sha256", "task_manifest_sha256",
        )):
            return _reject("EVENT_IDENTITY_MISMATCH", event_id=event_id)
        parent_sessions.add(event["session_parent_id"])
        if not isinstance(event.get("completed_ms"), int):
            return _reject("EVENT_IDENTITY_MISMATCH", event_id=event_id)
        completion_by_role[role] = event["completed_ms"]
        session_id = str(receipt.get("session_id"))
        if session_id in seen_sessions:
            return _reject("INCOMPATIBLE_ROLE_ASSIGNMENT")
        seen_sessions.add(session_id)
        agent = receipt.get("agent")
        if not isinstance(agent, str) or not agent or agent in agents:
            return _reject("INCOMPATIBLE_ROLE_ASSIGNMENT")
        agents.add(agent)
        if role == "adversarial-reviewer":
            raw_root = raw_document
            raw_fork = raw_info.get("fork_turns", raw_root.get("fork_turns"))
            explicit_none = raw_fork == "none" and event.get("fork_turns") == "none"
            equivalent_raw_proof = (
                raw_fork is None
                and "fork_turns" not in event
                and event.get("reviewer_isolation_proof")
                == "raw-history-begins-with-fresh-prompt"
                and raw_messages[0].get("info", {}).get("id")
                == receipt.get("start_event_id")
                and raw_messages[0].get("info", {}).get("role") == "user"
            )
            fresh_prompt = (
                raw_messages[0].get("info", {}).get("id")
                == receipt.get("start_event_id")
                and raw_messages[0].get("info", {}).get("role") == "user"
            )
            if not fresh_prompt or not (explicit_none or equivalent_raw_proof):
                return _reject("INHERITED_REVIEWER_CONTEXT")
        response = event.get("final_response_bytes")
        if not isinstance(response, bytes) or hashlib.sha256(response).hexdigest() != receipt.get("final_response_sha256"):
            return _reject("FINAL_RESPONSE_HASH_MISMATCH", role=role)
        outputs = receipt.get("outputs")
        if not isinstance(outputs, list) or not outputs:
            return _reject("UNOWNED_OUTPUT", role=role)
        event_outputs = event.get("output_sha256")
        if not isinstance(event_outputs, Mapping) or event.get("raw_write_inventory") != sorted(event_outputs) or set(event_outputs) != {
            output.get("path") for output in outputs if isinstance(output, Mapping)
        }:
            return _reject("OUTPUT_HASH_MISMATCH", role=role)
        for output in outputs:
            if not isinstance(output, Mapping) or not _safe_output(output.get("path")):
                return _reject("UNOWNED_OUTPUT", role=role)
            path = output["path"]
            if path in owners:
                return _reject("DUPLICATE_OUTPUT_OWNERSHIP", path=path)
            owners[path] = role
            owned_hashes[path] = str(output.get("sha256"))
            if path not in output_bytes or not isinstance(output_bytes[path], bytes) or hashlib.sha256(output_bytes[path]).hexdigest() != output.get("sha256") or event_outputs.get(path) != output.get("sha256"):
                return _reject("OUTPUT_HASH_MISMATCH", path=path)
        try:
            response_contract = json.loads(response)
        except (UnicodeDecodeError, json.JSONDecodeError):
            return _reject("FINAL_RESPONSE_HASH_MISMATCH", role=role)
        if not isinstance(response_contract, Mapping) or response_contract.get("output_sha256") != dict(event_outputs):
            return _reject("FINAL_RESPONSE_HASH_MISMATCH", role=role)
    if set(owners) != set(output_bytes):
        return _reject("UNOWNED_OUTPUT")
    if len(parent_sessions) != 1 or next(iter(parent_sessions)) != manifest.get("root_session_id"):
        return _reject("EVENT_IDENTITY_MISMATCH")
    reviewer_receipt = by_role["adversarial-reviewer"]
    if reviewer_receipt["start_timestamp_ms"] <= max(
        completed for role, completed in completion_by_role.items() if role != "adversarial-reviewer"
    ):
        return _reject("INHERITED_REVIEWER_CONTEXT")
    tasks = manifest.get("tasks")
    if not isinstance(tasks, list) or not tasks:
        return _reject("UNOWNED_OUTPUT")
    task_outputs: dict[str, str] = {}
    task_ids: set[str] = set()
    for task in tasks:
        if not isinstance(task, Mapping) or task.get("owner_role") not in _MANDATORY_ROLES or task.get("reviewer_role") not in {"adversarial-reviewer", "product-owner"} or task.get("owner_role") == task.get("reviewer_role") or (task.get("owner_role") != "adversarial-reviewer" and task.get("reviewer_role") != "adversarial-reviewer") or task.get("owner_role") in task.get("forbidden_roles", ()) or not _valid_hash(task.get("allowed_input_manifest_sha256")):
            return _reject("UNOWNED_OUTPUT")
        owner_receipt = by_role[task["owner_role"]]
        if set(task) != {"task_id", "owner_role", "forbidden_roles", "reviewer_role", "allowed_input_manifest_sha256", "expected_outputs"} or set(task.get("forbidden_roles", ())) != _MANDATORY_ROLES - {task["owner_role"]} or hashlib.sha256(json.dumps(task, sort_keys=True, separators=(",", ":")).encode()).hexdigest() != owner_receipt.get("task_manifest_sha256"):
            return _reject("UNOWNED_OUTPUT")
        try:
            attested_task = json.loads(
                event_by_role[task["owner_role"]]["attested_manifest_bytes"]["task_manifest_sha256"]
            )
        except (KeyError, TypeError, UnicodeDecodeError, json.JSONDecodeError):
            return _reject("UNOWNED_OUTPUT")
        if attested_task != task:
            return _reject("UNOWNED_OUTPUT")
        expected_task_id = f"{task['owner_role']}:{owner_receipt['spawn_id']}"
        if task.get("task_id") != expected_task_id or task["task_id"] in task_ids:
            return _reject("DUPLICATE_OUTPUT_OWNERSHIP")
        task_ids.add(task["task_id"])
        if task.get("allowed_input_manifest_sha256") != owner_receipt.get("allowed_input_manifest_sha256"):
            return _reject("UNOWNED_OUTPUT")
        for output in task.get("expected_outputs", ()):
            if not isinstance(output, Mapping) or output.get("path") in task_outputs:
                return _reject("DUPLICATE_OUTPUT_OWNERSHIP")
            path = output.get("path")
            if output.get("sha256") != owned_hashes.get(path):
                return _reject("OUTPUT_HASH_MISMATCH", path=path)
            task_outputs[path] = task["owner_role"]
    if task_outputs != owners:
        return _reject("UNOWNED_OUTPUT")
    return {"ok": True}


def validate_owner_approval(
    approval: Mapping[str, Any], resolver: EventResolver, *, expected_hashes: Mapping[str, str], review_completed_ms: int, consumed_event_ids: Sequence[str] = ()
) -> dict[str, Any]:
    """Validate an authentic, non-replayed product-owner user-message approval.

    @param approval Approval contract bound to exact candidate hashes.
    @param resolver Collaboration-event resolver at the provider boundary.
    @param expected_hashes Exact candidate, review, and gate hashes awaiting approval.
    @param consumed_event_ids Approval event IDs already consumed by a transition.
    @returns Success or a stable reason-coded rejection.
    """
    if not isinstance(approval, Mapping) or approval.get("schema_version") != PHASE2_SCHEMA_VERSION:
        return _reject("FORGED_OWNER_APPROVAL")
    event_id = approval.get("event_id")
    if event_id in consumed_event_ids:
        return _reject("REPLAYED_OWNER_APPROVAL")
    try:
        event = resolver.resolve(str(event_id))
    except EventResolutionError:
        return _reject("FORGED_OWNER_APPROVAL")
    if (
        event.get("provenance_kind") != "opencode-raw-export"
        or not isinstance(event.get("raw_export_bytes"), bytes)
        or hashlib.sha256(event["raw_export_bytes"]).hexdigest() != event.get("raw_export_sha256")
        or event.get("id") != event_id
        or event.get("role") != "user"
        or event.get("actor_role") != "product-owner"
        or not isinstance(event.get("session_id"), str)
        or not event["session_id"]
        or not isinstance(approval.get("session_id"), str)
        or not approval["session_id"]
        or event.get("session_id") != approval.get("session_id")
        or isinstance(event.get("created_ms"), bool)
        or not isinstance(event.get("created_ms"), int)
        or event.get("created_ms") != approval.get("event_timestamp_ms")
        or isinstance(review_completed_ms, bool)
        or event.get("created_ms") <= review_completed_ms
    ):
        return _reject("FORGED_OWNER_APPROVAL")
    try:
        approval_export = json.loads(event["raw_export_bytes"])
        approval_messages = approval_export["messages"]
    except (UnicodeDecodeError, json.JSONDecodeError, KeyError, TypeError):
        return _reject("FORGED_OWNER_APPROVAL")
    if approval_export.get("info", {}).get("id") != approval.get("session_id") or event_id not in {
        message.get("info", {}).get("id") for message in approval_messages if isinstance(message, Mapping)
    }:
        return _reject("FORGED_OWNER_APPROVAL")
    approval_raw_message = next((
        message for message in approval_messages if message.get("info", {}).get("id") == event_id
    ), None)
    if not isinstance(approval_raw_message, Mapping):
        return _reject("FORGED_OWNER_APPROVAL")
    raw_approval_bytes = "".join(
        part.get("text", "") for part in approval_raw_message.get("parts", [])
        if part.get("type") == "text" and isinstance(part.get("text"), str)
    ).encode()
    if raw_approval_bytes != event.get("message_bytes"):
        return _reject("FORGED_OWNER_APPROVAL")
    message = event.get("message_bytes")
    if not isinstance(message, bytes) or hashlib.sha256(message).hexdigest() != approval.get("message_sha256"):
        return _reject("OWNER_APPROVAL_HASH_MISMATCH")
    bindings = approval.get("approved_hashes")
    try:
        message_contract = json.loads(message)
    except (UnicodeDecodeError, json.JSONDecodeError):
        return _reject("FORGED_OWNER_APPROVAL")
    if not isinstance(message_contract, Mapping) or message_contract.get("decision") != "approve" or message_contract.get("approved_hashes") != bindings or approval.get("decision") != "approve" or not isinstance(bindings, Mapping) or dict(bindings) != dict(expected_hashes) or set(bindings) != {"candidate", "review", "gate"} or not all(_valid_hash(value) for value in bindings.values()):
        return _reject("FORGED_OWNER_APPROVAL")
    if not resolver.claim_once(str(event_id)):
        return _reject("REPLAYED_OWNER_APPROVAL")
    return {"ok": True}


__all__ = [
    "PHASE2_REJECTION_CODES", "PHASE2_SCHEMA_VERSION", "validate_denominator_bundle",
    "validate_owner_approval", "validate_roles_and_outputs",
]
