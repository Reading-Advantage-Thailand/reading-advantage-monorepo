"""Fail-closed validator for the planning-only APK Phase-1 denominator crosswalk."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path
from typing import Any


EXPECTED_SCHEMA = "apk-denominator-27-to-29-crosswalk.v1"
EXPECTED_REVIEW_SCHEMA = "apk-denominator-independent-review-candidate.v1"
EXPECTED_ARTIFACT_HASHES = {
    "accepted_denominator": "d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729",
    "accepted_partition": "6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0",
    "identity_ledger": "a31c99650bf1abd6623e64b2e9a23c4c481ce970036b52cfbe08c74b1c09c407",
    "source_denominator": "0dbf97dac93ba2056228e79433fb91e6f2ef1898b6f09eff62fe0755082ba21d",
    "historical_source_denominator": "6e313be829b414e7c85f4f20d4cb7e33283f15d743740b8784b589d0de2c7e6f",
}
FORBIDDEN_CLAIM_KEYS = {
    "adoption_success",
    "asset_adoption_success",
    "browser_success",
    "gameplay_claim",
    "gameplay_success",
    "host_success",
    "performance_success",
    "ready",
}


class _ValidationFailure(Exception):
    """Carries a stable fail-closed rejection code."""

    def __init__(self, code: str, detail: str) -> None:
        """Initializes one validation failure.

        Args:
            code: Stable machine-readable rejection code.
            detail: Human-readable failure detail.
        """
        super().__init__(detail)
        self.code = code
        self.detail = detail


def _reject(code: str, detail: str) -> None:
    """Raises a stable validation failure.

    Args:
        code: Stable machine-readable rejection code.
        detail: Human-readable failure detail.

    Raises:
        _ValidationFailure: Always.
    """
    raise _ValidationFailure(code, detail)


def _load_artifact(repo_root: Path, reference: object, key: str) -> dict[str, Any]:
    """Loads a hash-pinned repository artifact.

    Args:
        repo_root: Repository root directory.
        reference: Candidate path and SHA-256 mapping.
        key: Expected source-artifact key.

    Returns:
        Parsed JSON object.
    """
    if not isinstance(reference, dict):
        _reject("SOURCE_ARTIFACT_INVALID", f"{key} reference must be an object")
    path = reference.get("path")
    digest = reference.get("sha256")
    if not isinstance(path, str) or not isinstance(digest, str):
        _reject("SOURCE_ARTIFACT_INVALID", f"{key} requires path and sha256")
    if digest != EXPECTED_ARTIFACT_HASHES[key]:
        _reject("SOURCE_ARTIFACT_HASH_MISMATCH", f"{key} does not use the accepted T2 hash")
    artifact_path = repo_root / path
    if not artifact_path.is_file():
        _reject("SOURCE_ARTIFACT_MISSING", f"missing source artifact: {path}")
    raw = artifact_path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != digest:
        _reject("SOURCE_ARTIFACT_HASH_MISMATCH", f"source artifact bytes changed: {path}")
    value = json.loads(raw)
    if not isinstance(value, dict):
        _reject("SOURCE_ARTIFACT_INVALID", f"source artifact must be an object: {path}")
    return value


def _resolve_pointer(document: object, pointer: object) -> object:
    """Resolves a restricted JSON pointer.

    Args:
        document: JSON-compatible source document.
        pointer: Slash-prefixed JSON pointer.

    Returns:
        Value selected by the pointer.
    """
    if not isinstance(pointer, str) or not pointer.startswith("/"):
        _reject("SOURCE_LOCATOR_INVALID", "source locator requires a JSON pointer")
    value = document
    for encoded_part in pointer[1:].split("/"):
        part = encoded_part.replace("~1", "/").replace("~0", "~")
        if isinstance(value, list):
            try:
                value = value[int(part)]
            except (ValueError, IndexError):
                _reject("SOURCE_LOCATOR_INVALID", f"unresolvable list pointer: {pointer}")
        elif isinstance(value, dict) and part in value:
            value = value[part]
        else:
            _reject("SOURCE_LOCATOR_INVALID", f"unresolvable object pointer: {pointer}")
    return value


def _git_blob(repo_root: Path, revision: object, path: object) -> bytes:
    """Reads one exact committed source blob.

    Args:
        repo_root: Repository root directory.
        revision: Git revision containing the source.
        path: Repository-relative source path.

    Returns:
        Committed file bytes.
    """
    if not isinstance(revision, str) or not isinstance(path, str):
        _reject("SOURCE_EVIDENCE_INVALID", "evidence requires revision and path")
    result = subprocess.run(
        ["git", "show", f"{revision}:{path}"],
        cwd=repo_root,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        _reject("SOURCE_EVIDENCE_UNRESOLVABLE", f"cannot resolve {revision}:{path}")
    return result.stdout


def _validate_evidence(repo_root: Path, evidence: object) -> None:
    """Validates an exact T2 committed blob and inclusive line range.

    Args:
        repo_root: Repository root directory.
        evidence: T2 evidence locator.
    """
    if not isinstance(evidence, dict):
        _reject("SOURCE_EVIDENCE_INVALID", "source evidence must be an object")
    blob = _git_blob(repo_root, evidence.get("revision"), evidence.get("path"))
    if hashlib.sha256(blob).hexdigest() != evidence.get("blob_sha256"):
        _reject("SOURCE_EVIDENCE_HASH_MISMATCH", "source blob SHA-256 does not match")
    cited_range = evidence.get("range")
    if not isinstance(cited_range, dict):
        _reject("SOURCE_EVIDENCE_INVALID", "source evidence requires a line range")
    start = cited_range.get("start_line")
    end = cited_range.get("end_line")
    if not isinstance(start, int) or not isinstance(end, int) or start < 1 or end < start:
        _reject("SOURCE_EVIDENCE_INVALID", "source line range is invalid")
    lines = blob.splitlines(keepends=True)
    if end > len(lines):
        _reject("SOURCE_EVIDENCE_INVALID", "source line range exceeds the blob")
    range_digest = hashlib.sha256(b"".join(lines[start - 1 : end])).hexdigest()
    if range_digest != cited_range.get("sha256"):
        _reject("SOURCE_EVIDENCE_HASH_MISMATCH", "source range SHA-256 does not match")


def _contains_forbidden_claim_key(value: object) -> bool:
    """Reports whether an artifact adds a prohibited success-claim field.

    Args:
        value: JSON-compatible value to scan.

    Returns:
        Whether a prohibited claim key occurs.
    """
    if isinstance(value, dict):
        return any(
            key.lower().replace("-", "_") in FORBIDDEN_CLAIM_KEYS
            or _contains_forbidden_claim_key(nested)
            for key, nested in value.items()
        )
    if isinstance(value, list):
        return any(_contains_forbidden_claim_key(item) for item in value)
    return False


def _identity_slug(label: object) -> str:
    """Normalizes a partition label for exact catalog-slug comparison.

    Args:
        label: Accepted partition label.

    Returns:
        Hyphenated lexical identity with articles removed.
    """
    if not isinstance(label, str):
        return ""
    title = label.split(" — ", 1)[0].lower().replace("’", "'")
    title = title.replace("'", "")
    words = re.findall(r"[a-z0-9]+", title)
    return "-".join(word for word in words if word not in {"the", "of"})


def _label_matches_slug(label: object, slug: str) -> bool:
    """Matches a lexical label to a source slug, allowing possessive-s elision.

    Args:
        label: Accepted partition label.
        slug: Exact catalog or historical source slug.

    Returns:
        Whether the label and slug identify the same lexical name.
    """
    normalized = _identity_slug(label)
    variants = {normalized}
    parts = normalized.split("-")
    variants.update(
        "-".join(parts[:index] + [part[:-1]] + parts[index + 1 :])
        for index, part in enumerate(parts)
        if part.endswith("s") and len(part) > 1
    )
    return slug in variants


def _validate_crosswalk(repo_root: Path, crosswalk: dict[str, Any]) -> dict[str, object]:
    """Validates one source-grounded 27-to-29 crosswalk.

    Args:
        repo_root: Repository root directory.
        crosswalk: Candidate crosswalk document.

    Returns:
        Successful validation result.
    """
    if crosswalk.get("schema_version") != EXPECTED_SCHEMA:
        _reject("CROSSWALK_SCHEMA_INVALID", "unexpected crosswalk schema")
    if (
        crosswalk.get("status") != "candidate-complete-awaiting-independent-review"
        or crosswalk.get("consumable") is not False
        or crosswalk.get("portfolio_status") != "blocked"
    ):
        _reject("DOWNSTREAM_NOT_BLOCKED", "unaccepted Phase-1 evidence must remain blocked")
    if _contains_forbidden_claim_key(crosswalk):
        _reject("UNSUPPORTED_GAMEPLAY_CLAIM", "crosswalk contains a prohibited success-claim field")

    references = crosswalk.get("source_artifacts")
    if not isinstance(references, dict) or set(references) != set(EXPECTED_ARTIFACT_HASHES):
        _reject("SOURCE_ARTIFACT_INVALID", "crosswalk must bind exactly four T2 source artifacts")
    sources = {
        key: _load_artifact(repo_root, references[key], key)
        for key in EXPECTED_ARTIFACT_HASHES
    }
    denominator = sources["accepted_denominator"]
    partition = sources["accepted_partition"]
    ledger = sources["identity_ledger"]
    source_denominator = sources["source_denominator"]
    historical = sources["historical_source_denominator"]
    if denominator.get("denominator_counts", {}).get("identities") != 27:
        _reject("SOURCE_COUNT_MISMATCH", "accepted T2 denominator is not 27 identities")
    if any(
        source.get("status") != "accepted"
        or source.get("consumable") is not True
        or source.get("revoked") is not False
        for source in (denominator, partition)
    ):
        _reject("SOURCE_ARTIFACT_INVALID", "accepted T2 manifests are not active and consumable")
    partition_rows = partition.get("assignments")
    identity_records = ledger.get("identity_records")
    historical_records = historical.get("records")
    source_records = source_denominator.get("records")
    if not isinstance(partition_rows, list) or len(partition_rows) != 29:
        _reject("SOURCE_COUNT_MISMATCH", "accepted T2 partition is not 29 assignments")
    if not isinstance(identity_records, list) or len(identity_records) != 27:
        _reject("SOURCE_COUNT_MISMATCH", "T2 identity ledger is not 27 rows")
    if not isinstance(historical_records, list):
        _reject("SOURCE_ARTIFACT_INVALID", "T2 historical records are missing")
    if not isinstance(source_records, list):
        _reject("SOURCE_ARTIFACT_INVALID", "T2 source records are missing")
    if crosswalk.get("counts") != {
        "source_identities": 27,
        "partition_assignments": 29,
        "direct_source_identity_assignments": 27,
        "historical_label_assignments": 2,
    }:
        _reject("SOURCE_COUNT_MISMATCH", "crosswalk count declaration is stale")

    assignments = crosswalk.get("assignments")
    if not isinstance(assignments, list):
        _reject("MISSING_ASSIGNMENT", "crosswalk assignments are missing")
    indices = [row.get("assignment_index") for row in assignments if isinstance(row, dict)]
    labels = [row.get("canonical_identity_label") for row in assignments if isinstance(row, dict)]
    if len(indices) != len(assignments) or len(indices) != len(set(indices)):
        _reject("DUPLICATE_ASSIGNMENT", "assignment indices must be unique")
    if len(labels) != len(assignments) or len(labels) != len(set(labels)):
        _reject("DUPLICATE_ASSIGNMENT", "assignment labels must be unique")
    if len(assignments) != len(partition_rows) or set(indices) != set(range(29)):
        _reject("MISSING_ASSIGNMENT", "every accepted partition assignment must appear once")

    ledger_ids = {
        record.get("canonical_identity_id")
        for record in identity_records
        if isinstance(record, dict) and isinstance(record.get("canonical_identity_id"), str)
    }
    identity_source_records = {
        record.get("canonical_identity_id"): record
        for record in source_records
        if isinstance(record, dict)
        and record.get("record_type") == "identity"
        and isinstance(record.get("canonical_identity_id"), str)
    }
    if len(identity_source_records) != 17 or not set(identity_source_records).issubset(ledger_ids):
        _reject("SOURCE_COUNT_MISMATCH", "T2 current identity source records do not match the ledger")
    mapped_identity_ids: list[str] = []
    historical_labels: list[str] = []
    for row in assignments:
        if not isinstance(row, dict):
            _reject("UNEXPLAINED_ASSIGNMENT", "assignment row must be an object")
        index = row["assignment_index"]
        partition_row = partition_rows[index]
        assignment_locator = row.get("assignment_locator")
        if not isinstance(assignment_locator, dict):
            _reject("UNEXPLAINED_ASSIGNMENT", "assignment locator is missing")
        if assignment_locator.get("artifact") != "accepted_partition":
            _reject("SOURCE_LOCATOR_INVALID", "assignment must cite the accepted partition")
        if _resolve_pointer(partition, assignment_locator.get("json_pointer")) != partition_row:
            _reject("SOURCE_LOCATOR_INVALID", "assignment locator does not resolve its partition row")
        if (
            row.get("canonical_identity_label") != partition_row.get("canonical_identity_label")
            or row.get("cohort") != partition_row.get("cohort")
        ):
            _reject("MISSING_ASSIGNMENT", "crosswalk row differs from accepted partition assignment")
        explanation = row.get("explanation")
        locator = row.get("source_locator")
        classification = row.get("classification")
        if not isinstance(explanation, str) or not explanation.strip() or not isinstance(locator, dict):
            _reject("UNEXPLAINED_ASSIGNMENT", "assignment requires an explanation and source locator")

        if classification == "source_identity":
            identity_id = row.get("source_identity_id")
            if not isinstance(identity_id, str) or locator.get("artifact") != "identity_ledger":
                _reject("UNEXPLAINED_ASSIGNMENT", "source identity assignment is incomplete")
            source_record = _resolve_pointer(ledger, locator.get("json_pointer"))
            if not isinstance(source_record, dict) or source_record.get("canonical_identity_id") != identity_id:
                _reject("SOURCE_LOCATOR_INVALID", "identity locator does not resolve the declared identity")
            if identity_id not in ledger_ids:
                _reject("SOURCE_LOCATOR_INVALID", "identity does not occur in the T2 ledger")
            catalog_slug = source_record.get("catalog_identity_id")
            if not isinstance(catalog_slug, str) or catalog_slug not in explanation:
                _reject("UNEXPLAINED_ASSIGNMENT", "explanation must name the source catalog identity")
            if not _label_matches_slug(row.get("canonical_identity_label"), catalog_slug):
                _reject("SOURCE_LOCATOR_INVALID", "partition label does not match the cited catalog identity")
            _validate_evidence(repo_root, source_record.get("catalog_evidence"))
            identity_source_record = identity_source_records.get(identity_id)
            if identity_source_record is not None:
                _validate_evidence(repo_root, identity_source_record.get("evidence"))
            elif {
                state.get("source_class")
                for state in source_record.get("source_states", [])
                if isinstance(state, dict)
            } != {"catalog-withdrawn-registration"}:
                _reject("MISSING_SOURCE_IDENTITY", "ledger-only identity is not catalog-withdrawn")
            mapped_identity_ids.append(identity_id)
        elif classification == "historical_label":
            if row.get("source_identity_id") is not None:
                _reject("UNEXPLAINED_ASSIGNMENT", "historical-only label cannot claim a ledger identity")
            if locator.get("artifact") != "historical_source_denominator":
                _reject("SOURCE_LOCATOR_INVALID", "historical label must cite the historical denominator")
            matches = [
                record
                for record in historical_records
                if isinstance(record, dict)
                and record.get("classification") == locator.get("classification") == "deleted"
                and isinstance(record.get("evidence"), dict)
                and record["evidence"].get("path") == locator.get("evidence_path")
                and record["evidence"].get("blob_sha256") == locator.get("evidence_blob_sha256")
            ]
            if len(matches) != 1:
                _reject("SOURCE_LOCATOR_INVALID", "historical locator must resolve exactly one deleted record")
            source_slug = str(locator.get("evidence_path", "")).split("/")[-2]
            if source_slug in {record.get("catalog_identity_id") for record in identity_records if isinstance(record, dict)}:
                _reject("UNEXPLAINED_ASSIGNMENT", "historical-only slug unexpectedly occurs in the ledger")
            if source_slug not in explanation:
                _reject("UNEXPLAINED_ASSIGNMENT", "historical explanation must name the exact deleted slug")
            if not _label_matches_slug(row.get("canonical_identity_label"), source_slug):
                _reject("SOURCE_LOCATOR_INVALID", "partition label does not match the deleted page slug")
            _validate_evidence(repo_root, matches[0]["evidence"])
            historical_labels.append(row["canonical_identity_label"])
        else:
            _reject("UNEXPLAINED_ASSIGNMENT", "assignment classification is unsupported")

    if len(mapped_identity_ids) != len(set(mapped_identity_ids)):
        _reject("DUPLICATE_SOURCE_IDENTITY", "one source identity is assigned more than once")
    if set(mapped_identity_ids) != ledger_ids:
        _reject("MISSING_SOURCE_IDENTITY", "crosswalk does not exhaust the 27-row identity ledger")
    difference = crosswalk.get("difference")
    if (
        len(historical_labels) != 2
        or not isinstance(difference, dict)
        or difference.get("count") != 2
        or difference.get("classification") != "historical_label"
        or difference.get("assignment_labels") != historical_labels
    ):
        _reject("UNEXPLAINED_ASSIGNMENT", "the two-assignment difference is not exactly classified")
    governance = crosswalk.get("governance")
    if governance != {
        "independent_review": "pending",
        "product_owner_acceptance": "not-requested",
        "downstream_authorization": "blocked",
    }:
        _reject("DOWNSTREAM_NOT_BLOCKED", "review and owner gates must remain pending")
    return {
        "ok": True,
        "source_identity_count": len(mapped_identity_ids),
        "partition_assignment_count": len(assignments),
        "historical_label_count": len(historical_labels),
        "portfolio_status": "blocked",
    }


def validate_crosswalk(repo_root: Path, crosswalk: dict[str, Any]) -> dict[str, object]:
    """Validates a Phase-1 crosswalk and returns a stable result.

    Args:
        repo_root: Repository root directory.
        crosswalk: Candidate crosswalk document.

    Returns:
        Success details or a stable rejection code and detail.
    """
    try:
        return _validate_crosswalk(repo_root, crosswalk)
    except _ValidationFailure as failure:
        return {"ok": False, "code": failure.code, "detail": failure.detail}


def validate_review_candidate(
    repo_root: Path,
    crosswalk: dict[str, Any],
    review_candidate: dict[str, Any],
) -> dict[str, object]:
    """Validates that a review handoff is source-pinned but not self-accepted.

    Args:
        repo_root: Repository root directory.
        crosswalk: Candidate crosswalk document.
        review_candidate: Coordinator-authored independent-review handoff.

    Returns:
        Success state confirming independent acceptance is still absent.
    """
    try:
        if review_candidate.get("schema_version") != EXPECTED_REVIEW_SCHEMA:
            _reject("REVIEW_CANDIDATE_INVALID", "unexpected review-candidate schema")
        crosswalk_path = repo_root / review_candidate.get("candidate_crosswalk", {}).get("path", "")
        if not crosswalk_path.is_file():
            _reject("REVIEW_CANDIDATE_INVALID", "review candidate crosswalk is missing")
        expected_hash = hashlib.sha256(crosswalk_path.read_bytes()).hexdigest()
        if review_candidate.get("candidate_crosswalk", {}).get("sha256") != expected_hash:
            _reject("REVIEW_CANDIDATE_INVALID", "review candidate crosswalk hash is stale")
        if json.loads(crosswalk_path.read_text(encoding="utf-8")) != crosswalk:
            _reject("REVIEW_CANDIDATE_INVALID", "review candidate binds different crosswalk bytes")
        if (
            review_candidate.get("status") != "awaiting-independent-review"
            or review_candidate.get("disposition") != "not-reviewed"
            or review_candidate.get("independent_acceptance") is not False
            or review_candidate.get("reviewer") is not None
            or review_candidate.get("product_owner_acceptance") != "not-requested"
            or review_candidate.get("downstream_authorization") != "blocked"
        ):
            _reject("FALSE_INDEPENDENT_ACCEPTANCE", "candidate handoff cannot claim review or acceptance")
        fresh_review = review_candidate.get("fresh_source_review")
        if not isinstance(fresh_review, dict) or fresh_review.get("inherited_narrative_allowed") is not False:
            _reject("REVIEW_CANDIDATE_INVALID", "fresh-source isolation must reject inherited narrative")
        input_refs = fresh_review.get("allowed_inputs")
        if not isinstance(input_refs, list) or len(input_refs) != 6:
            _reject("REVIEW_CANDIDATE_INVALID", "fresh-source review requires five T2 sources and the candidate")
        expected_refs = {
            (reference["path"], reference["sha256"])
            for reference in crosswalk["source_artifacts"].values()
        } | {(str(crosswalk_path.relative_to(repo_root)), expected_hash)}
        actual_refs = {
            (reference.get("path"), reference.get("sha256"))
            for reference in input_refs
            if isinstance(reference, dict)
        }
        if actual_refs != expected_refs:
            _reject("REVIEW_CANDIDATE_INVALID", "fresh-source input set is not exact")
        return {"ok": True, "independent_acceptance": False}
    except _ValidationFailure as failure:
        return {"ok": False, "code": failure.code, "detail": failure.detail}
