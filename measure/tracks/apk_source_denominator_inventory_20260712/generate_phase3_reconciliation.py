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
    rebuilt = locator(revision, evidence["path"], source_range["start_line"], source_range["end_line"])
    if evidence != rebuilt:
        raise ValueError("LOCATOR_MISMATCH")
    return rebuilt


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
    validated_mechanical = revalidate_many(mechanical_evidence)
    validated_human = revalidate_many(human_evidence)
    exact_overlap = {
        canonical_key(item) for item in validated_mechanical
    } & {canonical_key(item) for item in validated_human}
    mechanical_ids = fields.get("mechanical_identity_ids")
    human_ids = fields.get("human_identity_ids")
    identity_equivalence = (
        isinstance(mechanical_ids, list)
        and isinstance(human_ids, list)
        and bool(mechanical_ids)
        and mechanical_ids == human_ids
    )
    history_search = fields.get("history_search")
    primary_deletion = history_search.get("primary_deletion") if isinstance(history_search, dict) else None
    historical_equivalence = (
        fields.get("disposition") == "historical/withdrawn"
        and isinstance(primary_deletion, dict)
        and any(
            item.get("path") == primary_deletion.get("path")
            and item.get("revision") == primary_deletion.get("parent_revision")
            for item in validated_human
        )
    )
    mechanical_record_key = fields.get("mechanical_record_key")
    human_record_key = fields.get("human_record_key")
    withdrawn_identity_equivalence = (
        fields.get("disposition") == "historical/withdrawn"
        and isinstance(mechanical_record_key, str)
        and bool(mechanical_record_key)
        and mechanical_record_key == human_record_key
    )
    if not (exact_overlap or identity_equivalence or historical_equivalence or withdrawn_identity_equivalence):
        raise ValueError("MATCH_EVIDENCE_UNRELATED")
    return {
        **fields,
        "mechanical_evidence": validated_mechanical,
        "human_evidence": validated_human,
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


def unique_review_map(
    records: list[dict[str, Any]], key_fn: Any, label: str
) -> dict[str, dict[str, Any]]:
    """Maps reviewed records while rejecting duplicate projections before collapse."""
    result: dict[str, dict[str, Any]] = {}
    for row in records:
        key = key_fn(row)
        if key in result:
            raise ValueError(f"DUPLICATE_EXACT_REVIEW_KEY:{label}")
        result[key] = row
    return result


def transition_candidate_key(row: dict[str, Any]) -> str:
    """Returns the exact path/symbol/target/line/optional-from candidate key."""
    evidence = row.get("evidence", {})
    source_range = evidence.get("range", {}) if isinstance(evidence, dict) else {}
    path = row.get("path", evidence.get("path") if isinstance(evidence, dict) else None)
    line = row.get("start_line", source_range.get("start_line"))
    payload = {
        "path": path,
        "source_symbol": row.get("source_symbol"),
        "to_state_id": row.get("to_state_id"),
        "start_line": line,
        "reason": row.get("reason"),
    }
    from_state = row.get("from_state_id", row.get("proven_from_state_id"))
    if isinstance(from_state, str):
        payload["proven_from_state_id"] = from_state
        payload["transition_evidence_kind"] = row.get("transition_evidence_kind")
    if (
        not isinstance(path, str)
        or not isinstance(payload["source_symbol"], str)
        or not isinstance(payload["to_state_id"], str)
        or not isinstance(line, int)
        or not isinstance(payload["reason"], str)
        or isinstance(from_state, str)
        and not isinstance(payload.get("transition_evidence_kind"), str)
    ):
        raise ValueError("INVALID_TRANSITION_CANDIDATE_KEY")
    return canonical_key(payload)


def symmetric_blocker_id(category: str, record_key: str) -> str:
    """Builds the stable identifier for one Phase-2 symmetric blocker.

    Args:
        category: Exact symmetric comparison category.
        record_key: Exact canonical comparison key.

    Returns:
        Stable category-scoped blocker identifier.
    """
    if not category or not record_key:
        raise ValueError("INVALID_SYMMETRIC_BLOCKER_KEY")
    digest = hashlib.sha256(record_key.encode("utf-8")).hexdigest()
    return f"independent-symmetric:{category}:{digest}"


def validate_symmetric_evidence(evidence: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Validates a nonempty Phase-2 evidence side while preserving its exact records.

    Args:
        evidence: Locator, asset-inventory, or deletion-history evidence records.

    Returns:
        Evidence records in their original order and representation.
    """
    if not evidence:
        raise ValueError("A symmetric evidence side must be nonempty when validated")
    if all(all(key in item for key in ("revision", "path", "range")) for item in evidence):
        return revalidate_many(evidence)
    for item in evidence:
        if not isinstance(item, dict):
            raise ValueError("INVALID_SYMMETRIC_BLOCKER_EVIDENCE")
        if all(key in item for key in ("revision", "canonical_path", "sha256")):
            revision = item["revision"]
            path = item["canonical_path"]
            if not isinstance(revision, str) or not isinstance(path, str):
                raise ValueError("INVALID_SYMMETRIC_ASSET_EVIDENCE")
            if revision != BASELINE and not is_ancestor(revision):
                raise ValueError(f"Unreachable symmetric asset revision: {revision}")
            if hashlib.sha256(git_bytes(revision, path)).hexdigest() != item["sha256"]:
                raise ValueError(f"SYMMETRIC_ASSET_HASH_MISMATCH:{path}")
            continue
        if set(item) == {"deletion_revision", "path"}:
            revision = item["deletion_revision"]
            path = item["path"]
            if (
                not isinstance(revision, str)
                or re.fullmatch(r"[0-9a-f]{40}", revision) is None
                or not isinstance(path, str)
                or not path
                or not is_ancestor(revision)
            ):
                raise ValueError("INVALID_SYMMETRIC_DELETION_EVIDENCE")
            deletion = subprocess.check_output(
                ["git", "diff-tree", "--no-commit-id", "--name-status", "-r", revision, "--", path],
                cwd=REPO_ROOT,
                text=True,
            ).splitlines()
            if not any(line == f"D\t{path}" for line in deletion):
                raise ValueError(f"SYMMETRIC_DELETION_NOT_PROVEN:{revision}:{path}")
            continue
        raise ValueError("INVALID_SYMMETRIC_BLOCKER_EVIDENCE")
    return evidence


def propagate_symmetric_blockers(
    rows: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Converts every Phase-2 either-side-only row into one Phase-3 blocker.

    Args:
        rows: Complete Phase-2 symmetric reconciliation rows.

    Returns:
        Blocking discrepancy records and their one-to-one unresolved-source entries.

    Raises:
        ValueError: If comparison status and blocking state disagree or keys are invalid.
    """
    records: list[dict[str, Any]] = []
    unresolved: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for row in rows:
        status = row.get("comparison_status")
        category = row.get("category")
        candidate = category == "transition-write-candidates"
        if status not in {"matched", "mechanical-only", "human-only", "evidence-mismatch"}:
            raise ValueError("INVALID_SYMMETRIC_COMPARISON_STATUS")
        if status == "evidence-mismatch" and not candidate:
            raise ValueError("INVALID_SYMMETRIC_COMPARISON_STATUS")
        expected_resolution = (
            "retained-target-write-candidate" if candidate and status == "matched"
            else "unresolved-candidate" if candidate else "compared"
        )
        expected_blocking = status != "matched"
        if row.get("resolution_status") != expected_resolution:
            raise ValueError("SYMMETRIC_RESOLUTION_STATUS_MISMATCH")
        if row.get("blocking") is not expected_blocking:
            raise ValueError("SYMMETRIC_BLOCKING_FLAG_MISMATCH")
        if not expected_blocking:
            continue
        record_key = row.get("record_key")
        if not isinstance(category, str) or not category or not isinstance(record_key, str) or not record_key:
            raise ValueError("INVALID_SYMMETRIC_BLOCKER_KEY")
        unresolved_id = symmetric_blocker_id(category, record_key)
        if unresolved_id in seen_ids:
            raise ValueError("DUPLICATE_SYMMETRIC_BLOCKER")
        seen_ids.add(unresolved_id)
        mechanical_evidence = row.get("mechanical_evidence")
        human_evidence = row.get("human_evidence")
        if not isinstance(mechanical_evidence, list) or not isinstance(human_evidence, list):
            raise ValueError("INVALID_SYMMETRIC_BLOCKER_EVIDENCE")
        record = unresolved_record(
            discrepancy_key=unresolved_id,
            discrepancy_type="denominator-mismatch",
            symmetric_category=category,
            record_key=record_key,
            comparison_status=status,
            mechanical_evidence=validate_symmetric_evidence(mechanical_evidence) if mechanical_evidence else [],
            human_evidence=validate_symmetric_evidence(human_evidence) if human_evidence else [],
            unresolved_source_id=unresolved_id,
        )
        records.append(record)
        unresolved.append({
            "unresolved_source_id": unresolved_id,
            "symmetric_category": category,
            "record_key": record_key,
            "comparison_status": status,
        })
    return records, unresolved


def main(output_path: Path | None = None) -> None:
    """Writes the exhaustive, non-consumable Phase-3 reconciliation artifact.

    Args:
        output_path: Optional destination for a reproducibility check.

    Returns:
        Nothing.
    """
    receipt_bytes = git_bytes(PHASE2_RECEIPT_REVISION, PHASE2_RECEIPT_PATH)
    receipt = json.loads(receipt_bytes)
    phase2_implementation_revision = receipt.get("commit_sha")
    commit_binding = receipt.get("commit_binding")
    if not isinstance(phase2_implementation_revision, str) or re.fullmatch(r"[0-9a-f]{40}", phase2_implementation_revision) is None:
        raise ValueError("Phase-2 receipt lacks a full implementation commit")
    if not isinstance(commit_binding, dict):
        raise ValueError("Phase-2 receipt lacks a commit binding")
    phase1_revision = commit_binding.get("phase1_attestation_commit")
    if not isinstance(phase1_revision, str) or re.fullmatch(r"[0-9a-f]{40}", phase1_revision) is None:
        raise ValueError("Phase-2 receipt lacks a full Phase-1 attestation commit")
    if commit_binding.get("phase2_attestation_commit") != phase2_implementation_revision:
        raise ValueError("Phase-2 receipt commit bindings disagree")

    source = committed_json(phase1_revision, "source-denominator.json")
    ledger = committed_json(phase1_revision, "game-identity-ledger.json")
    scenes = committed_json(phase1_revision, "scene-state-denominator.json")
    assets = committed_json(phase1_revision, "asset-file-denominator.json")
    historical = committed_json(phase1_revision, "historical-source-denominator.json")
    mechanical_discrepancies = committed_json(phase1_revision, "denominator-discrepancies.json")
    human_discovery = committed_json(phase2_implementation_revision, "independent-human-discovery.json")
    human_duplicates = committed_json(phase2_implementation_revision, "human-duplicate-drift-records.json")
    human_historical = committed_json(phase2_implementation_revision, "human-historical-deleted-records.json")
    human_discrepancies = committed_json(phase2_implementation_revision, "human-discrepancy-records.json")

    phase1_hashes = {
        f"measure/tracks/{TRACK}/{name}": hashlib.sha256(
            git_bytes(phase1_revision, f"measure/tracks/{TRACK}/{name}")
        ).hexdigest()
        for name in PHASE1_ARTIFACTS
    }
    phase2_hashes = {
        f"measure/tracks/{TRACK}/{name}": hashlib.sha256(
            git_bytes(phase2_implementation_revision, f"measure/tracks/{TRACK}/{name}")
        ).hexdigest()
        for name in PHASE2_ARTIFACTS
    }
    receipt_owned_hashes = {
        **{
            f"measure/tracks/{TRACK}/{name}": hashlib.sha256(
                git_bytes(phase1_revision, f"measure/tracks/{TRACK}/{name}")
            ).hexdigest()
            for name in PHASE1_COLLECTOR_ARTIFACTS
        },
        **phase2_hashes,
    }
    if receipt.get("output_hashes") != receipt_owned_hashes:
        raise ValueError("Phase-2 receipt hashes do not bind the exact collector-owned outputs")
    canonical_receipt_output_sha256 = hashlib.sha256(
        json.dumps(receipt_owned_hashes, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    if receipt.get("output_sha256") != canonical_receipt_output_sha256:
        raise ValueError("Phase-2 receipt output_sha256 does not match its canonical output-hash aggregate")
    expected_phase1_provenance = {
        "revision": phase1_revision,
        "artifact_sha256": phase1_hashes,
    }
    for name, document in (
        ("independent-human-discovery.json", human_discovery),
        ("human-duplicate-drift-records.json", human_duplicates),
        ("human-historical-deleted-records.json", human_historical),
        ("human-discrepancy-records.json", human_discrepancies),
    ):
        if document.get("input_provenance") != expected_phase1_provenance:
            raise ValueError(f"Phase-2 input provenance mismatch: {name}")

    identity_reviews = unique_review_map(human_discrepancies["identity_comparison_records"], lambda row: row["canonical_identity_id"], "identities")
    claim_reviews = unique_review_map(human_discovery["current_source_claims"], lambda row: row["claim_id"], "current claims")
    human_claim_ids = {row["canonical_identity_id"] for row in claim_reviews.values()}
    source_reviews = unique_review_map(human_discovery["mechanical_source_record_reviews"], lambda row: row["mechanical_record_id"], "source records")
    graph_reviews = unique_review_map(human_discovery["mechanical_graph_edge_reviews"], lambda row: row["mechanical_graph_edge_key"], "graph edges")
    surface_reviews = unique_review_map(human_discovery["surface_reviews"], lambda row: row["mechanical_surface_key"], "surfaces")
    asset_reviews = unique_review_map(human_discovery["asset_candidate_reviews"], lambda row: row["canonical_path"], "assets")
    group_reviews = unique_review_map(human_discovery["identical_hash_group_reviews"], lambda row: row["identical_hash_group"], "asset groups")
    copy_reviews = unique_review_map(human_duplicates["mechanical_copy_record_reviews"], lambda row: row["mechanical_copy_record_id"], "copies")
    observation_reviews = unique_review_map(human_discrepancies["mechanical_observation_records"], lambda row: row["observation_id"], "observations")
    historical_reviews = unique_review_map(human_historical["mechanical_historical_locator_reviews"], lambda row: row["mechanical_locator_key"], "history")
    program_reviews = unique_review_map(human_discovery["replacement_program_identity_reviews"], lambda row: row["program_identity_label"], "program identities")

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
            matching_review = identity_reviews.get(identity_id)
            if matching_review is not None:
                human_evidence = matching_review["evidence"]
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
                disposition="historical/withdrawn" if not is_current else "current",
                **(
                    {"mechanical_record_key": identity_id, "human_record_key": identity_id}
                    if not is_current else {}
                ),
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

    phase2_symmetric_rows = human_discrepancies.get("independent_symmetric_reconciliation")
    if not isinstance(phase2_symmetric_rows, list):
        raise ValueError("Missing Phase-2 symmetric reconciliation records")
    symmetric_rows_by_key: dict[tuple[str, str], dict[str, Any]] = {}
    for comparison in phase2_symmetric_rows:
        if not isinstance(comparison, dict):
            raise ValueError("Invalid Phase-2 symmetric reconciliation record")
        pair = (comparison.get("category"), comparison.get("record_key"))
        if not all(isinstance(value, str) and value for value in pair) or pair in symmetric_rows_by_key:
            raise ValueError("Invalid or duplicate Phase-2 symmetric reconciliation key")
        symmetric_rows_by_key[pair] = comparison

    surface_records: list[dict[str, Any]] = []
    for source_kind, rows in (
        ("scene", scenes["scene_records"]),
        ("state", scenes["state_records"]),
        ("transition", scenes["transitions"]),
        ("transition-write-candidate", scenes["transition_write_candidates"]),
    ):
        for row in rows:
            common = {
                "mechanical_surface": row,
                "surface_kind": row["transition_kind"] if source_kind == "transition" else source_kind,
                "mechanical_evidence": [row["evidence"]],
                "human_evidence": surface_reviews[canonical_key(row)]["evidence"],
            }
            if source_kind == "transition-write-candidate":
                candidate_key = transition_candidate_key(row)
                candidate_comparison = symmetric_rows_by_key.get(
                    ("transition-write-candidates", candidate_key)
                )
                if (
                    isinstance(candidate_comparison, dict)
                    and candidate_comparison.get("comparison_status") == "matched"
                    and candidate_comparison.get("blocking") is False
                    and candidate_comparison.get("resolution_status")
                    == "retained-target-write-candidate"
                ):
                    retained = matched_record(**common)
                    retained["resolution_status"] = "retained-target-write-candidate"
                    retained["edge_inferred"] = False
                    surface_records.append(retained)
                else:
                    surface_records.append(unresolved_record(
                        **common,
                        unresolved_source_id=symmetric_blocker_id(
                            "transition-write-candidates", candidate_key
                        ),
                    ))
            else:
                surface_records.append(matched_record(**common))

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
    symmetric_rows = phase2_symmetric_rows
    declared_symmetric_blockers = human_discrepancies.get("independent_symmetric_blocking_records")
    if not isinstance(symmetric_rows, list) or not isinstance(declared_symmetric_blockers, list):
        raise ValueError("Missing Phase-2 symmetric reconciliation records")
    derived_symmetric_blockers = [row for row in symmetric_rows if row.get("blocking") is True]
    if declared_symmetric_blockers != derived_symmetric_blockers:
        raise ValueError("Phase-2 symmetric blocker set does not match its reconciliation rows")
    symmetric_records, symmetric_unresolved = propagate_symmetric_blockers(symmetric_rows)
    discrepancy_records.extend(symmetric_records)
    unresolved_sources.extend(symmetric_unresolved)

    category_evidence = locator(BASELINE, PROGRAM_PATH, 107, 153)
    reconciliation_status = "reconciliation-blocked" if unresolved_sources else "reconciliation-complete"
    output = {
        "schema_version": "apk-source-denominator-phase3-reconciliation.v1",
        "track_id": TRACK,
        "source_baseline_revision": BASELINE,
        "input_provenance": {
            "phase1": {
                "revision": phase1_revision,
                "output_hashes": phase1_hashes,
            },
            "phase2": {
                "implementation_revision": phase2_implementation_revision,
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
            for kind in (
                "scene",
                "state",
                "phase",
                "overlay",
                "transition",
                "transition-write-candidate",
                "terminal",
                "presentation",
            )
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
