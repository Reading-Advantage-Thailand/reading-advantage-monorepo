"""Fail-closed source-truth checks for T6 Puzzle Batch B.

These checks validate artifact shape and explicit unknowns only. They do not
promote source inspection into browser evidence or lifecycle acceptance.
"""
from __future__ import annotations

import json
import unittest
from pathlib import Path

TRACK = Path(__file__).resolve().parent


def load(path: str) -> dict:
    """Load one Batch B JSON artifact."""
    value = json.loads((TRACK / path).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(path)
    return value


class BatchBSourceTruth(unittest.TestCase):
    """Keep Batch B source evidence bounded and fail closed."""

    def test_discovery_freezes_three_games_without_inventing_astral_identity(self) -> None:
        """Require the exact three-game scope and unresolved Astral identity."""
        audit = load("batch-b-discovery-audit.json")
        self.assertEqual([g["display_name"] for g in audit["games"]], ["Potion Rush", "Rune Forge Chamber", "Astral Mage"])
        self.assertEqual(audit["games"][2]["normalized_game_id"], "unresolved-pending-independent-boundary-review")
        self.assertTrue(audit["source_only"])

    def test_each_ledger_has_source_citations_and_unknowns(self) -> None:
        """Require every game ledger to separate evidence from unknowns."""
        for slug in ("potion-rush", "rune-forge-chamber", "astral-mage"):
            ledger = load(f"batch-b/{slug}/claim-evidence-ledger.json")
            self.assertTrue(ledger["source_only"])
            self.assertTrue(ledger["claims"])
            self.assertTrue(ledger["unknowns"])
            self.assertEqual(ledger["acceptance"], "not-claimed")
            self.assertTrue(all("citation" in claim for claim in ledger["claims"]))

    def test_mapping_and_browser_artifacts_do_not_claim_product_success(self) -> None:
        """Reject accidental promotion of mappings or unperformed browser work."""
        mapping = load("batch-b-requirements-map.json")
        browser = load("batch-b-browser-audit.json")
        self.assertEqual(mapping["novel_factual_claims"], 0)
        self.assertFalse(browser["conducted"])
        self.assertEqual(browser["evidence_count"], 0)
        self.assertFalse(browser["screenshots_alone_pass"])
        self.assertEqual(browser["claims_authored"], 0)

    def test_no_candidate_or_owner_acceptance_is_present(self) -> None:
        """Keep lifecycle publication blocked until independent review passes."""
        for name in ("candidate-cohort-manifest-batch-b.json", "product-owner-acceptance-batch-b.json", "accepted-cohort-manifest-batch-b.json"):
            self.assertFalse((TRACK / name).exists(), name)


if __name__ == "__main__":
    unittest.main()
