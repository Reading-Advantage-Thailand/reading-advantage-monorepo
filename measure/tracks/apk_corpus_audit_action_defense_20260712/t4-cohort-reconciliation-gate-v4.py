"""Fail-closed integrity gate for the append-only T4 cohort reconciliation v4."""

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
RECONCILIATION = TRACK_DIR / "cohort-reconciliation-v4.json"
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
EXPECTED_ROLES = {
    "C3-DISCOVERY": "discovery-auditor-batch-c",
    "C3-COLLECT-PALADIN": "evidence-collector-paladins-twin-soul-batch-c",
    "C3-COLLECT-GRYPHON": "evidence-collector-gryphon-patrol-batch-c",
    "C3-MAP-PALADIN": "requirements-mapper-paladins-twin-soul-batch-c",
    "C3-MAP-GRYPHON": "requirements-mapper-gryphon-patrol-batch-c",
    "C3-TRUTH": "truth-test-author-batch-c",
    "C3-BROWSER": "browser-auditor-batch-c",
    "C3-ASSET": "asset-auditor-batch-c",
}
SELECTOR_PATH = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/"
    "batch-c-role-receipt-selection-v7-root-arbiter-20260722-1912-r7k3-19a7.json"
)
TRUTH_GATE_PATH = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/"
    "batch-c-truth-tests-v7-root-arbiter-20260722-1912-r7k3-19a7.py"
)
PRIOR_REVIEW_PATH = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/"
    "full-cohort-independent-review-v2-browser-v6-root-arbiter-20260722-1850-r7k3.json"
)
DOWNSTREAM_REVIEW_PATH = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/"
    "full-cohort-independent-review-v3-selector-v7-root-downstream-20260722-1924-r7k3v7-3d2f.json"
)
DOWNSTREAM_PROOF_PATH = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-proofs/"
    "adversarial-reviewer-full-cohort-v3-selector-v7-root-downstream-20260722-1924-r7k3v7-3d2f.json"
)
DOWNSTREAM_RECEIPT_PATH = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/"
    "adversarial-reviewer-full-cohort-v3-selector-v7-root-downstream-20260722-1924-r7k3v7-3d2f.json"
)
FINDING_ID = "T4C-BROWSER-V6-SELECTOR-001"
SELECTOR_COMMIT = "2fef3b7e5237282bd05e658a628f27a1bef2d8ce"
DOWNSTREAM_REVIEW_COMMIT = "519e84f4ae26c6c910755b9f28a27e01a807b4f8"
SELECTOR_SHA256 = "a58977ac3ea5891bd3d46f62577b6ed2a0a971e967833b450bdbbae8d0f5d342"
PRIOR_REVIEW_SHA256 = "4aa356729f3f9b3d8f9b03d31f7fe4ec31ce1f56175fb0dc101cd7cf7a09e4e5"
DOWNSTREAM_REVIEW_SHA256 = "6d7b03d02bfd4cb1d710bd1e236cd00fd4471f7a20331285591a0f325997e872"
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


def provider(document: dict[str, Any]) -> str | None:
    """Returns the recorded provider identifier from either supported shape.

    Args:
        document: Proof or receipt document.

    Returns:
        Provider identifier when recorded.
    """
    return document.get("provider_identifier") or document.get("provider_provenance", {}).get(
        "provider_identifier"
    )


def parent(document: dict[str, Any]) -> str | None:
    """Returns the recorded parent task from either supported shape.

    Args:
        document: Proof or receipt document.

    Returns:
        Parent task when recorded.
    """
    return document.get("parent_task") or document.get("provider_provenance", {}).get("parent_task")


def first_publication(path: str) -> str:
    """Returns the earliest commit that added a repository path.

    Args:
        path: Repository-relative path.

    Returns:
        Full commit SHA for the first addition.
    """
    result = subprocess.run(
        ["git", "log", "--diff-filter=A", "--format=%H", "--", path],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    commits = result.stdout.splitlines()
    if not commits:
        raise AssertionError(f"No first-publication commit for {path}")
    return commits[-1]


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
    case.assertEqual(first_publication(binding["path"]), commit, binding["path"])


class T4CohortReconciliationV4Contract(unittest.TestCase):
    """Requires exact A3/B3/C2 coverage and reviewed Browser v6 selector lineage."""

    def test_v4_supersedes_v3_with_exact_eight_game_roster(self) -> None:
        """Requires each assigned game exactly once in the fixed A3/B3/C2 order."""
        artifact = load(RECONCILIATION)
        self.assertEqual(
            artifact["supersedes"],
            "measure/tracks/apk_corpus_audit_action_defense_20260712/cohort-reconciliation-v3.json",
        )
        self.assertEqual(artifact["audited_head"], DOWNSTREAM_REVIEW_COMMIT)
        reconciliation = artifact["reconciliation"]
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

    def test_every_authoritative_input_is_byte_and_first_publication_bound(self) -> None:
        """Requires exact immutable bytes and first-publication commits for all bindings."""
        artifact = load(RECONCILIATION)
        for batch in ("batch_a", "batch_b", "batch_c"):
            for binding in artifact[batch]["bindings"]:
                assert_binding(self, binding)

    def test_batch_a_and_batch_b_v20_disclosures_are_retained(self) -> None:
        """Preserves accepted predecessors without promoting their disclosed limits."""
        artifact = load(RECONCILIATION)
        self.assertEqual(
            artifact["batch_a"]["disclosures"],
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
        self.assertTrue(
            all(
                batch_b[key] is False
                for key in (
                    "historical_source_promoted_to_current_runtime",
                    "asset_presence_establishes_runtime_loading",
                    "asset_presence_establishes_suitability",
                    "asset_presence_establishes_licensing",
                    "provider_session_provenance_fabricated",
                )
            )
        )
        accepted = load(TRACK_DIR / "accepted-cohort-manifest-batch-b-v20.json")
        self.assertTrue(accepted["consumable"])
        self.assertEqual(accepted["consumability"], "conditional")
        self.assertFalse(accepted["revoked"])

    def test_selector_has_unique_providers_and_selects_only_browser_v6(self) -> None:
        """Requires eight role-unique providers, Browser v6 selection, and Browser v5 exclusion."""
        artifact = load(RECONCILIATION)
        selector = load(at_root(SELECTOR_PATH))
        self.assertEqual(digest(at_root(SELECTOR_PATH)), SELECTOR_SHA256)
        self.assertEqual(selector["finding_remediation"]["finding_id"], FINDING_ID)
        self.assertEqual(selector["finding_remediation"]["severity"], "High")
        selected = selector["selected_receipts"]
        self.assertEqual(len(selected), 8)
        self.assertEqual({entry["task_id"] for entry in selected}, set(EXPECTED_ROLES))
        self.assertEqual(len({entry["provider_identifier"] for entry in selected}), 8)
        for entry in selected:
            self.assertEqual(entry["role"], EXPECTED_ROLES[entry["task_id"]])
            proof_path = at_root(entry["proof_path"])
            receipt_path = at_root(entry["receipt_path"])
            self.assertEqual(digest(proof_path), entry["proof_sha256"])
            self.assertEqual(digest(receipt_path), entry["receipt_sha256"])
            proof = load(proof_path)
            receipt = load(receipt_path)
            self.assertEqual(provider(proof), entry["provider_identifier"])
            self.assertEqual(provider(receipt), entry["provider_identifier"])
            self.assertEqual(parent(proof), entry["parent_task"])
            self.assertEqual(parent(receipt), entry["parent_task"])
        browser = next(entry for entry in selected if entry["task_id"] == "C3-BROWSER")
        self.assertIn("browser-auditor-batch-c-v6-root-arbiter", browser["receipt_path"])
        self.assertIn("browser-auditor-batch-c-v6-root-arbiter", browser["proof_path"])
        selected_paths = {entry["receipt_path"] for entry in selected} | {
            entry["proof_path"] for entry in selected
        }
        self.assertFalse(any("browser-auditor-batch-c-v5" in path for path in selected_paths))
        exclusion = selector["required_exclusions"]["browser_v5_skill_deviation"]
        self.assertEqual(digest(at_root(exclusion["path"])), exclusion["sha256"])
        self.assertEqual(exclusion["disposition"], "non-consumable and unselected")
        lineage = artifact["batch_c"]["selector_lineage"]
        self.assertEqual(lineage["selector_sha256"], SELECTOR_SHA256)
        self.assertEqual(lineage["selector_publication_commit"], SELECTOR_COMMIT)
        self.assertEqual(lineage["selected_roles"], 8)
        self.assertEqual(lineage["unique_providers"], 8)
        self.assertTrue(lineage["browser_v6_selected"])
        self.assertFalse(lineage["browser_v5_selected"])
        self.assertEqual(digest(at_root(TRUTH_GATE_PATH)), selector["truth_gate"]["sha256"])

    def test_prior_high_is_resolved_by_exact_fresh_downstream_review_chain(self) -> None:
        """Binds the prior High, selector successor, and immutable downstream PASS in order."""
        artifact = load(RECONCILIATION)
        prior = load(at_root(PRIOR_REVIEW_PATH))
        self.assertEqual(digest(at_root(PRIOR_REVIEW_PATH)), PRIOR_REVIEW_SHA256)
        finding = next(item for item in prior["findings"] if item["id"] == FINDING_ID)
        self.assertEqual(finding["severity"], "High")
        self.assertIn(FINDING_ID, prior["blockers"])

        downstream = load(at_root(DOWNSTREAM_REVIEW_PATH))
        proof = load(at_root(DOWNSTREAM_PROOF_PATH))
        receipt = load(at_root(DOWNSTREAM_RECEIPT_PATH))
        self.assertEqual(digest(at_root(DOWNSTREAM_REVIEW_PATH)), DOWNSTREAM_REVIEW_SHA256)
        self.assertEqual(downstream["immutable_review_base"]["commit"], SELECTOR_COMMIT)
        self.assertEqual(downstream["immutable_review_base"]["changed_paths"], 9)
        self.assertEqual(downstream["commit_blob_audit"]["expected_count"], 9)
        self.assertEqual(downstream["commit_blob_audit"]["observed_count"], 9)
        self.assertEqual(downstream["selector_review"]["selector_sha256"], SELECTOR_SHA256)
        self.assertEqual(downstream["selector_review"]["selected_roles"], 8)
        self.assertEqual(downstream["selector_review"]["unique_provider_identifiers"], 8)
        self.assertEqual(downstream["selector_review"]["duplicate_provider_identifiers"], [])
        self.assertTrue(downstream["browser_v6_binding_review"]["browser_evidence_commit_is_ancestor"])
        self.assertFalse(downstream["browser_v6_binding_review"]["browser_checks_rerun"])
        resolution = downstream["prior_high_re_evaluation"]
        self.assertEqual(resolution["finding_id"], FINDING_ID)
        self.assertEqual(resolution["original_severity"], "High")
        self.assertEqual(resolution["original_review_sha256"], PRIOR_REVIEW_SHA256)
        self.assertEqual(resolution["selector_successor_sha256"], SELECTOR_SHA256)
        self.assertEqual(resolution["disposition"], "resolved-at-selector-lineage-layer")
        self.assertEqual(downstream["gate_execution"]["run_count"], 1)
        self.assertEqual(downstream["gate_execution"]["exit_code"], 0)
        self.assertIn("6 passed", downstream["gate_execution"]["result"])
        self.assertFalse(downstream["gate_execution"]["browser_or_server_gate_run"])
        self.assertEqual(downstream["findings"], [])
        self.assertEqual(downstream["blockers"], [])
        self.assertTrue(all(value == 0 for value in downstream["unresolved_counts"].values()))
        self.assertEqual(downstream["verdict"]["selector_lineage"], "PASS")
        self.assertEqual(downstream["verdict"]["prior_high"], "RESOLVED_AT_SELECTOR_LINEAGE_LAYER")
        self.assertEqual(proof["immutable_review_base"], SELECTOR_COMMIT)
        self.assertEqual(proof["result"]["verdict"], "PASS_SELECTOR_LINEAGE")
        self.assertEqual(receipt["review_results"]["verdict"], "PASS_SELECTOR_LINEAGE")
        self.assertEqual(receipt["review_results"]["prior_high_finding"], FINDING_ID)
        self.assertEqual(receipt["review_results"]["new_findings"], [])
        self.assertEqual(receipt["retained_review"]["sha256"], DOWNSTREAM_REVIEW_SHA256)
        self.assertEqual(receipt["retained_proof"]["sha256"], digest(at_root(DOWNSTREAM_PROOF_PATH)))
        self.assertNotIn(
            downstream["reviewer_provenance"]["provider_identifier"],
            {entry["provider_identifier"] for entry in load(at_root(SELECTOR_PATH))["selected_receipts"]},
        )
        recorded = artifact["batch_c"]["review_resolution"]
        self.assertEqual(recorded["finding_id"], FINDING_ID)
        self.assertEqual(recorded["original_review_sha256"], PRIOR_REVIEW_SHA256)
        self.assertEqual(recorded["selector_successor_sha256"], SELECTOR_SHA256)
        self.assertEqual(recorded["downstream_review_sha256"], DOWNSTREAM_REVIEW_SHA256)
        self.assertEqual(recorded["downstream_review_publication_commit"], DOWNSTREAM_REVIEW_COMMIT)
        self.assertEqual(recorded["downstream_verdict"], "PASS_SELECTOR_LINEAGE")
        self.assertEqual(recorded["new_findings"], [])
        self.assertFalse(recorded["browser_checks_rerun"])

    def test_existing_kimi_browser_evidence_is_bound_without_rerun(self) -> None:
        """Requires helper-only Kimi evidence and preserves its bounded 404 conclusions."""
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
        proof = load(TRACK_DIR / "role-proofs/browser-auditor-batch-c-v6-root-arbiter-20260722-1758-kimi-b91e.json")
        receipt = load(TRACK_DIR / "role-receipts/browser-auditor-batch-c-v6-root-arbiter-20260722-1758-kimi-b91e.json")
        interactions_path = at_root(proof["browser_command_record"])
        self.assertEqual(digest(interactions_path), proof["output_bindings"][proof["browser_command_record"]])
        helper_calls = [
            entry for entry in load(interactions_path)["sequence"] if entry.get("kind") == "helper"
        ]
        self.assertEqual(len(helper_calls), 5)
        self.assertTrue(all(entry["argv"][0] == HELPER for entry in helper_calls))
        self.assertTrue(proof["attestations"]["helper_only_capture_requests"])
        self.assertFalse(proof["attestations"]["direct_screenshot_api_command_by_role"])
        self.assertTrue(proof["attestations"]["session_closed"])
        self.assertTrue(receipt["result"]["session_closed"])
        self.assertTrue(receipt["result"]["server_stopped"])
        self.assertTrue(receipt["result"]["port_closed"])

    def test_all_candidate_acceptance_consumption_and_success_claims_stay_false(self) -> None:
        """Requires every lifecycle authority and forbidden success claim to remain false."""
        artifact = load(RECONCILIATION)
        for key in (
            "candidate_manifest_publication_authorized",
            "product_owner_acceptance_authorized",
            "accepted_manifest_publication_authorized",
            "cohort_consumption_authorized",
        ):
            self.assertFalse(artifact["authorizations"][key], key)
        completed_review = artifact["authorizations"]["fresh_downstream_selector_reviewer"]
        self.assertTrue(completed_review["completed"])
        self.assertFalse(completed_review["authorized_for_another_pass"])
        self.assertFalse(completed_review["candidate_or_acceptance_authority_granted"])
        self.assertTrue(all(value is False for value in artifact["forbidden_success_claims"].values()))
        self.assertTrue(all(value is False for value in artifact["batch_c"]["disclosures"].values()))
        selector = load(at_root(SELECTOR_PATH))
        self.assertTrue(all(value is False for value in selector["lifecycle"].values()))
        downstream = load(at_root(DOWNSTREAM_REVIEW_PATH))
        self.assertFalse(downstream["lifecycle"]["candidate_authorized"])
        self.assertFalse(downstream["lifecycle"]["product_owner_acceptance_authorized"])
        self.assertFalse(downstream["lifecycle"]["accepted_manifest_authorized"])
        self.assertFalse(downstream["lifecycle"]["consumption_authorized"])


if __name__ == "__main__":
    unittest.main()
