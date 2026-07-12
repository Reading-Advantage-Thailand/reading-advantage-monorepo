"""Versioned contracts for exact Git-backed claim evidence."""

from __future__ import annotations

from typing import Any, Mapping


CLAIM_EVIDENCE_SCHEMA_VERSION = "claim-evidence.v1"
"""Schema discriminator required by every Phase 1 claim record."""

CLAIM_REJECTION_CODES = frozenset(
    {
        "MALFORMED_CLAIM",
        "MALFORMED_SOURCE_LOCATOR",
        "MALFORMED_REVISION",
        "DIRECTORY_LOCATOR_REJECTED",
        "REVISION_UNREACHABLE",
        "SOURCE_FILE_NOT_FOUND",
        "LINE_RANGE_INVALID",
        "CITED_RANGE_HASH_MISMATCH",
        "GENERATED_PROSE_PRIMARY_EVIDENCE_REJECTED",
        "SOURCE_CLASS_PATH_MISMATCH",
        "FACT_NOT_EXACT_SOURCE_TEXT",
        "INFERENCE_PRESENTED_AS_FACT",
        "MALFORMED_CONFIDENCE",
        "MALFORMED_CONFLICT",
        "MALFORMED_COLLECTOR",
        "MALFORMED_REVIEWER",
    }
)
"""Stable reason-code vocabulary for claim evidence rejections."""


def reject(code: str, *, detail: Mapping[str, Any] | None = None) -> dict[str, Any]:
    """Builds a fail-closed result using one registered claim rejection code.

    @param code Stable reason code for the rejected claim.
    @param detail Optional non-authoritative diagnostic details.
    @returns Rejection result suitable for an adapter boundary.
    @throws ValueError When code is not in the claim contract vocabulary.
    """
    if code not in CLAIM_REJECTION_CODES:
        raise ValueError(f"unregistered claim rejection code: {code}")
    result: dict[str, Any] = {"ok": False, "code": code}
    if detail:
        result["detail"] = dict(detail)
    return result
