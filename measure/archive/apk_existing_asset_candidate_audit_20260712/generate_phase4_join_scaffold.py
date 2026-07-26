#!/usr/bin/env python3
"""Render and validate the decision-free Phase 4 candidate/usage scaffold."""

import argparse
import hashlib
import json
from pathlib import Path


TRACK = Path(__file__).resolve().parent
REPO = TRACK.parents[2]
FREEZE_PATH = TRACK / "phase4-input-freeze-v1.json"
OUTPUT_PATH = TRACK / "phase4-join-scaffold-v1.json"
SCENE_FIELDS = (
    "text_capacity",
    "focal_crop_tile_slice",
    "state_coverage",
    "collision_readability",
    "current_legacy_function",
    "semantic_role_state_replacement_or_retirement",
)
VIEWPORTS = ("compact", "wide")
THEMES = ("cute_chibi_v1", "heroic_stylized_v1")


def digest(path: Path) -> str:
    """Return the SHA-256 digest for one frozen artifact."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path: Path) -> dict:
    """Load one JSON object and reject malformed roots."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"JSON root must be an object: {path.relative_to(REPO)}")
    return value


def require(condition: bool, message: str) -> None:
    """Raise a stable contract error when one condition is false."""
    if not condition:
        raise AssertionError(message)


def source_path(binding: dict) -> Path:
    """Resolve one repository-relative source binding."""
    value = binding.get("path")
    require(isinstance(value, str) and value, "source registry path is missing")
    path = REPO / value
    require(path.is_file(), f"frozen source is missing: {value}")
    require(
        digest(path) == binding.get("sha256"),
        f"frozen source digest differs: {value}",
    )
    return path


def pointer_index(pointer: str, array_name: str) -> int:
    """Return the final array index from one exact normalizer pointer."""
    prefix = f"/{array_name}/"
    require(pointer.startswith(prefix), f"normalizer pointer differs: {pointer}")
    suffix = pointer[len(prefix):]
    require(suffix.isdigit(), f"normalizer pointer index differs: {pointer}")
    return int(suffix)


def locator_id(inventory_path: str, pointer: str) -> str:
    """Build a stable path-owned identity for one Phase 1 caller locator."""
    payload = f"{inventory_path}#{pointer}".encode()
    return f"caller:{hashlib.sha256(payload).hexdigest()}"


def load_frozen_sources() -> dict:
    """Validate the Phase 4 freeze and derive all source-grain records."""
    freeze = load(FREEZE_PATH)
    require(
        freeze.get("schema_version")
        == "apk-asset-forensics.phase4-input-freeze.v1"
        and freeze.get("status") == "contract-scaffold-only",
        "Phase 4 input freeze identity differs",
    )
    registry_path = source_path(freeze["source_registry"])
    registry = load(registry_path)
    require(
        registry.get("schema_version")
        == "apk-asset-forensics.phase4-source-registry.v1"
        and registry.get("status") == "frozen-input-registry",
        "Phase 4 source registry identity differs",
    )
    browser_evidence_path = source_path(freeze["browser_evidence_supplement"])
    browser_evidence = load(browser_evidence_path)
    require(
        browser_evidence.get("schema_version")
        == "apk-asset-forensics.phase4-browser-evidence-freeze.v1"
        and browser_evidence.get("status")
        == "frozen-bounded-browser-evidence-not-acceptance"
        and browser_evidence.get("acceptance") is False,
        "Phase 4 browser evidence supplement identity differs",
    )
    expected = registry["expected_counts"]
    require(
        expected == {
            "candidate_paths": 428,
            "identical_hash_groups": 227,
            "caller_locators": 533,
            "normalized_usage_records": 87,
            "scene_usage_records": 65,
            "catalog_or_non_scene_usage_records": 22,
            "accepted_normalized_candidate_path_joins": 85,
            "separate_catalog_locator_records": 7,
            "catalog_locator_candidate_join_overlap_usage_ids": 3,
            "priority1_evidence_paths": 14,
            "priority1_join_overlap": 0,
        },
        "Phase 4 expected-count registry differs",
    )

    predecessor_by_role: dict[str, tuple[Path, dict]] = {}
    for binding in registry["accepted_predecessors"]:
        path = source_path(binding)
        predecessor_by_role[binding["role"]] = (path, load(path))
    require(
        set(predecessor_by_role)
        == {
            "phase0_denominator_and_batch_freeze",
            "phase1_caller_acceptance",
            "phase2_provenance_acceptance",
            "phase3_inspection_acceptance",
        },
        "accepted predecessor roles differ",
    )
    phase1_acceptance = predecessor_by_role["phase1_caller_acceptance"][1]
    require(
        phase1_acceptance.get("decision") == "accepted"
        and phase1_acceptance.get("denominator")
        == {"candidate_paths": 428, "identical_hash_groups": 227, "batches": 12}
        and phase1_acceptance.get("caller_findings", {}).get("eligible_locators")
        == 533,
        "Phase 1 acceptance denominator differs",
    )
    phase2_acceptance = predecessor_by_role["phase2_provenance_acceptance"][1]
    require(
        phase2_acceptance.get("decision") == "accepted",
        "Phase 2 provenance acceptance differs",
    )
    phase3_acceptance = predecessor_by_role["phase3_inspection_acceptance"][1]
    require(
        phase3_acceptance.get("decision") == "ACCEPT_PHASE3"
        and phase3_acceptance.get("accepted_denominator", {}).get("candidate_paths")
        == 428,
        "Phase 3 inspection acceptance differs",
    )

    candidates: dict[str, dict] = {}
    callers_by_pointer: dict[tuple[str, str], dict] = {}
    group_paths: dict[str, list[str]] = {}
    caller_sources = registry["candidate_and_caller_sources"]
    require(len(caller_sources) == 12, "caller-inventory source count differs")
    for binding in caller_sources:
        path = source_path(binding)
        document = load(path)
        batch_id = binding["batch_id"]
        records = document.get("records")
        require(
            document.get("batch_id") == batch_id and isinstance(records, list),
            f"{batch_id} caller inventory identity differs",
        )
        require(
            len(records) == binding["candidate_records"],
            f"{batch_id} candidate record count differs",
        )
        batch_caller_count = sum(
            len(record.get("current_callers", [])) for record in records
        )
        require(
            batch_caller_count == binding["caller_locators"],
            f"{batch_id} caller locator count differs",
        )
        for record_index, record in enumerate(records):
            canonical_path = record.get("canonical_path")
            require(
                isinstance(canonical_path, str) and canonical_path not in candidates,
                "candidate path denominator has duplicates",
            )
            require(
                record.get("identical_hash_group") == f"sha256:{record.get('sha256')}",
                f"candidate hash-group binding differs: {canonical_path}",
            )
            rendered_callers = []
            for caller_index, caller in enumerate(record.get("current_callers", [])):
                pointer = (
                    f"/records/{record_index}/current_callers/{caller_index}"
                )
                rendered = {
                    "locator_id": locator_id(binding["path"], pointer),
                    "batch_id": batch_id,
                    "caller_inventory_path": binding["path"],
                    "caller_inventory_sha256": binding["sha256"],
                    "caller_inventory_json_pointer": pointer,
                    **caller,
                }
                key = (binding["path"], pointer)
                require(key not in callers_by_pointer, "caller locator denominator duplicates")
                callers_by_pointer[key] = rendered
                rendered_callers.append(rendered)
            candidate = {
                "batch_id": batch_id,
                "canonical_path": canonical_path,
                "sha256": record["sha256"],
                "identical_hash_group": record["identical_hash_group"],
                "duplicate_path_peers": sorted(record["duplicate_path_peers"]),
                "derived_public_url": record.get("derived_public_url"),
                "dynamic_risk": record.get("dynamic_risk"),
                "static_reference_status": record.get("static_reference_status"),
                "unknown_rationale": record.get("unknown_rationale"),
                "caller_locators": rendered_callers,
            }
            candidates[canonical_path] = candidate
            group_paths.setdefault(record["identical_hash_group"], []).append(
                canonical_path
            )
    require(len(candidates) == 428, "candidate path denominator differs")
    require(len(group_paths) == 227, "identical-hash group denominator differs")
    require(len(callers_by_pointer) == 533, "caller locator denominator differs")
    for canonical_path, candidate in candidates.items():
        expected_peers = sorted(
            path
            for path in group_paths[candidate["identical_hash_group"]]
            if path != canonical_path
        )
        require(
            candidate["duplicate_path_peers"] == expected_peers,
            f"duplicate peer contract differs: {canonical_path}",
        )

    usages: dict[str, dict] = {}
    usage_by_pointer: dict[tuple[str, str], dict] = {}
    normalizer_sources = registry["canonical_scene_usage_normalizers"]
    require(len(normalizer_sources) == 2, "canonical normalizer count differs")
    for binding in normalizer_sources:
        path = source_path(binding)
        document = load(path)
        array_name = binding["usage_array_json_pointer"].removeprefix("/")
        values = document.get(array_name)
        require(
            isinstance(values, list) and len(values) == binding["usage_records"],
            f"normalizer usage count differs: {binding['path']}",
        )
        for index, usage in enumerate(values):
            usage_id = usage.get("usage_id")
            pointer = f"/{array_name}/{index}"
            require(
                isinstance(usage_id, str) and usage_id not in usages,
                "normalized usage identifier denominator differs",
            )
            source = {
                "normalizer_path": binding["path"],
                "normalizer_sha256": binding["sha256"],
                "normalizer_json_pointer": pointer,
            }
            usages[usage_id] = {"source": source, "normalized_usage": usage}
            usage_by_pointer[(binding["path"], pointer)] = usage
    require(len(usages) == 87, "normalized usage denominator differs")
    require(
        sum(
            item["normalized_usage"].get("surface_kind") == "scene"
            for item in usages.values()
        )
        == 65,
        "scene usage denominator differs",
    )

    mapping_binding = registry["working_mapping_aid"]
    mapping_path = source_path(mapping_binding)
    mapping = load(mapping_path)
    require(
        mapping.get("schema_version")
        == "apk-existing-asset-candidate-audit.strict-caller-scene-joins.v1"
        and mapping.get("counts")
        == {
            "candidate_path_joins": 85,
            "catalog_locator_records": 7,
            "total_path_records": None,
            "additive_92_path_claim": False,
        },
        "working mapping aid count or identity differs",
    )

    def validate_envelope(envelope: dict) -> str:
        """Revalidate one mapping envelope against an exact normalizer pointer."""
        key = (
            envelope.get("normalizer_path"),
            envelope.get("normalizer_json_pointer"),
        )
        usage = usage_by_pointer.get(key)
        require(usage is not None, "mapping normalizer pointer is not frozen")
        normalizer_path = REPO / envelope["normalizer_path"]
        require(
            envelope.get("normalizer_sha256") == digest(normalizer_path),
            "mapping normalizer digest differs",
        )
        for field in (
            "usage_id",
            "game_id",
            "surface_kind",
            "surface_id",
            "category",
            "asset_locator_literal",
            "accepted_scope",
        ):
            require(
                envelope.get(field) == usage.get(field),
                f"mapping envelope {field} differs: {envelope.get('usage_id')}",
            )
        require(
            envelope.get("claim_ids", []) == usage.get("claim_ids", []),
            f"mapping envelope claim IDs differ: {envelope.get('usage_id')}",
        )
        return envelope["usage_id"]

    accepted_by_candidate: dict[str, dict] = {}
    usage_candidate_paths: dict[str, list[str]] = {}
    joins = mapping.get("candidate_path_joins")
    require(isinstance(joins, list) and len(joins) == 85, "accepted join count differs")
    for join in joins:
        canonical_path = join.get("candidate_path")
        candidate = candidates.get(canonical_path)
        require(
            candidate is not None and canonical_path not in accepted_by_candidate,
            "accepted candidate-path join denominator differs",
        )
        require(
            join.get("candidate_sha256") == candidate["sha256"]
            and join.get("identical_hash_group") == candidate["identical_hash_group"],
            f"accepted candidate-path join binding differs: {canonical_path}",
        )
        accepted_caller_ids = []
        for strict_locator in join.get("caller_locators", []):
            key = (
                strict_locator.get("caller_inventory_path"),
                strict_locator.get("caller_inventory_json_pointer"),
            )
            frozen_locator = callers_by_pointer.get(key)
            require(
                frozen_locator is not None,
                f"accepted caller locator is not frozen: {canonical_path}",
            )
            strict_expected = {
                key: value
                for key, value in frozen_locator.items()
                if key not in {"locator_id", "use_classification"}
            }
            require(
                strict_locator == strict_expected,
                f"accepted caller locator differs: {canonical_path}",
            )
            accepted_caller_ids.append(frozen_locator["locator_id"])
        require(
            len(accepted_caller_ids) == len(set(accepted_caller_ids))
            and accepted_caller_ids,
            f"accepted caller locator set differs: {canonical_path}",
        )
        usage_ids = [
            validate_envelope(envelope)
            for envelope in join.get("accepted_evidence_envelopes", [])
        ]
        require(
            usage_ids and len(usage_ids) == len(set(usage_ids)),
            f"accepted usage envelope set differs: {canonical_path}",
        )
        accepted_by_candidate[canonical_path] = {
            "accepted_usage_ids": sorted(usage_ids),
            "accepted_join_caller_locator_ids": sorted(accepted_caller_ids),
        }
        for usage_id in usage_ids:
            usage_candidate_paths.setdefault(usage_id, []).append(canonical_path)
    require(
        len(accepted_by_candidate) == 85,
        "accepted normalized candidate-path join denominator differs",
    )

    catalog_usage_ids: set[str] = set()
    frozen_catalog_records: list[dict] = []
    catalog_records = mapping.get("catalog_locator_records")
    require(
        isinstance(catalog_records, list) and len(catalog_records) == 7,
        "catalog locator denominator differs",
    )
    for record in catalog_records:
        require(
            record.get("record_grain")
            == "unique accepted catalog locator, not a candidate path",
            "catalog locator grain differs",
        )
        usage_id = validate_envelope(record["accepted_evidence_envelope"])
        require(
            usage_id not in catalog_usage_ids,
            "catalog locator denominator has duplicates",
        )
        catalog_usage_ids.add(usage_id)
        frozen_catalog_records.append(record)
    require(
        len(catalog_usage_ids & set(usage_candidate_paths)) == 3,
        "catalog locator candidate-join overlap differs",
    )

    batch_bindings = phase3_acceptance["input_binding"]["batch_bindings"]
    priority1_by_path: dict[str, list[dict]] = {}
    for batch_id in sorted(batch_bindings):
        inspection_path = TRACK / "batches" / batch_id / "inspection-records.json"
        expected_sha = batch_bindings[batch_id]["inspection_records_sha256"]
        require(
            inspection_path.is_file() and digest(inspection_path) == expected_sha,
            f"{batch_id} accepted Phase 3 inspection records differ",
        )
        inspection = load(inspection_path)
        for group_index, group in enumerate(inspection.get("groups", [])):
            reasons = []
            if group.get("media_class") == "unreadable_or_pointer":
                reasons.append("invalid_or_unreadable_or_empty")
            if group.get("inspection", {}).get("corruption_risk") == "present":
                reasons.append("corruption_risk_present")
            if group.get("inspection", {}).get("placeholder_risk") == "present":
                reasons.append("placeholder_risk_present")
            if not reasons:
                continue
            for canonical_path in group.get("member_paths", []):
                candidate = candidates.get(canonical_path)
                require(
                    candidate is not None
                    and candidate["identical_hash_group"]
                    == group.get("identical_hash_group"),
                    f"priority1 evidence path differs: {canonical_path}",
                )
                priority1_by_path.setdefault(canonical_path, []).append(
                    {
                        "inspection_records_path": str(
                            inspection_path.relative_to(REPO)
                        ),
                        "inspection_records_sha256": expected_sha,
                        "inspection_group_json_pointer": f"/groups/{group_index}",
                        "reasons": reasons,
                    }
                )
    require(len(priority1_by_path) == 14, "priority1 evidence path denominator differs")
    require(
        not (set(priority1_by_path) & set(accepted_by_candidate)),
        "priority1 evidence paths overlap accepted joins",
    )

    return {
        "freeze": freeze,
        "registry": registry,
        "registry_path": registry_path,
        "browser_evidence_path": browser_evidence_path,
        "candidates": candidates,
        "group_paths": group_paths,
        "usages": usages,
        "accepted_by_candidate": accepted_by_candidate,
        "usage_candidate_paths": usage_candidate_paths,
        "catalog_usage_ids": catalog_usage_ids,
        "catalog_records": frozen_catalog_records,
        "priority1_by_path": priority1_by_path,
    }


def assessment_cells() -> list[dict]:
    """Create the four required blocked viewport/theme cells."""
    return [
        {
            "viewport": viewport,
            "theme": theme,
            "status": "blocked_unknown",
            "evidence": None,
            "assessment": None,
            "fields": {field: None for field in SCENE_FIELDS},
        }
        for viewport in VIEWPORTS
        for theme in THEMES
    ]


def render_scaffold() -> dict:
    """Render one deterministic record per frozen candidate and usage grain."""
    source = load_frozen_sources()
    candidate_records = []
    for canonical_path in sorted(source["candidates"]):
        frozen = source["candidates"][canonical_path]
        accepted = source["accepted_by_candidate"].get(canonical_path)
        priority1 = source["priority1_by_path"].get(canonical_path, [])
        candidate_records.append(
            {
                **frozen,
                "join_status": (
                    "accepted_exact_normalized_join"
                    if accepted
                    else "blocked_unknown"
                ),
                "accepted_usage_ids": (
                    accepted["accepted_usage_ids"] if accepted else []
                ),
                "accepted_join_caller_locator_ids": (
                    accepted["accepted_join_caller_locator_ids"] if accepted else []
                ),
                "priority1_evidence": {
                    "applies": bool(priority1),
                    "status": (
                        "exact_accepted_phase3_evidence"
                        if priority1
                        else "not_established"
                    ),
                    "evidence": priority1,
                    "disposition_decided": False,
                },
                "semantic_replacement_requirements": {
                    "status": "blocked_unknown",
                    "value": None,
                    "evidence": None,
                    "required_if_exact_join": bool(accepted),
                },
                "disposition": {
                    "status": "unassigned",
                    "value": None,
                    "replacement_action": None,
                },
                "canonical_standard_pack_candidate_key": {
                    "status": "forbidden-pending-T9",
                    "value": None,
                },
                "direct_legacy_adoption": False,
            }
        )

    scene_records = []
    non_scene_records = []
    for usage_id in sorted(source["usages"]):
        frozen = source["usages"][usage_id]
        normalized = frozen["normalized_usage"]
        candidate_paths = sorted(
            source["usage_candidate_paths"].get(usage_id, [])
        )
        if candidate_paths:
            join_status = "accepted_exact_normalized_join"
        else:
            join_status = "blocked_unknown"
        record = {
            "usage_id": usage_id,
            "usage_grain": (
                "scene"
                if normalized.get("surface_kind") == "scene"
                else "catalog_or_non_scene"
            ),
            "source": frozen["source"],
            "normalized_usage": normalized,
            "join_status": join_status,
            "candidate_paths": candidate_paths,
            "responsive_assessment_cells": (
                assessment_cells()
                if normalized.get("surface_kind") == "scene"
                else []
            ),
        }
        if normalized.get("surface_kind") == "scene":
            scene_records.append(record)
        else:
            non_scene_records.append(record)

    counts = {
        "candidate_paths": len(candidate_records),
        "identical_hash_groups": len(source["group_paths"]),
        "caller_locators": sum(
            len(record["caller_locators"]) for record in candidate_records
        ),
        "scene_usage_records": len(scene_records),
        "catalog_or_non_scene_usage_records": len(non_scene_records),
        "accepted_normalized_candidate_path_joins": sum(
            record["join_status"] == "accepted_exact_normalized_join"
            for record in candidate_records
        ),
        "separate_catalog_locator_records": len(source["catalog_records"]),
        "catalog_locator_candidate_join_overlap_usage_ids": len(
            source["catalog_usage_ids"] & set(source["usage_candidate_paths"])
        ),
        "priority1_evidence_paths": sum(
            record["priority1_evidence"]["applies"] for record in candidate_records
        ),
        "priority1_join_overlap": sum(
            record["priority1_evidence"]["applies"]
            and record["join_status"] == "accepted_exact_normalized_join"
            for record in candidate_records
        ),
        "responsive_assessment_cells": sum(
            len(record["responsive_assessment_cells"]) for record in scene_records
        ),
        "additive_92_path_claim": False,
    }
    return {
        "schema_version": "apk-asset-forensics.phase4-join-scaffold.v1",
        "track_id": "apk_existing_asset_candidate_audit_20260712",
        "phase": "phase4",
        "status": "decision-free-contract-scaffold",
        "input_binding": {
            "phase4_input_freeze_path": str(FREEZE_PATH.relative_to(REPO)),
            "phase4_input_freeze_sha256": digest(FREEZE_PATH),
            "phase4_source_registry_path": str(
                source["registry_path"].relative_to(REPO)
            ),
            "phase4_source_registry_sha256": digest(source["registry_path"]),
            "phase4_browser_evidence_path": str(
                source["browser_evidence_path"].relative_to(REPO)
            ),
            "phase4_browser_evidence_sha256": digest(
                source["browser_evidence_path"]
            ),
        },
        "counts": counts,
        "candidate_records": candidate_records,
        "scene_usage_records": scene_records,
        "catalog_or_non_scene_usage_records": non_scene_records,
        "catalog_locator_records": sorted(
            source["catalog_records"],
            key=lambda record: record["accepted_evidence_envelope"]["usage_id"],
        ),
        "disclosures": [
            "This scaffold makes no suitability, disposition, replacement, retirement, acceptance, production, or shipping decision.",
            "The 85 accepted normalized candidate-path joins and 7 catalog locator records remain separate grains and are not a 92-path denominator.",
            "Every unproven join and every responsive/theme assessment remains blocked_unknown.",
            "Priority-1 evidence routing identifies exact accepted Phase 3 evidence only; disposition remains unassigned.",
        ],
    }


def validate_scaffold(document: dict) -> None:
    """Validate exact denominators, grains, bindings, and decision-free defaults."""
    source = load_frozen_sources()
    require(
        document.get("schema_version")
        == "apk-asset-forensics.phase4-join-scaffold.v1"
        and document.get("status") == "decision-free-contract-scaffold",
        "Phase 4 scaffold identity differs",
    )
    records = document.get("candidate_records")
    require(isinstance(records, list), "candidate records are malformed")
    paths = [record.get("canonical_path") for record in records]
    require(
        len(paths) == 428
        and len(set(paths)) == 428
        and set(paths) == set(source["candidates"]),
        "candidate path denominator differs",
    )
    caller_ids = [
        locator.get("locator_id")
        for record in records
        for locator in record.get("caller_locators", [])
    ]
    expected_caller_ids = {
        locator["locator_id"]
        for candidate in source["candidates"].values()
        for locator in candidate["caller_locators"]
    }
    require(
        len(caller_ids) == 533
        and len(set(caller_ids)) == 533
        and set(caller_ids) == expected_caller_ids,
        "caller locator denominator differs",
    )
    record_by_path = {record["canonical_path"]: record for record in records}
    for canonical_path, frozen in source["candidates"].items():
        record = record_by_path[canonical_path]
        require(
            record.get("duplicate_path_peers") == frozen["duplicate_path_peers"],
            f"duplicate peer contract differs: {canonical_path}",
        )
        for caller_field in (
            "derived_public_url",
            "dynamic_risk",
            "static_reference_status",
            "unknown_rationale",
        ):
            require(
                record.get(caller_field) == frozen[caller_field],
                f"candidate caller-status field differs: {canonical_path}",
            )
        accepted = source["accepted_by_candidate"].get(canonical_path)
        expected_join_status = (
            "accepted_exact_normalized_join" if accepted else "blocked_unknown"
        )
        require(
            record.get("join_status") == expected_join_status
            and record.get("accepted_usage_ids")
            == (accepted["accepted_usage_ids"] if accepted else [])
            and record.get("accepted_join_caller_locator_ids")
            == (accepted["accepted_join_caller_locator_ids"] if accepted else []),
            f"candidate accepted-join binding differs: {canonical_path}",
        )
        priority1 = source["priority1_by_path"].get(canonical_path, [])
        require(
            record.get("priority1_evidence")
            == {
                "applies": bool(priority1),
                "status": (
                    "exact_accepted_phase3_evidence"
                    if priority1
                    else "not_established"
                ),
                "evidence": priority1,
                "disposition_decided": False,
            },
            f"priority1 evidence routing differs: {canonical_path}",
        )
        require(
            record.get("disposition")
            == {
                "status": "unassigned",
                "value": None,
                "replacement_action": None,
            },
            f"decision-free disposition differs: {canonical_path}",
        )
        require(
            record.get("canonical_standard_pack_candidate_key")
            == {"status": "forbidden-pending-T9", "value": None},
            f"canonical standard-pack key boundary differs: {canonical_path}",
        )
        require(
            record.get("direct_legacy_adoption") is False,
            f"direct legacy adoption is forbidden: {canonical_path}",
        )
        semantic = record.get("semantic_replacement_requirements")
        require(
            semantic
            == {
                "status": "blocked_unknown",
                "value": None,
                "evidence": None,
                "required_if_exact_join": bool(accepted),
            },
            f"semantic replacement scaffold differs: {canonical_path}",
        )

    scene_records = document.get("scene_usage_records")
    non_scene_records = document.get("catalog_or_non_scene_usage_records")
    require(
        isinstance(scene_records, list) and len(scene_records) == 65,
        "scene usage denominator differs",
    )
    require(
        isinstance(non_scene_records, list) and len(non_scene_records) == 22,
        "catalog or non-scene usage denominator differs",
    )
    usage_records = scene_records + non_scene_records
    require(
        len({record.get("usage_id") for record in usage_records}) == 87
        and {record["usage_id"] for record in usage_records} == set(source["usages"]),
        "normalized usage denominator differs",
    )
    expected_pairs = {(viewport, theme) for viewport in VIEWPORTS for theme in THEMES}
    for record in usage_records:
        usage_id = record["usage_id"]
        normalized = source["usages"][usage_id]["normalized_usage"]
        candidate_paths = sorted(source["usage_candidate_paths"].get(usage_id, []))
        if candidate_paths:
            expected_status = "accepted_exact_normalized_join"
        else:
            expected_status = "blocked_unknown"
        require(
            record.get("candidate_paths") == candidate_paths
            and record.get("join_status") == expected_status,
            f"usage join binding differs: {usage_id}",
        )
        cells = record.get("responsive_assessment_cells")
        if normalized.get("surface_kind") == "scene":
            require(
                isinstance(cells, list)
                and len(cells) == 4
                and {(cell.get("viewport"), cell.get("theme")) for cell in cells}
                == expected_pairs,
                f"responsive assessment matrix differs: {usage_id}",
            )
            for cell in cells:
                require(
                    cell.get("status") == "blocked_unknown"
                    and cell.get("evidence") is None
                    and cell.get("assessment") is None
                    and cell.get("fields")
                    == {field: None for field in SCENE_FIELDS},
                    f"responsive assessment cell is not blocked: {usage_id}",
                )
        else:
            require(
                cells == [],
                f"catalog or non-scene responsive assessment differs: {usage_id}",
            )
    catalog_records = document.get("catalog_locator_records")
    expected_catalog_records = sorted(
        source["catalog_records"],
        key=lambda record: record["accepted_evidence_envelope"]["usage_id"],
    )
    require(
        catalog_records == expected_catalog_records
        and len(catalog_records) == 7
        and all(
            "candidate_path" not in record and "candidate_paths" not in record
            for record in catalog_records
        ),
        "catalog locator grain differs",
    )

    expected_counts = {
        "candidate_paths": 428,
        "identical_hash_groups": 227,
        "caller_locators": 533,
        "scene_usage_records": 65,
        "catalog_or_non_scene_usage_records": 22,
        "accepted_normalized_candidate_path_joins": 85,
        "separate_catalog_locator_records": 7,
        "catalog_locator_candidate_join_overlap_usage_ids": 3,
        "priority1_evidence_paths": 14,
        "priority1_join_overlap": 0,
        "responsive_assessment_cells": 260,
        "additive_92_path_claim": False,
    }
    require(document.get("counts") == expected_counts, "scaffold counts differ")


def main() -> None:
    """Check the deterministic scaffold or write its official JSON rendering."""
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    document = render_scaffold()
    validate_scaffold(document)
    if args.execute:
        OUTPUT_PATH.write_text(
            json.dumps(document, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(f"WROTE: {OUTPUT_PATH.relative_to(REPO)}")
    else:
        print(
            "READY: 428 candidate paths, 533 caller locators, 85 accepted "
            "candidate-path joins, 7 separate catalog locators, 14 priority-1 "
            "evidence paths, and 87 usage-grain records validate; no decisions written"
        )


if __name__ == "__main__":
    main()
