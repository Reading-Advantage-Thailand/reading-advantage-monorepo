"""Batch B V11 truth contracts for the latest exact remediation artifacts.

V11 retains V10's source, semantic, fixture, asset, bounded-browser,
completion, review, and lifecycle contracts. It selects the committed Village
V5 denominator reconciliation and the superseding Village V5 and Archer V6
mapper receipts. Evidence gates are expected green; fresh review and lifecycle
remain fail-closed.
"""

from __future__ import annotations

import importlib.util
import inspect
import json
from pathlib import Path
from typing import Any


_V11_PATH = Path(__file__).resolve()
_TRACK_DIR = _V11_PATH.parent
_REPO_ROOT = _V11_PATH.parents[3]
_RECEIPTS_DIR = _TRACK_DIR / "role-receipts"
_V10_PATH = _TRACK_DIR / "batch-b-truth-tests-v10.py"
_V11_RECEIPT_PATH = _RECEIPTS_DIR / "truth-test-author-batch-b-v11.json"

_spec = importlib.util.spec_from_file_location("batch_b_truth_v10_for_v11", _V10_PATH)
if _spec is None or _spec.loader is None:
    raise RuntimeError(f"Unable to load V10 truth contracts from {_V10_PATH}")
_v10 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_v10)
_core = _v10._core

PHASE_BASE_SHA = "ff01cee9cc973dee89fdc0ba22102dcea0c50542"
ROLE_BASE_SHA = "f770d2e8831dd15037407310a75dedd13c64065b"
GLOBAL_DIRECTION = "measure/product-owner-apk-provenance-direction-20260721.json"

VILLAGE_RECONCILIATION_V4 = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/"
    "village-guardian-denominator-reconciliation-batch-b-v4.json"
)
DENOMINATOR_RELATIVE = dict(_v10.DENOMINATOR_RELATIVE)
DENOMINATOR_RELATIVE["village-guardian"] = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/"
    "village-guardian-denominator-reconciliation-batch-b-v5.json"
)
MAPPER_RELATIVE = dict(_v10.MAPPER_RELATIVE)
MAPPER_REPORT_RELATIVE = dict(_v10.MAPPER_REPORT_RELATIVE)
MAPPER_DENOMINATOR_RELATIVE = {
    "village-guardian": VILLAGE_RECONCILIATION_V4,
    "archers-revenge": DENOMINATOR_RELATIVE["archers-revenge"],
}

ADDITIVE_RECEIPTS = {
    "evidence-collector-village-guardian-batch-b-v5.json": "79996547bd75e5e6953c4e86aaa661d267163d14db9f981b8d59a32ca793627b",
    "evidence-collector-archers-revenge-batch-b-v5.json": "9b1f77f4a74f97a9dd7db9f90a5366951e80666aa193afe5a485f3f11998d1f6",
    "requirements-mapper-village-guardian-batch-b-v5.json": "67b8e8c8f6e8a813ea40d22dabd8ed7326585f01b5429038c5d50f856240ddf7",
    "requirements-mapper-archers-revenge-batch-b-v6.json": "e216780695270eb16000ac124eeaeab99df9ef17d30039aa8c4ff33e76821748",
}
ADDITIVE_RECEIPT_ROLE_BASES = {
    "evidence-collector-village-guardian-batch-b-v5.json": "eb4757b76f74afa05841453c5f46d99718f1ad71",
    "evidence-collector-archers-revenge-batch-b-v5.json": "134a94bc451f84e2a75ef18a8cbbe7382bd3395c",
    "requirements-mapper-village-guardian-batch-b-v5.json": "eb4757b76f74afa05841453c5f46d99718f1ad71",
    "requirements-mapper-archers-revenge-batch-b-v6.json": "134a94bc451f84e2a75ef18a8cbbe7382bd3395c",
}

REVIEW_V5 = _v10.REVIEW_V5
REVIEW_RECEIPT_V5 = _v10.REVIEW_RECEIPT_V5

ACTIVE_INPUT_HASHES = dict(_v10.ACTIVE_INPUT_HASHES)
for _superseded_path in (
    VILLAGE_RECONCILIATION_V4,
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-village-guardian-batch-b-v4.json",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-village-guardian-batch-b-v4.json",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-archers-revenge-batch-b-v5.json",
):
    ACTIVE_INPUT_HASHES.pop(_superseded_path)
ACTIVE_INPUT_HASHES.update(
    {
        "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-truth-tests-v10.py": "6fe95d62abd52405ed9ab0fb1e3e895698f8f1845dc36092cbc9c5b89730e6de",
        "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/truth-test-author-batch-b-v10.json": "451d669e1b8dc255c3635929180f040a78c713c847ae599d960cb893b7828f45",
        DENOMINATOR_RELATIVE["village-guardian"]: "c1084de81f6b12f105e5ed8b7150fa0fffe15d6aa0f595d96ea66f79136d2a40",
        "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-village-guardian-batch-b-v5.json": ADDITIVE_RECEIPTS["evidence-collector-village-guardian-batch-b-v5.json"],
        "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-village-guardian-batch-b-v5.json": ADDITIVE_RECEIPTS["requirements-mapper-village-guardian-batch-b-v5.json"],
        "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-archers-revenge-batch-b-v6.json": ADDITIVE_RECEIPTS["requirements-mapper-archers-revenge-batch-b-v6.json"],
    }
)

PINNED_RECEIPT_HASHES = dict(_v10.PINNED_RECEIPT_HASHES)
PINNED_RECEIPT_HASHES.update(ADDITIVE_RECEIPTS)
PINNED_RECEIPT_HASHES["truth-test-author-batch-b-v10.json"] = (
    "451d669e1b8dc255c3635929180f040a78c713c847ae599d960cb893b7828f45"
)
ACTIVE_RECEIPTS = (
    "discovery-auditor-batch-b-v2.json",
    "evidence-collector-village-guardian-batch-b-v3.json",
    "evidence-collector-village-guardian-batch-b-v5.json",
    "evidence-collector-archers-revenge-batch-b-v4.json",
    "evidence-collector-archers-revenge-batch-b-v5.json",
    "evidence-collector-storm-castle-tower-batch-b.json",
    "requirements-mapper-village-guardian-batch-b-v3.json",
    "requirements-mapper-village-guardian-batch-b-v5.json",
    "requirements-mapper-archers-revenge-batch-b-v4.json",
    "requirements-mapper-archers-revenge-batch-b-v6.json",
    "requirements-mapper-storm-castle-tower-batch-b.json",
    "browser-auditor-batch-b-v3.json",
    "asset-auditor-batch-b-v2.json",
    "adversarial-reviewer-batch-b-v5.json",
    "truth-test-author-batch-b-v11.json",
)

# Point every inherited contract at the exact V11-selected immutable inputs.
for _module in (
    _v10,
    _v10._v9,
    _v10._v9._v8,
    _v10._v9._v8._v7,
    _core,
):
    _module.ROLE_BASE_SHA = ROLE_BASE_SHA
    _module.ACTIVE_INPUT_HASHES = ACTIVE_INPUT_HASHES
    _module.PINNED_RECEIPT_HASHES = PINNED_RECEIPT_HASHES
    _module.ACTIVE_RECEIPTS = ACTIVE_RECEIPTS
_v10.DENOMINATOR_RELATIVE = DENOMINATOR_RELATIVE
_v10.MAPPER_RELATIVE = MAPPER_RELATIVE
_v10.MAPPER_REPORT_RELATIVE = MAPPER_REPORT_RELATIVE
_v10.ADDITIVE_RECEIPTS = ADDITIVE_RECEIPTS
_v10._V10_PATH = _V11_PATH
_v10._V10_RECEIPT_PATH = _V11_RECEIPT_PATH
_v10._v9._V9_PATH = _V11_PATH
_v10._v9._V9_RECEIPT_PATH = _V11_RECEIPT_PATH
_v10._v9._v8._V8_PATH = _V11_PATH
_v10._v9._v8._V8_RECEIPT_PATH = _V11_RECEIPT_PATH
_v10._v9._v8._v7._V7_PATH = _V11_PATH
_v10._v9._v8._v7._V7_RECEIPT_PATH = _V11_RECEIPT_PATH
_core.V6_PATH = _V11_PATH
_core.V6_RECEIPT_PATH = _V11_RECEIPT_PATH
for _module in (_v10._v9._v8, _v10._v9._v8._v7):
    _module.MAPPER_RELATIVE = MAPPER_RELATIVE
    _module.MAPPER_REPORT_RELATIVE = MAPPER_REPORT_RELATIVE


def _load_json(relative: str) -> dict[str, Any]:
    """Loads one repository-relative JSON object.

    @param relative Repository-relative artifact path.
    @returns The parsed JSON object.
    """
    return _core.load_json(_REPO_ROOT / relative)


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


class BatchBFreezeContract(_v10.BatchBFreezeContract):
    """B0 exact committed V11 input, scope, predecessor, and direction contracts."""


class BatchBCollectorPackageContract(_v10.BatchBCollectorPackageContract):
    """B1 source truth plus exact accepted-denominator reconciliation contracts."""


class BatchBMapperPackageContract(_v10.BatchBMapperPackageContract):
    """B2 exact factual blueprint plus denominator and superseding-receipt contracts."""

    def test_mappers_bind_every_exact_active_claim_id(self) -> None:
        """Fails when: an active map loses a claim or its immutable report and selected reconciliation lineage disagree."""
        defects: list[str] = []
        for game in _core.GAMES:
            blueprint = _load_json(MAPPER_RELATIVE[game])
            references = set(_core.iter_claim_references(blueprint))
            active = {_core.claim_id(item) for item in _core.claims(game)}
            if references != active:
                defects.append(f"{game}:missing={len(active - references)},stale={len(references - active)}")

            if game not in MAPPER_DENOMINATOR_RELATIVE:
                continue
            report = _load_json(MAPPER_REPORT_RELATIVE[game])
            report_reconciliation = MAPPER_DENOMINATOR_RELATIVE[game]
            binding = report.get("denominator_reconciliation", {})
            if binding.get("path") != report_reconciliation:
                defects.append(f"{game}:denominator-path")
            if binding.get("sha256") != _core.file_hash(_REPO_ROOT / report_reconciliation):
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
            if report.get("role_base_sha") != "134a94bc451f84e2a75ef18a8cbbe7382bd3395c":
                defects.append(f"{game}:role-base")
            if "never provider provenance or source authority" not in report.get("webbridge_authority", ""):
                defects.append(f"{game}:webbridge-authority")

        village = _load_json(DENOMINATOR_RELATIVE["village-guardian"])
        supersession = village.get("supersession", {})
        if supersession.get("supersedes_report") != VILLAGE_RECONCILIATION_V4:
            defects.append("village-guardian:v5-predecessor")
        if "Graph record ID prefix normalization only" not in supersession.get("scope_limit", ""):
            defects.append("village-guardian:v5-scope")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B2_DENOMINATOR_MAPPER_BINDING]: " + ", ".join(defects))


class BatchBClaimTruthContract(_v10.BatchBClaimTruthContract):
    """B3 independent all-claim source-semantic contracts."""

    def test_every_test_has_an_explicit_fails_when_contract(self) -> None:
        """Fails when: any V11 truth test lacks an auditable `Fails when:` condition."""
        missing: list[str] = []
        module = __import__(__name__)
        for _, cls in inspect.getmembers(module, inspect.isclass):
            if cls.__module__ != __name__ or not cls.__name__.startswith("BatchB"):
                continue
            for name, method in inspect.getmembers(cls, inspect.isfunction):
                if name.startswith("test_") and "Fails when:" not in (inspect.getdoc(method) or ""):
                    missing.append(f"{cls.__name__}.{name}")
        self.assertEqual(missing, [])


class BatchBNegativeFixtureContract(_v10.BatchBNegativeFixtureContract):
    """B3 all-fixture envelope and independent-refutation contracts."""


class BatchBReceiptContract(_v10.BatchBReceiptContract):
    """Exact local receipt, additive supersession, and provider-disclosure contracts."""

    def test_v6_receipt_binds_exact_test_bytes_and_role_base(self) -> None:
        """Fails when: the V11 receipt selects another role, base, input set, or truth-test bytes."""
        receipt = _core.load_json(_V11_RECEIPT_PATH)
        self.assertEqual(receipt.get("role"), "truth-test-author-batch-b-v11")
        self.assertEqual(receipt.get("role_base_sha"), ROLE_BASE_SHA)
        self.assertEqual(receipt.get("input_hashes"), ACTIVE_INPUT_HASHES)
        binding = next(
            (item for item in _receipt_output_bindings(receipt) if item[0] == str(_V11_PATH.relative_to(_REPO_ROOT))),
            None,
        )
        self.assertIsNotNone(binding)
        self.assertEqual(binding[1], _core.file_hash(_V11_PATH))

    def test_additive_receipts_bind_exact_outputs_and_role_base(self) -> None:
        """Fails when: a selected collector or mapper receipt has stale bytes, output hashes, or role-base identity."""
        defects: list[str] = []
        for name, digest in ADDITIVE_RECEIPTS.items():
            path = _RECEIPTS_DIR / name
            receipt = _core.load_json(path)
            if _core.file_hash(path) != digest:
                defects.append(f"{name}:receipt-hash")
            if receipt.get("role_base_sha") != ADDITIVE_RECEIPT_ROLE_BASES[name]:
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


class BatchBBrowserContract(_v10.BatchBBrowserContract):
    """B4 exact WebBridge evidence and bounded-browser contracts."""


class BatchBAssetContract(_v10.BatchBAssetContract):
    """B4 exact asset-V2 denominator, source, and live-limit contracts."""


class BatchBCompletionContract(_v10.BatchBCompletionContract):
    """The disclosure-only owner disposition for the observed completion defect."""


class BatchBIndependentReviewContract(_v10.BatchBIndependentReviewContract):
    """B5 latest prior-review selection plus fail-closed fresh-review contracts."""

    def test_review_v4_binds_every_exact_active_additive_input(self) -> None:
        """Fails when: no fresh review binds every V11 input, both exact V11 outputs, and their descendant Git bindings."""
        inputs = _core.load_json(_core.REVIEW_RECEIPT_PATH).get("input_hashes", {})
        required = {
            relative: digest
            for relative, digest in ACTIVE_INPUT_HASHES.items()
            if relative not in {REVIEW_V5, REVIEW_RECEIPT_V5}
        }
        required[str(_V11_PATH.relative_to(_REPO_ROOT))] = _core.file_hash(_V11_PATH)
        required[str(_V11_RECEIPT_PATH.relative_to(_REPO_ROOT))] = _core.file_hash(_V11_RECEIPT_PATH)
        defects = [relative for relative, digest in required.items() if inputs.get(relative) != digest]
        defects.extend(
            f"{path.relative_to(_REPO_ROOT)}:no-descendant-binding"
            for path in (_V11_PATH, _V11_RECEIPT_PATH)
            if not _v10._v9._v8._has_exact_descendant_binding(path)
        )
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B5_FRESH_REVIEW_V11]: " + ", ".join(defects))


class BatchBAcceptanceContract(_v10.BatchBAcceptanceContract):
    """B5 candidate, approval, and accepted-manifest existence gates."""


if __name__ == "__main__":
    _core.unittest.main()
