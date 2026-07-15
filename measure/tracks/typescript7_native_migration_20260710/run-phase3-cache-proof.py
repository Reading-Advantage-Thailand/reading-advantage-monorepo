#!/usr/bin/env python3
"""Prove Turbo cache invalidation for the TypeScript 6/7 routing contract."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / "typescript7_native_migration_20260710"
EVIDENCE_ROOT = TRACK_DIR / "evidence" / "phase-3i-cache"
RESULT_PATH = TRACK_DIR / "phase-3i-cache-invalidation-result.json"
TARGET_TASK_ID_PREFIX = "@reading-advantage/types#"
SUMMARY_PATTERN = re.compile(r"Summary:\s+(?P<path>[^\s\"]+\.json)")


def _now() -> str:
    """Return an ISO-8601 UTC timestamp for one evidence record.

    Returns:
        Timezone-aware timestamp string.
    """
    return datetime.now(timezone.utc).isoformat()


def _sha256_file(path: Path) -> str:
    """Return the SHA-256 digest of one required regular file.

    Args:
        path: File whose immutable bytes are recorded.

    Returns:
        Lowercase content digest.

    Raises:
        AssertionError: When the file does not exist.
    """
    if not path.is_file():
        raise AssertionError(f"missing required file: {path}")
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _run(command: list[str], cwd: Path, environment: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    """Run a command without masking a non-zero exit status.

    Args:
        command: Command argument vector.
        cwd: Working directory for the command.
        environment: Optional explicit environment additions.

    Returns:
        Captured text result.
    """
    return subprocess.run(
        command,
        cwd=cwd,
        env={**os.environ, **(environment or {})},
        check=False,
        capture_output=True,
        text=True,
    )


def _git_output(*arguments: str) -> str:
    """Run one Git command in the source worktree and return stdout.

    Args:
        *arguments: Arguments following the Git executable.

    Returns:
        Decoded command stdout.

    Raises:
        AssertionError: When the requested Git evidence cannot be read.
    """
    result = _run(["git", *arguments], REPO_ROOT)
    if result.returncode != 0:
        raise AssertionError(f"git evidence command failed: {' '.join(arguments)}")
    return result.stdout


def _assert_clean_source() -> str:
    """Reject a cache proof when tracked source edits could contaminate its matrix.

    Returns:
        The clean source status string.

    Raises:
        AssertionError: When tracked or untracked source changes are present.
    """
    status = _git_output("status", "--short")
    if status:
        raise AssertionError(f"Phase 3i requires a clean source worktree, found: {status}")
    return status


def _provenance() -> dict[str, Any]:
    """Capture the source revision and compiler-routing inputs for the cache proof.

    Returns:
        Immutable input identity record.
    """
    paths = {
        "package_json": REPO_ROOT / "package.json",
        "pnpm_lock": REPO_ROOT / "pnpm-lock.yaml",
        "pnpm_workspace": REPO_ROOT / "pnpm-workspace.yaml",
        "turbo_json": REPO_ROOT / "turbo.json",
        "compiler_identity": REPO_ROOT / "scripts" / "typescript-compiler-identity.json",
        "ts7_wrapper": REPO_ROOT / "scripts" / "run-ts7-check-types.mjs",
        "shared_tsconfig": REPO_ROOT / "packages" / "config" / "tsconfig" / "base.json",
        "target_tsconfig": REPO_ROOT / "packages" / "types" / "tsconfig.json",
        "ts6_tsc": REPO_ROOT / "node_modules" / "typescript" / "bin" / "tsc",
        "ts7_tsc": REPO_ROOT / "node_modules" / "typescript7" / "bin" / "tsc",
    }
    return {
        "revision": _git_output("rev-parse", "HEAD").strip(),
        "sha256": {name: _sha256_file(path) for name, path in paths.items()},
        "typescript6": _run([str(paths["ts6_tsc"]), "--version"], REPO_ROOT).stdout.strip(),
        "typescript7": _run([str(paths["ts7_tsc"]), "--version"], REPO_ROOT).stdout.strip(),
    }


def _write_mutation(path: Path, original: bytes, replacement: bytes) -> None:
    """Write one asserted temporary cache-key perturbation inside a disposable worktree.

    Args:
        path: Disposable-worktree file to modify.
        original: Exact original bytes required before mutation.
        replacement: New valid bytes used only for the following Turbo invocation.

    Raises:
        AssertionError: When the worktree file differs from the expected original bytes.
    """
    if path.read_bytes() != original:
        raise AssertionError(f"unexpected disposable worktree content before mutation: {path}")
    path.write_bytes(replacement)


def _restore_mutation(path: Path, original: bytes) -> None:
    """Restore an exact temporary mutation and verify its original bytes.

    Args:
        path: Disposable-worktree file to restore.
        original: Exact bytes captured before the mutation.
    """
    path.write_bytes(original)
    if path.read_bytes() != original:
        raise AssertionError(f"failed to restore disposable worktree file: {path}")


def _summary_for_task(stdout: str, worktree: Path, task: str, started_at_ns: int) -> tuple[dict[str, Any], Path, str]:
    """Load the fresh Turbo summary and selected task record for one invocation.

    Args:
        stdout: Turbo command stdout containing the emitted summary path.
        worktree: Disposable worktree that owns the summary directory.
        task: Turbo task name used to find the required package task record.
        started_at_ns: Timestamp captured immediately before starting Turbo.

    Returns:
        Selected task record, summary path, and summary SHA-256 digest.

    Raises:
        AssertionError: When the emitted summary is stale, untrusted, or lacks the task record.
    """
    matches = list(SUMMARY_PATTERN.finditer(stdout))
    if not matches:
        raise AssertionError("Turbo did not emit a summary path")
    summary_path = Path(matches[-1].group("path")).resolve()
    allowed_root = (worktree / ".turbo" / "runs").resolve()
    try:
        summary_path.relative_to(allowed_root)
    except ValueError as error:
        raise AssertionError(f"Turbo summary escaped disposable worktree: {summary_path}") from error
    if not summary_path.is_file() or summary_path.stat().st_mtime_ns < started_at_ns:
        raise AssertionError(f"Turbo summary is missing or stale: {summary_path}")
    content = summary_path.read_bytes()
    summary = json.loads(content.decode("utf-8"))
    if not isinstance(summary, dict) or not isinstance(summary.get("tasks"), list):
        raise AssertionError(f"Turbo summary has no task list: {summary_path}")
    task_id = f"{TARGET_TASK_ID_PREFIX}{task}"
    selected = next((item for item in summary["tasks"] if item.get("taskId") == task_id), None)
    if not isinstance(selected, dict):
        raise AssertionError(f"Turbo summary omits {task_id}")
    return selected, summary_path, hashlib.sha256(content).hexdigest()


def _run_turbo_sample(
    worktree: Path,
    cache_dir: Path,
    output_dir: Path,
    label: str,
    task: str,
    checkers: int | None,
    expected_cache_status: str,
) -> dict[str, Any]:
    """Run and persist one exact Turbo cache sample for the @types check-type task.

    Args:
        worktree: Disposable worktree that executes the task.
        cache_dir: One preserved isolated Turbo cache directory.
        output_dir: Track evidence directory for raw streams and copied summaries.
        label: Stable sample label describing its cache-key state.
        task: Turbo check-type task name.
        checkers: Native checker count, or None for TypeScript 6 tasks.
        expected_cache_status: Required selected-task cache outcome.

    Returns:
        Machine-readable cache sample record.

    Raises:
        AssertionError: When Turbo fails, emits an untrusted summary, or misses the expected cache state.
    """
    environment = {"TURBO_CONCURRENCY": "1"}
    if checkers is not None:
        environment["TS7_CHECKERS"] = str(checkers)
    command = [
        "node",
        "node_modules/turbo/bin/turbo",
        "run",
        task,
        "--filter=@reading-advantage/types",
        "--concurrency=1",
        "--cache-dir",
        str(cache_dir),
        "--summarize",
        "--output-logs=full",
    ]
    started_at_ns = time.time_ns()
    result = _run(command, worktree, environment)
    prefix = output_dir / label
    prefix.with_suffix(".stdout.log").write_text(result.stdout, encoding="utf-8")
    prefix.with_suffix(".stderr.log").write_text(result.stderr, encoding="utf-8")
    if result.returncode != 0:
        raise AssertionError(f"{label} Turbo exit {result.returncode}")
    task_record, summary_path, summary_sha256 = _summary_for_task(
        result.stdout, worktree, task, started_at_ns
    )
    cache = task_record.get("cache")
    status = cache.get("status") if isinstance(cache, dict) else None
    if status != expected_cache_status:
        raise AssertionError(f"{label} expected cache {expected_cache_status}, observed {status}")
    copied_summary = prefix.with_suffix(".turbo-summary.json")
    shutil.copy2(summary_path, copied_summary)
    return {
        "label": label,
        "task": task,
        "checkers": checkers,
        "command": command,
        "environment": environment,
        "exit_status": result.returncode,
        "task_hash": task_record.get("hash"),
        "cache": cache,
        "summary_path": str(summary_path.relative_to(worktree)),
        "summary_sha256": summary_sha256,
        "stdout_sha256": hashlib.sha256(result.stdout.encode("utf-8")).hexdigest(),
        "stderr_sha256": hashlib.sha256(result.stderr.encode("utf-8")).hexdigest(),
    }


def _replace_once(content: bytes, before: bytes, after: bytes, path: Path) -> bytes:
    """Return a single asserted replacement for an exact cache-identity fixture mutation.

    Args:
        content: Original file bytes.
        before: Required unique substring.
        after: Replacement substring.
        path: File named in any assertion error.

    Returns:
        Mutated file bytes.

    Raises:
        AssertionError: When the expected source fragment is missing or ambiguous.
    """
    if content.count(before) != 1:
        raise AssertionError(f"expected one cache-key fragment in {path}, found {content.count(before)}")
    return content.replace(before, after, 1)


def _run_matrix(worktree: Path, cache_dir: Path, output_dir: Path) -> list[dict[str, Any]]:
    """Run the complete native, compatibility, and rollback miss/hit cache proof matrix.

    Args:
        worktree: Disposable worktree that may receive temporary mutations.
        cache_dir: Shared isolated Turbo cache directory retained across the matrix.
        output_dir: Track evidence directory for every command stream and summary.

    Returns:
        Ordered evidence records for every cache transition.
    """
    records: list[dict[str, Any]] = []

    def sample(label: str, task: str, checkers: int | None, expected: str) -> None:
        records.append(_run_turbo_sample(worktree, cache_dir, output_dir, label, task, checkers, expected))

    compiler_identity = worktree / "scripts" / "typescript-compiler-identity.json"
    wrapper = worktree / "scripts" / "run-ts7-check-types.mjs"
    target_config = worktree / "packages" / "types" / "tsconfig.json"
    shared_config = worktree / "packages" / "config" / "tsconfig" / "base.json"
    originals = {path: path.read_bytes() for path in (compiler_identity, wrapper, target_config, shared_config)}

    sample("native-c1-baseline-miss", "check-types", 1, "MISS")
    sample("native-c1-baseline-hit", "check-types", 1, "HIT")

    _write_mutation(
        compiler_identity,
        originals[compiler_identity],
        _replace_once(
            originals[compiler_identity],
            b'"typescript7": "typescript7@npm:typescript@7.0.2"',
            b'"typescript7": "typescript7@npm:typescript@7.0.3"',
            compiler_identity,
        ),
    )
    sample("native-ts7-alias-miss", "check-types", 1, "MISS")
    _restore_mutation(compiler_identity, originals[compiler_identity])
    sample("native-ts7-alias-restored-hit", "check-types", 1, "HIT")

    for name, path, suffix in (
        ("wrapper", wrapper, b"\n// Phase 3i cache-key perturbation.\n"),
        ("local-tsconfig", target_config, b"\n"),
        ("shared-tsconfig", shared_config, b"\n"),
    ):
        _write_mutation(path, originals[path], originals[path] + suffix)
        sample(f"native-{name}-miss", "check-types", 1, "MISS")
        _restore_mutation(path, originals[path])
        sample(f"native-{name}-restored-hit", "check-types", 1, "HIT")

    sample("native-c2-miss", "check-types", 2, "MISS")
    sample("native-c2-hit", "check-types", 2, "HIT")
    sample("native-c1-return-hit", "check-types", 1, "HIT")

    for task in ("check-types:compat", "check-types:rollback"):
        prefix = task.replace(":", "-")
        sample(f"{prefix}-baseline-miss", task, None, "MISS")
        sample(f"{prefix}-baseline-hit", task, None, "HIT")
        _write_mutation(
            compiler_identity,
            originals[compiler_identity],
            _replace_once(
                originals[compiler_identity],
                b'"typescript6": "typescript@6.0.2"',
                b'"typescript6": "typescript@6.0.3"',
                compiler_identity,
            ),
        )
        sample(f"{prefix}-ts6-alias-miss", task, None, "MISS")
        _restore_mutation(compiler_identity, originals[compiler_identity])
        sample(f"{prefix}-ts6-alias-restored-hit", task, None, "HIT")
        for name, path in (("local-tsconfig", target_config), ("shared-tsconfig", shared_config)):
            _write_mutation(path, originals[path], originals[path] + b"\n")
            sample(f"{prefix}-{name}-miss", task, None, "MISS")
            _restore_mutation(path, originals[path])
            sample(f"{prefix}-{name}-restored-hit", task, None, "HIT")

    _write_mutation(wrapper, originals[wrapper], originals[wrapper] + b"\n// Phase 3i compatibility-scope proof.\n")
    sample("compat-wrapper-unchanged-hit", "check-types:compat", None, "HIT")
    _restore_mutation(wrapper, originals[wrapper])

    return records


def main() -> int:
    """Run the bounded disposable-worktree cache proof and write accepted or rejected evidence.

    Returns:
        Zero for an accepted proof and two for a rejected proof.
    """
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-id", default=datetime.now(timezone.utc).strftime("run-%Y%m%dT%H%M%SZ"))
    arguments = parser.parse_args()
    _assert_clean_source()
    output_dir = EVIDENCE_ROOT / arguments.run_id
    if output_dir.exists():
        raise AssertionError(f"cache-proof evidence directory already exists: {output_dir}")
    output_dir.mkdir(parents=True)
    start = _provenance()
    temp_parent = Path(tempfile.mkdtemp(prefix="ts7-cache-proof-"))
    worktree = temp_parent / "worktree"
    cache_dir = temp_parent / "turbo-cache"
    records: list[dict[str, Any]] = []
    cleanup: dict[str, Any] = {"worktree_removed": False, "cache_removed": False}
    try:
        add = _run(["git", "worktree", "add", "--detach", str(worktree), "HEAD"], REPO_ROOT)
        if add.returncode != 0:
            raise AssertionError(f"cannot create disposable worktree: {add.stderr}")
        install = _run(["pnpm", "install", "--frozen-lockfile"], worktree)
        (output_dir / "install.stdout.log").write_text(install.stdout, encoding="utf-8")
        (output_dir / "install.stderr.log").write_text(install.stderr, encoding="utf-8")
        if install.returncode != 0:
            raise AssertionError(f"disposable worktree frozen install failed: {install.returncode}")
        records = _run_matrix(worktree, cache_dir, output_dir)
        if _run(["git", "diff", "--exit-code"], worktree).returncode != 0:
            raise AssertionError("disposable worktree retained tracked mutations")
        if _run(["git", "diff", "--cached", "--exit-code"], worktree).returncode != 0:
            raise AssertionError("disposable worktree retained staged mutations")
        end = _provenance()
        if start != end:
            raise AssertionError("source provenance changed during disposable cache proof")
        if _run(["git", "diff", "--exit-code"], REPO_ROOT).returncode != 0:
            raise AssertionError("source worktree retained unstaged tracked mutations")
        if _run(["git", "diff", "--cached", "--exit-code"], REPO_ROOT).returncode != 0:
            raise AssertionError("source worktree retained staged tracked mutations")
        result = {
            "schema_version": 1,
            "track": "typescript7_native_migration_20260710",
            "phase": "Phase 3i: live Turbo cache invalidation",
            "status": "accepted",
            "run_id": arguments.run_id,
            "provenance_start": start,
            "provenance_end": end,
            "sample_count": len(records),
            "records": records,
            "source_status_after": _git_output("status", "--short"),
        }
        RESULT_PATH.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        (output_dir / "summary.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        return 0
    except Exception as error:
        failure = {
            "schema_version": 1,
            "track": "typescript7_native_migration_20260710",
            "phase": "Phase 3i: live Turbo cache invalidation",
            "status": "rejected",
            "run_id": arguments.run_id,
            "reason": str(error),
            "provenance_start": start,
            "records": records,
        }
        (output_dir / "summary.json").write_text(json.dumps(failure, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(str(error), file=sys.stderr)
        return 2
    finally:
        if worktree.exists():
            remove = _run(["git", "worktree", "remove", "--force", str(worktree)], REPO_ROOT)
            cleanup["worktree_removed"] = remove.returncode == 0
        shutil.rmtree(cache_dir, ignore_errors=True)
        cleanup["cache_removed"] = not cache_dir.exists()
        shutil.rmtree(temp_parent, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
