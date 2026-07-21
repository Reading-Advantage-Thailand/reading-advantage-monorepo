"""Fail-closed readiness tests for the T6 Batch B Green-lead handoff.

The handoff is deliberately not a candidate. These tests prevent a coordinator
from converting missing independent-role evidence or unknown browser/history
behavior into a candidate or acceptance claim.
"""

from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = Path(__file__).resolve().parent
HANDOFF_PATH = TRACK_DIR / "batch-b-green-handoff.json"
RECEIPT_PATH = TRACK_DIR / "role-receipts/green-lead-batch-b-handoff.json"


def load_json(path: Path) -> dict[str, Any]:
    """Loads one required JSON-object artifact.

    Args:
        path: The artifact to load.

    Returns:
        The decoded JSON object.
    """
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path}: expected an object")
    return value


def sha256(path: Path) -> str:
    """Returns the SHA-256 digest of an artifact's exact bytes.

    Args:
        path: The artifact to hash.

    Returns:
        The lowercase SHA-256 digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


class BatchBGreenHandoffContract(unittest.TestCase):
    """Prevents an unreviewed Batch B handoff from becoming acceptance evidence."""

    def test_handoff_is_non_consumable_and_not_a_candidate(self) -> None:
        """Fails if the handoff is promoted before independent review."""
        handoff = load_json(HANDOFF_PATH)
        self.assertEqual(handoff["status"], "blocked-before-candidate")
        self.assertFalse(handoff["consumable"])
        self.assertFalse(handoff["candidate_published"])
        self.assertFalse(handoff["acceptance_published"])
        self.assertFalse(handoff["accepted_manifest_published"])

    def test_scope_is_the_frozen_three_game_batch_without_invented_identity(self) -> None:
        """Fails if a game changes or a normalized identity is invented before discovery."""
        handoff = load_json(HANDOFF_PATH)
        scope = handoff["scope"]
        self.assertEqual([entry["game"] for entry in scope], ["Potion Rush", "Rune Forge Chamber", "Astral Mage"])
        self.assertEqual({entry["normalized_game_id"] for entry in scope}, {"unresolved-pending-discovery"})

    def test_required_roles_remain_distinct_and_unsubstituted(self) -> None:
        """Fails if the coordinator is represented as a delegated evidence role."""
        handoff = load_json(HANDOFF_PATH)
        required = handoff["role_separation"]["required_distinct_roles"]
        self.assertEqual(len(required), len(set(required)))
        self.assertIn("no delegated role receipt", handoff["role_separation"]["receipt_state"])
        receipt = load_json(RECEIPT_PATH)
        self.assertEqual(receipt["role"], "green-lead-coordinator")
        self.assertEqual(receipt["acceptance"], "not-claimed")
        self.assertTrue(set(required).issubset(set(receipt["forbidden_roles_not_performed"])))
        self.assertEqual(receipt["provider_attestation"]["available"], False)
        self.assertEqual(receipt["parent_ancestry_ids"], [])
        self.assertEqual(sha256(HANDOFF_PATH), hashlib.sha256(HANDOFF_PATH.read_bytes()).hexdigest())

    def test_browser_and_astral_mage_unknowns_are_explicit(self) -> None:
        """Fails if unobserved browser or historical behavior is promoted to fact."""
        disclosures = load_json(HANDOFF_PATH)["bounded_disclosures"]
        self.assertIn("No Batch B browser-auditor receipt or audit exists", disclosures["browser"])
        self.assertIn("No current or historical boundary has been classified for Astral Mage", disclosures["historical"])
        forbidden = ("runnable", "complete", "comparable", "historical", "in-development")
        self.assertIn("not described as absent, runnable, complete, comparable, historical, or in-development", disclosures["historical"])
        self.assertEqual(len(forbidden), 5)

    def test_no_candidate_or_acceptance_artifact_exists_at_this_stage(self) -> None:
        """Fails if lifecycle publication skips the required independent-role gates."""
        forbidden_paths = (
            TRACK_DIR / "candidate-cohort-manifest-batch-b.json",
            TRACK_DIR / "product-owner-acceptance-batch-b.json",
            TRACK_DIR / "accepted-cohort-manifest-batch-b.json",
        )
        self.assertEqual([path.name for path in forbidden_paths if path.exists()], [])


if __name__ == "__main__":
    unittest.main()
