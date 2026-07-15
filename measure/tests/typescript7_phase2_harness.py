"""Reusable deterministic subprocess harnesses for TypeScript 7 migration Phase 2."""

from __future__ import annotations

import hashlib
import json
import os
import re
import signal
import statistics
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / "typescript7_native_migration_20260710"
FIXTURE_ROOT = TRACK_DIR / "fixtures"
RUNNER = FIXTURE_ROOT / "runner-fixtures" / "fixture_executable.py"


def _now() -> str:
    """Return an ISO-8601 UTC timestamp for a subprocess evidence record.

    Returns:
        UTC timestamp with timezone information.
    """
    return datetime.now(timezone.utc).isoformat()


def _launch(command: Sequence[str]) -> tuple[subprocess.CompletedProcess[str], dict[str, Any]]:
    """Launch a command in a new process group and return immutable launch evidence.

    Args:
        command: Executable and arguments to launch without a shell.

    Returns:
        Completed process result and evidence proving the operating-system launch.
    """
    if not command or not all(isinstance(part, str) and part for part in command):
        raise AssertionError("subprocess command must be a non-empty string sequence")
    started_at = _now()
    process = subprocess.Popen(
        list(command),
        cwd=REPO_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=True,
    )
    try:
        pgid = os.getpgid(process.pid)
    except ProcessLookupError:
        pgid = process.pid
    stdout, stderr = process.communicate()
    ended_at = _now()
    completed = subprocess.CompletedProcess(
        list(command), process.returncode, stdout, stderr
    )
    evidence = {
        "command": list(command),
        "pid": process.pid,
        "pgid": pgid,
        "exit_status": process.returncode,
        "stdout_sha256": hashlib.sha256(stdout.encode("utf-8")).hexdigest(),
        "stderr_sha256": hashlib.sha256(stderr.encode("utf-8")).hexdigest(),
        "started_at": started_at,
        "ended_at": ended_at,
        "mocked": False,
    }
    return completed, evidence


def _decode_json_process(command: Sequence[str]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Launch a fixture command and require a successful JSON object response.

    Args:
        command: Fixture executable command.

    Returns:
        Decoded response object and real-process evidence.

    Raises:
        AssertionError: When the process fails or its output is not a JSON object.
    """
    completed, evidence = _launch(command)
    if completed.returncode != 0:
        raise AssertionError(f"fixture command exited {completed.returncode}: {completed.stderr}")
    try:
        value = json.loads(completed.stdout)
    except json.JSONDecodeError as error:
        raise AssertionError("fixture command did not emit JSON") from error
    if not isinstance(value, dict):
        raise AssertionError("fixture command JSON root must be an object")
    return value, evidence


def run_resolution_contract(command: Sequence[str]) -> dict[str, Any]:
    """Validate deterministic TS6 and TS7 resolution evidence from a fixture process.

    Args:
        command: Fixture command that emits resolution metadata.

    Returns:
        Validated resolution metadata plus subprocess evidence.

    Raises:
        AssertionError: When aliases, versions, paths, or API ownership are ambiguous.
    """
    result, evidence = _decode_json_process(command)
    required = {
        "native_alias", "native_compiler_version", "ts6_physical_path",
        "ts7_physical_path", "typescript_api_path", "typescript_api_version",
    }
    if required - set(result):
        raise AssertionError("missing resolution evidence")
    if result["native_alias"] != "typescript7":
        raise AssertionError("native TypeScript alias must be typescript7")
    if result["typescript_api_version"] != "6.0.2" or result["native_compiler_version"] != "7.0.2":
        raise AssertionError("compiler versions must be exact 6.0.2 and 7.0.2")
    if result["ts6_physical_path"] == result["ts7_physical_path"]:
        raise AssertionError("TS6 and TS7 must resolve to distinct physical paths")
    if not result["typescript_api_path"].startswith(result["ts6_physical_path"]):
        raise AssertionError("require.resolve('typescript') must remain under the TS6 tree")
    return {**result, "subprocess_evidence": [evidence]}


def audit_tsconfig_matrix(matrix_path: Path, *, repository_paths: Sequence[str]) -> dict[str, Any]:
    """Audit the fixture compatibility matrix while reporting every tracked tsconfig path.

    Args:
        matrix_path: JSON fixture containing option posture cases.
        repository_paths: Exact repository-derived tsconfig denominator.

    Returns:
        Read-only compatibility report with fixture violations and emit classification.

    Raises:
        AssertionError: When the denominator is not the accepted 39-config surface.
    """
    if len(repository_paths) != 39 or len(set(repository_paths)) != 39:
        raise AssertionError("tsconfig audit requires the exact 39-config denominator")
    matrix = json.loads(matrix_path.read_text(encoding="utf-8"))
    cases = matrix.get("cases") if isinstance(matrix, dict) else None
    if not isinstance(cases, list) or not cases:
        raise AssertionError("tsconfig fixture matrix must be non-empty")
    violations: list[dict[str, str]] = []
    valid_postures: set[str] = set()
    for case in cases:
        if not isinstance(case, dict):
            raise AssertionError("tsconfig matrix case must be an object")
        options = case.get("compilerOptions", {})
        if not isinstance(options, dict):
            raise AssertionError("compilerOptions must be an object")
        case_id = str(case.get("id", "unknown"))
        if "baseUrl" in options:
            violations.append({"id": "removed-baseUrl", "case": case_id})
        if options.get("moduleResolution") == "node":
            violations.append({"id": "legacy-moduleResolution", "case": case_id})
        if "suppressExcessPropertyErrors" in options:
            violations.append({"id": "removed-suppressExcessPropertyErrors", "case": case_id})
        violations.extend(_compiler_option_violations(options, case_id, key="case"))
        required_ambient = case.get("ambient_requirements", [])
        if not isinstance(required_ambient, list) or not all(
            isinstance(item, str) and item for item in required_ambient
        ):
            raise AssertionError("ambient requirements must be a string array")
        violations.extend(
            _ambient_type_violations(
                options, set(required_ambient), case_id, key="case"
            )
        )
        if not any(item["case"] == case_id for item in violations):
            posture = case.get("types_posture")
            if posture not in {"narrow_explicit", "explicit_empty", "inherited_omission"}:
                raise AssertionError("ambient types posture is not evidence-driven")
            valid_postures.add(posture)
    repository_audit: list[dict[str, Any]] = []
    repository_violations: list[dict[str, str]] = []
    no_emit_count = 0
    for relative_path in repository_paths:
        options = _effective_tsconfig_options(REPO_ROOT / relative_path)
        no_emit = options.get("noEmit") is True
        no_emit_count += int(no_emit)
        types_value = options.get("types")
        if "types" not in options:
            types_posture = "inherited_omission"
        elif isinstance(types_value, list) and not types_value:
            types_posture = "explicit_empty"
        elif isinstance(types_value, list) and all(isinstance(item, str) and item for item in types_value):
            types_posture = "narrow_explicit"
        else:
            types_posture = "invalid"
            repository_violations.append(
                {"id": "invalid-types-posture", "path": relative_path}
            )
        for option, violation_id in (
            ("baseUrl", "removed-baseUrl"),
            ("suppressExcessPropertyErrors", "removed-suppressExcessPropertyErrors"),
        ):
            if option in options:
                repository_violations.append({"id": violation_id, "path": relative_path})
        if options.get("moduleResolution") == "node":
            repository_violations.append(
                {"id": "legacy-moduleResolution", "path": relative_path}
            )
        repository_violations.extend(
            _compiler_option_violations(options, relative_path, key="path")
        )
        repository_audit.append(
            {
                "path": relative_path,
                "emit_mode": "no_emit" if no_emit else "emit",
                "types_posture": types_posture,
                "ambient_requirements": [],
                "ambient_requirement_evidence": "live_compiler_parity",
            }
        )
    return {
        "checked": len(repository_paths),
        "audited_paths": list(repository_paths),
        "emit_modes": ["emit", "no_emit"],
        "emit_count": len(repository_paths) - no_emit_count,
        "no_emit_count": no_emit_count,
        "valid_types_postures": sorted(valid_postures),
        "fixture_violations": violations,
        "repository_audit": repository_audit,
        "repository_violations": repository_violations,
    }


def _compiler_option_violations(
    options: dict[str, Any], identity: str, *, key: str
) -> list[dict[str, str]]:
    """Return unsupported TypeScript 7 module, target, and interop combinations.

    Args:
        options: Effective compiler options to assess.
        identity: Fixture case or repository path being assessed.
        key: Output key that names the supplied identity.

    Returns:
        Path- or case-bound compatibility findings.
    """
    findings: list[dict[str, str]] = []
    module = str(options.get("module", "")).lower()
    resolution = str(options.get("moduleResolution", "")).lower()
    target = str(options.get("target", "")).lower()
    if resolution == "bundler" and module == "commonjs":
        findings.append({"id": "unsupported-module-resolution-combination", key: identity})
    if resolution == "bundler" and target in {"es3", "es5"}:
        findings.append({"id": "unsupported-target-module-combination", key: identity})
    if (
        resolution == "bundler"
        and module == "commonjs"
        and options.get("esModuleInterop") is False
    ):
        findings.append({"id": "unsupported-interoperability-combination", key: identity})
    return findings


def _ambient_type_violations(
    options: dict[str, Any], requirements: set[str], identity: str, *, key: str
) -> list[dict[str, str]]:
    """Validate that ambient type lists match proven global consumption.

    Args:
        options: Effective compiler options to assess.
        requirements: Proven ambient global families consumed by source.
        identity: Fixture case or repository path being assessed.
        key: Output key that names the supplied identity.

    Returns:
        Path- or case-bound ambient type findings.
    """
    expected = {
        "node": "node",
        "vitest": "vitest/globals",
        "jest": "jest",
        "playwright": "@playwright/test",
    }
    configured_raw = options.get("types", [])
    configured = set(configured_raw) if isinstance(configured_raw, list) else set()
    findings: list[dict[str, str]] = []
    for requirement in requirements:
        if expected[requirement] not in configured:
            findings.append({"id": "missing-ambient-types", key: identity})
            break
    known_configured = {item for item in configured if item in set(expected.values())}
    needed_configured = {expected[item] for item in requirements}
    if known_configured - needed_configured:
        findings.append({"id": "unnecessary-ambient-types", key: identity})
    return findings


def _effective_tsconfig_options(path: Path, visited: set[Path] | None = None) -> dict[str, Any]:
    """Resolve local tsconfig inheritance into one read-only options mapping.

    Args:
        path: Absolute tsconfig path to read.
        visited: Paths already traversed while resolving extends clauses.

    Returns:
        Effective compiler options after local inheritance.

    Raises:
        AssertionError: When a tracked config cannot be parsed or has cyclic inheritance.
    """
    resolved_path = path.resolve()
    chain = set() if visited is None else visited
    if resolved_path in chain:
        raise AssertionError(f"cyclic tsconfig inheritance: {resolved_path.relative_to(REPO_ROOT)}")
    try:
        data = json.loads(resolved_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise AssertionError(f"unreadable tracked tsconfig: {resolved_path}") from error
    if not isinstance(data, dict):
        raise AssertionError(f"tracked tsconfig root must be an object: {resolved_path}")
    inherited: dict[str, Any] = {}
    extends = data.get("extends")
    if isinstance(extends, str):
        if extends == "@reading-advantage/config/tsconfig":
            parent = REPO_ROOT / "packages/config/tsconfig/base.json"
        else:
            parent = (resolved_path.parent / extends).resolve()
            if parent.suffix != ".json":
                parent = parent.with_suffix(".json")
        inherited = _effective_tsconfig_options(parent, chain | {resolved_path})
    options = data.get("compilerOptions", {}) if isinstance(data, dict) else {}
    if not isinstance(options, dict):
        raise AssertionError(f"compilerOptions must be an object: {resolved_path}")
    return {**inherited, **options}


def _normalized_diagnostics(stream: str) -> list[str]:
    """Normalize TypeScript diagnostic lines for deterministic parity comparison.

    Args:
        stream: Combined fixture stdout and stderr.

    Returns:
        Sorted normalized diagnostic lines.
    """
    normalized: list[str] = []
    for line in stream.replace("\r\n", "\n").splitlines():
        if not re.search(r"error TS\d+", line):
            continue
        line = line.replace("\\", "/")
        line = line.replace("C:/fixture/repo/", "").replace("/fixture/repo/", "")
        normalized.append(line.strip())
    return sorted(normalized)


class DiagnosticParityError(AssertionError):
    """Report a parity rejection together with the exact compiler streams that caused it."""

    def __init__(
        self,
        message: str,
        *,
        raw_streams: dict[str, dict[str, str]],
        subprocess_evidence: list[dict[str, Any]],
    ) -> None:
        """Initialize a parity failure with auditable raw compiler evidence.

        Args:
            message: Reason that the parity comparison rejected the runs.
            raw_streams: Unmodified stdout and stderr from the compared compiler pair.
            subprocess_evidence: Process evidence for that same compiler pair.
        """
        super().__init__(message)
        self.raw_streams = raw_streams
        self.subprocess_evidence = subprocess_evidence


def run_diagnostic_parity(
    ts6_command: Sequence[str] | Sequence[object],
    ts7_command: Sequence[str] | Sequence[object],
    *,
    ledger: Sequence[dict[str, Any]],
    tsconfig_path: str = "fixture",
) -> dict[str, Any]:
    """Run two real compiler fixtures and reject unexplained diagnostic differences.

    Args:
        ts6_command: TS6 fixture command or an empty sequence for a vacuity probe.
        ts7_command: TS7 fixture command or an empty sequence for a vacuity probe.
        ledger: Reviewed exception records for intentional differences.
        tsconfig_path: Config identity that binds reviewed exception records.

    Returns:
        Parity report with subprocess evidence and raw streams from the compared pair.

    Raises:
        AssertionError: When a diagnostic is missing, added, changed, or no runs occur.
    """
    if not ts6_command or not ts7_command:
        raise AssertionError("zero compiler runs")
    ts6, evidence6 = _launch([str(item) for item in ts6_command])
    ts7, evidence7 = _launch([str(item) for item in ts7_command])
    raw_streams = {
        "ts6": {"stdout": ts6.stdout, "stderr": ts6.stderr},
        "ts7": {"stdout": ts7.stdout, "stderr": ts7.stderr},
    }
    subprocess_evidence = [evidence6, evidence7]

    def fail(message: str) -> None:
        """Raise an auditable parity rejection for the already-run compiler pair.

        Args:
            message: Reason that the parity comparison rejected the pair.

        Raises:
            DiagnosticParityError: Always, with the original process evidence attached.
        """
        raise DiagnosticParityError(
            message,
            raw_streams=raw_streams,
            subprocess_evidence=subprocess_evidence,
        )

    signaled_compilers = [
        (name, completed.returncode)
        for name, completed in (("ts6", ts6), ("ts7", ts7))
        if completed.returncode < 0
    ]
    if signaled_compilers:
        compiler, returncode = signaled_compilers[0]
        fail(f"compiler runtime failure: {compiler} terminated by signal {-returncode}")
    if (ts6.returncode == 0) != (ts7.returncode == 0):
        fail("compiler success semantics differ")
    left = _normalized_diagnostics(ts6.stdout + ts6.stderr)
    right = _normalized_diagnostics(ts7.stdout + ts7.stderr)
    reviewed_entries: list[dict[str, Any]] = []
    for item in ledger:
        if not isinstance(item, dict):
            raise AssertionError("ledger entry must be an object")
        required = {"diagnostic", "tsconfig_path", "absent_from", "reviewed_by", "reviewed_at", "reason"}
        if required - set(item):
            fail("ledger entry missing reviewed metadata")
        if not all(isinstance(item[key], str) and item[key] for key in required):
            fail("ledger entry fields must be non-empty strings")
        if item["absent_from"] not in {"ts6", "ts7"}:
            fail("ledger entry has invalid compiler side")
        if item["tsconfig_path"] == tsconfig_path:
            reviewed_entries.append(item)
    reviewed = {
        (item["diagnostic"], item["absent_from"])
        for item in reviewed_entries
    }
    missing = [
        diagnostic
        for diagnostic in left
        if diagnostic not in right and (diagnostic, "ts7") not in reviewed
    ]
    added = [
        diagnostic
        for diagnostic in right
        if diagnostic not in left and (diagnostic, "ts6") not in reviewed
    ]
    if missing:
        fail(f"missing TS 7 diagnostic: {missing[0]}")
    if added:
        fail(f"additional TS 7 diagnostic: {added[0]}")
    applied_ledger_entries = [
        item
        for item in reviewed_entries
        if (
            item["absent_from"] == "ts7"
            and item["diagnostic"] in left
            and item["diagnostic"] not in right
        )
        or (
            item["absent_from"] == "ts6"
            and item["diagnostic"] in right
            and item["diagnostic"] not in left
        )
    ]
    if len(applied_ledger_entries) != len(reviewed_entries):
        fail("unused reviewed parity ledger entry")
    return {
        "compiler_runs": 2,
        "tsconfig_path": tsconfig_path,
        "unexplained_differences": [],
        "applied_ledger_entries": applied_ledger_entries,
        "subprocess_evidence": subprocess_evidence,
        "raw_streams": raw_streams,
    }


def _integer(record: dict[str, Any], key: str, *, minimum: int | None = None) -> int:
    """Read a strict integer field from a benchmark fixture.

    Args:
        record: Fixture record containing the field.
        key: Field name to read.
        minimum: Optional inclusive lower bound.

    Returns:
        Validated integer value.

    Raises:
        AssertionError: When a field is missing, boolean, non-integer, or below bound.
    """
    value = record.get(key)
    if isinstance(value, bool) or not isinstance(value, int):
        raise AssertionError(f"{key} must be an integer")
    if minimum is not None and value < minimum:
        raise AssertionError(f"{key} must be at least {minimum}")
    return value


def _swap_used_kib() -> int:
    """Read current host swap use from /proc/meminfo.

    Returns:
        Swap usage in KiB.

    Raises:
        AssertionError: When the host does not expose valid swap counters.
    """
    values: dict[str, int] = {}
    for line in Path("/proc/meminfo").read_text(encoding="utf-8").splitlines():
        key, value, *_ = line.split()
        if key in {"SwapTotal:", "SwapFree:"}:
            values[key] = int(value)
    if {"SwapTotal:", "SwapFree:"} - set(values):
        raise AssertionError("host swap counters are unavailable")
    return values["SwapTotal:"] - values["SwapFree:"]


def _sample_idle_percent() -> int | None:
    """Sample vmstat and return the final observed CPU idle percentage.

    Returns:
        CPU idle percent, or None when vmstat cannot produce a usable sample.
    """
    try:
        completed = subprocess.run(
            ["vmstat", "1", "3"],
            cwd=REPO_ROOT,
            check=False,
            capture_output=True,
            text=True,
            timeout=6,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if completed.returncode != 0:
        return None
    lines = [line.split() for line in completed.stdout.splitlines() if line.split()]
    header = next((line for line in lines if "id" in line), None)
    data_rows = [line for line in lines if header is not None and len(line) == len(header) and line != header]
    if header is None or not data_rows:
        return None
    try:
        return int(data_rows[-1][header.index("id")])
    except (ValueError, IndexError):
        return None


def _pgid_members(pgid: int, *, include_zombies: bool = True) -> list[int]:
    """List currently visible Linux process IDs in one process group.

    Args:
        pgid: Process group identifier to inspect.
        include_zombies: Whether unreaped zombie entries count as members.

    Returns:
        Sorted process IDs currently reporting the supplied process group.
    """
    members: list[int] = []
    for stat_path in Path("/proc").glob("[0-9]*/stat"):
        try:
            raw = stat_path.read_text(encoding="utf-8")
            fields = raw[raw.rfind(")") + 2 :].split()
            if (
                len(fields) >= 3
                and int(fields[2]) == pgid
                and (include_zombies or fields[0] != "Z")
            ):
                members.append(int(stat_path.parent.name))
        except (OSError, ValueError):
            continue
    return sorted(members)


def _pgid_rss_kib(pgid: int) -> tuple[int, int]:
    """Measure visible members and aggregate resident memory for a process group.

    Args:
        pgid: Process group identifier to inspect.

    Returns:
        Member count and aggregate VmRSS in KiB.
    """
    members = _pgid_members(pgid)
    total = 0
    for pid in members:
        try:
            for line in (Path("/proc") / str(pid) / "status").read_text(encoding="utf-8").splitlines():
                if line.startswith("VmRSS:"):
                    total += int(line.split()[1])
                    break
        except (OSError, ValueError, IndexError):
            continue
    return len(members), total


def _dmesg_snapshot() -> tuple[str, list[str]]:
    """Capture readable kernel messages for a before/after OOM comparison.

    Returns:
        Availability status and complete kernel-message lines when readable.
    """
    try:
        completed = subprocess.run(
            ["dmesg", "--color=never"],
            cwd=REPO_ROOT,
            check=False,
            capture_output=True,
            text=True,
            timeout=3,
        )
    except (OSError, subprocess.TimeoutExpired):
        return "unavailable", []
    if completed.returncode != 0:
        return "unavailable", []
    return "available", completed.stdout.splitlines()


def _new_oom_kill_count(before: list[str], after: list[str]) -> int:
    """Count OOM-kill lines introduced between two ordered kernel snapshots.

    Args:
        before: Kernel lines observed before a benchmark process started.
        after: Kernel lines observed after that process ended.

    Returns:
        Count of newly observed OOM-kill messages.
    """
    if len(after) >= len(before) and after[: len(before)] == before:
        new_lines = after[len(before) :]
    else:
        previous = set(before)
        new_lines = [line for line in after if line not in previous]
    return sum(
        1
        for line in new_lines
        if "out of memory" in line.lower() or "oom-kill" in line.lower()
    )


def _terminate_and_reap_process_group(pgid: int, *, grace_seconds: int = 5) -> dict[str, Any]:
    """Terminate every member of a process group and verify bounded reaping.

    Args:
        pgid: Process group identifier to terminate.
        grace_seconds: Exact SIGTERM grace interval before SIGKILL escalation.

    Returns:
        Signals sent, remaining process IDs, and reaping status.

    Raises:
        AssertionError: When a process group survives the bounded cleanup deadline.
    """
    events: list[str] = []
    try:
        os.killpg(pgid, signal.SIGTERM)
        events.append("SIGTERM")
    except ProcessLookupError:
        return {"events": events, "reaped": True, "surviving_pids": []}
    events.append(f"grace:{grace_seconds}s")
    time.sleep(grace_seconds)
    if _pgid_members(pgid, include_zombies=False):
        try:
            os.killpg(pgid, signal.SIGKILL)
            events.append("SIGKILL")
        except ProcessLookupError:
            pass
    deadline = time.monotonic() + 1
    survivors = _pgid_members(pgid, include_zombies=False)
    while survivors and time.monotonic() < deadline:
        time.sleep(0.05)
        survivors = _pgid_members(pgid, include_zombies=False)
    if survivors:
        raise AssertionError(f"process group was not reaped: {survivors}")
    events.append("reaped")
    return {"events": events, "reaped": True, "surviving_pids": []}


def _run_timed_process(
    command: Sequence[str],
    *,
    swap_before_kib: int,
    stop_loss_process_group_rss_kib: int,
    stop_loss_swap_delta_kib: int,
    threshold_start_after_seconds: float = 0,
) -> tuple[subprocess.CompletedProcess[str], dict[str, Any], dict[str, Any]]:
    """Run a fixture through /usr/bin/time while sampling its process group.

    Args:
        command: Executable and arguments to launch without a shell.
        swap_before_kib: Host swap usage captured immediately before launch.
        stop_loss_process_group_rss_kib: RSS threshold that aborts the group.
        stop_loss_swap_delta_kib: Positive swap-growth threshold that aborts the group.
        threshold_start_after_seconds: Fixture-only startup grace before evaluating thresholds.

    Returns:
        Completed process, immutable launch evidence, and measured resource signals.
    """
    if not command or not all(isinstance(part, str) and part for part in command):
        raise AssertionError("subprocess command must be a non-empty string sequence")
    wrapped = ["/usr/bin/time", "-v", *command]
    started_at = _now()
    started_monotonic = time.monotonic()
    process = subprocess.Popen(
        wrapped,
        cwd=REPO_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=True,
    )
    pgid = os.getpgid(process.pid)
    peak_group_rss = 0
    max_process_count = 0
    stop_loss: dict[str, Any] = {
        "triggered": False,
        "trigger": None,
        "events": [],
        "reaped": True,
        "surviving_pids": [],
    }
    try:
        while process.poll() is None:
            process_count, group_rss = _pgid_rss_kib(pgid)
            peak_group_rss = max(peak_group_rss, group_rss)
            max_process_count = max(max_process_count, process_count)
            swap_growth = _swap_used_kib() - swap_before_kib
            trigger = None
            if time.monotonic() - started_monotonic >= threshold_start_after_seconds:
                trigger = (
                    "process_group_rss"
                    if group_rss > stop_loss_process_group_rss_kib
                    else "swap_delta"
                    if swap_growth > stop_loss_swap_delta_kib
                    else None
                )
            if trigger is not None:
                stop_loss = {
                    "triggered": True,
                    "trigger": trigger,
                    **_terminate_and_reap_process_group(pgid),
                }
                break
            time.sleep(0.25)
    finally:
        if _pgid_members(pgid, include_zombies=False):
            cleanup = _terminate_and_reap_process_group(pgid)
            if not stop_loss["triggered"]:
                stop_loss = {"triggered": True, "trigger": "cleanup", **cleanup}
    stdout, stderr = process.communicate()
    process_count, group_rss = _pgid_rss_kib(pgid)
    peak_group_rss = max(peak_group_rss, group_rss)
    max_process_count = max(max_process_count, process_count)
    completed = subprocess.CompletedProcess(wrapped, process.returncode, stdout, stderr)
    evidence = {
        "command": wrapped,
        "target_command": list(command),
        "pid": process.pid,
        "pgid": pgid,
        "exit_status": process.returncode,
        "stdout_sha256": hashlib.sha256(stdout.encode("utf-8")).hexdigest(),
        "stderr_sha256": hashlib.sha256(stderr.encode("utf-8")).hexdigest(),
        "started_at": started_at,
        "ended_at": _now(),
        "mocked": False,
    }
    try:
        timed = parse_time_output(stderr)
        time_measurement_available = True
    except AssertionError:
        if not stop_loss["triggered"]:
            raise
        timed = {"elapsed_ms": None, "peak_rss_kib": None}
        time_measurement_available = False
    return completed, evidence, {
        "elapsed_ms": timed["elapsed_ms"],
        "peak_rss_kib": timed["peak_rss_kib"],
        "process_group_peak_rss_kib": peak_group_rss,
        "process_count": max_process_count,
        "time_measurement_available": time_measurement_available,
        "stop_loss": stop_loss,
    }


def run_benchmark_contract(
    command: Sequence[str], record: dict[str, Any], *, expected_diagnostic_count: int
) -> dict[str, Any]:
    """Run a benchmark fixture and validate fail-closed resource and diagnostic evidence.

    Args:
        command: Benchmark fixture command.
        record: Resource signal fixture.
        expected_diagnostic_count: Diagnostic count required by parity evidence.

    Returns:
        Validated benchmark record with subprocess evidence.

    Raises:
        AssertionError: When resource values are malformed, exceed ceilings, or hide diagnostics.
    """
    fixture_elapsed_ms = _integer(record, "elapsed_ms", minimum=0)
    fixture_peak_rss_kib = _integer(record, "peak_rss_kib", minimum=0)
    fixture_swap_delta_kib = _integer(record, "swap_delta_kib")
    max_rss = _integer(record, "max_process_group_rss_kib", minimum=1)
    max_swap = _integer(record, "max_swap_delta_kib", minimum=1)
    stop_rss = _integer(record, "stop_loss_process_group_rss_kib", minimum=1)
    stop_swap = _integer(record, "stop_loss_swap_delta_kib", minimum=0)
    startup_grace = record.get("fixture_startup_grace_seconds", 0)
    if isinstance(startup_grace, bool) or not isinstance(startup_grace, (int, float)):
        raise AssertionError("fixture startup grace must be numeric")
    if startup_grace < 0 or startup_grace > 1:
        raise AssertionError("fixture startup grace must be within one second")
    fixture_diagnostic_count = _integer(record, "diagnostic_count", minimum=0)
    fixture_idle = _integer(record, "cpu_idle_percent", minimum=0)
    dmesg_status = record.get("dmesg_status")
    if dmesg_status not in {"available", "unavailable"}:
        raise AssertionError("dmesg_status must be available or unavailable")
    if fixture_peak_rss_kib > max_rss or fixture_swap_delta_kib > max_swap:
        raise AssertionError("resource ceiling exceeded")
    if stop_rss != (max_rss * 80) // 100 or stop_swap != max_swap // 2:
        raise AssertionError("stop-loss thresholds must be exact 80% RSS and 50% swap")
    if fixture_diagnostic_count != expected_diagnostic_count:
        raise AssertionError("false speedup: diagnostic count differs from parity evidence")
    idle_before = _sample_idle_percent()
    swap_before = _swap_used_kib()
    dmesg_before_status, dmesg_before = _dmesg_snapshot()
    completed, evidence, timed = _run_timed_process(
        command,
        swap_before_kib=swap_before,
        stop_loss_process_group_rss_kib=stop_rss,
        stop_loss_swap_delta_kib=stop_swap,
        threshold_start_after_seconds=float(startup_grace),
    )
    swap_delta_kib = _swap_used_kib() - swap_before
    dmesg_after_status, dmesg_after = _dmesg_snapshot()
    dmesg_live_status = (
        "available"
        if dmesg_before_status == "available" and dmesg_after_status == "available"
        else "unavailable"
    )
    oom_kill_count = (
        _new_oom_kill_count(dmesg_before, dmesg_after)
        if dmesg_live_status == "available"
        else 0
    )
    actual_diagnostic_count = len(_normalized_diagnostics(completed.stdout + completed.stderr))
    if completed.returncode != 0 and not timed["stop_loss"]["triggered"]:
        raise AssertionError(f"benchmark subprocess exited {completed.returncode}")
    if actual_diagnostic_count != expected_diagnostic_count:
        raise AssertionError("false speedup: measured diagnostic count differs from parity evidence")
    invalid_reasons: list[str] = []
    if fixture_idle < 70 or idle_before is None or idle_before < 70:
        invalid_reasons.append("host_not_idle")
    if timed["process_group_peak_rss_kib"] is not None and timed["process_group_peak_rss_kib"] > max_rss:
        invalid_reasons.append("process_group_rss_ceiling")
    if swap_delta_kib > max_swap:
        invalid_reasons.append("swap_ceiling")
    if dmesg_live_status == "available" and oom_kill_count:
        invalid_reasons.append("oom_kill_observed")
    if timed["stop_loss"]["triggered"]:
        invalid_reasons.append(f"stop_loss:{timed['stop_loss']['trigger']}")
    return {
        "elapsed_ms": timed["elapsed_ms"],
        "peak_rss_kib": timed["peak_rss_kib"],
        "process_group_peak_rss_kib": timed["process_group_peak_rss_kib"],
        "swap_delta_kib": swap_delta_kib,
        "diagnostic_count": actual_diagnostic_count,
        "exit_status": completed.returncode,
        "signal": -completed.returncode if completed.returncode < 0 else None,
        "dmesg_status": dmesg_live_status,
        "oom_kill_count": oom_kill_count,
        "process_count": timed["process_count"],
        "host_idle_percent": idle_before,
        "host_idle_class": "invalid" if invalid_reasons else "idle",
        "invalid_reasons": invalid_reasons,
        "stop_loss": timed["stop_loss"],
        "fixture_resource_input": {
            "elapsed_ms": fixture_elapsed_ms,
            "peak_rss_kib": fixture_peak_rss_kib,
            "swap_delta_kib": fixture_swap_delta_kib,
            "cpu_idle_percent": fixture_idle,
            "dmesg_status": dmesg_status,
        },
        "subprocess_evidence": [evidence],
    }


def parse_time_output(output: str) -> dict[str, int]:
    """Parse labeled /usr/bin/time -v output without digit-only matching.

    Args:
        output: Full time command output.

    Returns:
        Elapsed milliseconds and maximum RSS in KiB.

    Raises:
        AssertionError: When either required labeled measurement is absent or malformed.
    """
    elapsed_match = re.search(r"Elapsed \(wall clock\) time \(h:mm:ss or m:ss\):\s*([^\n]+)", output)
    rss_match = re.search(r"Maximum resident set size \(kbytes\):\s*(\d+)", output)
    if not elapsed_match or not rss_match:
        raise AssertionError("labeled /usr/bin/time -v measurements are required")
    value = elapsed_match.group(1).strip()
    pieces = value.split(":")
    try:
        seconds = float(pieces[-1]) + (int(pieces[-2]) * 60 if len(pieces) > 1 else 0)
        if len(pieces) == 3:
            seconds += int(pieces[0]) * 3600
    except ValueError as error:
        raise AssertionError("invalid elapsed time value") from error
    return {"elapsed_ms": int(seconds * 1000), "peak_rss_kib": int(rss_match.group(1))}


def summarize_benchmark_samples(samples: Sequence[dict[str, Any]]) -> dict[str, int]:
    """Require three cold and three warm samples and compute their medians.

    Args:
        samples: Temperature-tagged benchmark sample records.

    Returns:
        Sample counts and integer medians for cold and warm measurements.

    Raises:
        AssertionError: When either temperature lacks three valid samples.
    """
    groups: dict[str, list[int]] = {"cold": [], "warm": []}
    for sample in samples:
        if not isinstance(sample, dict):
            raise AssertionError("benchmark sample must be an object")
        temperature = sample.get("temperature")
        elapsed_ms = sample.get("elapsed_ms")
        if (
            temperature not in groups
            or isinstance(elapsed_ms, bool)
            or not isinstance(elapsed_ms, int)
            or elapsed_ms < 0
        ):
            raise AssertionError("benchmark sample has invalid temperature or elapsed_ms")
        groups[temperature].append(elapsed_ms)
    if len(groups["cold"]) < 3 or len(groups["warm"]) < 3:
        raise AssertionError("three cold and three warm samples are required")
    return {
        "cold_sample_count": len(groups["cold"]),
        "warm_sample_count": len(groups["warm"]),
        "cold_median_ms": int(statistics.median(groups["cold"])),
        "warm_median_ms": int(statistics.median(groups["warm"])),
    }


def run_stop_loss_contract(
    command: Sequence[str], *, terminate_after_ms: int, sigterm_grace_seconds: int
) -> dict[str, Any]:
    """Exercise bounded process-group termination against a real SIGTERM-ignoring fixture.

    Args:
        command: Long-running fixture command.
        terminate_after_ms: Delay before signaling the process group.
        sigterm_grace_seconds: Bounded grace period before SIGKILL.

    Returns:
        Process-group stop-loss evidence with reap confirmation.

    Raises:
        AssertionError: When the required five-second grace period is not requested.
    """
    if sigterm_grace_seconds != 5:
        raise AssertionError("stop-loss grace must be exactly five seconds")
    started_at = _now()
    process = subprocess.Popen(
        list(command), cwd=REPO_ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, start_new_session=True,
    )
    pgid = os.getpgid(process.pid)
    time.sleep(terminate_after_ms / 1000)
    cleanup = _terminate_and_reap_process_group(
        pgid, grace_seconds=sigterm_grace_seconds
    )
    stdout, stderr = process.communicate()
    evidence = {
        "command": list(command), "pid": process.pid, "pgid": pgid,
        "exit_status": process.returncode,
        "stdout_sha256": hashlib.sha256(stdout.encode("utf-8")).hexdigest(),
        "stderr_sha256": hashlib.sha256(stderr.encode("utf-8")).hexdigest(),
        "started_at": started_at, "ended_at": _now(), "mocked": False,
    }
    return {
        "signal_target": "process_group",
        "events": cleanup["events"],
        "reaped": cleanup["reaped"],
        "surviving_pids": cleanup["surviving_pids"],
        "subprocess_evidence": [evidence],
    }


def run_cache_invalidation_contract(
    baseline_command: Sequence[str], changed_command: Sequence[str]
) -> dict[str, Any]:
    """Validate modeled cache invalidation when compiler identity changes.

    Args:
        baseline_command: Fixture command for the original compiler identity.
        changed_command: Fixture command for a potentially changed compiler identity.

    Returns:
        Cache invalidation report with real subprocess evidence.

    Raises:
        AssertionError: When identity does not change or the task remains cached.
    """
    baseline, baseline_evidence = _decode_json_process(baseline_command)
    changed, changed_evidence = _decode_json_process(changed_command)
    if baseline.get("compiler_identity") == changed.get("compiler_identity"):
        raise AssertionError("compiler identity did not change")
    if changed.get("cache_state") != "BYPASSED" or changed.get("task_executed") is not True:
        raise AssertionError("compiler identity change must bypass cache and reexecute task")
    return {"cache_bypassed": True, "task_reexecuted": True, "subprocess_evidence": [baseline_evidence, changed_evidence]}


def _classify_with_evidence(
    command: Sequence[str], *, expected_consumer: str | None = None
) -> tuple[str, dict[str, Any]]:
    """Classify one consumer probe while preserving its subprocess evidence.

    Args:
        command: Consumer probe fixture command.
        expected_consumer: Optional identity that the fixture output must confirm.

    Returns:
        Consumer classification and operating-system launch evidence.

    Raises:
        AssertionError: When the probe is non-zero, missing, or ambiguous.
    """
    result, evidence = _decode_json_process(command)
    if expected_consumer is not None and result.get("consumer") != expected_consumer:
        raise AssertionError("consumer identity does not match probe row")
    if "programmatic_api_paths" in result or "resolved_versions" in result:
        raise AssertionError("ambiguous compiler ownership")
    if "programmatic_api_path" not in result or "resolved_version" not in result:
        raise AssertionError("missing resolution evidence")
    path = result["programmatic_api_path"]
    version = result["resolved_version"]
    if path is None and version is None:
        return "no programmatic API found", evidence
    if not isinstance(path, str) or not isinstance(version, str):
        raise AssertionError("missing resolution evidence")
    if "/typescript7/" in path and version == "7.0.2":
        return "binding (TS 7)", evidence
    if "/typescript/" in path and "/typescript7/" not in path and version == "6.0.2":
        return "binding (TS 6)", evidence
    raise AssertionError("ambiguous compiler ownership")


def classify_consumer(command: Sequence[str]) -> str:
    """Classify a single consumer fixture through a real subprocess probe.

    Args:
        command: Consumer probe fixture command.

    Returns:
        One approved ownership classification.
    """
    classification, _ = _classify_with_evidence(command)
    return classification


def _verified_fixture_path(fixture: str, manifest: dict[str, Any]) -> Path:
    """Resolve one manifest-pinned fixture without permitting path escape.

    Args:
        fixture: Repository-relative fixture path supplied by the matrix.
        manifest: Parsed fixture manifest containing SHA-256 digests.

    Returns:
        Canonical absolute path for a hash-verified fixture.

    Raises:
        AssertionError: When a path is absolute, escapes the fixture root, is undeclared, or changed.
    """
    candidate = Path(fixture)
    if candidate.is_absolute():
        raise AssertionError("fixture path must be relative")
    resolved = (FIXTURE_ROOT / candidate).resolve()
    try:
        relative = resolved.relative_to(FIXTURE_ROOT.resolve()).as_posix()
    except ValueError as error:
        raise AssertionError("fixture path escapes the canonical fixture root") from error
    declared = manifest.get("files") if isinstance(manifest, dict) else None
    if not isinstance(declared, dict) or relative not in declared:
        raise AssertionError("fixture is not declared in the manifest")
    if not resolved.is_file():
        raise AssertionError("declared fixture is missing")
    actual_hash = hashlib.sha256(resolved.read_bytes()).hexdigest()
    if declared[relative] != actual_hash:
        raise AssertionError("fixture hash does not match manifest")
    return resolved


def run_consumer_smoke_matrix(matrix: dict[str, Any], *, fixture_root: Path) -> dict[str, Any]:
    """Run every ownership-matrix fixture and require its expected classification.

    Args:
        matrix: Consumer matrix fixture object.
        fixture_root: Root directory containing fixture files and runner.

    Returns:
        Consumer count, names, and subprocess evidence rows.

    Raises:
        AssertionError: When a matrix row is malformed or has an unexpected result.
    """
    rows = matrix.get("rows") if isinstance(matrix, dict) else None
    if not isinstance(rows, list) or not rows:
        raise AssertionError("consumer matrix rows are required")
    if fixture_root.resolve() != FIXTURE_ROOT.resolve():
        raise AssertionError("consumer fixtures must use the canonical fixture root")
    manifest_path = FIXTURE_ROOT / "fixture-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    runner_path = _verified_fixture_path("runner-fixtures/fixture_executable.py", manifest)
    evidence: list[dict[str, Any]] = []
    consumers: list[str] = []
    for row in rows:
        if not isinstance(row, dict):
            raise AssertionError("consumer matrix row must be an object")
        consumer, fixture, expected = row.get("consumer"), row.get("fixture"), row.get("expected")
        if not all(isinstance(value, str) and value for value in (consumer, fixture, expected)):
            raise AssertionError("consumer matrix row is incomplete")
        fixture_path = _verified_fixture_path(fixture, manifest)
        command = [
            sys.executable,
            "-B",
            str(runner_path),
            str(fixture_path),
            "--consumer",
            consumer,
        ]
        classification, launch = _classify_with_evidence(
            command, expected_consumer=consumer
        )
        if classification != expected:
            raise AssertionError(f"unexpected consumer classification for {consumer}")
        consumers.append(consumer)
        evidence.append(launch)
    return {"consumer_count": len(consumers), "consumers": consumers, "subprocess_evidence": evidence}
