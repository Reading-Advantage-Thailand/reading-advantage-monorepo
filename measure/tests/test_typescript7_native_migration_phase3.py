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
ROOT_PACKAGE_PATH = REPO_ROOT / "package.json"
TURBO_CONFIG_PATH = REPO_ROOT / "turbo.json"
DECLARATION_EMIT_LEDGER_PATH = (
    REPO_ROOT
    / "measure"
    / "tracks"
    / "typescript7_native_migration_20260710"
    / "declaration-emit-diff-ledger.json"
)
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
AUTH_PACKAGE_PATH = REPO_ROOT / "packages" / "auth" / "package.json"
UI_PACKAGE_PATH = REPO_ROOT / "packages" / "ui" / "package.json"
UTILS_PACKAGE_PATH = REPO_ROOT / "packages" / "utils" / "package.json"
GITHUB_INTEGRATION_PACKAGE_PATH = REPO_ROOT / "packages" / "integrations" / "github" / "package.json"
ADVANTAGE_GAMES_PACKAGE_PATH = REPO_ROOT / "apps" / "advantage-games" / "package.json"
SCIENCE_ADVANTAGE_PACKAGE_PATH = REPO_ROOT / "apps" / "science-advantage" / "package.json"
PRIMARY_ADVANTAGE_PACKAGE_PATH = REPO_ROOT / "apps" / "primary-advantage" / "package.json"
READING_ADVANTAGE_PACKAGE_PATH = REPO_ROOT / "apps" / "reading-advantage" / "package.json"
CODECAMP_ADVANTAGE_PACKAGE_PATH = REPO_ROOT / "apps" / "codecamp-advantage" / "package.json"
SALES_ADVANTAGE_PACKAGE_PATH = REPO_ROOT / "apps" / "sales-advantage" / "package.json"
MARKETING_PACKAGE_PATH = REPO_ROOT / "apps" / "marketing" / "package.json"
WWW_READING_ADVANTAGE_PACKAGE_PATH = REPO_ROOT / "apps" / "www-reading-advantage" / "package.json"
ACTIVITY_VINEXT_FIXTURE_PACKAGE_PATH = REPO_ROOT / "apps" / "activity-vinext-fixture" / "package.json"
GAME_CONTRACTS_PACKAGE_PATH = REPO_ROOT / "packages" / "game-contracts" / "package.json"
KNOWLEDGE_SPACE_CORE_PACKAGE_PATH = REPO_ROOT / "packages" / "knowledge-space-core" / "package.json"
PRACTICE_CORE_PACKAGE_PATH = REPO_ROOT / "packages" / "practice-core" / "package.json"
ACTIVITY_TUTORIAL_PACKAGE_PATH = REPO_ROOT / "packages" / "activity-tutorial" / "package.json"
AI_PACKAGE_PATH = REPO_ROOT / "packages" / "ai" / "package.json"
AUTH_CLIENT_PACKAGE_PATH = REPO_ROOT / "packages" / "auth-client" / "package.json"
STORAGE_PACKAGE_PATH = REPO_ROOT / "packages" / "storage" / "package.json"
ADVANTAGE_PLAY_KIT_PACKAGE_PATH = REPO_ROOT / "packages" / "advantage-play-kit" / "package.json"
GAME_CARTRIDGES_PACKAGE_PATH = REPO_ROOT / "packages" / "game-cartridges" / "package.json"
ACTIVITY_RUNTIME_PACKAGE_PATH = REPO_ROOT / "packages" / "activity-runtime" / "package.json"
ACTIVITY_REACT_PACKAGE_PATH = REPO_ROOT / "packages" / "activity-react" / "package.json"
CODECAMP_KNOWLEDGE_PACKAGE_PATH = REPO_ROOT / "packages" / "codecamp-knowledge" / "package.json"
KNOWLEDGE_SPACE_PRACTICE_PACKAGE_PATH = REPO_ROOT / "packages" / "knowledge-space-practice" / "package.json"
SRS_ENGINE_PACKAGE_PATH = REPO_ROOT / "packages" / "srs-engine" / "package.json"
MASTERY_RUNTIME_COMPAT_PACKAGE_PATH = REPO_ROOT / "packages" / "mastery-runtime-compat" / "package.json"
API_PACKAGE_PATH = REPO_ROOT / "packages" / "api" / "package.json"
WEBHOOKS_PACKAGE_PATH = REPO_ROOT / "packages" / "webhooks" / "package.json"
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
    "packages/game-contracts",
    "packages/knowledge-space-core",
    "packages/practice-core",
    "packages/activity-tutorial",
    "packages/ai",
    "packages/auth-client",
    "packages/storage",
    "packages/advantage-play-kit",
    "packages/game-cartridges",
    "packages/activity-runtime",
    "packages/activity-react",
    "packages/codecamp-knowledge",
    "packages/knowledge-space-practice",
    "packages/srs-engine",
    "packages/mastery-runtime-compat",
    "packages/api",
    "packages/webhooks",
)
PHASE3E_ACCEPTED_EMIT_BUILD_WORKSPACES = (
    "packages/types",
    "packages/db",
    "packages/game-cartridges",
    "packages/integrations/github",
    "packages/storage",
    "packages/activity-tutorial",
    "packages/practice-core",
    "packages/advantage-play-kit",
    "packages/knowledge-space-core",
    "packages/auth",
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

    def _assert_standard_workspace_routing(self, manifest_path: Path) -> None:
        """Requires a standard-depth workspace to expose the exact reversible compiler routes."""
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), self.NATIVE_COMMAND)
        self.assertEqual(scripts.get("check-types:compat"), self.COMPAT_COMMAND)
        self.assertEqual(scripts.get("check-types:rollback"), self.COMPAT_COMMAND)

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
                    workspace = str(package_json.parent.relative_to(REPO_ROOT))
                    if (
                        name == "build"
                        and "typescript7/bin/tsc" in command
                        and workspace not in PHASE3E_ACCEPTED_EMIT_BUILD_WORKSPACES
                    ):
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

    def test_auth_workspace_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the fourth ordered workspace to preserve the direct dual-compiler paths."""
        manifest = json.loads(AUTH_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), self.NATIVE_COMMAND)
        self.assertEqual(scripts.get("check-types:compat"), self.COMPAT_COMMAND)
        self.assertEqual(scripts.get("check-types:rollback"), self.COMPAT_COMMAND)

    def test_ui_workspace_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the first shared workspace to declare native, compatibility, and rollback checks."""
        manifest = json.loads(UI_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), self.NATIVE_COMMAND)
        self.assertEqual(scripts.get("check-types:compat"), self.COMPAT_COMMAND)
        self.assertEqual(scripts.get("check-types:rollback"), self.COMPAT_COMMAND)

    def test_utils_workspace_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the second shared workspace to declare native, compatibility, and rollback checks."""
        manifest = json.loads(UTILS_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), self.NATIVE_COMMAND)
        self.assertEqual(scripts.get("check-types:compat"), self.COMPAT_COMMAND)
        self.assertEqual(scripts.get("check-types:rollback"), self.COMPAT_COMMAND)

    def test_github_integration_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the nested shared workspace to use its own correct relative compiler paths."""
        native = "node ../../../node_modules/typescript7/bin/tsc --noEmit"
        compat = "node ../../../node_modules/typescript/bin/tsc --noEmit"
        manifest = json.loads(GITHUB_INTEGRATION_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), native)
        self.assertEqual(scripts.get("check-types:compat"), compat)
        self.assertEqual(scripts.get("check-types:rollback"), compat)

    def test_advantage_games_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the first application cutover to preserve direct dual-compiler paths."""
        manifest = json.loads(ADVANTAGE_GAMES_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), self.NATIVE_COMMAND)
        self.assertEqual(scripts.get("check-types:compat"), self.COMPAT_COMMAND)
        self.assertEqual(scripts.get("check-types:rollback"), self.COMPAT_COMMAND)

    def test_science_advantage_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the second application cutover to preserve direct dual-compiler paths."""
        manifest = json.loads(SCIENCE_ADVANTAGE_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), self.NATIVE_COMMAND)
        self.assertEqual(scripts.get("check-types:compat"), self.COMPAT_COMMAND)
        self.assertEqual(scripts.get("check-types:rollback"), self.COMPAT_COMMAND)

    def test_primary_advantage_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the third application cutover to preserve direct dual-compiler paths."""
        manifest = json.loads(PRIMARY_ADVANTAGE_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), self.NATIVE_COMMAND)
        self.assertEqual(scripts.get("check-types:compat"), self.COMPAT_COMMAND)
        self.assertEqual(scripts.get("check-types:rollback"), self.COMPAT_COMMAND)

    def test_reading_advantage_check_types_routing_has_a_capacity_safe_rollback(self) -> None:
        """Requires the benchmark keystone to use native TS7 and the proven TS6 heap budget."""
        compat = "node --max-old-space-size=3072 ../../node_modules/typescript/bin/tsc --noEmit"
        manifest = json.loads(READING_ADVANTAGE_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), self.NATIVE_COMMAND)
        self.assertEqual(scripts.get("check-types:compat"), compat)
        self.assertEqual(scripts.get("check-types:rollback"), compat)

    def test_codecamp_advantage_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the first final-app cutover to preserve direct dual-compiler paths."""
        manifest = json.loads(CODECAMP_ADVANTAGE_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), self.NATIVE_COMMAND)
        self.assertEqual(scripts.get("check-types:compat"), self.COMPAT_COMMAND)
        self.assertEqual(scripts.get("check-types:rollback"), self.COMPAT_COMMAND)

    def test_sales_advantage_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the second final-app cutover to preserve direct dual-compiler paths."""
        manifest = json.loads(SALES_ADVANTAGE_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), self.NATIVE_COMMAND)
        self.assertEqual(scripts.get("check-types:compat"), self.COMPAT_COMMAND)
        self.assertEqual(scripts.get("check-types:rollback"), self.COMPAT_COMMAND)

    def test_marketing_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the third final-app cutover to preserve direct dual-compiler paths."""
        manifest = json.loads(MARKETING_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), self.NATIVE_COMMAND)
        self.assertEqual(scripts.get("check-types:compat"), self.COMPAT_COMMAND)
        self.assertEqual(scripts.get("check-types:rollback"), self.COMPAT_COMMAND)

    def test_www_reading_advantage_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the fourth final-app cutover to preserve direct dual-compiler paths."""
        manifest = json.loads(WWW_READING_ADVANTAGE_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), self.NATIVE_COMMAND)
        self.assertEqual(scripts.get("check-types:compat"), self.COMPAT_COMMAND)
        self.assertEqual(scripts.get("check-types:rollback"), self.COMPAT_COMMAND)

    def test_activity_vinext_fixture_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the final listed workspace cutover to preserve direct dual-compiler paths."""
        manifest = json.loads(ACTIVITY_VINEXT_FIXTURE_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), self.NATIVE_COMMAND)
        self.assertEqual(scripts.get("check-types:compat"), self.COMPAT_COMMAND)
        self.assertEqual(scripts.get("check-types:rollback"), self.COMPAT_COMMAND)

    def test_game_contracts_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the first audited remainder workspace to preserve direct dual-compiler paths."""
        self._assert_standard_workspace_routing(GAME_CONTRACTS_PACKAGE_PATH)

    def test_knowledge_space_core_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the second audited remainder workspace to preserve direct dual-compiler paths."""
        self._assert_standard_workspace_routing(KNOWLEDGE_SPACE_CORE_PACKAGE_PATH)

    def test_practice_core_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the third audited remainder workspace to preserve direct dual-compiler paths."""
        self._assert_standard_workspace_routing(PRACTICE_CORE_PACKAGE_PATH)

    def test_activity_tutorial_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the test-config workspace to route all source checking through the direct aliases."""
        native = "node ../../node_modules/typescript7/bin/tsc --noEmit -p tsconfig.test.json"
        compat = "node ../../node_modules/typescript/bin/tsc --noEmit -p tsconfig.test.json"
        manifest = json.loads(ACTIVITY_TUTORIAL_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), native)
        self.assertEqual(scripts.get("check-types:compat"), compat)
        self.assertEqual(scripts.get("check-types:rollback"), compat)

    def test_ai_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the fifth audited remainder workspace to preserve direct dual-compiler paths."""
        self._assert_standard_workspace_routing(AI_PACKAGE_PATH)

    def test_auth_client_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the sixth audited remainder workspace to preserve direct dual-compiler paths."""
        self._assert_standard_workspace_routing(AUTH_CLIENT_PACKAGE_PATH)

    def test_storage_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the seventh audited remainder workspace to preserve direct dual-compiler paths."""
        self._assert_standard_workspace_routing(STORAGE_PACKAGE_PATH)

    def test_advantage_play_kit_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the eighth audited remainder workspace to preserve direct dual-compiler paths."""
        self._assert_standard_workspace_routing(ADVANTAGE_PLAY_KIT_PACKAGE_PATH)

    def test_game_cartridges_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the ninth audited remainder workspace to preserve direct dual-compiler paths."""
        self._assert_standard_workspace_routing(GAME_CARTRIDGES_PACKAGE_PATH)

    def test_activity_runtime_check_types_routing_is_emit_free_and_reversible(self) -> None:
        """Requires the runtime package to typecheck source and tests without invoking its TS6 build."""
        native = (
            "node ../../node_modules/typescript7/bin/tsc --noEmit && "
            "node ../../node_modules/typescript7/bin/tsc --noEmit -p tsconfig.test.json"
        )
        compat = (
            "node ../../node_modules/typescript/bin/tsc --noEmit && "
            "node ../../node_modules/typescript/bin/tsc --noEmit -p tsconfig.test.json"
        )
        manifest = json.loads(ACTIVITY_RUNTIME_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), native)
        self.assertEqual(scripts.get("check-types:compat"), compat)
        self.assertEqual(scripts.get("check-types:rollback"), compat)

    def test_activity_react_check_types_routing_is_emit_free_and_reversible(self) -> None:
        """Requires the React package to typecheck source and tests without invoking its TS6 build."""
        native = (
            "node ../../node_modules/typescript7/bin/tsc --noEmit && "
            "node ../../node_modules/typescript7/bin/tsc --noEmit -p tsconfig.test.json"
        )
        compat = (
            "node ../../node_modules/typescript/bin/tsc --noEmit && "
            "node ../../node_modules/typescript/bin/tsc --noEmit -p tsconfig.test.json"
        )
        manifest = json.loads(ACTIVITY_REACT_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), native)
        self.assertEqual(scripts.get("check-types:compat"), compat)
        self.assertEqual(scripts.get("check-types:rollback"), compat)

    def test_codecamp_knowledge_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires both codecamp knowledge configs to use the direct reversible compiler aliases."""
        native = (
            "node ../../node_modules/typescript7/bin/tsc --noEmit && "
            "node ../../node_modules/typescript7/bin/tsc -p tsconfig.test.json"
        )
        compat = (
            "node ../../node_modules/typescript/bin/tsc --noEmit && "
            "node ../../node_modules/typescript/bin/tsc -p tsconfig.test.json"
        )
        manifest = json.loads(CODECAMP_KNOWLEDGE_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), native)
        self.assertEqual(scripts.get("check-types:compat"), compat)
        self.assertEqual(scripts.get("check-types:rollback"), compat)

    def test_knowledge_space_practice_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the thirteenth audited remainder workspace to preserve direct dual-compiler paths."""
        self._assert_standard_workspace_routing(KNOWLEDGE_SPACE_PRACTICE_PACKAGE_PATH)

    def test_srs_engine_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the fourteenth audited remainder workspace to preserve direct dual-compiler paths."""
        self._assert_standard_workspace_routing(SRS_ENGINE_PACKAGE_PATH)

    def test_mastery_runtime_compat_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the fifteenth audited remainder workspace to preserve direct dual-compiler paths."""
        self._assert_standard_workspace_routing(MASTERY_RUNTIME_COMPAT_PACKAGE_PATH)

    def test_api_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the sixteenth audited remainder workspace to preserve direct dual-compiler paths."""
        self._assert_standard_workspace_routing(API_PACKAGE_PATH)

    def test_webhooks_check_types_routing_is_explicit_and_reversible(self) -> None:
        """Requires the seventeenth audited remainder workspace to preserve direct dual-compiler paths."""
        self._assert_standard_workspace_routing(WEBHOOKS_PACKAGE_PATH)

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

    def test_root_check_types_commands_and_turbo_dependencies_are_reversible(self) -> None:
        """Requires root native, compatibility, parity, and rollback entrypoints after workspace cutover."""
        manifest = json.loads(ROOT_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("check-types"), "turbo run check-types")
        self.assertEqual(scripts.get("check-types:native"), "turbo run check-types")
        self.assertEqual(scripts.get("check-types:compat"), "turbo run check-types:compat")
        self.assertEqual(scripts.get("check-types:parity"), "python3 measure/tracks/typescript7_native_migration_20260710/run-phase3-parity.py")
        self.assertEqual(scripts.get("check-types:rollback"), "turbo run check-types:rollback")

        turbo = json.loads(TURBO_CONFIG_PATH.read_text(encoding="utf-8"))
        tasks = turbo.get("tasks")
        self.assertIsInstance(tasks, dict)
        assert isinstance(tasks, dict)
        self.assertEqual(tasks.get("check-types", {}).get("dependsOn"), ["^build", "^check-types"])
        self.assertEqual(tasks.get("check-types:compat", {}).get("dependsOn"), ["^build", "^check-types:compat"])
        self.assertEqual(tasks.get("check-types:rollback", {}).get("dependsOn"), ["^build", "^check-types:rollback"])

    def test_types_build_routes_emit_to_typescript7_after_the_byte_diff_gate(self) -> None:
        """Requires the first Phase 3e package build to select the native compiler explicitly."""
        manifest = json.loads(TYPES_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("build"), "node ../../node_modules/typescript7/bin/tsc")

    def test_db_build_routes_emit_to_typescript7_after_the_byte_diff_gate(self) -> None:
        """Requires the second Phase 3e package build to select the native compiler explicitly."""
        manifest = json.loads(DB_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(
            scripts.get("build"),
            "node ../../node_modules/typescript7/bin/tsc --project tsconfig.build.json",
        )

    def test_game_cartridges_declaration_emit_routes_to_typescript7(self) -> None:
        """Requires the leaf package's declaration-only compiler step to select the native alias."""
        manifest_path = REPO_ROOT / "packages" / "game-cartridges" / "package.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(
            scripts.get("build"),
            "tsup src/index.ts src/catalog.ts --format esm && node ../../node_modules/typescript7/bin/tsc -p tsconfig.build.json --emitDeclarationOnly",
        )

    def test_github_integration_emit_routes_to_typescript7(self) -> None:
        """Requires the nested integration package to use its explicit native compiler route."""
        manifest = json.loads(GITHUB_INTEGRATION_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("build"), "node ../../../node_modules/typescript7/bin/tsc")

    def test_storage_emit_routes_to_typescript7(self) -> None:
        """Requires the storage package's emitting build to select the native alias."""
        manifest = json.loads(STORAGE_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("build"), "node ../../node_modules/typescript7/bin/tsc")

    def test_activity_tutorial_emit_routes_to_typescript7(self) -> None:
        """Requires the tutorial package's emitting build to select the native alias."""
        manifest = json.loads(ACTIVITY_TUTORIAL_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("build"), "node ../../node_modules/typescript7/bin/tsc")

    def test_practice_core_emit_routes_to_typescript7(self) -> None:
        """Requires the practice-core emitting build to select the native alias."""
        manifest = json.loads(PRACTICE_CORE_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("build"), "node ../../node_modules/typescript7/bin/tsc")

    def test_advantage_play_kit_emit_routes_to_typescript7(self) -> None:
        """Requires the Advantage Play Kit emitting build to select the native alias."""
        manifest = json.loads(ADVANTAGE_PLAY_KIT_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("build"), "node ../../node_modules/typescript7/bin/tsc")

    def test_knowledge_space_core_emit_routes_to_typescript7(self) -> None:
        """Requires the knowledge-space core emitting build to select the native alias."""
        manifest = json.loads(KNOWLEDGE_SPACE_CORE_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("build"), "node ../../node_modules/typescript7/bin/tsc")

    def test_auth_emit_routes_to_typescript7(self) -> None:
        """Requires the auth package's emitting build to select the native alias."""
        manifest = json.loads(AUTH_PACKAGE_PATH.read_text(encoding="utf-8"))
        scripts = manifest.get("scripts")
        self.assertIsInstance(scripts, dict)
        assert isinstance(scripts, dict)
        self.assertEqual(scripts.get("build"), "node ../../node_modules/typescript7/bin/tsc")


class Phase3eDeclarationEmitContract(unittest.TestCase):
    """Verify that intentional declaration emit differences remain explicit and bounded."""

    def test_typescript7_types_emit_diff_is_fully_accounted(self) -> None:
        """Requires every non-byte-equal types declaration file to have the reviewed rationale."""
        ledger = json.loads(DECLARATION_EMIT_LEDGER_PATH.read_text(encoding="utf-8"))
        entries = ledger.get("entries")
        self.assertIsInstance(entries, list)
        assert isinstance(entries, list)
        types_entry = next(
            (entry for entry in entries if entry.get("package") == "packages/types"), None
        )
        self.assertIsNotNone(types_entry)
        assert isinstance(types_entry, dict)
        self.assertEqual(
            sorted(types_entry.get("declaration_differences", [])),
            [
                "assignment-status.d.ts.map",
                "codecamp.d.ts",
                "contracts/class.d.ts",
                "contracts/class.d.ts.map",
                "contracts/envelopes.d.ts",
                "contracts/envelopes.d.ts.map",
                "contracts/sales.d.ts",
                "contracts/sales.d.ts.map",
                "index.d.ts",
            ],
        )
        self.assertEqual(types_entry.get("javascript_differences"), [])
        self.assertEqual(
            types_entry.get("disposition"),
            "accepted_declaration_ordering_only",
        )

    def test_typescript7_db_emit_diff_is_fully_accounted(self) -> None:
        """Requires the DB emit delta and its matching baseline diagnostics to be ledgered."""
        ledger = json.loads(DECLARATION_EMIT_LEDGER_PATH.read_text(encoding="utf-8"))
        entries = ledger.get("entries")
        self.assertIsInstance(entries, list)
        assert isinstance(entries, list)
        db_entry = next((entry for entry in entries if entry.get("package") == "packages/db"), None)
        self.assertIsNotNone(db_entry)
        assert isinstance(db_entry, dict)
        self.assertEqual(len(db_entry.get("declaration_differences", [])), 19)
        self.assertEqual(db_entry.get("javascript_differences"), [])
        self.assertEqual(db_entry.get("typescript6_exit_status"), 0)
        self.assertEqual(db_entry.get("typescript7_exit_status"), 0)
        self.assertEqual(
            db_entry.get("diagnostic_disposition"),
            "resolved_by_required_node_ambient_types",
        )
        self.assertEqual(db_entry.get("disposition"), "accepted_declaration_ordering_only")

    def test_db_build_config_includes_its_required_node_ambient_types(self) -> None:
        """Requires the production DB compiler config to resolve the Node APIs used by emitted source."""
        config_path = REPO_ROOT / "packages" / "db" / "tsconfig.build.json"
        config = json.loads(config_path.read_text(encoding="utf-8"))
        compiler_options = config.get("compilerOptions")
        self.assertIsInstance(compiler_options, dict)
        assert isinstance(compiler_options, dict)
        self.assertEqual(compiler_options.get("types"), ["node"])


if __name__ == "__main__":
    unittest.main()
