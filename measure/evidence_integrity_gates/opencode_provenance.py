"""Provider-neutral provenance adapter for OpenCode session exports."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shlex
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Protocol, Sequence


class ProvenanceError(RuntimeError):
    """Raised when exported provenance cannot be resolved or validated."""


class TrustedSessionResolver(Protocol):
    """Resolves session evidence through a trusted live provider boundary."""

    def resolve(self, session_id: str) -> bytes:
        """Returns exact live export bytes for a provider session.

        @param session_id Provider session identifier.
        @returns Exact provider export bytes.
        @throws ProvenanceError When the provider or session is unavailable.
        """
        ...


@dataclass(frozen=True)
class RoleBinding:
    """Declares the expected identity and ownership of one role session."""

    role: str
    session_id: str
    expected_agent: str
    owned_outputs: tuple[str, ...]
    reviewer: bool = False
    output_commit: str | None = None
    shell_generators: tuple[ShellGeneratorBinding, ...] = ()


@dataclass(frozen=True)
class ShellGeneratorBinding:
    """Declares one exact shell generator and the outputs it owns."""

    command: str
    owned_outputs: tuple[str, ...]
    command_sha256: str | None = None
    attestation_commit: str | None = None

    def __post_init__(self) -> None:
        """Normalizes the command and binds its immutable digest."""
        normalized = _normalize_shell_command(self.command)
        digest = _sha256(normalized.encode())
        if self.command_sha256 is not None and self.command_sha256 != digest:
            raise ValueError("shell generator command hash does not match command")
        if self.attestation_commit is not None and not re.fullmatch(r"[0-9a-f]{40}", self.attestation_commit):
            raise ValueError("shell generator attestation commit must be a full lowercase SHA")
        object.__setattr__(self, "command", normalized)
        object.__setattr__(self, "command_sha256", digest)
        outputs = tuple(_normalize_owned_path(path) for path in self.owned_outputs)
        if len(outputs) != len(set(outputs)):
            raise ValueError("shell generator outputs must be distinct")
        object.__setattr__(self, "owned_outputs", outputs)


_SHELL_CONTROL = re.compile(r"(?:&&|\|\||[;|<>`$]|\n|\r)")
_COMMIT_RESULT_LINE = re.compile(r"^\[[^]\n]+ ([0-9a-f]{7,40})\] (.+)$", re.MULTILINE)


def _normalize_owned_path(path: str) -> str:
    """Returns a safe repository-relative output path."""
    if not isinstance(path, str) or not path or Path(path).is_absolute():
        raise ValueError("owned output must be a relative path")
    normalized = Path(path).as_posix()
    if normalized != path or normalized in {".", ".."} or normalized.startswith("../") or "/../" in normalized:
        raise ValueError("owned output path is not normalized")
    return normalized


def _normalize_shell_command(command: str) -> str:
    """Returns a shell command's exact safe token normalization."""
    if not isinstance(command, str) or _SHELL_CONTROL.search(command):
        raise ValueError("shell command contains control syntax")
    try:
        tokens = shlex.split(command, posix=True)
    except ValueError as error:
        raise ValueError("shell command cannot be parsed") from error
    if not tokens:
        raise ValueError("shell command is empty")
    return shlex.join(tokens)


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


def _plain_text_bytes(message: Mapping[str, Any]) -> bytes:
    """Returns concatenated provider text exactly as authored.

    @param message Exported OpenCode message.
    @returns UTF-8 bytes for ordered text parts without an invented wrapper.
    """
    return "".join(
        part["text"] for part in message.get("parts", [])
        if part.get("type") == "text" and isinstance(part.get("text"), str)
    ).encode()


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


def _tool_owned_paths(messages: Sequence[Mapping[str, Any]], repo_root: Path, shell_generators: Sequence[ShellGeneratorBinding] = (), output_commit: str | None = None) -> set[str]:
    """Extracts paths attributable to direct writes and bound shell generators.

    @param messages Exported OpenCode messages.
    @param repo_root Repository root used to validate shell workdirs and commits.
    @param shell_generators Immutable explicit shell ownership declarations.
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
    return paths | _shell_owned_paths(messages, repo_root, shell_generators, output_commit)


def _shell_owned_paths(
    messages: Sequence[Mapping[str, Any]],
    repo_root: Path,
    bindings: Sequence[ShellGeneratorBinding],
    output_commit: str | None,
) -> set[str]:
    """Resolves only explicitly bound, committed shell-generator outputs."""
    if not bindings:
        return set()
    if not isinstance(output_commit, str) or not re.fullmatch(r"[0-9a-f]{40}", output_commit):
        raise ProvenanceError("shell ownership requires a full output commit")
    root = str(repo_root.resolve())
    tool_parts: list[tuple[int, int, Mapping[str, Any]]] = []
    for message_index, message in enumerate(messages):
        for part_index, part in enumerate(message.get("parts", [])):
            if part.get("type") != "tool":
                continue
            tool_parts.append((message_index, part_index, part))

    owned: set[str] = set()
    for binding in bindings:
        valid_commits: list[str] = []
        generator_seen = False
        for index, (_, _, part) in enumerate(tool_parts):
            state = part.get("state")
            if part.get("tool") != "bash" or not isinstance(state, Mapping) or state.get("status") != "completed":
                continue
            tool_input = state.get("input")
            metadata = state.get("metadata")
            if not isinstance(tool_input, Mapping) or not isinstance(metadata, Mapping):
                continue
            command = tool_input.get("command")
            workdir = tool_input.get("workdir")
            if not isinstance(command, str) or workdir != root:
                continue
            try:
                normalized = _normalize_shell_command(command)
            except ValueError:
                continue
            if normalized != binding.command or metadata.get("exit") != 0 or metadata.get("truncated") is not False:
                continue
            generator_seen = True
            if index + 1 >= len(tool_parts):
                continue
            next_part = tool_parts[index + 1][2]
            next_state = next_part.get("state")
            if not isinstance(next_state, Mapping) or next_state.get("status") != "completed":
                continue
            next_input = next_state.get("input")
            next_metadata = next_state.get("metadata")
            if not isinstance(next_input, Mapping) or not isinstance(next_metadata, Mapping):
                continue
            commit_sha = _parse_simple_commit(next_input, next_metadata, binding, repo_root, output_commit)
            if commit_sha is not None:
                valid_commits.append(commit_sha)
        if not valid_commits:
            if generator_seen:
                raise ProvenanceError("bound shell generator has no valid subsequent commit")
            raise ProvenanceError("bound shell generator invocation is missing")
        owned.update(binding.owned_outputs)
    return owned


def _parse_simple_commit(
    tool_input: Mapping[str, Any],
    metadata: Mapping[str, Any],
    binding: ShellGeneratorBinding,
    repo_root: Path,
    output_commit: str | None,
) -> str | None:
    """Parses and verifies one simple exact-path git commit command."""
    if metadata.get("exit") != 0 or metadata.get("truncated") is not False:
        return None
    command = tool_input.get("command")
    if not isinstance(command, str) or _SHELL_CONTROL.search(command):
        return None
    try:
        tokens = shlex.split(command, posix=True)
    except ValueError:
        return None
    if len(tokens) < 5 or tokens[:2] != ["git", "commit"]:
        return None
    allow_empty = len(tokens) > 2 and tokens[2] == "--allow-empty"
    only_index = 3 if allow_empty else 2
    if tokens[only_index:only_index + 1] != ["--only"]:
        return None
    paths: list[str] = []
    index = only_index + 1
    while index < len(tokens) and not tokens[index].startswith("-"):
        paths.append(tokens[index])
        index += 1
    if set(paths) != set(binding.owned_outputs) or len(paths) != len(set(paths)):
        return None
    if index == len(tokens) or tokens[index] not in {"-m", "--message"} or index + 1 >= len(tokens) or index + 2 != len(tokens):
        return None
    message = tokens[index + 1]
    output = metadata.get("output")
    if not isinstance(output, str) or metadata.get("truncated") is not False:
        return None
    lines = output.splitlines()
    if not lines:
        return None
    summaries = _COMMIT_RESULT_LINE.findall(output)
    first = _COMMIT_RESULT_LINE.fullmatch(lines[0])
    if first is None or len(summaries) != 1:
        return None
    abbreviated, subject = first.groups()
    if subject != message:
        return None
    resolved = subprocess.run(
        ("git", "rev-parse", f"{abbreviated}^{{commit}}"),
        cwd=repo_root, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
    )
    if resolved.returncode != 0 or not re.fullmatch(r"[0-9a-f]{40}\n?", resolved.stdout.decode(errors="replace")):
        return None
    commit_sha = resolved.stdout.decode().strip()
    if not re.fullmatch(r"[0-9a-f]{40}", commit_sha) or not _binding_output_commit_is_ancestor(commit_sha, output_commit, repo_root):
        return None
    if allow_empty and commit_sha != binding.attestation_commit:
        return None
    if not _commit_owns_declared_outputs(commit_sha, output_commit, binding, repo_root, allow_empty):
        return None
    return commit_sha


def _commit_owns_declared_outputs(
    commit_sha: str,
    output_commit: str | None,
    binding: ShellGeneratorBinding,
    repo_root: Path,
    allow_empty: bool,
) -> bool:
    """Verifies a commit's changed paths and output blobs against its final binding."""
    changed = subprocess.run(
        ("git", "diff-tree", "--no-commit-id", "--name-only", "-r", commit_sha),
        cwd=repo_root, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
    )
    if changed.returncode != 0:
        return False
    changed_paths = {line for line in changed.stdout.decode().splitlines() if line}
    declared = set(binding.owned_outputs)
    if not changed_paths <= declared:
        return False
    if allow_empty:
        parent = subprocess.run(
            ("git", "rev-parse", f"{commit_sha}^"),
            cwd=repo_root, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
        )
        if parent.returncode != 0 or parent.stdout.decode().strip() == "":
            return False
        tree = subprocess.run(
            ("git", "show", "-s", "--format=%T", commit_sha),
            cwd=repo_root, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
        )
        parent_tree = subprocess.run(
            ("git", "show", "-s", "--format=%T", f"{parent.stdout.decode().strip()}"),
            cwd=repo_root, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
        )
        if tree.returncode != 0 or parent_tree.returncode != 0 or tree.stdout != parent_tree.stdout:
            return False
    elif not changed_paths:
        return False
    if output_commit is None:
        return True
    for relative in binding.owned_outputs:
        ownership_blob = subprocess.run(
            ("git", "rev-parse", f"{commit_sha}:{relative}"),
            cwd=repo_root, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
        )
        final_blob = subprocess.run(
            ("git", "rev-parse", f"{output_commit}:{relative}"),
            cwd=repo_root, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
        )
        if (
            ownership_blob.returncode != 0
            or final_blob.returncode != 0
            or ownership_blob.stdout != final_blob.stdout
        ):
            return False
    return True


def _binding_output_commit_is_ancestor(commit_sha: str, output_commit: str | None, repo_root: Path) -> bool:
    """Returns whether a resolved generator commit is an ancestor of its binding commit."""
    if output_commit is None:
        return True
    if not re.fullmatch(r"[0-9a-f]{40}", output_commit):
        return False
    result = subprocess.run(
        ("git", "merge-base", "--is-ancestor", commit_sha, output_commit),
        cwd=repo_root, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
    )
    return result.returncode == 0


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


class OpenCodeTrustedSessionResolver:
    """Resolves trusted session bytes through the OpenCode export adapter."""

    def __init__(self, adapter: OpenCodeExportAdapter | None = None) -> None:
        """Creates a live session resolver.

        @param adapter Optional provider adapter override.
        """
        self._adapter = adapter or OpenCodeExportAdapter()

    def resolve(self, session_id: str) -> bytes:
        """Exports a named session through the trusted OpenCode command.

        @param session_id OpenCode session identifier.
        @returns Exact live provider export bytes.
        @throws ProvenanceError When the command or session cannot be resolved.
        """
        with tempfile.TemporaryDirectory(prefix="measure-opencode-export-") as directory:
            return self._adapter.export(session_id, Path(directory) / "export.json")


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

    tool_paths = _tool_owned_paths(messages, repo_root, binding.shell_generators, binding.output_commit)
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


def build_resolved_event(
    raw: bytes,
    binding: RoleBinding,
    repo_root: Path,
    attested_manifest_bytes: Mapping[str, bytes] | None = None,
) -> dict[str, Any]:
    """Resolve a Phase 2 event directly from exact OpenCode export bytes.

    @param raw Exact raw OpenCode export bytes.
    @param binding Expected role/session/output binding.
    @param repo_root Repository root used for output hashing.
    @param attested_manifest_bytes Exact allowed-input, context, and budget manifests when exported separately.
    @returns Event-resolver record with provider-derived identity, bytes, and omissions.
    @throws ProvenanceError When the export fails the existing strict adapter checks.
    """
    normalized = build_evidence(raw, binding, repo_root)
    export = json.loads(raw)
    messages = _session_messages(export)
    users = [message for message in messages if message.get("info", {}).get("role") == "user"]
    assistants = [message for message in messages if message.get("info", {}).get("role") == "assistant"]
    resolved_tool_paths: set[str] = set()
    root = repo_root.resolve()
    for tool_path in _tool_owned_paths(messages, repo_root, binding.shell_generators, binding.output_commit):
        candidate = Path(tool_path)
        if candidate.is_absolute():
            try:
                tool_path = str(candidate.resolve().relative_to(root))
            except ValueError:
                pass
        resolved_tool_paths.add(tool_path)
    if resolved_tool_paths != set(binding.owned_outputs):
        raise ProvenanceError("raw export write inventory differs from declared ownership")
    event = {
        "provenance_kind": "opencode-raw-export",
        "raw_export_bytes": raw,
        "raw_export_sha256": normalized["raw_export_sha256"],
        "id": normalized["final_response_message_id"],
        "start_event_id": normalized["prompt_message_id"],
        "role": "assistant",
        "session_id": normalized["session_id"],
        "session_parent_id": normalized["session_parent_id"],
        "agent": normalized["agent"],
        "prompt_message_id": normalized["prompt_message_id"],
        "final_response_message_id": normalized["final_response_message_id"],
        "prompt_bytes": _plain_text_bytes(users[0]),
        "final_response_bytes": _plain_text_bytes(assistants[-1]),
        "started_ms": normalized["started_ms"],
        "completed_ms": normalized["completed_ms"],
        "output_sha256": normalized["output_sha256"],
        "raw_write_inventory": sorted(resolved_tool_paths),
    }
    if normalized["fork_turns_check"] == "schema-field-absent":
        event["schema_omissions"] = ["fork_turns"]
        if messages[0] is users[0]:
            event["reviewer_isolation_proof"] = "raw-history-begins-with-fresh-prompt"
    else:
        event["fork_turns"] = normalized["fork_turns"]
    if attested_manifest_bytes is not None:
        event["attested_manifest_bytes"] = dict(attested_manifest_bytes)
        for field, value in attested_manifest_bytes.items():
            event[field] = _sha256(value)
    return event


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
