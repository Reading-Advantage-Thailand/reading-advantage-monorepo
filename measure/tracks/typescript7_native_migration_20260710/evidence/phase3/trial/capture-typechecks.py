#!/usr/bin/env python3
"""Capture one sequential TypeScript trial gate with resource evidence.

The caller runs this script inside heavy-run.sh. The script reads the trial base,
runs one workspace at a time, and keeps failed checks as data. It writes raw logs
and time files under the track evidence folder.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import subprocess
import time
from pathlib import Path
from typing import Any


TRACK_DIR = Path(__file__).resolve().parents[3]
ROLE_ROOT = TRACK_DIR.parents[2]
TRIAL_ROOT = Path("/home/daniebo/Desktop/rama-worktrees/ts7-trial")
RAW_DIR = TRACK_DIR / "evidence" / "phase3" / "trial" / "raw-logs"
TRIAL_RECORD = TRACK_DIR / "evidence" / "phase3" / "trial" / "trial-worktree.json"
BASELINE_FILE = TRACK_DIR / "phase1-workspace-baseline.json"
MANIFEST_RE = re.compile(
    r"^(?:apps|packages|services)/[^/]+/package\.json$|^packages/integrations/[^/]+/package\.json$"
)
DIAGNOSTIC_RE = re.compile(r"error TS\d+|warning TS\d+")
KEEP_RE = re.compile(r"error TS\d+|warning TS\d+|FAIL|●|Test Files|Tests|Found \d+ errors")
MAX_LOG_BYTES = 1024 * 1024
MAX_LOAD1 = 6.0
MAX_SWAP_GROWTH_KIB = 1048576
WORKSPACE_TIMEOUT_S = 300
CONTROL_TSC = TRIAL_ROOT / ".ts59" / "node_modules" / "typescript" / "bin" / "tsc"
CONTROL_PACKAGE = CONTROL_TSC.parents[1]
TRIAL_TYPESCRIPT = TRIAL_ROOT / "node_modules" / "typescript"
TRIAL_TYPESCRIPT_HOLD = TRIAL_ROOT / ".ts7-typescript-held"
REPEAT_WORKSPACES = ("packages/types", "packages/domain", "apps/primary-advantage")
READING_WORKSPACE = "apps/reading-advantage"


def run_git(arguments: list[str], cwd: Path = ROLE_ROOT) -> str:
    """Run a git read command and return its output.

    Args:
        arguments: Git arguments after the repository path.
        cwd: Repository used for the command.

    Returns:
        Combined standard output and error text.
    """
    result = subprocess.run(
        ["git", "-C", str(cwd), *arguments],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout + result.stderr


def load_plan(base_sha: str) -> tuple[list[dict[str, Any]], list[list[str]], dict[str, Any]]:
    """Read the live check-types set and the Phase 1 timing map.

    Args:
        base_sha: Trial base commit used for the manifest scan.

    Returns:
        Ordered workspace rows, projected-time batches, and baseline rows.
    """
    manifests = run_git(["ls-tree", "-r", "--name-only", base_sha]).splitlines()
    rows: list[dict[str, Any]] = []
    for manifest in manifests:
        if not MANIFEST_RE.match(manifest):
            continue
        data = json.loads(run_git(["show", f"{base_sha}:{manifest}"]))
        script = data.get("scripts", {}).get("check-types")
        if isinstance(script, str) and script.strip():
            workspace = manifest[: -len("/package.json")]
            rows.append(
                {
                    "workspace": workspace,
                    "package_name": data.get("name", workspace),
                    "script": script.strip(),
                }
            )
    rows.sort(key=lambda row: ("pnpm build" in row["script"], row["workspace"]))
    baseline_data = json.loads(BASELINE_FILE.read_text(encoding="utf-8"))
    baseline_rows = {row["workspace"]: row for row in baseline_data["workspaces"]}
    batches: list[list[str]] = []
    current: list[str] = []
    projected_ms = 0
    for row in rows:
        estimate = int(float(baseline_rows.get(row["workspace"], {}).get("elapsed_ms", 120000)) * 1.5)
        if current and projected_ms + estimate >= 1100000:
            batches.append(current)
            current = []
            projected_ms = 0
        current.append(row["workspace"])
        projected_ms += estimate
    if current:
        batches.append(current)
    return rows, batches, baseline_rows


def parse_time_v(text: str) -> dict[str, int]:
    """Read labeled RSS, wall time, and exit status from time output.

    Args:
        text: Full text of a time file.

    Returns:
        Peak RSS in KiB, elapsed milliseconds, and exit status.

    Raises:
        ValueError: When a required label is absent.
    """
    rss = re.search(r"^\s*Maximum resident set size \(kbytes\):\s*(\d+)", text, re.M)
    wall = re.search(r"^\s*Elapsed \(wall clock\) time.*?:\s*(\S+)\s*$", text, re.M)
    status = re.search(r"^\s*Exit status:\s*(\d+)", text, re.M)
    if rss is None or wall is None or status is None:
        raise ValueError("time -v output misses a labeled line")
    parts = wall.group(1).split(":")
    seconds = float(parts[-1])
    factor = 1
    for part in reversed(parts[:-1]):
        factor *= 60
        seconds += int(part) * factor
    return {
        "peak_rss_kib": int(rss.group(1)),
        "elapsed_ms": int(round(seconds * 1000)),
        "exit_status": int(status.group(1)),
    }


def parse_diagnostics(text: str) -> list[list[Any]]:
    """Parse both native compiler diagnostic line forms.

    Args:
        text: Bounded raw workspace output.

    Returns:
        Every diagnostic as a file, line, and code triple.
    """
    triples: list[list[Any]] = []
    for line in text.splitlines():
        match = re.match(r"^(\S+?)\((\d+),\d+\): error (TS\d+):", line)
        if match is None:
            match = re.match(r"^(\S+?):(\d+):\d+ - error (TS\d+):", line)
        if match is None:
            continue
        path = match.group(1)
        relative = re.search(r"(?:^|/)((?:apps|packages|services)/\S+)$", path)
        triples.append([relative.group(1) if relative else path, int(match.group(2)), match.group(3)])
    return triples


def bounded_log(text: str) -> str:
    """Keep a log below 1 MiB without dropping diagnostic or summary lines.

    Args:
        text: Full raw command output.

    Returns:
        Original text, or a bounded head, tail, and matching-line extract.
    """
    if len(text.encode("utf-8")) <= MAX_LOG_BYTES:
        return text
    lines = text.splitlines()
    selected = set(range(min(400, len(lines))))
    selected.update(range(max(0, len(lines) - 400), len(lines)))
    selected.update(index for index, line in enumerate(lines) if KEEP_RE.search(line))
    kept = [lines[index] for index in sorted(selected)]
    prefix = f"TRUNCATED=1\nORIGINAL_LINES={len(lines)}\n"
    output = prefix + "\n".join(kept) + "\n"
    if len(output.encode("utf-8")) > MAX_LOG_BYTES:
        raise ValueError("diagnostic lines alone exceed the 1 MiB log cap")
    return output


def proc_value(label: str) -> int:
    """Read an integer from a /proc/meminfo label.

    Args:
        label: Exact meminfo label.

    Returns:
        Labeled integer value.
    """
    for line in Path("/proc/meminfo").read_text(encoding="utf-8").splitlines():
        if line.startswith(label + ":"):
            return int(line.split()[1])
    raise ValueError(f"missing meminfo label: {label}")


def load1() -> float:
    """Read the current one-minute load average.

    Returns:
        One-minute load average.
    """
    return float(Path("/proc/loadavg").read_text(encoding="utf-8").split()[0])


def wait_for_load() -> tuple[float, int]:
    """Wait up to 60 seconds for load1 to reach the PM noise ceiling.

    Returns:
        Observed load average and seconds waited.
    """
    started = time.monotonic()
    while True:
        current = load1()
        if current <= MAX_LOAD1 or time.monotonic() - started >= 60:
            return current, int(time.monotonic() - started)
        time.sleep(5)


def tsconfig_diff() -> str:
    """Read the tracked tsconfig diff in the trial worktree.

    Returns:
        Diff text used only for before and after equality.
    """
    paths = run_git(["ls-files", "*tsconfig*.json"], TRIAL_ROOT).splitlines()
    return run_git(["diff", "HEAD", "--", *paths], TRIAL_ROOT) if paths else ""


def slug(value: str) -> str:
    """Make a stable file-name slug from a workspace or gate id.

    Args:
        value: Workspace path or gate id.

    Returns:
        Lower-case file-name slug.
    """
    return re.sub(r"[^A-Za-z0-9]+", "-", value).strip("-")


def resolved_typescript(cwd: Path = TRIAL_ROOT) -> str:
    """Read the TypeScript package version visible from one workspace.

    Args:
        cwd: Workspace used for Node module resolution.

    Returns:
        Resolved package version.
    """
    return subprocess.check_output(
        ["node", "-p", "require('typescript/package.json').version"],
        cwd=cwd,
        text=True,
    ).strip()


def activate_control_package() -> None:
    """Point root TypeScript resolution at the 5.9.3 side install.

    Raises:
        ValueError: When a prior package swap is still active.
    """
    if TRIAL_TYPESCRIPT_HOLD.exists() or TRIAL_TYPESCRIPT.is_symlink():
        raise ValueError("a TypeScript package swap is already active")
    TRIAL_TYPESCRIPT.rename(TRIAL_TYPESCRIPT_HOLD)
    TRIAL_TYPESCRIPT.symlink_to(CONTROL_PACKAGE, target_is_directory=True)


def restore_trial_package() -> None:
    """Restore the TypeScript 7.0.2 package after a control attempt."""
    if TRIAL_TYPESCRIPT.is_symlink():
        TRIAL_TYPESCRIPT.unlink()
    if TRIAL_TYPESCRIPT_HOLD.exists():
        TRIAL_TYPESCRIPT_HOLD.rename(TRIAL_TYPESCRIPT)


def control_command(row: dict[str, Any]) -> str:
    """Translate a simple check-types script to the side TypeScript 5.9.3 compiler.

    Args:
        row: Workspace row with the manifest script.

    Returns:
        Shell command that keeps script arguments and environment assignments.

    Raises:
        ValueError: When the script uses an unsupported command form.
    """
    segments: list[str] = []
    for segment in row["script"].split("&&"):
        tokens = shlex.split(segment.strip())
        if "tsc" not in tokens:
            raise ValueError(f"unsupported control script: {row['script']}")
        tokens[tokens.index("tsc")] = "node"
        tokens.insert(tokens.index("node") + 1, str(CONTROL_TSC))
        segments.append(shlex.join(tokens))
    return " && ".join(segments)


def run_attempt(
    row: dict[str, Any],
    gate_id: str,
    attempt: int,
    run_label: str,
    compiler: str,
    baseline_rows: dict[str, Any],
    command_override: str | None = None,
) -> dict[str, Any]:
    """Run one timed workspace attempt and write its evidence.

    Args:
        row: Workspace, package name, and script.
        gate_id: Heavy gate id.
        attempt: One-based attempt number within this run.
        run_label: Initial, repeat, or variant label.
        compiler: Compiler version without the word Version.
        baseline_rows: Phase 1 rows keyed by workspace.
        command_override: Optional exact variant command.

    Returns:
        Complete attempt row with validity and resource fields.
    """
    workspace = row["workspace"]
    stem = f"{gate_id}-{slug(workspace)}-ts{slug(compiler)}-{run_label}-attempt{attempt}"
    log_rel = Path("measure/tracks/typescript7_native_migration_20260710/evidence/phase3/trial/raw-logs") / f"{stem}.log"
    time_rel = log_rel.with_suffix(".time")
    log_path = ROLE_ROOT / log_rel
    time_path = ROLE_ROOT / time_rel
    output_path = Path("/tmp/opencode") / f"{stem}.out"
    observed_load, load_wait = wait_for_load()
    memavail = proc_value("MemAvailable") // 1024
    swap_start = proc_value("SwapFree")
    config_before = tsconfig_diff()
    if compiler == "5.9.3":
        command = control_command(row)
        arguments = ["bash", "-c", command]
        command_cwd = TRIAL_ROOT / workspace
    else:
        command = command_override or f"pnpm --filter {row['package_name']} run check-types"
        arguments = shlex.split(command)
        command_cwd = TRIAL_ROOT
    start_epoch = int(time.time())
    env = {**os.environ, "CI": "1", "TURBO_CONCURRENCY": "1"}
    swapped = compiler == "5.9.3"
    if swapped:
        activate_control_package()
    try:
        package_version = resolved_typescript(command_cwd)
        with output_path.open("wb") as output:
            result = subprocess.run(
                ["/usr/bin/time", "-v", "-o", str(time_path), "timeout", str(WORKSPACE_TIMEOUT_S), *arguments],
                cwd=command_cwd,
                env=env,
                stdout=output,
                stderr=subprocess.STDOUT,
                check=False,
            )
    finally:
        if swapped:
            restore_trial_package()
    end_epoch = int(time.time())
    if package_version != compiler:
        raise ValueError(f"workspace resolved TypeScript {package_version!r}, expected {compiler!r}")
    raw_text = output_path.read_text(encoding="utf-8", errors="replace")
    stored_text = bounded_log(raw_text)
    time_text = time_path.read_text(encoding="utf-8")
    normalized_time = "\n".join(line.lstrip() for line in time_text.splitlines()) + "\n"
    time_path.write_text(normalized_time, encoding="utf-8")
    parsed = parse_time_v(normalized_time)
    signal_match = re.search(r"Command terminated by signal (\d+)", normalized_time)
    fatal_output = re.search(r"FATAL ERROR|heap out of memory|signal: killed|\bAborted\b", raw_text, re.I)
    diagnostics = parse_diagnostics(stored_text)
    warning_count = sum(1 for line in stored_text.splitlines() if re.search(r"warning TS\d+", line))
    swap_end = proc_value("SwapFree")
    load_end = load1()
    swap_growth = swap_end - swap_start
    config_after = tsconfig_diff()
    reasons: list[str] = []
    if observed_load > MAX_LOAD1:
        reasons.append(f"load1-{observed_load:.2f}")
    if swap_growth >= MAX_SWAP_GROWTH_KIB:
        reasons.append(f"swap-growth-{swap_growth}")
    if parsed["exit_status"] in (124, 134, 137):
        reasons.append(f"exit-{parsed['exit_status']}")
    if signal_match:
        reasons.append(f"signal-{signal_match.group(1)}")
    if fatal_output:
        reasons.append("fatal-output")
    if parsed["exit_status"] != 0 and not diagnostics:
        reasons.append("unparsed-failure")
    attempt_row: dict[str, Any] = {
        **row,
        "command": command,
        "compiler": compiler,
        "resolved_typescript": package_version,
        "typescript_package_swap": swapped,
        "termination_signal": int(signal_match.group(1)) if signal_match else None,
        "fatal_output": bool(fatal_output),
        "exit_status": parsed["exit_status"],
        "timed_out": parsed["exit_status"] == 124,
        "diagnostic_count": len(diagnostics),
        "diagnostics": diagnostics,
        "warning_count": warning_count,
        "diagnostic_line_count": sum(1 for line in stored_text.splitlines() if DIAGNOSTIC_RE.search(line)),
        "peak_rss_kib": parsed["peak_rss_kib"],
        "peak_rss_mib": round(parsed["peak_rss_kib"] / 1024, 1),
        "elapsed_ms": parsed["elapsed_ms"],
        "load1_start": observed_load,
        "load1_end": load_end,
        "load_wait_s": load_wait,
        "memavail_mb_start": memavail,
        "swapfree_kib_start": swap_start,
        "swapfree_kib_end": swap_end,
        "swap_growth_kib": swap_growth,
        "valid": not reasons,
        "invalid_reason": ";".join(reasons),
        "noisy": observed_load > MAX_LOAD1,
        "attempt": attempt,
        "run_label": run_label,
        "start_epoch": start_epoch,
        "end_epoch": end_epoch,
        "tsconfig_changed": config_before != config_after,
        "log": str(log_rel),
        "time_file": str(time_rel),
    }
    baseline = baseline_rows.get(workspace)
    attempt_row["baseline_elapsed_ms"] = baseline.get("elapsed_ms") if baseline else None
    attempt_row["baseline_valid"] = bool(baseline and baseline.get("exit_status") not in (124, 134, 137))
    attempt_row["baseline_note"] = (
        "no valid 5.9.3 baseline"
        if workspace == READING_WORKSPACE
        else (None if baseline else "no Phase 1 baseline row")
    )
    status = run_git(["status", "--porcelain", "--untracked-files=no", "--", workspace], TRIAL_ROOT)
    attempt_row["contaminated"] = bool(status.strip())
    if parsed["exit_status"] != 0 and not diagnostics:
        attempt_row["unparsed_tail"] = stored_text.splitlines()[-20:]
    header = (
        f"WS={workspace}\nRUN={run_label}\nATTEMPT={attempt}\n"
        f"TSC_VERSION=Version {compiler}\nTYPESCRIPT_PACKAGE={package_version}\n"
    )
    footer = (
        f"WS_EXIT={parsed['exit_status']}\nDIAGNOSTICS={len(diagnostics)}\n"
        f"WARNINGS={warning_count}\nPEAK_RSS_KIB={parsed['peak_rss_kib']}\n"
        f"ELAPSED_MS={parsed['elapsed_ms']}\nLOAD1_START={observed_load:.2f}\n"
        f"LOAD1_END={load_end:.2f}\nSWAP_GROWTH_KIB={swap_growth}\n"
        f"VALID={int(attempt_row['valid'])}\nTSCONFIG_CHANGED={int(attempt_row['tsconfig_changed'])}\n"
    )
    log_path.write_text(bounded_log(header + stored_text + footer), encoding="utf-8")
    print(f"WS={workspace}")
    print(f"RUN={run_label}")
    print(f"ATTEMPT={attempt}")
    print(f"TSC_VERSION=Version {compiler}")
    print(f"TYPESCRIPT_PACKAGE={package_version}")
    print(stored_text, end="" if stored_text.endswith("\n") else "\n")
    print(f"WS_EXIT={parsed['exit_status']}")
    print(f"DIAGNOSTICS={len(diagnostics)}")
    print(f"WARNINGS={warning_count}")
    print(f"PEAK_RSS_KIB={parsed['peak_rss_kib']}")
    print(f"ELAPSED_MS={parsed['elapsed_ms']}")
    print(f"LOAD1_START={observed_load:.2f}")
    print(f"LOAD1_END={load_end:.2f}")
    print(f"SWAP_GROWTH_KIB={swap_growth}")
    print(f"VALID={int(attempt_row['valid'])}")
    print(f"TSCONFIG_CHANGED={int(attempt_row['tsconfig_changed'])}")
    return attempt_row


def run_workspace(
    row: dict[str, Any],
    gate_id: str,
    run_label: str,
    compiler: str,
    baseline_rows: dict[str, Any],
    command_override: str | None = None,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Run a workspace up to three times until its evidence is valid.

    Args:
        row: Workspace, package name, and script.
        gate_id: Heavy gate id.
        run_label: Initial, repeat, or variant label.
        compiler: Compiler version without the word Version.
        baseline_rows: Phase 1 rows keyed by workspace.
        command_override: Optional exact variant command.

    Returns:
        Final attempt and every attempt in order.
    """
    attempts: list[dict[str, Any]] = []
    for attempt in range(1, 4):
        current = run_attempt(row, gate_id, attempt, run_label, compiler, baseline_rows, command_override)
        attempts.append(current)
        if current["valid"]:
            break
    final = dict(attempts[-1])
    final["attempts"] = len(attempts)
    final["attempt_details"] = attempts
    if not final["valid"]:
        final["final"] = True
    return final, attempts


def main() -> int:
    """Run the requested batch, repeat set, or checker variant.

    Returns:
        Zero when the harness completes, or one when a harness invariant fails.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("--gate", required=True)
    parser.add_argument("--batch", type=int)
    parser.add_argument("--repeat-run", type=int, choices=(2, 3))
    parser.add_argument("--variant-workspace", action="append", default=[])
    args = parser.parse_args()
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    trial_record = json.loads(TRIAL_RECORD.read_text(encoding="utf-8"))
    base_sha = trial_record["worktree"]["base_sha"]
    compiler = trial_record["registry"]["chosen"]
    rows, batches, baseline_rows = load_plan(base_sha)
    by_name = {row["workspace"]: row for row in rows}
    start_epoch = int(time.time())
    gate_load = load1()
    gate_memavail = proc_value("MemAvailable") // 1024
    gate_swap = proc_value("SwapFree")
    gate_disk = int(subprocess.check_output(["df", "--output=avail", "-m", "/home/daniebo"], text=True).splitlines()[-1])
    print(f"GATE={args.gate}")
    print(f"CMD=capture-typechecks.py --gate {args.gate}")
    print(f"START_EPOCH={start_epoch}")
    print(f"HEAVY_RUN_ACTIVE={os.environ.get('HEAVY_RUN_ACTIVE', '0')}")
    print(f"HEAVY_PRIORITY={os.environ.get('HEAVY_PRIORITY', '')}")
    print(f"LOAD1_START={gate_load:.2f}")
    print(f"MEMAVAIL_MB_START={gate_memavail}")
    print(f"SWAPFREE_KIB_START={gate_swap}")
    print(f"DISK_FREE_MB={gate_disk}")
    print(f"WORKSPACES={len(rows)}")
    version = subprocess.check_output(["pnpm", "exec", "tsc", "--version"], cwd=TRIAL_ROOT, text=True).strip()
    if version != f"Version {compiler}":
        raise ValueError(f"trial compiler {version!r} differs from {compiler!r}")
    if not args.variant_workspace:
        control_version = subprocess.check_output(["node", str(CONTROL_TSC), "--version"], text=True).strip()
        if control_version != "Version 5.9.3":
            raise ValueError(f"control compiler {control_version!r} differs from Version 5.9.3")
        print(f"CONTROL_TSC_VERSION={control_version}")
    config_before = tsconfig_diff()
    results: list[dict[str, Any]] = []
    control_rows: list[dict[str, Any]] = []
    paired_runs: list[dict[str, Any]] = []
    if args.batch is not None:
        if args.batch < 1 or args.batch > len(batches):
            raise ValueError(f"batch {args.batch} is outside 1..{len(batches)}")
        selected = batches[args.batch - 1]
        run_label = "initial"
    elif args.repeat_run is not None:
        selected = list(REPEAT_WORKSPACES)
        run_label = f"repeat{args.repeat_run}"
    else:
        selected = []
        run_label = "checkers-1"
    if selected:
        for workspace in selected:
            control, _ = run_workspace(by_name[workspace], args.gate, run_label, "5.9.3", baseline_rows)
            final, _ = run_workspace(by_name[workspace], args.gate, run_label, compiler, baseline_rows)
            control_rows.append(control)
            results.append(final)
            paired_runs.append(
                {
                    "workspace": workspace,
                    "run_label": run_label,
                    "control_log": control["log"],
                    "trial_log": final["log"],
                    "control_load1_start": control["load1_start"],
                    "control_load1_end": control["load1_end"],
                    "trial_load1_start": final["load1_start"],
                    "trial_load1_end": final["load1_end"],
                }
            )
    elif args.variant_workspace:
        for workspace in args.variant_workspace:
            command = f"pnpm --filter {by_name[workspace]['package_name']} exec tsc --noEmit --checkers 1"
            final, _ = run_workspace(by_name[workspace], args.gate, "checkers-1", compiler, baseline_rows, command)
            print("VARIANT=checkers-1")
            results.append(final)
    else:
        raise ValueError("select a batch, repeat run, or variant workspace")
    config_after = tsconfig_diff()
    config_changed = config_before != config_after
    swap_end = proc_value("SwapFree")
    elapsed = int(time.time()) - start_epoch
    result_path = RAW_DIR / f"{args.gate}.json"
    result_path.write_text(
        json.dumps(
            {
                "gate": args.gate,
                "start_epoch": start_epoch,
                "elapsed_s": elapsed,
                "compiler": compiler,
                "rows": results,
                "control_rows": control_rows,
                "paired_runs": paired_runs,
                "tsconfig_changed": config_changed,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"SWAPFREE_KIB_END={swap_end}")
    print(f"LOAD1_END={load1():.2f}")
    print(f"TSCONFIG_CHANGED={int(config_changed)}")
    print(f"EXIT={int(config_changed)}")
    print(f"ELAPSED_S={elapsed}")
    return int(config_changed)


if __name__ == "__main__":
    raise SystemExit(main())
