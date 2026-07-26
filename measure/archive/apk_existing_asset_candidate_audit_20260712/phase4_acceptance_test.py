#!/usr/bin/env python3
"""Fail-closed contract for the exact Phase 4 root-acceptance decision."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path
from typing import Any


TRACK_ID = "apk_existing_asset_candidate_audit_20260712"
TRACK = Path("measure/tracks") / TRACK_ID
ACCEPTANCE = TRACK / "phase4-root-acceptance.json"
FIXTURE_DIRECTORY = TRACK / "negative-fixtures/phase4-acceptance"
V4_REVIEW = TRACK / "phase4-global-review-v4.json"
V4_REVIEW_RECEIPT = TRACK / "role-receipts/phase4-global/adversarial-reviewer-v4.json"

ACCEPTANCE_BINDINGS = {
    str(TRACK / "phase4_global_contract_test.py"): "9fadb918fec90f1537f9c0783ef158924d792ea263716498213f66ba70cb9897",
    str(TRACK / "phase4-global-test-report.json"): "63e84630ff59cc611d836489263b6a5eb4854f0befec6fc2b653761264441185",
    str(TRACK / "role-receipts/phase4-global/truth-test-author.json"): "b72673b8724c6568d59ec1fb9d2bf73b18b2bfd6f3159ff2157c44784359f43f",
    str(V4_REVIEW): "f3fc70343d360ea806d204f6cae717c1b786449c23708e3f1c51517e54c91e83",
    str(V4_REVIEW_RECEIPT): "7aa3e42fc2def3d3d9c7b500fe0a64bbb01465eac45e4c6cac72dd8738a9e7ae",
    str(TRACK / "phase4-browser-evidence-freeze-v1.json"): "5c64618ccd05b39ab63f1befb8d74d75f6a7fdf5b9613d31c8ee1b3369065231",
    str(TRACK / "phase4-input-freeze-v1.json"): "ae387ae1e9a10d6398e8fd340924a12fc9ca19d706d9c079a2b071babcbbfcd3",
    str(TRACK / "phase4-source-registry-v1.json"): "450f5ab66215178aa730e057cb28a220bfb550dfd924959a7f7f1da2eea02f9e",
}

ACCEPTED_RECONCILIATION = {
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
    "dispositions": {
        "replace": 85,
        "reject": 14,
        "unknown": 329,
    },
}

ROOT_DIRECT_VISUAL_DECISIONS = [
    {
        "game_id": "dragon-flight",
        "candidate_join_scope": "exact joined game",
        "compact_current_legacy_function": "incompatible-required-direction-controls-begin-below-initial-viewport",
        "wide_current_legacy_function": "supported-by-bounded-scene-evidence",
        "evidence_path": str(TRACK / "phase4-browser-evidence/root-dragon-flight.json"),
    },
    {
        "game_id": "rpg-battle",
        "candidate_join_scope": "exact joined game",
        "compact_current_legacy_function": "blocked-repeated-vocabulary-fetch-loop",
        "wide_current_legacy_function": "blocked-repeated-vocabulary-fetch-loop",
        "evidence_path": str(TRACK / "phase4-browser-evidence/index.json"),
        "evidence_json_pointer": "/routes/1",
    },
    {
        "game_id": "magic-defense",
        "candidate_join_scope": "exact joined game",
        "compact_current_legacy_function": "incompatible-start-surface-text-and-content-clipped-at-compact-edge",
        "wide_current_legacy_function": "supported-by-bounded-start-surface-evidence",
        "evidence_path": str(TRACK / "phase4-browser-evidence/index.json"),
        "evidence_json_pointer": "/routes/2",
    },
    {
        "game_id": "enchanted-library",
        "candidate_join_scope": "exact joined game",
        "compact_current_legacy_function": "supported-with-required-vertical-scroll",
        "wide_current_legacy_function": "blocked-capture-timeout",
        "evidence_path": str(TRACK / "phase4-browser-evidence/index.json"),
        "evidence_json_pointer": "/routes/3",
    },
    {
        "game_id": "potion-rush",
        "candidate_join_scope": "exact joined game",
        "compact_current_legacy_function": "incompatible-gameplay-shows-unresolved-hud-key-and-overlay-pressure",
        "wide_current_legacy_function": "supported-by-bounded-start-surface-evidence",
        "evidence_path": str(TRACK / "phase4-browser-evidence/index.json"),
        "evidence_json_pointer": "/routes/4",
    },
    {
        "game_id": "castle-defense",
        "candidate_join_scope": "accepted-cohort-closure-only-no-exact-candidate-path-join",
        "compact_current_legacy_function": "incompatible-post-start-canvas-extends-below-viewport",
        "wide_current_legacy_function": "supported-with-vertical-document-overflow",
        "evidence_path": str(TRACK / "phase4-browser-evidence/index.json"),
        "evidence_json_pointer": "/routes/0",
    },
]

USABILITY_DEFECT_DISCLOSURES = [
    "Dragon Flight compact direction controls begin below the initial viewport.",
    "RPG Battle remains blocked in a repeated vocabulary-fetch loop at both viewports.",
    "Magic Defense compact start content is clipped at the edge.",
    "Enchanted Library wide capture timed out and remains blocked.",
    "Potion Rush compact gameplay shows an unresolved HUD key and overlay pressure.",
    "Castle Defense compact post-start canvas extends below the viewport.",
]

FAILED_REVIEW_CYCLES = [
    {
        "path": str(TRACK / "phase4-global-review.json"),
        "sha256": "420a3c017d52cd4ebf71bbb5e073e42698b619f46249ed69996a21347fdf93ed",
        "final_status": "review-fail-blocking-remediation",
        "authoritative": False,
        "accepted": False,
    },
    {
        "path": str(TRACK / "phase4-global-review-v2.json"),
        "sha256": "6ae1c317545194ddbb7b0237530379f8299d1a0b287be76cdc5f9c3fb4771ed5",
        "final_status": "review-fail-blocking-remediation",
        "authoritative": False,
        "accepted": False,
    },
    {
        "path": str(TRACK / "phase4-global-review-v3.json"),
        "sha256": "d7d4a6272b84679237b202d18dc909982e0aa77955220ffc2b804e37c12ee11b",
        "final_status": "review-fail-blocking-remediation",
        "authoritative": False,
        "accepted": False,
    },
]

EXPECTED_ACCEPTANCE = {
    "schema_version": "apk-asset-forensics.phase4-root-acceptance.v1",
    "track_id": TRACK_ID,
    "phase": 4,
    "accepted_by": "root-orchestrator-product-owner",
    "decision": "ACCEPT_PHASE4",
    "input_bindings": ACCEPTANCE_BINDINGS,
    "accepted_reconciliation": ACCEPTED_RECONCILIATION,
    "priority1_decision": {
        "priority1_paths": 14,
        "required_disposition": "reject",
        "required_replacement_action": "retire",
        "all_rejected_and_retired": True,
    },
    "blocking_findings": {
        "Critical": [],
        "High": [],
        "Medium": [],
        "Low": [],
    },
    "browser_and_direct_visual_review": {
        "evidence_scope": "bounded-composite-scene-only",
        "browser_is_per_path_runtime_load_proof": False,
        "browser_is_candidate_suitability_or_adoption_proof": False,
        "root_direct_visual_decisions": ROOT_DIRECT_VISUAL_DECISIONS,
        "usability_defect_disclosures": USABILITY_DEFECT_DISCLOSURES,
    },
    "failed_review_cycles": FAILED_REVIEW_CYCLES,
    "scope_disclosures": [
        "Phase 4 accepts the responsive legacy-function and replacement-or-retirement join only.",
        "Legacy paths remain evidence only and never become canonical standard-pack candidate keys or direct production adoption paths.",
        "The browser evidence is composite-scene evidence only and does not prove per-candidate-path runtime loading.",
        "The v1, v2, and v3 failed global review cycles remain disclosed, rejected, and non-authoritative.",
        "Phase 4 acceptance does not accept the final candidate manifest, semantic ontology, implementation, production adoption, or shipping.",
    ],
    "next_gate": {
        "phase": 5,
        "name": "Independent acceptance",
        "status": "OPEN_PHASE5_ONLY",
        "only_next_gate": True,
    },
    "rationale": (
        "The exact v4 global verifier, report, truth receipt, independent review, "
        "reviewer receipt, frozen browser evidence, input freeze, and source registry "
        "are hash-bound; all required counts reconcile; all 14 priority-1 paths are "
        "rejected and retired; all Critical, High, Medium, and Low findings are empty; "
        "and the root direct-visual decisions preserve every disclosed usability defect."
    ),
}

# Filled after the fixture bytes are published. The verifier rejects any fixture
# set, filename, metadata, or byte drift before running a mutation.
FIXTURE_HASHES = {
    "count-drift.json": "0c161d230b5c274fe231a8db69a374b50ac8fb198d869edd734587f08020b4ff",
    "false-browser-per-path-claim.json": "98a8be65f2349ace70c82a291ef6bc3bb222c0c335f8e463d32eb49cc3b36879",
    "missing-acceptance.json": "ceda245203be4a9fa4178decc5b1de3a599f01af5f9b874267be59f8f19e77ba",
    "missing-visual-defect-disclosure.json": "b25161b73aed8bdf74bea96b05b51a0c45644677376440048b33cc433b6a56d1",
    "stale-hash.json": "82c5b3a44b158da8c5b325320ea0c25316ff1a4c2ccae64825d1e99e7301fac8",
    "unresolved-finding.json": "be750a09abe6dd9f2b5d3ee24a0d46f0e039788033fe3a9dd4c23cbc6ff58ad0",
    "wrong-decision-next-gate.json": "76aa09cd4872d26b8e3c612155e234d20951280dbd5b8bd7c8524187ca75df83",
}


def digest(path: Path) -> str:
    """Returns the SHA-256 digest of a file's exact bytes."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_json(path: Path) -> Any:
    """Loads one UTF-8 JSON artifact."""
    return json.loads(path.read_text(encoding="utf-8"))


def add_error(errors: list[str], code: str, detail: str) -> None:
    """Appends one stable contract error."""
    errors.append(f"{code}: {detail}")


def error_codes(errors: list[str]) -> set[str]:
    """Returns the stable code prefix from every contract error."""
    return {item.split(":", 1)[0] for item in errors}


def findings_are_empty(document: Any) -> bool:
    """Returns whether a review exposes exact empty C/H/M/L finding lists."""
    if not isinstance(document, dict):
        return False
    findings = document.get("findings")
    return findings == {"Critical": [], "High": [], "Low": [], "Medium": []}


def status_is_green_pending_root(value: Any) -> bool:
    """Returns whether a status is a green/pass state explicitly pending root."""
    return (
        isinstance(value, str)
        and "root" in value.lower()
        and ("pass" in value.lower() or "green" in value.lower())
        and "fail" not in value.lower()
    )


def validate_required_inputs(root: Path) -> list[str]:
    """Validates immutable hashes and v4 review authority before acceptance."""
    errors: list[str] = []
    for relative, expected_hash in ACCEPTANCE_BINDINGS.items():
        path = root / relative
        if not path.is_file():
            add_error(errors, "required-input-missing", relative)
            continue
        if digest(path) != expected_hash:
            add_error(errors, "required-input-hash", relative)
    for cycle in FAILED_REVIEW_CYCLES:
        path = root / cycle["path"]
        if not path.is_file() or digest(path) != cycle["sha256"]:
            add_error(errors, "failed-cycle-binding", cycle["path"])

    report_path = root / TRACK / "phase4-global-test-report.json"
    truth_path = root / TRACK / "role-receipts/phase4-global/truth-test-author.json"
    if report_path.is_file():
        report = load_json(report_path)
        measured = report.get("production", {}).get("measured")
        if (
            report.get("production", {}).get("passed") is not True
            or measured != {**ACCEPTED_RECONCILIATION, "unique_candidate_paths": 428}
            or not status_is_green_pending_root(report.get("final_status"))
        ):
            add_error(errors, "global-report-not-green", str(report_path.relative_to(root)))
    if truth_path.is_file():
        truth = load_json(truth_path)
        measured = truth.get("production", {}).get("measured")
        if (
            truth.get("production", {}).get("passed") is not True
            or measured != {**ACCEPTED_RECONCILIATION, "unique_candidate_paths": 428}
            or not findings_are_empty(truth)
            or truth.get("unresolved_blocking_findings") != []
            or not status_is_green_pending_root(truth.get("final_status"))
        ):
            add_error(errors, "global-truth-receipt-not-green", str(truth_path.relative_to(root)))

    if (root / V4_REVIEW).is_file():
        review = load_json(root / V4_REVIEW)
        decision = review.get("decision", {})
        verified = review.get("exact_verified_inputs", {})
        required_review_bindings = {
            path: ACCEPTANCE_BINDINGS[path]
            for path in (
                str(TRACK / "phase4_global_contract_test.py"),
                str(TRACK / "phase4-global-test-report.json"),
                str(TRACK / "role-receipts/phase4-global/truth-test-author.json"),
            )
        }
        if (
            review.get("schema_version") != "apk-asset-forensics.phase4-global-adversarial-review.v4"
            or review.get("track_id") != TRACK_ID
            or not findings_are_empty(review)
            or review.get("unresolved_blocking_findings") != []
            or decision.get("admit") is not True
            or decision.get("block") is not False
            or not status_is_green_pending_root(review.get("final_status"))
            or any(verified.get(path) != sha for path, sha in required_review_bindings.items())
        ):
            add_error(errors, "v4-global-review-not-green", str(V4_REVIEW))
    if (root / V4_REVIEW_RECEIPT).is_file():
        receipt = load_json(root / V4_REVIEW_RECEIPT)
        decision = receipt.get("decision", {})
        outputs = receipt.get("output_file_hashes", {})
        verified = receipt.get("exact_verified_inputs", {})
        required_receipt_inputs = {
            path: ACCEPTANCE_BINDINGS[path]
            for path in (
                str(TRACK / "phase4_global_contract_test.py"),
                str(TRACK / "phase4-global-test-report.json"),
                str(TRACK / "role-receipts/phase4-global/truth-test-author.json"),
            )
        }
        if (
            receipt.get("schema_version")
            != "apk-asset-forensics.phase4-global-adversarial-reviewer-receipt.v4"
            or receipt.get("track_id") != TRACK_ID
            or not findings_are_empty(receipt)
            or receipt.get("unresolved_blocking_findings") != []
            or decision.get("admit") is not True
            or decision.get("block") is not False
            or not status_is_green_pending_root(receipt.get("final_status"))
            or outputs.get(str(V4_REVIEW)) != ACCEPTANCE_BINDINGS[str(V4_REVIEW)]
            or any(verified.get(path) != sha for path, sha in required_receipt_inputs.items())
        ):
            add_error(errors, "v4-global-review-receipt-not-green", str(V4_REVIEW_RECEIPT))
    return errors


def validate_acceptance(acceptance: Any) -> list[str]:
    """Validates the exact root decision without creating or deciding it."""
    errors: list[str] = []
    if acceptance is None:
        add_error(errors, "acceptance-missing", str(ACCEPTANCE))
        return errors
    if not isinstance(acceptance, dict):
        add_error(errors, "acceptance-schema", "root acceptance must be an object")
        return errors
    if (
        acceptance.get("schema_version") != EXPECTED_ACCEPTANCE["schema_version"]
        or acceptance.get("track_id") != TRACK_ID
        or acceptance.get("phase") != 4
        or acceptance.get("accepted_by") != "root-orchestrator-product-owner"
    ):
        add_error(errors, "acceptance-schema", "envelope")
    if acceptance.get("decision") != "ACCEPT_PHASE4":
        add_error(errors, "acceptance-decision", "decision")
    if acceptance.get("input_bindings") != ACCEPTANCE_BINDINGS:
        add_error(errors, "acceptance-binding", "exact live evidence bindings")
    if acceptance.get("accepted_reconciliation") != ACCEPTED_RECONCILIATION:
        add_error(errors, "acceptance-counts", "exact reconciliation")
    if acceptance.get("priority1_decision") != EXPECTED_ACCEPTANCE["priority1_decision"]:
        add_error(errors, "acceptance-priority1", "14 reject and retire")
    if acceptance.get("blocking_findings") != EXPECTED_ACCEPTANCE["blocking_findings"]:
        add_error(errors, "acceptance-findings", "Critical High Medium Low must all be empty")
    browser = acceptance.get("browser_and_direct_visual_review")
    if not isinstance(browser, dict):
        add_error(errors, "acceptance-browser-boundary", "browser review object")
        add_error(errors, "acceptance-visual-disclosure", "direct visual decisions and defects")
    else:
        if (
            browser.get("evidence_scope") != "bounded-composite-scene-only"
            or browser.get("browser_is_per_path_runtime_load_proof") is not False
            or browser.get("browser_is_candidate_suitability_or_adoption_proof") is not False
        ):
            add_error(errors, "acceptance-browser-boundary", "composite-only not per-path proof")
        if (
            browser.get("root_direct_visual_decisions") != ROOT_DIRECT_VISUAL_DECISIONS
            or browser.get("usability_defect_disclosures") != USABILITY_DEFECT_DISCLOSURES
        ):
            add_error(
                errors,
                "acceptance-visual-disclosure",
                "Dragon RPG Magic Enchanted Potion Castle exact decisions and defects",
            )
    if acceptance.get("failed_review_cycles") != FAILED_REVIEW_CYCLES:
        add_error(errors, "acceptance-failed-cycle-disclosure", "v1 v2 v3 non-authoritative")
    if acceptance.get("scope_disclosures") != EXPECTED_ACCEPTANCE["scope_disclosures"]:
        add_error(errors, "acceptance-scope", "exact scope disclosures")
    if acceptance.get("next_gate") != EXPECTED_ACCEPTANCE["next_gate"]:
        add_error(errors, "acceptance-next-gate", "Phase 5 only")
    if acceptance != EXPECTED_ACCEPTANCE:
        add_error(errors, "acceptance-exact-schema", "document differs from exact required decision")
    return errors


def load_fixture_inventory(root: Path) -> dict[str, dict[str, Any]]:
    """Loads the exact hash-bound acceptance counterexample inventory."""
    fixture_root = root / FIXTURE_DIRECTORY
    names = sorted(path.name for path in fixture_root.glob("*.json"))
    if names != sorted(FIXTURE_HASHES):
        raise AssertionError("fixture-set-binding: exact filename set")
    inventory: dict[str, dict[str, Any]] = {}
    operations: set[str] = set()
    for name, expected_hash in FIXTURE_HASHES.items():
        path = fixture_root / name
        if digest(path) != expected_hash:
            raise AssertionError(f"fixture-set-binding: byte drift {name}")
        document = load_json(path)
        if (
            not isinstance(document, dict)
            or set(document) != {"schema_version", "operation", "expected_error_codes"}
            or document.get("schema_version")
            != "apk-asset-forensics.phase4-acceptance-negative-fixture.v1"
            or not isinstance(document.get("operation"), str)
            or document["operation"] in operations
            or not isinstance(document.get("expected_error_codes"), list)
        ):
            raise AssertionError(f"fixture-set-binding: metadata {name}")
        operations.add(document["operation"])
        inventory[name] = document
    return inventory


def mutated_acceptance(operation: str) -> Any:
    """Returns one isolated acceptance mutation for a named fixture operation."""
    if operation == "missing_acceptance":
        return None
    acceptance = copy.deepcopy(EXPECTED_ACCEPTANCE)
    if operation == "stale_hash":
        path = str(TRACK / "phase4-global-test-report.json")
        acceptance["input_bindings"][path] = "0" * 64
    elif operation == "count_drift":
        acceptance["accepted_reconciliation"]["candidate_paths"] = 427
    elif operation == "unresolved_finding":
        acceptance["blocking_findings"]["Medium"] = ["P4-UNRESOLVED"]
    elif operation == "false_browser_per_path_claim":
        acceptance["browser_and_direct_visual_review"][
            "browser_is_per_path_runtime_load_proof"
        ] = True
    elif operation == "missing_visual_defect_disclosure":
        acceptance["browser_and_direct_visual_review"][
            "usability_defect_disclosures"
        ].pop()
    elif operation == "wrong_decision_next_gate":
        acceptance["decision"] = "ACCEPT_PHASE5"
        acceptance["next_gate"] = {
            "phase": 6,
            "name": "Implementation",
            "status": "OPEN_PHASE6",
            "only_next_gate": False,
        }
    else:
        raise AssertionError(f"unknown fixture operation: {operation}")
    return acceptance


def run_counterexamples(root: Path) -> list[dict[str, Any]]:
    """Runs all exact hash-bound negative fixtures against the acceptance validator."""
    results: list[dict[str, Any]] = []
    for name, fixture in sorted(load_fixture_inventory(root).items()):
        errors = validate_acceptance(mutated_acceptance(fixture["operation"]))
        expected = set(fixture["expected_error_codes"])
        actual = error_codes(errors)
        results.append(
            {
                "fixture": str(FIXTURE_DIRECTORY / name),
                "fixture_sha256": FIXTURE_HASHES[name],
                "operation": fixture["operation"],
                "expected_error_codes": sorted(expected),
                "actual_error_codes": sorted(actual),
                "rejected": expected.issubset(actual),
            }
        )
    return results


def render_report(root: Path) -> dict[str, Any]:
    """Renders the deterministic acceptance-gate report for the current root."""
    preflight_errors = validate_required_inputs(root)
    acceptance_path = root / ACCEPTANCE
    acceptance = load_json(acceptance_path) if acceptance_path.is_file() else None
    acceptance_errors = validate_acceptance(acceptance)
    try:
        counterexamples = run_counterexamples(root)
        fixture_errors: list[str] = []
    except (AssertionError, OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        counterexamples = []
        fixture_errors = [str(exc)]
    errors = preflight_errors + acceptance_errors + fixture_errors
    all_counterexamples_rejected = (
        len(counterexamples) == len(FIXTURE_HASHES)
        and all(item["rejected"] for item in counterexamples)
    )
    passed = not errors and all_counterexamples_rejected
    return {
        "schema_version": "apk-asset-forensics.phase4-acceptance-test-report.v1",
        "track_id": TRACK_ID,
        "role": "phase4-root-acceptance-contract-test-author",
        "verifier": str(TRACK / "phase4_acceptance_test.py"),
        "verifier_sha256": digest(root / TRACK / "phase4_acceptance_test.py"),
        "required_acceptance": str(ACCEPTANCE),
        "production": {
            "passed": passed,
            "errors": errors,
            "missing_acceptance_rejected": (
                "acceptance-missing" in error_codes(acceptance_errors)
            ),
        },
        "counterexample_count": len(counterexamples),
        "all_counterexamples_rejected": all_counterexamples_rejected,
        "counterexamples": counterexamples,
        "final_status": (
            "acceptance-contract-pass"
            if passed
            else "acceptance-contract-red-pending-root-decision"
        ),
    }


def main() -> int:
    """Runs the Phase 4 acceptance contract and prints deterministic JSON."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--print-required-acceptance", action="store_true")
    args = parser.parse_args()
    if args.print_required_acceptance:
        print(json.dumps(EXPECTED_ACCEPTANCE, indent=2, sort_keys=True))
        return 0
    report = render_report(args.root.resolve())
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["production"]["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
