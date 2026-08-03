"""Guards the evidence-only source/readiness manifest for Existing Action Task 1."""

from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ROOT = REPO_ROOT / "measure/archive/apk_existing_action_cutover_20260727"
MANIFEST_PATH = TRACK_ROOT / "task1-source-readiness-manifest-v1.json"

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
    "action_defense_evidence": {
        "archive_preferred_path": "measure/archive/apk_corpus_audit_action_defense_20260712/accepted-cohort-manifest-t4-v2.json",
        "sha256": "824850257f5eaa2f2bb2d786ddedc5d6cbd03d7b088b00400c0d1d7a11feac80",
    },
    "special_historical_evidence": {
        "archive_preferred_path": "measure/archive/apk_corpus_audit_special_historical_20260712/cohort-accepted-manifest-20260722.json",
        "sha256": "4186dfd20fcef683a1a33664a1ffa9d4350280fbee31fe56d553fa0f5a87b2b0",
    },
}

EXPECTED_TITLES = [
    {
        "title_id": "archers-revenge",
        "title": "Archer's Revenge",
        "assignment_index": 7,
        "source_identity_id": "catalog/archers-revenge",
        "identity_record_index": 0,
        "evidence_binding": "action_defense_evidence",
        "catalog_line": 154,
        "catalog_range_sha256": "8ac12ade5fff141d2ba3c7f27a4f2fc67e80f6229319d16c1caa4c33c7764d5e",
        "state_line": 22,
        "state_range_sha256": "a198e2e408083828619945e71608caf6b2a5a7a753b80330923063eeb975be2c",
    },
    {
        "title_id": "paladins-twin-soul",
        "title": "Paladin's Twin-Soul",
        "assignment_index": 9,
        "source_identity_id": "catalog/paladins-twin-soul",
        "identity_record_index": 5,
        "evidence_binding": "action_defense_evidence",
        "catalog_line": 182,
        "catalog_range_sha256": "ef2bf8d071f64cd786b87607890a9dbc3a9bd4e8ea5cae906cddde47a5f8dc67",
        "state_line": 23,
        "state_range_sha256": "dff44c5ae92c04614832a9bbf3cf23435bfd9d3e97285799d2fc6eb73a2af75d",
    },
    {
        "title_id": "griffin-sky-joust",
        "title": "Griffin Sky-Joust",
        "assignment_index": 24,
        "source_identity_id": "catalog/griffin-sky-joust",
        "identity_record_index": 3,
        "evidence_binding": "special_historical_evidence",
        "catalog_line": 168,
        "catalog_range_sha256": "2c339a97aceb8e347decf28e3ff24ffb96c55c3046d56603e1c77ec9d4a1228b",
        "state_line": 24,
        "state_range_sha256": "ab3d55f0add4231d759efffef9dda99063277e4ff4801265b0e3cf1b14370467",
    },
    {
        "title_id": "gryphon-patrol",
        "title": "Gryphon Patrol",
        "assignment_index": 10,
        "source_identity_id": "catalog/gryphon-patrol",
        "identity_record_index": 4,
        "evidence_binding": "action_defense_evidence",
        "catalog_line": 226,
        "catalog_range_sha256": "e6b636ceb7a57b9f7bad2c9f1ef27d2ce2a48ef316cd164a088cfae662e8d25e",
        "state_line": 25,
        "state_range_sha256": "40e9ecf511e38baa9ffaaa82c617aac1116675fa715f5a95767a8b9043baf62c",
    },
    {
        "title_id": "realm-carver",
        "title": "Realm Carver",
        "assignment_index": 25,
        "source_identity_id": "catalog/realm-carver",
        "identity_record_index": 6,
        "evidence_binding": "special_historical_evidence",
        "catalog_line": 175,
        "catalog_range_sha256": "8283edfeaffa7a85035165f35dc2edbddc7712412dd520f2e62f1d5617051487",
        "state_line": 26,
        "state_range_sha256": "a7486f707bafc941086aab32a4c3b6514cd5a40e0eacafede7cd7a7e119e5271",
    },
]

EXPECTED_CLAIMS = {
    "semantic_adoption_claimed": False,
    "asset_selection_claimed": False,
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


EXPECTED_READINESS_BOUNDARY = {
    "receipt_status": "accepted-active",
    "authorized_child_work_only": True,
    "cohort_currently_ready": False,
    "cartridge_cutover_authorized": False,
    "meaning": "The receipt removes only the denominator/readiness predecessor block for this five-title child track. It does not satisfy Task 1 or any downstream task.",
}

EXPECTED_TOP_LEVEL_KEYS = {
    "schema_version",
    "track_id",
    "task",
    "status",
    "archive_resolution_rule",
    "source_bindings",
    "readiness_boundary",
    "titles",
    "claims",
    "required_before_any_adoption_or_cutover",
    "revocation_rule",
}

EXPECTED_TITLE_KEYS = {
    "title_id",
    "title",
    "assignment_index",
    "source_identity_id",
    "identity_record_index",
    "evidence_binding",
    "crosswalk_locator",
    "identity_ledger_locator",
}

def _load_object(path: Path) -> dict[str, Any]:
    """Loads one JSON object and rejects non-object data."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain a JSON object")
    return value


def _repo_path(path: str) -> Path:
    """Resolves one repository-relative path without allowing traversal."""
    candidate = Path(path)
    if candidate.is_absolute():
        raise AssertionError(f"Evidence path must be relative: {path}")
    resolved = (REPO_ROOT / candidate).resolve()
    try:
        resolved.relative_to(REPO_ROOT.resolve())
    except ValueError as error:
        raise AssertionError(f"Evidence path escapes repository: {path}") from error
    return resolved


def _sha256(path: Path) -> str:
    """Computes a SHA-256 digest from exact source bytes."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _validate_manifest_schema_and_readiness(manifest: dict[str, Any]) -> None:
    """Rejects unmodeled fields and readiness authority escalation.

    Args:
        manifest: Candidate evidence-only Action Task 1 manifest.

    Raises:
        AssertionError: If the manifest schema or readiness boundary drifts.
    """
    if set(manifest) != EXPECTED_TOP_LEVEL_KEYS:
        raise AssertionError("MANIFEST_SCHEMA_INVALID: unexpected manifest fields")
    titles = manifest.get("titles")
    if not isinstance(titles, list) or any(
        not isinstance(title, dict) or set(title) != EXPECTED_TITLE_KEYS
        for title in titles
    ):
        raise AssertionError("TITLE_SCHEMA_INVALID: title fields must remain exact")
    readiness_boundary = manifest.get("readiness_boundary")
    if not isinstance(readiness_boundary, dict):
        raise AssertionError("READINESS_BOUNDARY_DRIFT: readiness boundary must be an object")
    for field in (
        "authorized_child_work_only",
        "cohort_currently_ready",
        "cartridge_cutover_authorized",
    ):
        if type(readiness_boundary.get(field)) is not bool:
            raise AssertionError("READINESS_BOUNDARY_TYPE_INVALID: readiness flags must be bool")
    if readiness_boundary != EXPECTED_READINESS_BOUNDARY:
        raise AssertionError("READINESS_BOUNDARY_DRIFT: readiness boundary must remain exact")


class ExistingActionSourceReadinessManifestTests(unittest.TestCase):
    """Ensures Task 1 remains a bounded source/readiness record."""

    def test_manifest_binds_archived_predecessors_and_accepted_readiness(self) -> None:
        """Rejects source-byte drift and stale pre-archive paths."""
        self.assertTrue(MANIFEST_PATH.is_file(), "Task 1 manifest must exist before its source gate can pass")
        manifest = _load_object(MANIFEST_PATH)
        self.assertEqual(manifest["schema_version"], "apk-existing-action-task1-source-readiness-manifest.v1")
        self.assertEqual(manifest["status"], "evidence-only")
        self.assertEqual(manifest["source_bindings"], EXPECTED_BINDINGS)

        for binding in EXPECTED_BINDINGS.values():
            path = _repo_path(binding["archive_preferred_path"])
            self.assertTrue(path.is_file(), f"Archive-aware source is missing: {path}")
            self.assertEqual(_sha256(path), binding["sha256"])

        receipt = _load_object(_repo_path(EXPECTED_BINDINGS["accepted_readiness_receipt"]["archive_preferred_path"]))
        self.assertEqual(receipt["status"], "accepted")
        self.assertEqual(receipt["revocation_state"], "active")
        self.assertTrue(receipt["hash_governance"]["hash_drift_invalidates_this_receipt"])
        self.assertFalse(receipt["readiness_governance"]["any_cohort_currently_ready_by_this_receipt"])
        self.assertFalse(receipt["readiness_governance"]["any_cartridge_cutover_authorized_by_this_receipt"])
        self.assertEqual(
            receipt["downstream_authorization"]["authorized_child_cohorts"]["apk_existing_action_cutover_20260727"],
            [title["title"] for title in EXPECTED_TITLES],
        )
        self.assertEqual(
            receipt["bindings"]["phase1_crosswalk"]["sha256"],
            EXPECTED_BINDINGS["phase1_crosswalk"]["sha256"],
        )

    def test_manifest_has_exact_five_title_crosswalk_and_identity_locators(self) -> None:
        """Rejects roster drift, identity substitution, and locator drift."""
        manifest = _load_object(MANIFEST_PATH)
        self.assertEqual(
            [{key: title[key] for key in ("title_id", "title", "assignment_index", "source_identity_id", "identity_record_index", "evidence_binding")} for title in manifest["titles"]],
            [{key: title[key] for key in ("title_id", "title", "assignment_index", "source_identity_id", "identity_record_index", "evidence_binding")} for title in EXPECTED_TITLES],
        )

        crosswalk = _load_object(_repo_path(EXPECTED_BINDINGS["phase1_crosswalk"]["archive_preferred_path"]))
        ledger = _load_object(_repo_path(EXPECTED_BINDINGS["identity_ledger"]["archive_preferred_path"]))

        action_evidence = _load_object(_repo_path(EXPECTED_BINDINGS["action_defense_evidence"]["archive_preferred_path"]))
        special_evidence = _load_object(_repo_path(EXPECTED_BINDINGS["special_historical_evidence"]["archive_preferred_path"]))
        action_title_pairs = {
            (entry[0], entry[1])
            for entry in action_evidence["full_cohort_roster"]["entries"]
        }
        special_titles = set(special_evidence["scope"]["games"])
        for expected, actual in zip(EXPECTED_TITLES, manifest["titles"], strict=True):
            assignment = crosswalk["assignments"][expected["assignment_index"]]
            self.assertEqual(assignment["canonical_identity_label"], expected["title"])
            self.assertEqual(assignment["classification"], "source_identity")
            self.assertEqual(assignment["source_identity_id"], expected["source_identity_id"])
            self.assertEqual(assignment["assignment_locator"], {
                "artifact": "accepted_partition",
                "json_pointer": f"/assignments/{expected['assignment_index']}",
            })
            self.assertEqual(assignment["source_locator"], {
                "artifact": "identity_ledger",
                "json_pointer": f"/identity_records/{expected['identity_record_index']}",
            })

            record = ledger["identity_records"][expected["identity_record_index"]]
            self.assertEqual(record["canonical_identity_id"], expected["source_identity_id"])
            self.assertEqual(record["catalog_identity_id"], expected["title_id"])
            self.assertEqual(actual["crosswalk_locator"], {
                "assignment_index": expected["assignment_index"],
                "assignment_locator": assignment["assignment_locator"],
                "source_locator": assignment["source_locator"],
            })
            self.assertEqual(actual["identity_ledger_locator"]["catalog_evidence"]["path"], "apps/advantage-games/src/lib/gameCards.ts")
            self.assertEqual(actual["identity_ledger_locator"]["catalog_evidence"]["revision"], "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286")
            self.assertEqual(actual["identity_ledger_locator"]["catalog_evidence"]["range"], {
                "start_line": expected["catalog_line"],
                "end_line": expected["catalog_line"],
                "sha256": expected["catalog_range_sha256"],
            })
            self.assertEqual(actual["identity_ledger_locator"]["source_state"], {
                "source_class": "catalog-withdrawn-registration",
                "path": "apps/advantage-games/src/lib/gameCards.ts",
                "revision": "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286",
                "range": {
                    "start_line": expected["state_line"],
                    "end_line": expected["state_line"],
                    "sha256": expected["state_range_sha256"],
                },
            })

            if expected["evidence_binding"] == "action_defense_evidence":
                self.assertIn((expected["title"], expected["title_id"]), action_title_pairs)
            else:
                self.assertEqual(expected["evidence_binding"], "special_historical_evidence")
                self.assertIn(expected["title"], special_titles)

    def test_manifest_fails_closed_on_unsupported_authority_claims(self) -> None:
        """Requires explicit denial of every authority not granted by Task 1."""
        manifest = _load_object(MANIFEST_PATH)
        self.assertEqual(manifest["claims"], EXPECTED_CLAIMS)
        self.assertEqual(manifest["required_before_any_adoption_or_cutover"], [
            "accepted Asset Contract v2 output",
            "accepted per-title/per-role suitability and canonical-ingestion dossier",
            "accepted semantic adoption binding",
            "deterministic cartridge revalidation and selected-output proof",
            "Advantage Games, Reading, and Primary host proof with authoritative completion persistence",
            "exact legacy retirement disposition plus independent review and product-owner acceptance",
        ])


    def test_manifest_schema_and_readiness_boundary_fail_closed(self) -> None:
        """Rejects hidden approval data and every readiness or cutover escalation."""
        manifest = _load_object(MANIFEST_PATH)
        _validate_manifest_schema_and_readiness(manifest)

        hidden_owner_acceptance = json.loads(json.dumps(manifest))
        hidden_owner_acceptance["owner_acceptance"] = {
            "decision": "approved",
            "approvalDigest": "a" * 64,
        }
        with self.assertRaisesRegex(AssertionError, "MANIFEST_SCHEMA_INVALID"):
            _validate_manifest_schema_and_readiness(hidden_owner_acceptance)

        cohort_ready = json.loads(json.dumps(manifest))
        cohort_ready["readiness_boundary"]["cohort_currently_ready"] = True
        with self.assertRaisesRegex(AssertionError, "READINESS_BOUNDARY_DRIFT"):
            _validate_manifest_schema_and_readiness(cohort_ready)

        cutover_meaning = json.loads(json.dumps(manifest))
        cutover_meaning["readiness_boundary"]["meaning"] = "This evidence authorizes cutover."
        with self.assertRaisesRegex(AssertionError, "READINESS_BOUNDARY_DRIFT"):
            _validate_manifest_schema_and_readiness(cutover_meaning)

    def test_title_authority_injection_and_numeric_readiness_values_fail_closed(self) -> None:
        """Rejects nested title authority and Python numeric values posing as booleans."""
        manifest = _load_object(MANIFEST_PATH)

        for field in ("owner_acceptance", "cutover_authorized", "cohort_currently_ready"):
            title_authority = json.loads(json.dumps(manifest))
            title_authority["titles"][0][field] = {"decision": "approved"} if field == "owner_acceptance" else True
            with self.assertRaisesRegex(AssertionError, "TITLE_SCHEMA_INVALID"):
                _validate_manifest_schema_and_readiness(title_authority)

        for field, value in (
            ("authorized_child_work_only", 1),
            ("cohort_currently_ready", 0),
            ("cartridge_cutover_authorized", 0),
        ):
            numeric_boolean = json.loads(json.dumps(manifest))
            numeric_boolean["readiness_boundary"][field] = value
            with self.assertRaisesRegex(AssertionError, "READINESS_BOUNDARY_TYPE_INVALID"):
                _validate_manifest_schema_and_readiness(numeric_boolean)

if __name__ == "__main__":
    unittest.main()
