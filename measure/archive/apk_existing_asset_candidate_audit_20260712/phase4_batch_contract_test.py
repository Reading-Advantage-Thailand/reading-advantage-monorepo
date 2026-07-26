#!/usr/bin/env python3
"""Fail-closed Phase 4 per-batch contract verifier and counterexample runner."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path
from typing import Any


TRACK = Path("measure/tracks/apk_existing_asset_candidate_audit_20260712")
BATCH = "AF-01"
EXPECTED_HASHES = {
    "phase4_input_freeze": "ae387ae1e9a10d6398e8fd340924a12fc9ca19d706d9c079a2b071babcbbfcd3",
    "phase4_join_scaffold": "2162076fe26911a2659b7e0ef23f49398c8ebb4b5343b0ab0479c78a5d1a1de4",
    "phase4_browser_evidence_freeze": "5c64618ccd05b39ab63f1befb8d74d75f6a7fdf5b9613d31c8ee1b3369065231",
}
READ_BYTES = 0


def digest(path: Path) -> str:
    """Returns the SHA-256 digest for a file's exact bytes."""
    global READ_BYTES
    payload = path.read_bytes()
    READ_BYTES += len(payload)
    return hashlib.sha256(payload).hexdigest()


def load(path: Path) -> Any:
    """Loads a UTF-8 JSON document from a repository-relative path."""
    global READ_BYTES
    payload = path.read_bytes()
    READ_BYTES += len(payload)
    return json.loads(payload.decode("utf-8"))


def pointer(document: Any, value: str) -> Any:
    """Resolves a minimal RFC 6901 JSON pointer from a parsed document."""
    current = document
    for part in value.lstrip("/").split("/"):
        if not part:
            continue
        part = part.replace("~1", "/").replace("~0", "~")
        current = current[int(part)] if isinstance(current, list) else current[part]
    return current


def add(errors: list[str], code: str, detail: str) -> None:
    """Adds a stable machine-readable contract failure."""
    errors.append(f"{code}: {detail}")


def index_unique(records: list[dict[str, Any]], key: str, errors: list[str], label: str) -> dict[str, dict[str, Any]]:
    """Indexes records by a required unique key and reports duplicate ownership."""
    result: dict[str, dict[str, Any]] = {}
    for record in records:
        value = record.get(key)
        if not isinstance(value, str) or not value:
            add(errors, "missing-key", f"{label} lacks {key}")
        elif value in result:
            add(errors, "duplicate-key", f"{label} duplicates {key}={value}")
        else:
            result[value] = record
    return result


def source_fields(usage: dict[str, Any]) -> dict[str, Any]:
    """Extracts the only normalized fields allowed in a replacement requirement."""
    return {
        "track": usage.get("track"),
        "game_id": usage.get("game_id"),
        "surface_kind": usage.get("surface_kind"),
        "surface_id": usage.get("surface_id"),
        "asset_locator_literal": usage.get("asset_locator_literal"),
        "category": usage.get("category"),
        "claim_ids": usage.get("claim_ids"),
        "evidence_class": usage.get("evidence_class"),
        "source_class": usage.get("source_class"),
        "accepted_scope": usage.get("accepted_scope"),
        "disclosures": usage.get("disclosures"),
    }


def check_bindings(root: Path, joins: dict[str, Any], errors: list[str]) -> None:
    """Checks immutable Phase 4 input bindings and mapper-receipt provenance."""
    binding = joins.get("input_binding", {})
    receipt_path = root / TRACK / "role-receipts" / BATCH / "requirements-mapper.json"
    receipt = load(receipt_path)
    paths = {
        "phase4_input_freeze": TRACK / "phase4-input-freeze-v1.json",
        "phase4_join_scaffold": TRACK / "phase4-join-scaffold-v1.json",
        "phase4_browser_evidence_freeze": TRACK / "phase4-browser-evidence-freeze-v1.json",
    }
    for name, path in paths.items():
        expected = EXPECTED_HASHES[name]
        nested = binding.get(name, {})
        if digest(root / path) != expected:
            add(errors, "bound-input-byte-drift", name)
        if nested.get("path") != str(path) or nested.get("sha256") != expected:
            add(errors, "bound-input-binding-drift", name)
    receipt_hashes = receipt.get("input_file_hashes", {})
    for name, item in binding.items():
        if not isinstance(item, dict) or "path" not in item or "sha256" not in item:
            continue
        source_path, expected = item["path"], receipt_hashes.get(item["path"])
        try:
            if expected is None or item["sha256"] != expected or digest(root / source_path) != expected:
                add(errors, "bound-input-binding-drift", name)
        except OSError:
            add(errors, "bound-input-binding-drift", name)
    output_hashes = receipt.get("output_file_hashes", {})
    joins_path = str(TRACK / "batches" / BATCH / "phase4-path-usage-joins.json")
    rollup_path = str(TRACK / "batches" / BATCH / "phase4-group-rollup.json")
    if output_hashes.get(joins_path) != digest(root / joins_path) or output_hashes.get(rollup_path) != digest(root / rollup_path):
        add(errors, "mapper-receipt-output-hash-drift", BATCH)


def check_cells(link: dict[str, Any], errors: list[str]) -> None:
    """Checks the four viewport/theme cells without allowing browser overclaiming."""
    cells = link.get("responsive_assessment_cells", [])
    expected = {("compact", "cute_chibi_v1"), ("compact", "heroic_stylized_v1"),
                ("wide", "cute_chibi_v1"), ("wide", "heroic_stylized_v1")}
    actual = {(cell.get("viewport"), cell.get("theme")) for cell in cells}
    if len(cells) != 4 or actual != expected:
        add(errors, "responsive-four-cell-contract", link.get("usage_id", "unknown"))
    for cell in cells:
        if cell.get("status") != "blocked_unknown" or cell.get("assessment") is not None:
            add(errors, "responsive-unproven-state", link.get("usage_id", "unknown"))
        facets = cell.get("facets", {})
        for name in ("text_capacity", "focal_crop_tile_slice", "state_coverage", "collision_readability", "theme_suitability"):
            if facets.get(name, {}).get("status") != "blocked_unknown" or facets.get(name, {}).get("evidence") is not None:
                add(errors, "responsive-unproven-facet", f"{link.get('usage_id')} {name}")
        runtime = facets.get("per_path_runtime_load", {})
        if runtime.get("status") != "not_established" or runtime.get("evidence") is not None:
            add(errors, "browser-used-as-per-path-load-proof", link.get("usage_id", "unknown"))
        legacy = facets.get("current_legacy_function", {})
        if legacy.get("scope") != "composite_scene_only_not_candidate_path_load" or legacy.get("per_path_runtime_load") != "not_established":
            add(errors, "browser-composite-scope", link.get("usage_id", "unknown"))


def check_requirement(link: dict[str, Any], errors: list[str]) -> None:
    """Requires semantic replacement to copy only the exact accepted usage envelope."""
    requirement = link.get("semantic_replacement_requirement", {})
    usage = link.get("normalized_usage", {})
    if requirement.get("source") != link.get("source") or requirement.get("usage_id") != usage.get("usage_id"):
        add(errors, "semantic-source-binding", usage.get("usage_id", "unknown"))
    if requirement.get("accepted_usage_fields") != source_fields(usage):
        add(errors, "semantic-fields-not-exact-source-copy", usage.get("usage_id", "unknown"))
    if requirement.get("canonical_semantic_role") is not None or requirement.get("canonical_state") is not None or requirement.get("ontology_status") != "not_defined_pending_T9":
        add(errors, "t9-ontology-leakage", usage.get("usage_id", "unknown"))
    if usage.get("surface_kind") == "scene":
        check_cells(link, errors)
    elif link.get("responsive_assessment_cells"):
        add(errors, "non-scene-responsive-cell-leakage", usage.get("usage_id", "unknown"))


def check_rollup(joins: dict[str, Any], rollup: dict[str, Any], errors: list[str]) -> None:
    """Reconciles the group rollup exactly to path-specific producer records."""
    records = joins.get("records", [])
    groups = rollup.get("groups", [])
    grouped: dict[str, list[dict[str, Any]]] = {}
    for record in records:
        grouped.setdefault(record.get("identical_hash_group"), []).append(record)
    indexed = index_unique(groups, "identical_hash_group", errors, "rollup group")
    if set(indexed) != set(grouped):
        add(errors, "group-denominator", "rollup group set differs from path records")
    mixed = 0
    for group_id, members in grouped.items():
        roll = indexed.get(group_id)
        if roll is None:
            continue
        member_paths = {member.get("canonical_path") for member in members}
        reported = {member.get("canonical_path") for member in roll.get("member_paths", [])}
        if reported != member_paths:
            add(errors, "duplicate-path-specificity", group_id)
        callers = sum(len(member.get("caller_locators", [])) for member in members)
        links = sum(len(member.get("accepted_usage_ids", [])) for member in members)
        dispositions = {value: sum(1 for member in members if member.get("disposition", {}).get("value") == value)
                        for value in ("reject", "replace", "unknown")}
        counts = roll.get("counts", {})
        if counts.get("paths") != len(members) or counts.get("caller_locators") != callers or counts.get("accepted_path_usage_links") != links or counts.get("disposition_paths") != dispositions:
            add(errors, "group-rollup-exactness", group_id)
        if len({member.get("disposition", {}).get("value") for member in members}) > 1:
            mixed += 1
    if rollup.get("counts", {}).get("groups_with_mixed_path_specific_dispositions") != mixed:
        add(errors, "group-rollup-mixed-count", str(mixed))


def verify(root: Path, joins: dict[str, Any], rollup: dict[str, Any]) -> list[str]:
    """Validates one selected Phase 4 producer pair against immutable contracts."""
    errors: list[str] = []
    check_bindings(root, joins, errors)
    scaffold = load(root / TRACK / "phase4-join-scaffold-v1.json")
    phase0 = load(root / TRACK / "phase0-input-freeze-v1.json")
    caller_inventory = load(root / TRACK / "batches" / BATCH / "caller-inventory.json")
    provenance_audit = load(root / TRACK / "batches" / BATCH / "provenance-audit.json")
    batch = next(item for item in phase0["batch_strategy"]["batches"] if item["batch_id"] == BATCH)
    frozen = [record for record in scaffold["candidate_records"] if record["batch_id"] == BATCH]
    if scaffold["counts"].get("separate_catalog_locator_records") != 7 or scaffold["counts"].get("additive_92_path_claim") is not False:
        add(errors, "catalog-grain-contract", "frozen scaffold")
    expected = index_unique(frozen, "canonical_path", errors, "frozen candidate")
    actual = index_unique(joins.get("records", []), "canonical_path", errors, "producer candidate")
    callers = index_unique(caller_inventory["records"], "canonical_path", errors, "caller inventory")
    provenance = index_unique(provenance_audit["records"], "canonical_path", errors, "provenance audit")
    if len(actual) != batch["path_count"] or set(actual) != set(expected):
        add(errors, "path-denominator", f"expected {batch['path_count']} exact {BATCH} paths")
    expected_groups = {record["identical_hash_group"] for record in frozen}
    if len(expected_groups) != batch["group_count"]:
        add(errors, "frozen-group-denominator", BATCH)
    all_locator_ids: set[str] = set()
    accepted_links = 0
    for path, record in actual.items():
        frozen_record = expected.get(path)
        caller = callers.get(path)
        audit = provenance.get(path)
        if frozen_record is None or caller is None or audit is None:
            add(errors, "path-owner-missing", path)
            continue
        for field in ("sha256", "identical_hash_group", "duplicate_path_peers", "derived_public_url", "static_reference_status", "dynamic_risk", "unknown_rationale"):
            if record.get(field) != caller.get(field):
                add(errors, "path-owner-drift", f"{path} {field}")
        # The immutable scaffold is the exact producer-grain locator contract,
        # including the derived locator_id.  Its source pointer must still resolve
        # to the Phase 1 caller inventory rather than merely resemble it.
        if record.get("caller_locators") != frozen_record.get("caller_locators"):
            add(errors, "caller-locator-ownership", path)
        source_locators = caller.get("current_callers", [])
        seen_source_pointers: set[str] = set()
        for locator in record.get("caller_locators", []):
            source_pointer = locator.get("caller_inventory_json_pointer")
            try:
                source_locator = pointer(caller_inventory, source_pointer)
                copied_fields = {key: value for key, value in locator.items() if key not in {
                    "locator_id", "batch_id", "caller_inventory_path", "caller_inventory_sha256", "caller_inventory_json_pointer"}}
                if source_locator != copied_fields or source_pointer in seen_source_pointers:
                    add(errors, "caller-locator-ownership", path)
                seen_source_pointers.add(source_pointer)
            except (KeyError, TypeError, ValueError, IndexError):
                add(errors, "caller-locator-ownership", path)
            if (locator.get("batch_id") != BATCH
                    or locator.get("caller_inventory_path") != str(TRACK / "batches" / BATCH / "caller-inventory.json")
                    or locator.get("caller_inventory_sha256") != joins["input_binding"]["caller_inventory"]["sha256"]):
                add(errors, "caller-locator-binding", path)
        if len(seen_source_pointers) != len(source_locators):
            add(errors, "caller-locator-coverage", path)
        all_locator_ids.update(locator.get("locator_id") for locator in record.get("caller_locators", []) if locator.get("locator_id"))
        if record.get("provenance") != {key: audit.get(key) for key in ("repository_introduction", "upstream_provenance", "license", "prospective_eligibility")}:
            add(errors, "provenance-owner-drift", path)
        expected_ids = frozen_record.get("accepted_usage_ids", [])
        if record.get("accepted_usage_ids") != expected_ids or record.get("accepted_join_caller_locator_ids") != frozen_record.get("accepted_join_caller_locator_ids", []):
            add(errors, "accepted-join-denominator", path)
        if record.get("priority1_evidence") != frozen_record.get("priority1_evidence"):
            add(errors, "phase3-priority1-evidence-ownership", path)
        priority = frozen_record.get("priority1_evidence", {}).get("applies")
        disposition = record.get("disposition", {})
        if priority:
            expected_disposition = ("reject", 1, "retire")
        elif expected_ids:
            expected_disposition = ("replace", 2, "replace_with_standard_pack_requirement")
        else:
            expected_disposition = ("unknown", 3, None)
        if (disposition.get("value"), disposition.get("policy_priority"), disposition.get("replacement_action")) != expected_disposition:
            add(errors, "disposition-priority", path)
        if record.get("canonical_standard_pack_candidate_key", {}).get("value") is not None or record.get("canonical_standard_pack_candidate_key", {}).get("status") != "forbidden-pending-T9":
            add(errors, "canonical-key-forbidden", path)
        if record.get("direct_legacy_adoption") is not False:
            add(errors, "direct-legacy-adoption", path)
        eligibility = record.get("eligibility", {})
        if record.get("provenance", {}).get("upstream_provenance", {}).get("status") == "unknown":
            if eligibility.get("reuse", {}).get("allowed") or eligibility.get("adapt", {}).get("allowed") or disposition.get("value") in {"reuse", "adapt"}:
                add(errors, "unknown-provenance-reuse-adapt", path)
        if eligibility.get("reference", {}).get("allowed") or eligibility.get("reference", {}).get("evidence"):
            add(errors, "unsupported-reference", path)
        links = record.get("usage_links", [])
        if len(links) != len(expected_ids) or {link.get("usage_id") for link in links} != set(expected_ids):
            add(errors, "usage-link-ownership", path)
        if not expected_ids and record.get("semantic_replacement_requirements", {}).get("requirements"):
            add(errors, "semantic-requirement-without-exact-join", path)
        for link in links:
            source = link.get("source", {})
            try:
                source_doc = load(root / source["normalizer_path"])
                if digest(root / source["normalizer_path"]) != source.get("normalizer_sha256") or pointer(source_doc, source["normalizer_json_pointer"]) != link.get("normalized_usage"):
                    add(errors, "accepted-usage-source-binding", path)
            except (KeyError, OSError, ValueError, TypeError):
                add(errors, "accepted-usage-source-binding", path)
            check_requirement(link, errors)
        requirements = record.get("semantic_replacement_requirements", {}).get("requirements", [])
        if [link.get("semantic_replacement_requirement") for link in links] != requirements:
            add(errors, "semantic-requirement-ownership", path)
        accepted_links += len(expected_ids)
    expected_callers = sum(len(record.get("current_callers", [])) for record in callers.values())
    if len(all_locator_ids) != expected_callers or expected_callers != joins.get("counts", {}).get("caller_locators"):
        add(errors, "caller-denominator", f"expected {expected_callers} exact caller locators")
    if accepted_links != joins.get("counts", {}).get("accepted_path_usage_links"):
        add(errors, "accepted-join-count", str(accepted_links))
    counts = joins.get("counts", {})
    if counts.get("candidate_paths") != batch["path_count"] or counts.get("identical_hash_groups") != batch["group_count"]:
        add(errors, "declared-batch-denominator", BATCH)
    scene_usage_ids = {link.get("usage_id") for record in actual.values() for link in record.get("usage_links", []) if link.get("normalized_usage", {}).get("surface_kind") == "scene"}
    scene_links = sum(1 for record in actual.values() for link in record.get("usage_links", []) if link.get("normalized_usage", {}).get("surface_kind") == "scene")
    if counts.get("unique_scene_usage_records") != len(scene_usage_ids) or counts.get("responsive_assessment_cells") != scene_links * 4:
        add(errors, "scene-usage-cell-denominator", BATCH)
    slices = joins.get("review_slices", [])
    slice_paths = {path for item in slices for path in item.get("candidate_paths", [])}
    joined_paths = {path for path, item in actual.items() if item.get("accepted_usage_ids")}
    for item in slices:
        if item.get("game_count") != len(item.get("games", [])) or len(item.get("games", [])) > 3:
            add(errors, "review-slice-game-ceiling", item.get("slice_id", "unknown"))
    if slice_paths != joined_paths:
        add(errors, "review-slice-path-coverage", BATCH)
    check_rollup(joins, rollup, errors)
    return errors


def apply_fixture(joins: dict[str, Any], rollup: dict[str, Any], operation: str) -> None:
    """Applies one narrow counterexample mutation to selected-batch copies."""
    if not joins.get("records") or not rollup.get("groups"):
        raise ValueError("fixture-precondition-not-met: missing producer records or rollup groups")
    first = min(joins["records"], key=lambda record: record["canonical_path"])
    joined_records = sorted((record for record in joins["records"] if record["accepted_usage_ids"]), key=lambda record: record["canonical_path"])
    joined = joined_records[0] if joined_records else None
    caller_records = sorted((record for record in joins["records"] if record.get("caller_locators")), key=lambda record: record["canonical_path"])
    caller_record = caller_records[0] if caller_records else None
    scene_links = sorted((link for record in joined_records for link in record["usage_links"] if link.get("normalized_usage", {}).get("surface_kind") == "scene"), key=lambda link: link["usage_id"])
    if operation in {"caller_denominator", "disposition_priority", "semantic_unbound", "non_scene_cells"} and joined is None:
        raise ValueError("fixture-precondition-not-met: no exact accepted join")
    if operation in {"responsive_cell_missing", "browser_as_path_load"} and not scene_links:
        raise ValueError("fixture-precondition-not-met: no scene usage link")
    if operation == "locator_ownership" and caller_record is None:
        raise ValueError("fixture-precondition-not-met: no caller locator")
    assert joined is not None or operation not in {"caller_denominator", "disposition_priority", "semantic_unbound", "responsive_cell_missing", "browser_as_path_load"}
    assert caller_record is not None or operation != "locator_ownership"
    link = scene_links[0] if operation in {"responsive_cell_missing", "browser_as_path_load"} else (sorted(joined["usage_links"], key=lambda item: item["usage_id"])[0] if joined is not None else {})
    if operation == "path_denominator": joins["records"].pop()
    elif operation == "caller_denominator": joined["caller_locators"].pop()
    elif operation == "locator_ownership": caller_record["caller_locators"][0]["caller_path"] = "fabricated.ts"
    elif operation == "disposition_priority": joined["disposition"] = {"status": "blocked", "value": "unknown", "policy_priority": 3, "replacement_action": None}
    elif operation == "unknown_provenance_reuse": first["eligibility"]["reuse"] = {"allowed": True, "status": "fabricated"}
    elif operation == "unsupported_reference": first["eligibility"]["reference"] = {"allowed": True, "evidence": [{"unsupported": True}]}
    elif operation == "semantic_unbound": link["semantic_replacement_requirement"]["source"]["normalizer_sha256"] = "0" * 64
    elif operation == "responsive_cell_missing": link["responsive_assessment_cells"].pop()
    elif operation == "browser_as_path_load": link["responsive_assessment_cells"][0]["facets"]["per_path_runtime_load"] = {"status": "established", "evidence": {"kind": "composite"}}
    elif operation == "non_scene_cells": link["normalized_usage"]["surface_kind"] = "catalog"
    elif operation == "slice_over_three_games": joins["review_slices"][0]["games"].append("castle-defense"); joins["review_slices"][0]["game_count"] = 4
    elif operation == "duplicate_collapse": rollup["groups"][0]["member_paths"] = []
    elif operation == "rollup_drift": rollup["groups"][0]["counts"]["paths"] += 1
    elif operation == "direct_legacy_adoption": first["direct_legacy_adoption"] = True
    elif operation == "canonical_key": first["canonical_standard_pack_candidate_key"]["value"] = "forbidden-key"
    elif operation == "input_hash_drift": joins["input_binding"]["phase4_input_freeze"]["sha256"] = "0" * 64
    else: raise ValueError(f"unknown fixture operation: {operation}")


def main() -> int:
    """Runs selected-batch verification and requires every counterexample to fail."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--batch", default="AF-01", help="Frozen batch identifier to verify.")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    root = args.root.resolve()
    global BATCH
    BATCH = args.batch
    joins_path = root / TRACK / "batches" / BATCH / "phase4-path-usage-joins.json"
    rollup_path = root / TRACK / "batches" / BATCH / "phase4-group-rollup.json"
    joins, rollup = load(joins_path), load(rollup_path)
    production_errors = verify(root, joins, rollup)
    fixtures = sorted((root / TRACK / "negative-fixtures" / "phase4").glob("*.json"))
    fixture_results = []
    for fixture_path in fixtures:
        fixture = load(fixture_path)
        altered_joins, altered_rollup = copy.deepcopy(joins), copy.deepcopy(rollup)
        try:
            apply_fixture(altered_joins, altered_rollup, fixture["operation"])
            errors = verify(root, altered_joins, altered_rollup)
        except ValueError as error:
            errors = [str(error)]
        precondition_failed = any(error.startswith("fixture-precondition-not-met") for error in errors)
        fixture_results.append({"fixture": str(fixture_path.relative_to(root)), "operation": fixture["operation"], "rejected": bool(errors) and not precondition_failed, "error_codes": sorted({error.split(":", 1)[0] for error in errors})})
    payload = {
        "schema_version": "apk-asset-forensics.phase4-batch-contract-test-report.v1",
        "track_id": "apk_existing_asset_candidate_audit_20260712",
        "batch_id": BATCH,
        "role": "truth-test-author",
        "verifier": str((TRACK / "phase4_batch_contract_test.py")),
        "verifier_sha256": digest(root / TRACK / "phase4_batch_contract_test.py"),
        "input_hashes": {"phase4_input_freeze": EXPECTED_HASHES["phase4_input_freeze"], "phase4_join_scaffold": EXPECTED_HASHES["phase4_join_scaffold"], "phase4_browser_evidence_freeze": EXPECTED_HASHES["phase4_browser_evidence_freeze"], "producer_path_usage_joins": digest(joins_path), "producer_group_rollup": digest(rollup_path)},
        "production": {"passed": not production_errors, "errors": production_errors},
        "counterexamples": fixture_results,
        "counterexample_count": len(fixture_results),
        "all_counterexamples_rejected": all(item["rejected"] for item in fixture_results),
        "measured_resource_usage": {
            "test_cases": 1 + len(fixture_results),
            "command_invocations": 1,
            "bytes_read": READ_BYTES,
            "within_frozen_truth_test_ceiling": (1 + len(fixture_results) <= 160 and READ_BYTES <= 134217728),
            "ceiling": {"test_cases": 160, "command_invocations": 80, "bytes_read": 134217728},
            "measurement_basis": "Exact bytes loaded or digested by this one deterministic verifier process; interpreter and operating-system library reads are excluded.",
        },
    }
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0 if not production_errors and payload["all_counterexamples_rejected"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
