"""Provider-neutral provenance adapter for OpenCode session exports."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Sequence


class ProvenanceError(RuntimeError):
    """Raised when exported provenance cannot be resolved or validated."""


@dataclass(frozen=True)
class RoleBinding:
    """Declares the expected identity and ownership of one role session."""

    role: str
    session_id: str
    expected_agent: str
    owned_outputs: tuple[str, ...]
    reviewer: bool = False
    output_commit: str | None = None


def _sha256(data: bytes) -> str:
    """Returns the SHA-256 digest of bytes.

    @param data Bytes to hash.
    @returns Lowercase hexadecimal SHA-256 digest.
    """
    return hashlib.sha256(data).hexdigest()


def _canonical_json(value: Any) -> bytes:
    """Serializes a value deterministically for exact field hashing.

    @param value JSON-compatible value to serialize.
    @returns Canonical UTF-8 JSON bytes.
    """
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True).encode()


def _text_bytes(message: Mapping[str, Any]) -> bytes:
    """Extracts the exact ordered text-part payload from an OpenCode message.

    @param message Exported OpenCode message.
    @returns Canonical bytes preserving text-part IDs and text.
    """
    parts = [
        {"id": part.get("id"), "text": part.get("text")}
        for part in message.get("parts", [])
        if part.get("type") == "text" and isinstance(part.get("text"), str)
    ]
    return _canonical_json(parts)


def _session_messages(export: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    """Returns validated messages from an OpenCode export.

    @param export Parsed OpenCode export.
    @returns Ordered exported messages.
    @throws ProvenanceError When the message collection is absent or malformed.
    """
    messages = export.get("messages")
    if not isinstance(messages, list) or not messages:
        raise ProvenanceError("export has no messages")
    if not all(isinstance(message, Mapping) for message in messages):
        raise ProvenanceError("export contains a malformed message")
    return messages


def _message_identity(message: Mapping[str, Any], session_id: str) -> dict[str, Any]:
    """Validates and extracts stable message identity fields.

    @param message Exported OpenCode message.
    @param session_id Session the message must belong to.
    @returns Stable identity and timestamp fields.
    @throws ProvenanceError When IDs or timestamps are missing or inconsistent.
    """
    info = message.get("info")
    if not isinstance(info, Mapping):
        raise ProvenanceError("message info is missing")
    message_id = info.get("id")
    if not isinstance(message_id, str) or not message_id.startswith("msg_"):
        raise ProvenanceError("message ID is missing or invalid")
    if info.get("sessionID") != session_id:
        raise ProvenanceError(f"message {message_id} belongs to another session")
    time = info.get("time")
    if not isinstance(time, Mapping) or not isinstance(time.get("created"), int):
        raise ProvenanceError(f"message {message_id} has no created timestamp")
    completed = time.get("completed")
    if completed is not None and (not isinstance(completed, int) or completed < time["created"]):
        raise ProvenanceError(f"message {message_id} has an invalid completion timestamp")
    return {
        "message_id": message_id,
        "parent_message_id": info.get("parentID"),
        "created_ms": time["created"],
        "completed_ms": completed,
    }


def _tool_owned_paths(messages: Sequence[Mapping[str, Any]]) -> set[str]:
    """Extracts repository-relative paths named by completed write tools.

    @param messages Exported OpenCode messages.
    @returns Paths conservatively attributable to tool calls in the session.
    """
    paths: set[str] = set()
    patch_header = re.compile(r"^\*\*\* (?:Add|Update|Delete) File: ([^\n]+)$", re.MULTILINE)
    for message in messages:
        for part in message.get("parts", []):
            if part.get("type") != "tool":
                continue
            state = part.get("state")
            if not isinstance(state, Mapping) or state.get("status") != "completed":
                continue
            tool = part.get("tool")
            tool_input = state.get("input")
            if not isinstance(tool_input, Mapping):
                continue
            if tool in {"write", "edit"}:
                path = tool_input.get("filePath")
                if isinstance(path, str):
                    paths.add(path)
            if tool == "apply_patch":
                patch = tool_input.get("patchText")
                if isinstance(patch, str):
                    paths.update(patch_header.findall(patch))
    return paths


class OpenCodeExportAdapter:
    """Exports OpenCode sessions through a configurable command boundary."""

    def __init__(self, command: Sequence[str] = ("opencode", "export")) -> None:
        """Creates an export adapter.

        @param command Provider command prefix used to export a session.
        """
        self._command = tuple(command)

    def export(self, session_id: str, destination: Path) -> bytes:
        """Exports one session to an exact raw file and returns its bytes.

        @param session_id OpenCode session identifier.
        @param destination Destination for immutable raw JSON.
        @returns Exact raw export bytes.
        @throws ProvenanceError When export fails or returns invalid JSON.
        """
        if not re.fullmatch(r"ses_[A-Za-z0-9]+", session_id):
            raise ProvenanceError("invalid session ID")
        destination.parent.mkdir(parents=True, exist_ok=True)
        fd, temporary_name = tempfile.mkstemp(prefix=f".{session_id}.", dir=destination.parent)
        try:
            with os.fdopen(fd, "wb") as output:
                result = subprocess.run(
                    (*self._command, session_id, "--pure"),
                    stdout=output,
                    stderr=subprocess.PIPE,
                    check=False,
                )
            temporary = Path(temporary_name)
            raw = temporary.read_bytes()
            if result.returncode != 0:
                raise ProvenanceError(result.stderr.decode(errors="replace").strip())
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError as error:
                raise ProvenanceError(f"OpenCode returned invalid JSON: {error}") from error
            if not isinstance(parsed, Mapping):
                raise ProvenanceError("OpenCode export root must be an object")
            temporary.replace(destination)
            destination.chmod(0o444)
            return raw
        finally:
            temporary = Path(temporary_name)
            if temporary.exists():
                temporary.unlink()


def build_evidence(raw: bytes, binding: RoleBinding, repo_root: Path) -> dict[str, Any]:
    """Builds replayable exact-hash evidence from one raw OpenCode export.

    @param raw Exact raw export bytes.
    @param binding Expected role/session/ownership declaration.
    @param repo_root Repository root used to hash owned outputs.
    @returns Normalized provenance evidence.
    @throws ProvenanceError When identity, chronology, ownership, or agent checks fail.
    """
    export = json.loads(raw)
    info = export.get("info")
    if not isinstance(info, Mapping) or info.get("id") != binding.session_id:
        raise ProvenanceError(f"session identity mismatch for {binding.role}")
    messages = _session_messages(export)
    identities = [_message_identity(message, binding.session_id) for message in messages]
    ids = [identity["message_id"] for identity in identities]
    if len(ids) != len(set(ids)):
        raise ProvenanceError(f"duplicate message ID in {binding.role}")
    if identities != sorted(identities, key=lambda item: item["created_ms"]):
        raise ProvenanceError(f"non-monotonic message chronology in {binding.role}")
    known_ids = set(ids)
    for message, identity in zip(messages, identities, strict=True):
        parent_id = identity["parent_message_id"]
        if parent_id is not None and (not isinstance(parent_id, str) or not parent_id.startswith("msg_")):
            raise ProvenanceError(f"message {identity['message_id']} has an invalid parent message ID")
        if message.get("info", {}).get("role") == "assistant" and parent_id not in known_ids:
            raise ProvenanceError(f"assistant message {identity['message_id']} has an unresolved parent")

    users = [message for message in messages if message.get("info", {}).get("role") == "user"]
    assistants = [message for message in messages if message.get("info", {}).get("role") == "assistant"]
    if not users or not assistants:
        raise ProvenanceError(f"{binding.role} lacks prompt or response messages")
    agents = {message.get("info", {}).get("agent") for message in assistants}
    if agents != {binding.expected_agent}:
        raise ProvenanceError(f"unexpected agent identity for {binding.role}: {sorted(map(str, agents))}")
    final = assistants[-1]
    final_identity = _message_identity(final, binding.session_id)
    if final_identity["completed_ms"] is None:
        raise ProvenanceError(f"final response is incomplete for {binding.role}")
    if _text_bytes(users[0]) == _canonical_json([]) or _text_bytes(final) == _canonical_json([]):
        raise ProvenanceError(f"{binding.role} lacks hashable prompt or final-response text")

    tool_paths = _tool_owned_paths(messages)
    output_hashes: dict[str, str] = {}
    for relative in binding.owned_outputs:
        path = (repo_root / relative).resolve()
        try:
            path.relative_to(repo_root.resolve())
        except ValueError as error:
            raise ProvenanceError(f"owned output escapes repository: {relative}") from error
        if not path.is_file():
            raise ProvenanceError(f"owned output is missing: {relative}")
        absolute = str(path)
        if relative not in tool_paths and absolute not in tool_paths:
            raise ProvenanceError(f"session has no completed write-tool evidence for {relative}")
        if binding.output_commit is None:
            output_bytes = path.read_bytes()
        else:
            result = subprocess.run(
                ("git", "show", f"{binding.output_commit}:{relative}"),
                cwd=repo_root,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
            )
            if result.returncode != 0:
                raise ProvenanceError(f"owned output is absent at {binding.output_commit}: {relative}")
            output_bytes = result.stdout
        output_hashes[relative] = _sha256(output_bytes)

    session_parent = info.get("parentID")
    fork_turns = info.get("fork_turns")
    return {
        "role": binding.role,
        "session_id": binding.session_id,
        "session_parent_id": session_parent if isinstance(session_parent, str) else None,
        "agent": binding.expected_agent,
        "raw_export_sha256": _sha256(raw),
        "raw_export_bytes": len(raw),
        "first_message_id": identities[0]["message_id"],
        "last_message_id": identities[-1]["message_id"],
        "message_count": len(messages),
        "prompt_message_id": _message_identity(users[0], binding.session_id)["message_id"],
        "prompt_sha256": _sha256(_text_bytes(users[0])),
        "final_response_message_id": final_identity["message_id"],
        "final_response_sha256": _sha256(_text_bytes(final)),
        "started_ms": identities[0]["created_ms"],
        "completed_ms": final_identity["completed_ms"],
        "output_sha256": output_hashes,
        "output_commit": binding.output_commit,
        "fork_turns": fork_turns if fork_turns is not None else None,
        "fork_turns_check": (
            "verified-none" if fork_turns == "none" else "verified-other"
        ) if fork_turns is not None else "schema-field-absent",
    }


def validate_role_set(evidence: Sequence[Mapping[str, Any]]) -> None:
    """Validates distinct roles, reviewer independence, and parent consistency.

    @param evidence Normalized role evidence records.
    @throws ProvenanceError When role/session/message/output boundaries overlap.
    """
    sessions = [item.get("session_id") for item in evidence]
    if len(sessions) != len(set(sessions)):
        raise ProvenanceError("roles do not use distinct sessions")
    final_messages = [item.get("final_response_message_id") for item in evidence]
    if len(final_messages) != len(set(final_messages)):
        raise ProvenanceError("roles reuse a final-response message")
    owners: dict[str, str] = {}
    for item in evidence:
        for output in item.get("output_sha256", {}):
            if output in owners:
                raise ProvenanceError(f"output {output} is owned by multiple roles")
            owners[output] = str(item.get("role"))
    reviewer = next((item for item in evidence if item.get("role") == "independent-review"), None)
    if reviewer is None:
        raise ProvenanceError("independent reviewer is missing")
    if reviewer.get("fork_turns_check") == "verified-other":
        raise ProvenanceError("reviewer fork_turns is not none")
    author_sessions = {item.get("session_id") for item in evidence if item is not reviewer}
    if reviewer.get("session_id") in author_sessions:
        raise ProvenanceError("reviewer shares an author session")
    parents = {item.get("session_parent_id") for item in evidence}
    if None in parents or len(parents) != 1:
        raise ProvenanceError("role parent sessions are missing or inconsistent")
    author_completed = [
        item.get("completed_ms") for item in evidence if item is not reviewer
    ]
    if not all(isinstance(value, int) for value in author_completed):
        raise ProvenanceError("author completion timestamps are missing")
    if not isinstance(reviewer.get("started_ms"), int) or reviewer["started_ms"] <= max(author_completed):
        raise ProvenanceError("reviewer did not start after author sessions completed")


def _bindings() -> tuple[RoleBinding, ...]:
    """Returns the Phase 0 role bindings declared by the product owner.

    @returns Immutable role binding set.
    """
    return (
        RoleBinding("strategy", "ses_0aa191e2bffebBv1iZ52qxCX4d", "measure-strategy", ("measure/tracks/measure_apk_evidence_integrity_gates_20260712/test-strategy.md",), output_commit="75a12493b8e2fba4bf57566a132a9bd04eb03dc6"),
        RoleBinding("red-counterexamples", "ses_0aa12e938ffeoWHrt15XNN5uGp", "measure-mid-red", ("measure/tests/evidence_integrity_gates/fixtures/invalid/invalid_severity_unknown_level.json",), output_commit="535bfdfed6d9d6d100a9f066e255efd722341262"),
        RoleBinding("green-contracts", "ses_0aa01bc31ffe09LS2OIF6AtCme", "measure-jr-green", ("measure/evidence_integrity_gates/contracts.py",), output_commit="535bfdfed6d9d6d100a9f066e255efd722341262"),
        RoleBinding("independent-review", "ses_0a9ad6d31ffeUD4CqyaL5NZidM", "coder-openai-gpt-5-6-terra-pro", ("measure/tracks/measure_apk_evidence_integrity_gates_20260712/phase0-retry-acceptance-result.json",), True, "8a6d17c44c9485e1b93a7ea3edae65865362d419"),
    )


def verify_live(repo_root: Path, evidence_path: Path, raw_directory: Path) -> dict[str, Any]:
    """Exports bound sessions and verifies them against stored offline evidence.

    @param repo_root Repository root.
    @param evidence_path Stored normalized evidence manifest.
    @param raw_directory Temporary directory receiving exact raw exports.
    @returns Fresh normalized evidence manifest.
    @throws ProvenanceError When live data differs from stored evidence.
    """
    adapter = OpenCodeExportAdapter()
    records = []
    for binding in _bindings():
        raw = adapter.export(binding.session_id, raw_directory / f"{binding.session_id}.json")
        records.append(build_evidence(raw, binding, repo_root))
    validate_role_set(records)
    stored = json.loads(evidence_path.read_text(encoding="utf-8"))
    if stored.get("roles") != records:
        raise ProvenanceError("live OpenCode provenance differs from stored evidence")
    return {"schema_version": "opencode-provenance.v1", "roles": records}


def main(argv: Sequence[str] | None = None) -> int:
    """Runs capture or live verification for Phase 0 provenance.

    @param argv Optional command-line arguments.
    @returns Process exit status.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("capture", "verify"))
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("--evidence", type=Path, required=True)
    parser.add_argument("--raw-dir", type=Path, required=True)
    args = parser.parse_args(argv)
    repo = args.repo.resolve()
    if args.mode == "verify":
        verify_live(repo, args.evidence, args.raw_dir)
        print("PASS: live OpenCode provenance matches offline evidence")
        return 0
    adapter = OpenCodeExportAdapter()
    records = []
    for binding in _bindings():
        raw = adapter.export(binding.session_id, args.raw_dir / f"{binding.session_id}.json")
        records.append(build_evidence(raw, binding, repo))
    validate_role_set(records)
    payload = {"schema_version": "opencode-provenance.v1", "roles": records}
    args.evidence.write_bytes(json.dumps(payload, indent=2, ensure_ascii=False).encode() + b"\n")
    print(f"PASS: captured {len(records)} distinct role sessions")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
