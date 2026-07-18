"""Versioned logical-input accounting for production T2 role receipts."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path, PurePosixPath
from typing import Any, Mapping, Sequence


ACCOUNTING_SCHEMA = "apk-logical-input-accounting.v1"
SHA256 = re.compile(r"[0-9a-f]{64}\Z")
COMMIT_SHA = re.compile(r"[0-9a-f]{40}\Z")


class T2RoleAccountingError(RuntimeError):
    """Raised when frozen logical-input usage cannot be proven exactly."""


def _sha256(value: bytes) -> str:
    """Returns a lowercase SHA-256 digest."""
    return hashlib.sha256(value).hexdigest()


def _safe_path(value: object) -> str:
    """Returns one normalized repository-relative path or fails closed."""
    if not isinstance(value, str) or not value:
        raise T2RoleAccountingError("logical input path is absent")
    candidate = PurePosixPath(value)
    if candidate.is_absolute() or ".." in candidate.parts or str(candidate) != value:
        raise T2RoleAccountingError(f"logical input path is unsafe: {value}")
    return value


def _git_blob(root: Path, revision: object, path: object) -> bytes:
    """Loads exact committed bytes for one validated Git reference."""
    if not isinstance(revision, str) or COMMIT_SHA.fullmatch(revision) is None:
        raise T2RoleAccountingError("logical input revision is not a full commit SHA")
    relative = _safe_path(path)
    result = subprocess.run(
        ("git", "show", f"{revision}:{relative}"),
        cwd=root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        raise T2RoleAccountingError(f"logical input is absent: {revision}:{relative}")
    return result.stdout


def _json_blob(root: Path, revision: str, path: str) -> tuple[bytes, Mapping[str, Any]]:
    """Loads one committed JSON object without consulting worktree bytes."""
    raw = _git_blob(root, revision, path)
    try:
        value = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise T2RoleAccountingError(f"logical input JSON is malformed: {path}") from error
    if not isinstance(value, Mapping):
        raise T2RoleAccountingError(f"logical input JSON is not an object: {path}")
    return raw, value


def _pointer(value: object, pointer: object) -> object:
    """Resolves one RFC-6901-style pointer used by the frozen accounting schema."""
    if not isinstance(pointer, str) or not pointer.startswith("/"):
        raise T2RoleAccountingError("accounting JSON pointer is invalid")
    current = value
    for encoded in pointer[1:].split("/"):
        token = encoded.replace("~1", "/").replace("~0", "~")
        if isinstance(current, Mapping) and token in current:
            current = current[token]
        elif isinstance(current, list) and token.isdigit() and int(token) < len(current):
            current = current[int(token)]
        else:
            raise T2RoleAccountingError(f"accounting JSON pointer is missing: {pointer}")
    return current


def _tool_parts(raw_export: bytes) -> list[Mapping[str, Any]]:
    """Returns every provider tool part from exact raw export bytes."""
    try:
        document = json.loads(raw_export)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise T2RoleAccountingError("raw provider export is malformed") from error
    if not isinstance(document, Mapping) or not isinstance(document.get("messages"), list):
        raise T2RoleAccountingError("raw provider export messages are absent")
    parts: list[Mapping[str, Any]] = []
    for message in document["messages"]:
        if not isinstance(message, Mapping) or not isinstance(message.get("parts"), list):
            raise T2RoleAccountingError("raw provider export contains malformed parts")
        for part in message["parts"]:
            if not isinstance(part, Mapping):
                raise T2RoleAccountingError("raw provider export contains a non-object part")
            if part.get("type") == "tool":
                parts.append(part)
    return parts


def _provider_usage(
    raw_export: bytes, generator_commands: Sequence[str]
) -> tuple[int, int]:
    """Counts provider tool invocations and non-generator result bytes."""
    generators = set(generator_commands)
    parts = _tool_parts(raw_export)
    result_bytes = 0
    for part in parts:
        state = part.get("state")
        if not isinstance(state, Mapping):
            continue
        tool_input = state.get("input")
        if (
            part.get("tool") == "bash"
            and state.get("status") == "completed"
            and isinstance(tool_input, Mapping)
            and tool_input.get("command") in generators
        ):
            continue
        for field in ("output", "error"):
            text = state.get(field)
            if isinstance(text, str):
                result_bytes += len(text.encode())
    return len(parts), result_bytes


def _add_reference(
    root: Path,
    references: dict[tuple[str, str], tuple[str, int]],
    revision: object,
    path: object,
    expected_hash: object,
) -> None:
    """Adds one unique exact blob reference after resolving its committed hash."""
    if not isinstance(expected_hash, str) or SHA256.fullmatch(expected_hash) is None:
        raise T2RoleAccountingError("logical input hash is not a SHA-256 digest")
    relative = _safe_path(path)
    if not isinstance(revision, str) or COMMIT_SHA.fullmatch(revision) is None:
        raise T2RoleAccountingError("logical input revision is not a full commit SHA")
    raw = _git_blob(root, revision, relative)
    actual = _sha256(raw)
    if actual != expected_hash:
        raise T2RoleAccountingError(
            f"logical input hash mismatch: {revision}:{relative}"
        )
    key = (revision, relative)
    prior = references.get(key)
    candidate = (actual, len(raw))
    if prior is not None and prior != candidate:
        raise T2RoleAccountingError(f"logical input reference collision: {relative}")
    references[key] = candidate


def _add_locator(
    root: Path,
    references: dict[tuple[str, str], tuple[str, int]],
    locator: object,
) -> None:
    """Adds a standard revision/path/blob_sha256 locator."""
    if not isinstance(locator, Mapping):
        raise T2RoleAccountingError("logical input locator is malformed")
    _add_reference(
        root,
        references,
        locator.get("revision"),
        locator.get("path"),
        locator.get("blob_sha256"),
    )


def _source_record_references(
    root: Path,
    revision: str,
    formula: Mapping[str, Any],
    references: dict[tuple[str, str], tuple[str, int]],
    required_baseline: str | None = None,
) -> None:
    """Loads source file records and adds their exact evidence locators."""
    _, artifact = _json_blob(root, revision, _safe_path(formula.get("artifact_path")))
    records = _pointer(artifact, formula.get("collection_pointer"))
    if not isinstance(records, list) or not records:
        raise T2RoleAccountingError("source record collection is missing or empty")
    for record in records:
        if not isinstance(record, Mapping):
            raise T2RoleAccountingError("source record is malformed")
        if record.get("record_type") != formula.get("required_record_type"):
            continue
        locator = _pointer(record, formula.get("locator_pointer"))
        if not isinstance(locator, Mapping):
            raise T2RoleAccountingError("source record locator is malformed")
        if record.get(formula.get("path_field")) != locator.get("path"):
            raise T2RoleAccountingError("source record path differs from its locator")
        if required_baseline is not None and locator.get("revision") != required_baseline:
            raise T2RoleAccountingError("source record is not bound to the frozen baseline")
        _add_locator(root, references, locator)


def _discovery_usage(
    root: Path, freeze: Mapping[str, Any], output_commit: str, formula: Mapping[str, Any]
) -> tuple[int, int]:
    """Derives unique frozen-baseline source record inputs."""
    baseline_field = formula.get("required_revision_field")
    baseline = freeze.get(baseline_field) if isinstance(baseline_field, str) else None
    if not isinstance(baseline, str) or COMMIT_SHA.fullmatch(baseline) is None:
        raise T2RoleAccountingError("frozen accounting baseline is invalid")
    references: dict[tuple[str, str], tuple[str, int]] = {}
    _source_record_references(root, output_commit, formula, references, baseline)
    return len(references), sum(value[1] for value in references.values())


def _evidence_usage(
    root: Path,
    output_commit: str,
    formula: Mapping[str, Any],
    commit_binding: Mapping[str, Any] | None,
) -> tuple[int, int]:
    """Derives the union of Phase-1 source, asset, history, and artifact blobs."""
    if not isinstance(commit_binding, Mapping):
        raise T2RoleAccountingError("evidence commit binding is required")
    phase1_field = formula.get("phase1_commit_binding_field")
    phase2_field = formula.get("phase2_commit_binding_field")
    phase1 = commit_binding.get(phase1_field) if isinstance(phase1_field, str) else None
    phase2 = commit_binding.get(phase2_field) if isinstance(phase2_field, str) else None
    if (
        not isinstance(phase1, str)
        or COMMIT_SHA.fullmatch(phase1) is None
        or phase2 != output_commit
    ):
        raise T2RoleAccountingError("evidence commit binding is invalid")
    ancestor = subprocess.run(
        ("git", "merge-base", "--is-ancestor", phase1, output_commit),
        cwd=root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if ancestor.returncode != 0:
        raise T2RoleAccountingError("evidence Phase-1 commit is not an output ancestor")
    artifact_paths = formula.get("phase1_artifact_paths")
    if not isinstance(artifact_paths, list) or not artifact_paths:
        raise T2RoleAccountingError("evidence Phase-1 artifact formula is absent")
    references: dict[tuple[str, str], tuple[str, int]] = {}
    for path in artifact_paths:
        relative = _safe_path(path)
        raw = _git_blob(root, phase1, relative)
        _add_reference(root, references, phase1, relative, _sha256(raw))
    source_formula = formula.get("source_records")
    asset_formula = formula.get("asset_records")
    historical_formula = formula.get("historical_records")
    if not all(isinstance(value, Mapping) for value in (
        source_formula, asset_formula, historical_formula
    )):
        raise T2RoleAccountingError("evidence record formulas are incomplete")
    _source_record_references(root, phase1, source_formula, references)
    _, assets = _json_blob(root, phase1, _safe_path(asset_formula.get("artifact_path")))
    asset_records = _pointer(assets, asset_formula.get("collection_pointer"))
    if not isinstance(asset_records, list) or not asset_records:
        raise T2RoleAccountingError("asset record collection is missing or empty")
    for record in asset_records:
        if not isinstance(record, Mapping):
            raise T2RoleAccountingError("asset record is malformed")
        _add_reference(
            root,
            references,
            record.get(asset_formula.get("revision_field")),
            record.get(asset_formula.get("path_field")),
            record.get(asset_formula.get("sha256_field")),
        )
    _, history = _json_blob(root, phase1, _safe_path(historical_formula.get("artifact_path")))
    history_records = _pointer(history, historical_formula.get("collection_pointer"))
    if not isinstance(history_records, list) or not history_records:
        raise T2RoleAccountingError("historical locator collection is missing or empty")
    for record in history_records:
        if not isinstance(record, Mapping):
            raise T2RoleAccountingError("historical record is malformed")
        _add_locator(root, references, _pointer(record, historical_formula.get("locator_pointer")))
    return len(references), sum(value[1] for value in references.values())


def _mapper_usage(
    root: Path, output_commit: str, formula: Mapping[str, Any]
) -> tuple[int, int]:
    """Derives exact predecessor artifact bytes and frozen claim record counts."""
    _, phase3 = _json_blob(root, output_commit, _safe_path(formula.get("phase3_artifact_path")))
    references: dict[tuple[str, str], tuple[str, int]] = {}
    for revision_pointer, hashes_pointer in (
        (formula.get("phase1_revision_pointer"), formula.get("phase1_hashes_pointer")),
        (formula.get("phase2_revision_pointer"), formula.get("phase2_hashes_pointer")),
    ):
        revision = _pointer(phase3, revision_pointer)
        hashes = _pointer(phase3, hashes_pointer)
        if not isinstance(hashes, Mapping) or not hashes:
            raise T2RoleAccountingError("mapper predecessor hash inventory is absent")
        for path, digest in hashes.items():
            _add_reference(root, references, revision, path, digest)
    claim_formulas = formula.get("claim_record_pointers")
    if not isinstance(claim_formulas, Mapping) or not claim_formulas:
        raise T2RoleAccountingError("mapper claim pointer inventory is absent")
    claims = 0
    for path, pointers in claim_formulas.items():
        _, artifact = _json_blob(root, output_commit, _safe_path(path))
        if not isinstance(pointers, list) or not pointers:
            raise T2RoleAccountingError("mapper claim pointers are malformed")
        for pointer in pointers:
            records = _pointer(artifact, pointer)
            if not isinstance(records, list) or any(not isinstance(row, Mapping) for row in records):
                raise T2RoleAccountingError(f"mapper claim collection is malformed: {pointer}")
            claims += len(records)
    return claims, sum(value[1] for value in references.values())


def _truth_usage(
    root: Path, output_commit: str, formula: Mapping[str, Any]
) -> int:
    """Derives test cases exclusively from a structured committed report."""
    _, report = _json_blob(root, output_commit, _safe_path(formula.get("report_path")))
    admission = _pointer(report, formula.get("admission_pointer"))
    inventory = _pointer(report, formula.get("inventory_pointer"))
    if not isinstance(admission, Mapping) or not isinstance(inventory, list) or not inventory:
        raise T2RoleAccountingError("structured committed test report is incomplete")
    count_field = formula.get("test_count_field")
    passed_field = formula.get("passed_field")
    failed_field = formula.get("failed_field")
    exit_field = formula.get("exit_code_field")
    total = 0
    for row in inventory:
        if not isinstance(row, Mapping):
            raise T2RoleAccountingError("structured test inventory row is malformed")
        tests = row.get(count_field)
        passed = row.get(passed_field)
        failed = row.get(failed_field)
        exit_code = row.get(exit_field)
        if (
            not isinstance(tests, int) or isinstance(tests, bool) or tests < 0
            or passed != tests or failed != 0 or exit_code != 0
        ):
            raise T2RoleAccountingError("structured test inventory is not fully passing")
        total += tests
    if (
        admission.get("total_tests") != total
        or admission.get("passed") != total
        or admission.get("failed") != 0
        or admission.get("exit_code") != 0
        or admission.get("status") != "passed"
    ):
        raise T2RoleAccountingError("structured test admission summary is inconsistent")
    return total


def _reviewer_usage(
    root: Path, output_commit: str, formula: Mapping[str, Any]
) -> tuple[int, int]:
    """Derives reviewer usage from an exact committed reviewed-input ledger."""
    _, review = _json_blob(root, output_commit, _safe_path(formula.get("review_path")))
    ledger = _pointer(review, formula.get("ledger_pointer"))
    required_paths = formula.get("required_artifact_paths")
    if not isinstance(ledger, list) or not ledger or not isinstance(required_paths, list):
        raise T2RoleAccountingError("reviewed input ledger is missing or malformed")
    references: dict[tuple[str, str], tuple[str, int]] = {}
    paths: list[str] = []
    for entry in ledger:
        if not isinstance(entry, Mapping) or set(entry) != {"revision", "path", "sha256"}:
            raise T2RoleAccountingError("reviewed input ledger entry is malformed")
        path = _safe_path(entry.get("path"))
        paths.append(path)
        _add_reference(root, references, entry.get("revision"), path, entry.get("sha256"))
    if len(paths) != len(set(paths)) or set(paths) != set(required_paths):
        raise T2RoleAccountingError("reviewed input ledger path set is incomplete")
    return len(references), sum(value[1] for value in references.values())


def derive_t2_actual_usage(
    *,
    repository_root: Path,
    freeze: Mapping[str, Any],
    role: str,
    output_commit: str,
    raw_export: bytes,
    generator_commands: Sequence[str] = (),
    commit_binding: Mapping[str, Any] | None = None,
) -> dict[str, int]:
    """Derives one role's usage from frozen formulas and exact committed inputs.

    Args:
        repository_root: Git repository containing immutable role artifacts.
        freeze: Trusted committed Phase-0 input-freeze mapping.
        role: Frozen T2 role whose usage is being derived.
        output_commit: Full commit containing the role's final owned outputs.
        raw_export: Exact retained provider export bytes.
        generator_commands: Exact Bash generator commands whose result text is excluded.
        commit_binding: Exact Phase-1/Phase-2 handoff commits for evidence collection.

    Returns:
        Exact integer usage mapping with the frozen role-specific key set.

    Raises:
        T2RoleAccountingError: If authority, provenance, hashes, or ceilings fail.
    """
    root = repository_root.resolve(strict=True)
    if COMMIT_SHA.fullmatch(output_commit) is None:
        raise T2RoleAccountingError("output commit is not a full SHA")
    accounting = freeze.get("resource_accounting")
    ceilings = freeze.get("frozen_resource_ceilings")
    if (
        not isinstance(accounting, Mapping)
        or accounting.get("schema_version") != ACCOUNTING_SCHEMA
        or not isinstance(accounting.get("roles"), Mapping)
        or not isinstance(ceilings, Mapping)
        or not isinstance(ceilings.get(role), Mapping)
    ):
        raise T2RoleAccountingError("frozen logical-input accounting authority is invalid")
    formula = accounting["roles"].get(role)
    if not isinstance(formula, Mapping):
        raise T2RoleAccountingError(f"frozen role accounting formula is absent: {role}")
    command_invocations, provider_bytes = _provider_usage(raw_export, generator_commands)
    usage: dict[str, int] = {
        "bytes_read": provider_bytes,
        "command_invocations": command_invocations,
    }
    kind = formula.get("formula")
    if kind == "unique-baseline-source-record-blobs":
        source_files, logical_bytes = _discovery_usage(root, freeze, output_commit, formula)
        usage.update(source_files=source_files, bytes_read=provider_bytes + logical_bytes)
    elif kind == "phase1-source-assets-history-and-artifact-union":
        source_files, logical_bytes = _evidence_usage(
            root, output_commit, formula, commit_binding
        )
        usage.update(source_files=source_files, bytes_read=provider_bytes + logical_bytes)
    elif kind == "phase3-exact-predecessor-artifacts-and-frozen-claim-pointers":
        claims, logical_bytes = _mapper_usage(root, output_commit, formula)
        usage.update(claim_records=claims, bytes_read=provider_bytes + logical_bytes)
    elif kind == "structured-committed-test-report-only":
        usage["test_cases"] = _truth_usage(root, output_commit, formula)
    elif kind == "exact-reviewed-input-artifact-ledger":
        source_files, logical_bytes = _reviewer_usage(root, output_commit, formula)
        usage.update(source_files=source_files, bytes_read=provider_bytes + logical_bytes)
    else:
        raise T2RoleAccountingError(f"unsupported frozen accounting formula: {kind}")
    ceiling = ceilings[role]
    if set(usage) != set(ceiling):
        raise T2RoleAccountingError("derived usage keys differ from the frozen ceiling")
    for field, limit in ceiling.items():
        value = usage[field]
        if (
            not isinstance(limit, int)
            or isinstance(limit, bool)
            or limit < 0
            or value > limit
        ):
            raise T2RoleAccountingError(f"derived usage exceeds frozen ceiling: {field}")
    return usage
