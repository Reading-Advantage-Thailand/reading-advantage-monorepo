"""Integrity checks for existing-core Task-4 product-owner acceptance."""

from __future__ import annotations

import hashlib
import json
import subprocess
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ROOT = REPO_ROOT / "measure/tracks/apk_existing_core_cutover_20260727"
ACCEPTANCE_PATH = TRACK_ROOT / "task4-product-owner-acceptance-v1.json"
RECEIPT_PATH = TRACK_ROOT / "accepted-task4-qc-receipt-v1.json"
EXPECTED_ACCEPTANCE_SHA256 = "20483a277d1d1addf87b0f98184cd76fd9dccd878a4f87bd850bb52d9bac05db"
EXPECTED_RECEIPT_SHA256 = "b6ffefcebf8a75d9967f196693fe7cf14a133d66123537d201b52e9af4745dd9"
EXPECTED_APPROVAL_MESSAGE = "Approved. I fixed the k2p7 agent and it should be usable now."
EXPECTED_APPROVAL_MESSAGE_SHA256 = "59273e1970a6c0be4d938dac88c011a86721ecbb98b4c94af0a3e332a259c69f"
TASK4_ACCEPTANCE_REVISION = "e0a5fb2a579ab7ec8d80c2336f4c93a946605452"
EXPECTED_SUBJECTS = {
    "task4_qc_evidence": {
        "path": "measure/tracks/apk_existing_core_cutover_20260727/task4-advantage-games-qc-evidence-v1.json",
        "sha256": "7a9dae4d640f881f76c001be73315b74d07b19258226d01f09390c37adaba058",
    },
    "task4_remediation_evidence": {
        "path": "measure/tracks/apk_existing_core_cutover_20260727/review-task4-advantage-games-qc-remediation.md",
        "sha256": "c2bdbdeb98dddf140db53e4147b3d2e371d9d83dbf43fae4b0b7dabf372cecf8",
    },
    "k3_independent_zero_finding_rereview": {
        "path": "measure/tracks/apk_existing_core_cutover_20260727/review-task4-advantage-games-qc-rereview.md",
        "sha256": "ec718ede5041e7b9e16dbafba414ee59c013da205c63928a8a28334e996c61de",
    },
    "doc_correction_verification_addendum": {
        "path": "measure/tracks/apk_existing_core_cutover_20260727/task4-r1-correction-verification-addendum.md",
        "sha256": "d0a3437b53de360dcab6e41fb5461362adbe6f9664a81e8346325be4e24fecb3",
    },
    "accepted_task3_semantic_receipt": {
        "path": "measure/tracks/apk_existing_core_cutover_20260727/accepted-semantic-adoption-receipt-v1.json",
        "sha256": "e82d42d9ec046b85eb4aeac7800623bce3c3bf4a39a9c0f44288bd93d07be240",
    },
}
EXPECTED_IMPLEMENTATION_BINDINGS = {
    "qc_registry_and_mechanics": {
        "path": "packages/game-cartridges/src/existing-core-cutover-qc.ts",
        "sha256": "6d1730bdb24f3c5effe0bb473d48487fcccf04c0a9964d0311a78d9253347951",
    },
    "cartridge_tests": {
        "path": "packages/game-cartridges/src/existing-core-cutover.red.test.ts",
        "sha256": "b4808c5d1109a183dc44e3ba2f052e8bb00e18e42b6bbfda489ff7fd87021a9f",
    },
    "game_cartridges_manifest": {
        "path": "packages/game-cartridges/package.json",
        "sha256": "1041ad5c98290fb58714dfa73e56f5376f59682e6b4f74667214bc48ac62fa47",
    },
    "qc_surface": {
        "path": "apps/advantage-games/src/components/apk/ExistingCoreCartridgeQc.tsx",
        "sha256": "a5b4d691f27e62482bd28eec78eeef7c586761f69bbc31cbe39094b3d3c80d89",
    },
    "qc_surface_tests": {
        "path": "apps/advantage-games/src/components/apk/ExistingCoreCartridgeQc.test.tsx",
        "sha256": "da2affbacdca3a440c1a3298d5b3dda8a5ef370f8ebf2fc3329424166963827a",
    },
    "qc_host": {
        "path": "apps/advantage-games/src/components/apk/AdvantageGamesAuthoringQc.tsx",
        "sha256": "daef9738ca3293084a728c592e367ac1ead591fd32e962e1001d115484c61a31",
    },
    "qc_route": {
        "path": "apps/advantage-games/src/app/qc/page.tsx",
        "sha256": "e16b021e559b85b94616b68c0dcaa0710564da96fc7595d2ce56de9bf9bda202",
    },
    "real_input_browser_test": {
        "path": "apps/advantage-games/tests/e2e/qc/existing-core-cartridges.spec.ts",
        "sha256": "120fc8e98cf55b58ebdd947b94e332f9ca47dafd168a28e8a9ac0d4eebad6349",
    },
    "finite_preview_manifest": {
        "path": "apps/advantage-games/src/lib/apk/standard-pack-qc-preview.json",
        "sha256": "0f5935e224b02c9157fc610802c05b6391d84eb2ac9444badf8309a46121e9ab",
    },
    "production_catalog": {
        "path": "packages/game-cartridges/src/catalog.ts",
        "sha256": "14afe602f10710db17edc3a311177f16f148cac24473d3d975de4284ca19b55b",
        "remained_empty": True,
    },
    "production_root_exports": {
        "path": "packages/game-cartridges/src/index.ts",
        "sha256": "1f9fdca42f51e5140dc998752ab2c6f6049ef07e1b78b3a90693e5e4fdbf8eda",
        "qc_registry_exported_from_root": False,
    },
}


def _sha256(path: Path) -> str:
    """Returns the SHA-256 digest of one file's exact bytes."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _git_blob_sha256(revision: str, relative_path: str) -> str:
    """Returns one repository file digest at an immutable acceptance revision."""
    value = subprocess.run(
        ["git", "show", f"{revision}:{relative_path}"],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
    ).stdout
    return hashlib.sha256(value).hexdigest()


def _load_object(path: Path) -> dict[str, Any]:
    """Loads one JSON artifact and requires an object at its root."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain a JSON object")
    return value


class ExistingCoreTask4AcceptanceTests(unittest.TestCase):
    """Pins bounded Task-4 acceptance and Task-5-start authorization."""

    def test_product_owner_acceptance_binds_exact_approval_and_subjects(self) -> None:
        """Requires exact approval provenance and only the authorized evidence set."""
        acceptance = _load_object(ACCEPTANCE_PATH)

        self.assertEqual(_sha256(ACCEPTANCE_PATH), EXPECTED_ACCEPTANCE_SHA256)
        self.assertEqual(acceptance["schema_version"], "apk-existing-core-task4-product-owner-acceptance.v1")
        self.assertEqual(acceptance["track_id"], "apk_existing_core_cutover_20260727")
        self.assertEqual(acceptance["task_number"], 4)
        self.assertEqual(acceptance["status"], "accepted")
        self.assertEqual(acceptance["approval_event"]["message_exact"], EXPECTED_APPROVAL_MESSAGE)
        self.assertEqual(acceptance["approval_event"]["message_sha256"], EXPECTED_APPROVAL_MESSAGE_SHA256)
        self.assertIsNone(acceptance["approval_event"]["durable_user_message_id"])
        self.assertIsNone(acceptance["approval_event"]["durable_user_event_id"])
        self.assertIsNone(acceptance["approval_event"]["event_timestamp"])
        self.assertEqual(acceptance["accepted_subjects"], EXPECTED_SUBJECTS)

        for subject in EXPECTED_SUBJECTS.values():
            self.assertEqual(_sha256(REPO_ROOT / subject["path"]), subject["sha256"])

    def test_acceptance_pins_exact_task4_implementation_bytes(self) -> None:
        """Requires the exhaustive implementation bindings to match immutable accepted bytes."""
        acceptance = _load_object(ACCEPTANCE_PATH)
        evidence = _load_object(REPO_ROOT / EXPECTED_SUBJECTS["task4_qc_evidence"]["path"])

        self.assertEqual(acceptance["accepted_implementation_bindings"], EXPECTED_IMPLEMENTATION_BINDINGS)
        self.assertEqual(acceptance["accepted_implementation_bindings"], evidence["implementation_bindings"])
        for binding in EXPECTED_IMPLEMENTATION_BINDINGS.values():
            self.assertEqual(
                _git_blob_sha256(TASK4_ACCEPTANCE_REVISION, binding["path"]),
                binding["sha256"],
            )

    def test_authorization_is_limited_to_beginning_task5_host_proof(self) -> None:
        """Rejects production exposure, retirement, Task-5 success, or cohort acceptance."""
        acceptance = _load_object(ACCEPTANCE_PATH)
        authorization = acceptance["downstream_authorization"]

        self.assertEqual(authorization["status"], "authorized-to-begin-task5-reading-primary-host-proof-only")
        self.assertEqual(authorization["authorized_task"], 5)
        self.assertEqual(
            authorization["authorized_work"],
            [
                "begin Reading and Primary host proof using the same accepted five-title binding",
                "test load, completion, tenant-safe persistence, replay, and navigation in both hosts",
            ],
        )
        self.assertEqual(
            authorization["excluded_actions"],
            [
                "production catalog or loader exposure",
                "declaring Task 5 success or completion",
                "legacy path deletion or retirement",
                "cartridge consumability or cutover",
                "broader cohort or track acceptance",
                "production readiness or deployment",
            ],
        )

    def test_accepted_receipt_rebinds_acceptance_without_expanding_authority(self) -> None:
        """Requires the accepted QC receipt to preserve every bounded subject and claim."""
        acceptance = _load_object(ACCEPTANCE_PATH)
        receipt = _load_object(RECEIPT_PATH)

        self.assertEqual(_sha256(RECEIPT_PATH), EXPECTED_RECEIPT_SHA256)
        self.assertEqual(receipt["schema_version"], "apk-existing-core-accepted-task4-qc-receipt.v1")
        self.assertEqual(receipt["track_id"], "apk_existing_core_cutover_20260727")
        self.assertEqual(receipt["task_number"], 4)
        self.assertEqual(receipt["status"], "accepted")
        self.assertEqual(receipt["evidence_bindings"], EXPECTED_SUBJECTS)
        self.assertEqual(receipt["implementation_bindings"], EXPECTED_IMPLEMENTATION_BINDINGS)
        self.assertEqual(
            receipt["product_owner_acceptance"],
            {
                "path": "measure/tracks/apk_existing_core_cutover_20260727/task4-product-owner-acceptance-v1.json",
                "sha256": EXPECTED_ACCEPTANCE_SHA256,
            },
        )
        self.assertEqual(receipt["downstream_authorization"], acceptance["downstream_authorization"])
        self.assertEqual(
            receipt["claims"],
            {
                "task4_advantage_games_qc_accepted": True,
                "task4_compact_wide_real_input_accepted": True,
                "task5_reading_primary_work_may_begin": True,
                "candidate_source_consumable": False,
                "production_catalog_or_loader_exposed": False,
                "task5_host_proof_success_claimed": False,
                "reading_host_proof_success_claimed": False,
                "primary_host_proof_success_claimed": False,
                "tenant_safe_persistence_success_claimed": False,
                "retirement_complete_claimed": False,
                "cartridge_cutover_authorized": False,
                "broader_cohort_accepted": False,
                "commit_created_for_this_acceptance": False,
            },
        )

    def test_plan_metadata_and_index_preserve_task4_and_bound_later_progression(self) -> None:
        """Requires Task 4 history to remain exact while Dragon Flight Task 5 remains bounded."""
        plan = (TRACK_ROOT / "plan.md").read_text(encoding="utf-8")
        metadata = _load_object(TRACK_ROOT / "metadata.json")
        index = (TRACK_ROOT / "index.md").read_text(encoding="utf-8")

        task4_line = next(line for line in plan.splitlines() if "Prove Advantage Games QC" in line)
        self.assertTrue(task4_line.startswith("- [x]"))

        task5_line = next(
            (
                line
                for line in plan.splitlines()
                if "Recover Task 5 through a Dragon Flight-only signed-attempt" in line
            ),
            "",
        )
        self.assertTrue(task5_line.startswith("- [~]"))
        self.assertIn("shared 24-title candidate", task5_line)
        self.assertIn("historical non-consumable", task5_line)

        task5_runtime_line = next(
            (line for line in plan.splitlines() if "Dragon Flight dedicated runtime" in line),
            "",
        )
        self.assertTrue(task5_runtime_line.startswith("  - [~]"))
        self.assertIn("both host boundaries", task5_runtime_line)

        task5_threat_model_line = next(
            (line for line in plan.splitlines() if "both hosts must use the checkpoint protocol" in line),
            "",
        )
        self.assertTrue(task5_threat_model_line.startswith("  - [~]"))
        self.assertIn("adversarial direct-JSON/same-frame-bypass tests must pass", task5_threat_model_line)

        task5_checklist_line = next(
            (line for line in plan.splitlines() if "Terra phase-acceptance checklist" in line),
            "",
        )
        self.assertTrue(task5_checklist_line.startswith("  - [~]"))
        self.assertIn("both host routes derive actor and tenant from the session", task5_checklist_line)
        self.assertIn(
            "real cartridge must prove same-frame choose-gate then launch works only after the server-issued dwell",
            task5_checklist_line,
        )
        self.assertIn("failed or missing receipt prevents completion", task5_checklist_line)

        deferred_marker = "(deferred:apk_existing_core_cutover_20260727-dragon-flight-reference-acceptance)"
        for later_marker in (
            "Retire only each title's exact replaced legacy paths",
            "Obtain independent review and product-owner acceptance",
        ):
            later_line = next(
                (line for line in plan.splitlines() if later_marker in line),
                "",
            )
            self.assertTrue(later_line.startswith("- [b]"), f"{later_marker} must remain blocked")
            self.assertIn(deferred_marker, later_line)

        task4_acceptance = next(item for item in metadata["task_acceptances"] if item["task_number"] == 4)
        self.assertEqual(task4_acceptance["approval_message_exact"], EXPECTED_APPROVAL_MESSAGE)
        self.assertEqual(task4_acceptance["product_owner_acceptance_sha256"], EXPECTED_ACCEPTANCE_SHA256)
        self.assertEqual(task4_acceptance["accepted_receipt_sha256"], EXPECTED_RECEIPT_SHA256)
        self.assertEqual(task4_acceptance["authorization"], "begin-task5-reading-primary-host-proof-only")
        self.assertFalse(task4_acceptance["production_catalog_or_loaders_exposed"])
        self.assertFalse(task4_acceptance["task5_success_claimed"])
        self.assertFalse(task4_acceptance["retirement_claimed"])
        self.assertFalse(task4_acceptance["broader_cohort_accepted"])
        self.assertIn("Task 4 Product-owner Acceptance", index)
        self.assertIn("Accepted Task 4 QC Receipt", index)


if __name__ == "__main__":
    unittest.main()
