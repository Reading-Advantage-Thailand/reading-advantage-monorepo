"""Batch B V12 truth contracts for the current Village mapper lineage.

V12 retains V11's exact source, semantic, fixture, asset, bounded-browser,
completion-disposition, review, and lifecycle contracts. It selects the
Village mapper report V5 and mapper receipt V6, both bound to the corrected
Village denominator reconciliation V5. Evidence gates are expected green;
fresh review and lifecycle remain fail-closed.
"""

from __future__ import annotations

import importlib.util
import inspect
from pathlib import Path
from typing import Any


_V12_PATH = Path(__file__).resolve()
_TRACK_DIR = _V12_PATH.parent
_REPO_ROOT = _V12_PATH.parents[3]
_RECEIPTS_DIR = _TRACK_DIR / "role-receipts"
_V11_PATH = _TRACK_DIR / "batch-b-truth-tests-v11.py"
_V12_RECEIPT_PATH = _RECEIPTS_DIR / "truth-test-author-batch-b-v12.json"

_spec = importlib.util.spec_from_file_location("batch_b_truth_v11_for_v12", _V11_PATH)
if _spec is None or _spec.loader is None:
    raise RuntimeError(f"Unable to load V11 truth contracts from {_V11_PATH}")
_v11 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_v11)
_core = _v11._core

PHASE_BASE_SHA = "ff01cee9cc973dee89fdc0ba22102dcea0c50542"
ROLE_BASE_SHA = "05248bed054678a41559b50a6d52cc2a0c610084"
VILLAGE_RECONCILIATION_V4 = _v11.VILLAGE_RECONCILIATION_V4
VILLAGE_RECONCILIATION_V5 = _v11.DENOMINATOR_RELATIVE["village-guardian"]
VILLAGE_MAPPER_REPORT_V4 = _v11.MAPPER_REPORT_RELATIVE["village-guardian"]
VILLAGE_MAPPER_REPORT_V5 = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/"
    "village-guardian-mapper-final-report-batch-b-v5.json"
)
VILLAGE_MAPPER_RECEIPT_V5 = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/"
    "requirements-mapper-village-guardian-batch-b-v5.json"
)
VILLAGE_MAPPER_RECEIPT_V6 = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/"
    "requirements-mapper-village-guardian-batch-b-v6.json"
)
REVIEW_V5 = _v11.REVIEW_V5
REVIEW_RECEIPT_V5 = _v11.REVIEW_RECEIPT_V5
REVIEW_V6 = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/"
    "batch-b-adversarial-review-v6.json"
)
REVIEW_RECEIPT_V6 = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/"
    "adversarial-reviewer-batch-b-v6.json"
)

DENOMINATOR_RELATIVE = dict(_v11.DENOMINATOR_RELATIVE)
MAPPER_RELATIVE = dict(_v11.MAPPER_RELATIVE)
MAPPER_REPORT_RELATIVE = dict(_v11.MAPPER_REPORT_RELATIVE)
MAPPER_REPORT_RELATIVE["village-guardian"] = VILLAGE_MAPPER_REPORT_V5
MAPPER_DENOMINATOR_RELATIVE = {
    "village-guardian": VILLAGE_RECONCILIATION_V5,
    "archers-revenge": DENOMINATOR_RELATIVE["archers-revenge"],
}
MAPPER_REPORT_ROLE_BASES = {
    "village-guardian": "a8447bda00bba17d467bb4ab7000cb4604267ef3",
    "archers-revenge": "134a94bc451f84e2a75ef18a8cbbe7382bd3395c",
}

ADDITIVE_RECEIPTS = dict(_v11.ADDITIVE_RECEIPTS)
ADDITIVE_RECEIPTS.pop("requirements-mapper-village-guardian-batch-b-v5.json")
ADDITIVE_RECEIPTS["requirements-mapper-village-guardian-batch-b-v6.json"] = (
    "c365a947e9e758a1c348ccd7812fc775be42d05a752cf41878167d41bcb16288"
)
ADDITIVE_RECEIPT_ROLE_BASES = dict(_v11.ADDITIVE_RECEIPT_ROLE_BASES)
ADDITIVE_RECEIPT_ROLE_BASES.pop("requirements-mapper-village-guardian-batch-b-v5.json")
ADDITIVE_RECEIPT_ROLE_BASES["requirements-mapper-village-guardian-batch-b-v6.json"] = (
    "a8447bda00bba17d467bb4ab7000cb4604267ef3"
)

ACTIVE_INPUT_HASHES = dict(_v11.ACTIVE_INPUT_HASHES)
for _superseded_path in (
    VILLAGE_MAPPER_REPORT_V4,
    VILLAGE_MAPPER_RECEIPT_V5,
    REVIEW_V5,
    REVIEW_RECEIPT_V5,
):
    ACTIVE_INPUT_HASHES.pop(_superseded_path)
ACTIVE_INPUT_HASHES.update(
    {
        "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-truth-tests-v11.py": "ec503b332a2d2ffea5f82d8541aa612456bb8a6c7810a06db495f4fbc067fed9",
        "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/truth-test-author-batch-b-v11.json": "f9e948146c271fe3be4f5a7cbb153c31517ce108553936a2502836abb7b00af9",
        VILLAGE_MAPPER_REPORT_V5: "88239323b810800d30aaf9570b2f47152397fe99e8f0be92dc46cf45fa546085",
        VILLAGE_MAPPER_RECEIPT_V6: ADDITIVE_RECEIPTS["requirements-mapper-village-guardian-batch-b-v6.json"],
        REVIEW_V6: "93268bda281bf64342daaad804d0ea452207c0f6f0ba81a212f701e90e9c9ca3",
        REVIEW_RECEIPT_V6: "6690616485ed9740144be548efb9cc358214ef5ae9c9b4ff1d30fae691094040",
    }
)

PINNED_RECEIPT_HASHES = dict(_v11.PINNED_RECEIPT_HASHES)
PINNED_RECEIPT_HASHES.update(ADDITIVE_RECEIPTS)
PINNED_RECEIPT_HASHES.update(
    {
        "adversarial-reviewer-batch-b-v6.json": ACTIVE_INPUT_HASHES[REVIEW_RECEIPT_V6],
        "truth-test-author-batch-b-v11.json": ACTIVE_INPUT_HASHES[
            "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/truth-test-author-batch-b-v11.json"
        ],
    }
)
ACTIVE_RECEIPTS = (
    "discovery-auditor-batch-b-v2.json",
    "evidence-collector-village-guardian-batch-b-v3.json",
    "evidence-collector-village-guardian-batch-b-v5.json",
    "evidence-collector-archers-revenge-batch-b-v4.json",
    "evidence-collector-archers-revenge-batch-b-v5.json",
    "evidence-collector-storm-castle-tower-batch-b.json",
    "requirements-mapper-village-guardian-batch-b-v3.json",
    "requirements-mapper-village-guardian-batch-b-v6.json",
    "requirements-mapper-archers-revenge-batch-b-v4.json",
    "requirements-mapper-archers-revenge-batch-b-v6.json",
    "requirements-mapper-storm-castle-tower-batch-b.json",
    "browser-auditor-batch-b-v3.json",
    "asset-auditor-batch-b-v2.json",
    "adversarial-reviewer-batch-b-v6.json",
    "truth-test-author-batch-b-v12.json",
)

# Point every inherited contract at the exact V12-selected immutable inputs.
_modules = (
    _v11,
    _v11._v10,
    _v11._v10._v9,
    _v11._v10._v9._v8,
    _v11._v10._v9._v8._v7,
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
_v11.DENOMINATOR_RELATIVE = DENOMINATOR_RELATIVE
_v11.MAPPER_DENOMINATOR_RELATIVE = MAPPER_DENOMINATOR_RELATIVE
_v11.ADDITIVE_RECEIPTS = ADDITIVE_RECEIPTS
_v11.ADDITIVE_RECEIPT_ROLE_BASES = ADDITIVE_RECEIPT_ROLE_BASES
_v11.REVIEW_V5 = REVIEW_V6
_v11.REVIEW_RECEIPT_V5 = REVIEW_RECEIPT_V6
_v11._v10.REVIEW_V5 = REVIEW_V6
_v11._v10.REVIEW_RECEIPT_V5 = REVIEW_RECEIPT_V6
_v11._V11_PATH = _V12_PATH
_v11._V11_RECEIPT_PATH = _V12_RECEIPT_PATH
_v11._v10._V10_PATH = _V12_PATH
_v11._v10._V10_RECEIPT_PATH = _V12_RECEIPT_PATH
_v11._v10._v9._V9_PATH = _V12_PATH
_v11._v10._v9._V9_RECEIPT_PATH = _V12_RECEIPT_PATH
_v11._v10._v9._v8._V8_PATH = _V12_PATH
_v11._v10._v9._v8._V8_RECEIPT_PATH = _V12_RECEIPT_PATH
_v11._v10._v9._v8._v7._V7_PATH = _V12_PATH
_v11._v10._v9._v8._v7._V7_RECEIPT_PATH = _V12_RECEIPT_PATH
_core.V6_PATH = _V12_PATH
_core.V6_RECEIPT_PATH = _V12_RECEIPT_PATH
_core.REVIEW_PATH = _REPO_ROOT / REVIEW_V6
_core.REVIEW_RECEIPT_PATH = _REPO_ROOT / REVIEW_RECEIPT_V6


def _load_json(relative: str) -> dict[str, Any]:
    """Loads one repository-relative JSON object.

    @param relative Repository-relative artifact path.
    @returns The parsed JSON object.
    """
    return _core.load_json(_REPO_ROOT / relative)


class BatchBFreezeContract(_v11.BatchBFreezeContract):
    """B0 exact committed V12 input, scope, predecessor, and direction contracts."""


class BatchBCollectorPackageContract(_v11.BatchBCollectorPackageContract):
    """B1 source truth plus exact accepted-denominator reconciliation contracts."""


class BatchBMapperPackageContract(_v11.BatchBMapperPackageContract):
    """B2 exact factual blueprint and current denominator-mapper lineage contracts."""

    def test_mappers_bind_every_exact_active_claim_id(self) -> None:
        """Fails when: an active map loses a claim or its current report and selected reconciliation lineage disagree."""
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
            reconciliation = MAPPER_DENOMINATOR_RELATIVE[game]
            binding = report.get("denominator_reconciliation", {})
            if binding.get("path") != reconciliation:
                defects.append(f"{game}:denominator-path")
            if binding.get("sha256") != _core.file_hash(_REPO_ROOT / reconciliation):
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
            if report.get("role_base_sha") != MAPPER_REPORT_ROLE_BASES[game]:
                defects.append(f"{game}:role-base")
            if "never provider provenance or source authority" not in report.get("webbridge_authority", ""):
                defects.append(f"{game}:webbridge-authority")

        village = _load_json(VILLAGE_RECONCILIATION_V5)
        if village.get("supersession", {}).get("supersedes_report") != VILLAGE_RECONCILIATION_V4:
            defects.append("village-guardian:v5-predecessor")
        receipt = _load_json(VILLAGE_MAPPER_RECEIPT_V6)
        if receipt.get("supersession", {}).get("supersedes_receipt") != VILLAGE_MAPPER_RECEIPT_V5:
            defects.append("village-guardian:v6-receipt-predecessor")
        if receipt.get("role") != "requirements-mapper-village-guardian-batch-b-v6":
            defects.append("village-guardian:v6-receipt-role")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B2_CURRENT_MAPPER_BINDING]: " + ", ".join(defects))


class BatchBClaimTruthContract(_v11.BatchBClaimTruthContract):
    """B3 independent all-claim source-semantic contracts."""

    def test_every_test_has_an_explicit_fails_when_contract(self) -> None:
        """Fails when: any V12 truth test lacks an auditable `Fails when:` condition."""
        missing: list[str] = []
        module = __import__(__name__)
        for _, cls in inspect.getmembers(module, inspect.isclass):
            if cls.__module__ != __name__ or not cls.__name__.startswith("BatchB"):
                continue
            for name, method in inspect.getmembers(cls, inspect.isfunction):
                if name.startswith("test_") and "Fails when:" not in (inspect.getdoc(method) or ""):
                    missing.append(f"{cls.__name__}.{name}")
        self.assertEqual(missing, [])


class BatchBNegativeFixtureContract(_v11.BatchBNegativeFixtureContract):
    """B3 all-fixture envelope and independent-refutation contracts."""


class BatchBReceiptContract(_v11.BatchBReceiptContract):
    """Exact local receipt, current supersession, and provider-disclosure contracts."""

    def test_v6_receipt_binds_exact_test_bytes_and_role_base(self) -> None:
        """Fails when: the V12 receipt selects another role, base, input set, or truth-test bytes."""
        receipt = _core.load_json(_V12_RECEIPT_PATH)
        self.assertEqual(receipt.get("role"), "truth-test-author-batch-b-v12")
        self.assertEqual(receipt.get("role_base_sha"), ROLE_BASE_SHA)
        self.assertEqual(receipt.get("input_hashes"), ACTIVE_INPUT_HASHES)
        binding = next(
            (item for item in _v11._receipt_output_bindings(receipt) if item[0] == str(_V12_PATH.relative_to(_REPO_ROOT))),
            None,
        )
        self.assertIsNotNone(binding)
        self.assertEqual(binding[1], _core.file_hash(_V12_PATH))


class BatchBBrowserContract(_v11.BatchBBrowserContract):
    """B4 exact WebBridge evidence and bounded-browser contracts."""

    def test_all_direction_non_waived_gates_and_review_limits_are_retained(self) -> None:
        """Fails when: B4 waives an integrity gate or review V6 broadens bounded browser or completion evidence."""
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
        limits = _load_json(REVIEW_V6)["owner_directions_and_limits"]
        browser_limit = limits["webbridge"]["application"]
        completion = limits["completion"]
        self.assertIn("isTrusted=false", browser_limit)
        self.assertIn("hidden-tab", browser_limit)
        self.assertIn("404s", browser_limit)
        self.assertIn("HTTP 400", completion["finding"])
        self.assertIn("no successful completion", completion["disposition"])


class BatchBAssetContract(_v11.BatchBAssetContract):
    """B4 exact asset-V2 denominator, source, and live-limit contracts."""


class BatchBCompletionContract(_v11.BatchBCompletionContract):
    """The disclosure-only owner disposition for the observed completion defect."""


class BatchBIndependentReviewContract(_v11.BatchBIndependentReviewContract):
    """B5 latest prior-review selection plus fail-closed fresh-review contracts."""

    def test_review_v4_and_receipt_are_exact_committed_selected_inputs(self) -> None:
        """Fails when: V12 does not select exact committed review V6 and its matching receipt as the review predecessor."""
        review_path = _REPO_ROOT / REVIEW_V6
        receipt_path = _REPO_ROOT / REVIEW_RECEIPT_V6
        self.assertEqual(_core.file_hash(review_path), ACTIVE_INPUT_HASHES[REVIEW_V6])
        self.assertEqual(_core.file_hash(receipt_path), ACTIVE_INPUT_HASHES[REVIEW_RECEIPT_V6])
        self.assertEqual(review_path.read_bytes(), _core.git_show("a8447bda00bba17d467bb4ab7000cb4604267ef3", REVIEW_V6))
        review = _core.load_json(review_path)
        receipt = _core.load_json(receipt_path)
        self.assertEqual(review["role"], "adversarial-reviewer-batch-b-v6")
        self.assertEqual(review["audited_head_sha"], receipt["audited_head_sha"])

    def test_review_v4_binds_every_exact_active_additive_input(self) -> None:
        """Fails when: no fresh review binds every V12 input, both exact V12 outputs, and their descendant Git bindings."""
        inputs = _core.load_json(_core.REVIEW_RECEIPT_PATH).get("input_hashes", {})
        required = {
            relative: digest
            for relative, digest in ACTIVE_INPUT_HASHES.items()
            if relative not in {REVIEW_V6, REVIEW_RECEIPT_V6}
        }
        required[str(_V12_PATH.relative_to(_REPO_ROOT))] = _core.file_hash(_V12_PATH)
        required[str(_V12_RECEIPT_PATH.relative_to(_REPO_ROOT))] = _core.file_hash(_V12_RECEIPT_PATH)
        defects = [relative for relative, digest in required.items() if inputs.get(relative) != digest]
        defects.extend(
            f"{path.relative_to(_REPO_ROOT)}:no-descendant-binding"
            for path in (_V12_PATH, _V12_RECEIPT_PATH)
            if not _v11._v10._v9._v8._has_exact_descendant_binding(path)
        )
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B5_FRESH_REVIEW_V12]: " + ", ".join(defects))


class BatchBAcceptanceContract(_v11.BatchBAcceptanceContract):
    """B5 candidate, approval, and accepted-manifest existence gates."""


if __name__ == "__main__":
    _core.unittest.main()
