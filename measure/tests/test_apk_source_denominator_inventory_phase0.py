"""Mechanical falsification checks for the APK denominator Phase-0 freeze."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import tempfile
import unittest
from itertools import combinations
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK = "apk_source_denominator_inventory_20260712"
BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
CODE_GATE = "f27e93b27c956baa54b3ccb4c862c09e82cc746f"
FINAL_ROLE_VERIFIER_GATE = "59260bafa231873a2ec0aba18ed65f57e7269d1b"
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / TRACK
FREEZE_PATH = TRACK_DIR / "phase0-input-freeze.json"
ROLE_PATH = TRACK_DIR / "phase0-role-ownership-manifest.json"
METADATA_PATH = TRACK_DIR / "metadata.json"
PLAN_PATH = TRACK_DIR / "plan.md"
SOURCE_SUFFIXES = [".js", ".json", ".jsx", ".ts", ".tsx"]
ASSET_SUFFIXES = [
    ".csv", ".gif", ".ico", ".jpeg", ".jpg", ".json", ".m4a", ".mp3", ".ogg",
    ".png", ".svg", ".txt", ".wav", ".webm", ".webp", ".xml", ".yaml", ".yml",
]
PROGRAM_SLUGS = [
    "dragon-flight", "rpg-battle", "abyssal-well", "castle-defense", "magic-defense",
    "wizard-vs-zombie", "village-guardian", "archers-revenge", "storm-castle-tower",
    "paladins-twin-soul", "gryphon-patrol", "dragon-rider", "dungeon-liberator",
    "spellweavers-run", "shadow-gate-dungeon", "labyrinth-goblin-king",
    "griffin-riders-escape", "sorcerer-ziggurat", "enchanted-library", "rune-match",
    "alchemists-synthesis", "potion-rush", "rune-forge-chamber", "astral-mage",
    "griffin-sky-joust", "realm-carver", "devourer-slime", "haunted-library",
    "babel-architect",
]
SOURCE_RULE_IDS = [
    "active-apk-program-sources",
    "apk-core-packages",
    "advantage-games-src",
    "reading-primary-game-copies",
    "codecamp-knowledge-apk-segment",
    "domain-games-tests",
    "db-game-completion-codecamp-apk",
    "advantage-games-measure-program-match",
]
ASSET_RULE_IDS = [
    "public-game-media-audio-data",
    "game-measure-asset-sidecars",
    "codecamp-activity-tutorial",
]
HISTORY_ROOTS = [
    "apps/advantage-games",
    "apps/reading-advantage",
    "apps/primary-advantage",
    "packages",
    "measure",
]
SOURCE_CLASSIFIER = {
    "evaluation": "ordered-first-match",
    "default_action": "exclude",
    "ordered_rules": [
        {"rule_id": "failed-track-quarantine", "action": "exclude", "prefixes": ["measure/tracks/apk_cross_game_asset_ontology_20260712/"]},
        {"rule_id": "active-apk-program-sources", "action": "include", "exact_paths": ["measure/apk-asset-system-program.md", "measure/apk-evidence-reconstruction-program.md", "packages/game-cartridges/src/catalog.test.ts", "packages/game-cartridges/src/catalog.ts", "packages/game-cartridges/src/index.ts"]},
        {"rule_id": "apk-core-packages", "action": "include", "prefixes": ["packages/advantage-play-kit/", "packages/game-cartridges/", "packages/game-contracts/"]},
        {"rule_id": "non-core-package-config", "action": "exclude", "basename_exact": ["package.json", "tsconfig.json", "tsconfig.test.json"], "basename_prefix": ["tsconfig."]},
        {"rule_id": "advantage-games-src", "action": "include", "prefixes": ["apps/advantage-games/src/"], "suffixes": SOURCE_SUFFIXES},
        {"rule_id": "reading-primary-game-copies", "action": "include", "prefixes": ["apps/primary-advantage/", "apps/reading-advantage/"], "path_contains": ["/api/v1/games/", "/games/", "/lib/game"], "suffixes": SOURCE_SUFFIXES},
        {"rule_id": "codecamp-knowledge-apk-segment", "action": "include", "prefixes": ["packages/codecamp-knowledge/"], "path_segment_prefix": ["apk-"], "suffixes": [".js", ".json", ".jsx", ".md", ".ts", ".tsx"]},
        {"rule_id": "domain-games-tests", "action": "include", "prefixes": ["packages/domain/src/__tests__/games", "packages/domain/src/games/"], "suffixes": SOURCE_SUFFIXES},
        {"rule_id": "db-game-completion-codecamp-apk", "action": "include", "prefixes": ["packages/db/"], "normalized_path_contains": ["codecamp-apk", "game-completion"]},
        {"rule_id": "advantage-games-measure-program-match", "action": "include", "prefixes": ["apps/advantage-games/measure/"], "requires_program_slug": True, "suffixes": [".json", ".md"]},
    ],
}
ASSET_CLASSIFIER = {
    "evaluation": "ordered-first-match",
    "default_action": "exclude",
    "enumeration_roots": [
        "apps/advantage-games/public",
        "apps/reading-advantage/public/games",
        "apps/primary-advantage/public/games",
        "apps/advantage-games/measure",
        "packages/codecamp-knowledge/fixtures/apk-guided",
    ],
    "ordered_rules": [
        {"rule_id": "failed-track-quarantine", "action": "exclude", "prefixes": ["measure/tracks/apk_cross_game_asset_ontology_20260712/"]},
        {"rule_id": "asset-config", "action": "exclude", "basename_exact": ["package.json", "tsconfig.json", "tsconfig.test.json"], "basename_prefix": ["tsconfig."]},
        {"rule_id": "public-game-media-audio-data", "action": "include", "prefixes": ["apps/advantage-games/public", "apps/reading-advantage/public/games", "apps/primary-advantage/public/games"], "suffixes": ASSET_SUFFIXES},
        {"rule_id": "game-measure-asset-sidecars", "action": "include", "prefixes": ["apps/advantage-games/measure/"], "basename_exact": ["asset-spec.md", "metadata.json"], "requires_program_slug": True},
        {"rule_id": "codecamp-activity-tutorial", "action": "include", "exact_paths": ["packages/codecamp-knowledge/fixtures/apk-guided/activity-tutorial.json"]},
    ],
}
HISTORY_CLASSIFIER = {
    "current_page_admission": "Normalize each current repository path, evaluate the source classifier and asset classifier independently, and admit the path when either classifier's first matching rule has action include.",
    "deleted_path_admission": "Normalize each deleted repository path and admit it when either the source classifier or asset classifier has action include for that path.",
    "ancestor_deletion_walk": "For each admitted path, walk first-parent history from HEAD and retain the first revision in which that path is deleted.",
    "ancestor_boundary": "Constrain ancestor deletion traversal to the declared history_roots and do not infer paths outside those roots.",
}


def _load(path: Path) -> dict[str, object]:
    """Loads one JSON object used by the Phase-0 contract.

    Args:
        path: JSON artifact to load.

    Returns:
        The parsed JSON object.
    """
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain a JSON object")
    return value


def _git(*arguments: str) -> str:
    """Runs a read-only Git command against the repository.

    Args:
        arguments: Arguments after the Git executable.

    Returns:
        Standard output from the successful command.
    """
    result = subprocess.run(
        ["git", *arguments],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=True,
    )
    return result.stdout


class Phase0FreezeTests(unittest.TestCase):
    """Rejects drift or scope weakening in the frozen T2 setup."""

    def setUp(self) -> None:
        """Loads the freeze, role plan, and product-track metadata.

        Returns:
            Nothing.
        """
        self.freeze = _load(FREEZE_PATH)
        self.roles = _load(ROLE_PATH)
        self.metadata = _load(METADATA_PATH)

    def test_accepted_predecessor_is_bound_to_baseline_bytes_and_metadata_pin(self) -> None:
        """Binds T2 only to the accepted, consumable T1 predecessor bytes.

        Returns:
            Nothing.
        """
        predecessor = self.freeze["accepted_predecessor"]
        self.assertIsInstance(predecessor, dict)
        assert isinstance(predecessor, dict)
        manifest_path = predecessor["manifest_path"]
        self.assertIsInstance(manifest_path, str)
        assert isinstance(manifest_path, str)
        manifest_bytes = _git("show", f"{BASELINE}:{manifest_path}").encode()
        self.assertEqual(hashlib.sha256(manifest_bytes).hexdigest(), predecessor["manifest_sha256"])
        manifest = json.loads(manifest_bytes)
        self.assertEqual(manifest["status"], predecessor["required_status"])
        self.assertEqual(manifest["consumable"], predecessor["required_consumable"])
        self.assertEqual(manifest["revoked"], predecessor["required_revoked"])
        self.assertEqual(manifest["gate_version"], predecessor["gate_version"])
        self.assertEqual(manifest["gate_commit"], predecessor["gate_commit"])
        self.assertEqual(self.metadata["evidence_integrity_gate"]["manifest_sha256"], predecessor["manifest_sha256"])

    def test_scope_and_quarantine_are_baseline_bound_and_non_factual(self) -> None:
        """Rejects worktree, future, and failed-track input leakage.

        Returns:
            Nothing.
        """
        self.assertEqual(self.freeze["baseline_revision"], BASELINE)
        scope = self.freeze["source_scope"]
        quarantine = self.freeze["failed_track_quarantine"]
        self.assertIsInstance(scope, dict)
        self.assertIsInstance(quarantine, dict)
        assert isinstance(scope, dict) and isinstance(quarantine, dict)
        self.assertEqual(scope["current_revision"], BASELINE)
        self.assertIn(BASELINE, scope["history_command_template"])
        self.assertIn("uncommitted", scope["current_tree_rule"].lower())
        tree = _git("rev-parse", f"{BASELINE}:{quarantine['path']}").strip()
        self.assertEqual(tree, quarantine["baseline_tree_sha1"])
        self.assertEqual(quarantine["disposition"], "rejected-not-completion")
        self.assertIn("Negative fixture", quarantine["permitted_use"])
        self.assertIn("may not supply", quarantine["forbidden_use"])
        roots = scope["roots"]
        self.assertIsInstance(roots, list)
        self.assertTrue(roots)
        self.assertNotIn(quarantine["path"], roots)

    def test_numeric_stop_loss_and_complete_isolated_ownership_are_frozen(self) -> None:
        """Rejects unmeasured budgets, weakened stops, or overlapping role plans.

        Returns:
            Nothing.
        """
        ceilings = self.freeze["frozen_resource_ceilings"]
        stop_loss = self.freeze["stop_loss"]
        self.assertIsInstance(ceilings, dict)
        self.assertIsInstance(stop_loss, dict)
        assert isinstance(ceilings, dict) and isinstance(stop_loss, dict)
        expected_roles = set(self.roles["required_roles"])
        self.assertEqual(set(ceilings), expected_roles)
        for role_budget in ceilings.values():
            self.assertIsInstance(role_budget, dict)
            assert isinstance(role_budget, dict)
            self.assertTrue(role_budget)
            self.assertTrue(all(isinstance(value, int) and not isinstance(value, bool) and value > 0 for value in role_budget.values()))
        self.assertEqual(stop_loss["max_games_per_batch"], 3)
        self.assertEqual(stop_loss["unsupported_factual_claims_before_stop"], 1)
        self.assertEqual(stop_loss["denominator_mismatches_before_stop"], 1)
        self.assertEqual(stop_loss["failed_fix_review_cycles_before_block"], 2)
        self.assertEqual(stop_loss["unresolved_blocking_severities"], ["critical", "high", "medium"])
        self.assertTrue(stop_loss["unmeasured_resource_usage_blocks_checkpoint"])
        self.assertTrue(stop_loss["ceiling_change_requires_product_owner_approval"])
        self.assertEqual(set(self.roles["role_applicability"]), expected_roles)
        self.assertTrue(all(self.roles["role_applicability"].values()))
        self.assertEqual(
            self.roles["allowed_input_manifest_sha256"],
            hashlib.sha256(FREEZE_PATH.read_bytes()).hexdigest(),
        )
        pairs = {tuple(sorted(pair)) for pair in self.roles["incompatible_roles"]}
        self.assertEqual(pairs, {tuple(sorted(pair)) for pair in combinations(expected_roles, 2)})
        self.assertEqual(set(self.roles["root_agent"]["forbidden_roles"]), expected_roles)

    def test_expected_artifacts_are_unique_and_role_owned_without_claiming_receipts(self) -> None:
        """Requires exact future output contracts while rejecting fabricated execution proof.

        Returns:
            Nothing.
        """
        artifacts = self.freeze["expected_artifacts"]
        self.assertIsInstance(artifacts, list)
        assert isinstance(artifacts, list)
        paths = [artifact["path"] for artifact in artifacts]
        self.assertEqual(len(paths), len(set(paths)))
        self.assertTrue(all(path.startswith(f"measure/tracks/{TRACK}/") for path in paths))
        self.assertTrue(all(artifact["schema_version"].endswith(".v1") for artifact in artifacts))
        self.assertEqual(self.roles["status"], "frozen-not-executed")
        self.assertIn("not a receipt", self.roles["execution_note"])
        tasks = self.roles["tasks"]
        self.assertEqual({task["owner_role"] for task in tasks}, set(self.roles["required_roles"]))
        owned = [output for task in tasks for output in task["expected_outputs"]]
        self.assertEqual(len(owned), len(set(owned)))

    def test_role_execution_contracts_freeze_exact_tools_generators_and_commits(self) -> None:
        """Binds every role to exact provider tools, commands, outputs, and code blobs."""
        tasks = {task["owner_role"]: task for task in self.roles["tasks"]}
        track_prefix = f"measure/tracks/{TRACK}/"
        def immutable_generator(script: str) -> str:
            """Builds the exact semicolon-free commit-bound Python launcher."""
            path = track_prefix + script
            return (
                "/usr/bin/env -i "
                "PATH=/opt/codex-desktop/resources/node-runtime/bin:/usr/bin:/bin "
                "LANG=C PYTHONDONTWRITEBYTECODE=1 /usr/bin/python3 -I -S -c "
                f"'exec(compile(__import__(\"subprocess\").check_output((\"/usr/bin/git\",\"show\",__import__(\"sys\").argv.pop(1)+\":{path}\")),\"{path}\",\"exec\"),"
                f"dict(__file__=\"{path}\",__name__=\"__main__\"))' "
                "{phase0_commit}"
            )

        phase1_generator = immutable_generator("generate_phase1_denominators.py")
        phase2_generator = immutable_generator("generate_phase2_human_discovery.py")
        phase3_generator = immutable_generator("generate_phase3_reconciliation.py")
        final_role_verifier = immutable_generator("verify_phase4_role_evidence.py")
        expected_generators = {
            "discovery-auditor": [
                (
                    phase1_generator
                    + " --role discovery-auditor --code-revision {phase0_commit}",
                    "allow-empty-only",
                    "chore(measure): attest T2 discovery (track_id: apk_source_denominator_inventory_20260712)",
                    "output_commit",
                )
            ],
            "evidence-collector": [
                (
                    phase1_generator
                    + " --role evidence-collector --code-revision {phase0_commit}",
                    "allow-empty-only",
                    "chore(measure): attest T2 Phase 1 evidence (track_id: apk_source_denominator_inventory_20260712)",
                    "phase1_attestation_commit",
                ),
                (
                    phase2_generator
                    + " --phase1-revision {phase1_attestation_commit}"
                    + " --code-revision {phase0_commit}",
                    "normal-only",
                    "chore(measure): refresh T2 Phase 2 evidence (track_id: apk_source_denominator_inventory_20260712)",
                    "output_commit",
                ),
            ],
            "requirements-mapper": [
                (
                    phase1_generator
                    + " --role requirements-mapper --code-revision {phase0_commit}",
                    "allow-empty-only",
                    "chore(measure): attest reconciliation evidence (track_id: apk_source_denominator_inventory_20260712)",
                    "mapper_phase1_attestation_commit",
                ),
                (
                    phase3_generator
                    + " --phase2-receipt-revision {phase2_receipt_commit}",
                    "normal-only",
                    "chore(measure): attest phase3 (track_id: apk_source_denominator_inventory_20260712)",
                    "output_commit",
                ),
            ],
            "truth-test-author": [
                (
                    final_role_verifier
                    + " --role truth-test-author"
                    + " --phase0-authority-revision {phase0_commit}"
                    + " --output measure/tracks/apk_source_denominator_inventory_20260712/denominator-contract-test-report.json",
                    "normal-only",
                    "chore(measure): attest T2 truth tests (track_id: apk_source_denominator_inventory_20260712)",
                    "output_commit",
                ),
            ],
            "adversarial-reviewer": [
                (
                    final_role_verifier
                    + " --role adversarial-reviewer"
                    + " --phase0-authority-revision {phase0_commit}"
                    + " --phase2-receipt-revision {phase2_receipt_commit}"
                    + " --output measure/tracks/apk_source_denominator_inventory_20260712/independent-review.json",
                    "normal-only",
                    "chore(measure): attest T2 independent review (track_id: apk_source_denominator_inventory_20260712)",
                    "output_commit",
                ),
            ],
        }
        expected_order = {
            "discovery-auditor": ["generator:0"],
            "evidence-collector": ["generator:0", "read-only:0", "generator:1"],
            "requirements-mapper": ["generator:0", "generator:1"],
            "truth-test-author": ["generator:0"],
            "adversarial-reviewer": ["generator:0"],
        }
        expected_dependencies_by_command = {
            command: (
                (
                    track_prefix + "verify_phase4_role_evidence.py",
                    track_prefix + "generate_phase3_reconciliation.py",
                )
                if "verify_phase4_role_evidence.py" in command
                and "adversarial-reviewer" in command
                else (track_prefix + "verify_phase4_role_evidence.py",)
                if "verify_phase4_role_evidence.py" in command
                else
                (
                    track_prefix + "generate_phase2_human_discovery.py",
                    track_prefix + "transition_ast_helper.bundle.cjs",
                )
                if "generate_phase2_human_discovery.py" in command
                else (track_prefix + "generate_phase3_reconciliation.py",)
                if "generate_phase3_reconciliation.py" in command
                else (
                    track_prefix + "generate_phase1_denominators.py",
                    track_prefix + "transition_ast.py",
                    track_prefix + "transition_ast_helper.bundle.cjs",
                )
            )
            for generators in expected_generators.values()
            for command, _mode, _subject, _source in generators
        }
        for role, task in tasks.items():
            contract = task["execution_contract"]
            self.assertEqual(contract["schema_version"], "apk-role-execution-contract.v1")
            expected_outputs = {track_prefix + output for output in task["expected_outputs"]}
            generated_outputs = {
                output
                for generator in contract["shell_generators"]
                for output in generator["owned_outputs"]
            }
            self.assertEqual(
                generated_outputs | set(contract["direct_write_outputs"]), expected_outputs
            )
            self.assertFalse(contract["direct_write_only"])
            self.assertEqual(
                contract["allowed_provider_tools"],
                ["bash", "read", "write"]
                if role in {"truth-test-author", "adversarial-reviewer"}
                else ["bash", "read"],
            )
            self.assertEqual(contract["direct_write_outputs"], [])
            self.assertEqual(contract["ordered_operations"], expected_order[role])
            actual_generators = []
            for generator in contract["shell_generators"]:
                commit = generator["commit"]
                self.assertIs(commit["immediate_adjacency"], True)
                actual_generators.append(
                    (
                        generator["command_template"],
                        commit["mode"],
                        commit["subject"],
                        commit["attestation_commit_source"],
                    )
                )
                dependencies = generator["dependency_blobs"]
                self.assertEqual(
                    tuple(dependency["path"] for dependency in dependencies),
                    expected_dependencies_by_command[generator["command_template"]],
                )
                for dependency in dependencies:
                    expected_gate = (
                        FINAL_ROLE_VERIFIER_GATE
                        if dependency["path"].endswith("verify_phase4_role_evidence.py")
                        else CODE_GATE
                    )
                    self.assertEqual(dependency["revision"], expected_gate)
                    blob = _git("show", f"{expected_gate}:{dependency['path']}").encode()
                    self.assertEqual(hashlib.sha256(blob).hexdigest(), dependency["sha256"])
            self.assertEqual(actual_generators, expected_generators[role])
        runtime = self.roles["trusted_runtime"]
        self.assertEqual(runtime["schema_version"], "apk-trusted-runtime.v1")
        self.assertEqual(
            runtime["sanitized_environment"],
            {
                "PATH": "/opt/codex-desktop/resources/node-runtime/bin:/usr/bin:/bin",
                "LANG": "C",
                "PYTHONDONTWRITEBYTECODE": "1",
            },
        )
        self.assertEqual(
            {item["entry_path"] for item in runtime["executables"]},
            {
                "/usr/bin/env",
                "/usr/bin/python3",
                "/usr/bin/git",
                "/opt/codex-desktop/resources/node-runtime/bin/node",
            },
        )
        for executable in runtime["executables"]:
            entry = Path(executable["entry_path"])
            resolved = Path(executable["resolved_path"])
            self.assertEqual(entry.resolve(strict=True), resolved.resolve(strict=True))
            self.assertEqual(
                hashlib.sha256(resolved.read_bytes()).hexdigest(),
                executable["sha256"],
            )
        self.assertEqual(
            tasks["evidence-collector"]["execution_contract"]["read_only_shell_commands"],
            [{
                "command": "git rev-parse HEAD",
                "expected_stdout_source": "phase1_attestation_commit",
            }],
        )

    def test_sanitized_python_launcher_ignores_pythonpath_and_sitecustomize(self) -> None:
        """Proves the frozen env, isolated mode, and no-site mode reject ambient Python."""
        with tempfile.TemporaryDirectory() as directory:
            poison = Path(directory)
            marker = poison / "sitecustomize-loaded"
            (poison / "sitecustomize.py").write_text(
                f"from pathlib import Path\nPath({str(marker)!r}).write_text('loaded')\n",
                encoding="utf-8",
            )
            ambient = dict(os.environ)
            ambient["PYTHONPATH"] = directory
            result = subprocess.run(
                [
                    "/usr/bin/env",
                    "-i",
                    "PATH=/opt/codex-desktop/resources/node-runtime/bin:/usr/bin:/bin",
                    "LANG=C",
                    "PYTHONDONTWRITEBYTECODE=1",
                    "/usr/bin/python3",
                    "-I",
                    "-S",
                    "-c",
                    "import sys;print(int('sitecustomize' in sys.modules))",
                ],
                cwd=poison,
                env=ambient,
                check=True,
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.stdout, "0\n")
            self.assertFalse(marker.exists())


    def test_relevance_corpus_rules_are_frozen_with_exact_program_slugs(self) -> None:
        """Freezes every ordered classifier predicate before discovery."""
        rules = self.freeze.get("relevance_rules")
        self.assertIsInstance(rules, dict)
        assert isinstance(rules, dict)
        self.assertEqual(
            rules,
            {
                "normalization": "Lowercase repository-relative path; replace every maximal non-alphanumeric run with one hyphen; compare exact frozen slugs as hyphen-delimited tokens.",
                "source_suffixes": SOURCE_SUFFIXES,
                "asset_suffixes": ASSET_SUFFIXES,
                "source_rule_ids": SOURCE_RULE_IDS,
                "asset_rule_ids": ASSET_RULE_IDS,
                "history_roots": HISTORY_ROOTS,
                "source_classifier": SOURCE_CLASSIFIER,
                "asset_classifier": ASSET_CLASSIFIER,
                "history_classifier": HISTORY_CLASSIFIER,
                "program_slugs": PROGRAM_SLUGS,
            },
        )
        self.assertEqual(self.freeze["source_scope"]["roots"], HISTORY_ROOTS)
        binding = self.roles.get("source_classifier_binding")
        self.assertIsInstance(binding, dict)
        assert isinstance(binding, dict)
        canonical_rules = json.dumps(
            SOURCE_CLASSIFIER["ordered_rules"], sort_keys=True, separators=(",", ":")
        ).encode()
        self.assertEqual(
            binding,
            {
                "source_rule_ids": SOURCE_RULE_IDS,
                "ordered_rules_sha256": hashlib.sha256(canonical_rules).hexdigest(),
                "hash_serialization": "SHA-256 of UTF-8 JSON with sorted object keys and separators comma/colon over relevance_rules.source_classifier.ordered_rules.",
            },
        )

    def test_phase4_partition_artifacts_and_coordinator_outputs_are_explicit(self) -> None:
        """Freezes both partition manifests and the root coordinator publication boundary."""
        artifacts = self.freeze["expected_artifacts"]
        self.assertIsInstance(artifacts, list)
        assert isinstance(artifacts, list)
        schemas = {artifact["path"]: artifact["schema_version"] for artifact in artifacts}
        self.assertEqual(
            schemas.get(f"measure/tracks/{TRACK}/candidate-partition-manifest.json"),
            "apk-denominator-candidate-partition.v1",
        )
        self.assertEqual(
            schemas.get(f"measure/tracks/{TRACK}/accepted-partition-manifest.json"),
            "apk-denominator-accepted-partition.v1",
        )
        root_agent = self.roles["root_agent"]
        self.assertEqual(
            set(root_agent.get("coordinator_lifecycle_outputs", [])),
            {
                "candidate-denominator-manifest.json",
                "candidate-partition-manifest.json",
                "accepted-denominator-manifest.json",
                "accepted-partition-manifest.json",
            },
        )
        self.assertNotIn("product-owner-acceptance.json", root_agent["coordinator_lifecycle_outputs"])

    def test_evidence_collector_owns_all_asset_history_and_human_discovery_outputs(self) -> None:
        """Binds all raw evidence artifacts to the isolated evidence collector.

        Returns:
            Nothing.
        """
        tasks = self.roles["tasks"]
        self.assertIsInstance(tasks, list)
        assert isinstance(tasks, list)
        evidence_task = next(task for task in tasks if task["owner_role"] == "evidence-collector")
        self.assertEqual(
            set(evidence_task["expected_outputs"]),
            {
                "asset-file-denominator.json",
                "historical-source-denominator.json",
                "independent-human-discovery.json",
                "human-duplicate-drift-records.json",
                "human-historical-deleted-records.json",
                "human-discrepancy-records.json",
            },
        )

    def test_requirements_mapper_owns_discrepancy_method_and_reconciliation_outputs(self) -> None:
        """Binds derived reconciliation artifacts to the isolated requirements mapper.

        Returns:
            Nothing.
        """
        tasks = self.roles["tasks"]
        self.assertIsInstance(tasks, list)
        assert isinstance(tasks, list)
        mapper_task = next(task for task in tasks if task["owner_role"] == "requirements-mapper")
        self.assertEqual(
            set(mapper_task["expected_outputs"]),
            {
                "denominator-discrepancies.json",
                "denominator-method.md",
                "phase3-reconciliation.json",
            },
        )

    def test_input_freeze_declares_phase2_and_phase3_artifact_schemas(self) -> None:
        """Requires exact v1 schemas for every Phase-2 and Phase-3 handoff artifact.

        Returns:
            Nothing.
        """
        artifacts = self.freeze["expected_artifacts"]
        self.assertIsInstance(artifacts, list)
        assert isinstance(artifacts, list)
        schemas_by_path = {artifact["path"]: artifact["schema_version"] for artifact in artifacts}
        required_schemas = {
            f"measure/tracks/{TRACK}/independent-human-discovery.json":
                "apk-denominator-independent-human-discovery.v1",
            f"measure/tracks/{TRACK}/human-duplicate-drift-records.json":
                "apk-denominator-human-duplicate-drift.v1",
            f"measure/tracks/{TRACK}/human-historical-deleted-records.json":
                "apk-denominator-human-historical-deleted.v1",
            f"measure/tracks/{TRACK}/human-discrepancy-records.json":
                "apk-denominator-human-discrepancies.v1",
            f"measure/tracks/{TRACK}/phase3-reconciliation.json":
                "apk-source-denominator-phase3-reconciliation.v1",
        }
        self.assertEqual(
            {path: schemas_by_path.get(path) for path in required_schemas},
            required_schemas,
        )

    def test_frozen_task_outputs_are_unique_and_complete(self) -> None:
        """Partitions every expected artifact across disjoint frozen authorities.

        Returns:
            Nothing.
        """
        tasks = self.roles["tasks"]
        self.assertIsInstance(tasks, list)
        assert isinstance(tasks, list)
        task_outputs = {output for task in tasks for output in task["expected_outputs"]}
        coordinator_outputs = set(self.roles["root_agent"]["coordinator_lifecycle_outputs"])
        authorities = self.roles.get("external_authorities")
        self.assertEqual(
            authorities,
            [{
                "authority_id": "product-owner",
                "authority_type": "external-human",
                "expected_outputs": ["product-owner-acceptance.json"],
                "authority_boundary": "Only the product owner may authorize the exact candidate denominator and partition hashes; the root coordinator may render accepted manifests only after that authorization.",
            }],
        )
        assert isinstance(authorities, list)
        external_outputs = {
            output for authority in authorities for output in authority["expected_outputs"]
        }
        receipt_outputs = {self.roles["receipt_contract"]["expected_output_directory"]}
        partitions = [task_outputs, coordinator_outputs, external_outputs, receipt_outputs]
        for left, right in combinations(partitions, 2):
            self.assertTrue(left.isdisjoint(right))
        expected_outputs = {
            "source-denominator.json",
            "game-identity-ledger.json",
            "scene-state-denominator.json",
            "asset-file-denominator.json",
            "historical-source-denominator.json",
            "independent-human-discovery.json",
            "human-duplicate-drift-records.json",
            "human-historical-deleted-records.json",
            "human-discrepancy-records.json",
            "denominator-discrepancies.json",
            "denominator-method.md",
            "phase3-reconciliation.json",
            "denominator-contract-test-report.json",
            "independent-review.json",
            "candidate-denominator-manifest.json",
            "candidate-partition-manifest.json",
            "product-owner-acceptance.json",
            "accepted-denominator-manifest.json",
            "accepted-partition-manifest.json",
            "role-receipts/",
        }
        artifact_outputs = {
            artifact["path"].removeprefix(f"measure/tracks/{TRACK}/")
            for artifact in self.freeze["expected_artifacts"]
        }
        self.assertEqual(set.union(*partitions), expected_outputs)
        self.assertEqual(artifact_outputs, expected_outputs)

    def test_phase_zero_records_freeze_gate_owner_verification_without_acceptance(self) -> None:
        """Requires evidence-backed freeze tasks and verification without product-owner acceptance.

        Returns:
            Nothing.
        """
        phase_zero = PLAN_PATH.read_text(encoding="utf-8").split("## Phase 1:", 1)[0]
        self.assertNotIn("[ ]", phase_zero)
        self.assertEqual(phase_zero.count("- [x] Task:"), 4)
        self.assertIn("phase0-input-freeze.json", phase_zero)
        self.assertIn("phase0-role-ownership-manifest.json", phase_zero)
        self.assertIn("test-strategy.md", phase_zero)
        self.assertIn("freeze commit `bb95b523`", phase_zero)
        self.assertIn("- [x] Task: Measure - Owner verification 'Phase 0'", phase_zero)
        self.assertIn("test_apk_source_denominator_inventory_phase0", phase_zero)
        self.assertIn("reconciliation commit `7b595ae2`", phase_zero)
        self.assertIn("product-owner acceptance is not claimed", phase_zero)


if __name__ == "__main__":
    unittest.main()
