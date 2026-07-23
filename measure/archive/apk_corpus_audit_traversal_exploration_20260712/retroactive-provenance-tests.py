"""Regression checks for T5's additive retroactive approval repair."""

from __future__ import annotations

import json
import unittest
from pathlib import Path


TRACK = Path(__file__).resolve().parent
AUDIT = TRACK / "retroactive-provenance-audit-v1.json"
SUPERSEDING_APPROVAL = TRACK / "product-owner-acceptance-batch-b-v3-retroactive.json"
CURRENT_APPROVAL = TRACK / "product-owner-acceptance-batch-c-v2-retroactive.json"


class RetroactiveProvenanceContract(unittest.TestCase):
    """Ensures the repair preserves historical evidence without inventing messages."""

    def test_retroactive_audit_is_additive_and_has_no_fabricated_message_id(self) -> None:
        """Requires a current authorization source and immutable chronology references."""
        audit = json.loads(AUDIT.read_text(encoding="utf-8"))
        self.assertTrue(audit["additive"])
        self.assertEqual(audit["authorization"]["message_id"], None)
        self.assertEqual(audit["authorization"]["source"], "current user instruction")
        self.assertEqual(audit["batch_b_ordered_approval_defect"]["status"], "corrected-by-supersession")

    def test_superseding_and_current_approvals_follow_their_candidates(self) -> None:
        """Requires explicitly retroactive approvals to bind the published candidate bytes."""
        batch_b = json.loads(SUPERSEDING_APPROVAL.read_text(encoding="utf-8"))
        batch_c = json.loads(CURRENT_APPROVAL.read_text(encoding="utf-8"))
        self.assertEqual(batch_b["approval_kind"], "retroactive-superseding-approval")
        self.assertEqual(batch_b["supersedes"]["path"], "product-owner-acceptance-batch-b-v2.json")
        self.assertEqual(batch_c["approval_kind"], "retroactive-approval")
        self.assertEqual(batch_c["candidate_commit_sha"], "bd39b8e0cffb813f045a3853eb4499f46e96d3ff")
        for approval in (batch_b, batch_c):
            self.assertIsNone(approval["authorization"]["message_id"])
            self.assertTrue(approval["ordered_after_candidate"])


if __name__ == "__main__":
    unittest.main()
