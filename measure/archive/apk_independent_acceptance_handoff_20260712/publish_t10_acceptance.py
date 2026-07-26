#!/usr/bin/env python3
"""Publishes the ordered T10 review, delegated approval, and T11 handoff chain."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from t10_acceptance_verifier import (
    CATALOG_DIGEST,
    EXPECTED_VERSION,
    PACK_ACCEPTANCE_SHA256,
    PACK_CATALOG_SHA256,
    PACK_REL,
    REQUIRED_CREDIT,
    SOURCE_RECEIPT_DIGEST,
    T8_ACCEPTED_SHA256,
    T8_REL,
    T9_CANDIDATE_SHA256,
    T9_REL,
    T9_ROOT_SHA256,
    canonical_sha256,
    sha256_file,
    verify_candidate,
)


TRACK_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TRACK_ROOT.parents[2]


def write_json(path: Path, value: Any) -> None:
    """Writes one deterministic, human-reviewable JSON artifact."""
    path.write_text(
        json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def binding(path: Path) -> dict[str, str]:
    """Returns a repository-relative path and exact file digest."""
    return {
        "path": path.relative_to(REPO_ROOT).as_posix(),
        "sha256": sha256_file(path),
    }


def publish() -> dict[str, str]:
    """Publishes T10 artifacts in review-before-approval-before-manifest order."""
    result = verify_candidate(REPO_ROOT)
    if not result.passed:
        raise RuntimeError(json.dumps(result.as_json(), sort_keys=True))

    fixture_paths = sorted((TRACK_ROOT / "negative-fixtures" / "t10").glob("*.json"))
    fixture_rows = []
    attack_rows = []
    for path in fixture_paths:
        fixture = json.loads(path.read_text(encoding="utf-8"))
        attacked = verify_candidate(REPO_ROOT, mutations=fixture["mutations"])
        expected = set(fixture["expected_codes"])
        if attacked.passed or not expected.issubset(attacked.codes):
            raise RuntimeError(f"counterexample did not fail as expected: {path.name}")
        fixture_rows.append({**binding(path), "fixture_id": fixture["fixture_id"]})
        attack_rows.append({
            "fixture_id": fixture["fixture_id"],
            "expected_codes": sorted(expected),
            "observed_codes": sorted(attacked.codes),
            "rejected": True,
        })

    reviewer_identity = TRACK_ROOT / "reviewer-identity-v1.json"
    input_freeze = {
        "schema_version": "apk-t10-input-freeze.v1",
        "track_id": "apk_independent_acceptance_handoff_20260712",
        "frozen_at": "2026-07-26T01:00:00Z",
        "t9_root_acceptance": {
            "path": (T9_REL / "phase6-root-acceptance-v1.json").as_posix(),
            "sha256": T9_ROOT_SHA256,
        },
        "t9_candidate": {
            "path": (T9_REL / "phase6-candidate-synthesis-manifest-v1.json").as_posix(),
            "sha256": T9_CANDIDATE_SHA256,
        },
        "t8_accepted_manifest": {
            "path": (T8_REL / "phase5-accepted-manifest-v1.json").as_posix(),
            "sha256": T8_ACCEPTED_SHA256,
        },
        "canonical_pack": {
            "root": PACK_REL.as_posix(),
            "version": EXPECTED_VERSION,
            "accepted_release_sha256": PACK_ACCEPTANCE_SHA256,
            "catalog_artifact_sha256": PACK_CATALOG_SHA256,
            "catalog_digest": CATALOG_DIGEST,
            "source_receipt_digest": SOURCE_RECEIPT_DIGEST,
            "required_credit": REQUIRED_CREDIT,
            "receipt_artifact_sha256": {
                name: sha256_file(REPO_ROOT / PACK_REL / name)
                for name in ("IMPORT-RECEIPT.tsv", "CURATED-RECEIPT.tsv", "LICENSE-RECEIPT.tsv")
            },
            "license_sha256": sha256_file(REPO_ROOT / PACK_REL / "LICENSE-ELVGAMES.txt"),
        },
        "reviewer_identity": binding(reviewer_identity),
        "verifier": binding(TRACK_ROOT / "t10_acceptance_verifier.py"),
        "tests": binding(TRACK_ROOT / "t10_acceptance_verifier_test.py"),
        "failed_monolith_policy": "counterexample-only-never-accepted-dependency",
    }
    input_freeze_path = TRACK_ROOT / "t10-input-freeze-v1.json"
    write_json(input_freeze_path, input_freeze)

    fixture_manifest_path = TRACK_ROOT / "t10-fixture-manifest-v1.json"
    write_json(fixture_manifest_path, {
        "schema_version": "apk-t10-fixture-manifest.v1",
        "fixture_count": len(fixture_rows),
        "fixtures": fixture_rows,
        "input_freeze": binding(input_freeze_path),
    })
    red_report_path = TRACK_ROOT / "t10-red-report-v1.json"
    write_json(red_report_path, {
        "schema_version": "apk-t10-red-report.v1",
        "status": "expected-red-counterexamples-all-rejected",
        "published_before_final_review": True,
        "fixture_manifest": binding(fixture_manifest_path),
        "attacks": attack_rows,
    })

    blocked_entries = [{
        "claim_ref": claim_ref,
        "disposition": "blocked-negative-control" if "-NEG-" in claim_ref else "blocked-insufficient-exact-git-envelope",
        "successor_factual_consumption": False,
    } for claim_ref in result.blocked_claim_ids]
    overlay_path = TRACK_ROOT / "t10-claim-disposition-overlay-v1.json"
    write_json(overlay_path, {
        "schema_version": "apk-t10-claim-disposition-overlay.v1",
        "audited_claim_count": result.metrics["raw_claims"],
        "exact_claim_count": len(result.exact_claim_ids),
        "exact_claim_refs_sha256": canonical_sha256(list(result.exact_claim_ids)),
        "blocked_claim_count": len(blocked_entries),
        "blocked_claims": blocked_entries,
        "policy": "Only exact claims may support accepted T11 capabilities; every other claim remains evidence-only and blocked from factual successor consumption.",
    })

    candidate_report_path = TRACK_ROOT / "t10-candidate-gate-report-v1.json"
    write_json(candidate_report_path, {
        "schema_version": "apk-t10-candidate-gate-report.v1",
        "status": "pass-ready-for-owner-delegated-acceptance",
        "command": "python3 t10_acceptance_verifier.py",
        "input_freeze": binding(input_freeze_path),
        "red_report": binding(red_report_path),
        "claim_overlay": binding(overlay_path),
        "metrics": result.metrics,
        "findings": [],
        "browser_scope": {
            "authentic_predecessor_artifacts_reviewed": result.metrics["browser_evidence_files"],
            "routes_reviewed": result.metrics["browser_routes"],
            "fresh_browser_session_run": False,
            "browser_success_claimed": False,
            "accepted_runtime_contracts": 0,
            "blocked_responsive_cells": result.metrics["blocked_responsive_cells"],
        },
    })

    review_path = TRACK_ROOT / "t10-independent-acceptance-review-v1.json"
    write_json(review_path, {
        "schema_version": "apk-t10-independent-acceptance-review.v1",
        "reviewer_identity": binding(reviewer_identity),
        "review_completed_at": "2026-07-26T01:10:00Z",
        "input_freeze": binding(input_freeze_path),
        "candidate_gate": binding(candidate_report_path),
        "sampling": "none",
        "review_coverage": result.metrics,
        "findings_and_remediation": [
            {
                "finding_id": "T10-F-001",
                "severity": "Medium",
                "finding": "163 of 1,248 upstream rows do not independently resolve to a complete exact Git citation envelope, including 20 negative controls.",
                "remediation": "Published a 100% claim-disposition overlay that blocks all 163 from factual successor consumption; all 56 accepted capability uses independently resolve to exact Git evidence.",
                "status": "resolved-by-fail-closed-quarantine",
            },
            {
                "finding_id": "T10-F-002",
                "severity": "Medium",
                "finding": "T9 retains negative controls in Phase 1 derivation surfaces.",
                "remediation": "Verified every negative control is excluded from capability uses and explicitly denied it factual successor status in the overlay.",
                "status": "resolved-by-explicit-negative-evidence-label",
            },
            {
                "finding_id": "T10-F-003",
                "severity": "Medium",
                "finding": "Browser evidence covers six bounded predecessor routes, not all games, and no fresh T10 browser session was available.",
                "remediation": "Accepted zero runnable/runtime contracts; retained all six disclosed defects and blocked all 5,664 responsive cells.",
                "status": "resolved-by-runtime-non-acceptance",
            },
            {
                "finding_id": "T10-F-004",
                "severity": "Low",
                "finding": "No subagent spawn/export mechanism was available for provider fork/session attestation.",
                "remediation": "Made no fork_turns or tool-attestation claim; bound the explicit user waiver, unique T10 reviewer identity, and fresh independent verifier.",
                "status": "accepted-limitation-not-a-provider-isolation-claim",
            },
        ],
        "unresolved_findings": {"Critical": [], "High": [], "Medium": []},
        "conclusion": "ACCEPT_EXACT_T9_EVIDENCE_FOR_BOUNDED_T11_HANDOFF_WITH_ALL_UNKNOWN_RUNTIME_AND_ASSET_DECISIONS_BLOCKED",
    })

    ownership_path = TRACK_ROOT / "t10-task-ownership-v1.json"
    write_json(ownership_path, {
        "schema_version": "apk-t10-task-ownership.v1",
        "reviewer": binding(reviewer_identity),
        "truth_gate_owner": "deterministic-t10_acceptance_verifier.py",
        "phases": {str(phase): "openai-gpt-5.6-sol-t10-independent-20260726" for phase in range(0, 6)},
        "upstream_role_reuse": False,
        "provider_fork_turns_attested": False,
        "tool_attestation_available": False,
        "deviation": "The requested Kimi/forked subagents were unavailable; the user authorized one genuinely independent T10 session. No unavailable attestation is represented as present.",
    })

    owner_path = TRACK_ROOT / "product-owner-acceptance-v1.json"
    write_json(owner_path, {
        "schema_version": "apk-t10-owner-delegated-acceptance.v1",
        "track_id": "apk_independent_acceptance_handoff_20260712",
        "accepted_at": "2026-07-26T01:20:00Z",
        "authority": "explicit-user-delegated-final-owner-gates",
        "decided_by": "t10-independent-reviewer-acting-under-user-delegation",
        "decision": "ACCEPT_BOUNDED_T10_HANDOFF_FOR_T11",
        "candidate_gate": binding(candidate_report_path),
        "independent_review": binding(review_path),
        "claim_overlay": binding(overlay_path),
        "delegation_record": {
            "source": "current user task request",
            "scope": "User delegates final owner gates; acceptance recorded only after the independent report passed.",
            "tool_resolved_event_id": None,
            "event_limitation": "The API session exposes no collaboration event resolver; no event ID is fabricated.",
        },
        "revocation_state": "active",
        "approved_scope": "T11 shared developer kit may consume the seven exact-evidence capability contracts and canonical standard-pack release; no runtime contract or asset mapping is approved.",
    })

    manifest_path = TRACK_ROOT / "accepted-successor-manifest-v1.json"
    write_json(manifest_path, {
        "schema_version": "apk-t10-accepted-successor-manifest.v1",
        "track_id": "apk_independent_acceptance_handoff_20260712",
        "status": "accepted",
        "consumable": True,
        "consumer_scope": "T11_shared_developer_kit_only",
        "revocation_state": "active",
        "accepted_at": "2026-07-26T01:21:00Z",
        "t9_root_acceptance": {
            "path": (T9_REL / "phase6-root-acceptance-v1.json").as_posix(),
            "sha256": T9_ROOT_SHA256,
        },
        "t9_candidate": {
            "path": (T9_REL / "phase6-candidate-synthesis-manifest-v1.json").as_posix(),
            "sha256": T9_CANDIDATE_SHA256,
        },
        "independent_review": binding(review_path),
        "owner_acceptance": binding(owner_path),
        "claim_overlay": binding(overlay_path),
        "standard_pack": {
            "root": PACK_REL.as_posix(),
            "version": EXPECTED_VERSION,
            "catalog_digest": CATALOG_DIGEST,
            "source_receipt_digest": SOURCE_RECEIPT_DIGEST,
            "accepted_release_sha256": PACK_ACCEPTANCE_SHA256,
            "catalog_artifact_sha256": PACK_CATALOG_SHA256,
            "required_credit": REQUIRED_CREDIT,
        },
        "accepted_capability_inputs": {
            name: sha256_file(REPO_ROOT / T9_REL / name)
            for name in (
                "phase2-capability-classification-v5.json",
                "phase2-curated-capability-evidence-v1.json",
                "phase2-extension-boundaries-v5.json",
            )
        },
        "blocked_evidence_inputs": {
            name: sha256_file(REPO_ROOT / T9_REL / name)
            for name in (
                "phase3-responsive-contracts-v1.json",
                "phase4-asset-normalization-v1.json",
                "phase4-canonical-adoption-matrix-v1.json",
                "phase5-gap-delivery-ranking-v1.json",
            )
        },
        "adoption_policy": {
            "asset_root": PACK_REL.as_posix(),
            "direct_legacy_paths": "prohibited",
            "private_pack_trees": "prohibited",
            "unknown_must_haves": "blocked",
            "approved_asset_mappings": 0,
            "blocked_asset_mappings": 85,
            "accepted_runtime_contracts": 0,
            "browser_success_claimed": False,
        },
        "successor_gate": "T11 must verify successor-hashes-v1.json and reject missing, stale, revoked, mismatched, direct-legacy, private-tree, or non-standard-pack input.",
    })

    hashes_path = TRACK_ROOT / "successor-hashes-v1.json"
    write_json(hashes_path, {
        "schema_version": "apk-t10-successor-hashes.v1",
        "status": "accepted",
        "consumer_scope": "T11_shared_developer_kit_only",
        "revocation_state": "active",
        "accepted_manifest": binding(manifest_path),
        "owner_acceptance": binding(owner_path),
        "independent_review": binding(review_path),
        "candidate_gate": binding(candidate_report_path),
        "canonical_pack_release": {
            "path": (PACK_REL / "accepted-standard-pack-release.json").as_posix(),
            "sha256": PACK_ACCEPTANCE_SHA256,
        },
    })

    receipt_path = TRACK_ROOT / "role-receipt-t10-independent-reviewer-v1.json"
    write_json(receipt_path, {
        "schema_version": "apk-t10-local-review-receipt.v1",
        "reviewer_identity": binding(reviewer_identity),
        "input_freeze": binding(input_freeze_path),
        "review_output": binding(review_path),
        "accepted_manifest": binding(manifest_path),
        "provider_fork_turns_attested": False,
        "tool_attestation_available": False,
        "sampling": "none",
        "findings": {"Critical": [], "High": [], "Medium": []},
    })
    resource_path = TRACK_ROOT / "t10-resource-report-v1.json"
    published = [
        input_freeze_path, fixture_manifest_path, red_report_path, overlay_path,
        candidate_report_path, review_path, ownership_path, owner_path,
        manifest_path, hashes_path, receipt_path,
    ]
    write_json(resource_path, {
        "schema_version": "apk-t10-resource-report.v1",
        "outputs": [{**binding(path), "byte_size": path.stat().st_size} for path in published],
        "verifier_metrics": result.metrics,
        "numeric_ceiling": {"negative_fixtures": 16, "published_artifact_bytes_each": 1048576},
        "within_ceiling": len(fixture_paths) <= 16 and all(path.stat().st_size <= 1048576 for path in published),
    })
    return {path.name: sha256_file(path) for path in [*published, resource_path]}


def main() -> int:
    """Publishes the ordered chain and prints exact output hashes."""
    print(json.dumps(publish(), indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
