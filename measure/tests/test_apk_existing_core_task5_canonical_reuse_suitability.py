"""Fails closed on the Existing Core canonical-reuse suitability evidence package.

The guard independently recomputes the catalog, receipt, license, credit, and
physical-source facts cited by the five-title dossier index. It keeps pending
owner acceptance literal and prevents this evidence-only package from silently
authorizing a legacy ingestion, retirement, cutover, or Task-5 completion.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
SUITABILITY_TRACK = REPO_ROOT / "measure/tracks/apk_standard_pack_suitability_ingestion_20260728"
CORE_TRACK = REPO_ROOT / "measure/tracks/apk_existing_core_cutover_20260727"
STANDARD_ROOT = REPO_ROOT / "packages/advantage-play-kit/assets/standard"
CATALOG_PATH = STANDARD_ROOT / "standard-pack-release.json"
EVIDENCE_PATH = SUITABILITY_TRACK / "task5-canonical-reuse-evidence-v1.json"
DOSSIERS_PATH = CORE_TRACK / "task5-canonical-reuse-dossiers-v1.json"
MATRIX_PATH = CORE_TRACK / "task5-canonical-reuse-disposition-matrix-v1.json"
OWNER_PATH = CORE_TRACK / "task5-canonical-reuse-owner-acceptance-v1.json"
INDEPENDENT_REVIEW_PATH = SUITABILITY_TRACK / "review-task5-canonical-reuse-v1.md"
TASK3_RECEIPT_PATH = CORE_TRACK / "accepted-semantic-adoption-receipt-v1.json"
TASK3_CURRENT_LINEAGE_RECEIPT_PATH = CORE_TRACK / "task3-current-lineage-receipt-v1.json"
TASK3_LINEAGE_REVIEW_PATH = CORE_TRACK / "review-task3-current-lineage-v1.md"
TASK4_RECEIPT_PATH = CORE_TRACK / "accepted-task4-qc-receipt-v1.json"
SUITABILITY_GOVERNANCE_OWNER_PATH = SUITABILITY_TRACK / "product-owner-acceptance-v2.json"

RELEASE = {
    "version": "2026.07.23",
    "catalog_digest": "ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087",
    "source_receipt_digest": "93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9",
}
NO_AUTHORIZATION = {
    "production_use_authorized": False,
    "ingestion_authorized": False,
    "migration_authorized": False,
    "cutover_authorized": False,
    "retirement_authorized": False,
    "deployment_authorized": False,
    "task5_acceptance_claimed": False,
}


def _load(path: Path) -> dict[str, Any]:
    """Loads a JSON object from a bounded repository evidence path.

    Args:
        path: Repository-local JSON artifact path.

    Returns:
        The parsed JSON object.

    Raises:
        AssertionError: If the artifact is not a JSON object.
    """
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain a JSON object")
    return value


def _sha256(path: Path) -> str:
    """Returns the SHA-256 digest of one repository-local evidence file.

    Args:
        path: Existing file whose encoded bytes are authoritative.

    Returns:
        Lowercase SHA-256 hex digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _repo_path(relative_path: str) -> Path:
    """Resolves a repository-relative evidence locator without allowing an escape.

    Args:
        relative_path: Relative evidence locator from an artifact.

    Returns:
        Resolved path below the repository root.

    Raises:
        AssertionError: If the locator is absolute or escapes the repository.
    """
    candidate = Path(relative_path)
    if candidate.is_absolute():
        raise AssertionError(f"Evidence locator must be relative: {relative_path}")
    resolved = (REPO_ROOT / candidate).resolve()
    try:
        resolved.relative_to(REPO_ROOT.resolve())
    except ValueError as error:
        raise AssertionError(f"Evidence locator escapes repository: {relative_path}") from error
    return resolved


class ExistingCoreCanonicalReuseSuitabilityTests(unittest.TestCase):
    """Validates the real-byte, five-title canonical-reuse suitability package."""

    def test_evidence_recomputes_the_accepted_catalog_receipt_license_and_credit_bytes(self) -> None:
        """Requires the evidence file to cite real accepted-release bytes and legal obligations."""
        evidence = _load(EVIDENCE_PATH)
        catalog = _load(CATALOG_PATH)

        self.assertEqual(evidence["schema_version"], "apk-existing-core-canonical-reuse-evidence.v1")
        self.assertEqual(evidence["status"], "reviewed-canonical-reuse-evidence")
        self.assertEqual(evidence["release"]["version"], RELEASE["version"])
        self.assertEqual(evidence["release"]["catalog_digest"], RELEASE["catalog_digest"])
        self.assertEqual(evidence["release"]["source_receipt_digest"], RELEASE["source_receipt_digest"])
        self.assertEqual(catalog["version"], RELEASE["version"])
        self.assertEqual(catalog["digest"], RELEASE["catalog_digest"])
        self.assertEqual(catalog["sourceReceiptDigest"], RELEASE["source_receipt_digest"])
        self.assertEqual(catalog["requiredCredit"], "Pixel art assets by ElvGames")

        for byte_record in (
            evidence["release"]["catalog_artifact"],
            evidence["release"]["curated_receipt"],
            evidence["release"]["import_receipt"],
            evidence["release"]["license"],
            evidence["release"]["credit"],
        ):
            path = _repo_path(byte_record["path"])
            self.assertTrue(path.is_file())
            self.assertEqual(byte_record["sha256"], _sha256(path))

        self.assertEqual(evidence["release"]["license"]["license_id"], "ElvGames-License-ELVGAMES")
        self.assertEqual(evidence["release"]["license"]["obligations"], [
            "retain-credit",
            "no-generative-ai-training",
            "no-crypto-nft",
            "no-resale",
            "no-authorship-claim",
        ])
        self.assertEqual(evidence["release"]["credit"]["display_text"], "Pixel art assets by ElvGames")
        license_text = _repo_path(evidence["release"]["license"]["path"]).read_text(encoding="utf-8")
        self.assertIn("Use the assets on personal or commercial projects.", license_text)
        self.assertIn("Credits to ElvGames.", license_text)
        self.assertIn("Use on Training/Generative AI.", license_text)

    def test_every_dossier_role_and_matrix_row_matches_the_accepted_semantic_selected_union(self) -> None:
        """Requires all five titles and every accepted Task-3 role to have a canonical-reuse draft."""
        dossiers = _load(DOSSIERS_PATH)
        matrix = _load(MATRIX_PATH)
        task3 = _load(TASK3_RECEIPT_PATH)
        current_lineage = _load(TASK3_CURRENT_LINEAGE_RECEIPT_PATH)

        self.assertEqual(dossiers["schema_version"], "apk-existing-core-task5-canonical-reuse-dossiers.v1")
        self.assertEqual(dossiers["status"], "reviewed-canonical-reuse-drafts-pending-owner-acceptance")
        self.assertEqual(dossiers["release"], RELEASE)
        self.assertEqual(_sha256(TASK3_CURRENT_LINEAGE_RECEIPT_PATH), "c5ccb0ac3b54474e2ad99badb2aef5c1608689e57559e2f26c6fb489a5513d7f")
        self.assertEqual(_sha256(TASK3_LINEAGE_REVIEW_PATH), "2042061ffe67246c56f47cd1c4639ec39e1bd4ec5156952e6b46415fff24a657")
        self.assertEqual(current_lineage["current_review"]["sha256"], _sha256(TASK3_LINEAGE_REVIEW_PATH))
        self.assertFalse(current_lineage["governance"]["historical_acceptance_rewritten"])
        self.assertFalse(current_lineage["governance"]["historical_accepted_receipt_rewritten"])
        self.assertEqual([title["title_id"] for title in dossiers["titles"]], [
            "dragon-flight", "magic-defense", "dungeon-liberator", "sorcerer-ziggurat", "astral-mage",
        ])
        expected = {
            adoption["public_id"]: {
                (mapping["role"], mapping["state"], mapping["semantic_key"])
                for mapping in adoption["mappings"]
            }
            for adoption in task3["semantic_adoptions"]
        }
        observed = {
            title["title_id"]: {
                (role["role"], role["state"], role["semantic_key"])
                for role in title["roles"]
            }
            for title in dossiers["titles"]
        }
        self.assertEqual(observed, expected)
        self.assertEqual(sum(len(title["roles"]) for title in dossiers["titles"]), 17)
        for title in dossiers["titles"]:
            for role in title["roles"]:
                self.assertEqual(role["dossier_id"], (
                    f"existing-core-{title['title_id']}-{role['role']}-{role['state']}-canonical-reuse-v1"
                ))
                self.assertIn(role["behavior"]["animation_behavior"], {"not-applicable", "atlas-grid-recorded-no-clip-or-direction-contract"})
                self.assertFalse(role["behavior"]["collision_envelope_required"] and role["behavior"]["media_kind"] == "audio")

        self.assertEqual(matrix["schema_version"], "apk-existing-core-task5-canonical-reuse-disposition-matrix.v1")
        self.assertEqual(matrix["status"], "reviewed-canonical-reuse-drafts-pending-owner-acceptance")
        matrix_rows = {
            (row["title_id"], row["role"], row["state"], row["semantic_key"])
            for row in matrix["rows"]
        }
        expected_rows = {
            (title_id, role, state, semantic_key)
            for title_id, mappings in expected.items()
            for role, state, semantic_key in mappings
        }
        self.assertEqual(matrix_rows, expected_rows)
        self.assertEqual(len(matrix["rows"]), 17)
        self.assertTrue(all(row["disposition"] == "reuse-canonical" for row in matrix["rows"]))
        self.assertTrue(all(row["legacy_ingestion_authorized"] is False for row in matrix["rows"]))
        self.assertTrue(all(row["legacy_retirement_candidates"] == [] for row in matrix["rows"]))
        self.assertEqual(matrix["authorization"], {
            "title_adoption_authorized": False,
            "task5_acceptance_claimed": False,
            "legacy_ingestion_authorized": False,
            "legacy_retirement_authorized": False,
            "cutover_authorized": False,
        })

    def test_each_selected_descriptor_recomputes_from_the_real_catalog_and_rejects_the_short_side_view_hero(self) -> None:
        """Checks physical dimensions, receipt locators, and the documented behaviorally incompatible candidate."""
        evidence = _load(EVIDENCE_PATH)
        catalog = _load(CATALOG_PATH)
        catalog_by_key = {asset["key"]: asset for asset in catalog["assets"]}
        curated_destinations = {
            line.split("\t", 1)[0]
            for line in (STANDARD_ROOT / "CURATED-RECEIPT.tsv").read_text(encoding="utf-8").splitlines()[1:]
        }
        import_receipt = (STANDARD_ROOT / "IMPORT-RECEIPT.tsv").read_text(encoding="utf-8")

        for asset in evidence["canonical_assets"]:
            catalog_asset = catalog_by_key[asset["semantic_key"]]
            self.assertEqual(catalog_asset["path"], asset["catalog_path"])
            self.assertEqual(catalog_asset["sourceReceiptLocator"], asset["source_receipt_locator"])
            self.assertEqual(catalog_asset["physical"]["sha256"], asset["sha256"])
            self.assertEqual(catalog_asset["physical"]["dimensions"], asset["dimensions"])
            self.assertEqual(_sha256(STANDARD_ROOT / asset["catalog_path"]), asset["sha256"])
            self.assertIn(asset["catalog_path"], curated_destinations)
            presentation = asset["presentation"]
            if presentation["media_kind"] == "audio":
                self.assertIsNone(asset["dimensions"])
                self.assertEqual(presentation["audio"], {"duration_ms": 1667, "channels": 2, "loop": False})
            else:
                self.assertEqual(presentation["geometry"]["frame_width"], asset["cell_size"]["width"])
                self.assertEqual(presentation["geometry"]["frame_height"], asset["cell_size"]["height"])
                self.assertEqual(
                    presentation["geometry"]["frame_width"] * presentation["geometry"]["columns"],
                    presentation["geometry"]["width"],
                )
                self.assertEqual(
                    presentation["geometry"]["frame_height"] * presentation["geometry"]["rows"],
                    presentation["geometry"]["height"],
                )
                self.assertIn("measured", presentation["collision_evidence"])
                self.assertIn("conservative", presentation["readability_evidence"])
                self.assertGreaterEqual(presentation["readability_envelope"]["minimum_render_pixels"], 16)
                self.assertEqual(presentation["readability_envelope"]["minimum_contrast_ratio"], 1)
                self.assertEqual(presentation["clip_ids"], [])
                self.assertEqual(presentation["direction_ids"], [])
                self.assertIn(presentation["animation_behavior"], {"atlas-grid-recorded-no-clip-or-direction-contract", "single-cell-static-source"})

        rejected = evidence["rejected_existing_candidate"]
        rejected_catalog = catalog_by_key[rejected["semantic_key"]]
        self.assertEqual(rejected_catalog["path"], rejected["catalog_path"])
        self.assertEqual(rejected_catalog["physical"]["sha256"], rejected["sha256"])
        self.assertEqual(rejected_catalog["physical"]["dimensions"], rejected["dimensions"])
        self.assertEqual(_sha256(STANDARD_ROOT / rejected["catalog_path"]), rejected["sha256"])
        self.assertIn("\t".join([rejected["catalog_path"], "Platformer World.zip"]), import_receipt)
        self.assertEqual(rejected["dimensions"], {"width": 192, "height": 32})
        self.assertEqual(rejected["presentation"]["alpha_measurement"]["minimum_opaque_height"], 18)
        self.assertEqual(rejected["disposition"], "rejected-for-player-idle")
        self.assertIn("192x384", rejected["reason"])
        self.assertIn("top-down hero", rejected["reason"])

    def test_audio_duration_is_derived_from_the_exact_source_file(self) -> None:
        """Requires the recorded duration to equal the decoded OGG source duration."""
        evidence = _load(EVIDENCE_PATH)
        audio = next(asset for asset in evidence["canonical_assets"] if asset["presentation"]["media_kind"] == "audio")
        source = STANDARD_ROOT / audio["catalog_path"]
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(source)],
            check=True,
            capture_output=True,
            text=True,
        )
        self.assertEqual(round(float(result.stdout.strip()) * 1000), audio["presentation"]["audio"]["duration_ms"])

    def test_owner_boundary_binds_existing_acceptances_without_fabricating_an_owner_event(self) -> None:
        """Requires the bounded owner decision to retain exact prerequisite hashes and literal false authority."""
        owner = _load(OWNER_PATH)
        evidence = _load(EVIDENCE_PATH)

        self.assertEqual(owner["schema_version"], "apk-existing-core-task5-canonical-reuse-owner-acceptance.v1")
        self.assertEqual(owner["status"], "accepted-exact-canonical-reuse-dossiers-non-authorizing")
        self.assertEqual(owner["approval_event"], {
            "message_exact": "Approve exact canonical reuse dossiers only after all tests and an independent review pass; leave authorization false in this implementation turn.",
            "message_sha256": "716f003040e49230d53d1bf3b5ac20d39423c4c5f51da31d67df792ffbd02161",
            "source": "explicit-user-project-owner-instruction",
            "durable_user_message_id": None,
            "durable_user_message_id_available": False,
            "durable_user_event_id": None,
            "durable_user_event_id_available": False,
            "event_timestamp": None,
            "event_timestamp_available": False,
            "limitation": "The explicit project-owner instruction is recorded without fabricating a durable user-message or user-event identifier.",
        })
        expected_bindings = {
            "suitability_governance_owner_acceptance": SUITABILITY_GOVERNANCE_OWNER_PATH,
            "current_task3_lineage_receipt": TASK3_CURRENT_LINEAGE_RECEIPT_PATH,
            "task3_current_lineage_review": TASK3_LINEAGE_REVIEW_PATH,
            "accepted_semantic_adoption_receipt": TASK3_RECEIPT_PATH,
            "accepted_task4_qc_receipt": TASK4_RECEIPT_PATH,
            "canonical_reuse_evidence": EVIDENCE_PATH,
            "dossiers": DOSSIERS_PATH,
            "disposition_matrix": MATRIX_PATH,
            "independent_canonical_reuse_review": INDEPENDENT_REVIEW_PATH,
        }
        self.assertEqual(set(owner["bound_inputs"]), set(expected_bindings))
        for name, path in expected_bindings.items():
            binding = owner["bound_inputs"][name]
            self.assertEqual(binding["path"], str(path.relative_to(REPO_ROOT)))
            self.assertEqual(binding["sha256"], _sha256(path))
        self.assertEqual(owner["bound_inputs"]["suitability_governance_owner_acceptance"]["scope"], "accepted evidence-only ingestion governance; no real title or asset acceptance")
        self.assertEqual(owner["bound_inputs"]["canonical_reuse_evidence"]["sha256"], _sha256(EVIDENCE_PATH))
        self.assertEqual(owner["bound_inputs"]["independent_canonical_reuse_review"]["path"], str(INDEPENDENT_REVIEW_PATH.relative_to(REPO_ROOT)))
        self.assertEqual(owner["bound_inputs"]["independent_canonical_reuse_review"]["sha256"], _sha256(INDEPENDENT_REVIEW_PATH))
        self.assertEqual(owner["authorization"], {**NO_AUTHORIZATION, "title_adoption_authorized": False})
        self.assertIn("Reading/Primary host", owner["next_step"])
        self.assertEqual(evidence["authorization"], NO_AUTHORIZATION)


if __name__ == "__main__":
    unittest.main()
