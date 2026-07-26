"""Adversarial tests for the independent T10 acceptance verifier."""

from __future__ import annotations

import json
from pathlib import Path
import unittest

from t10_acceptance_verifier import verify_candidate, verify_successor


TRACK_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TRACK_ROOT.parents[2]


class T10AcceptanceVerifierTest(unittest.TestCase):
    """Requires raw-source closure and fail-closed successor boundaries."""

    def test_exact_candidate_passes_independent_truth_gates(self) -> None:
        """Accepts the exact T9 candidate only after full raw reconciliation."""
        result = verify_candidate(REPO_ROOT)

        self.assertTrue(result.passed, result.as_json())
        self.assertEqual(result.metrics["games"], 29)
        self.assertEqual(result.metrics["raw_claims"], 1248)
        self.assertEqual(result.metrics["t8_candidate_rows"], 428)
        self.assertEqual(result.metrics["blocked_adoption_mappings"], 85)
        self.assertEqual(result.metrics["standard_pack_assets"], 43075)

    def test_every_published_counterexample_fails_closed(self) -> None:
        """Rejects every hash-bound adversarial mutation with its expected code."""
        fixtures = sorted((TRACK_ROOT / "negative-fixtures" / "t10").glob("*.json"))
        self.assertEqual(len(fixtures), 12)

        for path in fixtures:
            fixture = json.loads(path.read_text(encoding="utf-8"))
            with self.subTest(fixture=fixture["fixture_id"]):
                result = verify_candidate(REPO_ROOT, mutations=fixture["mutations"])
                self.assertFalse(result.passed)
                self.assertTrue(
                    set(fixture["expected_codes"]).issubset(result.codes),
                    result.as_json(),
                )

    def test_successor_guard_rejects_stale_revoked_and_legacy_inputs(self) -> None:
        """Accepts only the post-approval manifest and rejects successor attacks."""
        result = verify_successor(REPO_ROOT)
        self.assertTrue(result.passed, result.as_json())

        attacks = (
            ("/revocation_state", "revoked", "REVOKED_SUCCESSOR"),
            ("/t9_candidate/sha256", "b" * 64, "STALE_SUCCESSOR_HASH"),
            ("/standard_pack/version", "2026.07.22", "SUCCESSOR_PACK_MISMATCH"),
            ("/adoption_policy/direct_legacy_paths", "allowed", "SUCCESSOR_LEGACY_PATH"),
            ("/adoption_policy/asset_root", "apps/private-assets", "SUCCESSOR_PACK_MISMATCH"),
            ("/owner_acceptance/sha256", "c" * 64, "STALE_SUCCESSOR_HASH"),
        )
        artifact = "measure/tracks/apk_independent_acceptance_handoff_20260712/accepted-successor-manifest-v1.json"
        for pointer, value, code in attacks:
            with self.subTest(code=code):
                attacked = verify_successor(REPO_ROOT, mutations=[{
                    "artifact": artifact,
                    "pointer": pointer,
                    "value": value,
                }])
                self.assertFalse(attacked.passed)
                self.assertIn(code, attacked.codes)


if __name__ == "__main__":
    unittest.main()
