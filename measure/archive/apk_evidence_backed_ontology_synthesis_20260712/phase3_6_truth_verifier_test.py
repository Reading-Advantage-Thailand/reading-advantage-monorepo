"""File-backed truth and adversarial tests for T9 Phases 3 through 6."""

from __future__ import annotations

import json
from pathlib import Path
import shutil
import tempfile
import unittest

import phase3_6_truth_verifier as verifier

TRACK_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TRACK_ROOT.parents[2]


class PhaseThreeToSixTruthVerifierTest(unittest.TestCase):
    """Exercises the complete non-consumable T9 candidate contract."""

    def setUp(self) -> None:
        """Creates an isolated copy for adversarial mutations."""
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        shutil.copytree(TRACK_ROOT, self.root, dirs_exist_ok=True)

    def tearDown(self) -> None:
        """Removes the isolated track copy."""
        self.directory.cleanup()

    def verify(self) -> verifier.VerificationResult:
        """Runs the verifier against the isolated candidate."""
        return verifier.verify(REPO_ROOT, self.root)

    def mutate(self, relative: str, change) -> verifier.VerificationResult:
        """Applies one JSON mutation and returns the resulting verification."""
        path = self.root / relative
        value = json.loads(path.read_text(encoding="utf-8"))
        change(value)
        path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        return self.verify()

    def test_production_candidate_is_complete_and_non_consumable(self) -> None:
        """Accepts the exact generated candidate after all review gates."""
        result = self.verify()
        self.assertTrue(result.passed, result.findings)
        self.assertEqual(result.state, "T9_CANDIDATE_READY_FOR_T10_NON_CONSUMABLE")

    def test_claim_removal_and_denominator_drift_fail(self) -> None:
        """Rejects missing upstream claims and missing T8 candidate rows."""
        result = self.mutate(
            verifier.RESPONSIVE,
            lambda value: value["contracts"][0]["upstream_claim_ids"].pop(),
        )
        self.assertIn("RESPONSIVE_CLAIM_CLOSURE", result.codes)
        shutil.rmtree(self.root)
        shutil.copytree(TRACK_ROOT, self.root)
        result = self.mutate(
            verifier.ADOPTION_MATRIX,
            lambda value: value["candidate_rows"].pop(),
        )
        self.assertIn("T8_CANDIDATE_DENOMINATOR", result.codes)

    def test_path_vendor_and_absent_key_attacks_fail(self) -> None:
        """Rejects legacy paths, vendor names, and uncataloged candidate keys."""
        def direct_path(value: dict) -> None:
            value["candidate_rows"][0]["mappings"] = [{
                "usage_id": None,
                "source_evidence_family": "apps/legacy/player.png",
                "semantic_role": "vendor-hero",
                "semantic_state": None,
                "gameplay_variant": {"status": "blocked_unknown"},
                "source_pack_treatment": "ElvGames direct",
                "capability_ids": [],
                "profile_ids": ["compact", "wide"],
                "adoption": {"state": "candidate", "standard_pack_key": "missing/key", "blocker": None},
                "upstream_claim_ids": ["UNKNOWN-NO-USAGE"],
            }]
        result = self.mutate(verifier.ADOPTION_MATRIX, direct_path)
        self.assertTrue({"DIRECT_OR_VENDOR_MAPPING", "ABSENT_STANDARD_PACK_KEY"} & result.codes)

    def test_unknown_must_have_and_successor_publication_fail(self) -> None:
        """Rejects silently resolved blockers and consumable successor hashes."""
        result = self.mutate(
            verifier.GAPS,
            lambda value: value["ranked_gaps"][0].update(decision_state="resolved"),
        )
        self.assertIn("UNKNOWN_MUST_HAVE_RESOLVED", result.codes)
        shutil.rmtree(self.root)
        shutil.copytree(TRACK_ROOT, self.root)
        result = self.mutate(
            verifier.CANDIDATE_MANIFEST,
            lambda value: value.update(consumable=True, successor_hashes={"t10": "0" * 64}),
        )
        self.assertIn("CONSUMABLE_SUCCESSOR_PUBLICATION", result.codes)

    def test_standardization_and_review_gates_fail_closed(self) -> None:
        """Rejects one-consumer standardization and unresolved review findings."""
        result = self.mutate(
            verifier.CAPABILITY_REVIEW,
            lambda value: value["capability_reviews"][0].update(game_ids=value["capability_reviews"][0]["game_ids"][:1]),
        )
        self.assertIn("STANDARDIZATION_CONSUMER_COUNT", result.codes)
        shutil.rmtree(self.root)
        shutil.copytree(TRACK_ROOT, self.root)
        result = self.mutate(
            verifier.ADVERSARIAL_REVIEW,
            lambda value: value["findings"]["High"].append({"id": "attack", "status": "open"}),
        )
        self.assertIn("BLOCKING_REVIEW_FINDING", result.codes)

    def test_generation_is_deterministic_and_decision_free(self) -> None:
        """Regenerates mapper outputs and requires byte-exact parity."""
        self.assertEqual(verifier.generator_drift(REPO_ROOT, TRACK_ROOT), [])


if __name__ == "__main__":
    unittest.main()
