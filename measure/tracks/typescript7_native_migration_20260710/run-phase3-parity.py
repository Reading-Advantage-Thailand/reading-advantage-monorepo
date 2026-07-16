#!/usr/bin/env python3
"""Run and persist real TypeScript 6/7 no-emit diagnostic parity evidence."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


# The runner's provenance contract must not be invalidated by bytecode it creates itself.
sys.dont_write_bytecode = True


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / "typescript7_native_migration_20260710"
SURFACE_INVENTORY = TRACK_DIR / "surface-inventory.json"
PARITY_LEDGER = TRACK_DIR / "diagnostic-parity-ledger.json"
TS6_TSC = REPO_ROOT / "node_modules" / "typescript" / "bin" / "tsc"
TS7_TSC = REPO_ROOT / "node_modules" / "typescript7" / "bin" / "tsc"
TS6_MAX_OLD_SPACE_MIB = 3072
NODE_EXECUTABLE = Path(shutil.which("node") or "")


def _now() -> str:
    """Return the current UTC timestamp in ISO-8601 form.

    Returns:
        Timestamp suitable for a machine-readable evidence record.
    """
    return datetime.now(timezone.utc).isoformat()


def _load_config_paths() -> list[str]:
    """Verify the exact tracked tsconfig denominator against the surface inventory.

    Returns:
        Sorted tsconfig paths relative to the repository root.

    Raises:
        AssertionError: When the inventory and live tracked surface differ.
    """
    inventory = json.loads(SURFACE_INVENTORY.read_text(encoding="utf-8"))
    entries = inventory.get("tsconfigs") if isinstance(inventory, dict) else None
    if not isinstance(entries, list):
        raise AssertionError("surface inventory must contain a tsconfigs array")
    paths = [entry.get("path") for entry in entries if isinstance(entry, dict)]
    if len(paths) != 39 or len(set(paths)) != 39 or not all(
        isinstance(path, str) and path for path in paths
    ):
        raise AssertionError("parity requires the exact 39-config denominator")
    tracked = subprocess.run(
        ["git", "ls-files"],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    live_paths = sorted(
        path
        for path in tracked.stdout.splitlines()
        if path.startswith(("apps/", "packages/"))
        and Path(path).name.startswith("tsconfig")
        and path.endswith(".json")
    )
    inventory_paths = sorted(paths)
    if live_paths != inventory_paths:
        raise AssertionError("surface inventory differs from live tracked tsconfig paths")
    return inventory_paths


def _load_ledger() -> tuple[list[dict[str, Any]], bytes]:
    """Load the reviewed TypeScript diagnostic-difference ledger without rewriting it.

    Returns:
        Parsed ledger entries and the exact source bytes used by the parity harness.

    Raises:
        AssertionError: When the ledger is not an array of objects.
    """
    ledger_bytes = PARITY_LEDGER.read_bytes()
    ledger = json.loads(ledger_bytes.decode("utf-8"))
    if not isinstance(ledger, list) or not all(isinstance(entry, dict) for entry in ledger):
        raise AssertionError("diagnostic parity ledger must be an array of objects")
    return ledger, ledger_bytes


def _persist_ledger_snapshot(output_dir: Path, ledger_bytes: bytes) -> dict[str, str]:
    """Copy the exact reviewed diagnostic ledger into this immutable run artifact.

    Args:
        output_dir: Evidence directory for the current parity invocation.
        ledger_bytes: Exact ledger bytes supplied to the parity harness.

    Returns:
        Ledger source and snapshot paths plus their shared SHA-256 hash.
    """
    filename = "diagnostic-parity-ledger.snapshot.json"
    snapshot = output_dir / filename
    snapshot.write_bytes(ledger_bytes)
    return {
        "source_path": PARITY_LEDGER.relative_to(REPO_ROOT).as_posix(),
        "snapshot_path": filename,
        "sha256": hashlib.sha256(ledger_bytes).hexdigest(),
    }


def _sha256_file(path: Path) -> str:
    """Return the SHA-256 hash of one regular evidence input file.

    Args:
        path: Existing file whose content must be bound to the parity run.

    Returns:
        Lowercase hexadecimal SHA-256 digest.

    Raises:
        AssertionError: When the supplied path is not an existing regular file.
    """
    if not path.is_file():
        raise AssertionError(f"expected regular file for provenance: {path}")
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _git_output(*args: str) -> str:
    """Return UTF-8 stdout from one successful repository-local Git command.

    Args:
        *args: Git arguments excluding the executable name.

    Returns:
        Command standard output exactly as Git emitted it.

    Raises:
        AssertionError: When Git cannot produce the requested repository evidence.
    """
    completed = subprocess.run(
        ["git", *args],
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        raise AssertionError(f"git provenance command failed: {' '.join(args)}")
    return completed.stdout


def _untracked_file_hashes(excluded_directory: Path) -> list[dict[str, str]]:
    """Hash untracked regular files while excluding this run's output directory.

    Args:
        excluded_directory: Evidence directory created by this parity invocation.

    Returns:
        Sorted repository-relative untracked file hashes.
    """
    output = _git_output("ls-files", "--others", "--exclude-standard", "-z")
    hashes: list[dict[str, str]] = []
    for raw_path in output.split("\0"):
        if not raw_path:
            continue
        path = (REPO_ROOT / raw_path).resolve()
        if path.is_relative_to(excluded_directory.resolve()):
            continue
        if path.is_file():
            hashes.append(
                {
                    "path": path.relative_to(REPO_ROOT).as_posix(),
                    "sha256": _sha256_file(path),
                }
            )
    return sorted(hashes, key=lambda item: item["path"])


def _capture_provenance(config_paths: list[str], output_dir: Path) -> dict[str, Any]:
    """Capture the revision and all mutable inputs that can affect a parity run.

    Args:
        config_paths: Exact tracked tsconfig denominator being compiled.
        output_dir: Run-local evidence directory to exclude from untracked-file checks.

    Returns:
        Git, config, lockfile, compiler, and untracked-file provenance snapshot.
    """
    tracked_status = _git_output("status", "--short", "--untracked-files=no")
    tracked_diff = _git_output("diff", "--binary", "--full-index", "HEAD", "--")
    return {
        "revision": _git_output("rev-parse", "HEAD").strip(),
        "tracked_status": tracked_status,
        "tracked_status_sha256": hashlib.sha256(tracked_status.encode("utf-8")).hexdigest(),
        "tracked_diff_sha256": hashlib.sha256(tracked_diff.encode("utf-8")).hexdigest(),
        "untracked_files": _untracked_file_hashes(output_dir),
        "tsconfig_sha256": {
            path: _sha256_file(REPO_ROOT / path) for path in config_paths
        },
        "pnpm_lock_sha256": _sha256_file(REPO_ROOT / "pnpm-lock.yaml"),
        "diagnostic_parity_ledger_sha256": _sha256_file(PARITY_LEDGER),
        "compiler_identity": {
            "typescript6": _compiler_identity(TS6_TSC, "6.0.2"),
            "typescript7": _compiler_identity(TS7_TSC, "7.0.2"),
        },
        "typescript6_node_runtime": _node_identity(),
    }


def _provenance_is_stable(start: dict[str, Any], end: dict[str, Any]) -> bool:
    """Return whether the mutable parity inputs remained unchanged across the run.

    Args:
        start: Snapshot collected immediately before compiler execution.
        end: Snapshot collected after all compiler pairs finish.

    Returns:
        True only when every captured mutable input has the same value.
    """
    return start == end


def _command(compiler: Path, config_path: str) -> list[str]:
    """Build a non-emitting real compiler command for one tracked config.

    Args:
        compiler: Exact installed compiler executable.
        config_path: Repository-relative tsconfig path.

    Returns:
        Argument vector with TS6's declared Node heap budget and stable diagnostic ordering.
    """
    command = [str(compiler), "--noEmit", "--incremental", "false"]
    if compiler == TS6_TSC:
        command = [
            str(NODE_EXECUTABLE.resolve()),
            f"--max-old-space-size={TS6_MAX_OLD_SPACE_MIB}",
            *command,
            "--stableTypeOrdering",
        ]
    return [*command, "-p", config_path]


def _compiler_identity(compiler: Path, expected_version: str) -> dict[str, str]:
    """Resolve and verify the exact compiler identity used by a parity run.

    Args:
        compiler: Installed compiler executable.
        expected_version: Exact version that the compiler must report.

    Returns:
        Resolved executable path, package content hashes, and verified version output.

    Raises:
        AssertionError: When the executable is absent, fails, or reports another version.
    """
    if not compiler.is_file():
        raise AssertionError(f"missing compiler executable: {compiler}")
    completed = subprocess.run(
        [str(compiler), "--version"],
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    version_output = f"{completed.stdout}{completed.stderr}".strip()
    if completed.returncode != 0 or version_output != f"Version {expected_version}":
        raise AssertionError(f"compiler identity mismatch: {compiler}")
    resolved_compiler = compiler.resolve()
    package_json = resolved_compiler.parents[1] / "package.json"
    return {
        "path": str(resolved_compiler),
        "version_output": version_output,
        "executable_sha256": _sha256_file(resolved_compiler),
        "package_json_path": str(package_json),
        "package_json_sha256": _sha256_file(package_json),
    }


def _node_identity() -> dict[str, str]:
    """Resolve and hash the Node runtime used to give TS6 its declared heap budget.

    Returns:
        Resolved Node executable path, version output, and executable SHA-256 hash.

    Raises:
        AssertionError: When Node cannot be resolved or report its version.
    """
    if not NODE_EXECUTABLE.is_file():
        raise AssertionError("missing Node executable required for the TS6 heap budget")
    resolved_node = NODE_EXECUTABLE.resolve()
    completed = subprocess.run(
        [str(resolved_node), "--version"],
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    version_output = f"{completed.stdout}{completed.stderr}".strip()
    if completed.returncode != 0 or not version_output.startswith("v"):
        raise AssertionError("Node runtime identity could not be verified")
    return {
        "path": str(resolved_node),
        "version_output": version_output,
        "executable_sha256": _sha256_file(resolved_node),
    }


def _normalized_diagnostics(raw_streams: dict[str, str]) -> list[str]:
    """Normalize TypeScript error lines using the Phase 2 parity semantics.

    Args:
        raw_streams: Stdout and stderr from one compiler process.

    Returns:
        Sorted actionable TypeScript diagnostic lines.
    """
    stream = f"{raw_streams['stdout']}{raw_streams['stderr']}".replace("\r\n", "\n")
    diagnostics: list[str] = []
    root = f"{REPO_ROOT.as_posix()}/"
    for line in stream.splitlines():
        if "error TS" not in line:
            continue
        diagnostics.append(line.replace("\\", "/").replace(root, "").strip())
    return sorted(diagnostics)


def _persist_raw_streams(
    output_dir: Path,
    config_path: str,
    raw_streams: dict[str, dict[str, str]],
) -> dict[str, dict[str, str]]:
    """Persist the raw streams from the exact compiler pair that was compared.

    Args:
        output_dir: Evidence directory for the run.
        config_path: Repository-relative failing tsconfig path.
        raw_streams: Unmodified stdout and stderr keyed by ts6 and ts7.

    Returns:
        Output filenames keyed by compiler and stream.
    """
    stem = config_path.replace("/", "__").replace(".json", "")
    files: dict[str, dict[str, str]] = {}
    for compiler, streams in raw_streams.items():
        files[compiler] = {}
        for stream_name in ("stdout", "stderr"):
            filename = f"{stem}.{compiler}.{stream_name}.txt"
            (output_dir / filename).write_text(streams[stream_name], encoding="utf-8")
            files[compiler][stream_name] = filename
    return files


def _rejected_record(
    output_dir: Path,
    config_path: str,
    failure: str,
    raw_streams: dict[str, dict[str, str]],
    subprocess_evidence: list[dict[str, Any]],
) -> dict[str, Any]:
    """Write one parity-rejection record without re-running either compiler.

    Args:
        output_dir: Evidence directory for the current run.
        config_path: Repository-relative rejected tsconfig path.
        failure: Rejection reason raised by the reusable parity harness.
        raw_streams: Exact streams from the rejected compiler pair.
        subprocess_evidence: Exact process evidence from the rejected pair.

    Returns:
        Auditable rejection record with raw-log filenames and normalized diagnostics.
    """
    files = _persist_raw_streams(output_dir, config_path, raw_streams)
    return {
        "tsconfig_path": config_path,
        "status": (
            "compiler_runtime_failure"
            if failure.startswith("compiler runtime failure:")
            else "unexplained_difference"
        ),
        "failure": failure,
        "subprocess_evidence": subprocess_evidence,
        "ts6": {"diagnostics": _normalized_diagnostics(raw_streams["ts6"]), "files": files["ts6"]},
        "ts7": {"diagnostics": _normalized_diagnostics(raw_streams["ts7"]), "files": files["ts7"]},
    }


def _run_parity(
    output_dir: Path,
    config_paths: list[str],
    start_provenance: dict[str, Any],
) -> dict[str, Any]:
    """Apply the reusable Phase 2 parity harness to every real tracked config.

    Args:
        output_dir: Directory receiving per-config and summary evidence.
        config_paths: Exact tracked tsconfig denominator to compile.
        start_provenance: Immutable input snapshot collected before compiler execution.

    Returns:
        Complete parity summary including every config result.
    """
    if str(REPO_ROOT) not in sys.path:
        sys.path.insert(0, str(REPO_ROOT))
    from measure.tests.typescript7_phase2_harness import (
        DiagnosticParityError,
        run_diagnostic_parity,
    )

    started_at = _now()
    compiler_identity = start_provenance["compiler_identity"]
    ledger, ledger_bytes = _load_ledger()
    ledger_snapshot = _persist_ledger_snapshot(output_dir, ledger_bytes)
    ledger_matches_start = (
        ledger_snapshot["sha256"] == start_provenance["diagnostic_parity_ledger_sha256"]
    )
    records: list[dict[str, Any]] = []
    for config_path in config_paths:
        try:
            report = run_diagnostic_parity(
                _command(TS6_TSC, config_path),
                _command(TS7_TSC, config_path),
                ledger=ledger,
                tsconfig_path=config_path,
            )
        except DiagnosticParityError as error:
            records.append(
                _rejected_record(
                    output_dir,
                    config_path,
                    str(error),
                    error.raw_streams,
                    error.subprocess_evidence,
                )
            )
            continue
        raw_streams = report.pop("raw_streams")
        records.append(
            {
                "tsconfig_path": config_path,
                "status": "parity",
                "report": report,
                "files": _persist_raw_streams(output_dir, config_path, raw_streams),
            }
        )
    failures = [record for record in records if record["status"] != "parity"]
    end_provenance = _capture_provenance(config_paths, output_dir)
    input_tree_stable = _provenance_is_stable(start_provenance, end_provenance)
    gate_failures = [record["tsconfig_path"] for record in failures]
    if not ledger_matches_start:
        gate_failures.append("diagnostic-parity-ledger-changed-before-run")
    if not input_tree_stable:
        gate_failures.append("input-tree-changed-during-run")
    return {
        "schema_version": 1,
        "track": "typescript7_native_migration_20260710",
        "phase": "Phase 3c: real TypeScript 6/7 diagnostic parity",
        "started_at": started_at,
        "ended_at": _now(),
        "compiler_contract": {
            "typescript6": {
                **compiler_identity["typescript6"],
                "node_runtime": start_provenance["typescript6_node_runtime"],
                "flags": [
                    f"--max-old-space-size={TS6_MAX_OLD_SPACE_MIB}",
                    "--stableTypeOrdering",
                ],
            },
            "typescript7": {**compiler_identity["typescript7"], "flags": []},
        },
        "diagnostic_parity_ledger": ledger_snapshot,
        "diagnostic_parity_ledger_matches_start": ledger_matches_start,
        "input_provenance": {
            "start": start_provenance,
            "end": end_provenance,
            "stable": input_tree_stable,
        },
        "config_count": len(records),
        "passed_count": len(records) - len(failures),
        "failed_count": len(failures),
        "gate_failures": gate_failures,
        "records": records,
    }


def _write_manifest(output_dir: Path) -> None:
    """Write hashes for every evidence file from one uniquely named parity run.

    Args:
        output_dir: Directory containing the current run's evidence files.
    """
    files = []
    for path in sorted(output_dir.rglob("*")):
        if not path.is_file() or path.name == "manifest.json":
            continue
        relative_path = path.relative_to(output_dir).as_posix()
        files.append(
            {
                "path": relative_path,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            }
        )
    (output_dir / "manifest.json").write_text(
        json.dumps({"schema_version": 1, "files": files}, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    """Run parity and return a non-zero status when any config lacks explained parity.

    Returns:
        Process exit status suitable for a CI or Measure acceptance gate.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output-dir",
        type=Path,
        help="New empty directory for this evidence run; defaults to a unique run directory.",
    )
    args = parser.parse_args()
    output_dir = args.output_dir
    if output_dir is None:
        run_id = datetime.now(timezone.utc).strftime("run-%Y%m%dT%H%M%S%fZ")
        output_dir = TRACK_DIR / "evidence" / "phase-3c-parity" / run_id
    if output_dir.exists():
        raise AssertionError(f"parity evidence directory already exists: {output_dir}")
    config_paths = _load_config_paths()
    start_provenance = _capture_provenance(config_paths, output_dir)
    output_dir.mkdir(parents=True)
    summary = _run_parity(output_dir, config_paths, start_provenance)
    (output_dir / "summary.json").write_text(
        json.dumps(summary, indent=2) + "\n", encoding="utf-8"
    )
    _write_manifest(output_dir)
    print(json.dumps({key: summary[key] for key in ("config_count", "passed_count", "failed_count")}))
    return int(bool(summary["gate_failures"]))


if __name__ == "__main__":
    sys.exit(main())
