"""Batch B V13 truth contracts for Archer V6 rebind and mapper V7.

V13 retains V12's exact Village, Storm, asset, bounded-browser, completion,
review, and lifecycle contracts. It selects the complete Archer V6 collector
lineage through its exact-byte rebind and the complete Archer mapper V7.
Evidence gates are expected green; fresh review and lifecycle remain
fail-closed.
"""

from __future__ import annotations

import importlib.util
import inspect
import json
from pathlib import Path
from typing import Any


_V13_PATH = Path(__file__).resolve()
_TRACK_DIR = _V13_PATH.parent
_REPO_ROOT = _V13_PATH.parents[3]
_RECEIPTS_DIR = _TRACK_DIR / "role-receipts"
_V12_PATH = _TRACK_DIR / "batch-b-truth-tests-v12.py"
_V13_RECEIPT_PATH = _RECEIPTS_DIR / "truth-test-author-batch-b-v13.json"

_spec = importlib.util.spec_from_file_location("batch_b_truth_v12_for_v13", _V12_PATH)
if _spec is None or _spec.loader is None:
    raise RuntimeError(f"Unable to load V12 truth contracts from {_V12_PATH}")
_v12 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_v12)
_core = _v12._core
_v7 = _v12._v11._v10._v9._v8._v7

PHASE_BASE_SHA = "ff01cee9cc973dee89fdc0ba22102dcea0c50542"
ROLE_BASE_SHA = "e519a3db88dc0b4f04f151b60c0c302097646f8c"
ARCHER_SOURCE_REVISION = "cd1936387d136ffb12e77a647f36cbce2d1fdd4e"

ARCHER_V3_LEDGER = _v7.LEDGER_RELATIVE["archers-revenge"]
ARCHER_V6_LEDGER = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/"
    "archers-revenge-claim-ledger-batch-b-v6.json"
)
ARCHER_V6_METHOD = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/"
    "archers-revenge-evidence-method-batch-b-v6.md"
)
ARCHER_V6_REPORT = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/"
    "archers-revenge-evidence-final-report-batch-b-v6.json"
)
ARCHER_V6_RECEIPT = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/"
    "evidence-collector-archers-revenge-batch-b-v6.json"
)
ARCHER_V6_REBIND_REPORT = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/"
    "archers-revenge-evidence-rebind-report-batch-b-v6.json"
)
ARCHER_V6_REBIND_RECEIPT = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/"
    "evidence-collector-archers-revenge-batch-b-v6-rebind.json"
)
ARCHER_V7_MAP = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/"
    "archers-revenge-blueprint-batch-b-v7.json"
)
ARCHER_V7_REPORT = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/"
    "archers-revenge-mapper-final-report-batch-b-v7.json"
)
ARCHER_V7_RECEIPT = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/"
    "requirements-mapper-archers-revenge-batch-b-v7.json"
)
REVIEW_V6 = _v12.REVIEW_V6
REVIEW_RECEIPT_V6 = _v12.REVIEW_RECEIPT_V6

MAPPER_RELATIVE = dict(_v12.MAPPER_RELATIVE)
MAPPER_RELATIVE["archers-revenge"] = ARCHER_V7_MAP
MAPPER_REPORT_RELATIVE = dict(_v12.MAPPER_REPORT_RELATIVE)
MAPPER_REPORT_RELATIVE["archers-revenge"] = ARCHER_V7_REPORT

ADDITIVE_RECEIPTS = dict(_v12.ADDITIVE_RECEIPTS)
ADDITIVE_RECEIPTS.pop("evidence-collector-archers-revenge-batch-b-v5.json")
ADDITIVE_RECEIPTS.pop("requirements-mapper-archers-revenge-batch-b-v6.json")
ADDITIVE_RECEIPTS["requirements-mapper-archers-revenge-batch-b-v7.json"] = (
    "fe989ec5121fb12c372cfdefe0d80dedf27188679a61cf42933d615312280dca"
)
ADDITIVE_RECEIPT_ROLE_BASES = dict(_v12.ADDITIVE_RECEIPT_ROLE_BASES)
ADDITIVE_RECEIPT_ROLE_BASES.pop("evidence-collector-archers-revenge-batch-b-v5.json")
ADDITIVE_RECEIPT_ROLE_BASES.pop("requirements-mapper-archers-revenge-batch-b-v6.json")
ADDITIVE_RECEIPT_ROLE_BASES["requirements-mapper-archers-revenge-batch-b-v7.json"] = (
    "3451d6ed6eae16af9b97ed7587a67cdf7a64b484"
)

ACTIVE_INPUT_HASHES = dict(_v12.ACTIVE_INPUT_HASHES)
for _superseded_path in (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-evidence-method-batch-b-v3.md",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-evidence-final-report-batch-b-v4.json",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-archers-revenge-batch-b-v4.json",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-archers-revenge-batch-b-v5.json",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-blueprint-batch-b-v4.json",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-mapper-final-report-batch-b-v4.json",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-mapper-final-report-batch-b-v5.json",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-archers-revenge-batch-b-v4.json",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-archers-revenge-batch-b-v6.json",
):
    ACTIVE_INPUT_HASHES.pop(_superseded_path)
ACTIVE_INPUT_HASHES.update(
    {
        "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-truth-tests-v12.py": "e1ace5160ce313b5761d0c7b0f3a86484ff768a9711c137e08fe6b99cb1eb46f",
        "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/truth-test-author-batch-b-v12.json": "737a445ddb0b7729c1077efb14810c266e6294cb73c447d511b4c111f86a6644",
        ARCHER_V6_LEDGER: "9a97349ccf699ad73045997f2a89b63f7d751ca043d6a5032de04137d89352af",
        ARCHER_V6_METHOD: "a639889543c15b119c2baf0aba1487ce3a485922edc4b06d573b17a71f628345",
        ARCHER_V6_REPORT: "1c1ce16725572016da5bd4b3f70517e8424490637f3a964a1585e7ea144f04cd",
        ARCHER_V6_RECEIPT: "c04f7fa518b2296fd3c8c7dcadee99fd88572312423bfecd63a03e0dd7ea6658",
        ARCHER_V6_REBIND_REPORT: "9f8a946f5e31cb493f3cbee3b52566d40508ea33702b9b6a86698fecf275fbd1",
        ARCHER_V6_REBIND_RECEIPT: "f89c5e7ddb004cf935826ff8df61fca54c7ec7164d35fe8e30726f9cb60eaf6f",
        ARCHER_V7_MAP: "487bf4031d6f992f214fe3fe898b9ebcdf05907ccd7a28e2bab0c7474739d945",
        ARCHER_V7_REPORT: "c7285b6ab206ccba4dc95ceb8d8220077ee30c1b1adcf84f579c2157252dc9d1",
        ARCHER_V7_RECEIPT: ADDITIVE_RECEIPTS["requirements-mapper-archers-revenge-batch-b-v7.json"],
    }
)

PINNED_RECEIPT_HASHES = dict(_v12.PINNED_RECEIPT_HASHES)
for _superseded_receipt in (
    "evidence-collector-archers-revenge-batch-b-v4.json",
    "evidence-collector-archers-revenge-batch-b-v5.json",
    "requirements-mapper-archers-revenge-batch-b-v4.json",
    "requirements-mapper-archers-revenge-batch-b-v6.json",
):
    PINNED_RECEIPT_HASHES.pop(_superseded_receipt)
PINNED_RECEIPT_HASHES.update(ADDITIVE_RECEIPTS)
PINNED_RECEIPT_HASHES.update(
    {
        "evidence-collector-archers-revenge-batch-b-v6.json": ACTIVE_INPUT_HASHES[ARCHER_V6_RECEIPT],
        "evidence-collector-archers-revenge-batch-b-v6-rebind.json": ACTIVE_INPUT_HASHES[ARCHER_V6_REBIND_RECEIPT],
        "truth-test-author-batch-b-v12.json": ACTIVE_INPUT_HASHES[
            "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/truth-test-author-batch-b-v12.json"
        ],
    }
)
ACTIVE_RECEIPTS = (
    "discovery-auditor-batch-b-v2.json",
    "evidence-collector-village-guardian-batch-b-v3.json",
    "evidence-collector-village-guardian-batch-b-v5.json",
    "evidence-collector-archers-revenge-batch-b-v6-rebind.json",
    "evidence-collector-storm-castle-tower-batch-b.json",
    "requirements-mapper-village-guardian-batch-b-v3.json",
    "requirements-mapper-village-guardian-batch-b-v6.json",
    "requirements-mapper-archers-revenge-batch-b-v7.json",
    "requirements-mapper-storm-castle-tower-batch-b.json",
    "browser-auditor-batch-b-v3.json",
    "asset-auditor-batch-b-v2.json",
    "adversarial-reviewer-batch-b-v6.json",
    "truth-test-author-batch-b-v13.json",
)

ARCHER_V6_SEMANTIC_ATOMS: dict[str, tuple[str, ...]] = {
    "AR-B2-V6-CONFIG-001": ("columns: 5", "targetChangeInterval", "basePointsPerEnemy"),
    "AR-B2-V6-CONFIG-002": ("getDifficultySettings", "playerHp", "descendSpeed"),
    "AR-B2-V6-FORM-001": ("totalEnemies = columns * rows", "shieldUp: index !== targetIndex"),
    "AR-B2-V6-STATE-001": ('status: "playing"', "wave: 1", "correctAnswers: 0"),
    "AR-B2-V6-PROJECTILE-001": ("fireRateMs", "arrows: [...state.arrows, newArrow]", "playerX: x"),
    "AR-B2-V6-TARGET-001": ("targetChangeTimer -= dt", "shieldUp: idx !== newTargetIndex"),
    "AR-B2-V6-MOTION-001": ("enemySpeed * dtSec", "newDirection = -state.formationDirection"),
    "AR-B2-V6-TERMINAL-001": ('status: "defeat"', "playerY - 40"),
    "AR-B2-V6-PROJECTILE-002": ("a.y > 0", "p.y < GAME_HEIGHT"),
    "AR-B2-V6-COMBAT-001": ("if (!enemy.shieldUp)", "newProjectiles.push", "wrongAnswers += 1"),
    "AR-B2-V6-WAVE-001": ("hitEnemies.size > 0", "return nextWave(nextState)"),
    "AR-B2-V6-HEALTH-001": ("nextState.hp -= 1", 'nextState.status = "defeat"'),
    "AR-B2-V6-WAVE-002": ("wave: nextWaveNum", "arrows: []", "formationDirection: 1"),
    "AR-B2-V6-XP-001": ("accuracy", "speedBonus", "survivalBonus", "Math.min(10, rawXP)"),
    "AR-B2-V6-SURFACE-001": ("createArchersRevengeState", 'setGamePhase("playing")'),
    "AR-B2-V6-SURFACE-002": ("enterFullscreen", "exitFullscreen"),
    "AR-B2-V6-SURFACE-003": ("requestAnimationFrame", "Math.min(delta, 50)", 'setGamePhase("ended")'),
    "AR-B2-V6-SURFACE-004": ("dimensions.width / GAME_WIDTH", "dimensions.height / GAME_HEIGHT"),
    "AR-B2-V6-SURFACE-005": ("getPointerPosition", "pointerPosition.x / scale", "fireArrow"),
    "AR-B2-V6-SURFACE-006": ("Target word is shown", "Draw Your Bow", '"easy", "medium", "hard"'),
    "AR-B2-V6-SURFACE-007": ("Target Translation", "gameState.hp", "gameState.wave"),
    "AR-B2-V6-SURFACE-008": ("enemy.translation", "gameState.enemyProjectiles", "targetChangeTimer"),
    "AR-B2-V6-SURFACE-009": ("GameEndScreen", "calculateXP", "Correct", "Health"),
    "AR-B2-V6-INTEGRATION-001": ('"/api/v1/games/archers-revenge/vocabulary"', "vocabulary.length >= 15"),
    "AR-B2-V6-INTEGRATION-002": ('"/api/v1/games/archers-revenge/complete"', 'method: "POST"', "timeTaken"),
}


def _load_json(relative: str) -> dict[str, Any]:
    """Loads one repository-relative JSON object.

    @param relative Repository-relative artifact path.
    @returns The parsed JSON object.
    """
    return _core.load_json(_REPO_ROOT / relative)


def _archer_v3_claims() -> list[dict[str, Any]]:
    """Returns the immutable inherited Archer V3 factual claims.

    @returns The inherited factual claim records.
    """
    return _load_json(ARCHER_V3_LEDGER)["claims"]


def _archer_v6_claims() -> list[dict[str, Any]]:
    """Returns the additive Archer V6 factual claims.

    @returns The V6-added factual claim records.
    """
    return _load_json(ARCHER_V6_LEDGER)["claims"]


def _active_archer_claims() -> list[dict[str, Any]]:
    """Returns the inherited plus additive Archer factual population.

    @returns The exact 45-claim active Archer population.
    """
    return [*_archer_v3_claims(), *_archer_v6_claims()]


def _active_archer_fixtures() -> list[dict[str, Any]]:
    """Returns inherited and additive Archer negative fixtures.

    @returns The exact eight-fixture active Archer population.
    """
    return [
        *_load_json(ARCHER_V3_LEDGER)["negative_fixtures"],
        *_load_json(ARCHER_V6_LEDGER)["negative_fixtures"],
    ]


def _v6_cited_bytes(record: dict[str, Any]) -> bytes:
    """Returns exact cited bytes for one V6 claim.

    @param record One V6 claim record.
    @returns Exact bytes inside the declared inclusive range.
    """
    blob = _core.git_show(ARCHER_SOURCE_REVISION, record["relative_path"])
    if blob is None:
        return b""
    selected = _core.range_bytes(record, blob)
    return selected if selected is not None else b""


# Point inherited contracts at the exact V13-selected immutable inputs.
_modules = (
    _v12,
    _v12._v11,
    _v12._v11._v10,
    _v12._v11._v10._v9,
    _v12._v11._v10._v9._v8,
    _v7,
    _core,
)
for _module in _modules:
    _module.ROLE_BASE_SHA = ROLE_BASE_SHA
    _module.ACTIVE_INPUT_HASHES = ACTIVE_INPUT_HASHES
    _module.PINNED_RECEIPT_HASHES = PINNED_RECEIPT_HASHES
    _module.ACTIVE_RECEIPTS = ACTIVE_RECEIPTS
for _module in _modules[:-1]:
    _module.MAPPER_RELATIVE = MAPPER_RELATIVE
    _module.MAPPER_REPORT_RELATIVE = MAPPER_REPORT_RELATIVE
_v12.ADDITIVE_RECEIPTS = ADDITIVE_RECEIPTS
_v12.ADDITIVE_RECEIPT_ROLE_BASES = ADDITIVE_RECEIPT_ROLE_BASES
_v12._v11.ADDITIVE_RECEIPTS = ADDITIVE_RECEIPTS
_v12._v11.ADDITIVE_RECEIPT_ROLE_BASES = ADDITIVE_RECEIPT_ROLE_BASES
_v12._V12_PATH = _V13_PATH
_v12._V12_RECEIPT_PATH = _V13_RECEIPT_PATH
_v12._v11._V11_PATH = _V13_PATH
_v12._v11._V11_RECEIPT_PATH = _V13_RECEIPT_PATH
_v12._v11._v10._V10_PATH = _V13_PATH
_v12._v11._v10._V10_RECEIPT_PATH = _V13_RECEIPT_PATH
_v12._v11._v10._v9._V9_PATH = _V13_PATH
_v12._v11._v10._v9._V9_RECEIPT_PATH = _V13_RECEIPT_PATH
_v12._v11._v10._v9._v8._V8_PATH = _V13_PATH
_v12._v11._v10._v9._v8._V8_RECEIPT_PATH = _V13_RECEIPT_PATH
_v7._V7_PATH = _V13_PATH
_v7._V7_RECEIPT_PATH = _V13_RECEIPT_PATH
_core.V6_PATH = _V13_PATH
_core.V6_RECEIPT_PATH = _V13_RECEIPT_PATH


class BatchBFreezeContract(_v12.BatchBFreezeContract):
    """B0 exact committed V13 input, scope, predecessor, and direction contracts."""

    def test_scope_is_exact_across_every_active_artifact(self) -> None:
        """Fails when: V13 changes scope or the V6 additive ledger loses its frozen source lineage."""
        expected = set(_core.GAMES)
        discovery = _core.load_json(_core.DISCOVERY_PATH)
        self.assertEqual({item["normalized_id"] for item in discovery["authoritative_scope"]}, expected)
        self.assertEqual(set(_core.LEDGER_PATHS), expected)
        v6 = _load_json(ARCHER_V6_LEDGER)
        self.assertEqual((v6["game"], v6["normalized_game_id"]), ("Archer's Revenge", "archers-revenge"))
        self.assertEqual(v6["role_base_sha"], "9de8a51d236e1fd9b8a4413ecc9d65da1500b129")
        self.assertEqual(v6["source_baseline_revision"], ARCHER_SOURCE_REVISION)
        self.assertEqual(v6["inherited_claim_ledger"]["path"], ARCHER_V3_LEDGER)
        self.assertEqual({item["normalized_id"] for item in _core.load_json(_core.BROWSER_PATH)["games"]}, expected)
        self.assertEqual({item["ownership"] for item in _core.load_json(_core.ASSET_PATH)["records"]}, expected)
        self.assertEqual(set(_core.load_json(_core.REVIEW_PATH)["scope"]), expected)


class BatchBCollectorPackageContract(_v12.BatchBCollectorPackageContract):
    """B1 source truth plus exact Archer V6 rebind contracts."""

    def test_selected_packages_are_nonempty_and_counts_reconcile(self) -> None:
        """Fails when: V13 does not select exactly 160 facts and 16 separate negative fixtures."""
        self.assertEqual(len(_core.claims("village-guardian")), 73)
        self.assertEqual(len(_active_archer_claims()), 45)
        self.assertEqual(len(_core.claims("storm-castle-tower")), 42)
        self.assertEqual(len(_core.fixtures("village-guardian")), 4)
        self.assertEqual(len(_active_archer_fixtures()), 8)
        self.assertEqual(len(_core.fixtures("storm-castle-tower")), 4)
        all_ids = [
            *(_core.claim_id(item) for item in _core.claims("village-guardian")),
            *(_core.claim_id(item) for item in _active_archer_claims()),
            *(_core.claim_id(item) for item in _core.claims("storm-castle-tower")),
        ]
        self.assertEqual(len(all_ids), 160)
        self.assertEqual(len(all_ids), len(set(all_ids)))
        report = _load_json(ARCHER_V6_REPORT)
        self.assertEqual(report["completeness"]["aggregate_factual_claims"], 45)
        self.assertEqual(report["completeness"]["new_negative_fixtures"], 4)

    def test_every_positive_claim_source_envelope_rederives(self) -> None:
        """Fails when: any inherited positive envelope or any of the 25 V6 envelopes drifts."""
        super().test_every_positive_claim_source_envelope_rederives()
        defects: list[str] = []
        for record in _archer_v6_claims():
            normalized = dict(record, source_revision=ARCHER_SOURCE_REVISION)
            error = _core.citation_error(normalized, record["claim_id"])
            if error:
                defects.append(error)
        self.assertEqual(defects, [])

    def test_denominator_and_disc_001_boundaries_are_preserved(self) -> None:
        """Fails when: Archer V6 loses its exact inherited V3 denominator/disclosure boundary."""
        inherited = _load_json(ARCHER_V3_LEDGER)
        binding = _load_json(ARCHER_V6_LEDGER)["inherited_claim_ledger"]
        self.assertEqual(binding["sha256"], _core.file_hash(_REPO_ROOT / ARCHER_V3_LEDGER))
        self.assertEqual(binding["factual_claim_count"], 20)
        self.assertEqual(binding["negative_fixture_count"], 4)
        self.assertEqual(inherited["carried_forward_disclosures"][0]["id"], "DISC-001")
        self.assertIn("process metadata only", inherited["carried_forward_disclosures"][0]["use"])
        self.assertNotIn("DISC-001", json.dumps(_load_json(ARCHER_V6_LEDGER)["claims"]))
        self.assertNotIn("DISC-001", json.dumps(_load_json(ARCHER_V6_LEDGER)["negative_fixtures"]))

    def test_archer_v6_rebind_selects_exact_current_output_bytes(self) -> None:
        """Fails when: the V6 rebind report or receipt does not bind the exact ledger, method, and report bytes."""
        report = _load_json(ARCHER_V6_REBIND_REPORT)
        receipt = _load_json(ARCHER_V6_REBIND_RECEIPT)
        expected = {
            ARCHER_V6_LEDGER: ACTIVE_INPUT_HASHES[ARCHER_V6_LEDGER],
            ARCHER_V6_METHOD: ACTIVE_INPUT_HASHES[ARCHER_V6_METHOD],
            ARCHER_V6_REPORT: ACTIVE_INPUT_HASHES[ARCHER_V6_REPORT],
        }
        self.assertEqual(receipt["output_paths_and_sha256"], expected)
        self.assertEqual(receipt["supersedes_receipt_path"], ARCHER_V6_RECEIPT)
        self.assertEqual(receipt["rebind_report"], ARCHER_V6_REBIND_REPORT)
        self.assertFalse(report["revalidation"]["claims_changed"])
        self.assertFalse(report["revalidation"]["claim_ledger_modified"])
        self.assertEqual(
            {item["path"]: item["sha256"] for item in report["bound_outputs"].values()},
            expected,
        )


class BatchBMapperPackageContract(_v12.BatchBMapperPackageContract):
    """B2 exact Village and Archer current mapper-lineage contracts."""

    def test_mappers_bind_every_exact_active_claim_id(self) -> None:
        """Fails when: Village V5 or Archer V7 omits, duplicates, invents, or misbinds an active claim."""
        village = _load_json(MAPPER_RELATIVE["village-guardian"])
        village_refs = set(_core.iter_claim_references(village))
        self.assertEqual(village_refs, {_core.claim_id(item) for item in _core.claims("village-guardian")})

        blueprint = _load_json(ARCHER_V7_MAP)
        report = _load_json(ARCHER_V7_REPORT)
        receipt = _load_json(ARCHER_V7_RECEIPT)
        active_ids = [_core.claim_id(item) for item in _active_archer_claims()]
        section_ids = [claim for section in blueprint["mapped_sections"] for claim in section["claim_ids"]]
        self.assertEqual(len(section_ids), 45)
        self.assertEqual(len(section_ids), len(set(section_ids)))
        self.assertEqual(set(section_ids), set(active_ids))
        self.assertEqual(set(blueprint["referenced_claim_ids"]), set(active_ids))
        self.assertEqual(blueprint["claim_reconciliation"]["aggregate_claim_count"], 45)
        self.assertEqual(set(blueprint["negative_fixtures_preserved"]), {item["fixture_id"] for item in _active_archer_fixtures()})
        self.assertEqual(report["source_claim_ledger"]["path"], ARCHER_V6_LEDGER)
        self.assertEqual(report["source_claim_ledger"]["sha256"], ACTIVE_INPUT_HASHES[ARCHER_V6_LEDGER])
        self.assertEqual(report["map"], {"path": ARCHER_V7_MAP, "sha256": ACTIVE_INPUT_HASHES[ARCHER_V7_MAP]})
        self.assertEqual(report["reference_accounting"]["resolved_reference_count"], 45)
        self.assertEqual(report["reference_accounting"]["unresolved_reference_count"], 0)
        self.assertEqual(receipt["map_bindings"]["mapper_report_sha256"], ACTIVE_INPUT_HASHES[ARCHER_V7_REPORT])
        self.assertEqual(receipt["role_base_sha"], "3451d6ed6eae16af9b97ed7587a67cdf7a64b484")
        self.assertEqual(receipt["input_hashes"]["archers_revenge_collector_rebind_report_v6"], ACTIVE_INPUT_HASHES[ARCHER_V6_REBIND_REPORT])
        self.assertEqual(receipt["input_hashes"]["archers_revenge_collector_rebind_receipt_v6"], ACTIVE_INPUT_HASHES[ARCHER_V6_REBIND_RECEIPT])


class BatchBClaimTruthContract(_v12.BatchBClaimTruthContract):
    """B3 independent all-claim source-semantic contracts."""

    def test_archer_and_storm_semantic_atoms_all_match_exact_ranges(self) -> None:
        """Fails when: an inherited Archer/Storm atom or any V6 semantic atom is absent from exact cited bytes."""
        super().test_archer_and_storm_semantic_atoms_all_match_exact_ranges()
        self.assertEqual(set(ARCHER_V6_SEMANTIC_ATOMS), {item["claim_id"] for item in _archer_v6_claims()})
        defects = [
            f"{record['claim_id']}:{atom}"
            for record in _archer_v6_claims()
            for atom in ARCHER_V6_SEMANTIC_ATOMS[record["claim_id"]]
            if atom not in _v6_cited_bytes(record).decode("utf-8", errors="replace")
        ]
        self.assertEqual(defects, [])

    def test_every_claim_has_a_fact_interpretation_and_temporal_boundary(self) -> None:
        """Fails when: inherited facts regress or V6 promotes historical source to current/live behavior."""
        super().test_every_claim_has_a_fact_interpretation_and_temporal_boundary()
        for record in _archer_v6_claims():
            self.assertTrue(record.get("category"), record["claim_id"])
            self.assertTrue(record.get("source_fact"), record["claim_id"])
            self.assertIn("Historical", record.get("interpretation", ""), record["claim_id"])
        boundary = _load_json(ARCHER_V6_REPORT)["boundary"]
        self.assertEqual(boundary["current_runtime"], "unknown")
        self.assertEqual(boundary["runnable"], "unknown")
        self.assertEqual(boundary["browser"], "not performed")
        self.assertEqual(boundary["completion_success"], "unknown")

    def test_every_test_has_an_explicit_fails_when_contract(self) -> None:
        """Fails when: any V13 truth test lacks an auditable `Fails when:` condition."""
        missing: list[str] = []
        module = __import__(__name__)
        for _, cls in inspect.getmembers(module, inspect.isclass):
            if cls.__module__ != __name__ or not cls.__name__.startswith("BatchB"):
                continue
            for name, method in inspect.getmembers(cls, inspect.isfunction):
                if name.startswith("test_") and "Fails when:" not in (inspect.getdoc(method) or ""):
                    missing.append(f"{cls.__name__}.{name}")
        self.assertEqual(missing, [])


class BatchBNegativeFixtureContract(_v12.BatchBNegativeFixtureContract):
    """B3 inherited and additive fixture-refutation contracts."""

    def test_all_twelve_fixtures_are_unique_rejected_and_excluded(self) -> None:
        """Fails when: the active 16 fixtures collide, count as facts, or have a non-reject disposition."""
        factual = {
            *(_core.claim_id(item) for item in _core.claims("village-guardian")),
            *(_core.claim_id(item) for item in _active_archer_claims()),
            *(_core.claim_id(item) for item in _core.claims("storm-castle-tower")),
        }
        fixtures = [
            *_core.fixtures("village-guardian"),
            *_active_archer_fixtures(),
            *_core.fixtures("storm-castle-tower"),
        ]
        fixture_ids = [item["fixture_id"] for item in fixtures]
        self.assertEqual(len(fixture_ids), 16)
        self.assertEqual(len(fixture_ids), len(set(fixture_ids)))
        self.assertFalse(factual & set(fixture_ids))
        for fixture in fixtures:
            self.assertIn(str(fixture.get("expected_disposition", "")).upper(), {"FAIL", "REJECT"})
            self.assertFalse(fixture.get("counts_as_claim", fixture.get("counts_as_factual_claim", False)))

    def test_archer_fixture_refutations_rederive_from_source_boundaries(self) -> None:
        """Fails when: inherited or V6 fixtures promote historical, compound, responsive, or completion propositions."""
        super().test_archer_fixture_refutations_rederive_from_source_boundaries()
        records = {item["fixture_id"]: item for item in _load_json(ARCHER_V6_LEDGER)["negative_fixtures"]}
        self.assertIn("historical source", records["AR-B2-V6-FIX-001"]["reason"])
        self.assertIn("separate atoms", records["AR-B2-V6-FIX-002"]["reason"])
        self.assertIn("not compact/wide live observation", records["AR-B2-V6-FIX-003"]["reason"])
        self.assertIn("not HTTP success or persistence", records["AR-B2-V6-FIX-004"]["reason"])
        active_ids = {_core.claim_id(item) for item in _active_archer_claims()}
        for fixture in records.values():
            references = fixture.get("source_checked_claim_ids", [fixture.get("source_checked_claim_id")])
            self.assertTrue(all(reference in active_ids for reference in references if reference))


class BatchBReceiptContract(_v12.BatchBReceiptContract):
    """Exact local receipt, Archer rebind, and provider-disclosure contracts."""

    def test_v6_receipt_binds_exact_test_bytes_and_role_base(self) -> None:
        """Fails when: the V13 receipt selects another role, base, input set, or truth-test bytes."""
        receipt = _core.load_json(_V13_RECEIPT_PATH)
        self.assertEqual(receipt.get("role"), "truth-test-author-batch-b-v13")
        self.assertEqual(receipt.get("role_base_sha"), ROLE_BASE_SHA)
        self.assertEqual(receipt.get("input_hashes"), ACTIVE_INPUT_HASHES)
        binding = next(
            (item for item in _v12._v11._receipt_output_bindings(receipt) if item[0] == str(_V13_PATH.relative_to(_REPO_ROOT))),
            None,
        )
        self.assertIsNotNone(binding)
        self.assertEqual(binding[1], _core.file_hash(_V13_PATH))

    def test_unavailable_provider_fields_do_not_automatically_fail_local_receipts(self) -> None:
        """Fails when: an active receipt loses local identity or fabricates unavailable provider provenance."""
        for name in ACTIVE_RECEIPTS:
            receipt = _core.load_json(_RECEIPTS_DIR / name)
            self.assertEqual(receipt.get("track_id"), _core.TRACK_ID, name)
            self.assertEqual(receipt.get("phase"), _core.PHASE, name)
            if name == "evidence-collector-archers-revenge-batch-b-v6-rebind.json":
                self.assertEqual(receipt["role_identity"], "additive exact-byte rebind only")
                self.assertEqual(_core.git_show(ROLE_BASE_SHA, str((_RECEIPTS_DIR / name).relative_to(_REPO_ROOT))), (_RECEIPTS_DIR / name).read_bytes())
                continue
            self.assertEqual(receipt.get("phase_base_sha"), PHASE_BASE_SHA, name)
            serialized = json.dumps(receipt).lower()
            if "provider" in serialized:
                self.assertTrue("unavailable" in serialized or "not exposed" in serialized, name)

    def test_latest_artifacts_bind_the_correct_owner_provenance_direction(self) -> None:
        """Fails when: Archer V6/V7 claims provider authority, browser proof, or completion success."""
        mapper = _load_json(ARCHER_V7_RECEIPT)
        collector = _load_json(ARCHER_V6_RECEIPT)
        self.assertEqual(mapper["provenance_direction"]["decision"], "LOCAL_VERIFIABLE_RECEIPTS_ACCEPTED_WITH_DISCLOSURE")
        self.assertFalse(mapper["provider_provenance"]["available"])
        self.assertFalse(mapper["provider_provenance"]["attestation_claimed"])
        self.assertFalse(mapper["completion_success_claimed"])
        self.assertEqual(mapper["browser_interactions"], 0)
        self.assertTrue(collector["provider_provenance"]["unavailable"])
        self.assertFalse(collector["provider_provenance"]["attestation_claimed"])


class BatchBBrowserContract(_v12.BatchBBrowserContract):
    """B4 exact WebBridge evidence and bounded-browser contracts."""


class BatchBAssetContract(_v12.BatchBAssetContract):
    """B4 exact asset-V2 denominator, source, and live-limit contracts."""


class BatchBCompletionContract(_v12.BatchBCompletionContract):
    """The disclosure-only owner disposition for the observed completion defect."""


class BatchBIndependentReviewContract(_v12.BatchBIndependentReviewContract):
    """B5 latest prior-review selection plus fail-closed fresh-review contracts."""

    def test_review_v4_binds_every_exact_active_additive_input(self) -> None:
        """Fails when: no fresh review binds every V13 input and both exact V13 outputs."""
        inputs = _core.load_json(_core.REVIEW_RECEIPT_PATH).get("input_hashes", {})
        required = {
            relative: digest
            for relative, digest in ACTIVE_INPUT_HASHES.items()
            if relative not in {REVIEW_V6, REVIEW_RECEIPT_V6}
        }
        required[str(_V13_PATH.relative_to(_REPO_ROOT))] = _core.file_hash(_V13_PATH)
        required[str(_V13_RECEIPT_PATH.relative_to(_REPO_ROOT))] = _core.file_hash(_V13_RECEIPT_PATH)
        defects = [relative for relative, digest in required.items() if inputs.get(relative) != digest]
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B5_FRESH_REVIEW_V13]: " + ", ".join(defects))


class BatchBAcceptanceContract(_v12.BatchBAcceptanceContract):
    """B5 candidate, approval, and accepted-manifest existence gates."""


if __name__ == "__main__":
    _core.unittest.main()
