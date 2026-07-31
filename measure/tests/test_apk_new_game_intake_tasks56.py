"""Guards the planned-game intake handoff and its accepted foundation boundary."""

from __future__ import annotations

import hashlib
import json
import re
import unittest
import unicodedata
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ID = "apk_new_game_intake_20260727"
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / TRACK_ID
TEMPLATE_PATH = TRACK_DIR / "handoff-template-v1.json"
VALIDATION_PATH = TRACK_DIR / "crosswalk-validation-v1.json"
METADATA_PATH = TRACK_DIR / "metadata.json"
PLAN_PATH = TRACK_DIR / "plan.md"
CROSSWALK_PATH = (
    REPO_ROOT
    / "measure"
    / "archive"
    / "apk_denominator_readiness_t11_integrity_20260727"
    / "phase1-denominator-crosswalk.json"
)
READINESS_PATH = (
    REPO_ROOT
    / "measure"
    / "archive"
    / "apk_denominator_readiness_t11_integrity_20260727"
    / "accepted-readiness-receipt-v1.json"
)
CONTRACT_PATH = REPO_ROOT / "packages" / "backend" / "src" / "modules" / "planned-game-intake" / "contracts.ts"
SHA256 = re.compile(r"^[0-9a-f]{64}$")


def _load(path: Path) -> dict[str, Any]:
    """Loads one required JSON object from the repository."""
    if not path.is_file():
        raise AssertionError(f"MISSING_ARTIFACT: {path.relative_to(REPO_ROOT)}")
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"INVALID_ARTIFACT: {path.relative_to(REPO_ROOT)}")
    return value


def _sha256(path: Path) -> str:
    """Returns the SHA-256 digest of one repository artifact."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _normalize_identity_key(title: str) -> str:
    """Matches the backend intake normalization for crosswalk labels."""
    normalized = unicodedata.normalize("NFKD", title)
    normalized = "".join(character for character in normalized if not unicodedata.combining(character))
    normalized = normalized.lower().replace("'", "").replace("’", "")
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized)
    return normalized.strip("-")


def _crosswalk_aliases(crosswalk: dict[str, Any]) -> list[str]:
    """Derives canonical, articleless, historical, and source aliases."""
    assignments = crosswalk["assignments"]
    canonical = [
        _normalize_identity_key(row["canonical_identity_label"].split(" — ", 1)[0])
        for row in assignments
    ]
    articleless = [key.removeprefix("the-") for key in canonical if key.startswith("the-")]
    historical = [
        "sentence-" + row["source_locator"]["evidence_path"].split("/")[-2]
        for row in assignments
        if row["classification"] == "historical_label"
    ]
    source = [
        row["source_identity_id"].replace("/", "-")
        for row in assignments
        if row["classification"] == "source_identity"
    ]
    return canonical + articleless + historical + source


def _contract_array(contract_source: str, name: str) -> list[str]:
    """Extracts one literal string array from the backend contract source."""
    match = re.search(
        rf"const {name} = \[(?P<body>.*?)\] as const;",
        contract_source,
        flags=re.DOTALL,
    )
    if match is None:
        raise AssertionError(f"MISSING_CONTRACT_ARRAY: {name}")
    return re.findall(r'"([^"\\]*(?:\\.[^"\\]*)*)"', match.group("body"))


class NewGameIntakeTasks56Tests(unittest.TestCase):
    """Ensures the published handoff remains planning-only and crosswalk-bound."""

    def test_template_is_explicitly_non_authorizing(self) -> None:
        """Requires every operational authority bit and claim to remain false."""
        template = _load(TEMPLATE_PATH)
        self.assertEqual(template["schema_version"], "apk-planned-game-intake-child-track-handoff.v1")
        self.assertEqual(template["track_id"], TRACK_ID)
        self.assertEqual(template["status"], "template-only")
        statement = template["non_authorization"]["statement"].lower()
        for forbidden_authority in (
            "implementation",
            "route",
            "cartridge",
            "catalog",
            "semantic mapping",
            "asset adoption",
            "ingestion",
            "title adoption",
            "migration",
            "cutover",
            "retirement",
            "deployment",
            "git publication",
        ):
            self.assertIn(forbidden_authority, statement)
        self.assertIn("does not authorize", statement)
        authority = template["child_track_proposal"]["authority"]
        self.assertIs(template["non_authorization"]["operational_authority"], False)
        self.assertTrue(authority)
        self.assertTrue(all(value is False for value in authority.values()))
        self.assertIs(template["child_track_proposal"]["legacyDenominatorMembership"], False)

    def test_template_binds_the_owner_accepted_27_to_29_crosswalk(self) -> None:
        """Requires the template to bind the active accepted crosswalk and receipt bytes."""
        template = _load(TEMPLATE_PATH)
        crosswalk = _load(CROSSWALK_PATH)
        readiness = _load(READINESS_PATH)
        binding = template["foundation_crosswalk"]
        self.assertEqual(binding["crosswalk"]["path"], CROSSWALK_PATH.relative_to(REPO_ROOT).as_posix())
        self.assertEqual(binding["crosswalk"]["sha256"], _sha256(CROSSWALK_PATH))
        self.assertEqual(binding["readiness_receipt"]["path"], READINESS_PATH.relative_to(REPO_ROOT).as_posix())
        self.assertEqual(binding["readiness_receipt"]["sha256"], _sha256(READINESS_PATH))
        self.assertEqual(readiness["status"], "accepted")
        self.assertEqual(readiness["revocation_state"], "active")
        self.assertTrue(readiness["crosswalk_governance"]["consumable_for_child_planning"])
        self.assertEqual(readiness["crosswalk_governance"]["source_identity_count"], 27)
        self.assertEqual(readiness["crosswalk_governance"]["partition_assignment_count"], 29)
        self.assertEqual(crosswalk["counts"]["source_identities"], 27)
        self.assertEqual(crosswalk["counts"]["partition_assignments"], 29)
        self.assertEqual(crosswalk["governance"]["downstream_authorization"], "blocked")

    def test_crosswalk_aliases_match_the_backend_legacy_boundary(self) -> None:
        """Requires all 61 crosswalk-derived identities and aliases in the backend guard."""
        crosswalk = _load(CROSSWALK_PATH)
        contract_source = CONTRACT_PATH.read_text(encoding="utf-8")
        expected = _crosswalk_aliases(crosswalk)
        actual = (
            _contract_array(contract_source, "acceptedFoundationNormalizedTitleKeys")
            + _contract_array(contract_source, "articleAndHistoricalLegacyAliasKeys")
            + _contract_array(contract_source, "sourceIdentityLegacyAliasKeys")
        )
        self.assertEqual(len(expected), 61)
        self.assertEqual(len(set(expected)), 61)
        self.assertEqual(actual, expected)

    def test_validation_receipt_records_the_fail_closed_alias_gate(self) -> None:
        """Requires the validation receipt to state the complete non-authorizing boundary."""
        validation = _load(VALIDATION_PATH)
        template = _load(TEMPLATE_PATH)
        self.assertEqual(validation["schema_version"], "apk-planned-game-intake-crosswalk-validation.v1")
        self.assertEqual(validation["status"], "validated")
        self.assertEqual(validation["template"]["sha256"], _sha256(TEMPLATE_PATH))
        self.assertEqual(validation["template"]["path"], TEMPLATE_PATH.relative_to(REPO_ROOT).as_posix())
        gate = validation["legacy_identity_gate"]
        self.assertEqual(gate["reserved_alias_count"], 61)
        self.assertEqual(gate["categories"], {
            "canonical_title_keys": 29,
            "articleless_title_aliases": 3,
            "historical_source_aliases": 2,
            "source_identity_aliases": 27,
        })
        self.assertTrue(gate["reject_before_child_track_proposal"])
        self.assertEqual(gate["backend_contract_export"], "legacyDenominatorIdentityKeys")
        self.assertIs(template["identity_gate"]["legacyDenominatorMembership"], False)

    def test_handoff_contains_no_implementation_surface(self) -> None:
        """Rejects routes, cartridges, catalog entries, assets, and semantic mappings in the template."""
        template = _load(TEMPLATE_PATH)
        serialized = json.dumps(template).lower()
        for forbidden_field in (
            '"route":',
            '"cartridge":',
            '"catalog_entry":',
            '"selected_asset":',
            '"semantic_mapping":',
            '"source_path":',
        ):
            self.assertNotIn(forbidden_field, serialized)

    def test_plan_and_metadata_report_completion_without_accepting_future_intake(self) -> None:
        """Requires Tasks 5-6 to be complete while future-game authorization remains absent."""
        metadata = _load(METADATA_PATH)
        self.assertEqual(metadata["status"], "complete")
        self.assertEqual(metadata["actual_tasks"], 6)
        self.assertEqual(metadata["handoff_template"]["path"], TEMPLATE_PATH.relative_to(REPO_ROOT).as_posix())
        self.assertEqual(metadata["handoff_template"]["sha256"], _sha256(TEMPLATE_PATH))
        self.assertEqual(metadata["crosswalk_validation"]["path"], VALIDATION_PATH.relative_to(REPO_ROOT).as_posix())
        self.assertEqual(metadata["crosswalk_validation"]["sha256"], _sha256(VALIDATION_PATH))
        self.assertEqual(metadata["validation"]["source_identity_count"], 27)
        self.assertEqual(metadata["validation"]["partition_assignment_count"], 29)
        self.assertEqual(metadata["validation"]["reserved_legacy_alias_count"], 61)
        self.assertTrue(metadata["validation"]["legacy_aliases_rejected_before_child_track_proposal"])
        self.assertFalse(metadata["validation"]["operational_authority_granted"])
        self.assertFalse(metadata["validation"]["future_intake_accepted"])

        plan_lines = PLAN_PATH.read_text(encoding="utf-8").splitlines()
        self.assertTrue(plan_lines[6].startswith("- [x] Publish the accepted intake-to-child-track handoff template"))
        self.assertTrue(plan_lines[7].startswith("- [x] Validate the template against the foundation crosswalk"))


if __name__ == "__main__":
    unittest.main()
