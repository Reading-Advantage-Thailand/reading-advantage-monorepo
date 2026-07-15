#!/usr/bin/env python3
"""Focused contracts for the TypeScript 7 Phase 3 real-parity recorder."""

from __future__ import annotations

import importlib.util
import json
import re
import subprocess
import tempfile
import unittest
from pathlib import Path
from types import ModuleType


REPO_ROOT = Path(__file__).resolve().parents[2]
RUNNER_PATH = (
    REPO_ROOT
    / "measure"
    / "tracks"
    / "typescript7_native_migration_20260710"
    / "run-phase3-parity.py"
)
TYPES_PACKAGE_PATH = REPO_ROOT / "packages" / "types" / "package.json"
DB_PACKAGE_PATH = REPO_ROOT / "packages" / "db" / "package.json"
DOMAIN_PACKAGE_PATH = REPO_ROOT / "packages" / "domain" / "package.json"
PHASE3D_CUTOVER_ORDER = (
    "packages/types",
    "packages/db",
    "packages/domain",
    "packages/auth",
    "packages/ui",
    "packages/utils",
    "packages/integrations/github",
    "apps/advantage-games",
    "apps/science-advantage",
    "apps/primary-advantage",
    "apps/reading-advantage",
    "apps/codecamp-advantage",
    "apps/sales-advantage",
    "apps/marketing",
    "apps/www-reading-advantage",
    "apps/activity-vinext-fixture",
)


def _load_runner() -> ModuleType:
    """Load the phase-three runner from its track-local executable path.

    Returns:
        Imported parity-runner module.

    Raises:
        AssertionError: When the runner cannot be imported from the track.
    """
    specification = importlib.util.spec_from_file_location("typescript7_phase3_parity", RUNNER_PATH)
    if specification is None or specification.loader is None:
        raise AssertionError("unable to load TypeScript 7 Phase 3 parity runner")
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    return module


class Phase3ParityRecorderContract(unittest.TestCase):
    """Verify denominator, compiler identity, and evidence-persistence boundaries."""

    @classmethod
    def setUpClass(cls) -> None:
        """Load the live Phase 3 runner once for all focused contract checks."""
        cls.runner = _load_runner()

    def test_live_tracked_surface_matches_the_inventory(self) -> None:
        """Requires the runner's denominator to remain the exact 39 tracked configs."""
        paths = self.runner._load_config_paths()
        self.assertEqual(len(paths), 39)
        self.assertEqual(len(set(paths)), 39)
        self.assertTrue(all(path.startswith(("apps/", "packages/")) for path in paths))

    def test_exact_compiler_identities_are_observed_not_asserted(self) -> None:
        """Requires the live compiler executables to report the exact alias versions."""
        ts6 = self.runner._compiler_identity(self.runner.TS6_TSC, "6.0.2")
        ts7 = self.runner._compiler_identity(self.runner.TS7_TSC, "7.0.2")
        self.assertEqual(ts6["version_output"], "Version 6.0.2")
        self.assertEqual(ts7["version_output"], "Version 7.0.2")
        self.assertNotEqual(ts6["path"], ts7["path"])
        self.assertRegex(ts6["executable_sha256"], r"^[a-f0-9]{64}$")
        self.assertRegex(ts7["package_json_sha256"], r"^[a-f0-9]{64}$")
        node = self.runner._node_identity()
        self.assertTrue(node["version_output"].startswith("v"))
        self.assertRegex(node["executable_sha256"], r"^[a-f0-9]{64}$")
        ts6_command = self.runner._command(
            self.runner.TS6_TSC, "packages/types/tsconfig.json"
        )
        self.assertEqual(ts6_command[0], str(self.runner.NODE_EXECUTABLE.resolve()))
        self.assertIn("--max-old-space-size=3072", ts6_command)
        self.assertIn("--stableTypeOrdering", ts6_command)

    def test_persisted_streams_are_the_supplied_pair_without_rerunning(self) -> None:
        """Persists supplied raw streams under config-specific filenames without launching tools."""
        streams = {
            "ts6": {"stdout": "six output\n", "stderr": ""},
            "ts7": {"stdout": "seven output\n", "stderr": "seven error\n"},
        }
        with tempfile.TemporaryDirectory() as temporary_directory:
            output_dir = Path(temporary_directory)
            files = self.runner._persist_raw_streams(
                output_dir,
                "packages/example/tsconfig.json",
                streams,
            )
            self.assertEqual(
                (output_dir / files["ts6"]["stdout"]).read_text(encoding="utf-8"),
                "six output\n",
            )
            self.assertEqual(
                (output_dir / files["ts7"]["stderr"]).read_text(encoding="utf-8"),
                "seven error\n",
            )
            self.assertTrue(files["ts6"]["stdout"].endswith(".txt"))
            ignored = subprocess.run(
                [
                    "git",
                    "check-ignore",
                    "-q",
                    "measure/tracks/typescript7_native_migration_20260710/evidence/"
                    "phase-3c-parity/provenance-contract.txt",
                ],
                cwd=REPO_ROOT,
                check=False,
            )
            self.assertNotEqual(ignored.returncode, 0)

    def test_provenance_binds_configs_and_rejects_a_changed_snapshot(self) -> None:
        """Captures mutable inputs at both endpoints and fails closed on any mutation."""
        paths = self.runner._load_config_paths()
        with tempfile.TemporaryDirectory(dir=REPO_ROOT) as temporary_directory:
            output_dir = Path(temporary_directory)
            start = self.runner._capture_provenance(paths, output_dir)
            end = self.runner._capture_provenance(paths, output_dir)
        self.assertTrue(self.runner._provenance_is_stable(start, end))
        self.assertEqual(len(start["tsconfig_sha256"]), 39)
        self.assertRegex(start["pnpm_lock_sha256"], r"^[a-f0-9]{64}$")
        self.assertEqual(start["compiler_identity"]["typescript7"]["version_output"], "Version 7.0.2")
        changed = json.loads(json.dumps(end))
        changed["tsconfig_sha256"][paths[0]] = "0" * 64
        self.assertFalse(self.runner._provenance_is_stable(start, changed))

    def test_manifest_hashes_every_persisted_raw_artifact(self) -> None:
        """Includes the non-ignored raw pair files and ledger snapshot in the manifest."""
        with tempfile.TemporaryDirectory() as temporary_directory:
            output_dir = Path(temporary_directory)
            self.runner._persist_raw_streams(
                output_dir,
                "packages/example/tsconfig.json",
                {
                    "ts6": {"stdout": "six\n", "stderr": ""},
                    "ts7": {"stdout": "seven\n", "stderr": ""},
                },
            )
            self.runner._persist_ledger_snapshot(output_dir, b"[]\n")
            self.runner._write_manifest(output_dir)
            manifest = json.loads((output_dir / "manifest.json").read_text(encoding="utf-8"))
        names = {item["path"] for item in manifest["files"]}
        self.assertIn("packages__example__tsconfig.ts6.stdout.txt", names)
        self.assertIn("diagnostic-parity-ledger.snapshot.json", names)

    def test_signaled_compiler_record_is_not_a_ledgerable_difference(self) -> None:
        """Classifies a signal abort as a runtime failure while retaining its raw streams."""
        streams = {
            "ts6": {"stdout": "", "stderr": "FATAL ERROR: heap out of memory\n"},
            "ts7": {"stdout": "error TS9999: retained output\n", "stderr": ""},
        }
        with tempfile.TemporaryDirectory() as temporary_directory:
            record = self.runner._rejected_record(
                Path(temporary_directory),
                "apps/example/tsconfig.json",
                "compiler runtime failure: ts6 terminated by signal 6",
                streams,
                [{"exit_status": -6}, {"exit_status": 1}],
            )
        self.assertEqual(record["status"], "compiler_runtime_failure")
        self.assertEqual(record["subprocess_evidence"][0]["exit_status"], -6)
        self.assertEqual(record["ts6"]["diagnostics"], [])


class Phase3dCheckTypesCutoverContract(unittest.TestCase):
    """Verify the first workspace selects each compiler by its exact alias path."""

    NATIVE_COMMAND = "node ../../node_modules/typescript7/bin/tsc --noEmit"
    COMPAT_COMMAND = "node ../../node_modules/typescript/bin/tsc --noEmit"

    def test_types_workspace_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the first cutover workspace to avoid the unstable hoisted `tsc` shim."""
        manifest = json.loads(TYPES_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), self.NATIVE_COMMAND)
        self.assertEqual(scripts.get("check-types:compat"), self.COMPAT_COMMAND)
        self.assertEqual(scripts.get("check-types:rollback"), self.COMPAT_COMMAND)

    def test_workspace_scripts_do_not_use_the_ambiguous_hoisted_tsc_shim(self) -> None:
        """Rejects a bare `tsc` invocation that can silently select the alias last linked by pnpm."""
        bare_tsc = re.compile(r"(?:^|&&\s+)tsc(?:\s|$)")
        offenders: list[str] = []
        package_manifests = sorted(
            package_json
            for root in (REPO_ROOT / "apps", REPO_ROOT / "packages")
            for package_json in root.rglob("package.json")
        )
        for package_json in package_manifests:
            if "node_modules" in package_json.parts:
                continue
            manifest = json.loads(package_json.read_text(encoding="utf-8"))
            scripts = manifest.get("scripts", {})
            if not isinstance(scripts, dict):
                continue
            for name, command in scripts.items():
                if isinstance(command, str) and bare_tsc.search(command):
                    offenders.append(f"{package_json.relative_to(REPO_ROOT)}:{name}")
        self.assertEqual(offenders, [], f"ambiguous bare tsc scripts: {offenders}")

    def test_direct_compiler_script_paths_resolve_and_emit_stays_on_typescript6(self) -> None:
        """Requires every direct compiler script to resolve from its workspace and defers emit migration."""
        compiler_path = re.compile(
            r"node\\s+(?P<path>\\S*node_modules/(?:typescript7|typescript)/bin/tsc)"
        )
        missing: list[str] = []
        premature_emit_cutovers: list[str] = []
        for root in (REPO_ROOT / "apps", REPO_ROOT / "packages"):
            for package_json in root.rglob("package.json"):
                if "node_modules" in package_json.parts:
                    continue
                manifest = json.loads(package_json.read_text(encoding="utf-8"))
                scripts = manifest.get("scripts", {})
                if not isinstance(scripts, dict):
                    continue
                for name, command in scripts.items():
                    if not isinstance(command, str):
                        continue
                    for match in compiler_path.finditer(command):
                        candidate = (package_json.parent / match.group("path")).resolve()
                        if not candidate.is_file():
                            missing.append(
                                f"{package_json.relative_to(REPO_ROOT)}:{name}:{match.group('path')}"
                            )
                    if name == "build" and "typescript7/bin/tsc" in command:
                        premature_emit_cutovers.append(
                            f"{package_json.relative_to(REPO_ROOT)}:{name}"
                        )
        self.assertEqual(missing, [], f"unresolvable direct compiler paths: {missing}")
        self.assertEqual(
            premature_emit_cutovers,
            [],
            f"TypeScript 7 emit migration is reserved for Phase 3e: {premature_emit_cutovers}",
        )

    def test_db_workspace_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the second ordered workspace to preserve the direct dual-compiler paths."""
        manifest = json.loads(DB_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), self.NATIVE_COMMAND)
        self.assertEqual(scripts.get("check-types:compat"), self.COMPAT_COMMAND)
        self.assertEqual(scripts.get("check-types:rollback"), self.COMPAT_COMMAND)

    def test_domain_workspace_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the third ordered workspace to preserve the direct dual-compiler paths."""
        manifest = json.loads(DOMAIN_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), self.NATIVE_COMMAND)
        self.assertEqual(scripts.get("check-types:compat"), self.COMPAT_COMMAND)
        self.assertEqual(scripts.get("check-types:rollback"), self.COMPAT_COMMAND)

    def test_native_workspace_cutovers_follow_the_required_strict_prefix(self) -> None:
        """Rejects a native check-types switch that skips an earlier workspace in the acceptance order."""
        flipped: list[str] = []
        for workspace in PHASE3D_CUTOVER_ORDER:
            manifest_path = REPO_ROOT / workspace / "package.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            scripts = manifest.get("scripts", {})
            if not isinstance(scripts, dict):
                continue
            check_types = scripts.get("check-types")
            if isinstance(check_types, str) and "typescript7/bin/tsc" in check_types:
                flipped.append(workspace)
        self.assertEqual(
            flipped,
            list(PHASE3D_CUTOVER_ORDER[: len(flipped)]),
            f"TypeScript 7 check-types cutovers must be a strict ordered prefix: {flipped}",
        )


if __name__ == "__main__":
    unittest.main()
