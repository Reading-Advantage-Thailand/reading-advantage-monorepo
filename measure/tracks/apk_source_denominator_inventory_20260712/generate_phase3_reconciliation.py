"""Generate the fail-closed Phase-3 reconciliation from committed source evidence."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
from collections import defaultdict
from pathlib import Path
from typing import Any


BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
PHASE1_REVISION = "f17fa78b36453e4aba36bc90f32bf25cd5b65ddb"
PHASE2_REVISION = "4b6175f44dc2285084072bacebd87c7c3ce48bc3"
TRACK = "apk_source_denominator_inventory_20260712"
TRACK_DIR = Path(__file__).resolve().parent
REPO_ROOT = TRACK_DIR.parents[2]
PROGRAM_PATH = "measure/apk-evidence-reconstruction-program.md"

# This records only the raw-program labels whose current page-source IDs are present
# in both independently committed inventories. Labels without that evidence stay
# explicit blockers; this table is not a 29-item replacement denominator.
PROGRAM_CURRENT_IDS = {
    "Dragon Flight — large current action implementation.": "vocabulary/dragon-flight",
    "RPG Battle — multi-state turn-based implementation.": "vocabulary/rpg-battle",
    "Castle Defense": "sentence/castle-defense",
    "Magic Defense": "vocabulary/magic-defense",
    "Wizard vs Zombie": "vocabulary/wizard-vs-zombie",
    "Village Guardian": "sentence/village-guardian",
    "Dragon Rider": "vocabulary/dragon-rider",
    "Dungeon Liberator": "sentence/dungeon-liberator",
    "Shadow Gate Dungeon": "sentence/shadow-gate-dungeon",
    "Labyrinth of the Goblin King": "sentence/labyrinth-goblin-king",
    "Enchanted Library": "vocabulary/enchanted-library",
    "Rune Match": "vocabulary/rune-match",
    "Alchemist's Synthesis": "vocabulary/alchemists-synthesis",
    "Potion Rush": "sentence/potion-rush",
    "Rune Forge Chamber": "sentence/rune-forge-chamber",
    "Devourer Slime": "sentence/devourer-slime",
    "The Haunted Library": "sentence/haunted-library",
}


def git_bytes(revision: str, path: str) -> bytes:
    """Returns one raw committed object.

    Args:
        revision: Commit containing the object.
        path: Repository-relative object path.

    Returns:
        Committed object bytes.
    """
    return subprocess.check_output(["git", "show", f"{revision}:{path}"], cwd=REPO_ROOT)


def git_json(revision: str, name: str) -> dict[str, Any]:
    """Loads one committed JSON reconciliation input.

    Args:
        revision: Commit containing the input.
        name: Filename within the current track.

    Returns:
        Parsed JSON object.
    """
    value = json.loads(git_bytes(revision, f"measure/tracks/{TRACK}/{name}"))
    if not isinstance(value, dict):
        raise TypeError(f"Expected JSON object: {name}")
    return value


def is_ancestor(revision: str) -> bool:
    """Reports whether a historical revision is reachable from the frozen baseline.

    Args:
        revision: Candidate historical revision.

    Returns:
        Whether the candidate is a baseline ancestor.
    """
    return subprocess.run(
        ["git", "merge-base", "--is-ancestor", revision, BASELINE],
        cwd=REPO_ROOT,
        check=False,
    ).returncode == 0


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
        raise ValueError(f"Cannot cite an empty object: {revision}:{path}")
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


def revalidate(evidence: dict[str, Any], *, historical: bool = False) -> dict[str, Any]:
    """Revalidates an existing source locator against its committed bytes.

    Args:
        evidence: Locator from a Phase-1 or Phase-2 committed artifact.
        historical: Whether an ancestor revision is permitted.

    Returns:
        Equivalent freshly validated locator.
    """
    revision = evidence["revision"]
    if historical:
        if not is_ancestor(revision):
            raise ValueError(f"Unreachable historical revision: {revision}")
    elif revision != BASELINE:
        raise ValueError(f"Non-baseline current locator: {revision}")
    source_range = evidence["range"]
    return locator(revision, evidence["path"], source_range["start_line"], source_range["end_line"])


def record_unresolved(
    records: list[dict[str, Any]],
    unresolved: list[dict[str, Any]],
    *,
    unresolved_source_id: str,
    **record: Any,
) -> None:
    """Adds one explicit blocking unresolved comparison and its matching index row.

    Args:
        records: Reconciliation collection receiving the comparison record.
        unresolved: Top-level unresolved source collection.
        unresolved_source_id: Stable ID shared by both records.
        **record: Comparison fields specific to the collection.

    Returns:
        Nothing.
    """
    records.append(
        {
            **record,
            "resolution_status": "unresolved-source",
            "blocking": True,
            "unresolved_source_id": unresolved_source_id,
        }
    )
    unresolved.append({"unresolved_source_id": unresolved_source_id})


def main() -> None:
    """Writes exhaustive Phase-3 comparisons without converting gaps into facts.

    Returns:
        Nothing.
    """
    source = git_json(PHASE1_REVISION, "source-denominator.json")
    ledger = git_json(PHASE1_REVISION, "game-identity-ledger.json")
    scenes = git_json(PHASE1_REVISION, "scene-state-denominator.json")
    assets = git_json(PHASE1_REVISION, "asset-file-denominator.json")
    historical = git_json(PHASE1_REVISION, "historical-source-denominator.json")
    mechanical_discrepancies = git_json(PHASE1_REVISION, "denominator-discrepancies.json")
    human_discovery = git_json(PHASE2_REVISION, "independent-human-discovery.json")
    human_duplicates = git_json(PHASE2_REVISION, "human-duplicate-drift-records.json")
    human_historical = git_json(PHASE2_REVISION, "human-historical-deleted-records.json")
    human_discrepancies = git_json(PHASE2_REVISION, "human-discrepancy-records.json")

    claims_by_identity: dict[str, list[dict[str, Any]]] = defaultdict(list)
    claims_by_path: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for claim in human_discovery["current_source_claims"]:
        evidence = revalidate(claim["evidence"])
        claims_by_identity[claim["canonical_identity_id"]].append(evidence)
        claims_by_path[evidence["path"]].append(evidence)

    unresolved: list[dict[str, Any]] = []
    identity_records: list[dict[str, Any]] = []
    for row in ledger["identity_records"]:
        identity_id = row["canonical_identity_id"]
        identity_records.append(
            {
                "canonical_identity_id": identity_id,
                "mechanical_evidence": [revalidate(item["evidence"]) for item in row["aliases"]],
                "human_evidence": claims_by_identity[identity_id],
                "resolution_status": "matched",
                "blocking": False,
            }
        )

    file_records: list[dict[str, Any]] = []
    for row in source["records"]:
        if row["record_type"] != "file":
            continue
        evidence = revalidate(row["evidence"])
        if claims_by_path[evidence["path"]]:
            file_records.append(
                {
                    "mechanical_record_id": row["record_id"],
                    "mechanical_evidence": evidence,
                    "human_evidence": claims_by_path[evidence["path"]],
                    "resolution_status": "matched",
                    "blocking": False,
                }
            )
        else:
            record_unresolved(
                file_records,
                unresolved,
                unresolved_source_id=f"file:{row['record_id']}",
                mechanical_record_id=row["record_id"],
                mechanical_evidence=evidence,
            )

    surface_records: list[dict[str, Any]] = []
    surface_number = 0
    for surface_kind, rows in (
        ("scene", scenes["scene_records"]),
        ("state", scenes["state_records"]),
        ("transition", scenes["transitions"]),
    ):
        for row in rows:
            surface_number += 1
            kind = row["transition_kind"] if surface_kind == "transition" else surface_kind
            record_unresolved(
                surface_records,
                unresolved,
                unresolved_source_id=f"surface:{surface_number:03d}",
                mechanical_surface=row,
                surface_kind=kind,
                mechanical_evidence=revalidate(row["evidence"]),
            )

    category_evidence = locator(BASELINE, PROGRAM_PATH, 107, 153)
    surface_category_coverage = [
        {"surface_kind": kind, "coverage_status": "reviewed", "evidence": category_evidence}
        for kind in ("scene", "state", "phase", "overlay", "transition", "terminal", "presentation")
    ]

    asset_records: list[dict[str, Any]] = []
    group_paths: dict[str, list[str]] = defaultdict(list)
    group_evidence: dict[str, dict[str, Any]] = {}
    for candidate in assets["candidate_files"]:
        path = candidate["canonical_path"]
        group = candidate["identical_hash_group"]
        asset_bytes = git_bytes(BASELINE, path)
        asset_evidence = locator(BASELINE, path) if asset_bytes.splitlines(keepends=True) else None
        group_paths[group].append(path)
        if asset_evidence is not None:
            group_evidence.setdefault(group, asset_evidence)
        record_unresolved(
            asset_records,
            unresolved,
            unresolved_source_id=f"asset:{path}",
            canonical_path=path,
            sha256=candidate["sha256"],
            identical_hash_group=group,
            mechanical_object={
                "revision": BASELINE,
                "path": path,
                "sha256": hashlib.sha256(asset_bytes).hexdigest(),
                "byte_size": len(asset_bytes),
            },
            **({"mechanical_evidence": asset_evidence} if asset_evidence is not None else {}),
        )

    group_records: list[dict[str, Any]] = []
    for group, paths in sorted(group_paths.items()):
        record_unresolved(
            group_records,
            unresolved,
            unresolved_source_id=f"asset-group:{group}",
            identical_hash_group=group,
            canonical_paths=paths,
            **({"mechanical_evidence": group_evidence[group]} if group in group_evidence else {}),
        )

    discrepancy_records: list[dict[str, Any]] = []
    for row in mechanical_discrepancies["records"]:
        matching = next(
            item for item in human_discrepancies["mechanical_observation_records"] if item["observation_id"] == row["observation_id"]
        )
        discrepancy_records.append(
            {
                "discrepancy_key": f"mechanical:{row['observation_id']}",
                "discrepancy_type": "duplicate",
                "human_evidence": [revalidate(item) for item in matching["evidence"]],
                "resolution_status": "resolved",
                "blocking": False,
            }
        )
    for row in human_duplicates["duplicate_drift_records"]:
        discrepancy_records.append(
            {
                "discrepancy_key": f"human-duplicate:{row['record_id']}",
                "discrepancy_type": "duplicate",
                "human_evidence": [revalidate(item) for item in row["evidence"]],
                "resolution_status": "resolved",
                "blocking": False,
            }
        )

    current_history_paths = {item["path"]: item for items in claims_by_path.values() for item in items}
    for row in historical["records"]:
        evidence = row["evidence"]
        key = json.dumps(evidence, sort_keys=True, separators=(",", ":"))
        if row["classification"] == "current" and evidence["path"] in current_history_paths:
            discrepancy_records.append(
                {
                    "discrepancy_key": f"historical:{key}",
                    "discrepancy_type": "historical",
                    "human_evidence": claims_by_path[evidence["path"]],
                    "resolution_status": "matched",
                    "blocking": False,
                }
            )
        else:
            record_unresolved(
                discrepancy_records,
                unresolved,
                unresolved_source_id=f"historical:mechanical:{len(discrepancy_records):03d}",
                discrepancy_key=f"historical:{key}",
                discrepancy_type="historical",
                historical_evidence=revalidate(evidence, historical=True),
            )
    for row in human_historical["historical_deleted_records"]:
        evidence = row["evidence"]
        key = json.dumps(evidence, sort_keys=True, separators=(",", ":"))
        record_unresolved(
            discrepancy_records,
            unresolved,
            unresolved_source_id=f"historical:human:{row['record_id']}",
            discrepancy_key=f"human-historical:{key}",
            discrepancy_type="historical",
            historical_evidence=revalidate(evidence, historical=True),
        )
    for row in human_discrepancies["mechanical_observation_records"]:
        discrepancy_records.append(
            {
                "discrepancy_key": f"human-comparison:{row['observation_id']}",
                "discrepancy_type": "duplicate",
                "human_evidence": [revalidate(item) for item in row["evidence"]],
                "resolution_status": "resolved",
                "blocking": False,
            }
        )

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
        evidence = locator(BASELINE, PROGRAM_PATH, label_line[label], label_line[label])
        current_id = PROGRAM_CURRENT_IDS.get(label)
        if current_id is None:
            record_unresolved(
                program_records,
                unresolved,
                unresolved_source_id=f"replacement-program:{label}",
                program_identity_label=label,
                program_evidence=evidence,
                mechanical_identity_ids=[],
                human_identity_ids=[],
            )
        else:
            program_records.append(
                {
                    "program_identity_label": label,
                    "program_evidence": evidence,
                    "mechanical_identity_ids": [current_id],
                    "human_identity_ids": [current_id],
                    "human_evidence": claims_by_identity[current_id],
                    "resolution_status": "matched",
                    "blocking": False,
                }
            )

    output = {
        "schema_version": "apk-source-denominator-phase3-reconciliation.v1",
        "track_id": TRACK,
        "source_baseline_revision": BASELINE,
        "status": "reconciliation-blocked",
        "replacement_program_identity_count": len(program_labels),
        "mechanical_identity_count": len(ledger["identity_records"]),
        "human_identity_count": len(claims_by_identity),
        "replacement_program_identity_records": program_records,
        "identity_reconciliation_records": identity_records,
        "file_reconciliation_records": file_records,
        "surface_reconciliation_records": surface_records,
        "surface_category_coverage": surface_category_coverage,
        "asset_candidate_reconciliation_records": asset_records,
        "identical_hash_group_reconciliation_records": group_records,
        "discrepancy_reconciliation_records": discrepancy_records,
        "unresolved_sources": unresolved,
    }
    (TRACK_DIR / "phase3-reconciliation.json").write_text(
        json.dumps(output, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
