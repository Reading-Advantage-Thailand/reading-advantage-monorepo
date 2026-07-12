"""Pure Phase 1 validation over claim contracts and Git source resolution."""

from __future__ import annotations

import hashlib
import re
from pathlib import PurePosixPath
from typing import Any, Mapping

from measure.evidence_integrity_gates.claim_contracts import (
    CLAIM_EVIDENCE_SCHEMA_VERSION,
    reject,
)
from measure.evidence_integrity_gates.git_source import GitSourceAdapter, GitSourceError


_SHA256 = re.compile(r"[0-9a-f]{64}\Z")
_COMMIT_SHA = re.compile(r"[0-9a-f]{40}\Z")
_OPEN_CODE_SESSION = re.compile(r"ses_[A-Za-z0-9]+\Z")
_OPEN_CODE_MESSAGE = re.compile(r"msg_[A-Za-z0-9]+\Z")
_CONFIDENCE_LEVELS = frozenset({"low", "medium", "high"})
_CONFLICT_STATES = frozenset({"none", "open", "resolved"})
_REVIEW_DISPOSITIONS = frozenset({"approved", "rejected", "needs-changes"})


def _is_exact_hash(value: Any) -> bool:
    """Checks whether a value is one lowercase SHA-256 digest.

    @param value Candidate digest.
    @returns Whether value is an exact lowercase SHA-256 digest.
    """
    return isinstance(value, str) and _SHA256.fullmatch(value) is not None


def _is_safe_file_path(value: Any) -> bool:
    """Checks whether a locator is a normalized relative file-path candidate.

    @param value Candidate source path.
    @returns Whether value is a normalized non-directory relative path.
    """
    if not isinstance(value, str) or not value or "\\" in value or value.endswith("/"):
        return False
    path = PurePosixPath(value)
    return not path.is_absolute() and "." not in path.parts and ".." not in path.parts


def _is_generated_prose_path(path: str) -> bool:
    """Checks the explicit generated-prose source-class path predicate.

    @param path Normalized repository-relative source path.
    @returns Whether path is in the reserved generated directory and names prose.
    """
    parts = PurePosixPath(path).parts
    return "generated" in parts and PurePosixPath(path).suffix in {".md", ".txt"}


def _validate_actor(actor: Any, malformed_code: str) -> bool:
    """Checks an exported OpenCode actor reference without inventing event fields.

    @param actor Collector or reviewer object.
    @param malformed_code Stable code to return from the caller on failure.
    @returns Whether actor contains only required exported-provenance fields.
    """
    del malformed_code
    return (
        isinstance(actor, Mapping)
        and actor.get("kind") == "opencode-export"
        and isinstance(actor.get("session_id"), str)
        and _OPEN_CODE_SESSION.fullmatch(actor["session_id"]) is not None
        and isinstance(actor.get("message_id"), str)
        and _OPEN_CODE_MESSAGE.fullmatch(actor["message_id"]) is not None
        and _is_exact_hash(actor.get("raw_export_sha256"))
    )


def _validate_shape(claim: Mapping[str, Any]) -> dict[str, Any]:
    """Validates claim/source/review field structure before Git access.

    @param claim Candidate claim-evidence record.
    @returns Success or stable rejection result.
    """
    if claim.get("schema_version") != CLAIM_EVIDENCE_SCHEMA_VERSION or not isinstance(
        claim.get("claim_id"), str
    ) or not claim["claim_id"].strip():
        return reject("MALFORMED_CLAIM")
    source = claim.get("source")
    if not isinstance(source, Mapping):
        return reject("MALFORMED_SOURCE_LOCATOR")
    if not isinstance(source.get("revision"), str) or _COMMIT_SHA.fullmatch(source["revision"]) is None:
        return reject("MALFORMED_REVISION")
    if not _is_safe_file_path(source.get("path")) or not isinstance(source.get("line_start"), int) or isinstance(source.get("line_start"), bool) or not isinstance(source.get("line_end"), int) or isinstance(source.get("line_end"), bool) or not _is_exact_hash(source.get("cited_range_sha256")) or source.get("source_class") not in {"repository-source", "generated-prose"} or not isinstance(source.get("primary_evidence"), bool):
        return reject("MALFORMED_SOURCE_LOCATOR")
    confidence = claim.get("confidence")
    if not isinstance(confidence, Mapping) or confidence.get("level") not in _CONFIDENCE_LEVELS or not isinstance(confidence.get("rationale"), str) or not confidence["rationale"].strip():
        return reject("MALFORMED_CONFIDENCE")
    conflict = claim.get("conflict")
    if not isinstance(conflict, Mapping) or conflict.get("state") not in _CONFLICT_STATES or not isinstance(conflict.get("detail"), str) or not conflict["detail"].strip():
        return reject("MALFORMED_CONFLICT")
    if not _validate_actor(claim.get("collector"), "MALFORMED_COLLECTOR"):
        return reject("MALFORMED_COLLECTOR")
    reviewer = claim.get("reviewer")
    if not _validate_actor(reviewer, "MALFORMED_REVIEWER") or reviewer.get("disposition") not in _REVIEW_DISPOSITIONS:
        return reject("MALFORMED_REVIEWER")
    if claim["collector"]["session_id"] == reviewer["session_id"]:
        return reject("MALFORMED_REVIEWER")
    if not isinstance(claim.get("extracted_fact"), str) or not claim["extracted_fact"].strip() or not isinstance(claim.get("interpretation"), str) or not claim["interpretation"].strip():
        return reject("MALFORMED_CLAIM")
    if claim["extracted_fact"].strip() == claim["interpretation"].strip():
        return reject("INFERENCE_PRESENTED_AS_FACT")
    return {"ok": True}


def validate_claim_evidence(claim: Mapping[str, Any], source_adapter: GitSourceAdapter) -> dict[str, Any]:
    """Validates an exact claim against repository bytes at its claimed revision.

    @param claim Versioned claim-evidence record supplied at the gate boundary.
    @param source_adapter Git adapter that independently resolves the citation.
    @returns ``{"ok": True}`` only for a strict, source-backed claim; otherwise a reason-coded rejection.
    """
    if not isinstance(claim, Mapping):
        return reject("MALFORMED_CLAIM")
    shape = _validate_shape(claim)
    if not shape["ok"]:
        return shape
    source = claim["source"]
    if source["primary_evidence"] and source["source_class"] == "generated-prose":
        return reject("GENERATED_PROSE_PRIMARY_EVIDENCE_REJECTED")
    generated_path = _is_generated_prose_path(source["path"])
    if (source["source_class"] == "generated-prose") != generated_path:
        return reject("SOURCE_CLASS_PATH_MISMATCH")
    try:
        resolved = source_adapter.resolve(
            source["revision"], source["path"], source["line_start"], source["line_end"]
        )
    except GitSourceError as error:
        return reject(error.code)
    actual_hash = hashlib.sha256(resolved.cited_bytes).hexdigest()
    if actual_hash != source["cited_range_sha256"]:
        return reject("CITED_RANGE_HASH_MISMATCH")
    try:
        exact_fact = resolved.cited_bytes.decode("utf-8").rstrip("\r\n")
    except UnicodeDecodeError:
        return reject("FACT_NOT_EXACT_SOURCE_TEXT")
    if claim["extracted_fact"] != exact_fact:
        return reject("INFERENCE_PRESENTED_AS_FACT")
    return {"ok": True}
