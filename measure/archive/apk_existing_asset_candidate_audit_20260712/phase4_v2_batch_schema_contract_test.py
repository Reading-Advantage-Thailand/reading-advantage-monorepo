#!/usr/bin/env python3
"""Fail-closed generic v2 schema verifier for Phase 4 batches AF-05 through AF-12."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Any


TRACK = Path("measure/tracks/apk_existing_asset_candidate_audit_20260712")
VALUE_VERIFIER = TRACK / "phase4_batch_contract_test.py"
V2_REPORT_DIRECTORY = TRACK / "phase4-v2-batch-schema-test-reports"
VALUE_REPORT_DIRECTORY = TRACK / "phase4-batch-test-reports"
FIXTURE_DIRECTORY = TRACK / "negative-fixtures/phase4-v2-batch-schema"
SUPPORTED_BATCH = re.compile(r"AF-(0[5-9]|1[0-2])\Z")
STANDARD_MAPPER_FINAL_STATUS = "mapping-complete-pending-fresh-truth-test-review-and-root-acceptance"

JOINS_KEYS = {
    "schema_version", "track_id", "batch_id", "role", "status", "scope", "counts",
    "input_binding", "review_slices", "records",
}
SCOPE_KEYS = {
    "batch_only", "catalog_locator_records_embedded", "catalog_locator_records_non_additive_count",
    "accepted_join_rule", "prohibited_inferences",
}
COUNTS_KEYS = {
    "candidate_paths", "identical_hash_groups", "caller_locators", "accepted_path_usage_links",
    "unique_scene_usage_records", "responsive_assessment_cells", "dispositions",
    "separate_catalog_locator_records", "additive_92_path_claim",
}
INPUT_BINDING_KEYS = {
    "phase4_input_freeze", "phase4_join_scaffold", "phase4_browser_evidence_freeze",
    "phase4_source_registry", "caller_inventory", "provenance_audit", "inspection_records",
    "strict_caller_scene_join_aid",
}
BINDING_ITEM_KEYS = {"path", "sha256"}
RECORD_KEYS = {
    "canonical_path", "sha256", "identical_hash_group", "duplicate_path_peers", "derived_public_url",
    "static_reference_status", "dynamic_risk", "unknown_rationale", "caller_locators",
    "accepted_usage_ids", "accepted_join_caller_locator_ids", "priority1_evidence", "provenance",
    "disposition", "canonical_standard_pack_candidate_key", "direct_legacy_adoption", "eligibility",
    "join_status", "usage_links", "semantic_replacement_requirements",
}
LINK_KEYS = {"usage_id", "source", "normalized_usage", "responsive_assessment_cells", "semantic_replacement_requirement"}
SOURCE_KEYS = {"normalizer_path", "normalizer_sha256", "normalizer_json_pointer"}
USAGE_BASE_KEYS = {
    "usage_id", "track", "game_id", "surface_kind", "surface_id", "asset_locator_literal",
    "category", "claim_ids", "evidence_class", "accepted_scope", "disclosures",
}
USAGE_SOURCE_VARIANTS = (
    {"source_path", "source_sha256", "source_json_pointers"},
    {"source_artifact"},
)
USAGE_OPTIONAL_KEYS = {"source_class"}
REQUIREMENT_KEYS = {
    "usage_id", "source", "accepted_usage_fields", "canonical_semantic_role", "canonical_state",
    "ontology_status",
}
CELL_KEYS = {"viewport", "theme", "status", "assessment", "facets"}
FACET_KEYS = {
    "text_capacity", "focal_crop_tile_slice", "state_coverage", "collision_readability",
    "theme_suitability", "current_legacy_function", "semantic_role_state_replacement_or_retirement",
    "per_path_runtime_load",
}
FACET_SHAPES = {
    "text_capacity": {"status", "evidence"},
    "focal_crop_tile_slice": {"status", "evidence"},
    "state_coverage": {"status", "evidence"},
    "collision_readability": {"status", "evidence"},
    "theme_suitability": {"status", "evidence"},
    "semantic_role_state_replacement_or_retirement": {"status", "evidence"},
    "per_path_runtime_load": {"status", "evidence"},
    "current_legacy_function": {"status", "evidence", "value", "scope", "per_path_runtime_load"},
}
SLICE_KEYS = {"slice_id", "games", "game_count", "candidate_paths", "accepted_usage_ids", "scope"}
ROLLUP_KEYS = {"schema_version", "track_id", "batch_id", "role", "status", "input_path_usage_joins", "counts", "groups"}
ROLLUP_COUNT_KEYS = {
    "candidate_paths", "identical_hash_groups", "caller_locators", "accepted_path_usage_links",
    "dispositions", "groups_with_mixed_path_specific_dispositions",
}
ROLLUP_INPUT_KEYS = {"path", "sha256"}
GROUP_KEYS = {"identical_hash_group", "member_paths", "path_specific_dispositions", "counts"}
GROUP_COUNT_KEYS = {"paths", "caller_locators", "accepted_path_usage_links", "disposition_paths"}
PATH_DISPOSITION_KEYS = {"canonical_path", "value", "policy_priority"}
MEMBER_PATH_KEYS = {"canonical_path"}
GROUP_DISPOSITION_COUNT_KEYS = {"reject", "replace", "unknown"}
MAPPER_RECEIPT_KEYS = {
    "schema_version", "track_id", "phase", "batch_id", "role", "native_task_name", "declared_model",
    "fork_turns", "inherited_narrative", "role_boundary", "allowed_input_paths",
    "allowed_input_manifest_sha256", "input_file_hashes", "output_file_hashes", "findings",
    "unresolved_blocking_findings", "stop_loss_events", "measured_resource_usage", "disclosures",
    "final_status",
}
FROZEN_RECORD_FIELDS = {
    "sha256", "identical_hash_group", "duplicate_path_peers", "derived_public_url",
    "static_reference_status", "dynamic_risk", "unknown_rationale", "caller_locators",
    "accepted_usage_ids", "accepted_join_caller_locator_ids", "priority1_evidence",
    "canonical_standard_pack_candidate_key", "direct_legacy_adoption",
}
CALLER_RECORD_FIELDS = {
    "sha256", "identical_hash_group", "duplicate_path_peers", "derived_public_url",
    "static_reference_status", "dynamic_risk", "unknown_rationale",
}
PROVENANCE_FIELDS = {
    "repository_introduction", "upstream_provenance", "license", "prospective_eligibility",
}
FIXTURE_OPERATIONS = {
    "missing_join_status", "wrong_join_status", "extra_link_requirement_key", "extra_mirror_key",
    "mirror_mismatch", "missing_rollup_sha", "wrong_rollup_sha", "factual_drift",
    "extra_schema_key", "stale_mapper_hash", "false_receipt_claim", "non_scene_cells",
    "member_path_scalar", "group_disposition_count_scalar",
}

EXPECTED_FIXTURE_HASHES = {
    str(FIXTURE_DIRECTORY / "extra-link-requirement-key.json"): "49ebac6cb719cf33488d6601892c66e9cfdbd9a7e56334c98197c51a94bc835b",
    str(FIXTURE_DIRECTORY / "extra-mirror-key.json"): "d3ecdadf12c242c2d8b39fd1c9c1c2a57275630d7ef172508a1942c01f1f47b0",
    str(FIXTURE_DIRECTORY / "extra-schema-key.json"): "e635765c58af27bc14ad471a7e0b90b1d5e8462d43b4a9a81f77343330d558b0",
    str(FIXTURE_DIRECTORY / "factual-drift.json"): "a6778e84cd45b77f4b5dbc739ce4075c696ea1a20710ab6c0ac235cf8c8dd3d6",
    str(FIXTURE_DIRECTORY / "false-receipt-claim.json"): "a46c97fb8c9034b24d3fbd423173e03e115ed75980206a7d0e8f5e855ea7f077",
    str(FIXTURE_DIRECTORY / "group-disposition-count-scalar.json"): "c50b5860e2e71af4e097cdd02038476c65c35349048f3865aaf2dab0d63803d8",
    str(FIXTURE_DIRECTORY / "member-path-scalar.json"): "6cadd9b3e01ed0f31a7d529ce5de96cf0b16cf0aa0aba7722357fc6117875ace",
    str(FIXTURE_DIRECTORY / "mirror-mismatch.json"): "470a7ef0357fcd904df7bced1bbc854b67b24c3cc4c390ef8e86693a56881e46",
    str(FIXTURE_DIRECTORY / "missing-join-status.json"): "2cafc7c52f119d2004fa9e4a546d2531255f3454cc4451e5d5f3a3d046b8f4af",
    str(FIXTURE_DIRECTORY / "missing-rollup-sha.json"): "5e7c871a3fa7ad55eb5f52473ddd944d71f68fe097eaeaaf2fd9b653b3c7b2ab",
    str(FIXTURE_DIRECTORY / "non-scene-cells.json"): "e085ec5f23c77aa38645c1586c062f754534ee4565743e4aed385db0866ab297",
    str(FIXTURE_DIRECTORY / "stale-mapper-hash.json"): "9ae2fb2df17ff8c2f7c15fb5a8502c2944b3665213755f478eb01178f7de2a24",
    str(FIXTURE_DIRECTORY / "wrong-join-status.json"): "109fdd24b390225a6330f1611fd2ec12de1468712b5d4a10cb381a15b4221510",
    str(FIXTURE_DIRECTORY / "wrong-rollup-sha.json"): "eaca0613fd10c42e1208a6233508822b2edc8d31a834d808d2b659a8d1abc120",
}

READ_BYTES = 0
PAYLOAD_CACHE: dict[Path, bytes] = {}


def read_bytes(path: Path) -> bytes:
    """Reads a file once and records the exact on-disk bytes consumed.

    Args:
        path: Absolute path to the file.

    Returns:
        The file's raw bytes.
    """
    global READ_BYTES
    resolved = path.resolve()
    if resolved not in PAYLOAD_CACHE:
        payload = resolved.read_bytes()
        PAYLOAD_CACHE[resolved] = payload
        READ_BYTES += len(payload)
    return PAYLOAD_CACHE[resolved]


def digest(path: Path) -> str:
    """Returns the SHA-256 digest of a file's exact bytes.

    Args:
        path: Absolute path to the file.

    Returns:
        The lowercase SHA-256 hexadecimal digest.
    """
    return hashlib.sha256(read_bytes(path)).hexdigest()


def load(path: Path) -> Any:
    """Loads a UTF-8 JSON document while accounting for its bytes.

    Args:
        path: Absolute path to the JSON document.

    Returns:
        The parsed JSON value.
    """
    return json.loads(read_bytes(path).decode("utf-8"))


def add(errors: list[str], code: str, detail: str) -> None:
    """Adds a stable machine-readable contract failure.

    Args:
        errors: Mutable error collection.
        code: Stable failure code.
        detail: Compact contextual detail.
    """
    errors.append(f"{code}: {detail}")


def exact_keys(errors: list[str], value: Any, expected: set[str], label: str) -> bool:
    """Requires an object to contain exactly the declared keys.

    Args:
        errors: Mutable error collection.
        value: Value expected to be an object.
        expected: Exact required key set.
        label: Location label for diagnostics.

    Returns:
        Whether the value has the exact required object shape.
    """
    if not isinstance(value, dict) or set(value) != expected:
        add(errors, "unexpected-key", label)
        return False
    return True


def require_list(errors: list[str], value: Any, label: str) -> list[Any]:
    """Returns a list or emits a fail-closed shape error.

    Args:
        errors: Mutable error collection.
        value: Value expected to be a list.
        label: Location label for diagnostics.

    Returns:
        The original list, or an empty list after recording an error.
    """
    if not isinstance(value, list):
        add(errors, "schema-type", label)
        return []
    return value


def require_dict(errors: list[str], value: Any, label: str) -> dict[str, Any]:
    """Returns an object or emits a fail-closed shape error.

    Args:
        errors: Mutable error collection.
        value: Value expected to be an object.
        label: Location label for diagnostics.

    Returns:
        The original object, or an empty object after recording an error.
    """
    if not isinstance(value, dict):
        add(errors, "schema-type", label)
        return {}
    return value


def safe_load(root: Path, relative_path: Path, errors: list[str], label: str) -> Any | None:
    """Loads a required repository document without allowing parsing failures to escape.

    Args:
        root: Repository root supplied by the caller.
        relative_path: Repository-relative document path.
        errors: Mutable error collection.
        label: Stable logical source label.

    Returns:
        Parsed JSON, or None when the required source is unavailable or malformed.
    """
    try:
        return load(root / relative_path)
    except OSError:
        add(errors, "required-document-missing", f"{label}:{relative_path}")
    except (UnicodeDecodeError, json.JSONDecodeError):
        add(errors, "source-document-malformed", f"{label}:{relative_path}")
    return None


def exact_usage_keys(errors: list[str], value: Any, label: str) -> bool:
    """Requires one normalized-usage source-envelope variant plus optional source class.

    Args:
        errors: Mutable error collection.
        value: Candidate normalized usage object.
        label: Location label for diagnostics.

    Returns:
        Whether the usage object has a supported exact key envelope.
    """
    if not isinstance(value, dict):
        add(errors, "unexpected-key", label)
        return False
    accepted = {
        frozenset(USAGE_BASE_KEYS | variant | optional)
        for variant in USAGE_SOURCE_VARIANTS
        for optional in (set(), USAGE_OPTIONAL_KEYS)
    }
    if frozenset(value) not in accepted:
        add(errors, "unexpected-key", label)
        return False
    return True


def source_fields(usage: Any) -> dict[str, Any]:
    """Copies the permitted usage fields with absent source class normalized to null.

    Args:
        usage: Normalized usage object.

    Returns:
        The six-key semantic-requirement evidence envelope.
    """
    fields = require_dict([], usage, "normalized_usage")
    return {
        key: fields.get(key)
        for key in (
            "track", "game_id", "surface_kind", "surface_id", "asset_locator_literal", "category",
            "claim_ids", "evidence_class", "source_class", "accepted_scope", "disclosures",
        )
    }


def relative_batch_path(batch: str, filename: str) -> Path:
    """Builds the selected batch's repository-relative artifact path.

    Args:
        batch: Validated batch identifier.
        filename: Batch-local artifact filename.

    Returns:
        Repository-relative path to the selected batch artifact.
    """
    return TRACK / "batches" / batch / filename


def input_binding_paths(batch: str) -> dict[str, Path]:
    """Returns the fixed Phase 4 binding paths for the selected batch.

    Args:
        batch: Validated batch identifier.

    Returns:
        Binding key to repository-relative source path mapping.
    """
    return {
        "phase4_input_freeze": TRACK / "phase4-input-freeze-v1.json",
        "phase4_join_scaffold": TRACK / "phase4-join-scaffold-v1.json",
        "phase4_browser_evidence_freeze": TRACK / "phase4-browser-evidence-freeze-v1.json",
        "phase4_source_registry": TRACK / "phase4-source-registry-v1.json",
        "caller_inventory": relative_batch_path(batch, "caller-inventory.json"),
        "provenance_audit": relative_batch_path(batch, "provenance-audit.json"),
        "inspection_records": relative_batch_path(batch, "inspection-records.json"),
        "strict_caller_scene_join_aid": TRACK / "phase4-working-notes/strict-caller-scene-joins.json",
    }


def unique_index(errors: list[str], records: list[Any], key: str, label: str) -> dict[str, dict[str, Any]]:
    """Indexes object records by a non-empty unique string key.

    Args:
        errors: Mutable error collection.
        records: Candidate record list.
        key: Required unique key.
        label: Location label for diagnostics.

    Returns:
        Index of valid unique records.
    """
    indexed: dict[str, dict[str, Any]] = {}
    for index, item in enumerate(records):
        record = require_dict(errors, item, f"{label}[{index}]")
        value = record.get(key)
        if not isinstance(value, str) or not value:
            add(errors, "missing-key", f"{label}:{key}")
        elif value in indexed:
            add(errors, "duplicate-key", f"{label}:{value}")
        else:
            indexed[value] = record
    return indexed


def build_frozen_facts(root: Path, batch: str, errors: list[str]) -> dict[str, Any] | None:
    """Derives selected-batch truth from Phase 0, scaffold, caller, and provenance sources.

    Args:
        root: Repository root supplied by the caller.
        batch: Validated batch identifier.
        errors: Mutable error collection.

    Returns:
        Frozen selected-batch facts, or None when a required source cannot be trusted.
    """
    phase0_path = TRACK / "phase0-input-freeze-v1.json"
    scaffold_path = TRACK / "phase4-join-scaffold-v1.json"
    caller_path = relative_batch_path(batch, "caller-inventory.json")
    provenance_path = relative_batch_path(batch, "provenance-audit.json")
    phase0 = safe_load(root, phase0_path, errors, "phase0")
    scaffold = safe_load(root, scaffold_path, errors, "scaffold")
    caller_inventory = safe_load(root, caller_path, errors, "caller")
    provenance_audit = safe_load(root, provenance_path, errors, "provenance")
    if not all(isinstance(value, dict) for value in (phase0, scaffold, caller_inventory, provenance_audit)):
        return None

    phase0_batches = require_list(errors, phase0.get("batch_strategy", {}).get("batches"), "phase0.batch_strategy.batches")
    matching_batches = [item for item in phase0_batches if isinstance(item, dict) and item.get("batch_id") == batch]
    if len(matching_batches) != 1:
        add(errors, "frozen-source-malformed", f"phase0 selected batch:{batch}")
        return None
    batch_config = matching_batches[0]
    path_count = batch_config.get("path_count")
    group_count = batch_config.get("group_count")
    if not isinstance(path_count, int) or not isinstance(group_count, int):
        add(errors, "frozen-source-malformed", f"phase0 counts:{batch}")
        return None

    scaffold_records = require_list(errors, scaffold.get("candidate_records"), "scaffold.candidate_records")
    selected_records = [item for item in scaffold_records if isinstance(item, dict) and item.get("batch_id") == batch]
    frozen_by_path = unique_index(errors, selected_records, "canonical_path", "scaffold.candidate_records")
    group_ids = {record.get("identical_hash_group") for record in frozen_by_path.values()}
    if len(frozen_by_path) != path_count or len(group_ids) != group_count or None in group_ids:
        add(errors, "frozen-source-drift", f"phase0/scaffold:{batch}")

    callers = unique_index(errors, require_list(errors, caller_inventory.get("records"), "caller.records"), "canonical_path", "caller.records")
    provenance = unique_index(errors, require_list(errors, provenance_audit.get("records"), "provenance.records"), "canonical_path", "provenance.records")
    if set(callers) != set(frozen_by_path) or set(provenance) != set(frozen_by_path):
        add(errors, "frozen-source-drift", f"caller/provenance coverage:{batch}")
    caller_count = 0
    for path, caller in callers.items():
        current_callers = caller.get("current_callers")
        if not isinstance(current_callers, list):
            add(errors, "frozen-source-malformed", f"caller.current_callers:{path}")
        else:
            caller_count += len(current_callers)

    scaffold_counts = require_dict(errors, scaffold.get("counts"), "scaffold.counts")
    catalog_count = scaffold_counts.get("separate_catalog_locator_records")
    additive_claim = scaffold_counts.get("additive_92_path_claim")
    if not isinstance(catalog_count, int) or not isinstance(additive_claim, bool):
        add(errors, "frozen-source-malformed", "scaffold catalog grain")
    accepted_links = sum(len(require_list(errors, record.get("accepted_usage_ids"), f"scaffold.accepted_usage_ids:{path}")) for path, record in frozen_by_path.items())

    binding_expectations: dict[str, dict[str, str]] = {}
    for binding_key, binding_path in input_binding_paths(batch).items():
        try:
            binding_expectations[binding_key] = {"path": str(binding_path), "sha256": digest(root / binding_path)}
        except OSError:
            add(errors, "required-document-missing", f"binding:{binding_path}")
    if set(binding_expectations) != INPUT_BINDING_KEYS:
        return None

    return {
        "phase0_path": str(phase0_path),
        "phase0_sha256": digest(root / phase0_path),
        "scaffold_path": str(scaffold_path),
        "scaffold_sha256": digest(root / scaffold_path),
        "caller_path": str(caller_path),
        "caller_sha256": digest(root / caller_path),
        "provenance_path": str(provenance_path),
        "provenance_sha256": digest(root / provenance_path),
        "path_count": path_count,
        "group_count": group_count,
        "caller_count": caller_count,
        "accepted_links": accepted_links,
        "catalog_count": catalog_count,
        "additive_claim": additive_claim,
        "frozen_by_path": frozen_by_path,
        "callers_by_path": callers,
        "provenance_by_path": provenance,
        "binding_expectations": binding_expectations,
    }


def validate_input_binding(errors: list[str], binding: Any, facts: dict[str, Any]) -> None:
    """Requires every producer input binding to name the current exact source bytes.

    Args:
        errors: Mutable error collection.
        binding: Producer input binding object.
        facts: Frozen selected-batch facts.
    """
    binding_dict = require_dict(errors, binding, "joins.input_binding")
    exact_keys(errors, binding_dict, INPUT_BINDING_KEYS, "joins.input_binding")
    for key, expected in facts["binding_expectations"].items():
        item = binding_dict.get(key)
        exact_keys(errors, item, BINDING_ITEM_KEYS, f"joins.input_binding.{key}")
        if item != expected:
            add(errors, "input-binding-current-hash", key)


def validate_facets(errors: list[str], facets: Any, label: str) -> None:
    """Requires the full eight-facet responsive-assessment schema.

    Args:
        errors: Mutable error collection.
        facets: Candidate facets object.
        label: Location label for diagnostics.
    """
    facet_object = require_dict(errors, facets, f"{label}.facets")
    exact_keys(errors, facet_object, FACET_KEYS, f"{label}.facets")
    for name, shape in FACET_SHAPES.items():
        exact_keys(errors, facet_object.get(name), shape, f"{label}.facets.{name}")


def validate_link(errors: list[str], link: Any, record_path: str, wrapper_requirement: Any) -> tuple[str | None, bool]:
    """Checks one usage link and returns its usage identifier and scene classification.

    Args:
        errors: Mutable error collection.
        link: Candidate usage link.
        record_path: Owning candidate path for diagnostics.
        wrapper_requirement: Corresponding mirrored semantic requirement.

    Returns:
        Usage identifier and whether this link is a scene usage.
    """
    link_object = require_dict(errors, link, f"link:{record_path}")
    exact_keys(errors, link_object, LINK_KEYS, f"link:{record_path}")
    source = link_object.get("source")
    exact_keys(errors, source, SOURCE_KEYS, f"link.source:{record_path}")
    usage = require_dict(errors, link_object.get("normalized_usage"), f"link.usage:{record_path}")
    exact_usage_keys(errors, usage, f"link.usage:{record_path}")
    requirement = link_object.get("semantic_replacement_requirement")
    exact_keys(errors, requirement, REQUIREMENT_KEYS, f"link.requirement:{record_path}")
    if wrapper_requirement != requirement:
        add(errors, "mirror-mismatch", record_path)
    requirement_object = require_dict(errors, requirement, f"link.requirement:{record_path}")
    if (
        requirement_object.get("usage_id") != link_object.get("usage_id")
        or requirement_object.get("source") != source
        or requirement_object.get("accepted_usage_fields") != source_fields(usage)
    ):
        add(errors, "requirement-source-binding", record_path)
    cells = require_list(errors, link_object.get("responsive_assessment_cells"), f"link.cells:{record_path}")
    is_scene = usage.get("surface_kind") == "scene"
    if is_scene:
        expected_cells = {
            ("compact", "cute_chibi_v1"), ("compact", "heroic_stylized_v1"),
            ("wide", "cute_chibi_v1"), ("wide", "heroic_stylized_v1"),
        }
        actual_cells = {
            (cell.get("viewport"), cell.get("theme"))
            for cell in cells if isinstance(cell, dict)
        }
        if len(cells) != 4 or actual_cells != expected_cells:
            add(errors, "responsive-cell-coverage", record_path)
        for cell in cells:
            cell_object = require_dict(errors, cell, f"cell:{record_path}")
            exact_keys(errors, cell_object, CELL_KEYS, f"cell:{record_path}")
            validate_facets(errors, cell_object.get("facets"), f"cell:{record_path}")
    elif cells:
        add(errors, "non-scene-responsive-cell-leakage", record_path)
    return link_object.get("usage_id") if isinstance(link_object.get("usage_id"), str) else None, is_scene


def validate_record(errors: list[str], record: Any, facts: dict[str, Any]) -> tuple[str | None, list[str], int]:
    """Checks one producer path record against its frozen selected-batch owner.

    Args:
        errors: Mutable error collection.
        record: Candidate producer record.
        facts: Frozen selected-batch facts.

    Returns:
        Candidate path, accepted usage identifiers, and scene-link count.
    """
    record_object = require_dict(errors, record, "record")
    path = record_object.get("canonical_path")
    path_label = path if isinstance(path, str) else "unknown"
    exact_keys(errors, record_object, RECORD_KEYS, f"record:{path_label}")
    frozen = facts["frozen_by_path"].get(path)
    caller = facts["callers_by_path"].get(path)
    provenance = facts["provenance_by_path"].get(path)
    if frozen is None or caller is None or provenance is None:
        add(errors, "frozen-coverage", f"record:{path_label}")
        return None, [], 0
    for field in FROZEN_RECORD_FIELDS:
        if record_object.get(field) != frozen.get(field):
            add(errors, "frozen-scaffold-drift", f"{path_label}:{field}")
    for field in CALLER_RECORD_FIELDS:
        if record_object.get(field) != caller.get(field):
            add(errors, "caller-source-drift", f"{path_label}:{field}")
    if record_object.get("provenance") != {field: provenance.get(field) for field in PROVENANCE_FIELDS}:
        add(errors, "provenance-source-drift", path_label)
    if record_object.get("join_status") != frozen.get("join_status"):
        add(errors, "join-status-scaffold-mismatch", path_label)

    links = require_list(errors, record_object.get("usage_links"), f"record.links:{path_label}")
    wrapper = require_dict(errors, record_object.get("semantic_replacement_requirements"), f"record.requirements:{path_label}")
    exact_keys(errors, wrapper, {"status", "requirements"}, f"record.requirements:{path_label}")
    mirrored_requirements = require_list(errors, wrapper.get("requirements"), f"record.requirements.list:{path_label}")
    expected_status = "source_bound_pending_T9" if links else "blocked_unknown"
    if wrapper.get("status") != expected_status:
        add(errors, "wrapper-status", path_label)
    if len(mirrored_requirements) != len(links):
        add(errors, "mirror-mismatch", path_label)

    usage_ids: list[str] = []
    scene_links = 0
    for index, link in enumerate(links):
        mirror = mirrored_requirements[index] if index < len(mirrored_requirements) else None
        usage_id, is_scene = validate_link(errors, link, path_label, mirror)
        if usage_id is not None:
            usage_ids.append(usage_id)
        if is_scene:
            scene_links += 1
    if mirrored_requirements != [
        require_dict(errors, link, f"link:{path_label}").get("semantic_replacement_requirement")
        for link in links
    ]:
        add(errors, "mirror-mismatch", path_label)
    for requirement in mirrored_requirements:
        exact_keys(errors, requirement, REQUIREMENT_KEYS, f"record.requirements.item:{path_label}")
    return path if isinstance(path, str) else None, usage_ids, scene_links


def validate_slices(errors: list[str], slices: Any, joined_paths: set[str], usage_ids: set[str]) -> None:
    """Checks that review slices exactly cover joined paths and usage identifiers.

    Args:
        errors: Mutable error collection.
        slices: Candidate review-slice list.
        joined_paths: Paths with exact accepted links.
        usage_ids: Usage identifiers represented by those links.
    """
    slice_list = require_list(errors, slices, "joins.review_slices")
    listed_paths: list[str] = []
    listed_usage_ids: list[str] = []
    for index, item in enumerate(slice_list):
        slice_object = require_dict(errors, item, f"review_slices[{index}]")
        exact_keys(errors, slice_object, SLICE_KEYS, f"review_slices[{index}]")
        games = require_list(errors, slice_object.get("games"), f"review_slices[{index}].games")
        candidate_paths = require_list(errors, slice_object.get("candidate_paths"), f"review_slices[{index}].candidate_paths")
        accepted_usage_ids = require_list(errors, slice_object.get("accepted_usage_ids"), f"review_slices[{index}].accepted_usage_ids")
        if slice_object.get("game_count") != len(games) or len(games) > 3 or len(set(games)) != len(games):
            add(errors, "slice-shape", f"review_slices[{index}]")
        listed_paths.extend(path for path in candidate_paths if isinstance(path, str))
        listed_usage_ids.extend(usage_id for usage_id in accepted_usage_ids if isinstance(usage_id, str))
    if set(listed_paths) != joined_paths or len(listed_paths) != len(set(listed_paths)):
        add(errors, "slice-unique-covered", "candidate paths")
    if set(listed_usage_ids) != usage_ids or len(listed_usage_ids) != len(set(listed_usage_ids)):
        add(errors, "slice-unique-covered", "usage ids")


def disposition_counts(records: list[Any]) -> dict[str, int]:
    """Counts the three permitted path-specific disposition values.

    Args:
        records: Producer path records.

    Returns:
        Count mapping for reject, replace, and unknown dispositions.
    """
    values = Counter(
        require_dict([], record, "record").get("disposition", {}).get("value")
        for record in records
        if isinstance(record, dict)
    )
    return {value: values.get(value, 0) for value in ("reject", "replace", "unknown")}


def validate_joins(errors: list[str], joins: Any, facts: dict[str, Any], batch: str) -> tuple[list[Any], set[str], int]:
    """Validates the complete v2 path-usage joins document.

    Args:
        errors: Mutable error collection.
        joins: Producer joins document.
        facts: Frozen selected-batch facts.
        batch: Validated batch identifier.

    Returns:
        Producer records, unique usage identifiers, and scene-link count.
    """
    joins_object = require_dict(errors, joins, "joins")
    exact_keys(errors, joins_object, JOINS_KEYS, "joins")
    if (
        joins_object.get("schema_version") != "apk-asset-forensics.phase4-path-usage-joins.v2"
        or joins_object.get("track_id") != "apk_existing_asset_candidate_audit_20260712"
        or joins_object.get("batch_id") != batch
        or joins_object.get("role") != "requirements-mapper"
    ):
        add(errors, "v2-envelope", "joins")
    scope = require_dict(errors, joins_object.get("scope"), "joins.scope")
    exact_keys(errors, scope, SCOPE_KEYS, "joins.scope")
    if (
        scope.get("batch_only") != batch
        or scope.get("catalog_locator_records_embedded") is not False
        or scope.get("catalog_locator_records_non_additive_count") != facts["catalog_count"]
    ):
        add(errors, "catalog-non-additivity", "joins.scope")
    validate_input_binding(errors, joins_object.get("input_binding"), facts)

    counts = require_dict(errors, joins_object.get("counts"), "joins.counts")
    exact_keys(errors, counts, COUNTS_KEYS, "joins.counts")
    records = require_list(errors, joins_object.get("records"), "joins.records")
    actual_paths: set[str] = set()
    usage_ids: set[str] = set()
    joined_paths: set[str] = set()
    scene_links = 0
    for record in records:
        path, record_usage_ids, record_scene_links = validate_record(errors, record, facts)
        if path is not None:
            if path in actual_paths:
                add(errors, "duplicate-key", f"joins.records:{path}")
            actual_paths.add(path)
            if record_usage_ids:
                joined_paths.add(path)
        usage_ids.update(record_usage_ids)
        scene_links += record_scene_links
    if actual_paths != set(facts["frozen_by_path"]) or len(records) != facts["path_count"]:
        add(errors, "frozen-coverage", "candidate records")

    expected_counts = {
        "candidate_paths": facts["path_count"],
        "identical_hash_groups": facts["group_count"],
        "caller_locators": facts["caller_count"],
        "accepted_path_usage_links": facts["accepted_links"],
        "unique_scene_usage_records": len({
            usage_id for record in records if isinstance(record, dict)
            for link in require_list([], record.get("usage_links"), "record.links")
            if isinstance(link, dict)
            and require_dict([], link.get("normalized_usage"), "link.usage").get("surface_kind") == "scene"
            for usage_id in [link.get("usage_id")] if isinstance(usage_id, str)
        }),
        "responsive_assessment_cells": scene_links * 4,
        "dispositions": disposition_counts(records),
        "separate_catalog_locator_records": facts["catalog_count"],
        "additive_92_path_claim": facts["additive_claim"],
    }
    if {key: counts.get(key) for key in COUNTS_KEYS} != expected_counts:
        add(errors, "factual-envelope-drift", "joins.counts")
    validate_slices(errors, joins_object.get("review_slices"), joined_paths, usage_ids)
    return records, usage_ids, scene_links


def validate_rollup(errors: list[str], rollup: Any, records: list[Any], facts: dict[str, Any], batch: str, joins_path: Path, joins_sha256: str) -> None:
    """Reconciles the v2 group rollup to path-specific producer records.

    Args:
        errors: Mutable error collection.
        rollup: Producer rollup document.
        records: Producer path records.
        facts: Frozen selected-batch facts.
        batch: Validated batch identifier.
        joins_path: Repository-relative selected joins path.
        joins_sha256: Current selected joins digest.
    """
    rollup_object = require_dict(errors, rollup, "rollup")
    exact_keys(errors, rollup_object, ROLLUP_KEYS, "rollup")
    if (
        rollup_object.get("schema_version") != "apk-asset-forensics.phase4-group-rollup.v2"
        or rollup_object.get("track_id") != "apk_existing_asset_candidate_audit_20260712"
        or rollup_object.get("batch_id") != batch
        or rollup_object.get("role") != "requirements-mapper"
    ):
        add(errors, "v2-envelope", "rollup")
    input_joins = rollup_object.get("input_path_usage_joins")
    exact_keys(errors, input_joins, ROLLUP_INPUT_KEYS, "rollup.input_path_usage_joins")
    if input_joins != {"path": str(joins_path), "sha256": joins_sha256}:
        add(errors, "rollup-joins-sha-binding", batch)

    grouped: dict[str, list[dict[str, Any]]] = {}
    for record in records:
        record_object = require_dict(errors, record, "rollup record")
        group_id = record_object.get("identical_hash_group")
        if not isinstance(group_id, str) or not group_id:
            add(errors, "missing-key", "rollup record identical_hash_group")
            continue
        grouped.setdefault(group_id, []).append(record_object)
    groups = require_list(errors, rollup_object.get("groups"), "rollup.groups")
    groups_by_id = unique_index(errors, groups, "identical_hash_group", "rollup.groups")
    if set(groups_by_id) != set(grouped) or len(groups) != facts["group_count"]:
        add(errors, "frozen-coverage", "rollup groups")

    mixed_groups = 0
    for group_id, members in grouped.items():
        group = groups_by_id.get(group_id)
        if group is None:
            continue
        exact_keys(errors, group, GROUP_KEYS, f"rollup.group:{group_id}")
        group_counts = require_dict(errors, group.get("counts"), f"rollup.group.counts:{group_id}")
        exact_keys(errors, group_counts, GROUP_COUNT_KEYS, f"rollup.group.counts:{group_id}")
        member_paths = require_list(errors, group.get("member_paths"), f"rollup.group.member_paths:{group_id}")
        expected_paths = {member.get("canonical_path") for member in members}
        actual_member_paths: list[str] = []
        for item in member_paths:
            member_path = require_dict(errors, item, f"rollup.group.member_path:{group_id}")
            exact_keys(errors, member_path, MEMBER_PATH_KEYS, f"rollup.group.member_path:{group_id}")
            path = member_path.get("canonical_path")
            if isinstance(path, str):
                actual_member_paths.append(path)
        if set(actual_member_paths) != expected_paths or len(actual_member_paths) != len(expected_paths):
            add(errors, "duplicate-path-specificity", group_id)
        expected_dispositions = {
            member.get("canonical_path"): {
                "canonical_path": member.get("canonical_path"),
                "value": require_dict(errors, member.get("disposition"), f"record.disposition:{group_id}").get("value"),
                "policy_priority": require_dict(errors, member.get("disposition"), f"record.disposition:{group_id}").get("policy_priority"),
            }
            for member in members
        }
        group_dispositions = require_list(errors, group.get("path_specific_dispositions"), f"rollup.group.dispositions:{group_id}")
        actual_dispositions: dict[str, dict[str, Any]] = {}
        for disposition in group_dispositions:
            disposition_object = require_dict(errors, disposition, f"rollup.group.disposition:{group_id}")
            exact_keys(errors, disposition_object, PATH_DISPOSITION_KEYS, f"rollup.group.disposition:{group_id}")
            path = disposition_object.get("canonical_path")
            if isinstance(path, str) and path not in actual_dispositions:
                actual_dispositions[path] = disposition_object
            else:
                add(errors, "duplicate-key", f"rollup.group.disposition:{group_id}")
        if actual_dispositions != expected_dispositions:
            add(errors, "group-rollup-exactness", group_id)
        caller_count = sum(len(require_list(errors, member.get("caller_locators"), f"record.callers:{group_id}")) for member in members)
        link_count = sum(len(require_list(errors, member.get("accepted_usage_ids"), f"record.links:{group_id}")) for member in members)
        expected_disposition_counts = {
            value: sum(1 for item in expected_dispositions.values() if item["value"] == value)
            for value in GROUP_DISPOSITION_COUNT_KEYS
        }
        disposition_counts_object = group_counts.get("disposition_paths")
        exact_keys(errors, disposition_counts_object, GROUP_DISPOSITION_COUNT_KEYS, f"rollup.group.disposition_counts:{group_id}")
        expected_counts = {
            "paths": len(members),
            "caller_locators": caller_count,
            "accepted_path_usage_links": link_count,
            "disposition_paths": expected_disposition_counts,
        }
        if group_counts != expected_counts:
            add(errors, "group-rollup-exactness", group_id)
        if len({item["value"] for item in expected_dispositions.values()}) > 1:
            mixed_groups += 1

    rollup_counts = require_dict(errors, rollup_object.get("counts"), "rollup.counts")
    exact_keys(errors, rollup_counts, ROLLUP_COUNT_KEYS, "rollup.counts")
    expected_rollup_counts = {
        "candidate_paths": facts["path_count"],
        "identical_hash_groups": facts["group_count"],
        "caller_locators": facts["caller_count"],
        "accepted_path_usage_links": facts["accepted_links"],
        "dispositions": disposition_counts(records),
        "groups_with_mixed_path_specific_dispositions": mixed_groups,
    }
    if rollup_counts != expected_rollup_counts:
        add(errors, "factual-envelope-drift", "rollup.counts")


def validate_mapper_receipt(errors: list[str], mapper: Any, facts: dict[str, Any], batch: str, joins_path: Path, joins_sha256: str, rollup_path: Path, rollup_sha256: str) -> None:
    """Checks the mapper receipt's exact current producer-output hash bindings.

    Args:
        errors: Mutable error collection.
        mapper: Requirements-mapper receipt.
        facts: Frozen selected-batch facts.
        batch: Validated batch identifier.
        joins_path: Repository-relative selected joins path.
        joins_sha256: Current selected joins digest.
        rollup_path: Repository-relative selected rollup path.
        rollup_sha256: Current selected rollup digest.
    """
    mapper_object = require_dict(errors, mapper, "mapper")
    exact_keys(errors, mapper_object, MAPPER_RECEIPT_KEYS, "mapper")
    if (
        mapper_object.get("track_id") != "apk_existing_asset_candidate_audit_20260712"
        or mapper_object.get("phase") != "phase4"
        or mapper_object.get("batch_id") != batch
        or mapper_object.get("role") != "requirements-mapper"
    ):
        add(errors, "mapper-receipt-envelope", batch)
    output_hashes = require_dict(errors, mapper_object.get("output_file_hashes"), "mapper.output_file_hashes")
    expected_output_hashes = {str(joins_path): joins_sha256, str(rollup_path): rollup_sha256}
    if output_hashes != expected_output_hashes:
        add(errors, "mapper-receipt-current-output-hash", batch)
    input_hashes = require_dict(errors, mapper_object.get("input_file_hashes"), "mapper.input_file_hashes")
    expected_input_hashes = {
        facts["phase0_path"]: facts["phase0_sha256"],
        facts["scaffold_path"]: facts["scaffold_sha256"],
        facts["caller_path"]: facts["caller_sha256"],
        facts["provenance_path"]: facts["provenance_sha256"],
    }
    if any(input_hashes.get(path) != expected for path, expected in expected_input_hashes.items()):
        add(errors, "mapper-receipt-preserved-binding", batch)
    if mapper_object.get("final_status") != STANDARD_MAPPER_FINAL_STATUS:
        add(errors, "mapper-receipt-false-claim", "final_status")


def validate(root: Path, batch: str, joins: Any, rollup: Any, mapper: Any, joins_sha256: str, rollup_sha256: str) -> list[str]:
    """Validates selected-batch v2 structures and derived frozen truth.

    Args:
        root: Repository root supplied by the caller.
        batch: Validated batch identifier.
        joins: Producer joins document.
        rollup: Producer rollup document.
        mapper: Requirements-mapper receipt.
        joins_sha256: Digest of the current selected joins bytes.
        rollup_sha256: Digest of the current selected rollup bytes.

    Returns:
        Stable contract-error strings; an empty list represents a pass.
    """
    errors: list[str] = []
    facts = build_frozen_facts(root, batch, errors)
    if facts is None:
        return errors or ["frozen-source-malformed: unavailable"]
    records, _, _ = validate_joins(errors, joins, facts, batch)
    joins_path = relative_batch_path(batch, "phase4-path-usage-joins.json")
    rollup_path = relative_batch_path(batch, "phase4-group-rollup.json")
    validate_rollup(errors, rollup, records, facts, batch, joins_path, joins_sha256)
    validate_mapper_receipt(errors, mapper, facts, batch, joins_path, joins_sha256, rollup_path, rollup_sha256)
    return errors


def safe_validate(root: Path, batch: str, joins: Any, rollup: Any, mapper: Any, joins_sha256: str, rollup_sha256: str) -> list[str]:
    """Converts malformed values and unexpected implementation failures into red results.

    Args:
        root: Repository root supplied by the caller.
        batch: Validated batch identifier.
        joins: Producer joins document.
        rollup: Producer rollup document.
        mapper: Requirements-mapper receipt.
        joins_sha256: Digest of current selected joins bytes.
        rollup_sha256: Digest of current selected rollup bytes.

    Returns:
        Stable contract-error strings; never raises for malformed documents.
    """
    try:
        return validate(root, batch, joins, rollup, mapper, joins_sha256, rollup_sha256)
    except (AttributeError, IndexError, KeyError, OSError, TypeError, ValueError):
        return ["validation-exception: malformed-document"]


def select_joined_record(joins: dict[str, Any]) -> tuple[dict[str, Any], int, dict[str, Any]]:
    """Selects a deterministic joined record and its first usage link for a mutation.

    Args:
        joins: Parsed producer joins document.

    Returns:
        The joined record, link index, and selected link.

    Raises:
        ValueError: When no exact accepted usage link exists.
    """
    records = joins.get("records")
    if not isinstance(records, list):
        raise ValueError("fixture-precondition-not-met: records unavailable")
    joined = sorted(
        (record for record in records if isinstance(record, dict) and isinstance(record.get("usage_links"), list) and record["usage_links"]),
        key=lambda record: str(record.get("canonical_path")),
    )
    if not joined:
        raise ValueError("fixture-precondition-not-met: no exact accepted join")
    record = joined[0]
    link = record["usage_links"][0]
    if not isinstance(link, dict):
        raise ValueError("fixture-precondition-not-met: selected link malformed")
    return record, 0, link


def apply_fixture(joins: dict[str, Any], rollup: dict[str, Any], mapper: dict[str, Any], operation: str) -> None:
    """Applies one focused in-memory structural counterexample.

    Args:
        joins: Mutable copy of producer joins.
        rollup: Mutable copy of producer rollup.
        mapper: Mutable copy of mapper receipt.
        operation: Declared fixture mutation name.

    Raises:
        ValueError: When a fixture cannot be exercised against the selected batch.
    """
    record, link_index, link = select_joined_record(joins)
    requirement = link.get("semantic_replacement_requirement")
    wrapper = record.get("semantic_replacement_requirements")
    if not isinstance(requirement, dict) or not isinstance(wrapper, dict) or not isinstance(wrapper.get("requirements"), list):
        raise ValueError("fixture-precondition-not-met: semantic requirements unavailable")
    if operation == "missing_join_status":
        del record["join_status"]
    elif operation == "wrong_join_status":
        record["join_status"] = "fabricated"
    elif operation == "extra_link_requirement_key":
        requirement["forbidden"] = True
    elif operation == "extra_mirror_key":
        wrapper["requirements"][link_index]["forbidden"] = True
    elif operation == "mirror_mismatch":
        wrapper["requirements"] = []
    elif operation == "missing_rollup_sha":
        input_joins = rollup.get("input_path_usage_joins")
        if not isinstance(input_joins, dict):
            raise ValueError("fixture-precondition-not-met: rollup input binding unavailable")
        del input_joins["sha256"]
    elif operation == "wrong_rollup_sha":
        rollup["input_path_usage_joins"]["sha256"] = "0" * 64
    elif operation == "factual_drift":
        joins["counts"]["candidate_paths"] = joins["counts"].get("candidate_paths", 0) + 1
    elif operation == "extra_schema_key":
        joins["forbidden"] = True
    elif operation == "stale_mapper_hash":
        joins_path = str(relative_batch_path(str(joins.get("batch_id")), "phase4-path-usage-joins.json"))
        mapper["output_file_hashes"][joins_path] = "0" * 64
    elif operation == "false_receipt_claim":
        mapper["final_status"] = "root_accepted"
    elif operation == "non_scene_cells":
        usage = link.get("normalized_usage")
        if not isinstance(usage, dict) or link_index >= len(wrapper["requirements"]):
            raise ValueError("fixture-precondition-not-met: usage mirror unavailable")
        usage["surface_kind"] = "catalog"
        requirement["accepted_usage_fields"]["surface_kind"] = "catalog"
        wrapper["requirements"][link_index]["accepted_usage_fields"]["surface_kind"] = "catalog"
    elif operation == "member_path_scalar":
        groups = rollup.get("groups")
        if not isinstance(groups, list) or not groups or not isinstance(groups[0], dict):
            raise ValueError("fixture-precondition-not-met: rollup group unavailable")
        groups[0]["member_paths"][0] = "fabricated-path"
    elif operation == "group_disposition_count_scalar":
        groups = rollup.get("groups")
        if not isinstance(groups, list) or not groups or not isinstance(groups[0], dict):
            raise ValueError("fixture-precondition-not-met: rollup group unavailable")
        groups[0]["counts"]["disposition_paths"] = 1
    else:
        raise ValueError(f"unknown fixture operation: {operation}")


def run_value_verifier(root: Path, batch: str) -> tuple[dict[str, Any] | None, bytes, int]:
    """Invokes the unchanged value verifier exactly once for the selected batch.

    Args:
        root: Repository root supplied by the caller.
        batch: Validated batch identifier.

    Returns:
        Parsed value-verifier report when available, raw standard output, and process exit code.
    """
    result = subprocess.run(
        [sys.executable, str(root / VALUE_VERIFIER), "--root", str(root), "--batch", batch, "--json"],
        check=False,
        capture_output=True,
    )
    raw_output = result.stdout
    try:
        parsed = json.loads(raw_output.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        parsed = None
    return parsed if isinstance(parsed, dict) else None, raw_output, result.returncode


def fixture_hashes(root: Path, errors: list[str]) -> dict[str, str]:
    """Loads and hash-binds the complete generic structural fixture suite.

    Args:
        root: Repository root supplied by the caller.
        errors: Mutable error collection.

    Returns:
        Repository-relative fixture path to SHA-256 mapping.
    """
    hashes: dict[str, str] = {}
    directory = root / FIXTURE_DIRECTORY
    try:
        paths = sorted(directory.glob("*.json"))
    except OSError:
        paths = []
    if len(paths) != len(FIXTURE_OPERATIONS) or set(str(path.relative_to(root)) for path in paths) != set(EXPECTED_FIXTURE_HASHES):
        add(errors, "fixture-set-drift", "phase4-v2-batch-schema")
    seen_operations: set[str] = set()
    for path in paths:
        relative = str(path.relative_to(root))
        try:
            hashes[relative] = digest(path)
            fixture = load(path)
        except (OSError, UnicodeDecodeError, json.JSONDecodeError):
            add(errors, "fixture-byte-drift", relative)
            continue
        if hashes[relative] != EXPECTED_FIXTURE_HASHES.get(relative):
            add(errors, "fixture-byte-drift", relative)
        exact_keys(errors, fixture, {"operation", "expected_error_code"}, f"fixture:{path.name}")
        operation = fixture.get("operation") if isinstance(fixture, dict) else None
        if not isinstance(operation, str) or operation not in FIXTURE_OPERATIONS or operation in seen_operations:
            add(errors, "fixture-set-drift", relative)
        elif isinstance(operation, str):
            seen_operations.add(operation)
    if seen_operations != FIXTURE_OPERATIONS:
        add(errors, "fixture-set-drift", "operations")
    return hashes


def resource_usage(structural_cases: int, value_report: dict[str, Any] | None) -> tuple[dict[str, Any], bool]:
    """Combines isolated and nested verifier measurements against frozen ceilings.

    Args:
        structural_cases: Production plus fixture structural cases.
        value_report: Parsed unchanged value-verifier report, if available.

    Returns:
        Combined measured-usage payload and whether it is within all ceilings.
    """
    value_usage = value_report.get("measured_resource_usage") if isinstance(value_report, dict) else None
    if not isinstance(value_usage, dict) or not all(isinstance(value_usage.get(key), int) for key in ("test_cases", "command_invocations", "bytes_read")):
        return {
            "test_cases": structural_cases,
            "structural_test_cases": structural_cases,
            "value_test_cases": None,
            "value_verifier_invocations": 1,
            "command_invocations": 1,
            "bytes_read": READ_BYTES,
            "within_ceiling": False,
            "ceilings": {"test_cases": 160, "command_invocations": 80, "bytes_read": 134217728},
            "measurement_basis": "Combined measurement is unavailable because the unchanged value verifier did not emit a parseable usage report.",
        }, False
    test_cases = structural_cases + value_usage["test_cases"]
    command_invocations = 1 + value_usage["command_invocations"]
    bytes_read = READ_BYTES + value_usage["bytes_read"]
    within_ceiling = test_cases <= 160 and command_invocations <= 80 and bytes_read <= 134217728
    return {
        "test_cases": test_cases,
        "structural_test_cases": structural_cases,
        "value_test_cases": value_usage["test_cases"],
        "value_verifier_invocations": 1,
        "command_invocations": command_invocations,
        "bytes_read": bytes_read,
        "within_ceiling": within_ceiling,
        "ceilings": {"test_cases": 160, "command_invocations": 80, "bytes_read": 134217728},
        "measurement_basis": "Exact bytes read or digested by this verifier plus the unchanged value verifier's separately reported exact bytes; command and test counts include its one nested invocation.",
    }, within_ceiling


def main() -> int:
    """Runs generic v2 schema checks and optional report publication for one future batch.

    Returns:
        Zero only when structural, fixture, unchanged-value, and resource checks all pass.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--batch", required=True, help="Future frozen batch identifier (AF-05 through AF-12).")
    parser.add_argument("--write-reports", action="store_true")
    args = parser.parse_args()
    root = args.root.resolve()
    batch = args.batch
    if not SUPPORTED_BATCH.fullmatch(batch):
        print(json.dumps({"production": {"passed": False, "errors": ["unsupported-batch: AF-05 through AF-12 only"]}}, indent=2, sort_keys=True))
        return 1

    errors: list[str] = []
    joins_path = relative_batch_path(batch, "phase4-path-usage-joins.json")
    rollup_path = relative_batch_path(batch, "phase4-group-rollup.json")
    mapper_path = TRACK / "role-receipts" / batch / "requirements-mapper.json"
    joins = safe_load(root, joins_path, errors, "joins")
    rollup = safe_load(root, rollup_path, errors, "rollup")
    mapper = safe_load(root, mapper_path, errors, "mapper")
    try:
        joins_sha256 = digest(root / joins_path)
    except OSError:
        joins_sha256 = ""
    try:
        rollup_sha256 = digest(root / rollup_path)
    except OSError:
        rollup_sha256 = ""
    if joins is not None and rollup is not None and mapper is not None:
        errors.extend(safe_validate(root, batch, joins, rollup, mapper, joins_sha256, rollup_sha256))

    fixture_hash_map = fixture_hashes(root, errors)
    fixture_results = []
    for fixture_path in sorted((root / FIXTURE_DIRECTORY).glob("*.json")):
        fixture = safe_load(root, fixture_path.relative_to(root), errors, f"fixture:{fixture_path.name}")
        fixture_object = require_dict(errors, fixture, f"fixture:{fixture_path.name}")
        altered_joins = copy.deepcopy(joins) if isinstance(joins, dict) else {}
        altered_rollup = copy.deepcopy(rollup) if isinstance(rollup, dict) else {}
        altered_mapper = copy.deepcopy(mapper) if isinstance(mapper, dict) else {}
        try:
            apply_fixture(altered_joins, altered_rollup, altered_mapper, fixture_object.get("operation"))
            fixture_errors = safe_validate(root, batch, altered_joins, altered_rollup, altered_mapper, joins_sha256, rollup_sha256)
        except (AttributeError, IndexError, KeyError, TypeError, ValueError):
            fixture_errors = ["fixture-harness-error: malformed-precondition"]
        codes = sorted({error.split(":", 1)[0] for error in fixture_errors})
        expected_code = fixture_object.get("expected_error_code")
        fixture_results.append({
            "fixture": str(fixture_path.relative_to(root)),
            "fixture_sha256": fixture_hash_map.get(str(fixture_path.relative_to(root))),
            "operation": fixture_object.get("operation"),
            "expected_error_code": expected_code,
            "error_codes": codes,
            "rejected": isinstance(expected_code, str) and expected_code in codes,
        })

    value_report, value_bytes, value_returncode = run_value_verifier(root, batch)
    if value_report is None or value_returncode != 0:
        add(errors, "value-verifier-failed", batch)
    usage, within_ceiling = resource_usage(1 + len(fixture_results), value_report)
    verifier_path = TRACK / "phase4_v2_batch_schema_contract_test.py"
    payload = {
        "schema_version": "apk-asset-forensics.phase4-v2-batch-schema-contract-test-report.v1",
        "track_id": "apk_existing_asset_candidate_audit_20260712",
        "batch_id": batch,
        "role": "truth-test-author",
        "verifier": str(verifier_path),
        "verifier_sha256": digest(root / verifier_path),
        "value_verifier": str(VALUE_VERIFIER),
        "value_verifier_sha256": digest(root / VALUE_VERIFIER),
        "fixture_hashes": fixture_hash_map,
        "production": {"passed": not errors, "errors": errors},
        "counterexamples": fixture_results,
        "counterexample_count": len(fixture_results),
        "all_counterexamples_rejected": all(item["rejected"] for item in fixture_results),
        "value_report": {
            "available": value_report is not None,
            "returncode": value_returncode,
            "stdout_sha256": hashlib.sha256(value_bytes).hexdigest(),
            "parsed_exact": value_report,
        },
        "measured_resource_usage": usage,
    }
    if args.write_reports:
        if value_report is not None:
            (root / VALUE_REPORT_DIRECTORY).mkdir(parents=True, exist_ok=True)
            (root / VALUE_REPORT_DIRECTORY / f"{batch}.json").write_bytes(value_bytes)
        (root / V2_REPORT_DIRECTORY).mkdir(parents=True, exist_ok=True)
        (root / V2_REPORT_DIRECTORY / f"{batch}.json").write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0 if (not errors and payload["all_counterexamples_rejected"] and value_report is not None and value_returncode == 0 and value_report.get("production", {}).get("passed") and value_report.get("all_counterexamples_rejected") and within_ceiling) else 1


if __name__ == "__main__":
    raise SystemExit(main())
