"""Deterministic, non-mutating source snapshot producer for Phase R1.

The producer operates in the shared ``master`` worktree without changing
the real Git index or unrelated paths. It captures the complete scanner-input
denominator discovered in the dirty tree (TypeScript candidates, every
``tsconfig*.json`` plus its recursive ``extends`` chain, package manifests,
workspace and lock files, and any ``build-graph.config.json``), writes a rich
base64-per-entry bundle plus an accepted R0 v1 projection, and binds the
HEAD/branch/tool/config and pre/post denominator, status, and staged-diff
digests.

The artifact set is the input the accepted Phase R0
``business_operations_graph_baseline_validation`` validator replays; the
``source_snapshot`` projection returned by :func:`produce_snapshot` mirrors
the v1 contract shape required by R0 acceptance without weakening the v1
validator.
"""
from __future__ import annotations

import base64
import dataclasses
import fnmatch
import hashlib
import json
import os
import posixpath
import re
import stat
import subprocess
import tempfile
from pathlib import Path, PurePosixPath
from typing import Any, Callable, Iterable


SCHEMA_VERSION = 2
R0_SCHEMA_VERSION = 1
ARCHIVE_KIND = "source-snapshot"
ARCHIVE_ENCODING = "base64-per-entry"
SCAN_COMMAND = "repo-graph scan . ./graph.db"
EXPECTED_TOOL_VERSION = "0.1.0"
CANDIDATE_EXTENSIONS = (".ts", ".tsx", ".mts", ".cts")
TSCONFIG_PATTERN = re.compile(r"^tsconfig(\.[a-z0-9_.-]+)?\.json$", re.IGNORECASE)
MANIFEST_FILE_NAMES = {"package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml"}
BUILD_GRAPH_CONFIG_NAMES = {"build-graph.config.json", "build-graph.config.cjs", "build-graph.config.mjs"}
R0_SOURCE_SNAPSHOT_KEYS = {
    "archive",
    "baselineHead",
    "branch",
    "manifest",
    "postScan",
    "preScan",
    "scanCommand",
    "scanConfig",
    "toolVersion",
}
SKIP_DIR_NAMES = {".git", "node_modules", ".turbo", ".next", "dist", "build", "coverage", "target"}


class SnapshotError(RuntimeError):
    """Base class for non-fatal snapshot producer errors."""


class SnapshotValidationError(SnapshotError):
    """Raised when replaying or verifying a produced snapshot fails closed."""


class SnapshotDriftError(SnapshotError):
    """Raised when concurrent source drift invalidates the pre/post checks."""


@dataclasses.dataclass(frozen=True)
class _FileDescriptor:
    """One discovered scanner-input entry after normalization."""

    path: str
    absolute: Path
    kind: str
    mode: str
    state: str
    symlink_target: str | None
    resolved_target_path: str | None
    size: int
    sha256: str
    content: bytes | None


def _canonical(value: Any) -> bytes:
    """Returns the canonical JSON bytes used for every snapshot digest."""
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _sha(data: bytes) -> str:
    """Returns the lowercase SHA-256 hex digest of ``data``."""
    return hashlib.sha256(data).hexdigest()


def _normalize_repo_path(value: str) -> str:
    """Validates a canonical repository-relative POSIX path and returns it."""
    if not isinstance(value, str) or not value or "\x00" in value or "\\" in value:
        raise SnapshotValidationError(f"path is not a canonical POSIX string: {value!r}")
    path = PurePosixPath(value)
    parts = path.parts
    if path.is_absolute() or not parts or any(part in {"", ".", ".."} for part in parts):
        raise SnapshotValidationError(f"path is not repository-relative: {value!r}")
    if ":" in parts[0] or path.as_posix() != value:
        raise SnapshotValidationError(f"path is not canonical: {value!r}")
    return value


def _is_within_root(absolute: Path, root: Path) -> bool:
    """Reports whether ``absolute`` resolves inside ``root``."""
    try:
        resolved = absolute.resolve(strict=False)
    except OSError:
        return False
    try:
        resolved.relative_to(root.resolve(strict=False))
        return True
    except ValueError:
        return False


def _is_safely_within_root(absolute: Path, root: Path) -> bool:
    """Reports whether ``absolute`` is contained in ``root`` with no parent symlink escape.

    The path itself is allowed to be a symlink; the producer captures the
    target explicitly. Only the directory ancestors between ``root`` and
    ``absolute`` are required to be non-symlink.
    """
    if not _is_within_root(absolute, root):
        return False
    current = absolute.parent
    root_resolved = root.resolve(strict=False)
    while current != root_resolved and current != current.parent:
        if current.is_symlink():
            return False
        current = current.parent
    return True


def _git_text(repo: Path, *args: str) -> str:
    """Runs one read-only Git command and returns the decoded text output."""
    result = subprocess.run(
        ["git", *args],
        cwd=repo,
        capture_output=True,
        check=True,
        text=True,
    )
    return result.stdout


def _git_bytes(repo: Path, *args: str) -> bytes:
    """Runs one read-only Git command and returns the raw bytes output."""
    result = subprocess.run(
        ["git", *args],
        cwd=repo,
        capture_output=True,
        check=True,
    )
    return result.stdout


def _git_unstaged_status(repo: Path) -> list[tuple[str, str]]:
    """Returns one ``(code, path)`` tuple per unstaged status entry without mutating the index."""
    output = _git_text(repo, "diff-index", "--name-status", "-z", "HEAD", "--")
    return _parse_name_status_z(output)


def _git_staged_status(repo: Path) -> list[tuple[str, str]]:
    """Returns one ``(code, path)`` tuple per staged status entry without mutating the index."""
    output = _git_text(repo, "diff-index", "--cached", "--name-status", "-z", "HEAD", "--")
    return _parse_name_status_z(output)


def _git_untracked_paths(repo: Path) -> list[str]:
    """Returns the list of untracked paths without consulting the index."""
    output = _git_text(repo, "ls-files", "--others", "--exclude-standard", "-z")
    return [entry for entry in output.split("\x00") if entry]


def _git_deleted_tracked_paths(repo: Path) -> list[str]:
    """Returns staged and unstaged deleted tracked paths without mutating the index."""
    output = _git_text(repo, "ls-files", "--deleted", "-z")
    deleted = {entry for entry in output.split("\x00") if entry}
    deleted.update(
        path for code, path in _git_staged_status(repo) if code.startswith("D")
    )
    return sorted(deleted)


def _parse_name_status_z(output: str) -> list[tuple[str, str]]:
    """Parses ``git diff-index -z`` output into ``(code, path)`` tuples."""
    entries: list[tuple[str, str]] = []
    parts = output.split("\x00")
    index = 0
    while index < len(parts):
        block = parts[index]
        if not block:
            index += 1
            continue
        code = block
        index += 1
        if index >= len(parts):
            break
        path = parts[index]
        entries.append((code, path))
        index += 1
    return entries


def _git_tracked_paths(repo: Path) -> set[str]:
    """Returns the set of currently-tracked repository-relative paths."""
    output = _git_text(repo, "ls-files", "-z")
    return {entry for entry in output.split("\x00") if entry}


def _git_worktree_state(repo: Path) -> dict[str, Any]:
    """Reports the one-shared-master-worktree invariant at snapshot time."""
    output = _git_text(repo, "worktree", "list", "--porcelain")
    paths = [line[len("worktree "):] for line in output.splitlines() if line.startswith("worktree ")]
    try:
        branch = _git_text(repo, "symbolic-ref", "--quiet", "--short", "HEAD").strip()
    except subprocess.CalledProcessError:
        branch = ""
    actual_root = _git_text(repo, "rev-parse", "--show-toplevel").strip()
    return {
        "actualRoot": str(Path(actual_root).resolve(strict=False)),
        "branch": branch,
        "expected_root": str(repo.resolve(strict=False)),
        "worktreeCount": len(paths),
        "worktrees": [str(Path(path).resolve(strict=False)) for path in paths],
    }


def _check_worktree_state(repo: Path) -> None:
    """Raises when the worktree invariant required by AGENTS A16 is violated."""
    state = _git_worktree_state(repo)
    if state["worktreeCount"] != 1:
        raise SnapshotError(
            f"shared master worktree invariant violated: "
            f"worktreeCount={state['worktreeCount']} (must be 1)"
        )
    expected_root = state["expected_root"]
    if state["actualRoot"] != expected_root or state["worktrees"] != [expected_root]:
        raise SnapshotError(
            "scanner root must be the sole physical Git worktree root: "
            f"scanner={expected_root!r} gitRoot={state['actualRoot']!r} "
            f"worktrees={state['worktrees']!r}"
        )
    if state["branch"] != "master":
        raise SnapshotError(
            f"snapshot must run on master: branch={state['branch']!r}"
        )


def _lstat_mode(path: Path) -> str:
    """Returns a Git-compatible mode derived from the path's lstat metadata."""
    metadata = path.lstat()
    if stat.S_ISLNK(metadata.st_mode):
        return "120000"
    if not stat.S_ISREG(metadata.st_mode):
        raise SnapshotValidationError(f"scanner input is not a regular file: {path}")
    return "100755" if metadata.st_mode & 0o111 else "100644"


def _read_jsonc(path: Path) -> dict[str, Any]:
    """Parses a JSON or JSONC config file, falling back to YAML when needed."""
    text = path.read_text(encoding="utf-8")
    try:
        parsed = json.loads(_strip_jsonc_comments(text))
    except json.JSONDecodeError:
        parsed = _parse_yaml_simple(text)
    if not isinstance(parsed, dict):
        return {}
    return parsed


def _strip_jsonc_comments(text: str) -> str:
    """Strips ``//`` and ``/* */`` comments and trailing commas from JSONC text."""
    out: list[str] = []
    index = 0
    length = len(text)
    in_string = False
    while index < length:
        char = text[index]
        if in_string:
            out.append(char)
            if char == "\\" and index + 1 < length:
                out.append(text[index + 1])
                index += 2
                continue
            if char == '"':
                in_string = False
            index += 1
            continue
        if char == '"':
            in_string = True
            out.append(char)
            index += 1
            continue
        if char == "/" and index + 1 < length and text[index + 1] == "/":
            while index < length and text[index] != "\n":
                index += 1
            continue
        if char == "/" and index + 1 < length and text[index + 1] == "*":
            index += 2
            while index + 1 < length and not (text[index] == "*" and text[index + 1] == "/"):
                index += 1
            index += 2
            continue
        out.append(char)
        index += 1
    cleaned = "".join(out)
    cleaned = re.sub(r",(\s*[}\]])", r"\1", cleaned)
    return cleaned


def _parse_yaml_simple(text: str) -> dict[str, Any]:
    """Parses the small subset of YAML used by ``pnpm-workspace.yaml``."""
    packages: list[str] = []
    capturing = False
    for line in text.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        indent = len(line) - len(line.lstrip(" "))
        stripped = line.strip()
        if indent == 0 and stripped.startswith("packages:"):
            capturing = True
            continue
        if capturing:
            if indent == 0:
                break
            if not stripped.startswith("- "):
                continue
            value = stripped[2:].strip().strip("'\"")
            if value:
                packages.append(value)
    return {"packages": packages} if packages else {}


def _resolve_existing_extends_path(
    owner: str,
    extends: str,
    worktree_root: Path,
    workspace_packages: dict[str, tuple[str, dict[str, Any]]],
) -> str | None:
    """Resolves one reachable in-repository tsconfig target if it exists safely."""
    if not extends or "\x00" in extends or "\\" in extends:
        return None
    raw_candidates: list[str]
    if extends.startswith("."):
        raw_candidates = [posixpath.normpath(
            (PurePosixPath(owner).parent / extends).as_posix()
        )]
    elif extends.startswith("/"):
        return None
    else:
        # Resolve workspace package names to their physical package directory,
        # while still allowing an exact root-relative repository path.
        raw_candidates = [extends]
        for name, (package_dir, exports) in workspace_packages.items():
            if extends == name:
                suffix = "tsconfig.json"
            elif extends.startswith(name + "/"):
                suffix = extends[len(name) + 1:]
            else:
                continue
            export_target = exports.get("./" + suffix)
            if isinstance(export_target, str):
                raw_candidates.insert(
                    0, f"{package_dir}/{export_target.removeprefix('./')}"
                )
            raw_candidates.insert(0, f"{package_dir}/{suffix}")
    candidates: list[str] = []
    for raw in raw_candidates:
        candidates.extend(
            [raw] if raw.endswith(".json") else [raw + ".json", raw + "/tsconfig.json"]
        )
    for candidate in candidates:
        try:
            relative = _normalize_repo_path(PurePosixPath(candidate).as_posix())
        except SnapshotValidationError:
            continue
        absolute = worktree_root / relative
        if (
            _is_safely_within_root(absolute, worktree_root)
            and absolute.is_file()
            and (not absolute.is_symlink() or _is_within_root(absolute, worktree_root))
        ):
            return relative
    return None


def _descriptor_for_existing_path(
    worktree_root: Path,
    relative: str,
    tracked: set[str],
) -> _FileDescriptor:
    """Builds a byte- and lstat-faithful descriptor for one existing input path."""
    path = worktree_root / relative
    if path.is_symlink():
        target_relative = os.readlink(path)
        if target_relative.startswith("/") or "\\" in target_relative:
            raise SnapshotValidationError(
                f"symlink {relative} must use a relative POSIX target: {target_relative!r}"
            )
        target_path = (path.parent / target_relative).resolve(strict=False)
        if not _is_within_root(target_path, worktree_root) or not target_path.is_file():
            raise SnapshotValidationError(
                f"symlink {relative} has an unsafe or non-file target: {target_relative!r}"
            )
        data = target_path.read_bytes()
        return _FileDescriptor(
            path=relative,
            absolute=path,
            kind="symlink",
            mode=_lstat_mode(path),
            state="tracked" if relative in tracked else "untracked",
            symlink_target=target_relative,
            resolved_target_path=target_path.relative_to(worktree_root).as_posix(),
            size=len(data),
            sha256=_sha(data),
            content=data,
        )
    data = path.read_bytes()
    return _FileDescriptor(
        path=relative,
        absolute=path,
        kind="file",
        mode=_lstat_mode(path),
        state="tracked" if relative in tracked else "untracked",
        symlink_target=None,
        resolved_target_path=None,
        size=len(data),
        sha256=_sha(data),
        content=data,
    )


def _load_reachable_extends(
    worktree_root: Path,
    tracked: set[str],
    configs: dict[str, dict[str, Any]],
    descriptors: dict[str, _FileDescriptor],
) -> set[str]:
    """Parses every recursively reachable in-repository tsconfig extends target."""
    targets: set[str] = set()
    visited: set[str] = set()
    workspace_packages: dict[str, tuple[str, dict[str, Any]]] = {}
    for relative, descriptor in descriptors.items():
        if descriptor.absolute.name != "package.json":
            continue
        try:
            package = _read_jsonc(descriptor.absolute)
            name = package.get("name")
        except (OSError, ValueError):
            continue
        if isinstance(name, str):
            exports = package.get("exports")
            workspace_packages[name] = (
                PurePosixPath(relative).parent.as_posix(),
                exports if isinstance(exports, dict) else {},
            )

    def visit(owner: str, stack: tuple[str, ...]) -> None:
        if owner in visited:
            return
        if owner in stack:
            raise SnapshotValidationError(
                f"tsconfig extends cycle detected: {stack + (owner,)}"
            )
        stack = stack + (owner,)
        visited.add(owner)
        extends = configs.get(owner, {}).get("extends")
        values = [extends] if isinstance(extends, str) else extends if isinstance(extends, list) else []
        for value in values:
            if not isinstance(value, str):
                continue
            target = _resolve_existing_extends_path(
                owner, value, worktree_root, workspace_packages
            )
            if target is None:
                continue
            if target in stack:
                raise SnapshotValidationError(
                    f"tsconfig extends cycle detected: {stack + (target,)}"
                )
            targets.add(target)
            if target not in descriptors:
                descriptors[target] = _descriptor_for_existing_path(
                    worktree_root, target, tracked
                )
            if target not in configs:
                configs[target] = _read_jsonc(worktree_root / target)
            visit(target, stack)

    for root_config in sorted(configs):
        visit(root_config, ())
    return targets


def _walk_repository(worktree_root: Path) -> list[Path]:
    """Walks the repository and yields file and symlink paths in deterministic order."""
    result: list[Path] = []
    for base, dirs, files in os.walk(worktree_root, followlinks=False):
        relative = Path(base).relative_to(worktree_root)
        if any(part in SKIP_DIR_NAMES for part in relative.parts):
            dirs[:] = []
            continue
        if not _is_safely_within_root(Path(base), worktree_root):
            dirs[:] = []
            continue
        for name in sorted(dirs):
            path = Path(base) / name
            if not _is_safely_within_root(path, worktree_root):
                continue
            result.append(path)
        for name in sorted(files):
            path = Path(base) / name
            if not _is_safely_within_root(path, worktree_root):
                continue
            result.append(path)
    return result


def _matches_package_glob(relative: str, globs: Iterable[str]) -> bool:
    """Reports whether ``relative`` matches any of the provided package glob patterns."""
    for pattern in globs:
        for candidate in (relative, relative + "/"):
            if fnmatch.fnmatchcase(candidate, pattern) or fnmatch.fnmatchcase(relative, pattern.rstrip("/")):
                return True
    return False


def _build_scanner_input_index(
    worktree_root: Path,
    tracked: set[str],
    package_globs: Iterable[str],
) -> tuple[
    list[_FileDescriptor],
    list[_FileDescriptor],
    dict[str, dict[str, Any]],
    set[str],
]:
    """Builds the in-memory scanner-input set without writing any artifact."""
    package_globs_list = list(package_globs)
    configs: dict[str, dict[str, Any]] = {}
    symlink_files: dict[str, _FileDescriptor] = {}
    regular_files: dict[str, _FileDescriptor] = {}
    for path in _walk_repository(worktree_root):
        relative = path.relative_to(worktree_root).as_posix()
        if path.is_symlink():
            if path.resolve(strict=False).is_dir():
                continue
            descriptor = _descriptor_for_existing_path(worktree_root, relative, tracked)
            symlink_files[relative] = descriptor
            if TSCONFIG_PATTERN.match(path.name):
                configs[relative] = _read_jsonc(path)
            continue
        if not path.is_file():
            continue
        name = path.name
        if TSCONFIG_PATTERN.match(name):
            try:
                configs[relative] = _read_jsonc(path)
            except (OSError, ValueError):
                continue
        if not _is_scanner_input(relative, name, package_globs_list):
            continue
        regular_files[relative] = _descriptor_for_existing_path(
            worktree_root, relative, tracked
        )
    all_files = {**regular_files, **symlink_files}
    extends_targets = _load_reachable_extends(
        worktree_root, tracked, configs, all_files
    )
    descriptors = sorted(
        all_files.values(),
        key=lambda item: item.path,
    )
    deleted = sorted(
        (
            _deleted_descriptor(worktree_root, relative)
            for relative in _git_deleted_tracked_paths(worktree_root)
        ),
        key=lambda item: item.path,
    )
    return descriptors, deleted, configs, extends_targets


def _is_scanner_input(relative: str, name: str, package_globs: Iterable[str]) -> bool:
    """Reports whether one regular file is a scanner input."""
    if name.endswith(CANDIDATE_EXTENSIONS):
        return True
    if TSCONFIG_PATTERN.match(name):
        return True
    if name in MANIFEST_FILE_NAMES:
        return True
    if name in BUILD_GRAPH_CONFIG_NAMES:
        return True
    if name == "package.json" and _matches_package_glob(relative, package_globs):
        return True
    return False


def _git_blob_mode(repo: Path, relative: str) -> str:
    """Returns the baseline Git mode of a deleted tracked path."""
    result = subprocess.run(
        ["git", "ls-tree", "HEAD", "--", relative],
        cwd=repo,
        capture_output=True,
        check=False,
        text=True,
    )
    if result.returncode != 0 or not result.stdout.strip():
        raise SnapshotValidationError(
            f"deleted scanner input has no baseline Git mode: {relative}"
        )
    mode = result.stdout.split(None, 1)[0]
    if mode not in {"100644", "100755", "120000"}:
        raise SnapshotValidationError(
            f"unsupported deleted scanner-input mode {mode!r}: {relative}"
        )
    return mode


def _git_blob(repo: Path, relative: str) -> bytes:
    """Returns the tracked blob bytes of ``relative`` or empty bytes on failure."""
    result = subprocess.run(
        ["git", "cat-file", "blob", f"HEAD:{relative}"],
        cwd=repo,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        return b""
    return result.stdout


def _deleted_descriptor(repo: Path, relative: str) -> _FileDescriptor:
    """Builds one deleted-input descriptor from immutable baseline tree data."""
    mode = _git_blob_mode(repo, relative)
    data = _git_blob(repo, relative)
    kind = "symlink" if mode == "120000" else "file"
    symlink_target: str | None = None
    resolved_target: str | None = None
    if kind == "symlink":
        try:
            symlink_target = data.decode("utf-8")
        except UnicodeDecodeError as error:
            raise SnapshotValidationError(
                f"deleted symlink target is not UTF-8: {relative}"
            ) from error
        if symlink_target.startswith("/") or "\\" in symlink_target:
            raise SnapshotValidationError(
                f"deleted symlink has unsafe target: {relative} -> {symlink_target!r}"
            )
        resolved_target = _normalize_repo_path(
            posixpath.normpath(
                (PurePosixPath(relative).parent / symlink_target).as_posix()
            )
        )
    return _FileDescriptor(
        path=relative,
        absolute=repo / relative,
        kind=kind,
        mode=mode,
        state="deleted",
        symlink_target=symlink_target,
        resolved_target_path=resolved_target,
        size=len(data),
        sha256=_sha(data),
        content=data,
    )


def _git_staged_diff(repo: Path) -> str:
    """Returns the exact staged-diff bytes from Git's index without mutating it."""
    return _git_text(repo, "diff", "--binary", "--no-color", "--cached")


def _serialize_state_artifact(porcelain: str, staged_diff: str) -> tuple[dict[str, Any], dict[str, str]]:
    """Returns a state-artifact body and its derived digests."""
    body = {
        "porcelain": porcelain,
        "schemaVersion": SCHEMA_VERSION,
        "stagedDiff": staged_diff,
        "status": porcelain,
    }
    digests = {
        "denominatorSha256": "",
        "porcelainSha256": _sha(porcelain.encode("utf-8")),
        "stagedDiffSha256": _sha(staged_diff.encode("utf-8")),
        "statusSha256": _sha(porcelain.encode("utf-8")),
    }
    return body, digests


def _manifest_entries(descriptors: Iterable[_FileDescriptor]) -> list[dict[str, Any]]:
    """Returns the manifest ``entries`` list in deterministic order."""
    return [
        {
            "kind": descriptor.kind,
            "mode": descriptor.mode,
            "path": descriptor.path,
            "resolvedTargetPath": descriptor.resolved_target_path,
            "sha256": descriptor.sha256,
            "size": descriptor.size,
            "state": descriptor.state,
            "symlinkTarget": descriptor.symlink_target,
        }
        for descriptor in sorted(descriptors, key=lambda item: item.path)
    ]


def _archive_entries(descriptors: Iterable[_FileDescriptor]) -> list[dict[str, Any]]:
    """Returns the archive ``entries`` list with base64 content where available."""
    return [
        {
            "contentBase64": base64.b64encode(descriptor.content).decode("ascii")
            if descriptor.content is not None else "",
            "kind": descriptor.kind,
            "mode": descriptor.mode,
            "path": descriptor.path,
            "resolvedTargetPath": descriptor.resolved_target_path,
            "sha256": descriptor.sha256,
            "size": descriptor.size,
            "state": descriptor.state,
            "symlinkTarget": descriptor.symlink_target,
        }
        for descriptor in sorted(descriptors, key=lambda item: item.path)
    ]


def _deleted_entries(descriptors: Iterable[_FileDescriptor]) -> list[dict[str, Any]]:
    """Returns the deleted-input manifest list without content payloads."""
    return [
        {
            "kind": descriptor.kind,
            "mode": descriptor.mode,
            "path": descriptor.path,
            "sha256": descriptor.sha256,
            "size": descriptor.size,
            "state": descriptor.state,
        }
        for descriptor in sorted(descriptors, key=lambda item: item.path)
    ]


def _capture_state(repo: Path) -> tuple[dict[str, Any], dict[str, str]]:
    """Captures the pre or post state artifact, returning body and digests."""
    porcelain = _build_porcelain(repo)
    staged_diff = _git_staged_diff(repo)
    return _serialize_state_artifact(porcelain, staged_diff)


def _build_porcelain(repo: Path) -> str:
    """Returns one combined status string without mutating the Git index."""
    parts: list[str] = []
    for code, path in _git_unstaged_status(repo):
        if len(code) >= 2:
            parts.append(f" {code[1]} {path}")
        elif code:
            parts.append(f" {code[0]} {path}")
    for code, path in _git_staged_status(repo):
        if code:
            parts.append(f"{code[0]} {path}")
    for path in _git_untracked_paths(repo):
        parts.append(f"?? {path}")
    for path in _git_deleted_tracked_paths(repo):
        parts.append(f" D {path}")
    return "\n".join(sorted(parts))


@dataclasses.dataclass(frozen=True)
class SnapshotArtifacts:
    """One written, in-temp-directory R1 snapshot bundle."""

    root: Path
    output_directory: Path
    manifest: dict[str, Any]
    archive: dict[str, Any]
    r0_manifest: dict[str, Any]
    r0_archive: dict[str, Any]
    pre_state: dict[str, Any]
    post_state: dict[str, Any]
    source_snapshot: dict[str, Any]

    @property
    def denominator_sha256(self) -> str:
        """Returns the canonical denominator digest for the produced manifest."""
        return str(self.manifest["denominatorSha256"])


def _write_atomic(path: Path, data: bytes) -> None:
    """Writes ``data`` to ``path`` atomically without leaving partial files."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=path.name + ".", dir=str(path.parent))
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    except BaseException:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass
        raise


def _json_artifact_bytes(value: Any) -> bytes:
    """Returns deterministic on-disk JSON bytes for one snapshot artifact."""
    return (json.dumps(value, indent=2, sort_keys=True) + "\n").encode("utf-8")


def _write_json(path: Path, value: Any) -> dict[str, Any]:
    """Writes one canonical JSON file atomically and returns its reference dict."""
    data = _json_artifact_bytes(value)
    _write_atomic(path, data)
    return {"path": path.name, "sha256": _sha(data), "size": len(data)}


def _run_canonical_scan(repo: Path) -> dict[str, Any]:
    """Runs the required repo-graph command and returns bound result metadata."""
    result = subprocess.run(
        ["repo-graph", "scan", ".", "./graph.db"],
        cwd=repo,
        capture_output=True,
        text=True,
        check=False,
    )
    return {
        "command": SCAN_COMMAND,
        "exitCode": result.returncode,
        "graphPath": "graph.db",
        "stderr": result.stderr,
        "stdout": result.stdout,
    }


def _validate_scan_result(repo: Path, value: Any) -> dict[str, Any]:
    """Validates one canonical scan result and binds its generated graph bytes."""
    required = {"command", "exitCode", "graphPath", "stderr", "stdout"}
    if not isinstance(value, dict) or set(value) != required:
        raise SnapshotError("scan runner result schema is invalid")
    if value["command"] != SCAN_COMMAND or value["exitCode"] != 0:
        raise SnapshotError("canonical repo-graph scan did not exit successfully")
    if not isinstance(value["stdout"], str) or not isinstance(value["stderr"], str):
        raise SnapshotError("scan runner output must be text")
    try:
        graph_path = _normalize_repo_path(value["graphPath"])
    except SnapshotValidationError as error:
        raise SnapshotError("scan graph path is invalid") from error
    if graph_path != "graph.db":
        raise SnapshotError("canonical scan must write graph.db")
    graph = repo / graph_path
    if not graph.is_file() or graph.is_symlink():
        raise SnapshotError("canonical scan did not produce a regular graph.db")
    data = graph.read_bytes()
    return {
        "command": SCAN_COMMAND,
        "exitCode": 0,
        "graph": {"path": graph_path, "sha256": _sha(data), "size": len(data)},
        "schemaVersion": 1,
        "stderr": value["stderr"],
        "stdout": value["stdout"],
    }


def _resolve_package_globs(configs: dict[str, dict[str, Any]], manifest_paths: dict[str, dict[str, Any]]) -> list[str]:
    """Returns the pnpm workspace package glob patterns declared in the repository."""
    workspace = manifest_paths.get("pnpm-workspace.yaml") or {}
    packages = workspace.get("packages", [])
    if not isinstance(packages, list):
        return []
    return [str(entry) for entry in packages]


def _build_manifest(
    descriptors: list[_FileDescriptor],
    deleted_descriptors: list[_FileDescriptor],
    extends_paths: list[str],
    build_graph_config_paths: list[str],
    package_globs: list[str],
    baseline_head: str,
    branch: str,
    tool_version: str,
    pre_digests: dict[str, str],
    status: str,
) -> dict[str, Any]:
    """Composes the canonical manifest body for the snapshot producer."""
    entries = _manifest_entries([*descriptors, *deleted_descriptors])
    deleted = _deleted_entries(deleted_descriptors)
    archive_metadata = entries
    manifest_paths = [entry["path"] for entry in archive_metadata]
    discovery = {
        "buildGraphConfigPaths": sorted(build_graph_config_paths),
        "candidateExtensions": list(CANDIDATE_EXTENSIONS),
        "configPaths": sorted(
            path for path in manifest_paths if not path.endswith(CANDIDATE_EXTENSIONS)
        ),
        "deletedInputPaths": sorted(entry["path"] for entry in deleted),
        "extendsPaths": sorted(set(extends_paths)),
        "packageGlobs": package_globs,
        "rule": "frozen-repository-discovery-v1",
        "sourcePathCount": len(archive_metadata),
        "sourcePathsSha256": _sha(_canonical(manifest_paths)),
    }
    return {
        "archiveKind": ARCHIVE_KIND,
        "baselineHead": baseline_head,
        "branch": branch,
        "deletedInputs": deleted,
        "denominatorSha256": _sha(_canonical(archive_metadata)),
        "discovery": discovery,
        "entries": entries,
        "porcelainSha256": pre_digests["porcelainSha256"],
        "scanCommand": SCAN_COMMAND,
        "scanConfig": None,
        "schemaVersion": SCHEMA_VERSION,
        "stagedDiffSha256": pre_digests["stagedDiffSha256"],
        "status": status,
        "statusSha256": pre_digests["statusSha256"],
        "toolVersion": tool_version,
    }


def _build_archive(descriptors: list[_FileDescriptor]) -> dict[str, Any]:
    """Composes the base64-per-entry archive body for the snapshot producer."""
    return {
        "archiveKind": ARCHIVE_KIND,
        "encoding": ARCHIVE_ENCODING,
        "entries": _archive_entries(descriptors),
        "schemaVersion": SCHEMA_VERSION,
    }


def _r0_entry(descriptor: _FileDescriptor, *, include_content: bool) -> dict[str, Any]:
    """Projects one rich descriptor into the accepted R0 v1 entry contract."""
    entry: dict[str, Any] = {
        "mode": "100644" if descriptor.mode == "120000" else descriptor.mode,
        "path": descriptor.path,
        "sha256": descriptor.sha256,
        "size": descriptor.size,
        "state": "tracked" if descriptor.state == "deleted" else descriptor.state,
    }
    if include_content:
        entry["contentBase64"] = base64.b64encode(descriptor.content or b"").decode("ascii")
        return {key: entry[key] for key in (
            "contentBase64", "mode", "path", "sha256", "size", "state"
        )}
    return entry


def _build_r0_artifacts(
    descriptors: list[_FileDescriptor],
    deleted: list[_FileDescriptor],
    baseline_head: str,
    branch: str,
    tool_version: str,
    pre_digests: dict[str, str],
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Builds archive and manifest artifacts accepted by the unchanged R0 validator."""
    all_descriptors = sorted([*descriptors, *deleted], key=lambda item: item.path)
    archive_entries = [_r0_entry(item, include_content=True) for item in all_descriptors]
    metadata = [_r0_entry(item, include_content=False) for item in all_descriptors]
    paths = [entry["path"] for entry in metadata]
    config_paths = [path for path in paths if not path.endswith(CANDIDATE_EXTENSIONS)]
    denominator = _sha(_canonical(metadata))
    archive = {
        "archiveKind": ARCHIVE_KIND,
        "encoding": ARCHIVE_ENCODING,
        "entries": archive_entries,
        "schemaVersion": R0_SCHEMA_VERSION,
    }
    manifest = {
        "baselineHead": baseline_head,
        "branch": branch,
        "denominatorSha256": denominator,
        "discovery": {
            "candidateExtensions": list(CANDIDATE_EXTENSIONS),
            "configPaths": config_paths,
            "rule": "frozen-repository-discovery-v1",
            "sourcePathCount": len(paths),
            "sourcePathsSha256": _sha(_canonical(paths)),
        },
        "entries": metadata,
        "porcelainSha256": pre_digests["porcelainSha256"],
        "scanCommand": SCAN_COMMAND,
        "scanConfig": None,
        "schemaVersion": R0_SCHEMA_VERSION,
        "stagedDiffSha256": pre_digests["stagedDiffSha256"],
        "statusSha256": pre_digests["statusSha256"],
        "toolVersion": tool_version,
    }
    return archive, manifest


def _r0_state_body(state: dict[str, Any]) -> dict[str, Any]:
    """Projects a rich state capture into the accepted R0 state-artifact schema."""
    return {
        "porcelain": state["porcelain"],
        "schemaVersion": R0_SCHEMA_VERSION,
        "stagedDiff": state["stagedDiff"],
        "status": state["status"],
    }


def _state_ref(state: dict[str, Any]) -> dict[str, Any]:
    """Builds the preScan/postScan artifact reference for the R0 projection."""
    return {
        "denominatorSha256": state["denominatorSha256"],
        "porcelainSha256": state["porcelainSha256"],
        "stagedDiffSha256": state["stagedDiffSha256"],
        "stateArtifact": state["stateArtifactRef"],
        "statusSha256": state["statusSha256"],
    }


def _r0_projection(
    archive_ref: dict[str, Any],
    manifest_ref: dict[str, Any],
    manifest_body: dict[str, Any],
    pre_state: dict[str, Any],
    post_state: dict[str, Any],
) -> dict[str, Any]:
    """Returns the v1 ``sourceSnapshot`` body consumed by the R0 validator."""
    return {
        "archive": archive_ref,
        "baselineHead": manifest_body["baselineHead"],
        "branch": manifest_body["branch"],
        "manifest": manifest_ref,
        "postScan": _state_ref(post_state),
        "preScan": _state_ref(pre_state),
        "scanCommand": manifest_body["scanCommand"],
        "scanConfig": manifest_body["scanConfig"],
        "toolVersion": manifest_body["toolVersion"],
    }


def _prepare_output(output: Path) -> None:
    """Removes stale output files without creating the directory."""
    if output.exists():
        for child in output.iterdir():
            if child.is_file():
                child.unlink()
            else:
                raise SnapshotError(
                    f"output directory {output} contains non-file entries; aborting"
                )


def _ensure_output_directory(output: Path) -> None:
    """Creates the output directory after all pre/post checks have passed."""
    output.mkdir(parents=True, exist_ok=True)


def _build_package_globs(worktree_root: Path) -> list[str]:
    """Returns the pnpm workspace package glob patterns declared in the repository."""
    workspace_path = worktree_root / "pnpm-workspace.yaml"
    if not workspace_path.is_file() or workspace_path.is_symlink():
        return []
    try:
        return _resolve_package_globs(
            {}, {"pnpm-workspace.yaml": _read_jsonc(workspace_path)}
        )
    except (OSError, ValueError):
        return []


def _load_scanner_inputs(
    repo: Path,
    worktree_root: Path,
    tracked: set[str],
    package_globs: list[str],
) -> tuple[
    list[_FileDescriptor],
    list[_FileDescriptor],
    dict[str, dict[str, Any]],
    set[str],
]:
    """Loads every scanner-input descriptor in deterministic order."""
    descriptors, deleted, configs, symlinks = _build_scanner_input_index(
        worktree_root,
        tracked,
        package_globs,
    )
    return descriptors, deleted, configs, symlinks


def _capture_denominator(
    repo: Path,
) -> tuple[
    list[_FileDescriptor],
    list[_FileDescriptor],
    dict[str, dict[str, Any]],
    set[str],
    list[str],
]:
    """Discovers and hashes the complete live scanner-input denominator once."""
    tracked = _git_tracked_paths(repo)
    package_globs = _build_package_globs(repo)
    descriptors, deleted, configs, extends_targets = _load_scanner_inputs(
        repo, repo, tracked, package_globs
    )
    return descriptors, deleted, configs, extends_targets, package_globs


def _denominator_metadata(
    descriptors: list[_FileDescriptor],
    deleted: list[_FileDescriptor],
) -> list[dict[str, Any]]:
    """Returns canonical full-denominator metadata including deleted inputs."""
    return _manifest_entries([*descriptors, *deleted])


def produce_snapshot(
    repo_root: Path | str,
    output_directory: Path | str,
    *,
    tool_version: str = EXPECTED_TOOL_VERSION,
    before_post_check: Callable[[], None] | None = None,
    scan_runner: Callable[[Path], dict[str, Any]] | None = None,
    worktree_root: Path | str | None = None,
) -> SnapshotArtifacts:
    """Produces a replayable source snapshot for the dirty shared worktree.

    @param repo_root The shared master worktree root (must be exactly one).
    @param output_directory Directory to write the snapshot bundle into.
    @param tool_version Tool identity recorded in the manifest.
    @param before_post_check Optional drift hook used by the concurrent-drift test.
    @param scan_runner Optional canonical scan executor run between the state captures.
    @param worktree_root Override for the scanner walk root (defaults to ``repo_root``).
    @returns The :class:`SnapshotArtifacts` describing the bundle and R0 projection.
    @raises SnapshotDriftError When pre/post drift is detected.
    @raises SnapshotError When the worktree invariant or inputs violate the contract.
    """
    repo = Path(repo_root).resolve(strict=False)
    worktree_root_path = Path(worktree_root).resolve(strict=False) if worktree_root is not None else repo
    output = Path(output_directory).resolve(strict=False)
    if output == repo or repo in output.parents:
        raise SnapshotError(
            f"output directory must live outside the repository root: {output}"
        )
    if output.exists() and any(child.is_dir() for child in output.iterdir()):
        raise SnapshotError(
            f"output directory {output} contains subdirectories; refusing to clear"
        )
    if worktree_root_path != repo:
        raise SnapshotError(
            "scanner root must equal the sole Git worktree root: "
            f"scanner={worktree_root_path} gitRoot={repo}"
        )
    _check_worktree_state(repo)
    baseline_head = _git_text(repo, "rev-parse", "HEAD").strip()
    branch = _git_text(repo, "symbolic-ref", "--quiet", "--short", "HEAD").strip()

    # The complete byte/metadata denominator is captured immediately before
    # and after the caller's scan boundary, independently of Git status.
    descriptors, deleted, configs, extends_targets, package_globs = _capture_denominator(repo)
    pre_denominator = _denominator_metadata(descriptors, deleted)
    pre_body, pre_digests = _capture_state(repo)
    scan_result = _validate_scan_result(repo, scan_runner(repo)) if scan_runner is not None else None
    if before_post_check is not None:
        before_post_check()
    post_body, post_digests = _capture_state(repo)
    post_descriptors, post_deleted, _, _, _ = _capture_denominator(repo)
    post_denominator = _denominator_metadata(post_descriptors, post_deleted)
    post_head = _git_text(repo, "rev-parse", "HEAD").strip()
    post_branch = _git_text(repo, "symbolic-ref", "--quiet", "--short", "HEAD").strip()
    if post_head != baseline_head or post_branch != branch:
        raise SnapshotDriftError(
            "concurrent baseline HEAD or branch drift detected"
        )
    if pre_denominator != post_denominator:
        pre_entries = {entry["path"]: entry for entry in pre_denominator}
        post_entries = {entry["path"]: entry for entry in post_denominator}
        pre_only = sorted(set(pre_entries) - set(post_entries))
        post_only = sorted(set(post_entries) - set(pre_entries))
        changed = sorted(
            path for path in set(pre_entries) & set(post_entries)
            if pre_entries[path] != post_entries[path]
        )
        raise SnapshotDriftError(
            "concurrent scanner-input path, metadata, or content drift detected: "
            f"preOnly={pre_only} postOnly={post_only} changed={changed}"
        )
    if (
        pre_digests["porcelainSha256"] != post_digests["porcelainSha256"]
        or pre_digests["stagedDiffSha256"] != post_digests["stagedDiffSha256"]
        or pre_digests["statusSha256"] != post_digests["statusSha256"]
    ):
        raise SnapshotDriftError(
            "concurrent source status or staged-diff drift detected"
        )

    extends_paths = sorted(extends_targets)
    build_graph_config_paths = sorted(
        descriptor.path for descriptor in descriptors
        if descriptor.absolute.name in BUILD_GRAPH_CONFIG_NAMES
    )
    status = pre_body["status"]
    manifest_body = _build_manifest(
        descriptors,
        deleted,
        extends_paths,
        build_graph_config_paths,
        package_globs,
        baseline_head,
        branch,
        tool_version,
        pre_digests,
        status,
    )
    archive_body = _build_archive([*descriptors, *deleted])
    r0_archive_body, r0_manifest_body = _build_r0_artifacts(
        descriptors,
        deleted,
        baseline_head,
        branch,
        tool_version,
        pre_digests,
    )
    pre_state = {**pre_body, "denominatorSha256": manifest_body["denominatorSha256"], **pre_digests}
    post_state = {**post_body, "denominatorSha256": manifest_body["denominatorSha256"], **post_digests}
    pre_state["denominatorSha256"] = manifest_body["denominatorSha256"]
    post_state["denominatorSha256"] = manifest_body["denominatorSha256"]
    _prepare_output(output)
    _ensure_output_directory(output)
    archive_ref = _write_json(output / "snapshot.archive.json", archive_body)
    manifest_ref = _write_json(output / "snapshot.manifest.json", manifest_body)
    pre_state["stateArtifactRef"] = _write_json(output / "snapshot.pre-state.json", pre_state)
    post_state["stateArtifactRef"] = _write_json(output / "snapshot.post-state.json", post_state)
    r0_archive_ref = _write_json(output / "snapshot.r0.archive.json", r0_archive_body)
    r0_manifest_ref = _write_json(output / "snapshot.r0.manifest.json", r0_manifest_body)
    r0_pre_state = {
        **pre_state,
        "denominatorSha256": r0_manifest_body["denominatorSha256"],
        "stateArtifactRef": _write_json(
            output / "snapshot.r0.pre-state.json", _r0_state_body(pre_state)
        ),
    }
    r0_post_state = {
        **post_state,
        "denominatorSha256": r0_manifest_body["denominatorSha256"],
        "stateArtifactRef": _write_json(
            output / "snapshot.r0.post-state.json", _r0_state_body(post_state)
        ),
    }
    if scan_result is not None:
        _write_json(
            output / "snapshot.scan.json",
            {
                **scan_result,
                "postStateArtifact": post_state["stateArtifactRef"],
                "preStateArtifact": pre_state["stateArtifactRef"],
            },
        )
    source_snapshot = _r0_projection(
        r0_archive_ref,
        r0_manifest_ref,
        r0_manifest_body,
        r0_pre_state,
        r0_post_state,
    )
    return SnapshotArtifacts(
        root=repo,
        output_directory=output,
        manifest=manifest_body,
        archive=archive_body,
        r0_manifest=r0_manifest_body,
        r0_archive=r0_archive_body,
        pre_state=pre_state,
        post_state=post_state,
        source_snapshot=source_snapshot,
    )


def produce_scan_bracketed_snapshot(
    repo_root: Path | str,
    output_directory: Path | str,
    *,
    tool_version: str = EXPECTED_TOOL_VERSION,
    before_post_check: Callable[[], None] | None = None,
    scan_runner: Callable[[Path], dict[str, Any]] | None = None,
) -> SnapshotArtifacts:
    """Produces a snapshot only after a successful canonical scan in its stable window."""
    return produce_snapshot(
        repo_root,
        output_directory,
        tool_version=tool_version,
        before_post_check=before_post_check,
        scan_runner=scan_runner or _run_canonical_scan,
    )


def _decode_archive_entry(entry: dict[str, Any]) -> bytes:
    """Decodes the base64 content of one archive entry."""
    if not isinstance(entry, dict):
        raise SnapshotValidationError("archive entry must be a dict")
    content = entry.get("contentBase64")
    if not isinstance(content, str):
        raise SnapshotValidationError("archive entry missing base64 content")
    return base64.b64decode(content, validate=True)


def replay_archive(archive: dict[str, Any]) -> dict[str, bytes]:
    """Replays one archive and returns a ``path -> bytes`` map."""
    if not isinstance(archive, dict):
        raise SnapshotValidationError("archive must be a dict")
    if set(archive) != {"archiveKind", "encoding", "entries", "schemaVersion"}:
        raise SnapshotValidationError("archive schema contains missing or unknown fields")
    if archive.get("archiveKind") != ARCHIVE_KIND:
        raise SnapshotValidationError("archiveKind must be source-snapshot")
    if archive.get("encoding") != ARCHIVE_ENCODING:
        raise SnapshotValidationError("encoding must be base64-per-entry")
    if archive.get("schemaVersion") != SCHEMA_VERSION:
        raise SnapshotValidationError("archive schemaVersion mismatch")
    entries = archive.get("entries")
    if not isinstance(entries, list) or not entries:
        raise SnapshotValidationError("archive entries must be a non-empty list")
    replay: dict[str, bytes] = {}
    for entry in entries:
        if not isinstance(entry, dict) or set(entry) != {
            "contentBase64", "kind", "mode", "path", "resolvedTargetPath",
            "sha256", "size", "state", "symlinkTarget",
        }:
            raise SnapshotValidationError("archive entry schema contains missing or unknown fields")
        path = _normalize_repo_path(entry.get("path", ""))
        if path in replay:
            raise SnapshotValidationError(f"duplicate archive entry path: {path}")
        state = entry.get("state")
        kind = entry.get("kind")
        mode = entry.get("mode")
        size = entry.get("size")
        sha = entry.get("sha256")
        if kind not in {"file", "symlink"}:
            raise SnapshotValidationError(f"unsupported archive entry kind: {kind!r}")
        if mode not in {"100644", "100755", "120000"}:
            raise SnapshotValidationError(f"unsupported archive entry mode: {mode!r}")
        if state not in {"tracked", "untracked", "deleted"}:
            raise SnapshotValidationError(f"unsupported archive entry state: {state!r}")
        if not isinstance(size, int) or size < 0:
            raise SnapshotValidationError("archive entry size must be a non-negative integer")
        if not (isinstance(sha, str) and len(sha) == 64 and all(c in "0123456789abcdef" for c in sha)):
            raise SnapshotValidationError("archive entry sha256 must be a 64-char hex string")
        symlink_target = entry.get("symlinkTarget")
        resolved_target = entry.get("resolvedTargetPath")
        if kind == "symlink":
            if mode != "120000" or not isinstance(symlink_target, str) or not isinstance(resolved_target, str):
                raise SnapshotValidationError("symlink archive metadata is incomplete")
            _normalize_repo_path(resolved_target)
        elif mode == "120000" or symlink_target is not None or resolved_target is not None:
            raise SnapshotValidationError("regular archive entry has symlink metadata")
        data = _decode_archive_entry(entry)
        if len(data) != size:
            raise SnapshotValidationError(
                f"archive entry {path} size mismatch: declared={size} actual={len(data)}"
            )
        if _sha(data) != sha:
            raise SnapshotValidationError(
                f"archive entry {path} digest mismatch: declared={sha} actual={_sha(data)}"
            )
        replay[path] = data
    return replay


def _read_snapshot_json(output: Path, name: str) -> dict[str, Any]:
    """Reads one required snapshot JSON object or rejects malformed evidence."""
    path = output / name
    if not path.is_file() or path.is_symlink():
        raise SnapshotValidationError(f"snapshot artifact is missing or unsafe: {name}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise SnapshotValidationError(f"snapshot artifact is unreadable: {name}") from error
    if not isinstance(value, dict):
        raise SnapshotValidationError(f"snapshot artifact must be an object: {name}")
    return value


def _artifact_reference(output: Path, name: str) -> dict[str, Any]:
    """Returns the immutable reference for one required on-disk artifact."""
    data = (output / name).read_bytes()
    return {"path": name, "sha256": _sha(data), "size": len(data)}


def _verify_r0_projection_artifacts(
    output: Path, archive: dict[str, Any], manifest: dict[str, Any]
) -> None:
    """Verifies the complete R0 projection is exactly derived from the rich bundle."""
    r0_entries = [
        {
            "contentBase64": entry["contentBase64"],
            "mode": "100644" if entry["mode"] == "120000" else entry["mode"],
            "path": entry["path"],
            "sha256": entry["sha256"],
            "size": entry["size"],
            "state": "tracked" if entry["state"] == "deleted" else entry["state"],
        }
        for entry in archive["entries"]
    ]
    r0_metadata = [
        {key: entry[key] for key in ("mode", "path", "sha256", "size", "state")}
        for entry in r0_entries
    ]
    paths = [entry["path"] for entry in r0_metadata]
    expected_archive = {
        "archiveKind": ARCHIVE_KIND,
        "encoding": ARCHIVE_ENCODING,
        "entries": r0_entries,
        "schemaVersion": R0_SCHEMA_VERSION,
    }
    expected_manifest = {
        "baselineHead": manifest["baselineHead"],
        "branch": manifest["branch"],
        "denominatorSha256": _sha(_canonical(r0_metadata)),
        "discovery": {
            "candidateExtensions": list(CANDIDATE_EXTENSIONS),
            "configPaths": [path for path in paths if not path.endswith(CANDIDATE_EXTENSIONS)],
            "rule": "frozen-repository-discovery-v1",
            "sourcePathCount": len(paths),
            "sourcePathsSha256": _sha(_canonical(paths)),
        },
        "entries": r0_metadata,
        "porcelainSha256": manifest["porcelainSha256"],
        "scanCommand": SCAN_COMMAND,
        "scanConfig": None,
        "schemaVersion": R0_SCHEMA_VERSION,
        "stagedDiffSha256": manifest["stagedDiffSha256"],
        "statusSha256": manifest["statusSha256"],
        "toolVersion": manifest["toolVersion"],
    }
    if _read_snapshot_json(output, "snapshot.r0.archive.json") != expected_archive:
        raise SnapshotValidationError("R0 archive does not match the rich bundle projection")
    if _read_snapshot_json(output, "snapshot.r0.manifest.json") != expected_manifest:
        raise SnapshotValidationError("R0 manifest does not match the rich bundle projection")


def _verify_state_artifacts(output: Path, manifest: dict[str, Any]) -> None:
    """Verifies rich and R0 pre/post state artifacts against the manifest and each other."""
    rich_keys = {
        "denominatorSha256", "porcelain", "porcelainSha256", "schemaVersion",
        "stagedDiff", "stagedDiffSha256", "status", "statusSha256",
    }
    rich_states = [
        _read_snapshot_json(output, "snapshot.pre-state.json"),
        _read_snapshot_json(output, "snapshot.post-state.json"),
    ]
    for state in rich_states:
        if set(state) != rich_keys or state["schemaVersion"] != SCHEMA_VERSION:
            raise SnapshotValidationError("rich state artifact schema is invalid")
        if state["denominatorSha256"] != manifest["denominatorSha256"]:
            raise SnapshotValidationError("rich state denominator does not match manifest")
        if state["porcelain"] != state["status"]:
            raise SnapshotValidationError("rich state porcelain and status differ")
        if state["porcelainSha256"] != _sha(state["porcelain"].encode("utf-8")):
            raise SnapshotValidationError("rich state porcelain digest is invalid")
        if state["statusSha256"] != _sha(state["status"].encode("utf-8")):
            raise SnapshotValidationError("rich state status digest is invalid")
        if state["stagedDiffSha256"] != _sha(state["stagedDiff"].encode("utf-8")):
            raise SnapshotValidationError("rich state staged diff digest is invalid")
        for key in ("porcelainSha256", "statusSha256", "stagedDiffSha256"):
            if state[key] != manifest[key]:
                raise SnapshotValidationError("rich state digest does not match manifest")
    if rich_states[0] != rich_states[1]:
        raise SnapshotValidationError("rich pre and post state artifacts differ")
    r0_states = [
        _read_snapshot_json(output, "snapshot.r0.pre-state.json"),
        _read_snapshot_json(output, "snapshot.r0.post-state.json"),
    ]
    for rich_state, r0_state in zip(rich_states, r0_states, strict=True):
        if r0_state != _r0_state_body(rich_state):
            raise SnapshotValidationError("R0 state artifact does not match rich state projection")


def _verify_scan_artifact(output: Path) -> None:
    """Verifies a scan record binds the exact on-disk pre and post state artifacts."""
    record = _read_snapshot_json(output, "snapshot.scan.json")
    required = {
        "command", "exitCode", "graph", "postStateArtifact", "preStateArtifact",
        "schemaVersion", "stderr", "stdout",
    }
    if set(record) != required or record["schemaVersion"] != 1:
        raise SnapshotValidationError("scan artifact schema is invalid")
    if record["command"] != SCAN_COMMAND or record["exitCode"] != 0:
        raise SnapshotValidationError("scan artifact does not record a successful canonical scan")
    if not isinstance(record["stdout"], str) or not isinstance(record["stderr"], str):
        raise SnapshotValidationError("scan artifact output must be text")
    graph = record["graph"]
    if not isinstance(graph, dict) or set(graph) != {"path", "sha256", "size"}:
        raise SnapshotValidationError("scan graph reference schema is invalid")
    if graph["path"] != "graph.db" or not isinstance(graph["size"], int) or graph["size"] < 0:
        raise SnapshotValidationError("scan graph reference is invalid")
    if not isinstance(graph["sha256"], str) or not re.fullmatch(r"[0-9a-f]{64}", graph["sha256"]):
        raise SnapshotValidationError("scan graph digest is invalid")
    if record["preStateArtifact"] != _artifact_reference(output, "snapshot.pre-state.json"):
        raise SnapshotValidationError("scan artifact pre-state reference is invalid")
    if record["postStateArtifact"] != _artifact_reference(output, "snapshot.post-state.json"):
        raise SnapshotValidationError("scan artifact post-state reference is invalid")


def verify_snapshot(output_directory: Path | str) -> dict[str, bytes]:
    """Replays and verifies a snapshot bundle on disk, including every state artifact."""
    output = Path(output_directory)
    archive = _read_snapshot_json(output, "snapshot.archive.json")
    manifest = _read_snapshot_json(output, "snapshot.manifest.json")
    if set(manifest) != {
        "archiveKind", "baselineHead", "branch", "deletedInputs",
        "denominatorSha256", "discovery", "entries", "porcelainSha256",
        "scanCommand", "scanConfig", "schemaVersion", "stagedDiffSha256",
        "status", "statusSha256", "toolVersion",
    } or manifest.get("schemaVersion") != SCHEMA_VERSION:
        raise SnapshotValidationError("manifest schema contains missing or unknown fields")
    replay = replay_archive(archive)
    manifest_entries = manifest.get("entries", [])
    if len(replay) != len(manifest_entries):
        raise SnapshotValidationError(
            f"replay entry count {len(replay)} != manifest {len(manifest_entries)}"
        )
    archive_metadata = [
        {key: entry[key] for key in (
            "kind", "mode", "path", "resolvedTargetPath", "sha256", "size",
            "state", "symlinkTarget",
        )}
        for entry in archive["entries"]
    ]
    if archive_metadata != manifest_entries:
        raise SnapshotValidationError("archive metadata does not match manifest entries")
    expected_denominator = _sha(_canonical(manifest_entries))
    if expected_denominator != manifest.get("denominatorSha256"):
        raise SnapshotValidationError("manifest denominator does not match entries")
    _verify_r0_projection_artifacts(output, archive, manifest)
    _verify_state_artifacts(output, manifest)
    if (output / "snapshot.scan.json").exists():
        _verify_scan_artifact(output)
    return replay


def verify_scan_bracketed_snapshot(output_directory: Path | str) -> dict[str, bytes]:
    """Verifies a snapshot bundle and requires a bound canonical scan record."""
    output = Path(output_directory)
    replay = verify_snapshot(output)
    if not (output / "snapshot.scan.json").is_file():
        raise SnapshotValidationError("scan-bracketed snapshot is missing snapshot.scan.json")
    _verify_scan_artifact(output)
    return replay


def publish_scan_bracketed_snapshot(
    repo_root: Path | str,
    source_directory: Path | str,
    relative_destination: str,
) -> dict[str, Any]:
    """Publishes one verified external scan bundle under its Measure track path."""
    repo = Path(repo_root).resolve(strict=False)
    source = Path(source_directory).resolve(strict=False)
    destination_path = _normalize_repo_path(relative_destination)
    if not destination_path.startswith("measure/tracks/"):
        raise SnapshotError("published snapshot evidence must live under measure/tracks")
    if source == repo or repo in source.parents:
        raise SnapshotError("source snapshot bundle must live outside the repository")
    destination = repo / destination_path
    if destination.exists() or not _is_safely_within_root(destination, repo):
        raise SnapshotError("published snapshot destination is unsafe or already exists")
    replay = verify_scan_bracketed_snapshot(source)
    required = {
        "snapshot.archive.json", "snapshot.manifest.json", "snapshot.pre-state.json",
        "snapshot.post-state.json", "snapshot.r0.archive.json",
        "snapshot.r0.manifest.json", "snapshot.r0.pre-state.json",
        "snapshot.r0.post-state.json", "snapshot.scan.json",
    }
    if not source.is_dir() or {child.name for child in source.iterdir()} != required:
        raise SnapshotError("source snapshot bundle has unexpected artifact paths")
    destination.mkdir(parents=True, exist_ok=False)
    for name in sorted(required):
        child = source / name
        if not child.is_file() or child.is_symlink():
            raise SnapshotError(f"source snapshot artifact is unsafe: {name}")
        _write_atomic(destination / name, child.read_bytes())
    verify_scan_bracketed_snapshot(destination)
    return {
        "artifactCount": len(required),
        "denominatorSha256": _read_snapshot_json(destination, "snapshot.manifest.json")["denominatorSha256"],
        "path": destination_path,
        "replayEntryCount": len(replay),
    }


__all__ = [
    "ARCHIVE_ENCODING",
    "ARCHIVE_KIND",
    "CANDIDATE_EXTENSIONS",
    "EXPECTED_TOOL_VERSION",
    "R0_SOURCE_SNAPSHOT_KEYS",
    "SCAN_COMMAND",
    "SCHEMA_VERSION",
    "SnapshotArtifacts",
    "SnapshotDriftError",
    "SnapshotError",
    "SnapshotValidationError",
    "produce_scan_bracketed_snapshot",
    "publish_scan_bracketed_snapshot",
    "produce_snapshot",
    "replay_archive",
    "verify_scan_bracketed_snapshot",
    "verify_snapshot",
]
