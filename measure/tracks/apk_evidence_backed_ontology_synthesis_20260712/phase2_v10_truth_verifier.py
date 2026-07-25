#!/usr/bin/env python3
"""Verifies Phase 2 v10 root authority before any mapper lifecycle state."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any

import phase2_v9_truth_verifier as v9

TRACK_ID = v9.TRACK_ID
DISPATCH_PATH = "phase2-role-dispatch-v10.json"
DISPATCH_SHA256 = "b7dc7be6ec593623a21656afd3215b2764188a41915e0b2e709be6e338e26eb7"
FIXTURE_MANIFEST = "phase2-v10-fixture-manifest.json"
ROOT_SEAL = "phase2-v10-root-truth-seal.json"
MAPPER_RELEASE = "phase2-v10-mapper-release.json"
REVIEW_OUTPUT = "phase2-v10-independent-review.json"
REVIEW_RECEIPT = "role-receipts/phase2/capability-reviewer-v10.json"
MAPPER_OUTPUTS = v9.MAPPER_OUTPUTS
MAPPER_RECEIPT = v9.MAPPER_RECEIPT
BASE_TRUTH_PATHS = (
    DISPATCH_PATH,
    "phase2_v10_truth_verifier.py",
    "phase2_v10_truth_verifier_test.py",
    FIXTURE_MANIFEST,
    "phase2-v10-red-report.json",
    "role-receipts/phase2/truth-test-author-v10.json",
)
PRESERVED_V9 = {
    "phase2-role-dispatch-v9.json": "60a0337eec7a67afa327f8a790620f0d0b1364717bb421dfdea86b324bd90a3b",
    "phase2_v9_truth_verifier.py": "edf0130b20af2f9436b29e1b48c251624266b95223a322349075b5bf7bf60f09",
    "phase2_v9_truth_verifier_test.py": "749cf36a1a527ecd199ed60cde5c4a5ec0c5a50a0e61da4e8010752fb31cfcfb",
    "phase2-v9-fixture-manifest.json": "40b1609e14b92144e6188a7bcc47466b1d3c4a1f1fa86b075c233f49bea7422a",
    "phase2-v9-context-counterexamples.json": "9c1059df904d0d326aa714af4a24a773fa36dc870b25155d7135c907decb9583",
    "negative-fixtures/phase2-v9/end-to-end-attacks.json": "c7c6e1f2dd4f7a20e4af08af3da94ef0253e87291b9badd9ce9d34cf466abb20",
    "phase2-v9-red-report.json": "64d925f6c21663e7f61ebcd8bd4c34a9343554d88c468aedc060b74cd86b7ab8",
    "role-receipts/phase2/truth-test-author-v9.json": "fb0c74ef015cca3adfda9ee6f17a72cb8140d037e623d0fb2be653cbc5982dfc",
    "phase2-v9-root-truth-seal.json": "b0464ae8fcbee916ceaf1fa5085544cf3ee9ee878cc263ea1477e2b12341e9dd",
    "phase2-v9-mapper-release.json": "b70e2042f615fa1592b5c10f389f6b88510987dfe5e9e70c2f0197403ffc8285",
}
MAPPER_RECEIPT_KEYS = {
    "agent_ref", "owner_role", "task_id", "dispatch_sha256",
    "root_truth_seal_sha256", "root_mapper_release_sha256",
    "output_hashes", "status",
}
REVIEW_RECEIPT_KEYS = {
    "agent_ref", "owner_role", "task_id", "dispatch_sha256",
    "root_truth_seal_sha256", "root_mapper_release_sha256",
    "review_artifact_sha256", "mapper_output_hashes", "status",
}


@dataclass(frozen=True)
class Finding:
    """Represents one deterministic v10 finding."""

    code: str
    message: str


@dataclass(frozen=True)
class VerificationResult:
    """Represents the public v10 verification result."""

    state: str
    findings: tuple[Finding, ...]
    checks: int

    @property
    def passed(self) -> bool:
        """Returns whether a mapper candidate reached a review lifecycle state."""
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
    """Verifies v10 authority plus every preserved v9 byte and Phase 1 input."""
    fixed = {DISPATCH_PATH: DISPATCH_SHA256, **PRESERVED_V9}
    for relative, expected in fixed.items():
        path = track_root / relative
        if not path.is_file() or v9._sha(path) != expected:
            _add(findings, "TRUTH_INPUT_DRIFT", f"Frozen input differs: {relative}.")
    if findings:
        return {}, {}, len(fixed)
    dispatch = _load(track_root / DISPATCH_PATH)
    if (
        dispatch.get("schema_version") != "apk-t9-phase2-role-dispatch.v10"
        or dispatch.get("status") != "active-root-authority-order-repair"
    ):
        _add(findings, "TRUTH_INPUT_DRIFT", "The v10 dispatch is not active.")
    prior: list[v9.Finding] = []
    inputs, registry, prior_checks = v9._verify_authority(track_root, prior)
    if prior:
        _add(findings, "TRUTH_INPUT_DRIFT", "Inherited v9 authority differs.")
    return inputs, registry, len(fixed) + prior_checks + 1


def _validate_manifest(
    track_root: Path, findings: list[Finding]
) -> tuple[tuple[str, ...], int]:
    """Validates complete manifest identity, rows, fixtures, hashes, and counts."""
    manifest = _load(track_root / FIXTURE_MANIFEST)
    top_keys = {
        "schema_version", "track_id", "dispatch_sha256",
        "fixture_count", "case_count", "fixtures",
    }
    if set(manifest) != top_keys:
        _add(findings, "INVALID_FIXTURE_MANIFEST", "Manifest top-level keys differ.")
    fixtures = manifest.get("fixtures")
    if (
        manifest.get("schema_version") != "apk-t9-phase2-v10-fixture-manifest.v1"
        or manifest.get("track_id") != TRACK_ID
        or manifest.get("dispatch_sha256") != DISPATCH_SHA256
        or not isinstance(fixtures, list)
        or len(fixtures) > 16
    ):
        _add(findings, "INVALID_FIXTURE_MANIFEST", "Manifest identity or fixture list differs.")
        fixtures = fixtures if isinstance(fixtures, list) else []
    if manifest.get("fixture_count") != len(fixtures):
        _add(findings, "FIXTURE_COUNT_MISMATCH", "Manifest fixture count differs.")
    ids: list[Any] = []
    paths: list[Any] = []
    actual_case_count = 0
    for row in fixtures:
        if not isinstance(row, dict) or set(row) != {"id", "path", "sha256", "case_count"}:
            _add(findings, "INVALID_FIXTURE_MANIFEST", "Fixture row keys differ.")
            continue
        ids.append(row["id"])
        paths.append(row["path"])
        fixture_path = track_root / row["path"]
        if not fixture_path.is_file() or v9._sha(fixture_path) != row["sha256"]:
            _add(findings, "FIXTURE_DRIFT", f"Fixture differs: {row['path']}.")
            continue
        fixture = _load(fixture_path)
        cases = fixture.get("cases")
        if (
            set(fixture) != {"schema_version", "track_id", "cases"}
            or fixture.get("schema_version") != "apk-t9-phase2-v10-end-to-end-attacks.v1"
            or fixture.get("track_id") != TRACK_ID
            or not isinstance(cases, list)
        ):
            _add(findings, "INVALID_FIXTURE_SCHEMA", f"Fixture identity differs: {row['path']}.")
            continue
        actual = len(cases)
        actual_case_count += actual
        if row["case_count"] != actual:
            _add(findings, "FIXTURE_CASE_COUNT_MISMATCH", f"Fixture case count differs: {row['path']}.")
    if len(ids) != len(set(ids)):
        _add(findings, "DUPLICATE_FIXTURE_ID", "Fixture IDs must be unique.")
    if len(paths) != len(set(paths)):
        _add(findings, "DUPLICATE_FIXTURE_PATH", "Fixture paths must be unique.")
    declared_sum = sum(
        row.get("case_count", 0) for row in fixtures if isinstance(row, dict)
    )
    if (
        manifest.get("case_count") != declared_sum
        or manifest.get("case_count") != actual_case_count
    ):
        _add(findings, "TOP_CASE_COUNT_MISMATCH", "Manifest total case count differs.")
    return tuple(path for path in paths if isinstance(path, str)), len(fixtures) + actual_case_count + 5


def _verify_root_authority(
    track_root: Path,
    fixture_paths: tuple[str, ...],
    expected_release_sha256: str | None,
    findings: list[Finding],
) -> tuple[str | None, str | None, str]:
    """Validates complete root authority before any mapper presence check."""
    seal_path = track_root / ROOT_SEAL
    release_path = track_root / MAPPER_RELEASE
    if not seal_path.is_file() or not release_path.is_file():
        _add(findings, "ROOT_V10_AUTHORITY_MISSING", "Root v10 seal and release are not both published.")
        return None, None, "RED_WAITING_FOR_ROOT_V10_AUTHORITY"
    if expected_release_sha256 is None:
        _add(findings, "EXPECTED_MAPPER_RELEASE_REQUIRED", "Expected v10 mapper release SHA-256 is required.")
        return None, None, "INVALID"
    if v9._sha(release_path) != expected_release_sha256:
        _add(findings, "MAPPER_RELEASE_MISMATCH", "Expected v10 mapper release SHA-256 differs.")
        return None, None, "INVALID"
    truth_paths = (*BASE_TRUTH_PATHS, *fixture_paths)
    live = {
        relative: v9._sha(track_root / relative)
        for relative in truth_paths
        if (track_root / relative).is_file()
    }
    seal = _load(seal_path)
    if (
        set(seal) != {"schema_version", "track_id", "dispatch_sha256", "status", "pins"}
        or seal.get("schema_version") != "apk-t9-phase2-root-truth-seal.v10"
        or seal.get("track_id") != TRACK_ID
        or seal.get("dispatch_sha256") != DISPATCH_SHA256
        or seal.get("status") != "sealed-red-v10"
        or seal.get("pins") != live
        or set(live) != set(truth_paths)
    ):
        _add(findings, "LIVE_TRUTH_DRIFT", "Root v10 truth seal differs from live bytes.")
    seal_sha = v9._sha(seal_path)
    release = _load(release_path)
    if (
        set(release) != {
            "schema_version", "track_id", "status", "dispatch_sha256",
            "root_truth_seal", "truth_artifacts",
        }
        or release.get("schema_version") != "apk-t9-phase2-mapper-release.v10"
        or release.get("track_id") != TRACK_ID
        or release.get("status") != "released-for-mapper-v5"
        or release.get("dispatch_sha256") != DISPATCH_SHA256
        or release.get("root_truth_seal") != {"path": ROOT_SEAL, "sha256": seal_sha}
        or release.get("truth_artifacts") != live
    ):
        _add(findings, "MAPPER_RELEASE_MISMATCH", "Root v10 mapper release pins differ.")
    return seal_sha, expected_release_sha256, "INVALID" if findings else "AUTHORITY_VERIFIED"


def _validate_mapper_receipt(
    track_root: Path,
    bundle: dict[str, dict[str, Any]],
    seal_sha: str,
    release_sha: str,
    findings: list[Finding],
) -> None:
    """Validates exact v10 mapper identity, authority, and live output hashes."""
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
        or receipt.get("task_id") != "phase2-curated-evidence-mapper-v5-v10"
        or receipt.get("dispatch_sha256") != DISPATCH_SHA256
        or receipt.get("root_truth_seal_sha256") != seal_sha
        or receipt.get("root_mapper_release_sha256") != release_sha
        or receipt.get("status") != "candidate"
    ):
        _add(findings, "STALE_OR_WRONG_MAPPER_RECEIPT", "Mapper v10 receipt differs.")


def _validate_review(
    track_root: Path,
    bundle: dict[str, dict[str, Any]],
    seal_sha: str,
    release_sha: str,
    findings: list[Finding],
) -> bool:
    """Reuses v9 semantic review checks after exact v10 reviewer receipt validation."""
    receipt = _load(track_root / REVIEW_RECEIPT)
    mapper_hashes = {path: v9._sha(track_root / path) for path in MAPPER_OUTPUTS}
    review_sha = v9._sha(track_root / REVIEW_OUTPUT)
    status = receipt.get("status")
    if (
        set(receipt) != REVIEW_RECEIPT_KEYS
        or receipt.get("agent_ref") != "/root/phase5_review_b"
        or receipt.get("owner_role") != "capability-reviewer"
        or receipt.get("task_id") != "phase2-curated-evidence-review-v10"
        or receipt.get("dispatch_sha256") != DISPATCH_SHA256
        or receipt.get("root_truth_seal_sha256") != seal_sha
        or receipt.get("root_mapper_release_sha256") != release_sha
        or receipt.get("review_artifact_sha256") != review_sha
        or receipt.get("mapper_output_hashes") != mapper_hashes
        or status not in {"accepted", "rejected"}
    ):
        _add(findings, "STALE_OR_WRONG_REVIEWER_RECEIPT", "Reviewer v10 receipt differs.")
    prior_output = v9.REVIEW_OUTPUT
    prior_receipt = v9.REVIEW_RECEIPT
    prior_dispatch = v9.DISPATCH_SHA256
    try:
        v9.REVIEW_OUTPUT = REVIEW_OUTPUT
        v9.REVIEW_RECEIPT = REVIEW_RECEIPT
        v9.DISPATCH_SHA256 = DISPATCH_SHA256
        inherited: list[v9.Finding] = []
        rejected = v9._validate_review(
            track_root, bundle, seal_sha, release_sha, inherited
        )
    finally:
        v9.REVIEW_OUTPUT = prior_output
        v9.REVIEW_RECEIPT = prior_receipt
        v9.DISPATCH_SHA256 = prior_dispatch
    for row in inherited:
        if row.code != "STALE_OR_WRONG_REVIEWER_RECEIPT":
            _add(findings, row.code, row.message)
    return rejected


def verify_phase2(
    repo_root: Path,
    track_root: Path,
    expected_root_mapper_release_sha256: str | None = None,
) -> VerificationResult:
    """Runs the public file-backed v10 verifier in authority-first order."""
    del repo_root
    findings: list[Finding] = []
    try:
        inputs, registry, checks = _verify_inputs(track_root, findings)
        fixture_paths, manifest_checks = _validate_manifest(track_root, findings)
        checks += manifest_checks
        if findings:
            return VerificationResult("INVALID", tuple(sorted(findings, key=lambda row: row.code)), checks)
        seal_sha, release_sha, authority_state = _verify_root_authority(
            track_root, fixture_paths, expected_root_mapper_release_sha256, findings
        )
        checks += len(fixture_paths) + 4
        if authority_state != "AUTHORITY_VERIFIED":
            return VerificationResult(
                authority_state,
                tuple(sorted(findings, key=lambda row: row.code)),
                checks,
            )
        missing = [
            path for path in (*MAPPER_OUTPUTS, MAPPER_RECEIPT)
            if not (track_root / path).is_file()
        ]
        if missing:
            _add(findings, "PHASE2_MAPPER_V5_OUTPUTS_MISSING", f"Missing mapper v5 outputs: {', '.join(missing)}")
            return VerificationResult(
                "RED_WAITING_FOR_MAPPER_V5_OUTPUTS", tuple(findings), checks
            )
        bundle = {
            path: _load(track_root / path)
            for path in (*MAPPER_OUTPUTS, MAPPER_RECEIPT)
        }
        inherited: list[v9.Finding] = []
        v9._output_schema(inherited, bundle)
        _, uses, curated_checks = v9._validate_curated(
            inputs, registry, bundle, inherited
        )
        finding_ids, semantic_checks = v9._validate_semantic_joins(
            inputs, bundle, uses, inherited
        )
        for row in inherited:
            _add(findings, row.code, row.message)
        _validate_mapper_receipt(
            track_root, bundle, seal_sha or "", release_sha or "", findings
        )
        checks += curated_checks + semantic_checks + 7
        if findings:
            return VerificationResult("INVALID", tuple(sorted(findings, key=lambda row: row.code)), checks)
        review_present = (
            (track_root / REVIEW_OUTPUT).is_file()
            or (track_root / REVIEW_RECEIPT).is_file()
        )
        if not review_present:
            return VerificationResult(
                "CANDIDATE_VERIFIED_PENDING_INDEPENDENT_REVIEW", (), checks
            )
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
        checks += len(uses) + len(finding_ids) + len(v9._phase1_index(inputs)["games"]) + 635
        blocking = [
            row for row in review_findings
            if row.code not in {"INVALID_SEMANTIC_VERDICT", "SEMANTIC_REVIEW_REJECTED"}
        ]
        if blocking:
            return VerificationResult(
                "INVALID", tuple(sorted(review_findings, key=lambda row: row.code)), checks
            )
        if rejected:
            return VerificationResult(
                "REVIEW_REJECTED", tuple(sorted(review_findings, key=lambda row: row.code)), checks
            )
        return VerificationResult("VERIFIED_PENDING_ROOT_ACCEPTANCE", (), checks)
    except (KeyError, OSError, TypeError, ValueError, json.JSONDecodeError):
        _add(findings, "INVALID_SCHEMA", "The v10 file-backed candidate cannot be validated.")
        return VerificationResult("INVALID", tuple(sorted(findings, key=lambda row: row.code)), 0)


def main(argv: list[str] | None = None) -> int:
    """Runs v10 verification and emits stable JSON."""
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
        "schema_version": "apk-t9-phase2-v10-verification-result.v1",
        "state": result.state,
        "passed": result.passed,
        "checks": result.checks,
        "findings": [
            {"code": row.code, "message": row.message}
            for row in result.findings
        ],
    }, indent=2, sort_keys=True))
    if args.expect_state is not None and result.state != args.expect_state:
        return 1
    if args.expect_codes is not None and {row.code for row in result.findings} != set(args.expect_codes):
        return 1
    return 0 if args.expect_state is not None or args.expect_codes is not None else (0 if result.passed else 1)


if __name__ == "__main__":
    raise SystemExit(main())
