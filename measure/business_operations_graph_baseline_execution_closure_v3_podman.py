"""Builds the route-proven Podman R1 v3 execution-closure candidate.

This producer deliberately does not reuse the provisional host-executed v3
writer.  Every materialization, replay, build, generation, test, graph, and
runtime-audit operation is executed through a no-network Podman container.
The candidate directory is not created until all of those operations succeed.
"""
from __future__ import annotations

import base64
import copy
import hashlib
import json
import posixpath
import os
import signal
import re
from datetime import datetime, timezone
import shutil
import stat
import subprocess
import tempfile
from pathlib import Path, PurePosixPath
from typing import Any

from . import business_operations_graph_baseline_execution_closure as core
from . import business_operations_graph_baseline_execution_closure_addendum_v2 as addendum


TRACK_DIR = core.TRACK_DIR
REPO_ROOT = TRACK_DIR.parents[2]
V3_NAME = "r1-v3-execution-closure-20260801"
V3_DIR = TRACK_DIR / V3_NAME
V3_ARCHIVE = V3_DIR / "execution-closure.archive.json"
V3_LEDGER = V3_DIR / "omissions-ledger.json"
V3_PROFILE = V3_DIR / "fr4-execution-profile.json"
V3_RECEIPT = V3_DIR / "fr4-execution-receipt.json"
V3_GRAPH = V3_DIR / "graph-binding.json"
V3_AUDIT = V3_DIR / "clean-audit-attempt.json"
V3_COMPENSATION = V3_DIR / "compensation-denominator.json"
V3_MANIFEST = V3_DIR / "execution-closure.manifest.json"
BLOCKER_DIR = TRACK_DIR / "r1-v3-podman-execution-blocker-20260801"
HISTORICAL_PODMAN_BLOCKER = BLOCKER_DIR / "blocker.json"
LEGACY_ATTEMPT_DATE = "20260801"
ATTEMPT_PREFIX = "r1-v3-podman-execution-attempt"
ATTEMPT_NAMING_RULE = "r1-v3-podman-execution-attempt-YYYYMMDD-NNNN"
ADDENDUM_RECEIPT = core.ADDENDUM_DIR / "receipt.json"
ADDENDUM_PROVENANCE = core.ADDENDUM_DIR / "execution-provenance.json"
ADDENDUM_LEDGER = core.ADDENDUM_DIR / "execution-input-omission-ledger.json"

DERIVED_PARTS = {".git", "node_modules", ".turbo", ".next", "dist", "build", "coverage", "target"}
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
SUPPLEMENTAL_PATHS = (
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
DIRECT_NODE_STANDARD_PACK_GENERATOR = [
    "node",
    "packages/advantage-play-kit/scripts/generate-standard-pack-release.mjs",
]
# H2 runs the generator from the package cwd, so the live segment argv is
# package-relative. Evidence validators must read this same constant; a third
# hardcoded literal is what let the failed-attempt validator fall behind H2.
PACKAGE_RELATIVE_STANDARD_PACK_GENERATOR = [
    "node",
    "scripts/generate-standard-pack-release.mjs",
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
NONINSTALL_PNPM_COMMANDS = (
    ("build-db", BUILDS[0]),
    ("build-auth", BUILDS[1]),
    ("build-backend", BUILDS[2]),
    *FR4,
)

BASELINE_V2_INVENTORY = {
    "entryCount": 6868,
    "sha256": "8c5a2c2d1914667843df51e2c8180b8cd812c0295eb0c972ce45c80e4d213d51",
}
ENV = {"CI": "true"}
ENV_ABSENT = ["PG_TEST_URL"]
PODMAN = "/usr/bin/podman"
IMAGE_REFERENCE = "node:22-slim"
IMAGE_DIGEST = "sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3"
IMAGE_RESOLVED = f"{IMAGE_REFERENCE}@{IMAGE_DIGEST}"
BOOTSTRAP_PATH = "/usr/local/bin:/usr/bin:/bin"
CONTAINER_NODE = "/usr/local/bin/node"
CONTAINER_PNPM = "/opt/pnpm/bin/pnpm.mjs"
DIRECT_RUNTIME_TRACE_CONFIG_PATH = "/runner/direct-runtime-trace-config.json"
DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS = "--import=/runner/direct-runtime-tracer.mjs"
NESTED_PNPM_RUNTIME_SHIM_PATH = "/usr/local/bin/pnpm"
NESTED_PNPM_RUNTIME_SHIM_BYTES = b'#!/bin/sh\nexec /usr/local/bin/node /opt/pnpm/bin/pnpm.mjs "$@"\n'
NESTED_PNPM_RUNTIME_SHIM_MODE = "100755"
NESTED_PNPM_RUNTIME_SHIM_SHA256 = "34b0b65d66551669ed031bf3c7f8a6f2808107b25a91fcbd3a8deee39b6631f9"
NESTED_PNPM_RUNTIME_SHIM_SIZE = 63
CONTAINER_REPO_GRAPH = "/opt/repo-graph"
CONTAINER_STORE = "/root/.local/share/pnpm/store/v11"
HOST_PNPM = Path("/home/daniel-bo/.local/lib/node_modules/pnpm")
HERMETIC_PNPM_VERSION = "11.8.0"
HERMETIC_PNPM_INSTALL = [
    "pnpm",
    "install",
    "--offline",
    "--frozen-lockfile",
    "--frozen-store",
    "--trust-lockfile",
]
HERMETIC_PNPM_PAYLOAD_SUFFIX = [
    "install",
    "--offline",
    "--frozen-lockfile",
    "--frozen-store",
    "--trust-lockfile",
    f"--store-dir={CONTAINER_STORE}",
]
HOST_STORE = Path("/home/daniel-bo/.local/share/pnpm/store/v11")
HOST_REPO_GRAPH = Path("/home/daniel-bo/.local/bin/repo-graph")


def _host_execution_environment() -> dict[str, str]:
    """Returns the host runtime environment needed to launch the Podman client.

    The candidate process itself receives the fixed ``env -i`` environment
    recorded in its executor receipt. The outer Podman client must retain its
    local runtime-discovery variables, so this helper only removes explicitly
    forbidden test variables and pins CI for the host-side launcher.

    @returns The host launcher environment.
    """
    environment = dict(os.environ)
    environment.update(ENV)
    for name in ENV_ABSENT:
        environment.pop(name, None)
    return environment


class CandidateExecutionBlocked(core.ExecutionClosureValidationError):
    """Raised after raw failure evidence has been preserved outside the candidate path."""


def _sha256(data: bytes) -> str:
    """Returns one lowercase SHA-256 digest.

    @param data The bytes to hash.
    @returns A hexadecimal digest.
    """
    return hashlib.sha256(data).hexdigest()


def _canonical(value: Any) -> bytes:
    """Returns deterministic JSON bytes for a JSON-compatible value.

    @param value The value to serialize.
    @returns Canonical UTF-8 JSON bytes.
    """
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _fail(code: str, detail: str = "") -> None:
    """Raises one fail-closed execution-closure error.

    @param code The stable failure code.
    @param detail Optional diagnostic context.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError Always.
    """
    suffix = f": {detail}" if detail else ""
    raise core.ExecutionClosureValidationError(f"{code}{suffix}")


def build_pnpm_global_store_payload_v1(logical: list[str]) -> list[str]:
    """Builds one pnpm payload with the container store selected before command arguments.

    @param logical The unchanged logical pnpm argv recorded in the command receipt.
    @returns The absolute Node and pnpm launcher payload with a global store selection.
    @throws core.ExecutionClosureValidationError When the logical command is not a pnpm invocation.
    """
    if not isinstance(logical, list) or not logical or logical[0] != "pnpm" or not all(isinstance(part, str) and part for part in logical):
        _fail("V3_PNPM_GLOBAL_STORE_LOGICAL_ARGV_INVALID")
    return [
        CONTAINER_NODE,
        CONTAINER_PNPM,
        f"--config.store-dir={CONTAINER_STORE}",
        *logical[1:],
    ]


def build_nested_pnpm_runtime_shim_contract_v1() -> dict[str, Any]:
    """Builds the exact hash-bound runtime shim contract for nested pnpm scripts.

    @returns The immutable shim mount, artifact, and launcher contract.
    @throws core.ExecutionClosureValidationError When the source-controlled shim bytes drift.
    """
    if (
        len(NESTED_PNPM_RUNTIME_SHIM_BYTES) != NESTED_PNPM_RUNTIME_SHIM_SIZE
        or _sha256(NESTED_PNPM_RUNTIME_SHIM_BYTES) != NESTED_PNPM_RUNTIME_SHIM_SHA256
    ):
        _fail("V3_NESTED_PNPM_RUNTIME_SHIM_SOURCE_INVALID")
    return {
        "schemaVersion": 1,
        "kind": "nested-pnpm-runtime-shim",
        "mount": {
            "id": "runnerTool:nested-pnpm-shim",
            "target": NESTED_PNPM_RUNTIME_SHIM_PATH,
            "access": "ro",
            "purpose": "hash-bound-nested-pnpm-shim",
        },
        "artifact": {
            "path": NESTED_PNPM_RUNTIME_SHIM_PATH,
            "mode": NESTED_PNPM_RUNTIME_SHIM_MODE,
            "sha256": NESTED_PNPM_RUNTIME_SHIM_SHA256,
            "size": NESTED_PNPM_RUNTIME_SHIM_SIZE,
        },
        "launcher": {
            "node": CONTAINER_NODE,
            "pnpmLauncher": CONTAINER_PNPM,
        },
    }


def validate_nested_pnpm_runtime_shim_contract_v1(contract: dict[str, Any]) -> None:
    """Validates one nested pnpm runtime-shim contract against the exact source contract.

    @param contract The claimed nested pnpm shim contract.
    @returns Nothing when every mount, artifact, and launcher field is exact.
    @throws core.ExecutionClosureValidationError When the shim contract is incomplete or changed.
    """
    if not isinstance(contract, dict) or contract != build_nested_pnpm_runtime_shim_contract_v1():
        _fail("V3_NESTED_PNPM_RUNTIME_SHIM_CONTRACT_INVALID")



_DIRECT_RUNTIME_DOCUMENT_SUFFIXES = {".json", ".md", ".tsv", ".txt"}
_DIRECT_RUNTIME_REQUIRED_RECEIPTS = {
    "IMPORT-RECEIPT.tsv",
    "CURATED-RECEIPT.tsv",
    "LICENSE-RECEIPT.tsv",
}
_DIRECT_RUNTIME_SCRIPT_RE = re.compile(
    r"^pnpm build && node (?P<argument>[A-Za-z0-9][A-Za-z0-9._/-]*)$"
)
_DIRECT_RUNTIME_RESERVATION_FIELDS = (
    "baselineGitMaterializationBytes",
    "candidateCowBytes",
    "archiveSupplementBytes",
    "derivedOutputBytes",
    "metadataBytes",
    "minimumHeadroomBytes",
)


def _direct_runtime_read_set_fail(code: str, detail: str = "") -> None:
    """Raises one stable direct-runtime read-set validation failure.

    @param code The invariant-specific failure suffix.
    @param detail Optional context for the failed invariant.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError Always.
    """
    _fail(f"V3_DIRECT_RUNTIME_READ_SET_{code}", detail)


def _direct_runtime_safe_path_v1(value: Any, code: str = "PATH_INVALID") -> str:
    """Returns one normalized, workspace-relative direct-runtime path.

    @param value The candidate path.
    @param code The failure suffix used for an unsafe path.
    @returns The unchanged safe path.
    @throws core.ExecutionClosureValidationError When the path is empty, escaping, or non-canonical.
    """
    if not isinstance(value, str) or not value or "\\" in value or "\x00" in value:
        _direct_runtime_read_set_fail(code, repr(value))
    path = PurePosixPath(value)
    if path.is_absolute() or path.as_posix() != value or any(part in {"", ".", ".."} for part in path.parts):
        _direct_runtime_read_set_fail(code, value)
    return value


def _direct_runtime_int_v1(value: Any, code: str, detail: str = "") -> int:
    """Returns one non-negative integer while excluding booleans.

    @param value The value to validate.
    @param code The invariant-specific failure suffix.
    @param detail Optional field context.
    @returns The validated integer.
    @throws core.ExecutionClosureValidationError When the value is negative or not an integer.
    """
    if not isinstance(value, int) or isinstance(value, bool) or value < 0:
        _direct_runtime_read_set_fail(code, detail)
    return value


def _direct_runtime_sha256_v1(value: Any, code: str, detail: str = "") -> str:
    """Returns one lowercase SHA-256 digest.

    @param value The candidate digest.
    @param code The invariant-specific failure suffix.
    @param detail Optional field context.
    @returns The validated digest.
    @throws core.ExecutionClosureValidationError When the digest is malformed.
    """
    if not isinstance(value, str) or re.fullmatch(r"[0-9a-f]{64}", value) is None:
        _direct_runtime_read_set_fail(code, detail)
    return value


def _direct_runtime_sha1_v1(value: Any, code: str, detail: str = "") -> str:
    """Returns one lowercase SHA-1 digest.

    @param value The candidate digest.
    @param code The invariant-specific failure suffix.
    @param detail Optional field context.
    @returns The validated digest.
    @throws core.ExecutionClosureValidationError When the digest is malformed.
    """
    if not isinstance(value, str) or re.fullmatch(r"[0-9a-f]{40}", value) is None:
        _direct_runtime_read_set_fail(code, detail)
    return value


def _direct_runtime_entry_bytes_v1(entry: Any, path: str, code: str) -> bytes:
    """Decodes and hash-verifies one frozen or baseline regular-file record.

    @param entry The record containing canonical path, bytes, digest, and size.
    @param path The expected workspace-relative path.
    @param code The invariant-specific failure suffix.
    @returns The exact decoded bytes.
    @throws core.ExecutionClosureValidationError When bytes or metadata are not hash-bound.
    """
    if not isinstance(entry, dict) or entry.get("path") != path:
        _direct_runtime_read_set_fail(code, path)
    _direct_runtime_sha256_v1(entry.get("sha256"), code, path)
    size = _direct_runtime_int_v1(entry.get("size"), code, path)
    encoded = entry.get("contentBase64")
    if not isinstance(encoded, str):
        _direct_runtime_read_set_fail(code, path)
    try:
        data = base64.b64decode(encoded, validate=True)
    except (ValueError, TypeError):
        _direct_runtime_read_set_fail(code, path)
    if len(data) != size or _sha256(data) != entry["sha256"]:
        _direct_runtime_read_set_fail(code, path)
    return data


def _direct_runtime_baseline_identity_v1(asset: dict[str, Any]) -> dict[str, Any]:
    """Builds the public immutable identity for one validated baseline Git blob.

    @param asset The validated baseline asset record.
    @returns The exact materialization identity used by runtime traces.
    """
    return {
        "path": asset["path"],
        "sha256": asset["sha256"],
        "size": asset["size"],
        "mode": asset["mode"],
        "origin": "BASELINE_GIT_BLOB",
        "baselineCommit": asset["baselineCommit"],
        "gitBlobSha1": asset["gitBlobSha1"],
        "inclusion": "MATERIALIZE_EXACT_BASELINE_BYTES",
    }


def _direct_runtime_baseline_assets_v1(baseline_assets: Any) -> dict[str, dict[str, Any]]:
    """Validates and indexes regular baseline Git blobs by their canonical paths.

    @param baseline_assets The externally captured baseline Git blob records.
    @returns Validated assets keyed by workspace-relative path.
    @throws core.ExecutionClosureValidationError When an asset is unsafe, duplicate, or unbound.
    """
    if not isinstance(baseline_assets, list) or not baseline_assets:
        _direct_runtime_read_set_fail("BASELINE_ASSETS_INVALID")
    result: dict[str, dict[str, Any]] = {}
    for asset in baseline_assets:
        if not isinstance(asset, dict):
            _direct_runtime_read_set_fail("BASELINE_ASSET_INVALID")
        path = _direct_runtime_safe_path_v1(asset.get("path"), "BASELINE_ASSET_PATH_INVALID")
        if path in result:
            _direct_runtime_read_set_fail("BASELINE_ASSET_DUPLICATE", path)
        if asset.get("kind") not in {None, "file"}:
            _direct_runtime_read_set_fail("BASELINE_ASSET_NONREGULAR", path)
        if asset.get("mode") not in {"100644", "100755"}:
            _direct_runtime_read_set_fail("BASELINE_ASSET_NONREGULAR", path)
        commit = asset.get("baselineCommit")
        if not isinstance(commit, str) or re.fullmatch(r"[0-9a-f]{40}", commit) is None:
            _direct_runtime_read_set_fail("BASELINE_ASSET_COMMIT_INVALID", path)
        _direct_runtime_sha1_v1(asset.get("gitBlobSha1"), "BASELINE_ASSET_BLOB_INVALID", path)
        data = _direct_runtime_entry_bytes_v1(asset, path, "BASELINE_ASSET_BYTES_INVALID")
        blob = b"blob " + str(len(data)).encode("ascii") + b"\0" + data
        if hashlib.sha1(blob).hexdigest() != asset["gitBlobSha1"]:
            _direct_runtime_read_set_fail("BASELINE_ASSET_BLOB_INVALID", path)
        result[path] = asset
    return result


def _direct_runtime_identity_is_valid_v1(value: Any, code: str) -> dict[str, Any]:
    """Validates one public baseline materialization identity.

    @param value The identity supplied by a discovery record or runtime trace.
    @param code The invariant-specific failure suffix.
    @returns The validated identity.
    @throws core.ExecutionClosureValidationError When the identity is incomplete or unsafe.
    """
    required = {
        "path",
        "sha256",
        "size",
        "mode",
        "origin",
        "baselineCommit",
        "gitBlobSha1",
        "inclusion",
    }
    if not isinstance(value, dict) or set(value) != required:
        _direct_runtime_read_set_fail(code)
    _direct_runtime_safe_path_v1(value["path"], code)
    _direct_runtime_sha256_v1(value["sha256"], code, value["path"])
    _direct_runtime_int_v1(value["size"], code, value["path"])
    if value["mode"] not in {"100644", "100755"}:
        _direct_runtime_read_set_fail(code, value["path"])
    if value["origin"] != "BASELINE_GIT_BLOB" or value["inclusion"] != "MATERIALIZE_EXACT_BASELINE_BYTES":
        _direct_runtime_read_set_fail(code, value["path"])
    if not isinstance(value["baselineCommit"], str) or re.fullmatch(r"[0-9a-f]{40}", value["baselineCommit"]) is None:
        _direct_runtime_read_set_fail(code, value["path"])
    _direct_runtime_sha1_v1(value["gitBlobSha1"], code, value["path"])
    return value


def _direct_runtime_frozen_index_v1(frozen_entries: Any) -> dict[str, dict[str, Any]]:
    """Indexes unique canonical frozen archive records without consulting the live workspace.

    @param frozen_entries The immutable archive entries.
    @returns The records keyed by normalized workspace-relative path.
    @throws core.ExecutionClosureValidationError When the archive shape is ambiguous or unsafe.
    """
    if not isinstance(frozen_entries, list) or not frozen_entries:
        _direct_runtime_read_set_fail("FROZEN_ENTRIES_INVALID")
    result: dict[str, dict[str, Any]] = {}
    for entry in frozen_entries:
        if not isinstance(entry, dict):
            _direct_runtime_read_set_fail("FROZEN_ENTRY_INVALID")
        path = _direct_runtime_safe_path_v1(entry.get("path"), "FROZEN_ENTRY_PATH_INVALID")
        if path in result:
            _direct_runtime_read_set_fail("FROZEN_ENTRY_DUPLICATE", path)
        result[path] = entry
    return result


def _direct_runtime_trigger_v1(
    frozen_entries: Any,
    logical_argv: Any,
) -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
    """Resolves one direct pnpm trigger to its frozen source package manifest.

    @param frozen_entries The immutable archive entries.
    @param logical_argv The unmodified direct pnpm command argv.
    @returns The frozen index and resolved trigger metadata.
    @throws core.ExecutionClosureValidationError When package resolution or script parsing is unsafe.
    """
    if (
        not isinstance(logical_argv, list)
        or len(logical_argv) != 4
        or logical_argv[0] != "pnpm"
        or logical_argv[1] != "--filter"
        or not all(isinstance(part, str) and part for part in logical_argv)
    ):
        _direct_runtime_read_set_fail("LOGICAL_ARGV_INVALID")
    package = logical_argv[2]
    script_name = logical_argv[3]
    index = _direct_runtime_frozen_index_v1(frozen_entries)
    records: dict[str, dict[str, Any]] = {}
    for path in sorted(index):
        parts = PurePosixPath(path).parts
        if (
            PurePosixPath(path).name != "package.json"
            or not parts
            or parts[0] not in {"apps", "packages", "services"}
            or not set(parts).isdisjoint(DERIVED_PARTS)
            or any(part.startswith(".") for part in parts[:-1])
        ):
            continue
        try:
            manifest = json.loads(_direct_runtime_entry_bytes_v1(index[path], path, "MANIFEST_BYTES_INVALID").decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            _direct_runtime_read_set_fail("MANIFEST_JSON_INVALID", path)
        if not isinstance(manifest, dict):
            _direct_runtime_read_set_fail("MANIFEST_JSON_INVALID", path)
        name = manifest.get("name")
        if not isinstance(name, str) or not name or name in records:
            _direct_runtime_read_set_fail("MANIFEST_IDENTITY_INVALID", path)
        records[name] = {
            "directory": str(PurePosixPath(path).parent),
            "manifest": manifest,
            "path": path,
            "entry": index[path],
        }
    record = records.get(package)
    if record is None:
        _direct_runtime_read_set_fail("TRIGGER_PACKAGE_MISSING", package)
    scripts = record["manifest"].get("scripts")
    if not isinstance(scripts, dict) or not isinstance(scripts.get(script_name), str):
        _direct_runtime_read_set_fail("TRIGGER_SCRIPT_MISSING", f"{package}: {script_name}")
    match = _DIRECT_RUNTIME_SCRIPT_RE.fullmatch(scripts[script_name])
    if match is None:
        _direct_runtime_read_set_fail("TRIGGER_SCRIPT_UNSAFE", record["path"])
    argument = _direct_runtime_safe_path_v1(match.group("argument"), "TRIGGER_SCRIPT_UNSAFE")
    script_path = f"{record['directory']}/{argument}"
    _direct_runtime_safe_path_v1(script_path, "TRIGGER_SCRIPT_UNSAFE")
    return index, {
        "logicalArgv": list(logical_argv),
        "package": package,
        "scriptName": script_name,
        "scriptPath": script_path,
        "manifest": {
            "path": record["entry"]["path"],
            "sha256": record["entry"]["sha256"],
            "size": record["entry"]["size"],
        },
        "directory": record["directory"],
    }


def _direct_runtime_directory_tree_v1(directory_listings: Any, root: str) -> list[str]:
    """Derives every recursively listed leaf from a baseline directory trace.

    @param directory_listings The instrumented baseline directory listings.
    @param root The script-bound traversal root.
    @returns Sorted canonical leaf paths below the traversal root.
    @throws core.ExecutionClosureValidationError When listings are incomplete, escaping, or ambiguous.
    """
    if not isinstance(directory_listings, list) or not directory_listings:
        _direct_runtime_read_set_fail("DIRECTORY_LISTINGS_INVALID")
    listings: dict[str, list[str]] = {}
    for listing in directory_listings:
        if not isinstance(listing, dict) or set(listing) != {"path", "children"}:
            _direct_runtime_read_set_fail("DIRECTORY_LISTING_INVALID")
        path = _direct_runtime_safe_path_v1(listing["path"], "DIRECTORY_LISTING_PATH_INVALID")
        if path != root and not path.startswith(f"{root}/"):
            _direct_runtime_read_set_fail("DIRECTORY_LISTING_ESCAPES_ROOT", path)
        children = listing["children"]
        if not isinstance(children, list) or path in listings:
            _direct_runtime_read_set_fail("DIRECTORY_LISTING_INVALID", path)
        normalized_children: list[str] = []
        for child in children:
            if (
                not isinstance(child, str)
                or not child
                or "/" in child
                or "\\" in child
                or "\x00" in child
                or child in {".", ".."}
            ):
                _direct_runtime_read_set_fail("DIRECTORY_CHILD_INVALID", path)
            normalized_children.append(child)
        if len(normalized_children) != len(set(normalized_children)):
            _direct_runtime_read_set_fail("DIRECTORY_CHILD_DUPLICATE", path)
        listings[path] = normalized_children
    if root not in listings:
        _direct_runtime_read_set_fail("DIRECTORY_ROOT_MISSING", root)
    for path in listings:
        if path == root:
            continue
        parent = posixpath.dirname(path)
        if parent not in listings or PurePosixPath(path).name not in listings[parent]:
            _direct_runtime_read_set_fail("DIRECTORY_LISTING_UNBOUND", path)
    leaves: set[str] = set()
    for directory, children in listings.items():
        for child in children:
            candidate = f"{directory}/{child}"
            if candidate not in listings:
                leaves.add(candidate)
    return sorted(leaves)


def _direct_runtime_is_ignored_leaf_v1(path: str) -> bool:
    """Returns whether a recursively listed leaf is intentionally non-runtime input.

    @param path The canonical workspace-relative leaf path.
    @returns Whether the leaf is excluded by the stable generator traversal filter.
    """
    return PurePosixPath(path).suffix.lower() in _DIRECT_RUNTIME_DOCUMENT_SUFFIXES


def _direct_runtime_derived_read_v1(value: Any, package_directory: str, script_name: str) -> dict[str, Any]:
    """Validates one receipt-bound prerequisite-build read from the package dist tree.

    @param value The claimed derived build-output read.
    @param package_directory The resolved trigger package root.
    @param script_name The direct script that required the prerequisite build.
    @returns The validated derived read.
    @throws core.ExecutionClosureValidationError When provenance or receipt binding is incomplete.
    """
    required = {"path", "sha256", "size", "origin", "producer"}
    if not isinstance(value, dict) or set(value) != required:
        _direct_runtime_read_set_fail("DERIVED_READ_INVALID")
    path = _direct_runtime_safe_path_v1(value["path"], "DERIVED_READ_PATH_INVALID")
    if not path.startswith(f"{package_directory}/dist/"):
        _direct_runtime_read_set_fail("DERIVED_READ_NOT_PRECEDING_BUILD_OUTPUT", path)
    _direct_runtime_sha256_v1(value["sha256"], "DERIVED_READ_INVALID", path)
    _direct_runtime_int_v1(value["size"], "DERIVED_READ_INVALID", path)
    if value["origin"] != "DERIVED_BUILD_OUTPUT":
        _direct_runtime_read_set_fail("DERIVED_READ_INVALID", path)
    producer = value["producer"]
    if not isinstance(producer, dict) or set(producer) != {"kind", "scriptName", "scriptSegment", "receipt"}:
        _direct_runtime_read_set_fail("DERIVED_READ_PRODUCER_INVALID", path)
    if (
        producer["kind"] != "PACKAGE_SCRIPT_PREREQUISITE_BUILD"
        or producer["scriptName"] != script_name
        or producer["scriptSegment"] != "pnpm build"
    ):
        _direct_runtime_read_set_fail("DERIVED_READ_PRODUCER_INVALID", path)
    receipt = producer["receipt"]
    if not isinstance(receipt, dict) or set(receipt) != {"path", "sha256", "size"}:
        _direct_runtime_read_set_fail("DERIVED_READ_RECEIPT_INVALID", path)
    _direct_runtime_safe_path_v1(receipt["path"], "DERIVED_READ_RECEIPT_INVALID")
    _direct_runtime_sha256_v1(receipt["sha256"], "DERIVED_READ_RECEIPT_INVALID", path)
    _direct_runtime_int_v1(receipt["size"], "DERIVED_READ_RECEIPT_INVALID", path)
    return value


def _direct_runtime_resource_budget_v1(resource_budget: Any) -> dict[str, Any]:
    """Validates the disk reservation and available-capacity preflight contract.

    @param resource_budget The resource budget recorded before candidate materialization.
    @returns The validated PASS budget.
    @throws core.ExecutionClosureValidationError When reservations or capacity do not fail closed.
    """
    required = {
        "schemaVersion",
        "kind",
        "frozenArchive",
        "sourceCeiling",
        "reservations",
        "requiredAvailableBytes",
        "availableBytes",
        "decision",
    }
    if not isinstance(resource_budget, dict) or set(resource_budget) != required:
        _direct_runtime_read_set_fail("RESOURCE_BUDGET_INVALID")
    if resource_budget["schemaVersion"] != 1 or resource_budget["kind"] != "direct-command-runtime-asset-resource-budget":
        _direct_runtime_read_set_fail("RESOURCE_BUDGET_INVALID")
    archive = resource_budget["frozenArchive"]
    if not isinstance(archive, dict) or set(archive) != {"path", "sha256", "size"}:
        _direct_runtime_read_set_fail("RESOURCE_BUDGET_ARCHIVE_INVALID")
    _direct_runtime_safe_path_v1(archive["path"], "RESOURCE_BUDGET_ARCHIVE_INVALID")
    _direct_runtime_sha256_v1(archive["sha256"], "RESOURCE_BUDGET_ARCHIVE_INVALID")
    _direct_runtime_int_v1(archive["size"], "RESOURCE_BUDGET_ARCHIVE_INVALID")
    ceiling = resource_budget["sourceCeiling"]
    if not isinstance(ceiling, dict) or set(ceiling) != {"path", "regularFiles", "apparentBytes", "allocatedBytes"}:
        _direct_runtime_read_set_fail("RESOURCE_BUDGET_CEILING_INVALID")
    _direct_runtime_safe_path_v1(ceiling["path"], "RESOURCE_BUDGET_CEILING_INVALID")
    for field in ("regularFiles", "apparentBytes", "allocatedBytes"):
        _direct_runtime_int_v1(ceiling[field], "RESOURCE_BUDGET_CEILING_INVALID", field)
    reservations = resource_budget["reservations"]
    if not isinstance(reservations, dict) or set(reservations) != set(_DIRECT_RUNTIME_RESERVATION_FIELDS):
        _direct_runtime_read_set_fail("RESOURCE_BUDGET_RESERVATIONS_INVALID")
    total = 0
    for field in _DIRECT_RUNTIME_RESERVATION_FIELDS:
        total += _direct_runtime_int_v1(reservations[field], "RESOURCE_BUDGET_RESERVATIONS_INVALID", field)
    required_available = _direct_runtime_int_v1(
        resource_budget["requiredAvailableBytes"],
        "RESOURCE_BUDGET_REQUIRED_INVALID",
    )
    available = _direct_runtime_int_v1(resource_budget["availableBytes"], "RESOURCE_BUDGET_AVAILABLE_INVALID")
    if required_available != total:
        _direct_runtime_read_set_fail("RESOURCE_BUDGET_RESERVATIONS_INVALID")
    if resource_budget["decision"] != "PASS" or available < required_available:
        _direct_runtime_read_set_fail("RESOURCE_BUDGET_CAPACITY_BLOCKED")
    return resource_budget


def _direct_runtime_preflight_quota_v1(
    quota: Any,
    baseline_read_set: list[dict[str, Any]],
) -> dict[str, int]:
    """Computes and validates a finite exact baseline materialization quota.

    @param quota The configured entry and byte ceilings.
    @param baseline_read_set The immutable baseline blobs selected for materialization.
    @returns The quota with observed count and byte usage.
    @throws core.ExecutionClosureValidationError When the finite read set exceeds a ceiling.
    """
    if not isinstance(quota, dict) or set(quota) != {"maxEntries", "maxBytes"}:
        _direct_runtime_read_set_fail("PREFLIGHT_QUOTA_INVALID")
    max_entries = _direct_runtime_int_v1(quota["maxEntries"], "PREFLIGHT_QUOTA_INVALID", "maxEntries")
    max_bytes = _direct_runtime_int_v1(quota["maxBytes"], "PREFLIGHT_QUOTA_INVALID", "maxBytes")
    observed_entries = len(baseline_read_set)
    observed_bytes = sum(item["size"] for item in baseline_read_set)
    if observed_entries > max_entries or observed_bytes > max_bytes:
        _direct_runtime_read_set_fail("PREFLIGHT_QUOTA_EXCEEDED")
    return {
        "maxEntries": max_entries,
        "maxBytes": max_bytes,
        "observedEntries": observed_entries,
        "observedBytes": observed_bytes,
    }


def _direct_runtime_read_set_inventory_v1(baseline_read_set: list[dict[str, Any]]) -> dict[str, Any]:
    """Builds a canonical digest summary for the complete materialized baseline read set.

    @param baseline_read_set The sorted immutable baseline read identities.
    @returns The count, byte total, and canonical subtree digest.
    """
    return {
        "entryCount": len(baseline_read_set),
        "bytes": sum(item["size"] for item in baseline_read_set),
        "subtreeDigest": _sha256(_canonical(baseline_read_set)),
    }


def _direct_runtime_validate_read_set_shape_v1(read_set: Any, resource_budget: Any) -> dict[str, Any]:
    """Validates the self-contained shape of one direct-runtime read-set record.

    @param read_set The immutable read-set record.
    @param resource_budget The independently supplied preflight budget.
    @returns The validated read-set record.
    @throws core.ExecutionClosureValidationError When fields are incomplete, reordered, or unbound.
    """
    required = {
        "schemaVersion",
        "kind",
        "trigger",
        "baselineReadSet",
        "derivedBuildReadSet",
        "outputPaths",
        "preflightQuota",
        "resourceBudget",
        "discovery",
    }
    if not isinstance(read_set, dict) or set(read_set) != required:
        _direct_runtime_read_set_fail("READ_SET_INVALID")
    if read_set["schemaVersion"] != 1 or read_set["kind"] != "direct-command-runtime-read-set":
        _direct_runtime_read_set_fail("READ_SET_INVALID")
    if read_set["resourceBudget"] != resource_budget:
        _direct_runtime_read_set_fail("READ_SET_RESOURCE_BUDGET_UNBOUND")
    _direct_runtime_resource_budget_v1(resource_budget)
    trigger = read_set["trigger"]
    if not isinstance(trigger, dict) or set(trigger) != {"logicalArgv", "package", "manifest"}:
        _direct_runtime_read_set_fail("READ_SET_TRIGGER_INVALID")
    if (
        not isinstance(trigger["logicalArgv"], list)
        or len(trigger["logicalArgv"]) != 4
        or trigger["logicalArgv"][:3] != ["pnpm", "--filter", trigger["package"]]
        or not isinstance(trigger["package"], str)
        or not isinstance(trigger["logicalArgv"][3], str)
    ):
        _direct_runtime_read_set_fail("READ_SET_TRIGGER_INVALID")
    manifest = trigger["manifest"]
    if not isinstance(manifest, dict) or set(manifest) != {"path", "sha256", "size"}:
        _direct_runtime_read_set_fail("READ_SET_TRIGGER_INVALID")
    _direct_runtime_safe_path_v1(manifest["path"], "READ_SET_TRIGGER_INVALID")
    _direct_runtime_sha256_v1(manifest["sha256"], "READ_SET_TRIGGER_INVALID")
    _direct_runtime_int_v1(manifest["size"], "READ_SET_TRIGGER_INVALID")
    baseline = read_set["baselineReadSet"]
    if not isinstance(baseline, list) or not baseline:
        _direct_runtime_read_set_fail("READ_SET_BASELINE_INVALID")
    for identity in baseline:
        _direct_runtime_identity_is_valid_v1(identity, "READ_SET_BASELINE_INVALID")
    if baseline != sorted(baseline, key=lambda item: item["path"]) or len({item["path"] for item in baseline}) != len(baseline):
        _direct_runtime_read_set_fail("READ_SET_BASELINE_INVALID")
    outputs = read_set["outputPaths"]
    if (
        not isinstance(outputs, list)
        or not outputs
        or not all(isinstance(path, str) for path in outputs)
        or outputs != sorted(outputs)
        or len(set(outputs)) != len(outputs)
    ):
        _direct_runtime_read_set_fail("READ_SET_OUTPUTS_INVALID")
    for path in outputs:
        _direct_runtime_safe_path_v1(path, "READ_SET_OUTPUTS_INVALID")
    if set(outputs) & {item["path"] for item in baseline}:
        _direct_runtime_read_set_fail("READ_SET_OUTPUTS_IN_BASELINE")
    discovery = read_set["discovery"]
    if not isinstance(discovery, dict) or set(discovery) != {"kind", "script", "root", "directoryListingCount"}:
        _direct_runtime_read_set_fail("READ_SET_DISCOVERY_INVALID")
    if discovery["kind"] != "BASELINE_GIT_INSTRUMENTED_TRACE":
        _direct_runtime_read_set_fail("READ_SET_DISCOVERY_INVALID")
    script = _direct_runtime_identity_is_valid_v1(discovery["script"], "READ_SET_DISCOVERY_INVALID")
    root = _direct_runtime_safe_path_v1(discovery["root"], "READ_SET_DISCOVERY_INVALID")
    if script not in baseline or not root:
        _direct_runtime_read_set_fail("READ_SET_DISCOVERY_INVALID")
    _direct_runtime_int_v1(discovery["directoryListingCount"], "READ_SET_DISCOVERY_INVALID")
    derived = read_set["derivedBuildReadSet"]
    package_directory = posixpath.dirname(manifest["path"])
    script_name = trigger["logicalArgv"][3]
    if not isinstance(derived, list) or not derived:
        _direct_runtime_read_set_fail("READ_SET_DERIVED_INVALID")
    for item in derived:
        _direct_runtime_derived_read_v1(item, package_directory, script_name)
    if derived != sorted(derived, key=lambda item: item["path"]) or len({item["path"] for item in derived}) != len(derived):
        _direct_runtime_read_set_fail("READ_SET_DERIVED_INVALID")
    quota = read_set["preflightQuota"]
    if not isinstance(quota, dict) or set(quota) != {"maxEntries", "maxBytes", "observedEntries", "observedBytes"}:
        _direct_runtime_read_set_fail("READ_SET_QUOTA_INVALID")
    observed = _direct_runtime_preflight_quota_v1(
        {"maxEntries": quota["maxEntries"], "maxBytes": quota["maxBytes"]},
        baseline,
    )
    if quota != observed:
        _direct_runtime_read_set_fail("READ_SET_QUOTA_INVALID")
    return read_set


def discover_direct_command_runtime_read_set_v1(
    frozen_entries: list[dict[str, Any]],
    logical_argv: list[str],
    baseline_assets: list[dict[str, Any]],
    discovery: dict[str, Any],
    quota: dict[str, int],
    resource_budget: dict[str, Any],
) -> dict[str, Any]:
    """Discovers an exact finite baseline and preceding-build runtime read set before execution.

    @param frozen_entries The immutable source archive entries.
    @param logical_argv The unmodified direct pnpm command argv.
    @param baseline_assets Hash-bound baseline Git blobs available for materialization.
    @param discovery The instrumented baseline directory, read, derived-read, and write trace.
    @param quota The finite materialization entry and byte ceilings.
    @param resource_budget The disk reservation and available-capacity preflight record.
    @returns The canonical runtime read set bound to frozen source and baseline Git provenance.
    @throws core.ExecutionClosureValidationError When any source, trace, quota, or capacity invariant fails.
    """
    index, trigger = _direct_runtime_trigger_v1(frozen_entries, logical_argv)
    del index
    assets = _direct_runtime_baseline_assets_v1(baseline_assets)
    _direct_runtime_resource_budget_v1(resource_budget)
    required = {
        "schemaVersion",
        "kind",
        "baselineCommit",
        "runner",
        "script",
        "root",
        "directoryListings",
        "baselineReads",
        "derivedBuildReads",
        "writes",
        "clearedStaleOutputs",
    }
    if not isinstance(discovery, dict) or set(discovery) != required:
        _direct_runtime_read_set_fail("DISCOVERY_INVALID")
    if discovery["schemaVersion"] != 1 or discovery["kind"] != "direct-command-runtime-discovery" or discovery["runner"] != "node":
        _direct_runtime_read_set_fail("DISCOVERY_INVALID")
    baseline_commit = discovery["baselineCommit"]
    if not isinstance(baseline_commit, str) or re.fullmatch(r"[0-9a-f]{40}", baseline_commit) is None:
        _direct_runtime_read_set_fail("DISCOVERY_BASELINE_COMMIT_INVALID")
    if any(asset["baselineCommit"] != baseline_commit for asset in assets.values()):
        _direct_runtime_read_set_fail("DISCOVERY_BASELINE_COMMIT_UNBOUND")
    script_path = trigger["scriptPath"]
    script_asset = assets.get(script_path)
    if script_asset is None:
        _direct_runtime_read_set_fail("SCRIPT_BASELINE_ASSET_MISSING", script_path)
    script_identity = _direct_runtime_baseline_identity_v1(script_asset)
    if discovery["script"] != script_identity:
        _direct_runtime_read_set_fail("SCRIPT_BASELINE_IDENTITY_UNBOUND", script_path)
    root = _direct_runtime_safe_path_v1(discovery["root"], "DISCOVERY_ROOT_INVALID")
    if not root.startswith(f"{trigger['directory']}/"):
        _direct_runtime_read_set_fail("DISCOVERY_ROOT_ESCAPES_PACKAGE", root)
    leaves = _direct_runtime_directory_tree_v1(discovery["directoryListings"], root)
    writes = discovery["writes"]
    if not isinstance(writes, list) or not writes:
        _direct_runtime_read_set_fail("WRITES_INVALID")
    output_paths: list[str] = []
    for write in writes:
        if not isinstance(write, dict) or set(write) != {"path", "kind"} or write.get("kind") != "DERIVED_OUTPUT":
            _direct_runtime_read_set_fail("WRITE_INVALID")
        path = _direct_runtime_safe_path_v1(write.get("path"), "WRITE_PATH_INVALID")
        if not path.startswith(f"{root}/") or path == script_path:
            _direct_runtime_read_set_fail("SOURCE_WRITE_REJECTED", path)
        output_paths.append(path)
    if len(output_paths) != len(set(output_paths)):
        _direct_runtime_read_set_fail("WRITE_DUPLICATE")
    output_paths.sort()
    cleared = discovery["clearedStaleOutputs"]
    if not isinstance(cleared, list) or cleared != output_paths:
        _direct_runtime_read_set_fail("STALE_OUTPUT_CLEARANCE_UNBOUND")
    if any((path in assets) != (path in leaves) for path in output_paths):
        _direct_runtime_read_set_fail("STALE_OUTPUT_CLEARANCE_UNBOUND")
    allowed_assets = {script_path, *leaves}
    if set(assets) != allowed_assets:
        _direct_runtime_read_set_fail("BASELINE_ASSET_TREE_MISMATCH")
    receipt_paths = [f"{root}/{name}" for name in sorted(_DIRECT_RUNTIME_REQUIRED_RECEIPTS)]
    if any(path not in leaves or path not in assets for path in receipt_paths):
        _direct_runtime_read_set_fail("REQUIRED_RECEIPT_MISSING")
    expected_accesses: dict[str, str] = {script_path: "MODULE_LOAD"}
    for path in leaves:
        if path not in output_paths and not _direct_runtime_is_ignored_leaf_v1(path):
            expected_accesses[path] = "READ_FILE"
    for path in receipt_paths:
        expected_accesses[path] = "READ_FILE"
    reads = discovery["baselineReads"]
    if not isinstance(reads, list):
        _direct_runtime_read_set_fail("BASELINE_READS_INVALID")
    observed_accesses: dict[str, str] = {}
    for read in reads:
        if not isinstance(read, dict) or set(read) != {"path", "access"}:
            _direct_runtime_read_set_fail("BASELINE_READ_INVALID")
        path = _direct_runtime_safe_path_v1(read.get("path"), "BASELINE_READ_INVALID")
        access = read.get("access")
        if access not in {"MODULE_LOAD", "READ_FILE"} or path in observed_accesses:
            _direct_runtime_read_set_fail("BASELINE_READ_INVALID", path)
        observed_accesses[path] = access
    if observed_accesses != expected_accesses:
        _direct_runtime_read_set_fail("BASELINE_READ_SET_UNBOUND")
    baseline_read_set = sorted(
        (_direct_runtime_baseline_identity_v1(assets[path]) for path in expected_accesses),
        key=lambda item: item["path"],
    )
    derived = discovery["derivedBuildReads"]
    if not isinstance(derived, list) or not derived:
        _direct_runtime_read_set_fail("DERIVED_READS_INVALID")
    for item in derived:
        _direct_runtime_derived_read_v1(item, trigger["directory"], trigger["scriptName"])
        if item["path"] in assets or item["path"] in output_paths:
            _direct_runtime_read_set_fail("DERIVED_READ_UNBOUND", item["path"])
    if len({item["path"] for item in derived}) != len(derived):
        _direct_runtime_read_set_fail("DERIVED_READ_DUPLICATE")
    derived_read_set = sorted(copy.deepcopy(derived), key=lambda item: item["path"])
    preflight_quota = _direct_runtime_preflight_quota_v1(quota, baseline_read_set)
    return {
        "schemaVersion": 1,
        "kind": "direct-command-runtime-read-set",
        "trigger": {
            "logicalArgv": trigger["logicalArgv"],
            "package": trigger["package"],
            "manifest": trigger["manifest"],
        },
        "baselineReadSet": baseline_read_set,
        "derivedBuildReadSet": derived_read_set,
        "outputPaths": output_paths,
        "preflightQuota": preflight_quota,
        "resourceBudget": copy.deepcopy(resource_budget),
        "discovery": {
            "kind": "BASELINE_GIT_INSTRUMENTED_TRACE",
            "script": script_identity,
            "root": root,
            "directoryListingCount": len(discovery["directoryListings"]),
        },
    }


def build_direct_command_runtime_read_set_contract_v1(
    read_set: dict[str, Any],
    resource_budget: dict[str, Any],
) -> dict[str, Any]:
    """Builds an immutable inclusion and execution-trace contract from one discovered read set.

    @param read_set The canonical pre-execution runtime read set.
    @param resource_budget The separately supplied resource preflight record.
    @returns The exact inclusion contract enforced by candidate execution.
    @throws core.ExecutionClosureValidationError When the read set is malformed or budget-unbound.
    """
    validated = _direct_runtime_validate_read_set_shape_v1(read_set, resource_budget)
    baseline = copy.deepcopy(validated["baselineReadSet"])
    derived = copy.deepcopy(validated["derivedBuildReadSet"])
    outputs = copy.deepcopy(validated["outputPaths"])
    return {
        "schemaVersion": 1,
        "kind": "direct-command-runtime-read-set-inclusion",
        "readSet": copy.deepcopy(validated),
        "baselineReadSet": baseline,
        "derivedBuildReadSet": derived,
        "outputPaths": outputs,
        "baselineReadInventory": _direct_runtime_read_set_inventory_v1(baseline),
        "resourceBudget": copy.deepcopy(resource_budget),
        "runtimeTracePolicy": {
            "baselineReads": "EXACT_BIJECTION_WITH_BASELINE_READ_SET",
            "derivedBuildReads": "EXACT_BIJECTION_WITH_RECEIPT_BOUND_DERIVED_READ_SET",
            "writes": "DECLARED_DERIVED_OUTPUTS_ONLY",
            "untracedWorkspaceAccess": "REJECT",
        },
    }


def validate_direct_command_runtime_read_set_contract_v1(
    contract: dict[str, Any],
    read_set: dict[str, Any],
    frozen_entries: list[dict[str, Any]],
    baseline_assets: list[dict[str, Any]],
    discovery: dict[str, Any],
    quota: dict[str, int],
    resource_budget: dict[str, Any],
) -> None:
    """Re-derives and validates an inclusion contract against all immutable discovery inputs.

    @param contract The claimed direct-runtime inclusion contract.
    @param read_set The claimed canonical direct-runtime read set.
    @param frozen_entries The immutable source archive entries.
    @param baseline_assets Hash-bound baseline Git blobs.
    @param discovery The original instrumented baseline trace.
    @param quota The finite materialization ceiling.
    @param resource_budget The disk capacity preflight record.
    @returns Nothing when the contract is an exact re-derivation.
    @throws core.ExecutionClosureValidationError When any contract field drifts from discovery.
    """
    expected_read_set = discover_direct_command_runtime_read_set_v1(
        frozen_entries,
        logical_argv=read_set.get("trigger", {}).get("logicalArgv") if isinstance(read_set, dict) else None,
        baseline_assets=baseline_assets,
        discovery=discovery,
        quota=quota,
        resource_budget=resource_budget,
    )
    if read_set != expected_read_set:
        _direct_runtime_read_set_fail("READ_SET_REDERIVATION_MISMATCH")
    expected_contract = build_direct_command_runtime_read_set_contract_v1(expected_read_set, resource_budget)
    if contract != expected_contract:
        _direct_runtime_read_set_fail("CONTRACT_REDERIVATION_MISMATCH")


def validate_direct_command_runtime_execution_trace_v1(
    contract: dict[str, Any],
    execution_trace: dict[str, Any],
) -> None:
    """Requires execution reads and writes to be an exact bijection with the inclusion contract.

    @param contract The immutable direct-runtime inclusion contract.
    @param execution_trace The observed baseline reads, derived reads, and writes.
    @returns Nothing when execution accessed only declared immutable inputs and outputs.
    @throws core.ExecutionClosureValidationError When execution adds, omits, or mutates an access.
    """
    if not isinstance(contract, dict):
        _direct_runtime_read_set_fail("EXECUTION_CONTRACT_INVALID")
    expected_contract = build_direct_command_runtime_read_set_contract_v1(
        contract.get("readSet"),
        contract.get("resourceBudget"),
    )
    if contract != expected_contract:
        _direct_runtime_read_set_fail("EXECUTION_CONTRACT_INVALID")
    expected_trace = {
        "baselineReads": expected_contract["baselineReadSet"],
        "derivedBuildReads": expected_contract["derivedBuildReadSet"],
        "writes": [{"path": path, "kind": "DERIVED_OUTPUT"} for path in expected_contract["outputPaths"]],
    }
    if execution_trace != expected_trace:
        _direct_runtime_read_set_fail("EXECUTION_TRACE_BIJECTION_FAILED")


_DIRECT_RUNTIME_RUNNER_STAGES = (
    "direct-runtime-preflight",
    "direct-runtime-discovery",
    "materialize",
    "direct-runtime-materialization-probe",
    "build-advantage-play-kit-for-runtime",
    "direct-runtime-dist-identity",
    "generate-standard-pack-catalog",
    "direct-runtime-trace",
)


# The retained V2 archive deliberately did not contain this direct-runtime
# source tree. It is captured from this immutable commit only; no live
# worktree fallback is permitted during preparation.
_DIRECT_RUNTIME_BASELINE_COMMIT = "e78fe22bb405de732de14c18590b19af0ce5f0de"
_DIRECT_RUNTIME_STANDARD_ASSET_ROOT = "packages/advantage-play-kit/assets/standard"
_DIRECT_RUNTIME_STANDARD_SOURCE_CEILING = {
    "path": _DIRECT_RUNTIME_STANDARD_ASSET_ROOT,
    "regularFiles": 43_138,
    "apparentBytes": 188_324_464,
    "allocatedBytes": 325_713_920,
}
_DIRECT_RUNTIME_STATIC_RESERVATIONS = {
    "baselineGitMaterializationBytes": 325_713_920,
    "candidateCowBytes": 325_713_920,
    "archiveSupplementBytes": 325_713_920,
    "derivedOutputBytes": 24_946_348,
    "metadataBytes": 16_777_216,
    "minimumHeadroomBytes": 1_073_741_824,
}
_DIRECT_RUNTIME_PREPARED_TRANSACTION_HEADROOM_BYTES = 536_870_912


def _direct_runtime_git_object_output_v1(
    argv: list[str],
    code: str,
    *,
    input_bytes: bytes | None = None,
) -> bytes:
    """Reads one immutable Git-object query without consulting worktree source bytes.

    @param argv The Git subcommand and its immutable object arguments.
    @param code The stable direct-runtime failure suffix.
    @param input_bytes Optional object identifiers for a batch Git query.
    @returns The raw Git-object command output.
    @throws core.ExecutionClosureValidationError When Git cannot resolve the pinned objects.
    """
    try:
        completed = subprocess.run(
            ["/usr/bin/git", *argv],
            cwd=REPO_ROOT,
            env={"LC_ALL": "C", "LANG": "C"},
            input=input_bytes,
            capture_output=True,
            check=False,
        )
    except OSError as error:
        _direct_runtime_integration_fail(code, str(error))
    if completed.returncode != 0:
        _direct_runtime_integration_fail(
            code,
            completed.stderr.decode("utf-8", errors="replace").strip(),
        )
    return completed.stdout


def _direct_runtime_baseline_tree_records_v1(
    script_path: str,
) -> tuple[str, list[dict[str, str]]]:
    """Lists exact script and standard-asset blobs from the pinned baseline Git tree.

    @param script_path The frozen package-relative direct generator script path.
    @returns The baseline tree identifier and sorted regular-file records.
    @throws core.ExecutionClosureValidationError When the Git tree has unsafe or incomplete entries.
    """
    # This is intentionally a git ls-tree object query rather than a filesystem
    # walk: a changed live checkout must not alter preparation.
    root = _DIRECT_RUNTIME_STANDARD_ASSET_ROOT
    listing = _direct_runtime_git_object_output_v1(
        ["ls-tree", "-r", "-z", _DIRECT_RUNTIME_BASELINE_COMMIT, "--", script_path, root],
        "GIT_TREE_LIST_FAILED",
    )
    records: list[dict[str, str]] = []
    for raw in listing.split(b"\0"):
        if not raw:
            continue
        try:
            metadata, raw_path = raw.split(b"\t", 1)
            mode, kind, blob = metadata.decode("ascii", errors="strict").split(" ")
            path = raw_path.decode("utf-8", errors="strict")
        except (UnicodeDecodeError, ValueError):
            _direct_runtime_integration_fail("GIT_TREE_LIST_INVALID")
        _direct_runtime_safe_path_v1(path, "GIT_TREE_LIST_INVALID")
        if (
            kind != "blob"
            or mode not in {"100644", "100755"}
            or re.fullmatch(r"[0-9a-f]{40}", blob) is None
            or (path != script_path and not path.startswith(f"{root}/"))
        ):
            _direct_runtime_integration_fail("GIT_TREE_LIST_INVALID", path)
        records.append({"path": path, "mode": mode, "gitBlobSha1": blob})
    records.sort(key=lambda item: item["path"])
    if not records or script_path not in {item["path"] for item in records} or len({item["path"] for item in records}) != len(records):
        _direct_runtime_integration_fail("GIT_TREE_LIST_INCOMPLETE")
    if not any(item["path"] == _DIRECT_RUNTIME_STANDARD_ASSET_ROOT + "/IMPORT-RECEIPT.tsv" for item in records):
        _direct_runtime_integration_fail("GIT_TREE_LIST_INCOMPLETE")
    tree = _direct_runtime_git_object_output_v1(
        ["rev-parse", f"{_DIRECT_RUNTIME_BASELINE_COMMIT}^{{tree}}"],
        "GIT_TREE_CAPTURE_FAILED",
    ).decode("ascii", errors="strict").strip()
    if re.fullmatch(r"[0-9a-f]{40}", tree) is None:
        _direct_runtime_integration_fail("GIT_TREE_CAPTURE_FAILED")
    return tree, records


def _direct_runtime_git_blob_assets_v1(
    records: list[dict[str, str]],
) -> list[dict[str, Any]]:
    """Captures and hash-binds selected baseline Git blobs in deterministic path order.

    @param records The regular pinned-tree records selected for a finite runtime inventory.
    @returns Baseline asset records with exact object bytes and identities.
    @throws core.ExecutionClosureValidationError When a blob response drifts from its tree entry.
    """
    ordered = sorted(records, key=lambda item: item["path"])
    if not ordered or len({item["path"] for item in ordered}) != len(ordered):
        _direct_runtime_integration_fail("GIT_BLOB_SELECTION_INVALID")
    payload = "".join(f"{item['gitBlobSha1']}\n" for item in ordered).encode("ascii")
    output = _direct_runtime_git_object_output_v1(
        ["cat-file", "--batch"],
        "GIT_OBJECT_BYTES_CAPTURE_FAILED",
        input_bytes=payload,
    )
    cursor = 0
    assets: list[dict[str, Any]] = []
    for record in ordered:
        end = output.find(b"\n", cursor)
        if end < 0:
            _direct_runtime_integration_fail("GIT_OBJECT_BYTES_CAPTURE_FAILED", record["path"])
        try:
            object_name, kind, size_text = output[cursor:end].decode("ascii", errors="strict").split(" ")
            size = int(size_text)
        except (UnicodeDecodeError, ValueError):
            _direct_runtime_integration_fail("GIT_OBJECT_BYTES_CAPTURE_FAILED", record["path"])
        cursor = end + 1
        if object_name != record["gitBlobSha1"] or kind != "blob" or size < 0 or cursor + size >= len(output):
            _direct_runtime_integration_fail("GIT_OBJECT_BYTES_CAPTURE_FAILED", record["path"])
        data = output[cursor:cursor + size]
        cursor += size
        if output[cursor:cursor + 1] != b"\n":
            _direct_runtime_integration_fail("GIT_OBJECT_BYTES_CAPTURE_FAILED", record["path"])
        cursor += 1
        blob = b"blob " + str(len(data)).encode("ascii") + b"\0" + data
        if hashlib.sha1(blob).hexdigest() != record["gitBlobSha1"]:
            _direct_runtime_integration_fail("GIT_OBJECT_BYTES_MISMATCH", record["path"])
        assets.append({
            "path": record["path"],
            "kind": "file",
            "mode": record["mode"],
            "baselineCommit": _DIRECT_RUNTIME_BASELINE_COMMIT,
            "gitBlobSha1": record["gitBlobSha1"],
            "sha256": _sha256(data),
            "size": len(data),
            "contentBase64": base64.b64encode(data).decode("ascii"),
        })
    if cursor != len(output):
        _direct_runtime_integration_fail("GIT_OBJECT_BYTES_CAPTURE_FAILED")
    _direct_runtime_baseline_assets_v1(assets)
    return assets


def _direct_runtime_source_packet_from_assets_v1(
    tree: str,
    assets: list[dict[str, Any]],
) -> dict[str, Any]:
    """Builds one detached packet from a selected, validated baseline Git asset set.

    @param tree The immutable Git tree shared by every selected asset.
    @param assets The exact materializable baseline asset records.
    @returns A hash-bound detached source packet.
    @throws core.ExecutionClosureValidationError When selected assets do not share baseline provenance.
    """
    indexed = _direct_runtime_baseline_assets_v1(assets)
    identities = sorted(
        (_direct_runtime_baseline_identity_v1(indexed[path]) for path in indexed),
        key=lambda item: item["path"],
    )
    packet = {
        "schemaVersion": 1,
        "kind": "direct-command-runtime-baseline-git-source-packet",
        "source": "GIT_OBJECT_DATABASE_ONLY",
        "baselineCommit": _DIRECT_RUNTIME_BASELINE_COMMIT,
        "tree": {"gitTreeSha1": tree},
        "baselineReadSet": identities,
        "objects": [
            {**identity, "contentBase64": indexed[identity["path"]]["contentBase64"]}
            for identity in identities
        ],
    }
    packet["packetSha256"] = _direct_runtime_packet_digest_v1(packet)
    return _direct_runtime_validate_source_packet_v1(packet, identities)


def _direct_runtime_prepared_dynamic_build_output_v1(
    trigger: dict[str, Any],
    selected_assets: list[dict[str, Any]],
) -> dict[str, Any]:
    """Derives the generator's known pre-build dist path from its pinned script bytes.

    @param trigger The frozen package and generator-script trigger record.
    @param selected_assets The selected immutable Git-object assets including the generator script.
    @returns The unresolved derived-input and declared-output contract for one transaction.
    @throws core.ExecutionClosureValidationError When the frozen script cannot declare one safe dist input.
    """
    script_path = trigger.get("scriptPath")
    package_directory = trigger.get("directory")
    script_name = trigger.get("scriptName")
    if (
        not isinstance(script_path, str)
        or not isinstance(package_directory, str)
        or not isinstance(script_name, str)
    ):
        _direct_runtime_integration_fail("PREPARATION_DYNAMIC_BUILD_OUTPUT_INVALID")
    assets = _direct_runtime_baseline_assets_v1(selected_assets)
    script = assets.get(script_path)
    if script is None:
        _direct_runtime_integration_fail("PREPARATION_DYNAMIC_BUILD_OUTPUT_INVALID")
    try:
        script_text = _direct_runtime_entry_bytes_v1(
            script,
            script_path,
            "PREPARATION_DYNAMIC_BUILD_OUTPUT_INVALID",
        ).decode("utf-8")
    except UnicodeDecodeError:
        _direct_runtime_integration_fail("PREPARATION_DYNAMIC_BUILD_OUTPUT_INVALID")
    imports = re.findall(
        r"from\s+[\"'](?P<specifier>\.\./dist/assets/index\.js)[\"']",
        script_text,
    )
    if imports != ["../dist/assets/index.js"]:
        _direct_runtime_integration_fail("PREPARATION_DYNAMIC_BUILD_OUTPUT_INVALID")
    derived_path = _direct_runtime_safe_path_v1(
        f"{package_directory}/dist/assets/index.js",
        "PREPARATION_DYNAMIC_BUILD_OUTPUT_INVALID",
    )
    output_path = _direct_runtime_safe_path_v1(
        STANDARD_PACK_CATALOG,
        "PREPARATION_DYNAMIC_BUILD_OUTPUT_INVALID",
    )
    return {
        "stage": "direct-runtime-dist-identity",
        "source": "IN_CONTAINER_POST_RUNTIME_BUILD_IDENTITY",
        "receiptIdentityPolicy": "EXACT_PRODUCER_RECEIPT_FOR_EACH_DERIVED_DIST_READ",
        "state": "UNRESOLVED_UNTIL_RECORDED_RUNTIME_BUILD",
        "knownDerivedBuildPaths": [
            {
                "path": derived_path,
                "origin": "DERIVED_BUILD_OUTPUT",
                "producerClass": {
                    "kind": "PACKAGE_SCRIPT_PREREQUISITE_BUILD",
                    "scriptName": script_name,
                    "scriptSegment": "pnpm build",
                },
            },
        ],
        "declaredOutputPaths": [output_path],
    }


def derive_direct_node_split_semantics_from_frozen_script_v1(
    trigger: dict[str, Any],
    frozen_manifest_entry: dict[str, Any],
) -> dict[str, Any]:
    """Derives the direct-Node split from one hash-bound frozen package manifest.

    @param trigger The frozen standard-pack trigger that selects the package script.
    @param frozen_manifest_entry The archived package-manifest entry with its exact bytes.
    @returns The two permitted execution segments and their frozen semantic provenance.
    @throws core.ExecutionClosureValidationError When any trigger, manifest, script, or hook invariant is invalid.
    """
    package = "@reading-advantage/advantage-play-kit"
    directory = "packages/advantage-play-kit"
    manifest_path = f"{directory}/package.json"
    script_name = "generate:standard-pack-catalog"
    script_path = DIRECT_NODE_STANDARD_PACK_GENERATOR[1]
    package_relative_script = PACKAGE_RELATIVE_STANDARD_PACK_GENERATOR[1]
    expression = "pnpm build && node scripts/generate-standard-pack-release.mjs"
    required_trigger = {
        "logicalArgv",
        "package",
        "scriptName",
        "scriptPath",
        "manifest",
        "directory",
    }
    if not isinstance(trigger, dict) or set(trigger) != required_trigger:
        _direct_runtime_integration_fail("FROZEN_SCRIPT_TRIGGER_INVALID")
    if (
        trigger["logicalArgv"] != list(STANDARD_PACK_GENERATOR)
        or trigger["package"] != package
        or trigger["scriptName"] != script_name
        or trigger["scriptPath"] != script_path
        or trigger["directory"] != directory
    ):
        _direct_runtime_integration_fail("FROZEN_SCRIPT_TRIGGER_INVALID")
    if not isinstance(frozen_manifest_entry, dict):
        _direct_runtime_integration_fail("FROZEN_SCRIPT_MANIFEST_INVALID")
    entry_path = frozen_manifest_entry.get("path")
    entry_sha256 = frozen_manifest_entry.get("sha256")
    entry_size = frozen_manifest_entry.get("size")
    encoded_manifest = frozen_manifest_entry.get("contentBase64")
    if entry_path != manifest_path or not isinstance(encoded_manifest, str):
        _direct_runtime_integration_fail("FROZEN_SCRIPT_MANIFEST_INVALID")
    _direct_runtime_sha256_v1(
        entry_sha256,
        "FROZEN_SCRIPT_MANIFEST_INVALID",
        manifest_path,
    )
    _direct_runtime_int_v1(
        entry_size,
        "FROZEN_SCRIPT_MANIFEST_INVALID",
        manifest_path,
    )
    manifest_reference = {
        "path": entry_path,
        "sha256": entry_sha256,
        "size": entry_size,
    }
    if trigger["manifest"] != manifest_reference:
        _direct_runtime_integration_fail("FROZEN_SCRIPT_TRIGGER_MANIFEST_INVALID")
    try:
        manifest_bytes = base64.b64decode(encoded_manifest.encode("ascii"), validate=True)
        manifest = json.loads(manifest_bytes.decode("utf-8"))
    except (UnicodeError, ValueError, TypeError, json.JSONDecodeError):
        _direct_runtime_integration_fail("FROZEN_SCRIPT_MANIFEST_INVALID")
    if (
        hashlib.sha256(manifest_bytes).hexdigest() != entry_sha256
        or len(manifest_bytes) != entry_size
        or not isinstance(manifest, dict)
        or manifest.get("name") != package
    ):
        _direct_runtime_integration_fail("FROZEN_SCRIPT_MANIFEST_INVALID")
    scripts = manifest.get("scripts")
    if (
        not isinstance(scripts, dict)
        or scripts.get("build") != "tsc"
        or scripts.get(script_name) != expression
        or "prebuild" in scripts
        or "postbuild" in scripts
    ):
        _direct_runtime_integration_fail("FROZEN_SCRIPT_SEMANTICS_INVALID")
    package_cwd = f"/work/{directory}"
    return {
        "schemaVersion": 1,
        "kind": "direct-node-split-semantics",
        "frozenScript": {
            "manifest": manifest_reference,
            "name": script_name,
            "expression": expression,
            "buildExpression": "pnpm build",
            "directNodeExpression": "node scripts/generate-standard-pack-release.mjs",
            "lifecycleHooks": {"prebuild": "ABSENT", "postbuild": "ABSENT"},
        },
        "package": {
            "name": package,
            "directory": directory,
            "cwd": package_cwd,
        },
        "cleanEnvironment": {
            "allowlisted": dict(ENV),
            "absencePredicates": list(ENV_ABSENT),
            "effectiveBase": {"CI": "true", "PATH": BOOTSTRAP_PATH},
            "inheritedEnv": [],
        },
        "segments": [
            {
                "id": "build-advantage-play-kit-for-runtime",
                "kind": "RUNTIME_BUILD",
                "cwd": package_cwd,
                "logicalArgv": ["pnpm", "build"],
                "environmentOverrides": {},
            },
            {
                "id": "generate-standard-pack-catalog",
                "kind": "DIRECT_NODE_GENERATOR",
                "cwd": package_cwd,
                "logicalArgv": ["node", package_relative_script],
                "environmentOverrides": {
                    "NODE_OPTIONS": DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS,
                },
                "script": {
                    "manifest": manifest_reference,
                    "packageRelativePath": package_relative_script,
                    "logicalPath": script_path,
                    "resolvedPath": f"/work/{script_path}",
                },
            },
        ],
    }


def derive_direct_command_runtime_execution_segments_v1(
    trigger: dict[str, Any],
) -> list[dict[str, Any]]:
    """Derives the one prerequisite build and direct-Node generator from a frozen trigger.

    @param trigger The frozen package trigger resolved from the retained V2 archive.
    @returns The ordered runtime-build and direct-Node-generator execution segments.
    @throws core.ExecutionClosureValidationError When the frozen trigger is incomplete or unsafe.
    """
    required = {
        "logicalArgv",
        "package",
        "scriptName",
        "scriptPath",
        "manifest",
        "directory",
    }
    if not isinstance(trigger, dict) or set(trigger) != required:
        _direct_runtime_integration_fail("EXECUTION_SEGMENTS_TRIGGER_INVALID")
    logical_argv = trigger["logicalArgv"]
    package = trigger["package"]
    script_name = trigger["scriptName"]
    script_path = trigger["scriptPath"]
    directory = trigger["directory"]
    manifest = trigger["manifest"]
    if (
        logical_argv != list(STANDARD_PACK_GENERATOR)
        or package != "@reading-advantage/advantage-play-kit"
        or script_name != "generate:standard-pack-catalog"
        or not isinstance(directory, str)
        or _direct_runtime_safe_path_v1(
            directory,
            "EXECUTION_SEGMENTS_TRIGGER_INVALID",
        )
        != directory
        or not isinstance(script_path, str)
        or _direct_runtime_safe_path_v1(
            script_path,
            "EXECUTION_SEGMENTS_TRIGGER_INVALID",
        )
        != script_path
        or script_path != f"{directory}/scripts/generate-standard-pack-release.mjs"
        or not isinstance(manifest, dict)
        or set(manifest) != {"path", "sha256", "size"}
        or manifest["path"] != f"{directory}/package.json"
    ):
        _direct_runtime_integration_fail("EXECUTION_SEGMENTS_TRIGGER_INVALID")
    _direct_runtime_sha256_v1(
        manifest["sha256"],
        "EXECUTION_SEGMENTS_TRIGGER_INVALID",
        manifest["path"],
    )
    _direct_runtime_int_v1(
        manifest["size"],
        "EXECUTION_SEGMENTS_TRIGGER_INVALID",
        manifest["path"],
    )
    return [
        {
            "id": "build-advantage-play-kit-for-runtime",
            "kind": "RUNTIME_BUILD",
            "logicalArgv": ["pnpm", "--filter", package, "build"],
        },
        {
            "id": "generate-standard-pack-catalog",
            "kind": "DIRECT_NODE_GENERATOR",
            "logicalArgv": list(DIRECT_NODE_STANDARD_PACK_GENERATOR),
        },
    ]


def derive_direct_command_runtime_capacity_from_selected_tree_v1(
    selected_tree_inventory: list[dict[str, Any]],
    asset_root: str,
    available_bytes: int,
) -> dict[str, Any]:
    """Derives a hash-bound direct-runtime capacity budget from selected Git-tree records.

    @param selected_tree_inventory The complete sorted regular-file inventory selected from Git.
    @param asset_root The package-relative standard-asset root whose storage is reserved.
    @param available_bytes The observed free bytes before any candidate staging side effect.
    @returns The canonical selected inventory, its digest, derived source ceiling, and PASS budget.
    @throws core.ExecutionClosureValidationError When inventory provenance or capacity is invalid.
    """
    root = _direct_runtime_safe_path_v1(asset_root, "TREE_CAPACITY_ROOT_INVALID")
    available = _direct_runtime_int_v1(
        available_bytes,
        "TREE_CAPACITY_AVAILABLE_INVALID",
    )
    required_fields = {"path", "gitBlobSha1", "sha256", "size", "mode"}
    if not isinstance(selected_tree_inventory, list) or not selected_tree_inventory:
        _direct_runtime_integration_fail("TREE_CAPACITY_INVENTORY_INVALID")
    inventory = copy.deepcopy(selected_tree_inventory)
    paths: list[str] = []
    for entry in inventory:
        if not isinstance(entry, dict) or set(entry) != required_fields:
            _direct_runtime_integration_fail("TREE_CAPACITY_INVENTORY_INVALID")
        path = _direct_runtime_safe_path_v1(
            entry["path"],
            "TREE_CAPACITY_INVENTORY_INVALID",
        )
        _direct_runtime_sha1_v1(
            entry["gitBlobSha1"],
            "TREE_CAPACITY_INVENTORY_INVALID",
            path,
        )
        _direct_runtime_sha256_v1(
            entry["sha256"],
            "TREE_CAPACITY_INVENTORY_INVALID",
            path,
        )
        _direct_runtime_int_v1(
            entry["size"],
            "TREE_CAPACITY_INVENTORY_INVALID",
            path,
        )
        if entry["mode"] not in {"100644", "100755"}:
            _direct_runtime_integration_fail("TREE_CAPACITY_INVENTORY_INVALID", path)
        paths.append(path)
    if paths != sorted(paths) or len(paths) != len(set(paths)):
        _direct_runtime_integration_fail("TREE_CAPACITY_INVENTORY_INVALID")
    asset_entries = [
        entry
        for entry in inventory
        if entry["path"].startswith(f"{root}/")
    ]
    if not asset_entries:
        _direct_runtime_integration_fail("TREE_CAPACITY_ASSET_ROOT_EMPTY", root)
    apparent_bytes = sum(entry["size"] for entry in asset_entries)
    allocated_bytes = sum(
        ((entry["size"] + 4095) // 4096) * 4096
        for entry in asset_entries
    )
    selected_tree_allocated_bytes = sum(
        ((entry["size"] + 4095) // 4096) * 4096
        for entry in inventory
    )
    source_ceiling = {
        "path": root,
        "regularFiles": len(asset_entries),
        "apparentBytes": apparent_bytes,
        "allocatedBytes": allocated_bytes,
    }
    reservations = copy.deepcopy(_DIRECT_RUNTIME_STATIC_RESERVATIONS)
    reservations["baselineGitMaterializationBytes"] = selected_tree_allocated_bytes
    reservations["candidateCowBytes"] = selected_tree_allocated_bytes
    reservations["archiveSupplementBytes"] = selected_tree_allocated_bytes
    reservations["minimumHeadroomBytes"] = _DIRECT_RUNTIME_PREPARED_TRANSACTION_HEADROOM_BYTES
    required_available = sum(reservations.values())
    budget = {
        "schemaVersion": 1,
        "kind": "direct-command-runtime-asset-resource-budget",
        "frozenArchive": _reference(core.V2_ARCHIVE),
        "sourceCeiling": copy.deepcopy(source_ceiling),
        "reservations": reservations,
        "requiredAvailableBytes": required_available,
        "availableBytes": available,
        "decision": "PASS" if available >= required_available else "BLOCKED",
    }
    _direct_runtime_resource_budget_v1(budget)
    return {
        "selectedTreeInventory": inventory,
        "selectedTreeInventorySha256": _sha256(_canonical(inventory)),
        "sourceCeiling": source_ceiling,
        "resourceBudget": budget,
    }


def probe_direct_command_runtime_production_capacity_v1(
    preparation: dict[str, Any],
    filesystem_roots: dict[str, Path | str],
) -> dict[str, Any]:
    """Checks the real production filesystems required by one prepared transaction.

    @param preparation The immutable preparation that owns the required capacity budget.
    @param filesystem_roots The temporary-stage, archive, COW, and evidence filesystem roots.
    @returns The same-device production capacity observation bound to the preparation budget.
    @throws core.ExecutionClosureValidationError When roots span devices or free capacity is insufficient.
    """
    budget = preparation.get("resourceBudget") if isinstance(preparation, dict) else None
    _direct_runtime_resource_budget_v1(budget)
    required_roots = {"temporary-stage", "archive", "cow", "evidence"}
    if not isinstance(filesystem_roots, dict) or set(filesystem_roots) != required_roots:
        _direct_runtime_integration_fail("CAPACITY_ROOTS_INVALID")
    observed: dict[str, dict[str, int | str]] = {}
    devices: set[int] = set()
    available_values: list[int] = []
    for name in ("temporary-stage", "archive", "cow", "evidence"):
        value = filesystem_roots[name]
        try:
            path = Path(value)
            stat_result = os.stat(path)
            filesystem = os.statvfs(path)
        except (OSError, TypeError, ValueError) as error:
            _direct_runtime_integration_fail("CAPACITY_ROOT_UNAVAILABLE", f"{name}: {error}")
        available_bytes = filesystem.f_bavail * filesystem.f_frsize
        devices.add(stat_result.st_dev)
        available_values.append(available_bytes)
        observed[name] = {
            "path": str(path),
            "device": stat_result.st_dev,
            "availableBytes": available_bytes,
        }
    if len(devices) != 1:
        _direct_runtime_integration_fail("CAPACITY_DEVICE_MISMATCH")
    available_bytes = min(available_values)
    required_bytes = budget["requiredAvailableBytes"]
    if available_bytes < required_bytes:
        _direct_runtime_integration_fail("CAPACITY_INSUFFICIENT")
    return {
        "schemaVersion": 1,
        "kind": "direct-command-runtime-production-capacity-probe",
        "filesystemRoots": observed,
        "device": next(iter(devices)),
        "availableBytes": available_bytes,
        "requiredAvailableBytes": required_bytes,
        "decision": "PASS",
    }


def _direct_runtime_static_resource_budget_v1() -> dict[str, Any]:
    """Records the direct-runtime capacity reservation before any staging side effect.

    @returns The current pass/fail resource budget bound to the retained V2 archive.
    @throws core.ExecutionClosureValidationError When current free space cannot honor the immutable budget.
    """
    reservations = copy.deepcopy(_DIRECT_RUNTIME_STATIC_RESERVATIONS)
    required_available = sum(reservations.values())
    available = shutil.disk_usage("/tmp").free
    budget = {
        "schemaVersion": 1,
        "kind": "direct-command-runtime-asset-resource-budget",
        "frozenArchive": _reference(core.V2_ARCHIVE),
        "sourceCeiling": copy.deepcopy(_DIRECT_RUNTIME_STANDARD_SOURCE_CEILING),
        "reservations": reservations,
        "requiredAvailableBytes": required_available,
        "availableBytes": available,
        "decision": "PASS" if available >= required_available else "BLOCKED",
    }
    _direct_runtime_resource_budget_v1(budget)
    return budget


def prepare_direct_command_runtime_execution_inputs_v1(
    run_day: str | None = None,
) -> dict[str, Any]:
    """Derives static R1 runtime inputs from immutable archives and Git objects before staging.

    The preparation uses git ls-tree and Git blob objects only. It captures
    before candidate staging, rejects a liveWorktreeFallback, and leaves the
    dynamic build output unresolved until its single in-container producer has
    a receipt. The sealed finalizer rechecks packet bytes through
    capture_direct_command_runtime_baseline_git_packet_v1(...).

    @param run_day Optional UTC day used only to validate the prospective transaction date.
    @returns The static direct-command-runtime-input-preparation envelope.
    @throws core.ExecutionClosureValidationError When frozen inputs, Git objects, or capacity drift.
    """
    resolve_execution_run_day_v1(run_day)
    frozen_archive = _load_json(core.V2_ARCHIVE)
    frozen_entries = frozen_archive.get("entries")
    if not isinstance(frozen_entries, list):
        _direct_runtime_integration_fail("PREPARATION_FROZEN_ENTRIES_INVALID")
    _, trigger = _direct_runtime_trigger_v1(frozen_entries, STANDARD_PACK_GENERATOR)
    script_path = trigger["scriptPath"]
    expected_root = f"{trigger['directory']}/assets/standard"
    if expected_root != _DIRECT_RUNTIME_STANDARD_ASSET_ROOT:
        _direct_runtime_integration_fail("PREPARATION_ROOT_INVALID", expected_root)
    tree, records = _direct_runtime_baseline_tree_records_v1(script_path)
    if script_path not in {record["path"] for record in records}:
        _direct_runtime_integration_fail("PREPARATION_TREE_CEILING_INVALID")
    selected = [
        record
        for record in records
        if record["path"] == script_path
        or not _direct_runtime_is_ignored_leaf_v1(record["path"])
        or PurePosixPath(record["path"]).name in _DIRECT_RUNTIME_REQUIRED_RECEIPTS
    ]
    selected_assets = _direct_runtime_git_blob_assets_v1(selected)
    selected_tree_inventory = [
        {
            "path": asset["path"],
            "gitBlobSha1": asset["gitBlobSha1"],
            "sha256": asset["sha256"],
            "size": asset["size"],
            "mode": asset["mode"],
        }
        for asset in selected_assets
    ]
    capacity = derive_direct_command_runtime_capacity_from_selected_tree_v1(
        selected_tree_inventory,
        expected_root,
        shutil.disk_usage("/tmp").free,
    )
    packet = _direct_runtime_source_packet_from_assets_v1(tree, selected_assets)
    materialization = build_direct_command_runtime_packet_materialization_contract_v1(packet)
    resource_budget = capacity["resourceBudget"]
    return {
        "schemaVersion": 1,
        "kind": "direct-command-runtime-input-preparation",
        "transaction": {
            "continuity": "SINGLE_UNINTERRUPTED_R1_V3_TRANSACTION",
            "candidatePublication": "FORBIDDEN_UNTIL_ALL_GATES_PASS",
            "externalRuntimeInputs": "REJECT",
        },
        "frozenInputs": {
            "archive": _reference(core.V2_ARCHIVE),
            "generatorArgv": list(STANDARD_PACK_GENERATOR),
        },
        "baselineGitDiscovery": {
            "source": "GIT_OBJECT_DATABASE_ONLY",
            "baselineCommit": _DIRECT_RUNTIME_BASELINE_COMMIT,
            "tree": {"gitTreeSha1": tree},
            "root": expected_root,
            "recursiveListing": "GIT_LS_TREE_RECURSIVE_ONLY",
            "liveWorktreeFallback": "REJECT",
            "captureTiming": "CAPTURE_BEFORE_CANDIDATE_STAGING",
            "selectedTreeInventory": capacity["selectedTreeInventory"],
            "selectedTreeInventorySha256": capacity["selectedTreeInventorySha256"],
        },
        "sourcePacket": packet,
        "packetMaterialization": materialization,
        "resourceBudget": resource_budget,
        "dynamicBuildOutput": _direct_runtime_prepared_dynamic_build_output_v1(
            trigger,
            selected_assets,
        ),
    }


def _direct_runtime_same_attempt_identity_fail_v1(
    code: str,
    detail: str = "",
) -> None:
    """Raises one stable same-attempt identity binding failure.

    @param code The invariant-specific failure suffix.
    @param detail Optional context for the failed invariant.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError Always.
    """
    _direct_runtime_integration_fail(
        f"SAME_ATTEMPT_IDENTITY_{code}",
        detail,
    )


def _direct_runtime_same_attempt_identity_json_value_v1(value: Any) -> Any:
    """Converts runner-local path carriers into deterministic JSON-compatible identity values.

    @param value The archive, context, receipt, or nested value to canonicalize.
    @returns A recursively JSON-compatible identity carrier.
    @throws core.ExecutionClosureValidationError When a carrier contains an unbound runtime value.
    """
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, dict):
        if not all(isinstance(key, str) for key in value):
            _direct_runtime_same_attempt_identity_fail_v1(
                "CANONICAL_VALUE_INVALID",
            )
        return {
            key: _direct_runtime_same_attempt_identity_json_value_v1(item)
            for key, item in value.items()
        }
    if isinstance(value, (list, tuple)):
        return [
            _direct_runtime_same_attempt_identity_json_value_v1(item)
            for item in value
        ]
    if value is None or isinstance(value, (bool, float, int, str)):
        return value
    _direct_runtime_same_attempt_identity_fail_v1("CANONICAL_VALUE_INVALID")


def _direct_runtime_same_attempt_identity_canonical_v1(value: Any) -> bytes:
    """Serializes one same-attempt carrier with runner-local paths normalized deterministically.

    @param value The carrier to serialize.
    @returns Canonical UTF-8 identity bytes.
    @throws core.ExecutionClosureValidationError When the carrier cannot be represented safely.
    """
    return _canonical(_direct_runtime_same_attempt_identity_json_value_v1(value))


def _direct_runtime_same_attempt_identity_sha256_v1(
    value: Any,
    code: str,
) -> str:
    """Validates one same-attempt SHA-256 field.

    @param value The claimed digest.
    @param code The invariant-specific failure suffix.
    @returns The validated lowercase digest.
    @throws core.ExecutionClosureValidationError When the digest is malformed.
    """
    if not isinstance(value, str) or re.fullmatch(r"[0-9a-f]{64}", value) is None:
        _direct_runtime_same_attempt_identity_fail_v1(code)
    return value


def _direct_runtime_same_attempt_identity_reference_v1(
    value: Any,
    code: str,
    *,
    require_observer_path: bool = True,
) -> dict[str, Any]:
    """Validates one raw observer receipt reference.

    @param value The claimed raw receipt reference.
    @param code The invariant-specific failure suffix.
    @param require_observer_path Whether the reference must be the post-build observer stream.
    @returns The validated receipt reference.
    @throws core.ExecutionClosureValidationError When raw receipt provenance is incomplete.
    """
    if (
        not isinstance(value, dict)
        or set(value) != {"path", "sha256", "size"}
        or not isinstance(value.get("path"), str)
        or (
            require_observer_path
            and not value["path"].endswith(
            "/raw/receipt-direct-runtime-dist-identity.stdout.txt",
            )
        )
        or type(value.get("size")) is not int
        or value["size"] < 0
    ):
        _direct_runtime_same_attempt_identity_fail_v1(code)
    _direct_runtime_same_attempt_identity_sha256_v1(value["sha256"], code)
    return value


def _direct_runtime_same_attempt_identity_rows_v1(
    value: Any,
    code: str,
) -> list[dict[str, Any]]:
    """Validates exact in-container post-build read identities.

    @param value The observer's derived-build read collection.
    @param code The invariant-specific failure suffix.
    @returns The validated ordered identity rows.
    @throws core.ExecutionClosureValidationError When a read is not a regular /work file identity.
    """
    if not isinstance(value, list) or not value:
        _direct_runtime_same_attempt_identity_fail_v1(code)
    rows: list[dict[str, Any]] = []
    for row in value:
        if (
            not isinstance(row, dict)
            or set(row) != {"mode", "path", "resolvedPath", "sha256", "size"}
            or not isinstance(row.get("path"), str)
            or not row["path"]
            or row.get("resolvedPath") != f"/work/{row['path']}"
            or not isinstance(row.get("mode"), str)
            or re.fullmatch(r"100[0-7]{3}", row["mode"]) is None
            or type(row.get("size")) is not int
            or row["size"] < 0
        ):
            _direct_runtime_same_attempt_identity_fail_v1(code)
        _direct_runtime_same_attempt_identity_sha256_v1(row["sha256"], code)
        rows.append(row)
    if [row["path"] for row in rows] != sorted(row["path"] for row in rows):
        _direct_runtime_same_attempt_identity_fail_v1(code)
    if len({row["path"] for row in rows}) != len(rows):
        _direct_runtime_same_attempt_identity_fail_v1(code)
    return rows


def _direct_runtime_same_attempt_identity_observer_v1(
    value: Any,
    code: str,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Validates the nonce-bound in-container observer payload.

    @param value The parsed observer payload.
    @param code The invariant-specific failure suffix.
    @returns The observer and its validated ordered derived reads.
    @throws core.ExecutionClosureValidationError When the observer is stale, malformed, or outside /work.
    """
    if (
        not isinstance(value, dict)
        or set(value) != {
            "attemptNonceSha256",
            "derivedBuildReadSet",
            "workRoot",
        }
        or value.get("workRoot") != "/work"
    ):
        _direct_runtime_same_attempt_identity_fail_v1(code)
    _direct_runtime_same_attempt_identity_sha256_v1(
        value["attemptNonceSha256"],
        code,
    )
    return value, _direct_runtime_same_attempt_identity_rows_v1(
        value["derivedBuildReadSet"],
        code,
    )


def _direct_runtime_same_attempt_identity_context_work_root_v1(
    context: Any,
    code: str,
) -> str:
    """Returns the container work root from either a pure fixture or production context.

    @param context The execution context to bind.
    @param code The invariant-specific failure suffix.
    @returns The bound container work root.
    @throws core.ExecutionClosureValidationError When the context does not describe /work.
    """
    if not isinstance(context, dict):
        _direct_runtime_same_attempt_identity_fail_v1(code)
    clean_work_root = context.get("cleanWorkRoot")
    root = (
        clean_work_root.get("containerPath")
        if isinstance(clean_work_root, dict)
        else context.get("work")
    )
    if root != "/work":
        _direct_runtime_same_attempt_identity_fail_v1(code)
    return root


def _direct_runtime_same_attempt_identity_read_set_matches_v1(
    post_build_identity: Any,
    observer_rows: list[dict[str, Any]],
    code: str,
) -> None:
    """Binds observer rows to the finalizer-facing derived read set.

    @param post_build_identity The post-build carrier containing the finalizer read set.
    @param observer_rows The exact ordered rows emitted by the in-container observer.
    @param code The invariant-specific failure suffix.
    @returns Nothing when every observer byte identity matches its derived read.
    @throws core.ExecutionClosureValidationError When observer and finalizer identities disagree.
    """
    read_set = (
        post_build_identity.get("readSet")
        if isinstance(post_build_identity, dict)
        else None
    )
    derived_rows = (
        read_set.get("derivedBuildReadSet")
        if isinstance(read_set, dict)
        else None
    )
    if not isinstance(derived_rows, list) or len(derived_rows) != len(observer_rows):
        _direct_runtime_same_attempt_identity_fail_v1(code)
    for observed, derived in zip(observer_rows, derived_rows):
        if (
            not isinstance(derived, dict)
            or derived.get("path") != observed["path"]
            or derived.get("sha256") != observed["sha256"]
            or derived.get("size") != observed["size"]
        ):
            _direct_runtime_same_attempt_identity_fail_v1(code)


def _direct_runtime_same_attempt_identity_envelope_v1(
    value: Any,
    code: str,
) -> dict[str, Any]:
    """Validates one sealed same-attempt post-build identity envelope.

    @param value The claimed identity envelope.
    @param code The invariant-specific failure suffix.
    @returns The validated envelope.
    @throws core.ExecutionClosureValidationError When any bound digest or receipt is malformed.
    """
    required = {
        "schemaVersion",
        "kind",
        "attemptNonceSha256",
        "preparationSha256",
        "archiveSha256",
        "contextSha256",
        "runtimeBuildReceiptSha256",
        "observerRawReceipt",
        "workRoot",
        "derivedBuildReadSetSha256",
    }
    if (
        not isinstance(value, dict)
        or set(value) != required
        or value.get("schemaVersion") != 1
        or value.get("kind")
        != "direct-command-runtime-same-attempt-post-build-identity"
        or value.get("workRoot") != "/work"
    ):
        _direct_runtime_same_attempt_identity_fail_v1(code)
    for field in (
        "attemptNonceSha256",
        "preparationSha256",
        "archiveSha256",
        "contextSha256",
        "runtimeBuildReceiptSha256",
        "derivedBuildReadSetSha256",
    ):
        _direct_runtime_same_attempt_identity_sha256_v1(value[field], code)
    _direct_runtime_same_attempt_identity_reference_v1(
        value["observerRawReceipt"],
        code,
    )
    return value


def build_direct_command_runtime_same_attempt_identity_envelope_v1(
    preparation: dict[str, Any],
    archive: dict[str, Any],
    context: dict[str, Any],
    runtime_build_receipt: dict[str, Any],
    post_build_identity: dict[str, Any],
    attempt_nonce: bytes,
) -> dict[str, Any]:
    """Builds the immutable nonce-bound post-build identity envelope for one runtime attempt.

    @param preparation The immutable runtime preparation consumed by this attempt.
    @param archive The archive bytes staged before materialization.
    @param context The clean execution context staged before materialization.
    @param runtime_build_receipt The successful prerequisite-build receipt for this attempt.
    @param post_build_identity The nonce-bound in-container post-build observation.
    @param attempt_nonce The private cryptographic nonce for this one attempt.
    @returns The exact digest envelope consumed by finalization, binding, and trace checks.
    @throws core.ExecutionClosureValidationError When any carrier is stale, spoofed, or cross-attempt.
    """
    if (
        not isinstance(preparation, dict)
        or not isinstance(archive, dict)
        or not isinstance(context, dict)
        or not isinstance(runtime_build_receipt, dict)
        or not isinstance(post_build_identity, dict)
        or not isinstance(attempt_nonce, bytes)
        or not attempt_nonce
    ):
        _direct_runtime_same_attempt_identity_fail_v1("BUILD_INPUT_INVALID")
    preparation_sha256 = _sha256(
        _direct_runtime_same_attempt_identity_canonical_v1(preparation),
    )
    _direct_runtime_same_attempt_identity_context_work_root_v1(
        context,
        "BUILD_CONTEXT_INVALID",
    )
    direct_attempt = runtime_build_receipt.get("directRuntimeAttempt")
    if (
        runtime_build_receipt.get("directRuntimePreparationSha256")
        != preparation_sha256
        or not isinstance(direct_attempt, dict)
    ):
        _direct_runtime_same_attempt_identity_fail_v1(
            "BUILD_RUNTIME_RECEIPT_INVALID",
        )
    nonce_sha256 = _sha256(attempt_nonce)
    if direct_attempt.get("nonceSha256") != nonce_sha256:
        _direct_runtime_same_attempt_identity_fail_v1("BUILD_NONCE_INVALID")
    _direct_runtime_same_attempt_identity_reference_v1(
        runtime_build_receipt.get("receipt"),
        "BUILD_RUNTIME_RECEIPT_INVALID",
        require_observer_path=False,
    )
    if (
        post_build_identity.get("source")
        != "IN_CONTAINER_POST_RUNTIME_BUILD_IDENTITY"
        or post_build_identity.get("directRuntimePreparationSha256")
        != preparation_sha256
    ):
        _direct_runtime_same_attempt_identity_fail_v1("BUILD_OBSERVER_INVALID")
    observer, observer_rows = _direct_runtime_same_attempt_identity_observer_v1(
        post_build_identity.get("observation"),
        "BUILD_OBSERVER_INVALID",
    )
    if observer["attemptNonceSha256"] != nonce_sha256:
        _direct_runtime_same_attempt_identity_fail_v1("BUILD_NONCE_INVALID")
    observer_receipt = _direct_runtime_same_attempt_identity_reference_v1(
        post_build_identity.get("receipt"),
        "BUILD_OBSERVER_RECEIPT_INVALID",
    )
    observer_bytes = _direct_runtime_same_attempt_identity_canonical_v1(
        observer,
    )
    if observer_receipt != {
        "path": observer_receipt["path"],
        "sha256": _sha256(observer_bytes),
        "size": len(observer_bytes),
    }:
        _direct_runtime_same_attempt_identity_fail_v1(
            "BUILD_OBSERVER_RECEIPT_INVALID",
        )
    _direct_runtime_same_attempt_identity_read_set_matches_v1(
        post_build_identity,
        observer_rows,
        "BUILD_READ_SET_INVALID",
    )
    return {
        "schemaVersion": 1,
        "kind": "direct-command-runtime-same-attempt-post-build-identity",
        "attemptNonceSha256": nonce_sha256,
        "preparationSha256": preparation_sha256,
        "archiveSha256": _sha256(
            _direct_runtime_same_attempt_identity_canonical_v1(archive),
        ),
        "contextSha256": _sha256(
            _direct_runtime_same_attempt_identity_canonical_v1(context),
        ),
        "runtimeBuildReceiptSha256": _sha256(
            _direct_runtime_same_attempt_identity_canonical_v1(
                runtime_build_receipt,
            ),
        ),
        "observerRawReceipt": copy.deepcopy(observer_receipt),
        "workRoot": observer["workRoot"],
        "derivedBuildReadSetSha256": _sha256(
            _direct_runtime_same_attempt_identity_canonical_v1(observer_rows),
        ),
    }


def validate_direct_command_runtime_same_attempt_identity_finalization_v1(
    envelope: dict[str, Any],
    preparation: dict[str, Any],
    runtime_build_receipt: dict[str, Any],
    post_build_identity: dict[str, Any],
) -> None:
    """Validates the preparation, build, observer, and receipt links before finalization.

    @param envelope The sealed same-attempt identity envelope.
    @param preparation The immutable runtime preparation consumed by this attempt.
    @param runtime_build_receipt The prerequisite-build receipt to bind.
    @param post_build_identity The in-container post-build identity to bind.
    @returns Nothing when finalization inputs are cryptographically same-attempt.
    @throws core.ExecutionClosureValidationError When any finalization input is stale or spoofed.
    """
    validated = _direct_runtime_same_attempt_identity_envelope_v1(
        envelope,
        "FINALIZATION_ENVELOPE_INVALID",
    )
    if (
        not isinstance(preparation, dict)
        or not isinstance(runtime_build_receipt, dict)
        or not isinstance(post_build_identity, dict)
        or validated["preparationSha256"]
        != _sha256(
            _direct_runtime_same_attempt_identity_canonical_v1(preparation),
        )
        or validated["runtimeBuildReceiptSha256"]
        != _sha256(
            _direct_runtime_same_attempt_identity_canonical_v1(
                runtime_build_receipt,
            ),
        )
        or runtime_build_receipt.get("directRuntimePreparationSha256")
        != validated["preparationSha256"]
    ):
        _direct_runtime_same_attempt_identity_fail_v1(
            "FINALIZATION_LINK_INVALID",
        )
    direct_attempt = runtime_build_receipt.get("directRuntimeAttempt")
    if (
        not isinstance(direct_attempt, dict)
        or direct_attempt.get("nonceSha256")
        != validated["attemptNonceSha256"]
        or post_build_identity.get("source")
        != "IN_CONTAINER_POST_RUNTIME_BUILD_IDENTITY"
        or post_build_identity.get("directRuntimePreparationSha256")
        != validated["preparationSha256"]
    ):
        _direct_runtime_same_attempt_identity_fail_v1(
            "FINALIZATION_LINK_INVALID",
        )
    observer, observer_rows = _direct_runtime_same_attempt_identity_observer_v1(
        post_build_identity.get("observation"),
        "FINALIZATION_OBSERVER_INVALID",
    )
    if (
        observer["attemptNonceSha256"] != validated["attemptNonceSha256"]
        or observer["workRoot"] != validated["workRoot"]
        or validated["derivedBuildReadSetSha256"]
        != _sha256(
            _direct_runtime_same_attempt_identity_canonical_v1(observer_rows),
        )
    ):
        _direct_runtime_same_attempt_identity_fail_v1(
            "FINALIZATION_OBSERVER_INVALID",
        )
    observer_receipt = _direct_runtime_same_attempt_identity_reference_v1(
        post_build_identity.get("receipt"),
        "FINALIZATION_OBSERVER_RECEIPT_INVALID",
    )
    observer_bytes = _direct_runtime_same_attempt_identity_canonical_v1(
        observer,
    )
    if (
        observer_receipt != validated["observerRawReceipt"]
        or observer_receipt["sha256"] != _sha256(observer_bytes)
        or observer_receipt["size"] != len(observer_bytes)
    ):
        _direct_runtime_same_attempt_identity_fail_v1(
            "FINALIZATION_OBSERVER_RECEIPT_INVALID",
        )
    _direct_runtime_same_attempt_identity_read_set_matches_v1(
        post_build_identity,
        observer_rows,
        "FINALIZATION_READ_SET_INVALID",
    )


def validate_direct_command_runtime_same_attempt_identity_binding_v1(
    envelope: dict[str, Any],
    archive: dict[str, Any],
    context: dict[str, Any],
) -> None:
    """Validates archive and execution-context bytes before sealing finalization.

    @param envelope The sealed same-attempt identity envelope.
    @param archive The archive bytes to bind.
    @param context The execution context bytes to bind.
    @returns Nothing when archive and context still match the pre-finalization envelope.
    @throws core.ExecutionClosureValidationError When binding would accept a mutated archive or context.
    """
    validated = _direct_runtime_same_attempt_identity_envelope_v1(
        envelope,
        "BINDING_ENVELOPE_INVALID",
    )
    if (
        not isinstance(archive, dict)
        or not isinstance(context, dict)
        or _direct_runtime_same_attempt_identity_context_work_root_v1(
            context,
            "BINDING_CONTEXT_INVALID",
        )
        != validated["workRoot"]
        or validated["archiveSha256"]
        != _sha256(
            _direct_runtime_same_attempt_identity_canonical_v1(archive),
        )
        or validated["contextSha256"]
        != _sha256(
            _direct_runtime_same_attempt_identity_canonical_v1(context),
        )
    ):
        _direct_runtime_same_attempt_identity_fail_v1("BINDING_LINK_INVALID")


def validate_direct_command_runtime_same_attempt_identity_before_trace_v1(
    envelope: dict[str, Any],
    post_trace_observation: dict[str, Any],
) -> None:
    """Validates a fresh post-generator observer before raw trace receipt capture.

    @param envelope The sealed same-attempt identity envelope.
    @param post_trace_observation The freshly captured post-generator identity observation.
    @returns Nothing when generated derived bytes remain identical to the sealed observation.
    @throws core.ExecutionClosureValidationError When a TOCTOU mutation or cross-attempt observation is detected.
    """
    validated = _direct_runtime_same_attempt_identity_envelope_v1(
        envelope,
        "TRACE_ENVELOPE_INVALID",
    )
    observer, rows = _direct_runtime_same_attempt_identity_observer_v1(
        post_trace_observation,
        "TRACE_OBSERVER_INVALID",
    )
    if (
        observer["attemptNonceSha256"] != validated["attemptNonceSha256"]
        or observer["workRoot"] != validated["workRoot"]
        or _sha256(
            _direct_runtime_same_attempt_identity_canonical_v1(rows),
        )
        != validated["derivedBuildReadSetSha256"]
    ):
        _direct_runtime_same_attempt_identity_fail_v1("TRACE_TOCTOU_INVALID")


def finalize_direct_command_runtime_execution_inputs_v1(
    preparation: dict[str, Any],
    runtime_build_receipt: dict[str, Any],
    post_build_identity: dict[str, Any],
) -> dict[str, Any]:
    """Seals runtime integration after one recorded in-container prerequisite build.

    @param preparation The immutable static preparation envelope from this transaction.
    @param runtime_build_receipt The successful same-transaction runtime build receipt.
    @param post_build_identity The in-container identity of the generated dist reads.
    @returns The sealed direct-runtime runner integration.
    @throws core.ExecutionClosureValidationError When the build, preparation, or derived identity is unbound.
    """
    if not isinstance(preparation, dict) or preparation.get("kind") != "direct-command-runtime-input-preparation":
        _direct_runtime_integration_fail("PREPARATION_INVALID")
    packet = preparation.get("sourcePacket")
    materialization = preparation.get("packetMaterialization")
    budget = preparation.get("resourceBudget")
    dynamic_build_output = preparation.get("dynamicBuildOutput")
    discovery = preparation.get("baselineGitDiscovery")
    if (
        not isinstance(packet, dict)
        or not isinstance(materialization, dict)
        or not isinstance(budget, dict)
        or not isinstance(dynamic_build_output, dict)
        or not isinstance(discovery, dict)
        or dynamic_build_output.get("source") != "IN_CONTAINER_POST_RUNTIME_BUILD_IDENTITY"
        or dynamic_build_output.get("receiptIdentityPolicy") != "EXACT_PRODUCER_RECEIPT_FOR_EACH_DERIVED_DIST_READ"
    ):
        _direct_runtime_integration_fail("PREPARATION_INVALID")
    _direct_runtime_validate_source_packet_v1(packet, packet.get("baselineReadSet"))
    if materialization != build_direct_command_runtime_packet_materialization_contract_v1(packet):
        _direct_runtime_integration_fail("PREPARATION_MATERIALIZATION_INVALID")
    _direct_runtime_resource_budget_v1(budget)
    inventory = discovery.get("selectedTreeInventory")
    inventory_sha256 = discovery.get("selectedTreeInventorySha256")
    root = discovery.get("root")
    if (
        not isinstance(inventory, list)
        or not isinstance(inventory_sha256, str)
        or not isinstance(root, str)
    ):
        _direct_runtime_integration_fail("PREPARATION_TREE_CAPACITY_INVALID")
    capacity = derive_direct_command_runtime_capacity_from_selected_tree_v1(
        inventory,
        root,
        budget["availableBytes"],
    )
    packet_inventory = [
        {
            "path": identity["path"],
            "gitBlobSha1": identity["gitBlobSha1"],
            "sha256": identity["sha256"],
            "size": identity["size"],
            "mode": identity["mode"],
        }
        for identity in packet["baselineReadSet"]
    ]
    if (
        capacity["selectedTreeInventory"] != inventory
        or capacity["selectedTreeInventorySha256"] != inventory_sha256
        or capacity["resourceBudget"] != budget
        or packet_inventory != inventory
    ):
        _direct_runtime_integration_fail("PREPARATION_TREE_CAPACITY_INVALID")
    preparation_sha256 = _sha256(_canonical(preparation))
    if (
        not isinstance(runtime_build_receipt, dict)
        or runtime_build_receipt.get("id") != "build-advantage-play-kit-for-runtime"
        or runtime_build_receipt.get("argv") != ["pnpm", "build"]
        or runtime_build_receipt.get("exitCode") != 0
        or runtime_build_receipt.get("directRuntimePreparationSha256") != preparation_sha256
        or not isinstance(runtime_build_receipt.get("directRuntimeAttempt"), dict)
    ):
        _direct_runtime_integration_fail("RUNTIME_BUILD_RECEIPT_INVALID")
    runtime_attempt = runtime_build_receipt["directRuntimeAttempt"]
    if (
        not isinstance(runtime_attempt.get("nonceSha256"), str)
        or re.fullmatch(r"[0-9a-f]{64}", runtime_attempt["nonceSha256"])
        is None
    ):
        _direct_runtime_integration_fail("RUNTIME_BUILD_RECEIPT_INVALID")
    if (
        not isinstance(post_build_identity, dict)
        or post_build_identity.get("source") != "IN_CONTAINER_POST_RUNTIME_BUILD_IDENTITY"
        or post_build_identity.get("directRuntimePreparationSha256") != preparation_sha256
        or not isinstance(post_build_identity.get("readSet"), dict)
    ):
        _direct_runtime_integration_fail("POST_BUILD_IDENTITY_INVALID")
    observation = post_build_identity.get("observation")
    observed_rows = (
        observation.get("derivedBuildReadSet")
        if isinstance(observation, dict)
        else None
    )
    if (
        not isinstance(observation, dict)
        or set(observation)
        != {"attemptNonceSha256", "derivedBuildReadSet", "workRoot"}
        or not isinstance(observed_rows, list)
        or observation.get("attemptNonceSha256")
        != runtime_attempt["nonceSha256"]
        or observation.get("workRoot") != "/work"
        or any(
            not isinstance(row, dict)
            or set(row) != {"mode", "path", "resolvedPath", "sha256", "size"}
            or not isinstance(row.get("path"), str)
            or row.get("resolvedPath") != f"/work/{row.get('path')}"
            or not isinstance(row.get("mode"), str)
            or re.fullmatch(r"100[0-7]{3}", row["mode"]) is None
            or not isinstance(row.get("sha256"), str)
            or re.fullmatch(r"[0-9a-f]{64}", row["sha256"]) is None
            or type(row.get("size")) is not int
            or row["size"] < 0
            for row in observed_rows
        )
    ):
        _direct_runtime_integration_fail("POST_BUILD_IDENTITY_INVALID")
    observation_bytes = _canonical(observation)
    expected_observation_receipt = {
        "path": f"{V3_NAME}/raw/receipt-direct-runtime-dist-identity.stdout.txt",
        "sha256": _sha256(observation_bytes),
        "size": len(observation_bytes),
    }
    if post_build_identity.get("receipt") != expected_observation_receipt:
        _direct_runtime_integration_fail("POST_BUILD_IDENTITY_RECEIPT_INVALID")
    read_set = post_build_identity["readSet"]
    _direct_runtime_validate_read_set_shape_v1(read_set, budget)
    if read_set["baselineReadSet"] != packet["baselineReadSet"]:
        _direct_runtime_integration_fail("POST_BUILD_IDENTITY_INVALID")
    derived_rows = read_set["derivedBuildReadSet"]
    if (
        len(observed_rows) != len(derived_rows)
        or [row["path"] for row in observed_rows]
        != [row["path"] for row in derived_rows]
        or any(
            observed["sha256"] != derived["sha256"]
            or observed["size"] != derived["size"]
            or observed["resolvedPath"] != f"/work/{derived['path']}"
            for observed, derived in zip(observed_rows, derived_rows)
        )
    ):
        _direct_runtime_integration_fail("POST_BUILD_IDENTITY_INVALID")
    for derived in derived_rows:
        producer = derived.get("producer") if isinstance(derived, dict) else None
        if (
            not isinstance(producer, dict)
            or producer.get("kind") != "PACKAGE_SCRIPT_PREREQUISITE_BUILD"
            or producer.get("scriptSegment") != "pnpm build"
            or producer.get("receipt") != runtime_build_receipt.get("receipt")
        ):
            _direct_runtime_integration_fail("POST_BUILD_IDENTITY_INVALID")
    # The identity must arrive from the in-container post-build observer, not a
    # host or caller-supplied prebuild; the integration seals it exactly once.
    return build_direct_command_runtime_runner_integration_v1(
        read_set,
        packet,
        runtime_build_receipt["directRuntimeAttempt"],
        budget,
    )


def execute_direct_command_runtime_prepared_transaction_v1(
    preparation: dict[str, Any],
    executor: Any,
) -> dict[str, Any]:
    """Executes the one ordered direct-runtime preparation transaction through an executor.

    @param preparation The immutable pre-staging preparation envelope.
    @param executor The production or synthetic stage executor for this transaction.
    @returns Every carrier produced by the ordered archive-to-trace transaction.
    @throws core.ExecutionClosureValidationError When the real finalizer rejects observed runtime identity.
    """
    try:
        # The concrete production executor owns a real statvfs/st_dev observation
        # before it can allocate a temporary root. The optional branch retains the
        # deliberately I/O-free synthetic executor used by the contract test.
        capacity_probe = (
            executor.probe_capacity(preparation)
            if hasattr(executor, "probe_capacity")
            else None
        )
        archive = executor.build_archive(preparation)
        context = executor.build_context(archive, preparation)
        materialization = executor.materialize(context, preparation)
        runtime_build_receipt = executor.runtime_build(
            context,
            materialization,
            preparation,
        )
        post_build_identity = executor.post_build_identity(
            context,
            runtime_build_receipt,
            preparation,
        )
        same_attempt_identity_envelope_builder = getattr(
            executor,
            "build_same_attempt_identity_envelope",
            None,
        )
        if not callable(same_attempt_identity_envelope_builder):
            _direct_runtime_integration_fail(
                "SAME_ATTEMPT_IDENTITY_ENVELOPE_BUILDER_REQUIRED",
            )
        same_attempt_identity_envelope = same_attempt_identity_envelope_builder(
            preparation,
            archive,
            context,
            runtime_build_receipt,
            post_build_identity,
        )
        validate_direct_command_runtime_same_attempt_identity_finalization_v1(
            same_attempt_identity_envelope,
            preparation,
            runtime_build_receipt,
            post_build_identity,
        )
        integration = finalize_direct_command_runtime_execution_inputs_v1(
            preparation,
            runtime_build_receipt,
            post_build_identity,
        )
        sealed_integration = executor.bind_finalization(
            archive,
            context,
            integration,
        )
        if sealed_integration is None:
            _direct_runtime_integration_fail("FINALIZATION_BINDING_MISSING")
        validate_direct_command_runtime_same_attempt_identity_binding_v1(
            same_attempt_identity_envelope,
            archive,
            context,
        )
        generation = executor.generate(context, sealed_integration)
        trace = executor.capture_trace(
            context,
            sealed_integration,
            generation,
        )
    except BaseException as error:
        if not isinstance(error, KeyboardInterrupt) and hasattr(
            executor,
            "preserve_failure",
        ):
            executor.preserve_failure(error)
        raise
    transaction = {
        "archive": archive,
        "context": context,
        "materialization": materialization,
        "runtimeBuildReceipt": runtime_build_receipt,
        "postBuildIdentity": post_build_identity,
        "integration": integration,
        "sealedIntegration": sealed_integration,
        "generation": generation,
        "trace": trace,
    }
    transaction["sameAttemptIdentityEnvelope"] = same_attempt_identity_envelope
    if capacity_probe is not None:
        return {
            "capacityProbe": capacity_probe,
            **transaction,
        }
    return transaction


def _direct_runtime_integration_fail(code: str, detail: str = "") -> None:
    """Raises one stable detached-runtime-integration validation failure.

    @param code The invariant-specific failure suffix.
    @param detail Optional context for the failed invariant.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError Always.
    """
    _fail(f"V3_DIRECT_RUNTIME_RUNNER_INTEGRATION_{code}", detail)


def _direct_runtime_packet_digest_v1(packet: dict[str, Any]) -> str:
    """Computes the canonical digest for one detached baseline Git-object packet.

    @param packet The packet excluding its self-referential digest field.
    @returns The lowercase SHA-256 digest of canonical packet content.
    """
    return _sha256(_canonical({key: value for key, value in packet.items() if key != "packetSha256"}))


def _direct_runtime_baseline_commit_v1(read_set: dict[str, Any]) -> str:
    """Returns the one baseline commit shared by every selected runtime Git blob.

    @param read_set The canonical runtime read set.
    @returns The immutable baseline commit identifier.
    @throws core.ExecutionClosureValidationError When selected blobs span more than one commit.
    """
    baseline = read_set.get("baselineReadSet") if isinstance(read_set, dict) else None
    if not isinstance(baseline, list) or not baseline:
        _direct_runtime_integration_fail("BASELINE_READ_SET_INVALID")
    commits = {item.get("baselineCommit") for item in baseline if isinstance(item, dict)}
    if len(commits) != 1:
        _direct_runtime_integration_fail("BASELINE_COMMIT_AMBIGUOUS")
    commit = next(iter(commits))
    if not isinstance(commit, str) or re.fullmatch(r"[0-9a-f]{40}", commit) is None:
        _direct_runtime_integration_fail("BASELINE_COMMIT_INVALID")
    return commit


def _direct_runtime_validate_source_packet_v1(
    source_packet: Any,
    baseline_read_set: list[dict[str, Any]],
) -> dict[str, Any]:
    """Validates a detached packet containing only exact baseline Git-object bytes.

    @param source_packet The immutable Git-object packet to mount into the runner.
    @param baseline_read_set The exact baseline identities authorized by the runtime contract.
    @returns The validated source packet.
    @throws core.ExecutionClosureValidationError When bytes, tree identity, or read-set binding drifts.
    """
    required = {
        "schemaVersion",
        "kind",
        "source",
        "baselineCommit",
        "tree",
        "baselineReadSet",
        "objects",
        "packetSha256",
    }
    if not isinstance(source_packet, dict) or set(source_packet) != required:
        _direct_runtime_integration_fail("SOURCE_PACKET_INVALID")
    if (
        source_packet["schemaVersion"] != 1
        or source_packet["kind"] != "direct-command-runtime-baseline-git-source-packet"
        or source_packet["source"] != "GIT_OBJECT_DATABASE_ONLY"
    ):
        _direct_runtime_integration_fail("SOURCE_PACKET_INVALID")
    commit = source_packet["baselineCommit"]
    if not isinstance(commit, str) or re.fullmatch(r"[0-9a-f]{40}", commit) is None:
        _direct_runtime_integration_fail("SOURCE_PACKET_INVALID")
    tree = source_packet["tree"]
    if (
        not isinstance(tree, dict)
        or set(tree) != {"gitTreeSha1"}
        or not isinstance(tree["gitTreeSha1"], str)
        or re.fullmatch(r"[0-9a-f]{40}", tree["gitTreeSha1"]) is None
    ):
        _direct_runtime_integration_fail("SOURCE_PACKET_TREE_INVALID")
    if source_packet["baselineReadSet"] != baseline_read_set:
        _direct_runtime_integration_fail("SOURCE_PACKET_READ_SET_UNBOUND")
    objects = source_packet["objects"]
    if not isinstance(objects, list) or len(objects) != len(baseline_read_set):
        _direct_runtime_integration_fail("SOURCE_PACKET_OBJECTS_INVALID")
    expected_by_path = {item["path"]: item for item in baseline_read_set}
    seen: set[str] = set()
    for object_record in objects:
        if not isinstance(object_record, dict):
            _direct_runtime_integration_fail("SOURCE_PACKET_OBJECTS_INVALID")
        path = object_record.get("path")
        identity = expected_by_path.get(path)
        if identity is None or path in seen:
            _direct_runtime_integration_fail("SOURCE_PACKET_OBJECTS_INVALID")
        if set(object_record) != set(identity) | {"contentBase64"}:
            _direct_runtime_integration_fail("SOURCE_PACKET_OBJECTS_INVALID", str(path))
        if {key: object_record[key] for key in identity} != identity:
            _direct_runtime_integration_fail("SOURCE_PACKET_OBJECTS_INVALID", str(path))
        if object_record["baselineCommit"] != commit:
            _direct_runtime_integration_fail("SOURCE_PACKET_OBJECTS_INVALID", str(path))
        try:
            data = base64.b64decode(object_record["contentBase64"], validate=True)
        except (TypeError, ValueError):
            _direct_runtime_integration_fail("SOURCE_PACKET_OBJECTS_INVALID", str(path))
        blob = b"blob " + str(len(data)).encode("ascii") + b"\0" + data
        if (
            len(data) != object_record["size"]
            or _sha256(data) != object_record["sha256"]
            or hashlib.sha1(blob).hexdigest() != object_record["gitBlobSha1"]
        ):
            _direct_runtime_integration_fail("SOURCE_PACKET_OBJECTS_INVALID", str(path))
        seen.add(path)
    if seen != set(expected_by_path) or objects != sorted(objects, key=lambda item: item["path"]):
        _direct_runtime_integration_fail("SOURCE_PACKET_OBJECTS_INVALID")
    if source_packet["packetSha256"] != _direct_runtime_packet_digest_v1(source_packet):
        _direct_runtime_integration_fail("SOURCE_PACKET_DIGEST_INVALID")
    return source_packet
def _direct_runtime_packet_materialization_entries_v1(
    source_packet: Any,
) -> list[dict[str, Any]]:
    """Returns exact detached packet identities allowed to materialize under the clean work root.

    @param source_packet The detached baseline Git-object source packet.
    @returns Sorted exact file identities for clean-work materialization.
    @throws core.ExecutionClosureValidationError When the detached packet is malformed.
    """
    baseline_read_set = source_packet.get("baselineReadSet") if isinstance(source_packet, dict) else None
    if not isinstance(baseline_read_set, list):
        _direct_runtime_integration_fail("MATERIALIZATION_PACKET_INVALID")
    packet = _direct_runtime_validate_source_packet_v1(source_packet, baseline_read_set)
    return [
        {key: identity[key] for key in ("path", "gitBlobSha1", "sha256", "size", "mode")}
        for identity in packet["baselineReadSet"]
    ]


def build_direct_command_runtime_packet_materialization_contract_v1(
    source_packet: dict[str, Any],
) -> dict[str, Any]:
    """Builds the exact clean-work materialization contract for one detached Git-object packet.

    @param source_packet The detached baseline Git-object source packet.
    @returns The hash-bound materialization contract for packet bytes copied into /work.
    @throws core.ExecutionClosureValidationError When packet provenance is incomplete.
    """
    entries = _direct_runtime_packet_materialization_entries_v1(source_packet)
    contract = {
        "schemaVersion": 1,
        "kind": "direct-command-runtime-detached-packet-materialization",
        "source": "DETACHED_GIT_OBJECT_PACKET_ONLY",
        "sourcePacketSha256": source_packet["packetSha256"],
        "targetRoot": "/work",
        "entries": entries,
        "liveWorktreeFallback": "REJECT",
        "realProbePolicy": "IN_CONTAINER_HASH_MODE_EXACT",
    }
    validate_direct_command_runtime_packet_materialization_contract_v1(contract)
    return contract


def validate_direct_command_runtime_packet_materialization_contract_v1(
    contract: dict[str, Any],
) -> None:
    """Validates the detached-packet materialization contract shape and exact safe entry identities.

    @param contract The claimed detached-packet materialization contract.
    @returns Nothing when the contract is safe, ordered, and hash-bound.
    @throws core.ExecutionClosureValidationError When a packet byte could escape or drift.
    """
    required = {
        "schemaVersion", "kind", "source", "sourcePacketSha256", "targetRoot", "entries",
        "liveWorktreeFallback", "realProbePolicy",
    }
    if not isinstance(contract, dict) or set(contract) != required:
        _direct_runtime_integration_fail("MATERIALIZATION_CONTRACT_INVALID")
    if (
        contract["schemaVersion"] != 1
        or contract["kind"] != "direct-command-runtime-detached-packet-materialization"
        or contract["source"] != "DETACHED_GIT_OBJECT_PACKET_ONLY"
        or contract["targetRoot"] != "/work"
        or contract["liveWorktreeFallback"] != "REJECT"
        or contract["realProbePolicy"] != "IN_CONTAINER_HASH_MODE_EXACT"
    ):
        _direct_runtime_integration_fail("MATERIALIZATION_CONTRACT_INVALID")
    packet_sha = contract["sourcePacketSha256"]
    if not isinstance(packet_sha, str) or re.fullmatch(r"[0-9a-f]{64}", packet_sha) is None or packet_sha == "0" * 64:
        _direct_runtime_integration_fail("MATERIALIZATION_CONTRACT_INVALID")
    entries = contract["entries"]
    if not isinstance(entries, list) or not entries:
        _direct_runtime_integration_fail("MATERIALIZATION_ENTRIES_INVALID")
    paths: list[str] = []
    for entry in entries:
        if not isinstance(entry, dict) or set(entry) != {"path", "gitBlobSha1", "sha256", "size", "mode"}:
            _direct_runtime_integration_fail("MATERIALIZATION_ENTRY_INVALID")
        path = entry["path"]
        if not isinstance(path, str) or _normal_path(path) != path:
            _direct_runtime_integration_fail("MATERIALIZATION_ENTRY_INVALID")
        if (
            not isinstance(entry["gitBlobSha1"], str)
            or re.fullmatch(r"[0-9a-f]{40}", entry["gitBlobSha1"]) is None
            or entry["gitBlobSha1"] == "0" * 40
            or not isinstance(entry["sha256"], str)
            or re.fullmatch(r"[0-9a-f]{64}", entry["sha256"]) is None
            or entry["sha256"] == "0" * 64
            or not isinstance(entry["size"], int)
            or isinstance(entry["size"], bool)
            or entry["size"] < 0
            or not isinstance(entry["mode"], str)
            or re.fullmatch(r"100[0-7]{3}", entry["mode"]) is None
        ):
            _direct_runtime_integration_fail("MATERIALIZATION_ENTRY_INVALID", path)
        paths.append(path)
    if paths != sorted(paths) or len(paths) != len(set(paths)):
        _direct_runtime_integration_fail("MATERIALIZATION_ENTRIES_INVALID")


def capture_direct_command_runtime_baseline_git_packet_v1(
    read_set: dict[str, Any],
) -> dict[str, Any]:
    """Captures selected runtime inputs directly from immutable Git objects, never worktree files.

    @param read_set The exact pre-execution runtime read set.
    @returns A detached packet containing tree-bound baseline Git blob bytes.
    @throws core.ExecutionClosureValidationError When Git object resolution or blob provenance drifts.
    """
    resource_budget = read_set.get("resourceBudget") if isinstance(read_set, dict) else None
    _direct_runtime_validate_read_set_shape_v1(read_set, resource_budget)
    baseline_read_set = copy.deepcopy(read_set["baselineReadSet"])
    baseline_commit = _direct_runtime_baseline_commit_v1(read_set)

    def git_object(argv: list[str], code: str) -> bytes:
        try:
            completed = subprocess.run(
                argv,
                cwd=TRACK_DIR,
                env={"LC_ALL": "C", "LANG": "C"},
                capture_output=True,
                check=False,
            )
        except OSError as error:
            _direct_runtime_integration_fail(code, str(error))
        if completed.returncode != 0:
            _direct_runtime_integration_fail(code, completed.stderr.decode("utf-8", errors="replace").strip())
        return completed.stdout

    tree = git_object(
        ["/usr/bin/git", "rev-parse", f"{baseline_commit}^{{tree}}"],
        "GIT_TREE_CAPTURE_FAILED",
    ).decode("ascii", errors="strict").strip()
    if re.fullmatch(r"[0-9a-f]{40}", tree) is None:
        _direct_runtime_integration_fail("GIT_TREE_CAPTURE_FAILED")
    objects: list[dict[str, Any]] = []
    for identity in baseline_read_set:
        path = identity["path"]
        object_name = f"{baseline_commit}:{path}"
        git_blob_sha1 = git_object(
            ["/usr/bin/git", "rev-parse", object_name],
            "GIT_OBJECT_RESOLUTION_FAILED",
        ).decode("ascii", errors="strict").strip()
        if git_blob_sha1 != identity["gitBlobSha1"]:
            _direct_runtime_integration_fail("GIT_BLOB_IDENTITY_MISMATCH", path)
        data = git_object(
            ["/usr/bin/git", "cat-file", "blob", git_blob_sha1],
            "GIT_OBJECT_BYTES_CAPTURE_FAILED",
        )
        blob = b"blob " + str(len(data)).encode("ascii") + b"\0" + data
        if (
            len(data) != identity["size"]
            or _sha256(data) != identity["sha256"]
            or hashlib.sha1(blob).hexdigest() != identity["gitBlobSha1"]
        ):
            _direct_runtime_integration_fail("GIT_OBJECT_BYTES_MISMATCH", path)
        objects.append({**identity, "contentBase64": base64.b64encode(data).decode("ascii")})
    packet = {
        "schemaVersion": 1,
        "kind": "direct-command-runtime-baseline-git-source-packet",
        "source": "GIT_OBJECT_DATABASE_ONLY",
        "baselineCommit": baseline_commit,
        "tree": {"gitTreeSha1": tree},
        "baselineReadSet": baseline_read_set,
        "objects": sorted(objects, key=lambda item: item["path"]),
    }
    packet["packetSha256"] = _direct_runtime_packet_digest_v1(packet)
    return _direct_runtime_validate_source_packet_v1(packet, baseline_read_set)


def _direct_runtime_attempt_state_v1(attempt: Any) -> dict[str, Any]:
    """Normalizes one preflight or post-trace runtime stage state.

    @param attempt The optional stage state supplied by the detached runner.
    @returns A canonical reached-stage record with all later stages explicitly not run.
    @throws core.ExecutionClosureValidationError When stage state is ambiguous or out of order.
    """
    if attempt is None:
        attempt = {}
    if not isinstance(attempt, dict) or not set(attempt) <= {
        "id",
        "nonceSha256",
        "reachedStage",
        "laterStages",
        "executionTrace",
    }:
        _direct_runtime_integration_fail("ATTEMPT_STATE_INVALID")
    identifier = attempt.get("id", "direct-runtime-detached-runner-v1")
    reached_stage = attempt.get("reachedStage", "direct-runtime-preflight")
    if not isinstance(identifier, str) or not identifier or reached_stage not in _DIRECT_RUNTIME_RUNNER_STAGES:
        _direct_runtime_integration_fail("ATTEMPT_STATE_INVALID")
    ordinal = _DIRECT_RUNTIME_RUNNER_STAGES.index(reached_stage)
    later_stages = [
        {"id": stage, "status": "NOT_RUN"}
        for stage in _DIRECT_RUNTIME_RUNNER_STAGES[ordinal + 1:]
    ]
    if "laterStages" in attempt and attempt["laterStages"] != later_stages:
        _direct_runtime_integration_fail("ATTEMPT_STATE_INVALID")
    execution_trace = attempt.get("executionTrace")
    if execution_trace is not None and reached_stage != "direct-runtime-trace":
        _direct_runtime_integration_fail("ATTEMPT_STATE_INVALID")
    if execution_trace is not None and not isinstance(execution_trace, dict):
        _direct_runtime_integration_fail("ATTEMPT_STATE_INVALID")
    nonce_sha256 = attempt.get("nonceSha256")
    if nonce_sha256 is not None and (
        not isinstance(nonce_sha256, str)
        or re.fullmatch(r"[0-9a-f]{64}", nonce_sha256) is None
    ):
        _direct_runtime_integration_fail("ATTEMPT_STATE_INVALID")
    state = {
        "id": identifier,
        "reachedStage": reached_stage,
        "laterStages": later_stages,
        "executionTrace": copy.deepcopy(execution_trace),
    }
    if nonce_sha256 is not None:
        state["nonceSha256"] = nonce_sha256
    return state


def build_direct_command_runtime_runner_integration_v1(
    read_set: dict[str, Any],
    source_packet: dict[str, Any],
    attempt: dict[str, Any] | None,
    resource_budget: dict[str, Any],
) -> dict[str, Any]:
    """Builds the detached source-packet, capacity, build-receipt, and trace integration seam.

    @param read_set The exact runtime read set accepted before candidate staging.
    @param source_packet The Git-object-only packet containing materializable baseline bytes.
    @param attempt The optional reached-stage and observed-trace state.
    @param resource_budget The detached capacity budget that must match the read set.
    @returns The immutable runtime integration contract used by the V3 transaction.
    @throws core.ExecutionClosureValidationError When baseline binding, capacity, or stage state drifts.
    """
    validated_read_set = _direct_runtime_validate_read_set_shape_v1(read_set, resource_budget)
    if resource_budget.get("frozenArchive") != _reference(core.V2_ARCHIVE):
        _direct_runtime_integration_fail("V2_BASELINE_UNBOUND")
    baseline_read_set = copy.deepcopy(validated_read_set["baselineReadSet"])
    validated_packet = _direct_runtime_validate_source_packet_v1(source_packet, baseline_read_set)
    read_set_contract = build_direct_command_runtime_read_set_contract_v1(validated_read_set, resource_budget)
    attempt_state = _direct_runtime_attempt_state_v1(attempt)
    nonce = _sha256(_canonical({
        "readSetContract": read_set_contract,
        "sourcePacketSha256": validated_packet["packetSha256"],
    }))
    max_events = len(baseline_read_set) + len(validated_read_set["derivedBuildReadSet"]) + len(validated_read_set["outputPaths"])
    if max_events <= 0:
        _direct_runtime_integration_fail("TRACE_EVENT_CAP_INVALID")
    generator_script = validated_read_set["discovery"]["script"]["path"]
    generator_resolved_path = f"/work/{generator_script}"
    integration = {
        "schemaVersion": 1,
        "kind": "direct-command-runtime-runner-integration",
        "readSet": copy.deepcopy(validated_read_set),
        "readSetContract": read_set_contract,
        "sourcePacket": copy.deepcopy(validated_packet),
        "packetMaterialization": build_direct_command_runtime_packet_materialization_contract_v1(
            validated_packet,
        ),
        "resourceBudget": copy.deepcopy(resource_budget),
        "stagePlan": list(_DIRECT_RUNTIME_RUNNER_STAGES),
        "apkRuntimeBuild": {
            "stage": "build-advantage-play-kit-for-runtime",
            "derivedBuildReadSet": copy.deepcopy(validated_read_set["derivedBuildReadSet"]),
            "receiptIdentityPolicy": "EXACT_PRODUCER_RECEIPT_FOR_EACH_DERIVED_DIST_READ",
        },
        "tracePolicy": {
            "evidence": "IN_CONTAINER_TRACER_RAW_ARTIFACT_ONLY",
            "nonce": nonce,
            "maxEvents": max_events,
            "truncation": "REJECT",
            "duplicates": "REJECT",
            "rawEventArtifact": "direct-runtime-raw-events.jsonl",
            "tracer": "direct-runtime-tracer",
            "generatorScript": generator_script,
            "generatorResolvedPath": generator_resolved_path,
            "nodeOptions": DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS,
            "activation": "INHERITED_NODE_OPTIONS_EXACT_GENERATOR_SCRIPT_ONLY",
            "parentPnpm": "PNPM_PARENT_EXCLUDED",
        },
        "attempt": attempt_state,
    }
    trace = attempt_state["executionTrace"]
    if trace is not None:
        validate_direct_command_runtime_execution_trace_v1(read_set_contract, trace)
    return integration


def validate_direct_command_runtime_runner_integration_v1(integration: dict[str, Any]) -> None:
    """Validates a detached runtime integration and any completed exact execution trace.

    @param integration The claimed runner integration contract.
    @returns Nothing when packet, stages, receipt provenance, and trace state are exact.
    @throws core.ExecutionClosureValidationError When a runtime source or later stage is unbound.
    """
    if not isinstance(integration, dict):
        _direct_runtime_integration_fail("INTEGRATION_INVALID")
    required = {
        "schemaVersion",
        "kind",
        "readSet",
        "packetMaterialization",
        "readSetContract",
        "sourcePacket",
        "resourceBudget",
        "stagePlan",
        "apkRuntimeBuild",
        "tracePolicy",
        "attempt",
    }
    if set(integration) != required:
        _direct_runtime_integration_fail("INTEGRATION_INVALID")
    if integration["schemaVersion"] != 1 or integration["kind"] != "direct-command-runtime-runner-integration":
        _direct_runtime_integration_fail("INTEGRATION_INVALID")
    expected = build_direct_command_runtime_runner_integration_v1(
        integration["readSet"],
        integration["sourcePacket"],
        integration["attempt"],
        integration["resourceBudget"],
    )
    if integration != expected:
        _direct_runtime_integration_fail("INTEGRATION_INVALID")
    if integration["stagePlan"] != list(_DIRECT_RUNTIME_RUNNER_STAGES):
        _direct_runtime_integration_fail("STAGE_PLAN_INVALID")
    apk_runtime_build = integration["apkRuntimeBuild"]
    if (
        not isinstance(apk_runtime_build, dict)
        or apk_runtime_build.get("stage") != "build-advantage-play-kit-for-runtime"
        or apk_runtime_build.get("derivedBuildReadSet") != integration["readSet"]["derivedBuildReadSet"]
        or apk_runtime_build.get("receiptIdentityPolicy") != "EXACT_PRODUCER_RECEIPT_FOR_EACH_DERIVED_DIST_READ"
    ):
        _direct_runtime_integration_fail("APK_BUILD_RECEIPT_INVALID")
    if any(item.get("origin") != "DERIVED_BUILD_OUTPUT" for item in apk_runtime_build["derivedBuildReadSet"]):
        _direct_runtime_integration_fail("APK_BUILD_RECEIPT_INVALID")
    attempt = integration["attempt"]
    trace = attempt["executionTrace"]
    if trace is None:
        if not any(stage == {"id": "direct-runtime-trace", "status": "NOT_RUN"} for stage in attempt["laterStages"]):
            _direct_runtime_integration_fail("TRACE_STAGE_STATE_INVALID")
        return
    validate_direct_command_runtime_execution_trace_v1(integration["readSetContract"], trace)


def parse_direct_command_runtime_trace_events_v1(
    events: list[dict[str, Any]] | dict[str, Any],
    integration: dict[str, Any],
) -> dict[str, Any]:
    """Parses nonce-bound runtime access events into the exact read-set trace contract.

    @param events The bounded instrumented event envelope or event list.
    @param integration The validated detached runtime integration contract.
    @returns The exact baseline-read, derived-read, and write trace.
    @throws core.ExecutionClosureValidationError When events are truncated, duplicated, or unbound.
    """
    validate_direct_command_runtime_runner_integration_v1(integration)
    trace_policy = integration["tracePolicy"]
    nonce = trace_policy["nonce"]
    maxEvents = trace_policy["maxEvents"]
    rows: Any = events
    if isinstance(events, dict):
        allowed = {"schemaVersion", "kind", "nonce", "events", "truncated"}
        if (
            not set(events) <= allowed
            or events.get("nonce") != nonce
            or events.get("truncated") is True
            or not isinstance(events.get("events"), list)
        ):
            _direct_runtime_integration_fail("TRACE_TRUNCATED")
        rows = events["events"]
    if not isinstance(rows, list) or len(rows) > maxEvents:
        _direct_runtime_integration_fail("TRACE_TRUNCATED")
    baseline_reads: list[dict[str, Any]] = []
    derived_reads: list[dict[str, Any]] = []
    writes: list[dict[str, Any]] = []
    seen_ordinals: set[int] = set()
    seen_accesses: set[tuple[str, str]] = set()
    event_kinds = {
        "BASELINE_READ": baseline_reads,
        "DERIVED_BUILD_READ": derived_reads,
        "WRITE": writes,
    }
    for expected_ordinal, event in enumerate(rows):
        if not isinstance(event, dict) or set(event) != {"nonce", "ordinal", "kind", "value"}:
            _direct_runtime_integration_fail("TRACE_EVENT_INVALID")
        if event["nonce"] != nonce or event["ordinal"] != expected_ordinal or event["ordinal"] in seen_ordinals:
            _direct_runtime_integration_fail("TRACE_DUPLICATE")
        target = event_kinds.get(event["kind"])
        value = event["value"]
        if target is None or not isinstance(value, dict) or not isinstance(value.get("path"), str):
            _direct_runtime_integration_fail("TRACE_EVENT_INVALID")
        key = (event["kind"], value["path"])
        if key in seen_accesses:
            _direct_runtime_integration_fail("TRACE_DUPLICATE")
        seen_ordinals.add(event["ordinal"])
        seen_accesses.add(key)
        target.append(copy.deepcopy(value))
    trace = {
        "baselineReads": baseline_reads,
        "derivedBuildReads": derived_reads,
        "writes": writes,
    }
    validate_direct_command_runtime_execution_trace_v1(integration["readSetContract"], trace)
    return trace


def capture_direct_command_runtime_in_container_trace_v1(
    raw_trace_receipt: dict[str, Any],
    integration: dict[str, Any],
) -> dict[str, Any]:
    """Normalizes only nonce-bound raw evidence emitted by the in-container ESM tracer.

    @param raw_trace_receipt The post-generator raw-artifact receipt emitted inside the candidate container.
    @param integration The validated detached runtime integration contract.
    @returns The bounded event envelope accepted by the exact trace parser.
    @throws core.ExecutionClosureValidationError When trace evidence is caller-supplied, truncated, or unbound.
    """
    validate_direct_command_runtime_runner_integration_v1(integration)
    policy = integration["tracePolicy"]
    required = {
        "schemaVersion",
        "kind",
        "evidence",
        "tracer",
        "rawEventArtifact",
        "nonce",
        "packetSha256",
        "generatorPid",
        "generatorScript",
        "truncated",
        "events",
        "rawArtifact",
    }
    if not isinstance(raw_trace_receipt, dict) or set(raw_trace_receipt) != required:
        _direct_runtime_integration_fail("IN_CONTAINER_TRACE_RECEIPT_INVALID")
    if (
        raw_trace_receipt["schemaVersion"] != 1
        or raw_trace_receipt["kind"] != "direct-command-runtime-in-container-trace-receipt"
        or raw_trace_receipt["evidence"] != "IN_CONTAINER_TRACER_RAW_ARTIFACT_ONLY"
        or raw_trace_receipt["evidence"] != policy["evidence"]
        or raw_trace_receipt["tracer"] != "direct-runtime-tracer"
        or raw_trace_receipt["tracer"] != policy["tracer"]
        or raw_trace_receipt["rawEventArtifact"] != policy["rawEventArtifact"]
        or raw_trace_receipt["nonce"] != policy["nonce"]
        or raw_trace_receipt["packetSha256"] != integration["sourcePacket"]["packetSha256"]
        or raw_trace_receipt["generatorScript"] != policy["generatorResolvedPath"]
        or not isinstance(raw_trace_receipt["generatorPid"], int)
        or isinstance(raw_trace_receipt["generatorPid"], bool)
        or raw_trace_receipt["generatorPid"] <= 0
        or policy["activation"] != "INHERITED_NODE_OPTIONS_EXACT_GENERATOR_SCRIPT_ONLY"
        or policy["parentPnpm"] != "PNPM_PARENT_EXCLUDED"
        or raw_trace_receipt["truncated"] is not False
    ):
        _direct_runtime_integration_fail("IN_CONTAINER_TRACE_RECEIPT_INVALID")
    raw_artifact = raw_trace_receipt["rawArtifact"]
    if (
        not isinstance(raw_artifact, dict)
        or set(raw_artifact) != {"sha256", "size"}
        or not isinstance(raw_artifact["sha256"], str)
        or re.fullmatch(r"[0-9a-f]{64}", raw_artifact["sha256"]) is None
        or not isinstance(raw_artifact["size"], int)
        or isinstance(raw_artifact["size"], bool)
        or raw_artifact["size"] < 0
    ):
        _direct_runtime_integration_fail("IN_CONTAINER_TRACE_ARTIFACT_INVALID")
    raw_events = raw_trace_receipt["events"]
    if not isinstance(raw_events, list) or len(raw_events) > policy["maxEvents"]:
        _direct_runtime_integration_fail("IN_CONTAINER_TRACE_TRUNCATED")
    normalized_events: list[dict[str, Any]] = []
    for event in raw_events:
        if not isinstance(event, dict) or set(event) != {
            "nonce", "ordinal", "kind", "value", "tracer", "packetSha256", "rawEventArtifact",
            "generatorPid", "generatorScript",
        }:
            _direct_runtime_integration_fail("IN_CONTAINER_TRACE_EVENT_INVALID")
        if (
            event["nonce"] != policy["nonce"]
            or event["tracer"] != "direct-runtime-tracer"
            or event["packetSha256"] != integration["sourcePacket"]["packetSha256"]
            or event["rawEventArtifact"] != policy["rawEventArtifact"]
            or event["generatorPid"] != raw_trace_receipt["generatorPid"]
            or event["generatorScript"] != policy["generatorResolvedPath"]
        ):
            _direct_runtime_integration_fail("IN_CONTAINER_TRACE_EVENT_INVALID")
        normalized_events.append({
            "nonce": event["nonce"],
            "ordinal": event["ordinal"],
            "kind": event["kind"],
            "value": copy.deepcopy(event["value"]),
        })
    return {
        "schemaVersion": 1,
        "kind": "direct-command-runtime-trace-events",
        "nonce": policy["nonce"],
        "events": normalized_events,
        "truncated": False,
    }


def _validate_direct_runtime_apk_build_receipt_v1(
    integration: dict[str, Any],
    commands: list[dict[str, Any]],
) -> None:
    """Binds every derived dist read to the successful advantage-play-kit prerequisite receipt.

    @param integration The validated detached runtime integration contract.
    @param commands The completed staged command receipts.
    @returns Nothing when the prerequisite build receipt is present and successful.
    @throws core.ExecutionClosureValidationError When a required build receipt is absent or failed.
    """
    validate_direct_command_runtime_runner_integration_v1(integration)
    build = next(
        (
            command
            for command in commands
            if isinstance(command, dict)
            and command.get("id") == "build-advantage-play-kit-for-runtime"
        ),
        None,
    )
    if not isinstance(build, dict) or build.get("exitCode") != 0:
        _direct_runtime_integration_fail("APK_BUILD_RECEIPT_MISSING")
    expected_argv = ["pnpm", "build"]
    if build.get("argv") != expected_argv:
        _direct_runtime_integration_fail("APK_BUILD_RECEIPT_IDENTITY_INVALID")
    for derived in integration["apkRuntimeBuild"]["derivedBuildReadSet"]:
        producer = derived.get("producer") if isinstance(derived, dict) else None
        if (
            derived.get("origin") != "DERIVED_BUILD_OUTPUT"
            or not isinstance(producer, dict)
            or producer.get("receipt") is None
        ):
            _direct_runtime_integration_fail("APK_BUILD_RECEIPT_INVALID")


def _validate_direct_runtime_post_generator_dist_identity_v1(
    integration: dict[str, Any],
    command: dict[str, Any],
) -> None:
    """Validates the post-generator bytes for every receipt-bound derived runtime read.

    @param integration The validated detached runtime integration contract.
    @param command The recorded post-generator identity command.
    @returns Nothing when generated dist bytes match the frozen runtime read set.
    @throws core.ExecutionClosureValidationError When generator-visible derived bytes drift.
    """
    validate_direct_command_runtime_runner_integration_v1(integration)
    expected = [
        {key: item[key] for key in ("path", "sha256", "size")}
        for item in integration["apkRuntimeBuild"]["derivedBuildReadSet"]
    ]
    observation = command.get("directRuntimeDistIdentity")
    rows = (
        observation.get("derivedBuildReadSet")
        if isinstance(observation, dict)
        else None
    )
    attempt_nonce_sha256 = integration.get("attempt", {}).get("nonceSha256")
    if (
        command.get("id") != "direct-runtime-dist-identity-post-generator"
        or command.get("argv") != ["node", "direct-runtime-dist-identity-post-generator"]
        or command.get("exitCode") != 0
        or not isinstance(observation, dict)
        or set(observation)
        != {"attemptNonceSha256", "derivedBuildReadSet", "workRoot"}
        or not isinstance(rows, list)
        or not isinstance(attempt_nonce_sha256, str)
        or re.fullmatch(r"[0-9a-f]{64}", attempt_nonce_sha256) is None
        or observation.get("attemptNonceSha256") != attempt_nonce_sha256
        or observation.get("workRoot") != "/work"
        or [row.get("path") if isinstance(row, dict) else None for row in rows]
        != [item["path"] for item in expected]
        or any(
            not isinstance(row, dict)
            or set(row) != {"mode", "path", "resolvedPath", "sha256", "size"}
            or row.get("resolvedPath") != f"/work/{expected_row['path']}"
            or not isinstance(row.get("mode"), str)
            or re.fullmatch(r"100[0-7]{3}", row["mode"]) is None
            or row.get("sha256") != expected_row["sha256"]
            or row.get("size") != expected_row["size"]
            for row, expected_row in zip(rows, expected)
        )
    ):
        _direct_runtime_integration_fail("POST_GENERATOR_DIST_IDENTITY_INVALID")
_WORKSPACE_SOURCE_SUFFIXES = {".cjs", ".cts", ".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"}
_WORKSPACE_STATIC_IMPORT_RE = re.compile(
    r"""(?ms)^[ \t]*(?:import|export)\s+(?:type\s+)?(?:(?:(?!;).)*?\s+from\s+)?["'](?P<specifier>[^"']+)["']"""
)
_WORKSPACE_STATIC_REQUIRE_RE = re.compile(
    r"""\brequire\s*\(\s*["'](?P<specifier>[^"']+)["']\s*\)"""
)
_WORKSPACE_DYNAMIC_IMPORT_RE = re.compile(
    r"""\bimport\s*\(\s*["'](?P<specifier>[^"']+)["']\s*\)"""
)


def _workspace_dag_fail(code: str, detail: str = "") -> None:
    """Raises one stable frozen-workspace-DAG validation failure.

    @param code The invariant-specific suffix.
    @param detail Optional context for the failed invariant.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError Always.
    """
    _fail(f"V3_WORKSPACE_BUILD_DAG_{code}", detail)


def _workspace_frozen_entry_index_v1(frozen_entries: Any) -> dict[str, dict[str, Any]]:
    """Indexes unique normalized frozen archive entries for workspace-DAG derivation.

    @param frozen_entries The immutable V2 or V3 archive entries.
    @returns Frozen entries keyed by normalized workspace-relative path.
    @throws core.ExecutionClosureValidationError When the archive is malformed or ambiguous.
    """
    if not isinstance(frozen_entries, list):
        _workspace_dag_fail("FROZEN_ENTRIES_INVALID")
    index: dict[str, dict[str, Any]] = {}
    for entry in frozen_entries:
        if not isinstance(entry, dict) or not isinstance(entry.get("path"), str):
            _workspace_dag_fail("FROZEN_ENTRY_INVALID")
        path = entry["path"]
        try:
            normalized = _normal_path(path)
        except core.ExecutionClosureValidationError:
            _workspace_dag_fail("FROZEN_ENTRY_PATH_INVALID", path)
        if path != normalized or normalized in index:
            _workspace_dag_fail("FROZEN_ENTRY_PATH_INVALID", path)
        index[normalized] = entry
    if not index:
        _workspace_dag_fail("FROZEN_ENTRIES_INVALID")
    return index


def _workspace_frozen_file_bytes_v1(entry: Any, path: str) -> bytes:
    """Returns validated bytes for one frozen regular source file.

    @param entry The frozen archive entry.
    @param path The expected logical source path.
    @returns The exact hash-bound source bytes.
    @throws core.ExecutionClosureValidationError When content or metadata is unsafe.
    """
    if (
        not isinstance(entry, dict)
        or entry.get("path") != path
        or entry.get("kind") != "file"
        or not isinstance(entry.get("contentBase64"), str)
        or not isinstance(entry.get("sha256"), str)
        or not re.fullmatch(r"[0-9a-f]{64}", entry["sha256"])
        or not isinstance(entry.get("size"), int)
        or isinstance(entry["size"], bool)
        or entry["size"] < 0
    ):
        _workspace_dag_fail("FROZEN_FILE_INVALID", path)
    try:
        data = base64.b64decode(entry["contentBase64"], validate=True)
    except (ValueError, TypeError):
        _workspace_dag_fail("FROZEN_FILE_INVALID", path)
    if len(data) != entry["size"] or _sha256(data) != entry["sha256"]:
        _workspace_dag_fail("FROZEN_FILE_INVALID", path)
    return data


def _workspace_frozen_reference_v1(entry: Any, path: str) -> dict[str, Any]:
    """Returns one exact frozen file reference after validating its bytes.

    @param entry The frozen archive entry.
    @param path The expected workspace-relative path.
    @returns The path, digest, and size reference.
    @throws core.ExecutionClosureValidationError When the entry cannot bind source provenance.
    """
    _workspace_frozen_file_bytes_v1(entry, path)
    return {key: entry[key] for key in ("path", "sha256", "size")}


def _workspace_parse_json_file_v1(index: dict[str, dict[str, Any]], path: str) -> dict[str, Any]:
    """Parses one frozen JSON object without accepting non-object manifests.

    @param index The frozen-entry index.
    @param path The required JSON path.
    @returns The decoded JSON object.
    @throws core.ExecutionClosureValidationError When JSON is absent, malformed, or not an object.
    """
    entry = index.get(path)
    if entry is None:
        _workspace_dag_fail("FROZEN_FILE_MISSING", path)
    try:
        value = json.loads(_workspace_frozen_file_bytes_v1(entry, path).decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        _workspace_dag_fail("JSON_INVALID", path)
    if not isinstance(value, dict):
        _workspace_dag_fail("JSON_INVALID", path)
    return value


def _workspace_package_records_v1(index: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Discovers unique package manifests from frozen workspace sources.

    @param index The complete normalized frozen-entry index.
    @returns Package records keyed by their declared package names.
    @throws core.ExecutionClosureValidationError When package identity is absent or duplicated.
    """
    records: dict[str, dict[str, Any]] = {}
    for path in sorted(index):
        parts = PurePosixPath(path).parts
        if PurePosixPath(path).name != "package.json" or not set(parts).isdisjoint(DERIVED_PARTS) or not parts or parts[0] not in {"apps", "packages", "services"} or any(part.startswith(".") for part in parts[:-1]):
            continue
        manifest = _workspace_parse_json_file_v1(index, path)
        name = manifest.get("name")
        if not isinstance(name, str) or not name or name in records:
            _workspace_dag_fail("PACKAGE_MANIFEST_INVALID", path)
        directory = str(PurePosixPath(path).parent)
        if directory in {"", "."}:
            _workspace_dag_fail("PACKAGE_MANIFEST_INVALID", path)
        records[name] = {
            "directory": directory,
            "manifest": manifest,
            "manifestEntry": index[path],
            "manifestPath": path,
        }
    if not records:
        _workspace_dag_fail("PACKAGE_MANIFESTS_MISSING")
    return records


def _workspace_package_source_entries_v1(index: dict[str, dict[str, Any]], directory: str) -> list[dict[str, Any]]:
    """Returns all non-derived frozen entries owned by one package directory.

    @param index The complete normalized frozen-entry index.
    @param directory The package directory relative to the workspace root.
    @returns Sorted source entries that bind the package build input inventory.
    @throws core.ExecutionClosureValidationError When a package has no frozen source entries.
    """
    prefix = f"{directory}/"
    entries = [
        entry
        for path, entry in sorted(index.items())
        if path.startswith(prefix) and set(PurePosixPath(path).parts).isdisjoint(DERIVED_PARTS)
    ]
    if not entries:
        _workspace_dag_fail("PACKAGE_SOURCE_MISSING", directory)
    return entries


def _workspace_is_build_source_path_v1(path: str) -> bool:
    """Returns whether one frozen package path can contain a build-time import statement.

    @param path The workspace-relative source path.
    @returns Whether the path is a non-test JavaScript or TypeScript source file.
    """
    pure = PurePosixPath(path)
    name = pure.name
    return (
        pure.suffix in _WORKSPACE_SOURCE_SUFFIXES
        and "__tests__" not in pure.parts
        and ".test." not in name
        and ".spec." not in name
    )


def _workspace_static_import_specifiers_v1(data: bytes, path: str) -> list[str]:
    """Extracts static import/export module specifiers from one frozen source file.

    @param data The validated frozen source bytes.
    @param path The source path used in diagnostic context.
    @returns Static module specifiers in deterministic source order.
    @throws core.ExecutionClosureValidationError When source text is not UTF-8.
    """
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        _workspace_dag_fail("SOURCE_TEXT_INVALID", path)
    return [
        match.group("specifier")
        for matcher in (_WORKSPACE_STATIC_IMPORT_RE, _WORKSPACE_STATIC_REQUIRE_RE)
        for match in matcher.finditer(text)
    ]


def _workspace_declared_dependency_v1(manifest: dict[str, Any], provider: str, path: str) -> dict[str, str]:
    """Finds one runtime workspace declaration for a static provider import.

    @param manifest The frozen consumer package manifest.
    @param provider The imported workspace package name.
    @param path The consumer manifest path for diagnostics.
    @returns The declaration field and exact workspace specifier.
    @throws core.ExecutionClosureValidationError When the import is undeclared or not workspace-bound.
    """
    for field in ("dependencies", "optionalDependencies"):
        values = manifest.get(field)
        if values is None:
            continue
        if not isinstance(values, dict):
            _workspace_dag_fail("DEPENDENCY_DECLARATION_INVALID", path)
        if provider not in values:
            continue
        specifier = values[provider]
        if not isinstance(specifier, str) or not specifier.startswith("workspace:") or len(specifier) == len("workspace:"):
            _workspace_dag_fail("DEPENDENCY_DECLARATION_INVALID", f"{path}: {provider}")
        return {"field": field, "specifier": specifier}
    _workspace_dag_fail("UNDECLARED_WORKSPACE_IMPORT", f"{path}: {provider}")


def _workspace_safe_output_target_v1(directory: str, value: Any, path: str) -> str:
    """Converts one package-relative declared export target into a safe workspace path.

    @param directory The owning package directory.
    @param value The manifest target value.
    @param path The manifest path for diagnostics.
    @returns The normalized workspace-relative output target.
    @throws core.ExecutionClosureValidationError When a target is dynamic or escapes its package.
    """
    if not isinstance(value, str) or not value.startswith("./") or value == "./":
        _workspace_dag_fail("EXPORT_TARGET_INVALID", path)
    relative = value[2:]
    parts = PurePosixPath(relative).parts
    if not parts or any(part in {"", ".", ".."} for part in parts) or "node_modules" in parts:
        _workspace_dag_fail("EXPORT_TARGET_INVALID", path)
    return f"{directory}/{PurePosixPath(relative).as_posix()}"


def _workspace_export_targets_v1(value: Any, directory: str, path: str) -> list[str]:
    """Returns every safe leaf target declared by an exports field.

    @param value The manifest exports value.
    @param directory The owning package directory.
    @param path The manifest path for diagnostics.
    @returns Deduplicated normalized workspace output targets.
    @throws core.ExecutionClosureValidationError When exports are malformed or ambiguous.
    """
    targets: list[str] = []

    def visit(current: Any) -> None:
        if isinstance(current, str):
            targets.append(_workspace_safe_output_target_v1(directory, current, path))
            return
        if not isinstance(current, dict) or not current:
            _workspace_dag_fail("EXPORTS_INVALID", path)
        for key in sorted(current):
            if not isinstance(key, str) or not key:
                _workspace_dag_fail("EXPORTS_INVALID", path)
            visit(current[key])

    visit(value)
    return sorted(set(targets))

def _workspace_package_build_record_v1(
    package: str,
    record: dict[str, Any],
    index: dict[str, dict[str, Any]],
) -> tuple[dict[str, Any], list[str]]:
    """Builds one hash-bound provider package record and its declared output targets.

    @param package The frozen provider package name.
    @param record The discovered provider manifest record.
    @param index The complete frozen-entry index.
    @returns The public provider contract record and sorted declared output targets.
    @throws core.ExecutionClosureValidationError When build metadata is incomplete or unsafe.
    """
    directory = record["directory"]
    manifest = record["manifest"]
    manifest_path = record["manifestPath"]
    scripts = manifest.get("scripts")
    if not isinstance(scripts, dict) or not isinstance(scripts.get("build"), str) or not scripts["build"].strip():
        _workspace_dag_fail("PACKAGE_BUILD_MISSING", f"{package}: {manifest_path}")
    types = manifest.get("types")
    if not isinstance(types, str):
        _workspace_dag_fail("TYPES_INVALID", manifest_path)
    exports = manifest.get("exports")
    if not isinstance(exports, (str, dict)):
        _workspace_dag_fail("EXPORTS_INVALID", manifest_path)
    target_values = [types]
    for field in ("main", "module"):
        target = manifest.get(field)
        if target is not None:
            target_values.append(target)
    targets = {_workspace_safe_output_target_v1(directory, target, manifest_path) for target in target_values}
    targets.update(_workspace_export_targets_v1(exports, directory, manifest_path))
    tsconfig_path = f"{directory}/tsconfig.json"
    tsconfig_entry = index.get(tsconfig_path)
    if tsconfig_entry is None:
        _workspace_dag_fail("TSCONFIG_MISSING", tsconfig_path)
    _workspace_parse_json_file_v1(index, tsconfig_path)
    source_entries = _workspace_package_source_entries_v1(index, directory)
    value: dict[str, Any] = {
        "manifest": _workspace_frozen_reference_v1(record["manifestEntry"], manifest_path),
        "build": {"field": "scripts.build", "value": scripts["build"]},
        "types": types,
        "exports": copy.deepcopy(exports),
        "tsconfig": _workspace_frozen_reference_v1(tsconfig_entry, tsconfig_path),
        "sourceInventory": _archive_inventory(source_entries),
        "declaredExportTargets": sorted(targets),
    }
    for field in ("main", "module"):
        if field in manifest:
            value[field] = manifest[field]
    return value, sorted(targets)


def _workspace_trigger_package_v1(trigger: Any, records: dict[str, dict[str, Any]]) -> str:
    """Finds the unique frozen workspace package selected by one pnpm trigger argv.

    @param trigger The unchanged logical pnpm trigger argv.
    @param records The frozen package records keyed by package name.
    @returns The selected trigger package name.
    @throws core.ExecutionClosureValidationError When trigger selection is ambiguous or unresolved.
    """
    if not isinstance(trigger, list) or not trigger or not all(isinstance(part, str) and part for part in trigger):
        _workspace_dag_fail("TRIGGER_INVALID")
    filters = [index for index, part in enumerate(trigger) if part == "--filter"]
    if trigger[0] != "pnpm" or len(filters) != 1 or filters[0] + 2 >= len(trigger):
        _workspace_dag_fail("TRIGGER_INVALID")
    package = trigger[filters[0] + 1]
    if package.startswith("-") or package not in records:
        _workspace_dag_fail("TRIGGER_PACKAGE_UNRESOLVED", package)
    return package


def _workspace_package_name_from_specifier_v1(specifier: str) -> str | None:
    """Normalizes a package root from one static module specifier.

    @param specifier The static module specifier.
    @returns The package name without an export subpath, if one is present.
    """
    if not specifier or specifier.startswith(".") or specifier.startswith("/"):
        return None
    parts = specifier.split("/")
    if specifier.startswith("@"):
        if len(parts) < 2 or not parts[0] or not parts[1]:
            return None
        return f"{parts[0]}/{parts[1]}"
    return parts[0] if parts[0] else None


def _workspace_static_dependency_sites_v1(
    package: str,
    record: dict[str, Any],
    index: dict[str, dict[str, Any]],
    records: dict[str, dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    """Finds declared static workspace imports for one frozen package build input.

    @param package The consumer package name.
    @param record The consumer manifest record.
    @param index The complete frozen-entry index.
    @param records All frozen package records.
    @returns Provider names mapped to sorted hash-bound source import sites.
    @throws core.ExecutionClosureValidationError When a workspace import is undeclared or unresolved.
    """
    manifest = record["manifest"]
    manifest_path = record["manifestPath"]
    sites: dict[str, dict[str, dict[str, Any]]] = {}
    for entry in _workspace_package_source_entries_v1(index, record["directory"]):
        path = entry["path"]
        if not _workspace_is_build_source_path_v1(path):
            continue
        data = _workspace_frozen_file_bytes_v1(entry, path)
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            _workspace_dag_fail("SOURCE_TEXT_INVALID", path)
        for match in _WORKSPACE_DYNAMIC_IMPORT_RE.finditer(text):
            specifier = match.group("specifier")
            candidate = _workspace_package_name_from_specifier_v1(specifier)
            declared_workspace = any(
                isinstance(record, dict)
                and isinstance(record.get(candidate), str)
                and record[candidate].startswith("workspace:")
                for record in (
                    manifest.get("dependencies"),
                    manifest.get("optionalDependencies"),
                )
            )
            if candidate is not None and (candidate in records or declared_workspace):
                _workspace_dag_fail("DYNAMIC_WORKSPACE_IMPORT", f"{path}: {specifier}")
        for specifier in _workspace_static_import_specifiers_v1(data, path):
            candidate = _workspace_package_name_from_specifier_v1(specifier)
            if candidate is None or candidate == package:
                continue
            declared_workspace = False
            for field in ("dependencies", "optionalDependencies"):
                values = manifest.get(field)
                if isinstance(values, dict) and isinstance(values.get(candidate), str) and values[candidate].startswith("workspace:"):
                    declared_workspace = True
                    break
            if candidate not in records:
                if declared_workspace:
                    _workspace_dag_fail("PROVIDER_UNRESOLVED", f"{manifest_path}: {candidate}")
                continue
            _workspace_declared_dependency_v1(manifest, candidate, manifest_path)
            sites.setdefault(candidate, {})[path] = _workspace_frozen_reference_v1(entry, path)
    return {provider: [values[path] for path in sorted(values)] for provider, values in sorted(sites.items())}


def _workspace_installed_link_v1(consumer_directory: str, provider_directory: str, provider: str) -> dict[str, str]:
    """Builds the expected post-install workspace symlink provenance for one dependency edge.

    @param consumer_directory The consumer package directory.
    @param provider_directory The provider package directory.
    @param provider The provider package name.
    @returns The logical link path, symlink target, and normalized realpath.
    """
    path = f"{consumer_directory}/node_modules/{provider}"
    target = posixpath.relpath(provider_directory, posixpath.dirname(path))
    return {
        "path": path,
        "kind": "symlink",
        "target": target,
        "realpath": provider_directory,
    }


def build_workspace_prerequisite_build_dag_contract_v1(
    frozen_entries: list[dict[str, Any]],
    trigger: list[str],
) -> dict[str, Any]:
    """Derives a closure-only topological workspace build DAG from frozen source metadata.

    @param frozen_entries The immutable V2 or V3 archive entries.
    @param trigger The unchanged logical pnpm command that requires built workspace exports.
    @returns The complete frozen-input workspace prerequisite build contract.
    @throws core.ExecutionClosureValidationError When imports, manifests, outputs, or graph ordering drift.
    """
    index = _workspace_frozen_entry_index_v1(frozen_entries)
    records = _workspace_package_records_v1(index)
    trigger_package = _workspace_trigger_package_v1(trigger, records)
    packages: dict[str, dict[str, Any]] = {}
    output_targets: dict[str, list[str]] = {}
    dependencies: list[dict[str, Any]] = []
    topological_order: list[str] = []
    active: set[str] = set()
    complete: set[str] = set()

    def visit(consumer: str) -> None:
        if consumer in active:
            _workspace_dag_fail("CYCLE_DETECTED", consumer)
        if consumer in complete:
            return
        record = records.get(consumer)
        if record is None:
            _workspace_dag_fail("PROVIDER_UNRESOLVED", consumer)
        active.add(consumer)
        for provider, import_sites in _workspace_static_dependency_sites_v1(consumer, record, index, records).items():
            if provider in active:
                _workspace_dag_fail("CYCLE_DETECTED", f"{consumer}: {provider}")
            visit(provider)
            provider_record = records[provider]
            provider_contract = packages.get(provider)
            declared_outputs = output_targets.get(provider)
            if provider_contract is None or declared_outputs is None:
                _workspace_dag_fail("PROVIDER_BUILD_INVALID", provider)
            missing_targets = [target for target in declared_outputs if target not in index]
            if len(missing_targets) != len(declared_outputs):
                _workspace_dag_fail("DECLARED_EXPORT_TARGET_PRESENT", provider)
            link = _workspace_installed_link_v1(record["directory"], provider_record["directory"], provider)
            dependencies.append({
                "consumer": consumer,
                "provider": provider,
                "declaredDependency": _workspace_declared_dependency_v1(
                    record["manifest"],
                    provider,
                    record["manifestPath"],
                ),
                "importSites": import_sites,
                "installedLink": link,
                "installedResolution": {
                    "consumer": consumer,
                    "provider": provider,
                    "installedLink": copy.deepcopy(link),
                    "beforePrerequisiteBuild": "MISSING_DECLARED_EXPORT_TARGETS",
                    "missingTargets": missing_targets,
                },
            })
        active.remove(consumer)
        complete.add(consumer)
        if consumer != trigger_package:
            package_contract, targets = _workspace_package_build_record_v1(consumer, record, index)
            packages[consumer] = package_contract
            output_targets[consumer] = targets
            topological_order.append(consumer)

    visit(trigger_package)
    topological_builds = [
        {"package": package, "logicalArgv": ["pnpm", "--filter", package, "build"]}
        for package in topological_order
    ]
    return {
        "schemaVersion": 1,
        "kind": "workspace-prerequisite-build-dag",
        "trigger": {
            "logicalArgv": list(trigger),
            "package": trigger_package,
            "manifest": _workspace_frozen_reference_v1(
                records[trigger_package]["manifestEntry"],
                records[trigger_package]["manifestPath"],
            ),
        },
        "dependencies": sorted(dependencies, key=lambda item: (item["consumer"], item["provider"])),
        "packages": {package: packages[package] for package in sorted(packages)},
        "topologicalBuilds": topological_builds,
        "topologicalOrder": topological_order,
    }


def validate_workspace_prerequisite_build_dag_contract_v1(
    contract: dict[str, Any],
    frozen_entries: list[dict[str, Any]],
) -> None:
    """Validates a workspace prerequisite build DAG by redriving it from frozen inputs.

    @param contract The claimed workspace prerequisite build contract.
    @param frozen_entries The immutable archive entries that must recreate it exactly.
    @returns Nothing when every package, edge, and source binding is exact.
    @throws core.ExecutionClosureValidationError When frozen inputs or contract fields drift.
    """
    trigger = contract.get("trigger") if isinstance(contract, dict) else None
    logical = trigger.get("logicalArgv") if isinstance(trigger, dict) else None
    if not isinstance(logical, list):
        _workspace_dag_fail("CONTRACT_INVALID")
    expected = build_workspace_prerequisite_build_dag_contract_v1(frozen_entries, logical)
    if contract != expected:
        _workspace_dag_fail("CONTRACT_INVALID")


def validate_installed_workspace_build_resolution_v1(
    contract: dict[str, Any],
    resolutions: list[dict[str, Any]],
) -> None:
    """Validates post-install workspace links and declared-output absence against one DAG.

    @param contract The previously derived workspace prerequisite build contract.
    @param resolutions The observed hash-free link and missing-target resolution records.
    @returns Nothing when all installed links and missing output states match the contract.
    @throws core.ExecutionClosureValidationError When post-install workspace resolution drifts.
    """
    if not isinstance(contract, dict) or contract.get("schemaVersion") != 1 or contract.get("kind") != "workspace-prerequisite-build-dag":
        _workspace_dag_fail("RESOLUTION_CONTRACT_INVALID")
    dependencies = contract.get("dependencies")
    expected = [dependency.get("installedResolution") for dependency in dependencies] if isinstance(dependencies, list) else None
    if (
        not isinstance(expected, list)
        or not all(isinstance(item, dict) for item in expected)
        or not isinstance(resolutions, list)
        or resolutions != expected
    ):
        _workspace_dag_fail("INSTALLED_RESOLUTION_INVALID")


def classify_workspace_build_dependency_failure_v1(
    contract: dict[str, Any],
    resolutions: list[dict[str, Any]],
    command: dict[str, Any],
    stdout: str,
    stderr: str,
) -> dict[str, Any]:
    """Classifies a failed generator or derived prerequisite without mutating frozen sources.

    @param contract The validated workspace prerequisite build contract.
    @param resolutions The validated post-install link and output state.
    @param command The nonzero command receipt to classify.
    @param stdout The captured standard output.
    @param stderr The captured standard error.
    @returns The blocked omission or upstream prerequisite failure disposition.
    @throws core.ExecutionClosureValidationError When a failure cannot be attributed safely.
    """
    validate_installed_workspace_build_resolution_v1(contract, resolutions)
    if (
        not isinstance(command, dict)
        or not isinstance(command.get("argv"), list)
        or not isinstance(command.get("exitCode"), int)
        or isinstance(command["exitCode"], bool)
        or command["exitCode"] == 0
        or not isinstance(stdout, str)
        or not isinstance(stderr, str)
    ):
        _workspace_dag_fail("FAILURE_COMMAND_INVALID")
    trigger = contract["trigger"]["logicalArgv"]
    if command["argv"] == trigger:
        text = f"{stdout}\n{stderr}"
        providers = [dependency["provider"] for dependency in contract["dependencies"]]
        if not providers or not any(
            provider in text and ("Cannot find module" in text or "TS2307" in text)
            for provider in providers
        ):
            _workspace_dag_fail("FAILURE_UNATTRIBUTED")
        return {
            "classification": "PREREQUISITE_BUILD_OMISSION",
            "reason": "V3_WORKSPACE_BUILD_DAG_PREREQUISITE_MISSING",
            "upstreamDefect": False,
            "nextAction": "RUN_DERIVED_PREREQUISITE_BUILDS",
        }
    builds = contract.get("topologicalBuilds")
    if isinstance(builds, list) and any(
        isinstance(build, dict) and command["argv"] == build.get("logicalArgv")
        for build in builds
    ):
        return {
            "classification": "UPSTREAM_PREREQUISITE_BUILD_FAILURE",
            "reason": "V3_WORKSPACE_BUILD_DAG_PREREQUISITE_FAILED",
            "upstreamDefect": True,
            "nextAction": "PRESERVE_BLOCKED_ATTEMPT",
        }
    _workspace_dag_fail("FAILURE_UNATTRIBUTED")

def _workspace_prerequisite_build_steps_v1(contract: dict[str, Any]) -> list[dict[str, Any]]:
    """Derives deterministic ephemeral-output and build steps from one frozen DAG contract.

    @param contract The previously derived workspace prerequisite build contract.
    @returns Ordered provider build records with safe output-root expectations.
    @throws core.ExecutionClosureValidationError When a build or output path is malformed.
    """
    if not isinstance(contract, dict):
        _workspace_dag_fail("EXECUTION_CONTRACT_INVALID")
    builds = contract.get("topologicalBuilds")
    order = contract.get("topologicalOrder")
    packages = contract.get("packages")
    if not isinstance(builds, list) or not isinstance(order, list) or not isinstance(packages, dict):
        _workspace_dag_fail("EXECUTION_CONTRACT_INVALID")
    build_packages = [build.get("package") if isinstance(build, dict) else None for build in builds]
    if build_packages != order or len(set(build_packages)) != len(build_packages) or not all(
        isinstance(package, str) and package for package in build_packages
    ):
        _workspace_dag_fail("EXECUTION_CONTRACT_INVALID")
    steps: list[dict[str, Any]] = []
    for ordinal, build in enumerate(builds):
        assert isinstance(build, dict)
        package = build["package"]
        logical = build.get("logicalArgv")
        if logical != ["pnpm", "--filter", package, "build"]:
            _workspace_dag_fail("EXECUTION_CONTRACT_INVALID", package)
        package_contract = packages.get(package)
        if not isinstance(package_contract, dict):
            _workspace_dag_fail("EXECUTION_CONTRACT_INVALID", package)
        manifest = package_contract.get("manifest")
        if not isinstance(manifest, dict) or not isinstance(manifest.get("path"), str):
            _workspace_dag_fail("EXECUTION_CONTRACT_INVALID", package)
        manifest_path = manifest["path"]
        if not manifest_path.endswith("/package.json"):
            _workspace_dag_fail("EXECUTION_CONTRACT_INVALID", manifest_path)
        directory = manifest_path[: -len("/package.json")]
        try:
            _normal_path(directory)
        except core.ExecutionClosureValidationError:
            _workspace_dag_fail("EXECUTION_CONTRACT_INVALID", manifest_path)
        targets = package_contract.get("declaredExportTargets")
        if not isinstance(targets, list) or not targets or targets != sorted(set(targets)):
            _workspace_dag_fail("EXECUTION_CONTRACT_INVALID", package)
        roots: dict[str, list[str]] = {}
        for target in targets:
            if not isinstance(target, str) or not target.startswith(f"{directory}/"):
                _workspace_dag_fail("EXECUTION_CONTRACT_INVALID", package)
            try:
                _normal_path(target)
            except core.ExecutionClosureValidationError:
                _workspace_dag_fail("EXECUTION_CONTRACT_INVALID", target)
            relative = target[len(directory) + 1 :]
            parts = PurePosixPath(relative).parts
            if not parts or parts[0] in {"", ".", ".."}:
                _workspace_dag_fail("EXECUTION_CONTRACT_INVALID", target)
            root = f"{directory}/{parts[0]}"
            roots.setdefault(root, []).append(target)
        steps.append({
            "ordinal": ordinal,
            "package": package,
            "logicalArgv": list(logical),
            "outputRoots": [
                {"path": root, "declaredTargets": sorted(roots[root])}
                for root in sorted(roots)
            ],
        })
    return steps


def _workspace_installed_resolution_records_v1(contract: dict[str, Any]) -> list[dict[str, Any]]:
    """Returns the ordered hash-free post-install resolution records from one DAG contract.

    @param contract The previously derived workspace prerequisite build contract.
    @returns Deep-copied installed-link and missing-target expectations.
    @throws core.ExecutionClosureValidationError When a dependency record is malformed.
    """
    dependencies = contract.get("dependencies") if isinstance(contract, dict) else None
    if not isinstance(dependencies, list):
        _workspace_dag_fail("EXECUTION_CONTRACT_INVALID")
    records: list[dict[str, Any]] = []
    for dependency in dependencies:
        resolution = dependency.get("installedResolution") if isinstance(dependency, dict) else None
        if not isinstance(resolution, dict):
            _workspace_dag_fail("EXECUTION_CONTRACT_INVALID")
        records.append(copy.deepcopy(resolution))
    return records


def _workspace_json_argument_v1(value: Any) -> str:
    """Serializes one in-container runtime expectation without host-dependent formatting.

    @param value The JSON-compatible expectation passed to the isolated Node verifier.
    @returns Canonical JSON text used as one payload argument.
    """
    return _canonical(value).decode("utf-8")


def _workspace_prerequisite_command_specs_v1(contract: dict[str, Any]) -> list[dict[str, Any]]:
    """Builds all ordered no-network commands required by a frozen workspace DAG.

    @param contract The previously derived workspace prerequisite build contract.
    @returns Resolution, clear, build, and output-inventory command specifications.
    @throws core.ExecutionClosureValidationError When the contract cannot yield safe commands.
    """
    resolution = _workspace_installed_resolution_records_v1(contract)
    specifications: list[dict[str, Any]] = [{
        "id": "validate-workspace-prerequisite-resolution",
        "kind": "resolution",
        "logicalArgv": ["node", "validate-workspace-prerequisite-resolution-v1"],
        "payloadArgv": [
            CONTAINER_NODE,
            "-e",
            _workspace_installed_resolution_payload_v1(),
            _workspace_json_argument_v1(resolution),
        ],
    }]
    for step in _workspace_prerequisite_build_steps_v1(contract):
        ordinal = step["ordinal"]
        for root_index, root in enumerate(step["outputRoots"]):
            specifications.append({
                "id": f"clear-workspace-prerequisite-output-{ordinal}-{root_index}",
                "kind": "clear",
                "logicalArgv": ["rm", "-rf", root["path"]],
                "payloadArgv": ["/bin/rm", "-rf", root["path"]],
                "step": copy.deepcopy(step),
                "root": copy.deepcopy(root),
            })
        specifications.append({
            "id": f"build-workspace-prerequisite-{ordinal}",
            "kind": "build",
            "logicalArgv": list(step["logicalArgv"]),
            "payloadArgv": build_pnpm_global_store_payload_v1(step["logicalArgv"]),
            "step": copy.deepcopy(step),
        })
        specifications.append({
            "id": f"verify-workspace-prerequisite-output-{ordinal}",
            "kind": "output-inventory",
            "logicalArgv": ["node", "verify-workspace-prerequisite-output-v1", step["package"]],
            "payloadArgv": [
                CONTAINER_NODE,
                "-e",
                _workspace_prerequisite_output_inventory_payload_v1(),
                _workspace_json_argument_v1([step]),
            ],
            "step": copy.deepcopy(step),
        })
    return specifications


def validate_workspace_prerequisite_pnpm_executor_v1(
    command: dict[str, Any],
    contract: dict[str, Any],
) -> None:
    """Validates one derived prerequisite build against the no-network pnpm executor contract.

    @param command The completed derived prerequisite command receipt.
    @param contract The frozen workspace prerequisite build contract.
    @returns Nothing when the command uses the exact config-scoped pnpm payload.
    @throws core.ExecutionClosureValidationError When logical argv, environment, or executor provenance drifts.
    """
    specifications = _workspace_prerequisite_command_specs_v1(contract)
    expected = next(
        (
            specification
            for specification in specifications
            if specification.get("kind") == "build" and specification.get("id") == command.get("id")
        ),
        None,
    )
    if not isinstance(command, dict) or not isinstance(expected, dict):
        _workspace_dag_fail("BUILD_EXECUTOR_INVALID")
    logical = expected["logicalArgv"]
    executor = command.get("actualExecutor")
    if (
        command.get("argv") != logical
        or command.get("cwd") != "."
        or command.get("env") != ENV
        or command.get("envAbsent") != ENV_ABSENT
        or command.get("network") is not False
        or not isinstance(executor, dict)
        or executor.get("logicalArgv") != logical
        or executor.get("environment") != ENV
        or executor.get("effectiveEnvironment") != {"CI": "true", "PATH": BOOTSTRAP_PATH}
        or executor.get("inheritedEnv") != []
        or executor.get("payloadArgv") != expected["payloadArgv"]
    ):
        _workspace_dag_fail("BUILD_EXECUTOR_INVALID")
    actual_argv = executor.get("argv")
    if not isinstance(actual_argv, list) or actual_argv[:5] != [PODMAN, "run", "--rm", "--network", "none"]:
        _workspace_dag_fail("BUILD_EXECUTOR_INVALID")
    try:
        image_index = actual_argv.index(IMAGE_RESOLVED)
    except ValueError:
        _workspace_dag_fail("BUILD_EXECUTOR_INVALID")
    if actual_argv[image_index:] != [
        IMAGE_RESOLVED,
        "/usr/bin/env",
        "-i",
        "CI=true",
        f"PATH={BOOTSTRAP_PATH}",
        *expected["payloadArgv"],
    ]:
        _workspace_dag_fail("BUILD_EXECUTOR_INVALID")


def validate_workspace_prerequisite_build_output_inventories_v1(
    contract: dict[str, Any],
    inventories: list[dict[str, Any]],
) -> None:
    """Validates recorded realpaths and inventories for all derived prerequisite outputs.

    @param contract The frozen workspace prerequisite build contract.
    @param inventories The post-build output observations captured inside the container.
    @returns Nothing when all declared output targets and recursive inventories are complete.
    @throws core.ExecutionClosureValidationError When output state is unsafe, incomplete, or malformed.
    """
    expected_steps = _workspace_prerequisite_build_steps_v1(contract)
    if not isinstance(inventories, list) or len(inventories) != len(expected_steps):
        _workspace_dag_fail("OUTPUT_INVENTORY_INVALID")
    for observed, expected in zip(inventories, expected_steps, strict=True):
        if not isinstance(observed, dict) or set(observed) != {"package", "outputRoots"} or observed.get("package") != expected["package"]:
            _workspace_dag_fail("OUTPUT_INVENTORY_INVALID")
        roots = observed.get("outputRoots")
        expected_roots = expected["outputRoots"]
        if not isinstance(roots, list) or len(roots) != len(expected_roots):
            _workspace_dag_fail("OUTPUT_INVENTORY_INVALID")
        for actual_root, expected_root in zip(roots, expected_roots, strict=True):
            if not isinstance(actual_root, dict) or set(actual_root) != {"path", "declaredTargets", "observedTargets", "inventory"}:
                _workspace_dag_fail("OUTPUT_INVENTORY_INVALID")
            if actual_root.get("path") != expected_root["path"] or actual_root.get("declaredTargets") != expected_root["declaredTargets"]:
                _workspace_dag_fail("OUTPUT_INVENTORY_INVALID")
            targets = actual_root.get("observedTargets")
            expected_targets = expected_root["declaredTargets"]
            if not isinstance(targets, list) or len(targets) != len(expected_targets):
                _workspace_dag_fail("OUTPUT_INVENTORY_INVALID")
            if targets != [
                {"path": target, "kind": "file", "realpath": target}
                for target in expected_targets
            ]:
                _workspace_dag_fail("OUTPUT_INVENTORY_INVALID")
            inventory = actual_root.get("inventory")
            if (
                not isinstance(inventory, dict)
                or set(inventory) != {"entryCount", "sha256"}
                or not isinstance(inventory.get("entryCount"), int)
                or isinstance(inventory["entryCount"], bool)
                or inventory["entryCount"] < 1
                or not isinstance(inventory.get("sha256"), str)
                or not re.fullmatch(r"[0-9a-f]{64}", inventory["sha256"])
            ):
                _workspace_dag_fail("OUTPUT_INVENTORY_INVALID")

def _frozen_pnpm_reference(entries: Any, path: str) -> dict[str, Any]:
    """Returns one exact lockfile or workspace-config reference from frozen archive entries.

    @param entries The immutable frozen archive entries.
    @param path The required workspace-relative source path.
    @returns The path, SHA-256, and size reference.
    @throws core.ExecutionClosureValidationError When the frozen source entry is ambiguous or unsafe.
    """
    if not isinstance(entries, list):
        _fail("V3_HERMETIC_PNPM_FROZEN_ENTRIES_INVALID")
    matches = [entry for entry in entries if isinstance(entry, dict) and entry.get("path") == path]
    if len(matches) != 1:
        _fail("V3_HERMETIC_PNPM_FROZEN_ENTRY_INVALID", path)
    entry = matches[0]
    reference = {key: entry.get(key) for key in ("path", "sha256", "size")}
    if reference["path"] != path or not isinstance(reference["sha256"], str) or not re.fullmatch(r"[0-9a-f]{64}", reference["sha256"]) or not isinstance(reference["size"], int) or isinstance(reference["size"], bool) or reference["size"] < 0:
        _fail("V3_HERMETIC_PNPM_FROZEN_ENTRY_INVALID", path)
    return reference


def build_hermetic_pnpm_install_contract_v1(frozen_entries: list[dict[str, Any]], pnpm_version: str) -> dict[str, Any]:
    """Builds the exact no-registry pnpm install contract for a frozen source archive.

    @param frozen_entries The retained immutable source archive entries.
    @param pnpm_version The recorded pnpm executable version.
    @returns The complete hermetic pnpm install contract.
    @throws core.ExecutionClosureValidationError When the frozen references or pnpm version are unsafe.
    """
    if pnpm_version != HERMETIC_PNPM_VERSION:
        _fail("V3_HERMETIC_PNPM_VERSION_INVALID", str(pnpm_version))
    lockfile = _frozen_pnpm_reference(frozen_entries, "pnpm-lock.yaml")
    workspace_config = _frozen_pnpm_reference(frozen_entries, "pnpm-workspace.yaml")
    return {
        "schemaVersion": 1,
        "kind": "hermetic-pnpm-install-contract",
        "strategy": "TRUST_HASH_BOUND_FROZEN_LOCKFILE",
        "logicalArgv": list(HERMETIC_PNPM_INSTALL),
        "payloadSuffix": list(HERMETIC_PNPM_PAYLOAD_SUFFIX),
        "network": {
            "mode": "none",
            "registryRequestsMaximum": 0,
            "retryEventsMaximum": 0,
        },
        "trustLockfile": {
            "documentedControl": "--trust-lockfile",
            "documentedEffect": "SKIP_REAPPLY_LOCKFILE_SUPPLY_CHAIN_POLICY",
            "justification": "HASH_BOUND_TRUSTED_FROZEN_LOCKFILE",
            "lockfile": lockfile,
            "workspaceConfig": workspace_config,
            "pnpmVersion": HERMETIC_PNPM_VERSION,
        },
    }


def validate_hermetic_pnpm_install_contract_v1(contract: dict[str, Any], frozen_entries: list[dict[str, Any]]) -> None:
    """Validates one hermetic pnpm contract against the frozen archive bytes.

    @param contract The claimed hermetic pnpm install contract.
    @param frozen_entries The immutable source archive entries it must bind.
    @returns Nothing when the contract is exact and fully hash-bound.
    @throws core.ExecutionClosureValidationError When a policy or frozen reference drifts.
    """
    expected = build_hermetic_pnpm_install_contract_v1(frozen_entries, HERMETIC_PNPM_VERSION)
    if not isinstance(contract, dict) or contract != expected:
        _fail("V3_HERMETIC_PNPM_CONTRACT_INVALID")


def _hermetic_pnpm_marker_counts(stdout: str, stderr: str) -> dict[str, int]:
    """Counts registry and retry markers in captured pnpm output.

    @param stdout The captured pnpm standard output.
    @param stderr The captured pnpm standard error.
    @returns The observed registry-request and retry-event counts.
    @throws core.ExecutionClosureValidationError When a raw stream is not textual.
    """
    if not isinstance(stdout, str) or not isinstance(stderr, str):
        _fail("V3_HERMETIC_PNPM_RAW_STREAM_INVALID")
    text = f"{stdout}\n{stderr}"
    # A URL in pnpm output is not a registry request: ERR_PNPM_NO_OFFLINE_TARBALL
    # prints the tarball it *would* have fetched, which under --network none is
    # proof no fetch happened. Real fetches move pnpm's monotonic downloaded
    # counter; attempted fetches leave retry markers. Count those instead.
    downloads = [int(count) for count in re.findall(r"(?i)\bdownloaded\s+(\d+)\b", text)]
    return {
        "requests": max(downloads) if downloads else 0,
        "retryEvents": len(re.findall(r"(?i)\b(?:EAI_AGAIN|will\s+retry|retrying|retries?\s+left)\b", text)),
    }


def _hermetic_pnpm_registry_attestation(stdout: str, stderr: str, contract: dict[str, Any]) -> dict[str, int]:
    """Counts registry and retry markers and enforces the contract's zero-bound policy.

    @param stdout The captured pnpm standard output.
    @param stderr The captured pnpm standard error.
    @param contract The validated hermetic pnpm install contract.
    @returns The observed registry-request and retry-event counts.
    @throws core.ExecutionClosureValidationError When network or retry evidence appears.
    """
    counts = _hermetic_pnpm_marker_counts(stdout, stderr)
    network = contract["network"]
    if counts["requests"] > network["registryRequestsMaximum"] or counts["retryEvents"] > network["retryEventsMaximum"]:
        _fail("V3_HERMETIC_PNPM_NETWORK_POLICY_VIOLATION")
    return counts


def _pnpm_structured_diagnostic(stdout: str, stderr: str) -> dict[str, str] | None:
    """Extracts one unambiguous structured pnpm failure diagnostic from captured streams.

    @param stdout The captured pnpm standard output.
    @param stderr The captured pnpm standard error.
    @returns The diagnostic code and stream, or nothing when no structured diagnostic exists.
    @throws core.ExecutionClosureValidationError When competing diagnostic codes are present.
    """
    matches: list[tuple[str, str]] = []
    for stream, text in (("stdout", stdout), ("stderr", stderr)):
        matches.extend((code, stream) for code in re.findall(r"\b(ERR_PNPM_[A-Z0-9_]+)\b", text))
    if not matches:
        return None
    codes = {code for code, _ in matches}
    if len(codes) != 1:
        _fail("V3_HERMETIC_PNPM_DIAGNOSTIC_AMBIGUOUS")
    code = matches[0][0]
    stream = next(stream for observed, stream in matches if observed == code)
    return {"code": code, "stream": stream}


def _validate_external_stop(external_stop: Any, exit_code: int) -> dict[str, str]:
    """Validates explicit supervisor provenance for one signal-terminated container command.

    @param external_stop The claimed external supervision record.
    @param exit_code The captured container command exit code.
    @returns The validated supervisor-stop evidence.
    @throws core.ExecutionClosureValidationError When supervision provenance is incomplete or mismatched.
    """
    if not isinstance(external_stop, dict) or set(external_stop) != {"kind", "signal", "actor", "reason"} or external_stop.get("kind") != "EXTERNAL_SUPERVISOR_STOP" or not all(isinstance(external_stop.get(key), str) and external_stop[key] for key in ("signal", "actor", "reason")):
        _fail("V3_HERMETIC_PNPM_EXTERNAL_STOP_INVALID")
    signal_number = getattr(signal, external_stop["signal"], None)
    if not isinstance(signal_number, int) or signal_number <= 0 or exit_code != 128 + int(signal_number):
        _fail("V3_HERMETIC_PNPM_EXTERNAL_STOP_MISMATCH")
    return {key: external_stop[key] for key in ("kind", "signal", "actor", "reason")}


def derive_generator_environment_overrides_v1(argv: list[str]) -> dict[str, str]:
    """Derives the exact environment overrides one recorded command argv must carry.

    @param argv The recorded logical command argv.
    @returns The generator NODE_OPTIONS overrides for any frozen generator form, otherwise no overrides.
    """
    generator_forms = {
        tuple(STANDARD_PACK_GENERATOR),
        tuple(DIRECT_NODE_STANDARD_PACK_GENERATOR),
        tuple(PACKAGE_RELATIVE_STANDARD_PACK_GENERATOR),
    }
    if not isinstance(argv, list) or tuple(argv) not in generator_forms:
        return {}
    return {"NODE_OPTIONS": DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS}


def classify_hermetic_pnpm_install_outcome_v1(command: dict[str, Any], *, stdout: str, stderr: str, contract: dict[str, Any], external_stop: dict[str, str] | None) -> dict[str, Any]:
    """Classifies one nonzero hermetic pnpm install result without inventing interruption evidence.

    @param command The recorded offline-install command receipt.
    @param stdout The raw standard output captured for that command.
    @param stderr The raw standard error captured for that command.
    @param contract The frozen hermetic pnpm install contract.
    @param external_stop Optional explicit supervisor-stop evidence.
    @returns The blocked terminal-outcome classification and zero-network attestation.
    @throws core.ExecutionClosureValidationError When outcome evidence is ambiguous, unproven, or networked.
    """
    validate_hermetic_pnpm_install_contract_v1(contract, _load_json(core.V2_ARCHIVE)["entries"])
    if not isinstance(command, dict) or command.get("id") != "offline-install" or command.get("network") is not False or not isinstance(command.get("exitCode"), int) or isinstance(command["exitCode"], bool) or command["exitCode"] == 0:
        _fail("V3_HERMETIC_PNPM_COMMAND_INVALID")
    attestation = _hermetic_pnpm_registry_attestation(stdout, stderr, contract)
    diagnostic = _pnpm_structured_diagnostic(stdout, stderr)
    if external_stop is not None:
        stop = _validate_external_stop(external_stop, command["exitCode"])
        if diagnostic is not None:
            _fail("V3_HERMETIC_PNPM_TERMINAL_OUTCOME_AMBIGUOUS")
        return {
            "classification": "EXTERNAL_INTERRUPTION",
            "commandId": "offline-install",
            "exitCode": command["exitCode"],
            "packageManagerDiagnostic": None,
            "externalStop": stop,
            "registryAttestation": attestation,
        }
    if diagnostic is None:
        _fail("V3_HERMETIC_PNPM_TERMINAL_OUTCOME_UNATTRIBUTED")
    return {
        "classification": "PACKAGE_MANAGER_FAILURE",
        "commandId": "offline-install",
        "exitCode": command["exitCode"],
        "packageManagerDiagnostic": diagnostic,
        "externalStop": None,
        "registryAttestation": attestation,
    }


def _normal_path(value: Any) -> str:
    """Returns one safe root-relative POSIX path.

    @param value The candidate path.
    @returns The validated path.
    @throws core.ExecutionClosureValidationError When the path is unsafe.
    """
    if not isinstance(value, str) or not value or "\\" in value or "\x00" in value:
        _fail("V3_PODMAN_PATH_INVALID", repr(value))
    path = PurePosixPath(value)
    if path.is_absolute() or path.as_posix() != value or any(part in {"", ".", ".."} for part in path.parts):
        _fail("V3_PODMAN_PATH_INVALID", value)
    return value


def _write_json(path: Path, value: dict[str, Any]) -> None:
    """Writes a deterministic JSON object.

    @param path The output location.
    @param value The JSON object to serialize.
    @returns Nothing.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _load_json(path: Path) -> dict[str, Any]:
    """Loads a regular JSON object.

    @param path The expected regular file.
    @returns The parsed object.
    @throws core.ExecutionClosureValidationError When the file is unsafe.
    """
    if not path.is_file() or path.is_symlink():
        _fail("V3_PODMAN_ARTIFACT_UNSAFE", str(path))
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        _fail("V3_PODMAN_ARTIFACT_UNREADABLE", f"{path}: {error}")
    if not isinstance(value, dict):
        _fail("V3_PODMAN_ARTIFACT_SCHEMA", str(path))
    return value


def _reference(path: Path, logical_path: Path | None = None) -> dict[str, Any]:
    """Builds a hash-bound track-relative reference.

    @param path The regular track-owned file.
    @param logical_path Optional canonical track path for staged bytes.
    @returns Path, digest, and size metadata.
    """
    if logical_path is None:
        return core._reference_for(path)
    try:
        logical = logical_path.relative_to(TRACK_DIR).as_posix()
    except ValueError:
        _fail("V3_PODMAN_REFERENCE_PATH_INVALID", str(logical_path))
    data = path.read_bytes()
    return {"path": logical, "sha256": _sha256(data), "size": len(data)}



def _candidate_path(candidate_root: Path, canonical_path: Path) -> Path:
    """Maps one canonical V3 artifact path into a transactional staging root.

    @param candidate_root The private staged candidate directory.
    @param canonical_path The final canonical V3 artifact path.
    @returns The staged artifact location.
    """
    try:
        relative = canonical_path.relative_to(V3_DIR)
    except ValueError:
        _fail("V3_PODMAN_CANDIDATE_PATH_INVALID", str(canonical_path))
    return candidate_root / relative


def _candidate_reference(candidate_root: Path, canonical_path: Path) -> dict[str, Any]:
    """References staged bytes by their final canonical V3 path.

    @param candidate_root The private staged candidate directory.
    @param canonical_path The final canonical V3 artifact path.
    @returns A canonical reference to the staged artifact bytes.
    """
    return _reference(_candidate_path(candidate_root, canonical_path), canonical_path)


def _candidate_reference_path(candidate_root: Path, reference: Any) -> Path:
    """Resolves one canonical V3 raw reference into the staged candidate root.

    @param candidate_root The private staged candidate directory.
    @param reference The claimed canonical V3 reference.
    @returns The staged path holding those bytes.
    @throws core.ExecutionClosureValidationError When the reference escapes V3.
    """
    logical = _normal_path(reference.get("path") if isinstance(reference, dict) else None)
    parts = PurePosixPath(logical).parts
    if not parts or parts[0] != V3_NAME:
        _fail("V3_PODMAN_CANDIDATE_REFERENCE_INVALID", logical)
    return candidate_root.joinpath(*parts[1:])


def resolve_execution_run_day_v1(run_day: str | None = None) -> str:
    """Returns one validated UTC run day for append-only failed-attempt publication.

    @param run_day Optional explicit eight-digit UTC run day.
    @returns The validated run day in YYYYMMDD form.
    @throws core.ExecutionClosureValidationError When the requested run day is not a real calendar day.
    """
    value = datetime.now(timezone.utc).strftime("%Y%m%d") if run_day is None else run_day
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]{8}", value):
        _fail("V3_PODMAN_ATTEMPT_DATE_INVALID", repr(value))
    try:
        datetime.strptime(value, "%Y%m%d")
    except ValueError:
        _fail("V3_PODMAN_ATTEMPT_DATE_INVALID", value)
    return value


def reserve_execution_attempt_directory_v1(root: Path | str, yyyymmdd: str) -> Path:
    """Atomically reserves the next monotonic failed-attempt directory for one day.

    @param root The parent directory that owns failed-attempt records.
    @param yyyymmdd The eight-digit UTC attempt date.
    @returns The newly created attempt directory.
    @throws core.ExecutionClosureValidationError When the root or date is unsafe.
    """
    yyyymmdd = resolve_execution_run_day_v1(yyyymmdd)
    attempts_root = Path(root)
    if attempts_root.exists() and (attempts_root.is_symlink() or not attempts_root.is_dir()):
        _fail("V3_PODMAN_ATTEMPT_ROOT_INVALID", str(attempts_root))
    attempts_root.mkdir(parents=True, exist_ok=True)
    if attempts_root.is_symlink() or not attempts_root.is_dir():
        _fail("V3_PODMAN_ATTEMPT_ROOT_INVALID", str(attempts_root))
    matcher = re.compile(rf"{re.escape(ATTEMPT_PREFIX)}-{yyyymmdd}-([0-9]{{4}})$")
    while True:
        sequences = [
            int(match.group(1))
            for child in attempts_root.iterdir()
            if (match := matcher.fullmatch(child.name))
        ]
        sequence = max(sequences, default=0) + 1
        if sequence > 9999:
            _fail("V3_PODMAN_ATTEMPT_SEQUENCE_EXHAUSTED", yyyymmdd)
        directory = attempts_root / f"{ATTEMPT_PREFIX}-{yyyymmdd}-{sequence:04d}"
        try:
            directory.mkdir()
        except FileExistsError:
            continue
        return directory


def _attempt_raw_reference(path: Path, attempt_directory: Path) -> dict[str, Any]:
    """Builds an attempt-relative immutable reference for one regular raw stream.

    @param path The raw stream file.
    @param attempt_directory The owning failed-attempt directory.
    @returns The path, digest, and size reference.
    """
    if not path.is_file() or path.is_symlink():
        _fail("V3_PODMAN_ATTEMPT_RAW_UNSAFE", str(path))
    data = path.read_bytes()
    return {"path": f"{attempt_directory.name}/raw/{path.name}", "sha256": _sha256(data), "size": len(data)}


def _build_direct_runtime_preseal_attempt_v1(
    preparation: Any,
    attempt_nonce: Any,
    reached_stage: Any,
) -> dict[str, Any]:
    """Builds one closed pre-seal carrier from executor-owned transaction state.

    @param preparation The executor-owned preparation captured before dispatch.
    @param attempt_nonce The executor-owned random nonce captured before dispatch.
    @param reached_stage The pre-seal runner stage about to execute.
    @returns The exact terminality carrier that can bind one nonzero staged command.
    @throws core.ExecutionClosureValidationError When the owned state cannot describe a pre-seal stage.
    """
    preseal_stages = _DIRECT_RUNTIME_RUNNER_STAGES[
        : _DIRECT_RUNTIME_RUNNER_STAGES.index("direct-runtime-dist-identity") + 1
    ]
    if (
        not isinstance(preparation, dict)
        or not isinstance(attempt_nonce, bytes)
        or len(attempt_nonce) != 32
        or reached_stage not in preseal_stages
    ):
        _direct_runtime_integration_fail("FAILED_ATTEMPT_PRESEAL_INVALID")
    reached_index = _DIRECT_RUNTIME_RUNNER_STAGES.index(reached_stage)
    return {
        "schemaVersion": 1,
        "kind": "direct-command-runtime-pre-seal-attempt",
        "preparationSha256": _sha256(_canonical(preparation)),
        "stagePlan": list(_DIRECT_RUNTIME_RUNNER_STAGES),
        "attempt": {
            "id": "direct-runtime-detached-runner-v1",
            "nonceSha256": _sha256(attempt_nonce),
            "reachedStage": reached_stage,
            "laterStages": [
                {"id": stage, "status": "NOT_RUN"}
                for stage in _DIRECT_RUNTIME_RUNNER_STAGES[reached_index + 1:]
            ],
            "executionTrace": None,
        },
    }


def _validate_direct_runtime_preseal_failed_attempt_v1(
    record: Any,
    stage: Any,
) -> dict[str, Any]:
    """Validates the closed pre-seal terminality carrier for one direct-runtime failure.

    @param record The candidate pre-seal carrier attached to the failed attempt.
    @param stage The failed command stage that must equal the pre-seal reached stage.
    @returns The hash-bound preparation and exact detached-runner attempt metadata.
    @throws core.ExecutionClosureValidationError When the carrier is not a pre-seal terminal state.
    """
    expected_record_keys = {
        "schemaVersion",
        "kind",
        "preparationSha256",
        "stagePlan",
        "attempt",
    }
    if (
        not isinstance(record, dict)
        or set(record) != expected_record_keys
        or record.get("schemaVersion") != 1
        or record.get("kind") != "direct-command-runtime-pre-seal-attempt"
        or record.get("stagePlan") != list(_DIRECT_RUNTIME_RUNNER_STAGES)
    ):
        _direct_runtime_integration_fail("FAILED_ATTEMPT_PRESEAL_INVALID")
    preparation_sha256 = record.get("preparationSha256")
    detached_attempt = record.get("attempt")
    preseal_stages = _DIRECT_RUNTIME_RUNNER_STAGES[
        : _DIRECT_RUNTIME_RUNNER_STAGES.index("direct-runtime-dist-identity") + 1
    ]
    expected_attempt_keys = {
        "id",
        "nonceSha256",
        "reachedStage",
        "laterStages",
        "executionTrace",
    }
    if (
        not isinstance(preparation_sha256, str)
        or re.fullmatch(r"[0-9a-f]{64}", preparation_sha256) is None
        or not isinstance(detached_attempt, dict)
        or set(detached_attempt) != expected_attempt_keys
        or detached_attempt.get("id") != "direct-runtime-detached-runner-v1"
        or not isinstance(detached_attempt.get("nonceSha256"), str)
        or re.fullmatch(r"[0-9a-f]{64}", detached_attempt["nonceSha256"]) is None
        or detached_attempt.get("reachedStage") not in preseal_stages
        or detached_attempt.get("executionTrace") is not None
        or detached_attempt.get("reachedStage") != stage
    ):
        _direct_runtime_integration_fail("FAILED_ATTEMPT_PRESEAL_INVALID")
    reached_stage = detached_attempt["reachedStage"]
    expected_later_stages = [
        {"id": runtime_stage, "status": "NOT_RUN"}
        for runtime_stage in _DIRECT_RUNTIME_RUNNER_STAGES[
            _DIRECT_RUNTIME_RUNNER_STAGES.index(reached_stage) + 1:
        ]
    ]
    if detached_attempt.get("laterStages") != expected_later_stages:
        _direct_runtime_integration_fail("FAILED_ATTEMPT_PRESEAL_INVALID")
    return {
        "preparationSha256": preparation_sha256,
        "attempt": copy.deepcopy(detached_attempt),
    }


_CANDIDATE_PUBLICATION_FAILURE_CLASSIFICATIONS = {
    "validate-private-candidate": "CANDIDATE_VALIDATION_FAILURE",
    "atomic-replace": "CANDIDATE_ATOMIC_REPLACE_FAILURE",
}


def _build_candidate_publication_failure_v1(
    completed_integration: Any,
    operation_id: str = "validate-private-candidate",
) -> dict[str, Any]:
    """Builds the closed operation carrier for one unpublished candidate failure.

    @param completed_integration The trace-complete integration that reached private validation.
    @param operation_id The bounded validation or atomic-replace operation that failed.
    @returns The operation-only carrier for an unpublished V3 candidate destination.
    @throws core.ExecutionClosureValidationError When the integration is not trace-complete.
    """
    if not isinstance(completed_integration, dict):
        _direct_runtime_integration_fail("CANDIDATE_PUBLICATION_FAILURE_INVALID")
    validate_direct_command_runtime_runner_integration_v1(completed_integration)
    completed_attempt = completed_integration.get("attempt")
    if (
        not isinstance(completed_attempt, dict)
        or completed_attempt.get("reachedStage") != "direct-runtime-trace"
        or not isinstance(completed_attempt.get("executionTrace"), dict)
        or operation_id not in _CANDIDATE_PUBLICATION_FAILURE_CLASSIFICATIONS
    ):
        _direct_runtime_integration_fail("CANDIDATE_PUBLICATION_FAILURE_INVALID")
    return {
        "schemaVersion": 1,
        "kind": "execution-closure-candidate-publication-failure",
        "completedIntegrationSha256": _sha256(_canonical(completed_integration)),
        "reachedStage": "direct-runtime-trace",
        "operationId": operation_id,
        "intendedDestination": V3_DIR.relative_to(REPO_ROOT).as_posix(),
        "published": False,
    }


def _validate_candidate_publication_failure_v1(
    record: Any,
    completed_integration: Any,
) -> None:
    """Validates one closed unpublished-candidate operation-failure carrier.

    @param record The candidate operation-only failure carrier.
    @param completed_integration The trace-complete integration forwarded in the same attempt.
    @returns Nothing when the carrier exactly binds the unpublished integration.
    @throws core.ExecutionClosureValidationError When the carrier has extra fields or stale integration state.
    """
    expected_keys = {
        "schemaVersion",
        "kind",
        "completedIntegrationSha256",
        "reachedStage",
        "operationId",
        "intendedDestination",
        "published",
    }
    if (
        not isinstance(record, dict)
        or set(record) != expected_keys
        or record.get("schemaVersion") != 1
        or record.get("kind")
        != "execution-closure-candidate-publication-failure"
        or not isinstance(record.get("completedIntegrationSha256"), str)
        or re.fullmatch(r"[0-9a-f]{64}", record["completedIntegrationSha256"])
        is None
        or record.get("reachedStage") != "direct-runtime-trace"
        or record.get("operationId")
        not in _CANDIDATE_PUBLICATION_FAILURE_CLASSIFICATIONS
        or record.get("intendedDestination")
        != V3_DIR.relative_to(REPO_ROOT).as_posix()
        or record.get("published") is not False
        or not isinstance(completed_integration, dict)
    ):
        _direct_runtime_integration_fail("CANDIDATE_PUBLICATION_FAILURE_INVALID")
    validate_direct_command_runtime_runner_integration_v1(completed_integration)
    completed_attempt = completed_integration.get("attempt")
    if (
        not isinstance(completed_attempt, dict)
        or completed_attempt.get("reachedStage") != "direct-runtime-trace"
        or not isinstance(completed_attempt.get("executionTrace"), dict)
        or record["completedIntegrationSha256"]
        != _sha256(_canonical(completed_integration))
    ):
        _direct_runtime_integration_fail("CANDIDATE_PUBLICATION_FAILURE_INVALID")


def validate_failed_execution_attempt_v1(attempt: dict[str, Any], attempt_directory: Path | str) -> None:
    """Validates one immutable failed Podman-attempt record and its raw streams.

    @param attempt The failed-attempt evidence object.
    @param attempt_directory The physical directory containing the raw streams.
    @returns Nothing when the failure evidence is exact and hash-bound.
    @throws core.ExecutionClosureValidationError When historical linkage, terminal outcome, or raw evidence drifts.
    """
    directory = Path(attempt_directory)
    if not directory.is_dir() or directory.is_symlink():
        _fail("V3_PODMAN_ATTEMPT_DIRECTORY_INVALID", str(directory))
    match = re.fullmatch(rf"{re.escape(ATTEMPT_PREFIX)}-([0-9]{{8}})-([0-9]{{4}})", directory.name)
    if match is None:
        _fail("V3_PODMAN_ATTEMPT_NAME_INVALID", directory.name)
    date, sequence_text = match.groups()
    sequence = int(sequence_text)
    resolve_execution_run_day_v1(date)
    if sequence < 1:
        _fail("V3_PODMAN_ATTEMPT_IDENTITY")
    base_attempt_keys = {"schemaVersion", "kind", "status", "attempt", "historicalBlocker", "failure", "commands", "markerDisposition", "upstreamAuthority"}
    typed_hermetic_offline = isinstance(attempt, dict) and "hermeticPnpmInstallContract" in attempt
    has_workspace_contract = isinstance(attempt, dict) and "workspacePrerequisiteBuildDag" in attempt
    has_workspace_resolution = isinstance(attempt, dict) and "workspaceBuildResolution" in attempt
    has_direct_runtime_integration = isinstance(attempt, dict) and "directRuntimeIntegration" in attempt
    has_direct_runtime_preseal_attempt = isinstance(attempt, dict) and "directRuntimePreSealAttempt" in attempt
    has_candidate_publication_failure = isinstance(attempt, dict) and "candidatePublicationFailure" in attempt
    if has_workspace_contract != has_workspace_resolution:
        _fail("V3_PODMAN_ATTEMPT_SCHEMA")
    typed_workspace_prerequisite = has_workspace_contract
    if (
        typed_hermetic_offline
        and typed_workspace_prerequisite
    ) or (has_direct_runtime_integration and has_direct_runtime_preseal_attempt) or (
        has_candidate_publication_failure
        and (
            not has_direct_runtime_integration
            or has_direct_runtime_preseal_attempt
            or typed_hermetic_offline
            or typed_workspace_prerequisite
        )
    ):
        _fail("V3_PODMAN_ATTEMPT_SCHEMA")
    expected_attempt_keys = base_attempt_keys | (
        {"hermeticPnpmInstallContract"} if typed_hermetic_offline else set()
    ) | (
        {"workspacePrerequisiteBuildDag", "workspaceBuildResolution"}
        if typed_workspace_prerequisite
        else set()
    ) | (
        {"directRuntimeIntegration"} if has_direct_runtime_integration else set()
    ) | (
        {"directRuntimePreSealAttempt"} if has_direct_runtime_preseal_attempt else set()
    ) | (
        {"candidatePublicationFailure"}
        if has_candidate_publication_failure
        else set()
    )
    if not isinstance(attempt, dict) or set(attempt) != expected_attempt_keys:
        _fail("V3_PODMAN_ATTEMPT_SCHEMA")
    if attempt.get("schemaVersion") != 1 or attempt.get("kind") != "execution-closure-failed-attempt" or attempt.get("status") != "BLOCKED" or attempt.get("historicalBlocker") != _reference(HISTORICAL_PODMAN_BLOCKER) or attempt.get("markerDisposition") != core.MARKER_DISPOSITION or attempt.get("upstreamAuthority") != "NONE":
        _fail("V3_PODMAN_ATTEMPT_SCHEMA")
    attempt_identity = attempt.get("attempt")
    if attempt_identity != {"id": directory.name, "sequence": sequence, "namingRule": ATTEMPT_NAMING_RULE}:
        _fail("V3_PODMAN_ATTEMPT_IDENTITY")
    failure = attempt.get("failure")
    expected_failure_keys = (
        {"stage", "reason", "classification", "operationId"}
        if has_candidate_publication_failure
        else {"stage", "reason", "classification", "commandId"}
    )
    if typed_hermetic_offline and not has_candidate_publication_failure:
        expected_failure_keys |= {"packageManagerDiagnostic", "externalStop", "registryAttestation"}
    if typed_workspace_prerequisite and not has_candidate_publication_failure:
        expected_failure_keys.add("workspaceBuildDependencyFailure")
    if not isinstance(failure, dict) or set(failure) != expected_failure_keys:
        _fail("V3_PODMAN_ATTEMPT_FAILURE")
    commands = attempt.get("commands")
    if has_candidate_publication_failure:
        operation_id = failure.get("operationId")
        classification = (
            _CANDIDATE_PUBLICATION_FAILURE_CLASSIFICATIONS.get(operation_id)
            if isinstance(operation_id, str)
            else None
        )
        if (
            not isinstance(commands, list)
            or commands != []
            or failure.get("stage") != "candidate-publication"
            or not isinstance(failure.get("reason"), str)
            or failure.get("classification") != classification
            or classification is None
        ):
            _fail("V3_PODMAN_ATTEMPT_FAILURE")
        record = attempt["directRuntimeIntegration"]
        if not isinstance(record, dict) or set(record) != {
            "integration",
            "reachedStage",
            "laterStages",
        }:
            _direct_runtime_integration_fail("FAILED_ATTEMPT_RUNTIME_INVALID")
        forwarded = record["integration"]
        validate_direct_command_runtime_runner_integration_v1(forwarded)
        if (
            record.get("reachedStage") != "direct-runtime-trace"
            or record.get("laterStages") != []
            or forwarded.get("attempt", {}).get("reachedStage")
            != "direct-runtime-trace"
            or forwarded.get("attempt", {}).get("laterStages") != []
        ):
            _direct_runtime_integration_fail("FAILED_ATTEMPT_RUNTIME_INVALID")
        _validate_candidate_publication_failure_v1(
            attempt["candidatePublicationFailure"],
            forwarded,
        )
        if attempt["candidatePublicationFailure"]["operationId"] != operation_id:
            _direct_runtime_integration_fail(
                "CANDIDATE_PUBLICATION_FAILURE_INVALID",
            )
        return
    if not isinstance(commands, list) or len(commands) != 1 or not isinstance(commands[0], dict):
        _fail("V3_PODMAN_ATTEMPT_COMMAND")
    command = commands[0]
    stage = failure.get("stage")
    if not isinstance(stage, str) or not stage or failure.get("commandId") != stage or command.get("id") != stage:
        _fail("V3_PODMAN_ATTEMPT_FAILURE")
    preseal_attempt: dict[str, Any] | None = None
    if has_direct_runtime_preseal_attempt:
        preseal_attempt = _validate_direct_runtime_preseal_failed_attempt_v1(
            attempt["directRuntimePreSealAttempt"],
            stage,
        )
    elif not has_direct_runtime_integration and stage in _DIRECT_RUNTIME_RUNNER_STAGES:
        _direct_runtime_integration_fail("FAILED_ATTEMPT_RUNTIME_CARRIER_MISSING")
    if has_direct_runtime_integration:
        record = attempt["directRuntimeIntegration"]
        if not isinstance(record, dict) or set(record) != {"integration", "reachedStage", "laterStages"}:
            _direct_runtime_integration_fail("FAILED_ATTEMPT_RUNTIME_INVALID")
        forwarded = record["integration"]
        validate_direct_command_runtime_runner_integration_v1(forwarded)
        reached_stage = record["reachedStage"]
        if reached_stage not in _DIRECT_RUNTIME_RUNNER_STAGES:
            _direct_runtime_integration_fail("FAILED_ATTEMPT_RUNTIME_INVALID")
        if stage in {"materialize", "direct-runtime-materialization-probe"} and reached_stage != stage:
            _direct_runtime_integration_fail("FAILED_ATTEMPT_RUNTIME_INVALID")
        later_stages = [
            {"id": runtime_stage, "status": "NOT_RUN"}
            for runtime_stage in _DIRECT_RUNTIME_RUNNER_STAGES[_DIRECT_RUNTIME_RUNNER_STAGES.index(reached_stage) + 1:]
        ]
        if record.get("reachedStage") != reached_stage or record.get("laterStages") != later_stages:
            _direct_runtime_integration_fail("FAILED_ATTEMPT_RUNTIME_INVALID")
        if forwarded["attempt"]["reachedStage"] != reached_stage or forwarded["attempt"]["laterStages"] != later_stages:
            _direct_runtime_integration_fail("FAILED_ATTEMPT_RUNTIME_INVALID")
    hermetic_contract: dict[str, Any] | None = None
    workspace_contract: dict[str, Any] | None = None
    workspace_resolution: list[dict[str, Any]] | None = None
    if typed_hermetic_offline:
        if stage != "offline-install":
            _fail("V3_HERMETIC_PNPM_ATTEMPT_INVALID")
        hermetic_contract = attempt["hermeticPnpmInstallContract"]
        validate_hermetic_pnpm_install_contract_v1(hermetic_contract, _load_json(core.V2_ARCHIVE)["entries"])
        if failure.get("classification") in {"PACKAGE_MANAGER_FAILURE", "EXTERNAL_INTERRUPTION"}:
            if failure.get("reason") != "V3_PODMAN_GATE_FAILED: offline-install":
                _fail("V3_PODMAN_ATTEMPT_FAILURE")
        elif failure.get("classification") == "HERMETIC_NETWORK_POLICY_VIOLATION":
            if failure.get("reason") != "V3_HERMETIC_PNPM_NETWORK_POLICY_VIOLATION":
                _fail("V3_PODMAN_ATTEMPT_FAILURE")
        else:
            _fail("V3_HERMETIC_PNPM_ATTEMPT_INVALID")
    elif typed_workspace_prerequisite:
        workspace_contract = attempt["workspacePrerequisiteBuildDag"]
        workspace_resolution = attempt["workspaceBuildResolution"]
        frozen_v2 = _load_json(core.V2_ARCHIVE).get("entries")
        if not isinstance(frozen_v2, list):
            _workspace_dag_fail("FROZEN_ENTRIES_INVALID")
        validate_workspace_prerequisite_build_dag_contract_v1(
            workspace_contract,
            frozen_v2,
        )
        validate_installed_workspace_build_resolution_v1(
            workspace_contract,
            workspace_resolution,
        )
        build_ids = {
            specification["id"]
            for specification in _workspace_prerequisite_command_specs_v1(
                workspace_contract,
            )
            if specification.get("kind") == "build"
        }
        if (
            stage not in build_ids
            or failure.get("classification") != "UPSTREAM_PREREQUISITE_BUILD_FAILURE"
            or failure.get("reason") != f"V3_PODMAN_GATE_FAILED: {stage}"
        ):
            _fail("V3_PODMAN_ATTEMPT_FAILURE")
    elif failure.get("classification") != "COMMAND_EXIT_NONZERO" or failure.get("reason") != f"V3_PODMAN_GATE_FAILED: {stage}":
        _fail("V3_PODMAN_ATTEMPT_FAILURE")
    expected_command_keys = {"id", "argv", "cwd", "env", "envAbsent", "network", "exitCode", "stdout", "stderr", "actualExecutor"}
    if typed_hermetic_offline:
        expected_command_keys.add("registryAttestation")
    if preseal_attempt is not None:
        expected_command_keys |= {"directRuntimePreparationSha256", "directRuntimeAttempt"}
    if set(command) != expected_command_keys or not isinstance(command.get("argv"), list) or not command["argv"] or not all(isinstance(part, str) and part for part in command["argv"]) or command.get("cwd") != "." or command.get("env") != ENV or command.get("envAbsent") != ENV_ABSENT or command.get("network") is not False or not isinstance(command.get("exitCode"), int) or isinstance(command["exitCode"], bool) or command["exitCode"] == 0:
        _fail("V3_PODMAN_ATTEMPT_COMMAND")
    if preseal_attempt is not None and (
        command["id"] != preseal_attempt["attempt"]["reachedStage"]
        or command["directRuntimePreparationSha256"]
        != preseal_attempt["preparationSha256"]
        or command["directRuntimeAttempt"] != preseal_attempt["attempt"]
    ):
        _direct_runtime_integration_fail("FAILED_ATTEMPT_PRESEAL_INVALID")
    executor = command.get("actualExecutor")
    environment_overrides = derive_generator_environment_overrides_v1(command["argv"])
    expected_effective_environment = {"CI": "true", "PATH": BOOTSTRAP_PATH, **environment_overrides}
    allowed_executor_keys = {"logicalArgv", "environment", "effectiveEnvironment", "environmentOverrides", "inheritedEnv", "payloadArgv", "argv", "toolchain"}
    if (
        not isinstance(executor, dict)
        or not set(executor) <= allowed_executor_keys
        or {"logicalArgv", "environment", "effectiveEnvironment", "inheritedEnv", "payloadArgv", "argv"} - set(executor)
        or executor.get("logicalArgv") != command["argv"]
        or executor.get("environment") != ENV
        or executor.get("effectiveEnvironment") != expected_effective_environment
        or executor.get("environmentOverrides", {}) != environment_overrides
        or (not environment_overrides and "environmentOverrides" in executor)
        or executor.get("inheritedEnv") != []
    ):
        _fail("V3_PODMAN_ATTEMPT_EXECUTOR")
    payload = executor.get("payloadArgv")
    actual_argv = executor.get("argv")
    if not isinstance(payload, list) or not payload or not all(isinstance(part, str) and part for part in payload) or not isinstance(actual_argv, list) or actual_argv[:5] != [PODMAN, "run", "--rm", "--network", "none"]:
        _fail("V3_PODMAN_ATTEMPT_EXECUTOR")
    try:
        image_index = actual_argv.index(IMAGE_RESOLVED)
    except ValueError:
        _fail("V3_PODMAN_ATTEMPT_EXECUTOR")
    override_assignments = [f"{name}={value}" for name, value in sorted(environment_overrides.items())]
    if actual_argv[image_index:] != [IMAGE_RESOLVED, "/usr/bin/env", "-i", "CI=true", f"PATH={BOOTSTRAP_PATH}", *override_assignments, *payload]:
        _fail("V3_PODMAN_ATTEMPT_EXECUTOR")
    if stage.startswith("inventory-"):
        expected_inventory = ["recursive-path-metadata-sha256", "/opt/pnpm"]
        if stage == "inventory-pnpmLauncher-pre" and command["argv"] != expected_inventory:
            _fail("V3_PODMAN_ATTEMPT_COMMAND")
        if len(command["argv"]) != 2 or command["argv"][0] != "recursive-path-metadata-sha256" or not command["argv"][1].startswith("/") or payload[:2] != [CONTAINER_NODE, "-e"] or len(payload) < 3 or "require(" not in payload[2] or re.search(r"\bimport\b", payload[2]):
            _fail("V3_PODMAN_ATTEMPT_COMMAND")
    elif stage == "offline-install":
        if typed_hermetic_offline:
            if command["argv"] != HERMETIC_PNPM_INSTALL or payload != [CONTAINER_NODE, CONTAINER_PNPM, *HERMETIC_PNPM_PAYLOAD_SUFFIX]:
                _fail("V3_HERMETIC_PNPM_ATTEMPT_INVALID")
        elif date == LEGACY_ATTEMPT_DATE and sequence == 1:
            if command["argv"] != ["pnpm", "install", "--offline", "--frozen-lockfile"] or payload != [CONTAINER_NODE, CONTAINER_PNPM, "install", "--offline", "--frozen-lockfile", f"--store-dir={CONTAINER_STORE}"]:
                _fail("V3_HERMETIC_PNPM_ATTEMPT_INVALID")
        else:
            _fail("V3_HERMETIC_PNPM_ATTEMPT_INVALID")
    elif typed_workspace_prerequisite:
        if workspace_contract is None:
            _workspace_dag_fail("EXECUTION_CONTRACT_INVALID")
        validate_workspace_prerequisite_pnpm_executor_v1(command, workspace_contract)
    elif stage == "materialize":
        if command["argv"] != ["node", "materialize-v3"] or payload != [
            CONTAINER_NODE,
            "/runner/materialize.mjs",
            "/runner/archive.json",
            "/runner/direct-runtime-source-packet.json",
            "/work",
        ]:
            _fail("V3_PODMAN_ATTEMPT_COMMAND")
    elif stage == "direct-runtime-materialization-probe":
        if command["argv"] != ["node", "direct-runtime-materialization-probe"] or payload != [
            CONTAINER_NODE,
            "/runner/direct-runtime-materialization-probe.mjs",
            "/runner/archive.json",
            "/runner/direct-runtime-source-packet.json",
            "/work",
        ]:
            _fail("V3_PODMAN_ATTEMPT_COMMAND")
    elif (
        stage == "generate-standard-pack-catalog"
        and command["argv"] == DIRECT_NODE_STANDARD_PACK_GENERATOR
        and payload != [CONTAINER_NODE, *DIRECT_NODE_STANDARD_PACK_GENERATOR[1:]]
    ):
        _fail("V3_PODMAN_ATTEMPT_COMMAND")
    elif (
        stage
        not in {
            "replay",
            "build-db",
            "build-auth",
            "build-backend",
            "build-advantage-play-kit-for-runtime",
            "direct-runtime-dist-identity",
            "direct-runtime-dist-identity-post-generator",
            "clear-stale-standard-pack-catalog",
            "generate-standard-pack-catalog",
            "accounts-test",
            "accounts-check-types",
            "backend-test",
            "backend-check-types",
            "graph-scan",
            "clean-audit",
            "compensation-denominator",
            "validate-workspace-prerequisite-resolution",
        }
        and re.fullmatch(r"(?:clear-workspace-prerequisite-output-[0-9]+-[0-9]+|verify-workspace-prerequisite-output-[0-9]+)", stage) is None
    ):
        _fail("V3_PODMAN_ATTEMPT_FAILURE")
    raw_streams: dict[str, str] = {}
    for stream in ("stdout", "stderr"):
        reference = command.get(stream)
        if not isinstance(reference, dict) or set(reference) != {"path", "sha256", "size"} or not isinstance(reference.get("path"), str):
            _fail("V3_PODMAN_ATTEMPT_RAW", stream)
        expected_prefix = f"{directory.name}/raw/"
        if not reference["path"].startswith(expected_prefix):
            _fail("V3_PODMAN_ATTEMPT_RAW", stream)
        filename = reference["path"][len(expected_prefix):]
        if not filename or "/" in filename or not filename.endswith(f".{stream}.txt"):
            _fail("V3_PODMAN_ATTEMPT_RAW", stream)
        raw_path = directory / "raw" / filename
        expected = _attempt_raw_reference(raw_path, directory)
        if reference != expected:
            _fail("V3_PODMAN_ATTEMPT_RAW", stream)
        if typed_hermetic_offline or typed_workspace_prerequisite:
            try:
                raw_streams[stream] = raw_path.read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError):
                _fail(
                    "V3_HERMETIC_PNPM_RAW_STREAM_INVALID"
                    if typed_hermetic_offline
                    else "V3_PODMAN_ATTEMPT_RAW_STREAM_INVALID",
                    stream,
                )
    if typed_workspace_prerequisite:
        assert workspace_contract is not None
        assert workspace_resolution is not None
        outcome = classify_workspace_build_dependency_failure_v1(
            workspace_contract,
            workspace_resolution,
            command,
            raw_streams["stdout"],
            raw_streams["stderr"],
        )
        expected_failure = {
            "stage": stage,
            "reason": f"V3_PODMAN_GATE_FAILED: {stage}",
            "classification": outcome["classification"],
            "commandId": stage,
            "workspaceBuildDependencyFailure": outcome,
        }
        if failure != expected_failure:
            _fail("V3_PODMAN_ATTEMPT_FAILURE")
        return
    if not typed_hermetic_offline:
        return
    assert hermetic_contract is not None
    if failure["classification"] in {"PACKAGE_MANAGER_FAILURE", "EXTERNAL_INTERRUPTION"}:
        outcome = classify_hermetic_pnpm_install_outcome_v1(
            command,
            stdout=raw_streams["stdout"],
            stderr=raw_streams["stderr"],
            contract=hermetic_contract,
            external_stop=failure["externalStop"],
        )
        expected_failure = {
            "stage": "offline-install",
            "reason": "V3_PODMAN_GATE_FAILED: offline-install",
            **{key: value for key, value in outcome.items() if key != "exitCode"},
        }
    else:
        counts = _hermetic_pnpm_marker_counts(raw_streams["stdout"], raw_streams["stderr"])
        network = hermetic_contract["network"]
        if counts["requests"] <= network["registryRequestsMaximum"] and counts["retryEvents"] <= network["retryEventsMaximum"]:
            _fail("V3_HERMETIC_PNPM_ATTEMPT_INVALID")
        expected_failure = {
            "stage": "offline-install",
            "reason": "V3_HERMETIC_PNPM_NETWORK_POLICY_VIOLATION",
            "classification": "HERMETIC_NETWORK_POLICY_VIOLATION",
            "commandId": "offline-install",
            "packageManagerDiagnostic": _pnpm_structured_diagnostic(raw_streams["stdout"], raw_streams["stderr"]),
            "externalStop": None,
            "registryAttestation": counts,
        }
    if failure != expected_failure or command["registryAttestation"] != expected_failure["registryAttestation"]:
        _fail("V3_HERMETIC_PNPM_ATTEMPT_INVALID")
def _archive_inventory(entries: list[dict[str, Any]]) -> dict[str, Any]:
    """Computes the mandated V3 source archive inventory.

    @param entries The ordered retained and supplemental archive entries.
    @returns Entry count and canonical metadata digest.
    """
    rows = [{key: entry[key] for key in ("kind", "mode", "path", "sha256", "size", "state")} for entry in entries]
    return {"entryCount": len(rows), "sha256": _sha256(_canonical(rows))}


def _supplement_entry(logical: str) -> dict[str, Any]:
    """Captures one non-derivable live source file as a hash-bound archive entry.

    @param logical The source path required by the frozen addendum.
    @returns A regular source archive entry.
    @throws core.ExecutionClosureValidationError When the source is missing or unsafe.
    """
    logical = _normal_path(logical)
    source = REPO_ROOT / logical
    try:
        resolved = source.resolve(strict=True)
        resolved.relative_to(REPO_ROOT.resolve())
    except (OSError, ValueError):
        _fail("V3_PODMAN_SUPPLEMENT_ESCAPE", logical)
    source_stat = source.lstat()
    if source.is_symlink() or not stat.S_ISREG(source_stat.st_mode):
        _fail("V3_PODMAN_SUPPLEMENT_UNSAFE", logical)
    data = source.read_bytes()
    return {
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


def _build_archive(
    direct_runtime_integration: dict[str, Any] | None = None,
    *,
    direct_runtime_preparation: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Builds the V3 archive from exact non-derived V2 entries and nine supplements.

    @param direct_runtime_integration Optional detached runtime packet integration.
    @param direct_runtime_preparation Optional pre-finalization detached source-packet preparation.
    @returns The source-complete candidate archive.
    """
    if (
        direct_runtime_integration is not None
        and direct_runtime_preparation is not None
    ):
        _direct_runtime_integration_fail("ARCHIVE_RUNTIME_BINDING_AMBIGUOUS")
    _, frozen = addendum._read_archive()
    retained: dict[str, dict[str, Any]] = {}
    for original in frozen:
        path = _normal_path(original.get("path"))
        if set(PurePosixPath(path).parts).isdisjoint(DERIVED_PARTS):
            if path in retained:
                _fail("V3_PODMAN_V2_DUPLICATE", path)
            retained[path] = copy.deepcopy(original)
    entries: dict[str, dict[str, Any]] = dict(retained)
    for path in SUPPLEMENTAL_PATHS:
        if path in entries:
            _fail("V3_PODMAN_SUPPLEMENT_ALREADY_RETAINED", path)
        entries[path] = _supplement_entry(path)
    ordered = [entries[path] for path in sorted(entries)]
    if len(retained) != 4249 or set(entries) != set(retained) | set(SUPPLEMENTAL_PATHS):
        _fail("V3_PODMAN_ARCHIVE_SELECTION_INVALID")
    archive = {
        "schemaVersion": 1,
        "kind": "execution-closure-source-archive",
        "retainedV2Archive": _reference(core.V2_ARCHIVE),
        "supplementalPaths": list(SUPPLEMENTAL_PATHS),
        "entries": ordered,
        "closureInventory": _archive_inventory(ordered),
    }
    if direct_runtime_integration is not None:
        validate_direct_command_runtime_runner_integration_v1(direct_runtime_integration)
        archive["directRuntimeSourcePacket"] = copy.deepcopy(direct_runtime_integration["sourcePacket"])
        archive["directRuntimePacketMaterialization"] = copy.deepcopy(direct_runtime_integration["packetMaterialization"])
        archive["directRuntimeBaselineReadSet"] = copy.deepcopy(direct_runtime_integration["readSet"]["baselineReadSet"])
    elif direct_runtime_preparation is not None:
        if not isinstance(direct_runtime_preparation, dict):
            _direct_runtime_integration_fail("ARCHIVE_PREPARATION_INVALID")
        packet = direct_runtime_preparation.get("sourcePacket")
        materialization = direct_runtime_preparation.get("packetMaterialization")
        budget = direct_runtime_preparation.get("resourceBudget")
        if not isinstance(packet, dict) or not isinstance(materialization, dict):
            _direct_runtime_integration_fail("ARCHIVE_PREPARATION_INVALID")
        _direct_runtime_resource_budget_v1(budget)
        _direct_runtime_validate_source_packet_v1(
            packet,
            packet.get("baselineReadSet"),
        )
        if (
            materialization
            != build_direct_command_runtime_packet_materialization_contract_v1(packet)
        ):
            _direct_runtime_integration_fail("ARCHIVE_PREPARATION_INVALID")
        archive["directRuntimeSourcePacket"] = copy.deepcopy(packet)
        archive["directRuntimePacketMaterialization"] = copy.deepcopy(materialization)
        archive["directRuntimeBaselineReadSet"] = copy.deepcopy(
            packet["baselineReadSet"],
        )
    return archive

def _stage_command(raw_dir: Path, raw_id: str, argv: list[str], *, actual_executor: dict[str, Any] | None = None) -> dict[str, Any]:
    """Runs one host-side evidence command and stages raw streams outside V3.

    @param raw_dir The temporary raw-stream directory.
    @param raw_id The globally unique raw-stream stem.
    @param argv The absolute host command argv.
    @param actual_executor Optional container executor provenance.
    @returns An unfinalized receipt-compatible command object.
    """
    result = subprocess.run(argv, cwd=REPO_ROOT, env=_host_execution_environment(), capture_output=True, text=True, check=False)
    stdout_path = raw_dir / f"{raw_id}.stdout.txt"
    stderr_path = raw_dir / f"{raw_id}.stderr.txt"
    stdout_path.parent.mkdir(parents=True, exist_ok=True)
    stdout_path.write_text(result.stdout, encoding="utf-8")
    stderr_path.write_text(result.stderr, encoding="utf-8")
    command: dict[str, Any] = {
        "argv": list(argv),
        "cwd": ".",
        "env": dict(ENV),
        "envAbsent": list(ENV_ABSENT),
        "network": False,
        "exitCode": result.returncode,
        "_rawId": raw_id,
        "_stdoutPath": stdout_path,
        "_stderrPath": stderr_path,
        "_stdoutText": result.stdout,
        "_stderrText": result.stderr,
    }
    if actual_executor is not None:
        command["actualExecutor"] = actual_executor
    return command


def _finalize_command(command: dict[str, Any], output: Path, *, reference_root: Path | None = None) -> dict[str, Any]:
    """Copies staged streams into V3 and replaces temporary paths with references.

    @param command The staged command object.
    @param output The newly permitted V3 output directory.
    @returns The final immutable command receipt object.
    @param reference_root Optional final logical root for staged output references.
    """
    value = copy.deepcopy(command)
    raw_id = value.pop("_rawId")
    stdout_source = Path(value.pop("_stdoutPath"))
    stderr_source = Path(value.pop("_stderrPath"))
    raw = output / "raw"
    logical_root = output if reference_root is None else reference_root
    stdout_text = value.pop("_stdoutText", None)
    stderr_text = value.pop("_stderrText", None)
    raw.mkdir(parents=True, exist_ok=True)
    stdout = raw / f"{raw_id}.stdout.txt"
    stderr = raw / f"{raw_id}.stderr.txt"
    if stdout.exists() or stderr.exists():
        _fail("V3_PODMAN_RAW_COLLISION", raw_id)
    if stdout_source.is_file():
        shutil.copyfile(stdout_source, stdout)
    elif isinstance(stdout_text, str):
        stdout.write_text(stdout_text, encoding="utf-8")
    else:
        _fail("V3_PODMAN_RAW_MISSING", raw_id)
    if stderr_source.is_file():
        shutil.copyfile(stderr_source, stderr)
    elif isinstance(stderr_text, str):
        stderr.write_text(stderr_text, encoding="utf-8")
    else:
        _fail("V3_PODMAN_RAW_MISSING", raw_id)
    value["stdout"] = _reference(stdout, logical_root / "raw" / stdout.name)
    value["stderr"] = _reference(stderr, logical_root / "raw" / stderr.name)
    return value


def _command_text(command: dict[str, Any], stream: str) -> str:
    """Reads one staged command stream before V3 publication.

    @param command The staged command object.
    @param stream The stdout or stderr stream name.
    @returns The captured stream text.
    """
    if stream not in {"stdout", "stderr"}:
        _fail("V3_PODMAN_RAW_STREAM_INVALID", stream)
    path_key = f"_{stream}Path"
    text_key = f"_{stream}Text"
    source = command.get(path_key)
    if source is not None:
        try:
            return Path(source).read_text(encoding="utf-8")
        except (OSError, TypeError, ValueError):
            pass
    captured = command.get(text_key)
    if isinstance(captured, str):
        return captured
    _fail("V3_PODMAN_RAW_MISSING", str(command.get("_rawId", stream)))


def _network_policy_failure_outcome(stdout: str, stderr: str, contract: dict[str, Any]) -> dict[str, Any]:
    """Builds the typed outcome for a recorded hermetic-network policy violation.

    @param stdout The captured pnpm standard output.
    @param stderr The captured pnpm standard error.
    @param contract The validated hash-bound hermetic install contract.
    @returns The policy-violation classification and observed marker counts.
    @throws core.ExecutionClosureValidationError When the raw streams do not violate the contract.
    """
    counts = _hermetic_pnpm_marker_counts(stdout, stderr)
    network = contract["network"]
    if counts["requests"] <= network["registryRequestsMaximum"] and counts["retryEvents"] <= network["retryEventsMaximum"]:
        _fail("V3_HERMETIC_PNPM_ATTEMPT_INVALID")
    return {
        "classification": "HERMETIC_NETWORK_POLICY_VIOLATION",
        "commandId": "offline-install",
        "packageManagerDiagnostic": _pnpm_structured_diagnostic(stdout, stderr),
        "externalStop": None,
        "registryAttestation": counts,
    }


def _host_git_capture(raw_dir: Path, suffix: str) -> dict[str, dict[str, Any]]:
    """Captures required live Git status and staged-diff source provenance.

    @param raw_dir The temporary stream directory.
    @param suffix The unique capture phase label.
    @returns The two staged host command records.
    @throws core.ExecutionClosureValidationError When Git cannot report local state.
    """
    commands = {
        "gitStatus": _stage_command(
            raw_dir,
            f"supplements-{suffix}-git-status",
            ["/usr/bin/git", "status", "--porcelain=v1", "--untracked-files=all"],
        ),
        "stagedDiff": _stage_command(
            raw_dir,
            f"supplements-{suffix}-staged-diff",
            ["/usr/bin/git", "diff", "--cached", "--binary", "--no-ext-diff"],
        ),
    }
    if any(command["exitCode"] != 0 for command in commands.values()):
        _fail("V3_PODMAN_GIT_CAPTURE_FAILED", suffix)
    return commands


def _supplement_metadata(archive: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Returns the required immutable metadata for all nine supplemental entries.

    @param archive The built V3 archive.
    @returns The capture metadata map ordered by path.
    """
    by_path = {entry["path"]: entry for entry in archive["entries"]}
    return {
        path: {key: by_path[path][key] for key in ("path", "sha256", "size", "mode")}
        for path in sorted(SUPPLEMENTAL_PATHS)
    }


def _runner_scripts(
    stage: Path,
    archive_path: Path,
    nested_pnpm_runtime: dict[str, Any],
    direct_runtime_integration: dict[str, Any] | None = None,
    *,
    direct_runtime_preparation: dict[str, Any] | None = None,
) -> list[dict[str, str]]:
    """Writes bounded Node-only materialization and audit runner tools in /tmp.

    @param stage The unique temporary staging root.
    @param archive_path The staged archive input file.
    @param nested_pnpm_runtime The exact nested pnpm runtime-shim contract to stage.
    @param direct_runtime_integration Optional finalizer-sealed trace integration.
    @param direct_runtime_preparation Optional pre-finalization source-packet preparation.
    @returns Explicit read-only runner-tool mount specifications.
    """
    validate_nested_pnpm_runtime_shim_contract_v1(nested_pnpm_runtime)
    if (
        direct_runtime_integration is not None
        and direct_runtime_preparation is not None
    ):
        _direct_runtime_integration_fail("RUNNER_RUNTIME_BINDING_AMBIGUOUS")
    if direct_runtime_integration is not None:
        validate_direct_command_runtime_runner_integration_v1(direct_runtime_integration)
    elif direct_runtime_preparation is not None:
        packet = direct_runtime_preparation.get("sourcePacket")
        materialization = direct_runtime_preparation.get("packetMaterialization")
        if not isinstance(packet, dict) or not isinstance(materialization, dict):
            _direct_runtime_integration_fail("RUNNER_PREPARATION_INVALID")
        _direct_runtime_validate_source_packet_v1(
            packet,
            packet.get("baselineReadSet"),
        )
        if (
            materialization
            != build_direct_command_runtime_packet_materialization_contract_v1(packet)
        ):
            _direct_runtime_integration_fail("RUNNER_PREPARATION_INVALID")
    runner = stage / "runner"
    runner.mkdir(parents=True, exist_ok=True)
    scripts = {
        "materialize.mjs": r'''import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const [archivePath, sourcePacketPath, root] = process.argv.slice(2);
if (!archivePath || !sourcePacketPath || !root) throw new Error("archive, source packet, and work root are required");
const archive = JSON.parse(fs.readFileSync(archivePath, "utf8"));
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");
const gitBlobDigest = (value) => crypto.createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${value.length}\0`), value])).digest("hex");
const safe = (logical) => typeof logical === "string" && logical && !logical.includes("\\") && !logical.split("/").some((part) => !part || part === "." || part === "..");
const rootPath = path.resolve(root);
if (!fs.existsSync(rootPath) || !fs.statSync(rootPath).isDirectory()) throw new Error("work root missing");
if (fs.readdirSync(rootPath).length) throw new Error("work root was not empty");
const written = new Set();
const destinationFor = (logical) => {
  if (!safe(logical)) throw new Error(`unsafe path ${logical}`);
  const destination = path.resolve(rootPath, logical);
  if (path.relative(rootPath, destination).startsWith("..") || destination === rootPath) throw new Error("path escape");
  if (written.has(logical) || fs.existsSync(destination)) throw new Error(`conflicting materialization ${logical}`);
  return destination;
};
const writeRegular = (entry, data) => {
  if (!entry || typeof entry !== "object" || !safe(entry.path) || typeof entry.mode !== "string") throw new Error("invalid regular entry");
  const destination = destinationFor(entry.path);
  if (data.length !== entry.size || digest(data) !== entry.sha256 || gitBlobDigest(data) !== entry.gitBlobSha1) throw new Error(`packet identity mismatch ${entry.path}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, data, { mode: Number.parseInt(entry.mode.slice(-3), 8) });
  fs.chmodSync(destination, Number.parseInt(entry.mode.slice(-3), 8));
  written.add(entry.path);
};
for (const entry of archive.entries ?? []) {
  if (!entry || typeof entry !== "object" || !safe(entry.path)) throw new Error("unsafe archive entry");
  const destination = destinationFor(entry.path);
  if (entry.kind === "symlink") {
    if (typeof entry.symlinkTarget !== "string" || path.isAbsolute(entry.symlinkTarget) || entry.symlinkTarget.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("unsafe symlink");
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.symlinkSync(entry.symlinkTarget, destination);
    written.add(entry.path);
    continue;
  }
  const data = Buffer.from(entry.contentBase64, "base64");
  if (data.length !== entry.size || digest(data) !== entry.sha256) throw new Error(`archive digest mismatch ${entry.path}`);
  if (typeof entry.mode !== "string") throw new Error("archive mode invalid");
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, data, { mode: Number.parseInt(entry.mode.slice(-3), 8) });
  fs.chmodSync(destination, Number.parseInt(entry.mode.slice(-3), 8));
  written.add(entry.path);
}
let directRuntimeMaterialization;
if (archive.directRuntimePacketMaterialization !== undefined) {
  const materialization = archive.directRuntimePacketMaterialization;
  const packet = JSON.parse(fs.readFileSync(sourcePacketPath, "utf8"));
  if (!materialization || materialization.source !== "DETACHED_GIT_OBJECT_PACKET_ONLY" || materialization.targetRoot !== "/work" || materialization.liveWorktreeFallback !== "REJECT" || materialization.realProbePolicy !== "IN_CONTAINER_HASH_MODE_EXACT") throw new Error("materialization contract invalid");
  if (!packet || packet.packetSha256 !== materialization.sourcePacketSha256 || archive.directRuntimeSourcePacket?.packetSha256 !== packet.packetSha256) throw new Error("source packet mismatch");
  if (!Array.isArray(packet.objects) || !Array.isArray(materialization.entries) || packet.objects.length !== materialization.entries.length) throw new Error("packet entry count mismatch");
  const objects = new Map(packet.objects.map((entry) => [entry?.path, entry]));
  if (objects.size !== packet.objects.length) throw new Error("duplicate packet object");
  for (const expected of materialization.entries) {
    const object = objects.get(expected?.path);
    if (!object || !["path", "gitBlobSha1", "sha256", "size", "mode"].every((key) => object[key] === expected[key])) throw new Error(`packet object identity mismatch ${expected?.path}`);
    const data = Buffer.from(object.contentBase64, "base64");
    writeRegular(expected, data);
  }
  directRuntimeMaterialization = {
    sourcePacketSha256: materialization.sourcePacketSha256,
    entries: materialization.entries,
  };
}
process.stdout.write(JSON.stringify({ entryCount: written.size, inventory: archive.closureInventory, ...(directRuntimeMaterialization ? { directRuntimeMaterialization } : {}) }));
''',
        "replay.mjs": r'''import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const [archivePath, root] = process.argv.slice(2);
const archive = JSON.parse(fs.readFileSync(archivePath, "utf8"));
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");
const outside = [];
const generated = [];
for (const entry of archive.entries) {
  const candidate = path.join(root, entry.path);
  const resolved = fs.realpathSync.native(candidate);
  if (!resolved.startsWith(`${root}/`)) outside.push(entry.path);
  if (entry.kind === "file" && digest(fs.readFileSync(candidate)) !== entry.sha256) throw new Error(`drift ${entry.path}`);
  if (entry.path.split("/").some((part) => [".next", "node_modules", "dist", "build", ".turbo", "coverage", "target"].includes(part))) generated.push(entry.path);
}
process.stdout.write(JSON.stringify({ inventory: archive.closureInventory, sourcePathsOutsideWork: outside, preexistingGeneratedPaths: generated }));
''',
        "audit.mjs": r'''import fs from "node:fs";
import path from "node:path";
const [archivePath, root] = process.argv.slice(2);
const archive = JSON.parse(fs.readFileSync(archivePath, "utf8"));
const outside = [];
for (const entry of archive.entries) {
  const candidate = path.join(root, entry.path);
  const resolved = fs.realpathSync.native(candidate);
  if (!resolved.startsWith(`${root}/`)) outside.push(entry.path);
}
process.stdout.write(JSON.stringify({ sourcePathsOutsideWork: outside }));
''',
        "direct-runtime-materialization-probe.mjs": r'''import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const [archivePath, sourcePacketPath, root] = process.argv.slice(2);
const archive = JSON.parse(fs.readFileSync(archivePath, "utf8"));
const packet = JSON.parse(fs.readFileSync(sourcePacketPath, "utf8"));
const directRuntimeMaterialization = archive.directRuntimePacketMaterialization;
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");
const gitBlobDigest = (value) => crypto.createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${value.length}\0`), value])).digest("hex");
const safe = (logical) => typeof logical === "string" && logical && !logical.includes("\\") && !logical.split("/").some((part) => !part || part === "." || part === "..");
if (!directRuntimeMaterialization || directRuntimeMaterialization.sourcePacketSha256 !== packet.packetSha256 || directRuntimeMaterialization.targetRoot !== "/work") throw new Error("materialization provenance mismatch");
for (const expected of directRuntimeMaterialization.entries) {
  if (!expected || !safe(expected.path)) throw new Error("unsafe materialization probe path");
  const destination = path.resolve(root, expected.path);
  if (path.relative(path.resolve(root), destination).startsWith("..")) throw new Error("probe path escape");
  const metadata = fs.lstatSync(destination);
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error(`materialized entry is not regular ${expected.path}`);
  const data = fs.readFileSync(destination);
  const mode = `100${(metadata.mode & 0o777).toString(8).padStart(3, "0")}`;
  if (data.length !== expected.size || digest(data) !== expected.sha256 || gitBlobDigest(data) !== expected.gitBlobSha1 || mode !== expected.mode) throw new Error(`materialized entry mismatch ${expected.path}`);
}
process.stdout.write(JSON.stringify({ sourcePacketSha256: directRuntimeMaterialization.sourcePacketSha256, entries: directRuntimeMaterialization.entries }));
''',
        "direct-runtime-tracer.mjs": r'''import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
const traceConfigPath = process.env.DIRECT_RUNTIME_TRACE_CONFIG_PATH ?? "/runner/direct-runtime-trace-config.json";
const config = JSON.parse(fs.readFileSync(traceConfigPath, "utf8"));
const generatorScript = config.generatorScript;
const generatorResolvedPath = config.generatorResolvedPath;
const resolvedArgvOne = typeof process.argv[1] === "string" ? path.resolve(process.argv[1]) : "";
if (resolvedArgvOne === generatorResolvedPath) {
  if (process.env.NODE_OPTIONS !== config.nodeOptions) throw new Error("generator NODE_OPTIONS provenance invalid");
  register(new URL("./direct-runtime-fs-promises-loader.mjs", import.meta.url), import.meta.url, {
    data: { traceConfigPath, generatorPid: process.pid, generatorScript, generatorResolvedPath },
  });
}
''',
        "direct-runtime-fs-promises-loader.mjs": r'''const wrapperUrl = new URL("./direct-runtime-fs-promises-wrapper.mjs", import.meta.url).href;
export async function resolve(specifier, context, nextResolve) {
  if ((specifier === "node:fs/promises" || specifier === "fs/promises") && context.parentURL !== wrapperUrl) {
    return { url: wrapperUrl, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
''',
        "direct-runtime-fs-promises-wrapper.mjs": r'''import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as actual from "node:fs/promises";
export * from "node:fs/promises";
const configPath = process.env.DIRECT_RUNTIME_TRACE_CONFIG_PATH ?? "/runner/direct-runtime-trace-config.json";
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const generatorScript = config.generatorScript;
const generatorResolvedPath = config.generatorResolvedPath;
const resolvedArgvOne = typeof process.argv[1] === "string" ? path.resolve(process.argv[1]) : "";
if (
  config.evidence !== "IN_CONTAINER_TRACER_RAW_ARTIFACT_ONLY"
  || config.tracer !== "direct-runtime-tracer"
  || typeof config.nonce !== "string"
  || typeof config.packetSha256 !== "string"
  || typeof config.rawEventArtifact !== "string"
  || typeof config.artifactPath !== "string"
  || typeof config.targetRoot !== "string"
  || !path.isAbsolute(config.targetRoot)
  || typeof generatorScript !== "string"
  || typeof generatorResolvedPath !== "string"
  || !path.isAbsolute(generatorResolvedPath)
  || path.resolve(config.targetRoot, generatorScript) !== generatorResolvedPath
  || resolvedArgvOne !== generatorResolvedPath
  || process.env.NODE_OPTIONS !== config.nodeOptions
  || config.activation !== "INHERITED_NODE_OPTIONS_EXACT_GENERATOR_SCRIPT_ONLY"
  || !["EXCLUDED", "PNPM_PARENT_EXCLUDED"].includes(config.parentPnpm)
) throw new Error("trace config invalid");
const generatorPid = process.pid;
const baselineByPath = new Map((config.baselineReadSet ?? []).map((entry) => [entry.path, entry]));
const derivedByPath = new Map((config.derivedBuildReadSet ?? []).map((entry) => [entry.path, entry]));
const outputPaths = new Set(config.outputPaths ?? []);
const artifactPath = config.artifactPath;
const artifactRelative = path.relative(config.targetRoot, artifactPath);
if (artifactRelative.startsWith("..") || path.isAbsolute(artifactRelative)) throw new Error("raw trace artifact escapes work root");
if (fs.existsSync(artifactPath)) throw new Error("raw trace artifact already exists");
fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
let ordinal = 0;
const logicalPath = (target) => {
  const value = target instanceof URL ? fileURLToPath(target) : target;
  if (typeof value !== "string") return null;
  const resolved = path.resolve(value);
  const relative = path.relative(config.targetRoot, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return relative.split(path.sep).join("/");
};
const append = (kind, value) => {
  if (ordinal >= config.maxEvents) throw new Error("raw trace event cap exceeded");
  const event = { nonce: config.nonce, ordinal, kind, value, tracer: "direct-runtime-tracer", packetSha256: config.packetSha256, rawEventArtifact: config.rawEventArtifact, generatorPid, generatorScript: generatorResolvedPath };
  fs.appendFileSync(artifactPath, `${JSON.stringify(event)}\n`, { encoding: "utf8" });
  ordinal += 1;
};
const record = (access, target) => {
  const logical = logicalPath(target);
  if (logical === null) return;
  if (access === "write") {
    append(outputPaths.has(logical) ? "WRITE" : "UNDECLARED", { path: logical, kind: "DERIVED_OUTPUT" });
    return;
  }
  if (baselineByPath.has(logical)) {
    append("BASELINE_READ", baselineByPath.get(logical));
    return;
  }
  if (derivedByPath.has(logical)) {
    append("DERIVED_BUILD_READ", derivedByPath.get(logical));
    return;
  }
  append("UNDECLARED", { path: logical });
};
const writeFlags = (flags) => typeof flags === "string" ? /[wa+]/.test(flags) : typeof flags === "number" && (flags & 3) !== 0;
export async function readFile(...args) { record("read", args[0]); return actual.readFile(...args); }
export async function readdir(...args) { record("read", args[0]); return actual.readdir(...args); }
export async function stat(...args) { record("read", args[0]); return actual.stat(...args); }
export async function lstat(...args) { record("read", args[0]); return actual.lstat(...args); }
export async function access(...args) { record("read", args[0]); return actual.access(...args); }
export async function open(...args) { record(writeFlags(args[1]) ? "write" : "read", args[0]); return actual.open(...args); }
export async function writeFile(...args) { record("write", args[0]); return actual.writeFile(...args); }
export async function appendFile(...args) { record("write", args[0]); return actual.appendFile(...args); }
export async function mkdir(...args) { record("write", args[0]); return actual.mkdir(...args); }
export async function rm(...args) { record("write", args[0]); return actual.rm(...args); }
export async function unlink(...args) { record("write", args[0]); return actual.unlink(...args); }
export async function rename(...args) { record("write", args[0]); record("write", args[1]); return actual.rename(...args); }
''',
        "direct-runtime-trace-receipt.mjs": r'''import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const [configPath] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
if (
  config.evidence !== "IN_CONTAINER_TRACER_RAW_ARTIFACT_ONLY"
  || config.tracer !== "direct-runtime-tracer"
  || config.activation !== "INHERITED_NODE_OPTIONS_EXACT_GENERATOR_SCRIPT_ONLY"
  || typeof config.generatorScript !== "string"
  || typeof config.generatorResolvedPath !== "string"
) throw new Error("trace receipt config invalid");
const raw = fs.existsSync(config.artifactPath) ? fs.readFileSync(config.artifactPath, "utf8") : "";
const events = raw === "" ? [] : raw.trimEnd().split("\n").map((line) => JSON.parse(line));
if (!events.length) throw new Error("generator child emitted no raw trace events");
const generatorPid = events[0].generatorPid;
const generatorScript = events[0].generatorScript;
if (!Number.isInteger(generatorPid) || generatorPid <= 0 || generatorScript !== config.generatorResolvedPath || events.some((event) => event.generatorPid !== generatorPid || event.generatorScript !== generatorScript || event.nonce !== config.nonce || event.packetSha256 !== config.packetSha256 || event.tracer !== config.tracer || event.rawEventArtifact !== config.rawEventArtifact)) throw new Error("mixed generator child trace provenance");
const rawArtifact = { sha256: crypto.createHash("sha256").update(raw).digest("hex"), size: Buffer.byteLength(raw) };
fs.rmSync(config.artifactPath, { force: true });
try { fs.rmdirSync(path.dirname(config.artifactPath)); } catch { /* absent or not empty is deliberate evidence */ }
process.stdout.write(JSON.stringify({ schemaVersion: 1, kind: "direct-command-runtime-in-container-trace-receipt", evidence: "IN_CONTAINER_TRACER_RAW_ARTIFACT_ONLY", tracer: "direct-runtime-tracer", rawEventArtifact: config.rawEventArtifact, nonce: config.nonce, packetSha256: config.packetSha256, generatorPid, generatorScript, truncated: false, events, rawArtifact }));
''',
        "direct-runtime-dist-identity.mjs": r'''import fs from "node:fs";
import crypto from "node:crypto";
const request = JSON.parse(process.argv[2] ?? "");
const expected = request?.expected;
const attemptNonceSha256 = request?.attemptNonceSha256;
const workRoot = request?.workRoot;
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");
const safe = (logical) => typeof logical === "string" && logical && !logical.includes("\\") && !logical.split("/").some((part) => !part || part === "." || part === "..");
if (!Array.isArray(expected) || workRoot !== "/work" || typeof attemptNonceSha256 !== "string" || !/^[0-9a-f]{64}$/.test(attemptNonceSha256)) throw new Error("invalid same-attempt identity request");
const root = fs.realpathSync.native(process.cwd());
if (root !== workRoot) throw new Error("unexpected work root");
const derivedBuildReadSet = expected.map((identity) => {
  if (!identity || typeof identity !== "object" || !safe(identity.path)) throw new Error("unsafe derived-read path");
  const logicalMetadata = fs.lstatSync(identity.path);
  if (!logicalMetadata.isFile() || logicalMetadata.isSymbolicLink()) throw new Error("derived-read logical path is not a regular file");
  const resolved = fs.realpathSync.native(identity.path);
  if (!resolved.startsWith(`${root}/`)) throw new Error("derived-read path escape");
  const metadata = fs.lstatSync(resolved);
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error("derived-read is not a regular file");
  const data = fs.readFileSync(resolved);
  const mode = "100" + (metadata.mode & 0o777).toString(8).padStart(3, "0");
  return { mode, path: identity.path, resolvedPath: resolved, sha256: digest(data), size: data.length };
});
process.stdout.write(JSON.stringify({ attemptNonceSha256, derivedBuildReadSet, workRoot }));
''',
    }
    mounts: list[dict[str, str]] = [{
        "id": "runnerTool:archive",
        "source": str(archive_path.resolve()),
        "target": "/runner/archive.json",
        "access": "ro",
        "purpose": "hash-bound-source-archive-input",
    }]
    packet_for_mount: dict[str, Any] | None = None
    if direct_runtime_integration is not None:
        packet_for_mount = direct_runtime_integration["sourcePacket"]
    elif direct_runtime_preparation is not None:
        packet_for_mount = direct_runtime_preparation["sourcePacket"]
    if packet_for_mount is not None:
        source_packet = runner / "direct-runtime-source-packet.json"
        _write_json(source_packet, packet_for_mount)
        mounts.append({
            "id": "runnerTool:direct-runtime-source-packet",
            "source": str(source_packet.resolve()),
            "target": "/runner/direct-runtime-source-packet.json",
            "access": "ro",
            "purpose": "detached-baseline-git-object-source-packet",
        })
    if direct_runtime_integration is not None:
        trace_policy = direct_runtime_integration["tracePolicy"]
        if trace_policy["nodeOptions"] != DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS:
            _direct_runtime_integration_fail("GENERATOR_NODE_OPTIONS_INVALID")
        trace_config = runner / "direct-runtime-trace-config.json"
        _write_json(trace_config, {
            "schemaVersion": 1,
            "kind": "direct-command-runtime-in-container-trace-config",
            "evidence": trace_policy["evidence"],
            "tracer": trace_policy["tracer"],
            "rawEventArtifact": trace_policy["rawEventArtifact"],
            "nonce": trace_policy["nonce"],
            "packetSha256": direct_runtime_integration["sourcePacket"]["packetSha256"],
            "maxEvents": trace_policy["maxEvents"],
            "targetRoot": "/work",
            "artifactPath": "/work/.direct-runtime-trace/direct-runtime-raw-events.jsonl",
            "generatorScript": trace_policy["generatorScript"],
            "generatorResolvedPath": trace_policy["generatorResolvedPath"],
            "nodeOptions": DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS,
            "activation": trace_policy["activation"],
            "parentPnpm": trace_policy["parentPnpm"],
            "baselineReadSet": direct_runtime_integration["readSet"]["baselineReadSet"],
            "derivedBuildReadSet": direct_runtime_integration["readSet"]["derivedBuildReadSet"],
            "outputPaths": direct_runtime_integration["readSet"]["outputPaths"],
        })
        mounts.append({
            "id": "runnerTool:direct-runtime-trace-config",
            "source": str(trace_config.resolve()),
            "target": DIRECT_RUNTIME_TRACE_CONFIG_PATH,
            "access": "ro",
            "purpose": "nonce-bound-in-container-esm-tracer-config",
        })
    for filename, contents in scripts.items():
        path = runner / filename
        path.write_text(contents, encoding="utf-8")
        mount_id = f"runnerTool:{filename.removesuffix('.mjs')}"
        mounts.append({
            "id": mount_id,
            "source": str(path.resolve()),
            "target": f"/runner/{filename}",
            "access": "ro",
            "purpose": "node-only-isolated-runner-tool",
        })
    shim_path = runner / "nested-pnpm-shim"
    shim_path.write_bytes(NESTED_PNPM_RUNTIME_SHIM_BYTES)
    shim_path.chmod(0o755)
    shim_stat = shim_path.stat()
    artifact = nested_pnpm_runtime["artifact"]
    if (
        shim_path.is_symlink()
        or not stat.S_ISREG(shim_stat.st_mode)
        or f"100{stat.S_IMODE(shim_stat.st_mode):03o}" != artifact["mode"]
        or shim_stat.st_size != artifact["size"]
        or _sha256(shim_path.read_bytes()) != artifact["sha256"]
    ):
        _fail("V3_NESTED_PNPM_RUNTIME_SHIM_STAGE_INVALID")
    mounts.append({
        **nested_pnpm_runtime["mount"],
        "source": str(shim_path.resolve()),
    })
    return mounts


def _ensure_external_source(path: Path, name: str) -> Path:
    """Returns one safe resolved external tool or store source.

    @param path The expected host source path.
    @param name The stable diagnostic source name.
    @returns The absolute resolved path.
    @throws core.ExecutionClosureValidationError When the source is unavailable.
    """
    try:
        resolved = path.resolve(strict=True)
    except OSError:
        _fail("V3_PODMAN_EXTERNAL_SOURCE_MISSING", name)
    if not resolved.is_file() and not resolved.is_dir():
        _fail("V3_PODMAN_EXTERNAL_SOURCE_UNSAFE", name)
    return resolved


def build_direct_node_split_canonical_prefix_v1(
    mounts: list[dict[str, Any]],
    workdir: str,
) -> list[str]:
    """Builds the only direct-Node Podman prefix from ordered structured mounts.

    @param mounts The ordered, structured mount records whose exact volume pairs are emitted.
    @param workdir The exact permitted root or advantage-play-kit package working directory.
    @returns The complete Podman argv prefix before the image reference.
    @throws core.ExecutionClosureValidationError When a mount record, mode, or workdir is not canonical.
    """
    package_cwd = "/work/packages/advantage-play-kit"
    if (
        not isinstance(mounts, list)
        or not isinstance(workdir, str)
        or workdir not in {"/work", package_cwd}
    ):
        _fail("V3_DIRECT_NODE_SPLIT_CANONICAL_PREFIX_INVALID")
    prefix = [PODMAN, "run", "--rm", "--network", "none", "--workdir", workdir]
    seen_ids: set[str] = set()
    seen_targets: set[str] = set()
    common_fields = {"id", "source", "target", "access", "purpose"}
    for mount in mounts:
        if not isinstance(mount, dict):
            _fail("V3_DIRECT_NODE_SPLIT_CANONICAL_PREFIX_INVALID")
        access = mount.get("access")
        expected_fields = (
            common_fields
            if access in {"ro", "rw"}
            else common_fields | {"lowerAccess", "overlay"}
        )
        if (
            set(mount) != expected_fields
            or access not in {"ro", "rw", "cow-overlay"}
            or not isinstance(mount.get("id"), str)
            or not mount["id"]
            or not isinstance(mount.get("purpose"), str)
            or not mount["purpose"]
            or not isinstance(mount.get("source"), str)
            or not isinstance(mount.get("target"), str)
            or not mount["source"]
            or not mount["target"]
            or mount["id"] in seen_ids
            or mount["target"] in seen_targets
            or any(
                forbidden in value
                for value in (mount["source"], mount["target"])
                for forbidden in ("\x00", "\n", "\r", ":")
            )
        ):
            _fail("V3_DIRECT_NODE_SPLIT_CANONICAL_PREFIX_INVALID")
        source = mount["source"]
        target = mount["target"]
        source_path = PurePosixPath(source)
        target_path = PurePosixPath(target)
        if (
            not source_path.is_absolute()
            or source_path.as_posix() != source
            or not target_path.is_absolute()
            or target_path.as_posix() != target
            or any(part in {".", ".."} for part in source_path.parts)
            or any(part in {".", ".."} for part in target_path.parts)
            or (
                access == "cow-overlay"
                and (
                    mount.get("lowerAccess") != "ro"
                    or mount.get("overlay") != "podman-O-disposable"
                )
            )
        ):
            _fail("V3_DIRECT_NODE_SPLIT_CANONICAL_PREFIX_INVALID")
        seen_ids.add(mount["id"])
        seen_targets.add(target)
        suffix = "O" if access == "cow-overlay" else access
        prefix.extend(["--volume", f"{source}:{target}:{suffix}"])
    return prefix


def _podman_context(
    stage: Path,
    archive_path: Path,
    nested_pnpm_runtime: dict[str, Any],
    direct_runtime_integration: dict[str, Any] | None = None,
    *,
    direct_runtime_preparation: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Builds exact Podman mount and executor configuration for one unique /tmp root.

    @param stage The unique temporary staging root.
    @param archive_path The staged V3 archive.
    @param nested_pnpm_runtime The exact nested pnpm runtime-shim contract to mount.
    @param direct_runtime_integration Optional finalizer-sealed trace integration.
    @param direct_runtime_preparation Optional pre-finalization source-packet preparation.
    @returns The isolated execution context before any container command runs.
    """
    if (
        direct_runtime_integration is not None
        and direct_runtime_preparation is not None
    ):
        _direct_runtime_integration_fail("CONTEXT_RUNTIME_BINDING_AMBIGUOUS")
    work = stage / "work"
    work.mkdir()
    preexisting = sorted(item.relative_to(work).as_posix() for item in work.rglob("*"))
    if preexisting:
        _fail("V3_PODMAN_WORK_ROOT_NOT_EMPTY")
    pnpm = _ensure_external_source(HOST_PNPM, "pnpmLauncher")
    store = _ensure_external_source(HOST_STORE, "pnpmStore")
    repo_graph = _ensure_external_source(HOST_REPO_GRAPH, "repoGraph")
    runner_mounts = _runner_scripts(
        stage,
        archive_path,
        nested_pnpm_runtime,
        direct_runtime_integration=direct_runtime_integration,
        direct_runtime_preparation=direct_runtime_preparation,
    )
    if (
        direct_runtime_integration is not None
        or direct_runtime_preparation is not None
    ) and not any(
        mount["id"] == "runnerTool:direct-runtime-source-packet"
        for mount in runner_mounts
    ):
        _direct_runtime_integration_fail("SOURCE_PACKET_MOUNT_MISSING")
    work_realpath = str(work.resolve())
    mounts: list[dict[str, Any]] = [
        {
            "id": "work",
            "source": work_realpath,
            "target": "/work",
            "access": "rw",
            "purpose": "clean-materialized-closure",
        },
        {
            "id": "pnpmLauncher",
            "source": str(pnpm),
            "target": "/opt/pnpm",
            "access": "ro",
            "purpose": "verified-pnpm-launcher-package",
        },
        {
            "id": "pnpmStore",
            "source": str(store),
            "target": CONTAINER_STORE,
            "access": "cow-overlay",
            "lowerAccess": "ro",
            "overlay": "podman-O-disposable",
            "purpose": "offline-pnpm-store-with-disposable-copy-on-write-layer",
        },
        {
            "id": "repoGraph",
            "source": str(repo_graph),
            "target": CONTAINER_REPO_GRAPH,
            "access": "ro",
            "purpose": "verified-repo-graph-executable",
        },
        *runner_mounts,
    ]
    prefix = build_direct_node_split_canonical_prefix_v1(mounts, "/work")
    executors = [
        CONTAINER_NODE,
        CONTAINER_PNPM,
        CONTAINER_REPO_GRAPH,
        "/bin/rm",
        "/bin/cat",
        *[mount["target"] for mount in runner_mounts],
    ]
    return {
        "stage": stage,
        "work": work,
        "cleanWorkRoot": {
            "hostPath": str(work.absolute()),
            "realpath": work_realpath,
            "containerPath": "/work",
            "preexistingPaths": preexisting,
            "lifecycle": "UNIQUE_EPHEMERAL",
        },
        "mounts": mounts,
        "prefix": prefix,
        "declaredExecutors": executors,
    }


def _direct_node_split_frozen_script_v1() -> dict[str, Any]:
    """Derives the one executor-accepted H2 script carrier from pinned V2 evidence.

    @returns The exact frozen script provenance derived from the integrity-pinned V2 archive.
    @throws core.ExecutionClosureValidationError When the V2 archive or selected manifest cannot prove the H2 script.
    """
    if _reference(core.V2_ARCHIVE) != core.V2_EVIDENCE.get("archive"):
        _fail("V3_DIRECT_NODE_SPLIT_EXECUTOR_INVALID")
    frozen = _load_json(core.V2_ARCHIVE)
    frozen_entries = frozen.get("entries")
    if not isinstance(frozen_entries, list):
        _fail("V3_DIRECT_NODE_SPLIT_EXECUTOR_INVALID")
    frozen_index, trigger = _direct_runtime_trigger_v1(
        frozen_entries,
        list(STANDARD_PACK_GENERATOR),
    )
    manifest_reference = trigger.get("manifest") if isinstance(trigger, dict) else None
    manifest_path = (
        manifest_reference.get("path")
        if isinstance(manifest_reference, dict)
        else None
    )
    frozen_manifest = (
        frozen_index.get(manifest_path)
        if isinstance(manifest_path, str)
        else None
    )
    if not isinstance(frozen_manifest, dict):
        _fail("V3_DIRECT_NODE_SPLIT_EXECUTOR_INVALID")
    semantics = derive_direct_node_split_semantics_from_frozen_script_v1(
        trigger,
        frozen_manifest,
    )
    frozen_script = semantics.get("frozenScript")
    if not isinstance(frozen_script, dict):
        _fail("V3_DIRECT_NODE_SPLIT_EXECUTOR_INVALID")
    return copy.deepcopy(frozen_script)


def _direct_node_split_executor_overrides_v1(
    context: dict[str, Any],
    logical: list[str],
    payload: list[str],
) -> dict[str, str] | None:
    """Validates one H2 semantic command context and returns its exact environment overrides.

    @param context The candidate container context, optionally carrying direct-Node split provenance.
    @param logical The logical command argv recorded for the container operation.
    @param payload The absolute container payload argv for the operation.
    @returns The H2 segment override map, or None when no H2 semantic context is present.
    @throws core.ExecutionClosureValidationError When a semantic context drifts from the frozen two-segment contract.
    """
    direct_split = context.get("directNodeSplit") if isinstance(context, dict) else None
    if direct_split is None:
        return None
    if not isinstance(direct_split, dict) or set(direct_split) != {
        "frozenScript",
        "cleanEnvironment",
        "segment",
    }:
        _fail("V3_DIRECT_NODE_SPLIT_EXECUTOR_INVALID")
    frozen_script = direct_split["frozenScript"]
    clean_environment = direct_split["cleanEnvironment"]
    segment = direct_split["segment"]
    if not isinstance(frozen_script, dict) or not isinstance(segment, dict):
        _fail("V3_DIRECT_NODE_SPLIT_EXECUTOR_INVALID")
    expected_frozen_script = _direct_node_split_frozen_script_v1()
    expected_clean_environment = {
        "allowlisted": dict(ENV),
        "absencePredicates": list(ENV_ABSENT),
        "effectiveBase": {"CI": "true", "PATH": BOOTSTRAP_PATH},
        "inheritedEnv": [],
    }
    if (
        frozen_script != expected_frozen_script
        or clean_environment != expected_clean_environment
    ):
        _fail("V3_DIRECT_NODE_SPLIT_EXECUTOR_INVALID")
    manifest = frozen_script.get("manifest")
    if (
        set(frozen_script)
        != {
            "manifest",
            "name",
            "expression",
            "buildExpression",
            "directNodeExpression",
            "lifecycleHooks",
        }
        or not isinstance(manifest, dict)
        or set(manifest) != {"path", "sha256", "size"}
        or manifest.get("path") != "packages/advantage-play-kit/package.json"
        or not isinstance(manifest.get("sha256"), str)
        or re.fullmatch(r"[0-9a-f]{64}", manifest["sha256"]) is None
        or type(manifest.get("size")) is not int
        or manifest["size"] < 0
        or frozen_script.get("name") != "generate:standard-pack-catalog"
        or frozen_script.get("expression")
        != "pnpm build && node scripts/generate-standard-pack-release.mjs"
        or frozen_script.get("buildExpression") != "pnpm build"
        or frozen_script.get("directNodeExpression")
        != "node scripts/generate-standard-pack-release.mjs"
        or frozen_script.get("lifecycleHooks")
        != {"prebuild": "ABSENT", "postbuild": "ABSENT"}
    ):
        _fail("V3_DIRECT_NODE_SPLIT_EXECUTOR_INVALID")
    prefix = context.get("prefix")
    mounts = context.get("mounts")
    package_cwd = "/work/packages/advantage-play-kit"
    if (
        not isinstance(prefix, list)
        or not isinstance(mounts, list)
        or prefix
        != build_direct_node_split_canonical_prefix_v1(mounts, package_cwd)
    ):
        _fail("V3_DIRECT_NODE_SPLIT_EXECUTOR_INVALID")
    build_segment = {
        "id": "build-advantage-play-kit-for-runtime",
        "kind": "RUNTIME_BUILD",
        "cwd": package_cwd,
        "logicalArgv": ["pnpm", "build"],
        "environmentOverrides": {},
    }
    generator_segment = {
        "id": "generate-standard-pack-catalog",
        "kind": "DIRECT_NODE_GENERATOR",
        "cwd": package_cwd,
        "logicalArgv": ["node", "scripts/generate-standard-pack-release.mjs"],
        "environmentOverrides": {
            "NODE_OPTIONS": DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS,
        },
        "script": {
            "manifest": manifest,
            "packageRelativePath": "scripts/generate-standard-pack-release.mjs",
            "logicalPath": "packages/advantage-play-kit/scripts/generate-standard-pack-release.mjs",
            "resolvedPath": "/work/packages/advantage-play-kit/scripts/generate-standard-pack-release.mjs",
        },
    }
    if segment == build_segment:
        if logical != build_segment["logicalArgv"] or payload != build_pnpm_global_store_payload_v1(logical):
            _fail("V3_DIRECT_NODE_SPLIT_EXECUTOR_INVALID")
        return {}
    if segment == generator_segment:
        if logical != generator_segment["logicalArgv"] or payload != [
            CONTAINER_NODE,
            generator_segment["script"]["resolvedPath"],
        ]:
            _fail("V3_DIRECT_NODE_SPLIT_EXECUTOR_INVALID")
        return copy.deepcopy(generator_segment["environmentOverrides"])
    _fail("V3_DIRECT_NODE_SPLIT_EXECUTOR_INVALID")


def _container_environment_overrides_v1(
    logical: list[str],
    environment_overrides: dict[str, str] | None,
) -> dict[str, str]:
    """Validates the one generator-only clean-environment override permitted by the runner.

    @param logical The contract-level command argv.
    @param environment_overrides The requested environment additions after ``env -i``.
    @returns The canonical allowed override map.
    @throws core.ExecutionClosureValidationError When a non-generator or unbound override is requested.
    """
    if environment_overrides is None:
        overrides: dict[str, str] = {}
    elif isinstance(environment_overrides, dict) and all(
        isinstance(name, str) and isinstance(value, str)
        for name, value in environment_overrides.items()
    ):
        overrides = dict(environment_overrides)
    else:
        _fail("V3_PODMAN_ENVIRONMENT_OVERRIDE_INVALID")
    expected = (
        {"NODE_OPTIONS": DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS}
        if tuple(logical)
        in {
            tuple(STANDARD_PACK_GENERATOR),
            tuple(DIRECT_NODE_STANDARD_PACK_GENERATOR),
        }
        else {}
    )
    if overrides != expected:
        _fail("V3_PODMAN_ENVIRONMENT_OVERRIDE_INVALID")
    return overrides


def _container_executor(
    context: dict[str, Any],
    logical: list[str],
    payload: list[str],
    toolchain: dict[str, Any] | None = None,
    environment_overrides: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Builds honest logical, payload, and full Podman executor provenance.

    @param context The route-proven Podman context.
    @param logical The contract-level command argv.
    @param payload The absolute executable argv inside the container.
    @param toolchain Optional pnpm toolchain identity.
    @param environment_overrides Exact additions after clean ``env -i`` setup.
    @returns The actual executor object recorded on command evidence.
    """
    direct_node_split_overrides = _direct_node_split_executor_overrides_v1(
        context,
        logical,
        payload,
    )
    if direct_node_split_overrides is None:
        overrides = _container_environment_overrides_v1(
            logical,
            environment_overrides,
        )
        execution_prefix = context.get("prefix")
    elif environment_overrides == direct_node_split_overrides:
        overrides = copy.deepcopy(direct_node_split_overrides)
        direct_split = context.get("directNodeSplit")
        direct_segment = (
            direct_split.get("segment") if isinstance(direct_split, dict) else None
        )
        direct_cwd = (
            direct_segment.get("cwd") if isinstance(direct_segment, dict) else None
        )
        if not isinstance(direct_cwd, str):
            _fail("V3_DIRECT_NODE_SPLIT_EXECUTOR_INVALID")
        execution_prefix = build_direct_node_split_canonical_prefix_v1(
            context.get("mounts"),
            direct_cwd,
        )
    else:
        _fail("V3_PODMAN_ENVIRONMENT_OVERRIDE_INVALID")
    if overrides.get("NODE_OPTIONS") not in {None, DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS}:
        _fail("V3_PODMAN_ENVIRONMENT_OVERRIDE_INVALID")
    override_assignments = [f"{name}={value}" for name, value in sorted(overrides.items())]
    effective_environment = {"CI": "true", "PATH": BOOTSTRAP_PATH, **overrides}
    full = [
        *execution_prefix,
        IMAGE_RESOLVED,
        "/usr/bin/env",
        "-i",
        "CI=true",
        f"PATH={BOOTSTRAP_PATH}",
        *override_assignments,
        *payload,
    ]
    value: dict[str, Any] = {
        "logicalArgv": list(logical),
        "environment": {"CI": "true"},
        "effectiveEnvironment": effective_environment,
        "inheritedEnv": [],
        "payloadArgv": list(payload),
        "argv": full,
    }
    if overrides:
        value["environmentOverrides"] = overrides
    if toolchain is not None:
        value["toolchain"] = copy.deepcopy(toolchain)
    return value


def _run_container(
    raw_dir: Path,
    raw_id: str,
    context: dict[str, Any],
    logical: list[str],
    payload: list[str],
    toolchain: dict[str, Any] | None = None,
    environment_overrides: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Runs one no-network Podman operation and stages its raw output.

    @param raw_dir The temporary raw output directory.
    @param raw_id The unique raw output stem.
    @param context The configured Podman context.
    @param logical The contract-level command argv.
    @param payload The absolute in-container argv.
    @param toolchain Optional pnpm toolchain identity.
    @param environment_overrides Exact additions after clean ``env -i`` setup.
    @returns One staged command receipt object.
    """
    executor = _container_executor(
        context,
        logical,
        payload,
        toolchain,
        environment_overrides=environment_overrides,
    )
    result = subprocess.run(executor["argv"], cwd=REPO_ROOT, env=_host_execution_environment(), capture_output=True, text=True, check=False)
    stdout_path = raw_dir / f"{raw_id}.stdout.txt"
    stderr_path = raw_dir / f"{raw_id}.stderr.txt"
    stdout_path.parent.mkdir(parents=True, exist_ok=True)
    stdout_path.write_text(result.stdout, encoding="utf-8")
    stderr_path.write_text(result.stderr, encoding="utf-8")
    return {
        "argv": list(logical),
        "cwd": ".",
        "env": dict(ENV),
        "envAbsent": list(ENV_ABSENT),
        "network": False,
        "exitCode": result.returncode,
        "actualExecutor": executor,
        "_rawId": raw_id,
        "_stdoutPath": stdout_path,
        "_stderrPath": stderr_path,
        "_stdoutText": result.stdout,
        "_stderrText": result.stderr,
    }


def _require_zero(command: dict[str, Any], name: str) -> None:
    """Fails closed when a required command did not exit successfully.

    @param command The staged command object.
    @param name The stable gate name.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError When the command failed.
    """
    if command.get("exitCode") != 0:
        _fail("V3_PODMAN_GATE_FAILED", name)


def _parse_stdout(command: dict[str, Any], name: str) -> dict[str, Any]:
    """Parses one successful JSON command stdout object.

    @param command The staged command object.
    @param name The stable operation name.
    @returns The decoded JSON object.
    @throws core.ExecutionClosureValidationError When output is not valid JSON.
    """
    _require_zero(command, name)
    try:
        value = json.loads(_command_text(command, "stdout"))
    except json.JSONDecodeError as error:
        _fail("V3_PODMAN_OUTPUT_INVALID", f"{name}: {error}")
    if not isinstance(value, dict):
        _fail("V3_PODMAN_OUTPUT_INVALID", name)
    return value


def _metadata_inventory_payload() -> str:
    """Returns a Node program that hashes recursive path metadata without mutation.

    @returns The script passed to the in-container Node executable.
    """
    return r'''const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = process.argv[1];
const rows = [];
const walk = (current, logical) => {
  const entry = fs.lstatSync(current);
  const row = { path: logical || ".", mode: entry.mode, size: entry.size, kind: entry.isDirectory() ? "directory" : entry.isSymbolicLink() ? "symlink" : "file" };
  if (entry.isSymbolicLink()) row.target = fs.readlinkSync(current);
  rows.push(row);
  if (entry.isDirectory()) for (const name of fs.readdirSync(current).sort()) walk(path.join(current, name), logical ? `${logical}/${name}` : name);
};
walk(root, "");
process.stdout.write(JSON.stringify({ entryCount: rows.length, sha256: crypto.createHash("sha256").update(JSON.stringify(rows)).digest("hex") }));
'''


def _workspace_installed_resolution_payload_v1() -> str:
    """Returns the isolated Node program that proves post-install workspace link state.

    @returns A no-mutation Node program that emits the verified resolution records.
    """
    return r'''const fs = require("node:fs");
const path = require("node:path");
const expected = JSON.parse(process.argv[1]);
if (!Array.isArray(expected)) throw new Error("workspace resolution expectation must be an array");
const root = fs.realpathSync(process.cwd());
const relativeToRoot = (absolute) => {
  const relative = path.relative(root, absolute);
  if (!relative || relative === "." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
    throw new Error("workspace path escapes clean work root");
  }
  return relative.split(path.sep).join("/");
};
const resolveWorkspace = (logical) => {
  if (typeof logical !== "string" || !logical || logical.includes("\\") || path.isAbsolute(logical)) {
    throw new Error("workspace path is invalid");
  }
  const absolute = path.resolve(root, logical);
  relativeToRoot(absolute);
  return absolute;
};
for (const resolution of expected) {
  if (!resolution || typeof resolution !== "object") throw new Error("resolution is invalid");
  const link = resolution.installedLink;
  if (!link || typeof link !== "object" || link.kind !== "symlink") throw new Error("installed link is invalid");
  const linkPath = resolveWorkspace(link.path);
  const linkEntry = fs.lstatSync(linkPath);
  if (!linkEntry.isSymbolicLink() || fs.readlinkSync(linkPath) !== link.target) {
    throw new Error("installed workspace link drift");
  }
  if (relativeToRoot(fs.realpathSync(linkPath)) !== link.realpath) {
    throw new Error("installed workspace realpath drift");
  }
  if (resolution.beforePrerequisiteBuild !== "MISSING_DECLARED_EXPORT_TARGETS" || !Array.isArray(resolution.missingTargets)) {
    throw new Error("missing target expectation is invalid");
  }
  for (const target of resolution.missingTargets) {
    if (fs.existsSync(resolveWorkspace(target))) throw new Error("declared output already exists");
  }
}
process.stdout.write(JSON.stringify({ resolutions: expected }));
'''


def _workspace_prerequisite_output_inventory_payload_v1() -> str:
    """Returns the isolated Node program that inventories generated prerequisite outputs.

    @returns A no-mutation Node program that emits target realpaths and recursive metadata.
    """
    return r'''const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const expected = JSON.parse(process.argv[1]);
if (!Array.isArray(expected)) throw new Error("workspace output expectation must be an array");
const root = fs.realpathSync(process.cwd());
const relativeToRoot = (absolute) => {
  const relative = path.relative(root, absolute);
  if (!relative || relative === "." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
    throw new Error("workspace path escapes clean work root");
  }
  return relative.split(path.sep).join("/");
};
const resolveWorkspace = (logical) => {
  if (typeof logical !== "string" || !logical || logical.includes("\\") || path.isAbsolute(logical)) {
    throw new Error("workspace path is invalid");
  }
  const absolute = path.resolve(root, logical);
  relativeToRoot(absolute);
  return absolute;
};
const inventory = (absolute) => {
  const rows = [];
  const walk = (current, logical) => {
    const entry = fs.lstatSync(current);
    const row = {
      path: logical || ".",
      mode: entry.mode,
      size: entry.size,
      kind: entry.isDirectory() ? "directory" : entry.isSymbolicLink() ? "symlink" : "file",
    };
    if (entry.isSymbolicLink()) row.target = fs.readlinkSync(current);
    rows.push(row);
    if (entry.isDirectory()) {
      for (const name of fs.readdirSync(current).sort()) walk(path.join(current, name), logical ? logical + "/" + name : name);
    }
  };
  walk(absolute, "");
  return {
    entryCount: rows.length,
    sha256: crypto.createHash("sha256").update(JSON.stringify(rows)).digest("hex"),
  };
};
const outputs = expected.map((step) => {
  if (!step || typeof step !== "object" || typeof step.package !== "string" || !Array.isArray(step.outputRoots)) {
    throw new Error("workspace output step is invalid");
  }
  return {
    package: step.package,
    outputRoots: step.outputRoots.map((outputRoot) => {
      if (!outputRoot || typeof outputRoot !== "object" || typeof outputRoot.path !== "string" || !Array.isArray(outputRoot.declaredTargets)) {
        throw new Error("workspace output root is invalid");
      }
      const rootPath = resolveWorkspace(outputRoot.path);
      if (fs.lstatSync(rootPath).isSymbolicLink()) throw new Error("workspace output root is symlinked");
      const observedTargets = outputRoot.declaredTargets.map((target) => {
        const targetPath = resolveWorkspace(target);
        if (targetPath !== rootPath && !targetPath.startsWith(rootPath + path.sep)) {
          throw new Error("declared output target escapes its output root");
        }
        const targetEntry = fs.lstatSync(targetPath);
        if (!targetEntry.isFile() || targetEntry.isSymbolicLink() || relativeToRoot(fs.realpathSync(targetPath)) !== target) {
          throw new Error("declared output target is unsafe");
        }
        return { path: target, kind: "file", realpath: target };
      });
      return {
        path: outputRoot.path,
        declaredTargets: outputRoot.declaredTargets,
        observedTargets,
        inventory: inventory(rootPath),
      };
    }),
  };
});
process.stdout.write(JSON.stringify({ outputs }));
'''


def _inventory_mount(raw_dir: Path, context: dict[str, Any], mount: dict[str, Any], phase: str, staged_commands: list[dict[str, Any]] | None = None) -> tuple[dict[str, Any], dict[str, Any]]:
    """Records a Podman-scanned recursive inventory for one declared external mount.

    @param raw_dir The temporary raw stream directory.
    @param context The Podman context.
    @param mount The declared mount record.
    @param phase The unique pre or post phase label.
    @param staged_commands Optional ordered sink that preserves the command before parsing.
    @returns The parsed inventory and staged command record.
    """
    command = _run_container(
        raw_dir,
        f"inventory-{mount['id'].replace(':', '-')}-{phase}",
        context,
        ["recursive-path-metadata-sha256", mount["target"]],
        [CONTAINER_NODE, "-e", _metadata_inventory_payload(), mount["target"]],
    )
    command["id"] = f"inventory-{mount['id']}-{phase}"
    if staged_commands is not None:
        staged_commands.append(command)
    value = _parse_stdout(command, command["id"])
    if not isinstance(value.get("entryCount"), int) or not re.fullmatch(r"[0-9a-f]{64}", str(value.get("sha256"))):
        _fail("V3_PODMAN_INVENTORY_INVALID", mount["id"])
    return {"entryCount": value["entryCount"], "sha256": value["sha256"]}, command


def _podman_host_evidence(raw_dir: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    """Records the fixed local Podman executable and pinned image identity.

    @param raw_dir The temporary raw output directory.
    @returns The Podman identity and image identity objects.
    """
    version = _stage_command(raw_dir, "podman-version", [PODMAN, "--version"])
    _require_zero(version, "podman-version")
    version_text = _command_text(version, "stdout").strip() or _command_text(version, "stderr").strip()
    if not version_text:
        _fail("V3_PODMAN_VERSION_EMPTY")
    inspect = _stage_command(raw_dir, "podman-image-inspect", [PODMAN, "image", "inspect", IMAGE_RESOLVED])
    _require_zero(inspect, "podman-image-inspect")
    try:
        detail = json.loads(_command_text(inspect, "stdout"))
    except json.JSONDecodeError as error:
        _fail("V3_PODMAN_IMAGE_INSPECT_INVALID", str(error))
    first = detail[0] if isinstance(detail, list) and detail else None
    architecture = first.get("Architecture") if isinstance(first, dict) else None
    if architecture not in {"amd64", "arm64"}:
        _fail("V3_PODMAN_IMAGE_ARCHITECTURE_INVALID", str(architecture))
    return (
        {"path": PODMAN, "version": version_text, "versionCommand": version},
        {
            "reference": IMAGE_REFERENCE,
            "digest": IMAGE_DIGEST,
            "resolvedReference": IMAGE_RESOLVED,
            "architecture": architecture,
            "inspectCommand": inspect,
        },
    )


def _network_proof(raw_dir: Path, context: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Runs route, DNS, and TCP negative probes inside the no-network container.

    @param raw_dir The temporary raw output directory.
    @param context The configured Podman context.
    @returns The three required route-proven network evidence records.
    """
    route = _run_container(raw_dir, "network-route", context, ["/bin/cat", "/proc/net/route"], ["/bin/cat", "/proc/net/route"])
    _require_zero(route, "network-route")
    route_lines = _command_text(route, "stdout").splitlines()
    if not route_lines or not route_lines[0].startswith("Iface") or any(line.strip() for line in route_lines[1:]):
        _fail("V3_PODMAN_ROUTE_EXPOSED")
    dns_script = "const dns=require('node:dns');dns.lookup('example.com',(error)=>{if(!error){process.stdout.write('UNEXPECTED_DNS');process.exit(0);}const code=typeof error.code==='string'?error.code:'UNKNOWN';process.stderr.write(JSON.stringify({kind:'DNS_NEGATIVE',code}));process.exit(1);});"
    dns = _run_container(raw_dir, "network-dns", context, ["node", "dns-negative"], [CONTAINER_NODE, "-e", dns_script])
    dns_stderr = _command_text(dns, "stderr").strip()
    dns_stdout = _command_text(dns, "stdout").strip()
    try:
        dns_evidence = json.loads(dns_stderr)
    except json.JSONDecodeError:
        dns_evidence = None
    if dns["exitCode"] == 0 or dns_stdout or not isinstance(dns_evidence, dict) or dns_evidence.get("kind") != "DNS_NEGATIVE" or not isinstance(dns_evidence.get("code"), str) or not dns_evidence["code"] or any(marker in dns_stderr for marker in ("SyntaxError", "Cannot use import", "ERR_REQUIRE_ESM", "Unexpected token")):
        _fail("V3_PODMAN_DNS_EXPOSED")
    tcp_script = "const net=require('node:net');const finish=(reason,error)=>{const code=error&&typeof error.code==='string'?error.code:'TIMEOUT';process.stderr.write(JSON.stringify({kind:'TCP_NEGATIVE',reason,code}));process.exit(1);};const socket=net.connect({host:'1.1.1.1',port:443});socket.once('connect',()=>{process.stdout.write('UNEXPECTED_TCP');process.exit(0);});socket.once('error',(error)=>finish('error',error));setTimeout(()=>finish('timeout',null),1000);"
    tcp = _run_container(raw_dir, "network-tcp", context, ["node", "tcp-negative"], [CONTAINER_NODE, "-e", tcp_script])
    tcp_stderr = _command_text(tcp, "stderr").strip()
    tcp_stdout = _command_text(tcp, "stdout").strip()
    try:
        tcp_evidence = json.loads(tcp_stderr)
    except json.JSONDecodeError:
        tcp_evidence = None
    if tcp["exitCode"] == 0 or tcp_stdout or not isinstance(tcp_evidence, dict) or tcp_evidence.get("kind") != "TCP_NEGATIVE" or tcp_evidence.get("reason") not in {"error", "timeout"} or not isinstance(tcp_evidence.get("code"), str) or not tcp_evidence["code"] or any(marker in tcp_stderr for marker in ("SyntaxError", "Cannot use import", "ERR_REQUIRE_ESM", "Unexpected token")):
        _fail("V3_PODMAN_TCP_EXPOSED")
    return {
        "route": {"kind": "ROUTE_TABLE", **route},
        "dns": {"kind": "DNS_NEGATIVE", "resolvedAddresses": [], "errorCode": dns_evidence["code"], **dns},
        "tcp": {"kind": "TCP_NEGATIVE", "connected": False, "errorCode": tcp_evidence["code"], **tcp},
    }


def _tool_versions(raw_dir: Path, context: dict[str, Any]) -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
    """Runs Node, pnpm, and repo-graph version checks inside Podman.

    @param raw_dir The temporary raw output directory.
    @param context The configured Podman context.
    @returns The public tool version map and immutable pnpm executor toolchain.
    """
    staged: dict[str, dict[str, Any]] = {}
    definitions = {
        "node": (["node", "--version"], [CONTAINER_NODE, "--version"]),
        "pnpm": (["pnpm", "--version"], [CONTAINER_NODE, CONTAINER_PNPM, "--version"]),
        "scanner": (["repo-graph", "--version"], [CONTAINER_REPO_GRAPH, "--version"]),
    }
    for name, (logical, payload) in definitions.items():
        command = _run_container(raw_dir, f"tool-{name}-version", context, logical, payload)
        _require_zero(command, f"tool-{name}-version")
        stdout = _command_text(command, "stdout").strip() or _command_text(command, "stderr").strip()
        if not stdout:
            _fail("V3_PODMAN_TOOL_VERSION_EMPTY", name)
        staged[name] = {"argv": logical, "stdout": stdout, "stdoutSha256": _sha256(stdout.encode("utf-8")), "executor": command["actualExecutor"]}
    node_hash = _run_container(
        raw_dir,
        "tool-node-sha256",
        context,
        ["node", "executable-sha256"],
        [CONTAINER_NODE, "-e", "const fs=require('node:fs');const crypto=require('node:crypto');process.stdout.write(crypto.createHash('sha256').update(fs.readFileSync(process.execPath)).digest('hex'));"],
    )
    _require_zero(node_hash, "tool-node-sha256")
    node_digest = _command_text(node_hash, "stdout").strip()
    if not re.fullmatch(r"[0-9a-f]{64}", node_digest):
        _fail("V3_PODMAN_NODE_HASH_INVALID")
    pnpm_data = HOST_PNPM.joinpath("bin", "pnpm.mjs").read_bytes()
    pnpm_digest = _sha256(pnpm_data)
    staged["node"]["executableSha256"] = node_digest
    staged["pnpm"]["launcherSha256"] = pnpm_digest
    toolchain = {
        "node": {"path": CONTAINER_NODE, "sha256": node_digest, "version": staged["node"]["stdout"]},
        "pnpmLauncher": {"path": str(HOST_PNPM.resolve()), "sha256": pnpm_digest, "version": staged["pnpm"]["stdout"]},
    }
    return staged, toolchain


def _v2_immutable_audit() -> dict[str, Any]:
    """Rechecks immutable V2 evidence and blocker files without marker changes.

    @returns The v2 tamper and absence audit object.
    """
    findings: list[dict[str, str]] = []
    tamper: list[dict[str, Any]] = []
    for name, expected in core.V2_EVIDENCE.items():
        observed = _reference(TRACK_DIR / expected["path"])
        ok = observed == expected
        tamper.append({"name": name, "expected": expected, "observed": observed, "ok": ok})
        if not ok:
            findings.append({"code": "V2_EVIDENCE_TAMPER", "name": name})
    blocker_records: list[dict[str, Any]] = []
    for expected in core.BLOCKER_RECORDS:
        observed = _reference(TRACK_DIR / expected["path"])
        ok = observed == expected
        blocker_records.append({"path": expected["path"], "expected": expected, "observed": observed, "ok": ok})
        if not ok:
            findings.append({"code": "V2_BLOCKER_TAMPER", "path": expected["path"]})
    frozen = core._read_v2_archive_entries()
    absence = [{"path": path, "absentFromFrozenV2Archive": path not in frozen} for path in SUPPLEMENTAL_PATHS]
    if any(not row["absentFromFrozenV2Archive"] for row in absence):
        findings.append({"code": "V2_SUPPLEMENT_NOT_ABSENT", "path": "multiple"})
    return {"v2Evidence": copy.deepcopy(core.V2_EVIDENCE), "blockerRecords": copy.deepcopy(core.BLOCKER_RECORDS), "tamperChecks": tamper, "absenceChecks": absence, "findings": findings}


def _ledger(archive: dict[str, Any], capture: dict[str, Any]) -> dict[str, Any]:
    """Builds the candidate ledger with addendum discovery and supplement captures.

    @param archive The built V3 source archive.
    @param capture The finalized pre/post supplement source capture.
    @returns The candidate-only omission ledger.
    """
    addendum_ledger = _load_json(ADDENDUM_LEDGER)
    discovery = addendum_ledger.get("derivation", {}).get("discovery")
    if not isinstance(discovery, dict):
        _fail("V3_PODMAN_ADDENDUM_DISCOVERY_MISSING")
    by_path = {entry["path"]: entry for entry in archive["entries"]}
    sources = [
        {
            "path": path,
            "realpath": path,
            "sha256": by_path[path]["sha256"],
            "size": by_path[path]["size"],
            "mode": by_path[path]["mode"],
        }
        for path in SUPPLEMENTAL_PATHS
    ]
    return {
        "schemaVersion": 1,
        "kind": "execution-input-omission-ledger",
        "status": "CANDIDATE_UNACCEPTED",
        "derivation": {
            "rule": "frozen-ast-execution-closure-v1",
            "bridge": {"addendumLedger": _reference(ADDENDUM_LEDGER), "rowDigest": discovery.get("rowDigest")},
            "discovery": copy.deepcopy(discovery),
        },
        "classificationAudit": {"dynamicInputs": [], "orphanedInputs": [], "duplicateClassifications": []},
        "sourceInputs": sources,
        "supplementCapture": capture,
        "omissions": copy.deepcopy(addendum_ledger.get("omissions")),
    }


def _publish_blocker(reason: str, commands: list[dict[str, Any]], error: BaseException) -> None:
    """Publishes raw failure evidence without creating a V3 candidate directory.

    @param reason The failing operation name.
    @param commands The staged commands completed before failure.
    @param error The terminal exception.
    @returns Nothing.
    """
    if BLOCKER_DIR.exists():
        _fail("V3_PODMAN_BLOCKER_DESTINATION_EXISTS")
    BLOCKER_DIR.mkdir(parents=True)
    finalized: list[dict[str, Any]] = []
    for command in commands:
        try:
            finalized.append(_finalize_command(command, BLOCKER_DIR))
        except (KeyError, OSError):
            continue
    _write_json(BLOCKER_DIR / "blocker.json", {
        "schemaVersion": 1,
        "kind": "execution-closure-blocker",
        "status": "BLOCKED",
        "reason": reason,
        "error": str(error),
        "commands": finalized,
        "markerDisposition": copy.deepcopy(core.MARKER_DISPOSITION),
        "upstreamAuthority": "NONE",
    })


def _next_candidate_publication_failure_attempt_identity_v1(
    attempts_root: Path,
    run_day: str,
) -> tuple[str, int]:
    """Derives the next canonical candidate-failure attempt identity without reserving it.

    @param attempts_root The existing regular directory that owns final attempt records.
    @param run_day The validated UTC run day for the failed attempt.
    @returns The canonical final directory name and its monotonic sequence.
    @throws core.ExecutionClosureValidationError When the root or date is unsafe or the sequence is exhausted.
    """
    yyyymmdd = resolve_execution_run_day_v1(run_day)
    if attempts_root.is_symlink() or not attempts_root.is_dir():
        _fail("V3_PODMAN_ATTEMPT_ROOT_INVALID", str(attempts_root))
    matcher = re.compile(
        rf"{re.escape(ATTEMPT_PREFIX)}-{yyyymmdd}-([0-9]{{4}})$",
    )
    sequences = [
        int(match.group(1))
        for child in attempts_root.iterdir()
        if (match := matcher.fullmatch(child.name))
    ]
    sequence = max(sequences, default=0) + 1
    if sequence > 9999:
        _fail("V3_PODMAN_ATTEMPT_SEQUENCE_EXHAUSTED", yyyymmdd)
    return f"{ATTEMPT_PREFIX}-{yyyymmdd}-{sequence:04d}", sequence


def _publish_candidate_publication_failure_attempt(
    error: BaseException,
    *,
    direct_runtime_integration: dict[str, Any],
    candidate_publication_failure: dict[str, Any],
    attempts_root: Path | str,
    attempt_date: str,
) -> None:
    """Publishes one operation-only failed attempt for a bounded candidate operation.

    @param error The original private validation or atomic-replace error.
    @param direct_runtime_integration The trace-complete integration that reached validation.
    @param candidate_publication_failure The closed unpublished-candidate operation carrier.
    @param attempts_root The append-only root for the retained failed attempt.
    @param attempt_date The validated run day used to allocate the attempt ordinal.
    @returns Nothing when the no-command failure record is written and validated.
    @throws core.ExecutionClosureValidationError When the failure is not a bounded candidate operation.
    """
    validate_direct_command_runtime_runner_integration_v1(
        direct_runtime_integration,
    )
    completed_attempt = direct_runtime_integration.get("attempt")
    if (
        not isinstance(completed_attempt, dict)
        or completed_attempt.get("reachedStage") != "direct-runtime-trace"
        or completed_attempt.get("laterStages") != []
        or not isinstance(completed_attempt.get("executionTrace"), dict)
    ):
        _direct_runtime_integration_fail("CANDIDATE_PUBLICATION_FAILURE_INVALID")
    _validate_candidate_publication_failure_v1(
        candidate_publication_failure,
        direct_runtime_integration,
    )
    operation_id = candidate_publication_failure["operationId"]
    classification = _CANDIDATE_PUBLICATION_FAILURE_CLASSIFICATIONS[operation_id]
    expected_error_type = (
        core.ExecutionClosureValidationError
        if operation_id == "validate-private-candidate"
        else OSError
    )
    if not isinstance(error, expected_error_type):
        _direct_runtime_integration_fail("CANDIDATE_PUBLICATION_FAILURE_INVALID")
    run_day = resolve_execution_run_day_v1(attempt_date)
    root = Path(attempts_root)
    if root.exists() and (root.is_symlink() or not root.is_dir()):
        _fail("V3_PODMAN_ATTEMPT_ROOT_INVALID", str(root))
    root.mkdir(parents=True, exist_ok=True)
    if root.is_symlink() or not root.is_dir():
        _fail("V3_PODMAN_ATTEMPT_ROOT_INVALID", str(root))
    attempt_name, sequence = _next_candidate_publication_failure_attempt_identity_v1(
        root,
        run_day,
    )
    final_directory = root / attempt_name
    final_reserved = False
    published = False
    with tempfile.TemporaryDirectory(
        prefix=".candidate-publication-failure-",
        dir=root,
    ) as temporary:
        staging_parent = Path(temporary)
        directory = staging_parent / attempt_name
        directory.mkdir()
        attempt = {
            "schemaVersion": 1,
            "kind": "execution-closure-failed-attempt",
            "status": "BLOCKED",
            "attempt": {
                "id": attempt_name,
                "sequence": sequence,
                "namingRule": ATTEMPT_NAMING_RULE,
            },
            "historicalBlocker": _reference(HISTORICAL_PODMAN_BLOCKER),
            "failure": {
                "stage": "candidate-publication",
                "reason": str(error),
                "classification": classification,
                "operationId": operation_id,
            },
            "commands": [],
            "markerDisposition": copy.deepcopy(core.MARKER_DISPOSITION),
            "upstreamAuthority": "NONE",
            "directRuntimeIntegration": {
                "integration": copy.deepcopy(direct_runtime_integration),
                "reachedStage": "direct-runtime-trace",
                "laterStages": [],
            },
            "candidatePublicationFailure": copy.deepcopy(
                candidate_publication_failure,
            ),
        }
        try:
            _write_json(directory / "failed-attempt.json", attempt)
        except OSError as json_write_error:
            raise json_write_error from error
        validate_failed_execution_attempt_v1(attempt, directory)
        try:
            final_directory.mkdir()
        except FileExistsError:
            try:
                _fail("V3_PODMAN_ATTEMPT_PUBLICATION_COLLISION", attempt_name)
            except core.ExecutionClosureValidationError as collision_error:
                raise collision_error from error
        final_reserved = True
        rename_error: OSError | None = None
        try:
            os.rename(directory, final_directory)
            published = True
        except OSError as caught_rename_error:
            rename_error = caught_rename_error
        finally:
            if final_reserved and not published:
                try:
                    shutil.rmtree(final_directory)
                except OSError:
                    pass
        if rename_error is not None:
            raise rename_error from error


def _next_failed_execution_attempt_identity_v1(
    attempts_root: Path,
    run_day: str,
) -> tuple[str, int]:
    """Derives the next canonical failed-attempt identity without reserving it.

    @param attempts_root The existing regular directory that owns final attempt records.
    @param run_day The validated UTC run day for the failed attempt.
    @returns The canonical final directory name and its monotonic sequence.
    @throws core.ExecutionClosureValidationError When the root or date is unsafe or the sequence is exhausted.
    """
    yyyymmdd = resolve_execution_run_day_v1(run_day)
    if attempts_root.is_symlink() or not attempts_root.is_dir():
        _fail("V3_PODMAN_ATTEMPT_ROOT_INVALID", str(attempts_root))
    matcher = re.compile(
        rf"{re.escape(ATTEMPT_PREFIX)}-{yyyymmdd}-([0-9]{{4}})$",
    )
    sequences = [
        int(match.group(1))
        for child in attempts_root.iterdir()
        if (match := matcher.fullmatch(child.name))
    ]
    sequence = max(sequences, default=0) + 1
    if sequence > 9999:
        _fail("V3_PODMAN_ATTEMPT_SEQUENCE_EXHAUSTED", yyyymmdd)
    return f"{ATTEMPT_PREFIX}-{yyyymmdd}-{sequence:04d}", sequence


def _publish_failed_attempt(
    reason: str,
    commands: list[dict[str, Any]],
    error: BaseException,
    *,
    hermetic_pnpm_contract: dict[str, Any] | None,
    external_stop: dict[str, str] | None,
    attempts_root: Path | str,
    attempt_date: str,
    workspace_prerequisite_build_dag: dict[str, Any] | None = None,
    workspace_build_resolution: list[dict[str, Any]] | None = None,
    direct_runtime_integration: dict[str, Any] | None = None,
    direct_runtime_stage: str | None = None,
    direct_runtime_preseal_attempt: dict[str, Any] | None = None,
) -> None:
    """Preserves a post-blocker failed command in a fresh immutable attempt directory.

    @param reason The exact failed staged command id.
    @param commands The ordered staged commands captured before the failure.
    @param error The terminal gate exception.
    @param hermetic_pnpm_contract The required contract for a future offline-install failure.
    @param external_stop Optional explicit supervisor-stop evidence for offline-install.
    @param attempts_root The parent directory that will own the fresh append-only attempt.
    @param attempt_date The validated run day used to allocate the attempt ordinal.
    @param workspace_prerequisite_build_dag Optional V2-derived DAG for a failed prerequisite build.
    @param workspace_build_resolution Optional post-install resolution proof paired with the DAG.
    @param direct_runtime_integration Optional frozen detached runtime integration to forward.
    @param direct_runtime_stage Optional last successfully reached detached runtime stage.
    @param direct_runtime_preseal_attempt Optional executor-owned terminality carrier for an unsealed runtime failure.
    @returns Nothing when the fresh failed-attempt record is validated and written.
    @throws core.ExecutionClosureValidationError When no exact failed command can be preserved.
    """
    failed = next((command for command in reversed(commands) if command.get("id") == reason), None)
    if failed is None or not isinstance(failed.get("exitCode"), int) or isinstance(failed["exitCode"], bool) or failed["exitCode"] == 0:
        _fail("V3_PODMAN_ATTEMPT_FAILED_COMMAND_MISSING", reason)
    run_day = resolve_execution_run_day_v1(attempt_date)
    attempt_error = str(error)
    contract_for_attempt: dict[str, Any] | None = None
    workspace_contract_for_attempt: dict[str, Any] | None = None
    workspace_resolution_for_attempt: list[dict[str, Any]] | None = None
    if (workspace_prerequisite_build_dag is None) != (workspace_build_resolution is None):
        _fail("V3_PODMAN_ATTEMPT_FAILURE_CONTEXT_INVALID")
    if reason == "offline-install":
        if (
            hermetic_pnpm_contract is None
            or workspace_prerequisite_build_dag is not None
            or workspace_build_resolution is not None
        ):
            _fail("V3_HERMETIC_PNPM_CONTRACT_MISSING")
        validate_hermetic_pnpm_install_contract_v1(hermetic_pnpm_contract, _load_json(core.V2_ARCHIVE)["entries"])
        stdout = _command_text(failed, "stdout")
        stderr = _command_text(failed, "stderr")
        try:
            outcome = classify_hermetic_pnpm_install_outcome_v1(
                failed,
                stdout=stdout,
                stderr=stderr,
                contract=hermetic_pnpm_contract,
                external_stop=external_stop,
            )
        except core.ExecutionClosureValidationError as classification_error:
            if str(classification_error) != "V3_HERMETIC_PNPM_NETWORK_POLICY_VIOLATION" or attempt_error != "V3_HERMETIC_PNPM_NETWORK_POLICY_VIOLATION" or external_stop is not None:
                raise
            outcome = _network_policy_failure_outcome(stdout, stderr, hermetic_pnpm_contract)
        else:
            if attempt_error != "V3_PODMAN_GATE_FAILED: offline-install":
                _fail("V3_PODMAN_ATTEMPT_FAILURE_REASON", attempt_error)
        failed["registryAttestation"] = copy.deepcopy(outcome["registryAttestation"])
        failure = {"stage": "offline-install", "reason": attempt_error, **{key: value for key, value in outcome.items() if key != "exitCode"}}
        contract_for_attempt = copy.deepcopy(hermetic_pnpm_contract)
    else:
        if hermetic_pnpm_contract is not None or external_stop is not None:
            _fail("V3_PODMAN_ATTEMPT_FAILURE_CONTEXT_INVALID")
        if attempt_error != f"V3_PODMAN_GATE_FAILED: {reason}":
            _fail("V3_PODMAN_ATTEMPT_FAILURE_REASON", attempt_error)
        if workspace_prerequisite_build_dag is None:
            failure = {"stage": reason, "reason": attempt_error, "classification": "COMMAND_EXIT_NONZERO", "commandId": reason}
        else:
            frozen_v2 = _load_json(core.V2_ARCHIVE).get("entries")
            if not isinstance(frozen_v2, list):
                _workspace_dag_fail("FROZEN_ENTRIES_INVALID")
            validate_workspace_prerequisite_build_dag_contract_v1(
                workspace_prerequisite_build_dag,
                frozen_v2,
            )
            validate_installed_workspace_build_resolution_v1(
                workspace_prerequisite_build_dag,
                workspace_build_resolution,
            )
            outcome = classify_workspace_build_dependency_failure_v1(
                workspace_prerequisite_build_dag,
                workspace_build_resolution,
                failed,
                _command_text(failed, "stdout"),
                _command_text(failed, "stderr"),
            )
            if outcome["classification"] != "UPSTREAM_PREREQUISITE_BUILD_FAILURE":
                _workspace_dag_fail("FAILURE_UNATTRIBUTED")
            failure = {
                "stage": reason,
                "reason": attempt_error,
                "classification": outcome["classification"],
                "commandId": reason,
                "workspaceBuildDependencyFailure": outcome,
            }
            workspace_contract_for_attempt = copy.deepcopy(
                workspace_prerequisite_build_dag,
            )
            workspace_resolution_for_attempt = copy.deepcopy(
                workspace_build_resolution,
            )
    forwarded_direct_runtime: dict[str, Any] | None = None
    forwarded_preseal_attempt: dict[str, Any] | None = None
    if (
        direct_runtime_integration is not None
        and direct_runtime_preseal_attempt is not None
    ):
        _direct_runtime_integration_fail("FAILED_ATTEMPT_RUNTIME_INVALID")
    if direct_runtime_preseal_attempt is not None:
        validated_preseal_attempt = (
            _validate_direct_runtime_preseal_failed_attempt_v1(
                direct_runtime_preseal_attempt,
                reason,
            )
        )
        if (
            failed.get("id")
            != validated_preseal_attempt["attempt"]["reachedStage"]
            or failed.get("directRuntimePreparationSha256")
            != validated_preseal_attempt["preparationSha256"]
            or failed.get("directRuntimeAttempt")
            != validated_preseal_attempt["attempt"]
        ):
            _direct_runtime_integration_fail("FAILED_ATTEMPT_PRESEAL_INVALID")
        forwarded_preseal_attempt = copy.deepcopy(direct_runtime_preseal_attempt)
    elif direct_runtime_integration is None and reason in _DIRECT_RUNTIME_RUNNER_STAGES:
        _direct_runtime_integration_fail("FAILED_ATTEMPT_RUNTIME_CARRIER_MISSING")
    if (direct_runtime_integration is None) != (direct_runtime_stage is None):
        _direct_runtime_integration_fail("FAILED_ATTEMPT_RUNTIME_INVALID")
    if direct_runtime_integration is not None:
        validate_direct_command_runtime_runner_integration_v1(direct_runtime_integration)
        if direct_runtime_stage not in _DIRECT_RUNTIME_RUNNER_STAGES:
            _direct_runtime_integration_fail("FAILED_ATTEMPT_RUNTIME_INVALID")
        forwarded_integration = build_direct_command_runtime_runner_integration_v1(
            direct_runtime_integration["readSet"],
            direct_runtime_integration["sourcePacket"],
            {
                "id": direct_runtime_integration["attempt"]["id"],
                "reachedStage": direct_runtime_stage,
                "executionTrace": direct_runtime_integration["attempt"]["executionTrace"] if direct_runtime_stage == "direct-runtime-trace" else None,
            },
            direct_runtime_integration["resourceBudget"],
        )
        later_stages = [
            {"id": stage, "status": "NOT_RUN"}
            for stage in _DIRECT_RUNTIME_RUNNER_STAGES[_DIRECT_RUNTIME_RUNNER_STAGES.index(direct_runtime_stage) + 1:]
        ]
        forwarded_direct_runtime = {
            "integration": forwarded_integration,
            "reachedStage": direct_runtime_stage,
            "laterStages": later_stages,
        }
    root = Path(attempts_root)
    if root.exists() and (root.is_symlink() or not root.is_dir()):
        _fail("V3_PODMAN_ATTEMPT_ROOT_INVALID", str(root))
    root.mkdir(parents=True, exist_ok=True)
    if root.is_symlink() or not root.is_dir():
        _fail("V3_PODMAN_ATTEMPT_ROOT_INVALID", str(root))
    attempt_name, sequence = _next_failed_execution_attempt_identity_v1(
        root,
        run_day,
    )
    final_directory = root / attempt_name
    final_reserved = False
    published = False
    staging_parent = Path(tempfile.mkdtemp(
        prefix=".failed-attempt-",
        dir=root,
    ))
    try:
        directory = staging_parent / attempt_name
        directory.mkdir()
        try:
            finalized = _finalize_command(
                failed,
                directory,
                reference_root=TRACK_DIR / attempt_name,
            )
        except OSError as raw_copy_error:
            raise raw_copy_error from error
        attempt = {
            "schemaVersion": 1,
            "kind": "execution-closure-failed-attempt",
            "status": "BLOCKED",
            "attempt": {
                "id": attempt_name,
                "sequence": sequence,
                "namingRule": ATTEMPT_NAMING_RULE,
            },
            "historicalBlocker": _reference(HISTORICAL_PODMAN_BLOCKER),
            "failure": failure,
            "commands": [finalized],
            "markerDisposition": copy.deepcopy(core.MARKER_DISPOSITION),
            "upstreamAuthority": "NONE",
        }
        if forwarded_direct_runtime is not None:
            attempt["directRuntimeIntegration"] = forwarded_direct_runtime
        if forwarded_preseal_attempt is not None:
            attempt["directRuntimePreSealAttempt"] = forwarded_preseal_attempt
        if contract_for_attempt is not None:
            attempt["hermeticPnpmInstallContract"] = contract_for_attempt
        if workspace_contract_for_attempt is not None:
            attempt["workspacePrerequisiteBuildDag"] = workspace_contract_for_attempt
            attempt["workspaceBuildResolution"] = workspace_resolution_for_attempt
        try:
            _write_json(directory / "failed-attempt.json", attempt)
        except OSError as json_write_error:
            raise json_write_error from error
        validate_failed_execution_attempt_v1(attempt, directory)
        try:
            final_directory.mkdir()
        except FileExistsError:
            try:
                _fail("V3_PODMAN_ATTEMPT_PUBLICATION_COLLISION", attempt_name)
            except core.ExecutionClosureValidationError as collision_error:
                raise collision_error from error
        final_reserved = True
        rename_error: OSError | None = None
        try:
            os.rename(directory, final_directory)
            published = True
        except OSError as caught_rename_error:
            rename_error = caught_rename_error
        finally:
            if final_reserved and not published:
                try:
                    shutil.rmtree(final_directory)
                except OSError:
                    pass
        if rename_error is not None:
            raise rename_error from error
    finally:
        try:
            shutil.rmtree(staging_parent)
        except OSError:
            pass


def _finalize_capture(commands: dict[str, dict[str, Any]], metadata: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """Builds a stable pre/post supplement capture from finalized shared refs.

    @param commands The finalized Git status and diff commands.
    @param metadata The current supplemental metadata map.
    @returns Identical pre and post capture snapshots.
    """
    snapshot = {
        "gitStatus": copy.deepcopy(commands["gitStatus"]),
        "stagedDiff": copy.deepcopy(commands["stagedDiff"]),
        "entries": copy.deepcopy(metadata),
    }
    return {"pre": copy.deepcopy(snapshot), "post": copy.deepcopy(snapshot)}


def _ensure_same_capture(first: dict[str, dict[str, Any]], second: dict[str, dict[str, Any]], metadata: dict[str, dict[str, Any]]) -> None:
    """Fails if source state or supplement bytes changed during candidate execution.

    @param first The pre-run Git captures.
    @param second The post-run Git captures.
    @param metadata The pre-run supplemental metadata map.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError When the shared worktree changed.
    """
    for name in ("gitStatus", "stagedDiff"):
        if _command_text(first[name], "stdout") != _command_text(second[name], "stdout") or _command_text(first[name], "stderr") != _command_text(second[name], "stderr"):
            _fail("V3_PODMAN_SOURCE_STATE_DRIFT", name)
    current = {path: {key: _supplement_entry(path)[key] for key in ("path", "sha256", "size", "mode")} for path in sorted(SUPPLEMENTAL_PATHS)}
    if current != metadata:
        _fail("V3_PODMAN_SUPPLEMENT_DRIFT")


class DirectCommandRuntimeProductionExecutorV1:
    """Owns the real, ordered direct-runtime transaction without constructor side effects."""

    def __init__(
        self,
        output_directory: Path | str,
        run_day: str,
        external_stop: dict[str, str] | None = None,
    ) -> None:
        """Stores immutable execution configuration without allocating execution resources.

        @param output_directory The final V3 destination reserved for a successful transaction.
        @param run_day The validated UTC day used by any later failure preservation.
        @param external_stop Optional explicit supervisor interruption evidence.
        @returns Nothing.
        """
        self.output_directory = Path(output_directory)
        self.run_day = run_day
        self.external_stop = copy.deepcopy(external_stop)
        self.started = False
        self._capacity_probe: dict[str, Any] | None = None
        self._temporary: Any | None = None
        self._stage: Path | None = None
        self._raw_dir: Path | None = None
        self._archive: dict[str, Any] | None = None
        self._context: dict[str, Any] | None = None
        self._execution_context: dict[str, Any] | None = None
        self._nested_pnpm_runtime: dict[str, Any] | None = None
        self._versions: dict[str, dict[str, Any]] | None = None
        self._toolchain: dict[str, Any] | None = None
        self._direct_node_split_semantics: dict[str, Any] | None = None
        self._segments: list[dict[str, Any]] | None = None
        self._trigger: dict[str, Any] | None = None
        self._preparation: dict[str, Any] | None = None
        self._pre_capture: dict[str, dict[str, Any]] | None = None
        self._podman: dict[str, Any] | None = None
        self._image: dict[str, Any] | None = None
        self._network: dict[str, dict[str, Any]] | None = None
        self._pre_inventories: dict[
            str,
            tuple[dict[str, Any], dict[str, Any]],
        ] | None = None
        self._hermetic_pnpm_contract: dict[str, Any] | None = None
        self._workspace_dag_contract: dict[str, Any] | None = None
        self._workspace_resolution: list[dict[str, Any]] | None = None
        self._workspace_output_inventories: list[dict[str, Any]] | None = None
        self._workspace_command_specs: list[dict[str, Any]] = []
        self._failure_reason = "initialization"
        self._direct_runtime_stage: str | None = None
        self._direct_runtime_preseal_attempt: dict[str, Any] | None = None
        self._sealed_integration: dict[str, Any] | None = None
        self._candidate_publication_failure: dict[str, Any] | None = None
        self._attempt_nonce: bytes | None = None
        self._same_attempt_identity_envelope: dict[str, Any] | None = None
        self._staged_commands: list[dict[str, Any]] = []
        self._receipt_commands: list[dict[str, Any]] = []

    def probe_capacity(self, preparation: dict[str, Any]) -> dict[str, Any]:
        """Observes the production filesystems before any transaction allocation.

        @param preparation The immutable pre-staging direct-runtime preparation.
        @returns The same-device capacity probe bound to the preparation budget.
        @throws core.ExecutionClosureValidationError When capacity was not probed first or is unavailable.
        """
        if self._capacity_probe is not None or self.started:
            _direct_runtime_integration_fail("PRODUCTION_CAPACITY_PROBE_REPEATED")
        self._capacity_probe = probe_direct_command_runtime_production_capacity_v1(
            preparation,
            {
                "temporary-stage": Path("/tmp"),
                "archive": self.output_directory.parent,
                "cow": HOST_STORE,
                "evidence": TRACK_DIR,
            },
        )
        return copy.deepcopy(self._capacity_probe)

    def build_archive(self, preparation: dict[str, Any]) -> dict[str, Any]:
        """Creates the private stage and archive after a successful capacity observation.

        @param preparation The immutable direct-runtime preparation.
        @returns The source archive carrying the pre-finalization detached packet.
        @throws core.ExecutionClosureValidationError When the transaction is out of order.
        """
        if self._capacity_probe is None or self.started:
            _direct_runtime_integration_fail("PRODUCTION_ARCHIVE_BEFORE_CAPACITY")
        self._temporary = tempfile.TemporaryDirectory(
            prefix="business-operations-r1-v3-podman-",
            dir="/tmp",
        )
        self._stage = Path(self._temporary.name)
        self._raw_dir = self._stage / "raw"
        self._raw_dir.mkdir()
        self._attempt_nonce = os.urandom(32)
        self.started = True
        self._archive = _build_archive(
            direct_runtime_preparation=preparation,
        )
        self._preparation = copy.deepcopy(preparation)
        self._failure_reason = "direct-runtime-preflight"
        self._direct_runtime_stage = self._failure_reason
        return self._archive

    def build_context(
        self,
        archive: dict[str, Any],
        preparation: dict[str, Any],
    ) -> dict[str, Any]:
        """Builds the clean Podman context from the staged archive and detached packet.

        @param archive The exact archive returned by build_archive.
        @param preparation The immutable direct-runtime preparation.
        @returns The isolated container context with only pre-finalization packet mounts.
        @throws core.ExecutionClosureValidationError When archive ownership or frozen trigger drift.
        """
        if (
            archive is not self._archive
            or self._stage is None
            or self._raw_dir is None
        ):
            _direct_runtime_integration_fail("PRODUCTION_CONTEXT_ARCHIVE_UNBOUND")
        archive_path = self._stage / "execution-closure.archive.json"
        _write_json(archive_path, archive)
        frozen = _load_json(core.V2_ARCHIVE)
        frozen_entries = frozen.get("entries")
        if not isinstance(frozen_entries, list):
            _direct_runtime_integration_fail("PRODUCTION_CONTEXT_FROZEN_ENTRIES_INVALID")
        frozen_index, self._trigger = _direct_runtime_trigger_v1(
            frozen_entries,
            STANDARD_PACK_GENERATOR,
        )
        selected_manifest = frozen_index.get(self._trigger["manifest"]["path"])
        if not isinstance(selected_manifest, dict):
            _direct_runtime_integration_fail(
                "PRODUCTION_CONTEXT_FROZEN_MANIFEST_INVALID",
            )
        self._direct_node_split_semantics = (
            derive_direct_node_split_semantics_from_frozen_script_v1(
                self._trigger,
                selected_manifest,
            )
        )
        segments = self._direct_node_split_semantics.get("segments")
        if not isinstance(segments, list):
            _direct_runtime_integration_fail(
                "PRODUCTION_CONTEXT_FROZEN_SEMANTICS_INVALID",
            )
        self._segments = segments
        self._nested_pnpm_runtime = build_nested_pnpm_runtime_shim_contract_v1()
        self._context = _podman_context(
            self._stage,
            archive_path,
            self._nested_pnpm_runtime,
            direct_runtime_preparation=preparation,
        )
        self._failure_reason = "direct-runtime-discovery"
        self._direct_runtime_stage = self._failure_reason
        self._pre_capture = _host_git_capture(self._raw_dir, "pre")
        self._staged_commands.extend(self._pre_capture.values())
        self._podman, self._image = _podman_host_evidence(self._raw_dir)
        self._staged_commands.extend(
            [
                self._podman["versionCommand"],
                self._image["inspectCommand"],
            ],
        )
        self._network = _network_proof(self._raw_dir, self._context)
        self._staged_commands.extend(
            [
                self._network["route"],
                self._network["dns"],
                self._network["tcp"],
            ],
        )
        self._pre_inventories = {}
        for mount in self._context["mounts"]:
            if mount["id"] == "work":
                continue
            self._failure_reason = f"inventory-{mount['id']}-pre"
            inventory, command = _inventory_mount(
                self._raw_dir,
                self._context,
                mount,
                "pre",
                self._staged_commands,
            )
            self._pre_inventories[mount["id"]] = (inventory, command)
        frozen_entries = frozen.get("entries")
        if not isinstance(frozen_entries, list):
            _workspace_dag_fail("FROZEN_ENTRIES_INVALID")
        self._workspace_dag_contract = (
            build_workspace_prerequisite_build_dag_contract_v1(
                frozen_entries,
                STANDARD_PACK_GENERATOR,
            )
        )
        validate_workspace_prerequisite_build_dag_contract_v1(
            self._workspace_dag_contract,
            frozen_entries,
        )
        self._workspace_resolution = _workspace_installed_resolution_records_v1(
            self._workspace_dag_contract,
        )
        validate_installed_workspace_build_resolution_v1(
            self._workspace_dag_contract,
            self._workspace_resolution,
        )
        self._workspace_command_specs = _workspace_prerequisite_command_specs_v1(
            self._workspace_dag_contract,
        )
        return self._context

    def materialize(
        self,
        context: dict[str, Any],
        preparation: dict[str, Any],
    ) -> dict[str, Any]:
        """Materializes the sealed packet and performs the required offline dependency install.

        @param context The exact context returned by build_context.
        @param preparation The immutable direct-runtime preparation.
        @returns The materialization, probe, replay, and offline-install observations.
        @throws core.ExecutionClosureValidationError When detached packet materialization or install fails.
        """
        if context is not self._context or self._archive is None or self._raw_dir is None:
            _direct_runtime_integration_fail("PRODUCTION_MATERIALIZATION_CONTEXT_UNBOUND")
        self._versions, self._toolchain = _tool_versions(self._raw_dir, context)
        versions = self._versions
        self._failure_reason = "materialize"
        self._direct_runtime_stage = self._failure_reason
        materialize = self._run(
            "materialize",
            "receipt-materialize",
            ["node", "materialize-v3"],
            [
                CONTAINER_NODE,
                "/runner/materialize.mjs",
                "/runner/archive.json",
                "/runner/direct-runtime-source-packet.json",
                "/work",
            ],
        )
        expected_materialization = {
            "sourcePacketSha256": preparation["packetMaterialization"][
                "sourcePacketSha256"
            ],
            "entries": preparation["packetMaterialization"]["entries"],
        }
        materialized = _parse_stdout(materialize, "materialize")
        if (
            materialized.get("inventory") != self._archive["closureInventory"]
            or materialized.get("directRuntimeMaterialization")
            != expected_materialization
        ):
            _direct_runtime_integration_fail("PRODUCTION_MATERIALIZATION_INVALID")
        self._failure_reason = "direct-runtime-materialization-probe"
        self._direct_runtime_stage = self._failure_reason
        materialization_probe = self._run(
            "direct-runtime-materialization-probe",
            "receipt-direct-runtime-materialization-probe",
            ["node", "direct-runtime-materialization-probe"],
            [
                CONTAINER_NODE,
                "/runner/direct-runtime-materialization-probe.mjs",
                "/runner/archive.json",
                "/runner/direct-runtime-source-packet.json",
                "/work",
            ],
        )
        if (
            _parse_stdout(
                materialization_probe,
                "direct-runtime-materialization-probe",
            )
            != expected_materialization
        ):
            _direct_runtime_integration_fail("MATERIALIZATION_PROBE_INVALID")
        replay = self._run(
            "replay",
            "receipt-replay",
            ["node", "replay-v3"],
            [CONTAINER_NODE, "/runner/replay.mjs", "/runner/archive.json", "/work"],
        )
        replayed = _parse_stdout(replay, "replay")
        if (
            replayed.get("inventory") != self._archive["closureInventory"]
            or replayed.get("sourcePathsOutsideWork") != []
            or replayed.get("preexistingGeneratedPaths") != []
        ):
            _direct_runtime_integration_fail("PRODUCTION_REPLAY_INVALID")
        self._hermetic_pnpm_contract = build_hermetic_pnpm_install_contract_v1(
            self._archive["entries"],
            versions["pnpm"]["stdout"],
        )
        contract = self._hermetic_pnpm_contract
        self._failure_reason = "offline-install"
        offline_install = self._run(
            "offline-install",
            "receipt-offline-install",
            list(HERMETIC_PNPM_INSTALL),
            [CONTAINER_NODE, CONTAINER_PNPM, *HERMETIC_PNPM_PAYLOAD_SUFFIX],
            toolchain=self._toolchain,
        )
        offline_install["registryAttestation"] = _hermetic_pnpm_registry_attestation(
            _command_text(offline_install, "stdout"),
            _command_text(offline_install, "stderr"),
            contract,
        )
        _require_zero(offline_install, "offline-install")
        if (
            self._workspace_dag_contract is None
            or self._workspace_resolution is None
        ):
            _workspace_dag_fail("EXECUTION_CONTRACT_INVALID")
        resolution_spec = next(
            (
                specification
                for specification in self._workspace_command_specs
                if specification.get("kind") == "resolution"
            ),
            None,
        )
        if not isinstance(resolution_spec, dict):
            _workspace_dag_fail("EXECUTION_CONTRACT_INVALID")
        resolution_command = self._run(
            resolution_spec["id"],
            f"receipt-{resolution_spec['id']}",
            resolution_spec["logicalArgv"],
            resolution_spec["payloadArgv"],
        )
        observed_resolution = _parse_stdout(
            resolution_command,
            resolution_spec["id"],
        )
        if observed_resolution != {"resolutions": self._workspace_resolution}:
            _workspace_dag_fail("INSTALLED_RESOLUTION_INVALID")
        validate_installed_workspace_build_resolution_v1(
            self._workspace_dag_contract,
            self._workspace_resolution,
        )
        for command_id, logical in (
            ("build-db", BUILDS[0]),
            ("build-auth", BUILDS[1]),
            ("build-backend", BUILDS[2]),
        ):
            command = self._run(
                command_id,
                f"receipt-{command_id}",
                logical,
                build_pnpm_global_store_payload_v1(logical),
                toolchain=self._toolchain,
            )
            _require_zero(command, command_id)
        self._workspace_output_inventories = []
        runtime_logical = (
            self._segments[0]["logicalArgv"]
            if self._segments is not None
            else None
        )
        for specification in self._workspace_command_specs:
            kind = specification.get("kind")
            if kind == "resolution":
                continue
            command_id = specification.get("id")
            logical = specification.get("logicalArgv")
            payload = specification.get("payloadArgv")
            if (
                not isinstance(command_id, str)
                or not isinstance(logical, list)
                or not isinstance(payload, list)
                or logical == runtime_logical
            ):
                _workspace_dag_fail("EXECUTION_CONTRACT_INVALID")
            command = self._run(
                command_id,
                f"receipt-{command_id}",
                logical,
                payload,
                toolchain=self._toolchain if kind == "build" else None,
            )
            _require_zero(command, command_id)
            if kind == "build":
                validate_workspace_prerequisite_pnpm_executor_v1(
                    command,
                    self._workspace_dag_contract,
                )
            elif kind == "output-inventory":
                observed_outputs = _parse_stdout(command, command_id)
                outputs = observed_outputs.get("outputs")
                if not isinstance(outputs, list) or len(outputs) != 1:
                    _workspace_dag_fail("OUTPUT_INVENTORY_INVALID")
                self._workspace_output_inventories.extend(outputs)
            elif kind != "clear":
                _workspace_dag_fail("EXECUTION_CONTRACT_INVALID")
        validate_workspace_prerequisite_build_output_inventories_v1(
            self._workspace_dag_contract,
            self._workspace_output_inventories,
        )
        return {
            "materialize": materialize,
            "materializationProbe": materialization_probe,
            "replay": replay,
            "offlineInstall": offline_install,
            "toolVersions": versions,
            "hermeticPnpmInstall": contract,
            "workspacePrerequisiteBuildDag": self._workspace_dag_contract,
            "workspaceBuildResolution": self._workspace_resolution,
            "workspacePrerequisiteOutputInventories": (
                self._workspace_output_inventories
            ),
        }

    def _direct_node_split_segment_context(
        self,
        context: dict[str, Any],
        segment: dict[str, Any],
    ) -> dict[str, Any]:
        """Derives one package-cwd command context from stored frozen split semantics.

        @param context The clean base or trace context rooted at `/work`.
        @param segment The stored frozen runtime-build or direct-Node segment.
        @returns A command-local context carrying only the selected semantic provenance.
        @throws core.ExecutionClosureValidationError When the stored semantic carrier cannot bind the command context.
        """
        semantics = self._direct_node_split_semantics
        prefix = context.get("prefix") if isinstance(context, dict) else None
        mounts = context.get("mounts", []) if isinstance(context, dict) else None
        frozen_script = (
            semantics.get("frozenScript") if isinstance(semantics, dict) else None
        )
        clean_environment = (
            semantics.get("cleanEnvironment") if isinstance(semantics, dict) else None
        )
        stored_segments = semantics.get("segments") if isinstance(semantics, dict) else None
        cwd = segment.get("cwd") if isinstance(segment, dict) else None
        if (
            not isinstance(prefix, list)
            or not isinstance(mounts, list)
            or prefix
            != build_direct_node_split_canonical_prefix_v1(mounts, "/work")
            or not isinstance(cwd, str)
            or not cwd.startswith("/work/")
            or not isinstance(frozen_script, dict)
            or not isinstance(clean_environment, dict)
            or not isinstance(stored_segments, list)
            or len(stored_segments) != 2
            or [item.get("id") if isinstance(item, dict) else None for item in stored_segments]
            != [
                "build-advantage-play-kit-for-runtime",
                "generate-standard-pack-catalog",
            ]
            or sum(segment == item for item in stored_segments) != 1
        ):
            _direct_runtime_integration_fail(
                "PRODUCTION_DIRECT_NODE_SPLIT_SEMANTICS_UNBOUND",
            )
        segment_prefix = build_direct_node_split_canonical_prefix_v1(mounts, cwd)
        return {
            **context,
            "mounts": copy.deepcopy(mounts),
            "prefix": segment_prefix,
            "directNodeSplit": {
                "frozenScript": copy.deepcopy(frozen_script),
                "cleanEnvironment": copy.deepcopy(clean_environment),
                "segment": copy.deepcopy(segment),
            },
        }

    def runtime_build(
        self,
        context: dict[str, Any],
        materialization: dict[str, Any],
        preparation: dict[str, Any],
    ) -> dict[str, Any]:
        """Runs exactly the frozen prerequisite build and records its staged receipt identity.

        @param context The exact clean context returned by build_context.
        @param materialization The successful materialization result.
        @param preparation The immutable direct-runtime preparation.
        @returns The one successful runtime-build receipt accepted by finalization.
        @throws core.ExecutionClosureValidationError When the frozen build segment is unavailable or fails.
        """
        if (
            context is not self._context
            or self._segments is None
            or self._direct_node_split_semantics is None
            or self._toolchain is None
            or self._attempt_nonce is None
            or not isinstance(materialization, dict)
        ):
            _direct_runtime_integration_fail("PRODUCTION_RUNTIME_BUILD_CONTEXT_UNBOUND")
        segment = self._segments[0]
        logical = segment["logicalArgv"]
        execution_context = self._direct_node_split_segment_context(context, segment)
        command = self._run(
            segment["id"],
            f"receipt-{segment['id']}",
            logical,
            build_pnpm_global_store_payload_v1(logical),
            toolchain=self._toolchain,
            environment_overrides=segment["environmentOverrides"],
            context=execution_context,
        )
        _require_zero(command, segment["id"])
        self._direct_runtime_stage = segment["id"]
        command["directRuntimePreparationSha256"] = _sha256(
            _canonical(preparation),
        )
        command["directRuntimeAttempt"] = {
            "id": "direct-runtime-detached-runner-v1",
            "nonceSha256": _sha256(self._attempt_nonce),
            "reachedStage": "direct-runtime-dist-identity",
            "executionTrace": None,
        }
        command["receipt"] = self._staged_stdout_reference(command)
        return copy.deepcopy(command)

    def post_build_identity(
        self,
        context: dict[str, Any],
        runtime_build_receipt: dict[str, Any],
        preparation: dict[str, Any],
    ) -> dict[str, Any]:
        """Observes the generated dist bytes and builds the receipt-bound runtime read set.

        @param context The exact clean context returned by build_context.
        @param runtime_build_receipt The successful prerequisite-build receipt.
        @param preparation The immutable direct-runtime preparation.
        @returns The in-container derived-read identity used by the real finalizer.
        @throws core.ExecutionClosureValidationError When observed derived bytes drift from the declared path set.
        """
        if (
            context is not self._context
            or self._trigger is None
            or self._attempt_nonce is None
        ):
            _direct_runtime_integration_fail("PRODUCTION_POST_BUILD_CONTEXT_UNBOUND")
        dynamic = preparation.get("dynamicBuildOutput")
        packet = preparation.get("sourcePacket")
        discovery = preparation.get("baselineGitDiscovery")
        if (
            not isinstance(dynamic, dict)
            or not isinstance(packet, dict)
            or not isinstance(discovery, dict)
            or not isinstance(dynamic.get("knownDerivedBuildPaths"), list)
        ):
            _direct_runtime_integration_fail("PRODUCTION_POST_BUILD_PREPARATION_INVALID")
        expected_paths = [
            item.get("path")
            for item in dynamic["knownDerivedBuildPaths"]
            if isinstance(item, dict)
        ]
        if (
            not expected_paths
            or any(not isinstance(path, str) for path in expected_paths)
            or expected_paths != sorted(expected_paths)
            or len(set(expected_paths)) != len(expected_paths)
        ):
            _direct_runtime_integration_fail("PRODUCTION_POST_BUILD_PREPARATION_INVALID")
        attempt_nonce_sha256 = _sha256(self._attempt_nonce)
        runtime_attempt = runtime_build_receipt.get("directRuntimeAttempt")
        if (
            not isinstance(runtime_attempt, dict)
            or runtime_attempt.get("nonceSha256") != attempt_nonce_sha256
        ):
            _direct_runtime_integration_fail("PRODUCTION_POST_BUILD_ATTEMPT_UNBOUND")
        observation = self._run(
            "direct-runtime-dist-identity",
            "receipt-direct-runtime-dist-identity",
            ["node", "direct-runtime-dist-identity"],
            [
                CONTAINER_NODE,
                "/runner/direct-runtime-dist-identity.mjs",
                json.dumps(
                    {
                        "attemptNonceSha256": attempt_nonce_sha256,
                        "expected": [{"path": path} for path in expected_paths],
                        "workRoot": "/work",
                    },
                    separators=(",", ":"),
                    sort_keys=True,
                ),
            ],
        )
        _require_zero(observation, "direct-runtime-dist-identity")
        observed = _parse_stdout(observation, "direct-runtime-dist-identity")
        rows = observed.get("derivedBuildReadSet")
        if (
            set(observed)
            != {"attemptNonceSha256", "derivedBuildReadSet", "workRoot"}
            or observed.get("attemptNonceSha256") != attempt_nonce_sha256
            or observed.get("workRoot") != "/work"
            or not isinstance(rows, list)
            or [row.get("path") if isinstance(row, dict) else None for row in rows]
            != expected_paths
            or any(
                not isinstance(row, dict)
                or set(row) != {"mode", "path", "resolvedPath", "sha256", "size"}
                or row.get("resolvedPath") != f"/work/{path}"
                or not isinstance(row.get("mode"), str)
                or re.fullmatch(r"100[0-7]{3}", row["mode"]) is None
                or not isinstance(row.get("sha256"), str)
                or re.fullmatch(r"[0-9a-f]{64}", row["sha256"]) is None
                or type(row.get("size")) is not int
                or row["size"] < 0
                for path, row in zip(expected_paths, rows)
            )
        ):
            _direct_runtime_integration_fail("PRODUCTION_POST_BUILD_IDENTITY_INVALID")
        identity_receipt = self._staged_stdout_reference(observation)
        receipt = runtime_build_receipt.get("receipt")
        producer_class = dynamic["knownDerivedBuildPaths"][0].get("producerClass")
        if not isinstance(producer_class, dict):
            _direct_runtime_integration_fail("PRODUCTION_POST_BUILD_PREPARATION_INVALID")
        derived = [
            {
                "path": row["path"],
                "sha256": row["sha256"],
                "size": row["size"],
                "origin": "DERIVED_BUILD_OUTPUT",
                "producer": {
                    **copy.deepcopy(producer_class),
                    "receipt": copy.deepcopy(receipt),
                },
            }
            for row in rows
        ]
        baseline = packet.get("baselineReadSet")
        root = discovery.get("root")
        script = next(
            (
                identity
                for identity in baseline
                if isinstance(identity, dict)
                and identity.get("path") == self._trigger["scriptPath"]
            ),
            None,
        ) if isinstance(baseline, list) else None
        if not isinstance(script, dict) or not isinstance(root, str):
            _direct_runtime_integration_fail("PRODUCTION_POST_BUILD_PREPARATION_INVALID")
        directories = {root}
        for identity in baseline:
            if isinstance(identity, dict) and isinstance(identity.get("path"), str):
                parent = posixpath.dirname(identity["path"])
                while parent.startswith(f"{root}/"):
                    directories.add(parent)
                    parent = posixpath.dirname(parent)
        quota_bytes = sum(
            identity["size"]
            for identity in baseline
            if isinstance(identity, dict) and isinstance(identity.get("size"), int)
        )
        read_set = {
            "schemaVersion": 1,
            "kind": "direct-command-runtime-read-set",
            "trigger": {
                "logicalArgv": list(self._trigger["logicalArgv"]),
                "package": self._trigger["package"],
                "manifest": copy.deepcopy(self._trigger["manifest"]),
            },
            "baselineReadSet": copy.deepcopy(baseline),
            "derivedBuildReadSet": derived,
            "outputPaths": copy.deepcopy(dynamic["declaredOutputPaths"]),
            "preflightQuota": {
                "maxEntries": len(baseline),
                "maxBytes": quota_bytes,
                "observedEntries": len(baseline),
                "observedBytes": quota_bytes,
            },
            "resourceBudget": copy.deepcopy(preparation["resourceBudget"]),
            "discovery": {
                "kind": "BASELINE_GIT_INSTRUMENTED_TRACE",
                "script": copy.deepcopy(script),
                "root": root,
                "directoryListingCount": len(directories),
            },
        }
        _direct_runtime_validate_read_set_shape_v1(
            read_set,
            preparation["resourceBudget"],
        )
        self._direct_runtime_stage = "direct-runtime-dist-identity"
        return {
            "source": "IN_CONTAINER_POST_RUNTIME_BUILD_IDENTITY",
            "directRuntimePreparationSha256": _sha256(_canonical(preparation)),
            "readSet": read_set,
            "observation": observed,
            "receipt": identity_receipt,
        }

    def build_same_attempt_identity_envelope(
        self,
        preparation: dict[str, Any],
        archive: dict[str, Any],
        context: dict[str, Any],
        runtime_build_receipt: dict[str, Any],
        post_build_identity: dict[str, Any],
    ) -> dict[str, Any]:
        """Builds the private H1 identity envelope from the exact executed transaction carriers.

        @param preparation The immutable preparation consumed by this transaction.
        @param archive The exact archive staged before materialization.
        @param context The exact base execution context.
        @param runtime_build_receipt The successful prerequisite-build receipt.
        @param post_build_identity The nonce-bound post-build observer result.
        @returns The separately owned same-attempt identity envelope.
        @throws core.ExecutionClosureValidationError When a caller supplies unbound carriers or repeats sealing.
        """
        if (
            self._attempt_nonce is None
            or self._same_attempt_identity_envelope is not None
            or archive is not self._archive
            or context is not self._context
        ):
            _direct_runtime_integration_fail(
                "PRODUCTION_SAME_ATTEMPT_ENVELOPE_UNBOUND",
            )
        envelope = build_direct_command_runtime_same_attempt_identity_envelope_v1(
            preparation,
            archive,
            context,
            runtime_build_receipt,
            post_build_identity,
            self._attempt_nonce,
        )
        self._same_attempt_identity_envelope = copy.deepcopy(envelope)
        return copy.deepcopy(envelope)

    def bind_finalization(
        self,
        archive: dict[str, Any],
        context: dict[str, Any],
        integration: dict[str, Any],
    ) -> dict[str, Any]:
        """Records a sealed finalizer result without rewriting archive or base-context bytes.

        @param archive The immutable archive returned before materialization.
        @param context The immutable base context returned before finalization.
        @param integration The sealed finalizer output accepted for generation.
        @returns A separately owned sealed integration carrier for later execution stages.
        @throws core.ExecutionClosureValidationError When finalization is repeated or unbound.
        """
        if (
            archive is not self._archive
            or context is not self._context
            or self._sealed_integration is not None
        ):
            _direct_runtime_integration_fail("PRODUCTION_FINALIZATION_BINDING_UNBOUND")
        validate_direct_command_runtime_runner_integration_v1(integration)
        if self._same_attempt_identity_envelope is None:
            _direct_runtime_integration_fail(
                "PRODUCTION_SAME_ATTEMPT_ENVELOPE_UNBOUND",
            )
        validate_direct_command_runtime_same_attempt_identity_binding_v1(
            self._same_attempt_identity_envelope,
            archive,
            context,
        )
        if (
            archive.get("directRuntimeSourcePacket") != integration["sourcePacket"]
            or archive.get("directRuntimePacketMaterialization")
            != integration["packetMaterialization"]
            or archive.get("directRuntimeBaselineReadSet")
            != integration["readSet"]["baselineReadSet"]
        ):
            _direct_runtime_integration_fail("PRODUCTION_FINALIZATION_ARCHIVE_DRIFT")
        self._sealed_integration = copy.deepcopy(integration)
        self._direct_runtime_stage = integration["attempt"]["reachedStage"]
        return copy.deepcopy(self._sealed_integration)

    def generate(
        self,
        context: dict[str, Any],
        integration: dict[str, Any],
    ) -> dict[str, Any]:
        """Binds trace configuration and runs the frozen direct-Node generator exactly once.

        @param context The exact clean context returned by build_context.
        @param integration The real finalizer result for this transaction.
        @returns The successful direct-Node generation receipt and output identity.
        @throws core.ExecutionClosureValidationError When finalization or direct generation is unbound.
        """
        if (
            context is not self._context
            or self._segments is None
            or self._direct_node_split_semantics is None
            or self._sealed_integration != integration
        ):
            _direct_runtime_integration_fail("PRODUCTION_GENERATION_CONTEXT_UNBOUND")
        validate_direct_command_runtime_runner_integration_v1(integration)
        execution_context = self._derive_trace_execution_context(
            context,
            integration,
        )
        clear = self._run(
            "clear-stale-standard-pack-catalog",
            "receipt-clear-stale-standard-pack-catalog",
            ["rm", "-f", STANDARD_PACK_CATALOG],
            ["/bin/rm", "-f", STANDARD_PACK_CATALOG],
            context=execution_context,
        )
        _require_zero(clear, "clear-stale-standard-pack-catalog")
        segment = self._segments[1]
        logical = segment["logicalArgv"]
        script = segment.get("script") if isinstance(segment, dict) else None
        logical_path = script.get("logicalPath") if isinstance(script, dict) else None
        if (
            not isinstance(logical, list)
            or logical[0] != "node"
            or not isinstance(script, dict)
            or script.get("resolvedPath") != f"/work/{logical_path}"
            or segment.get("environmentOverrides")
            != {"NODE_OPTIONS": DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS}
        ):
            _direct_runtime_integration_fail("PRODUCTION_DIRECT_NODE_GENERATOR_INVALID")
        direct_execution_context = self._direct_node_split_segment_context(
            execution_context,
            segment,
        )
        generation = self._run(
            segment["id"],
            f"receipt-{segment['id']}",
            logical,
            [CONTAINER_NODE, script["resolvedPath"]],
            environment_overrides=segment["environmentOverrides"],
            context=direct_execution_context,
        )
        _require_zero(generation, segment["id"])
        catalog = direct_execution_context["work"] / STANDARD_PACK_CATALOG
        if not catalog.is_file() or catalog.is_symlink():
            _direct_runtime_integration_fail("PRODUCTION_STANDARD_PACK_OUTPUT_MISSING")
        catalog_bytes = catalog.read_bytes()
        generation["output"] = {
            "path": STANDARD_PACK_CATALOG,
            "sha256": _sha256(catalog_bytes),
            "size": len(catalog_bytes),
        }
        self._direct_runtime_stage = segment["id"]
        return generation

    def capture_trace(
        self,
        context: dict[str, Any],
        integration: dict[str, Any],
        generation: dict[str, Any],
    ) -> dict[str, Any]:
        """Captures and validates the in-container trace emitted by the direct Node child.

        @param context The exact clean context returned by build_context.
        @param integration The finalizer-sealed runtime integration.
        @param generation The successful direct-Node generation receipt.
        @returns The parsed trace, raw receipt, and completed integration state.
        @throws core.ExecutionClosureValidationError When the trace is incomplete or unbound.
        """
        if (
            context is not self._context
            or self._execution_context is None
            or self._sealed_integration != integration
            or self._same_attempt_identity_envelope is None
            or generation.get("id") != "generate-standard-pack-catalog"
        ):
            _direct_runtime_integration_fail("PRODUCTION_TRACE_GENERATION_UNBOUND")
        if (
            integration.get("attempt", {}).get("nonceSha256")
            != self._same_attempt_identity_envelope["attemptNonceSha256"]
        ):
            _direct_runtime_integration_fail(
                "PRODUCTION_TRACE_SAME_ATTEMPT_UNBOUND",
            )
        active_context = self._execution_context
        post_generator_identity = self._run(
            "direct-runtime-dist-identity-post-generator",
            "receipt-direct-runtime-dist-identity-post-generator",
            ["node", "direct-runtime-dist-identity-post-generator"],
            [
                CONTAINER_NODE,
                "/runner/direct-runtime-dist-identity.mjs",
                json.dumps(
                    {
                        "attemptNonceSha256": (
                            self._same_attempt_identity_envelope[
                                "attemptNonceSha256"
                            ]
                        ),
                        "expected": [
                            {
                                key: item[key]
                                for key in ("path", "sha256", "size")
                            }
                            for item in integration["readSet"][
                                "derivedBuildReadSet"
                            ]
                        ],
                        "workRoot": "/work",
                    },
                    separators=(",", ":"),
                    sort_keys=True,
                ),
            ],
            context=active_context,
        )
        post_generator_identity["directRuntimeDistIdentity"] = _parse_stdout(
            post_generator_identity,
            "direct-runtime-dist-identity-post-generator",
        )
        _validate_direct_runtime_post_generator_dist_identity_v1(
            integration,
            post_generator_identity,
        )
        validate_direct_command_runtime_same_attempt_identity_before_trace_v1(
            self._same_attempt_identity_envelope,
            post_generator_identity["directRuntimeDistIdentity"],
        )
        trace_command = self._run(
            "direct-runtime-trace",
            "receipt-direct-runtime-trace",
            ["node", "direct-runtime-trace-receipt"],
            [
                CONTAINER_NODE,
                "/runner/direct-runtime-trace-receipt.mjs",
                DIRECT_RUNTIME_TRACE_CONFIG_PATH,
            ],
            context=active_context,
        )
        raw_trace_receipt = _parse_stdout(trace_command, "direct-runtime-trace")
        envelope = capture_direct_command_runtime_in_container_trace_v1(
            raw_trace_receipt,
            integration,
        )
        trace = parse_direct_command_runtime_trace_events_v1(envelope, integration)
        validate_direct_command_runtime_execution_trace_v1(
            integration["readSetContract"],
            trace,
        )
        completed_attempt = {
            "id": integration["attempt"]["id"],
            "reachedStage": "direct-runtime-trace",
            "executionTrace": trace,
        }
        if "nonceSha256" in integration["attempt"]:
            completed_attempt["nonceSha256"] = integration["attempt"][
                "nonceSha256"
            ]
        completed_integration = build_direct_command_runtime_runner_integration_v1(
            integration["readSet"],
            integration["sourcePacket"],
            completed_attempt,
            integration["resourceBudget"],
        )
        validate_direct_command_runtime_runner_integration_v1(
            completed_integration,
        )
        self._sealed_integration = copy.deepcopy(completed_integration)
        self._direct_runtime_stage = "direct-runtime-trace"
        publication = self._complete_candidate_after_trace(
            completed_integration,
            raw_trace_receipt,
        )
        return {
            "executionTrace": trace,
            "rawTraceReceipt": raw_trace_receipt,
            "postGeneratorIdentity": post_generator_identity,
            "integration": completed_integration,
            "publication": publication,
        }

    def _run(
        self,
        command_id: str,
        raw_id: str,
        logical: list[str],
        payload: list[str],
        *,
        toolchain: dict[str, Any] | None = None,
        environment_overrides: dict[str, str] | None = None,
        context: dict[str, Any] | None = None,
        receipt: bool = True,
    ) -> dict[str, Any]:
        """Runs and records one real in-container command for this transaction.

        @param command_id The canonical transaction command identifier.
        @param raw_id The unique raw output stream identifier.
        @param logical The contract-level command argv.
        @param payload The absolute executable argv inside the container.
        @param toolchain Optional verified pnpm toolchain identity.
        @param environment_overrides Optional exact clean-environment additions.
        @param context Optional sealed execution context; the base context is used when omitted.
        @param receipt Whether this command belongs in the public gate receipt.
        @returns The staged command receipt.
        @throws core.ExecutionClosureValidationError When the executor has no private raw directory.
        """
        active_context = self._context if context is None else context
        if self._raw_dir is None or active_context is None:
            _direct_runtime_integration_fail("PRODUCTION_COMMAND_CONTEXT_UNBOUND")
        preseal_stages = _DIRECT_RUNTIME_RUNNER_STAGES[
            : _DIRECT_RUNTIME_RUNNER_STAGES.index("direct-runtime-dist-identity") + 1
        ]
        preseal_attempt: dict[str, Any] | None = None
        if command_id in preseal_stages:
            preseal_attempt = _build_direct_runtime_preseal_attempt_v1(
                self._preparation,
                self._attempt_nonce,
                command_id,
            )
            self._direct_runtime_preseal_attempt = copy.deepcopy(preseal_attempt)
        self._failure_reason = command_id
        command = _run_container(
            self._raw_dir,
            raw_id,
            active_context,
            logical,
            payload,
            toolchain,
            environment_overrides,
        )
        command["id"] = command_id
        if preseal_attempt is not None and command.get("exitCode") != 0:
            command["directRuntimePreparationSha256"] = preseal_attempt[
                "preparationSha256"
            ]
            command["directRuntimeAttempt"] = copy.deepcopy(
                preseal_attempt["attempt"],
            )
        self._staged_commands.append(command)
        if receipt:
            self._receipt_commands.append(command)
        return command

    def _staged_stdout_reference(self, command: dict[str, Any]) -> dict[str, Any]:
        """Builds the final-candidate raw stdout reference from bytes already staged by a command.

        @param command The successful staged command whose stdout is receipt evidence.
        @returns The future V3 raw-stream reference with exact staged byte identity.
        @throws core.ExecutionClosureValidationError When the staged command has no raw identifier.
        """
        raw_id = command.get("_rawId")
        if not isinstance(raw_id, str) or not raw_id:
            _direct_runtime_integration_fail("PRODUCTION_RECEIPT_RAW_ID_INVALID")
        data = _command_text(command, "stdout").encode("utf-8")
        return {
            "path": f"{V3_NAME}/raw/{raw_id}.stdout.txt",
            "sha256": _sha256(data),
            "size": len(data),
        }

    def _derive_trace_execution_context(
        self,
        context: dict[str, Any],
        integration: dict[str, Any],
    ) -> dict[str, Any]:
        """Derives one sealed trace context without mutating pre-execution carrier bytes.

        @param context The immutable clean container context returned by build_context.
        @param integration The finalizer-sealed runtime integration.
        @returns A context clone carrying the trace-config mount and inventory.
        @throws core.ExecutionClosureValidationError When a trace configuration was already installed.
        """
        stage = self._stage
        if stage is None or context is not self._context:
            _direct_runtime_integration_fail("PRODUCTION_TRACE_CONFIG_STAGE_UNBOUND")
        if self._execution_context is not None:
            _direct_runtime_integration_fail("PRODUCTION_TRACE_CONFIG_REPEATED")
        if any(
            mount.get("id") == "runnerTool:direct-runtime-trace-config"
            for mount in context["mounts"]
            if isinstance(mount, dict)
        ):
            _direct_runtime_integration_fail("PRODUCTION_TRACE_CONFIG_REPEATED")
        execution_context = copy.deepcopy(context)
        trace_policy = integration["tracePolicy"]
        trace_config = stage / "runner" / "direct-runtime-trace-config.json"
        _write_json(
            trace_config,
            {
                "schemaVersion": 1,
                "kind": "direct-command-runtime-in-container-trace-config",
                "evidence": trace_policy["evidence"],
                "tracer": trace_policy["tracer"],
                "rawEventArtifact": trace_policy["rawEventArtifact"],
                "nonce": trace_policy["nonce"],
                "packetSha256": integration["sourcePacket"]["packetSha256"],
                "maxEvents": trace_policy["maxEvents"],
                "targetRoot": "/work",
                "artifactPath": "/work/.direct-runtime-trace/direct-runtime-raw-events.jsonl",
                "generatorScript": trace_policy["generatorScript"],
                "generatorResolvedPath": trace_policy["generatorResolvedPath"],
                "nodeOptions": DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS,
                "activation": trace_policy["activation"],
                "parentPnpm": trace_policy["parentPnpm"],
                "baselineReadSet": integration["readSet"]["baselineReadSet"],
                "derivedBuildReadSet": integration["readSet"]["derivedBuildReadSet"],
                "outputPaths": integration["readSet"]["outputPaths"],
            },
        )
        mount = {
            "id": "runnerTool:direct-runtime-trace-config",
            "source": str(trace_config.resolve()),
            "target": DIRECT_RUNTIME_TRACE_CONFIG_PATH,
            "access": "ro",
            "purpose": "nonce-bound-in-container-esm-tracer-config",
        }
        execution_context["mounts"].append(mount)
        execution_context["prefix"] = build_direct_node_split_canonical_prefix_v1(
            execution_context["mounts"],
            "/work",
        )
        execution_context["declaredExecutors"].append(mount["target"])
        if self._raw_dir is None or self._pre_inventories is None:
            _direct_runtime_integration_fail(
                "PRODUCTION_TRACE_CONFIG_INVENTORY_UNBOUND",
            )
        inventory, command = _inventory_mount(
            self._raw_dir,
            execution_context,
            mount,
            "pre",
            self._staged_commands,
        )
        self._pre_inventories[mount["id"]] = (inventory, command)
        self._execution_context = execution_context
        return execution_context

    def _complete_candidate_after_trace(
        self,
        completed_integration: dict[str, Any],
        raw_trace_receipt: dict[str, Any],
    ) -> dict[str, Any]:
        """Runs every post-trace gate before private candidate publication.

        @param completed_integration The trace-complete runtime integration.
        @param raw_trace_receipt The parsed receipt emitted by the in-container tracer.
        @returns The atomically published candidate summary.
        @throws core.ExecutionClosureValidationError When an FR4, audit, inventory, or publication gate fails.
        """
        archive = self._archive
        context = self._execution_context
        raw_dir = self._raw_dir
        toolchain = self._toolchain
        pre_capture = self._pre_capture
        pre_inventories = self._pre_inventories
        if (
            archive is None
            or context is None
            or raw_dir is None
            or toolchain is None
            or pre_capture is None
            or pre_inventories is None
            or self._sealed_integration != completed_integration
        ):
            _direct_runtime_integration_fail("PRODUCTION_POST_TRACE_CONTEXT_UNBOUND")
        validate_direct_command_runtime_runner_integration_v1(
            completed_integration,
        )
        for command_id, logical in FR4:
            command = self._run(
                command_id,
                f"receipt-{command_id}",
                logical,
                build_pnpm_global_store_payload_v1(logical),
                toolchain=toolchain,
                context=context,
            )
            _require_zero(command, command_id)
        graph = self._run(
            "graph-scan",
            "graph-scan",
            ["repo-graph", "scan", ".", "./graph.db"],
            [CONTAINER_REPO_GRAPH, "scan", ".", "./graph.db"],
            context=context,
            receipt=False,
        )
        _require_zero(graph, "graph-scan")
        runtime_audit = self._run(
            "clean-audit",
            "clean-audit",
            ["node", "clean-audit-v3"],
            [CONTAINER_NODE, "/runner/audit.mjs", "/runner/archive.json", "/work"],
            context=context,
            receipt=False,
        )
        audit_value = _parse_stdout(runtime_audit, "clean-audit")
        if audit_value.get("sourcePathsOutsideWork") != []:
            _fail("V3_PODMAN_RUNTIME_PATH_ESCAPE")
        compensation_command = self._run(
            "compensation-denominator",
            "compensation-denominator",
            ["node", "compensation-denominator-v3"],
            [
                CONTAINER_NODE,
                "-e",
                (
                    "process.stdout.write(JSON.stringify("
                    f"{{sourceEntries:{archive['closureInventory']['entryCount']},"
                    f"fr4Commands:{len(FR4)}}}));"
                ),
            ],
            context=context,
            receipt=False,
        )
        _parse_stdout(compensation_command, "compensation-denominator")
        self._failure_reason = "supplements-post-capture"
        post_capture = _host_git_capture(raw_dir, "post")
        self._staged_commands.extend(post_capture.values())
        metadata = _supplement_metadata(archive)
        _ensure_same_capture(pre_capture, post_capture, metadata)
        post_inventories: dict[str, tuple[dict[str, Any], dict[str, Any]]] = {}
        for mount in context["mounts"]:
            if mount["id"] == "work":
                continue
            self._failure_reason = f"inventory-{mount['id']}-post"
            inventory, command = _inventory_mount(
                raw_dir,
                context,
                mount,
                "post",
                self._staged_commands,
            )
            post_inventories[mount["id"]] = (inventory, command)
            if inventory != pre_inventories[mount["id"]][0]:
                _fail("V3_PODMAN_EXTERNAL_INVENTORY_DRIFT", mount["id"])
        self._failure_reason = "v2-immutable-audit"
        immutable = _v2_immutable_audit()
        if immutable["findings"]:
            _fail("V3_PODMAN_V2_IMMUTABLE_AUDIT_FAILED")
        replay = next(
            (
                command
                for command in self._receipt_commands
                if command.get("id") == "replay"
            ),
            None,
        )
        if not isinstance(replay, dict):
            _direct_runtime_integration_fail("PRODUCTION_REPLAY_RECEIPT_MISSING")
        return self._publish_candidate_artifacts(
            completed_integration,
            raw_trace_receipt,
            replay,
            graph,
            runtime_audit,
            compensation_command,
            metadata,
            immutable,
        )

    def preserve_failure(self, error: BaseException) -> None:
        """Preserves one failed executed command without manufacturing an unsealed runtime state.

        @param error The terminal transaction error caught by the scheduler.
        @returns Nothing when failure evidence was written or is not yet safely preservable.
        @throws CandidateExecutionBlocked When offline-install, pre-seal runtime, or private candidate validation failure cannot be preserved.
        """
        if not self.started or self.output_directory.exists():
            return
        preseal_stages = _DIRECT_RUNTIME_RUNNER_STAGES[
            : _DIRECT_RUNTIME_RUNNER_STAGES.index("direct-runtime-dist-identity") + 1
        ]
        is_preseal_failure = (
            self._sealed_integration is None
            and self._failure_reason in preseal_stages
        )
        is_candidate_publication_failure = (
            self._failure_reason == "candidate-publication"
        )
        preseal_attempt: dict[str, Any] | None = None
        candidate_publication_failure: dict[str, Any] | None = None
        try:
            if is_preseal_failure:
                if self._direct_runtime_preseal_attempt is None:
                    _direct_runtime_integration_fail(
                        "PRODUCTION_PRESEAL_FAILURE_UNBOUND",
                    )
                _validate_direct_runtime_preseal_failed_attempt_v1(
                    self._direct_runtime_preseal_attempt,
                    self._failure_reason,
                )
                preseal_attempt = copy.deepcopy(
                    self._direct_runtime_preseal_attempt,
                )
            if is_candidate_publication_failure:
                if (
                    self._sealed_integration is None
                    or self._candidate_publication_failure is None
                ):
                    _direct_runtime_integration_fail(
                        "PRODUCTION_CANDIDATE_PUBLICATION_FAILURE_UNBOUND",
                    )
                _validate_candidate_publication_failure_v1(
                    self._candidate_publication_failure,
                    self._sealed_integration,
                )
                candidate_publication_failure = copy.deepcopy(
                    self._candidate_publication_failure,
                )
            is_workspace_prerequisite_build_failure = (
                self._workspace_dag_contract is not None
                and self._workspace_resolution is not None
                and any(
                    specification.get("kind") == "build"
                    and specification.get("id") == self._failure_reason
                    for specification in self._workspace_command_specs
                )
            )
            if is_candidate_publication_failure:
                assert self._sealed_integration is not None
                assert candidate_publication_failure is not None
                _publish_candidate_publication_failure_attempt(
                    error,
                    direct_runtime_integration=self._sealed_integration,
                    candidate_publication_failure=candidate_publication_failure,
                    attempts_root=TRACK_DIR,
                    attempt_date=self.run_day,
                )
            elif (
                HISTORICAL_PODMAN_BLOCKER.is_file()
                and not HISTORICAL_PODMAN_BLOCKER.is_symlink()
            ):
                _publish_failed_attempt(
                    self._failure_reason,
                    self._staged_commands,
                    error,
                    hermetic_pnpm_contract=(
                        self._hermetic_pnpm_contract
                        if self._failure_reason == "offline-install"
                        else None
                    ),
                    external_stop=(
                        self.external_stop
                        if self._failure_reason == "offline-install"
                        else None
                    ),
                    attempts_root=TRACK_DIR,
                    attempt_date=self.run_day,
                    workspace_prerequisite_build_dag=(
                        self._workspace_dag_contract
                        if is_workspace_prerequisite_build_failure
                        else None
                    ),
                    workspace_build_resolution=(
                        self._workspace_resolution
                        if is_workspace_prerequisite_build_failure
                        else None
                    ),
                    direct_runtime_integration=self._sealed_integration,
                    direct_runtime_stage=(
                        self._direct_runtime_stage
                        if self._sealed_integration is not None
                        else None
                    ),
                    direct_runtime_preseal_attempt=preseal_attempt,
                )
            elif is_preseal_failure:
                _direct_runtime_integration_fail(
                    "PRODUCTION_PRESEAL_FAILURE_UNPRESERVED",
                )
            else:
                _publish_blocker(
                    self._failure_reason,
                    self._staged_commands,
                    error,
                )
        except BaseException as preservation_error:
            if isinstance(preservation_error, KeyboardInterrupt):
                raise
            # Every stage surfaces its preservation failure. Restricting this to
            # offline-install / pre-seal / candidate-publication let post-seal
            # stages lose both their evidence and the reason it was lost.
            raise CandidateExecutionBlocked(
                "V3_PODMAN_FAILURE_EVIDENCE_UNPRESERVED: "
                f"{self._failure_reason}: {preservation_error}",
            ) from preservation_error

    def _publish_candidate_artifacts(
        self,
        completed_integration: dict[str, Any],
        raw_trace_receipt: dict[str, Any],
        replay: dict[str, Any],
        graph: dict[str, Any],
        runtime_audit: dict[str, Any],
        compensation_command: dict[str, Any],
        metadata: dict[str, dict[str, Any]],
        immutable: dict[str, Any],
    ) -> dict[str, Any]:
        """Finalizes all private raw evidence and atomically publishes one candidate.

        @param completed_integration The trace-complete runtime integration.
        @param raw_trace_receipt The parsed in-container trace receipt.
        @param replay The successful clean-room replay receipt.
        @param graph The successful graph-scan observation.
        @param runtime_audit The successful clean-room audit observation.
        @param compensation_command The compensation-denominator observation.
        @param metadata The stable supplemental source metadata.
        @param immutable The completed immutable V2 audit.
        @returns The published candidate location, manifest, and completed integration.
        @throws core.ExecutionClosureValidationError When staged evidence or candidate artifacts are incomplete.
        """
        stage = self._stage
        archive = self._archive
        context = self._execution_context
        pre_capture = self._pre_capture
        podman = self._podman
        image = self._image
        network = self._network
        pre_inventories = self._pre_inventories
        versions = self._versions
        toolchain = self._toolchain
        nested_pnpm_runtime = self._nested_pnpm_runtime
        hermetic_pnpm_contract = self._hermetic_pnpm_contract
        workspace_dag_contract = self._workspace_dag_contract
        workspace_resolution = self._workspace_resolution
        workspace_output_inventories = self._workspace_output_inventories
        if (
            stage is None
            or archive is None
            or context is None
            or pre_capture is None
            or podman is None
            or image is None
            or network is None
            or pre_inventories is None
            or versions is None
            or toolchain is None
            or nested_pnpm_runtime is None
            or hermetic_pnpm_contract is None
            or workspace_dag_contract is None
            or workspace_resolution is None
            or workspace_output_inventories is None
        ):
            _direct_runtime_integration_fail("PRODUCTION_PUBLICATION_CONTEXT_UNBOUND")
        if self.output_directory.exists() or self.output_directory.is_symlink():
            _fail("V3_PODMAN_OUTPUT_ALREADY_EXISTS", str(self.output_directory))
        self._failure_reason = "candidate-publication"
        publication = stage / "candidate"
        if publication.exists() or publication.is_symlink():
            _fail("V3_PODMAN_CANDIDATE_DESTINATION_EXISTS", str(publication))
        publication.mkdir()
        _write_json(_candidate_path(publication, V3_ARCHIVE), archive)
        final_map = {
            id(command): _finalize_command(
                command,
                publication,
                reference_root=V3_DIR,
            )
            for command in self._staged_commands
        }
        final_podman = {
            "path": PODMAN,
            "version": podman["version"],
            "versionCommand": final_map[id(podman["versionCommand"])],
        }
        final_image = {
            **{
                key: value
                for key, value in image.items()
                if key != "inspectCommand"
            },
            "inspectCommand": final_map[id(image["inspectCommand"])],
        }
        profile_prefix = build_direct_node_split_canonical_prefix_v1(
            context["mounts"],
            "/work",
        )
        if context.get("prefix") != profile_prefix:
            _fail("V3_DIRECT_NODE_SPLIT_CANONICAL_PREFIX_INVALID")

        def final_network_record(record: dict[str, Any]) -> dict[str, Any]:
            """Finalizes one network-proof command while retaining its semantic fields.

            @param record The staged network-proof command record.
            @returns The immutable network-proof record with V3 raw references.
            """
            return {
                "kind": record["kind"],
                **{
                    key: value
                    for key, value in record.items()
                    if key not in {
                        "argv",
                        "cwd",
                        "env",
                        "envAbsent",
                        "network",
                        "exitCode",
                        "actualExecutor",
                        "_rawId",
                        "_stdoutPath",
                        "_stderrPath",
                    }
                    and not key.startswith("_")
                    and key != "kind"
                },
                **final_map[id(record)],
            }

        final_network = {
            name: final_network_record(record)
            for name, record in network.items()
        }
        mounts_by_id = {mount["id"]: mount for mount in context["mounts"]}
        final_inventories: dict[str, Any] = {}
        for mount_id, (inventory, command) in pre_inventories.items():
            final_inventory_command = final_map[id(command)]
            snapshot = {
                **inventory,
                "command": final_inventory_command,
            }
            final_inventories[mount_id] = {
                "mount": mounts_by_id[mount_id],
                "algorithm": "recursive-path-metadata-sha256-v1",
                "pre": snapshot,
                "post": copy.deepcopy(snapshot),
            }
        capture = _finalize_capture(
            {
                "gitStatus": final_map[id(pre_capture["gitStatus"])],
                "stagedDiff": final_map[id(pre_capture["stagedDiff"])],
            },
            metadata,
        )
        profile = {
            "schemaVersion": 1,
            "kind": "fr4-execution-profile",
            "status": "CANDIDATE_UNACCEPTED",
            "cleanRoom": {
                "prohibitedOverlays": [
                    "shared-worktree",
                    "node_modules",
                    "dist",
                    "preexisting-generated",
                ],
                "preexistingGeneratedPaths": [],
                "replayCommand": final_map[id(replay)],
            },
            "install": {
                "argv": list(HERMETIC_PNPM_INSTALL),
                "cwd": ".",
            },
            "nestedPnpmRuntime": copy.deepcopy(nested_pnpm_runtime),
            "directRuntimeIntegration": copy.deepcopy(completed_integration),
            "directRuntimePacketMaterialization": copy.deepcopy(
                archive["directRuntimePacketMaterialization"],
            ),
            "directRuntimeTraceReceipt": copy.deepcopy(raw_trace_receipt),
            "hermeticPnpmInstall": copy.deepcopy(hermetic_pnpm_contract),
            "workspacePrerequisiteBuildDagSource": _reference(core.V2_ARCHIVE),
            "workspacePrerequisiteBuildDag": copy.deepcopy(
                workspace_dag_contract,
            ),
            "workspaceBuildResolution": copy.deepcopy(workspace_resolution),
            "workspacePrerequisiteOutputInventories": copy.deepcopy(
                workspace_output_inventories,
            ),
            "prerequisiteBuilds": copy.deepcopy(list(BUILDS)),
            "fr4Commands": [
                {"id": name, "argv": argv, "env": dict(ENV)}
                for name, argv in FR4
            ],
            "standardPackCatalog": {
                "mode": "REQUIRES_RECORDED_GENERATION",
                "argv": list(DIRECT_NODE_STANDARD_PACK_GENERATOR),
                "output": {"path": STANDARD_PACK_CATALOG},
                "staleOutputClear": {
                    "id": "clear-stale-standard-pack-catalog",
                    "argv": ["rm", "-f", STANDARD_PACK_CATALOG],
                    "path": STANDARD_PACK_CATALOG,
                    "postcondition": "ABSENT_BEFORE_RECORDED_GENERATION",
                },
            },
            "environment": {
                "allowlisted": dict(ENV),
                "absencePredicates": list(ENV_ABSENT),
            },
            "conditionalSkips": {"PG_TEST_URL": "ABSENT"},
            "outcomeCensus": {
                "tests": [name for name, _ in FR4],
                "passed": [name for name, _ in FR4],
                "failed": [],
                "skipped": {"PG_TEST_URL": "ABSENT"},
            },
            "toolVersions": versions,
            "executorToolchain": toolchain,
            "baselineV2Inventory": {
                "pre": copy.deepcopy(BASELINE_V2_INVENTORY),
                "post": copy.deepcopy(BASELINE_V2_INVENTORY),
            },
            "closureInventory": archive["closureInventory"],
            "frozenInputs": {
                "archive": _candidate_reference(publication, V3_ARCHIVE),
                "lockfile": next(
                    {
                        key: entry[key]
                        for key in ("path", "sha256", "size")
                    }
                    for entry in archive["entries"]
                    if entry["path"] == "pnpm-lock.yaml"
                ),
            },
            "containerIsolation": {
                "podman": final_podman,
                "image": final_image,
                "networkMode": "none",
                "podmanRunArgvPrefix": profile_prefix,
                "cleanWorkRoot": context["cleanWorkRoot"],
                "mounts": context["mounts"],
                "bootstrapEnvironment": {"PATH": BOOTSTRAP_PATH},
                "recursiveInventories": final_inventories,
                "networkProof": final_network,
                "declaredExecutorPaths": context["declaredExecutors"],
            },
        }
        _write_json(_candidate_path(publication, V3_PROFILE), profile)
        ledger = _ledger(archive, capture)
        _write_json(_candidate_path(publication, V3_LEDGER), ledger)
        final_receipt_commands = [
            final_map[id(command)]
            for command in self._receipt_commands
        ]
        receipt = {
            "schemaVersion": 1,
            "kind": "fr4-execution-receipt",
            "status": "CANDIDATE_UNACCEPTED",
            "commands": final_receipt_commands,
            "toolVersions": versions,
            "executorToolchain": toolchain,
            "nestedPnpmRuntime": profile["nestedPnpmRuntime"],
            "directRuntimeIntegration": profile["directRuntimeIntegration"],
            "directRuntimePacketMaterialization": profile[
                "directRuntimePacketMaterialization"
            ],
            "directRuntimeTraceReceipt": profile["directRuntimeTraceReceipt"],
            "directRuntimeTrace": profile["directRuntimeIntegration"][
                "attempt"
            ]["executionTrace"],
            "frozenInputs": profile["frozenInputs"],
            "hermeticPnpmInstall": profile["hermeticPnpmInstall"],
            "workspacePrerequisiteBuildDagSource": profile[
                "workspacePrerequisiteBuildDagSource"
            ],
            "workspacePrerequisiteBuildDag": profile[
                "workspacePrerequisiteBuildDag"
            ],
            "workspaceBuildResolution": profile["workspaceBuildResolution"],
            "workspacePrerequisiteOutputInventories": profile[
                "workspacePrerequisiteOutputInventories"
            ],
            "baselineV2Inventory": profile["baselineV2Inventory"],
            "closureInventory": archive["closureInventory"],
            "orderedInventories": [
                {
                    "stage": "baseline-v2-pre",
                    "inventory": copy.deepcopy(BASELINE_V2_INVENTORY),
                },
                {
                    "stage": "baseline-v2-post",
                    "inventory": copy.deepcopy(BASELINE_V2_INVENTORY),
                },
                {
                    "stage": "closure-pre-build",
                    "inventory": archive["closureInventory"],
                },
                {
                    "stage": "closure-post-build",
                    "inventory": archive["closureInventory"],
                },
                {
                    "stage": "closure-post-standard-pack-generation",
                    "inventory": archive["closureInventory"],
                },
            ],
            "outcomeCensus": profile["outcomeCensus"],
            "realpathAudit": {
                "sourceRootOverlayPaths": [],
                "nodeModulesOverlayPaths": [],
                "preexistingGeneratedPaths": [],
                "containerRuntime": {
                    "sourcePathsOutsideWork": [],
                    "outsideWorkPaths": context["declaredExecutors"],
                },
            },
            "gateStatus": {
                "algorithm": "all-command-exits-and-expected-skip-census-v1",
                "orderedCommandIds": [
                    command["id"] for command in final_receipt_commands
                ],
                "exitCodes": {
                    command["id"]: command["exitCode"]
                    for command in final_receipt_commands
                },
                "expectedSkipCensus": profile["conditionalSkips"],
                "observedSkipCensus": profile["conditionalSkips"],
                "status": "PASS",
            },
        }
        _write_json(_candidate_path(publication, V3_RECEIPT), receipt)
        closure_core = {
            "archive": _candidate_reference(publication, V3_ARCHIVE),
            "ledger": _candidate_reference(publication, V3_LEDGER),
            "profile": _candidate_reference(publication, V3_PROFILE),
            "receipt": _candidate_reference(publication, V3_RECEIPT),
        }
        closure = {
            **closure_core,
            "closureSha256": _sha256(_canonical(closure_core)),
        }
        graph_binding = {
            "schemaVersion": 1,
            "kind": "execution-closure-graph-binding",
            "status": "CANDIDATE_UNACCEPTED",
            "executionClosure": closure,
            "scanCommand": "repo-graph scan . ./graph.db",
            "containerExecution": final_map[id(graph)]["actualExecutor"],
            "rawStreams": [
                final_map[id(graph)]["stdout"],
                final_map[id(graph)]["stderr"],
            ],
        }
        _write_json(_candidate_path(publication, V3_GRAPH), graph_binding)
        clean_audit = {
            "schemaVersion": 1,
            "kind": "execution-closure-clean-audit",
            "status": "CANDIDATE_UNACCEPTED",
            "executionClosure": closure,
            "rawStreams": [
                final_map[id(runtime_audit)]["stdout"],
                final_map[id(runtime_audit)]["stderr"],
            ],
            "cleanRoom": {"sourcePathsOutsideWork": []},
            "task3ImmutableAudit": immutable,
        }
        _write_json(_candidate_path(publication, V3_AUDIT), clean_audit)
        compensation = {
            "schemaVersion": 1,
            "kind": "execution-closure-compensation-denominator",
            "status": "CANDIDATE_UNACCEPTED",
            "executionClosure": closure,
            "rawStreams": [
                final_map[id(compensation_command)]["stdout"],
                final_map[id(compensation_command)]["stderr"],
            ],
            "denominator": {
                "sourceEntries": archive["closureInventory"]["entryCount"],
                "fr4Commands": len(FR4),
            },
        }
        _write_json(
            _candidate_path(publication, V3_COMPENSATION),
            compensation,
        )
        addendum_receipt = _load_json(ADDENDUM_RECEIPT)
        manifest = {
            "schemaVersion": 1,
            "kind": "execution-closure",
            "status": "CANDIDATE_UNACCEPTED",
            "selectionRule": "frozen-ast-execution-closure-v1",
            "r2Task3Disposition": (
                "BLOCKED_PENDING_INDEPENDENT_R1_V3_ACCEPTANCE"
            ),
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
                "graphBinding": _candidate_reference(publication, V3_GRAPH),
                "cleanAudit": _candidate_reference(publication, V3_AUDIT),
                "compensation": _candidate_reference(
                    publication,
                    V3_COMPENSATION,
                ),
            },
        }
        _write_json(_candidate_path(publication, V3_MANIFEST), manifest)
        try:
            validate_execution_closure_v1(
                manifest,
                archive,
                ledger,
                profile,
                receipt,
                graph_binding,
                clean_audit,
                compensation,
                candidate_directory=publication,
            )
        except core.ExecutionClosureValidationError:
            self._candidate_publication_failure = (
                _build_candidate_publication_failure_v1(
                    completed_integration,
                )
            )
            raise
        try:
            os.replace(publication, self.output_directory)
        except OSError:
            self._candidate_publication_failure = (
                _build_candidate_publication_failure_v1(
                    completed_integration,
                    "atomic-replace",
                )
            )
            raise
        return {
            "outputDirectory": str(self.output_directory),
            "manifest": copy.deepcopy(manifest),
            "integration": copy.deepcopy(completed_integration),
        }


def write_execution_closure_v1(
    output_directory: Path | str = V3_DIR,
    *,
    run_day: str | None = None,
    external_stop: dict[str, str] | None = None,
) -> None:
    """Runs the production-owned direct-runtime transaction before any candidate side effect.

    @param output_directory The required V3 candidate directory, initially absent.
    @param run_day Optional explicit UTC day for any append-only failed-attempt evidence.
    @param external_stop Optional explicit supervisor record for an installation interruption.
    @returns Nothing when the production transaction completes its trace gate.
    @throws CandidateExecutionBlocked When a production transaction gate fails.
    """
    attempt_date = resolve_execution_run_day_v1(run_day)
    output = Path(output_directory)
    if output != V3_DIR:
        _fail("V3_PODMAN_OUTPUT_PATH_INVALID", str(output))
    if output.exists() or output.is_symlink():
        _fail("V3_PODMAN_OUTPUT_ALREADY_EXISTS", str(output))
    preparation = prepare_direct_command_runtime_execution_inputs_v1(run_day)
    executor = DirectCommandRuntimeProductionExecutorV1(
        output_directory=output,
        run_day=attempt_date,
        external_stop=external_stop,
    )
    try:
        prepared_transaction = execute_direct_command_runtime_prepared_transaction_v1(
            preparation,
            executor,
        )
    except BaseException as error:
        if isinstance(error, KeyboardInterrupt):
            raise
        raise CandidateExecutionBlocked(
            f"V3_PODMAN_CANDIDATE_BLOCKED: direct-runtime-transaction: {error}",
        ) from error
    trace = prepared_transaction["trace"]
    if not isinstance(trace, dict) or trace.get("integration") is None:
        _direct_runtime_integration_fail("PRODUCTION_TRANSACTION_TRACE_MISSING")
    publication = trace.get("publication")
    if (
        not isinstance(publication, dict)
        or publication.get("outputDirectory") != str(output)
        or publication.get("integration") != trace["integration"]
        or not output.is_dir()
        or output.is_symlink()
    ):
        _direct_runtime_integration_fail("PRODUCTION_TRANSACTION_PUBLICATION_MISSING")


def _validate_reference(value: Any, path: Path, code: str, logical_path: Path | None = None) -> None:
    """Checks one value against the immutable reference of a track file.

    @param value The candidate reference object.
    @param path The actual track-owned file.
    @param code The failure code.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError When the reference differs.
    """
    if value != _reference(path, logical_path):
        _fail(code)


def _validate_archive(archive: dict[str, Any]) -> None:
    """Validates exact retained V2 entries and all nine live supplements.

    @param archive The candidate source archive.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError When source selection drifts.
    """
    entries = archive.get("entries")
    if not isinstance(entries, list) or [entry.get("path") if isinstance(entry, dict) else None for entry in entries] != sorted(entry.get("path") for entry in entries if isinstance(entry, dict)):
        _fail("V3_PODMAN_VALIDATE_ARCHIVE_ORDER")
    _, frozen = addendum._read_archive()
    retained = {entry["path"]: entry for entry in frozen if set(PurePosixPath(entry["path"]).parts).isdisjoint(DERIVED_PARTS)}
    actual = {entry.get("path"): entry for entry in entries if isinstance(entry, dict)}
    if len(actual) != len(entries) or set(actual) != set(retained) | set(SUPPLEMENTAL_PATHS):
        _fail("V3_PODMAN_VALIDATE_ARCHIVE_SELECTION")
    if {path: actual[path] for path in retained} != retained:
        _fail("V3_PODMAN_VALIDATE_RETAINED_V2")
    for path in SUPPLEMENTAL_PATHS:
        entry = actual[path]
        if entry.get("kind") != "file" or entry.get("resolvedTargetPath") != path or not isinstance(entry.get("contentBase64"), str):
            _fail("V3_PODMAN_VALIDATE_SUPPLEMENT", path)
        data = base64.b64decode(entry["contentBase64"], validate=True)
        if len(data) != entry.get("size") or _sha256(data) != entry.get("sha256"):
            _fail("V3_PODMAN_VALIDATE_SUPPLEMENT", path)
    if archive.get("closureInventory") != _archive_inventory(entries):
        _fail("V3_PODMAN_VALIDATE_ARCHIVE_INVENTORY")
    source_packet = archive.get("directRuntimeSourcePacket")
    baseline_read_set = archive.get("directRuntimeBaselineReadSet")
    direct_runtime_packet_materialization = archive.get("directRuntimePacketMaterialization")
    if (source_packet is None) != (baseline_read_set is None) or (source_packet is None) != (direct_runtime_packet_materialization is None):
        _direct_runtime_integration_fail("ARCHIVE_PACKET_BINDING_INVALID")
    if source_packet is not None:
        if not isinstance(baseline_read_set, list) or not isinstance(direct_runtime_packet_materialization, dict):
            _direct_runtime_integration_fail("ARCHIVE_PACKET_BINDING_INVALID")
        _direct_runtime_validate_source_packet_v1(source_packet, baseline_read_set)
        validate_direct_command_runtime_packet_materialization_contract_v1(
            direct_runtime_packet_materialization,
        )
        if direct_runtime_packet_materialization != build_direct_command_runtime_packet_materialization_contract_v1(source_packet):
            _direct_runtime_integration_fail("ARCHIVE_PACKET_MATERIALIZATION_BINDING_INVALID")


def _validate_container(profile: dict[str, Any], receipt: dict[str, Any], graph: dict[str, Any]) -> None:
    """Validates route-proven Podman isolation, mounts, and executors.

    @param profile The candidate execution profile.
    @param receipt The exact gate receipt.
    @param graph The fresh graph artifact.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError When a host or environment escape appears.
    """
    isolation = profile.get("containerIsolation")
    nested_pnpm_runtime = profile.get("nestedPnpmRuntime")
    validate_nested_pnpm_runtime_shim_contract_v1(nested_pnpm_runtime)
    expected_keys = {"podman", "image", "networkMode", "podmanRunArgvPrefix", "cleanWorkRoot", "mounts", "bootstrapEnvironment", "recursiveInventories", "networkProof", "declaredExecutorPaths"}
    if not isinstance(isolation, dict) or set(isolation) != expected_keys or isolation.get("networkMode") != "none":
        _fail("V3_PODMAN_VALIDATE_ISOLATION")
    prefix = isolation.get("podmanRunArgvPrefix")
    image = isolation.get("image")
    bootstrap = isolation.get("bootstrapEnvironment")
    executors = isolation.get("declaredExecutorPaths")
    mounts = isolation.get("mounts")
    if not isinstance(mounts, list):
        _fail("V3_PODMAN_VALIDATE_MOUNTS")
    try:
        canonical_root_prefix = build_direct_node_split_canonical_prefix_v1(
            mounts,
            "/work",
        )
    except core.ExecutionClosureValidationError:
        _fail("V3_PODMAN_VALIDATE_MOUNTS")
    if (
        not isinstance(prefix, list)
        or prefix != canonical_root_prefix
        or not isinstance(image, dict)
        or image.get("resolvedReference") != IMAGE_RESOLVED
        or not isinstance(bootstrap, dict)
        or bootstrap != {"PATH": BOOTSTRAP_PATH}
        or not isinstance(executors, list)
        or len(executors) != len(set(executors))
    ):
        _fail("V3_PODMAN_VALIDATE_ISOLATION")
    mount_by_id = {mount.get("id"): mount for mount in mounts if isinstance(mount, dict)}
    if len(mount_by_id) != len(mounts) or not {"work", "pnpmLauncher", "pnpmStore", "repoGraph"} <= set(mount_by_id):
        _fail("V3_PODMAN_VALIDATE_MOUNTS")
    direct_runtime_integration = profile.get("directRuntimeIntegration")
    if direct_runtime_integration is not None:
        validate_direct_command_runtime_runner_integration_v1(direct_runtime_integration)
        source_packet_mount = mount_by_id.get("runnerTool:direct-runtime-source-packet")
        trace_config_mount = mount_by_id.get("runnerTool:direct-runtime-trace-config")
        if (
            not isinstance(source_packet_mount, dict) or source_packet_mount.get("target") != "/runner/direct-runtime-source-packet.json"
            or source_packet_mount.get("access") != "ro"
            or not isinstance(trace_config_mount, dict)
            or trace_config_mount.get("target") != "/runner/direct-runtime-trace-config.json"
            or trace_config_mount.get("access") != "ro"
        ): _direct_runtime_integration_fail("SOURCE_PACKET_MOUNT_INVALID")
    work = isolation.get("cleanWorkRoot")
    if not isinstance(work, dict) or work.get("containerPath") != "/work" or work.get("preexistingPaths") != [] or work.get("lifecycle") != "UNIQUE_EPHEMERAL":
        _fail("V3_PODMAN_VALIDATE_WORK_ROOT")
    for field in ("hostPath", "realpath"):
        try:
            Path(work[field]).resolve().relative_to(Path("/tmp").resolve())
        except (KeyError, ValueError):
            _fail("V3_PODMAN_VALIDATE_WORK_ROOT")
    expected_shim_source = str(Path(work["hostPath"]).parent / "runner" / "nested-pnpm-shim")
    expected_shim_mount = {
        **nested_pnpm_runtime["mount"],
        "source": expected_shim_source,
    }
    if mount_by_id.get(nested_pnpm_runtime["mount"]["id"]) != expected_shim_mount:
        _fail("V3_NESTED_PNPM_RUNTIME_SHIM_MOUNT_INVALID")
    expected_shim_volume = [
        "--volume",
        f"{expected_shim_source}:{nested_pnpm_runtime['artifact']['path']}:ro",
    ]
    if not any(prefix[index:index + 2] == expected_shim_volume for index in range(len(prefix) - 1)):
        _fail("V3_NESTED_PNPM_RUNTIME_SHIM_MOUNT_INVALID")
    required_nested_executors = {
        nested_pnpm_runtime["artifact"]["path"],
        nested_pnpm_runtime["launcher"]["node"],
        nested_pnpm_runtime["launcher"]["pnpmLauncher"],
    }
    if not required_nested_executors <= set(executors):
        _fail("V3_NESTED_PNPM_RUNTIME_SHIM_EXECUTOR_INVALID")
    inventories = isolation.get("recursiveInventories")
    expected_inventory_ids = {key for key in mount_by_id if key != "work"}
    if not isinstance(inventories, dict) or set(inventories) != expected_inventory_ids:
        _fail("V3_PODMAN_VALIDATE_INVENTORIES")
    for mount_id, evidence in inventories.items():
        if not isinstance(evidence, dict) or evidence.get("mount") != mount_by_id[mount_id] or evidence.get("algorithm") != "recursive-path-metadata-sha256-v1" or evidence.get("pre") != evidence.get("post"):
            _fail("V3_PODMAN_VALIDATE_INVENTORIES", mount_id)
    root_execution_prefix = [
        *canonical_root_prefix,
        IMAGE_RESOLVED,
        "/usr/bin/env",
        "-i",
        "CI=true",
        f"PATH={BOOTSTRAP_PATH}",
    ]
    direct_node_split_build = ["pnpm", "build"]
    direct_node_split_generator = [
        "node",
        "scripts/generate-standard-pack-release.mjs",
    ]
    package_execution_prefix = [
        *build_direct_node_split_canonical_prefix_v1(
            mounts,
            "/work/packages/advantage-play-kit",
        ),
        IMAGE_RESOLVED,
        "/usr/bin/env",
        "-i",
        "CI=true",
        f"PATH={BOOTSTRAP_PATH}",
    ]

    def check_executor(executor: Any, logical: list[str]) -> None:
        direct_node_split_command = (
            logical == direct_node_split_build
            or logical == direct_node_split_generator
        )
        environment_overrides = (
            {"NODE_OPTIONS": DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS}
            if logical == DIRECT_NODE_STANDARD_PACK_GENERATOR
            or logical == direct_node_split_generator
            else {}
        )
        override_assignments = [f"{name}={value}" for name, value in sorted(environment_overrides.items())]
        expected_effective_environment = {"CI": "true", "PATH": BOOTSTRAP_PATH, **environment_overrides}
        execution_prefix = (
            package_execution_prefix
            if direct_node_split_command
            else root_execution_prefix
        )
        if (
            not isinstance(executor, dict)
            or executor.get("logicalArgv") != logical
            or executor.get("environment") != ENV
            or executor.get("effectiveEnvironment") != expected_effective_environment
            or executor.get("environmentOverrides", {}) != environment_overrides
            or (not environment_overrides and "environmentOverrides" in executor)
            or executor.get("inheritedEnv") != []
            or not isinstance(executor.get("payloadArgv"), list)
            or not executor["payloadArgv"]
            or executor["payloadArgv"][0] not in executors
            or executor.get("argv")
            != [*execution_prefix, *override_assignments, *executor["payloadArgv"]]
        ):
            _fail("V3_PODMAN_VALIDATE_EXECUTOR")
    for command in receipt.get("commands", []):
        if isinstance(command, dict):
            check_executor(command.get("actualExecutor"), command.get("argv"))
    check_executor(graph.get("containerExecution"), ["repo-graph", "scan", ".", "./graph.db"])
    network = isolation.get("networkProof")
    if not isinstance(network, dict) or set(network) != {"route", "dns", "tcp"}:
        _fail("V3_PODMAN_VALIDATE_NETWORK")
    for name, record in network.items():
        if not isinstance(record, dict):
            _fail("V3_PODMAN_VALIDATE_NETWORK")
        check_executor(record.get("actualExecutor"), record.get("argv"))
    if network["route"].get("exitCode") != 0 or network["dns"].get("exitCode") == 0 or network["tcp"].get("exitCode") == 0:
        _fail("V3_PODMAN_VALIDATE_NETWORK")

def _validate_container_raw_evidence(profile: dict[str, Any], candidate_root: Path) -> None:
    """Validates raw inventory and negative-network evidence from the candidate bytes.

    @param profile The candidate execution profile.
    @param candidate_root The physical canonical-or-staged candidate directory.
    @returns Nothing when raw container evidence proves the recorded outcomes.
    @throws core.ExecutionClosureValidationError When raw evidence is malformed or synthetic.
    """
    isolation = profile["containerIsolation"]
    def raw_text(reference: Any, code: str) -> str:
        if not isinstance(reference, dict):
            _fail(code)
        logical = _normal_path(reference.get("path"))
        actual = _candidate_reference_path(candidate_root, reference)
        _validate_reference(reference, actual, code, TRACK_DIR / logical)
        try:
            return actual.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            _fail(code)
    inventories = isolation["recursiveInventories"]
    for mount_id, evidence in inventories.items():
        snapshot = evidence.get("pre") if isinstance(evidence, dict) else None
        command = snapshot.get("command") if isinstance(snapshot, dict) else None
        if not isinstance(command, dict):
            _fail("V3_PODMAN_VALIDATE_INVENTORIES", mount_id)
        payload = command.get("actualExecutor", {}).get("payloadArgv") if isinstance(command.get("actualExecutor"), dict) else None
        if not isinstance(payload, list) or len(payload) < 3 or not isinstance(payload[2], str) or "require(" not in payload[2] or "import " in payload[2]:
            _fail("V3_PODMAN_VALIDATE_INVENTORIES", mount_id)
        try:
            observed = json.loads(raw_text(command.get("stdout"), "V3_PODMAN_VALIDATE_INVENTORIES"))
        except json.JSONDecodeError:
            _fail("V3_PODMAN_VALIDATE_INVENTORIES", mount_id)
        expected = {"entryCount": snapshot.get("entryCount"), "sha256": snapshot.get("sha256")}
        if observed != expected:
            _fail("V3_PODMAN_VALIDATE_INVENTORIES", mount_id)
    network = isolation["networkProof"]
    for name, expected_kind in (("dns", "DNS_NEGATIVE"), ("tcp", "TCP_NEGATIVE")):
        record = network.get(name)
        if not isinstance(record, dict) or not isinstance(record.get("errorCode"), str) or not record["errorCode"]:
            _fail("V3_PODMAN_VALIDATE_NETWORK")
        payload = record.get("actualExecutor", {}).get("payloadArgv") if isinstance(record.get("actualExecutor"), dict) else None
        if not isinstance(payload, list) or len(payload) < 3 or not isinstance(payload[2], str) or "require(" not in payload[2] or "import " in payload[2]:
            _fail("V3_PODMAN_VALIDATE_NETWORK")
        stdout = raw_text(record.get("stdout"), "V3_PODMAN_VALIDATE_NETWORK").strip()
        stderr = raw_text(record.get("stderr"), "V3_PODMAN_VALIDATE_NETWORK").strip()
        if stdout or any(marker in stderr for marker in ("SyntaxError", "Cannot use import", "ERR_REQUIRE_ESM", "Unexpected token")):
            _fail("V3_PODMAN_VALIDATE_NETWORK")
        try:
            observed = json.loads(stderr)
        except json.JSONDecodeError:
            _fail("V3_PODMAN_VALIDATE_NETWORK")
        if not isinstance(observed, dict) or observed.get("kind") != expected_kind or observed.get("code") != record["errorCode"]:
            _fail("V3_PODMAN_VALIDATE_NETWORK")
        if name == "dns":
            if set(observed) != {"kind", "code"} or record.get("resolvedAddresses") != []:
                _fail("V3_PODMAN_VALIDATE_NETWORK")
        elif set(observed) != {"kind", "reason", "code"} or observed.get("reason") not in {"error", "timeout"} or record.get("connected") is not False:
            _fail("V3_PODMAN_VALIDATE_NETWORK")

def _validate_ledger(ledger: dict[str, Any], archive: dict[str, Any], candidate_root: Path) -> None:
    """Validates addendum derivation and identical pre/post supplement capture.

    @param ledger The candidate ledger.
    @param archive The validated V3 archive.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError When ledger provenance drifts.
    """
    addendum_ledger = _load_json(ADDENDUM_LEDGER)
    discovery = addendum_ledger.get("derivation", {}).get("discovery")
    derivation = ledger.get("derivation")
    if not isinstance(derivation, dict) or derivation.get("rule") != "frozen-ast-execution-closure-v1" or derivation.get("discovery") != discovery or derivation.get("bridge") != {"addendumLedger": _reference(ADDENDUM_LEDGER), "rowDigest": discovery.get("rowDigest")}:
        _fail("V3_PODMAN_VALIDATE_LEDGER_DERIVATION")
    if ledger.get("classificationAudit") != {"dynamicInputs": [], "orphanedInputs": [], "duplicateClassifications": []}:
        _fail("V3_PODMAN_VALIDATE_LEDGER_CLASSIFICATION")
    by_path = {entry["path"]: entry for entry in archive["entries"]}
    source_inputs = ledger.get("sourceInputs")
    if not isinstance(source_inputs, list) or {row.get("path") for row in source_inputs if isinstance(row, dict)} != set(SUPPLEMENTAL_PATHS):
        _fail("V3_PODMAN_VALIDATE_LEDGER_SOURCE_INPUTS")
    expected_source_inputs = [
        {
            "path": path,
            "realpath": path,
            "sha256": by_path[path]["sha256"],
            "size": by_path[path]["size"],
            "mode": by_path[path]["mode"],
        }
        for path in SUPPLEMENTAL_PATHS
    ]
    if source_inputs != expected_source_inputs:
        _fail("V3_PODMAN_VALIDATE_LEDGER_SOURCE_INPUTS")
    expansion = discovery.get("entrypointExpansion") if isinstance(discovery, dict) else None
    if not isinstance(expansion, list) or not expansion:
        _fail("V3_PODMAN_VALIDATE_LEDGER_EXPANSION")
    if [row.get("ordinal") if isinstance(row, dict) else None for row in expansion] != list(range(len(expansion))):
        _fail("V3_PODMAN_VALIDATE_LEDGER_EXPANSION")
    capture = ledger.get("supplementCapture")
    if not isinstance(capture, dict) or set(capture) != {"pre", "post"} or capture["pre"] != capture["post"]:
        _fail("V3_PODMAN_VALIDATE_SUPPLEMENT_CAPTURE")
    snapshot = capture["pre"]
    expected_entries = _supplement_metadata(archive)
    if not isinstance(snapshot, dict) or set(snapshot) != {"gitStatus", "stagedDiff", "entries"} or snapshot.get("entries") != expected_entries:
        _fail("V3_PODMAN_VALIDATE_SUPPLEMENT_CAPTURE")
    for name, expected_argv in (
        ("gitStatus", ["/usr/bin/git", "status", "--porcelain=v1", "--untracked-files=all"]),
        ("stagedDiff", ["/usr/bin/git", "diff", "--cached", "--binary", "--no-ext-diff"]),
    ):
        command = snapshot.get(name)
        if not isinstance(command, dict) or command.get("argv") != expected_argv or command.get("cwd") != "." or command.get("env") != ENV or command.get("envAbsent") != ENV_ABSENT or command.get("network") is not False or command.get("exitCode") != 0:
            _fail("V3_PODMAN_VALIDATE_SUPPLEMENT_CAPTURE")
        for stream in ("stdout", "stderr"):
            reference = command.get(stream)
            if not isinstance(reference, dict):
                _fail("V3_PODMAN_VALIDATE_SUPPLEMENT_CAPTURE")
            _validate_reference(reference, _candidate_reference_path(candidate_root, reference), "V3_PODMAN_VALIDATE_SUPPLEMENT_CAPTURE", TRACK_DIR / _normal_path(reference.get("path")))


def _validate_manifest(manifest: dict[str, Any], candidate_root: Path) -> None:
    """Validates candidate-only status, frozen bridge, and acyclic closure references.

    @param manifest The candidate manifest.
    @returns Nothing.
    @throws core.ExecutionClosureValidationError When a reference is stale or accepted.
    """
    addendum_receipt = _load_json(ADDENDUM_RECEIPT)
    expected_addendum = {"receipt": _reference(ADDENDUM_RECEIPT), "provenance": _reference(ADDENDUM_PROVENANCE), "ledger": _reference(ADDENDUM_LEDGER)}
    if manifest.get("schemaVersion") != 1 or manifest.get("kind") != "execution-closure" or manifest.get("status") != "CANDIDATE_UNACCEPTED" or manifest.get("selectionRule") != "frozen-ast-execution-closure-v1" or "acceptedAt" in manifest:
        _fail("V3_PODMAN_VALIDATE_MANIFEST")
    if manifest.get("blockerAddendum") != expected_addendum or manifest.get("acceptedBridgeInputs") != {"addendum": expected_addendum, "v2Blockers": core.BLOCKER_RECORDS, "v2RawStreams": addendum_receipt.get("rawStreams")}:
        _fail("V3_PODMAN_VALIDATE_MANIFEST")
    core_refs = {"archive": _candidate_reference(candidate_root, V3_ARCHIVE), "ledger": _candidate_reference(candidate_root, V3_LEDGER), "profile": _candidate_reference(candidate_root, V3_PROFILE), "receipt": _candidate_reference(candidate_root, V3_RECEIPT)}
    if manifest.get("closureCore") != core_refs or manifest.get("closureSha256") != _sha256(_canonical(core_refs)):
        _fail("V3_PODMAN_VALIDATE_MANIFEST")
    derived = {"graphBinding": _candidate_reference(candidate_root, V3_GRAPH), "cleanAudit": _candidate_reference(candidate_root, V3_AUDIT), "compensation": _candidate_reference(candidate_root, V3_COMPENSATION)}
    if manifest.get("derivedEvidence") != derived:
        _fail("V3_PODMAN_VALIDATE_MANIFEST")


def validate_noninstall_pnpm_executor_v1(command: dict[str, Any]) -> None:
    """Validates one config-scoped non-install pnpm command executor.

    @param command The completed receipt command whose executor must be bound.
    @returns Nothing when the command uses the exact isolated config-store payload.
    @throws core.ExecutionClosureValidationError When payload, environment, or executor provenance drifts.
    """
    logical = command.get("argv") if isinstance(command, dict) else None
    if not isinstance(logical, list) or not any(logical == expected for _, expected in NONINSTALL_PNPM_COMMANDS):
        _fail("V3_PNPM_NONINSTALL_EXECUTOR_INVALID")
    environment_overrides = (
        {"NODE_OPTIONS": DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS}
        if logical == STANDARD_PACK_GENERATOR
        else {}
    )
    expected_payload = build_pnpm_global_store_payload_v1(logical)
    expected_effective_environment = {"CI": "true", "PATH": BOOTSTRAP_PATH, **environment_overrides}
    executor = command.get("actualExecutor")
    if (
        command.get("cwd") != "."
        or command.get("env") != ENV
        or command.get("envAbsent") != ENV_ABSENT
        or command.get("network") is not False
        or not isinstance(executor, dict)
        or executor.get("logicalArgv") != logical
        or executor.get("environment") != ENV
        or executor.get("effectiveEnvironment") != expected_effective_environment
        or executor.get("environmentOverrides", {}) != environment_overrides
        or (not environment_overrides and "environmentOverrides" in executor)
        or executor.get("inheritedEnv") != []
        or executor.get("payloadArgv") != expected_payload
    ):
        _fail("V3_PNPM_NONINSTALL_EXECUTOR_INVALID")
    actual_argv = executor.get("argv")
    if not isinstance(actual_argv, list) or actual_argv[:5] != [PODMAN, "run", "--rm", "--network", "none"]:
        _fail("V3_PNPM_NONINSTALL_EXECUTOR_INVALID")
    try:
        image_index = actual_argv.index(IMAGE_RESOLVED)
    except ValueError:
        _fail("V3_PNPM_NONINSTALL_EXECUTOR_INVALID")
    override_assignments = [f"{name}={value}" for name, value in sorted(environment_overrides.items())]
    expected_suffix = [
        IMAGE_RESOLVED,
        "/usr/bin/env",
        "-i",
        "CI=true",
        f"PATH={BOOTSTRAP_PATH}",
        *override_assignments,
        *expected_payload,
    ]
    if actual_argv[image_index:] != expected_suffix:
        _fail("V3_PNPM_NONINSTALL_EXECUTOR_INVALID")


def _workspace_command_raw_json_v1(
    command: dict[str, Any],
    candidate_root: Path,
    code: str,
) -> dict[str, Any]:
    """Loads one hash-bound workspace runtime-verifier JSON stream from candidate raw evidence.

    @param command The finalized command receipt owning the standard-output reference.
    @param candidate_root The private staged candidate directory.
    @param code The invariant-specific failure code.
    @returns The parsed runtime-verifier object.
    @throws core.ExecutionClosureValidationError When raw evidence is absent, unsafe, or invalid JSON.
    """
    reference = command.get("stdout") if isinstance(command, dict) else None
    if not isinstance(reference, dict):
        _workspace_dag_fail(code)
    path = _candidate_reference_path(candidate_root, reference)
    _validate_reference(
        reference,
        path,
        f"V3_WORKSPACE_BUILD_DAG_{code}",
        TRACK_DIR / _normal_path(reference.get("path")),
    )
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        _workspace_dag_fail(code)
    if not isinstance(value, dict):
        _workspace_dag_fail(code)
    return value


def _validate_workspace_prerequisite_execution_v1(
    profile: dict[str, Any],
    receipt: dict[str, Any],
    commands: list[dict[str, Any]],
    candidate_root: Path,
) -> None:
    """Validates V2-derived DAG execution, raw link proof, and derived output inventories.

    @param profile The candidate execution profile containing the DAG contract.
    @param receipt The candidate command receipt containing matching runtime evidence.
    @param commands The ordered finalized receipt commands.
    @param candidate_root The private staged candidate directory.
    @returns Nothing when every workspace prerequisite execution invariant is exact.
    @throws core.ExecutionClosureValidationError When DAG inputs, commands, or raw proofs drift.
    """
    source_archive = profile.get("workspacePrerequisiteBuildDagSource")
    contract = profile.get("workspacePrerequisiteBuildDag")
    resolution = profile.get("workspaceBuildResolution")
    inventories = profile.get("workspacePrerequisiteOutputInventories")
    if source_archive != _reference(core.V2_ARCHIVE):
        _workspace_dag_fail("EXECUTION_SOURCE_ARCHIVE_INVALID")
    frozen_v2 = _load_json(core.V2_ARCHIVE).get("entries")
    if not isinstance(frozen_v2, list):
        _workspace_dag_fail("FROZEN_ENTRIES_INVALID")
    validate_workspace_prerequisite_build_dag_contract_v1(contract, frozen_v2)
    validate_installed_workspace_build_resolution_v1(contract, resolution)
    validate_workspace_prerequisite_build_output_inventories_v1(contract, inventories)
    for field in (
        "workspacePrerequisiteBuildDagSource",
        "workspacePrerequisiteBuildDag",
        "workspaceBuildResolution",
        "workspacePrerequisiteOutputInventories",
    ):
        if receipt.get(field) != profile.get(field):
            _workspace_dag_fail("RECEIPT_INVALID", field)
    specifications = _workspace_prerequisite_command_specs_v1(contract)
    by_id = {
        command.get("id"): command
        for command in commands
        if isinstance(command, dict) and isinstance(command.get("id"), str)
    }
    if len(by_id) != len(commands):
        _workspace_dag_fail("COMMAND_INVALID")
    for specification in specifications:
        command_id = specification["id"]
        command = by_id.get(command_id)
        if not isinstance(command, dict):
            _workspace_dag_fail("COMMAND_INVALID", command_id)
        executor = command.get("actualExecutor")
        if (
            command.get("argv") != specification["logicalArgv"]
            or command.get("cwd") != "."
            or command.get("env") != ENV
            or command.get("envAbsent") != ENV_ABSENT
            or command.get("network") is not False
            or command.get("exitCode") != 0
            or not isinstance(executor, dict)
            or executor.get("logicalArgv") != specification["logicalArgv"]
            or executor.get("environment") != ENV
            or executor.get("effectiveEnvironment") != {"CI": "true", "PATH": BOOTSTRAP_PATH}
            or executor.get("inheritedEnv") != []
            or executor.get("payloadArgv") != specification["payloadArgv"]
        ):
            _workspace_dag_fail("COMMAND_INVALID", command_id)
        kind = specification["kind"]
        if kind != "build" and "toolchain" in executor:
            _workspace_dag_fail("COMMAND_INVALID", command_id)
        if kind == "resolution":
            if _workspace_command_raw_json_v1(
                command,
                candidate_root,
                "INSTALLED_RESOLUTION_INVALID",
            ) != {"resolutions": resolution}:
                _workspace_dag_fail("INSTALLED_RESOLUTION_INVALID")
        elif kind == "build":
            validate_workspace_prerequisite_pnpm_executor_v1(command, contract)
        elif kind == "output-inventory":
            step = specification.get("step")
            if not isinstance(step, dict) or not isinstance(step.get("ordinal"), int):
                _workspace_dag_fail("OUTPUT_INVENTORY_INVALID")
            ordinal = step["ordinal"]
            if ordinal < 0 or ordinal >= len(inventories):
                _workspace_dag_fail("OUTPUT_INVENTORY_INVALID")
            if _workspace_command_raw_json_v1(
                command,
                candidate_root,
                "OUTPUT_INVENTORY_INVALID",
            ) != {"outputs": [inventories[ordinal]]}:
                _workspace_dag_fail("OUTPUT_INVENTORY_INVALID")
        elif kind != "clear":
            _workspace_dag_fail("COMMAND_INVALID", command_id)


def _validate_profile_and_receipt(profile: dict[str, Any], receipt: dict[str, Any], archive: dict[str, Any], candidate_root: Path) -> None:
    """Validates all non-transport execution-profile and receipt invariants.

    @param profile The V3 execution profile.
    @param receipt The V3 command receipt.
    @param archive The V3 source archive.
    @param candidate_root The physical canonical-or-staged candidate directory.
    @returns Nothing when the semantic execution contract is complete.
    @throws core.ExecutionClosureValidationError When any execution contract drifts.
    """
    expected_census = {"tests": [name for name, _ in FR4], "passed": [name for name, _ in FR4], "failed": [], "skipped": {"PG_TEST_URL": "ABSENT"}}
    expected_catalog = {
        "mode": "REQUIRES_RECORDED_GENERATION",
        "argv": list(DIRECT_NODE_STANDARD_PACK_GENERATOR),
        "output": {"path": STANDARD_PACK_CATALOG},
        "staleOutputClear": {"id": "clear-stale-standard-pack-catalog", "argv": ["rm", "-f", STANDARD_PACK_CATALOG], "path": STANDARD_PACK_CATALOG, "postcondition": "ABSENT_BEFORE_RECORDED_GENERATION"},
    }
    if profile.get("schemaVersion") != 1 or profile.get("kind") != "fr4-execution-profile" or profile.get("status") != "CANDIDATE_UNACCEPTED":
        _fail("V3_PODMAN_VALIDATE_PROFILE")
    clean_room = profile.get("cleanRoom")
    if not isinstance(clean_room, dict) or clean_room.get("prohibitedOverlays") != ["shared-worktree", "node_modules", "dist", "preexisting-generated"] or clean_room.get("preexistingGeneratedPaths") != []:
        _fail("V3_PODMAN_VALIDATE_CLEAN_ROOM")
    if profile.get("install") != {"argv": list(HERMETIC_PNPM_INSTALL), "cwd": "."} or profile.get("prerequisiteBuilds") != list(BUILDS) or profile.get("fr4Commands") != [{"id": name, "argv": argv, "env": dict(ENV)} for name, argv in FR4]:
        _fail("V3_PODMAN_VALIDATE_PROFILE")
    if profile.get("standardPackCatalog") != expected_catalog or profile.get("environment") != {"allowlisted": dict(ENV), "absencePredicates": list(ENV_ABSENT)} or profile.get("conditionalSkips") != {"PG_TEST_URL": "ABSENT"} or profile.get("outcomeCensus") != expected_census:
        _fail("V3_PODMAN_VALIDATE_PROFILE")
    frozen = profile.get("frozenInputs")
    lockfile = next((entry for entry in archive["entries"] if entry.get("path") == "pnpm-lock.yaml"), None)
    expected_lockfile = {key: lockfile[key] for key in ("path", "sha256", "size")} if isinstance(lockfile, dict) else None
    if not isinstance(frozen, dict) or set(frozen) != {"archive", "lockfile"} or frozen.get("lockfile") != expected_lockfile:
        _fail("V3_PODMAN_VALIDATE_FROZEN_INPUTS")
    _validate_reference(frozen.get("archive"), _candidate_path(candidate_root, V3_ARCHIVE), "V3_PODMAN_VALIDATE_FROZEN_INPUTS", V3_ARCHIVE)
    direct_runtime_integration = profile.get("directRuntimeIntegration")
    profile_direct_runtime_packet_materialization = profile.get("directRuntimePacketMaterialization")
    profile_direct_runtime_trace_receipt = profile.get("directRuntimeTraceReceipt")
    receipt_direct_runtime_integration = receipt.get("directRuntimeIntegration")
    receipt_direct_runtime_packet_materialization = receipt.get("directRuntimePacketMaterialization")
    receipt_direct_runtime_trace_receipt = receipt.get("directRuntimeTraceReceipt")
    receipt_direct_runtime_trace = receipt.get("directRuntimeTrace")
    if direct_runtime_integration is None:
        if (
            receipt_direct_runtime_integration is not None
            or profile_direct_runtime_packet_materialization is not None
            or receipt_direct_runtime_packet_materialization is not None
            or profile_direct_runtime_trace_receipt is not None
            or receipt_direct_runtime_trace_receipt is not None
            or receipt_direct_runtime_trace is not None
        ):
            _direct_runtime_integration_fail("PROFILE_RECEIPT_BINDING_INVALID")
    else:
        validate_direct_command_runtime_runner_integration_v1(direct_runtime_integration)
        expected_packet_materialization = direct_runtime_integration["packetMaterialization"]
        if (
            receipt_direct_runtime_integration != direct_runtime_integration
            or receipt_direct_runtime_trace != direct_runtime_integration["attempt"]["executionTrace"]
            or profile_direct_runtime_packet_materialization != expected_packet_materialization
            or receipt_direct_runtime_packet_materialization != expected_packet_materialization
            or profile_direct_runtime_trace_receipt != receipt_direct_runtime_trace_receipt
        ):
            _direct_runtime_integration_fail("PROFILE_RECEIPT_BINDING_INVALID")
        if archive.get("directRuntimeSourcePacket") != direct_runtime_integration["sourcePacket"]:
            _direct_runtime_integration_fail("ARCHIVE_PACKET_BINDING_INVALID")
        if archive.get("directRuntimeBaselineReadSet") != direct_runtime_integration["readSet"]["baselineReadSet"]:
            _direct_runtime_integration_fail("ARCHIVE_PACKET_BINDING_INVALID")
        if archive.get("directRuntimePacketMaterialization") != expected_packet_materialization:
            _direct_runtime_integration_fail("ARCHIVE_PACKET_MATERIALIZATION_BINDING_INVALID")
        raw_trace_event_envelope = capture_direct_command_runtime_in_container_trace_v1(
            profile_direct_runtime_trace_receipt,
            direct_runtime_integration,
        )
        if parse_direct_command_runtime_trace_events_v1(
            raw_trace_event_envelope,
            direct_runtime_integration,
        ) != direct_runtime_integration["attempt"]["executionTrace"]:
            _direct_runtime_integration_fail("PROFILE_RECEIPT_TRACE_BINDING_INVALID")
    versions = profile.get("toolVersions")
    expected_versions = {"node": ["node", "--version"], "pnpm": ["pnpm", "--version"], "scanner": ["repo-graph", "--version"]}
    if not isinstance(versions, dict) or set(versions) != set(expected_versions):
        _fail("V3_PODMAN_VALIDATE_TOOL_VERSIONS")
    for name, argv in expected_versions.items():
        identity = versions.get(name)
        if not isinstance(identity, dict) or identity.get("argv") != argv or not isinstance(identity.get("stdout"), str) or not identity["stdout"] or identity.get("stdoutSha256") != _sha256(identity["stdout"].encode("utf-8")) or not isinstance(identity.get("executor"), dict):
            _fail("V3_PODMAN_VALIDATE_TOOL_VERSIONS", name)
    hermetic_pnpm_contract = profile.get("hermeticPnpmInstall")
    validate_hermetic_pnpm_install_contract_v1(hermetic_pnpm_contract, archive["entries"])
    if hermetic_pnpm_contract["trustLockfile"]["pnpmVersion"] != versions["pnpm"]["stdout"]:
        _fail("V3_HERMETIC_PNPM_VERSION_MISMATCH")
    nested_pnpm_runtime = profile.get("nestedPnpmRuntime")
    receipt_nested_pnpm_runtime = receipt.get("nestedPnpmRuntime")
    validate_nested_pnpm_runtime_shim_contract_v1(nested_pnpm_runtime)
    validate_nested_pnpm_runtime_shim_contract_v1(receipt_nested_pnpm_runtime)
    if receipt_nested_pnpm_runtime != nested_pnpm_runtime:
        _fail("V3_NESTED_PNPM_RUNTIME_SHIM_RECEIPT_INVALID")
    toolchain = profile.get("executorToolchain")
    if not isinstance(toolchain, dict) or set(toolchain) != {"node", "pnpmLauncher"}:
        _fail("V3_PODMAN_VALIDATE_TOOLCHAIN")
    node = toolchain.get("node")
    pnpm = toolchain.get("pnpmLauncher")
    if not isinstance(node, dict) or not isinstance(pnpm, dict) or set(node) != {"path", "sha256", "version"} or set(pnpm) != {"path", "sha256", "version"} or node.get("path") != CONTAINER_NODE or pnpm.get("path") != str(HOST_PNPM.resolve()) or node.get("version") != versions["node"]["stdout"] or pnpm.get("version") != versions["pnpm"]["stdout"] or node.get("sha256") != versions["node"].get("executableSha256") or pnpm.get("sha256") != versions["pnpm"].get("launcherSha256"):
        _fail("V3_PODMAN_VALIDATE_TOOLCHAIN")
    if not re.fullmatch(r"[0-9a-f]{64}", str(node.get("sha256"))) or not re.fullmatch(r"[0-9a-f]{64}", str(pnpm.get("sha256"))):
        _fail("V3_PODMAN_VALIDATE_TOOLCHAIN")
    nested_launcher = nested_pnpm_runtime["launcher"]
    pnpm_version_executor = versions["pnpm"]["executor"]
    node_version_executor = versions["node"]["executor"]
    if (
        node.get("path") != nested_launcher["node"]
        or node_version_executor.get("payloadArgv") != [nested_launcher["node"], "--version"]
        or pnpm_version_executor.get("payloadArgv") != [
            nested_launcher["node"],
            nested_launcher["pnpmLauncher"],
            "--version",
        ]
    ):
        _fail("V3_NESTED_PNPM_RUNTIME_SHIM_TOOLCHAIN_INVALID")
    commands = receipt.get("commands")
    if not isinstance(commands, list):
        _fail("V3_PODMAN_VALIDATE_COMMAND_ORDER")
    by_id = {command.get("id"): command for command in commands if isinstance(command, dict)}
    if direct_runtime_integration is not None:
        _validate_direct_runtime_apk_build_receipt_v1(
            direct_runtime_integration, commands,
        )
        expected_packet_materialization = direct_runtime_integration["packetMaterialization"]
        materialization_probe = by_id.get("direct-runtime-materialization-probe")
        if (
            not isinstance(materialization_probe, dict)
            or _workspace_command_raw_json_v1(
                materialization_probe,
                candidate_root,
                "DIRECT_RUNTIME_MATERIALIZATION_PROBE_INVALID",
            ) != {
                "sourcePacketSha256": expected_packet_materialization["sourcePacketSha256"],
                "entries": expected_packet_materialization["entries"],
            }
        ):
            _direct_runtime_integration_fail("MATERIALIZATION_PROBE_INVALID")
        trace_command = by_id.get("direct-runtime-trace")
        if (
            not isinstance(trace_command, dict)
            or _workspace_command_raw_json_v1(
                trace_command,
                candidate_root,
                "DIRECT_RUNTIME_TRACE_RECEIPT_INVALID",
            ) != profile.get("directRuntimeTraceReceipt")
        ):
            _direct_runtime_integration_fail("IN_CONTAINER_TRACE_RECEIPT_INVALID")
        post_generator_identity = by_id.get("direct-runtime-dist-identity-post-generator")
        if not isinstance(post_generator_identity, dict):
            _direct_runtime_integration_fail("POST_GENERATOR_DIST_IDENTITY_INVALID")
        _validate_direct_runtime_post_generator_dist_identity_v1(
            direct_runtime_integration, post_generator_identity,
        )
    _validate_workspace_prerequisite_execution_v1(
        profile,
        receipt,
        commands,
        candidate_root,
    )
    for command_id, logical in NONINSTALL_PNPM_COMMANDS:
        command = by_id.get(command_id)
        if not isinstance(command, dict) or command.get("argv") != logical:
            _fail("V3_PNPM_NONINSTALL_EXECUTOR_INVALID", command_id)
        validate_noninstall_pnpm_executor_v1(command)
    if clean_room.get("replayCommand") != by_id.get("replay"):
        _fail("V3_PODMAN_VALIDATE_CLEAN_ROOM")
    offline_install = by_id.get("offline-install")
    if not isinstance(offline_install, dict) or offline_install.get("argv") != HERMETIC_PNPM_INSTALL or offline_install.get("network") is not False or offline_install.get("registryAttestation") != {"requests": 0, "retryEvents": 0}:
        _fail("V3_HERMETIC_PNPM_RECEIPT_INVALID")
    offline_payload = offline_install.get("actualExecutor", {}).get("payloadArgv") if isinstance(offline_install.get("actualExecutor"), dict) else None
    if offline_payload != [CONTAINER_NODE, CONTAINER_PNPM, *HERMETIC_PNPM_PAYLOAD_SUFFIX]:
        _fail("V3_HERMETIC_PNPM_RECEIPT_INVALID")
    raw_streams: dict[str, str] = {}
    for stream in ("stdout", "stderr"):
        reference = offline_install.get(stream)
        if not isinstance(reference, dict):
            _fail("V3_HERMETIC_PNPM_RECEIPT_INVALID")
        path = _candidate_reference_path(candidate_root, reference)
        _validate_reference(reference, path, "V3_HERMETIC_PNPM_RECEIPT_INVALID", TRACK_DIR / _normal_path(reference.get("path")))
        try:
            raw_streams[stream] = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            _fail("V3_HERMETIC_PNPM_RECEIPT_INVALID")
    if _hermetic_pnpm_registry_attestation(raw_streams["stdout"], raw_streams["stderr"], hermetic_pnpm_contract) != offline_install["registryAttestation"]:
        _fail("V3_HERMETIC_PNPM_RECEIPT_INVALID")
    for command in commands:
        if command.get("argv", [None])[0] == "pnpm" and command.get("actualExecutor", {}).get("toolchain") != toolchain:
            _fail("V3_PODMAN_VALIDATE_TOOLCHAIN")
        if command.get("argv", [None])[0] == "pnpm":
            expected_launcher_prefix = [
                nested_launcher["node"],
                nested_launcher["pnpmLauncher"],
            ]
            executor = command.get("actualExecutor", {})
            if executor.get("payloadArgv", [])[:len(expected_launcher_prefix)] != expected_launcher_prefix:
                _fail("V3_NESTED_PNPM_RUNTIME_SHIM_EXECUTOR_INVALID")
            if command.get("argv") == STANDARD_PACK_GENERATOR and executor.get("environmentOverrides") != {
                "NODE_OPTIONS": DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS,
            }:
                _fail("V3_DIRECT_RUNTIME_GENERATOR_ENVIRONMENT_INVALID")
        if command.get("argv") == DIRECT_NODE_STANDARD_PACK_GENERATOR:
            executor = command.get("actualExecutor", {})
            if (
                executor.get("environmentOverrides")
                != {"NODE_OPTIONS": DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS}
                or executor.get("payloadArgv")
                != [CONTAINER_NODE, *DIRECT_NODE_STANDARD_PACK_GENERATOR[1:]]
            ):
                _fail("V3_DIRECT_RUNTIME_GENERATOR_ENVIRONMENT_INVALID")
    if receipt.get("schemaVersion") != 1 or receipt.get("kind") != "fr4-execution-receipt" or receipt.get("status") != "CANDIDATE_UNACCEPTED" or receipt.get("toolVersions") != versions or receipt.get("executorToolchain") != toolchain or receipt.get("frozenInputs") != frozen or receipt.get("hermeticPnpmInstall") != hermetic_pnpm_contract or receipt.get("outcomeCensus") != expected_census:
        _fail("V3_PODMAN_VALIDATE_RECEIPT")
    expected_inventories = [
        {"stage": "baseline-v2-pre", "inventory": BASELINE_V2_INVENTORY},
        {"stage": "baseline-v2-post", "inventory": BASELINE_V2_INVENTORY},
        {"stage": "closure-pre-build", "inventory": archive["closureInventory"]},
        {"stage": "closure-post-build", "inventory": archive["closureInventory"]},
        {"stage": "closure-post-standard-pack-generation", "inventory": archive["closureInventory"]},
    ]
    if receipt.get("orderedInventories") != expected_inventories:
        _fail("V3_PODMAN_VALIDATE_INVENTORIES")
    executors = profile.get("containerIsolation", {}).get("declaredExecutorPaths")
    expected_realpath = {"sourceRootOverlayPaths": [], "nodeModulesOverlayPaths": [], "preexistingGeneratedPaths": [], "containerRuntime": {"sourcePathsOutsideWork": [], "outsideWorkPaths": executors}}
    if receipt.get("realpathAudit") != expected_realpath:
        _fail("V3_PODMAN_VALIDATE_REALPATH_AUDIT")
    expected_gate = {"algorithm": "all-command-exits-and-expected-skip-census-v1", "orderedCommandIds": [command["id"] for command in commands], "exitCodes": {command["id"]: command["exitCode"] for command in commands}, "expectedSkipCensus": {"PG_TEST_URL": "ABSENT"}, "observedSkipCensus": {"PG_TEST_URL": "ABSENT"}, "status": "PASS"}
    if receipt.get("gateStatus") != expected_gate:
        _fail("V3_PODMAN_VALIDATE_GATE_STATUS")
def validate_execution_closure_v1(manifest: dict[str, Any], archive: dict[str, Any], ledger: dict[str, Any], profile: dict[str, Any], receipt: dict[str, Any], graph_binding: dict[str, Any], clean_audit: dict[str, Any], compensation: dict[str, Any], *, candidate_directory: Path | str = V3_DIR) -> None:
    """Validates every immutable V3 Podman candidate artifact without unblocking R2.

    @param manifest The candidate manifest.
    @param archive The source archive.
    @param ledger The omission and supplement-capture ledger.
    @param profile The Podman execution profile.
    @param receipt The exact command receipt.
    @param graph_binding The fresh graph binding.
    @param clean_audit The fresh clean-room audit.
    @param compensation The fresh compensation artifact.
    @returns Nothing when the candidate is internally valid.
    @throws core.ExecutionClosureValidationError When evidence is mutable, stale, or unsafe.
    """
    candidate_root = Path(candidate_directory)
    disk = tuple(_load_json(_candidate_path(candidate_root, path)) for path in (V3_MANIFEST, V3_ARCHIVE, V3_LEDGER, V3_PROFILE, V3_RECEIPT, V3_GRAPH, V3_AUDIT, V3_COMPENSATION))
    supplied = (manifest, archive, ledger, profile, receipt, graph_binding, clean_audit, compensation)
    if supplied != disk:
        _fail("V3_PODMAN_VALIDATE_IN_MEMORY_MUTATION")
    _validate_archive(archive)
    _validate_ledger(ledger, archive, candidate_root)
    _validate_manifest(manifest, candidate_root)
    _validate_container(profile, receipt, graph_binding)
    _validate_container_raw_evidence(profile, candidate_root)
    if profile.get("baselineV2Inventory") != {"pre": BASELINE_V2_INVENTORY, "post": BASELINE_V2_INVENTORY} or profile.get("closureInventory") != archive.get("closureInventory") or receipt.get("closureInventory") != archive.get("closureInventory"):
        _fail("V3_PODMAN_VALIDATE_INVENTORIES")
    workspace_command_specs = _workspace_prerequisite_command_specs_v1(
        profile.get("workspacePrerequisiteBuildDag"),
    )
    resolution_ids = [
        specification["id"]
        for specification in workspace_command_specs
        if specification.get("kind") == "resolution"
    ]
    derived_ids = [
        specification["id"]
        for specification in workspace_command_specs
        if specification.get("kind") != "resolution"
    ]
    if len(resolution_ids) != 1:
        _workspace_dag_fail("COMMAND_INVALID")
    expected_ids = [
        "materialize",
        "direct-runtime-materialization-probe",
        "replay",
        "offline-install",
        *resolution_ids,
        "build-db",
        "build-auth",
        "build-backend",
        *derived_ids,
        "build-advantage-play-kit-for-runtime",
        "direct-runtime-dist-identity",
        "clear-stale-standard-pack-catalog",
        "generate-standard-pack-catalog",
        "direct-runtime-dist-identity-post-generator",
        "direct-runtime-trace",
        *[name for name, _ in FR4],
    ]
    commands = receipt.get("commands")
    if not isinstance(commands, list) or [command.get("id") if isinstance(command, dict) else None for command in commands] != expected_ids:
        _fail("V3_PODMAN_VALIDATE_COMMAND_ORDER")
    raw_paths: list[str] = []
    _validate_profile_and_receipt(profile, receipt, archive, candidate_root)
    for command in commands:
        if not isinstance(command, dict) or command.get("exitCode") != 0 or command.get("env") != ENV or command.get("envAbsent") != ENV_ABSENT or command.get("network") is not False:
            _fail("V3_PODMAN_VALIDATE_COMMAND")
        for stream in ("stdout", "stderr"):
            reference = command.get(stream)
            if not isinstance(reference, dict):
                _fail("V3_PODMAN_VALIDATE_RAW")
            _validate_reference(reference, _candidate_reference_path(candidate_root, reference), "V3_PODMAN_VALIDATE_RAW", TRACK_DIR / _normal_path(reference.get("path") if isinstance(reference, dict) else None))
            raw_paths.append(reference["path"])
    for artifact in (graph_binding, clean_audit, compensation):
        if artifact.get("status") != "CANDIDATE_UNACCEPTED" or artifact.get("executionClosure") != {**manifest["closureCore"], "closureSha256": manifest["closureSha256"]} or not artifact.get("rawStreams"):
            _fail("V3_PODMAN_VALIDATE_DERIVATIVE")
        for reference in artifact["rawStreams"]:
            _validate_reference(reference, _candidate_reference_path(candidate_root, reference), "V3_PODMAN_VALIDATE_RAW", TRACK_DIR / _normal_path(reference.get("path") if isinstance(reference, dict) else None))
            raw_paths.append(reference["path"])
    if len(raw_paths) != len(set(raw_paths)):
        _fail("V3_PODMAN_VALIDATE_RAW_REUSE")
    immutable = clean_audit.get("task3ImmutableAudit")
    if not isinstance(immutable, dict) or immutable.get("v2Evidence") != core.V2_EVIDENCE or immutable.get("blockerRecords") != core.BLOCKER_RECORDS or immutable.get("findings") != []:
        _fail("V3_PODMAN_VALIDATE_IMMUTABLE_AUDIT")
