"""Mechanical v2 blocker-addendum producer for the R1 v3 closure.

This module is deliberately independent of the live repository source tree.
It decodes only the accepted v2 archive into a short-lived external root,
derives static input reads there, and writes addendum evidence that preserves
the historical v2 blocker without treating it as an accepted v3 closure.
"""
from __future__ import annotations

import base64
import copy
import hashlib
import json
import os
import re
import shlex
import stat
import subprocess
import sys
import tempfile
from pathlib import Path, PurePosixPath
from typing import Any

from . import business_operations_graph_baseline_execution_closure as core


# Capture the original validator before the main helper re-exports this module.
_LEGACY_VALIDATE = core.validate_execution_closure_blocker_addendum_v1
_SOURCE_SUFFIXES = (".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs")
_REPO_ROOT = core.TRACK_DIR.parents[2]
_FR4_ENTRYPOINTS = (
    "apps/accounts/package.json#test",
    "apps/accounts/package.json#check-types",
    "packages/backend/package.json#test",
    "packages/backend/package.json#check-types",
    "apps/accounts/scripts/production-readiness.test.ts",
    "packages/backend/src/modules/company-identity/__tests__/postgres-codecamp-migration.test.ts",
    "packages/db/src/company-identity/doctor.ts",
    "packages/backend/src/modules/standard-pack-ingestion/__tests__/postgres-successor-registry.integration.test.ts",
)
_STANDARD_PACK_CATALOG = "packages/advantage-play-kit/assets/standard/standard-pack-release.json"


def _sha256(data: bytes) -> str:
    """Returns a lowercase SHA-256 digest.

    @param data The bytes to hash.
    @returns The digest in lowercase hexadecimal form.
    """
    return hashlib.sha256(data).hexdigest()


def _canonical(value: Any) -> bytes:
    """Serializes a JSON-compatible value deterministically.

    @param value The value to serialize.
    @returns Canonical UTF-8 JSON bytes.
    """
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _fail(code: str, detail: str = "") -> None:
    """Raises a structured execution-closure failure.

    @param code The stable error identifier.
    @param detail Optional bounded context.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError Always.
    """
    suffix = f": {detail}" if detail else ""
    raise core.ExecutionClosureValidationError(f"{code}{suffix}")


def _normal_path(value: str) -> str:
    """Returns one canonical root-relative POSIX path.

    @param value The candidate logical path.
    @returns The validated path.
    @throws core.ExecutionClosureValidationError When the path is unsafe.
    """
    path = PurePosixPath(value)
    if not value or path.is_absolute() or path.as_posix() != value or any(part in {"", ".", ".."} for part in path.parts):
        _fail("EXECUTION_DISCOVERY_PATH_INVALID", value)
    return value


def _relative(root: Path, path: Path) -> str:
    """Returns a resolved path relative to a frozen root.

    @param root The frozen source root.
    @param path The candidate path.
    @returns The root-relative logical path.
    @throws core.ExecutionClosureValidationError When resolution escapes the root.
    """
    try:
        return _normal_path(path.resolve(strict=False).relative_to(root.resolve()).as_posix())
    except ValueError:
        _fail("EXECUTION_DISCOVERY_PATH_ESCAPE", str(path))


def _safe_source(root: Path, logical_path: str) -> tuple[Path, str]:
    """Reads one regular UTF-8 source file inside the frozen root.

    @param root The frozen source root.
    @param logical_path The root-relative source path.
    @returns The source path and decoded text.
    @throws core.ExecutionClosureValidationError When the source is missing or unsafe.
    """
    logical_path = _normal_path(logical_path)
    path = root / logical_path
    if not path.is_file() or path.is_symlink() or _relative(root, path) != logical_path:
        _fail("EXECUTION_DISCOVERY_SOURCE_UNAVAILABLE", logical_path)
    try:
        return path, path.read_text(encoding="utf-8")
    except UnicodeDecodeError as error:
        _fail("EXECUTION_DISCOVERY_SOURCE_NOT_TEXT", f"{logical_path}: {error}")


def _command_ranges(script: str) -> list[tuple[str, int, int]]:
    """Splits a script into literal commands without accepting opaque shell flow.

    @param script The package script body.
    @returns Literal command ranges in source order.
    @throws core.ExecutionClosureValidationError When shell control flow is unresolved.
    """
    if "||" in script or "|" in script or ">" in script or "<" in script or "`" in script or "$(" in script:
        _fail("EXECUTION_DISCOVERY_SHELL_CONTROL_UNRESOLVED")
    result: list[tuple[str, int, int]] = []
    start = 0
    for separator in re.finditer(r"&&|;", script):
        fragment = script[start:separator.start()]
        trimmed = fragment.strip()
        if trimmed:
            left = start + len(fragment) - len(fragment.lstrip())
            result.append((trimmed, left, left + len(trimmed)))
        start = separator.end()
    fragment = script[start:]
    trimmed = fragment.strip()
    if trimmed:
        left = start + len(fragment) - len(fragment.lstrip())
        result.append((trimmed, left, left + len(trimmed)))
    if not result:
        _fail("EXECUTION_DISCOVERY_EMPTY_SCRIPT")
    return result


def _resolve_local_module(root: Path, source_path: str, specifier: str) -> str | None:
    """Resolves a literal relative TypeScript/JavaScript import.

    @param root The frozen source root.
    @param source_path The importing source path.
    @param specifier The literal module specifier.
    @returns A resolved logical source path, if one exists.
    """
    if not specifier.startswith("."):
        return None
    candidate = (root / source_path).parent / specifier
    candidates = [candidate]
    if candidate.suffix == "":
        candidates.extend(candidate.with_suffix(suffix) for suffix in _SOURCE_SUFFIXES)
        candidates.extend(candidate / f"index{suffix}" for suffix in _SOURCE_SUFFIXES)
    for item in candidates:
        if item.is_file() and not item.is_symlink():
            return _relative(root, item)
    return None


def discover_execution_inputs_v1(
    root: Path | str,
    entrypoints: list[str],
    *,
    follow_script_sources: bool = True,
) -> dict[str, Any]:
    """Derives every literal file input reachable from declared execution entrypoints.

    @param root The frozen source root, never the shared worktree.
    @param entrypoints Package-script selectors or source files to inspect.
    @returns Literal present and missing inputs, command expansion, and trace rows.
    @throws core.ExecutionClosureValidationError When a file input is dynamic or unsafe.
    """
    source_root = Path(root)
    if not source_root.is_dir() or source_root.is_symlink():
        _fail("EXECUTION_DISCOVERY_ROOT_INVALID", str(source_root))
    if not isinstance(entrypoints, list) or not entrypoints or not all(isinstance(item, str) and item for item in entrypoints):
        _fail("EXECUTION_DISCOVERY_ENTRYPOINTS_INVALID")

    inputs: dict[str, dict[str, Any]] = {}
    missing: dict[str, dict[str, Any]] = {}
    traces: list[dict[str, Any]] = []
    expansion: list[dict[str, Any]] = []
    scanned_sources: set[str] = set()
    expanding_scripts: set[tuple[str, str]] = set()

    def record(
        source_path: str,
        start: int,
        end: int,
        candidate: Path,
        kind: str,
        *,
        resolution_start: int | None = None,
        resolution_end: int | None = None,
    ) -> None:
        logical_path = _relative(source_root, candidate)
        _, source = _safe_source(source_root, source_path)
        trace_id = f"trace-{len(traces):04d}"
        if (resolution_start is None) != (resolution_end is None):
            _fail("EXECUTION_DISCOVERY_TRACE_RANGE_INVALID", source_path)
        if (
            resolution_start is not None
            and resolution_end is not None
            and (resolution_start < 0 or resolution_end < resolution_start or resolution_end > len(source))
        ):
            _fail("EXECUTION_DISCOVERY_TRACE_RANGE_INVALID", source_path)
        trace = {
            "id": trace_id,
            "kind": kind,
            "sourcePath": source_path,
            "sourceRangeSha256": _sha256(source[start:end].encode("utf-8")),
            "logicalPath": logical_path,
        }
        if resolution_start is not None and resolution_end is not None:
            trace["resolutionSourceRangeSha256"] = _sha256(
                source[resolution_start:resolution_end].encode("utf-8")
            )
        traces.append(trace)
        observed = source_root / logical_path
        if observed.is_file() and not observed.is_symlink() and _relative(source_root, observed) == logical_path:
            data = observed.read_bytes()
            inputs[logical_path] = {
                "logicalPath": logical_path,
                "sha256": _sha256(data),
                "size": len(data),
                "resolutionTraceId": trace_id,
            }
        else:
            missing_row = missing.get(logical_path)
            if missing_row is None:
                missing[logical_path] = {
                    "logicalPath": logical_path,
                    "resolutionTraceId": trace_id,
                    "resolutionTraceIds": [trace_id],
                }
            else:
                trace_ids = missing_row.get("resolutionTraceIds")
                if not isinstance(trace_ids, list) or not all(isinstance(item, str) for item in trace_ids):
                    _fail("EXECUTION_DISCOVERY_TRACE_RELATION_INVALID", logical_path)
                if trace_id not in trace_ids:
                    trace_ids.append(trace_id)
                # Preserve the prior last-observed singular field for compatibility.
                missing_row["resolutionTraceId"] = trace_ids[-1]

    def literal_path(base: Path, value: str, source_path: str, start: int, end: int, kind: str) -> None:
        escaped_newline = "\\n"
        if escaped_newline in value:
            if value.count(escaped_newline) != 1 or not value.endswith(escaped_newline):
                _fail("EXECUTION_DISCOVERY_SHELL_LITERAL_INVALID", source_path)
            value = value[:-len(escaped_newline)]
        if (
            not value
            or "\n" in value
            or "\r" in value
            or "\\" in value
            or "$" in value
            or "*" in value
            or "?" in value
            or "[" in value
        ):
            _fail("EXECUTION_DISCOVERY_DYNAMIC_PATH", source_path)
        record(source_path, start, end, (base / value).resolve(strict=False), kind)

    def scan_source(source_path: str) -> None:
        if source_path in scanned_sources:
            return
        scanned_sources.add(source_path)
        source_file, text = _safe_source(source_root, source_path)
        if re.search(r"(?:globSync|glob|fastGlob|fast-glob)\s*\(", text):
            _fail("EXECUTION_DISCOVERY_DYNAMIC_INPUT", f"{source_path}:glob")
        if re.search(r"(?:readFileSync|readFile)\s*\(\s*process\.env", text):
            _fail("EXECUTION_DISCOVERY_DYNAMIC_INPUT", f"{source_path}:process.env")
        if re.search(r"new\s+URL\s*\(\s*process\.env", text):
            _fail("EXECUTION_DISCOVERY_DYNAMIC_INPUT", f"{source_path}:process.env")

        bases: dict[str, Path] = {}
        url_bindings: dict[str, tuple[Path, int, int]] = {}
        for match in re.finditer(
            r"(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+URL\s*\(\s*(['\"])(.*?)\2\s*,\s*import\.meta\.url\s*,?\s*\)",
            text,
            re.DOTALL,
        ):
            literal = match.group(3)
            if not literal or "$" in literal or "*" in literal or "?" in literal or "[" in literal:
                _fail("EXECUTION_DISCOVERY_DYNAMIC_PATH", source_path)
            url_bindings[match.group(1)] = (
                (source_file.parent / literal).resolve(strict=False),
                match.start(),
                match.end(),
            )
        for match in re.finditer(
            r"(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:resolve\(\s*import\.meta\.dirname|fileURLToPath\(\s*new\s+URL\()\s*,?\s*(['\"])(.*?)\2",
            text,
            re.DOTALL,
        ):
            bases[match.group(1)] = (source_file.parent / match.group(3)).resolve(strict=False)
        for match in re.finditer(
            r"(?:readFileSync|readFile)\s*\(\s*new\s+URL\s*\(\s*(['\"])(.*?)\1\s*,\s*import\.meta\.url\s*\)",
            text,
            re.DOTALL,
        ):
            literal_path(source_file.parent, match.group(2), source_path, match.start(), match.end(), "new-url-read")
        for match in re.finditer(
            r"(?:readFileSync|readFile)\s*\(\s*([A-Za-z_$][\w$]*)\s*(?:,|\))",
            text,
        ):
            binding = url_bindings.get(match.group(1))
            if binding is None:
                _fail("EXECUTION_DISCOVERY_DYNAMIC_PATH", source_path)
            target, assignment_start, assignment_end = binding
            line_start = text.rfind("\n", 0, match.start()) + 1
            line_end = text.find("\n", match.end())
            if line_end < 0:
                line_end = len(text)
            record(
                source_path,
                line_start,
                line_end,
                target,
                "bound-new-url-read",
                resolution_start=assignment_start,
                resolution_end=assignment_end,
            )
        for match in re.finditer(
            r"(?:readFileSync|readFile)\s*\(\s*resolve\s*\(\s*import\.meta\.dirname\s*,\s*(['\"])(.*?)\1",
            text,
            re.DOTALL,
        ):
            literal_path(source_file.parent, match.group(2), source_path, match.start(), match.end(), "dirname-resolve-read")
        for match in re.finditer(
            r"(?:readFileSync|readFile)\s*\(\s*resolve\s*\(\s*([A-Za-z_$][\w$]*)\s*,\s*(['\"])(.*?)\2",
            text,
            re.DOTALL,
        ):
            base = bases.get(match.group(1))
            if base is None:
                _fail("EXECUTION_DISCOVERY_DYNAMIC_PATH", source_path)
            literal_path(base, match.group(3), source_path, match.start(), match.end(), "bound-resolve-read")
        for match in re.finditer(
            r"(?:readFileSync|readFile)\s*\(\s*`\$\{([A-Za-z_$][\w$]*)\}([^$`]+)`",
            text,
            re.DOTALL,
        ):
            base = bases.get(match.group(1))
            if base is None:
                _fail("EXECUTION_DISCOVERY_DYNAMIC_PATH", source_path)
            literal_path(base, match.group(2), source_path, match.start(), match.end(), "bound-template-read")
        for match in re.finditer(
            r"(?:readFileSync|readFile)\s*\(\s*`\$\{([A-Za-z_$][\w$]*)\}\$\{entry\.tag\}([^$`]+)`",
            text,
            re.DOTALL,
        ):
            base = bases.get(match.group(1))
            if base is None:
                _fail("EXECUTION_DISCOVERY_DYNAMIC_PATH", source_path)
            tags = sorted(set(re.findall(r"case\s+['\"]([^'\"]+)['\"]\s*:", text)))
            if not tags:
                _fail("EXECUTION_DISCOVERY_DYNAMIC_PATH", source_path)
            for tag in tags:
                literal_path(base, f"{tag}{match.group(2)}", source_path, match.start(), match.end(), "finite-tag-template-read")
        for match in re.finditer(r"(?:import|export)\s+(?:[^'\"]*?\s+from\s+)?(['\"])(\.[^'\"]+)\1", text):
            resolved = _resolve_local_module(source_root, source_path, match.group(2))
            if resolved is not None:
                scan_source(resolved)
        if source_path.endswith(".sh"):
            for match in re.finditer(r"(?:--file|-f)\s+(?:(['\"])(.*?)\1|([^\s]+))", text):
                literal = match.group(2) if match.group(1) is not None else match.group(3)
                if literal is None:
                    _fail("EXECUTION_DISCOVERY_SHELL_FILE_UNRESOLVED", source_path)
                literal_path(source_root, literal, source_path, match.start(), match.end(), "shell-sql-file")

    def add_expansion(entrypoint: str, argv: list[str], source_range: bytes, expanded_from: str) -> None:
        expansion.append(
            {
                "ordinal": len(expansion),
                "entrypoint": entrypoint,
                "argv": argv,
                "expandedFrom": expanded_from,
                "sourceRangeSha256": _sha256(source_range),
            }
        )

    def expand_script(package_path: str, name: str, expanded_from: str) -> None:
        key = (package_path, name)
        if key in expanding_scripts:
            _fail("EXECUTION_DISCOVERY_SCRIPT_CYCLE", f"{package_path}#{name}")
        expanding_scripts.add(key)
        package_file, package_text = _safe_source(source_root, package_path)
        try:
            command_text = json.loads(package_text)["scripts"][name]
        except (KeyError, TypeError, json.JSONDecodeError) as error:
            _fail("EXECUTION_DISCOVERY_SCRIPT_UNRESOLVED", f"{package_path}#{name}: {error}")
        if not isinstance(command_text, str):
            _fail("EXECUTION_DISCOVERY_SCRIPT_UNRESOLVED", f"{package_path}#{name}")
        offset = package_text.find(command_text)
        if offset < 0:
            _fail("EXECUTION_DISCOVERY_SCRIPT_RANGE_UNRESOLVED", f"{package_path}#{name}")
        selector = f"{package_path}#{name}"
        for command, left, right in _command_ranges(command_text):
            if "$" in command:
                _fail("EXECUTION_DISCOVERY_DYNAMIC_COMMAND", selector)
            try:
                argv = shlex.split(command)
            except ValueError as error:
                _fail("EXECUTION_DISCOVERY_COMMAND_PARSE", str(error))
            if not argv:
                _fail("EXECUTION_DISCOVERY_EMPTY_COMMAND", selector)
            add_expansion(selector, argv, package_text[offset + left:offset + right].encode("utf-8"), expanded_from)
            if len(argv) == 3 and argv[:2] == ["pnpm", "run"]:
                expand_script(package_path, argv[2], selector)
            elif argv[0] in {"node", "tsx", "ts-node", "sh", "bash"} and len(argv) >= 2:
                target = argv[1]
                if target.startswith("-") or "$" in target:
                    _fail("EXECUTION_DISCOVERY_DYNAMIC_COMMAND", selector)
                if follow_script_sources:
                    scan_source(_relative(source_root, package_file.parent / target))
        expanding_scripts.remove(key)

    for entrypoint in entrypoints:
        if "#" in entrypoint:
            package_path, name = entrypoint.split("#", 1)
            _normal_path(package_path)
            if not name:
                _fail("EXECUTION_DISCOVERY_ENTRYPOINT_INVALID", entrypoint)
            expand_script(package_path, name, entrypoint)
        else:
            scan_source(_normal_path(entrypoint))
    result = {
        "algorithm": "frozen-ast-import-export-static-path-v2",
        "inputs": [inputs[path] for path in sorted(inputs)],
        "missingInputs": [missing[path] for path in sorted(missing)],
        "entrypointExpansion": expansion,
        "resolutionTrace": traces,
    }
    result["rowDigest"] = _sha256(_canonical(result))
    return result


def _read_archive() -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Reads the pinned v2 archive without consulting the shared source tree.

    @returns The archive object and its sorted entry list.
    @throws core.ExecutionClosureValidationError When the archive is malformed.
    """
    try:
        archive = json.loads(core.V2_ARCHIVE.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        _fail("V3_BLOCKER_ADDENDUM_ARCHIVE_UNREADABLE", str(error))
    entries = archive.get("entries") if isinstance(archive, dict) else None
    if not isinstance(entries, list) or not entries:
        _fail("V3_BLOCKER_ADDENDUM_ARCHIVE_SCHEMA")
    result = sorted(entries, key=lambda item: item.get("path", ""))
    if [item.get("path") for item in result] != sorted({_normal_path(item.get("path", "")) for item in entries}):
        _fail("V3_BLOCKER_ADDENDUM_ARCHIVE_SCHEMA")
    return archive, result


def _inventory(entries: list[dict[str, Any]]) -> dict[str, Any]:
    """Builds an immutable source-inventory digest from archive metadata.

    @param entries The frozen archive entries.
    @returns A compact inventory object used for pre/post proof.
    """
    rows = [
        {key: item[key] for key in ("kind", "mode", "path", "sha256", "size", "state")}
        for item in entries
    ]
    return {"entryCount": len(rows), "sha256": _sha256(_canonical(rows))}


def _materialize(root: Path, entries: list[dict[str, Any]]) -> None:
    """Materializes frozen archive bytes at a unique external root.

    @param root The nonexistent external source root to create.
    @param entries The pinned archive entries.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError When source materialization is unsafe.
    """
    root.mkdir(parents=True, exist_ok=False)
    for entry in entries:
        logical = _normal_path(entry["path"])
        destination = root / logical
        if destination.exists() or destination.is_symlink():
            _fail("V3_BLOCKER_ADDENDUM_MATERIALIZATION_COLLISION", logical)
        destination.parent.mkdir(parents=True, exist_ok=True)
        kind = entry.get("kind")
        if kind == "symlink":
            target = entry.get("symlinkTarget")
            if not isinstance(target, str):
                _fail("V3_BLOCKER_ADDENDUM_MATERIALIZATION_SCHEMA", logical)
            destination.symlink_to(target)
            continue
        if kind != "file" or not isinstance(entry.get("contentBase64"), str):
            _fail("V3_BLOCKER_ADDENDUM_MATERIALIZATION_SCHEMA", logical)
        try:
            data = base64.b64decode(entry["contentBase64"], validate=True)
        except ValueError as error:
            _fail("V3_BLOCKER_ADDENDUM_MATERIALIZATION_DECODE", str(error))
        if len(data) != entry.get("size") or _sha256(data) != entry.get("sha256"):
            _fail("V3_BLOCKER_ADDENDUM_MATERIALIZATION_DIGEST", logical)
        destination.write_bytes(data)
        os.chmod(destination, int(str(entry.get("mode", "100644"))[-3:], 8))


def _verify_replay(root: Path, entries: list[dict[str, Any]]) -> dict[str, list[str]]:
    """Checks replay bytes and path containment after external materialization.

    @param root The materialized frozen source root.
    @param entries The pinned archive entries.
    @returns The realpath overlay audit, empty only for a safe replay.
    @throws core.ExecutionClosureValidationError When bytes or paths drift.
    """
    outside: list[str] = []
    worktree_refs: list[str] = []
    node_modules: list[str] = []
    for entry in entries:
        logical = _normal_path(entry["path"])
        path = root / logical
        if entry.get("kind") == "symlink":
            if not path.is_symlink() or os.readlink(path) != entry.get("symlinkTarget"):
                _fail("V3_BLOCKER_ADDENDUM_REPLAY_DRIFT", logical)
        elif not path.is_file() or path.is_symlink() or _sha256(path.read_bytes()) != entry.get("sha256"):
            _fail("V3_BLOCKER_ADDENDUM_REPLAY_DRIFT", logical)
        try:
            path.resolve(strict=False).relative_to(root.resolve())
        except ValueError:
            outside.append(logical)
        if "node_modules" in Path(logical).parts:
            node_modules.append(logical)
        if str(_REPO_ROOT) in str(path.resolve(strict=False)):
            worktree_refs.append(logical)
    return {
        "outsideMaterializationRoot": sorted(outside),
        "sourceWorktreeReferences": sorted(worktree_refs),
        "nodeModulesOverlayPaths": sorted(node_modules),
    }


def _tool_versions() -> dict[str, dict[str, Any]]:
    """Records the exact local tool identities without network access.

    @returns Version command provenance for Node, pnpm, and repo-graph.
    @throws core.ExecutionClosureValidationError When a required tool is unavailable.
    """
    result: dict[str, dict[str, Any]] = {}
    for name, argv in {
        "node": ["node", "--version"],
        "pnpm": ["pnpm", "--version"],
        "scanner": ["repo-graph", "--version"],
    }.items():
        command = subprocess.run(argv, cwd=_REPO_ROOT, capture_output=True, text=True, check=False)
        stdout = command.stdout.strip() or command.stderr.strip()
        if command.returncode != 0 or not stdout:
            _fail("V3_BLOCKER_ADDENDUM_TOOL_UNAVAILABLE", name)
        result[name] = {"argv": argv, "stdout": stdout, "stdoutSha256": _sha256(stdout.encode("utf-8"))}
    return result


def _stage_materialize(root: Path) -> dict[str, Any]:
    """Materializes the pinned v2 archive at one fresh external root.

    @param root The new external materialization destination.
    @returns The materialized archive entry count and inventory.
    @throws core.ExecutionClosureValidationError When the destination is unsafe.
    """
    _, entries = _read_archive()
    if root.exists() or root.is_symlink():
        _fail("V3_BLOCKER_ADDENDUM_STAGE_ROOT_REUSED", str(root))
    _materialize(root, entries)
    return {"entryCount": len(entries), "inventory": _inventory(entries)}


def _stage_replay(root: Path) -> dict[str, Any]:
    """Replays and containment-checks the v2 archive at an external root.

    @param root The existing external materialization root.
    @returns The replayed entry count, inventory, and realpath audit.
    @throws core.ExecutionClosureValidationError When the root is unsafe.
    """
    _, entries = _read_archive()
    if not root.is_dir() or root.is_symlink():
        _fail("V3_BLOCKER_ADDENDUM_STAGE_ROOT_INVALID", str(root))
    return {"entryCount": len(entries), "inventory": _inventory(entries), "realpathAudit": _verify_replay(root, entries)}


def _stage_discover(root: Path) -> dict[str, Any]:
    """Derives merged FR4 and standard-pack inputs from one verified frozen root.

    @param root The existing external materialization root.
    @returns The merged discovery result, generator trace, and realpath audit.
    @throws core.ExecutionClosureValidationError When replay or static discovery is unsafe.
    """
    _, entries = _read_archive()
    if not root.is_dir() or root.is_symlink():
        _fail("V3_BLOCKER_ADDENDUM_STAGE_ROOT_INVALID", str(root))
    audit = _verify_replay(root, entries)
    if any(audit.values()):
        _fail("V3_BLOCKER_ADDENDUM_REPLAY_PROOF_INVALID")
    fr4_discovery = discover_execution_inputs_v1(root, list(_FR4_ENTRYPOINTS))
    generator_discovery = discover_execution_inputs_v1(
        root,
        ["packages/advantage-play-kit/package.json#generate:standard-pack-catalog"],
        follow_script_sources=False,
    )
    discovery, generator_trace = _merge_generator_discovery(fr4_discovery, generator_discovery)
    return {
        "discovery": discovery,
        "generatorTrace": generator_trace,
        "realpathAudit": audit,
    }


def _run_stage(stage: str, root: Path) -> dict[str, Any]:
    """Runs one real no-network child stage with a CI-only scrubbed environment.

    @param stage The explicit materialization or replay stage name.
    @param root The external root that stage receives.
    @returns Captured command provenance before stream files are written.
    """
    argv = [
        sys.executable,
        "-B",
        "-m",
        "measure.business_operations_graph_baseline_execution_closure_addendum_v2",
        stage,
        "--root",
        str(root),
    ]
    result = subprocess.run(
        argv,
        cwd=_REPO_ROOT,
        env={"CI": "true"},
        capture_output=True,
        text=True,
        check=False,
    )
    return {
        "argv": argv,
        "cwd": ".",
        "env": {"CI": "true"},
        "envAbsent": ["PG_TEST_URL"],
        "network": False,
        "exitCode": result.returncode,
        "stdoutText": result.stdout,
        "stderrText": result.stderr,
    }


def _require_stage_success(stage: str, command: dict[str, Any]) -> dict[str, Any]:
    """Parses an actual stage result or fails closed before evidence publication.

    @param stage The completed child-stage name.
    @param command The raw captured command record.
    @returns The parsed JSON stage result.
    @throws core.ExecutionClosureValidationError When the stage does not exit cleanly.
    """
    if command["exitCode"] != 0:
        _fail("V3_BLOCKER_ADDENDUM_STAGE_FAILED", stage)
    try:
        value = json.loads(command["stdoutText"])
    except json.JSONDecodeError as error:
        _fail("V3_BLOCKER_ADDENDUM_STAGE_OUTPUT_INVALID", f"{stage}: {error}")
    if not isinstance(value, dict):
        _fail("V3_BLOCKER_ADDENDUM_STAGE_OUTPUT_INVALID", stage)
    return value


def _write_raw(directory: Path, name: str, value: str) -> dict[str, Any]:
    """Writes one generated raw stream and returns its track-relative reference.

    @param directory The addendum output directory.
    @param name The deterministic raw stream filename.
    @param value The raw stream text.
    @returns A digest-valid track-relative reference.
    """
    path = directory / "raw" / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, encoding="utf-8")
    return core._reference_for(path)


def _merge_generator_discovery(
    fr4: dict[str, Any], generator: dict[str, Any]
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Binds the actual standard-pack package-script range into FR4 discovery.

    @param fr4 The static discovery result for the required FR4 entrypoints.
    @param generator The static discovery result for the catalog generator script.
    @returns The merged discovery result and the generator source trace.
    @throws core.ExecutionClosureValidationError When the literal generator command is absent.
    """
    merged = copy.deepcopy(fr4)
    node_row = next(
        (
            row for row in generator["entrypointExpansion"]
            if row["argv"] == ["node", "scripts/generate-standard-pack-release.mjs"]
        ),
        None,
    )
    if node_row is None:
        _fail("V3_BLOCKER_ADDENDUM_STANDARD_PACK_SCRIPT_UNRESOLVED")
    offset = len(merged["entrypointExpansion"])
    for row in generator["entrypointExpansion"]:
        merged["entrypointExpansion"].append({**row, "ordinal": offset + row["ordinal"]})
    trace = {
        "id": "trace-standard-pack-generator",
        "kind": "package-script-generator",
        "sourcePath": "packages/advantage-play-kit/package.json",
        "sourceRangeSha256": node_row["sourceRangeSha256"],
        "logicalPath": _STANDARD_PACK_CATALOG,
    }
    merged["resolutionTrace"].append(trace)
    rows = {
        key: merged[key]
        for key in ("algorithm", "inputs", "missingInputs", "entrypointExpansion", "resolutionTrace")
    }
    merged["rowDigest"] = _sha256(_canonical(rows))
    return merged, trace


def _missing_omissions(
    discovery: dict[str, Any], generator_trace: dict[str, Any]
) -> list[dict[str, Any]]:
    """Converts all observed frozen static traces into omission rows.

    @param discovery The merged frozen static discovery record.
    @param generator_trace The actual standard-pack package-script source trace.
    @returns Trace-bound source omissions plus recorded derived-output requirements.
    @throws core.ExecutionClosureValidationError When a mandatory static input is untraced.
    """
    traces: dict[str, dict[str, Any]] = {}
    for trace in discovery["resolutionTrace"]:
        trace_id = trace.get("id") if isinstance(trace, dict) else None
        if not isinstance(trace_id, str) or trace_id in traces:
            _fail("V3_BLOCKER_ADDENDUM_TRACE_UNRESOLVED", str(trace_id))
        traces[trace_id] = trace
    missing: dict[str, dict[str, Any]] = {}
    for item in discovery["missingInputs"]:
        path = item.get("logicalPath") if isinstance(item, dict) else None
        if not isinstance(path, str) or path in missing:
            _fail("V3_BLOCKER_ADDENDUM_TRACE_UNRESOLVED", str(path))
        missing[path] = item
    required_static = set(core.NON_DERIVABLE_INPUTS) - {_STANDARD_PACK_CATALOG}
    absent = sorted(required_static - set(missing))
    if absent:
        _fail("V3_BLOCKER_ADDENDUM_REQUIRED_STATIC_TRACE_MISSING", ",".join(absent))
    rows: list[dict[str, Any]] = []
    for path, item in sorted(missing.items()):
        trace_ids = item.get("resolutionTraceIds")
        if (
            not isinstance(trace_ids, list)
            or not trace_ids
            or not all(isinstance(trace_id, str) for trace_id in trace_ids)
            or len(trace_ids) != len(set(trace_ids))
            or item.get("resolutionTraceId") != trace_ids[-1]
        ):
            _fail("V3_BLOCKER_ADDENDUM_TRACE_UNRESOLVED", path)
        required_by: list[dict[str, Any]] = []
        for trace_id in trace_ids:
            trace = traces.get(trace_id)
            if trace is None or trace.get("logicalPath") != path:
                _fail("V3_BLOCKER_ADDENDUM_TRACE_UNRESOLVED", path)
            source_path = trace.get("sourcePath")
            source_range = trace.get("sourceRangeSha256")
            if not isinstance(source_path, str) or not re.fullmatch(r"[0-9a-f]{64}", str(source_range)):
                _fail("V3_BLOCKER_ADDENDUM_TRACE_UNRESOLVED", path)
            required = {
                "sourcePath": source_path,
                "sourceRangeSha256": source_range,
                "resolutionTraceId": trace_id,
            }
            resolution_range = trace.get("resolutionSourceRangeSha256")
            if trace.get("kind") == "bound-new-url-read":
                if not re.fullmatch(r"[0-9a-f]{64}", str(resolution_range)):
                    _fail("V3_BLOCKER_ADDENDUM_TRACE_UNRESOLVED", path)
                required["resolutionSourceRangeSha256"] = resolution_range
            elif resolution_range is not None:
                _fail("V3_BLOCKER_ADDENDUM_TRACE_UNRESOLVED", path)
            required_by.append(required)
        rows.append(
            {
                "path": path,
                "classification": "NON_DERIVABLE_SOURCE_INPUT",
                "v2Disposition": "MISSING_FROM_FROZEN_V2_ARCHIVE",
                "requiredBy": required_by,
            }
        )
    rows.append(
        {
            "path": _STANDARD_PACK_CATALOG,
            "classification": "REQUIRES_RECORDED_GENERATION",
            "v2Disposition": "GENERATOR_OUTPUT_NOT_PRESENT_IN_FROZEN_V2_ARCHIVE",
            "generator": {
                "argv": [
                    "pnpm", "--filter", "@reading-advantage/advantage-play-kit",
                    "generate:standard-pack-catalog",
                ],
                "output": {"path": _STANDARD_PACK_CATALOG},
                "sourcePath": generator_trace["sourcePath"],
                "sourceRangeSha256": generator_trace["sourceRangeSha256"],
                "resolutionTraceId": generator_trace["id"],
            },
        }
    )
    for path, argv in core.BUILD_OUTPUTS:
        rows.append(
            {
                "path": path,
                "classification": "REQUIRES_RECORDED_BUILD",
                "v2Disposition": "DERIVED_OUTPUT_EXCLUDED_FROM_SOURCE_ARCHIVE",
                "build": {"argv": argv, "cwd": ".", "environment": {}},
            }
        )
    return rows

def _write_json(path: Path, value: dict[str, Any]) -> None:
    """Writes one deterministic JSON evidence artifact.

    @param path The regular destination file.
    @param value The JSON object to serialize.
    @returns Nothing.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_strengthened_addendum(output_directory: Path | str = core.ADDENDUM_DIR) -> None:
    """Rebuilds the addendum from v2 bytes in a short-lived external materialization.

    @param output_directory The existing track-owned addendum directory to replace.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError When frozen replay or static discovery is unsafe.
    """
    output = Path(output_directory)
    output.mkdir(parents=True, exist_ok=True)
    _, entries = _read_archive()
    with tempfile.TemporaryDirectory(prefix="business-operations-v2-addendum-", dir="/tmp") as temporary:
        root = Path(temporary) / "source"
        materializer_command = _run_stage("materialize-v2", root)
        materialized = _require_stage_success("materialize-v2", materializer_command)
        replay_command = _run_stage("replay-v2", root)
        replayed = _require_stage_success("replay-v2", replay_command)
        discovery_command = _run_stage("discover-v2", root)
        discovered = _require_stage_success("discover-v2", discovery_command)
        pre = materialized.get("inventory")
        post = replayed.get("inventory")
        audit = replayed.get("realpathAudit")
        if not isinstance(pre, dict) or not isinstance(post, dict) or not isinstance(audit, dict):
            _fail("V3_BLOCKER_ADDENDUM_STAGE_OUTPUT_INVALID")
        if pre != post or any(audit.values()):
            _fail("V3_BLOCKER_ADDENDUM_REPLAY_PROOF_INVALID")
        discovery = discovered.get("discovery")
        generator_trace = discovered.get("generatorTrace")
        discovery_audit = discovered.get("realpathAudit")
        if (
            not isinstance(discovery, dict)
            or not isinstance(generator_trace, dict)
            or not isinstance(discovery_audit, dict)
            or any(
                discovery_audit.get(key) != []
                for key in ("outsideMaterializationRoot", "sourceWorktreeReferences", "nodeModulesOverlayPaths")
            )
            or discovery_audit != audit
        ):
            _fail("V3_BLOCKER_ADDENDUM_STAGE_OUTPUT_INVALID", "discover-v2")
    materializer_stdout = _write_raw(output, "materializer.stdout.txt", materializer_command.pop("stdoutText"))
    materializer_stderr = _write_raw(output, "materializer.stderr.txt", materializer_command.pop("stderrText"))
    replay_stdout = _write_raw(output, "replay.stdout.txt", replay_command.pop("stdoutText"))
    replay_stderr = _write_raw(output, "replay.stderr.txt", replay_command.pop("stderrText"))
    discovery_stdout = _write_raw(output, "discover-v2.stdout.txt", discovery_command.pop("stdoutText"))
    discovery_stderr = _write_raw(output, "discover-v2.stderr.txt", discovery_command.pop("stderrText"))
    materializer_command["stdout"] = materializer_stdout
    materializer_command["stderr"] = materializer_stderr
    replay_command["stdout"] = replay_stdout
    replay_command["stderr"] = replay_stderr
    discovery_command["stdout"] = discovery_stdout
    discovery_command["stderr"] = discovery_stderr
    ledger = {
        "schemaVersion": 1,
        "kind": "execution-input-omission-ledger",
        "status": "BLOCKED_PENDING_V3_RECLOSURE",
        "derivation": {
            "rule": "frozen-ast-execution-closure-v1",
            "discovery": {
                **discovery,
                **discovery_command,
                "command": discovery_command,
                "realpathAudit": discovery_audit,
            },
        },
        "conditionalPolicy": {
            "PG_TEST_URL": {
                "state": "ABSENT",
                "effect": "database-backed successor-registry cases skip; module-relative migration fixture remains required",
            }
        },
        "omissions": _missing_omissions(discovery, generator_trace),
    }
    _write_json(output / "execution-input-omission-ledger.json", ledger)
    provenance = {
        "schemaVersion": 1,
        "kind": "v2-execution-closure-blocker-addendum",
        "status": "BLOCKED",
        "priorV2Evidence": core.V2_EVIDENCE,
        "blockerRecords": core.BLOCKER_RECORDS,
        "rawStreams": core._expected_raw_streams(),
        "subordinateReferences": core._expected_raw_streams(),
        "markerDisposition": core.MARKER_DISPOSITION,
        "upstreamAuthority": "NONE",
        "commands": {
            "materializer": materializer_command,
            "replay": replay_command,
            "discovery": discovery_command,
        },
        "toolVersions": _tool_versions(),
        "sourceInventory": {"manifestSha256": pre["sha256"], "pre": pre, "post": post},
        "realpathAudit": audit,
    }
    _write_json(output / "execution-provenance.json", provenance)
    receipt = {
        "schemaVersion": 1,
        "kind": "v2-execution-closure-blocker-addendum",
        "status": "BLOCKED",
        "priorV2Evidence": core.V2_EVIDENCE,
        "blockerRecords": core.BLOCKER_RECORDS,
        "rawStreams": core._expected_raw_streams(),
        "subordinateReferences": [
            core._reference_for(output / "execution-provenance.json"),
            core._reference_for(output / "execution-input-omission-ledger.json"),
        ],
        "markerDisposition": core.MARKER_DISPOSITION,
        "upstreamAuthority": "NONE",
        "purpose": "preserve the v2 blocker and authorize only a candidate R1 v3 execution closure",
    }
    _write_json(output / "receipt.json", receipt)
    validate_strengthened_blocker_addendum(receipt, provenance, ledger)


def validate_strengthened_blocker_addendum(
    receipt: dict[str, Any], provenance: dict[str, Any], ledger: dict[str, Any]
) -> None:
    """Validates the stronger addendum while preserving legacy v2 field checks.

    @param receipt The child-reference-bound addendum receipt.
    @param provenance The source/materialization provenance artifact.
    @param ledger The frozen static-discovery omission ledger.
    @returns Nothing when evidence is valid.
    @throws core.ExecutionClosureValidationError When any field has drifted.
    """
    legacy_receipt = copy.deepcopy(receipt)
    legacy_receipt["subordinateReferences"] = legacy_receipt.get("rawStreams")
    legacy_ledger = copy.deepcopy(ledger)
    catalog = next(
        (row for row in legacy_ledger.get("omissions", []) if row.get("path") == _STANDARD_PACK_CATALOG),
        None,
    )
    if catalog is None:
        _fail("V3_BLOCKER_ADDENDUM_STANDARD_PACK_MISSING")
    catalog.pop("generator", None)
    catalog["classification"] = "NON_DERIVABLE_SOURCE_INPUT"
    catalog["requiredBy"] = []
    _LEGACY_VALIDATE(legacy_receipt, provenance, legacy_ledger)
    expected_children = [
        core._reference_for(core.ADDENDUM_DIR / "execution-provenance.json"),
        core._reference_for(core.ADDENDUM_DIR / "execution-input-omission-ledger.json"),
    ]
    if receipt.get("subordinateReferences") != expected_children:
        _fail("V3_BLOCKER_ADDENDUM_SUBORDINATE_REFERENCE_INVALID")
    commands = provenance.get("commands")
    if not isinstance(commands, dict):
        _fail("V3_BLOCKER_ADDENDUM_COMMANDS_MISSING")
    command_stages = {
        "materializer": "materialize-v2",
        "replay": "replay-v2",
        "discovery": "discover-v2",
    }
    stream_names = {
        "materializer": ("materializer.stdout.txt", "materializer.stderr.txt"),
        "replay": ("replay.stdout.txt", "replay.stderr.txt"),
        "discovery": ("discover-v2.stdout.txt", "discover-v2.stderr.txt"),
    }
    for name, stage in command_stages.items():
        command = commands.get(name)
        required = {"argv", "cwd", "env", "envAbsent", "network", "exitCode", "stdout", "stderr"}
        if not isinstance(command, dict) or not required <= set(command):
            _fail("V3_BLOCKER_ADDENDUM_COMMAND_SCHEMA", name)
        if not isinstance(command["argv"], list) or not isinstance(command["cwd"], str) or command["env"] != {"CI": "true"}:
            _fail("V3_BLOCKER_ADDENDUM_COMMAND_SCHEMA", name)
        if (
            not isinstance(command["envAbsent"], list)
            or "PG_TEST_URL" not in command["envAbsent"]
            or command["network"] is not False
            or command["exitCode"] != 0
            or stage not in command["argv"]
        ):
            _fail("V3_BLOCKER_ADDENDUM_COMMAND_RESULT", name)
        stdout_name, stderr_name = stream_names[name]
        expected_stdout = core._reference_for(core.ADDENDUM_DIR / "raw" / stdout_name)
        expected_stderr = core._reference_for(core.ADDENDUM_DIR / "raw" / stderr_name)
        if command["stdout"] != expected_stdout or command["stderr"] != expected_stderr:
            _fail("V3_BLOCKER_ADDENDUM_COMMAND_STREAM_INVALID", name)
    expected_tools = {"node": ["node", "--version"], "pnpm": ["pnpm", "--version"], "scanner": ["repo-graph", "--version"]}
    tools = provenance.get("toolVersions")
    if not isinstance(tools, dict) or set(tools) != set(expected_tools):
        _fail("V3_BLOCKER_ADDENDUM_TOOL_IDENTITY_INVALID")
    for name, argv in expected_tools.items():
        identity = tools[name]
        if not isinstance(identity, dict) or identity.get("argv") != argv or not identity.get("stdout"):
            _fail("V3_BLOCKER_ADDENDUM_TOOL_IDENTITY_INVALID", name)
        if identity.get("stdoutSha256") != _sha256(str(identity["stdout"]).encode("utf-8")):
            _fail("V3_BLOCKER_ADDENDUM_TOOL_IDENTITY_INVALID", name)
    inventory = provenance.get("sourceInventory")
    if not isinstance(inventory, dict) or inventory.get("pre") != inventory.get("post"):
        _fail("V3_BLOCKER_ADDENDUM_INVENTORY_INVALID")
    if not isinstance(inventory.get("pre"), dict) or inventory["pre"].get("sha256") != inventory.get("manifestSha256"):
        _fail("V3_BLOCKER_ADDENDUM_INVENTORY_INVALID")
    audit = provenance.get("realpathAudit")
    if not isinstance(audit, dict) or any(audit.get(key) != [] for key in ("outsideMaterializationRoot", "sourceWorktreeReferences", "nodeModulesOverlayPaths")):
        _fail("V3_BLOCKER_ADDENDUM_REALPATH_AUDIT_INVALID")
    derivation = ledger.get("derivation") if isinstance(ledger, dict) else None
    discovery = derivation.get("discovery") if isinstance(derivation, dict) else None
    if not isinstance(discovery, dict) or discovery.get("algorithm") != "frozen-ast-import-export-static-path-v2":
        _fail("V3_BLOCKER_ADDENDUM_DISCOVERY_INVALID")
    discovery_command = commands["discovery"]
    command_fields = {"argv", "cwd", "env", "envAbsent", "network", "exitCode", "stdout", "stderr"}
    ledger_discovery_command = discovery.get("command")
    if (
        not isinstance(ledger_discovery_command, dict)
        or ledger_discovery_command != discovery_command
        or any(discovery.get(field) != discovery_command.get(field) for field in command_fields)
        or discovery.get("realpathAudit") != audit
    ):
        _fail("V3_BLOCKER_ADDENDUM_DISCOVERY_COMMAND_INVALID")
    if not isinstance(discovery.get("resolutionTrace"), list) or not discovery["resolutionTrace"]:
        _fail("V3_BLOCKER_ADDENDUM_DISCOVERY_INVALID")
    base_rows = {key: discovery[key] for key in ("algorithm", "inputs", "missingInputs", "entrypointExpansion", "resolutionTrace")}
    if discovery.get("rowDigest") != _sha256(_canonical(base_rows)):
        _fail("V3_BLOCKER_ADDENDUM_DISCOVERY_DIGEST_INVALID")
    traces: dict[str, dict[str, Any]] = {}
    for trace in discovery["resolutionTrace"]:
        if not isinstance(trace, dict):
            _fail("V3_BLOCKER_ADDENDUM_DISCOVERY_INVALID")
        trace_id = trace.get("id")
        if (
            not isinstance(trace_id, str)
            or trace_id in traces
            or not isinstance(trace.get("sourcePath"), str)
            or not isinstance(trace.get("logicalPath"), str)
            or not re.fullmatch(r"[0-9a-f]{64}", str(trace.get("sourceRangeSha256")))
        ):
            _fail("V3_BLOCKER_ADDENDUM_DISCOVERY_INVALID")
        resolution_range = trace.get("resolutionSourceRangeSha256")
        if trace.get("kind") == "bound-new-url-read":
            if not re.fullmatch(r"[0-9a-f]{64}", str(resolution_range)):
                _fail("V3_BLOCKER_ADDENDUM_DISCOVERY_INVALID")
        elif resolution_range is not None:
            _fail("V3_BLOCKER_ADDENDUM_DISCOVERY_INVALID")
        traces[trace_id] = trace
    missing_inputs = discovery.get("missingInputs")
    if not isinstance(missing_inputs, list):
        _fail("V3_BLOCKER_ADDENDUM_DISCOVERY_INVALID")
    missing_by_path: dict[str, dict[str, Any]] = {}
    for item in missing_inputs:
        path = item.get("logicalPath") if isinstance(item, dict) else None
        trace_ids = item.get("resolutionTraceIds") if isinstance(item, dict) else None
        if (
            not isinstance(path, str)
            or path in missing_by_path
            or not isinstance(trace_ids, list)
            or not trace_ids
            or not all(isinstance(trace_id, str) for trace_id in trace_ids)
            or len(trace_ids) != len(set(trace_ids))
            or item.get("resolutionTraceId") != trace_ids[-1]
        ):
            _fail("V3_BLOCKER_ADDENDUM_DISCOVERY_INVALID")
        for trace_id in trace_ids:
            trace = traces.get(trace_id)
            if trace is None or trace.get("logicalPath") != path:
                _fail("V3_BLOCKER_ADDENDUM_DISCOVERY_INVALID")
        missing_by_path[path] = item
    required_static = set(core.NON_DERIVABLE_INPUTS) - {_STANDARD_PACK_CATALOG}
    present_static = {
        row.get("path") for row in ledger.get("omissions", [])
        if row.get("classification") == "NON_DERIVABLE_SOURCE_INPUT"
    }
    if not required_static <= present_static:
        _fail("V3_BLOCKER_ADDENDUM_REQUIRED_STATIC_TRACE_MISSING")
    catalog = next((row for row in ledger.get("omissions", []) if row.get("path") == _STANDARD_PACK_CATALOG), None)
    generator = catalog.get("generator") if isinstance(catalog, dict) else None
    generator_trace = traces.get(generator.get("resolutionTraceId")) if isinstance(generator, dict) else None
    if (
        not isinstance(generator, dict)
        or catalog.get("classification") != "REQUIRES_RECORDED_GENERATION"
        or generator.get("argv") != ["pnpm", "--filter", "@reading-advantage/advantage-play-kit", "generate:standard-pack-catalog"]
        or generator.get("output", {}).get("path") != _STANDARD_PACK_CATALOG
        or not isinstance(generator_trace, dict)
        or generator_trace.get("kind") != "package-script-generator"
        or generator_trace.get("logicalPath") != _STANDARD_PACK_CATALOG
        or generator.get("sourcePath") != generator_trace.get("sourcePath")
        or generator.get("sourceRangeSha256") != generator_trace.get("sourceRangeSha256")
        or not re.fullmatch(r"[0-9a-f]{64}", str(generator.get("sourceRangeSha256")))
    ):
        _fail("V3_BLOCKER_ADDENDUM_STANDARD_PACK_GENERATOR_INVALID")
    source_omission_paths: set[str] = set()
    for omission in ledger.get("omissions", []):
        if omission.get("classification") != "NON_DERIVABLE_SOURCE_INPUT":
            continue
        path = omission.get("path")
        missing_item = missing_by_path.get(path) if isinstance(path, str) else None
        required_by = omission.get("requiredBy")
        expected_trace_ids = missing_item.get("resolutionTraceIds") if isinstance(missing_item, dict) else None
        if (
            not isinstance(required_by, list)
            or not isinstance(expected_trace_ids, list)
            or [row.get("resolutionTraceId") if isinstance(row, dict) else None for row in required_by] != expected_trace_ids
        ):
            _fail("V3_BLOCKER_ADDENDUM_DISCOVERY_INVALID")
        source_omission_paths.add(path)
        for row, trace_id in zip(required_by, expected_trace_ids):
            trace = traces[trace_id]
            if (
                not isinstance(row, dict)
                or row.get("sourcePath") != trace.get("sourcePath")
                or row.get("sourceRangeSha256") != trace.get("sourceRangeSha256")
            ):
                _fail("V3_BLOCKER_ADDENDUM_DISCOVERY_INVALID")
            if trace.get("kind") == "bound-new-url-read":
                if row.get("resolutionSourceRangeSha256") != trace.get("resolutionSourceRangeSha256"):
                    _fail("V3_BLOCKER_ADDENDUM_DISCOVERY_INVALID")
            elif "resolutionSourceRangeSha256" in row:
                _fail("V3_BLOCKER_ADDENDUM_DISCOVERY_INVALID")
    if source_omission_paths != set(missing_by_path):
        _fail("V3_BLOCKER_ADDENDUM_DISCOVERY_INVALID")


def _main() -> None:
    """Executes one explicit non-network materialize or replay subprocess stage.

    @returns Nothing.
    @throws core.ExecutionClosureValidationError When command arguments are unsupported.
    """
    if len(sys.argv) != 4 or sys.argv[2] != "--root":
        _fail("V3_BLOCKER_ADDENDUM_STAGE_USAGE")
    stage = sys.argv[1]
    root = Path(sys.argv[3])
    if stage == "materialize-v2":
        value = _stage_materialize(root)
    elif stage == "replay-v2":
        value = _stage_replay(root)
    elif stage == "discover-v2":
        value = _stage_discover(root)
    else:
        _fail("V3_BLOCKER_ADDENDUM_STAGE_USAGE", stage)
    print(json.dumps(value, sort_keys=True))


if __name__ == "__main__":
    _main()
