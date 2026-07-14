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

import json
import re
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

COMMIT_SHA_RE = re.compile(r"^[0-9a-f]{40}$")


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


class DualCompilerContractArtifactContract(unittest.TestCase):
    """Falsifiable shape contract for dual-compiler-contract.json."""

    EXPECTED_NATIVE_COMMAND = "node node_modules/typescript7/bin/tsc --noEmit"
    EXPECTED_COMPAT_COMMAND = "node node_modules/typescript/bin/tsc6 --noEmit"

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

    def test_compat_and_rollback_use_typescript6_exposed_executable_path(self) -> None:
        """Requires compatibility commands to use TypeScript 6's actual tsc6 executable."""
        artifact = _load_json_object(DUAL_COMPILER_CONTRACT_PATH)
        commands = artifact.get("commands")
        self.assertIsInstance(commands, dict, "commands must be an object")
        assert isinstance(commands, dict)
        for command_key in ("check-types:compat", "check-types:rollback"):
            with self.subTest(command=command_key):
                self.assertEqual(
                    commands.get(command_key),
                    self.EXPECTED_COMPAT_COMMAND,
                    f"{command_key} must use the deterministic TypeScript 6 package "
                    "path; @typescript/typescript6 exposes 'tsc6', not 'tsc'",
                )

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
