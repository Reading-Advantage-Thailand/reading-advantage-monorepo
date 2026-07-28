"""Phase-1 falsification tests for the APK 27-to-29 denominator crosswalk."""

from __future__ import annotations

import copy
import importlib.util
import json
import sys
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_DIR = (
    REPO_ROOT
    / "measure"
    / "tracks"
    / "apk_denominator_readiness_t11_integrity_20260727"
)
FIXTURE_DIR = Path(__file__).parent / "fixtures" / "apk_denominator_readiness_phase1"
CROSSWALK_PATH = TRACK_DIR / "phase1-denominator-crosswalk.json"
REVIEW_CANDIDATE_PATH = TRACK_DIR / "phase1-independent-review-candidate.json"
VALIDATOR_PATH = TRACK_DIR / "validate_phase1_crosswalk.py"


def _load_json(path: Path) -> dict[str, Any]:
    """Loads a required JSON object.

    Args:
        path: JSON file to load.

    Returns:
        Parsed JSON object.
    """
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain a JSON object")
    return value


def _load_validator() -> Any:
    """Loads the planning-only Phase-1 crosswalk validator.

    Returns:
        Imported validator module.
    """
    spec = importlib.util.spec_from_file_location(
        "apk_denominator_readiness_phase1_validator", VALIDATOR_PATH
    )
    if spec is None or spec.loader is None:
        raise AssertionError(f"Unable to load validator: {VALIDATOR_PATH}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _mutate(control: dict[str, Any], fixture: dict[str, Any]) -> dict[str, Any]:
    """Applies one declared negative-fixture mutation.

    Args:
        control: Valid crosswalk control.
        fixture: Mutation declaration and expected rejection code.

    Returns:
        Mutated crosswalk copy.
    """
    payload = copy.deepcopy(control)
    mutation = fixture["mutation"]
    kind = mutation["kind"]
    rows = payload["assignments"]
    if kind == "duplicate-assignment":
        rows[mutation["target_assignment_index"]] = copy.deepcopy(
            rows[mutation["source_assignment_index"]]
        )
    elif kind == "missing-assignment":
        rows.pop(mutation["assignment_index"])
    elif kind == "unexplained-assignment":
        row = rows[mutation["assignment_index"]]
        row["classification"] = "unresolved"
        row["explanation"] = ""
        row["source_locator"] = None
        row["source_evidence"] = None
    else:
        raise AssertionError(f"Unknown fixture mutation: {kind}")
    return payload


class DenominatorCrosswalkPhase1Tests(unittest.TestCase):
    """Rejects duplicate, missing, unexplained, and falsely accepted crosswalks."""

    @classmethod
    def setUpClass(cls) -> None:
        """Loads the validator and candidate artifacts for focused checks."""
        cls.validator = _load_validator()
        cls.crosswalk = _load_json(CROSSWALK_PATH)
        cls.review_candidate = _load_json(REVIEW_CANDIDATE_PATH)

    def test_source_grounded_control_is_complete_but_downstream_blocked(self) -> None:
        """Accepts only the exact 27-to-29 crosswalk while preserving the block."""
        result = self.validator.validate_crosswalk(REPO_ROOT, self.crosswalk)
        self.assertEqual(
            result,
            {
                "ok": True,
                "source_identity_count": 27,
                "partition_assignment_count": 29,
                "historical_label_count": 2,
                "portfolio_status": "blocked",
            },
        )

    def test_duplicate_assignment_fixture_is_rejected(self) -> None:
        """Rejects a partition assignment that appears more than once."""
        fixture = _load_json(FIXTURE_DIR / "duplicate-assignment.json")
        result = self.validator.validate_crosswalk(
            REPO_ROOT, _mutate(self.crosswalk, fixture)
        )
        self.assertEqual(result["code"], fixture["expected_code"])

    def test_missing_assignment_fixture_is_rejected(self) -> None:
        """Rejects a crosswalk that omits an accepted partition assignment."""
        fixture = _load_json(FIXTURE_DIR / "missing-assignment.json")
        result = self.validator.validate_crosswalk(
            REPO_ROOT, _mutate(self.crosswalk, fixture)
        )
        self.assertEqual(result["code"], fixture["expected_code"])

    def test_unexplained_assignment_fixture_is_rejected(self) -> None:
        """Rejects an assignment without a supported classification and locator."""
        fixture = _load_json(FIXTURE_DIR / "unexplained-assignment.json")
        result = self.validator.validate_crosswalk(
            REPO_ROOT, _mutate(self.crosswalk, fixture)
        )
        self.assertEqual(result["code"], fixture["expected_code"])

    def test_review_artifact_is_candidate_only_and_cannot_authorize_downstream(self) -> None:
        """Prevents coordinator-authored review material from claiming acceptance."""
        result = self.validator.validate_review_candidate(
            REPO_ROOT, self.crosswalk, self.review_candidate
        )
        self.assertEqual(result, {"ok": True, "independent_acceptance": False})
        self.assertEqual(self.review_candidate["status"], "awaiting-independent-review")
        self.assertEqual(self.review_candidate["disposition"], "not-reviewed")
        self.assertEqual(self.review_candidate["downstream_authorization"], "blocked")


if __name__ == "__main__":
    unittest.main()
