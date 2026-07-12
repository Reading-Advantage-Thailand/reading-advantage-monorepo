"""Phase 0 contract scaffold for APK evidence integrity gates.

The Green phase has replaced every Red stub body with the real
parser/validator; the public surface here (function names, return
shapes, rejection-code strings) is FROZEN at the Phase 0 baseline
(commit ``f61eb643``) and any change is a gate-modification that
invalidates active candidate manifests.

Public surface
--------------

- :data:`SCHEMA_VERSION` — current envelope schema version.
- :data:`REJECTION_CODES` — frozen set of stable rejection codes.
- :data:`CANONICAL_DEPENDENCY_FIELD` — must be ``"depends_on"``; the
  legacy alias ``"dependencies"`` is rejected by
  :func:`validate_dependency_field`.
- :func:`parse_labeled_budget` — parses a labeled integer-plus-unit
  payload (e.g. ``{"tokens": 1000}``) and returns a structured dict.
  Raises :class:`BudgetParseError` on malformed input.
- :func:`validate_envelope` — checks a versioned envelope payload
  carries the required top-level fields. Returns a result dict with
  ``{"ok": True}`` or ``{"ok": False, "code": <REJECTION_CODE>, ...}``.
- :func:`validate_fixture_manifest` — checks the Phase 0 manifest
  has every frozen attempt, expected rejection code, and paired valid
  control. Returns a result dict.
- :func:`validate_dependency_field` — returns the canonical field
  name, or a rejection dict if a legacy alias is present.
- :func:`rejection_code_for` — returns the stable rejection code that
  a validator must produce for a given violation class.

Anti-pattern defenses baked into this scaffold
----------------------------------------------

- A3 — labeled integer-plus-unit; bare digits are not accepted as a
  count.
- A4 — a fixture set with zero valid controls OR zero negative
  fixtures is rejected, not vacuously passed.
- A5/A6 — candidate manifest status MUST be ``"candidate"``;
  ``"accepted"`` or ``"all checks pass"`` are rejected at this layer.
- A8 — fixture plans accept only ``[~]``, ``[x]``, ``[b]`` markers.
- A12 — catalog guard references (e.g. ``tests/foo.sh``) must resolve
  to existing files before any coverage claim is made.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any, Iterable, Mapping

# ---------------------------------------------------------------------------
# Frozen contract constants
# ---------------------------------------------------------------------------

SCHEMA_VERSION: str = "0.0.0-red"
GATE_VERSION: str = "0.0.2-phase0-retry-red"

# Canonical dependency field name. The legacy alias ``"dependencies"``
# is rejected by ``validate_dependency_field`` per the program rule.
CANONICAL_DEPENDENCY_FIELD: str = "depends_on"

# Frozen rejection-code vocabulary. Any new code must be appended in a
# later phase with a gate-version bump; removal of a code invalidates
# every dependent manifest.
REJECTION_CODES: frozenset[str] = frozenset(
    {
        # Phase 0 codes
        "ATTEMPT_NOT_REPRESENTED",
        "EMPTY_CONTROL_CORPUS",
        "MISSING_PAIRED_CONTROL",
        "MISSING_EXPECTED_REJECTION_CODE",
        "UNMEASURED_BUDGET_NOT_ALLOWED",
        "MISSING_UNIT",
        "MISSING_INTEGER_VALUE",
        "NON_NUMERIC_BUDGET_VALUE",
        "UNKNOWN_SCHEMA_VERSION",
        "NON_CANONICAL_DEPENDENCY_FIELD",
        "INVALID_MARKER",
        "CATALOG_GUARD_REFERENCE_MISSING",
        "CANDIDATE_STATUS_NOT_CANDIDATE",
        "ACCEPTED_STATUS_NOT_ALLOWED",
        "BASELINE_GATE_COMMIT_MISSING",
        "FIXTURE_NOT_FROZEN",
        "GATE_EDIT_PROHIBITED",
        "INVALID_ENVELOPE",
        "MISSING_ENVELOPE_FIELD",
        "INVALID_FIXTURE_MANIFEST",
        "UNEXPECTED_ATTEMPT",
        "FIXTURE_HASH_MISSING",
        "FIXTURE_HASH_MISMATCH",
        "INVALID_BUDGET_VALUE",
        # Phase 0 attempt-specific codes (matched 1-1 with frozen_attempts)
        "SYNTHETIC_MAIN_SCENE_REJECTED",
        "DIRECTORY_CITATION_REJECTED",
        "HARDCODED_SUMMARY_AS_EVIDENCE_REJECTED",
        "KEYWORD_RESPONSIVE_PROFILE_REJECTED",
        "SLUG_ASSET_ALLOWLIST_REJECTED",
        # Phase 0 retry semantic-contract codes (FR5 + FR3 freeze)
        "UNKNOWN_SEVERITY_LEVEL",
        "MISSING_SEVERITY_RATIONALE",
        "MISSING_SEVERITY_EVIDENCE_REFS",
        "INVALID_SEVERITY_STRUCTURE",
        "STOP_LOSS_BATCH_SIZE_EXCEEDED",
        "STOP_LOSS_TRIGGER_DISABLED",
        "MISSING_STOP_LOSS_FIELD",
        "INVALID_STOP_LOSS_STRUCTURE",
        "ACCEPTANCE_REQUIRES_INDEPENDENT_REVIEW",
        "ACCEPTANCE_REQUIRES_OWNER_APPROVAL",
        "ACCEPTANCE_REQUIRES_PILOT",
        "ACCEPTANCE_ORDERING_INVALID",
        "INVALID_ACCEPTANCE_STRUCTURE",
        "REVOCATION_NO_TRIGGERS",
        "REVOCATION_REVALIDATION_UNGUARDED",
        "MISSING_REVOCATION_FIELD",
        "INVALID_REVOCATION_STRUCTURE",
        "ALLOWED_INPUT_MANIFEST_MISSING",
        "ALLOWED_INPUTS_HASH_MISMATCH",
        "ALLOWED_INPUT_PATH_MISSING",
        "ROLE_PROVENANCE_PLACEHOLDER",
        "ROLE_PROVENANCE_MISSING",
        "AUTHENTIC_EVENT_PROVENANCE_REQUIRED",
        "ACCEPTANCE_REQUIRES_AUTHENTIC_PROVENANCE",
    }
)

# Phase 0 frozen attempts 1-5 — the five prior APK audit attempts that
# failed and whose failure modes this gate must mechanically reject.
FROZEN_ATTEMPTS: tuple[str, ...] = (
    "attempt_01_synthetic_main_scene",
    "attempt_02_directory_citation",
    "attempt_03_hardcoded_summary",
    "attempt_04_keyword_responsive",
    "attempt_05_slug_asset_allowlist",
)

# Phase 0 fixture plan task markers: only these are accepted.
ACCEPTED_PLAN_MARKERS: frozenset[str] = frozenset({"~", "x", "b"})

# The five paired (valid ↔ invalid) rejection-code bindings for
# attempts 1-5. Each pair lives in the fixture manifest and is
# cross-checked by ``validate_fixture_manifest``.
ATTEMPT_REJECTION_BINDINGS: dict[str, str] = {
    "attempt_01_synthetic_main_scene": "SYNTHETIC_MAIN_SCENE_REJECTED",
    "attempt_02_directory_citation": "DIRECTORY_CITATION_REJECTED",
    "attempt_03_hardcoded_summary": "HARDCODED_SUMMARY_AS_EVIDENCE_REJECTED",
    "attempt_04_keyword_responsive": "KEYWORD_RESPONSIVE_PROFILE_REJECTED",
    "attempt_05_slug_asset_allowlist": "SLUG_ASSET_ALLOWLIST_REJECTED",
}


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------


class BudgetParseError(ValueError):
    """Raised when a labeled budget payload cannot be parsed.

    Carries a stable ``code`` attribute that the validator must surface
    as the rejection reason.
    """

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


class ContractError(RuntimeError):
    """Raised when a contract-level invariant is violated (e.g. unknown
    schema version or a missing frozen-attempt binding)."""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _ok() -> dict[str, Any]:
    return {"ok": True}


def _reject(
    code: str,
    *,
    detail: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    if code not in REJECTION_CODES:
        raise ContractError(
            f"Unknown rejection code {code!r}; add it to REJECTION_CODES in a version-bumped gate."
        )
    payload: dict[str, Any] = {"ok": False, "code": code}
    if detail:
        payload["detail"] = dict(detail)
    return payload


def rejection_code_for(violation: str) -> str:
    """Return the stable rejection code for a named violation class.

    Phase 0 covers the scaffold-level violations. Phase 1/2/3 will
    extend this mapping with claim, denominator, role, and lifecycle
    codes respectively. Any unmapped violation raises ``ContractError``
    so a missing binding cannot silently downgrade a rejection.
    """
    mapping: dict[str, str] = {
        "attempt_not_represented": "ATTEMPT_NOT_REPRESENTED",
        "empty_control_corpus": "EMPTY_CONTROL_CORPUS",
        "missing_paired_control": "MISSING_PAIRED_CONTROL",
        "missing_expected_rejection_code": "MISSING_EXPECTED_REJECTION_CODE",
        "unmeasured_budget_not_allowed": "UNMEASURED_BUDGET_NOT_ALLOWED",
        "missing_unit": "MISSING_UNIT",
        "missing_integer_value": "MISSING_INTEGER_VALUE",
        "non_numeric_budget_value": "NON_NUMERIC_BUDGET_VALUE",
        "unknown_schema_version": "UNKNOWN_SCHEMA_VERSION",
        "non_canonical_dependency_field": "NON_CANONICAL_DEPENDENCY_FIELD",
        "invalid_marker": "INVALID_MARKER",
        "catalog_guard_reference_missing": "CATALOG_GUARD_REFERENCE_MISSING",
        "candidate_status_not_candidate": "CANDIDATE_STATUS_NOT_CANDIDATE",
        "accepted_status_not_allowed": "ACCEPTED_STATUS_NOT_ALLOWED",
        "baseline_gate_commit_missing": "BASELINE_GATE_COMMIT_MISSING",
        "fixture_not_frozen": "FIXTURE_NOT_FROZEN",
        "gate_edit_prohibited": "GATE_EDIT_PROHIBITED",
        "invalid_envelope": "INVALID_ENVELOPE",
        "missing_envelope_field": "MISSING_ENVELOPE_FIELD",
        "invalid_fixture_manifest": "INVALID_FIXTURE_MANIFEST",
        "unexpected_attempt": "UNEXPECTED_ATTEMPT",
        "fixture_hash_missing": "FIXTURE_HASH_MISSING",
        "fixture_hash_mismatch": "FIXTURE_HASH_MISMATCH",
        "invalid_budget_value": "INVALID_BUDGET_VALUE",
        "synthetic_main_scene": "SYNTHETIC_MAIN_SCENE_REJECTED",
        "directory_citation": "DIRECTORY_CITATION_REJECTED",
        "hardcoded_summary_as_evidence": "HARDCODED_SUMMARY_AS_EVIDENCE_REJECTED",
        "keyword_responsive_profile": "KEYWORD_RESPONSIVE_PROFILE_REJECTED",
        "slug_asset_allowlist": "SLUG_ASSET_ALLOWLIST_REJECTED",
        # Phase 0 retry semantic-contract mappings (FR5 + FR3 freeze)
        "unknown_severity_level": "UNKNOWN_SEVERITY_LEVEL",
        "missing_severity_rationale": "MISSING_SEVERITY_RATIONALE",
        "missing_severity_evidence_refs": "MISSING_SEVERITY_EVIDENCE_REFS",
        "invalid_severity_structure": "INVALID_SEVERITY_STRUCTURE",
        "stop_loss_batch_size_exceeded": "STOP_LOSS_BATCH_SIZE_EXCEEDED",
        "stop_loss_trigger_disabled": "STOP_LOSS_TRIGGER_DISABLED",
        "missing_stop_loss_field": "MISSING_STOP_LOSS_FIELD",
        "invalid_stop_loss_structure": "INVALID_STOP_LOSS_STRUCTURE",
        "acceptance_requires_independent_review": "ACCEPTANCE_REQUIRES_INDEPENDENT_REVIEW",
        "acceptance_requires_owner_approval": "ACCEPTANCE_REQUIRES_OWNER_APPROVAL",
        "acceptance_requires_pilot": "ACCEPTANCE_REQUIRES_PILOT",
        "acceptance_ordering_invalid": "ACCEPTANCE_ORDERING_INVALID",
        "invalid_acceptance_structure": "INVALID_ACCEPTANCE_STRUCTURE",
        "revocation_no_triggers": "REVOCATION_NO_TRIGGERS",
        "revocation_revalidation_unguarded": "REVOCATION_REVALIDATION_UNGUARDED",
        "missing_revocation_field": "MISSING_REVOCATION_FIELD",
        "invalid_revocation_structure": "INVALID_REVOCATION_STRUCTURE",
        "allowed_input_manifest_missing": "ALLOWED_INPUT_MANIFEST_MISSING",
        "allowed_inputs_hash_mismatch": "ALLOWED_INPUTS_HASH_MISMATCH",
        "allowed_input_path_missing": "ALLOWED_INPUT_PATH_MISSING",
        "role_provenance_placeholder": "ROLE_PROVENANCE_PLACEHOLDER",
        "role_provenance_missing": "ROLE_PROVENANCE_MISSING",
        "authentic_event_provenance_required": "AUTHENTIC_EVENT_PROVENANCE_REQUIRED",
        "acceptance_requires_authentic_provenance": "ACCEPTANCE_REQUIRES_AUTHENTIC_PROVENANCE",
    }
    try:
        return mapping[violation]
    except KeyError as exc:
        raise ContractError(
            f"Unknown violation class {violation!r}; add it to rejection_code_for() in a version-bumped gate."
        ) from exc


# ---------------------------------------------------------------------------
# Public parsers / validators (RED stubs)
# ---------------------------------------------------------------------------


# Generic quantity nouns that do not encode a concrete unit of measurement.
# A payload such as ``{"amount": 1000}`` carries a bare integer with no unit;
# per A3 this must fail closed rather than pass as a labeled count. The list is
# intentionally narrow: it covers the generic-quantity words a shortcut author
# would reach for when dodging a real unit, not every English noun.
_GENERIC_QUANTITY_LABELS: frozenset[str] = frozenset(
    {
        "amount",
        "value",
        "count",
        "number",
        "total",
        "quantity",
        "sum",
        "size",
        "metric",
        "num",
        "n",
    }
)


def parse_labeled_budget(payload: Mapping[str, Any]) -> dict[str, Any]:
    """Parse a labeled integer-plus-unit payload.

    Accepts a mapping with exactly one key whose value is an integer
    and whose key encodes a unit (e.g. ``{"tokens": 1000}``). Returns
    ``{"value": int, "unit": str, "label": str}``.

    Rejects:
      * missing or non-integer value
      * missing or empty unit/label
      * the literal value ``"unmeasured"`` (fail-closed: never default)
      * a generic quantity noun (``amount``, ``value``, ``count`` ...) that
        does not encode a concrete unit of measurement (A3 defense)

    Raises :class:`BudgetParseError` on any rejection.
    """
    if not isinstance(payload, Mapping) or len(payload) == 0:
        raise BudgetParseError(
            rejection_code_for("missing_integer_value"),
            "budget payload must be a non-empty mapping",
        )

    keys = list(payload.keys())
    if len(keys) != 1:
        raise BudgetParseError(
            rejection_code_for("missing_unit"),
            "budget payload must have exactly one unit-encoding key",
        )

    label = keys[0]
    raw_value = payload[label]

    # Fail closed on the literal "unmeasured" sentinel before any other check
    # so a budget can never silently default to an inferred number.
    if raw_value == "unmeasured" or label == "unmeasured":
        raise BudgetParseError(
            rejection_code_for("unmeasured_budget_not_allowed"),
            "'unmeasured' is not an allowed budget value; a real integer-plus-unit is required",
        )

    # Booleans are a subclass of int in Python; reject them explicitly.
    if isinstance(raw_value, bool) or not isinstance(raw_value, int):
        raise BudgetParseError(
            rejection_code_for("non_numeric_budget_value"),
            f"budget value must be an integer, got {type(raw_value).__name__}",
        )

    if raw_value <= 0:
        raise BudgetParseError(
            rejection_code_for("invalid_budget_value"),
            "budget value must be a positive integer",
        )

    if not isinstance(label, str) or not label.strip():
        raise BudgetParseError(
            rejection_code_for("missing_unit"),
            "budget key must be a non-empty unit label",
        )

    if re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]*", label) is None:
        raise BudgetParseError(
            rejection_code_for("missing_unit"),
            "budget key must be a concrete unit label, not a date or bare number",
        )

    # A generic quantity noun (amount/value/count/...) does not encode a
    # concrete unit of measurement; a bare digit under such a label is the
    # A3 anti-pattern (digit-only as a "labeled count").
    if label.lower() in _GENERIC_QUANTITY_LABELS:
        raise BudgetParseError(
            rejection_code_for("missing_unit"),
            f"{label!r} is a generic quantity noun, not a concrete unit; "
            "supply a real unit key (e.g. 'tokens', 'seconds', 'bytes')",
        )

    return {"value": raw_value, "unit": label, "label": label}


def validate_envelope(envelope: Mapping[str, Any]) -> dict[str, Any]:
    """Validate a versioned envelope payload.

    A valid Phase 0 envelope carries ``schema_version``, ``kind``, and
    at least one of the contract fields (``budget``, ``severity``,
    ``stop_loss``, ``acceptance``, ``revocation``, ``depends_on``).

    Returns a result dict; never raises.
    """
    if not isinstance(envelope, Mapping):
        return _reject("INVALID_ENVELOPE")

    # A5/A6 defense: a Phase 0 fixture must carry status "candidate".
    # "accepted" is only set after the full gate pipeline has run.
    status = envelope.get("status")
    if status == "accepted":
        return _reject("ACCEPTED_STATUS_NOT_ALLOWED")
    if status != "candidate":
        return _reject(
            "CANDIDATE_STATUS_NOT_CANDIDATE",
            detail={"got": status},
        )

    # The baseline gate commit may appear as ``baseline_gate_commit`` or
    # ``frozen_at_sha`` (the per-fixture freeze pointer). Without one of
    # them, input changes cannot be detected and candidate outputs cannot
    # be revoked.
    baseline_commit = envelope.get("baseline_gate_commit")
    frozen_at_sha = envelope.get("frozen_at_sha")
    allowed_baselines = {
        "f61eb643",
        "f61eb643f138373c6357ec35e6ac296a7014800c",
    }
    if baseline_commit is not None and baseline_commit != max(allowed_baselines, key=len):
        return _reject("BASELINE_GATE_COMMIT_MISSING")
    if frozen_at_sha is not None and frozen_at_sha not in allowed_baselines:
        return _reject("BASELINE_GATE_COMMIT_MISSING")
    if baseline_commit is None and frozen_at_sha is None:
        return _reject("BASELINE_GATE_COMMIT_MISSING")

    # Reject unknown schema versions so a future-version envelope cannot
    # pass through a gate that does not understand its contract.
    schema_version = envelope.get("schema_version")
    if schema_version != SCHEMA_VERSION:
        return _reject(
            "UNKNOWN_SCHEMA_VERSION",
            detail={"got": schema_version, "expected": SCHEMA_VERSION},
        )

    if not envelope.get("kind") and not envelope.get("fixture_kind"):
        return _reject(
            "MISSING_ENVELOPE_FIELD",
            detail={"field": "kind"},
        )

    contract_fields = {
        "budget",
        "severity",
        "stop_loss",
        "acceptance",
        "revocation",
        "depends_on",
        "envelope",
    }
    if not any(envelope.get(field) not in (None, "", [], {}) for field in contract_fields):
        return _reject(
            "MISSING_ENVELOPE_FIELD",
            detail={"field": "contract"},
        )

    return _ok()


def validate_fixture_manifest(
    manifest: Mapping[str, Any],
    *,
    fixture_root: Path | None = None,
) -> dict[str, Any]:
    """Validate the Phase 0 fixture manifest completeness.

    A valid manifest has:
      * every entry in :data:`FROZEN_ATTEMPTS`
      * every entry has ``expected_rejection_code`` from
        :data:`REJECTION_CODES` AND ``paired_valid_control``
      * the positive control corpus is non-empty
      * the negative fixture corpus is non-empty (anti-A4)
    """
    if not isinstance(manifest, Mapping):
        return _reject("ATTEMPT_NOT_REPRESENTED")

    if manifest.get("manifest_kind") != "phase0-freeze":
        return _reject("INVALID_FIXTURE_MANIFEST", detail={"field": "manifest_kind"})
    if manifest.get("schema_version") != SCHEMA_VERSION:
        return _reject("UNKNOWN_SCHEMA_VERSION")
    if manifest.get("gate_version") != GATE_VERSION:
        return _reject("UNKNOWN_SCHEMA_VERSION", detail={"field": "gate_version"})
    if manifest.get("baseline_gate_commit") != "f61eb643f138373c6357ec35e6ac296a7014800c":
        return _reject("BASELINE_GATE_COMMIT_MISSING")

    prohibition = manifest.get("gate_edit_prohibition")
    if not isinstance(prohibition, Mapping) or not all(
        prohibition.get(field) is True
        for field in (
            "enabled",
            "change_requires_version_bump",
            "change_invalidates_active_candidates",
        )
    ):
        return _reject("GATE_EDIT_PROHIBITED")

    frozen = manifest.get("frozen_attempts")
    if not isinstance(frozen, Mapping):
        return _reject("ATTEMPT_NOT_REPRESENTED")

    # Every frozen attempt 1-5 must be represented.
    for attempt in FROZEN_ATTEMPTS:
        if attempt not in frozen:
            return _reject(
                "ATTEMPT_NOT_REPRESENTED",
                detail={"attempt": attempt},
            )

    unexpected = set(frozen) - set(FROZEN_ATTEMPTS)
    if unexpected:
        return _reject(
            "UNEXPECTED_ATTEMPT",
            detail={"attempts": sorted(unexpected)},
        )

    # Every represented attempt must carry a stable rejection code and a
    # paired valid control.
    for attempt, entry in frozen.items():
        if not isinstance(entry, Mapping):
            return _reject(
                "MISSING_EXPECTED_REJECTION_CODE",
                detail={"attempt": attempt},
            )
        code = entry.get("expected_rejection_code")
        if not code:
            return _reject(
                "MISSING_EXPECTED_REJECTION_CODE",
                detail={"attempt": attempt},
            )
        if code not in REJECTION_CODES:
            return _reject(
                "MISSING_EXPECTED_REJECTION_CODE",
                detail={"attempt": attempt, "code": code},
            )
        if code != ATTEMPT_REJECTION_BINDINGS.get(attempt):
            return _reject(
                "MISSING_EXPECTED_REJECTION_CODE",
                detail={"attempt": attempt, "code": code},
            )
        if not entry.get("invalid_fixture_path"):
            return _reject(
                "INVALID_FIXTURE_MANIFEST",
                detail={"attempt": attempt, "field": "invalid_fixture_path"},
            )
        if not entry.get("paired_valid_control"):
            return _reject(
                "MISSING_PAIRED_CONTROL",
                detail={"attempt": attempt},
            )

    # A4 defense: an empty positive control corpus is a vacuous pass.
    valid_controls = manifest.get("valid_controls")
    if not isinstance(valid_controls, list) or not valid_controls or not all(
        isinstance(path, str) and path for path in valid_controls
    ):
        return _reject("EMPTY_CONTROL_CORPUS")

    # A4 defense: an empty negative corpus is also a vacuous pass. A
    # negative fixture may come from the manifest's ``invalid_controls``
    # list OR from a frozen attempt's ``invalid_fixture_path``.
    invalid_controls = manifest.get("invalid_controls")
    if not isinstance(invalid_controls, list) or not all(
        isinstance(path, str) and path for path in invalid_controls
    ):
        return _reject("INVALID_FIXTURE_MANIFEST", detail={"field": "invalid_controls"})
    has_negative = bool(invalid_controls)
    if not has_negative:
        for entry in frozen.values():
            if isinstance(entry, Mapping) and entry.get("invalid_fixture_path"):
                has_negative = True
                break
    if not has_negative:
        return _reject("EMPTY_CONTROL_CORPUS")

    referenced_paths: set[str] = set()
    for entry in frozen.values():
        referenced_paths.add(str(entry["invalid_fixture_path"]))
        referenced_paths.add(str(entry["paired_valid_control"]))
    referenced_paths.update(str(path) for path in valid_controls)
    referenced_paths.update(str(path) for path in invalid_controls)

    fixture_hashes = manifest.get("fixture_hashes")
    if not isinstance(fixture_hashes, Mapping):
        return _reject("FIXTURE_HASH_MISSING")
    if set(fixture_hashes) != referenced_paths:
        return _reject(
            "FIXTURE_HASH_MISSING",
            detail={"missing": sorted(referenced_paths - set(fixture_hashes))},
        )
    if fixture_root is None:
        return _reject(
            "FIXTURE_HASH_MISSING",
            detail={"reason": "fixture_root is required for live hash verification"},
        )

    root = Path(fixture_root).resolve()
    for relative_path in sorted(referenced_paths):
        candidate = (root / relative_path).resolve()
        try:
            candidate.relative_to(root)
        except ValueError:
            return _reject(
                "INVALID_FIXTURE_MANIFEST",
                detail={"path": relative_path},
            )
        if not candidate.is_file():
            return _reject(
                "FIXTURE_HASH_MISSING",
                detail={"path": relative_path},
            )
        actual_hash = hashlib.sha256(candidate.read_bytes()).hexdigest()
        if fixture_hashes.get(relative_path) != actual_hash:
            return _reject(
                "FIXTURE_HASH_MISMATCH",
                detail={"path": relative_path},
            )

    return _ok()


def validate_dependency_field(payload: Mapping[str, Any]) -> dict[str, Any]:
    """Reject the legacy ``dependencies`` alias.

    Returns the canonical ``depends_on`` value when present; rejects
    the payload with ``NON_CANONICAL_DEPENDENCY_FIELD`` if the legacy
    alias is used. Missing dependency is allowed at Phase 0; later
    phases may require it.
    """
    if not isinstance(payload, Mapping):
        return _reject("NON_CANONICAL_DEPENDENCY_FIELD")

    has_legacy = "dependencies" in payload
    if has_legacy:
        return _reject(
            "NON_CANONICAL_DEPENDENCY_FIELD",
            detail={"legacy_field": "dependencies", "canonical": CANONICAL_DEPENDENCY_FIELD},
        )

    return _ok()


def validate_plan_marker(text: str) -> dict[str, Any]:
    """Validate that a plan-task line uses only accepted markers.

    Accepted: ``[~]``, ``[x]``, ``[b]``. A ``[ ]`` (legacy space) or
    any other marker is rejected with ``INVALID_MARKER``.
    """
    import re

    if not isinstance(text, str):
        return _reject("INVALID_MARKER")

    match = re.match(r"^- \[([^\]]*)\] ", text)
    if match is None:
        # Not a recognisable task line; reject rather than silently accept.
        return _reject("INVALID_MARKER")

    marker = match.group(1)
    if marker in ACCEPTED_PLAN_MARKERS:
        return _ok()

    return _reject("INVALID_MARKER", detail={"marker": marker})


def collect_catalog_guard_references(catalog_text: str) -> list[str]:
    """Extract ``tests/<name>.sh`` references from the anti-pattern catalog.

    Pure-text extraction; no filesystem access. The caller is
    responsible for resolving each reference via ``resolve_catalog_guards``.
    """
    import re

    return sorted(set(re.findall(r"tests/[a-zA-Z0-9_./-]+\.sh", catalog_text)))


def resolve_catalog_guards(
    references: Iterable[str],
    *,
    repo_root: Path,
) -> dict[str, bool]:
    """Resolve each catalog guard reference to its file existence.

    Returns a dict mapping each reference to ``True`` (exists) or
    ``False`` (missing). Missing references are then surfaced by the
    validator with ``CATALOG_GUARD_REFERENCE_MISSING`` — a guard that
    cannot be resolved is a guard that cannot fail.
    """
    root = Path(repo_root)
    return {ref: (root / ref).is_file() for ref in references}


# ---------------------------------------------------------------------------
# Phase 0 retry semantic contracts (FR5 + FR3 freeze)
# ---------------------------------------------------------------------------
#
# These functions implement the Phase 0 retry API surface for the
# formerly untested semantic contracts called out by the orchestrator
# audit of plan.md:16 (severity/stop_loss/acceptance/revocation are
# only names in contract_fields; no value contract is validated) and
# by phase0-acceptance-result.json P0-ACCEPT-002 / P0-ACCEPT-004
# (allowed-input hash manifest is missing; no real
# collaboration-event resolver proof is present).
#
# The signatures and the frozen REJECTION_CODES additions are the
# Phase 0 contract freeze. The Green phase implements the bodies so
# the focused suite passes; the rejection codes remain frozen and
# unchanged.

_SEVERITY_LEVELS: frozenset[str] = frozenset(
    {"critical", "high", "medium", "low", "info"}
)

_REQUIRED_ACCEPTANCE_ORDER: tuple[str, ...] = (
    "candidate",
    "reviewed",
    "owner_approved",
    "accepted",
)

_PROVENANCE_PLACEHOLDER_VALUES: frozenset[str] = frozenset(
    {
        "NOT_FABRICATED",
        "NOT_APPLICABLE_THIS_PHASE",
        "NOT_DECLARED",
        "PENDING",
        "",
    }
)

_PROVENANCE_REQUIRED_FIELDS: tuple[str, ...] = (
    "spawn_id",
    "parent_id",
    "fork_turns",
    "exact_prompt_hash",
    "allowed_input_manifest_hash",
    "start_event_id",
    "end_event_id",
    "start_timestamp",
    "end_timestamp",
    "final_response_hash",
)


def validate_severity(severity: Mapping[str, Any]) -> dict[str, Any]:
    """Validate a typed severity record (Phase 0 retry contract).

    Required shape::

        {"level": <one of critical|high|medium|low|info>,
         "rationale": <non-empty string>,
         "evidence_refs": [<non-empty list of string IDs>]}

    Rejects a non-mapping payload, an unknown severity level, a
    missing/empty rationale, or an empty/non-list evidence_refs
    collection with the documented stable rejection code.
    """
    if not isinstance(severity, Mapping):
        return _reject(rejection_code_for("invalid_severity_structure"))

    level = severity.get("level")
    if not isinstance(level, str) or level.lower() not in _SEVERITY_LEVELS:
        return _reject(rejection_code_for("unknown_severity_level"), detail={"level": level})

    rationale = severity.get("rationale")
    if not isinstance(rationale, str) or not rationale.strip():
        return _reject(rejection_code_for("missing_severity_rationale"))

    evidence_refs = severity.get("evidence_refs")
    if not isinstance(evidence_refs, list) or not evidence_refs:
        return _reject(rejection_code_for("missing_severity_evidence_refs"))
    if not all(isinstance(ref, str) and ref for ref in evidence_refs):
        return _reject(rejection_code_for("missing_severity_evidence_refs"))

    return _ok()


_STOP_LOSS_REQUIRED_FIELDS: tuple[str, ...] = (
    "unsupported_claim_stop",
    "denominator_mismatch_stop",
    "two_failed_cycles_block",
    "unresolved_severity_block",
)


def validate_stop_loss(stop_loss: Mapping[str, Any]) -> dict[str, Any]:
    """Validate a typed stop-loss configuration (Phase 0 retry contract).

    Required fields (per ``apk-evidence-reconstruction-program.md``
    Stop-loss rules)::

        {"max_batch_size": int <= 3,
         "unsupported_claim_stop": True,
         "denominator_mismatch_stop": True,
         "two_failed_cycles_block": True,
         "unresolved_severity_block": True}

    Rejects a non-mapping payload, a missing or non-integer
    ``max_batch_size``, a batch larger than three, or any disabled
    mandatory stop trigger with the documented stable rejection code.
    """
    if not isinstance(stop_loss, Mapping):
        return _reject(rejection_code_for("invalid_stop_loss_structure"))

    max_batch_size = stop_loss.get("max_batch_size")
    if not isinstance(max_batch_size, int) or isinstance(max_batch_size, bool):
        return _reject(rejection_code_for("missing_stop_loss_field"), detail={"field": "max_batch_size"})
    if max_batch_size > 3:
        return _reject(rejection_code_for("stop_loss_batch_size_exceeded"), detail={"max_batch_size": max_batch_size})

    for field in _STOP_LOSS_REQUIRED_FIELDS:
        value = stop_loss.get(field)
        if value is None:
            return _reject(rejection_code_for("missing_stop_loss_field"), detail={"field": field})
        if value is not True:
            return _reject(rejection_code_for("stop_loss_trigger_disabled"), detail={"field": field})

    return _ok()


_ACCEPTANCE_REQUIRED_FLAGS: tuple[str, ...] = (
    "requires_complete_independent_review",
    "requires_authentic_owner_approval",
    "requires_pilot_acceptance",
)


def validate_acceptance(acceptance: Mapping[str, Any]) -> dict[str, Any]:
    """Validate a typed acceptance configuration (Phase 0 retry contract).

    Required shape::

        {"requires_complete_independent_review": True,
         "requires_authentic_owner_approval": True,
         "requires_pilot_acceptance": True,
         "ordering": ["candidate", "reviewed", "owner_approved", "accepted"]}

    Rejects a non-mapping payload, a disabled independent-review /
    authentic-owner-approval / pilot-acceptance flag, or a non-canonical
    ordering with the documented stable rejection code.
    """
    if not isinstance(acceptance, Mapping):
        return _reject(rejection_code_for("invalid_acceptance_structure"))

    _ACCEPTANCE_FLAG_TO_CODE: dict[str, str] = {
        "requires_complete_independent_review": "acceptance_requires_independent_review",
        "requires_authentic_owner_approval": "acceptance_requires_owner_approval",
        "requires_pilot_acceptance": "acceptance_requires_pilot",
    }
    for flag, violation in _ACCEPTANCE_FLAG_TO_CODE.items():
        if acceptance.get(flag) is not True:
            return _reject(rejection_code_for(violation), detail={"flag": flag})

    ordering = acceptance.get("ordering")
    if not isinstance(ordering, list) or tuple(ordering) != _REQUIRED_ACCEPTANCE_ORDER:
        return _reject(
            rejection_code_for("acceptance_ordering_invalid"),
            detail={"got": ordering, "expected": list(_REQUIRED_ACCEPTANCE_ORDER)},
        )

    return _ok()


_REVOCATION_TRIGGER_FIELDS: tuple[str, ...] = (
    "revoke_on_input_change",
    "revoke_on_stale_review",
    "revoke_on_changed_approval",
)


def validate_revocation(revocation: Mapping[str, Any]) -> dict[str, Any]:
    """Validate a typed revocation configuration (Phase 0 retry contract).

    Required shape::

        {"revoke_on_input_change": True,
         "revoke_on_stale_review": True,
         "revoke_on_changed_approval": True,
         "revalidation_requires_fresh_acceptance": True}

    Rejects a non-mapping payload, a record with no active trigger, a
    missing field, or unguarded revalidation with the documented stable
    rejection code.
    """
    if not isinstance(revocation, Mapping):
        return _reject(rejection_code_for("invalid_revocation_structure"))

    for field in _REVOCATION_TRIGGER_FIELDS:
        if field not in revocation:
            return _reject(rejection_code_for("missing_revocation_field"), detail={"field": field})

    active_triggers = sum(
        1 for field in _REVOCATION_TRIGGER_FIELDS if revocation.get(field) is True
    )
    if active_triggers == 0:
        return _reject(rejection_code_for("revocation_no_triggers"))
    if active_triggers < len(_REVOCATION_TRIGGER_FIELDS):
        return _reject(rejection_code_for("revocation_no_triggers"), detail={"active": active_triggers})

    if revocation.get("revalidation_requires_fresh_acceptance") is not True:
        return _reject(rejection_code_for("revocation_revalidation_unguarded"))

    return _ok()


def _canonical_json(payload: Any) -> str:
    """Serialize a payload to canonical JSON for stable hashing.

    Uses ``sort_keys=True`` and compact separators so the hash is
    deterministic regardless of dict insertion order or whitespace.
    """
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _compute_inputs_manifest_hash(record: Mapping[str, Any]) -> str:
    """Compute the expected ``inputs_manifest_hash`` for a record.

    The hash is the SHA-256 of the canonical JSON serialization of the
    record with the ``inputs_manifest_hash`` field removed. This binds
    every other field (manifest_kind, inputs list, descriptions, etc.)
    so any tampering with the manifest content is detectable.
    """
    record_without_hash = {
        key: value
        for key, value in record.items()
        if key != "inputs_manifest_hash"
    }
    return hashlib.sha256(_canonical_json(record_without_hash).encode("utf-8")).hexdigest()


def validate_allowed_input_manifest(
    manifest: Mapping[str, Any],
    *,
    repo_root: Path | None = None,
) -> dict[str, Any]:
    """Validate the allowed-input manifest binding (Phase 0 retry contract).

    A valid manifest carries an ``allowed_inputs`` block with::

        {"manifest_kind": "phase0-retry-allowed-inputs",
         "inputs_manifest_hash": <sha256 hex>,
         "inputs": [{"path": <repo-relative path>, "sha256": <sha256 hex>}, ...]}

    When ``repo_root`` is supplied, every input path must resolve to a
    real file whose live SHA-256 matches the declared ``sha256``; the
    ``inputs_manifest_hash`` itself must match the recomputed hash of
    the manifest content (record with ``inputs_manifest_hash`` removed).
    """
    if not isinstance(manifest, Mapping):
        return _reject(rejection_code_for("allowed_input_manifest_missing"))

    if "inputs_manifest_hash" not in manifest:
        return _reject(rejection_code_for("allowed_input_manifest_missing"))

    declared_hash = manifest.get("inputs_manifest_hash")
    if not isinstance(declared_hash, str) or not declared_hash:
        return _reject(rejection_code_for("allowed_input_manifest_missing"))

    expected_hash = _compute_inputs_manifest_hash(manifest)
    if declared_hash != expected_hash:
        return _reject(
            rejection_code_for("allowed_inputs_hash_mismatch"),
            detail={"declared": declared_hash, "expected": expected_hash},
        )

    inputs = manifest.get("inputs")
    if not isinstance(inputs, list) or not inputs:
        return _reject(rejection_code_for("allowed_input_manifest_missing"), detail={"field": "inputs"})

    for entry in inputs:
        if not isinstance(entry, Mapping):
            return _reject(rejection_code_for("allowed_input_manifest_missing"), detail={"entry": entry})
        if not entry.get("path") or not isinstance(entry.get("path"), str):
            return _reject(rejection_code_for("allowed_input_manifest_missing"), detail={"field": "path"})
        if not entry.get("sha256") or not isinstance(entry.get("sha256"), str):
            return _reject(rejection_code_for("allowed_input_manifest_missing"), detail={"field": "sha256"})

    if repo_root is not None:
        root = Path(repo_root).resolve()
        for entry in inputs:
            relative_path = entry["path"]
            candidate = (root / relative_path).resolve()
            try:
                candidate.relative_to(root)
            except ValueError:
                return _reject(rejection_code_for("allowed_input_path_missing"), detail={"path": relative_path})
            if not candidate.is_file():
                return _reject(rejection_code_for("allowed_input_path_missing"), detail={"path": relative_path})
            actual_hash = hashlib.sha256(candidate.read_bytes()).hexdigest()
            if actual_hash != entry["sha256"]:
                return _reject(
                    rejection_code_for("allowed_inputs_hash_mismatch"),
                    detail={"path": relative_path, "declared": entry["sha256"], "actual": actual_hash},
                )

    return _ok()


def validate_role_provenance(receipt: Mapping[str, Any]) -> dict[str, Any]:
    """Reject role receipts with missing or placeholder event provenance.

    Every role receipt MUST carry authentic collaboration-tool values
    for ``spawn_id``, ``parent_id``, event IDs, timestamps, and hashes.
    A receipt that carries any placeholder sentinel
    (``NOT_FABRICATED`` etc.) or empty string in a required field is
    rejected with ``ROLE_PROVENANCE_PLACEHOLDER`` or
    ``ROLE_PROVENANCE_MISSING``. The validator explicitly demonstrates
    the inability to accept absent authentic provenance instead of
    silently passing a deferred placeholder.
    """
    if not isinstance(receipt, Mapping):
        return _reject(rejection_code_for("role_provenance_missing"))

    for field in _PROVENANCE_REQUIRED_FIELDS:
        value = receipt.get(field)
        # Empty string, None, or missing field -> no provenance at all.
        if not isinstance(value, str) or value == "":
            return _reject(rejection_code_for("role_provenance_missing"), detail={"field": field})
        # Placeholder sentinel -> fabricated or deferred provenance.
        if value in _PROVENANCE_PLACEHOLDER_VALUES:
            return _reject(rejection_code_for("role_provenance_placeholder"), detail={"field": field})

    return _ok()


def assert_acceptance_requires_authentic_provenance(
    acceptance: Mapping[str, Any],
    receipt: Mapping[str, Any] | None,
) -> dict[str, Any]:
    """Reject acceptance transitions that lack authentic event provenance.

    Even when ``acceptance`` carries the right structural flags, an
    acceptance transition cannot occur without a role receipt whose
    provenance passes :func:`validate_role_provenance`. A missing
    receipt is rejected with ``AUTHENTIC_EVENT_PROVENANCE_REQUIRED``;
    a present-but-untrusted receipt is rejected with
    ``ACCEPTANCE_REQUIRES_AUTHENTIC_PROVENANCE``. This preserves the
    explicit rule that absent authentic provenance blocks acceptance.
    """
    if receipt is None:
        return _reject(rejection_code_for("authentic_event_provenance_required"))

    provenance_result = validate_role_provenance(receipt)
    if not provenance_result.get("ok"):
        return _reject(
            rejection_code_for("acceptance_requires_authentic_provenance"),
            detail={"provenance": provenance_result},
        )

    return _ok()


# ---------------------------------------------------------------------------
# Convenience: full integrity sweep
# ---------------------------------------------------------------------------


def sweep_phase0(
    *,
    repo_root: Path,
    manifest: Mapping[str, Any],
    catalog_text: str,
) -> dict[str, Any]:
    """Run every Phase 0 check against the provided manifest + catalog.

    Returns a single result dict summarising the sweep. The Green
    phase wires this into the CLI runner.
    """
    fixture_root = repo_root / "measure" / "tests" / "evidence_integrity_gates" / "fixtures"
    manifest_result = validate_fixture_manifest(manifest, fixture_root=fixture_root)

    references = collect_catalog_guard_references(catalog_text)
    resolved = resolve_catalog_guards(references, repo_root=repo_root)
    dangling = sorted(ref for ref, ok in resolved.items() if not ok)

    catalog_result: dict[str, Any] = {
        "total": len(references),
        "resolved": len(references) - len(dangling),
        "dangling": dangling,
        "all_resolved": len(dangling) == 0,
    }

    overall_ok = bool(manifest_result.get("ok")) and catalog_result["all_resolved"]
    return {
        "ok": overall_ok,
        "manifest": manifest_result,
        "catalog_guards": catalog_result,
    }


__all__ = [
    "ACCEPTED_PLAN_MARKERS",
    "ATTEMPT_REJECTION_BINDINGS",
    "BudgetParseError",
    "CANONICAL_DEPENDENCY_FIELD",
    "ContractError",
    "FROZEN_ATTEMPTS",
    "GATE_VERSION",
    "REJECTION_CODES",
    "SCHEMA_VERSION",
    "assert_acceptance_requires_authentic_provenance",
    "collect_catalog_guard_references",
    "parse_labeled_budget",
    "rejection_code_for",
    "resolve_catalog_guards",
    "sweep_phase0",
    "validate_acceptance",
    "validate_allowed_input_manifest",
    "validate_dependency_field",
    "validate_envelope",
    "validate_fixture_manifest",
    "validate_plan_marker",
    "validate_revocation",
    "validate_role_provenance",
    "validate_severity",
    "validate_stop_loss",
]
