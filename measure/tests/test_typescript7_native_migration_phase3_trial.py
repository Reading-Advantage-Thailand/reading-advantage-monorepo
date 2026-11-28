#!/usr/bin/env python3
"""Falsification contracts for the Phase 3 TypeScript 7 trial, round A.

Round A covers the trial helpers, the scope rule, and TR1 (create the trial
worktree with the latest stable 7.0.x). The classes are `P3TrialHelperTests`
(green guards: pure helpers with synthetic cases), `P3TrialScopeTests` (red
while `P3_GREEN_COMMITS` is unset), and `P3TrialWorktreeTests` (red: the
`trial-worktree.json` record does not exist yet).

The pure helpers stay for the later rounds. TR2 to TR8 reuse
`latest_stable_7_0`, `parse_time_v`, `parse_diagnostics`, `classify`,
`verdict`, `test_command`, `lock_peer_consumers`, and `escape_added`
(test-strategy.md section 5b.7). The target version is `7.0.2`, the only
stable 7.0.x on the registry at strategy time. Green re-verifies it on the
trial day. No test hardcodes it as the required value. Each version test
recomputes the choice from the registry list.

Targeted Red command (test-strategy.md section 5b.8, TR1):

    PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v \\
        measure.tests.test_typescript7_native_migration_phase3_trial.P3TrialHelperTests \\
        measure.tests.test_typescript7_native_migration_phase3_trial.P3TrialScopeTests \\
        measure.tests.test_typescript7_native_migration_phase3_trial.P3TrialWorktreeTests

Expected base result: `FAILED (failures=N)` with no `errors=` part, where N
is the labeled count of red tests. A missing evidence file makes a test
fail with `self.fail(...)`. It never raises. No count is written into
`spec.md` or `plan.md`.

## The TR1 record

Green writes `evidence/phase3/trial/trial-worktree.json` under the track
folder. Raw logs live in `evidence/phase3/trial/raw-logs/`. The record holds
these top-level keys: `registry`, `worktree`, `state_a`, `state_b`,
`snapshots`, `install_commit`, `lock_key_changes`, `disk_free_mb`, and
`gates`. No key may be named `sha256`, `checksum`, `digest`, `hash`, or
`md5` (AGENTS.md hashing policy). A git commit id (`base_sha`) is repository
identity and is allowed.

- `registry`: `versions_7_0_stable` (a non-empty list), `chosen`, the log
  path, and the labeled line `TS_CHOSEN=<chosen>` in that log.
- `worktree`: `path` (`/home/daniebo/Desktop/rama-worktrees/ts7-trial`),
  `branch` (`ts7/trial-p3`), `base_sha`, and the saved `porcelain` text of
  `git worktree list --porcelain`, which lists both the path and the branch.
- `state_a`: the 5.9.3 control install. Its log holds the labeled line
  `TSC_VERSION=Version 5.9.3`.
- `state_b`: the chosen 7.0.x install. Its log holds the labeled line
  `TSC_VERSION=Version <chosen>`. `ts_resolved` holds exactly one version,
  equal to the chosen. The `why_log` holds the labeled line `TS_SINGLE=1`.
- `snapshots`: the log paths `main_before_log`, `main_after_log`,
  `role_before_log`, and `role_after_log`, plus `after_epoch`. Each log
  holds the text of `git -C <dir> diff -- pnpm-lock.yaml package.json
  pnpm-workspace.yaml` and the labeled quiet lines `MAIN_DIFF_QUIET=` or
  `ROLE_DIFF_QUIET=`. The before and after texts are equal per directory.
  `after_epoch` is not less than the end epoch of `TR1-swap-B`.
- `install_commit`: `sha`, `paths` (exactly `pnpm-lock.yaml` and
  `pnpm-workspace.yaml`), `ws_yaml_lines_changed` (exactly 1),
  `override_before` (`5.9.3`), and `override_after` (the chosen).
- `lock_key_changes`: `added` and `removed` package-key lists, the
  `lock_scan_log` with the labeled lines `LOCK_KEYS_ADDED=` and
  `LOCK_KEYS_REMOVED=`, the `explained_drift` list, and
  `requires_build_added`. `typescript@5.9.3` is removed.
  `typescript@<chosen>` is added. Each other added key matches
  `^@typescript/typescript-.*@<chosen>$` or has an `explained_drift` entry
  with a reason.
- `disk_free_mb`: `before` (6000 or more) and `after`.
- `gates`: one entry per gate id with `id`, `heavy`, `heavy_command`,
  `log`, `start_epoch`, `exit`, and `elapsed_s`. Each heavy entry names
  `HEAVY_PRIORITY=p2` and `HEAVY_MIN_AVAIL_MB=1500` in its command. Its log
  holds lines that start with `HEAVY_RUN_ACTIVE=1` and `HEAVY_PRIORITY=p2`.
  Each `exit` is 0. Each `ELAPSED_S` is below 1800. No two job intervals
  overlap.

## The scope rule

A Green commit on `ts7/phase3` may touch only: the `evidence/phase3/`
folder of this track, the `plan.md` of this track, one flat file
`measure/runs/<track>/green-p3t-*.log`, and `measure/tech-debt.md` under
the Phase 2 append-only rule (no removed line; every added line starts with
`| 2026-` and holds the track id). It may not touch `pnpm-workspace.yaml`,
`pnpm-lock.yaml`, a `package.json`, a `tsconfig*.json`, a file under
`apps/`, `packages/`, or `services/`, `compiler-baseline.json`, a
`phase1-*.json` file, `surface-inventory.json`,
`capture-phase1-baseline.py`, or an existing test module. The orchestrator
passes every Green commit in `P3_GREEN_COMMITS`. The scope tests fail when
the variable is unset or empty.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]

from measure.tests.test_typescript7_native_migration_phase2 import (  # noqa: E402
    track_dir_resolve,
)


TRACK_ID = "typescript7_native_migration_20260710"
TRACK_DIR = track_dir_resolve(TRACK_ID)
TRIAL_EVIDENCE_PATH = TRACK_DIR / "evidence" / "phase3" / "trial" / "trial-worktree.json"
RAW_LOGS_DIR = TRACK_DIR / "evidence" / "phase3" / "trial" / "raw-logs"

TRIAL_PATH = "/home/daniebo/Desktop/rama-worktrees/ts7-trial"
TRIAL_BRANCH = "ts7/trial-p3"
MAIN_ROOT = Path("/home/daniebo/Desktop/reading-advantage-monorepo")
ROLE_WT = REPO_ROOT

EXPECTED_RECORD_KEYS = (
    "registry",
    "worktree",
    "state_a",
    "state_b",
    "snapshots",
    "install_commit",
    "lock_key_changes",
    "disk_free_mb",
    "gates",
)
FORBIDDEN_KEY_NAMES = ("sha256", "checksum", "digest", "hash", "md5")
STABLE_70_PATTERN = re.compile(r"^7\.0\.\d+$")
TRIAL_COMPILER_PATTERN = re.compile(r"^7\.0\.\d+$")
INSTALL_COMMIT_PATHS = ("pnpm-lock.yaml", "pnpm-workspace.yaml")
DISK_FLOOR_MB = 6000
JOB_CAP_S = 1800
MAX_LOAD1 = 1.5
SWAP_GROWTH_CEILING_KIB = 1048576
DEPLOY_PATTERN = re.compile(r"git push|vinext deploy|gcloud|wrangler")


def latest_stable_7_0(versions: list[str]) -> str:
    """Pick the newest stable 7.0.x from a registry version list.

    Args:
        versions: Every version string from the registry query.

    Returns:
        The maximum of the entries that match `^7\\.0\\.\\d+$`.

    Raises:
        ValueError: When no entry matches.
    """
    stable = [v for v in versions if STABLE_70_PATTERN.match(v)]
    if not stable:
        raise ValueError("no stable 7.0.x version in list")
    return max(stable, key=lambda v: tuple(int(p) for p in v.split(".")))


def parse_time_v(text: str) -> dict[str, int]:
    """Read peak RSS, wall time, and exit status from `time -v` output.

    Args:
        text: The full text of the `.time` file.

    Returns:
        Peak RSS in KiB, wall time in ms, and the exit status.

    Raises:
        ValueError: When a labeled line is absent.
    """
    rss = re.search(r"^Maximum resident set size \(kbytes\):\s*(\d+)", text, re.M)
    wall = re.search(r"^Elapsed \(wall clock\) time.*?:\s*(\S+)\s*$", text, re.M)
    status = re.search(r"^Exit status:\s*(\d+)", text, re.M)
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


def _strip_repo_root(path: str) -> str:
    """Keep the workspace-relative tail of a diagnostic file path.

    Args:
        path: The file path from a diagnostic line.

    Returns:
        The path from `apps/`, `packages/`, or `services/` onward.
    """
    match = re.search(r"(?:^|/)((?:apps|packages|services)/\S+)$", path)
    return match.group(1) if match else path


def parse_diagnostics(text: str) -> list[list[Any]]:
    """Parse TypeScript diagnostic lines into file, line, and code triples.

    Args:
        text: A type-check log.

    Returns:
        One `[file, line, code]` triple per diagnostic line.
    """
    triples: list[list[Any]] = []
    for line in text.splitlines():
        match = re.match(r"^(\S+?)\((\d+),\d+\): error (TS\d+):", line)
        if match is None:
            match = re.match(r"^(\S+?):(\d+):\d+ - error (TS\d+):", line)
        if match is not None:
            triples.append([_strip_repo_root(match.group(1)), int(match.group(2)), match.group(3)])
    return triples


def _triple_set(row: dict[str, Any] | None) -> set[tuple[Any, ...]]:
    """Return the diagnostic triple set of a type-check row.

    Args:
        row: A type-check row, or None.

    Returns:
        The set of `[file, line, code]` triples as tuples.
    """
    if not row:
        return set()
    return {tuple(t) for t in row.get("diagnostics", [])}


def _pair_set(row: dict[str, Any] | None) -> set[tuple[Any, ...]]:
    """Return the failure pair set of a test row.

    Args:
        row: A test run row, or None.

    Returns:
        The set of `[file, test name]` pairs as tuples.
    """
    if not row:
        return set()
    return {tuple(p) for p in row.get("failures", [])}


def _row_is_invalid(row: dict[str, Any] | None) -> tuple[bool, str]:
    """Decide whether a control or trial row is an invalid measurement.

    Args:
        row: A type-check or test row, or None.

    Returns:
        Whether the row is invalid, with the reason.
    """
    if not row:
        return True, "missing-row"
    exit_status = row.get("exit_status", 0)
    if exit_status in (124, 134, 137):
        return True, f"exit-{exit_status}"
    if exit_status != 0 and not row.get("diagnostics") and not row.get("failures") and not row.get("unparsed_tail"):
        return True, "unparsed-failure"
    return False, ""


def classify(
    kind: str,
    control_row: dict[str, Any] | None,
    trial_row: dict[str, Any] | None,
    flake: str | None = None,
    parity: bool = False,
) -> tuple[str, str]:
    """Classify one workspace and kind against the control row.

    Args:
        kind: `types` or `tests`.
        control_row: The 5.9.3 control row, or None.
        trial_row: The 7.0.x trial row, or None.
        flake: The flake rerun result (`pass`, `fail`, or None).
        parity: Whether the `--listFilesOnly` outputs match.

    Returns:
        The class and the cause or reason.
    """
    control_invalid, control_reason = _row_is_invalid(control_row)
    if control_invalid:
        return "invalid-measurement", control_reason
    trial_invalid, trial_reason = _row_is_invalid(trial_row)
    assert trial_row is not None and control_row is not None
    trial_exit = trial_row.get("exit_status", 0)
    if trial_exit in (134, 137):
        if trial_row.get("mem_repeat_exit") in (134, 137):
            return "regression", "memory"
        return "invalid-measurement", trial_reason or f"exit-{trial_exit}"
    if trial_invalid:
        return "invalid-measurement", trial_reason
    if kind == "tests":
        control_pairs = _pair_set(control_row)
        trial_pairs = _pair_set(trial_row)
        if not trial_pairs and trial_exit == 0:
            return "unchanged-pass", ""
        new_pairs = trial_pairs - control_pairs
        if new_pairs:
            if flake == "pass":
                return "flaky", ""
            return "regression", "other"
        if trial_pairs == control_pairs and trial_pairs:
            return "pre-existing", ""
        return "unchanged-pass", ""
    control_triples = _triple_set(control_row)
    trial_triples = _triple_set(trial_row)
    if not trial_triples and trial_exit == 0 and not control_triples and control_row.get("exit_status", 0) == 0:
        return "unchanged-pass", ""
    if trial_triples - control_triples or (trial_exit != 0 and control_row.get("exit_status", 0) == 0):
        return "regression", "other"
    if trial_triples < control_triples or (trial_exit == 0 and (control_triples or control_row.get("exit_status", 0) != 0)):
        if parity:
            return "improved", ""
        return "invalid-measurement", "diagnostics-missing"
    return "pre-existing", ""


def verdict(rows: list[dict[str, Any]]) -> str:
    """Compute the trial verdict from classified rows.

    Args:
        rows: Classified regression rows.

    Returns:
        `regressions-found`, `incomplete`, or `no-regression`.

    Raises:
        ValueError: When a row names a compiler outside `^7\\.0\\.\\d+$`.
    """
    for row in rows:
        compiler = str(row.get("trial_compiler", ""))
        if not TRIAL_COMPILER_PATTERN.match(compiler):
            raise ValueError(f"beta compiler in stable verdict: {compiler}")
    classes = [row.get("class") for row in rows]
    if "regression" in classes:
        return "regressions-found"
    for row in rows:
        if row.get("class") == "invalid-measurement" and row.get("workspace") != "apps/reading-advantage":
            return "incomplete"
    return "no-regression"


def test_command(package_name: str, script: str) -> str:
    """Build the trial test command for one workspace.

    Args:
        package_name: The workspace folder name.
        script: The manifest `test` script text.

    Returns:
        The `pnpm --filter` command with `--maxWorkers=1`.

    Raises:
        ValueError: When the script form is unknown.
    """
    text = script.strip()
    if text in ("vitest run", "vitest run --maxWorkers=1"):
        return f"pnpm --filter {package_name} exec vitest run --maxWorkers=1"
    if text == "jest" or text.startswith("jest "):
        return f"pnpm --filter {package_name} exec jest --maxWorkers=1"
    node_match = re.match(r"^node --test (\S+)$", text)
    if node_match:
        return f"pnpm --filter {package_name} exec node --test {node_match.group(1)}"
    raise ValueError(f"unknown test script form: {script}")


def lock_peer_consumers(lock_text: str) -> list[str]:
    """List the package names with a `typescript` peer dependency.

    Args:
        lock_text: The full text of `pnpm-lock.yaml`.

    Returns:
        The sorted package names whose block declares the peer.
    """
    consumers: set[str] = set()
    current: str | None = None
    for line in lock_text.splitlines():
        key = re.match(r"^  ([^ :][^:]*):$", line)
        if key:
            current = key.group(1)
            continue
        if re.match(r"^      typescript:( |$)", line) and current:
            name = current
            if name.startswith("@"):
                head, _, _ = name[1:].rpartition("@")
                name = "@" + head if head else name
            else:
                name, _, _ = name.rpartition("@")
            consumers.add(name or current)
    return sorted(consumers)


def escape_added(diff: str) -> list[str]:
    """Find type-safety escapes on added diff lines.

    Args:
        diff: A unified diff.

    Returns:
        The added lines that add an escape. Anchored patterns only.
    """
    patterns = (
        re.compile(r"^\+\s*(?://|#|<!--)?\s*@ts-ignore\b"),
        re.compile(r"^\+\s*(?://|#|<!--)?\s*@ts-nocheck\b"),
        re.compile(r"^\+\s*(?://|#|<!--)?\s*@ts-expect-error\b"),
        re.compile(r'^\+\s*"ignoreBuildErrors"\s*:\s*true'),
        re.compile(r'^\+\s*"skipLibCheck"\s*:\s*true'),
        re.compile(r'^\+\s*"strict"\s*:\s*false'),
    )
    hits: list[str] = []
    for line in diff.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            if any(p.search(line) for p in patterns):
                hits.append(line)
    return hits


def _trial_path_is_allowed(path: str) -> bool:
    """Decide whether a Green commit path stays in the trial scope.

    Args:
        path: A repository-relative path from a Green commit.

    Returns:
        True when a Green commit may touch the path.
    """
    if path == "measure/tracks/typescript7_native_migration_20260710/plan.md":
        return True
    if path.startswith("measure/tracks/typescript7_native_migration_20260710/evidence/phase3/"):
        return True
    if re.fullmatch(
        r"measure/runs/typescript7_native_migration_20260710/green-p3t-[^/]*\.log", path
    ):
        return True
    if path == "measure/tech-debt.md":
        return True
    return False


def _trial_tech_debt_diff_ok(diff: str) -> bool:
    """Check the Phase 2 append-only rule for a tech-debt diff.

    Args:
        diff: The unified diff of `measure/tech-debt.md`.

    Returns:
        True when no line is removed and every added line starts with
        `| 2026-` and holds the track id.
    """
    for line in diff.splitlines():
        if line.startswith("---") or line.startswith("+++"):
            continue
        if line.startswith("-"):
            return False
        if line.startswith("+"):
            body = line[1:]
            if not body.startswith("| 2026-"):
                return False
            if TRACK_ID not in body:
                return False
    return True


def _denied_trial_path(path: str) -> bool:
    """Decide whether a path is explicitly denied to Green commits.

    Args:
        path: A repository-relative path from a Green commit.

    Returns:
        True when the path must not change in Phase 3.
    """
    if path in ("pnpm-workspace.yaml", "pnpm-lock.yaml"):
        return True
    if path == "package.json" or path.endswith("/package.json"):
        return True
    if re.search(r"tsconfig[^/]*\.json$", path):
        return True
    if path.startswith("apps/") or path.startswith("packages/") or path.startswith("services/"):
        return True
    if path.endswith("compiler-baseline.json"):
        return True
    if re.search(r"phase1-[^/]*\.json$", path):
        return True
    if path.endswith("surface-inventory.json"):
        return True
    if path.endswith("capture-phase1-baseline.py"):
        return True
    if path.startswith("measure/tests/") and path.endswith(".py"):
        return True
    return False


def _run_git(arguments: list[str], workdir: Path = ROLE_WT) -> tuple[int, str]:
    """Run a read-only git command.

    Args:
        arguments: The git arguments.
        workdir: The repository folder.

    Returns:
        The exit code and the combined output.
    """
    proc = subprocess.run(
        ["git", "-C", str(workdir)] + arguments,
        capture_output=True,
        text=True,
        timeout=60,
    )
    return proc.returncode, (proc.stdout + proc.stderr)


def _read_text(path: Path) -> str | None:
    """Read a text file.

    Args:
        path: The file path.

    Returns:
        The text, or None when the file is missing or unreadable.
    """
    try:
        return path.read_text(encoding="utf-8")
    except (FileNotFoundError, NotADirectoryError, UnicodeDecodeError, OSError):
        return None


def _labeled_line_value(text: str, label: str) -> str | None:
    """Read a labeled value from the start of log lines.

    Args:
        text: The log text.
        label: The label with its `=` sign.

    Returns:
        The value, or None when no line starts with the label.
    """
    for line in text.splitlines():
        if line.startswith(label):
            return line[len(label):].strip()
    return None


def _load_record(test: unittest.TestCase) -> dict[str, Any]:
    """Load the TR1 record, or fail the calling test.

    Args:
        test: The calling test case.

    Returns:
        The parsed record.
    """
    text = _read_text(TRIAL_EVIDENCE_PATH)
    if text is None:
        test.fail(f"TR1 record is missing: {TRIAL_EVIDENCE_PATH}")
    try:
        record = json.loads(text)
    except json.JSONDecodeError as exc:
        test.fail(f"TR1 record does not parse: {exc}")
    assert isinstance(record, dict)
    return record


def _record_log(test: unittest.TestCase, value: Any, what: str) -> Path:
    """Resolve a log path from the record, or fail the calling test.

    Args:
        test: The calling test case.
        value: The log path value from the record.
        what: The field name for the message.

    Returns:
        The path under the repository root.
    """
    if not isinstance(value, str) or not value:
        test.fail(f"TR1 record field {what} is not a log path")
    path = REPO_ROOT / value
    if _read_text(path) is None:
        test.fail(f"TR1 log is missing or unreadable: {value}")
    return path


def _no_forbidden_keys(test: unittest.TestCase, node: Any, where: str) -> None:
    """Fail when a mapping key names a hash field.

    Args:
        test: The calling test case.
        node: The JSON node to scan.
        where: The location for the message.
    """
    if isinstance(node, dict):
        for key, value in node.items():
            if key in FORBIDDEN_KEY_NAMES:
                test.fail(f"TR1 record holds a hash key {key!r} at {where}")
            _no_forbidden_keys(test, value, f"{where}.{key}")
    elif isinstance(node, list):
        for index, value in enumerate(node):
            _no_forbidden_keys(test, value, f"{where}[{index}]")


class P3TrialHelperTests(unittest.TestCase):
    """Guards for the pure helpers that TR1 to TR8 reuse."""

    def test_latest_stable_picks_numeric_max(self) -> None:
        """The helper picks 7.0.10 over 7.0.2 by numeric order."""
        self.assertEqual(
            latest_stable_7_0(["7.0.2", "7.0.10", "7.0.1-rc", "7.1.0-beta"]),
            "7.0.10",
        )

    def test_latest_stable_rejects_empty(self) -> None:
        """An empty stable list raises instead of passing by default."""
        with self.assertRaises(ValueError):
            latest_stable_7_0(["7.0.1-rc", "7.1.0-beta"])

    def test_latest_stable_rejects_prerelease_pick(self) -> None:
        """A pre-release never wins over a stable patch."""
        self.assertEqual(latest_stable_7_0(["7.0.1-rc", "7.0.2"]), "7.0.2")

    def test_parse_time_v_reads_labels(self) -> None:
        """The helper reads RSS, wall time, and exit status by label."""
        sample = (
            "Maximum resident set size (kbytes): 123456\n"
            "Elapsed (wall clock) time (h:mm:ss or m:ss): 0:01.50\n"
            "Exit status: 0\n"
        )
        parsed = parse_time_v(sample)
        self.assertEqual(parsed["peak_rss_kib"], 123456)
        self.assertEqual(parsed["elapsed_ms"], 1500)
        self.assertEqual(parsed["exit_status"], 0)

    def test_parse_time_v_rejects_unlabeled(self) -> None:
        """Output without the labels raises instead of guessing."""
        with self.assertRaises(ValueError):
            parse_time_v("123456\n0:01.50\n0\n")

    def test_parse_diagnostics_reads_both_forms(self) -> None:
        """The helper reads tsc and tsgo diagnostic line forms."""
        text = (
            "/home/daniebo/Desktop/rama-worktrees/ts7-trial/packages/types/src/a.ts(12,3): error TS2304: nope\n"
            "packages/domain/src/b.ts:34:5 - error TS2591: nope\n"
            "some banner line without a diagnostic\n"
        )
        self.assertEqual(
            parse_diagnostics(text),
            [
                ["packages/types/src/a.ts", 12, "TS2304"],
                ["packages/domain/src/b.ts", 34, "TS2591"],
            ],
        )

    def test_parse_diagnostics_skips_banner(self) -> None:
        """Lines without a diagnostic code give no triple."""
        self.assertEqual(parse_diagnostics("Found 0 errors.\n"), [])

    def test_classify_regression_on_new_triple(self) -> None:
        """A trial triple outside the control set is a regression."""
        control = {"exit_status": 0, "diagnostics": [["packages/types/src/a.ts", 1, "TS2304"]]}
        trial = {
            "exit_status": 1,
            "diagnostics": [
                ["packages/types/src/a.ts", 1, "TS2304"],
                ["packages/types/src/a.ts", 2, "TS2580"],
            ],
        }
        name, _ = classify("types", control, trial)
        self.assertEqual(name, "regression")

    def test_classify_swapped_code_is_regression(self) -> None:
        """The same count with another code is a regression, not equal."""
        control = {"exit_status": 1, "diagnostics": [["packages/types/src/a.ts", 1, "TS2304"]]}
        trial = {"exit_status": 1, "diagnostics": [["packages/types/src/a.ts", 1, "TS2580"]]}
        name, _ = classify("types", control, trial)
        self.assertEqual(name, "regression")

    def test_classify_subset_needs_parity(self) -> None:
        """A smaller trial set is improved only with equal file lists."""
        control = {
            "exit_status": 1,
            "diagnostics": [
                ["packages/types/src/a.ts", 1, "TS2304"],
                ["packages/types/src/a.ts", 2, "TS2580"],
            ],
        }
        trial = {"exit_status": 0, "diagnostics": []}
        name, _ = classify("types", control, trial, parity=True)
        self.assertEqual(name, "improved")
        name, _ = classify("types", control, trial, parity=False)
        self.assertEqual(name, "invalid-measurement")

    def test_classify_invalid_control_stays_invalid(self) -> None:
        """An out-of-memory control row never becomes a regression."""
        control = {"exit_status": 134, "diagnostics": []}
        trial = {"exit_status": 1, "diagnostics": [["packages/types/src/a.ts", 1, "TS2304"]]}
        name, _ = classify("types", control, trial)
        self.assertEqual(name, "invalid-measurement")

    def test_classify_test_flake_rule(self) -> None:
        """A rerun pass makes a new test failure flaky, not a regression."""
        control = {"exit_status": 0, "failures": []}
        trial = {"exit_status": 1, "failures": [["suite.test.ts", "shows a thing"]]}
        name, _ = classify("tests", control, trial, flake="pass")
        self.assertEqual(name, "flaky")
        name, _ = classify("tests", control, trial, flake="fail")
        self.assertEqual(name, "regression")

    def test_verdict_counts_classes(self) -> None:
        """The verdict follows the classified rows."""
        rows = [
            {"workspace": "packages/types", "class": "unchanged-pass", "trial_compiler": "7.0.2"},
            {"workspace": "packages/domain", "class": "pre-existing", "trial_compiler": "7.0.2"},
        ]
        self.assertEqual(verdict(rows), "no-regression")
        rows.append(
            {"workspace": "apps/reading-advantage", "class": "invalid-measurement", "trial_compiler": "7.0.2"}
        )
        self.assertEqual(verdict(rows), "no-regression")
        rows.append(
            {"workspace": "packages/types", "class": "invalid-measurement", "trial_compiler": "7.0.2"}
        )
        self.assertEqual(verdict(rows), "incomplete")
        rows.append(
            {"workspace": "packages/domain", "class": "regression", "trial_compiler": "7.0.2"}
        )
        self.assertEqual(verdict(rows), "regressions-found")

    def test_verdict_rejects_beta_compiler(self) -> None:
        """A beta compiler row raises instead of deciding the verdict."""
        with self.assertRaises(ValueError):
            verdict([{"workspace": "packages/types", "class": "unchanged-pass", "trial_compiler": "7.1.0-beta"}])

    def test_command_builds_vitest_jest_and_node(self) -> None:
        """The builder maps each known script form to a pinned command."""
        self.assertEqual(
            test_command("my-pkg", "vitest run"),
            "pnpm --filter my-pkg exec vitest run --maxWorkers=1",
        )
        self.assertEqual(
            test_command("my-pkg", "jest"),
            "pnpm --filter my-pkg exec jest --maxWorkers=1",
        )
        self.assertEqual(
            test_command("my-pkg", "node --test run.test.js"),
            "pnpm --filter my-pkg exec node --test run.test.js",
        )
        with self.assertRaises(ValueError):
            test_command("my-pkg", "playwright test")

    def test_lock_peer_consumers_lists_typescript_peers(self) -> None:
        """The scanner names each package block with a typescript peer."""
        lock_text = (
            "importers:\n"
            "\n"
            "  apps/demo:\n"
            "    dependencies:\n"
            "      tsup:\n"
            "        specifier: 8.3.0\n"
            "\n"
            "packages:\n"
            "\n"
            "  tsup@8.3.0:\n"
            "    peerDependencies:\n"
            "      typescript: 5.9.3\n"
            "\n"
            "  vite@8.1.6:\n"
            "    peerDependencies:\n"
            "      fsevents: ~2.3.2\n"
            "\n"
            "  ts-node@10.9.2:\n"
            "    peerDependencies:\n"
            "      typescript: '>=2.7'\n"
        )
        self.assertEqual(lock_peer_consumers(lock_text), ["ts-node", "tsup"])

    def test_escape_added_finds_anchored_escapes(self) -> None:
        """Added escape lines match; plain words and context do not."""
        diff = (
            "--- a/x.ts\n"
            "+++ b/x.ts\n"
            "@@ -1 +1 @@\n"
            " const ok = 1;\n"
            "+// @ts-ignore: undo this\n"
            "+  \"ignoreBuildErrors\": true,\n"
            "+  \"strict\": false,\n"
            "+// the word never appears in a comment\n"
        )
        hits = escape_added(diff)
        self.assertEqual(len(hits), 3)
        self.assertEqual(escape_added(" const never = 1;\n"), [])


class P3TrialScopeTests(unittest.TestCase):
    """Scope rule for Green commits on `ts7/phase3`."""

    def test_scope_helper_accepts_allowed_paths(self) -> None:
        """Evidence, plan, the flat Green log, and tech debt pass."""
        self.assertTrue(
            _trial_path_is_allowed(
                "measure/tracks/typescript7_native_migration_20260710/evidence/phase3/trial/trial-worktree.json"
            )
        )
        self.assertTrue(
            _trial_path_is_allowed("measure/tracks/typescript7_native_migration_20260710/plan.md")
        )
        self.assertTrue(
            _trial_path_is_allowed(
                "measure/runs/typescript7_native_migration_20260710/green-p3t-tr1-abc1234.log"
            )
        )
        self.assertTrue(_trial_path_is_allowed("measure/tech-debt.md"))

    def test_scope_helper_rejects_product_paths(self) -> None:
        """Manifests, configs, code folders, and baselines fail."""
        for path in (
            "pnpm-lock.yaml",
            "pnpm-workspace.yaml",
            "apps/marketing/package.json",
            "packages/types/tsconfig.json",
            "apps/reading-advantage/src/x.ts",
            "measure/tracks/typescript7_native_migration_20260710/compiler-baseline.json",
            "measure/tracks/typescript7_native_migration_20260710/phase1-workspace-baseline.json",
            "measure/tracks/typescript7_native_migration_20260710/surface-inventory.json",
            "measure/tracks/typescript7_native_migration_20260710/capture-phase1-baseline.py",
            "measure/tests/test_typescript7_native_migration_phase2.py",
        ):
            self.assertFalse(_trial_path_is_allowed(path), path)
            self.assertTrue(_denied_trial_path(path), path)

    def test_tech_debt_diff_rule(self) -> None:
        """An append-only row with the track id passes; edits fail."""
        good = "+| 2026-11-28 | row holds typescript7_native_migration_20260710 |\n"
        self.assertTrue(_trial_tech_debt_diff_ok(good))
        removed = "-| 2026-11-28 | old row |\n"
        self.assertFalse(_trial_tech_debt_diff_ok(removed))
        missing_id = "+| 2026-11-28 | row without the id |\n"
        self.assertFalse(_trial_tech_debt_diff_ok(missing_id))
        bad_prefix = "+a row without the date pipe\n"
        self.assertFalse(_trial_tech_debt_diff_ok(bad_prefix))

    def test_green_commits_in_scope(self) -> None:
        """Every Green commit touches only the allowed trial paths."""
        commits = os.environ.get("P3_GREEN_COMMITS", "").split()
        if not commits:
            self.fail("P3_GREEN_COMMITS is unset or empty")
        for sha in commits:
            code, output = _run_git(["show", "--name-only", "--format=", sha])
            if code != 0:
                self.fail(f"Green commit does not resolve: {sha}")
            for path in output.splitlines():
                if not path.strip():
                    continue
                if not _trial_path_is_allowed(path.strip()):
                    self.fail(f"Green commit {sha} touches out-of-scope path: {path.strip()}")
                if path.strip() == "measure/tech-debt.md":
                    diff_code, diff = _run_git(["show", "--format=", "--", "measure/tech-debt.md", sha])
                    if diff_code != 0 or not _trial_tech_debt_diff_ok(diff):
                        self.fail(f"Green commit {sha} breaks the tech-debt append rule")

    def test_denied_paths_untouched(self) -> None:
        """No Green commit touches an explicitly denied path."""
        commits = os.environ.get("P3_GREEN_COMMITS", "").split()
        if not commits:
            self.fail("P3_GREEN_COMMITS is unset or empty")
        for sha in commits:
            code, output = _run_git(["show", "--name-only", "--format=", sha])
            if code != 0:
                self.fail(f"Green commit does not resolve: {sha}")
            for path in output.splitlines():
                if path.strip() and _denied_trial_path(path.strip()):
                    self.fail(f"Green commit {sha} touches denied path: {path.strip()}")


class P3TrialWorktreeTests(unittest.TestCase):
    """TR1 record: the trial worktree with the latest stable 7.0.x."""

    def test_record_parses(self) -> None:
        """The record exists, holds the TR1 keys, and adds no hash key."""
        record = _load_record(self)
        for key in EXPECTED_RECORD_KEYS:
            if key not in record:
                self.fail(f"TR1 record misses key: {key}")
        _no_forbidden_keys(self, record, "trial-worktree.json")

    def test_registry_choice_is_latest_stable(self) -> None:
        """The chosen version is the numeric maximum of the stable list."""
        record = _load_record(self)
        registry = record.get("registry")
        if not isinstance(registry, dict):
            self.fail("TR1 record registry block is not a mapping")
        versions = registry.get("versions_7_0_stable")
        if not isinstance(versions, list) or not versions:
            self.fail("TR1 registry versions_7_0_stable list is empty")
        try:
            expected = latest_stable_7_0([str(v) for v in versions])
        except ValueError:
            self.fail("TR1 registry list holds no stable 7.0.x version")
            return
        if registry.get("chosen") != expected:
            self.fail(
                f"TR1 chosen {registry.get('chosen')!r} is not the latest stable {expected!r}"
            )
        log_path = _record_log(self, registry.get("log"), "registry.log")
        text = _read_text(log_path)
        assert text is not None
        chosen_line = _labeled_line_value(text, "TS_CHOSEN=")
        if chosen_line != expected:
            self.fail(f"TR1 log TS_CHOSEN={chosen_line!r} differs from {expected!r}")

    def test_tsc_versions_match_logs(self) -> None:
        """State A reports 5.9.3 and state B reports the chosen 7.0.x."""
        record = _load_record(self)
        chosen = record.get("registry", {}).get("chosen")
        if not isinstance(chosen, str) or not TRIAL_COMPILER_PATTERN.match(chosen):
            self.fail("TR1 record has no valid chosen 7.0.x version")
            return
        for state, label, want in (
            ("state_a", "state A", "Version 5.9.3"),
            ("state_b", "state B", f"Version {chosen}"),
        ):
            block = record.get(state)
            if not isinstance(block, dict):
                self.fail(f"TR1 record {label} block is not a mapping")
                return
            log_path = _record_log(self, block.get("log"), f"{state}.log")
            text = _read_text(log_path)
            assert text is not None
            version = _labeled_line_value(text, "TSC_VERSION=")
            if version != want:
                self.fail(f"TR1 {label} log TSC_VERSION={version!r} differs from {want!r}")

    def test_single_typescript_after_swap(self) -> None:
        """Exactly one TypeScript version resolves after the swap."""
        record = _load_record(self)
        chosen = record.get("registry", {}).get("chosen")
        state_b = record.get("state_b")
        if not isinstance(state_b, dict):
            self.fail("TR1 record state_b block is not a mapping")
            return
        resolved = state_b.get("ts_resolved")
        if not isinstance(resolved, list) or len(resolved) != 1:
            count = len(resolved) if isinstance(resolved, list) else 0
            self.fail(f"TR1 ts_resolved count is {count}, want exactly 1")
            return
        if resolved[0] != chosen:
            self.fail(f"TR1 ts_resolved {resolved[0]!r} differs from chosen {chosen!r}")
        why_path = _record_log(self, state_b.get("why_log"), "state_b.why_log")
        text = _read_text(why_path)
        assert text is not None
        if _labeled_line_value(text, "TS_SINGLE=") != "1":
            self.fail("TR1 why log misses the labeled line TS_SINGLE=1")

    def test_worktree_placement(self) -> None:
        """The trial lives outside the main checkout on its own branch."""
        record = _load_record(self)
        worktree = record.get("worktree")
        if not isinstance(worktree, dict):
            self.fail("TR1 record worktree block is not a mapping")
            return
        if worktree.get("path") != TRIAL_PATH:
            self.fail(f"TR1 worktree path {worktree.get('path')!r} differs from {TRIAL_PATH!r}")
        if worktree.get("branch") != TRIAL_BRANCH:
            self.fail(f"TR1 worktree branch {worktree.get('branch')!r} differs from {TRIAL_BRANCH!r}")
        if TRIAL_PATH.startswith(str(MAIN_ROOT)):
            self.fail("TR1 worktree path must not sit under the main checkout")
        porcelain = worktree.get("porcelain")
        if not isinstance(porcelain, str) or TRIAL_PATH not in porcelain or TRIAL_BRANCH not in porcelain:
            self.fail("TR1 saved porcelain text lists neither the path nor the branch")

    def test_base_follows_strategy(self) -> None:
        """The trial base descends from the phase base with vinext 1.2.0."""
        phase_base = os.environ.get("P3_PHASE_BASE", "")
        if not phase_base:
            self.fail("P3_PHASE_BASE is unset or empty")
            return
        record = _load_record(self)
        base_sha = record.get("worktree", {}).get("base_sha")
        if not isinstance(base_sha, str) or not base_sha:
            self.fail("TR1 record worktree.base_sha is missing")
            return
        code, _ = _run_git(["merge-base", "--is-ancestor", phase_base, base_sha])
        if code != 0:
            self.fail(f"TR1 base {base_sha} does not descend from P3_PHASE_BASE")
        code, ws_yaml = _run_git(["show", f"{base_sha}:pnpm-workspace.yaml"])
        if code != 0 or "typescript: 5.9.3" not in ws_yaml:
            self.fail("TR1 base pnpm-workspace.yaml misses the pin typescript: 5.9.3")
        code, marketing = _run_git(["show", f"{base_sha}:apps/marketing/package.json"])
        if code != 0 or '"vinext": "1.2.0"' not in marketing:
            self.fail('TR1 base apps/marketing/package.json misses "vinext": "1.2.0"')

    def test_main_snapshots_unchanged(self) -> None:
        """The isolation snapshots match before and after the installs."""
        record = _load_record(self)
        snapshots = record.get("snapshots")
        if not isinstance(snapshots, dict):
            self.fail("TR1 record snapshots block is not a mapping")
            return
        for directory in ("main", "role"):
            before_path = _record_log(self, snapshots.get(f"{directory}_before_log"), f"snapshots.{directory}_before_log")
            after_path = _record_log(self, snapshots.get(f"{directory}_after_log"), f"snapshots.{directory}_after_log")
            before = _read_text(before_path)
            after = _read_text(after_path)
            assert before is not None and after is not None
            if before != after:
                self.fail(f"TR1 {directory} snapshot differs before and after the installs")
        after_epoch = snapshots.get("after_epoch")
        if not isinstance(after_epoch, int):
            self.fail("TR1 snapshots.after_epoch is not an integer")
            return
        swap_end = None
        gates = record.get("gates")
        if isinstance(gates, list):
            for gate in gates:
                if isinstance(gate, dict) and gate.get("id") == "TR1-swap-B":
                    start = gate.get("start_epoch")
                    elapsed = gate.get("elapsed_s")
                    if isinstance(start, int) and isinstance(elapsed, (int, float)):
                        swap_end = start + int(elapsed)
        if swap_end is not None and after_epoch < swap_end:
            self.fail("TR1 after_epoch predates the end of TR1-swap-B")

    def test_install_commit_only_pins(self) -> None:
        """The install commit touches the two pin files with one line."""
        record = _load_record(self)
        commit = record.get("install_commit")
        if not isinstance(commit, dict):
            self.fail("TR1 record install_commit block is not a mapping")
            return
        if sorted(commit.get("paths", [])) != sorted(INSTALL_COMMIT_PATHS):
            self.fail(f"TR1 install commit paths {commit.get('paths')!r} differ from the two pin files")
        if commit.get("ws_yaml_lines_changed") != 1:
            self.fail("TR1 ws_yaml_lines_changed is not the labeled integer 1")
        if commit.get("override_before") != "5.9.3":
            self.fail("TR1 override_before is not 5.9.3")
        chosen = record.get("registry", {}).get("chosen")
        if commit.get("override_after") != chosen:
            self.fail("TR1 override_after differs from the chosen version")

    def test_lock_keys_explained(self) -> None:
        """The lock diff swaps the compiler and explains every other key."""
        record = _load_record(self)
        chosen = record.get("registry", {}).get("chosen")
        if not isinstance(chosen, str) or not TRIAL_COMPILER_PATTERN.match(chosen):
            self.fail("TR1 record has no valid chosen 7.0.x version")
            return
        changes = record.get("lock_key_changes")
        if not isinstance(changes, dict):
            self.fail("TR1 record lock_key_changes block is not a mapping")
            return
        added = changes.get("added")
        removed = changes.get("removed")
        if not isinstance(added, list) or not isinstance(removed, list):
            self.fail("TR1 lock_key_changes added and removed lists are missing")
            return
        if "typescript@5.9.3" not in removed:
            self.fail("TR1 lock Key typescript@5.9.3 is not in the removed list")
        if f"typescript@{chosen}" not in added:
            self.fail(f"TR1 lock key typescript@{chosen} is not in the added list")
        drift = changes.get("explained_drift", [])
        drift_names = {entry.get("key") for entry in drift if isinstance(entry, dict)}
        for key in added:
            if key in (f"typescript@{chosen}",):
                continue
            if re.match(rf"^@typescript/typescript-.*@{re.escape(chosen)}$", str(key)):
                continue
            if key not in drift_names:
                self.fail(f"TR1 added lock key {key!r} has no explained_drift entry")
            entry = next(e for e in drift if isinstance(e, dict) and e.get("key") == key)
            if not entry.get("reason"):
                self.fail(f"TR1 explained_drift entry {key!r} holds no reason")
        scan_path = _record_log(self, changes.get("lock_scan_log"), "lock_key_changes.lock_scan_log")
        text = _read_text(scan_path)
        assert text is not None
        for label, values in (("LOCK_KEYS_ADDED=", added), ("LOCK_KEYS_REMOVED=", removed)):
            line = _labeled_line_value(text, label)
            if line is None:
                self.fail(f"TR1 lock scan log misses the labeled line {label}")
                return
            logged = sorted(v.strip() for v in line.split(",") if v.strip())
            if logged != sorted(str(v) for v in values):
                self.fail(f"TR1 {label}log lines differ from the record lists")
        build_added = changes.get("requires_build_added")
        if not isinstance(build_added, int):
            self.fail("TR1 requires_build_added is not a labeled integer")
        elif build_added != 0:
            allowed = set(changes.get("allow_builds", []))
            scan_hits = set(changes.get("requires_build_packages", []))
            if not scan_hits or not scan_hits.issubset(allowed):
                self.fail("TR1 requires_build_added packages are not all in allowBuilds")

    def test_gate_entries_valid(self) -> None:
        """Heavy gates ran at p2, exited 0, and never overlapped."""
        record = _load_record(self)
        gates = record.get("gates")
        if not isinstance(gates, list) or not gates:
            self.fail("TR1 record gates list is empty")
            return
        intervals: list[tuple[int, int, str]] = []
        for gate in gates:
            if not isinstance(gate, dict):
                self.fail("TR1 gate entry is not a mapping")
                return
            gate_id = gate.get("id", "?")
            for key in ("heavy", "heavy_command", "log", "start_epoch", "exit", "elapsed_s"):
                if key not in gate:
                    self.fail(f"TR1 gate {gate_id} misses key: {key}")
                    return
            if gate.get("heavy"):
                command = gate.get("heavy_command", "")
                if "HEAVY_PRIORITY=p2" not in command or "HEAVY_MIN_AVAIL_MB=1500" not in command:
                    self.fail(f"TR1 heavy gate {gate_id} misses the p2 priority labels")
                    return
                log_path = _record_log(self, gate.get("log"), f"gates.{gate_id}.log")
                text = _read_text(log_path)
                assert text is not None
                if not any(l.startswith("HEAVY_RUN_ACTIVE=1") for l in text.splitlines()):
                    self.fail(f"TR1 heavy gate {gate_id} log misses HEAVY_RUN_ACTIVE=1")
                    return
                if not any(l.startswith("HEAVY_PRIORITY=p2") for l in text.splitlines()):
                    self.fail(f"TR1 heavy gate {gate_id} log misses HEAVY_PRIORITY=p2")
                    return
            if gate.get("exit") != 0:
                self.fail(f"TR1 gate {gate_id} exit is not 0")
                return
            elapsed = gate.get("elapsed_s")
            if not isinstance(elapsed, (int, float)) or elapsed >= JOB_CAP_S:
                self.fail(f"TR1 gate {gate_id} elapsed time hits the job cap")
                return
            start = gate.get("start_epoch")
            if not isinstance(start, int):
                self.fail(f"TR1 gate {gate_id} start_epoch is not an integer")
                return
            intervals.append((start, start + int(elapsed), str(gate_id)))
        intervals.sort()
        for (first_start, first_end, first_id), (second_start, _, second_id) in zip(intervals, intervals[1:]):
            if second_start < first_end:
                self.fail(f"TR1 gate jobs overlap: {first_id} and {second_id}")

    def test_disk_floor(self) -> None:
        """Free disk meets the floor before the install and is saved after."""
        record = _load_record(self)
        disk = record.get("disk_free_mb")
        if not isinstance(disk, dict):
            self.fail("TR1 record disk_free_mb block is not a mapping")
            return
        before = disk.get("before")
        after = disk.get("after")
        if not isinstance(before, int) or before < DISK_FLOOR_MB:
            self.fail(f"TR1 disk_free_mb.before {before!r} is below the floor {DISK_FLOOR_MB}")
        if not isinstance(after, int):
            self.fail("TR1 disk_free_mb.after is not a saved integer")

    def test_no_deploy_or_push_in_logs(self) -> None:
        """No gate log holds a deploy or push command."""
        record = _load_record(self)
        gates = record.get("gates")
        if not isinstance(gates, list) or not gates:
            self.fail("TR1 record gates list is empty")
            return
        for gate in gates:
            if not isinstance(gate, dict):
                self.fail("TR1 gate entry is not a mapping")
                return
            log_value = gate.get("log")
            path = REPO_ROOT / log_value if isinstance(log_value, str) else None
            text = _read_text(path) if path is not None else None
            if text is None:
                self.fail(f"TR1 gate {gate.get('id', '?')} log is missing or unreadable")
                return
            for line in text.splitlines():
                if DEPLOY_PATTERN.search(line):
                    self.fail(f"TR1 gate {gate.get('id', '?')} log holds a deploy or push line")
                    return


if __name__ == "__main__":
    unittest.main()
