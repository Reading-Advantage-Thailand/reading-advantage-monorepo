"""Fail-closed Phase 2 capability-classification truth verification."""

from __future__ import annotations

import argparse
import copy
from dataclasses import asdict, dataclass
import hashlib
import json
from pathlib import Path
import sys
import time
from typing import Any

TRACK_ID = "apk_evidence_backed_ontology_synthesis_20260712"
DISPATCH_PATH = "phase2-role-dispatch-v1.json"
DISPATCH_SHA256 = "67e737601f8a6eb0337884a9dcac97258452437fc6dc156073707fecd9b783e1"
PHASE1_ACCEPTANCE_PATH = "phase1-root-acceptance.json"
PHASE1_ACCEPTANCE_SHA256 = (
    "bd911f865c95e24874dde657e856718910a05b1737634222055654b331dd020d"
)
PHASE1_INPUTS = {
    "phase1-source-resolution-index-v1.json": "2900222c4fc4db8ffb354d4f25f5c1a8bef6930b2d7e8e1bb692dab27d860bd0",
    "phase1-mechanic-blueprints-v1.json": "ed3bee70f5e7e94ac101f295d9de3f768cdaf9d97d40d4529f2fbbbe8f479d61",
    "phase1-developer-effort-baseline-v1.json": "168403610d0c69160777ddeca5753dcc57b97e2a7db6ceed65f3e4ce64d14f91",
    "phase1-claim-dependency-edges-v1.json": "2b279df4896c9620ea9acf17506e942c9df98e2b4d6c06a29d5293106aff0987",
}
MAPPER_OUTPUTS = (
    "phase2-capability-comparisons-v1.json",
    "phase2-capability-classification-v1.json",
    "phase2-extension-boundaries-v1.json",
    "phase2-claim-dependency-edges-v1.json",
)
MAPPER_RECEIPT = "role-receipts/phase2/capability-mapper.json"
FIXTURE_MANIFEST = "phase2-fixture-manifest-v1.json"
MAX_FIXTURE_FILES = 16
MAX_SOURCE_DOCUMENTS = 32
MAX_OUTPUT_BYTES = 1_048_576
MAX_BATCH_GAMES = 3
STRONG_CONFIDENCE = {"high", "exact-source", "exact-bytes", "bounded"}
CURRENT_ROUTES = {"phase1-mechanic", "phase1-effort"}
DEFERRED_ROUTES = {"deferred-asset", "deferred-responsive", "context-only"}
DISPOSITIONS = {"standardize", "extend", "game-specific", "blocked-provisional"}
OWNERS = {"shared-core", "game-extension", "game-local"}

COMPARISON_TOP_KEYS = {
    "schema_version",
    "phase1_bindings",
    "source_document_ids",
    "comparisons",
}
CLASSIFICATION_TOP_KEYS = {"schema_version", "phase1_bindings", "classifications"}
BOUNDARY_TOP_KEYS = {"schema_version", "phase1_bindings", "boundaries"}
DEPENDENCY_TOP_KEYS = {"schema_version", "phase1_bindings", "upstream_claims", "edges"}
BINDING_KEYS = {PHASE1_ACCEPTANCE_PATH, DISPATCH_PATH, *PHASE1_INPUTS}
COMPARISON_KEYS = {
    "comparison_id",
    "batch_id",
    "game_ids",
    "similarities",
    "differences",
    "owner",
    "extension_boundary",
    "tests",
    "disposition",
}
FINDING_KEYS = {"finding_id", "basis", "claim_refs"}
CLAIM_REF_KEYS = {
    "game_id",
    "claim_id",
    "record_id",
    "field_id",
    "value_sha256",
    "scope_status",
    "factual_evidence_status",
}
TEST_KEYS = {"test_id", "assertion", "finding_ids"}
CLASSIFICATION_KEYS = {
    "classification_id",
    "comparison_id",
    "game_ids",
    "similarities",
    "differences",
    "owner",
    "extension_boundary",
    "tests",
    "disposition",
}
BOUNDARY_KEYS = {
    "boundary_id",
    "classification_id",
    "game_ids",
    "similarities",
    "differences",
    "owner",
    "extension_boundary",
    "tests",
    "disposition",
}
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
    "comparison_id",
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
}


@dataclass(frozen=True)
class Finding:
    """One stable Phase 2 truth finding."""

    code: str
    severity: str
    message: str


@dataclass(frozen=True)
class VerificationResult:
    """One complete Phase 2 verification result."""

    state: str
    findings: tuple[Finding, ...]
    checks: int

    @property
    def passed(self) -> bool:
        """Returns whether the Phase 2 bundle is verified."""
        return self.state == "VERIFIED" and not self.findings

    def to_dict(self) -> dict[str, Any]:
        """Returns a JSON-serializable report."""
        return {
            "schema_version": "apk-t9-phase2-truth-report.v1",
            "track_id": TRACK_ID,
            "phase": 2,
            "state": self.state,
            "status": "pass" if self.passed else "blocked",
            "checks": self.checks,
            "findings": [asdict(item) for item in self.findings],
        }


def _add(findings: list[Finding], code: str, message: str) -> None:
    """Adds one Critical finding once per code."""
    if code not in {item.code for item in findings}:
        findings.append(Finding(code, "Critical", message))


def _load(path: Path) -> dict[str, Any]:
    """Loads one JSON object."""
    value = json.loads(path.read_text())
    if not isinstance(value, dict):
        raise ValueError("JSON root must be an object")
    return value


def _sha(path: Path) -> str:
    """Returns the raw SHA-256 digest for one file."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _canonical_digest(value: Any) -> str:
    """Returns a deterministic JSON value digest."""
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def _bindings() -> dict[str, str]:
    """Returns exact accepted Phase 1 and Phase 2 authority bindings."""
    return {
        PHASE1_ACCEPTANCE_PATH: PHASE1_ACCEPTANCE_SHA256,
        DISPATCH_PATH: DISPATCH_SHA256,
        **PHASE1_INPUTS,
    }


def _truth_contract(track_root: Path) -> dict[str, str]:
    """Returns the published truth-contract hashes mapper receipts must bind."""
    paths = (
        "phase2_truth_verifier.py",
        "phase2_truth_verifier_test.py",
        FIXTURE_MANIFEST,
        "phase2-red-report-v1.json",
    )
    return {path: _sha(track_root / path) for path in paths}


def _verify_inputs(
    track_root: Path, findings: list[Finding]
) -> tuple[int, dict[str, Any]]:
    """Verifies Phase 2 authority and accepted Phase 1 inputs."""
    fixed = {
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
    acceptance = _load(track_root / PHASE1_ACCEPTANCE_PATH)
    source = _load(track_root / "phase1-source-resolution-index-v1.json")
    mechanic = _load(track_root / "phase1-mechanic-blueprints-v1.json")
    effort = _load(track_root / "phase1-developer-effort-baseline-v1.json")
    dependency = _load(track_root / "phase1-claim-dependency-edges-v1.json")
    if (
        dispatch.get("status") != "active"
        or dispatch.get("phase") != 2
        or acceptance.get("decision") != "ACCEPT_PHASE1_OPEN_PHASE2"
    ):
        _add(
            findings,
            "PHASE2_INPUT_DRIFT",
            "Phase 2 authority is not active and accepted.",
        )
    if (
        len(source.get("upstream_claims", [])) != 1248
        or len(mechanic.get("records", [])) != 633
        or len(effort.get("records", [])) != 376
        or len(dependency.get("upstream_claims", [])) != 1248
    ):
        _add(findings, "PHASE2_INPUT_DRIFT", "Accepted Phase 1 cardinalities differ.")
    return len(fixed) + 6, {
        "dispatch": dispatch,
        "source": source,
        "mechanic": mechanic,
        "effort": effort,
        "dependency": dependency,
    }


def _indices(inputs: dict[str, Any]) -> dict[str, Any]:
    """Builds immutable lookup tables from accepted Phase 1 evidence."""
    source_claims = {
        (row["game_id"], row["claim_id"]): row
        for row in inputs["source"]["upstream_claims"]
    }
    mechanic_records = {
        (row["game_id"], row["source_claim_id"]): row
        for row in inputs["mechanic"]["records"]
    }
    all_records = {
        **mechanic_records,
        **{
            (row["game_id"], row["source_claim_id"]): row
            for row in inputs["effort"]["records"]
        },
    }
    games = tuple(inputs["source"]["denominator"]["resolvable_game_ids"])
    documents = tuple(
        row["document_id"] for row in inputs["source"]["source_artifacts"]
    )
    return {
        "source_claims": source_claims,
        "mechanic_records": mechanic_records,
        "all_records": all_records,
        "games": games,
        "documents": documents,
    }


def _claim_ref(record: dict[str, Any]) -> dict[str, Any]:
    """Builds one exact Phase 1 mechanic claim reference."""
    field = record["derived_fields"][0]
    return {
        "game_id": record["game_id"],
        "claim_id": record["source_claim_id"],
        "record_id": record["record_id"],
        "field_id": field["field_id"],
        "value_sha256": field["value_sha256"],
        "scope_status": record["scope_status"],
        "factual_evidence_status": record["factual_evidence_status"],
    }


def _canonical_bundle(
    track_root: Path, inputs: dict[str, Any]
) -> dict[str, dict[str, Any]]:
    """Builds one minimal decision-free valid bundle for counterexamples."""
    index = _indices(inputs)
    selected = []
    seen = set()
    for record in inputs["mechanic"]["records"]:
        claim = index["source_claims"][(record["game_id"], record["source_claim_id"])]
        if (
            claim["confidence"] in STRONG_CONFIDENCE
            and record["game_id"] not in seen
            and record["scope_status"] == "resolved"
        ):
            selected.append(record)
            seen.add(record["game_id"])
        if len(selected) == 2:
            break
    refs = [_claim_ref(record) for record in selected]
    games = [record["game_id"] for record in selected]
    comparison = {
        "comparison_id": "comparison:fixture",
        "batch_id": "batch:fixture",
        "game_ids": games,
        "similarities": [
            {
                "finding_id": "similarity:fixture",
                "basis": "exact-accepted-behavior",
                "claim_refs": refs,
            }
        ],
        "differences": [],
        "owner": "shared-core",
        "extension_boundary": "boundary:comparison:fixture",
        "tests": [
            {
                "test_id": "test:fixture",
                "assertion": "preserve-shared-contract",
                "finding_ids": ["similarity:fixture"],
            }
        ],
        "disposition": "standardize",
    }
    classification = {
        "classification_id": "classification:comparison:fixture",
        "comparison_id": comparison["comparison_id"],
        "game_ids": games,
        "similarities": ["similarity:fixture"],
        "differences": [],
        "owner": comparison["owner"],
        "extension_boundary": comparison["extension_boundary"],
        "tests": ["test:fixture"],
        "disposition": comparison["disposition"],
    }
    boundary = {
        "boundary_id": comparison["extension_boundary"],
        "classification_id": classification["classification_id"],
        "game_ids": games,
        "similarities": classification["similarities"],
        "differences": [],
        "owner": classification["owner"],
        "extension_boundary": comparison["extension_boundary"],
        "tests": classification["tests"],
        "disposition": classification["disposition"],
    }
    used = {
        (ref["game_id"], ref["claim_id"]): [comparison["comparison_id"]] for ref in refs
    }
    upstream = []
    for row in inputs["dependency"]["upstream_claims"]:
        key = (row["game_id"], row["claim_id"])
        route = row["routing_disposition"]
        if route == "blocked-upstream-unknown":
            phase2 = "preserved-upstream-unknown"
        elif route in DEFERRED_ROUTES:
            phase2 = "preserved-deferred"
        elif key in used:
            phase2 = "comparison-evidence"
        else:
            phase2 = "retained-unclassified"
        upstream.append(
            {
                "game_id": row["game_id"],
                "claim_id": row["claim_id"],
                "phase1_routing_disposition": route,
                "phase2_disposition": phase2,
                "phase2_record_ids": used.get(key, []),
            }
        )
    edges = [
        {
            "game_id": ref["game_id"],
            "claim_id": ref["claim_id"],
            "comparison_id": comparison["comparison_id"],
            "finding_kind": "similarity",
            "finding_id": "similarity:fixture",
        }
        for ref in refs
    ]
    bindings = _bindings()
    bundle = {
        MAPPER_OUTPUTS[0]: {
            "schema_version": "apk-t9-phase2-capability-comparisons.v1",
            "phase1_bindings": bindings,
            "source_document_ids": list(index["documents"]),
            "comparisons": [comparison],
        },
        MAPPER_OUTPUTS[1]: {
            "schema_version": "apk-t9-phase2-capability-classification.v1",
            "phase1_bindings": bindings,
            "classifications": [classification],
        },
        MAPPER_OUTPUTS[2]: {
            "schema_version": "apk-t9-phase2-extension-boundaries.v1",
            "phase1_bindings": bindings,
            "boundaries": [boundary],
        },
        MAPPER_OUTPUTS[3]: {
            "schema_version": "apk-t9-phase2-claim-dependency-graph.v1",
            "phase1_bindings": bindings,
            "upstream_claims": upstream,
            "edges": edges,
        },
    }
    bundle[MAPPER_RECEIPT] = {
        "agent_ref": "/root/phase5_review_a/t9_phase0_final_reviewer",
        "owner_role": "capability-mapper",
        "task_id": "phase2-map-capabilities",
        "dispatch_sha256": DISPATCH_SHA256,
        "truth_contract": _truth_contract(track_root),
        "output_hashes": {
            path: _canonical_digest(bundle[path]) for path in MAPPER_OUTPUTS
        },
    }
    return bundle


def _shape(findings: list[Finding], actual: dict[str, Any], required: set[str]) -> None:
    """Rejects missing and surplus keys on one production object."""
    if set(actual) - required:
        _add(findings, "SURPLUS_FIELD", "A Phase 2 object contains undeclared fields.")
    if required - set(actual):
        _add(
            findings,
            "MISSING_REQUIRED_FIELD",
            "A Phase 2 object omits required fields.",
        )


def _validate_bundle(
    track_root: Path,
    inputs: dict[str, Any],
    bundle: dict[str, dict[str, Any]],
    full: bool,
    output_hashes: dict[str, str] | None = None,
) -> tuple[list[Finding], int]:
    """Validates a complete mapper bundle without authoring classifications."""
    findings: list[Finding] = []
    checks = 0
    try:
        comparisons, classifications, boundaries, dependencies = (
            bundle[path] for path in MAPPER_OUTPUTS
        )
        receipt = bundle[MAPPER_RECEIPT]
        if any(
            len(json.dumps(bundle[path], separators=(",", ":")).encode())
            > MAX_OUTPUT_BYTES
            for path in MAPPER_OUTPUTS
        ):
            _add(
                findings,
                "OUTPUT_BUDGET_EXCEEDED",
                "A Phase 2 output exceeds the 1 MiB ceiling.",
            )
        expected_schemas = (
            "apk-t9-phase2-capability-comparisons.v1",
            "apk-t9-phase2-capability-classification.v1",
            "apk-t9-phase2-extension-boundaries.v1",
            "apk-t9-phase2-claim-dependency-graph.v1",
        )
        for document, schema in zip(
            (comparisons, classifications, boundaries, dependencies),
            expected_schemas,
            strict=True,
        ):
            if document.get("schema_version") != schema:
                _add(findings, "INVALID_SCHEMA", "A mapper schema version differs.")
            if document.get("phase1_bindings") != _bindings():
                _add(findings, "TAMPERED_HASH", "Accepted Phase 1 bindings differ.")
        _shape(findings, comparisons, COMPARISON_TOP_KEYS)
        _shape(findings, classifications, CLASSIFICATION_TOP_KEYS)
        _shape(findings, boundaries, BOUNDARY_TOP_KEYS)
        _shape(findings, dependencies, DEPENDENCY_TOP_KEYS)
        _shape(findings, receipt, RECEIPT_KEYS)
        index = _indices(inputs)
        docs = comparisons.get("source_document_ids", [])
        if len(docs) > MAX_SOURCE_DOCUMENTS or docs != list(index["documents"]):
            _add(
                findings,
                "SOURCE_DOCUMENT_BUDGET",
                "Normalized source documents differ or exceed 32.",
            )
        comparison_by_id = {}
        finding_by_id = {}
        evidence_edges = []
        batch_games: dict[str, tuple[str, ...]] = {}
        for row in comparisons.get("comparisons", []):
            _shape(findings, row, COMPARISON_KEYS)
            cid = row.get("comparison_id")
            if not isinstance(cid, str) or cid in comparison_by_id:
                _add(
                    findings,
                    "REFERENTIAL_INTEGRITY",
                    "Comparison identifiers are missing or duplicated.",
                )
            comparison_by_id[cid] = row
            games = row.get("game_ids", [])
            if (
                len(games) < 2
                or len(games) > MAX_BATCH_GAMES
                or len(set(games)) != len(games)
            ):
                _add(
                    findings,
                    "BATCH_GAME_LIMIT_EXCEEDED",
                    "Comparison batches require 2-3 unique games.",
                )
            batch = row.get("batch_id")
            prior = batch_games.setdefault(batch, tuple(games))
            if prior != tuple(games):
                _add(
                    findings,
                    "BATCH_GAME_LIMIT_EXCEEDED",
                    "One batch declares inconsistent games.",
                )
            if (
                row.get("owner") not in OWNERS
                or row.get("disposition") not in DISPOSITIONS
            ):
                _add(findings, "INVALID_SCHEMA", "Owner or disposition is unsupported.")
            if not row.get("similarities") and not row.get("differences"):
                _add(
                    findings,
                    "REFERENTIAL_INTEGRITY",
                    "A comparison has no evidence findings.",
                )
            all_finding_ids = set()
            strong_by_game = set()
            for kind in ("similarities", "differences"):
                for finding in row.get(kind, []):
                    _shape(findings, finding, FINDING_KEYS)
                    fid = finding.get("finding_id")
                    if fid in finding_by_id:
                        _add(
                            findings,
                            "REFERENTIAL_INTEGRITY",
                            "Finding identifiers are duplicated.",
                        )
                    finding_by_id[fid] = (cid, kind, finding)
                    all_finding_ids.add(fid)
                    if finding.get("basis") != "exact-accepted-behavior":
                        _add(
                            findings,
                            "INVENTED_BEHAVIOR",
                            "A finding is not exact accepted behavior.",
                        )
                    refs = finding.get("claim_refs", [])
                    if len({ref.get("game_id") for ref in refs}) < 2:
                        _add(
                            findings,
                            "NEGATIVE_EQUIVALENCE",
                            "Cross-game findings require evidence from multiple games.",
                        )
                    for ref in refs:
                        _shape(findings, ref, CLAIM_REF_KEYS)
                        key = (ref.get("game_id"), ref.get("claim_id"))
                        source = index["source_claims"].get(key)
                        mechanic = index["mechanic_records"].get(key)
                        if source is None:
                            _add(
                                findings,
                                "INVENTED_BEHAVIOR",
                                "A claim reference is absent from Phase 1.",
                            )
                            continue
                        if source["routing_disposition"] == "blocked-upstream-unknown":
                            _add(
                                findings,
                                "UNKNOWN_RESOLUTION",
                                "An upstream unknown was resolved or compared.",
                            )
                        if source["routing_disposition"] != "phase1-mechanic":
                            _add(
                                findings,
                                "NOUN_ART_ONLY_STANDARDIZATION",
                                "Standardization uses non-behavioral noun/art/effort evidence.",
                            )
                        if mechanic is None:
                            _add(
                                findings,
                                "INVENTED_BEHAVIOR",
                                "Behavioral evidence has no mechanic record.",
                            )
                            continue
                        expected = _claim_ref(mechanic)
                        if ref != expected:
                            _add(
                                findings,
                                "INVENTED_BEHAVIOR",
                                "A claim reference differs from accepted Phase 1 behavior.",
                            )
                        if (
                            ref.get("scope_status") != source["scope_status"]
                            or ref.get("factual_evidence_status")
                            != source["factual_evidence_status"]
                        ):
                            _add(
                                findings,
                                "PLACEMENT_STATUS_COLLAPSE",
                                "Placement or factual status was collapsed.",
                            )
                        if ref.get("game_id") not in games:
                            _add(
                                findings,
                                "REFERENTIAL_INTEGRITY",
                                "Evidence falls outside its batch.",
                            )
                        if source.get("confidence") in STRONG_CONFIDENCE:
                            strong_by_game.add(ref["game_id"])
                        evidence_edges.append(
                            (
                                ref["game_id"],
                                ref["claim_id"],
                                cid,
                                "similarity"
                                if kind == "similarities"
                                else "difference",
                                fid,
                            )
                        )
            if row.get("disposition") == "standardize" and set(games) - strong_by_game:
                _add(
                    findings,
                    "PROVISIONAL_ONLY_STANDARDIZATION",
                    "Standardization is supported only by provisional evidence.",
                )
            tests = row.get("tests", [])
            if not tests:
                _add(
                    findings, "MISSING_REQUIRED_FIELD", "Comparison tests are required."
                )
            for test in tests:
                _shape(findings, test, TEST_KEYS)
                if test.get("assertion") not in {
                    "preserve-shared-contract",
                    "preserve-game-difference",
                } or not set(test.get("finding_ids", [])).issubset(all_finding_ids):
                    _add(
                        findings,
                        "REFERENTIAL_INTEGRITY",
                        "A test does not reference its comparison findings.",
                    )
        if full:
            batches = list(batch_games.values())
            flattened = [game for games in batches for game in games]
            if set(flattened) != set(index["games"]) or len(flattened) != len(
                set(flattened)
            ):
                _add(
                    findings,
                    "BATCH_COVERAGE_MISMATCH",
                    "Batches must partition all 28 resolvable games exactly once.",
                )
        class_by_comparison = {}
        for row in classifications.get("classifications", []):
            _shape(findings, row, CLASSIFICATION_KEYS)
            comparison = comparison_by_id.get(row.get("comparison_id"))
            if comparison is None:
                _add(
                    findings,
                    "REFERENTIAL_INTEGRITY",
                    "Classification references no comparison.",
                )
                continue
            if (
                row.get("classification_id") != f"classification:{row['comparison_id']}"
                or row["comparison_id"] in class_by_comparison
            ):
                _add(
                    findings,
                    "REFERENTIAL_INTEGRITY",
                    "Classification identity/cardinality differs.",
                )
            expected = {
                "game_ids": comparison["game_ids"],
                "similarities": [x["finding_id"] for x in comparison["similarities"]],
                "differences": [x["finding_id"] for x in comparison["differences"]],
                "owner": comparison["owner"],
                "extension_boundary": comparison["extension_boundary"],
                "tests": [x["test_id"] for x in comparison["tests"]],
                "disposition": comparison["disposition"],
            }
            if any(row.get(key) != value for key, value in expected.items()):
                _add(
                    findings,
                    "REFERENTIAL_INTEGRITY",
                    "Classification does not copy its comparison contract exactly.",
                )
            class_by_comparison[row["comparison_id"]] = row
        if set(class_by_comparison) != set(comparison_by_id):
            _add(
                findings,
                "REFERENTIAL_INTEGRITY",
                "Comparisons and classifications are not one-to-one.",
            )
        boundary_by_class = {}
        for row in boundaries.get("boundaries", []):
            _shape(findings, row, BOUNDARY_KEYS)
            classification = next(
                (
                    x
                    for x in classifications.get("classifications", [])
                    if x.get("classification_id") == row.get("classification_id")
                ),
                None,
            )
            if classification is None:
                _add(
                    findings,
                    "REFERENTIAL_INTEGRITY",
                    "Boundary references no classification.",
                )
                continue
            if row.get("boundary_id") != classification.get(
                "extension_boundary"
            ) or row.get("extension_boundary") != row.get("boundary_id"):
                _add(findings, "REFERENTIAL_INTEGRITY", "Boundary identity differs.")
            expected = {
                key: classification[key]
                for key in (
                    "game_ids",
                    "similarities",
                    "differences",
                    "owner",
                    "tests",
                    "disposition",
                )
            }
            if any(row.get(key) != value for key, value in expected.items()):
                _add(
                    findings,
                    "REFERENTIAL_INTEGRITY",
                    "Boundary does not copy classification exactly.",
                )
            boundary_by_class[row["classification_id"]] = row
        if len(boundary_by_class) != len(classifications.get("classifications", [])):
            _add(
                findings,
                "REFERENTIAL_INTEGRITY",
                "Classifications and boundaries are not one-to-one.",
            )
        expected_phase1 = {
            (x["game_id"], x["claim_id"], x["routing_disposition"])
            for x in inputs["dependency"]["upstream_claims"]
        }
        actual_rows = dependencies.get("upstream_claims", [])
        for row in actual_rows:
            _shape(findings, row, DEPENDENCY_CLAIM_KEYS)
        actual_phase1 = {
            (x.get("game_id"), x.get("claim_id"), x.get("phase1_routing_disposition"))
            for x in actual_rows
        }
        if (
            len(actual_rows) != 1248
            or len(actual_phase1) != 1248
            or actual_phase1 != expected_phase1
        ):
            _add(
                findings,
                "CLAIM_SET_MISMATCH",
                "Phase 2 removed, duplicated, or changed an upstream claim.",
            )
        used: dict[tuple[str, str], set[str]] = {}
        for game, claim, cid, _kind, _fid in evidence_edges:
            used.setdefault((game, claim), set()).add(cid)
        for row in actual_rows:
            key = (row.get("game_id"), row.get("claim_id"))
            route = row.get("phase1_routing_disposition")
            records = sorted(used.get(key, set()))
            if route == "blocked-upstream-unknown":
                expected_disposition = "preserved-upstream-unknown"
                records = []
            elif route in DEFERRED_ROUTES:
                expected_disposition = "preserved-deferred"
                records = []
            elif records:
                expected_disposition = "comparison-evidence"
            else:
                expected_disposition = "retained-unclassified"
            if (
                row.get("phase2_disposition") != expected_disposition
                or row.get("phase2_record_ids") != records
            ):
                _add(
                    findings,
                    "DEPENDENCY_MISMATCH",
                    "Claim disposition or Phase 2 references differ.",
                )
        actual_edges = []
        for edge in dependencies.get("edges", []):
            _shape(findings, edge, DEPENDENCY_EDGE_KEYS)
            actual_edges.append(
                (
                    edge.get("game_id"),
                    edge.get("claim_id"),
                    edge.get("comparison_id"),
                    edge.get("finding_kind"),
                    edge.get("finding_id"),
                )
            )
        if sorted(actual_edges) != sorted(evidence_edges):
            _add(
                findings,
                "DEPENDENCY_MISMATCH",
                "Claim dependency edges differ from comparison evidence.",
            )
        expected_hashes = output_hashes or {
            path: _canonical_digest(bundle[path]) for path in MAPPER_OUTPUTS
        }
        if (
            receipt.get("agent_ref") != "/root/phase5_review_a/t9_phase0_final_reviewer"
            or receipt.get("owner_role") != "capability-mapper"
            or receipt.get("task_id") != "phase2-map-capabilities"
        ):
            _add(findings, "WRONG_OWNER", "Mapper receipt owner differs.")
        if (
            receipt.get("dispatch_sha256") != DISPATCH_SHA256
            or receipt.get("truth_contract") != _truth_contract(track_root)
            or receipt.get("output_hashes") != expected_hashes
        ):
            _add(
                findings,
                "MAPPER_RECEIPT_MISMATCH",
                "Mapper receipt hashes or truth contract differ.",
            )
        checks = (
            20
            + len(comparison_by_id)
            + len(finding_by_id)
            + len(actual_rows)
            + len(actual_edges)
        )
    except (KeyError, TypeError, ValueError, StopIteration):
        _add(
            findings,
            "INVALID_SCHEMA",
            "Phase 2 outputs do not satisfy the required schema.",
        )
    return sorted(findings, key=lambda x: x.code), checks


def _refresh_receipt(track_root: Path, bundle: dict[str, dict[str, Any]]) -> None:
    """Refreshes synthetic mapper hashes after a bounded mutation."""
    bundle[MAPPER_RECEIPT]["truth_contract"] = _truth_contract(track_root)
    bundle[MAPPER_RECEIPT]["output_hashes"] = {
        path: _canonical_digest(bundle[path]) for path in MAPPER_OUTPUTS
    }


def _apply_fixture(
    track_root: Path,
    inputs: dict[str, Any],
    bundle: dict[str, dict[str, Any]],
    case: dict[str, Any],
) -> None:
    """Applies one bounded Phase 2 counterexample."""
    op = case["mutation"]["operation"]
    comparisons, classifications, boundaries, dependencies = (
        bundle[path] for path in MAPPER_OUTPUTS
    )
    comparison = comparisons["comparisons"][0]
    if op == "noun-art-standardization":
        index = _indices(inputs)
        assets = []
        for claim in inputs["source"]["upstream_claims"]:
            if claim["routing_disposition"] == "deferred-asset" and claim[
                "game_id"
            ] not in {x["game_id"] for x in assets}:
                assets.append(claim)
            if len(assets) == 2:
                break
        comparison["game_ids"] = [x["game_id"] for x in assets]
        comparison["similarities"][0]["claim_refs"] = [
            {
                "game_id": x["game_id"],
                "claim_id": x["claim_id"],
                "record_id": f"{x['game_id']}:{x['claim_id']}",
                "field_id": "fact",
                "value_sha256": x["value_sha256"],
                "scope_status": x["scope_status"],
                "factual_evidence_status": x["factual_evidence_status"],
            }
            for x in assets
        ]
    elif op == "provisional-only-standardization":
        index = _indices(inputs)
        records = []
        for record in inputs["mechanic"]["records"]:
            claim = index["source_claims"][
                (record["game_id"], record["source_claim_id"])
            ]
            if claim["confidence"] in {"low", "medium"} and record["game_id"] not in {
                x["game_id"] for x in records
            }:
                records.append(record)
            if len(records) == 2:
                break
        comparison["game_ids"] = [x["game_id"] for x in records]
        comparison["similarities"][0]["claim_refs"] = [_claim_ref(x) for x in records]
    elif op == "invented-behavior":
        comparison["similarities"][0]["claim_refs"][0]["value_sha256"] = "0" * 64
    elif op == "placement-status-collapse":
        comparison["similarities"][0]["claim_refs"][0]["scope_status"] = (
            "resolved"
            if comparison["similarities"][0]["claim_refs"][0]["scope_status"]
            != "resolved"
            else "blocked-by-unknown-scene-state"
        )
    elif op == "resolve-upstream-unknown":
        unknown = next(
            x
            for x in inputs["source"]["upstream_claims"]
            if x["routing_disposition"] == "blocked-upstream-unknown"
        )
        comparison["similarities"][0]["claim_refs"][0].update(
            {
                "game_id": unknown["game_id"],
                "claim_id": unknown["claim_id"],
                "record_id": f"{unknown['game_id']}:{unknown['claim_id']}",
                "value_sha256": unknown["value_sha256"],
                "scope_status": unknown["scope_status"],
                "factual_evidence_status": unknown["factual_evidence_status"],
            }
        )
    elif op == "four-game-batch":
        comparison["game_ids"].extend(list(_indices(inputs)["games"])[2:4])
    elif op == "missing-required-field":
        del comparison["owner"]
    elif op == "surplus-field":
        comparison["invented_field"] = "invented"
    elif op == "tampered-phase1-hash":
        comparisons["phase1_bindings"][next(iter(PHASE1_INPUTS))] = "0" * 64
    elif op == "remove-upstream-claim":
        dependencies["upstream_claims"].pop()
    elif op == "duplicate-upstream-claim":
        dependencies["upstream_claims"].append(
            copy.deepcopy(dependencies["upstream_claims"][0])
        )
    elif op == "remove-dependency-edge":
        dependencies["edges"].pop()
    elif op == "ghost-classification":
        classifications["classifications"][0]["comparison_id"] = "missing"
    elif op == "ghost-boundary":
        boundaries["boundaries"][0]["classification_id"] = "missing"
    elif op == "source-document-overflow":
        comparisons["source_document_ids"].append("s32")
    elif op == "output-budget-overflow":
        comparisons["padding"] = "x" * (MAX_OUTPUT_BYTES + 1)
    elif op == "wrong-owner":
        bundle[MAPPER_RECEIPT]["owner_role"] = "truth-test-author"
    elif op == "stale-receipt":
        bundle[MAPPER_RECEIPT]["dispatch_sha256"] = "0" * 64
    else:
        raise ValueError(f"unknown fixture operation {op}")
    # Keep classification/boundary copies aligned for evidence-only mutations so each case isolates its target.
    if op in {
        "noun-art-standardization",
        "provisional-only-standardization",
        "four-game-batch",
    }:
        games = comparison["game_ids"]
        classifications["classifications"][0]["game_ids"] = games
        boundaries["boundaries"][0]["game_ids"] = games
    if op not in {"wrong-owner", "stale-receipt"}:
        _refresh_receipt(track_root, bundle)


def _load_fixture(track_root: Path, path: Path) -> dict[str, Any]:
    """Loads one fixture only when its manifest binding is exact."""
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
    """Verifies Phase 2 authority, counterexamples, and mapper outputs."""
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
                actual, expected = (
                    {x.code for x in case_findings},
                    set(case["expected_codes"]),
                )
                if actual != expected:
                    _add(
                        findings,
                        "FIXTURE_CASE_EXPECTATION_MISMATCH",
                        f"{case['id']} emitted {sorted(actual)} instead of {sorted(expected)}",
                    )
                findings.extend(case_findings)
                checks += case_checks
        except (KeyError, OSError, ValueError, StopIteration, json.JSONDecodeError):
            _add(
                findings,
                "INVALID_FIXTURE_BINDING",
                "A Phase 2 fixture is not manifest-bound.",
            )
        return VerificationResult(
            "INVALID" if findings else "VERIFIED",
            tuple(sorted(findings, key=lambda x: x.code)),
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
            "Mapper outputs are absent: " + ", ".join(missing),
        )
        return VerificationResult(
            "RED_WAITING_FOR_MAPPER_OUTPUTS", tuple(findings), checks + 5
        )
    oversized = [
        path
        for path in MAPPER_OUTPUTS
        if (track_root / path).stat().st_size > MAX_OUTPUT_BYTES
    ]
    if oversized:
        _add(
            findings,
            "OUTPUT_BUDGET_EXCEEDED",
            "Mapper output exceeds 1 MiB: " + ", ".join(oversized),
        )
    try:
        bundle = {
            **{path: _load(track_root / path) for path in MAPPER_OUTPUTS},
            MAPPER_RECEIPT: _load(track_root / MAPPER_RECEIPT),
        }
        bundle_findings, bundle_checks = _validate_bundle(
            track_root,
            inputs,
            bundle,
            True,
            {path: _sha(track_root / path) for path in MAPPER_OUTPUTS},
        )
        findings.extend(bundle_findings)
        checks += bundle_checks
    except (OSError, ValueError, KeyError, json.JSONDecodeError):
        _add(findings, "INVALID_SCHEMA", "Published Phase 2 outputs cannot be loaded.")
    return VerificationResult(
        "VERIFIED" if not findings else "INVALID",
        tuple(sorted(findings, key=lambda x: x.code)),
        checks,
    )


def main(argv: list[str] | None = None) -> int:
    """Runs the Phase 2 verifier CLI."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--track-root", type=Path, required=True)
    parser.add_argument("--fixture", type=Path)
    parser.add_argument("--expect-codes", nargs="*")
    args = parser.parse_args(argv)
    started = time.perf_counter()
    result = verify_phase2(
        args.repo_root.resolve(),
        args.track_root.resolve(),
        args.fixture.resolve() if args.fixture else None,
    )
    payload = result.to_dict()
    payload["runtime_seconds"] = round(time.perf_counter() - started, 6)
    print(json.dumps(payload, indent=2, sort_keys=True))
    if args.expect_codes is not None:
        return 0 if {x.code for x in result.findings} == set(args.expect_codes) else 1
    return 0 if result.passed else 1


if __name__ == "__main__":
    sys.exit(main())
