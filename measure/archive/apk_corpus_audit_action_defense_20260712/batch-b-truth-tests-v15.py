"""Batch B V15 truth contracts for review V9's four High findings.

V15 preserves V14's source, denominator, asset, bounded-browser, completion,
and lifecycle constraints. It adds the exact five inherited receipt dependencies
found by review V9, selects complete or additive-completed active receipts,
selects the 43-record Archer V8 atomic ledger and V9 mapper, and makes Archer
FIX-004 independently executable. Commit, fresh-review, and lifecycle gates
remain fail-closed.
"""

from __future__ import annotations

import hashlib
import importlib.util
import inspect
import json
import subprocess
from pathlib import Path
from typing import Any


_V15_PATH = Path(__file__).resolve()
_TRACK_DIR = _V15_PATH.parent
_REPO_ROOT = _V15_PATH.parents[3]
_RECEIPTS_DIR = _TRACK_DIR / "role-receipts"
_V14_PATH = _TRACK_DIR / "batch-b-truth-tests-v14.py"
_V15_RECEIPT_PATH = _RECEIPTS_DIR / "truth-test-author-batch-b-v15.json"

_spec = importlib.util.spec_from_file_location("batch_b_truth_v14_for_v15", _V14_PATH)
if _spec is None or _spec.loader is None:
    raise RuntimeError(f"Unable to load V14 truth contracts from {_V14_PATH}")
_v14 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_v14)
_core = _v14._core

PHASE_BASE_SHA = "ff01cee9cc973dee89fdc0ba22102dcea0c50542"
ROLE_BASE_SHA = "454c78336634a89aa9035099b343468948f2674e"
SOURCE_BASELINE_REVISION = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
ARCHER_TEXT_REVISION = "cd1936387d136ffb12e77a647f36cbce2d1fdd4e"

ARCHER_V8_LEDGER = "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-claim-ledger-batch-b-v8.json"
ARCHER_V7_METHOD = _v14.ARCHER_V7_METHOD
ARCHER_V8_REPORT = "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-evidence-final-report-batch-b-v8.json"
ARCHER_V8_RECEIPT = "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-archers-revenge-batch-b-v8-complete.json"
ARCHER_V9_MAP = "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-blueprint-batch-b-v9.json"
ARCHER_V9_MAPPER_REPORT = "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-mapper-final-report-batch-b-v9.json"
ARCHER_V9_MAPPER_RECEIPT = "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-archers-revenge-batch-b-v9-complete.json"
VILLAGE_V9_MAPPER_RECEIPT = "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-village-guardian-batch-b-v9-complete.json"
BROWSER_V4_RECEIPT = "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/browser-auditor-batch-b-v4-complete.json"
ASSET_V3_RECEIPT = "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/asset-auditor-batch-b-v3-complete.json"
RECEIPT_COMPLETION_REPORT = "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-role-receipt-completion-report-v10.json"
REVIEW_V9 = "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-adversarial-review-v9.json"
REVIEW_RECEIPT_V9 = "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/adversarial-reviewer-batch-b-v9.json"

REVIEW_V9_UNDECLARED_RECEIPTS = {
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/adversarial-reviewer-batch-b-v5.json": "38924ccbea70ecb4d89c8b99969890116d86e7914e0e44c4b7e8cdf932b0fbad",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-village-guardian-batch-b-v4.json": "a986b37348b353e57d269595c7480ad8127d81c74852c8fcbeeb42d8570e8cf5",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-archers-revenge-batch-b-v5.json": "8a0e6664cfbdbc009f098e949577b8e1495828d02f3ea9b6ee7a6dbf8ab3bdc0",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-village-guardian-batch-b-v4.json": "bf67f87a990722426f7bec1291b1c0d1864f0b17ecce5d42321b01b051db425f",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-village-guardian-batch-b-v5.json": "67b8e8c8f6e8a813ea40d22dabd8ed7326585f01b5429038c5d50f856240ddf7",
}

ADDITIONAL_INPUT_HASHES = {
    "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-truth-tests-v14.py": "4de84b59c3ae5242502622aa0a3c422d5f909c301c357cb3ec954ab61cffb691",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/truth-test-author-batch-b-v14.json": "76eb4d3c4b1479dcaafca27c1afde66d93a5ab4ae296e91f2ae2a0a5d1f3684e",
    **REVIEW_V9_UNDECLARED_RECEIPTS,
    ARCHER_V8_LEDGER: "1fedca7dffa8897a3bb0f5482a1c74c484bc3f16e5361ddd06dcc89ec8ec1ca3",
    ARCHER_V8_REPORT: "ead73c3df3750048b6c33e66109c1b7b670999a16780f30acb4ea249e79bf4ef",
    ARCHER_V8_RECEIPT: "4ab669f932a58fbcccceed5dfe5c22b9e648ed34961bfd239552f4694d642f1c",
    ARCHER_V9_MAP: "7b1591c5ed56538dcc8c94ddb51781fa72f9c9d5344aa812012cef54def5afc7",
    ARCHER_V9_MAPPER_REPORT: "cf2f6ad46472cbec7a68dc2ed0e2a18679879621f50a549c8d79fbe37023e6a0",
    ARCHER_V9_MAPPER_RECEIPT: "4bcbc36682e11d4ea01ab791827219dffe6f78efc6ffa12d473b5f7c1065f229",
    VILLAGE_V9_MAPPER_RECEIPT: "15340e93c6de91c6d4267d93f4d7ebf371ccc064adeae0a7e2d412be89553f5c",
    BROWSER_V4_RECEIPT: "fdd40f4aaaad994304c473f537464cba94240fd243da1ef3037e3229eec000f7",
    ASSET_V3_RECEIPT: "fdd8a632b36a10044e46a741078ba9aaf9d7fa61a950f5729edd1cbed9aba765",
    RECEIPT_COMPLETION_REPORT: "5a01a48cbe2ec83fb680bceb927b8d76346cdf5f568d1099ac6a9c7f4d3c30b4",
    REVIEW_V9: "2c534738cf9ff33f0bfaed700997fff03f48c2a28431841dcdcf294b66d93f5f",
    REVIEW_RECEIPT_V9: "4dcbffd4fff8a8d94aab188c0d0a6745d183d52af8c009c85a0578a89892af94",
}

ACTIVE_INPUT_HASHES = dict(_v14.ACTIVE_INPUT_HASHES)
ACTIVE_INPUT_HASHES.update(ADDITIONAL_INPUT_HASHES)
RUNTIME_RECEIPT_DEPENDENCIES = {
    path: digest for path, digest in ACTIVE_INPUT_HASHES.items() if "/role-receipts/" in path
}

MAPPER_RELATIVE = dict(_v14.MAPPER_RELATIVE)
MAPPER_RELATIVE["archers-revenge"] = ARCHER_V9_MAP
MAPPER_REPORT_RELATIVE = dict(_v14.MAPPER_REPORT_RELATIVE)
MAPPER_REPORT_RELATIVE["archers-revenge"] = ARCHER_V9_MAPPER_REPORT

ACTIVE_RECEIPTS = (
    "discovery-auditor-batch-b-v2.json",
    "evidence-collector-village-guardian-batch-b-v3.json",
    Path(ARCHER_V8_RECEIPT).name,
    "evidence-collector-storm-castle-tower-batch-b.json",
    Path(VILLAGE_V9_MAPPER_RECEIPT).name,
    Path(ARCHER_V9_MAPPER_RECEIPT).name,
    "requirements-mapper-storm-castle-tower-batch-b.json",
    Path(BROWSER_V4_RECEIPT).name,
    Path(ASSET_V3_RECEIPT).name,
    Path(REVIEW_RECEIPT_V9).name,
    _V15_RECEIPT_PATH.name,
)

PINNED_RECEIPT_HASHES = {
    name: RUNTIME_RECEIPT_DEPENDENCIES[str((_RECEIPTS_DIR / name).relative_to(_REPO_ROOT))]
    for name in ACTIVE_RECEIPTS[:-1]
}

REMEDIATION_INPUTS = tuple(ADDITIONAL_INPUT_HASHES)


def _load_json(relative: str) -> dict[str, Any]:
    """Loads one repository-relative JSON object.

    @param relative Repository-relative artifact path.
    @returns The parsed JSON object.
    """
    return _core.load_json(_REPO_ROOT / relative)


def _archer_v8_ledger() -> dict[str, Any]:
    """Returns the exact self-contained Archer V8 ledger.

    @returns The parsed V8 ledger.
    """
    return _load_json(ARCHER_V8_LEDGER)


def _archer_v8_claims() -> list[dict[str, Any]]:
    """Returns all 43 Archer V8 factual records.

    @returns The exact V8 factual population.
    """
    return _archer_v8_ledger()["claims"]


def _archer_v8_fixtures() -> list[dict[str, Any]]:
    """Returns all four Archer V8 validation controls.

    @returns The exact V8 fixture population.
    """
    return _archer_v8_ledger()["negative_fixtures"]


def _receipt_effective_inputs(receipt: dict[str, Any]) -> dict[str, str]:
    """Expands V15's exact inherited input manifest and additive input map.

    @param receipt Parsed V15 receipt.
    @returns The complete effective input path-to-digest map.
    """
    inherited = receipt["input_manifest"]["inherited_v14"]
    assert inherited["path"] == "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/truth-test-author-batch-b-v14.json"
    assert _core.file_hash(_REPO_ROOT / inherited["path"]) == inherited["sha256"]
    base = _core.load_json(_REPO_ROOT / inherited["path"])["input_hashes"]
    return {**base, **receipt["input_manifest"]["additions"]}


def _output_records(receipt: dict[str, Any]) -> list[tuple[str, str | None]]:
    """Normalizes explicit output path and digest records.

    @param receipt Parsed role receipt.
    @returns Output path and optional digest pairs.
    """
    return _v14._output_records(receipt)


# Point every inherited source/browser/completion contract at the V15 selection.
_modules = (
    _v14,
    _v14._v13,
    _v14._v13._v12,
    _v14._v13._v12._v11,
    _v14._v13._v12._v11._v10,
    _v14._v13._v12._v11._v10._v9,
    _v14._v13._v12._v11._v10._v9._v8,
    _v14._v13._v7,
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

_core.LEDGER_PATHS["archers-revenge"] = _REPO_ROOT / ARCHER_V8_LEDGER
_core.METHOD_PATHS["archers-revenge"] = _REPO_ROOT / ARCHER_V7_METHOD
_core.REPORT_PATHS["archers-revenge"] = _REPO_ROOT / ARCHER_V8_REPORT
_core.COLLECTOR_RECEIPTS["archers-revenge"] = _REPO_ROOT / ARCHER_V8_RECEIPT
_core.REVIEW_PATH = _REPO_ROOT / REVIEW_V9
_core.REVIEW_RECEIPT_PATH = _REPO_ROOT / REVIEW_RECEIPT_V9

for _module, _path_name, _receipt_name in (
    (_v14, "_V14_PATH", "_V14_RECEIPT_PATH"),
    (_v14._v13, "_V13_PATH", "_V13_RECEIPT_PATH"),
    (_v14._v13._v12, "_V12_PATH", "_V12_RECEIPT_PATH"),
    (_v14._v13._v12._v11, "_V11_PATH", "_V11_RECEIPT_PATH"),
    (_v14._v13._v12._v11._v10, "_V10_PATH", "_V10_RECEIPT_PATH"),
    (_v14._v13._v12._v11._v10._v9, "_V9_PATH", "_V9_RECEIPT_PATH"),
    (_v14._v13._v12._v11._v10._v9._v8, "_V8_PATH", "_V8_RECEIPT_PATH"),
    (_v14._v13._v7, "_V7_PATH", "_V7_RECEIPT_PATH"),
):
    setattr(_module, _path_name, _V15_PATH)
    setattr(_module, _receipt_name, _V15_RECEIPT_PATH)
_core.V6_PATH = _V15_PATH
_core.V6_RECEIPT_PATH = _V15_RECEIPT_PATH


class BatchBFreezeContract(_v14.BatchBFreezeContract):
    """B0 exact V15 input, scope, dependency, and commit-binding contracts."""

    def test_scope_is_exact_across_every_active_artifact(self) -> None:
        """Fails when: V15 changes scope or the V8 ledger loses its exact revisions or V7 supersession."""
        ledger = _archer_v8_ledger()
        self.assertEqual((ledger["game"], ledger["normalized_game_id"]), ("Archer's Revenge", "archers-revenge"))
        self.assertEqual(ledger["historical_source_revision"], ARCHER_TEXT_REVISION)
        self.assertEqual(ledger["source_baseline_revision"], SOURCE_BASELINE_REVISION)
        self.assertEqual(ledger["supersession"]["supersedes_path"], _v14.ARCHER_V7_LEDGER)
        self.assertEqual(len(_archer_v8_claims()), 43)
        self.assertEqual({_core.load_json(_core.DISCOVERY_PATH)["authoritative_scope"][i]["normalized_id"] for i in range(3)}, set(_core.GAMES))
        self.assertEqual({item["normalized_id"] for item in _core.load_json(_core.BROWSER_PATH)["games"]}, set(_core.GAMES))

    def test_v6_selects_exact_additive_inputs(self) -> None:
        """Fails when: any V15 input hash drifts, the receipt manifest differs, or a remediation input lacks a committed role-base binding."""
        defects = [relative for relative, digest in ACTIVE_INPUT_HASHES.items() if not (_REPO_ROOT / relative).is_file() or _core.file_hash(_REPO_ROOT / relative) != digest]
        self.assertEqual(defects, [], f"active input drift: {defects}")
        receipt = _core.load_json(_V15_RECEIPT_PATH)
        self.assertEqual(_receipt_effective_inputs(receipt), ACTIVE_INPUT_HASHES)
        commit_required = (*REMEDIATION_INPUTS, str(_V15_PATH.relative_to(_REPO_ROOT)), str(_V15_RECEIPT_PATH.relative_to(_REPO_ROOT)))
        uncommitted = [relative for relative in commit_required if _core.git_show(ROLE_BASE_SHA, relative) != (_REPO_ROOT / relative).read_bytes()]
        self.assertEqual(uncommitted, [], "EXPECTED_STAGE_RED[B0_UNCOMMITTED_V15_REMEDIATION]: " + ", ".join(uncommitted))


class BatchBCollectorPackageContract(_v14.BatchBCollectorPackageContract):
    """B1 exact source truth plus V8 atomic collector contracts."""

    def test_selected_packages_are_nonempty_and_counts_reconcile(self) -> None:
        """Fails when: V15 does not select exactly 158 facts and 12 separate negative fixtures."""
        counts = {"village-guardian":(73,4), "archers-revenge":(43,4), "storm-castle-tower":(42,4)}
        for game, (facts, fixtures) in counts.items():
            self.assertEqual((len(_core.claims(game)), len(_core.fixtures(game))), (facts, fixtures), game)
        all_ids = [_core.claim_id(item) for game in _core.GAMES for item in _core.claims(game)]
        self.assertEqual(len(all_ids), 158)
        self.assertEqual(len(all_ids), len(set(all_ids)))
        self.assertEqual(_load_json(ARCHER_V8_REPORT)["completeness"]["factual_claims"], 43)

    def test_every_positive_claim_source_envelope_rederives(self) -> None:
        """Fails when: any of the 152 positive source envelopes differs from its exact Git blob and range bytes."""
        errors = [error for game in _core.GAMES for item in _core.claims(game) if item.get("relative_path") if (error := _core.citation_error(item, _core.claim_id(item)))]
        self.assertEqual(errors, [])
        self.assertEqual(sum(bool(item.get("relative_path")) for game in _core.GAMES for item in _core.claims(game)), 152)

    def test_denominator_and_disc_001_boundaries_are_preserved(self) -> None:
        """Fails when: V8 is not self-contained, its V7 predecessor is unpinned, or DISC-001 enters V8 facts or fixtures."""
        ledger = _archer_v8_ledger()
        predecessor = ledger["supersession"]["supersedes_path"]
        self.assertEqual(_core.file_hash(_REPO_ROOT / predecessor), ACTIVE_INPUT_HASHES[predecessor])
        self.assertEqual(len(ledger["claims"]), ledger["coverage"]["factual_claims"])
        self.assertTrue(ledger["coverage"]["atomic_records"])
        self.assertNotIn("DISC-001", json.dumps(ledger["claims"]))
        self.assertNotIn("DISC-001", json.dumps(ledger["negative_fixtures"]))

    def test_archer_v7_complete_rebind_selects_exact_current_output_bytes(self) -> None:
        """Fails when: the complete V8 collector receipt does not bind the exact ledger, method, and report bytes."""
        receipt = _load_json(ARCHER_V8_RECEIPT)
        expected = {ARCHER_V8_LEDGER:ACTIVE_INPUT_HASHES[ARCHER_V8_LEDGER], ARCHER_V7_METHOD:ACTIVE_INPUT_HASHES[ARCHER_V7_METHOD], ARCHER_V8_REPORT:ACTIVE_INPUT_HASHES[ARCHER_V8_REPORT]}
        self.assertEqual({path:digest for path, digest in _output_records(receipt)}, expected)
        self.assertEqual(receipt["role_base_sha"], ROLE_BASE_SHA)
        self.assertEqual(receipt["findings"]["unresolved"], [])
        self.assertEqual(receipt["resource_use"]["ceiling_breaches"], 0)

    def test_archer_v6_rebind_selects_exact_current_output_bytes(self) -> None:
        """Fails when: a legacy inherited test bypasses the selected complete Archer V8 collector contract."""
        self.test_archer_v7_complete_rebind_selects_exact_current_output_bytes()


class BatchBMapperPackageContract(_v14.BatchBMapperPackageContract):
    """B2 exact Village completion receipt and Archer V9 atomic-map contracts."""

    def test_mappers_bind_every_exact_active_claim_id(self) -> None:
        """Fails when: Archer V9 omits, duplicates, invents, or misbinds one V8 fact or fixture."""
        blueprint = _load_json(ARCHER_V9_MAP)
        report = _load_json(ARCHER_V9_MAPPER_REPORT)
        ids = [item["claim_id"] for item in _archer_v8_claims()]
        refs = [claim for section in blueprint["mapped_sections"] for claim in section["claim_ids"]]
        self.assertEqual(len(refs), len(set(refs)))
        self.assertEqual(set(refs), set(ids))
        self.assertEqual(blueprint["referenced_claim_ids"], ids)
        self.assertEqual(set(blueprint["negative_fixtures_preserved"]), {item["fixture_id"] for item in _archer_v8_fixtures()})
        self.assertEqual(blueprint["source_claim_ledger"], {"path":ARCHER_V8_LEDGER,"sha256":ACTIVE_INPUT_HASHES[ARCHER_V8_LEDGER]})
        self.assertEqual(report["reference_accounting"]["resolved_reference_count"], 43)
        self.assertEqual(report["reference_accounting"]["unresolved_reference_count"], 0)

    def test_latest_mapper_receipts_satisfy_their_full_declared_contracts(self) -> None:
        """Fails when: either selected additive mapper receipt loses exact controls, zero unresolved findings, or same-unit accounting."""
        for relative, role in ((VILLAGE_V9_MAPPER_RECEIPT,"requirements-mapper-village-guardian-batch-b-v9-receipt-completion"),(ARCHER_V9_MAPPER_RECEIPT,"requirements-mapper-archers-revenge-batch-b-v9")):
            receipt = _load_json(relative)
            self.assertEqual(receipt["role"], role)
            self.assertEqual(receipt["phase_base_sha"], PHASE_BASE_SHA)
            self.assertEqual(receipt["role_base_sha"], ROLE_BASE_SHA)
            self.assertEqual(receipt["allowed_input_manifest_sha256"], "e47a9e95fec45b4f2c03834a09d9ca56f62d18e03d6f29af56b1d3642ec71717")
            self.assertEqual(receipt["findings"]["unresolved"], [])
            self.assertEqual(receipt["resource_use"]["ceiling_breaches"], 0)
            for key, actual in receipt["resource_use"]["actual"].items():
                self.assertIs(type(actual), int)
                self.assertLessEqual(actual, receipt["resource_use"]["ceilings"][key])


class BatchBClaimTruthContract(_v14.BatchBClaimTruthContract):
    """B3 all-field, all-claim, and all-assertion source-semantic contracts."""

    def test_archer_and_storm_semantic_atoms_all_match_exact_ranges(self) -> None:
        """Fails when: any declared V8 semantic assertion or inherited Storm atom is absent from its exact cited bytes."""
        defects: list[str] = []
        for record in _archer_v8_claims():
            data = _core.cited_bytes(record)
            assertion = record["semantic_assertion"]
            valid = data.startswith(bytes.fromhex(assertion["value"])) if assertion["kind"] == "starts_with_hex" else assertion["value"].encode() in data
            if not valid:
                defects.append(record["claim_id"])
        for record in [item for item in _core.claims("storm-castle-tower") if item.get("relative_path")]:
            data = _core.cited_bytes(record)
            for atom in _core.EXTERNAL_SEMANTIC_ATOMS[_core.claim_id(record)]:
                if not (data.startswith(bytes.fromhex(atom)) if atom == "89504e470d0a1a0a" else atom.encode() in data):
                    defects.append(f"{_core.claim_id(record)}:{atom}")
        self.assertEqual(defects, [])

    def test_every_claim_has_a_fact_interpretation_and_temporal_boundary(self) -> None:
        """Fails when: any V8 factual field is absent, empty, extra, inconsistent, unsupported, or promotes history to runtime."""
        ledger = _archer_v8_ledger()
        required = set(ledger["claim_contract"]["required_fields"])
        self.assertEqual(len(required), 21)
        for record in _archer_v8_claims():
            self.assertEqual(set(record), required, record["claim_id"])
            self.assertTrue(all(record[field] not in (None, "", []) for field in required), record["claim_id"])
            self.assertEqual(record["collector_id"], ledger["collector_id"])
            self.assertIn(record["temporal_disposition"], {"historical", "baseline-only"})
            self.assertNotEqual(record["category"], "typed_answer")
            self.assertNotIn("positive configured enemy projectile speed", record["exact_source_fact"])
        self.assertEqual(ledger["unsupported_v7_fields_removed"], ["AR-B2-V7-017.category=typed_answer", "AR-B2-V7-019.exact_source_fact=positive configured enemy projectile speed"])

    def test_every_test_has_an_explicit_fails_when_contract(self) -> None:
        """Fails when: any V15 truth test lacks an auditable `Fails when:` condition."""
        module = __import__(__name__)
        missing = [f"{cls.__name__}.{name}" for _, cls in inspect.getmembers(module, inspect.isclass) if cls.__module__ == __name__ and cls.__name__.startswith("BatchB") for name, method in inspect.getmembers(cls, inspect.isfunction) if name.startswith("test_") and "Fails when:" not in (inspect.getdoc(method) or "")]
        self.assertEqual(missing, [])


class BatchBNegativeFixtureContract(_v14.BatchBNegativeFixtureContract):
    """B3 self-contained fixture-refutation contracts."""

    def test_archer_fixture_refutations_rederive_from_source_boundaries(self) -> None:
        """Fails when: a V8 fixture has an empty source-check set or FIX-004's exact query domain, output, status, or hash drifts."""
        records = {item["fixture_id"]: item for item in _archer_v8_fixtures()}
        active_ids = {item["claim_id"] for item in _archer_v8_claims()}
        for fixture_id in ("AR-B2-V8-FIX-001", "AR-B2-V8-FIX-002", "AR-B2-V8-FIX-003"):
            references = records[fixture_id].get("source_checked_claim_ids", [])
            self.assertTrue(references, fixture_id)
            self.assertTrue(all(reference in active_ids for reference in references), fixture_id)
        fixture = records["AR-B2-V8-FIX-004"]
        checks = fixture.get("source_checks", [])
        self.assertTrue(checks, "empty source checks must fail")
        self.assertEqual(len(checks), 1)
        check = checks[0]
        self.assertEqual(check["command_domain"], "exact revision:path Git object only; no working-tree fallback")
        self.assertEqual(check["source_revision"], ARCHER_TEXT_REVISION)
        result = subprocess.run(check["command_argv"], cwd=_REPO_ROOT, capture_output=True, check=False)
        self.assertEqual(result.returncode, check["exit_status"])
        self.assertEqual(result.stdout.decode(), check["captured_stdout"])
        self.assertEqual(result.stderr.decode(), check["captured_stderr"])
        self.assertEqual(hashlib.sha256(result.stdout).hexdigest(), check["output_sha256"])
        self.assertEqual(result.stdout, b"tree\n")


class BatchBReceiptContract(_v14.BatchBReceiptContract):
    """Exact runtime dependency, selected receipt, supersession, and disclosure contracts."""

    def test_additive_receipts_bind_exact_outputs_and_role_base(self) -> None:
        """Fails when: the completion report omits or mis-hashes one selected pre-V15 active receipt."""
        report = _load_json(RECEIPT_COMPLETION_REPORT)
        selected = {Path(item["path"]).name:item["sha256"] for item in report["selected_pre_v15_receipts"]}
        self.assertEqual(set(selected), set(ACTIVE_RECEIPTS[:-1]))
        for name, digest in selected.items():
            self.assertEqual(_core.file_hash(_RECEIPTS_DIR / name), digest)

    def test_pinned_existing_receipt_bytes_are_not_mutated(self) -> None:
        """Fails when: any selected pre-V15 active receipt differs from its declared exact digest."""
        self.assertEqual([name for name, digest in PINNED_RECEIPT_HASHES.items() if _core.file_hash(_RECEIPTS_DIR / name) != digest], [])

    def test_receipt_output_hashes_bind_current_exact_bytes(self) -> None:
        """Fails when: any additive completion receipt's declared non-self output differs from current exact bytes."""
        latest = (ARCHER_V8_RECEIPT, ARCHER_V9_MAPPER_RECEIPT, VILLAGE_V9_MAPPER_RECEIPT, BROWSER_V4_RECEIPT, ASSET_V3_RECEIPT)
        defects: list[str] = []
        for relative in latest:
            for output, digest in _output_records(_load_json(relative)):
                if not isinstance(digest, str) or not (_REPO_ROOT / output).is_file() or _core.file_hash(_REPO_ROOT / output) != digest:
                    defects.append(f"{relative}:{output}")
        self.assertEqual(defects, [])

    def test_v6_receipt_binds_exact_test_bytes_and_role_base(self) -> None:
        """Fails when: the V15 receipt selects another role/base/test or its effective input manifest differs."""
        receipt = _core.load_json(_V15_RECEIPT_PATH)
        self.assertEqual(receipt["role"], "truth-test-author-batch-b-v15")
        self.assertEqual(receipt["role_base_sha"], ROLE_BASE_SHA)
        self.assertEqual(_receipt_effective_inputs(receipt), ACTIVE_INPUT_HASHES)
        binding = next((item for item in _output_records(receipt) if item[0] == str(_V15_PATH.relative_to(_REPO_ROOT))), None)
        self.assertIsNotNone(binding)
        self.assertEqual(binding[1], _core.file_hash(_V15_PATH))

    def test_unavailable_provider_fields_do_not_automatically_fail_local_receipts(self) -> None:
        """Fails when: an additive completion receipt lacks exact local controls or fabricates unavailable provider provenance."""
        strict = (ARCHER_V8_RECEIPT, ARCHER_V9_MAPPER_RECEIPT, VILLAGE_V9_MAPPER_RECEIPT, BROWSER_V4_RECEIPT, ASSET_V3_RECEIPT)
        for relative in strict:
            receipt = _load_json(relative)
            self.assertEqual(receipt["phase_base_sha"], PHASE_BASE_SHA)
            self.assertEqual(receipt["role_base_sha"], ROLE_BASE_SHA)
            self.assertEqual(receipt["allowed_input_manifest_sha256"], "e47a9e95fec45b4f2c03834a09d9ca56f62d18e03d6f29af56b1d3642ec71717")
            self.assertEqual(receipt["budget_declaration_sha256"], _v14.ACTIVE_INPUT_HASHES[_v14.BUDGET_DECLARATION])
            self.assertEqual(receipt["findings"]["unresolved"], [])
            provider = receipt["provider_unavailability"]
            self.assertFalse(provider["available"])
            self.assertFalse(provider["attestation_claimed"])
            self.assertTrue(all(provider[field] is None for field in ("prompt_sha256","actual_context_manifest_sha256","provider_spawn_id","provider_session_id","parent_ancestry_ids","fork_turns","raw_isolation_export_sha256","start_event_id","start_event_timestamp","end_event_id","end_event_timestamp","final_response_sha256","final_response_event_id","commit_sha")))
            self.assertEqual(receipt["commit_disposition"], "not-created; user prohibited commits")
            for key, actual in receipt["resource_use"]["actual"].items():
                self.assertIs(type(actual), int)
                self.assertLessEqual(actual, receipt["resource_use"]["ceilings"][key])

    def test_latest_artifacts_bind_the_correct_owner_provenance_direction(self) -> None:
        """Fails when: a latest completion receipt claims provider authority, changed browser evidence, or completion success."""
        for relative in (ARCHER_V8_RECEIPT, ARCHER_V9_MAPPER_RECEIPT, VILLAGE_V9_MAPPER_RECEIPT, BROWSER_V4_RECEIPT, ASSET_V3_RECEIPT):
            receipt = _load_json(relative)
            self.assertEqual(receipt["provenance_direction"]["decision"], "LOCAL_VERIFIABLE_RECEIPTS_ACCEPTED_WITH_DISCLOSURE")
            self.assertFalse(receipt.get("completion_success_claimed", False))
        self.assertFalse(_load_json(BROWSER_V4_RECEIPT)["api_correctness_claimed"])

    def test_all_runtime_receipt_dependencies_are_declared_and_hashed(self) -> None:
        """Fails when: V15 omits any inherited or selected runtime receipt dependency, including review V9's five observed omissions."""
        receipt = _core.load_json(_V15_RECEIPT_PATH)
        self.assertEqual(receipt["runtime_receipt_dependencies"], RUNTIME_RECEIPT_DEPENDENCIES)
        self.assertTrue(set(REVIEW_V9_UNDECLARED_RECEIPTS) <= set(RUNTIME_RECEIPT_DEPENDENCIES))
        defects = [path for path, digest in RUNTIME_RECEIPT_DEPENDENCIES.items() if _core.file_hash(_REPO_ROOT / path) != digest]
        self.assertEqual(defects, [])


class BatchBBrowserContract(_v14.BatchBBrowserContract):
    """B4 exact unchanged WebBridge evidence and bounded-browser contracts."""


class BatchBAssetContract(_v14.BatchBAssetContract):
    """B4 exact unchanged asset-V2 denominator, source, and live-limit contracts."""


class BatchBCompletionContract(_v14.BatchBCompletionContract):
    """The unchanged disclosure-only owner disposition for the observed completion defect."""


class BatchBIndependentReviewContract(_v14.BatchBIndependentReviewContract):
    """B5 exact V9 predecessor selection plus fail-closed fresh V15 review contracts."""

    def test_review_v4_and_receipt_are_exact_committed_selected_inputs(self) -> None:
        """Fails when: the selected V9 predecessor review or receipt differs from exact committed role-base bytes."""
        self.assertEqual(_core.file_hash(_REPO_ROOT / REVIEW_V9), ACTIVE_INPUT_HASHES[REVIEW_V9])
        self.assertEqual(_core.file_hash(_REPO_ROOT / REVIEW_RECEIPT_V9), ACTIVE_INPUT_HASHES[REVIEW_RECEIPT_V9])
        self.assertEqual((_REPO_ROOT / REVIEW_V9).read_bytes(), _core.git_show(ROLE_BASE_SHA, REVIEW_V9))
        self.assertEqual((_REPO_ROOT / REVIEW_RECEIPT_V9).read_bytes(), _core.git_show(ROLE_BASE_SHA, REVIEW_RECEIPT_V9))

    def test_review_has_zero_unresolved_blocking_findings_for_active_inputs(self) -> None:
        """Fails when: the selected review predates V15 or reports any unresolved Critical, High, or Medium finding."""
        review = _load_json(REVIEW_V9)
        unresolved = review["unresolved_findings"]
        self.assertEqual((unresolved["critical"], unresolved["high"], unresolved["medium"]), (0, 0, 0), "EXPECTED_STAGE_RED[B5_STALE_REVIEW_V9]: fresh post-V15 independent review required")

    def test_review_v4_binds_every_exact_active_additive_input(self) -> None:
        """Fails when: no fresh independent review binds every V15 input and both exact V15 outputs."""
        inputs = _load_json(REVIEW_RECEIPT_V9).get("input_hashes", {})
        required = dict(ACTIVE_INPUT_HASHES)
        required[str(_V15_PATH.relative_to(_REPO_ROOT))] = _core.file_hash(_V15_PATH)
        required[str(_V15_RECEIPT_PATH.relative_to(_REPO_ROOT))] = _core.file_hash(_V15_RECEIPT_PATH)
        defects = [relative for relative, digest in required.items() if inputs.get(relative) != digest]
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B5_FRESH_REVIEW_V15]: " + ", ".join(defects))


class BatchBAcceptanceContract(_v14.BatchBAcceptanceContract):
    """B5 candidate, approval, and accepted-manifest existence gates."""


if __name__ == "__main__":
    _core.unittest.main()
