"""Frozen-source discovery and strengthened v2 blocker-addendum validation.

The functions in this module do not run package commands or write a source
root. They make the input derivation explicit first, so a later materializer
can only freeze paths that a static trace has resolved or rejected.
"""
from __future__ import annotations

import hashlib
import json
import re
import shlex
from pathlib import Path, PurePosixPath
from typing import Any

from . import business_operations_graph_baseline_execution_closure as core


_SOURCE_SUFFIXES = (".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs", ".sh")
_DYNAMIC_MARKERS = ("process.env", "globSync(", "glob(", "fast-glob", "import(")


def _sha256(data: bytes) -> str:
    """Returns the SHA-256 digest for one source range or evidence payload.

    @param data The bytes to hash.
    @returns A lowercase hexadecimal digest.
    """
    return hashlib.sha256(data).hexdigest()


def _canonical(value: Any) -> bytes:
    """Serializes JSON-compatible data with a stable canonical representation.

    @param value The value to serialize.
    @returns Canonical UTF-8 JSON bytes.
    """
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _fail(code: str, detail: str = "") -> None:
    """Raises one fail-closed execution-discovery error.

    @param code The stable error identifier.
    @param detail Optional bounded diagnostic context.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError Always.
    """
    suffix = f": {detail}" if detail else ""
    raise core.ExecutionClosureValidationError(f"{code}{suffix}")


def _normal_path(value: str) -> str:
    """Normalizes a root-relative POSIX path and rejects escapes.

    @param value The candidate logical path.
    @returns The canonical logical path.
    @throws core.ExecutionClosureValidationError When the path is unsafe.
    """
    path = PurePosixPath(value)
    if not value or path.is_absolute() or path.as_posix() != value or any(part in {"", ".", ".."} for part in path.parts):
        _fail("EXECUTION_DISCOVERY_PATH_INVALID", value)
    return value


def _relative(root: Path, path: Path) -> str:
    """Returns a path relative to the frozen root and rejects external paths.

    @param root The frozen materialization root.
    @param path The candidate path.
    @returns A canonical logical path.
    @throws core.ExecutionClosureValidationError When the candidate escapes the root.
    """
    try:
        return _normal_path(path.resolve(strict=False).relative_to(root.resolve()).as_posix())
    except ValueError:
        _fail("EXECUTION_DISCOVERY_PATH_ESCAPE", str(path))


def _safe_source(root: Path, logical_path: str) -> tuple[Path, str]:
    """Loads one source candidate only when it is a regular frozen-root file.

    @param root The frozen materialization root.
    @param logical_path The requested root-relative source path.
    @returns The concrete path and its decoded text.
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
    """Splits a package-script body into deterministic simple command ranges.

    @param script The package script body.
    @returns Command text plus byte-index-compatible source spans.
    @throws core.ExecutionClosureValidationError When shell control flow is unresolved.
    """
    if "||" in script or "|" in script or ">" in script or "<" in script or "`" in script or "$(" in script:
        _fail("EXECUTION_DISCOVERY_SHELL_CONTROL_UNRESOLVED")
    rows: list[tuple[str, int, int]] = []
    start = 0
    for separator in re.finditer(r"&&|;", script):
        fragment = script[start:separator.start()]
        trimmed = fragment.strip()
        if trimmed:
            left = start + len(fragment) - len(fragment.lstrip())
            rows.append((trimmed, left, left + len(trimmed)))
        start = separator.end()
    fragment = script[start:]
    trimmed = fragment.strip()
    if trimmed:
        left = start + len(fragment) - len(fragment.lstrip())
        rows.append((trimmed, left, left + len(trimmed)))
    if not rows:
        _fail("EXECUTION_DISCOVERY_EMPTY_SCRIPT")
    return rows


def _resolve_local_module(root: Path, source_path: str, specifier: str) -> str | None:
    """Resolves one static relative import using TypeScript/Node source candidates.

    @param root The frozen materialization root.
    @param source_path The importing source path.
    @param specifier The literal relative module specifier.
    @returns The resolved logical path, or None when no local source exists.
    @throws core.ExecutionClosureValidationError When a path escapes the root.
    """
    if not specifier.startswith("."):
        return None
    candidate = (root / source_path).parent / specifier
    candidates = [candidate]
    if candidate.suffix == "":
        candidates.extend(candidate.with_suffix(suffix) for suffix in _SOURCE_SUFFIXES[:-1])
        candidates.extend(candidate / f"index{suffix}" for suffix in _SOURCE_SUFFIXES[:-1])
    for path in candidates:
        if path.is_file() and not path.is_symlink():
            return _relative(root, path)
    return None


def discover_execution_inputs_v1(root: Path | str, entrypoints: list[str]) -> dict[str, Any]:
    """Discovers static inputs from package-script and source-file entrypoints.

    @param root The fully frozen source root to inspect without live overlays.
    @param entrypoints Package-script selectors (`package.json#script`) or source paths.
    @returns Input metadata, ordered command expansion, and source-resolution traces.
    @throws core.ExecutionClosureValidationError When a dynamic or unsafe input is encountered.
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
    expanded_scripts: set[tuple[str, str]] = set()

    def add_trace(source_path: str, start: int, end: int, logical_path: str, kind: str) -> str:
        _, source_text = _safe_source(source_root, source_path)
        trace_id = f"trace-{len(traces):04d}"
        traces.append(
            {
                "id": trace_id,
                "kind": kind,
                "sourcePath": source_path,
                "sourceRangeSha256": _sha256(source_text[start:end].encode("utf-8")),
                "logicalPath": logical_path,
            }
        )
        candidate = source_root / logical_path
        if candidate.is_file() and not candidate.is_symlink() and _relative(source_root, candidate) == logical_path:
            data = candidate.read_bytes()
            inputs[logical_path] = {
                "logicalPath": logical_path,
                "sha256": _sha256(data),
                "size": len(data),
                "resolutionTraceId": trace_id,
            }
        else:
            missing[logical_path] = {"logicalPath": logical_path, "resolutionTraceId": trace_id}
        return trace_id

    def resolve_from(base: Path, literal: str, source_path: str, start: int, end: int, kind: str) -> None:
        if not literal or "$" in literal or "*" in literal or "?" in literal or "[" in literal:
            _fail("EXECUTION_DISCOVERY_DYNAMIC_PATH", source_path)
        logical_path = _relative(source_root, (base / literal).resolve(strict=False))
        add_trace(source_path, start, end, logical_path, kind)

    def scan_source(source_path: str) -> None:
        if source_path in scanned_sources:
            return
        scanned_sources.add(source_path)
        source_file, text = _safe_source(source_root, source_path)
        for marker in _DYNAMIC_MARKERS:
            if marker in text:
                _fail("EXECUTION_DISCOVERY_DYNAMIC_INPUT", f"{source_path}:{marker}")
        for match in re.finditer(
            r"(?:readFileSync|readFile)\s*\(\s*new\s+URL\s*\(\s*(['\"])(.*?)\1\s*,\s*import\.meta\.url\s*\)",
            text,
            re.DOTALL,
        ):
            resolve_from(source_file.parent, match.group(2), source_path, match.start(), match.end(), "new-url-read")
        for match in re.finditer(
            r"(?:readFileSync|readFile)\s*\(\s*resolve\s*\(\s*import\.meta\.dirname\s*,\s*(['\"])(.*?)\1",
            text,
            re.DOTALL,
        ):
            resolve_from(source_file.parent, match.group(2), source_path, match.start(), match.end(), "dirname-resolve-read")
        for match in re.finditer(r"(?:import|export)\s+(?:[^'\"]*?\s+from\s+)?(['\"])(\.[^'\"]+)\1", text):
            module = _resolve_local_module(source_root, source_path, match.group(2))
            if module is not None:
                scan_source(module)
        if source_path.endswith(".sh"):
            for match in re.finditer(r"(?:--file|-f)\s+(?:(['\"])(.*?)\1|([^\s]+))", text):
                literal = match.group(2) if match.group(1) is not None else match.group(3)
                if literal is None:
                    _fail("EXECUTION_DISCOVERY_SHELL_FILE_UNRESOLVED", source_path)
                resolve_from(source_root, literal, source_path, match.start(), match.end(), "shell-sql-file")

    def append_expansion(entrypoint: str, argv: list[str], source_range: bytes, expanded_from: str) -> None:
        expansion.append(
            {
                "ordinal": len(expansion),
                "entrypoint": entrypoint,
                "argv": argv,
                "expandedFrom": expanded_from,
                "sourceRangeSha256": _sha256(source_range),
            }
        )

    def expand_package_script(package_path: str, script_name: str, expanded_from: str) -> None:
        key = (package_path, script_name)
        if key in expanded_scripts:
            _fail("EXECUTION_DISCOVERY_SCRIPT_CYCLE", f"{package_path}#{script_name}")
        expanded_scripts.add(key)
        package_file, package_text = _safe_source(source_root, package_path)
        try:
            package = json.loads(package_text)
            script = package["scripts"][script_name]
        except (KeyError, TypeError, json.JSONDecodeError) as error:
            _fail("EXECUTION_DISCOVERY_SCRIPT_UNRESOLVED", f"{package_path}#{script_name}: {error}")
        if not isinstance(script, str):
            _fail("EXECUTION_DISCOVERY_SCRIPT_UNRESOLVED", f"{package_path}#{script_name}")
        selector = f"{package_path}#{script_name}"
        script_offset = package_text.find(script)
        if script_offset < 0:
            _fail("EXECUTION_DISCOVERY_SCRIPT_RANGE_UNRESOLVED", selector)
        for command, left, right in _command_ranges(script):
            if "$" in command:
                _fail("EXECUTION_DISCOVERY_DYNAMIC_COMMAND", selector)
            try:
                argv = shlex.split(command)
            except ValueError as error:
                _fail("EXECUTION_DISCOVERY_COMMAND_PARSE", str(error))
            if not argv:
                _fail("EXECUTION_DISCOVERY_EMPTY_COMMAND", selector)
            append_expansion(selector, argv, package_text[script_offset + left:script_offset + right].encode("utf-8"), expanded_from)
            if len(argv) == 3 and argv[:2] == ["pnpm", "run"]:
                expand_package_script(package_path, argv[2], selector)
            elif argv[0] in {"node", "tsx", "ts-node", "sh", "bash"} and len(argv) >= 2:
                target = argv[1]
                if target.startswith("-") or "$" in target:
                    _fail("EXECUTION_DISCOVERY_DYNAMIC_COMMAND", selector)
                scan_source(_relative(source_root, package_file.parent / target))
        expanded_scripts.remove(key)

    for entrypoint in entrypoints:
        if "#" in entrypoint:
            package_path, script_name = entrypoint.split("#", 1)
            _normal_path(package_path)
            if not script_name:
                _fail("EXECUTION_DISCOVERY_ENTRYPOINT_INVALID", entrypoint)
            expand_package_script(package_path, script_name, entrypoint)
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


def validate_strengthened_blocker_addendum(
    receipt: dict[str, Any], provenance: dict[str, Any], ledger: dict[str, Any]
) -> None:
    """Validates the stronger pre-v3 blocker-addendum structure.

    @param receipt The addendum receipt that binds its child artifacts.
    @param provenance The materializer/replay and tool provenance record.
    @param ledger The static-path derivation ledger.
    @returns Nothing when all strengthened evidence fields are intact.
    @throws core.ExecutionClosureValidationError When mandatory evidence is absent.
    """
    core.validate_execution_closure_blocker_addendum_v1(receipt, provenance, ledger)
    expected_children = [
        core._reference_for(core.ADDENDUM_DIR / "execution-provenance.json"),
        core._reference_for(core.ADDENDUM_DIR / "execution-input-omission-ledger.json"),
    ]
    if receipt.get("subordinateReferences") != expected_children:
        _fail("V3_BLOCKER_ADDENDUM_SUBORDINATE_REFERENCE_INVALID")
    commands = provenance.get("commands")
    if not isinstance(commands, dict):
        _fail("V3_BLOCKER_ADDENDUM_COMMANDS_MISSING")
    for name in ("materializer", "replay"):
        command = commands.get(name)
        required = {"argv", "cwd", "env", "envAbsent", "network", "exitCode", "stdout", "stderr"}
        if not isinstance(command, dict) or not required <= set(command):
            _fail("V3_BLOCKER_ADDENDUM_COMMAND_SCHEMA", name)
        if not isinstance(command["argv"], list) or not isinstance(command["cwd"], str):
            _fail("V3_BLOCKER_ADDENDUM_COMMAND_SCHEMA", name)
        if command["env"] != {"CI": "true"} or "PG_TEST_URL" not in command["envAbsent"]:
            _fail("V3_BLOCKER_ADDENDUM_COMMAND_ENVIRONMENT", name)
        if command["network"] is not False or command["exitCode"] != 0:
            _fail("V3_BLOCKER_ADDENDUM_COMMAND_RESULT", name)
    tools = provenance.get("toolVersions")
    expected_tools = {"node": ["node", "--version"], "pnpm": ["pnpm", "--version"], "scanner": ["repo-graph", "--version"]}
    if not isinstance(tools, dict) or set(tools) != set(expected_tools):
        _fail("V3_BLOCKER_ADDENDUM_TOOL_IDENTITY_INVALID")
    for name, argv in expected_tools.items():
        item = tools[name]
        if not isinstance(item, dict) or item.get("argv") != argv or not item.get("stdout") or not re.fullmatch(r"[0-9a-f]{64}", str(item.get("stdoutSha256"))):
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
    if not isinstance(discovery.get("resolutionTrace"), list) or not discovery["resolutionTrace"]:
        _fail("V3_BLOCKER_ADDENDUM_DISCOVERY_INVALID")
    if not re.fullmatch(r"[0-9a-f]{64}", str(discovery.get("rowDigest"))):
        _fail("V3_BLOCKER_ADDENDUM_DISCOVERY_INVALID")
    for omission in ledger.get("omissions", []):
        if omission.get("classification") != "NON_DERIVABLE_SOURCE_INPUT":
            continue
        for required_by in omission.get("requiredBy", []):
            if not re.fullmatch(r"[0-9a-f]{64}", str(required_by.get("sourceRangeSha256"))) or "resolutionTraceId" not in required_by:
                _fail("V3_BLOCKER_ADDENDUM_DISCOVERY_INVALID")

