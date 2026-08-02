"""Defines Red contracts for the R1 v3 execution-closure recapture."""
from __future__ import annotations

import base64
import copy
import dis
import hashlib
import inspect
import importlib
import os
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from typing import Any, Callable
from unittest.mock import patch


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ID = "business_operations_graph_baseline_remediation_20260730"
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / TRACK_ID
V2_BUNDLE = TRACK_DIR / "r1-task2-source-and-graph-v2-20260801"
V2_ARCHIVE = V2_BUNDLE / "snapshot.archive.json"
V2_MANIFEST = V2_BUNDLE / "snapshot.manifest.json"
V2_GRAPH_BINDING = TRACK_DIR / "r1-task3-graph-binding-v2-20260801.json"
V2_AUDIT = TRACK_DIR / "r2-clean-audit-attempt-v2-20260801" / "attempt.json"
V2_COMPENSATION = TRACK_DIR / "r2-task2-compensation-denominator-v2-20260801.json"
BLOCKER = TRACK_DIR / "r2-task3-v2-execution-closure-blocker-20260801.md"
CLARIFICATION = TRACK_DIR / "r2-task3-v2-execution-closure-blocker-clarification-20260801.md"
ADDENDUM_DIR = TRACK_DIR / "r2-task3-v2-execution-closure-blocker-addendum-20260801"
ADDENDUM_RECEIPT = ADDENDUM_DIR / "receipt.json"
ADDENDUM_PROVENANCE = ADDENDUM_DIR / "execution-provenance.json"
ADDENDUM_LEDGER = ADDENDUM_DIR / "execution-input-omission-ledger.json"
ADDENDUM_DISCOVERY_STDOUT = ADDENDUM_DIR / "raw" / "discover-v2.stdout.txt"
ADDENDUM_DISCOVERY_STDERR = ADDENDUM_DIR / "raw" / "discover-v2.stderr.txt"
V3_DIR = TRACK_DIR / "r1-v3-execution-closure-20260801"
V3_MANIFEST = V3_DIR / "execution-closure.manifest.json"
V3_ARCHIVE = V3_DIR / "execution-closure.archive.json"
V3_LEDGER = V3_DIR / "omissions-ledger.json"
V3_PROFILE = V3_DIR / "fr4-execution-profile.json"
V3_RECEIPT = V3_DIR / "fr4-execution-receipt.json"
V3_GRAPH_BINDING = V3_DIR / "graph-binding.json"
V3_CLEAN_AUDIT = V3_DIR / "clean-audit-attempt.json"
V3_COMPENSATION = V3_DIR / "compensation-denominator.json"
PODMAN_BLOCKER_DIR = TRACK_DIR / "r1-v3-podman-execution-blocker-20260801"
PODMAN_BLOCKER = PODMAN_BLOCKER_DIR / "blocker.json"
PODMAN_BLOCKER_SHA256 = "f9da2afa8c8b9da3403f807c5903654538cdabf23c2113c754c1608114183e7d"
PODMAN_BLOCKER_SIZE = 11694
PODMAN_ATTEMPT_DIR = TRACK_DIR / "r1-v3-podman-execution-attempt-20260801-0001"
PODMAN_ATTEMPT = PODMAN_ATTEMPT_DIR / "failed-attempt.json"
PODMAN_ATTEMPT_SHA256 = "88940b45cc5a8628514eb58a66dfc227e8096e1d6cc0f52ea7bc077484e67ffb"
PODMAN_ATTEMPT_SIZE = 4220
PODMAN_ATTEMPT_STDOUT = PODMAN_ATTEMPT_DIR / "raw" / "receipt-offline-install.stdout.txt"
PODMAN_ATTEMPT_STDERR = PODMAN_ATTEMPT_DIR / "raw" / "receipt-offline-install.stderr.txt"
PODMAN_BUILD_DB_ATTEMPT_DIR = TRACK_DIR / "r1-v3-podman-execution-attempt-20260802-0001"
PODMAN_BUILD_DB_ATTEMPT = PODMAN_BUILD_DB_ATTEMPT_DIR / "failed-attempt.json"
PODMAN_BUILD_DB_ATTEMPT_SHA256 = "5732224404afea4c59c17c4f24f27e9f2914dd47f9893c7a42f42da0cb26ee7c"
PODMAN_BUILD_DB_ATTEMPT_SIZE = 4178
PODMAN_BUILD_DB_STDOUT = PODMAN_BUILD_DB_ATTEMPT_DIR / "raw" / "receipt-build-db.stdout.txt"
PODMAN_BUILD_DB_STDERR = PODMAN_BUILD_DB_ATTEMPT_DIR / "raw" / "receipt-build-db.stderr.txt"
PODMAN_CONFIG_STORE_ATTEMPT_DIR = TRACK_DIR / "r1-v3-podman-execution-attempt-20260802-0002"
PODMAN_CONFIG_STORE_ATTEMPT = PODMAN_CONFIG_STORE_ATTEMPT_DIR / "failed-attempt.json"
PODMAN_CONFIG_STORE_ATTEMPT_SHA256 = "525f319d481f28bb97255a10f4e44d03377bb55e71e008523919f345b50fac5e"
PODMAN_CONFIG_STORE_ATTEMPT_SIZE = 4177
PODMAN_CONFIG_STORE_STDOUT = PODMAN_CONFIG_STORE_ATTEMPT_DIR / "raw" / "receipt-build-db.stdout.txt"
PODMAN_CONFIG_STORE_STDERR = PODMAN_CONFIG_STORE_ATTEMPT_DIR / "raw" / "receipt-build-db.stderr.txt"
PODMAN_NESTED_PNPM_ATTEMPT_DIR = TRACK_DIR / "r1-v3-podman-execution-attempt-20260802-0003"
PODMAN_NESTED_PNPM_ATTEMPT = PODMAN_NESTED_PNPM_ATTEMPT_DIR / "failed-attempt.json"
PODMAN_NESTED_PNPM_ATTEMPT_SHA256 = "83e9d5ee6640ef8ebc1ec79eb236cc461fc7a43ca46caac31064cb3a5989326f"
PODMAN_NESTED_PNPM_ATTEMPT_SIZE = 4488
PODMAN_NESTED_PNPM_STDOUT = PODMAN_NESTED_PNPM_ATTEMPT_DIR / "raw" / "receipt-generate-standard-pack-catalog.stdout.txt"
PODMAN_NESTED_PNPM_STDERR = PODMAN_NESTED_PNPM_ATTEMPT_DIR / "raw" / "receipt-generate-standard-pack-catalog.stderr.txt"
PODMAN_WORKSPACE_DAG_ATTEMPT_DIR = TRACK_DIR / "r1-v3-podman-execution-attempt-20260802-0004"
PODMAN_WORKSPACE_DAG_ATTEMPT = PODMAN_WORKSPACE_DAG_ATTEMPT_DIR / "failed-attempt.json"
PODMAN_WORKSPACE_DAG_ATTEMPT_SHA256 = "a0a5e1652e11adb4b49a11593e71583ce2d9f84ec4574a242dd19baebeb54cdb"
PODMAN_WORKSPACE_DAG_ATTEMPT_SIZE = 4617
PODMAN_WORKSPACE_DAG_STDOUT = PODMAN_WORKSPACE_DAG_ATTEMPT_DIR / "raw" / "receipt-generate-standard-pack-catalog.stdout.txt"
PODMAN_WORKSPACE_DAG_STDERR = PODMAN_WORKSPACE_DAG_ATTEMPT_DIR / "raw" / "receipt-generate-standard-pack-catalog.stderr.txt"
PODMAN_RUNTIME_ASSET_ATTEMPT_DIR = TRACK_DIR / "r1-v3-podman-execution-attempt-20260802-0005"
PODMAN_RUNTIME_ASSET_ATTEMPT = PODMAN_RUNTIME_ASSET_ATTEMPT_DIR / "failed-attempt.json"
PODMAN_RUNTIME_ASSET_ATTEMPT_SHA256 = "dc5c463ec240ce6254d0a766e61de7b1a0db79686b80300f64a6e67a19f72284"
PODMAN_RUNTIME_ASSET_ATTEMPT_SIZE = 4618
PODMAN_RUNTIME_ASSET_STDOUT = PODMAN_RUNTIME_ASSET_ATTEMPT_DIR / "raw" / "receipt-generate-standard-pack-catalog.stdout.txt"
PODMAN_RUNTIME_ASSET_STDERR = PODMAN_RUNTIME_ASSET_ATTEMPT_DIR / "raw" / "receipt-generate-standard-pack-catalog.stderr.txt"
STANDARD_PACK_RUNTIME_ASSET = "packages/advantage-play-kit/scripts/generate-standard-pack-release.mjs"
HELPER_MODULE = "measure.business_operations_graph_baseline_execution_closure"
BLOCKER_SHA256 = "319fca3ecb81e75ba89c4d51444de736feda588f311d47bacdf8540c882fc482"
CLARIFICATION_SHA256 = "c4c71bb83fbab0d8dab41667ef6e6889a6da6ae4ade6b096146fa7d9cce1520b"
BLOCKER_SIZE = 5208
CLARIFICATION_SIZE = 1135
V2_EVIDENCE = {
    "archive": (
        V2_ARCHIVE,
        "e5a638e11ed57cfe6750cbe60e5ab31cbdcb0fd4ff3000458bae7168f868332e",
        61177049,
    ),
    "manifest": (
        V2_MANIFEST,
        "ec848eaacce6eef4450434217ee7199c9c98ec44edc5496fa6f57f289eb1ae85",
        2381425,
    ),
    "graphBinding": (
        V2_GRAPH_BINDING,
        "e66054a57dde5f022f96d0b09a570646b321fad2b3a3a54594618e1b0a515f20",
        766334,
    ),
    "auditAttempt": (
        V2_AUDIT,
        "6d21536d5cfcda34a228b13aacad9420fea3a4ffde17bb4a1d366989defcbd8f",
        5730264,
    ),
    "compensation": (
        V2_COMPENSATION,
        "2ef221f24856be0bcd48d7efeb434ae623e8bf0b21348dca0567457513274f6d",
        3343489,
    ),
}
NON_DERIVABLE_OMISSIONS = {
    "apps/accounts/cloudbuild.yaml",
    "apps/codecamp-advantage/cloudbuild.yaml",
    "apps/accounts/scripts/accounts-runtime-probe.sql",
    "apps/accounts/scripts/accounts-smoke.sh",
    "packages/db/drizzle/0043_codecamp_company_principal_sync.sql",
    "packages/db/company-identity/drizzle/meta/_journal.json",
    "packages/db/company-identity/drizzle/0001_immutable_identity_audit.sql",
    "packages/db/drizzle/0044_standard_pack_successor_commitments.sql",
}
DERIVED_PARTS = {".git", "node_modules", ".turbo", ".next", "dist", "build", "coverage", "target"}
V3_SUPPLEMENTAL_PATHS = NON_DERIVABLE_OMISSIONS | {
    "packages/db/company-identity/drizzle/0000_company_identity_base.sql",
}
STANDARD_PACK_CATALOG = "packages/advantage-play-kit/assets/standard/standard-pack-release.json"
STANDARD_PACK_GENERATOR = [
    "pnpm",
    "--filter",
    "@reading-advantage/advantage-play-kit",
    "generate:standard-pack-catalog",
]
FR4 = (
    ("accounts-test", ["pnpm", "--filter", "accounts", "test"]),
    ("accounts-check-types", ["pnpm", "--filter", "accounts", "check-types"]),
    ("backend-test", ["pnpm", "--filter", "@reading-advantage/backend", "test"]),
    ("backend-check-types", ["pnpm", "--filter", "@reading-advantage/backend", "check-types"]),
)
BUILDS = (
    ["pnpm", "--filter", "@reading-advantage/db", "build"],
    ["pnpm", "--filter", "@reading-advantage/auth", "build"],
    ["pnpm", "--filter", "@reading-advantage/backend", "build"],
)
HERMETIC_PNPM_INSTALL = [
    "pnpm",
    "install",
    "--offline",
    "--frozen-lockfile",
    "--frozen-store",
    "--trust-lockfile",
]
HERMETIC_PNPM_PAYLOAD_SUFFIX = [
    "install",
    "--offline",
    "--frozen-lockfile",
    "--frozen-store",
    "--trust-lockfile",
    "--store-dir=/root/.local/share/pnpm/store/v11",
]
V2_FROZEN_SOURCE_INVENTORY = {
    "entryCount": 6868,
    "sha256": "8c5a2c2d1914667843df51e2c8180b8cd812c0295eb0c972ce45c80e4d213d51",
}


def _sha256(data: bytes) -> str:
    """Returns a SHA-256 digest.

    @param data The bytes to hash.
    @returns The lowercase hexadecimal digest.
    """
    return hashlib.sha256(data).hexdigest()


def _archive_inventory(entries: list[dict[str, Any]]) -> dict[str, Any]:
    """Builds the canonical closure inventory from materialized archive entries.

    @param entries The ordered source and supplement entries in the closure archive.
    @returns The entry count and canonical metadata digest for those exact entries.
    """
    rows = [
        {key: entry[key] for key in ("kind", "mode", "path", "sha256", "size", "state")}
        for entry in entries
    ]
    return {
        "entryCount": len(rows),
        "sha256": _sha256(json.dumps(rows, sort_keys=True, separators=(",", ":")).encode("utf-8")),
    }


def _reference(path: Path) -> dict[str, Any]:
    """Builds an immutable track-relative reference.

    @param path The track-owned regular file.
    @returns Its path, digest, and size.
    """
    data = path.read_bytes()
    return {"path": path.relative_to(TRACK_DIR).as_posix(), "sha256": _sha256(data), "size": len(data)}


def _load_json(path: Path, case: unittest.TestCase) -> dict[str, Any]:
    """Loads one regular JSON object.

    @param path The expected artifact path.
    @param case The reporting test case.
    @returns The parsed object.
    """
    try:
        display_path = path.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        display_path = str(path)
    case.assertTrue(path.is_file(), f"required regular artifact missing: {display_path}")
    case.assertFalse(path.is_symlink(), f"artifact must not be a symlink: {display_path}")
    value = json.loads(path.read_text(encoding="utf-8"))
    case.assertIsInstance(value, dict, f"artifact must be an object: {display_path}")
    return value


class R1V3ExecutionClosureRedTests(unittest.TestCase):
    """Requires a source-complete isolated candidate before R2 Task 3 resumes."""

    maxDiff = None

    def _load_addendum(
        self,
    ) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], Callable[[dict[str, Any], dict[str, Any], dict[str, Any]], None], type[Exception]]:
        """Loads the future durable blocker addendum and its validator seam.

        @returns The addendum artifacts, validator, and validation error type.
        """
        self.assertTrue(
            ADDENDUM_RECEIPT.is_file(),
            "V3_BLOCKER_ADDENDUM_RECEIPT_MISSING: r2-task3-v2-execution-closure-blocker-addendum-20260801/receipt.json",
        )
        self.assertTrue(ADDENDUM_PROVENANCE.is_file(), "V3_BLOCKER_ADDENDUM_PROVENANCE_MISSING")
        self.assertTrue(ADDENDUM_LEDGER.is_file(), "V3_BLOCKER_ADDENDUM_LEDGER_MISSING")
        try:
            helper = importlib.import_module(HELPER_MODULE)
        except ModuleNotFoundError as error:
            self.fail(f"V3_EXECUTION_CLOSURE_HELPER_MISSING: {error.name}")
        validator = getattr(helper, "validate_execution_closure_blocker_addendum_v1", None)
        error_type = getattr(helper, "ExecutionClosureValidationError", None)
        self.assertTrue(callable(validator), "V3_BLOCKER_ADDENDUM_VALIDATOR_MISSING")
        self.assertTrue(isinstance(error_type, type) and issubclass(error_type, Exception))
        return (
            _load_json(ADDENDUM_RECEIPT, self),
            _load_json(ADDENDUM_PROVENANCE, self),
            _load_json(ADDENDUM_LEDGER, self),
            validator,
            error_type,
        )

    def _load_v3(
        self,
    ) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], dict[str, Any], dict[str, Any], Callable[..., None], type[Exception]]:
        """Loads the future v3 candidate only after the addendum exists.

        @returns The v3 artifacts, validator, and validation error type.
        """
        self._load_addendum()
        self.assertTrue(
            V3_MANIFEST.is_file(),
            "V3_EXECUTION_CLOSURE_MANIFEST_MISSING: r1-v3-execution-closure-20260801/execution-closure.manifest.json",
        )
        self.assertTrue(V3_ARCHIVE.is_file(), "V3_EXECUTION_CLOSURE_ARCHIVE_MISSING")
        self.assertTrue(V3_LEDGER.is_file(), "V3_EXECUTION_CLOSURE_LEDGER_MISSING")
        self.assertTrue(V3_PROFILE.is_file(), "V3_EXECUTION_CLOSURE_PROFILE_MISSING")
        self.assertTrue(V3_RECEIPT.is_file(), "V3_EXECUTION_CLOSURE_RECEIPT_MISSING")
        self.assertTrue(V3_GRAPH_BINDING.is_file(), "V3_GRAPH_BINDING_MISSING: r1-v3-execution-closure-20260801/graph-binding.json")
        self.assertTrue(V3_CLEAN_AUDIT.is_file(), "V3_CLEAN_AUDIT_MISSING: r1-v3-execution-closure-20260801/clean-audit-attempt.json")
        self.assertTrue(V3_COMPENSATION.is_file(), "V3_COMPENSATION_MISSING: r1-v3-execution-closure-20260801/compensation-denominator.json")
        helper = importlib.import_module(HELPER_MODULE)
        validator = getattr(helper, "validate_execution_closure_v1", None)
        error_type = getattr(helper, "ExecutionClosureValidationError", None)
        self.assertTrue(callable(validator), "V3_EXECUTION_CLOSURE_VALIDATOR_MISSING")
        return (
            _load_json(V3_MANIFEST, self),
            _load_json(V3_ARCHIVE, self),
            _load_json(V3_LEDGER, self),
            _load_json(V3_PROFILE, self),
            _load_json(V3_RECEIPT, self),
            _load_json(V3_GRAPH_BINDING, self),
            _load_json(V3_CLEAN_AUDIT, self),
            _load_json(V3_COMPENSATION, self),
            validator,
            error_type,
        )

    def test_v2_blocker_bytes_and_known_non_derivable_boundary_are_pinned(self) -> None:
        """Pins the blocked v2 boundary without treating derivable exports as omissions."""
        self.assertEqual(_sha256(BLOCKER.read_bytes()), BLOCKER_SHA256)
        self.assertEqual(BLOCKER.stat().st_size, BLOCKER_SIZE)
        self.assertEqual(_sha256(CLARIFICATION.read_bytes()), CLARIFICATION_SHA256)
        self.assertEqual(CLARIFICATION.stat().st_size, CLARIFICATION_SIZE)
        entries = {entry["path"] for entry in _load_json(V2_MANIFEST, self)["entries"]}
        self.assertTrue({
            "apps/accounts/cloudbuild.yaml",
            "packages/db/drizzle/0043_codecamp_company_principal_sync.sql",
            "packages/db/company-identity/drizzle/meta/_journal.json",
            "packages/db/company-identity/drizzle/0001_immutable_identity_audit.sql",
        }.isdisjoint(entries))
        self.assertIn("derivable workspace dist outputs", CLARIFICATION.read_text(encoding="utf-8"))

    def test_discovery_follows_new_hops_or_fails_closed_on_dynamic_inputs(self) -> None:
        """Requires total static discovery with explicit dynamic-input rejection.

        @returns Nothing; assertions exercise the public discovery seam.
        """
        helper = importlib.import_module(HELPER_MODULE)
        discover = getattr(helper, "discover_execution_inputs_v1", None)
        error_type = getattr(helper, "ExecutionClosureValidationError", None)
        self.assertTrue(callable(discover), "V3_EXECUTION_DISCOVERY_HELPER_MISSING")
        self.assertTrue(isinstance(error_type, type) and issubclass(error_type, Exception))
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "scripts").mkdir()
            (root / "fixtures").mkdir()
            (root / "package.json").write_text(
                json.dumps({"scripts": {"fr4": "pnpm run fixture-hop && sh scripts/trace.sh", "fixture-hop": "tsx scripts/fixture.ts"}}),
                encoding="utf-8",
            )
            (root / "scripts/fixture.ts").write_text(
                'readFileSync(new URL("../fixtures/cloudbuild.yaml", import.meta.url));\\n',
                encoding="utf-8",
            )
            (root / "scripts/trace.sh").write_text(
                "psql --file fixtures/probe.sql\\n", encoding="utf-8"
            )
            (root / "fixtures/cloudbuild.yaml").write_text("steps: []\\n", encoding="utf-8")
            (root / "fixtures/probe.sql").write_text("select 1;\\n", encoding="utf-8")
            first = discover(root, ["package.json#fr4"])
            self.assertEqual(
                {entry["logicalPath"] for entry in first["inputs"]},
                {"fixtures/cloudbuild.yaml", "fixtures/probe.sql"},
            )
            self.assertEqual(
                [(row["ordinal"], row["argv"]) for row in first["entrypointExpansion"]],
                [
                    (0, ["pnpm", "run", "fixture-hop"]),
                    (1, ["tsx", "scripts/fixture.ts"]),
                    (2, ["sh", "scripts/trace.sh"]),
                ],
            )
            (root / "fixtures/cloudbuild.yaml").rename(root / "fixtures/renamed.yaml")
            (root / "scripts/fixture.ts").write_text(
                'readFileSync(new URL("../fixtures/renamed.yaml", import.meta.url));\\n',
                encoding="utf-8",
            )
            second = discover(root, ["package.json#fr4"])
            self.assertEqual(
                {entry["logicalPath"] for entry in second["inputs"]},
                {"fixtures/renamed.yaml", "fixtures/probe.sql"},
            )
            (root / "scripts/fixture.ts").write_text(
                "readFileSync(process.env.RUNTIME_INPUT);\\n", encoding="utf-8"
            )
            with self.assertRaises(error_type):
                discover(root, ["package.json#fr4"])
            (root / "scripts/fixture.ts").write_text(
                'globSync("fixtures/*.sql");\\n', encoding="utf-8"
            )
            with self.assertRaises(error_type):
                discover(root, ["package.json#fr4"])
            (root / "scripts/fixture.ts").write_text(
                'readFileSync(new URL("../fixtures/renamed.yaml", import.meta.url));\\n',
                encoding="utf-8",
            )
            (root / "scripts/trace.sh").write_text(
                'psql --file "$RUNTIME_SQL"\\n', encoding="utf-8"
            )
            with self.assertRaises(error_type):
                discover(root, ["package.json#fr4"])

    def test_addendum_binds_all_v2_inputs_raw_receipts_and_blocked_markers(self) -> None:
        """Requires machine-readable blocker evidence before a v3 candidate can be evaluated."""
        receipt, provenance, ledger, validator, error_type = self._load_addendum()
        expected_v2 = {
            key: {"path": path.relative_to(TRACK_DIR).as_posix(), "sha256": digest, "size": size}
            for key, (path, digest, size) in V2_EVIDENCE.items()
        }
        expected_blockers = [
            {"path": BLOCKER.name, "sha256": BLOCKER_SHA256, "size": BLOCKER_SIZE},
            {"path": CLARIFICATION.name, "sha256": CLARIFICATION_SHA256, "size": CLARIFICATION_SIZE},
        ]
        self.assertEqual(receipt["priorV2Evidence"], expected_v2)
        self.assertEqual(provenance["priorV2Evidence"], expected_v2)
        self.assertEqual(receipt["blockerRecords"], expected_blockers)
        self.assertEqual(provenance["blockerRecords"], expected_blockers)
        self.assertTrue(receipt["rawStreams"])
        self.assertEqual(
            receipt["subordinateReferences"],
            [_reference(ADDENDUM_PROVENANCE), _reference(ADDENDUM_LEDGER)],
        )
        for name in ("materializer", "replay"):
            command = provenance["commands"][name]
            self.assertTrue({"argv", "cwd", "env", "envAbsent", "network", "exitCode", "stdout", "stderr"} <= set(command))
            self.assertIsInstance(command["argv"], list)
            self.assertIsInstance(command["cwd"], str)
            self.assertEqual(command["env"], {"CI": "true"})
            self.assertIn("PG_TEST_URL", command["envAbsent"])
            self.assertFalse(command["network"])
        expected_tools = {
            "node": ["node", "--version"],
            "pnpm": ["pnpm", "--version"],
            "scanner": ["repo-graph", "--version"],
        }
        self.assertEqual(set(provenance["toolVersions"]), set(expected_tools))
        for name, argv in expected_tools.items():
            identity = provenance["toolVersions"][name]
            self.assertEqual(identity["argv"], argv)
            self.assertTrue(identity["stdout"])
            self.assertRegex(identity["stdoutSha256"], r"^[0-9a-f]{64}$")
        self.assertEqual(provenance["sourceInventory"]["pre"], provenance["sourceInventory"]["post"])
        self.assertEqual(
            provenance["sourceInventory"]["pre"]["sha256"],
            provenance["sourceInventory"]["manifestSha256"],
        )
        self.assertEqual(provenance["realpathAudit"]["outsideMaterializationRoot"], [])
        self.assertEqual(provenance["realpathAudit"]["sourceWorktreeReferences"], [])
        self.assertEqual(provenance["realpathAudit"]["nodeModulesOverlayPaths"], [])
        discovery = ledger["derivation"]["discovery"]
        self.assertEqual(discovery["algorithm"], "frozen-ast-import-export-static-path-v2")
        self.assertTrue(discovery["resolutionTrace"])
        self.assertRegex(discovery["rowDigest"], r"^[0-9a-f]{64}$")
        discovery_command = discovery["command"]
        self.assertTrue(
            {"argv", "cwd", "env", "envAbsent", "network", "exitCode", "stdout", "stderr"}
            <= set(discovery_command)
        )
        self.assertIsInstance(discovery_command["argv"], list)
        self.assertGreaterEqual(len(discovery_command["argv"]), 3)
        self.assertEqual(discovery_command["argv"][-3:-1], ["discover-v2", "--root"])
        self.assertIsInstance(discovery_command["argv"][-1], str)
        self.assertEqual(discovery_command["cwd"], ".")
        self.assertEqual(discovery_command["env"], {"CI": "true"})
        self.assertIn("PG_TEST_URL", discovery_command["envAbsent"])
        self.assertFalse(discovery_command["network"])
        self.assertEqual(discovery_command["exitCode"], 0)
        self.assertEqual(discovery_command["stdout"], _reference(ADDENDUM_DISCOVERY_STDOUT))
        self.assertEqual(discovery_command["stderr"], _reference(ADDENDUM_DISCOVERY_STDERR))
        for omission in ledger["omissions"]:
            if omission["classification"] != "NON_DERIVABLE_SOURCE_INPUT":
                continue
            for required_by in omission["requiredBy"]:
                self.assertRegex(required_by["sourceRangeSha256"], r"^[0-9a-f]{64}$")
                self.assertIn("resolutionTraceId", required_by)
        successor = next(
            omission
            for omission in ledger["omissions"]
            if omission["path"] == "packages/db/drizzle/0044_standard_pack_successor_commitments.sql"
        )
        successor_required_by = successor["requiredBy"]
        self.assertEqual(len(successor_required_by), 2)
        self.assertEqual(
            [row["resolutionTraceId"] for row in successor_required_by],
            sorted(row["resolutionTraceId"] for row in successor_required_by),
        )
        self.assertEqual(len({row["resolutionTraceId"] for row in successor_required_by}), 2)
        self.assertEqual(len({row["sourceRangeSha256"] for row in successor_required_by}), 2)
        self.assertEqual(
            len({row["resolutionSourceRangeSha256"] for row in successor_required_by}),
            1,
        )
        for row in successor_required_by:
            self.assertRegex(row["resolutionTraceId"], r"^trace-[0-9]{4}$")
            self.assertRegex(row["sourceRangeSha256"], r"^[0-9a-f]{64}$")
            self.assertRegex(row["resolutionSourceRangeSha256"], r"^[0-9a-f]{64}$")
        self.assertEqual(
            receipt["markerDisposition"],
            {
                "r1V3": "~",
                "r2Task3": "b",
                "r2Task4": "b",
                "r2Task5": "b",
                "r3": "b",
                "successors": "b",
                "upstreamAuthority": "NONE",
            },
        )
        validator(receipt, provenance, ledger)

        bad_receipt = copy.deepcopy(receipt)
        bad_receipt["priorV2Evidence"]["archive"]["sha256"] = "0" * 64
        with self.assertRaises(error_type):
            validator(bad_receipt, provenance, ledger)

        bad_receipt = copy.deepcopy(receipt)
        bad_receipt["rawStreams"][0]["sha256"] = "0" * 64
        with self.assertRaises(error_type):
            validator(bad_receipt, provenance, ledger)

        bad_receipt = copy.deepcopy(receipt)
        bad_receipt["markerDisposition"]["r2Task3"] = "~"
        with self.assertRaises(error_type):
            validator(bad_receipt, provenance, ledger)

        bad_ledger = copy.deepcopy(ledger)
        bad_ledger["omissions"] = [
            item
            for item in bad_ledger["omissions"]
            if item["path"] != "packages/db/company-identity/drizzle/0001_immutable_identity_audit.sql"
        ]
        with self.assertRaises(error_type):
            validator(receipt, provenance, bad_ledger)

        bad_receipt = copy.deepcopy(receipt)
        bad_receipt["subordinateReferences"] = []
        with self.assertRaises(error_type):
            validator(bad_receipt, provenance, ledger)

        bad_provenance = copy.deepcopy(provenance)
        bad_provenance["commands"]["materializer"]["network"] = True
        with self.assertRaises(error_type):
            validator(receipt, bad_provenance, ledger)

        bad_provenance = copy.deepcopy(provenance)
        bad_provenance["realpathAudit"]["outsideMaterializationRoot"] = ["escape"]
        with self.assertRaises(error_type):
            validator(receipt, bad_provenance, ledger)

        bad_provenance = copy.deepcopy(provenance)
        bad_provenance["toolVersions"]["scanner"]["stdoutSha256"] = "0" * 64
        with self.assertRaises(error_type):
            validator(receipt, bad_provenance, ledger)

        bad_ledger = copy.deepcopy(ledger)
        first = next(item for item in bad_ledger["omissions"] if item["classification"] == "NON_DERIVABLE_SOURCE_INPUT")
        first["requiredBy"][0]["sourceRangeSha256"] = "0" * 64
        with self.assertRaises(error_type):
            validator(receipt, provenance, bad_ledger)

        bad_ledger = copy.deepcopy(ledger)
        bad_ledger["derivation"]["discovery"].pop("command")
        with self.assertRaises(error_type):
            validator(receipt, provenance, bad_ledger)

        bad_ledger = copy.deepcopy(ledger)
        bad_ledger["derivation"]["discovery"]["command"]["argv"] = ["synthetic-discovery"]
        with self.assertRaises(error_type):
            validator(receipt, provenance, bad_ledger)

        bad_ledger = copy.deepcopy(ledger)
        bad_ledger["derivation"]["discovery"]["command"]["exitCode"] = 1
        with self.assertRaises(error_type):
            validator(receipt, provenance, bad_ledger)

        bad_ledger = copy.deepcopy(ledger)
        bad_ledger["derivation"]["discovery"]["command"]["stdout"]["sha256"] = "0" * 64
        with self.assertRaises(error_type):
            validator(receipt, provenance, bad_ledger)

        bad_ledger = copy.deepcopy(ledger)
        bad_ledger["derivation"]["discovery"]["command"]["stderr"]["sha256"] = "0" * 64
        with self.assertRaises(error_type):
            validator(receipt, provenance, bad_ledger)

        bad_ledger = copy.deepcopy(ledger)
        successor = next(
            item
            for item in bad_ledger["omissions"]
            if item["path"] == "packages/db/drizzle/0044_standard_pack_successor_commitments.sql"
        )
        successor["requiredBy"] = successor["requiredBy"][:1]
        with self.assertRaises(error_type):
            validator(receipt, provenance, bad_ledger)

        bad_ledger = copy.deepcopy(ledger)
        successor = next(
            item
            for item in bad_ledger["omissions"]
            if item["path"] == "packages/db/drizzle/0044_standard_pack_successor_commitments.sql"
        )
        successor["requiredBy"][1]["resolutionTraceId"] = successor["requiredBy"][0]["resolutionTraceId"]
        with self.assertRaises(error_type):
            validator(receipt, provenance, bad_ledger)

        bad_ledger = copy.deepcopy(ledger)
        successor = next(
            item
            for item in bad_ledger["omissions"]
            if item["path"] == "packages/db/drizzle/0044_standard_pack_successor_commitments.sql"
        )
        successor["requiredBy"][1]["resolutionSourceRangeSha256"] = "0" * 64
        with self.assertRaises(error_type):
            validator(receipt, provenance, bad_ledger)

    def test_v3_sol_materialization_gates_bind_only_a_candidate(self) -> None:
        """Requires Sol's ten R1 v3 materialization gates without unblocking R2.

        @returns Nothing; assertions bind the candidate-only closure.
        """
        addendum_receipt, addendum_provenance, addendum_ledger, _, _ = self._load_addendum()
        manifest, archive, ledger, profile, receipt, graph_binding, clean_audit, compensation, validator, error_type = self._load_v3()
        expected_v2 = {
            key: {"path": path.relative_to(TRACK_DIR).as_posix(), "sha256": digest, "size": size}
            for key, (path, digest, size) in V2_EVIDENCE.items()
        }
        expected_blockers = [
            {"path": BLOCKER.name, "sha256": BLOCKER_SHA256, "size": BLOCKER_SIZE},
            {"path": CLARIFICATION.name, "sha256": CLARIFICATION_SHA256, "size": CLARIFICATION_SIZE},
        ]
        self.assertEqual(
            manifest["acceptedBridgeInputs"],
            {
                "addendum": {
                    "receipt": _reference(ADDENDUM_RECEIPT),
                    "provenance": _reference(ADDENDUM_PROVENANCE),
                    "ledger": _reference(ADDENDUM_LEDGER),
                },
                "v2Blockers": expected_blockers,
                "v2RawStreams": addendum_receipt["rawStreams"],
            },
        )
        self.assertEqual(manifest["status"], "CANDIDATE_UNACCEPTED")
        self.assertEqual(
            manifest["r2Task3Disposition"],
            "BLOCKED_PENDING_INDEPENDENT_R1_V3_ACCEPTANCE",
        )
        self.assertEqual(manifest["markerDisposition"], addendum_receipt["markerDisposition"])

        entries = archive["entries"]
        archive_by_path = {entry["path"]: entry for entry in entries}
        self.assertEqual(len(archive_by_path), len(entries))
        self.assertEqual([entry["path"] for entry in entries], sorted(archive_by_path))
        self.assertTrue(all({"path", "sha256", "size", "mode", "kind", "state"} <= set(entry) for entry in entries))
        self.assertTrue(all(set(Path(entry["path"]).parts).isdisjoint(DERIVED_PARTS) for entry in entries))
        v2_entries = _load_json(V2_ARCHIVE, self)["entries"]
        retained_v2_by_path = {
            entry["path"]: entry
            for entry in v2_entries
            if set(Path(entry["path"]).parts).isdisjoint(DERIVED_PARTS)
        }
        self.assertEqual(len(retained_v2_by_path), 4249)
        self.assertEqual(
            set(archive_by_path),
            set(retained_v2_by_path) | V3_SUPPLEMENTAL_PATHS,
        )
        self.assertEqual(
            {path: archive_by_path[path] for path in retained_v2_by_path},
            retained_v2_by_path,
        )
        self.assertEqual(set(archive_by_path) - set(retained_v2_by_path), V3_SUPPLEMENTAL_PATHS)
        closure_inventory = archive["closureInventory"]
        self.assertEqual(closure_inventory, _archive_inventory(entries))

        clean_room = profile["cleanRoom"]
        self.assertEqual(
            clean_room["prohibitedOverlays"],
            ["shared-worktree", "node_modules", "dist", "preexisting-generated"],
        )
        replay_command = clean_room["replayCommand"]
        self.assertTrue({"argv", "cwd", "env", "envAbsent", "network", "exitCode"} <= set(replay_command))
        self.assertEqual(replay_command["argv"], next(item for item in receipt["commands"] if item["id"] == "replay")["argv"])
        self.assertEqual(replay_command["cwd"], ".")
        self.assertEqual(replay_command["env"], {"CI": "true"})
        self.assertIn("PG_TEST_URL", replay_command["envAbsent"])
        self.assertFalse(replay_command["network"])
        self.assertEqual(replay_command["exitCode"], 0)
        self.assertEqual(clean_room["preexistingGeneratedPaths"], [])
        self.assertEqual(receipt["realpathAudit"]["preexistingGeneratedPaths"], [])
        baseline_inventory = {"pre": V2_FROZEN_SOURCE_INVENTORY, "post": V2_FROZEN_SOURCE_INVENTORY}
        self.assertEqual(profile["baselineV2Inventory"], baseline_inventory)
        self.assertEqual(receipt["baselineV2Inventory"], baseline_inventory)
        self.assertEqual(profile["closureInventory"], closure_inventory)
        self.assertEqual(receipt["closureInventory"], closure_inventory)
        self.assertNotEqual(closure_inventory["sha256"], V2_FROZEN_SOURCE_INVENTORY["sha256"])
        inventories = receipt["orderedInventories"]
        self.assertEqual(
            [item["stage"] for item in inventories],
            [
                "baseline-v2-pre",
                "baseline-v2-post",
                "closure-pre-build",
                "closure-post-build",
                "closure-post-standard-pack-generation",
            ],
        )
        self.assertEqual(inventories[0]["inventory"], V2_FROZEN_SOURCE_INVENTORY)
        self.assertEqual(inventories[1]["inventory"], V2_FROZEN_SOURCE_INVENTORY)
        self.assertEqual(
            [item["inventory"] for item in inventories[2:]],
            [closure_inventory, closure_inventory, closure_inventory],
        )
        self.assertTrue(all({"entryCount", "sha256"} <= set(item["inventory"]) for item in inventories))

        self.assertEqual(ledger["derivation"]["bridge"], {
            "addendumLedger": _reference(ADDENDUM_LEDGER),
            "rowDigest": addendum_ledger["derivation"]["discovery"]["rowDigest"],
        })
        self.assertEqual(
            ledger["derivation"]["discovery"],
            addendum_ledger["derivation"]["discovery"],
        )
        self.assertEqual(
            ledger["classificationAudit"],
            {"dynamicInputs": [], "orphanedInputs": [], "duplicateClassifications": []},
        )
        source_inputs = {item["path"]: item for item in ledger["sourceInputs"]}
        self.assertEqual(set(source_inputs), V3_SUPPLEMENTAL_PATHS)
        for path, source in source_inputs.items():
            archive_entry = archive_by_path[path]
            self.assertEqual(
                {key: source[key] for key in ("path", "realpath", "sha256", "size", "mode")},
                {
                    "path": path,
                    "realpath": path,
                    "sha256": archive_entry["sha256"],
                    "size": archive_entry["size"],
                    "mode": archive_entry["mode"],
                },
            )
        supplement_capture = ledger["supplementCapture"]
        self.assertEqual(set(supplement_capture), {"pre", "post"})
        expected_supplement_entries = {
            path: {
                "path": path,
                "sha256": archive_by_path[path]["sha256"],
                "size": archive_by_path[path]["size"],
                "mode": archive_by_path[path]["mode"],
            }
            for path in sorted(V3_SUPPLEMENTAL_PATHS)
        }
        for snapshot in supplement_capture.values():
            self.assertEqual(set(snapshot), {"gitStatus", "stagedDiff", "entries"})
            self.assertEqual(snapshot["entries"], expected_supplement_entries)
            for field, argv in {
                "gitStatus": ["/usr/bin/git", "status", "--porcelain=v1", "--untracked-files=all"],
                "stagedDiff": ["/usr/bin/git", "diff", "--cached", "--binary", "--no-ext-diff"],
            }.items():
                command = snapshot[field]
                self.assertEqual(command["argv"], argv)
                self.assertEqual(command["cwd"], ".")
                self.assertEqual(command["env"], {"CI": "true"})
                self.assertIn("PG_TEST_URL", command["envAbsent"])
                self.assertFalse(command["network"])
                self.assertEqual(command["exitCode"], 0)
                for stream in ("stdout", "stderr"):
                    reference = command[stream]
                    self.assertEqual(set(reference), {"path", "sha256", "size"})
                    self.assertTrue(reference["path"].startswith("r1-v3-execution-closure-20260801/raw/"))
                    self.assertEqual(reference, _reference(TRACK_DIR / reference["path"]))
        self.assertEqual(supplement_capture["pre"], supplement_capture["post"])

        command_ids = [item["id"] for item in receipt["commands"]]
        expected_ids = ["materialize", "replay", "offline-install", "build-db", "build-auth", "build-backend"]
        if profile["standardPackCatalog"]["mode"] == "REQUIRES_RECORDED_GENERATION":
            expected_ids.extend(["clear-stale-standard-pack-catalog", "generate-standard-pack-catalog"])
        expected_ids.extend(item[0] for item in FR4)
        self.assertEqual(command_ids, expected_ids)
        expected_census = {
            "tests": [item[0] for item in FR4],
            "passed": [item[0] for item in FR4],
            "failed": [],
            "skipped": {"PG_TEST_URL": "ABSENT"},
        }
        self.assertEqual(profile["outcomeCensus"], expected_census)
        self.assertEqual(receipt["outcomeCensus"], expected_census)

        immutable_audit = clean_audit["task3ImmutableAudit"]
        self.assertEqual(immutable_audit["v2Evidence"], expected_v2)
        self.assertEqual(immutable_audit["blockerRecords"], expected_blockers)
        self.assertTrue(immutable_audit["tamperChecks"])
        self.assertTrue(immutable_audit["absenceChecks"])
        self.assertEqual(immutable_audit["findings"], [])
        validator(manifest, archive, ledger, profile, receipt, graph_binding, clean_audit, compensation)

        bad = copy.deepcopy(manifest)
        bad["acceptedBridgeInputs"]["v2RawStreams"][0]["sha256"] = "0" * 64
        with self.assertRaises(error_type):
            validator(bad, archive, ledger, profile, receipt, graph_binding, clean_audit, compensation)
        bad = copy.deepcopy(receipt)
        bad["orderedInventories"][2]["inventory"]["sha256"] = "0" * 64
        with self.assertRaises(error_type):
            validator(manifest, archive, ledger, profile, bad, graph_binding, clean_audit, compensation)
        bad = copy.deepcopy(receipt)
        bad["orderedInventories"][4]["inventory"]["sha256"] = "0" * 64
        with self.assertRaises(error_type):
            validator(manifest, archive, ledger, profile, bad, graph_binding, clean_audit, compensation)
        bad = copy.deepcopy(receipt)
        bad["realpathAudit"]["preexistingGeneratedPaths"] = ["apps/accounts/.next/types/routes.d.ts"]
        with self.assertRaises(error_type):
            validator(manifest, archive, ledger, profile, bad, graph_binding, clean_audit, compensation)
        bad = copy.deepcopy(profile)
        bad["baselineV2Inventory"]["pre"]["entryCount"] = 0
        with self.assertRaises(error_type):
            validator(manifest, archive, ledger, bad, receipt, graph_binding, clean_audit, compensation)
        bad = copy.deepcopy(manifest)
        bad["closureSha256"] = V2_FROZEN_SOURCE_INVENTORY["sha256"]
        with self.assertRaises(error_type):
            validator(bad, archive, ledger, profile, receipt, graph_binding, clean_audit, compensation)
        bad = copy.deepcopy(ledger)
        bad["classificationAudit"]["dynamicInputs"] = ["dynamic-source"]
        with self.assertRaises(error_type):
            validator(manifest, archive, bad, profile, receipt, graph_binding, clean_audit, compensation)
        bad = copy.deepcopy(ledger)
        bad["sourceInputs"][0]["mode"] = "000000"
        with self.assertRaises(error_type):
            validator(manifest, archive, bad, profile, receipt, graph_binding, clean_audit, compensation)
        bad = copy.deepcopy(archive)
        retained_path = next(iter(retained_v2_by_path))
        next(entry for entry in bad["entries"] if entry["path"] == retained_path)["contentBase64"] = ""
        with self.assertRaises(error_type):
            validator(manifest, bad, ledger, profile, receipt, graph_binding, clean_audit, compensation)
        bad = copy.deepcopy(ledger)
        supplement_path = next(iter(V3_SUPPLEMENTAL_PATHS))
        bad["supplementCapture"]["post"]["entries"][supplement_path]["sha256"] = "0" * 64
        with self.assertRaises(error_type):
            validator(manifest, archive, bad, profile, receipt, graph_binding, clean_audit, compensation)
        bad = copy.deepcopy(receipt)
        bad["commands"][0], bad["commands"][1] = bad["commands"][1], bad["commands"][0]
        with self.assertRaises(error_type):
            validator(manifest, archive, ledger, profile, bad, graph_binding, clean_audit, compensation)
        bad = copy.deepcopy(clean_audit)
        bad["task3ImmutableAudit"]["findings"] = [{"code": "TAMPER_FOUND"}]
        with self.assertRaises(error_type):
            validator(manifest, archive, ledger, profile, receipt, graph_binding, bad, compensation)

    def test_v3_manifest_and_ledger_bind_the_addendum_and_mechanical_omissions(self) -> None:
        """Requires a candidate-only closure and a finite mechanically derived omission ledger."""
        manifest, archive, ledger, profile, receipt, graph_binding, clean_audit, compensation, validator, _ = self._load_v3()
        self.assertEqual(manifest["schemaVersion"], 1)
        self.assertEqual(manifest["kind"], "execution-closure")
        self.assertEqual(manifest["status"], "CANDIDATE_UNACCEPTED")
        self.assertEqual(manifest["selectionRule"], "frozen-ast-execution-closure-v1")
        self.assertNotIn("acceptedAt", manifest)
        self.assertEqual(manifest["blockerAddendum"]["receipt"], _reference(ADDENDUM_RECEIPT))
        self.assertEqual(manifest["blockerAddendum"]["provenance"], _reference(ADDENDUM_PROVENANCE))
        self.assertEqual(manifest["blockerAddendum"]["ledger"], _reference(ADDENDUM_LEDGER))
        self.assertEqual(
            manifest["derivedEvidence"],
            {
                "graphBinding": _reference(V3_GRAPH_BINDING),
                "cleanAudit": _reference(V3_CLEAN_AUDIT),
                "compensation": _reference(V3_COMPENSATION),
            },
        )
        self.assertEqual(
            manifest["closureCore"],
            {
                "archive": _reference(V3_ARCHIVE),
                "ledger": _reference(V3_LEDGER),
                "profile": _reference(V3_PROFILE),
                "receipt": _reference(V3_RECEIPT),
            },
        )
        self.assertEqual(
            manifest["closureSha256"],
            _sha256(json.dumps(manifest["closureCore"], sort_keys=True, separators=(",", ":")).encode("utf-8")),
        )
        omission_paths = {item["path"] for item in ledger["omissions"]}
        self.assertTrue(NON_DERIVABLE_OMISSIONS <= omission_paths)
        self.assertEqual(ledger["derivation"]["rule"], "frozen-ast-execution-closure-v1")
        discovery = ledger["derivation"]["discovery"]
        self.assertIn("command", discovery)
        expansion = discovery["entrypointExpansion"]
        self.assertEqual([row["ordinal"] for row in expansion], list(range(len(expansion))))
        self.assertTrue(expansion)
        for row in expansion:
            self.assertTrue({"entrypoint", "argv", "expandedFrom", "sourceRangeSha256"} <= set(row))
            self.assertIsInstance(row["argv"], list)
            self.assertRegex(row["sourceRangeSha256"], r"^[0-9a-f]{64}$")
        archive_paths = {item["path"] for item in archive["entries"]}
        self.assertTrue(NON_DERIVABLE_OMISSIONS <= archive_paths)
        standard_pack = next(item for item in ledger["omissions"] if item["path"] == STANDARD_PACK_CATALOG)
        if standard_pack["classification"] == "NON_DERIVABLE_SOURCE_INPUT":
            self.assertIn(STANDARD_PACK_CATALOG, archive_paths)
        else:
            self.assertEqual(standard_pack["classification"], "REQUIRES_RECORDED_GENERATION")
            self.assertEqual(standard_pack["generator"]["argv"], STANDARD_PACK_GENERATOR)
            self.assertEqual(standard_pack["generator"]["output"]["path"], STANDARD_PACK_CATALOG)
        self.assertTrue(all(set(Path(path).parts).isdisjoint(DERIVED_PARTS) for path in archive_paths))
        validator(manifest, archive, ledger, profile, receipt, graph_binding, clean_audit, compensation)

        bad = copy.deepcopy(ledger)
        bad["derivation"]["discovery"]["entrypointExpansion"][0]["ordinal"] = 1
        with self.assertRaises(error_type):
            validator(manifest, archive, bad, profile, receipt, graph_binding, clean_audit, compensation)

    def test_v3_regenerates_graph_audit_and_compensation_from_the_fresh_closure(self) -> None:
        """Requires fresh canonical graph, audit, and compensation inputs for the v3 closure."""
        manifest, archive, ledger, profile, receipt, graph_binding, clean_audit, compensation, validator, error_type = self._load_v3()
        closure = {
            "archive": _reference(V3_ARCHIVE),
            "ledger": _reference(V3_LEDGER),
            "profile": _reference(V3_PROFILE),
            "receipt": _reference(V3_RECEIPT),
            "closureSha256": manifest["closureSha256"],
        }
        self.assertRegex(manifest["closureSha256"], r"^[0-9a-f]{64}$")
        raw_references: list[dict[str, Any]] = []
        for command in receipt["commands"]:
            for stream in ("stdout", "stderr"):
                reference = command[stream]
                self.assertEqual(set(reference), {"path", "sha256", "size"})
                self.assertTrue(reference["path"].startswith("r1-v3-execution-closure-20260801/raw/"))
                self.assertEqual(reference, _reference(TRACK_DIR / reference["path"]))
                raw_references.append(reference)
        for artifact in (graph_binding, clean_audit, compensation):
            self.assertEqual(artifact["executionClosure"], closure)
            self.assertEqual(artifact["status"], "CANDIDATE_UNACCEPTED")
            self.assertTrue(artifact["rawStreams"])
            for reference in artifact["rawStreams"]:
                self.assertEqual(set(reference), {"path", "sha256", "size"})
                self.assertTrue(reference["path"].startswith("r1-v3-execution-closure-20260801/raw/"))
                self.assertEqual(reference, _reference(TRACK_DIR / reference["path"]))
                raw_references.append(reference)
        self.assertEqual(len(raw_references), len({reference["path"] for reference in raw_references}))
        self.assertEqual(graph_binding["scanCommand"], "repo-graph scan . ./graph.db")
        bad = copy.deepcopy(graph_binding)
        bad["executionClosure"]["archive"] = _reference(V2_ARCHIVE)
        with self.assertRaises(error_type):
            validator(manifest, archive, ledger, profile, receipt, bad, clean_audit, compensation)
        bad = copy.deepcopy(graph_binding)
        bad["executionClosure"]["closureSha256"] = "0" * 64
        with self.assertRaises(error_type):
            validator(manifest, archive, ledger, profile, receipt, bad, clean_audit, compensation)
        bad = copy.deepcopy(clean_audit)
        bad["executionClosure"]["profile"] = _reference(V2_MANIFEST)
        with self.assertRaises(error_type):
            validator(manifest, archive, ledger, profile, receipt, graph_binding, bad, compensation)
        bad = copy.deepcopy(compensation)
        bad["executionClosure"]["ledger"] = _reference(V2_MANIFEST)
        with self.assertRaises(error_type):
            validator(manifest, archive, ledger, profile, receipt, graph_binding, clean_audit, bad)

    def test_profile_rebuilds_exports_and_receipt_replays_exact_isolated_commands(self) -> None:
        """Requires isolated derived builds and every FR4 raw command receipt."""
        manifest, archive, ledger, profile, receipt, graph_binding, clean_audit, compensation, validator, error_type = self._load_v3()
        self.assertEqual(profile["install"], {"argv": HERMETIC_PNPM_INSTALL, "cwd": "."})
        self.assertEqual(profile["prerequisiteBuilds"], list(BUILDS))
        self.assertEqual([(item["id"], item["argv"]) for item in profile["fr4Commands"]], list(FR4))
        self.assertTrue(all(item["env"] == {"CI": "true"} for item in profile["fr4Commands"]))
        self.assertNotIn("PG_TEST_URL", profile["environment"])
        self.assertEqual(profile["environment"]["allowlisted"], {"CI": "true"})
        self.assertIn("PG_TEST_URL", profile["environment"]["absencePredicates"])
        self.assertEqual(profile["conditionalSkips"]["PG_TEST_URL"], "ABSENT")
        expected_tools = {
            "node": ["node", "--version"],
            "pnpm": ["pnpm", "--version"],
            "scanner": ["repo-graph", "--version"],
        }
        self.assertEqual(set(profile["toolVersions"]), set(expected_tools))
        for name, argv in expected_tools.items():
            identity = profile["toolVersions"][name]
            self.assertEqual(identity["argv"], argv)
            self.assertTrue(identity["stdout"])
            self.assertRegex(identity["stdoutSha256"], r"^[0-9a-f]{64}$")
        executor_toolchain = profile["executorToolchain"]
        self.assertEqual(set(executor_toolchain), {"node", "pnpmLauncher"})
        for name, version_name in (("node", "node"), ("pnpmLauncher", "pnpm")):
            identity = executor_toolchain[name]
            self.assertTrue({"path", "sha256", "version"} <= set(identity))
            self.assertTrue(Path(identity["path"]).is_absolute())
            self.assertRegex(identity["sha256"], r"^[0-9a-f]{64}$")
            self.assertEqual(identity["version"], profile["toolVersions"][version_name]["stdout"])
        lockfile = profile["frozenInputs"]["lockfile"]
        self.assertEqual(profile["frozenInputs"]["archive"], _reference(V3_ARCHIVE))
        self.assertNotIn("manifest", profile["frozenInputs"])
        self.assertTrue({"path", "sha256", "size"} <= set(lockfile))
        archive_lockfile = next(item for item in archive["entries"] if item["path"] == lockfile["path"])
        self.assertEqual(
            {key: archive_lockfile[key] for key in ("path", "sha256", "size")},
            lockfile,
        )
        command_ids = {item["id"] for item in receipt["commands"]}
        self.assertTrue({"materialize", "replay", "offline-install", "build-db", "build-auth", "build-backend"} <= command_ids)
        if profile["standardPackCatalog"]["mode"] == "REQUIRES_RECORDED_GENERATION":
            catalog = profile["standardPackCatalog"]
            self.assertEqual(catalog["argv"], STANDARD_PACK_GENERATOR)
            self.assertIn("clear-stale-standard-pack-catalog", command_ids)
            self.assertIn("generate-standard-pack-catalog", command_ids)
            stale_clear = catalog["staleOutputClear"]
            self.assertEqual(
                stale_clear,
                {
                    "id": "clear-stale-standard-pack-catalog",
                    "argv": ["rm", "-f", STANDARD_PACK_CATALOG],
                    "path": STANDARD_PACK_CATALOG,
                    "postcondition": "ABSENT_BEFORE_RECORDED_GENERATION",
                },
            )
            clear_command = next(item for item in receipt["commands"] if item["id"] == stale_clear["id"])
            generation = next(item for item in receipt["commands"] if item["id"] == "generate-standard-pack-catalog")
            self.assertEqual(clear_command["argv"], stale_clear["argv"])
            self.assertEqual(clear_command["exitCode"], 0)
            self.assertLess(
                [item["id"] for item in receipt["commands"]].index(clear_command["id"]),
                [item["id"] for item in receipt["commands"]].index(generation["id"]),
            )
            self.assertEqual(generation["argv"], STANDARD_PACK_GENERATOR)
            self.assertIn("output", generation)
        else:
            self.assertEqual(profile["standardPackCatalog"]["mode"], "NON_DERIVABLE_SOURCE_INPUT")
        self.assertTrue({item[0] for item in FR4} <= command_ids)
        self.assertEqual(receipt["toolVersions"], profile["toolVersions"])
        self.assertEqual(receipt["frozenInputs"], profile["frozenInputs"])
        command_raw_paths: list[str] = []
        for command in receipt["commands"]:
            self.assertTrue({"argv", "cwd", "env", "envAbsent", "network", "exitCode", "stdout", "stderr"} <= set(command))
            self.assertEqual(command["env"], profile["environment"]["allowlisted"])
            self.assertEqual(command["envAbsent"], profile["environment"]["absencePredicates"])
            self.assertFalse(command["network"])
            for stream in ("stdout", "stderr"):
                reference = command[stream]
                self.assertEqual(set(reference), {"path", "sha256", "size"})
                self.assertTrue(reference["path"].startswith("r1-v3-execution-closure-20260801/raw/"))
                self.assertEqual(reference, _reference(TRACK_DIR / reference["path"]))
                command_raw_paths.append(reference["path"])
        self.assertEqual(len(command_raw_paths), len(set(command_raw_paths)))
        pnpm_commands = [command for command in receipt["commands"] if command["argv"][0] == "pnpm"]
        self.assertTrue(pnpm_commands)
        scoped_pnpm_commands = [*BUILDS, STANDARD_PACK_GENERATOR, *[argv for _, argv in FR4]]
        expected_scoped_payloads = {
            tuple(logical): [
                "/usr/local/bin/node",
                "/opt/pnpm/bin/pnpm.mjs",
                "--config.store-dir=/root/.local/share/pnpm/store/v11",
                *logical[1:],
            ]
            for logical in scoped_pnpm_commands
        }
        for command in pnpm_commands:
            if tuple(command["argv"]) in expected_scoped_payloads:
                self.assertEqual(command["actualExecutor"]["payloadArgv"], expected_scoped_payloads[tuple(command["argv"])])
                self.assertNotEqual(
                    command["actualExecutor"]["payloadArgv"][-1],
                    "--config.store-dir=/root/.local/share/pnpm/store/v11",
                    "a late store-dir is forwarded to the selected package script",
                )
        for command in pnpm_commands:
            executor = command["actualExecutor"]
            self.assertEqual(executor["logicalArgv"], command["argv"])
            self.assertEqual(executor["toolchain"], executor_toolchain)
            self.assertEqual(executor["environment"], {"CI": "true"})
            self.assertEqual(set(executor["effectiveEnvironment"]), {"CI", "PATH"})
            self.assertEqual(executor["effectiveEnvironment"]["CI"], "true")
            self.assertTrue(executor["effectiveEnvironment"]["PATH"])
            self.assertEqual(executor["inheritedEnv"], [])
            self.assertIsInstance(executor["argv"], list)
            self.assertIsInstance(executor["payloadArgv"], list)
            self.assertGreaterEqual(len(executor["payloadArgv"]), 2)
            self.assertTrue(Path(executor["payloadArgv"][0]).is_absolute())
            self.assertTrue(Path(executor["payloadArgv"][1]).is_absolute())
        gate = receipt["gateStatus"]
        self.assertEqual(gate["algorithm"], "all-command-exits-and-expected-skip-census-v1")
        self.assertEqual(gate["orderedCommandIds"], [item["id"] for item in receipt["commands"]])
        self.assertEqual(gate["exitCodes"], {item["id"]: item["exitCode"] for item in receipt["commands"]})
        self.assertEqual(gate["expectedSkipCensus"], profile["conditionalSkips"])
        self.assertEqual(gate["observedSkipCensus"], profile["conditionalSkips"])
        self.assertEqual(gate["status"], "PASS")
        self.assertTrue(all(item["exitCode"] == 0 for item in receipt["commands"]))
        self.assertEqual(receipt["baselineV2Inventory"], profile["baselineV2Inventory"])
        self.assertEqual(receipt["closureInventory"], archive["closureInventory"])
        self.assertNotEqual(
            receipt["baselineV2Inventory"]["pre"]["sha256"],
            manifest["closureSha256"],
        )
        self.assertEqual(receipt["realpathAudit"]["sourceRootOverlayPaths"], [])
        self.assertEqual(receipt["realpathAudit"]["nodeModulesOverlayPaths"], [])
        bad = copy.deepcopy(profile)
        bad["prerequisiteBuilds"] = bad["prerequisiteBuilds"][:-1]
        with self.assertRaises(error_type):
            validator(manifest, archive, ledger, bad, receipt, graph_binding, clean_audit, compensation)
        bad = copy.deepcopy(profile)
        bad["environment"]["PG_TEST_URL"] = "postgres://forbidden"
        with self.assertRaises(error_type):
            validator(manifest, archive, ledger, bad, receipt, graph_binding, clean_audit, compensation)
        bad = copy.deepcopy(profile)
        bad["frozenInputs"]["manifest"] = _reference(V2_MANIFEST)
        with self.assertRaises(error_type):
            validator(manifest, archive, ledger, bad, receipt, graph_binding, clean_audit, compensation)
        bad_receipt = copy.deepcopy(receipt)
        bad_receipt["commands"][0]["exitCode"] = 1
        with self.assertRaises(error_type):
            validator(manifest, archive, ledger, profile, bad_receipt, graph_binding, clean_audit, compensation)
        bad_profile = copy.deepcopy(profile)
        if bad_profile["standardPackCatalog"]["mode"] == "REQUIRES_RECORDED_GENERATION":
            bad_profile["standardPackCatalog"]["staleOutputClear"]["path"] = "generated/stale.json"
            with self.assertRaises(error_type):
                validator(manifest, archive, ledger, bad_profile, receipt, graph_binding, clean_audit, compensation)
        bad_profile = copy.deepcopy(profile)
        bad_profile["executorToolchain"]["node"]["sha256"] = "0" * 64
        with self.assertRaises(error_type):
            validator(manifest, archive, ledger, bad_profile, receipt, graph_binding, clean_audit, compensation)
        bad_receipt = copy.deepcopy(receipt)
        pnpm_command = next(item for item in bad_receipt["commands"] if item["argv"][0] == "pnpm")
        pnpm_command["actualExecutor"]["inheritedEnv"] = ["PATH"]
        with self.assertRaises(error_type):
            validator(manifest, archive, ledger, profile, bad_receipt, graph_binding, clean_audit, compensation)


    def test_failed_podman_attempt_preserves_exact_stage_and_reserves_retry_path(self) -> None:
        """Requires failed Podman attempts to preserve exact staged evidence without overwriting history.

        @returns Nothing; assertions pin the retained blocker and exercise the retry reservation seam.
        """
        self.assertTrue(PODMAN_BLOCKER.is_file())
        self.assertFalse(PODMAN_BLOCKER.is_symlink())
        self.assertEqual(_sha256(PODMAN_BLOCKER.read_bytes()), PODMAN_BLOCKER_SHA256)
        self.assertEqual(PODMAN_BLOCKER.stat().st_size, PODMAN_BLOCKER_SIZE)
        historical = _load_json(PODMAN_BLOCKER, self)
        self.assertEqual(historical["status"], "BLOCKED")
        self.assertEqual(historical["reason"], "initialization")
        self.assertEqual(historical["error"], "V3_PODMAN_GATE_FAILED: inventory-pnpmLauncher-pre")
        self.assertEqual(historical["markerDisposition"], {
            "r1V3": "~",
            "r2Task3": "b",
            "r2Task4": "b",
            "r2Task5": "b",
            "r3": "b",
            "successors": "b",
            "upstreamAuthority": "NONE",
        })
        self.assertEqual(historical["upstreamAuthority"], "NONE")
        self.assertNotIn(
            "inventory-pnpmLauncher-pre",
            [command.get("id") for command in historical["commands"]],
            "historical evidence proves the original producer lost the failing staged command",
        )

        podman = importlib.import_module("measure.business_operations_graph_baseline_execution_closure_v3_podman")
        validator = getattr(podman, "validate_failed_execution_attempt_v1", None)
        reserve_attempt = getattr(podman, "reserve_execution_attempt_directory_v1", None)
        error_type = getattr(importlib.import_module(HELPER_MODULE), "ExecutionClosureValidationError", None)
        self.assertTrue(callable(validator), "V3_PODMAN_FAILED_ATTEMPT_VALIDATOR_MISSING")
        self.assertTrue(callable(reserve_attempt), "V3_PODMAN_ATTEMPT_RESERVATION_MISSING")
        self.assertTrue(isinstance(error_type, type) and issubclass(error_type, Exception))

        with tempfile.TemporaryDirectory() as temporary:
            attempts_root = Path(temporary)
            (attempts_root / "r1-v3-podman-execution-attempt-20260801-0001").mkdir()
            (attempts_root / "r1-v3-podman-execution-attempt-20260801-0003").mkdir()
            attempt_directory = reserve_attempt(attempts_root, "20260801")
            self.assertEqual(attempt_directory.name, "r1-v3-podman-execution-attempt-20260801-0004")
            self.assertTrue(attempt_directory.is_dir())
            second_attempt = reserve_attempt(attempts_root, "20260801")
            self.assertEqual(second_attempt.name, "r1-v3-podman-execution-attempt-20260801-0005")
            self.assertTrue(second_attempt.is_dir())

            raw = attempt_directory / "raw"
            raw.mkdir()
            stdout = raw / "inventory-pnpmLauncher-pre.stdout.txt"
            stderr = raw / "inventory-pnpmLauncher-pre.stderr.txt"
            stdout.write_text("", encoding="utf-8")
            stderr.write_text("inventory runner exited before JSON output\n", encoding="utf-8")

            def raw_reference(path: Path) -> dict[str, Any]:
                data = path.read_bytes()
                return {
                    "path": f"{attempt_directory.name}/raw/{path.name}",
                    "sha256": _sha256(data),
                    "size": len(data),
                }

            failed_command = {
                "id": "inventory-pnpmLauncher-pre",
                "argv": ["recursive-path-metadata-sha256", "/opt/pnpm"],
                "cwd": ".",
                "env": {"CI": "true"},
                "envAbsent": ["PG_TEST_URL"],
                "network": False,
                "exitCode": 1,
                "stdout": raw_reference(stdout),
                "stderr": raw_reference(stderr),
                "actualExecutor": {
                    "logicalArgv": ["recursive-path-metadata-sha256", "/opt/pnpm"],
                    "environment": {"CI": "true"},
                    "effectiveEnvironment": {"CI": "true", "PATH": "/usr/local/bin:/usr/bin:/bin"},
                    "inheritedEnv": [],
                    "payloadArgv": ["/usr/local/bin/node", "-e", "require('node:fs');"],
                    "argv": [
                        "/usr/bin/podman",
                        "run",
                        "--rm",
                        "--network",
                        "none",
                        "node:22-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3",
                        "/usr/bin/env",
                        "-i",
                        "CI=true",
                        "PATH=/usr/local/bin:/usr/bin:/bin",
                        "/usr/local/bin/node",
                        "-e",
                        "require('node:fs');",
                    ],
                },
            }
            attempt = {
                "schemaVersion": 1,
                "kind": "execution-closure-failed-attempt",
                "status": "BLOCKED",
                "attempt": {
                    "id": attempt_directory.name,
                    "sequence": 4,
                    "namingRule": "r1-v3-podman-execution-attempt-YYYYMMDD-NNNN",
                },
                "historicalBlocker": _reference(PODMAN_BLOCKER),
                "failure": {
                    "stage": "inventory-pnpmLauncher-pre",
                    "reason": "V3_PODMAN_GATE_FAILED: inventory-pnpmLauncher-pre",
                    "classification": "COMMAND_EXIT_NONZERO",
                    "commandId": "inventory-pnpmLauncher-pre",
                },
                "commands": [failed_command],
                "markerDisposition": historical["markerDisposition"],
                "upstreamAuthority": "NONE",
            }
            validator(attempt, attempt_directory)
            bad = copy.deepcopy(attempt)
            bad["failure"]["reason"] = "initialization"
            with self.assertRaises(error_type):
                validator(bad, attempt_directory)
            bad = copy.deepcopy(attempt)
            bad["commands"][0]["exitCode"] = 0
            with self.assertRaises(error_type):
                validator(bad, attempt_directory)
            bad = copy.deepcopy(attempt)
            bad["commands"][0]["argv"] = ["pnpm", "install"]
            with self.assertRaises(error_type):
                validator(bad, attempt_directory)
            bad = copy.deepcopy(attempt)
            bad["commands"][0]["stderr"]["sha256"] = "0" * 64
            with self.assertRaises(error_type):
                validator(bad, attempt_directory)

    def test_hermetic_pnpm_contract_bounds_registry_retries_and_truthfully_classifies_terminal_outcomes(self) -> None:
        """Requires deterministic hermetic pnpm policy and auditable terminal-outcome classification.

        @returns Nothing; assertions pin immutable legacy evidence and define the next retry contract.
        """
        self.assertTrue(PODMAN_ATTEMPT.is_file())
        self.assertFalse(PODMAN_ATTEMPT.is_symlink())
        self.assertEqual(_sha256(PODMAN_ATTEMPT.read_bytes()), PODMAN_ATTEMPT_SHA256)
        self.assertEqual(PODMAN_ATTEMPT.stat().st_size, PODMAN_ATTEMPT_SIZE)
        self.assertTrue(PODMAN_ATTEMPT_STDOUT.is_file())
        self.assertFalse(PODMAN_ATTEMPT_STDOUT.is_symlink())
        self.assertTrue(PODMAN_ATTEMPT_STDERR.is_file())
        self.assertFalse(PODMAN_ATTEMPT_STDERR.is_symlink())

        retained_attempt = _load_json(PODMAN_ATTEMPT, self)
        retained_command = retained_attempt["commands"][0]
        self.assertEqual(retained_attempt["status"], "BLOCKED")
        self.assertEqual(retained_attempt["failure"], {
            "classification": "COMMAND_EXIT_NONZERO",
            "commandId": "offline-install",
            "reason": "V3_PODMAN_GATE_FAILED: offline-install",
            "stage": "offline-install",
        })
        self.assertEqual(retained_command["argv"], ["pnpm", "install", "--offline", "--frozen-lockfile"])
        self.assertFalse(retained_command["network"])
        self.assertEqual(retained_command["exitCode"], 137)
        self.assertEqual(retained_command["stdout"], _reference(PODMAN_ATTEMPT_STDOUT))
        self.assertEqual(retained_command["stderr"], _reference(PODMAN_ATTEMPT_STDERR))
        retained_stdout = PODMAN_ATTEMPT_STDOUT.read_text(encoding="utf-8")
        retained_stderr = PODMAN_ATTEMPT_STDERR.read_text(encoding="utf-8")
        self.assertTrue(retained_stdout.startswith("Scope: all 40 workspace projects\n? Verifying lockfile against supply-chain policies (2231 entries)...\n"))
        self.assertEqual(retained_stdout.count("EAI_AGAIN"), 6708)
        self.assertEqual(retained_stderr, "")
        self.assertNotIn("externalStop", retained_attempt["failure"])
        self.assertNotIn("packageManagerDiagnostic", retained_attempt["failure"])

        frozen_entries = _load_json(V2_ARCHIVE, self)["entries"]
        frozen_lockfile = next(
            {key: entry[key] for key in ("path", "sha256", "size")}
            for entry in frozen_entries
            if entry["path"] == "pnpm-lock.yaml"
        )
        frozen_workspace_config = next(
            {key: entry[key] for key in ("path", "sha256", "size")}
            for entry in frozen_entries
            if entry["path"] == "pnpm-workspace.yaml"
        )

        podman = importlib.import_module("measure.business_operations_graph_baseline_execution_closure_v3_podman")
        build_contract = getattr(podman, "build_hermetic_pnpm_install_contract_v1", None)
        validate_contract = getattr(podman, "validate_hermetic_pnpm_install_contract_v1", None)
        classify_outcome = getattr(podman, "classify_hermetic_pnpm_install_outcome_v1", None)
        error_type = getattr(importlib.import_module(HELPER_MODULE), "ExecutionClosureValidationError", None)
        self.assertTrue(callable(build_contract), "V3_HERMETIC_PNPM_CONTRACT_BUILDER_MISSING")
        self.assertTrue(callable(validate_contract), "V3_HERMETIC_PNPM_CONTRACT_VALIDATOR_MISSING")
        self.assertTrue(callable(classify_outcome), "V3_HERMETIC_PNPM_OUTCOME_CLASSIFIER_MISSING")
        self.assertTrue(isinstance(error_type, type) and issubclass(error_type, Exception))

        contract = build_contract(frozen_entries, "11.8.0")
        self.assertEqual(
            contract,
            {
                "schemaVersion": 1,
                "kind": "hermetic-pnpm-install-contract",
                "strategy": "TRUST_HASH_BOUND_FROZEN_LOCKFILE",
                "logicalArgv": HERMETIC_PNPM_INSTALL,
                "payloadSuffix": HERMETIC_PNPM_PAYLOAD_SUFFIX,
                "network": {
                    "mode": "none",
                    "registryRequestsMaximum": 0,
                    "retryEventsMaximum": 0,
                },
                "trustLockfile": {
                    "documentedControl": "--trust-lockfile",
                    "documentedEffect": "SKIP_REAPPLY_LOCKFILE_SUPPLY_CHAIN_POLICY",
                    "justification": "HASH_BOUND_TRUSTED_FROZEN_LOCKFILE",
                    "lockfile": frozen_lockfile,
                    "workspaceConfig": frozen_workspace_config,
                    "pnpmVersion": "11.8.0",
                },
            },
        )
        validate_contract(contract, frozen_entries)
        bad_contract = copy.deepcopy(contract)
        bad_contract["trustLockfile"]["lockfile"]["sha256"] = "0" * 64
        with self.assertRaises(error_type):
            validate_contract(bad_contract, frozen_entries)
        bad_contract = copy.deepcopy(contract)
        bad_contract["logicalArgv"].remove("--trust-lockfile")
        with self.assertRaises(error_type):
            validate_contract(bad_contract, frozen_entries)

        external_stop = {
            "kind": "EXTERNAL_SUPERVISOR_STOP",
            "signal": "SIGKILL",
            "actor": "operator",
            "reason": "EXPLICIT_TIME_BOUND",
        }
        interrupted = copy.deepcopy(retained_command)
        interrupted["exitCode"] = 137
        interruption = classify_outcome(
            interrupted,
            stdout="",
            stderr="",
            contract=contract,
            external_stop=external_stop,
        )
        self.assertEqual(
            interruption,
            {
                "classification": "EXTERNAL_INTERRUPTION",
                "commandId": "offline-install",
                "exitCode": 137,
                "packageManagerDiagnostic": None,
                "externalStop": external_stop,
                "registryAttestation": {"requests": 0, "retryEvents": 0},
            },
        )

        package_manager_failure = copy.deepcopy(retained_command)
        package_manager_failure["exitCode"] = 1
        package_failure = classify_outcome(
            package_manager_failure,
            stdout="",
            stderr="ERR_PNPM_NO_OFFLINE_META Missing metadata in offline store\n",
            contract=contract,
            external_stop=None,
        )
        self.assertEqual(
            package_failure,
            {
                "classification": "PACKAGE_MANAGER_FAILURE",
                "commandId": "offline-install",
                "exitCode": 1,
                "packageManagerDiagnostic": {"code": "ERR_PNPM_NO_OFFLINE_META", "stream": "stderr"},
                "externalStop": None,
                "registryAttestation": {"requests": 0, "retryEvents": 0},
            },
        )

        with self.assertRaises(error_type):
            classify_outcome(
                package_manager_failure,
                stdout="[WARN] GET https://registry.npmjs.org/example error (EAI_AGAIN). Will retry in 1 minute. 1 retries left.\n",
                stderr="",
                contract=contract,
                external_stop=None,
            )
        with self.assertRaises(error_type):
            classify_outcome(
                interrupted,
                stdout="",
                stderr="",
                contract=contract,
                external_stop=None,
            )

    def test_noninstall_pnpm_uses_config_store_override_and_pins_the_second_build_db_blocker(self) -> None:
        """Requires pnpm 11.8 config-scoped store binding without config mutation or inherited host state.

        @returns Nothing; assertions pin the rejected plain option and define the supported receipt shape.
        """
        self.assertTrue(PODMAN_CONFIG_STORE_ATTEMPT.is_file())
        self.assertFalse(PODMAN_CONFIG_STORE_ATTEMPT.is_symlink())
        self.assertEqual(_sha256(PODMAN_CONFIG_STORE_ATTEMPT.read_bytes()), PODMAN_CONFIG_STORE_ATTEMPT_SHA256)
        self.assertEqual(PODMAN_CONFIG_STORE_ATTEMPT.stat().st_size, PODMAN_CONFIG_STORE_ATTEMPT_SIZE)
        self.assertTrue(PODMAN_CONFIG_STORE_STDOUT.is_file())
        self.assertFalse(PODMAN_CONFIG_STORE_STDOUT.is_symlink())
        self.assertTrue(PODMAN_CONFIG_STORE_STDERR.is_file())
        self.assertFalse(PODMAN_CONFIG_STORE_STDERR.is_symlink())

        retained = _load_json(PODMAN_CONFIG_STORE_ATTEMPT, self)
        self.assertEqual(retained["status"], "BLOCKED")
        self.assertEqual(retained["attempt"], {
            "id": PODMAN_CONFIG_STORE_ATTEMPT_DIR.name,
            "sequence": 2,
            "namingRule": "r1-v3-podman-execution-attempt-YYYYMMDD-NNNN",
        })
        self.assertEqual(retained["failure"], {
            "classification": "COMMAND_EXIT_NONZERO",
            "commandId": "build-db",
            "reason": "V3_PODMAN_GATE_FAILED: build-db",
            "stage": "build-db",
        })
        command = retained["commands"][0]
        self.assertEqual(command["argv"], list(BUILDS[0]))
        self.assertFalse(command["network"])
        self.assertEqual(command["exitCode"], 1)
        self.assertEqual(command["stdout"], _reference(PODMAN_CONFIG_STORE_STDOUT))
        self.assertEqual(command["stderr"], _reference(PODMAN_CONFIG_STORE_STDERR))
        executor = command["actualExecutor"]
        self.assertEqual(executor["logicalArgv"], list(BUILDS[0]))
        self.assertEqual(executor["environment"], {"CI": "true"})
        self.assertEqual(executor["effectiveEnvironment"], {"CI": "true", "PATH": "/usr/local/bin:/usr/bin:/bin"})
        self.assertEqual(executor["inheritedEnv"], [])
        self.assertEqual(
            executor["payloadArgv"],
            [
                "/usr/local/bin/node",
                "/opt/pnpm/bin/pnpm.mjs",
                "--store-dir=/root/.local/share/pnpm/store/v11",
                "--filter",
                "@reading-advantage/db",
                "build",
            ],
        )
        self.assertEqual((PODMAN_CONFIG_STORE_STDOUT).read_text(encoding="utf-8"), "")
        self.assertEqual(
            PODMAN_CONFIG_STORE_STDERR.read_text(encoding="utf-8"),
            "[ERROR] Unknown option: 'store-dir'\n"
            "Did you mean 'stream'? Use \"--config.unknown=value\" to force an unknown option.\n"
            "For help, run: pnpm help run\n",
        )
        self.assertEqual(executor["argv"][:5], ["/usr/bin/podman", "run", "--rm", "--network", "none"])
        image_index = executor["argv"].index("node:22-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3")
        self.assertEqual(
            executor["argv"][image_index:],
            [
                "node:22-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3",
                "/usr/bin/env",
                "-i",
                "CI=true",
                "PATH=/usr/local/bin:/usr/bin:/bin",
                *executor["payloadArgv"],
            ],
        )

        podman = importlib.import_module("measure.business_operations_graph_baseline_execution_closure_v3_podman")
        build_payload = getattr(podman, "build_pnpm_global_store_payload_v1", None)
        error_type = getattr(importlib.import_module(HELPER_MODULE), "ExecutionClosureValidationError", None)
        self.assertTrue(callable(build_payload), "V3_PNPM_CONFIG_STORE_PAYLOAD_BUILDER_MISSING")
        self.assertTrue(isinstance(error_type, type) and issubclass(error_type, Exception))
        scoped_commands = [*BUILDS, STANDARD_PACK_GENERATOR, *[argv for _, argv in FR4]]
        for logical in scoped_commands:
            original_logical = list(logical)
            payload = build_payload(logical)
            self.assertEqual(logical, original_logical)
            self.assertEqual(
                payload,
                [
                    "/usr/local/bin/node",
                    "/opt/pnpm/bin/pnpm.mjs",
                    "--config.store-dir=/root/.local/share/pnpm/store/v11",
                    *logical[1:],
                ],
            )
            self.assertNotIn("--store-dir=/root/.local/share/pnpm/store/v11", payload)
            self.assertEqual(payload[2], "--config.store-dir=/root/.local/share/pnpm/store/v11")
            self.assertLess(payload.index("--config.store-dir=/root/.local/share/pnpm/store/v11"), payload.index("--filter"))
        self.assertEqual(HERMETIC_PNPM_PAYLOAD_SUFFIX[-1], "--store-dir=/root/.local/share/pnpm/store/v11")
        self.assertEqual(_sha256(PODMAN_BUILD_DB_ATTEMPT.read_bytes()), PODMAN_BUILD_DB_ATTEMPT_SHA256)
        self.assertEqual(_sha256(PODMAN_CONFIG_STORE_ATTEMPT.read_bytes()), PODMAN_CONFIG_STORE_ATTEMPT_SHA256)
        self.assertFalse(V3_DIR.exists())

    def test_noninstall_pnpm_executor_validator_rejects_payload_environment_and_executor_drift(self) -> None:
        """Requires one reusable validator for config-scoped non-install pnpm execution receipts.

        @returns Nothing; assertions use synthetic receipt copies and never create a candidate or attempt.
        """
        self.assertEqual(_sha256(PODMAN_CONFIG_STORE_ATTEMPT.read_bytes()), PODMAN_CONFIG_STORE_ATTEMPT_SHA256)
        retained = _load_json(PODMAN_CONFIG_STORE_ATTEMPT, self)
        template = copy.deepcopy(retained["commands"][0])
        podman = importlib.import_module("measure.business_operations_graph_baseline_execution_closure_v3_podman")
        validator = getattr(podman, "validate_noninstall_pnpm_executor_v1", None)
        error_type = getattr(importlib.import_module(HELPER_MODULE), "ExecutionClosureValidationError", None)
        self.assertTrue(callable(validator), "V3_PNPM_NONINSTALL_EXECUTOR_VALIDATOR_MISSING")
        self.assertTrue(isinstance(error_type, type) and issubclass(error_type, Exception))

        def corrected_command(logical: list[str]) -> dict[str, Any]:
            command = copy.deepcopy(template)
            command["argv"] = list(logical)
            executor = command["actualExecutor"]
            payload = [
                "/usr/local/bin/node",
                "/opt/pnpm/bin/pnpm.mjs",
                "--config.store-dir=/root/.local/share/pnpm/store/v11",
                *logical[1:],
            ]
            image_index = executor["argv"].index(podman.IMAGE_RESOLVED)
            executor["logicalArgv"] = list(logical)
            executor["environment"] = {"CI": "true"}
            executor["effectiveEnvironment"] = {"CI": "true", "PATH": "/usr/local/bin:/usr/bin:/bin"}
            executor["inheritedEnv"] = []
            executor["payloadArgv"] = payload
            executor["argv"] = [
                *executor["argv"][:image_index],
                podman.IMAGE_RESOLVED,
                "/usr/bin/env",
                "-i",
                "CI=true",
                "PATH=/usr/local/bin:/usr/bin:/bin",
                *payload,
            ]
            return command

        command = corrected_command(list(BUILDS[0]))
        validator(command)
        for logical in [*BUILDS, STANDARD_PACK_GENERATOR, *[argv for _, argv in FR4]]:
            validator(corrected_command(logical))

        bad = corrected_command(list(BUILDS[0]))
        bad["actualExecutor"]["payloadArgv"][2] = "--store-dir=/root/.local/share/pnpm/store/v11"
        with self.assertRaises(error_type):
            validator(bad)

        bad = corrected_command(list(BUILDS[0]))
        payload = bad["actualExecutor"]["payloadArgv"]
        config_store = payload.pop(2)
        payload.insert(payload.index("--filter") + 2, config_store)
        image_index = bad["actualExecutor"]["argv"].index(podman.IMAGE_RESOLVED)
        bad["actualExecutor"]["argv"] = [
            *bad["actualExecutor"]["argv"][:image_index],
            podman.IMAGE_RESOLVED,
            "/usr/bin/env",
            "-i",
            "CI=true",
            "PATH=/usr/local/bin:/usr/bin:/bin",
            *payload,
        ]
        with self.assertRaises(error_type):
            validator(bad)

        bad = corrected_command(list(BUILDS[0]))
        bad["actualExecutor"]["effectiveEnvironment"]["NPM_CONFIG_STORE_DIR"] = "/root/.local/share/pnpm/store/v11"
        with self.assertRaises(error_type):
            validator(bad)

        bad = corrected_command(list(BUILDS[0]))
        bad["actualExecutor"]["argv"][4] = "host"
        with self.assertRaises(error_type):
            validator(bad)

        self.assertEqual(_sha256(PODMAN_CONFIG_STORE_ATTEMPT.read_bytes()), PODMAN_CONFIG_STORE_ATTEMPT_SHA256)
        self.assertFalse(V3_DIR.exists())

    def test_nested_pnpm_runtime_shim_pins_attempt_0003_and_requires_hash_bound_receipt_provenance(self) -> None:
        """Requires the nested package-script pnpm shim to be exact, isolated, and validator-enforced.

        @returns Nothing; assertions retain the failed attempt and define a future candidate-only runtime contract.
        """
        self.assertTrue(PODMAN_NESTED_PNPM_ATTEMPT.is_file())
        self.assertFalse(PODMAN_NESTED_PNPM_ATTEMPT.is_symlink())
        self.assertEqual(_sha256(PODMAN_NESTED_PNPM_ATTEMPT.read_bytes()), PODMAN_NESTED_PNPM_ATTEMPT_SHA256)
        self.assertEqual(PODMAN_NESTED_PNPM_ATTEMPT.stat().st_size, PODMAN_NESTED_PNPM_ATTEMPT_SIZE)
        self.assertTrue(PODMAN_NESTED_PNPM_STDOUT.is_file())
        self.assertFalse(PODMAN_NESTED_PNPM_STDOUT.is_symlink())
        self.assertTrue(PODMAN_NESTED_PNPM_STDERR.is_file())
        self.assertFalse(PODMAN_NESTED_PNPM_STDERR.is_symlink())

        retained = _load_json(PODMAN_NESTED_PNPM_ATTEMPT, self)
        self.assertEqual(retained["status"], "BLOCKED")
        self.assertEqual(retained["attempt"], {
            "id": PODMAN_NESTED_PNPM_ATTEMPT_DIR.name,
            "sequence": 3,
            "namingRule": "r1-v3-podman-execution-attempt-YYYYMMDD-NNNN",
        })
        self.assertEqual(retained["failure"], {
            "classification": "COMMAND_EXIT_NONZERO",
            "commandId": "generate-standard-pack-catalog",
            "reason": "V3_PODMAN_GATE_FAILED: generate-standard-pack-catalog",
            "stage": "generate-standard-pack-catalog",
        })
        command = retained["commands"][0]
        self.assertEqual(command["argv"], STANDARD_PACK_GENERATOR)
        self.assertFalse(command["network"])
        self.assertEqual(command["exitCode"], 1)
        self.assertEqual(command["stdout"], _reference(PODMAN_NESTED_PNPM_STDOUT))
        self.assertEqual(command["stderr"], _reference(PODMAN_NESTED_PNPM_STDERR))
        self.assertEqual(
            command["actualExecutor"]["payloadArgv"],
            [
                "/usr/local/bin/node",
                "/opt/pnpm/bin/pnpm.mjs",
                "--config.store-dir=/root/.local/share/pnpm/store/v11",
                "--filter",
                "@reading-advantage/advantage-play-kit",
                "generate:standard-pack-catalog",
            ],
        )
        self.assertEqual(
            PODMAN_NESTED_PNPM_STDOUT.read_text(encoding="utf-8"),
            "/work/packages/advantage-play-kit:\n"
            "[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @reading-advantage/advantage-play-kit@0.1.0 generate:standard-pack-catalog: `pnpm build && node scripts/generate-standard-pack-release.mjs`\n"
            "spawn ENOENT\n",
        )
        self.assertEqual(
            PODMAN_NESTED_PNPM_STDERR.read_text(encoding="utf-8"),
            "$ pnpm build && node scripts/generate-standard-pack-release.mjs\n"
            "sh: 1: pnpm: not found\n",
        )

        podman = importlib.import_module("measure.business_operations_graph_baseline_execution_closure_v3_podman")
        build_contract = getattr(podman, "build_nested_pnpm_runtime_shim_contract_v1", None)
        validate_contract = getattr(podman, "validate_nested_pnpm_runtime_shim_contract_v1", None)
        error_type = getattr(importlib.import_module(HELPER_MODULE), "ExecutionClosureValidationError", None)
        self.assertTrue(callable(build_contract), "V3_NESTED_PNPM_SHIM_CONTRACT_BUILDER_MISSING")
        self.assertTrue(callable(validate_contract), "V3_NESTED_PNPM_SHIM_CONTRACT_VALIDATOR_MISSING")
        self.assertTrue(isinstance(error_type, type) and issubclass(error_type, Exception))
        expected = {
            "schemaVersion": 1,
            "kind": "nested-pnpm-runtime-shim",
            "mount": {
                "id": "runnerTool:nested-pnpm-shim",
                "target": "/usr/local/bin/pnpm",
                "access": "ro",
                "purpose": "hash-bound-nested-pnpm-shim",
            },
            "artifact": {
                "path": "/usr/local/bin/pnpm",
                "mode": "100755",
                "sha256": "34b0b65d66551669ed031bf3c7f8a6f2808107b25a91fcbd3a8deee39b6631f9",
                "size": 63,
            },
            "launcher": {
                "node": "/usr/local/bin/node",
                "pnpmLauncher": "/opt/pnpm/bin/pnpm.mjs",
            },
        }
        self.assertEqual(build_contract(), expected)
        validate_contract(expected)
        with tempfile.TemporaryDirectory(prefix="nested-pnpm-shim-contract-") as temporary:
            stage = Path(temporary)
            archive = stage / "archive.json"
            archive.write_text("{}", encoding="utf-8")
            mounts = podman._runner_scripts(stage, archive, expected)
            shim = stage / "runner" / "nested-pnpm-shim"
            self.assertTrue(shim.is_file())
            self.assertFalse(shim.is_symlink())
            self.assertEqual(shim.read_bytes(), b'#!/bin/sh\nexec /usr/local/bin/node /opt/pnpm/bin/pnpm.mjs "$@"\n')
            self.assertEqual(f"100{shim.stat().st_mode & 0o777:03o}", expected["artifact"]["mode"])
            self.assertEqual(_sha256(shim.read_bytes()), expected["artifact"]["sha256"])
            self.assertEqual(
                next(mount for mount in mounts if mount["id"] == expected["mount"]["id"]),
                {**expected["mount"], "source": str(shim.resolve())},
            )
        self.assertEqual(expected["mount"]["target"], expected["artifact"]["path"])
        self.assertNotIn("source", expected["mount"], "the candidate must not bind a host-specific temporary source path")
        self.assertNotIn("PATH", expected, "the shim must resolve through the pre-existing clean env -i PATH")

        for field, value in (("mode", "100644"), ("sha256", "0" * 64), ("size", 62)):
            bad = copy.deepcopy(expected)
            bad["artifact"][field] = value
            with self.assertRaises(error_type):
                validate_contract(bad)
        for field, value in (("target", "/work/.runner-bin/pnpm"), ("access", "rw"), ("purpose", "host-pnpm")):
            bad = copy.deepcopy(expected)
            bad["mount"][field] = value
            with self.assertRaises(error_type):
                validate_contract(bad)
        for field, value in (("node", "/usr/bin/node"), ("pnpmLauncher", "/opt/pnpm/bin/pnpm.cjs")):
            bad = copy.deepcopy(expected)
            bad["launcher"][field] = value
            with self.assertRaises(error_type):
                validate_contract(bad)

        self.assertIn(
            "validate_nested_pnpm_runtime_shim_contract_v1(",
            inspect.getsource(podman._validate_profile_and_receipt),
            "the candidate profile/receipt validator must enforce the shim contract rather than merely expose it",
        )
        profile_receipt_validator_source = inspect.getsource(podman._validate_profile_and_receipt)
        self.assertIn('profile.get("nestedPnpmRuntime")', profile_receipt_validator_source)
        self.assertIn('receipt.get("nestedPnpmRuntime")', profile_receipt_validator_source)
        container_validator_source = inspect.getsource(podman._validate_container)
        self.assertIn("validate_nested_pnpm_runtime_shim_contract_v1(nested_pnpm_runtime)", container_validator_source)
        self.assertLess(container_validator_source.index("validate_nested_pnpm_runtime_shim_contract_v1(nested_pnpm_runtime)"), container_validator_source.index('nested_pnpm_runtime["mount"]'))
        self.assertEqual(_sha256(PODMAN_NESTED_PNPM_ATTEMPT.read_bytes()), PODMAN_NESTED_PNPM_ATTEMPT_SHA256)
        self.assertFalse(V3_DIR.exists())

    def test_workspace_build_dag_contract_derives_frozen_prerequisites_before_apk_generation(self) -> None:
        """Requires closure-only workspace build prerequisites to come from frozen package evidence.

        @returns Nothing; assertions pin attempt 0004 and define the generic metadata, link, and failure contract.
        """
        self.assertTrue(PODMAN_WORKSPACE_DAG_ATTEMPT.is_file())
        self.assertFalse(PODMAN_WORKSPACE_DAG_ATTEMPT.is_symlink())
        self.assertEqual(_sha256(PODMAN_WORKSPACE_DAG_ATTEMPT.read_bytes()), PODMAN_WORKSPACE_DAG_ATTEMPT_SHA256)
        self.assertEqual(PODMAN_WORKSPACE_DAG_ATTEMPT.stat().st_size, PODMAN_WORKSPACE_DAG_ATTEMPT_SIZE)
        self.assertTrue(PODMAN_WORKSPACE_DAG_STDOUT.is_file())
        self.assertFalse(PODMAN_WORKSPACE_DAG_STDOUT.is_symlink())
        self.assertTrue(PODMAN_WORKSPACE_DAG_STDERR.is_file())
        self.assertFalse(PODMAN_WORKSPACE_DAG_STDERR.is_symlink())
        retained = _load_json(PODMAN_WORKSPACE_DAG_ATTEMPT, self)
        self.assertEqual(retained["status"], "BLOCKED")
        self.assertEqual(retained["attempt"], {
            "id": PODMAN_WORKSPACE_DAG_ATTEMPT_DIR.name,
            "sequence": 4,
            "namingRule": "r1-v3-podman-execution-attempt-YYYYMMDD-NNNN",
        })
        self.assertEqual(retained["failure"], {
            "classification": "COMMAND_EXIT_NONZERO",
            "commandId": "generate-standard-pack-catalog",
            "reason": "V3_PODMAN_GATE_FAILED: generate-standard-pack-catalog",
            "stage": "generate-standard-pack-catalog",
        })
        command = retained["commands"][0]
        self.assertEqual(command["argv"], STANDARD_PACK_GENERATOR)
        self.assertEqual(command["exitCode"], 2)
        self.assertFalse(command["network"])
        self.assertEqual(command["stdout"], _reference(PODMAN_WORKSPACE_DAG_STDOUT))
        self.assertEqual(command["stderr"], _reference(PODMAN_WORKSPACE_DAG_STDERR))
        self.assertEqual(command["actualExecutor"]["environment"], {"CI": "true"})
        self.assertEqual(command["actualExecutor"]["effectiveEnvironment"], {"CI": "true", "PATH": "/usr/local/bin:/usr/bin:/bin"})
        self.assertEqual(command["actualExecutor"]["inheritedEnv"], [])
        self.assertEqual(command["actualExecutor"]["logicalArgv"], STANDARD_PACK_GENERATOR)
        self.assertEqual(
            command["actualExecutor"]["payloadArgv"],
            [
                "/usr/local/bin/node",
                "/opt/pnpm/bin/pnpm.mjs",
                "--config.store-dir=/root/.local/share/pnpm/store/v11",
                "--filter",
                "@reading-advantage/advantage-play-kit",
                "generate:standard-pack-catalog",
            ],
        )
        stdout = PODMAN_WORKSPACE_DAG_STDOUT.read_text(encoding="utf-8")
        stderr = PODMAN_WORKSPACE_DAG_STDERR.read_text(encoding="utf-8")
        self.assertEqual(stderr, "$ pnpm build && node scripts/generate-standard-pack-release.mjs\n$ tsc\n")
        self.assertEqual(stdout.count("Cannot find module '@reading-advantage/game-contracts'"), 4)
        self.assertIn("[ELIFECYCLE] Command failed with exit code 2.", stdout)
        self.assertIn("[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL]", stdout)

        archive = _load_json(V2_ARCHIVE, self)
        frozen_entries = copy.deepcopy(archive["entries"])
        podman = importlib.import_module("measure.business_operations_graph_baseline_execution_closure_v3_podman")
        build_contract = getattr(podman, "build_workspace_prerequisite_build_dag_contract_v1", None)
        validate_contract = getattr(podman, "validate_workspace_prerequisite_build_dag_contract_v1", None)
        validate_resolution = getattr(podman, "validate_installed_workspace_build_resolution_v1", None)
        classify_failure = getattr(podman, "classify_workspace_build_dependency_failure_v1", None)
        error_type = getattr(importlib.import_module(HELPER_MODULE), "ExecutionClosureValidationError", None)
        self.assertTrue(callable(build_contract), "V3_WORKSPACE_BUILD_DAG_CONTRACT_BUILDER_MISSING")
        self.assertTrue(callable(validate_contract), "V3_WORKSPACE_BUILD_DAG_CONTRACT_VALIDATOR_MISSING")
        self.assertTrue(callable(validate_resolution), "V3_WORKSPACE_BUILD_DAG_RESOLUTION_VALIDATOR_MISSING")
        self.assertTrue(callable(classify_failure), "V3_WORKSPACE_BUILD_DAG_FAILURE_CLASSIFIER_MISSING")
        self.assertTrue(isinstance(error_type, type) and issubclass(error_type, Exception))

        def reference(entries: list[dict[str, Any]], path: str) -> dict[str, Any]:
            entry = next(item for item in entries if item.get("path") == path)
            return {key: entry[key] for key in ("path", "sha256", "size")}

        def mutate_text(entries: list[dict[str, Any]], path: str, transform: Callable[[str], str]) -> None:
            entry = next(item for item in entries if item.get("path") == path)
            original = base64.b64decode(entry["contentBase64"]).decode("utf-8")
            updated = transform(original)
            self.assertNotEqual(updated, original, f"mutation must change {path}")
            data = updated.encode("utf-8")
            entry["contentBase64"] = base64.b64encode(data).decode("ascii")
            entry["sha256"] = _sha256(data)
            entry["size"] = len(data)

        contract = build_contract(frozen_entries, STANDARD_PACK_GENERATOR)
        validate_contract(contract, frozen_entries)
        self.assertEqual(contract["schemaVersion"], 1)
        self.assertEqual(contract["kind"], "workspace-prerequisite-build-dag")
        self.assertEqual(contract["trigger"], {
            "logicalArgv": STANDARD_PACK_GENERATOR,
            "package": "@reading-advantage/advantage-play-kit",
            "manifest": reference(frozen_entries, "packages/advantage-play-kit/package.json"),
        })
        self.assertEqual(contract["topologicalBuilds"], [{
            "package": "@reading-advantage/game-contracts",
            "logicalArgv": ["pnpm", "--filter", "@reading-advantage/game-contracts", "build"],
        }])
        self.assertEqual(contract["topologicalOrder"], ["@reading-advantage/game-contracts"])
        dependency = contract["dependencies"][0]
        self.assertEqual(dependency["consumer"], "@reading-advantage/advantage-play-kit")
        self.assertEqual(dependency["provider"], "@reading-advantage/game-contracts")
        self.assertEqual(dependency["declaredDependency"], {"field": "dependencies", "specifier": "workspace:*"})
        self.assertEqual(
            [site["path"] for site in dependency["importSites"]],
            [
                "packages/advantage-play-kit/src/react/apk-game-host.tsx",
                "packages/advantage-play-kit/src/runtime/runtime.ts",
                "packages/advantage-play-kit/src/runtime/types.ts",
                "packages/advantage-play-kit/src/scaffolding/exemplar.ts",
            ],
        )
        self.assertEqual(
            [{key: site[key] for key in ("path", "sha256", "size")} for site in dependency["importSites"]],
            [
                reference(frozen_entries, "packages/advantage-play-kit/src/react/apk-game-host.tsx"),
                reference(frozen_entries, "packages/advantage-play-kit/src/runtime/runtime.ts"),
                reference(frozen_entries, "packages/advantage-play-kit/src/runtime/types.ts"),
                reference(frozen_entries, "packages/advantage-play-kit/src/scaffolding/exemplar.ts"),
            ],
        )
        self.assertEqual(dependency["installedLink"], {
            "path": "packages/advantage-play-kit/node_modules/@reading-advantage/game-contracts",
            "kind": "symlink",
            "target": "../../../game-contracts",
            "realpath": "packages/game-contracts",
        })
        provider = contract["packages"]["@reading-advantage/game-contracts"]
        self.assertEqual(provider["manifest"], reference(frozen_entries, "packages/game-contracts/package.json"))
        self.assertEqual(provider["build"], {"field": "scripts.build", "value": "tsup src/index.ts --format esm --dts"})
        self.assertEqual(provider["types"], "./dist/index.d.ts")
        self.assertEqual(provider["exports"], {".": {"types": "./dist/index.d.ts", "import": "./dist/index.js"}})
        self.assertEqual(provider["tsconfig"], reference(frozen_entries, "packages/game-contracts/tsconfig.json"))
        self.assertEqual(provider["sourceInventory"], {
            "entryCount": 14,
            "sha256": "723621e228073af39088e2778f4e1c9646a7ddab03599c978bef34f912ba3f90",
        })
        resolution = dependency["installedResolution"]
        self.assertEqual(resolution["beforePrerequisiteBuild"], "MISSING_DECLARED_EXPORT_TARGETS")
        self.assertEqual(
            resolution["missingTargets"],
            ["packages/game-contracts/dist/index.d.ts", "packages/game-contracts/dist/index.js"],
        )
        validate_resolution(contract, [resolution])
        omission = classify_failure(contract, [resolution], command, stdout, stderr)
        self.assertEqual(omission, {
            "classification": "PREREQUISITE_BUILD_OMISSION",
            "reason": "V3_WORKSPACE_BUILD_DAG_PREREQUISITE_MISSING",
            "upstreamDefect": False,
            "nextAction": "RUN_DERIVED_PREREQUISITE_BUILDS",
        })
        upstream = classify_failure(
            contract,
            [resolution],
            {"id": "build-workspace-prerequisite", "argv": contract["topologicalBuilds"][0]["logicalArgv"], "exitCode": 1},
            "",
            "build failed",
        )
        self.assertEqual(upstream, {
            "classification": "UPSTREAM_PREREQUISITE_BUILD_FAILURE",
            "reason": "V3_WORKSPACE_BUILD_DAG_PREREQUISITE_FAILED",
            "upstreamDefect": True,
            "nextAction": "PRESERVE_BLOCKED_ATTEMPT",
        })

        for path, transform in (
            ("packages/game-contracts/src/index.ts", lambda text: text + "\n// frozen build input drift\n"),
            ("packages/game-contracts/package.json", lambda text: text.replace('\"types\": \"./dist/index.d.ts\"', '\"types\": \"./dist/changed.d.ts\"', 1)),
            ("packages/game-contracts/tsconfig.json", lambda text: text.replace('\"outDir\": \"./dist\"', '\"outDir\": \"./build\"', 1)),
        ):
            drifted = copy.deepcopy(frozen_entries)
            mutate_text(drifted, path, transform)
            with self.assertRaises(error_type):
                validate_contract(contract, drifted)

        no_build = copy.deepcopy(frozen_entries)
        mutate_text(no_build, "packages/game-contracts/package.json", lambda text: text.replace('\"build\": \"tsup src/index.ts --format esm --dts\",\n    ', "", 1))
        with self.assertRaises(error_type):
            build_contract(no_build, STANDARD_PACK_GENERATOR)

        unresolved = copy.deepcopy(frozen_entries)
        mutate_text(unresolved, "packages/advantage-play-kit/package.json", lambda text: text.replace('\"@reading-advantage/game-contracts\": \"workspace:*\"', '\"@reading-advantage/missing-contracts\": \"workspace:*\"', 1))
        for path in (
            "packages/advantage-play-kit/src/react/apk-game-host.tsx",
            "packages/advantage-play-kit/src/runtime/runtime.ts",
            "packages/advantage-play-kit/src/runtime/types.ts",
            "packages/advantage-play-kit/src/scaffolding/exemplar.ts",
        ):
            mutate_text(unresolved, path, lambda text: text.replace("@reading-advantage/game-contracts", "@reading-advantage/missing-contracts"))
        with self.assertRaises(error_type):
            build_contract(unresolved, STANDARD_PACK_GENERATOR)

        cyclic = copy.deepcopy(frozen_entries)
        mutate_text(cyclic, "packages/game-contracts/package.json", lambda text: text.replace('\"dependencies\": {\n    \"zod\": \"catalog:\"', '\"dependencies\": {\n    \"@reading-advantage/advantage-play-kit\": \"workspace:*\",\n    \"zod\": \"catalog:\"', 1))
        mutate_text(cyclic, "packages/game-contracts/src/index.ts", lambda text: text + '\nimport type {} from "@reading-advantage/advantage-play-kit";\n')
        with self.assertRaises(error_type):
            build_contract(cyclic, STANDARD_PACK_GENERATOR)

        renamed = copy.deepcopy(frozen_entries)
        mutate_text(renamed, "packages/game-contracts/package.json", lambda text: text.replace("@reading-advantage/game-contracts", "@reading-advantage/contracts-next", 1))
        mutate_text(renamed, "packages/advantage-play-kit/package.json", lambda text: text.replace("@reading-advantage/game-contracts", "@reading-advantage/contracts-next", 1))
        for path in (
            "packages/advantage-play-kit/src/react/apk-game-host.tsx",
            "packages/advantage-play-kit/src/runtime/runtime.ts",
            "packages/advantage-play-kit/src/runtime/types.ts",
            "packages/advantage-play-kit/src/scaffolding/exemplar.ts",
        ):
            mutate_text(renamed, path, lambda text: text.replace("@reading-advantage/game-contracts", "@reading-advantage/contracts-next"))
        renamed_contract = build_contract(renamed, STANDARD_PACK_GENERATOR)
        self.assertEqual(renamed_contract["topologicalBuilds"][0]["package"], "@reading-advantage/contracts-next")
        self.assertEqual(renamed_contract["dependencies"][0]["provider"], "@reading-advantage/contracts-next")
        self.assertEqual(_sha256(PODMAN_WORKSPACE_DAG_ATTEMPT.read_bytes()), PODMAN_WORKSPACE_DAG_ATTEMPT_SHA256)
        self.assertFalse(V3_DIR.exists())

    def test_direct_command_runtime_attempt_preserves_missing_script_blocker(self) -> None:
        """Pins immutable attempt 0005 evidence for the later full read-set acceptance gate.

        @returns Nothing; assertions preserve the exact missing-script failure without duplicating read-set APIs.
        """
        self.assertTrue(PODMAN_RUNTIME_ASSET_ATTEMPT.is_file())
        self.assertFalse(PODMAN_RUNTIME_ASSET_ATTEMPT.is_symlink())
        self.assertEqual(_sha256(PODMAN_RUNTIME_ASSET_ATTEMPT.read_bytes()), PODMAN_RUNTIME_ASSET_ATTEMPT_SHA256)
        self.assertEqual(PODMAN_RUNTIME_ASSET_ATTEMPT.stat().st_size, PODMAN_RUNTIME_ASSET_ATTEMPT_SIZE)
        self.assertTrue(PODMAN_RUNTIME_ASSET_STDOUT.is_file())
        self.assertFalse(PODMAN_RUNTIME_ASSET_STDOUT.is_symlink())
        self.assertTrue(PODMAN_RUNTIME_ASSET_STDERR.is_file())
        self.assertFalse(PODMAN_RUNTIME_ASSET_STDERR.is_symlink())
        retained = _load_json(PODMAN_RUNTIME_ASSET_ATTEMPT, self)
        self.assertEqual(retained["status"], "BLOCKED")
        self.assertEqual(retained["attempt"], {
            "id": PODMAN_RUNTIME_ASSET_ATTEMPT_DIR.name,
            "sequence": 5,
            "namingRule": "r1-v3-podman-execution-attempt-YYYYMMDD-NNNN",
        })
        self.assertEqual(retained["failure"], {
            "classification": "COMMAND_EXIT_NONZERO",
            "commandId": "generate-standard-pack-catalog",
            "reason": "V3_PODMAN_GATE_FAILED: generate-standard-pack-catalog",
            "stage": "generate-standard-pack-catalog",
        })
        command = retained["commands"][0]
        self.assertEqual(command["argv"], STANDARD_PACK_GENERATOR)
        self.assertEqual(command["exitCode"], 1)
        self.assertFalse(command["network"])
        self.assertEqual(command["stdout"], _reference(PODMAN_RUNTIME_ASSET_STDOUT))
        self.assertEqual(command["stderr"], _reference(PODMAN_RUNTIME_ASSET_STDERR))
        self.assertEqual(command["actualExecutor"]["environment"], {"CI": "true"})
        self.assertEqual(command["actualExecutor"]["effectiveEnvironment"], {"CI": "true", "PATH": "/usr/local/bin:/usr/bin:/bin"})
        self.assertEqual(command["actualExecutor"]["inheritedEnv"], [])
        self.assertEqual(command["actualExecutor"]["logicalArgv"], STANDARD_PACK_GENERATOR)
        self.assertEqual(command["actualExecutor"]["payloadArgv"], [
            "/usr/local/bin/node",
            "/opt/pnpm/bin/pnpm.mjs",
            "--config.store-dir=/root/.local/share/pnpm/store/v11",
            "--filter",
            "@reading-advantage/advantage-play-kit",
            "generate:standard-pack-catalog",
        ])
        self.assertEqual(PODMAN_RUNTIME_ASSET_STDOUT.read_text(encoding="utf-8"), (
            "/work/packages/advantage-play-kit:\n"
            "[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @reading-advantage/advantage-play-kit@0.1.0 generate:standard-pack-catalog: `pnpm build && node scripts/generate-standard-pack-release.mjs`\n"
            "Exit status 1\n"
        ))
        stderr = PODMAN_RUNTIME_ASSET_STDERR.read_text(encoding="utf-8")
        self.assertIn(f"Cannot find module '/work/{STANDARD_PACK_RUNTIME_ASSET}'", stderr)
        self.assertIn("code: 'MODULE_NOT_FOUND'", stderr)
        archive = _load_json(V2_ARCHIVE, self)
        self.assertEqual([entry for entry in archive["entries"] if entry.get("path") == STANDARD_PACK_RUNTIME_ASSET], [])
        baseline_script_bytes = Path(STANDARD_PACK_RUNTIME_ASSET).read_bytes()
        self.assertEqual(_sha256(baseline_script_bytes), "ea4e072430cdc26d6072950651b3b18fbc4a62bde8bfbd91d8a3dda6a35edbb6")
        self.assertEqual(len(baseline_script_bytes), 5081)
        self.assertFalse(V3_DIR.exists())


    def test_direct_command_runtime_read_set_discovery_binds_full_fixture_tree(self) -> None:
        """Requires finite baseline and derived runtime reads to be discovered before execution.

        @returns Nothing; assertions require generic fixture-tree capture, trace bijection, output exclusion, and quotas.
        """
        self.assertEqual(_sha256(PODMAN_RUNTIME_ASSET_ATTEMPT.read_bytes()), PODMAN_RUNTIME_ASSET_ATTEMPT_SHA256)
        self.assertEqual(PODMAN_RUNTIME_ASSET_ATTEMPT.stat().st_size, PODMAN_RUNTIME_ASSET_ATTEMPT_SIZE)
        podman = importlib.import_module("measure.business_operations_graph_baseline_execution_closure_v3_podman")
        discover = getattr(podman, "discover_direct_command_runtime_read_set_v1", None)
        build = getattr(podman, "build_direct_command_runtime_read_set_contract_v1", None)
        validate = getattr(podman, "validate_direct_command_runtime_read_set_contract_v1", None)
        validate_execution_trace = getattr(podman, "validate_direct_command_runtime_execution_trace_v1", None)
        error_type = getattr(importlib.import_module(HELPER_MODULE), "ExecutionClosureValidationError", None)
        self.assertTrue(callable(discover), "V3_DIRECT_RUNTIME_READ_SET_DISCOVERY_MISSING")
        self.assertTrue(callable(build), "V3_DIRECT_RUNTIME_READ_SET_CONTRACT_BUILDER_MISSING")
        self.assertTrue(callable(validate), "V3_DIRECT_RUNTIME_READ_SET_CONTRACT_VALIDATOR_MISSING")
        self.assertTrue(callable(validate_execution_trace), "V3_DIRECT_RUNTIME_EXECUTION_TRACE_VALIDATOR_MISSING")
        self.assertTrue(isinstance(error_type, type) and issubclass(error_type, Exception))

        baseline_commit = "0123456789abcdef0123456789abcdef01234567"
        fixture_root = "packages/fixture-runtime"
        fixture_manifest_path = f"{fixture_root}/package.json"
        fixture_script_path = f"{fixture_root}/scripts/generate-runtime.mjs"
        fixture_standard_root = f"{fixture_root}/assets/standard"
        fixture_output_path = f"{fixture_standard_root}/standard-pack-release.json"
        fixture_logical_argv = ["pnpm", "--filter", "@fixture/runtime", "fixture-build"]

        def asset(path: str, contents: bytes) -> dict[str, Any]:
            blob = b"blob " + str(len(contents)).encode("ascii") + b"\0" + contents
            return {
                "path": path,
                "baselineCommit": baseline_commit,
                "gitBlobSha1": hashlib.sha1(blob).hexdigest(),
                "sha256": _sha256(contents),
                "size": len(contents),
                "mode": "100644",
                "contentBase64": base64.b64encode(contents).decode("ascii"),
            }

        def baseline_identity(item: dict[str, Any]) -> dict[str, Any]:
            return {
                "path": item["path"],
                "sha256": item["sha256"],
                "size": item["size"],
                "mode": item["mode"],
                "origin": "BASELINE_GIT_BLOB",
                "baselineCommit": item["baselineCommit"],
                "gitBlobSha1": item["gitBlobSha1"],
                "inclusion": "MATERIALIZE_EXACT_BASELINE_BYTES",
            }

        manifest_contents = json.dumps({
            "name": "@fixture/runtime",
            "scripts": {"fixture-build": "pnpm build && node scripts/generate-runtime.mjs"},
        }, sort_keys=True, separators=(",", ":")).encode("utf-8")
        fixture_manifest = {
            "path": fixture_manifest_path,
            "sha256": _sha256(manifest_contents),
            "size": len(manifest_contents),
            "contentBase64": base64.b64encode(manifest_contents).decode("ascii"),
        }
        archive = _load_json(V2_ARCHIVE, self)
        fixture_frozen_entries = [
            copy.deepcopy(entry)
            for entry in archive["entries"]
            if entry.get("path") != "packages/advantage-play-kit/package.json"
        ]
        fixture_frozen_entries.append(fixture_manifest)
        script = asset(fixture_script_path, b'import "../dist/assets/index.js";\n')
        import_receipt = asset(f"{fixture_standard_root}/IMPORT-RECEIPT.tsv", b"destination\tsource\nart/sprite.png\tfixture\n")
        curated_receipt = asset(f"{fixture_standard_root}/CURATED-RECEIPT.tsv", b"destination\tsource\naudio/tone.ogg\tfixture\n")
        license_receipt = asset(f"{fixture_standard_root}/LICENSE-RECEIPT.tsv", b"destination\tsource\nfonts/body.woff2\tfixture\n")
        image = asset(f"{fixture_standard_root}/art/sprite.png", b"fixture-png")
        audio = asset(f"{fixture_standard_root}/audio/tone.ogg", b"fixture-ogg")
        font = asset(f"{fixture_standard_root}/fonts/body.woff2", b"fixture-font")
        stale_output = asset(fixture_output_path, b'{"stale":true}\n')
        ignored_readme = asset(f"{fixture_standard_root}/README.md", b"ignored documentation\n")
        ignored_license = asset(f"{fixture_standard_root}/LICENSE-ELVGAMES.txt", b"ignored license\n")
        ignored_catalog = asset(f"{fixture_standard_root}/accepted-standard-pack-release.json", b'{"accepted":true}\n')
        baseline_assets = [script, import_receipt, curated_receipt, license_receipt, image, audio, font, stale_output, ignored_readme, ignored_license, ignored_catalog]
        baseline_read_assets = [script, import_receipt, curated_receipt, license_receipt, image, audio, font]
        derived_read = {
            "path": f"{fixture_root}/dist/assets/index.js",
            "sha256": "d" * 64,
            "size": 287,
            "origin": "DERIVED_BUILD_OUTPUT",
            "producer": {
                "kind": "PACKAGE_SCRIPT_PREREQUISITE_BUILD",
                "scriptName": "fixture-build",
                "scriptSegment": "pnpm build",
                "receipt": {
                    "path": "fixture-build-receipt.json",
                    "sha256": "e" * 64,
                    "size": 211,
                },
            },
        }
        discovery = {
            "schemaVersion": 1,
            "kind": "direct-command-runtime-discovery",
            "baselineCommit": baseline_commit,
            "runner": "node",
            "script": baseline_identity(script),
            "root": fixture_standard_root,
            "directoryListings": [
                {"path": fixture_standard_root, "children": ["CURATED-RECEIPT.tsv", "IMPORT-RECEIPT.tsv", "LICENSE-ELVGAMES.txt", "LICENSE-RECEIPT.tsv", "README.md", "accepted-standard-pack-release.json", "art", "audio", "fonts", "standard-pack-release.json"]},
                {"path": f"{fixture_standard_root}/art", "children": ["sprite.png"]},
                {"path": f"{fixture_standard_root}/audio", "children": ["tone.ogg"]},
                {"path": f"{fixture_standard_root}/fonts", "children": ["body.woff2"]},
            ],
            "baselineReads": [{"path": item["path"], "access": "MODULE_LOAD" if item is script else "READ_FILE"} for item in baseline_read_assets],
            "derivedBuildReads": [derived_read],
            "writes": [{"path": fixture_output_path, "kind": "DERIVED_OUTPUT"}],
            "clearedStaleOutputs": [fixture_output_path],
        }
        full_quota = {
            "maxEntries": len(baseline_read_assets),
            "maxBytes": sum(item["size"] for item in baseline_read_assets),
        }
        resource_budget = {
            "schemaVersion": 1,
            "kind": "direct-command-runtime-asset-resource-budget",
            "frozenArchive": {
                "path": V2_ARCHIVE.relative_to(REPO_ROOT).as_posix(),
                "sha256": V2_EVIDENCE["archive"][1],
                "size": V2_EVIDENCE["archive"][2],
            },
            "sourceCeiling": {
                "path": "packages/advantage-play-kit/assets/standard",
                "regularFiles": 43138,
                "apparentBytes": 188324464,
                "allocatedBytes": 325713920,
            },
            "reservations": {
                "baselineGitMaterializationBytes": 325713920,
                "candidateCowBytes": 325713920,
                "archiveSupplementBytes": 325713920,
                "derivedOutputBytes": 24946348,
                "metadataBytes": 16777216,
                "minimumHeadroomBytes": 1073741824,
            },
            "requiredAvailableBytes": 2092607148,
            "availableBytes": 3364311040,
            "decision": "PASS",
        }

        read_set = discover(fixture_frozen_entries, fixture_logical_argv, baseline_assets, discovery, full_quota, resource_budget)
        expected_baseline_reads = sorted((baseline_identity(item) for item in baseline_read_assets), key=lambda item: item["path"])
        self.assertEqual(read_set, {
            "schemaVersion": 1,
            "kind": "direct-command-runtime-read-set",
            "trigger": {
                "logicalArgv": fixture_logical_argv,
                "package": "@fixture/runtime",
                "manifest": {key: fixture_manifest[key] for key in ("path", "sha256", "size")},
            },
            "baselineReadSet": expected_baseline_reads,
            "derivedBuildReadSet": [derived_read],
            "outputPaths": [fixture_output_path],
            "preflightQuota": {**full_quota, "observedEntries": 7, "observedBytes": full_quota["maxBytes"]},
            "resourceBudget": resource_budget,
            "discovery": {
                "kind": "BASELINE_GIT_INSTRUMENTED_TRACE",
                "script": baseline_identity(script),
                "root": fixture_standard_root,
                "directoryListingCount": 4,
            },
        })
        observed_baseline_paths = {item["path"] for item in read_set["baselineReadSet"]}
        self.assertNotIn(fixture_output_path, observed_baseline_paths)
        self.assertNotIn(ignored_readme["path"], observed_baseline_paths)
        self.assertNotIn(ignored_license["path"], observed_baseline_paths)
        self.assertNotIn(ignored_catalog["path"], observed_baseline_paths)
        for receipt in (import_receipt, curated_receipt, license_receipt):
            self.assertIn(receipt["path"], observed_baseline_paths)
        contract = build(read_set, resource_budget)
        validate(contract, read_set, fixture_frozen_entries, baseline_assets, discovery, full_quota, resource_budget)
        self.assertEqual(contract["schemaVersion"], 1)
        self.assertEqual(contract["kind"], "direct-command-runtime-read-set-inclusion")
        self.assertEqual(contract["baselineReadSet"], expected_baseline_reads)
        self.assertEqual(contract["derivedBuildReadSet"], [derived_read])
        self.assertEqual(contract["outputPaths"], [fixture_output_path])
        self.assertEqual(contract["runtimeTracePolicy"], {
            "baselineReads": "EXACT_BIJECTION_WITH_BASELINE_READ_SET",
            "derivedBuildReads": "EXACT_BIJECTION_WITH_RECEIPT_BOUND_DERIVED_READ_SET",
            "writes": "DECLARED_DERIVED_OUTPUTS_ONLY",
            "untracedWorkspaceAccess": "REJECT",
        })
        execution_trace = {
            "baselineReads": expected_baseline_reads,
            "derivedBuildReads": [derived_read],
            "writes": [{"path": fixture_output_path, "kind": "DERIVED_OUTPUT"}],
        }
        validate_execution_trace(contract, execution_trace)

        missing_receipt = copy.deepcopy(execution_trace)
        missing_receipt["baselineReads"] = [item for item in missing_receipt["baselineReads"] if item["path"] != import_receipt["path"]]
        with self.assertRaises(error_type):
            validate_execution_trace(contract, missing_receipt)
        output_as_input = copy.deepcopy(execution_trace)
        output_as_input["baselineReads"].append(baseline_identity(stale_output))
        with self.assertRaises(error_type):
            validate_execution_trace(contract, output_as_input)
        source_write = copy.deepcopy(execution_trace)
        source_write["writes"][0]["path"] = image["path"]
        with self.assertRaises(error_type):
            validate_execution_trace(contract, source_write)
        unbound_derived = copy.deepcopy(execution_trace)
        unbound_derived["derivedBuildReads"][0]["sha256"] = "0" * 64
        with self.assertRaises(error_type):
            validate_execution_trace(contract, unbound_derived)
        dynamic_added_assets = [*baseline_assets, asset(f"{fixture_standard_root}/art/bonus.png", b"bonus")]
        dynamic_added = copy.deepcopy(discovery)
        dynamic_added["directoryListings"][1]["children"].append("bonus.png")
        with self.assertRaises(error_type):
            discover(fixture_frozen_entries, fixture_logical_argv, dynamic_added_assets, dynamic_added, full_quota, resource_budget)
        dynamic_removed_assets = [item for item in baseline_assets if item["path"] != audio["path"]]
        with self.assertRaises(error_type):
            discover(fixture_frozen_entries, fixture_logical_argv, dynamic_removed_assets, discovery, full_quota, resource_budget)
        with self.assertRaises(error_type):
            discover(fixture_frozen_entries, fixture_logical_argv, baseline_assets, discovery, {**full_quota, "maxEntries": 6}, resource_budget)
        with self.assertRaises(error_type):
            discover(fixture_frozen_entries, fixture_logical_argv, baseline_assets, discovery, {**full_quota, "maxBytes": full_quota["maxBytes"] - 1}, resource_budget)
        insufficient_capacity = copy.deepcopy(resource_budget)
        insufficient_capacity["availableBytes"] = resource_budget["requiredAvailableBytes"] - 1
        insufficient_capacity["decision"] = "BLOCKED"
        with self.assertRaises(error_type):
            discover(fixture_frozen_entries, fixture_logical_argv, baseline_assets, discovery, full_quota, insufficient_capacity)
        self.assertFalse(V3_DIR.exists())


    def test_direct_runtime_read_set_is_wired_into_v3_runner_transaction(self) -> None:
        """Requires the pure runtime read set to drive one ordered, detached V3 runner transaction.

        @returns Nothing; assertions freeze integration seams and ordering without invoking Podman or publishing a candidate.
        """
        self.assertEqual(_sha256(PODMAN_RUNTIME_ASSET_ATTEMPT.read_bytes()), PODMAN_RUNTIME_ASSET_ATTEMPT_SHA256)
        self.assertFalse(V3_DIR.exists())
        podman = importlib.import_module("measure.business_operations_graph_baseline_execution_closure_v3_podman")
        capture_packet = getattr(podman, "capture_direct_command_runtime_baseline_git_packet_v1", None)
        build_integration = getattr(podman, "build_direct_command_runtime_runner_integration_v1", None)
        validate_integration = getattr(podman, "validate_direct_command_runtime_runner_integration_v1", None)
        parse_trace = getattr(podman, "parse_direct_command_runtime_trace_events_v1", None)
        error_type = getattr(importlib.import_module(HELPER_MODULE), "ExecutionClosureValidationError", None)
        self.assertTrue(callable(build_integration), "V3_DIRECT_RUNTIME_RUNNER_INTEGRATION_BUILDER_MISSING")
        self.assertTrue(callable(capture_packet), "V3_DIRECT_RUNTIME_BASELINE_GIT_PACKET_CAPTURE_MISSING")
        self.assertTrue(callable(validate_integration), "V3_DIRECT_RUNTIME_RUNNER_INTEGRATION_VALIDATOR_MISSING")
        self.assertTrue(callable(parse_trace), "V3_DIRECT_RUNTIME_TRACE_EVENT_PARSER_MISSING")
        self.assertTrue(isinstance(error_type, type) and issubclass(error_type, Exception))
        self.assertTrue(
            {"read_set", "source_packet", "attempt", "resource_budget"} <= set(inspect.signature(build_integration).parameters),
            "V3_DIRECT_RUNTIME_RUNNER_INTEGRATION_BUILDER_SIGNATURE_INVALID",
        )
        self.assertTrue(
            {"events", "integration"} <= set(inspect.signature(parse_trace).parameters),
            "V3_DIRECT_RUNTIME_TRACE_EVENT_PARSER_SIGNATURE_INVALID",
        )

        capture_source = inspect.getsource(capture_packet)
        self.assertIn("/usr/bin/git", capture_source)
        self.assertIn("cat-file", capture_source)
        self.assertNotIn("REPO_ROOT /", capture_source, "baseline runtime bytes must come from Git objects, never a live-worktree path")
        self.assertIn("baselineCommit", capture_source)
        self.assertIn("tree", capture_source)
        self.assertIn("gitBlobSha1", capture_source)
        self.assertIn("contentBase64", capture_source)

        runner_source = inspect.getsource(podman.write_execution_closure_v1)
        ordered_steps = [
            "capture_direct_command_runtime_baseline_git_packet_v1(",
            "build_direct_command_runtime_runner_integration_v1(",
            "direct-runtime-preflight",
            "archive = _build_archive(",
            "context = _podman_context(",
            "direct-runtime-discovery",
            "build-advantage-play-kit-for-runtime",
            "direct-runtime-dist-identity",
            "generation = _run_container(",
            'failure_reason = "direct-runtime-trace"',
            "receipt-direct-runtime-trace",
            "capture_direct_command_runtime_in_container_trace_v1(",
            "parse_direct_command_runtime_trace_events_v1(",
            "validate_direct_command_runtime_execution_trace_v1(",
        ]
        positions = [runner_source.index(step) for step in ordered_steps]
        self.assertEqual(positions, sorted(positions), "runtime integration must freeze/capacity-check before staging and trace after generation")
        self.assertIn("direct_runtime_integration=direct_runtime_integration", runner_source)
        self.assertIn("direct_runtime_stage=", runner_source)

        archive_source = inspect.getsource(podman._build_archive)
        self.assertIn("direct_runtime_integration", archive_source)
        self.assertIn("directRuntimeSourcePacket", archive_source)
        self.assertIn("baselineReadSet", archive_source)
        runner_scripts_source = inspect.getsource(podman._runner_scripts)
        self.assertIn("direct-runtime-source-packet", runner_scripts_source)
        self.assertIn('"target": "/runner/direct-runtime-source-packet.json"', runner_scripts_source)
        self.assertIn('"access": "ro"', runner_scripts_source)
        context_source = inspect.getsource(podman._podman_context)
        self.assertIn("direct_runtime_integration", context_source)
        self.assertIn("direct-runtime-source-packet", context_source)

        profile_receipt_validator_source = inspect.getsource(podman._validate_profile_and_receipt)
        self.assertIn('profile.get("directRuntimeIntegration")', profile_receipt_validator_source)
        self.assertIn('receipt.get("directRuntimeIntegration")', profile_receipt_validator_source)
        self.assertIn('receipt.get("directRuntimeTrace")', profile_receipt_validator_source)
        archive_validator_source = inspect.getsource(podman._validate_archive)
        self.assertIn("directRuntimeSourcePacket", archive_validator_source)
        integration_validator_source = inspect.getsource(validate_integration)
        self.assertIn("validate_direct_command_runtime_execution_trace_v1", integration_validator_source)
        self.assertIn("DERIVED_BUILD_OUTPUT", integration_validator_source)
        self.assertIn("NOT_RUN", integration_validator_source)
        trace_parser_source = inspect.getsource(parse_trace)
        self.assertIn("nonce", trace_parser_source)
        self.assertIn("maxEvents", trace_parser_source)
        self.assertIn("TRUNCATED", trace_parser_source)
        self.assertIn("DUPLICATE", trace_parser_source)

        publisher = getattr(podman, "_publish_failed_attempt", None)
        self.assertTrue(callable(publisher), "V3_DIRECT_RUNTIME_FAILED_ATTEMPT_PUBLISHER_MISSING")
        self.assertTrue(
            {"direct_runtime_integration", "direct_runtime_stage"} <= set(inspect.signature(publisher).parameters),
            "V3_DIRECT_RUNTIME_FAILED_ATTEMPT_PUBLISHER_SIGNATURE_INVALID",
        )
        publisher_source = inspect.getsource(publisher)
        self.assertIn('"directRuntimeIntegration"', publisher_source)
        self.assertIn('"laterStages"', publisher_source)
        self.assertIn('"NOT_RUN"', publisher_source)
        failed_attempt_validator_source = inspect.getsource(podman.validate_failed_execution_attempt_v1)
        self.assertIn("directRuntimeIntegration", failed_attempt_validator_source)
        self.assertIn("laterStages", failed_attempt_validator_source)
        self.assertFalse(V3_DIR.exists())

    def test_direct_runtime_packet_materialization_and_trace_are_in_container_evidence(self) -> None:
        """Requires detached source bytes and raw trace provenance to be produced inside the candidate container.

        @returns Nothing; assertions preserve the next R1 Red gate without running Podman or authorizing a candidate.
        """
        self.assertEqual(_sha256(PODMAN_RUNTIME_ASSET_ATTEMPT.read_bytes()), PODMAN_RUNTIME_ASSET_ATTEMPT_SHA256)
        self.assertFalse(V3_DIR.exists())
        podman = importlib.import_module("measure.business_operations_graph_baseline_execution_closure_v3_podman")
        build_materialization = getattr(podman, "build_direct_command_runtime_packet_materialization_contract_v1", None)
        validate_materialization = getattr(podman, "validate_direct_command_runtime_packet_materialization_contract_v1", None)
        capture_trace = getattr(podman, "capture_direct_command_runtime_in_container_trace_v1", None)
        error_type = getattr(importlib.import_module(HELPER_MODULE), "ExecutionClosureValidationError", None)
        self.assertTrue(callable(build_materialization), "V3_DIRECT_RUNTIME_PACKET_MATERIALIZATION_BUILDER_MISSING")
        self.assertTrue(callable(validate_materialization), "V3_DIRECT_RUNTIME_PACKET_MATERIALIZATION_VALIDATOR_MISSING")
        self.assertTrue(callable(capture_trace), "V3_DIRECT_RUNTIME_IN_CONTAINER_TRACE_CAPTURE_MISSING")
        self.assertTrue(isinstance(error_type, type) and issubclass(error_type, Exception))
        self.assertTrue(
            {"source_packet"} <= set(inspect.signature(build_materialization).parameters),
            "V3_DIRECT_RUNTIME_PACKET_MATERIALIZATION_BUILDER_SIGNATURE_INVALID",
        )
        self.assertTrue(
            {"contract"} <= set(inspect.signature(validate_materialization).parameters),
            "V3_DIRECT_RUNTIME_PACKET_MATERIALIZATION_VALIDATOR_SIGNATURE_INVALID",
        )
        self.assertTrue(
            {"raw_trace_receipt", "integration"} <= set(inspect.signature(capture_trace).parameters),
            "V3_DIRECT_RUNTIME_IN_CONTAINER_TRACE_CAPTURE_SIGNATURE_INVALID",
        )

        source_bytes = b"export const source = 'detached-packet';\n"
        baseline_commit = "a" * 40
        blob = b"blob " + str(len(source_bytes)).encode("ascii") + b"\0" + source_bytes
        baseline_identity = {
            "path": "packages/advantage-play-kit/scripts/generate-standard-pack-release.mjs",
            "baselineCommit": baseline_commit,
            "gitBlobSha1": hashlib.sha1(blob).hexdigest(),
            "sha256": _sha256(source_bytes),
            "size": len(source_bytes),
            "mode": "100644",
            "origin": "BASELINE_SOURCE",
        }
        source_packet = {
            "schemaVersion": 1,
            "kind": "direct-command-runtime-baseline-git-source-packet",
            "source": "GIT_OBJECT_DATABASE_ONLY",
            "baselineCommit": baseline_commit,
            "tree": {"gitTreeSha1": "b" * 40},
            "baselineReadSet": [baseline_identity],
            "objects": [{**baseline_identity, "contentBase64": base64.b64encode(source_bytes).decode("ascii")}],
        }
        source_packet["packetSha256"] = podman._direct_runtime_packet_digest_v1(source_packet)
        materialization = build_materialization(source_packet)
        self.assertEqual(materialization, {
            "schemaVersion": 1,
            "kind": "direct-command-runtime-detached-packet-materialization",
            "source": "DETACHED_GIT_OBJECT_PACKET_ONLY",
            "sourcePacketSha256": source_packet["packetSha256"],
            "targetRoot": "/work",
            "entries": [{key: baseline_identity[key] for key in ("path", "gitBlobSha1", "sha256", "size", "mode")}],
            "liveWorktreeFallback": "REJECT",
            "realProbePolicy": "IN_CONTAINER_HASH_MODE_EXACT",
        })
        validate_materialization(materialization)
        corrupted_materialization = copy.deepcopy(materialization)
        corrupted_materialization["entries"][0]["sha256"] = "0" * 64
        with self.assertRaises(error_type):
            validate_materialization(corrupted_materialization)

        runner_source = inspect.getsource(podman.write_execution_closure_v1)
        runner_signature = inspect.signature(podman.write_execution_closure_v1)
        self.assertNotIn("direct_runtime_trace_events", runner_signature.parameters, "caller-supplied trace data is not evidence of generator reads")
        ordered_runner_steps = [
            "receipt-materialize",
            "direct-runtime-materialization-probe",
            "offline-install",
            "generation = _run_container(",
            "DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS",
            "receipt-direct-runtime-trace",
            "capture_direct_command_runtime_in_container_trace_v1(",
        ]
        positions = [runner_source.index(step) for step in ordered_runner_steps]
        self.assertEqual(positions, sorted(positions), "the worktree probe and tracer must precede generation, and raw capture must follow it")
        self.assertNotIn("parse_direct_command_runtime_trace_events_v1(\n                direct_runtime_trace_events", runner_source)

        archive_source = inspect.getsource(podman._build_archive)
        archive_validator_source = inspect.getsource(podman._validate_archive)
        context_source = inspect.getsource(podman._podman_context)
        runner_scripts_source = inspect.getsource(podman._runner_scripts)
        profile_receipt_validator_source = inspect.getsource(podman._validate_profile_and_receipt)
        self.assertIn("directRuntimePacketMaterialization", archive_source)
        self.assertIn("directRuntimePacketMaterialization", archive_validator_source)
        self.assertIn("directRuntimePacketMaterialization", profile_receipt_validator_source)
        self.assertIn("direct-runtime-source-packet", context_source)
        self.assertIn('"access": "ro"', runner_scripts_source)
        self.assertIn("direct-runtime-materialization-probe.mjs", runner_scripts_source)
        self.assertIn("direct-runtime-tracer.mjs", runner_scripts_source)
        self.assertIn("direct-runtime-raw-events.jsonl", runner_scripts_source)
        self.assertIn("appendFileSync", runner_scripts_source)
        self.assertIn("sourcePacketPath", runner_scripts_source)
        self.assertIn("directRuntimeMaterialization", runner_scripts_source)
        self.assertIn("packetSha256", runner_scripts_source)
        self.assertIn("IN_CONTAINER_TRACER_RAW_ARTIFACT_ONLY", inspect.getsource(podman.build_direct_command_runtime_runner_integration_v1))
        self.assertIn("IN_CONTAINER_TRACER_RAW_ARTIFACT_ONLY", inspect.getsource(capture_trace))
        self.assertIn("rawEventArtifact", inspect.getsource(capture_trace))
        self.assertIn("nonce", inspect.getsource(capture_trace))
        self.assertIn("direct-runtime-tracer", inspect.getsource(capture_trace))

        nested_runtime = podman.build_nested_pnpm_runtime_shim_contract_v1()
        with tempfile.TemporaryDirectory() as temporary:
            stage = Path(temporary)
            archive_path = stage / "archive.json"
            work = stage / "work"
            packet_path = stage / "direct-runtime-source-packet.json"
            work.mkdir()
            archive = {
                "entries": [],
                "closureInventory": [],
                "directRuntimeSourcePacket": source_packet,
                "directRuntimeBaselineReadSet": [baseline_identity],
                "directRuntimePacketMaterialization": materialization,
            }
            archive_path.write_text(json.dumps(archive), encoding="utf-8")
            packet_path.write_text(json.dumps(source_packet), encoding="utf-8")
            podman._runner_scripts(stage, archive_path, nested_runtime)
            probe = subprocess.run(
                ["node", str(stage / "runner" / "materialize.mjs"), str(archive_path), str(packet_path), str(work)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(probe.returncode, 0, probe.stderr)
            materialized_path = work / baseline_identity["path"]
            self.assertTrue(materialized_path.is_file())
            self.assertFalse(materialized_path.is_symlink())
            self.assertEqual(materialized_path.read_bytes(), source_bytes)
            self.assertEqual(f"100{materialized_path.stat().st_mode & 0o777:03o}", baseline_identity["mode"])
            self.assertEqual(json.loads(probe.stdout), {
                "entryCount": 1,
                "inventory": [],
                "directRuntimeMaterialization": {
                    "sourcePacketSha256": source_packet["packetSha256"],
                    "entries": materialization["entries"],
                },
            })
        self.assertFalse(V3_DIR.exists())

    def test_direct_runtime_materialization_failures_preserve_exact_stage_receipts(self) -> None:
        """Requires each materialization failure to retain its exact runner stage and successors.

        @returns Nothing; assertions publish only temporary failed-attempt receipts and never run Podman or create a candidate.
        """
        self.assertFalse(V3_DIR.exists())
        podman = importlib.import_module("measure.business_operations_graph_baseline_execution_closure_v3_podman")
        build_integration = getattr(podman, "build_direct_command_runtime_runner_integration_v1", None)
        publisher = getattr(podman, "_publish_failed_attempt", None)
        validator = getattr(podman, "validate_failed_execution_attempt_v1", None)
        error_type = getattr(importlib.import_module(HELPER_MODULE), "ExecutionClosureValidationError", None)
        self.assertTrue(callable(build_integration), "V3_DIRECT_RUNTIME_RUNNER_INTEGRATION_BUILDER_MISSING")
        self.assertTrue(callable(publisher), "V3_DIRECT_RUNTIME_FAILED_ATTEMPT_PUBLISHER_MISSING")
        self.assertTrue(callable(validator), "V3_PODMAN_FAILED_ATTEMPT_VALIDATOR_MISSING")
        self.assertTrue(isinstance(error_type, type) and issubclass(error_type, Exception))

        expected_stage_plan = [
            "direct-runtime-preflight",
            "direct-runtime-discovery",
            "materialize",
            "direct-runtime-materialization-probe",
            "build-advantage-play-kit-for-runtime",
            "direct-runtime-dist-identity",
            "generate-standard-pack-catalog",
            "direct-runtime-trace",
        ]
        self.assertEqual(
            podman._DIRECT_RUNTIME_RUNNER_STAGES,
            tuple(expected_stage_plan),
            "V3_DIRECT_RUNTIME_MATERIALIZATION_STAGES_MISSING",
        )

        runner_source = inspect.getsource(podman.write_execution_closure_v1)
        ordered_failure_stage_handoffs = [
            'failure_reason = "materialize"\n            direct_runtime_stage = failure_reason\n            materialize = _run_container(',
            'failure_reason = "direct-runtime-materialization-probe"\n            direct_runtime_stage = failure_reason\n            direct_runtime_materialization_probe = _run_container(',
        ]
        positions = [runner_source.index(handoff) for handoff in ordered_failure_stage_handoffs]
        self.assertEqual(
            positions,
            sorted(positions),
            "V3_DIRECT_RUNTIME_MATERIALIZATION_STAGE_HANDOFF_ORDER_INVALID",
        )

        source_bytes = b"export const runtime = 'materialized';\n"
        blob = b"blob " + str(len(source_bytes)).encode("ascii") + b"\0" + source_bytes
        baseline_identity = {
            "path": "packages/fixture-runtime/scripts/generate-runtime.mjs",
            "sha256": _sha256(source_bytes),
            "size": len(source_bytes),
            "mode": "100644",
            "origin": "BASELINE_GIT_BLOB",
            "baselineCommit": "a" * 40,
            "gitBlobSha1": hashlib.sha1(blob).hexdigest(),
            "inclusion": "MATERIALIZE_EXACT_BASELINE_BYTES",
        }
        resource_budget = {
            "schemaVersion": 1,
            "kind": "direct-command-runtime-asset-resource-budget",
            "frozenArchive": _reference(V2_ARCHIVE),
            "sourceCeiling": {
                "path": "packages/fixture-runtime/assets/standard",
                "regularFiles": 1,
                "apparentBytes": len(source_bytes),
                "allocatedBytes": len(source_bytes),
            },
            "reservations": {
                "baselineGitMaterializationBytes": 1,
                "candidateCowBytes": 1,
                "archiveSupplementBytes": 1,
                "derivedOutputBytes": 1,
                "metadataBytes": 1,
                "minimumHeadroomBytes": 1,
            },
            "requiredAvailableBytes": 6,
            "availableBytes": 6,
            "decision": "PASS",
        }
        derived_read = {
            "path": "packages/fixture-runtime/dist/assets/index.js",
            "sha256": "b" * 64,
            "size": 1,
            "origin": "DERIVED_BUILD_OUTPUT",
            "producer": {
                "kind": "PACKAGE_SCRIPT_PREREQUISITE_BUILD",
                "scriptName": "fixture-build",
                "scriptSegment": "pnpm build",
                "receipt": {
                    "path": "fixture-build-receipt.json",
                    "sha256": "c" * 64,
                    "size": 1,
                },
            },
        }
        read_set = {
            "schemaVersion": 1,
            "kind": "direct-command-runtime-read-set",
            "trigger": {
                "logicalArgv": ["pnpm", "--filter", "@fixture/runtime", "fixture-build"],
                "package": "@fixture/runtime",
                "manifest": {
                    "path": "packages/fixture-runtime/package.json",
                    "sha256": "d" * 64,
                    "size": 1,
                },
            },
            "baselineReadSet": [baseline_identity],
            "derivedBuildReadSet": [derived_read],
            "outputPaths": ["packages/fixture-runtime/assets/standard/standard-pack-release.json"],
            "preflightQuota": {
                "maxEntries": 1,
                "maxBytes": len(source_bytes),
                "observedEntries": 1,
                "observedBytes": len(source_bytes),
            },
            "resourceBudget": resource_budget,
            "discovery": {
                "kind": "BASELINE_GIT_INSTRUMENTED_TRACE",
                "script": baseline_identity,
                "root": "packages/fixture-runtime/assets/standard",
                "directoryListingCount": 1,
            },
        }
        source_packet = {
            "schemaVersion": 1,
            "kind": "direct-command-runtime-baseline-git-source-packet",
            "source": "GIT_OBJECT_DATABASE_ONLY",
            "baselineCommit": baseline_identity["baselineCommit"],
            "tree": {"gitTreeSha1": "e" * 40},
            "baselineReadSet": [baseline_identity],
            "objects": [{**baseline_identity, "contentBase64": base64.b64encode(source_bytes).decode("ascii")}],
        }
        source_packet["packetSha256"] = podman._direct_runtime_packet_digest_v1(source_packet)
        integration = build_integration(read_set, source_packet, None, resource_budget)
        self.assertEqual(integration["stagePlan"], expected_stage_plan)

        commands = {
            "materialize": (
                ["node", "materialize-v3"],
                [
                    podman.CONTAINER_NODE,
                    "/runner/materialize.mjs",
                    "/runner/archive.json",
                    "/runner/direct-runtime-source-packet.json",
                    "/work",
                ],
            ),
            "direct-runtime-materialization-probe": (
                ["node", "direct-runtime-materialization-probe"],
                [
                    podman.CONTAINER_NODE,
                    "/runner/direct-runtime-materialization-probe.mjs",
                    "/runner/archive.json",
                    "/runner/direct-runtime-source-packet.json",
                    "/work",
                ],
            ),
        }
        with tempfile.TemporaryDirectory() as temporary:
            attempts_root = Path(temporary) / "attempts"
            attempts_root.mkdir()
            raw = Path(temporary) / "raw"
            raw.mkdir()
            context = {"prefix": [podman.PODMAN, "run", "--rm", "--network", "none"]}
            for stage, (logical_argv, payload_argv) in commands.items():
                with self.subTest(stage=stage):
                    raw_id = f"receipt-{stage}"
                    stdout = raw / f"{raw_id}.stdout.txt"
                    stderr = raw / f"{raw_id}.stderr.txt"
                    stdout.write_text("", encoding="utf-8")
                    stderr.write_text(f"{stage} failed\n", encoding="utf-8")
                    command = {
                        "id": stage,
                        "argv": logical_argv,
                        "cwd": ".",
                        "env": dict(podman.ENV),
                        "envAbsent": list(podman.ENV_ABSENT),
                        "network": False,
                        "exitCode": 1,
                        "actualExecutor": podman._container_executor(context, logical_argv, payload_argv),
                        "_rawId": raw_id,
                        "_stdoutPath": stdout,
                        "_stderrPath": stderr,
                    }
                    publisher(
                        stage,
                        [command],
                        error_type(f"V3_PODMAN_GATE_FAILED: {stage}"),
                        hermetic_pnpm_contract=None,
                        external_stop=None,
                        attempts_root=attempts_root,
                        attempt_date="20260802",
                        direct_runtime_integration=integration,
                        direct_runtime_stage=stage,
                    )
                    attempt_directory = attempts_root / f"r1-v3-podman-execution-attempt-20260802-{len(list(attempts_root.iterdir())):04d}"
                    attempt = _load_json(attempt_directory / "failed-attempt.json", self)
                    expected_later_stages = [
                        {"id": later_stage, "status": "NOT_RUN"}
                        for later_stage in expected_stage_plan[expected_stage_plan.index(stage) + 1:]
                    ]
                    self.assertEqual(attempt["failure"], {
                        "stage": stage,
                        "reason": f"V3_PODMAN_GATE_FAILED: {stage}",
                        "classification": "COMMAND_EXIT_NONZERO",
                        "commandId": stage,
                    })
                    self.assertEqual(attempt["commands"][0]["id"], stage)
                    self.assertEqual(attempt["commands"][0]["argv"], logical_argv)
                    self.assertEqual(attempt["commands"][0]["actualExecutor"]["payloadArgv"], payload_argv)
                    self.assertEqual(attempt["directRuntimeIntegration"]["reachedStage"], stage)
                    self.assertEqual(attempt["directRuntimeIntegration"]["laterStages"], expected_later_stages)
                    self.assertEqual(attempt["directRuntimeIntegration"]["integration"]["attempt"], {
                        "id": integration["attempt"]["id"],
                        "reachedStage": stage,
                        "laterStages": expected_later_stages,
                        "executionTrace": None,
                    })
                    validator(attempt, attempt_directory)
        self.assertFalse(V3_DIR.exists())

    def test_direct_runtime_tracer_requires_exact_generator_child_inheritance(self) -> None:
        """Requires trace activation to follow the spawned generator process, not merely pnpm's Node parent.

        @returns Nothing; assertions preserve a no-Podman Red contract for generator-only raw-trace provenance.
        """
        self.assertEqual(_sha256(PODMAN_RUNTIME_ASSET_ATTEMPT.read_bytes()), PODMAN_RUNTIME_ASSET_ATTEMPT_SHA256)
        self.assertFalse(V3_DIR.exists())
        podman = importlib.import_module("measure.business_operations_graph_baseline_execution_closure_v3_podman")
        node_options = getattr(podman, "DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS", None)
        self.assertEqual(
            node_options,
            "--import=/runner/direct-runtime-tracer.mjs",
            "V3_DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS_MISSING",
        )
        container_executor = getattr(podman, "_container_executor", None)
        run_container = getattr(podman, "_run_container", None)
        capture_trace = getattr(podman, "capture_direct_command_runtime_in_container_trace_v1", None)
        self.assertTrue(callable(container_executor), "V3_DIRECT_RUNTIME_CONTAINER_EXECUTOR_MISSING")
        self.assertTrue(callable(run_container), "V3_DIRECT_RUNTIME_RUN_CONTAINER_MISSING")
        self.assertTrue(callable(capture_trace), "V3_DIRECT_RUNTIME_IN_CONTAINER_TRACE_CAPTURE_MISSING")
        self.assertTrue(
            {"environment_overrides"} <= set(inspect.signature(container_executor).parameters),
            "V3_DIRECT_RUNTIME_GENERATOR_ENVIRONMENT_OVERRIDE_MISSING",
        )
        self.assertTrue(
            {"environment_overrides"} <= set(inspect.signature(run_container).parameters),
            "V3_DIRECT_RUNTIME_GENERATOR_RUN_ENVIRONMENT_OVERRIDE_MISSING",
        )

        runner_source = inspect.getsource(podman.write_execution_closure_v1)
        executor_source = inspect.getsource(container_executor)
        noninstall_executor_source = inspect.getsource(podman.validate_noninstall_pnpm_executor_v1)
        integration_source = inspect.getsource(podman.build_direct_command_runtime_runner_integration_v1)
        capture_source = inspect.getsource(capture_trace)
        runner_scripts_source = inspect.getsource(podman._runner_scripts)

        self.assertIn("DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS", runner_source)
        self.assertIn("environment_overrides=", runner_source)
        self.assertNotIn("traced_generator_payload", runner_source, "a parent-only --import payload cannot prove child-generator tracing")
        self.assertNotIn("--import=/runner/direct-runtime-tracer.mjs", runner_source, "the pnpm payload must not be the only tracer activation path")
        self.assertIn("NODE_OPTIONS", executor_source)
        self.assertIn("environment_overrides", executor_source)
        self.assertIn("NODE_OPTIONS", noninstall_executor_source)
        self.assertIn("DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS", noninstall_executor_source)
        self.assertIn("environment_overrides", noninstall_executor_source)

        self.assertIn("generatorScript", integration_source)
        self.assertIn("generatorResolvedPath", integration_source)
        self.assertIn("INHERITED_NODE_OPTIONS_EXACT_GENERATOR_SCRIPT_ONLY", integration_source)
        self.assertIn("PNPM_PARENT_EXCLUDED", integration_source)
        self.assertIn("generatorScript", runner_scripts_source)
        self.assertIn("generatorResolvedPath", runner_scripts_source)
        self.assertIn("process.argv[1]", runner_scripts_source)
        self.assertIn("process.pid", runner_scripts_source)
        self.assertIn("DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS", runner_scripts_source)
        self.assertIn("generatorPid", runner_scripts_source)
        self.assertIn("generatorScript", capture_source)
        self.assertIn("generatorPid", capture_source)
        self.assertIn("rawEventArtifact", capture_source)
        self.assertIn("nonce", capture_source)
        self.assertIn("INHERITED_NODE_OPTIONS_EXACT_GENERATOR_SCRIPT_ONLY", capture_source)
        self.assertIn("DIRECT_RUNTIME_TRACE_CONFIG_PATH", runner_scripts_source)

        node_executable = shutil.which("node")
        self.assertIsNotNone(node_executable, "V3_DIRECT_RUNTIME_LOCAL_NODE_MISSING")
        source_bytes = b"generator-child-read\n"
        source_path = "packages/advantage-play-kit/assets/standard/input.txt"
        source_blob = b"blob " + str(len(source_bytes)).encode("ascii") + b"\0" + source_bytes
        source_identity = {
            "path": source_path,
            "baselineCommit": "a" * 40,
            "gitBlobSha1": hashlib.sha1(source_blob).hexdigest(),
            "sha256": _sha256(source_bytes),
            "size": len(source_bytes),
            "mode": "100644",
            "origin": "BASELINE_SOURCE",
        }
        with tempfile.TemporaryDirectory() as temporary:
            stage = Path(temporary)
            archive_path = stage / "archive.json"
            work = stage / "work"
            work.mkdir()
            generator = work / "packages" / "advantage-play-kit" / "scripts" / "generate-standard-pack-release.mjs"
            generator.parent.mkdir(parents=True)
            source = work / source_path
            source.parent.mkdir(parents=True)
            source.write_bytes(source_bytes)
            generator.write_text(
                'import { readFile } from "node:fs/promises";\n'
                'await readFile(new URL("../assets/standard/input.txt", import.meta.url));\n',
                encoding="utf-8",
            )
            parent = stage / "pnpm-parent.mjs"
            parent.write_text(
                'import { spawnSync } from "node:child_process";\n'
                'const result = spawnSync(process.execPath, [process.argv[2]], { stdio: "inherit" });\n'
                'process.stdout.write(JSON.stringify({ parentPnpmPid: process.pid, generatorPid: result.pid }));\n'
                'process.exit(result.status ?? 1);\n',
                encoding="utf-8",
            )
            config_path = stage / "direct-runtime-trace-config.json"
            artifact_path = work / ".direct-runtime-trace" / "direct-runtime-raw-events.jsonl"
            config = {
                "schemaVersion": 1,
                "kind": "direct-command-runtime-in-container-trace-config",
                "evidence": "IN_CONTAINER_TRACER_RAW_ARTIFACT_ONLY",
                "tracer": "direct-runtime-tracer",
                "rawEventArtifact": "direct-runtime-raw-events.jsonl",
                "nonce": "c" * 64,
                "packetSha256": "d" * 64,
                "maxEvents": 4,
                "targetRoot": str(work),
                "artifactPath": str(artifact_path),
                "generatorScript": generator.relative_to(work).as_posix(),
                "generatorResolvedPath": str(generator.resolve()),
                "nodeOptions": f"--import={stage / 'runner' / 'direct-runtime-tracer.mjs'}",
                "activation": "INHERITED_NODE_OPTIONS_EXACT_GENERATOR_SCRIPT_ONLY",
                "parentPnpm": "EXCLUDED",
                "baselineReadSet": [source_identity],
                "derivedBuildReadSet": [],
                "outputPaths": [],
            }
            archive_path.write_text(json.dumps({"entries": [], "closureInventory": []}), encoding="utf-8")
            podman._runner_scripts(stage, archive_path, podman.build_nested_pnpm_runtime_shim_contract_v1())
            config["nodeOptions"] = f"--import={stage / 'runner' / 'direct-runtime-tracer.mjs'}"
            config_path.write_text(json.dumps(config), encoding="utf-8")
            inherited = subprocess.run(
                [node_executable, str(parent), str(generator)],
                capture_output=True,
                text=True,
                check=False,
                env={
                    "NODE_OPTIONS": config["nodeOptions"],
                    "DIRECT_RUNTIME_TRACE_CONFIG_PATH": str(config_path),
                },
            )
            self.assertEqual(inherited.returncode, 0, inherited.stderr)
            process_proof = json.loads(inherited.stdout)
            self.assertIsInstance(process_proof.get("parentPnpmPid"), int)
            self.assertIsInstance(process_proof.get("generatorPid"), int)
            self.assertNotEqual(process_proof["parentPnpmPid"], process_proof["generatorPid"])
            raw_events = [json.loads(line) for line in artifact_path.read_text(encoding="utf-8").splitlines()]
            self.assertEqual(len(raw_events), 1, "the inert pnpm parent must not pollute the generator trace")
            self.assertEqual(raw_events[0], {
                "nonce": config["nonce"],
                "ordinal": 0,
                "kind": "BASELINE_READ",
                "value": source_identity,
                "tracer": "direct-runtime-tracer",
                "packetSha256": config["packetSha256"],
                "rawEventArtifact": config["rawEventArtifact"],
                "generatorPid": process_proof["generatorPid"],
                "generatorScript": config["generatorResolvedPath"],
            })
            receipt = subprocess.run(
                [node_executable, str(stage / "runner" / "direct-runtime-trace-receipt.mjs"), str(config_path)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(receipt.returncode, 0, receipt.stderr)
            trace_receipt = json.loads(receipt.stdout)
            self.assertEqual(trace_receipt["generatorPid"], process_proof["generatorPid"])
            self.assertEqual(trace_receipt["generatorScript"], config["generatorResolvedPath"])
            self.assertEqual(trace_receipt["nonce"], config["nonce"])
            self.assertEqual(trace_receipt["events"], raw_events)
        self.assertFalse(V3_DIR.exists())

    @unittest.skipUnless(
        os.environ.get("RUN_R1_PODMAN_CHILD_TRACE_ACCEPTANCE") == "1",
        "set RUN_R1_PODMAN_CHILD_TRACE_ACCEPTANCE=1 to run the pinned-image container acceptance gate",
    )
    def test_direct_runtime_tracer_child_only_pinned_podman_acceptance(self) -> None:
        """Proves child-only ESM filesystem tracing in the existing pinned no-network Podman image.

        @returns Nothing; assertions use two temporary, synthetic-container invocations and leave no candidate or attempt evidence.
        """
        self.assertFalse(V3_DIR.exists())
        podman = importlib.import_module("measure.business_operations_graph_baseline_execution_closure_v3_podman")
        self.assertTrue(shutil.which(podman.PODMAN), "V3_DIRECT_RUNTIME_PODMAN_MISSING")
        self.assertIn("@sha256:", podman.IMAGE_RESOLVED, "V3_DIRECT_RUNTIME_IMAGE_NOT_PINNED")
        persistent_attempts = sorted(
            path.relative_to(TRACK_DIR).as_posix()
            for path in TRACK_DIR.glob("r1-v3-podman-execution-attempt-*")
        )

        generator_bytes = (
            b'import { readFile } from "node:fs/promises";\n'
            b'const bytes = await readFile(new URL("../assets/standard/input.txt", import.meta.url));\n'
            b'if (bytes.toString("utf8") !== "container-child-read\\n") throw new Error("fixture source mismatch");\n'
        )
        source_bytes = b"container-child-read\n"

        def baseline_identity(path: str, contents: bytes) -> dict[str, Any]:
            """Builds one deterministic detached baseline identity for the container-only fixture.

            @param path The workspace-relative synthetic source path.
            @param contents The exact synthetic source bytes.
            @returns The identity required by the direct-runtime trace contract.
            """
            blob = b"blob " + str(len(contents)).encode("ascii") + b"\0" + contents
            return {
                "path": path,
                "sha256": _sha256(contents),
                "size": len(contents),
                "mode": "100644",
                "origin": "BASELINE_GIT_BLOB",
                "baselineCommit": "a" * 40,
                "gitBlobSha1": hashlib.sha1(blob).hexdigest(),
                "inclusion": "MATERIALIZE_EXACT_BASELINE_BYTES",
            }

        package_root = "packages/fixture-container-runtime"
        generator_path = f"{package_root}/scripts/generate-runtime.mjs"
        source_path = f"{package_root}/assets/standard/input.txt"
        generator_identity = baseline_identity(generator_path, generator_bytes)
        source_identity = baseline_identity(source_path, source_bytes)
        baseline_read_set = sorted([generator_identity, source_identity], key=lambda item: item["path"])
        resource_budget = {
            "schemaVersion": 1,
            "kind": "direct-command-runtime-asset-resource-budget",
            "frozenArchive": _reference(V2_ARCHIVE),
            "sourceCeiling": {
                "path": f"{package_root}/assets/standard",
                "regularFiles": 2,
                "apparentBytes": len(generator_bytes) + len(source_bytes),
                "allocatedBytes": len(generator_bytes) + len(source_bytes),
            },
            "reservations": {
                "baselineGitMaterializationBytes": 1,
                "candidateCowBytes": 1,
                "archiveSupplementBytes": 1,
                "derivedOutputBytes": 1,
                "metadataBytes": 1,
                "minimumHeadroomBytes": 1,
            },
            "requiredAvailableBytes": 6,
            "availableBytes": 6,
            "decision": "PASS",
        }
        derived_read = {
            "path": f"{package_root}/dist/assets/index.js",
            "sha256": "b" * 64,
            "size": 1,
            "origin": "DERIVED_BUILD_OUTPUT",
            "producer": {
                "kind": "PACKAGE_SCRIPT_PREREQUISITE_BUILD",
                "scriptName": "fixture-build",
                "scriptSegment": "pnpm build",
                "receipt": {
                    "path": "fixture-container-build-receipt.json",
                    "sha256": "c" * 64,
                    "size": 1,
                },
            },
        }
        read_set = {
            "schemaVersion": 1,
            "kind": "direct-command-runtime-read-set",
            "trigger": {
                "logicalArgv": ["pnpm", "--filter", "@fixture/container-runtime", "fixture-build"],
                "package": "@fixture/container-runtime",
                "manifest": {
                    "path": f"{package_root}/package.json",
                    "sha256": "d" * 64,
                    "size": 1,
                },
            },
            "baselineReadSet": baseline_read_set,
            "derivedBuildReadSet": [derived_read],
            "outputPaths": [f"{package_root}/assets/standard/standard-pack-release.json"],
            "preflightQuota": {
                "maxEntries": len(baseline_read_set),
                "maxBytes": sum(item["size"] for item in baseline_read_set),
                "observedEntries": len(baseline_read_set),
                "observedBytes": sum(item["size"] for item in baseline_read_set),
            },
            "resourceBudget": resource_budget,
            "discovery": {
                "kind": "BASELINE_GIT_INSTRUMENTED_TRACE",
                "script": generator_identity,
                "root": f"{package_root}/assets/standard",
                "directoryListingCount": 1,
            },
        }
        source_packet = {
            "schemaVersion": 1,
            "kind": "direct-command-runtime-baseline-git-source-packet",
            "source": "GIT_OBJECT_DATABASE_ONLY",
            "baselineCommit": generator_identity["baselineCommit"],
            "tree": {"gitTreeSha1": "e" * 40},
            "baselineReadSet": baseline_read_set,
            "objects": [
                {**source_identity, "contentBase64": base64.b64encode(source_bytes).decode("ascii")},
                {**generator_identity, "contentBase64": base64.b64encode(generator_bytes).decode("ascii")},
            ],
        }
        source_packet["packetSha256"] = podman._direct_runtime_packet_digest_v1(source_packet)
        integration = podman.build_direct_command_runtime_runner_integration_v1(
            read_set,
            source_packet,
            None,
            resource_budget,
        )

        temporary_root: Path | None = None
        with tempfile.TemporaryDirectory(prefix="r1-podman-child-trace-") as temporary:
            temporary_root = Path(temporary)
            archive_path = temporary_root / "archive.json"
            work = temporary_root / "work"
            work.mkdir(mode=0o777)
            work.chmod(0o777)
            generator = work / generator_path
            generator.parent.mkdir(parents=True)
            generator.write_bytes(generator_bytes)
            source = work / source_path
            source.parent.mkdir(parents=True)
            source.write_bytes(source_bytes)
            parent = work / "pnpm-parent.mjs"
            parent.write_text(
                'import { spawnSync } from "node:child_process";\n'
                'const result = spawnSync(process.execPath, [process.argv[2]], { stdio: "inherit" });\n'
                'process.stdout.write(JSON.stringify({ parentPnpmPid: process.pid, generatorPid: result.pid }));\n'
                'process.exit(result.status ?? 1);\n',
                encoding="utf-8",
            )
            archive_path.write_text(json.dumps({"entries": [], "closureInventory": []}), encoding="utf-8")
            mounts = podman._runner_scripts(
                temporary_root,
                archive_path,
                podman.build_nested_pnpm_runtime_shim_contract_v1(),
                direct_runtime_integration=integration,
            )
            runner = temporary_root / "runner"
            config_path = runner / "direct-runtime-trace-config.json"
            trace_config = _load_json(config_path, self)
            self.assertEqual(trace_config["targetRoot"], "/work")
            self.assertEqual(trace_config["generatorScript"], generator_path)
            self.assertEqual(trace_config["generatorResolvedPath"], f"/work/{generator_path}")
            self.assertEqual(trace_config["nodeOptions"], podman.DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS)
            self.assertEqual(trace_config["parentPnpm"], "PNPM_PARENT_EXCLUDED")
            self.assertTrue(all(Path(mount["source"]).is_relative_to(temporary_root) for mount in mounts))

            artifact_path = work / ".direct-runtime-trace" / "direct-runtime-raw-events.jsonl"
            container_prefix = [
                podman.PODMAN,
                "run",
                "--rm",
                "--pull=never",
                "--network",
                "none",
                "--userns=keep-id",
                "--workdir",
                "/work",
                "--volume",
                f"{work.resolve()}:/work:rw",
                "--volume",
                f"{runner.resolve()}:/runner:ro",
                podman.IMAGE_RESOLVED,
                "/usr/bin/env",
                "-i",
                "CI=true",
                f"PATH={podman.BOOTSTRAP_PATH}",
            ]
            self.assertEqual(container_prefix.count(podman.IMAGE_RESOLVED), 1)
            self.assertIn("--pull=never", container_prefix)
            self.assertNotIn(str(REPO_ROOT), "\n".join(container_prefix))
            self.assertNotIn("build", container_prefix)
            self.assertNotIn("pull", container_prefix)

            traced = subprocess.run(
                [
                    *container_prefix,
                    f"NODE_OPTIONS={podman.DIRECT_RUNTIME_GENERATOR_NODE_OPTIONS}",
                    f"DIRECT_RUNTIME_TRACE_CONFIG_PATH={podman.DIRECT_RUNTIME_TRACE_CONFIG_PATH}",
                    podman.CONTAINER_NODE,
                    "/work/pnpm-parent.mjs",
                    f"/work/{generator_path}",
                ],
                capture_output=True,
                text=True,
                check=False,
                timeout=30,
            )
            self.assertEqual(
                traced.returncode,
                0,
                f"V3_DIRECT_RUNTIME_PINNED_IMAGE_CHILD_TRACE_BLOCKED\nstdout:\n{traced.stdout}\nstderr:\n{traced.stderr}",
            )
            process_proof = json.loads(traced.stdout)
            self.assertEqual(set(process_proof), {"parentPnpmPid", "generatorPid"})
            self.assertIsInstance(process_proof["parentPnpmPid"], int)
            self.assertIsInstance(process_proof["generatorPid"], int)
            self.assertNotEqual(process_proof["parentPnpmPid"], process_proof["generatorPid"])
            self.assertTrue(artifact_path.is_file())
            self.assertFalse(artifact_path.is_symlink())
            raw = artifact_path.read_bytes()
            self.assertLessEqual(len(raw), 4096, "V3_DIRECT_RUNTIME_SYNTHETIC_TRACE_DISK_BOUND_EXCEEDED")
            raw_events = [json.loads(line) for line in raw.decode("utf-8").splitlines()]
            self.assertEqual(raw_events, [{
                "nonce": trace_config["nonce"],
                "ordinal": 0,
                "kind": "BASELINE_READ",
                "value": source_identity,
                "tracer": "direct-runtime-tracer",
                "packetSha256": source_packet["packetSha256"],
                "rawEventArtifact": trace_config["rawEventArtifact"],
                "generatorPid": process_proof["generatorPid"],
                "generatorScript": f"/work/{generator_path}",
            }])

            receipt = subprocess.run(
                [
                    *container_prefix,
                    podman.CONTAINER_NODE,
                    "/runner/direct-runtime-trace-receipt.mjs",
                    podman.DIRECT_RUNTIME_TRACE_CONFIG_PATH,
                ],
                capture_output=True,
                text=True,
                check=False,
                timeout=30,
            )
            self.assertEqual(
                receipt.returncode,
                0,
                f"V3_DIRECT_RUNTIME_PINNED_IMAGE_TRACE_RECEIPT_BLOCKED\nstdout:\n{receipt.stdout}\nstderr:\n{receipt.stderr}",
            )
            trace_receipt = json.loads(receipt.stdout)
            self.assertEqual(trace_receipt["generatorPid"], process_proof["generatorPid"])
            self.assertEqual(trace_receipt["generatorScript"], f"/work/{generator_path}")
            self.assertEqual(trace_receipt["events"], raw_events)
            self.assertEqual(trace_receipt["rawArtifact"], {"sha256": _sha256(raw), "size": len(raw)})
            self.assertFalse(artifact_path.exists(), "V3_DIRECT_RUNTIME_TRACE_ARTIFACT_CLEANUP_FAILED")
        self.assertIsNotNone(temporary_root)
        self.assertFalse(temporary_root.exists(), "V3_DIRECT_RUNTIME_SYNTHETIC_MOUNT_CLEANUP_FAILED")
        self.assertEqual(
            sorted(path.relative_to(TRACK_DIR).as_posix() for path in TRACK_DIR.glob("r1-v3-podman-execution-attempt-*")),
            persistent_attempts,
        )
        self.assertFalse(V3_DIR.exists())

    def test_direct_runtime_input_preparation_protocol_is_self_derived_and_transaction_bound(self) -> None:
        """Requires production-owned R1 inputs instead of caller-injected runtime evidence.

        @returns Nothing; this Red contract inspects only the required protocol surface and cannot run Podman or publish a candidate.
        """
        self.assertEqual(_sha256(PODMAN_RUNTIME_ASSET_ATTEMPT.read_bytes()), PODMAN_RUNTIME_ASSET_ATTEMPT_SHA256)
        self.assertFalse(V3_DIR.exists())
        persistent_attempts = sorted(
            path.relative_to(TRACK_DIR).as_posix()
            for path in TRACK_DIR.glob("r1-v3-podman-execution-attempt-*")
        )
        marker = TRACK_DIR / "r1-r2-v2-marker-closeout-green-receipt-20260801.md"
        marker_bytes = marker.read_bytes()
        podman = importlib.import_module("measure.business_operations_graph_baseline_execution_closure_v3_podman")
        prepare = getattr(podman, "prepare_direct_command_runtime_execution_inputs_v1", None)
        finalize = getattr(podman, "finalize_direct_command_runtime_execution_inputs_v1", None)
        writer = podman.write_execution_closure_v1
        self.assertTrue(callable(prepare), "V3_DIRECT_RUNTIME_INPUT_PREPARATION_ENTRYPOINT_MISSING")
        self.assertTrue(callable(finalize), "V3_DIRECT_RUNTIME_INPUT_FINALIZATION_ENTRYPOINT_MISSING")
        self.assertEqual(
            set(inspect.signature(prepare).parameters),
            {"run_day"},
            "V3_DIRECT_RUNTIME_INPUT_PREPARATION_SIGNATURE_INVALID",
        )
        self.assertEqual(
            set(inspect.signature(finalize).parameters),
            {"preparation", "runtime_build_receipt", "post_build_identity"},
            "V3_DIRECT_RUNTIME_INPUT_FINALIZATION_SIGNATURE_INVALID",
        )
        self.assertEqual(
            set(inspect.signature(writer).parameters),
            {"output_directory", "run_day", "external_stop"},
            "V3_DIRECT_RUNTIME_CALLER_INPUTS_NOT_REMOVED",
        )

        writer_source = inspect.getsource(writer)
        ordered_steps = [
            "prepare_direct_command_runtime_execution_inputs_v1(",
            'failure_reason = "direct-runtime-input-preparation"',
            "archive = _build_archive(",
            'failure_reason = "build-advantage-play-kit-for-runtime"',
            'failure_reason = "direct-runtime-dist-identity"',
            "finalize_direct_command_runtime_execution_inputs_v1(",
            'failure_reason = "generate-standard-pack-catalog"',
        ]
        positions = [writer_source.index(step) for step in ordered_steps]
        self.assertEqual(
            positions,
            sorted(positions),
            "V3_DIRECT_RUNTIME_INPUT_PREPARATION_TRANSACTION_ORDER_INVALID",
        )
        self.assertNotIn("direct_runtime_read_set", inspect.signature(writer).parameters)
        self.assertNotIn("direct_runtime_source_packet", inspect.signature(writer).parameters)
        self.assertNotIn("direct_runtime_attempt", inspect.signature(writer).parameters)

        preparation_source = inspect.getsource(prepare)
        for required in (
            "core.V2_ARCHIVE",
            "STANDARD_PACK_GENERATOR",
            "git ls-tree",
            "capture_direct_command_runtime_baseline_git_packet_v1(",
            "direct-command-runtime-input-preparation",
            "SINGLE_UNINTERRUPTED_R1_V3_TRANSACTION",
            "GIT_OBJECT_DATABASE_ONLY",
            "IN_CONTAINER_POST_RUNTIME_BUILD_IDENTITY",
            "CAPTURE_BEFORE_CANDIDATE_STAGING",
            "liveWorktreeFallback",
        ):
            self.assertIn(required, preparation_source, f"V3_DIRECT_RUNTIME_INPUT_PREPARATION_MISSING:{required}")
        for prohibited in ("_run_container(", "_podman_context(", "_publish_failed_attempt(", "V3_DIR"):
            self.assertNotIn(prohibited, preparation_source, f"V3_DIRECT_RUNTIME_INPUT_PREPARATION_SIDE_EFFECT:{prohibited}")
        self.assertNotIn("direct_runtime_read_set", inspect.signature(prepare).parameters)
        self.assertNotIn("direct_runtime_source_packet", inspect.signature(prepare).parameters)
        self.assertNotIn("direct_runtime_attempt", inspect.signature(prepare).parameters)

        preparation = prepare(run_day="20260802")
        self.assertEqual(set(preparation), {
            "schemaVersion",
            "kind",
            "transaction",
            "frozenInputs",
            "baselineGitDiscovery",
            "sourcePacket",
            "packetMaterialization",
            "resourceBudget",
            "dynamicBuildOutput",
        })
        self.assertEqual(preparation["schemaVersion"], 1)
        self.assertEqual(preparation["kind"], "direct-command-runtime-input-preparation")
        self.assertEqual(preparation["frozenInputs"], {
            "archive": _reference(V2_ARCHIVE),
            "generatorArgv": STANDARD_PACK_GENERATOR,
        })
        self.assertEqual(preparation["transaction"], {
            "continuity": "SINGLE_UNINTERRUPTED_R1_V3_TRANSACTION",
            "candidatePublication": "FORBIDDEN_UNTIL_ALL_GATES_PASS",
            "externalRuntimeInputs": "REJECT",
        })
        discovery = preparation["baselineGitDiscovery"]
        self.assertEqual(set(discovery), {
            "source",
            "baselineCommit",
            "tree",
            "root",
            "recursiveListing",
            "liveWorktreeFallback",
            "captureTiming",
            "selectedTreeInventory",
            "selectedTreeInventorySha256",
        })
        self.assertEqual(discovery["source"], "GIT_OBJECT_DATABASE_ONLY")
        self.assertEqual(discovery["baselineCommit"], preparation["sourcePacket"]["baselineCommit"])
        self.assertEqual(discovery["tree"], preparation["sourcePacket"]["tree"])
        self.assertEqual(discovery["root"], "packages/advantage-play-kit/assets/standard")
        self.assertEqual(discovery["recursiveListing"], "GIT_LS_TREE_RECURSIVE_ONLY")
        self.assertEqual(discovery["liveWorktreeFallback"], "REJECT")
        self.assertEqual(discovery["captureTiming"], "CAPTURE_BEFORE_CANDIDATE_STAGING")
        selected_tree_inventory = [
            {
                key: identity[key]
                for key in ("path", "gitBlobSha1", "sha256", "size", "mode")
            }
            for identity in preparation["sourcePacket"]["baselineReadSet"]
        ]
        self.assertEqual(discovery["selectedTreeInventory"], selected_tree_inventory)
        self.assertEqual(
            discovery["selectedTreeInventorySha256"],
            _sha256(json.dumps(selected_tree_inventory, sort_keys=True, separators=(",", ":")).encode("utf-8")),
        )
        self.assertEqual(preparation["dynamicBuildOutput"], {
            "stage": "direct-runtime-dist-identity",
            "source": "IN_CONTAINER_POST_RUNTIME_BUILD_IDENTITY",
            "receiptIdentityPolicy": "EXACT_PRODUCER_RECEIPT_FOR_EACH_DERIVED_DIST_READ",
            "state": "UNRESOLVED_UNTIL_RECORDED_RUNTIME_BUILD",
            "knownDerivedBuildPaths": [{
                "path": "packages/advantage-play-kit/dist/assets/index.js",
                "origin": "DERIVED_BUILD_OUTPUT",
                "producerClass": {
                    "kind": "PACKAGE_SCRIPT_PREREQUISITE_BUILD",
                    "scriptName": STANDARD_PACK_GENERATOR[3],
                    "scriptSegment": "pnpm build",
                },
            }],
            "declaredOutputPaths": [STANDARD_PACK_CATALOG],
        })
        self.assertNotIn("readSet", preparation)
        self.assertNotIn("derivedBuildReadSet", preparation)
        podman._direct_runtime_validate_source_packet_v1(
            preparation["sourcePacket"],
            preparation["sourcePacket"]["baselineReadSet"],
        )
        self.assertEqual(
            preparation["packetMaterialization"],
            podman.build_direct_command_runtime_packet_materialization_contract_v1(preparation["sourcePacket"]),
        )
        podman._direct_runtime_resource_budget_v1(preparation["resourceBudget"])

        finalization_source = inspect.getsource(finalize)
        for required in (
            "IN_CONTAINER_POST_RUNTIME_BUILD_IDENTITY",
            "EXACT_PRODUCER_RECEIPT_FOR_EACH_DERIVED_DIST_READ",
            "build_direct_command_runtime_runner_integration_v1(",
            "direct-command-runtime-input-preparation",
        ):
            self.assertIn(required, finalization_source, f"V3_DIRECT_RUNTIME_INPUT_FINALIZATION_MISSING:{required}")
        self.assertFalse(V3_DIR.exists())
        self.assertEqual(
            sorted(path.relative_to(TRACK_DIR).as_posix() for path in TRACK_DIR.glob("r1-v3-podman-execution-attempt-*")),
            persistent_attempts,
        )
        self.assertEqual(marker.read_bytes(), marker_bytes)

    def test_direct_runtime_preparation_transaction_is_executable_and_tree_capacity_is_derived(self) -> None:
        """Requires real finalization scheduling and capacity derived from a canonical selected Git tree.

        @returns Nothing; this uses only a synthetic in-memory executor and cannot invoke Podman or publish evidence.
        """
        self.assertFalse(V3_DIR.exists())
        persistent_attempts = sorted(path.relative_to(TRACK_DIR).as_posix() for path in TRACK_DIR.glob("r1-v3-podman-execution-attempt-*"))
        marker = TRACK_DIR / "r1-r2-v2-marker-closeout-green-receipt-20260801.md"
        marker_bytes = marker.read_bytes()
        podman = importlib.import_module("measure.business_operations_graph_baseline_execution_closure_v3_podman")
        schedule = getattr(podman, "execute_direct_command_runtime_prepared_transaction_v1", None)
        derive_capacity = getattr(podman, "derive_direct_command_runtime_capacity_from_selected_tree_v1", None)
        writer = podman.write_execution_closure_v1
        self.assertTrue(callable(schedule), "V3_DIRECT_RUNTIME_PREPARATION_TRANSACTION_SCHEDULER_MISSING")
        self.assertTrue(callable(derive_capacity), "V3_DIRECT_RUNTIME_DERIVED_TREE_CAPACITY_BUILDER_MISSING")
        self.assertEqual(set(inspect.signature(schedule).parameters), {"preparation", "executor"})
        self.assertEqual(set(inspect.signature(derive_capacity).parameters), {"selected_tree_inventory", "asset_root", "available_bytes"})

        writer_globals = [step.argval for step in dis.get_instructions(writer) if step.opname == "LOAD_GLOBAL"]
        self.assertIn("prepare_direct_command_runtime_execution_inputs_v1", writer_globals)
        self.assertIn("execute_direct_command_runtime_prepared_transaction_v1", writer_globals)
        self.assertLess(writer_globals.index("prepare_direct_command_runtime_execution_inputs_v1"), writer_globals.index("execute_direct_command_runtime_prepared_transaction_v1"))
        self.assertNotIn("INPUT_PREPARATION_FINALIZATION_REQUIRED", writer.__code__.co_consts)
        self.assertFalse({"direct_runtime_read_set", "direct_runtime_source_packet", "direct_runtime_attempt", "direct_runtime_resource_budget"} & set(writer.__code__.co_varnames))

        events: list[str] = []
        preparation = {"synthetic": "preparation"}
        archive: dict[str, Any] = {"synthetic": "archive"}
        context: dict[str, Any] = {"synthetic": "context"}
        materialization = {"synthetic": "materialization"}
        runtime_build = {"synthetic": "runtime-build"}
        post_build_identity = {"synthetic": "post-build-identity"}
        integration = {"synthetic": "integration"}
        generation = {"synthetic": "generation"}
        trace = {"synthetic": "trace"}

        def stage(name: str, expected: tuple[Any, ...], result: Any) -> Callable[..., Any]:
            """Creates one in-memory executor stage with exact upstream inputs.

            @param name The asserted transaction stage name.
            @param expected The exact upstream objects the stage must receive.
            @param result The synthetic downstream object to return.
            @returns A callable executor stage.
            """
            def invoke(*actual: Any) -> Any:
                """Records one synthetic stage invocation.

                @param actual The observed upstream transaction objects.
                @returns The declared synthetic downstream object.
                """
                self.assertEqual(actual, expected)
                events.append(name)
                return result
            return invoke

        executor = type("SyntheticExecutor", (), {})()
        executor.build_archive = stage("archive", (preparation,), archive)
        executor.build_context = stage("context", (archive, preparation), context)
        executor.materialize = stage("materialize", (context, preparation), materialization)
        executor.runtime_build = stage("runtime-build", (context, materialization, preparation), runtime_build)
        executor.post_build_identity = stage("post-build-identity", (context, runtime_build, preparation), post_build_identity)

        def bind_finalization(observed_archive: dict[str, Any], observed_context: dict[str, Any], observed_integration: dict[str, Any]) -> None:
            """Binds the real finalizer result to every pre-generation transaction carrier.

            @param observed_archive The archive returned by the scheduler.
            @param observed_context The clean execution context.
            @param observed_integration The finalizer result.
            @returns Nothing.
            """
            self.assertIs(observed_archive, archive)
            self.assertIs(observed_context, context)
            self.assertIs(observed_integration, integration)
            archive["directRuntimeIntegration"] = observed_integration
            context["directRuntimeIntegration"] = observed_integration
            events.append("bind-finalization")

        def finalize(observed_preparation: dict[str, Any], observed_build: dict[str, Any], observed_identity: dict[str, Any]) -> dict[str, Any]:
            """Records the actual finalizer call made by the transaction scheduler.

            @param observed_preparation The original synthetic preparation.
            @param observed_build The one runtime build receipt.
            @param observed_identity The post-build identity.
            @returns The synthetic finalizer result.
            """
            self.assertIs(observed_preparation, preparation)
            self.assertIs(observed_build, runtime_build)
            self.assertIs(observed_identity, post_build_identity)
            events.append("finalizer")
            return integration

        executor.bind_finalization = bind_finalization
        executor.generate = stage("generator", (context, integration), generation)
        executor.capture_trace = stage("trace", (context, integration, generation), trace)
        with patch.object(podman, "finalize_direct_command_runtime_execution_inputs_v1", side_effect=finalize) as finalizer:
            result = schedule(preparation, executor)
        finalizer.assert_called_once_with(preparation, runtime_build, post_build_identity)
        self.assertEqual(events, ["archive", "context", "materialize", "runtime-build", "post-build-identity", "finalizer", "bind-finalization", "generator", "trace"])
        self.assertEqual(events.count("runtime-build"), 1)
        self.assertEqual(result, {
            "archive": archive,
            "context": context,
            "materialization": materialization,
            "runtimeBuildReceipt": runtime_build,
            "postBuildIdentity": post_build_identity,
            "integration": integration,
            "generation": generation,
            "trace": trace,
        })
        self.assertIs(archive["directRuntimeIntegration"], integration)
        self.assertIs(context["directRuntimeIntegration"], integration)

        asset_root = "packages/fixture-runtime/assets/standard"
        selected_tree = [
            {"path": f"{asset_root}/IMPORT-RECEIPT.tsv", "gitBlobSha1": "1" * 40, "sha256": "1" * 64, "size": 17, "mode": "100644"},
            {"path": f"{asset_root}/sprites/hero.png", "gitBlobSha1": "2" * 40, "sha256": "2" * 64, "size": 4097, "mode": "100644"},
            {"path": "packages/fixture-runtime/scripts/generate-runtime.mjs", "gitBlobSha1": "3" * 40, "sha256": "3" * 64, "size": 101, "mode": "100755"},
        ]
        capacity = derive_capacity(selected_tree, asset_root, 10**9)
        expected_ceiling = {"path": asset_root, "regularFiles": 2, "apparentBytes": 4114, "allocatedBytes": 12288}
        self.assertEqual(capacity["selectedTreeInventory"], selected_tree)
        self.assertEqual(
            capacity["selectedTreeInventorySha256"],
            _sha256(json.dumps(selected_tree, sort_keys=True, separators=(",", ":")).encode("utf-8")),
        )
        self.assertEqual(capacity["sourceCeiling"], expected_ceiling)
        self.assertEqual(capacity["resourceBudget"]["sourceCeiling"], expected_ceiling)
        self.assertEqual(capacity["resourceBudget"]["reservations"]["baselineGitMaterializationBytes"], 16384)
        podman._direct_runtime_resource_budget_v1(capacity["resourceBudget"])
        expanded_tree = copy.deepcopy(selected_tree)
        expanded_tree[1]["size"] = 8193
        expanded = derive_capacity(expanded_tree, asset_root, 10**9)
        self.assertNotEqual(expanded["selectedTreeInventorySha256"], capacity["selectedTreeInventorySha256"])
        self.assertEqual(expanded["sourceCeiling"]["apparentBytes"], 8210)
        self.assertEqual(expanded["sourceCeiling"]["allocatedBytes"], 16384)
        self.assertGreater(expanded["resourceBudget"]["requiredAvailableBytes"], capacity["resourceBudget"]["requiredAvailableBytes"])
        preparation_globals = {step.argval for step in dis.get_instructions(podman.prepare_direct_command_runtime_execution_inputs_v1) if step.opname == "LOAD_GLOBAL"}
        self.assertIn("derive_direct_command_runtime_capacity_from_selected_tree_v1", preparation_globals)
        self.assertFalse(V3_DIR.exists())
        self.assertEqual(sorted(path.relative_to(TRACK_DIR).as_posix() for path in TRACK_DIR.glob("r1-v3-podman-execution-attempt-*")), persistent_attempts)
        self.assertEqual(marker.read_bytes(), marker_bytes)

    def test_writer_hands_preparation_to_scheduler_before_execution_side_effects(self) -> None:
        """Requires the writer to schedule the prepared transaction before any execution side effect.

        @returns Nothing; patched interception exits before Podman, context, candidate, attempt, or marker work.
        """
        self.assertFalse(V3_DIR.exists())
        persistent_attempts = sorted(path.relative_to(TRACK_DIR).as_posix() for path in TRACK_DIR.glob("r1-v3-podman-execution-attempt-*"))
        marker = TRACK_DIR / "r1-r2-v2-marker-closeout-green-receipt-20260801.md"
        marker_bytes = marker.read_bytes()
        podman = importlib.import_module("measure.business_operations_graph_baseline_execution_closure_v3_podman")
        preparation = {"synthetic": "prepared-inputs"}
        events: list[str] = []

        class _PreparedSchedulerExit(BaseException):
            """Stops the patched writer outside its ordinary failed-attempt publisher."""

        def prepare(run_day: str | None) -> dict[str, str]:
            """Returns the synthetic preparation at the writer boundary.

            @param run_day The writer-supplied optional run day.
            @returns The synthetic preparation object.
            """
            self.assertIsNone(run_day)
            events.append("prepare")
            return preparation

        def scheduler(observed_preparation: dict[str, str], executor: Any) -> None:
            """Records scheduler handoff and exits without entering an execution stage.

            @param observed_preparation The exact prepared input from the writer.
            @param executor The writer-owned transaction executor.
            @returns Nothing; always raises the private interception sentinel.
            """
            self.assertIs(observed_preparation, preparation)
            self.assertIsNotNone(executor)
            events.append("scheduler")
            raise _PreparedSchedulerExit()

        def forbidden(name: str) -> Callable[..., None]:
            """Builds one side-effect tripwire that exits outside ordinary error publishing.

            @param name The side effect that must not occur before scheduler handoff.
            @returns A callable tripwire.
            """
            def tripwire(*_args: Any, **_kwargs: Any) -> None:
                """Records the unexpected side effect and aborts the writer.

                @param _args Positional arguments forwarded to the forbidden callable.
                @param _kwargs Keyword arguments forwarded to the forbidden callable.
                @returns Nothing; always raises the private interception sentinel.
                """
                events.append(name)
                raise _PreparedSchedulerExit()
            return tripwire

        with patch.object(podman, "prepare_direct_command_runtime_execution_inputs_v1", side_effect=prepare), \
             patch.object(podman, "execute_direct_command_runtime_prepared_transaction_v1", side_effect=scheduler), \
             patch.object(podman.tempfile, "TemporaryDirectory", side_effect=forbidden("temporary-directory")), \
             patch.object(podman, "_build_archive", side_effect=forbidden("archive")), \
             patch.object(podman, "_podman_context", side_effect=forbidden("context")), \
             patch.object(podman, "_run_container", side_effect=forbidden("container")), \
             patch.object(podman, "_publish_failed_attempt", side_effect=forbidden("attempt-publisher")):
            with self.assertRaises(podman.CandidateExecutionBlocked) as blocked:
                podman.write_execution_closure_v1()

        self.assertIsInstance(blocked.exception.__cause__, _PreparedSchedulerExit)
        self.assertEqual(events, ["prepare", "scheduler"], "V3_DIRECT_RUNTIME_WRITER_SCHEDULER_HANDOFF_MISSING")
        self.assertFalse(V3_DIR.exists())
        self.assertEqual(sorted(path.relative_to(TRACK_DIR).as_posix() for path in TRACK_DIR.glob("r1-v3-podman-execution-attempt-*")), persistent_attempts)
        self.assertEqual(marker.read_bytes(), marker_bytes)

    def test_scoped_pnpm_payloads_make_store_dir_global_and_pin_the_build_db_blocker(self) -> None:
        """Requires scoped pnpm payloads to keep store selection out of package scripts.

        @returns Nothing; assertions pin immutable build-db evidence and define corrected payload placement.
        """
        self.assertTrue(PODMAN_BUILD_DB_ATTEMPT.is_file())
        self.assertFalse(PODMAN_BUILD_DB_ATTEMPT.is_symlink())
        self.assertEqual(_sha256(PODMAN_BUILD_DB_ATTEMPT.read_bytes()), PODMAN_BUILD_DB_ATTEMPT_SHA256)
        self.assertEqual(PODMAN_BUILD_DB_ATTEMPT.stat().st_size, PODMAN_BUILD_DB_ATTEMPT_SIZE)
        self.assertTrue(PODMAN_BUILD_DB_STDOUT.is_file())
        self.assertFalse(PODMAN_BUILD_DB_STDOUT.is_symlink())
        self.assertTrue(PODMAN_BUILD_DB_STDERR.is_file())
        self.assertFalse(PODMAN_BUILD_DB_STDERR.is_symlink())

        retained = _load_json(PODMAN_BUILD_DB_ATTEMPT, self)
        self.assertEqual(retained["status"], "BLOCKED")
        self.assertEqual(retained["attempt"], {
            "id": PODMAN_BUILD_DB_ATTEMPT_DIR.name,
            "sequence": 1,
            "namingRule": "r1-v3-podman-execution-attempt-YYYYMMDD-NNNN",
        })
        self.assertEqual(retained["failure"], {
            "classification": "COMMAND_EXIT_NONZERO",
            "commandId": "build-db",
            "reason": "V3_PODMAN_GATE_FAILED: build-db",
            "stage": "build-db",
        })
        command = retained["commands"][0]
        self.assertEqual(command["argv"], list(BUILDS[0]))
        self.assertFalse(command["network"])
        self.assertEqual(command["exitCode"], 1)
        self.assertEqual(command["stdout"], _reference(PODMAN_BUILD_DB_STDOUT))
        self.assertEqual(command["stderr"], _reference(PODMAN_BUILD_DB_STDERR))
        self.assertEqual(
            command["actualExecutor"]["payloadArgv"],
            [
                "/usr/local/bin/node",
                "/opt/pnpm/bin/pnpm.mjs",
                "--filter",
                "@reading-advantage/db",
                "build",
                "--store-dir=/root/.local/share/pnpm/store/v11",
            ],
        )
        self.assertEqual(
            PODMAN_BUILD_DB_STDERR.read_text(encoding="utf-8"),
            "$ tsc --project tsconfig.build.json --store-dir=/root/.local/share/pnpm/store/v11\n",
        )
        self.assertEqual(
            PODMAN_BUILD_DB_STDOUT.read_text(encoding="utf-8"),
            "error TS5023: Unknown compiler option '--store-dir=/root/.local/share/pnpm/store/v11'.\n"
            "/work/packages/db:\n"
            "[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @reading-advantage/db@0.1.0 build: `tsc --project tsconfig.build.json --store-dir=/root/.local/share/pnpm/store/v11`\n"
            "Exit status 1\n",
        )
        self.assertFalse(V3_DIR.exists())

        podman = importlib.import_module("measure.business_operations_graph_baseline_execution_closure_v3_podman")
        build_payload = getattr(podman, "build_pnpm_global_store_payload_v1", None)
        error_type = getattr(importlib.import_module(HELPER_MODULE), "ExecutionClosureValidationError", None)
        self.assertTrue(callable(build_payload), "V3_PNPM_GLOBAL_STORE_PAYLOAD_BUILDER_MISSING")
        self.assertTrue(isinstance(error_type, type) and issubclass(error_type, Exception))

        scoped_commands = [*BUILDS, STANDARD_PACK_GENERATOR, *[argv for _, argv in FR4]]
        for logical in scoped_commands:
            original_logical = list(logical)
            payload = build_payload(logical)
            self.assertEqual(logical, original_logical, "payload construction must not rewrite source intent")
            self.assertEqual(
                payload,
                [
                    "/usr/local/bin/node",
                    "/opt/pnpm/bin/pnpm.mjs",
                    "--config.store-dir=/root/.local/share/pnpm/store/v11",
                    *logical[1:],
                ],
            )
            self.assertEqual(payload[2], "--config.store-dir=/root/.local/share/pnpm/store/v11")
            self.assertLess(payload.index("--config.store-dir=/root/.local/share/pnpm/store/v11"), payload.index("--filter"))
            self.assertEqual(payload[3:], logical[1:])
        with self.assertRaises(error_type):
            build_payload(["node", "--version"])

        self.assertEqual(_sha256(PODMAN_BUILD_DB_ATTEMPT.read_bytes()), PODMAN_BUILD_DB_ATTEMPT_SHA256)
        self.assertEqual(PODMAN_BUILD_DB_ATTEMPT.stat().st_size, PODMAN_BUILD_DB_ATTEMPT_SIZE)

    def test_hermetic_pnpm_failures_publish_classified_append_only_attempts_on_the_run_day(self) -> None:
        """Requires the failed-attempt publisher to retain classified hermetic pnpm outcomes.

        @returns Nothing; assertions exercise only a temporary attempt root and preserve the legacy record.
        """
        self.assertEqual(_sha256(PODMAN_ATTEMPT.read_bytes()), PODMAN_ATTEMPT_SHA256)
        retained_attempt = _load_json(PODMAN_ATTEMPT, self)
        retained_command = retained_attempt["commands"][0]
        self.assertEqual(retained_attempt["attempt"]["id"], PODMAN_ATTEMPT_DIR.name)
        self.assertEqual(retained_attempt["failure"]["classification"], "COMMAND_EXIT_NONZERO")
        self.assertNotIn("hermeticPnpmInstallContract", retained_attempt)
        self.assertNotIn("externalStop", retained_attempt["failure"])
        self.assertNotIn("packageManagerDiagnostic", retained_attempt["failure"])

        podman = importlib.import_module("measure.business_operations_graph_baseline_execution_closure_v3_podman")
        publisher = getattr(podman, "_publish_failed_attempt", None)
        validator = getattr(podman, "validate_failed_execution_attempt_v1", None)
        error_type = getattr(importlib.import_module(HELPER_MODULE), "ExecutionClosureValidationError", None)
        self.assertTrue(callable(publisher), "V3_PODMAN_FAILED_ATTEMPT_PUBLISHER_MISSING")
        self.assertTrue(callable(validator), "V3_PODMAN_FAILED_ATTEMPT_VALIDATOR_MISSING")
        self.assertTrue(isinstance(error_type, type) and issubclass(error_type, Exception))
        required_publisher_parameters = {
            "reason",
            "commands",
            "error",
            "hermetic_pnpm_contract",
            "external_stop",
            "attempts_root",
            "attempt_date",
        }
        self.assertTrue(
            required_publisher_parameters <= set(inspect.signature(publisher).parameters),
            "V3_HERMETIC_PNPM_FAILED_ATTEMPT_PUBLISHER_INTEGRATION_MISSING",
        )

        frozen_entries = _load_json(V2_ARCHIVE, self)["entries"]
        contract = podman.build_hermetic_pnpm_install_contract_v1(frozen_entries, "11.8.0")

        def staged_offline_install(
            raw_directory: Path,
            raw_id: str,
            *,
            exit_code: int,
            stdout: str,
            stderr: str,
        ) -> dict[str, Any]:
            stdout_path = raw_directory / f"{raw_id}.stdout.txt"
            stderr_path = raw_directory / f"{raw_id}.stderr.txt"
            stdout_path.write_text(stdout, encoding="utf-8")
            stderr_path.write_text(stderr, encoding="utf-8")
            command = copy.deepcopy(retained_command)
            command.pop("stdout")
            command.pop("stderr")
            command["argv"] = list(HERMETIC_PNPM_INSTALL)
            command["exitCode"] = exit_code
            command["registryAttestation"] = {"requests": 0, "retryEvents": 0}
            executor = command["actualExecutor"]
            payload = [
                "/usr/local/bin/node",
                "/opt/pnpm/bin/pnpm.mjs",
                *HERMETIC_PNPM_PAYLOAD_SUFFIX,
            ]
            image_index = executor["argv"].index(podman.IMAGE_RESOLVED)
            executor["logicalArgv"] = list(HERMETIC_PNPM_INSTALL)
            executor["payloadArgv"] = payload
            executor["argv"] = [
                *executor["argv"][:image_index],
                podman.IMAGE_RESOLVED,
                "/usr/bin/env",
                "-i",
                "CI=true",
                "PATH=/usr/local/bin:/usr/bin:/bin",
                *payload,
            ]
            command["_rawId"] = raw_id
            command["_stdoutPath"] = stdout_path
            command["_stderrPath"] = stderr_path
            return command

        with tempfile.TemporaryDirectory() as temporary:
            attempts_root = Path(temporary)
            # A prior dated attempt cannot make a later run-day reuse its directory or ordinal.
            (attempts_root / "r1-v3-podman-execution-attempt-20260801-0001").mkdir()
            raw = attempts_root / "staged-raw"
            raw.mkdir()

            package_command = staged_offline_install(
                raw,
                "offline-package-manager",
                exit_code=1,
                stdout="",
                stderr="ERR_PNPM_NO_OFFLINE_META Missing metadata in offline store\n",
            )
            publisher(
                "offline-install",
                [package_command],
                error_type("V3_PODMAN_GATE_FAILED: offline-install"),
                hermetic_pnpm_contract=contract,
                external_stop=None,
                attempts_root=attempts_root,
                attempt_date="20260802",
            )
            package_directory = attempts_root / "r1-v3-podman-execution-attempt-20260802-0001"
            package_attempt = _load_json(package_directory / "failed-attempt.json", self)
            self.assertEqual(
                package_attempt["attempt"],
                {
                    "id": package_directory.name,
                    "sequence": 1,
                    "namingRule": "r1-v3-podman-execution-attempt-YYYYMMDD-NNNN",
                },
            )
            self.assertEqual(package_attempt["historicalBlocker"], _reference(PODMAN_BLOCKER))
            self.assertEqual(package_attempt["hermeticPnpmInstallContract"], contract)
            self.assertEqual(
                package_attempt["failure"],
                {
                    "stage": "offline-install",
                    "reason": "V3_PODMAN_GATE_FAILED: offline-install",
                    "classification": "PACKAGE_MANAGER_FAILURE",
                    "commandId": "offline-install",
                    "packageManagerDiagnostic": {
                        "code": "ERR_PNPM_NO_OFFLINE_META",
                        "stream": "stderr",
                    },
                    "externalStop": None,
                    "registryAttestation": {"requests": 0, "retryEvents": 0},
                },
            )
            self.assertEqual(package_attempt["commands"][0]["registryAttestation"], {"requests": 0, "retryEvents": 0})
            validator(package_attempt, package_directory)

            external_stop = {
                "kind": "EXTERNAL_SUPERVISOR_STOP",
                "signal": "SIGKILL",
                "actor": "operator",
                "reason": "EXPLICIT_TIME_BOUND",
            }
            interrupted_command = staged_offline_install(
                raw,
                "offline-external-stop",
                exit_code=137,
                stdout="",
                stderr="",
            )
            publisher(
                "offline-install",
                [interrupted_command],
                error_type("V3_PODMAN_GATE_FAILED: offline-install"),
                hermetic_pnpm_contract=contract,
                external_stop=external_stop,
                attempts_root=attempts_root,
                attempt_date="20260802",
            )
            external_directory = attempts_root / "r1-v3-podman-execution-attempt-20260802-0002"
            external_attempt = _load_json(external_directory / "failed-attempt.json", self)
            self.assertEqual(external_attempt["historicalBlocker"], _reference(PODMAN_BLOCKER))
            self.assertEqual(external_attempt["hermeticPnpmInstallContract"], contract)
            self.assertEqual(
                external_attempt["failure"],
                {
                    "stage": "offline-install",
                    "reason": "V3_PODMAN_GATE_FAILED: offline-install",
                    "classification": "EXTERNAL_INTERRUPTION",
                    "commandId": "offline-install",
                    "packageManagerDiagnostic": None,
                    "externalStop": external_stop,
                    "registryAttestation": {"requests": 0, "retryEvents": 0},
                },
            )
            validator(external_attempt, external_directory)

            self.assertEqual(_sha256(PODMAN_ATTEMPT.read_bytes()), PODMAN_ATTEMPT_SHA256)
            self.assertEqual(PODMAN_ATTEMPT.stat().st_size, PODMAN_ATTEMPT_SIZE)
            self.assertFalse(V3_DIR.exists())

    def test_v3_podman_network_boundary_is_route_proven_for_all_execution(self) -> None:
        """Requires a route-proven Podman network-none boundary for every v3 operation.

        @returns Nothing; assertions reject host-network, inherited-environment, and mount escape claims.
        """
        manifest, archive, ledger, profile, receipt, graph_binding, clean_audit, compensation, validator, error_type = self._load_v3()
        isolation = profile["containerIsolation"]
        self.assertEqual(
            set(isolation),
            {
                "podman",
                "image",
                "networkMode",
                "podmanRunArgvPrefix",
                "cleanWorkRoot",
                "mounts",
                "bootstrapEnvironment",
                "recursiveInventories",
                "networkProof",
                "declaredExecutorPaths",
            },
        )
        self.assertEqual(isolation["networkMode"], "none")
        self.assertNotIn("systemd-run", json.dumps(isolation, sort_keys=True))

        def assert_track_reference(reference: dict[str, Any]) -> None:
            self.assertEqual(set(reference), {"path", "sha256", "size"})
            self.assertTrue(reference["path"].startswith("r1-v3-execution-closure-20260801/raw/"))
            self.assertEqual(reference, _reference(TRACK_DIR / reference["path"]))

        def assert_command_streams(command: dict[str, Any]) -> None:
            self.assertEqual(command["cwd"], ".")
            self.assertEqual(command["env"], {"CI": "true"})
            self.assertIn("PG_TEST_URL", command["envAbsent"])
            self.assertFalse(command["network"])
            for stream in ("stdout", "stderr"):
                assert_track_reference(command[stream])

        podman = isolation["podman"]
        self.assertEqual(set(podman), {"path", "version", "versionCommand"})
        self.assertEqual(podman["path"], "/usr/bin/podman")
        self.assertTrue(podman["version"])
        self.assertEqual(podman["versionCommand"]["argv"], ["/usr/bin/podman", "--version"])
        self.assertEqual(podman["versionCommand"]["exitCode"], 0)
        assert_command_streams(podman["versionCommand"])

        image = isolation["image"]
        self.assertEqual(set(image), {"reference", "digest", "resolvedReference", "architecture", "inspectCommand"})
        self.assertEqual(image["reference"], "node:22-slim")
        self.assertRegex(image["digest"], r"^sha256:[0-9a-f]{64}$")
        self.assertEqual(image["resolvedReference"], f'{image["reference"]}@{image["digest"]}')
        self.assertIn(image["architecture"], {"amd64", "arm64"})
        self.assertEqual(
            image["inspectCommand"]["argv"],
            ["/usr/bin/podman", "image", "inspect", image["resolvedReference"]],
        )
        self.assertEqual(image["inspectCommand"]["exitCode"], 0)
        assert_command_streams(image["inspectCommand"])

        run_prefix = isolation["podmanRunArgvPrefix"]
        self.assertEqual(run_prefix[:5], ["/usr/bin/podman", "run", "--rm", "--network", "none"])
        self.assertEqual(run_prefix.count("--rm"), 1)
        self.assertEqual(run_prefix.count("--network"), 1)
        self.assertNotIn("--network=host", run_prefix)
        self.assertIn("--workdir", run_prefix)
        self.assertIn("/work", run_prefix)

        work_root = isolation["cleanWorkRoot"]
        self.assertEqual(set(work_root), {"hostPath", "realpath", "containerPath", "preexistingPaths", "lifecycle"})
        self.assertTrue(Path(work_root["hostPath"]).is_absolute())
        self.assertTrue(Path(work_root["realpath"]).is_absolute())
        tmp_root = Path("/tmp").resolve()
        self.assertIn(tmp_root, Path(work_root["hostPath"]).resolve().parents)
        self.assertIn(tmp_root, Path(work_root["realpath"]).resolve().parents)
        self.assertEqual(work_root["containerPath"], "/work")
        self.assertEqual(work_root["preexistingPaths"], [])
        self.assertEqual(work_root["lifecycle"], "UNIQUE_EPHEMERAL")

        mounts = {mount["id"]: mount for mount in isolation["mounts"]}
        self.assertEqual(len(mounts), len(isolation["mounts"]))
        self.assertTrue({"work", "pnpmLauncher", "pnpmStore", "repoGraph"} <= set(mounts))
        self.assertTrue(all(mount_id in {"work", "pnpmLauncher", "pnpmStore", "repoGraph"} or mount_id.startswith("runnerTool:") for mount_id in mounts))
        self.assertEqual(mounts["work"], {
            "id": "work",
            "source": work_root["realpath"],
            "target": "/work",
            "access": "rw",
            "purpose": "clean-materialized-closure",
        })
        for mount_id in ("pnpmLauncher", "repoGraph"):
            mount = mounts[mount_id]
            self.assertEqual(set(mount), {"id", "source", "target", "access", "purpose"})
            self.assertTrue(Path(mount["source"]).is_absolute())
            self.assertTrue(Path(mount["target"]).is_absolute())
            self.assertEqual(mount["access"], "ro")
        store_mount = mounts["pnpmStore"]
        self.assertEqual(
            set(store_mount),
            {"id", "source", "target", "access", "lowerAccess", "overlay", "purpose"},
        )
        self.assertTrue(Path(store_mount["source"]).is_absolute())
        self.assertTrue(Path(store_mount["target"]).is_absolute())
        self.assertEqual(store_mount["access"], "cow-overlay")
        self.assertEqual(store_mount["lowerAccess"], "ro")
        self.assertEqual(store_mount["overlay"], "podman-O-disposable")
        for mount_id, mount in mounts.items():
            if mount_id.startswith("runnerTool:"):
                self.assertEqual(set(mount), {"id", "source", "target", "access", "purpose"})
                self.assertTrue(Path(mount["source"]).is_absolute())
                self.assertTrue(Path(mount["target"]).is_absolute())
                self.assertEqual(mount["access"], "ro")

        bootstrap = isolation["bootstrapEnvironment"]
        self.assertEqual(set(bootstrap), {"PATH"})
        self.assertTrue(bootstrap["PATH"])
        self.assertNotIn(str(REPO_ROOT), bootstrap["PATH"])
        declared_executors = isolation["declaredExecutorPaths"]
        self.assertTrue(declared_executors)
        self.assertEqual(len(declared_executors), len(set(declared_executors)))
        self.assertTrue(all(Path(path).is_absolute() for path in declared_executors))

        inventories = isolation["recursiveInventories"]
        inventory_mount_ids = {"pnpmLauncher", "pnpmStore", "repoGraph"} | {
            mount_id for mount_id in mounts if mount_id.startswith("runnerTool:")
        }
        self.assertEqual(set(inventories), inventory_mount_ids)
        for name, evidence in inventories.items():
            self.assertEqual(set(evidence), {"mount", "algorithm", "pre", "post"})
            self.assertEqual(evidence["mount"], mounts[name])
            self.assertEqual(evidence["algorithm"], "recursive-path-metadata-sha256-v1")
            self.assertEqual(evidence["pre"], evidence["post"])
            self.assertTrue({"entryCount", "sha256", "command"} <= set(evidence["pre"]))
            self.assertRegex(evidence["pre"]["sha256"], r"^[0-9a-f]{64}$")
            inventory_command = evidence["pre"]["command"]
            self.assertEqual(inventory_command["exitCode"], 0)
            assert_command_streams(inventory_command)
            inventory_stdout = json.loads(
                (TRACK_DIR / inventory_command["stdout"]["path"]).read_text(encoding="utf-8")
            )
            self.assertEqual(
                inventory_stdout,
                {"entryCount": evidence["pre"]["entryCount"], "sha256": evidence["pre"]["sha256"]},
            )
            payload = inventory_command["actualExecutor"]["payloadArgv"]
            self.assertEqual(payload[0], "/usr/local/bin/node")
            self.assertIn("-e", payload)
            inventory_program = payload[payload.index("-e") + 1]
            self.assertIn("require(", inventory_program)
            self.assertNotRegex(inventory_program, r"\bimport\b")

        def assert_container_executor(executor: dict[str, Any], logical_argv: list[str]) -> None:
            self.assertEqual(executor["logicalArgv"], logical_argv)
            self.assertEqual(executor["environment"], {"CI": "true"})
            self.assertEqual(
                executor["effectiveEnvironment"],
                {"CI": "true", "PATH": bootstrap["PATH"]},
            )
            self.assertEqual(executor["inheritedEnv"], [])
            self.assertTrue(executor["payloadArgv"])
            self.assertTrue(Path(executor["payloadArgv"][0]).is_absolute())
            self.assertIn(executor["payloadArgv"][0], declared_executors)
            expected_prefix = run_prefix + [
                image["resolvedReference"],
                "/usr/bin/env",
                "-i",
                "CI=true",
                f'PATH={bootstrap["PATH"]}',
            ]
            self.assertEqual(executor["argv"][:len(expected_prefix)], expected_prefix)
            self.assertEqual(executor["argv"][len(expected_prefix):], executor["payloadArgv"])

        for command in receipt["commands"]:
            assert_container_executor(command["actualExecutor"], command["argv"])
        graph_executor = graph_binding["containerExecution"]
        assert_container_executor(graph_executor, ["repo-graph", "scan", ".", "./graph.db"])
        self.assertEqual(graph_binding["scanCommand"], "repo-graph scan . ./graph.db")

        runtime_audit = receipt["realpathAudit"]["containerRuntime"]
        self.assertEqual(
            runtime_audit,
            {
                "sourcePathsOutsideWork": [],
                "outsideWorkPaths": declared_executors,
            },
        )

        network_proof = isolation["networkProof"]
        self.assertEqual(set(network_proof), {"route", "dns", "tcp"})
        route = network_proof["route"]
        self.assertEqual(route["kind"], "ROUTE_TABLE")
        self.assertEqual(route["exitCode"], 0)
        assert_container_executor(route["actualExecutor"], route["argv"])
        assert_track_reference(route["stdout"])
        assert_track_reference(route["stderr"])
        route_lines = (TRACK_DIR / route["stdout"]["path"]).read_text(encoding="utf-8").splitlines()
        self.assertTrue(route_lines)
        self.assertTrue(route_lines[0].startswith("Iface"))
        self.assertEqual([line for line in route_lines[1:] if line.strip()], [])
        def assert_commonjs_probe(record: dict[str, Any]) -> str:
            payload = record["actualExecutor"]["payloadArgv"]
            self.assertEqual(payload[0], "/usr/local/bin/node")
            self.assertIn("-e", payload)
            program = payload[payload.index("-e") + 1]
            self.assertIn("require(", program)
            self.assertNotRegex(program, r"\bimport\b")
            return program

        dns = network_proof["dns"]
        self.assertEqual(dns["kind"], "DNS_NEGATIVE")
        self.assertNotEqual(dns["exitCode"], 0)
        self.assertEqual(dns["resolvedAddresses"], [])
        assert_container_executor(dns["actualExecutor"], dns["argv"])
        assert_track_reference(dns["stdout"])
        assert_track_reference(dns["stderr"])
        self.assertEqual((TRACK_DIR / dns["stdout"]["path"]).read_text(encoding="utf-8").strip(), "")
        dns_result = json.loads((TRACK_DIR / dns["stderr"]["path"]).read_text(encoding="utf-8"))
        self.assertEqual(set(dns_result), {"kind", "code"})
        self.assertEqual(dns_result["kind"], "DNS_NEGATIVE")
        self.assertIsInstance(dns_result["code"], str)
        self.assertTrue(dns_result["code"])
        self.assertEqual(dns_result["code"], dns["errorCode"])
        assert_commonjs_probe(dns)
        tcp = network_proof["tcp"]
        self.assertEqual(tcp["kind"], "TCP_NEGATIVE")
        self.assertNotEqual(tcp["exitCode"], 0)
        self.assertFalse(tcp["connected"])
        assert_container_executor(tcp["actualExecutor"], tcp["argv"])
        assert_track_reference(tcp["stdout"])
        assert_track_reference(tcp["stderr"])
        self.assertEqual((TRACK_DIR / tcp["stdout"]["path"]).read_text(encoding="utf-8").strip(), "")
        tcp_result = json.loads((TRACK_DIR / tcp["stderr"]["path"]).read_text(encoding="utf-8"))
        self.assertEqual(set(tcp_result), {"kind", "reason", "code"})
        self.assertEqual(tcp_result["kind"], "TCP_NEGATIVE")
        self.assertIn(tcp_result["reason"], {"error", "timeout"})
        self.assertIsInstance(tcp_result["code"], str)
        self.assertTrue(tcp_result["code"])
        self.assertEqual(tcp_result["code"], tcp["errorCode"])
        assert_commonjs_probe(tcp)

        validator(manifest, archive, ledger, profile, receipt, graph_binding, clean_audit, compensation)
        bad_profile = copy.deepcopy(profile)
        bad_profile["containerIsolation"]["networkMode"] = "host"
        with self.assertRaises(error_type):
            validator(manifest, archive, ledger, bad_profile, receipt, graph_binding, clean_audit, compensation)
        bad_receipt = copy.deepcopy(receipt)
        bad_executor = bad_receipt["commands"][0]["actualExecutor"]
        bad_executor["argv"][4] = "host"
        with self.assertRaises(error_type):
            validator(manifest, archive, ledger, profile, bad_receipt, graph_binding, clean_audit, compensation)
        bad_graph = copy.deepcopy(graph_binding)
        bad_graph.pop("containerExecution")
        with self.assertRaises(error_type):
            validator(manifest, archive, ledger, profile, receipt, bad_graph, clean_audit, compensation)



if __name__ == "__main__":
    unittest.main()
