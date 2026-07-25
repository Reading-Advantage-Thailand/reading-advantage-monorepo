"""Focused tests for the sealed Phase 2 v4 readable-findings Red contract."""

from contextlib import contextmanager, redirect_stdout
import hashlib
import io
import json
from pathlib import Path
import shutil
import tempfile
import time
import unittest

import phase2_v4_truth_verifier as verifier

TRACK_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TRACK_ROOT.parents[2]


@contextmanager
def isolated_track_without_mapper_v2():
    """Yields an isolated authority/input copy without mapper v2 outputs."""
    required = {
        verifier.DISPATCH_PATH,
        *verifier.PHASE1_INPUTS,
        *verifier.PRESERVED_V2_RED,
        *verifier.PRESERVED_V3_DRAFTS,
        *verifier.REJECTED_V1,
        verifier.v2.DISPATCH_PATH,
    }
    with tempfile.TemporaryDirectory() as directory:
        isolated = Path(directory)
        for relative in required:
            destination = isolated / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(TRACK_ROOT / relative, destination)
        yield isolated


class Phase2V4TruthVerifierTest(unittest.TestCase):
    """Exercises lifecycle Red, readable schema, and all inherited attacks."""

    def test_isolated_missing_mapper_v2_is_sole_lifecycle_red(self) -> None:
        """An isolated track copy must report only missing mapper v2 outputs."""
        with isolated_track_without_mapper_v2() as isolated:
            result = verifier.verify_phase2(REPO_ROOT, isolated)
            self.assertFalse(result.passed)
            self.assertEqual(result.state, "RED_WAITING_FOR_MAPPER_V2_OUTPUTS")
            self.assertEqual(
                {item.code for item in result.findings},
                {"PHASE2_MAPPER_V2_OUTPUTS_MISSING"},
            )
            for path in (*verifier.MAPPER_OUTPUTS, verifier.MAPPER_RECEIPT):
                self.assertIn(path, result.findings[0].message)

    def test_canonical_readable_bundle_is_valid(self) -> None:
        """The deterministic readable baseline must satisfy v4 and v2 semantics."""
        findings = []
        _, inputs = verifier._verify_inputs(TRACK_ROOT, findings)
        bundle = verifier._canonical_bundle(TRACK_ROOT, inputs)
        actual, checks = verifier._validate_bundle(TRACK_ROOT, inputs, bundle)
        self.assertEqual(findings, [])
        self.assertEqual(actual, [])
        self.assertGreater(checks, 2400)
        finding = bundle[verifier.MAPPER_OUTPUTS[0]]["evidence_batches"][0][
            "similarities"
        ][0]
        self.assertEqual(set(finding), verifier.FINDING_KEYS)
        self.assertTrue(40 <= len(finding["statement"]) <= 280)
        self.assertTrue(24 <= len(finding["boundary_effect"]) <= 280)
        self.assertTrue(
            all(
                24 <= len(row["behavior"]) <= 480
                for row in finding["per_game_behaviors"]
            )
        )

    def test_fixture_manifest_is_exact_and_bounded(self) -> None:
        """All v4 fixture files must match their immutable manifest bindings."""
        manifest = json.loads((TRACK_ROOT / verifier.FIXTURE_MANIFEST).read_text())
        self.assertEqual(manifest["fixture_count"], 4)
        self.assertEqual(manifest["case_count"], 32)
        self.assertLessEqual(manifest["fixture_count"], verifier.MAX_FIXTURE_FILES)
        for row in manifest["fixtures"]:
            path = TRACK_ROOT / row["path"]
            self.assertEqual(
                hashlib.sha256(path.read_bytes()).hexdigest(), row["sha256"]
            )

    def test_all_v4_and_preserved_v2_attacks_fail_exactly_under_budget(self) -> None:
        """All 32 attacks must emit exactly their stable rejection codes."""
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

    def test_required_operations_cover_v2_and_readability_contracts(self) -> None:
        """The fixture suite must contain every dispatch-required attack."""
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
                "missing-statement",
                "opaque-statement",
                "missing-per-game-behavior",
                "game-behavior-consumer-mismatch",
                "missing-boundary-effect",
                "generic-boundary-effect",
                "classification-drops-readable-finding",
                "boundary-drops-readable-incompatibility",
                "invented-summary",
                "oversized-statement",
                "oversized-per-game-behavior",
                "oversized-boundary-effect",
            }.issubset(operations)
        )

    def test_rejected_mapper_v1_fails_readability_gate(self) -> None:
        """The preserved mapper v1 candidate must fail every absent readable layer."""
        findings = []
        _, inputs = verifier._verify_inputs(TRACK_ROOT, findings)
        rejected = verifier._validate_rejected_v1(TRACK_ROOT, inputs)
        self.assertEqual(findings, [])
        self.assertEqual(
            {item.code for item in rejected},
            {
                "BOUNDARY_EFFECT_MISSING",
                "BOUNDARY_READABLE_INCOMPATIBILITY_DROPPED",
                "CLASSIFICATION_READABLE_FINDING_DROPPED",
                "MISSING_READABLE_FINDING_FIELD",
                "MISSING_REQUIRED_FIELD",
                "PER_GAME_BEHAVIOR_MISSING",
            },
        )

    def test_phase1_denominators_and_exact_routing_remain(self) -> None:
        """The readable layer must retain all accepted Phase 1 denominators."""
        findings = []
        _, inputs = verifier._verify_inputs(TRACK_ROOT, findings)
        index = verifier.v2._indices(inputs)
        bundle = verifier._canonical_bundle(TRACK_ROOT, inputs)
        projected = verifier._project_to_v2(bundle, TRACK_ROOT)
        classifications = projected[verifier.v2.MAPPER_OUTPUTS[1]]
        routed = [
            consumer["record_id"]
            for capability in classifications["capabilities"]
            for consumer in capability["consumers"]
        ] + [
            row["consumer"]["record_id"]
            for row in classifications["non_capability_context"]
        ]
        self.assertEqual(findings, [])
        self.assertEqual(len(index["source_claims"]), 1248)
        self.assertEqual(len(index["mechanic_records"]), 633)
        self.assertEqual(len(index["games"]), 28)
        self.assertEqual(len(set(routed)), 633)

    def test_isolated_cli_accepts_only_missing_mapper_v2_red(self) -> None:
        """CLI expected-code mode must bind the isolated lifecycle Red exactly."""
        with isolated_track_without_mapper_v2() as isolated:
            args = [
                "--repo-root",
                str(REPO_ROOT),
                "--track-root",
                str(isolated),
                "--expect-codes",
                "PHASE2_MAPPER_V2_OUTPUTS_MISSING",
            ]
            with redirect_stdout(io.StringIO()):
                self.assertEqual(verifier.main(args), 0)


if __name__ == "__main__":
    unittest.main()
