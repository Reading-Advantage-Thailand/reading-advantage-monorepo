#!/usr/bin/env python3
"""Generate deterministic Phase 1 base records from frozen manifest metadata only."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path
from typing import Any


TRACK = Path(__file__).resolve().parent
REPO = TRACK.parents[2]
TRACK_ID = "apk_existing_asset_candidate_audit_20260712"
BASE_PUBLICATION_REVISION = "ba95e6fb1db6acdaecd0808ca1f22dec339d6c5d"
BASE_RECORD_REVISION = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
DELTA_REVISION = "65fc00d872ce5aa63820662ee0a1f14952e63235"
BASE_GIT_LOCATOR = f"{BASE_PUBLICATION_REVISION}:measure/tracks/apk_source_denominator_inventory_20260712/asset-file-denominator.json"
EXPECTED_HASHES = {
    "phase0_input_freeze": "d4bd3606c7c75f495f2d8486ea4220f48aefd9eb216689b765aa9d96f58f2a9b",
    "t2_asset_denominator": "41c9ede1a8e5ddab21b74a99959fbddc35b5f5a6902740a740a48f174bf7f438",
    "candidate_delta": "c354a57e162876d035f7df284149f683596d11145fe8e9d6c827beda4ccc15df",
    "accepted_delta": "71592625cbe09671937b7406afa38f3f59232c0345de455467121dc038863db2",
    "phase0_discovery_report": "b71333db3768e8646bb9673755e7092480e943fed4e8542857162f9ed824bb40",
}
INPUT_PATHS = {
    "phase0_input_freeze": TRACK / "phase0-input-freeze-v1.json",
    "t2_asset_denominator": REPO / "measure/archive/apk_source_denominator_inventory_20260712/asset-file-denominator.json",
    "candidate_delta": TRACK / "candidate-denominator-delta-v1.json",
    "accepted_delta": TRACK / "accepted-denominator-delta-v1.json",
    "phase0_discovery_report": TRACK / "phase0-denominator-discovery-report-v2.json",
}
ROOTS = [
    "apps/advantage-games/public",
    "apps/reading-advantage/public/games",
    "apps/primary-advantage/public/games",
    "apps/advantage-games/measure",
    "packages/codecamp-knowledge/fixtures/apk-guided",
]
EXPECTED_ROOT_COUNTS = {
    "apps/advantage-games/public": 250,
    "apps/reading-advantage/public/games": 105,
    "apps/primary-advantage/public/games": 0,
    "apps/advantage-games/measure": 72,
    "packages/codecamp-knowledge/fixtures/apk-guided": 1,
}


def canonical_json(value: Any) -> bytes:
    """Encode JSON deterministically for reproducible output hashes."""
    return (json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False) + "\n").encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    """Return the SHA-256 digest for already supplied bytes."""
    return hashlib.sha256(value).hexdigest()


def read_json_checked(name: str) -> tuple[dict[str, Any], int]:
    """Read one authorized JSON artifact and enforce its frozen SHA-256 value."""
    raw = INPUT_PATHS[name].read_bytes()
    if sha256_bytes(raw) != EXPECTED_HASHES[name]:
        raise RuntimeError(f"frozen input hash mismatch: {name}")
    value = json.loads(raw)
    if not isinstance(value, dict):
        raise RuntimeError(f"authorized input root is not an object: {name}")
    return value, len(raw)


def git_tree(revision: str) -> tuple[dict[str, str], int]:
    """Return committed path-to-blob bindings without reading candidate blob bytes."""
    result = subprocess.run(
        ["git", "ls-tree", "-r", "-z", revision],
        cwd=REPO,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode:
        raise RuntimeError(f"git tree query failed for {revision}: {result.stderr.decode().strip()}")
    entries: dict[str, str] = {}
    for entry in result.stdout.split(b"\0"):
        if not entry:
            continue
        metadata, raw_path = entry.split(b"\t", 1)
        _mode, object_type, object_id = metadata.decode().split()
        if object_type == "blob":
            entries[raw_path.decode()] = object_id
    return entries, len(result.stdout)


def input_binding() -> dict[str, Any]:
    """Return the exact contract binding embedded in every base artifact."""
    return {
        "phase0_input_freeze_sha256": EXPECTED_HASHES["phase0_input_freeze"],
        "base_denominator_sha256": EXPECTED_HASHES["t2_asset_denominator"],
        "base_manifest_publication_revision": BASE_PUBLICATION_REVISION,
        "base_record_revision": BASE_RECORD_REVISION,
        "accepted_delta_sha256": EXPECTED_HASHES["accepted_delta"],
        "delta_revision": DELTA_REVISION,
        "effective_candidate_paths": 428,
        "effective_identical_hash_groups": 227,
    }


def allowed_input_paths() -> list[str]:
    """Return the complete truthful list of manifest inputs and historical locator."""
    return [
        str(INPUT_PATHS["phase0_input_freeze"].relative_to(REPO)),
        BASE_GIT_LOCATOR,
        str(INPUT_PATHS["accepted_delta"].relative_to(REPO)),
        str(INPUT_PATHS["candidate_delta"].relative_to(REPO)),
        str(INPUT_PATHS["phase0_discovery_report"].relative_to(REPO)),
    ]


def root_for_path(candidate_path: str) -> str:
    """Return the frozen root that owns a candidate path."""
    for root in ROOTS:
        if candidate_path == root or candidate_path.startswith(root + "/"):
            return root
    raise RuntimeError(f"candidate path is outside frozen roots: {candidate_path}")


def projected_record(source: dict[str, Any], blob_oid: str) -> dict[str, Any]:
    """Project a frozen candidate to the exact base-record contract schema."""
    fields = ("canonical_path", "sha256", "identical_hash_group", "revision", "file_kind", "relevance_rule_id")
    if any(field not in source for field in fields):
        raise RuntimeError(f"candidate lacks a required base field: {source.get('canonical_path', '<unknown>')}")
    record = {field: source[field] for field in fields}
    record["source_blob_oid"] = blob_oid
    record = {
        "canonical_path": record["canonical_path"],
        "sha256": record["sha256"],
        "identical_hash_group": record["identical_hash_group"],
        "revision": record["revision"],
        "source_blob_oid": record["source_blob_oid"],
        "file_kind": record["file_kind"],
        "relevance_rule_id": record["relevance_rule_id"],
    }
    if record["identical_hash_group"] != f"sha256:{record['sha256']}":
        raise RuntimeError(f"candidate hash group mismatch: {record['canonical_path']}")
    return record


def split_batches(groups: list[tuple[str, list[dict[str, Any]]]], frozen_batches: list[dict[str, Any]]) -> list[list[tuple[str, list[dict[str, Any]]]]]:
    """Partition sorted hash groups with the accepted ceiling-feasible frozen boundaries."""
    result: list[list[tuple[str, list[dict[str, Any]]]]] = []
    consumed = 0
    for frozen in frozen_batches:
        candidates = [group for group in groups if frozen["first_group"] <= group[0] <= frozen["last_group"]]
        if not candidates or candidates[0][0] != frozen["first_group"] or candidates[-1][0] != frozen["last_group"]:
            raise RuntimeError(f"frozen batch boundary drift: {frozen['batch_id']}")
        path_count = sum(len(records) for _, records in candidates)
        if (len(candidates), path_count) != (frozen["group_count"], frozen["path_count"]):
            raise RuntimeError(f"frozen batch count drift: {frozen['batch_id']}")
        result.append(candidates)
        consumed += len(candidates)
    if consumed != len(groups):
        raise RuntimeError("frozen batch partition omits or duplicates a hash group")
    return result


def write_json(path: Path, value: Any) -> tuple[str, int]:
    """Write canonical JSON and return its digest and byte size without rereading it."""
    raw = canonical_json(value)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw)
    return sha256_bytes(raw), len(raw)


def main() -> None:
    """Generate all base artifacts, reconciliation evidence, and aggregate receipt."""
    freeze, freeze_bytes = read_json_checked("phase0_input_freeze")
    base, base_bytes = read_json_checked("t2_asset_denominator")
    candidate, candidate_bytes = read_json_checked("candidate_delta")
    accepted, accepted_bytes = read_json_checked("accepted_delta")
    discovery, discovery_bytes = read_json_checked("phase0_discovery_report")
    if accepted.get("status") != "accepted" or accepted.get("consumable") is not True:
        raise RuntimeError("accepted delta is not consumable")
    if accepted.get("candidate", {}).get("sha256") != EXPECTED_HASHES["candidate_delta"]:
        raise RuntimeError("accepted delta does not bind candidate delta")
    if candidate.get("base", {}).get("sha256") != EXPECTED_HASHES["t2_asset_denominator"]:
        raise RuntimeError("candidate delta does not bind T2 base")
    if discovery.get("status") != "pass" or not discovery.get("batch_reproduction", {}).get("membership_exactly_matches_freeze"):
        raise RuntimeError("discovery report does not authorize frozen membership")

    base_tree, base_tree_bytes = git_tree(BASE_RECORD_REVISION)
    delta_tree, delta_tree_bytes = git_tree(DELTA_REVISION)
    records_by_path: dict[str, dict[str, Any]] = {}
    for source in base["candidate_files"]:
        candidate_path = source["canonical_path"]
        if candidate_path in records_by_path or candidate_path not in base_tree:
            raise RuntimeError(f"invalid T2 base source binding: {candidate_path}")
        records_by_path[candidate_path] = projected_record(source, base_tree[candidate_path])
    changes = candidate["changes"]
    if len(changes["additions"]) != 2 or len(changes["replacements"]) != 1 or changes["deletions"]:
        raise RuntimeError("accepted delta shape differs")
    replacement = changes["replacements"][0]
    old = records_by_path.get(replacement["canonical_path"])
    if old is None or old["sha256"] != replacement["prior_sha256"] or replacement["canonical_path"] not in delta_tree:
        raise RuntimeError("accepted replacement binding differs")
    records_by_path[replacement["canonical_path"]] = projected_record(replacement, delta_tree[replacement["canonical_path"]])
    for addition in changes["additions"]:
        candidate_path = addition["canonical_path"]
        if candidate_path in records_by_path or candidate_path not in delta_tree:
            raise RuntimeError(f"accepted addition binding differs: {candidate_path}")
        records_by_path[candidate_path] = projected_record(addition, delta_tree[candidate_path])
    if len(records_by_path) != 428:
        raise RuntimeError("effective path count differs")

    groups_by_hash: dict[str, list[dict[str, Any]]] = {}
    for record in records_by_path.values():
        root_for_path(record["canonical_path"])
        groups_by_hash.setdefault(record["identical_hash_group"], []).append(record)
    groups = [(group, sorted(members, key=lambda item: item["canonical_path"])) for group, members in sorted(groups_by_hash.items())]
    if len(groups) != 227:
        raise RuntimeError("effective hash group count differs")
    batches = split_batches(groups, freeze["batch_strategy"]["batches"])

    output_hashes: dict[str, str] = {}
    summaries: list[dict[str, Any]] = []
    emitted_paths: list[str] = []
    emitted_groups: list[str] = []
    for frozen, batch in zip(freeze["batch_strategy"]["batches"], batches):
        batch_id = frozen["batch_id"]
        records = [record for _, group_records in batch for record in group_records]
        artifact = {
            "schema_version": "apk-asset-forensics.phase1-candidate-record-base.v1",
            "track_id": TRACK_ID,
            "batch_id": batch_id,
            "input_binding": input_binding(),
            "producer": {"role": "evidence-collector", "receipt_path": "role-receipts/phase1/evidence-collector.json"},
            "records": records,
            "resource_usage": {
                "candidate_paths": len(records),
                "hash_groups": len(batch),
                "command_invocations": 0,
                "bytes_read": 0,
                "within_ceiling": True,
            },
        }
        output_path = TRACK / "batches" / batch_id / "candidate-records-base.json"
        digest, _byte_size = write_json(output_path, artifact)
        output_hashes[str(output_path.relative_to(REPO))] = digest
        summaries.append(dict(frozen))
        emitted_paths.extend(record["canonical_path"] for record in records)
        emitted_groups.extend(group for group, _ in batch)

    roots = {root: sum(root_for_path(path) == root for path in emitted_paths) for root in ROOTS}
    if roots != EXPECTED_ROOT_COUNTS or len(emitted_paths) != 428 or len(set(emitted_paths)) != 428 or len(emitted_groups) != 227 or len(set(emitted_groups)) != 227:
        raise RuntimeError("effective denominator reconciliation differs")
    if replacement["prior_sha256"] in {record["sha256"] for record in records_by_path.values()}:
        raise RuntimeError("replaced prior hash remains")
    if records_by_path[replacement["canonical_path"]]["sha256"] != replacement["sha256"]:
        raise RuntimeError("replacement current hash is absent")
    if any(item["canonical_path"] not in records_by_path for item in changes["additions"]):
        raise RuntimeError("accepted addition is absent")

    reconciliation = {
        "schema_version": "apk-asset-forensics.phase1-base-reconciliation.v1",
        "track_id": TRACK_ID,
        "status": "pass",
        "input_bindings": [
            {"name": name, "path": BASE_GIT_LOCATOR if name == "t2_asset_denominator" else str(input_path.relative_to(REPO)), "sha256": EXPECTED_HASHES[name]}
            for name, input_path in INPUT_PATHS.items()
        ],
        "authority": {"authorization_commit": "79ab26dc", "phase1_opened_commit": "872d0de9"},
        "effective_denominator": {"unique_paths": 428, "identical_hash_groups": 227},
        "root_path_counts": roots,
        "batch_partition": {"batches": summaries, "path_sum": 428, "group_sum": 227, "omissions": 0, "duplicates": 0},
        "boundary_interpretation": {"path": str(INPUT_PATHS["phase0_discovery_report"].relative_to(REPO)), "sha256": EXPECTED_HASHES["phase0_discovery_report"], "rule": discovery["batch_reproduction"]["boundary_interpretation"]},
        "delta_reconciliation": {
            "replacement": {"canonical_path": replacement["canonical_path"], "prior_sha256": replacement["prior_sha256"], "prior_hash_absent": True, "current_sha256": replacement["sha256"], "current_hash_present": True},
            "accepted_additions": [{"canonical_path": item["canonical_path"], "sha256": item["sha256"], "present": True} for item in changes["additions"]],
        },
        "generator": {"path": str(Path(__file__).relative_to(REPO)), "sha256": sha256_bytes(Path(__file__).read_bytes())},
        "output_batch_hashes": output_hashes,
    }
    reconciliation_path = TRACK / "phase1-base-reconciliation-v1.json"
    reconciliation_digest, _reconciliation_size = write_json(reconciliation_path, reconciliation)

    receipt = {
        "schema_version": "apk-role-receipt.v1",
        "track_id": TRACK_ID,
        "batch_id": "phase1",
        "role": "evidence-collector",
        "native_task_name": "/root/t8_phase1_base_records",
        "declared_model": "gpt-5.6-terra",
        "fork_turns": "none",
        "inherited_narrative": False,
        "allowed_input_manifest_sha256": EXPECTED_HASHES["phase0_input_freeze"],
        "allowed_input_paths": allowed_input_paths(),
        "role_boundary": "Path-specific base records and denominator reconciliation only; no candidate asset-byte/content inspection, caller analysis, provenance or license conclusion, suitability, disposition, review, or mechanical metadata output.",
        "output_file_hashes": output_hashes,
        "findings": {"critical": [], "high": [], "medium": [], "low": []},
        "resource_usage": {
            "batch_count": 12,
            "candidate_paths": 428,
            "hash_groups": 227,
            "command_invocations": 2,
            "bytes_read": freeze_bytes + base_bytes + candidate_bytes + accepted_bytes + discovery_bytes + base_tree_bytes + delta_tree_bytes,
            "within_ceiling": True,
        },
        "final_status": "pass",
    }
    write_json(TRACK / "role-receipts" / "phase1" / "evidence-collector.json", receipt)
    if not reconciliation_digest:
        raise RuntimeError("reconciliation output hash was empty")


if __name__ == "__main__":
    main()
