"""Focused tests for the sealed Phase 2 capability truth contract."""

from contextlib import redirect_stdout
import hashlib
import io
import json
from pathlib import Path
import time
import unittest

import phase2_truth_verifier as verifier

TRACK_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TRACK_ROOT.parents[2]


class Phase2TruthVerifierTest(unittest.TestCase):
    """Exercises sealed Red, the valid baseline, and every counterexample."""

    def test_live_state_is_red_only_for_missing_mapper_outputs(self) -> None:
        """Absent mapper outputs must be the sole live Red finding."""
        result = verifier.verify_phase2(REPO_ROOT, TRACK_ROOT)
        self.assertFalse(result.passed)
        self.assertEqual(result.state, "RED_WAITING_FOR_MAPPER_OUTPUTS")
        self.assertEqual(
            {item.code for item in result.findings}, {"PHASE2_MAPPER_OUTPUTS_MISSING"}
        )
        for path in (*verifier.MAPPER_OUTPUTS, verifier.MAPPER_RECEIPT):
            self.assertIn(path, result.findings[0].message)

    def test_canonical_fixture_bundle_is_valid(self) -> None:
        """The decision-free baseline must pass before mutation."""
        findings = []
        _, inputs = verifier._verify_inputs(TRACK_ROOT, findings)
        bundle = verifier._canonical_bundle(TRACK_ROOT, inputs)
        actual, checks = verifier._validate_bundle(TRACK_ROOT, inputs, bundle, False)
        self.assertEqual(findings, [])
        self.assertEqual(actual, [])
        self.assertGreater(checks, 1248)

    def test_fixture_manifest_is_exact_and_bounded(self) -> None:
        """All fixture files must match their immutable bindings."""
        manifest = json.loads((TRACK_ROOT / verifier.FIXTURE_MANIFEST).read_text())
        self.assertEqual(manifest["fixture_count"], 10)
        self.assertEqual(manifest["case_count"], 19)
        self.assertLessEqual(manifest["fixture_count"], verifier.MAX_FIXTURE_FILES)
        for row in manifest["fixtures"]:
            path = TRACK_ROOT / row["path"]
            self.assertEqual(
                hashlib.sha256(path.read_bytes()).hexdigest(), row["sha256"]
            )

    def test_all_bound_negative_fixtures_fail_exactly_under_budget(self) -> None:
        """Every grouped counterexample must emit exactly its stable codes."""
        manifest = json.loads((TRACK_ROOT / verifier.FIXTURE_MANIFEST).read_text())
        started = time.perf_counter()
        for row in manifest["fixtures"]:
            with self.subTest(fixture=row["id"]):
                result = verifier.verify_phase2(
                    REPO_ROOT, TRACK_ROOT, TRACK_ROOT / row["path"]
                )
                self.assertFalse(result.passed)
                self.assertEqual(result.state, "INVALID")
                self.assertEqual(
                    {item.code for item in result.findings}, set(row["expected_codes"])
                )
        self.assertLess(time.perf_counter() - started, 30)

    def test_phase1_input_cardinalities_and_documents_are_exact(self) -> None:
        """The accepted Phase 1 corpus must remain the complete denominator."""
        findings = []
        _, inputs = verifier._verify_inputs(TRACK_ROOT, findings)
        index = verifier._indices(inputs)
        self.assertEqual(findings, [])
        self.assertEqual(len(index["source_claims"]), 1248)
        self.assertEqual(len(index["mechanic_records"]), 633)
        self.assertEqual(len(index["all_records"]), 1009)
        self.assertEqual(len(index["games"]), 28)
        self.assertEqual(len(index["documents"]), 32)

    def test_required_rejection_operations_are_present(self) -> None:
        """Fixtures must cover every dispatch-required negative class."""
        manifest = json.loads((TRACK_ROOT / verifier.FIXTURE_MANIFEST).read_text())
        operations = {
            case["mutation"]["operation"]
            for row in manifest["fixtures"]
            for case in json.loads((TRACK_ROOT / row["path"]).read_text())["cases"]
        }
        self.assertTrue(
            {
                "noun-art-standardization",
                "provisional-only-standardization",
                "invented-behavior",
                "placement-status-collapse",
                "resolve-upstream-unknown",
                "four-game-batch",
                "missing-required-field",
                "surplus-field",
                "tampered-phase1-hash",
                "output-budget-overflow",
            }.issubset(operations)
        )

    def test_cli_accepts_only_exact_missing_output_red(self) -> None:
        """Expected-code mode must bind the sealed live Red exactly."""
        args = [
            "--repo-root",
            str(REPO_ROOT),
            "--track-root",
            str(TRACK_ROOT),
            "--expect-codes",
            "PHASE2_MAPPER_OUTPUTS_MISSING",
        ]
        with redirect_stdout(io.StringIO()):
            self.assertEqual(verifier.main(args), 0)
            self.assertEqual(verifier.main([*args[:-1], "INVENTED_BEHAVIOR"]), 1)


if __name__ == "__main__":
    unittest.main()
