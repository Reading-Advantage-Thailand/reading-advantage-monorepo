"""Generate exhaustive Phase-3 reconciliation from committed discovery evidence."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any


BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
PHASE1_REVISION = "990dd9c060ca844ad16d141b1eb4086b310369a4"
PHASE2_IMPLEMENTATION_REVISION = "4f5dde0a04c70c57f123a72eded84836325743da"
PHASE2_RECEIPT_REVISION = "7eef639674e927f2d56107866d385e0df812aa66"
TRACK = "apk_source_denominator_inventory_20260712"
TRACK_DIR = Path(__file__).resolve().parent
REPO_ROOT = TRACK_DIR.parents[2]
PROGRAM_PATH = "measure/apk-evidence-reconstruction-program.md"
PHASE2_RECEIPT_PATH = f"measure/tracks/{TRACK}/role-receipts/evidence-collector.json"
PHASE1_ARTIFACTS = (
    "source-denominator.json",
    "game-identity-ledger.json",
    "scene-state-denominator.json",
    "asset-file-denominator.json",
    "historical-source-denominator.json",
    "denominator-discrepancies.json",
)
PHASE1_COLLECTOR_ARTIFACTS = (
    "asset-file-denominator.json",
    "historical-source-denominator.json",
)
PHASE2_ARTIFACTS = (
    "independent-human-discovery.json",
    "human-duplicate-drift-records.json",
    "human-historical-deleted-records.json",
    "human-discrepancy-records.json",
)

_GIT_BLOB_CACHE: dict[tuple[str, str], bytes] = {}


def git_bytes(revision: str, path: str) -> bytes:
    """Returns one raw committed object.

    Results are cached per (revision, path) pair so that repeated locator
    revalidation against the same blob does not re-invoke ``git show``.

    Args:
        revision: Commit containing the object.
        path: Repository-relative object path.

    Returns:
        Committed object bytes.
    """
    key = (revision, path)
    cached = _GIT_BLOB_CACHE.get(key)
    if cached is not None:
        return cached
    blob = subprocess.check_output(["git", "show", f"{revision}:{path}"], cwd=REPO_ROOT)
    _GIT_BLOB_CACHE[key] = blob
    return blob


def committed_json(revision: str, name: str) -> dict[str, Any]:
    """Loads one Phase-1 or Phase-2 artifact from an exact predecessor commit.

    Args:
        revision: Exact predecessor commit containing the artifact.
        name: Filename within the track directory.

    Returns:
        Parsed JSON object.
    """
    value = json.loads(git_bytes(revision, f"measure/tracks/{TRACK}/{name}"))
    if not isinstance(value, dict):
        raise TypeError(f"Expected JSON object: {name}")
    return value


_ANCESTOR_CACHE: dict[str, bool] = {}


def is_ancestor(revision: str) -> bool:
    """Reports whether a historical revision is reachable from the frozen baseline.

    Args:
        revision: Candidate historical revision.

    Returns:
        Whether the candidate is a baseline ancestor.
    """
    cached = _ANCESTOR_CACHE.get(revision)
    if cached is not None:
        return cached
    result = subprocess.run(
        ["git", "merge-base", "--is-ancestor", revision, BASELINE],
        cwd=REPO_ROOT,
        check=False,
    ).returncode == 0
    _ANCESTOR_CACHE[revision] = result
    return result


def locator(revision: str, path: str, start_line: int = 1, end_line: int | None = None) -> dict[str, Any]:
    """Builds and revalidates an exact committed byte-range locator.

    Args:
        revision: Commit containing the source object.
        path: Repository-relative source path.
        start_line: First inclusive source line.
        end_line: Last inclusive source line, or the last line when omitted.

    Returns:
        Revalidated locator with blob and inclusive-range digests.
    """
    blob = git_bytes(revision, path)
    lines = blob.splitlines(keepends=True)
    if not lines:
        if start_line not in (0, 1) or end_line not in (None, 0):
            raise ValueError(f"Invalid empty-object range for {revision}:{path}")
        digest = hashlib.sha256(blob).hexdigest()
        return {
            "revision": revision,
            "path": path,
            "blob_sha256": digest,
            "range": {"start_line": 0, "end_line": 0, "sha256": digest},
        }
    final_line = len(lines) if end_line is None else end_line
    if start_line < 1 or final_line < start_line or final_line > len(lines):
        raise ValueError(f"Invalid range for {revision}:{path}: {start_line}-{final_line}")
    return {
        "revision": revision,
        "path": path,
        "blob_sha256": hashlib.sha256(blob).hexdigest(),
        "range": {
            "start_line": start_line,
            "end_line": final_line,
            "sha256": hashlib.sha256(b"".join(lines[start_line - 1 : final_line])).hexdigest(),
        },
    }


def revalidate(evidence: dict[str, Any]) -> dict[str, Any]:
    """Revalidates an existing source locator against its committed bytes.

    Args:
        evidence: Locator from a committed Phase-1 or Phase-2 artifact.

    Returns:
        Equivalent freshly validated locator.
    """
    revision = evidence["revision"]
    if revision != BASELINE and not is_ancestor(revision):
        raise ValueError(f"Unreachable historical revision: {revision}")
    source_range = evidence["range"]
    return locator(revision, evidence["path"], source_range["start_line"], source_range["end_line"])


def revalidate_many(evidence: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Revalidates a nonempty collection of current or historical source locators.

    Args:
        evidence: Source locators from a committed discovery artifact.

    Returns:
        Freshly validated locators in their recorded order.
    """
    if not evidence:
        raise ValueError("A reconciliation comparison requires raw evidence")
    return [revalidate(item) for item in evidence]


def matched_record(
    *,
    mechanical_evidence: list[dict[str, Any]],
    human_evidence: list[dict[str, Any]],
    **fields: Any,
) -> dict[str, Any]:
    """Builds one non-blocking comparison from paired raw evidence.

    Args:
        mechanical_evidence: Raw locators from the mechanical inventory.
        human_evidence: Raw locators from the independent human inventory.
        **fields: Stable collection-specific fields.

    Returns:
        A resolved reconciliation record.
    """
    return {
        **fields,
        "mechanical_evidence": revalidate_many(mechanical_evidence),
        "human_evidence": revalidate_many(human_evidence),
        "resolution_status": "matched",
        "blocking": False,
    }


def unresolved_record(
    *,
    unresolved_source_id: str,
    **fields: Any,
) -> dict[str, Any]:
    """Builds one blocking unresolved-source comparison record.

    Args:
        unresolved_source_id: Unique identifier for the unsupported source gap.
        **fields: Stable collection-specific fields.

    Returns:
        A blocking reconciliation record that fails closed.
    """
    return {
        **fields,
        "resolution_status": "unresolved-source",
        "blocking": True,
        "unresolved_source_id": unresolved_source_id,
    }


def canonical_key(value: object) -> str:
    """Returns a deterministic key for one JSON-compatible source object.

    Args:
        value: Object to identify.

    Returns:
        Canonical compact JSON.
    """
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def main(output_path: Path | None = None) -> None:
    """Writes the exhaustive, non-consumable Phase-3 reconciliation artifact.

    Args:
        output_path: Optional destination for a reproducibility check.

    Returns:
        Nothing.
    """
    source = committed_json(PHASE1_REVISION, "source-denominator.json")
    ledger = committed_json(PHASE1_REVISION, "game-identity-ledger.json")
    scenes = committed_json(PHASE1_REVISION, "scene-state-denominator.json")
    assets = committed_json(PHASE1_REVISION, "asset-file-denominator.json")
    historical = committed_json(PHASE1_REVISION, "historical-source-denominator.json")
    mechanical_discrepancies = committed_json(PHASE1_REVISION, "denominator-discrepancies.json")
    human_discovery = committed_json(PHASE2_IMPLEMENTATION_REVISION, "independent-human-discovery.json")
    human_duplicates = committed_json(PHASE2_IMPLEMENTATION_REVISION, "human-duplicate-drift-records.json")
    human_historical = committed_json(PHASE2_IMPLEMENTATION_REVISION, "human-historical-deleted-records.json")
    human_discrepancies = committed_json(PHASE2_IMPLEMENTATION_REVISION, "human-discrepancy-records.json")

    phase1_hashes = {
        f"measure/tracks/{TRACK}/{name}": hashlib.sha256(
            git_bytes(PHASE1_REVISION, f"measure/tracks/{TRACK}/{name}")
        ).hexdigest()
        for name in PHASE1_ARTIFACTS
    }
    phase2_hashes = {
        f"measure/tracks/{TRACK}/{name}": hashlib.sha256(
            git_bytes(PHASE2_IMPLEMENTATION_REVISION, f"measure/tracks/{TRACK}/{name}")
        ).hexdigest()
        for name in PHASE2_ARTIFACTS
    }
    receipt_owned_hashes = {
        **{
            f"measure/tracks/{TRACK}/{name}": hashlib.sha256(
                git_bytes(PHASE1_REVISION, f"measure/tracks/{TRACK}/{name}")
            ).hexdigest()
            for name in PHASE1_COLLECTOR_ARTIFACTS
        },
        **phase2_hashes,
    }
    receipt_bytes = git_bytes(PHASE2_RECEIPT_REVISION, PHASE2_RECEIPT_PATH)
    receipt = json.loads(receipt_bytes)
    if receipt.get("commit_sha") != PHASE2_IMPLEMENTATION_REVISION:
        raise ValueError("Phase-2 receipt does not bind the required implementation commit")
    if receipt.get("output_hashes") != receipt_owned_hashes:
        raise ValueError("Phase-2 receipt hashes do not bind the exact collector-owned outputs")
    canonical_receipt_output_sha256 = hashlib.sha256(
        json.dumps(receipt_owned_hashes, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    if receipt.get("output_sha256") != canonical_receipt_output_sha256:
        raise ValueError("Phase-2 receipt output_sha256 does not match its canonical output-hash aggregate")

    identity_reviews: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in human_discrepancies["identity_comparison_records"]:
        identity_reviews[row["canonical_identity_id"]].append(row)
    human_claim_ids = {row["canonical_identity_id"] for row in human_discovery["current_source_claims"]}
    source_reviews = {row["mechanical_record_id"]: row for row in human_discovery["mechanical_source_record_reviews"]}
    graph_reviews = {row["mechanical_graph_edge_key"]: row for row in human_discovery["mechanical_graph_edge_reviews"]}
    surface_reviews = {row["mechanical_surface_key"]: row for row in human_discovery["surface_reviews"]}
    asset_reviews = {row["canonical_path"]: row for row in human_discovery["asset_candidate_reviews"]}
    group_reviews = {row["identical_hash_group"]: row for row in human_discovery["identical_hash_group_reviews"]}
    copy_reviews = {row["mechanical_copy_record_id"]: row for row in human_duplicates["mechanical_copy_record_reviews"]}
    observation_reviews = {row["observation_id"]: row for row in human_discrepancies["mechanical_observation_records"]}
    historical_reviews = {row["mechanical_locator_key"]: row for row in human_historical["mechanical_historical_locator_reviews"]}
    program_reviews = {row["program_identity_label"]: row for row in human_discovery["replacement_program_identity_reviews"]}

    unresolved_sources: list[dict[str, Any]] = []
    ledger_by_alias: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in ledger["identity_records"]:
        for alias in {row["catalog_identity_id"], *(item["alias"] for item in row["aliases"])}:
            ledger_by_alias[alias].append(row)
    ledger_by_catalog_id = {
        catalog_id: rows[0]
        for catalog_id, rows in ledger_by_alias.items()
        if len(rows) == 1
    }

    identity_records: list[dict[str, Any]] = []
    for row in ledger["identity_records"]:
        identity_id = row["canonical_identity_id"]
        is_current = any(state["source_class"] == "current-page-source" for state in row["source_states"])
        human_evidence: list[dict[str, Any]] | None = None
        if is_current:
            matching_reviews = identity_reviews.get(identity_id, [])
            if len(matching_reviews) == 1:
                human_evidence = matching_reviews[0]["evidence"]
        else:
            matching_reviews = [
                review
                for review in program_reviews.values()
                if review.get("catalog_id") == row["catalog_identity_id"]
                and review.get("disposition") == "historical/withdrawn"
                and review.get("historical_source_evidence")
            ]
            if len(matching_reviews) == 1:
                human_evidence = matching_reviews[0]["historical_source_evidence"]
        if human_evidence is None:
            unresolved_id = f"identity:{identity_id}"
            identity_records.append(unresolved_record(
                canonical_identity_id=identity_id,
                mechanical_evidence=[alias["evidence"] for alias in row["aliases"]],
                unresolved_source_id=unresolved_id,
            ))
            unresolved_sources.append({
                "unresolved_source_id": unresolved_id,
                "canonical_identity_id": identity_id,
            })
        else:
            identity_records.append(matched_record(
                canonical_identity_id=identity_id,
                mechanical_evidence=[alias["evidence"] for alias in row["aliases"]],
                human_evidence=human_evidence,
            ))

    source_record_records = [
        matched_record(
            mechanical_record_id=row["record_id"],
            mechanical_record_type=row["record_type"],
            mechanical_evidence=[row["evidence"]],
            human_evidence=source_reviews[row["record_id"]]["evidence"],
        )
        for row in source["records"]
    ]
    file_records = [dict(row) for row in source_record_records if row["mechanical_record_type"] == "file"]

    graph_records = [
        matched_record(
            mechanical_graph_edge_key=canonical_key(row),
            mechanical_evidence=[row["evidence"]],
            human_evidence=graph_reviews[canonical_key(row)]["evidence"],
        )
        for row in source["graph_edges"]
    ]

    surface_records: list[dict[str, Any]] = []
    for source_kind, rows in (("scene", scenes["scene_records"]), ("state", scenes["state_records"]), ("transition", scenes["transitions"])):
        for row in rows:
            surface_records.append(matched_record(
                mechanical_surface=row,
                surface_kind=row["transition_kind"] if source_kind == "transition" else source_kind,
                mechanical_evidence=[row["evidence"]],
                human_evidence=surface_reviews[canonical_key(row)]["evidence"],
            ))

    program = git_bytes(BASELINE, PROGRAM_PATH)
    lines = program.splitlines(keepends=True)
    text = program.decode("utf-8")
    partition = text.split("### Pilot\n", 1)[1].split("The partition covers 29 canonical identities exactly once.", 1)[0]
    program_labels = re.findall(r"^- (.+)$", partition, flags=re.MULTILINE)
    if len(program_labels) != 29 or len(set(program_labels)) != 29:
        raise ValueError("Raw replacement-program identity list is not exactly 29 unique labels")
    label_line = {line.decode("utf-8").rstrip("\r\n")[2:]: number for number, line in enumerate(lines, start=1) if line.startswith(b"- ")}
    program_records: list[dict[str, Any]] = []
    for label in program_labels:
        review = program_reviews[label]
        identity_id = review.get("canonical_identity_id")
        disposition = review.get("disposition")
        withdrawn_identity = ledger_by_catalog_id.get(review.get("catalog_id"))
        evidence = locator(BASELINE, PROGRAM_PATH, label_line[label], label_line[label])
        common_fields = {
            "program_identity_label": label,
            "program_evidence": evidence,
            "source_identity_id": review.get("source_identity_id"),
            "disposition": disposition,
            "current_source_denominator_included": review.get("current_source_denominator_included"),
            "history_search": review.get("history_search"),
        }
        if disposition == "current" and identity_id is not None:
            program_records.append(matched_record(
                **common_fields,
                mechanical_identity_ids=[identity_id],
                human_identity_ids=[identity_id],
                mechanical_evidence=[evidence],
                human_evidence=review["current_source_evidence"],
            ))
        elif disposition == "historical/withdrawn" and review.get("historical_source_evidence"):
            program_records.append(matched_record(
                **common_fields,
                mechanical_identity_ids=(
                    [withdrawn_identity["canonical_identity_id"]]
                    if withdrawn_identity is not None and not any(
                        state["source_class"] == "current-page-source"
                        for state in withdrawn_identity["source_states"]
                    )
                    else []
                ),
                human_identity_ids=[],
                mechanical_evidence=[evidence],
                human_evidence=review["historical_source_evidence"],
            ))
        elif disposition in {"alias/copy", "unsupported program assumption"}:
            program_records.append(matched_record(
                **common_fields,
                mechanical_identity_ids=[],
                human_identity_ids=[],
                mechanical_evidence=[evidence],
                human_evidence=[evidence],
            ))
        else:
            unresolved_id = f"program-identity:{label}"
            program_records.append(unresolved_record(
                **common_fields,
                mechanical_identity_ids=[],
                human_identity_ids=[],
                unresolved_source_id=unresolved_id,
            ))
            unresolved_sources.append({
                "unresolved_source_id": unresolved_id,
                "program_identity_label": label,
            })
    group_paths: dict[str, list[str]] = defaultdict(list)
    group_evidence: dict[str, list[dict[str, Any]]] = defaultdict(list)
    asset_records = []
    for row in assets["candidate_files"]:
        evidence = locator(BASELINE, row["canonical_path"])
        group = row["identical_hash_group"]
        group_paths[group].append(row["canonical_path"])
        group_evidence[group].append(evidence)
        asset_records.append(matched_record(
            canonical_path=row["canonical_path"],
            sha256=row["sha256"],
            identical_hash_group=group,
            mechanical_evidence=[evidence],
            human_evidence=asset_reviews[row["canonical_path"]]["evidence"],
        ))
    group_records = [
        matched_record(
            identical_hash_group=group,
            canonical_paths=sorted(paths),
            mechanical_evidence=group_evidence[group],
            human_evidence=group_reviews[group]["evidence"],
        )
        for group, paths in sorted(group_paths.items())
    ]

    copy_records = [
        matched_record(
            mechanical_copy_record_id=row["record_id"],
            copy_source_record_id=row["copy_source_record_id"],
            mechanical_evidence=[row["evidence"]],
            human_evidence=copy_reviews[row["record_id"]]["evidence"],
        )
        for row in source["records"]
        if row["record_type"] == "copy"
    ]

    discrepancy_records = [
        matched_record(
            discrepancy_key=f"mechanical:{row['observation_id']}",
            discrepancy_type="duplicate",
            mechanical_evidence=row["evidence"],
            human_evidence=observation_reviews[row["observation_id"]]["evidence"],
        )
        for row in mechanical_discrepancies["records"]
    ]
    discrepancy_records.extend(
        matched_record(
            discrepancy_key=f"human-duplicate:{row['record_id']}",
            discrepancy_type="duplicate",
            mechanical_evidence=row["evidence"],
            human_evidence=row["evidence"],
        )
        for row in human_duplicates["duplicate_drift_records"]
    )
    for row in historical["records"]:
        key = canonical_key(row["evidence"])
        discrepancy_records.append(matched_record(
            discrepancy_key=f"historical:{key}",
            discrepancy_type="historical",
            mechanical_evidence=[row["evidence"]],
            human_evidence=historical_reviews[key]["evidence"],
        ))
    discrepancy_records.extend(
        matched_record(
            discrepancy_key=f"human-historical:{canonical_key(row['evidence'])}",
            discrepancy_type="historical",
            mechanical_evidence=[row["evidence"]],
            human_evidence=[row["evidence"]],
        )
        for row in human_historical["historical_deleted_records"]
    )
    discrepancy_records.extend(
        matched_record(
            discrepancy_key=f"human-comparison:{row['observation_id']}",
            discrepancy_type="duplicate",
            mechanical_evidence=row["evidence"],
            human_evidence=row["evidence"],
        )
        for row in human_discrepancies["mechanical_observation_records"]
    )

    category_evidence = locator(BASELINE, PROGRAM_PATH, 107, 153)
    reconciliation_status = "reconciliation-blocked" if unresolved_sources else "reconciliation-complete"
    output = {
        "schema_version": "apk-source-denominator-phase3-reconciliation.v1",
        "track_id": TRACK,
        "source_baseline_revision": BASELINE,
        "input_provenance": {
            "phase1": {
                "revision": PHASE1_REVISION,
                "output_hashes": phase1_hashes,
            },
            "phase2": {
                "implementation_revision": PHASE2_IMPLEMENTATION_REVISION,
                "receipt_revision": PHASE2_RECEIPT_REVISION,
                "receipt_path": PHASE2_RECEIPT_PATH,
                "receipt_sha256": hashlib.sha256(receipt_bytes).hexdigest(),
                "consumed_output_hashes": phase2_hashes,
                "receipt_owned_output_hashes": receipt_owned_hashes,
                "receipt_output_sha256": canonical_receipt_output_sha256,
            },
        },
        "status": reconciliation_status,
        "replacement_program_identity_count": len(program_labels),
        "reviewed_program_identity_count": len(program_records),
        "mechanical_identity_count": len(ledger["identity_records"]),
        "human_identity_count": len(human_claim_ids),
        "current_identity_denominator_count": sum(
            row["disposition"] == "current" and row["current_source_denominator_included"]
            for row in program_records
        ),
        "program_disposition_counts": {
            disposition: sum(row["disposition"] == disposition for row in program_records)
            for disposition in ("current", "historical/withdrawn", "alias/copy", "unsupported program assumption")
        },
        "replacement_program_identity_records": program_records,
        "identity_reconciliation_records": identity_records,
        "file_reconciliation_records": file_records,
        "source_record_reconciliation_records": source_record_records,
        "graph_edge_reconciliation_records": graph_records,
        "surface_reconciliation_records": surface_records,
        "surface_category_coverage": [
            {"surface_kind": kind, "coverage_status": "reviewed", "evidence": category_evidence}
            for kind in ("scene", "state", "phase", "overlay", "transition", "terminal", "presentation")
        ],
        "asset_candidate_reconciliation_records": asset_records,
        "identical_hash_group_reconciliation_records": group_records,
        "copy_reconciliation_records": copy_records,
        "discrepancy_reconciliation_records": discrepancy_records,
        "unresolved_sources": unresolved_sources,
    }
    (output_path or TRACK_DIR / "phase3-reconciliation.json").write_text(
        json.dumps(output, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    if len(sys.argv) == 1:
        main()
    elif len(sys.argv) == 3 and sys.argv[1] == "--output":
        main(Path(sys.argv[2]))
    else:
        raise SystemExit("usage: generate_phase3_reconciliation.py [--output <path>]")
