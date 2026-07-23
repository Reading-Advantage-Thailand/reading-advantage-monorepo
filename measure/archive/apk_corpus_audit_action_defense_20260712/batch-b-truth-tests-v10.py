"""Batch B V10 truth contracts for denominator and mapper remediation.

V10 retains V9's source, semantic, fixture, asset, bounded-browser, completion,
review, and lifecycle contracts. It additionally selects the committed Village
V4 and Archer V5 denominator reconciliations and mapper reports, independently
compares their exact records with the accepted T2 denominator artifacts, and
rebinds the additive collector and mapper receipts. Fresh review and lifecycle
remain fail-closed.
"""

from __future__ import annotations

import importlib.util
import inspect
import json
from pathlib import Path
from typing import Any


_V10_PATH = Path(__file__).resolve()
_TRACK_DIR = _V10_PATH.parent
_REPO_ROOT = _V10_PATH.parents[3]
_RECEIPTS_DIR = _TRACK_DIR / "role-receipts"
_V9_PATH = _TRACK_DIR / "batch-b-truth-tests-v9.py"
_V10_RECEIPT_PATH = _RECEIPTS_DIR / "truth-test-author-batch-b-v10.json"

_spec = importlib.util.spec_from_file_location("batch_b_truth_v9_for_v10", _V9_PATH)
if _spec is None or _spec.loader is None:
    raise RuntimeError(f"Unable to load V9 truth contracts from {_V9_PATH}")
_v9 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_v9)
_core = _v9._core

PHASE_BASE_SHA = "ff01cee9cc973dee89fdc0ba22102dcea0c50542"
ROLE_BASE_SHA = "2736d1de2f675155a70bdda706349310f4e3f322"
ARTIFACT_ROLE_BASE_SHA = "134a94bc451f84e2a75ef18a8cbbe7382bd3395c"
GLOBAL_DIRECTION = "measure/product-owner-apk-provenance-direction-20260721.json"
DENOMINATOR_ROOT = "measure/archive/apk_source_denominator_inventory_20260712"
IDENTITY_DENOMINATOR = f"{DENOMINATOR_ROOT}/game-identity-ledger.json"
SOURCE_DENOMINATOR = f"{DENOMINATOR_ROOT}/source-denominator.json"
HISTORY_DENOMINATOR = f"{DENOMINATOR_ROOT}/historical-source-denominator.json"
SCENE_DENOMINATOR = f"{DENOMINATOR_ROOT}/scene-state-denominator.json"
ASSET_DENOMINATOR = f"{DENOMINATOR_ROOT}/asset-file-denominator.json"

DENOMINATOR_RELATIVE = {
    "village-guardian": (
        "measure/tracks/apk_corpus_audit_action_defense_20260712/"
        "village-guardian-denominator-reconciliation-batch-b-v4.json"
    ),
    "archers-revenge": (
        "measure/tracks/apk_corpus_audit_action_defense_20260712/"
        "archers-revenge-denominator-reconciliation-batch-b-v5.json"
    ),
}
MAPPER_RELATIVE = dict(_v9._v8.MAPPER_RELATIVE)
MAPPER_REPORT_RELATIVE = dict(_v9._v8.MAPPER_REPORT_RELATIVE)
MAPPER_REPORT_RELATIVE.update(
    {
        "village-guardian": (
            "measure/tracks/apk_corpus_audit_action_defense_20260712/"
            "village-guardian-mapper-final-report-batch-b-v4.json"
        ),
        "archers-revenge": (
            "measure/tracks/apk_corpus_audit_action_defense_20260712/"
            "archers-revenge-mapper-final-report-batch-b-v5.json"
        ),
    }
)
ADDITIVE_RECEIPTS = {
    "evidence-collector-village-guardian-batch-b-v4.json": "a986b37348b353e57d269595c7480ad8127d81c74852c8fcbeeb42d8570e8cf5",
    "evidence-collector-archers-revenge-batch-b-v5.json": "9b1f77f4a74f97a9dd7db9f90a5366951e80666aa193afe5a485f3f11998d1f6",
    "requirements-mapper-village-guardian-batch-b-v4.json": "bf67f87a990722426f7bec1291b1c0d1864f0b17ecce5d42321b01b051db425f",
    "requirements-mapper-archers-revenge-batch-b-v5.json": "8a0e6664cfbdbc009f098e949577b8e1495828d02f3ea9b6ee7a6dbf8ab3bdc0",
}
REVIEW_V5 = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/"
    "batch-b-adversarial-review-v5.json"
)
REVIEW_RECEIPT_V5 = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/"
    "adversarial-reviewer-batch-b-v5.json"
)

ACTIVE_INPUT_HASHES = dict(_v9.ACTIVE_INPUT_HASHES)
ACTIVE_INPUT_HASHES.update(
    {
        "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-truth-tests-v9.py": "666f23143e326643d71cc960a0545cde8e18b04a0b150f1a804460261eefdc7b",
        "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/truth-test-author-batch-b-v9.json": "91ada5e2ecbec4431a01b4478037748360a5b36c3c6630cc6090b3a86ca4bcd3",
        DENOMINATOR_RELATIVE["village-guardian"]: "118f3c37cb66e8a66494efea37a60caf26b240621f280c0cf6db9766278a5134",
        DENOMINATOR_RELATIVE["archers-revenge"]: "e2f87d77071668cfb94e7a322e8f367b1eaa3d08e9e83118acb3c89067fe7d9f",
        MAPPER_REPORT_RELATIVE["village-guardian"]: "e03613d0da0d921bce332cfa93806be26b386295372a00473f8c22f0b12b6e19",
        MAPPER_REPORT_RELATIVE["archers-revenge"]: "eb1ad21db4f9c36f8c43c2fab0651a6e746fa664e70b80ba18195410ad50bba0",
        "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-village-guardian-batch-b-v4.json": ADDITIVE_RECEIPTS["evidence-collector-village-guardian-batch-b-v4.json"],
        "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-archers-revenge-batch-b-v5.json": ADDITIVE_RECEIPTS["evidence-collector-archers-revenge-batch-b-v5.json"],
        "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-village-guardian-batch-b-v4.json": ADDITIVE_RECEIPTS["requirements-mapper-village-guardian-batch-b-v4.json"],
        "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-archers-revenge-batch-b-v5.json": ADDITIVE_RECEIPTS["requirements-mapper-archers-revenge-batch-b-v5.json"],
        REVIEW_V5: "9229e56a80af34aed41386379458c17fb7b0863f782ce7c2c8188944a9345fef",
        REVIEW_RECEIPT_V5: "38924ccbea70ecb4d89c8b99969890116d86e7914e0e44c4b7e8cdf932b0fbad",
    }
)

PINNED_RECEIPT_HASHES = dict(_v9.PINNED_RECEIPT_HASHES)
PINNED_RECEIPT_HASHES.pop("adversarial-reviewer-batch-b-v4.json")
PINNED_RECEIPT_HASHES.update(ADDITIVE_RECEIPTS)
PINNED_RECEIPT_HASHES.update(
    {
        "adversarial-reviewer-batch-b-v5.json": "38924ccbea70ecb4d89c8b99969890116d86e7914e0e44c4b7e8cdf932b0fbad",
        "truth-test-author-batch-b-v9.json": "91ada5e2ecbec4431a01b4478037748360a5b36c3c6630cc6090b3a86ca4bcd3",
    }
)
ACTIVE_RECEIPTS = (
    "discovery-auditor-batch-b-v2.json",
    "evidence-collector-village-guardian-batch-b-v3.json",
    "evidence-collector-village-guardian-batch-b-v4.json",
    "evidence-collector-archers-revenge-batch-b-v4.json",
    "evidence-collector-archers-revenge-batch-b-v5.json",
    "evidence-collector-storm-castle-tower-batch-b.json",
    "requirements-mapper-village-guardian-batch-b-v3.json",
    "requirements-mapper-village-guardian-batch-b-v4.json",
    "requirements-mapper-archers-revenge-batch-b-v4.json",
    "requirements-mapper-archers-revenge-batch-b-v5.json",
    "requirements-mapper-storm-castle-tower-batch-b.json",
    "browser-auditor-batch-b-v3.json",
    "asset-auditor-batch-b-v2.json",
    "adversarial-reviewer-batch-b-v5.json",
    "truth-test-author-batch-b-v10.json",
)

# Point every inherited contract at the exact V10-selected immutable inputs.
for _module in (_v9, _v9._v8, _v9._v8._v7, _core):
    _module.ROLE_BASE_SHA = ROLE_BASE_SHA
    _module.ACTIVE_INPUT_HASHES = ACTIVE_INPUT_HASHES
    _module.PINNED_RECEIPT_HASHES = PINNED_RECEIPT_HASHES
    _module.ACTIVE_RECEIPTS = ACTIVE_RECEIPTS
_v9._V9_PATH = _V10_PATH
_v9._V9_RECEIPT_PATH = _V10_RECEIPT_PATH
_v9._v8._V8_PATH = _V10_PATH
_v9._v8._V8_RECEIPT_PATH = _V10_RECEIPT_PATH
_v9._v8._v7._V7_PATH = _V10_PATH
_v9._v8._v7._V7_RECEIPT_PATH = _V10_RECEIPT_PATH
_core.V6_PATH = _V10_PATH
_core.V6_RECEIPT_PATH = _V10_RECEIPT_PATH
_v9._v8.MAPPER_RELATIVE = MAPPER_RELATIVE
_v9._v8.MAPPER_REPORT_RELATIVE = MAPPER_REPORT_RELATIVE
_v9._v8._v7.MAPPER_RELATIVE = MAPPER_RELATIVE
_v9._v8._v7.MAPPER_REPORT_RELATIVE = MAPPER_REPORT_RELATIVE
_core.REVIEW_PATH = _REPO_ROOT / REVIEW_V5
_core.REVIEW_RECEIPT_PATH = _REPO_ROOT / REVIEW_RECEIPT_V5


def _load_json(relative: str) -> dict[str, Any]:
    """Loads one repository-relative JSON object.

    @param relative Repository-relative artifact path.
    @returns The parsed JSON object.
    """
    return _core.load_json(_REPO_ROOT / relative)


def _records_containing(document: dict[str, Any], key: str, slug: str) -> list[dict[str, Any]]:
    """Selects denominator records whose own serialized bytes name a game slug.

    @param document Parsed accepted denominator artifact.
    @param key Top-level record-list key.
    @param slug Exact normalized game slug.
    @returns Matching denominator records in source order.
    """
    return [record for record in document[key] if slug in json.dumps(record, sort_keys=True)]


def _receipt_output_bindings(receipt: dict[str, Any]) -> list[tuple[str, str | None]]:
    """Normalizes receipt output bindings including direct path-to-hash maps.

    @param receipt Parsed role receipt.
    @returns Ordered unique output path and hash pairs.
    """
    bindings = list(_core.output_bindings(receipt))
    direct = receipt.get("output_paths_and_sha256")
    if isinstance(direct, dict):
        bindings.extend((path, digest) for path, digest in direct.items() if isinstance(path, str))
    return list(dict.fromkeys(bindings))


class BatchBFreezeContract(_v9.BatchBFreezeContract):
    """B0 exact committed V10 input, scope, predecessor, and direction contracts."""


class BatchBCollectorPackageContract(_v9.BatchBCollectorPackageContract):
    """B1 source truth plus exact accepted-denominator reconciliation contracts."""

    def test_exact_accepted_denominator_records_are_disposed_once(self) -> None:
        """Fails when: Village V4 or Archer V5 omits, adds, or duplicates an exact accepted denominator record."""
        identity = _load_json(IDENTITY_DENOMINATOR)
        source = _load_json(SOURCE_DENOMINATOR)
        history = _load_json(HISTORY_DENOMINATOR)
        scene = _load_json(SCENE_DENOMINATOR)
        assets = _load_json(ASSET_DENOMINATOR)

        expected_identity = {
            "village-guardian": "sentence/village-guardian",
            "archers-revenge": "catalog/archers-revenge",
        }
        for game, canonical_identity in expected_identity.items():
            reconciliation = _load_json(DENOMINATOR_RELATIVE[game])
            accepted = reconciliation["accepted_records"]
            self.assertEqual(accepted["identity"], [f"identity:{canonical_identity}"], game)
            self.assertEqual(
                [
                    record["canonical_identity_id"]
                    for record in identity["identity_records"]
                    if record["canonical_identity_id"] == canonical_identity
                ],
                [canonical_identity],
                game,
            )

            source_records = _records_containing(source, "records", game)
            source_ids = [record["record_id"] for record in source_records]
            source_paths = [
                record["file_path"]
                for record in source_records
                if record.get("record_type") == "file"
            ]
            self.assertEqual(set(accepted["source_paths"]), set(source_paths), game)
            if game == "village-guardian":
                self.assertEqual(set(accepted["source_record_ids"]), set(source_ids), game)

            historical_paths = [
                record["evidence"]["path"]
                for record in _records_containing(history, "records", game)
            ]
            historical_key = "historical" if game == "village-guardian" else "historical_paths"
            historical_values = accepted[historical_key]
            if game == "village-guardian":
                historical_values = [value.removeprefix("historical:") for value in historical_values]
            self.assertEqual(set(historical_values), set(historical_paths), game)

            asset_paths = [
                record["canonical_path"]
                for record in _records_containing(assets, "candidate_files", game)
            ]
            self.assertEqual(set(accepted["asset_paths"]), set(asset_paths), game)

            for values in accepted.values():
                self.assertEqual(len(values), len(set(values)), game)
            counts = reconciliation["accepted_record_counts"]
            self.assertEqual(counts["source"], len(source_records), game)
            self.assertEqual(counts["historical"], len(historical_paths), game)
            self.assertEqual(counts["asset"], len(asset_paths), game)
            self.assertEqual(counts["total"], sum(value for key, value in counts.items() if key != "total"), game)

        village = _load_json(DENOMINATOR_RELATIVE["village-guardian"])["accepted_records"]
        village_scenes = _records_containing(scene, "scene_records", "village-guardian")
        village_states = _records_containing(scene, "state_records", "village-guardian")
        village_transitions = _records_containing(scene, "transitions", "village-guardian")
        self.assertEqual(
            set(village["scene"]),
            {
                f"{record['scene_id']}@{Path(record['evidence']['path']).name}:{record['evidence']['range']['start_line']}"
                for record in village_scenes
            },
        )
        self.assertEqual(
            set(village["state"]),
            {f"{record['source_symbol']}:{record['state_id']}" for record in village_states},
        )
        self.assertEqual(
            set(village["transition"]),
            {
                f"{record['source_symbol']}:{record['from_state_id']}->{record['to_state_id']}"
                for record in village_transitions
            },
        )


class BatchBMapperPackageContract(_v9.BatchBMapperPackageContract):
    """B2 exact factual blueprint plus additive denominator-mapper contracts."""

    def test_mappers_bind_every_exact_active_claim_id(self) -> None:
        """Fails when: an active blueprint or additive report loses a claim, ledger, or exact denominator binding."""
        defects: list[str] = []
        for game in _core.GAMES:
            blueprint = _load_json(MAPPER_RELATIVE[game])
            references = set(_core.iter_claim_references(blueprint))
            active = {_core.claim_id(item) for item in _core.claims(game)}
            if references != active:
                defects.append(f"{game}:missing={len(active - references)},stale={len(references - active)}")

            if game not in DENOMINATOR_RELATIVE:
                continue
            report = _load_json(MAPPER_REPORT_RELATIVE[game])
            reconciliation_path = DENOMINATOR_RELATIVE[game]
            binding = report.get("denominator_reconciliation", {})
            if binding.get("path") != reconciliation_path:
                defects.append(f"{game}:denominator-path")
            if binding.get("sha256") != _core.file_hash(_REPO_ROOT / reconciliation_path):
                defects.append(f"{game}:denominator-hash")
            accounting = report.get("reference_accounting", {})
            expected_count = len(active)
            expected = {
                "collector_factual_claim_count": expected_count,
                "claim_reference_occurrence_count": expected_count,
                "unique_referenced_claim_count": expected_count,
                "resolved_reference_count": expected_count,
                "unresolved_reference_count": 0,
                "unreferenced_collector_factual_claim_count": 0,
            }
            for key, value in expected.items():
                if accounting.get(key) != value:
                    defects.append(f"{game}:{key}")
            if report.get("role_base_sha") != ARTIFACT_ROLE_BASE_SHA:
                defects.append(f"{game}:role-base")
            if "never provider provenance or source authority" not in report.get("webbridge_authority", ""):
                defects.append(f"{game}:webbridge-authority")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B2_DENOMINATOR_MAPPER_BINDING]: " + ", ".join(defects))


class BatchBClaimTruthContract(_v9.BatchBClaimTruthContract):
    """B3 independent all-claim source-semantic contracts."""

    def test_every_test_has_an_explicit_fails_when_contract(self) -> None:
        """Fails when: any V10 truth test lacks an auditable `Fails when:` condition."""
        missing: list[str] = []
        module = __import__(__name__)
        for _, cls in inspect.getmembers(module, inspect.isclass):
            if cls.__module__ != __name__ or not cls.__name__.startswith("BatchB"):
                continue
            for name, method in inspect.getmembers(cls, inspect.isfunction):
                if name.startswith("test_") and "Fails when:" not in (inspect.getdoc(method) or ""):
                    missing.append(f"{cls.__name__}.{name}")
        self.assertEqual(missing, [])


class BatchBNegativeFixtureContract(_v9.BatchBNegativeFixtureContract):
    """B3 all-fixture envelope and independent-refutation contracts."""


class BatchBReceiptContract(_v9.BatchBReceiptContract):
    """Exact local receipt, additive rebind, and provider-disclosure contracts."""

    def test_unavailable_provider_fields_do_not_automatically_fail_local_receipts(self) -> None:
        """Fails when: an active receipt omits local phase identity or does not truthfully disclose unavailable provider provenance."""
        defects: list[str] = []
        for name in ACTIVE_RECEIPTS:
            receipt = _core.load_json(_RECEIPTS_DIR / name)
            if receipt.get("track_id") != _core.TRACK_ID:
                defects.append(f"{name}:track")
            if receipt.get("phase") != _core.PHASE:
                defects.append(f"{name}:phase")
            if receipt.get("phase_base_sha") != PHASE_BASE_SHA:
                defects.append(f"{name}:phase-base")
            if name in ADDITIVE_RECEIPTS:
                serialized = json.dumps(receipt).lower()
                if "provider" not in serialized or "unavailable" not in serialized:
                    defects.append(f"{name}:provider-unavailability")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[ADDITIVE_RECEIPT_METADATA]: " + ", ".join(defects))

    def test_v6_receipt_binds_exact_test_bytes_and_role_base(self) -> None:
        """Fails when: the V10 receipt selects another role, base, input set, or truth-test bytes."""
        receipt = _core.load_json(_V10_RECEIPT_PATH)
        self.assertEqual(receipt.get("role"), "truth-test-author-batch-b-v10")
        self.assertEqual(receipt.get("role_base_sha"), ROLE_BASE_SHA)
        self.assertEqual(receipt.get("input_hashes"), ACTIVE_INPUT_HASHES)
        binding = next(
            (item for item in _receipt_output_bindings(receipt) if item[0] == str(_V10_PATH.relative_to(_REPO_ROOT))),
            None,
        )
        self.assertIsNotNone(binding)
        self.assertEqual(binding[1], _core.file_hash(_V10_PATH))

    def test_additive_receipts_bind_exact_outputs_and_role_base(self) -> None:
        """Fails when: a new Village/Archer collector or mapper receipt has stale bytes, output hashes, or role-base identity."""
        defects: list[str] = []
        for name, digest in ADDITIVE_RECEIPTS.items():
            path = _RECEIPTS_DIR / name
            receipt = _core.load_json(path)
            if _core.file_hash(path) != digest:
                defects.append(f"{name}:receipt-hash")
            if receipt.get("role_base_sha") != ARTIFACT_ROLE_BASE_SHA:
                defects.append(f"{name}:role-base")
            bindings = _receipt_output_bindings(receipt)
            if not bindings:
                defects.append(f"{name}:zero-bindings")
            for relative, output_digest in bindings:
                if not isinstance(output_digest, str) or not (_REPO_ROOT / relative).is_file():
                    defects.append(f"{name}:{relative}:missing-binding")
                elif _core.file_hash(_REPO_ROOT / relative) != output_digest:
                    defects.append(f"{name}:{relative}:byte-mismatch")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[ADDITIVE_RECEIPT_REBIND]: " + ", ".join(defects))


class BatchBBrowserContract(_v9.BatchBBrowserContract):
    """B4 exact WebBridge evidence and bounded-browser contracts."""

    def test_all_direction_non_waived_gates_and_review_limits_are_retained(self) -> None:
        """Fails when: B4 waives an integrity gate or stale review V5 broadens bounded WebBridge and completion evidence."""
        direction = _core.load_json(_core.WEBBRIDGE_DIRECTION_PATH)
        expected = {
            "claim citation and semantic correctness",
            "denominator completeness",
            "asset evidence",
            "role provenance and receipt integrity",
            "fresh independent review",
            "candidate, acceptance, and revocation lifecycle",
            "Village Guardian completion API contract correctness",
        }
        self.assertEqual(set(direction["non_waived_gates"]), expected)
        review = _load_json(REVIEW_V5)["owner_directions_and_limits"]
        browser_limit = review["webbridge"]["application"]
        completion_limit = review["completion"]["disposition"]
        self.assertIn("isTrusted=false", browser_limit)
        self.assertIn("hidden-tab", browser_limit)
        self.assertIn("404s", browser_limit)
        self.assertIn("HTTP 400", completion_limit)
        self.assertIn("not evidence of successful completion", completion_limit)


class BatchBAssetContract(_v9.BatchBAssetContract):
    """B4 exact asset-V2 denominator, source, and live-limit contracts."""


class BatchBCompletionContract(_v9.BatchBCompletionContract):
    """The disclosure-only owner disposition for the observed completion defect."""


class BatchBIndependentReviewContract(_v9.BatchBIndependentReviewContract):
    """B5 latest prior-review selection plus fail-closed fresh-review contracts."""

    def test_review_v4_and_receipt_are_exact_committed_selected_inputs(self) -> None:
        """Fails when: V10 does not select the exact committed stale review V5 and matching receipt as its review predecessor."""
        review_path = _REPO_ROOT / REVIEW_V5
        receipt_path = _REPO_ROOT / REVIEW_RECEIPT_V5
        self.assertEqual(_core.file_hash(review_path), ACTIVE_INPUT_HASHES[REVIEW_V5])
        self.assertEqual(_core.file_hash(receipt_path), ACTIVE_INPUT_HASHES[REVIEW_RECEIPT_V5])
        self.assertEqual(review_path.read_bytes(), _core.git_show("0117b6c2849da89a160a7a7dee2e04c74ab46cef", REVIEW_V5))
        review = _core.load_json(review_path)
        receipt = _core.load_json(receipt_path)
        self.assertEqual(review["role"], "adversarial-reviewer-batch-b-v5")
        self.assertEqual(review["audited_head_sha"], receipt["audited_head_sha"])

    def test_review_v4_binds_every_exact_active_additive_input(self) -> None:
        """Fails when: no fresh review binds every V10 input, both exact V10 outputs, and their descendant Git bindings."""
        inputs = _core.load_json(_core.REVIEW_RECEIPT_PATH).get("input_hashes", {})
        required = {
            relative: digest
            for relative, digest in ACTIVE_INPUT_HASHES.items()
            if relative not in {REVIEW_V5, REVIEW_RECEIPT_V5}
        }
        required[str(_V10_PATH.relative_to(_REPO_ROOT))] = _core.file_hash(_V10_PATH)
        required[str(_V10_RECEIPT_PATH.relative_to(_REPO_ROOT))] = _core.file_hash(_V10_RECEIPT_PATH)
        defects = [relative for relative, digest in required.items() if inputs.get(relative) != digest]
        defects.extend(
            f"{path.relative_to(_REPO_ROOT)}:no-descendant-binding"
            for path in (_V10_PATH, _V10_RECEIPT_PATH)
            if not _v9._v8._has_exact_descendant_binding(path)
        )
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B5_FRESH_REVIEW_V10]: " + ", ".join(defects))


class BatchBAcceptanceContract(_v9.BatchBAcceptanceContract):
    """B5 candidate, approval, and accepted-manifest existence gates."""


if __name__ == "__main__":
    _core.unittest.main()
