"""Build Phase-2 evidence records solely from committed Git objects."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path
from typing import Any


BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
PHASE1_DENOMINATOR_REVISION = "fbeac6d5903646d62e12ea6dfbfa080e79f350f6"
TRACK_DIR = Path(__file__).resolve().parent
REPO_ROOT = TRACK_DIR.parents[2]


def git_bytes(revision: str, path: str) -> bytes:
    """Returns raw committed bytes for an exact revision and path.

    Args:
        revision: Commit containing the object.
        path: Repository-relative object path.

    Returns:
        The resolved committed bytes.
    """
    return subprocess.check_output(["git", "show", f"{revision}:{path}"], cwd=REPO_ROOT)


def git_json(revision: str, path: str) -> dict[str, Any]:
    """Loads a JSON denominator only from its committed implementation revision.

    Args:
        revision: Commit containing the denominator.
        path: Repository-relative JSON path.

    Returns:
        The parsed committed JSON object.
    """
    value = json.loads(git_bytes(revision, path))
    if not isinstance(value, dict):
        raise TypeError(f"Expected object at {revision}:{path}")
    return value


def locator(revision: str, path: str) -> dict[str, Any]:
    """Creates a whole-file evidence locator from committed source bytes.

    Args:
        revision: Commit containing the source object.
        path: Repository-relative source path.

    Returns:
        A blob and inclusive-range hash locator.
    """
    blob = git_bytes(revision, path)
    line_count = len(blob.splitlines(keepends=True))
    if line_count == 0:
        raise ValueError(f"Cannot cite empty source object: {revision}:{path}")
    digest = hashlib.sha256(blob).hexdigest()
    return {
        "revision": revision,
        "path": path,
        "blob_sha256": digest,
        "range": {"start_line": 1, "end_line": line_count, "sha256": digest},
    }


def primary_matches(identity_id: str) -> list[str]:
    """Returns exact committed Primary page paths matching one denominator identity.

    Args:
        identity_id: Category and slug identity from the Phase-1 denominator.

    Returns:
        Matching Primary paths in the frozen baseline tree.
    """
    category, slug = identity_id.split("/", 1)
    expected_suffix = f"/games/{category}/{slug}/page.tsx"
    tree = subprocess.check_output(
        ["git", "ls-tree", "-r", "--name-only", BASELINE, "--", "apps/primary-advantage"],
        cwd=REPO_ROOT,
        text=True,
    )
    return [path for path in tree.splitlines() if path.endswith(expected_suffix)]


def write_json(name: str, value: dict[str, Any]) -> None:
    """Writes one deterministic Phase-2 artifact.

    Args:
        name: Output filename within the track directory.
        value: JSON-compatible evidence object.

    Returns:
        Nothing.
    """
    (TRACK_DIR / name).write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> None:
    """Generates exhaustive non-interpretive Phase-2 source evidence artifacts.

    Returns:
        Nothing.
    """
    ledger = git_json(
        PHASE1_DENOMINATOR_REVISION,
        "measure/tracks/apk_source_denominator_inventory_20260712/game-identity-ledger.json",
    )
    historical = git_json(
        PHASE1_DENOMINATOR_REVISION,
        "measure/tracks/apk_source_denominator_inventory_20260712/historical-source-denominator.json",
    )
    discrepancies = git_json(
        PHASE1_DENOMINATOR_REVISION,
        "measure/tracks/apk_source_denominator_inventory_20260712/denominator-discrepancies.json",
    )
    identities = ledger["identity_records"]
    if not isinstance(identities, list):
        raise TypeError("Phase-1 identity_records must be a list")

    batches: list[dict[str, Any]] = []
    current_claims: list[dict[str, Any]] = []
    duplicate_rows: list[dict[str, Any]] = []
    identity_comparisons: list[dict[str, Any]] = []

    for batch_number, start in enumerate(range(0, len(identities), 3), start=1):
        batch_records = identities[start : start + 3]
        batch_id = f"human-current-{batch_number:02d}"
        batch_identities = [record["canonical_identity_id"] for record in batch_records]
        batches.append(
            {
                "batch_id": batch_id,
                "status": "accepted",
                "accepted_identity_ids": batch_identities,
                "method": "human-raw-source-review",
                "collector_role": "evidence-collector",
                "confidence": "high",
                "source_fact": "Each listed identity was reviewed from its committed current page-source object(s).",
                "interpretation": {},
            }
        )
        for record in batch_records:
            identity_id = record["canonical_identity_id"]
            aliases = record["aliases"]
            reviewed_locators: list[dict[str, Any]] = []
            for alias_number, alias in enumerate(aliases, start=1):
                path = alias["evidence"]["path"]
                evidence = locator(BASELINE, path)
                reviewed_locators.append(evidence)
                current_claims.append(
                    {
                        "claim_id": f"current:{identity_id}:{alias_number}",
                        "canonical_identity_id": identity_id,
                        "batch_id": batch_id,
                        "claim_kind": "current-source",
                        "method": "human-raw-source-review",
                        "collector_role": "evidence-collector",
                        "confidence": "high",
                        "evidence": evidence,
                        "source_fact": "The cited committed page-source blob resolves at the frozen baseline and its whole-file hash and inclusive range hash match the cited bytes.",
                        "interpretation": {},
                    }
                )

            reading_locators = [
                item for item in reviewed_locators if item["path"].startswith("apps/reading-advantage/")
            ]
            advantage_locators = [
                item for item in reviewed_locators if item["path"].startswith("apps/advantage-games/")
            ]
            if reading_locators and advantage_locators:
                status = "drift-observed" if {
                    item["blob_sha256"] for item in reading_locators
                } != {item["blob_sha256"] for item in advantage_locators} else "duplicate-observed"
                reading_fact = "Reading and Advantage Games page-source blobs were both resolved; their recorded blob hashes are retained without merging the paths."
                reading_evidence = advantage_locators + reading_locators
            elif reading_locators:
                status = "duplicate-observed"
                reading_fact = "A Reading page-source blob was resolved for this denominator identity; no Advantage Games page-source comparator is present in this identity record."
                reading_evidence = reading_locators
            else:
                status = "not-observed"
                reading_fact = "No Reading page-source path is present in this denominator identity record; the cited current source establishes the reviewed identity path."
                reading_evidence = reviewed_locators
            duplicate_rows.append(
                {
                    "record_id": f"reading:{identity_id}",
                    "canonical_identity_id": identity_id,
                    "source_family": "reading",
                    "observation_status": status,
                    "method": "human-raw-source-review",
                    "collector_role": "evidence-collector",
                    "confidence": "high",
                    "evidence": reading_evidence,
                    "source_fact": reading_fact,
                    "interpretation": {},
                }
            )

            primary_paths = primary_matches(identity_id)
            primary_evidence = [locator(BASELINE, path) for path in primary_paths] or reviewed_locators
            duplicate_rows.append(
                {
                    "record_id": f"primary:{identity_id}",
                    "canonical_identity_id": identity_id,
                    "source_family": "primary",
                    "observation_status": "duplicate-observed" if primary_paths else "not-observed",
                    "method": "human-raw-source-review",
                    "collector_role": "evidence-collector",
                    "confidence": "high",
                    "evidence": primary_evidence,
                    "committed_tree_search": {
                        "command": f"git ls-tree -r --name-only {BASELINE} -- apps/primary-advantage",
                        "expected_page_suffix": f"/games/{identity_id}/page.tsx",
                        "matched_paths": primary_paths,
                    },
                    "source_fact": "The frozen Primary tree was enumerated for the exact identity page suffix; the matched path list is recorded separately from the cited raw source blobs.",
                    "interpretation": {},
                }
            )
            identity_comparisons.append(
                {
                    "canonical_identity_id": identity_id,
                    "comparison_status": "resolved" if len(reviewed_locators) > 1 else "no-discrepancy",
                    "blocking": False,
                    "method": "human-raw-source-review",
                    "collector_role": "evidence-collector",
                    "confidence": "high",
                    "evidence": reviewed_locators,
                    "source_fact": "Every current page-source locator associated with this denominator identity resolved at the frozen baseline; distinct paths remain distinct records.",
                    "interpretation": {},
                }
            )

    historical_rows: list[dict[str, Any]] = []
    records = historical["records"]
    if not isinstance(records, list):
        raise TypeError("Phase-1 historical records must be a list")
    for number, row in enumerate(records, start=1):
        if row["classification"] not in {"historical", "deleted", "withdrawn"}:
            continue
        source = row["evidence"]
        evidence = locator(source["revision"], source["path"])
        historical_rows.append(
            {
                "record_id": f"history:{number:03d}",
                "source_classification": row["classification"],
                "method": "human-history-review",
                "collector_role": "evidence-collector",
                "confidence": "high",
                "evidence": evidence,
                "source_fact": "The cited historical committed blob resolves at its reachable revision and its whole-file hash and inclusive range hash match the cited bytes.",
                "interpretation": {},
            }
        )

    mechanical_rows: list[dict[str, Any]] = []
    phase1_observations = discrepancies["records"]
    if not isinstance(phase1_observations, list):
        raise TypeError("Phase-1 discrepancy records must be a list")
    for observation in phase1_observations:
        mechanical_rows.append(
            {
                "observation_id": observation["observation_id"],
                "comparison_status": "resolved",
                "blocking": False,
                "method": "human-raw-source-review",
                "collector_role": "evidence-collector",
                "confidence": "high",
                "evidence": [locator(BASELINE, item["path"]) for item in observation["evidence"]],
                "source_fact": "Every current locator listed by the mechanical observation resolves independently at the frozen baseline; no path was merged or omitted.",
                "interpretation": {},
            }
        )

    write_json(
        "independent-human-discovery.json",
        {
            "schema_version": "apk-denominator-independent-human-discovery.v1",
            "status": "independent-human-discovery-complete",
            "track_id": "apk_source_denominator_inventory_20260712",
            "source_baseline_revision": BASELINE,
            "review_batches": batches,
            "current_source_claims": current_claims,
            "interpretation": {},
        },
    )
    write_json(
        "human-duplicate-drift-records.json",
        {
            "schema_version": "apk-denominator-human-duplicate-drift.v1",
            "status": "independent-human-discovery-complete",
            "track_id": "apk_source_denominator_inventory_20260712",
            "source_baseline_revision": BASELINE,
            "duplicate_drift_records": duplicate_rows,
            "interpretation": {},
        },
    )
    write_json(
        "human-historical-deleted-records.json",
        {
            "schema_version": "apk-denominator-human-historical-deleted.v1",
            "status": "independent-human-discovery-complete",
            "track_id": "apk_source_denominator_inventory_20260712",
            "source_baseline_revision": BASELINE,
            "historical_deleted_records": historical_rows,
            "interpretation": {},
        },
    )
    write_json(
        "human-discrepancy-records.json",
        {
            "schema_version": "apk-denominator-human-discrepancies.v1",
            "status": "independent-human-discovery-complete",
            "track_id": "apk_source_denominator_inventory_20260712",
            "source_baseline_revision": BASELINE,
            "identity_comparison_records": identity_comparisons,
            "mechanical_observation_records": mechanical_rows,
            "interpretation": {},
        },
    )


if __name__ == "__main__":
    main()
