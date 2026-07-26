#!/usr/bin/env python3
"""Verifies the Phase 2 v9 evidence-backed capability candidate lifecycle."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import hashlib
import json
from pathlib import Path
import re
from typing import Any

import phase2_v5_truth_verifier as v5

TRACK_ID = "apk_evidence_backed_ontology_synthesis_20260712"
DISPATCH_PATH = "phase2-role-dispatch-v9.json"
DISPATCH_SHA256 = "60a0337eec7a67afa327f8a790620f0d0b1364717bb421dfdea86b324bd90a3b"
PRE_AUDIT_PATH = "phase2-v8-pre-remediation-audit.json"
PRE_AUDIT_SHA256 = "1bf26342676329e22c5522033b81ade2760ab8a4ecaaa4c772ece15727ceb4ef"
CONTEXT_PATH = "phase2-v9-context-counterexamples.json"
CONTEXT_SHA256 = "9c1059df904d0d326aa714af4a24a773fa36dc870b25155d7135c907decb9583"
ROOT_SEAL = "phase2-v9-root-truth-seal.json"
MAPPER_RELEASE = "phase2-v9-mapper-release.json"
REVIEW_OUTPUT = "phase2-v9-independent-review.json"
REVIEW_RECEIPT = "role-receipts/phase2/capability-reviewer-v9.json"
MAPPER_OUTPUTS = (
    "phase2-curated-capability-evidence-v1.json",
    "phase2-capability-comparisons-v5.json",
    "phase2-capability-classification-v5.json",
    "phase2-extension-boundaries-v5.json",
    "phase2-claim-dependency-edges-v5.json",
)
MAPPER_RECEIPT = "role-receipts/phase2/capability-mapper-v5.json"
FIXTURE_MANIFEST = "phase2-v9-fixture-manifest.json"
BASE_TRUTH_PATHS = (
    DISPATCH_PATH,
    "phase2_v9_truth_verifier.py",
    "phase2_v9_truth_verifier_test.py",
    FIXTURE_MANIFEST,
    CONTEXT_PATH,
    "phase2-v9-red-report.json",
    "role-receipts/phase2/truth-test-author-v9.json",
)
PHASE1_BINDINGS = dict(v5.PHASE1_INPUTS)
MAX_OUTPUT_BYTES = 1_048_576

CURATED_KEYS = {
    "schema_version", "phase1_bindings", "audit_method", "records",
    "game_dispositions",
}
RECORD_KEYS = {
    "record_id", "game_id", "claim_id", "primary_disposition",
    "capability_uses", "context_rationale", "audit",
}
AUDIT_KEYS = {"review_method", "reviewed_field_ids", "disposition_basis"}
USE_KEYS = {
    "use_id", "capability_id", "scene_id", "state_id", "atomic_dimension",
    "counterfactual_pertinence", "anchors",
}
ANCHOR_ROLES = {"precondition", "action_or_transition", "observable_outcome"}
ANCHOR_KEYS = {"field_id", "exact_excerpt"}
GAME_KEYS = {"game_id", "disposition", "capability_ids", "rationale"}
TOP_OUTPUT_KEYS = {"schema_version", "phase1_bindings"}
COMPARISON_KEYS = {*TOP_OUTPUT_KEYS, "evidence_batches"}
CLASSIFICATION_KEYS = {*TOP_OUTPUT_KEYS, "capabilities"}
BOUNDARY_KEYS = {*TOP_OUTPUT_KEYS, "boundaries"}
DEPENDENCY_KEYS = {*TOP_OUTPUT_KEYS, "dependencies"}
RECEIPT_KEYS = {
    "agent_ref", "owner_role", "task_id", "dispatch_sha256",
    "root_truth_seal_sha256", "root_mapper_release_sha256", "output_hashes", "status",
}


@dataclass(frozen=True)
class Finding:
    """Represents one deterministic verifier finding."""

    code: str
    message: str


@dataclass(frozen=True)
class VerificationResult:
    """Represents the public v9 verification result."""

    state: str
    findings: tuple[Finding, ...]
    checks: int

    @property
    def passed(self) -> bool:
        """Returns whether the candidate reached an acceptance-pending state."""
        return self.state in {
            "CANDIDATE_VERIFIED_PENDING_INDEPENDENT_REVIEW",
            "VERIFIED_PENDING_ROOT_ACCEPTANCE",
        }


def _add(findings: list[Finding], code: str, message: str) -> None:
    """Adds a de-duplicated finding."""
    row = Finding(code, message)
    if row not in findings:
        findings.append(row)


def _load(path: Path) -> dict[str, Any]:
    """Loads one JSON object."""
    value = json.loads(path.read_text())
    if not isinstance(value, dict):
        raise ValueError(f"{path} is not an object")
    return value


def _sha(path: Path) -> str:
    """Returns a file's raw-byte SHA-256 digest."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _digest(value: Any) -> str:
    """Returns a canonical JSON SHA-256 digest."""
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def _shape(findings: list[Finding], value: Any, keys: set[str]) -> bool:
    """Checks an object's exact keys."""
    if not isinstance(value, dict):
        _add(findings, "INVALID_SCHEMA", "A required object is not an object.")
        return False
    if set(value) != keys:
        _add(findings, "INVALID_SCHEMA", "An object has missing or surplus fields.")
        return False
    return True


def _complete_excerpt(value: Any) -> bool:
    """Returns whether an excerpt is a balanced complete clause."""
    if not isinstance(value, str) or not value.strip() or "…" in value or "..." in value:
        return False
    if value.count("(") != value.count(")") or value.count("[") != value.count("]"):
        return False
    if value.count('"') % 2 or value.count("“") != value.count("”"):
        return False
    words = re.findall(r"[a-z]+", value.lower())
    return bool(words) and words[-1] not in {
        "a", "an", "and", "as", "at", "by", "for", "from", "if", "in", "of",
        "on", "or", "the", "then", "to", "via", "when", "while", "with",
    } and not re.search(r"[,;:\-–—]$", value.strip())


def _one_sentence(value: Any) -> bool:
    """Returns whether text is one bounded sentence without pipe inventories."""
    if not isinstance(value, str) or not 20 <= len(value) <= 240 or "|" in value:
        return False
    return (
        len(re.findall(r"[.!?](?:\s|$)", value.strip())) == 1
        and value.rstrip().endswith((".", "!", "?"))
    )


def _verify_authority(
    track_root: Path, findings: list[Finding]
) -> tuple[dict[str, Any], dict[str, Any], int]:
    """Verifies v9 authority, Phase 1 inputs, audit, and context registry."""
    fixed = {
        DISPATCH_PATH: DISPATCH_SHA256,
        PRE_AUDIT_PATH: PRE_AUDIT_SHA256,
        CONTEXT_PATH: CONTEXT_SHA256,
        **PHASE1_BINDINGS,
    }
    for relative, expected in fixed.items():
        path = track_root / relative
        if not path.is_file() or _sha(path) != expected:
            _add(findings, "TRUTH_INPUT_DRIFT", f"Frozen input differs: {relative}.")
    if findings:
        return {}, {}, len(fixed)
    dispatch = _load(track_root / DISPATCH_PATH)
    if (
        dispatch.get("schema_version") != "apk-t9-phase2-role-dispatch.v9"
        or dispatch.get("status") != "active-end-to-end-truth-repair"
    ):
        _add(findings, "TRUTH_INPUT_DRIFT", "The v9 dispatch is not active.")
    prior: list[v5.Finding] = []
    _, inputs = v5._verify_inputs(track_root, prior)
    if prior:
        _add(findings, "TRUTH_INPUT_DRIFT", "Accepted Phase 1 inputs differ.")
    registry = _load(track_root / CONTEXT_PATH)
    rows = registry.get("records", [])
    ids = [row.get("record_id") for row in rows if isinstance(row, dict)]
    corrections = registry.get("provenance_corrections")
    expected_correction = [{
        "source_audit_sha256": PRE_AUDIT_SHA256,
        "source_pointer": "blocking_findings[P2V8-PRE-HIGH-002].exact_record_ids.language-target-progression",
        "source_record_id": "rune-match:RM-CONT-001",
        "canonical_phase1_record_id": "rune-match:RM-CONTENT-001",
        "source_typo_is_accepted_alias": False,
    }]
    if (
        registry.get("record_count") != 48
        or len(ids) != 48
        or len(set(ids)) != 48
        or registry.get("source_audit", {}).get("sha256") != PRE_AUDIT_SHA256
        or corrections != expected_correction
        or "rune-match:RM-CONT-001" in ids
    ):
        _add(findings, "CONTEXT_REGISTRY_DRIFT", "The exact 48-record registry differs.")
    return inputs, registry, len(fixed) + 2


def _phase1_index(inputs: dict[str, Any]) -> dict[str, Any]:
    """Builds accepted Phase 1 record, source-claim, and game indices."""
    return v5.v4.v2._indices(inputs)


def _sealed_truth_paths(track_root: Path, findings: list[Finding]) -> tuple[str, ...]:
    """Returns base truth files plus every valid manifest-declared fixture."""
    manifest = _load(track_root / FIXTURE_MANIFEST)
    fixtures = manifest.get("fixtures")
    if (
        manifest.get("schema_version") != "apk-t9-phase2-v9-fixture-manifest.v1"
        or manifest.get("fixture_count") != len(fixtures or [])
        or not isinstance(fixtures, list)
        or len(fixtures) > 16
    ):
        _add(findings, "INVALID_FIXTURE_MANIFEST", "Fixture manifest shape or count differs.")
        return BASE_TRUTH_PATHS
    paths: list[str] = []
    for row in fixtures:
        if set(row) != {"id", "path", "sha256", "case_count"}:
            _add(findings, "INVALID_FIXTURE_MANIFEST", "Fixture binding shape differs.")
            continue
        path = track_root / row["path"]
        if not path.is_file() or _sha(path) != row["sha256"]:
            _add(findings, "FIXTURE_DRIFT", f"Fixture differs: {row['path']}.")
        paths.append(row["path"])
    if len(paths) != len(set(paths)):
        _add(findings, "INVALID_FIXTURE_MANIFEST", "Fixture paths are duplicated.")
    return (*BASE_TRUTH_PATHS, *paths)


def _verify_root_release(
    track_root: Path,
    expected_release_sha256: str | None,
    findings: list[Finding],
) -> tuple[str | None, str | None]:
    """Verifies externally supplied release authority and all sealed truth bytes."""
    release_path = track_root / MAPPER_RELEASE
    if expected_release_sha256 is None:
        _add(findings, "EXPECTED_MAPPER_RELEASE_REQUIRED", "Expected mapper release SHA-256 is required.")
        return None, None
    if not release_path.is_file() or _sha(release_path) != expected_release_sha256:
        _add(findings, "MAPPER_RELEASE_MISMATCH", "External mapper release SHA-256 differs.")
        return None, None
    path = track_root / ROOT_SEAL
    if not path.is_file():
        _add(findings, "ROOT_TRUTH_SEAL_MISSING", "The root v9 truth seal is absent.")
        return None, expected_release_sha256
    seal = _load(path)
    expected_keys = {
        "schema_version", "track_id", "dispatch_sha256", "status", "pins"
    }
    if not _shape(findings, seal, expected_keys):
        return None, expected_release_sha256
    pins = seal.get("pins")
    truth_paths = _sealed_truth_paths(track_root, findings)
    expected = {
        relative: _sha(track_root / relative)
        for relative in truth_paths
        if (track_root / relative).is_file()
    }
    if (
        seal.get("schema_version") != "apk-t9-phase2-root-truth-seal.v9"
        or seal.get("track_id") != TRACK_ID
        or seal.get("dispatch_sha256") != DISPATCH_SHA256
        or seal.get("status") != "sealed-red-v9"
        or pins != expected
        or set(expected) != set(truth_paths)
    ):
        _add(findings, "LIVE_TRUTH_DRIFT", "The root truth seal differs from live bytes.")
    seal_sha = _sha(path)
    release = _load(release_path)
    release_keys = {
        "schema_version", "track_id", "status", "dispatch_sha256",
        "root_truth_seal", "truth_artifacts",
    }
    if (
        not _shape(findings, release, release_keys)
        or release.get("schema_version") != "apk-t9-phase2-mapper-release.v9"
        or release.get("track_id") != TRACK_ID
        or release.get("status") != "released-for-mapper-v5"
        or release.get("dispatch_sha256") != DISPATCH_SHA256
        or release.get("root_truth_seal") != {"path": ROOT_SEAL, "sha256": seal_sha}
        or release.get("truth_artifacts") != expected
    ):
        _add(findings, "MAPPER_RELEASE_MISMATCH", "Mapper release pins differ.")
    return seal_sha, expected_release_sha256


def _output_schema(
    findings: list[Finding], bundle: dict[str, dict[str, Any]]
) -> None:
    """Checks exact top-level output schemas and shared Phase 1 bindings."""
    expected = (
        (MAPPER_OUTPUTS[0], CURATED_KEYS, "apk-t9-phase2-curated-capability-evidence.v2"),
        (MAPPER_OUTPUTS[1], COMPARISON_KEYS, "apk-t9-phase2-capability-comparisons.v5"),
        (MAPPER_OUTPUTS[2], CLASSIFICATION_KEYS, "apk-t9-phase2-capability-classification.v5"),
        (MAPPER_OUTPUTS[3], BOUNDARY_KEYS, "apk-t9-phase2-extension-boundaries.v5"),
        (MAPPER_OUTPUTS[4], DEPENDENCY_KEYS, "apk-t9-phase2-claim-dependency-edges.v5"),
    )
    for path, keys, version in expected:
        output = bundle[path]
        _shape(findings, output, keys)
        if output.get("schema_version") != version:
            _add(findings, "INVALID_SCHEMA_VERSION", f"{path} schema version differs.")
        if output.get("phase1_bindings") != PHASE1_BINDINGS:
            _add(findings, "PHASE1_BINDING_MISMATCH", f"{path} bindings differ.")


def _validate_curated(
    inputs: dict[str, Any],
    registry: dict[str, Any],
    bundle: dict[str, dict[str, Any]],
    findings: list[Finding],
) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]], int]:
    """Validates exact accounting, audits, anchors, and game dispositions."""
    curated = bundle[MAPPER_OUTPUTS[0]]
    index = _phase1_index(inputs)
    expected = index["mechanic_records"]
    registry_ids = {row["record_id"] for row in registry["records"]}
    if not registry_ids.issubset(expected):
        _add(findings, "CONTEXT_REGISTRY_DRIFT", "A registry ID is not canonical Phase 1 evidence.")
    records = curated.get("records")
    if not isinstance(records, list):
        _add(findings, "INVALID_SCHEMA", "Curated records must be a list.")
        return {}, {}, 1
    record_ids = [row.get("record_id") for row in records if isinstance(row, dict)]
    if len(record_ids) != 633 or len(set(record_ids)) != 633 or set(record_ids) != set(expected):
        _add(findings, "CURATED_ACCOUNTING_MISMATCH", "All 633 records must appear once.")
    uses: dict[str, dict[str, Any]] = {}
    record_map: dict[str, dict[str, Any]] = {}
    context_ids = {row["record_id"] for row in registry["records"]}
    for row in records:
        if not _shape(findings, row, RECORD_KEYS):
            continue
        record = expected.get(row.get("record_id"))
        if record is None:
            continue
        record_map[row["record_id"]] = row
        if (
            row.get("game_id") != record.get("game_id")
            or row.get("claim_id") != record.get("source_claim_id")
        ):
            _add(findings, "CURATED_ACCOUNTING_MISMATCH", "Record identity differs.")
        audit = row.get("audit")
        if _shape(findings, audit, AUDIT_KEYS):
            accepted_fields = [field["field_id"] for field in record["derived_fields"]]
            if (
                audit.get("review_method") != "field-by-field-counterfactual"
                or audit.get("reviewed_field_ids") != accepted_fields
                or audit.get("disposition_basis")
                not in {"no-complete-behavioral-anchors", "selected-complete-behavioral-anchors"}
            ):
                _add(findings, "PER_RECORD_AUDIT_PROOF_MISSING", "Per-record audit proof differs.")
        disposition = row.get("primary_disposition")
        row_uses = row.get("capability_uses")
        if disposition == "non-capability-context":
            if row_uses != [] or not _one_sentence(row.get("context_rationale")):
                _add(findings, "INVALID_CONTEXT_DISPOSITION", "Context has uses or no rationale.")
            if isinstance(audit, dict) and audit.get("disposition_basis") != "no-complete-behavioral-anchors":
                _add(findings, "PER_RECORD_AUDIT_PROOF_MISSING", "Context audit basis differs.")
        elif disposition == "curated-capability-evidence":
            if not isinstance(row_uses, list) or not row_uses or row.get("context_rationale") is not None:
                _add(findings, "INVALID_CAPABILITY_DISPOSITION", "Selected evidence lacks uses.")
            if isinstance(audit, dict) and audit.get("disposition_basis") != "selected-complete-behavioral-anchors":
                _add(findings, "PER_RECORD_AUDIT_PROOF_MISSING", "Capability audit basis differs.")
        else:
            _add(findings, "INVALID_PRIMARY_DISPOSITION", "Primary disposition differs.")
            row_uses = []
        if row["record_id"] in context_ids and disposition != "non-capability-context":
            _add(findings, "CONTEXT_COUNTEREXAMPLE_PROMOTED", row["record_id"])
        for use in row_uses if isinstance(row_uses, list) else []:
            if not _shape(findings, use, USE_KEYS):
                continue
            use_id = use.get("use_id")
            if not isinstance(use_id, str) or use_id in uses:
                _add(findings, "DUPLICATE_USE_ID", "Use IDs must be unique.")
            else:
                uses[use_id] = {**use, "record_id": row["record_id"], "game_id": row["game_id"], "claim_id": row["claim_id"]}
            if use.get("scene_id") != record.get("scene_id") or use.get("state_id") != record.get("state_id"):
                _add(findings, "SCENE_STATE_MISMATCH", "Use scene/state differs from Phase 1.")
            if use.get("counterfactual_pertinence") is not True:
                _add(findings, "COUNTERFACTUAL_PERTINENCE_MISSING", "Use pertinence is not explicit.")
            anchors = use.get("anchors")
            if not isinstance(anchors, dict) or set(anchors) != ANCHOR_ROLES:
                _add(findings, "BEHAVIORAL_ANCHOR_MISSING", "Three anchor roles are required.")
                continue
            field_map = {field["field_id"]: field for field in record["derived_fields"]}
            for role, anchor in anchors.items():
                if not _shape(findings, anchor, ANCHOR_KEYS):
                    continue
                field = field_map.get(anchor.get("field_id"))
                excerpt = anchor.get("exact_excerpt")
                if (
                    field is None
                    or not isinstance(field.get("value"), str)
                    or not isinstance(excerpt, str)
                    or excerpt not in field["value"]
                    or not _complete_excerpt(excerpt)
                ):
                    _add(findings, "INVALID_BEHAVIORAL_ANCHOR", f"{role} is not accepted evidence.")
    if len(uses) > 270:
        _add(findings, "CURATED_USE_BUDGET_EXCEEDED", "Selected uses exceed 270.")
    game_rows = curated.get("game_dispositions")
    if not isinstance(game_rows, list):
        _add(findings, "INVALID_SCHEMA", "Game dispositions must be a list.")
        return record_map, uses, len(records)
    games = [row.get("game_id") for row in game_rows if isinstance(row, dict)]
    if len(games) != len(set(games)) or set(games) != set(index["games"]):
        _add(findings, "MISSING_GAME_DISPOSITION", "Every game needs one disposition.")
    expected_caps: dict[str, set[str]] = {game_id: set() for game_id in index["games"]}
    for use in uses.values():
        expected_caps[use["game_id"]].add(use["capability_id"])
    for row in game_rows:
        if not _shape(findings, row, GAME_KEYS):
            continue
        caps = row.get("capability_ids")
        expected_for_game = sorted(expected_caps.get(row.get("game_id"), set()))
        if caps != expected_for_game:
            _add(findings, "GAME_CAPABILITY_SET_MISMATCH", "Game capabilities differ from uses.")
        expected_disposition = "supported-capability" if expected_for_game else "no-supported-reusable-capability"
        if row.get("disposition") != expected_disposition or not _one_sentence(row.get("rationale")):
            _add(findings, "INVALID_GAME_DISPOSITION", "Game disposition differs.")
    return record_map, uses, len(records) + len(uses) + len(game_rows)


def _validate_semantic_joins(
    inputs: dict[str, Any],
    bundle: dict[str, dict[str, Any]],
    uses: dict[str, dict[str, Any]],
    findings: list[Finding],
) -> tuple[set[str], int]:
    """Validates bounded findings and exact cross-output evidence joins."""
    comparisons = bundle[MAPPER_OUTPUTS[1]]
    classifications = bundle[MAPPER_OUTPUTS[2]]
    boundaries = bundle[MAPPER_OUTPUTS[3]]
    dependencies = bundle[MAPPER_OUTPUTS[4]]
    finding_rows: dict[str, dict[str, Any]] = {}
    joined_uses: list[str] = []
    capability_findings: dict[str, set[str]] = {}
    for batch in comparisons.get("evidence_batches", []):
        if set(batch) != {"capability_id", "similarities", "differences"}:
            _add(findings, "INVALID_SCHEMA", "Evidence batch shape differs.")
            continue
        capability_id = batch.get("capability_id")
        capability_findings.setdefault(capability_id, set())
        for kind in ("similarities", "differences"):
            for finding in batch.get(kind, []):
                required = {
                    "finding_id", "statement", "dimension", "consumer_use_ids",
                    "per_game_summaries", "boundary_effect",
                }
                if not _shape(findings, finding, required):
                    continue
                finding_id = finding.get("finding_id")
                if finding_id in finding_rows:
                    _add(findings, "DUPLICATE_FINDING_ID", "Finding IDs must be unique.")
                finding_rows[finding_id] = {**finding, "kind": kind, "capability_id": capability_id}
                capability_findings[capability_id].add(finding_id)
                use_ids = finding.get("consumer_use_ids")
                if not isinstance(use_ids, list) or any(use_id not in uses for use_id in use_ids):
                    _add(findings, "FINDING_USE_JOIN_MISMATCH", "Finding use join differs.")
                    continue
                joined_uses.extend(use_ids)
                use_rows = [uses[use_id] for use_id in use_ids]
                games: dict[str, int] = {}
                for use in use_rows:
                    games[use["game_id"]] = games.get(use["game_id"], 0) + 1
                    if use["capability_id"] != capability_id or use["atomic_dimension"] != finding.get("dimension"):
                        _add(findings, "ATOMIC_DIMENSION_MISMATCH", "Finding combines unlike evidence.")
                if not 2 <= len(games) <= 3:
                    _add(findings, "FINDING_GAME_COUNT_MISMATCH", "Finding requires 2-3 games.")
                if kind == "similarities" and (len(use_ids) > 4 or any(count != 1 for count in games.values())):
                    _add(findings, "SIMILARITY_CLAIM_CAP_EXCEEDED", "Similarity claim cap differs.")
                if kind == "differences" and (len(use_ids) > 6 or any(count < 1 or count > 2 for count in games.values())):
                    _add(findings, "DIFFERENCE_CLAIM_CAP_EXCEEDED", "Difference claim cap differs.")
                summaries = finding.get("per_game_summaries")
                if (
                    not isinstance(summaries, list)
                    or {row.get("game_id") for row in summaries if isinstance(row, dict)} != set(games)
                    or any(set(row) != {"game_id", "summary"} or not _one_sentence(row.get("summary")) for row in summaries if isinstance(row, dict))
                ):
                    _add(findings, "INVALID_GAME_SUMMARY", "Per-game summaries differ.")
                effect = finding.get("boundary_effect")
                if not isinstance(effect, dict) or set(effect) != {"shared_core", "game_extensions", "interface_consequence"}:
                    _add(findings, "INVALID_BOUNDARY_EFFECT", "Boundary effect shape differs.")
    if len(finding_rows) > 45:
        _add(findings, "CURATED_FINDING_BUDGET_EXCEEDED", "Findings exceed 45.")
    if len(joined_uses) != len(set(joined_uses)) or set(joined_uses) != set(uses):
        _add(findings, "SELECTED_USE_JOIN_MISMATCH", "Every use must join exactly one finding.")
    capabilities: dict[str, dict[str, Any]] = {}
    source_claims = _phase1_index(inputs)["source_claims"]
    for row in classifications.get("capabilities", []):
        if set(row) != {"capability_id", "disposition", "consumer_use_ids", "finding_ids"}:
            _add(findings, "INVALID_SCHEMA", "Capability shape differs.")
            continue
        capability_id = row.get("capability_id")
        capabilities[capability_id] = row
        expected_uses = sorted(use_id for use_id, use in uses.items() if use["capability_id"] == capability_id)
        if row.get("consumer_use_ids") != expected_uses or set(row.get("finding_ids", [])) != capability_findings.get(capability_id, set()):
            _add(findings, "CLASSIFICATION_JOIN_MISMATCH", "Capability joins differ.")
        if row.get("disposition") == "standardize":
            strong_games = {
                uses[use_id]["game_id"]
                for use_id in expected_uses
                if source_claims.get((uses[use_id]["game_id"], uses[use_id]["claim_id"]), {}).get("confidence")
                in v5.v4.v2.STRONG_CONFIDENCE
                and source_claims.get((uses[use_id]["game_id"], uses[use_id]["claim_id"]), {}).get("scope_status") == "resolved"
                and source_claims.get((uses[use_id]["game_id"], uses[use_id]["claim_id"]), {}).get("factual_evidence_status") == "accepted"
            }
            if len(strong_games) < 2:
                _add(findings, "PROVISIONAL_STANDARDIZATION", "Standardize lacks two strong games.")
        elif row.get("disposition") not in {"extend", "bespoke"}:
            _add(findings, "INVALID_CLASSIFICATION_DISPOSITION", "Disposition differs.")
    if {use["capability_id"] for use in uses.values()} != set(capabilities):
        _add(findings, "UNKNOWN_CAPABILITY_ID", "Use capability IDs differ from classification.")
    boundary_map = {row.get("capability_id"): row for row in boundaries.get("boundaries", []) if isinstance(row, dict)}
    for capability_id, capability in capabilities.items():
        row = boundary_map.get(capability_id)
        if not isinstance(row, dict) or set(row) != {"capability_id", "finding_ids", "effects"}:
            _add(findings, "BOUNDARY_JOIN_MISMATCH", "Boundary row differs.")
        elif set(row.get("finding_ids", [])) != set(capability["finding_ids"]):
            _add(findings, "BOUNDARY_JOIN_MISMATCH", "Boundary findings differ.")
    if set(boundary_map) != set(capabilities):
        _add(findings, "BOUNDARY_JOIN_MISMATCH", "Boundary capability set differs.")
    dependency_map = {row.get("finding_id"): row for row in dependencies.get("dependencies", []) if isinstance(row, dict)}
    for finding_id, finding in finding_rows.items():
        row = dependency_map.get(finding_id)
        use_ids = finding["consumer_use_ids"]
        if (
            not isinstance(row, dict)
            or set(row) != {"finding_id", "use_ids", "record_ids", "claim_ids"}
            or row.get("use_ids") != use_ids
            or row.get("record_ids") != [uses[use_id]["record_id"] for use_id in use_ids]
            or row.get("claim_ids") != [uses[use_id]["claim_id"] for use_id in use_ids]
        ):
            _add(findings, "DEPENDENCY_JOIN_MISMATCH", "Finding dependency differs.")
    if set(dependency_map) != set(finding_rows):
        _add(findings, "DEPENDENCY_JOIN_MISMATCH", "Dependency finding set differs.")
    return set(finding_rows), len(finding_rows) + len(capabilities) + len(boundary_map) + len(dependency_map)


def _validate_receipt(
    track_root: Path,
    bundle: dict[str, dict[str, Any]],
    seal_sha: str | None,
    release_sha: str | None,
    findings: list[Finding],
) -> None:
    """Validates the mapper receipt, seal binding, hashes, and budgets."""
    receipt = bundle[MAPPER_RECEIPT]
    if not _shape(findings, receipt, RECEIPT_KEYS):
        return
    hashes = {path: _sha(track_root / path) for path in MAPPER_OUTPUTS}
    if receipt.get("output_hashes") != hashes:
        _add(findings, "TAMPERED_OUTPUT", "Mapper output hashes differ from live bytes.")
    if (
        receipt.get("agent_ref") != "/root/phase5_review_a/t9_phase0_final_reviewer"
        or receipt.get("owner_role") != "capability-mapper"
        or receipt.get("task_id") != "phase2-curated-evidence-mapper-v5-v9"
        or receipt.get("dispatch_sha256") != DISPATCH_SHA256
        or receipt.get("root_truth_seal_sha256") != seal_sha
        or receipt.get("root_mapper_release_sha256") != release_sha
        or receipt.get("status") != "candidate"
    ):
        _add(findings, "STALE_OR_WRONG_MAPPER_RECEIPT", "Mapper receipt binding differs.")
    if any((track_root / path).stat().st_size > MAX_OUTPUT_BYTES for path in MAPPER_OUTPUTS):
        _add(findings, "OUTPUT_BUDGET_EXCEEDED", "A mapper output exceeds 1 MiB.")


def _rationale_template(value: str, identifier: str) -> str:
    """Normalizes a review rationale to expose repeated ID-substitution templates."""
    normalized = re.sub(
        re.escape(identifier.lower()), "<id>", " ".join(value.lower().split())
    )
    return re.sub(r"\b\d+\b", "<n>", normalized)


def _validate_review(
    track_root: Path,
    bundle: dict[str, dict[str, Any]],
    seal_sha: str,
    release_sha: str,
    findings: list[Finding],
) -> bool:
    """Validates exhaustive semantic verdicts and exact reviewer receipt joins."""
    review = _load(track_root / REVIEW_OUTPUT)
    required = {
        "schema_version", "track_id", "phase", "reviewer", "mapper_output_hashes",
        "sampling", "record_reviews", "use_reviews", "finding_reviews", "game_disposition_reviews",
        "unresolved_counts", "status",
    }
    if not _shape(findings, review, required):
        return False
    mapper_hashes = {path: _sha(track_root / path) for path in MAPPER_OUTPUTS}
    reviewer = review.get("reviewer")
    if (
        reviewer != {"agent_ref": "/root/phase5_review_b", "owner_role": "capability-reviewer"}
        or review.get("schema_version") != "apk-t9-phase2-independent-review.v9"
        or review.get("track_id") != TRACK_ID
        or review.get("phase") != 2
        or review.get("mapper_output_hashes") != mapper_hashes
        or review.get("sampling") != "none-exhaustive"
    ):
        _add(findings, "INVALID_INDEPENDENT_REVIEW", "Review identity or bindings differ.")
    records = {row["record_id"]: row for row in bundle[MAPPER_OUTPUTS[0]]["records"]}
    uses = {
        use["use_id"]: use
        for record in records.values()
        for use in record["capability_uses"]
    }
    finding_rows = {
        finding["finding_id"]: finding
        for batch in bundle[MAPPER_OUTPUTS[1]]["evidence_batches"]
        for kind in ("similarities", "differences")
        for finding in batch[kind]
    }
    games = {
        row["game_id"]: row
        for row in bundle[MAPPER_OUTPUTS[0]]["game_dispositions"]
    }
    record_refs = {
        record_id: [{
            "type": "record-decision",
            "record_id": record_id,
            "primary_disposition": row["primary_disposition"],
            "audit_sha256": _digest(row["audit"]),
            "capability_use_ids": [use["use_id"] for use in row["capability_uses"]],
            "context_rationale_sha256": _digest(row["context_rationale"]),
        }]
        for record_id, row in records.items()
    }
    use_refs = {
        use_id: [
            {
                "type": "behavioral-anchor",
                "role": role,
                "field_id": anchor["field_id"],
                "exact_excerpt": anchor["exact_excerpt"],
                "anchor_sha256": _digest(anchor),
            }
            for role, anchor in sorted(use["anchors"].items())
        ]
        for use_id, use in uses.items()
    }
    finding_refs = {
        finding_id: [{
            "type": "finding-projection",
            "finding_id": finding_id,
            "dimension": row["dimension"],
            "consumer_use_ids": row["consumer_use_ids"],
            "per_game_summaries_sha256": _digest(row["per_game_summaries"]),
            "boundary_effect_sha256": _digest(row["boundary_effect"]),
        }]
        for finding_id, row in finding_rows.items()
    }
    game_refs = {
        game_id: [{
            "type": "game-disposition-projection",
            "game_id": game_id,
            "disposition": row["disposition"],
            "capability_ids": row["capability_ids"],
            "rationale_sha256": _digest(row["rationale"]),
        }]
        for game_id, row in games.items()
    }
    groups = (
        ("record_reviews", "record_id", records, {"primary_disposition", "anchor_completeness", "context_rationale_or_selected_uses", "automatic_versus_individual_decision"}, record_refs),
        ("use_reviews", "use_id", uses, {"anchor_role_correctness", "counterfactual_pertinence", "atomic_dimension", "context_or_capability_routing", "same_excerpt_multi_role"}, use_refs),
        ("finding_reviews", "finding_id", finding_rows, {"one_invariant_or_axis_coherence", "cross_game_pertinence", "per_game_summary", "boundary_ownership", "classification_disposition"}, finding_refs),
        ("game_disposition_reviews", "game_id", games, {"capability_set", "supported_or_no_supported_reuse", "rationale"}, game_refs),
    )
    rejected = False
    normalized: list[str] = []
    for group, id_key, expected_objects, verdict_keys, expected_refs in groups:
        rows = review.get(group)
        actual_ids = [row.get(id_key) for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []
        if len(actual_ids) != len(set(actual_ids)) or set(actual_ids) != set(expected_objects):
            _add(findings, "INCOMPLETE_INDEPENDENT_REVIEW", f"{group} is not exhaustive.")
        for row in rows if isinstance(rows, list) else []:
            if set(row) != {id_key, "reviewed_object_sha256", "verdicts", "rationale", "evidence_refs"}:
                _add(findings, "INVALID_INDEPENDENT_REVIEW", f"{group} row shape differs.")
                continue
            verdicts = row.get("verdicts")
            identifier = row.get(id_key)
            if (
                identifier not in expected_objects
                or row.get("reviewed_object_sha256") != _digest(expected_objects.get(identifier))
                or row.get("evidence_refs") != expected_refs.get(identifier)
            ):
                _add(findings, "UNRESOLVED_REVIEW_EVIDENCE_REF", f"{group} canonical object or evidence refs differ.")
            if not isinstance(verdicts, dict) or set(verdicts) != verdict_keys or any(value not in {"accept", "reject"} for value in verdicts.values()):
                _add(findings, "INVALID_SEMANTIC_VERDICT", f"{group} verdicts differ.")
                rejected = True
            elif "reject" in verdicts.values():
                rejected = True
            rationale = row.get("rationale")
            refs = row.get("evidence_refs")
            if not isinstance(rationale, str) or len(rationale) < 40 or not isinstance(refs, list) or not refs:
                _add(findings, "GENERIC_REVIEW_RATIONALE", f"{group} rationale lacks evidence.")
            else:
                normalized.append(_rationale_template(rationale, str(identifier)))
    if len(normalized) != len(set(normalized)):
        _add(findings, "GENERIC_REVIEW_RATIONALE", "Review rationale is repeated or templated.")
    unresolved = review.get("unresolved_counts")
    if not isinstance(unresolved, dict) or set(unresolved) != {"Critical", "High", "Medium", "Low"}:
        _add(findings, "INVALID_INDEPENDENT_REVIEW", "Unresolved ledger differs.")
        rejected = True
    elif any(unresolved.get(level, 0) for level in ("Critical", "High", "Medium")):
        rejected = True
    if review.get("status") != ("rejected" if rejected else "accepted"):
        _add(findings, "INVALID_INDEPENDENT_REVIEW", "Review status differs from verdicts.")
    if rejected:
        _add(findings, "SEMANTIC_REVIEW_REJECTED", "Independent semantic review rejected the candidate.")
    receipt = _load(track_root / REVIEW_RECEIPT)
    expected_receipt_keys = {
        "agent_ref", "owner_role", "task_id", "dispatch_sha256",
        "root_truth_seal_sha256", "review_artifact_sha256",
        "root_mapper_release_sha256", "mapper_output_hashes", "status",
    }
    if (
        not _shape(findings, receipt, expected_receipt_keys)
        or receipt.get("agent_ref") != "/root/phase5_review_b"
        or receipt.get("owner_role") != "capability-reviewer"
        or receipt.get("task_id") != "phase2-curated-evidence-review-v9"
        or receipt.get("dispatch_sha256") != DISPATCH_SHA256
        or receipt.get("root_truth_seal_sha256") != seal_sha
        or receipt.get("root_mapper_release_sha256") != release_sha
        or receipt.get("review_artifact_sha256") != _sha(track_root / REVIEW_OUTPUT)
        or receipt.get("mapper_output_hashes") != mapper_hashes
        or receipt.get("status") != ("rejected" if rejected else "accepted")
    ):
        _add(findings, "STALE_OR_WRONG_REVIEWER_RECEIPT", "Reviewer receipt joins differ.")
    return rejected


def verify_phase2(
    repo_root: Path,
    track_root: Path,
    expected_root_mapper_release_sha256: str | None = None,
) -> VerificationResult:
    """Runs the public file-backed v9 Phase 2 verifier."""
    del repo_root
    findings: list[Finding] = []
    inputs, registry, checks = _verify_authority(track_root, findings)
    if findings:
        return VerificationResult("INVALID", tuple(findings), checks)
    missing = [path for path in (*MAPPER_OUTPUTS, MAPPER_RECEIPT) if not (track_root / path).is_file()]
    if missing:
        _add(findings, "PHASE2_MAPPER_V5_OUTPUTS_MISSING", f"Missing mapper v5 outputs: {', '.join(missing)}")
        return VerificationResult("RED_WAITING_FOR_MAPPER_V5_OUTPUTS", tuple(findings), checks)
    seal_findings: list[Finding] = []
    seal_sha, release_sha = _verify_root_release(
        track_root, expected_root_mapper_release_sha256, seal_findings
    )
    findings.extend(seal_findings)
    try:
        bundle = {path: _load(track_root / path) for path in (*MAPPER_OUTPUTS, MAPPER_RECEIPT)}
        _output_schema(findings, bundle)
        _, uses, curated_checks = _validate_curated(inputs, registry, bundle, findings)
        finding_ids, semantic_checks = _validate_semantic_joins(inputs, bundle, uses, findings)
        _validate_receipt(track_root, bundle, seal_sha, release_sha, findings)
        checks += curated_checks + semantic_checks + 7
    except (KeyError, OSError, TypeError, ValueError, json.JSONDecodeError):
        _add(findings, "INVALID_SCHEMA", "The mapper candidate cannot be validated.")
        return VerificationResult("INVALID", tuple(sorted(findings, key=lambda row: row.code)), checks)
    if findings:
        return VerificationResult("INVALID", tuple(sorted(findings, key=lambda row: row.code)), checks)
    review_present = (track_root / REVIEW_OUTPUT).is_file() or (track_root / REVIEW_RECEIPT).is_file()
    if not review_present:
        return VerificationResult("CANDIDATE_VERIFIED_PENDING_INDEPENDENT_REVIEW", (), checks)
    if not (track_root / REVIEW_OUTPUT).is_file() or not (track_root / REVIEW_RECEIPT).is_file():
        return VerificationResult(
            "INVALID",
            (Finding("INCOMPLETE_INDEPENDENT_REVIEW", "Review artifact and receipt must both exist."),),
            checks,
        )
    review_findings: list[Finding] = []
    rejected = _validate_review(
        track_root,
        bundle,
        seal_sha or "",
        release_sha or "",
        review_findings,
    )
    checks += len(uses) + len(finding_ids) + len(_phase1_index(inputs)["games"]) + 2
    blocking = [
        row for row in review_findings
        if row.code not in {"INVALID_SEMANTIC_VERDICT", "SEMANTIC_REVIEW_REJECTED"}
    ]
    if blocking:
        return VerificationResult("INVALID", tuple(sorted(review_findings, key=lambda row: row.code)), checks)
    if rejected:
        return VerificationResult("REVIEW_REJECTED", tuple(sorted(review_findings, key=lambda row: row.code)), checks)
    return VerificationResult("VERIFIED_PENDING_ROOT_ACCEPTANCE", (), checks)


def main(argv: list[str] | None = None) -> int:
    """Runs the public v9 verifier and emits stable JSON."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--track-root", type=Path, required=True)
    parser.add_argument("--expect-state")
    parser.add_argument("--expect-codes", nargs="*")
    parser.add_argument("--expected-root-mapper-release-sha256")
    args = parser.parse_args(argv)
    result = verify_phase2(
        args.repo_root,
        args.track_root,
        args.expected_root_mapper_release_sha256,
    )
    print(json.dumps({
        "schema_version": "apk-t9-phase2-v9-verification-result.v1",
        "state": result.state,
        "passed": result.passed,
        "checks": result.checks,
        "findings": [{"code": row.code, "message": row.message} for row in result.findings],
    }, indent=2, sort_keys=True))
    if args.expect_state is not None and result.state != args.expect_state:
        return 1
    if args.expect_codes is not None and {row.code for row in result.findings} != set(args.expect_codes):
        return 1
    return 0 if args.expect_state is not None or args.expect_codes is not None else (0 if result.passed else 1)


if __name__ == "__main__":
    raise SystemExit(main())
