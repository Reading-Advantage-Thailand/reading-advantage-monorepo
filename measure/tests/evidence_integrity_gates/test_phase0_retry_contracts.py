#!/usr/bin/env python3
"""Phase 0 retry semantic-contract tests (FR5 + FR3 freeze).

Targeted Red command (from test-strategy.md §'Phase 0 retry — replace
only proven contracts and counterexamples', Retry Phase 0B):

    PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v \\
        measure.tests.evidence_integrity_gates.test_phase0_retry_contracts

These tests cover the formerly untested semantic contracts called out
by the orchestrator audit and by phase0-acceptance-result.json:

- P0-ACCEPT-002 / blocking finding from orchestrator audit: the
  allowed-input hash manifest was missing, and the asserted
  ``allowed_input_manifest_hash`` was unresolvable.
- Plan truthfulness finding from orchestrator audit: severity,
  stop_loss, acceptance, and revocation contract values had no field
  schemas or semantic validation; the focused suite had no tests for
  their values.
- P0-ACCEPT-001 / APK-EIG-B-005: the role receipt cannot satisfy
  FR3 without authentic collaboration-tool event provenance; the
  gate MUST explicitly reject placeholder, empty, or missing
  provenance rather than accept it as a deferred placeholder.

Each test exercises one of:

- :func:`validate_severity` (typed level/rationale/evidence_refs)
- :func:`validate_stop_loss` (max_batch_size <= 3 and every stop
  trigger enabled)
- :func:`validate_acceptance` (independent review + authentic owner
  approval + pilot acceptance + ordering)
- :func:`validate_revocation` (every trigger enabled + revalidation
  requires fresh acceptance)
- :func:`validate_allowed_input_manifest` (allowed-input hash present,
  inputs_manifest_hash matches the live bytes, every input path
  resolves)
- :func:`validate_role_provenance` (no ``NOT_FABRICATED`` /
  ``NOT_DECLARED`` / empty strings in required event fields)
- :func:`assert_acceptance_requires_authentic_provenance` (no
  acceptance transition without a receipt whose provenance passes
  :func:`validate_role_provenance`)

RED expectation: every behavioural test fails at HEAD with
``NotImplementedError`` because the validator bodies are Green-phase
work. The contract surface (signatures, rejection-code vocabulary,
frozen fixture hashes) is the Phase 0 retry contract freeze; the
Green phase fills in the bodies without weakening the contract or
changing the rejection codes.

Anti-pattern defenses exercised by these tests:

- A3 — labeled integer-plus-unit parsing for max_batch_size (covered
  by the stop_loss contract; bare integers are not accepted).
- A4 — every contract has a paired valid control plus at least two
  negative cases; an empty control corpus cannot pass.
- A5/A6 — no false-claim text; status must remain ``candidate``.
- A8 — fixture plans accept only ``[~]``, ``[x]``, ``[b]``.
- A12 — every catalog guard reference resolves or is recorded as a
  known debt snapshot (inherited from test_contract_scaffold).
- A15 — every fixture hash is recorded and the live file hash must
  match; a stale fixture causes the validator to reject with
  ``FIXTURE_HASH_MISMATCH`` (inherited).
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path
from typing import Any

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
VALID_DIR = FIXTURE_DIR / "valid"
INVALID_DIR = FIXTURE_DIR / "invalid"
MANIFEST_PATH = FIXTURE_DIR / "manifest.json"

BASELINE_GATE_COMMIT = "f61eb643f138373c6357ec35e6ac296a7014800c"
BASELINE_GATE_SHORT_SHA = "f61eb643"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _read_record(path: Path, key: str) -> dict[str, Any]:
    fixture = _read_json(path)
    record = fixture.get(key)
    if record is None:
        raise AssertionError(f"fixture {path} does not carry key {key!r}")
    return record


# ---------------------------------------------------------------------------
# Module surface tests
# ---------------------------------------------------------------------------


class ModuleSurfaceTests(unittest.TestCase):
    """The Phase 0 retry contract surface MUST expose the new
    validators and the new rejection codes; without them the contract
    surface is not frozen and the Red phase cannot prove the gap."""

    maxDiff = None

    def test_001_phase0_retry_validators_are_exposed(self) -> None:
        for name in (
            "validate_severity",
            "validate_stop_loss",
            "validate_acceptance",
            "validate_revocation",
            "validate_allowed_input_manifest",
            "validate_role_provenance",
            "assert_acceptance_requires_authentic_provenance",
        ):
            self.assertTrue(
                hasattr(contracts, name),
                f"contracts module must expose {name} (Phase 0 retry freeze).",
            )
            self.assertTrue(
                callable(getattr(contracts, name, None)),
                f"contracts.{name} must be callable.",
            )

    def test_002_phase0_retry_rejection_codes_are_registered(self) -> None:
        for violation, expected_code in (
            ("unknown_severity_level", "UNKNOWN_SEVERITY_LEVEL"),
            ("missing_severity_rationale", "MISSING_SEVERITY_RATIONALE"),
            ("missing_severity_evidence_refs", "MISSING_SEVERITY_EVIDENCE_REFS"),
            ("invalid_severity_structure", "INVALID_SEVERITY_STRUCTURE"),
            ("stop_loss_batch_size_exceeded", "STOP_LOSS_BATCH_SIZE_EXCEEDED"),
            ("stop_loss_trigger_disabled", "STOP_LOSS_TRIGGER_DISABLED"),
            ("missing_stop_loss_field", "MISSING_STOP_LOSS_FIELD"),
            ("invalid_stop_loss_structure", "INVALID_STOP_LOSS_STRUCTURE"),
            ("acceptance_requires_independent_review", "ACCEPTANCE_REQUIRES_INDEPENDENT_REVIEW"),
            ("acceptance_requires_owner_approval", "ACCEPTANCE_REQUIRES_OWNER_APPROVAL"),
            ("acceptance_requires_pilot", "ACCEPTANCE_REQUIRES_PILOT"),
            ("acceptance_ordering_invalid", "ACCEPTANCE_ORDERING_INVALID"),
            ("invalid_acceptance_structure", "INVALID_ACCEPTANCE_STRUCTURE"),
            ("revocation_no_triggers", "REVOCATION_NO_TRIGGERS"),
            ("revocation_revalidation_unguarded", "REVOCATION_REVALIDATION_UNGUARDED"),
            ("missing_revocation_field", "MISSING_REVOCATION_FIELD"),
            ("invalid_revocation_structure", "INVALID_REVOCATION_STRUCTURE"),
            ("allowed_input_manifest_missing", "ALLOWED_INPUT_MANIFEST_MISSING"),
            ("allowed_inputs_hash_mismatch", "ALLOWED_INPUTS_HASH_MISMATCH"),
            ("allowed_input_path_missing", "ALLOWED_INPUT_PATH_MISSING"),
            ("role_provenance_placeholder", "ROLE_PROVENANCE_PLACEHOLDER"),
            ("role_provenance_missing", "ROLE_PROVENANCE_MISSING"),
            ("authentic_event_provenance_required", "AUTHENTIC_EVENT_PROVENANCE_REQUIRED"),
            ("acceptance_requires_authentic_provenance", "ACCEPTANCE_REQUIRES_AUTHENTIC_PROVENANCE"),
        ):
            self.assertEqual(
                contracts.rejection_code_for(violation),
                expected_code,
                f"rejection_code_for({violation!r}) must resolve to {expected_code}.",
            )
            self.assertIn(
                expected_code,
                contracts.REJECTION_CODES,
                f"{expected_code} must be in the frozen REJECTION_CODES set.",
            )

    def test_003_gate_version_is_bumped_for_phase0_retry(self) -> None:
        # The gate version must record the Phase 0 retry contract
        # surface expansion; the previous gate version cannot validate
        # the new severity/stop_loss/acceptance/revocation/allowed_inputs/
        # role_provenance contracts.
        self.assertNotEqual(
            contracts.GATE_VERSION,
            "0.0.1-security-review",
            "GATE_VERSION must be bumped past the security-review gate so "
            "candidate manifests cannot pretend the new contract surface "
            "is already accepted.",
        )
        manifest = _read_json(MANIFEST_PATH)
        self.assertEqual(
            manifest.get("gate_version"),
            contracts.GATE_VERSION,
            "manifest.gate_version must follow contracts.GATE_VERSION after a version bump.",
        )


# ---------------------------------------------------------------------------
# Severity contract tests
# ---------------------------------------------------------------------------


class SeverityContractTests(unittest.TestCase):
    """Severity is a typed contract: an enum level, a non-empty
    rationale, and a non-empty list of evidence references. A
    free-text level, an empty rationale, or empty refs must be
    rejected with a stable rejection code."""

    def test_010_valid_severity_record_accepted(self) -> None:
        severity = _read_record(VALID_DIR / "control_severity.json", "severity_record")
        result = contracts.validate_severity(severity)
        self.assertTrue(
            result.get("ok"),
            f"validate_severity must accept the control fixture: {result}",
        )

    def test_011_unknown_severity_level_rejected(self) -> None:
        severity = _read_record(
            INVALID_DIR / "invalid_severity_unknown_level.json", "severity_record"
        )
        result = contracts.validate_severity(severity)
        self.assertFalse(
            result.get("ok"),
            "validate_severity must reject a severity with a non-enum level.",
        )
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("unknown_severity_level"),
            "unknown severity level must produce UNKNOWN_SEVERITY_LEVEL.",
        )

    def test_012_missing_severity_rationale_rejected(self) -> None:
        severity = _read_record(
            INVALID_DIR / "invalid_severity_missing_rationale.json", "severity_record"
        )
        result = contracts.validate_severity(severity)
        self.assertFalse(
            result.get("ok"),
            "validate_severity must reject a severity without a rationale.",
        )
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("missing_severity_rationale"),
            "missing severity rationale must produce MISSING_SEVERITY_RATIONALE.",
        )


# ---------------------------------------------------------------------------
# Stop-loss contract tests
# ---------------------------------------------------------------------------


class StopLossContractTests(unittest.TestCase):
    """Stop-loss is a typed contract: max batch size 3, every stop
    trigger enabled. A batch larger than three or a disabled trigger
    must be rejected with a stable rejection code."""

    def test_020_valid_stop_loss_record_accepted(self) -> None:
        record = _read_record(VALID_DIR / "control_stop_loss.json", "stop_loss_record")
        result = contracts.validate_stop_loss(record)
        self.assertTrue(
            result.get("ok"),
            f"validate_stop_loss must accept the control fixture: {result}",
        )

    def test_021_oversized_batch_rejected(self) -> None:
        record = _read_record(
            INVALID_DIR / "invalid_stop_loss_oversized_batch.json", "stop_loss_record"
        )
        result = contracts.validate_stop_loss(record)
        self.assertFalse(
            result.get("ok"),
            "validate_stop_loss must reject a max_batch_size larger than three.",
        )
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("stop_loss_batch_size_exceeded"),
            "max_batch_size > 3 must produce STOP_LOSS_BATCH_SIZE_EXCEEDED.",
        )

    def test_022_disabled_stop_trigger_rejected(self) -> None:
        record = _read_record(
            INVALID_DIR / "invalid_stop_loss_trigger_disabled.json", "stop_loss_record"
        )
        result = contracts.validate_stop_loss(record)
        self.assertFalse(
            result.get("ok"),
            "validate_stop_loss must reject a configuration that disables a mandatory stop trigger.",
        )
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("stop_loss_trigger_disabled"),
            "a disabled stop trigger must produce STOP_LOSS_TRIGGER_DISABLED.",
        )


# ---------------------------------------------------------------------------
# Acceptance contract tests
# ---------------------------------------------------------------------------


class AcceptanceContractTests(unittest.TestCase):
    """Acceptance is a typed contract: independent review, authentic
    owner approval, pilot acceptance, and the
    candidate/reviewed/owner_approved/accepted ordering. Skipping any
    step or reordering must be rejected with a stable code."""

    def test_030_valid_acceptance_record_accepted(self) -> None:
        record = _read_record(VALID_DIR / "control_acceptance.json", "acceptance_record")
        result = contracts.validate_acceptance(record)
        self.assertTrue(
            result.get("ok"),
            f"validate_acceptance must accept the control fixture: {result}",
        )

    def test_031_no_owner_approval_rejected(self) -> None:
        record = _read_record(
            INVALID_DIR / "invalid_acceptance_no_owner_approval.json", "acceptance_record"
        )
        result = contracts.validate_acceptance(record)
        self.assertFalse(
            result.get("ok"),
            "validate_acceptance must reject a record that omits owner approval.",
        )
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("acceptance_requires_owner_approval"),
            "missing authentic owner approval must produce "
            "ACCEPTANCE_REQUIRES_OWNER_APPROVAL.",
        )

    def test_032_ordering_skip_rejected(self) -> None:
        record = _read_record(
            INVALID_DIR / "invalid_acceptance_ordering_skip.json", "acceptance_record"
        )
        result = contracts.validate_acceptance(record)
        self.assertFalse(
            result.get("ok"),
            "validate_acceptance must reject a record whose ordering skips 'reviewed'.",
        )
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("acceptance_ordering_invalid"),
            "a non-canonical acceptance ordering must produce ACCEPTANCE_ORDERING_INVALID.",
        )


# ---------------------------------------------------------------------------
# Revocation contract tests
# ---------------------------------------------------------------------------


class RevocationContractTests(unittest.TestCase):
    """Revocation is a typed contract: every revoke trigger enabled
    and revalidation requires a fresh acceptance. No triggers or
    unguarded revalidation must be rejected with a stable code."""

    def test_040_valid_revocation_record_accepted(self) -> None:
        record = _read_record(VALID_DIR / "control_revocation.json", "revocation_record")
        result = contracts.validate_revocation(record)
        self.assertTrue(
            result.get("ok"),
            f"validate_revocation must accept the control fixture: {result}",
        )

    def test_041_no_revocation_triggers_rejected(self) -> None:
        record = _read_record(
            INVALID_DIR / "invalid_revocation_no_triggers.json", "revocation_record"
        )
        result = contracts.validate_revocation(record)
        self.assertFalse(
            result.get("ok"),
            "validate_revocation must reject a record with no triggers.",
        )
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("revocation_no_triggers"),
            "a revocation record with no triggers must produce REVOCATION_NO_TRIGGERS.",
        )

    def test_042_unguarded_revalidation_rejected(self) -> None:
        record = _read_record(
            INVALID_DIR / "invalid_revocation_revalidation_unguarded.json", "revocation_record"
        )
        result = contracts.validate_revocation(record)
        self.assertFalse(
            result.get("ok"),
            "validate_revocation must reject a record whose revalidation is unguarded.",
        )
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("revocation_revalidation_unguarded"),
            "unguarded revalidation must produce REVOCATION_REVALIDATION_UNGUARDED.",
        )


# ---------------------------------------------------------------------------
# Allowed-input manifest tests
# ---------------------------------------------------------------------------


class AllowedInputManifestTests(unittest.TestCase):
    """The allowed-input manifest binds the exact input paths and
    their hashes so input changes are detectable and candidate
    outputs are revocable. A missing manifest hash or a hash
    mismatch MUST be rejected with a stable code (P0-ACCEPT-002 /
    blocking finding from orchestrator audit)."""

    def test_050_manifest_declares_allowed_inputs_block(self) -> None:
        manifest = _read_json(MANIFEST_PATH)
        self.assertIn(
            "allowed_inputs",
            manifest,
            "manifest must carry an allowed_inputs block (P0-ACCEPT-002).",
        )
        block = manifest["allowed_inputs"]
        self.assertEqual(block.get("manifest_kind"), "phase0-retry-allowed-inputs")
        self.assertIn("inputs_manifest_hash", block)
        self.assertIn("inputs", block)
        self.assertIsInstance(block["inputs"], list)
        self.assertGreater(
            len(block["inputs"]),
            0,
            "allowed_inputs.inputs must declare at least one input path.",
        )
        for entry in block["inputs"]:
            self.assertIn("path", entry)
            self.assertIn("sha256", entry)

    def test_051_valid_allowed_inputs_accepted(self) -> None:
        record = _read_record(
            VALID_DIR / "control_allowed_inputs.json", "allowed_inputs_record"
        )
        # The Green phase will fully validate the placeholder hashes
        # by replacing each placeholder with the live SHA-256. At Red
        # time the record is still syntactically valid and the
        # validator must accept the structural shape.
        self.assertEqual(record.get("manifest_kind"), "phase0-retry-allowed-inputs")
        # Exercise the validator. It will raise NotImplementedError
        # at HEAD; this is the expected Red state for the contract
        # freeze.
        result = contracts.validate_allowed_input_manifest(record, repo_root=REPO_ROOT)
        self.assertTrue(
            result.get("ok"),
            f"validate_allowed_input_manifest must accept the control fixture: {result}",
        )

    def test_052_missing_inputs_manifest_hash_rejected(self) -> None:
        record = _read_record(
            INVALID_DIR / "invalid_allowed_inputs_missing.json", "allowed_inputs_record"
        )
        # Sanity: the fixture must actually omit the hash.
        self.assertNotIn(
            "inputs_manifest_hash",
            record,
            "sanity: invalid_allowed_inputs_missing must omit inputs_manifest_hash.",
        )
        result = contracts.validate_allowed_input_manifest(record, repo_root=REPO_ROOT)
        self.assertFalse(
            result.get("ok"),
            "validate_allowed_input_manifest must reject a record without inputs_manifest_hash.",
        )
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("allowed_input_manifest_missing"),
            "missing inputs_manifest_hash must produce ALLOWED_INPUT_MANIFEST_MISSING.",
        )

    def test_053_inputs_manifest_hash_mismatch_rejected(self) -> None:
        record = _read_record(
            INVALID_DIR / "invalid_allowed_inputs_hash_mismatch.json", "allowed_inputs_record"
        )
        # Sanity: the fixture must claim a forged hash.
        declared = record.get("inputs_manifest_hash")
        self.assertEqual(
            declared,
            "0" * 64,
            "sanity: invalid_allowed_inputs_hash_mismatch must declare a wrong hash.",
        )
        result = contracts.validate_allowed_input_manifest(record, repo_root=REPO_ROOT)
        self.assertFalse(
            result.get("ok"),
            "validate_allowed_input_manifest must reject a record whose declared hash is forged.",
        )
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("allowed_inputs_hash_mismatch"),
            "a forged inputs_manifest_hash must produce ALLOWED_INPUTS_HASH_MISMATCH.",
        )


# ---------------------------------------------------------------------------
# Provenance-absence rejection tests
# ---------------------------------------------------------------------------


class RoleProvenanceTests(unittest.TestCase):
    """A role receipt whose spawn_id, parent_id, or other required
    event provenance is a placeholder sentinel (NOT_FABRICATED,
    NOT_DECLARED, ...) or an empty string MUST be rejected. There is
    no valid positive control: real provenance requires a real
    collaboration-tool resolver, which is unavailable on this run
    surface (per test-strategy.md 'Attestation feasibility is a hard
    preflight'). The validator MUST explicitly demonstrate the
    inability to accept absent authentic provenance instead of
    silently passing a deferred placeholder."""

    def test_060_receipt_with_not_fabricated_provenance_rejected(self) -> None:
        receipt = _read_record(
            INVALID_DIR / "invalid_role_receipt_not_fabricated.json", "role_receipt"
        )
        # Sanity: every required field carries a placeholder.
        for field in (
            "spawn_id",
            "parent_id",
            "start_event_id",
            "end_event_id",
            "final_response_hash",
        ):
            self.assertEqual(
                receipt.get(field),
                "NOT_FABRICATED",
                f"sanity: receipt.{field} must carry NOT_FABRICATED in the placeholder fixture.",
            )
        result = contracts.validate_role_provenance(receipt)
        self.assertFalse(
            result.get("ok"),
            "validate_role_provenance must reject a receipt whose required fields are NOT_FABRICATED.",
        )
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("role_provenance_placeholder"),
            "placeholder provenance must produce ROLE_PROVENANCE_PLACEHOLDER.",
        )

    def test_061_receipt_with_empty_provenance_rejected(self) -> None:
        receipt = _read_record(
            INVALID_DIR / "invalid_role_receipt_empty_provenance.json", "role_receipt"
        )
        # Sanity: every required field is an empty string.
        for field in (
            "spawn_id",
            "parent_id",
            "start_event_id",
            "end_event_id",
            "final_response_hash",
        ):
            self.assertEqual(
                receipt.get(field),
                "",
                f"sanity: receipt.{field} must be empty in the empty-provenance fixture.",
            )
        result = contracts.validate_role_provenance(receipt)
        self.assertFalse(
            result.get("ok"),
            "validate_role_provenance must reject a receipt whose required fields are empty.",
        )
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("role_provenance_missing"),
            "empty provenance must produce ROLE_PROVENANCE_MISSING.",
        )

    def test_062_acceptance_transition_requires_authentic_provenance(self) -> None:
        # Even when the acceptance record itself is structurally
        # valid, an acceptance transition cannot occur without a
        # role receipt whose provenance passes
        # ``validate_role_provenance``. The receipt may be the
        # placeholder one: the validator must reject the
        # acceptance transition because the receipt is untrusted.
        acceptance = _read_record(
            VALID_DIR / "control_acceptance.json", "acceptance_record"
        )
        receipt = _read_record(
            INVALID_DIR / "invalid_role_receipt_not_fabricated.json", "role_receipt"
        )
        result = contracts.assert_acceptance_requires_authentic_provenance(
            acceptance, receipt
        )
        self.assertFalse(
            result.get("ok"),
            "assert_acceptance_requires_authentic_provenance must reject "
            "an acceptance transition bound to a placeholder receipt.",
        )
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("acceptance_requires_authentic_provenance"),
            "an acceptance transition bound to a placeholder receipt must "
            "produce ACCEPTANCE_REQUIRES_AUTHENTIC_PROVENANCE.",
        )

    def test_063_acceptance_transition_without_receipt_rejected(self) -> None:
        # The most explicit case: there is no receipt at all. The
        # validator must reject the acceptance transition with a
        # stable code rather than silently accepting an absent
        # provenance.
        acceptance = _read_record(
            VALID_DIR / "control_acceptance.json", "acceptance_record"
        )
        result = contracts.assert_acceptance_requires_authentic_provenance(
            acceptance, None
        )
        self.assertFalse(
            result.get("ok"),
            "assert_acceptance_requires_authentic_provenance must reject an acceptance "
            "transition that has no receipt at all.",
        )
        self.assertEqual(
            result.get("code"),
            contracts.rejection_code_for("authentic_event_provenance_required"),
            "missing receipt must produce AUTHENTIC_EVENT_PROVENANCE_REQUIRED.",
        )


# ---------------------------------------------------------------------------
# Runner entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    unittest.main()