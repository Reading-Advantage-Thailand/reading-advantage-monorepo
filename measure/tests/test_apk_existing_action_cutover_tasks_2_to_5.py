"""Fail-closed evidence checks for Existing Action Tasks 2 through 5."""

from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ROOT = REPO_ROOT / "measure/archive/apk_existing_action_cutover_20260727"
DOSSIERS_PATH = TRACK_ROOT / "task2-standard-pack-suitability-dossiers-v1.json"
V2_DOSSIERS_PATH = TRACK_ROOT / "task2-standard-pack-suitability-dossiers-v2.json"
OWNER_ACCEPTANCE_PATH = TRACK_ROOT / "task2-owner-acceptance-v2.json"
QC_EVIDENCE_PATH = TRACK_ROOT / "task5-advantage-games-qc-native-input-evidence-v2.json"

EXPECTED_RELEASE = {
    "version": "2026.07.23",
    "catalog_path": "packages/advantage-play-kit/assets/standard/standard-pack-release.json",
    "catalog_sha256": "ef432a798a78585df3416d60aca30fe11a2d1d8b833e0d65ceb7fac5c8b19932",
}
EXPECTED_TITLES = [
    (
        "archers-revenge",
        "Archer's Revenge",
        "vocabulary",
        "measure/archive/apk_corpus_audit_action_defense_20260712/archers-revenge-claim-ledger-batch-b-v8.json",
        "1fedca7dffa8897a3bb0f5482a1c74c484bc3f16e5361ddd06dcc89ec8ec1ca3",
    ),
    (
        "paladins-twin-soul",
        "Paladin's Twin-Soul",
        "vocabulary",
        "measure/archive/apk_corpus_audit_action_defense_20260712/paladins-twin-soul-claim-ledger-batch-c-v4.json",
        "809e51d319294a3cd4c7e6727a442382b831f4b18b40a900c0a900ebddfa7d8d",
    ),
    (
        "griffin-sky-joust",
        "Griffin Sky-Joust",
        "sentence",
        "measure/archive/apk_corpus_audit_special_historical_20260712/packages/griffin-sky-joust/claim-ledger-v2.json",
        "dbe69391387b5ae8bae2fe0e6d1a0e3b6a687ed9f372b3259cd00c9f92958905",
    ),
    (
        "gryphon-patrol",
        "Gryphon Patrol",
        "sentence",
        "measure/archive/apk_corpus_audit_action_defense_20260712/gryphon-patrol-claim-ledger-batch-c-v4.json",
        "d3e0de2a047d59ba5a128cb3780d1e5f42f04c8ae0361cb04e633ef8f671e4eb",
    ),
    (
        "realm-carver",
        "Realm Carver",
        "sentence",
        "measure/archive/apk_corpus_audit_special_historical_20260712/packages/realm-carver/claim-ledger-v2.json",
        "259b821e88143665203830814292ad19a78397d9974f2dee6edd9e92051e8afc",
    ),
]
EXPECTED_ROLES = [
    ("player", "idle", "existing-action-player-idle-static-v1", "top-down/32x32/characters/hero-01", "image", {"width": 192, "height": 384}, True),
    ("enemy", "idle", "existing-action-enemy-idle-static-v1", "side-view/32x32/characters/enemy-001-idle", "image", {"width": 192, "height": 32}, True),
    ("feedback", "correct", "existing-action-feedback-correct-static-v1", "effects/32x32/combat/hit-01", "image", {"width": 192, "height": 128}, False),
    ("audio-feedback", "correct", "existing-action-feedback-correct-audio-v1", "audio/native/combat/hit-01", "audio", None, False),
]


def _load_object(path: Path) -> dict[str, Any]:
    """Loads one JSON object from an evidence record.

    Args:
        path: Absolute path of the JSON evidence record.

    Returns:
        The decoded JSON object.

    Raises:
        AssertionError: If the record is not a JSON object.
    """
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain a JSON object")
    return value


def _sha256(path: Path) -> str:
    """Computes the exact byte digest for one evidence artifact.

    Args:
        path: Absolute path of the artifact.

    Returns:
        Lowercase SHA-256 digest of the artifact bytes.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


class ExistingActionTasksTwoToFiveEvidenceTests(unittest.TestCase):
    """Prevents title, evidence, role, and authority drift before host integration."""

    def test_task2_dossiers_pin_real_release_and_historical_sources(self) -> None:
        """Requires the exact five-title canonical-reuse dossier inputs and source bytes."""
        dossiers = _load_object(DOSSIERS_PATH)

        self.assertEqual(
            dossiers["schema_version"],
            "apk-existing-action-task2-standard-pack-suitability-dossiers.v1",
        )
        self.assertEqual(
            dossiers["status"],
            "reviewed-canonical-reuse-drafts-pending-owner-acceptance",
        )
        self.assertEqual(dossiers["accepted_governance"]["standard_pack_release"], EXPECTED_RELEASE)
        self.assertEqual(_sha256(REPO_ROOT / EXPECTED_RELEASE["catalog_path"]), EXPECTED_RELEASE["catalog_sha256"])

        titles = dossiers["titles"]
        self.assertEqual([title["title_id"] for title in titles], [item[0] for item in EXPECTED_TITLES])
        for title, expected in zip(titles, EXPECTED_TITLES, strict=True):
            title_id, title_name, input_mode, source_path, source_sha256 = expected
            self.assertEqual(title["title"], title_name)
            self.assertEqual(title["input_mode"], input_mode)
            self.assertEqual(title["temporal_scope"], "historical-source-only")
            self.assertEqual(title["legacy_source_manifest"], {"path": source_path, "sha256": source_sha256})
            self.assertEqual(_sha256(REPO_ROOT / source_path), source_sha256)

            roles = title["roles"]
            self.assertEqual(len(roles), len(EXPECTED_ROLES))
            for role, expected_role in zip(roles, EXPECTED_ROLES, strict=True):
                role_name, state, descriptor_id, semantic_key, media_kind, geometry, collision_required = expected_role
                self.assertEqual(role["dossier_id"], f"existing-action-{title_id}-{role_name}-{state}-canonical-reuse-v1")
                self.assertEqual(role["role"], role_name)
                self.assertEqual(role["state"], state)
                self.assertEqual(role["descriptor_id"], descriptor_id)
                self.assertEqual(role["semantic_key"], semantic_key)
                self.assertEqual(role["behavior"], {
                    "media_kind": media_kind,
                    "minimum_geometry": geometry,
                    "collision_envelope_required": collision_required,
                    "animation_behavior": "not-applicable",
                })

    def test_tasks_two_to_five_remain_non_authorizing_qc_only_work(self) -> None:
        """Rejects a dossier that promotes source evidence into title adoption or host cutover."""
        dossiers = _load_object(DOSSIERS_PATH)
        self.assertEqual(dossiers["legacy_asset_disposition"], {
            "reuse": "blocked",
            "ingestion": "blocked",
            "reason": "The predecessor records provide historical source facts only. They do not provide a lawful real legacy source packet, provenance, license, credit, or behavior review for private or historical art.",
        })
        self.assertEqual(dossiers["canonical_disposition"], {
            "decision": "reuse-canonical",
            "source": "root-accepted-standard-pack-release",
            "owner_approval": "pending",
            "production_authorization": False,
            "migration_authorization": False,
            "cutover_authorization": False,
            "deployment_authorization": False,
        })
        self.assertEqual(dossiers["claims"], {
            "legacy_art_used": False,
            "private_art_used": False,
            "title_adoption_authorized": False,
            "qc_evidence_claimed": False,
            "host_proof_claimed": False,
            "cutover_claimed": False,
        })
        self.assertEqual(dossiers["authorization"], {
            "production_use_authorized": False,
            "ingestion_authorized": False,
            "migration_authorized": False,
            "cutover_authorized": False,
            "retirement_authorized": False,
            "deployment_authorized": False,
            "title_adoption_authorized": False,
        })

    def test_v2_persists_all_title_role_dossiers_with_real_descriptor_and_provenance_digests(self) -> None:
        """Requires the owner-accepted v2 record to keep every title role independently auditable."""
        dossiers = _load_object(V2_DOSSIERS_PATH)

        self.assertEqual(dossiers["schema_version"], "apk-existing-action-task2-standard-pack-suitability-dossiers.v2")
        self.assertEqual(dossiers["status"], "owner-accepted-for-advantage-games-qc-only")
        self.assertEqual(len(dossiers["descriptor_registry"]), 4)
        descriptor_digests = {
            descriptor["descriptor_id"]: descriptor["descriptor_digest"]
            for descriptor in dossiers["descriptor_registry"]
        }
        self.assertEqual(
            descriptor_digests,
            {
                "existing-action-player-idle-static-v1": "1a101a2182bc74831729609d5b6f097dbc9e5c1807a21b4f4972fc0d626bb807",
                "existing-action-enemy-idle-static-v1": "222c404ac7984bcd628ddfd8e5e1d03fd43eaa94a1810e520ed8e4dd7a40c4fa",
                "existing-action-feedback-correct-static-v1": "060ef3217364658cab2e5f17a5d01c2f052165a36d3b168c35930f971261e351",
                "existing-action-feedback-correct-audio-v1": "0286bdacd11131c24e79f41804cb35bced8b6aa0c1552d091d3e448b2cda78d5",
            },
        )

        expected_title_ids = [item[0] for item in EXPECTED_TITLES]
        self.assertEqual([title["title_id"] for title in dossiers["titles"]], expected_title_ids)
        role_dossiers = [role for title in dossiers["titles"] for role in title["role_dossiers"]]
        self.assertEqual(len(role_dossiers), 20)
        for title in dossiers["titles"]:
            self.assertEqual(len(title["role_dossiers"]), 4)
            self.assertEqual(title["legacy_source_manifest"]["temporal_scope"], "historical-source-only")
            self.assertEqual(_sha256(REPO_ROOT / title["legacy_source_manifest"]["path"]), title["legacy_source_manifest"]["sha256"])
            claim_artifact = title["mechanic_claim_artifact"]
            claim_artifact_path = REPO_ROOT / claim_artifact["path"]
            self.assertEqual(_sha256(claim_artifact_path), claim_artifact["sha256"])
            claim_artifact_text = claim_artifact_path.read_text(encoding="utf-8")
            for role in title["role_dossiers"]:
                self.assertTrue(role["title_role"].startswith(f"{title['title_id']}-"))
                self.assertEqual(role["claim_provenance"]["temporal_scope"], "historical-source-only")
                self.assertIn(role["descriptor_id"], descriptor_digests)
                self.assertEqual(role["descriptor_digest"], descriptor_digests[role["descriptor_id"]])
                self.assertRegex(role["decision"]["draft_decision_digest"], r"^[a-f0-9]{64}$")
                self.assertRegex(role["provenance_digest"], r"^[a-f0-9]{64}$")
                self.assertEqual(role["decision"]["disposition"], "reuse-canonical")
                self.assertEqual(role["decision"]["owner_acceptance"], "advantage-games-qc-only")
                self.assertIn(role["claim_provenance"]["claim_id"], claim_artifact_text)

    def test_v2_owner_acceptance_is_limited_to_qc_and_blocks_historical_or_unknown_progression(self) -> None:
        """Rejects any attempt to turn a descriptor decision into host, persistence, or cutover authority."""
        dossiers = _load_object(V2_DOSSIERS_PATH)
        acceptance = _load_object(OWNER_ACCEPTANCE_PATH)

        self.assertEqual(acceptance["status"], "accepted-bounded-advantage-games-qc-only")
        self.assertEqual(acceptance["accepted_input"]["path"], str(V2_DOSSIERS_PATH.relative_to(REPO_ROOT)))
        self.assertEqual(acceptance["accepted_input"]["sha256"], _sha256(V2_DOSSIERS_PATH))
        self.assertEqual(acceptance["accepted_input"]["title_count"], 5)
        self.assertEqual(acceptance["accepted_input"]["role_dossier_count"], 20)
        self.assertEqual(acceptance["authorization"], {
            "advantage_games_qc_registration_authorized": True,
            "production_use_authorized": False,
            "title_adoption_authorized": False,
            "reading_host_authorized": False,
            "primary_host_authorized": False,
            "completion_persistence_authorized": False,
            "ingestion_authorized": False,
            "migration_authorized": False,
            "cutover_authorized": False,
            "retirement_authorized": False,
            "deployment_authorized": False,
        })
        self.assertFalse(dossiers["authorization"]["completion_persistence_authorized"])
        self.assertFalse(dossiers["authorization"]["production_use_authorized"])

    def test_task5_native_input_evidence_is_hash_bound_and_non_promoting(self) -> None:
        """Binds compact/wide keyboard, pointer, and touch proof to action-only QC source bytes."""
        evidence = _load_object(QC_EVIDENCE_PATH)

        self.assertEqual(evidence["result"]["status"], "passed")
        self.assertEqual(evidence["result"]["tests"], 2)
        self.assertEqual(evidence["result"]["native_input"], ["keyboard", "pointer", "touch"])
        self.assertEqual(evidence["result"]["profiles"], ["compact", "wide"])
        self.assertEqual([title[0] for title in EXPECTED_TITLES], evidence["result"]["titles"])
        for binding in evidence["source"].values():
            self.assertEqual(_sha256(REPO_ROOT / binding["path"]), binding["sha256"])
        self.assertIn("not a production catalog", evidence["disclosures"][0])


if __name__ == "__main__":
    unittest.main()
