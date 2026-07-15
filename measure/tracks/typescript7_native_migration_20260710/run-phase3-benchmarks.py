#!/usr/bin/env python3
"""Run the bounded live TypeScript 6/7 benchmark matrix and persist evidence."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import signal
import statistics
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from measure.tests.typescript7_phase2_harness import parse_time_output, summarize_benchmark_samples


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / "typescript7_native_migration_20260710"
EVIDENCE_ROOT = TRACK_DIR / "evidence" / "phase-3g"
BASELINE_PATH = TRACK_DIR / "compiler-baseline.json"
TS6_TSC = REPO_ROOT / "node_modules" / "typescript" / "bin" / "tsc"
TS7_TSC = REPO_ROOT / "node_modules" / "typescript7" / "bin" / "tsc"
TIME = Path("/usr/bin/time")
DIAGNOSTIC_PATTERN = re.compile(r"\berror TS\d+:")


@dataclass(frozen=True)
class BenchmarkTarget:
    """Defines one compiler benchmark surface and its direct or Turbo invocation form."""

    identifier: str
    tsconfig_path: str
    kind: str
    ts6_heap_mib: int | None = None


TARGETS: tuple[BenchmarkTarget, ...] = (
    BenchmarkTarget("packages-types", "packages/types/tsconfig.json", "direct"),
    BenchmarkTarget("packages-db", "packages/db/tsconfig.json", "direct"),
    BenchmarkTarget("packages-domain", "packages/domain/tsconfig.json", "direct"),
    BenchmarkTarget(
        "apps-reading-advantage",
        "apps/reading-advantage/tsconfig.json",
        "direct",
        3072,
    ),
    BenchmarkTarget("full-check-types-graph", "turbo:check-types", "turbo"),
)


def _now() -> str:
    """Return an ISO-8601 UTC timestamp for an evidence record.

    Returns:
        Timestamp with timezone information.
    """
    return datetime.now(timezone.utc).isoformat()


def _sha256_bytes(value: bytes) -> str:
    """Return a lowercase SHA-256 digest for evidence content.

    Args:
        value: Byte content to hash.

    Returns:
        Content digest.
    """
    return hashlib.sha256(value).hexdigest()


def _sha256_file(path: Path) -> str:
    """Return a lowercase SHA-256 digest for an existing regular file.

    Args:
        path: File whose immutable content is recorded.

    Returns:
        Content digest.

    Raises:
        AssertionError: When the path is not a regular file.
    """
    if not path.is_file():
        raise AssertionError(f"missing evidence input: {path}")
    return _sha256_bytes(path.read_bytes())


def _run(command: list[str], *, cwd: Path = REPO_ROOT) -> subprocess.CompletedProcess[str]:
    """Run a local command and return captured UTF-8 output without masking failure.

    Args:
        command: Command argument vector.
        cwd: Working directory for the command.

    Returns:
        Completed command result.
    """
    return subprocess.run(command, cwd=cwd, check=False, capture_output=True, text=True)


def _git_output(*args: str) -> str:
    """Return stdout from one repository-local Git command.

    Args:
        *args: Arguments excluding the Git executable.

    Returns:
        UTF-8 command output.

    Raises:
        AssertionError: When Git cannot produce the requested evidence.
    """
    completed = _run(["git", *args])
    if completed.returncode != 0:
        raise AssertionError(f"git evidence command failed: {' '.join(args)}")
    return completed.stdout


def _swap_used_kib() -> int:
    """Read current swap consumption from procfs.

    Returns:
        Used swap in KiB.

    Raises:
        AssertionError: When procfs omits required swap fields.
    """
    fields: dict[str, int] = {}
    for line in Path("/proc/meminfo").read_text(encoding="utf-8").splitlines():
        key, raw_value = line.split(":", 1)
        pieces = raw_value.split()
        if pieces and pieces[0].isdigit():
            fields[key] = int(pieces[0])
    if "SwapTotal" not in fields or "SwapFree" not in fields:
        raise AssertionError("procfs does not expose SwapTotal and SwapFree")
    return fields["SwapTotal"] - fields["SwapFree"]


def _idle_percent() -> int | None:
    """Sample CPU idle percentage using the required three vmstat observations.

    Returns:
        Final vmstat idle percentage, or None when vmstat output is unavailable.
    """
    completed = _run(["vmstat", "1", "3"])
    if completed.returncode != 0:
        return None
    rows = [line.split() for line in completed.stdout.splitlines() if line.split()]
    if len(rows) < 3:
        return None
    last = rows[-1]
    if len(last) < 15 or not last[14].isdigit():
        return None
    return int(last[14])


def _dmesg_status() -> tuple[str, str]:
    """Capture kernel OOM observability without treating denied access as zero events.

    Returns:
        Availability status and raw kernel output when readable.
    """
    completed = _run(["dmesg", "--level=err,crit,alert,emerg"])
    if completed.returncode != 0:
        return "unavailable", ""
    return "available", completed.stdout


def _oom_count(kernel_log: str) -> int:
    """Count OOM-killer markers in one kernel-log snapshot.

    Args:
        kernel_log: Raw readable kernel log content.

    Returns:
        Number of OOM-killer markers.
    """
    return len(re.findall(r"(?:Out of memory|Killed process|oom-kill)", kernel_log, re.IGNORECASE))


def _process_group_stats(pgid: int) -> tuple[int, int]:
    """Return aggregate RSS and member count for a spawned process group.

    Args:
        pgid: Process group identifier sampled through procfs.

    Returns:
        Aggregate VmRSS in KiB and number of live members.
    """
    rss_kib = 0
    members = 0
    for entry in Path("/proc").iterdir():
        if not entry.name.isdigit():
            continue
        try:
            stat = (entry / "stat").read_text(encoding="utf-8")
            remainder = stat.rsplit(")", 1)[1].split()
            process_group = int(remainder[2])
            if process_group != pgid:
                continue
            status = (entry / "status").read_text(encoding="utf-8")
        except (FileNotFoundError, IndexError, ValueError, PermissionError):
            continue
        members += 1
        for line in status.splitlines():
            if line.startswith("VmRSS:"):
                pieces = line.split()
                if len(pieces) >= 2 and pieces[1].isdigit():
                    rss_kib += int(pieces[1])
                break
    return rss_kib, members


def _terminate_process_group(pgid: int) -> dict[str, Any]:
    """Terminate an over-limit process group with the required bounded grace period.

    Args:
        pgid: Process group to terminate and reap.

    Returns:
        Termination events and remaining process count.
    """
    events: list[str] = []
    try:
        os.killpg(pgid, signal.SIGTERM)
        events.append("SIGTERM")
    except ProcessLookupError:
        return {"events": events, "surviving_members": 0}
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        _, members = _process_group_stats(pgid)
        if members == 0:
            return {"events": events, "surviving_members": 0}
        time.sleep(0.1)
    try:
        os.killpg(pgid, signal.SIGKILL)
        events.append("SIGKILL")
    except ProcessLookupError:
        pass
    time.sleep(0.1)
    _, members = _process_group_stats(pgid)
    return {"events": events, "surviving_members": members}


def _compiler_command(target: BenchmarkTarget, compiler: str, checkers: int) -> tuple[list[str], dict[str, str]]:
    """Build the exact direct or Turbo command for one benchmark sample.

    Args:
        target: Target surface being benchmarked.
        compiler: Compiler cohort identifier, either ts6 or ts7.
        checkers: Validated checker count for TypeScript 7 runs.

    Returns:
        Command argument vector and environment additions.

    Raises:
        AssertionError: When an unsupported compiler cohort is requested.
    """
    if compiler not in {"ts6", "ts7"}:
        raise AssertionError(f"unsupported compiler cohort: {compiler}")
    environment = {"TURBO_CONCURRENCY": "1"}
    if target.kind == "direct":
        if compiler == "ts6":
            command = [str(TS6_TSC), "--noEmit", "-p", target.tsconfig_path]
            if target.ts6_heap_mib is not None:
                command = [
                    shutil.which("node") or "node",
                    f"--max-old-space-size={target.ts6_heap_mib}",
                    *command,
                ]
            return command, environment
        return [str(TS7_TSC), "--noEmit", "--checkers", str(checkers), "-p", target.tsconfig_path], environment

    cache_dir = Path(os.environ["TS7_BENCHMARK_CACHE_DIR"])
    environment["TS7_CHECKERS"] = str(checkers)
    task = "check-types:compat" if compiler == "ts6" else "check-types"
    command = [
        "pnpm",
        "turbo",
        "run",
        task,
        "--concurrency=1",
        "--cache-dir",
        str(cache_dir),
        "--summarize",
        "--json",
    ]
    return command, environment


def _read_turbo_summary() -> tuple[dict[str, Any] | None, str | None]:
    """Load Turbo's generated summary when a graph command produced one.

    Returns:
        Parsed summary object and its content digest, or None values when absent.
    """
    summary = REPO_ROOT / "turbo-summary.json"
    if not summary.is_file():
        return None, None
    contents = summary.read_bytes()
    try:
        parsed = json.loads(contents.decode("utf-8"))
    except json.JSONDecodeError:
        return None, _sha256_bytes(contents)
    return parsed if isinstance(parsed, dict) else None, _sha256_bytes(contents)


def _cache_state(summary: dict[str, Any] | None, temperature: str, target: BenchmarkTarget) -> str:
    """Classify direct or Turbo cache behavior without making cache state ambiguous.

    Args:
        summary: Parsed Turbo run summary when the sample used Turbo.
        temperature: Requested cold or warm benchmark temperature.
        target: Target surface being classified.

    Returns:
        Human-readable cache classification.
    """
    if target.kind == "direct":
        return "not_applicable_direct_tsc"
    if not summary:
        return "missing_turbo_summary"
    cache = summary.get("cache")
    if isinstance(cache, dict) and isinstance(cache.get("status"), str):
        return cache["status"]
    return "forced_cold" if temperature == "cold" else "warm_summary_unclassified"


def _run_sample(
    target: BenchmarkTarget,
    compiler: str,
    checkers: int,
    temperature: str,
    ordinal: int,
    output_dir: Path,
    limits: dict[str, int],
) -> dict[str, Any]:
    """Execute one live compiler sample with idle, resource, and diagnostic evidence.

    Args:
        target: Surface being compiled.
        compiler: TS6 or TS7 cohort identifier.
        checkers: Native checker count, retained as schema-compatible metadata for TS6.
        temperature: Cold or warm cache temperature.
        ordinal: One-based sample ordinal within the temperature cohort.
        output_dir: Directory that receives logs and JSON evidence.
        limits: Resource ceilings derived from the baseline artifact.

    Returns:
        One schema-compatible benchmark record.
    """
    sample_id = f"{target.identifier}-{compiler}-c{checkers}-{temperature}-{ordinal}"
    idle_percent = _idle_percent()
    record: dict[str, Any] = {
        "sample_id": sample_id,
        "target": target.identifier,
        "temperature": temperature,
        "elapsed_ms": 0,
        "peak_rss_kib": 0,
        "process_group_peak_rss_kib": 0,
        "swap_delta_kib": 0,
        "oom_kill_count": 0,
        "dmesg_status": "unavailable",
        "process_count": 0,
        "diagnostic_count": 0,
        "exit_status": -1,
        "signal": None,
        "turbo_cache_state": "not_run",
        "tsconfig_path": target.tsconfig_path,
        "compiler_version": "6.0.2" if compiler == "ts6" else "7.0.2",
        "compiler": compiler,
        "checkers": checkers,
        "checkers_applicability": "not_applicable_ts6" if compiler == "ts6" else "applied_ts7",
        "host_idle_percent": idle_percent,
        "host_idle_class": "invalid",
        "status": "invalid_host_not_idle",
        "started_at": _now(),
    }
    if idle_percent is None or idle_percent < 70:
        record["ended_at"] = _now()
        return record

    cache_dir = Path(f"/tmp/ts7-benchmark-cache-{target.identifier}-{compiler}-c{checkers}")
    if temperature == "cold":
        shutil.rmtree(cache_dir, ignore_errors=True)
    cache_dir.mkdir(parents=True, exist_ok=True)
    old_cache_dir = os.environ.get("TS7_BENCHMARK_CACHE_DIR")
    os.environ["TS7_BENCHMARK_CACHE_DIR"] = str(cache_dir)
    command, environment = _compiler_command(target, compiler, checkers)
    if old_cache_dir is None:
        os.environ.pop("TS7_BENCHMARK_CACHE_DIR", None)
    else:
        os.environ["TS7_BENCHMARK_CACHE_DIR"] = old_cache_dir
    if target.kind == "turbo" and temperature == "cold":
        command.append("--force")

    run_environment = {**os.environ, **environment}
    dmesg_status_before, dmesg_before = _dmesg_status()
    swap_before = _swap_used_kib()
    started_monotonic = time.monotonic()
    process = subprocess.Popen(
        [str(TIME), "-v", *command],
        cwd=REPO_ROOT,
        env=run_environment,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=True,
    )
    pgid = os.getpgid(process.pid)
    peak_group_rss = 0
    peak_process_count = 0
    stop_loss: dict[str, Any] = {"triggered": False, "trigger": None, "cleanup": None}
    while process.poll() is None:
        rss_kib, member_count = _process_group_stats(pgid)
        peak_group_rss = max(peak_group_rss, rss_kib)
        peak_process_count = max(peak_process_count, member_count)
        swap_delta = _swap_used_kib() - swap_before
        if rss_kib > limits["stop_loss_process_group_rss_kib"]:
            stop_loss = {
                "triggered": True,
                "trigger": "process_group_rss",
                "cleanup": _terminate_process_group(pgid),
            }
            break
        if swap_delta > limits["stop_loss_swap_delta_kib"]:
            stop_loss = {
                "triggered": True,
                "trigger": "swap_delta",
                "cleanup": _terminate_process_group(pgid),
            }
            break
        time.sleep(0.25)
    stdout, stderr = process.communicate()
    elapsed_fallback_ms = int((time.monotonic() - started_monotonic) * 1000)
    try:
        timed = parse_time_output(stderr)
    except AssertionError:
        timed = {"elapsed_ms": elapsed_fallback_ms, "peak_rss_kib": 0}
    dmesg_status_after, dmesg_after = _dmesg_status()
    dmesg_status = "available" if dmesg_status_before == dmesg_status_after == "available" else "unavailable"
    output_prefix = output_dir / sample_id
    output_prefix.with_suffix(".stdout.log").write_text(stdout, encoding="utf-8")
    output_prefix.with_suffix(".stderr.log").write_text(stderr, encoding="utf-8")
    turbo_summary, turbo_summary_sha = _read_turbo_summary() if target.kind == "turbo" else (None, None)
    if turbo_summary is not None:
        output_prefix.with_suffix(".turbo-summary.json").write_text(
            json.dumps(turbo_summary, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
    diagnostic_count = len(DIAGNOSTIC_PATTERN.findall(f"{stdout}\n{stderr}"))
    swap_delta = _swap_used_kib() - swap_before
    oom_count = _oom_count(dmesg_after) - _oom_count(dmesg_before) if dmesg_status == "available" else 0
    invalid_reasons: list[str] = []
    if stop_loss["triggered"]:
        invalid_reasons.append(f"stop_loss:{stop_loss['trigger']}")
    if peak_group_rss > limits["max_process_group_rss_kib"]:
        invalid_reasons.append("process_group_rss_ceiling")
    if swap_delta > limits["max_swap_delta_kib"]:
        invalid_reasons.append("swap_delta_ceiling")
    if oom_count:
        invalid_reasons.append("oom_kill_observed")
    record.update(
        {
            "command": command,
            "environment": environment,
            "elapsed_ms": timed["elapsed_ms"],
            "peak_rss_kib": timed["peak_rss_kib"],
            "process_group_peak_rss_kib": peak_group_rss,
            "swap_delta_kib": swap_delta,
            "oom_kill_count": oom_count,
            "dmesg_status": dmesg_status,
            "process_count": peak_process_count,
            "diagnostic_count": diagnostic_count,
            "exit_status": process.returncode,
            "signal": -process.returncode if process.returncode < 0 else None,
            "turbo_cache_state": _cache_state(turbo_summary, temperature, target),
            "turbo_summary_sha256": turbo_summary_sha,
            "stdout_sha256": _sha256_bytes(stdout.encode("utf-8")),
            "stderr_sha256": _sha256_bytes(stderr.encode("utf-8")),
            "stop_loss": stop_loss,
            "host_idle_class": "invalid" if invalid_reasons else "idle",
            "status": "invalid_resource" if invalid_reasons else "completed",
            "invalid_reasons": invalid_reasons,
            "ended_at": _now(),
        }
    )
    return record


def _median(samples: Iterable[dict[str, Any]], temperature: str) -> int:
    """Compute one required temperature median through the Phase 2 public helper.

    Args:
        samples: Records for one compiler and checker cohort.
        temperature: Cold or warm group to return.

    Returns:
        Integer median elapsed time in milliseconds.
    """
    summary = summarize_benchmark_samples(
        [{"temperature": item["temperature"], "elapsed_ms": item["elapsed_ms"]} for item in samples]
    )
    return summary[f"{temperature}_median_ms"]


def _summarize_target(target: BenchmarkTarget, samples: list[dict[str, Any]]) -> dict[str, Any]:
    """Validate comparable benchmark cohorts and derive per-target speedup evidence.

    Args:
        target: Target surface represented by the sample records.
        samples: Completed records for TypeScript 6 and TypeScript 7 cohorts.

    Returns:
        Target-level medians, parity checks, and speedup ratios.

    Raises:
        AssertionError: When any sample is invalid or compiler diagnostics diverge.
    """
    invalid = [sample["sample_id"] for sample in samples if sample["status"] != "completed"]
    if invalid:
        raise AssertionError(f"invalid benchmark samples for {target.identifier}: {invalid}")
    cohorts: dict[str, list[dict[str, Any]]] = {}
    for sample in samples:
        key = f"{sample['compiler']}:c{sample['checkers']}"
        cohorts.setdefault(key, []).append(sample)
    summaries: dict[str, dict[str, Any]] = {}
    for key, cohort in sorted(cohorts.items()):
        exits = {sample["exit_status"] for sample in cohort}
        diagnostics = {sample["diagnostic_count"] for sample in cohort}
        if len(exits) != 1 or len(diagnostics) != 1:
            raise AssertionError(f"unstable exit or diagnostic count for {target.identifier} {key}")
        summaries[key] = {
            "exit_status": next(iter(exits)),
            "diagnostic_count": next(iter(diagnostics)),
            "cold_median_ms": _median(cohort, "cold"),
            "warm_median_ms": _median(cohort, "warm"),
        }
    ts6 = summaries["ts6:c1"]
    ts7_one = summaries["ts7:c1"]
    ts7_two = summaries["ts7:c2"]
    if len({ts6["exit_status"], ts7_one["exit_status"], ts7_two["exit_status"]}) != 1:
        raise AssertionError(f"exit status differs between compilers for {target.identifier}")
    if len({ts6["diagnostic_count"], ts7_one["diagnostic_count"], ts7_two["diagnostic_count"]}) != 1:
        raise AssertionError(f"diagnostic count differs between compilers for {target.identifier}")
    selected = "ts7:c1" if ts7_one["warm_median_ms"] <= ts7_two["warm_median_ms"] else "ts7:c2"
    selected_summary = summaries[selected]
    return {
        "target": target.identifier,
        "tsconfig_path": target.tsconfig_path,
        "cohorts": summaries,
        "selected_ts7_cohort": selected,
        "cold_speedup_vs_ts6": round(ts6["cold_median_ms"] / selected_summary["cold_median_ms"], 3),
        "warm_speedup_vs_ts6": round(ts6["warm_median_ms"] / selected_summary["warm_median_ms"], 3),
    }


def _provenance() -> dict[str, Any]:
    """Capture immutable run inputs that bind benchmark evidence to this repository state.

    Returns:
        Revision, compiler identities, and mutable configuration hashes.
    """
    return {
        "revision": _git_output("rev-parse", "HEAD").strip(),
        "status": _git_output("status", "--short"),
        "typescript6": _run([str(TS6_TSC), "--version"]).stdout.strip(),
        "typescript7": _run([str(TS7_TSC), "--version"]).stdout.strip(),
        "ts6_tsc_sha256": _sha256_file(TS6_TSC),
        "ts7_tsc_sha256": _sha256_file(TS7_TSC),
        "turbo_json_sha256": _sha256_file(REPO_ROOT / "turbo.json"),
        "lockfile_sha256": _sha256_file(REPO_ROOT / "pnpm-lock.yaml"),
    }


def _select_targets(names: list[str]) -> list[BenchmarkTarget]:
    """Resolve optional target filters against the exact required benchmark matrix.

    Args:
        names: Requested target identifiers, or an empty list for the complete matrix.

    Returns:
        Ordered target definitions.

    Raises:
        AssertionError: When a requested target is unknown.
    """
    if not names:
        return list(TARGETS)
    by_name = {target.identifier: target for target in TARGETS}
    unknown = sorted(set(names) - set(by_name))
    if unknown:
        raise AssertionError(f"unknown benchmark target(s): {unknown}")
    return [target for target in TARGETS if target.identifier in names]


def main() -> int:
    """Execute the requested live matrix and save a provenance-bound summary.

    Returns:
        Process exit status for shell and CI invocation.
    """
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", action="append", default=[], help="target identifier to run")
    parser.add_argument("--samples-per-temperature", type=int, default=3)
    parser.add_argument("--run-id", default=datetime.now(timezone.utc).strftime("run-%Y%m%dT%H%M%SZ"))
    arguments = parser.parse_args()
    if arguments.samples_per_temperature != 3:
        raise AssertionError("Phase 3g requires exactly three cold and three warm samples")
    if not TIME.is_file():
        raise AssertionError("Phase 3g requires /usr/bin/time -v")

    baseline = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
    limits = baseline["resource_limits"]
    if not isinstance(limits, dict) or not all(isinstance(limits.get(key), int) for key in (
        "max_process_group_rss_kib", "max_swap_delta_kib", "stop_loss_process_group_rss_kib", "stop_loss_swap_delta_kib",
    )):
        raise AssertionError("compiler baseline has no valid resource limits")
    selected_targets = _select_targets(arguments.target)
    output_dir = EVIDENCE_ROOT / arguments.run_id
    if output_dir.exists():
        raise AssertionError(f"benchmark run directory already exists: {output_dir}")
    output_dir.mkdir(parents=True)
    provenance_start = _provenance()
    samples: list[dict[str, Any]] = []
    try:
        for target in selected_targets:
            for compiler, checkers in (("ts6", 1), ("ts7", 1), ("ts7", 2)):
                for temperature in ("cold", "warm"):
                    for ordinal in range(1, arguments.samples_per_temperature + 1):
                        sample = _run_sample(
                            target,
                            compiler,
                            checkers,
                            temperature,
                            ordinal,
                            output_dir,
                            limits,
                        )
                        samples.append(sample)
                        (output_dir / f"{sample['sample_id']}.json").write_text(
                            json.dumps(sample, indent=2, sort_keys=True) + "\n", encoding="utf-8"
                        )
        summaries = [_summarize_target(target, [sample for sample in samples if sample["target"] == target.identifier]) for target in selected_targets]
        selected_checkers = min(
            (
                summary["selected_ts7_cohort"] for summary in summaries
            ),
            key=lambda cohort: sum(
                item["cohorts"][cohort]["warm_median_ms"] for item in summaries
            ),
        )
        summary = {
            "schema_version": 1,
            "track": "typescript7_native_migration_20260710",
            "phase": "Phase 3g: controlled benchmark suite",
            "status": "accepted",
            "provenance_start": provenance_start,
            "provenance_end": _provenance(),
            "sample_count": len(samples),
            "samples_per_temperature": arguments.samples_per_temperature,
            "selected_ts7_cohort": selected_checkers,
            "selected_ts7_checkers": int(selected_checkers.rsplit("c", 1)[1]),
            "targets": summaries,
        }
        (output_dir / "summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        return 0
    except Exception as error:
        failure = {
            "schema_version": 1,
            "track": "typescript7_native_migration_20260710",
            "phase": "Phase 3g: controlled benchmark suite",
            "status": "rejected",
            "reason": str(error),
            "provenance_start": provenance_start,
            "samples": samples,
        }
        (output_dir / "summary.json").write_text(json.dumps(failure, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
