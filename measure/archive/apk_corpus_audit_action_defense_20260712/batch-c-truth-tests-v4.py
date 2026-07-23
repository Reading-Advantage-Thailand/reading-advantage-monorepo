"""Fail-closed Batch C remediation contracts for fresh roles and immutable browser evidence."""

from __future__ import annotations

import hashlib
import json
import subprocess
import unittest
from pathlib import Path
from typing import Any


HERE = Path(__file__).resolve()
ROOT = HERE.parents[3]
TRACK_DIR = HERE.parent
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
SOURCE_DENOMINATOR = ROOT / "measure/archive/apk_source_denominator_inventory_20260712/source-denominator.json"
ASSET_DENOMINATOR = ROOT / "measure/archive/apk_source_denominator_inventory_20260712/asset-file-denominator.json"
HISTORICAL_DENOMINATOR = ROOT / "measure/archive/apk_source_denominator_inventory_20260712/historical-source-denominator.json"
TOKENS = ("paladinstwinsoul", "gryphonpatrol")


def file_sha(path: Path) -> str:
    """Returns the SHA-256 digest for an exact file.

    @param path File whose bytes are bound.
    @returns Lowercase SHA-256 digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path: Path) -> Any:
    """Loads a JSON artifact.

    @param path JSON artifact path.
    @returns Parsed JSON value.
    """
    return json.loads(path.read_text())


def normalized_path(value: str) -> str:
    """Normalizes a denominator path for hyphen, underscore, and camelCase matching.

    @param value Path or record locator to normalize.
    @returns Lowercase alphanumeric path text.
    """
    return "".join(character for character in value.lower() if character.isalnum())


def selected_records(records: list[dict[str, Any]], path_key: str) -> list[dict[str, Any]]:
    """Selects and sorts exact Batch C records from a frozen denominator ledger.

    @param records Frozen denominator records.
    @param path_key Direct path key or ``evidence.path`` selector.
    @returns Deterministically path-sorted Batch C records.
    """
    def record_path(record: dict[str, Any]) -> str | None:
        if path_key == "evidence.path":
            return record.get("evidence", {}).get("path")
        return record.get(path_key)

    return sorted(
        (
            record
            for record in records
            if record_path(record) is not None
            and any(token in normalized_path(record_path(record) or "") for token in TOKENS)
        ),
        key=lambda record: record_path(record) or "",
    )


def canonical_list_sha(values: list[str]) -> str:
    """Hashes a list using deterministic compact JSON serialization.

    @param values Ordered inventory values.
    @returns SHA-256 digest of the canonical JSON bytes.
    """
    payload = json.dumps(values, ensure_ascii=False, separators=(",", ":")).encode()
    return hashlib.sha256(payload).hexdigest()


def git_blob_sha(revision: str, path: str) -> str:
    """Reads and hashes an immutable Git blob.

    @param revision Commit containing the blob.
    @param path Repository-relative blob path.
    @returns SHA-256 digest of the exact blob bytes.
    """
    result = subprocess.run(
        ["git", "show", f"{revision}:{path}"],
        cwd=ROOT,
        check=True,
        stdout=subprocess.PIPE,
    )
    return hashlib.sha256(result.stdout).hexdigest()


class BatchCCorrectedDenominatorContract(unittest.TestCase):
    """Contract C1: the superseding Batch C denominator covers every normalized frozen-ledger record."""

    def test_corrected_denominator_matches_frozen_ledgers_and_blob_hashes(self) -> None:
        """Requires exact 22/9/21 inventories, deterministic hashes, and immutable blob verification."""
        correction_path = TRACK_DIR / "batch-c-denominator-correction-v4.json"
        self.assertTrue(correction_path.is_file(), "EXPECTED_RED[DENOM-001]: denominator correction absent")
        correction = load(correction_path)
        source_records = selected_records(load(SOURCE_DENOMINATOR)["records"], "file_path")
        asset_records = selected_records(load(ASSET_DENOMINATOR)["candidate_files"], "canonical_path")
        historical_records = selected_records(load(HISTORICAL_DENOMINATOR)["records"], "evidence.path")
        source_locators = [record["record_id"] for record in source_records]
        asset_locators = [record["canonical_path"] for record in asset_records]
        historical_locators = [f'{record["evidence"]["path"]}@{record["evidence"]["revision"]}' for record in historical_records]
        inventories = correction["corrected_denominator"]
        self.assertEqual(correction["status"], "denominator-corrected-awaiting-fresh-specialists")
        for frozen_input in correction["frozen_inputs"].values():
            self.assertEqual(file_sha(ROOT / frozen_input["path"]), frozen_input["sha256"])
        for proof_key in ("fresh_discovery_proof", "fresh_discovery_receipt"):
            retained = correction["supersession"][proof_key]
            self.assertEqual(file_sha(ROOT / retained["path"]), retained["sha256"])
        self.assertEqual(inventories["counts"], {"identity": 2, "source_records": 22, "scene_records": 0, "state_records": 0, "transition_records": 0, "asset_candidates": 9, "historical_records": 21})
        self.assertEqual(inventories["source_records"], source_locators)
        self.assertEqual(inventories["asset_candidates"], asset_locators)
        self.assertEqual(inventories["historical_records"], historical_locators)
        for key, values in (("source_records", source_locators), ("asset_candidates", asset_locators), ("historical_records", historical_locators)):
            self.assertEqual(correction["inventory_sha256"][key], canonical_list_sha(values))
        for record in source_records:
            self.assertEqual(git_blob_sha(record["evidence"]["revision"], record["evidence"]["path"]), record["evidence"]["blob_sha256"])
        for record in asset_records:
            self.assertEqual(git_blob_sha(record["revision"], record["canonical_path"]), record["sha256"])
        for record in historical_records:
            evidence = record["evidence"]
            self.assertEqual(git_blob_sha(evidence["revision"], evidence["path"]), evidence["blob_sha256"])

    def test_correction_explicitly_accounts_for_prior_omissions_per_game(self) -> None:
        """Requires exact omitted sets and per-game reconciliation without new evidence claims."""
        correction_path = TRACK_DIR / "batch-c-denominator-correction-v4.json"
        self.assertTrue(correction_path.is_file(), "EXPECTED_RED[DENOM-001]: denominator correction absent")
        correction = load(correction_path)
        omissions = correction["prior_omissions"]
        original = load(TRACK_DIR / "batch-c-discovery-audit.json")["denominator_reconciliation"]
        source_records = selected_records(load(SOURCE_DENOMINATOR)["records"], "file_path")
        asset_records = selected_records(load(ASSET_DENOMINATOR)["candidate_files"], "canonical_path")
        historical_records = selected_records(load(HISTORICAL_DENOMINATOR)["records"], "evidence.path")
        expected_source_omissions = sorted({record["record_id"] for record in source_records} - set(original["source_records"]))
        expected_asset_omissions = sorted({record["canonical_path"] for record in asset_records} - set(original["asset_candidates"]))
        expected_historical_omissions = sorted(
            {
                f'{record["evidence"]["path"]}@{record["evidence"]["revision"]}'
                for record in historical_records
            }
            - set(original["historical_records"])
        )
        self.assertEqual(omissions["gryphon_archive_source_records"], expected_source_omissions)
        self.assertEqual(omissions["gryphon_metadata_asset_candidates"], expected_asset_omissions)
        self.assertEqual(omissions["historical_src_lib_games_records"], expected_historical_omissions)
        self.assertEqual(len(omissions["gryphon_archive_source_records"]), 6)
        self.assertTrue(all("measure/archive/gryphon_patrol_" in item for item in omissions["gryphon_archive_source_records"]))
        self.assertEqual(len(omissions["gryphon_metadata_asset_candidates"]), 2)
        self.assertTrue(all(item.endswith("metadata.json") for item in omissions["gryphon_metadata_asset_candidates"]))
        self.assertEqual(len(omissions["historical_src_lib_games_records"]), 7)
        self.assertTrue(all("/src/lib/games/" in item for item in omissions["historical_src_lib_games_records"]))
        games = correction["per_game_reconciliation"]
        self.assertEqual(games["paladins-twin-soul"]["counts"], {"source_records": 8, "asset_candidates": 4, "historical_records": 11})
        self.assertEqual(games["gryphon-patrol"]["counts"], {"source_records": 14, "asset_candidates": 5, "historical_records": 10})
        for artifact in correction["supersession"]["preserved_historical_artifacts"]:
            self.assertEqual(file_sha(ROOT / artifact["path"]), artifact["sha256"])
        self.assertFalse(correction["lifecycle"]["candidate_authorized"])
        self.assertFalse(correction["lifecycle"]["acceptance_authorized"])

    def test_asset_audit_reconciles_all_nine_candidates_without_suitability_claims(self) -> None:
        """Requires a nine-item asset inventory and bounded treatment of the two newly enumerated metadata files."""
        audit_path = TRACK_DIR / "batch-c-asset-usage-audit-v4.json"
        self.assertTrue(audit_path.is_file(), "EXPECTED_RED[DENOM-002]: corrected asset audit absent")
        audit = load(audit_path)
        asset_records = selected_records(load(ASSET_DENOMINATOR)["candidate_files"], "canonical_path")
        paths = [record["canonical_path"] for record in asset_records]
        correction_input = audit["inputs"]["denominator_correction"]
        self.assertEqual(file_sha(ROOT / correction_input["path"]), correction_input["sha256"])
        self.assertEqual(audit["reconciliation"]["accepted_candidate_count"], 9)
        self.assertEqual(audit["reconciliation"]["candidate_paths"], paths)
        self.assertEqual(audit["reconciliation"]["candidate_paths_sha256"], canonical_list_sha(paths))
        self.assertEqual({item["path"] for item in audit["newly_enumerated_candidates"]}, set(audit["prior_omissions"]))
        self.assertTrue(all(item["actual_class"].startswith("JSON object:") for item in audit["newly_enumerated_candidates"]))
        self.assertFalse(audit["claims"]["asset_suitability_claimed"])
        self.assertFalse(audit["claims"]["runtime_usage_claimed"])
        self.assertFalse(audit["lifecycle"]["candidate_authorized"])


class BatchCFreshContextReceiptContract(unittest.TestCase):
    """Contract C4: all eight selected roles have retained provider-attested fresh-context evidence."""

    def test_selected_receipts_have_verifiable_fresh_context_proofs(self) -> None:
        """Checks authoritative selection, truthful per-entry provenance, proof bytes, and rederivation evidence."""
        selection_path = TRACK_DIR / "batch-c-role-receipt-selection-v6.json"
        self.assertTrue(selection_path.is_file(), "EXPECTED_RED[MED-001]: v6 receipt selection absent")
        selection = load(selection_path)
        entries = selection["selected_receipts"]
        self.assertEqual({entry["task_id"] for entry in entries}, set(EXPECTED_ROLES))
        self.assertEqual(len(entries), 8)
        self.assertEqual(len({entry["provider_identifier"] for entry in entries}), 8)
        self.assertEqual(len({(entry["provider_identifier"], entry["parent_task"]) for entry in entries}), 8)
        for entry in entries:
            self.assertEqual(entry["role"], EXPECTED_ROLES[entry["task_id"]])
            self.assertIsInstance(entry["parent_task"], str)
            self.assertTrue(entry["parent_task"].strip())
            receipt_path = ROOT / entry["receipt_path"]
            proof_path = ROOT / entry["proof_path"]
            self.assertTrue(receipt_path.is_file())
            self.assertTrue(proof_path.is_file())
            self.assertEqual(file_sha(receipt_path), entry["receipt_sha256"])
            self.assertEqual(file_sha(proof_path), entry["proof_sha256"])
            receipt = load(receipt_path)
            proof = load(proof_path)
            provenance = receipt["provider_provenance"]
            self.assertTrue(provenance["available"])
            self.assertEqual(provenance["fork_turns"], "none")
            self.assertEqual(provenance["provider_identifier"], entry["provider_identifier"])
            self.assertEqual(provenance["parent_task"], entry["parent_task"])
            self.assertEqual(receipt["retained_proof"]["path"], entry["proof_path"])
            self.assertEqual(receipt["retained_proof"]["sha256"], entry["proof_sha256"])
            self.assertEqual(proof["task_id"], entry["task_id"])
            self.assertEqual(proof["role"], entry["role"])
            self.assertEqual(proof["provider_identifier"], entry["provider_identifier"])
            self.assertEqual(proof["fork_turns"], "none")
            self.assertEqual(proof["parent_task"], entry["parent_task"])
            self.assertGreater(len(proof["commands"]), 0)
            for command in proof["commands"]:
                self.assertIsInstance(command["argv"], list)
                self.assertGreater(len(command["argv"]), 0)
                self.assertIsInstance(command["exit_code"], int)
                self.assertTrue(command.get("stdout") is not None or command.get("stdout_sha256"))
            self.assertEqual(proof["verification_result"], "pass")

        entries_by_task = {entry["task_id"]: entry for entry in entries}
        asset_collision = load(TRACK_DIR / "batch-c-asset-auditor-v4-collision.json")
        asset_entry = entries_by_task["C3-ASSET"]
        asset_collision_paths = {
            item["path"]
            for provider_set in asset_collision["provider_sets"]
            for item in provider_set["files"]
        }
        asset_collision_providers = {
            provider_set["provider_identifier"] for provider_set in asset_collision["provider_sets"]
        }
        self.assertEqual(
            asset_entry["proof_path"],
            "measure/tracks/apk_corpus_audit_action_defense_20260712/role-proofs/asset-auditor-batch-c-v5.json",
        )
        self.assertEqual(
            asset_entry["receipt_path"],
            "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/asset-auditor-batch-c-v5.json",
        )
        self.assertEqual(asset_entry["provider_identifier"], "/root/t4_asset_v5_reaudit_terra")
        self.assertNotIn(asset_entry["provider_identifier"], asset_collision_providers)
        self.assertNotIn(asset_entry["proof_path"], asset_collision_paths)
        self.assertNotIn(asset_entry["receipt_path"], asset_collision_paths)

        mapper_collision = load(TRACK_DIR / "batch-c-gryphon-mapper-v5-collision.json")
        mapper_ownership = load(
            TRACK_DIR / "batch-c-gryphon-mapper-v6-root-arbiter-20260722-1718-8f2c-ownership.json"
        )
        mapper_entry = entries_by_task["C3-MAP-GRYPHON"]
        self.assertFalse(mapper_collision["arbitration"]["v5_selection_authorized"])
        self.assertEqual(mapper_entry["provider_identifier"], mapper_ownership["provider_identifier"])
        self.assertEqual(mapper_entry["parent_task"], mapper_ownership["parent_task"])
        self.assertEqual(mapper_entry["proof_path"], mapper_ownership["reserved_paths"][-2])
        self.assertEqual(mapper_entry["receipt_path"], mapper_ownership["reserved_paths"][-1])
        mapper_proof = load(ROOT / mapper_entry["proof_path"])
        mapper_receipt = load(ROOT / mapper_entry["receipt_path"])
        self.assertEqual(
            {item["path"] for item in mapper_proof["outputs"]},
            set(mapper_ownership["reserved_paths"]),
        )
        self.assertEqual(
            {item["path"] for item in mapper_receipt["outputs"]},
            set(mapper_ownership["reserved_paths"]),
        )
        for item in mapper_receipt["outputs"]:
            if item["sha256"] is not None:
                self.assertEqual(file_sha(ROOT / item["path"]), item["sha256"])

        browser_entry = entries_by_task["C3-BROWSER"]
        browser_proof = load(ROOT / browser_entry["proof_path"])
        browser_receipt = load(ROOT / browser_entry["receipt_path"])
        browser_audit_path = (
            "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-browser-audit-v4.json"
        )
        browser_audit_sha = "3472966cb0c31bfac60a48542f90d7ac76dc3e133a8439028151c64c09cffda3"
        browser_publication_revision = "e54d8211eabdfec2ae021f728968459812a244ac"
        self.assertEqual(browser_proof["supersession"]["committed_revision"], browser_publication_revision)
        self.assertEqual(browser_receipt["supersession"]["committed_revision"], browser_publication_revision)
        proof_browser_audit = next(
            item for item in browser_proof["committed_evidence"] if item["path"] == browser_audit_path
        )
        self.assertEqual(proof_browser_audit["revision"], browser_publication_revision)
        self.assertEqual(proof_browser_audit["sha256"], browser_audit_sha)
        self.assertEqual(browser_receipt["committed_evidence"][browser_audit_path], browser_audit_sha)


class BatchCImmutableBrowserContract(unittest.TestCase):
    """Contract C4: the fresh browser run is tied to an immutable served revision with retained logs and screenshots."""

    def test_browser_run_binds_revision_commands_logs_and_screenshot_bytes(self) -> None:
        """Requires immutable runtime identity, exact commands, logs, both viewports, and rederived screenshot hashes."""
        audit_path = TRACK_DIR / "batch-c-browser-audit-v4.json"
        self.assertTrue(audit_path.is_file(), "EXPECTED_RED[HIGH-002]: immutable browser audit absent")
        audit = load(audit_path)
        runtime = audit["immutable_runtime"]
        revision = runtime["revision"]
        check = subprocess.run(["git", "cat-file", "-e", f"{revision}^{{commit}}"], cwd=ROOT, check=False)
        self.assertEqual(check.returncode, 0)
        self.assertEqual(runtime["worktree_status"], "clean")
        self.assertTrue(runtime["build_id"])
        for field in ("build_command", "start_command", "health_check_command", "navigation_command"):
            self.assertIsInstance(audit["exact_commands"][field], str)
            self.assertTrue(audit["exact_commands"][field].strip())
        for record in (audit["server_log"], audit["browser_console_log"], audit["browser_network_log"]):
            path = ROOT / record["path"]
            self.assertTrue(path.is_file())
            self.assertEqual(file_sha(path), record["sha256"])
        screenshots = audit["screenshots"]
        self.assertEqual({item["viewport"] for item in screenshots}, {"compact", "wide"})
        for item in screenshots:
            path = ROOT / item["path"]
            self.assertTrue(path.is_file())
            self.assertGreater(path.stat().st_size, 0)
            self.assertEqual(file_sha(path), item["sha256"])


if __name__ == "__main__":
    unittest.main()
