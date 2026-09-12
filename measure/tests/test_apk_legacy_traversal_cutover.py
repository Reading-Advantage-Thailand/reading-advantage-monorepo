"""Fails closed on the Legacy Traversal Tasks 1–5 evidence and source scope."""

from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK = REPO_ROOT / "measure/archive/apk_legacy_traversal_cutover_20260727"
MANIFEST = TRACK / "task1-source-readiness-manifest-v1.json"
DOSSIERS = TRACK / "task2-canonical-suitability-dossiers-v2.json"
OWNER_ACCEPTANCE = TRACK / "task2-owner-acceptance-v2.json"
TASK5_EVIDENCE = TRACK / "task5-advantage-games-qc-native-input-evidence-v2.json"
EXPECTED_IDS = [
    "dragon-rider",
    "spellweavers-run",
    "shadow-gate-dungeon",
    "labyrinth-goblin-king",
    "griffin-riders-escape",
]


def _load(path: Path) -> dict[str, Any]:
    """Loads a repository-local evidence object.

    Args:
        path: Path of the JSON evidence record.

    Returns:
        The parsed object.
    """
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain a JSON object")
    return value


def _sha256(path: Path) -> str:
    """Returns a file's current SHA-256 digest.

    Args:
        path: File whose evidence binding is verified.

    Returns:
        Lowercase SHA-256 digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


class LegacyTraversalCutoverEvidenceTests(unittest.TestCase):
    """Verifies exact readines, suitability, and ownership boundaries for Tasks 1–5."""

    def test_task1_manifest_binds_the_accepted_receipt_and_exact_five_title_crosswalk(self) -> None:
        """Requires the source manifest to preserve exact traversal identity evidence."""
        manifest = _load(MANIFEST)
        self.assertEqual(manifest["status"], "evidence-only")
        self.assertEqual(manifest["source_bindings"]["accepted_readiness_receipt"]["sha256"], "d371fc5df05922d5f1bbb50b837c0fd5314d8f136e2c699510c84186447f1720")
        self.assertEqual([title["title_id"] for title in manifest["titles"]], EXPECTED_IDS)
        self.assertEqual([title["assignment_index"] for title in manifest["titles"]], [11, 13, 14, 15, 16])
        self.assertTrue(all(title["legacy_source_records"] for title in manifest["titles"]))
        self.assertTrue(all(title["legacy_source_records_status"] == "observation-only-not-adoption-or-approval" for title in manifest["titles"]))
        for source in manifest["source_bindings"].values():
            source_path = REPO_ROOT / source["archive_preferred_path"]
            self.assertTrue(source_path.is_file(), f"missing accepted predecessor: {source_path}")
            self.assertEqual(source["sha256"], _sha256(source_path))
        self.assertFalse(manifest["claims"]["cutover_claimed"])

    def test_task2_persists_accepted_per_title_v2_dossiers_without_legacy_ingestion(self) -> None:
        """Requires every traversal title to have a claim-bound canonical decision and selected union."""
        dossiers = _load(DOSSIERS)
        self.assertEqual(dossiers["status"], "owner-accepted-for-advantage-games-qc-only")
        self.assertEqual([title["title_id"] for title in dossiers["titles"]], EXPECTED_IDS)
        self.assertTrue(dossiers["authorization"]["advantage_games_qc_registration_authorized"])
        for forbidden in (
            "production_use_authorized",
            "reading_host_authorized",
            "primary_host_authorized",
            "completion_persistence_authorized",
            "ingestion_authorized",
            "migration_authorized",
            "cutover_authorized",
            "retirement_authorized",
            "deployment_authorized",
            "title_adoption_authorized",
        ):
            self.assertFalse(dossiers["authorization"][forbidden])
        self.assertEqual(dossiers["legacy_asset_disposition"]["reuse"], "blocked")
        self.assertEqual(dossiers["legacy_asset_disposition"]["ingestion"], "blocked")

        for title in dossiers["titles"]:
            claim_artifact = title["claim_artifact"]
            claim_path = REPO_ROOT / claim_artifact["path"]
            self.assertTrue(claim_path.is_file(), f"missing title claim artifact: {claim_path}")
            self.assertEqual(claim_artifact["sha256"], _sha256(claim_path))
            self.assertEqual(title["selected_union"], sorted(set(title["selected_union"])))
            self.assertGreater(len(title["role_dossiers"]), 0)
            for role in title["role_dossiers"]:
                self.assertEqual(role["decision"], "reuse-canonical")
                self.assertTrue(role["claim_provenance"]["claim_id"])
                self.assertTrue(role["claim_provenance"]["locator"])
                self.assertNotIn("apps/", role["descriptor_id"])

        griffin = next(title for title in dossiers["titles"] if title["title_id"] == "griffin-riders-escape")
        self.assertEqual(
            griffin["claim_artifact"]["sha256"],
            "9269956e48572e3ef9f0359f731a0f4f3c9d2193ede6128c0952b5a4bdd4dd59",
        )
        self.assertEqual(len(griffin["claim_artifact"]["sha256"]), 64)

    def test_task_evidence_is_bound_to_live_owned_files_only(self) -> None:
        """Rejects stale hash references and accidental edits outside the cartridge ownership boundary."""
        dossiers = _load(DOSSIERS)
        acceptance = _load(OWNER_ACCEPTANCE)
        bindings = dossiers["implementation_bindings"]
        self.assertEqual(acceptance["status"], "accepted-bounded-advantage-games-qc-only")
        self.assertEqual(acceptance["accepted_input"]["sha256"], _sha256(DOSSIERS))
        self.assertEqual(acceptance["accepted_input"]["title_count"], 5)
        self.assertTrue(acceptance["authorization"]["advantage_games_qc_registration_authorized"])
        self.assertFalse(acceptance["authorization"]["production_use_authorized"])
        self.assertFalse(acceptance["authorization"]["reading_host_authorized"])
        self.assertFalse(acceptance["authorization"]["primary_host_authorized"])
        self.assertFalse(acceptance["authorization"]["completion_persistence_authorized"])
        self.assertEqual(set(bindings), {
            "traversal_suitability",
            "dragon_rider",
            "spellweavers_run",
            "shadow_gate_dungeon",
            "labyrinth_goblin_king",
            "griffin_riders_escape",
            "qc_adapter",
            "mechanic_test",
            "qc_adapter_test",
            "qc_data",
            "qc_component",
            "qc_page_test",
            "chromium_proof",
        })
        for binding in bindings.values():
            path = REPO_ROOT / binding["path"]
            self.assertTrue(path.is_file())
            self.assertEqual(binding["sha256"], _sha256(path))

    def test_task5_records_real_native_chromium_qc_without_host_promotion(self) -> None:
        """Requires the browser receipt to bind only the local traversal QC proof."""
        evidence = _load(TASK5_EVIDENCE)
        self.assertEqual(evidence["result"]["status"], "passed")
        self.assertEqual(evidence["result"]["browser"], "Chromium")
        self.assertEqual(evidence["result"]["native_input"], ["keyboard", "pointer", "touch"])
        self.assertEqual(evidence["result"]["profiles"], ["compact", "wide"])
        self.assertEqual(evidence["result"]["titles"], EXPECTED_IDS)
        self.assertEqual(evidence["accepted_inputs"]["task2_dossiers"]["sha256"], _sha256(DOSSIERS))
        self.assertEqual(evidence["accepted_inputs"]["owner_acceptance"]["sha256"], _sha256(OWNER_ACCEPTANCE))
        for source in evidence["source"].values():
            path = REPO_ROOT / source["path"]
            self.assertTrue(path.is_file())
            self.assertEqual(source["sha256"], _sha256(path))
        self.assertIn("not a production catalog", " ".join(evidence["disclosures"]).lower())


if __name__ == "__main__":
    unittest.main()
