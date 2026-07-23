"""Fail-closed Batch C selector successor bound to the r7k3 High finding."""

from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path
from typing import Any


HERE = Path(__file__).resolve()
ROOT = HERE.parents[3]
TRACK_DIR = HERE.parent
SELECTOR = TRACK_DIR / "batch-c-role-receipt-selection-v7-root-arbiter-20260722-1912-r7k3-19a7.json"
FINDING_ID = "T4C-BROWSER-V6-SELECTOR-001"
EXPECTED_REVIEW_INPUTS = {
    "selector_ownership": (
        "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-selector-v7-root-arbiter-20260722-1912-r7k3-19a7-ownership.json",
        "ef4cdb49044f3de6b67f66f5dd1a83768142a3a17846fc4679291cda95bac987",
    ),
    "review_ownership": (
        "measure/tracks/apk_corpus_audit_action_defense_20260712/full-cohort-independent-review-v2-browser-v6-root-arbiter-20260722-1850-r7k3-ownership.json",
        "916300ef26cf9825911b1943dd7a18c12e19db7bfe3cf982da0ac422906d9db4",
    ),
    "review": (
        "measure/tracks/apk_corpus_audit_action_defense_20260712/full-cohort-independent-review-v2-browser-v6-root-arbiter-20260722-1850-r7k3.json",
        "4aa356729f3f9b3d8f9b03d31f7fe4ec31ce1f56175fb0dc101cd7cf7a09e4e5",
    ),
    "review_proof": (
        "measure/tracks/apk_corpus_audit_action_defense_20260712/role-proofs/adversarial-reviewer-full-cohort-v2-browser-v6-root-arbiter-20260722-1850-r7k3.json",
        "1e5f7b291ad4c61ae8cfa3cca5f56ae92c06b84717d19255c857576fd2dcbdb5",
    ),
    "review_receipt": (
        "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/adversarial-reviewer-full-cohort-v2-browser-v6-root-arbiter-20260722-1850-r7k3.json",
        "1aad347224a8e8caa237ea5ad383f39030bc45ef0ed213398b81a6f1995ee2a9",
    ),
}
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


def load(path: Path) -> Any:
    """Loads a JSON artifact.

    @param path JSON artifact path.
    @returns Parsed JSON value.
    """
    return json.loads(path.read_text())


def file_sha(path: Path) -> str:
    """Returns the SHA-256 digest for exact file bytes.

    @param path File whose bytes are bound.
    @returns Lowercase SHA-256 digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def provider(document: dict[str, Any]) -> str | None:
    """Returns the recorded provider identifier from either supported shape.

    @param document Proof or receipt document.
    @returns Provider identifier when recorded.
    """
    return document.get("provider_identifier") or document.get("provider_provenance", {}).get("provider_identifier")


def parent(document: dict[str, Any]) -> str | None:
    """Returns the recorded parent task from either supported shape.

    @param document Proof or receipt document.
    @returns Parent task when recorded.
    """
    return document.get("parent_task") or document.get("provider_provenance", {}).get("parent_task")


class BatchCV7R7K3SelectorContract(unittest.TestCase):
    """Requires the nonce selector and truth role to resolve only the cited High finding."""

    def test_r7k3_high_finding_and_exact_review_chain_are_bound(self) -> None:
        """Binds the successor to the exact r7k3 review chain and High finding."""
        selection = load(SELECTOR)
        self.assertEqual(selection["finding_remediation"]["finding_id"], FINDING_ID)
        self.assertEqual(selection["finding_remediation"]["severity"], "High")
        self.assertFalse(selection["finding_remediation"]["downstream_review_completed"])
        for key, (path, sha256) in EXPECTED_REVIEW_INPUTS.items():
            self.assertEqual(selection["review_bindings"][key]["path"], path)
            self.assertEqual(selection["review_bindings"][key]["sha256"], sha256)
            self.assertEqual(file_sha(ROOT / path), sha256)
        review = load(ROOT / EXPECTED_REVIEW_INPUTS["review"][0])
        finding = next(item for item in review["findings"] if item["id"] == FINDING_ID)
        self.assertEqual(finding["severity"], "High")
        self.assertIn(FINDING_ID, review["blockers"])

    def test_exact_eight_roles_and_provider_parent_bindings(self) -> None:
        """Requires one hash-bound proof and receipt pair for each selected role."""
        selection = load(SELECTOR)
        entries = selection["selected_receipts"]
        self.assertEqual(len(entries), 8)
        self.assertEqual({entry["task_id"] for entry in entries}, set(EXPECTED_ROLES))
        self.assertEqual(len({entry["provider_identifier"] for entry in entries}), 8)
        for entry in entries:
            self.assertEqual(entry["role"], EXPECTED_ROLES[entry["task_id"]])
            proof_path = ROOT / entry["proof_path"]
            receipt_path = ROOT / entry["receipt_path"]
            self.assertEqual(file_sha(proof_path), entry["proof_sha256"])
            self.assertEqual(file_sha(receipt_path), entry["receipt_sha256"])
            proof = load(proof_path)
            receipt = load(receipt_path)
            self.assertEqual(proof["role"], entry["role"])
            self.assertEqual(receipt["role"], entry["role"])
            self.assertEqual(provider(proof), entry["provider_identifier"])
            self.assertEqual(provider(receipt), entry["provider_identifier"])
            self.assertEqual(parent(proof), entry["parent_task"])
            self.assertEqual(parent(receipt), entry["parent_task"])

    def test_non_truth_roles_are_preserved_from_canonical_v7(self) -> None:
        """Preserves every canonical v7 role binding except the superseded truth role."""
        selection = load(SELECTOR)
        predecessor = load(TRACK_DIR / "batch-c-role-receipt-selection-v7.json")
        actual = {entry["task_id"]: entry for entry in selection["selected_receipts"]}
        expected = {entry["task_id"]: entry for entry in predecessor["selected_receipts"]}
        for task_id in EXPECTED_ROLES.keys() - {"C3-TRUTH"}:
            self.assertEqual(actual[task_id], expected[task_id])

    def test_nonce_truth_role_is_single_and_chain_bound(self) -> None:
        """Selects exactly this nonce truth provider and validates its proof/receipt chain."""
        selection = load(SELECTOR)
        truth = next(item for item in selection["selected_receipts"] if item["task_id"] == "C3-TRUTH")
        self.assertEqual(truth["provider_identifier"], "/root/apk_batch_c_fresh_roles/batch_c_gryphon_mapper_v5")
        self.assertEqual(truth["parent_task"], "/root/apk_batch_c_fresh_roles")
        proof = load(ROOT / truth["proof_path"])
        receipt = load(ROOT / truth["receipt_path"])
        self.assertEqual(receipt["retained_proof"]["sha256"], truth["proof_sha256"])
        self.assertEqual(proof["input_bindings"]["review"]["sha256"], EXPECTED_REVIEW_INPUTS["review"][1])
        self.assertEqual(proof["input_bindings"]["finding_id"], FINDING_ID)
        self.assertEqual(proof["outputs"]["truth_test"]["sha256"], file_sha(HERE))
        self.assertIsNone(proof["outputs"]["selector"]["sha256"])
        self.assertEqual(proof["outputs"]["selector"]["cycle_binding"], "selector-hashes-proof-and-receipt")

    def test_browser_v6_selected_and_browser_v5_excluded(self) -> None:
        """Selects the helper-compliant Browser v6 chain and excludes Browser v5."""
        selection = load(SELECTOR)
        browser = next(item for item in selection["selected_receipts"] if item["task_id"] == "C3-BROWSER")
        self.assertIn("browser-auditor-batch-c-v6-root-arbiter", browser["receipt_path"])
        selected_paths = {entry["receipt_path"] for entry in selection["selected_receipts"]} | {
            entry["proof_path"] for entry in selection["selected_receipts"]
        }
        self.assertNotIn(
            "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/browser-auditor-batch-c-v5.json",
            selected_paths,
        )
        exclusion = selection["required_exclusions"]["browser_v5_skill_deviation"]
        self.assertEqual(file_sha(ROOT / exclusion["path"]), exclusion["sha256"])
        self.assertEqual(exclusion["disposition"], "non-consumable and unselected")

    def test_lifecycle_remains_fail_closed(self) -> None:
        """Forbids candidate, acceptance, and consumption claims before fresh review."""
        selection = load(SELECTOR)
        self.assertEqual(
            selection["lifecycle"],
            {
                "candidate_authorized": False,
                "acceptance_authorized": False,
                "consumption_authorized": False,
            },
        )


if __name__ == "__main__":
    unittest.main()
