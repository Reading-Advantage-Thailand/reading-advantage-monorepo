#!/usr/bin/env python3
"""Verifies the additive Phase 2 v3 Green lifecycle truth contract."""

from __future__ import annotations

import argparse
import copy
from dataclasses import dataclass
import hashlib
import json
from pathlib import Path
import sys
from typing import Any

TRACK_ID = "apk_evidence_backed_ontology_synthesis_20260712"
DISPATCH_PATH = "phase2-role-dispatch-v2.json"
DISPATCH_SHA256 = "ccd86d8fc70d5e3dbbdfd83b32f033ef9945ee7518056fbae8773ca1a564ebf5"
SUCCESSOR_DISPATCH_PATH = "phase2-role-dispatch-v3.json"
SUCCESSOR_DISPATCH_SHA256 = (
    "c8d62db60bb3ccaac5d211cd740c7b8c82085edcda11ab8769b136c4a71b01fd"
)
PHASE1_ACCEPTANCE_PATH = "phase1-root-acceptance.json"
PHASE1_ACCEPTANCE_SHA256 = (
    "bd911f865c95e24874dde657e856718910a05b1737634222055654b331dd020d"
)
PHASE1_INPUTS = {
    "phase1-source-resolution-index-v1.json": (
        "2900222c4fc4db8ffb354d4f25f5c1a8bef6930b2d7e8e1bb692dab27d860bd0"
    ),
    "phase1-mechanic-blueprints-v1.json": (
        "ed3bee70f5e7e94ac101f295d9de3f768cdaf9d97d40d4529f2fbbbe8f479d61"
    ),
    "phase1-developer-effort-baseline-v1.json": (
        "168403610d0c69160777ddeca5753dcc57b97e2a7db6ceed65f3e4ce64d14f91"
    ),
    "phase1-claim-dependency-edges-v1.json": (
        "2b279df4896c9620ea9acf17506e942c9df98e2b4d6c06a29d5293106aff0987"
    ),
}
MAPPER_OUTPUTS = (
    "phase2-capability-comparisons-v1.json",
    "phase2-capability-classification-v1.json",
    "phase2-extension-boundaries-v1.json",
    "phase2-claim-dependency-edges-v1.json",
)
MAPPER_RECEIPT = "role-receipts/phase2/capability-mapper.json"
FIXTURE_MANIFEST = "phase2-v3-fixture-manifest.json"
SEALED_V2_TRUTH_CONTRACT = {
    "phase2_v2_truth_verifier.py": "e0d87971d76a38812e9db7471f729b045817e19c8e47287db69cbfd687a1d5fd",
    "phase2_v2_truth_verifier_test.py": "a5909e5f4bc647475ec132eb65fd24cce3a1fad6230329f505ca39380af95d61",
    "phase2-v2-fixture-manifest.json": "4d4b0285080bca1f9edf767db4446a733cf29aa3d19ccc3dd07c120e2e2ec11b",
    "phase2-v2-red-report.json": "c3f4e6a2a226d4bec0ae221a96b3c1c856a23cef47f8c32f0dd109bd6ef2021e",
}
PRESERVED_V2_RED = {
    **SEALED_V2_TRUTH_CONTRACT,
    "role-receipts/phase2/truth-test-author-v2.json": "4340ff91ad3a0ca70bcaf239d7793b812eee96fdf4ac9f7b1b37c2249ec9b36d",
}
CANDIDATE_BINDINGS = {
    "phase2-capability-comparisons-v1.json": "776b97fc62073234c5152d8323985eb23a62066d4ff7717e4da0e1704df33c89",
    "phase2-capability-classification-v1.json": "9ac4c3cb2c1aafc099878d40458f988f93a02fc1ab9f6c400003bc17d3ba6636",
    "phase2-extension-boundaries-v1.json": "b869ed12f8443f8d08eddd0de8e4448099ae9ef35a7f7f6253a2a29293deb130",
    "phase2-claim-dependency-edges-v1.json": "064785f673de2902083089ba6174960f2d6210c331464c35504cea88c44beb19",
    MAPPER_RECEIPT: "c5362b5ab897aba9bcb603fd62b7650c5f9ec82e711fb535405df6587c3399e7",
}
MAX_BATCH_GAMES = 3
MAX_FIXTURE_FILES = 16
MAX_SOURCE_DOCUMENTS = 32
MAX_OUTPUT_BYTES = 1_048_576
STRONG_CONFIDENCE = {"high", "exact-source", "exact-bytes", "bounded"}
DISPOSITIONS = {"standardize", "extend", "game-specific", "bespoke"}
OWNERS = {"shared-core", "game-extension", "game-owned"}

COMPARISON_TOP_KEYS = {
    "schema_version",
    "phase1_bindings",
    "source_document_ids",
    "batch_policy",
    "evidence_batches",
}
BATCH_POLICY_KEYS = {
    "games_per_batch_min",
    "games_per_batch_max",
    "overlap_allowed",
    "whole_game_partition_required",
}
BATCH_KEYS = {
    "batch_id",
    "capability_id",
    "game_ids",
    "similarities",
    "differences",
}
FINDING_KEYS = {"finding_id", "basis", "consumer_refs"}
CONSUMER_KEYS = {
    "game_id",
    "scene_id",
    "state_id",
    "coverage_granularity",
    "scope_status",
    "factual_evidence_status",
    "claim_id",
    "record_id",
    "field_id",
    "value_sha256",
}
CLASSIFICATION_TOP_KEYS = {
    "schema_version",
    "phase1_bindings",
    "capabilities",
    "non_capability_context",
}
CAPABILITY_KEYS = {
    "capability_id",
    "name",
    "behavior_contract",
    "owner",
    "extension_boundary",
    "tests",
    "disposition",
    "evidence_batch_ids",
    "consumers",
    "similarities",
    "differences",
}
TEST_KEYS = {"test_id", "assertion", "finding_ids"}
NON_CAPABILITY_KEYS = {"consumer", "disposition", "rationale"}
BOUNDARY_TOP_KEYS = {"schema_version", "phase1_bindings", "boundaries"}
BOUNDARY_KEYS = {
    "boundary_id",
    "capability_id",
    "shared_core",
    "extension_points",
    "incompatibility_difference_finding_ids",
}
DEPENDENCY_TOP_KEYS = {"schema_version", "phase1_bindings", "upstream_claims", "edges"}
DEPENDENCY_CLAIM_KEYS = {
    "game_id",
    "claim_id",
    "phase1_routing_disposition",
    "phase2_disposition",
    "phase2_record_ids",
}
DEPENDENCY_EDGE_KEYS = {
    "game_id",
    "claim_id",
    "record_id",
    "field_id",
    "value_sha256",
    "capability_id",
    "batch_id",
    "finding_kind",
    "finding_id",
}
RECEIPT_KEYS = {
    "agent_ref",
    "owner_role",
    "task_id",
    "dispatch_sha256",
    "truth_contract",
    "output_hashes",
    "status",
}


@dataclass(frozen=True)
class Finding:
    """Describes one stable truth-contract rejection."""

    code: str
    message: str


@dataclass(frozen=True)
class VerificationResult:
    """Contains the verifier state, findings, and bounded check count."""

    state: str
    findings: tuple[Finding, ...]
    checks: int

    @property
    def passed(self) -> bool:
        """Returns whether the candidate satisfies the v2 contract."""
        return not self.findings and self.state == "VERIFIED"


def _add(findings: list[Finding], code: str, message: str) -> None:
    """Adds a finding once per stable code."""
    if code not in {item.code for item in findings}:
        findings.append(Finding(code, message))


def _load(path: Path) -> dict[str, Any]:
    """Loads a JSON object from a local artifact."""
    value = json.loads(path.read_text())
    if not isinstance(value, dict):
        raise ValueError(f"{path} is not a JSON object")
    return value


def _sha(path: Path) -> str:
    """Returns the raw-byte SHA-256 digest of a file."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _canonical_digest(value: Any) -> str:
    """Returns a deterministic SHA-256 digest for an in-memory JSON value."""
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def _bindings() -> dict[str, str]:
    """Returns the exact accepted authority and Phase 1 input bindings."""
    return {
        PHASE1_ACCEPTANCE_PATH: PHASE1_ACCEPTANCE_SHA256,
        DISPATCH_PATH: DISPATCH_SHA256,
        **PHASE1_INPUTS,
    }


def _truth_contract(track_root: Path) -> dict[str, str]:
    """Returns sealed v2 Red bindings retained by the immutable mapper receipt."""
    del track_root
    return dict(SEALED_V2_TRUTH_CONTRACT)


def _shape(
    findings: list[Finding],
    value: Any,
    keys: set[str],
    *,
    scene_consumer: bool = False,
) -> None:
    """Rejects missing, surplus, or non-object fields against an exact shape."""
    if not isinstance(value, dict):
        _add(findings, "INVALID_SCHEMA", "A declared object is not an object.")
        return
    missing = keys - set(value)
    surplus = set(value) - keys
    if missing:
        _add(findings, "MISSING_REQUIRED_FIELD", f"Missing fields: {sorted(missing)}")
        if scene_consumer and {"scene_id", "state_id"} & missing:
            _add(
                findings,
                "SCENE_STATE_CONSUMER_OMITTED",
                "A direct consumer omits its exact scene/state field.",
            )
    if surplus:
        _add(findings, "SURPLUS_FIELD", f"Surplus fields: {sorted(surplus)}")


def _verify_inputs(
    track_root: Path, findings: list[Finding]
) -> tuple[int, dict[str, Any]]:
    """Verifies successor authority and all accepted Phase 1 inputs."""
    fixed = {
        SUCCESSOR_DISPATCH_PATH: SUCCESSOR_DISPATCH_SHA256,
        DISPATCH_PATH: DISPATCH_SHA256,
        PHASE1_ACCEPTANCE_PATH: PHASE1_ACCEPTANCE_SHA256,
        **PHASE1_INPUTS,
    }
    for path, digest in fixed.items():
        candidate = track_root / path
        if not candidate.is_file() or _sha(candidate) != digest:
            _add(findings, "PHASE2_INPUT_DRIFT", f"Frozen input differs: {path}")
    if findings:
        return len(fixed), {}
    dispatch = _load(track_root / DISPATCH_PATH)
    successor_dispatch = _load(track_root / SUCCESSOR_DISPATCH_PATH)
    acceptance = _load(track_root / PHASE1_ACCEPTANCE_PATH)
    source = _load(track_root / "phase1-source-resolution-index-v1.json")
    mechanic = _load(track_root / "phase1-mechanic-blueprints-v1.json")
    effort = _load(track_root / "phase1-developer-effort-baseline-v1.json")
    dependency = _load(track_root / "phase1-claim-dependency-edges-v1.json")
    if (
        dispatch.get("schema_version") != "apk-t9-phase2-role-dispatch.v2"
        or successor_dispatch.get("status") != "active-green-lifecycle-repair"
        or successor_dispatch.get("schema_version") != "apk-t9-phase2-role-dispatch.v3"
        or acceptance.get("decision") != "ACCEPT_PHASE1_OPEN_PHASE2"
    ):
        _add(
            findings, "PHASE2_INPUT_DRIFT", "The v3 lifecycle authority is not active."
        )
    for path, digest in PRESERVED_V2_RED.items():
        candidate = track_root / path
        if not candidate.is_file() or _sha(candidate) != digest:
            _add(
                findings,
                "PHASE2_INPUT_DRIFT",
                f"A preserved v2 Red artifact differs: {path}",
            )
    if (
        len(source.get("upstream_claims", [])) != 1248
        or len(mechanic.get("records", [])) != 633
        or len(effort.get("records", [])) != 376
        or len(dependency.get("upstream_claims", [])) != 1248
    ):
        _add(findings, "PHASE2_INPUT_DRIFT", "Accepted Phase 1 cardinalities differ.")
    return len(fixed) + 6, {
        "dispatch": successor_dispatch,
        "source": source,
        "mechanic": mechanic,
        "effort": effort,
        "dependency": dependency,
    }


def _indices(inputs: dict[str, Any]) -> dict[str, Any]:
    """Builds immutable Phase 1 claim, record, game, and document indices."""
    source_claims = {
        (row["game_id"], row["claim_id"]): row
        for row in inputs["source"]["upstream_claims"]
    }
    mechanic_records = {row["record_id"]: row for row in inputs["mechanic"]["records"]}
    mechanic_by_claim = {
        (row["game_id"], row["source_claim_id"]): row
        for row in inputs["mechanic"]["records"]
    }
    games = tuple(inputs["source"]["denominator"]["resolvable_game_ids"])
    documents = tuple(
        row["document_id"] for row in inputs["source"]["source_artifacts"]
    )
    return {
        "source_claims": source_claims,
        "mechanic_records": mechanic_records,
        "mechanic_by_claim": mechanic_by_claim,
        "games": games,
        "documents": documents,
    }


def _consumer(record: dict[str, Any]) -> dict[str, Any]:
    """Builds the exact direct scene/state consumer binding for a mechanic record."""
    field = record["derived_fields"][0]
    return {
        "game_id": record["game_id"],
        "scene_id": record["scene_id"],
        "state_id": record["state_id"],
        "coverage_granularity": record["coverage_granularity"],
        "scope_status": record["scope_status"],
        "factual_evidence_status": record["factual_evidence_status"],
        "claim_id": record["source_claim_id"],
        "record_id": record["record_id"],
        "field_id": field["field_id"],
        "value_sha256": field["value_sha256"],
    }


def _canonical_bundle(
    track_root: Path, inputs: dict[str, Any]
) -> dict[str, dict[str, Any]]:
    """Builds a minimal overlap-capable, cross-batch valid counterexample baseline."""
    index = _indices(inputs)
    selected: list[dict[str, Any]] = []
    seen_games: set[str] = set()
    for record in inputs["mechanic"]["records"]:
        claim = index["source_claims"][(record["game_id"], record["source_claim_id"])]
        if (
            claim["confidence"] in STRONG_CONFIDENCE
            and record["scope_status"] == "resolved"
            and record["game_id"] not in seen_games
        ):
            selected.append(record)
            seen_games.add(record["game_id"])
        if len(selected) == 3:
            break
    refs = [_consumer(record) for record in selected]
    batches = [
        {
            "batch_id": "batch:fixture:a",
            "capability_id": "capability:fixture",
            "game_ids": [refs[0]["game_id"], refs[1]["game_id"]],
            "similarities": [
                {
                    "finding_id": "similarity:fixture:a",
                    "basis": "exact-accepted-behavior",
                    "consumer_refs": copy.deepcopy(refs[:2]),
                }
            ],
            "differences": [],
        },
        {
            "batch_id": "batch:fixture:b",
            "capability_id": "capability:fixture",
            "game_ids": [refs[1]["game_id"], refs[2]["game_id"]],
            "similarities": [
                {
                    "finding_id": "similarity:fixture:b",
                    "basis": "exact-accepted-behavior",
                    "consumer_refs": copy.deepcopy(refs[1:]),
                }
            ],
            "differences": [],
        },
    ]
    comparison = {
        "schema_version": "apk-t9-phase2-capability-comparisons.v2",
        "phase1_bindings": _bindings(),
        "source_document_ids": list(index["documents"]),
        "batch_policy": {
            "games_per_batch_min": 2,
            "games_per_batch_max": 3,
            "overlap_allowed": True,
            "whole_game_partition_required": False,
        },
        "evidence_batches": batches,
    }
    capability = {
        "capability_id": "capability:fixture",
        "name": "Fixture Shared Behavior",
        "behavior_contract": (
            "Preserve the exact accepted interaction behavior represented by the "
            "bound consumers while allowing named game extensions."
        ),
        "owner": "shared-core",
        "extension_boundary": "boundary:capability:fixture",
        "tests": [
            {
                "test_id": "test:capability:fixture",
                "assertion": "preserve-shared-contract",
                "finding_ids": ["similarity:fixture:a", "similarity:fixture:b"],
            }
        ],
        "disposition": "standardize",
        "evidence_batch_ids": ["batch:fixture:a", "batch:fixture:b"],
        "consumers": copy.deepcopy(refs),
        "similarities": ["similarity:fixture:a", "similarity:fixture:b"],
        "differences": [],
    }
    used = {row["record_id"] for row in refs}
    non_capability = [
        {
            "consumer": _consumer(record),
            "disposition": "non-capability-context",
            "rationale": "No cross-game capability decision in this bounded fixture.",
        }
        for record in inputs["mechanic"]["records"]
        if record["record_id"] not in used
    ]
    classification = {
        "schema_version": "apk-t9-phase2-capability-classification.v2",
        "phase1_bindings": _bindings(),
        "capabilities": [capability],
        "non_capability_context": non_capability,
    }
    boundaries = {
        "schema_version": "apk-t9-phase2-extension-boundaries.v2",
        "phase1_bindings": _bindings(),
        "boundaries": [
            {
                "boundary_id": "boundary:capability:fixture",
                "capability_id": "capability:fixture",
                "shared_core": "Exact accepted interaction behavior bound by consumers.",
                "extension_points": ["Game-owned presentation and content."],
                "incompatibility_difference_finding_ids": [],
            }
        ],
    }
    dependencies = _canonical_dependencies(inputs, comparison, classification)
    bundle = {
        MAPPER_OUTPUTS[0]: comparison,
        MAPPER_OUTPUTS[1]: classification,
        MAPPER_OUTPUTS[2]: boundaries,
        MAPPER_OUTPUTS[3]: dependencies,
        MAPPER_RECEIPT: {
            "agent_ref": "/root/phase5_review_a/t9_phase0_final_reviewer",
            "owner_role": "capability-mapper",
            "task_id": "phase2-map-capabilities-v2",
            "dispatch_sha256": DISPATCH_SHA256,
            "truth_contract": {},
            "output_hashes": {},
            "status": "candidate",
        },
    }
    _refresh_receipt(track_root, bundle)
    return bundle


def _evidence_rows(
    comparison: dict[str, Any],
) -> list[tuple[str, str, str, dict[str, Any]]]:
    """Returns batch, kind, finding, and consumer tuples from comparison evidence."""
    rows: list[tuple[str, str, str, dict[str, Any]]] = []
    for batch in comparison.get("evidence_batches", []):
        for kind in ("similarities", "differences"):
            for finding in batch.get(kind, []):
                for consumer in finding.get("consumer_refs", []):
                    rows.append(
                        (
                            batch.get("batch_id"),
                            kind[:-3] + "y" if kind == "similarities" else "difference",
                            finding.get("finding_id"),
                            consumer,
                        )
                    )
    return rows


def _canonical_dependencies(
    inputs: dict[str, Any],
    comparison: dict[str, Any],
    classification: dict[str, Any],
) -> dict[str, Any]:
    """Builds exact claim preservation and evidence dependency rows."""
    cap_by_batch = {
        batch["batch_id"]: batch["capability_id"]
        for batch in comparison["evidence_batches"]
    }
    record_to_capability = {
        consumer["record_id"]: capability["capability_id"]
        for capability in classification["capabilities"]
        for consumer in capability["consumers"]
    }
    upstream_claims = []
    for row in inputs["source"]["upstream_claims"]:
        key = f"{row['game_id']}:{row['claim_id']}"
        route = row["routing_disposition"]
        if route == "blocked-upstream-unknown":
            phase2 = "preserved-upstream-unknown"
            record_ids: list[str] = []
        elif route != "phase1-mechanic":
            phase2 = "preserved-non-mechanic"
            record_ids = []
        elif key in record_to_capability:
            phase2 = "capability-consumer"
            record_ids = [key]
        else:
            phase2 = "non-capability-context"
            record_ids = [key]
        upstream_claims.append(
            {
                "game_id": row["game_id"],
                "claim_id": row["claim_id"],
                "phase1_routing_disposition": route,
                "phase2_disposition": phase2,
                "phase2_record_ids": record_ids,
            }
        )
    edges = []
    for batch_id, kind, finding_id, consumer in _evidence_rows(comparison):
        edges.append(
            {
                "game_id": consumer["game_id"],
                "claim_id": consumer["claim_id"],
                "record_id": consumer["record_id"],
                "field_id": consumer["field_id"],
                "value_sha256": consumer["value_sha256"],
                "capability_id": cap_by_batch[batch_id],
                "batch_id": batch_id,
                "finding_kind": kind,
                "finding_id": finding_id,
            }
        )
    return {
        "schema_version": "apk-t9-phase2-claim-dependency-edges.v2",
        "phase1_bindings": _bindings(),
        "upstream_claims": upstream_claims,
        "edges": edges,
    }


def _refresh_dependencies(
    inputs: dict[str, Any], bundle: dict[str, dict[str, Any]]
) -> None:
    """Refreshes synthetic dependency rows after an intentional fixture mutation."""
    bundle[MAPPER_OUTPUTS[3]] = _canonical_dependencies(
        inputs, bundle[MAPPER_OUTPUTS[0]], bundle[MAPPER_OUTPUTS[1]]
    )


def _validate_consumer(
    findings: list[Finding],
    consumer: Any,
    index: dict[str, Any],
    *,
    standardize: bool,
) -> tuple[str | None, bool]:
    """Validates one direct consumer and returns its game and strong-evidence state."""
    _shape(findings, consumer, CONSUMER_KEYS, scene_consumer=True)
    if not isinstance(consumer, dict):
        return None, False
    record = index["mechanic_records"].get(consumer.get("record_id"))
    source = index["source_claims"].get(
        (consumer.get("game_id"), consumer.get("claim_id"))
    )
    if source is None:
        _add(findings, "INVENTED_BEHAVIOR", "A consumer claim is absent from Phase 1.")
        return consumer.get("game_id"), False
    if source["routing_disposition"] == "blocked-upstream-unknown":
        _add(
            findings, "UNKNOWN_RESOLUTION", "An upstream unknown was resolved or used."
        )
    if source["routing_disposition"] != "phase1-mechanic":
        _add(
            findings,
            "NOUN_ART_ONLY_STANDARDIZATION",
            "A capability decision uses non-mechanic noun/art/effort evidence.",
        )
    if record is None:
        _add(
            findings,
            "INVENTED_BEHAVIOR",
            "A consumer has no accepted Phase 1 mechanic record.",
        )
        return consumer.get("game_id"), False
    expected = _consumer(record)
    if consumer != expected:
        _add(
            findings,
            "INVENTED_BEHAVIOR",
            "A consumer differs from its accepted Phase 1 mechanic record.",
        )
    if (
        consumer.get("scene_id") != record["scene_id"]
        or consumer.get("state_id") != record["state_id"]
        or consumer.get("scope_status") != source["scope_status"]
        or consumer.get("factual_evidence_status") != source["factual_evidence_status"]
    ):
        _add(
            findings,
            "PLACEMENT_STATUS_COLLAPSE",
            "Exact scene/state, scope, or factual status was collapsed.",
        )
    strong = (
        source.get("confidence") in STRONG_CONFIDENCE
        and record["scope_status"] == "resolved"
        and record["factual_evidence_status"] == "accepted"
    )
    if standardize and not strong:
        _add(
            findings,
            "PROVISIONAL_ONLY_STANDARDIZATION",
            "Standardization uses provisional, blocked, or unresolved evidence.",
        )
    return consumer.get("game_id"), strong


def _validate_bundle(
    track_root: Path,
    inputs: dict[str, Any],
    bundle: dict[str, dict[str, Any]],
    full: bool,
    *,
    output_hashes: dict[str, str] | None = None,
) -> tuple[list[Finding], int]:
    """Validates a complete v2 mapper bundle against exact evidence and policy."""
    findings: list[Finding] = []
    checks = 0
    index = _indices(inputs)
    comparisons, classifications, boundaries, dependencies = (
        bundle[path] for path in MAPPER_OUTPUTS
    )
    _shape(findings, comparisons, COMPARISON_TOP_KEYS)
    _shape(findings, classifications, CLASSIFICATION_TOP_KEYS)
    _shape(findings, boundaries, BOUNDARY_TOP_KEYS)
    _shape(findings, dependencies, DEPENDENCY_TOP_KEYS)
    for artifact in (comparisons, classifications, boundaries, dependencies):
        if artifact.get("phase1_bindings") != _bindings():
            _add(findings, "TAMPERED_HASH", "A Phase 1 or dispatch binding differs.")
    policy = comparisons.get("batch_policy", {})
    _shape(findings, policy, BATCH_POLICY_KEYS)
    if policy.get("whole_game_partition_required") is not False:
        _add(
            findings,
            "DISJOINT_PARTITION_ASSUMPTION",
            "Evidence batching must not impose a disjoint whole-game partition.",
        )
    if policy.get("overlap_allowed") is not True:
        _add(findings, "OVERLAP_REJECTED", "Evidence batches must allow game overlap.")
    if policy.get("games_per_batch_min") != 2 or policy.get("games_per_batch_max") != 3:
        _add(findings, "BATCH_GAME_LIMIT_EXCEEDED", "Batch bounds must remain 2-3.")
    source_docs = comparisons.get("source_document_ids", [])
    if (
        len(source_docs) > MAX_SOURCE_DOCUMENTS
        or len(source_docs) != len(set(source_docs))
        or set(source_docs) - set(index["documents"])
    ):
        _add(findings, "SOURCE_DOCUMENT_BUDGET_EXCEEDED", "Source documents differ.")

    batch_by_id: dict[str, dict[str, Any]] = {}
    finding_by_id: dict[str, tuple[str, str, dict[str, Any]]] = {}
    evidence_edges: list[tuple[Any, ...]] = []
    for batch in comparisons.get("evidence_batches", []):
        _shape(findings, batch, BATCH_KEYS)
        batch_id = batch.get("batch_id")
        if batch_id in batch_by_id:
            _add(findings, "REFERENTIAL_INTEGRITY", "Batch identifiers are duplicated.")
        batch_by_id[batch_id] = batch
        games = batch.get("game_ids", [])
        if (
            not isinstance(games, list)
            or not 2 <= len(games) <= 3
            or len(games) != len(set(games))
        ):
            _add(
                findings,
                "BATCH_GAME_LIMIT_EXCEEDED",
                "Each evidence batch requires 2-3 unique games.",
            )
        if set(games) - set(index["games"]):
            _add(findings, "REFERENTIAL_INTEGRITY", "A batch names an unknown game.")
        if not batch.get("similarities") and not batch.get("differences"):
            _add(findings, "REFERENTIAL_INTEGRITY", "A batch has no evidence.")
        for kind in ("similarities", "differences"):
            for finding in batch.get(kind, []):
                _shape(findings, finding, FINDING_KEYS)
                finding_id = finding.get("finding_id")
                if finding_id in finding_by_id:
                    _add(
                        findings,
                        "REFERENTIAL_INTEGRITY",
                        "Finding identifiers are duplicated.",
                    )
                finding_by_id[finding_id] = (batch_id, kind, finding)
                if finding.get("basis") != "exact-accepted-behavior":
                    _add(
                        findings,
                        "INVENTED_BEHAVIOR",
                        "A finding is not based on exact accepted behavior.",
                    )
                refs = finding.get("consumer_refs", [])
                ref_games = {
                    ref.get("game_id") for ref in refs if isinstance(ref, dict)
                }
                if len(ref_games) < 2:
                    _add(
                        findings,
                        "NEGATIVE_EQUIVALENCE",
                        "Cross-game findings need two independently evidenced games.",
                    )
                if ref_games - set(games):
                    _add(
                        findings,
                        "REFERENTIAL_INTEGRITY",
                        "Evidence consumers fall outside their bounded batch.",
                    )
                for consumer in refs:
                    _validate_consumer(findings, consumer, index, standardize=False)
                    if isinstance(consumer, dict):
                        evidence_edges.append(
                            (
                                consumer.get("game_id"),
                                consumer.get("claim_id"),
                                consumer.get("record_id"),
                                consumer.get("field_id"),
                                consumer.get("value_sha256"),
                                batch.get("capability_id"),
                                batch_id,
                                "similarity"
                                if kind == "similarities"
                                else "difference",
                                finding_id,
                            )
                        )
        checks += 1

    capability_by_id: dict[str, dict[str, Any]] = {}
    routed_records: list[str] = []
    for capability in classifications.get("capabilities", []):
        _shape(findings, capability, CAPABILITY_KEYS)
        capability_id = capability.get("capability_id")
        if capability_id in capability_by_id:
            _add(findings, "REFERENTIAL_INTEGRITY", "Capability identifiers duplicate.")
        capability_by_id[capability_id] = capability
        name = capability.get("name")
        behavior = capability.get("behavior_contract")
        if (
            not isinstance(name, str)
            or len(name.strip()) < 4
            or name.strip().lower() in {"capability", str(capability_id).lower()}
            or not isinstance(behavior, str)
            or len(behavior.strip()) < 24
        ):
            _add(
                findings,
                "OPAQUE_CAPABILITY_CONTRACT",
                "A canonical capability lacks a readable name or behavior contract.",
            )
        owner = capability.get("owner")
        disposition = capability.get("disposition")
        if owner not in OWNERS or disposition not in DISPOSITIONS:
            _add(findings, "INVALID_SCHEMA", "Owner or disposition is unsupported.")
        batch_ids = capability.get("evidence_batch_ids", [])
        expected_batches = {
            bid
            for bid, batch in batch_by_id.items()
            if batch.get("capability_id") == capability_id
        }
        if (
            not batch_ids
            or set(batch_ids) != expected_batches
            or len(batch_ids) != len(set(batch_ids))
        ):
            _add(
                findings,
                "CROSS_BATCH_AGGREGATION_MISSING",
                "Canonical capability batch aggregation is incomplete.",
            )
        similarities = capability.get("similarities", [])
        differences = capability.get("differences", [])
        expected_similarities = {
            fid
            for fid, (bid, kind, _) in finding_by_id.items()
            if bid in expected_batches and kind == "similarities"
        }
        expected_differences = {
            fid
            for fid, (bid, kind, _) in finding_by_id.items()
            if bid in expected_batches and kind == "differences"
        }
        if (
            set(similarities) != expected_similarities
            or set(differences) != expected_differences
        ):
            _add(
                findings,
                "CROSS_BATCH_AGGREGATION_MISSING",
                "Capability finding aggregation is incomplete.",
            )
        expected_consumers = {
            _canonical_digest(consumer): consumer
            for bid in expected_batches
            for kind in ("similarities", "differences")
            for finding in batch_by_id[bid].get(kind, [])
            for consumer in finding.get("consumer_refs", [])
            if isinstance(consumer, dict)
        }
        actual_consumers = capability.get("consumers", [])
        actual_keys = [
            _canonical_digest(consumer)
            for consumer in actual_consumers
            if isinstance(consumer, dict)
        ]
        if set(actual_keys) != set(expected_consumers) or len(actual_keys) != len(
            set(actual_keys)
        ):
            _add(
                findings,
                "SCENE_STATE_CONSUMER_OMITTED",
                "Canonical capability consumers do not exactly aggregate batch evidence.",
            )
        strong_games: set[str] = set()
        consumer_games: set[str] = set()
        for consumer in actual_consumers:
            game, strong = _validate_consumer(
                findings,
                consumer,
                index,
                standardize=disposition == "standardize",
            )
            if game is not None:
                consumer_games.add(game)
            if strong and game is not None:
                strong_games.add(game)
            if (
                isinstance(consumer, dict)
                and consumer.get("record_id") in index["mechanic_records"]
            ):
                routed_records.append(consumer.get("record_id"))
        if disposition in {"standardize", "extend"} and len(consumer_games) < 2:
            _add(
                findings,
                "INSUFFICIENT_INDEPENDENT_CONSUMERS",
                "Standardize/extend requires two independently evidenced games.",
            )
        if disposition == "standardize" and len(strong_games) < 2:
            _add(
                findings,
                "PROVISIONAL_ONLY_STANDARDIZATION",
                "Standardization lacks two resolved strong-evidence consumers.",
            )
        if disposition == "extend" and (not similarities or not differences):
            _add(
                findings,
                "EXTENSION_EVIDENCE_MISSING",
                "Extend requires a shared core and meaningful differences.",
            )
        tests = capability.get("tests", [])
        if not tests:
            _add(findings, "MISSING_REQUIRED_FIELD", "Capability tests are required.")
        for test in tests:
            _shape(findings, test, TEST_KEYS)
            valid_findings = set(similarities) | set(differences)
            if test.get("assertion") not in {
                "preserve-shared-contract",
                "preserve-game-difference",
            } or not set(test.get("finding_ids", [])).issubset(valid_findings):
                _add(
                    findings,
                    "REFERENTIAL_INTEGRITY",
                    "A capability test references invalid evidence.",
                )
        checks += 1

    boundary_by_capability: dict[str, dict[str, Any]] = {}
    for boundary in boundaries.get("boundaries", []):
        _shape(findings, boundary, BOUNDARY_KEYS)
        capability_id = boundary.get("capability_id")
        if capability_id in boundary_by_capability:
            _add(findings, "REFERENTIAL_INTEGRITY", "Boundary duplicates capability.")
        boundary_by_capability[capability_id] = boundary
        capability = capability_by_id.get(capability_id)
        if capability is None or boundary.get("boundary_id") != capability.get(
            "extension_boundary"
        ):
            _add(
                findings,
                "REFERENTIAL_INTEGRITY",
                "A boundary does not bind its canonical capability.",
            )
            continue
        incompatibility = boundary.get("incompatibility_difference_finding_ids", [])
        if capability.get("disposition") == "extend" and (
            not isinstance(boundary.get("shared_core"), str)
            or not boundary["shared_core"].strip()
            or not isinstance(boundary.get("extension_points"), list)
            or not boundary["extension_points"]
        ):
            _add(
                findings,
                "EXTENSION_EVIDENCE_MISSING",
                "Extend requires a readable shared core and extension points.",
            )
        if not set(incompatibility).issubset(set(capability.get("differences", []))):
            _add(
                findings,
                "REFERENTIAL_INTEGRITY",
                "Boundary incompatibilities are not exact difference findings.",
            )
        if capability.get("disposition") in {"game-specific", "bespoke"} and (
            not capability.get("differences") or not incompatibility
        ):
            _add(
                findings,
                "BESPOKE_WITHOUT_INCOMPATIBILITY",
                "Game-specific/bespoke requires exact incompatibility differences.",
            )
    if set(boundary_by_capability) != set(capability_by_id):
        _add(
            findings,
            "REFERENTIAL_INTEGRITY",
            "Each capability requires exactly one extension boundary.",
        )

    for row in classifications.get("non_capability_context", []):
        _shape(findings, row, NON_CAPABILITY_KEYS)
        consumer = row.get("consumer")
        _validate_consumer(findings, consumer, index, standardize=False)
        if (
            isinstance(consumer, dict)
            and consumer.get("record_id") in index["mechanic_records"]
        ):
            routed_records.append(consumer.get("record_id"))
        if (
            row.get("disposition") != "non-capability-context"
            or not isinstance(row.get("rationale"), str)
            or not row["rationale"].strip()
        ):
            _add(
                findings,
                "INVALID_SCHEMA",
                "Non-capability context requires explicit disposition and rationale.",
            )
    expected_records = set(index["mechanic_records"])
    actual_records = set(routed_records)
    if (
        actual_records != expected_records
        or len(routed_records) != len(actual_records)
        or {
            index["mechanic_records"][rid]["game_id"]
            for rid in actual_records
            if rid in expected_records
        }
        != set(index["games"])
    ):
        _add(
            findings,
            "MECHANIC_ROUTING_MISMATCH",
            "All 633 mechanic records and 28 games must route exactly once.",
        )

    _validate_dependencies(
        findings,
        inputs,
        dependencies,
        capability_by_id,
        routed_records,
        evidence_edges,
    )
    receipt = bundle[MAPPER_RECEIPT]
    _shape(findings, receipt, RECEIPT_KEYS)
    if (
        receipt.get("owner_role") != "capability-mapper"
        or receipt.get("task_id") != "phase2-map-capabilities-v2"
        or receipt.get("dispatch_sha256") != DISPATCH_SHA256
        or receipt.get("truth_contract") != _truth_contract(track_root)
    ):
        _add(findings, "STALE_OR_WRONG_RECEIPT", "Mapper receipt authority differs.")
    expected_hashes = output_hashes or {
        path: _canonical_digest(bundle[path]) for path in MAPPER_OUTPUTS
    }
    if receipt.get("output_hashes") != expected_hashes:
        _add(findings, "TAMPERED_HASH", "Mapper output hashes differ.")
    total_bytes = sum(
        len(json.dumps(bundle[path], separators=(",", ":")).encode())
        for path in MAPPER_OUTPUTS
    )
    if full and output_hashes is not None:
        total_bytes = sum((track_root / path).stat().st_size for path in MAPPER_OUTPUTS)
    if total_bytes > MAX_OUTPUT_BYTES:
        _add(findings, "OUTPUT_BUDGET_EXCEEDED", "Published outputs exceed 1 MiB.")
    checks += (
        len(index["source_claims"])
        + len(index["mechanic_records"])
        + len(evidence_edges)
        + len(routed_records)
    )
    return sorted(findings, key=lambda item: item.code), checks


def _validate_dependencies(
    findings: list[Finding],
    inputs: dict[str, Any],
    dependencies: dict[str, Any],
    capability_by_id: dict[str, dict[str, Any]],
    routed_records: list[str],
    evidence_edges: list[tuple[Any, ...]],
) -> None:
    """Validates complete claim preservation and exact evidence edges."""
    index = _indices(inputs)
    for row in dependencies.get("upstream_claims", []):
        _shape(findings, row, DEPENDENCY_CLAIM_KEYS)
    expected_claims = {
        (row["game_id"], row["claim_id"], row["routing_disposition"])
        for row in inputs["source"]["upstream_claims"]
    }
    actual_claims = {
        (
            row.get("game_id"),
            row.get("claim_id"),
            row.get("phase1_routing_disposition"),
        )
        for row in dependencies.get("upstream_claims", [])
    }
    if actual_claims != expected_claims or len(
        dependencies.get("upstream_claims", [])
    ) != len(expected_claims):
        _add(findings, "CLAIM_SET_MISMATCH", "All 1,248 Phase 1 claims must remain.")
    capability_records = {
        consumer["record_id"]
        for capability in capability_by_id.values()
        for consumer in capability.get("consumers", [])
        if isinstance(consumer, dict) and "record_id" in consumer
    }
    for row in dependencies.get("upstream_claims", []):
        key = (row.get("game_id"), row.get("claim_id"))
        source = index["source_claims"].get(key)
        if source is None:
            continue
        route = source["routing_disposition"]
        record_id = f"{key[0]}:{key[1]}"
        if route == "blocked-upstream-unknown":
            expected_disposition = "preserved-upstream-unknown"
            expected_records: list[str] = []
        elif route != "phase1-mechanic":
            expected_disposition = "preserved-non-mechanic"
            expected_records = []
        elif record_id in capability_records:
            expected_disposition = "capability-consumer"
            expected_records = [record_id]
        else:
            expected_disposition = "non-capability-context"
            expected_records = [record_id]
        if (
            row.get("phase2_disposition") != expected_disposition
            or row.get("phase2_record_ids") != expected_records
        ):
            _add(
                findings,
                "DEPENDENCY_MISMATCH",
                "Claim disposition or exact routed record differs.",
            )
    for row in dependencies.get("edges", []):
        _shape(findings, row, DEPENDENCY_EDGE_KEYS)
    actual_edges = [
        (
            row.get("game_id"),
            row.get("claim_id"),
            row.get("record_id"),
            row.get("field_id"),
            row.get("value_sha256"),
            row.get("capability_id"),
            row.get("batch_id"),
            row.get("finding_kind"),
            row.get("finding_id"),
        )
        for row in dependencies.get("edges", [])
    ]
    if sorted(actual_edges) != sorted(evidence_edges):
        _add(
            findings,
            "DEPENDENCY_MISMATCH",
            "Dependency edges do not exactly equal evidence consumer references.",
        )
    unknowns = [
        row
        for row in dependencies.get("upstream_claims", [])
        if row.get("phase1_routing_disposition") == "blocked-upstream-unknown"
    ]
    if len(unknowns) != 24 or any(
        row.get("phase2_disposition") != "preserved-upstream-unknown"
        or row.get("phase2_record_ids")
        for row in unknowns
    ):
        _add(
            findings,
            "UNKNOWN_RESOLUTION",
            "All 24 upstream unknowns must remain unresolved.",
        )
    del routed_records


def _refresh_receipt(track_root: Path, bundle: dict[str, dict[str, Any]]) -> None:
    """Refreshes synthetic mapper hashes after a bounded fixture mutation."""
    bundle[MAPPER_RECEIPT]["truth_contract"] = _truth_contract(track_root)
    bundle[MAPPER_RECEIPT]["output_hashes"] = {
        path: _canonical_digest(bundle[path]) for path in MAPPER_OUTPUTS
    }


def _replace_capability_consumers(
    inputs: dict[str, Any],
    bundle: dict[str, dict[str, Any]],
    records: list[dict[str, Any]],
) -> None:
    """Replaces fixture evidence and canonical consumers with selected records."""
    comparison = bundle[MAPPER_OUTPUTS[0]]
    classification = bundle[MAPPER_OUTPUTS[1]]
    refs = [_consumer(record) for record in records]
    batch = comparison["evidence_batches"][0]
    comparison["evidence_batches"] = [batch]
    batch["game_ids"] = [ref["game_id"] for ref in refs]
    batch["similarities"][0]["consumer_refs"] = copy.deepcopy(refs)
    batch["capability_id"] = "capability:fixture"
    capability = classification["capabilities"][0]
    capability["evidence_batch_ids"] = [batch["batch_id"]]
    capability["consumers"] = copy.deepcopy(refs)
    capability["similarities"] = [batch["similarities"][0]["finding_id"]]
    capability["differences"] = []
    capability["tests"][0]["finding_ids"] = [batch["similarities"][0]["finding_id"]]
    used = {record["record_id"] for record in records}
    classification["non_capability_context"] = [
        {
            "consumer": _consumer(record),
            "disposition": "non-capability-context",
            "rationale": "No cross-game capability decision in this bounded fixture.",
        }
        for record in inputs["mechanic"]["records"]
        if record["record_id"] not in used
    ]


def _apply_fixture(
    track_root: Path,
    inputs: dict[str, Any],
    bundle: dict[str, dict[str, Any]],
    case: dict[str, Any],
) -> None:
    """Applies one bounded v2 counterexample operation."""
    op = case["mutation"]["operation"]
    comparisons, classifications, boundaries, dependencies = (
        bundle[path] for path in MAPPER_OUTPUTS
    )
    capability = classifications["capabilities"][0]
    first_batch = comparisons["evidence_batches"][0]
    first_ref = first_batch["similarities"][0]["consumer_refs"][0]
    if op == "disjoint-whole-game-partition-assumption":
        comparisons["batch_policy"]["whole_game_partition_required"] = True
    elif op == "overlap-rejected":
        comparisons["batch_policy"]["overlap_allowed"] = False
    elif op == "cross-batch-aggregation-missing":
        capability["evidence_batch_ids"].pop()
    elif op == "opaque-capability-contract":
        capability["name"] = capability["capability_id"]
        capability["behavior_contract"] = "generic"
    elif op == "scene-state-consumer-omitted":
        del capability["consumers"][0]["scene_id"]
    elif op == "noun-art-only-standardization":
        asset_claims = []
        for claim in inputs["source"]["upstream_claims"]:
            if claim["routing_disposition"] == "deferred-asset" and claim[
                "game_id"
            ] not in {row["game_id"] for row in asset_claims}:
                asset_claims.append(claim)
            if len(asset_claims) == 2:
                break
        fake_records = [
            {
                "game_id": claim["game_id"],
                "scene_id": None,
                "state_id": None,
                "coverage_granularity": "game",
                "scope_status": claim["scope_status"],
                "factual_evidence_status": claim["factual_evidence_status"],
                "source_claim_id": claim["claim_id"],
                "record_id": f"{claim['game_id']}:{claim['claim_id']}",
                "derived_fields": [
                    {"field_id": "fact", "value_sha256": claim["value_sha256"]}
                ],
            }
            for claim in asset_claims
        ]
        _replace_capability_consumers(inputs, bundle, fake_records)
    elif op == "provisional-only-standardization":
        provisional = []
        seen = set()
        for record in inputs["mechanic"]["records"]:
            source = _indices(inputs)["source_claims"][
                (record["game_id"], record["source_claim_id"])
            ]
            if (
                source["confidence"] in {"low", "medium"}
                and record["game_id"] not in seen
            ):
                provisional.append(record)
                seen.add(record["game_id"])
            if len(provisional) == 2:
                break
        _replace_capability_consumers(inputs, bundle, provisional)
    elif op == "bespoke-without-incompatibility":
        capability["disposition"] = "bespoke"
        capability["differences"] = []
        boundaries["boundaries"][0]["incompatibility_difference_finding_ids"] = []
    elif op == "invented-behavior":
        first_ref["value_sha256"] = "0" * 64
    elif op == "placement-status-collapse":
        first_ref["scene_id"] = "invented/scene"
    elif op == "unknown-resolution":
        unknown = next(
            row
            for row in inputs["source"]["upstream_claims"]
            if row["routing_disposition"] == "blocked-upstream-unknown"
        )
        first_ref.update(
            {
                "game_id": unknown["game_id"],
                "claim_id": unknown["claim_id"],
                "record_id": f"{unknown['game_id']}:{unknown['claim_id']}",
                "field_id": "fact",
                "value_sha256": unknown["value_sha256"],
                "scope_status": unknown["scope_status"],
                "factual_evidence_status": unknown["factual_evidence_status"],
            }
        )
    elif op == "missing-required-field":
        del capability["owner"]
    elif op == "surplus-field":
        capability["invented_field"] = True
    elif op == "tampered-hash":
        comparisons["phase1_bindings"][next(iter(PHASE1_INPUTS))] = "0" * 64
    elif op == "output-budget-exceeded":
        capability["behavior_contract"] = "x" * (MAX_OUTPUT_BYTES + 1)
    elif op == "four-game-batch":
        first_batch["game_ids"].extend(list(_indices(inputs)["games"])[3:5])
    elif op == "remove-mechanic-route":
        classifications["non_capability_context"].pop()
    elif op == "remove-upstream-claim":
        dependencies["upstream_claims"].pop()
    elif op == "remove-dependency-edge":
        dependencies["edges"].pop()
    elif op == "wrong-owner":
        bundle[MAPPER_RECEIPT]["owner_role"] = "truth-test-author"
    else:
        raise ValueError(f"unknown fixture operation {op}")
    if op in {
        "noun-art-only-standardization",
        "provisional-only-standardization",
    }:
        _refresh_dependencies(inputs, bundle)
    if op not in {"wrong-owner"}:
        _refresh_receipt(track_root, bundle)


def _load_fixture(track_root: Path, path: Path) -> dict[str, Any]:
    """Loads a fixture only when it exactly matches the v2 manifest binding."""
    manifest = _load(track_root / FIXTURE_MANIFEST)
    if (
        manifest.get("fixture_count") != len(manifest.get("fixtures", []))
        or len(manifest["fixtures"]) > MAX_FIXTURE_FILES
    ):
        raise ValueError("fixture budget differs")
    relative = path.resolve().relative_to(track_root.resolve()).as_posix()
    binding = next(row for row in manifest["fixtures"] if row["path"] == relative)
    if _sha(path) != binding["sha256"]:
        raise ValueError("fixture hash differs")
    return _load(path)


def verify_phase2(
    repo_root: Path, track_root: Path, fixture_path: Path | None = None
) -> VerificationResult:
    """Verifies v2 inputs, bound counterexamples, or live mapper outputs."""
    del repo_root
    findings: list[Finding] = []
    checks, inputs = _verify_inputs(track_root, findings)
    if findings:
        return VerificationResult("INVALID", tuple(findings), checks)
    if fixture_path is not None:
        try:
            fixture = _load_fixture(track_root, fixture_path)
            template = _canonical_bundle(track_root, inputs)
            for case in fixture["cases"]:
                bundle = copy.deepcopy(template)
                _apply_fixture(track_root, inputs, bundle, case)
                case_findings, case_checks = _validate_bundle(
                    track_root, inputs, bundle, False
                )
                actual = {item.code for item in case_findings}
                expected = set(case["expected_codes"])
                if actual != expected:
                    _add(
                        findings,
                        "FIXTURE_CASE_EXPECTATION_MISMATCH",
                        f"{case['id']} emitted {sorted(actual)} not {sorted(expected)}",
                    )
                findings.extend(case_findings)
                checks += case_checks
        except (KeyError, OSError, ValueError, StopIteration, json.JSONDecodeError):
            _add(
                findings,
                "INVALID_FIXTURE_BINDING",
                "A Phase 2 v2 fixture is not manifest-bound.",
            )
        return VerificationResult(
            "INVALID" if findings else "VERIFIED",
            tuple(sorted(findings, key=lambda item: item.code)),
            checks,
        )
    missing = [
        path
        for path in (*MAPPER_OUTPUTS, MAPPER_RECEIPT)
        if not (track_root / path).is_file()
    ]
    if missing:
        _add(
            findings,
            "PHASE2_MAPPER_OUTPUTS_MISSING",
            f"Missing v2-governed mapper outputs: {', '.join(missing)}",
        )
        return VerificationResult(
            "RED_WAITING_FOR_MAPPER_OUTPUTS", tuple(findings), checks
        )
    for path, digest in CANDIDATE_BINDINGS.items():
        if _sha(track_root / path) != digest:
            _add(
                findings,
                "PHASE2_CANDIDATE_DRIFT",
                f"The published mapper candidate differs: {path}",
            )
    if findings:
        return VerificationResult("INVALID", tuple(findings), checks)
    try:
        bundle = {
            path: _load(track_root / path) for path in (*MAPPER_OUTPUTS, MAPPER_RECEIPT)
        }
        output_hashes = {path: _sha(track_root / path) for path in MAPPER_OUTPUTS}
        bundle_findings, bundle_checks = _validate_bundle(
            track_root, inputs, bundle, True, output_hashes=output_hashes
        )
        findings.extend(bundle_findings)
        checks += bundle_checks
    except (KeyError, OSError, ValueError, TypeError, json.JSONDecodeError):
        _add(findings, "INVALID_SCHEMA", "Mapper outputs cannot be validated.")
    return VerificationResult(
        "VERIFIED" if not findings else "INVALID",
        tuple(sorted(findings, key=lambda item: item.code)),
        checks,
    )


def _parser() -> argparse.ArgumentParser:
    """Builds the bounded verifier command-line parser."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--track-root", type=Path, required=True)
    parser.add_argument("--fixture", type=Path)
    parser.add_argument("--expect-codes", nargs="*")
    return parser


def main(argv: list[str] | None = None) -> int:
    """Runs verification and emits a stable machine-readable result."""
    args = _parser().parse_args(argv)
    result = verify_phase2(args.repo_root, args.track_root, args.fixture)
    payload = {
        "schema_version": "apk-t9-phase2-v3-verification-result.v1",
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
