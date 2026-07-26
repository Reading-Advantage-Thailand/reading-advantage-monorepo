"""Tests for the active T9 Phase 0 truth verifier."""

from contextlib import redirect_stdout
import io
from pathlib import Path
import time
import unittest

import phase0_active_truth_verifier as verifier
import phase0_truth_verifier as legacy


TRACK_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TRACK_ROOT.parents[2]


class ActivePhase0TruthVerifierTest(unittest.TestCase):
    """Exercises the active graph and every retained counterexample."""

    def test_live_active_graph_passes(self) -> None:
        """The exact v2 graph must authorize Phase 1 without findings.

        Returns:
            None.
        """
        result = verifier.verify_phase0(REPO_ROOT, TRACK_ROOT)

        self.assertTrue(result.passed)
        self.assertEqual(result.state, "VERIFIED")
        self.assertEqual(result.findings, ())

    def test_all_seventeen_counterexamples_are_rejected(self) -> None:
        """Every retained bypass fixture must fail for its named reason.

        Returns:
            None.
        """
        manifest = legacy.load_json(TRACK_ROOT / verifier.FIXTURE_MANIFEST)

        self.assertEqual(len(manifest["fixtures"]), 17)
        for fixture in manifest["fixtures"]:
            with self.subTest(fixture=fixture["id"]):
                result = verifier.verify_phase0(
                    REPO_ROOT,
                    TRACK_ROOT,
                    fixture_path=TRACK_ROOT / fixture["path"],
                )
                codes = {finding.code for finding in result.findings}
                self.assertFalse(result.passed)
                self.assertEqual(result.state, "INVALID")
                for code in fixture["expected_codes"]:
                    self.assertIn(code, codes)

    def test_active_t8_chain_is_exactly_t9_only(self) -> None:
        """T8 must remain active only for ontology synthesis.

        Returns:
            None.
        """
        registry = legacy.load_json(TRACK_ROOT / verifier.ACTIVE_REGISTRY)
        accepted = registry["t8_accepted"]
        manifest = legacy.load_json(
            REPO_ROOT / accepted["accepted_manifest"]["path"]
        )
        root = legacy.load_json(REPO_ROOT / accepted["root_acceptance"]["path"])

        self.assertEqual(manifest["consumer_scope"], "T9_ontology_only")
        self.assertEqual(root["scope"], "T9-only consumption")
        self.assertEqual(root["next_gate"]["status"], "OPEN_T9_ONLY")

    def test_root_product_owner_authority_is_cross_contract_exact(
        self,
    ) -> None:
        """Root owner authority must agree across roles and T8 evidence.

        Returns:
            None.
        """
        roles = legacy.load_json(
            TRACK_ROOT / "phase0-role-ownership-manifest-v2.json"
        )
        root = roles["root_orchestrator"]
        assignment = next(
            item
            for item in roles["assignments"]
            if item["task_id"] == "phase6-product-owner-acceptance"
        )

        self.assertEqual(root["agent_ref"], "/root")
        self.assertEqual(
            root["delegated_roles"],
            ["product-owner-acceptance-author"],
        )
        self.assertNotIn(
            "product-owner-acceptance-author",
            root["forbidden_roles"],
        )
        self.assertEqual(assignment["agent_ref"], "/root")

    def test_failed_monolith_remains_excluded(self) -> None:
        """No failed-monolith path may enter the active source graph.

        Returns:
            None.
        """
        registry = legacy.load_json(TRACK_ROOT / verifier.ACTIVE_REGISTRY)

        self.assertFalse(
            any(
                legacy.FAILED_MONOLITH in source["path"]
                for source in registry["sources"]
            )
        )

    def test_wrong_t8_fixture_has_exact_cli_codes(self) -> None:
        """Strict CLI mode must require T8 and clearance drift.

        Returns:
            None.
        """
        args = [
            "--repo-root",
            str(REPO_ROOT),
            "--track-root",
            str(TRACK_ROOT),
            "--fixture",
            str(TRACK_ROOT / "negative-fixtures/phase0/wrong-t8-artifact.json"),
            "--expect-codes",
            "WRONG_T8_ARTIFACT",
            "FALSE_STOP_LOSS_ACCOUNTING",
        ]

        with redirect_stdout(io.StringIO()):
            self.assertEqual(verifier.main(args), 0)

    def test_full_fixture_matrix_stays_under_budget(self) -> None:
        """The active matrix must complete inside the 30-second budget.

        Returns:
            None.
        """
        manifest = legacy.load_json(TRACK_ROOT / verifier.FIXTURE_MANIFEST)
        start = time.monotonic()
        verifier.verify_phase0(REPO_ROOT, TRACK_ROOT)
        for fixture in manifest["fixtures"]:
            verifier.verify_phase0(
                REPO_ROOT,
                TRACK_ROOT,
                fixture_path=TRACK_ROOT / fixture["path"],
            )

        self.assertLess(time.monotonic() - start, 30.0)


if __name__ == "__main__":
    unittest.main()
