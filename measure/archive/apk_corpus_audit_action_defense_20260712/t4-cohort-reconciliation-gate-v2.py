"""Fail-closed integrity gate for the bounded T4 cohort reconciliation v2."""

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
RECONCILIATION = TRACK_DIR / "cohort-reconciliation-v2.json"
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
    """Loads a JSON evidence artifact.

    @param path The JSON artifact to parse.
    @returns The parsed object.
    """
    return json.loads(path.read_text())


def digest(path: Path) -> str:
    """Calculates an exact SHA-256 digest.

    @param path The file to hash.
    @returns The lowercase hexadecimal digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def assert_binding(case: unittest.TestCase, binding: dict[str, str]) -> None:
    """Checks exact bytes and immutable first-publication commit for one bound file.

    @param case The active test case.
    @param binding The artifact path, SHA-256 digest, and publication commit.
    @returns Nothing; fails closed on a missing or drifted binding.
    """
    path = ROOT / binding["path"]
    case.assertTrue(path.is_file(), binding["path"])
    case.assertEqual(digest(path), binding["sha256"], binding["path"])
    commit = binding["publication_commit_sha"]
    exists = subprocess.run(
        ["git", "cat-file", "-e", f"{commit}^{{commit}}"], cwd=ROOT, capture_output=True, text=True
    )
    case.assertEqual(exists.returncode, 0, exists.stderr)
    first_add = subprocess.run(
        ["git", "log", "--diff-filter=A", "--format=%H", "--", binding["path"]],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    ).stdout.splitlines()
    case.assertTrue(first_add, binding["path"])
    case.assertEqual(first_add[-1], commit, binding["path"])


class T4CohortReconciliationV2Contract(unittest.TestCase):
    """Requires exact cohort coverage, current Batch C evidence, and fail-closed authority."""

    def test_exact_eight_game_roster(self) -> None:
        """Requires every assigned game exactly once in the fixed A3/B3/C2 order."""
        reconciliation = load(RECONCILIATION)["reconciliation"]
        entries = reconciliation["entries"]
        observed = tuple((item["game"], item["canonical_id"], item["batch"]) for item in entries)
        self.assertEqual(observed, EXPECTED_GAMES)
        self.assertEqual(reconciliation["assigned_games_expected"], 8)
        self.assertEqual(reconciliation["assigned_games_observed"], 8)
        self.assertEqual(reconciliation["duplicates"], 0)
        self.assertEqual(reconciliation["omissions"], 0)
        self.assertEqual(len({item["canonical_id"] for item in entries}), 8)
        self.assertTrue(all(item["exactly_once"] is True for item in entries))

    def test_all_batch_bindings_are_byte_and_publication_bound(self) -> None:
        """Requires every preserved Batch A/B and current Batch C input at exact immutable bytes."""
        artifact = load(RECONCILIATION)
        for batch in ("batch_a", "batch_b", "batch_c"):
            for binding in artifact[batch]["bindings"]:
                assert_binding(self, binding)

    def test_batch_c_v7_selector_truth_review_and_successors_are_current(self) -> None:
        """Requires selector v7, truth v7, zero-finding review v7, and selected Browser/Asset successors."""
        artifact = load(RECONCILIATION)
        bindings = {item["path"]: item for item in artifact["batch_c"]["bindings"]}
        selector = load(ROOT / "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-role-receipt-selection-v7.json")
        self.assertEqual(selector["schema"], "apk-role-receipt-selection.v7")
        self.assertFalse(selector["lifecycle"]["candidate_authorized"])
        self.assertFalse(selector["lifecycle"]["acceptance_authorized"])
        selected = selector["selected_receipts"]
        self.assertEqual(len(selected), 8)
        self.assertEqual(len({item["provider_identifier"] for item in selected}), 8)
        browser = next(item for item in selected if item["task_id"] == "C3-BROWSER")
        asset = next(item for item in selected if item["task_id"] == "C3-ASSET")
        self.assertEqual(browser["audit"]["sha256"], bindings[browser["audit"]["path"]]["sha256"])
        self.assertEqual(browser["proof_sha256"], bindings[browser["proof_path"]]["sha256"])
        self.assertEqual(browser["receipt_sha256"], bindings[browser["receipt_path"]]["sha256"])
        self.assertEqual(asset["proof_sha256"], bindings[asset["proof_path"]]["sha256"])
        self.assertEqual(asset["receipt_sha256"], bindings[asset["receipt_path"]]["sha256"])
        review = load(ROOT / "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-adversarial-review-v7.json")
        self.assertEqual(review["evidence_base"]["commit"], "8693ba3ec9ba139ee59b4255c958ebb3fc4be0a1")
        self.assertEqual((review["unresolved_findings"]["critical"], review["unresolved_findings"]["high"], review["unresolved_findings"]["medium"]), (0, 0, 0))
        self.assertEqual(artifact["batch_c"]["review_result"], {"unresolved_critical": 0, "unresolved_high": 0, "unresolved_medium": 0, "gate_result": "green: 5 passed"})
        deviation = load(ROOT / "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-browser-v5-skill-deviation.json")
        self.assertFalse(deviation["lifecycle"]["v5_browser_selection_authorized"])
        validation = load(ROOT / "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-asset-v5-independent-validation-v1.json")
        self.assertEqual(validation["status"], "complete-bounded-independent-validation")
        self.assertTrue(all(value["result"] == "pass" for value in validation["independent_checks"].values()))

    def test_disclosures_and_authority_remain_fail_closed(self) -> None:
        """Preserves non-runnable and evidence limits while authorizing only the full-cohort reviewer."""
        artifact = load(RECONCILIATION)
        disclosure = "\n".join(artifact["batch_b"]["required_disclosures"] + artifact["batch_c"]["required_disclosures"]).lower()
        for required in ("synthetic", "hidden-tab", "http 400", "http 404", "asset", "provenance", "helper", "five helper capture attempts", "exit 4", "exit 28", "copied unchanged", "source/destination hashes matched", "coming soon", "non-runnable", "404"):
            self.assertIn(required, disclosure)
        self.assertIn("not listed", artifact["batch_a"]["disclosure"].lower())
        for key in ("candidate_manifest_publication_authorized", "product_owner_acceptance_authorized", "accepted_manifest_publication_authorized", "cohort_consumption_authorized"):
            self.assertFalse(artifact["authorizations"][key], key)
        reviewer = artifact["authorizations"]["fresh_full_cohort_reviewer"]
        self.assertTrue(reviewer["authorized"])
        self.assertTrue(reviewer["only_permitted_next_role"])
        self.assertIn("fork_turns=none", reviewer["required_mode"])
        self.assertIn("full eight-game", reviewer["required_mode"])
        self.assertTrue(all(value is False for value in artifact["forbidden_success_claims"].values()))


if __name__ == "__main__":
    unittest.main()
