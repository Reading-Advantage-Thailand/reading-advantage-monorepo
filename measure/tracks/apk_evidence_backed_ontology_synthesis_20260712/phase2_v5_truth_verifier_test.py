"""Focused tests for the Phase 2 v5 systemic semantic Red contract."""

from contextlib import contextmanager, redirect_stdout
import hashlib
import io
import json
from pathlib import Path
import shutil
import tempfile
import time
import unittest

import phase2_v5_truth_verifier as verifier

TRACK_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TRACK_ROOT.parents[2]


@contextmanager
def isolated_track_without_mapper_v3():
    """Yields exact frozen authority and inputs without mapper v3 outputs."""
    required = {
        verifier.DISPATCH_PATH,
        *verifier.PHASE1_INPUTS,
        *verifier.PRESERVED_V4_RED,
        *verifier.REJECTED_V2,
        verifier.v4.DISPATCH_PATH,
        *verifier.v4.PHASE1_INPUTS,
        *verifier.v4.PRESERVED_V2_RED,
        *verifier.v4.PRESERVED_V3_DRAFTS,
        *verifier.v4.REJECTED_V1,
        verifier.v4.v2.DISPATCH_PATH,
    }
    with tempfile.TemporaryDirectory() as directory:
        isolated = Path(directory)
        for relative in required:
            destination = isolated / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(TRACK_ROOT / relative, destination)
        yield isolated


class Phase2V5TruthVerifierTest(unittest.TestCase):
    """Exercises lifecycle Red, readable evidence, routing, and prior attacks."""

    def test_isolated_missing_mapper_v3_is_sole_lifecycle_red(self) -> None:
        """An isolated track reports only the missing mapper v3 lifecycle Red."""
        with isolated_track_without_mapper_v3() as isolated:
            result = verifier.verify_phase2(REPO_ROOT, isolated)
            self.assertEqual(result.state, "RED_WAITING_FOR_MAPPER_V3_OUTPUTS")
            self.assertEqual(
                {row.code for row in result.findings},
                {"PHASE2_MAPPER_V3_OUTPUTS_MISSING"},
            )

    def test_canonical_systemic_bundle_is_valid(self) -> None:
        """The canonical baseline satisfies v5 and all preserved validators."""
        findings = []
        _, inputs = verifier._verify_inputs(TRACK_ROOT, findings)
        bundle = verifier._canonical_bundle(TRACK_ROOT, inputs)
        actual, checks = verifier._validate_bundle(TRACK_ROOT, inputs, bundle)
        self.assertEqual(findings, [])
        self.assertEqual(actual, [])
        self.assertGreater(checks, 2400)
        uses, context, duplicates = verifier._usage_map(
            bundle[verifier.MAPPER_OUTPUTS[1]]
        )
        self.assertEqual(duplicates, [])
        self.assertEqual(len(context | set(uses)), 633)
        self.assertEqual(
            uses["DS-CL-H-005"],
            {
                "capability:input-action-normalization",
                "capability:session-feedback-surfaces",
            },
        )

    def test_fixture_manifest_is_exact_and_bounded(self) -> None:
        """Every manifest binding and declared case count is exact."""
        manifest = json.loads((TRACK_ROOT / verifier.FIXTURE_MANIFEST).read_text())
        self.assertEqual(manifest["fixture_count"], len(manifest["fixtures"]))
        self.assertEqual(
            manifest["case_count"],
            sum(row["case_count"] for row in manifest["fixtures"]),
        )
        for row in manifest["fixtures"]:
            path = TRACK_ROOT / row["path"]
            self.assertEqual(
                hashlib.sha256(path.read_bytes()).hexdigest(), row["sha256"]
            )

    def test_all_attacks_fail_exactly_under_budget(self) -> None:
        """All inherited and v5 attacks emit exactly their bound codes."""
        manifest = json.loads((TRACK_ROOT / verifier.FIXTURE_MANIFEST).read_text())
        started = time.perf_counter()
        for row in manifest["fixtures"]:
            result = verifier.verify_phase2(
                REPO_ROOT, TRACK_ROOT, TRACK_ROOT / row["path"]
            )
            self.assertEqual(result.state, row["expected_state"])
            self.assertEqual(
                {item.code for item in result.findings}, set(row["expected_codes"])
            )
        self.assertLess(time.perf_counter() - started, 30)

    def test_v5_operations_cover_dispatch_attacks(self) -> None:
        """The suite includes all v5 readability and routing attack families."""
        manifest = json.loads((TRACK_ROOT / verifier.FIXTURE_MANIFEST).read_text())
        operations = {
            case["mutation"]["operation"]
            for row in manifest["fixtures"]
            for case in json.loads((TRACK_ROOT / row["path"]).read_text())["cases"]
        }
        self.assertTrue(
            {
                "literal-ellipsis",
                "unicode-ellipsis",
                "boundary-effect-copies-statement",
                "boundary-effect-fields-copy-each-other",
                "missing-exact-excerpt",
                "excerpt-not-substring-of-accepted-fact",
                "provenance-only-capability-use",
                "audited-routing-regression",
                "audited-context-regression",
                "single-capability-partition-for-multibehavior-claim",
                "split-requirement-regression",
            }.issubset(operations)
        )

    def test_each_audited_route_and_context_regression_is_rejected(self) -> None:
        """Every product-owner audited route has an isolated negative probe."""
        findings = []
        _, inputs = verifier._verify_inputs(TRACK_ROOT, findings)
        bundle = verifier._canonical_bundle(TRACK_ROOT, inputs)
        baseline_uses, baseline_context, _ = verifier._usage_map(
            bundle[verifier.MAPPER_OUTPUTS[1]]
        )
        for capability_id, claim_ids in verifier.AUDITED_ROUTING.items():
            for claim_id in claim_ids:
                uses = {key: set(value) for key, value in baseline_uses.items()}
                uses[claim_id].discard(capability_id)
                probe = []
                verifier._validate_audited_routing(probe, uses, set(baseline_context))
                self.assertIn("AUDITED_ROUTING_REGRESSION", {row.code for row in probe})
        for claim_id in verifier.REQUIRED_CONTEXT:
            context = set(baseline_context)
            context.discard(claim_id)
            probe = []
            verifier._validate_audited_routing(probe, baseline_uses, context)
            self.assertEqual(
                {row.code for row in probe}, {"AUDITED_CONTEXT_REGRESSION"}
            )

    def test_rejected_mapper_v2_fails_v5_gate(self) -> None:
        """The preserved mapper v2 candidate fails systemic v5 semantics."""
        findings = []
        _, inputs = verifier._verify_inputs(TRACK_ROOT, findings)
        rejected = verifier._validate_rejected_v2(TRACK_ROOT, inputs)
        self.assertEqual(findings, [])
        self.assertTrue(
            {
                "ELLIPSIS_FORBIDDEN",
                "MISSING_BOUNDARY_EFFECT_FIELDS",
                "MISSING_EXACT_EXCERPT",
                "MISSING_RELEVANCE_STATEMENT",
                "AUDITED_ROUTING_REGRESSION",
                "AUDITED_CONTEXT_REGRESSION",
            }.issubset({item.code for item in rejected})
        )

    def test_phase1_denominators_remain_exact(self) -> None:
        """The baseline retains every accepted Phase 1 denominator."""
        findings = []
        _, inputs = verifier._verify_inputs(TRACK_ROOT, findings)
        index = verifier.v4.v2._indices(inputs)
        self.assertEqual(
            (
                len(index["source_claims"]),
                len(index["mechanic_records"]),
                len(index["games"]),
            ),
            (1248, 633, 28),
        )
        self.assertEqual(
            inputs["source"]["scope_audit"]["totals"]["upstream_unknown"], 24
        )

    def test_isolated_cli_accepts_only_missing_mapper_v3_red(self) -> None:
        """CLI expected-code mode binds the isolated lifecycle Red exactly."""
        with (
            isolated_track_without_mapper_v3() as isolated,
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
                        "PHASE2_MAPPER_V3_OUTPUTS_MISSING",
                    ]
                ),
                0,
            )


if __name__ == "__main__":
    unittest.main()
