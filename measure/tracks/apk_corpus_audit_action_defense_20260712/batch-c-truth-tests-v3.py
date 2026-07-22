"""Fail-closed Batch C v3 truth contracts with semantic browser and asset C4 gates."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import subprocess
import unittest
from pathlib import Path
from typing import Any


TRACK = "apk_corpus_audit_action_defense_20260712"
PHASE_BASE = "709b0c69608312aa5d784fcc9c1b74870ce697e0"
SOURCE_BASE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
ROLE_BASE = "7fb3e4b6e263b9b749a8ed3d75ffd73d5dcbe46a"
HERE = Path(__file__).resolve()
ROOT = HERE.parents[3]
TRACK_DIR = HERE.parent
RECEIPT = TRACK_DIR / "role-receipts/truth-test-author-batch-c-v3.json"
RESOURCE_FIELDS = (
    "source_bytes_read", "source_files_or_objects_read", "command_invocations",
    "elapsed_minutes", "records_authored_or_reviewed", "browser_interactions",
    "browser_artifacts_captured", "asset_candidates_inspected",
)
ROUTES = (
    "/",
    "/en/student/arcade/paladins-twin-soul",
    "/en/student/arcade/gryphon-patrol",
    "/en/student/games/vocabulary/paladins-twin-soul",
    "/en/student/games/sentence/gryphon-patrol",
)
VIEWPORTS = {"compact": (390, 844), "wide": (1440, 900)}


def sha(data: bytes) -> str:
    """Calculates the SHA-256 digest of exact bytes.

    Contract: byte identity is checked without normalization.
    fails_when: the supplied bytes differ from the declared digest source.
    """
    return hashlib.sha256(data).hexdigest()


def file_sha(path: Path) -> str:
    """Calculates a file's SHA-256 digest.

    Contract: authoritative artifact references bind exact on-disk bytes.
    fails_when: an artifact is missing or its bytes mutate.
    """
    return sha(path.read_bytes())


def load(relative: str) -> Any:
    """Loads a Batch C JSON artifact.

    Contract: semantic gates consume parseable track-local JSON only.
    fails_when: the named artifact is absent or malformed.
    """
    return json.loads((TRACK_DIR / relative).read_text())


def git_bytes(revision: str, path: str) -> bytes:
    """Reads an exact Git object.

    Contract: asset identities are re-derived at the frozen source revision.
    fails_when: the revision/path is unavailable or Git reports an error.
    """
    result = subprocess.run(["git", "show", f"{revision}:{path}"], cwd=ROOT, capture_output=True, check=False)
    if result.returncode:
        raise AssertionError(f"git show failed for {revision}:{path}: {result.stderr.decode(errors='replace')}")
    return result.stdout


def git_oid(revision: str, path: str) -> str:
    """Returns a Git object's blob identifier.

    Contract: recorded asset object identities are mechanically reproducible.
    fails_when: Git cannot resolve the frozen revision/path object.
    """
    result = subprocess.run(["git", "rev-parse", f"{revision}:{path}"], cwd=ROOT, capture_output=True, text=True, check=False)
    if result.returncode:
        raise AssertionError(f"git rev-parse failed for {revision}:{path}: {result.stderr}")
    return result.stdout.strip()


def assert_receipt_budget(case: unittest.TestCase, receipt: dict[str, Any], role: str) -> None:
    """Checks the receipt's exact labeled resource accounting against its frozen ceiling.

    Contract: receipts contain eight non-malformed integer actuals within the assigned role ceiling.
    fails_when: a field is missing, non-integer, negative, or over budget.
    """
    budget = load("batch-c-budget-declaration.json")
    actual = receipt.get("resource_actual", receipt.get("resource_budget", {}).get("actual"))
    case.assertEqual(set(actual), set(RESOURCE_FIELDS))
    ceiling = budget["role_ceilings"][role]
    for field in RESOURCE_FIELDS:
        case.assertIs(type(actual[field]), int, field)
        case.assertGreaterEqual(actual[field], 0, field)
        case.assertLessEqual(actual[field], ceiling[field], field)


_SPEC = importlib.util.spec_from_file_location("batch_c_truth_tests_v2", TRACK_DIR / "batch-c-truth-tests-v2.py")
if _SPEC is None or _SPEC.loader is None:
    raise RuntimeError("v2 truth suite cannot be loaded")
V2 = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(V2)


class BatchCFreezeContract(V2.BatchCFreezeContract):
    """Contract C0: v2 freeze and semantic-supersession assertions are re-executed; fails_when any immutable binding drifts."""


class BatchCCollectorPackageContract(V2.BatchCCollectorPackageContract):
    """Contract C1: v2 source-boundary and denominator assertions are re-executed; fails_when collector evidence changes scope or accounting."""


class BatchCMapperPackageContract(V2.BatchCMapperPackageContract):
    """Contract C2: v2 mapping and fixture-promotion assertions are re-executed; fails_when coverage is omitted, duplicated, or promoted."""


class BatchCClaimTruthContract(V2.BatchCClaimTruthContract):
    """Contract C3: v2 source-envelope and atomic-proposition assertions are re-executed; fails_when cited bytes or assertions do not re-derive."""


class BatchCNegativeFixtureContract(V2.BatchCNegativeFixtureContract):
    """Contract C3: v2 negative-fixture assertions are re-executed; fails_when a rejected fixture becomes supported evidence."""


class BatchCReceiptContract(V2.BatchCReceiptContract):
    """Contract C0-C3: v2 collector, mapper, and receipt assertions are re-executed; fails_when their bindings or resource records drift."""


class BatchCBrowserContract(unittest.TestCase):
    """Contract C4: only additive v3 Chrome/CDP observations prove the bounded non-runnable browser disposition; fails_when routes, bindings, provenance, evidence, or budget are incomplete."""

    def test_v3_browser_disposition_is_complete_bounded_and_provenanced(self) -> None:
        """Requires all route/viewport observations and prohibits a browser or responsive success claim.

        Contract: v3 has exactly five routes at two viewports, real-CDP provenance, pointer input, artifacts, and bounded 200/404 evidence.
        fails_when: v1/v2 is selected, observations are missing/vacuous, or success/global-absence language is claimed.
        """
        audit = load("batch-c-browser-audit-v3.json")
        receipt = load("role-receipts/browser-auditor-batch-c-v3.json")
        self.assertEqual((audit["role"], audit["phase_base_sha"], audit["source_baseline_revision"]), ("browser-auditor-batch-c-v3", PHASE_BASE, SOURCE_BASE))
        self.assertEqual((receipt["role"], receipt["phase_base_sha"], receipt["source_baseline_revision"]), ("browser-auditor-batch-c-v3", PHASE_BASE, SOURCE_BASE))
        supersedes = audit["supersession"]["supersedes"]
        self.assertEqual([item["path"].rsplit("/", 1)[-1] for item in supersedes], ["batch-c-browser-audit.json", "batch-c-browser-audit-v2.json"])
        for item in supersedes:
            self.assertEqual(file_sha(ROOT / item["path"]), item["sha256"])
        self.assertEqual(receipt["outputs"][str((TRACK_DIR / "batch-c-browser-audit-v3.json").relative_to(ROOT))], file_sha(TRACK_DIR / "batch-c-browser-audit-v3.json"))
        self.assertIsNone(receipt["outputs"][str((TRACK_DIR / "role-receipts/browser-auditor-batch-c-v3.json").relative_to(ROOT))])
        self.assertTrue(receipt["browser_provenance"]["real_browser"])
        self.assertIn("Chrome/", audit["environment"]["browser"])
        self.assertIn("ws://", audit["environment"]["cdp"])
        self.assertIn("CDP", audit["environment"]["mechanism"])
        self.assertEqual({item["name"]: (item["width"], item["height"]) for item in audit["viewports"]}, VIEWPORTS)
        observations = audit["observations"]
        self.assertEqual(len(observations), 10)
        self.assertEqual({(item["route"], item["viewport"]) for item in observations}, {(route, viewport) for route in ROUTES for viewport in VIEWPORTS})
        for item in observations:
            self.assertEqual(item["requested_url"], item["final_url"])
            self.assertTrue(item["document_title"])
            self.assertTrue(item["visible_body_text"])
            expected = 200 if item["route"] == "/" else 404
            self.assertEqual(item["main_document_response"]["status"], expected)
            self.assertIn("http://127.0.0.1:3117" + item["route"], item["final_url"])
            if expected == 404:
                self.assertIn("404", item["document_title"])
                self.assertIn("404", item["visible_body_text"])
        self.assertIn("CDP Input.dispatchMouseEvent", audit["real_input_observation"]["method"])
        self.assertGreater(receipt["browser_provenance"]["real_pointer_interactions"], 0)
        self.assertGreater(receipt["browser_provenance"]["retained_screenshots"], 0)
        disposition = audit["bounded_non_runnable_disposition"]
        self.assertTrue(disposition["no_browser_success"])
        self.assertTrue(disposition["no_responsive_success"])
        self.assertIn("not global", disposition["limit"].lower())
        self.assertFalse(receipt["scope_attestation"]["browser_success_claimed"])
        self.assertFalse(receipt["scope_attestation"]["responsive_success_claimed"])
        assert_receipt_budget(self, receipt, "browser-auditor-batch-c")
        self.assertGreater(receipt["resource_budget"]["actual"]["browser_interactions"], 0)
        self.assertGreater(receipt["resource_budget"]["actual"]["browser_artifacts_captured"], 0)


class BatchCAssetContract(unittest.TestCase):
    """Contract C4: every discovery asset candidate is exactly reconciled without suitability, licensing, or runtime-loading overclaim; fails_when identity, references, unknowns, receipt, or budget drift."""

    def test_every_discovery_asset_is_reconciled_once_with_bounded_claims(self) -> None:
        """Re-derives candidate object hashes/classes and validates the asset receipt.

        Contract: seven unique discovery paths map one-to-one to complete, bounded asset records at the frozen baseline.
        fails_when: counts are vacuous, paths repeat/omit, identity fields differ, or forbidden conclusions are asserted.
        """
        audit = load("batch-c-asset-usage-audit.json")
        receipt = load("role-receipts/asset-auditor-batch-c.json")
        discovery = load("batch-c-discovery-audit.json")
        self.assertEqual((audit["role"], audit["phase_base_sha"], audit["source_baseline_revision"]), ("asset-auditor-batch-c", PHASE_BASE, SOURCE_BASE))
        self.assertEqual((receipt["role"], receipt["phase_base_sha"], receipt["source_baseline_revision"]), ("asset-auditor-batch-c", PHASE_BASE, SOURCE_BASE))
        expected_paths = discovery["denominator_reconciliation"]["asset_candidates"]
        candidates = audit["candidates"]
        self.assertEqual(len(expected_paths), 7)
        self.assertEqual(audit["reconciliation"]["accepted_candidate_count"], 7)
        self.assertEqual(audit["reconciliation"]["unique_candidate_path_count"], 7)
        self.assertEqual(audit["validation"]["candidate_count"], 7)
        self.assertEqual(audit["validation"]["unique_paths"], 7)
        self.assertEqual([item["path"] for item in candidates], expected_paths)
        self.assertEqual(len({item["candidate_id"] for item in candidates}), 7)
        self.assertEqual(len({item["path"] for item in candidates}), 7)
        self.assertEqual(audit["reconciliation"]["duplicate_candidate_paths"], [])
        for item in candidates:
            blob = git_bytes(item["revision"], item["path"])
            self.assertEqual(item["revision"], SOURCE_BASE)
            self.assertEqual(sha(blob), item["blob_sha256"])
            self.assertEqual(git_oid(item["revision"], item["path"]), item["git_blob_oid"])
            self.assertEqual(len(blob), item["byte_size"])
            self.assertTrue(item.get("actual_class") or item.get("actual_format"))
            self.assertTrue(item["source_usage"])
            self.assertTrue(item["state_or_surface"])
            self.assertTrue(item["duplicates_or_conflicts"])
            self.assertTrue(item["bounded_unknowns"])
            self.assertIn("runtime", " ".join(item["bounded_unknowns"]).lower())
        boundary = audit["scope_boundary"].lower()
        for forbidden in ("suitability", "licensing", "runtime loading"):
            self.assertIn(forbidden, boundary)
        asset_path = str((TRACK_DIR / "batch-c-asset-usage-audit.json").relative_to(ROOT))
        receipt_path = str((TRACK_DIR / "role-receipts/asset-auditor-batch-c.json").relative_to(ROOT))
        self.assertEqual(receipt["exact_inputs"][asset_path], file_sha(TRACK_DIR / "batch-c-asset-usage-audit.json"))
        self.assertEqual(receipt["outputs"][asset_path], file_sha(TRACK_DIR / "batch-c-asset-usage-audit.json"))
        self.assertIsNone(receipt["outputs"][receipt_path])
        self.assertFalse(receipt["provider_provenance"]["available"])
        self.assertIsNone(receipt["provider_provenance"]["provider_identifier"])
        assert_receipt_budget(self, receipt, "asset-auditor-batch-c")
        self.assertGreater(receipt["resource_actual"]["asset_candidates_inspected"], 0)


class BatchCIndependentReviewContract(V2.BatchCIndependentReviewContract):
    """Contract C5: an independently owned fresh review and receipt must exist; fails_when either is absent or has unresolved material findings."""


class BatchCAcceptanceContract(V2.BatchCAcceptanceContract):
    """Contract C5: ordered candidate, acceptance, and accepted-manifest artifacts must exist; fails_when any lifecycle artifact is absent."""


if __name__ == "__main__":
    unittest.main()
