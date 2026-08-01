"""Fail-closed R2 compensation evidence producer and validator.

This module replays the accepted R1 source archive, materializes two distinct
scanner roots outside the repository, and records only durable command streams,
input brackets, graph fingerprints, and normalized inventories. It deliberately
does not retain or depend on a local ``/tmp`` graph database after production.
"""
from __future__ import annotations

import dataclasses
import hashlib
import json
import os
import re
import shutil
import sqlite3
import subprocess
from pathlib import Path, PurePosixPath
from typing import Any

from measure.business_operations_graph_baseline_snapshot import (
    SnapshotValidationError,
    verify_scan_bracketed_snapshot,
)


SCHEMA_VERSION = 2
TRANSACTION_SCHEMA_VERSION = 1
TOOL_NAME = "repo-graph"
TOOL_VERSION = "0.1.0"
TRACK_ID = "business_operations_graph_baseline_remediation_20260730"
COMPENSATION_LABEL = "COMPENSATION_REQUIRED"
EXPECTED_FIELD_KIND = "PropertyAssignment"
EXPECTED_ROUTE_KIND = "RouteHandler"
SCAN_CONFIG = {"customEdges": []}
SCAN_ARTIFACT_DIRECTORY = "r2-task2-scan-transaction-v2-20260801"
EVIDENCE_FILENAME = "r2-task2-compensation-denominator-v2-20260801.json"
R1_BUNDLE_DIRECTORY = "r1-task2-source-and-graph-v2-20260801"
R1_GRAPH_BINDING_PATH = "r1-task3-graph-binding-v2-20260801.json"
ATTEMPT_PATH = "r2-clean-audit-attempt-v2-20260801/attempt.json"
RESOLVER_SHIM_PATH = "node_modules/@reading-advantage/config"
RESOLVER_SHIM_TARGET = "../../packages/config"
SHA256_RE = re.compile(r"[0-9a-f]{64}\Z")


class CompensationError(RuntimeError):
    """Base class for compensation producer errors."""


class CompensationValidationError(CompensationError):
    """Raised when compensation inputs or published evidence fail closed."""


@dataclasses.dataclass(frozen=True)
class _NodePosition:
    """The resolved source span for one graph declaration."""

    line_start: int
    line_end: int


def _canonical(value: Any) -> bytes:
    """Returns canonical JSON bytes used by evidence digests.

    @param value The JSON-compatible value to serialize.
    @returns The stable UTF-8 JSON encoding.
    """
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _sha(data: bytes) -> str:
    """Returns the SHA-256 digest of bytes.

    @param data The bytes to hash.
    @returns The lowercase hexadecimal SHA-256 digest.
    """
    return hashlib.sha256(data).hexdigest()


def _sha_file(path: Path) -> tuple[str, int]:
    """Returns the digest and size of a regular artifact file.

    @param path The file to hash.
    @returns The SHA-256 digest and byte length.
    """
    data = path.read_bytes()
    return _sha(data), len(data)


def _fail(code: str, detail: str = "") -> None:
    """Raises a stable fail-closed compensation error.

    @param code The machine-readable rejection code.
    @param detail Optional human-readable context.
    @returns This function never returns.
    @throws CompensationValidationError Always.
    """
    raise CompensationValidationError(f"{code}{': ' + detail if detail else ''}")


def _is_sha256(value: Any) -> bool:
    """Reports whether a value is a lowercase SHA-256 digest.

    @param value The value to check.
    @returns Whether the value is an exact SHA-256 digest.
    """
    return isinstance(value, str) and SHA256_RE.fullmatch(value) is not None


def _normalize_repo_path(value: Any) -> str:
    """Validates and returns a canonical repository-relative POSIX path.

    @param value The untrusted path value.
    @returns The validated path.
    @throws CompensationValidationError When the path is not canonical and relative.
    """
    if not isinstance(value, str) or not value or "\x00" in value or "\\" in value:
        _fail("PATH_INVALID", repr(value))
    path = PurePosixPath(value)
    if path.is_absolute() or not path.parts or any(part in {"", ".", ".."} for part in path.parts):
        _fail("PATH_INVALID", value)
    if ":" in path.parts[0] or path.as_posix() != value:
        _fail("PATH_INVALID", value)
    return value


def _relative_artifact_path(value: Any) -> str:
    """Validates an evidence-local relative artifact path.

    @param value The artifact path to validate.
    @returns The normalized artifact path.
    @throws CompensationValidationError When the artifact path is unsafe.
    """
    return _normalize_repo_path(value)


def _safe_track_file(track_dir: Path, relative_path: str) -> Path:
    """Resolves an evidence-local artifact while prohibiting path escape.

    @param track_dir The owning track directory.
    @param relative_path The validated evidence-relative path.
    @returns The safely resolved file path.
    @throws CompensationValidationError When the path escapes the track directory.
    """
    root = track_dir.resolve(strict=True)
    candidate = (root / relative_path).resolve(strict=False)
    try:
        candidate.relative_to(root)
    except ValueError:
        _fail("ARTIFACT_PATH_INVALID", relative_path)
    return candidate


def _artifact_reference(path: Path, track_dir: Path) -> dict[str, Any]:
    """Builds an immutable track-relative reference for an output file.

    @param path The artifact to reference.
    @param track_dir The owning track directory.
    @returns The path, SHA-256, and size reference.
    @throws CompensationValidationError When the artifact is outside the track.
    """
    try:
        relative = path.resolve(strict=True).relative_to(track_dir.resolve(strict=True)).as_posix()
    except (FileNotFoundError, ValueError) as error:
        raise CompensationValidationError("ARTIFACT_PATH_INVALID") from error
    sha, size = _sha_file(path)
    return {"path": relative, "sha256": sha, "size": size}


def _load_artifact(reference: Any, track_dir: Path) -> Path:
    """Validates one exact hash-bound artifact from the track directory.

    @param reference The immutable artifact reference.
    @param track_dir The owning track directory.
    @returns The validated regular artifact path.
    @throws CompensationValidationError When the reference or artifact is invalid.
    """
    if not isinstance(reference, dict) or set(reference) != {"path", "sha256", "size"}:
        _fail("ARTIFACT_REFERENCE_INVALID")
    relative = _relative_artifact_path(reference.get("path"))
    if not _is_sha256(reference.get("sha256")) or not isinstance(reference.get("size"), int) or reference["size"] < 0:
        _fail("ARTIFACT_REFERENCE_INVALID", relative)
    path = _safe_track_file(track_dir, relative)
    if not path.is_file() or path.is_symlink():
        _fail("REQUIRED_ARTIFACT_MISSING", relative)
    sha, size = _sha_file(path)
    if sha != reference["sha256"] or size != reference["size"]:
        _fail("ARTIFACT_REFERENCE_MISMATCH", relative)
    return path


def _load_artifact_json(reference: Any, track_dir: Path) -> dict[str, Any]:
    """Loads one exact hash-bound JSON artifact from the track directory.

    @param reference The immutable artifact reference.
    @param track_dir The owning track directory.
    @returns The parsed JSON object.
    @throws CompensationValidationError When the reference or artifact is invalid.
    """
    path = _load_artifact(reference, track_dir)
    relative = reference["path"]
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise CompensationValidationError(f"ARTIFACT_JSON_INVALID: {relative}") from error
    if not isinstance(value, dict):
        _fail("ARTIFACT_JSON_INVALID", relative)
    return value


def _load_attempt(track_dir: Path) -> dict[str, Any]:
    """Loads and validates the accepted R2 clean-audit attempt envelope.

    @param track_dir The owning track directory.
    @returns The accepted clean-audit attempt.
    @throws CompensationValidationError When the attempt is malformed or not compensation-bound.
    """
    path = _safe_track_file(track_dir, ATTEMPT_PATH)
    if not path.is_file() or path.is_symlink():
        _fail("ATTEMPT_MISSING")
    try:
        attempt = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise CompensationValidationError("ATTEMPT_INVALID") from error
    if not isinstance(attempt, dict) or attempt.get("schemaVersion") != 1 or attempt.get("track") != TRACK_ID:
        _fail("ATTEMPT_INVALID")
    if attempt.get("tool") != {"name": TOOL_NAME, "version": TOOL_VERSION}:
        _fail("ATTEMPT_INVALID")
    if attempt.get("sourceBundle") != _source_bundle_reference(track_dir):
        _fail("ATTEMPT_SOURCE_BUNDLE_INVALID")
    audit = attempt.get("audit")
    decision = attempt.get("decision")
    if not isinstance(audit, dict) or audit.get("exitCode") != 1 or not isinstance(audit.get("unaudited"), list):
        _fail("ATTEMPT_INVALID")
    if decision != {
        "branch": COMPENSATION_LABEL,
        "cleanEligible": False,
        "reason": "audit exit 1 and non-empty unaudited symbol denominator",
    }:
        _fail("ATTEMPT_INVALID")
    if not audit["unaudited"]:
        _fail("ATTEMPT_INVALID")
    return attempt


def _load_replay(track_dir: Path) -> tuple[dict[str, bytes], dict[str, Any]]:
    """Verifies the accepted R1 bundle and returns its replayed source bytes.

    @param track_dir The owning track directory.
    @returns The replayed source map and verified manifest.
    @throws CompensationValidationError When accepted R1 evidence cannot be replayed.
    """
    bundle = _safe_track_file(track_dir, R1_BUNDLE_DIRECTORY)
    try:
        replay = verify_scan_bracketed_snapshot(bundle)
        manifest = json.loads((bundle / "snapshot.manifest.json").read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, SnapshotValidationError) as error:
        raise CompensationValidationError("R1_BUNDLE_INVALID") from error
    if not isinstance(manifest, dict) or not isinstance(manifest.get("entries"), list):
        _fail("R1_BUNDLE_INVALID")
    if len(replay) != len(manifest["entries"]) or not replay:
        _fail("R1_BUNDLE_INVALID")
    return replay, manifest


def _audit_prefix(unaudited: list[dict[str, Any]]) -> str:
    """Returns the shared absolute audit path prefix for all unaudited nodes.

    @param unaudited The clean-audit unaudited symbol rows.
    @returns The common materialization prefix.
    @throws CompensationValidationError When paths lack a common safe prefix.
    """
    paths = [entry.get("file_path") for entry in unaudited]
    if not paths or not all(isinstance(path, str) and path.startswith("/") for path in paths):
        _fail("AUDIT_PATH_INVALID")
    prefix = os.path.commonpath(paths)
    if not prefix or prefix == "/":
        _fail("AUDIT_PATH_INVALID")
    return prefix.rstrip("/") + "/"


def _audit_relative_path(file_path: Any, prefix: str) -> str:
    """Converts one audit-prefixed file path to a validated relative source path.

    @param file_path The absolute path emitted by the clean audit.
    @param prefix The shared materialization prefix.
    @returns The repository-relative source path.
    @throws CompensationValidationError When the audit path escapes its prefix.
    """
    if not isinstance(file_path, str) or not file_path.startswith(prefix):
        _fail("AUDIT_PATH_INVALID", str(file_path))
    return _normalize_repo_path(file_path[len(prefix):])


def _normalized_node_id(node_id: str, absolute_file_path: str, relpath: str) -> str:
    """Rewrites an audit node ID to the corresponding source-relative scan ID.

    @param node_id The absolute-path audit node ID.
    @param absolute_file_path The audit record file path.
    @param relpath The canonical source-relative file path.
    @returns The source-relative node ID.
    @throws CompensationValidationError When the ID does not bind its file path.
    """
    if not isinstance(node_id, str) or absolute_file_path not in node_id:
        _fail("NODE_ID_PATH_MISMATCH")
    return node_id.replace(absolute_file_path, relpath, 1)


def resolve_route_position(
    relpath: str,
    line_start: int | None,
    line_end: int | None,
    replay: dict[str, bytes],
) -> tuple[_NodePosition, str]:
    """Resolves a route span, allowing a full-file fallback only for page.tsx.

    @param relpath The source-relative route path.
    @param line_start The scanner start line, if it was available.
    @param line_end The scanner end line, if it was available.
    @param replay The frozen source bytes indexed by relative path.
    @returns The source span and its scanner or page-fallback provenance.
    @throws CompensationValidationError When a null span is not an eligible page route.
    """
    relpath = _normalize_repo_path(relpath)
    if relpath not in replay:
        _fail("PATH_NOT_IN_REPLAY", relpath)
    if line_start is None or line_end is None:
        if line_start is not None or line_end is not None:
            _fail("SCAN_POSITION_INVALID", relpath)
        if PurePosixPath(relpath).name != "page.tsx":
            _fail("NULL_SPAN_FALLBACK_NON_PAGE", relpath)
        line_count = len(replay[relpath].splitlines(keepends=True))
        if line_count < 1:
            _fail("NULL_SPAN_FALLBACK_EMPTY_PAGE", relpath)
        return _NodePosition(1, line_count), "page-file-fallback"
    if not isinstance(line_start, int) or not isinstance(line_end, int) or line_start < 1 or line_end < line_start:
        _fail("SCAN_POSITION_INVALID", relpath)
    return _NodePosition(line_start, line_end), "scanner-span"


def _source_range(replay: dict[str, bytes], relpath: str, position: _NodePosition) -> bytes:
    """Returns the exact frozen bytes within a validated inclusive source span.

    @param replay The frozen source bytes indexed by relative path.
    @param relpath The source-relative path.
    @param position The inclusive source span.
    @returns The source bytes in the declared range.
    @throws CompensationValidationError When the span lies outside the source file.
    """
    lines = replay.get(relpath, b"").splitlines(keepends=True)
    if position.line_start < 1 or position.line_end > len(lines):
        _fail("SOURCE_RANGE_OUT_OF_BOUNDS", relpath)
    result = b"".join(lines[position.line_start - 1 : position.line_end])
    if not result:
        _fail("SOURCE_RANGE_EMPTY", relpath)
    return result


def _normalize_db_inventory(db_path: Path) -> dict[str, Any]:
    """Extracts a source-relative file, route, and field inventory from one graph DB.

    @param db_path The newly produced graph database.
    @returns The normalized graph inventory.
    @throws CompensationValidationError When the graph database is incomplete.
    """
    if not db_path.is_file() or db_path.is_symlink():
        _fail("SCAN_GRAPH_ARTIFACT_MISSING", db_path.name)
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    try:
        root_row = conn.execute("SELECT value FROM meta WHERE key = 'project_root'").fetchone()
        if root_row is None or not isinstance(root_row[0], str) or not root_row[0]:
            _fail("SCAN_GRAPH_PROJECT_ROOT_INVALID", db_path.name)
        project_root = root_row[0].rstrip("/") + "/"
        file_rows = conn.execute("SELECT path, content_hash, size FROM files ORDER BY path").fetchall()
        route_rows = conn.execute(
            "SELECT id, name, file_path, line_start, line_end FROM nodes WHERE type = 'route' ORDER BY id"
        ).fetchall()
        field_rows = conn.execute(
            "SELECT id, name, file_path, line_start, line_end FROM nodes WHERE type = 'field' ORDER BY id"
        ).fetchall()
    except sqlite3.Error as error:
        raise CompensationValidationError("SCAN_GRAPH_QUERY_FAILED") from error
    finally:
        conn.close()

    def strip_path(value: Any) -> str:
        if not isinstance(value, str) or not value.startswith(project_root):
            _fail("SCAN_GRAPH_PATH_INVALID", str(value))
        return _normalize_repo_path(value[len(project_root):])

    def strip_id(node_id: Any) -> str:
        if not isinstance(node_id, str) or ":" not in node_id:
            _fail("SCAN_GRAPH_NODE_ID_INVALID")
        head, tail = node_id.split(":", 1)
        if not tail.startswith(project_root):
            _fail("SCAN_GRAPH_NODE_ID_INVALID")
        return f"{head}:{tail[len(project_root):]}"

    files = []
    for path, sha, size in file_rows:
        if not isinstance(sha, str) or not sha.startswith("sha256:") or not _is_sha256(sha[7:]) or not isinstance(size, int) or size < 0:
            _fail("SCAN_GRAPH_FILE_HASH_INVALID", str(path))
        files.append({"path": strip_path(path), "sha256": sha[7:], "size": size})
    routes = [
        {"id": strip_id(node_id), "name": name, "filePath": strip_path(file_path), "lineStart": line_start, "lineEnd": line_end}
        for node_id, name, file_path, line_start, line_end in route_rows
    ]
    fields = [
        {"id": strip_id(node_id), "name": name, "filePath": strip_path(file_path), "lineStart": line_start, "lineEnd": line_end}
        for node_id, name, file_path, line_start, line_end in field_rows
    ]
    for collection, code in ((files, "SCAN_GRAPH_DUPLICATE_FILE"), (routes, "SCAN_GRAPH_DUPLICATE_ROUTE"), (fields, "SCAN_GRAPH_DUPLICATE_FIELD")):
        key = "path" if collection is files else "id"
        if len({item[key] for item in collection}) != len(collection):
            _fail(code)
    return {"files": files, "routes": routes, "fields": fields}


def _inventory_digest(inventory: dict[str, Any]) -> str:
    """Returns the canonical digest of one normalized graph inventory.

    @param inventory The normalized graph inventory.
    @returns Its SHA-256 digest.
    """
    return _sha(_canonical(inventory))


def _write_json(path: Path, value: dict[str, Any]) -> None:
    """Writes deterministic JSON without allowing a symlink destination.

    @param path The destination path.
    @param value The JSON object to write.
    @returns Nothing.
    @throws CompensationValidationError When the destination already exists or is unsafe.
    """
    if path.exists() or path.is_symlink():
        _fail("OUTPUT_ARTIFACT_ALREADY_EXISTS", path.name)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(json.dumps(value, indent=2, sort_keys=True).encode("utf-8") + b"\n")


def _write_text(path: Path, value: str) -> None:
    """Writes command output without allowing a symlink destination.

    @param path The destination path.
    @param value The text to write.
    @returns Nothing.
    @throws CompensationValidationError When the destination already exists or is unsafe.
    """
    if path.exists() or path.is_symlink():
        _fail("OUTPUT_ARTIFACT_ALREADY_EXISTS", path.name)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, encoding="utf-8")


def _materialize_archive(root: Path, replay: dict[str, bytes], manifest: dict[str, Any]) -> None:
    """Materializes every accepted archive entry at one distinct external root.

    @param root The new source root to create.
    @param replay The accepted source bytes.
    @param manifest The accepted R1 source manifest.
    @returns Nothing.
    @throws CompensationValidationError When the destination or archive metadata is unsafe.
    """
    if root.exists() or root.is_symlink():
        _fail("SCAN_SOURCE_ROOT_REUSED", str(root))
    root.mkdir(parents=True, exist_ok=False)
    for entry in manifest["entries"]:
        relpath = _normalize_repo_path(entry.get("path"))
        destination = root / relpath
        if destination.exists() or destination.is_symlink() or relpath not in replay:
            _fail("SOURCE_MATERIALIZATION_COLLISION", relpath)
        destination.parent.mkdir(parents=True, exist_ok=True)
        if entry.get("kind") == "symlink":
            target = entry.get("symlinkTarget")
            if not isinstance(target, str):
                _fail("SOURCE_MATERIALIZATION_INVALID", relpath)
            destination.symlink_to(target)
        elif entry.get("kind") == "file":
            destination.write_bytes(replay[relpath])
        else:
            _fail("SOURCE_MATERIALIZATION_INVALID", relpath)
        os.chmod(destination, int(str(entry["mode"])[-3:], 8), follow_symlinks=False)
    shim = root / RESOLVER_SHIM_PATH
    shim.parent.mkdir(parents=True, exist_ok=True)
    shim.symlink_to(RESOLVER_SHIM_TARGET)


def _materialized_bracket(root: Path, replay: dict[str, bytes], manifest: dict[str, Any]) -> dict[str, Any]:
    """Verifies all archive inputs at a materialized root and returns a bracket.

    @param root The materialized source root.
    @param replay The accepted source bytes.
    @param manifest The accepted R1 source manifest.
    @returns The complete-input bracket summary.
    @throws CompensationValidationError When any of the archive inputs drift.
    """
    expected = {_normalize_repo_path(entry["path"]): entry for entry in manifest["entries"]}
    shim = root / RESOLVER_SHIM_PATH
    if not shim.is_symlink() or os.readlink(shim) != RESOLVER_SHIM_TARGET:
        _fail("MATERIALIZED_RESOLVER_SHIM_DRIFT")
    actual: set[str] = set()
    for path in root.rglob("*"):
        if not path.is_file() and not path.is_symlink():
            continue
        relpath = _normalize_repo_path(path.relative_to(root).as_posix())
        actual.add(relpath)
        if relpath == RESOLVER_SHIM_PATH:
            if not path.is_symlink() or os.readlink(path) != RESOLVER_SHIM_TARGET:
                _fail("MATERIALIZED_RESOLVER_SHIM_DRIFT")
            actual.remove(relpath)
            continue
        entry = expected.get(relpath)
        if entry is None:
            _fail("MATERIALIZED_INPUT_EXTRA", relpath)
        if entry["kind"] == "symlink":
            if not path.is_symlink() or os.readlink(path) != entry["symlinkTarget"]:
                _fail("MATERIALIZED_INPUT_DRIFT", relpath)
        else:
            if path.is_symlink() or path.read_bytes() != replay[relpath]:
                _fail("MATERIALIZED_INPUT_DRIFT", relpath)
        mode = path.lstat().st_mode & 0o777
        if entry["kind"] == "file" and mode != int(str(entry["mode"])[-3:], 8):
            _fail("MATERIALIZED_INPUT_DRIFT", relpath)
    if actual != set(expected):
        _fail("MATERIALIZED_INPUT_MISSING")
    metadata = manifest["entries"]
    return {
        "entryCount": len(metadata),
        "entriesSha256": _sha(_canonical(metadata)),
        "denominatorSha256": manifest["denominatorSha256"],
        "resolverShim": f"{RESOLVER_SHIM_PATH} -> {RESOLVER_SHIM_TARGET}",
    }


def _run_scan(source_root: Path, db_path: Path, config_path: Path) -> tuple[list[str], str, str, int, str, int]:
    """Runs one fresh full repo-graph scan into a distinct external database.

    @param source_root The materialized source directory to scan.
    @param db_path The new external graph database destination.
    @param config_path The exact external scan configuration.
    @returns The command, stdout, stderr, exit code, graph digest, and graph size.
    @throws CompensationValidationError When a scan fails or reuses a database path.
    """
    if db_path.exists() or db_path.is_symlink():
        _fail("SCAN_GRAPH_ARTIFACT_REUSED", db_path.name)
    command = [TOOL_NAME, "scan", ".", f"../{db_path.name}", "--config", f"../{config_path.name}"]
    result = subprocess.run(command, cwd=source_root, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        detail = result.stderr.strip().replace("\n", " ")[:500]
        _fail("SCAN_COMMAND_FAILED", f"exit={result.returncode} {detail}")
    sha, size = _sha_file(db_path)
    if size < 1:
        _fail("SCAN_GRAPH_ARTIFACT_MISSING", db_path.name)
    return command, result.stdout, result.stderr, result.returncode, sha, size


def _inventory_artifact(inventory: dict[str, Any]) -> dict[str, Any]:
    """Wraps an inventory in its self-digesting durable artifact envelope.

    @param inventory The normalized inventory to preserve.
    @returns The durable inventory artifact object.
    """
    return {
        "schemaVersion": 1,
        "kind": "normalized-repo-graph-inventory",
        "inventory": inventory,
        "inventorySha256": _inventory_digest(inventory),
    }


def _load_inventory(reference: Any, track_dir: Path) -> tuple[dict[str, Any], str]:
    """Loads and validates a durable normalized inventory artifact.

    @param reference The inventory artifact reference.
    @param track_dir The owning track directory.
    @returns The normalized inventory and its digest.
    @throws CompensationValidationError When the inventory artifact is malformed.
    """
    artifact = _load_artifact_json(reference, track_dir)
    if set(artifact) != {"schemaVersion", "kind", "inventory", "inventorySha256"}:
        _fail("NORMALIZED_INVENTORY_INVALID")
    if artifact["schemaVersion"] != 1 or artifact["kind"] != "normalized-repo-graph-inventory":
        _fail("NORMALIZED_INVENTORY_INVALID")
    inventory = artifact["inventory"]
    if not isinstance(inventory, dict) or set(inventory) != {"files", "routes", "fields"}:
        _fail("NORMALIZED_INVENTORY_INVALID")
    if not all(isinstance(inventory[key], list) for key in inventory):
        _fail("NORMALIZED_INVENTORY_INVALID")
    digest = _inventory_digest(inventory)
    if artifact.get("inventorySha256") != digest:
        _fail("NORMALIZED_INVENTORY_DIGEST_DRIFT")
    return inventory, digest


def _scan_node_index(inventory: dict[str, Any], key: str) -> dict[str, dict[str, Any]]:
    """Indexes one normalized route or field inventory by stable node ID.

    @param inventory The normalized scan inventory.
    @param key The route or field collection name.
    @returns The stable-ID node index.
    @throws CompensationValidationError When nodes are malformed or duplicate.
    """
    index: dict[str, dict[str, Any]] = {}
    for node in inventory[key]:
        if not isinstance(node, dict) or set(node) != {"id", "name", "filePath", "lineStart", "lineEnd"}:
            _fail("NORMALIZED_INVENTORY_INVALID")
        node_id = node.get("id")
        if not isinstance(node_id, str) or node_id in index:
            _fail("NORMALIZED_INVENTORY_DUPLICATE_NODE")
        _normalize_repo_path(node.get("filePath"))
        index[node_id] = node
    return index


def _reconciliation_entry(
    audit_node: dict[str, Any],
    position: _NodePosition,
    provenance: str,
    relpath: str,
    replay: dict[str, bytes],
) -> dict[str, Any]:
    """Builds one strict source-anchored compensation reconciliation entry.

    @param audit_node The clean-audit symbol row.
    @param position The graph-derived source span.
    @param provenance The scanner or explicit page fallback provenance.
    @param relpath The canonical source-relative path.
    @param replay The accepted frozen source bytes.
    @returns The deterministic reconciliation entry.
    """
    kind = EXPECTED_FIELD_KIND if audit_node["type"] == "field" else EXPECTED_ROUTE_KIND
    anchor = {
        "kind": kind,
        "lineEnd": position.line_end,
        "lineStart": position.line_start,
        "name": audit_node["name"],
        "path": relpath,
    }
    return {
        "anchorProvenance": provenance,
        "declarationAnchor": anchor,
        "fingerprint": _sha(_canonical(anchor)),
        "id": audit_node["id"],
        "lineEnd": position.line_end,
        "lineStart": position.line_start,
        "name": audit_node["name"],
        "path": relpath,
        "sourceRangeSha256": _sha(_source_range(replay, relpath, position)),
    }


def _source_bundle_reference(track_dir: Path) -> dict[str, Any]:
    """Builds references to the accepted R1 source bundle inputs.

    @param track_dir The owning track directory.
    @returns The immutable R1 archive, manifest, and review references.
    """
    bundle = track_dir / R1_BUNDLE_DIRECTORY
    graph_binding = _safe_track_file(track_dir, R1_GRAPH_BINDING_PATH)
    if not graph_binding.is_file() or graph_binding.is_symlink():
        _fail("R1_GRAPH_BINDING_MISSING")
    return {
        "archive": _artifact_reference(bundle / "snapshot.archive.json", track_dir),
        "manifest": _artifact_reference(bundle / "snapshot.manifest.json", track_dir),
        "graphBinding": _artifact_reference(graph_binding, track_dir),
    }


def build_compensation_evidence(
    track_dir: Path | str,
    *,
    work_root: Path | str,
    output_directory: Path | str,
) -> dict[str, Any]:
    """Runs two fresh archive-bound scans and writes durable compensation artifacts.

    @param track_dir The owning track containing accepted R1/R2 inputs.
    @param work_root A new external directory for source materializations and ephemeral DBs.
    @param output_directory A new R2-owned directory for durable transaction artifacts.
    @returns The generated evidence object after it passes strict validation.
    @throws CompensationValidationError When inputs drift, scans fail, or output is unsafe.
    """
    track = Path(track_dir).resolve(strict=True)
    work = Path(work_root).resolve(strict=False)
    output = Path(output_directory).resolve(strict=False)
    try:
        output.relative_to(track)
    except ValueError:
        _fail("OUTPUT_DIRECTORY_NOT_TRACK_OWNED")
    if work == track or track in work.parents:
        _fail("WORK_ROOT_MUST_BE_EXTERNAL")
    if work.exists() or work.is_symlink() or output.is_symlink() or (output.exists() and (not output.is_dir() or any(output.iterdir()))):
        _fail("TRANSACTION_DESTINATION_REUSED")
    attempt = _load_attempt(track)
    replay, manifest = _load_replay(track)
    if len(manifest["entries"]) != len(replay):
        _fail("R1_BUNDLE_INVALID")
    work.mkdir(parents=True, exist_ok=False)
    output.mkdir(parents=True, exist_ok=True)
    completed = False
    try:
        config_path = work / "scan-config-v1.json"
        config_path.write_bytes(json.dumps(SCAN_CONFIG, indent=2, sort_keys=True).encode("utf-8") + b"\n")
        source_one = work / "scan-one-source"
        source_two = work / "scan-two-source"
        _materialize_archive(source_one, replay, manifest)
        _materialize_archive(source_two, replay, manifest)
        bracket_one_pre = _materialized_bracket(source_one, replay, manifest)
        bracket_two_pre = _materialized_bracket(source_two, replay, manifest)
        command_one, stdout_one, stderr_one, exit_one, graph_one_sha, graph_one_size = _run_scan(
            source_one, work / "scan-1.db", config_path
        )
        bracket_one_post = _materialized_bracket(source_one, replay, manifest)
        command_two, stdout_two, stderr_two, exit_two, graph_two_sha, graph_two_size = _run_scan(
            source_two, work / "scan-2.db", config_path
        )
        bracket_two_post = _materialized_bracket(source_two, replay, manifest)
        if bracket_one_pre != bracket_one_post or bracket_two_pre != bracket_two_post or bracket_one_pre != bracket_two_pre:
            _fail("MATERIALIZED_INPUT_DRIFT")
        if graph_one_sha == graph_two_sha:
            _fail("SAME_SCAN_ARTIFACT_REUSED")
        inventory_one = _normalize_db_inventory(work / "scan-1.db")
        inventory_two = _normalize_db_inventory(work / "scan-2.db")
        digest_one = _inventory_digest(inventory_one)
        digest_two = _inventory_digest(inventory_two)
        if digest_one != digest_two:
            _fail("TWO_SCAN_INVENTORY_DRIFT")

        config_output = output / "scan-config-v1.json"
        config_output.write_bytes(config_path.read_bytes())
        stdout_one_path = output / "scan-1.stdout.txt"
        stderr_one_path = output / "scan-1.stderr.txt"
        stdout_two_path = output / "scan-2.stdout.txt"
        stderr_two_path = output / "scan-2.stderr.txt"
        _write_text(stdout_one_path, stdout_one)
        _write_text(stderr_one_path, stderr_one)
        _write_text(stdout_two_path, stdout_two)
        _write_text(stderr_two_path, stderr_two)
        inventory_one_path = output / "scan-1-normalized-inventory-v1.json"
        inventory_two_path = output / "scan-2-normalized-inventory-v1.json"
        _write_json(inventory_one_path, _inventory_artifact(inventory_one))
        _write_json(inventory_two_path, _inventory_artifact(inventory_two))

        unaudited = attempt["audit"]["unaudited"]
        prefix = _audit_prefix(unaudited)
        route_index = _scan_node_index(inventory_one, "routes")
        field_index = _scan_node_index(inventory_one, "fields")
        fields: list[dict[str, Any]] = []
        routes: list[dict[str, Any]] = []
        for node in unaudited:
            if not isinstance(node, dict) or node.get("type") not in {"field", "route"}:
                _fail("ATTEMPT_INVALID")
            relpath = _audit_relative_path(node.get("file_path"), prefix)
            normalized_id = _normalized_node_id(node.get("id"), node["file_path"], relpath)
            if node["type"] == "route":
                graph_node = route_index.get(normalized_id)
                if graph_node is None or graph_node["name"] != node.get("name") or graph_node["filePath"] != relpath:
                    _fail("SCAN_NODE_MISSING", normalized_id)
                position, provenance = resolve_route_position(
                    relpath, graph_node["lineStart"], graph_node["lineEnd"], replay
                )
                routes.append(_reconciliation_entry(node, position, provenance, relpath, replay))
            else:
                graph_node = field_index.get(normalized_id)
                if graph_node is None or graph_node["name"] != node.get("name") or graph_node["filePath"] != relpath:
                    _fail("SCAN_NODE_MISSING", normalized_id)
                line_start = graph_node["lineStart"]
                line_end = graph_node["lineEnd"]
                if not isinstance(line_start, int) or not isinstance(line_end, int) or line_start < 1 or line_end < line_start:
                    _fail("SCAN_POSITION_INVALID", normalized_id)
                fields.append(_reconciliation_entry(node, _NodePosition(line_start, line_end), "scanner-span", relpath, replay))

        evidence = {
            "schemaVersion": SCHEMA_VERSION,
            "track": TRACK_ID,
            "phase": "Phase R2 Task 2 — compensation denominator reconciliation",
            "tool": {"name": TOOL_NAME, "version": TOOL_VERSION},
            "frozen": True,
            "sourceBundle": _source_bundle_reference(track),
            "manifest": {
                "path": "snapshot.manifest.json",
                "denominatorSha256": manifest["denominatorSha256"],
                "entryCount": len(manifest["entries"]),
            },
            "auditPreserved": {
                "exitCode": attempt["audit"]["exitCode"],
                "decision": attempt["decision"]["branch"],
                "cleanEligible": attempt["decision"]["cleanEligible"],
                "reason": attempt["decision"]["reason"],
            },
            "scanTransaction": {
                "schemaVersion": TRANSACTION_SCHEMA_VERSION,
                "sourceEntryCount": len(manifest["entries"]),
                "sourceDenominatorSha256": manifest["denominatorSha256"],
                "scanConfig": _artifact_reference(config_output, track),
                "scan1": {
                    "command": command_one,
                    "workingDirectory": "scan-one-source",
                    "exitCode": exit_one,
                    "stdout": _artifact_reference(stdout_one_path, track),
                    "stderr": _artifact_reference(stderr_one_path, track),
                    "graphArtifact": {"ephemeralPath": "scan-1.db", "sha256": graph_one_sha, "size": graph_one_size, "retained": False},
                    "inputBracket": {"pre": bracket_one_pre, "post": bracket_one_post},
                    "normalizedInventory": _artifact_reference(inventory_one_path, track),
                    "inventorySha256": digest_one,
                },
                "scan2": {
                    "command": command_two,
                    "workingDirectory": "scan-two-source",
                    "exitCode": exit_two,
                    "stdout": _artifact_reference(stdout_two_path, track),
                    "stderr": _artifact_reference(stderr_two_path, track),
                    "graphArtifact": {"ephemeralPath": "scan-2.db", "sha256": graph_two_sha, "size": graph_two_size, "retained": False},
                    "inputBracket": {"pre": bracket_two_pre, "post": bracket_two_post},
                    "normalizedInventory": _artifact_reference(inventory_two_path, track),
                    "inventorySha256": digest_two,
                },
                "normalizedInventory": {
                    "fileCount": len(inventory_one["files"]),
                    "routeCount": len(inventory_one["routes"]),
                    "fieldCount": len(inventory_one["fields"]),
                    "inventorySha256": digest_one,
                },
            },
            "unauditedDenominator": {
                "label": COMPENSATION_LABEL,
                "auditPrefix": prefix,
                "fieldCount": len(fields),
                "routeCount": len(routes),
                "totalCount": len(fields) + len(routes),
                "symbolsSha256": _sha(_canonical(unaudited)),
                "fieldReconciliation": fields,
                "routeReconciliation": routes,
                "firstInventorySha256": digest_one,
                "secondInventorySha256": digest_two,
                "limitation": "repo-graph audit exits 1 with a non-empty unaudited route/field denominator; compensation preserves exact source anchors and independently scanned normalized inventories.",
                "toolLimitation": True,
            },
        }
        validate_compensation_evidence(evidence, track_dir=track)
        completed = True
        return evidence
    finally:
        shutil.rmtree(work, ignore_errors=True)
        if not completed:
            shutil.rmtree(output, ignore_errors=True)


def publish_compensation_evidence(
    track_dir: Path | str,
    *,
    work_root: Path | str,
    output_directory: Path | str,
) -> dict[str, Any]:
    """Builds, validates, and atomically publishes one R2 compensation evidence file.

    @param track_dir The owning track containing accepted R1/R2 inputs.
    @param work_root A new external directory for source materializations and ephemeral DBs.
    @param output_directory A new R2-owned directory for durable transaction artifacts.
    @returns The published evidence object.
    @throws CompensationValidationError When the transaction or destination is unsafe.
    """
    track = Path(track_dir).resolve(strict=True)
    evidence = build_compensation_evidence(
        track, work_root=work_root, output_directory=output_directory
    )
    validate_compensation_evidence(evidence, track_dir=track)
    destination = track / EVIDENCE_FILENAME
    if destination.is_symlink() or (destination.exists() and not destination.is_file()):
        _fail("EVIDENCE_DESTINATION_INVALID")
    temporary = track / f".{EVIDENCE_FILENAME}.tmp"
    if temporary.exists() or temporary.is_symlink():
        _fail("EVIDENCE_DESTINATION_INVALID")
    try:
        temporary.write_bytes(json.dumps(evidence, indent=2, sort_keys=True).encode("utf-8") + b"\n")
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)
    return evidence


def _validate_source_bundle(evidence: dict[str, Any], track_dir: Path, manifest: dict[str, Any]) -> None:
    """Validates evidence references to accepted immutable R1 source artifacts.

    @param evidence The candidate evidence object.
    @param track_dir The owning track directory.
    @param manifest The verified R1 manifest.
    @returns Nothing.
    @throws CompensationValidationError When source artifact references drift.
    """
    references = evidence.get("sourceBundle")
    if not isinstance(references, dict) or set(references) != {"archive", "manifest", "graphBinding"}:
        _fail("SOURCE_BUNDLE_REFERENCE_INVALID")
    expected = _source_bundle_reference(track_dir)
    if references != expected:
        _fail("SOURCE_BUNDLE_REFERENCE_INVALID")
    evidence_manifest = evidence.get("manifest")
    if evidence_manifest != {
        "path": "snapshot.manifest.json",
        "denominatorSha256": manifest["denominatorSha256"],
        "entryCount": len(manifest["entries"]),
    }:
        _fail("SOURCE_MANIFEST_BINDING_INVALID")


def _validate_scan_transaction(transaction: Any, track_dir: Path, manifest: dict[str, Any], replay: dict[str, bytes]) -> tuple[dict[str, Any], dict[str, Any], str]:
    """Validates durable two-scan provenance and returns both inventories.

    @param transaction The candidate scan transaction.
    @param track_dir The owning track directory.
    @param manifest The verified R1 manifest.
    @param replay The verified R1 source bytes.
    @returns The first and second inventories plus their shared digest.
    @throws CompensationValidationError When a scan is reused, incomplete, or unbound.
    """
    expected_keys = {"schemaVersion", "sourceEntryCount", "sourceDenominatorSha256", "scanConfig", "scan1", "scan2", "normalizedInventory"}
    if not isinstance(transaction, dict) or set(transaction) != expected_keys:
        _fail("SCAN_TRANSACTION_INVALID")
    if transaction["schemaVersion"] != TRANSACTION_SCHEMA_VERSION or transaction["sourceEntryCount"] != len(manifest["entries"]) or transaction["sourceDenominatorSha256"] != manifest["denominatorSha256"]:
        _fail("SCAN_TRANSACTION_SOURCE_BINDING_INVALID")
    config = _load_artifact_json(transaction["scanConfig"], track_dir)
    if config != SCAN_CONFIG:
        _fail("SCAN_CONFIG_INVALID")
    expected_bracket = {
        "entryCount": len(manifest["entries"]),
        "entriesSha256": _sha(_canonical(manifest["entries"])),
        "denominatorSha256": manifest["denominatorSha256"],
        "resolverShim": f"{RESOLVER_SHIM_PATH} -> {RESOLVER_SHIM_TARGET}",
    }
    scans: list[tuple[dict[str, Any], dict[str, Any], str]] = []
    for label, expected_root, expected_db in (("scan1", "scan-one-source", "scan-1.db"), ("scan2", "scan-two-source", "scan-2.db")):
        scan = transaction.get(label)
        expected_scan_keys = {"command", "workingDirectory", "exitCode", "stdout", "stderr", "graphArtifact", "inputBracket", "normalizedInventory", "inventorySha256"}
        if not isinstance(scan, dict) or set(scan) != expected_scan_keys:
            _fail("REQUIRED_ARTIFACT_MISSING", label)
        if scan["workingDirectory"] != expected_root or scan["exitCode"] != 0:
            _fail("SCAN_COMMAND_BINDING_INVALID", label)
        expected_command = [TOOL_NAME, "scan", ".", f"../{expected_db}", "--config", "../scan-config-v1.json"]
        if scan["command"] != expected_command:
            _fail("SCAN_COMMAND_BINDING_INVALID", label)
        _load_artifact(scan["stdout"], track_dir)
        _load_artifact(scan["stderr"], track_dir)
        graph = scan["graphArtifact"]
        if not isinstance(graph, dict) or set(graph) != {"ephemeralPath", "sha256", "size", "retained"}:
            _fail("SCAN_GRAPH_REFERENCE_INVALID", label)
        if graph["ephemeralPath"] != expected_db or not _is_sha256(graph["sha256"]) or not isinstance(graph["size"], int) or graph["size"] < 1 or graph["retained"] is not False:
            _fail("SCAN_GRAPH_REFERENCE_INVALID", label)
        bracket = scan["inputBracket"]
        if not isinstance(bracket, dict) or set(bracket) != {"pre", "post"} or bracket["pre"] != expected_bracket or bracket["post"] != expected_bracket:
            _fail("SCAN_INPUT_BRACKET_INVALID", label)
        inventory, digest = _load_inventory(scan["normalizedInventory"], track_dir)
        if scan["inventorySha256"] != digest:
            _fail("NORMALIZED_INVENTORY_DIGEST_DRIFT", label)
        for file_row in inventory["files"]:
            if not isinstance(file_row, dict) or set(file_row) != {"path", "sha256", "size"}:
                _fail("NORMALIZED_INVENTORY_INVALID")
            path = _normalize_repo_path(file_row["path"])
            if path not in replay or file_row["sha256"] != _sha(replay[path]) or file_row["size"] != len(replay[path]):
                _fail("SCAN_FILE_NOT_BOUND_TO_ARCHIVE", f"{path} graph={file_row['sha256']}/{file_row['size']} archive={_sha(replay.get(path, b''))}/{len(replay.get(path, b''))}")
        scans.append((scan, inventory, digest))
    scan_one, inventory_one, digest_one = scans[0]
    scan_two, inventory_two, digest_two = scans[1]
    if scan_one["graphArtifact"] == scan_two["graphArtifact"] or scan_one["graphArtifact"]["sha256"] == scan_two["graphArtifact"]["sha256"]:
        _fail("SAME_SCAN_ARTIFACT_REUSED")
    if digest_one != digest_two or inventory_one != inventory_two:
        _fail("TWO_SCAN_INVENTORY_DRIFT")
    normalized = transaction["normalizedInventory"]
    expected_normalized = {
        "fileCount": len(inventory_one["files"]),
        "routeCount": len(inventory_one["routes"]),
        "fieldCount": len(inventory_one["fields"]),
        "inventorySha256": digest_one,
    }
    if normalized != expected_normalized:
        _fail("NORMALIZED_INVENTORY_SUMMARY_INVALID")
    return inventory_one, inventory_two, digest_one


def _validate_entry(
    entry: Any,
    audit_node: dict[str, Any],
    expected_kind: str,
    expected_position: _NodePosition,
    expected_provenance: str,
    relpath: str,
    replay: dict[str, bytes],
) -> None:
    """Validates one reconciliation entry against audit, scan, and source bytes.

    @param entry The evidence reconciliation entry.
    @param audit_node The corresponding clean-audit row.
    @param expected_kind The declaration kind required by the node type.
    @param expected_position The scan-derived span.
    @param expected_provenance The scan or fallback provenance.
    @param relpath The expected source-relative path.
    @param replay The accepted frozen source bytes.
    @returns Nothing.
    @throws CompensationValidationError When any anchor attribute is altered.
    """
    required = {"anchorProvenance", "declarationAnchor", "fingerprint", "id", "lineEnd", "lineStart", "name", "path", "sourceRangeSha256"}
    if not isinstance(entry, dict) or set(entry) != required:
        _fail("RECONCILIATION_ENTRY_INVALID")
    anchor = entry["declarationAnchor"]
    if not isinstance(anchor, dict) or set(anchor) != {"kind", "lineEnd", "lineStart", "name", "path"}:
        _fail("DECLARATION_ANCHOR_INVALID")
    if entry["id"] != audit_node["id"]:
        _fail("RECONCILIATION_ID_MISMATCH")
    if entry["path"] != anchor["path"] or entry["path"] != relpath:
        _fail("PATH_MISMATCH")
    if entry["name"] != anchor["name"] or entry["name"] != audit_node["name"]:
        _fail("NAME_MISMATCH")
    if entry["lineStart"] != anchor["lineStart"] or entry["lineEnd"] != anchor["lineEnd"] or (entry["lineStart"], entry["lineEnd"]) != (expected_position.line_start, expected_position.line_end):
        _fail("SPAN_MISMATCH")
    if anchor["kind"] != expected_kind:
        _fail("ANCHOR_KIND_MISMATCH")
    if entry["anchorProvenance"] != expected_provenance:
        _fail("ANCHOR_PROVENANCE_MISMATCH")
    fingerprint = _sha(_canonical(anchor))
    if entry["fingerprint"] != fingerprint:
        _fail("FINGERPRINT_MISMATCH")
    if entry["sourceRangeSha256"] != _sha(_source_range(replay, relpath, expected_position)):
        _fail("SOURCE_RANGE_HASH_MISMATCH")


def _validate_denominator(
    denominator: Any,
    attempt: dict[str, Any],
    inventory: dict[str, Any],
    replay: dict[str, bytes],
) -> None:
    """Validates the complete unaudited compensation denominator.

    @param denominator The candidate compensation denominator.
    @param attempt The accepted clean-audit attempt.
    @param inventory The first fresh scan inventory.
    @param replay The accepted frozen source bytes.
    @returns Nothing.
    @throws CompensationValidationError When any omission, duplicate, or tamper is found.
    """
    required = {"label", "auditPrefix", "fieldCount", "routeCount", "totalCount", "symbolsSha256", "fieldReconciliation", "routeReconciliation", "firstInventorySha256", "secondInventorySha256", "limitation", "toolLimitation"}
    if not isinstance(denominator, dict) or set(denominator) != required:
        _fail("COMPENSATION_DENOMINATOR_INVALID")
    if denominator["label"] != COMPENSATION_LABEL or denominator["toolLimitation"] is not True or not isinstance(denominator["limitation"], str):
        _fail("COMPENSATION_LABEL_LOST")
    unaudited = attempt["audit"]["unaudited"]
    prefix = _audit_prefix(unaudited)
    if denominator["auditPrefix"] != prefix:
        _fail("AUDIT_PREFIX_MISMATCH")
    expected_digest = _sha(_canonical(unaudited))
    if denominator["symbolsSha256"] != expected_digest:
        _fail("COMPENSATION_SYMBOLS_DIGEST_DRIFT")
    fields = denominator["fieldReconciliation"]
    routes = denominator["routeReconciliation"]
    if not isinstance(fields, list) or not isinstance(routes, list):
        _fail("COMPENSATION_DENOMINATOR_INVALID")
    field_ids = [entry.get("id") if isinstance(entry, dict) else None for entry in fields]
    route_ids = [entry.get("id") if isinstance(entry, dict) else None for entry in routes]
    if set(field_ids) & set(route_ids):
        _fail("CROSS_PARTITION_DUPLICATE")
    if len(field_ids) != len(set(field_ids)) or len(route_ids) != len(set(route_ids)):
        _fail("DUPLICATE_RECONCILIATION_ID")
    expected_fields = [node for node in unaudited if node["type"] == "field"]
    expected_routes = [node for node in unaudited if node["type"] == "route"]
    if len(fields) != len(expected_fields) or denominator["fieldCount"] != len(expected_fields):
        _fail("FIELD_RECONCILIATION_INCOMPLETE")
    if len(routes) != len(expected_routes) or denominator["routeCount"] != len(expected_routes):
        _fail("ROUTE_RECONCILIATION_INCOMPLETE")
    if denominator["totalCount"] != len(unaudited) or denominator["totalCount"] != denominator["fieldCount"] + denominator["routeCount"]:
        _fail("COMPENSATION_DENOMINATOR_COUNT_MISMATCH")
    route_index = _scan_node_index(inventory, "routes")
    field_index = _scan_node_index(inventory, "fields")
    evidence_by_id = {entry["id"]: entry for entry in [*fields, *routes]}
    if set(evidence_by_id) != {node["id"] for node in unaudited}:
        _fail("RECONCILIATION_ID_SET_MISMATCH")
    for node in unaudited:
        relpath = _audit_relative_path(node["file_path"], prefix)
        stable_id = _normalized_node_id(node["id"], node["file_path"], relpath)
        entry = evidence_by_id[node["id"]]
        if node["type"] == "route":
            scan_node = route_index.get(stable_id)
            if scan_node is None or scan_node["name"] != node["name"] or scan_node["filePath"] != relpath:
                _fail("SCAN_NODE_MISSING", stable_id)
            position, provenance = resolve_route_position(relpath, scan_node["lineStart"], scan_node["lineEnd"], replay)
            _validate_entry(entry, node, EXPECTED_ROUTE_KIND, position, provenance, relpath, replay)
        else:
            scan_node = field_index.get(stable_id)
            if scan_node is None or scan_node["name"] != node["name"] or scan_node["filePath"] != relpath:
                _fail("SCAN_NODE_MISSING", stable_id)
            if not isinstance(scan_node["lineStart"], int) or not isinstance(scan_node["lineEnd"], int):
                _fail("SCAN_POSITION_INVALID", stable_id)
            position = _NodePosition(scan_node["lineStart"], scan_node["lineEnd"])
            _validate_entry(entry, node, EXPECTED_FIELD_KIND, position, "scanner-span", relpath, replay)


def validate_compensation_evidence(evidence: Any, *, track_dir: Path | str) -> None:
    """Strictly validates published R2 compensation evidence against accepted inputs.

    @param evidence The evidence object to validate.
    @param track_dir The owning track directory containing immutable inputs and artifacts.
    @returns Nothing when the evidence is valid.
    @throws CompensationValidationError When any provenance, scan, or anchor check fails.
    """
    track = Path(track_dir).resolve(strict=True)
    required = {"schemaVersion", "track", "phase", "tool", "frozen", "sourceBundle", "manifest", "auditPreserved", "scanTransaction", "unauditedDenominator"}
    if not isinstance(evidence, dict) or set(evidence) != required:
        _fail("EVIDENCE_SCHEMA_INVALID")
    if evidence["schemaVersion"] != SCHEMA_VERSION or evidence["track"] != TRACK_ID or evidence["phase"] != "Phase R2 Task 2 — compensation denominator reconciliation" or evidence["tool"] != {"name": TOOL_NAME, "version": TOOL_VERSION} or evidence["frozen"] is not True:
        _fail("EVIDENCE_METADATA_INVALID")
    attempt = _load_attempt(track)
    replay, manifest = _load_replay(track)
    _validate_source_bundle(evidence, track, manifest)
    expected_audit = {
        "exitCode": attempt["audit"]["exitCode"],
        "decision": attempt["decision"]["branch"],
        "cleanEligible": attempt["decision"]["cleanEligible"],
        "reason": attempt["decision"]["reason"],
    }
    if evidence["auditPreserved"] != expected_audit:
        _fail("AUDIT_PRESERVATION_MISMATCH")
    inventory_one, _inventory_two, digest = _validate_scan_transaction(
        evidence["scanTransaction"], track, manifest, replay
    )
    denominator = evidence["unauditedDenominator"]
    if isinstance(denominator, dict) and (denominator.get("firstInventorySha256") != digest or denominator.get("secondInventorySha256") != digest):
        _fail("TWO_SCAN_INVENTORY_DRIFT")
    _validate_denominator(denominator, attempt, inventory_one, replay)


__all__ = [
    "COMPENSATION_LABEL",
    "CompensationError",
    "CompensationValidationError",
    "EXPECTED_FIELD_KIND",
    "EXPECTED_ROUTE_KIND",
    "SCAN_ARTIFACT_DIRECTORY",
    "SCHEMA_VERSION",
    "TRACK_ID",
    "build_compensation_evidence",
    "publish_compensation_evidence",
    "resolve_route_position",
    "validate_compensation_evidence",
]
