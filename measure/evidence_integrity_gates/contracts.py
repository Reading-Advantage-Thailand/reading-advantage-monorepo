"""Phase 0 contract scaffold for APK evidence integrity gates.

The Green phase will replace every ``_RED_STUB`` body with the real
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

from pathlib import Path
from typing import Any, Iterable, Mapping

# ---------------------------------------------------------------------------
# Frozen contract constants
# ---------------------------------------------------------------------------

SCHEMA_VERSION: str = "0.0.0-red"

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
        # Phase 0 attempt-specific codes (matched 1-1 with frozen_attempts)
        "SYNTHETIC_MAIN_SCENE_REJECTED",
        "DIRECTORY_CITATION_REJECTED",
        "HARDCODED_SUMMARY_AS_EVIDENCE_REJECTED",
        "KEYWORD_RESPONSIVE_PROFILE_REJECTED",
        "SLUG_ASSET_ALLOWLIST_REJECTED",
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
        "synthetic_main_scene": "SYNTHETIC_MAIN_SCENE_REJECTED",
        "directory_citation": "DIRECTORY_CITATION_REJECTED",
        "hardcoded_summary_as_evidence": "HARDCODED_SUMMARY_AS_EVIDENCE_REJECTED",
        "keyword_responsive_profile": "KEYWORD_RESPONSIVE_PROFILE_REJECTED",
        "slug_asset_allowlist": "SLUG_ASSET_ALLOWLIST_REJECTED",
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


def parse_labeled_budget(payload: Mapping[str, Any]) -> dict[str, Any]:
    """Parse a labeled integer-plus-unit payload.

    Accepts a mapping with exactly one key whose value is an integer
    and whose key encodes a unit (e.g. ``{"tokens": 1000}``). Returns
    ``{"value": int, "unit": str, "label": str}``.

    Rejects:
      * missing or non-integer value
      * missing or empty unit/label
      * the literal value ``"unmeasured"`` (fail-closed: never default)

    Raises :class:`BudgetParseError` on any rejection.
    """
    # RED-STUB: full parser lands in the Green phase. The stub raises
    # so the targeted Red command fails on every valid payload until
    # the Green implementation lands. Tests assert the parser exists
    # AND returns the expected shape on a real payload, so this stub
    # is intentionally non-functional.
    raise NotImplementedError(
        "Phase 0 RED stub: parse_labeled_budget is not yet implemented. "
        "Green phase will parse labeled integer-plus-unit payloads and "
        "raise BudgetParseError on malformed input."
    )


def validate_envelope(envelope: Mapping[str, Any]) -> dict[str, Any]:
    """Validate a versioned envelope payload.

    A valid Phase 0 envelope carries ``schema_version``, ``kind``, and
    at least one of the contract fields (``budget``, ``severity``,
    ``stop_loss``, ``acceptance``, ``revocation``, ``depends_on``).

    Returns a result dict; never raises.
    """
    # RED-STUB
    raise NotImplementedError(
        "Phase 0 RED stub: validate_envelope is not yet implemented."
    )


def validate_fixture_manifest(manifest: Mapping[str, Any]) -> dict[str, Any]:
    """Validate the Phase 0 fixture manifest completeness.

    A valid manifest has:
      * every entry in :data:`FROZEN_ATTEMPTS`
      * every entry has ``expected_rejection_code`` from
        :data:`REJECTION_CODES` AND ``paired_valid_control``
      * the positive control corpus is non-empty
      * the negative fixture corpus is non-empty (anti-A4)
    """
    # RED-STUB
    raise NotImplementedError(
        "Phase 0 RED stub: validate_fixture_manifest is not yet implemented."
    )


def validate_dependency_field(payload: Mapping[str, Any]) -> dict[str, Any]:
    """Reject the legacy ``dependencies`` alias.

    Returns the canonical ``depends_on`` value when present; rejects
    the payload with ``NON_CANONICAL_DEPENDENCY_FIELD`` if the legacy
    alias is used. Missing dependency is allowed at Phase 0; later
    phases may require it.
    """
    # RED-STUB
    raise NotImplementedError(
        "Phase 0 RED stub: validate_dependency_field is not yet implemented."
    )


def validate_plan_marker(text: str) -> dict[str, Any]:
    """Validate that a plan-task line uses only accepted markers.

    Accepted: ``[~]``, ``[x]``, ``[b]``. A ``[ ]`` (legacy space) or
    any other marker is rejected with ``INVALID_MARKER``.
    """
    # RED-STUB
    raise NotImplementedError(
        "Phase 0 RED stub: validate_plan_marker is not yet implemented."
    )


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
    # RED-STUB
    raise NotImplementedError(
        "Phase 0 RED stub: sweep_phase0 is not yet implemented."
    )


__all__ = [
    "ACCEPTED_PLAN_MARKERS",
    "ATTEMPT_REJECTION_BINDINGS",
    "BudgetParseError",
    "CANONICAL_DEPENDENCY_FIELD",
    "ContractError",
    "FROZEN_ATTEMPTS",
    "REJECTION_CODES",
    "SCHEMA_VERSION",
    "collect_catalog_guard_references",
    "parse_labeled_budget",
    "rejection_code_for",
    "resolve_catalog_guards",
    "sweep_phase0",
    "validate_dependency_field",
    "validate_envelope",
    "validate_fixture_manifest",
    "validate_plan_marker",
]