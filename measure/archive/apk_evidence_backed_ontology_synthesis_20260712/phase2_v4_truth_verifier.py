#!/usr/bin/env python3
"""Verifies Phase 2 v4 readable capability findings without weakening v2 semantics."""

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

import phase2_v2_truth_verifier as v2

TRACK_ID = "apk_evidence_backed_ontology_synthesis_20260712"
DISPATCH_PATH = "phase2-role-dispatch-v4.json"
DISPATCH_SHA256 = "0bd25f2ddfd303c19717b7fb3432a6ab01a416be9a44830f23e6afe444f9cd0b"
MAPPER_OUTPUTS = (
    "phase2-capability-comparisons-v2.json",
    "phase2-capability-classification-v2.json",
    "phase2-extension-boundaries-v2.json",
    "phase2-claim-dependency-edges-v2.json",
)
MAPPER_RECEIPT = "role-receipts/phase2/capability-mapper-v2.json"
FIXTURE_MANIFEST = "phase2-v4-fixture-manifest.json"
MAX_FIXTURE_FILES = 16
MAX_OUTPUT_BYTES = 1_048_576

PHASE1_INPUTS = {
    v2.PHASE1_ACCEPTANCE_PATH: v2.PHASE1_ACCEPTANCE_SHA256,
    **v2.PHASE1_INPUTS,
}
PRESERVED_V2_RED = {
    "phase2_v2_truth_verifier.py": (
        "e0d87971d76a38812e9db7471f729b045817e19c8e47287db69cbfd687a1d5fd"
    ),
    "phase2_v2_truth_verifier_test.py": (
        "a5909e5f4bc647475ec132eb65fd24cce3a1fad6230329f505ca39380af95d61"
    ),
    "phase2-v2-fixture-manifest.json": (
        "4d4b0285080bca1f9edf767db4446a733cf29aa3d19ccc3dd07c120e2e2ec11b"
    ),
    "phase2-v2-red-report.json": (
        "c3f4e6a2a226d4bec0ae221a96b3c1c856a23cef47f8c32f0dd109bd6ef2021e"
    ),
    "role-receipts/phase2/truth-test-author-v2.json": (
        "4340ff91ad3a0ca70bcaf239d7793b812eee96fdf4ac9f7b1b37c2249ec9b36d"
    ),
}
PRESERVED_V3_DRAFTS = {
    "phase2_v3_truth_verifier.py": (
        "a3bbb40549a236c33274f537ba2fab83d4ff53463dd92e880c6404501f37c5df"
    ),
    "phase2_v3_truth_verifier_test.py": (
        "58ede0c2d0d76ea882646b2d80e950bacf1166ed7c206974b66091968dc6f129"
    ),
    "phase2-v3-fixture-manifest.json": (
        "2ba5982af4814826c3e41d1ffdc509664a9bb8715848e908ad61c36dc28730d7"
    ),
}
REJECTED_V1 = {
    "phase2-capability-comparisons-v1.json": (
        "776b97fc62073234c5152d8323985eb23a62066d4ff7717e4da0e1704df33c89"
    ),
    "phase2-capability-classification-v1.json": (
        "9ac4c3cb2c1aafc099878d40458f988f93a02fc1ab9f6c400003bc17d3ba6636"
    ),
    "phase2-extension-boundaries-v1.json": (
        "b869ed12f8443f8d08eddd0de8e4448099ae9ef35a7f7f6253a2a29293deb130"
    ),
    "phase2-claim-dependency-edges-v1.json": (
        "064785f673de2902083089ba6174960f2d6210c331464c35504cea88c44beb19"
    ),
    "role-receipts/phase2/capability-mapper.json": (
        "c5362b5ab897aba9bcb603fd62b7650c5f9ec82e711fb535405df6587c3399e7"
    ),
}

COMPARISON_TOP_KEYS = v2.COMPARISON_TOP_KEYS
BATCH_KEYS = v2.BATCH_KEYS
FINDING_KEYS = {
    "finding_id",
    "basis",
    "statement",
    "per_game_behaviors",
    "boundary_effect",
    "consumer_refs",
}
PER_GAME_KEYS = {"game_id", "behavior", "consumer_record_ids"}
EMBEDDED_FINDING_KEYS = {
    "finding_id",
    "statement",
    "per_game_behaviors",
    "boundary_effect",
}
CAPABILITY_KEYS = v2.CAPABILITY_KEYS
CLASSIFICATION_TOP_KEYS = v2.CLASSIFICATION_TOP_KEYS
BOUNDARY_TOP_KEYS = v2.BOUNDARY_TOP_KEYS
BOUNDARY_KEYS = {
    "boundary_id",
    "capability_id",
    "shared_core",
    "extension_points",
    "incompatibility_differences",
}
RECEIPT_KEYS = v2.RECEIPT_KEYS
CONTROLLED_WORDS = {
    "shared",
    "behavior",
    "across",
    "meaningful",
    "difference",
    "game",
    "games",
    "and",
    "the",
    "this",
    "that",
    "with",
    "from",
    "into",
    "while",
    "core",
    "extension",
    "point",
    "incompatibility",
}


@dataclass(frozen=True)
class Finding:
    """Describes one stable v4 truth-contract rejection."""

    code: str
    message: str


@dataclass(frozen=True)
class VerificationResult:
    """Contains one v4 verifier state, findings, and bounded check count."""

    state: str
    findings: tuple[Finding, ...]
    checks: int

    @property
    def passed(self) -> bool:
        """Returns whether the v4 candidate satisfies every contract."""
        return self.state == "VERIFIED" and not self.findings


def _add(findings: list[Finding], code: str, message: str) -> None:
    """Adds one stable finding per code."""
    if code not in {item.code for item in findings}:
        findings.append(Finding(code, message))


def _load(path: Path) -> dict[str, Any]:
    """Loads a JSON object from one local artifact."""
    value = json.loads(path.read_text())
    if not isinstance(value, dict):
        raise ValueError(f"{path} is not a JSON object")
    return value


def _sha(path: Path) -> str:
    """Returns the raw-byte SHA-256 digest of one file."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _digest(value: Any) -> str:
    """Returns a deterministic SHA-256 digest for an in-memory value."""
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
    """Returns exact v4 Red package hashes required by mapper v2 receipts."""
    paths = (
        "phase2_v4_truth_verifier.py",
        "phase2_v4_truth_verifier_test.py",
        FIXTURE_MANIFEST,
        "phase2-v4-red-report.json",
    )
    return {path: _sha(track_root / path) for path in paths}


def _verify_inputs(
    track_root: Path, findings: list[Finding]
) -> tuple[int, dict[str, Any]]:
    """Verifies v4 authority, Phase 1 truth, and all preserved prior bytes."""
    fixed = {
        DISPATCH_PATH: DISPATCH_SHA256,
        **PHASE1_INPUTS,
        **PRESERVED_V2_RED,
        **PRESERVED_V3_DRAFTS,
        **REJECTED_V1,
        v2.DISPATCH_PATH: v2.DISPATCH_SHA256,
    }
    for path, digest in fixed.items():
        candidate = track_root / path
        if not candidate.is_file() or _sha(candidate) != digest:
            _add(findings, "PHASE2_INPUT_DRIFT", f"Frozen input differs: {path}")
    if findings:
        return len(fixed), {}
    dispatch = _load(track_root / DISPATCH_PATH)
    if (
        dispatch.get("status") != "active-medium-remediation"
        or dispatch.get("schema_version") != "apk-t9-phase2-role-dispatch.v4"
    ):
        _add(findings, "PHASE2_INPUT_DRIFT", "The v4 authority is not active.")
    v2_findings: list[v2.Finding] = []
    _, inputs = v2._verify_inputs(track_root, v2_findings)
    if v2_findings:
        _add(findings, "PHASE2_INPUT_DRIFT", "Accepted Phase 1 inputs differ.")
    return len(fixed) + 6, inputs


def _field_value(consumer: dict[str, Any], index: dict[str, Any]) -> str | None:
    """Returns the exact accepted field value for one consumer reference."""
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


def _expected_per_game(
    refs: list[dict[str, Any]], index: dict[str, Any]
) -> list[dict[str, Any]]:
    """Builds exact readable game variants from accepted consumer fields."""
    grouped: dict[str, list[dict[str, Any]]] = {}
    for ref in refs:
        grouped.setdefault(ref.get("game_id"), []).append(ref)
    rows = []
    for game_id in sorted(grouped):
        consumers = grouped[game_id]
        values = [_field_value(ref, index) for ref in consumers]
        if any(value is None for value in values):
            continue
        raw_behavior = " | ".join(value for value in values if value is not None)
        behavior = raw_behavior
        if len(behavior) > 480:
            behavior = behavior[:480]
            if " " in behavior:
                behavior = behavior.rsplit(" ", 1)[0]
        rows.append(
            {
                "game_id": game_id,
                "behavior": behavior,
                "consumer_record_ids": [ref["record_id"] for ref in consumers],
            }
        )
    return rows


def _tokens(value: str) -> set[str]:
    """Returns normalized material tokens from readable evidence text."""
    return {
        token for token in re.findall(r"[a-z0-9]+", value.lower()) if len(token) >= 4
    }


def _embedded(finding: dict[str, Any]) -> dict[str, Any]:
    """Builds the exact compact readable projection used by capabilities."""
    return {
        key: copy.deepcopy(finding.get(key))
        for key in (
            "finding_id",
            "statement",
            "per_game_behaviors",
            "boundary_effect",
        )
    }


def _validate_readable_finding(
    findings: list[Finding],
    finding: Any,
    kind: str,
    index: dict[str, Any],
) -> None:
    """Validates readable text, exact per-game behavior, and boundary consequence."""
    _shape(findings, finding, FINDING_KEYS)
    if not isinstance(finding, dict):
        return
    missing = FINDING_KEYS - set(finding)
    if "statement" in missing:
        _add(
            findings,
            "MISSING_READABLE_FINDING_FIELD",
            "A finding omits its readable statement.",
        )
    if "per_game_behaviors" in missing:
        _add(
            findings,
            "PER_GAME_BEHAVIOR_MISSING",
            "A finding omits readable per-game behavior.",
        )
    if "boundary_effect" in missing:
        _add(
            findings,
            "BOUNDARY_EFFECT_MISSING",
            "A finding omits its boundary consequence.",
        )
    if missing:
        return
    statement = finding.get("statement")
    prefix = "Shared behavior:" if kind == "similarities" else "Meaningful difference:"
    if (
        not isinstance(statement, str)
        or not statement.startswith(prefix)
        or not 40 <= len(statement) <= 280
    ):
        _add(
            findings,
            "OPAQUE_FINDING_STATEMENT",
            "A finding statement is opaque, generic, or lacks its relation.",
        )
    refs = finding.get("consumer_refs", [])
    expected = _expected_per_game(refs, index) if isinstance(refs, list) else []
    actual = finding.get("per_game_behaviors")
    if not isinstance(actual, list) or not actual:
        _add(
            findings,
            "PER_GAME_BEHAVIOR_MISSING",
            "A finding lacks readable per-game variants.",
        )
    else:
        for row in actual:
            _shape(findings, row, PER_GAME_KEYS)
            if (
                isinstance(row, dict)
                and isinstance(row.get("behavior"), str)
                and not 24 <= len(row["behavior"]) <= 480
            ):
                _add(
                    findings,
                    "PER_GAME_BEHAVIOR_LENGTH",
                    "Per-game behavior must contain 24-480 readable characters.",
                )
        if actual != expected:
            _add(
                findings,
                "GAME_BEHAVIOR_CONSUMER_MISMATCH",
                "Per-game behavior does not exactly match its consumer records.",
            )
    if isinstance(statement, str) and expected:
        evidence_tokens = _tokens(" ".join(row["behavior"] for row in expected))
        game_tokens = _tokens(" ".join(row["game_id"] for row in expected))
        material = _tokens(statement) - CONTROLLED_WORDS - game_tokens
        if not material or not material.issubset(evidence_tokens):
            _add(
                findings,
                "INVENTED_SUMMARY",
                "A statement introduces vocabulary absent from exact evidence.",
            )
    effect = finding.get("boundary_effect")
    allowed_prefixes = (
        ("Shared core: ", "Extension point: ")
        if kind == "similarities"
        else ("Extension point: ", "Incompatibility: ")
    )
    if not isinstance(effect, str) or not effect:
        _add(
            findings,
            "BOUNDARY_EFFECT_MISSING",
            "A finding lacks a boundary effect.",
        )
    elif not 24 <= len(effect) <= 280:
        _add(
            findings,
            "BOUNDARY_EFFECT_LENGTH",
            "Boundary effect must contain 24-280 readable characters.",
        )
    elif not effect.startswith(allowed_prefixes) or not effect.endswith(str(statement)):
        _add(
            findings,
            "GENERIC_BOUNDARY_EFFECT",
            "Boundary effect must be a specific controlled consequence of the statement.",
        )


def _project_to_v2(
    bundle: dict[str, dict[str, Any]], track_root: Path
) -> dict[str, dict[str, Any]]:
    """Projects readable v4 outputs into the sealed v2 semantic contract."""
    comparisons = copy.deepcopy(bundle[MAPPER_OUTPUTS[0]])
    classifications = copy.deepcopy(bundle[MAPPER_OUTPUTS[1]])
    boundaries = copy.deepcopy(bundle[MAPPER_OUTPUTS[2]])
    dependencies = copy.deepcopy(bundle[MAPPER_OUTPUTS[3]])
    comparison_by_id: dict[str, dict[str, Any]] = {}
    for batch in comparisons.get("evidence_batches", []):
        for kind in ("similarities", "differences"):
            projected = []
            for finding in batch.get(kind, []):
                projected.append(
                    {
                        "finding_id": finding.get("finding_id"),
                        "basis": finding.get("basis"),
                        "consumer_refs": copy.deepcopy(
                            finding.get("consumer_refs", [])
                        ),
                    }
                )
                comparison_by_id[finding.get("finding_id")] = finding
            batch[kind] = projected
    for capability in classifications.get("capabilities", []):
        capability["similarities"] = [
            row.get("finding_id") for row in capability.get("similarities", [])
        ]
        capability["differences"] = [
            row.get("finding_id") for row in capability.get("differences", [])
        ]
    for boundary in boundaries.get("boundaries", []):
        boundary["shared_core"] = "; ".join(
            (row.get("statement") or "") for row in boundary.pop("shared_core", [])
        )
        boundary["extension_points"] = [
            (row.get("statement") or "") for row in boundary.pop("extension_points", [])
        ]
        boundary["incompatibility_difference_finding_ids"] = [
            row.get("finding_id")
            for row in boundary.pop("incompatibility_differences", [])
        ]
    projected = {
        v2.MAPPER_OUTPUTS[0]: comparisons,
        v2.MAPPER_OUTPUTS[1]: classifications,
        v2.MAPPER_OUTPUTS[2]: boundaries,
        v2.MAPPER_OUTPUTS[3]: dependencies,
    }
    projected[v2.MAPPER_RECEIPT] = {
        "agent_ref": "/root/phase5_review_a/t9_phase0_final_reviewer",
        "owner_role": "capability-mapper",
        "task_id": "phase2-map-capabilities-v2",
        "dispatch_sha256": v2.DISPATCH_SHA256,
        "truth_contract": v2._truth_contract(track_root),
        "output_hashes": {
            path: v2._canonical_digest(projected[path]) for path in v2.MAPPER_OUTPUTS
        },
        "status": "candidate",
    }
    del comparison_by_id
    return projected


def _validate_bundle(
    track_root: Path,
    inputs: dict[str, Any],
    bundle: dict[str, dict[str, Any]],
    *,
    output_hashes: dict[str, str] | None = None,
) -> tuple[list[Finding], int]:
    """Validates readable v4 schema, embeddings, receipt, budget, and v2 semantics."""
    findings: list[Finding] = []
    index = v2._indices(inputs)
    comparisons = bundle[MAPPER_OUTPUTS[0]]
    classifications = bundle[MAPPER_OUTPUTS[1]]
    boundaries = bundle[MAPPER_OUTPUTS[2]]
    dependencies = bundle[MAPPER_OUTPUTS[3]]
    receipt = bundle[MAPPER_RECEIPT]
    _shape(findings, comparisons, COMPARISON_TOP_KEYS)
    _shape(findings, classifications, CLASSIFICATION_TOP_KEYS)
    _shape(findings, boundaries, BOUNDARY_TOP_KEYS)
    _shape(findings, dependencies, v2.DEPENDENCY_TOP_KEYS)
    finding_by_id: dict[str, tuple[str, dict[str, Any]]] = {}
    batch_by_capability: dict[str, list[dict[str, Any]]] = {}
    for batch in comparisons.get("evidence_batches", []):
        _shape(findings, batch, BATCH_KEYS)
        batch_by_capability.setdefault(batch.get("capability_id"), []).append(batch)
        for kind in ("similarities", "differences"):
            for finding in batch.get(kind, []):
                _validate_readable_finding(findings, finding, kind, index)
                finding_by_id[finding.get("finding_id")] = (kind, finding)
    capability_by_id: dict[str, dict[str, Any]] = {}
    for capability in classifications.get("capabilities", []):
        _shape(findings, capability, CAPABILITY_KEYS)
        capability_id = capability.get("capability_id")
        capability_by_id[capability_id] = capability
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
                "Canonical classification does not embed every readable finding.",
            )
        for row in capability.get("similarities", []) + capability.get(
            "differences", []
        ):
            _shape(findings, row, EMBEDDED_FINDING_KEYS)
    for boundary in boundaries.get("boundaries", []):
        _shape(findings, boundary, BOUNDARY_KEYS)
        capability = capability_by_id.get(boundary.get("capability_id"))
        if capability is None:
            continue
        similarities = capability.get("similarities", [])
        differences = capability.get("differences", [])
        disposition = capability.get("disposition")
        expected_extensions = (
            differences if disposition in {"standardize", "extend"} else []
        )
        expected_incompatibilities = (
            differences if disposition in {"game-specific", "bespoke"} else []
        )
        if (
            boundary.get("shared_core") != similarities
            or boundary.get("extension_points") != expected_extensions
            or boundary.get("incompatibility_differences") != expected_incompatibilities
        ):
            _add(
                findings,
                "BOUNDARY_READABLE_INCOMPATIBILITY_DROPPED",
                "Boundary does not embed its exact readable core/extensions/incompatibilities.",
            )
        for key in (
            "shared_core",
            "extension_points",
            "incompatibility_differences",
        ):
            for row in boundary.get(key, []):
                _shape(findings, row, EMBEDDED_FINDING_KEYS)
    _shape(findings, receipt, RECEIPT_KEYS)
    if (
        receipt.get("owner_role") != "capability-mapper"
        or receipt.get("task_id") != "phase2-readable-findings-mapper-v2"
        or receipt.get("dispatch_sha256") != DISPATCH_SHA256
        or receipt.get("truth_contract") != _truth_contract(track_root)
    ):
        _add(findings, "STALE_OR_WRONG_RECEIPT", "Mapper v2 receipt differs.")
    expected_hashes = output_hashes or {
        path: _digest(bundle[path]) for path in MAPPER_OUTPUTS
    }
    if receipt.get("output_hashes") != expected_hashes:
        _add(findings, "TAMPERED_HASH", "Mapper v2 output hashes differ.")
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
            "One or more mapper v2 outputs exceed 1 MiB.",
        )
    projected = _project_to_v2(bundle, track_root)
    v2_findings, checks = v2._validate_bundle(track_root, inputs, projected, False)
    for item in v2_findings:
        _add(findings, item.code, item.message)
    return sorted(findings, key=lambda item: item.code), checks + len(finding_by_id)


def _enrich_finding(
    finding: dict[str, Any], kind: str, index: dict[str, Any]
) -> dict[str, Any]:
    """Adds deterministic readable fields to one exact v2 evidence finding."""
    refs = finding["consumer_refs"]
    per_game = _expected_per_game(refs, index)
    corpus = " ".join(row["behavior"] for row in per_game)
    words = re.findall(r"[A-Za-z0-9]+", corpus)
    material = " ".join(words[:24])
    prefix = "Shared behavior:" if kind == "similarities" else "Meaningful difference:"
    statement = f"{prefix} {material}"
    if len(statement) > 250:
        statement = statement[:250].rsplit(" ", 1)[0]
    effect_prefix = "Shared core: " if kind == "similarities" else "Extension point: "
    return {
        "finding_id": finding["finding_id"],
        "basis": finding["basis"],
        "statement": statement,
        "per_game_behaviors": per_game,
        "boundary_effect": f"{effect_prefix}{statement}",
        "consumer_refs": copy.deepcopy(refs),
    }


def _canonical_bundle(
    track_root: Path, inputs: dict[str, Any]
) -> dict[str, dict[str, Any]]:
    """Builds one valid readable v4 bundle from the sealed v2 semantic baseline."""
    old = v2._canonical_bundle(track_root, inputs)
    index = v2._indices(inputs)
    comparisons = copy.deepcopy(old[v2.MAPPER_OUTPUTS[0]])
    finding_by_id: dict[str, dict[str, Any]] = {}
    for batch in comparisons["evidence_batches"]:
        for kind in ("similarities", "differences"):
            batch[kind] = [
                _enrich_finding(finding, kind, index) for finding in batch[kind]
            ]
            for finding in batch[kind]:
                finding_by_id[finding["finding_id"]] = finding
    classifications = copy.deepcopy(old[v2.MAPPER_OUTPUTS[1]])
    for capability in classifications["capabilities"]:
        capability["similarities"] = [
            _embedded(finding_by_id[finding_id])
            for finding_id in capability["similarities"]
        ]
        capability["differences"] = [
            _embedded(finding_by_id[finding_id])
            for finding_id in capability["differences"]
        ]
    boundaries = {
        "schema_version": "apk-t9-phase2-extension-boundaries.v4",
        "phase1_bindings": copy.deepcopy(old[v2.MAPPER_OUTPUTS[2]]["phase1_bindings"]),
        "boundaries": [],
    }
    for capability in classifications["capabilities"]:
        differences = copy.deepcopy(capability["differences"])
        disposition = capability["disposition"]
        boundaries["boundaries"].append(
            {
                "boundary_id": capability["extension_boundary"],
                "capability_id": capability["capability_id"],
                "shared_core": copy.deepcopy(capability["similarities"]),
                "extension_points": (
                    differences if disposition in {"standardize", "extend"} else []
                ),
                "incompatibility_differences": (
                    differences if disposition in {"game-specific", "bespoke"} else []
                ),
            }
        )
    bundle = {
        MAPPER_OUTPUTS[0]: comparisons,
        MAPPER_OUTPUTS[1]: classifications,
        MAPPER_OUTPUTS[2]: boundaries,
        MAPPER_OUTPUTS[3]: copy.deepcopy(old[v2.MAPPER_OUTPUTS[3]]),
        MAPPER_RECEIPT: {
            "agent_ref": "/root/phase5_review_a/t9_phase0_final_reviewer",
            "owner_role": "capability-mapper",
            "task_id": "phase2-readable-findings-mapper-v2",
            "dispatch_sha256": DISPATCH_SHA256,
            "truth_contract": _truth_contract(track_root),
            "output_hashes": {},
            "status": "candidate",
        },
    }
    bundle[MAPPER_RECEIPT]["output_hashes"] = {
        path: _digest(bundle[path]) for path in MAPPER_OUTPUTS
    }
    return bundle


def _apply_readability_fixture(
    track_root: Path,
    inputs: dict[str, Any],
    bundle: dict[str, dict[str, Any]],
    case: dict[str, Any],
) -> None:
    """Applies one bounded v4 readability mutation."""
    op = case["mutation"]["operation"]
    comparisons = bundle[MAPPER_OUTPUTS[0]]
    classifications = bundle[MAPPER_OUTPUTS[1]]
    boundaries = bundle[MAPPER_OUTPUTS[2]]
    finding = comparisons["evidence_batches"][0]["similarities"][0]
    capability = classifications["capabilities"][0]
    boundary = boundaries["boundaries"][0]
    if op == "missing-statement":
        del finding["statement"]
    elif op == "opaque-statement":
        finding["statement"] = "Shared behavior: generic label"
        finding["boundary_effect"] = f"Shared core: {finding['statement']}"
    elif op == "missing-per-game-behavior":
        del finding["per_game_behaviors"]
    elif op == "game-behavior-consumer-mismatch":
        finding["per_game_behaviors"][0]["consumer_record_ids"] = ["invented"]
    elif op == "missing-boundary-effect":
        del finding["boundary_effect"]
    elif op == "generic-boundary-effect":
        finding["boundary_effect"] = "Shared core: generic boundary consequence"
    elif op == "classification-drops-readable-finding":
        capability["similarities"] = []
    elif op == "boundary-drops-readable-incompatibility":
        capability["disposition"] = "bespoke"
        difference = copy.deepcopy(finding)
        difference["finding_id"] = "difference:fixture"
        difference["statement"] = difference["statement"].replace(
            "Shared behavior:", "Meaningful difference:"
        )
        difference["boundary_effect"] = f"Incompatibility: {difference['statement']}"
        comparisons["evidence_batches"][0]["differences"] = [difference]
        capability["differences"] = [_embedded(difference)]
        boundary["shared_core"] = copy.deepcopy(capability["similarities"])
        boundary["extension_points"] = []
        boundary["incompatibility_differences"] = []
        projected = _project_to_v2(bundle, track_root)
        bundle[MAPPER_OUTPUTS[3]] = v2._canonical_dependencies(
            inputs,
            projected[v2.MAPPER_OUTPUTS[0]],
            projected[v2.MAPPER_OUTPUTS[1]],
        )
    elif op == "invented-summary":
        finding["statement"] = "Shared behavior: teleportation quantum invented"
        finding["boundary_effect"] = f"Shared core: {finding['statement']}"
    elif op == "oversized-statement":
        evidence_words = sorted(_tokens(finding["per_game_behaviors"][0]["behavior"]))
        finding["statement"] = "Shared behavior: " + (f"{evidence_words[0]} " * 40)
        finding["boundary_effect"] = f"Shared core: {finding['statement']}"
    elif op == "oversized-per-game-behavior":
        finding["per_game_behaviors"][0]["behavior"] = "accepted " * 61
    elif op == "oversized-boundary-effect":
        finding["boundary_effect"] = "Shared core: " + ("accepted " * 40)
    else:
        raise ValueError(f"unknown readability operation {op}")
    if op not in {
        "classification-drops-readable-finding",
        "boundary-drops-readable-incompatibility",
    }:
        embedded = _embedded(finding)
        capability["similarities"][0] = copy.deepcopy(embedded)
        boundary["shared_core"][0] = copy.deepcopy(embedded)
    bundle[MAPPER_RECEIPT]["output_hashes"] = {
        path: _digest(bundle[path]) for path in MAPPER_OUTPUTS
    }
    bundle[MAPPER_RECEIPT]["truth_contract"] = _truth_contract(track_root)
    del inputs


def _validate_rejected_v1(track_root: Path, inputs: dict[str, Any]) -> list[Finding]:
    """Proves the preserved mapper v1 candidate fails the readable v4 schema."""
    comparisons = _load(track_root / "phase2-capability-comparisons-v1.json")
    classifications = _load(track_root / "phase2-capability-classification-v1.json")
    boundaries = _load(track_root / "phase2-extension-boundaries-v1.json")
    findings: list[Finding] = []
    index = v2._indices(inputs)
    for batch in comparisons.get("evidence_batches", []):
        for kind in ("similarities", "differences"):
            for finding in batch.get(kind, []):
                _validate_readable_finding(findings, finding, kind, index)
    if any(
        not isinstance(row, dict)
        for capability in classifications.get("capabilities", [])
        for key in ("similarities", "differences")
        for row in capability.get(key, [])
    ):
        _add(
            findings,
            "CLASSIFICATION_READABLE_FINDING_DROPPED",
            "Rejected classification contains only opaque finding IDs.",
        )
    if any(set(row) != BOUNDARY_KEYS for row in boundaries.get("boundaries", [])):
        _add(
            findings,
            "BOUNDARY_READABLE_INCOMPATIBILITY_DROPPED",
            "Rejected boundaries do not embed readable findings.",
        )
    return sorted(findings, key=lambda item: item.code)


def _load_fixture(track_root: Path, fixture_path: Path) -> dict[str, Any]:
    """Loads a v4 fixture only when its manifest hash is exact."""
    manifest = _load(track_root / FIXTURE_MANIFEST)
    if (
        manifest.get("fixture_count") != len(manifest.get("fixtures", []))
        or len(manifest.get("fixtures", [])) > MAX_FIXTURE_FILES
    ):
        raise ValueError("fixture manifest budget differs")
    relative = fixture_path.resolve().relative_to(track_root.resolve()).as_posix()
    row = next(item for item in manifest["fixtures"] if item["path"] == relative)
    if _sha(fixture_path) != row["sha256"]:
        raise ValueError("fixture binding differs")
    return _load(fixture_path)


def verify_phase2(
    repo_root: Path, track_root: Path, fixture_path: Path | None = None
) -> VerificationResult:
    """Verifies v4 authority, fixtures, missing-output Red, or mapper v2 outputs."""
    del repo_root
    findings: list[Finding] = []
    checks, inputs = _verify_inputs(track_root, findings)
    if findings:
        return VerificationResult("INVALID", tuple(findings), checks)
    if fixture_path is not None:
        try:
            fixture = _load_fixture(track_root, fixture_path)
            for case in fixture["cases"]:
                if case.get("contract") == "preserved-v2":
                    old = v2._canonical_bundle(track_root, inputs)
                    v2._apply_fixture(track_root, inputs, old, case)
                    actual_findings, case_checks = v2._validate_bundle(
                        track_root, inputs, old, False
                    )
                    actual = {item.code for item in actual_findings}
                    findings.extend(
                        Finding(item.code, item.message) for item in actual_findings
                    )
                else:
                    bundle = _canonical_bundle(track_root, inputs)
                    _apply_readability_fixture(track_root, inputs, bundle, case)
                    actual_findings, case_checks = _validate_bundle(
                        track_root, inputs, bundle
                    )
                    actual = {item.code for item in actual_findings}
                    findings.extend(actual_findings)
                if actual != set(case["expected_codes"]):
                    _add(
                        findings,
                        "FIXTURE_CASE_EXPECTATION_MISMATCH",
                        f"{case['id']} emitted {sorted(actual)}.",
                    )
                checks += case_checks
        except (KeyError, OSError, ValueError, StopIteration, json.JSONDecodeError):
            _add(findings, "INVALID_FIXTURE_BINDING", "A v4 fixture is not bound.")
        return VerificationResult(
            "INVALID", tuple(sorted(findings, key=lambda x: x.code)), checks
        )
    missing = [
        path
        for path in (*MAPPER_OUTPUTS, MAPPER_RECEIPT)
        if not (track_root / path).is_file()
    ]
    if missing:
        _add(
            findings,
            "PHASE2_MAPPER_V2_OUTPUTS_MISSING",
            f"Missing mapper v2 outputs: {', '.join(missing)}",
        )
        return VerificationResult(
            "RED_WAITING_FOR_MAPPER_V2_OUTPUTS", tuple(findings), checks
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
        _add(findings, "INVALID_SCHEMA", "Mapper v2 outputs cannot be validated.")
    return VerificationResult(
        "VERIFIED" if not findings else "INVALID",
        tuple(sorted(findings, key=lambda item: item.code)),
        checks,
    )


def _parser() -> argparse.ArgumentParser:
    """Builds the bounded v4 verifier command-line parser."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--track-root", type=Path, required=True)
    parser.add_argument("--fixture", type=Path)
    parser.add_argument("--expect-codes", nargs="*")
    return parser


def main(argv: list[str] | None = None) -> int:
    """Runs v4 verification and emits a stable JSON result."""
    args = _parser().parse_args(argv)
    result = verify_phase2(args.repo_root, args.track_root, args.fixture)
    payload = {
        "schema_version": "apk-t9-phase2-v4-verification-result.v1",
        "state": result.state,
        "passed": result.passed,
        "checks": result.checks,
        "findings": [
            {"code": item.code, "message": item.message} for item in result.findings
        ],
    }
    print(json.dumps(payload, indent=2, sort_keys=True))
    if args.expect_codes is not None:
        return (
            0
            if {item.code for item in result.findings} == set(args.expect_codes)
            else 1
        )
    return 0 if result.passed else 1


if __name__ == "__main__":
    sys.exit(main())
