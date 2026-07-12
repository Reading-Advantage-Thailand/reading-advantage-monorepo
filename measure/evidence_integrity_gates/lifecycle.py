"""Fail-closed Phase 3 lifecycle validation for APK evidence gate records."""

from __future__ import annotations

import hashlib
import json
from typing import Any, Mapping

from measure.evidence_integrity_gates.denominator_roles import validate_owner_approval
from measure.evidence_integrity_gates.events import EventResolver


PHASE3_SCHEMA_VERSION = "evidence-integrity.phase3.v1"
LIFECYCLE_REJECTION_CODES = frozenset(
    {
        "INVALID_LIFECYCLE_HISTORY",
        "CANDIDATE_REQUIRED",
        "BATCH_SIZE_EXCEEDED",
        "UNSUPPORTED_CLAIM_STOP",
        "DENOMINATOR_MISMATCH_STOP",
        "FAILED_FIX_REVIEW_CYCLES_EXHAUSTED",
        "UNMEASURED_RESOURCE",
        "NON_NUMERIC_RESOURCE",
        "NON_POSITIVE_RESOURCE",
        "RESOURCE_UNIT_INVALID",
        "RESOURCE_CEILING_INVALID",
        "RESOURCE_CEILING_EXCEEDED",
        "ACCEPTED_PHASE4_GATE_REQUIRED",
        "REVIEW_REQUIRED_BEFORE_APPROVAL",
        "REVIEW_CHANGED_REVALIDATION_REQUIRED",
        "INPUT_CHANGED_REVALIDATION_REQUIRED",
        "GATE_CHANGED_REVALIDATION_REQUIRED",
        "CANDIDATE_CHANGED_REVALIDATION_REQUIRED",
        "UNRESOLVED_BLOCKING_FINDING",
        "OWNER_APPROVAL_INVALID",
        "OWNER_APPROVAL_REPLAYED",
        "PILOT_ACCEPTANCE_REQUIRED",
        "PRODUCT_GATE_PIN_REQUIRED_BEFORE_WORK",
        "PRODUCT_GATE_PIN_CHANGED_REVALIDATION_REQUIRED",
    }
)
_BLOCKING_SEVERITIES = frozenset({"critical", "high", "medium"})
_GENERIC_UNITS = frozenset({"amount", "value", "count", "number", "total", "quantity", "sum", "size", "metric", "num", "n"})
_REVOCATION_CODES = frozenset(
    {
        "INPUT_CHANGED_REVALIDATION_REQUIRED",
        "GATE_CHANGED_REVALIDATION_REQUIRED",
        "CANDIDATE_CHANGED_REVALIDATION_REQUIRED",
        "REVIEW_CHANGED_REVALIDATION_REQUIRED",
        "PRODUCT_GATE_PIN_CHANGED_REVALIDATION_REQUIRED",
    }
)


def canonical_hash(value: Any) -> str:
    """Hashes one JSON-compatible value with deterministic serialization.

    @param value Value to bind into an immutable lifecycle transition.
    @returns Lowercase SHA-256 digest.
    """
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _block(code: str, *, detail: Mapping[str, Any] | None = None) -> dict[str, Any]:
    """Creates a fail-closed lifecycle report with one stable blocker.

    @param code Stable lifecycle blocker code.
    @param detail Optional safe diagnostic details.
    @returns Structured blocked report.
    """
    if code not in LIFECYCLE_REJECTION_CODES:
        raise ValueError(f"unknown lifecycle blocker code: {code}")
    blocker: dict[str, Any] = {"code": code}
    if detail:
        blocker["detail"] = dict(detail)
    return {
        "ok": False,
        "state": "revoked" if code in _REVOCATION_CODES else "blocked",
        "blockers": [blocker],
        "transitions": [],
        "resource_report": {},
    }


def _is_positive_integer(value: Any) -> bool:
    """Checks whether a value is a non-boolean positive integer.

    @param value Candidate resource or count value.
    @returns Whether value is a positive integer.
    """
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


def _validate_resources(candidate: Mapping[str, Any]) -> tuple[dict[str, Any] | None, dict[str, Any]]:
    """Validates measured resources against frozen per-unit ceilings.

    @param candidate Candidate lifecycle record containing resources and ceilings.
    @returns A blocker or ``None`` plus the parsed resource report.
    """
    resources = candidate.get("resources")
    ceilings = candidate.get("frozen_resource_ceilings")
    if not isinstance(resources, Mapping) or not resources or not isinstance(ceilings, Mapping) or not ceilings:
        return _block("UNMEASURED_RESOURCE"), {}
    if set(resources) != set(ceilings):
        return _block("UNMEASURED_RESOURCE"), {}
    if any(not isinstance(unit, str) or not unit or unit.lower() in _GENERIC_UNITS for unit in resources):
        return _block("RESOURCE_UNIT_INVALID"), {}
    report: dict[str, Any] = {}
    for unit in sorted(resources):
        used = resources[unit]
        ceiling = ceilings[unit]
        if used == "unmeasured" or ceiling == "unmeasured":
            return _block("UNMEASURED_RESOURCE", detail={"unit": unit}), {}
        if isinstance(used, bool) or not isinstance(used, int):
            return _block("NON_NUMERIC_RESOURCE", detail={"unit": unit}), {}
        if not _is_positive_integer(used):
            return _block("NON_POSITIVE_RESOURCE", detail={"unit": unit}), {}
        if isinstance(ceiling, bool) or not isinstance(ceiling, int) or not _is_positive_integer(ceiling):
            return _block("RESOURCE_CEILING_INVALID", detail={"unit": unit}), {}
        if used > ceiling:
            return _block("RESOURCE_CEILING_EXCEEDED", detail={"unit": unit}), {}
        report[unit] = {"used": used, "ceiling": ceiling, "remaining": ceiling - used}
    return None, report


def _valid_gate(gate: Any) -> bool:
    """Checks that a candidate names an accepted Phase 4 gate manifest.

    @param gate Candidate gate binding.
    @returns Whether the binding is structurally an accepted Phase 4 gate.
    """
    return (
        isinstance(gate, Mapping)
        and gate.get("phase") == 4
        and gate.get("status") == "accepted"
        and isinstance(gate.get("commit"), str)
        and len(gate["commit"]) == 40
        and isinstance(gate.get("manifest_hash"), str)
        and len(gate["manifest_hash"]) == 64
        and isinstance(gate.get("version"), str)
        and bool(gate["version"])
        and isinstance(gate.get("files"), Mapping)
        and bool(gate["files"])
    )


def _validate_product_pin(product_track: Any, gate: Mapping[str, Any]) -> dict[str, Any] | None:
    """Validates the immutable accepted-gate pin before product work starts.

    @param product_track Product track execution record.
    @param gate Accepted Phase 4 gate binding from the candidate.
    @returns A stable blocker when the pin is absent or changed, otherwise ``None``.
    """
    if not isinstance(product_track, Mapping) or product_track.get("first_work_started") is not True:
        return _block("PRODUCT_GATE_PIN_REQUIRED_BEFORE_WORK")
    required = {
        "gate_commit": gate["commit"],
        "gate_manifest_hash": gate["manifest_hash"],
        "gate_version": gate["version"],
        "gate_files": gate["files"],
    }
    if any(field not in product_track for field in required):
        return _block("PRODUCT_GATE_PIN_REQUIRED_BEFORE_WORK")
    if any(product_track[field] != expected for field, expected in required.items()):
        return _block("PRODUCT_GATE_PIN_CHANGED_REVALIDATION_REQUIRED")
    return None


def validate_lifecycle(history: Mapping[str, Any], resolver: EventResolver) -> dict[str, Any]:
    """Validates one complete candidate-to-accepted lifecycle history.

    @param history Untrusted lifecycle history received at the CLI boundary.
    @param resolver Event adapter that resolves and atomically consumes owner approvals.
    @returns Deterministic acceptance or fail-closed blocker report.
    """
    if not isinstance(history, Mapping) or history.get("schema_version") != PHASE3_SCHEMA_VERSION:
        return _block("INVALID_LIFECYCLE_HISTORY")
    candidate = history.get("candidate")
    if not isinstance(candidate, Mapping) or candidate.get("status") != "candidate":
        return _block("CANDIDATE_REQUIRED")
    games = candidate.get("games")
    if not isinstance(games, list) or not games or len(games) > 3:
        return _block("BATCH_SIZE_EXCEEDED")
    if candidate.get("unsupported_claims"):
        return _block("UNSUPPORTED_CLAIM_STOP")
    denominator = candidate.get("denominator")
    if not isinstance(denominator, Mapping) or denominator.get("discovered_items") != denominator.get("reconciled_items"):
        return _block("DENOMINATOR_MISMATCH_STOP")
    if not _is_positive_integer(denominator.get("discovered_items")):
        return _block("DENOMINATOR_MISMATCH_STOP")
    cycles = candidate.get("failed_fix_review_cycles")
    if not isinstance(cycles, int) or isinstance(cycles, bool) or cycles < 0:
        return _block("FAILED_FIX_REVIEW_CYCLES_EXHAUSTED")
    if cycles >= 2:
        return _block("FAILED_FIX_REVIEW_CYCLES_EXHAUSTED")
    resource_blocker, resource_report = _validate_resources(candidate)
    if resource_blocker is not None:
        return resource_blocker
    gate = candidate.get("gate")
    if not _valid_gate(gate):
        return _block("ACCEPTED_PHASE4_GATE_REQUIRED")
    review = history.get("review")
    if not isinstance(review, Mapping) or review.get("status") != "reviewed":
        return _block("REVIEW_REQUIRED_BEFORE_APPROVAL")
    if not isinstance(review.get("completed_ms"), int) or isinstance(review.get("completed_ms"), bool) or review["completed_ms"] < 0:
        return _block("REVIEW_CHANGED_REVALIDATION_REQUIRED")
    candidate_hash = canonical_hash(candidate)
    gate_hash = canonical_hash(gate)
    if review.get("inputs_manifest_hash") != candidate.get("inputs_manifest_hash"):
        return _block("INPUT_CHANGED_REVALIDATION_REQUIRED")
    if review.get("gate_hash") != gate_hash:
        return _block("GATE_CHANGED_REVALIDATION_REQUIRED")
    if review.get("candidate_hash") != candidate_hash:
        return _block("CANDIDATE_CHANGED_REVALIDATION_REQUIRED")
    findings = review.get("findings")
    if not isinstance(findings, list):
        return _block("REVIEW_CHANGED_REVALIDATION_REQUIRED")
    for finding in findings:
        if (
            isinstance(finding, Mapping)
            and isinstance(finding.get("severity"), str)
            and finding["severity"].lower() in _BLOCKING_SEVERITIES
            and finding.get("resolved") is not True
        ):
            return _block("UNRESOLVED_BLOCKING_FINDING", detail={"severity": finding["severity"]})
    review_hash = canonical_hash(review)
    approval = history.get("approval")
    expected_hashes = {"candidate": candidate_hash, "review": review_hash, "gate": gate_hash}
    approved_hashes = approval.get("approved_hashes") if isinstance(approval, Mapping) else None
    if isinstance(approved_hashes, Mapping) and approved_hashes.get("review") != review_hash:
        return _block("REVIEW_CHANGED_REVALIDATION_REQUIRED")
    approval_result = validate_owner_approval(
        approval if isinstance(approval, Mapping) else {},
        resolver,
        expected_hashes=expected_hashes,
        review_completed_ms=review["completed_ms"],
        consumed_event_ids=history.get("consumed_approval_event_ids", ()),
    )
    if not approval_result.get("ok"):
        if approval_result.get("code") == "REPLAYED_OWNER_APPROVAL":
            return _block("OWNER_APPROVAL_REPLAYED")
        return _block("OWNER_APPROVAL_INVALID", detail={"approval_code": approval_result.get("code")})
    pilot = history.get("pilot")
    if (
        not isinstance(pilot, Mapping)
        or pilot.get("status") != "accepted"
        or pilot.get("candidate_hash") != candidate_hash
        or pilot.get("review_hash") != review_hash
    ):
        return _block("PILOT_ACCEPTANCE_REQUIRED")
    product_blocker = _validate_product_pin(history.get("product_track"), gate)
    if product_blocker is not None:
        return product_blocker
    return {
        "ok": True,
        "state": "accepted",
        "blockers": [],
        "transitions": [
            {"to": "candidate", "hash": candidate_hash},
            {"to": "reviewed", "hash": review_hash},
            {"to": "owner_approved", "event_id": approval["event_id"]},
            {"to": "accepted", "pilot": "accepted"},
        ],
        "resource_report": resource_report,
    }


__all__ = [
    "LIFECYCLE_REJECTION_CODES",
    "PHASE3_SCHEMA_VERSION",
    "canonical_hash",
    "validate_lifecycle",
]
