"""Focused tests for the Phase 2 v6 specificity Red contract."""

from contextlib import contextmanager, redirect_stdout
import hashlib
import io
import json
from pathlib import Path
import shutil
import tempfile
import time
import unittest

import phase2_v5_truth_verifier_test as v5_tests
import phase2_v6_truth_verifier as verifier

TRACK_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TRACK_ROOT.parents[2]


@contextmanager
def isolated_track_without_mapper_v4():
    """Yields frozen authority and inputs without mapper v4 outputs."""
    required = {
        verifier.DISPATCH_PATH,
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


class Phase2V6TruthVerifierTest(unittest.TestCase):
    """Exercises lifecycle Red, specificity, residual routes, and prior attacks."""

    def test_isolated_missing_mapper_v4_is_sole_lifecycle_red(self) -> None:
        """An isolated track reports only missing mapper v4 outputs."""
        with isolated_track_without_mapper_v4() as isolated:
            result = verifier.verify_phase2(REPO_ROOT, isolated)
            self.assertEqual(result.state, "RED_WAITING_FOR_MAPPER_V4_OUTPUTS")
            self.assertEqual(
                {row.code for row in result.findings},
                {"PHASE2_MAPPER_V4_OUTPUTS_MISSING"},
            )

    def test_rejected_v5_fails_all_bound_review_layers(self) -> None:
        """The immutable v5 false Green fails all v6 specificity layers."""
        self.assertEqual(
            {row.code for row in verifier._validate_rejected_v5(TRACK_ROOT)},
            {
                "GENERIC_BOUNDARY_TEMPLATE",
                "GENERIC_DIFFERENCE_STATEMENT",
                "GENERIC_RELEVANCE_TEMPLATE",
                "GENERIC_SIMILARITY_STATEMENT",
                "INCOMPLETE_EXCERPT",
                "MISSING_COMPARISON_DIMENSION",
                "MISSING_PER_GAME_VARIANTS",
                "MISSING_REQUIRED_FIELD",
                "RELEVANCE_DOES_NOT_NAME_EXCERPT_BEHAVIOR",
                "REPEATED_BOUNDARY_EFFECT",
                "RESIDUAL_ROUTING_REGRESSION",
                "REUSED_RELEVANCE_TEMPLATE",
            },
        )

    def test_manifest_is_exact_and_bounded(self) -> None:
        """Every fixture binding and declared case count is exact."""
        manifest = json.loads((TRACK_ROOT / verifier.FIXTURE_MANIFEST).read_text())
        self.assertEqual(manifest["fixture_count"], len(manifest["fixtures"]))
        self.assertEqual(
            manifest["case_count"],
            sum(row["case_count"] for row in manifest["fixtures"]),
        )
        for row in manifest["fixtures"]:
            self.assertEqual(
                hashlib.sha256((TRACK_ROOT / row["path"]).read_bytes()).hexdigest(),
                row["sha256"],
            )

    def test_all_bound_fixture_groups_fail_exactly_under_budget(self) -> None:
        """All inherited and v6 fixture groups emit their exact code union."""
        manifest = json.loads((TRACK_ROOT / verifier.FIXTURE_MANIFEST).read_text())
        started = time.perf_counter()
        for row in manifest["fixtures"]:
            result = verifier.verify_phase2(
                REPO_ROOT, TRACK_ROOT, TRACK_ROOT / row["path"]
            )
            self.assertEqual(
                {item.code for item in result.findings}, set(row["expected_codes"])
            )
        self.assertLess(time.perf_counter() - started, 30)

    def test_required_v6_operations_are_present(self) -> None:
        """Every dispatch-required v6 attack family is present."""
        fixture = json.loads(
            (
                TRACK_ROOT / "negative-fixtures/phase2-v6/specificity-attacks.json"
            ).read_text()
        )
        operations = {row["mutation"]["operation"] for row in fixture["cases"]}
        self.assertEqual(
            operations,
            {
                "generic-difference-rules-and-parameters",
                "difference-omits-comparison-dimension",
                "difference-omits-game-variant",
                "repeated-boundary-effect",
                "generic-boundary-template",
                "reused-relevance-template",
                "relevance-does-not-name-excerpt-behavior",
                "each-nine-residual-misroute",
                "unbalanced-parentheses",
                "unbalanced-quotes",
                "mid-clause-ending",
                "rejected-v5-candidate-fails",
            },
        )

    def test_each_residual_route_is_independently_bound(self) -> None:
        """All nine residual route groups fail in the rejected v5 candidate."""
        bundle = verifier._rejected_v5_bundle(TRACK_ROOT)
        uses, context, _ = verifier.v5._usage_map(bundle[verifier.MAPPER_OUTPUTS[1]])
        failures = 0
        for capability_id, claim_ids in verifier.RESIDUAL_CAPABILITY_ROUTES.items():
            failures += sum(
                capability_id not in uses.get(claim_id, set()) for claim_id in claim_ids
            )
        failures += sum(
            claim_id not in context or uses.get(claim_id)
            for claim_id in verifier.RESIDUAL_CONTEXT
        )
        aw_uses = [
            use
            for capability in bundle[verifier.MAPPER_OUTPUTS[1]]["capabilities"]
            for use in capability["consumers"]
            if use["claim_id"] == "AW-HIST-030"
        ]
        failures += int(
            "AW-HIST-030" not in context
            and any(
                not verifier._excerpt_complete(use["exact_excerpt"]) for use in aw_uses
            )
        )
        self.assertEqual(failures, 9)

    def test_complete_excerpt_examples_are_distinguished(self) -> None:
        """Balanced complete clauses pass while malformed endings fail."""
        self.assertTrue(
            verifier._excerpt_complete("The gate opens only while the pair is active.")
        )
        self.assertFalse(
            verifier._excerpt_complete("The gate opens (only while active.")
        )
        self.assertFalse(verifier._excerpt_complete('The gate emits "active state.'))
        self.assertFalse(verifier._excerpt_complete("The gate advances when the"))

    def test_preserved_v5_focused_suite_still_passes(self) -> None:
        """The complete sealed v5 focused suite remains executable."""
        stream = io.StringIO()
        result = unittest.TextTestRunner(stream=stream).run(
            unittest.defaultTestLoader.loadTestsFromModule(v5_tests)
        )
        self.assertTrue(result.wasSuccessful(), stream.getvalue())
        self.assertEqual(result.testsRun, 9)

    def test_isolated_cli_accepts_only_missing_mapper_v4_red(self) -> None:
        """CLI expected-code mode binds lifecycle Red exactly."""
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
