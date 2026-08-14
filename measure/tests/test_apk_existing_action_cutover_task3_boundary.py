"""Guards the title-neutral Action Task 3 boundary."""

from __future__ import annotations

from copy import deepcopy
import hashlib
import json
from pathlib import Path
import unittest
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ROOT = REPO_ROOT / "measure/tracks/apk_existing_action_cutover_20260727"
PLAN_PATH = TRACK_ROOT / "plan.md"
DISPOSITION_PATH = TRACK_ROOT / "task2-suitability-disposition-v1.json"
REVIEW_PATH = (
    REPO_ROOT
    / "measure/archive/apk_asset_contract_v2_20260728/current-byte-independent-review-v3.json"
)

REVIEW_RELATIVE_PATH = (
    "measure/archive/apk_asset_contract_v2_20260728/"
    "current-byte-independent-review-v3.json"
)
EXPECTED_REVIEW_SHA256 = (
    "88bb3f98fd96ac394bb086add856304011a48b058f8dd2b2af1678c33f5e8ba8"
)
EXPECTED_SOURCE_REVISION = "69ff94e91f3aef6d63329b1e169d4ff7619509cc"
EXPECTED_SOURCE_PARENT = "86f0611cf418632d5767a588d8fe15a4272973b1"

EXPECTED_CURRENT_BINDINGS = {
    "contract": {
        "path": "packages/advantage-play-kit/src/assets/asset-contract-v2.ts",
        "sha256": "96f745479559ae35b918204738073eec183d05b2e9c79556b00217bd07fb2da2",
        "git_blob_sha1": "72c991a72a9bf0dbc16d4a19a6353637eba4e876",
    },
    "resolver": {
        "path": "packages/advantage-play-kit/src/assets/semantic-product-bindings.ts",
        "sha256": "0c5aa44959c9c91af4aa64d3531457ef5c073d2182c0a4fb5d3aa31161ac43df",
        "git_blob_sha1": "04030347afc0724473ee6feb1b144f11358ed8cf",
    },
    "browser_qc_host": {
        "path": "apps/advantage-games/src/components/apk/AdvantageGamesAuthoringQc.tsx",
        "sha256": "2e5e26ae5b3a1879ef3adddd8e3facc69d3f53575c07252d96565952d15ea058",
        "git_blob_sha1": "d39d8871554b06e0c77e52ceae2d203fb78ecaa4",
    },
}

EXPECTED_TITLES = [
    ("archers-revenge", "Archer's Revenge"),
    ("paladins-twin-soul", "Paladin's Twin-Soul"),
    ("griffin-sky-joust", "Griffin Sky-Joust"),
    ("gryphon-patrol", "Gryphon Patrol"),
    ("realm-carver", "Realm Carver"),
]

EXPECTED_TITLE_KEYS = {
    "title_id",
    "title",
    "status",
    "semantic_roles",
    "physical_behavior_descriptors",
    "suitability_decision",
    "legacy_source_paths",
    "candidate_paths",
    "legacy_retirement_candidates",
    "preserve_assets",
}

EXPECTED_REVIEW_AUTHORIZATION_KEYS = {
    "title_suitability_authorized",
    "title_adoption_authorized",
    "asset_ingestion_authorized",
    "migration_authorized",
    "catalog_exposure_authorized",
    "host_proof_claimed",
    "retirement_authorized",
    "cutover_authorized",
    "deployment_authorized",
    "production_use_authorized",
}

EXPECTED_DISPOSITION_AUTHORIZATION_KEYS = {
    "owner_approved_title_adoption_evidence_present",
    "asset_selection_authorized",
    "asset_ingestion_authorized",
    "title_adoption_authorized",
    "implementation_authorized",
    "production_exposure_authorized",
    "host_proof_claimed",
    "retirement_authorized",
    "cutover_authorized",
}

EXPECTED_CLAIM_KEYS = {
    "semantic_roles_frozen",
    "physical_behavior_descriptors_frozen",
    "suitability_decisions_accepted",
    "asset_adoption_claimed",
    "implementation_claimed",
    "advantage_games_qc_claimed",
    "reading_host_proof_claimed",
    "primary_host_proof_claimed",
    "retirement_claimed",
    "cutover_claimed",
}

EXPECTED_RETIREMENT_DISPOSITION = {
    "candidate_paths": [],
    "deletion_paths": [],
    "candidate_count": 0,
    "deletion_count": 0,
    "deletion_authorized": False,
}

EXPECTED_REVIEW_EXCLUSIONS = [
    "title suitability",
    "title adoption",
    "asset ingestion",
    "cartridge migration",
    "catalog or loader exposure",
    "Reading or Primary host proof",
    "legacy retirement",
    "cutover",
    "production use",
    "deployment",
]


def _load(path: Path) -> dict[str, Any]:
    """Loads one repository-local JSON object."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain an object")
    return value


def _sha256(relative_path: str) -> str:
    """Returns the SHA-256 digest for one repository-relative path."""
    path = (REPO_ROOT / relative_path).resolve()
    path.relative_to(REPO_ROOT.resolve())
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _assert_all_false(values: dict[str, Any], expected_keys: set[str], label: str) -> None:
    """Requires one complete boolean map to contain only false values."""
    if set(values) != expected_keys:
        raise AssertionError(f"{label} keys changed")
    if any(value is not False for value in values.values()):
        raise AssertionError(f"{label} contains an authorization or claim")


def _assert_review_shape(review: dict[str, Any]) -> None:
    """Requires the committed v3 review to bind current bytes without authority."""
    expected_keys = {
        "schema_version",
        "record_id",
        "track_id",
        "status",
        "reviewed_at",
        "reviewer",
        "source_revision",
        "predecessors",
        "current_bindings",
        "supporting_bindings",
        "reviewed_test_bindings",
        "verification",
        "scope",
        "findings",
        "authorization",
        "verdict",
    }
    if set(review) != expected_keys:
        raise AssertionError("review shape changed")
    if review["schema_version"] != "apk-current-byte-independent-review.v3":
        raise AssertionError("review schema changed")
    if review["record_id"] != "apk_asset_contract_v2_20260728_current_byte_independent_review_v3":
        raise AssertionError("review record changed")
    if review["track_id"] != "apk_asset_contract_v2_20260728":
        raise AssertionError("review track changed")
    if review["status"] != "accepted-technical-review-owner-decision-required":
        raise AssertionError("technical review status changed")
    if review["source_revision"] != {
        "repository": "reading-advantage-monorepo",
        "branch": "master",
        "commit": EXPECTED_SOURCE_REVISION,
        "parent": EXPECTED_SOURCE_PARENT,
        "bound_paths_are_clean": True,
    }:
        raise AssertionError("source revision changed")
    if review["current_bindings"] != EXPECTED_CURRENT_BINDINGS:
        raise AssertionError("current-byte bindings changed")
    for binding in EXPECTED_CURRENT_BINDINGS.values():
        if _sha256(binding["path"]) != binding["sha256"]:
            raise AssertionError("current-byte binding drifted")
    _assert_all_false(
        review["authorization"],
        EXPECTED_REVIEW_AUTHORIZATION_KEYS,
        "review authorization",
    )
    if review["scope"]["excluded"] != EXPECTED_REVIEW_EXCLUSIONS:
        raise AssertionError("review exclusions changed")
    if review["verdict"] != "current-byte-audit-complete-owner-decision-required":
        raise AssertionError("review verdict changed")


def _assert_title_rows(disposition: dict[str, Any]) -> None:
    """Requires five blocked titles without decisions, sources, candidates, or retirement paths."""
    titles = disposition["titles"]
    if len(titles) != len(EXPECTED_TITLES):
        raise AssertionError("title roster changed")
    for title, expected in zip(titles, EXPECTED_TITLES):
        if set(title) != EXPECTED_TITLE_KEYS:
            raise AssertionError("title schema changed")
        if (title["title_id"], title["title"]) != expected:
            raise AssertionError("title roster changed")
        if title["status"] != "blocked-pending-asset-contract-v2-reacceptance":
            raise AssertionError("title status changed")
        if title["semantic_roles"] != []:
            raise AssertionError("title roles changed")
        if title["physical_behavior_descriptors"] != []:
            raise AssertionError("title descriptors changed")
        if title["suitability_decision"] is not None:
            raise AssertionError("title decision changed")
        if title["legacy_source_paths"] != []:
            raise AssertionError("title source paths changed")
        if title["candidate_paths"] != []:
            raise AssertionError("title candidate paths changed")
        if title["legacy_retirement_candidates"] != []:
            raise AssertionError("title retirement paths changed")
        if title["preserve_assets"] is not True:
            raise AssertionError("asset preservation changed")


def _assert_disposition_shape(disposition: dict[str, Any]) -> None:
    """Requires the Task 2 disposition to remain blocked and non-consumable."""
    expected_keys = {
        "schema_version",
        "track_id",
        "task",
        "status",
        "bound_inputs",
        "asset_contract_v2_reacceptance",
        "titles",
        "authorization",
        "claims",
        "retirement_disposition",
        "red_boundary",
    }
    if set(disposition) != expected_keys:
        raise AssertionError("disposition shape changed")
    if disposition["schema_version"] != "apk-existing-action-task2-suitability-disposition.v1":
        raise AssertionError("disposition schema changed")
    if disposition["track_id"] != "apk_existing_action_cutover_20260727":
        raise AssertionError("disposition track changed")
    if disposition["status"] != "blocked-reviewed-asset-contract-v2-owner-receipt":
        raise AssertionError("disposition status changed")
    review_binding = disposition["bound_inputs"][
        "asset_contract_v2_current_byte_independent_review"
    ]
    if review_binding != {
        "path": REVIEW_RELATIVE_PATH,
        "sha256": EXPECTED_REVIEW_SHA256,
    }:
        raise AssertionError("review binding changed")
    reacceptance = disposition["asset_contract_v2_reacceptance"]
    if reacceptance["current_byte_independent_review_accepted"] is not True:
        raise AssertionError("technical review acceptance changed")
    if reacceptance["product_owner_successor_receipt_present"] is not False:
        raise AssertionError("owner receipt state changed")
    _assert_all_false(
        disposition["authorization"],
        EXPECTED_DISPOSITION_AUTHORIZATION_KEYS,
        "disposition authorization",
    )
    _assert_all_false(disposition["claims"], EXPECTED_CLAIM_KEYS, "disposition claims")
    if disposition["retirement_disposition"] != EXPECTED_RETIREMENT_DISPOSITION:
        raise AssertionError("retirement disposition changed")
    if disposition["red_boundary"] != (
        "The disposition remains non-consumable because reviewed Asset Contract v2 bytes "
        "lack a product-owner successor receipt."
    ):
        raise AssertionError("Red boundary changed")
    _assert_title_rows(disposition)


def _assert_plan_marker(plan_text: str) -> None:
    """Requires the generic Task 3 plan item to remain blocked."""
    task3_lines = [
        line
        for line in plan_text.splitlines()
        if "Write deterministic mechanic and educational Red tests for each title" in line
    ]
    if len(task3_lines) != 1:
        raise AssertionError("Task 3 plan line changed")
    if not task3_lines[0].startswith("- [b]"):
        raise AssertionError("Task 3 plan marker changed")


class ExistingActionTask3BoundaryTests(unittest.TestCase):
    """Validates the title-neutral Action Task 3 boundary."""

    def test_current_review_binds_committed_revision_and_bytes(self) -> None:
        """Requires the v3 review path, hash, revision, and current bindings."""
        review = _load(REVIEW_PATH)
        self.assertEqual(_sha256(REVIEW_RELATIVE_PATH), EXPECTED_REVIEW_SHA256)
        _assert_review_shape(review)

    def test_disposition_binds_review_and_preserves_empty_titles(self) -> None:
        """Requires the disposition to bind v3 and preserve five empty title rows."""
        disposition = _load(DISPOSITION_PATH)
        _assert_disposition_shape(disposition)
        self.assertEqual(
            _sha256(REVIEW_RELATIVE_PATH),
            disposition["bound_inputs"][
                "asset_contract_v2_current_byte_independent_review"
            ]["sha256"],
        )

    def test_authority_claims_and_retirement_remain_false(self) -> None:
        """Requires zero authority, claims, retirement candidates, and deletions."""
        disposition = _load(DISPOSITION_PATH)
        _assert_all_false(
            disposition["authorization"],
            EXPECTED_DISPOSITION_AUTHORIZATION_KEYS,
            "disposition authorization",
        )
        _assert_all_false(disposition["claims"], EXPECTED_CLAIM_KEYS, "disposition claims")
        self.assertEqual(disposition["retirement_disposition"]["candidate_count"], 0)
        self.assertEqual(disposition["retirement_disposition"]["deletion_count"], 0)

    def test_plan_keeps_task_three_blocked(self) -> None:
        """Requires the Task 3 marker to remain blocked."""
        _assert_plan_marker(PLAN_PATH.read_text(encoding="utf-8"))

    def test_red_requires_product_owner_successor_receipt(self) -> None:
        """Red: the product-owner successor receipt is missing."""
        disposition = _load(DISPOSITION_PATH)
        self.assertTrue(
            disposition["asset_contract_v2_reacceptance"][
                "product_owner_successor_receipt_present"
            ],
            "Task 3 Red: missing product-owner successor receipt",
        )

    def test_mutation_falsifiers_reject_boundary_drift(self) -> None:
        """Rejects review, title, retirement, authority, claim, owner, and marker mutations."""
        review = _load(REVIEW_PATH)
        disposition = _load(DISPOSITION_PATH)
        plan_text = PLAN_PATH.read_text(encoding="utf-8")

        review_hash_mutation = deepcopy(disposition)
        review_hash_mutation["bound_inputs"][
            "asset_contract_v2_current_byte_independent_review"
        ]["sha256"] = "f" * 64
        with self.assertRaisesRegex(AssertionError, "review binding"):
            _assert_disposition_shape(review_hash_mutation)

        current_binding_mutation = deepcopy(review)
        current_binding_mutation["current_bindings"]["contract"]["sha256"] = "f" * 64
        with self.assertRaisesRegex(AssertionError, "current-byte bindings"):
            _assert_review_shape(current_binding_mutation)

        forged_owner_mutation = deepcopy(disposition)
        forged_owner_mutation["asset_contract_v2_reacceptance"][
            "product_owner_successor_receipt_present"
        ] = True
        with self.assertRaisesRegex(AssertionError, "owner receipt state"):
            _assert_disposition_shape(forged_owner_mutation)

        title_decision_mutation = deepcopy(disposition)
        title_decision_mutation["titles"][0]["suitability_decision"] = "reuse"
        with self.assertRaisesRegex(AssertionError, "title decision"):
            _assert_disposition_shape(title_decision_mutation)

        title_candidate_mutation = deepcopy(disposition)
        title_candidate_mutation["titles"][0]["candidate_paths"] = ["forged/path.ts"]
        with self.assertRaisesRegex(AssertionError, "title candidate paths"):
            _assert_disposition_shape(title_candidate_mutation)

        title_source_mutation = deepcopy(disposition)
        title_source_mutation["titles"][0]["legacy_source_paths"] = ["forged/path.ts"]
        with self.assertRaisesRegex(AssertionError, "title source paths"):
            _assert_disposition_shape(title_source_mutation)

        retirement_count_mutation = deepcopy(disposition)
        retirement_count_mutation["retirement_disposition"]["candidate_count"] = 1
        with self.assertRaisesRegex(AssertionError, "retirement disposition"):
            _assert_disposition_shape(retirement_count_mutation)

        retirement_path_mutation = deepcopy(disposition)
        retirement_path_mutation["retirement_disposition"]["deletion_paths"] = [
            "forged/path.ts"
        ]
        with self.assertRaisesRegex(AssertionError, "retirement disposition"):
            _assert_disposition_shape(retirement_path_mutation)

        authority_mutation = deepcopy(disposition)
        authority_mutation["authorization"]["title_adoption_authorized"] = True
        with self.assertRaisesRegex(AssertionError, "disposition authorization"):
            _assert_disposition_shape(authority_mutation)

        claim_mutation = deepcopy(disposition)
        claim_mutation["claims"]["implementation_claimed"] = True
        with self.assertRaisesRegex(AssertionError, "disposition claims"):
            _assert_disposition_shape(claim_mutation)

        marker_mutation = plan_text.replace(
            "- [b] Write deterministic mechanic",
            "- [~] Write deterministic mechanic",
            1,
        )
        with self.assertRaisesRegex(AssertionError, "Task 3 plan marker"):
            _assert_plan_marker(marker_mutation)


if __name__ == "__main__":
    unittest.main()
