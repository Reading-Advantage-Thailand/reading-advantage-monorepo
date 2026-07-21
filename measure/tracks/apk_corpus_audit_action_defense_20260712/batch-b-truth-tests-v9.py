"""Batch B V9 truth contracts for the exact latest committed artifacts.

V9 retains V8's source, semantic, fixture, mapper, asset, bounded-browser,
completion-disclosure, review, and lifecycle contracts while selecting the
additive Archer collector V4 report and receipt.  Evidence and local receipt
integrity are green for the selected bytes; fresh review and lifecycle remain
fail-closed until their exact artifacts exist.
"""

from __future__ import annotations

import importlib.util
import inspect
from pathlib import Path
from typing import Any


_V9_PATH = Path(__file__).resolve()
_TRACK_DIR = _V9_PATH.parent
_REPO_ROOT = _V9_PATH.parents[3]
_RECEIPTS_DIR = _TRACK_DIR / "role-receipts"
_V8_PATH = _TRACK_DIR / "batch-b-truth-tests-v8.py"
_V9_RECEIPT_PATH = _RECEIPTS_DIR / "truth-test-author-batch-b-v9.json"

_spec = importlib.util.spec_from_file_location("batch_b_truth_v8_for_v9", _V8_PATH)
if _spec is None or _spec.loader is None:
    raise RuntimeError(f"Unable to load V8 truth contracts from {_V8_PATH}")
_v8 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_v8)
_core = _v8._core

PHASE_BASE_SHA = "ff01cee9cc973dee89fdc0ba22102dcea0c50542"
ROLE_BASE_SHA = "cd2d0faec2d15f1a5d50bee0da102bde58ce1daa"
GLOBAL_DIRECTION = "measure/product-owner-apk-provenance-direction-20260721.json"
ARCHER_REPORT_V4 = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/"
    "archers-revenge-evidence-final-report-batch-b-v4.json"
)
ARCHER_RECEIPT_V4 = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/"
    "evidence-collector-archers-revenge-batch-b-v4.json"
)

REPORT_RELATIVE = dict(_v8._v7.REPORT_RELATIVE)
REPORT_RELATIVE["archers-revenge"] = ARCHER_REPORT_V4

ACTIVE_INPUT_HASHES = dict(_v8.ACTIVE_INPUT_HASHES)
for _superseded_collector_path in (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-evidence-final-report-batch-b-v3.json",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-archers-revenge-batch-b-v3.json",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-archers-revenge-batch-b-v3-rebind.json",
):
    ACTIVE_INPUT_HASHES.pop(_superseded_collector_path)
ACTIVE_INPUT_HASHES.update(
    {
        "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-truth-tests-v8.py": "8fbcd51cdbf607b7be75d00cd2712ed93a09490614be13b4db361f5f2f32469e",
        "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/truth-test-author-batch-b-v8.json": "7840e08500ce585f27fd4e0c27a0f30e4caeca14e411a2661938e3f2abbbd41c",
        ARCHER_REPORT_V4: "5164b6391418638099499b3db75e154dc16b9e788bc96ec83da8559d222c782a",
        ARCHER_RECEIPT_V4: "78b4e1517c1c8271bd61485aa100be957e4240169721b28e187ab3afd8a36ad3",
    }
)

PINNED_RECEIPT_HASHES = dict(_v8.PINNED_RECEIPT_HASHES)
PINNED_RECEIPT_HASHES.pop("evidence-collector-archers-revenge-batch-b-v3.json")
PINNED_RECEIPT_HASHES.pop("evidence-collector-archers-revenge-batch-b-v3-rebind.json")
PINNED_RECEIPT_HASHES.update(
    {
        "evidence-collector-archers-revenge-batch-b-v4.json": "78b4e1517c1c8271bd61485aa100be957e4240169721b28e187ab3afd8a36ad3",
        "truth-test-author-batch-b-v8.json": "7840e08500ce585f27fd4e0c27a0f30e4caeca14e411a2661938e3f2abbbd41c",
    }
)
ACTIVE_RECEIPTS = (
    "discovery-auditor-batch-b-v2.json",
    "evidence-collector-village-guardian-batch-b-v3.json",
    "evidence-collector-archers-revenge-batch-b-v4.json",
    "evidence-collector-storm-castle-tower-batch-b.json",
    "requirements-mapper-village-guardian-batch-b-v3.json",
    "requirements-mapper-archers-revenge-batch-b-v4.json",
    "requirements-mapper-storm-castle-tower-batch-b.json",
    "browser-auditor-batch-b-v3.json",
    "asset-auditor-batch-b-v2.json",
    "adversarial-reviewer-batch-b-v4.json",
    "truth-test-author-batch-b-v9.json",
)

# Point every inherited contract at the V9-selected immutable inputs.
_v8.ROLE_BASE_SHA = ROLE_BASE_SHA
_v8.ACTIVE_INPUT_HASHES = ACTIVE_INPUT_HASHES
_v8.PINNED_RECEIPT_HASHES = PINNED_RECEIPT_HASHES
_v8.ACTIVE_RECEIPTS = ACTIVE_RECEIPTS
_v8._V8_PATH = _V9_PATH
_v8._V8_RECEIPT_PATH = _V9_RECEIPT_PATH
_v8._v7.ROLE_BASE_SHA = ROLE_BASE_SHA
_v8._v7.REPORT_RELATIVE = REPORT_RELATIVE
_v8._v7.ACTIVE_INPUT_HASHES = ACTIVE_INPUT_HASHES
_v8._v7.PINNED_RECEIPT_HASHES = PINNED_RECEIPT_HASHES
_v8._v7.ACTIVE_RECEIPTS = ACTIVE_RECEIPTS
_v8._v7._V7_PATH = _V9_PATH
_v8._v7._V7_RECEIPT_PATH = _V9_RECEIPT_PATH
_core.ROLE_BASE_SHA = ROLE_BASE_SHA
_core.REPORT_PATHS = {game: _REPO_ROOT / relative for game, relative in REPORT_RELATIVE.items()}
_core.COLLECTOR_RECEIPTS["archers-revenge"] = _REPO_ROOT / ARCHER_RECEIPT_V4
_core.ACTIVE_INPUT_HASHES = ACTIVE_INPUT_HASHES
_core.PINNED_RECEIPT_HASHES = PINNED_RECEIPT_HASHES
_core.ACTIVE_RECEIPTS = ACTIVE_RECEIPTS
_core.V6_PATH = _V9_PATH
_core.V6_RECEIPT_PATH = _V9_RECEIPT_PATH


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


class BatchBFreezeContract(_v8.BatchBFreezeContract):
    """B0 exact committed input, scope, predecessor, and direction contracts."""


class BatchBCollectorPackageContract(_v8.BatchBCollectorPackageContract):
    """B1 latest selected-package structure, counts, envelopes, and coverage."""

    def test_denominator_and_disc_001_boundaries_are_preserved(self) -> None:
        """Fails when: denominator coverage drifts or Archer V4 loses the predecessor's process-only DISC-001 boundary."""
        village = _core.load_json(_core.LEDGER_PATHS["village-guardian"])["denominator_reconciliation"]
        archer = _core.load_json(_core.LEDGER_PATHS["archers-revenge"])["denominator_reconciliation"]
        storm = _core.load_json(_core.LEDGER_PATHS["storm-castle-tower"])["counts"]
        self.assertEqual((village["assigned_items"], village["covered_items"], village["unassigned_items"], village["duplicate_items"]), (16, 16, [], []))
        self.assertIn("three baseline binary candidates", archer["assets"])
        self.assertEqual((storm["denominator_mismatches"], storm["unsupported_accepted_claims"]), (0, 0))

        report = _load_json(ARCHER_REPORT_V4)
        predecessor = report["collector_report_predecessor"]
        self.assertEqual(
            predecessor,
            {
                "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-evidence-final-report-batch-b-v3.json",
                "sha256": "c21897fb4c7d80fbb3141d8c37a87a31e9ac4881e1ef7bb021ebdd273dd2555c",
            },
        )
        predecessor_document = _load_json(predecessor["path"])
        self.assertEqual(predecessor_document["carried_forward_disclosures"][0]["id"], "DISC-001")
        self.assertIn("Metadata and provenance-boundary correction only", report["supersession"]["scope_limit"])


class BatchBMapperPackageContract(_v8.BatchBMapperPackageContract):
    """B2 exact Village V3, Archer mapper V4, and Storm mapper contracts."""


class BatchBClaimTruthContract(_v8.BatchBClaimTruthContract):
    """B3 independent all-claim source-semantic contracts."""

    def test_every_test_has_an_explicit_fails_when_contract(self) -> None:
        """Fails when: any V9 truth test lacks an auditable `Fails when:` condition."""
        missing: list[str] = []
        module = __import__(__name__)
        for _, cls in inspect.getmembers(module, inspect.isclass):
            if cls.__module__ != __name__ or not cls.__name__.startswith("BatchB"):
                continue
            for name, method in inspect.getmembers(cls, inspect.isfunction):
                if name.startswith("test_") and "Fails when:" not in (inspect.getdoc(method) or ""):
                    missing.append(f"{cls.__name__}.{name}")
        self.assertEqual(missing, [])


class BatchBNegativeFixtureContract(_v8.BatchBNegativeFixtureContract):
    """B3 all-fixture envelope and independent-refutation contracts."""


class BatchBReceiptContract(_v8.BatchBReceiptContract):
    """Exact local receipt and corrected Archer provenance-boundary contracts."""

    def test_receipt_output_hashes_bind_current_exact_bytes(self) -> None:
        """Fails when: any selected receipt has no output binding or binds stale, missing, or malformed output bytes."""
        defects: list[str] = []
        for name in ACTIVE_RECEIPTS:
            receipt = _core.load_json(_RECEIPTS_DIR / name)
            bindings = _receipt_output_bindings(receipt)
            if not bindings:
                defects.append(f"{name}:zero-bindings")
            for relative, digest in bindings:
                if relative == f"measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/{name}" and digest is None:
                    continue
                if not isinstance(digest, str) or not _core.HEX64.fullmatch(digest):
                    defects.append(f"{name}:{relative}:bad-hash")
                elif not (_REPO_ROOT / relative).is_file() or _core.file_hash(_REPO_ROOT / relative) != digest:
                    defects.append(f"{name}:{relative}:byte-mismatch")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[STALE_RECEIPT]: " + ", ".join(defects))

    def test_v6_receipt_binds_exact_test_bytes_and_role_base(self) -> None:
        """Fails when: the V9 receipt selects another role, base, input set, or test output bytes."""
        receipt = _core.load_json(_V9_RECEIPT_PATH)
        self.assertEqual(receipt.get("role"), "truth-test-author-batch-b-v9")
        self.assertEqual(receipt.get("role_base_sha"), ROLE_BASE_SHA)
        self.assertEqual(receipt.get("input_hashes"), ACTIVE_INPUT_HASHES)
        binding = next(
            (item for item in _receipt_output_bindings(receipt) if item[0] == str(_V9_PATH.relative_to(_REPO_ROOT))),
            None,
        )
        self.assertIsNotNone(binding)
        self.assertEqual(binding[1], _core.file_hash(_V9_PATH))

    def test_latest_artifacts_bind_the_correct_owner_provenance_direction(self) -> None:
        """Fails when: Archer V4 treats WebBridge as source/provider authority or does not supersede the exact V3 report and receipt."""
        self.assertEqual(_load_json(GLOBAL_DIRECTION).get("decision"), "LOCAL_VERIFIABLE_RECEIPTS_ACCEPTED_WITH_DISCLOSURE")
        report = _load_json(ARCHER_REPORT_V4)
        receipt = _load_json(ARCHER_RECEIPT_V4)
        self.assertEqual(report["collector_id"], "evidence-collector-archers-revenge-batch-b-v4")
        self.assertIn("Only the exact Git source envelopes", report["source_fact_authority"]["rule"])
        self.assertIn("bounded browser evidence only", report["browser_evidence_boundary"]["rule"])
        self.assertIn("never provider provenance or source authority", receipt["provenance_model"]["webbridge"])
        self.assertEqual(report["owner_provenance_direction"]["path"], GLOBAL_DIRECTION)
        self.assertEqual(receipt["provenance_model"]["owner_direction"]["path"], GLOBAL_DIRECTION)
        self.assertEqual(report["supersession"]["supersedes_report"], "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-evidence-final-report-batch-b-v3.json")
        self.assertEqual(receipt["supersession"]["supersedes_receipt_path"], "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-archers-revenge-batch-b-v3-rebind.json")


class BatchBBrowserContract(_v8.BatchBBrowserContract):
    """B4 exact WebBridge evidence and bounded-browser contracts."""


class BatchBAssetContract(_v8.BatchBAssetContract):
    """B4 exact asset-V2 denominator, source, and live-limit contracts."""


class BatchBCompletionContract(_v8.BatchBCompletionContract):
    """The disclosure-only owner disposition for the observed completion defect."""

    def test_http_400_is_disclosed_without_automatically_blocking_evidence_only_candidate(self) -> None:
        """Fails when: HTTP 400 is hidden, promoted to success, or used for anything beyond mandatory disclosure and successor transfer."""
        super().test_http_400_is_disclosed_without_automatically_blocking_evidence_only_candidate()
        direction = _load_json(_v8.COMPLETION_DIRECTION)
        self.assertEqual(direction["decision"], "CONDITIONAL_EVIDENCE_ACCEPTANCE_WITH_SUCCESSOR_DEFECT_TRANSFER")
        self.assertIn("mandatory carry-forward disclosure", direction["disposition"])
        self.assertIn("not evidence of successful completion", direction["disposition"])


class BatchBIndependentReviewContract(_v8.BatchBIndependentReviewContract):
    """B5 exact prior-review selection plus fail-closed fresh-review contracts."""

    def test_review_v4_binds_every_exact_active_additive_input(self) -> None:
        """Fails when: no fresh review binds every V9-selected input, both exact V9 outputs, and their descendant Git bindings."""
        inputs = _core.load_json(_core.REVIEW_RECEIPT_PATH).get("input_hashes", {})
        required = {
            relative: digest
            for relative, digest in ACTIVE_INPUT_HASHES.items()
            if relative not in {
                str(_core.REVIEW_PATH.relative_to(_REPO_ROOT)),
                str(_core.REVIEW_RECEIPT_PATH.relative_to(_REPO_ROOT)),
            }
        }
        required[str(_V9_PATH.relative_to(_REPO_ROOT))] = _core.file_hash(_V9_PATH)
        required[str(_V9_RECEIPT_PATH.relative_to(_REPO_ROOT))] = _core.file_hash(_V9_RECEIPT_PATH)
        defects = [relative for relative, digest in required.items() if inputs.get(relative) != digest]
        defects.extend(
            f"{path.relative_to(_REPO_ROOT)}:no-descendant-binding"
            for path in (_V9_PATH, _V9_RECEIPT_PATH)
            if not _v8._has_exact_descendant_binding(path)
        )
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B5_FRESH_REVIEW_V9]: " + ", ".join(defects))


class BatchBAcceptanceContract(_v8.BatchBAcceptanceContract):
    """B5 candidate, approval, and accepted-manifest existence gates."""


if __name__ == "__main__":
    _core.unittest.main()
