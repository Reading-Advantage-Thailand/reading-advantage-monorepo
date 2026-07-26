#!/usr/bin/env python3
"""Generate revision-pinned Phase 3 source manifests without inspecting content."""

import hashlib
import json
import subprocess
from pathlib import Path


TRACK = Path(__file__).resolve().parent
REPO = TRACK.parents[2]


def digest_bytes(value: bytes) -> str:
    """Return the SHA-256 digest for exact source bytes."""
    return hashlib.sha256(value).hexdigest()


def digest_file(path: Path) -> str:
    """Return the SHA-256 digest for one local frozen input file."""
    return digest_bytes(path.read_bytes())


def load(path: Path) -> dict:
    """Load one JSON object artifact."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"JSON root is not an object: {path}")
    return value


def git_bytes(revision: str, path: str) -> bytes:
    """Read one exact Git blob without consulting the dirty worktree."""
    return subprocess.run(["git", "show", f"{revision}:{path}"], cwd=REPO, check=True, stdout=subprocess.PIPE).stdout


def media_class(record: dict) -> str:
    """Classify one frozen mechanical record without deriving semantic content."""
    flags = record["flags"]
    if flags["decode_status"] == "failed" or flags["readability_status"] == "unreadable":
        return "unreadable_or_pointer"
    if record["file_kind"] == "audio":
        return "audio"
    if record["format"] in {"json", "md"}:
        return "text_or_data"
    return "visual_or_video"


def main() -> None:
    """Write one complete deterministic source manifest for each frozen batch."""
    freeze_path = TRACK / "phase3-input-freeze-v1.json"
    phase2_freeze = load(TRACK / "phase2-input-freeze-v1.json")
    phase2_acceptance = load(TRACK / "phase2-root-acceptance.json")
    freeze_hash = digest_file(freeze_path)
    phase0_hash = digest_file(TRACK / "phase0-input-freeze-v1.json")
    phase1_hash = digest_file(TRACK / "phase1-root-acceptance.json")
    phase2_hash = digest_file(TRACK / "phase2-root-acceptance.json")
    contract_hash = digest_file(TRACK / "forensics-contract-tests.py")
    for number in range(1, 13):
        batch_id = f"AF-{number:02d}"
        batch_root = TRACK / "batches" / batch_id
        base_path = batch_root / "candidate-records-base.json"
        mechanical_path = batch_root / "mechanical-metadata.json"
        caller_path = batch_root / "caller-inventory.json"
        base = load(base_path)
        mechanical = load(mechanical_path)
        metadata = {record["canonical_path"]: record for record in mechanical["records"]}
        group_members: dict[str, list[dict]] = {}
        for record in base["records"]:
            group_members.setdefault(record["identical_hash_group"], []).append(record)
        groups = []
        for group, members in sorted(group_members.items()):
            members = sorted(members, key=lambda item: item["canonical_path"])
            source_members = []
            for member in members:
                raw = git_bytes(member["revision"], member["canonical_path"])
                if digest_bytes(raw) != member["sha256"]:
                    raise ValueError(f"Git blob digest differs: {member['canonical_path']}")
                source_members.append({
                    "canonical_path": member["canonical_path"],
                    "revision": member["revision"],
                    "source_blob_oid": member["source_blob_oid"],
                    "byte_size": len(raw),
                })
            representative = members[0]
            representative_bytes = git_bytes(representative["revision"], representative["canonical_path"])
            groups.append({
                "identical_hash_group": group,
                "sha256": representative["sha256"],
                "media_class": media_class(metadata[representative["canonical_path"]]),
                "member_sources": source_members,
                "inspection_source": {
                    "canonical_path": representative["canonical_path"],
                    "revision": representative["revision"],
                    "source_blob_oid": representative["source_blob_oid"],
                    "sha256": representative["sha256"],
                    "byte_size": len(representative_bytes),
                    "locator_kind": "git_blob",
                },
            })
        binding = {
            "phase3_input_freeze_sha256": freeze_hash,
            "phase0_input_freeze_sha256": phase0_hash,
            "phase1_root_acceptance_sha256": phase1_hash,
            "phase2_root_acceptance_sha256": phase2_hash,
            "phase2_contract_sha256": contract_hash,
            "phase1_batch_input_sha256": phase2_freeze["phase1_batch_inputs"][batch_id],
            "phase2_provenance_audit_sha256": phase2_acceptance["accepted_evidence_sha256"]["provenance_artifacts"][batch_id],
            "phase2_independent_review_sha256": phase2_acceptance["accepted_evidence_sha256"]["independent_reviews"][batch_id],
            "base_record_revision": "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286",
            "delta_revision": "65fc00d872ce5aa63820662ee0a1f14952e63235",
            "effective_candidate_paths": 428,
            "effective_identical_hash_groups": 227,
        }
        output = {
            "schema_version": "apk-asset-forensics.phase3-inspection-source-manifest.v1",
            "track_id": "apk_existing_asset_candidate_audit_20260712",
            "batch_id": batch_id,
            "input_binding": binding,
            "producer": {"role": "evidence-collector"},
            "groups": groups,
        }
        (batch_root / "inspection-source-manifest.json").write_text(json.dumps(output, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
