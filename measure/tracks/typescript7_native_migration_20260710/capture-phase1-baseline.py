#!/usr/bin/env python3
"""Capture TypeScript 5.9 check-types diagnostic and timing baseline for all workspaces.

Runs each workspace's check-types script sequentially with TURBO_CONCURRENCY=1
and a per-workspace timeout of 300 seconds. A timeout or failure is evidence,
not a reason to fabricate green.

Usage:
    # Full live capture (sequential, ~10 min):
    python3 measure/tracks/typescript7_native_migration_20260710/capture-phase1-baseline.py

    # Read-only completeness verification (no writes, no live commands):
    python3 measure/tracks/typescript7_native_migration_20260710/capture-phase1-baseline.py --check-completeness

Output (full capture only):
    phase1-workspace-baseline.json  (machine-readable results)
    evidence/phase1/raw-logs/<N>-<workspace>.log  (bounded non-empty raw output)

Resumable: if interrupted, re-run the script; already-captured workspaces are skipped.

The --check-completeness mode derives the TypeScript-workspace denominator
independently from tracked pnpm workspace manifests plus tracked tsconfigs,
then verifies exact workspace-set equality, count, and all_accounted. It performs
zero writes and zero live compiler commands.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / "typescript7_native_migration_20260710"
SURFACE_INVENTORY = TRACK_DIR / "surface-inventory.json"
OUTPUT_FILE = TRACK_DIR / "phase1-workspace-baseline.json"
PROGRESS_FILE = TRACK_DIR / "phase1-workspace-baseline.jsonl"
RAW_LOG_DIR = TRACK_DIR / "evidence" / "phase1" / "raw-logs"

TIMEOUT_SECONDS = 300
DIAG_RE = re.compile(r"error TS\d+|warning TS\d+")
ENV = {**os.environ, "TURBO_CONCURRENCY": "1"}

PHASE_BASE_SHA = "879112353411912b80849037016cbd9ed2c1bf63"
ROLE_BASE_SHA = "b0d013c838f7ea43d22bcabb3e8b7ff75775ab21"

GENERATED_OR_IGNORED_DIR_NAMES = {
    ".next", ".turbo", "build", "coverage", "dist", "generated",
    "node_modules", "out",
}


def git_tracked_paths(*pathspecs: str) -> set[str]:
    """Return tracked paths matching pathspecs, excluding generated directories.

    Args:
        pathspecs: Git pathspecs used to select repository files.

    Returns:
        Repository-relative tracked paths.

    Raises:
        RuntimeError: When Git cannot enumerate the requested paths.
    """
    completed = subprocess.run(
        ["git", "ls-files", "-z", "--", *pathspecs],
        cwd=REPO_ROOT,
        capture_output=True,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(
            f"git ls-files failed with exit {completed.returncode}: "
            f"{completed.stderr.decode('utf-8', errors='replace')}"
        )
    return {
        path
        for path in completed.stdout.decode("utf-8").split("\0")
        if path
        and GENERATED_OR_IGNORED_DIR_NAMES.isdisjoint(Path(path).parts)
    }


def workspace_manifest_pathspecs() -> tuple[str, ...]:
    """Derive package-manifest globs from the repository pnpm workspace file.

    Returns:
        Git pathspecs for every configured workspace package manifest.

    Raises:
        RuntimeError: When the workspace configuration is absent or has no package globs.
    """
    workspace_file = REPO_ROOT / "pnpm-workspace.yaml"
    if not workspace_file.is_file():
        raise RuntimeError("pnpm-workspace.yaml is required for workspace discovery")

    patterns: list[str] = []
    in_packages = False
    for line in workspace_file.read_text(encoding="utf-8").splitlines():
        if line == "packages:":
            in_packages = True
            continue
        if in_packages and line and not line.startswith((" ", "\t")):
            break
        if not in_packages:
            continue
        match = re.match(r'\s*-\s*"([^\"]+)"\s*$', line)
        if match:
            patterns.append(f":(glob){match.group(1)}/package.json")

    if not patterns:
        raise RuntimeError("pnpm workspace configuration has no package globs")
    return tuple(patterns)


def typescript_workspace_denominator() -> list[str]:
    """Derive TypeScript workspaces from pnpm configuration and tracked files.

    Returns:
        Sorted configured pnpm workspaces that have both a tracked manifest and a
        tracked tsconfig in the workspace root.
    """
    manifests = git_tracked_paths(*workspace_manifest_pathspecs())
    tsconfigs = git_tracked_paths(":(glob)**/tsconfig*.json")
    tsconfig_parents = {str(Path(path).parent) for path in tsconfigs}
    return sorted(
        str(Path(manifest).parent)
        for manifest in manifests
        if str(Path(manifest).parent) in tsconfig_parents
    )


def load_check_types_workspaces() -> list[dict[str, Any]]:
    """Build commands for every independently derived TypeScript workspace.

    Returns:
        List of dicts with workspace path, command, and emit flag. Workspaces
        without check-types use a direct TypeScript 5.9 no-emit fallback.
    """
    inventory = json.loads(SURFACE_INVENTORY.read_text(encoding="utf-8"))
    by_workspace: dict[str, dict[str, Any]] = {}
    for entry in inventory["tsc_scripts"]:
        if entry.get("script") == "check-types":
            by_workspace[entry["workspace"]] = {
                "workspace": entry["workspace"],
                "check_types_command": entry["command"],
                "emit": entry.get("emit", False),
                "command_source": "workspace check-types script",
            }

    workspaces: list[dict[str, Any]] = []
    for workspace in typescript_workspace_denominator():
        if workspace in by_workspace:
            workspaces.append(by_workspace[workspace])
            continue
        workspaces.append({
            "workspace": workspace,
            "check_types_command": (
                "node node_modules/typescript/bin/tsc --noEmit "
                f"-p {workspace}/tsconfig.json"
            ),
            "emit": False,
            "command_source": "direct TypeScript 5.9 fallback (no check-types script)",
        })
    return workspaces


def check_completeness() -> int:
    """Verify phase1-workspace-baseline.json covers all TypeScript workspaces.

    Reads surface-inventory.json and phase1-workspace-baseline.json, then checks
    that the workspace sets are exactly equal, counts match, and every workspace
    is accounted for. Performs zero writes and zero live check-types commands.

    Returns:
        0 if completeness verification passes, 1 if it fails.
    """
    if not SURFACE_INVENTORY.is_file():
        print(f"ERROR: {SURFACE_INVENTORY.relative_to(REPO_ROOT)} not found", file=sys.stderr)
        return 1
    if not OUTPUT_FILE.is_file():
        print(f"ERROR: {OUTPUT_FILE.relative_to(REPO_ROOT)} not found", file=sys.stderr)
        return 1

    baseline = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))

    inv_workspaces = typescript_workspace_denominator()
    cap_workspaces = sorted(r["workspace"] for r in baseline.get("workspaces", []))

    inv_count = len(inv_workspaces)
    cap_count = len(cap_workspaces)
    inv_set = set(inv_workspaces)
    cap_set = set(cap_workspaces)
    sets_equal = inv_set == cap_set
    counts_match = inv_count == cap_count
    all_accounted = sets_equal and counts_match

    missing = sorted(inv_set - cap_set)
    extra = sorted(cap_set - inv_set)

    print(f"Inventory TypeScript workspaces:  {inv_count}")
    print(f"Captured workspaces:              {cap_count}")
    print(f"Counts match:                     {counts_match}")
    print(f"Workspace sets equal:             {sets_equal}")
    print(f"All accounted:                    {all_accounted}")
    if missing:
        print(f"Missing from baseline:            {missing}")
    if extra:
        print(f"Extra in baseline:                {extra}")

    # Also verify the baseline file's own completeness_check field is consistent
    stored_cc = baseline.get("completeness_check", {})
    stored_match = stored_cc.get("match", False)
    stored_all = stored_cc.get("all_accounted", False)
    if stored_match != all_accounted:
        print(f"WARNING: baseline completeness_check.match={stored_match} "
              f"but recomputed={all_accounted}", file=sys.stderr)
    if stored_all != all_accounted:
        print(f"WARNING: baseline completeness_check.all_accounted={stored_all} "
              f"but recomputed={all_accounted}", file=sys.stderr)

    if all_accounted:
        print("Completeness check: PASS")
        return 0
    else:
        print("Completeness check: FAIL", file=sys.stderr)
        return 1


def get_package_name(workspace_path: str) -> str:
    """Get the package name from a workspace's package.json.

    Args:
        workspace_path: Repository-relative path to the workspace directory.

    Returns:
        The package name field, or the workspace path if not found.
    """
    pkg_json = REPO_ROOT / workspace_path / "package.json"
    if pkg_json.is_file():
        data = json.loads(pkg_json.read_text(encoding="utf-8"))
        return data.get("name", workspace_path)
    return workspace_path


def get_dirty_paths(workspace_path: str) -> list[str]:
    """Get dirty git paths for a workspace directory.

    Args:
        workspace_path: Repository-relative path to the workspace directory.

    Returns:
        List of dirty file paths within the workspace.
    """
    result = subprocess.run(
        ["git", "status", "--porcelain", "--", workspace_path],
        capture_output=True, text=True, cwd=str(REPO_ROOT),
    )
    paths = []
    for line in result.stdout.strip().split("\n"):
        line = line.strip()
        if line:
            paths.append(line[3:])
    return paths


def count_diagnostics(output: str) -> int:
    """Count diagnostic lines in tsc output.

    Args:
        output: Combined stdout and stderr from a tsc invocation.

    Returns:
        Number of lines matching error TSxxxx or warning TSxxxx patterns.
    """
    count = 0
    for line in output.split("\n"):
        if DIAG_RE.search(line):
            count += 1
    return count


def normalize_diagnostics(output: str) -> list[str]:
    """Extract normalized diagnostic lines from tsc output.

    Args:
        output: Combined stdout and stderr from a tsc invocation.

    Returns:
        Sorted list of diagnostic lines with absolute paths stripped.
    """
    diags = []
    for line in output.split("\n"):
        if DIAG_RE.search(line):
            stripped = line.replace(str(REPO_ROOT) + "/", "")
            diags.append(stripped.strip())
    diags.sort()
    return diags


def run_workspace(ws: dict[str, Any], index: int, total: int) -> dict[str, Any]:
    """Run a single workspace's check-types command and capture evidence.

    Args:
        ws: Workspace dict with path and command.
        index: 1-based index for logging.
        total: Total number of workspaces for logging.

    Returns:
        Evidence dict with timing, exit status, diagnostics, and contamination info.
    """
    workspace_path = ws["workspace"]
    package_name = get_package_name(workspace_path)
    dirty_paths = get_dirty_paths(workspace_path)
    contaminated = len(dirty_paths) > 0

    has_workspace_script = ws["command_source"] == "workspace check-types script"
    if has_workspace_script:
        command = ["pnpm", "--filter", package_name, "run", "check-types"]
        rendered_command = f"pnpm --filter {package_name} run check-types"
    else:
        command = [
            "node", "node_modules/typescript/bin/tsc", "--noEmit",
            "-p", f"{workspace_path}/tsconfig.json",
        ]
        rendered_command = ws["check_types_command"]
    exact_command = (
        f"TURBO_CONCURRENCY=1 timeout {TIMEOUT_SECONDS} {rendered_command}"
    )
    print(f"[{index}/{total}] {workspace_path} ({package_name})")

    start_monotonic = time.monotonic()
    start_iso = datetime.now(timezone.utc).isoformat()

    try:
        result = subprocess.run(
            ["timeout", str(TIMEOUT_SECONDS), *command],
            capture_output=True, text=True,
            cwd=str(REPO_ROOT),
            env=ENV,
            timeout=TIMEOUT_SECONDS + 30,
        )
        exit_status = result.returncode
        timed_out = exit_status == 124
        stdout = result.stdout or ""
        stderr = result.stderr or ""
    except subprocess.TimeoutExpired:
        exit_status = 124
        timed_out = True
        stdout = ""
        stderr = f"Subprocess timeout after {TIMEOUT_SECONDS + 30}s"

    end_monotonic = time.monotonic()
    end_iso = datetime.now(timezone.utc).isoformat()
    elapsed_ms = int((end_monotonic - start_monotonic) * 1000)

    raw_output = stdout + stderr
    raw_output_sha256 = hashlib.sha256(raw_output.encode("utf-8")).hexdigest()
    diagnostic_count = count_diagnostics(raw_output)
    normalized_diags = normalize_diagnostics(raw_output)

    # Save bounded raw log. Git cannot retain a meaningful zero-byte evidence file,
    # so an empty compiler stream is represented by its SHA-256 and a null path.
    log_filename = f"{index:02d}-{workspace_path.replace('/', '-')}.log"
    raw_log_file: str | None = None
    if raw_output:
        RAW_LOG_DIR.mkdir(parents=True, exist_ok=True)
        log_path = RAW_LOG_DIR / log_filename
        log_path.write_text(raw_output, encoding="utf-8")
        raw_log_file = f"evidence/phase1/raw-logs/{log_filename}"

    status_label = "TIMEOUT" if timed_out else ("PASS" if exit_status == 0 else "FAIL")
    print(f"  {status_label} exit={exit_status} elapsed={elapsed_ms}ms "
          f"diag={diagnostic_count} dirty={len(dirty_paths)}")

    return {
        "index": index,
        "workspace": workspace_path,
        "package_name": package_name,
        "check_types_command": ws["check_types_command"],
        "command_source": ws["command_source"],
        "exact_command": exact_command,
        "start_time": start_iso,
        "end_time": end_iso,
        "elapsed_ms": elapsed_ms,
        "exit_status": exit_status,
        "timed_out": timed_out,
        "diagnostic_count": diagnostic_count,
        "raw_output_sha256": raw_output_sha256,
        "raw_output_lines": len([l for l in raw_output.split("\n") if l.strip()]),
        "raw_log_file": raw_log_file,
        "raw_output_note": (
            None if raw_output else
            "The compiler emitted no stdout or stderr; no zero-byte raw-log artifact is persisted."
        ),
        "normalized_diagnostics": normalized_diags[:200],
        "normalized_diagnostics_truncated": len(normalized_diags) > 200,
        "normalized_diagnostics_total": len(normalized_diags),
        "dirty_paths": dirty_paths,
        "contaminated": contaminated,
        "contamination_reason": (
            f"{len(dirty_paths)} dirty entries in workspace path"
            if contaminated
            else "no dirty entries in workspace path"
        ),
    }


def main() -> int:
    """Run the capture script and write results.

    Returns:
        0 if all workspaces were captured, 1 if any error occurred.
    """
    workspaces = load_check_types_workspaces()
    total = len(workspaces)
    print(f"Found {total} configured TypeScript workspaces")

    # Load existing progress for resumability
    existing: dict[str, dict[str, Any]] = {}
    if PROGRESS_FILE.exists():
        for line in PROGRESS_FILE.read_text(encoding="utf-8").strip().split("\n"):
            if line.strip():
                data = json.loads(line)
                existing[data["workspace"]] = data

    results: list[dict[str, Any]] = []
    for i, ws in enumerate(workspaces):
        ws_path = ws["workspace"]
        if ws_path in existing:
            print(f"[{i+1}/{total}] SKIP (already captured): {ws_path}")
            results.append(existing[ws_path])
            continue

        result = run_workspace(ws, i + 1, total)
        results.append(result)

        # Write progress incrementally
        with open(PROGRESS_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(result) + "\n")

    # Assemble final JSON
    pass_count = sum(1 for r in results if r["exit_status"] == 0)
    fail_count = sum(1 for r in results if r["exit_status"] != 0 and not r["timed_out"])
    timeout_count = sum(1 for r in results if r["timed_out"])
    contaminated_count = sum(1 for r in results if r["contaminated"])

    output: dict[str, Any] = {
        "schema_version": "phase1-workspace-baseline.v1",
        "status": "captured",
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "phase_base_sha": PHASE_BASE_SHA,
        "role_base_sha": ROLE_BASE_SHA,
        "compiler_version": "5.9.3",
        "turbo_concurrency": 1,
        "timeout_seconds": TIMEOUT_SECONDS,
        "workspace_count": len(results),
        "expected_workspace_count": total,
        "summary": {
            "pass": pass_count,
            "fail": fail_count,
            "timeout": timeout_count,
            "contaminated": contaminated_count,
            "clean": total - contaminated_count,
        },
        "completeness_check": {
            "inventory_workspaces": total,
            "captured_workspaces": len(results),
            "match": len(results) == total,
            "all_accounted": all(
                any(r["workspace"] == ws["workspace"] for r in results)
                for ws in workspaces
            ),
        },
        "workspaces": results,
    }

    OUTPUT_FILE.write_text(
        json.dumps(output, indent=2) + "\n", encoding="utf-8"
    )
    print(f"\nWrote {OUTPUT_FILE}")
    print(f"  {pass_count} pass, {fail_count} fail, {timeout_count} timeout, "
          f"{contaminated_count} contaminated")

    # Completeness assertion
    if len(results) != total:
        print(f"ERROR: captured {len(results)} but expected {total}", file=sys.stderr)
        return 1

    missing = [
        ws["workspace"] for ws in workspaces
        if not any(r["workspace"] == ws["workspace"] for r in results)
    ]
    if missing:
        print(f"ERROR: missing workspaces: {missing}", file=sys.stderr)
        return 1

    print("Completeness check: PASS (all workspaces accounted for)")

    # Clean up progress file
    if PROGRESS_FILE.exists():
        PROGRESS_FILE.unlink()

    return 0


if __name__ == "__main__":
    if "--check-completeness" in sys.argv:
        sys.exit(check_completeness())
    sys.exit(main())
