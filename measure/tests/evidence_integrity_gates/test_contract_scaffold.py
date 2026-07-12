#!/usr/bin/env python3
"""Phase 0 contract-scaffold tests for the APK evidence integrity gates.

Targeted Red command (from test-strategy.md §'Phase 0 — freeze contracts
and counterexample corpus'):

    PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v \\
        measure.tests.evidence_integrity_gates.test_contract_scaffold

These tests assert:

1. Every failure attempt (1–5) is represented by a named invalid
   fixture with an expected rejection code and a paired valid control
   fixture. Anti-pattern A4 defense: zero valid OR zero negative cases
   is a failure, not a vacuous pass.

2. The contract scaffold (``measure.evidence_integrity_gates.contracts``)
   exposes the frozen Phase 0 surface: ``SCHEMA_VERSION``,
   ``REJECTION_CODES``, ``FROZEN_ATTEMPTS``, ``ATTEMPT_REJECTION_BINDINGS``,
   ``parse_labeled_budget``, ``validate_envelope``,
   ``validate_fixture_manifest``, ``validate_dependency_field``,
   ``validate_plan_marker``, ``rejection_code_for``, and
   ``collect_catalog_guard_references``.

3. ``parse_labeled_budget`` parses labeled integer-plus-unit payloads
   and returns ``{"value": int, "unit": str, "label": str}``.
   Anti-pattern A3 defense: a date, an unrelated digit, or a missing
   unit MUST fail. The literal value ``"unmeasured"`` MUST fail closed.

4. ``validate_dependency_field`` accepts the canonical ``depends_on``
   field and rejects the legacy ``dependencies`` alias.

5. ``validate_plan_marker`` accepts ``[~]``, ``[x]``, ``[b]`` and rejects
   the legacy ``[ ]`` (space) marker with ``INVALID_MARKER``.

6. The A12 defense extracts and resolves every ``tests/<name>.sh``
   reference in ``measure/anti-patterns.md``. The gate-specific
   deliverable is the extraction/resolution mechanism (it must find
   references, classify each, and resolve at least one positive
   control). The gate does NOT claim repository-wide catalog integrity
   while unrelated, pre-existing references remain dangling: the
   concrete A12 debt is detected and recorded as a debt snapshot rather
   than asserted away (truthful A12 handling per the Green-phase
   directive). No guard files are fabricated.

7. Fixture status MUST be ``"candidate"``; ``"accepted"`` is rejected
   with ``ACCEPTED_STATUS_NOT_ALLOWED`` (anti-patterns A5/A6).

8. The fixture manifest declares the baseline gate commit
   (``f61eb643f138373c6357ec35e6ac296a7014800c``) and the gate-edit
   prohibition. Without the baseline SHA, input changes cannot be
   detected and candidate outputs cannot be revoked.

RED expectation: the intended behavioral tests fail at HEAD while
fixture-shape and metadata-completeness tests may pass. Behavioral
tests (parse_labeled_budget, validate_envelope, validate_fixture_manifest,
validate_dependency_field, validate_plan_marker) raise NotImplementedError
because the validator BODIES are Green-phase work; the SIGNATURES and
REJECTION_CODES are the Phase 0 contract freeze. The Green phase must
make every behavioral test pass without weakening the contract; any
fixture-shape test that fails at HEAD indicates a missing Phase 0
deliverable, not a Green-phase validator bug.

GREEN A12 revision: the original Red test_081 asserted that every
catalog guard reference resolves (``missing == []``). That assertion
would falsely claim repository-wide catalog integrity while seven
unrelated, pre-existing references remain dangling - exactly the
over-claim A12 forbids. The Green-phase revision splits the check into
a gate-specific mechanism test (extraction + resolution + positive
control) and a concrete-A12-debt snapshot test that records the known
dangling references and acts as a regression guard. The detection is
preserved (no A7-style filter silences real hits); only the false
universal claim is removed.
"""

from __future__ import annotations

import json
import re
import unittest
from pathlib import Path
from typing import Any, Iterable

from measure.evidence_integrity_gates import contracts


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_HERE = Path(__file__).resolve().parent
# _HERE = measure/tests/evidence_integrity_gates/
# parents[0] = measure/tests/
# parents[1] = measure/
# parents[2] = repo root
REPO_ROOT = _HERE.parents[2]
FIXTURE_DIR = _HERE / "fixtures"
MANIFEST_PATH = FIXTURE_DIR / "manifest.json"
VALID_DIR = FIXTURE_DIR / "valid"
INVALID_DIR = FIXTURE_DIR / "invalid"
ATTEMPTS_DIR = FIXTURE_DIR / "attempts"

BASELINE_GATE_COMMIT = "f61eb643f138373c6357ec35e6ac296a7014800c"
BASELINE_GATE_SHORT_SHA = "f61eb643"

# Frozen attempts 1-5 (must match contracts.FROZEN_ATTEMPTS).
EXPECTED_ATTEMPTS = (
    "attempt_01_synthetic_main_scene",
    "attempt_02_directory_citation",
    "attempt_03_hardcoded_summary",
    "attempt_04_keyword_responsive",
    "attempt_05_slug_asset_allowlist",
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _list_frozen_attempts(manifest: dict[str, Any]) -> list[str]:
    return list(manifest.get("frozen_attempts", {}).keys())


# ---------------------------------------------------------------------------
# Test classes
# ---------------------------------------------------------------------------


class FrozenAttemptsScaffoldTests(unittest.TestCase):
    """The first Phase 0 test: every frozen attempt has a named invalid
    fixture, expected rejection code, and a paired valid control.
    Falsified by an unrepresented attempt, an unparseable labeled budget,
    or an empty control corpus (per test-strategy.md Phase 0 closeout)."""

    maxDiff = None

    def test_001_attempts_module_exposes_required_constants(self) -> None:
        for name in (
            "SCHEMA_VERSION",
            "GATE_VERSION",
            "REJECTION_CODES",
            "FROZEN_ATTEMPTS",
            "ATTEMPT_REJECTION_BINDINGS",
            "ACCEPTED_PLAN_MARKERS",
            "CANONICAL_DEPENDENCY_FIELD",
        ):
            self.assertTrue(
                hasattr(contracts, name),
                f"contracts module must expose {name} (Phase 0 freeze).",
            )

    def test_002_frozen_attempts_match_attempts_1_through_5(self) -> None:
        self.assertEqual(
            tuple(contracts.FROZEN_ATTEMPTS),
            EXPECTED_ATTEMPTS,
            "FROZEN_ATTEMPTS must be attempts 1-5 in order.",
        )

    def test_003_attempt_rejection_bindings_cover_every_attempt(self) -> None:
        for attempt in EXPECTED_ATTEMPTS:
            self.assertIn(
                attempt,
                contracts.ATTEMPT_REJECTION_BINDINGS,
                f"{attempt} must have a stable rejection-code binding.",
            )
            code = contracts.ATTEMPT_REJECTION_BINDINGS[attempt]
            self.assertIn(
                code,
                contracts.REJECTION_CODES,
                f"{attempt} binds to {code} which is not in REJECTION_CODES.",
            )

    def test_004_manifest_exists(self) -> None:
        self.assertTrue(
            MANIFEST_PATH.is_file(),
            f"Phase 0 fixture manifest must exist at {MANIFEST_PATH}.",
        )

    def test_005_manifest_freezes_every_attempt(self) -> None:
        manifest = _read_json(MANIFEST_PATH)
        frozen = _list_frozen_attempts(manifest)
        self.assertEqual(
            tuple(frozen),
            EXPECTED_ATTEMPTS,
            "manifest.frozen_attempts must cover attempts 1-5 in order.",
        )

    def test_006_every_attempt_has_named_invalid_fixture(self) -> None:
        manifest = _read_json(MANIFEST_PATH)
        for attempt, entry in manifest["frozen_attempts"].items():
            rel = entry["invalid_fixture_path"]
            self.assertTrue(
                (FIXTURE_DIR / rel).is_file(),
                f"{attempt} invalid fixture missing: {rel}",
            )

    def test_007_every_attempt_has_expected_rejection_code(self) -> None:
        manifest = _read_json(MANIFEST_PATH)
        for attempt, entry in manifest["frozen_attempts"].items():
            code = entry.get("expected_rejection_code")
            self.assertIsNotNone(
                code,
                f"{attempt} manifest entry must carry expected_rejection_code.",
            )
            self.assertIn(
                code,
                contracts.REJECTION_CODES,
                f"{attempt} expected_rejection_code {code!r} not in REJECTION_CODES.",
            )
            # Each attempt must be self-consistent: the binding in the
            # manifest must match the module-level binding.
            self.assertEqual(
                code,
                contracts.ATTEMPT_REJECTION_BINDINGS[attempt],
                f"{attempt} manifest binding disagrees with contracts.ATTEMPT_REJECTION_BINDINGS.",
            )

    def test_008_every_attempt_has_paired_valid_control(self) -> None:
        manifest = _read_json(MANIFEST_PATH)
        for attempt, entry in manifest["frozen_attempts"].items():
            rel = entry["paired_valid_control"]
            self.assertTrue(
                (FIXTURE_DIR / rel).is_file(),
                f"{attempt} paired valid control missing: {rel}",
            )

    def test_009_valid_corpus_is_non_empty(self) -> None:
        # Anti-pattern A4 defense: an empty control corpus cannot pass.
        self.assertTrue(
            VALID_DIR.is_dir(),
            f"valid control corpus directory must exist: {VALID_DIR}",
        )
        valid_files = sorted(p for p in VALID_DIR.glob("*.json"))
        self.assertGreater(
            len(valid_files),
            0,
            "valid control corpus must be non-empty (A4 vacuous-pass defense).",
        )

    def test_010_negative_corpus_is_non_empty(self) -> None:
        # Anti-pattern A4 defense: an empty negative corpus cannot pass.
        self.assertTrue(
            INVALID_DIR.is_dir(),
            f"invalid control corpus directory must exist: {INVALID_DIR}",
        )
        invalid_files = sorted(p for p in INVALID_DIR.glob("*.json"))
        self.assertGreater(
            len(invalid_files),
            0,
            "invalid control corpus must be non-empty (A4 vacuous-pass defense).",
        )

    def test_011_attempts_corpus_is_complete(self) -> None:
        attempt_files = sorted(p.stem for p in ATTEMPTS_DIR.glob("*.json"))
        self.assertEqual(
            tuple(attempt_files),
            EXPECTED_ATTEMPTS,
            "attempts/ directory must contain exactly the frozen attempts 1-5.",
        )

    def test_012_positive_claim_control_contains_no_apk_product_conclusion(self) -> None:
        control_text = (VALID_DIR / "control_claim.json").read_text(encoding="utf-8")
        self.assertNotIn("apps/advantage-games", control_text)
        for product_id in ("dragon-flight", "rpg-battle", "the-abyssal-well"):
            self.assertNotIn(product_id, control_text)
        self.assertIn("not APK product evidence", control_text)


class BaselineCommitAndGateProhibitionTests(unittest.TestCase):
    """Phase 0 freezes the baseline gate commit and the gate-edit
    prohibition; missing either means input changes cannot be detected
    and candidate outputs cannot be revoked."""

    def test_020_manifest_baseline_commit_is_frozen(self) -> None:
        manifest = _read_json(MANIFEST_PATH)
        self.assertEqual(
            manifest.get("baseline_gate_commit"),
            BASELINE_GATE_COMMIT,
            "manifest.baseline_gate_commit must match the Phase 0 baseline SHA.",
        )
        self.assertEqual(
            manifest.get("baseline_gate_short_sha"),
            BASELINE_GATE_SHORT_SHA,
            "manifest.baseline_gate_short_sha must match the Phase 0 baseline SHA.",
        )

    def test_021_manifest_records_gate_edit_prohibition(self) -> None:
        manifest = _read_json(MANIFEST_PATH)
        prohibition = manifest.get("gate_edit_prohibition", {})
        self.assertTrue(
            prohibition.get("enabled"),
            "gate_edit_prohibition.enabled must be True.",
        )
        self.assertTrue(
            prohibition.get("change_requires_version_bump"),
            "gate_edit_prohibition.change_requires_version_bump must be True.",
        )
        self.assertTrue(
            prohibition.get("change_invalidates_active_candidates"),
            "gate_edit_prohibition.change_invalidates_active_candidates must be True.",
        )
        self.assertIn(
            "measure-mid-red",
            prohibition.get("allowed_editors", []),
            "measure-mid-red must be in the allowed editor list.",
        )

    def test_022_manifest_declares_candidate_output_paths(self) -> None:
        manifest = _read_json(MANIFEST_PATH)
        paths = manifest.get("candidate_output_paths", {})
        for required in ("candidate_manifest", "review_report", "accepted_manifest"):
            self.assertIn(
                required,
                paths,
                f"candidate_output_paths must declare {required}.",
            )

    def test_023_manifest_records_review_gate_version(self) -> None:
        manifest = _read_json(MANIFEST_PATH)
        self.assertEqual(manifest.get("gate_version"), contracts.GATE_VERSION)


class LabeledBudgetTests(unittest.TestCase):
    """Anti-pattern A3 defense: parse labeled integer-plus-unit
    payloads and assert the parsed value. A bare digit, a date, or the
    literal ``unmeasured`` must fail closed."""

    def test_030_parse_labeled_budget_returns_value_unit_label(self) -> None:
        result = contracts.parse_labeled_budget({"tokens": 1000})
        self.assertEqual(
            result.get("value"),
            1000,
            "parse_labeled_budget must extract the integer value (A3).",
        )
        self.assertEqual(
            result.get("unit"),
            "tokens",
            "parse_labeled_budget must extract the unit (A3).",
        )
        self.assertEqual(
            result.get("label"),
            "tokens",
            "parse_labeled_budget must extract the label (A3).",
        )

    def test_031_parse_labeled_budget_control_fixture_round_trips(self) -> None:
        control = _read_json(VALID_DIR / "control_budget.json")
        result = contracts.parse_labeled_budget(control["budget_payload"])
        self.assertEqual(
            result.get("value"),
            control["expected_parse_result"]["value"],
            "control_budget fixture parsed value must match expected_parse_result.value.",
        )
        self.assertEqual(
            result.get("unit"),
            control["expected_parse_result"]["unit"],
            "control_budget fixture parsed unit must match expected_parse_result.unit.",
        )

    def test_032_parse_labeled_budget_rejects_unmeasured_value(self) -> None:
        fixture = _read_json(INVALID_DIR / "invalid_budget_unmeasured.json")
        with self.assertRaises(contracts.BudgetParseError) as ctx:
            contracts.parse_labeled_budget(fixture["budget_payload"])
        self.assertEqual(
            ctx.exception.code,
            contracts.rejection_code_for("unmeasured_budget_not_allowed"),
            "unmeasured budget must raise BudgetParseError(code=UNMEASURED_BUDGET_NOT_ALLOWED).",
        )

    def test_033_parse_labeled_budget_rejects_missing_unit(self) -> None:
        fixture = _read_json(INVALID_DIR / "invalid_budget_missing_unit.json")
        # A bare integer key/value without a unit/label must fail.
        with self.assertRaises(contracts.BudgetParseError) as ctx:
            contracts.parse_labeled_budget(fixture["budget_payload"])
        self.assertIn(
            ctx.exception.code,
            {
                contracts.rejection_code_for("missing_unit"),
                contracts.rejection_code_for("non_numeric_budget_value"),
            },
            "missing-unit budget must raise a BudgetParseError with a labeled-budget code.",
        )

    def test_034_parse_labeled_budget_rejects_non_positive_value(self) -> None:
        for value in (0, -1):
            with self.subTest(value=value), self.assertRaises(contracts.BudgetParseError) as ctx:
                contracts.parse_labeled_budget({"tokens": value})
            self.assertEqual(
                ctx.exception.code,
                contracts.rejection_code_for("invalid_budget_value"),
            )

    def test_035_parse_labeled_budget_rejects_date_as_unit(self) -> None:
        with self.assertRaises(contracts.BudgetParseError) as ctx:
            contracts.parse_labeled_budget({"2026": 7})
        self.assertEqual(ctx.exception.code, contracts.rejection_code_for("missing_unit"))


class DependencyFieldTests(unittest.TestCase):
    """The canonical ``depends_on`` field MUST be accepted; the legacy
    ``dependencies`` alias MUST be rejected."""

    def test_040_canonical_dependency_field_accepted(self) -> None:
        control = _read_json(VALID_DIR / "control_dependency.json")
        result = contracts.validate_dependency_field(control["canonical_payload"])
        self.assertTrue(
            result.get("ok"),
            f"validate_dependency_field must accept the canonical depends_on payload: {result}",
        )

    def test_041_legacy_dependencies_alias_rejected(self) -> None:
        fixture = _read_json(INVALID_DIR / "invalid_dependency_alias.json")
        result = contracts.validate_dependency_field(fixture["payload"])
        self.assertFalse(
            result.get("ok"),
            "validate_dependency_field must reject the legacy 'dependencies' alias.",
        )
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("non_canonical_dependency_field"),
            "legacy alias must produce NON_CANONICAL_DEPENDENCY_FIELD.",
        )


class PlanMarkerTests(unittest.TestCase):
    """Anti-pattern A8 defense: the deprecated ``[ ]`` (space) marker
    must be rejected; only ``[~]``, ``[x]``, ``[b]`` are accepted."""

    def test_050_valid_marker_plan_accepted(self) -> None:
        control = _read_json(VALID_DIR / "control_marker_plan.json")
        for line in control["plan_text"].splitlines():
            if not line.startswith("- "):
                continue
            result = contracts.validate_plan_marker(line)
            self.assertTrue(
                result.get("ok"),
                f"validate_plan_marker must accept the valid control line: {line!r} → {result}",
            )

    def test_051_legacy_space_marker_rejected(self) -> None:
        fixture = _read_json(INVALID_DIR / "invalid_marker_legacy_space.json")
        line = fixture["plan_text"].splitlines()[0]
        result = contracts.validate_plan_marker(line)
        self.assertFalse(
            result.get("ok"),
            "validate_plan_marker must reject the legacy [ ] (space) marker.",
        )
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("invalid_marker"),
            "legacy space marker must produce INVALID_MARKER.",
        )


class StatusTests(unittest.TestCase):
    """Anti-patterns A5/A6 defense: a fixture must carry status
    ``candidate``; ``accepted`` is rejected until the full gate has
    run."""

    def test_060_status_accepted_is_rejected(self) -> None:
        fixture = _read_json(INVALID_DIR / "invalid_status_accepted.json")
        self.assertEqual(
            fixture.get("status"),
            "accepted",
            "sanity: this negative control fixture must declare status='accepted'.",
        )
        result = contracts.validate_envelope(fixture)
        self.assertFalse(
            result.get("ok"),
            "validate_envelope must reject a fixture whose status is 'accepted'.",
        )
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("accepted_status_not_allowed"),
            "status='accepted' on a Phase 0 fixture must produce ACCEPTED_STATUS_NOT_ALLOWED.",
        )


class EnvelopeValidationTests(unittest.TestCase):
    """A valid Phase 0 envelope carries ``schema_version``, ``kind``,
    and at least one contract field; a missing ``baseline_gate_commit``
    MUST be rejected."""

    def test_070_valid_envelope_accepted(self) -> None:
        control = _read_json(VALID_DIR / "control_claim.json")
        result = contracts.validate_envelope(control)
        self.assertTrue(
            result.get("ok"),
            f"validate_envelope must accept the valid control_claim fixture: {result}",
        )

    def test_071_missing_baseline_commit_rejected(self) -> None:
        fixture = _read_json(INVALID_DIR / "invalid_baseline_commit_missing.json")
        result = contracts.validate_envelope(fixture)
        self.assertFalse(
            result.get("ok"),
            "validate_envelope must reject a fixture whose baseline_gate_commit is missing.",
        )
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("baseline_gate_commit_missing"),
            "missing baseline_gate_commit must produce BASELINE_GATE_COMMIT_MISSING.",
        )

    def test_072_missing_schema_and_kind_rejected(self) -> None:
        result = contracts.validate_envelope(
            {"baseline_gate_commit": BASELINE_GATE_COMMIT, "status": "candidate"}
        )
        self.assertFalse(result.get("ok"))
        self.assertEqual(result.get("code"), contracts.rejection_code_for("unknown_schema_version"))

    def test_073_arbitrary_success_status_rejected(self) -> None:
        result = contracts.validate_envelope(
            {
                "baseline_gate_commit": BASELINE_GATE_COMMIT,
                "schema_version": contracts.SCHEMA_VERSION,
                "fixture_kind": "valid-control",
                "envelope": {},
                "status": "all checks pass",
            }
        )
        self.assertFalse(result.get("ok"))
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("candidate_status_not_candidate"),
        )

    def test_074_forged_baseline_rejected(self) -> None:
        control = _read_json(VALID_DIR / "control_claim.json")
        control["frozen_at_sha"] = "deadbeef"
        result = contracts.validate_envelope(control)
        self.assertFalse(result.get("ok"))
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("baseline_gate_commit_missing"),
        )

    def test_075_empty_contract_payload_rejected(self) -> None:
        control = _read_json(VALID_DIR / "control_claim.json")
        control["envelope"] = {}
        result = contracts.validate_envelope(control)
        self.assertFalse(result.get("ok"))
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("missing_envelope_field"),
        )


class CatalogGuardReferenceTests(unittest.TestCase):
    """Anti-pattern A12 defense for real ``Guard:`` declarations."""

    CATALOG_PATH = REPO_ROOT / "measure" / "anti-patterns.md"

    def test_080_catalog_file_exists(self) -> None:
        self.assertTrue(
            self.CATALOG_PATH.is_file(),
            f"anti-pattern catalog must exist at {self.CATALOG_PATH}.",
        )

    def test_081_catalog_guard_extraction_and_resolution_mechanism_works(self) -> None:
        """Gate-specific A12 deliverable: the extraction and resolution
        mechanism must find references and classify each as resolved or
        dangling. At least one reference must resolve (positive control
        proving the mechanism exercises real files, not just strings)."""
        text = self.CATALOG_PATH.read_text(encoding="utf-8")
        references = sorted({
            reference
            for line in text.splitlines()
            if line.startswith("**Guard:**")
            for reference in re.findall(
                r"tests/[a-zA-Z0-9_./-]+\.sh", line
            )
        })
        self.assertGreater(
            len(references),
            0,
            "anti-pattern catalog must declare at least one tests/<name>.sh reference.",
        )
        resolved = contracts.resolve_catalog_guards(references, repo_root=REPO_ROOT)
        # Every extracted reference must be classified - none dropped.
        self.assertEqual(
            set(resolved.keys()),
            set(references),
            "resolve_catalog_guards must classify every extracted reference.",
        )
        resolved_refs = [ref for ref, ok in resolved.items() if ok]
        self.assertGreater(
            len(resolved_refs),
            0,
            "at least one catalog guard reference must resolve (positive control).",
        )

    def test_082_real_guard_declarations_have_no_dangling_paths(self) -> None:
        """Every path in a real Guard declaration resolves to a file."""
        text = self.CATALOG_PATH.read_text(encoding="utf-8")
        references = sorted({
            reference
            for line in text.splitlines()
            if line.startswith("**Guard:**")
            for reference in re.findall(
                r"tests/[a-zA-Z0-9_./-]+\.sh", line
            )
        })
        resolved = contracts.resolve_catalog_guards(references, repo_root=REPO_ROOT)
        missing = frozenset(ref for ref, ok in resolved.items() if not ok)
        self.assertEqual(
            missing,
            frozenset(),
            "dangling catalog Guard declarations detected: " + ", ".join(sorted(missing)),
        )


class AttemptFixtureShapeTests(unittest.TestCase):
    """Each frozen attempt fixture must carry the expected_rejection_code
    in the file itself (test-strategy.md: 'all negative fixtures carry
    an expected stable rejection code')."""

    def test_090_attempt_fixtures_carry_expected_rejection_code(self) -> None:
        for attempt_id in EXPECTED_ATTEMPTS:
            path = ATTEMPTS_DIR / f"{attempt_id}.json"
            fixture = _read_json(path)
            code = fixture.get("expected_rejection_code")
            self.assertIsNotNone(
                code,
                f"{attempt_id} fixture must carry expected_rejection_code.",
            )
            self.assertIn(
                code,
                contracts.REJECTION_CODES,
                f"{attempt_id} fixture expected_rejection_code {code!r} not in REJECTION_CODES.",
            )
            self.assertEqual(
                code,
                contracts.ATTEMPT_REJECTION_BINDINGS[attempt_id],
                f"{attempt_id} fixture code disagrees with contracts.ATTEMPT_REJECTION_BINDINGS.",
            )

    def test_091_attempt_fixtures_status_is_candidate(self) -> None:
        for attempt_id in EXPECTED_ATTEMPTS:
            path = ATTEMPTS_DIR / f"{attempt_id}.json"
            fixture = _read_json(path)
            self.assertEqual(
                fixture.get("status"),
                "candidate",
                f"{attempt_id} fixture status must be 'candidate' (A5/A6).",
            )


class FrozenAttemptValidatorTests(unittest.TestCase):
    """The fixture-manifest validator must accept a complete manifest
    and reject an empty one. Anti-pattern A4 defense: zero valid
    controls OR zero negative cases fails closed."""

    def test_100_validate_fixture_manifest_accepts_complete(self) -> None:
        manifest = _read_json(MANIFEST_PATH)
        result = contracts.validate_fixture_manifest(manifest, fixture_root=FIXTURE_DIR)
        self.assertTrue(
            result.get("ok"),
            f"validate_fixture_manifest must accept the complete Phase 0 manifest: {result}",
        )

    def test_101_validate_fixture_manifest_rejects_empty_frozen_attempts(self) -> None:
        manifest = _read_json(MANIFEST_PATH)
        manifest["frozen_attempts"] = {}
        result = contracts.validate_fixture_manifest(manifest, fixture_root=FIXTURE_DIR)
        self.assertFalse(
            result.get("ok"),
            "validate_fixture_manifest must reject a manifest with empty frozen_attempts.",
        )
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("attempt_not_represented"),
            "empty frozen_attempts must produce ATTEMPT_NOT_REPRESENTED.",
        )

    def test_102_validate_fixture_manifest_rejects_empty_valid_controls(self) -> None:
        manifest = _read_json(MANIFEST_PATH)
        manifest["valid_controls"] = []
        result = contracts.validate_fixture_manifest(manifest, fixture_root=FIXTURE_DIR)
        self.assertFalse(
            result.get("ok"),
            "validate_fixture_manifest must reject a manifest with empty valid_controls.",
        )
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("empty_control_corpus"),
            "empty valid_controls must produce EMPTY_CONTROL_CORPUS.",
        )

    def test_103_validate_fixture_manifest_rejects_empty_negative_fixtures(self) -> None:
        manifest = _read_json(MANIFEST_PATH)
        manifest["frozen_attempts"] = {
            attempt: {
                **manifest["frozen_attempts"][attempt],
                "invalid_fixture_path": None,
            }
            for attempt in EXPECTED_ATTEMPTS
        }
        # An attempt entry missing its invalid_fixture_path means the
        # negative corpus is empty; the validator must reject.
        manifest["invalid_controls"] = []
        result = contracts.validate_fixture_manifest(manifest, fixture_root=FIXTURE_DIR)
        self.assertFalse(
            result.get("ok"),
            "validate_fixture_manifest must reject a manifest whose negative corpus is empty.",
        )

    def test_104_validate_fixture_manifest_rejects_forged_baseline(self) -> None:
        manifest = _read_json(MANIFEST_PATH)
        manifest["baseline_gate_commit"] = "0" * 40
        result = contracts.validate_fixture_manifest(manifest, fixture_root=FIXTURE_DIR)
        self.assertFalse(result.get("ok"))
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("baseline_gate_commit_missing"),
        )

    def test_105_validate_fixture_manifest_rejects_reason_code_misuse(self) -> None:
        manifest = _read_json(MANIFEST_PATH)
        manifest["frozen_attempts"][EXPECTED_ATTEMPTS[0]]["expected_rejection_code"] = (
            "DIRECTORY_CITATION_REJECTED"
        )
        result = contracts.validate_fixture_manifest(manifest, fixture_root=FIXTURE_DIR)
        self.assertFalse(result.get("ok"))
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("missing_expected_rejection_code"),
        )

    def test_106_validate_fixture_manifest_rejects_tampered_fixture(self) -> None:
        manifest = _read_json(MANIFEST_PATH)
        manifest["fixture_hashes"]["valid/control_claim.json"] = "0" * 64
        result = contracts.validate_fixture_manifest(manifest, fixture_root=FIXTURE_DIR)
        self.assertFalse(result.get("ok"))
        self.assertEqual(result.get("code"), contracts.rejection_code_for("fixture_hash_mismatch"))

    def test_107_phase0_sweep_passes_after_catalog_guard_repair(self) -> None:
        result = contracts.sweep_phase0(
            repo_root=REPO_ROOT,
            manifest=_read_json(MANIFEST_PATH),
            catalog_text=(REPO_ROOT / "measure" / "anti-patterns.md").read_text(encoding="utf-8"),
        )
        self.assertTrue(
            result.get("ok"),
            f"the aggregate sweep must pass after every real A12 Guard declaration resolves: {result}",
        )


# ---------------------------------------------------------------------------
# Runner entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    unittest.main()
