"""Fails closed when APK current-byte review evidence or historical decisions drift.

This gate treats the archived APK Asset Contract v2 track records as immutable
historical predecessors and the active Standard-Pack Suitability track records as
the current-byte evidence chain. It rejects any silent re-acceptance of stale
historical bytes, any current-byte binding that does not match the live files,
and any release authority claim.
"""

from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]

V2_HISTORICAL_RECORD_PATH = REPO_ROOT / "measure/archive/apk_asset_contract_v2_20260728/v2-owner-acceptance-v1.json"
V2_METADATA_PATH = REPO_ROOT / "measure/archive/apk_asset_contract_v2_20260728/metadata.json"
SUITABILITY_TRACK_DIR = REPO_ROOT / "measure/tracks/apk_standard_pack_suitability_ingestion_20260728"
SUITABILITY_HISTORICAL_RECORD_PATH = SUITABILITY_TRACK_DIR / "product-owner-acceptance-v1.json"
SUITABILITY_CURRENT_REVIEW_PATH = SUITABILITY_TRACK_DIR / "current-byte-independent-review-v1.json"
SUITABILITY_CURRENT_ACCEPTANCE_PATH = SUITABILITY_TRACK_DIR / "product-owner-acceptance-v2.json"
SUITABILITY_METADATA_PATH = SUITABILITY_TRACK_DIR / "metadata.json"

V2_HISTORICAL_BINDINGS = {
    "contract": ("packages/advantage-play-kit/src/assets/asset-contract-v2.ts", "f4530e834751eebe4480f360852cc36ffd9d561afdf3826d4c77ea3c51193cc5"),
    "provenance": ("packages/advantage-play-kit/src/assets/asset-contract-v2-provenance.ts", "dfc4d571d9d92bab31200ab33ca984a403babbd65dad6485312ad1e3b1a5b8df"),
    "resolver": ("packages/advantage-play-kit/src/assets/semantic-product-bindings.ts", "6dd8e046b9aa21814e1d370aea4358ff1bf320b72bb064486cf00c2f62efd62f"),
    "accepted_resolver": ("packages/advantage-play-kit/src/assets/accepted-standard-pack-release.ts", "9a931e5ebde9d328697f00129ac803a7d56ca106ed46cb4940445f94c81a4584"),
    "browser_qc_host": ("apps/advantage-games/src/components/apk/AdvantageGamesAuthoringQc.tsx", "8d5a158ba8db738c0bd90c00974f4fbae8cf912d32a162fa41bd829cafd69686"),
    "consumer_check": ("packages/advantage-play-kit/scripts/verify-assets-consumer-entrypoint.mjs", "485be649a271c0433d65859df908edfefd9dde748b7176882cdd1d21224cccce"),
}

SUITABILITY_HISTORICAL_BINDINGS = {
    "additive_receipt_source_sha256": ("packages/advantage-play-kit/src/assets/standard-pack-additive-release.ts", "312aa099579bac5c2d1604814391d93caca573008316b280d8d14cc59eb5c8b8"),
    "ingestion_ledger_source_sha256": ("packages/advantage-play-kit/src/assets/standard-pack-ingestion-ledger.ts", "93480e543ce9968c2946c7744712876a90b48acfd64d335967059191df762c54"),
    "semantic_binding_source_sha256": ("packages/advantage-play-kit/src/assets/semantic-product-bindings.ts", "5d27a66781392e7e12fca233ce227847b7862ecffd11b82b73d38be45ed18efd"),
    "ledger_test_sha256": ("packages/advantage-play-kit/src/assets/standard-pack-ingestion-ledger.test.ts", "d3b874d328b0258303940044df66f4dd3bcaa73cd548cebd19a30fb7f0bd1c46"),
    "semantic_test_sha256": ("packages/advantage-play-kit/src/assets/semantic-product-bindings.test.ts", "dc96e417340cfd7e93c897bfb439293bc1d7ad011f66ea5b79808d1750817846"),
    "additive_receipt_test_sha256": ("packages/advantage-play-kit/src/assets/standard-pack-additive-release.test.ts", "b9af690ffb0be73d78eeba08f8c85e60a8adac9ffaf86927a5195a051f912f3a"),
}

CURRENT_SUITABILITY_BINDING_PATHS = {
    "asset_contract_v2": "packages/advantage-play-kit/src/assets/asset-contract-v2.ts",
    "semantic_bindings": "packages/advantage-play-kit/src/assets/semantic-product-bindings.ts",
    "ingestion_ledger": "packages/advantage-play-kit/src/assets/standard-pack-ingestion-ledger.ts",
    "source_packet": "packages/advantage-play-kit/src/assets/standard-pack-legacy-source-packet.ts",
    "additive_receipt": "packages/advantage-play-kit/src/assets/standard-pack-additive-release.ts",
    "ledger_test": "packages/advantage-play-kit/src/assets/standard-pack-ingestion-ledger.test.ts",
    "public_api_test": "packages/advantage-play-kit/src/assets/assets-public-api.test.ts",
}

NO_RELEASE_AUTHORIZATION = {
    "productionUseAuthorized": False,
    "ingestionAuthorized": False,
    "migrationAuthorized": False,
    "cutoverAuthorized": False,
    "retirementAuthorized": False,
    "deploymentAuthorized": False,
}


def _load(path: Path) -> dict[str, Any]:
    """Loads one JSON object from a review or decision record.
    @param path Record path to load.
    @returns Parsed JSON object.
    @throws AssertionError When the record does not contain an object.
    """
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain an object")
    return value


def _sha256(relative_path: str) -> str:
    """Returns the SHA-256 digest of one repository-relative path.
    @param relative_path Repository-relative path supplied by the record.
    @returns Lowercase SHA-256 digest of the current file bytes.
    @throws AssertionError When the path escapes the repository.
    """
    candidate = Path(relative_path)
    if candidate.is_absolute():
        raise AssertionError(f"Acceptance binding must be relative: {relative_path}")
    resolved = (REPO_ROOT / candidate).resolve()
    try:
        resolved.relative_to(REPO_ROOT.resolve())
    except ValueError as error:
        raise AssertionError(f"Acceptance binding escapes repository: {relative_path}") from error
    return hashlib.sha256(resolved.read_bytes()).hexdigest()


def _assert_exact_hash_bindings(test: unittest.TestCase, bindings: Any, expected_paths: dict[str, str]) -> None:
    """Requires exactly named, two-field bindings whose hashes match the live files.
    @param test Test case collecting assertions.
    @param bindings Untrusted binding map from the review record.
    @param expected_paths Complete map of required binding names to paths.
    """
    test.assertIsInstance(bindings, dict)
    test.assertEqual(set(bindings), set(expected_paths))
    for name, expected_path in expected_paths.items():
        binding = bindings[name]
        test.assertIsInstance(binding, dict)
        test.assertEqual(set(binding), {"path", "sha256"})
        test.assertEqual(binding["path"], expected_path)
        test.assertEqual(binding["sha256"], _sha256(expected_path))


class ApkV2SuitabilityAcceptanceIntegrityTests(unittest.TestCase):
    """Keeps immutable historical decisions and current review evidence fail-closed."""

    def test_archived_v2_historical_acceptance_is_immutable_and_drift_detected(self) -> None:
        """Rejects silent re-acceptance of stale v2 bytes and confirms the v2 track is archived."""
        historical = _load(V2_HISTORICAL_RECORD_PATH)
        metadata = _load(V2_METADATA_PATH)
        self.assertEqual(historical["schema_version"], "apk-asset-contract-v2-owner-acceptance.v1")
        self.assertEqual(
            {name: (value["path"], value["sha256"]) for name, value in historical["implementation_bindings"].items()},
            V2_HISTORICAL_BINDINGS,
        )
        # The suitability track legitimately changed the contract, resolver, and QC host
        # after the v2 track was archived. The v2 historical acceptance must NOT silently
        # match the current bytes; its hash-drift governance must remain in force.
        drifted = {"contract", "resolver", "browser_qc_host"}
        for name in drifted:
            path, historical_digest = V2_HISTORICAL_BINDINGS[name]
            self.assertNotEqual(_sha256(path), historical_digest, f"{name} must show v2 historical drift")
        self.assertTrue(historical["hash_governance"]["hash_drift_invalidates_this_acceptance"])
        self.assertEqual(historical["downstream_authorization"]["authorized_track"], "apk_standard_pack_suitability_ingestion_20260728")
        self.assertEqual(historical["downstream_authorization"]["excluded_actions"], ["title migration", "legacy retirement", "deployment", "treating the QC exemplar as a suitability decision"])
        self.assertEqual(metadata["status"], "archived")

    def test_suitability_historical_v1_acceptance_is_revoked_and_drift_detected(self) -> None:
        """Rejects stale suitability v1 hashes being treated as current and confirms revocation."""
        historical = _load(SUITABILITY_HISTORICAL_RECORD_PATH)
        self.assertEqual(historical["schema_version"], "apk-standard-pack-suitability-owner-acceptance.v1")
        self.assertEqual(historical["decision"], "ACCEPT_BOUNDED_EVIDENCE_ONLY_ADDITIVE_RELEASE_GOVERNANCE")
        self.assertEqual(historical["authorization"], {
            "productionUseAuthorized": False,
            "migrationAuthorized": False,
            "cutoverAuthorized": False,
            "deploymentAuthorized": False,
        })
        self.assertEqual(historical["integrity"], {name: digest for name, (_, digest) in SUITABILITY_HISTORICAL_BINDINGS.items()})
        self.assertEqual(historical["revocation_state"], "revoked-current-byte-drift")
        self.assertEqual(historical["revoked_by"], "apk-orchestrator-acting-under-explicit-user-project-owner-delegation")
        for path, historical_digest in SUITABILITY_HISTORICAL_BINDINGS.values():
            self.assertNotEqual(_sha256(path), historical_digest)

    def test_current_review_binds_live_bytes_and_grants_no_authority(self) -> None:
        """Rejects a current-byte review that does not match the live files or claims authority."""
        record = _load(SUITABILITY_CURRENT_REVIEW_PATH)
        self.assertEqual(record["schema_version"], "apk-standard-pack-suitability-current-byte-review.v1")
        self.assertEqual(record["verdict"], "current-byte-code-review-complete-bounded-owner-decision-eligible")
        self.assertEqual(record["authorization"], NO_RELEASE_AUTHORIZATION)
        self.assertEqual(
            set(record["review_scope"]["excluded"]),
            {"accepting a real legacy asset", "external provenance, license, credit, or behavior review for a title", "wiring a production durable-registry adapter", "authorizing ingestion, migration, cutover, retirement, deployment, or title adoption"},
        )
        _assert_exact_hash_bindings(self, record["implementation_bindings"], CURRENT_SUITABILITY_BINDING_PATHS)

    def test_current_acceptance_binds_live_bytes_supersedes_v1_and_grants_no_authority(self) -> None:
        """Rejects a current acceptance that does not match live bytes or claim any release authority."""
        record = _load(SUITABILITY_CURRENT_ACCEPTANCE_PATH)
        metadata = _load(SUITABILITY_METADATA_PATH)
        self.assertEqual(record["schema_version"], "apk-standard-pack-suitability-owner-acceptance.v2")
        self.assertEqual(record["decision"], "ACCEPT_BOUNDED_EVIDENCE_ONLY_INGESTION_GOVERNANCE")
        self.assertEqual(record["authorization"], {
            **NO_RELEASE_AUTHORIZATION,
            "titleAdoptionAuthorized": False,
        })
        self.assertIn("product-owner-acceptance-v1.json remains revoked-current-byte-drift", record["supersedes"])
        self.assertEqual(record["basis"]["independent_review"]["path"], str(SUITABILITY_CURRENT_REVIEW_PATH.relative_to(REPO_ROOT)))
        _assert_exact_hash_bindings(self, record["implementation_bindings"], CURRENT_SUITABILITY_BINDING_PATHS)
        self.assertEqual(metadata["status"], "blocked")


if __name__ == "__main__":
    unittest.main()
