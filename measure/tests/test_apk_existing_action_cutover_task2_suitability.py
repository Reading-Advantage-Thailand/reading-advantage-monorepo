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
REVIEW_PATH = REPO_ROOT / "measure/archive/apk_asset_contract_v2_20260728/current-byte-independent-review-v3.json"

EXPECTED_REVIEW_SHA256 = "88bb3f98fd96ac394bb086add856304011a48b058f8dd2b2af1678c33f5e8ba8"
EXPECTED_REVIEW_SOURCE_REVISION = "69ff94e91f3aef6d63329b1e169d4ff7619509cc"
EXPECTED_REVIEW_PARENT_REVISION = "86f0611cf418632d5767a588d8fe15a4272973b1"

EXPECTED_TASK2_PLAN_LINE = (
    "- [b] Freeze title roles, descriptors, source manifests, and adoption decisions after Asset Contract v2 reacceptance. "
    "Review v3 accepts current bytes. Owner successor receipt remains required — deferred:apk-asset-contract-v2-owner-receipt."
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
    "asset_contract_v2_current_byte_independent_review": {
        "path": "measure/archive/apk_asset_contract_v2_20260728/current-byte-independent-review-v3.json",
        "sha256": EXPECTED_REVIEW_SHA256,
    },
}

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

EXPECTED_SUPPORTING_BINDINGS = {
    "provenance": {
        "path": "packages/advantage-play-kit/src/assets/asset-contract-v2-provenance.ts",
        "sha256": "dfc4d571d9d92bab31200ab33ca984a403babbd65dad6485312ad1e3b1a5b8df",
    },
    "accepted_resolver": {
        "path": "packages/advantage-play-kit/src/assets/accepted-standard-pack-release.ts",
        "sha256": "9a931e5ebde9d328697f00129ac803a7d56ca106ed46cb4940445f94c81a4584",
    },
    "consumer_check": {
        "path": "packages/advantage-play-kit/scripts/verify-assets-consumer-entrypoint.mjs",
        "sha256": "485be649a271c0433d65859df908edfefd9dde748b7176882cdd1d21224cccce",
    },
    "qc_fixture": {
        "path": "apps/advantage-games/src/components/apk/AssetContractV2Qc.tsx",
        "sha256": "9611cdfe5646b3e316dcfd0461fe947a3d2c6cac84497042a742d019e7edf997",
    },
}

EXPECTED_REVIEWED_TEST_BINDINGS = {
    "asset_contract_v2": {
        "path": "packages/advantage-play-kit/src/assets/asset-contract-v2.test.ts",
        "sha256": "b3335afd3d332cbae81ab1841497475ba6f023c5281ef8b5757d5142cab9af26",
    },
    "asset_contract_v2_adversarial": {
        "path": "packages/advantage-play-kit/src/assets/asset-contract-v2-adversarial.test.ts",
        "sha256": "61fef33b980be03b2e40bd6ec1dadac42e1a173b0454e36ff2dcdf5c76a342f3",
    },
    "semantic_product_bindings_v2": {
        "path": "packages/advantage-play-kit/src/assets/semantic-product-bindings-v2.test.ts",
        "sha256": "59277483feceae15edbe11a56d65c7682ea38e940f1b71fa970b1c800378ef88",
    },
    "semantic_product_bindings": {
        "path": "packages/advantage-play-kit/src/assets/semantic-product-bindings.test.ts",
        "sha256": "c1360bd882ae9f03b737a36e6d90c623cc253087e6428fb2cd823d18d0bd6bfb",
    },
    "assets_public_api": {
        "path": "packages/advantage-play-kit/src/assets/assets-public-api.test.ts",
        "sha256": "6ae0cec8b5a29afc855cdfc79a3dd0275a36d059fc0b7c6d2f1a37620bb26cb5",
    },
    "standard_pack_ingestion_ledger": {
        "path": "packages/advantage-play-kit/src/assets/standard-pack-ingestion-ledger.test.ts",
        "sha256": "d306889ae97559d8f731574559ec65ab48d3b2536c7baf71e1fe1c486b568e4c",
    },
    "standard_pack_additive_release": {
        "path": "packages/advantage-play-kit/src/assets/standard-pack-additive-release.test.ts",
        "sha256": "7c23ea1ed0bc7dd2ea8e3d76225c9c45351e5416939ec0ed598431a1e22bfe8a",
    },
    "asset_contract_v2_qc": {
        "path": "apps/advantage-games/src/components/apk/AssetContractV2Qc.test.tsx",
        "sha256": "85249d9cc1bb8d68d98332eb236bccb3f74288420b71d9f5c84f8ed07269c3cb",
    },
    "authoring_qc": {
        "path": "apps/advantage-games/src/components/apk/AdvantageGamesAuthoringQc.test.tsx",
        "sha256": "f1f7d7bcb2433752663ddebf5d5c4352f379e3380cb57fb2a313d9a1c645ab08",
    },
    "authoring_qc_tutorial": {
        "path": "apps/advantage-games/src/components/apk/AdvantageGamesAuthoringQc.tutorial.test.tsx",
        "sha256": "38c56be11d2d35ff5d2c44d7a9838b5a546ee47a2df67e7886fbfdade9181d6d",
    },
    "authoring_qc_browser": {
        "path": "apps/advantage-games/tests/e2e/qc/authoring-qc.spec.ts",
        "sha256": "902c795f8cf13dd43faed6d2c8e27ba09165a809e5f0f741a55aafc172974e52",
    },
}

EXPECTED_REVIEW_AUTHORIZATION = {
    "title_suitability_authorized": False,
    "title_adoption_authorized": False,
    "asset_ingestion_authorized": False,
    "migration_authorized": False,
    "catalog_exposure_authorized": False,
    "host_proof_claimed": False,
    "retirement_authorized": False,
    "cutover_authorized": False,
    "deployment_authorized": False,
    "production_use_authorized": False,
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

EXPECTED_REVIEW_ACCEPTED = [
    "current Asset Contract v2 contract bytes",
    "current resolver bytes",
    "current descriptor-driven QC host bytes",
    "focused technical verification",
]

EXPECTED_PRETTIER_PLAY_KIT_FILES = [
    "packages/advantage-play-kit/src/assets/asset-contract-v2.ts",
    "packages/advantage-play-kit/src/assets/asset-contract-v2-provenance.ts",
    "packages/advantage-play-kit/src/assets/asset-contract-v2.test.ts",
    "packages/advantage-play-kit/src/assets/asset-contract-v2-adversarial.test.ts",
    "packages/advantage-play-kit/src/assets/semantic-product-bindings.ts",
    "packages/advantage-play-kit/src/assets/semantic-product-bindings-v2.test.ts",
    "packages/advantage-play-kit/src/assets/semantic-product-bindings.test.ts",
    "packages/advantage-play-kit/src/assets/assets-public-api.test.ts",
    "packages/advantage-play-kit/src/assets/standard-pack-ingestion-ledger.test.ts",
    "packages/advantage-play-kit/src/assets/standard-pack-additive-release.test.ts",
]

EXPECTED_PRETTIER_QC_FILES = [
    "apps/advantage-games/src/components/apk/AdvantageGamesAuthoringQc.tsx",
    "apps/advantage-games/src/components/apk/AdvantageGamesAuthoringQc.test.tsx",
    "apps/advantage-games/src/components/apk/AdvantageGamesAuthoringQc.tutorial.test.tsx",
    "apps/advantage-games/tests/e2e/qc/authoring-qc.spec.ts",
]

EXPECTED_REVIEW_FINDINGS = [
    {
        "id": "APK-CURRENT-BYTE-V3-001",
        "severity": "nonblocking-source-style",
        "finding": "Prettier reports failures in ten Play Kit files and four QC files.",
        "required_disposition": "Do not mark formatting Green.",
    }
]

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


def _assert_current_review_shape(review: dict[str, Any]) -> None:
    """Requires the accepted technical review to bind current bytes without authority."""
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
        raise AssertionError("current-byte review keys changed")
    if review["schema_version"] != "apk-current-byte-independent-review.v3":
        raise AssertionError("current-byte review schema changed")
    if review["record_id"] != "apk_asset_contract_v2_20260728_current_byte_independent_review_v3":
        raise AssertionError("current-byte review record changed")
    if review["track_id"] != "apk_asset_contract_v2_20260728":
        raise AssertionError("current-byte review track changed")
    if review["status"] != "accepted-technical-review-owner-decision-required":
        raise AssertionError("current-byte review status changed")
    if review["reviewed_at"] != "2026-08-14":
        raise AssertionError("review timestamp changed")
    reviewer = review["reviewer"]
    if reviewer["agent"] != "terra_current_release":
        raise AssertionError("reviewer identity changed")
    if reviewer["role"] != "independent-release-reviewer":
        raise AssertionError("reviewer role changed")
    if reviewer["independence"] != {
        "did_not_author_current_bytes": True,
        "did_not_author_historical_receipts": True,
        "did_not_author_this_review": True,
        "has_no_product_owner_authority": True,
    }:
        raise AssertionError("reviewer independence changed")
    source_revision = review["source_revision"]
    if source_revision != {
        "repository": "reading-advantage-monorepo",
        "branch": "master",
        "commit": EXPECTED_REVIEW_SOURCE_REVISION,
        "parent": EXPECTED_REVIEW_PARENT_REVISION,
        "bound_paths_are_clean": True,
    }:
        raise AssertionError("source revision changed")
    if review["predecessors"] != {
        "outer_receipt": {
            "path": "measure/archive/apk_asset_contract_v2_20260728/v2-owner-acceptance-v1.json",
            "sha256": "98f6c6d3b98d615d3b30b0eaa4581eb5b5e2636705e25cb87f9fe3e5d3b958b3",
        },
        "historical_review_v2": {
            "path": "measure/archive/apk_asset_contract_v2_20260728/current-byte-independent-review-v2.json",
            "sha256": "8e43541af1adb4023204039540d2ca97677df2bf50088425605e06518c378826",
            "reusable_for_current_acceptance": False,
        },
    }:
        raise AssertionError("review predecessors changed")
    if review["current_bindings"] != EXPECTED_CURRENT_BINDINGS:
        raise AssertionError("current bindings changed")
    if review["supporting_bindings"] != EXPECTED_SUPPORTING_BINDINGS:
        raise AssertionError("supporting bindings changed")
    if review["reviewed_test_bindings"] != EXPECTED_REVIEWED_TEST_BINDINGS:
        raise AssertionError("reviewed test bindings changed")
    for binding in [*EXPECTED_CURRENT_BINDINGS.values(), *EXPECTED_SUPPORTING_BINDINGS.values(), *EXPECTED_REVIEWED_TEST_BINDINGS.values()]:
        if _sha256(binding["path"]) != binding["sha256"]:
            raise AssertionError(f"current review byte drift: {binding['path']}")
    verification = review["verification"]
    if verification["focused_v2_tests"] != {
        "contract": {
            "command": "CI=true pnpm --filter @reading-advantage/advantage-play-kit exec vitest run --maxWorkers=1 --fileParallelism=false src/assets/asset-contract-v2.test.ts src/assets/asset-contract-v2-adversarial.test.ts",
            "result": "passed",
            "files": 2,
            "tests": 14,
        },
        "resolver_and_public_api": {
            "command": "CI=true pnpm --filter @reading-advantage/advantage-play-kit exec vitest run --maxWorkers=1 --fileParallelism=false src/assets/semantic-product-bindings-v2.test.ts src/assets/semantic-product-bindings.test.ts src/assets/assets-public-api.test.ts",
            "result": "passed",
            "files": 3,
            "tests": 13,
        },
        "ledger_and_additive_receipt": {
            "command": "CI=true pnpm --filter @reading-advantage/advantage-play-kit exec vitest run --maxWorkers=1 --fileParallelism=false src/assets/standard-pack-ingestion-ledger.test.ts src/assets/standard-pack-additive-release.test.ts",
            "result": "passed",
            "files": 2,
            "tests": 17,
        },
    }:
        raise AssertionError("focused V2 test result changed")
    if verification["play_kit_typecheck"] != {
        "command": "CI=true pnpm --filter @reading-advantage/advantage-play-kit run check-types",
        "result": "passed",
    }:
        raise AssertionError("Play Kit typecheck changed")
    if verification["play_kit_lint"] != {
        "command": "CI=true pnpm --filter @reading-advantage/advantage-play-kit run lint",
        "result": "passed-with-3-warnings",
        "warnings": 3,
    }:
        raise AssertionError("Play Kit lint result changed")
    if verification["host_typecheck"] != {
        "command": "CI=true pnpm --filter vocabulary-games run check-types",
        "result": "passed",
    }:
        raise AssertionError("host typecheck changed")
    if verification["host_lint"] != {
        "command": "CI=true pnpm --filter vocabulary-games run lint",
        "result": "passed",
    }:
        raise AssertionError("host lint result changed")
    if verification["scoped_diff_check"] != {
        "command": "git diff --check -- packages/advantage-play-kit/src/assets apps/advantage-games/src/components/apk",
        "result": "passed",
    }:
        raise AssertionError("scoped diff result changed")
    if verification["browser_qc"] != {
        "command": "CI=true pnpm --filter vocabulary-games exec playwright test tests/e2e/qc/authoring-qc.spec.ts --project=chromium",
        "result": "not-run",
        "reason": "Browser execution was outside this technical review.",
    }:
        raise AssertionError("browser result changed")
    prettier = verification["prettier"]
    if prettier["result"] != "failed-nonblocking" or prettier["blocking"] is not False:
        raise AssertionError("Prettier disposition changed")
    if prettier["play_kit_files"] != EXPECTED_PRETTIER_PLAY_KIT_FILES:
        raise AssertionError("Play Kit Prettier failure scope changed")
    if prettier["qc_files"] != EXPECTED_PRETTIER_QC_FILES:
        raise AssertionError("Prettier failure scope changed")
    if review["scope"]["accepted"] != EXPECTED_REVIEW_ACCEPTED:
        raise AssertionError("review accepted scope changed")
    if review["scope"]["excluded"] != EXPECTED_REVIEW_EXCLUSIONS:
        raise AssertionError("review exclusions changed")
    if review["findings"] != EXPECTED_REVIEW_FINDINGS:
        raise AssertionError("review findings changed")
    if review["authorization"] != EXPECTED_REVIEW_AUTHORIZATION:
        raise AssertionError("review authorization changed")
    if review["verdict"] != "current-byte-audit-complete-owner-decision-required":
        raise AssertionError("technical verdict changed")


def _assert_plan_shape(plan_text: str) -> None:
    """Rejects legacy markers and unowned Task 2 activation."""
    lines = plan_text.splitlines()
    task_lines = [line for line in lines if line.startswith("- [")]
    task2_line = next((line for line in task_lines if "Freeze title roles" in line), None)
    if task2_line is None:
        raise AssertionError("Task 2 plan line missing")
    if not task2_line.startswith("- [b]"):
        raise AssertionError("Task 2 plan marker changed")
    if "deferred:apk-asset-contract-v2-owner-receipt" not in task2_line:
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
    _assert_current_review_shape(_load(REVIEW_PATH))
    if set(disposition) != EXPECTED_TOP_LEVEL_KEYS:
        raise AssertionError("top-level disposition keys changed")
    if disposition["schema_version"] != "apk-existing-action-task2-suitability-disposition.v1":
        raise AssertionError("schema version changed")
    if disposition["track_id"] != "apk_existing_action_cutover_20260727":
        raise AssertionError("track binding changed")
    if disposition["task"] != "Task 2: suitability disposition before implementation":
        raise AssertionError("task binding changed")
    if disposition["status"] != "blocked-reviewed-asset-contract-v2-owner-receipt":
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
    if reacceptance["current_byte_independent_review_accepted"] is not True:
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
        "The disposition remains non-consumable because reviewed Asset Contract v2 bytes lack a product-owner successor receipt."
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
        self.assertEqual(disposition["status"], "blocked-reviewed-asset-contract-v2-owner-receipt")
        self.assertEqual(disposition["bound_inputs"], EXPECTED_INPUTS)
        for binding in EXPECTED_INPUTS.values():
            self.assertEqual(_sha256(binding["path"]), binding["sha256"])

    def test_current_review_binds_exact_revision_and_current_bytes(self) -> None:
        """Requires the accepted technical review to bind the exact current revision and bytes."""
        review = _load(REVIEW_PATH)
        _assert_current_review_shape(review)
        self.assertEqual(_sha256("measure/archive/apk_asset_contract_v2_20260728/current-byte-independent-review-v3.json"), EXPECTED_REVIEW_SHA256)

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

    def test_red_requires_product_owner_successor_receipt(self) -> None:
        """Red: the product-owner successor receipt is missing."""
        disposition = _load(DISPOSITION_PATH)
        self.assertTrue(
            disposition["asset_contract_v2_reacceptance"]["product_owner_successor_receipt_present"],
            "Task 2 Red: reviewed current-byte Asset Contract v2 evidence lacks the product-owner successor receipt",
        )

    def test_mutation_falsifiers_reject_recursive_bindings_and_forged_receipt(self) -> None:
        """Rejects recursive binding and successor receipt mutations."""
        disposition = _load(DISPOSITION_PATH)
        _assert_red_disposition_shape(disposition)
        plan_text = PLAN_PATH.read_text(encoding="utf-8")
        _assert_plan_shape(plan_text)

        review = _load(REVIEW_PATH)
        review_revision_mutation = deepcopy(review)
        review_revision_mutation["source_revision"]["commit"] = "f" * 40
        with self.assertRaisesRegex(AssertionError, "source revision"):
            _assert_current_review_shape(review_revision_mutation)

        review_hash_mutation = deepcopy(review)
        review_hash_mutation["current_bindings"]["contract"]["sha256"] = "f" * 64
        with self.assertRaisesRegex(AssertionError, "current bindings"):
            _assert_current_review_shape(review_hash_mutation)

        review_authority_mutation = deepcopy(review)
        review_authority_mutation["authorization"]["title_adoption_authorized"] = True
        with self.assertRaisesRegex(AssertionError, "review authorization"):
            _assert_current_review_shape(review_authority_mutation)

        review_scope_mutation = deepcopy(review)
        review_scope_mutation["scope"]["excluded"][0] = "title adoption"
        with self.assertRaisesRegex(AssertionError, "review exclusions"):
            _assert_current_review_shape(review_scope_mutation)

        review_finding_mutation = deepcopy(review)
        review_finding_mutation["findings"][0]["severity"] = "blocking"
        with self.assertRaisesRegex(AssertionError, "review findings"):
            _assert_current_review_shape(review_finding_mutation)

        disposition_review_mutation = deepcopy(disposition)
        disposition_review_mutation["bound_inputs"]["asset_contract_v2_current_byte_independent_review"]["sha256"] = "f" * 64
        with self.assertRaisesRegex(AssertionError, "bound inputs"):
            _assert_red_disposition_shape(disposition_review_mutation)

        marker_mutation = plan_text.replace("- [b] Freeze title roles", "- [~] Freeze title roles", 1)
        with self.assertRaisesRegex(AssertionError, "Task 2 plan marker"):
            _assert_plan_shape(marker_mutation)

        reason_mutation = plan_text.replace(
            "deferred:apk-asset-contract-v2-owner-receipt",
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
            "product_owner_successor_receipt_present"
        ] = True
        with self.assertRaisesRegex(AssertionError, "reacceptance"):
            _assert_red_disposition_shape(forged_receipt_mutation)


if __name__ == "__main__":
    unittest.main()
