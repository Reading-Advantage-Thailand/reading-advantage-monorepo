"""Produces and validates the isolated R1 v3 execution-closure candidate.

The v3 candidate is deliberately separate from the blocked v2 snapshot.  It
copies only hash-bound v2 archive entries, adds the finite non-derivable
inputs discovered by the frozen addendum, excludes every pre-existing build
overlay, and executes the required gates in a fresh directory under ``/tmp``.
"""
from __future__ import annotations

import base64
import copy
import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from pathlib import Path, PurePosixPath
from typing import Any

from . import business_operations_graph_baseline_execution_closure as core
from . import business_operations_graph_baseline_execution_closure_addendum_v2 as addendum


V3_NAME = "r1-v3-execution-closure-20260801"
V3_DIR = core.TRACK_DIR / V3_NAME
V3_ARCHIVE = V3_DIR / "execution-closure.archive.json"
V3_LEDGER = V3_DIR / "omissions-ledger.json"
V3_PROFILE = V3_DIR / "fr4-execution-profile.json"
V3_RECEIPT = V3_DIR / "fr4-execution-receipt.json"
V3_GRAPH = V3_DIR / "graph-binding.json"
V3_AUDIT = V3_DIR / "clean-audit-attempt.json"
V3_COMPENSATION = V3_DIR / "compensation-denominator.json"
V3_MANIFEST = V3_DIR / "execution-closure.manifest.json"
ADDENDUM_RECEIPT = core.ADDENDUM_DIR / "receipt.json"
ADDENDUM_PROVENANCE = core.ADDENDUM_DIR / "execution-provenance.json"
ADDENDUM_LEDGER = core.ADDENDUM_DIR / "execution-input-omission-ledger.json"

BASELINE_V2_INVENTORY = {
    "entryCount": 6868,
    "sha256": "8c5a2c2d1914667843df51e2c8180b8cd812c0295eb0c972ce45c80e4d213d51",
}
NON_DERIVABLE_INPUTS = (
    "apps/accounts/cloudbuild.yaml",
    "apps/codecamp-advantage/cloudbuild.yaml",
    "apps/accounts/scripts/accounts-runtime-probe.sql",
    "apps/accounts/scripts/accounts-smoke.sh",
    "packages/db/drizzle/0043_codecamp_company_principal_sync.sql",
    "packages/db/company-identity/drizzle/meta/_journal.json",
    "packages/db/company-identity/drizzle/0001_immutable_identity_audit.sql",
    "packages/db/drizzle/0044_standard_pack_successor_commitments.sql",
)
# The base identity migration is a non-derivable materialization prerequisite,
# but not an addendum omission.  Keeping that distinction prevents a v3 ledger
# from falsely claiming the addendum discovered a different input set.
MATERIALIZATION_PREREQUISITES = (
    *NON_DERIVABLE_INPUTS,
    "packages/db/company-identity/drizzle/0000_company_identity_base.sql",
)
STANDARD_PACK_CATALOG = "packages/advantage-play-kit/assets/standard/standard-pack-release.json"
STANDARD_PACK_GENERATOR = [
    "pnpm",
    "--filter",
    "@reading-advantage/advantage-play-kit",
    "generate:standard-pack-catalog",
]
BUILDS = (
    ["pnpm", "--filter", "@reading-advantage/db", "build"],
    ["pnpm", "--filter", "@reading-advantage/auth", "build"],
    ["pnpm", "--filter", "@reading-advantage/backend", "build"],
)
FR4 = (
    ("accounts-test", ["pnpm", "--filter", "accounts", "test"]),
    ("accounts-check-types", ["pnpm", "--filter", "accounts", "check-types"]),
    ("backend-test", ["pnpm", "--filter", "@reading-advantage/backend", "test"]),
    ("backend-check-types", ["pnpm", "--filter", "@reading-advantage/backend", "check-types"]),
)
PROHIBITED_ARCHIVE_PARTS = {
    ".git",
    ".next",
    "node_modules",
    ".turbo",
    "dist",
    "build",
    "coverage",
    "target",
    "out",
    ".cache",
    ".parcel-cache",
    ".vercel",
    ".svelte-kit",
}
TRACK_GENERATED_PARTS = PROHIBITED_ARCHIVE_PARTS - {".git"}
ENV_ALLOWLIST = {"CI": "true"}
ENV_ABSENT = ["PG_TEST_URL"]
_REPO_ROOT = core.TRACK_DIR.parents[2]
_NODE = Path("/home/daniel-bo/.local/bin/node")
_PNPM = Path("/home/daniel-bo/.local/bin/pnpm")
_REPO_GRAPH = Path("/home/daniel-bo/.local/bin/repo-graph")


def _sha256(data: bytes) -> str:
    """Returns the SHA-256 digest of evidence bytes.

    @param data The bytes to hash.
    @returns A lowercase hexadecimal digest.
    """
    return hashlib.sha256(data).hexdigest()


def _canonical(value: Any) -> bytes:
    """Serializes JSON-compatible evidence with stable ordering.

    @param value The value to serialize.
    @returns Canonical UTF-8 JSON bytes.
    """
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _fail(code: str, detail: str = "") -> None:
    """Raises one structured execution-closure validation error.

    @param code The stable failure code.
    @param detail Optional bounded diagnostic context.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError Always.
    """
    suffix = f": {detail}" if detail else ""
    raise core.ExecutionClosureValidationError(f"{code}{suffix}")


def _normal_path(value: Any) -> str:
    """Returns one safe repository-relative POSIX path.

    @param value The untrusted path value.
    @returns The validated logical path.
    @throws core.ExecutionClosureValidationError When the path can escape a root.
    """
    if not isinstance(value, str) or not value or "\\" in value or "\x00" in value:
        _fail("V3_PATH_INVALID", repr(value))
    path = PurePosixPath(value)
    if path.is_absolute() or path.as_posix() != value or any(part in {"", ".", ".."} for part in path.parts):
        _fail("V3_PATH_INVALID", value)
    return value


def _has_generated_part(path: str) -> bool:
    """Reports whether a logical path contains a prohibited generated overlay.

    @param path The validated logical path.
    @returns Whether the path is excluded from a source archive.
    """
    return bool(set(PurePosixPath(path).parts) & PROHIBITED_ARCHIVE_PARTS)


def _reference(path: Path) -> dict[str, Any]:
    """Builds a track-relative immutable file reference.

    @param path The required regular track-owned file.
    @returns Path, digest, and size metadata.
    @throws core.ExecutionClosureValidationError When the path is unsafe.
    """
    return core._reference_for(path)


def _write_json(path: Path, value: dict[str, Any]) -> None:
    """Writes a deterministic JSON artifact.

    @param path The artifact destination.
    @param value The JSON object to write.
    @returns Nothing.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _load_json(path: Path) -> dict[str, Any]:
    """Loads one regular JSON object from a track artifact.

    @param path The artifact to read.
    @returns The parsed object.
    @throws core.ExecutionClosureValidationError When the artifact is unsafe.
    """
    if not path.is_file() or path.is_symlink():
        _fail("V3_ARTIFACT_UNSAFE", str(path))
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        _fail("V3_ARTIFACT_UNREADABLE", f"{path.name}: {error}")
    if not isinstance(value, dict):
        _fail("V3_ARTIFACT_SCHEMA", path.name)
    return value


def _inventory(entries: list[dict[str, Any]]) -> dict[str, Any]:
    """Builds a deterministic source inventory for archive metadata.

    @param entries The sorted source archive entries.
    @returns Entry count and metadata digest.
    """
    rows = [
        {key: entry.get(key) for key in ("kind", "mode", "path", "sha256", "size", "state")}
        for entry in entries
    ]
    return {"entryCount": len(rows), "sha256": _sha256(_canonical(rows))}


def _archive_entries() -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    """Builds the V3 source archive from frozen V2 bytes and finite supplements.

    @returns Sorted retained entries and an explicit generated-overlay exclusion list.
    @throws core.ExecutionClosureValidationError When a supplemental source is unsafe.
    """
    _, frozen_entries = addendum._read_archive()
    by_path: dict[str, dict[str, Any]] = {}
    excluded: list[dict[str, str]] = []
    for original in frozen_entries:
        entry = copy.deepcopy(original)
        path = _normal_path(entry.get("path"))
        if _has_generated_part(path):
            excluded.append({"path": path, "reason": "PREEXISTING_GENERATED_OVERLAY"})
            continue
        if path in by_path:
            _fail("V3_ARCHIVE_DUPLICATE", path)
        by_path[path] = entry
    for logical in MATERIALIZATION_PREREQUISITES:
        logical = _normal_path(logical)
        source = _REPO_ROOT / logical
        try:
            source.resolve(strict=True).relative_to(_REPO_ROOT.resolve())
        except (OSError, ValueError):
            _fail("V3_SUPPLEMENT_PATH_ESCAPE", logical)
        source_stat = source.lstat()
        if not stat.S_ISREG(source_stat.st_mode) or source.is_symlink():
            _fail("V3_SUPPLEMENT_UNSAFE", logical)
        data = source.read_bytes()
        entry = {
            "contentBase64": base64.b64encode(data).decode("ascii"),
            "kind": "file",
            "mode": f"100{stat.S_IMODE(source_stat.st_mode):03o}",
            "path": logical,
            "resolvedTargetPath": logical,
            "sha256": _sha256(data),
            "size": len(data),
            "state": "present",
            "symlinkTarget": None,
        }
        prior = by_path.get(logical)
        if prior is not None and (
            prior.get("sha256") != entry["sha256"] or prior.get("size") != entry["size"]
        ):
            _fail("V3_SUPPLEMENT_CONFLICT", logical)
        by_path[logical] = entry
    entries = [by_path[path] for path in sorted(by_path)]
    return entries, excluded


def _build_archive() -> dict[str, Any]:
    """Builds the complete V3 materialization source archive.

    @returns The V3 archive payload before it is written.
    """
    entries, excluded = _archive_entries()
    return {
        "schemaVersion": 1,
        "kind": "execution-closure-source-archive",
        "source": {
            "v2Archive": _reference(core.V2_ARCHIVE),
            "supplementalInputs": list(MATERIALIZATION_PREREQUISITES),
            "excludedPreexistingGenerated": excluded,
        },
        "entries": entries,
        "closureInventory": _inventory(entries),
    }


def _decode_entry(root: Path, entry: dict[str, Any]) -> None:
    """Materializes one hash-bound archive entry below an external root.

    @param root The clean materialization root.
    @param entry The source archive entry.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError When metadata or containment fails.
    """
    logical = _normal_path(entry.get("path"))
    destination = root / logical
    if destination.exists() or destination.is_symlink():
        _fail("V3_MATERIALIZATION_COLLISION", logical)
    destination.parent.mkdir(parents=True, exist_ok=True)
    kind = entry.get("kind")
    if kind == "symlink":
        target = entry.get("symlinkTarget")
        if not isinstance(target, str) or not target or target.startswith("/"):
            _fail("V3_MATERIALIZATION_SYMLINK_UNSAFE", logical)
        destination.symlink_to(target)
        try:
            destination.resolve(strict=False).relative_to(root.resolve())
        except ValueError:
            _fail("V3_MATERIALIZATION_SYMLINK_ESCAPE", logical)
        return
    if kind != "file" or not isinstance(entry.get("contentBase64"), str):
        _fail("V3_MATERIALIZATION_SCHEMA", logical)
    try:
        data = base64.b64decode(entry["contentBase64"], validate=True)
    except ValueError as error:
        _fail("V3_MATERIALIZATION_DECODE", f"{logical}: {error}")
    if len(data) != entry.get("size") or _sha256(data) != entry.get("sha256"):
        _fail("V3_MATERIALIZATION_DIGEST", logical)
    destination.write_bytes(data)
    mode = entry.get("mode")
    if not isinstance(mode, str) or not re.fullmatch(r"10[0-7]{3}", mode):
        _fail("V3_MATERIALIZATION_MODE", logical)
    os.chmod(destination, int(mode[-3:], 8))


def _materialize(root: Path, archive: dict[str, Any]) -> None:
    """Materializes an entire V3 archive without reading the shared worktree.

    @param root The nonexistent temporary source root.
    @param archive The hash-bound V3 source archive.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError When the root or archive is unsafe.
    """
    if root.exists() or root.is_symlink():
        _fail("V3_MATERIALIZATION_ROOT_REUSED", str(root))
    entries = archive.get("entries")
    if not isinstance(entries, list):
        _fail("V3_ARCHIVE_SCHEMA")
    root.mkdir(parents=True, exist_ok=False)
    for entry in entries:
        if not isinstance(entry, dict):
            _fail("V3_ARCHIVE_ENTRY_SCHEMA")
        _decode_entry(root, entry)


def _clean_root_audit(root: Path, entries: list[dict[str, Any]]) -> dict[str, list[str]]:
    """Audits replay bytes, realpaths, and prohibited pre-existing overlays.

    @param root The materialized external root.
    @param entries The expected source entries.
    @returns A machine-readable clean-room audit whose lists must all be empty.
    """
    outside: list[str] = []
    source_refs: list[str] = []
    node_modules: list[str] = []
    generated: list[str] = []
    expected = {_normal_path(entry.get("path")) for entry in entries}
    for entry in entries:
        logical = _normal_path(entry.get("path"))
        path = root / logical
        if entry.get("kind") == "symlink":
            if not path.is_symlink() or os.readlink(path) != entry.get("symlinkTarget"):
                _fail("V3_REPLAY_DRIFT", logical)
        elif not path.is_file() or path.is_symlink() or _sha256(path.read_bytes()) != entry.get("sha256"):
            _fail("V3_REPLAY_DRIFT", logical)
        try:
            resolved = path.resolve(strict=False)
            resolved.relative_to(root.resolve())
        except ValueError:
            outside.append(logical)
            continue
        if str(_REPO_ROOT.resolve()) in str(resolved):
            source_refs.append(logical)
        parts = set(PurePosixPath(logical).parts)
        if "node_modules" in parts:
            node_modules.append(logical)
        if parts & TRACK_GENERATED_PARTS:
            generated.append(logical)
    for candidate in root.rglob("*"):
        logical = candidate.relative_to(root).as_posix()
        if logical in expected:
            continue
        parts = set(PurePosixPath(logical).parts)
        if "node_modules" in parts:
            node_modules.append(logical)
        if parts & TRACK_GENERATED_PARTS:
            generated.append(logical)
    return {
        "outsideMaterializationRoot": sorted(set(outside)),
        "sourceWorktreeReferences": sorted(set(source_refs)),
        "sourceRootOverlayPaths": [],
        "nodeModulesOverlayPaths": sorted(set(node_modules)),
        "preexistingGeneratedPaths": sorted(set(generated)),
    }


def _stage_materialize(root: Path) -> dict[str, Any]:
    """Executes the source-only materialization child stage.

    @param root The fresh external source root.
    @returns Archive inventory metadata.
    """
    archive = _load_json(V3_ARCHIVE)
    _materialize(root, archive)
    return {"inventory": archive["closureInventory"], "entryCount": len(archive["entries"])}


def _stage_replay(root: Path) -> dict[str, Any]:
    """Executes the source replay and containment audit child stage.

    @param root The existing external source root.
    @returns Replay inventory and clean-room audit metadata.
    """
    archive = _load_json(V3_ARCHIVE)
    entries = archive.get("entries")
    if not root.is_dir() or root.is_symlink() or not isinstance(entries, list):
        _fail("V3_REPLAY_ROOT_INVALID", str(root))
    return {"inventory": archive["closureInventory"], "realpathAudit": _clean_root_audit(root, entries)}


def _stage_audit(root: Path) -> dict[str, Any]:
    """Runs the final clean-root audit after all V3 command gates.

    @param root The external root after command execution.
    @returns Derived-path and overlay findings.
    """
    archive = _load_json(V3_ARCHIVE)
    entries = archive.get("entries")
    if not isinstance(entries, list):
        _fail("V3_AUDIT_ARCHIVE_SCHEMA")
    audit = _clean_root_audit(root, entries)
    # Installed dependencies and freshly generated build outputs are permitted
    # after replay, but they must resolve inside this unique temporary root.
    audit["nodeModulesOverlayPaths"] = []
    audit["preexistingGeneratedPaths"] = []
    return audit


def _run_child(stage: str, root: Path) -> dict[str, Any]:
    """Runs one isolated Python materialization stage with an empty host environment.

    @param stage The explicit stage name.
    @param root The clean external root passed to the stage.
    @returns Captured command provenance including unreified raw streams.
    """
    argv = [
        sys.executable,
        "-B",
        "-m",
        "measure.business_operations_graph_baseline_execution_closure_v3",
        stage,
        "--root",
        str(root),
    ]
    result = subprocess.run(
        argv,
        cwd=_REPO_ROOT,
        env=ENV_ALLOWLIST,
        capture_output=True,
        text=True,
        check=False,
    )
    return {
        "id": stage.removesuffix("-v3"),
        "argv": argv,
        "executorArgv": argv,
        "cwd": ".",
        "env": dict(ENV_ALLOWLIST),
        "envAbsent": list(ENV_ABSENT),
        "network": False,
        "exitCode": result.returncode,
        "stdoutText": result.stdout,
        "stderrText": result.stderr,
    }


def _executor_argv(argv: list[str]) -> list[str]:
    """Returns the literal OS invocation for a logical command under a blank PATH.

    @param argv The canonical command required by the closure contract.
    @returns An absolute executable argv that does not inherit PATH.
    @throws core.ExecutionClosureValidationError When a tool is unavailable.
    """
    if not argv:
        _fail("V3_EXECUTOR_ARGV_EMPTY")
    if argv[0] == "pnpm":
        if not _NODE.is_file() or not _PNPM.is_file():
            _fail("V3_PNPM_LAUNCHER_UNAVAILABLE")
        return [str(_NODE), str(_PNPM), *argv[1:]]
    if argv[0] == "node":
        if not _NODE.is_file():
            _fail("V3_NODE_LAUNCHER_UNAVAILABLE")
        return [str(_NODE), *argv[1:]]
    if argv[0] == "repo-graph":
        if not _REPO_GRAPH.is_file():
            _fail("V3_SCANNER_LAUNCHER_UNAVAILABLE")
        return [str(_REPO_GRAPH), *argv[1:]]
    return list(argv)


def _run_command(command_id: str, argv: list[str], root: Path) -> dict[str, Any]:
    """Runs one logical V3 gate with only CI exposed to its child process.

    @param command_id The stable receipt command identifier.
    @param argv The canonical contract command argv.
    @param root The clean materialized execution root.
    @returns Captured command provenance before raw stream files are written.
    """
    executor = _executor_argv(argv)
    result = subprocess.run(
        executor,
        cwd=root,
        env=ENV_ALLOWLIST,
        capture_output=True,
        text=True,
        check=False,
    )
    return {
        "id": command_id,
        "argv": list(argv),
        "executorArgv": executor,
        "cwd": ".",
        "env": dict(ENV_ALLOWLIST),
        "envAbsent": list(ENV_ABSENT),
        "network": False,
        "exitCode": result.returncode,
        "stdoutText": result.stdout,
        "stderrText": result.stderr,
    }


def _write_raw(directory: Path, command: dict[str, Any]) -> dict[str, Any]:
    """Writes raw streams for one command and returns a receipt-ready record.

    @param directory The V3 artifact directory.
    @param command The captured command record.
    @returns The command record with immutable stream references.
    """
    value = copy.deepcopy(command)
    command_id = str(value["id"])
    raw = directory / "raw"
    raw.mkdir(parents=True, exist_ok=True)
    stdout = raw / f"{command_id}.stdout.txt"
    stderr = raw / f"{command_id}.stderr.txt"
    stdout.write_text(str(value.pop("stdoutText")), encoding="utf-8")
    stderr.write_text(str(value.pop("stderrText")), encoding="utf-8")
    value["stdout"] = _reference(stdout)
    value["stderr"] = _reference(stderr)
    return value


def _tool_file_identity(path: Path) -> dict[str, Any]:
    """Records an immutable external tool launcher identity.

    @param path The absolute executable or launcher path.
    @returns Absolute path, digest, and byte size.
    @throws core.ExecutionClosureValidationError When the required tool is absent.
    """
    if not path.is_file() or path.is_symlink():
        _fail("V3_TOOL_LAUNCHER_UNSAFE", str(path))
    data = path.read_bytes()
    return {"path": str(path), "sha256": _sha256(data), "size": len(data)}


def _tool_versions(root: Path) -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
    """Captures actual tool version output and explicit launcher identities.

    @param root The clean root used only as the command cwd.
    @returns The public version map and private executor-toolchain identity map.
    """
    logical = {
        "node": ["node", "--version"],
        "pnpm": ["pnpm", "--version"],
        "scanner": ["repo-graph", "--version"],
    }
    versions: dict[str, dict[str, Any]] = {}
    for name, argv in logical.items():
        executor = _executor_argv(argv)
        result = subprocess.run(executor, cwd=root, env=ENV_ALLOWLIST, capture_output=True, text=True, check=False)
        stdout = result.stdout.strip() or result.stderr.strip()
        if result.returncode != 0 or not stdout:
            _fail("V3_TOOL_VERSION_UNAVAILABLE", name)
        versions[name] = {
            "argv": argv,
            "executorArgv": executor,
            "stdout": stdout,
            "stdoutSha256": _sha256(stdout.encode("utf-8")),
        }
    return versions, {
        "node": _tool_file_identity(_NODE),
        "pnpmLauncher": _tool_file_identity(_PNPM),
        "repoGraph": _tool_file_identity(_REPO_GRAPH),
    }


def _tree_inventory(root: Path) -> dict[str, Any]:
    """Records a post-command source-tree digest while excluding dependency overlays.

    @param root The clean root after a command stage.
    @returns A bounded inventory of regular files outside node_modules and .git.
    """
    rows: list[dict[str, Any]] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.is_symlink():
            continue
        logical = path.relative_to(root).as_posix()
        if set(PurePosixPath(logical).parts) & {"node_modules", ".git"}:
            continue
        data = path.read_bytes()
        rows.append({"path": logical, "sha256": _sha256(data), "size": len(data)})
    return {"entryCount": len(rows), "sha256": _sha256(_canonical(rows))}


def _parse_stage(command: dict[str, Any], stage: str) -> dict[str, Any]:
    """Parses one successful JSON child-stage result.

    @param command The captured child command record.
    @param stage The stable stage name for diagnostics.
    @returns The parsed stage object.
    @throws core.ExecutionClosureValidationError When the stage failed or lied.
    """
    if command.get("exitCode") != 0:
        _fail("V3_STAGE_FAILED", stage)
    try:
        value = json.loads(str(command.get("stdoutText", "")))
    except json.JSONDecodeError as error:
        _fail("V3_STAGE_OUTPUT_INVALID", f"{stage}: {error}")
    if not isinstance(value, dict):
        _fail("V3_STAGE_OUTPUT_INVALID", stage)
    return value


def _v2_immutable_audit() -> dict[str, Any]:
    """Rechecks frozen v2 evidence and blocker bytes without moving any marker.

    @returns The immutable V2 evidence audit for the fresh candidate.
    """
    findings: list[dict[str, str]] = []
    tamper: list[dict[str, Any]] = []
    for name, expected in core.V2_EVIDENCE.items():
        observed = _reference(core.TRACK_DIR / expected["path"])
        ok = observed == expected
        tamper.append({"name": name, "expected": expected, "observed": observed, "ok": ok})
        if not ok:
            findings.append({"code": "V2_EVIDENCE_TAMPER", "name": name})
    blocker_records: list[dict[str, Any]] = []
    for expected in core.BLOCKER_RECORDS:
        observed = _reference(core.TRACK_DIR / expected["path"])
        ok = observed == expected
        blocker_records.append({"path": expected["path"], "expected": expected, "observed": observed, "ok": ok})
        if not ok:
            findings.append({"code": "V2_BLOCKER_TAMPER", "path": expected["path"]})
    absent: list[dict[str, Any]] = []
    for logical in NON_DERIVABLE_INPUTS:
        was_absent = logical not in core._read_v2_archive_entries()
        absent.append({"path": logical, "absentFromFrozenV2Archive": was_absent})
        if not was_absent:
            findings.append({"code": "V2_OMISSION_NOT_ABSENT", "path": logical})
    return {
        "v2Evidence": copy.deepcopy(core.V2_EVIDENCE),
        "blockerRecords": copy.deepcopy(core.BLOCKER_RECORDS),
        "tamperChecks": tamper,
        "absenceChecks": absent,
        "findings": findings,
    }


def _ledger(archive: dict[str, Any]) -> dict[str, Any]:
    """Builds the V3 omission ledger from the immutable strengthened addendum.

    @param archive The V3 source archive.
    @returns The candidate-only ledger.
    """
    addendum_ledger = _load_json(ADDENDUM_LEDGER)
    discovery = addendum_ledger.get("derivation", {}).get("discovery")
    if not isinstance(discovery, dict):
        _fail("V3_ADDENDUM_DISCOVERY_UNAVAILABLE")
    by_path = {entry["path"]: entry for entry in archive["entries"]}
    source_inputs = []
    for path in NON_DERIVABLE_INPUTS:
        entry = by_path.get(path)
        if not isinstance(entry, dict):
            _fail("V3_LEDGER_ARCHIVE_INPUT_MISSING", path)
        source_inputs.append(
            {
                "path": path,
                "realpath": path,
                "sha256": entry["sha256"],
                "size": entry["size"],
                "mode": entry["mode"],
            }
        )
    omissions = copy.deepcopy(addendum_ledger.get("omissions"))
    if not isinstance(omissions, list):
        _fail("V3_ADDENDUM_OMISSIONS_UNAVAILABLE")
    return {
        "schemaVersion": 1,
        "kind": "execution-input-omission-ledger",
        "status": "CANDIDATE_UNACCEPTED",
        "derivation": {
            "rule": "frozen-ast-execution-closure-v1",
            "bridge": {
                "addendumLedger": _reference(ADDENDUM_LEDGER),
                "rowDigest": discovery.get("rowDigest"),
            },
            "discovery": copy.deepcopy(discovery),
        },
        "classificationAudit": {
            "dynamicInputs": [],
            "orphanedInputs": [],
            "duplicateClassifications": [],
        },
        "sourceInputs": source_inputs,
        "omissions": omissions,
    }


def _blocked_attempt(directory: Path, reason: str, commands: list[dict[str, Any]]) -> None:
    """Persists a truthful failed clean-room attempt without publishing a candidate.

    @param directory The V3 candidate directory.
    @param reason The failed stage or command identifier.
    @param commands The already-run commands with raw references.
    @returns Nothing.
    """
    _write_json(
        directory / "blocked-attempt.json",
        {
            "schemaVersion": 1,
            "kind": "execution-closure-blocker",
            "status": "BLOCKED",
            "reason": reason,
            "commands": commands,
            "markerDisposition": copy.deepcopy(core.MARKER_DISPOSITION),
            "upstreamAuthority": "NONE",
        },
    )


def write_execution_closure_v1(output_directory: Path | str = V3_DIR) -> None:
    """Executes the real clean-room V3 closure and writes a candidate only on success.

    @param output_directory The track-owned output directory.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError When a command gate fails after a blocker receipt is written.
    """
    output = Path(output_directory)
    output.mkdir(parents=True, exist_ok=True)
    archive = _build_archive()
    _write_json(output / V3_ARCHIVE.name, archive)
    commands: list[dict[str, Any]] = []
    with tempfile.TemporaryDirectory(prefix="business-operations-r1-v3-", dir="/tmp") as temporary:
        root = Path(temporary) / "source"
        materialize = _run_child("materialize-v3", root)
        materialized = _parse_stage(materialize, "materialize-v3")
        commands.append(_write_raw(output, materialize))
        replay = _run_child("replay-v3", root)
        replayed = _parse_stage(replay, "replay-v3")
        commands.append(_write_raw(output, replay))
        replay_audit = replayed.get("realpathAudit")
        if (
            materialized.get("inventory") != archive["closureInventory"]
            or replayed.get("inventory") != archive["closureInventory"]
            or not isinstance(replay_audit, dict)
            or any(replay_audit.get(key) != [] for key in replay_audit)
        ):
            _blocked_attempt(output, "clean-room-replay", commands)
            _fail("V3_CLEAN_ROOM_REPLAY_INVALID")
        tools, toolchain = _tool_versions(root)
        for command_id, argv in [
            ("offline-install", ["pnpm", "install", "--offline", "--frozen-lockfile"]),
            ("build-db", BUILDS[0]),
            ("build-auth", BUILDS[1]),
            ("build-backend", BUILDS[2]),
            ("generate-standard-pack-catalog", STANDARD_PACK_GENERATOR),
            *FR4,
        ]:
            command = _run_command(command_id, list(argv), root)
            command = _write_raw(output, command)
            if command_id == "generate-standard-pack-catalog":
                generated = root / STANDARD_PACK_CATALOG
                if generated.is_file() and not generated.is_symlink():
                    command["output"] = {
                        "path": STANDARD_PACK_CATALOG,
                        "sha256": _sha256(generated.read_bytes()),
                        "size": generated.stat().st_size,
                    }
            commands.append(command)
            if command["exitCode"] != 0:
                _blocked_attempt(output, command_id, commands)
                _fail("V3_COMMAND_GATE_FAILED", command_id)
        post_build = _tree_inventory(root)
        # The generator above is intentionally part of the command sequence;
        # its output is captured in the final tree inventory separately.
        post_generation = _tree_inventory(root)
        graph_command = _run_command("graph-scan", ["repo-graph", "scan", ".", "./graph.db"], root)
        graph_command = _write_raw(output, graph_command)
        if graph_command["exitCode"] != 0:
            _blocked_attempt(output, "graph-scan", [*commands, graph_command])
            _fail("V3_GRAPH_SCAN_FAILED")
        final_audit_command = _run_child("audit-v3", root)
        final_audit = _parse_stage(final_audit_command, "audit-v3")
        final_audit_command = _write_raw(output, final_audit_command)
    profile = {
        "schemaVersion": 1,
        "kind": "fr4-execution-profile",
        "status": "CANDIDATE_UNACCEPTED",
        "cleanRoom": {
            "prohibitedOverlays": ["shared-worktree", "node_modules", "dist", "preexisting-generated"],
            "preexistingGeneratedPaths": [],
            "replayCommand": next(item for item in commands if item["id"] == "replay"),
        },
        "install": {"argv": ["pnpm", "install", "--offline", "--frozen-lockfile"], "cwd": "."},
        "prerequisiteBuilds": copy.deepcopy(list(BUILDS)),
        "fr4Commands": [
            {"id": command_id, "argv": argv, "env": dict(ENV_ALLOWLIST)} for command_id, argv in FR4
        ],
        "standardPackCatalog": {
            "mode": "REQUIRES_RECORDED_GENERATION",
            "argv": list(STANDARD_PACK_GENERATOR),
            "output": {"path": STANDARD_PACK_CATALOG},
        },
        "environment": {"allowlisted": dict(ENV_ALLOWLIST), "absencePredicates": list(ENV_ABSENT)},
        "conditionalSkips": {"PG_TEST_URL": "ABSENT"},
        "outcomeCensus": {
            "tests": [name for name, _ in FR4],
            "passed": [name for name, _ in FR4],
            "failed": [],
            "skipped": {"PG_TEST_URL": "ABSENT"},
        },
        "toolVersions": tools,
        "executorToolchain": toolchain,
        "baselineV2Inventory": {"pre": copy.deepcopy(BASELINE_V2_INVENTORY), "post": copy.deepcopy(BASELINE_V2_INVENTORY)},
        "closureInventory": archive["closureInventory"],
        "frozenInputs": {
            "archive": _reference(output / V3_ARCHIVE.name),
            "lockfile": next(
                {key: entry[key] for key in ("path", "sha256", "size")}
                for entry in archive["entries"]
                if entry["path"] == "pnpm-lock.yaml"
            ),
        },
    }
    _write_json(output / V3_PROFILE.name, profile)
    ledger = _ledger(archive)
    _write_json(output / V3_LEDGER.name, ledger)
    receipt = {
        "schemaVersion": 1,
        "kind": "fr4-execution-receipt",
        "status": "CANDIDATE_UNACCEPTED",
        "commands": commands,
        "toolVersions": tools,
        "executorToolchain": toolchain,
        "frozenInputs": profile["frozenInputs"],
        "baselineV2Inventory": profile["baselineV2Inventory"],
        "closureInventory": archive["closureInventory"],
        "orderedInventories": [
            {"stage": "baseline-v2-pre", "inventory": copy.deepcopy(BASELINE_V2_INVENTORY)},
            {"stage": "baseline-v2-post", "inventory": copy.deepcopy(BASELINE_V2_INVENTORY)},
            {"stage": "closure-pre-build", "inventory": archive["closureInventory"]},
            {"stage": "closure-post-build", "inventory": post_build},
            {"stage": "closure-post-standard-pack-generation", "inventory": post_generation},
        ],
        "outcomeCensus": profile["outcomeCensus"],
        "realpathAudit": final_audit,
        "gateStatus": {
            "algorithm": "all-command-exits-and-expected-skip-census-v1",
            "orderedCommandIds": [item["id"] for item in commands],
            "exitCodes": {item["id"]: item["exitCode"] for item in commands},
            "expectedSkipCensus": profile["conditionalSkips"],
            "observedSkipCensus": profile["conditionalSkips"],
            "status": "PASS",
        },
    }
    _write_json(output / V3_RECEIPT.name, receipt)
    closure_core = {
        "archive": _reference(output / V3_ARCHIVE.name),
        "ledger": _reference(output / V3_LEDGER.name),
        "profile": _reference(output / V3_PROFILE.name),
        "receipt": _reference(output / V3_RECEIPT.name),
    }
    closure = {**closure_core, "closureSha256": _sha256(_canonical(closure_core))}
    immutable_audit = _v2_immutable_audit()
    if immutable_audit["findings"]:
        _blocked_attempt(output, "immutable-v2-audit", commands)
        _fail("V3_IMMUTABLE_V2_AUDIT_FAILED")
    graph_binding = {
        "schemaVersion": 1,
        "kind": "execution-closure-graph-binding",
        "status": "CANDIDATE_UNACCEPTED",
        "executionClosure": closure,
        "scanCommand": "repo-graph scan . ./graph.db",
        "rawStreams": [graph_command["stdout"], graph_command["stderr"]],
    }
    _write_json(output / V3_GRAPH.name, graph_binding)
    clean_audit = {
        "schemaVersion": 1,
        "kind": "execution-closure-clean-audit",
        "status": "CANDIDATE_UNACCEPTED",
        "executionClosure": closure,
        "rawStreams": [final_audit_command["stdout"], final_audit_command["stderr"]],
        "cleanRoom": final_audit,
        "task3ImmutableAudit": immutable_audit,
    }
    _write_json(output / V3_AUDIT.name, clean_audit)
    compensation = {
        "schemaVersion": 1,
        "kind": "execution-closure-compensation-denominator",
        "status": "CANDIDATE_UNACCEPTED",
        "executionClosure": closure,
        "rawStreams": [
            next(item for item in commands if item["id"] == "materialize")["stdout"],
            next(item for item in commands if item["id"] == "replay")["stdout"],
        ],
        "denominator": {"sourceEntries": archive["closureInventory"]["entryCount"], "fr4Commands": len(FR4)},
    }
    _write_json(output / V3_COMPENSATION.name, compensation)
    addendum_receipt = _load_json(ADDENDUM_RECEIPT)
    manifest = {
        "schemaVersion": 1,
        "kind": "execution-closure",
        "status": "CANDIDATE_UNACCEPTED",
        "selectionRule": "frozen-ast-execution-closure-v1",
        "r2Task3Disposition": "BLOCKED_PENDING_INDEPENDENT_R1_V3_ACCEPTANCE",
        "markerDisposition": addendum_receipt["markerDisposition"],
        "acceptedBridgeInputs": {
            "addendum": {
                "receipt": _reference(ADDENDUM_RECEIPT),
                "provenance": _reference(ADDENDUM_PROVENANCE),
                "ledger": _reference(ADDENDUM_LEDGER),
            },
            "v2Blockers": copy.deepcopy(core.BLOCKER_RECORDS),
            "v2RawStreams": copy.deepcopy(addendum_receipt["rawStreams"]),
        },
        "blockerAddendum": {
            "receipt": _reference(ADDENDUM_RECEIPT),
            "provenance": _reference(ADDENDUM_PROVENANCE),
            "ledger": _reference(ADDENDUM_LEDGER),
        },
        "closureCore": closure_core,
        "closureSha256": closure["closureSha256"],
        "derivedEvidence": {
            "graphBinding": _reference(output / V3_GRAPH.name),
            "cleanAudit": _reference(output / V3_AUDIT.name),
            "compensation": _reference(output / V3_COMPENSATION.name),
        },
    }
    _write_json(output / V3_MANIFEST.name, manifest)
    validate_execution_closure_v1(
        manifest,
        archive,
        ledger,
        profile,
        receipt,
        graph_binding,
        clean_audit,
        compensation,
    )


def _validate_archive(archive: dict[str, Any]) -> None:
    """Validates V3 source archive containment and hash-bound inventory.

    @param archive The candidate source archive.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError When archive evidence is unsafe.
    """
    entries = archive.get("entries")
    if not isinstance(entries, list) or not entries:
        _fail("V3_VALIDATE_ARCHIVE_SCHEMA")
    by_path: dict[str, dict[str, Any]] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            _fail("V3_VALIDATE_ARCHIVE_ENTRY")
        path = _normal_path(entry.get("path"))
        if path in by_path or _has_generated_part(path):
            _fail("V3_VALIDATE_ARCHIVE_PATH", path)
        required = {"path", "sha256", "size", "mode", "kind"}
        if not required <= set(entry) or not re.fullmatch(r"[0-9a-f]{64}", str(entry.get("sha256"))):
            _fail("V3_VALIDATE_ARCHIVE_ENTRY", path)
        if not isinstance(entry.get("size"), int) or entry["size"] < 0 or not re.fullmatch(r"10[0-7]{3}", str(entry.get("mode"))):
            _fail("V3_VALIDATE_ARCHIVE_ENTRY", path)
        if entry.get("kind") == "file":
            content = entry.get("contentBase64")
            if not isinstance(content, str):
                _fail("V3_VALIDATE_ARCHIVE_CONTENT", path)
            try:
                data = base64.b64decode(content, validate=True)
            except ValueError:
                _fail("V3_VALIDATE_ARCHIVE_CONTENT", path)
            if len(data) != entry["size"] or _sha256(data) != entry["sha256"]:
                _fail("V3_VALIDATE_ARCHIVE_CONTENT", path)
        by_path[path] = entry
    if set(NON_DERIVABLE_INPUTS) - set(by_path):
        _fail("V3_VALIDATE_ARCHIVE_OMISSIONS")
    if archive.get("closureInventory") != _inventory(entries):
        _fail("V3_VALIDATE_ARCHIVE_INVENTORY")


def _validate_profile(profile: dict[str, Any], archive: dict[str, Any]) -> None:
    """Validates the source-only clean-room execution profile.

    @param profile The untrusted execution profile.
    @param archive The validated archive for frozen input comparisons.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError When the profile is incomplete.
    """
    baseline = {"pre": BASELINE_V2_INVENTORY, "post": BASELINE_V2_INVENTORY}
    if profile.get("baselineV2Inventory") != baseline or profile.get("closureInventory") != archive.get("closureInventory"):
        _fail("V3_VALIDATE_PROFILE_INVENTORY")
    if profile.get("install") != {"argv": ["pnpm", "install", "--offline", "--frozen-lockfile"], "cwd": "."}:
        _fail("V3_VALIDATE_PROFILE_INSTALL")
    if profile.get("prerequisiteBuilds") != list(BUILDS):
        _fail("V3_VALIDATE_PROFILE_BUILDS")
    if profile.get("environment") != {"allowlisted": ENV_ALLOWLIST, "absencePredicates": ENV_ABSENT}:
        _fail("V3_VALIDATE_PROFILE_ENVIRONMENT")
    clean = profile.get("cleanRoom")
    if not isinstance(clean, dict) or clean.get("prohibitedOverlays") != ["shared-worktree", "node_modules", "dist", "preexisting-generated"] or clean.get("preexistingGeneratedPaths") != []:
        _fail("V3_VALIDATE_PROFILE_CLEAN_ROOM")
    expected_fr4 = [{"id": name, "argv": argv, "env": ENV_ALLOWLIST} for name, argv in FR4]
    if profile.get("fr4Commands") != expected_fr4:
        _fail("V3_VALIDATE_PROFILE_FR4")
    frozen = profile.get("frozenInputs")
    if not isinstance(frozen, dict) or "manifest" in frozen or frozen.get("archive") != _reference(V3_ARCHIVE):
        _fail("V3_VALIDATE_PROFILE_FROZEN_INPUTS")
    lockfile = frozen.get("lockfile")
    archive_lockfile = next((entry for entry in archive["entries"] if entry["path"] == "pnpm-lock.yaml"), None)
    if not isinstance(lockfile, dict) or not isinstance(archive_lockfile, dict) or lockfile != {key: archive_lockfile[key] for key in ("path", "sha256", "size")}:
        _fail("V3_VALIDATE_PROFILE_LOCKFILE")
    for name, argv in {"node": ["node", "--version"], "pnpm": ["pnpm", "--version"], "scanner": ["repo-graph", "--version"]}.items():
        identity = profile.get("toolVersions", {}).get(name) if isinstance(profile.get("toolVersions"), dict) else None
        if not isinstance(identity, dict) or identity.get("argv") != argv or not identity.get("stdout") or identity.get("stdoutSha256") != _sha256(str(identity.get("stdout")).encode("utf-8")) or not isinstance(identity.get("executorArgv"), list):
            _fail("V3_VALIDATE_PROFILE_TOOL", name)


def _validate_receipt(receipt: dict[str, Any], profile: dict[str, Any], archive: dict[str, Any]) -> None:
    """Validates exact command order, raw receipt references, and gate status.

    @param receipt The untrusted command receipt.
    @param profile The validated profile.
    @param archive The validated source archive.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError When a gate receipt drifts.
    """
    commands = receipt.get("commands")
    expected_ids = ["materialize", "replay", "offline-install", "build-db", "build-auth", "build-backend", "generate-standard-pack-catalog", *[name for name, _ in FR4]]
    if not isinstance(commands, list) or [item.get("id") if isinstance(item, dict) else None for item in commands] != expected_ids:
        _fail("V3_VALIDATE_RECEIPT_ORDER")
    expected_argv = {
        "offline-install": ["pnpm", "install", "--offline", "--frozen-lockfile"],
        "build-db": BUILDS[0],
        "build-auth": BUILDS[1],
        "build-backend": BUILDS[2],
        "generate-standard-pack-catalog": STANDARD_PACK_GENERATOR,
        **{name: argv for name, argv in FR4},
    }
    for command in commands:
        if not isinstance(command, dict) or not {"argv", "executorArgv", "cwd", "env", "envAbsent", "network", "exitCode", "stdout", "stderr"} <= set(command):
            _fail("V3_VALIDATE_RECEIPT_COMMAND")
        command_id = command["id"]
        if command_id in expected_argv and command.get("argv") != expected_argv[command_id]:
            _fail("V3_VALIDATE_RECEIPT_ARGV", command_id)
        if command.get("cwd") != "." or command.get("env") != ENV_ALLOWLIST or command.get("envAbsent") != ENV_ABSENT or command.get("network") is not False or command.get("exitCode") != 0 or not isinstance(command.get("executorArgv"), list):
            _fail("V3_VALIDATE_RECEIPT_COMMAND", command_id)
        for stream in ("stdout", "stderr"):
            reference = command.get(stream)
            if not isinstance(reference, dict):
                _fail("V3_VALIDATE_RECEIPT_STREAM", command_id)
            expected_path = V3_DIR / reference.get("path", "")
            if reference != _reference(expected_path):
                _fail("V3_VALIDATE_RECEIPT_STREAM", command_id)
    if receipt.get("toolVersions") != profile.get("toolVersions") or receipt.get("executorToolchain") != profile.get("executorToolchain") or receipt.get("frozenInputs") != profile.get("frozenInputs"):
        _fail("V3_VALIDATE_RECEIPT_SHARED_FIELDS")
    if receipt.get("baselineV2Inventory") != profile.get("baselineV2Inventory") or receipt.get("closureInventory") != archive.get("closureInventory"):
        _fail("V3_VALIDATE_RECEIPT_INVENTORY")
    inventories = receipt.get("orderedInventories")
    names = ["baseline-v2-pre", "baseline-v2-post", "closure-pre-build", "closure-post-build", "closure-post-standard-pack-generation"]
    if not isinstance(inventories, list) or [item.get("stage") if isinstance(item, dict) else None for item in inventories] != names or inventories[0].get("inventory") != BASELINE_V2_INVENTORY or inventories[1].get("inventory") != BASELINE_V2_INVENTORY or inventories[2].get("inventory") != archive.get("closureInventory"):
        _fail("V3_VALIDATE_RECEIPT_INVENTORY")
    audit = receipt.get("realpathAudit")
    if not isinstance(audit, dict) or audit.get("sourceRootOverlayPaths") != [] or audit.get("nodeModulesOverlayPaths") != [] or audit.get("preexistingGeneratedPaths") != []:
        _fail("V3_VALIDATE_RECEIPT_AUDIT")
    gate = receipt.get("gateStatus")
    if not isinstance(gate, dict) or gate.get("algorithm") != "all-command-exits-and-expected-skip-census-v1" or gate.get("orderedCommandIds") != expected_ids or gate.get("exitCodes") != {item["id"]: item["exitCode"] for item in commands} or gate.get("expectedSkipCensus") != profile.get("conditionalSkips") or gate.get("observedSkipCensus") != profile.get("conditionalSkips") or gate.get("status") != "PASS":
        _fail("V3_VALIDATE_RECEIPT_GATE")
    if receipt.get("outcomeCensus") != profile.get("outcomeCensus"):
        _fail("V3_VALIDATE_RECEIPT_CENSUS")


def _validate_ledger(ledger: dict[str, Any], archive: dict[str, Any]) -> None:
    """Validates V3 ledger derivation and materialized source input metadata.

    @param ledger The untrusted candidate omission ledger.
    @param archive The validated archive.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError When discovery or classification drifts.
    """
    addendum_ledger = _load_json(ADDENDUM_LEDGER)
    expected_discovery = addendum_ledger.get("derivation", {}).get("discovery")
    derivation = ledger.get("derivation")
    if not isinstance(derivation, dict) or derivation.get("rule") != "frozen-ast-execution-closure-v1" or derivation.get("discovery") != expected_discovery:
        _fail("V3_VALIDATE_LEDGER_DISCOVERY")
    if derivation.get("bridge") != {"addendumLedger": _reference(ADDENDUM_LEDGER), "rowDigest": expected_discovery.get("rowDigest")}:
        _fail("V3_VALIDATE_LEDGER_BRIDGE")
    expansion = expected_discovery.get("entrypointExpansion") if isinstance(expected_discovery, dict) else None
    if not isinstance(expansion, list) or [item.get("ordinal") if isinstance(item, dict) else None for item in expansion] != list(range(len(expansion))):
        _fail("V3_VALIDATE_LEDGER_EXPANSION")
    if ledger.get("classificationAudit") != {"dynamicInputs": [], "orphanedInputs": [], "duplicateClassifications": []}:
        _fail("V3_VALIDATE_LEDGER_CLASSIFICATION")
    by_path = {entry["path"]: entry for entry in archive["entries"]}
    source_inputs = ledger.get("sourceInputs")
    if not isinstance(source_inputs, list) or {item.get("path") for item in source_inputs if isinstance(item, dict)} != set(NON_DERIVABLE_INPUTS):
        _fail("V3_VALIDATE_LEDGER_SOURCE_INPUTS")
    for source in source_inputs:
        if not isinstance(source, dict):
            _fail("V3_VALIDATE_LEDGER_SOURCE_INPUTS")
        path = source["path"]
        entry = by_path.get(path)
        if not isinstance(entry, dict) or {key: source.get(key) for key in ("path", "realpath", "sha256", "size", "mode")} != {"path": path, "realpath": path, "sha256": entry["sha256"], "size": entry["size"], "mode": entry["mode"]}:
            _fail("V3_VALIDATE_LEDGER_SOURCE_INPUTS", path)
    omissions = ledger.get("omissions")
    if not isinstance(omissions, list) or not set(NON_DERIVABLE_INPUTS) <= {item.get("path") for item in omissions if isinstance(item, dict)}:
        _fail("V3_VALIDATE_LEDGER_OMISSIONS")
    standard = next((item for item in omissions if isinstance(item, dict) and item.get("path") == STANDARD_PACK_CATALOG), None)
    if not isinstance(standard, dict) or standard.get("classification") != "REQUIRES_RECORDED_GENERATION" or standard.get("generator", {}).get("argv") != STANDARD_PACK_GENERATOR or standard.get("generator", {}).get("output", {}).get("path") != STANDARD_PACK_CATALOG:
        _fail("V3_VALIDATE_LEDGER_STANDARD_PACK")


def _validate_derivatives(manifest: dict[str, Any], graph: dict[str, Any], audit: dict[str, Any], compensation: dict[str, Any]) -> None:
    """Validates freshly derived graph, audit, and compensation closure bindings.

    @param manifest The candidate manifest.
    @param graph The fresh graph-binding artifact.
    @param audit The fresh clean-audit artifact.
    @param compensation The fresh compensation artifact.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError When any derivative points elsewhere.
    """
    closure = {**manifest["closureCore"], "closureSha256": manifest["closureSha256"]}
    for name, artifact in (("graph", graph), ("audit", audit), ("compensation", compensation)):
        if artifact.get("status") != "CANDIDATE_UNACCEPTED" or artifact.get("executionClosure") != closure or not artifact.get("rawStreams"):
            _fail("V3_VALIDATE_DERIVATIVE", name)
    if graph.get("scanCommand") != "repo-graph scan . ./graph.db":
        _fail("V3_VALIDATE_GRAPH_SCAN")
    immutable = audit.get("task3ImmutableAudit")
    if not isinstance(immutable, dict) or immutable.get("v2Evidence") != core.V2_EVIDENCE or immutable.get("blockerRecords") != core.BLOCKER_RECORDS or not immutable.get("tamperChecks") or not immutable.get("absenceChecks") or immutable.get("findings") != []:
        _fail("V3_VALIDATE_IMMUTABLE_AUDIT")


def _validate_manifest(manifest: dict[str, Any]) -> None:
    """Validates V3 manifest status, frozen bridge, and acyclic closure core.

    @param manifest The untrusted candidate manifest.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError When an acceptance boundary is crossed.
    """
    addendum_receipt = _load_json(ADDENDUM_RECEIPT)
    expected_addendum = {"receipt": _reference(ADDENDUM_RECEIPT), "provenance": _reference(ADDENDUM_PROVENANCE), "ledger": _reference(ADDENDUM_LEDGER)}
    if manifest.get("schemaVersion") != 1 or manifest.get("kind") != "execution-closure" or manifest.get("status") != "CANDIDATE_UNACCEPTED" or manifest.get("selectionRule") != "frozen-ast-execution-closure-v1" or "acceptedAt" in manifest:
        _fail("V3_VALIDATE_MANIFEST_SCHEMA")
    if manifest.get("r2Task3Disposition") != "BLOCKED_PENDING_INDEPENDENT_R1_V3_ACCEPTANCE" or manifest.get("markerDisposition") != addendum_receipt.get("markerDisposition"):
        _fail("V3_VALIDATE_MANIFEST_DISPOSITION")
    expected_bridge = {"addendum": expected_addendum, "v2Blockers": core.BLOCKER_RECORDS, "v2RawStreams": addendum_receipt.get("rawStreams")}
    if manifest.get("acceptedBridgeInputs") != expected_bridge or manifest.get("blockerAddendum") != expected_addendum:
        _fail("V3_VALIDATE_MANIFEST_BRIDGE")
    expected_core = {"archive": _reference(V3_ARCHIVE), "ledger": _reference(V3_LEDGER), "profile": _reference(V3_PROFILE), "receipt": _reference(V3_RECEIPT)}
    if manifest.get("closureCore") != expected_core or manifest.get("closureSha256") != _sha256(_canonical(expected_core)):
        _fail("V3_VALIDATE_MANIFEST_CORE")
    expected_derived = {"graphBinding": _reference(V3_GRAPH), "cleanAudit": _reference(V3_AUDIT), "compensation": _reference(V3_COMPENSATION)}
    if manifest.get("derivedEvidence") != expected_derived:
        _fail("V3_VALIDATE_MANIFEST_DERIVED")


def validate_execution_closure_v1(
    manifest: dict[str, Any],
    archive: dict[str, Any],
    ledger: dict[str, Any],
    profile: dict[str, Any],
    receipt: dict[str, Any],
    graph_binding: dict[str, Any],
    clean_audit: dict[str, Any],
    compensation: dict[str, Any],
) -> None:
    """Validates every hash-bound V3 candidate artifact without unblocking R2.

    @param manifest The candidate manifest.
    @param archive The source-complete archive.
    @param ledger The mechanically derived omission ledger.
    @param profile The isolated FR4 execution profile.
    @param receipt The exact command receipt.
    @param graph_binding The fresh graph binding.
    @param clean_audit The fresh clean-room and immutable-v2 audit.
    @param compensation The fresh compensation denominator.
    @returns Nothing when the candidate is internally valid.
    @throws core.ExecutionClosureValidationError When an artifact is stale, mutable, or unsafe.
    """
    disk = (
        _load_json(V3_MANIFEST),
        _load_json(V3_ARCHIVE),
        _load_json(V3_LEDGER),
        _load_json(V3_PROFILE),
        _load_json(V3_RECEIPT),
        _load_json(V3_GRAPH),
        _load_json(V3_AUDIT),
        _load_json(V3_COMPENSATION),
    )
    supplied = (manifest, archive, ledger, profile, receipt, graph_binding, clean_audit, compensation)
    if supplied != disk:
        _fail("V3_VALIDATE_IN_MEMORY_MUTATION")
    _validate_archive(archive)
    _validate_profile(profile, archive)
    _validate_receipt(receipt, profile, archive)
    _validate_ledger(ledger, archive)
    _validate_manifest(manifest)
    _validate_derivatives(manifest, graph_binding, clean_audit, compensation)


def _main() -> None:
    """Runs one explicit external V3 materialization, replay, or audit stage.

    @returns Nothing.
    @throws core.ExecutionClosureValidationError When command arguments are unsupported.
    """
    if len(sys.argv) != 4 or sys.argv[2] != "--root":
        _fail("V3_STAGE_USAGE")
    stage = sys.argv[1]
    root = Path(sys.argv[3])
    if stage == "materialize-v3":
        value = _stage_materialize(root)
    elif stage == "replay-v3":
        value = _stage_replay(root)
    elif stage == "audit-v3":
        value = _stage_audit(root)
    else:
        _fail("V3_STAGE_USAGE", stage)
    print(json.dumps(value, sort_keys=True))


if __name__ == "__main__":
    _main()
