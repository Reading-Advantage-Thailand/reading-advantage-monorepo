#!/usr/bin/env python3
"""Fail-closed AF-04 v2 schema contract and focused counterexample runner."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


TRACK = Path("measure/tracks/apk_existing_asset_candidate_audit_20260712")
BATCH = "AF-04"
JOINS = TRACK / "batches" / BATCH / "phase4-path-usage-joins.json"
ROLLUP = TRACK / "batches" / BATCH / "phase4-group-rollup.json"
MAPPER_RECEIPT = TRACK / "role-receipts" / BATCH / "requirements-mapper.json"
VALUE_VERIFIER = TRACK / "phase4_batch_contract_test.py"
VALUE_REPORT = TRACK / "phase4-batch-test-reports" / "AF-04.json"
V2_REPORT = TRACK / "phase4-v2-schema-test-reports" / "AF-04.json"
FINAL_DECISION = TRACK / "phase4-product-owner-decisions" / "AF-04-final-schema-cycle.json"
OVERRIDE = TRACK / "phase4-product-owner-decisions" / "AF-04-user-continuation-override.json"

EXPECTED_PRODUCER_HASHES = {
    str(JOINS): "08f3c820ad78dba42dfb36cdf1ca96291bc8e8850016ddc21b64e7968b7b3995",
    str(ROLLUP): "20f7cbf831f25f3523dc809db4132508d570e4d772338fa5afa35b744e5b9e14",
    str(MAPPER_RECEIPT): "812676d88eb9f3136237a3a44438db1ba7f34e59594aacbf834b73abee6e09b4",
}
EXPECTED_DECISION_HASHES = {
    str(FINAL_DECISION): "41c0dd590f3be7368b5ed761f44f9473d44b644c9a2160453554ece4874c667f",
    str(OVERRIDE): "7ab3354af2adf22cd13c522501d33fd157b166c987403ae685a03f5b9adf9e0e",
}
ARCHIVE_HASHES = {
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/truth-test-report-cycle-1.json"): "150d7292983bbf09e175e1c77b558a16f338408d33a1a0ce80064a60506768da",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/truth-test-receipt-cycle-1.json"): "7a6c369bdd46603bbc0ac46665619820f26666bf2fc168115c3b6a61dd97427c",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/cycle-2/phase4-path-usage-joins.json"): "cf0f48973eb71c609fe784cdaf945152a3e92939471c6af83ae39eefbc01a439",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/cycle-2/phase4-group-rollup.json"): "ee7e21803c3071736e3278e52910438fcbe8b625f6a0dd02d06f0e2f5c37ddc0",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/cycle-2/requirements-mapper.json"): "e21cceab0a0ff4cb58497d54d75a204495d9adc5e91cd08f4cb8893b536af995",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/cycle-2/truth-test-report.json"): "fd89ac76ab125ff1d257ef87f7d0fbec60b2a1cfaf03df71de458a1cc5a6233e",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/cycle-2/truth-test-receipt.json"): "31e3677be0037bad4cd176ad4508e635c674e3f81b9490bea2950f77cf20704e",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/cycle-2/adversarial-review.json"): "98e3f211cc323c788487736544b6e71d53259c4e5892251b522d332a7a313dee",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/cycle-2/adversarial-reviewer-receipt.json"): "dca8be45c50a5dca59b29a7d6284257adc3b7f910969694b3ea2d4f426387a96",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/final-cycle-producer-failure/phase4-path-usage-joins.json"): "3baeee0af3948af4f36d04bb9d8c848f2dff4e6243c8837f457caacc92359ff6",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/final-cycle-producer-failure/phase4-group-rollup.json"): "19f94e5cea4cfd1d422a7efa8aeadee565f7b368a993bbbe43949268aebd7ae2",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/final-cycle-producer-failure/requirements-mapper.json"): "1ab78b0830213734bf0eb3d23242e562fb5104f5d905281cb9b1610fe90dd743",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/v2-test-authoring-red/phase4_v2_schema_contract_test.py"): "c020040753985843b28fb69888c5d10bcc116f2ffcfa6ecd6f1345ad904004c5",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/v2-test-authoring-red/negative-fixtures/extra-link-requirement-key.json"): "49ebac6cb719cf33488d6601892c66e9cfdbd9a7e56334c98197c51a94bc835b",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/v2-test-authoring-red/negative-fixtures/extra-mirror-key.json"): "d3ecdadf12c242c2d8b39fd1c9c1c2a57275630d7ef172508a1942c01f1f47b0",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/v2-test-authoring-red/negative-fixtures/extra-schema-key.json"): "e635765c58af27bc14ad471a7e0b90b1d5e8462d43b4a9a81f77343330d558b0",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/v2-test-authoring-red/negative-fixtures/factual-drift.json"): "a6778e84cd45b77f4b5dbc739ce4075c696ea1a20710ab6c0ac235cf8c8dd3d6",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/v2-test-authoring-red/negative-fixtures/false-receipt-claim.json"): "a46c97fb8c9034b24d3fbd423173e03e115ed75980206a7d0e8f5e855ea7f077",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/v2-test-authoring-red/negative-fixtures/mirror-mismatch.json"): "470a7ef0357fcd904df7bced1bbc854b67b24c3cc4c390ef8e86693a56881e46",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/v2-test-authoring-red/negative-fixtures/missing-join-status.json"): "2cafc7c52f119d2004fa9e4a546d2531255f3454cc4451e5d5f3a3d046b8f4af",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/v2-test-authoring-red/negative-fixtures/missing-rollup-sha.json"): "5e7c871a3fa7ad55eb5f52473ddd944d71f68fe097eaeaaf2fd9b653b3c7b2ab",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/v2-test-authoring-red/negative-fixtures/stale-mapper-hash.json"): "9ae2fb2df17ff8c2f7c15fb5a8502c2944b3665213755f478eb01178f7de2a24",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/v2-test-authoring-red/negative-fixtures/wrong-join-status.json"): "109fdd24b390225a6330f1611fd2ec12de1468712b5d4a10cb381a15b4221510",
    str(TRACK / "phase4-working-notes/failed-cycles/AF-04/v2-test-authoring-red/negative-fixtures/wrong-rollup-sha.json"): "eaca0613fd10c42e1208a6233508822b2edc8d31a834d808d2b659a8d1abc120",
}
AUTHORING_RED_ARCHIVE_PREFIX = str(TRACK / "phase4-working-notes/failed-cycles/AF-04/v2-test-authoring-red")
MAPPER_BOUND_ARCHIVE_HASHES = {
    path: expected for path, expected in ARCHIVE_HASHES.items()
    if not path.startswith(AUTHORING_RED_ARCHIVE_PREFIX)
}
EXPECTED_FIXTURE_HASHES = {
    str(TRACK / "negative-fixtures/phase4-v2-schema/extra-link-requirement-key.json"): "49ebac6cb719cf33488d6601892c66e9cfdbd9a7e56334c98197c51a94bc835b",
    str(TRACK / "negative-fixtures/phase4-v2-schema/extra-mirror-key.json"): "d3ecdadf12c242c2d8b39fd1c9c1c2a57275630d7ef172508a1942c01f1f47b0",
    str(TRACK / "negative-fixtures/phase4-v2-schema/extra-schema-key.json"): "e635765c58af27bc14ad471a7e0b90b1d5e8462d43b4a9a81f77343330d558b0",
    str(TRACK / "negative-fixtures/phase4-v2-schema/factual-drift.json"): "a6778e84cd45b77f4b5dbc739ce4075c696ea1a20710ab6c0ac235cf8c8dd3d6",
    str(TRACK / "negative-fixtures/phase4-v2-schema/false-receipt-claim.json"): "a46c97fb8c9034b24d3fbd423173e03e115ed75980206a7d0e8f5e855ea7f077",
    str(TRACK / "negative-fixtures/phase4-v2-schema/mirror-mismatch.json"): "470a7ef0357fcd904df7bced1bbc854b67b24c3cc4c390ef8e86693a56881e46",
    str(TRACK / "negative-fixtures/phase4-v2-schema/missing-join-status.json"): "2cafc7c52f119d2004fa9e4a546d2531255f3454cc4451e5d5f3a3d046b8f4af",
    str(TRACK / "negative-fixtures/phase4-v2-schema/missing-rollup-sha.json"): "5e7c871a3fa7ad55eb5f52473ddd944d71f68fe097eaeaaf2fd9b653b3c7b2ab",
    str(TRACK / "negative-fixtures/phase4-v2-schema/stale-mapper-hash.json"): "9ae2fb2df17ff8c2f7c15fb5a8502c2944b3665213755f478eb01178f7de2a24",
    str(TRACK / "negative-fixtures/phase4-v2-schema/wrong-join-status.json"): "109fdd24b390225a6330f1611fd2ec12de1468712b5d4a10cb381a15b4221510",
    str(TRACK / "negative-fixtures/phase4-v2-schema/wrong-rollup-sha.json"): "eaca0613fd10c42e1208a6233508822b2edc8d31a834d808d2b659a8d1abc120",
}
JOINS_KEYS = {"schema_version", "track_id", "batch_id", "role", "status", "scope", "counts", "input_binding", "review_slices", "records"}
COUNTS_KEYS = {"candidate_paths", "identical_hash_groups", "caller_locators", "accepted_path_usage_links", "unique_scene_usage_records", "responsive_assessment_cells", "dispositions", "separate_catalog_locator_records", "additive_92_path_claim"}
RECORD_KEYS = {"canonical_path", "sha256", "identical_hash_group", "duplicate_path_peers", "derived_public_url", "static_reference_status", "dynamic_risk", "unknown_rationale", "caller_locators", "accepted_usage_ids", "accepted_join_caller_locator_ids", "priority1_evidence", "provenance", "disposition", "canonical_standard_pack_candidate_key", "direct_legacy_adoption", "eligibility", "join_status", "usage_links", "semantic_replacement_requirements"}
LINK_KEYS = {"usage_id", "source", "normalized_usage", "responsive_assessment_cells", "semantic_replacement_requirement"}
SOURCE_KEYS = {"normalizer_path", "normalizer_sha256", "normalizer_json_pointer"}
USAGE_BASE_KEYS = {"usage_id", "track", "game_id", "surface_kind", "surface_id", "asset_locator_literal", "category", "claim_ids", "evidence_class", "accepted_scope", "disclosures"}
USAGE_SOURCE_VARIANTS = ({"source_path", "source_sha256", "source_json_pointers"}, {"source_artifact"})
USAGE_OPTIONAL_KEYS = {"source_class"}
REQUIREMENT_KEYS = {"usage_id", "source", "accepted_usage_fields", "canonical_semantic_role", "canonical_state", "ontology_status"}
CELL_KEYS = {"viewport", "theme", "status", "assessment", "facets"}
FACET_KEYS = {"text_capacity", "focal_crop_tile_slice", "state_coverage", "collision_readability", "theme_suitability", "current_legacy_function", "semantic_role_state_replacement_or_retirement", "per_path_runtime_load"}
FACET_SHAPES = {
    "text_capacity": {"status", "evidence"}, "focal_crop_tile_slice": {"status", "evidence"},
    "state_coverage": {"status", "evidence"}, "collision_readability": {"status", "evidence"},
    "theme_suitability": {"status", "evidence"}, "semantic_role_state_replacement_or_retirement": {"status", "evidence"},
    "per_path_runtime_load": {"status", "evidence"},
    "current_legacy_function": {"status", "evidence", "value", "scope", "per_path_runtime_load"},
}
ROLLUP_KEYS = {"schema_version", "track_id", "batch_id", "role", "status", "input_path_usage_joins", "counts", "groups"}
ROLLUP_COUNT_KEYS = {"candidate_paths", "identical_hash_groups", "caller_locators", "accepted_path_usage_links", "dispositions", "groups_with_mixed_path_specific_dispositions"}
GROUP_KEYS = {"identical_hash_group", "member_paths", "path_specific_dispositions", "counts"}
GROUP_COUNT_KEYS = {"paths", "caller_locators", "accepted_path_usage_links", "disposition_paths"}
PATH_DISPOSITION_KEYS = {"canonical_path", "value", "policy_priority"}
FROZEN_ENVELOPE = {"candidate_paths": 35, "identical_hash_groups": 17, "caller_locators": 61, "accepted_path_usage_links": 6, "unique_scene_usage_records": 3, "responsive_assessment_cells": 24, "dispositions": {"replace": 6, "reject": 4, "unknown": 25}}
READ_BYTES = 0


def digest(path: Path) -> str:
    """Returns a SHA-256 hash of exact bytes at path."""
    global READ_BYTES
    payload = path.read_bytes()
    READ_BYTES += len(payload)
    return hashlib.sha256(payload).hexdigest()


def load(path: Path) -> Any:
    """Loads a UTF-8 JSON document."""
    global READ_BYTES
    payload = path.read_bytes()
    READ_BYTES += len(payload)
    return json.loads(payload.decode("utf-8"))


def add(errors: list[str], code: str, detail: str) -> None:
    """Appends a stable contract error code and compact detail."""
    errors.append(f"{code}: {detail}")


def exact_keys(errors: list[str], value: dict[str, Any], expected: set[str], label: str) -> None:
    """Requires an object to have no missing or unexpected keys."""
    if not isinstance(value, dict) or set(value) != expected:
        add(errors, "unexpected-key", label)


def exact_usage_keys(errors: list[str], value: dict[str, Any], label: str) -> None:
    """Requires one exact normalized-usage source envelope plus optional source_class."""
    if not isinstance(value, dict):
        add(errors, "unexpected-key", label)
        return
    actual = set(value)
    accepted = {
        frozenset(USAGE_BASE_KEYS | variant | optional)
        for variant in USAGE_SOURCE_VARIANTS
        for optional in (set(), USAGE_OPTIONAL_KEYS)
    }
    if frozenset(actual) not in accepted:
        add(errors, "unexpected-key", label)


def source_fields(usage: dict[str, Any]) -> dict[str, Any]:
    """Returns the exact source fields, normalizing optional source_class to null."""
    return {key: usage.get(key) for key in ("track", "game_id", "surface_kind", "surface_id", "asset_locator_literal", "category", "claim_ids", "evidence_class", "source_class", "accepted_scope", "disclosures")}


def validate(root: Path, joins: dict[str, Any], rollup: dict[str, Any], mapper: dict[str, Any], *, check_bytes: bool = True) -> list[str]:
    """Validates exact v2 shapes, frozen facts, bindings, and archive integrity."""
    errors: list[str] = []
    if check_bytes:
        for path, expected in {**EXPECTED_PRODUCER_HASHES, **EXPECTED_DECISION_HASHES, **ARCHIVE_HASHES}.items():
            try:
                actual = digest(root / path)
            except OSError:
                add(errors, "required-byte-missing", path)
                continue
            if actual != expected:
                add(errors, "archive-byte-drift" if path in ARCHIVE_HASHES else "bound-byte-drift", path)
    exact_keys(errors, joins, JOINS_KEYS, "joins")
    exact_keys(errors, joins.get("counts", {}), COUNTS_KEYS, "joins.counts")
    if joins.get("schema_version") != "apk-asset-forensics.phase4-path-usage-joins.v2" or joins.get("batch_id") != BATCH:
        add(errors, "v2-envelope", "joins")
    if {key: joins.get("counts", {}).get(key) for key in FROZEN_ENVELOPE} != FROZEN_ENVELOPE:
        add(errors, "factual-envelope-drift", "joins.counts")
    scaffold = load(root / TRACK / "phase4-join-scaffold-v1.json")
    frozen = {item["canonical_path"]: item for item in scaffold["candidate_records"] if item["batch_id"] == BATCH}
    records = joins.get("records", [])
    if {record.get("canonical_path") for record in records} != set(frozen) or len(records) != 35:
        add(errors, "frozen-coverage", "candidate records")
    joined_paths: set[str] = set()
    usage_ids: set[str] = set()
    scene_links = 0
    for record in records:
        exact_keys(errors, record, RECORD_KEYS, f"record:{record.get('canonical_path')}")
        frozen_record = frozen.get(record.get("canonical_path"))
        if frozen_record is None:
            continue
        if record.get("join_status") != frozen_record.get("join_status"):
            add(errors, "join-status-scaffold-mismatch", record["canonical_path"])
        links = record.get("usage_links", [])
        requirement_wrapper = record.get("semantic_replacement_requirements", {})
        exact_keys(errors, requirement_wrapper, {"status", "requirements"}, f"requirements:{record['canonical_path']}")
        for requirement in requirement_wrapper.get("requirements", []):
            exact_keys(errors, requirement, REQUIREMENT_KEYS, f"requirements.item:{record['canonical_path']}")
        expected_status = "source_bound_pending_T9" if links else "blocked_unknown"
        if requirement_wrapper.get("status") != expected_status:
            add(errors, "wrapper-status", record["canonical_path"])
        if requirement_wrapper.get("requirements") != [link.get("semantic_replacement_requirement") for link in links]:
            add(errors, "mirror-mismatch", record["canonical_path"])
        if links:
            joined_paths.add(record["canonical_path"])
        for link in links:
            exact_keys(errors, link, LINK_KEYS, f"link:{record['canonical_path']}")
            exact_keys(errors, link.get("source", {}), SOURCE_KEYS, f"link.source:{record['canonical_path']}")
            exact_usage_keys(errors, link.get("normalized_usage", {}), f"link.usage:{record['canonical_path']}")
            requirement = link.get("semantic_replacement_requirement", {})
            exact_keys(errors, requirement, REQUIREMENT_KEYS, f"link.requirement:{record['canonical_path']}")
            if requirement.get("usage_id") != link.get("usage_id") or requirement.get("source") != link.get("source") or requirement.get("accepted_usage_fields") != source_fields(link.get("normalized_usage", {})):
                add(errors, "requirement-source-binding", record["canonical_path"])
            usage_ids.add(link.get("usage_id"))
            if link.get("normalized_usage", {}).get("surface_kind") == "scene":
                scene_links += 1
                cells = link.get("responsive_assessment_cells", [])
                if {(cell.get("viewport"), cell.get("theme")) for cell in cells} != {("compact", "cute_chibi_v1"), ("compact", "heroic_stylized_v1"), ("wide", "cute_chibi_v1"), ("wide", "heroic_stylized_v1")}:
                    add(errors, "responsive-cell-coverage", record["canonical_path"])
                for cell in cells:
                    exact_keys(errors, cell, CELL_KEYS, f"cell:{record['canonical_path']}")
                    exact_keys(errors, cell.get("facets", {}), FACET_KEYS, f"cell.facets:{record['canonical_path']}")
                    for facet, shape in FACET_SHAPES.items():
                        exact_keys(errors, cell.get("facets", {}).get(facet, {}), shape, f"facet:{facet}:{record['canonical_path']}")
    slices = joins.get("review_slices", [])
    if len(slices) != 1 or set(slices[0]) != {"slice_id", "games", "game_count", "candidate_paths", "accepted_usage_ids", "scope"}:
        add(errors, "slice-shape", "review_slices")
    elif (slices[0].get("game_count") != 3 or len(slices[0].get("games", [])) != 3 or len(set(slices[0].get("games", []))) != 3 or set(slices[0].get("candidate_paths", [])) != joined_paths or set(slices[0].get("accepted_usage_ids", [])) != usage_ids):
        add(errors, "slice-unique-covered", "AF-04")
    if joins.get("counts", {}).get("unique_scene_usage_records") != len(usage_ids) or joins.get("counts", {}).get("responsive_assessment_cells") != scene_links * 4:
        add(errors, "factual-envelope-drift", "scene counts")
    if joins.get("counts", {}).get("separate_catalog_locator_records") != 7 or joins.get("counts", {}).get("additive_92_path_claim") is not False or joins.get("scope", {}).get("catalog_locator_records_embedded") is not False:
        add(errors, "catalog-non-additivity", "AF-04")
    exact_keys(errors, rollup, ROLLUP_KEYS, "rollup")
    exact_keys(errors, rollup.get("counts", {}), ROLLUP_COUNT_KEYS, "rollup.counts")
    if rollup.get("schema_version") != "apk-asset-forensics.phase4-group-rollup.v2" or rollup.get("input_path_usage_joins") != {"path": str(JOINS), "sha256": EXPECTED_PRODUCER_HASHES[str(JOINS)]}:
        add(errors, "rollup-joins-sha-binding", "AF-04")
    if {key: rollup.get("counts", {}).get(key) for key in ("candidate_paths", "identical_hash_groups", "caller_locators", "accepted_path_usage_links", "dispositions")} != {key: FROZEN_ENVELOPE[key] for key in ("candidate_paths", "identical_hash_groups", "caller_locators", "accepted_path_usage_links", "dispositions")} or rollup.get("counts", {}).get("groups_with_mixed_path_specific_dispositions") != 3:
        add(errors, "factual-envelope-drift", "rollup.counts")
    if len(rollup.get("groups", [])) != 17:
        add(errors, "frozen-coverage", "rollup groups")
    for group in rollup.get("groups", []):
        exact_keys(errors, group, GROUP_KEYS, f"group:{group.get('identical_hash_group')}")
        exact_keys(errors, group.get("counts", {}), GROUP_COUNT_KEYS, f"group.counts:{group.get('identical_hash_group')}")
        for disposition in group.get("path_specific_dispositions", []):
            exact_keys(errors, disposition, PATH_DISPOSITION_KEYS, f"group.disposition:{group.get('identical_hash_group')}")
    output_hashes = mapper.get("output_file_hashes", {})
    if output_hashes.get(str(JOINS)) != EXPECTED_PRODUCER_HASHES[str(JOINS)] or output_hashes.get(str(ROLLUP)) != EXPECTED_PRODUCER_HASHES[str(ROLLUP)]:
        add(errors, "mapper-receipt-current-output-hash", "AF-04")
    for path, expected in {**EXPECTED_DECISION_HASHES, **MAPPER_BOUND_ARCHIVE_HASHES}.items():
        if mapper.get("input_file_hashes", {}).get(path) != expected:
            add(errors, "mapper-receipt-preserved-binding", path)
    if mapper.get("final_status") != "mapping-complete-pending-fresh-truth-test-review-and-root-acceptance":
        add(errors, "mapper-receipt-false-claim", "final_status")
    return errors


def apply_fixture(joins: dict[str, Any], rollup: dict[str, Any], mapper: dict[str, Any], operation: str) -> None:
    """Applies a focused v2 structural counterexample mutation in memory."""
    joined = next(record for record in joins["records"] if record["usage_links"])
    link = joined["usage_links"][0]
    if operation == "missing_join_status": del joined["join_status"]
    elif operation == "wrong_join_status": joined["join_status"] = "fabricated"
    elif operation == "extra_link_requirement_key": link["semantic_replacement_requirement"]["status"] = "forbidden"
    elif operation == "extra_mirror_key": joined["semantic_replacement_requirements"]["requirements"][0]["disclosure"] = "forbidden"
    elif operation == "mirror_mismatch": joined["semantic_replacement_requirements"]["requirements"] = []
    elif operation == "missing_rollup_sha": del rollup["input_path_usage_joins"]["sha256"]
    elif operation == "wrong_rollup_sha": rollup["input_path_usage_joins"]["sha256"] = "0" * 64
    elif operation == "factual_drift": joins["counts"]["candidate_paths"] = 34
    elif operation == "extra_schema_key": joins["extra_key"] = True
    elif operation == "stale_mapper_hash": mapper["output_file_hashes"][str(JOINS)] = "0" * 64
    elif operation == "false_receipt_claim": mapper["final_status"] = "truth-test-green-root-accepted"
    else: raise ValueError(f"unknown fixture operation: {operation}")


def run_value_verifier(root: Path) -> tuple[dict[str, Any], bytes]:
    """Runs the unchanged value verifier through the active Python 3 interpreter."""
    result = subprocess.run([sys.executable, str(root / VALUE_VERIFIER), "--root", str(root), "--batch", BATCH, "--json"], check=False, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(result.stdout.decode("utf-8") + result.stderr.decode("utf-8"))
    return json.loads(result.stdout), result.stdout


def safe_validate(root: Path, joins: dict[str, Any], rollup: dict[str, Any], mapper: dict[str, Any], *, check_bytes: bool = True) -> list[str]:
    """Converts malformed-document shape exceptions into fail-closed contract errors."""
    try:
        return validate(root, joins, rollup, mapper, check_bytes=check_bytes)
    except (IndexError, KeyError, OSError, StopIteration, TypeError, ValueError) as error:
        return [f"validation-exception: {type(error).__name__}"]


def main() -> int:
    """Runs production and fixture schema checks and optionally publishes fresh reports."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--write-reports", action="store_true")
    args = parser.parse_args()
    root = args.root.resolve()
    joins, rollup, mapper = load(root / JOINS), load(root / ROLLUP), load(root / MAPPER_RECEIPT)
    production_errors = safe_validate(root, joins, rollup, mapper)
    fixture_paths = sorted((root / TRACK / "negative-fixtures/phase4-v2-schema").glob("*.json"))
    fixture_hashes = {str(path.relative_to(root)): digest(path) for path in fixture_paths}
    if set(fixture_hashes) != set(EXPECTED_FIXTURE_HASHES):
        add(production_errors, "fixture-set-drift", "phase4-v2-schema")
    for path, expected in EXPECTED_FIXTURE_HASHES.items():
        if fixture_hashes.get(path) != expected:
            add(production_errors, "fixture-byte-drift", path)
    fixture_results = []
    for fixture_path in fixture_paths:
        fixture = load(fixture_path)
        altered_joins, altered_rollup, altered_mapper = copy.deepcopy(joins), copy.deepcopy(rollup), copy.deepcopy(mapper)
        try:
            exact_keys(production_errors, fixture, {"operation", "expected_error_code"}, f"fixture:{fixture_path.name}")
            apply_fixture(altered_joins, altered_rollup, altered_mapper, fixture["operation"])
            errors = safe_validate(root, altered_joins, altered_rollup, altered_mapper, check_bytes=False)
        except (IndexError, KeyError, StopIteration, TypeError, ValueError) as error:
            errors = [f"fixture-harness-error: {type(error).__name__}"]
        codes = sorted({error.split(":", 1)[0] for error in errors})
        fixture_results.append({"fixture": str(fixture_path.relative_to(root)), "fixture_sha256": fixture_hashes[str(fixture_path.relative_to(root))], "operation": fixture.get("operation"), "expected_error_code": fixture.get("expected_error_code"), "error_codes": codes, "rejected": fixture.get("expected_error_code") in codes})
    value_report, value_bytes = run_value_verifier(root)
    verifier_path = Path(__file__).resolve()
    verifier_hash = digest(verifier_path)
    value_verifier_hash = digest(root / VALUE_VERIFIER)
    value_usage = value_report.get("measured_resource_usage", {})
    structural_test_cases = 1 + len(fixture_results)
    test_cases = structural_test_cases + value_usage.get("test_cases", 0)
    command_invocations = 1 + value_usage.get("command_invocations", 0)
    bytes_read = READ_BYTES + value_usage.get("bytes_read", 0)
    within_ceiling = test_cases <= 160 and command_invocations <= 80 and bytes_read <= 134217728
    payload = {"schema_version": "apk-asset-forensics.phase4-v2-schema-contract-test-report.v1", "track_id": "apk_existing_asset_candidate_audit_20260712", "batch_id": BATCH, "role": "truth-test-author", "verifier": str(verifier_path.relative_to(root)), "verifier_sha256": verifier_hash, "value_verifier": str(VALUE_VERIFIER), "value_verifier_sha256": value_verifier_hash, "producer_hashes": EXPECTED_PRODUCER_HASHES, "decision_hashes": EXPECTED_DECISION_HASHES, "archive_hashes": ARCHIVE_HASHES, "fixture_hashes": fixture_hashes, "production": {"passed": not production_errors, "errors": production_errors}, "counterexamples": fixture_results, "counterexample_count": len(fixture_results), "all_counterexamples_rejected": all(item["rejected"] for item in fixture_results), "value_report": {"path": str(VALUE_REPORT), "sha256": hashlib.sha256(value_bytes).hexdigest(), "parsed_exact": value_report}, "measured_resource_usage": {"test_cases": test_cases, "structural_test_cases": structural_test_cases, "value_test_cases": value_usage.get("test_cases", 0), "value_verifier_invocations": 1, "command_invocations": command_invocations, "bytes_read": bytes_read, "within_ceiling": within_ceiling, "ceilings": {"test_cases": 160, "command_invocations": 80, "bytes_read": 134217728}, "measurement_basis": "Exact bytes read or digested by this isolated Python 3 process plus the unchanged value verifier's separately measured bytes; command and test counts include the nested unchanged value-verifier invocation."}}
    if args.write_reports:
        (root / VALUE_REPORT).parent.mkdir(parents=True, exist_ok=True)
        (root / VALUE_REPORT).write_bytes(value_bytes)
        (root / V2_REPORT).parent.mkdir(parents=True, exist_ok=True)
        (root / V2_REPORT).write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0 if not production_errors and payload["all_counterexamples_rejected"] and value_report["production"]["passed"] and value_report["all_counterexamples_rejected"] and within_ceiling else 1


if __name__ == "__main__":
    raise SystemExit(main())
