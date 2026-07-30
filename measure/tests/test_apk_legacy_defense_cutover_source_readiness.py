"""Guards the archive-aware, evidence-only source manifest for Legacy Defense Task 1."""

from __future__ import annotations

import copy
import hashlib
import json
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ROOT = REPO_ROOT / "measure/tracks/apk_legacy_defense_cutover_20260727"
MANIFEST_PATH = TRACK_ROOT / "task1-source-readiness-manifest-v1.json"
TRACK_ID = "apk_legacy_defense_cutover_20260727"

EXPECTED_BINDINGS = {
    "accepted_readiness_receipt": {
        "archive_preferred_path": "measure/archive/apk_denominator_readiness_t11_integrity_20260727/accepted-readiness-receipt-v1.json",
        "receipt_declared_path": "measure/tracks/apk_denominator_readiness_t11_integrity_20260727/accepted-readiness-receipt-v1.json",
        "sha256": "d371fc5df05922d5f1bbb50b837c0fd5314d8f136e2c699510c84186447f1720",
    },
    "phase1_crosswalk": {
        "archive_preferred_path": "measure/archive/apk_denominator_readiness_t11_integrity_20260727/phase1-denominator-crosswalk.json",
        "receipt_declared_path": "measure/tracks/apk_denominator_readiness_t11_integrity_20260727/phase1-denominator-crosswalk.json",
        "sha256": "eb395d3d365115696fc31359406a4e9f126604ca159ea8358a0eb8931c8c5f57",
    },
    "identity_ledger": {
        "archive_preferred_path": "measure/archive/apk_source_denominator_inventory_20260712/game-identity-ledger.json",
        "sha256": "a31c99650bf1abd6623e64b2e9a23c4c481ce970036b52cfbe08c74b1c09c407",
    },
    "action_defense_source_evidence": {
        "archive_preferred_path": "measure/archive/apk_corpus_audit_action_defense_20260712/accepted-cohort-manifest-t4-v2.json",
        "sha256": "824850257f5eaa2f2bb2d786ddedc5d6cbd03d7b088b00400c0d1d7a11feac80",
    },
}

EXPECTED_TITLES = [
    {
        "title_id": "castle-defense",
        "title": "Castle Defense",
        "assignment_index": 3,
        "source_identity_id": "sentence/castle-defense",
        "identity_record_index": 10,
        "cohort": "Action and defense",
        "classification": "source_identity",
    },
    {
        "title_id": "wizard-vs-zombie",
        "title": "Wizard vs Zombie",
        "assignment_index": 5,
        "source_identity_id": "vocabulary/wizard-vs-zombie",
        "identity_record_index": 26,
        "cohort": "Action and defense",
        "classification": "source_identity",
    },
    {
        "title_id": "village-guardian",
        "title": "Village Guardian",
        "assignment_index": 6,
        "source_identity_id": "sentence/village-guardian",
        "identity_record_index": 18,
        "cohort": "Action and defense",
        "classification": "source_identity",
    },
    {
        "title_id": "storm-castle-tower",
        "title": "Storm the Castle Tower",
        "assignment_index": 8,
        "source_identity_id": "catalog/storm-castle-tower",
        "identity_record_index": 9,
        "cohort": "Action and defense",
        "classification": "source_identity",
    },
]

EXPECTED_CLAIMS = {
    "semantic_adoption_claimed": False,
    "selected_assets_claimed": False,
    "asset_suitability_claimed": False,
    "asset_adoption_claimed": False,
    "implementation_claimed": False,
    "advantage_games_qc_claimed": False,
    "reading_host_proof_claimed": False,
    "primary_host_proof_claimed": False,
    "retirement_claimed": False,
    "cutover_claimed": False,
    "release_authority_granted": False,
}


def _load_object(path: Path) -> dict[str, Any]:
    """Loads a required JSON object.

    Args:
        path: JSON artifact to parse.

    Returns:
        Parsed JSON object.

    Raises:
        AssertionError: If the artifact is missing or not an object.
    """
    if not path.is_file():
        raise AssertionError(f"MISSING_ARTIFACT: {path}")
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"INVALID_ARTIFACT: {path}")
    return value


def _repo_path(path: str) -> Path:
    """Resolves one repository-relative path without permitting traversal.

    Args:
        path: Repository-relative evidence path.

    Returns:
        Resolved repository path.

    Raises:
        AssertionError: If the path is absolute or escapes the repository.
    """
    candidate = Path(path)
    if candidate.is_absolute():
        raise AssertionError(f"UNSAFE_EVIDENCE_PATH: {path}")
    resolved = (REPO_ROOT / candidate).resolve()
    try:
        resolved.relative_to(REPO_ROOT.resolve())
    except ValueError as error:
        raise AssertionError(f"UNSAFE_EVIDENCE_PATH: {path}") from error
    return resolved


def _sha256(path: Path) -> str:
    """Returns the SHA-256 digest of one exact artifact.

    Args:
        path: Artifact file to hash.

    Returns:
        Lowercase hexadecimal SHA-256 digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _validate_manifest(manifest: object) -> None:
    """Validates the bounded Legacy Defense Task 1 source manifest.

    Args:
        manifest: Candidate manifest object.

    Raises:
        AssertionError: If predecessor evidence, roster, locators, or authority limits drift.
    """
    if not isinstance(manifest, dict):
        raise AssertionError("INVALID_MANIFEST: expected object")
    if manifest.get("schema_version") != "apk-legacy-defense-task1-source-readiness-manifest.v1":
        raise AssertionError("INVALID_MANIFEST: schema version")
    if manifest.get("track_id") != TRACK_ID or manifest.get("status") != "evidence-only":
        raise AssertionError("FORBIDDEN_STATUS_OR_AUTHORITY: task scope")
    if manifest.get("source_bindings") != EXPECTED_BINDINGS:
        raise AssertionError("SOURCE_BINDING_DRIFT: exact source bindings required")
    for binding in EXPECTED_BINDINGS.values():
        path = _repo_path(binding["archive_preferred_path"])
        if not path.is_file() or _sha256(path) != binding["sha256"]:
            raise AssertionError("SOURCE_BINDING_DRIFT: archive source bytes drifted")

    receipt = _load_object(_repo_path(EXPECTED_BINDINGS["accepted_readiness_receipt"]["archive_preferred_path"]))
    if receipt.get("status") != "accepted" or receipt.get("revocation_state") != "active":
        raise AssertionError("READINESS_RECEIPT_INVALID: receipt not active and accepted")
    governance = receipt.get("crosswalk_governance")
    if not isinstance(governance, dict) or {
        "source_identity_count": governance.get("source_identity_count"),
        "partition_assignment_count": governance.get("partition_assignment_count"),
        "historical_label_assignments": governance.get("historical_label_assignments"),
    } != {
        "source_identity_count": 27,
        "partition_assignment_count": 29,
        "historical_label_assignments": 2,
    }:
        raise AssertionError("CROSSWALK_COUNT_DRIFT: expected 27/29/2 classification")
    cohorts = receipt.get("downstream_authorization", {}).get("authorized_child_cohorts", {})
    if cohorts.get(TRACK_ID) != [title["title"] for title in EXPECTED_TITLES]:
        raise AssertionError("ROSTER_DRIFT: receipt authorization differs")
    if receipt.get("readiness_governance", {}).get("any_cartridge_cutover_authorized_by_this_receipt") is not False:
        raise AssertionError("FORBIDDEN_STATUS_OR_AUTHORITY: receipt cannot authorize cutover")

    crosswalk = _load_object(_repo_path(EXPECTED_BINDINGS["phase1_crosswalk"]["archive_preferred_path"]))
    ledger = _load_object(_repo_path(EXPECTED_BINDINGS["identity_ledger"]["archive_preferred_path"]))
    titles = manifest.get("titles")
    if not isinstance(titles, list) or len(titles) != len(EXPECTED_TITLES):
        raise AssertionError("ROSTER_DRIFT: exactly four titles required")
    observed_roster = [
        {key: title.get(key) for key in ("title_id", "title", "assignment_index", "source_identity_id", "identity_record_index", "cohort", "classification")}
        for title in titles
        if isinstance(title, dict)
    ]
    if observed_roster != EXPECTED_TITLES:
        raise AssertionError("ROSTER_DRIFT: title ordering or identity differs")
    for expected, title in zip(EXPECTED_TITLES, titles, strict=True):
        assignment = crosswalk["assignments"][expected["assignment_index"]]
        if title.get("crosswalk_locator") != {
            "assignment_index": expected["assignment_index"],
            "assignment_locator": {
                "artifact": "accepted_partition",
                "json_pointer": f"/assignments/{expected['assignment_index']}",
            },
            "source_locator": {
                "artifact": "identity_ledger",
                "json_pointer": f"/identity_records/{expected['identity_record_index']}",
            },
        }:
            raise AssertionError("LOCATOR_DRIFT: crosswalk locator differs")
        if any(
            assignment.get(key) != expected[{"canonical_identity_label": "title"}.get(key, key)]
            for key in ("canonical_identity_label", "cohort", "classification", "source_identity_id")
        ):
            raise AssertionError("LOCATOR_DRIFT: crosswalk title differs")
        record = ledger["identity_records"][expected["identity_record_index"]]
        if record.get("canonical_identity_id") != expected["source_identity_id"] or record.get("catalog_identity_id") != expected["title_id"]:
            raise AssertionError("LOCATOR_DRIFT: ledger identity differs")
        if title.get("legacy_source_records") != {
            "aliases": record.get("aliases"),
            "routes": record.get("routes"),
            "source_states": record.get("source_states"),
        }:
            raise AssertionError("LOCATOR_DRIFT: exact ledger source records differ")
        if title.get("legacy_source_records_status") != "observation-only-not-adoption-or-approval":
            raise AssertionError("FORBIDDEN_STATUS_OR_AUTHORITY: raw source evidence elevated")

    evidence = _load_object(_repo_path(EXPECTED_BINDINGS["action_defense_source_evidence"]["archive_preferred_path"]))
    roster = evidence.get("full_cohort_roster", {}).get("entries")
    required_rows = [
        ["Castle Defense", "castle-defense", "batch-a"],
        ["Wizard vs Zombie", "wizard-vs-zombie", "batch-a"],
        ["Village Guardian", "village-guardian", "batch-b"],
        ["Storm the Castle Tower", "storm-castle-tower", "batch-b"],
    ]
    if not isinstance(roster, list) or any(row not in roster for row in required_rows):
        raise AssertionError("SOURCE_EVIDENCE_ROSTER_DRIFT: accepted evidence does not cover the four titles")
    if evidence.get("product_or_shipping_claim_authorized") is not False:
        raise AssertionError("FORBIDDEN_STATUS_OR_AUTHORITY: source evidence cannot authorize product work")
    if manifest.get("claims") != EXPECTED_CLAIMS or any(manifest["claims"].values()):
        raise AssertionError("FORBIDDEN_STATUS_OR_AUTHORITY: authority claim must remain false")
    if manifest.get("required_before_any_adoption_or_cutover") != [
        "accepted Asset Contract v2 output",
        "accepted per-title/per-role suitability and canonical-ingestion dossier",
        "accepted semantic adoption binding",
        "deterministic cartridge revalidation and selected-output proof",
        "Advantage Games, Reading, and Primary host proof with authoritative completion persistence",
        "exact legacy retirement disposition plus independent review and product-owner acceptance",
    ]:
        raise AssertionError("FORBIDDEN_STATUS_OR_AUTHORITY: downstream gates changed")


class LegacyDefenseSourceReadinessManifestTests(unittest.TestCase):
    """Ensures Legacy Defense Task 1 stays evidence-only and archive-aware."""

    def _manifest(self) -> dict[str, Any]:
        """Loads the candidate source manifest.

        Returns:
            Parsed source manifest.
        """
        return _load_object(MANIFEST_PATH)

    def _assert_rejected(self, manifest: dict[str, Any], code: str) -> None:
        """Requires a tampered manifest to fail closed.

        Args:
            manifest: Mutated source manifest.
            code: Stable rejection code.
        """
        with self.assertRaisesRegex(AssertionError, code):
            _validate_manifest(manifest)

    def test_manifest_binds_active_readiness_and_archived_sources(self) -> None:
        """Recomputes every pinned digest and validates readiness boundaries."""
        _validate_manifest(self._manifest())

    def test_roster_and_title_locator_drift_fail_closed(self) -> None:
        """Rejects a wrong title roster or an altered source locator."""
        wrong_roster = copy.deepcopy(self._manifest())
        wrong_roster["titles"][0]["title"] = "Wrong Castle"
        self._assert_rejected(wrong_roster, "ROSTER_DRIFT")

        wrong_locator = copy.deepcopy(self._manifest())
        wrong_locator["titles"][1]["legacy_source_records"]["source_states"][0]["source_class"] = "approved-source"
        self._assert_rejected(wrong_locator, "LOCATOR_DRIFT")

    def test_unsupported_authority_and_raw_source_elevation_fail_closed(self) -> None:
        """Rejects adoption, cutover, release, and raw-source approval escalation."""
        authority = copy.deepcopy(self._manifest())
        authority["claims"]["release_authority_granted"] = True
        self._assert_rejected(authority, "FORBIDDEN_STATUS_OR_AUTHORITY")

        raw_source_elevation = copy.deepcopy(self._manifest())
        raw_source_elevation["titles"][0]["legacy_source_records_status"] = "approved-for-semantic-adoption"
        self._assert_rejected(raw_source_elevation, "FORBIDDEN_STATUS_OR_AUTHORITY")

        cutover_status = copy.deepcopy(self._manifest())
        cutover_status["status"] = "accepted-for-cutover"
        self._assert_rejected(cutover_status, "FORBIDDEN_STATUS_OR_AUTHORITY")


if __name__ == "__main__":
    unittest.main()
