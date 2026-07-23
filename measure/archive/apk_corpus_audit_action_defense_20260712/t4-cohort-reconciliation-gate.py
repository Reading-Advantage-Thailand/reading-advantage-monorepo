"""Fail-closed integrity gate for the bounded T4 cohort reconciliation."""

from __future__ import annotations

import hashlib
import json
import subprocess
import unittest
from pathlib import Path
from typing import Any


HERE = Path(__file__).resolve()
TRACK_DIR = HERE.parent
ROOT = TRACK_DIR.parents[2]
RECONCILIATION = TRACK_DIR / "cohort-reconciliation-v1.json"
EXPECTED_GAMES = (
    ("Castle Defense", "castle-defense", "batch-a"),
    ("Magic Defense", "magic-defense", "batch-a"),
    ("Wizard vs Zombie", "wizard-vs-zombie", "batch-a"),
    ("Village Guardian", "village-guardian", "batch-b"),
    ("Archer's Revenge", "archers-revenge", "batch-b"),
    ("Storm the Castle Tower", "storm-castle-tower", "batch-b"),
    ("Paladin's Twin-Soul", "paladins-twin-soul", "batch-c"),
    ("Gryphon Patrol", "gryphon-patrol", "batch-c"),
)


def load(path: Path) -> dict[str, Any]:
    """Loads a reconciliation JSON artifact.

    @param path The artifact to parse.
    @returns The parsed JSON object.
    """
    return json.loads(path.read_text())


def digest(path: Path) -> str:
    """Calculates an exact SHA-256 file digest.

    @param path The file to hash.
    @returns The lowercase hexadecimal digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def assert_binding(case: unittest.TestCase, binding: dict[str, Any]) -> None:
    """Checks a bound file hash and immutable publication commit.

    @param case The active test case.
    @param binding The path, digest, and publication commit to verify.
    @returns Nothing; raises an assertion failure when a binding drifts.
    """
    path = ROOT / binding["path"]
    case.assertTrue(path.is_file(), binding["path"])
    case.assertEqual(digest(path), binding["sha256"], binding["path"])
    commit = binding["publication_commit_sha"]
    result = subprocess.run(
        ["git", "cat-file", "-e", f"{commit}^{{commit}}"], cwd=ROOT, capture_output=True, text=True
    )
    case.assertEqual(result.returncode, 0, result.stderr)
    first_add = subprocess.run(
        ["git", "log", "--diff-filter=A", "--format=%H", "--", binding["path"]],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    ).stdout.splitlines()
    case.assertTrue(first_add, binding["path"])
    case.assertEqual(first_add[-1], commit, binding["path"])


class T4CohortReconciliationContract(unittest.TestCase):
    """Requires exact roster coverage, byte bindings, and fail-closed authority."""

    def test_all_eight_assigned_games_are_present_exactly_once(self) -> None:
        """Requires the complete assigned roster without duplicate or omitted game identities."""
        reconciliation = load(RECONCILIATION)["reconciliation"]
        entries = reconciliation["entries"]
        observed = tuple((entry["game"], entry["canonical_id"], entry["batch"]) for entry in entries)
        self.assertEqual(observed, EXPECTED_GAMES)
        self.assertEqual(reconciliation["assigned_games_expected"], 8)
        self.assertEqual(reconciliation["assigned_games_observed"], 8)
        self.assertEqual(len({entry["canonical_id"] for entry in entries}), 8)
        self.assertTrue(all(entry["exactly_once"] is True for entry in entries))
        self.assertEqual(reconciliation["duplicates"], 0)
        self.assertEqual(reconciliation["omissions"], 0)

    def test_batch_acceptance_and_v6_review_bind_exact_bytes(self) -> None:
        """Requires every referenced acceptance, selector, review, receipt, and gate byte binding."""
        artifact = load(RECONCILIATION)
        for binding in (
            artifact["batch_a"]["accepted_manifest"],
            artifact["batch_a"]["owner_acceptance"],
            *artifact["batch_a"]["per_game_evidence_base"],
            artifact["batch_b"]["candidate"],
            artifact["batch_b"]["owner_acceptance"],
            artifact["batch_b"]["accepted_manifest"],
            artifact["batch_b"]["fresh_review"],
            artifact["batch_c"]["evidence_base"],
            artifact["batch_c"]["corrected_denominator"],
            artifact["batch_c"]["v6_selector"],
            artifact["batch_c"]["green_review"],
            artifact["batch_c"]["green_review_receipt"],
            *artifact["active_gates"],
        ):
            assert_binding(self, binding)

    def test_lifecycle_remains_fail_closed_except_for_fresh_cohort_review(self) -> None:
        """Permits only the fresh full-cohort reviewer after the local reconciliation gate passes."""
        artifact = load(RECONCILIATION)
        authorizations = artifact["authorizations"]
        for key in (
            "candidate_manifest_publication_authorized",
            "product_owner_acceptance_authorized",
            "accepted_manifest_publication_authorized",
            "cohort_consumption_authorized",
        ):
            self.assertFalse(authorizations[key], key)
        reviewer = authorizations["fresh_full_cohort_reviewer"]
        self.assertTrue(reviewer["authorized"])
        self.assertTrue(reviewer["only_permitted_next_role"])
        self.assertIn("fork_turns=none", reviewer["required_mode"])
        self.assertIn("full eight-game", reviewer["required_mode"])
        self.assertEqual(artifact["batch_c"]["green_review"]["unresolved_critical_high_medium"], 0)

    def test_disclosures_and_non_success_claims_are_preserved(self) -> None:
        """Requires all bounded browser, input, HTTP, asset, provenance, and historical disclosures."""
        artifact = load(RECONCILIATION)
        disclosures = "\n".join(artifact["batch_b"]["required_disclosures"]).lower()
        for required in ("synthetic", "hidden-tab", "http 400", "http 404", "asset", "provenance", "historical"):
            self.assertIn(required, disclosures)
        self.assertIn("not listed", artifact["batch_a"]["reconciliation_disposition"].lower())
        self.assertEqual(artifact["batch_c"]["green_review"]["gate_result"], "green: 5 passed")
        self.assertTrue(all(value is False for value in artifact["forbidden_success_claims"].values()))


if __name__ == "__main__":
    unittest.main()
