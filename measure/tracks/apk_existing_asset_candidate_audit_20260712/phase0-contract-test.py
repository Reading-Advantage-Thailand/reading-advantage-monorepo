#!/usr/bin/env python3
"""Read-only structural contract for the T8 Phase 0 input freeze."""

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path


TRACK = Path(__file__).resolve().parent
REPO = TRACK.parents[2]
FREEZE_PATH = TRACK / "phase0-input-freeze-v1.json"
ROLE_MANIFEST_PATH = TRACK / "phase0-role-ownership-manifest-v1.json"
ROLE_MATRIX_PATH = TRACK / "role-applicability-matrix-v1.json"
DISCOVERY_REPORT_PATH = TRACK / "phase0-denominator-discovery-report-v2.json"
DISCOVERY_RECEIPT_PATH = TRACK / "role-receipts" / "phase0" / "discovery-auditor.json"
SUCCESSOR_REVIEW_PATH = TRACK / "phase0-adversarial-review-v2.json"
EXPECTED_FREEZE_SHA256 = "d4bd3606c7c75f495f2d8486ea4220f48aefd9eb216689b765aa9d96f58f2a9b"
EXPECTED_ROOTS = [
    "apps/advantage-games/public",
    "apps/reading-advantage/public/games",
    "apps/primary-advantage/public/games",
    "apps/advantage-games/measure",
    "packages/codecamp-knowledge/fixtures/apk-guided",
]
EXPECTED_BATCHES = [
    ("AF-01", 18, 36), ("AF-02", 18, 35), ("AF-03", 21, 35),
    ("AF-04", 17, 35), ("AF-05", 18, 39), ("AF-06", 21, 35),
    ("AF-07", 17, 35), ("AF-08", 19, 35), ("AF-09", 17, 35),
    ("AF-10", 19, 34), ("AF-11", 18, 40), ("AF-12", 24, 34),
]


def fail(message: str) -> None:
    """Raise one stable contract failure."""
    raise AssertionError(message)


def load_json(path: Path) -> dict:
    """Load a JSON governance artifact without accessing asset content."""
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def sha256_bytes(value: bytes) -> str:
    """Return the SHA-256 digest for governance bytes."""
    return hashlib.sha256(value).hexdigest()


def git(*args: str, input_bytes: bytes | None = None) -> bytes:
    """Run a read-only Git metadata or object query."""
    result = subprocess.run(
        ["git", *args], cwd=REPO, input=input_bytes, stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, check=False,
    )
    if result.returncode:
        fail(f"git {' '.join(args)} failed: {result.stderr.decode().strip()}")
    return result.stdout


def assert_fixture_rejected(fixture: dict) -> None:
    """Confirm a synthetic denominator mutation is rejected by its invariant."""
    kind = fixture["kind"]
    if kind == "digest-drift":
        if fixture["expected_sha256"] != fixture["actual_sha256"]:
            return
        fail("fixture digest-drift was accepted")
    if kind == "duplicate-path":
        if len(fixture["paths"]) != len(set(fixture["paths"])):
            return
        fail("fixture duplicate-path was accepted")
    if kind == "split-group":
        memberships = fixture["group_memberships"]
        if len(set(memberships.values())) != 1:
            return
        fail("fixture split-group was accepted")
    if kind == "extra-root":
        if fixture["root"] not in EXPECTED_ROOTS:
            return
        fail("fixture extra-root was accepted")
    if kind == "role-conflict":
        if fixture["owner_role"] in fixture["forbidden_roles"]:
            return
        fail("fixture role-conflict was accepted")
    fail(f"unknown negative fixture kind: {kind}")


def assert_historical_bindings(freeze: dict) -> None:
    """Verify corrected historical JSON locators resolve to their pinned bytes."""
    by_track = {item["track"]: item for item in freeze["accepted_inputs"]}
    for track in ("T2-denominator", "T2-partition", "T2-asset-denominator", "T3"):
        item = by_track[track]
        historical = git("show", f"{item['first_exact_bytes_commit_sha']}:{item['first_exact_bytes_path']}")
        if sha256_bytes(historical) != item["sha256"]:
            fail(f"historical binding digest mismatch: {track}")
    authorization = by_track["T4-T8-owner-authorization"]
    git("merge-base", "--is-ancestor", authorization["publication_commit_sha"], "HEAD")


def assert_current_input_bindings(inputs: list[dict]) -> None:
    """Verify every accepted input resolves to its exact current repository bytes."""
    for item in inputs:
        path = REPO / item["path"]
        if not path.is_file():
            fail(f"accepted input path missing: {item['track']}")
        if sha256_bytes(path.read_bytes()) != item["sha256"]:
            fail(f"accepted input digest mismatch: {item['track']}")


def assert_delta_chain(delta: dict) -> None:
    """Verify the accepted delta binds its independently reviewed candidate bytes."""
    accepted = load_json(REPO / delta["path"])
    if (accepted["status"], accepted["decision"], accepted["consumable"]) != ("accepted", "ACCEPTED", True):
        fail("accepted denominator delta is not consumable")
    for key in ("candidate", "independent_review"):
        binding = accepted[key]
        path = REPO / binding["path"]
        if not path.is_file() or sha256_bytes(path.read_bytes()) != binding["sha256"]:
            fail(f"accepted denominator delta {key} binding mismatch")
    review = load_json(REPO / accepted["independent_review"]["path"])
    findings = review["findings"]
    if review["status"] != "pass" or any(findings[level] for level in ("critical", "high", "medium")):
        fail("accepted denominator delta review is not clean")


def assert_discovery_evidence() -> None:
    """Require the qualifying bounded discovery report and native role receipt."""
    report = load_json(DISCOVERY_REPORT_PATH)
    if (report["status"], report["final_status"], report["role"]) != ("pass", "pass", "phase0-discovery-auditor"):
        fail("Phase 0 discovery report is not a passing discovery-auditor result")
    reproduction = report["git_object_reproduction"]
    effective = reproduction["effective_denominator"]
    delta = reproduction["delta_operations"]
    if (reproduction["base_manifest_record_count"], reproduction["base_manifest_hash_group_count"]) != (426, 225):
        fail("Phase 0 discovery base reconciliation changed")
    if (delta["relevant_additions"], delta["relevant_replacements"], delta["relevant_deletions"]) != (2, 1, 0):
        fail("Phase 0 discovery delta reconciliation changed")
    if (effective["candidate_paths"], effective["identical_hash_groups"], effective["root_count"]) != (428, 227, 5):
        fail("Phase 0 discovery effective reconciliation changed")
    batches = report["batch_reproduction"]
    reconciliation = batches["reconciliation"]
    if batches["membership_exactly_matches_freeze"] is not True:
        fail("Phase 0 discovery batch membership does not match freeze")
    if (reconciliation["batch_path_sum"], reconciliation["batch_hash_group_sum"], reconciliation["omissions"], reconciliation["duplicates"], reconciliation["max_batch_paths"], reconciliation["max_batch_hash_groups"]) != (428, 227, 0, 0, 40, 24):
        fail("Phase 0 discovery batch reconciliation changed")
    usage = report["resource_usage"]
    if usage["within_ceiling"] is not True or usage["bytes_read"] > usage["bytes_read_ceiling"] or usage["command_invocations"] > usage["command_invocation_ceiling"]:
        fail("Phase 0 discovery resource ceiling exceeded")
    if report["checkout_attestation"]["physical_worktree_count"] != 1 or report["checkout_attestation"]["sister_repository_input_used"] is not False:
        fail("Phase 0 discovery checkout boundary changed")

    receipt = load_json(DISCOVERY_RECEIPT_PATH)
    if (receipt["native_task_name"], receipt["declared_model"], receipt["fork_turns"], receipt["final_status"]) != ("/root/t8_phase0_discovery_receipt", "gpt-5.6-terra", "none", "pass"):
        fail("Phase 0 discovery native receipt changed")
    output = receipt["outputs"]["report"]
    if output["path"] != str(DISCOVERY_REPORT_PATH.relative_to(REPO)) or output["sha256"] != sha256_bytes(DISCOVERY_REPORT_PATH.read_bytes()):
        fail("Phase 0 discovery receipt output binding changed")


def assert_successor_review() -> None:
    """Require a clean successor Phase 0 review after bounded remediation."""
    review = load_json(SUCCESSOR_REVIEW_PATH)
    findings = review["findings"]
    if review["decision"]["status"] != "pass" or any(findings[level] for level in ("critical", "high", "medium")):
        fail("Phase 0 successor review is not clean")


def assert_freeze(freeze: dict, role_manifest: dict, role_matrix: dict) -> None:
    """Assert the immutable Phase 0 denominator, boundary, roles, and ceilings."""
    if sha256_bytes(FREEZE_PATH.read_bytes()) != EXPECTED_FREEZE_SHA256:
        fail("input-freeze SHA-256 drift")
    if role_manifest["allowed_input_manifest"]["sha256"] != EXPECTED_FREEZE_SHA256:
        fail("role manifest freeze SHA-256 drift")
    if role_matrix["allowed_input_manifest_sha256"] != EXPECTED_FREEZE_SHA256:
        fail("role matrix freeze SHA-256 drift")
    if freeze["status"] != "frozen-strategy-only":
        fail("freeze status is not frozen-strategy-only")
    if freeze["canonical_checkout"]["single_checkout_only"] is not True or freeze["canonical_checkout"]["auxiliary_worktrees_allowed"] is not False:
        fail("canonical checkout is not the sole permitted worktree")

    inputs = freeze["accepted_inputs"]
    if len(inputs) != 12 or any(len(item["sha256"]) != 64 for item in inputs):
        fail("accepted input digest set changed")
    assert_current_input_bindings(inputs)
    t1 = next(item for item in inputs if item["track"] == "T1")
    if (t1["required_status"], t1["required_consumable"], t1["required_revoked"]) != ("accepted", True, False):
        fail("T1 accepted status requirements changed")
    owner = next(item for item in inputs if item["track"] == "T4-T8-owner-authorization")
    if owner["decision"] != "AUTHORIZED" or owner["authorized_activity"] != "T8 per-candidate asset forensics only":
        fail("owner authorization boundary changed")
    assert_historical_bindings(freeze)

    delta = next(item for item in inputs if item["track"] == "T8-denominator-delta")
    if (delta["status"], delta["consumable"], delta["sha256"]) != ("accepted", True, "71592625cbe09671937b7406afa38f3f59232c0345de455467121dc038863db2"):
        fail("accepted denominator delta binding changed")
    assert_delta_chain(delta)
    denominator = freeze["denominator"]
    if (denominator["candidate_paths"], denominator["identical_hash_groups"], denominator["root_count"], denominator["record_revision"]) != (428, 227, 5, "65fc00d872ce5aa63820662ee0a1f14952e63235"):
        fail("denominator totals or revision changed")
    if [root["path"] for root in denominator["roots"]] != EXPECTED_ROOTS or denominator["root_path_sum"] != 428:
        fail("denominator roots changed")
    if freeze["theme_profiles"]["t8_boundary"] != "External producer outputs remain outside the T8 denominator and may enter later tracks only through accepted digest-pinned manifests.":
        fail("external-producer boundary changed")

    batches = freeze["batch_strategy"]["batches"]
    observed = [(batch["batch_id"], batch["group_count"], batch["path_count"]) for batch in batches]
    if observed != EXPECTED_BATCHES:
        fail("exact 12-batch plan changed")
    strategy = freeze["batch_strategy"]
    if (strategy["batch_count"], strategy["unit"], strategy["group_atomic"], strategy["candidate_path_ceiling_per_batch"], strategy["hash_group_ceiling_per_batch"]) != (12, "identical-hash-group", True, 40, 24):
        fail("batch atomicity or ceilings changed")
    if sum(batch[1] for batch in observed) != 227 or sum(batch[2] for batch in observed) != 428:
        fail("batch reconciliation changed")

    ceilings = freeze["resource_ceilings"]
    if ceilings["truth-test-author"] != {"test_cases": 160, "command_invocations": 80, "bytes_read": 134217728}:
        fail("truth-test budget changed")
    stop_loss = freeze["stop_loss"]
    if (stop_loss["unsupported_or_fabricated_factual_claims_before_stop"], stop_loss["denominator_mismatches_before_stop"], stop_loss["bound_hash_drifts_before_authorization_stop"], stop_loss["failed_fix_review_cycles_before_block"], stop_loss["max_games_per_scene_usage_join_slice"]) != (1, 1, 1, 2, 3):
        fail("stop-loss policy changed")
    required_roles = set(role_manifest["required_roles"])
    if required_roles != {"discovery-auditor", "evidence-collector", "requirements-mapper", "truth-test-author", "adversarial-reviewer"}:
        fail("required role set changed")
    truth_task = next(task for task in role_manifest["tasks"] if task["task_id"] == "phase0-truth-contract")
    if truth_task["owner_role"] != "truth-test-author" or truth_task["owner_role"] in truth_task["forbidden_roles"]:
        fail("truth-test role conflict boundary changed")


def assert_later_outputs_absent() -> None:
    """Ensure Phase 0 has not been silently advanced by later output artifacts."""
    forbidden = [
        TRACK / "batches", TRACK / "forensics-contract-tests.py",
        TRACK / "forensics-contract-test-report.json", TRACK / "independent-review.json",
        TRACK / "product-owner-acceptance.json", TRACK / "accepted-candidate-manifest.json",
    ]
    present = [str(path.relative_to(TRACK)) for path in forbidden if path.exists()]
    if present:
        fail(f"later-phase outputs present: {', '.join(present)}")


def main() -> int:
    """Run structural checks and deliberately require pending Phase 0 evidence."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixtures", action="store_true", help="validate negative fixtures")
    args = parser.parse_args()
    try:
        freeze = load_json(FREEZE_PATH)
        assert_freeze(freeze, load_json(ROLE_MANIFEST_PATH), load_json(ROLE_MATRIX_PATH))
        assert_later_outputs_absent()
        if args.fixtures:
            for path in sorted((TRACK / "negative-fixtures" / "phase0").glob("*.json")):
                assert_fixture_rejected(load_json(path))
        pending = [
            str(path.relative_to(TRACK))
            for path in (DISCOVERY_REPORT_PATH, DISCOVERY_RECEIPT_PATH, SUCCESSOR_REVIEW_PATH)
            if not path.exists()
        ]
        if pending:
            fail("pending independent Phase 0 evidence: " + ", ".join(pending))
        assert_discovery_evidence()
        assert_successor_review()
    except AssertionError as error:
        print(f"RED: {error}", file=sys.stderr)
        return 1
    print("GREEN: Phase 0 freeze and independent evidence are complete")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
