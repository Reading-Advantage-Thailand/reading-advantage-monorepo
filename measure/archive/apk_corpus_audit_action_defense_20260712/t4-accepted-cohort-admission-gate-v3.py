#!/usr/bin/env python3
"""Fail closed on objective, committed T4 admission lifecycle invariants."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
TRACK = ROOT / "measure/tracks/apk_corpus_audit_action_defense_20260712"
CANONICAL = "/home/daniel-bo/Desktop/reading-advantage-monorepo"
RESULT = TRACK / "t4-accepted-cohort-admission-result-v3.json"
PROOF = TRACK / "role-proofs/admission-gate-author-full-cohort-v3.json"
RECEIPT = TRACK / "role-receipts/admission-gate-author-full-cohort-v3.json"

# The immutable records selected here are all committed.  Concurrent untracked
# ownership placeholders and human closeout docs are deliberately not inputs.
BOUND: dict[str, dict[str, str]] = {
    "candidate": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/candidate-cohort-manifest-t4-v1.json",
        "sha256": "4334aaadb6c19d15ad03bbfdc588f9e26ac65322c7ef615516f57a9ffaa31b97",
        "first_add": "98ce66623f6b3ba0117ec7d5e475dd40e3ddb6c0",
    },
    "owner_acceptance": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/product-owner-acceptance-t4-v1.json",
        "sha256": "fff5544a8f28a45c3985bddd0b48706baabbc6a6a010113ac66ce3156c79d5d1",
        "first_add": "e3e6b421944eb57e407f737e4deb89e5846ada0d",
    },
    "accepted_manifest": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/accepted-cohort-manifest-t4-v1.json",
        "sha256": "594a4a89756fb3a60e4fa1111b9df0e4eb0355f7e5b3774ca4291ecf029ccf3e",
        "first_add": "63115d6951371448c9eddfce598387706dc22af6",
    },
    "reconciliation_v3": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/cohort-reconciliation-v3.json",
        "sha256": "866d3926d3145450dbc19e1ff8ec58f3d649e259aa99996c6c3af9f6b34aecab",
        "first_add": "dc34feec8277988183c79da29e53bdba077a729d",
    },
    "batch_c_selector_v7": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-role-receipt-selection-v7.json",
        "sha256": "d4c3eb1093970cbe4470bd4da833fced7465b443f85c7d900c79979163a95a17",
        "first_add": "8693ba3ec9ba139ee59b4255c958ebb3fc4be0a1",
    },
    "batch_c_review_v7": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-adversarial-review-v7.json",
        "sha256": "24213a190009dc1a623f8b3a79d240133c1b3f0bf792023cc35cb163bdb5b2e2",
        "first_add": "c65c4bac697a06d9c3cb84864923184821c7e098",
    },
    "full_cohort_review_v3": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/full-cohort-independent-review-v3-selector-v7-root-downstream-20260722-1924-r7k3v7-3d2f.json",
        "sha256": "6d7b03d02bfd4cb1d710bd1e236cd00fd4471f7a20331285591a0f325997e872",
        "first_add": "519e84f4ae26c6c910755b9f28a27e01a807b4f8",
    },
    "browser_v6": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-browser-audit-v6-root-arbiter-20260722-1758-kimi-b91e.json",
        "sha256": "6e9a39503d315f59b001e0952fe317441115cf5c82f8efb3fe5473690b97b4e6",
        "first_add": "ae0920c93f30bf1d2d90058373c552dfccdfd8a1",
    },
    "asset_validation_companion": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-asset-v5-independent-validation-v1.json",
        "sha256": "ee322ac2d9f7f8d87cc4d94db16d83484a01dae0ae07e60b1c644ef9bd09ec5c",
        "first_add": "746f852e19076698b2afb4d193a464f992c0af13",
    },
}
STOP_LOSS = {
    "v1": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/t4-accepted-cohort-admission-result-v1.json",
        "sha256": "967642a6a0fd7eca6a6e2a6e2fbb75ae22bf53e083bff4e0bf8d760fc6ecccf0",
        "status": "red-stop-loss-no-second-cycle",
    },
    "v2": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/t4-accepted-cohort-admission-result-v2.json",
        "sha256": "d6485691681a666614bc817f18a7704923bc97263fe0f8ca28f78a136ba276b0",
        "status": "red-stop-loss-no-second-cycle",
    },
}


def command(*args: str) -> str:
    """Runs a read-only command in the canonical checkout."""
    return subprocess.check_output(args, cwd=ROOT, text=True).strip()


def digest(path: Path) -> str:
    """Returns the SHA-256 digest of a file's raw bytes."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(relative_path: str) -> dict[str, Any]:
    """Loads a bound JSON record without normalizing its source bytes."""
    return json.loads((ROOT / relative_path).read_text())


def at(record: dict[str, Any], *keys: str) -> Any:
    """Gets a nested object value or returns None when a key is absent."""
    value: Any = record
    for key in keys:
        if not isinstance(value, dict):
            return None
        value = value.get(key)
    return value


def main() -> int:
    """Evaluates objective committed lifecycle evidence once and writes its result."""
    checks: list[dict[str, Any]] = []

    def check(name: str, passed: bool, expected: Any, observed: Any) -> None:
        checks.append({"name": name, "passed": passed, "expected": expected, "observed": observed})

    head = command("git", "rev-parse", "HEAD")
    branch = command("git", "branch", "--show-current")
    worktree_lines = command("git", "worktree", "list", "--porcelain").splitlines()
    worktrees = [line.removeprefix("worktree ") for line in worktree_lines if line.startswith("worktree ")]
    check("canonical_master_branch", branch == "master", "master", branch)
    check("exactly_one_physical_worktree", worktrees == [CANONICAL], [CANONICAL], worktrees)

    raw_bindings: dict[str, Any] = {}
    for name, binding in BOUND.items():
        path = ROOT / binding["path"]
        current = path.read_bytes() if path.exists() else b""
        current_sha = hashlib.sha256(current).hexdigest()
        first_adds = command("git", "log", "--diff-filter=A", "--format=%H", "--", binding["path"]).splitlines()
        first_add = first_adds[-1] if first_adds else None
        historical = command("git", "show", f'{binding["first_add"]}:{binding["path"]}').encode()
        is_ancestor = subprocess.run(
            ["git", "merge-base", "--is-ancestor", binding["first_add"], head], cwd=ROOT, check=False
        ).returncode == 0
        check(f"{name}_raw_sha256", current_sha == binding["sha256"], binding["sha256"], current_sha)
        check(f"{name}_first_add", first_add == binding["first_add"], binding["first_add"], first_add)
        check(f"{name}_raw_bytes_equal_first_add", current == historical, True, current == historical)
        check(f"{name}_first_add_ancestry", is_ancestor, True, is_ancestor)
        raw_bindings[name] = {**binding, "current_sha256": current_sha, "first_add_observed": first_add}

    candidate = read_json(BOUND["candidate"]["path"])
    acceptance = read_json(BOUND["owner_acceptance"]["path"])
    manifest = read_json(BOUND["accepted_manifest"]["path"])
    reconciliation = read_json(BOUND["reconciliation_v3"]["path"])
    selector = read_json(BOUND["batch_c_selector_v7"]["path"])
    batch_c_review = read_json(BOUND["batch_c_review_v7"]["path"])
    full_review = read_json(BOUND["full_cohort_review_v3"]["path"])
    browser = read_json(BOUND["browser_v6"]["path"])
    asset = read_json(BOUND["asset_validation_companion"]["path"])

    check("candidate_non_consumable", at(candidate, "candidate_only") is True and at(candidate, "consumable") is False, {"candidate_only": True, "consumable": False}, {"candidate_only": at(candidate, "candidate_only"), "consumable": at(candidate, "consumable")})
    check("candidate_false_authorities", all(at(candidate, "authorization", key) is False for key in ("candidate_consumable", "product_owner_acceptance_authorized", "accepted_manifest_publication_authorized", "cohort_consumption_authorized")), False, at(candidate, "authorization"))
    check("acceptance_order_and_authority", at(acceptance, "decision") == "ACCEPT-WITH-DISCLOSURE" and at(acceptance, "consumption_authorized_before_accepted_manifest") is False and at(acceptance, "accepted_manifest_publication_authorized") is True, {"decision": "ACCEPT-WITH-DISCLOSURE", "pre_manifest_consumption": False, "manifest_publication": True}, {"decision": at(acceptance, "decision"), "pre_manifest_consumption": at(acceptance, "consumption_authorized_before_accepted_manifest"), "manifest_publication": at(acceptance, "accepted_manifest_publication_authorized")})
    check("manifest_conditional_consumability", at(manifest, "status") == "accepted-with-disclosure" and at(manifest, "consumable") is True and at(manifest, "consumability") == "conditional-only-under-every-recorded-condition-and-disclosure", {"status": "accepted-with-disclosure", "consumable": True, "consumability": "conditional-only-under-every-recorded-condition-and-disclosure"}, {"status": at(manifest, "status"), "consumable": at(manifest, "consumable"), "consumability": at(manifest, "consumability")})
    check("manifest_t8_product_shipping_false", at(manifest, "t8_authorized") is False and at(manifest, "product_or_shipping_claim_authorized") is False and all(value is False for value in at(manifest, "forbidden_success_claims").values()), {"t8": False, "product_or_shipping": False, "all_forbidden_success_claims": False}, {"t8": at(manifest, "t8_authorized"), "product_or_shipping": at(manifest, "product_or_shipping_claim_authorized"), "forbidden_success_claims": at(manifest, "forbidden_success_claims")})

    roster = at(reconciliation, "reconciliation")
    check("v3_reconciliation_roster_exactly_eight", at(reconciliation, "status") == "structurally-reconciled-only-not-a-cohort-acceptance" and at(roster, "assigned_games_expected") == 8 and at(roster, "assigned_games_observed") == 8 and at(roster, "duplicates") == 0 and at(roster, "omissions") == 0 and len(at(roster, "entries") or []) == 8 and all(entry.get("exactly_once") is True for entry in at(roster, "entries") or []), {"status": "structurally-reconciled-only-not-a-cohort-acceptance", "expected": 8, "observed": 8, "duplicates": 0, "omissions": 0, "exactly_once": True}, {"status": at(reconciliation, "status"), "roster": roster})
    check("v3_reconciliation_authorities_false", all(at(reconciliation, "authorizations", key) is False for key in ("candidate_manifest_publication_authorized", "product_owner_acceptance_authorized", "accepted_manifest_publication_authorized", "cohort_consumption_authorized")), False, at(reconciliation, "authorizations"))
    check("batch_c_v7_eight_current_roles", at(selector, "status") == "complete-eight-current-role-bindings-v7" and len(at(selector, "selected_receipts") or []) == 8 and len({entry.get("task_id") for entry in at(selector, "selected_receipts") or []}) == 8 and len({entry.get("provider_identifier") for entry in at(selector, "selected_receipts") or []}) == 8, {"status": "complete-eight-current-role-bindings-v7", "roles": 8, "unique_task_ids": 8, "unique_providers": 8}, {"status": at(selector, "status"), "roles": len(at(selector, "selected_receipts") or [])})
    check("batch_c_v7_lifecycle_false", all(at(selector, "lifecycle", key) is False for key in ("candidate_authorized", "acceptance_authorized", "consumption_authorized")), False, at(selector, "lifecycle"))
    counts = at(batch_c_review, "unresolved_findings")
    check("batch_c_v7_review_zero_chm", at(batch_c_review, "lifecycle", "fresh_review_gate") == "green" and all(at(counts, severity) == 0 for severity in ("critical", "high", "medium")), {"fresh_review_gate": "green", "critical": 0, "high": 0, "medium": 0}, {"fresh_review_gate": at(batch_c_review, "lifecycle", "fresh_review_gate"), "counts": counts})
    full_counts = at(full_review, "unresolved_counts")
    check("full_cohort_v3_review_zero_chm", at(full_review, "verdict", "selector_lineage") == "PASS" and all(at(full_counts, severity) == 0 for severity in ("critical", "high", "medium")), {"selector_lineage": "PASS", "critical": 0, "high": 0, "medium": 0}, {"verdict": at(full_review, "verdict"), "counts": full_counts})

    exits = at(browser, "screenshots", "daemon_helper_compatibility_disclosure")
    route_statuses = [entry.get("network_status") for entry in at(browser, "route_observations") or []]
    check("kimi_helper_recovery_and_404", at(browser, "kimi", "running") is True and at(browser, "kimi", "extension_connected") is True and at(browser, "screenshots", "capture_policy") is not None and at(browser, "screenshots", "compact", "sha256") == "fdc81567f73c037216af06c3cdd903ad533454e4cc53446fc2024c68de309213" and at(browser, "screenshots", "wide", "sha256") == "81ee1ebfdae663c3bb69eaa9d69b41c1e88bc02f23890f6196003ad9d252f056" and "exit 4" in (exits or "") and "exit 28" in (exits or "") and route_statuses == [404, 404] and at(browser, "disposition", "candidate_authorized") is False and at(browser, "disposition", "acceptance_authorized") is False and at(browser, "disposition", "consumption_authorized") is False, {"kimi": {"running": True, "extension_connected": True}, "helper_exit_codes": [4, 28], "route_statuses": [404, 404], "lifecycle": False}, {"kimi": at(browser, "kimi"), "route_statuses": route_statuses, "lifecycle": at(browser, "disposition")})
    check("asset_validation_companion", at(asset, "status") == "complete-bounded-independent-validation" and all(at(at(asset, "independent_checks"), key, "result") == "pass" for key in ("chain_hashes", "json_syntax", "predecessor_immutability", "no_backups", "exact_diff_scope")) and at(asset, "boundaries", "selected_asset_role_replaced_or_impersonated") is False, {"status": "complete-bounded-independent-validation", "five_checks": "pass", "role_replaced": False}, {"status": at(asset, "status"), "checks": at(asset, "independent_checks"), "role_replaced": at(asset, "boundaries", "selected_asset_role_replaced_or_impersonated")})

    ordering = [BOUND["reconciliation_v3"]["first_add"], BOUND["candidate"]["first_add"], BOUND["owner_acceptance"]["first_add"], BOUND["accepted_manifest"]["first_add"]]
    ordering_ok = all(subprocess.run(["git", "merge-base", "--is-ancestor", before, after], cwd=ROOT, check=False).returncode == 0 for before, after in zip(ordering, ordering[1:]))
    check("v3_candidate_acceptance_manifest_ancestry", ordering_ok, ordering, ordering)

    stop_loss_history: dict[str, Any] = {}
    for name, item in STOP_LOSS.items():
        record = read_json(item["path"])
        observed_sha = digest(ROOT / item["path"])
        observed_status = record.get("status")
        check(f"excluded_stop_loss_{name}", observed_sha == item["sha256"] and observed_status == item["status"], {"sha256": item["sha256"], "status": item["status"]}, {"sha256": observed_sha, "status": observed_status})
        stop_loss_history[name] = {"path": item["path"], "sha256": observed_sha, "status": observed_status, "disposition": "excluded-stop-loss-history-only"}

    all_dirt = command("git", "status", "--short").splitlines()
    scoped_dirt = [line for line in all_dirt if "measure/tracks/apk_corpus_audit_action_defense_20260712" in line]
    passed = all(item["passed"] for item in checks)
    result = {
        "schema_version": 3,
        "track_id": "apk_corpus_audit_action_defense_20260712",
        "task_id": "T4-ACCEPTED-COHORT-ADMISSION-V3",
        "status": "green-objective-committed-lifecycle-invariants" if passed else "red-objective-committed-lifecycle-invariants",
        "outcome": "pass" if passed else "fail",
        "head": head,
        "branch": branch,
        "worktrees": worktrees,
        "bound_raw_evidence": raw_bindings,
        "excluded_stop_loss_history": stop_loss_history,
        "checks": checks,
        "scoped_dirt_observed_not_gate_input": scoped_dirt,
        "all_worktree_dirt_observed_not_gate_input": all_dirt,
        "scope": "Only raw committed lifecycle/evidence bytes and objective JSON invariants are gate inputs. Human diagnosis prose, plan.md, metadata.json, LAST-BATCH-STATUS.md, and unselected concurrent ownership placeholders are excluded.",
    }
    result_bytes = (json.dumps(result, indent=2, sort_keys=True) + "\n").encode()
    RESULT.write_bytes(result_bytes)
    result_sha = hashlib.sha256(result_bytes).hexdigest()
    proof = {
        "schema_version": 1,
        "role": "admission-gate-author-full-cohort",
        "task_id": "T4-ACCEPTED-COHORT-ADMISSION-V3",
        "gate_path": str(Path("measure/tracks/apk_corpus_audit_action_defense_20260712") / Path(__file__).name),
        "gate_sha256": digest(Path(__file__)),
        "result_path": str(RESULT.relative_to(ROOT)),
        "result_sha256": result_sha,
        "outcome": result["outcome"],
        "worktree_policy": {"canonical_checkout": CANONICAL, "auxiliary_worktree_used": False},
    }
    proof_bytes = (json.dumps(proof, indent=2, sort_keys=True) + "\n").encode()
    PROOF.write_bytes(proof_bytes)
    receipt = {
        "schema_version": 1,
        "role": "admission-gate-author-full-cohort",
        "task_id": "T4-ACCEPTED-COHORT-ADMISSION-V3",
        "status": "complete",
        "proof_path": str(PROOF.relative_to(ROOT)),
        "proof_sha256": hashlib.sha256(proof_bytes).hexdigest(),
        "result_path": str(RESULT.relative_to(ROOT)),
        "result_sha256": result_sha,
        "outcome": result["outcome"],
        "authority": "objective admission check only; no candidate, acceptance, manifest, T8, product, or shipping authority is created",
    }
    RECEIPT.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n")
    print(json.dumps({"outcome": result["outcome"], "result_sha256": result_sha, "checks": len(checks), "failed": [item["name"] for item in checks if not item["passed"]]}))
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
