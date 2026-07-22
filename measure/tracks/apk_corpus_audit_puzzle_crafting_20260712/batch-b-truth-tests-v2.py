"""Fail-closed source-semantic gates for T6 Puzzle/Crafting Batch B V2."""

from __future__ import annotations

import copy
import hashlib
import json
import subprocess
import unittest
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
TRACK = Path(__file__).resolve().parent
BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
ASTRAL_HISTORY = "1a21fb951e27bb4df8a5e8f7b1685cea9e6efb9f"
ASTRAL_WITHDRAWAL = "05bb6d2909268ea670b106240167f86c9814d67d"
SLUGS = ("potion-rush", "rune-forge-chamber", "astral-mage")
EXPECTED_IDENTITIES = {
    "potion-rush": "sentence/potion-rush",
    "rune-forge-chamber": "sentence/rune-forge-chamber",
    "astral-mage": "catalog/astral-mage",
}
EXPECTED_CLAIM_COUNTS = {"potion-rush": 28, "rune-forge-chamber": 24, "astral-mage": 16}
EXPECTED_UNKNOWN_COUNTS = {"potion-rush": 4, "rune-forge-chamber": 5, "astral-mage": 3}
SEMANTIC_TOKENS = {
    "PR-CUR-001": ["id: 'potion-rush'", "href: '/student/games/sentence/potion-rush'"],
    "PR-CUR-004": ['fetch("/api/v1/games/potion-rush/complete"', "correctAnswers", "gameTime: 0"],
    "PR-CUR-007": ["easy: { baseBeltSpeed: 35", "gameState: 'PLAYING'", "cauldrons:"],
    "PR-CUR-008": ["findIndex(c => c === null)", "Math.random()", "activeWordPool"],
    "PR-CUR-011": ["Strict 1:1 Mapping", "targetWords[nextIndex]", "nextCauldron.state = 'WARNING'"],
    "PR-CUR-013": ["Strict Index Match", "state: 'LEAVING_HAPPY'", "calculatePotionRushXP"],
    "PR-CUR-014": ["completedSentences === 0", "accuracy >= 0.7", "Math.min(10"],
    "PR-CUR-015": ["VIRTUAL_WIDTH = 390", "VIRTUAL_HEIGHT = 844", "Math.min(scaleX, scaleY)"],
    "PR-CUR-017": ["draggable", "getPointerPosition", "virtualX"],
    "PR-CUR-019": ["customer.request.translation", "patienceRatio", "width={150}"],
    "PR-CUR-025": ["mockPotionRushApis", "start brewing", "canvas"],
    "RFC-CUR-001": ["id: 'rune-forge-chamber'", "href: '/student/games/sentence/rune-forge-chamber'"],
    "RFC-CUR-006": ["'start' | 'playing' | 'defeat'", "targetIndex", "circleAngle"],
    "RFC-CUR-007": ["config.rng ?? Math.random", "generateId()", "orderIndex"],
    "RFC-CUR-008": ["const j = Math.floor(rng()", "diffConfig.timer * 2", "status: 'playing'"],
    "RFC-CUR-009": ["const rng = Math.random", "state.maxTimer * 0.8", "nextLevel"],
    "RFC-CUR-010": ["newState.timer <= 0", "newState.player.health <= 0", "advanceRuneForgeLevel"],
    "RFC-CUR-011": ["circle.word === targetWord", "selected: true", "wrongWordDamage"],
    "RFC-CUR-012": ["GAME_WIDTH = 390", "GAME_HEIGHT = 700", "minTouchTarget: 44"],
    "RFC-CUR-016": ["currentState?.status === 'defeat'", "calculateXP", "onComplete(results)"],
    "RFC-CUR-019": ["onClick", "onTap", "hitRadius"],
    "RFC-CUR-022": ["mockRuneForgeChamberApis", "enter the forge", "canvas"],
    "AM-CUR-001": ["withdrawnApkGameIds", "'astral-mage'"],
    "AM-CUR-003": ["href: undefined", "status: 'coming-soon'"],
    "AM-HIST-001": ["id: \"astral-mage\"", "requiredAssetSlots", "context.seed ?? Date.now()"],
    "AM-HIST-002": ["WORLD_WIDTH = 1_600", "target.word-crystal", "seed: number"],
    "AM-HIST-003": ["id: `${sentenceIndex}-${tokenIndex}`", "seededShuffle", "tokenIndex"],
    "AM-HIST-004": ["requires at least one sentence", "requires non-empty translations", "createTargets"],
    "AM-HIST-005": ["score: Math.max(0, state.score - 25)", "candidate.id === targetId", "expectedTokenIndex"],
    "AM-HIST-006": ["complete: true", "createGameResults", "state.seed"],
    "AM-HIST-007": ["width: 960", "default: \"arcade\"", "setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)"],
    "AM-HIST-010": ["projectilePool.get", "distanceToProjectilePath", "intendedTargetId"],
    "AM-HIST-011": ["W,A,S,D,UP,DOWN,LEFT,RIGHT", "keydown-SPACE", '"FIRE"'],
}
FIXTURE_CLASSES = {
    "cited_range_hash_mismatch",
    "directory_citation",
    "browser_promotion",
    "analogy_substitution",
    "malformed_claim",
    "denominator_omission",
}


def load(path: Path) -> dict[str, Any]:
    """Load one JSON object.

    Args:
        path: Artifact path.

    Returns:
        Parsed JSON object.
    """

    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path}: expected object")
    return value


def git_bytes(revision: str, path: str) -> bytes:
    """Read one immutable Git blob.

    Args:
        revision: Source revision.
        path: Repository-relative path.

    Returns:
        Exact object bytes.
    """

    return subprocess.run(
        ["git", "show", f"{revision}:{path}"], cwd=ROOT, check=True, capture_output=True
    ).stdout


def sha256(path: Path) -> str:
    """Hash one local artifact.

    Args:
        path: Artifact path.

    Returns:
        Lowercase SHA-256 digest.
    """

    return hashlib.sha256(path.read_bytes()).hexdigest()


def ledger(slug: str) -> dict[str, Any]:
    """Load one active V2 claim ledger.

    Args:
        slug: Batch B game slug.

    Returns:
        Claim ledger object.
    """

    return load(TRACK / f"batch-b/{slug}/claim-evidence-ledger-v2.json")


def validate_claim(record: dict[str, Any]) -> bool:
    """Validate claim shape and exact immutable envelope.

    Args:
        record: Candidate claim record.

    Returns:
        Whether the record has a complete matching source envelope.
    """

    required = {
        "claim_id", "source_class", "revision", "path", "start_line", "end_line",
        "blob_sha256", "cited_range_sha256", "extracted_source_fact", "interpretation",
        "scene_or_state_id", "confidence", "independent_review_disposition",
    }
    if not required <= record.keys():
        return False
    if not isinstance(record["extracted_source_fact"], str) or not record["extracted_source_fact"].strip():
        return False
    if not isinstance(record["interpretation"], str) or not record["interpretation"].strip():
        return False
    if record["path"].endswith("/") or record["start_line"] < 1 or record["end_line"] < record["start_line"]:
        return False
    try:
        blob = git_bytes(record["revision"], record["path"])
    except subprocess.CalledProcessError:
        return False
    lines = blob.splitlines(keepends=True)
    if record["end_line"] > len(lines):
        return False
    cited = b"".join(lines[record["start_line"] - 1 : record["end_line"]])
    return bool(cited) and hashlib.sha256(blob).hexdigest() == record["blob_sha256"] and hashlib.sha256(cited).hexdigest() == record["cited_range_sha256"]


class BatchBV2TruthContract(unittest.TestCase):
    """Validate complete packages while preserving lifecycle stop-loss."""

    def test_v1_generation_is_additively_superseded_and_non_consumable(self) -> None:
        """Reject the reviewed 91e6331b generation without deleting history."""

        record = load(TRACK / "batch-b-v1-supersession-record.json")
        self.assertEqual(record["superseded_commit"], "91e6331b22e88532d16f24df4068e481dae77a7b")
        self.assertEqual(record["disposition"], "non-consumable-invalid-producer-generation")
        self.assertFalse(record["candidate_or_acceptance_inherited"])
        for path, expected in record["superseded_artifacts"].items():
            self.assertEqual(sha256(ROOT / path), expected)

    def test_exact_three_game_scope_and_predecessors(self) -> None:
        """Fail on scope drift or stale predecessor hashes."""

        discovery = load(TRACK / "batch-b-discovery-audit-v2.json")
        self.assertEqual(discovery["scope"], ["Potion Rush", "Rune Forge Chamber", "Astral Mage"])
        self.assertEqual(discovery["denominator_mismatches"], 0)
        accepted_a = TRACK / "accepted-cohort-manifest-batch-a-v3.json"
        self.assertEqual(sha256(accepted_a), discovery["predecessor_bindings"]["accepted_batch_a_v3_sha256"])

    def test_every_package_has_complete_required_artifact_set(self) -> None:
        """Fail when a per-game legal package is partial."""

        required = {
            "claim-evidence-ledger-v2.json",
            "source-asset-history-ledger-v2.json",
            "negative-fixtures-v2.json",
            "requirements-map-v2.json",
            "browser-audit-v2.json",
        }
        for slug in SLUGS:
            package = TRACK / f"batch-b/{slug}"
            self.assertEqual({path.name for path in package.iterdir() if path.name.endswith("-v2.json")}, required)

    def test_every_claim_has_exact_reproducible_envelope(self) -> None:
        """Fail on invalid path, range, blob hash, range hash, or malformed claim."""

        for slug in SLUGS:
            document = ledger(slug)
            self.assertEqual(document["normalized_game_id"], EXPECTED_IDENTITIES[slug])
            self.assertEqual(len(document["claims"]), EXPECTED_CLAIM_COUNTS[slug])
            self.assertEqual(len(document["unknowns"]), EXPECTED_UNKNOWN_COUNTS[slug])
            for record in document["claims"]:
                self.assertTrue(validate_claim(record), record["claim_id"])
                self.assertNotEqual(record["extracted_source_fact"], record["interpretation"])

    def test_high_risk_claim_semantics_are_independently_rederived(self) -> None:
        """Fail when valid hashes wrap text that lacks the asserted semantic atoms."""

        records = {row["claim_id"]: row for slug in SLUGS for row in ledger(slug)["claims"]}
        self.assertTrue(set(SEMANTIC_TOKENS) <= set(records))
        for claim_id, tokens in SEMANTIC_TOKENS.items():
            row = records[claim_id]
            blob = git_bytes(row["revision"], row["path"]).decode("utf-8")
            cited = "".join(blob.splitlines(keepends=True)[row["start_line"] - 1 : row["end_line"]])
            for token in tokens:
                self.assertIn(token, cited, f"{claim_id}: {token!r}")

    def test_denominator_records_are_complete_exact_and_current_or_historical(self) -> None:
        """Fail on an unresolved accepted source, asset, scene, or history path."""

        discovery = load(TRACK / "batch-b-discovery-audit-v2.json")
        counts = {row["normalized_game_id"]: row["denominator_record_count"] for row in discovery["games"]}
        for slug in SLUGS:
            source = load(TRACK / f"batch-b/{slug}/source-asset-history-ledger-v2.json")
            records = source["denominator_records"]
            self.assertEqual(source["coverage"]["status"], "pass")
            self.assertEqual(source["coverage"]["unresolved_records"], 0)
            self.assertEqual(len(records), counts[EXPECTED_IDENTITIES[slug]])
            self.assertEqual(len({row["path"] for row in records}), len(records))
            for row in records:
                self.assertEqual(hashlib.sha256(git_bytes(row["revision"], row["path"])).hexdigest(), row["blob_sha256"])

    def test_astral_history_is_reachable_with_direct_withdrawal_order(self) -> None:
        """Fail if deleted Astral bytes are promoted to current or chronology drifts."""

        parent = subprocess.run(
            ["git", "show", "-s", "--format=%P", ASTRAL_WITHDRAWAL], cwd=ROOT, check=True, capture_output=True, text=True
        ).stdout.strip()
        self.assertEqual(parent, ASTRAL_HISTORY)
        self.assertEqual(subprocess.run(["git", "merge-base", "--is-ancestor", ASTRAL_WITHDRAWAL, BASELINE], cwd=ROOT, check=False).returncode, 0)
        historical = [row for row in ledger("astral-mage")["claims"] if row["claim_id"].startswith("AM-HIST-")]
        self.assertTrue(historical)
        self.assertTrue(all(row["revision"] == ASTRAL_HISTORY for row in historical))
        for path in (
            "packages/game-cartridges/src/cartridges/astral-mage/definition.ts",
            "packages/game-cartridges/src/cartridges/astral-mage/scene.ts",
        ):
            self.assertNotEqual(
                subprocess.run(
                    ["git", "cat-file", "-e", f"{BASELINE}:{path}"],
                    cwd=ROOT,
                    check=False,
                    capture_output=True,
                ).returncode,
                0,
            )

    def test_duplicate_and_determinism_conflicts_remain_explicit_unknowns(self) -> None:
        """Fail if source weaknesses are silently promoted to supported requirements."""

        potion = ledger("potion-rush")
        rune = ledger("rune-forge-chamber")
        self.assertEqual({row["conflict_id"] for row in potion["conflicts"]}, {"PR-CONFLICT-001"})
        self.assertEqual({row["conflict_id"] for row in rune["conflicts"]}, {"RFC-CONFLICT-001", "RFC-CONFLICT-002"})
        self.assertIn("duplicate-token correctness", {block for row in potion["unknowns"] for block in row["blocks"]})
        self.assertIn("duplicate-token correctness", {block for row in rune["unknowns"] for block in row["blocks"]})
        self.assertIn("deterministic-state contract", {block for row in potion["unknowns"] + rune["unknowns"] for block in row["blocks"]})

    def test_requirements_maps_reference_all_and_only_package_records(self) -> None:
        """Fail on invented mapper facts, foreign IDs, or omitted unknown blockers."""

        for slug in SLUGS:
            document = ledger(slug)
            mapping = load(TRACK / f"batch-b/{slug}/requirements-map-v2.json")
            claim_ids = {row["claim_id"] for row in document["claims"]}
            unknown_ids = {row["claim_id"] for row in document["unknowns"]}
            cited_claims = {claim_id for row in mapping["mappings"] for claim_id in row["cited_claim_ids"]}
            self.assertEqual(cited_claims, claim_ids)
            self.assertEqual(set(mapping["unknown_ids"]), unknown_ids)
            self.assertEqual(mapping["novel_factual_claims"], 0)
            self.assertEqual(mapping["ontology_decisions"], 0)
            self.assertEqual(mapping["browser_claims"], 0)
            self.assertEqual(mapping["developer_effort_decomposition"]["estimate"], "not-estimated-no-observed-effort-basis")

    def test_negative_fixtures_execute_real_failure_paths(self) -> None:
        """Fail if counterexamples are labels without exercised rejection behavior."""

        for slug in SLUGS:
            fixtures = load(TRACK / f"batch-b/{slug}/negative-fixtures-v2.json")["fixtures"]
            self.assertEqual({row["failure_class"] for row in fixtures}, FIXTURE_CLASSES)
            self.assertTrue(all(row["expected_disposition"] == "REJECT" for row in fixtures))
            first = ledger(slug)["claims"][0]
            tampered = copy.deepcopy(first)
            tampered["cited_range_sha256"] = "0" * 64
            self.assertFalse(validate_claim(tampered))
            directory = copy.deepcopy(first)
            directory["path"] = f"batch-b/{slug}/"
            self.assertFalse(validate_claim(directory))
            malformed = copy.deepcopy(first)
            malformed.pop("extracted_source_fact")
            self.assertFalse(validate_claim(malformed))
            browser = load(TRACK / f"batch-b/{slug}/browser-audit-v2.json")
            self.assertFalse(browser["conducted"])
            self.assertFalse(any(browser["success_claims"].values()))
            source = load(TRACK / f"batch-b/{slug}/source-asset-history-ledger-v2.json")
            omitted = source["denominator_records"][:-1]
            self.assertNotEqual(len(omitted), source["coverage"]["records"])

    def test_browser_artifacts_never_promote_unperformed_work(self) -> None:
        """Fail on fabricated route, gameplay, input, responsive, or product evidence."""

        for slug in SLUGS:
            browser = load(TRACK / f"batch-b/{slug}/browser-audit-v2.json")
            self.assertFalse(browser["conducted"])
            self.assertEqual(browser["attempts"], [])
            self.assertEqual(browser["evidence_count"], 0)
            self.assertEqual(browser["captures"], [])
            self.assertEqual(browser["real_input_events"], [])
            self.assertEqual(browser["transitions_observed"], 0)
            self.assertTrue(all(value is False for value in browser["success_claims"].values()))

    def test_role_receipts_are_separate_but_do_not_fabricate_independence(self) -> None:
        """Fail on a renewed aggregate receipt or invented session separation."""

        expected = {
            "discovery-auditor-batch-b-v2.json",
            "truth-test-author-batch-b-v2.json",
            *{f"evidence-collector-{slug}-batch-b-v2.json" for slug in SLUGS},
            *{f"requirements-mapper-{slug}-batch-b-v2.json" for slug in SLUGS},
            *{f"browser-auditor-{slug}-batch-b-v2.json" for slug in SLUGS},
        }
        receipts = [TRACK / "role-receipts" / name for name in expected]
        self.assertTrue(all(path.exists() for path in receipts))
        roles = []
        for path in receipts:
            receipt = load(path)
            roles.append(receipt["role"])
            self.assertFalse(receipt["provider_provenance"]["available"])
            self.assertFalse(receipt["provider_provenance"]["claimed"])
            self.assertFalse(receipt["local_execution"]["distinct_agent_session"])
            self.assertFalse(receipt["local_execution"]["role_separation_satisfied"])
            self.assertIsNone(receipt["resource_accounting"]["elapsed_minutes"])
            for artifact, expected_hash in receipt["output_hashes"].items():
                self.assertEqual(sha256(ROOT / artifact), expected_hash)
        self.assertEqual(len(roles), len(set(roles)))

    def test_receipt_budget_counts_do_not_exceed_frozen_ceilings(self) -> None:
        """Fail on hidden, unlabeled, or over-ceiling deterministic-run counts."""

        for slug in SLUGS:
            collector = load(TRACK / f"role-receipts/evidence-collector-{slug}-batch-b-v2.json")["resource_accounting"]
            mapper = load(TRACK / f"role-receipts/requirements-mapper-{slug}-batch-b-v2.json")["resource_accounting"]
            browser = load(TRACK / f"role-receipts/browser-auditor-{slug}-batch-b-v2.json")["resource_accounting"]
            self.assertLessEqual(collector["cited_ranges"], 72)
            self.assertLessEqual(collector["source_objects_read"], 120)
            self.assertEqual(collector["negative_fixtures"], 6)
            self.assertLessEqual(mapper["ledger_records_read"], 90)
            self.assertLessEqual(mapper["mapping_records"], 48)
            self.assertLessEqual(browser["launch_navigation_attempts"], 18)
            self.assertLessEqual(browser["state_transition_attempts"], 12)
            self.assertLessEqual(browser["captures"], 8)

    def test_readiness_hashes_bind_every_active_producer_artifact(self) -> None:
        """Fail on stale or mutated V2 producer inputs."""

        readiness = load(TRACK / "batch-b-v2-producer-readiness.json")
        self.assertEqual(readiness["status"], "producer-remediation-complete-blocked-before-candidate")
        for path, expected in readiness["active_artifact_hashes"].items():
            self.assertEqual(sha256(ROOT / path), expected, path)

    def test_readiness_preserves_exact_remaining_blockers(self) -> None:
        """Fail if source-stage green language hides role, browser, or review blockers."""

        readiness = load(TRACK / "batch-b-v2-producer-readiness.json")
        self.assertEqual(
            [row["blocker_id"] for row in readiness["blockers"]],
            ["T6-BB-V2-BLOCK-001", "T6-BB-V2-BLOCK-002", "T6-BB-V2-BLOCK-003"],
        )
        self.assertFalse(readiness["consumable"])
        self.assertFalse(readiness["candidate_authorized"])
        self.assertTrue(all(value is False for value in readiness["success_claims"].values()))

    def test_no_candidate_approval_or_accepted_manifest_exists(self) -> None:
        """Fail if producer remediation crosses a separately reviewed lifecycle boundary."""

        forbidden = (
            TRACK / "candidate-cohort-manifest-batch-b-v2.json",
            TRACK / "product-owner-acceptance-batch-b-v2.json",
            TRACK / "accepted-cohort-manifest-batch-b-v2.json",
        )
        self.assertEqual([path.name for path in forbidden if path.exists()], [])

    def test_plan_does_not_claim_package_or_review_completion(self) -> None:
        """Fail if plan bookkeeping outruns the producer evidence state."""

        plan = (TRACK / "plan.md").read_text(encoding="utf-8")
        self.assertIn("V2 producer package rebuilt", plan)
        self.assertIn("distinct-role, browser, and independent-review blockers remain", plan)
        self.assertNotIn("[x] Task: Complete Potion Rush evidence package", plan)
        self.assertNotIn("[x] Task: Complete Rune Forge Chamber evidence package", plan)
        self.assertNotIn("[x] Task: Recover Astral Mage evidence", plan)


if __name__ == "__main__":
    unittest.main()
