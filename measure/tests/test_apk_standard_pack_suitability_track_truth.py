"""Keeps the suitability track blocked until a lawful real-asset admission exists."""

from __future__ import annotations

import json
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ID = "apk_standard_pack_suitability_ingestion_20260728"
TRACK_ROOT = REPO_ROOT / "measure/tracks" / TRACK_ID
PLAN_PATH = TRACK_ROOT / "plan.md"
METADATA_PATH = TRACK_ROOT / "metadata.json"
REGISTRY_PATH = REPO_ROOT / "measure/tracks.md"
CURRENT_ACCEPTANCE_PATH = TRACK_ROOT / "product-owner-acceptance-v2.json"


def _load_object(path: Path) -> dict[str, Any]:
    """Loads one repository-local JSON object.

    Args:
        path: JSON file to load.

    Returns:
        Parsed JSON object.

    Raises:
        AssertionError: If the JSON root is not an object.
    """
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain a JSON object")
    return value


class StandardPackSuitabilityTrackTruthTests(unittest.TestCase):
    """Prevents synthetic governance from closing the real-asset ingestion track."""

    def test_plan_has_a_blocked_real_asset_admission_phase(self) -> None:
        """Requires an explicit external gate for the unfinished real-asset path."""
        plan = PLAN_PATH.read_text(encoding="utf-8")
        normalized_plan = " ".join(plan.split())

        self.assertIn(
            "## Phase 7: External real-asset admission and full-track closeout (blocked)",
            plan,
        )
        self.assertIn("- [b] Obtain a concrete real asset and lawful source packet", normalized_plan)
        self.assertIn("provenance, license, credit", normalized_plan)
        self.assertIn("concrete-title behavior-suitability review", normalized_plan)
        self.assertIn("- [b] Perform the real additive ingestion", normalized_plan)
        self.assertIn("independent review and explicit owner acceptance", normalized_plan)

    def test_blocked_phase_names_the_full_real_admission_evidence_gate(self) -> None:
        """Requires every deferred real-admission criterion from the track contract."""
        plan = PLAN_PATH.read_text(encoding="utf-8")
        phase_seven = plan.partition(
            "## Phase 7: External real-asset admission and full-track closeout (blocked)"
        )[2].partition("## Completion rule")[0]
        normalized_phase_seven = " ".join(phase_seven.split())
        required_phase_evidence = (
            "trusted atomic durable successor-registry adapter at the owning boundary",
            "before real successor admission",
            "discoverable by semantic key and descriptor through a hash-pinned "
            "additive release/receipt",
            "restart/rehydration and duplicate-protection proof",
            "record a concrete candidate comparison that rejects a visually similar "
            "but behaviorally incompatible candidate",
            "focused tests/package checks",
            "fresh independent review",
        )

        for required_text in required_phase_evidence:
            with self.subTest(required_text=required_text):
                self.assertIn(required_text, normalized_phase_seven)

    def test_completion_rule_limits_a_future_ingestion_acceptance(self) -> None:
        """Limits future acceptance to one reviewed release without broader authority."""
        plan = PLAN_PATH.read_text(encoding="utf-8")
        completion_rule = plan.partition("## Completion rule")[2]
        normalized_completion_rule = " ".join(completion_rule.split())

        required_completion_boundaries = (
            "only that canonical evidence/release",
            "not title adoption, production exposure, catalog deployment, migration, "
            "host cutover, retirement, or broader cohort use",
        )

        for required_text in required_completion_boundaries:
            with self.subTest(required_text=required_text):
                self.assertIn(required_text, normalized_completion_rule)

    def test_plan_registry_and_metadata_all_expose_the_blocked_state(self) -> None:
        """Requires every track status surface to reject premature completion."""
        metadata = _load_object(METADATA_PATH)
        registry = REGISTRY_PATH.read_text(encoding="utf-8")

        self.assertEqual(metadata["status"], "blocked")
        self.assertIn(
            "- [b] **Track: APK Standard-Pack Suitability and Canonical Ingestion**",
            registry,
        )
        self.assertNotIn(
            "- [x] **Track: APK Standard-Pack Suitability and Canonical Ingestion**",
            registry,
        )

    def test_current_evidence_keeps_real_ingestion_and_production_authority_false(self) -> None:
        """Rejects authority escalation before the blocked phase is independently accepted."""
        metadata = _load_object(METADATA_PATH)
        acceptance = _load_object(CURRENT_ACCEPTANCE_PATH)

        self.assertFalse(metadata["downstream_consumption"]["real_asset_ingestion_authorized"])
        self.assertFalse(metadata["downstream_consumption"]["production_exposure_authorized"])
        self.assertFalse(metadata["downstream_consumption"]["deployment_authorized"])
        self.assertFalse(acceptance["authorization"]["ingestionAuthorized"])
        self.assertFalse(acceptance["authorization"]["titleAdoptionAuthorized"])
        self.assertFalse(acceptance["authorization"]["migrationAuthorized"])
        self.assertFalse(acceptance["authorization"]["cutoverAuthorized"])
        self.assertFalse(acceptance["authorization"]["retirementAuthorized"])
        self.assertFalse(acceptance["authorization"]["deploymentAuthorized"])


if __name__ == "__main__":
    unittest.main()
