"""Focused tests for the additive T3 leaf-binding verifier."""

import hashlib
import json
from pathlib import Path
import time
import unittest

import phase0_t3_leaf_binding_verifier as verifier


TRACK_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TRACK_ROOT.parents[2]
MANIFEST_PATH = TRACK_ROOT / "phase0-t3-leaf-binding-fixture-manifest-v1.json"


class T3LeafBindingVerifierTest(unittest.TestCase):
    """Exercises the live candidate and every bound counterexample."""

    def test_live_candidate_and_immutable_suite_are_verified(self) -> None:
        """Live verification must include all 41 immutable T3 tests."""
        started = time.perf_counter()

        result = verifier.verify(REPO_ROOT, TRACK_ROOT)

        self.assertTrue(result.passed)
        self.assertEqual(result.state, "VERIFIED")
        self.assertEqual(result.findings, ())
        self.assertEqual(result.checks, 950)
        self.assertLess(time.perf_counter() - started, 180)

    def test_manifest_and_fixture_hashes_are_exact(self) -> None:
        """Every fixture must match the immutable manifest binding."""
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

        self.assertEqual(manifest["fixture_count"], 7)
        self.assertEqual(len(manifest["fixtures"]), 7)
        self.assertEqual(
            manifest["dispatch"]["sha256"],
            verifier.DISPATCH_SHA256,
        )
        self.assertEqual(
            manifest["candidate"]["sha256"],
            verifier.CANDIDATE_SHA256,
        )
        for binding in manifest["fixtures"]:
            path = TRACK_ROOT / binding["path"]
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            self.assertEqual(digest, binding["sha256"])

    def test_all_bound_mutations_fail_exactly(self) -> None:
        """Each hash-bound mutation must emit only its expected code."""
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

        for binding in manifest["fixtures"]:
            with self.subTest(path=binding["path"]):
                fixture_path = TRACK_ROOT / binding["path"]
                fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
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

    def test_structured_coverage_is_recomputed(self) -> None:
        """Every candidate coverage row must match its blueprint records."""
        candidate = json.loads(
            (TRACK_ROOT / verifier.CANDIDATE_PATH).read_text(encoding="utf-8")
        )
        blueprint_path = REPO_ROOT / candidate["leaf_bindings"][0]["path"]
        blueprint = json.loads(blueprint_path.read_text(encoding="utf-8"))
        rows = {item["game_id"]: item for item in candidate["coverage"]["games"]}

        self.assertEqual(set(rows), set(verifier.REQUIRED_GAMES))
        for game_id in verifier.REQUIRED_GAMES:
            self.assertTrue(
                verifier._coverage_matches(
                    rows[game_id],
                    blueprint["games"][game_id],
                )
            )


if __name__ == "__main__":
    unittest.main()
