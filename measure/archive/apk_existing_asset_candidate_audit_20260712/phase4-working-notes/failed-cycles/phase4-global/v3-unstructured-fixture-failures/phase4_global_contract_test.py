#!/usr/bin/env python3
"""Fail-closed global reconciliation for all accepted Phase 4 batch artifacts."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any


TRACK = Path("measure/tracks/apk_existing_asset_candidate_audit_20260712")
BATCHES = tuple(f"AF-{number:02d}" for number in range(1, 13))
FROZEN_HASHES = {
    "phase4-source-registry-v1.json": "450f5ab66215178aa730e057cb28a220bfb550dfd924959a7f7f1da2eea02f9e",
    "phase4-input-freeze-v1.json": "ae387ae1e9a10d6398e8fd340924a12fc9ca19d706d9c079a2b071babcbbfcd3",
    "phase4-join-scaffold-v1.json": "2162076fe26911a2659b7e0ef23f49398c8ebb4b5343b0ab0479c78a5d1a1de4",
    "phase4-browser-evidence-freeze-v1.json": "5c64618ccd05b39ab63f1befb8d74d75f6a7fdf5b9613d31c8ee1b3369065231",
}
EXPECTED = {
    "candidate_paths": 428,
    "identical_hash_groups": 227,
    "caller_locators": 533,
    "accepted_path_usage_links": 85,
    "scene_links": 77,
    "non_scene_links": 8,
    "unique_usage_ids": 45,
    "unique_scene_usage_ids": 40,
    "unique_non_scene_usage_ids": 5,
    "responsive_assessment_cells": 308,
    "priority1_paths": 14,
    "dispositions": {"replace": 85, "reject": 14, "unknown": 329},
}
VALUE_VERIFIER_HASH = "feb731ce1096399ee6a790b62e8a82c7341373d8236fc00b64fdd089a5518aa0"
V2_VERIFIER_HASH = "174fba885907260824503708180cd4dbe2b873e06aaf8e86c4fb440c319c9956"
FIXTURES = TRACK / "negative-fixtures/phase4-global"
FIXTURE_MANIFEST = TRACK / "phase4-global-fixture-manifest-v1.json"
EXPECTED_FIXTURE_MANIFEST_SHA256 = "4a232e2de84d7d9a3a3a6ea488f1e60a07a76281ae5e285eb8d146f8c818bd6f"
EXPECTED_FIXTURE_SET_SHA256 = "dd4595f8976843ca34a833311d6508a7a4f33203f10d940cd9f827049ab45245"


def digest(path: Path) -> str:
    """Returns the SHA-256 hash of a file's exact bytes.

    Args:
        path: File whose bytes must be fingerprinted.

    Returns:
        Lowercase SHA-256 digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path: Path) -> Any:
    """Loads a UTF-8 JSON artifact.

    Args:
        path: JSON artifact path.

    Returns:
        Parsed JSON value.
    """
    return json.loads(path.read_text(encoding="utf-8"))


def fixture_set_digest(inventory: dict[str, dict[str, Any]]) -> str:
    """Returns the canonical digest for a fixture path-to-byte-hash inventory.

    Args:
        inventory: Repository-relative fixture paths mapped to parsed metadata.

    Returns:
        SHA-256 over sorted path, NUL, byte hash, and newline entries.
    """
    payload = "".join(f"{path}\0{inventory[path]['sha256']}\n" for path in sorted(inventory)).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def live_fixture_inventory(root: Path) -> dict[str, dict[str, Any]]:
    """Loads every live fixture so identity drift is detected before mutation dispatch.

    Args:
        root: Repository root containing the fixture directory.

    Returns:
        Fixture documents and their exact current byte hashes keyed by path.
    """
    return {str(path.relative_to(root)): {"sha256": digest(path), "document": load(path)} for path in sorted((root / FIXTURES).glob("*.json"))}


def validate_fixture_set(manifest: Any, inventory: dict[str, dict[str, Any]]) -> list[str]:
    """Rejects any fixture-set identity, metadata, or byte drift before execution.

    Args:
        manifest: Parsed immutable fixture manifest.
        inventory: Candidate fixture-set inventory, possibly an in-memory mutation.

    Returns:
        Stable fixture-set validation errors.
    """
    errors: list[str] = []
    if not isinstance(manifest, dict) or set(manifest) != {"schema_version", "fixture_directory", "fixtures"}:
        error(errors, "fixture-manifest-binding", "manifest schema")
        return errors
    fixtures = manifest.get("fixtures")
    if manifest.get("schema_version") != "apk-asset-forensics.phase4-global-fixture-manifest.v1" or manifest.get("fixture_directory") != str(FIXTURES) or not isinstance(fixtures, list) or len(fixtures) != 12:
        error(errors, "fixture-manifest-binding", "manifest envelope")
        return errors
    expected: dict[str, dict[str, str]] = {}
    operations: set[str] = set()
    for entry in fixtures:
        if not isinstance(entry, dict) or set(entry) != {"path", "sha256", "operation", "expected_error_code"}:
            error(errors, "fixture-manifest-binding", "manifest entry shape")
            continue
        path, operation = entry.get("path"), entry.get("operation")
        if not isinstance(path, str) or not isinstance(operation, str) or path in expected or operation in operations:
            error(errors, "fixture-manifest-binding", "manifest identity uniqueness")
            continue
        expected[path] = entry
        operations.add(operation)
    if len(expected) != 12 or set(inventory) != set(expected):
        error(errors, "fixture-manifest-binding", "fixture path set")
    if fixture_set_digest(inventory) != EXPECTED_FIXTURE_SET_SHA256:
        error(errors, "fixture-manifest-binding", "fixture set digest")
    for path, entry in expected.items():
        actual = inventory.get(path)
        if not isinstance(actual, dict) or actual.get("sha256") != entry.get("sha256"):
            error(errors, "fixture-manifest-binding", f"fixture bytes {path}")
            continue
        document = actual.get("document")
        if not isinstance(document, dict) or set(document) != {"operation", "expected_error_code"} or document.get("operation") != entry.get("operation") or document.get("expected_error_code") != entry.get("expected_error_code"):
            error(errors, "fixture-manifest-binding", f"fixture metadata {path}")
    return errors


def error(errors: list[str], code: str, detail: str) -> None:
    """Appends a stable machine-readable error.

    Args:
        errors: Mutable error list.
        code: Stable contract failure code.
        detail: Compact diagnostic context.
    """
    errors.append(f"{code}: {detail}")


def path_for(batch: str, name: str) -> Path:
    """Builds a track-relative artifact path for one batch.

    Args:
        batch: Batch identifier.
        name: Artifact filename.

    Returns:
        Repository-relative artifact path.
    """
    return TRACK / "batches" / batch / name


def make_snapshot(root: Path) -> dict[str, Any]:
    """Loads all batch, report, receipt, and frozen-input artifacts once.

    Args:
        root: Repository root.

    Returns:
        The complete in-memory verification snapshot.
    """
    snapshot: dict[str, Any] = {"frozen": {}, "batches": {}}
    for filename in FROZEN_HASHES:
        snapshot["frozen"][filename] = load(root / TRACK / filename)
    for batch in BATCHES:
        snapshot["batches"][batch] = {
            "joins": load(root / path_for(batch, "phase4-path-usage-joins.json")),
            "rollup": load(root / path_for(batch, "phase4-group-rollup.json")),
            "mapper": load(root / TRACK / "role-receipts" / batch / "requirements-mapper.json"),
            "value": load(root / TRACK / "phase4-batch-test-reports" / f"{batch}.json"),
            "truth": load(root / TRACK / "role-receipts" / batch / "truth-test-author.json"),
            "review": load(root / TRACK / "phase4-reviews" / f"{batch}.json"),
            "review_receipt": load(root / TRACK / "role-receipts" / batch / "phase4-adversarial-reviewer.json"),
        }
        v2 = root / TRACK / "phase4-v2-batch-schema-test-reports" / f"{batch}.json"
        legacy_v2 = root / TRACK / "phase4-v2-schema-test-reports" / f"{batch}.json"
        snapshot["batches"][batch]["v2"] = load(v2 if v2.exists() else legacy_v2) if (v2.exists() or legacy_v2.exists()) else None
    return snapshot


def mutate(snapshot: dict[str, Any], operation: str) -> None:
    """Applies one fixture mutation to the in-memory snapshot.

    Args:
        snapshot: Parsed source artifacts to mutate only in memory.
        operation: Named fixture mutation.
    """
    af01 = snapshot["batches"]["AF-01"]
    if operation == "missing_batch":
        del snapshot["batches"]["AF-12"]
    elif operation == "duplicate_path":
        af01["joins"]["records"].append(copy.deepcopy(af01["joins"]["records"][0]))
    elif operation == "bad_disposition":
        af01["joins"]["records"][0]["disposition"]["value"] = "reuse"
    elif operation == "priority1_not_rejected":
        for entry in snapshot["batches"].values():
            for record in entry["joins"]["records"]:
                if record["priority1_evidence"]["applies"]:
                    record["disposition"] = {"value": "unknown", "policy_priority": 3, "replacement_action": None}
                    return
    elif operation == "canonical_key":
        af01["joins"]["records"][0]["canonical_standard_pack_candidate_key"]["value"] = "illicit-key"
    elif operation == "browser_path_load":
        for record in af01["joins"]["records"]:
            for link in record["usage_links"]:
                if link["normalized_usage"]["surface_kind"] == "scene":
                    link["responsive_assessment_cells"][0]["facets"]["per_path_runtime_load"]["status"] = "established"
                    return
    elif operation == "review_finding":
        af01["review"]["findings"][next(iter(af01["review"]["findings"]))].append({"id": "fixture"})
    elif operation == "frozen_hash_drift":
        af01["joins"]["input_binding"]["phase4_input_freeze"]["sha256"] = "0" * 64
    elif operation == "mapper_hash_drift":
        af01["mapper"]["output_file_hashes"][str(path_for("AF-01", "phase4-path-usage-joins.json"))] = "0" * 64
    elif operation == "receipt_finding":
        af01["review_receipt"]["findings"][next(iter(af01["review_receipt"]["findings"]))].append({"id": "fixture"})
    elif operation == "duplicate_caller_locator_id":
        locators = [locator for entry in snapshot["batches"].values() for record in entry["joins"]["records"] for locator in record["caller_locators"]]
        locators[1]["locator_id"] = locators[0]["locator_id"]
    elif operation == "stale_truth_receipt_bindings":
        af01["truth"]["input_file_hashes"] = {}
        af01["truth"]["output_file_hashes"] = {}
        snapshot["batches"]["AF-04"]["truth"]["report_hashes"][str(TRACK / "phase4-batch-test-reports" / "AF-04.json")] = "0" * 64
    else:
        raise ValueError(f"unknown fixture operation: {operation}")


def status_is_pending_root(value: Any) -> bool:
    """Returns whether a review status explicitly remains pending root acceptance.

    Args:
        value: Review status field.

    Returns:
        Whether the status is a nonterminal pending-root state.
    """
    return isinstance(value, str) and "pending-root" in value and "acceptance" in value


def hash_is_present(mapping: Any, actual: str) -> bool:
    """Returns whether a receipt mapping binds an exact current artifact hash.

    Args:
        mapping: Object containing declared artifact hashes.
        actual: Current artifact hash.

    Returns:
        Whether the hash appears among declared values.
    """
    return isinstance(mapping, dict) and actual in mapping.values()


def expected_caller_locator_pairs(snapshot: dict[str, Any]) -> set[tuple[str, str]]:
    """Derives the frozen path-owned caller locator set from the join scaffold.

    Args:
        snapshot: Parsed Phase 4 source snapshot.

    Returns:
        Exact pairs of candidate path and frozen locator identifier.
    """
    scaffold = snapshot["frozen"]["phase4-join-scaffold-v1.json"]
    return {(record["canonical_path"], locator["locator_id"])
            for record in scaffold["candidate_records"]
            for locator in record["caller_locators"]}


def check_truth_receipt_bindings(root: Path, batch: str, truth: dict[str, Any], value: dict[str, Any], v2: dict[str, Any] | None, errors: list[str]) -> None:
    """Validates all declared truth-receipt hash maps against current live bytes.

    Args:
        root: Repository root containing the declared paths.
        batch: Batch whose receipt is being checked.
        truth: Parsed truth-test author receipt.
        value: Parsed value-verifier report.
        v2: Optional parsed schema-verifier report.
        errors: Mutable error collection.
    """
    maps = {name: truth.get(name) for name in ("input_file_hashes", "output_file_hashes", "producer_hashes", "report_hashes", "verifier_hashes") if name in truth}
    declared: dict[str, str] = {}
    for name, mapping in maps.items():
        if not isinstance(mapping, dict):
            error(errors, "truth-receipt-hash-binding", f"{batch} {name} is not a map")
            continue
        for raw_path, expected_hash in mapping.items():
            if not isinstance(raw_path, str) or not isinstance(expected_hash, str) or len(expected_hash) != 64:
                error(errors, "truth-receipt-hash-binding", f"{batch} {name} malformed")
                continue
            path = root / raw_path
            try:
                actual_hash = digest(path)
            except OSError:
                error(errors, "truth-receipt-hash-binding", f"{batch} {name} missing {raw_path}")
                continue
            if actual_hash != expected_hash:
                error(errors, "truth-receipt-hash-binding", f"{batch} {name} stale {raw_path}")
            if raw_path in declared and declared[raw_path] != expected_hash:
                error(errors, "truth-receipt-hash-binding", f"{batch} conflicting {raw_path}")
            declared[raw_path] = expected_hash
    joins_path = str(path_for(batch, "phase4-path-usage-joins.json"))
    rollup_path = str(path_for(batch, "phase4-group-rollup.json"))
    value_path = str(TRACK / "phase4-batch-test-reports" / f"{batch}.json")
    required = {
        joins_path: digest(root / joins_path),
        rollup_path: digest(root / rollup_path),
        value_path: digest(root / value_path),
        str(TRACK / "phase4_batch_contract_test.py"): value.get("verifier_sha256"),
    }
    if v2 is not None:
        v2_path = TRACK / "phase4-v2-batch-schema-test-reports" / f"{batch}.json"
        if not (root / v2_path).exists():
            v2_path = TRACK / "phase4-v2-schema-test-reports" / f"{batch}.json"
        required[str(v2_path)] = digest(root / v2_path)
        required[v2.get("verifier")] = v2.get("verifier_sha256")
    for raw_path, expected_hash in required.items():
        if not isinstance(raw_path, str) or declared.get(raw_path) != expected_hash:
            error(errors, "truth-receipt-hash-binding", f"{batch} required {raw_path}")


def verify(root: Path, snapshot: dict[str, Any]) -> tuple[list[str], dict[str, Any]]:
    """Validates the global Phase 4 aggregate and all per-batch evidence bindings.

    Args:
        root: Repository root.
        snapshot: Immutable-or-fixture-mutated artifacts.

    Returns:
        Stable errors plus measured global counts.
    """
    errors: list[str] = []
    batches = snapshot["batches"]
    if tuple(sorted(batches)) != BATCHES:
        error(errors, "batch-coverage", "expected exact AF-01 through AF-12 coverage")
    for filename, expected_hash in FROZEN_HASHES.items():
        if digest(root / TRACK / filename) != expected_hash:
            error(errors, "frozen-input-byte-drift", filename)
    input_freeze = snapshot["frozen"]["phase4-input-freeze-v1.json"]
    registry_binding = input_freeze.get("source_registry", {})
    if registry_binding.get("sha256") != FROZEN_HASHES["phase4-source-registry-v1.json"]:
        error(errors, "frozen-source-registry-binding", "phase4 input freeze")
    records: list[dict[str, Any]] = []
    links: list[dict[str, Any]] = []
    caller_locator_pairs: list[tuple[str, str]] = []
    for batch in BATCHES:
        entry = batches.get(batch)
        if entry is None:
            continue
        joins, rollup, mapper = entry["joins"], entry["rollup"], entry["mapper"]
        joins_path = path_for(batch, "phase4-path-usage-joins.json")
        rollup_path = path_for(batch, "phase4-group-rollup.json")
        mapper_path = TRACK / "role-receipts" / batch / "requirements-mapper.json"
        if joins.get("batch_id") != batch or rollup.get("batch_id") != batch:
            error(errors, "batch-id-binding", batch)
        binding = joins.get("input_binding", {})
        for filename, expected_hash in FROZEN_HASHES.items():
            stem = filename.removesuffix("-v1.json").replace("-", "_")
            expected_path = str(TRACK / filename)
            item = binding.get(stem, {})
            if item.get("path") != expected_path or item.get("sha256") != expected_hash:
                error(errors, "batch-frozen-binding", f"{batch} {stem}")
        if mapper.get("output_file_hashes", {}).get(str(joins_path)) != digest(root / joins_path):
            error(errors, "mapper-joins-hash-binding", batch)
        if mapper.get("output_file_hashes", {}).get(str(rollup_path)) != digest(root / rollup_path):
            error(errors, "mapper-rollup-hash-binding", batch)
        value, truth, review, review_receipt, v2 = (entry[key] for key in ("value", "truth", "review", "review_receipt", "v2"))
        if value.get("production", {}).get("passed") is not True or value.get("all_counterexamples_rejected") is not True or value.get("counterexample_count") != 16 or value.get("verifier_sha256") != VALUE_VERIFIER_HASH:
            error(errors, "value-report-not-green", batch)
        if v2 is not None and (v2.get("production", {}).get("passed") is not True or v2.get("all_counterexamples_rejected") is not True):
            error(errors, "v2-report-not-green", batch)
        if batch >= "AF-06" and v2 is not None and v2.get("verifier_sha256") != V2_VERIFIER_HASH:
            error(errors, "v2-verifier-binding", batch)
        review_hash = digest(root / TRACK / "phase4-reviews" / f"{batch}.json")
        if not all(not findings for findings in review.get("findings", {}).values()):
            error(errors, "review-findings-present", batch)
        if not all(not findings for findings in review_receipt.get("findings", {}).values()) or review_receipt.get("unresolved_blocking_findings"):
            error(errors, "review-receipt-findings-present", batch)
        if not status_is_pending_root(review.get("final_status")) or not status_is_pending_root(review_receipt.get("final_status")):
            error(errors, "review-not-pending-root", batch)
        if not hash_is_present(review_receipt.get("output_file_hashes"), review_hash):
            error(errors, "review-receipt-output-binding", batch)
        joined_hashes = {digest(root / joins_path), digest(root / rollup_path), digest(root / mapper_path)}
        if not joined_hashes.issubset(set(review.get("reviewed_output_hashes", {}).values()) | set(review_receipt.get("exact_verified_inputs", {}).get("current_producer", {}).values())):
            error(errors, "review-producer-binding", batch)
        if not isinstance(truth.get("final_status"), str) or not truth["final_status"].startswith(("truth-test-green-pending-", "truth-test-pass-pending-")):
            error(errors, "truth-receipt-not-green", batch)
        check_truth_receipt_bindings(root, batch, truth, value, v2, errors)
        records.extend(joins.get("records", []))
        for record in joins.get("records", []):
            for locator in record.get("caller_locators", []):
                locator_id = locator.get("locator_id")
                if not isinstance(locator_id, str) or not locator_id:
                    error(errors, "caller-locator-ownership", f"{batch} {record.get('canonical_path', 'unknown')}")
                    continue
                caller_locator_pairs.append((record.get("canonical_path", ""), locator_id))
            links.extend(record.get("usage_links", []))
    paths = [record.get("canonical_path") for record in records]
    groups = {record.get("identical_hash_group") for record in records}
    callers = sum(len(record.get("caller_locators", [])) for record in records)
    scene_links = [link for link in links if link.get("normalized_usage", {}).get("surface_kind") == "scene"]
    non_scene_links = [link for link in links if link.get("normalized_usage", {}).get("surface_kind") != "scene"]
    unique_usage = {link.get("usage_id") for link in links}
    unique_scene = {link.get("usage_id") for link in scene_links}
    unique_non_scene = {link.get("usage_id") for link in non_scene_links}
    cells = sum(len(link.get("responsive_assessment_cells", [])) for link in links)
    dispositions = Counter(record.get("disposition", {}).get("value") for record in records)
    p1 = [record for record in records if record.get("priority1_evidence", {}).get("applies")]
    measured = {
        "candidate_paths": len(paths), "unique_candidate_paths": len(set(paths)), "identical_hash_groups": len(groups),
        "caller_locators": callers, "accepted_path_usage_links": len(links), "scene_links": len(scene_links),
        "non_scene_links": len(non_scene_links), "unique_usage_ids": len(unique_usage),
        "unique_scene_usage_ids": len(unique_scene), "unique_non_scene_usage_ids": len(unique_non_scene),
        "responsive_assessment_cells": cells, "priority1_paths": len(p1),
        "dispositions": {key: dispositions[key] for key in ("replace", "reject", "unknown")},
    }
    for key, expected in EXPECTED.items():
        if measured.get(key) != expected:
            error(errors, "global-count", f"{key} expected {expected} got {measured.get(key)}")
    if len(paths) != len(set(paths)):
        error(errors, "duplicate-candidate-path", "global candidate path denominator")
    expected_locator_pairs = expected_caller_locator_pairs(snapshot)
    if len(caller_locator_pairs) != len(set(caller_locator_pairs)) or set(caller_locator_pairs) != expected_locator_pairs:
        error(errors, "caller-locator-ownership", "live path locator ownership differs from frozen join scaffold")
    if unique_scene & unique_non_scene:
        error(errors, "usage-surface-kind-conflict", "usage id appears as both scene and non-scene")
    for record in records:
        disposition = record.get("disposition", {})
        if record.get("canonical_standard_pack_candidate_key", {}).get("value") is not None or record.get("canonical_standard_pack_candidate_key", {}).get("status") != "forbidden-pending-T9":
            error(errors, "canonical-key-forbidden", record.get("canonical_path", "unknown"))
        if record.get("direct_legacy_adoption") is not False:
            error(errors, "direct-legacy-adoption", record.get("canonical_path", "unknown"))
        eligibility = record.get("eligibility", {})
        if any(eligibility.get(name, {}).get("allowed") for name in ("reuse", "adapt", "reference")) or disposition.get("value") in {"reuse", "adapt", "reference"}:
            error(errors, "forbidden-reuse-adapt-reference", record.get("canonical_path", "unknown"))
    for record in p1:
        disposition = record.get("disposition", {})
        if disposition.get("value") != "reject" or disposition.get("replacement_action") != "retire":
            error(errors, "priority1-not-rejected-retired", record.get("canonical_path", "unknown"))
    for link in links:
        cells_for_link = link.get("responsive_assessment_cells", [])
        is_scene = link.get("normalized_usage", {}).get("surface_kind") == "scene"
        if (is_scene and len(cells_for_link) != 4) or (not is_scene and cells_for_link):
            error(errors, "responsive-cell-grain", link.get("usage_id", "unknown"))
        for cell in cells_for_link:
            runtime = cell.get("facets", {}).get("per_path_runtime_load", {})
            legacy = cell.get("facets", {}).get("current_legacy_function", {})
            if runtime.get("status") != "not_established" or runtime.get("evidence") is not None or legacy.get("scope") != "composite_scene_only_not_candidate_path_load":
                error(errors, "browser-not-composite-only", link.get("usage_id", "unknown"))
    return errors, measured


def run_fixtures(root: Path, manifest: dict[str, Any], inventory: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    """Runs only the manifest-bound behavior counterexamples in isolated memory.

    Args:
        root: Repository root.
        manifest: Validated immutable behavior-fixture manifest.
        inventory: Validated live fixture inventory.

    Returns:
        Per-fixture rejection results.
    """
    results: list[dict[str, Any]] = []
    for entry in sorted(manifest["fixtures"], key=lambda item: item["path"]):
        fixture_path = root / entry["path"]
        fixture = inventory[entry["path"]]["document"]
        snapshot = make_snapshot(root)
        mutate(snapshot, fixture["operation"])
        errors, _ = verify(root, snapshot)
        result = {"fixture": entry["path"], "fixture_sha256": digest(fixture_path), "operation": fixture["operation"], "error_codes": sorted({item.split(":", 1)[0] for item in errors})}
        result["rejected"] = fixture["expected_error_code"] in result["error_codes"]
        results.append(result)
    return results


def run_fixture_set_meta_counterexamples(manifest: dict[str, Any], inventory: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    """Proves fixture-set validation rejects seven isolated in-memory regressions.

    Args:
        manifest: Valid immutable behavior-fixture manifest.
        inventory: Valid live fixture inventory to clone before each mutation.

    Returns:
        Rejection results for deletion, extra, rename, duplicate operation,
        repurpose, expected-code drift, and byte-drift mutations.
    """
    target = str(FIXTURES / "duplicate-caller-locator-id.json")
    source = str(FIXTURES / "bad-disposition.json")
    cases: list[tuple[str, Any]] = []
    cases.append(("fixture_set_missing", lambda current: current.pop(target)))
    cases.append(("fixture_set_extra", lambda current: current.__setitem__(str(FIXTURES / "unexpected-extra.json"), copy.deepcopy(current[source]))))
    def rename(current: dict[str, dict[str, Any]]) -> None:
        current[str(FIXTURES / "renamed-duplicate-caller-locator-id.json")] = current.pop(target)
    cases.append(("fixture_set_renamed", rename))
    def duplicate_operation(current: dict[str, dict[str, Any]]) -> None:
        current[target]["document"]["operation"] = current[source]["document"]["operation"]
    cases.append(("fixture_set_duplicate_operation", duplicate_operation))
    def repurpose(current: dict[str, dict[str, Any]]) -> None:
        current[target]["document"] = copy.deepcopy(current[source]["document"])
        current[target]["sha256"] = current[source]["sha256"]
    cases.append(("fixture_set_repurposed_operation", repurpose))
    def expected_code_drift(current: dict[str, dict[str, Any]]) -> None:
        current[target]["document"]["expected_error_code"] = "wrong-code"
    cases.append(("fixture_set_expected_code_drift", expected_code_drift))
    def byte_drift(current: dict[str, dict[str, Any]]) -> None:
        current[target]["sha256"] = "0" * 64
    cases.append(("fixture_set_byte_drift", byte_drift))
    results: list[dict[str, Any]] = []
    for operation, mutate_inventory in cases:
        current = copy.deepcopy(inventory)
        mutate_inventory(current)
        errors = validate_fixture_set(manifest, current)
        results.append({"fixture": "in-memory-fixture-set", "operation": operation, "error_codes": sorted({item.split(":", 1)[0] for item in errors}), "rejected": "fixture-manifest-binding" in {item.split(":", 1)[0] for item in errors}})
    return results


def report(root: Path) -> dict[str, Any]:
    """Builds the deterministic report without changing repository artifacts.

    Args:
        root: Repository root.

    Returns:
        Serializable global verification report.
    """
    manifest_path = root / FIXTURE_MANIFEST
    manifest_errors: list[str] = []
    if digest(manifest_path) != EXPECTED_FIXTURE_MANIFEST_SHA256:
        error(manifest_errors, "fixture-manifest-binding", "manifest byte digest")
    manifest = load(manifest_path)
    inventory = live_fixture_inventory(root)
    manifest_errors.extend(validate_fixture_set(manifest, inventory))
    behavior = run_fixtures(root, manifest, inventory) if not manifest_errors else []
    meta = run_fixture_set_meta_counterexamples(manifest, inventory)
    errors, measured = verify(root, make_snapshot(root)) if not manifest_errors else (manifest_errors, {})
    counterexamples = behavior + meta
    return {
        "schema_version": "apk-asset-forensics.phase4-global-contract-test-report.v1",
        "track_id": TRACK.name,
        "role": "phase4-global-truth-test-author",
        "verifier": str(TRACK / "phase4_global_contract_test.py"),
        "verifier_sha256": digest(root / TRACK / "phase4_global_contract_test.py"),
        "fixture_manifest": {"path": str(FIXTURE_MANIFEST), "sha256": digest(manifest_path), "fixture_set_sha256": fixture_set_digest(inventory), "behavior_fixture_count": len(inventory), "meta_counterexample_count": len(meta)},
        "frozen_input_hashes": {filename: digest(root / TRACK / filename) for filename in FROZEN_HASHES},
        "production": {"passed": not errors, "errors": errors, "measured": measured},
        "counterexamples": counterexamples,
        "counterexample_count": len(counterexamples),
        "all_counterexamples_rejected": all(item["rejected"] for item in counterexamples),
        "final_status": "truth-test-pass-pending-fresh-v3-independent-global-review-and-root-acceptance" if not errors and all(item["rejected"] for item in counterexamples) else "truth-test-failed",
    }


def write_outputs(root: Path, result: dict[str, Any]) -> None:
    """Publishes the report and bounded truth-test author receipt.

    Args:
        root: Repository root.
        result: Final successful or failed verification report.
    """
    report_path = root / TRACK / "phase4-global-test-report.json"
    receipt_path = root / TRACK / "role-receipts" / "phase4-global" / "truth-test-author.json"
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    receipt = {
        "schema_version": "apk-asset-forensics.phase4-global-truth-test-receipt.v1",
        "track_id": TRACK.name,
        "phase": "Phase 4 global reconciliation",
        "role": "truth-test-author",
        "native_task_name": "phase4_global_truth_test",
        "role_boundary": "Deterministic aggregate verification only; no independent review or root acceptance.",
        "exact_verified_inputs": result["frozen_input_hashes"],
        "fixture_manifest": result["fixture_manifest"],
        "output_file_hashes": {
            str(TRACK / "phase4_global_contract_test.py"): result["verifier_sha256"],
            str(TRACK / "phase4-global-test-report.json"): digest(report_path),
        },
        "production": result["production"],
        "counterexamples": {"count": result["counterexample_count"], "all_rejected": result["all_counterexamples_rejected"]},
        "findings": {"Critical": [], "High": [], "Medium": [], "Low": []},
        "unresolved_blocking_findings": result["production"]["errors"],
        "final_status": result["final_status"],
    }
    receipt_path.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> int:
    """Runs the global contract and optionally publishes its result.

    Returns:
        Zero for a fully green global contract; one otherwise.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    result = report(args.root.resolve())
    if args.write:
        write_outputs(args.root.resolve(), result)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["production"]["passed"] and result["all_counterexamples_rejected"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
