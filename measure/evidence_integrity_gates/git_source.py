"""Narrow Git adapter for resolving exact cited repository bytes."""

from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path


class GitSourceError(RuntimeError):
    """Raised with a stable claim reason code when source resolution fails."""

    def __init__(self, code: str, message: str) -> None:
        """Initializes a source-resolution failure.

        @param code Stable reason code for the rejected locator.
        @param message Diagnostic message that does not replace source evidence.
        """
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class ResolvedSource:
    """Exact Git bytes selected by a validated source locator."""

    revision: str
    path: str
    line_start: int
    line_end: int
    cited_bytes: bytes


class GitSourceAdapter:
    """Resolves reachable committed files and line ranges through the Git CLI."""

    def __init__(self, repository_root: Path) -> None:
        """Creates an adapter rooted at a Git worktree.

        @param repository_root Repository whose object database is authoritative.
        @throws GitSourceError When repository_root is not a Git worktree.
        """
        self._root = Path(repository_root).resolve()
        result = self._run("rev-parse", "--is-inside-work-tree")
        if result.returncode != 0 or result.stdout.strip() != b"true":
            raise GitSourceError("REVISION_UNREACHABLE", "repository root is not a Git worktree")

    def _run(self, *args: str) -> subprocess.CompletedProcess[bytes]:
        """Runs Git without a shell and returns its captured process result.

        @param args Git arguments.
        @returns Captured completed process.
        """
        return subprocess.run(
            ("git", *args),
            cwd=self._root,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

    def _resolve_reachable_commit(self, revision: str) -> str:
        """Resolves a full commit hash and proves that a ref can reach it.

        @param revision Claimed full commit object ID.
        @returns Canonical full commit object ID.
        @throws GitSourceError When the commit is absent or unreachable from every ref.
        """
        resolved = self._run("rev-parse", "--verify", f"{revision}^{{commit}}")
        if resolved.returncode != 0:
            raise GitSourceError("REVISION_UNREACHABLE", "claimed revision cannot be resolved as a commit")
        canonical = resolved.stdout.decode("ascii").strip()
        containing_refs = self._run("for-each-ref", "--contains", canonical, "--format=%(refname)")
        if containing_refs.returncode != 0 or not containing_refs.stdout.strip():
            raise GitSourceError("REVISION_UNREACHABLE", "claimed revision is not reachable from a repository ref")
        return canonical

    def resolve(self, revision: str, path: str, line_start: int, line_end: int) -> ResolvedSource:
        """Loads exact cited lines from a reachable committed blob.

        @param revision Claimed full Git commit hash.
        @param path Claimed repository-relative file path.
        @param line_start First cited line, inclusive.
        @param line_end Last cited line, inclusive.
        @returns Canonical revision and exact selected bytes.
        @throws GitSourceError When the revision, file type, path, or range cannot resolve.
        """
        canonical = self._resolve_reachable_commit(revision)
        object_name = f"{canonical}:{path}"
        object_type = self._run("cat-file", "-t", object_name)
        if object_type.returncode != 0:
            raise GitSourceError("SOURCE_FILE_NOT_FOUND", "claimed file is absent at the claimed revision")
        if object_type.stdout.strip() == b"tree":
            raise GitSourceError("DIRECTORY_LOCATOR_REJECTED", "a source locator must name a file, not a directory")
        if object_type.stdout.strip() != b"blob":
            raise GitSourceError("SOURCE_FILE_NOT_FOUND", "claimed locator is not a file blob")
        source = self._run("show", object_name)
        if source.returncode != 0:
            raise GitSourceError("SOURCE_FILE_NOT_FOUND", "claimed file bytes cannot be loaded")
        lines = source.stdout.splitlines(keepends=True)
        if line_start < 1 or line_end < line_start or line_end > len(lines):
            raise GitSourceError("LINE_RANGE_INVALID", "claimed line range is outside the committed file")
        return ResolvedSource(canonical, path, line_start, line_end, b"".join(lines[line_start - 1 : line_end]))

    def resolve_blob_bytes(self, revision: str, path: str) -> bytes:
        """Returns the full committed blob bytes at a reachable revision.

        Validates that the revision is a reachable commit, ensures the
        object at that path is a file blob, and returns its exact bytes.
        This is the immutable-source primitive for allowed-input binding:
        bytes are resolved from Git object storage, never the worktree.

        @param revision Git commit object ID whose tree is authoritative.
        @param path Repository-relative file path within that tree.
        @returns Exact committed file bytes.
        @throws GitSourceError When the revision, file type, or path cannot resolve.
        """
        canonical = self._resolve_reachable_commit(revision)
        object_name = f"{canonical}:{path}"
        object_type = self._run("cat-file", "-t", object_name)
        if object_type.returncode != 0:
            raise GitSourceError("INPUT_PATH_UNRESOLVABLE_AT_REVISION", "claimed input file is absent at the claimed revision")
        if object_type.stdout.strip() == b"tree":
            raise GitSourceError("INPUT_PATH_UNRESOLVABLE_AT_REVISION", "allowed input must name a file blob, not a directory")
        if object_type.stdout.strip() != b"blob":
            raise GitSourceError("INPUT_PATH_UNRESOLVABLE_AT_REVISION", "claimed locator is not a file blob")
        source = self._run("show", object_name)
        if source.returncode != 0:
            raise GitSourceError("INPUT_PATH_UNRESOLVABLE_AT_REVISION", "claimed file bytes cannot be loaded")
        return source.stdout
