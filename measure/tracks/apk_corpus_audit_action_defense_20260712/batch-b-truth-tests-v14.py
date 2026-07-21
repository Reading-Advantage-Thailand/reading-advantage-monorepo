"""Batch B V14 truth contracts for the complete V7/V8 Archer lineage.

V14 retains V13's exact Village, Storm, asset, bounded-browser, completion,
review, and lifecycle contracts. It selects the complete Village mapper V8
receipt, the self-contained atomic Archer V7 collector package and complete
rebind, and the Archer V8 map. Evidence gates are green only for exact facts;
fresh review and lifecycle remain fail-closed.
"""

from __future__ import annotations

import importlib.util
import inspect
import json
from pathlib import Path
from typing import Any


_V14_PATH = Path(__file__).resolve()
_TRACK_DIR = _V14_PATH.parent
_REPO_ROOT = _V14_PATH.parents[3]
_RECEIPTS_DIR = _TRACK_DIR / "role-receipts"
_V13_PATH = _TRACK_DIR / "batch-b-truth-tests-v13.py"
_V14_RECEIPT_PATH = _RECEIPTS_DIR / "truth-test-author-batch-b-v14.json"

_spec = importlib.util.spec_from_file_location("batch_b_truth_v13_for_v14", _V13_PATH)
if _spec is None or _spec.loader is None:
    raise RuntimeError(f"Unable to load V13 truth contracts from {_V13_PATH}")
_v13 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_v13)
_core = _v13._core

PHASE_BASE_SHA = "ff01cee9cc973dee89fdc0ba22102dcea0c50542"
ROLE_BASE_SHA = "eb7e7a137d6900f04fed94403623fe4d5434e28b"
ARCHER_TEXT_REVISION = "cd1936387d136ffb12e77a647f36cbce2d1fdd4e"
SOURCE_BASELINE_REVISION = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"

ARCHER_V6_LEDGER = _v13.ARCHER_V6_LEDGER
ARCHER_V6_REPORT = _v13.ARCHER_V6_REPORT
ARCHER_V6_REBIND_REPORT = _v13.ARCHER_V6_REBIND_REPORT
ARCHER_V7_LEDGER = "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-claim-ledger-batch-b-v7.json"
ARCHER_V7_METHOD = "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-evidence-method-batch-b-v7.md"
ARCHER_V7_REPORT = "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-evidence-final-report-batch-b-v7.json"
ARCHER_V7_RECEIPT = "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-archers-revenge-batch-b-v7.json"
ARCHER_V7_REBIND_REPORT = "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-evidence-rebind-report-batch-b-v7.json"
ARCHER_V7_COMPLETE_RECEIPT = "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-archers-revenge-batch-b-v7-rebind-complete.json"
ARCHER_V8_PREDECESSOR_REBIND_RECEIPT = "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-archers-revenge-batch-b-v8-rebind.json"
ARCHER_V7_MAP = _v13.ARCHER_V7_MAP
ARCHER_V7_MAPPER_REPORT = _v13.ARCHER_V7_REPORT
ARCHER_V7_MAPPER_RECEIPT = _v13.ARCHER_V7_RECEIPT
ARCHER_V8_MAP = "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-blueprint-batch-b-v8.json"
ARCHER_V8_MAPPER_REPORT = "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-mapper-final-report-batch-b-v8.json"
ARCHER_V8_MAPPER_RECEIPT = "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-archers-revenge-batch-b-v8-fresh.json"
VILLAGE_V7_MAPPER_RECEIPT = "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-village-guardian-batch-b-v7.json"
VILLAGE_V8_MAPPER_RECEIPT = "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-village-guardian-batch-b-v8.json"
ROLE_APPLICABILITY = "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-role-applicability.json"
BUDGET_DECLARATION = "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-budget-declaration.json"

MAPPER_RELATIVE = dict(_v13.MAPPER_RELATIVE)
MAPPER_RELATIVE["archers-revenge"] = ARCHER_V8_MAP
MAPPER_REPORT_RELATIVE = dict(_v13.MAPPER_REPORT_RELATIVE)
MAPPER_REPORT_RELATIVE["archers-revenge"] = ARCHER_V8_MAPPER_REPORT

ACTIVE_INPUT_HASHES = dict(_v13.ACTIVE_INPUT_HASHES)
for _superseded_path in (
    _v13.ARCHER_V6_LEDGER,
    _v13.ARCHER_V6_METHOD,
    _v13.ARCHER_V6_REPORT,
    _v13.ARCHER_V6_RECEIPT,
    _v13.ARCHER_V6_REBIND_RECEIPT,
    _v13.ARCHER_V7_MAP,
    _v13.ARCHER_V7_REPORT,
    _v13.ARCHER_V7_RECEIPT,
):
    ACTIVE_INPUT_HASHES.pop(_superseded_path, None)
ACTIVE_INPUT_HASHES.update(
    {
        "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-truth-tests-v13.py": "bc7885b12be69974baa59326383fd4cf30d867ea15cde2ffa773301540644b6c",
        "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/truth-test-author-batch-b-v13.json": "647b830dc836b076b112373cec4c1d5a2b754a16f8f5d9382ef1ff0c63818460",
        ARCHER_V6_LEDGER: "9a97349ccf699ad73045997f2a89b63f7d751ca043d6a5032de04137d89352af",
        ARCHER_V6_REPORT: "1c1ce16725572016da5bd4b3f70517e8424490637f3a964a1585e7ea144f04cd",
        ARCHER_V6_REBIND_REPORT: "9f8a946f5e31cb493f3cbee3b52566d40508ea33702b9b6a86698fecf275fbd1",
        ARCHER_V7_LEDGER: "a6e6b9d5b3ac3f89dab167f830a082b6c1cae71ed9fa4254ec507fbe9e5582d3",
        ARCHER_V7_METHOD: "f730a385b439b1e8d878a991384d9d49178d1e99d21cf148497c8ee6dc7720a6",
        ARCHER_V7_REPORT: "16e7b8ca4b7ca61b1be54da709559a5af9c5e8be884b4211f7f5adbff437fff7",
        ARCHER_V7_RECEIPT: "c1934811ce466ac8afbb1702b8afc9949df6997de1520edb5af89ce3d489d99a",
        ARCHER_V7_REBIND_REPORT: "55cc8fcd61f27a5a50cb4b8f5e7310a05ca2e2f400f96054f44db02dc3454053",
        ARCHER_V7_COMPLETE_RECEIPT: "916f0a3307625dfad2b11e02480698f8bb1670b3d918cf41f0c5b1ab168939f2",
        ARCHER_V8_PREDECESSOR_REBIND_RECEIPT: "183e6f18c7b2f77928b1ddc6f6396052ffa12cd9047a363ff9595ead460e7f63",
        ARCHER_V7_MAP: "487bf4031d6f992f214fe3fe898b9ebcdf05907ccd7a28e2bab0c7474739d945",
        ARCHER_V7_MAPPER_REPORT: "c7285b6ab206ccba4dc95ceb8d8220077ee30c1b1adcf84f579c2157252dc9d1",
        ARCHER_V7_MAPPER_RECEIPT: "fe989ec5121fb12c372cfdefe0d80dedf27188679a61cf42933d615312280dca",
        ARCHER_V8_MAP: "e8845a7cfa39c79e1ea4732234c88167cde591345d278d9ec982eb7069c840d5",
        ARCHER_V8_MAPPER_REPORT: "f0eef8c29b125c8aa35b7ebdfd2f16881e9ee03d557f7e8d08800e6e94ccdc6b",
        ARCHER_V8_MAPPER_RECEIPT: "f6ca3a2570fd36f7b1fc0d8b823ab103aa6e7e0926a3ae29200c2ec94079a4a1",
        VILLAGE_V7_MAPPER_RECEIPT: "1b9cf39cb090404e9b0952a7036205189f7c05ba19e5e8de54b1b8f5fcda51d9",
        VILLAGE_V8_MAPPER_RECEIPT: "0ec4636426828ba660f9763bcb9f1bacb14aff372b8ce341e078f038598f5f84",
        ROLE_APPLICABILITY: "71db3e7eb9ac71177d7a555ceb6e43218c9bcbd5ca0afdaa2b5574ace9a38bb4",
        BUDGET_DECLARATION: "7d649b94d28ddc4538b79ba68a7e0cd71597ec2968ca7ae09874cf817a8b0f2f",
    }
)

PINNED_RECEIPT_HASHES = dict(_v13.PINNED_RECEIPT_HASHES)
for _superseded_receipt in (
    "evidence-collector-archers-revenge-batch-b-v6.json",
    "evidence-collector-archers-revenge-batch-b-v6-rebind.json",
    "requirements-mapper-village-guardian-batch-b-v6.json",
    "requirements-mapper-archers-revenge-batch-b-v7.json",
):
    PINNED_RECEIPT_HASHES.pop(_superseded_receipt, None)
PINNED_RECEIPT_HASHES.update(
    {
        Path(ARCHER_V7_COMPLETE_RECEIPT).name: ACTIVE_INPUT_HASHES[ARCHER_V7_COMPLETE_RECEIPT],
        Path(ARCHER_V8_MAPPER_RECEIPT).name: ACTIVE_INPUT_HASHES[ARCHER_V8_MAPPER_RECEIPT],
        Path(VILLAGE_V8_MAPPER_RECEIPT).name: ACTIVE_INPUT_HASHES[VILLAGE_V8_MAPPER_RECEIPT],
        "truth-test-author-batch-b-v13.json": ACTIVE_INPUT_HASHES[
            "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/truth-test-author-batch-b-v13.json"
        ],
    }
)
ACTIVE_RECEIPTS = (
    "discovery-auditor-batch-b-v2.json",
    "evidence-collector-village-guardian-batch-b-v3.json",
    "evidence-collector-village-guardian-batch-b-v5.json",
    Path(ARCHER_V7_COMPLETE_RECEIPT).name,
    "evidence-collector-storm-castle-tower-batch-b.json",
    "requirements-mapper-village-guardian-batch-b-v3.json",
    Path(VILLAGE_V8_MAPPER_RECEIPT).name,
    Path(ARCHER_V8_MAPPER_RECEIPT).name,
    "requirements-mapper-storm-castle-tower-batch-b.json",
    "browser-auditor-batch-b-v3.json",
    "asset-auditor-batch-b-v2.json",
    "adversarial-reviewer-batch-b-v6.json",
    "truth-test-author-batch-b-v14.json",
)

ARCHER_V7_SEMANTIC_ATOMS: dict[str, tuple[str, ...]] = {
    "AR-B2-V7-001": ("easy: 5", "normal: 3", "hard: 2", "extreme: 1"),
    "AR-B2-V7-002": ("speed: 400", "fireRateMs: 500"),
    "AR-B2-V7-003": ("columns: 5",),
    "AR-B2-V7-004": ("totalEnemies = columns * rows",),
    "AR-B2-V7-005": ("while (shuffledVocab.length < totalEnemies)",),
    "AR-B2-V7-006": ("bottomRow = rows - 1", "targetIndex = bottomRow * columns + targetColumn"),
    "AR-B2-V7-007": ("shieldUp: index !== targetIndex",),
    "AR-B2-V7-008": ("Vocabulary cannot be empty",),
    "AR-B2-V7-009": ('status: "playing"',),
    "AR-B2-V7-010": ('state.status !== "playing"', "return state"),
    "AR-B2-V7-011": ("vy: -ARCHERS_REVENGE_CONFIG.arrow.speed",),
    "AR-B2-V7-012": ("targetChangeTimer -= dt",),
    "AR-B2-V7-013": ("newTarget", "targetWord"),
    "AR-B2-V7-014": ("y: e.y + moveY",),
    "AR-B2-V7-015": ('status: "defeat"', "playerY - 40"),
    "AR-B2-V7-016": ("a.y > 0",),
    "AR-B2-V7-017": ("dx < enemySize.width / 2", "dy < enemySize.height / 2"),
    "AR-B2-V7-018": ("correctAnswers += 1",),
    "AR-B2-V7-019": ("newProjectiles.push", "enemy.projectileSpeed"),
    "AR-B2-V7-020": ("nextState.hp -= 1",),
    "AR-B2-V7-021": ("wave: nextWaveNum",),
    "AR-B2-V7-022": ("Math.max(1", "Math.min(10, rawXP)"),
    "AR-B2-V7-023": ("dimensions.width / GAME_WIDTH", "dimensions.height / GAME_HEIGHT"),
    "AR-B2-V7-024": ("pointerPosition.x / scale", "fireArrow"),
    "AR-B2-V7-025": ("vocabulary.length >= 15",),
    "AR-B2-V7-026": ("correctAnswers", "totalAttempts", "accuracy", "score", "timeTaken", "difficulty"),
    "AR-B2-V7-ASSET-001": ("89504e470d0a1a0a",),
    "AR-B2-V7-ASSET-002": ("89504e470d0a1a0a",),
    "AR-B2-V7-ASSET-003": ("89504e470d0a1a0a",),
}


def _load_json(relative: str) -> dict[str, Any]:
    """Loads one repository-relative JSON object.

    @param relative Repository-relative artifact path.
    @returns The parsed JSON object.
    """
    return _core.load_json(_REPO_ROOT / relative)


def _archer_v7_claims() -> list[dict[str, Any]]:
    """Returns the self-contained Archer V7 factual population.

    @returns The exact 29 V7 factual records.
    """
    return _load_json(ARCHER_V7_LEDGER)["claims"]


def _archer_v7_fixtures() -> list[dict[str, Any]]:
    """Returns the self-contained Archer V7 negative fixtures.

    @returns The exact four V7 validation controls.
    """
    return _load_json(ARCHER_V7_LEDGER)["negative_fixtures"]


def _output_records(receipt: dict[str, Any]) -> list[tuple[str, str | None]]:
    """Normalizes explicit receipt output records without treating inputs as outputs.

    @param receipt Parsed role receipt.
    @returns Explicit output path and digest pairs.
    """
    records: list[tuple[str, str | None]] = []

    def walk(value: Any) -> None:
        if isinstance(value, dict) and isinstance(value.get("path"), str):
            records.append((value["path"], value.get("sha256")))
            return
        if isinstance(value, dict):
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)

    for key in ("outputs", "output_hashes", "output_paths_and_sha256"):
        if key in receipt:
            walk(receipt[key])
    return list(dict.fromkeys(records))


# Point every inherited contract at the exact V14-selected immutable inputs.
_modules = (
    _v13,
    _v13._v12,
    _v13._v12._v11,
    _v13._v12._v11._v10,
    _v13._v12._v11._v10._v9,
    _v13._v12._v11._v10._v9._v8,
    _v13._v7,
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
_core.LEDGER_PATHS["archers-revenge"] = _REPO_ROOT / ARCHER_V7_LEDGER
_core.METHOD_PATHS["archers-revenge"] = _REPO_ROOT / ARCHER_V7_METHOD
_core.REPORT_PATHS["archers-revenge"] = _REPO_ROOT / ARCHER_V7_REPORT
_core.COLLECTOR_RECEIPTS["archers-revenge"] = _REPO_ROOT / ARCHER_V7_COMPLETE_RECEIPT
_v13._V13_PATH = _V14_PATH
_v13._V13_RECEIPT_PATH = _V14_RECEIPT_PATH
_v13._v12._V12_PATH = _V14_PATH
_v13._v12._V12_RECEIPT_PATH = _V14_RECEIPT_PATH
_v13._v12._v11._V11_PATH = _V14_PATH
_v13._v12._v11._V11_RECEIPT_PATH = _V14_RECEIPT_PATH
_v13._v12._v11._v10._V10_PATH = _V14_PATH
_v13._v12._v11._v10._V10_RECEIPT_PATH = _V14_RECEIPT_PATH
_v13._v12._v11._v10._v9._V9_PATH = _V14_PATH
_v13._v12._v11._v10._v9._V9_RECEIPT_PATH = _V14_RECEIPT_PATH
_v13._v12._v11._v10._v9._v8._V8_PATH = _V14_PATH
_v13._v12._v11._v10._v9._v8._V8_RECEIPT_PATH = _V14_RECEIPT_PATH
_v13._v7._V7_PATH = _V14_PATH
_v13._v7._V7_RECEIPT_PATH = _V14_RECEIPT_PATH
_core.V6_PATH = _V14_PATH
_core.V6_RECEIPT_PATH = _V14_RECEIPT_PATH


class BatchBFreezeContract(_v13.BatchBFreezeContract):
    """B0 exact committed V14 input, scope, predecessor, and direction contracts."""

    def test_scope_is_exact_across_every_active_artifact(self) -> None:
        """Fails when: V14 changes scope or the V7 package loses its declared revisions and predecessor ledger."""
        expected = set(_core.GAMES)
        self.assertEqual({_core.claim_id(item) for item in _archer_v7_claims()}, set(ARCHER_V7_SEMANTIC_ATOMS))
        ledger = _load_json(ARCHER_V7_LEDGER)
        self.assertEqual((ledger["game"], ledger["normalized_game_id"]), ("Archer's Revenge", "archers-revenge"))
        self.assertEqual(ledger["historical_source_revision"], ARCHER_TEXT_REVISION)
        self.assertEqual(ledger["source_baseline_revision"], SOURCE_BASELINE_REVISION)
        self.assertEqual(ledger["supersession"]["supersedes_path"], ARCHER_V6_LEDGER)
        self.assertEqual({_core.claim_id(item) for item in _archer_v7_claims()}, set(ARCHER_V7_SEMANTIC_ATOMS))
        self.assertEqual({_core.load_json(_core.DISCOVERY_PATH)["authoritative_scope"][index]["normalized_id"] for index in range(3)}, expected)
        self.assertEqual({item["normalized_id"] for item in _core.load_json(_core.BROWSER_PATH)["games"]}, expected)
        self.assertEqual({item["ownership"] for item in _core.load_json(_core.ASSET_PATH)["records"]}, expected)


class BatchBCollectorPackageContract(_v13.BatchBCollectorPackageContract):
    """B1 source truth plus exact self-contained Archer V7 rebind contracts."""

    def test_selected_packages_are_nonempty_and_counts_reconcile(self) -> None:
        """Fails when: V14 does not select exactly 144 facts and 12 separate negative fixtures."""
        counts = {
            "village-guardian": (73, 4),
            "archers-revenge": (29, 4),
            "storm-castle-tower": (42, 4),
        }
        for game, (facts, fixtures) in counts.items():
            self.assertEqual(len(_core.claims(game)), facts, game)
            self.assertEqual(len(_core.fixtures(game)), fixtures, game)
        all_ids = [_core.claim_id(item) for game in _core.GAMES for item in _core.claims(game)]
        self.assertEqual(len(all_ids), 144)
        self.assertEqual(len(all_ids), len(set(all_ids)))
        report = _load_json(ARCHER_V7_REPORT)
        self.assertEqual(report["completeness"]["factual_claims"], 29)
        self.assertEqual(report["completeness"]["negative_fixtures"], 4)

    def test_every_positive_claim_source_envelope_rederives(self) -> None:
        """Fails when: any of the 138 positive source envelopes differs from its exact Git blob and range bytes."""
        errors = [
            error
            for game in _core.GAMES
            for item in _core.claims(game)
            if item.get("relative_path")
            if (error := _core.citation_error(item, _core.claim_id(item)))
        ]
        self.assertEqual(errors, [])
        self.assertEqual(sum(bool(item.get("relative_path")) for game in _core.GAMES for item in _core.claims(game)), 138)

    def test_denominator_and_disc_001_boundaries_are_preserved(self) -> None:
        """Fails when: V7 is not self-contained, its exact V6 predecessor is unpinned, or DISC-001 enters V7 facts/fixtures."""
        ledger = _load_json(ARCHER_V7_LEDGER)
        predecessor = ledger["supersession"]["supersedes_path"]
        self.assertEqual(predecessor, ARCHER_V6_LEDGER)
        self.assertEqual(_core.file_hash(_REPO_ROOT / predecessor), ACTIVE_INPUT_HASHES[predecessor])
        self.assertEqual(len(ledger["claims"]), ledger["coverage"]["factual_claims"])
        self.assertTrue(ledger["coverage"]["atomic_records"])
        self.assertNotIn("inherited_claim_ledger", ledger)
        self.assertNotIn("DISC-001", json.dumps(ledger["claims"]))
        self.assertNotIn("DISC-001", json.dumps(ledger["negative_fixtures"]))

    def test_archer_v7_complete_rebind_selects_exact_current_output_bytes(self) -> None:
        """Fails when: the complete V7 rebind receipt or report does not bind every exact collector output and original receipt."""
        report = _load_json(ARCHER_V7_REBIND_REPORT)
        receipt = _load_json(ARCHER_V7_COMPLETE_RECEIPT)
        expected = {
            ARCHER_V7_LEDGER: ACTIVE_INPUT_HASHES[ARCHER_V7_LEDGER],
            ARCHER_V7_METHOD: ACTIVE_INPUT_HASHES[ARCHER_V7_METHOD],
            ARCHER_V7_REPORT: ACTIVE_INPUT_HASHES[ARCHER_V7_REPORT],
            ARCHER_V7_RECEIPT: ACTIVE_INPUT_HASHES[ARCHER_V7_RECEIPT],
            ARCHER_V7_REBIND_REPORT: ACTIVE_INPUT_HASHES[ARCHER_V7_REBIND_REPORT],
        }
        self.assertEqual({item["path"]: item["sha256"] for item in receipt["output_hashes"].values()}, expected)
        self.assertEqual(receipt["schema"], "apk-role-receipt.v1")
        self.assertEqual(receipt["acceptance"], "not-claimed")
        self.assertEqual(receipt["track_id"], _core.TRACK_ID)
        self.assertEqual(receipt["phase"], _core.PHASE)
        self.assertEqual(receipt["role"], "evidence-collector-archers-revenge-batch-b-v7-rebind-complete")
        self.assertEqual(receipt["role_base_sha"], "852469391234f79253b41f2b51a7768be65ba499")
        self.assertEqual(receipt["supersession"]["supersedes_receipt"], ARCHER_V7_RECEIPT)
        self.assertEqual({item["path"]: item["sha256"] for item in report["bound_outputs"].values()}, dict(list(expected.items())[:4]))
        self.assertFalse(any(receipt["revalidation"][key] for key in ("claims_changed", "claim_ledger_modified", "method_scope_changed", "report_scope_changed")))
        self.assertFalse(receipt["provider_provenance"]["available"])
        self.assertFalse(receipt["provider_provenance"]["attestation_claimed"])
        self.assertIsNone(receipt["receipt_self_hash"])

    def test_archer_v6_rebind_selects_exact_current_output_bytes(self) -> None:
        """Fails when: a legacy inherited test bypasses the selected complete Archer V7 rebind contract."""
        self.test_archer_v7_complete_rebind_selects_exact_current_output_bytes()


class BatchBMapperPackageContract(_v13.BatchBMapperPackageContract):
    """B2 exact Village V8 receipt and Archer V8 atomic-map contracts."""

    def test_mappers_bind_every_exact_active_claim_id(self) -> None:
        """Fails when: Village loses a fact or Archer V8 omits, duplicates, invents, or misbinds one V7 claim."""
        village = _load_json(MAPPER_RELATIVE["village-guardian"])
        self.assertEqual(set(_core.iter_claim_references(village)), {_core.claim_id(item) for item in _core.claims("village-guardian")})
        blueprint = _load_json(ARCHER_V8_MAP)
        report = _load_json(ARCHER_V8_MAPPER_REPORT)
        active_ids = [_core.claim_id(item) for item in _archer_v7_claims()]
        section_ids = [claim for section in blueprint["mapped_sections"] for claim in section["claim_ids"]]
        self.assertEqual(len(section_ids), 29)
        self.assertEqual(len(section_ids), len(set(section_ids)))
        self.assertEqual(set(section_ids), set(active_ids))
        self.assertEqual(blueprint["referenced_claim_ids"], active_ids)
        self.assertEqual(set(blueprint["negative_fixtures_preserved"]), {item["fixture_id"] for item in _archer_v7_fixtures()})
        self.assertEqual(blueprint["source_claim_ledger"], {"path": ARCHER_V7_LEDGER, "sha256": ACTIVE_INPUT_HASHES[ARCHER_V7_LEDGER]})
        self.assertEqual(report["source_claim_ledger"], blueprint["source_claim_ledger"])
        self.assertEqual(report["map"], {"path": ARCHER_V8_MAP, "sha256": ACTIVE_INPUT_HASHES[ARCHER_V8_MAP]})
        self.assertEqual(report["reference_accounting"]["resolved_reference_count"], 29)
        self.assertEqual(report["reference_accounting"]["unresolved_reference_count"], 0)

    def test_latest_mapper_receipts_satisfy_their_full_declared_contracts(self) -> None:
        """Fails when: Village V8 or Archer V8 receipt identity, supersession, inputs, outputs, accounting, or boundaries drift."""
        village = _load_json(VILLAGE_V8_MAPPER_RECEIPT)
        self.assertEqual(village["role"], "requirements-mapper-village-guardian-batch-b-v8")
        self.assertEqual(village["role_base_sha"], "ffeb96b4a71b1635cbd6b3cf3557984e36261557")
        self.assertEqual(village["supersession"]["supersedes_receipt"], VILLAGE_V7_MAPPER_RECEIPT)
        self.assertEqual(village["input_hashes"]["requirements_mapper_receipt_v7"], ACTIVE_INPUT_HASHES[VILLAGE_V7_MAPPER_RECEIPT])
        self.assertEqual(village["denominator_count"], 51)
        self.assertEqual(village["mapped_claim_count"], 73)
        self.assertEqual(village["findings"]["unresolved"], [])
        self.assertFalse(village["findings"]["map_facts_changed"])
        self.assertFalse(village["completion_success_claimed"])
        self.assertEqual(village["allowed_input_manifest_sha256"], "e47a9e95fec45b4f2c03834a09d9ca56f62d18e03d6f29af56b1d3642ec71717")
        self.assertEqual(village["budget_declaration_sha256"], ACTIVE_INPUT_HASHES[BUDGET_DECLARATION])
        self.assertFalse(village["provider_unavailability"]["available"])
        self.assertFalse(village["provider_unavailability"]["attestation_claimed"])
        self.assertTrue(all(village["provider_unavailability"][field] is None for field in ("prompt_sha256", "actual_context_manifest_sha256", "provider_spawn_id", "provider_session_id", "parent_ancestry_ids", "fork_turns", "raw_isolation_export_sha256", "start_event_id", "start_event_timestamp", "end_event_id", "end_event_timestamp", "final_response_sha256", "final_response_event_id", "commit_sha")))
        self.assertEqual(village["provenance_direction"]["sha256"], ACTIVE_INPUT_HASHES[str(_core.PROVENANCE_DIRECTION_PATH.relative_to(_REPO_ROOT))])
        self.assertIsNone(village["receipt_self_hash"])
        for relative, digest in _output_records(village):
            if digest is not None:
                self.assertEqual(_core.file_hash(_REPO_ROOT / relative), digest)

        archer = _load_json(ARCHER_V8_MAPPER_RECEIPT)
        self.assertEqual(archer["role"], "requirements-mapper-archers-revenge-batch-b-v8")
        self.assertEqual(archer["role_base_sha"], "852469391234f79253b41f2b51a7768be65ba499")
        self.assertEqual(archer["supersession"]["supersedes_receipt"], ARCHER_V7_MAPPER_RECEIPT)
        expected_inputs = {
            "v7_claim_ledger": ACTIVE_INPUT_HASHES[ARCHER_V7_LEDGER],
            "mapper_receipt_v7": ACTIVE_INPUT_HASHES[ARCHER_V7_MAPPER_RECEIPT],
            "collector_rebind_receipt_v8": ACTIVE_INPUT_HASHES[ARCHER_V8_PREDECESSOR_REBIND_RECEIPT],
            "collector_rebind_report_v6": ACTIVE_INPUT_HASHES[ARCHER_V6_REBIND_REPORT],
            "provenance_direction": ACTIVE_INPUT_HASHES[str(_core.PROVENANCE_DIRECTION_PATH.relative_to(_REPO_ROOT))],
        }
        self.assertEqual(archer["input_hashes"], expected_inputs)
        self.assertEqual(archer["reference_accounting"]["resolved_reference_count"], 29)
        self.assertEqual(archer["reference_accounting"]["unresolved_reference_count"], 0)
        self.assertEqual({item["path"]: item["sha256"] for item in archer["outputs"]}, {ARCHER_V8_MAP: ACTIVE_INPUT_HASHES[ARCHER_V8_MAP], ARCHER_V8_MAPPER_REPORT: ACTIVE_INPUT_HASHES[ARCHER_V8_MAPPER_REPORT]})
        self.assertEqual(archer["allowed_input_manifest"]["sha256"], "e47a9e95fec45b4f2c03834a09d9ca56f62d18e03d6f29af56b1d3642ec71717")
        self.assertEqual(archer["budget_declaration"]["sha256"], ACTIVE_INPUT_HASHES[BUDGET_DECLARATION])
        self.assertFalse(archer["provider_unavailability"]["available"])
        self.assertFalse(archer["provider_unavailability"]["attestation_claimed"])
        self.assertTrue(all(archer["provider_unavailability"][field] is None for field in ("prompt_sha256", "actual_context_manifest_sha256", "provider_spawn_id", "provider_session_id", "parent_ancestry_ids", "fork_turns", "raw_isolation_export_sha256", "start_event_id", "start_event_timestamp", "end_event_id", "end_event_timestamp", "final_response_sha256", "final_response_event_id", "commit_sha")))
        self.assertEqual(archer["browser_interactions"], 0)
        self.assertFalse(archer["completion_success_claimed"])
        self.assertFalse(archer["map_facts_changed"])
        self.assertIsNone(archer["receipt_self_hash"])


class BatchBClaimTruthContract(_v13.BatchBClaimTruthContract):
    """B3 independent all-field and all-claim source-semantic contracts."""

    def test_archer_and_storm_semantic_atoms_all_match_exact_ranges(self) -> None:
        """Fails when: any V7 Archer atom or inherited Storm atom is absent from its exact cited range."""
        self.assertEqual(set(ARCHER_V7_SEMANTIC_ATOMS), {_core.claim_id(item) for item in _archer_v7_claims()})
        defects: list[str] = []
        for record in _archer_v7_claims():
            data = _core.cited_bytes(record)
            text = data.decode("utf-8", errors="replace")
            for atom in ARCHER_V7_SEMANTIC_ATOMS[record["claim_id"]]:
                if atom == "89504e470d0a1a0a":
                    if not data.startswith(bytes.fromhex(atom)):
                        defects.append(f"{record['claim_id']}:PNG")
                elif atom not in text:
                    defects.append(f"{record['claim_id']}:{atom}")
        storm = [item for item in _core.claims("storm-castle-tower") if item.get("relative_path")]
        for record in storm:
            text = _core.cited_bytes(record).decode("utf-8", errors="replace")
            for atom in _core.EXTERNAL_SEMANTIC_ATOMS[_core.claim_id(record)]:
                if atom == "89504e470d0a1a0a":
                    if not _core.cited_bytes(record).startswith(bytes.fromhex(atom)):
                        defects.append(f"{_core.claim_id(record)}:PNG")
                elif atom not in text:
                    defects.append(f"{_core.claim_id(record)}:{atom}")
        self.assertEqual(defects, [])

    def test_every_claim_has_a_fact_interpretation_and_temporal_boundary(self) -> None:
        """Fails when: any declared V7 factual field is absent, empty, extra, inconsistent, or promotes history/baseline to current runtime."""
        super().test_every_claim_has_a_fact_interpretation_and_temporal_boundary()
        ledger = _load_json(ARCHER_V7_LEDGER)
        required = ledger["claim_contract"]["required_fields"]
        self.assertEqual(len(required), 20)
        for record in _archer_v7_claims():
            self.assertEqual(set(record), set(required), record["claim_id"])
            self.assertTrue(all(record[field] not in (None, "", []) for field in required), record["claim_id"])
            self.assertEqual(record["game"], "Archer's Revenge")
            self.assertEqual(record["collector_id"], ledger["collector_id"])
            self.assertEqual(record["conflict_state"], "usage-unknown" if record["category"] == "asset" else "none")
            self.assertIn(record["temporal_disposition"], {"historical", "baseline-only"})
            self.assertNotIn("current runtime", record["exact_source_fact"].lower())
        self.assertTrue(ledger["coverage"]["all_required_fields_present"])
        self.assertTrue(ledger["coverage"]["atomic_records"])
        self.assertEqual(ledger["coverage"]["current_runtime_claims"], 0)

    def test_every_test_has_an_explicit_fails_when_contract(self) -> None:
        """Fails when: any V14 truth test lacks an auditable `Fails when:` condition."""
        missing: list[str] = []
        module = __import__(__name__)
        for _, cls in inspect.getmembers(module, inspect.isclass):
            if cls.__module__ != __name__ or not cls.__name__.startswith("BatchB"):
                continue
            for name, method in inspect.getmembers(cls, inspect.isfunction):
                if name.startswith("test_") and "Fails when:" not in (inspect.getdoc(method) or ""):
                    missing.append(f"{cls.__name__}.{name}")
        self.assertEqual(missing, [])


class BatchBNegativeFixtureContract(_v13.BatchBNegativeFixtureContract):
    """B3 self-contained fixture-refutation contracts with all runtime inputs pinned."""

    def test_all_twelve_fixtures_are_unique_rejected_and_excluded(self) -> None:
        """Fails when: the exact 12 active fixtures collide, count as facts, or have a non-reject disposition."""
        factual = {_core.claim_id(item) for game in _core.GAMES for item in _core.claims(game)}
        fixtures = [item for game in _core.GAMES for item in _core.fixtures(game)]
        fixture_ids = [item["fixture_id"] for item in fixtures]
        self.assertEqual(len(fixture_ids), 12)
        self.assertEqual(len(fixture_ids), len(set(fixture_ids)))
        self.assertFalse(factual & set(fixture_ids))
        for fixture in fixtures:
            self.assertIn(str(fixture.get("expected_disposition", "")).upper(), {"FAIL", "REJECT"})
            self.assertFalse(fixture.get("counts_as_claim", fixture.get("counts_as_factual_claim", False)))

    def test_archer_fixture_refutations_rederive_from_source_boundaries(self) -> None:
        """Fails when: V7 fixtures require an unpinned predecessor fact or promote history, binary lines, completion, or a tree to fact."""
        records = {item["fixture_id"]: item for item in _archer_v7_fixtures()}
        active_ids = {_core.claim_id(item) for item in _archer_v7_claims()}
        self.assertIn("Historical source facts", records["AR-B2-V7-FIX-001"]["reason"])
        self.assertIn("whole-file or byte envelopes", records["AR-B2-V7-FIX-002"]["reason"])
        self.assertIn("request construction only", records["AR-B2-V7-FIX-003"]["reason"])
        self.assertIn("Git tree is not a file/blob envelope", records["AR-B2-V7-FIX-004"]["reason"])
        for fixture in records.values():
            references = fixture.get("source_checked_claim_ids", [fixture.get("source_checked_claim_id")])
            self.assertTrue(all(reference in active_ids for reference in references if reference), fixture["fixture_id"])


class BatchBReceiptContract(_v13.BatchBReceiptContract):
    """Exact local receipt, complete rebind, supersession, and disclosure contracts."""

    def test_pinned_existing_receipt_bytes_are_not_mutated(self) -> None:
        """Fails when: any selected predecessor or active role receipt differs from its exact V14 digest."""
        defects = [name for name, digest in PINNED_RECEIPT_HASHES.items() if _core.file_hash(_RECEIPTS_DIR / name) != digest]
        self.assertEqual(defects, [])

    def test_receipt_output_hashes_bind_current_exact_bytes(self) -> None:
        """Fails when: a latest V7/V8 receipt's declared non-self output differs from current exact bytes."""
        latest = (VILLAGE_V8_MAPPER_RECEIPT, ARCHER_V7_COMPLETE_RECEIPT, ARCHER_V8_MAPPER_RECEIPT)
        defects: list[str] = []
        for relative in latest:
            for output, digest in _output_records(_load_json(relative)):
                if output == relative and digest is None:
                    continue
                if not isinstance(digest, str) or not _core.HEX64.fullmatch(digest):
                    defects.append(f"{relative}:{output}:bad-hash")
                elif not (_REPO_ROOT / output).is_file() or _core.file_hash(_REPO_ROOT / output) != digest:
                    defects.append(f"{relative}:{output}:byte-mismatch")
        self.assertEqual(defects, [])

    def test_v6_receipt_binds_exact_test_bytes_and_role_base(self) -> None:
        """Fails when: the V14 receipt selects another role, base, input set, or truth-test bytes."""
        receipt = _core.load_json(_V14_RECEIPT_PATH)
        self.assertEqual(receipt.get("role"), "truth-test-author-batch-b-v14")
        self.assertEqual(receipt.get("role_base_sha"), ROLE_BASE_SHA)
        self.assertEqual(receipt.get("input_hashes"), ACTIVE_INPUT_HASHES)
        binding = next((item for item in _output_records(receipt) if item[0] == str(_V14_PATH.relative_to(_REPO_ROOT))), None)
        self.assertIsNotNone(binding)
        self.assertEqual(binding[1], _core.file_hash(_V14_PATH))

    def test_unavailable_provider_fields_do_not_automatically_fail_local_receipts(self) -> None:
        """Fails when: an active receipt loses local identity or fabricates unavailable provider provenance."""
        for name in ACTIVE_RECEIPTS:
            receipt = _core.load_json(_RECEIPTS_DIR / name)
            self.assertEqual(receipt.get("track_id"), _core.TRACK_ID, name)
            self.assertEqual(receipt.get("phase"), _core.PHASE, name)
            if name == Path(ARCHER_V7_COMPLETE_RECEIPT).name:
                self.assertEqual(receipt["role_identity"], "T4 Archer's Revenge collector V7 rebind only")
                self.assertEqual(receipt["role_base_sha"], "852469391234f79253b41f2b51a7768be65ba499")
                self.assertEqual(_core.git_show(ROLE_BASE_SHA, str((_RECEIPTS_DIR / name).relative_to(_REPO_ROOT))), (_RECEIPTS_DIR / name).read_bytes())
                continue
            self.assertEqual(receipt.get("phase_base_sha"), PHASE_BASE_SHA, name)
            serialized = json.dumps(receipt).lower()
            if "provider" in serialized:
                self.assertTrue("unavailable" in serialized or "not exposed" in serialized, name)

    def test_latest_artifacts_bind_the_correct_owner_provenance_direction(self) -> None:
        """Fails when: either latest mapper claims provider authority, browser proof, map fact changes, or completion success."""
        for relative in (VILLAGE_V8_MAPPER_RECEIPT, ARCHER_V8_MAPPER_RECEIPT):
            receipt = _load_json(relative)
            self.assertEqual(receipt["provenance_direction"]["decision"], "LOCAL_VERIFIABLE_RECEIPTS_ACCEPTED_WITH_DISCLOSURE")
            provider = receipt.get("provider_unavailability", receipt.get("provider_provenance", {}))
            self.assertFalse(provider.get("available", False))
            self.assertFalse(provider.get("attestation_claimed", False))
            self.assertFalse(receipt["completion_success_claimed"])
        self.assertFalse(_load_json(ARCHER_V8_MAPPER_RECEIPT)["map_facts_changed"])


class BatchBBrowserContract(_v13.BatchBBrowserContract):
    """B4 exact WebBridge evidence and bounded-browser contracts."""


class BatchBAssetContract(_v13.BatchBAssetContract):
    """B4 exact asset-V2 denominator, source, and live-limit contracts."""


class BatchBCompletionContract(_v13.BatchBCompletionContract):
    """The disclosure-only owner disposition for the observed completion defect."""


class BatchBIndependentReviewContract(_v13.BatchBIndependentReviewContract):
    """B5 latest prior-review selection plus fail-closed fresh-review contracts."""

    def test_review_v4_binds_every_exact_active_additive_input(self) -> None:
        """Fails when: no fresh review binds every V14 input and both exact V14 outputs."""
        inputs = _core.load_json(_core.REVIEW_RECEIPT_PATH).get("input_hashes", {})
        required = {
            relative: digest
            for relative, digest in ACTIVE_INPUT_HASHES.items()
            if relative not in {_v13.REVIEW_V6, _v13.REVIEW_RECEIPT_V6}
        }
        required[str(_V14_PATH.relative_to(_REPO_ROOT))] = _core.file_hash(_V14_PATH)
        required[str(_V14_RECEIPT_PATH.relative_to(_REPO_ROOT))] = _core.file_hash(_V14_RECEIPT_PATH)
        defects = [relative for relative, digest in required.items() if inputs.get(relative) != digest]
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B5_FRESH_REVIEW_V14]: " + ", ".join(defects))


class BatchBAcceptanceContract(_v13.BatchBAcceptanceContract):
    """B5 candidate, approval, and accepted-manifest existence gates."""


if __name__ == "__main__":
    _core.unittest.main()
