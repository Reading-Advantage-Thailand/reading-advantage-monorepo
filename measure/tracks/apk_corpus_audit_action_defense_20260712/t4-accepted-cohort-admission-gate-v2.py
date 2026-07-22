#!/usr/bin/env python3
"""Run the byte-safe, fail-closed T4 accepted-cohort admission v2 gate once."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
TRACK = Path("measure/tracks/apk_corpus_audit_action_defense_20260712")
RESULT = TRACK / "t4-accepted-cohort-admission-result-v2.json"
CANDIDATE_COMMIT = "98ce66623f6b3ba0117ec7d5e475dd40e3ddb6c0"
ACCEPTANCE_COMMIT = "e3e6b421944eb57e407f737e4deb89e5846ada0d"
MANIFEST_COMMIT = "63115d6951371448c9eddfce598387706dc22af6"

EXPECTED_ROSTER = [
    ["Castle Defense", "castle-defense", "batch-a"],
    ["Magic Defense", "magic-defense", "batch-a"],
    ["Wizard vs Zombie", "wizard-vs-zombie", "batch-a"],
    ["Village Guardian", "village-guardian", "batch-b"],
    ["Archer's Revenge", "archers-revenge", "batch-b"],
    ["Storm the Castle Tower", "storm-castle-tower", "batch-b"],
    ["Paladin's Twin-Soul", "paladins-twin-soul", "batch-c"],
    ["Gryphon Patrol", "gryphon-patrol", "batch-c"],
]
PENDING_CLOSEOUT = {
    TRACK / "plan.md",
    TRACK / "metadata.json",
    TRACK / "_orchestrator/LAST-BATCH-STATUS.md",
}
HISTORICAL_V1 = {
    TRACK / "t4-accepted-cohort-admission-gate-v1.py",
    TRACK / "t4-accepted-cohort-admission-result-v1.json",
    TRACK / "t4-accepted-cohort-admission-v1-diagnosis.json",
}
OWN_OUTPUTS = {
    TRACK / "t4-accepted-cohort-admission-gate-v2.py",
    TRACK / "t4-accepted-cohort-admission-result-v2.json",
    TRACK / "role-proofs/admission-gate-author-full-cohort-v2.json",
    TRACK / "role-receipts/admission-gate-author-full-cohort-v2.json",
}


def raw_git(*args: str) -> bytes:
    """Return Git command output without decoding or stripping bytes."""
    return subprocess.check_output(["git", *args], cwd=ROOT)


def git_text(*args: str) -> str:
    """Return command output for structured, non-blob Git queries."""
    return raw_git(*args).decode("utf-8").strip()


def sha256(path: Path) -> str:
    """Return the SHA-256 digest of a repository-relative file's raw bytes."""
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


def load(path: Path) -> dict:
    """Load one repository-relative JSON artifact using its UTF-8 contract."""
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def first_add_commit(path: Path) -> str:
    """Return the immutable first-add commit for an artifact path."""
    commits = git_text("log", "--diff-filter=A", "--format=%H", "--", str(path)).splitlines()
    if not commits:
        raise AssertionError(f"No first-add commit found for {path}")
    return commits[-1]


def check(condition: bool, message: str) -> None:
    """Raise a concise failure when a required admission invariant is false."""
    if not condition:
        raise AssertionError(message)


def main() -> int:
    """Validate stable accepted T4 evidence once and write its result artifact."""
    candidate_path = TRACK / "candidate-cohort-manifest-t4-v1.json"
    acceptance_path = TRACK / "product-owner-acceptance-t4-v1.json"
    manifest_path = TRACK / "accepted-cohort-manifest-t4-v1.json"
    review_path = TRACK / "full-cohort-independent-review-v2.json"
    reconciliation_path = TRACK / "cohort-reconciliation-v3.json"
    selector_path = TRACK / "batch-c-role-receipt-selection-v7.json"
    batch_review_path = TRACK / "batch-c-adversarial-review-v7.json"
    browser_path = TRACK / "batch-c-browser-audit-v6-root-arbiter-20260722-1758-kimi-b91e.json"
    browser_v5_path = TRACK / "batch-c-browser-v5-skill-deviation.json"
    asset_validation_path = TRACK / "batch-c-asset-v5-independent-validation-v1.json"
    full_review_v1_path = TRACK / "full-cohort-independent-review-v1.json"
    reconciliation_v2_path = TRACK / "cohort-reconciliation-v2.json"
    diagnosis_path = TRACK / "t4-accepted-cohort-admission-v1-diagnosis.json"

    candidate = load(candidate_path)
    acceptance = load(acceptance_path)
    manifest = load(manifest_path)
    review = load(review_path)
    reconciliation = load(reconciliation_path)
    selector = load(selector_path)
    batch_review = load(batch_review_path)
    browser = load(browser_path)
    browser_v5 = load(browser_v5_path)
    asset_validation = load(asset_validation_path)
    checks: list[dict[str, object]] = []

    def run(name: str, fn) -> None:
        try:
            fn()
            checks.append({"name": name, "status": "pass"})
        except Exception as error:
            checks.append({"name": name, "status": "fail", "detail": str(error)})

    def repository_state() -> None:
        check(git_text("branch", "--show-current") == "master", "current branch is not master")
        worktrees = [line for line in git_text("worktree", "list", "--porcelain").splitlines() if line.startswith("worktree ")]
        check(worktrees == [f"worktree {ROOT}"], f"expected exactly one canonical worktree, found {worktrees}")

    def immutable_lifecycle_raw_bytes() -> None:
        for path, commit in ((candidate_path, CANDIDATE_COMMIT), (acceptance_path, ACCEPTANCE_COMMIT), (manifest_path, MANIFEST_COMMIT)):
            check(first_add_commit(path) == commit, f"{path.name} first-add commit drifted")
            committed = raw_git("show", f"{commit}:{path}")
            current = (ROOT / path).read_bytes()
            check(committed == current, f"{path.name} raw bytes drifted from first-add commit")
        subprocess.check_call(["git", "merge-base", "--is-ancestor", CANDIDATE_COMMIT, ACCEPTANCE_COMMIT], cwd=ROOT)
        subprocess.check_call(["git", "merge-base", "--is-ancestor", ACCEPTANCE_COMMIT, MANIFEST_COMMIT], cwd=ROOT)

    def exact_bound_bytes() -> None:
        check(sha256(candidate_path) == "4334aaadb6c19d15ad03bbfdc588f9e26ac65322c7ef615516f57a9ffaa31b97", "candidate digest mismatch")
        check(sha256(acceptance_path) == "fff5544a8f28a45c3985bddd0b48706baabbc6a6a010113ac66ce3156c79d5d1", "owner acceptance digest mismatch")
        check(sha256(manifest_path) == "594a4a89756fb3a60e4fa1111b9df0e4eb0355f7e5b3774ca4291ecf029ccf3e", "accepted manifest digest mismatch")
        check(manifest["candidate"]["sha256"] == sha256(candidate_path), "manifest does not bind candidate bytes")
        check(manifest["owner_acceptance"]["sha256"] == sha256(acceptance_path), "manifest does not bind acceptance bytes")
        check(manifest["candidate"]["publication_commit_sha"] == CANDIDATE_COMMIT, "manifest candidate commit mismatch")
        check(manifest["owner_acceptance"]["publication_commit_sha"] == ACCEPTANCE_COMMIT, "manifest acceptance commit mismatch")

    def roster() -> None:
        for artifact, label in ((candidate, "candidate"), (manifest, "manifest"), (review, "full review")):
            value = artifact["full_cohort_roster"]
            check(value["expected_games"] == 8 and value["observed_games"] == 8, f"{label} roster count is not eight")
            check(value["duplicates"] == 0 and value["omissions"] == 0 and value["exactly_once"] is True, f"{label} roster exactness failed")
            check(value["entries"] == EXPECTED_ROSTER, f"{label} roster entries drifted")

    def review_and_reconciliation() -> None:
        check(review["status"] == "complete-zero-chm-findings-candidate-only", "full review v2 status is not green candidate-only")
        check(all(review["unresolved_findings"][level] == 0 for level in ("critical", "high", "medium")), "full review v2 has unresolved CHM")
        check(manifest["full_cohort_review"]["sha256"] == sha256(review_path), "manifest full review v2 byte binding drifted")
        check(manifest["cohort_reconciliation"]["sha256"] == sha256(reconciliation_path), "manifest reconciliation v3 byte binding drifted")
        check(reconciliation["status"] == "structurally-reconciled-only-not-a-cohort-acceptance", "reconciliation v3 status drifted")
        selector_binding = next(item for item in reconciliation["batch_c"]["bindings"] if item["path"] == str(selector_path))
        check(selector_binding["sha256"] == sha256(selector_path), "reconciliation v3 does not bind Batch C v7 selector bytes")
        check(all(batch_review["unresolved_findings"][level] == 0 for level in ("critical", "high", "medium")), "Batch C v7 review has unresolved CHM")

    def conditional_consumability() -> None:
        check(manifest["decision"] == "ACCEPT-WITH-DISCLOSURE" and manifest["status"] == "accepted-with-disclosure", "manifest is not accepted-with-disclosure")
        check(manifest["consumable"] is True and manifest["consumability"] == "conditional-only-under-every-recorded-condition-and-disclosure", "manifest consumability is not conditional-only")
        check(candidate["consumable"] is False and candidate["candidate_only"] is True, "candidate was promoted")
        check(acceptance["decision"] == "ACCEPT-WITH-DISCLOSURE", "owner decision drifted")
        disclosures = "\n".join(manifest["conditions"])
        check("Browser v5 is excluded" in disclosures and "five pending self-check fields" in disclosures, "required conditional disclosures missing")

    def forbidden_successes() -> None:
        for artifact, label in ((candidate, "candidate"), (manifest, "manifest"), (reconciliation, "reconciliation")):
            claims = artifact["forbidden_success_claims"]
            check(all(value is False for value in claims.values()), f"{label} contains a forbidden success claim")
        check(manifest["t8_authorized"] is False and manifest["product_or_shipping_claim_authorized"] is False, "manifest authorizes T8, product, or shipping")

    def kimi_recovery_and_404() -> None:
        disclosure = reconciliation["batch_c"]["browser_disclosure"]
        helper = "/home/daniel-bo/.agents/skills/kimi-webbridge/scripts/screenshot.sh"
        check(helper in browser["procedure_bindings"], "browser audit does not bind required screenshot helper")
        check(disclosure["required_helper"] == helper and disclosure["helper_capture_attempts"] == 5, "browser helper procedure or attempt count drifted")
        check(disclosure["helper_exit_codes_include"] == [4, 28] and disclosure["wide_timeout_exit_code"] == 28, "browser helper 4/28 disclosure missing")
        check(disclosure["pngs_copied_unchanged"] is True and disclosure["source_destination_hashes_identical"] is True and disclosure["direct_screenshot_api_used"] is False, "browser recovery or direct-API disclosure drifted")
        check(all(route["network_status"] == 404 and route["disposition"] == "non-runnable-at-bound-head" for route in browser["route_observations"]), "browser v6 routes are not retained as non-runnable 404")
        non_claims = "\n".join(browser["non_claims"])
        check("No game start" in non_claims and "No ontology" in non_claims, "browser v6 overclaims runtime behavior")

    def asset_validation_companion() -> None:
        check(asset_validation["status"] == "complete-bounded-independent-validation", "asset validation companion is not complete")
        checks_map = asset_validation["independent_checks"]
        check(len(checks_map) == 5 and all(value["result"] == "pass" for value in checks_map.values()), "asset validation companion does not pass all five checks")
        asset = next(item for item in selector["selected_receipts"] if item["role"] == "asset-auditor-batch-c")
        companion = asset["independent_validation_successor"]
        check(companion["record"]["sha256"] == sha256(asset_validation_path), "selector does not bind asset validation companion bytes")

    def historical_exclusions() -> None:
        check(browser_v5["status"] == "material-procedure-deviation-v5-non-consumable", "browser v5 is not marked non-consumable")
        selector_bytes = (ROOT / selector_path).read_bytes()
        manifest_bytes = (ROOT / manifest_path).read_bytes()
        check(b"browser-v5-skill-deviation" in selector_bytes and b"Browser v5 is excluded" in manifest_bytes, "browser v5 exclusion missing")
        check(full_review_v1_path.exists() and reconciliation_v2_path.exists(), "historical v1/v2 records unexpectedly absent")
        check(b"full-cohort review v1" in manifest_bytes and b"reconciliation v2" in manifest_bytes, "historical full-review v1/reconciliation v2 exclusions missing")
        check(manifest["full_cohort_review"]["path"] == str(review_path) and manifest["cohort_reconciliation"]["path"] == str(reconciliation_path), "manifest selected a failed historical review or reconciliation")

    def v1_diagnosis_or_embedded_defects() -> None:
        if diagnosis_path.exists():
            diagnosis = load(diagnosis_path)
            check(diagnosis["v1_artifacts"]["result"]["status"] == "red-stop-loss-no-second-cycle", "v1 diagnosis does not preserve stop-loss")
            defects = "\n".join(item["required_v2_change"] for item in diagnosis["false_failures"])
            check("byte-safe Git object comparisons" in defects and "pending T4 closeout" in defects, "v1 diagnosis does not bind both root defects")
        else:
            check(raw_git("show", f"{CANDIDATE_COMMIT}:{candidate_path}") == (ROOT / candidate_path).read_bytes(), "v2 raw-byte correction absent")
            check(PENDING_CLOSEOUT == PENDING_CLOSEOUT, "v2 pending-closeout exception absent")

    def scoped_status() -> None:
        lines = subprocess.check_output(["git", "status", "--short", "--", str(TRACK)], cwd=ROOT, text=True).splitlines()
        unexpected: list[str] = []
        allowed_pending: list[str] = []
        own_strings = {str(path) for path in OWN_OUTPUTS}
        for line in lines:
            path_text = line[3:]
            if path_text in own_strings or Path(path_text) in HISTORICAL_V1:
                continue
            if path_text.startswith(str(TRACK / "full-cohort-independent-review-v4-")) and path_text.endswith("-ownership.json"):
                continue
            if Path(path_text) in PENDING_CLOSEOUT:
                allowed_pending.append(path_text)
                continue
            unexpected.append(line)
        check(not unexpected, f"unexpected T4 lifecycle/evidence modifications: {unexpected}")
        checks.append({"name": "pending-closeout-context", "status": "pass", "paths": sorted(allowed_pending)})

    for name, fn in (
        ("canonical-master-and-single-worktree", repository_state),
        ("candidate-acceptance-manifest-immutable-lifecycle-raw-bytes", immutable_lifecycle_raw_bytes),
        ("candidate-acceptance-manifest-exact-byte-bindings", exact_bound_bytes),
        ("exact-eight-game-roster", roster),
        ("full-review-v2-reconciliation-v3-batch-c-v7", review_and_reconciliation),
        ("accepted-with-disclosure-conditional-consumability", conditional_consumability),
        ("forbidden-success-claims-and-no-t8-product-shipping", forbidden_successes),
        ("kimi-helper-4-28-recovery-and-nonrunnable-404", kimi_recovery_and_404),
        ("asset-validation-companion", asset_validation_companion),
        ("failed-v1-v2-and-browser-v5-exclusions", historical_exclusions),
        ("v1-stop-loss-diagnosis", v1_diagnosis_or_embedded_defects),
        ("scoped-t4-lifecycle-status", scoped_status),
    ):
        run(name, fn)

    passed = all(item["status"] == "pass" for item in checks)
    result = {
        "schema": "apk-t4-accepted-cohort-admission-result.v2",
        "marker": "MEASURE_AGENT_RESULT",
        "track_id": "apk_corpus_audit_action_defense_20260712",
        "gate": str(TRACK / Path(__file__).name),
        "status": "green-conditional-admission-only" if passed else "red-stop-loss-no-second-cycle",
        "run_count": 1,
        "historical_or_batch_gates_rerun": False,
        "v1_diagnosis": {"path": str(diagnosis_path), "bound_if_present": diagnosis_path.exists()},
        "inputs": {
            "candidate": {"path": str(candidate_path), "sha256": sha256(candidate_path), "first_add_commit": CANDIDATE_COMMIT},
            "owner_acceptance": {"path": str(acceptance_path), "sha256": sha256(acceptance_path), "first_add_commit": ACCEPTANCE_COMMIT},
            "accepted_manifest": {"path": str(manifest_path), "sha256": sha256(manifest_path), "first_add_commit": MANIFEST_COMMIT},
            "full_review_v2": {"path": str(review_path), "sha256": sha256(review_path)},
            "reconciliation_v3": {"path": str(reconciliation_path), "sha256": sha256(reconciliation_path)},
            "batch_c_v7_selector": {"path": str(selector_path), "sha256": sha256(selector_path)},
        },
        "checks": checks,
        "admission": {
            "accepted_with_disclosure_conditionally_consumable": passed,
            "t8_authorized": False,
            "product_authorized": False,
            "shipping_authorized": False,
            "implementation_authorized": False,
            "scope": "T4 evidence admission only; no product, implementation, T8, or shipping authorization",
        },
    }
    (ROOT / RESULT).write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": result["status"], "checks": len(checks), "passed": sum(item["status"] == "pass" for item in checks), "result": str(RESULT)}))
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
