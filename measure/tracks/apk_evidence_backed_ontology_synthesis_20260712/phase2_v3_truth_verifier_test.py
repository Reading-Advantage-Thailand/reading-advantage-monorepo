"""Focused tests for the corrected and sealed Phase 2 v3 lifecycle truth contract."""

from contextlib import redirect_stdout
import hashlib
import io
import json
from pathlib import Path
import shutil
import tempfile
import time
import unittest

import phase2_v3_truth_verifier as verifier

TRACK_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TRACK_ROOT.parents[2]


class Phase2V3TruthVerifierTest(unittest.TestCase):
    """Exercises sealed Red, the valid baseline, and every v3 counterexample."""

    def test_live_candidate_is_verified(self) -> None:
        """Published mapper outputs must pass the complete live v3 contract."""
        result = verifier.verify_phase2(REPO_ROOT, TRACK_ROOT)
        self.assertTrue(result.passed)
        self.assertEqual(result.state, "VERIFIED")
        self.assertEqual(result.findings, ())
        self.assertGreaterEqual(result.checks, 3191)

    def test_canonical_overlap_and_cross_batch_bundle_is_valid(self) -> None:
        """The overlap-capable cross-batch baseline must pass before mutation."""
        findings = []
        _, inputs = verifier._verify_inputs(TRACK_ROOT, findings)
        bundle = verifier._canonical_bundle(TRACK_ROOT, inputs)
        actual, checks = verifier._validate_bundle(TRACK_ROOT, inputs, bundle, False)
        self.assertEqual(findings, [])
        self.assertEqual(actual, [])
        self.assertGreater(checks, 2400)
        batches = bundle[verifier.MAPPER_OUTPUTS[0]]["evidence_batches"]
        self.assertEqual(
            set(batches[0]["game_ids"]) & set(batches[1]["game_ids"]),
            {batches[0]["game_ids"][1]},
        )
        capability = bundle[verifier.MAPPER_OUTPUTS[1]]["capabilities"][0]
        self.assertEqual(len(capability["evidence_batch_ids"]), 2)

    def test_fixture_manifest_is_exact_and_bounded(self) -> None:
        """All grouped fixture files must match immutable v3 bindings."""
        manifest = json.loads((TRACK_ROOT / verifier.FIXTURE_MANIFEST).read_text())
        self.assertEqual(manifest["fixture_count"], 10)
        self.assertEqual(manifest["case_count"], 20)
        self.assertLessEqual(manifest["fixture_count"], verifier.MAX_FIXTURE_FILES)
        for row in manifest["fixtures"]:
            path = TRACK_ROOT / row["path"]
            self.assertEqual(
                hashlib.sha256(path.read_bytes()).hexdigest(), row["sha256"]
            )

    def test_all_bound_negative_fixtures_fail_exactly_under_budget(self) -> None:
        """Every grouped v3 counterexample must emit exactly its sealed codes."""
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
                    {item.code for item in result.findings},
                    set(row["expected_codes"]),
                )
        self.assertLess(time.perf_counter() - started, 30)

    def test_phase1_denominators_are_exact(self) -> None:
        """The v2 contract must bind the complete accepted Phase 1 denominator."""
        findings = []
        _, inputs = verifier._verify_inputs(TRACK_ROOT, findings)
        index = verifier._indices(inputs)
        self.assertEqual(findings, [])
        self.assertEqual(len(index["source_claims"]), 1248)
        self.assertEqual(len(index["mechanic_records"]), 633)
        self.assertEqual(len(index["games"]), 28)
        self.assertEqual(len(index["documents"]), 32)

    def test_every_dispatch_negative_operation_is_present(self) -> None:
        """Fixtures must cover every product-owner required v2 rejection."""
        manifest = json.loads((TRACK_ROOT / verifier.FIXTURE_MANIFEST).read_text())
        operations = {
            case["mutation"]["operation"]
            for row in manifest["fixtures"]
            for case in json.loads((TRACK_ROOT / row["path"]).read_text())["cases"]
        }
        self.assertTrue(
            {
                "disjoint-whole-game-partition-assumption",
                "overlap-rejected",
                "cross-batch-aggregation-missing",
                "opaque-capability-contract",
                "scene-state-consumer-omitted",
                "noun-art-only-standardization",
                "provisional-only-standardization",
                "bespoke-without-incompatibility",
                "invented-behavior",
                "placement-status-collapse",
                "unknown-resolution",
                "missing-required-field",
                "surplus-field",
                "tampered-hash",
                "output-budget-exceeded",
            }.issubset(operations)
        )

    def test_exact_routing_and_unknown_preservation(self) -> None:
        """Baseline routes all mechanics once and leaves all unknowns unresolved."""
        findings = []
        _, inputs = verifier._verify_inputs(TRACK_ROOT, findings)
        bundle = verifier._canonical_bundle(TRACK_ROOT, inputs)
        classifications = bundle[verifier.MAPPER_OUTPUTS[1]]
        routed = [
            consumer["record_id"]
            for capability in classifications["capabilities"]
            for consumer in capability["consumers"]
        ] + [
            row["consumer"]["record_id"]
            for row in classifications["non_capability_context"]
        ]
        self.assertEqual(len(routed), 633)
        self.assertEqual(len(set(routed)), 633)
        dependencies = bundle[verifier.MAPPER_OUTPUTS[3]]
        unknowns = [
            row
            for row in dependencies["upstream_claims"]
            if row["phase1_routing_disposition"] == "blocked-upstream-unknown"
        ]
        self.assertEqual(len(unknowns), 24)
        self.assertTrue(
            all(
                row["phase2_disposition"] == "preserved-upstream-unknown"
                and not row["phase2_record_ids"]
                for row in unknowns
            )
        )

    def test_isolated_missing_output_red_and_cli_contract(self) -> None:
        """An isolated track copy must retain missing-output Red without workspace mutation."""
        required = (
            verifier.SUCCESSOR_DISPATCH_PATH,
            verifier.DISPATCH_PATH,
            verifier.PHASE1_ACCEPTANCE_PATH,
            *verifier.PHASE1_INPUTS,
            *verifier.PRESERVED_V2_RED,
        )
        with tempfile.TemporaryDirectory() as directory:
            isolated = Path(directory)
            for relative in required:
                destination = isolated / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(TRACK_ROOT / relative, destination)
            result = verifier.verify_phase2(REPO_ROOT, isolated)
            self.assertFalse(result.passed)
            self.assertEqual(result.state, "RED_WAITING_FOR_MAPPER_OUTPUTS")
            self.assertEqual(
                {item.code for item in result.findings},
                {"PHASE2_MAPPER_OUTPUTS_MISSING"},
            )
            for path in (*verifier.MAPPER_OUTPUTS, verifier.MAPPER_RECEIPT):
                self.assertIn(path, result.findings[0].message)
            args = [
                "--repo-root",
                str(REPO_ROOT),
                "--track-root",
                str(isolated),
                "--expect-codes",
                "PHASE2_MAPPER_OUTPUTS_MISSING",
            ]
            with redirect_stdout(io.StringIO()):
                self.assertEqual(verifier.main(args), 0)


if __name__ == "__main__":
    unittest.main()
