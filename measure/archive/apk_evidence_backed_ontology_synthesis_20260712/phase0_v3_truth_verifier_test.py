"""Focused tests for the additive Phase 0 v3 truth verifier."""

import hashlib
import json
from pathlib import Path
import unittest

import phase0_v3_truth_verifier as verifier


TRACK_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TRACK_ROOT.parents[2]
MANIFEST_PATH = TRACK_ROOT / "phase0-v3-fixture-manifest-v1.json"


class Phase0V3TruthVerifierTest(unittest.TestCase):
    """Exercises live Red, the Green contract, and every counterexample."""

    def setUp(self) -> None:
        """Builds the exact root-owned freeze contract in memory."""
        self.dispatch = verifier._load(TRACK_ROOT / verifier.DISPATCH_PATH)
        self.registry = verifier._load(TRACK_ROOT / verifier.REGISTRY_PATH)
        self.freeze = verifier.expected_freeze(self.dispatch, self.registry)

    def test_live_state_is_verified_with_exact_root_freeze(self) -> None:
        """The exact root-owned freeze must produce the Green state."""
        result = verifier.verify(REPO_ROOT, TRACK_ROOT)

        self.assertEqual(result.state, "VERIFIED")
        self.assertTrue(result.passed)
        self.assertEqual(result.checks, 70)
        self.assertEqual(result.findings, ())

    def test_missing_freeze_path_remains_red_without_file_mutation(self) -> None:
        """The historical Red path remains proved without deleting root bytes."""
        result = verifier.verify(
            REPO_ROOT,
            TRACK_ROOT,
            simulate_missing_freeze=True,
        )

        self.assertEqual(result.state, "RED")
        self.assertFalse(result.passed)
        self.assertEqual(result.checks, 3)
        self.assertEqual(
            {item.code for item in result.findings},
            {"PHASE0_V3_FREEZE_MISSING"},
        )

    def test_exact_freeze_contract_is_green_in_memory(self) -> None:
        """The exact proposed root freeze must satisfy all truth checks."""
        result = verifier.verify(REPO_ROOT, TRACK_ROOT, self.freeze)

        self.assertTrue(result.passed)
        self.assertEqual(result.state, "VERIFIED")
        self.assertEqual(result.checks, 70)

    def test_manifest_hashes_and_allowed_paths_are_exact(self) -> None:
        """Every fixture must be hash-bound under the dispatched prefix."""
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        assignment = verifier._author_assignment(self.dispatch)
        pattern = next(
            path
            for path in assignment["allowed_outputs"]
            if path.startswith("negative-fixtures/")
        )
        prefix = pattern.removesuffix("*")

        self.assertEqual(manifest["fixture_count"], 13)
        self.assertEqual(len(manifest["fixtures"]), 13)
        for binding in manifest["fixtures"]:
            self.assertTrue(binding["path"].startswith(prefix))
            path = TRACK_ROOT / binding["path"]
            self.assertEqual(
                hashlib.sha256(path.read_bytes()).hexdigest(),
                binding["sha256"],
            )

    def test_all_adversarial_mutations_fail_exactly(self) -> None:
        """Every bound adversarial mutation must emit its sole code."""
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

        for binding in manifest["fixtures"]:
            with self.subTest(path=binding["path"]):
                fixture = json.loads(
                    (TRACK_ROOT / binding["path"]).read_text(encoding="utf-8")
                )
                result = verifier.verify(
                    REPO_ROOT,
                    TRACK_ROOT,
                    self.freeze,
                    fixture["operation"],
                )
                self.assertFalse(result.passed)
                self.assertEqual(result.state, "INVALID")
                self.assertEqual(
                    {item.code for item in result.findings},
                    set(binding["expected_codes"]),
                )


if __name__ == "__main__":
    unittest.main()
