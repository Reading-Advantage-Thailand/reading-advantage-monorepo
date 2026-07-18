"""Mechanical falsification checks for the APK denominator Phase-0 freeze."""

from __future__ import annotations

import hashlib
import json
import subprocess
import unittest
from itertools import combinations
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK = "apk_source_denominator_inventory_20260712"
BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
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
