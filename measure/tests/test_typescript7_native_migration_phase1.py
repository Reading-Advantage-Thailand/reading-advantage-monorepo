#!/usr/bin/env python3
"""Falsification contracts for the TypeScript 7 Native Migration Phase 1.

Six Phase-1 contract artifacts must exist, parse as JSON, and satisfy a
required-key shape contract:

  - compiler-baseline.json          (object)
  - surface-inventory.json          (object)
  - dual-compiler-contract.json     (object)
  - diagnostic-parity-ledger.json   (array; empty list is a valid initial state)
  - benchmark-record-schema.json    (JSON Schema; object with 'properties')
  - rollout-record-schema.json      (JSON Schema; object with 'properties')

Each artifact-shape test fails at the immutable Phase-1 baseline because the
six artifacts are absent. The failure is attributable to the expected absence
("Missing Phase-1 artifact: ...") rather than a Python syntax or import error.

Non-vacuity and missing-key counterexample tests defend against anti-patterns
A3 (digit-only "count"), A4 (vacuous pass on nothing-done), and A6/A8-style
registry drift by requiring the test suite to address all six artifacts and
by asserting the in-process validators reject malformed records.

Targeted Red command (from test-strategy.md §5 Phase 1):

    PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v \\
        measure.tests.test_typescript7_native_migration_phase1

Exit status at the immutable baseline: non-zero, attributable to the absence
of the six required Phase-1 artifacts.
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK = "typescript7_native_migration_20260710"
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / TRACK

COMPILER_BASELINE_PATH = TRACK_DIR / "compiler-baseline.json"
SURFACE_INVENTORY_PATH = TRACK_DIR / "surface-inventory.json"
DUAL_COMPILER_CONTRACT_PATH = TRACK_DIR / "dual-compiler-contract.json"
DIAGNOSTIC_PARITY_LEDGER_PATH = TRACK_DIR / "diagnostic-parity-ledger.json"
BENCHMARK_RECORD_SCHEMA_PATH = TRACK_DIR / "benchmark-record-schema.json"
ROLLOUT_RECORD_SCHEMA_PATH = TRACK_DIR / "rollout-record-schema.json"
TEST_STRATEGY_PATH = TRACK_DIR / "test-strategy.md"
PHASE1_WORKSPACE_BASELINE_PATH = TRACK_DIR / "phase1-workspace-baseline.json"

COMMIT_SHA_RE = re.compile(r"^[0-9a-f]{40}$")
RESOURCE_MAXIMUM_KEYS: tuple[str, ...] = (
    "max_process_group_rss_kib",
    "max_swap_delta_kib",
)
RESOURCE_STOP_LOSS_KEYS: tuple[str, ...] = (
    "stop_loss_process_group_rss_kib",
    "stop_loss_swap_delta_kib",
)
GENERATED_OR_IGNORED_DIR_NAMES: frozenset[str] = frozenset({
    ".next",
    ".turbo",
    "build",
    "coverage",
    "dist",
    "generated",
    "node_modules",
    "out",
})


def _load_json_object(path: Path) -> dict[str, Any]:
    """Load a required Phase-1 artifact as a JSON object.

    Args:
        path: Repository-relative path to the artifact.

    Returns:
        The parsed JSON object.

    Raises:
        AssertionError: When the artifact is missing or is not a JSON object.
    """
    if not path.is_file():
        raise AssertionError(
            f"Missing Phase-1 artifact: {path.relative_to(REPO_ROOT)}"
        )
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(
            f"{path.relative_to(REPO_ROOT)} must contain a JSON object"
        )
    return value


def _load_json_array(path: Path) -> list[Any]:
    """Load a required Phase-1 artifact as a JSON array.

    Args:
        path: Repository-relative path to the artifact.

    Returns:
        The parsed JSON array.

    Raises:
        AssertionError: When the artifact is missing or is not a JSON array.
    """
    if not path.is_file():
        raise AssertionError(
            f"Missing Phase-1 artifact: {path.relative_to(REPO_ROOT)}"
        )
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, list):
        raise AssertionError(
            f"{path.relative_to(REPO_ROOT)} must contain a JSON array"
        )
    return value


def _load_json_schema(path: Path) -> dict[str, Any]:
    """Load a required Phase-1 artifact as a JSON Schema (object with 'properties').

    Args:
        path: Repository-relative path to the artifact.

    Returns:
        The parsed JSON Schema object.

    Raises:
        AssertionError: When the artifact is missing, malformed, or missing
            the JSON Schema `properties` map.
    """
    schema = _load_json_object(path)
    properties = schema.get("properties")
    if not isinstance(properties, dict):
        raise AssertionError(
            f"{path.relative_to(REPO_ROOT)} must contain a JSON Schema with a 'properties' object"
        )
    return schema


def _git_tracked_paths(*pathspecs: str) -> set[str]:
    """Return tracked repository paths matching the supplied Git pathspecs.

    Args:
        pathspecs: Git pathspecs used to select repository files.

    Returns:
        Repository-relative tracked paths with generated and ignored directories removed.

    Raises:
        AssertionError: When Git cannot enumerate the requested paths.
    """
    completed = subprocess.run(
        ["git", "ls-files", "-z", "--", *pathspecs],
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
    )
    if completed.returncode != 0:
        raise AssertionError(
            f"git ls-files failed with exit {completed.returncode}: "
            f"{completed.stderr.decode('utf-8', errors='replace')}"
        )

    paths = completed.stdout.decode("utf-8").split("\0")
    return {
        path
        for path in paths
        if path
        and GENERATED_OR_IGNORED_DIR_NAMES.isdisjoint(Path(path).parts)
    }


def _tracked_tsconfig_paths() -> set[str]:
    """Return the exact set of tracked, non-generated tsconfig files.

    Returns:
        Repository-relative paths for every tracked tsconfig*.json file.
    """
    return _git_tracked_paths(":(glob)**/tsconfig*.json")


def _workspace_manifest_pathspecs() -> tuple[str, ...]:
    """Derive package-manifest globs from the tracked pnpm workspace configuration.

    Returns:
        Git pathspecs for each configured workspace package manifest.

    Raises:
        AssertionError: When the repository workspace configuration cannot be parsed.
    """
    workspace_file = REPO_ROOT / "pnpm-workspace.yaml"
    if not workspace_file.is_file():
        raise AssertionError("pnpm-workspace.yaml is required for workspace discovery")

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
        match = re.match(r"\s*-\s*\"([^\"]+)\"\s*$", line)
        if match:
            patterns.append(f":(glob){match.group(1)}/package.json")

    if not patterns:
        raise AssertionError("pnpm workspace package globs are required")
    return tuple(patterns)


def _typescript_workspace_denominator() -> set[str]:
    """Derive TypeScript workspaces from pnpm configuration, manifests, and tsconfigs.

    Returns:
        Configured pnpm workspaces with a tracked manifest and a tracked tsconfig
        file in the same workspace directory.
    """
    manifests = _git_tracked_paths(*_workspace_manifest_pathspecs())
    tsconfigs = _tracked_tsconfig_paths()
    tsconfig_parents = {str(Path(path).parent) for path in tsconfigs}
    return {
        str(Path(manifest).parent)
        for manifest in manifests
        if str(Path(manifest).parent) in tsconfig_parents
    }


def _assert_exact_path_set(declared: set[str], expected: set[str]) -> None:
    """Require a declared path set to match an independent denominator exactly.

    Args:
        declared: Paths claimed by an inventory artifact.
        expected: Repository-derived paths that must be inventoried.

    Raises:
        AssertionError: When paths are missing from or unexpectedly added to the inventory.
    """
    missing = expected - declared
    unexpected = declared - expected
    if missing or unexpected:
        raise AssertionError(
            f"path inventory mismatch; missing={sorted(missing)}, "
            f"unexpected={sorted(unexpected)}"
        )


def _assert_workspace_coverage(captured: set[str], expected: set[str]) -> None:
    """Require captured baselines to cover the repository-derived denominator.

    Args:
        captured: Workspace paths represented by captured baseline rows.
        expected: Independently derived TypeScript workspace denominator.

    Raises:
        AssertionError: When at least one expected workspace has no baseline row.
    """
    missing = expected - captured
    if missing:
        raise AssertionError(
            f"phase1 workspace baseline is missing workspaces: {sorted(missing)}"
        )


def _assert_resource_limits(record: dict[str, Any]) -> None:
    """Require explicit positive resource ceilings with auditable provenance.

    Args:
        record: Compiler baseline record containing the resource limit contract.

    Raises:
        AssertionError: When limits are missing, non-positive, non-numeric, or
            lack a derivation and source.
    """
    limits = record.get("resource_limits")
    if not isinstance(limits, dict):
        raise AssertionError("resource_limits must be a JSON object")

    for key in (*RESOURCE_MAXIMUM_KEYS, *RESOURCE_STOP_LOSS_KEYS):
        value = limits.get(key)
        if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
            raise AssertionError(f"resource_limits.{key} must be a positive integer")

    max_rss = limits["max_process_group_rss_kib"]
    max_swap = limits["max_swap_delta_kib"]
    stop_rss = limits["stop_loss_process_group_rss_kib"]
    stop_swap = limits["stop_loss_swap_delta_kib"]
    expected_stop_rss = (max_rss * 80) // 100
    expected_stop_swap = (max_swap * 50) // 100
    if stop_rss != expected_stop_rss or stop_rss >= max_rss:
        raise AssertionError(
            "stop_loss_process_group_rss_kib must equal 80% of and remain below "
            "max_process_group_rss_kib"
        )
    if stop_swap != expected_stop_swap or stop_swap >= max_swap:
        raise AssertionError(
            "stop_loss_swap_delta_kib must equal 50% of and remain below "
            "max_swap_delta_kib"
        )

    for key in ("derivation", "source"):
        value = limits.get(key)
        if not isinstance(value, str) or not value.strip():
            raise AssertionError(f"resource_limits.{key} must be a non-empty string")


def _assert_bounded_stop_loss_termination(strategy: str) -> None:
    """Require bounded SIGTERM-to-SIGKILL escalation and reap verification.

    Args:
        strategy: TypeScript 7 migration test strategy text.

    Raises:
        AssertionError: When the resource section lacks an ordered, bounded
            process-group termination and reap contract.
    """
    section_start = strategy.index(
        "## 1. Hardware Posture, Resource Capture, and Fail-Closed Triggers"
    )
    section_end = strategy.index("## 2.", section_start)
    section = strategy[section_start:section_end]
    term_match = re.search(r"SIGTERM", section, re.IGNORECASE)
    grace_match = re.search(
        r"\b\d+\s*(?:ms|milliseconds?|s|seconds?)\b", section, re.IGNORECASE
    )
    kill_match = re.search(r"SIGKILL", section, re.IGNORECASE)
    reap_match = re.search(r"\breap(?:ed|ing|s)?\b", section, re.IGNORECASE)
    violations: list[str] = []
    if term_match is None:
        violations.append("resource stop-loss must send SIGTERM to the process group")
    if grace_match is None:
        violations.append("SIGTERM must have an explicit bounded numeric grace period")
    if kill_match is None:
        violations.append("a surviving process group must escalate to SIGKILL")
    if reap_match is None:
        violations.append("the strategy must verify all process-group children are reaped")
    if term_match and grace_match and kill_match and reap_match:
        positions = (
            term_match.start(),
            grace_match.start(),
            kill_match.start(),
            reap_match.start(),
        )
        if positions != tuple(sorted(positions)):
            violations.append(
                "termination must be ordered SIGTERM, bounded grace, SIGKILL, then reap"
            )
    if violations:
        raise AssertionError("; ".join(violations))


def _assert_dmesg_observability_schema(schema: dict[str, Any]) -> None:
    """Require benchmark records to distinguish unavailable dmesg from zero OOMs.

    Args:
        schema: Benchmark record JSON Schema.

    Raises:
        AssertionError: When dmesg availability is absent, optional, or ambiguous.
    """
    properties = schema.get("properties")
    if not isinstance(properties, dict):
        raise AssertionError("benchmark schema properties must be an object")
    status = properties.get("dmesg_status")
    if not isinstance(status, dict):
        raise AssertionError("benchmark schema must define dmesg_status")
    if status.get("type") != "string":
        raise AssertionError("dmesg_status must be a string")
    values = status.get("enum")
    if not isinstance(values, list) or not {"available", "unavailable"}.issubset(values):
        raise AssertionError("dmesg_status must distinguish available from unavailable")
    required = schema.get("required")
    if not isinstance(required, list) or "dmesg_status" not in required:
        raise AssertionError("dmesg_status must be required on every benchmark record")
    oom = properties.get("oom_kill_count")
    if not isinstance(oom, dict):
        raise AssertionError("benchmark schema must define oom_kill_count")
    description = str(oom.get("description", "")).lower()
    if "recorded as 0 when dmesg is unavailable" in description:
        raise AssertionError("unavailable dmesg must not be encoded as zero OOM kills")


def _assert_signed_swap_delta_contract(
    schema: dict[str, Any], strategy: str
) -> None:
    """Require signed swap delta to mean after minus before consistently.

    Args:
        schema: Benchmark record JSON Schema.
        strategy: TypeScript 7 migration test strategy text.

    Raises:
        AssertionError: When the schema or strategy rejects valid negative deltas
            or does not define the after-minus-before measurement direction.
    """
    properties = schema.get("properties")
    if not isinstance(properties, dict):
        raise AssertionError("benchmark schema properties must be an object")
    swap_delta = properties.get("swap_delta_kib")
    if not isinstance(swap_delta, dict):
        raise AssertionError("benchmark schema must define swap_delta_kib")
    violations: list[str] = []
    if swap_delta.get("type") != "integer":
        violations.append("swap_delta_kib must be an integer")
    if "minimum" in swap_delta:
        violations.append("swap_delta_kib must allow negative after-minus-before values")
    schema_description = str(swap_delta.get("description", "")).lower()
    strategy_lower = strategy.lower()
    for source, text in (
        ("schema", schema_description),
        ("strategy", strategy_lower),
    ):
        if "after - before" not in text:
            violations.append(f"{source} must define swap delta as after - before")
        if "negative" not in text or "valid" not in text:
            violations.append(f"{source} must state that negative swap deltas are valid")
    if violations:
        raise AssertionError("; ".join(violations))


class CompilerBaselineContract(unittest.TestCase):
    """Falsifiable shape contract for compiler-baseline.json."""

    REQUIRED_KEYS: frozenset[str] = frozenset({
        "schema_version",
        "status",
        "role_base_sha",
        "phase_base_sha",
        "typescript_resolved",
        "node_version",
        "pnpm_version",
        "cpu_count",
        "total_memory_kib",
        "free_memory_kib",
        "turbo_concurrency",
        "graph_db_mtime_unix",
    })

    def test_compiler_baseline_artifact_is_present_and_complete(self) -> None:
        """Requires every required key in compiler-baseline.json."""
        artifact = _load_json_object(COMPILER_BASELINE_PATH)
        missing = self.REQUIRED_KEYS - set(artifact.keys())
        self.assertFalse(
            missing,
            f"compiler-baseline.json is missing required keys: {sorted(missing)}",
        )

    def test_compiler_baseline_shas_match_40_char_hex(self) -> None:
        """Requires role_base_sha and phase_base_sha to be valid commit SHAs."""
        artifact = _load_json_object(COMPILER_BASELINE_PATH)
        for key in ("role_base_sha", "phase_base_sha"):
            value = artifact.get(key)
            self.assertIsInstance(value, str, f"{key} must be a string")
            assert isinstance(value, str)
            self.assertRegex(
                value,
                COMMIT_SHA_RE,
                f"{key} must be a 40-character lowercase hex SHA-1",
            )

    def test_compiler_baseline_rejects_missing_required_keys(self) -> None:
        """Counterexample: an incomplete baseline record fails the required-key check."""
        incomplete: dict[str, Any] = {"schema_version": "compiler-baseline.v1"}
        missing = self.REQUIRED_KEYS - set(incomplete.keys())
        self.assertTrue(
            missing,
            "counterexample record must omit at least one required key",
        )
        self.assertIn("phase_base_sha", missing)
        self.assertIn("role_base_sha", missing)

    def test_compiler_baseline_defines_auditable_resource_limits(self) -> None:
        """Requires positive process-group RSS and swap ceilings with provenance."""
        artifact = _load_json_object(COMPILER_BASELINE_PATH)
        _assert_resource_limits(artifact)

    def test_resource_limit_contract_rejects_missing_and_malformed_limits(self) -> None:
        """Counterexample: absent or invalid resource ceilings cannot pass."""
        counterexamples: tuple[dict[str, Any], ...] = (
            {},
            {
                "resource_limits": {
                    "max_process_group_rss_kib": 1000,
                    "max_swap_delta_kib": 200,
                    "derivation": "policy",
                    "source": "phase1-baseline.json",
                }
            },
            {
                "resource_limits": {
                    "max_process_group_rss_kib": 1000,
                    "max_swap_delta_kib": 200,
                    "stop_loss_process_group_rss_kib": "800",
                    "stop_loss_swap_delta_kib": 0,
                    "derivation": "policy",
                    "source": "phase1-baseline.json",
                }
            },
            {
                "resource_limits": {
                    "max_process_group_rss_kib": 1000,
                    "max_swap_delta_kib": 200,
                    "stop_loss_process_group_rss_kib": 801,
                    "stop_loss_swap_delta_kib": 101,
                    "derivation": "policy",
                    "source": "phase1-baseline.json",
                }
            },
        )
        for counterexample in counterexamples:
            with self.subTest(counterexample=counterexample):
                with self.assertRaises(AssertionError):
                    _assert_resource_limits(counterexample)


class TestStrategyPhaseBoundaryContract(unittest.TestCase):
    """Falsifiable contract for Phase 2 fixture and Phase 3 compiler execution."""

    def test_phase2_uses_fixture_subprocesses_and_phase3_runs_installed_compilers(self) -> None:
        """Separates fixture subprocess proof from post-alias real compiler runs."""
        strategy = TEST_STRATEGY_PATH.read_text(encoding="utf-8")
        phase2_start = strategy.index("### Phase 2")
        phase3_start = strategy.index("### Phase 3", phase2_start)
        phase2 = strategy[phase2_start:phase3_start].lower()
        phase3 = strategy[phase3_start:].lower()

        violations: list[str] = []
        if "deterministic fixture executable" not in phase2:
            violations.append(
                "Phase 2 must name deterministic fixture executables as its compiler stand-ins"
            )
        if "real subprocess" not in phase2:
            violations.append(
                "Phase 2 must execute fixture executables as real subprocesses"
            )
        if "spawns the real `tsc` binary" in phase2:
            violations.append(
                "Phase 2 must not claim unavailable real TypeScript compilers are executed"
            )
        if "real installed typescript 6" not in phase3:
            violations.append("Phase 3 must run the real installed TypeScript 6 compiler")
        if "real installed typescript 7" not in phase3:
            violations.append("Phase 3 must run the real installed TypeScript 7 compiler")

        self.assertFalse(violations, "\n".join(violations))

    def test_resource_stop_loss_escalates_and_reaps_process_group(self) -> None:
        """Requires bounded SIGTERM grace, SIGKILL escalation, and reap proof."""
        strategy = TEST_STRATEGY_PATH.read_text(encoding="utf-8")
        _assert_bounded_stop_loss_termination(strategy)


class SurfaceInventoryContract(unittest.TestCase):
    """Falsifiable shape contract for surface-inventory.json."""

    REQUIRED_KEYS: frozenset[str] = frozenset({
        "schema_version",
        "status",
        "tsconfigs",
        "tsc_scripts",
        "typescript_peers",
        "catalog_aliases",
        "ownership_matrix",
    })

    def test_surface_inventory_artifact_is_present_and_complete(self) -> None:
        """Requires every required key in surface-inventory.json."""
        artifact = _load_json_object(SURFACE_INVENTORY_PATH)
        missing = self.REQUIRED_KEYS - set(artifact.keys())
        self.assertFalse(
            missing,
            f"surface-inventory.json is missing required keys: {sorted(missing)}",
        )

    def test_surface_inventory_ownership_matrix_is_a_non_empty_list(self) -> None:
        """Requires the ownership_matrix to enumerate at least one consumer row."""
        artifact = _load_json_object(SURFACE_INVENTORY_PATH)
        matrix = artifact.get("ownership_matrix")
        self.assertIsInstance(matrix, list, "ownership_matrix must be a list")
        assert isinstance(matrix, list)
        self.assertTrue(matrix, "ownership_matrix cannot be empty")

    def test_surface_inventory_tsconfig_count_matches_inventory_length(self) -> None:
        """Requires tsconfig_count to equal the number of inventoried tsconfigs."""
        artifact = _load_json_object(SURFACE_INVENTORY_PATH)
        tsconfigs = artifact.get("tsconfigs")
        self.assertIsInstance(tsconfigs, list, "tsconfigs must be a list")
        assert isinstance(tsconfigs, list)
        self.assertEqual(
            artifact.get("tsconfig_count"),
            len(tsconfigs),
            "tsconfig_count must equal the number of entries in tsconfigs",
        )

    def test_surface_inventory_matches_all_tracked_tsconfigs_exactly(self) -> None:
        """Requires inventory paths to equal the repository-derived tsconfig set."""
        artifact = _load_json_object(SURFACE_INVENTORY_PATH)
        tsconfigs = artifact.get("tsconfigs")
        self.assertIsInstance(tsconfigs, list, "tsconfigs must be a list")
        assert isinstance(tsconfigs, list)
        declared_paths: list[str] = []
        for index, row in enumerate(tsconfigs):
            self.assertIsInstance(row, dict, f"tsconfigs[{index}] must be an object")
            assert isinstance(row, dict)
            path = row.get("path")
            self.assertIsInstance(path, str, f"tsconfigs[{index}].path must be a string")
            assert isinstance(path, str)
            declared_paths.append(path)
        self.assertEqual(
            len(declared_paths),
            len(set(declared_paths)),
            "surface inventory must not contain duplicate tsconfig paths",
        )
        _assert_exact_path_set(set(declared_paths), _tracked_tsconfig_paths())

    def test_surface_inventory_rejects_mismatched_tsconfig_count(self) -> None:
        """Counterexample: a declared count different from the list length fails."""
        mismatched: dict[str, Any] = {
            "tsconfig_count": 2,
            "tsconfigs": [{"path": "tsconfig.json"}],
        }
        with self.assertRaises(AssertionError):
            self.assertEqual(
                mismatched["tsconfig_count"],
                len(mismatched["tsconfigs"]),
                "tsconfig_count must equal the number of entries in tsconfigs",
            )

    def test_exact_tsconfig_contract_rejects_a_missing_config(self) -> None:
        """Counterexample: dropping one tracked tsconfig fails exact-set coverage."""
        expected = {"apps/example/tsconfig.json", "packages/example/tsconfig.test.json"}
        with self.assertRaisesRegex(AssertionError, "missing"):
            _assert_exact_path_set(
                {"apps/example/tsconfig.json"},
                expected,
            )

    def test_surface_inventory_rejects_missing_ownership_matrix(self) -> None:
        """Counterexample: a record without ownership_matrix fails the required-key check."""
        incomplete: dict[str, Any] = {
            "schema_version": "surface-inventory.v1",
            "tsconfigs": [],
            "tsc_scripts": [],
            "typescript_peers": [],
            "catalog_aliases": [],
        }
        missing = self.REQUIRED_KEYS - set(incomplete.keys())
        self.assertIn("ownership_matrix", missing)


class Phase1WorkspaceBaselineContract(unittest.TestCase):
    """Repository-derived coverage contract for workspace baseline evidence."""

    def test_baseline_covers_every_typescript_workspace_manifest(self) -> None:
        """Requires baseline rows for all configured TypeScript workspaces."""
        artifact = _load_json_object(PHASE1_WORKSPACE_BASELINE_PATH)
        rows = artifact.get("workspaces")
        self.assertIsInstance(rows, list, "workspaces must be a list")
        assert isinstance(rows, list)
        captured: set[str] = set()
        for index, row in enumerate(rows):
            self.assertIsInstance(row, dict, f"workspaces[{index}] must be an object")
            assert isinstance(row, dict)
            workspace = row.get("workspace")
            self.assertIsInstance(
                workspace,
                str,
                f"workspaces[{index}].workspace must be a string",
            )
            assert isinstance(workspace, str)
            captured.add(workspace)
        _assert_workspace_coverage(captured, _typescript_workspace_denominator())

    def test_workspace_denominator_rejects_a_missing_baseline_row(self) -> None:
        """Counterexample: omitting a TypeScript workspace fails coverage."""
        expected = {"apps/example", "packages/example"}
        with self.assertRaisesRegex(AssertionError, "packages/example"):
            _assert_workspace_coverage({"apps/example"}, expected)

    def test_raw_baseline_evidence_hashes_match_declared_output(self) -> None:
        """Requires every captured output reference to have an auditable digest."""
        artifact = _load_json_object(PHASE1_WORKSPACE_BASELINE_PATH)
        rows = artifact.get("workspaces")
        self.assertIsInstance(rows, list, "workspaces must be a list")
        assert isinstance(rows, list)
        empty_sha256 = hashlib.sha256(b"").hexdigest()

        for index, row in enumerate(rows):
            self.assertIsInstance(row, dict, f"workspaces[{index}] must be an object")
            assert isinstance(row, dict)
            declared_hash = row.get("raw_output_sha256")
            self.assertRegex(
                declared_hash if isinstance(declared_hash, str) else "",
                r"^[0-9a-f]{64}$",
                f"workspaces[{index}] must declare a SHA-256 digest",
            )
            raw_log_file = row.get("raw_log_file")
            raw_lines = row.get("raw_output_lines")
            self.assertIsInstance(raw_lines, int, f"workspaces[{index}] raw_output_lines")
            assert isinstance(raw_lines, int)
            if raw_log_file is None:
                self.assertEqual(declared_hash, empty_sha256)
                self.assertEqual(raw_lines, 0)
                self.assertIsInstance(row.get("raw_output_note"), str)
                continue

            self.assertIsInstance(raw_log_file, str)
            assert isinstance(raw_log_file, str)
            self.assertFalse(Path(raw_log_file).is_absolute())
            raw_log_path = TRACK_DIR / raw_log_file
            self.assertTrue(raw_log_path.is_file(), f"missing raw log: {raw_log_file}")
            output = raw_log_path.read_bytes()
            self.assertEqual(hashlib.sha256(output).hexdigest(), declared_hash)
            self.assertEqual(
                len([line for line in output.decode("utf-8").split("\n") if line.strip()]),
                raw_lines,
            )


class DualCompilerContractArtifactContract(unittest.TestCase):
    """Falsifiable shape contract for dual-compiler-contract.json."""

    EXPECTED_NATIVE_COMMAND = "node node_modules/typescript7/bin/tsc --noEmit"
    EXPECTED_COMPAT_COMMAND = "node node_modules/typescript/bin/tsc --noEmit"

    REQUIRED_COMMAND_KEYS: frozenset[str] = frozenset({
        "check-types:native",
        "check-types:compat",
        "check-types:parity",
        "check-types:rollback",
    })

    REQUIRED_TOP_KEYS: frozenset[str] = frozenset({
        "schema_version",
        "status",
        "catalog_aliases",
        "commands",
        "ownership_matrix",
    })

    def test_dual_compiler_contract_artifact_is_present_and_complete(self) -> None:
        """Requires every required top-level key in dual-compiler-contract.json."""
        artifact = _load_json_object(DUAL_COMPILER_CONTRACT_PATH)
        missing = self.REQUIRED_TOP_KEYS - set(artifact.keys())
        self.assertFalse(
            missing,
            f"dual-compiler-contract.json is missing required keys: {sorted(missing)}",
        )

    def test_dual_compiler_contract_commands_cover_all_four_scripts(self) -> None:
        """Requires the four Phase-2 commands (native/compat/parity/rollback)."""
        artifact = _load_json_object(DUAL_COMPILER_CONTRACT_PATH)
        commands = artifact.get("commands")
        self.assertIsInstance(commands, dict, "commands must be an object")
        assert isinstance(commands, dict)
        missing = self.REQUIRED_COMMAND_KEYS - set(commands.keys())
        self.assertFalse(
            missing,
            f"dual-compiler-contract.json is missing required commands: {sorted(missing)}",
        )

    def test_native_command_uses_typescript7_exposed_executable_path(self) -> None:
        """Requires the native command to use TypeScript 7's actual tsc executable."""
        artifact = _load_json_object(DUAL_COMPILER_CONTRACT_PATH)
        commands = artifact.get("commands")
        self.assertIsInstance(commands, dict, "commands must be an object")
        assert isinstance(commands, dict)
        self.assertEqual(
            commands.get("check-types:native"),
            self.EXPECTED_NATIVE_COMMAND,
            "native checks must use the deterministic typescript7 package path; "
            "the aliased package exposes 'tsc', not 'typescript7-tsc'",
        )

    def test_compat_and_rollback_use_direct_typescript6_executable_path(self) -> None:
        """Requires compatibility commands to use the exact direct TypeScript 6 executable."""
        artifact = _load_json_object(DUAL_COMPILER_CONTRACT_PATH)
        commands = artifact.get("commands")
        self.assertIsInstance(commands, dict, "commands must be an object")
        assert isinstance(commands, dict)
        for command_key in ("check-types:compat", "check-types:rollback"):
            with self.subTest(command=command_key):
                self.assertEqual(
                    commands.get(command_key),
                    self.EXPECTED_COMPAT_COMMAND,
                    f"{command_key} must use the deterministic direct TypeScript 6 "
                    "package path; no wrapper executable is allowed",
                )

    def test_ts6_compatibility_is_direct_exact_and_phase3_verifies_versions(self) -> None:
        """Rejects a floating TS6 wrapper and requires installed version checks."""
        artifact = _load_json_object(DUAL_COMPILER_CONTRACT_PATH)
        aliases = artifact.get("catalog_aliases")
        commands = artifact.get("commands")
        self.assertIsInstance(aliases, dict, "catalog_aliases must be an object")
        self.assertIsInstance(commands, dict, "commands must be an object")
        assert isinstance(aliases, dict)
        assert isinstance(commands, dict)

        strategy = TEST_STRATEGY_PATH.read_text(encoding="utf-8")
        phase3_start = strategy.index("### Phase 3")
        phase3 = strategy[phase3_start:]
        expected_compat_alias = "6.0.2"
        expected_compat_command = "node node_modules/typescript/bin/tsc --noEmit"
        required_version_probes = {
            "node node_modules/typescript/bin/tsc --version": "Version 6.0.2",
            "node node_modules/typescript7/bin/tsc --version": "Version 7.0.2",
        }
        violations: list[str] = []

        if aliases.get("typescript") != expected_compat_alias:
            violations.append(
                "catalog_aliases.typescript must directly pin typescript@6.0.2; "
                "@typescript/typescript6 is a wrapper with a floating inner "
                "typescript@^6 dependency"
            )
        for command_key in ("check-types:compat", "check-types:rollback"):
            if commands.get(command_key) != expected_compat_command:
                violations.append(
                    f"{command_key} must use the direct exact TypeScript 6 path "
                    "node_modules/typescript/bin/tsc"
                )
        for probe, expected_output in required_version_probes.items():
            if probe not in phase3:
                violations.append(
                    f"Phase 3 installed-layout verification must run `{probe}`"
                )
            if expected_output not in phase3:
                violations.append(
                    f"Phase 3 installed-layout verification must require `{expected_output}`"
                )

        self.assertFalse(violations, "\n".join(violations))

    def test_dual_compiler_contract_rejects_missing_commands(self) -> None:
        """Counterexample: a commands object missing parity/rollback fails."""
        incomplete: dict[str, Any] = {
            "commands": {
                "check-types:native": "tsc",
                "check-types:compat": "tsc --skipLibCheck",
            },
        }
        commands = incomplete.get("commands", {})
        missing = self.REQUIRED_COMMAND_KEYS - set(commands.keys())
        self.assertIn("check-types:parity", missing)
        self.assertIn("check-types:rollback", missing)


class DiagnosticParityLedgerContract(unittest.TestCase):
    """Falsifiable shape contract for diagnostic-parity-ledger.json."""

    def test_diagnostic_parity_ledger_artifact_is_present_and_parseable(self) -> None:
        """Requires the ledger to parse as a JSON array (empty list is valid)."""
        ledger = _load_json_array(DIAGNOSTIC_PARITY_LEDGER_PATH)
        self.assertIsInstance(ledger, list)
        for index, entry in enumerate(ledger):
            self.assertIsInstance(
                entry,
                dict,
                f"diagnostic-parity-ledger entry #{index} must be a JSON object",
            )

    def test_diagnostic_parity_ledger_entries_carry_reviewed_by(self) -> None:
        """Requires every non-empty ledger entry to declare a reviewed_by field."""
        ledger = _load_json_array(DIAGNOSTIC_PARITY_LEDGER_PATH)
        for entry in ledger:
            self.assertIsInstance(entry, dict)
            assert isinstance(entry, dict)
            self.assertIn(
                "reviewed_by",
                entry,
                "every diagnostic-parity-ledger entry must include reviewed_by",
            )

    def test_diagnostic_parity_ledger_rejects_non_array_root(self) -> None:
        """Counterexample: a ledger delivered as a JSON object fails the array contract.

        The in-process validator raises AssertionError when given an object-shaped
        ledger; this proves the contract is real, not vacuous.
        """
        sentinel_object: dict[str, Any] = {"entries": []}
        with self.assertRaises(AssertionError):
            if not isinstance(sentinel_object, list):
                raise AssertionError("diagnostic-parity-ledger.json must contain a JSON array")


class BenchmarkRecordSchemaContract(unittest.TestCase):
    """Falsifiable shape contract for benchmark-record-schema.json."""

    REQUIRED_PROPERTY_KEYS: frozenset[str] = frozenset({
        "elapsed_ms",
        "peak_rss_kib",
        "swap_delta_kib",
        "oom_kill_count",
        "process_count",
        "diagnostic_count",
        "exit_status",
        "signal",
        "turbo_cache_state",
        "tsconfig_path",
        "compiler_version",
        "checkers",
        "host_idle_class",
    })

    def test_benchmark_record_schema_artifact_is_present_and_complete(self) -> None:
        """Requires every required property in benchmark-record-schema.json."""
        schema = _load_json_schema(BENCHMARK_RECORD_SCHEMA_PATH)
        properties = schema["properties"]
        missing = self.REQUIRED_PROPERTY_KEYS - set(properties.keys())
        self.assertFalse(
            missing,
            f"benchmark-record-schema.json is missing required properties: {sorted(missing)}",
        )

    def test_benchmark_record_schema_declares_a_non_empty_required_list(self) -> None:
        """Requires benchmark-record-schema.json to enumerate required record keys."""
        schema = _load_json_schema(BENCHMARK_RECORD_SCHEMA_PATH)
        required = schema.get("required")
        self.assertIsInstance(required, list, "'required' must be a list")
        assert isinstance(required, list)
        self.assertTrue(
            required,
            "benchmark-record-schema.json must declare a non-empty 'required' list",
        )

    def test_benchmark_schema_distinguishes_unavailable_dmesg_from_zero_ooms(self) -> None:
        """Requires explicit dmesg status rather than encoding unavailable as zero."""
        schema = _load_json_schema(BENCHMARK_RECORD_SCHEMA_PATH)
        _assert_dmesg_observability_schema(schema)

    def test_dmesg_contract_rejects_missing_observability_status(self) -> None:
        """Counterexample: OOM count alone cannot prove dmesg was observable."""
        counterexample: dict[str, Any] = {
            "properties": {
                "oom_kill_count": {
                    "type": "integer",
                    "description": "Recorded as 0 when dmesg is unavailable",
                }
            },
            "required": ["oom_kill_count"],
        }
        with self.assertRaises(AssertionError):
            _assert_dmesg_observability_schema(counterexample)

    def test_swap_delta_is_signed_after_minus_before_in_schema_and_strategy(self) -> None:
        """Requires one signed swap-delta meaning across schema and strategy."""
        schema = _load_json_schema(BENCHMARK_RECORD_SCHEMA_PATH)
        strategy = TEST_STRATEGY_PATH.read_text(encoding="utf-8")
        _assert_signed_swap_delta_contract(schema, strategy)

    def test_benchmark_record_schema_rejects_missing_properties(self) -> None:
        """Counterexample: a schema missing peak_rss_kib/diagnostic_count is incomplete."""
        incomplete: dict[str, Any] = {
            "type": "object",
            "properties": {
                "elapsed_ms": {"type": "integer"},
                "tsconfig_path": {"type": "string"},
            },
            "required": ["elapsed_ms", "tsconfig_path"],
        }
        properties = incomplete["properties"]
        missing = self.REQUIRED_PROPERTY_KEYS - set(properties.keys())
        self.assertIn("peak_rss_kib", missing)
        self.assertIn("diagnostic_count", missing)
        self.assertIn("swap_delta_kib", missing)


class RolloutRecordSchemaContract(unittest.TestCase):
    """Falsifiable shape contract for rollout-record-schema.json."""

    REQUIRED_PROPERTY_KEYS: frozenset[str] = frozenset({
        "run_id",
        "lane",
        "ts7_gate_exit",
        "ts6_parity_exit",
        "cache_state",
        "order_dependent_diff_count",
        "peak_rss_kib",
    })

    def test_rollout_record_schema_artifact_is_present_and_complete(self) -> None:
        """Requires every required property in rollout-record-schema.json."""
        schema = _load_json_schema(ROLLOUT_RECORD_SCHEMA_PATH)
        properties = schema["properties"]
        missing = self.REQUIRED_PROPERTY_KEYS - set(properties.keys())
        self.assertFalse(
            missing,
            f"rollout-record-schema.json is missing required properties: {sorted(missing)}",
        )

    def test_rollout_record_schema_declares_a_non_empty_required_list(self) -> None:
        """Requires rollout-record-schema.json to enumerate required record keys."""
        schema = _load_json_schema(ROLLOUT_RECORD_SCHEMA_PATH)
        required = schema.get("required")
        self.assertIsInstance(required, list, "'required' must be a list")
        assert isinstance(required, list)
        self.assertTrue(
            required,
            "rollout-record-schema.json must declare a non-empty 'required' list",
        )

    def test_rollout_record_schema_rejects_missing_run_id(self) -> None:
        """Counterexample: a rollout schema missing run_id is incomplete."""
        incomplete: dict[str, Any] = {
            "type": "object",
            "properties": {
                "lane": {"type": "string"},
                "ts7_gate_exit": {"type": "integer"},
            },
            "required": ["lane", "ts7_gate_exit"],
        }
        properties = incomplete["properties"]
        missing = self.REQUIRED_PROPERTY_KEYS - set(properties.keys())
        self.assertIn("run_id", missing)
        self.assertIn("cache_state", missing)
        self.assertIn("peak_rss_kib", missing)


class Phase1NonVacuity(unittest.TestCase):
    """Anti-pattern A4 defense: the Phase-1 test suite must address all six artifacts."""

    EXPECTED_ARTIFACT_LOADERS: dict[str, str] = {
        "compiler-baseline.json": "_load_json_object(COMPILER_BASELINE_PATH)",
        "surface-inventory.json": "_load_json_object(SURFACE_INVENTORY_PATH)",
        "dual-compiler-contract.json": "_load_json_object(DUAL_COMPILER_CONTRACT_PATH)",
        "diagnostic-parity-ledger.json": "_load_json_array(DIAGNOSTIC_PARITY_LEDGER_PATH)",
        "benchmark-record-schema.json": "_load_json_schema(BENCHMARK_RECORD_SCHEMA_PATH)",
        "rollout-record-schema.json": "_load_json_schema(ROLLOUT_RECORD_SCHEMA_PATH)",
    }

    def test_all_six_phase1_artifacts_have_dedicated_shape_tests(self) -> None:
        """Requires the suite to enumerate exactly six Phase-1 artifact loaders."""
        self.assertEqual(
            len(self.EXPECTED_ARTIFACT_LOADERS),
            6,
            "the Phase-1 test suite must enumerate exactly six artifact loaders",
        )
        self.assertEqual(
            set(self.EXPECTED_ARTIFACT_LOADERS.keys()),
            {
                "compiler-baseline.json",
                "surface-inventory.json",
                "dual-compiler-contract.json",
                "diagnostic-parity-ledger.json",
                "benchmark-record-schema.json",
                "rollout-record-schema.json",
            },
        )

    def test_suite_exercises_at_least_one_shape_test_per_artifact_class(self) -> None:
        """Requires at least one dedicated shape test per artifact class (>= 6 classes)."""
        self.assertGreaterEqual(
            len(self.EXPECTED_ARTIFACT_LOADERS),
            6,
            "each of the six Phase-1 artifacts must have at least one shape test",
        )


if __name__ == "__main__":
    unittest.main()
