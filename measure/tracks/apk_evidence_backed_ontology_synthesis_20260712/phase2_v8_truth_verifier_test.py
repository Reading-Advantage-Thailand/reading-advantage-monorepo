"""Focused tests for the Phase 2 v8 curated-evidence truth contract."""

from contextlib import contextmanager, redirect_stdout
import io
import json
from pathlib import Path
import shutil
import tempfile
import time
import unittest
from unittest.mock import patch

import phase2_v7_truth_verifier_test as v7_tests
import phase2_v8_truth_verifier as verifier

TRACK_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TRACK_ROOT.parents[2]


def verified_inputs() -> dict:
    """Loads the frozen Phase 1 inputs after checking every v8 binding."""
    findings = []
    _, inputs = verifier._verify_inputs(TRACK_ROOT, findings)
    if findings:
        raise AssertionError(findings)
    return inputs


@contextmanager
def isolated_track_without_mapper_v5():
    """Yields all frozen v8 inputs without any mapper v5 candidate files."""
    required = {
        verifier.DISPATCH_PATH,
        *verifier.PRESERVED_V7,
        *verifier.PRESERVED_V6,
        *verifier.PRESERVED_V5,
        *verifier.REJECTED_V5,
        *verifier.REJECTED_V4,
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


def candidate_bundle(inputs: dict) -> dict[str, dict]:
    """Builds the contract-valid zero-use candidate-present baseline."""
    bundle = verifier._zero_use_bundle(inputs)
    bundle[verifier.MAPPER_RECEIPT] = {
        "agent_ref": "/root/phase5_review_a/t9_phase0_final_reviewer",
        "owner_role": "capability-mapper",
        "task_id": "phase2-curated-evidence-mapper-v5",
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "truth_contract": {},
        "output_hashes": {
            path: verifier._digest(bundle[path]) for path in verifier.MAPPER_OUTPUTS
        },
        "status": "candidate",
    }
    return bundle


class Phase2V8TruthVerifierTest(unittest.TestCase):
    """Exercises curated attacks, valid baselines, and inherited truth."""

    @classmethod
    def setUpClass(cls) -> None:
        """Loads immutable Phase 1 inputs once for the focused suite."""
        cls.inputs = verified_inputs()

    def test_zero_use_baseline_is_valid_and_candidate_path_executes(self) -> None:
        """The explicit zero-use baseline reaches candidate validation cleanly."""
        bundle = candidate_bundle(self.inputs)
        with (
            patch.object(verifier, "_truth_contract", return_value={}),
            patch.object(verifier, "_validate_specificity", return_value=[]),
            patch.object(verifier, "_project_to_v5", return_value={}),
            patch.object(verifier.v5, "_validate_bundle", return_value=([], 7)),
        ):
            findings, checks = verifier._validate_bundle(TRACK_ROOT, self.inputs, bundle)
        self.assertEqual(findings, [])
        self.assertEqual(checks, 640)

    def test_malformed_candidate_receipt_is_invalid(self) -> None:
        """A malformed mapper v5 receipt fails schema validation without crashing."""
        bundle = candidate_bundle(self.inputs)
        del bundle[verifier.MAPPER_RECEIPT]["status"]
        with (
            patch.object(verifier, "_truth_contract", return_value={}),
            patch.object(verifier, "_validate_specificity", return_value=[]),
            patch.object(verifier, "_project_to_v5", return_value={}),
            patch.object(verifier.v5, "_validate_bundle", return_value=([], 7)),
        ):
            findings, _ = verifier._validate_bundle(TRACK_ROOT, self.inputs, bundle)
        self.assertIn("INVALID_SCHEMA", {row.code for row in findings})

    def test_targeted_v8_fixture_runner_covers_every_case(self) -> None:
        """All v8 attacks emit their declared codes and the zero-use control passes."""
        fixture = json.loads(
            (TRACK_ROOT / "negative-fixtures/phase2-v8/curated-evidence-attacks.json").read_text()
        )
        findings = verifier._run_v8_fixture(TRACK_ROOT, self.inputs, fixture)
        self.assertNotIn(
            "FIXTURE_CASE_EXPECTATION_MISMATCH", {row.code for row in findings}
        )
        self.assertEqual(len(fixture["cases"]), 12)

    def test_missing_candidate_is_exact_lifecycle_red(self) -> None:
        """Missing mapper v5 files are the sole lifecycle Red after sealed inputs."""
        with isolated_track_without_mapper_v5() as isolated:
            result = verifier.verify_phase2(REPO_ROOT, isolated)
        self.assertEqual(result.state, "RED_WAITING_FOR_MAPPER_V5_OUTPUTS")
        self.assertEqual(
            {row.code for row in result.findings},
            {"PHASE2_MAPPER_V5_OUTPUTS_MISSING"},
        )

    def test_manifest_preserves_all_v7_attacks_and_adds_v8(self) -> None:
        """The v8 registry retains seven prior groups and binds one new group."""
        current = json.loads((TRACK_ROOT / verifier.FIXTURE_MANIFEST).read_text())
        prior = json.loads((TRACK_ROOT / "phase2-v7-fixture-manifest.json").read_text())
        self.assertEqual(current["fixture_count"], 8)
        self.assertEqual(current["case_count"], 76)
        self.assertEqual(current["fixtures"][:7], prior["fixtures"])
        self.assertEqual(current["fixtures"][7]["case_count"], 12)

    def test_all_v7_tests_and_attacks_remain_executable_under_budget(self) -> None:
        """The complete sealed v7 suite passes within the v8 runtime budget."""
        stream = io.StringIO()
        started = time.monotonic()
        result = unittest.TextTestRunner(stream=stream).run(
            unittest.defaultTestLoader.loadTestsFromModule(v7_tests)
        )
        elapsed = time.monotonic() - started
        self.assertTrue(result.wasSuccessful(), stream.getvalue())
        self.assertEqual(result.testsRun, 7)
        self.assertLess(elapsed, 30)

    def test_cli_expected_code_mode_accepts_exact_missing_mapper_red(self) -> None:
        """CLI expected-code mode binds the missing mapper v5 Red exactly."""
        with (
            isolated_track_without_mapper_v5() as isolated,
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
                        "PHASE2_MAPPER_V5_OUTPUTS_MISSING",
                    ]
                ),
                0,
            )


if __name__ == "__main__":
    unittest.main()
