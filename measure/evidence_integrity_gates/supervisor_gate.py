"""Versioned, fail-closed completion gate for protected Measure tracks."""

from __future__ import annotations

import gzip
import hashlib
import io
import json
import re
import subprocess
from pathlib import Path, PurePosixPath
from typing import Any, Mapping

from .opencode_provenance import OpenCodeTrustedSessionResolver, TrustedSessionResolver


SUPERVISOR_GATE_SCHEMA_VERSION = "evidence-integrity.supervisor.v1"
GATE_TRACK_ID = "measure_apk_evidence_integrity_gates_20260712"
ACCEPTED_MANIFEST_PATH = "measure/evidence-integrity-accepted-gate.json"
OWNER_DELEGATION_TEXT = (
    b"For this project, YOU are the orchestrator, therefore YOU are acting as the owner."
)
REQUIRED_GATE_FILES = frozenset(
    {
        "measure/automation-supervisor.py",
        "measure/evidence_integrity_gates/__init__.py",
        "measure/evidence_integrity_gates/claim_contracts.py",
        "measure/evidence_integrity_gates/cli.py",
        "measure/evidence_integrity_gates/contracts.py",
        "measure/evidence_integrity_gates/denominator_roles.py",
        "measure/evidence_integrity_gates/events.py",
        "measure/evidence_integrity_gates/git_source.py",
        "measure/evidence_integrity_gates/lifecycle.py",
        "measure/evidence_integrity_gates/opencode_provenance.py",
        "measure/evidence_integrity_gates/supervisor_gate.py",
        "measure/evidence_integrity_gates/validator.py",
    }
)
SUPERVISOR_REJECTION_CODES = frozenset(
    {
        "ACCEPTED_GATE_MANIFEST_REQUIRED",
        "ACCEPTED_GATE_MANIFEST_INVALID",
        "ACCEPTED_GATE_REVOKED",
        "GATE_COMMIT_UNREACHABLE",
        "GATE_FILE_HASH_MISMATCH",
        "LEGACY_DEPENDENCIES_FIELD",
        "CANONICAL_DEPENDENCY_REQUIRED",
        "PRODUCT_GATE_PIN_REQUIRED_BEFORE_WORK",
        "PRODUCT_GATE_PIN_MISMATCH",
        "PRODUCT_TRACK_EDITED_GATE",
        "LEGACY_PLAN_MARKER",
        "INCOMPLETE_TASK",
        "CATALOG_GUARD_MISSING",
        "STALE_ARCHIVE_PATH",
        "GENERATED_FACTS_STALE",
        "DIRTY_WORKTREE",
    }
)


def _run_git(repo: Path, *arguments: str) -> subprocess.CompletedProcess[str]:
    """Runs a read-only Git command for the repository adapter.

    @param repo Repository root.
    @param arguments Git arguments excluding the executable.
    @returns Completed process with captured text output.
    """
    try:
        return subprocess.run(
            ["git", *arguments], cwd=repo, text=True, capture_output=True, check=False
        )
    except (OSError, UnicodeError) as error:
        return subprocess.CompletedProcess(["git", *arguments], 127, "", str(error))


def _run_git_bytes(repo: Path, *arguments: str) -> subprocess.CompletedProcess[bytes]:
    """Runs a read-only Git command without decoding repository bytes.

    @param repo Repository root.
    @param arguments Git arguments excluding the executable.
    @returns Completed process with exact captured bytes.
    """
    try:
        return subprocess.run(
            ["git", *arguments], cwd=repo, text=False, capture_output=True, check=False
        )
    except OSError as error:
        return subprocess.CompletedProcess(
            ["git", *arguments], 127, b"", str(error).encode("utf-8", errors="replace")
        )


def _sha256_bytes(value: bytes) -> str:
    """Hashes exact bytes with SHA-256.

    @param value Bytes to hash.
    @returns Lowercase hexadecimal digest.
    """
    return hashlib.sha256(value).hexdigest()


def _canonical_json(value: Mapping[str, Any]) -> bytes:
    """Serializes a contract to its unique UTF-8 representation.

    @param value JSON object to serialize.
    @returns Canonical JSON bytes.
    """
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()


def canonical_review_prompt(candidate_bytes: bytes) -> bytes:
    """Derives the exact adversarial-review prompt from candidate file bytes.

    @param candidate_bytes Exact bytes of the candidate manifest under review.
    @returns Canonical prompt bytes binding the candidate hash and review range.
    @throws ValueError When candidate bytes are malformed or ambiguously identify revisions.
    """
    try:
        candidate = json.loads(candidate_bytes)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError("candidate manifest is not valid JSON") from error
    if not isinstance(candidate, Mapping):
        raise ValueError("candidate manifest root must be an object")
    gate_version = candidate.get("gate_version")
    implementation_commit = candidate.get("implementation_commit")
    source_base_commit = candidate.get("source_base_commit")
    if (
        candidate.get("schema_version") != SUPERVISOR_GATE_SCHEMA_VERSION
        or candidate.get("status") != "candidate"
        or candidate.get("consumable") is not False
        or candidate.get("revoked") is not False
        or not isinstance(gate_version, str)
        or not gate_version
        or not isinstance(implementation_commit, str)
        or re.fullmatch(r"[0-9a-f]{40}", implementation_commit) is None
        or not isinstance(source_base_commit, str)
        or re.fullmatch(r"[0-9a-f]{40}", source_base_commit) is None
    ):
        raise ValueError("candidate manifest does not define an unambiguous review range")
    return _canonical_json({
        "candidate_manifest_sha256": _sha256_bytes(candidate_bytes),
        "gate_version": gate_version,
        "implementation_commit": implementation_commit,
        "source_base_commit": source_base_commit,
        "task": "independent-adversarial-review",
    })


def _blocked(code: str, **detail: Any) -> dict[str, Any]:
    """Builds one deterministic fail-closed gate report.

    @param code Stable rejection code.
    @param detail Safe diagnostic fields.
    @returns Structured blocked report.
    """
    if code not in SUPERVISOR_REJECTION_CODES:
        raise ValueError(f"unknown supervisor gate rejection code: {code}")
    blocker: dict[str, Any] = {"code": code}
    if detail:
        blocker["detail"] = detail
    return {
        "schema_version": SUPERVISOR_GATE_SCHEMA_VERSION,
        "ok": False,
        "state": "blocked",
        "blockers": [blocker],
    }


def _load_object(path: Path) -> Mapping[str, Any] | None:
    """Loads a JSON object without allowing malformed data to escape.

    @param path JSON file path.
    @returns Parsed mapping, or ``None`` for absent or invalid input.
    """
    try:
        if path.is_symlink():
            return None
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return None
    return value if isinstance(value, Mapping) else None


def _is_safe_relative_path(value: str) -> bool:
    """Checks that a manifest path is canonical and repository-relative.

    @param value Candidate POSIX path.
    @returns Whether the path cannot escape through absolute or parent segments.
    """
    path = PurePosixPath(value)
    return (
        bool(value)
        and "\\" not in value
        and not path.is_absolute()
        and all(part not in {"", ".", ".."} for part in path.parts)
        and str(path) == value
    )


def _is_regular_repo_file(repo: Path, relative_path: str) -> bool:
    """Checks that a path and all of its parents are non-symlink files in the repo.

    @param repo Resolved repository root.
    @param relative_path Canonical repository-relative path.
    @returns Whether the path is a regular in-repository file without symlink indirection.
    """
    if not _is_safe_relative_path(relative_path):
        return False
    current = repo
    for part in PurePosixPath(relative_path).parts:
        current = current / part
        if current.is_symlink():
            return False
    try:
        return current.is_file() and current.resolve().is_relative_to(repo)
    except OSError:
        return False


def _load_bound_object(
    repo: Path, relative_path: Any, expected_hash: Any
) -> Mapping[str, Any] | None:
    """Loads a non-symlink JSON artifact only when its exact bytes match.

    @param repo Resolved repository root.
    @param relative_path Manifest-provided artifact path.
    @param expected_hash Manifest-provided SHA-256 digest.
    @returns Parsed artifact object, or ``None`` for any invalid binding.
    """
    if (
        not isinstance(relative_path, str)
        or not isinstance(expected_hash, str)
        or re.fullmatch(r"[0-9a-f]{64}", expected_hash) is None
        or not _is_regular_repo_file(repo, relative_path)
    ):
        return None
    path = repo / relative_path
    if _sha256_bytes(path.read_bytes()) != expected_hash:
        return None
    return _load_object(path)


def _message_text_bytes(message: Mapping[str, Any]) -> bytes:
    """Returns exact concatenated UTF-8 text parts from one provider message.

    @param message Raw exported provider message.
    @returns Ordered text bytes without an invented serialization wrapper.
    """
    parts = message.get("parts")
    if not isinstance(parts, list):
        return b""
    return "".join(
        part["text"]
        for part in parts
        if isinstance(part, Mapping)
        and part.get("type") == "text"
        and isinstance(part.get("text"), str)
    ).encode()


def _load_bound_raw_export(
    repo: Path,
    relative_path: Any,
    expected_raw_hash: Any,
    expected_stored_hash: Any,
) -> Mapping[str, Any] | None:
    """Loads a content-addressed retained raw export after exact-byte verification.

    @param repo Resolved repository root.
    @param relative_path Repository-relative raw or gzip-compressed snapshot path.
    @param expected_raw_hash SHA-256 of the uncompressed provider bytes.
    @param expected_stored_hash SHA-256 of the exact retained file bytes.
    @returns Parsed raw export, or ``None`` for any path, hash, compression, or JSON failure.
    """
    if (
        not isinstance(relative_path, str)
        or not isinstance(expected_raw_hash, str)
        or not isinstance(expected_stored_hash, str)
        or re.fullmatch(r"[0-9a-f]{64}", expected_raw_hash) is None
        or re.fullmatch(r"[0-9a-f]{64}", expected_stored_hash) is None
        or not _is_regular_repo_file(repo, relative_path)
        or PurePosixPath(relative_path).name
        not in {f"{expected_raw_hash}.json", f"{expected_raw_hash}.json.gz"}
    ):
        return None
    try:
        stored = (repo / relative_path).read_bytes()
        if _sha256_bytes(stored) != expected_stored_hash:
            return None
        if relative_path.endswith(".gz"):
            with gzip.GzipFile(fileobj=io.BytesIO(stored)) as compressed:
                raw = compressed.read(32 * 1024 * 1024 + 1)
        else:
            raw = stored
        if len(raw) > 32 * 1024 * 1024 or _sha256_bytes(raw) != expected_raw_hash:
            return None
        value = json.loads(raw)
    except (OSError, EOFError, gzip.BadGzipFile, UnicodeDecodeError, json.JSONDecodeError):
        return None
    return value if isinstance(value, Mapping) else None


def _validated_export_messages(
    export: Mapping[str, Any], *, session_id: Any, parent_session_id: Any | None
) -> list[Mapping[str, Any]] | None:
    """Validates provider session identity, message IDs, parents, and chronology.

    @param export Parsed retained provider export.
    @param session_id Expected provider session identifier.
    @param parent_session_id Expected parent session, or ``None`` for a root session.
    @returns Chronological messages, or ``None`` when identity or history is malformed.
    """
    info = export.get("info")
    messages = export.get("messages")
    if (
        not isinstance(info, Mapping)
        or not isinstance(session_id, str)
        or info.get("id") != session_id
        or info.get("parentID") != parent_session_id
        or not isinstance(messages, list)
        or not messages
        or not all(isinstance(message, Mapping) for message in messages)
    ):
        return None
    identities: list[tuple[str, int, str | None]] = []
    for message in messages:
        message_info = message.get("info")
        time = message_info.get("time") if isinstance(message_info, Mapping) else None
        message_id = message_info.get("id") if isinstance(message_info, Mapping) else None
        created = time.get("created") if isinstance(time, Mapping) else None
        completed = time.get("completed") if isinstance(time, Mapping) else None
        parent = message_info.get("parentID") if isinstance(message_info, Mapping) else None
        role = message_info.get("role") if isinstance(message_info, Mapping) else None
        if (
            not isinstance(message_id, str)
            or not message_id.startswith("msg_")
            or message_info.get("sessionID") != session_id
            or isinstance(created, bool)
            or not isinstance(created, int)
            or role not in {"user", "assistant"}
            or (parent is not None and not isinstance(parent, str))
            or (
                completed is not None
                and (
                    isinstance(completed, bool)
                    or not isinstance(completed, int)
                    or completed < created
                )
            )
        ):
            return None
        identities.append((message_id, created, parent))
    ids = [identity[0] for identity in identities]
    if len(ids) != len(set(ids)) or identities != sorted(identities, key=lambda item: item[1]):
        return None
    prior_users: set[str] = set()
    for message, (message_id, _, parent) in zip(messages, identities, strict=True):
        role = message.get("info", {}).get("role")
        if role == "assistant" and parent not in prior_users:
            return None
        if role == "user":
            prior_users.add(message_id)
    return list(messages)


def _message_by_id(
    messages: list[Mapping[str, Any]], message_id: Any
) -> Mapping[str, Any] | None:
    """Finds exactly one retained message by provider identifier.

    @param messages Validated session messages.
    @param message_id Expected provider message identifier.
    @returns Matching message, or ``None`` when absent or duplicated.
    """
    matches = [message for message in messages if message.get("info", {}).get("id") == message_id]
    return matches[0] if len(matches) == 1 else None


def _resolve_trusted_export(
    resolver: TrustedSessionResolver, session_id: Any
) -> Mapping[str, Any] | None:
    """Resolves and parses one session exclusively through a trusted provider adapter.

    @param resolver Trusted live provider boundary.
    @param session_id Session identifier declared by retained evidence.
    @returns Parsed live export, or ``None`` when resolution fails closed.
    """
    if not isinstance(session_id, str):
        return None
    try:
        value = json.loads(resolver.resolve(session_id))
    except (OSError, RuntimeError, UnicodeDecodeError, json.JSONDecodeError):
        return None
    return value if isinstance(value, Mapping) else None


def _validate_trusted_event_snapshots(
    retained_export: Mapping[str, Any],
    *,
    resolver: TrustedSessionResolver,
    session_id: Any,
    parent_session_id: Any | None,
    agent: Any,
    event_ids: tuple[Any, ...],
    require_full_history: bool = False,
) -> bool:
    """Compares retained evidence with trusted live provider exports.

    @param retained_export Locally retained export already bound by content hashes.
    @param resolver Trusted live provider boundary.
    @param session_id Expected session identity.
    @param parent_session_id Expected parent session identity.
    @param agent Expected session agent identity.
    @param event_ids Exact provider event IDs that must match.
    @param require_full_history Whether the complete canonical message sequence must match.
    @returns Whether live session identity and required history exactly match retention.
    """
    live_export = _resolve_trusted_export(resolver, session_id)
    if live_export is None:
        return False
    retained_messages = _validated_export_messages(
        retained_export, session_id=session_id, parent_session_id=parent_session_id
    )
    live_messages = _validated_export_messages(
        live_export, session_id=session_id, parent_session_id=parent_session_id
    )
    retained_info = retained_export.get("info")
    live_info = live_export.get("info")
    if (
        retained_messages is None
        or live_messages is None
        or not isinstance(retained_info, Mapping)
        or not isinstance(live_info, Mapping)
        or retained_info.get("agent") != agent
        or live_info.get("agent") != agent
    ):
        return False
    identity_fields = ("id", "parentID", "agent", "fork_turns")
    if (
        {field: retained_info.get(field) for field in identity_fields}
        != {field: live_info.get(field) for field in identity_fields}
        or (
            require_full_history
            and _canonical_json({"messages": retained_messages})
            != _canonical_json({"messages": live_messages})
        )
    ):
        return False
    for event_id in event_ids:
        retained_event = _message_by_id(retained_messages, event_id)
        live_event = _message_by_id(live_messages, event_id)
        if (
            retained_event is None
            or live_event is None
            or _canonical_json(retained_event) != _canonical_json(live_event)
        ):
            return False
    return True


def _validate_review_provenance(
    repo: Path,
    review: Mapping[str, Any],
    *,
    candidate_hash: Any,
    candidate: Mapping[str, Any],
    gate_commit: Any,
    gate_version: Any,
    trusted_resolver: TrustedSessionResolver | None = None,
) -> tuple[bool, int | None]:
    """Validates retained reviewer identity and provider-neutral context isolation.

    @param repo Resolved repository root.
    @param review Bound independent-review report.
    @param candidate_hash Exact candidate manifest hash.
    @param candidate Parsed candidate manifest.
    @param gate_commit Reviewed implementation commit.
    @param gate_version Reviewed gate version.
    @param trusted_resolver Explicit trusted live provider resolver.
    @returns Validation result and provider completion timestamp.
    """
    provenance = review.get("fresh_context_provenance")
    if not isinstance(provenance, Mapping) or provenance.get("role") != "adversarial-reviewer":
        return False, None
    export = _load_bound_raw_export(
        repo,
        provenance.get("raw_export_path"),
        provenance.get("raw_export_sha256"),
        provenance.get("stored_export_sha256"),
    )
    if export is None:
        return False, None
    if trusted_resolver is None or not _validate_trusted_event_snapshots(
        export,
        resolver=trusted_resolver,
        session_id=provenance.get("session_id"),
        parent_session_id=provenance.get("parent_session_id"),
        agent=provenance.get("agent"),
        event_ids=(
            provenance.get("prompt_message_id"),
            provenance.get("final_response_message_id"),
        ),
        require_full_history=True,
    ):
        return False, None
    messages = _validated_export_messages(
        export,
        session_id=provenance.get("session_id"),
        parent_session_id=provenance.get("parent_session_id"),
    )
    if messages is None:
        return False, None
    prompt = _message_by_id(messages, provenance.get("prompt_message_id"))
    final = _message_by_id(messages, provenance.get("final_response_message_id"))
    if prompt is None or final is None:
        return False, None
    prompt_info = prompt.get("info", {})
    final_info = final.get("info", {})
    final_time = final_info.get("time", {})
    completed = final_time.get("completed")
    assistants = [message for message in messages if message.get("info", {}).get("role") == "assistant"]
    explicit_none = export.get("info", {}).get(
        "fork_turns", export.get("fork_turns")
    ) == "none"
    equivalent_fresh_history = (
        provenance.get("isolation_proof") == "raw-history-begins-with-fresh-prompt"
        and messages[0] is prompt
    )
    expected_prompt = _canonical_json({
        "candidate_manifest_sha256": candidate_hash,
        "gate_version": gate_version,
        "implementation_commit": gate_commit,
        "source_base_commit": candidate.get("source_base_commit"),
        "task": "independent-adversarial-review",
    })
    expected_final = _canonical_json({
        "candidate_manifest_sha256": candidate_hash,
        "review_status": review.get("review_status"),
        "unresolved_findings": review.get("unresolved_findings"),
    })
    valid = bool(
        prompt_info.get("role") == "user"
        and export.get("info", {}).get("agent") == provenance.get("agent")
        and final_info.get("role") == "assistant"
        and final_info.get("parentID") == provenance.get("prompt_message_id")
        and final is assistants[-1]
        and assistants
        and {message.get("info", {}).get("agent") for message in assistants}
        == {provenance.get("agent")}
        and _sha256_bytes(_message_text_bytes(prompt)) == provenance.get("prompt_text_sha256")
        and _sha256_bytes(_message_text_bytes(final))
        == provenance.get("final_response_text_sha256")
        and prompt_info.get("time", {}).get("created") == provenance.get("started_ms")
        and isinstance(completed, int)
        and completed == provenance.get("completed_ms")
        and _message_text_bytes(prompt) == expected_prompt
        and _message_text_bytes(final) == expected_final
        and messages[0] is prompt
        and (explicit_none or equivalent_fresh_history)
    )
    return valid, completed if valid else None


def _validate_owner_provenance(
    repo: Path,
    approval: Mapping[str, Any],
    *,
    candidate_hash: Any,
    review_hash: Any,
    gate_commit: Any,
    gate_version: Any,
    review_completed_ms: int,
    trusted_resolver: TrustedSessionResolver | None = None,
) -> tuple[bool, str | None]:
    """Validates retained owner approval, root designation, bindings, and ordering.

    @param repo Resolved repository root.
    @param approval Bound owner-approval artifact.
    @param candidate_hash Exact candidate artifact hash.
    @param review_hash Exact independent-review artifact hash.
    @param gate_commit Reviewed gate implementation commit.
    @param gate_version Reviewed gate version.
    @param review_completed_ms Provider timestamp when review completed.
    @param trusted_resolver Explicit trusted live provider resolver.
    @returns Validation result and the approval event ID for replay protection.
    """
    event = approval.get("approval_event")
    root = approval.get("root_owner_delegation")
    if not isinstance(event, Mapping) or not isinstance(root, Mapping):
        return False, None
    export = _load_bound_raw_export(
        repo,
        event.get("raw_export_path"),
        event.get("raw_export_sha256"),
        event.get("stored_export_sha256"),
    )
    root_export = _load_bound_raw_export(
        repo,
        root.get("raw_export_path"),
        root.get("raw_export_sha256"),
        root.get("stored_export_sha256"),
    )
    if export is None or root_export is None:
        return False, None
    messages = _validated_export_messages(
        export,
        session_id=event.get("session_id"),
        parent_session_id=event.get("parent_session_id"),
    )
    root_messages = _validated_export_messages(
        root_export, session_id=root.get("session_id"), parent_session_id=None
    )
    if messages is None or root_messages is None:
        return False, None
    prompt = _message_by_id(messages, event.get("prompt_message_id"))
    designation_contract = root.get("owner_designation_event")
    publication_contract = root.get("approval_publication_event")
    if (
        prompt is None
        or not isinstance(designation_contract, Mapping)
        or not isinstance(publication_contract, Mapping)
    ):
        return False, None
    if trusted_resolver is None or not _validate_trusted_event_snapshots(
        export,
        resolver=trusted_resolver,
        session_id=event.get("session_id"),
        parent_session_id=event.get("parent_session_id"),
        agent=event.get("agent"),
        event_ids=(event.get("prompt_message_id"),),
    ) or not _validate_trusted_event_snapshots(
        root_export,
        resolver=trusted_resolver,
        session_id=root.get("session_id"),
        parent_session_id=None,
        agent=root.get("agent"),
        event_ids=(
            designation_contract.get("message_id"),
            publication_contract.get("message_id"),
        ),
    ):
        return False, None
    designation = _message_by_id(root_messages, designation_contract.get("message_id"))
    publication = _message_by_id(root_messages, publication_contract.get("message_id"))
    if designation is None or publication is None:
        return False, None
    prompt_bytes = _message_text_bytes(prompt)
    prompt_created = prompt.get("info", {}).get("time", {}).get("created")
    designation_created = designation.get("info", {}).get("time", {}).get("created")
    publication_created = publication.get("info", {}).get("time", {}).get("created")
    expected_prompt = _canonical_json({
        "candidate_manifest_sha256": candidate_hash,
        "decision": "approve",
        "gate_commit": gate_commit,
        "gate_version": gate_version,
        "review_report_sha256": review_hash,
    })
    task_parts = [
        part
        for part in publication.get("parts", [])
        if isinstance(part, Mapping)
        and part.get("type") == "tool"
        and part.get("tool") == "task"
        and part.get("callID") == publication_contract.get("task_call_id")
    ]
    task_state = task_parts[0].get("state") if len(task_parts) == 1 else None
    task_input = task_state.get("input") if isinstance(task_state, Mapping) else None
    task_metadata = task_state.get("metadata") if isinstance(task_state, Mapping) else None
    approval_assistants = [
        message for message in messages if message.get("info", {}).get("role") == "assistant"
    ]
    valid = bool(
        event.get("role") == "product-owner"
        and export.get("info", {}).get("agent") == event.get("agent")
        and root_export.get("info", {}).get("agent") == root.get("agent")
        and prompt.get("info", {}).get("role") == "user"
        and messages[0] is prompt
        and approval_assistants
        and {message.get("info", {}).get("agent") for message in approval_assistants}
        == {event.get("agent")}
        and _sha256_bytes(prompt_bytes) == event.get("prompt_text_sha256")
        and prompt_created == event.get("prompt_created_ms")
        and isinstance(prompt_created, int)
        and prompt_created > review_completed_ms
        and prompt_bytes == expected_prompt
        and designation.get("info", {}).get("role") == "user"
        and _message_text_bytes(designation) == OWNER_DELEGATION_TEXT
        and designation_contract.get("designated_role") == "product-owner"
        and designation_contract.get("delegate_agent") == event.get("agent")
        and _sha256_bytes(_message_text_bytes(designation))
        == designation_contract.get("message_text_sha256")
        and designation_created == designation_contract.get("created_ms")
        and publication_created == publication_contract.get("created_ms")
        and publication.get("info", {}).get("role") == "assistant"
        and publication.get("info", {}).get("agent") == root.get("agent")
        and isinstance(designation_created, int)
        and isinstance(publication_created, int)
        and designation_created < publication_created < prompt_created
        and isinstance(task_input, Mapping)
        and isinstance(task_metadata, Mapping)
        and task_state.get("status") == "completed"
        and task_metadata.get("sessionId") == event.get("session_id")
        and task_metadata.get("parentSessionId") == root.get("session_id")
        and task_metadata.get("sessionId") == publication_contract.get("delegated_session_id")
        and _sha256_bytes(str(task_input.get("prompt", "")).encode())
        == publication_contract.get("delegated_prompt_sha256")
        == _sha256_bytes(prompt_bytes)
    )
    return valid, event.get("prompt_message_id") if valid else None


def _validate_acceptance_bindings(
    repo: Path,
    manifest: Mapping[str, Any],
    trusted_resolver: TrustedSessionResolver | None,
) -> bool:
    """Validates candidate, independent-review, and owner-approval byte bindings.

    @param repo Resolved repository root.
    @param manifest Accepted gate manifest.
    @param trusted_resolver Trusted live provider resolver.
    @returns Whether acceptance was produced from the exact non-consumable candidate.
    """
    candidate_hash = manifest.get("candidate_manifest_hash")
    candidate = _load_bound_object(
        repo, manifest.get("candidate_manifest_path"), candidate_hash
    )
    review_hash = manifest.get("review_hash")
    review = _load_bound_object(repo, manifest.get("review_report_path"), review_hash)
    approval_hash = manifest.get("owner_approval_hash")
    approval = _load_bound_object(
        repo, manifest.get("owner_approval_path"), approval_hash
    )
    if candidate is None or review is None or approval is None:
        return False
    unresolved = review.get("unresolved_findings")
    no_blockers = isinstance(unresolved, Mapping) and all(
        unresolved.get(level) == [] for level in ("critical", "high", "medium")
    )
    review_provenance_valid, review_completed_ms = _validate_review_provenance(
        repo,
        review,
        candidate_hash=candidate_hash,
        candidate=candidate,
        gate_commit=manifest.get("gate_commit"),
        gate_version=manifest.get("gate_version"),
        trusted_resolver=trusted_resolver,
    )
    if not review_provenance_valid or review_completed_ms is None:
        return False
    owner_provenance_valid, approval_event_id = _validate_owner_provenance(
        repo,
        approval,
        candidate_hash=candidate_hash,
        review_hash=review_hash,
        gate_commit=manifest.get("gate_commit"),
        gate_version=manifest.get("gate_version"),
        review_completed_ms=review_completed_ms,
        trusted_resolver=trusted_resolver,
    )
    consumption = manifest.get("approval_consumption")
    candidate_review = candidate.get("independent_review")
    candidate_owner = candidate.get("owner_approval")
    replay_resistant = bool(
        owner_provenance_valid
        and isinstance(consumption, Mapping)
        and consumption
        == {
            "event_id": approval_event_id,
            "candidate_manifest_hash": candidate_hash,
            "review_report_hash": review_hash,
            "gate_commit": manifest.get("gate_commit"),
            "gate_version": manifest.get("gate_version"),
        }
    )
    return bool(
        candidate.get("schema_version") == SUPERVISOR_GATE_SCHEMA_VERSION
        and candidate.get("gate_version") == manifest.get("gate_version")
        and candidate.get("status") == "candidate"
        and candidate.get("consumable") is False
        and candidate.get("revoked") is False
        and candidate.get("accepted_manifest_published") is False
        and isinstance(candidate_review, Mapping)
        and candidate_review.get("status") == "pending"
        and isinstance(candidate_owner, Mapping)
        and candidate_owner.get("status") == "pending"
        and candidate.get("implementation_commit") == manifest.get("gate_commit")
        and candidate.get("files") == manifest.get("files")
        and review.get("review_status") == "pass"
        and review.get("revoked") is False
        and review.get("candidate_manifest_sha256") == candidate_hash
        and no_blockers
        and approval.get("decision") == "approve"
        and approval.get("revoked") is False
        and approval.get("candidate_manifest_hash") == candidate_hash
        and approval.get("review_report_hash") == review_hash
        and approval.get("gate_version") == manifest.get("gate_version")
        and approval.get("gate_commit") == manifest.get("gate_commit")
        and replay_resistant
    )


def _validate_manifest(
    repo: Path, trusted_resolver: TrustedSessionResolver | None
) -> tuple[Mapping[str, Any] | None, dict[str, Any] | None]:
    """Validates the accepted manifest and every live gate-file hash.

    @param repo Repository root.
    @param trusted_resolver Trusted live provider resolver.
    @returns Manifest and no blocker, or no manifest and a blocker.
    """
    path = repo / ACCEPTED_MANIFEST_PATH
    if not _is_regular_repo_file(repo, ACCEPTED_MANIFEST_PATH):
        return None, _blocked("ACCEPTED_GATE_MANIFEST_REQUIRED", path=ACCEPTED_MANIFEST_PATH)
    manifest = _load_object(path)
    if manifest is None:
        return None, _blocked("ACCEPTED_GATE_MANIFEST_INVALID")
    if manifest.get("status") != "accepted" or manifest.get("schema_version") != SUPERVISOR_GATE_SCHEMA_VERSION:
        return None, _blocked("ACCEPTED_GATE_MANIFEST_INVALID")
    if manifest.get("revoked") is not False:
        return None, _blocked("ACCEPTED_GATE_REVOKED")
    commit = manifest.get("gate_commit")
    files = manifest.get("files")
    if (
        not isinstance(commit, str)
        or re.fullmatch(r"[0-9a-f]{40}", commit) is None
        or not isinstance(manifest.get("gate_version"), str)
        or not manifest["gate_version"]
        or not isinstance(files, Mapping)
        or not files
        or not all(isinstance(key, str) and isinstance(value, str) for key, value in files.items())
        or not REQUIRED_GATE_FILES.issubset(files.keys())
    ):
        return None, _blocked("ACCEPTED_GATE_MANIFEST_INVALID")
    if _run_git(repo, "cat-file", "-e", f"{commit}^{{commit}}").returncode != 0:
        return None, _blocked("GATE_COMMIT_UNREACHABLE", commit=commit)
    if _run_git(repo, "merge-base", "--is-ancestor", commit, "HEAD").returncode != 0:
        return None, _blocked("GATE_COMMIT_UNREACHABLE", commit=commit)
    for relative_path, expected_hash in sorted(files.items()):
        if (
            not isinstance(relative_path, str)
            or not isinstance(expected_hash, str)
            or not _is_safe_relative_path(relative_path)
            or re.fullmatch(r"[0-9a-f]{64}", expected_hash) is None
        ):
            return None, _blocked("ACCEPTED_GATE_MANIFEST_INVALID")
        committed = _run_git_bytes(repo, "show", f"{commit}:{relative_path}")
        if (
            committed.returncode != 0
            or _sha256_bytes(committed.stdout) != expected_hash
        ):
            return None, _blocked("GATE_FILE_HASH_MISMATCH", path=relative_path)
    if not _validate_acceptance_bindings(repo, manifest, trusted_resolver):
        return None, _blocked("ACCEPTED_GATE_MANIFEST_INVALID")
    return manifest, None


def _validate_live_gate_files(
    repo: Path, files: Mapping[str, Any]
) -> dict[str, Any] | None:
    """Validates accepted gate files against current worktree bytes.

    @param repo Repository root.
    @param files Accepted path-to-hash mapping.
    @returns A hash-mismatch blocker, or ``None`` when all bytes match.
    """
    for relative_path, expected_hash in sorted(files.items()):
        live_path = repo / relative_path
        if (
            not _is_regular_repo_file(repo, relative_path)
            or _sha256_bytes(live_path.read_bytes()) != expected_hash
        ):
            return _blocked("GATE_FILE_HASH_MISMATCH", path=relative_path)
    return None


def _validate_plan(plan_path: Path) -> dict[str, Any] | None:
    """Rejects hidden legacy work and non-structured incomplete tasks.

    @param plan_path Product track plan.
    @returns A blocker, or ``None`` when completion markers are valid.
    """
    try:
        text = plan_path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return _blocked("INCOMPLETE_TASK", path=str(plan_path))
    tasks = re.findall(r"^\s*[-*+]\s+\[([^\]]*)\](.*)$", text, re.MULTILINE)
    if not tasks:
        return _blocked("INCOMPLETE_TASK")
    completed = 0
    for status, suffix in tasks:
        if status not in {"~", "x", "b"}:
            return _blocked("LEGACY_PLAN_MARKER")
        if not suffix.startswith(" ") or not suffix.strip():
            return _blocked("INCOMPLETE_TASK")
        task = suffix.strip()
        structured_block = status == "b" and re.search(r"\bdeferred:[\w.-]+\b", task, re.IGNORECASE)
        if status == "x":
            completed += 1
            continue
        if not structured_block:
            return _blocked("INCOMPLETE_TASK", task=task)
    if completed == 0:
        return _blocked("INCOMPLETE_TASK")
    return None


def _validate_catalog_and_archive(repo: Path, track_id: str) -> dict[str, Any] | None:
    """Validates catalog guard references and archive-aware track resolution.

    @param repo Repository root.
    @param track_id Product track identifier.
    @returns A blocker, or ``None`` when repository guard paths are current.
    """
    catalog_path = repo / "measure" / "anti-patterns.md"
    try:
        catalog = catalog_path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return _blocked("CATALOG_GUARD_MISSING", path=str(catalog_path))
    references = {
        reference
        for line in catalog.splitlines()
        if line.startswith("**Guard:**")
        for reference in re.findall(r"tests/[A-Za-z0-9_./-]+\.sh", line)
    }
    for reference in sorted(references):
        if not (repo / reference).is_file():
            return _blocked("CATALOG_GUARD_MISSING", path=reference)
    active = repo / "measure" / "tracks" / track_id
    archived = repo / "measure" / "archive" / track_id
    if active.exists() and archived.exists():
        return _blocked("STALE_ARCHIVE_PATH", track=track_id)
    registry_path = repo / "measure" / "tracks.md"
    try:
        registry = registry_path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return _blocked("STALE_ARCHIVE_PATH", path=str(registry_path))
    if active.exists() and f"./archive/{track_id}/" in registry:
        return _blocked("STALE_ARCHIVE_PATH", track=track_id)
    for candidate in (repo / "measure" / "tracks").iterdir():
        if candidate.is_dir() and (repo / "measure" / "archive" / candidate.name).exists():
            return _blocked("STALE_ARCHIVE_PATH", track=candidate.name)
    return None


def _validate_generated_facts(repo: Path) -> dict[str, Any] | None:
    """Rejects generated architecture facts stale after structural changes.

    @param repo Repository root.
    @returns A blocker, or ``None`` when generated facts cover structural HEAD changes.
    """
    facts = _load_object(repo / "measure" / "generated" / "architecture.json")
    revision = facts.get("sourceRevision") if facts else None
    if not isinstance(revision, str) or re.fullmatch(r"[0-9a-f]{40}", revision) is None:
        return _blocked("GENERATED_FACTS_STALE")
    if _run_git(repo, "cat-file", "-e", f"{revision}^{{commit}}").returncode != 0:
        return _blocked("GENERATED_FACTS_STALE", revision=revision)
    if _run_git(repo, "merge-base", "--is-ancestor", revision, "HEAD").returncode != 0:
        return _blocked("GENERATED_FACTS_STALE", revision=revision)
    changed = _run_git(repo, "diff", "--name-only", revision, "--", "apps", "packages", "services")
    if changed.returncode != 0 or changed.stdout.strip():
        return _blocked("GENERATED_FACTS_STALE", changed=changed.stdout.splitlines())
    return None


def _dependency_gate_status(
    repo: Path, track_id: str, visited: frozenset[str] = frozenset()
) -> tuple[bool, dict[str, Any] | None]:
    """Resolves canonical dependencies until the integrity gate is reached.

    @param repo Repository root.
    @param track_id Track whose dependency chain is being inspected.
    @param visited Already visited track identifiers for cycle safety.
    @returns Whether the gate is reachable and any fail-closed dependency blocker.
    """
    if re.fullmatch(r"[A-Za-z0-9_.-]+", track_id) is None:
        return False, _blocked("CANONICAL_DEPENDENCY_REQUIRED", track=track_id)
    if track_id == GATE_TRACK_ID:
        return True, None
    if track_id in visited:
        return False, _blocked("CANONICAL_DEPENDENCY_REQUIRED", track=track_id)
    active = repo / "measure" / "tracks" / track_id
    archived = repo / "measure" / "archive" / track_id
    if active.exists() and archived.exists():
        return False, _blocked("STALE_ARCHIVE_PATH", track=track_id)
    track_dir = archived if archived.exists() else active
    metadata = _load_object(track_dir / "metadata.json")
    if metadata is None:
        return False, _blocked("CANONICAL_DEPENDENCY_REQUIRED", track=track_id)
    if "dependencies" in metadata:
        return False, _blocked("LEGACY_DEPENDENCIES_FIELD", track=track_id)
    dependencies = metadata.get("depends_on")
    if not isinstance(dependencies, list) or not all(isinstance(item, str) and item for item in dependencies):
        return False, _blocked("CANONICAL_DEPENDENCY_REQUIRED", track=track_id)
    for dependency in dependencies:
        reaches_gate, blocker = _dependency_gate_status(
            repo, dependency, visited | {track_id}
        )
        if blocker:
            return False, blocker
        if reaches_gate:
            return True, None
    return False, None


def _validate_clean_worktree(repo: Path) -> dict[str, Any] | None:
    """Rejects tracked or meaningful untracked bytes at an exact-revision gate.

    @param repo Resolved repository root.
    @returns A dirty-worktree blocker, or ``None`` for a clean tree.
    """
    status = _run_git_bytes(
        repo, "status", "--porcelain=v1", "-z", "--untracked-files=all"
    )
    if status.returncode != 0:
        return _blocked("DIRTY_WORKTREE", error="git status failed")
    entries = [entry for entry in status.stdout.split(b"\0") if entry]
    meaningful = []
    for entry in entries:
        path = entry[3:].decode("utf-8", errors="replace") if len(entry) > 3 else ""
        if entry.startswith(b"?? ") and (
            "/__pycache__/" in f"/{path}" or path.endswith((".pyc", ".pyo"))
        ):
            continue
        meaningful.append(entry.decode("utf-8", errors="replace"))
    if meaningful:
        return _blocked("DIRTY_WORKTREE", paths=meaningful)
    return None


def validate_supervisor_completion(
    repo: Path,
    track_id: str,
    *,
    stage: str = "completion",
    trusted_resolver: TrustedSessionResolver | None = None,
) -> dict[str, Any]:
    """Validates evidence-integrity requirements before work or completion.

    @param repo Repository root.
    @param track_id Protected product track identifier.
    @param stage ``preflight`` before work or ``completion`` after tasks finish.
    @param trusted_resolver Optional trusted provider resolver; production uses OpenCode.
    @returns Versioned pass or fail-closed completion report.
    """
    if stage not in {"preflight", "completion"}:
        raise ValueError(f"unsupported supervisor gate stage: {stage}")
    repo = repo.resolve()
    resolver = trusted_resolver or OpenCodeTrustedSessionResolver()
    track_dir = repo / "measure" / "tracks" / track_id
    metadata = _load_object(track_dir / "metadata.json")
    if metadata is None:
        return _blocked("PRODUCT_GATE_PIN_REQUIRED_BEFORE_WORK")
    reaches_gate, dependency_blocker = _dependency_gate_status(repo, track_id)
    if dependency_blocker:
        return dependency_blocker
    if not reaches_gate:
        return _blocked("CANONICAL_DEPENDENCY_REQUIRED")
    manifest, blocker = _validate_manifest(repo, resolver)
    if blocker:
        return blocker
    assert manifest is not None
    pin = metadata.get("evidence_integrity_gate")
    first_work_commit = metadata.get("first_work_commit")
    expected_pin = {
        "version": manifest["gate_version"],
        "commit": manifest["gate_commit"],
        "manifest_sha256": _sha256_bytes((repo / ACCEPTED_MANIFEST_PATH).read_bytes()),
        "files": manifest["files"],
    }
    if not isinstance(pin, Mapping) or not isinstance(first_work_commit, str):
        return _blocked("PRODUCT_GATE_PIN_REQUIRED_BEFORE_WORK")
    if (
        re.fullmatch(r"[0-9a-f]{40}", first_work_commit) is None
        or _run_git(repo, "merge-base", "--is-ancestor", first_work_commit, "HEAD").returncode != 0
        or _run_git(repo, "merge-base", "--is-ancestor", manifest["gate_commit"], f"{first_work_commit}^").returncode != 0
    ):
        return _blocked("PRODUCT_GATE_PIN_REQUIRED_BEFORE_WORK")
    parent_metadata = _run_git(repo, "show", f"{first_work_commit}^:measure/tracks/{track_id}/metadata.json")
    if parent_metadata.returncode != 0:
        return _blocked("PRODUCT_GATE_PIN_REQUIRED_BEFORE_WORK")
    try:
        prior_pin = json.loads(parent_metadata.stdout).get("evidence_integrity_gate")
    except (json.JSONDecodeError, AttributeError):
        return _blocked("PRODUCT_GATE_PIN_REQUIRED_BEFORE_WORK")
    if dict(pin) != expected_pin or prior_pin != expected_pin:
        return _blocked("PRODUCT_GATE_PIN_MISMATCH")
    edited = _run_git(
        repo,
        "log",
        "--format=%H",
        f"{manifest['gate_commit']}..HEAD",
        "--",
        *sorted(manifest["files"]),
    )
    if edited.returncode != 0 or edited.stdout.strip():
        return _blocked("PRODUCT_TRACK_EDITED_GATE", files=edited.stdout.splitlines())
    live_gate_blocker = _validate_live_gate_files(repo, manifest["files"])
    if live_gate_blocker:
        return live_gate_blocker
    checks = [_validate_catalog_and_archive(repo, track_id), _validate_generated_facts(repo)]
    if stage == "completion":
        checks.insert(0, _validate_plan(track_dir / "plan.md"))
    for check in checks:
        if check:
            return check
    dirty = _validate_clean_worktree(repo)
    if dirty:
        return dirty
    return {
        "schema_version": SUPERVISOR_GATE_SCHEMA_VERSION,
        "ok": True,
        "state": f"{stage}_allowed",
        "blockers": [],
        "track_id": track_id,
        "gate_version": manifest["gate_version"],
        "gate_commit": manifest["gate_commit"],
        "manifest_sha256": expected_pin["manifest_sha256"],
    }


__all__ = [
    "ACCEPTED_MANIFEST_PATH",
    "GATE_TRACK_ID",
    "REQUIRED_GATE_FILES",
    "SUPERVISOR_GATE_SCHEMA_VERSION",
    "SUPERVISOR_REJECTION_CODES",
    "canonical_review_prompt",
    "validate_supervisor_completion",
]
