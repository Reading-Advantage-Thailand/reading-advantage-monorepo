"""Batch B v7 truth contracts for the exact latest remediation artifacts.

V7 selects both V3 collector packages, both V3 mapper packages, the Archer
receipt rebind, asset audit V2, both owner directions, browser V3, and review
V4.  It reuses V6's source-envelope, semantic, fixture, asset, browser-limit,
completion, review, and lifecycle contracts without changing V6.
"""

from __future__ import annotations

import importlib.util
import inspect
from pathlib import Path
from typing import Any


_V7_PATH = Path(__file__).resolve()
_TRACK_DIR = _V7_PATH.parent
_REPO_ROOT = _V7_PATH.parents[3]
_RECEIPTS_DIR = _TRACK_DIR / "role-receipts"
_V6_PATH = _TRACK_DIR / "batch-b-truth-tests-v6.py"
_V7_RECEIPT_PATH = _RECEIPTS_DIR / "truth-test-author-batch-b-v7.json"

_spec = importlib.util.spec_from_file_location("batch_b_truth_v6_for_v7", _V6_PATH)
if _spec is None or _spec.loader is None:
    raise RuntimeError(f"Unable to load V6 truth contracts from {_V6_PATH}")
_v6 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_v6)

PHASE_BASE_SHA = "ff01cee9cc973dee89fdc0ba22102dcea0c50542"
ROLE_BASE_SHA = "a59fef7942b73aee028d7c35f5ece83687c78246"
GLOBAL_DIRECTION = "measure/product-owner-apk-provenance-direction-20260721.json"
WEBBRIDGE_DIRECTION = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/"
    "product-owner-direction-batch-b-webbridge.json"
)

LEDGER_RELATIVE = {
    "village-guardian": "measure/tracks/apk_corpus_audit_action_defense_20260712/village-guardian-claim-ledger-batch-b-v3.json",
    "archers-revenge": "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-claim-ledger-batch-b-v3.json",
    "storm-castle-tower": "measure/tracks/apk_corpus_audit_action_defense_20260712/storm-castle-tower-claim-ledger-batch-b.json",
}
METHOD_RELATIVE = {
    "village-guardian": "measure/tracks/apk_corpus_audit_action_defense_20260712/village-guardian-evidence-method-batch-b-v3.md",
    "archers-revenge": "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-evidence-method-batch-b-v3.md",
    "storm-castle-tower": "measure/tracks/apk_corpus_audit_action_defense_20260712/storm-castle-tower-evidence-method-batch-b.md",
}
REPORT_RELATIVE = {
    "village-guardian": "measure/tracks/apk_corpus_audit_action_defense_20260712/village-guardian-evidence-final-report-batch-b-v3.json",
    "archers-revenge": "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-evidence-final-report-batch-b-v3.json",
    "storm-castle-tower": "measure/tracks/apk_corpus_audit_action_defense_20260712/storm-castle-tower-evidence-final-report-batch-b.json",
}
MAPPER_RELATIVE = {
    "village-guardian": "measure/tracks/apk_corpus_audit_action_defense_20260712/village-guardian-blueprint-batch-b-v3.json",
    "archers-revenge": "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-blueprint-batch-b-v3.json",
    "storm-castle-tower": "measure/tracks/apk_corpus_audit_action_defense_20260712/storm-castle-tower-blueprint-batch-b.json",
}
MAPPER_REPORT_RELATIVE = {
    "village-guardian": "measure/tracks/apk_corpus_audit_action_defense_20260712/village-guardian-mapper-final-report-batch-b-v3.json",
    "archers-revenge": "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-mapper-final-report-batch-b-v3.json",
    "storm-castle-tower": "measure/tracks/apk_corpus_audit_action_defense_20260712/storm-castle-tower-mapper-final-report-batch-b.json",
}

ACTIVE_INPUT_HASHES = {
    "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-truth-tests-v6.py": "675809c8cc8835b7b659c10dd5288c10d631a768137bbe1485cfcda36d08cae2",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/truth-test-author-batch-b-v6.json": "d451641b4a52dea583347ca529e14a59f08aad29e87f97b36fa0b629b70d3c1c",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-discovery-audit-v2.json": "f0f27734d22b8ec376bbf8b1fe96574a75f2c293766bee2440c0484164dd1daa",
    LEDGER_RELATIVE["village-guardian"]: "3be82cd7a9ddb144ae82ae220c36b439c6d14bbd58e1c988c897af6156b20484",
    METHOD_RELATIVE["village-guardian"]: "95c342a84cce0e6a6651e34cad11804ca8b930e2b9d1d533f3d464417d13200e",
    REPORT_RELATIVE["village-guardian"]: "b6847970ab60374635b3925d82e9e1c8ac8a06761e8715decd6734f5018b372f",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-village-guardian-batch-b-v3.json": "057961346dbdae04ce78c3587c13a33a2c87c258be2317b9fcd3963e58aca9b2",
    MAPPER_RELATIVE["village-guardian"]: "6a0e021d1b2ac2ddf33cd115f701993c9f110acc957964117137621ca99762e0",
    MAPPER_REPORT_RELATIVE["village-guardian"]: "c9f834691d5f9bc48369e81d57b4b1cb94d2c129857a20d70dd989c49a54292f",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-village-guardian-batch-b-v3.json": "d42eefe675b4dd37544a678aace8da44b5f7ce1a3873a5bca359adc30059977c",
    LEDGER_RELATIVE["archers-revenge"]: "c2d6bf62d628fc441c476fb2839e2b41e7f0f8564020580e3d700b0c167fa9d1",
    METHOD_RELATIVE["archers-revenge"]: "e16c6e8700d8f0a2999fba25d273d38f4d44c4e798c383751b6fb84a4a962c19",
    REPORT_RELATIVE["archers-revenge"]: "c21897fb4c7d80fbb3141d8c37a87a31e9ac4881e1ef7bb021ebdd273dd2555c",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-archers-revenge-batch-b-v3.json": "a8c90ca272af47353730cce23ce8a9193bb4a462073cb2a5dd67017ab9c98b2c",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-archers-revenge-batch-b-v3-rebind.json": "c0b6276d19dde7cd60b855cfd60708783a367e77bc10a54dfe08bce11c325ab6",
    MAPPER_RELATIVE["archers-revenge"]: "7f6112d47ef4bbdd58cd93941bbcf935952e12880ae48f54097281cf94de3624",
    MAPPER_REPORT_RELATIVE["archers-revenge"]: "594f3d368195cc4930eb2662f12b7729ccc83a40ea6bc5622f71c682db5c450e",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-archers-revenge-batch-b-v3.json": "7b1c678e7d52ca47a56b6fabfcb7ee27ebc2ddcd97f7589824f92b83725de403",
    LEDGER_RELATIVE["storm-castle-tower"]: "9f9337ec9b86161337553a8b8ab92e57cc954d2a0deb42018dad0ed99394e9d9",
    METHOD_RELATIVE["storm-castle-tower"]: "618f067ab845d365f98d0eb6416f56af8f75d00e1576389780d70324d617c8b9",
    REPORT_RELATIVE["storm-castle-tower"]: "034579508f1f57cf46c3e8456524f8ce376fdbfd1a047a3a49bde4e0d877aaa1",
    MAPPER_RELATIVE["storm-castle-tower"]: "135fa6e4396cd6d9466b06c3cdad48a69cb1f7238dc4bacfb1ff2ca271c0c0d8",
    MAPPER_REPORT_RELATIVE["storm-castle-tower"]: "d4739be9956e377eb103d2d9c623870c5a6a6a2dd470d95a48c7e34edcd6650e",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-asset-audit-v2.json": "c66b096726e441e6aab0c7a3ffd2cda81413befb00e1c8586cbe911a31329ebd",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/asset-auditor-batch-b-v2.json": "a9958731fe8f2133348625438ac3d3e60090ca81c9f966dfad13884b6e0e6eda",
    GLOBAL_DIRECTION: "4d1ec24e900665577a413b4c5555d4d53ae1be222d8029cf391d1b55ff7da9ac",
    WEBBRIDGE_DIRECTION: "7dde397fdb1ceeac3e490d07791e90f69dd630b962d6b799da8426d4e9234498",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-browser-audit-v3.json": "521e08b7a1ef9309cdf31277d0f07b99700bb7721d97ee3e371321e70cd1e4ca",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/browser-auditor-batch-b-v3.json": "3209377fb793faf304aeaf5c575777ca0f524f0334e9dfc384357a3d9b1adfa8",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-adversarial-review-v4.json": "1ac23f3f7050c8b47d31770a7c943ecfa41b7942f3c0004e31fd6da9d058726d",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/adversarial-reviewer-batch-b-v4.json": "2503d31d30efee37a9a2b7ffe9f54cf42acdcbf4a6a700b5414671f7048e2915",
}

PINNED_RECEIPT_HASHES = {
    "discovery-auditor-batch-b-v2.json": "c6c94ea45b4564a5a4cbf17451d0069f3a67e27b63b0af20bbb2bb61df613dfb",
    "evidence-collector-village-guardian-batch-b-v3.json": "057961346dbdae04ce78c3587c13a33a2c87c258be2317b9fcd3963e58aca9b2",
    "evidence-collector-archers-revenge-batch-b-v3.json": "a8c90ca272af47353730cce23ce8a9193bb4a462073cb2a5dd67017ab9c98b2c",
    "evidence-collector-archers-revenge-batch-b-v3-rebind.json": "c0b6276d19dde7cd60b855cfd60708783a367e77bc10a54dfe08bce11c325ab6",
    "evidence-collector-storm-castle-tower-batch-b.json": "1efd07acda32536ddc19d3472e3f9f010f10649f81aa4dcd173479af636d54d8",
    "requirements-mapper-village-guardian-batch-b-v3.json": "d42eefe675b4dd37544a678aace8da44b5f7ce1a3873a5bca359adc30059977c",
    "requirements-mapper-archers-revenge-batch-b-v3.json": "7b1c678e7d52ca47a56b6fabfcb7ee27ebc2ddcd97f7589824f92b83725de403",
    "requirements-mapper-storm-castle-tower-batch-b.json": "f24bf7f2b7854580b4f4003a464c274fabb0fe563fdf817a6bc30f7d21ddfdab",
    "browser-auditor-batch-b-v3.json": "3209377fb793faf304aeaf5c575777ca0f524f0334e9dfc384357a3d9b1adfa8",
    "asset-auditor-batch-b-v2.json": "a9958731fe8f2133348625438ac3d3e60090ca81c9f966dfad13884b6e0e6eda",
    "adversarial-reviewer-batch-b-v4.json": "2503d31d30efee37a9a2b7ffe9f54cf42acdcbf4a6a700b5414671f7048e2915",
}
ACTIVE_RECEIPTS = (
    "discovery-auditor-batch-b-v2.json",
    "evidence-collector-village-guardian-batch-b-v3.json",
    "evidence-collector-archers-revenge-batch-b-v3-rebind.json",
    "evidence-collector-storm-castle-tower-batch-b.json",
    "requirements-mapper-village-guardian-batch-b-v3.json",
    "requirements-mapper-archers-revenge-batch-b-v3.json",
    "requirements-mapper-storm-castle-tower-batch-b.json",
    "browser-auditor-batch-b-v3.json",
    "asset-auditor-batch-b-v2.json",
    "adversarial-reviewer-batch-b-v4.json",
    "truth-test-author-batch-b-v7.json",
)

# Point the inherited V6 contracts at the exact V7-selected artifacts.
_v6.ROLE_BASE_SHA = ROLE_BASE_SHA
_v6.LEDGER_PATHS = {game: _REPO_ROOT / relative for game, relative in LEDGER_RELATIVE.items()}
_v6.METHOD_PATHS = {game: _REPO_ROOT / relative for game, relative in METHOD_RELATIVE.items()}
_v6.REPORT_PATHS = {game: _REPO_ROOT / relative for game, relative in REPORT_RELATIVE.items()}
_v6.COLLECTOR_RECEIPTS["village-guardian"] = _RECEIPTS_DIR / "evidence-collector-village-guardian-batch-b-v3.json"
_v6.COLLECTOR_RECEIPTS["archers-revenge"] = _RECEIPTS_DIR / "evidence-collector-archers-revenge-batch-b-v3-rebind.json"
_v6.ACTIVE_INPUT_HASHES = ACTIVE_INPUT_HASHES
_v6.PINNED_RECEIPT_HASHES = PINNED_RECEIPT_HASHES
_v6.ACTIVE_RECEIPTS = ACTIVE_RECEIPTS
_v6.V6_PATH = _V7_PATH
_v6.V6_RECEIPT_PATH = _V7_RECEIPT_PATH


def _load_json(relative: str) -> dict[str, Any]:
    """Loads one repository-relative JSON object.

    @param relative Repository-relative artifact path.
    @returns The parsed JSON object.
    """
    return _v6.load_json(_REPO_ROOT / relative)


class BatchBFreezeContract(_v6.BatchBFreezeContract):
    """B0 exact latest-input, scope, predecessor, and direction contracts."""

    def test_v6_selects_exact_additive_inputs(self) -> None:
        """Fails when: V7 omits, substitutes, mutates, or uses uncommitted latest role-base inputs."""
        defects: list[str] = []
        for relative, digest in ACTIVE_INPUT_HASHES.items():
            path = _REPO_ROOT / relative
            if not path.is_file() or _v6.file_hash(path) != digest:
                defects.append(f"{relative}:working-tree-hash")
            elif _v6.git_show(ROLE_BASE_SHA, relative) != path.read_bytes():
                defects.append(f"{relative}:role-base-binding")
        self.assertEqual(defects, [], f"active input drift: {defects}")
        self.assertEqual(_v6.load_json(_V7_RECEIPT_PATH).get("input_hashes"), ACTIVE_INPUT_HASHES)


class BatchBCollectorPackageContract(_v6.BatchBCollectorPackageContract):
    """B1 latest selected-package structure, counts, envelopes, and coverage."""


class BatchBMapperPackageContract(_v6.BatchBMapperPackageContract):
    """B2 exact latest mapper-reference and collector-binding contracts."""

    def test_mappers_bind_every_exact_active_claim_id(self) -> None:
        """Fails when: a selected mapper omits IDs, cites fixtures/foreign IDs, or binds a superseded collector package."""
        defects: list[str] = []
        for game in _v6.GAMES:
            blueprint = _load_json(MAPPER_RELATIVE[game])
            report = _load_json(MAPPER_REPORT_RELATIVE[game])
            references = set(_v6.iter_claim_references(blueprint))
            active = {_v6.claim_id(item) for item in _v6.claims(game)}
            if references != active:
                defects.append(f"{game}:missing={len(active - references)},stale={len(references - active)}")
            if game == "village-guardian":
                bindings = blueprint.get("source_output_bindings", {})
                if bindings.get("claim_ledger_path") != LEDGER_RELATIVE[game]:
                    defects.append(f"{game}:ledger-path")
                if bindings.get("claim_ledger_sha256") != _v6.file_hash(_v6.LEDGER_PATHS[game]):
                    defects.append(f"{game}:ledger-hash")
            elif game == "archers-revenge":
                if blueprint.get("source_claim_ledger") != Path(LEDGER_RELATIVE[game]).name:
                    defects.append(f"{game}:ledger-path")
                if report.get("collector_id") != "evidence-collector-archers-revenge-batch-b-v3":
                    defects.append(f"{game}:collector-id")
                bindings = report.get("input_bindings", {})
                if bindings.get("ledger") != Path(LEDGER_RELATIVE[game]).name:
                    defects.append(f"{game}:report-ledger-path")
                if bindings.get("ledger_sha256") != _v6.file_hash(_v6.LEDGER_PATHS[game]):
                    defects.append(f"{game}:report-ledger-hash")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B2_STALE_MAPPER_BINDING]: " + ", ".join(defects))


class BatchBClaimTruthContract(_v6.BatchBClaimTruthContract):
    """B3 independent all-claim source-semantic contracts."""

    def test_every_test_has_an_explicit_fails_when_contract(self) -> None:
        """Fails when: any V7 truth test lacks an auditable `Fails when:` condition."""
        missing: list[str] = []
        module = __import__(__name__)
        for _, cls in inspect.getmembers(module, inspect.isclass):
            if cls.__module__ != __name__ or not cls.__name__.startswith("BatchB"):
                continue
            for name, method in inspect.getmembers(cls, inspect.isfunction):
                if name.startswith("test_") and "Fails when:" not in (inspect.getdoc(method) or ""):
                    missing.append(f"{cls.__name__}.{name}")
        self.assertEqual(missing, [])


class BatchBNegativeFixtureContract(_v6.BatchBNegativeFixtureContract):
    """B3 all-fixture envelope and independent-refutation contracts."""


class BatchBReceiptContract(_v6.BatchBReceiptContract):
    """Exact local receipt, rebind, and owner-provenance contracts."""

    def test_v6_receipt_binds_exact_test_bytes_and_role_base(self) -> None:
        """Fails when: the V7 receipt selects another role/base/test or lacks the owner-required committed binding."""
        receipt = _v6.load_json(_V7_RECEIPT_PATH)
        self.assertEqual(receipt.get("role"), "truth-test-author-batch-b-v7")
        self.assertEqual(receipt.get("role_base_sha"), ROLE_BASE_SHA)
        binding = next(
            (item for item in _v6.output_bindings(receipt) if item[0] == str(_V7_PATH.relative_to(_REPO_ROOT))),
            None,
        )
        self.assertIsNotNone(binding)
        self.assertEqual(binding[1], _v6.file_hash(_V7_PATH))
        self.assertEqual(
            _v6.git_show(ROLE_BASE_SHA, str(_V7_PATH.relative_to(_REPO_ROOT))),
            _V7_PATH.read_bytes(),
            "EXPECTED_STAGE_RED[UNCOMMITTED_V7]: owner direction requires committed Git binding",
        )

    def test_latest_artifacts_bind_the_correct_owner_provenance_direction(self) -> None:
        """Fails when: a latest collector/mapper artifact mislabels WebBridge direction as the global local-provenance authority."""
        expected = "LOCAL_VERIFIABLE_RECEIPTS_ACCEPTED_WITH_DISCLOSURE"
        direction = _load_json(GLOBAL_DIRECTION)
        self.assertEqual(direction.get("decision"), expected)
        defects: list[str] = []
        selected = [
            LEDGER_RELATIVE["village-guardian"],
            REPORT_RELATIVE["village-guardian"],
            "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-village-guardian-batch-b-v3.json",
            LEDGER_RELATIVE["archers-revenge"],
            REPORT_RELATIVE["archers-revenge"],
            "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-archers-revenge-batch-b-v3-rebind.json",
            MAPPER_REPORT_RELATIVE["village-guardian"],
            "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-village-guardian-batch-b-v3.json",
            "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-archers-revenge-batch-b-v3.json",
        ]
        for relative in selected:
            document = _load_json(relative)
            binding = document.get("provenance_direction")
            if not isinstance(binding, dict):
                binding = document.get("provenance")
            if not isinstance(binding, dict):
                binding = document.get("v3_input_bindings", {}).get("provenance_direction", {})
            if binding.get("path", binding.get("direction_path")) != GLOBAL_DIRECTION:
                defects.append(f"{relative}:path")
            if binding.get("decision", expected) != expected:
                defects.append(f"{relative}:decision")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[OWNER_PROVENANCE_BINDING]: " + ", ".join(defects))


class BatchBBrowserContract(_v6.BatchBBrowserContract):
    """B4 exact WebBridge evidence and browser-limit contracts."""


class BatchBAssetContract(_v6.BatchBAssetContract):
    """B4 exact asset-V2 denominator, source, and live-limit contracts."""


class BatchBCompletionContract(_v6.BatchBCompletionContract):
    """The non-waived Village completion API success contract."""


class BatchBIndependentReviewContract(_v6.BatchBIndependentReviewContract):
    """B5 exact review-V4 selection, freshness, sampling, and blocker contracts."""

    def test_review_v4_binds_every_exact_active_additive_input(self) -> None:
        """Fails when: review V4 predates any selected V3 collector/mapper, rebind, asset-V2, direction, or V7 byte."""
        inputs = _v6.load_json(_v6.REVIEW_RECEIPT_PATH).get("input_hashes", {})
        required = {
            relative: digest
            for relative, digest in ACTIVE_INPUT_HASHES.items()
            if relative not in {
                str(_v6.REVIEW_PATH.relative_to(_REPO_ROOT)),
                str(_v6.REVIEW_RECEIPT_PATH.relative_to(_REPO_ROOT)),
            }
        }
        required[str(_V7_PATH.relative_to(_REPO_ROOT))] = _v6.file_hash(_V7_PATH)
        defects = [relative for relative, digest in required.items() if inputs.get(relative) != digest]
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B5_STALE_REVIEW_V7]: " + ", ".join(defects))


class BatchBAcceptanceContract(_v6.BatchBAcceptanceContract):
    """B5 candidate, approval, and accepted-manifest existence gates."""


if __name__ == "__main__":
    _v6.unittest.main()
