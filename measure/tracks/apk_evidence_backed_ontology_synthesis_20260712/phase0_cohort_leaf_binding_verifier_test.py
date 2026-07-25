"""Focused tests for the T4-B and T6-B cohort leaf-binding verifier."""

import hashlib
import json
from pathlib import Path
import time
import unittest

import phase0_cohort_leaf_binding_verifier as verifier


TRACK_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TRACK_ROOT.parents[2]
MANIFEST_PATH = TRACK_ROOT / "phase0-cohort-leaf-binding-fixture-manifest-v1.json"


class CohortLeafBindingVerifierTest(unittest.TestCase):
    """Exercises the live cohort candidate and every counterexample."""

    def test_live_candidate_is_verified(self) -> None:
        """Live verification must rederive all source evidence."""
        started = time.perf_counter()

        result = verifier.verify(REPO_ROOT, TRACK_ROOT)

        self.assertTrue(result.passed)
        self.assertEqual(result.state, "VERIFIED")
        self.assertEqual(result.findings, ())
        self.assertEqual(result.checks, 1157)
        self.assertLess(time.perf_counter() - started, 30)

    def test_manifest_and_fixture_hashes_are_exact(self) -> None:
        """Every fixture must match the immutable manifest binding."""
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        dispatch = json.loads(
            (TRACK_ROOT / verifier.DISPATCH_PATH).read_text(encoding="utf-8")
        )
        assignment = next(
            item
            for item in dispatch["assignments"]
            if item["owner_role"] == "cohort-leaf-binding-truth-test-author"
        )
        fixture_pattern = next(
            path
            for path in assignment["allowed_outputs"]
            if path.startswith("negative-fixtures/")
        )
        fixture_prefix = fixture_pattern.removesuffix("*")

        self.assertEqual(manifest["fixture_count"], 12)
        self.assertEqual(len(manifest["fixtures"]), 12)
        self.assertEqual(manifest["dispatch"]["sha256"], verifier.DISPATCH_SHA256)
        self.assertEqual(manifest["candidate"]["sha256"], verifier.CANDIDATE_SHA256)
        for binding in manifest["fixtures"]:
            self.assertTrue(binding["path"].startswith(fixture_prefix))
            path = TRACK_ROOT / binding["path"]
            self.assertEqual(
                hashlib.sha256(path.read_bytes()).hexdigest(),
                binding["sha256"],
            )

    def test_all_bound_mutations_fail_exactly(self) -> None:
        """Each hash-bound mutation must emit only its expected code."""
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

        for binding in manifest["fixtures"]:
            with self.subTest(path=binding["path"]):
                fixture = json.loads(
                    (TRACK_ROOT / binding["path"]).read_text(encoding="utf-8")
                )
                result = verifier.verify(
                    REPO_ROOT,
                    TRACK_ROOT,
                    fixture["operation"],
                )
                self.assertFalse(result.passed)
                self.assertEqual(result.state, "INVALID")
                self.assertEqual(
                    {item.code for item in result.findings},
                    set(binding["expected_codes"]),
                )

    def test_exact_coverage_contract_is_complete(self) -> None:
        """Coverage rows must declare every independently checked field."""
        candidate = json.loads(
            (TRACK_ROOT / verifier.CANDIDATE_PATH).read_text(encoding="utf-8")
        )

        self.assertEqual(
            {row["game_id"] for row in candidate["coverage"]["games"]},
            set(verifier.EXPECTED),
        )
        for row in candidate["coverage"]["games"]:
            self.assertEqual(set(row), verifier.ROW_KEYS)


if __name__ == "__main__":
    unittest.main()
