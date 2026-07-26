#!/usr/bin/env python3
"""Generate the deterministic, non-consumable T8 Phase 5 candidate artifacts."""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Any


TRACK_ID = "apk_existing_asset_candidate_audit_20260712"
TRACK = Path(__file__).resolve().parent
REPO = TRACK.parents[2]
BATCH_IDS = tuple(f"AF-{index:02d}" for index in range(1, 13))
STATUS = "NON_CONSUMABLE_PENDING_INDEPENDENT_REVIEW_AND_ROOT_ACCEPTANCE"
REPORT_PATH = TRACK / "phase5-candidate-report-v1.json"
MANIFEST_PATH = TRACK / "phase5-candidate-manifest-non-consumable-v1.json"
RECEIPT_PATH = TRACK / "role-receipts/phase5/report-manifest-producer.json"

MECHANICAL_TOP_KEYS = {
    "schema_version",
    "track_id",
    "batch_id",
    "input_binding",
    "producer",
    "records",
    "resource_usage",
}
MECHANICAL_RECORD_KEYS = {
    "canonical_path",
    "sha256",
    "revision",
    "source_blob_oid",
    "file_kind",
    "byte_size",
    "format",
    "mime_type",
    "detected_format",
    "detected_mime_type",
    "flags",
    "type_specific",
}
CALLER_TOP_KEYS = MECHANICAL_TOP_KEYS | {"scan_contract"}
CALLER_RECORD_KEYS = {
    "canonical_path",
    "current_callers",
    "derived_public_url",
    "duplicate_path_peers",
    "dynamic_risk",
    "identical_hash_group",
    "revision",
    "sha256",
    "source_blob_oid",
    "static_reference_status",
    "unknown_rationale",
}
PROVENANCE_TOP_KEYS = MECHANICAL_TOP_KEYS
PROVENANCE_RECORD_KEYS = {
    "canonical_path",
    "sha256",
    "revision",
    "source_blob_oid",
    "identical_hash_group",
    "repository_introduction",
    "upstream_provenance",
    "license",
    "prospective_eligibility",
}
INSPECTION_TOP_KEYS = {
    "schema_version",
    "track_id",
    "batch_id",
    "input_binding",
    "producer",
    "groups",
}
INSPECTION_GROUP_KEYS = {
    "identical_hash_group",
    "sha256",
    "media_class",
    "member_paths",
    "inspection_source",
    "inspection",
}
INSPECTION_SOURCE_GROUP_KEYS = {
    "identical_hash_group",
    "sha256",
    "media_class",
    "inspection_source",
    "member_sources",
}
PHASE4_RECORD_BASE_KEYS = {
    "canonical_path",
    "sha256",
    "identical_hash_group",
    "duplicate_path_peers",
    "derived_public_url",
    "static_reference_status",
    "dynamic_risk",
    "unknown_rationale",
    "caller_locators",
    "join_status",
    "accepted_usage_ids",
    "accepted_join_caller_locator_ids",
    "usage_links",
    "provenance",
    "priority1_evidence",
    "semantic_replacement_requirements",
    "disposition",
    "eligibility",
    "canonical_standard_pack_candidate_key",
    "direct_legacy_adoption",
}
REPORT_RECORD_KEYS_WITHOUT_HASH = {
    "record_index",
    "canonical_path",
    "asset_sha256",
    "identical_hash_group",
    "batch_id",
    "mechanical_metadata",
    "caller_inventory",
    "provenance_license_eligibility",
    "substantive_inspection",
    "phase4_join",
    "phase4_group_rollup_pointer",
    "evidence_pointers",
}

GLOBAL_SOURCE_FILES = {
    "phase0-freeze": (
        "phase0-input-freeze-v1.json",
        "phase0-adversarial-review-v2.json",
        "phase0-red-test-report-v1.json",
        "phase0-denominator-delta-disposition-v1.json",
    ),
    "phase1-acceptance": (
        "phase1-green-test-report-v1.json",
        "phase1-root-acceptance.json",
    ),
    "phase2-freeze-acceptance": (
        "phase2-input-freeze-v1.json",
        "phase2-root-acceptance.json",
    ),
    "phase3-freeze-acceptance": (
        "phase3-input-freeze-v1.json",
        "phase3-root-acceptance.json",
        "phase3-root-direct-fitness-review.json",
        "phase3-reviews/AF-01-04.json",
        "phase3-reviews/AF-05-08.json",
        "phase3-reviews/AF-09-12.json",
    ),
    "phase4-freeze-acceptance": (
        "phase4-source-registry-v1.json",
        "phase4-input-freeze-v1.json",
        "phase4-join-scaffold-v1.json",
        "phase4-browser-evidence-freeze-v1.json",
        "phase4-global-fixture-manifest-v1.json",
        "phase4-global-review-v4.json",
        "phase4-global-test-report.json",
        "phase4-acceptance-green-report.json",
        "phase4-root-acceptance.json",
    ),
    "role-policy": ("role-applicability-matrix-v1.json",),
    "inspection-primary-evidence": (
        "inspection-working-notes/AF-01-04-classification.json",
        "inspection-working-notes/AF-01-04-visual.json",
        "inspection-working-notes/AF-05-08-classification.json",
        "inspection-working-notes/AF-05-08-visual.json",
        "inspection-working-notes/AF-09-12-classification.json",
        "inspection-working-notes/AF-09-12-visual.json",
        "inspection-working-notes/audio-multimodal-independent-review.json",
        "inspection-working-notes/audio-multimodal.json",
        "inspection-working-notes/audio-review-reconciliation.json",
        "inspection-working-notes/audio-targeted-follow-up-2da344189f4831c130645d8396df434a9b35007d2cef98244632bb35e8a83cb3.json",
        "inspection-working-notes/audio-targeted-follow-up-d9c3c6b425e40eeb5c167d47832aa979833ff1cb632d58b040043d8479cf238c.json",
        "inspection-working-notes/text-data.json",
        "inspection-working-notes/unreadable-pointer.json",
    ),
    "global-role-receipts": (
        "role-receipts/phase0/discovery-auditor.json",
        "role-receipts/phase1/caller-analyst.json",
        "role-receipts/phase1/evidence-collector.json",
        "role-receipts/phase1/mechanical-metadata-inspector.json",
        "role-receipts/phase1/truth-test-author.json",
        "role-receipts/phase2/truth-test-author.json",
        "role-receipts/phase4-global/adversarial-reviewer-v4.json",
        "role-receipts/phase4-global/phase4-acceptance-test-author.json",
        "role-receipts/phase4-global/truth-test-author.json",
    ),
}
BATCH_SOURCE_NAMES = (
    "mechanical-metadata.json",
    "caller-inventory.json",
    "provenance-audit.json",
    "inspection-source-manifest.json",
    "inspection-records.json",
    "phase4-path-usage-joins.json",
    "phase4-group-rollup.json",
)
BATCH_RECEIPT_NAMES = (
    "adversarial-reviewer.json",
    "provenance-auditor.json",
    "visual-audio-inspector.json",
    "requirements-mapper.json",
    "truth-test-author.json",
    "phase4-adversarial-reviewer.json",
)


def require(condition: bool, message: str) -> None:
    """Raise a stable contract error when one required condition is false."""
    if not condition:
        raise AssertionError(message)


def repo_relative(path: Path) -> str:
    """Return one path relative to the repository root."""
    return path.relative_to(REPO).as_posix()


def sha256_bytes(value: bytes) -> str:
    """Return the SHA-256 digest of byte content."""
    return hashlib.sha256(value).hexdigest()


def digest(path: Path) -> str:
    """Return the SHA-256 digest of one file."""
    return sha256_bytes(path.read_bytes())


def canonical_json_bytes(value: Any) -> bytes:
    """Serialize a JSON-compatible value for stable embedded object hashing."""
    return json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")


def object_digest(value: Any) -> str:
    """Return the canonical JSON SHA-256 digest of one value."""
    return sha256_bytes(canonical_json_bytes(value))


def load_object(path: Path) -> dict[str, Any]:
    """Load one JSON object and reject malformed roots."""
    require(path.is_file(), f"required source is missing: {repo_relative(path)}")
    value = json.loads(path.read_text(encoding="utf-8"))
    require(isinstance(value, dict), f"JSON root is not an object: {repo_relative(path)}")
    return value


def require_exact_keys(value: dict[str, Any], expected: set[str], label: str) -> None:
    """Reject any missing or unexpected keys at one schema boundary."""
    actual = set(value)
    require(
        actual == expected,
        f"{label} schema differs: missing={sorted(expected - actual)} "
        f"extra={sorted(actual - expected)}",
    )


def source_binding(path: Path, category: str) -> dict[str, Any]:
    """Render the immutable digest and size binding for one input artifact."""
    content = path.read_bytes()
    return {
        "path": repo_relative(path),
        "sha256": sha256_bytes(content),
        "byte_size": len(content),
        "category": category,
    }


def collect_source_bindings() -> list[dict[str, Any]]:
    """Collect every Phase 0-4 source and role receipt consumed by publication."""
    categorized: dict[str, str] = {}

    def add(relative: str, category: str) -> None:
        """Add one source path while rejecting category collisions."""
        full_relative = (
            relative
            if relative.startswith("measure/")
            else f"{repo_relative(TRACK)}/{relative}"
        )
        previous = categorized.get(full_relative)
        require(
            previous is None or previous == category,
            f"source category collision: {full_relative}",
        )
        categorized[full_relative] = category

    for category, relatives in GLOBAL_SOURCE_FILES.items():
        for relative in relatives:
            add(relative, category)
    for batch_id in BATCH_IDS:
        for name in BATCH_SOURCE_NAMES:
            add(f"batches/{batch_id}/{name}", f"{batch_id}-source")
        for name in BATCH_RECEIPT_NAMES:
            add(f"role-receipts/{batch_id}/{name}", f"{batch_id}-role-receipt")

    bindings = []
    for relative, category in sorted(categorized.items()):
        path = REPO / relative
        load_object(path)
        bindings.append(source_binding(path, category))
    return bindings


def validate_acceptance_chain() -> tuple[dict[str, Any], dict[str, Any]]:
    """Validate the exact Phase 0-4 denominator and acceptance gate chain."""
    phase0 = load_object(TRACK / "phase0-input-freeze-v1.json")
    require(
        phase0.get("schema_version") == "apk-asset-forensics.phase0-input-freeze.v1",
        "Phase 0 input freeze schema differs",
    )
    frozen = phase0.get("denominator", {})
    batch_strategy = phase0.get("batch_strategy", {})
    require(
        frozen.get("candidate_paths") == 428
        and frozen.get("identical_hash_groups") == 227
        and batch_strategy.get("batch_count") == 12
        and len(batch_strategy.get("batches", [])) == 12,
        "Phase 0 frozen denominator differs",
    )

    phase1 = load_object(TRACK / "phase1-root-acceptance.json")
    require(
        phase1.get("schema_version")
        == "apk-asset-forensics.phase1-root-acceptance.v1"
        and phase1.get("decision") == "accepted"
        and phase1.get("denominator")
        == {"candidate_paths": 428, "identical_hash_groups": 227, "batches": 12}
        and phase1.get("caller_findings", {}).get("eligible_locators") == 533,
        "Phase 1 root acceptance differs",
    )

    phase2 = load_object(TRACK / "phase2-root-acceptance.json")
    require(
        phase2.get("schema_version")
        == "apk-asset-forensics.phase2-root-acceptance.v1"
        and phase2.get("decision") == "accepted"
        and phase2.get("denominator")
        == {"candidate_paths": 428, "identical_hash_groups": 227, "batches": 12},
        "Phase 2 root acceptance differs",
    )

    phase3 = load_object(TRACK / "phase3-root-acceptance.json")
    require(
        phase3.get("schema_version")
        == "apk-asset-forensics.phase3-root-acceptance.v1"
        and phase3.get("decision") == "ACCEPT_PHASE3"
        and phase3.get("accepted_denominator", {}).get("candidate_paths") == 428
        and phase3.get("accepted_denominator", {}).get("identical_hash_groups") == 227,
        "Phase 3 root acceptance differs",
    )

    phase4 = load_object(TRACK / "phase4-root-acceptance.json")
    expected_reconciliation = {
        "accepted_path_usage_links": 85,
        "caller_locators": 533,
        "candidate_paths": 428,
        "dispositions": {"reject": 14, "replace": 85, "unknown": 329},
        "identical_hash_groups": 227,
        "non_scene_links": 8,
        "priority1_paths": 14,
        "responsive_assessment_cells": 308,
        "scene_links": 77,
        "unique_non_scene_usage_ids": 5,
        "unique_scene_usage_ids": 40,
        "unique_usage_ids": 45,
    }
    require(
        phase4.get("schema_version")
        == "apk-asset-forensics.phase4-root-acceptance.v1"
        and phase4.get("decision") == "ACCEPT_PHASE4"
        and phase4.get("accepted_reconciliation") == expected_reconciliation
        and phase4.get("next_gate")
        == {
            "name": "Independent acceptance",
            "only_next_gate": True,
            "phase": 5,
            "status": "OPEN_PHASE5_ONLY",
        },
        "Phase 4 root acceptance identity or reconciliation differs",
    )
    require(
        all(not values for values in phase4.get("blocking_findings", {}).values()),
        "Phase 4 root acceptance contains blocking findings",
    )
    defects = phase4.get("browser_and_direct_visual_review", {}).get(
        "usability_defect_disclosures"
    )
    require(isinstance(defects, list) and len(defects) == 6, "browser defect set differs")

    green = load_object(TRACK / "phase4-acceptance-green-report.json")
    require(
        green.get("schema_version")
        == "apk-asset-forensics.phase4-acceptance-test-report.v1"
        and green.get("final_status") == "acceptance-contract-pass"
        and green.get("production", {}).get("passed") is True
        and green.get("all_counterexamples_rejected") is True,
        "Phase 4 acceptance green gate differs",
    )
    require(
        green.get("required_acceptance") == repo_relative(TRACK / "phase4-root-acceptance.json"),
        "Phase 4 green gate acceptance path differs",
    )
    return phase4, green


def validate_batch_document(
    document: dict[str, Any],
    batch_id: str,
    top_keys: set[str],
    schema_version: str,
    collection_key: str,
    record_keys: set[str],
    label: str,
) -> None:
    """Validate one uniform Phase 1-3 batch document and its record schema."""
    require_exact_keys(document, top_keys, f"{batch_id} {label}")
    require(
        document.get("track_id") == TRACK_ID
        and document.get("batch_id") == batch_id
        and document.get("schema_version") == schema_version,
        f"{batch_id} {label} identity differs",
    )
    records = document.get(collection_key)
    require(isinstance(records, list), f"{batch_id} {label} collection differs")
    for index, record in enumerate(records):
        require(isinstance(record, dict), f"{batch_id} {label} record {index} differs")
        require_exact_keys(record, record_keys, f"{batch_id} {label} record {index}")


def load_batches() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Load, cross-bind, and merge all accepted Phase 1-4 batch records."""
    merged: dict[str, dict[str, Any]] = {}
    group_paths: dict[str, list[str]] = {}
    group_rollup_pointers: dict[tuple[str, str], dict[str, Any]] = {}
    all_rollup_groups: list[dict[str, Any]] = []

    for batch_id in BATCH_IDS:
        batch_dir = TRACK / "batches" / batch_id
        paths = {
            name: batch_dir / f"{name}.json"
            for name in (
                "mechanical-metadata",
                "caller-inventory",
                "provenance-audit",
                "inspection-source-manifest",
                "inspection-records",
                "phase4-path-usage-joins",
                "phase4-group-rollup",
            )
        }
        documents = {name: load_object(path) for name, path in paths.items()}

        validate_batch_document(
            documents["mechanical-metadata"],
            batch_id,
            MECHANICAL_TOP_KEYS,
            "apk-asset-forensics.phase1-mechanical-metadata.v1",
            "records",
            MECHANICAL_RECORD_KEYS,
            "mechanical metadata",
        )
        validate_batch_document(
            documents["caller-inventory"],
            batch_id,
            CALLER_TOP_KEYS,
            "apk-asset-forensics.phase1-caller-inventory.v4",
            "records",
            CALLER_RECORD_KEYS,
            "caller inventory",
        )
        validate_batch_document(
            documents["provenance-audit"],
            batch_id,
            PROVENANCE_TOP_KEYS,
            "apk-asset-forensics.phase2-provenance-audit.v1",
            "records",
            PROVENANCE_RECORD_KEYS,
            "provenance audit",
        )
        validate_batch_document(
            documents["inspection-records"],
            batch_id,
            INSPECTION_TOP_KEYS,
            "apk-asset-forensics.phase3-inspection-records.v1",
            "groups",
            INSPECTION_GROUP_KEYS,
            "inspection records",
        )
        validate_batch_document(
            documents["inspection-source-manifest"],
            batch_id,
            INSPECTION_TOP_KEYS,
            "apk-asset-forensics.phase3-inspection-source-manifest.v1",
            "groups",
            INSPECTION_SOURCE_GROUP_KEYS,
            "inspection source manifest",
        )

        joins = documents["phase4-path-usage-joins"]
        expected_join_version = (
            "apk-asset-forensics.phase4-path-usage-joins.v1"
            if batch_id in {"AF-01", "AF-02", "AF-03"}
            else "apk-asset-forensics.phase4-path-usage-joins.v2"
        )
        expected_join_status = {
            "AF-01": "producer-complete-pending-truth-test-independent-review-and-root-acceptance",
            "AF-02": "non_accepted_candidate_mapping",
            "AF-03": "producer-complete-pending-truth-test-review-root",
        }.get(batch_id, "mapped_pending_independent_truth_test_review_and_root_acceptance")
        require(
            joins.get("track_id") == TRACK_ID
            and joins.get("batch_id") == batch_id
            and joins.get("schema_version") == expected_join_version
            and joins.get("status") == expected_join_status,
            f"{batch_id} Phase 4 joins identity differs",
        )
        require(
            set(joins)
            in (
                {
                    "schema_version",
                    "track_id",
                    "phase",
                    "batch_id",
                    "role",
                    "status",
                    "input_binding",
                    "review_slices",
                    "policy_application",
                    "records",
                    "counts",
                    "disclosures",
                },
                {
                    "schema_version",
                    "track_id",
                    "scope",
                    "batch_id",
                    "role",
                    "status",
                    "input_binding",
                    "review_slices",
                    "records",
                    "counts",
                },
            ),
            f"{batch_id} Phase 4 joins top-level schema differs",
        )
        join_records = joins.get("records")
        require(isinstance(join_records, list), f"{batch_id} Phase 4 records differ")
        expected_phase4_keys = PHASE4_RECORD_BASE_KEYS | (
            {"inspection_binding"} if batch_id == "AF-01" else set()
        )
        for index, record in enumerate(join_records):
            require(isinstance(record, dict), f"{batch_id} Phase 4 record {index} differs")
            require_exact_keys(
                record,
                expected_phase4_keys,
                f"{batch_id} Phase 4 record {index}",
            )

        rollup = documents["phase4-group-rollup"]
        expected_rollup_version = (
            "apk-asset-forensics.phase4-group-rollup.v1"
            if batch_id in {"AF-01", "AF-02", "AF-03"}
            else "apk-asset-forensics.phase4-group-rollup.v2"
        )
        require(
            rollup.get("track_id") == TRACK_ID
            and rollup.get("batch_id") == batch_id
            and rollup.get("schema_version") == expected_rollup_version
            and isinstance(rollup.get("groups"), list),
            f"{batch_id} Phase 4 group rollup identity differs",
        )
        for index, group in enumerate(rollup["groups"]):
            require(isinstance(group, dict), f"{batch_id} rollup group {index} differs")
            group_id = group.get("identical_hash_group")
            require(isinstance(group_id, str), f"{batch_id} rollup group ID differs")
            key = (batch_id, group_id)
            require(key not in group_rollup_pointers, f"duplicate rollup group: {key}")
            group_rollup_pointers[key] = {
                "path": repo_relative(paths["phase4-group-rollup"]),
                "sha256": digest(paths["phase4-group-rollup"]),
                "json_pointer": f"/groups/{index}",
            }
            all_rollup_groups.append(group)

        sources_by_group = {
            group["identical_hash_group"]: group
            for group in documents["inspection-source-manifest"]["groups"]
        }
        inspections_by_group = {
            group["identical_hash_group"]: group
            for group in documents["inspection-records"]["groups"]
        }
        require(
            set(sources_by_group) == set(inspections_by_group),
            f"{batch_id} inspection group denominator differs",
        )
        for group_id, inspection in inspections_by_group.items():
            source = sources_by_group[group_id]
            require(
                inspection["sha256"] == source["sha256"]
                and inspection["media_class"] == source["media_class"]
                and inspection["inspection_source"] == source["inspection_source"]
                and inspection["member_paths"]
                == [member["canonical_path"] for member in source["member_sources"]],
                f"{batch_id} inspection source binding differs: {group_id}",
            )

        keyed: dict[str, dict[str, dict[str, Any]]] = {}
        for name in (
            "mechanical-metadata",
            "caller-inventory",
            "provenance-audit",
            "phase4-path-usage-joins",
        ):
            keyed[name] = {}
            for record in documents[name]["records"]:
                canonical_path = record.get("canonical_path")
                require(
                    isinstance(canonical_path, str)
                    and canonical_path not in keyed[name],
                    f"{batch_id} {name} path denominator differs",
                )
                keyed[name][canonical_path] = record
        path_set = set(keyed["mechanical-metadata"])
        require(
            all(set(values) == path_set for values in keyed.values()),
            f"{batch_id} cross-phase path denominator differs",
        )
        inspection_member_set = {
            path
            for group in inspections_by_group.values()
            for path in group["member_paths"]
        }
        require(
            inspection_member_set == path_set,
            f"{batch_id} inspection member path denominator differs",
        )

        hashes = {name: digest(path) for name, path in paths.items()}
        for canonical_path in sorted(path_set):
            require(canonical_path not in merged, f"duplicate candidate path: {canonical_path}")
            mechanical = keyed["mechanical-metadata"][canonical_path]
            caller = keyed["caller-inventory"][canonical_path]
            provenance = keyed["provenance-audit"][canonical_path]
            phase4 = keyed["phase4-path-usage-joins"][canonical_path]
            group_id = caller["identical_hash_group"]
            inspection = inspections_by_group.get(group_id)
            require(inspection is not None, f"inspection group missing: {canonical_path}")
            require(
                mechanical["sha256"]
                == caller["sha256"]
                == provenance["sha256"]
                == phase4["sha256"]
                == inspection["sha256"]
                and group_id
                == provenance["identical_hash_group"]
                == phase4["identical_hash_group"]
                == inspection["identical_hash_group"],
                f"cross-phase hash/group binding differs: {canonical_path}",
            )
            require(
                phase4["duplicate_path_peers"] == caller["duplicate_path_peers"]
                and phase4["derived_public_url"] == caller["derived_public_url"]
                and phase4["dynamic_risk"] == caller["dynamic_risk"]
                and phase4["static_reference_status"]
                == caller["static_reference_status"]
                and phase4["unknown_rationale"] == caller["unknown_rationale"],
                f"Phase 4 caller envelope differs: {canonical_path}",
            )
            expected_provenance = {
                "repository_introduction": provenance["repository_introduction"],
                "upstream_provenance": provenance["upstream_provenance"],
                "license": provenance["license"],
                "prospective_eligibility": provenance["prospective_eligibility"],
            }
            require(
                phase4["provenance"] == expected_provenance,
                f"Phase 4 provenance envelope differs: {canonical_path}",
            )
            require(
                phase4["canonical_standard_pack_candidate_key"].get("value") is None
                and phase4["direct_legacy_adoption"] is False,
                f"forbidden T9 key or direct adoption appears: {canonical_path}",
            )
            for locator in phase4["caller_locators"]:
                pointer = locator.get("caller_inventory_json_pointer")
                require(
                    locator.get("caller_inventory_path")
                    == repo_relative(paths["caller-inventory"])
                    and locator.get("caller_inventory_sha256")
                    == hashes["caller-inventory"]
                    and isinstance(pointer, str),
                    f"caller locator source binding differs: {canonical_path}",
                )
                components = pointer.strip("/").split("/")
                require(
                    len(components) == 4
                    and components[0] == "records"
                    and components[1].isdigit()
                    and components[2] == "current_callers"
                    and components[3].isdigit(),
                    f"caller locator pointer differs: {canonical_path}",
                )
                source_record = documents["caller-inventory"]["records"][int(components[1])]
                source_caller = source_record["current_callers"][int(components[3])]
                require(
                    source_record["canonical_path"] == canonical_path
                    and {
                        key: locator[key]
                        for key in source_caller
                    }
                    == source_caller,
                    f"caller locator content differs: {canonical_path}",
                )

            group_paths.setdefault(group_id, []).append(canonical_path)
            inspection_index = documents["inspection-records"]["groups"].index(inspection)
            source_index = documents["inspection-source-manifest"]["groups"].index(
                sources_by_group[group_id]
            )
            provenance_envelope = {
                **expected_provenance,
                "eligibility": phase4["eligibility"],
            }
            record_without_hash = {
                "record_index": None,
                "canonical_path": canonical_path,
                "asset_sha256": mechanical["sha256"],
                "identical_hash_group": group_id,
                "batch_id": batch_id,
                "mechanical_metadata": mechanical,
                "caller_inventory": caller,
                "provenance_license_eligibility": provenance_envelope,
                "substantive_inspection": inspection,
                "phase4_join": phase4,
                "phase4_group_rollup_pointer": group_rollup_pointers[(batch_id, group_id)],
                "evidence_pointers": {
                    "mechanical_metadata": {
                        "path": repo_relative(paths["mechanical-metadata"]),
                        "sha256": hashes["mechanical-metadata"],
                        "json_pointer": (
                            f"/records/{documents['mechanical-metadata']['records'].index(mechanical)}"
                        ),
                    },
                    "caller_inventory": {
                        "path": repo_relative(paths["caller-inventory"]),
                        "sha256": hashes["caller-inventory"],
                        "json_pointer": (
                            f"/records/{documents['caller-inventory']['records'].index(caller)}"
                        ),
                    },
                    "provenance_audit": {
                        "path": repo_relative(paths["provenance-audit"]),
                        "sha256": hashes["provenance-audit"],
                        "json_pointer": (
                            f"/records/{documents['provenance-audit']['records'].index(provenance)}"
                        ),
                    },
                    "inspection_source_manifest": {
                        "path": repo_relative(paths["inspection-source-manifest"]),
                        "sha256": hashes["inspection-source-manifest"],
                        "json_pointer": f"/groups/{source_index}",
                    },
                    "inspection_records": {
                        "path": repo_relative(paths["inspection-records"]),
                        "sha256": hashes["inspection-records"],
                        "json_pointer": f"/groups/{inspection_index}",
                    },
                    "phase4_path_usage_joins": {
                        "path": repo_relative(paths["phase4-path-usage-joins"]),
                        "sha256": hashes["phase4-path-usage-joins"],
                        "json_pointer": (
                            f"/records/{documents['phase4-path-usage-joins']['records'].index(phase4)}"
                        ),
                    },
                },
            }
            require_exact_keys(
                record_without_hash,
                REPORT_RECORD_KEYS_WITHOUT_HASH,
                f"report record pre-hash {canonical_path}",
            )
            merged[canonical_path] = record_without_hash

    require(len(merged) == 428, "merged candidate denominator differs")
    require(len(group_paths) == 227, "merged group denominator differs")
    require(len(group_rollup_pointers) == 227, "Phase 4 rollup denominator differs")
    for canonical_path, record in merged.items():
        expected_peers = sorted(
            path
            for path in group_paths[record["identical_hash_group"]]
            if path != canonical_path
        )
        require(
            record["caller_inventory"]["duplicate_path_peers"] == expected_peers,
            f"duplicate peer reconciliation differs: {canonical_path}",
        )

    records = []
    for index, canonical_path in enumerate(sorted(merged)):
        record = merged[canonical_path]
        record["record_index"] = index
        record["record_sha256"] = object_digest(record)
        records.append(record)
    return records, all_rollup_groups


def reconcile_records(
    records: list[dict[str, Any]],
    phase4_acceptance: dict[str, Any],
) -> dict[str, Any]:
    """Recompute and compare every required Phase 5 summary count."""
    caller_locators = sum(
        len(record["phase4_join"]["caller_locators"]) for record in records
    )
    usage_links = [
        link
        for record in records
        for link in record["phase4_join"]["usage_links"]
    ]
    scene_links = [
        link
        for link in usage_links
        if link["normalized_usage"]["surface_kind"] == "scene"
    ]
    non_scene_links = [
        link
        for link in usage_links
        if link["normalized_usage"]["surface_kind"] == "non_scene"
    ]
    responsive_cells = sum(
        len(link["responsive_assessment_cells"]) for link in usage_links
    )
    dispositions = Counter(
        record["phase4_join"]["disposition"]["value"] for record in records
    )
    priority1 = [
        record
        for record in records
        if record["phase4_join"]["priority1_evidence"]["applies"] is True
    ]
    summary = {
        "candidate_paths": len(records),
        "identical_hash_groups": len(
            {record["identical_hash_group"] for record in records}
        ),
        "caller_locators": caller_locators,
        "accepted_path_usage_links": {
            "total": len(usage_links),
            "scene": len(scene_links),
            "non_scene": len(non_scene_links),
        },
        "unique_usage_ids": {
            "total": len({link["usage_id"] for link in usage_links}),
            "scene": len({link["usage_id"] for link in scene_links}),
            "non_scene": len({link["usage_id"] for link in non_scene_links}),
        },
        "responsive_assessment_cells": responsive_cells,
        "dispositions": {
            "replace": dispositions["replace"],
            "reject": dispositions["reject"],
            "unknown": dispositions["unknown"],
        },
        "priority1": {
            "paths": len(priority1),
            "required_disposition": "reject",
            "required_replacement_action": "retire",
            "all_reconciled": all(
                record["phase4_join"]["disposition"].get("value") == "reject"
                and record["phase4_join"]["disposition"].get("replacement_action")
                == "retire"
                for record in priority1
            ),
        },
        "browser_usability_defects": len(
            phase4_acceptance["browser_and_direct_visual_review"][
                "usability_defect_disclosures"
            ]
        ),
    }
    expected = {
        "candidate_paths": 428,
        "identical_hash_groups": 227,
        "caller_locators": 533,
        "accepted_path_usage_links": {"total": 85, "scene": 77, "non_scene": 8},
        "unique_usage_ids": {"total": 45, "scene": 40, "non_scene": 5},
        "responsive_assessment_cells": 308,
        "dispositions": {"replace": 85, "reject": 14, "unknown": 329},
        "priority1": {
            "paths": 14,
            "required_disposition": "reject",
            "required_replacement_action": "retire",
            "all_reconciled": True,
        },
        "browser_usability_defects": 6,
    }
    require(summary == expected, f"Phase 5 reconciliation differs: {summary}")
    accepted = phase4_acceptance["accepted_reconciliation"]
    require(
        accepted["candidate_paths"] == summary["candidate_paths"]
        and accepted["identical_hash_groups"] == summary["identical_hash_groups"]
        and accepted["caller_locators"] == summary["caller_locators"]
        and accepted["accepted_path_usage_links"]
        == summary["accepted_path_usage_links"]["total"]
        and accepted["scene_links"] == summary["accepted_path_usage_links"]["scene"]
        and accepted["non_scene_links"]
        == summary["accepted_path_usage_links"]["non_scene"]
        and accepted["unique_usage_ids"] == summary["unique_usage_ids"]["total"]
        and accepted["unique_scene_usage_ids"] == summary["unique_usage_ids"]["scene"]
        and accepted["unique_non_scene_usage_ids"]
        == summary["unique_usage_ids"]["non_scene"]
        and accepted["responsive_assessment_cells"]
        == summary["responsive_assessment_cells"]
        and accepted["dispositions"] == {"reject": 14, "replace": 85, "unknown": 329}
        and accepted["priority1_paths"] == summary["priority1"]["paths"],
        "Phase 5 summary does not match Phase 4 root acceptance",
    )
    return summary


def render_report(
    records: list[dict[str, Any]],
    source_bindings: list[dict[str, Any]],
    phase4_acceptance: dict[str, Any],
    summary: dict[str, Any],
) -> dict[str, Any]:
    """Render the complete non-consumable candidate report."""
    phase4_path = TRACK / "phase4-root-acceptance.json"
    return {
        "schema_version": "apk-asset-forensics.phase5-candidate-report.v1",
        "track_id": TRACK_ID,
        "phase": 5,
        "artifact_status": STATUS,
        "consumer_guard": False,
        "scope_disclosures": [
            "This is a deterministic candidate report pending fresh independent review and root-orchestrator product-owner acceptance.",
            "It is non-consumable and does not accept, adopt, implement, produce, ship, or authorize any asset, ontology, T9 key, or successor work.",
            "Legacy paths remain evidence only; canonical standard-pack candidate keys remain null and direct legacy adoption remains false.",
            "Unknown source facts, suitability, runtime loading, and dispositions remain unknown or blocked exactly as recorded.",
            "Browser evidence is bounded composite-scene evidence and never per-path runtime-load, provenance, license, suitability, or adoption proof.",
        ],
        "phase4_root_acceptance_binding": {
            "path": repo_relative(phase4_path),
            "sha256": digest(phase4_path),
            "decision": phase4_acceptance["decision"],
            "next_gate_status": phase4_acceptance["next_gate"]["status"],
        },
        "source_artifact_bindings": source_bindings,
        "source_artifact_bindings_sha256": object_digest(source_bindings),
        "reconciliation_summary": summary,
        "browser_usability_defect_disclosures": phase4_acceptance[
            "browser_and_direct_visual_review"
        ]["usability_defect_disclosures"],
        "records": records,
    }


def render_manifest(
    records: list[dict[str, Any]],
    report_bytes: bytes,
    source_bindings_sha256: str,
    phase4_acceptance: dict[str, Any],
    summary: dict[str, Any],
) -> dict[str, Any]:
    """Render the compact non-consumable candidate manifest."""
    entries = []
    for record in records:
        phase4 = record["phase4_join"]
        key_contract = phase4["canonical_standard_pack_candidate_key"]
        require(
            key_contract.get("value") is None
            and key_contract.get("status") == "forbidden-pending-T9"
            and phase4["direct_legacy_adoption"] is False,
            f"manifest T9/adoption guard differs: {record['canonical_path']}",
        )
        entries.append(
            {
                "record_index": record["record_index"],
                "canonical_path": record["canonical_path"],
                "asset_sha256": record["asset_sha256"],
                "report_record_sha256": record["record_sha256"],
                "identical_hash_group": record["identical_hash_group"],
                "batch_id": record["batch_id"],
                "join_status": phase4["join_status"],
                "accepted_usage_ids": phase4["accepted_usage_ids"],
                "disposition": phase4["disposition"],
                "priority1_evidence": phase4["priority1_evidence"],
                "eligibility": phase4["eligibility"],
                "canonical_standard_pack_candidate_key": None,
                "direct_legacy_adoption": False,
            }
        )
    require(
        [entry["canonical_path"] for entry in entries]
        == sorted(entry["canonical_path"] for entry in entries),
        "manifest entries are not canonical-path sorted",
    )
    phase4_path = TRACK / "phase4-root-acceptance.json"
    return {
        "schema_version": (
            "apk-asset-forensics.phase5-candidate-manifest-non-consumable.v1"
        ),
        "track_id": TRACK_ID,
        "phase": 5,
        "status": STATUS,
        "consumer_guard": False,
        "scope_disclosures": [
            "No consumer may adopt, resolve, materialize, implement, ship, or treat this candidate manifest as accepted.",
            "Independent review and a later root-orchestrator acceptance bound to the exact report and manifest hashes are required before any accepted manifest can exist.",
            "Canonical standard-pack candidate keys remain absent and direct legacy adoption remains false for every entry.",
        ],
        "report_binding": {
            "path": repo_relative(REPORT_PATH),
            "sha256": sha256_bytes(report_bytes),
            "byte_size": len(report_bytes),
            "record_collection": "records",
            "record_count": 428,
        },
        "phase4_root_acceptance_binding": {
            "path": repo_relative(phase4_path),
            "sha256": digest(phase4_path),
            "decision": phase4_acceptance["decision"],
        },
        "source_artifact_bindings_sha256": source_bindings_sha256,
        "reconciliation_summary": summary,
        "entries": entries,
    }


def encode_document(value: dict[str, Any]) -> bytes:
    """Encode one published JSON document with stable formatting."""
    return (
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=False) + "\n"
    ).encode("utf-8")


def write_document(path: Path, content: bytes) -> None:
    """Write one generated document after ensuring its parent exists."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)


def render_receipt(
    report_bytes: bytes,
    manifest_bytes: bytes,
    source_bindings: list[dict[str, Any]],
    summary: dict[str, Any],
) -> dict[str, Any]:
    """Render the producer receipt with exact deterministic output hashes."""
    generator = Path(__file__).resolve()
    return {
        "schema_version": "apk-role-receipt.phase5-report-manifest-producer.v1",
        "track_id": TRACK_ID,
        "phase": 5,
        "role": "phase5-report-manifest-producer",
        "native_task_name": "/root/phase5_report_producer",
        "role_boundary": (
            "Deterministic candidate report and non-consumable compact manifest "
            "publication only; no testing, independent review, remediation, "
            "acceptance, accepted manifest, T9 authorization, adoption, or shipping."
        ),
        "final_status": "producer-complete-pending-independent-review-and-root-acceptance",
        "consumer_guard": False,
        "source_artifact_count": len(source_bindings),
        "source_artifact_bindings_sha256": object_digest(source_bindings),
        "phase4_root_acceptance": {
            "path": repo_relative(TRACK / "phase4-root-acceptance.json"),
            "sha256": digest(TRACK / "phase4-root-acceptance.json"),
        },
        "generator": {
            "path": repo_relative(generator),
            "sha256": digest(generator),
            "byte_size": generator.stat().st_size,
        },
        "outputs": {
            repo_relative(REPORT_PATH): {
                "sha256": sha256_bytes(report_bytes),
                "byte_size": len(report_bytes),
                "record_count": 428,
            },
            repo_relative(MANIFEST_PATH): {
                "sha256": sha256_bytes(manifest_bytes),
                "byte_size": len(manifest_bytes),
                "entry_count": 428,
            },
        },
        "reconciliation_summary": summary,
        "determinism": {
            "serialization": "UTF-8 JSON, two-space indent, LF terminator",
            "record_hash_serialization": (
                "UTF-8 canonical JSON with sorted keys and compact separators"
            ),
            "ordering": "canonical_path ascending",
            "wall_clock_fields": False,
        },
        "claims_not_made": [
            "independent-review-pass",
            "root-acceptance",
            "accepted-manifest",
            "consumer-adoption",
            "canonical-T9-key",
            "direct-legacy-adoption",
            "implementation",
            "production",
            "shipping",
        ],
    }


def main() -> None:
    """Validate all frozen inputs and publish the authorized Phase 5 artifacts."""
    phase4_acceptance, _green = validate_acceptance_chain()
    source_bindings = collect_source_bindings()
    records, _rollup_groups = load_batches()
    require(
        [record["canonical_path"] for record in records]
        == sorted(record["canonical_path"] for record in records),
        "report records are not canonical-path sorted",
    )
    summary = reconcile_records(records, phase4_acceptance)
    report = render_report(records, source_bindings, phase4_acceptance, summary)
    report_bytes = encode_document(report)
    manifest = render_manifest(
        records,
        report_bytes,
        report["source_artifact_bindings_sha256"],
        phase4_acceptance,
        summary,
    )
    manifest_bytes = encode_document(manifest)
    receipt = render_receipt(report_bytes, manifest_bytes, source_bindings, summary)
    receipt_bytes = encode_document(receipt)
    write_document(REPORT_PATH, report_bytes)
    write_document(MANIFEST_PATH, manifest_bytes)
    write_document(RECEIPT_PATH, receipt_bytes)
    print(
        json.dumps(
            {
                "status": STATUS,
                "records": len(records),
                "report_sha256": sha256_bytes(report_bytes),
                "manifest_sha256": sha256_bytes(manifest_bytes),
                "receipt_sha256": sha256_bytes(receipt_bytes),
            },
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
