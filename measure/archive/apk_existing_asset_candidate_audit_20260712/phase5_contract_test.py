#!/usr/bin/env python3
"""Fail-closed independent reconciliation for the Phase 5 candidate publication."""

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
BATCHES = tuple(f"AF-{n:02d}" for n in range(1, 13))
REPORT = TRACK / "phase5-candidate-report-v1.json"
MANIFEST = TRACK / "phase5-candidate-manifest-non-consumable-v1.json"
FIXTURE_MANIFEST = TRACK / "phase5-fixture-manifest-v1.json"
FIXTURE_DIR = TRACK / "negative-fixtures/phase5"
RECEIPT = TRACK / "role-receipts/phase5/report-manifest-producer.json"
OUT_REPORT = TRACK / "phase5-contract-test-report.json"
OUT_RECEIPT = TRACK / "role-receipts/phase5/truth-test-author.json"
EXPECTED = {"candidate_paths": 428, "identical_hash_groups": 227, "caller_locators": 533,
            "accepted_path_usage_links": 85, "scene_links": 77, "non_scene_links": 8,
            "unique_usage_ids": 45, "unique_scene_usage_ids": 40, "unique_non_scene_usage_ids": 5,
            "responsive_assessment_cells": 308, "priority1_paths": 14,
            "dispositions": {"replace": 85, "reject": 14, "unknown": 329}}
STATUS = "NON_CONSUMABLE_PENDING_INDEPENDENT_REVIEW_AND_ROOT_ACCEPTANCE"
VISUAL = ["Dragon Flight compact direction controls begin below the initial viewport.",
          "RPG Battle remains blocked in a repeated vocabulary-fetch loop at both viewports.",
          "Magic Defense compact start content is clipped at the edge.",
          "Enchanted Library wide capture timed out and remains blocked.",
          "Potion Rush compact gameplay shows an unresolved HUD key and overlay pressure.",
          "Castle Defense compact post-start canvas extends below the viewport."]


def sha(path: Path) -> str:
    """Returns the SHA-256 digest of exact file bytes."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def canon(value: Any) -> str:
    """Serializes a JSON value into deterministic canonical bytes."""
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def record_sha(record: dict[str, Any]) -> str:
    """Returns the canonical record digest excluding its self-referential digest field."""
    value = dict(record)
    value.pop("record_sha256", None)
    return hashlib.sha256(canon(value).encode()).hexdigest()


def load(path: Path) -> Any:
    """Loads one UTF-8 JSON artifact."""
    return json.loads(path.read_text(encoding="utf-8"))


def resolve_json_pointer(document: Any, pointer: str) -> Any:
    """Resolves one RFC 6901 JSON pointer against a parsed document."""
    if pointer == "":
        return document
    if not isinstance(pointer, str) or not pointer.startswith("/"):
        raise KeyError("invalid JSON pointer")
    current = document
    for raw_token in pointer[1:].split("/"):
        token = raw_token.replace("~1", "/").replace("~0", "~")
        current = current[int(token)] if isinstance(current, list) else current[token]
    return current


def nested_evidence_errors(root: Path, records: list[dict[str, Any]]) -> list[str]:
    """Validates every recursively embedded evidence path, digest, and JSON pointer."""
    errors: list[str] = []
    digest_cache: dict[Path, str] = {}
    json_cache: dict[Path, Any] = {}

    def visit(node: Any, trail: tuple[str, ...]) -> None:
        if isinstance(node, list):
            for index, value in enumerate(node):
                visit(value, (*trail, str(index)))
            return
        if not isinstance(node, dict):
            return
        pairs: dict[tuple[str, str], str] = {}
        if isinstance(node.get("path"), str) and isinstance(node.get("sha256"), str):
            pairs[("path", "sha256")] = ""
        for key, value in node.items():
            if key.endswith("_path") and isinstance(value, str):
                prefix = key[:-5]
                digest_key = f"{prefix}_sha256"
                if isinstance(node.get(digest_key), str):
                    pairs[(key, digest_key)] = f"{prefix}_"
        for (path_key, digest_key), pointer_prefix in pairs.items():
            declared_path = node[path_key]
            target = (root / declared_path).resolve()
            label = f"{chr(47).join(trail)} {path_key}={declared_path}"
            try:
                target.relative_to(root)
            except ValueError:
                errors.append(f"path-escape {label}")
                continue
            if not target.is_file():
                errors.append(f"missing {label}")
                continue
            if target not in digest_cache:
                digest_cache[target] = sha(target)
            actual_digest = digest_cache[target]
            if actual_digest != node[digest_key]:
                errors.append(f"sha256-mismatch {label}")
                continue
            pointers: list[str] = []
            for pointer_key in (f"{pointer_prefix}json_pointer", f"{pointer_prefix}json_pointers"):
                value = node.get(pointer_key)
                if isinstance(value, str):
                    pointers.append(value)
                elif isinstance(value, list):
                    pointers.extend(item for item in value if isinstance(item, str))
            if not pointers:
                continue
            try:
                if target not in json_cache:
                    json_cache[target] = load(target)
                source_document = json_cache[target]
            except (OSError, json.JSONDecodeError):
                errors.append(f"json-unreadable {label}")
                continue
            for pointer in pointers:
                try:
                    resolve_json_pointer(source_document, pointer)
                except (KeyError, IndexError, TypeError, ValueError):
                    errors.append(f"pointer-unresolved {label}#{pointer}")
        for key, value in node.items():
            visit(value, (*trail, str(key)))

    visit(records, ("records",))
    return errors


def err(errors: list[str], code: str, detail: str) -> None:
    """Appends one stable machine-readable contract failure."""
    errors.append(f"{code}: {detail}")


def by_path(document: Any) -> dict[str, dict[str, Any]]:
    """Indexes a source document's path-grain records without guessing its outer key."""
    if not isinstance(document, dict):
        return {}
    for value in document.values():
        if isinstance(value, list) and all(isinstance(x, dict) for x in value):
            indexed = {x.get("canonical_path"): x for x in value if isinstance(x.get("canonical_path"), str)}
            if indexed:
                return indexed
    return {}


def sources(root: Path) -> tuple[dict[str, dict[str, Any]], dict[str, str]]:
    """Builds the immutable Phase 0-4 path-level source-of-truth index."""
    rows: dict[str, dict[str, Any]] = {}
    hashes: dict[str, str] = {}
    for batch in BATCHES:
        files = {"mechanical_metadata": TRACK / "batches" / batch / "mechanical-metadata.json",
                 "caller_inventory": TRACK / "batches" / batch / "caller-inventory.json",
                 "provenance_license_eligibility": TRACK / "batches" / batch / "provenance-audit.json",
                 "phase4_join": TRACK / "batches" / batch / "phase4-path-usage-joins.json",
                 "phase4_group_rollup_pointer": TRACK / "batches" / batch / "phase4-group-rollup.json"}
        docs = {name: load(root / path) for name, path in files.items()}
        indexes = {name: by_path(doc) for name, doc in docs.items()}
        hashes.update({str(path): sha(root / path) for path in files.values()})
        for path, join in indexes["phase4_join"].items():
            if path in rows:
                raise ValueError(f"duplicate Phase4 source path {path}")
            rows[path] = {"batch_id": batch, "phase4_join": join,
                          "mechanical_metadata": indexes["mechanical_metadata"].get(path),
                          "caller_inventory": indexes["caller_inventory"].get(path),
                          "provenance_license_eligibility": indexes["provenance_license_eligibility"].get(path),
                          "phase4_group_rollup_pointer": {"path": str(files["phase4_group_rollup_pointer"]),
                                                           "sha256": hashes[str(files["phase4_group_rollup_pointer"])]}}
    return rows, hashes


def measured(records: list[dict[str, Any]]) -> dict[str, Any]:
    """Derives all required aggregate counts from report record Phase 4 joins."""
    joins = [r.get("phase4_join", {}) for r in records]
    links = [link for row in joins for link in row.get("usage_links", [])]
    scene = [link for link in links if link.get("normalized_usage", {}).get("surface_kind") == "scene"]
    non_scene = [link for link in links if link.get("normalized_usage", {}).get("surface_kind") != "scene"]
    disp = Counter(row.get("disposition", {}).get("value") for row in joins)
    return {"candidate_paths": len(records), "identical_hash_groups": len({r.get("identical_hash_group") for r in records}),
            "caller_locators": sum(len(row.get("caller_locators", [])) for row in joins),
            "accepted_path_usage_links": len(links), "scene_links": len(scene), "non_scene_links": len(non_scene),
            "unique_usage_ids": len({x.get("usage_id") for x in links}), "unique_scene_usage_ids": len({x.get("usage_id") for x in scene}),
            "unique_non_scene_usage_ids": len({x.get("usage_id") for x in non_scene}),
            "responsive_assessment_cells": sum(len(x.get("responsive_assessment_cells", [])) for x in links),
            "priority1_paths": sum(row.get("priority1_evidence", {}).get("applies") is True for row in joins),
            "dispositions": {k: disp[k] for k in ("replace", "reject", "unknown")}}


def summary_shape(counts: dict[str, Any]) -> dict[str, Any]:
    """Renders the declared compact Phase 5 aggregate summary."""
    return {"candidate_paths": counts["candidate_paths"], "identical_hash_groups": counts["identical_hash_groups"], "caller_locators": counts["caller_locators"], "accepted_path_usage_links": {"total": counts["accepted_path_usage_links"], "scene": counts["scene_links"], "non_scene": counts["non_scene_links"]}, "unique_usage_ids": {"total": counts["unique_usage_ids"], "scene": counts["unique_scene_usage_ids"], "non_scene": counts["unique_non_scene_usage_ids"]}, "responsive_assessment_cells": counts["responsive_assessment_cells"], "dispositions": counts["dispositions"], "priority1": {"paths": counts["priority1_paths"], "required_disposition": "reject", "required_replacement_action": "retire", "all_reconciled": True}, "browser_usability_defects": 6}


def fixture_gate(root: Path) -> tuple[list[str], list[dict[str, Any]]]:
    """Validates the hash-bound fixture inventory before production verification."""
    errors: list[str] = []
    try:
        manifest = load(root / FIXTURE_MANIFEST)
    except (OSError, json.JSONDecodeError):
        return ["fixture-manifest-binding: manifest unavailable or malformed"], []
    fixtures = manifest.get("fixtures") if isinstance(manifest, dict) else None
    if manifest.get("schema_version") != "apk-asset-forensics.phase5-fixture-manifest.v1" or manifest.get("fixture_directory") != str(FIXTURE_DIR) or not isinstance(fixtures, list) or len(fixtures) != 19:
        return ["fixture-manifest-binding: envelope"], []
    live = {str(p.relative_to(root)): p for p in (root / FIXTURE_DIR).glob("*.json")}
    declared = {x.get("path"): x for x in fixtures if isinstance(x, dict) and set(x) == {"path", "sha256", "operation", "expected_error_code"}}
    if len(declared) != 19 or set(declared) != set(live): err(errors, "fixture-manifest-binding", "exact path set")
    ops: set[str] = set()
    for path, entry in declared.items():
        if entry["operation"] in ops: err(errors, "fixture-manifest-binding", "duplicate operation")
        ops.add(entry["operation"])
        try:
            document = load(live[path])
            if sha(live[path]) != entry["sha256"] or document != {"operation": entry["operation"], "expected_error_code": entry["expected_error_code"]}:
                err(errors, "fixture-manifest-binding", path)
        except (OSError, json.JSONDecodeError): err(errors, "fixture-manifest-binding", path)
    return errors, [declared[p] for p in sorted(declared)]


def validate(root: Path, report: Any, manifest: Any, receipt: Any, source: dict[str, dict[str, Any]], hashes: dict[str, str]) -> tuple[list[str], dict[str, Any]]:
    """Checks candidate artifacts against every frozen path-level source and policy gate."""
    errors: list[str] = []
    if not isinstance(report, dict) or not isinstance(manifest, dict):
        return ["artifact-schema: report or manifest is not an object"], {}
    records, entries = report.get("records"), manifest.get("entries")
    if not isinstance(records, list) or not isinstance(entries, list):
        return ["artifact-schema: report.records or manifest.entries absent"], {}
    paths = [r.get("canonical_path") for r in records if isinstance(r, dict)]
    entry_paths = [x.get("canonical_path") for x in entries if isinstance(x, dict)]
    if paths != sorted(paths) or len(paths) != len(set(paths)) or set(paths) != set(source) or len(paths) != 428: err(errors, "path-set", "report exact sorted 428 path denominator")
    if entry_paths != paths or len(entries) != 428: err(errors, "path-set", "manifest exact report path denominator")
    expected_keys = {"record_index", "canonical_path", "asset_sha256", "identical_hash_group", "batch_id", "mechanical_metadata", "caller_inventory", "provenance_license_eligibility", "substantive_inspection", "phase4_join", "phase4_group_rollup_pointer", "evidence_pointers", "record_sha256"}
    entry_keys = {"record_index", "canonical_path", "asset_sha256", "report_record_sha256", "identical_hash_group", "batch_id", "join_status", "accepted_usage_ids", "disposition", "priority1_evidence", "eligibility", "canonical_standard_pack_candidate_key", "direct_legacy_adoption"}
    entry_by_path = {x.get("canonical_path"): x for x in entries if isinstance(x, dict)}
    for index, record in enumerate(records):
        if not isinstance(record, dict) or set(record) != expected_keys: err(errors, "artifact-schema", f"report record {index}"); continue
        path = record["canonical_path"]; expected = source.get(path)
        if record.get("record_index") != index or not expected: err(errors, "path-set", str(path)); continue
        if record.get("record_sha256") != record_sha(record): err(errors, "record-hash", path)
        for key in ("batch_id", "mechanical_metadata", "caller_inventory", "phase4_join"):
            if record.get(key) != expected.get(key): err(errors, "source-hash-pointer-parity", f"{path} {key}")
        join = expected["phase4_join"]
        actual_join = record.get("phase4_join", {})
        expected_provenance = {**join.get("provenance", {}), "eligibility": join.get("eligibility")}
        if record.get("provenance_license_eligibility") != expected_provenance:
            err(errors, "source-hash-pointer-parity", f"{path} provenance")
        group_pointer = record.get("phase4_group_rollup_pointer", {})
        if not isinstance(group_pointer, dict) or set(group_pointer) != {"path", "sha256", "json_pointer"} or group_pointer.get("path") != str(TRACK / "batches" / expected["batch_id"] / "phase4-group-rollup.json") or group_pointer.get("sha256") != sha(root / (TRACK / "batches" / expected["batch_id"] / "phase4-group-rollup.json")):
            err(errors, "source-hash-pointer-parity", f"{path} group rollup pointer")
        inspection_pointer = record.get("evidence_pointers", {}).get("inspection_records", {})
        try:
            inspection_doc = load(root / inspection_pointer["path"]); inspection_source = inspection_doc["groups"][int(inspection_pointer["json_pointer"].split("/")[-1])]
            if inspection_pointer.get("sha256") != sha(root / inspection_pointer["path"]) or record.get("substantive_inspection") != inspection_source:
                err(errors, "source-hash-pointer-parity", f"{path} inspection")
        except (KeyError, ValueError, IndexError, OSError, json.JSONDecodeError):
            err(errors, "source-hash-pointer-parity", f"{path} inspection pointer")
        expected_locators = {(x.get("locator_id"), canon(x)) for x in join.get("caller_locators", [])}
        actual_locators = {(x.get("locator_id"), canon(x)) for x in record.get("phase4_join", {}).get("caller_locators", [])}
        if actual_locators != expected_locators:
            err(errors, "caller-locator-ownership", path)
        if record.get("phase4_join", {}).get("usage_links") != join.get("usage_links"):
            err(errors, "usage-cell-parity", path)
        if record.get("asset_sha256") != join.get("sha256") or record.get("identical_hash_group") != join.get("identical_hash_group"):
            err(errors, "source-hash-pointer-parity", f"{path} asset identity")
        entry = entry_by_path.get(path)
        if not isinstance(entry, dict) or set(entry) != entry_keys: err(errors, "artifact-schema", f"manifest {path}"); continue
        parity = {"record_index": index, "asset_sha256": record["asset_sha256"], "identical_hash_group": record["identical_hash_group"], "batch_id": record["batch_id"], "join_status": join.get("join_status"), "accepted_usage_ids": join.get("accepted_usage_ids"), "disposition": join.get("disposition"), "priority1_evidence": join.get("priority1_evidence"), "eligibility": join.get("eligibility"), "canonical_standard_pack_candidate_key": join.get("canonical_standard_pack_candidate_key", {}).get("value"), "direct_legacy_adoption": False}
        if entry.get("report_record_sha256") != record["record_sha256"] or any(entry.get(k) != v for k, v in parity.items()): err(errors, "report-manifest-binding", path)
        if actual_join.get("canonical_standard_pack_candidate_key", {}).get("value") is not None or actual_join.get("canonical_standard_pack_candidate_key", {}).get("status") != "forbidden-pending-T9" or actual_join.get("direct_legacy_adoption") is not False: err(errors, "canonical-key-direct-adoption", path)
        if actual_join.get("disposition", {}).get("value") in {"reuse", "adapt", "reference"} or any(actual_join.get("eligibility", {}).get(k, {}).get("allowed") for k in ("reuse", "adapt", "reference")): err(errors, "reuse-adapt-reference-forbidden", path)
        if actual_join.get("priority1_evidence", {}).get("applies") and (actual_join.get("disposition", {}).get("value") != "reject" or actual_join.get("disposition", {}).get("replacement_action") != "retire"): err(errors, "disposition-priority1", path)
    locator_errors = nested_evidence_errors(root, records)
    if locator_errors:
        err(errors, "nested-evidence-locator", "; ".join(locator_errors[:20]))
    counts = measured(records)
    if counts != EXPECTED: err(errors, "summary-parity", str(counts))
    if report.get("reconciliation_summary") != summary_shape(EXPECTED) or manifest.get("reconciliation_summary") != summary_shape(EXPECTED): err(errors, "summary-parity", "report reconciliation")
    phase4_acceptance = TRACK / "phase4-root-acceptance.json"
    expected_report_binding = {"path": str(REPORT), "sha256": sha(root / REPORT), "byte_size": (root / REPORT).stat().st_size, "record_collection": "records", "record_count": 428}
    expected_phase4_binding = {"path": str(phase4_acceptance), "sha256": sha(root / phase4_acceptance), "decision": "ACCEPT_PHASE4"}
    if manifest.get("report_binding") != expected_report_binding or manifest.get("phase4_root_acceptance_binding") != expected_phase4_binding:
        err(errors, "report-manifest-binding", "manifest report or Phase4 acceptance binding")
    if report.get("artifact_status") != STATUS or manifest.get("status") != STATUS or report.get("consumer_guard") is not False or manifest.get("consumer_guard") is not False: err(errors, "non-consumable-guard", "status or guard")
    if report.get("browser_is_per_path_runtime_load_proof") is True or report.get("browser_usability_defect_disclosures") != VISUAL: err(errors, "browser-scope-disclosure", "Phase4 six-disclosure scope")
    if list((root / TRACK).glob("phase5*accepted*manifest*.json")): err(errors, "no-accepted-manifest-before-owner-gate", "accepted Phase5 manifest exists")
    bindings = report.get("source_artifact_bindings")
    binding_digest = hashlib.sha256(canon(bindings).encode()).hexdigest() if isinstance(bindings, list) else None
    expected_binding_paths = set(hashes)
    if (not isinstance(bindings, list) or bindings != sorted(bindings, key=lambda item: item.get("path", "")) or
            any(not isinstance(item, dict) or set(item) != {"path", "sha256", "byte_size", "category"} or
                not isinstance(item.get("path"), str) or not (root / item["path"]).is_file() or item.get("sha256") != sha(root / item["path"]) or item.get("byte_size") != (root / item["path"]).stat().st_size or not isinstance(item.get("category"), str) or not item["category"]
                for item in bindings) or len(bindings) != 202 or
            report.get("source_artifact_bindings_sha256") != binding_digest or manifest.get("source_artifact_bindings_sha256") != binding_digest):
        err(errors, "source-hash-pointer-parity", "exact source artifact bindings")
    if not isinstance(receipt, dict): err(errors, "producer-receipt-binding", "receipt unavailable")
    else:
        receipt_text = canon(receipt)
        if sha(root / REPORT) not in receipt_text or sha(root / MANIFEST) not in receipt_text: err(errors, "producer-receipt-binding", "candidate output hashes")
    return errors, counts


def mutate(report: dict[str, Any], manifest: dict[str, Any], receipt: Any, operation: str) -> None:
    """Applies a single isolated counterexample mutation in memory."""
    records, entries = report["records"], manifest["entries"]
    if operation == "missing_path": records.pop(); entries.pop()
    elif operation == "extra_path": records.append(copy.deepcopy(records[0])); records[-1]["canonical_path"] = "extra"; entries.append(copy.deepcopy(entries[0])); entries[-1]["canonical_path"] = "extra"
    elif operation == "duplicate_path": records.append(copy.deepcopy(records[0])); entries.append(copy.deepcopy(entries[0]))
    elif operation == "caller_loss": next(r for r in records if r["phase4_join"]["caller_locators"])["phase4_join"]["caller_locators"] = []
    elif operation == "caller_ownership_swap":
        target = [r for r in records if r["phase4_join"]["caller_locators"]][:2]; target[0]["phase4_join"]["caller_locators"], target[1]["phase4_join"]["caller_locators"] = target[1]["phase4_join"]["caller_locators"], target[0]["phase4_join"]["caller_locators"]
    elif operation == "source_hash_drift": records[0]["asset_sha256"] = "0" * 64
    elif operation == "source_pointer_drift": records[0]["phase4_group_rollup_pointer"]["sha256"] = "0" * 64
    elif operation == "mechanical_provenance_inspection_swap": records[0]["mechanical_metadata"], records[0]["provenance_license_eligibility"] = records[0]["provenance_license_eligibility"], records[0]["mechanical_metadata"]
    elif operation == "disposition_p1_drift": next(r for r in records if r["phase4_join"]["priority1_evidence"]["applies"])["phase4_join"]["disposition"]["value"] = "unknown"
    elif operation == "usage_cell_drift": records[0]["phase4_join"]["usage_links"].append({})
    elif operation == "report_manifest_pointer_hash_mismatch": entries[0]["report_record_sha256"] = "0" * 64
    elif operation == "summary_drift": report["reconciliation_summary"]["candidate_paths"] = 0
    elif operation == "illicit_canonical_key": records[0]["phase4_join"]["canonical_standard_pack_candidate_key"]["value"] = "bad"
    elif operation == "illicit_direct_adoption": records[0]["phase4_join"]["direct_legacy_adoption"] = True
    elif operation == "illicit_reuse": records[0]["phase4_join"]["disposition"]["value"] = "reuse"
    elif operation == "consumable_status_guard": manifest["status"] = "ACCEPTED"
    elif operation == "browser_per_path_claim": report["browser_is_per_path_runtime_load_proof"] = True
    elif operation == "stale_producer_receipt": receipt.clear()
    elif operation == "nested_evidence_locator_drift":
        def drift(node: Any) -> bool:
            if isinstance(node, dict):
                for key, value in node.items():
                    if key.endswith("_path") and isinstance(value, str) and isinstance(node.get(f"{key[:-5]}_sha256"), str):
                        node[key] = "measure/tracks/apk_existing_asset_candidate_audit_20260712/negative-fixtures/phase5/does-not-exist.json"
                        return True
                if isinstance(node.get("path"), str) and isinstance(node.get("sha256"), str):
                    node["path"] = "measure/tracks/apk_existing_asset_candidate_audit_20260712/negative-fixtures/phase5/does-not-exist.json"
                    return True
                return any(drift(value) for value in node.values())
            if isinstance(node, list):
                return any(drift(value) for value in node)
            return False
        if not drift(records):
            raise ValueError("no nested evidence locator available to mutate")


def main() -> int:
    """Runs the immutable fixture gate, production contract, and isolated fixtures."""
    parser = argparse.ArgumentParser(); parser.add_argument("--root", type=Path, default=Path(".")); parser.add_argument("--write", action="store_true"); args = parser.parse_args(); root = args.root.resolve()
    gate_errors, fixtures = fixture_gate(root)
    unavailable = [str(p) for p in (REPORT, MANIFEST, RECEIPT) if not (root / p).exists()]
    if gate_errors or unavailable:
        errors = gate_errors + [f"producer-artifact-unavailable: {x}" for x in unavailable]; counts = {}; fixture_results = []; source_diagnostic, _ = sources(root); worktree_absent = sorted(path for path in source_diagnostic if not (root / path).is_file())
    else:
        source, hashes = sources(root); worktree_absent = sorted(path for path in source if not (root / path).is_file()); report, manifest, receipt = load(root / REPORT), load(root / MANIFEST), load(root / RECEIPT)
        errors, counts = validate(root, report, manifest, receipt, source, hashes); fixture_results = []
        for fixture in fixtures:
            a, b, c = copy.deepcopy(report), copy.deepcopy(manifest), copy.deepcopy(receipt); mutate(a, b, c, fixture["operation"]); found, _ = validate(root, a, b, c, source, hashes); codes = sorted({x.split(":", 1)[0] for x in found}); fixture_results.append({"fixture": fixture["path"], "operation": fixture["operation"], "expected_error_code": fixture["expected_error_code"], "error_codes": codes, "rejected": fixture["expected_error_code"] in codes})
    result = {"schema_version": "apk-asset-forensics.phase5-contract-test-report.v1", "track_id": "apk_existing_asset_candidate_audit_20260712", "role": "phase5-truth-test-author", "production": {"passed": not errors, "errors": errors, "measured": counts}, "current_worktree_diagnostic": {"authoritative": False, "current_worktree_absent_paths": worktree_absent}, "all_counterexamples_rejected": bool(fixture_results) and all(x["rejected"] for x in fixture_results), "counterexample_count": len(fixture_results), "counterexamples": fixture_results, "final_status": "truth-test-pass-pending-fresh-independent-review-and-root-acceptance" if not errors and fixture_results and all(x["rejected"] for x in fixture_results) else "truth-test-red-blocked"}
    if args.write:
        (root / OUT_REPORT).write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8"); (root / OUT_RECEIPT).parent.mkdir(parents=True, exist_ok=True)
        receipt_out = {"schema_version": "apk-asset-forensics.phase5-truth-test-author-receipt.v1", "role": "phase5-truth-test-author", "output_file_hashes": {str(OUT_REPORT): sha(root / OUT_REPORT), str(TRACK / "phase5_contract_test.py"): sha(root / TRACK / "phase5_contract_test.py")}, "production": result["production"], "counterexamples": {"count": result["counterexample_count"], "all_rejected": result["all_counterexamples_rejected"]}, "final_status": result["final_status"]}; (root / OUT_RECEIPT).write_text(json.dumps(receipt_out, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2, sort_keys=True)); return 0 if result["production"]["passed"] and result["all_counterexamples_rejected"] else 1


if __name__ == "__main__": raise SystemExit(main())
