#!/usr/bin/env python3
"""Verifies Phase 2 v13 taxonomy-backed record dispositions and authority."""

from __future__ import annotations

import argparse
import copy
from dataclasses import dataclass
import json
from pathlib import Path
import re
from typing import Any

import phase2_v12_truth_verifier as v12
import phase2_v10_truth_verifier as v10
import phase2_v9_truth_verifier as v9

TRACK_ID = v9.TRACK_ID
DISPATCH_PATH = "phase2-role-dispatch-v13.json"
DISPATCH_SHA256 = "04eda4bfda92f171c61cda359843afe9c6057ddc673a6afca8e6c1f29048a766"
FIXTURE_MANIFEST = "phase2-v13-fixture-manifest.json"
ROOT_SEAL = "phase2-v13-root-truth-seal.json"
MAPPER_RELEASE = "phase2-v13-mapper-release.json"
REVIEW_OUTPUT = "phase2-v13-independent-review.json"
REVIEW_RECEIPT = "role-receipts/phase2/capability-reviewer-v13.json"
TAXONOMY_OUTPUT = "phase2-capability-taxonomy-inventory-v1.json"
MAPPER_OUTPUTS = (TAXONOMY_OUTPUT, *v9.MAPPER_OUTPUTS)
MAPPER_RECEIPT = v9.MAPPER_RECEIPT
BASE_TRUTH_PATHS = (
    DISPATCH_PATH,
    "phase2_v13_truth_verifier.py",
    "phase2_v13_truth_verifier_test.py",
    FIXTURE_MANIFEST,
    "phase2-v13-red-report.json",
    "role-receipts/phase2/truth-test-author-v13.json",
)
PRESERVED_V12 = {
    "phase2_v12_truth_verifier.py": "c9603f2caeb40df5626d6e35a3c2a754d5dac9099827eb8f02cd7c204a3972a4",
    "phase2_v12_truth_verifier_test.py": "a61f55d5914c5b6892949b54ceb0e7f8b7805d150d8e270bacf227f187e444ed",
    "phase2-v12-fixture-manifest.json": "85947c29737e2d7f43509d8fb0b9f381d38a9c8240bdf0bb5948a8087ca470fc",
    "negative-fixtures/phase2-v12/end-to-end-attacks.json": "17535c7b22b814044535237463f33731ba56ca2fcc92073dd71fdede36621259",
    "phase2-v12-red-report.json": "912ea9a31aeeb71d6196ff48a77d2d959db4fa56eed8c840a69d3428c5c5f54e",
    "role-receipts/phase2/truth-test-author-v12.json": "456436e0d479e18ac6797709909d57041e2c4434a23368fe12749386dbb1533b",
    "phase2-v12-root-truth-seal.json": "100df74cd9fb6782b38688b7cfb6f0749a70c05356fb0356cbbc6e95df4a8859",
    "phase2-v12-mapper-release.json": "50464bf42dfc89a4a79a44b8ec3ce66a4ca03b10725267158f557f34042aa35b",
}
AUDIT_KEYS = {
    "review_method", "reviewed_field_ids", "fact_category", "disposition_basis",
    "basis_evidence_refs", "evaluated_taxonomy_ids",
    "not_applicable_taxonomy_ids", "redundant_to_use_ids",
    "incompatibility_evidence_refs", "contradiction_kind",
    "contradiction_resolution", "conflict_evidence_refs",
    "conflict_provenance_refs",
}
FACT_CATEGORIES = {
    "complete-behavior", "behavioral-fragment", "provenance-location",
    "type-vocabulary", "ui-render-scaffolding", "asset-loading",
    "test-fixture-or-test-id", "negative-search", "transport-or-api-wiring",
    "accepted-negative-control",
}
NON_BEHAVIOR_CATEGORIES = FACT_CATEGORIES - {
    "complete-behavior", "behavioral-fragment"
}
CONTEXT_BASES = {
    "context-or-provenance-not-behavior",
    "incomplete-behavioral-anchors",
    "complete-behavior-no-cross-game-counterpart",
    "incompatible-bespoke-behavior",
    "redundant-to-selected-atomic-evidence",
    "contradictory-accepted-evidence",
}
COMPLETE_BASES = {
    "selected-complete-behavioral-anchors",
    "complete-behavior-no-cross-game-counterpart",
    "incompatible-bespoke-behavior",
    "redundant-to-selected-atomic-evidence",
}
TAXONOMY_STATUSES = {
    "selected-capability",
    "rejected-insufficient-cross-game-evidence",
    "rejected-incompatible-bespoke",
}
ANCHOR_ROLES = {"precondition", "action_or_transition", "observable_outcome"}
MAPPER_RECEIPT_KEYS = v10.MAPPER_RECEIPT_KEYS
REVIEW_RECEIPT_KEYS = v10.REVIEW_RECEIPT_KEYS
REMOVED_GLOBAL_COUNT_CODES = frozenset({
    "CURATED_FINDING_BUDGET_EXCEEDED",
    "CURATED_USE_BUDGET_EXCEEDED",
})


@dataclass(frozen=True)
class Finding:
    """Represents one deterministic v13 finding."""

    code: str
    message: str


@dataclass(frozen=True)
class VerificationResult:
    """Represents the public v13 verification result."""

    state: str
    findings: tuple[Finding, ...]
    checks: int

    @property
    def passed(self) -> bool:
        """Returns whether a candidate reached a review lifecycle state."""
        return self.state in {
            "CANDIDATE_VERIFIED_PENDING_INDEPENDENT_REVIEW",
            "VERIFIED_PENDING_ROOT_ACCEPTANCE",
        }


def _add(findings: list[Finding], code: str, message: str) -> None:
    """Adds one de-duplicated finding."""
    row = Finding(code, message)
    if row not in findings:
        findings.append(row)


def _load(path: Path) -> dict[str, Any]:
    """Loads one JSON object."""
    value = json.loads(path.read_text())
    if not isinstance(value, dict):
        raise ValueError(f"{path} is not an object")
    return value


def _verify_inputs(
    track_root: Path, findings: list[Finding]
) -> tuple[dict[str, Any], dict[str, Any], int]:
    """Verifies v13 authority, all v10 bytes, and inherited accepted inputs."""
    fixed = {DISPATCH_PATH: DISPATCH_SHA256, **PRESERVED_V12}
    for relative, expected in fixed.items():
        path = track_root / relative
        if not path.is_file() or v9._sha(path) != expected:
            _add(findings, "TRUTH_INPUT_DRIFT", f"Frozen input differs: {relative}.")
    if findings:
        return {}, {}, len(fixed)
    dispatch = _load(track_root / DISPATCH_PATH)
    if (
        dispatch.get("schema_version") != "apk-t9-phase2-role-dispatch.v13"
        or dispatch.get("status") != "active-v13-truth-authoring"
    ):
        _add(findings, "TRUTH_INPUT_DRIFT", "The v13 dispatch is not active.")
    prior: list[v12.Finding] = []
    inputs, registry, checks = v12._verify_inputs(track_root, prior)
    if prior:
        _add(findings, "TRUTH_INPUT_DRIFT", "Inherited v12 authority differs.")
    return inputs, registry, len(fixed) + checks + 1


def _validate_manifest(
    track_root: Path, findings: list[Finding]
) -> tuple[tuple[str, ...], int]:
    """Validates exact v13 manifest and declared fixture identities and counts."""
    manifest = _load(track_root / FIXTURE_MANIFEST)
    top = {
        "schema_version", "track_id", "dispatch_sha256",
        "fixture_count", "case_count", "fixtures",
    }
    fixtures = manifest.get("fixtures")
    if (
        set(manifest) != top
        or manifest.get("schema_version") != "apk-t9-phase2-v13-fixture-manifest.v1"
        or manifest.get("track_id") != TRACK_ID
        or manifest.get("dispatch_sha256") != DISPATCH_SHA256
        or not isinstance(fixtures, list)
        or len(fixtures) > 16
    ):
        _add(findings, "INVALID_FIXTURE_MANIFEST", "Manifest identity or keys differ.")
        fixtures = fixtures if isinstance(fixtures, list) else []
    if manifest.get("fixture_count") != len(fixtures):
        _add(findings, "FIXTURE_COUNT_MISMATCH", "Fixture count differs.")
    ids: list[str] = []
    paths: list[str] = []
    actual_total = 0
    for row in fixtures:
        if not isinstance(row, dict) or set(row) != {"id", "path", "sha256", "case_count"}:
            _add(findings, "INVALID_FIXTURE_MANIFEST", "Fixture row differs.")
            continue
        ids.append(row["id"])
        paths.append(row["path"])
        path = track_root / row["path"]
        if not path.is_file() or v9._sha(path) != row["sha256"]:
            _add(findings, "FIXTURE_DRIFT", f"Fixture differs: {row['path']}.")
            continue
        fixture = _load(path)
        cases = fixture.get("cases")
        if (
            set(fixture) != {"schema_version", "track_id", "cases"}
            or fixture.get("schema_version") != "apk-t9-phase2-v13-end-to-end-attacks.v1"
            or fixture.get("track_id") != TRACK_ID
            or not isinstance(cases, list)
        ):
            _add(findings, "INVALID_FIXTURE_SCHEMA", f"Fixture identity differs: {row['path']}.")
            continue
        actual_total += len(cases)
        if row["case_count"] != len(cases):
            _add(findings, "FIXTURE_CASE_COUNT_MISMATCH", f"Fixture count differs: {row['path']}.")
    if len(ids) != len(set(ids)):
        _add(findings, "DUPLICATE_FIXTURE_ID", "Fixture IDs are duplicated.")
    if len(paths) != len(set(paths)):
        _add(findings, "DUPLICATE_FIXTURE_PATH", "Fixture paths are duplicated.")
    declared = sum(row.get("case_count", 0) for row in fixtures if isinstance(row, dict))
    if manifest.get("case_count") != declared or manifest.get("case_count") != actual_total:
        _add(findings, "TOP_CASE_COUNT_MISMATCH", "Top case count differs.")
    return tuple(paths), len(fixtures) + actual_total + 5


def _verify_root_authority(
    track_root: Path,
    fixture_paths: tuple[str, ...],
    expected_release: str | None,
    findings: list[Finding],
) -> tuple[str | None, str | None, str]:
    """Validates v13 root authority before mapper presence."""
    seal_path = track_root / ROOT_SEAL
    release_path = track_root / MAPPER_RELEASE
    if not seal_path.is_file() or not release_path.is_file():
        _add(findings, "ROOT_V13_AUTHORITY_MISSING", "Root v13 authority is not published.")
        return None, None, "RED_WAITING_FOR_ROOT_V13_AUTHORITY"
    if expected_release is None:
        _add(findings, "EXPECTED_MAPPER_RELEASE_REQUIRED", "Expected v13 release SHA-256 is required.")
        return None, None, "INVALID"
    if v9._sha(release_path) != expected_release:
        _add(findings, "MAPPER_RELEASE_MISMATCH", "Expected v13 release SHA-256 differs.")
        return None, None, "INVALID"
    truth_paths = (*BASE_TRUTH_PATHS, *fixture_paths)
    live = {
        relative: v9._sha(track_root / relative)
        for relative in truth_paths if (track_root / relative).is_file()
    }
    seal = _load(seal_path)
    if (
        set(seal) != {"schema_version", "track_id", "dispatch_sha256", "status", "pins"}
        or seal.get("schema_version") != "apk-t9-phase2-root-truth-seal.v13"
        or seal.get("track_id") != TRACK_ID
        or seal.get("dispatch_sha256") != DISPATCH_SHA256
        or seal.get("status") != "sealed-red-v13"
        or seal.get("pins") != live
        or set(live) != set(truth_paths)
    ):
        _add(findings, "LIVE_TRUTH_DRIFT", "Root v13 seal differs from live truth.")
    seal_sha = v9._sha(seal_path)
    release = _load(release_path)
    if (
        set(release) != {
            "schema_version", "track_id", "status", "dispatch_sha256",
            "root_truth_seal", "truth_artifacts",
        }
        or release.get("schema_version") != "apk-t9-phase2-mapper-release.v13"
        or release.get("track_id") != TRACK_ID
        or release.get("status") != "released-for-mapper-v5"
        or release.get("dispatch_sha256") != DISPATCH_SHA256
        or release.get("root_truth_seal") != {"path": ROOT_SEAL, "sha256": seal_sha}
        or release.get("truth_artifacts") != live
    ):
        _add(findings, "MAPPER_RELEASE_MISMATCH", "Root v13 release differs.")
    return seal_sha, expected_release, "INVALID" if findings else "AUTHORITY_VERIFIED"


def _evidence_ref_valid(
    ref: Any, record: dict[str, Any], *, roles: set[str]
) -> bool:
    """Returns whether a typed basis reference resolves to accepted record evidence."""
    if not isinstance(ref, dict) or set(ref) != {"role", "field_id", "exact_excerpt"}:
        return False
    if ref.get("role") not in roles:
        return False
    field = next(
        (
            row for row in record["derived_fields"]
            if row["field_id"] == ref.get("field_id")
        ),
        None,
    )
    return (
        field is not None
        and isinstance(field.get("value"), str)
        and isinstance(ref.get("exact_excerpt"), str)
        and ref["exact_excerpt"] in field["value"]
        and bool(ref["exact_excerpt"].strip())
        and (roles == {"fact"} or v9._complete_excerpt(ref["exact_excerpt"]))
    )


def _taxonomy_evidence_ref_valid(
    ref: Any, expected: dict[str, dict[str, Any]]
) -> bool:
    """Returns whether an inventory reference resolves to exact Phase 1 evidence."""
    if not isinstance(ref, dict) or set(ref) != {
        "record_id", "field_id", "exact_excerpt",
    }:
        return False
    record = expected.get(ref.get("record_id"))
    if record is None:
        return False
    field = next(
        (row for row in record["derived_fields"] if row["field_id"] == ref.get("field_id")),
        None,
    )
    return (
        field is not None
        and isinstance(field.get("value"), str)
        and isinstance(ref.get("exact_excerpt"), str)
        and ref["exact_excerpt"] in field["value"]
        and v9._complete_excerpt(ref["exact_excerpt"])
    )


def _normalize_rationale(
    rationale: str,
    record: dict[str, Any],
    audit: dict[str, Any],
) -> str:
    """Normalizes substitutions to expose generated context-rationale templates."""
    value = " ".join(rationale.lower().split())
    substitutions = [
        record["record_id"], record["game_id"], record["source_claim_id"],
        *audit.get("evaluated_taxonomy_ids", []),
        *audit.get("not_applicable_taxonomy_ids", []),
    ]
    for token in sorted((str(item) for item in substitutions), key=len, reverse=True):
        value = value.replace(token.lower(), "<id>")
    for ref in audit.get("basis_evidence_refs", []):
        if isinstance(ref, dict) and isinstance(ref.get("exact_excerpt"), str):
            value = value.replace(ref["exact_excerpt"].lower(), "<excerpt>")
    value = re.sub(r"\b\d+\b", "<n>", value)
    value = re.sub(r"\b(?:taxonomy|capability):[a-z0-9:_-]+\b", "<id>", value)
    return value


def _normalize_taxonomy_review_rationale(value: str, entry: dict[str, Any]) -> str:
    """Normalizes all inventory substitutions in a taxonomy review rationale."""
    normalized = " ".join(value.lower().split())
    substitutions = [
        entry.get("taxonomy_id"), entry.get("capability_id"),
        *entry.get("candidate_record_ids", []),
        *entry.get("cross_game_counterpart_record_ids", []),
    ]
    for ref in (*entry.get("evidence_refs", []), *entry.get("incompatibility_evidence_refs", [])):
        if isinstance(ref, dict):
            substitutions.extend((ref.get("record_id"), ref.get("field_id"), ref.get("exact_excerpt")))
    for token in sorted((str(item) for item in substitutions if item), key=len, reverse=True):
        normalized = normalized.replace(token.lower(), "<value>")
    normalized = re.sub(r"\b[a-f0-9]{12,64}\b", "<hash>", normalized)
    return re.sub(r"\b\d+\b", "<n>", normalized)


def _value_sha256(value: str) -> str:
    """Returns the repository canonical SHA-256 for an exact value."""
    return v9._digest(value)


def _validate_rpg_terminal_traversal(
    repo_root: Path, inputs: dict[str, Any], rule: dict[str, Any],
    findings: list[Finding],
) -> None:
    """Validates the full RPG negative-control source-resolution traversal."""
    traversal = rule["required_source_resolution_traversal"]
    selector = traversal["source_index_record_selector"]
    upstream = next((row for row in inputs["source"]["upstream_claims"] if row.get("game_id") == selector["game_id"] and row.get("claim_id") == selector["claim_id"]), None)
    terminal_selector = traversal["terminal_source_artifact_selector"]
    artifact = next((row for row in inputs["source"]["source_artifacts"] if row.get("document_id") == terminal_selector["document_id"]), None)
    terminal_path = repo_root / terminal_selector["path"]
    valid = (
        upstream is not None
        and upstream.get("materialization_rule") == traversal["materialization_rule"]
        and upstream.get("materialization_steps") == traversal["materialization_steps_exact"]
        and upstream.get("terminal_document_id") == terminal_selector["document_id"]
        and upstream.get("value_pointer") == traversal["terminal_value_pointer"]
        and upstream.get("value_sha256") == traversal["terminal_value_sha256"]
        and artifact == terminal_selector
        and terminal_path.is_file()
        and v9._sha(terminal_path) == terminal_selector["sha256"]
    )
    fixture: Any = None
    if valid:
        terminal = _load(terminal_path)
        fixtures = terminal.get("negative_evidence_fixtures")
        if isinstance(fixtures, list) and fixtures:
            fixture = fixtures[0]
    supporting = rule["required_supporting_location_fields"]
    valid = valid and isinstance(fixture, dict) and (
        fixture.get("claim_id") == "RPG-NEG-001"
        and fixture.get("fixture_kind") == rule["required_fixture_kind"]
        and fixture.get("expected_disposition") == rule["required_expected_disposition"]
        and _value_sha256(fixture.get("claim_text", "")) == rule["required_basis_record_value_sha256"]
        and {key: fixture.get(key) for key in supporting} == supporting
    )
    if not valid:
        _add(findings, "INVALID_NEGATIVE_CONTROL_TRAVERSAL", "RPG-NEG-001 terminal traversal differs.")


def _validate_contradiction_audit(
    record_id: str, row: dict[str, Any], record: dict[str, Any],
    expected: dict[str, dict[str, Any]], rule: dict[str, Any] | None,
    all_taxonomy_ids: set[str], findings: list[Finding],
) -> None:
    """Validates one v13 contradiction audit or the normal null-empty contract."""
    audit = row["audit"]
    if rule is None:
        if (
            audit.get("contradiction_kind") is not None
            or audit.get("contradiction_resolution") is not None
            or audit.get("conflict_evidence_refs") != []
            or audit.get("conflict_provenance_refs") != []
            or audit.get("disposition_basis") == "contradictory-accepted-evidence"
        ):
            _add(findings, "UNAUTHORIZED_CONTRADICTION_QUARANTINE", record_id)
        return
    counterpart_id = rule["required_same_game_counterpart_record_ids"][0]
    counterpart = expected.get(counterpart_id)
    record_fact = next((field.get("value") for field in record["derived_fields"] if field.get("field_id") == "fact"), None)
    counterpart_fact = next((field.get("value") for field in (counterpart or {}).get("derived_fields", []) if field.get("field_id") == "fact"), None)
    rationale = row.get("context_rationale")
    exact_content = (
        isinstance(rationale, str)
        and record["source_claim_id"] in rationale
        and "contradictory-accepted-evidence" in rationale
        and rule["conflict_kind"] in rationale
        and rule["resolution"] in rationale
        and all(ref["exact_excerpt"] in rationale for ref in rule["required_conflict_evidence_refs_exact"])
    )
    if (
        row.get("primary_disposition") != "non-capability-context"
        or row.get("capability_uses") != []
        or audit.get("disposition_basis") != "contradictory-accepted-evidence"
        or audit.get("fact_category") != rule["required_fact_category"]
        or audit.get("basis_evidence_refs") != rule["required_basis_evidence_refs_exact"]
        or audit.get("evaluated_taxonomy_ids") != []
        or set(audit.get("not_applicable_taxonomy_ids", [])) != all_taxonomy_ids
        or audit.get("redundant_to_use_ids") != []
        or audit.get("incompatibility_evidence_refs") != []
        or audit.get("contradiction_kind") != rule["conflict_kind"]
        or audit.get("contradiction_resolution") != rule["resolution"]
        or (
            rule.get("required_scene_id") is not None
            and record.get("scene_id") != rule["required_scene_id"]
        )
        or not exact_content
    ):
        _add(findings, "INVALID_CONTRADICTION_DISPOSITION", record_id)
    if audit.get("conflict_evidence_refs") != rule["required_conflict_evidence_refs_exact"]:
        _add(findings, "INVALID_CONFLICT_EVIDENCE_REFS", record_id)
    if audit.get("conflict_provenance_refs") != rule["required_conflict_provenance_refs_exact"]:
        _add(findings, "INVALID_CONFLICT_PROVENANCE_REFS", record_id)
    if (
        counterpart is None
        or counterpart.get("game_id") != record.get("game_id")
        or record_fact != rule["required_basis_record_value"]
        or counterpart_fact != rule["required_counterpart_value"]
        or not isinstance(record_fact, str)
        or not isinstance(counterpart_fact, str)
        or _value_sha256(record_fact) != rule["required_basis_record_value_sha256"]
        or _value_sha256(counterpart_fact) != rule["required_counterpart_value_sha256"]
    ):
        _add(findings, "CONTRADICTION_PHASE1_EVIDENCE_DRIFT", record_id)


def _validate_taxonomy_and_curated(
    repo_root: Path,
    track_root: Path,
    inputs: dict[str, Any],
    registry: dict[str, Any],
    bundle: dict[str, dict[str, Any]],
    findings: list[Finding],
) -> tuple[dict[str, dict[str, Any]], int]:
    """Validates taxonomy inventory and all 633 v3 disposition audits."""
    taxonomy = bundle[TAXONOMY_OUTPUT]
    expected = v9._phase1_index(inputs)["mechanic_records"]
    taxonomy_keys = {
        "schema_version", "source_phase1_root_acceptance_sha256",
        "source_phase1_mechanic_blueprints_sha256",
        "source_phase1_developer_effort_baseline_sha256", "record_count",
        "taxonomy_entries",
    }
    if (
        set(taxonomy) != taxonomy_keys
        or taxonomy.get("schema_version") != "apk-t9-phase2-capability-taxonomy-inventory.v1"
        or taxonomy.get("source_phase1_root_acceptance_sha256") != v9.PHASE1_BINDINGS["phase1-root-acceptance.json"]
        or taxonomy.get("source_phase1_mechanic_blueprints_sha256") != v9.PHASE1_BINDINGS["phase1-mechanic-blueprints-v1.json"]
        or taxonomy.get("source_phase1_developer_effort_baseline_sha256") != v9.PHASE1_BINDINGS["phase1-developer-effort-baseline-v1.json"]
        or taxonomy.get("record_count") != 633
        or not isinstance(taxonomy.get("taxonomy_entries"), list)
    ):
        _add(findings, "INVALID_TAXONOMY_SCHEMA", "Taxonomy inventory schema differs.")
    entries: dict[str, dict[str, Any]] = {}
    for row in taxonomy.get("taxonomy_entries", []):
        keys = {
            "taxonomy_id", "atomic_dimension", "status", "capability_id",
            "candidate_record_ids", "evidence_refs",
            "cross_game_counterpart_record_ids", "incompatibility_evidence_refs",
        }
        if not isinstance(row, dict) or set(row) != keys:
            _add(findings, "INVALID_TAXONOMY_SCHEMA", "Taxonomy entry shape differs.")
            continue
        taxonomy_id = row.get("taxonomy_id")
        if not isinstance(taxonomy_id, str) or not taxonomy_id or taxonomy_id in entries:
            _add(findings, "DUPLICATE_TAXONOMY_ID", "Taxonomy IDs must be unique.")
            continue
        entries[taxonomy_id] = row
        status = row.get("status")
        candidates = row.get("candidate_record_ids")
        counterparts = row.get("cross_game_counterpart_record_ids")
        evidence_refs = row.get("evidence_refs")
        incompatibility_refs = row.get("incompatibility_evidence_refs")
        if status not in TAXONOMY_STATUSES:
            _add(findings, "INVALID_TAXONOMY_STATUS", "Taxonomy status differs.")
        common_valid = (
            isinstance(row.get("atomic_dimension"), str)
            and bool(row["atomic_dimension"].strip())
            and isinstance(candidates, list) and bool(candidates)
            and len(candidates) == len(set(candidates))
            and isinstance(counterparts, list)
            and len(counterparts) == len(set(counterparts))
            and isinstance(evidence_refs, list) and bool(evidence_refs)
            and isinstance(incompatibility_refs, list)
            and all(record_id in expected for record_id in (*candidates, *counterparts))
            and all(_taxonomy_evidence_ref_valid(ref, expected) for ref in (*evidence_refs, *incompatibility_refs))
            and set(candidates).issubset({ref.get("record_id") for ref in evidence_refs if isinstance(ref, dict)})
        )
        if not common_valid:
            _add(findings, "INVALID_TAXONOMY_SCHEMA", "Taxonomy entry evidence differs.")
        candidate_games = {expected[item]["game_id"] for item in candidates if item in expected} if isinstance(candidates, list) else set()
        counterpart_games = {expected[item]["game_id"] for item in counterparts if item in expected} if isinstance(counterparts, list) else set()
        if status == "selected-capability" and (
            not isinstance(row.get("capability_id"), str)
            or not row["capability_id"].strip()
            or len(candidate_games) < 2
            or counterparts != []
            or incompatibility_refs != []
        ):
            _add(findings, "INVALID_TAXONOMY_STATUS", "Selected taxonomy shape differs.")
        if status == "rejected-insufficient-cross-game-evidence" and (
            row.get("capability_id") is not None
            or counterparts != []
            or incompatibility_refs != []
        ):
            _add(findings, "INSUFFICIENT_TAXONOMY_EVIDENCE", "Insufficient entry shape differs.")
        if status == "rejected-incompatible-bespoke" and (
            row.get("capability_id") is not None
            or not counterparts
            or not incompatibility_refs
            or not set((*candidates, *counterparts)).issubset({ref.get("record_id") for ref in evidence_refs if isinstance(ref, dict)})
            or not any(game not in candidate_games for game in counterpart_games)
        ):
            _add(findings, "BESPOKE_INCOMPATIBILITY_MISSING", "Bespoke entry lacks exact cross-game evidence.")
    curated = bundle[v9.MAPPER_OUTPUTS[0]]
    if (
        set(curated) != v9.CURATED_KEYS
        or curated.get("schema_version") != "apk-t9-phase2-curated-capability-evidence.v4"
        or curated.get("phase1_bindings") != v9.PHASE1_BINDINGS
    ):
        _add(findings, "INVALID_SCHEMA_VERSION", "Curated v3 schema differs.")
    index = v9._phase1_index(inputs)
    expected = index["mechanic_records"]
    records = curated.get("records", [])
    record_map = {
        row.get("record_id"): row for row in records if isinstance(row, dict)
    }
    if len(records) != 633 or len(record_map) != 633 or set(record_map) != set(expected):
        _add(findings, "CURATED_ACCOUNTING_MISMATCH", "All 633 records must appear once.")
    uses: dict[str, dict[str, Any]] = {}
    context_ids = {row["record_id"] for row in registry["records"]}
    normalized_rationales: list[str] = []
    all_taxonomy_ids = set(entries)
    dispatch = _load(track_root / DISPATCH_PATH)
    contradiction_rules = {
        row["record_id"]: row
        for row in dispatch["known_contradiction_registry"]
    }
    if set(contradiction_rules) != {
        "magic-defense:MD-TRANS-006", "rpg-battle:RPG-NEG-001",
    }:
        _add(findings, "INVALID_CONTRADICTION_REGISTRY", "Contradiction allowlist differs.")
    _validate_rpg_terminal_traversal(
        repo_root, inputs, contradiction_rules["rpg-battle:RPG-NEG-001"], findings
    )
    taxonomy_record_ids = {
        record_id
        for entry in entries.values()
        for record_id in (
            *entry.get("candidate_record_ids", []),
            *entry.get("cross_game_counterpart_record_ids", []),
        )
    }
    if set(contradiction_rules) & taxonomy_record_ids:
        _add(findings, "CONTRADICTION_TAXONOMY_CANDIDATE", "Contradictory records appear in taxonomy candidates.")
    for record_id, row in record_map.items():
        record = expected[record_id]
        if set(row) != v9.RECORD_KEYS:
            _add(findings, "INVALID_SCHEMA", "Curated record shape differs.")
            continue
        audit = row.get("audit")
        if not isinstance(audit, dict) or set(audit) != AUDIT_KEYS:
            _add(findings, "INVALID_AUDIT_SCHEMA", f"{record_id} audit shape differs.")
            continue
        _validate_contradiction_audit(
            record_id, row, record, expected, contradiction_rules.get(record_id),
            all_taxonomy_ids, findings,
        )
        if audit.get("review_method") != "field-by-field-counterfactual":
            _add(findings, "PER_RECORD_AUDIT_PROOF_MISSING", record_id)
        if audit.get("reviewed_field_ids") != [
            field["field_id"] for field in record["derived_fields"]
        ]:
            _add(findings, "PER_RECORD_AUDIT_PROOF_MISSING", record_id)
        if audit.get("fact_category") not in FACT_CATEGORIES:
            _add(findings, "INVALID_FACT_CATEGORY", record_id)
        evaluated = audit.get("evaluated_taxonomy_ids")
        not_applicable = audit.get("not_applicable_taxonomy_ids")
        if (
            not isinstance(evaluated, list)
            or not isinstance(not_applicable, list)
            or set(evaluated) & set(not_applicable)
            or set(evaluated) | set(not_applicable) != all_taxonomy_ids
            or len(evaluated) != len(set(evaluated))
            or len(not_applicable) != len(set(not_applicable))
        ):
            _add(findings, "TAXONOMY_PARTITION_MISMATCH", record_id)
        refs = audit.get("basis_evidence_refs")
        if not isinstance(refs, list) or not refs:
            _add(findings, "BASIS_EVIDENCE_REF_MISSING", record_id)
            refs = []
        basis = audit.get("disposition_basis")
        required_roles = ANCHOR_ROLES if basis in COMPLETE_BASES else {"fact"}
        if any(not _evidence_ref_valid(ref, record, roles=required_roles) for ref in refs):
            _add(findings, "INVALID_BASIS_EVIDENCE_REF", record_id)
        if basis in COMPLETE_BASES and {ref.get("role") for ref in refs if isinstance(ref, dict)} != ANCHOR_ROLES:
            _add(findings, "COMPLETE_ANCHOR_ROLE_MISSING", record_id)
        incompatibility_refs = audit.get("incompatibility_evidence_refs")
        redundant_ids = audit.get("redundant_to_use_ids")
        if not isinstance(incompatibility_refs, list) or any(
            not _taxonomy_evidence_ref_valid(ref, expected)
            for ref in incompatibility_refs if isinstance(incompatibility_refs, list)
        ):
            _add(findings, "INVALID_INCOMPATIBILITY_EVIDENCE_REF", record_id)
        if not isinstance(redundant_ids, list):
            _add(findings, "INVALID_REDUNDANT_USE_IDS", record_id)
        if basis != "incompatible-bespoke-behavior" and incompatibility_refs != []:
            _add(findings, "IRRELEVANT_DISPOSITION_EVIDENCE", record_id)
        if basis != "redundant-to-selected-atomic-evidence" and redundant_ids != []:
            _add(findings, "IRRELEVANT_DISPOSITION_EVIDENCE", record_id)
        row_uses = row.get("capability_uses")
        if row.get("primary_disposition") == "curated-capability-evidence":
            if basis != "selected-complete-behavioral-anchors" or not isinstance(row_uses, list) or not row_uses:
                _add(findings, "INVALID_CAPABILITY_DISPOSITION", record_id)
                row_uses = row_uses if isinstance(row_uses, list) else []
            use_caps = {use.get("capability_id") for use in row_uses if isinstance(use, dict)}
            selected_caps = {
                entries[taxonomy_id].get("capability_id")
                for taxonomy_id in evaluated if taxonomy_id in entries
                and entries[taxonomy_id].get("status") == "selected-capability"
            }
            if selected_caps != use_caps or any(
                taxonomy_id not in entries
                or entries[taxonomy_id].get("status") != "selected-capability"
                for taxonomy_id in evaluated
            ):
                _add(findings, "SELECTED_TAXONOMY_USE_MISMATCH", record_id)
            if audit.get("redundant_to_use_ids") or audit.get("incompatibility_evidence_refs"):
                _add(findings, "INVALID_CAPABILITY_DISPOSITION", record_id)
        elif row.get("primary_disposition") == "non-capability-context":
            if basis == "no-complete-behavioral-anchors":
                _add(findings, "LEGACY_CONTEXT_BASIS", record_id)
            if basis not in CONTEXT_BASES or row_uses != []:
                _add(findings, "INVALID_CONTEXT_DISPOSITION", record_id)
            rationale = row.get("context_rationale")
            if (
                not isinstance(rationale, str)
                or record["source_claim_id"] not in rationale
                or str(basis) not in rationale
                or not any(
                    isinstance(ref, dict)
                    and isinstance(ref.get("exact_excerpt"), str)
                    and ref["exact_excerpt"] in rationale
                    for ref in refs
                )
            ):
                _add(findings, "GENERIC_CONTEXT_RATIONALE", record_id)
            elif basis != "contradictory-accepted-evidence":
                normalized_rationales.append(
                    _normalize_rationale(rationale, record, audit)
                )
            if (
                record_id in context_ids
                and not (
                    record_id in contradiction_rules
                    and basis == "contradictory-accepted-evidence"
                )
                and basis not in {
                    "context-or-provenance-not-behavior",
                    "incomplete-behavioral-anchors",
                }
            ):
                _add(findings, "CONTEXT_COUNTEREXAMPLE_PROMOTED", record_id)
            if basis == "context-or-provenance-not-behavior" and audit.get("fact_category") not in NON_BEHAVIOR_CATEGORIES:
                _add(findings, "PROVENANCE_BASIS_ON_COMPLETE_BEHAVIOR", record_id)
            if basis == "incomplete-behavioral-anchors" and audit.get("fact_category") != "behavioral-fragment":
                _add(findings, "INCOMPLETE_BASIS_FACT_MISMATCH", record_id)
            if basis == "complete-behavior-no-cross-game-counterpart":
                if not evaluated or any(
                    taxonomy_id not in entries
                    or entries[taxonomy_id].get("status") != "rejected-insufficient-cross-game-evidence"
                    or record_id not in entries[taxonomy_id].get("candidate_record_ids", [])
                    for taxonomy_id in evaluated
                ):
                    _add(findings, "NO_COUNTERPART_TAXONOMY_MISMATCH", record_id)
            if basis == "incompatible-bespoke-behavior":
                bespoke_entries = [entries[item] for item in evaluated if item in entries]
                expected_incompatibility_refs = [
                    ref
                    for entry in bespoke_entries
                    for ref in entry.get("incompatibility_evidence_refs", [])
                ]
                required_record_ids = {
                    item
                    for entry in bespoke_entries
                    for item in (
                        *entry.get("candidate_record_ids", []),
                        *entry.get("cross_game_counterpart_record_ids", []),
                    )
                }
                actual_record_ids = {
                    ref.get("record_id")
                    for ref in incompatibility_refs
                    if isinstance(ref, dict)
                } if isinstance(incompatibility_refs, list) else set()
                if (
                    not evaluated
                    or not incompatibility_refs
                    or any(
                        taxonomy_id not in entries
                        or entries[taxonomy_id].get("status") != "rejected-incompatible-bespoke"
                        or record_id not in entries[taxonomy_id].get("candidate_record_ids", [])
                        for taxonomy_id in evaluated
                    )
                    or incompatibility_refs != expected_incompatibility_refs
                    or not required_record_ids.issubset(actual_record_ids)
                ):
                    _add(findings, "BESPOKE_INCOMPATIBILITY_MISSING", record_id)
        else:
            _add(findings, "INVALID_PRIMARY_DISPOSITION", record_id)
            row_uses = []
        if (
            record_id in context_ids
            and row.get("primary_disposition") != "non-capability-context"
        ):
            _add(findings, "CONTEXT_COUNTEREXAMPLE_PROMOTED", record_id)
        for use in row_uses if isinstance(row_uses, list) else []:
            use_id = use.get("use_id")
            if use_id in uses:
                _add(findings, "DUPLICATE_USE_ID", str(use_id))
            uses[use_id] = {
                **use,
                "record_id": record_id,
                "game_id": record["game_id"],
                "claim_id": record["source_claim_id"],
            }
            if (
                use.get("scene_id") != record.get("scene_id")
                or use.get("state_id") != record.get("state_id")
            ):
                _add(findings, "SCENE_STATE_MISMATCH", record_id)
            anchors = use.get("anchors")
            if (
                not isinstance(anchors, dict)
                or set(anchors) != ANCHOR_ROLES
                or any(
                    not _evidence_ref_valid(
                        {"role": role, **anchor}, record, roles=ANCHOR_ROLES
                    )
                    for role, anchor in anchors.items()
                )
            ):
                _add(findings, "INVALID_BEHAVIORAL_ANCHOR", record_id)
    if len(normalized_rationales) != len(set(normalized_rationales)):
        _add(findings, "TEMPLATED_CONTEXT_RATIONALE", "Context rationales share a substitution-normalized template.")
    for record_id, row in record_map.items():
        audit = row.get("audit")
        if not isinstance(audit, dict) or audit.get("disposition_basis") != "redundant-to-selected-atomic-evidence":
            continue
        redundant_ids = audit.get("redundant_to_use_ids")
        evaluated = audit.get("evaluated_taxonomy_ids", [])
        if not isinstance(redundant_ids, list) or not redundant_ids:
            _add(findings, "REDUNDANT_SELECTED_USE_JOIN_MISSING", record_id)
            continue
        for use_id in redundant_ids:
            use = uses.get(use_id)
            taxonomy_matches = [
                entries[taxonomy_id]
                for taxonomy_id in evaluated
                if taxonomy_id in entries
                and entries[taxonomy_id].get("status") == "selected-capability"
                and entries[taxonomy_id].get("capability_id") == (use or {}).get("capability_id")
                and entries[taxonomy_id].get("atomic_dimension") == (use or {}).get("atomic_dimension")
            ]
            if (
                use is None
                or use["record_id"] == record_id
                or use["game_id"] != row.get("game_id")
                or not taxonomy_matches
            ):
                _add(findings, "REDUNDANT_SELECTED_USE_JOIN_MISSING", record_id)
    if len(uses) > 270:
        _add(findings, "CURATED_USE_BUDGET_EXCEEDED", "Selected uses exceed 270.")
    classifications = bundle[v9.MAPPER_OUTPUTS[2]].get("capabilities", [])
    classified_ids = {
        row.get("capability_id")
        for row in classifications
        if isinstance(row, dict) and isinstance(row.get("capability_id"), str)
    }
    selected_ids = [
        row.get("capability_id")
        for row in entries.values()
        if row.get("status") == "selected-capability"
    ]
    if len(selected_ids) != len(set(selected_ids)) or set(selected_ids) != classified_ids:
        _add(
            findings,
            "TAXONOMY_CLASSIFICATION_BIJECTION_MISMATCH",
            "Selected taxonomy entries and classified capabilities differ.",
        )
    # Reuse v9 game-disposition validation with a v2-shaped in-memory projection.
    projected = copy.deepcopy(bundle[v9.MAPPER_OUTPUTS[0]])
    projected["schema_version"] = "apk-t9-phase2-curated-capability-evidence.v2"
    for row in projected["records"]:
        if row["primary_disposition"] == "non-capability-context":
            row["context_rationale"] = (
                "Individual evidence review found no selected reusable cross-game capability."
            )
        row["audit"] = {
            "review_method": row["audit"]["review_method"],
            "reviewed_field_ids": row["audit"]["reviewed_field_ids"],
            "disposition_basis": (
                "selected-complete-behavioral-anchors"
                if row["primary_disposition"] == "curated-capability-evidence"
                else "no-complete-behavioral-anchors"
            ),
        }
    projected_bundle = {**bundle, v9.MAPPER_OUTPUTS[0]: projected}
    inherited: list[v9.Finding] = []
    _, _, inherited_checks = v9._validate_curated(
        inputs, registry, projected_bundle, inherited
    )
    for item in inherited:
        if item.code not in {
            "PER_RECORD_AUDIT_PROOF_MISSING", "CONTEXT_COUNTEREXAMPLE_PROMOTED"
        }:
            _add(findings, item.code, item.message)
    return uses, len(records) + len(entries) + len(uses) + inherited_checks


def _validate_mapper_receipt(
    track_root: Path,
    bundle: dict[str, dict[str, Any]],
    seal_sha: str,
    release_sha: str,
    findings: list[Finding],
) -> None:
    """Validates exact v13 mapper identity and six output hashes."""
    receipt = bundle[MAPPER_RECEIPT]
    hashes = {path: v9._sha(track_root / path) for path in MAPPER_OUTPUTS}
    if not isinstance(receipt, dict) or set(receipt) != MAPPER_RECEIPT_KEYS:
        _add(findings, "INVALID_SCHEMA", "Mapper receipt shape differs.")
        return
    if receipt.get("output_hashes") != hashes:
        _add(findings, "TAMPERED_OUTPUT", "Mapper output hashes differ.")
    if (
        receipt.get("agent_ref") != "/root/phase5_review_a/t9_phase0_final_reviewer"
        or receipt.get("owner_role") != "capability-mapper"
        or receipt.get("task_id") != "phase2-curated-evidence-mapper-v5-v13"
        or receipt.get("dispatch_sha256") != DISPATCH_SHA256
        or receipt.get("root_truth_seal_sha256") != seal_sha
        or receipt.get("root_mapper_release_sha256") != release_sha
        or receipt.get("status") != "candidate"
    ):
        _add(findings, "STALE_OR_WRONG_MAPPER_RECEIPT", "Mapper v13 receipt differs.")


def _validate_review(
    track_root: Path,
    bundle: dict[str, dict[str, Any]],
    seal_sha: str,
    release_sha: str,
    findings: list[Finding],
) -> bool:
    """Validates v13 taxonomy and expanded record verdicts plus inherited review."""
    review = _load(track_root / REVIEW_OUTPUT)
    expected_mapper_hashes = {
        path: v9._sha(track_root / path) for path in MAPPER_OUTPUTS
    }
    if (
        set(review) != {
            "schema_version", "track_id", "phase", "reviewer",
            "mapper_output_hashes", "sampling", "taxonomy_reviews",
            "record_reviews", "use_reviews", "finding_reviews",
            "game_disposition_reviews", "unresolved_counts", "status",
        }
        or review.get("schema_version") != "apk-t9-phase2-independent-review.v13"
        or review.get("track_id") != TRACK_ID
        or review.get("phase") != 2
        or review.get("reviewer") != {
            "agent_ref": "/root/phase5_review_b",
            "owner_role": "capability-reviewer",
        }
        or review.get("sampling") != "none-exhaustive"
        or review.get("mapper_output_hashes") != expected_mapper_hashes
    ):
        _add(findings, "INVALID_INDEPENDENT_REVIEW", "Review identity or six-output binding differs.")
    taxonomy_entries = {
        row["taxonomy_id"]: row for row in bundle[TAXONOMY_OUTPUT]["taxonomy_entries"]
    }
    taxonomy_reviews = review.get("taxonomy_reviews")
    if not isinstance(taxonomy_reviews, list):
        _add(findings, "INCOMPLETE_TAXONOMY_REVIEW", "Taxonomy reviews are absent.")
        taxonomy_reviews = []
    actual_taxonomy = [row.get("taxonomy_id") for row in taxonomy_reviews if isinstance(row, dict)]
    if len(actual_taxonomy) != len(set(actual_taxonomy)) or set(actual_taxonomy) != set(taxonomy_entries):
        _add(findings, "INCOMPLETE_TAXONOMY_REVIEW", "Taxonomy review is not exhaustive.")
    rejected = False
    taxonomy_rationales: list[str] = []
    for row in taxonomy_reviews:
        keys = {"taxonomy_id", "reviewed_object_sha256", "verdicts", "rationale", "evidence_refs"}
        if not isinstance(row, dict) or set(row) != keys:
            _add(findings, "INVALID_TAXONOMY_REVIEW", "Taxonomy review row differs.")
            continue
        taxonomy_id = row["taxonomy_id"]
        entry = taxonomy_entries.get(taxonomy_id)
        verdicts = row.get("verdicts")
        if (
            entry is None
            or row.get("reviewed_object_sha256") != v9._digest(entry)
            or not isinstance(verdicts, dict)
            or set(verdicts) != {
                "completeness_against_all_records", "atomic_dimension",
                "selected_or_rejected_status", "cross_game_sufficiency",
                "bespoke_incompatibility_evidence",
            }
            or any(value not in {"accept", "reject"} for value in verdicts.values())
        ):
            _add(findings, "INVALID_TAXONOMY_REVIEW", "Taxonomy review verdict differs.")
        elif "reject" in verdicts.values():
            rejected = True
        expected_refs = [{
            "type": "taxonomy-projection",
            "taxonomy_id": taxonomy_id,
            "candidate_record_ids": entry["candidate_record_ids"],
            "evidence_refs_sha256": v9._digest(entry["evidence_refs"]),
            "counterpart_record_ids": entry["cross_game_counterpart_record_ids"],
            "incompatibility_refs_sha256": v9._digest(entry["incompatibility_evidence_refs"]),
        }] if entry is not None else []
        if row.get("evidence_refs") != expected_refs:
            _add(findings, "UNRESOLVED_REVIEW_EVIDENCE_REF", "Taxonomy review refs differ.")
        rationale = row.get("rationale")
        if not isinstance(rationale, str) or len(rationale) < 40:
            _add(findings, "GENERIC_REVIEW_RATIONALE", "Taxonomy rationale is generic.")
        else:
            taxonomy_rationales.append(
                _normalize_taxonomy_review_rationale(rationale, entry)
            )
    if len(taxonomy_rationales) != len(set(taxonomy_rationales)):
        _add(findings, "GENERIC_REVIEW_RATIONALE", "Taxonomy review rationale repeats.")
    record_reviews = review.get("record_reviews", [])
    required_record_verdicts = {
        "accepted_fact_category", "basis_evidence_refs_and_anchor_completeness",
        "primary_disposition", "disposition_basis",
        "evaluated_and_not_applicable_taxonomy_partition",
        "redundant_use_or_incompatibility_joins",
        "context_rationale_or_selected_uses",
        "automatic_versus_individual_decision",
        "contradiction_kind", "contradiction_provenance",
        "contradiction_resolution", "quarantine_verdict",
    }
    records = {
        row["record_id"]: row
        for row in bundle[v9.MAPPER_OUTPUTS[0]]["records"]
    }
    contradiction_rules = {
        row["record_id"]: row
        for row in _load(track_root / DISPATCH_PATH)["known_contradiction_registry"]
    }
    review_ids = [row.get("record_id") for row in record_reviews if isinstance(row, dict)] if isinstance(record_reviews, list) else []
    if len(review_ids) != len(set(review_ids)) or set(review_ids) != set(records):
        _add(findings, "INCOMPLETE_RECORD_REVIEW", "Record review is not exhaustive.")
    for row in record_reviews if isinstance(record_reviews, list) else []:
        if not isinstance(row, dict) or set(row) != {
            "record_id", "reviewed_object_sha256", "verdicts",
            "rationale", "evidence_refs",
        }:
            _add(findings, "INVALID_RECORD_REVIEW", "Record review row differs.")
            continue
        record_id = row.get("record_id")
        record = records.get(record_id)
        verdicts = row.get("verdicts")
        if (
            record is None
            or row.get("reviewed_object_sha256") != v9._digest(record)
            or not isinstance(verdicts, dict)
            or set(verdicts) != required_record_verdicts
            or any(value not in {"accept", "reject"} for value in verdicts.values())
        ):
            _add(findings, "MISSING_CONTRADICTION_REVIEW_VERDICT", str(record_id))
        elif "reject" in verdicts.values():
            rejected = True
        expected_refs = []
        if record is not None:
            expected_refs.append({
                "type": "record-decision",
                "record_id": record_id,
                "primary_disposition": record["primary_disposition"],
                "audit_sha256": v9._digest(record["audit"]),
                "capability_use_ids": [use["use_id"] for use in record["capability_uses"]],
                "context_rationale_sha256": v9._digest(record["context_rationale"]),
            })
            if record_id in contradiction_rules:
                audit = record["audit"]
                expected_refs.append({
                    "type": "contradiction-projection",
                    "record_id": record_id,
                    "conflict_kind": audit["contradiction_kind"],
                    "contradiction_resolution": audit["contradiction_resolution"],
                    "conflict_evidence_refs_sha256": v9._digest(audit["conflict_evidence_refs"]),
                    "conflict_provenance_refs_sha256": v9._digest(audit["conflict_provenance_refs"]),
                    "audit_sha256": v9._digest(audit),
                })
        if row.get("evidence_refs") != expected_refs:
            _add(findings, "INVALID_CONTRADICTION_REVIEW_EVIDENCE", str(record_id))
        if not isinstance(row.get("rationale"), str) or len(row["rationale"]) < 40:
            _add(findings, "GENERIC_REVIEW_RATIONALE", str(record_id))
    # Native v13 semantics pass before this structural inherited projection.
    projected_review = copy.deepcopy(review)
    projected_review.pop("taxonomy_reviews", None)
    projected_review["schema_version"] = "apk-t9-phase2-independent-review.v9"
    projected_review["mapper_output_hashes"] = {
        path: expected_mapper_hashes[path] for path in v9.MAPPER_OUTPUTS
    }
    projected_bundle = copy.deepcopy({path: bundle[path] for path in v9.MAPPER_OUTPUTS})
    projected_records = {
        row["record_id"]: row
        for row in projected_bundle[v9.MAPPER_OUTPUTS[0]]["records"]
    }
    for record_id, record in projected_records.items():
        audit = record["audit"]
        for key in (
            "contradiction_kind", "contradiction_resolution",
            "conflict_evidence_refs", "conflict_provenance_refs",
        ):
            audit.pop(key)
        if record_id == "rpg-battle:RPG-NEG-001":
            audit["fact_category"] = "negative-search"
            audit["disposition_basis"] = "context-or-provenance-not-behavior"
        elif record_id == "magic-defense:MD-TRANS-006":
            audit["disposition_basis"] = "complete-behavior-no-cross-game-counterpart"
    for row in projected_review.get("record_reviews", []):
        verdicts = row["verdicts"]
        row["verdicts"] = {
            "primary_disposition": verdicts.get("primary_disposition"),
            "anchor_completeness": verdicts.get("basis_evidence_refs_and_anchor_completeness"),
            "context_rationale_or_selected_uses": verdicts.get("context_rationale_or_selected_uses"),
            "automatic_versus_individual_decision": verdicts.get("automatic_versus_individual_decision"),
        }
        record = projected_records[row["record_id"]]
        row["reviewed_object_sha256"] = v9._digest(record)
        row["evidence_refs"] = [{
            "type": "record-decision",
            "record_id": row["record_id"],
            "primary_disposition": record["primary_disposition"],
            "audit_sha256": v9._digest(record["audit"]),
            "capability_use_ids": [use["use_id"] for use in record["capability_uses"]],
            "context_rationale_sha256": v9._digest(record["context_rationale"]),
        }]
    receipt = _load(track_root / REVIEW_RECEIPT)
    mapper_hashes = expected_mapper_hashes
    if (
        set(receipt) != v10.REVIEW_RECEIPT_KEYS
        or receipt.get("agent_ref") != "/root/phase5_review_b"
        or receipt.get("owner_role") != "capability-reviewer"
        or receipt.get("task_id") != "phase2-curated-evidence-review-v13"
        or receipt.get("dispatch_sha256") != DISPATCH_SHA256
        or receipt.get("root_truth_seal_sha256") != seal_sha
        or receipt.get("root_mapper_release_sha256") != release_sha
        or receipt.get("review_artifact_sha256") != v9._sha(track_root / REVIEW_OUTPUT)
        or receipt.get("mapper_output_hashes") != mapper_hashes
        or receipt.get("status") not in {"accepted", "rejected"}
    ):
        _add(findings, "STALE_OR_WRONG_REVIEWER_RECEIPT", "Reviewer v13 receipt differs.")
    projected_receipt = copy.deepcopy(receipt)
    projected_receipt["task_id"] = "phase2-curated-evidence-review-v9"
    projected_receipt["mapper_output_hashes"] = {
        path: mapper_hashes[path] for path in v9.MAPPER_OUTPUTS
    }
    original_load = v9._load
    original_output = v9.REVIEW_OUTPUT
    original_receipt = v9.REVIEW_RECEIPT
    original_dispatch = v9.DISPATCH_SHA256
    try:
        def projected_load(path: Path) -> dict[str, Any]:
            if path == track_root / REVIEW_OUTPUT:
                return projected_review
            if path == track_root / REVIEW_RECEIPT:
                return projected_receipt
            return original_load(path)
        v9._load = projected_load
        v9.REVIEW_OUTPUT = REVIEW_OUTPUT
        v9.REVIEW_RECEIPT = REVIEW_RECEIPT
        v9.DISPATCH_SHA256 = DISPATCH_SHA256
        inherited: list[v9.Finding] = []
        inherited_rejected = v9._validate_review(
            track_root,
            projected_bundle,
            seal_sha,
            release_sha,
            inherited,
        )
    finally:
        v9._load = original_load
        v9.REVIEW_OUTPUT = original_output
        v9.REVIEW_RECEIPT = original_receipt
        v9.DISPATCH_SHA256 = original_dispatch
    for item in inherited:
        if item.code != "STALE_OR_WRONG_REVIEWER_RECEIPT":
            _add(findings, item.code, item.message)
    rejected = rejected or inherited_rejected
    if rejected:
        _add(findings, "SEMANTIC_REVIEW_REJECTED", "Independent v13 review rejected the candidate.")
    return rejected


def verify_phase2(
    repo_root: Path,
    track_root: Path,
    expected_root_mapper_release_sha256: str | None = None,
) -> VerificationResult:
    """Runs public file-backed v13 verification in authority-first order."""
    findings: list[Finding] = []
    try:
        inputs, registry, checks = _verify_inputs(track_root, findings)
        fixture_paths, fixture_checks = _validate_manifest(track_root, findings)
        checks += fixture_checks
        if findings:
            return VerificationResult("INVALID", tuple(sorted(findings, key=lambda row: row.code)), checks)
        seal_sha, release_sha, authority_state = _verify_root_authority(
            track_root, fixture_paths, expected_root_mapper_release_sha256, findings
        )
        checks += len(fixture_paths) + 4
        if authority_state != "AUTHORITY_VERIFIED":
            return VerificationResult(authority_state, tuple(sorted(findings, key=lambda row: row.code)), checks)
        missing = [
            path for path in (*MAPPER_OUTPUTS, MAPPER_RECEIPT)
            if not (track_root / path).is_file()
        ]
        if missing:
            _add(findings, "PHASE2_MAPPER_V5_OUTPUTS_MISSING", f"Missing mapper v5 outputs: {', '.join(missing)}")
            return VerificationResult("RED_WAITING_FOR_MAPPER_V5_OUTPUTS", tuple(findings), checks)
        oversized = [
            path for path in MAPPER_OUTPUTS
            if (track_root / path).stat().st_size > v9.MAX_OUTPUT_BYTES
        ]
        if oversized:
            _add(
                findings, "OUTPUT_BUDGET_EXCEEDED",
                f"Mapper outputs exceed 1048576 bytes: {', '.join(oversized)}",
            )
            return VerificationResult("INVALID", tuple(findings), checks)
        bundle = {
            path: _load(track_root / path)
            for path in (*MAPPER_OUTPUTS, MAPPER_RECEIPT)
        }
        uses, curated_checks = _validate_taxonomy_and_curated(
            repo_root, track_root, inputs, registry, bundle, findings
        )
        semantic_bundle = {path: bundle[path] for path in v9.MAPPER_OUTPUTS}
        inherited: list[v9.Finding] = []
        finding_ids, semantic_checks = v9._validate_semantic_joins(
            inputs, semantic_bundle, uses, inherited
        )
        for item in inherited:
            _add(findings, item.code, item.message)
        findings[:] = [
            item for item in findings
            if item.code not in REMOVED_GLOBAL_COUNT_CODES
        ]
        _validate_mapper_receipt(
            track_root, bundle, seal_sha or "", release_sha or "", findings
        )
        checks += curated_checks + semantic_checks + 8
        if findings:
            return VerificationResult("INVALID", tuple(sorted(findings, key=lambda row: row.code)), checks)
        review_present = (
            (track_root / REVIEW_OUTPUT).is_file()
            or (track_root / REVIEW_RECEIPT).is_file()
        )
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
            track_root, bundle, seal_sha or "", release_sha or "", review_findings
        )
        checks += 633 + len(uses) + len(finding_ids) + len(bundle[TAXONOMY_OUTPUT]["taxonomy_entries"])
        blocking = [
            row for row in review_findings
            if row.code not in {"INVALID_SEMANTIC_VERDICT", "SEMANTIC_REVIEW_REJECTED"}
        ]
        if blocking:
            return VerificationResult("INVALID", tuple(sorted(review_findings, key=lambda row: row.code)), checks)
        if rejected:
            return VerificationResult("REVIEW_REJECTED", tuple(sorted(review_findings, key=lambda row: row.code)), checks)
        return VerificationResult("VERIFIED_PENDING_ROOT_ACCEPTANCE", (), checks)
    except (KeyError, OSError, TypeError, ValueError, json.JSONDecodeError):
        _add(findings, "INVALID_SCHEMA", "The v13 file-backed candidate cannot be validated.")
        return VerificationResult("INVALID", tuple(sorted(findings, key=lambda row: row.code)), 0)


def main(argv: list[str] | None = None) -> int:
    """Runs v13 verification and emits stable JSON."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--track-root", type=Path, required=True)
    parser.add_argument("--expected-root-mapper-release-sha256")
    parser.add_argument("--expect-state")
    parser.add_argument("--expect-codes", nargs="*")
    args = parser.parse_args(argv)
    result = verify_phase2(
        args.repo_root,
        args.track_root,
        args.expected_root_mapper_release_sha256,
    )
    print(json.dumps({
        "schema_version": "apk-t9-phase2-v13-verification-result.v1",
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
