"""Fail-closed truth contracts for Traversal Historical Batch C."""

from __future__ import annotations

import hashlib
import json
import subprocess
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = REPO_ROOT / "measure/tracks/apk_corpus_audit_traversal_exploration_20260712"
PACKAGE_DIR = TRACK_DIR / "packages/catalog/sorcerer-ziggurat"
RECEIPTS_DIR = TRACK_DIR / "role-receipts"
LEDGER_PATH = PACKAGE_DIR / "claim-evidence-ledger.json"
MAP_PATH = PACKAGE_DIR / "requirements-map.json"
FIXTURES_PATH = PACKAGE_DIR / "negative-fixtures.json"
BROWSER_PATH = PACKAGE_DIR / "browser-audit.json"
REVIEW_PATH = TRACK_DIR / "batch-c-independent-review.json"
REVIEW_RECEIPT_PATH = RECEIPTS_DIR / "adversarial-reviewer-sorcerer-ziggurat-batch-c.json"
CANDIDATE_PATH = TRACK_DIR / "candidate-cohort-manifest-batch-c.json"
CANDIDATE_RECEIPT_PATH = RECEIPTS_DIR / "candidate-author-batch-c.json"
COMMITTED_INPUT_MANIFEST_PATH = TRACK_DIR / "batch-c-committed-input-manifest.json"
CURRENT_REVISION = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
HISTORICAL_REVISION = "1a21fb951e27bb4df8a5e8f7b1685cea9e6efb9f"
ALLOWED_SOURCE_CLASSES = {
    "current_implementation",
    "historical_implementation",
    "active_specification",
    "active_design",
    "catalog_prose",
}


def load_json(path: Path) -> Any:
    """Loads one UTF-8 JSON document."""
    return json.loads(path.read_text(encoding="utf-8"))


def file_hash(path: Path) -> str:
    """Returns the SHA-256 digest of one file."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git_show(revision: str, path: str) -> bytes:
    """Returns exact bytes for one reachable Git object."""
    return subprocess.run(
        ["git", "show", f"{revision}:{path}"],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
    ).stdout


def range_bytes(blob: bytes, start: int, end: int) -> bytes:
    """Returns inclusive LF-preserving line bytes."""
    return b"".join(blob.splitlines(keepends=True)[start - 1 : end])


def receipt_hashes() -> dict[str, str]:
    """Returns selected producer receipt hashes."""
    names = [
        "evidence-collector-sorcerer-ziggurat-batch-c.json",
        "requirements-mapper-sorcerer-ziggurat-batch-c.json",
        "browser-auditor-sorcerer-ziggurat-batch-c.json",
        "truth-test-author-batch-c.json",
    ]
    return {str((RECEIPTS_DIR / name).relative_to(REPO_ROOT)): file_hash(RECEIPTS_DIR / name) for name in names}


def required_review_inputs() -> dict[str, str]:
    """Returns exact files the independent review must bind."""
    paths = [
        PACKAGE_DIR / "current-source-observations.json",
        PACKAGE_DIR / "historical-source-observations.json",
        PACKAGE_DIR / "claim-evidence-ledger.json",
        PACKAGE_DIR / "evidence-method.md",
        PACKAGE_DIR / "evidence-final-report.json",
        PACKAGE_DIR / "negative-fixtures.json",
        PACKAGE_DIR / "requirements-map.json",
        PACKAGE_DIR / "requirements-final-report.json",
        PACKAGE_DIR / "browser-audit.json",
        Path(__file__).resolve(),
        COMMITTED_INPUT_MANIFEST_PATH,
        REPO_ROOT / "measure/apk-evidence-cohort-protocol.md",
        REPO_ROOT / "measure/apk-evidence-reconstruction-program.md",
        REPO_ROOT / "measure/evidence-integrity-accepted-gate.json",
        REPO_ROOT / "measure/product-owner-apk-provenance-direction-20260721.json",
        REPO_ROOT / "measure/archive/apk_source_denominator_inventory_20260712/accepted-denominator-manifest.json",
        REPO_ROOT / "measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json",
        REPO_ROOT / "measure/archive/apk_three_game_truth_pilot_20260712/accepted-pilot-manifest.json",
        TRACK_DIR / "accepted-cohort-manifest-batch-a-v6.json",
        TRACK_DIR / "accepted-cohort-manifest-batch-b-v2.json",
        TRACK_DIR / "spec.md",
        TRACK_DIR / "test-strategy-phase0.md",
        TRACK_DIR / "phase0-role-applicability.json",
        TRACK_DIR / "phase0-budget-declaration.json",
    ]
    selected = {str(path.relative_to(REPO_ROOT)): file_hash(path) for path in paths}
    selected.update(receipt_hashes())
    return selected


class SourceEnvelopeContract(unittest.TestCase):
    """Exact current/historical source and chronology contracts."""

    def test_every_factual_claim_rederives_from_exact_git_bytes(self) -> None:
        """Fails on missing objects, range drift, or stale hashes."""
        ledger = load_json(LEDGER_PATH)
        claims = ledger["claims"]
        self.assertEqual(len(claims), 27)
        for claim in claims:
            blob = git_show(claim["source_revision"], claim["relative_path"])
            bounds = claim["inclusive_range"]
            cited = range_bytes(blob, bounds["start_line"], bounds["end_line"])
            self.assertEqual(hashlib.sha256(blob).hexdigest(), claim["blob_sha256"], claim["claim_id"])
            self.assertEqual(hashlib.sha256(cited).hexdigest(), claim["cited_range_sha256"], claim["claim_id"])
            self.assertIn(claim["source_class"], ALLOWED_SOURCE_CLASSES)

    def test_temporal_classes_are_explicit_and_never_promoted(self) -> None:
        """Fails when current, historical, design, prose, or unknown are conflated."""
        ledger = load_json(LEDGER_PATH)
        grouped: dict[str, int] = {}
        for claim in ledger["claims"]:
            grouped[claim["source_class"]] = grouped.get(claim["source_class"], 0) + 1
            if claim["source_class"] in {"historical_implementation", "active_design"}:
                self.assertEqual(claim["source_revision"], HISTORICAL_REVISION)
                self.assertIn("histor", claim["temporal_disposition"])
        self.assertEqual(grouped, {"catalog_prose": 1, "current_implementation": 3, "active_specification": 1, "historical_implementation": 21, "active_design": 1})
        self.assertEqual(ledger["explicit_unknown"]["source_class"], "unknown")
        self.assertIsNone(ledger["explicit_unknown"]["citation"])

    def test_historical_revision_is_reachable_and_precedes_withdrawal(self) -> None:
        """Fails when the historical object is unreachable or chronology changes."""
        self.assertEqual(
            subprocess.run(["git", "merge-base", "--is-ancestor", HISTORICAL_REVISION, CURRENT_REVISION], cwd=REPO_ROOT).returncode,
            0,
        )
        history = load_json(PACKAGE_DIR / "historical-source-observations.json")
        self.assertEqual(history["chronology"]["withdrawal_parent"], HISTORICAL_REVISION)
        self.assertIn("withdraw invalid", history["chronology"]["withdrawal_subject"])

    def test_current_absence_is_bounded_not_global(self) -> None:
        """Fails when one empty candidate directory becomes a global absence claim."""
        current = load_json(PACKAGE_DIR / "current-source-observations.json")
        search = current["bounded_absence_search"]
        result = subprocess.run(search["command"].split(), cwd=REPO_ROOT, capture_output=True)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, b"")
        self.assertEqual(hashlib.sha256(result.stdout).hexdigest(), search["stdout_sha256"])
        self.assertIn("bounded", search["disposition"].lower())
        self.assertIn("outside", " ".join(current["unknowns"]).lower())


class SemanticAndMappingContract(unittest.TestCase):
    """Claim atomicity, fixtures, and no-new-fact mapping contracts."""

    def test_claim_ids_are_unique_and_contract_fields_are_complete(self) -> None:
        """Fails on duplicate IDs or incomplete atomic records."""
        claims = load_json(LEDGER_PATH)["claims"]
        required = {"claim_id", "game", "category", "source_class", "source_revision", "relative_path", "inclusive_range", "blob_sha256", "cited_range_sha256", "source_fact", "interpretation", "confidence", "collector_id", "conflict_state", "temporal_disposition"}
        self.assertEqual(len({claim["claim_id"] for claim in claims}), len(claims))
        for claim in claims:
            self.assertTrue(required.issubset(claim), claim["claim_id"])
            self.assertEqual(len(claim["blob_sha256"]), 64)
            self.assertEqual(len(claim["cited_range_sha256"]), 64)

    def test_six_unsupported_inference_classes_fail_closed(self) -> None:
        """Fails when a fixture is counted as fact or allowed."""
        fixtures = load_json(FIXTURES_PATH)["fixtures"]
        self.assertEqual(len(fixtures), 6)
        self.assertEqual(len({item["kind"] for item in fixtures}), 6)
        for fixture in fixtures:
            self.assertEqual(fixture["expected_disposition"], "reject")
            self.assertIs(fixture["counts_as_claim"], False)

    def test_mapping_covers_all_claims_and_unknown_without_novel_facts(self) -> None:
        """Fails on unmapped claims, fixture contamination, or novel facts."""
        ledger = load_json(LEDGER_PATH)
        mapping = load_json(MAP_PATH)
        factual_ids = {claim["claim_id"] for claim in ledger["claims"]}
        mapped_ids = {claim_id for record in mapping["records"] for claim_id in record["claim_ids"]}
        self.assertEqual(factual_ids | {"SZ-UNK-001"}, mapped_ids)
        self.assertEqual(mapping["counts"]["novel_factual_claims"], 0)
        self.assertEqual(mapping["counts"]["negative_fixture_references"], 0)
        self.assertEqual(mapping["counts"]["ontology_decisions"], 0)


class BrowserAndReceiptContract(unittest.TestCase):
    """Bounded browser-unknown, provenance, and budget contracts."""

    def test_browser_record_claims_only_known_non_run_disposition(self) -> None:
        """Fails when absent browser work becomes behavior evidence."""
        audit = load_json(BROWSER_PATH)
        self.assertEqual(audit["disposition"], "browser-current-behavior-unknown-not-run")
        self.assertIs(audit["browser_access"]["attempted"], False)
        self.assertTrue(all(value == 0 for value in audit["counts"].values()))
        self.assertIn("remain unknown", audit["unknown_and_not_claimed"])
        self.assertIs(audit["historical_promotion_prohibited"], True)

    def test_producer_receipts_bind_exact_outputs_and_do_not_claim_provider_attestation(self) -> None:
        """Fails on stale local bindings or fabricated provider provenance."""
        manifest = load_json(COMMITTED_INPUT_MANIFEST_PATH)
        publication_commit = manifest["publication_commit_sha"]
        self.assertEqual(manifest["receipt_hashes"], receipt_hashes())
        for relative, digest in manifest["selected_input_hashes"].items():
            path = REPO_ROOT / relative
            self.assertEqual(file_hash(path), digest, relative)
            self.assertEqual(git_show(publication_commit, relative), path.read_bytes(), relative)
        for name in ["evidence-collector-sorcerer-ziggurat-batch-c.json", "requirements-mapper-sorcerer-ziggurat-batch-c.json", "browser-auditor-sorcerer-ziggurat-batch-c.json", "truth-test-author-batch-c.json"]:
            receipt = load_json(RECEIPTS_DIR / name)
            self.assertIs(receipt["provider_provenance"]["available"], False)
            self.assertIs(receipt["provider_provenance"]["claimed"], False)
            self.assertEqual(receipt["forbidden_roles_held"], [])
            outputs = receipt.get("output_paths_and_sha256", {})
            if receipt.get("output_path"):
                outputs[receipt["output_path"]] = receipt["output_sha256"]
            for relative, digest in outputs.items():
                self.assertEqual(file_hash(REPO_ROOT / relative), digest, relative)
            budget = receipt["budget"]
            for key, ceiling in budget["ceiling"].items():
                self.assertIsInstance(budget["actual"][key], int)
                self.assertLessEqual(budget["actual"][key], ceiling, f"{name}:{key}")


class ReviewAndCandidateContract(unittest.TestCase):
    """Fresh-review and non-consumable candidate contracts."""

    def test_review_rederives_every_claim_fixture_and_binding_with_zero_blockers(self) -> None:
        """Fails while the exact independent review is absent, stale, or blocked."""
        review = load_json(REVIEW_PATH)
        receipt = load_json(REVIEW_RECEIPT_PATH)
        self.assertEqual(review["input_hashes"], required_review_inputs())
        self.assertEqual(receipt["input_hashes"], required_review_inputs())
        self.assertEqual(review["claims_rederived"], 27)
        self.assertEqual(review["fixtures_rederived"], 6)
        self.assertEqual(review["source_blob_hash_matches"], 27)
        self.assertEqual(review["source_range_hash_matches"], 27)
        self.assertEqual({key: review["unresolved_findings"][key] for key in ("critical", "high", "medium")}, {"critical": 0, "high": 0, "medium": 0})
        self.assertIs(review["candidate_authorized"], True)
        self.assertIs(review["product_owner_acceptance_authorized"], False)

    def test_candidate_is_exactly_bound_non_consumable_and_stops_before_acceptance(self) -> None:
        """Fails when candidate bindings drift or acceptance is fabricated."""
        candidate = load_json(CANDIDATE_PATH)
        receipt = load_json(CANDIDATE_RECEIPT_PATH)
        self.assertIs(candidate["consumable"], False)
        self.assertIs(candidate["acceptance_claimed"], False)
        self.assertEqual(candidate["status"], "candidate-awaiting-product-owner-acceptance")
        self.assertEqual(candidate["review_binding"]["sha256"], file_hash(REVIEW_PATH))
        self.assertEqual(candidate["review_binding"]["receipt_sha256"], file_hash(REVIEW_RECEIPT_PATH))
        self.assertEqual(candidate["input_hashes"], required_review_inputs())
        self.assertEqual(receipt["candidate_sha256"], file_hash(CANDIDATE_PATH))
        self.assertFalse((TRACK_DIR / "product-owner-acceptance-batch-c.json").exists())
        self.assertFalse((TRACK_DIR / "accepted-cohort-manifest-batch-c.json").exists())
        self.assertIs(candidate["lifecycle"]["product_owner_acceptance_published"], False)
        self.assertIs(candidate["lifecycle"]["accepted_manifest_published"], False)


if __name__ == "__main__":
    unittest.main()
