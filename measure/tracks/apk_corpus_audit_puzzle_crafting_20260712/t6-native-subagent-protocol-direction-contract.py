#!/usr/bin/env python3
"""Verify that the T6 native-subagent amendment resolves only F002."""

import json
from pathlib import Path


TRACK = Path(__file__).resolve().parent


def load_json(name: str) -> dict:
    """Load a JSON artifact from this T6 track directory.

    Args:
        name: The artifact filename relative to this script.

    Returns:
        The parsed JSON object.
    """
    return json.loads((TRACK / name).read_text(encoding="utf-8"))


def finding_by_id(review: dict, finding_id: str) -> dict:
    """Return the named finding from an immutable review artifact.

    Args:
        review: The parsed review artifact.
        finding_id: The immutable finding identifier to locate.

    Returns:
        The matching finding object.

    Raises:
        AssertionError: If the named finding is absent.
    """
    for finding in review["findings"]:
        if finding["id"] == finding_id:
            return finding
    raise AssertionError(f"missing finding: {finding_id}")


review = load_json("full-cohort-independent-review-v1.json")
direction = load_json("native-subagent-protocol-direction-20260722.json")
remediation = load_json("full-cohort-independent-review-v1-remediation-20260722.json")

assert review["status"] == "failed-blocking-findings"
assert finding_by_id(review, "T6-COHORT-F001")["blocking"] is True
assert finding_by_id(review, "T6-COHORT-F002")["blocking"] is True

scope = direction["scope"]
assert scope["resolves_finding"] == "T6-COHORT-F002"
assert "T6-COHORT-F001" in scope["does_not_amend"]
native = direction["replacement_evidence_standard"]["required_native_execution"]
assert native["fork_turns"] == "none"
assert native["dedicated_native_subagent"] is True
assert direction["provider_limitations"]["availability"] == "unavailable-in-this-harness"
assert direction["authorization_boundary"]["successor_candidate_authorized"] is False
assert direction["authorization_boundary"]["successor_acceptance_authorized"] is False
assert direction["authorization_boundary"]["successor_accepted_manifest_authorized"] is False

dispositions = {item["id"]: item for item in remediation["finding_dispositions"]}
assert dispositions["T6-COHORT-F001"]["status"] == "unresolved-blocking"
assert dispositions["T6-COHORT-F002"]["status"] == "resolved-by-explicit-protocol-amendment"
assert remediation["current_track_gate"]["status"] == "blocked-on-T6-COHORT-F001-only"
assert remediation["current_track_gate"]["completion_claimed"] is False

print("15 assertions passed: predecessor review preserved; F002 amended; F001 remains blocking")
