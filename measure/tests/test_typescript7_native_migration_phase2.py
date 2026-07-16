#!/usr/bin/env python3
"""Red contracts for the TypeScript 7 Native Migration Phase 2 harnesses.

The tests define the reusable Phase 2 API over deterministic fixture
executables. Fixtures are launched as real subprocesses by the future harness;
they are not evidence that either compiler is installed. Phase 2 Red is
expected to fail until ``typescript7_phase2_harness`` is implemented.
"""

from __future__ import annotations

import importlib
import hashlib
import json
import signal
import subprocess
import sys
import unittest
from pathlib import Path
from typing import Any, Callable


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_DIR = (
    REPO_ROOT / "measure" / "tracks" / "typescript7_native_migration_20260710"
)
FIXTURES = TRACK_DIR / "fixtures"
RUNNER = FIXTURES / "runner-fixtures" / "fixture_executable.py"
HARNESS_MODULE = "measure.tests.typescript7_phase2_harness"
FIXTURE_MANIFEST = FIXTURES / "fixture-manifest.json"


def _fixture_command(relative_fixture: str) -> list[str]:
    """Build a real-subprocess command for a pinned fixture record.

    Args:
        relative_fixture: Fixture path relative to the track fixtures directory.

    Returns:
        Python command that executes the deterministic fixture runner.
    """
    fixture = FIXTURES / relative_fixture
    if not RUNNER.is_file() or not fixture.is_file():
        raise AssertionError(f"missing Phase 2 fixture: {fixture}")
    return [sys.executable, "-B", str(RUNNER), str(fixture)]


def _load_fixture(relative_fixture: str) -> dict[str, Any]:
    """Load a JSON fixture object.

    Args:
        relative_fixture: Fixture path relative to the track fixtures directory.

    Returns:
        Parsed fixture object.
    """
    value = json.loads((FIXTURES / relative_fixture).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"fixture must contain an object: {relative_fixture}")
    return value


def _require_harness(function_name: str) -> Callable[..., Any]:
    """Load one required reusable harness function.

    Args:
        function_name: Public function required by a Phase 2 contract.

    Returns:
        Callable harness implementation.

    Raises:
        AssertionError: While the Phase 2 Green harness is absent or incomplete.
    """
    try:
        module = importlib.import_module(HARNESS_MODULE)
    except ModuleNotFoundError as error:
        if error.name != HARNESS_MODULE:
            raise
        raise AssertionError(
            f"Missing Phase 2 harness module {HARNESS_MODULE}; "
            f"cannot execute {function_name}"
        ) from error
    function = getattr(module, function_name, None)
    if not callable(function):
        raise AssertionError(
            f"Phase 2 harness must export callable {function_name}"
        )
    return function


def _prove_fixture_is_a_real_subprocess(relative_fixture: str) -> subprocess.CompletedProcess[str]:
    """Run a deterministic fixture in a separate operating-system process.

    Args:
        relative_fixture: Fixture path relative to the track fixtures directory.

    Returns:
        Completed subprocess result for non-mocked launch evidence.
    """
    return subprocess.run(
        _fixture_command(relative_fixture),
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )


def _tracked_tsconfig_paths() -> set[str]:
    """Derive the exact tracked tsconfig denominator from Git.

    Returns:
        Repository-relative tracked tsconfig paths outside generated directories.
    """
    completed = subprocess.run(
        ["git", "ls-files", "-z", "--", ":(glob)**/tsconfig*.json"],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
    )
    excluded = {"node_modules", ".next", ".turbo", "dist", "build", "generated"}
    return {
        path
        for path in completed.stdout.decode("utf-8").split("\0")
        if path and excluded.isdisjoint(Path(path).parts)
    }


def _assert_subprocess_evidence(report: dict[str, Any], minimum_runs: int = 1) -> None:
    """Require non-bypassable launch evidence produced by a harness function.

    Args:
        report: Harness return value containing subprocess evidence rows.
        minimum_runs: Minimum number of real launches the contract requires.
    """
    rows = report.get("subprocess_evidence")
    if not isinstance(rows, list) or len(rows) < minimum_runs:
        raise AssertionError("harness must return evidence for every real subprocess launch")
    required = {
        "command",
        "pid",
        "pgid",
        "exit_status",
        "stdout_sha256",
        "stderr_sha256",
        "started_at",
        "ended_at",
        "mocked",
    }
    for row in rows:
        if not isinstance(row, dict) or required - set(row):
            raise AssertionError("subprocess evidence row is incomplete")
        if row["mocked"] is not False or row["pid"] == 0 or row["pgid"] == 0:
            raise AssertionError("subprocess evidence must prove a non-mocked OS process")


class FixtureIntegrityContract(unittest.TestCase):
    """Pins every Phase 2 fixture by repository-relative path and SHA-256."""

    def test_fixture_manifest_matches_every_fixture_byte_for_byte(self) -> None:
        """Requires an exact, non-vacuous fixture path/hash manifest."""
        manifest = json.loads(FIXTURE_MANIFEST.read_text(encoding="utf-8"))
        self.assertIsInstance(manifest, dict)
        declared = manifest.get("files")
        self.assertIsInstance(declared, dict)
        assert isinstance(declared, dict)
        actual_paths = {
            path.relative_to(FIXTURES).as_posix()
            for path in FIXTURES.rglob("*")
            if path.is_file() and path != FIXTURE_MANIFEST
        }
        self.assertEqual(set(declared), actual_paths)
        self.assertTrue(declared, "fixture manifest cannot be empty")
        for relative_path, expected_hash in declared.items():
            actual_hash = hashlib.sha256((FIXTURES / relative_path).read_bytes()).hexdigest()
            self.assertEqual(actual_hash, expected_hash, relative_path)


class PackageResolutionContract(unittest.TestCase):
    """Contract for deterministic dual-installation resolution inspection."""

    def test_resolution_inspection_and_alias_swap_refutation(self) -> None:
        """Requires distinct TS6/TS7 paths and rejects a renamed TS7 alias."""
        live_fixture = _prove_fixture_is_a_real_subprocess(
            "alias-swap-fixture/expected-resolution.json"
        )
        self.assertEqual(live_fixture.returncode, 0)
        self.assertIn('"typescript_api_version": "6.0.2"', live_fixture.stdout)

        run_resolution_contract = _require_harness("run_resolution_contract")
        expected = run_resolution_contract(
            _fixture_command("alias-swap-fixture/expected-resolution.json")
        )
        self.assertEqual(expected["typescript_api_version"], "6.0.2")
        self.assertEqual(expected["native_compiler_version"], "7.0.2")
        self.assertNotEqual(expected["ts6_physical_path"], expected["ts7_physical_path"])
        self.assertTrue(expected["typescript_api_path"].startswith(expected["ts6_physical_path"]))
        _assert_subprocess_evidence(expected)

        with self.assertRaises(AssertionError):
            run_resolution_contract(
                _fixture_command("alias-swap-fixture/renamed-alias.json")
            )


class TsconfigCompatibilityContract(unittest.TestCase):
    """Read-only contract for TypeScript 7 tsconfig option compatibility."""

    def test_tsconfig_matrix_rejects_removed_options_and_accepts_types_postures(self) -> None:
        """Covers emit modes, removed options, and three valid types postures."""
        repository_paths = _tracked_tsconfig_paths()
        self.assertEqual(len(repository_paths), 39)
        audit_tsconfig_matrix = _require_harness("audit_tsconfig_matrix")
        report = audit_tsconfig_matrix(
            FIXTURES / "tsconfig-matrix/matrix.json",
            repository_paths=sorted(repository_paths),
        )
        self.assertEqual(report["checked"], 39)
        self.assertEqual(set(report["audited_paths"]), repository_paths)
        self.assertEqual(set(report["emit_modes"]), {"emit", "no_emit"})
        self.assertEqual(
            report["emit_count"] + report["no_emit_count"],
            39,
        )
        self.assertEqual(
            set(report["valid_types_postures"]),
            {"narrow_explicit", "explicit_empty", "inherited_omission"},
        )
        self.assertEqual(
            {violation["id"] for violation in report["fixture_violations"]},
            {
                "removed-baseUrl",
                "legacy-moduleResolution",
                "removed-suppressExcessPropertyErrors",
                "missing-ambient-types",
                "unnecessary-ambient-types",
                "unsupported-module-resolution-combination",
                "unsupported-target-module-combination",
                "unsupported-interoperability-combination",
            },
        )
        self.assertEqual(len(report["repository_audit"]), 39)
        self.assertEqual(report["repository_violations"], [])


class DiagnosticParityContract(unittest.TestCase):
    """Real-subprocess contract for normalized TypeScript 6/7 diagnostics."""

    def test_parity_normalization_and_missing_diagnostic_refutation(self) -> None:
        """Accepts reordered equivalent streams and rejects one missing diagnostic."""
        ts6_process = _prove_fixture_is_a_real_subprocess(
            "parity-broken-diagnostic/ts6.json"
        )
        ts7_process = _prove_fixture_is_a_real_subprocess(
            "parity-broken-diagnostic/ts7-equivalent.json"
        )
        self.assertEqual(ts6_process.returncode, 2)
        self.assertEqual(ts7_process.returncode, 2)
        self.assertNotEqual(ts6_process.stdout, ts7_process.stdout)

        run_diagnostic_parity = _require_harness("run_diagnostic_parity")
        report = run_diagnostic_parity(
            _fixture_command("parity-broken-diagnostic/ts6.json"),
            _fixture_command("parity-broken-diagnostic/ts7-equivalent.json"),
            ledger=[],
        )
        self.assertEqual(report["compiler_runs"], 2)
        self.assertEqual(report["unexplained_differences"], [])
        _assert_subprocess_evidence(report, minimum_runs=2)
        self.assertIn("raw_streams", report)

        equivalent_nonzero = run_diagnostic_parity(
            _fixture_command("parity-broken-diagnostic/ts6.json"),
            _fixture_command("parity-broken-diagnostic/ts7-equivalent-exit1.json"),
            ledger=[],
        )
        self.assertEqual(equivalent_nonzero["unexplained_differences"], [])

        clean = run_diagnostic_parity(
            _fixture_command("benchmark-empty-fixture/exit-zero.json"),
            _fixture_command("benchmark-empty-fixture/exit-zero.json"),
            ledger=[],
        )
        self.assertEqual(clean["compiler_runs"], 2)

        DiagnosticParityError = _require_harness("DiagnosticParityError")
        ts7_missing_process = _prove_fixture_is_a_real_subprocess(
            "parity-broken-diagnostic/ts7-missing.json"
        )
        with self.assertRaisesRegex(DiagnosticParityError, "missing TS 7 diagnostic") as caught:
            run_diagnostic_parity(
                _fixture_command("parity-broken-diagnostic/ts6.json"),
                _fixture_command("parity-broken-diagnostic/ts7-missing.json"),
                ledger=[],
            )
        parity_error = caught.exception
        self.assertEqual(parity_error.raw_streams["ts6"]["stdout"], ts6_process.stdout)
        self.assertEqual(parity_error.raw_streams["ts7"]["stdout"], ts7_missing_process.stdout)
        self.assertEqual(len(parity_error.subprocess_evidence), 2)
        self.assertEqual(
            parity_error.subprocess_evidence[0]["stdout_sha256"],
            hashlib.sha256(ts6_process.stdout.encode("utf-8")).hexdigest(),
        )
        self.assertEqual(
            parity_error.subprocess_evidence[1]["stdout_sha256"],
            hashlib.sha256(ts7_missing_process.stdout.encode("utf-8")).hexdigest(),
        )
        with self.assertRaisesRegex(AssertionError, "zero compiler runs"):
            run_diagnostic_parity([], [], ledger=[])
        with self.assertRaisesRegex(AssertionError, "compiler success semantics differ"):
            run_diagnostic_parity(
                _fixture_command("parity-broken-diagnostic/ts6.json"),
                _fixture_command("benchmark-empty-fixture/exit-zero.json"),
                ledger=[],
            )
        with self.assertRaisesRegex(
            DiagnosticParityError, "compiler runtime failure: ts6 terminated by signal 15"
        ) as runtime_failure:
            run_diagnostic_parity(
                [
                    sys.executable,
                    "-B",
                    "-c",
                    "import os, signal; os.kill(os.getpid(), signal.SIGTERM)",
                ],
                _fixture_command("benchmark-empty-fixture/exit-zero.json"),
                ledger=[],
            )
        self.assertEqual(
            runtime_failure.exception.subprocess_evidence[0]["exit_status"],
            -signal.SIGTERM,
        )
        self.assertEqual(runtime_failure.exception.raw_streams["ts6"], {"stdout": "", "stderr": ""})
        with self.assertRaisesRegex(AssertionError, "ledger entry missing reviewed metadata"):
            run_diagnostic_parity(
                _fixture_command("parity-broken-diagnostic/ts6.json"),
                _fixture_command("parity-broken-diagnostic/ts7-missing.json"),
                ledger=[{"diagnostic": "unreviewed"}],
            )
        reviewed = run_diagnostic_parity(
            _fixture_command("parity-broken-diagnostic/ts6.json"),
            _fixture_command("parity-broken-diagnostic/ts7-missing.json"),
            ledger=[
                {
                    "diagnostic": "src/b.ts(8,1): error TS2304: Cannot find name 'missing'.",
                    "tsconfig_path": "fixture",
                    "absent_from": "ts7",
                    "reviewed_by": "phase-2-test",
                    "reviewed_at": "2026-07-15T00:00:00Z",
                    "reason": "deliberate ledger binding counterprobe",
                }
            ],
        )
        self.assertEqual(reviewed["unexplained_differences"], [])
        self.assertEqual(len(reviewed["applied_ledger_entries"]), 1)
        self.assertEqual(
            reviewed["applied_ledger_entries"][0]["reviewed_by"], "phase-2-test"
        )
        with self.assertRaisesRegex(AssertionError, "unused reviewed parity ledger entry"):
            run_diagnostic_parity(
                _fixture_command("benchmark-empty-fixture/exit-zero.json"),
                _fixture_command("benchmark-empty-fixture/exit-zero.json"),
                ledger=[
                    {
                        "diagnostic": "error TS9999: stale exception",
                        "tsconfig_path": "fixture",
                        "absent_from": "ts7",
                        "reviewed_by": "phase-2-test",
                        "reviewed_at": "2026-07-15T00:00:00Z",
                        "reason": "deliberate stale ledger counterprobe",
                    }
                ],
            )


class BenchmarkContract(unittest.TestCase):
    """Contract for labeled benchmark parsing and fail-closed stop losses."""

    def test_benchmark_parser_false_speedup_and_resource_refutations(self) -> None:
        """Parses labeled data and rejects false speedups and malformed resources."""
        run_benchmark_contract = _require_harness("run_benchmark_contract")
        valid_record = run_benchmark_contract(
            _fixture_command("benchmark-empty-fixture/exit-zero.json"),
            _load_fixture("resource-parser-fixtures/valid.json"),
            expected_diagnostic_count=0,
        )
        self.assertIn(valid_record["host_idle_class"], {"idle", "invalid"})
        self.assertGreaterEqual(valid_record["peak_rss_kib"], 0)
        self.assertIn(valid_record["dmesg_status"], {"available", "unavailable"})
        self.assertIn("elapsed_ms", valid_record)
        self.assertIn("process_group_peak_rss_kib", valid_record)
        self.assertEqual(
            valid_record["subprocess_evidence"][0]["command"][0], "/usr/bin/time"
        )
        _assert_subprocess_evidence(valid_record)

        with self.assertRaisesRegex(AssertionError, "false speedup"):
            run_benchmark_contract(
                _fixture_command("benchmark-empty-fixture/exit-zero.json"),
                _load_fixture("resource-parser-fixtures/valid.json"),
                expected_diagnostic_count=1,
            )
        for fixture in (
            "resource-parser-fixtures/string.json",
            "resource-parser-fixtures/boolean.json",
            "resource-parser-fixtures/negative-rss.json",
            "resource-parser-fixtures/above-ceiling.json",
        ):
            with self.subTest(fixture=fixture):
                with self.assertRaises(AssertionError):
                    run_benchmark_contract(
                        _fixture_command("benchmark-empty-fixture/exit-zero.json"),
                        _load_fixture(fixture),
                        expected_diagnostic_count=0,
                    )
        with self.assertRaisesRegex(AssertionError, "benchmark subprocess exited"):
            run_benchmark_contract(
                _fixture_command("runner-fixtures/nonzero.json"),
                _load_fixture("resource-parser-fixtures/valid.json"),
                expected_diagnostic_count=0,
            )

    def test_benchmark_matrix_medians_idle_labeled_time_and_negative_swap(self) -> None:
        """Requires 3+3 medians, labeled parsing, idle invalidation, and signed swap."""
        parse_time_output = _require_harness("parse_time_output")
        summarize_benchmark_samples = _require_harness("summarize_benchmark_samples")
        run_benchmark_contract = _require_harness("run_benchmark_contract")
        labeled = _load_fixture("benchmark-empty-fixture/labeled-time.json")
        parsed = parse_time_output(labeled["time_output"])
        self.assertEqual(parsed["peak_rss_kib"], 4096)
        self.assertEqual(parsed["elapsed_ms"], 1250)

        summary = summarize_benchmark_samples(
            _load_fixture("benchmark-empty-fixture/six-samples.json")["samples"]
        )
        self.assertEqual(summary["cold_sample_count"], 3)
        self.assertEqual(summary["warm_sample_count"], 3)
        self.assertEqual(summary["cold_median_ms"], 110)
        self.assertEqual(summary["warm_median_ms"], 55)

        idle_invalid = run_benchmark_contract(
            _fixture_command("benchmark-empty-fixture/exit-zero.json"),
            _load_fixture("resource-parser-fixtures/idle-invalid.json"),
            expected_diagnostic_count=0,
        )
        self.assertEqual(idle_invalid["host_idle_class"], "invalid")
        negative_swap = run_benchmark_contract(
            _fixture_command("benchmark-empty-fixture/exit-zero.json"),
            _load_fixture("resource-parser-fixtures/negative-swap-valid.json"),
            expected_diagnostic_count=0,
        )
        self.assertEqual(
            negative_swap["fixture_resource_input"]["swap_delta_kib"], -128
        )
        _assert_subprocess_evidence(negative_swap)

        live_stop = run_benchmark_contract(
            _fixture_command("benchmark-empty-fixture/ignores-sigterm.json"),
            _load_fixture("resource-parser-fixtures/stop-loss-live.json"),
            expected_diagnostic_count=0,
        )
        self.assertTrue(live_stop["stop_loss"]["triggered"])
        self.assertEqual(live_stop["stop_loss"]["trigger"], "process_group_rss")
        self.assertEqual(
            live_stop["stop_loss"]["events"],
            ["SIGTERM", "grace:5s", "SIGKILL", "reaped"],
        )
        self.assertTrue(live_stop["stop_loss"]["reaped"])

    def test_stop_loss_targets_pgid_escalates_after_five_seconds_and_reaps(self) -> None:
        """Requires PGID SIGTERM, bounded grace, SIGKILL, and reap verification."""
        run_stop_loss_contract = _require_harness("run_stop_loss_contract")
        report = run_stop_loss_contract(
            _fixture_command("benchmark-empty-fixture/ignores-sigterm.json"),
            terminate_after_ms=500,
            sigterm_grace_seconds=5,
        )
        self.assertEqual(report["signal_target"], "process_group")
        self.assertEqual(report["events"], ["SIGTERM", "grace:5s", "SIGKILL", "reaped"])
        self.assertTrue(report["reaped"])
        self.assertEqual(report["surviving_pids"], [])
        _assert_subprocess_evidence(report)


class TurboCacheInvalidationContract(unittest.TestCase):
    """Pure fixture contract for compiler-identity cache invalidation."""

    def test_compiler_identity_change_bypasses_cache_and_no_change_refutes(self) -> None:
        """Requires TS7 alias identity changes to force execution rather than cache hits."""
        run_cache_invalidation_contract = _require_harness(
            "run_cache_invalidation_contract"
        )
        report = run_cache_invalidation_contract(
            _fixture_command("cache-invalidation-fixture/baseline.json"),
            _fixture_command("cache-invalidation-fixture/changed-compiler.json"),
        )
        self.assertTrue(report["cache_bypassed"])
        self.assertTrue(report["task_reexecuted"])
        _assert_subprocess_evidence(report, minimum_runs=2)
        with self.assertRaisesRegex(AssertionError, "compiler identity"):
            run_cache_invalidation_contract(
                _fixture_command("cache-invalidation-fixture/baseline.json"),
                _fixture_command("cache-invalidation-fixture/unchanged-compiler.json"),
            )


class CompilerConsumerSmokeContract(unittest.TestCase):
    """Real-subprocess contract for compiler-consumer ownership classification."""

    def test_consumer_classification_and_fail_closed_counterexamples(self) -> None:
        """Classifies three outcomes and rejects missing, ambiguous, or red probes."""
        contract = json.loads(
            (TRACK_DIR / "dual-compiler-contract.json").read_text(encoding="utf-8")
        )
        ownership_consumers = {row["consumer"] for row in contract["ownership_matrix"]}
        matrix = _load_fixture("runner-fixtures/consumer-matrix.json")
        fixture_consumers = {row["consumer"] for row in matrix["rows"]}
        self.assertEqual(fixture_consumers, ownership_consumers)

        run_consumer_smoke_matrix = _require_harness("run_consumer_smoke_matrix")
        report = run_consumer_smoke_matrix(matrix, fixture_root=FIXTURES)
        self.assertEqual(report["consumer_count"], len(ownership_consumers))
        self.assertEqual(set(report["consumers"]), ownership_consumers)
        _assert_subprocess_evidence(report, minimum_runs=len(ownership_consumers))

        first_row = dict(matrix["rows"][0])
        for fixture in (
            "/tmp/outside-manifest.json",
            "../fixture-manifest.json",
            "fixture-manifest.json",
        ):
            with self.subTest(fixture_path=fixture):
                outside_matrix = {"rows": [{**first_row, "fixture": fixture}]}
                with self.assertRaises(AssertionError):
                    run_consumer_smoke_matrix(outside_matrix, fixture_root=FIXTURES)
        with self.assertRaises(AssertionError):
            run_consumer_smoke_matrix(matrix, fixture_root=FIXTURES.parent)

        classify_consumer = _require_harness("classify_consumer")

        for fixture in (
            "runner-fixtures/nonzero.json",
            "runner-fixtures/missing-resolution.json",
            "runner-fixtures/ambiguous.json",
        ):
            with self.subTest(fixture=fixture):
                with self.assertRaises(AssertionError):
                    classify_consumer(_fixture_command(fixture))


if __name__ == "__main__":
    unittest.main()
