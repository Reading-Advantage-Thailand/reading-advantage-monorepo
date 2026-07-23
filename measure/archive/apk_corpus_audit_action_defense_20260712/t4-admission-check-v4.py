"""Minimal hash-based admission check for the accepted T4 v4 lifecycle."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


HERE = Path(__file__).resolve()
TRACK = HERE.parent
ROOT = TRACK.parents[2]
RESULT = TRACK / "t4-admission-result-v4.json"

ARTIFACTS = {
    "candidate": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/candidate-cohort-manifest-t4-v2-81bfe78e-20260722T130706Z-codex.json",
        "sha256": "436d15249549fb0762edcb5c63d1fdcc4f4d51c80852200f929050ca0a0840f5",
        "first_add_commit": "d70959ce2cdfed2e655f5ffcccef67f9bc6ea353",
    },
    "owner_acceptance": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/product-owner-acceptance-t4-v2.json",
        "sha256": "56bc530ddff17e8ff20741517d6c29b17ba250cbb35ec3a772a3cd71a23ed318",
        "first_add_commit": "1d56853dcb287463fb12906a8c534e7973cfb8cc",
    },
    "accepted_manifest": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/accepted-cohort-manifest-t4-v2.json",
        "sha256": "824850257f5eaa2f2bb2d786ddedc5d6cbd03d7b088b00400c0d1d7a11feac80",
        "first_add_commit": "8b3a83d3d0347921f67e3a81131a312b9d916c71",
    },
    "reconciliation": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/cohort-reconciliation-v4.json",
        "sha256": "6f202f838a97dd93fc049d6301cb0230b715f869b4c994e62dbf178c27658c8c",
        "first_add_commit": "d009b9a3b99e5aca3a512be09f10c5a9e34c437a",
    },
    "full_review": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/full-cohort-independent-review-v4-d009b9a3-20260722T125310Z-codex.json",
        "sha256": "95f9d5b91ea2caea1477c07605ee664e4c94cdf7f301a9490954ee9f978f2f43",
        "first_add_commit": "81bfe78eb8ccef81d95636fcf7e0c745841d84fc",
    },
}


def sha256_bytes(value: bytes) -> str:
    """Return the SHA-256 digest of exact bytes."""
    return hashlib.sha256(value).hexdigest()


def git_bytes(*args: str) -> bytes:
    """Run a read-only Git command and return unmodified stdout bytes."""
    return subprocess.check_output(["git", *args], cwd=ROOT)


def git_text(*args: str) -> str:
    """Run a read-only Git command whose output is line-oriented metadata."""
    return git_bytes(*args).decode("utf-8").strip()


def load(relative_path: str) -> dict:
    """Load a repository-relative JSON artifact."""
    return json.loads((ROOT / relative_path).read_text(encoding="utf-8"))


def main() -> int:
    """Evaluate the current accepted T4 lifecycle once and write its result."""
    checks: list[dict[str, object]] = []

    def check(name: str, condition: bool, detail: str) -> None:
        checks.append({"name": name, "status": "pass" if condition else "fail", "detail": detail})

    branch = git_text("branch", "--show-current")
    worktrees = [
        line.removeprefix("worktree ")
        for line in git_text("worktree", "list", "--porcelain").splitlines()
        if line.startswith("worktree ")
    ]
    check("master-branch", branch == "master", branch)
    check("single-canonical-worktree", worktrees == [str(ROOT)], json.dumps(worktrees))

    for name, binding in ARTIFACTS.items():
        path = ROOT / binding["path"]
        current_digest = sha256_bytes(path.read_bytes())
        committed_digest = sha256_bytes(
            git_bytes("show", f'{binding["first_add_commit"]}:{binding["path"]}')
        )
        first_add = git_text("log", "--diff-filter=A", "--format=%H", "--", binding["path"]).splitlines()[-1]
        check(f"{name}-current-sha", current_digest == binding["sha256"], current_digest)
        check(f"{name}-git-blob-sha", committed_digest == binding["sha256"], committed_digest)
        check(f"{name}-first-add", first_add == binding["first_add_commit"], first_add)

    candidate_commit = ARTIFACTS["candidate"]["first_add_commit"]
    acceptance_commit = ARTIFACTS["owner_acceptance"]["first_add_commit"]
    manifest_commit = ARTIFACTS["accepted_manifest"]["first_add_commit"]
    for name, before, after in (
        ("candidate-before-acceptance", candidate_commit, acceptance_commit),
        ("acceptance-before-manifest", acceptance_commit, manifest_commit),
    ):
        result = subprocess.run(
            ["git", "merge-base", "--is-ancestor", before, after], cwd=ROOT, check=False
        )
        check(name, result.returncode == 0, f"returncode={result.returncode}")

    candidate = load(ARTIFACTS["candidate"]["path"])
    acceptance = load(ARTIFACTS["owner_acceptance"]["path"])
    manifest = load(ARTIFACTS["accepted_manifest"]["path"])
    reconciliation = load(ARTIFACTS["reconciliation"]["path"])
    review = load(ARTIFACTS["full_review"]["path"])

    roster = manifest["full_cohort_roster"]
    check("candidate-non-consumable", candidate["candidate_only"] is True and candidate["consumable"] is False, candidate["status"])
    check("owner-accepted-v2", acceptance["decision"] == "ACCEPT-WITH-DISCLOSURE", acceptance["decision"])
    check("manifest-accepted-conditional", manifest["status"] == "accepted-with-disclosure" and manifest["consumability"] == "conditional" and manifest["consumable"] is True, manifest["status"])
    check("roster-eight-exact", roster["expected_games"] == roster["observed_games"] == 8 and roster["duplicates"] == roster["omissions"] == 0 and roster["exactly_once"] is True, json.dumps(roster["batch_counts"], sort_keys=True))
    check("roster-batches-3-3-2", roster["batch_counts"] == {"batch_a": 3, "batch_b": 3, "batch_c": 2}, json.dumps(roster["batch_counts"], sort_keys=True))
    check("review-zero-findings", review["findings"] == [], review["status"])
    check("review-candidate-v2-authorized", review["authorization"]["new_v2_candidate_publication_authorized"] is True, review["status"])

    browser = reconciliation["batch_c"]["browser_disclosure"]
    check("kimi-helper-attempts", browser["helper_capture_attempts"] == 5, str(browser["helper_capture_attempts"]))
    check("kimi-helper-exits", set(browser["helper_exit_codes_include"]) == {4, 28} and browser["wide_timeout_exit_code"] == 28, json.dumps(browser["helper_exit_codes_include"]))
    check("kimi-no-direct-api", browser["direct_screenshot_api_used"] is False, str(browser["direct_screenshot_api_used"]))
    check("kimi-recovery-exact", browser["pngs_copied_unchanged"] is True and browser["source_destination_hashes_identical"] is True, browser["png_copy_source"])
    check("kimi-closed-nonrunnable-404", browser["session_closed"] is True and browser["exact_routes_non_runnable"] is True and browser["exact_routes_http_status"] == 404, str(browser["exact_routes_http_status"]))

    asset = reconciliation["batch_c"]["asset_validation_companion"]
    check("asset-validation-companion", asset["status"] == "complete-bounded-independent-validation" and len(asset["original_pending_fields_preserved"]) == 5, asset["status"])
    check("forbidden-success-claims", all(value is False for value in manifest["forbidden_success_claims"].values()), json.dumps(manifest["forbidden_success_claims"], sort_keys=True))
    check("no-t8-product-shipping", manifest["t8_authorized"] is False and manifest["product_or_shipping_claim_authorized"] is False, "false/false")
    check("v1-lifecycle-superseded", manifest["supersession"]["v1_current_authority"] is False, manifest["supersession"]["v1_lifecycle"])

    passed = all(item["status"] == "pass" for item in checks)
    result = {
        "schema": "apk-t4-minimal-hash-admission.v4",
        "marker": "MEASURE_AGENT_RESULT",
        "track_id": "apk_corpus_audit_action_defense_20260712",
        "status": "green-accepted-with-disclosure" if passed else "red-no-authority",
        "run_count": 1,
        "historical_or_batch_gates_rerun": False,
        "check_count": len(checks),
        "passed_count": sum(item["status"] == "pass" for item in checks),
        "checks": checks,
        "bindings": ARTIFACTS,
        "admission": {
            "t4_accepted_with_disclosure": passed,
            "conditionally_consumable": passed,
            "t8_authorized": False,
            "product_authorized": False,
            "implementation_authorized": False,
            "shipping_authorized": False,
        },
    }
    RESULT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": result["status"], "passed": result["passed_count"], "checks": result["check_count"]}))
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
