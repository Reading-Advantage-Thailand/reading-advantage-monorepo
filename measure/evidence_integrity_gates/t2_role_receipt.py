"""Fail-closed production renderer for T2 OpenCode role receipts."""

from __future__ import annotations

import hashlib
import json
import os
import re
import shlex
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from string import Formatter
from typing import Any, Mapping, Sequence

from .apk_inventory_live import (
    APKInventoryLiveError,
    canonical_task_prompt,
    normalize_resolved_event,
)
from .opencode_provenance import (
    OpenCodeExportAdapter,
    ProvenanceError,
    ReadOnlyShellBinding,
    RoleBinding,
    ShellGeneratorBinding,
    build_resolved_event,
)
from .t2_role_accounting import (
    T2RoleAccountingError,
    derive_t2_actual_usage,
)


TRACK_DIRECTORY = "measure/tracks/apk_source_denominator_inventory_20260712"
T2_INPUT_FREEZE_PATH = f"{TRACK_DIRECTORY}/phase0-input-freeze.json"
T2_OWNERSHIP_MANIFEST_PATH = f"{TRACK_DIRECTORY}/phase0-role-ownership-manifest.json"
# Bind this to the full SHA of the final Phase-0 authority commit in the
# immediately following commit. The unbound bootstrap state fails closed.
T2_PHASE0_AUTHORITY_COMMIT: str | None = "107fd1a4803093de2f62922bcd40daa6952adbfa"
ROLE_PHASES = {
    "discovery-auditor": "Phase 1: Mechanical discovery",
    "evidence-collector": "Phase 2: Independent human discovery",
    "requirements-mapper": "Phase 3: Reconciliation",
    "truth-test-author": "Phase 3: Contract validation",
    "adversarial-reviewer": "Phase 4: Full independent acceptance",
}
_SAFE_PROVIDER_TOOLS = {
    "apply_patch",
    "bash",
    "edit",
    "glob",
    "grep",
    "read",
    "todoread",
    "todowrite",
    "webfetch",
    "write",
}
_COMMIT_SHA = re.compile(r"[0-9a-f]{40}\Z")
_COMMIT_RESULT_LINE = re.compile(r"^\[[^]\n]+ ([0-9a-f]{7,40})\] (.+)$")
_EXECUTION_CONTRACT_KEYS = {
    "schema_version",
    "allowed_provider_tools",
    "direct_write_only",
    "direct_write_outputs",
    "ordered_operations",
    "read_only_shell_commands",
    "shell_generators",
}
_GENERATOR_KEYS = {"command_template", "dependency_blobs", "owned_outputs", "commit"}
_DEPENDENCY_KEYS = {"path", "revision", "sha256"}
_COMMIT_KEYS = {"mode", "subject", "immediate_adjacency", "attestation_commit_source"}
_READ_ONLY_KEYS = {"command", "expected_stdout_source"}
_TRUSTED_RUNTIME_KEYS = {"schema_version", "sanitized_environment", "executables"}
_TRUSTED_EXECUTABLE_KEYS = {"entry_path", "resolved_path", "sha256"}
_EXPECTED_RUNTIME_ENVIRONMENT = {
    "PATH": "/opt/codex-desktop/resources/node-runtime/bin:/usr/bin:/bin",
    "LANG": "C",
    "PYTHONDONTWRITEBYTECODE": "1",
}
_EXPECTED_RUNTIME_ENTRIES = {
    "/usr/bin/env",
    "/usr/bin/python3",
    "/usr/bin/git",
    "/opt/codex-desktop/resources/node-runtime/bin/node",
}


class T2RoleReceiptError(RuntimeError):
    """Raised when a production T2 receipt cannot be truthfully rendered."""


@dataclass(frozen=True)
class _FrozenGenerator:
    """Carries one authority-derived generator plus its exact commit contract."""

    binding: ShellGeneratorBinding
    mode: str
    subject: str
    attestation_commit: str


@dataclass(frozen=True)
class _FrozenReadOnly:
    """Carries one authority-derived read-only command and its exact stdout."""

    binding: ReadOnlyShellBinding
    expected_stdout: str


def _canonical_json(value: object) -> bytes:
    """Serializes a JSON value with the production canonical encoding."""
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode()


def _sha256(value: bytes) -> str:
    """Returns the lowercase SHA-256 digest of exact bytes."""
    return hashlib.sha256(value).hexdigest()


def export_t2_raw_session(
    session_id: str,
    raw_export_path: Path,
    adapter: OpenCodeExportAdapter | None = None,
) -> bytes:
    """Exports one session to the exact immutable raw path used by the renderer.

    Args:
        session_id: Exact OpenCode session identifier.
        raw_export_path: Immutable destination for raw provider bytes.
        adapter: Optional controlled adapter override.
    Returns:
        Exact provider export bytes.
    Raises:
        ProvenanceError: If the provider export fails validation.
    """
    return (adapter or OpenCodeExportAdapter()).export(session_id, raw_export_path)


def _verified_live_export(
    session_id: str,
    retained_path: Path,
    adapter: OpenCodeExportAdapter | None,
) -> bytes:
    """Requires a fresh immutable provider export to equal retained bytes exactly."""
    retained = retained_path.read_bytes()
    with tempfile.TemporaryDirectory(prefix="measure-t2-live-export-") as directory:
        live_path = Path(directory) / f"{session_id}.json"
        live = (adapter or OpenCodeExportAdapter()).export(session_id, live_path)
        if not isinstance(live, bytes) or not live_path.is_file() or live_path.is_symlink():
            raise T2RoleReceiptError("live provider export did not produce an exact regular file")
        live_path.chmod(0o444)
        live_file_bytes = live_path.read_bytes()
        if live_path.stat().st_mode & 0o222:
            raise T2RoleReceiptError("live provider export is not immutable")
        if live != live_file_bytes or live_file_bytes != retained:
            raise T2RoleReceiptError("live provider export differs from retained raw bytes")
    return retained


def _provider_document(raw: bytes) -> Mapping[str, Any]:
    """Parses exact raw bytes without adding or normalizing provider messages."""
    value = json.loads(raw)
    if not isinstance(value, Mapping):
        raise T2RoleReceiptError("raw export root must be an object")
    return value


def _tool_parts(raw: bytes) -> list[Mapping[str, Any]]:
    """Returns all provider tool parts and rejects unknown completed tool families."""
    messages = _provider_document(raw).get("messages")
    if not isinstance(messages, list):
        raise T2RoleReceiptError("raw export messages are absent")
    parts: list[Mapping[str, Any]] = []
    for message in messages:
        if not isinstance(message, Mapping) or not isinstance(message.get("parts"), list):
            raise T2RoleReceiptError("raw export contains malformed provider parts")
        for part in message["parts"]:
            if not isinstance(part, Mapping) or part.get("type") != "tool":
                continue
            state = part.get("state")
            tool = part.get("tool")
            if (
                isinstance(state, Mapping)
                and state.get("status") == "completed"
                and tool not in _SAFE_PROVIDER_TOOLS
            ):
                raise T2RoleReceiptError(f"completed provider tool is not classified: {tool}")
            parts.append(part)
    return parts


def _committed_bytes(root: Path, commit: str, path: str) -> bytes:
    """Returns exact bytes for an owned output at its immutable commit."""
    result = subprocess.run(
        ("git", "show", f"{commit}:{path}"),
        cwd=root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        raise T2RoleReceiptError(f"owned output is absent at {commit}: {path}")
    return result.stdout


def _normalize_tool_path(root: Path, value: object) -> str | None:
    """Normalizes a provider path to a repository-relative spelling when possible."""
    if not isinstance(value, str) or not value:
        return None
    candidate = Path(value)
    if candidate.is_absolute():
        try:
            return candidate.resolve().relative_to(root).as_posix()
        except ValueError:
            return None
    return candidate.as_posix()


def _validate_direct_write_content(
    raw: bytes,
    root: Path,
    commit: str,
    outputs: Sequence[str],
    generators: Sequence[ShellGeneratorBinding],
) -> None:
    """Proves non-generator output blobs equal exact session-authored write content."""
    generated = {path for binding in generators for path in binding.owned_outputs}
    parts = _tool_parts(raw)
    for output in outputs:
        if output in generated:
            continue
        writes: list[bytes] = []
        unsafe_mutation = False
        for part in parts:
            state = part.get("state")
            if not isinstance(state, Mapping) or state.get("status") != "completed":
                continue
            tool_input = state.get("input")
            if not isinstance(tool_input, Mapping):
                continue
            if part.get("tool") in {"write", "edit"}:
                path = _normalize_tool_path(root, tool_input.get("filePath"))
                if path != output:
                    continue
                if part.get("tool") == "write" and isinstance(tool_input.get("content"), str):
                    writes.append(tool_input["content"].encode())
                else:
                    unsafe_mutation = True
            elif part.get("tool") == "apply_patch":
                patch_text = tool_input.get("patchText")
                if isinstance(patch_text, str) and output in patch_text:
                    unsafe_mutation = True
        if unsafe_mutation or len(writes) != 1 or writes[0] != _committed_bytes(root, commit, output):
            raise T2RoleReceiptError(
                f"session-authored content does not prove committed bytes for {output}"
            )


def _context_manifest_bytes(provider_event: Mapping[str, Any]) -> bytes:
    """Builds the exact v2 context manifest later recomputed by normalization."""
    raw = provider_event.get("raw_export_bytes")
    if not isinstance(raw, bytes):
        raise T2RoleReceiptError("provider event omits raw export bytes")
    document = _provider_document(raw)
    info = document.get("info")
    messages = document.get("messages")
    if not isinstance(info, Mapping) or not isinstance(messages, list):
        raise T2RoleReceiptError("raw provider export is malformed")
    session_time = info.get("time")
    if not isinstance(session_time, Mapping):
        raise T2RoleReceiptError("provider session timestamps are absent")
    parts = [part for message in messages for part in message.get("parts", [])]
    users = [message for message in messages if message.get("info", {}).get("role") == "user"]
    assistants = [
        message for message in messages if message.get("info", {}).get("role") == "assistant"
    ]
    manifest: dict[str, Any] = {
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
        manifest["fork_turns"] = provider_event["fork_turns"]
    else:
        manifest["schema_omissions"] = provider_event.get("schema_omissions")
    return _canonical_json(manifest)


def _validated_stop_loss(
    observations: Mapping[str, Any], freeze: Mapping[str, Any]
) -> dict[str, Any]:
    """Validates exact stop-loss keys and numeric thresholds from Phase 0."""
    stop_loss = freeze.get("stop_loss")
    expected = {
        "unsupported_factual_claims",
        "denominator_mismatches",
        "failed_fix_review_cycles",
        "unresolved_blocking_findings",
    }
    if not isinstance(stop_loss, Mapping) or set(observations) != expected:
        raise T2RoleReceiptError("stop-loss observations differ from frozen contract")
    limits = {
        "unsupported_factual_claims": stop_loss.get("unsupported_factual_claims_before_stop"),
        "denominator_mismatches": stop_loss.get("denominator_mismatches_before_stop"),
        "failed_fix_review_cycles": stop_loss.get("failed_fix_review_cycles_before_block"),
    }
    for field, limit in limits.items():
        value = observations.get(field)
        if (
            not isinstance(value, int)
            or isinstance(value, bool)
            or value < 0
            or not isinstance(limit, int)
            or isinstance(limit, bool)
            or limit < 1
            or value >= limit
        ):
            raise T2RoleReceiptError(f"stop-loss threshold reached or invalid: {field}")
    severities = stop_loss.get("unresolved_blocking_severities")
    unresolved = observations.get("unresolved_blocking_findings")
    if (
        not isinstance(severities, list)
        or not isinstance(unresolved, Mapping)
        or set(unresolved) != set(severities)
        or any(
            not isinstance(value, int) or isinstance(value, bool) or value != 0
            for value in unresolved.values()
        )
    ):
        raise T2RoleReceiptError("unresolved blocking findings breach frozen stop-loss")
    return json.loads(_canonical_json(observations))


def _validated_commit_binding(
    root: Path,
    role: str,
    output_commit: str,
    binding: Mapping[str, Any] | None,
) -> dict[str, Any] | None:
    """Validates optional phase handoff commits against the receipt output commit."""
    if binding is None:
        if role in {"evidence-collector", "requirements-mapper"}:
            raise T2RoleReceiptError(f"{role} requires an immutable commit binding")
        return None
    if not isinstance(binding, Mapping) or not binding:
        raise T2RoleReceiptError("commit binding must be a nonempty object")
    commit_fields = {
        key: value
        for key, value in binding.items()
        if key == "commit" or key == "output_commit" or key.endswith("_commit")
    }
    if not commit_fields:
        raise T2RoleReceiptError("commit binding has no immutable commit fields")
    for field, commit in commit_fields.items():
        if not isinstance(commit, str) or _COMMIT_SHA.fullmatch(commit) is None:
            raise T2RoleReceiptError(f"commit binding field is not a full SHA: {field}")
        result = subprocess.run(
            ("git", "merge-base", "--is-ancestor", commit, output_commit),
            cwd=root,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        if result.returncode != 0:
            raise T2RoleReceiptError(f"commit binding is not an output ancestor: {field}")
    if role == "evidence-collector":
        required = {"phase1_attestation_commit", "phase2_attestation_commit"}
        allowed = required | {"status"}
        if not required.issubset(binding) or not set(binding).issubset(allowed):
            raise T2RoleReceiptError("evidence commit binding lacks Phase-1 or Phase-2 attestation")
        if set(commit_fields) != required:
            raise T2RoleReceiptError("evidence commit binding contains unexpected commit fields")
        if binding.get("status", "committed-output-binding") != "committed-output-binding":
            raise T2RoleReceiptError("evidence commit binding status is invalid")
        if commit_fields["phase2_attestation_commit"] != output_commit:
            raise T2RoleReceiptError("Phase-2 attestation must equal the receipt commit")
    if role == "requirements-mapper":
        required = {"mapper_phase1_attestation_commit", "phase2_receipt_commit"}
        if set(binding) != required or set(commit_fields) != required:
            raise T2RoleReceiptError(
                "mapper commit binding lacks Phase-1 attestation or Phase-2 receipt"
            )
        phase3_path = f"{TRACK_DIRECTORY}/phase3-reconciliation.json"
        try:
            phase3 = json.loads(_committed_bytes(root, output_commit, phase3_path))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise T2RoleReceiptError("mapper Phase-3 output is malformed") from error
        phase2 = (
            phase3.get("input_provenance", {}).get("phase2")
            if isinstance(phase3, Mapping)
            else None
        )
        if (
            not isinstance(phase2, Mapping)
            or phase2.get("receipt_revision") != commit_fields["phase2_receipt_commit"]
        ):
            raise T2RoleReceiptError(
                "mapper Phase-2 receipt binding differs from committed Phase-3 provenance"
            )
        evidence_receipt_path = (
            f"{TRACK_DIRECTORY}/role-receipts/evidence-collector.json"
        )
        latest_receipt = subprocess.run(
            (
                "/usr/bin/git",
                "log",
                "-1",
                "--format=%H",
                output_commit,
                "--",
                evidence_receipt_path,
            ),
            cwd=root,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            text=True,
        )
        if (
            latest_receipt.returncode != 0
            or latest_receipt.stdout.strip()
            != commit_fields["phase2_receipt_commit"]
        ):
            raise T2RoleReceiptError(
                "mapper Phase-2 receipt binding is not the latest committed evidence receipt"
            )
    return json.loads(_canonical_json(binding))


def _trusted_authority(
    root: Path,
    phase0_commit: str,
    input_freeze_path: str,
    ownership_manifest_path: str,
    role: str,
    output_commit: str,
) -> tuple[bytes, Mapping[str, Any], Mapping[str, Any], Mapping[str, Any]]:
    """Loads the exact freeze and sole role task from a committed Phase-0 authority."""
    for path in (input_freeze_path, ownership_manifest_path):
        candidate = Path(path)
        if candidate.is_absolute() or candidate.as_posix() != path or ".." in candidate.parts:
            raise T2RoleReceiptError("trusted authority path is not repository-relative")
    if _COMMIT_SHA.fullmatch(phase0_commit) is None:
        raise T2RoleReceiptError("trusted Phase-0 commit is not a full SHA")
    ancestor = subprocess.run(
        ("git", "merge-base", "--is-ancestor", phase0_commit, output_commit),
        cwd=root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if ancestor.returncode != 0:
        raise T2RoleReceiptError("trusted Phase-0 commit is not an output ancestor")
    freeze_bytes = _committed_bytes(root, phase0_commit, input_freeze_path)
    ownership_bytes = _committed_bytes(root, phase0_commit, ownership_manifest_path)
    freeze = json.loads(freeze_bytes)
    ownership = json.loads(ownership_bytes)
    tasks = ownership.get("tasks") if isinstance(ownership, Mapping) else None
    role_tasks = [
        task
        for task in tasks or []
        if isinstance(task, Mapping) and task.get("owner_role") == role
    ]
    if (
        not isinstance(freeze, Mapping)
        or not isinstance(tasks, list)
        or ownership.get("allowed_input_manifest_sha256") != _sha256(freeze_bytes)
        or ownership.get("track_id") != freeze.get("track_id")
        or len(role_tasks) != 1
    ):
        raise T2RoleReceiptError("committed Phase-0 authority is malformed or ambiguous")
    runtime = ownership.get("trusted_runtime")
    _validate_trusted_runtime(runtime)
    return freeze_bytes, freeze, role_tasks[0], runtime


def _validate_trusted_runtime(runtime: object) -> None:
    """Requires every frozen system runtime entry to resolve to exact live bytes."""
    if (
        not isinstance(runtime, Mapping)
        or set(runtime) != _TRUSTED_RUNTIME_KEYS
        or runtime.get("schema_version") != "apk-trusted-runtime.v1"
        or runtime.get("sanitized_environment") != _EXPECTED_RUNTIME_ENVIRONMENT
    ):
        raise T2RoleReceiptError("trusted runtime authority is absent or malformed")
    declarations = runtime.get("executables")
    if not isinstance(declarations, list) or len(declarations) != len(_EXPECTED_RUNTIME_ENTRIES):
        raise T2RoleReceiptError("trusted runtime executable declarations are malformed")
    entries: set[str] = set()
    for declaration in declarations:
        if not isinstance(declaration, Mapping) or set(declaration) != _TRUSTED_EXECUTABLE_KEYS:
            raise T2RoleReceiptError("trusted runtime executable declaration is malformed")
        entry_value = declaration.get("entry_path")
        resolved_value = declaration.get("resolved_path")
        digest = declaration.get("sha256")
        if (
            not isinstance(entry_value, str)
            or not isinstance(resolved_value, str)
            or not isinstance(digest, str)
            or re.fullmatch(r"[0-9a-f]{64}", digest) is None
        ):
            raise T2RoleReceiptError("trusted runtime executable identity is malformed")
        entry = Path(entry_value)
        resolved = Path(resolved_value)
        if (
            not entry.is_absolute()
            or not resolved.is_absolute()
            or entry_value in entries
            or not entry.exists()
            or not resolved.is_file()
            or resolved.is_symlink()
        ):
            raise T2RoleReceiptError("trusted runtime executable path is unsafe")
        try:
            live_resolved = entry.resolve(strict=True)
            declared_resolved = resolved.resolve(strict=True)
        except OSError as error:
            raise T2RoleReceiptError("trusted runtime executable cannot be resolved") from error
        if (
            live_resolved != declared_resolved
            or _sha256(declared_resolved.read_bytes()) != digest
            or not os.access(declared_resolved, os.X_OK)
        ):
            raise T2RoleReceiptError("trusted runtime executable bytes differ")
        entries.add(entry_value)
    if entries != _EXPECTED_RUNTIME_ENTRIES:
        raise T2RoleReceiptError("trusted runtime executable set differs")


def _contract_path(value: object) -> str:
    """Returns one normalized in-track path from a frozen execution contract."""
    if not isinstance(value, str) or not value:
        raise T2RoleReceiptError("execution contract path is absent")
    candidate = Path(value)
    normalized = candidate.as_posix()
    if (
        candidate.is_absolute()
        or normalized != value
        or normalized in {".", ".."}
        or normalized.startswith("../")
        or "/../" in normalized
        or not normalized.startswith(f"{TRACK_DIRECTORY}/")
    ):
        raise T2RoleReceiptError(f"execution contract path is unsafe: {value}")
    return normalized


def _git_ancestor(root: Path, ancestor: str, descendant: str, message: str) -> None:
    """Requires one full Git revision to be an ancestor of another."""
    result = subprocess.run(
        ("git", "merge-base", "--is-ancestor", ancestor, descendant),
        cwd=root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        raise T2RoleReceiptError(message)


def _expanded_command_template(
    template: object,
    phase0_commit: str,
    role: str,
    commit_binding: Mapping[str, Any] | None,
) -> str:
    """Expands only authority-controlled immutable commit placeholders."""
    if not isinstance(template, str) or not template:
        raise T2RoleReceiptError("generator command template is absent")
    values: dict[str, str] = {}
    try:
        parsed = list(Formatter().parse(template))
    except ValueError as error:
        raise T2RoleReceiptError("generator command template is malformed") from error
    for _literal, field, format_spec, conversion in parsed:
        if field is None:
            continue
        if format_spec or conversion is not None:
            raise T2RoleReceiptError("generator command template has an unauthorized placeholder")
        if field == "phase0_commit":
            values[field] = phase0_commit
        elif (
            field == "phase1_attestation_commit"
            and role == "evidence-collector"
            and isinstance(commit_binding, Mapping)
            and isinstance(commit_binding.get(field), str)
        ):
            values[field] = commit_binding[field]
        elif (
            field == "phase2_receipt_commit"
            and role == "requirements-mapper"
            and isinstance(commit_binding, Mapping)
            and isinstance(commit_binding.get(field), str)
        ):
            values[field] = commit_binding[field]
        else:
            raise T2RoleReceiptError("generator command template has an unauthorized placeholder")
    try:
        command = template.format_map(values)
    except (KeyError, ValueError) as error:
        raise T2RoleReceiptError("generator command template could not be resolved") from error
    if "{" in command or "}" in command:
        raise T2RoleReceiptError("generator command template remains unresolved")
    return command


def _validate_dependency_blobs(
    root: Path,
    phase0_commit: str,
    output_commit: str,
    dependencies: object,
) -> None:
    """Verifies frozen, executed-worktree, and output-commit dependency bytes."""
    if not isinstance(dependencies, list) or not dependencies:
        raise T2RoleReceiptError("generator dependency blobs are absent")
    seen: set[tuple[str, str]] = set()
    for dependency in dependencies:
        if not isinstance(dependency, Mapping) or set(dependency) != _DEPENDENCY_KEYS:
            raise T2RoleReceiptError("generator dependency blob contract is malformed")
        path = _contract_path(dependency.get("path"))
        revision = dependency.get("revision")
        digest = dependency.get("sha256")
        if (
            not isinstance(revision, str)
            or _COMMIT_SHA.fullmatch(revision) is None
            or not isinstance(digest, str)
            or re.fullmatch(r"[0-9a-f]{64}", digest) is None
            or (path, revision) in seen
        ):
            raise T2RoleReceiptError("generator dependency blob identity is malformed")
        _git_ancestor(
            root,
            revision,
            phase0_commit,
            "generator dependency blob revision is not frozen by Phase 0",
        )
        if _sha256(_committed_bytes(root, revision, path)) != digest:
            raise T2RoleReceiptError(f"generator dependency blob hash differs: {path}")
        if _sha256(_committed_bytes(root, phase0_commit, path)) != digest:
            raise T2RoleReceiptError(
                f"Phase-0 generator dependency bytes differ from frozen blob: {path}"
            )
        worktree_path = root / path
        if (
            not worktree_path.is_file()
            or worktree_path.is_symlink()
            or _sha256(worktree_path.read_bytes()) != digest
            or _sha256(_committed_bytes(root, output_commit, path)) != digest
        ):
            raise T2RoleReceiptError(
                f"executed generator dependency bytes differ from frozen blob: {path}"
            )
        seen.add((path, revision))


def _derived_execution_contract(
    root: Path,
    phase0_commit: str,
    role: str,
    task: Mapping[str, Any],
    outputs: tuple[str, ...],
    output_commit: str,
    commit_binding: Mapping[str, Any] | None,
) -> tuple[
    tuple[_FrozenGenerator, ...],
    tuple[_FrozenReadOnly, ...],
    tuple[str, ...],
    frozenset[str],
]:
    """Derives all executable bindings solely from committed Phase-0 authority."""
    contract = task.get("execution_contract")
    if (
        not isinstance(contract, Mapping)
        or set(contract) != _EXECUTION_CONTRACT_KEYS
        or contract.get("schema_version") != "apk-role-execution-contract.v1"
    ):
        raise T2RoleReceiptError("frozen execution contract is absent or malformed")
    tools = contract.get("allowed_provider_tools")
    if (
        not isinstance(tools, list)
        or not tools
        or any(not isinstance(tool, str) or tool not in {"bash", "read", "write"} for tool in tools)
        or len(tools) != len(set(tools))
    ):
        raise T2RoleReceiptError("frozen provider tool contract is malformed")
    direct_only = contract.get("direct_write_only")
    direct_values = contract.get("direct_write_outputs")
    ordered_values = contract.get("ordered_operations")
    read_only_values = contract.get("read_only_shell_commands")
    generator_values = contract.get("shell_generators")
    if (
        not isinstance(direct_only, bool)
        or not isinstance(direct_values, list)
        or not isinstance(ordered_values, list)
        or not isinstance(read_only_values, list)
        or not isinstance(generator_values, list)
    ):
        raise T2RoleReceiptError("frozen execution contract collections are malformed")
    direct_outputs = tuple(_contract_path(path) for path in direct_values)
    if len(direct_outputs) != len(set(direct_outputs)):
        raise T2RoleReceiptError("direct-write output contract contains duplicates")
    if direct_only and (
        set(tools) != {"read", "write"}
        or direct_outputs != outputs
        or ordered_values
        or read_only_values
        or generator_values
    ):
        raise T2RoleReceiptError("direct-write-only execution contract is inconsistent")

    read_only: list[_FrozenReadOnly] = []
    for declaration in read_only_values:
        if not isinstance(declaration, Mapping) or set(declaration) != _READ_ONLY_KEYS:
            raise T2RoleReceiptError("read-only shell command contract is malformed")
        source = declaration.get("expected_stdout_source")
        if source == "output_commit":
            expected_stdout = output_commit
        elif isinstance(commit_binding, Mapping) and isinstance(commit_binding.get(source), str):
            expected_stdout = commit_binding[source]
        else:
            raise T2RoleReceiptError("read-only shell stdout source is absent")
        read_only.append(
            _FrozenReadOnly(
                ReadOnlyShellBinding(declaration.get("command")),
                f"{expected_stdout}\n",
            )
        )
    if len(read_only) != len({item.binding.command for item in read_only}):
        raise T2RoleReceiptError("read-only shell command contract contains duplicates")

    generators: list[_FrozenGenerator] = []
    generated_outputs: list[str] = []
    for generator in generator_values:
        if not isinstance(generator, Mapping) or set(generator) != _GENERATOR_KEYS:
            raise T2RoleReceiptError("shell generator contract is malformed")
        _validate_dependency_blobs(
            root, phase0_commit, output_commit, generator.get("dependency_blobs")
        )
        owned_values = generator.get("owned_outputs")
        if not isinstance(owned_values, list) or not owned_values:
            raise T2RoleReceiptError("shell generator owned outputs are absent")
        owned = tuple(_contract_path(path) for path in owned_values)
        if len(owned) != len(set(owned)):
            raise T2RoleReceiptError("shell generator owned outputs contain duplicates")
        commit = generator.get("commit")
        if not isinstance(commit, Mapping) or set(commit) != _COMMIT_KEYS:
            raise T2RoleReceiptError("shell generator commit contract is malformed")
        mode = commit.get("mode")
        subject = commit.get("subject")
        source = commit.get("attestation_commit_source")
        if (
            mode not in {"allow-empty-only", "normal-only"}
            or not isinstance(subject, str)
            or not subject
            or commit.get("immediate_adjacency") is not True
            or not isinstance(source, str)
            or not source
        ):
            raise T2RoleReceiptError("shell generator commit contract is inconsistent")
        if source == "output_commit":
            attestation_commit = output_commit
        elif isinstance(commit_binding, Mapping) and isinstance(commit_binding.get(source), str):
            attestation_commit = commit_binding[source]
        else:
            raise T2RoleReceiptError("shell generator attestation commit source is absent")
        command = _expanded_command_template(
            generator.get("command_template"), phase0_commit, role, commit_binding
        )
        binding = ShellGeneratorBinding(
            command,
            owned,
            attestation_commit=attestation_commit if mode == "allow-empty-only" else None,
        )
        generators.append(_FrozenGenerator(binding, mode, subject, attestation_commit))
        generated_outputs.extend(owned)

    all_outputs = (*direct_outputs, *generated_outputs)
    if len(all_outputs) != len(set(all_outputs)) or set(all_outputs) != set(outputs):
        raise T2RoleReceiptError("execution contract outputs differ from frozen task outputs")
    if not direct_only and (not generator_values or "bash" not in tools):
        raise T2RoleReceiptError("generator execution contract does not authorize Bash")
    expected_operations = {
        *(f"generator:{index}" for index in range(len(generators))),
        *(f"read-only:{index}" for index in range(len(read_only))),
    }
    if (
        any(not isinstance(operation, str) for operation in ordered_values)
        or len(ordered_values) != len(set(ordered_values))
        or set(ordered_values) != expected_operations
    ):
        raise T2RoleReceiptError("ordered execution operations differ from frozen declarations")
    return tuple(generators), tuple(read_only), tuple(ordered_values), frozenset(tools)


def _normalized_shell_command(command: object) -> str:
    """Returns the same safe token normalization used by provenance bindings."""
    if not isinstance(command, str) or re.search(r"(?:&&|\|\||[;|<>`$]|\n|\r)", command):
        raise T2RoleReceiptError("execution trace contains unsafe shell syntax")
    try:
        tokens = shlex.split(command, posix=True)
    except ValueError as error:
        raise T2RoleReceiptError("execution trace contains malformed shell syntax") from error
    if not tokens:
        raise T2RoleReceiptError("execution trace contains an empty shell command")
    return shlex.join(tokens)


def _expected_commit_command(generator: _FrozenGenerator) -> str:
    """Builds the exact commit invocation required by one frozen generator."""
    tokens = ["git", "commit"]
    if generator.mode == "allow-empty-only":
        tokens.append("--allow-empty")
    tokens.extend(("--only", *generator.binding.owned_outputs, "-m", generator.subject))
    return shlex.join(tokens)


def _trace_commit(root: Path, part: Mapping[str, Any], generator: _FrozenGenerator) -> None:
    """Binds an exact adjacent provider commit result to its frozen attestation SHA."""
    state = part.get("state")
    if not isinstance(state, Mapping) or state.get("status") != "completed":
        raise T2RoleReceiptError("generator commit trace is incomplete")
    tool_input = state.get("input")
    metadata = state.get("metadata")
    if not isinstance(tool_input, Mapping) or not isinstance(metadata, Mapping):
        raise T2RoleReceiptError("generator commit trace lacks immutable metadata")
    if _normalized_shell_command(tool_input.get("command")) != _expected_commit_command(generator):
        raise T2RoleReceiptError("generator commit trace differs from frozen contract")
    output = metadata.get("output")
    if metadata.get("exit") != 0 or metadata.get("truncated") is not False or not isinstance(output, str):
        raise T2RoleReceiptError("generator commit trace did not complete exactly")
    first_line = output.splitlines()[0] if output.splitlines() else ""
    match = _COMMIT_RESULT_LINE.fullmatch(first_line)
    if match is None or match.group(2) != generator.subject:
        raise T2RoleReceiptError("generator commit result differs from frozen subject")
    resolved = subprocess.run(
        ("git", "rev-parse", f"{match.group(1)}^{{commit}}"),
        cwd=root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        text=True,
    )
    if resolved.returncode != 0 or resolved.stdout.strip() != generator.attestation_commit:
        raise T2RoleReceiptError("generator commit result differs from frozen attestation")


def _validate_execution_trace(
    raw: bytes,
    root: Path,
    allowed_tools: frozenset[str],
    generators: tuple[_FrozenGenerator, ...],
    read_only: tuple[_FrozenReadOnly, ...],
    ordered_operations: tuple[str, ...],
) -> None:
    """Requires exact provider tools and the frozen ordered Bash operation sequence."""
    parts = _tool_parts(raw)
    tool_values = [part.get("tool") for part in parts]
    if any(not isinstance(tool, str) for tool in tool_values) or not set(tool_values).issubset(
        allowed_tools
    ):
        raise T2RoleReceiptError("provider tools differ from frozen execution contract")
    index = 0
    for operation in ordered_operations:
        while index < len(parts) and parts[index].get("tool") != "bash":
            index += 1
        if index >= len(parts):
            raise T2RoleReceiptError("Bash execution trace differs from frozen order")
        part = parts[index]
        state = part.get("state")
        if not isinstance(state, Mapping) or state.get("status") != "completed":
            raise T2RoleReceiptError("frozen Bash execution trace is incomplete")
        tool_input = state.get("input")
        metadata = state.get("metadata")
        if not isinstance(tool_input, Mapping) or not isinstance(metadata, Mapping):
            raise T2RoleReceiptError("frozen Bash execution trace lacks immutable metadata")
        command = _normalized_shell_command(tool_input.get("command"))
        kind, raw_operation_index = operation.split(":", 1)
        operation_index = int(raw_operation_index)
        if kind == "read-only":
            declaration = read_only[operation_index]
            if (
                command != declaration.binding.command
                or metadata.get("exit") != 0
                or metadata.get("truncated") is not False
                or metadata.get("output") != declaration.expected_stdout
            ):
                raise T2RoleReceiptError("read-only shell trace did not complete exactly")
            index += 1
            continue
        generator = generators[operation_index]
        if (
            command != generator.binding.command
            or index + 1 >= len(parts)
            or parts[index + 1].get("tool") != "bash"
            or metadata.get("exit") != 0
            or metadata.get("truncated") is not False
        ):
            raise T2RoleReceiptError("generator execution trace did not complete exactly")
        _trace_commit(root, parts[index + 1], generator)
        index += 2
    if any(part.get("tool") == "bash" for part in parts[index:]):
        raise T2RoleReceiptError("Bash execution trace has operations after frozen order")


def _atomic_write(root: Path, destination: Path, value: Mapping[str, Any]) -> None:
    """Writes a validated in-repository receipt without following destination symlinks."""
    target = destination if destination.is_absolute() else root / destination
    if target.is_symlink():
        raise T2RoleReceiptError("receipt destination must not be a symlink")
    if not target.parent.is_dir():
        raise T2RoleReceiptError("receipt destination parent must already exist")
    try:
        target.parent.resolve(strict=True).relative_to(root)
    except ValueError as error:
        raise T2RoleReceiptError("receipt destination escapes the repository") from error
    fd, temporary_name = tempfile.mkstemp(prefix=f".{target.name}.", dir=target.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(fd, "wb") as output:
            output.write(json.dumps(value, ensure_ascii=False, indent=2).encode() + b"\n")
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, target)
    finally:
        if temporary.exists():
            temporary.unlink()


def _render_t2_role_receipt_core(
    *,
    repository_root: Path,
    raw_export: bytes,
    destination: Path,
    session_id: str,
    role: str,
    provider_agent: str,
    output_commit: str,
    phase0_commit: str,
    input_freeze_path: str,
    ownership_manifest_path: str,
    stop_loss_observations: Mapping[str, Any],
    shell_generators: Sequence[ShellGeneratorBinding] | None = None,
    read_only_shell_commands: Sequence[ReadOnlyShellBinding] | None = None,
    commit_binding: Mapping[str, Any] | None = None,
) -> Mapping[str, Any]:
    """Renders one receipt from bytes and authority selected by trusted code.

    Args:
        repository_root: Exact Git repository used for committed output resolution.
        raw_export: Exact provider export bytes already verified against retained bytes.
        destination: Atomic output path for the validated receipt.
        session_id: Exact child provider session identifier.
        role: Frozen T2 role owned by the session.
        provider_agent: Exact expected assistant-agent identity.
        output_commit: Full commit immutably owning every task output.
        phase0_commit: Trusted full commit containing the immutable Phase-0 authority.
        input_freeze_path: Repository-relative committed Phase-0 input-freeze path.
        ownership_manifest_path: Repository-relative committed role/task authority path.
        stop_loss_observations: Numeric observations under frozen thresholds.
        shell_generators: Optional test assertion against authority-derived generators.
        read_only_shell_commands: Optional test assertion against authority-derived reads.
        commit_binding: Optional exact predecessor and phase-attestation commit metadata.
    Returns:
        The validated receipt mapping written to ``destination``.
    Raises:
        T2RoleReceiptError: If any provider or immutable binding check fails.
    """
    try:
        root = repository_root.resolve(strict=True)
        raw = raw_export
        if not isinstance(raw, bytes):
            raise T2RoleReceiptError("verified raw provider export must be exact bytes")
        freeze_bytes, freeze, frozen_task, trusted_runtime = _trusted_authority(
            root,
            phase0_commit,
            input_freeze_path,
            ownership_manifest_path,
            role,
            output_commit,
        )
        ceilings = freeze.get("frozen_resource_ceilings") if isinstance(freeze, Mapping) else None
        if (
            not isinstance(freeze, Mapping)
            or freeze.get("track_id") != "apk_source_denominator_inventory_20260712"
            or not isinstance(freeze.get("baseline_revision"), str)
            or not isinstance(ceilings, Mapping)
            or not isinstance(ceilings.get(role), Mapping)
            or frozen_task.get("owner_role") != role
            or role not in ROLE_PHASES
        ):
            raise T2RoleReceiptError("frozen task, role, or input freeze is inconsistent")
        task_prompt = canonical_task_prompt(frozen_task)
        declared = frozen_task.get("expected_outputs")
        if not isinstance(declared, list):
            raise T2RoleReceiptError("frozen task outputs are absent")
        outputs = tuple(
            path if path.startswith(f"{TRACK_DIRECTORY}/") else f"{TRACK_DIRECTORY}/{path}"
            for path in declared
        )
        validated_commit_binding = _validated_commit_binding(
            root, role, output_commit, commit_binding
        )
        frozen_generators, frozen_read_only, ordered_operations, allowed_tools = (
            _derived_execution_contract(
            root,
            phase0_commit,
            role,
            frozen_task,
            outputs,
            output_commit,
            validated_commit_binding,
            )
        )
        expected_generators = tuple(item.binding for item in frozen_generators)
        expected_read_only = tuple(item.binding for item in frozen_read_only)
        if shell_generators is not None and tuple(shell_generators) != expected_generators:
            raise T2RoleReceiptError(
                "caller shell generator bindings differ from frozen execution contract"
            )
        if (
            read_only_shell_commands is not None
            and tuple(read_only_shell_commands) != expected_read_only
        ):
            raise T2RoleReceiptError(
                "caller read-only shell bindings differ from frozen execution contract"
            )
        _validate_execution_trace(
            raw,
            root,
            allowed_tools,
            frozen_generators,
            frozen_read_only,
            ordered_operations,
        )
        binding = RoleBinding(
            role,
            session_id,
            provider_agent,
            outputs,
            output_commit=output_commit,
            shell_generators=expected_generators,
            read_only_shell_commands=expected_read_only,
        )
        provider_event = build_resolved_event(raw, binding, root)
        parent = provider_event.get("session_parent_id")
        if not isinstance(parent, str) or not parent:
            raise T2RoleReceiptError("provider session parent is absent")
        if provider_event.get("prompt_bytes") != task_prompt:
            raise T2RoleReceiptError("provider task envelope differs from frozen authority")
        _validate_direct_write_content(raw, root, output_commit, outputs, expected_generators)
        context_bytes = _context_manifest_bytes(provider_event)
        usage = derive_t2_actual_usage(
            repository_root=root,
            freeze=freeze,
            role=role,
            output_commit=output_commit,
            raw_export=raw,
            generator_commands=tuple(
                generator.binding.command for generator in frozen_generators
            ),
            commit_binding=validated_commit_binding,
        )
        observations = _validated_stop_loss(stop_loss_observations, freeze)
        budget = {
            "schema_version": "apk-role-budget-declaration.v1",
            "actual_usage": usage,
        }
        budget_bytes = _canonical_json(budget)
        stop_loss_bytes = _canonical_json(observations)
        output_hashes = dict(provider_event["output_sha256"])
        receipt: dict[str, Any] = {
            "schema_version": "apk-role-receipt.v1",
            "status": "complete-provider-attested",
            "track_id": freeze["track_id"],
            "phase": ROLE_PHASES[role],
            "role": role,
            "task_id": frozen_task.get("task_id"),
            "source_baseline_revision": freeze["baseline_revision"],
            "phase0_authority_commit": phase0_commit,
            "provider_agent": provider_agent,
            "spawn_id": session_id,
            "parent_ancestry_ids": [parent],
            "prompt_sha256": provider_event["canonical_prompt_sha256"],
            "actual_context_manifest": json.loads(context_bytes),
            "actual_context_manifest_sha256": _sha256(context_bytes),
            "start_event_id": provider_event["start_event_id"],
            "end_event_id": provider_event["id"],
            "final_response_sha256": provider_event["canonical_final_response_sha256"],
            "output_paths": list(outputs),
            "output_hashes": output_hashes,
            "output_sha256": _sha256(_canonical_json(output_hashes)),
            "actual_usage": usage,
            "budget_declaration": budget,
            "budget_declaration_sha256": _sha256(budget_bytes),
            "stop_loss_observations": observations,
            "stop_loss_observations_sha256": _sha256(stop_loss_bytes),
            "allowed_input_manifest_sha256": _sha256(freeze_bytes),
            "task_authority_sha256": _sha256(task_prompt),
            "trusted_runtime_sha256": _sha256(_canonical_json(trusted_runtime)),
            "raw_export_sha256": _sha256(raw),
            "commit_sha": output_commit,
            "shell_generators": [
                {
                    "command": item.command,
                    "owned_outputs": list(item.owned_outputs),
                    "command_sha256": item.command_sha256,
                    "attestation_commit": item.attestation_commit,
                }
                for item in expected_generators
            ],
            "read_only_shell_commands": [
                {"command": item.command, "command_sha256": item.command_sha256}
                for item in expected_read_only
            ],
            "acceptance": "not-claimed",
        }
        if validated_commit_binding is not None:
            receipt["commit_binding"] = validated_commit_binding
        attestations = {
            "allowed_input_manifest_sha256": freeze_bytes,
            "actual_context_manifest_sha256": context_bytes,
            "budget_declaration_sha256": budget_bytes,
            "task_authority_sha256": task_prompt,
            "stop_loss_observations_sha256": stop_loss_bytes,
        }
        normalized = normalize_resolved_event(
            build_resolved_event(raw, binding, root, attestations),
            frozen_task,
            receipt,
        )
        if (
            normalized.get("raw_export_sha256") != receipt["raw_export_sha256"]
            or normalized.get("output_commit") != output_commit
            or normalized.get("agent") != provider_agent
            or normalized.get("spawn_id") != session_id
        ):
            raise T2RoleReceiptError("self-validated event differs from rendered receipt")
        _atomic_write(root, destination, receipt)
        return receipt
    except T2RoleReceiptError:
        raise
    except (
        APKInventoryLiveError,
        ProvenanceError,
        T2RoleAccountingError,
        OSError,
        ValueError,
        KeyError,
    ) as error:
        raise T2RoleReceiptError(str(error)) from error


def render_t2_role_receipt(
    *,
    repository_root: Path,
    raw_export_path: Path,
    destination: Path,
    session_id: str,
    role: str,
    provider_agent: str,
    output_commit: str,
    stop_loss_observations: Mapping[str, Any],
    commit_binding: Mapping[str, Any] | None = None,
) -> Mapping[str, Any]:
    """Renders a production receipt from live provider and pinned Phase-0 authority.

    Args:
        repository_root: Exact Git repository used for committed output resolution.
        raw_export_path: Exact retained export path compared with a fresh provider export.
        destination: Atomic output path for the validated receipt.
        session_id: Exact child provider session identifier.
        role: Frozen T2 role owned by the session.
        provider_agent: Exact expected assistant-agent identity.
        output_commit: Full commit immutably owning every task output.
        stop_loss_observations: Numeric observations under frozen thresholds.
        commit_binding: Optional exact predecessor and phase-attestation commit metadata.
    Returns:
        The validated receipt mapping written to ``destination``.
    Raises:
        T2RoleReceiptError: If the production authority is unbound or validation fails.
    """
    phase0_commit = T2_PHASE0_AUTHORITY_COMMIT
    if phase0_commit is None or _COMMIT_SHA.fullmatch(phase0_commit) is None:
        raise T2RoleReceiptError("production Phase-0 authority commit is unbound")
    try:
        raw = _verified_live_export(
            session_id,
            raw_export_path,
            OpenCodeExportAdapter(),
        )
    except (ProvenanceError, OSError, ValueError) as error:
        raise T2RoleReceiptError(str(error)) from error
    return _render_t2_role_receipt_core(
        repository_root=repository_root,
        raw_export=raw,
        destination=destination,
        session_id=session_id,
        role=role,
        provider_agent=provider_agent,
        output_commit=output_commit,
        phase0_commit=phase0_commit,
        input_freeze_path=T2_INPUT_FREEZE_PATH,
        ownership_manifest_path=T2_OWNERSHIP_MANIFEST_PATH,
        stop_loss_observations=stop_loss_observations,
        commit_binding=commit_binding,
    )
