"""Fail-closed producer truth gates for Batch C Phase 3 remediation V2."""

from __future__ import annotations

import hashlib
import json
import subprocess
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = Path(__file__).resolve().parent
PACKAGE_DIR = TRACK_DIR / "packages/catalog/sorcerer-ziggurat"
RECEIPTS_DIR = TRACK_DIR / "role-receipts"
DENOMINATOR_DIR = REPO_ROOT / "measure/archive/apk_source_denominator_inventory_20260712"
SOURCE_BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
HISTORICAL_REVISION = "1a21fb951e27bb4df8a5e8f7b1685cea9e6efb9f"
PRODUCER_COMMIT = "84d280c9660b6aadfa91ce00e4190e815f9f7dd3"
BASELINE_REVIEW_COMMIT = "5a4c2cf6b1988c1f663825a28022c4cff7f75bb6"

BASE_LEDGER = PACKAGE_DIR / "claim-evidence-ledger.json"
LEDGER_V2 = PACKAGE_DIR / "claim-evidence-ledger-v2.json"
DENOMINATOR_V2 = PACKAGE_DIR / "denominator-reconciliation-v2.json"
ASSETS_V2 = PACKAGE_DIR / "asset-evidence-v2.json"
MAP_V2 = PACKAGE_DIR / "requirements-map-v2.json"
BROWSER_V2 = PACKAGE_DIR / "browser-audit-v2.json"
FUTURE_REVIEW = TRACK_DIR / "batch-c-future-review-binding-v2.json"
CONTEXTS = TRACK_DIR / "batch-c-producer-context-manifests-v2.json"
TRUTH_RECEIPT = RECEIPTS_DIR / "truth-test-author-batch-c-v2.json"

PRODUCER_RECEIPTS = {
    "evidence-collector": RECEIPTS_DIR / "evidence-collector-sorcerer-ziggurat-batch-c-v2.json",
    "requirements-mapper": RECEIPTS_DIR / "requirements-mapper-sorcerer-ziggurat-batch-c-v2.json",
    "browser-auditor": RECEIPTS_DIR / "browser-auditor-sorcerer-ziggurat-batch-c-v2.json",
}

ORIGINAL_PRODUCER_PATHS = [
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/batch-c-truth-tests.py",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/sorcerer-ziggurat/browser-audit.json",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/sorcerer-ziggurat/claim-evidence-ledger.json",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/sorcerer-ziggurat/current-source-observations.json",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/sorcerer-ziggurat/evidence-final-report.json",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/sorcerer-ziggurat/evidence-method.md",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/sorcerer-ziggurat/historical-source-observations.json",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/sorcerer-ziggurat/negative-fixtures.json",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/sorcerer-ziggurat/requirements-final-report.json",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/sorcerer-ziggurat/requirements-map.json",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/role-receipts/browser-auditor-sorcerer-ziggurat-batch-c.json",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/role-receipts/evidence-collector-sorcerer-ziggurat-batch-c.json",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/role-receipts/requirements-mapper-sorcerer-ziggurat-batch-c.json",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/role-receipts/truth-test-author-batch-c.json",
]

COMMITTED_INPUT_MANIFEST_PATH = "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/batch-c-committed-input-manifest.json"
COMMITTED_INPUT_MANIFEST_COMMIT = "abb4b79820760e3bb57165b6dee5075b6584fda0"

ORIGINAL_REVIEW_PATHS = [
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/batch-c-independent-review.json",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/batch-c-stop-loss-tests.py",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/batch-c-stop-loss.json",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/role-receipts/adversarial-reviewer-sorcerer-ziggurat-batch-c.json",
]

PROVIDER_NULL_FIELDS = {
    "collaboration_tool_spawn_id",
    "provider_agent_id",
    "provider_session_id",
    "parent_ancestry_ids",
    "prompt_sha256",
    "allowed_input_manifest_sha256",
    "actual_context_manifest_sha256",
    "fork_turns",
    "raw_isolation_export_sha256",
    "start_event_id",
    "start_event_timestamp",
    "end_event_id",
    "end_event_timestamp",
    "final_response_sha256",
    "final_response_event_id",
    "commit_sha",
}


def load_json(path: Path) -> dict[str, Any]:
    """Loads one JSON object from a UTF-8 file."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path}: expected object")
    return value


def sha256(data: bytes) -> str:
    """Returns the SHA-256 digest for bytes."""
    return hashlib.sha256(data).hexdigest()


def file_hash(path: Path) -> str:
    """Returns the SHA-256 digest for one file."""
    return sha256(path.read_bytes())


def compact_hash(value: Any) -> str:
    """Hashes compact key-sorted UTF-8 JSON without ASCII escaping."""
    return sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode())


def git_show(revision: str, relative: str) -> bytes:
    """Returns exact bytes for one reachable Git object."""
    return subprocess.run(
        ["git", "show", f"{revision}:{relative}"],
        cwd=REPO_ROOT,
        capture_output=True,
        check=True,
    ).stdout


def cited_bytes(claim: dict[str, Any]) -> bytes:
    """Returns inclusive LF-preserving citation bytes for one claim."""
    blob = git_show(claim["source_revision"], claim["relative_path"])
    bounds = claim["inclusive_range"]
    return b"".join(blob.splitlines(keepends=True)[bounds["start_line"] - 1 : bounds["end_line"]])


def materialized_claims() -> list[dict[str, Any]]:
    """Materializes the additive V2 overrides and governance over immutable V1 claims."""
    base = load_json(BASE_LEDGER)["claims"]
    patch = load_json(LEDGER_V2)
    overrides = {row["claim_id"]: row for row in patch["claim_overrides"]}
    governing = {row["claim_id"]: row for row in patch["governing_claim_fields"]}
    result: list[dict[str, Any]] = []
    for original in base:
        claim = dict(original)
        override = dict(overrides.get(claim["claim_id"], {}))
        override.pop("claim_id", None)
        override.pop("atomicity_resolution", None)
        claim.update(override)
        claim.update(governing[claim["claim_id"]])
        result.append(claim)
    return result


def expected_truth_inputs() -> dict[str, str]:
    """Returns every governing, predecessor, producer, and prior-review input for the truth role."""
    relatives = [
        "measure/apk-evidence-cohort-protocol.md",
        "measure/apk-evidence-reconstruction-program.md",
        "measure/evidence-integrity-accepted-gate.json",
        "measure/product-owner-apk-provenance-direction-20260721.json",
        "measure/archive/apk_source_denominator_inventory_20260712/accepted-denominator-manifest.json",
        "measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json",
        "measure/archive/apk_source_denominator_inventory_20260712/source-denominator.json",
        "measure/archive/apk_source_denominator_inventory_20260712/asset-file-denominator.json",
        "measure/archive/apk_source_denominator_inventory_20260712/historical-source-denominator.json",
        "measure/archive/apk_source_denominator_inventory_20260712/game-identity-ledger.json",
        "measure/archive/apk_three_game_truth_pilot_20260712/accepted-pilot-manifest.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/plan.md",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/spec.md",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/test-strategy-phase0.md",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/phase0-discovery-audit.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/phase0-role-applicability.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/phase0-budget-declaration.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/product-owner-budget-accounting-direction-v3.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/product-owner-direction-batch-c-remediation.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/accepted-cohort-manifest-batch-a-v6.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/accepted-cohort-manifest-batch-b-v2.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/role-receipts/accepted-manifest-author-batch-a-v6.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/role-receipts/accepted-manifest-author-batch-b-v2.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/batch-c-independent-review.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/role-receipts/adversarial-reviewer-sorcerer-ziggurat-batch-c.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/batch-c-committed-input-manifest.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/batch-c-producer-context-manifests-v2.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/batch-c-future-review-binding-v2.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/sorcerer-ziggurat/claim-evidence-ledger.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/sorcerer-ziggurat/claim-evidence-ledger-v2.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/sorcerer-ziggurat/denominator-reconciliation-v2.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/sorcerer-ziggurat/asset-evidence-v2.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/sorcerer-ziggurat/requirements-map-v2.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/sorcerer-ziggurat/browser-audit-v2.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/role-receipts/evidence-collector-sorcerer-ziggurat-batch-c-v2.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/role-receipts/requirements-mapper-sorcerer-ziggurat-batch-c-v2.json",
        "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/role-receipts/browser-auditor-sorcerer-ziggurat-batch-c-v2.json",
    ]
    return {relative: file_hash(REPO_ROOT / relative) for relative in relatives}


class OriginalImmutabilityContract(unittest.TestCase):
    """Requires additive V2 remediation without edits to producer or review originals."""

    def test_original_producer_and_review_bytes_are_preserved(self) -> None:
        for relative in ORIGINAL_PRODUCER_PATHS:
            self.assertEqual((REPO_ROOT / relative).read_bytes(), git_show(PRODUCER_COMMIT, relative), relative)
        self.assertEqual(
            (REPO_ROOT / COMMITTED_INPUT_MANIFEST_PATH).read_bytes(),
            git_show(COMMITTED_INPUT_MANIFEST_COMMIT, COMMITTED_INPUT_MANIFEST_PATH),
            COMMITTED_INPUT_MANIFEST_PATH,
        )
        for relative in ORIGINAL_REVIEW_PATHS:
            self.assertEqual((REPO_ROOT / relative).read_bytes(), git_show(BASELINE_REVIEW_COMMIT, relative), relative)


class SourceSemanticAtomicityContract(unittest.TestCase):
    """Re-derives every materialized claim and every declared semantic atom."""

    def test_all_27_claims_have_complete_governance_and_exact_semantics(self) -> None:
        claims = materialized_claims()
        binding = load_json(FUTURE_REVIEW)
        self.assertEqual(len(claims), 27)
        self.assertEqual({row["claim_id"] for row in claims}, set(binding["claim_ids"]))
        self.assertIsNone(binding["reviewer_identity"])
        self.assertEqual(binding["reviewer_disposition"], "PENDING_FUTURE_INDEPENDENT_REVIEW")
        for claim in claims:
            for field in ("scene_or_state_id", "evidence_class", "discovery_method", "conflict_resolution", "future_review_binding_id"):
                self.assertIn(field, claim, f"{claim['claim_id']}:{field}")
            self.assertTrue(claim["evidence_class"])
            self.assertTrue(claim["discovery_method"])
            self.assertTrue(claim["conflict_resolution"])
            self.assertEqual(claim["future_review_binding_id"], binding["binding_id"])
            blob = git_show(claim["source_revision"], claim["relative_path"])
            selected = cited_bytes(claim)
            self.assertEqual(sha256(blob), claim["blob_sha256"], claim["claim_id"])
            self.assertEqual(sha256(selected), claim["cited_range_sha256"], claim["claim_id"])
            text = selected.decode("utf-8", errors="strict")
            self.assertGreater(len(claim["semantic_anchors"]), 0, claim["claim_id"])
            for atom in claim["semantic_anchors"]:
                self.assertIn(atom, text, f"{claim['claim_id']}:{atom}")

    def test_sz_hist_015_range_and_lookup_atom_are_atomic(self) -> None:
        claim = next(row for row in materialized_claims() if row["claim_id"] == "SZ-HIST-015")
        self.assertEqual(claim["inclusive_range"], {"start_line": 11, "end_line": 51})
        self.assertEqual(claim["cited_range_sha256"], "d451430c1424afc5401abdec72b18e5c38b0181b4237054a117352bc2ed84669")
        self.assertIn(b"nodes: Readonly<Record<string, StepGraphNode>>;", cited_bytes(claim))


class AcceptedDenominatorContract(unittest.TestCase):
    """Selects and reconciles the exact fifteen accepted authority rows."""

    def test_exact_15_compact_sorted_authority_row_hashes_and_dispositions(self) -> None:
        reconciliation = load_json(DENOMINATOR_V2)
        source = load_json(DENOMINATOR_DIR / "source-denominator.json")["records"]
        assets = load_json(DENOMINATOR_DIR / "asset-file-denominator.json")["candidate_files"]
        historical = load_json(DENOMINATOR_DIR / "historical-source-denominator.json")["records"]
        identities = load_json(DENOMINATOR_DIR / "game-identity-ledger.json")["identity_records"]
        selected = {
            "source-denominator.json": [row for row in source if "sorcerer-ziggurat" in json.dumps(row, sort_keys=True).lower()],
            "asset-file-denominator.json": [row for row in assets if row["canonical_path"] in {"apps/advantage-games/public/games/cover/cover-sorcerers-ziggurat.png", "apps/advantage-games/measure/tracks/sorcerer-ziggurat-compliance-audit_20260426/metadata.json"}],
            "historical-source-denominator.json": [row for row in historical if row["evidence"]["path"].startswith("packages/game-cartridges/src/cartridges/sorcerer-ziggurat/")],
            "game-identity-ledger.json": [row for row in identities if row["canonical_identity_id"] == "catalog/sorcerer-ziggurat"],
        }
        total = 0
        for authority, rows in selected.items():
            expected_hashes = sorted(compact_hash(row) for row in rows)
            recorded = reconciliation["rows"][authority]
            self.assertEqual([row["row_sha256"] for row in recorded], expected_hashes, authority)
            self.assertTrue(all(row["denominator_disposition"] == "include" for row in recorded))
            self.assertTrue(all(row["evidence_disposition"] and row["reason"] for row in recorded))
            total += len(recorded)
        self.assertEqual(total, 15)
        self.assertEqual(reconciliation["counts"]["total"], 15)
        self.assertEqual(reconciliation["counts"]["denominator_mismatches"], 0)


class AssetEvidenceContract(unittest.TestCase):
    """Verifies both accepted asset candidates without behavior or suitability promotion."""

    def test_cover_and_process_metadata_candidates_have_exact_bytes_and_boundaries(self) -> None:
        document = load_json(ASSETS_V2)
        self.assertEqual([row["candidate_class"] for row in document["candidates"]], ["current-catalog-referenced-cover-candidate", "current-process-metadata-candidate"])
        for candidate in document["candidates"]:
            blob = git_show(candidate["revision"], candidate["canonical_path"])
            self.assertEqual(sha256(blob), candidate["blob_sha256"])
            self.assertEqual(len(blob), candidate["byte_size"])
            self.assertIs(candidate["load_outcome_claimed"], False)
            self.assertIs(candidate["visual_suitability_claimed"], False)
            self.assertIs(candidate["browser_behavior_claimed"], False)
        self.assertIs(document["browser_run"], False)


class DeveloperEffortContract(unittest.TestCase):
    """Requires complete bounded current, historical, and excluded surface decomposition."""

    def test_current_catalog_schema_test_and_historical_exclusions_are_explicit(self) -> None:
        document = load_json(MAP_V2)
        rows = {row["path"]: row for row in document["developer_effort_decomposition"]}
        for path in (
            "apps/advantage-games/src/lib/gameCards.ts",
            "packages/domain/src/games/schema.ts",
            "apps/advantage-games/src/lib/games/api/completeRoute.adversarial.test.ts",
        ):
            self.assertIn(path, rows)
            self.assertTrue(rows[path]["disposition"].startswith("include-current"))
        for path in (
            "packages/game-cartridges/src/cartridges/sorcerer-ziggurat/definition.test.ts",
            "packages/game-cartridges/src/cartridges/sorcerer-ziggurat/systems.test.ts",
            "packages/game-cartridges/src/cartridges/sorcerer-ziggurat/index.ts",
        ):
            self.assertIn(path, rows)
            self.assertTrue(rows[path]["disposition"].startswith("exclude"))
            self.assertEqual(rows[path]["claim_ids"], [])
        self.assertEqual(len(rows), 12)
        self.assertFalse(any(document[key] for key in ("estimates_claimed", "priority_claimed", "reuse_claimed", "duration_claimed")))


class BrowserBoundaryContract(unittest.TestCase):
    """Ensures remediation records no browser, load, or visual-suitability evidence."""

    def test_browser_remains_unrun_and_all_behavior_unknown(self) -> None:
        audit = load_json(BROWSER_V2)
        self.assertEqual(audit["disposition"], "browser-current-behavior-unknown-not-run")
        self.assertIs(audit["browser_access"]["attempted"], False)
        self.assertIs(audit["browser_access"]["browser_run"], False)
        self.assertTrue(all(value == 0 for value in audit["counts"].values()))
        self.assertFalse(any(audit["asset_candidate_boundary"][key] for key in ("load_outcome_claimed", "visual_suitability_claimed", "browser_behavior_claimed")))


class LifecycleReceiptContract(unittest.TestCase):
    """Reproduces local contexts, outputs, budgets, timing, and unavailable provider fields."""

    def test_local_context_manifests_and_producer_receipts_are_exact(self) -> None:
        contexts = load_json(CONTEXTS)
        for role, receipt_path in PRODUCER_RECEIPTS.items():
            manifest = contexts["manifests"][role]
            self.assertEqual(compact_hash(manifest), contexts["manifest_sha256s"][role])
            for relative, digest in manifest["repository_files"].items():
                self.assertEqual(file_hash(REPO_ROOT / relative), digest, relative)
            for item in manifest["git_objects"]:
                blob = git_show(item["revision"], item["path"])
                self.assertEqual((sha256(blob), len(blob)), (item["sha256"], item["bytes"]))
            receipt = load_json(receipt_path)
            local = receipt["local_context_manifest"]
            self.assertEqual(local["file_sha256"], file_hash(CONTEXTS))
            self.assertEqual(local["allowed_input_manifest_sha256"], compact_hash(manifest))
            self.assertEqual(local["actual_context_manifest_sha256"], compact_hash(manifest))
            self.assertIs(local["allowed_equals_actual"], True)
            provider = receipt["provider_provenance"]
            self.assertIs(provider["available"], False)
            self.assertIs(provider["claimed"], False)
            self.assertTrue(all(provider[field] is None for field in PROVIDER_NULL_FIELDS), role)
            self.assertEqual(receipt["forbidden_roles_held"], [])
            self.assertEqual(len(receipt["prior_role_history"]), 1)
            prior = receipt["prior_role_history"][0]
            self.assertEqual(file_hash(REPO_ROOT / prior["receipt_path"]), prior["receipt_sha256"])
            for relative, digest in receipt["output_paths_and_sha256"].items():
                self.assertEqual(file_hash(REPO_ROOT / relative), digest, relative)

    def test_budget_actuals_are_exactly_enumerated_and_timing_is_batch_c_fallback_only(self) -> None:
        contexts = load_json(CONTEXTS)["manifests"]
        owner = load_json(TRACK_DIR / "product-owner-direction-batch-c-remediation.json")
        self.assertIn("Batch C", owner["timing_accounting_direction"]["scope"])
        prior = load_json(TRACK_DIR / "product-owner-budget-accounting-direction-v3.json")
        self.assertNotIn("batch-c", f"{prior.get('batch_id', '')} {prior.get('scope', '')}".lower())
        for role, receipt_path in PRODUCER_RECEIPTS.items():
            receipt = load_json(receipt_path)
            budget = receipt["budget"]
            manifest = contexts[role]
            expected_bytes = sum((REPO_ROOT / path).stat().st_size for path in manifest["repository_files"]) + sum(item["bytes"] for item in manifest["git_objects"])
            expected_objects = len(manifest["repository_files"]) + len(manifest["git_objects"])
            actual = budget["actual"]
            self.assertEqual(actual["source_bytes"], expected_bytes, role)
            self.assertEqual(actual["source_files_objects"], expected_objects, role)
            self.assertEqual(actual["commands"], len(budget["enumeration"]["commands"]), role)
            self.assertEqual(actual["captured_artifacts"], len(budget["enumeration"]["captured_artifacts"]), role)
            self.assertEqual(actual["browser_interactions"], len(budget["enumeration"]["browser_interactions"]), role)
            self.assertEqual(actual["elapsed_minutes"], 0)
            self.assertEqual(budget["timing_measurement"], "unavailable-in-harness")
            self.assertIn("fallback only", budget["timing_note"])
            self.assertIn("not elapsed-time", budget["timing_note"])
            for unit, ceiling in budget["ceiling"].items():
                self.assertIs(type(actual[unit]), int, f"{role}:{unit}")
                self.assertLessEqual(actual[unit], ceiling, f"{role}:{unit}")
        evidence = load_json(PRODUCER_RECEIPTS["evidence-collector"])["budget"]["actual"]
        mapper = load_json(PRODUCER_RECEIPTS["requirements-mapper"])["budget"]["actual"]
        browser = load_json(PRODUCER_RECEIPTS["browser-auditor"])["budget"]["actual"]
        self.assertEqual(evidence["records_authored_reviewed"], 27 + 1 + 15 + 2 + 1)
        self.assertEqual(mapper["records_authored_reviewed"], len(load_json(MAP_V2)["developer_effort_decomposition"]))
        self.assertEqual(browser["records_authored_reviewed"], 1)

    def test_truth_receipt_binds_exact_inputs_output_history_and_budget(self) -> None:
        receipt = load_json(TRUTH_RECEIPT)
        expected = expected_truth_inputs()
        self.assertEqual(receipt["input_hashes"], expected)
        self.assertEqual(receipt["allowed_input_manifest_sha256"], compact_hash(expected))
        self.assertEqual(receipt["actual_context_manifest_sha256"], compact_hash(expected))
        self.assertEqual(receipt["output_paths_and_sha256"][str(Path(__file__).resolve().relative_to(REPO_ROOT))], file_hash(Path(__file__)))
        provider = receipt["provider_provenance"]
        self.assertIs(provider["available"], False)
        self.assertIs(provider["claimed"], False)
        self.assertTrue(all(provider[field] is None for field in PROVIDER_NULL_FIELDS))
        self.assertEqual(len(receipt["prior_role_history"]), 1)
        prior = receipt["prior_role_history"][0]
        self.assertEqual(file_hash(REPO_ROOT / prior["receipt_path"]), prior["receipt_sha256"])
        budget = receipt["budget"]
        self.assertEqual(budget["actual"]["source_bytes"], sum((REPO_ROOT / path).stat().st_size for path in expected))
        self.assertEqual(budget["actual"]["source_files_objects"], len(expected))
        self.assertEqual(budget["actual"]["commands"], len(budget["enumeration"]["commands"]))
        self.assertEqual(budget["actual"]["records_authored_reviewed"], 12)
        self.assertEqual(budget["actual"]["captured_artifacts"], len(budget["enumeration"]["captured_artifacts"]))
        self.assertEqual(budget["actual"]["elapsed_minutes"], 0)
        self.assertEqual(budget["timing_measurement"], "unavailable-in-harness")
        self.assertIn("fallback only", budget["timing_note"])
        self.assertIn("not elapsed-time", budget["timing_note"])


class PredecessorAuthorReceiptContract(unittest.TestCase):
    """Binds accepted Batch A/B manifests through their exact author receipts."""

    def test_accepted_batch_a_and_b_author_receipts_bind_exact_manifests(self) -> None:
        pairs = [
            ("accepted-cohort-manifest-batch-a-v6.json", "accepted-manifest-author-batch-a-v6.json"),
            ("accepted-cohort-manifest-batch-b-v2.json", "accepted-manifest-author-batch-b-v2.json"),
        ]
        for manifest_name, receipt_name in pairs:
            manifest_path = TRACK_DIR / manifest_name
            receipt = load_json(RECEIPTS_DIR / receipt_name)
            validation = receipt["accepted_manifest_validation"]
            self.assertEqual(validation["path"], str(manifest_path.relative_to(REPO_ROOT)))
            self.assertEqual(validation["sha256"], file_hash(manifest_path))
            self.assertTrue(validation["json_valid"])
            self.assertTrue(load_json(manifest_path)["consumable"])
            self.assertIs(load_json(manifest_path)["revoked"], False)


class FailClosedCandidateOrderingContract(unittest.TestCase):
    """Keeps review, candidate, acceptance, and accepted-manifest stages absent."""

    def test_no_v2_review_or_later_lifecycle_artifact_exists(self) -> None:
        binding = load_json(FUTURE_REVIEW)
        self.assertEqual(binding["binding_state"], "pending")
        self.assertIsNone(binding["reviewer_identity"])
        self.assertIs(binding["review_claimed"], False)
        self.assertIs(binding["candidate_authorized"], False)
        forbidden = [
            TRACK_DIR / "batch-c-independent-review-v2.json",
            RECEIPTS_DIR / "adversarial-reviewer-sorcerer-ziggurat-batch-c-v2.json",
            TRACK_DIR / "candidate-cohort-manifest-batch-c.json",
            TRACK_DIR / "candidate-cohort-manifest-batch-c-v2.json",
            RECEIPTS_DIR / "candidate-author-batch-c.json",
            RECEIPTS_DIR / "candidate-author-batch-c-v2.json",
            TRACK_DIR / "product-owner-acceptance-batch-c.json",
            TRACK_DIR / "product-owner-acceptance-batch-c-v2.json",
            TRACK_DIR / "accepted-cohort-manifest-batch-c.json",
            TRACK_DIR / "accepted-cohort-manifest-batch-c-v2.json",
        ]
        self.assertEqual([str(path) for path in forbidden if path.exists()], [])


if __name__ == "__main__":
    unittest.main()
