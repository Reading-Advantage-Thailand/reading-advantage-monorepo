#!/usr/bin/env python3
"""Contract tests for the decision-free Phase 4 join scaffold."""

import copy
import unittest

import generate_phase4_join_scaffold as subject


class GeneratePhase4JoinScaffoldTest(unittest.TestCase):
    """Proves the scaffold preserves every frozen grain without decisions."""

    @classmethod
    def setUpClass(cls) -> None:
        """Render and validate the frozen scaffold once for mutation tests."""
        cls.document = subject.render_scaffold()
        subject.validate_scaffold(cls.document)

    def test_reconciles_all_frozen_denominators(self) -> None:
        """The scaffold contains every candidate, caller, and normalized usage."""
        document = self.document
        self.assertEqual(
            document["counts"],
            {
                "candidate_paths": 428,
                "identical_hash_groups": 227,
                "caller_locators": 533,
                "scene_usage_records": 65,
                "catalog_or_non_scene_usage_records": 22,
                "accepted_normalized_candidate_path_joins": 85,
                "separate_catalog_locator_records": 7,
                "catalog_locator_candidate_join_overlap_usage_ids": 3,
                "priority1_evidence_paths": 14,
                "priority1_join_overlap": 0,
                "responsive_assessment_cells": 260,
                "additive_92_path_claim": False,
            },
        )
        self.assertEqual(len(document["candidate_records"]), 428)
        self.assertEqual(len(document["scene_usage_records"]), 65)
        self.assertEqual(len(document["catalog_or_non_scene_usage_records"]), 22)
        self.assertEqual(len(document["catalog_locator_records"]), 7)
        joined_usage_ids = {
            usage["usage_id"]
            for usage in document["catalog_or_non_scene_usage_records"]
            if usage["join_status"] == "accepted_exact_normalized_join"
        }
        catalog_usage_ids = {
            record["accepted_evidence_envelope"]["usage_id"]
            for record in document["catalog_locator_records"]
        }
        self.assertEqual(len(joined_usage_ids & catalog_usage_ids), 3)

    def test_every_caller_locator_occurs_exactly_once(self) -> None:
        """All 533 Phase 1 caller locators remain owned by one candidate path."""
        locator_ids = [
            locator["locator_id"]
            for record in self.document["candidate_records"]
            for locator in record["caller_locators"]
        ]
        self.assertEqual(len(locator_ids), 533)
        self.assertEqual(len(set(locator_ids)), 533)

    def test_preserves_path_specific_caller_resolution(self) -> None:
        """Static and dynamic caller states survive alongside exact locators."""
        statuses = {
            record["static_reference_status"]
            for record in self.document["candidate_records"]
        }
        self.assertEqual(statuses, {"found", "dynamic_unresolved"})
        for record in self.document["candidate_records"]:
            if record["static_reference_status"] == "dynamic_unresolved":
                self.assertTrue(record["dynamic_risk"])
                self.assertEqual(record["caller_locators"], [])
                self.assertIsNotNone(record["unknown_rationale"])

    def test_duplicate_groups_keep_path_specific_records(self) -> None:
        """Identical bytes share group facts without collapsing candidate paths."""
        records = self.document["candidate_records"]
        groups: dict[str, list[str]] = {}
        for record in records:
            groups.setdefault(record["identical_hash_group"], []).append(
                record["canonical_path"]
            )
        self.assertEqual(len(groups), 227)
        for record in records:
            expected_peers = sorted(
                path
                for path in groups[record["identical_hash_group"]]
                if path != record["canonical_path"]
            )
            self.assertEqual(record["duplicate_path_peers"], expected_peers)

    def test_scene_usages_have_four_blocked_assessment_cells(self) -> None:
        """Every accepted scene usage has the required viewport/theme matrix."""
        expected_pairs = {
            ("compact", "cute_chibi_v1"),
            ("compact", "heroic_stylized_v1"),
            ("wide", "cute_chibi_v1"),
            ("wide", "heroic_stylized_v1"),
        }
        for usage in self.document["scene_usage_records"]:
            cells = usage["responsive_assessment_cells"]
            self.assertEqual(
                {(cell["viewport"], cell["theme"]) for cell in cells},
                expected_pairs,
            )
            self.assertTrue(
                all(
                    cell["status"] == "blocked_unknown"
                    and cell["evidence"] is None
                    and cell["assessment"] is None
                    for cell in cells
                )
            )
        self.assertTrue(
            all(
                usage["responsive_assessment_cells"] == []
                for usage in self.document["catalog_or_non_scene_usage_records"]
            )
        )

    def test_scaffold_contains_no_suitability_or_disposition_decision(self) -> None:
        """No generated candidate pre-decides Phase 4 or T9-owned outcomes."""
        for record in self.document["candidate_records"]:
            self.assertEqual(
                record["disposition"],
                {
                    "status": "unassigned",
                    "value": None,
                    "replacement_action": None,
                },
            )
            self.assertEqual(
                record["canonical_standard_pack_candidate_key"],
                {"status": "forbidden-pending-T9", "value": None},
            )
            self.assertFalse(record["direct_legacy_adoption"])

    def test_priority1_evidence_is_exact_and_disjoint_from_usage_joins(self) -> None:
        """The 14 direct-evidence paths are routed without assigning rejection."""
        priority1 = {
            record["canonical_path"]
            for record in self.document["candidate_records"]
            if record["priority1_evidence"]["applies"]
        }
        joined = {
            record["canonical_path"]
            for record in self.document["candidate_records"]
            if record["join_status"] == "accepted_exact_normalized_join"
        }
        self.assertEqual(len(priority1), 14)
        self.assertFalse(priority1 & joined)
        self.assertTrue(
            all(
                record["disposition"]["value"] is None
                for record in self.document["candidate_records"]
                if record["priority1_evidence"]["applies"]
            )
        )

    def test_rejects_duplicate_candidate_path_even_when_count_is_428(self) -> None:
        """Candidate-path uniqueness cannot be hidden behind the total count."""
        mutated = copy.deepcopy(self.document)
        mutated["candidate_records"][-1] = copy.deepcopy(
            mutated["candidate_records"][0]
        )
        with self.assertRaisesRegex(AssertionError, "candidate path denominator"):
            subject.validate_scaffold(mutated)

    def test_rejects_duplicate_caller_locator(self) -> None:
        """A caller locator cannot be omitted and replaced by a duplicate."""
        mutated = copy.deepcopy(self.document)
        located = [
            locator
            for record in mutated["candidate_records"]
            for locator in record["caller_locators"]
        ]
        located[-1]["locator_id"] = located[0]["locator_id"]
        with self.assertRaisesRegex(AssertionError, "caller locator denominator"):
            subject.validate_scaffold(mutated)

    def test_rejects_collapsed_duplicate_peer_contract(self) -> None:
        """Every duplicate group retains path-specific peer accountability."""
        mutated = copy.deepcopy(self.document)
        record = next(
            item for item in mutated["candidate_records"] if item["duplicate_path_peers"]
        )
        record["duplicate_path_peers"] = []
        with self.assertRaisesRegex(AssertionError, "duplicate peer contract"):
            subject.validate_scaffold(mutated)

    def test_rejects_missing_scene_assessment_cell(self) -> None:
        """A scene usage cannot lose one viewport/theme assessment cell."""
        mutated = copy.deepcopy(self.document)
        mutated["scene_usage_records"][0]["responsive_assessment_cells"].pop()
        with self.assertRaisesRegex(AssertionError, "responsive assessment matrix"):
            subject.validate_scaffold(mutated)

    def test_rejects_decisions_and_direct_legacy_adoption(self) -> None:
        """The scaffold fails closed on premature Phase 4 or T9 decisions."""
        mutated = copy.deepcopy(self.document)
        mutated["candidate_records"][0]["disposition"]["value"] = "reuse"
        with self.assertRaisesRegex(AssertionError, "decision-free disposition"):
            subject.validate_scaffold(mutated)

        mutated = copy.deepcopy(self.document)
        mutated["candidate_records"][0]["direct_legacy_adoption"] = True
        with self.assertRaisesRegex(AssertionError, "direct legacy adoption"):
            subject.validate_scaffold(mutated)

    def test_rejects_catalog_records_promoted_to_candidate_paths(self) -> None:
        """The seven catalog locators cannot create a false 92-path count."""
        mutated = copy.deepcopy(self.document)
        catalog = mutated["catalog_locator_records"][0]
        catalog["candidate_paths"] = [
            mutated["candidate_records"][0]["canonical_path"]
        ]
        with self.assertRaisesRegex(AssertionError, "catalog locator grain"):
            subject.validate_scaffold(mutated)


if __name__ == "__main__":
    unittest.main()
