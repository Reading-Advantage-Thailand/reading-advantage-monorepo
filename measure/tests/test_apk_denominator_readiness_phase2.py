"""Phase-2 falsification tests for the APK planning-only readiness receipt."""

from __future__ import annotations

import copy
import importlib.util
import json
import sys
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / "apk_denominator_readiness_t11_integrity_20260727"
FIXTURE_DIR = Path(__file__).parent / "fixtures" / "apk_denominator_readiness_phase2"
RECEIPT_PATH = TRACK_DIR / "phase2-readiness-candidate-receipt.json"
VALIDATOR_PATH = TRACK_DIR / "validate_phase2_readiness.py"


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
    """Loads the planning-only Phase-2 readiness validator.

    Returns:
        Imported validator module.
    """
    spec = importlib.util.spec_from_file_location("apk_denominator_readiness_phase2_validator", VALIDATOR_PATH)
    if spec is None or spec.loader is None:
        raise AssertionError(f"Unable to load validator: {VALIDATOR_PATH}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _mutate(control: dict[str, Any], fixture: dict[str, Any]) -> dict[str, Any]:
    """Applies one declared readiness counterexample mutation.

    Args:
        control: Valid planning receipt control.
        fixture: Mutation declaration and expected rejection code.

    Returns:
        Mutated receipt copy.
    """
    payload = copy.deepcopy(control)
    mutation = fixture["mutation"]
    kind = mutation["kind"]
    if kind == "replace-hash":
        payload["archive_bindings"][mutation["binding"]]["sha256"] = mutation["value"]
    elif kind == "set-revoked":
        payload["archive_bindings"]["t10_accepted_manifest"]["revocation_state"] = "revoked"
    elif kind == "remove-hash":
        del payload["archive_bindings"][mutation["binding"]]["sha256"]
    elif kind == "waive-disclosure":
        payload["disclosures"][mutation["gap"]]["status"] = "waived"
    elif kind == "remove-evidence":
        del payload["evidence"][mutation["evidence"]]
    elif kind == "remove-host-proof":
        del payload["evidence"]["host_proofs"][mutation["host"]]
    else:
        raise AssertionError(f"Unknown fixture mutation: {kind}")
    return payload


class ReadinessPhase2Tests(unittest.TestCase):
    """Rejects incomplete, stale, waived, or prematurely consumable readiness receipts."""

    @classmethod
    def setUpClass(cls) -> None:
        """Loads the candidate receipt and planning validator."""
        cls.validator = _load_validator()
        cls.receipt = _load_json(RECEIPT_PATH)

    def test_complete_candidate_is_planning_only_and_non_consumable_without_crosswalk_acceptance(self) -> None:
        """Preserves the crosswalk owner-acceptance block despite complete cohort evidence."""
        result = self.validator.validate_readiness(REPO_ROOT, self.receipt)
        self.assertEqual(result, {"ok": True, "ready": False, "consumable": False, "blocker": "CROSSWALK_OWNER_ACCEPTANCE_ABSENT"})
        self.assertFalse(self.receipt["consumable"])
        self.assertEqual(self.receipt["crosswalk_product_owner_acceptance"], "absent")

    def test_declared_counterexamples_are_rejected(self) -> None:
        """Rejects every required T10/T11, adoption, host, and retirement counterexample."""
        for fixture_path in sorted(FIXTURE_DIR.glob("*.json")):
            with self.subTest(fixture=fixture_path.name):
                fixture = _load_json(fixture_path)
                result = self.validator.validate_readiness(REPO_ROOT, _mutate(self.receipt, fixture))
                self.assertFalse(result["ok"])
                self.assertEqual(result["code"], fixture["expected_code"])


if __name__ == "__main__":
    unittest.main()
