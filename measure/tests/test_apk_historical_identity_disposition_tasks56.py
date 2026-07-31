"""Guards the owner acceptance and portfolio gate for the historical APK cohort."""

from __future__ import annotations

import copy
import hashlib
import json
import re
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ID = "apk_historical_identity_disposition_20260727"
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / TRACK_ID
ACCEPTANCE_PATH = TRACK_DIR / "product-owner-acceptance-v1.json"
CRITERIA_PATH = TRACK_DIR / "future-track-criteria-v1.json"
CANDIDATE_PATH = TRACK_DIR / "candidate-dispositions-v1.json"
METADATA_PATH = TRACK_DIR / "metadata.json"
PLAN_PATH = TRACK_DIR / "plan.md"
PORTFOLIO_PATH = REPO_ROOT / "measure" / "tracks.md"
SHA256 = re.compile(r"^[0-9a-f]{64}$")

EXPECTED_DECISIONS = {
    "rpg-battle": "defer",
    "the-abyssal-well": "retain-history",
    "devourer-slime": "defer",
    "the-haunted-library": "defer",
    "babel-architect": "retain-history",
}
EXPECTED_CRITERIA = [
    {
        "criterion_id": "FT-01",
        "requirement": (
            "Create a new bounded child track for any revalidation, restoration, rebuild, "
            "or implementation proposal; do not reopen or mutate this disposition track."
        ),
        "required_evidence": [
            "a new track identifier and active track directory",
            "an exact identity scope with no inherited implementation authority",
            "a plan that keeps route, catalog, host, asset, migration, cutover, retirement, and release work gated",
        ],
        "blocks_until_met": [
            "implementation",
            "route",
            "catalog",
            "host_import",
            "asset_adoption",
            "migration",
            "cutover",
            "retirement",
            "release",
        ],
    },
    {
        "criterion_id": "FT-02",
        "requirement": (
            "Re-establish identity-specific current or historical source evidence and exact locators "
            "for the proposed child-track scope."
        ),
        "required_evidence": [
            "a source-bound identity record for every proposed title",
            "reachable immutable source bytes and locator digests",
            "an explicit distinction between current source, deleted historical source, and cancellation evidence",
        ],
        "blocks_until_met": ["current_evidence_claim", "historical_restoration_claim", "successor_claim"],
    },
    {
        "criterion_id": "FT-03",
        "requirement": "Obtain explicit product-owner acceptance of the bounded child-track proposal and exact identity-specific scope.",
        "required_evidence": [
            "an acceptance record naming the exact proposal and bound evidence",
            "durable user or event identifiers when the transport supplies them, otherwise null with disclosure",
            "explicit authorization flags for implementation, adoption, cutover, and release",
        ],
        "blocks_until_met": ["owner_authorized_work"],
    },
    {
        "criterion_id": "FT-04",
        "requirement": (
            "Complete independent review of proposed current evidence, implementation bytes, and negative boundary checks "
            "before any consumable claim."
        ),
        "required_evidence": [
            "a current-byte independent review with no unresolved Critical, High, Medium, or Low finding",
            "focused tests that reject unsupported gameplay, shipping, completeness, and authority claims",
            "a review scope that excludes unrelated worktree changes",
        ],
        "blocks_until_met": ["consumable_claim", "gameplay_claim", "shipping_claim"],
    },
    {
        "criterion_id": "FT-05",
        "requirement": (
            "For any asset adoption, bind accepted Asset Contract v2 and suitability/ingestion dossiers "
            "before selecting or releasing physical assets."
        ),
        "required_evidence": [
            "semantic role and state intent",
            "physical descriptor and selected-union keys",
            "source provenance, license, credit, suitability, and ingestion decisions",
        ],
        "blocks_until_met": ["asset_adoption", "physical_production_release"],
    },
    {
        "criterion_id": "FT-06",
        "requirement": "Before claiming an implemented title, prove source-backed runtime behavior and host integration for that title.",
        "required_evidence": [
            "title-specific mechanic and completion behavior",
            "real-input compact and wide host proof where applicable",
            "tenant-safe persistence, idempotency, replay, and navigation proof",
            "focused affected-package tests and independent review of the current bytes",
        ],
        "blocks_until_met": ["implemented_claim", "playable_claim", "host_success_claim"],
    },
    {
        "criterion_id": "FT-07",
        "requirement": "Treat legacy retirement and catalog or cutover exposure as separate evidence and owner gates after implementation proof.",
        "required_evidence": [
            "exact caller and asset-retirement inventory",
            "successful replacement and host proof for every retired path",
            "separate owner acceptance for retirement, catalog exposure, and cutover",
        ],
        "blocks_until_met": ["legacy_deletion", "catalog_exposure", "cutover"],
    },
    {
        "criterion_id": "FT-08",
        "requirement": "Keep production, release, and completeness claims withheld until every applicable cohort gate is separately accepted.",
        "required_evidence": [
            "a hash-bound accepted release or deployment decision when those actions are in scope",
            "a reconciled denominator and explicit unresolved-disclosure list",
            "a statement that this disposition record does not make the APK portfolio complete",
        ],
        "blocks_until_met": ["production", "release", "portfolio_completeness"],
    },
]
EXPECTED_ACCEPTANCE_AUTHORIZATION = {
    "current_runtime_authorized": False,
    "playable_authorized": False,
    "rebuild_authorized": False,
    "placeholder_authorized": False,
    "route_authorized": False,
    "catalog_authorized": False,
    "host_import_authorized": False,
    "asset_adoption_authorized": False,
    "migration_authorized": False,
    "cutover_authorized": False,
    "retirement_authorized": False,
    "release_authorized": False,
}
EXPECTED_CRITERIA_AUTHORIZATION = {
    "implementation_authorized": False,
    "rebuild_authorized": False,
    "route_authorized": False,
    "catalog_authorized": False,
    "host_import_authorized": False,
    "asset_adoption_authorized": False,
    "migration_authorized": False,
    "cutover_authorized": False,
    "retirement_authorized": False,
    "release_authorized": False,
}
FORBIDDEN_CLAIM_KEYS = (
    "current_runtime_claimed",
    "playable_claimed",
    "rebuild_authorized",
    "placeholder_authorized",
    "catalog_route_authorized",
    "host_import_authorized",
    "asset_adoption_authorized",
    "migration_authorized",
    "cutover_authorized",
    "retirement_authorized",
    "release_authorized",
    "program_complete_claimed",
)


def _load(path: Path) -> dict[str, Any]:
    """Loads a required JSON object from the repository."""
    if not path.is_file():
        raise AssertionError(f"MISSING_ARTIFACT: {path.relative_to(REPO_ROOT)}")
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"INVALID_ARTIFACT: {path.relative_to(REPO_ROOT)}")
    return value


def _sha256(path: Path) -> str:
    """Returns the SHA-256 digest of a repository artifact."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _assert_sha256(test: unittest.TestCase, value: object) -> None:
    """Requires a lowercase SHA-256 digest."""
    test.assertIsInstance(value, str)
    test.assertRegex(value, SHA256)


def _validate_gating_authority(document: dict[str, Any]) -> None:
    """Rejects an acceptance or criteria document that gains prohibited authority."""
    authorization = document.get("authorization")
    expected_authorization = (
        EXPECTED_ACCEPTANCE_AUTHORIZATION
        if "claims" in document
        else EXPECTED_CRITERIA_AUTHORIZATION
    )
    if authorization != expected_authorization or (
        not isinstance(authorization, dict) or any(authorization.values())
    ):
        raise AssertionError("FORBIDDEN_STATUS_OR_AUTHORITY_CLAIM: gating authority escalated")
    claims = document.get("claims")
    if isinstance(claims, dict) and any(claims.get(key) is not False for key in FORBIDDEN_CLAIM_KEYS):
        raise AssertionError("FORBIDDEN_STATUS_OR_AUTHORITY_CLAIM: claim escalated")


class HistoricalIdentityDispositionTasks56Tests(unittest.TestCase):
    """Ensures Tasks 5 and 6 bind only the accepted historical gate."""

    def test_owner_acceptance_binds_the_exact_five_reviewed_decisions(self) -> None:
        """Requires the owner decision to copy the reviewed evidence without gaining authority."""
        acceptance = _load(ACCEPTANCE_PATH)
        candidate = _load(CANDIDATE_PATH)

        self.assertEqual(
            acceptance["decision"],
            "ACCEPT_EXACT_FIVE_EVIDENCE_BACKED_DISPOSITIONS_WITHOUT_IMPLEMENTATION_AUTHORITY",
        )
        self.assertEqual(acceptance["status"], "accepted")
        self.assertEqual(acceptance["track_id"], TRACK_ID)
        self.assertEqual(acceptance["basis"]["candidate_dispositions"]["path"], CANDIDATE_PATH.relative_to(REPO_ROOT).as_posix())
        self.assertEqual(acceptance["basis"]["candidate_dispositions"]["sha256"], _sha256(CANDIDATE_PATH))
        self.assertEqual(acceptance["basis"]["independent_review"]["status"], "accepted")
        self.assertEqual(acceptance["basis"]["boundary_review"]["status"], "accepted")

        rows = acceptance["accepted_dispositions"]
        self.assertEqual([row["identity_id"] for row in rows], list(EXPECTED_DECISIONS))
        self.assertEqual(
            {row["identity_id"]: row["accepted_disposition"] for row in rows},
            EXPECTED_DECISIONS,
        )
        for accepted, expected in zip(rows, candidate["dispositions"], strict=True):
            self.assertEqual(accepted["identity_id"], expected["identity_id"])
            self.assertEqual(accepted["accepted_disposition"], expected["candidate_disposition"])
            self.assertEqual(accepted["evidence_observation"], expected["evidence_observation"])
            self.assertEqual(accepted["evidence_locator"], expected["evidence_locator"])
            self.assertEqual(accepted["cancellation_context"], expected["cancellation_context"])
            self.assertEqual(accepted["rationale"], expected["rationale"])
            self.assertIs(accepted["owner_accepted"], True)

        self.assertEqual(acceptance["authorization"], EXPECTED_ACCEPTANCE_AUTHORIZATION)
        self.assertFalse(acceptance["claims"]["current_runtime_claimed"])
        self.assertFalse(acceptance["claims"]["playable_claimed"])
        self.assertFalse(acceptance["claims"]["program_complete_claimed"])

    def test_owner_event_uses_disclosure_instead_of_fabricated_durable_ids(self) -> None:
        """Requires unavailable transport identifiers to remain null and disclosed."""
        event = _load(ACCEPTANCE_PATH)["approval_event"]
        self.assertTrue(event["message_exact"].startswith("Finish Tasks 5–6:"))
        self.assertEqual(event["source"], "current user task request")
        self.assertIsNone(event["durable_user_message_id"])
        self.assertIsNone(event["durable_user_event_id"])
        self.assertFalse(event["durable_user_message_id_available"])
        self.assertFalse(event["durable_user_event_id_available"])
        self.assertIsNone(event["event_timestamp"])
        self.assertIn("does not expose", event["limitation"])

    def test_future_track_criteria_are_explicit_and_hash_bound(self) -> None:
        """Requires future implementation to remain child-track and gate controlled."""
        criteria = _load(CRITERIA_PATH)
        acceptance = _load(ACCEPTANCE_PATH)
        self.assertEqual(criteria["schema_version"], "apk-historical-identity-future-track-criteria.v1")
        self.assertEqual(criteria["track_id"], TRACK_ID)
        self.assertEqual(criteria["status"], "published-gating-criteria-only")
        self.assertEqual(criteria["criteria"], EXPECTED_CRITERIA)
        self.assertEqual(
            criteria["accepted_disposition_rules"],
            [
                {
                    "identity_id": identity_id,
                    "accepted_disposition": disposition,
                    "future_track_rule": rule,
                }
                for identity_id, disposition, rule in [
                    (
                        "rpg-battle",
                        "defer",
                        "A future child track may propose revalidation or rebuild, but this record authorizes neither.",
                    ),
                    (
                        "the-abyssal-well",
                        "retain-history",
                        "Retain the deleted historical evidence only; any current replacement or restoration requires fresh evidence in a child track.",
                    ),
                    (
                        "devourer-slime",
                        "defer",
                        "A future child track may propose revalidation or rebuild, but this record authorizes neither.",
                    ),
                    (
                        "the-haunted-library",
                        "defer",
                        "A future child track may propose revalidation or rebuild, but this record authorizes neither.",
                    ),
                    (
                        "babel-architect",
                        "retain-history",
                        "Retain the deleted and cancelled history only; it is not a current foundation and any revival requires fresh evidence in a child track.",
                    ),
                ]
            ],
        )
        self.assertEqual(
            acceptance["future_track_criteria"]["sha256"],
            _sha256(CRITERIA_PATH),
        )
        self.assertEqual(
            acceptance["future_track_criteria"]["path"],
            CRITERIA_PATH.relative_to(REPO_ROOT).as_posix(),
        )
        self.assertEqual(criteria["authorization"], EXPECTED_CRITERIA_AUTHORIZATION)

    def test_acceptance_and_criteria_reject_tampered_authority(self) -> None:
        """Requires the focused contract to reject mutable authority or completeness claims."""
        acceptance = _load(ACCEPTANCE_PATH)
        _validate_gating_authority(acceptance)
        tampered = copy.deepcopy(acceptance)
        tampered["authorization"]["rebuild_authorized"] = True
        with self.assertRaisesRegex(AssertionError, "FORBIDDEN_STATUS_OR_AUTHORITY_CLAIM"):
            _validate_gating_authority(tampered)

        criteria = _load(CRITERIA_PATH)
        _validate_gating_authority(criteria)
        tampered_criteria = copy.deepcopy(criteria)
        tampered_criteria["authorization"]["catalog_authorized"] = True
        with self.assertRaisesRegex(AssertionError, "FORBIDDEN_STATUS_OR_AUTHORITY_CLAIM"):
            _validate_gating_authority(tampered_criteria)

    def test_metadata_plan_and_portfolio_ledger_publish_the_same_gate(self) -> None:
        """Requires track metadata, plan, and the exact portfolio row to agree."""
        metadata = _load(METADATA_PATH)
        acceptance = _load(ACCEPTANCE_PATH)
        criteria = _load(CRITERIA_PATH)
        self.assertEqual(metadata["status"], "complete")
        self.assertEqual(metadata["actual_tasks"], 6)
        self.assertEqual(metadata["acceptance"]["path"], ACCEPTANCE_PATH.relative_to(REPO_ROOT).as_posix())
        self.assertEqual(metadata["acceptance"]["sha256"], _sha256(ACCEPTANCE_PATH))
        self.assertEqual(metadata["future_track_criteria"]["path"], CRITERIA_PATH.relative_to(REPO_ROOT).as_posix())
        self.assertEqual(metadata["future_track_criteria"]["sha256"], _sha256(CRITERIA_PATH))
        self.assertEqual(metadata["gating_state"], {
            "status": "accepted-gated-disposition-only",
            "current_runtime_claimed": False,
            "playable_claimed": False,
            "implementation_authorized": False,
            "rebuild_authorized": False,
            "portfolio_completeness_claimed": False,
        })

        plan_lines = PLAN_PATH.read_text(encoding="utf-8").splitlines()
        self.assertTrue(plan_lines[6].startswith("- [x] Obtain product-owner acceptance"))
        self.assertIn("product-owner-acceptance-v1.json", plan_lines[6])
        self.assertTrue(plan_lines[7].startswith("- [x] Update the portfolio ledger"))
        self.assertIn("future-track-criteria-v1.json", plan_lines[7])

        portfolio_lines = PORTFOLIO_PATH.read_text(encoding="utf-8").splitlines()
        portfolio_rows = [
            index
            for index, line in enumerate(portfolio_lines)
            if "**Track: APK Historical/Cancelled Identity Disposition**" in line
        ]
        self.assertEqual(len(portfolio_rows), 1)
        row_index = portfolio_rows[0]
        self.assertTrue(portfolio_lines[row_index].startswith("  - [x]"))
        row = "\n".join(portfolio_lines[row_index : row_index + 2])
        self.assertIn("accepted-gated-disposition-only", row)
        self.assertIn("product-owner-acceptance-v1.json", row)
        self.assertIn("No gameplay, playable, rebuild, shipping, or portfolio-completeness claim", row)
        self.assertEqual(criteria["track_id"], metadata["track_id"])

    def test_all_bound_artifact_digests_match_repository_bytes(self) -> None:
        """Requires every acceptance and metadata digest to match its repository bytes."""
        acceptance = _load(ACCEPTANCE_PATH)
        metadata = _load(METADATA_PATH)
        for binding in (
            acceptance["basis"]["candidate_dispositions"],
            acceptance["basis"]["source_lock"],
            acceptance["basis"]["independent_review"],
            acceptance["basis"]["boundary_review"],
            acceptance["future_track_criteria"],
            metadata["acceptance"],
            metadata["future_track_criteria"],
        ):
            _assert_sha256(self, binding["sha256"])
            bound_path = REPO_ROOT / binding["path"]
            self.assertTrue(bound_path.is_file(), binding["path"])
            self.assertEqual(_sha256(bound_path), binding["sha256"], binding["path"])


if __name__ == "__main__":
    unittest.main()
