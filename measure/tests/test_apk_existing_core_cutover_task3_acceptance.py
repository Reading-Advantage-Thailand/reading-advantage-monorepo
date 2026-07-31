"""Integrity checks for existing-core task-3 semantic-adoption acceptance."""

from __future__ import annotations

import base64
import hashlib
import json
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ROOT = REPO_ROOT / "measure/tracks/apk_existing_core_cutover_20260727"
ACCEPTANCE_PATH = TRACK_ROOT / "task3-product-owner-acceptance-v1.json"
RECEIPT_PATH = TRACK_ROOT / "accepted-semantic-adoption-receipt-v1.json"
CORRECTION_PATH = TRACK_ROOT / "task3-evidence-lineage-correction-v1.json"
CURRENT_LINEAGE_RECEIPT_PATH = TRACK_ROOT / "task3-current-lineage-receipt-v1.json"
CURRENT_LINEAGE_REVIEW_PATH = TRACK_ROOT / "review-task3-current-lineage-v1.md"
EXPECTED_ACCEPTANCE_SHA256 = "65ffbaa27ef19be1f65015daa8fad4d2f4ca58990ba2fea5653327627452c3b1"
EXPECTED_RECEIPT_SHA256 = "e82d42d9ec046b85eb4aeac7800623bce3c3bf4a39a9c0f44288bd93d07be240"
EXPECTED_CORRECTION_SHA256 = "008b042ddab1e5486c2b51fb5625b8f89084c471fc03a3bc4dab29231e509796"
EXPECTED_CURRENT_LINEAGE_REVIEW_SHA256 = "2042061ffe67246c56f47cd1c4639ec39e1bd4ec5156952e6b46415fff24a657"
CORRECTED_SUBJECT_KEYS = {"remediation_evidence", "independent_zero_finding_rereview"}

EXPECTED_SUBJECTS = {
    "semantic_candidate_source": {
        "path": "packages/game-cartridges/src/existing-core-cutover-semantic-candidates.ts",
        "sha256": "8d33f785fed5487ac81dd7e6501d5b867cd5faa614274726fa8d3d299148a9d3",
    },
    "evidence_fixture": {
        "path": "packages/game-cartridges/src/existing-core-cutover.evidence.json",
        "sha256": "85d1ff9012d9bab6311f48ed1571877e78ce680b640939d87154ab80fc9cdffb",
    },
    "remediation_evidence": {
        "path": "measure/tracks/apk_existing_core_cutover_20260727/review-task3-semantic-candidates-remediation.md",
        "sha256": "9b7df1be5dd9c89c3ea6aa25c6fe01ea4d450b886a472276cd68372ec2154e44",
    },
    "independent_zero_finding_rereview": {
        "path": "measure/tracks/apk_existing_core_cutover_20260727/review-task3-semantic-candidates-rereview.md",
        "sha256": "7c3675aca01499e81eba60dcea049715c4652e1474716a633eb8676d3c28a526",
    },
}

EXPECTED_ADOPTIONS = [
    {
        "public_id": "dragon-flight",
        "canonical_id": "game:dragon-flight",
        "title": "Dragon Flight",
        "input_mode": "vocabulary",
        "temporal_label": "current-source",
        "mappings": [
            {"role": "player", "state": "idle", "semantic_key": "top-down/32x32/characters/hero-01"},
            {"role": "feedback", "state": "correct", "semantic_key": "effects/32x32/combat/hit-01"},
            {"role": "audio-feedback", "state": "correct", "semantic_key": "audio/native/combat/hit-01"},
        ],
    },
    {
        "public_id": "magic-defense",
        "canonical_id": "game:magic-defense",
        "title": "Magic Defense",
        "input_mode": "vocabulary",
        "temporal_label": "current-source",
        "mappings": [
            {"role": "panel", "state": "default", "semantic_key": "ui/20x20/inventory/slot"},
            {"role": "status", "state": "armor", "semantic_key": "ui/32x32/items/armor-icons"},
            {"role": "feedback", "state": "correct", "semantic_key": "effects/32x32/combat/hit-01"},
            {"role": "audio-feedback", "state": "correct", "semantic_key": "audio/native/combat/hit-01"},
        ],
    },
    {
        "public_id": "dungeon-liberator",
        "canonical_id": "game:dungeon-liberator",
        "title": "Dungeon Liberator",
        "input_mode": "sentence",
        "temporal_label": "current-source",
        "mappings": [
            {"role": "player", "state": "idle", "semantic_key": "top-down/32x32/characters/hero-01"},
            {"role": "enemy", "state": "idle", "semantic_key": "side-view/32x32/characters/enemy-001-idle"},
            {"role": "feedback", "state": "correct", "semantic_key": "effects/32x32/combat/hit-01"},
            {"role": "control", "state": "confirm", "semantic_key": "ui/16x16/controls/gamepad-buttons"},
        ],
    },
    {
        "public_id": "sorcerer-ziggurat",
        "canonical_id": "game:sorcerer-ziggurat",
        "title": "The Sorcerer's Ziggurat",
        "input_mode": "sentence",
        "temporal_label": "historical-source-only",
        "mappings": [
            {"role": "player", "state": "idle", "semantic_key": "top-down/32x32/characters/hero-01"},
            {"role": "feedback", "state": "correct", "semantic_key": "effects/32x32/combat/hit-01"},
            {"role": "control", "state": "confirm", "semantic_key": "ui/16x16/controls/gamepad-buttons"},
        ],
    },
    {
        "public_id": "astral-mage",
        "canonical_id": "game:astral-mage",
        "title": "Astral Mage",
        "input_mode": "sentence",
        "temporal_label": "historical-source-only",
        "mappings": [
            {"role": "player", "state": "idle", "semantic_key": "top-down/32x32/characters/hero-01"},
            {"role": "feedback", "state": "correct", "semantic_key": "effects/32x32/combat/hit-01"},
            {"role": "audio-feedback", "state": "correct", "semantic_key": "audio/native/combat/hit-01"},
        ],
    },
]

EXPECTED_DISCLOSURES = [
    "T10 and T11 approve zero legacy asset mappings and zero accepted runtime contracts; these are forward semantic product decisions only.",
    "The accepted source remains classified as a per-title semantic-adoption candidate with status candidate and consumable=false; acceptance does not expose catalog or loader entries.",
    "Current-source labels describe accepted source evidence, not Advantage Games browser, responsive, performance, or host-proof success.",
    "Sorcerer's Ziggurat and Astral Mage remain historical-source-only; no current-source or current-gameplay promotion is claimed.",
    "Only selected standard-pack unions from release 2026.07.23 are accepted; direct paths, private packs, duplicate physical sources, and full-pack delivery remain prohibited.",
    "The independent re-review's pre-approval statement that product-owner acceptance was absent remains historically accurate.",
    "Reading and Primary host proof, tenant-safe persistence, replay, navigation, exact retirement, cutover, broader cohort acceptance, and production readiness remain unproved and unauthorized.",
]


def _sha256(path: Path) -> str:
    """Returns the SHA-256 digest of one file's exact bytes."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _load_object(path: Path) -> dict[str, Any]:
    """Loads one JSON artifact and requires an object at its root."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain a JSON object")
    return value


def _assert_subject_bytes(
    subject_key: str,
    subject: dict[str, str],
    correction: dict[str, Any],
) -> None:
    """Validates either a current subject or its exact recovered historical bytes."""
    if subject_key not in CORRECTED_SUBJECT_KEYS:
        if _sha256(REPO_ROOT / subject["path"]) != subject["sha256"]:
            raise AssertionError(f"Accepted subject drift: {subject_key}")
        return

    recovery = correction["recovered_subjects"][subject_key]
    if recovery["accepted_binding"] != subject:
        raise AssertionError(f"Correction changes accepted binding: {subject_key}")
    snapshot = recovery["recovered_snapshot"]
    descendant = recovery["current_descendant"]
    snapshot_path = REPO_ROOT / snapshot["path"]
    if snapshot["encoding"] != "base64":
        raise AssertionError(f"Unsupported snapshot encoding: {subject_key}")
    if _sha256(snapshot_path) != snapshot["artifact_sha256"]:
        raise AssertionError(f"Encoded snapshot drift: {subject_key}")
    accepted_bytes = base64.b64decode(snapshot_path.read_bytes(), validate=True)
    accepted_sha256 = hashlib.sha256(accepted_bytes).hexdigest()
    if snapshot["decoded_sha256"] != subject["sha256"] or accepted_sha256 != subject["sha256"]:
        raise AssertionError(f"Snapshot does not preserve accepted hash: {subject_key}")
    if descendant["path"] != subject["path"]:
        raise AssertionError(f"Correction disguises descendant path: {subject_key}")
    if _sha256(REPO_ROOT / descendant["path"]) != descendant["sha256"]:
        raise AssertionError(f"Current descendant drift: {subject_key}")
    if recovery["drift_classification"] != "markdown-hard-line-break-trailing-space-normalization-only":
        raise AssertionError(f"Unsupported accepted-subject drift: {subject_key}")
    if recovery["semantic_content_changed"] is not False:
        raise AssertionError(f"Correction claims semantic drift: {subject_key}")

    accepted_text = accepted_bytes.decode("utf-8")
    descendant_text = (REPO_ROOT / descendant["path"]).read_text(encoding="utf-8")
    normalized_text = "\n".join(line.rstrip(" ") for line in accepted_text.split("\n"))
    if descendant_text != normalized_text:
        raise AssertionError(f"Descendant differs beyond trailing-space normalization: {subject_key}")


class ExistingCoreTask3AcceptanceTests(unittest.TestCase):
    """Pins owner acceptance and the bounded accepted semantic-adoption receipt."""

    def test_product_owner_acceptance_binds_only_current_reviewed_subjects(self) -> None:
        """Requires exact approval provenance and the exhaustive four-subject binding."""
        acceptance = _load_object(ACCEPTANCE_PATH)
        correction = _load_object(CORRECTION_PATH)

        self.assertEqual(_sha256(ACCEPTANCE_PATH), EXPECTED_ACCEPTANCE_SHA256)
        self.assertEqual(_sha256(CORRECTION_PATH), EXPECTED_CORRECTION_SHA256)
        self.assertEqual(correction["track_id"], "apk_existing_core_cutover_20260727")
        self.assertEqual(correction["task_number"], 3)
        self.assertEqual(
            set(correction["recovered_subjects"]),
            CORRECTED_SUBJECT_KEYS,
        )
        self.assertFalse(correction["governance"]["immutable_acceptance_record_rewritten"])
        self.assertFalse(correction["governance"]["immutable_accepted_receipt_rewritten"])
        self.assertFalse(correction["governance"]["accepted_subject_bytes_changed"])
        self.assertFalse(correction["governance"]["owner_acceptance_claimed_by_this_correction"])
        self.assertFalse(correction["governance"]["downstream_authorization_expanded"])
        self.assertFalse(correction["governance"]["task5_acceptance_authorized"])
        self.assertEqual(acceptance["schema_version"], "apk-existing-core-task3-product-owner-acceptance.v1")
        self.assertEqual(acceptance["track_id"], "apk_existing_core_cutover_20260727")
        self.assertEqual(acceptance["task_number"], 3)
        self.assertEqual(acceptance["decision"], "approve-semantic-adoption")
        self.assertEqual(acceptance["status"], "accepted")
        self.assertEqual(acceptance["revocation_state"], "active")
        self.assertEqual(acceptance["approval_event"]["message_exact"], "Approved. Continue")
        self.assertEqual(
            acceptance["approval_event"]["message_sha256"],
            "4a6bf421eb4ea11252f61fc59eda6a3fe4edec86f42cfc9d8d0bc66263524de7",
        )
        self.assertIsNone(acceptance["approval_event"]["durable_user_message_id"])
        self.assertFalse(acceptance["approval_event"]["durable_user_message_id_available"])
        self.assertIsNone(acceptance["approval_event"]["durable_user_event_id"])
        self.assertFalse(acceptance["approval_event"]["durable_user_event_id_available"])
        self.assertIsNone(acceptance["approval_event"]["event_timestamp"])
        self.assertFalse(acceptance["approval_event"]["event_timestamp_available"])
        self.assertEqual(acceptance["accepted_subjects"], EXPECTED_SUBJECTS)

        for subject_key, subject in EXPECTED_SUBJECTS.items():
            _assert_subject_bytes(subject_key, subject, correction)

    def test_acceptance_records_exact_release_scope_mappings_and_disclosures(self) -> None:
        """Requires the five-title adoption and every limiting disclosure verbatim."""
        acceptance = _load_object(ACCEPTANCE_PATH)

        self.assertEqual(
            acceptance["standard_pack_release"],
            {
                "version": "2026.07.23",
                "catalog_digest": "ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087",
                "source_receipt_digest": "93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9",
                "required_credit": "Pixel art assets by ElvGames",
                "asset_count": 43075,
                "materialization": "accepted-cartridge-selected-union-only",
            },
        )
        self.assertEqual(acceptance["semantic_adoptions"], EXPECTED_ADOPTIONS)
        self.assertEqual(acceptance["binding_disclosures"], EXPECTED_DISCLOSURES)

    def test_authorization_is_limited_to_beginning_task4_advantage_games_proof(self) -> None:
        """Rejects any acceptance that authorizes exposure, cutover, other hosts, or retirement."""
        acceptance = _load_object(ACCEPTANCE_PATH)
        authorization = acceptance["downstream_authorization"]

        self.assertEqual(authorization["status"], "authorized-for-task4-advantage-games-qc-only")
        self.assertEqual(authorization["authorized_track"], "apk_existing_core_cutover_20260727")
        self.assertEqual(authorization["authorized_task"], 4)
        self.assertEqual(
            authorization["authorized_work"],
            [
                "begin Advantage Games QC for the five accepted semantic adoptions",
                "begin compact and wide real-input host-proof work in Advantage Games",
            ],
        )
        self.assertEqual(
            authorization["excluded_actions"],
            [
                "catalog or loader exposure",
                "cartridge consumability or cutover",
                "Reading or Primary host proof",
                "legacy path deletion or retirement",
                "broader cohort or track acceptance",
                "production readiness or deployment",
            ],
        )

    def test_accepted_receipt_rebinds_acceptance_without_expanding_authority(self) -> None:
        """Requires an immutable receipt over the exact subjects and owner acceptance."""
        acceptance = _load_object(ACCEPTANCE_PATH)
        receipt = _load_object(RECEIPT_PATH)
        acceptance_binding = {
            "path": "measure/tracks/apk_existing_core_cutover_20260727/task3-product-owner-acceptance-v1.json",
            "sha256": _sha256(ACCEPTANCE_PATH),
        }

        self.assertEqual(_sha256(RECEIPT_PATH), EXPECTED_RECEIPT_SHA256)
        self.assertEqual(receipt["schema_version"], "apk-existing-core-accepted-semantic-adoption-receipt.v1")
        self.assertEqual(receipt["track_id"], "apk_existing_core_cutover_20260727")
        self.assertEqual(receipt["task_number"], 3)
        self.assertEqual(receipt["status"], "accepted")
        self.assertEqual(receipt["revocation_state"], "active")
        self.assertEqual(receipt["bindings"], {**EXPECTED_SUBJECTS, "product_owner_acceptance": acceptance_binding})
        self.assertEqual(receipt["standard_pack_release"], acceptance["standard_pack_release"])
        self.assertEqual(receipt["semantic_adoptions"], EXPECTED_ADOPTIONS)
        self.assertEqual(receipt["binding_disclosures"], EXPECTED_DISCLOSURES)
        self.assertEqual(receipt["downstream_authorization"], acceptance["downstream_authorization"])
        self.assertEqual(
            receipt["claims"],
            {
                "task3_semantic_adoption_accepted": True,
                "task4_advantage_games_work_may_begin": True,
                "candidate_source_consumable": False,
                "catalog_or_loader_exposed": False,
                "advantage_games_host_proof_claimed": False,
                "reading_host_proof_claimed": False,
                "primary_host_proof_claimed": False,
                "tenant_safe_persistence_claimed": False,
                "retirement_complete_claimed": False,
                "cartridge_cutover_authorized": False,
                "broader_cohort_accepted": False,
                "commit_created_for_this_acceptance": False,
            },
        )

    def test_catalog_and_loader_quarantine_bytes_are_unchanged(self) -> None:
        """Pins the reviewed empty catalog and non-exposing package index boundaries."""
        self.assertEqual(
            _sha256(REPO_ROOT / "packages/game-cartridges/src/catalog.ts"),
            "14afe602f10710db17edc3a311177f16f148cac24473d3d975de4284ca19b55b",
        )
        self.assertEqual(
            _sha256(REPO_ROOT / "packages/game-cartridges/src/index.ts"),
            "1f9fdca42f51e5140dc998752ab2c6f6049ef07e1b78b3a90693e5e4fdbf8eda",
        )

    def test_plan_and_metadata_preserve_task3_acceptance_after_task4_progression(self) -> None:
        """Requires task 3 acceptance to remain exact after separately authorized progression."""
        plan = (TRACK_ROOT / "plan.md").read_text(encoding="utf-8")
        metadata = _load_object(TRACK_ROOT / "metadata.json")
        task_acceptance = next(
            acceptance
            for acceptance in metadata["task_acceptances"]
            if acceptance["task_number"] == 3
        )

        self.assertIn("- [x] Bind and test each title's approved semantic adoption", plan)
        # Task 4 may be complete only under its own separately hash-bound acceptance.
        task4_line = next(
            (line for line in plan.splitlines() if "Prove Advantage Games QC" in line),
            "",
        )
        self.assertIn("- [x]", task4_line)

        # The later additive Task-5 acceptance is complete and Task 6 has only begun.
        task5_line = next(
            (line for line in plan.splitlines() if "Prove Reading and Primary load" in line),
            "",
        )
        self.assertTrue(task5_line.startswith("- [x]"))
        task6_line = next(
            (line for line in plan.splitlines() if "Delete only each title's exact replaced legacy paths" in line),
            "",
        )
        self.assertTrue(task6_line.startswith("- [~]"))
        task7_line = next(
            (line for line in plan.splitlines() if "Obtain independent review and product-owner acceptance" in line),
            "",
        )
        self.assertTrue(task7_line.startswith("- [ ]"))

        self.assertEqual(task_acceptance["task_number"], 3)
        self.assertEqual(task_acceptance["approval_message_exact"], "Approved. Continue")
        self.assertEqual(task_acceptance["product_owner_acceptance_sha256"], EXPECTED_ACCEPTANCE_SHA256)
        self.assertEqual(task_acceptance["accepted_receipt_sha256"], EXPECTED_RECEIPT_SHA256)
        self.assertEqual(
            task_acceptance["authorization"],
            "begin-task4-advantage-games-qc-and-compact-wide-host-proof-only",
        )
        self.assertFalse(task_acceptance["host_proof_claimed"])
        self.assertFalse(task_acceptance["retirement_claimed"])
        self.assertFalse(task_acceptance["broader_cohort_accepted"])

    def test_current_lineage_receipt_additively_rebinds_descendants_without_rewriting_history(self) -> None:
        """Requires a current receipt and review to preserve historical Task-3 bytes exactly."""
        receipt = _load_object(CURRENT_LINEAGE_RECEIPT_PATH)
        self.assertEqual(_sha256(CURRENT_LINEAGE_RECEIPT_PATH), "c5ccb0ac3b54474e2ad99badb2aef5c1608689e57559e2f26c6fb489a5513d7f")
        self.assertEqual(_sha256(CURRENT_LINEAGE_REVIEW_PATH), EXPECTED_CURRENT_LINEAGE_REVIEW_SHA256)
        self.assertEqual(receipt["status"], "current-lineage-verified-additive")
        self.assertEqual(receipt["historical_acceptance"]["sha256"], EXPECTED_ACCEPTANCE_SHA256)
        self.assertEqual(receipt["historical_accepted_receipt"]["sha256"], EXPECTED_RECEIPT_SHA256)
        self.assertEqual(receipt["correction"]["sha256"], EXPECTED_CORRECTION_SHA256)
        self.assertEqual(receipt["current_review"], {
            "path": "measure/tracks/apk_existing_core_cutover_20260727/review-task3-current-lineage-v1.md",
            "sha256": EXPECTED_CURRENT_LINEAGE_REVIEW_SHA256,
            "disposition": "pass-additive-lineage-integrity",
        })
        self.assertFalse(receipt["governance"]["historical_acceptance_rewritten"])
        self.assertFalse(receipt["governance"]["historical_accepted_receipt_rewritten"])
        self.assertFalse(receipt["governance"]["historical_subject_bytes_rewritten"])
        self.assertFalse(receipt["governance"]["semantic_adoptions_changed"])
        self.assertFalse(receipt["governance"]["downstream_authorization_expanded"])


if __name__ == "__main__":
    unittest.main()
