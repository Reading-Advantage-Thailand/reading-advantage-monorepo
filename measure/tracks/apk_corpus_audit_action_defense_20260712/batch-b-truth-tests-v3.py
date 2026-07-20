"""Additive Batch B truth-test supersession for population-bounded review sampling.

The v2 module and its receipt remain immutable. This module inherits every v2
contract, activates the v3 truth receipt, and replaces only the defective B5
sample-size assertion while preserving fail-closed review and acceptance gates.
"""

from __future__ import annotations

import importlib.util
import math
import sys
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = REPO_ROOT / "measure/tracks/apk_corpus_audit_action_defense_20260712"
RECEIPTS_DIR = TRACK_DIR / "role-receipts"
PHASE_BASE_SHA = "ff01cee9cc973dee89fdc0ba22102dcea0c50542"
ROLE_BASE_SHA = "02c7f7b4fd5c0b07531babacacde97a9dcf8d97b"
V2_TEST_PATH = TRACK_DIR / "batch-b-truth-tests-v2.py"
REVIEW_PATH = TRACK_DIR / "batch-b-adversarial-review.json"
LEDGER_PATHS = {
    "village-guardian": TRACK_DIR / "village-guardian-claim-ledger-batch-b.json",
    "archers-revenge": TRACK_DIR / "archers-revenge-claim-ledger-batch-b.json",
    "storm-castle-tower": TRACK_DIR / "storm-castle-tower-claim-ledger-batch-b.json",
}


def _load_v2_module() -> Any:
    """Loads the immutable v2 truth module under a private module name."""
    spec = importlib.util.spec_from_file_location("_batch_b_truth_tests_v2", V2_TEST_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Batch B v2 truth module cannot be loaded")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


_v2 = _load_v2_module()
_v1 = _v2._v1
_v1.CURRENT_RECEIPTS = tuple(
    "truth-test-author-batch-b-v3.json"
    if name == "truth-test-author-batch-b-v2.json"
    else name
    for name in _v1.CURRENT_RECEIPTS
)


def required_sample_size(population: int) -> int:
    """Returns the population-bounded ten-or-ten-percent review sample size."""
    if population < 0:
        raise ValueError("population must be non-negative")
    return min(population, max(10, math.ceil(population * 0.10)))


def _revision_class(claim: dict[str, Any]) -> str:
    """Classifies a claim revision as current-baseline or historical."""
    revision = claim.get("source_revision")
    if revision == _v1.SOURCE_BASELINE:
        return "current-baseline"
    return "historical"


def _evidence_type(claim: dict[str, Any]) -> str:
    """Classifies a claim envelope as text, binary, or bounded query evidence."""
    envelope = claim.get("inclusive_range")
    newline = str(claim.get("newline_convention", "")).lower()
    if (isinstance(envelope, dict) and envelope.get("kind") == "bytes") or "binary" in newline:
        return "binary"
    if not claim.get("relative_path") or envelope is None:
        return "bounded-query"
    return "text"


def _sample_defects(claims: list[dict[str, Any]], selected_ids: Any) -> tuple[int, list[str]]:
    """Returns the required sample size and fail-closed size/stratification defects."""
    population = len(claims)
    required = required_sample_size(population)
    defects: list[str] = []
    claim_ids = [claim.get("claim_id") for claim in claims]
    valid_claim_ids = {claim_id for claim_id in claim_ids if isinstance(claim_id, str)}

    if population == 0:
        defects.append("zero-population")
    if len(valid_claim_ids) != population:
        defects.append("invalid-or-duplicate-population-ids")
    if not isinstance(selected_ids, list) or any(not isinstance(item, str) for item in selected_ids):
        return required, defects + ["selected-ids-not-string-list"]

    selected_set = set(selected_ids)
    if len(selected_set) != len(selected_ids):
        defects.append("duplicate-selected-id")
    if selected_set - valid_claim_ids:
        defects.append("selected-id-outside-population")
    if len(selected_ids) < required:
        defects.append(f"sample<{required}")
    if population <= 10 and selected_set != valid_claim_ids:
        defects.append("low-population-not-exhaustive")

    selected_claims = [claim for claim in claims if claim.get("claim_id") in selected_set]
    dimensions = {
        "category": lambda claim: str(claim.get("category", "")),
        "revision-class": _revision_class,
        "evidence-type": _evidence_type,
    }
    for label, classifier in dimensions.items():
        population_values = {classifier(claim) for claim in claims}
        selected_values = {classifier(claim) for claim in selected_claims}
        missing = sorted(population_values - selected_values)
        if missing:
            defects.append(f"missing-{label}:{','.join(missing)}")
    return required, defects


class BatchBFreezeContract(_v2.BatchBFreezeContract):
    """B0 v2 freeze and active-discovery contracts inherited unchanged."""


class BatchBCollectorPackageContract(_v2.BatchBCollectorPackageContract):
    """B1 collector contracts inherited unchanged."""


class BatchBMapperPackageContract(_v2.BatchBMapperPackageContract):
    """B2 mapper contracts inherited unchanged."""


class BatchBClaimTruthContract(_v2.BatchBClaimTruthContract):
    """B3 claim contracts inherited unchanged."""


class BatchBNegativeFixtureContract(_v2.BatchBNegativeFixtureContract):
    """B3 negative-fixture contracts inherited unchanged."""


class BatchBReceiptContract(_v2.BatchBReceiptContract):
    """Receipt byte-binding and fail-closed provenance contracts inherited unchanged."""


class BatchBBrowserContract(_v2.BatchBBrowserContract):
    """B4 browser contracts inherited unchanged."""


class BatchBAssetContract(_v2.BatchBAssetContract):
    """B4 asset contracts inherited unchanged."""


class BatchBIndependentReviewContract(_v2.BatchBIndependentReviewContract):
    """B5 review contracts with population-bounded, stratified sampling."""

    def test_review_samples_every_game_and_has_zero_blockers(self) -> None:
        """Fails when: B5 omits/undersamples a population or stratum, omits fixtures, or leaves blocking findings."""
        review = _v1.load_json(REVIEW_PATH)
        self.assertIsInstance(review, dict, "EXPECTED_STAGE_RED[B5]: review unavailable")
        samples = review.get("samples", {})
        defects: list[str] = []
        for game, ledger_path in LEDGER_PATHS.items():
            ledger = _v1.load_json(ledger_path)
            claims = ledger.get("claims", []) if isinstance(ledger, dict) else []
            sample = samples.get(game, {}) if isinstance(samples, dict) else {}
            selected_ids = sample.get("selected_claim_ids", []) if isinstance(sample, dict) else []
            required, sample_defects = _sample_defects(claims, selected_ids)
            if sample.get("population") != len(claims):
                sample_defects.append("declared-population-mismatch")
            if len(claims) != _v1.FACTUAL_TOTALS[game]:
                sample_defects.append("frozen-population-mismatch")
            if len(sample.get("fixture_ids_rederived", [])) != 4:
                sample_defects.append("fixtures")
            defects.extend(f"{game}.{defect}" for defect in sample_defects)
            self.assertEqual(required, required_sample_size(len(claims)), game)

        severities = review.get("unresolved_findings", {})
        for severity in ("critical", "high", "medium"):
            if severities.get(severity) != 0:
                defects.append(f"unresolved.{severity}")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B5]: " + ", ".join(defects))

    def test_archers_revenge_low_population_requires_all_eight_claims(self) -> None:
        """Fails when: a population below ten can pass without selecting every available claim."""
        review = _v1.load_json(REVIEW_PATH)
        ledger = _v1.load_json(LEDGER_PATHS["archers-revenge"])
        self.assertIsInstance(review, dict, "EXPECTED_STAGE_RED[B5]: review unavailable")
        self.assertIsInstance(ledger, dict, "Archer claim ledger unavailable")
        claims = ledger.get("claims", [])
        selected_ids = review.get("samples", {}).get("archers-revenge", {}).get("selected_claim_ids", [])

        required, defects = _sample_defects(claims, selected_ids)
        self.assertEqual(required, 8)
        self.assertEqual(defects, [], f"Archer sample defects: {defects}")
        self.assertEqual(set(selected_ids), {claim.get("claim_id") for claim in claims})

        _, partial_defects = _sample_defects(claims, selected_ids[:-1])
        self.assertIn("low-population-not-exhaustive", partial_defects)


class BatchBAcceptanceContract(_v2.BatchBAcceptanceContract):
    """B5 acceptance contracts inherited unchanged and fail closed."""


if __name__ == "__main__":
    unittest.main()
