"""Guards the evidence-only Action Task 2 suitability disposition."""

from __future__ import annotations

from copy import deepcopy
import hashlib
import json
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ROOT = REPO_ROOT / "measure/tracks/apk_existing_action_cutover_20260727"
PLAN_PATH = TRACK_ROOT / "plan.md"
DISPOSITION_PATH = TRACK_ROOT / "task2-suitability-disposition-v1.json"

EXPECTED_TASK2_PLAN_LINE = (
    "- [b] Freeze each title's semantic roles, behavior descriptors, source manifests, and adoption decisions "
    "after current Asset Contract v2 reacceptance — deferred:apk-asset-contract-v2-reacceptance-owner."
)

EXPECTED_INPUTS = {
    "task1_source_readiness_manifest": {
        "path": "measure/tracks/apk_existing_action_cutover_20260727/task1-source-readiness-manifest-v1.json",
        "sha256": "d90983b305172874cdb3e7eb16b72189e5d35122041437efcb51ad099b84b827",
    },
    "asset_contract_v2_outer_receipt": {
        "path": "measure/archive/apk_asset_contract_v2_20260728/v2-owner-acceptance-v1.json",
        "sha256": "98f6c6d3b98d615d3b30b0eaa4581eb5b5e2636705e25cb87f9fe3e5d3b958b3",
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

EXPECTED_AUTHORIZATION = {
    "owner_approved_title_adoption_evidence_present": False,
    "asset_selection_authorized": False,
    "asset_ingestion_authorized": False,
    "title_adoption_authorized": False,
    "implementation_authorized": False,
    "production_exposure_authorized": False,
    "host_proof_claimed": False,
    "retirement_authorized": False,
    "cutover_authorized": False,
}

EXPECTED_CLAIMS = {
    "semantic_roles_frozen": False,
    "physical_behavior_descriptors_frozen": False,
    "suitability_decisions_accepted": False,
    "asset_adoption_claimed": False,
    "implementation_claimed": False,
    "advantage_games_qc_claimed": False,
    "reading_host_proof_claimed": False,
    "primary_host_proof_claimed": False,
    "retirement_claimed": False,
    "cutover_claimed": False,
}

EXPECTED_TOP_LEVEL_KEYS = {
    "schema_version",
    "track_id",
    "task",
    "status",
    "bound_inputs",
    "titles",
    "authorization",
    "claims",
    "asset_contract_v2_reacceptance",
    "retirement_disposition",
    "red_boundary",
}

EXPECTED_RECURSIVE_BINDING_MISMATCHES = [
    {
        "path": "packages/advantage-play-kit/src/assets/asset-contract-v2.ts",
        "expected_sha256": "f4530e834751eebe4480f360852cc36ffd9d561afdf3826d4c77ea3c51193cc5",
        "current_sha256": "96f745479559ae35b918204738073eec183d05b2e9c79556b00217bd07fb2da2",
    },
    {
        "path": "packages/advantage-play-kit/src/assets/semantic-product-bindings.ts",
        "expected_sha256": "6dd8e046b9aa21814e1d370aea4358ff1bf320b72bb064486cf00c2f62efd62f",
        "current_sha256": "0c5aa44959c9c91af4aa64d3531457ef5c073d2182c0a4fb5d3aa31161ac43df",
    },
    {
        "path": "apps/advantage-games/src/components/apk/AdvantageGamesAuthoringQc.tsx",
        "expected_sha256": "8d5a158ba8db738c0bd90c00974f4fbae8cf912d32a162fa41bd829cafd69686",
        "current_sha256": "2e5e26ae5b3a1879ef3adddd8e3facc69d3f53575c07252d96565952d15ea058",
    },
]

EXPECTED_RETIREMENT_DISPOSITION = {
    "candidate_paths": [],
    "deletion_paths": [],
    "candidate_count": 0,
    "deletion_count": 0,
    "deletion_authorized": False,
}


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


def _assert_plan_shape(plan_text: str) -> None:
    """Rejects legacy markers and unowned Task 2 activation."""
    lines = plan_text.splitlines()
    task_lines = [line for line in lines if line.startswith("- [")]
    task2_line = next((line for line in task_lines if "Freeze each title's semantic roles" in line), None)
    if task2_line is None:
        raise AssertionError("Task 2 plan line missing")
    if not task2_line.startswith("- [b]"):
        raise AssertionError("Task 2 plan marker changed")
    if "deferred:apk-asset-contract-v2-reacceptance-owner" not in task2_line:
        raise AssertionError("Task 2 plan blocker changed")
    if task2_line != EXPECTED_TASK2_PLAN_LINE:
        raise AssertionError("Task 2 plan contract changed")
    if any(line.startswith("- [ ]") for line in task_lines):
        raise AssertionError("legacy plan marker remains")
    if any(line.startswith("- [~]") for line in task_lines):
        raise AssertionError("unowned plan task activated")
    if any(line.startswith("- [b]") and " — deferred:" not in line for line in task_lines):
        raise AssertionError("blocked plan task lacks a structured reason")


def _assert_red_disposition_shape(disposition: dict[str, Any]) -> None:
    """Rejects mutations that authorize use or add candidate paths."""
    if set(disposition) != EXPECTED_TOP_LEVEL_KEYS:
        raise AssertionError("top-level disposition keys changed")
    if disposition["schema_version"] != "apk-existing-action-task2-suitability-disposition.v1":
        raise AssertionError("schema version changed")
    if disposition["track_id"] != "apk_existing_action_cutover_20260727":
        raise AssertionError("track binding changed")
    if disposition["task"] != "Task 2: suitability disposition before implementation":
        raise AssertionError("task binding changed")
    if disposition["status"] != "blocked-stale-asset-contract-v2-acceptance":
        raise AssertionError("blocked status changed")
    if disposition["bound_inputs"] != EXPECTED_INPUTS:
        raise AssertionError("bound inputs changed")
    reacceptance = disposition["asset_contract_v2_reacceptance"]
    if set(reacceptance) != {
        "outer_receipt_status",
        "current_byte_independent_review_accepted",
        "product_owner_successor_receipt_present",
        "recursive_binding_mismatches",
    }:
        raise AssertionError("reacceptance shape changed")
    if reacceptance["outer_receipt_status"] != "stale-acceptance-revoked-by-implementation-drift":
        raise AssertionError("outer receipt status changed")
    if reacceptance["current_byte_independent_review_accepted"] is not False:
        raise AssertionError("reacceptance authority changed")
    if reacceptance["product_owner_successor_receipt_present"] is not False:
        raise AssertionError("reacceptance authority changed")
    if reacceptance["recursive_binding_mismatches"] != EXPECTED_RECURSIVE_BINDING_MISMATCHES:
        raise AssertionError("recursive binding mismatches changed")
    if disposition["authorization"] != EXPECTED_AUTHORIZATION:
        raise AssertionError("authorization changed")
    if disposition["claims"] != EXPECTED_CLAIMS:
        raise AssertionError("claims changed")
    if disposition["retirement_disposition"] != EXPECTED_RETIREMENT_DISPOSITION:
        raise AssertionError("retirement disposition changed")
    if disposition["red_boundary"] != (
        "The disposition remains non-consumable until a current-byte Asset Contract v2 independent review and product-owner receipt accept the current contract, resolver, and QC host bytes."
    ):
        raise AssertionError("Red boundary changed")
    if len(disposition["titles"]) != len(EXPECTED_TITLES):
        raise AssertionError("title roster changed")
    for title, expected in zip(disposition["titles"], EXPECTED_TITLES):
        if set(title) != EXPECTED_TITLE_KEYS:
            raise AssertionError("title schema changed")
        if (title["title_id"], title["title"]) != expected:
            raise AssertionError("title roster changed")
        if title["status"] != "blocked-pending-asset-contract-v2-reacceptance":
            raise AssertionError("title status changed")
        if title["semantic_roles"] != [] or title["physical_behavior_descriptors"] != []:
            raise AssertionError("title behavior fields changed")
        if title["suitability_decision"] is not None:
            raise AssertionError("suitability decision changed")
        if title["legacy_source_paths"] != []:
            raise AssertionError("legacy source paths changed")
        if title["candidate_paths"] != []:
            raise AssertionError("candidate_paths must remain empty")
        if title["legacy_retirement_candidates"] != []:
            raise AssertionError("retirement candidates changed")
        if title["preserve_assets"] is not True:
            raise AssertionError("asset preservation changed")


class ExistingActionTask2SuitabilityTests(unittest.TestCase):
    """Validates the non-consumable Action Task 2 disposition."""

    def test_disposition_binds_local_predecessors(self) -> None:
        """Requires exact local predecessor paths and hashes."""
        disposition = _load(DISPOSITION_PATH)

        self.assertEqual(disposition["schema_version"], "apk-existing-action-task2-suitability-disposition.v1")
        self.assertEqual(disposition["track_id"], "apk_existing_action_cutover_20260727")
        self.assertEqual(disposition["status"], "blocked-stale-asset-contract-v2-acceptance")
        self.assertEqual(disposition["bound_inputs"], EXPECTED_INPUTS)
        for binding in EXPECTED_INPUTS.values():
            self.assertEqual(_sha256(binding["path"]), binding["sha256"])

    def test_plan_binds_blocked_markers_and_structured_reasons(self) -> None:
        """Requires blocked tasks to carry structured owner or dependency reasons."""
        _assert_plan_shape(PLAN_PATH.read_text(encoding="utf-8"))

    def test_reacceptance_records_exact_current_byte_mismatches(self) -> None:
        """Binds each recorded mismatch to its current repository bytes."""
        disposition = _load(DISPOSITION_PATH)
        mismatches = disposition["asset_contract_v2_reacceptance"]["recursive_binding_mismatches"]
        self.assertEqual(mismatches, EXPECTED_RECURSIVE_BINDING_MISMATCHES)
        for mismatch in mismatches:
            self.assertEqual(_sha256(mismatch["path"]), mismatch["current_sha256"])
            self.assertNotEqual(mismatch["expected_sha256"], mismatch["current_sha256"])

    def test_title_rows_preserve_assets_without_candidates(self) -> None:
        """Requires all five titles to remain blocked without retirement candidates."""
        disposition = _load(DISPOSITION_PATH)
        self.assertEqual(
            [(title["title_id"], title["title"]) for title in disposition["titles"]],
            EXPECTED_TITLES,
        )
        for title in disposition["titles"]:
            self.assertEqual(set(title), EXPECTED_TITLE_KEYS)
            self.assertEqual(title["status"], "blocked-pending-asset-contract-v2-reacceptance")
            self.assertEqual(title["semantic_roles"], [])
            self.assertEqual(title["physical_behavior_descriptors"], [])
            self.assertIsNone(title["suitability_decision"])
            self.assertEqual(title["legacy_source_paths"], [])
            self.assertEqual(title["candidate_paths"], [])
            self.assertEqual(title["legacy_retirement_candidates"], [])
            self.assertTrue(title["preserve_assets"])
        self.assertEqual(disposition["authorization"], EXPECTED_AUTHORIZATION)

    def test_red_requires_current_asset_contract_reacceptance(self) -> None:
        """Red: current-byte review and owner receipt are missing."""
        disposition = _load(DISPOSITION_PATH)
        self.assertTrue(
            disposition["asset_contract_v2_reacceptance"]["current_byte_independent_review_accepted"]
            and disposition["asset_contract_v2_reacceptance"]["product_owner_successor_receipt_present"],
            "Task 2 Red: current-byte Asset Contract independent review and product-owner receipt are missing",
        )

    def test_mutation_falsifiers_reject_recursive_bindings_and_forged_receipt(self) -> None:
        """Rejects recursive binding and successor receipt mutations."""
        disposition = _load(DISPOSITION_PATH)
        _assert_red_disposition_shape(disposition)
        plan_text = PLAN_PATH.read_text(encoding="utf-8")
        _assert_plan_shape(plan_text)

        marker_mutation = plan_text.replace("- [b] Freeze each title's", "- [~] Freeze each title's", 1)
        with self.assertRaisesRegex(AssertionError, "Task 2 plan marker"):
            _assert_plan_shape(marker_mutation)

        reason_mutation = plan_text.replace(
            "deferred:apk-asset-contract-v2-reacceptance-owner",
            "deferred:forged-owner",
            1,
        )
        with self.assertRaisesRegex(AssertionError, "Task 2 plan blocker"):
            _assert_plan_shape(reason_mutation)

        for index in range(len(EXPECTED_RECURSIVE_BINDING_MISMATCHES)):
            recursive_mutation = deepcopy(disposition)
            recursive_mutation["asset_contract_v2_reacceptance"]["recursive_binding_mismatches"][index][
                "current_sha256"
            ] = "f" * 64
            with self.assertRaisesRegex(AssertionError, "recursive binding"):
                _assert_red_disposition_shape(recursive_mutation)

        forged_receipt_mutation = deepcopy(disposition)
        forged_receipt_mutation["asset_contract_v2_reacceptance"][
            "current_byte_independent_review_accepted"
        ] = True
        forged_receipt_mutation["asset_contract_v2_reacceptance"][
            "product_owner_successor_receipt_present"
        ] = True
        with self.assertRaisesRegex(AssertionError, "reacceptance"):
            _assert_red_disposition_shape(forged_receipt_mutation)


if __name__ == "__main__":
    unittest.main()
