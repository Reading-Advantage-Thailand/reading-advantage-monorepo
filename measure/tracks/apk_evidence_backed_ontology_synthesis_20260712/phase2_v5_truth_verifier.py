#!/usr/bin/env python3
"""Verifies Phase 2 v5 systemic semantic routing and readable evidence."""

from __future__ import annotations

import argparse
import copy
from dataclasses import dataclass
import hashlib
import json
from pathlib import Path
import re
import sys
from typing import Any

import phase2_v4_truth_verifier as v4

TRACK_ID = "apk_evidence_backed_ontology_synthesis_20260712"
DISPATCH_PATH = "phase2-role-dispatch-v5.json"
DISPATCH_SHA256 = "586a21f5ae1fd0ac1a5b429de6303394362e0e3f53e28b1374dfb5d45fd7f558"
MAPPER_OUTPUTS = (
    "phase2-capability-comparisons-v3.json",
    "phase2-capability-classification-v3.json",
    "phase2-extension-boundaries-v3.json",
    "phase2-claim-dependency-edges-v3.json",
)
MAPPER_RECEIPT = "role-receipts/phase2/capability-mapper-v3.json"
FIXTURE_MANIFEST = "phase2-v5-fixture-manifest.json"
MAX_FIXTURE_FILES = 16
MAX_OUTPUT_BYTES = 1_048_576

PHASE1_INPUTS = dict(v4.PHASE1_INPUTS)
PRESERVED_V4_RED = {
    "phase2_v4_truth_verifier.py": (
        "70b4c3158f7a6fee5af570d750d6e397e0a260233f8e21eae12938d09a06239e"
    ),
    "phase2_v4_truth_verifier_test.py": (
        "183c3b16e778ff606e3a0184ee5740da5803540aa88132f516fbcd67dc5b3669"
    ),
    "phase2-v4-fixture-manifest.json": (
        "ba02abbb0e13af5af4f3582228ccc617058139e362173036aad2ddea5ed0304f"
    ),
    "phase2-v4-red-report.json": (
        "548f67f03c9e4fbf29729c605d72430f833ff80a0980045f010ff0e5277efb68"
    ),
    "role-receipts/phase2/truth-test-author-v4.json": (
        "e815c2deecfc1888f4b9b6221c3b4b3e5c837c794ab1e7e14a0ed1fe8a40d40d"
    ),
}
REJECTED_V2 = {
    "phase2-capability-comparisons-v2.json": (
        "879aaebd1ac5e2c6ac16fa9b42dea8962ccc0200a40285239671ac100c9aedc6"
    ),
    "phase2-capability-classification-v2.json": (
        "ad0a3cee6cf8080bbaeaaa580d83dcc4c3da609285d0a8a0bfafb123495e9580"
    ),
    "phase2-extension-boundaries-v2.json": (
        "c2b946ab4b4342f05c7b27983ea2e54c441b5e1fe7e0e98ae8f745c6803dbb55"
    ),
    "phase2-claim-dependency-edges-v2.json": (
        "064785f673de2902083089ba6174960f2d6210c331464c35504cea88c44beb19"
    ),
    "role-receipts/phase2/capability-mapper-v2.json": (
        "be41bd47ba0e25f55a2697060aef146ad68b6fbb933f33e1f71ab2473f04b3fe"
    ),
}

AUDITED_ROUTING = {
    "capability:actor-world-update": [
        "DL-TOPO-002",
        "SGD-WORLD-001",
        "WVZ-MECH-001",
        "GRF-WORLD-001",
    ],
    "capability:collision-resource-resolution": ["GRF-COLL-001", "PR-CUR-010"],
    "capability:difficulty-configuration": ["PR-CUR-007"],
    "capability:input-action-normalization": ["RFC-CUR-019", "DS-CL-H-005"],
    "capability:language-target-progression": [
        "RFC-CUR-011",
        "AM-HIST-005",
        "GRF-START-001",
    ],
    "capability:nonempty-content-precondition": ["GRF-START-001", "AM-HIST-004"],
    "capability:session-feedback-surfaces": [
        "RPG-SC-005",
        "RPG-SC-007",
        "RPG-SC-009",
        "DS-CL-C-008",
        "WVZ-MECH-015",
        "WVZ-MECH-016",
        "RFC-CUR-017",
        "RFC-CUR-021",
        "RC-HIST-007",
        "PR-CUR-016",
        "DS-CL-H-005",
    ],
    "capability:time-and-frame-loop": ["RFC-CUR-008", "RFC-CUR-009", "PR-CUR-010"],
}
REQUIRED_CONTEXT = {
    "AW-HIST-061",
    "DR-SCENE-001",
    "DF-COPY-009",
    "RPG-SC-002",
    "RPG-SC-004",
    "DF-COPY-020",
    "DS-CL-C-002",
    "DS-CL-H-002",
    "RPG-ST-001",
    "RPG-ST-002",
    "RPG-ST-003",
    "RPG-ST-004",
    "RPG-ST-005",
    "RPG-ST-006",
    "RPG-ST-007",
    "RPG-ST-008",
    "RPG-ST-009",
}
SPLIT_REQUIREMENTS = (
    (
        {"AM-HIST-004", "AM-HIST-005"},
        "capability:result-accounting",
        set(),
    ),
    (
        {"GRF-WORLD-001", "GRF-COLL-001"},
        "capability:time-and-frame-loop",
        set(),
    ),
    (
        {"PR-CUR-007", "PR-CUR-010", "PR-CUR-016"},
        "capability:actor-world-update",
        set(),
    ),
    (
        {"DS-CL-H-005"},
        "",
        {
            "capability:input-action-normalization",
            "capability:session-feedback-surfaces",
        },
    ),
)

FINDING_KEYS = v4.FINDING_KEYS
BOUNDARY_EFFECT_KEYS = {
    "shared_core_ownership",
    "game_extension_ownership",
    "interface_consequence",
}
CONSUMER_KEYS = {
    *v4.v2.CONSUMER_KEYS,
    "exact_excerpt",
    "relevance_statement",
}
PER_GAME_KEYS = v4.PER_GAME_KEYS
EMBEDDED_FINDING_KEYS = v4.EMBEDDED_FINDING_KEYS
PROVENANCE_WORDS = {
    "file",
    "filename",
    "line",
    "location",
    "path",
    "import",
    "export",
    "helper",
    "test",
    "source",
    "copy",
    "occurrence",
}


@dataclass(frozen=True)
class Finding:
    """Describes one stable v5 semantic rejection."""

    code: str
    message: str


@dataclass(frozen=True)
class VerificationResult:
    """Contains a v5 state, findings, and bounded check count."""

    state: str
    findings: tuple[Finding, ...]
    checks: int

    @property
    def passed(self) -> bool:
        """Returns whether all v5 contracts are satisfied."""
        return self.state == "VERIFIED" and not self.findings


def _add(findings: list[Finding], code: str, message: str) -> None:
    """Adds one stable finding per code."""
    if code not in {item.code for item in findings}:
        findings.append(Finding(code, message))


def _load(path: Path) -> dict[str, Any]:
    """Loads one JSON object."""
    value = json.loads(path.read_text())
    if not isinstance(value, dict):
        raise ValueError(f"{path} is not a JSON object")
    return value


def _sha(path: Path) -> str:
    """Returns one raw-byte SHA-256 digest."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _digest(value: Any) -> str:
    """Returns a deterministic in-memory JSON digest."""
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def _shape(findings: list[Finding], value: Any, keys: set[str]) -> None:
    """Rejects missing, surplus, and non-object schema values."""
    if not isinstance(value, dict):
        _add(findings, "INVALID_SCHEMA", "A declared object is not an object.")
        return
    missing = keys - set(value)
    surplus = set(value) - keys
    if missing:
        _add(findings, "MISSING_REQUIRED_FIELD", f"Missing fields: {sorted(missing)}")
    if surplus:
        _add(findings, "SURPLUS_FIELD", f"Surplus fields: {sorted(surplus)}")


def _truth_contract(track_root: Path) -> dict[str, str]:
    """Returns exact v5 Red package hashes required by mapper v3."""
    paths = (
        "phase2_v5_truth_verifier.py",
        "phase2_v5_truth_verifier_test.py",
        FIXTURE_MANIFEST,
        "phase2-v5-red-report.json",
    )
    return {path: _sha(track_root / path) for path in paths}


def _verify_inputs(
    track_root: Path, findings: list[Finding]
) -> tuple[int, dict[str, Any]]:
    """Verifies v5 authority, Phase 1 truth, and all prior immutable bytes."""
    fixed = {
        DISPATCH_PATH: DISPATCH_SHA256,
        **PHASE1_INPUTS,
        **PRESERVED_V4_RED,
        **REJECTED_V2,
        v4.DISPATCH_PATH: v4.DISPATCH_SHA256,
    }
    for path, digest in fixed.items():
        candidate = track_root / path
        if not candidate.is_file() or _sha(candidate) != digest:
            _add(findings, "PHASE2_INPUT_DRIFT", f"Frozen input differs: {path}")
    if findings:
        return len(fixed), {}
    dispatch = _load(track_root / DISPATCH_PATH)
    if (
        dispatch.get("status") != "active-systemic-semantic-remediation"
        or dispatch.get("schema_version") != "apk-t9-phase2-role-dispatch.v5"
    ):
        _add(findings, "PHASE2_INPUT_DRIFT", "The v5 authority is not active.")
    old_findings: list[v4.Finding] = []
    _, inputs = v4._verify_inputs(track_root, old_findings)
    if old_findings:
        _add(findings, "PHASE2_INPUT_DRIFT", "Preserved v4 inputs differ.")
    return len(fixed) + 6, inputs


def _has_ellipsis(value: Any) -> bool:
    """Returns whether text contains a forbidden literal or Unicode ellipsis."""
    return isinstance(value, str) and ("..." in value or "…" in value)


def _exact_excerpt(value: str) -> str:
    """Returns a complete word-bounded exact evidence substring."""
    segments = [
        segment.strip()
        for segment in value.replace("…", "...").split("...")
        if len(segment.strip()) >= 24
    ]
    excerpt = max(segments, key=len) if segments else value
    if len(excerpt) > 220:
        excerpt = excerpt[:220]
        if " " in excerpt:
            excerpt = excerpt.rsplit(" ", 1)[0]
    return excerpt


def _field_value(consumer: dict[str, Any], index: dict[str, Any]) -> str | None:
    """Returns the accepted Phase 1 field text for one capability use."""
    record = index["mechanic_records"].get(consumer.get("record_id"))
    if record is None:
        return None
    field = next(
        (
            row
            for row in record["derived_fields"]
            if row["field_id"] == consumer.get("field_id")
        ),
        None,
    )
    return None if field is None else field["value"]


def _strip_use(consumer: dict[str, Any]) -> dict[str, Any]:
    """Projects a v5 capability use to its exact v4 consumer binding."""
    return {key: copy.deepcopy(consumer.get(key)) for key in v4.v2.CONSUMER_KEYS}


def _expected_per_game(refs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Builds exact readable variants from capability-use excerpts."""
    grouped: dict[str, list[dict[str, Any]]] = {}
    for ref in refs:
        grouped.setdefault(ref.get("game_id"), []).append(ref)
    return [
        {
            "game_id": game_id,
            "behavior": " | ".join(
                ref.get("exact_excerpt", "") for ref in grouped[game_id]
            ),
            "consumer_record_ids": [ref.get("record_id") for ref in grouped[game_id]],
        }
        for game_id in sorted(grouped)
    ]


def _validate_boundary_effect(
    findings: list[Finding],
    effect: Any,
    statement: Any,
    capability_name: str | None = None,
) -> None:
    """Validates distinct concrete ownership and interface consequences."""
    _shape(findings, effect, BOUNDARY_EFFECT_KEYS)
    if not isinstance(effect, dict):
        _add(
            findings,
            "MISSING_BOUNDARY_EFFECT_FIELDS",
            "Boundary effect must be a three-field consequence object.",
        )
        return
    values = [effect.get(key) for key in sorted(BOUNDARY_EFFECT_KEYS)]
    if any(
        not isinstance(value, str) or not 30 <= len(value) <= 280 for value in values
    ):
        _add(
            findings,
            "BOUNDARY_EFFECT_LENGTH",
            "Each boundary effect field must contain 30-280 characters.",
        )
    if any(_has_ellipsis(value) for value in values):
        _add(findings, "ELLIPSIS_FORBIDDEN", "Boundary effects cannot be truncated.")
    if len(set(values)) != len(values):
        _add(
            findings,
            "BOUNDARY_EFFECT_FIELDS_COPY_EACH_OTHER",
            "Boundary effect fields must state distinct consequences.",
        )
    if any(
        value == statement or (isinstance(statement, str) and statement in str(value))
        for value in values
    ):
        _add(
            findings,
            "BOUNDARY_EFFECT_COPIES_STATEMENT",
            "Boundary effects cannot copy or prefix the finding statement.",
        )
    expected_terms = {
        "shared_core_ownership": ("shared core", "owns"),
        "game_extension_ownership": ("game extension", "owns"),
        "interface_consequence": ("interface", "requires"),
    }
    for key, terms in expected_terms.items():
        value = str(effect.get(key, "")).lower()
        if not all(term in value for term in terms):
            _add(
                findings,
                "ARCHITECTURAL_CONSEQUENCE_MISSING",
                "Boundary fields must state concrete shared, extension, and interface consequences.",
            )
        if capability_name and capability_name.lower() not in value:
            _add(
                findings,
                "ARCHITECTURAL_CONSEQUENCE_MISSING",
                "Boundary consequence must name its canonical capability.",
            )


def _validate_capability_use(
    findings: list[Finding],
    consumer: Any,
    index: dict[str, Any],
) -> None:
    """Validates exact excerpt fidelity and non-provenance capability relevance."""
    _shape(findings, consumer, CONSUMER_KEYS)
    if not isinstance(consumer, dict):
        return
    excerpt = consumer.get("exact_excerpt")
    relevance = consumer.get("relevance_statement")
    if not isinstance(excerpt, str) or not excerpt:
        _add(findings, "MISSING_EXACT_EXCERPT", "Capability use lacks exact excerpt.")
    else:
        accepted = _field_value(consumer, index)
        if accepted is None or excerpt not in accepted or not 24 <= len(excerpt) <= 240:
            _add(
                findings,
                "EXCERPT_NOT_ACCEPTED_SUBSTRING",
                "Exact excerpt is not a concise substring of its accepted fact.",
            )
        if _has_ellipsis(excerpt):
            _add(findings, "ELLIPSIS_FORBIDDEN", "Exact excerpts cannot use ellipses.")
    if not isinstance(relevance, str) or not 40 <= len(relevance) <= 300:
        _add(
            findings,
            "MISSING_RELEVANCE_STATEMENT",
            "Capability use lacks a complete relevance statement.",
        )
    elif _has_ellipsis(relevance):
        _add(findings, "ELLIPSIS_FORBIDDEN", "Relevance cannot be truncated.")
    elif PROVENANCE_WORDS & set(re.findall(r"[a-z]+", relevance.lower())):
        _add(
            findings,
            "PROVENANCE_ONLY_CAPABILITY_USE",
            "Relevance promotes file, import, helper, test, or location provenance.",
        )


def _validate_readable_finding(
    findings: list[Finding],
    finding: Any,
    index: dict[str, Any],
    capability_name: str | None = None,
) -> None:
    """Validates complete statements, use excerpts, variants, and boundary effects."""
    _shape(findings, finding, FINDING_KEYS)
    if not isinstance(finding, dict):
        return
    statement = finding.get("statement")
    if not isinstance(statement, str) or not 40 <= len(statement) <= 300:
        _add(
            findings,
            "OPAQUE_FINDING_STATEMENT",
            "Finding statement must contain 40-300 complete characters.",
        )
    if _has_ellipsis(statement):
        _add(findings, "ELLIPSIS_FORBIDDEN", "Finding statement cannot be truncated.")
    refs = finding.get("consumer_refs", [])
    for consumer in refs if isinstance(refs, list) else []:
        _validate_capability_use(findings, consumer, index)
    expected = _expected_per_game(refs) if isinstance(refs, list) else []
    actual = finding.get("per_game_behaviors")
    if not isinstance(actual, list) or not actual:
        _add(
            findings,
            "PER_GAME_BEHAVIOR_MISSING",
            "Finding lacks per-game behavior.",
        )
    else:
        for row in actual:
            _shape(findings, row, PER_GAME_KEYS)
            behavior = row.get("behavior") if isinstance(row, dict) else None
            if (
                not isinstance(behavior, str)
                or not 24 <= len(behavior) <= 480
                or _has_ellipsis(behavior)
            ):
                _add(
                    findings,
                    "PER_GAME_BEHAVIOR_LENGTH",
                    "Per-game behavior must be complete and contain 24-480 characters.",
                )
        if actual != expected:
            _add(
                findings,
                "GAME_BEHAVIOR_CONSUMER_MISMATCH",
                "Per-game behavior must exactly join its accepted excerpts.",
            )
    _validate_boundary_effect(
        findings, finding.get("boundary_effect"), statement, capability_name
    )


def _embedded(finding: dict[str, Any]) -> dict[str, Any]:
    """Builds the compact readable finding embedded downstream."""
    return {
        key: copy.deepcopy(finding.get(key))
        for key in (
            "finding_id",
            "statement",
            "per_game_behaviors",
            "boundary_effect",
        )
    }


def _usage_map(
    classifications: dict[str, Any],
) -> tuple[dict[str, set[str]], set[str], list[tuple[str, str]]]:
    """Builds claim-to-capability usage, explicit context, and duplicate rows."""
    uses: dict[str, set[str]] = {}
    duplicates: list[tuple[str, str]] = []
    for capability in classifications.get("capabilities", []):
        capability_id = capability.get("capability_id")
        seen: set[str] = set()
        for consumer in capability.get("consumers", []):
            record_id = consumer.get("record_id")
            claim_id = consumer.get("claim_id")
            if record_id in seen:
                duplicates.append((capability_id, record_id))
            seen.add(record_id)
            uses.setdefault(claim_id, set()).add(capability_id)
    context = {
        row.get("consumer", {}).get("claim_id")
        for row in classifications.get("non_capability_context", [])
        if isinstance(row, dict)
    }
    return uses, context, duplicates


def _validate_audited_routing(
    findings: list[Finding],
    uses: dict[str, set[str]],
    context: set[str],
) -> None:
    """Validates every product-owner audited capability and context route."""
    for capability_id, claim_ids in AUDITED_ROUTING.items():
        for claim_id in claim_ids:
            if capability_id not in uses.get(claim_id, set()):
                _add(
                    findings,
                    "AUDITED_ROUTING_REGRESSION",
                    f"{claim_id} is absent from {capability_id}.",
                )
    for claim_id in REQUIRED_CONTEXT:
        if claim_id not in context or uses.get(claim_id):
            _add(
                findings,
                "AUDITED_CONTEXT_REGRESSION",
                f"{claim_id} is not explicit non-capability context.",
            )
    for claim_ids, forbidden_only, required in SPLIT_REQUIREMENTS:
        if required:
            if any(
                not required.issubset(uses.get(claim_id, set()))
                for claim_id in claim_ids
            ):
                _add(
                    findings,
                    "MULTI_CAPABILITY_EVIDENCE_MISSING",
                    "A required multi-capability claim was partitioned once.",
                )
        elif all(
            uses.get(claim_id) and uses.get(claim_id, set()) <= {forbidden_only}
            for claim_id in claim_ids
        ):
            _add(
                findings,
                "SEMANTIC_SPLIT_REQUIREMENT_MISSING",
                "A multi-behavior source group remains only in its rejected capability.",
            )


def _validate_routing(
    findings: list[Finding],
    classifications: dict[str, Any],
    index: dict[str, Any],
) -> None:
    """Validates multi-capability use and complete mechanic/context accounting."""
    uses, context, duplicates = _usage_map(classifications)
    if duplicates:
        _add(
            findings,
            "DUPLICATE_USE_WITHIN_CAPABILITY",
            "A mechanic record is used twice within one capability.",
        )
    capability_records = {
        consumer.get("record_id")
        for capability in classifications.get("capabilities", [])
        for consumer in capability.get("consumers", [])
    }
    context_records = [
        row.get("consumer", {}).get("record_id")
        for row in classifications.get("non_capability_context", [])
    ]
    expected = set(index["mechanic_records"])
    if (
        capability_records | set(context_records) != expected
        or len(context_records) != len(set(context_records))
        or capability_records & set(context_records)
    ):
        _add(
            findings,
            "MECHANIC_ACCOUNTING_MISMATCH",
            "Every mechanic must be capability evidence or explicit context.",
        )
    _validate_audited_routing(findings, uses, context)


def _project_to_v4(
    bundle: dict[str, dict[str, Any]],
    track_root: Path,
    inputs: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    """Projects v5 semantics into v4 structural/evidence validation."""
    comparisons = copy.deepcopy(bundle[MAPPER_OUTPUTS[0]])
    index = v4.v2._indices(inputs)
    projected_findings: dict[str, dict[str, Any]] = {}
    for batch in comparisons.get("evidence_batches", []):
        for kind in ("similarities", "differences"):
            rows = []
            for finding in batch.get(kind, []):
                base = {
                    "finding_id": finding.get("finding_id"),
                    "basis": finding.get("basis"),
                    "consumer_refs": [
                        _strip_use(ref) for ref in finding.get("consumer_refs", [])
                    ],
                }
                projected = v4._enrich_finding(base, kind, index)
                rows.append(projected)
                projected_findings[projected["finding_id"]] = projected
            batch[kind] = rows
    classifications = copy.deepcopy(bundle[MAPPER_OUTPUTS[1]])
    for capability in classifications.get("capabilities", []):
        capability["consumers"] = [
            _strip_use(ref) for ref in capability.get("consumers", [])
        ]
        capability["similarities"] = [
            v4._embedded(projected_findings[row.get("finding_id")])
            for row in capability.get("similarities", [])
        ]
        capability["differences"] = [
            v4._embedded(projected_findings[row.get("finding_id")])
            for row in capability.get("differences", [])
        ]
    boundaries = {
        "schema_version": "apk-t9-phase2-extension-boundaries.v4",
        "phase1_bindings": copy.deepcopy(
            bundle[MAPPER_OUTPUTS[2]].get("phase1_bindings")
        ),
        "boundaries": [],
    }
    capability_by_id = {
        row["capability_id"]: row for row in classifications.get("capabilities", [])
    }
    for original in bundle[MAPPER_OUTPUTS[2]].get("boundaries", []):
        capability = capability_by_id[original["capability_id"]]
        boundaries["boundaries"].append(
            {
                "boundary_id": original["boundary_id"],
                "capability_id": original["capability_id"],
                "shared_core": copy.deepcopy(capability["similarities"]),
                "extension_points": (
                    copy.deepcopy(capability["differences"])
                    if capability["disposition"] in {"standardize", "extend"}
                    else []
                ),
                "incompatibility_differences": (
                    copy.deepcopy(capability["differences"])
                    if capability["disposition"] in {"game-specific", "bespoke"}
                    else []
                ),
            }
        )
    projected = {
        v4.MAPPER_OUTPUTS[0]: comparisons,
        v4.MAPPER_OUTPUTS[1]: classifications,
        v4.MAPPER_OUTPUTS[2]: boundaries,
        v4.MAPPER_OUTPUTS[3]: copy.deepcopy(bundle[MAPPER_OUTPUTS[3]]),
    }
    projected[v4.MAPPER_RECEIPT] = {
        "agent_ref": "/root/phase5_review_a/t9_phase0_final_reviewer",
        "owner_role": "capability-mapper",
        "task_id": "phase2-readable-findings-mapper-v2",
        "dispatch_sha256": v4.DISPATCH_SHA256,
        "truth_contract": v4._truth_contract(track_root),
        "output_hashes": {
            path: v4._digest(projected[path]) for path in v4.MAPPER_OUTPUTS
        },
        "status": "candidate",
    }
    return projected


def _validate_bundle(
    track_root: Path,
    inputs: dict[str, Any],
    bundle: dict[str, dict[str, Any]],
    *,
    output_hashes: dict[str, str] | None = None,
) -> tuple[list[Finding], int]:
    """Validates v5 semantic/readable outputs and every preserved v4/v2 rule."""
    findings: list[Finding] = []
    index = v4.v2._indices(inputs)
    comparisons = bundle[MAPPER_OUTPUTS[0]]
    classifications = bundle[MAPPER_OUTPUTS[1]]
    boundaries = bundle[MAPPER_OUTPUTS[2]]
    receipt = bundle[MAPPER_RECEIPT]
    _shape(findings, comparisons, v4.COMPARISON_TOP_KEYS)
    _shape(findings, classifications, v4.CLASSIFICATION_TOP_KEYS)
    _shape(findings, boundaries, v4.BOUNDARY_TOP_KEYS)
    _shape(findings, bundle[MAPPER_OUTPUTS[3]], v4.v2.DEPENDENCY_TOP_KEYS)
    batch_by_capability: dict[str, list[dict[str, Any]]] = {}
    finding_by_id: dict[str, dict[str, Any]] = {}
    for batch in comparisons.get("evidence_batches", []):
        _shape(findings, batch, v4.BATCH_KEYS)
        batch_by_capability.setdefault(batch.get("capability_id"), []).append(batch)
        for kind in ("similarities", "differences"):
            for finding in batch.get(kind, []):
                _validate_readable_finding(findings, finding, index)
                finding_by_id[finding.get("finding_id")] = finding
    capabilities = {
        row.get("capability_id"): row for row in classifications.get("capabilities", [])
    }
    for capability_id, capability in capabilities.items():
        _shape(findings, capability, v4.CAPABILITY_KEYS)
        name = capability.get("name")
        expected_similarities = [
            _embedded(finding)
            for batch in batch_by_capability.get(capability_id, [])
            for finding in batch.get("similarities", [])
        ]
        expected_differences = [
            _embedded(finding)
            for batch in batch_by_capability.get(capability_id, [])
            for finding in batch.get("differences", [])
        ]
        if (
            capability.get("similarities") != expected_similarities
            or capability.get("differences") != expected_differences
        ):
            _add(
                findings,
                "CLASSIFICATION_READABLE_FINDING_DROPPED",
                "Capability does not embed all readable findings.",
            )
        expected_consumers = {
            _digest(ref): ref
            for batch in batch_by_capability.get(capability_id, [])
            for kind in ("similarities", "differences")
            for finding in batch.get(kind, [])
            for ref in finding.get("consumer_refs", [])
        }
        actual_consumers = capability.get("consumers", [])
        if {_digest(ref) for ref in actual_consumers} != set(expected_consumers) or len(
            actual_consumers
        ) != len({_digest(ref) for ref in actual_consumers}):
            _add(
                findings,
                "CAPABILITY_USE_AGGREGATION_MISMATCH",
                "Capability consumers do not exactly aggregate evidence uses.",
            )
        for finding in [
            row
            for batch in batch_by_capability.get(capability_id, [])
            for kind in ("similarities", "differences")
            for row in batch.get(kind, [])
        ]:
            _validate_boundary_effect(
                findings, finding.get("boundary_effect"), finding.get("statement"), name
            )
    for boundary in boundaries.get("boundaries", []):
        _shape(findings, boundary, v4.BOUNDARY_KEYS)
        capability = capabilities.get(boundary.get("capability_id"))
        if capability is None:
            continue
        differences = capability.get("differences", [])
        expected_extensions = (
            differences
            if capability.get("disposition") in {"standardize", "extend"}
            else []
        )
        expected_incompatibilities = (
            differences
            if capability.get("disposition") in {"game-specific", "bespoke"}
            else []
        )
        if (
            boundary.get("shared_core") != capability.get("similarities")
            or boundary.get("extension_points") != expected_extensions
            or boundary.get("incompatibility_differences") != expected_incompatibilities
        ):
            _add(
                findings,
                "BOUNDARY_READABLE_INCOMPATIBILITY_DROPPED",
                "Boundary embeddings differ from canonical findings.",
            )
    _validate_routing(findings, classifications, index)
    _shape(findings, receipt, v4.RECEIPT_KEYS)
    if (
        receipt.get("owner_role") != "capability-mapper"
        or receipt.get("task_id") != "phase2-systemic-semantic-mapper-v3"
        or receipt.get("dispatch_sha256") != DISPATCH_SHA256
        or receipt.get("truth_contract") != _truth_contract(track_root)
    ):
        _add(findings, "STALE_OR_WRONG_RECEIPT", "Mapper v3 receipt differs.")
    expected_hashes = output_hashes or {
        path: _digest(bundle[path]) for path in MAPPER_OUTPUTS
    }
    if receipt.get("output_hashes") != expected_hashes:
        _add(findings, "TAMPERED_HASH", "Mapper v3 output hashes differ.")
    output_bytes = {
        path: len(json.dumps(bundle[path], separators=(",", ":")).encode())
        for path in MAPPER_OUTPUTS
    }
    if output_hashes is not None:
        output_bytes = {
            path: (track_root / path).stat().st_size for path in MAPPER_OUTPUTS
        }
    if any(size > MAX_OUTPUT_BYTES for size in output_bytes.values()):
        _add(
            findings,
            "OUTPUT_BUDGET_EXCEEDED",
            "A mapper v3 output exceeds 1 MiB.",
        )
    projected = _project_to_v4(bundle, track_root, inputs)
    old_findings, checks = v4._validate_bundle(track_root, inputs, projected)
    own_codes = {item.code for item in findings}
    for item in old_findings:
        if (
            item.code == "MECHANIC_ROUTING_MISMATCH"
            and "MECHANIC_ACCOUNTING_MISMATCH" not in own_codes
        ):
            continue
        _add(findings, item.code, item.message)
    return sorted(findings, key=lambda item: item.code), checks + len(finding_by_id)


def _claim_records(inputs: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Builds a unique accepted mechanic record index by source claim ID."""
    return {row["source_claim_id"]: row for row in inputs["mechanic"]["records"]}


def _capability_name(capability_id: str) -> str:
    """Returns a readable title from one canonical capability ID."""
    return capability_id.removeprefix("capability:").replace("-", " ").title()


def _capability_use(record: dict[str, Any], capability_id: str) -> dict[str, Any]:
    """Builds one exact, extractive, readable capability-use record."""
    base = v4.v2._consumer(record)
    value = record["derived_fields"][0]["value"]
    name = _capability_name(capability_id)
    return {
        **base,
        "exact_excerpt": _exact_excerpt(value),
        "relevance_statement": (
            f"{name} uses this accepted behavior as direct runtime evidence "
            f"for the {record['game_id']} game-facing contract."
        ),
    }


def _boundary_effect(capability_id: str) -> dict[str, str]:
    """Builds three distinct capability-specific architectural consequences."""
    name = _capability_name(capability_id)
    return {
        "shared_core_ownership": (
            f"{name} shared core owns the evidence-bound contract shared by "
            "participating games."
        ),
        "game_extension_ownership": (
            f"{name} game extension owns each game-specific behavior and its "
            "adapter implementation."
        ),
        "interface_consequence": (
            f"{name} requires an interface that separates shared orchestration "
            "from game-owned implementations."
        ),
    }


def _finding(
    capability_id: str,
    finding_id: str,
    refs: list[dict[str, Any]],
) -> dict[str, Any]:
    """Builds one complete evidence-grounded difference finding."""
    behaviors = _expected_per_game(refs)
    words = re.findall(
        r"[A-Za-z0-9]+",
        " ".join(row["behavior"] for row in behaviors),
    )
    statement = "Meaningful difference: " + " ".join(words[:28])
    if len(statement) > 280:
        statement = statement[:280].rsplit(" ", 1)[0]
    return {
        "finding_id": finding_id,
        "basis": "exact-accepted-behavior",
        "statement": statement,
        "per_game_behaviors": behaviors,
        "boundary_effect": _boundary_effect(capability_id),
        "consumer_refs": refs,
    }


def _canonical_bundle(
    track_root: Path, inputs: dict[str, Any]
) -> dict[str, dict[str, Any]]:
    """Builds a valid multi-capability audited-routing fixture baseline."""
    index = v4.v2._indices(inputs)
    records = _claim_records(inputs)
    forbidden_context_records = {
        records[claim_id]["record_id"]
        for claim_id in REQUIRED_CONTEXT
        if claim_id in records
    }
    strong_fillers = [
        record
        for record in inputs["mechanic"]["records"]
        if record["record_id"] not in forbidden_context_records
        and index["source_claims"][(record["game_id"], record["source_claim_id"])][
            "confidence"
        ]
        in v4.v2.STRONG_CONFIDENCE
        and record["scope_status"] == "resolved"
    ]
    batches = []
    capabilities = []
    boundaries = []
    globally_used: set[str] = set()
    filler_offset = 0
    for capability_id, claim_ids in AUDITED_ROUTING.items():
        capability_findings = []
        capability_refs: dict[str, dict[str, Any]] = {}
        used_in_capability: set[str] = set()
        for position in range(0, len(claim_ids), 2):
            chunk = [
                records[claim_id] for claim_id in claim_ids[position : position + 2]
            ]
            chunk_games = {record["game_id"] for record in chunk}
            filler = next(
                record
                for record in strong_fillers[filler_offset:]
                + strong_fillers[:filler_offset]
                if record["record_id"] not in used_in_capability
                and record["game_id"] not in chunk_games
            )
            filler_offset = (strong_fillers.index(filler) + 1) % len(strong_fillers)
            selected = [*chunk, filler]
            refs = [_capability_use(record, capability_id) for record in selected]
            finding_id = f"difference:{capability_id.removeprefix('capability:')}:{position // 2 + 1:02d}"
            finding = _finding(capability_id, finding_id, refs)
            batch_id = f"batch:{capability_id.removeprefix('capability:')}:{position // 2 + 1:02d}"
            batches.append(
                {
                    "batch_id": batch_id,
                    "capability_id": capability_id,
                    "game_ids": list(dict.fromkeys(ref["game_id"] for ref in refs)),
                    "similarities": [],
                    "differences": [finding],
                }
            )
            capability_findings.append(finding)
            for ref in refs:
                capability_refs[ref["record_id"]] = ref
                used_in_capability.add(ref["record_id"])
                globally_used.add(ref["record_id"])
        name = _capability_name(capability_id)
        capabilities.append(
            {
                "capability_id": capability_id,
                "name": name,
                "behavior_contract": (
                    f"{name} preserves each accepted game behavior through an "
                    "evidence-bound shared interface and game-owned implementation."
                ),
                "owner": "game-extension",
                "extension_boundary": f"boundary:{capability_id.removeprefix('capability:')}",
                "tests": [
                    {
                        "test_id": f"test:{finding['finding_id']}",
                        "assertion": "preserve-game-difference",
                        "finding_ids": [finding["finding_id"]],
                    }
                    for finding in capability_findings
                ],
                "disposition": "bespoke",
                "evidence_batch_ids": [
                    batch["batch_id"]
                    for batch in batches
                    if batch["capability_id"] == capability_id
                ],
                "consumers": list(capability_refs.values()),
                "similarities": [],
                "differences": [_embedded(finding) for finding in capability_findings],
            }
        )
        boundaries.append(
            {
                "boundary_id": f"boundary:{capability_id.removeprefix('capability:')}",
                "capability_id": capability_id,
                "shared_core": [],
                "extension_points": [],
                "incompatibility_differences": [
                    _embedded(finding) for finding in capability_findings
                ],
            }
        )
    comparisons = {
        "schema_version": "apk-t9-phase2-capability-comparisons.v5",
        "phase1_bindings": v4.v2._bindings(),
        "source_document_ids": list(index["documents"]),
        "batch_policy": {
            "games_per_batch_min": 2,
            "games_per_batch_max": 3,
            "overlap_allowed": True,
            "whole_game_partition_required": False,
        },
        "evidence_batches": batches,
    }
    classifications = {
        "schema_version": "apk-t9-phase2-capability-classification.v5",
        "phase1_bindings": v4.v2._bindings(),
        "capabilities": capabilities,
        "non_capability_context": [
            {
                "consumer": v4.v2._consumer(record),
                "disposition": "non-capability-context",
                "rationale": "No audited cross-game capability use is established.",
            }
            for record in inputs["mechanic"]["records"]
            if record["record_id"] not in globally_used
        ],
    }
    boundary_output = {
        "schema_version": "apk-t9-phase2-extension-boundaries.v5",
        "phase1_bindings": v4.v2._bindings(),
        "boundaries": boundaries,
    }
    projected_stub = {
        v4.MAPPER_OUTPUTS[0]: copy.deepcopy(comparisons),
        v4.MAPPER_OUTPUTS[1]: copy.deepcopy(classifications),
        v4.MAPPER_OUTPUTS[2]: copy.deepcopy(boundary_output),
        v4.MAPPER_OUTPUTS[3]: {},
        v4.MAPPER_RECEIPT: {},
    }
    # Dependencies use only comparison evidence and capability membership.
    comparisons_v2 = copy.deepcopy(comparisons)
    for batch in comparisons_v2["evidence_batches"]:
        for kind in ("similarities", "differences"):
            for finding in batch[kind]:
                finding["consumer_refs"] = [
                    _strip_use(ref) for ref in finding["consumer_refs"]
                ]
                finding.pop("statement")
                finding.pop("per_game_behaviors")
                finding.pop("boundary_effect")
    classifications_v2 = copy.deepcopy(classifications)
    for capability in classifications_v2["capabilities"]:
        capability["consumers"] = [_strip_use(ref) for ref in capability["consumers"]]
    dependencies = v4.v2._canonical_dependencies(
        inputs, comparisons_v2, classifications_v2
    )
    bundle = {
        MAPPER_OUTPUTS[0]: comparisons,
        MAPPER_OUTPUTS[1]: classifications,
        MAPPER_OUTPUTS[2]: boundary_output,
        MAPPER_OUTPUTS[3]: dependencies,
        MAPPER_RECEIPT: {
            "agent_ref": "/root/phase5_review_a/t9_phase0_final_reviewer",
            "owner_role": "capability-mapper",
            "task_id": "phase2-systemic-semantic-mapper-v3",
            "dispatch_sha256": DISPATCH_SHA256,
            "truth_contract": _truth_contract(track_root),
            "output_hashes": {},
            "status": "candidate",
        },
    }
    bundle[MAPPER_RECEIPT]["output_hashes"] = {
        path: _digest(bundle[path]) for path in MAPPER_OUTPUTS
    }
    del projected_stub
    return bundle


def _validate_rejected_v2(track_root: Path, inputs: dict[str, Any]) -> list[Finding]:
    """Proves the rejected mapper v2 candidate fails systemic v5 semantics."""
    comparisons = _load(track_root / "phase2-capability-comparisons-v2.json")
    classifications = _load(track_root / "phase2-capability-classification-v2.json")
    findings: list[Finding] = []
    for batch in comparisons.get("evidence_batches", []):
        for kind in ("similarities", "differences"):
            for finding in batch.get(kind, []):
                if _has_ellipsis(finding.get("statement")):
                    _add(
                        findings,
                        "ELLIPSIS_FORBIDDEN",
                        "Rejected statement is truncated.",
                    )
                effect = finding.get("boundary_effect")
                if isinstance(effect, str):
                    _add(
                        findings,
                        "MISSING_BOUNDARY_EFFECT_FIELDS",
                        "Rejected boundary effect is not a consequence object.",
                    )
                    if (
                        isinstance(finding.get("statement"), str)
                        and finding["statement"] in effect
                    ):
                        _add(
                            findings,
                            "BOUNDARY_EFFECT_COPIES_STATEMENT",
                            "Rejected effect copies its statement.",
                        )
                for ref in finding.get("consumer_refs", []):
                    if "exact_excerpt" not in ref:
                        _add(
                            findings,
                            "MISSING_EXACT_EXCERPT",
                            "Rejected capability use lacks exact excerpt.",
                        )
                    if "relevance_statement" not in ref:
                        _add(
                            findings,
                            "MISSING_RELEVANCE_STATEMENT",
                            "Rejected capability use lacks relevance.",
                        )
    uses, context, _ = _usage_map(classifications)
    _validate_audited_routing(findings, uses, context)
    return sorted(findings, key=lambda item: item.code)


def _load_fixture(track_root: Path, path: Path) -> dict[str, Any]:
    """Loads a v5 fixture only when its manifest binding is exact."""
    manifest = _load(track_root / FIXTURE_MANIFEST)
    if (
        manifest.get("fixture_count") != len(manifest.get("fixtures", []))
        or len(manifest.get("fixtures", [])) > MAX_FIXTURE_FILES
    ):
        raise ValueError("fixture budget differs")
    relative = path.resolve().relative_to(track_root.resolve()).as_posix()
    row = next(item for item in manifest["fixtures"] if item["path"] == relative)
    if _sha(path) != row["sha256"]:
        raise ValueError("fixture binding differs")
    return _load(path)


def _apply_finding_probe(finding: dict[str, Any], case: dict[str, Any]) -> None:
    """Applies one isolated v5 readable-evidence attack."""
    op = case["mutation"]["operation"]
    if op == "literal-ellipsis":
        finding["statement"] += "..."
    elif op == "unicode-ellipsis":
        finding["statement"] += "…"
    elif op == "boundary-effect-copies-statement":
        finding["boundary_effect"]["interface_consequence"] = finding["statement"]
    elif op == "boundary-effect-fields-copy-each-other":
        finding["boundary_effect"]["interface_consequence"] = finding[
            "boundary_effect"
        ]["shared_core_ownership"]
    elif op == "missing-exact-excerpt":
        del finding["consumer_refs"][0]["exact_excerpt"]
    elif op == "excerpt-not-substring-of-accepted-fact":
        finding["consumer_refs"][0]["exact_excerpt"] = (
            "This invented excerpt is not present in accepted evidence."
        )
    elif op == "provenance-only-capability-use":
        finding["consumer_refs"][0]["relevance_statement"] = (
            "This file location and test helper path provide capability evidence."
        )
    else:
        raise ValueError(f"unknown finding probe {op}")


def _apply_routing_probe(
    uses: dict[str, set[str]],
    context: set[str],
    case: dict[str, Any],
) -> None:
    """Applies one isolated audited-routing or multi-capability attack."""
    mutation = case["mutation"]
    op = mutation["operation"]
    claim_id = mutation.get("claim_id")
    capability_id = mutation.get("capability_id")
    if op == "audited-routing-regression":
        uses.setdefault(claim_id, set()).discard(capability_id)
    elif op == "audited-context-regression":
        context.discard(claim_id)
        uses.setdefault(claim_id, set()).add("capability:session-feedback-surfaces")
    elif op == "single-capability-partition-for-multibehavior-claim":
        uses["DS-CL-H-005"] = {"capability:input-action-normalization"}
    elif op == "split-requirement-regression":
        for target in mutation["claim_ids"]:
            uses[target] = {mutation["forbidden_capability"]}
    else:
        raise ValueError(f"unknown routing probe {op}")


def verify_phase2(
    repo_root: Path, track_root: Path, fixture_path: Path | None = None
) -> VerificationResult:
    """Verifies v5 authority, counterexamples, lifecycle Red, or mapper v3."""
    del repo_root
    findings: list[Finding] = []
    checks, inputs = _verify_inputs(track_root, findings)
    if findings:
        return VerificationResult("INVALID", tuple(findings), checks)
    if fixture_path is not None:
        try:
            fixture = _load_fixture(track_root, fixture_path)
            if all(
                case.get("contract") not in {"finding-v5", "routing-v5"}
                for case in fixture["cases"]
            ):
                old_result = v4.verify_phase2(Path("."), track_root, fixture_path)
                return VerificationResult(
                    "INVALID",
                    tuple(
                        Finding(item.code, item.message) for item in old_result.findings
                    ),
                    checks + old_result.checks,
                )
            for case in fixture["cases"]:
                contract = case.get("contract", "preserved-v4")
                if contract == "preserved-v4":
                    old = v4._canonical_bundle(track_root, inputs)
                    v4._apply_readability_fixture(track_root, inputs, old, case)
                    actual_rows, case_checks = v4._validate_bundle(
                        track_root, inputs, old
                    )
                    actual = {item.code for item in actual_rows}
                    findings.extend(
                        Finding(item.code, item.message) for item in actual_rows
                    )
                elif contract == "finding-v5":
                    bundle = _canonical_bundle(track_root, inputs)
                    finding = bundle[MAPPER_OUTPUTS[0]]["evidence_batches"][0][
                        "differences"
                    ][0]
                    _apply_finding_probe(finding, case)
                    probe: list[Finding] = []
                    _validate_readable_finding(
                        probe,
                        finding,
                        v4.v2._indices(inputs),
                        _capability_name(
                            bundle[MAPPER_OUTPUTS[0]]["evidence_batches"][0][
                                "capability_id"
                            ]
                        ),
                    )
                    actual = {item.code for item in probe}
                    findings.extend(probe)
                    case_checks = 1
                elif contract == "routing-v5":
                    bundle = _canonical_bundle(track_root, inputs)
                    uses, context, _ = _usage_map(bundle[MAPPER_OUTPUTS[1]])
                    _apply_routing_probe(uses, context, case)
                    probe = []
                    _validate_audited_routing(probe, uses, context)
                    actual = {item.code for item in probe}
                    findings.extend(probe)
                    case_checks = 1
                else:
                    raise ValueError("unknown fixture contract")
                if actual != set(case["expected_codes"]):
                    _add(
                        findings,
                        "FIXTURE_CASE_EXPECTATION_MISMATCH",
                        f"{case['id']} emitted {sorted(actual)}.",
                    )
                checks += case_checks
        except (KeyError, OSError, ValueError, StopIteration, json.JSONDecodeError):
            _add(findings, "INVALID_FIXTURE_BINDING", "A v5 fixture is not bound.")
        return VerificationResult(
            "INVALID", tuple(sorted(findings, key=lambda item: item.code)), checks
        )
    missing = [
        path
        for path in (*MAPPER_OUTPUTS, MAPPER_RECEIPT)
        if not (track_root / path).is_file()
    ]
    if missing:
        _add(
            findings,
            "PHASE2_MAPPER_V3_OUTPUTS_MISSING",
            f"Missing mapper v3 outputs: {', '.join(missing)}",
        )
        return VerificationResult(
            "RED_WAITING_FOR_MAPPER_V3_OUTPUTS", tuple(findings), checks
        )
    try:
        bundle = {
            path: _load(track_root / path) for path in (*MAPPER_OUTPUTS, MAPPER_RECEIPT)
        }
        output_hashes = {path: _sha(track_root / path) for path in MAPPER_OUTPUTS}
        candidate_findings, candidate_checks = _validate_bundle(
            track_root, inputs, bundle, output_hashes=output_hashes
        )
        findings.extend(candidate_findings)
        checks += candidate_checks
    except (KeyError, OSError, ValueError, TypeError, json.JSONDecodeError):
        _add(findings, "INVALID_SCHEMA", "Mapper v3 outputs cannot be validated.")
    return VerificationResult(
        "VERIFIED" if not findings else "INVALID",
        tuple(sorted(findings, key=lambda item: item.code)),
        checks,
    )


def _parser() -> argparse.ArgumentParser:
    """Builds the v5 verifier command-line parser."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--track-root", type=Path, required=True)
    parser.add_argument("--fixture", type=Path)
    parser.add_argument("--expect-codes", nargs="*")
    return parser


def main(argv: list[str] | None = None) -> int:
    """Runs v5 verification and emits a stable JSON result."""
    args = _parser().parse_args(argv)
    result = verify_phase2(args.repo_root, args.track_root, args.fixture)
    print(
        json.dumps(
            {
                "schema_version": "apk-t9-phase2-v5-verification-result.v1",
                "state": result.state,
                "passed": result.passed,
                "checks": result.checks,
                "findings": [
                    {"code": item.code, "message": item.message}
                    for item in result.findings
                ],
            },
            indent=2,
            sort_keys=True,
        )
    )
    if args.expect_codes is not None:
        return (
            0
            if {item.code for item in result.findings} == set(args.expect_codes)
            else 1
        )
    return 0 if result.passed else 1


if __name__ == "__main__":
    sys.exit(main())
