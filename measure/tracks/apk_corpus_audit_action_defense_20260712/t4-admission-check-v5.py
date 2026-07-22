"""Run the single active hash-based admission check for the T4 v2 lifecycle."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path
from typing import Any


HERE = Path(__file__).resolve()
TRACK = HERE.parent
ROOT = TRACK.parents[2]
RESULT = TRACK / "t4-admission-result-v5.json"

CANDIDATE_COMMIT = "d70959ce2cdfed2e655f5ffcccef67f9bc6ea353"
ACCEPTANCE_COMMIT = "1d56853dcb287463fb12906a8c534e7973cfb8cc"
MANIFEST_COMMIT = "8b3a83d3d0347921f67e3a81131a312b9d916c71"
RECONCILIATION_COMMIT = "d009b9a3b99e5aca3a512be09f10c5a9e34c437a"
REVIEW_COMMIT = "81bfe78eb8ccef81d95636fcf7e0c745841d84fc"

ARTIFACTS = {
    "candidate_ownership": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/candidate-author-full-cohort-v2-81bfe78e-20260722T130706Z-codex-ownership.json",
        "sha256": "111aac6e55d859ca2e9c703da321231d4d57ff185a3cf4206c6e2254f2661ee1",
        "first_publication_commit": CANDIDATE_COMMIT,
    },
    "candidate_manifest": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/candidate-cohort-manifest-t4-v2-81bfe78e-20260722T130706Z-codex.json",
        "sha256": "436d15249549fb0762edcb5c63d1fdcc4f4d51c80852200f929050ca0a0840f5",
        "first_publication_commit": CANDIDATE_COMMIT,
    },
    "candidate_proof": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/role-proofs/candidate-author-full-cohort-v2-81bfe78e-20260722T130706Z-codex.json",
        "sha256": "7993540721f02b2ea388ee2de8e8e8188079485c2e7d1d7951e1a84cc2d6d520",
        "first_publication_commit": CANDIDATE_COMMIT,
    },
    "candidate_receipt": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/candidate-author-full-cohort-v2-81bfe78e-20260722T130706Z-codex.json",
        "sha256": "95c3304bbaf825c77a2f76169d52853d7336507a1ab18d60e65bfa1eb072694d",
        "first_publication_commit": CANDIDATE_COMMIT,
    },
    "owner_acceptance": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/product-owner-acceptance-t4-v2.json",
        "sha256": "56bc530ddff17e8ff20741517d6c29b17ba250cbb35ec3a772a3cd71a23ed318",
        "first_publication_commit": ACCEPTANCE_COMMIT,
    },
    "accepted_manifest": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/accepted-cohort-manifest-t4-v2.json",
        "sha256": "824850257f5eaa2f2bb2d786ddedc5d6cbd03d7b088b00400c0d1d7a11feac80",
        "first_publication_commit": MANIFEST_COMMIT,
    },
    "accepted_manifest_proof": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/role-proofs/accepted-manifest-publisher-full-cohort-v2.json",
        "sha256": "217f3453ec93e826ecc8a880cb202dc44596f1911f4fbfb220410f1e34ce5671",
        "first_publication_commit": MANIFEST_COMMIT,
    },
    "accepted_manifest_receipt": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/accepted-manifest-publisher-full-cohort-v2.json",
        "sha256": "d1db22cbe5d9f7b20e6a9f11b475b2080be97c37d424c8466d4adf41ebdcebd8",
        "first_publication_commit": MANIFEST_COMMIT,
    },
    "reconciliation_v4": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/cohort-reconciliation-v4.json",
        "sha256": "6f202f838a97dd93fc049d6301cb0230b715f869b4c994e62dbf178c27658c8c",
        "first_publication_commit": RECONCILIATION_COMMIT,
    },
    "full_review_v4": {
        "path": "measure/tracks/apk_corpus_audit_action_defense_20260712/full-cohort-independent-review-v4-d009b9a3-20260722T125310Z-codex.json",
        "sha256": "95f9d5b91ea2caea1477c07605ee664e4c94cdf7f301a9490954ee9f978f2f43",
        "first_publication_commit": REVIEW_COMMIT,
    },
}

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

EXPECTED_FORBIDDEN_CLAIMS = {
    "gameplay",
    "responsive",
    "completion",
    "persistence",
    "xp",
    "idempotency",
    "api",
    "asset_loading",
    "asset_suitability",
    "licensing",
    "production_use",
    "ontology",
    "cross_game_standardization",
    "implementation",
    "shipping",
}


def sha256_bytes(value: bytes) -> str:
    """Return the SHA-256 digest for exact bytes.

    Args:
        value: Bytes whose digest is required.

    Returns:
        The lowercase hexadecimal SHA-256 digest.
    """

    return hashlib.sha256(value).hexdigest()


def git_bytes(*args: str) -> bytes:
    """Run a read-only Git command and return its exact stdout bytes.

    Args:
        *args: Git arguments excluding the executable name.

    Returns:
        The command's unmodified stdout bytes.
    """

    return subprocess.check_output(["git", *args], cwd=ROOT)


def git_text(*args: str) -> str:
    """Run a read-only Git command and return stripped UTF-8 text.

    Args:
        *args: Git arguments excluding the executable name.

    Returns:
        The command's decoded and stripped standard output.
    """

    return git_bytes(*args).decode("utf-8").strip()


def is_ancestor(before: str, after: str) -> bool:
    """Report whether one revision is an ancestor of another.

    Args:
        before: Proposed ancestor revision.
        after: Proposed descendant revision.

    Returns:
        True only when Git confirms the ancestry relation.
    """

    return subprocess.run(
        ["git", "merge-base", "--is-ancestor", before, after],
        cwd=ROOT,
        check=False,
    ).returncode == 0


def load_json(relative_path: str) -> dict[str, Any]:
    """Load a repository-relative JSON object.

    Args:
        relative_path: Path relative to the canonical repository root.

    Returns:
        The decoded JSON object.
    """

    return json.loads((ROOT / relative_path).read_text(encoding="utf-8"))


def main() -> int:
    """Evaluate the active T4 v2 lifecycle exactly once and write its result.

    Returns:
        Zero for a green admission and one for a red admission.
    """

    if RESULT.exists():
        raise SystemExit("Refusing to rerun: the active v5 admission result already exists.")

    checks: list[dict[str, Any]] = []

    def check(name: str, condition: bool, detail: Any) -> None:
        """Record one admission assertion.

        Args:
            name: Stable assertion identifier.
            condition: Whether the assertion passed.
            detail: Auditable value or explanation for the assertion.

        Returns:
            Nothing.
        """

        checks.append(
            {
                "name": name,
                "status": "pass" if condition else "fail",
                "detail": detail,
            }
        )

    branch = git_text("branch", "--show-current")
    worktrees = [
        line.removeprefix("worktree ")
        for line in git_text("worktree", "list", "--porcelain").splitlines()
        if line.startswith("worktree ")
    ]
    check("canonical-master-branch", branch == "master", branch)
    check("single-canonical-checkout", worktrees == [str(ROOT)], worktrees)

    for name, binding in ARTIFACTS.items():
        relative_path = binding["path"]
        expected_digest = binding["sha256"]
        first_commit = binding["first_publication_commit"]
        current_digest = sha256_bytes((ROOT / relative_path).read_bytes())
        committed_digest = sha256_bytes(
            git_bytes("show", f"{first_commit}:{relative_path}")
        )
        add_commits = git_text(
            "log", "--diff-filter=A", "--format=%H", "--", relative_path
        ).splitlines()
        check(f"{name}-current-sha256", current_digest == expected_digest, current_digest)
        check(f"{name}-published-blob-sha256", committed_digest == expected_digest, committed_digest)
        check(f"{name}-first-publication", add_commits == [first_commit], add_commits)

    check(
        "candidate-before-owner-acceptance",
        is_ancestor(CANDIDATE_COMMIT, ACCEPTANCE_COMMIT),
        [CANDIDATE_COMMIT, ACCEPTANCE_COMMIT],
    )
    check(
        "owner-acceptance-before-accepted-manifest",
        is_ancestor(ACCEPTANCE_COMMIT, MANIFEST_COMMIT),
        [ACCEPTANCE_COMMIT, MANIFEST_COMMIT],
    )
    check(
        "accepted-manifest-published-before-active-gate",
        is_ancestor(MANIFEST_COMMIT, "HEAD"),
        [MANIFEST_COMMIT, git_text("rev-parse", "HEAD")],
    )

    candidate = load_json(ARTIFACTS["candidate_manifest"]["path"])
    acceptance = load_json(ARTIFACTS["owner_acceptance"]["path"])
    manifest = load_json(ARTIFACTS["accepted_manifest"]["path"])
    review = load_json(ARTIFACTS["full_review_v4"]["path"])

    check(
        "candidate-remains-non-consumable-input",
        candidate["candidate_only"] is True
        and candidate["consumable"] is False
        and candidate["acceptance"] == "not-claimed",
        candidate["status"],
    )
    check(
        "owner-acceptance-authorizes-later-manifest",
        acceptance["decision"] == "ACCEPT-WITH-DISCLOSURE"
        and acceptance["accepted_manifest_publication_authorized"] is True
        and acceptance["consumption_authorized_before_accepted_manifest"] is False,
        acceptance["decision"],
    )
    check(
        "accepted-manifest-conditionally-consumable",
        manifest["decision"] == "ACCEPT-WITH-DISCLOSURE"
        and manifest["status"] == "accepted-with-disclosure"
        and manifest["consumable"] is True
        and manifest["consumability"]
        == "conditional-only-under-every-recorded-condition-and-disclosure"
        and manifest["cohort_consumption_authorized"]
        == "conditional-only-under-this-manifest-and-all-bound-disclosures",
        manifest["consumability"],
    )

    roster = manifest["full_cohort_roster"]
    check(
        "eight-game-roster-exactly-once",
        roster["entries"] == EXPECTED_ROSTER
        and roster["expected_games"] == roster["observed_games"] == 8
        and roster["duplicates"] == roster["omissions"] == 0
        and roster["exactly_once"] is True,
        roster,
    )
    check(
        "batch-roster-a3-b3-c2",
        roster["batch_counts"] == {"batch_a": 3, "batch_b": 3, "batch_c": 2},
        roster["batch_counts"],
    )

    selector = candidate["selector_and_review_dispositions"]
    check(
        "browser-v6-selected-v5-excluded",
        selector["browser_v6_selected"] is True
        and selector["browser_v5_selected"] is False
        and selector["browser_v5_disposition"]
        == "historical-non-consumable-unselected-excluded",
        {
            "v6_selected": selector["browser_v6_selected"],
            "v5_selected": selector["browser_v5_selected"],
            "v5_disposition": selector["browser_v5_disposition"],
        },
    )
    check(
        "browser-v6-kimi-disclosure-retained",
        any(
            "Browser v6" in item
            and "screenshot.sh" in item
            and "exits 4 and 28" in item
            for item in candidate["retained_disclosures"]["batch_c"]
        )
        and any(
            "Browser v6" in item
            and "screenshot.sh" in item
            and "exits 4 and 28" in item
            for item in manifest["conditions"]
        ),
        "Browser v6 Kimi WebBridge disclosure present in candidate and accepted manifest",
    )

    disclosure_counts = {
        "candidate_batch_a": len(candidate["retained_disclosures"]["batch_a"]),
        "candidate_batch_b": len(candidate["retained_disclosures"]["batch_b"]),
        "candidate_batch_c": len(candidate["retained_disclosures"]["batch_c"]),
        "owner_acceptance": len(acceptance["accepted_disclosures"]),
        "accepted_manifest": len(manifest["conditions"]),
    }
    check(
        "all-bound-disclosure-collections-retained",
        disclosure_counts
        == {
            "candidate_batch_a": 4,
            "candidate_batch_b": 5,
            "candidate_batch_c": 7,
            "owner_acceptance": 8,
            "accepted_manifest": 8,
        },
        disclosure_counts,
    )
    combined_disclosures = "\n".join(
        candidate["retained_disclosures"]["batch_a"]
        + candidate["retained_disclosures"]["batch_b"]
        + candidate["retained_disclosures"]["batch_c"]
        + acceptance["accepted_disclosures"]
        + manifest["conditions"]
    ).lower()
    disclosure_terms = [
        "castle defense",
        "disc-001",
        "178 of 187",
        "synthetic",
        "http 400",
        "http 404",
        "provider session provenance",
        "browser v5",
        "browser v6",
        "screenshot.sh",
        "direct screenshot api",
        "asset v5",
        "five pending self-check",
        "collision-invalid",
        "encrypted-prompt",
        "admission gates v1-v3",
    ]
    check(
        "disclosure-subjects-complete",
        all(term in combined_disclosures for term in disclosure_terms),
        {
            term: term in combined_disclosures
            for term in disclosure_terms
        },
    )

    unresolved = {
        "review_findings": len(review["findings"]),
        "review_critical": review["finding_counts"]["critical"],
        "review_high": review["finding_counts"]["high"],
        "review_medium": review["finding_counts"]["medium"],
        "candidate_unresolved_chm": selector["unresolved_critical_high_medium"],
        "acceptance_unresolved_chm": acceptance["fresh_independent_review"][
            "unresolved_critical_high_medium"
        ],
        "manifest_unresolved_chm": manifest["full_cohort_review"][
            "unresolved_critical_high_medium"
        ],
    }
    check(
        "zero-unresolved-critical-high-medium",
        all(value == 0 for value in unresolved.values()),
        unresolved,
    )

    forbidden = manifest["forbidden_success_claims"]
    check(
        "all-forbidden-success-claims-remain-false",
        set(forbidden) == EXPECTED_FORBIDDEN_CLAIMS
        and all(value is False for value in forbidden.values()),
        forbidden,
    )
    check(
        "t8-product-implementation-shipping-remain-unauthorized",
        acceptance["t8_authorized"] is False
        and acceptance["product_or_shipping_authorized"] is False
        and manifest["t8_authorized"] is False
        and manifest["product_or_shipping_claim_authorized"] is False
        and forbidden["implementation"] is False
        and forbidden["shipping"] is False,
        {
            "t8": manifest["t8_authorized"],
            "product_or_shipping": manifest["product_or_shipping_claim_authorized"],
            "implementation": forbidden["implementation"],
            "shipping": forbidden["shipping"],
        },
    )

    passed = all(item["status"] == "pass" for item in checks)
    result = {
        "schema": "apk-t4-active-admission.v5",
        "marker": "MEASURE_AGENT_RESULT",
        "track_id": "apk_corpus_audit_action_defense_20260712",
        "task_id": "T4-ACTIVE-ADMISSION-V5",
        "status": "PASS-ACTIVE-V5-ACCEPTED-WITH-DISCLOSURE"
        if passed
        else "FAIL-ACTIVE-V5-NO-AUTHORITY",
        "run_count": 1,
        "rerun_permitted": False,
        "browser_or_server_checks_rerun": False,
        "historical_admission_gates_rerun": False,
        "active_lifecycle": "candidate-v2 -> owner-acceptance-v2 -> accepted-manifest-v2",
        "historical_non_authoritative_admissions": ["v1", "v2", "v3", "v4"],
        "check_count": len(checks),
        "passed_count": sum(item["status"] == "pass" for item in checks),
        "failed_count": sum(item["status"] == "fail" for item in checks),
        "checks": checks,
        "immutable_bindings": ARTIFACTS,
        "admission": {
            "t4_accepted_with_disclosure": passed,
            "conditionally_consumable": passed,
            "all_recorded_conditions_and_disclosures_required": passed,
            "t8_authorized": False,
            "product_authorized": False,
            "implementation_authorized": False,
            "shipping_authorized": False,
        },
        "next_action": "T4 documentation closeout only; no evidence, lifecycle, browser, or admission reconstruction.",
    }
    RESULT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": result["status"],
                "passed": result["passed_count"],
                "checks": result["check_count"],
            }
        )
    )
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
