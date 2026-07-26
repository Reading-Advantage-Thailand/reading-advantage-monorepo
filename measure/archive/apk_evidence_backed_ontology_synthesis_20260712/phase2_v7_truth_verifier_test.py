"""Focused tests for the Phase 2 v7 candidate lifecycle repair."""

from contextlib import contextmanager, redirect_stdout
import io
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

import phase2_v6_truth_verifier_test as v6_tests
import phase2_v7_truth_verifier as verifier

TRACK_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TRACK_ROOT.parents[2]


@contextmanager
def isolated_track_without_mapper_v4():
    """Yields all frozen v7 inputs without mapper v4 outputs."""
    required = {
        verifier.DISPATCH_PATH,
        *verifier.PRESERVED_V6,
        *verifier.PRESERVED_V5,
        *verifier.REJECTED_V5,
        verifier.v5.DISPATCH_PATH,
        *verifier.v5.PHASE1_INPUTS,
        *verifier.v5.PRESERVED_V4_RED,
        *verifier.v5.REJECTED_V2,
        verifier.v5.v4.DISPATCH_PATH,
        *verifier.v5.v4.PHASE1_INPUTS,
        *verifier.v5.v4.PRESERVED_V2_RED,
        *verifier.v5.v4.PRESERVED_V3_DRAFTS,
        *verifier.v5.v4.REJECTED_V1,
        verifier.v5.v4.v2.DISPATCH_PATH,
    }
    with tempfile.TemporaryDirectory() as directory:
        isolated = Path(directory)
        for relative in required:
            destination = isolated / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(TRACK_ROOT / relative, destination)
        yield isolated


def candidate_bundle() -> dict[str, dict]:
    """Builds a minimal valid candidate-present lifecycle bundle."""
    bundle = {path: {} for path in verifier.MAPPER_OUTPUTS}
    bundle[verifier.MAPPER_RECEIPT] = {
        "agent_ref": "/root/phase5_review_a/t9_phase0_final_reviewer",
        "owner_role": "capability-mapper",
        "task_id": "phase2-specificity-mapper-v4-v7",
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "truth_contract": verifier._truth_contract(TRACK_ROOT),
        "output_hashes": {
            path: verifier._digest(bundle[path]) for path in verifier.MAPPER_OUTPUTS
        },
        "status": "candidate",
    }
    return bundle


class Phase2V7TruthVerifierTest(unittest.TestCase):
    """Exercises valid, malformed, missing, and inherited candidate paths."""

    def test_valid_candidate_present_smoke_is_verified(self) -> None:
        """A valid candidate receipt executes without exception or finding."""
        bundle = candidate_bundle()
        with (
            patch.object(verifier, "_validate_specificity", return_value=[]),
            patch.object(verifier, "_project_to_v5", return_value={}),
            patch.object(verifier.v5, "_validate_bundle", return_value=([], 7)),
        ):
            findings, checks = verifier._validate_bundle(TRACK_ROOT, {}, bundle)
        self.assertEqual(findings, [])
        self.assertEqual(checks, 94)

    def test_malformed_candidate_receipt_shape_is_invalid_schema(self) -> None:
        """A malformed candidate receipt executes and fails with INVALID_SCHEMA."""
        bundle = candidate_bundle()
        del bundle[verifier.MAPPER_RECEIPT]["status"]
        with (
            patch.object(verifier, "_validate_specificity", return_value=[]),
            patch.object(verifier, "_project_to_v5", return_value={}),
            patch.object(verifier.v5, "_validate_bundle", return_value=([], 7)),
        ):
            findings, _ = verifier._validate_bundle(TRACK_ROOT, {}, bundle)
        self.assertIn("INVALID_SCHEMA", {row.code for row in findings})

    def test_missing_candidate_is_lifecycle_red(self) -> None:
        """Missing mapper v4 files remain the sole lifecycle Red."""
        with isolated_track_without_mapper_v4() as isolated:
            result = verifier.verify_phase2(REPO_ROOT, isolated)
            self.assertEqual(result.state, "RED_WAITING_FOR_MAPPER_V4_OUTPUTS")
            self.assertEqual(
                {row.code for row in result.findings},
                {"PHASE2_MAPPER_V4_OUTPUTS_MISSING"},
            )

    def test_all_v6_tests_and_attacks_remain_executable(self) -> None:
        """The complete failed-sealed v6 suite remains executable under v7."""
        stream = io.StringIO()
        result = unittest.TextTestRunner(stream=stream).run(
            unittest.defaultTestLoader.loadTestsFromModule(v6_tests)
        )
        self.assertTrue(result.wasSuccessful(), stream.getvalue())
        self.assertEqual(result.testsRun, 9)

    def test_v7_manifest_retains_all_v6_fixture_bindings(self) -> None:
        """The v7 fixture registry retains all seven immutable v6 groups."""
        current = json.loads((TRACK_ROOT / verifier.FIXTURE_MANIFEST).read_text())
        prior = json.loads((TRACK_ROOT / "phase2-v6-fixture-manifest.json").read_text())
        self.assertEqual(current["fixture_count"], 7)
        self.assertEqual(current["case_count"], 64)
        self.assertEqual(current["fixtures"], prior["fixtures"])

    def test_rejected_v5_still_fails_all_specificity_layers(self) -> None:
        """The rejected v5 false Green retains the complete v6 rejection set."""
        self.assertEqual(len(verifier._validate_rejected_v5(TRACK_ROOT)), 12)

    def test_isolated_cli_accepts_only_missing_mapper_v4_red(self) -> None:
        """CLI expected-code mode binds the missing-candidate Red exactly."""
        with (
            isolated_track_without_mapper_v4() as isolated,
            redirect_stdout(io.StringIO()),
        ):
            self.assertEqual(
                verifier.main(
                    [
                        "--repo-root",
                        str(REPO_ROOT),
                        "--track-root",
                        str(isolated),
                        "--expect-codes",
                        "PHASE2_MAPPER_V4_OUTPUTS_MISSING",
                    ]
                ),
                0,
            )


if __name__ == "__main__":
    unittest.main()
