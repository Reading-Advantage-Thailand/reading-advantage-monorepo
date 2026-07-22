"""Fail-closed integrity gate for the fresh bounded T4 cohort reconciliation v3."""

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
RECONCILIATION = TRACK_DIR / "cohort-reconciliation-v3.json"
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
HELPER = "/home/daniel-bo/.agents/skills/kimi-webbridge/scripts/screenshot.sh"


def load(path: Path) -> dict[str, Any]:
    """Loads one JSON evidence artifact.

    Args:
        path: Artifact path to parse.

    Returns:
        Parsed JSON object.
    """
    return json.loads(path.read_text(encoding="utf-8"))


def digest(path: Path) -> str:
    """Calculates the exact SHA-256 digest for an artifact.

    Args:
        path: Artifact path to hash.

    Returns:
        Lowercase hexadecimal SHA-256 digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def at_root(path: str) -> Path:
    """Resolves a repository-relative artifact path.

    Args:
        path: Repository-relative path.

    Returns:
        Absolute path beneath the canonical repository root.
    """
    return ROOT / path


def assert_binding(case: unittest.TestCase, binding: dict[str, str]) -> None:
    """Validates exact bytes and immutable first-publication commit for a binding.

    Args:
        case: Active unittest case.
        binding: Path, digest, and publication commit declaration.
    """
    path = at_root(binding["path"])
    case.assertTrue(path.is_file(), binding["path"])
    case.assertEqual(digest(path), binding["sha256"], binding["path"])
    commit = binding["publication_commit_sha"]
    exists = subprocess.run(
        ["git", "cat-file", "-e", f"{commit}^{{commit}}"],
        cwd=ROOT,
        capture_output=True,
        text=True,
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


class T4CohortReconciliationV3Contract(unittest.TestCase):
    """Requires exact A3/B3/C2 coverage and bounded fail-closed authority."""

    def test_exact_eight_game_roster(self) -> None:
        """Requires each assigned game exactly once in the fixed A3/B3/C2 order."""
        reconciliation = load(RECONCILIATION)["reconciliation"]
        observed = tuple(
            (entry["game"], entry["canonical_id"], entry["batch"])
            for entry in reconciliation["entries"]
        )
        self.assertEqual(observed, EXPECTED_GAMES)
        self.assertEqual(reconciliation["assigned_games_expected"], 8)
        self.assertEqual(reconciliation["assigned_games_observed"], 8)
        self.assertEqual(reconciliation["duplicates"], 0)
        self.assertEqual(reconciliation["omissions"], 0)
        self.assertEqual(len({entry["canonical_id"] for entry in reconciliation["entries"]}), 8)
        self.assertTrue(all(entry["exactly_once"] is True for entry in reconciliation["entries"]))

    def test_every_authoritative_input_is_byte_and_publication_bound(self) -> None:
        """Requires immutable Batch A, Batch B V20, and Batch C V7 input bytes."""
        artifact = load(RECONCILIATION)
        for batch in ("batch_a", "batch_b", "batch_c"):
            for binding in artifact[batch]["bindings"]:
                assert_binding(self, binding)

    def test_batch_a_b_disclosures_and_lifecycle_are_preserved(self) -> None:
        """Preserves accepted predecessors without promoting their disclosed limits."""
        artifact = load(RECONCILIATION)
        batch_a = artifact["batch_a"]["disclosures"]
        self.assertEqual(
            batch_a,
            {
                "castle_defense_manifest_omission_retained": True,
                "disc_001_retained": True,
                "resolved_claims_178_of_187_retained": True,
                "cohort_acceptance_not_promoted": True,
            },
        )
        batch_b = artifact["batch_b"]["disclosures"]
        self.assertTrue(batch_b["village_guardian_input_synthetic"])
        self.assertFalse(batch_b["village_guardian_input_is_trusted"])
        self.assertTrue(batch_b["village_guardian_hidden_tab_scheduler"])
        self.assertEqual(batch_b["village_guardian_completion_http_status"], 400)
        self.assertFalse(batch_b["village_guardian_completion_success_claimed"])
        self.assertEqual(batch_b["archer_exact_route_http_status"], 404)
        self.assertEqual(batch_b["storm_exact_route_http_status"], 404)
        self.assertFalse(batch_b["historical_source_promoted_to_current_runtime"])
        self.assertFalse(batch_b["asset_presence_establishes_runtime_loading"])
        self.assertFalse(batch_b["asset_presence_establishes_suitability"])
        self.assertFalse(batch_b["asset_presence_establishes_licensing"])
        self.assertFalse(batch_b["provider_session_provenance_fabricated"])
        batch_b_accepted = load(
            at_root("measure/tracks/apk_corpus_audit_action_defense_20260712/accepted-cohort-manifest-batch-b-v20.json")
        )
        self.assertTrue(batch_b_accepted["consumable"])
        self.assertEqual(batch_b_accepted["consumability"], "conditional")
        self.assertFalse(batch_b_accepted["revoked"])

    def test_batch_c_v7_selector_truth_review_and_asset_successor(self) -> None:
        """Requires the selected C evidence, zero CHM findings, and asset companion validation."""
        artifact = load(RECONCILIATION)
        selector = load(at_root("measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-role-receipt-selection-v7.json"))
        self.assertEqual(selector["schema"], "apk-role-receipt-selection.v7")
        self.assertFalse(selector["lifecycle"]["candidate_authorized"])
        self.assertFalse(selector["lifecycle"]["acceptance_authorized"])
        self.assertFalse(selector["lifecycle"]["consumption_authorized"])
        selected = selector["selected_receipts"]
        self.assertEqual(len(selected), 8)
        self.assertEqual(len({entry["provider_identifier"] for entry in selected}), 8)
        review = load(at_root("measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-adversarial-review-v7.json"))
        self.assertEqual(review["evidence_base"]["commit"], "8693ba3ec9ba139ee59b4255c958ebb3fc4be0a1")
        self.assertEqual(
            tuple(review["unresolved_findings"][severity] for severity in ("critical", "high", "medium")),
            (0, 0, 0),
        )
        self.assertEqual(
            artifact["batch_c"]["review_result"],
            {"unresolved_critical": 0, "unresolved_high": 0, "unresolved_medium": 0, "gate_result": "green: 5 passed"},
        )
        asset = next(entry for entry in selected if entry["task_id"] == "C3-ASSET")
        companion = asset["independent_validation_successor"]
        validation = load(at_root(companion["record"]["path"]))
        self.assertEqual(validation["status"], artifact["batch_c"]["asset_validation_companion"]["status"])
        self.assertTrue(all(check["result"] == "pass" for check in validation["independent_checks"].values()))
        self.assertEqual(
            sorted(asset["original_pending_validation_fields"]),
            sorted(artifact["batch_c"]["asset_validation_companion"]["original_pending_fields_preserved"]),
        )

    def test_browser_v6_helper_contract_is_structurally_bound(self) -> None:
        """Requires helper-only Kimi captures, explicit exits, byte-identical PNG recovery, and 404 limits."""
        artifact = load(RECONCILIATION)
        disclosure = artifact["batch_c"]["browser_disclosure"]
        self.assertEqual(disclosure["required_helper"], HELPER)
        self.assertEqual(disclosure["helper_capture_attempts"], 5)
        self.assertEqual(set(disclosure["helper_exit_codes_include"]), {4, 28})
        self.assertEqual(disclosure["wide_timeout_exit_code"], 28)
        self.assertFalse(disclosure["direct_screenshot_api_used"])
        self.assertEqual(disclosure["png_copy_source"], "helper-triggered daemon post-process paths")
        self.assertTrue(disclosure["pngs_copied_unchanged"])
        self.assertTrue(disclosure["source_destination_hashes_identical"])
        self.assertTrue(disclosure["session_closed"])
        self.assertTrue(disclosure["exact_routes_non_runnable"])
        self.assertEqual(disclosure["exact_routes_http_status"], 404)

        audit = load(at_root("measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-browser-audit-v6-root-arbiter-20260722-1758-kimi-b91e.json"))
        proof = load(at_root("measure/tracks/apk_corpus_audit_action_defense_20260712/role-proofs/browser-auditor-batch-c-v6-root-arbiter-20260722-1758-kimi-b91e.json"))
        receipt = load(at_root("measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/browser-auditor-batch-c-v6-root-arbiter-20260722-1758-kimi-b91e.json"))
        interactions_path = at_root(proof["browser_command_record"])
        self.assertEqual(digest(interactions_path), proof["output_bindings"][proof["browser_command_record"]])
        interactions = load(interactions_path)["sequence"]
        helper_calls = [entry for entry in interactions if entry.get("kind") == "helper"]
        self.assertEqual(len(helper_calls), 5)
        self.assertTrue(all(entry["argv"][0] == HELPER for entry in helper_calls))
        self.assertIn(4, [entry["exit"] for entry in helper_calls])
        self.assertEqual(sum(entry["exit"] == 28 for entry in helper_calls), 1)
        self.assertEqual(next(entry for entry in helper_calls if entry["exit"] == 28)["purpose"], "wide-gryphon-404-attempt-1")
        self.assertEqual([entry for entry in interactions if entry.get("action") == "screenshot"], [])
        self.assertTrue(proof["attestations"]["helper_only_capture_requests"])
        self.assertFalse(proof["attestations"]["direct_screenshot_api_command_by_role"])
        self.assertTrue(proof["attestations"]["session_closed"])
        self.assertTrue(receipt["result"]["session_closed"])
        self.assertTrue(receipt["result"]["server_stopped"])
        self.assertTrue(receipt["result"]["port_closed"])
        recovered = [entry for entry in helper_calls if entry.get("daemon_output_sha256")]
        self.assertEqual(len(recovered), 2)
        for entry in recovered:
            self.assertEqual(entry["exit"], 4)
            self.assertEqual(
                entry["daemon_output_sha256"],
                digest(at_root(entry["argv"][4])),
            )
        self.assertEqual(audit["screenshots"]["compact"]["sha256"], digest(at_root(audit["screenshots"]["compact"]["reserved_path"])))
        self.assertEqual(audit["screenshots"]["wide"]["sha256"], digest(at_root(audit["screenshots"]["wide"]["reserved_path"])))
        self.assertTrue(all(route["network_status"] == 404 for route in audit["route_observations"]))
        self.assertTrue(all(route["disposition"] == "non-runnable-at-bound-head" for route in audit["route_observations"]))

    def test_authority_and_success_claims_remain_fail_closed(self) -> None:
        """Authorizes only fresh full-cohort review and preserves all non-success boundaries."""
        artifact = load(RECONCILIATION)
        for key in (
            "candidate_manifest_publication_authorized",
            "product_owner_acceptance_authorized",
            "accepted_manifest_publication_authorized",
            "cohort_consumption_authorized",
        ):
            self.assertFalse(artifact["authorizations"][key], key)
        reviewer = artifact["authorizations"]["fresh_full_cohort_reviewer"]
        self.assertTrue(reviewer["authorized"])
        self.assertTrue(reviewer["only_permitted_next_role"])
        self.assertIn("fork_turns=none", reviewer["required_mode"])
        self.assertIn("full eight-game", reviewer["required_mode"])
        self.assertTrue(all(value is False for value in artifact["forbidden_success_claims"].values()))
        batch_c = artifact["batch_c"]["disclosures"]
        self.assertTrue(all(value is False for value in batch_c.values()))


if __name__ == "__main__":
    unittest.main()
