"""Focused tests for the Phase 1 fail-closed truth verifier."""

from contextlib import redirect_stdout
import hashlib
import io
import json
import shutil
from pathlib import Path
import tempfile
import time
import unittest

import phase1_truth_verifier


TRACK_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TRACK_ROOT.parents[2]


class Phase1TruthVerifierTest(unittest.TestCase):
    """Exercises live Green, simulated missing-output Red, and counterexamples."""

    def test_live_verified_and_missing_output_red_are_both_exact(self) -> None:
        """Published outputs pass while a non-destructive omission remains Red."""
        result = phase1_truth_verifier.verify_phase1(REPO_ROOT, TRACK_ROOT)

        self.assertTrue(result.passed)
        self.assertEqual(result.state, "VERIFIED")
        self.assertEqual(result.checks, 2298)
        self.assertEqual(result.findings, ())

        with tempfile.TemporaryDirectory() as directory:
            simulated_track = Path(directory) / TRACK_ROOT.name
            shutil.copytree(
                TRACK_ROOT,
                simulated_track,
                ignore=shutil.ignore_patterns(
                    *phase1_truth_verifier.MAPPER_OUTPUT_PATHS,
                    Path(phase1_truth_verifier.MAPPER_RECEIPT_PATH).name,
                ),
            )
            red = phase1_truth_verifier.verify_phase1(REPO_ROOT, simulated_track)

        self.assertFalse(red.passed)
        self.assertEqual(red.state, "RED_WAITING_FOR_MAPPER_OUTPUTS")
        self.assertEqual(
            {finding.code for finding in red.findings},
            {"PHASE1_MAPPER_OUTPUTS_MISSING"},
        )
        for path in phase1_truth_verifier.MAPPER_OUTPUT_PATHS:
            self.assertIn(path, red.findings[0].message)

    def test_synthetic_decision_free_bundle_is_valid(self) -> None:
        """The fixture baseline must pass before any mutation is applied."""
        frozen_findings = []
        _, registry = phase1_truth_verifier._verify_frozen_inputs(
            REPO_ROOT,
            TRACK_ROOT,
            frozen_findings,
        )
        bundle, games = phase1_truth_verifier._canonical_fixture_bundle(
            REPO_ROOT, registry
        )
        findings, checks = phase1_truth_verifier._verify_bundle(
            REPO_ROOT,
            registry,
            bundle,
            games,
        )

        self.assertEqual(frozen_findings, [])
        self.assertEqual(findings, [])
        self.assertGreater(checks, 0)

    def test_fixture_manifest_hashes_are_exact(self) -> None:
        """Every negative fixture must match its immutable manifest hash."""
        manifest = phase1_truth_verifier._load_json(
            TRACK_ROOT / phase1_truth_verifier.FIXTURE_MANIFEST_PATH
        )

        self.assertEqual(manifest["fixture_count"], 16)
        self.assertEqual(len(manifest["fixtures"]), 16)
        self.assertEqual(manifest["case_count"], 80)
        for fixture in manifest["fixtures"]:
            path = TRACK_ROOT / fixture["path"]
            actual = hashlib.sha256(path.read_bytes()).hexdigest()
            self.assertEqual(actual, fixture["sha256"])

    def test_all_bound_negative_fixtures_fail_exactly(self) -> None:
        """Each counterexample must emit only its named stable code."""
        manifest = phase1_truth_verifier._load_json(
            TRACK_ROOT / phase1_truth_verifier.FIXTURE_MANIFEST_PATH
        )
        started = time.perf_counter()

        for fixture in manifest["fixtures"]:
            with self.subTest(fixture=fixture["id"]):
                result = phase1_truth_verifier.verify_phase1(
                    REPO_ROOT,
                    TRACK_ROOT,
                    fixture_path=TRACK_ROOT / fixture["path"],
                )
                self.assertFalse(result.passed)
                self.assertEqual(result.state, "INVALID")
                self.assertEqual(
                    {finding.code for finding in result.findings},
                    set(fixture["expected_codes"]),
                )
        self.assertLess(time.perf_counter() - started, 30)

    def test_effective_scope_unknown_and_selector_contracts_are_exact(self) -> None:
        """Effective claims must reproduce all six buckets and readable facts."""
        audit = phase1_truth_verifier._source_scope_audit(REPO_ROOT)
        self.assertEqual(
            audit["totals"],
            {
                "claims": 1248,
                "direct": 573,
                "explicit_game_package_global": 421,
                "exact_parent_linked": 20,
                "ambiguous_blocked": 210,
                "upstream_unknown": 24,
            },
        )
        unknown_ids = [
            claim["claim_id"]
            for row in audit["per_game"]
            for claim in row["claims"]
            if claim["scope_class"] == "upstream-unknown"
        ]
        self.assertEqual(tuple(unknown_ids), phase1_truth_verifier.UPSTREAM_UNKNOWN_IDS)
        self.assertEqual(
            hashlib.sha256(
                json.dumps(unknown_ids, separators=(",", ":")).encode()
            ).hexdigest(),
            phase1_truth_verifier.UPSTREAM_UNKNOWN_IDS_SHA256,
        )
        opaque = []
        for game_id in phase1_truth_verifier.EXPECTED_RESOLVABLE_GAME_IDS:
            for claim_id, materialized in phase1_truth_verifier._effective_claims(
                REPO_ROOT, game_id, *phase1_truth_verifier.TERMINAL_LEAVES[game_id]
            ).items():
                if (
                    phase1_truth_verifier._claim_fact_pointer(materialized["claim"])
                    == "/claim_id"
                ):
                    opaque.append((game_id, claim_id))
        self.assertEqual(opaque, [])

    def test_full_corpus_reference_records_are_closed_and_complete(self) -> None:
        """Every current claim must have one complete canonical production record."""
        frozen_findings = []
        _, registry = phase1_truth_verifier._verify_frozen_inputs(
            REPO_ROOT, TRACK_ROOT, frozen_findings
        )
        bundle, _ = phase1_truth_verifier._reference_contract_bundle(
            REPO_ROOT, registry
        )
        records = [
            record
            for path in phase1_truth_verifier.MAPPER_OUTPUT_PATHS[1:3]
            for record in bundle[path]["records"]
        ]
        required = {
            "record_id",
            "record_type",
            "output_role",
            "owner_role",
            "evidence_category_role",
            "game_id",
            "source_claim_id",
            "factual_evidence_status",
            "scope_status",
            "coverage_granularity",
            "coverage_status",
            "counts_as_resolved_coverage",
            "scene_id",
            "state_id",
            "scene_state_provenance",
            "derived_fields",
        }
        self.assertEqual(len(records), 1009)
        self.assertTrue(all(set(record) == required for record in records))
        self.assertTrue(all(len(record["derived_fields"]) == 1 for record in records))
        self.assertTrue(
            all(
                field.get("value_sha256")
                for record in records
                for field in record["derived_fields"]
            )
        )

    def test_routing_and_reference_artifact_budgets_are_exact(self) -> None:
        """Routing and all four compact reference artifacts stay fail-closed."""
        metrics = phase1_truth_verifier._reference_contract_metrics(REPO_ROOT)
        self.assertEqual(
            metrics["routing_counts"],
            {
                "phase1-effort": 376,
                "phase1-mechanic": 633,
                "deferred-asset": 146,
                "deferred-responsive": 52,
                "context-only": 17,
                "blocked-upstream-unknown": 24,
            },
        )
        self.assertEqual(metrics["games_with_zero_mechanics"], [])
        self.assertEqual(
            metrics["serialized_bytes"],
            {
                "phase1-source-resolution-index-v1.json": 780843,
                "phase1-mechanic-blueprints-v1.json": 731563,
                "phase1-developer-effort-baseline-v1.json": 408825,
                "phase1-claim-dependency-edges-v1.json": 424740,
            },
        )
        self.assertTrue(
            all(
                size <= phase1_truth_verifier.MAX_REPORT_BYTES
                for size in metrics["serialized_bytes"].values()
            )
        )
        self.assertEqual(
            len(phase1_truth_verifier._expected_source_artifacts()),
            phase1_truth_verifier.MAX_SOURCE_RECORDS,
        )

    def test_compound_transport_categories_precede_completion_mechanics(self) -> None:
        """Six exact route/test compounds route to effort, not mechanics."""
        routed = []
        for game_id in phase1_truth_verifier.EXPECTED_RESOLVABLE_GAME_IDS:
            for materialized in phase1_truth_verifier._effective_claims(
                REPO_ROOT, game_id, *phase1_truth_verifier.TERMINAL_LEAVES[game_id]
            ).values():
                if materialized["claim"].get("category") in {
                    "completion-route",
                    "route-completion",
                    "completion-test",
                }:
                    routed.append(
                        phase1_truth_verifier._claim_routing(materialized["claim"])[0]
                    )
        self.assertEqual(routed, ["phase1-effort"] * 6)

    def test_cli_accepts_live_verified(self) -> None:
        """The CLI exits successfully for the published verified bundle."""
        live = [
            "--repo-root",
            str(REPO_ROOT),
            "--track-root",
            str(TRACK_ROOT),
        ]

        with redirect_stdout(io.StringIO()):
            self.assertEqual(phase1_truth_verifier.main(live), 0)

    def test_t2_normalization_is_exact_and_digest_bound(self) -> None:
        """Descriptive T2 labels must resolve to the fixed ordered 29 IDs."""
        frozen_findings = []
        _, registry = phase1_truth_verifier._verify_frozen_inputs(
            REPO_ROOT,
            TRACK_ROOT,
            frozen_findings,
        )

        accepted = phase1_truth_verifier._accepted_game_ids(
            REPO_ROOT,
            registry,
        )

        self.assertEqual(frozen_findings, [])
        self.assertEqual(accepted, set(phase1_truth_verifier.EXPECTED_GAME_IDS))
        self.assertEqual(len(accepted), 29)
        self.assertEqual(
            phase1_truth_verifier.EXPECTED_GAME_IDS_SHA256,
            "84c9b442ac27cdd8bb9e895d5bf7c9874beecdf22674f766f612ee26c54f71a5",
        )

    def test_castle_requires_explicit_unknown_omission(self) -> None:
        """Castle Defense must not gain a fabricated scene/state record."""
        frozen_findings = []
        _, registry = phase1_truth_verifier._verify_frozen_inputs(
            REPO_ROOT,
            TRACK_ROOT,
            frozen_findings,
        )
        bundle, games = phase1_truth_verifier._canonical_fixture_bundle(
            REPO_ROOT, registry
        )
        denominator = bundle[phase1_truth_verifier.MAPPER_OUTPUT_PATHS[0]][
            "denominator"
        ]

        self.assertEqual(
            denominator["explicit_omissions"],
            [phase1_truth_verifier.CASTLE_OMISSION],
        )
        self.assertNotIn("required_game_scene_states", denominator)
        self.assertNotIn(
            "castle-defense",
            {
                record["game_id"]
                for path in phase1_truth_verifier.MAPPER_OUTPUT_PATHS[1:3]
                for record in bundle[path]["records"]
            },
        )
        denominator["explicit_omissions"] = []
        phase1_truth_verifier._refresh_fixture_receipt(bundle)
        findings, _ = phase1_truth_verifier._verify_bundle(
            REPO_ROOT,
            registry,
            bundle,
            games,
        )
        self.assertEqual({item.code for item in findings}, {"DENOMINATOR_MISMATCH"})

    def test_relocation_policy_is_same_track_and_suffix_exact(self) -> None:
        """Only the exact tracks-to-archive path transform is allowed."""
        verifier = phase1_truth_verifier._same_track_relocation

        self.assertTrue(verifier("measure/tracks/t/a.json", "measure/tracks/t/a.json"))
        self.assertTrue(verifier("measure/tracks/t/a.json", "measure/archive/t/a.json"))
        self.assertFalse(
            verifier("measure/tracks/t/a.json", "measure/archive/u/a.json")
        )
        self.assertFalse(
            verifier("measure/tracks/t/a.json", "measure/archive/t/b.json")
        )

    def test_wrong_binding_kind_fails_closed(self) -> None:
        """A chain without an explicit accepted-root hop is unsupported."""
        frozen_findings = []
        _, registry = phase1_truth_verifier._verify_frozen_inputs(
            REPO_ROOT,
            TRACK_ROOT,
            frozen_findings,
        )
        bundle, games = phase1_truth_verifier._canonical_fixture_bundle(
            REPO_ROOT, registry
        )
        claim = bundle[phase1_truth_verifier.MAPPER_OUTPUT_PATHS[0]]["upstream_claims"][
            0
        ]
        claim["resolution_chain"][0]["binding_kind"] = "recursive-search"
        phase1_truth_verifier._refresh_fixture_receipt(bundle)

        findings, _ = phase1_truth_verifier._verify_bundle(
            REPO_ROOT,
            registry,
            bundle,
            games,
        )

        self.assertEqual(
            {finding.code for finding in findings},
            {"UNSUPPORTED_INFERRED_FACT"},
        )

    def test_manifest_bindings_match_accepted_phase0(self) -> None:
        """Fixture bindings must name the exact accepted Phase 0 inputs."""
        manifest = json.loads(
            (TRACK_ROOT / phase1_truth_verifier.FIXTURE_MANIFEST_PATH).read_text()
        )

        self.assertEqual(
            manifest["bindings"]["phase0_root_acceptance"]["sha256"],
            phase1_truth_verifier.ROOT_ACCEPTANCE_SHA256,
        )
        self.assertEqual(
            manifest["bindings"]["phase0_input_freeze"]["sha256"],
            phase1_truth_verifier.INPUT_FREEZE_SHA256,
        )
        self.assertEqual(
            manifest["bindings"]["phase1_role_dispatch"]["sha256"],
            phase1_truth_verifier.ROLE_DISPATCH_SHA256,
        )


if __name__ == "__main__":
    unittest.main()
