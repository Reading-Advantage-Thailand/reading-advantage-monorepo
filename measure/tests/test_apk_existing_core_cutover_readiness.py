"""Readiness-receipt integrity checks for the existing core APK cohort."""

from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
RECEIPT_PATH = (
    REPO_ROOT
    / "measure/archive/apk_denominator_readiness_t11_integrity_20260727"
    / "accepted-readiness-receipt-v1.json"
)
EXPECTED_RECEIPT_SHA256 = "d371fc5df05922d5f1bbb50b837c0fd5314d8f136e2c699510c84186447f1720"
EXPECTED_CORE_SCOPE = [
    "Dragon Flight",
    "Magic Defense",
    "Dungeon Liberator",
    "The Sorcerer's Ziggurat",
    "Astral Mage",
]


def _load_receipt() -> dict[str, Any]:
    """Loads the accepted readiness receipt as a JSON object.

    Returns:
        The parsed receipt.
    """
    value = json.loads(RECEIPT_PATH.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError("Accepted readiness receipt must be a JSON object")
    return value


class ExistingCoreReadinessReceiptTests(unittest.TestCase):
    """Pins the accepted planning receipt before any cohort implementation is trusted."""

    def test_receipt_bytes_and_authorization_scope_are_exact(self) -> None:
        """Accepts only the immutable receipt that authorizes precisely the five core titles."""
        receipt_bytes = RECEIPT_PATH.read_bytes()
        receipt = _load_receipt()

        self.assertEqual(hashlib.sha256(receipt_bytes).hexdigest(), EXPECTED_RECEIPT_SHA256)
        self.assertEqual(receipt["status"], "accepted")
        self.assertEqual(receipt["revocation_state"], "active")
        self.assertEqual(
            receipt["downstream_authorization"]["authorized_child_cohorts"]
            ["apk_existing_core_cutover_20260727"],
            EXPECTED_CORE_SCOPE,
        )
        self.assertEqual(receipt["crosswalk_governance"]["source_identity_count"], 27)
        self.assertEqual(receipt["crosswalk_governance"]["partition_assignment_count"], 29)
        self.assertFalse(receipt["readiness_governance"]["any_cohort_currently_ready_by_this_receipt"])
        self.assertFalse(receipt["readiness_governance"]["any_cartridge_cutover_authorized_by_this_receipt"])


if __name__ == "__main__":
    unittest.main()
