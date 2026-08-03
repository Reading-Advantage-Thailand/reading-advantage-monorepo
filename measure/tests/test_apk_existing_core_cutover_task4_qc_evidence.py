"""Task 4 Advantage Games QC evidence binding for the existing core APK cohort.

The evidence package pins the Advantage Games QC and compact/wide real-input
proof to the accepted T11/Task 3 lineage without exposing the production
catalog, advancing Reading/Primary host proof, claiming retirement, or
authorizing cutover. Every JSON field references exact committed source bytes
whose SHA-256 must match.
"""

from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
EVIDENCE_PATH = (
    REPO_ROOT
    / "measure/archive/apk_existing_core_cutover_20260727"
    / "task4-advantage-games-qc-evidence-v1.json"
)
SEMANTIC_ADOPTION_RECEIPT_PATH = (
    REPO_ROOT
    / "measure/archive/apk_existing_core_cutover_20260727"
    / "accepted-semantic-adoption-receipt-v1.json"
)
EXPECTED_EVIDENCE_SHA256 = "7a9dae4d640f881f76c001be73315b74d07b19258226d01f09390c37adaba058"
EXPECTED_SEMANTIC_ADOPTION_RECEIPT_SHA256 = "e82d42d9ec046b85eb4aeac7800623bce3c3bf4a39a9c0f44288bd93d07be240"
EXPECTED_TITLES = ("dragon-flight", "magic-defense", "dungeon-liberator", "sorcerer-ziggurat", "astral-mage")
EXPECTED_INPUT_MODES = {"vocabulary": ("dragon-flight", "magic-defense"), "sentence": ("dungeon-liberator", "sorcerer-ziggurat", "astral-mage")}


def _sha256(path: Path) -> str:
    """Returns the SHA-256 digest of the file's exact bytes."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _load_object(path: Path) -> dict[str, Any]:
    """Loads one JSON artifact and requires an object at its root."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain a JSON object")
    return value


def _binding_sha256(binding: dict[str, Any]) -> str:
    """Returns the recorded SHA-256 binding for a path/object evidence item."""
    sha = binding.get("sha256")
    if not isinstance(sha, str) or len(sha) != 64:
        raise AssertionError(f"Binding is missing a 64-character SHA-256: {binding}")
    return sha


class ExistingCoreTask4EvidenceTests(unittest.TestCase):
    """Pins the Task 4 QC evidence to its accepted inputs and the five-title scope."""

    def test_evidence_bytes_and_schema_version_are_exact(self) -> None:
        """Requires the immutable evidence file with its recorded schema version."""
        evidence_bytes = EVIDENCE_PATH.read_bytes()
        evidence = _load_object(EVIDENCE_PATH)

        self.assertEqual(hashlib.sha256(evidence_bytes).hexdigest(), EXPECTED_EVIDENCE_SHA256)
        self.assertEqual(evidence["schema_version"], "apk-existing-core-task4-advantage-games-qc-evidence.v1")
        self.assertEqual(evidence["track_id"], "apk_existing_core_cutover_20260727")
        self.assertEqual(evidence["task_number"], 4)
        self.assertEqual(evidence["scope"], "advantage-games-qc-and-compact-wide-real-input-only")

    def test_evidence_rebinds_only_the_accepted_task3_receipt(self) -> None:
        """Rebinds the task-3 semantic-adoption receipt and the T11 extension acceptance."""
        evidence = _load_object(EVIDENCE_PATH)

        self.assertEqual(
            _binding_sha256(evidence["accepted_inputs"]["semantic_adoption_receipt"]),
            EXPECTED_SEMANTIC_ADOPTION_RECEIPT_SHA256,
        )
        self.assertEqual(
            _binding_sha256(evidence["accepted_inputs"]["t11_extension_acceptance"]),
            "60fbb63f846cd19873578393684c71e742a73595cf13efd4d96949812598215d",
        )
        self.assertEqual(
            _binding_sha256(evidence["accepted_inputs"]["developer_kit_api"]),
            "e45307e3a00cbbe8d408d2d9e8cfb88bbc53ab053cbb5ee043fa518ca0f592d0",
        )
        self.assertEqual(evidence["accepted_inputs"]["developer_kit_api"]["api_version"], "2.0.0")

        self.assertEqual(
            _sha256(REPO_ROOT / evidence["accepted_inputs"]["semantic_adoption_receipt"]["path"]),
            EXPECTED_SEMANTIC_ADOPTION_RECEIPT_SHA256,
        )
        self.assertEqual(
            _sha256(REPO_ROOT / evidence["accepted_inputs"]["t11_extension_acceptance"]["path"]),
            "60fbb63f846cd19873578393684c71e742a73595cf13efd4d96949812598215d",
        )

    def test_evidence_proofs_all_five_titles_with_compact_wide_and_real_input(self) -> None:
        """Lists exactly the five accepted titles and proves every required invariant per title."""
        evidence = _load_object(EVIDENCE_PATH)
        proofs = evidence["title_proofs"]
        self.assertEqual([proof["public_id"] for proof in proofs], list(EXPECTED_TITLES))

        for proof in proofs:
            self.assertEqual(proof["compact_390x844"], "passed", proof["public_id"])
            self.assertEqual(proof["wide_1440x900"], "passed", proof["public_id"])
            self.assertEqual(proof["keyboard"], "passed", proof["public_id"])
            self.assertEqual(proof["pointer"], "passed", proof["public_id"])
            self.assertEqual(proof["touch"], "passed", proof["public_id"])
            self.assertEqual(proof["completion_once"], "passed", proof["public_id"])
            self.assertEqual(proof["one_canvas_resize_state_preservation"], "passed", proof["public_id"])
            self.assertEqual(proof["english_short_and_worst"], "passed", proof["public_id"])
            self.assertEqual(proof["thai_short_and_worst"], "passed", proof["public_id"])
            self.assertEqual(proof["overflow_or_obscured_regions"], 0, proof["public_id"])
            self.assertGreater(len(proof["selected_semantic_keys"]), 0)

    def test_evidence_records_selected_union_only_and_no_full_pack_delivery(self) -> None:
        """Asserts the seven selected assets and the strictly smaller-than-full-pack delivery."""
        evidence = _load_object(EVIDENCE_PATH)
        union = evidence["standard_pack_selected_output"]

        self.assertEqual(union["release_version"], "2026.07.23")
        self.assertEqual(union["catalog_asset_count"], 43075)
        self.assertEqual(union["cohort_selected_union_count"], len(union["physical_assets"]))
        self.assertLess(union["cohort_selected_union_count"], union["catalog_asset_count"])
        self.assertFalse(union["full_pack_delivered"])
        unique = {asset["sha256"] for asset in union["physical_assets"]}
        self.assertEqual(len(unique), union["cohort_selected_union_count"])

    def test_evidence_quarantines_the_production_catalog_and_root_exports(self) -> None:
        """Requires the production catalog and the package index to remain unmodified."""
        evidence = _load_object(EVIDENCE_PATH)
        bindings = evidence["implementation_bindings"]

        self.assertTrue(bindings["production_catalog"]["remained_empty"])
        self.assertEqual(
            _binding_sha256(bindings["production_catalog"]),
            "14afe602f10710db17edc3a311177f16f148cac24473d3d975de4284ca19b55b",
        )
        self.assertFalse(bindings["production_root_exports"]["qc_registry_exported_from_root"])
        self.assertEqual(
            _binding_sha256(bindings["production_root_exports"]),
            "1f9fdca42f51e5140dc998752ab2c6f6049ef07e1b78b3a90693e5e4fdbf8eda",
        )

    def test_evidence_rebinds_only_documented_source_lineage(self) -> None:
        """Pins the accepted source bytes for current and historical titles."""
        evidence = _load_object(EVIDENCE_PATH)
        lineage = evidence["source_lineage_inspection"]

        self.assertEqual(
            _sha256(REPO_ROOT / lineage["dragon_flight_current_source"]["path"]),
            lineage["dragon_flight_current_source"]["accepted_blob_sha256"],
        )
        self.assertEqual(
            _sha256(REPO_ROOT / lineage["dungeon_liberator_current_source"]["path"]),
            lineage["dungeon_liberator_current_source"]["accepted_blob_sha256"],
        )
        self.assertEqual(
            lineage["sorcerer_ziggurat_archived_source"]["temporal_scope"],
            "historical-source-only",
        )
        self.assertEqual(
            lineage["astral_mage_archived_source"]["temporal_scope"],
            "historical-source-only",
        )
        self.assertEqual(
            lineage["sorcerer_ziggurat_archived_source"]["accepted_blob_sha256"],
            lineage["sorcerer_ziggurat_archived_source"]["git_show_sha256"],
        )
        self.assertEqual(
            lineage["astral_mage_archived_source"]["accepted_blob_sha256"],
            lineage["astral_mage_archived_source"]["git_show_sha256"],
        )
        self.assertFalse(lineage["failed_ontology_consumed"])

    def test_evidence_claims_disclose_no_advancement_beyond_task4_scope(self) -> None:
        """Rejects any claim of catalog exposure, Reading/Primary host proof, retirement, or cutover."""
        evidence = _load_object(EVIDENCE_PATH)
        claims = evidence["claims"]

        self.assertTrue(claims["task4_advantage_games_qc_complete"])
        self.assertTrue(claims["task4_compact_wide_real_input_complete"])
        self.assertFalse(claims["candidate_source_consumable"])
        self.assertFalse(claims["catalog_or_loader_exposed"])
        self.assertFalse(claims["reading_host_proof_claimed"])
        self.assertFalse(claims["primary_host_proof_claimed"])
        self.assertFalse(claims["tenant_safe_persistence_claimed"])
        self.assertFalse(claims["retirement_complete_claimed"])
        self.assertFalse(claims["cartridge_cutover_authorized"])
        self.assertFalse(claims["broader_cohort_accepted"])
        self.assertFalse(claims["production_catalog_exposed"])
        self.assertFalse(claims["commit_created_for_this_evidence"])


if __name__ == "__main__":
    unittest.main()
